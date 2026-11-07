/* Кошелёк · Телефон — слой платформы.
   Заменяет window.claude.use(...) из артефакта Claude:
   db (Firestore-подобный интерфейс на IndexedDB) + фоновая синхронизация в скрытую папку Google Диска (drive.appdata),
   sample (Gemini по личному ключу пользователя), user, downloads, permissions.
   Данные всегда сначала пишутся в IndexedDB; сбой Диска или ИИ работу не блокирует. */
(() => {
"use strict";
const CFG = Object.assign({ googleClientId: "", model: "gemini-3.5-flash-lite", fallbackModel: "gemini-3.1-flash-lite", syncDelayMs: 20000, version: "1" }, window.KOSHELEK_CONFIG || {});
let _lg, _ls, _ld; try { _lg = Storage.prototype.getItem; _ls = Storage.prototype.setItem; _ld = Storage.prototype.removeItem; } catch (e) { }
const ls = { get(k) { try { return _lg.call(localStorage, k); } catch (e) { return null; } }, set(k, v) { try { _ls.call(localStorage, k, v); } catch (e) { } }, del(k) { try { _ld.call(localStorage, k); } catch (e) { } } };
/* пользователи: у каждого свои IndexedDB, ключ ИИ, слоты на Диске и localStorage аппа; p1 — прежние данные без суффиксов */
const PROF = (() => { let list = null; try { list = JSON.parse(ls.get("kw_profiles") || "null"); } catch (e) { } if (!Array.isArray(list) || !list.length) list = [{ id: "p1", name: "Основной" }]; let act = ls.get("kw_active"); if (!list.some(p => p.id === act)) act = list[0].id; return { list, act }; })();
const pid = PROF.act, sfx = pid === "p1" ? "" : "-" + pid;
const lk = k => pid === "p1" ? k : k + ":" + pid;
const saveProf = () => { ls.set("kw_profiles", JSON.stringify(PROF.list)); ls.set("kw_active", PROF.act); };
const curProf = () => PROF.list.find(p => p.id === pid) || PROF.list[0];
if (pid !== "p1") { try { const pre = "u:" + pid + ":"; Storage.prototype.getItem = function (k) { return this === localStorage ? _lg.call(this, pre + k) : _lg.call(this, k); }; Storage.prototype.setItem = function (k, v) { return this === localStorage ? _ls.call(this, pre + k, v) : _ls.call(this, k, v); }; Storage.prototype.removeItem = function (k) { return this === localStorage ? _ld.call(this, pre + k) : _ld.call(this, k); }; } catch (e) { } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
const el = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v === true) e.setAttribute(k, ""); else if (v !== false && v != null) e.setAttribute(k, v); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; };
try { const d = +localStorage.getItem("kw_delay"); if (d > 0) CFG.syncDelayMs = d; } catch (e) { }
const TAB = Math.random().toString(36).slice(2, 10);
const BUILD = "П13.5 · 07.11.2026";
let editSeq = 0;   // П13.5: счётчик правок — отправка не сбрасывает «несохранённое», если данные менялись во время неё
const hsh = v => { const s = JSON.stringify(v) || ""; let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };   // П13.5: отпечаток документа
let persisted = null;   // П13 (A0.2): закреплено ли хранилище браузером
const _pre = [];
/* события платформы — в журнал аппа (logEv); пока апп не загрузился — копятся */
const plog = (k, d) => { try { if (typeof window.logEv === "function") { while (_pre.length) window.logEv(..._pre.shift()); window.logEv(k, d); } else _pre.push([k, d]); } catch (e) { } };

/* ============ хранилище: IndexedDB + память ============ */
const DBN = "koshelek-w" + sfx;
const idb = { db: null };
const mem = new Map();                       // путь документа → данные
const kv = {};                               // служебное: устройство, ревизии, согласия (store "kv")
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DBN, 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("docs"); d.createObjectStore("kv"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbTx(stores, mode, fn) {
  return new Promise((res, rej) => {
    const tx = idb.db.transaction(stores, mode); let out;
    tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error("abort"));
    out = fn(tx);
  });
}
function idbLoadAll() {
  return new Promise((res, rej) => {
    const tx = idb.db.transaction(["docs", "kv"], "readonly"); const st = tx.objectStore("docs");
    st.openCursor().onsuccess = ev => { const c = ev.target.result; if (c) { mem.set(c.key, c.value); c.continue(); } };
    tx.objectStore("kv").openCursor().onsuccess = ev => { const c = ev.target.result; if (c) { kv[c.key] = c.value; c.continue(); } };
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
/* П13 (A0.1): журнал аппа (meta/log) живёт только на устройстве: не помечает данные изменёнными, не входит в копию на Диске и не сливается. Раньше смена статуса синхронизации → журнал → «правка» → отправка → новый статус шла по кругу каждые 20 с. */
const isLog = p => /(^|\/)meta\/log$/.test(p);
const docCount = () => { let n = 0; for (const k of mem.keys()) if (!isLog(k)) n++; return n; };
const kvSet = (k, v) => { kv[k] = v; return idbTx(["kv"], "readwrite", tx => tx.objectStore("kv").put(v, k)).catch(() => { }); };

/* ============ Firestore-подобный интерфейс ============ */
const SEG = /^[A-Za-z0-9_\-.~:@+]+$/;
const check = (p, even) => { const s = String(p).split("/"); if (s.some(x => !SEG.test(x) || x === "." || x === "..")) throw new TypeError("bad path " + p); if ((s.length % 2 === 0) !== even) throw new TypeError("path parity " + p); return s; };
const listeners = new Map();                 // путь → Set(callback)
const bc = typeof BroadcastChannel === "function" ? new BroadcastChannel("koshelek-w" + sfx) : null;
const snap = (id, data) => ({ id, exists: data !== undefined, data: () => clone(data), metadata: { fromCache: true, hasPendingWrites: false } });
function fire(p) { const set = listeners.get(p); if (!set) return; const s = snap(p.split("/").pop(), mem.get(p)); for (const cb of [...set]) { try { cb(s); } catch (e) { console.error(e); } } }
async function writeDoc(p, data, quiet) {
  if (data === undefined) {
    mem.delete(p); await idbTx(["docs"], "readwrite", tx => tx.objectStore("docs").delete(p));
  } else {
    const v = clone(data); mem.set(p, v); await idbTx(["docs"], "readwrite", tx => tx.objectStore("docs").put(v, p));
  }
  if (!quiet) { bc?.postMessage({ t: "w", p, d: data === undefined ? null : clone(data), from: TAB }); if (!isLog(p)) Sync.touch(); }
}
if (bc) bc.onmessage = ev => { const m = ev.data; if (!m || m.from === TAB) return; if (m.t === "w") { if (m.d === null) mem.delete(m.p); else mem.set(m.p, m.d); fire(m.p); if (!isLog(m.p)) Sync.touch(true); } else if (m.t === "reload") location.reload(); };
const docRef = p => { check(p, true); return {
  id: p.split("/").pop(), path: p,
  async get() { return snap(this.id, mem.get(p)); },
  async set(d) { if (!d || typeof d !== "object" || Array.isArray(d)) throw { code: "invalid_argument", message: "body" }; try { await writeDoc(p, d); } catch (e) { throw { code: e?.name === "QuotaExceededError" ? "quota_exceeded" : "unavailable", message: String(e?.message || e) }; } fire(p); },
  async update(d) { const cur = mem.get(p); if (!cur) throw { code: "invalid_argument", message: "missing" }; await writeDoc(p, Object.assign(clone(cur), d)); fire(p); },
  async delete() { await writeDoc(p, undefined); fire(p); },
  onSnapshot(cb) { let s = listeners.get(p); if (!s) listeners.set(p, s = new Set()); s.add(cb); return () => s.delete(cb); },
  collection(n) { return colRef(p + "/" + n); },
}; };
const colRef = p => { check(p, false); return {
  path: p,
  doc(id) { return docRef(p + "/" + (id || Math.random().toString(36).slice(2))); },
  async add(d) { const r = this.doc(); await r.set(d); return r; },
  async get() { const docs = [...mem.keys()].filter(k => k.startsWith(p + "/") && k.slice(p.length + 1).indexOf("/") < 0).sort().map(k => snap(k.split("/").pop(), mem.get(k))); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} }; },
  where() { return this; }, orderBy() { return this; }, limit() { return this; },
}; };
const db = Object.freeze({ doc: docRef, collection: colRef });

/* ============ Google: вход и Диск (drive.appdata) ============ */
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const Auth = {
  token: null, exp: 0, client: null, lastSilent: 0, gisP: null,
  cid() { return CFG.googleClientId || ls.get("cid") || ""; },
  gis() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (!this.gisP) this.gisP = new Promise((res, rej) => { const s = el("script", { src: "https://accounts.google.com/gsi/client", async: true }); s.onload = () => res(); s.onerror = () => { this.gisP = null; rej(new Error("gis_load")); }; document.head.append(s); });
    return this.gisP;
  },
  valid() { return this.token && Date.now() < this.exp - 60000; },
  /* prompt: "consent" — первый вход; "" — тихое обновление (на секунду открывает окно, которое закрывается само) */
  async get(prompt) {
    if (prompt === "" && this.valid()) return this.token;
    if (!this.cid()) throw { code: "no_client", message: "Не задан Client ID Google" };
    await this.gis();
    return new Promise((resolve, reject) => {
      const done = (f, v) => { clearTimeout(t); f(v); };
      const t = setTimeout(() => reject({ code: "timeout", message: "Окно входа не ответило" }), prompt === "" ? 25000 : 180000);
      try {
        const c = google.accounts.oauth2.initTokenClient({
          client_id: this.cid(), scope: SCOPE, prompt, hint: curProf().email || undefined,
          callback: r => { if (r.error) return done(reject, { code: r.error, message: r.error_description || r.error }); this.token = r.access_token; this.exp = Date.now() + (+r.expires_in || 3600) * 1000; this.lastSilent = Date.now(); done(resolve, this.token); },
          error_callback: e => done(reject, { code: e?.type || "popup", message: e?.message || "Окно входа не открылось" }),
        });
        c.requestAccessToken({ prompt });
      } catch (e) { done(reject, { code: "gis", message: String(e?.message || e) }); }
    });
  },
};
const drive = {
  async api(path, opt, retry = true) {
    const tk = await Auth.get("");
    const r = await fetch("https://www.googleapis.com" + path, Object.assign({}, opt, { headers: Object.assign({ Authorization: "Bearer " + tk }, opt && opt.headers) }));
    if (r.status === 401 && retry) { Auth.token = null; return this.api(path, opt, false); }
    if (!r.ok) { let m = ""; try { m = (await r.json())?.error?.message || ""; } catch (e) { } throw { code: "drive_" + r.status, message: m || ("Диск: HTTP " + r.status), status: r.status }; }
    return r;
  },
  async list() { const r = await this.api("/drive/v3/files?spaces=appDataFolder&pageSize=20&fields=" + encodeURIComponent("files(id,name,modifiedTime,appProperties)")); return (await r.json()).files || []; },
  async download(id) { const r = await this.api("/drive/v3/files/" + id + "?alt=media"); return r.arrayBuffer(); },
  async upload(id, name, bytes, props) {
    const b = "kw" + Math.random().toString(36).slice(2), meta = id ? { appProperties: props } : { name, parents: ["appDataFolder"], appProperties: props };
    const body = new Blob(["--" + b + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(meta) + "\r\n--" + b + "\r\nContent-Type: application/gzip\r\n\r\n", bytes, "\r\n--" + b + "--"]);
    const r = await this.api((id ? "/upload/drive/v3/files/" + id : "/upload/drive/v3/files") + "?uploadType=multipart&fields=id", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "multipart/related; boundary=" + b }, body });
    return r.json();
  },
};
async function gzip(str) { const s = new Blob([str]).stream().pipeThrough(new CompressionStream("gzip")); return new Response(s).blob(); }
async function gunzip(buf) { const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")); return new Response(s).text(); }

/* ============ синхронизация ============ */
const SLOTS = ["koshelek" + sfx + "-1.gz", "koshelek" + sfx + "-2.gz", "koshelek" + sfx + "-3.gz"];
const Sync = {
  state: "off", msg: "", timer: null, busy: false, conflict: null, lastCheck: 0, onState: null,
  set(state, msg) { this.state = state; this.msg = msg || ""; if (state !== this._ls) { this._ls = state; plog("sync", state + (msg ? " · " + msg : "")); } this.onState?.(); },
  consented() { return kv.consented === true && !!Auth.cid(); },
  touch(fromOtherTab) { editSeq++; if (!fromOtherTab && kv.dirty !== true) { kvSet("dirty", true); } if (!this.consented()) { this.set(kv.consented ? "error" : "off", kv.consented ? "Нет Client ID" : "Не подключён"); return; } if (this.state !== "conflict") this.set("pending", "Ждёт отправки"); clearTimeout(this.timer); this.timer = setTimeout(() => this.run().catch(() => { }), CFG.syncDelayMs); },
  snapshot(rev) { const docs = {}, sh = {}; for (const [k, v] of mem) if (!isLog(k)) { docs[k] = v; sh[k] = hsh(v); } this._sh = sh; return JSON.stringify({ v: 1, rev, device: kv.device, savedAt: new Date().toISOString(), docs }); },
  async remote() {   // лучшая корректная копия на Диске
    const files = (await drive.list()).filter(f => SLOTS.includes(f.name)).sort((a, b) => (+b.appProperties?.rev || 0) - (+a.appProperties?.rev || 0));
    return files;
  },
  async load(f) { const data = JSON.parse(await gunzip(await drive.download(f.id))); if (!data || typeof data.docs !== "object" || !Object.keys(data.docs).length) throw new Error("пустая копия"); return data; },
  async replaceLocal(data) {
    const docs = Object.assign({}, data.docs); for (const [k, v] of mem) if (isLog(k)) docs[k] = v;   // П13: журнал этого устройства не затирается копией с Диска
    await idbTx(["docs"], "readwrite", tx => { const st = tx.objectStore("docs"); st.clear(); for (const [k, v] of Object.entries(docs)) st.put(v, k); });
    mem.clear(); for (const [k, v] of Object.entries(docs)) mem.set(k, v);
    await kvSet("baseRev", +data.rev || 0); await kvSet("baseHash", Object.fromEntries(Object.entries(data.docs).filter(([k]) => !isLog(k)).map(([k, v]) => [k, hsh(v)]))); await kvSet("dirty", false); await kvSet("lastSync", Date.now());
    bc?.postMessage({ t: "reload", from: TAB });
  },
  /* проверка Диска: подтянуть новое, если у нас нет несохранённых правок; иначе — конфликт */
  async check(auto) {
    if (!this.consented() || this.busy) return;
    this.busy = true; this.set("sync", "Проверяю Диск…");
    try {
      const files = await this.remote(), top = files[0], R = top ? +top.appProperties?.rev || 0 : 0;
      this.lastCheck = Date.now();
      if (R > (+kv.baseRev || 0)) {
        let data = null; for (const f of files) { try { data = await this.load(f); break; } catch (e) { } }
        if (data && (+data.rev || 0) > (+kv.baseRev || 0)) {
          if (!kv.dirty) {
            if (auto && performance.now() < 30000 || !auto) { await this.replaceLocal(data); location.reload(); return; }
            this.conflict = { data, kind: "newer" }; this.set("conflict", "На Диске новее"); return;
          }
          this.busy = false; await this.merge(data); return;
        }
      }
      this.busy = false;
      if (kv.dirty) await this.run(); else this.set("ok", "Синхронизировано");
    } catch (e) { this.fail(e); } finally { this.busy = false; }
  },
  fail(e) {
    plog("sync-err", String(e?.code || "") + " " + String(e?.message || e).slice(0, 100));
    const c = e?.code || "";
    if (["popup", "popup_failed_to_open", "popup_closed", "timeout", "access_denied", "immediate_failed", "interaction_required", "user_cancel"].includes(c) || e?.status === 401) this.set("login", "Нужно подтвердить вход");
    else if (!navigator.onLine || e instanceof TypeError) this.set("offline", "Нет сети — отправится позже");
    else this.set("error", (e?.message || String(e)).slice(0, 140));
    if (this.state !== "login" && this.state !== "offline") { clearTimeout(this.timer); this.timer = setTimeout(() => this.run().catch(() => { }), 120000); }
  },
  async run(force) {
    if (!this.consented() || (this.busy && !force) || (this.conflict && !force)) return;
    if (!docCount()) { this.set("ok", "Синхронизировано"); return; }
    this.busy = true; this.set("sync", "Отправляю на Диск…");
    try {
      const files = await this.remote(), R = files[0] ? +files[0].appProperties?.rev || 0 : 0;
      if (R > (+kv.baseRev || 0) && !force) {
        let data = null; for (const f of files) { try { data = await this.load(f); break; } catch (e) { } }
        if (data) { this.busy = false; await this.merge(data); return; }
      }
      const seq0 = editSeq, rev = Math.max(R, +kv.baseRev || 0) + 1, snapStr = this.snapshot(rev), sh = this._sh, bytes = await gzip(snapStr);
      const slot = SLOTS.map(n => files.find(f => f.name === n) || { name: n, rev: -1 }).sort((a, b) => (+a.appProperties?.rev || a.rev || 0) - (+b.appProperties?.rev || b.rev || 0))[0];
      await drive.upload(slot.id || null, slot.name, bytes, { rev: String(rev), device: kv.device, savedAt: new Date().toISOString(), docs: String(docCount()) });
      await kvSet("baseRev", rev); await kvSet("baseHash", sh); await kvSet("lastSync", Date.now());
      const moved = editSeq !== seq0; await kvSet("dirty", moved);   // П13.5: пока шла отправка, данные менялись — остаётся «ждёт отправки», уйдёт следующая копия
      if (moved) { this.set("pending", "Ждёт отправки"); clearTimeout(this.timer); this.timer = setTimeout(() => this.run().catch(() => { }), CFG.syncDelayMs); }
      else this.set("ok", "Синхронизировано");
    } catch (e) { this.fail(e); } finally { this.busy = false; }
  },
  /* П12.12: расхождение правок — без вопросов: документы сливаются (по ключам, свои правки в приоритете), результат уходит на Диск; старые копии остаются в слотах */
  async merge(data) {
    try {
      this.busy = true; this.set("sync", "Объединяю с Диском…");
      const isO = v => v && typeof v === "object" && !Array.isArray(v);
      const mv = (l, r, d) => {
        if (d > 8 || l === undefined) return l === undefined ? r : l;
        if (typeof l === "string" && typeof r === "string" && l !== r) { try { const a = JSON.parse(l), b = JSON.parse(r); if (a && b && typeof a === "object" && typeof b === "object") return JSON.stringify(mv(a, b, d + 1)); } catch (e) { } return l; }
        if (isO(l) && isO(r)) { const o = { ...r }; for (const k of Object.keys(l)) o[k] = k in r ? mv(l[k], r[k], d + 1) : l[k]; return o; }
        if (Array.isArray(l) && Array.isArray(r)) {
          const idOf = x => isO(x) && x.id != null ? "i" + x.id : null;
          if (l.some(idOf) || r.some(idOf)) { const seen = new Map(l.map(x => [idOf(x), x])); const out = l.slice(); for (const x of r) { const k = idOf(x); if (k == null ? !l.some(y => JSON.stringify(y) === JSON.stringify(x)) : !seen.has(k)) out.push(x); } return out; }
          const out = l.slice(); for (const x of r) if (!l.some(y => JSON.stringify(y) === JSON.stringify(x))) out.push(x); return out;
        }
        return l;
      };
      const own = data.device === kv.device, out = new Map(mem); let changed = false, nCh = 0;
      const bh = kv.baseHash && typeof kv.baseHash === "object" ? kv.baseHash : null;   // П13.5: отпечатки на момент последней синхронизации — трёхстороннее слияние
      if (!own) {
        for (const [k, rv] of Object.entries(data.docs)) {
          if (isLog(k)) continue;
          const B = bh ? bh[k] : undefined;
          if (!mem.has(k)) { if (B !== undefined && hsh(rv) === B) continue; out.set(k, rv); changed = true; nCh++; continue; }   // здесь удалено, там не менялось — остаётся удалённым
          const lv = mem.get(k), hl = hsh(lv), hr = hsh(rv); if (hl === hr) continue;
          let nv; if (B !== undefined && hl === B) nv = rv; else if (B !== undefined && hr === B) continue; else nv = mv(lv, rv, 0);   // менялось только там — берём; только здесь — оставляем; с обеих сторон — как раньше
          if (JSON.stringify(nv) !== JSON.stringify(lv)) { out.set(k, nv); changed = true; nCh++; }
        }
        if (bh) for (const k of [...mem.keys()]) { if (isLog(k) || k in data.docs) continue; if (bh[k] !== undefined && hsh(mem.get(k)) === bh[k]) { out.delete(k); changed = true; nCh++; } }   // удалено там, здесь не менялось — удаляем
      }
      plog("sync", "слияние: Диск rev " + data.rev + (own ? " (это же устройство)" : " (другое устройство)") + (changed ? " · добавлено с Диска" : " · без добавлений"));
      if (changed) { await idbTx(["docs"], "readwrite", tx => { const st = tx.objectStore("docs"); st.clear(); for (const [k, v] of out) st.put(v, k); }); mem.clear(); for (const [k, v] of out) mem.set(k, v); }
      if (!own) await kvSet("lastMerge", { at: Date.now(), dev: String(data.device || "").slice(-4), rev: +data.rev || 0, n: nCh });   // П13.4 (D4)
      await kvSet("baseRev", +data.rev || 0); await kvSet("dirty", true);
      this.busy = false; await this.run(true);
      if (changed && this.state === "ok") { bc?.postMessage({ t: "reload", from: TAB }); location.reload(); }
    } catch (e) { this.busy = false; plog("sync-err", "merge " + String(e?.message || e).slice(0, 100)); this.conflict = { data, kind: "both" }; this.set("conflict", "Изменения на двух устройствах"); }
  },
  async resolve(useRemote) {
    const c = this.conflict; if (!c) return; this.conflict = null;
    if (useRemote) { await this.replaceLocal(c.data); location.reload(); return; }
    await kvSet("baseRev", +c.data.rev || 0); await this.run(true);
  },
};

/* ============ ИИ: Gemini по личному ключу ============ */
const AI = {
  key() { return kv.geminiKey || ls.get(lk("gk")) || ""; },
  model(tier) { return (kv.model || ls.get(lk("gm")) || CFG.model); },
  fallback() { const f = kv.model2 || ls.get(lk("gm2")) || CFG.fallbackModel; return f && f !== this.model() ? f : ""; },
  /* 5xx: два повтора на основной модели (2,5 и 6 с), затем та же попытка на запасной; 429 и ошибки ключа — сразу */
  async fetchGem(body, opts) {
    const base = "https://generativelanguage.googleapis.com/v1beta/models/", delays = [2500, 6000], models = [this.model(opts?.modelTier)], fb = this.fallback();
    if (fb) models.push(fb);
    let lastErr = null;
    for (let mi = 0; mi < models.length; mi++) {
      const url = base + encodeURIComponent(models[mi]) + ":generateContent";
      for (let a = 0; ; a++) {
        if (opts?.signal?.aborted) throw { code: "cancelled", message: "Остановлено" };
        let r;
        try { r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": this.key() }, body: JSON.stringify(body), signal: opts?.signal }); }
        catch (e) { if (e?.name === "AbortError" || opts?.signal?.aborted) throw { code: "cancelled", message: "Остановлено" }; throw { code: "upstream_error", message: "Нет связи с ИИ" }; }
        if (r.ok) { if (a || mi) window.dispatchEvent(new CustomEvent("koshelek-ai-wait", { detail: null })); if (mi) plog("ai-fallback", "ответила запасная: " + models[mi]); return r.json(); }
        let j = null; try { j = await r.json(); } catch (e) { }
        const msg = j?.error?.message || ("HTTP " + r.status);
        if (r.status === 429) { plog("ai-err", "429 лимит"); throw { code: "rate_limited", message: msg }; }
        if ([500, 502, 503, 504].includes(r.status)) {
          if (a < delays.length) { const w = delays[a] + Math.random() * 800; plog("ai-retry", models[mi] + " · " + r.status + " · повтор " + (a + 1) + " из " + delays.length); window.dispatchEvent(new CustomEvent("koshelek-ai-wait", { detail: { s: Math.round(w / 1000), n: a + 1, of: delays.length } })); await sleep(w); continue; }
          lastErr = { code: "upstream_error", message: "ИИ перегружен, попробуйте позже (" + r.status + ")" };
          if (mi < models.length - 1) { plog("ai-fallback", models[mi] + " → " + models[mi + 1] + " (" + r.status + ")"); window.dispatchEvent(new CustomEvent("koshelek-ai-wait", { detail: { fb: models[mi + 1] } })); break; }
          throw lastErr;
        }
        if (mi && lastErr) throw lastErr;   // запасная модель недоступна по другой причине — показываем исходную перегрузку
        if ([400, 401, 403].includes(r.status)) { if (/API key|API_KEY|permission|PERMISSION/i.test(msg) || r.status !== 400) throw { code: "not_granted", message: msg }; throw { code: "upstream_error", message: msg }; }
        throw { code: "upstream_error", message: msg };
      }
    }
    throw lastErr || { code: "upstream_error", message: "ИИ недоступен" };
  },
  async parts(input, opts) {
    const parts = [{ text: String(input).replace(/\b([A-Z]{2})(\d{2})([A-Z0-9]{11,30})\b/g, (m, c) => c + "00XXXX") }];
    for (const im of opts?.images || []) {
      let mime, b64;
      if (im && typeof im === "object" && "data" in im && typeof im.data === "string") { mime = im.mediaType || im.mimeType || "image/jpeg"; b64 = im.data.replace(/^data:[^,]+,/, ""); }
      else { const bl = im instanceof Blob ? im : new Blob([im]); mime = bl.type || "image/jpeg"; b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = () => rej(fr.error); fr.readAsDataURL(bl); }); }
      parts.push({ inline_data: { mime_type: mime, data: b64 } });
    }
    return parts;
  },
  text(j) {
    const c = j?.candidates?.[0];
    if (!c) { if (j?.promptFeedback?.blockReason) throw { code: "refused", message: j.promptFeedback.blockReason }; throw { code: "empty_completion", message: "пустой ответ" }; }
    if (c.finishReason === "SAFETY" || c.finishReason === "PROHIBITED_CONTENT") throw { code: "refused", message: c.finishReason };
    const t = (c.content?.parts || []).map(p => p.text || "").join("");
    if (!t.trim()) throw { code: "empty_completion", message: "пустой ответ" };
    return t;
  },
};
async function sampleText(input, opts) {
  const j = await AI.fetchGem({ contents: [{ role: "user", parts: await AI.parts(input, opts) }] }, opts);
  return { text: AI.text(j), truncated: false, modelTierApplied: opts?.modelTier || "default" };
}
sampleText.json = async (input, opts) => {
  const j = await AI.fetchGem({ contents: [{ role: "user", parts: await AI.parts(input, opts) }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }, opts);
  let t = AI.text(j).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(t); } catch (e) { const m = /[\[{][\s\S]*[\]}]/.exec(t); if (m) { try { return JSON.parse(m[0]); } catch (e2) { } } throw { code: "invalid_json", message: "ответ не JSON" }; }
};
sampleText.limits = async () => ({ maxPromptBytes: 900000, tools: false, images: { maxCount: 4, maxInputBytes: 10e6, mediaTypes: ["image/png", "image/jpeg", "image/webp"] } });
Object.freeze(sampleText);

/* ============ загрузки ============ */
const downloads = Object.freeze({ async save(r) {
  const b = new Blob([r.data], { type: /\.html$/i.test(r.filename) ? "text/html" : /\.json$/i.test(r.filename) ? "application/json" : "application/octet-stream" });
  const a = el("a", { href: URL.createObjectURL(b), download: r.filename }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return { status: "saved" };
} });

/* ============ интерфейс подключений ============ */
const css = `
.head{padding-right:36px}
#kwPill{position:fixed;z-index:60;top:calc(env(safe-area-inset-top,0px) + 6px);right:8px;height:30px;min-width:30px;padding:0 10px;border-radius:999px;border:1px solid var(--line,#dfe4e9);background:var(--surface,#fff);color:var(--muted,#5b6873);font:600 .78rem var(--f,system-ui);display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 1px 3px rgb(0 0 0/.12)}
#kwPill i{width:9px;height:9px;border-radius:50%;background:var(--muted,#888);display:inline-block}
#kwPill.ok i{background:var(--ok,#2f7a4a)}#kwPill.sync i,#kwPill.pending i{background:var(--warn,#8a5d00)}#kwPill.error i,#kwPill.conflict i,#kwPill.login i{background:var(--bad,#a83a2c)}
#kwPill.ok span,#kwPill.sync span,#kwPill.pending span{display:none}
#kwDlg{border:0;border-radius:20px;background:var(--surface,#fff);color:var(--ink,#14212b);width:min(520px,calc(100vw - 24px));max-height:calc(100vh - 32px);padding:0;overflow:auto;box-shadow:0 20px 60px rgb(0 0 0/.3);font:15px/1.45 var(--f,system-ui)}
#kwDlg::backdrop{background:rgb(10 20 26/.55)}
@media(max-width:719px){#kwDlg{width:100vw;max-width:100vw;margin:auto 0 0;border-radius:20px 20px 0 0;max-height:92vh}}
#kwDlg .kw{padding:18px 16px 22px;display:flex;flex-direction:column;gap:14px}
#kwDlg h2{margin:0;font-size:1.15rem}#kwDlg h3{margin:0;font-size:1rem}
#kwDlg .st{border:1px solid var(--line,#dfe4e9);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
#kwDlg .st.done{border-color:var(--ok,#2f7a4a)}
#kwDlg .hd{display:flex;gap:8px;align-items:center;justify-content:space-between}
#kwDlg .tag{font-size:.78rem;font-weight:600;padding:2px 9px;border-radius:999px;background:var(--track,#e6eaee);color:var(--muted,#5b6873);white-space:nowrap}
#kwDlg .tag.ok{background:var(--ok-soft,#e3f1e7);color:var(--ok,#2f7a4a)}#kwDlg .tag.bad{background:var(--bad-soft,#f8e4e1);color:var(--bad,#a83a2c)}
#kwDlg .m{font-size:.84rem;color:var(--muted,#5b6873)}#kwDlg .m.bad{color:var(--bad,#a83a2c)}
#kwDlg input[type=text],#kwDlg input[type=password]{width:100%;box-sizing:border-box;font:inherit;padding:10px 12px;min-height:44px;border:1px solid var(--line,#dfe4e9);border-radius:12px;background:var(--surface,#fff);color:inherit}
#kwDlg .row{display:flex;gap:8px;flex-wrap:wrap}
#kwDlg .btn{flex:1 1 auto}
#kwDlg a{color:var(--accent,#0d5c6e)}
#kwDlg details summary{cursor:pointer;font-size:.86rem;color:var(--muted,#5b6873)}
#kwBar,#kwWarn{position:fixed;z-index:70;left:8px;right:8px;bottom:calc(var(--tabh,58px) + env(safe-area-inset-bottom,0px) + 12px);background:var(--ink,#14212b);color:var(--bg,#fff);border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:.9rem;box-shadow:0 8px 24px rgb(0 0 0/.3)}
#kwBar button,#kwWarn button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:8px 14px;min-height:38px;background:var(--surface,#fff);color:var(--accent,#0d5c6e);cursor:pointer}
`;
let dlg = null, pill = null, bar = null;
const STATE_LABEL = { off: "Не подключён", ok: "Синхронизировано", pending: "Ждёт отправки", sync: "Синхронизация…", error: "Ошибка Диска", offline: "Нет сети", login: "Нужен вход", conflict: "Конфликт" };
function mountUI() {
  if (pill) return;
  document.head.append(el("style", null, css));
  pill = el("button", { id: "kwPill", type: "button", "aria-label": "Подключения", onclick: () => openConn() }, el("i"), el("span"));
  document.body.append(pill);
  Sync.onState = () => { updatePill(); if (dlg?.open && dlgMode === "conn") renderConn(); renderBar(); renderWarn(); };
  updatePill();
}
function updatePill() {
  if (!pill) return;
  pill.className = Sync.state; pill.querySelector("span").textContent = STATE_LABEL[Sync.state] || "";
  pill.title = (STATE_LABEL[Sync.state] || "") + (Sync.msg ? ": " + Sync.msg : "");
}
function renderBar() {
  if (Sync.state === "conflict" && Sync.conflict) {
    if (!bar) { bar = el("div", { id: "kwBar" }); document.body.append(bar); }
    bar.replaceChildren(el("span", null, Sync.conflict.kind === "newer" ? "На Диске есть более новые данные." : "Данные изменены на двух устройствах."), el("button", { type: "button", onclick: () => openConn() }, "Решить"));
  } else if (bar) { bar.remove(); bar = null; }
}
let warn = null;
/* П13 (A0.2): данные только на телефоне, Диск не подключён — тихая плашка (скрывается на 7 дней кнопкой «Позже») */
function renderWarn() {
  const show = !!document.body && !Sync.consented() && !gateMode && docCount() > 0 && !(+ls.get(lk("kw_nodrv_until")) > Date.now());
  if (!show) { if (warn) { warn.remove(); warn = null; } return; }
  if (warn) return;
  warn = el("div", { id: "kwWarn" }, el("span", null, persisted ? "Данные только на этом телефоне. Подключите Диск: копия спасёт при потере или замене телефона." : "Данные только на этом телефоне, браузер может стереть их при нехватке памяти. Подключите Диск."),
    el("span", { style: "display:flex;gap:6px" }, el("button", { type: "button", onclick: () => openConn() }, "Подключить"), el("button", { type: "button", onclick: () => { ls.set(lk("kw_nodrv_until"), String(Date.now() + 7 * 864e5)); renderWarn(); } }, "Позже")));
  document.body.append(warn);
}
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function stepBox(n, title, done, tag, body) {
  return el("div", { class: "st" + (done === true ? " done" : "") }, el("div", { class: "hd" }, el("h3", null, n + ". " + title), el("span", { class: "tag" + (done === true ? " ok" : done === "bad" ? " bad" : "") }, tag)), body);
}
let gateRes = null, gateMode = false, aiMsg = "", aiBusy = false, gMsg = "";
function renderConn() {
  if (!dlg) return;
  const g = Sync.consented(), hasKey = !!AI.key();
  const stGoogle = [];
  if (!Auth.cid()) {
    const inp = el("input", { type: "text", placeholder: "Client ID Google (…apps.googleusercontent.com)", id: "kwCid" });
    stGoogle.push(el("div", { class: "m bad" }, "Не задан Client ID приложения Google. Вставьте его (его даёт владелец приложения)."), inp, el("button", { class: "btn", type: "button", onclick: () => { const v = inp.value.trim(); if (/\.apps\.googleusercontent\.com$/.test(v)) { ls.set("cid", v); gMsg = ""; renderConn(); } else { gMsg = "Это не похоже на Client ID."; renderConn(); } } }, "Запомнить"));
  } else if (!g) {
    stGoogle.push(el("div", { class: "m" }, "Данные хранятся в этом телефоне. Вход Google включает копию в скрытой папке приложения на вашем Диске: она не видна в файлах Диска и нужна, чтобы вернуть данные на новом телефоне. Приложение видит только эту папку."),
      el("button", { class: "btn primary", type: "button", onclick: googleLogin }, "Войти через Google"));
  } else {
    stGoogle.push(el("div", { class: "m" + (["error", "login", "conflict"].includes(Sync.state) ? " bad" : "") }, (STATE_LABEL[Sync.state] || "") + (Sync.msg && Sync.msg !== STATE_LABEL[Sync.state] ? ": " + Sync.msg : "") + (kv.lastSync ? " · последняя: " + new Date(kv.lastSync).toLocaleString("ru-RU") : "")),
      (["ok", "pending", "sync"].includes(Sync.state) ? (r => el("details", null, el("summary", null, "Управление"), r)) : (r => r))(el("div", { class: "row", style: "margin-top:8px" },
        el("button", { class: "btn", type: "button", onclick: async () => { if (Sync.state === "login") { try { await Auth.get("consent"); } catch (e) { } } kvSet("dirty", true); Sync.conflict ? null : Sync.run(); } }, "Синхронизировать сейчас"),
        el("button", { class: "btn", type: "button", onclick: async () => { await kvSet("consented", false); Auth.token = null; Sync.set("off", ""); renderConn(); } }, "Отключить"))));
  }
  if (g && kv.lastMerge) stGoogle.push(el("div", { class: "m", id: "kwMerge" }, "Последнее слияние: " + new Date(kv.lastMerge.at).toLocaleString("ru-RU") + " · с устройством …" + kv.lastMerge.dev + " · " + (kv.lastMerge.n ? "обновлено документов: " + kv.lastMerge.n : "без изменений")));   // П13.4 (D4)
  if (gMsg) stGoogle.push(el("div", { class: "m bad" }, gMsg));
  if (Sync.conflict) stGoogle.push(el("div", { class: "st" }, el("div", { class: "m" }, "На Диске копия от " + new Date(Sync.conflict.data.savedAt || Date.now()).toLocaleString("ru-RU") + ". Выберите, какие данные оставить — вторые будут заменены."),
    el("div", { class: "row" }, el("button", { class: "btn primary", type: "button", onclick: () => Sync.resolve(true) }, "Взять с Диска"), el("button", { class: "btn", type: "button", onclick: () => Sync.resolve(false) }, "Оставить с этого телефона"))));
  const key = el("input", { type: "password", id: "kwKey", placeholder: hasKey ? "Ключ сохранён на этом телефоне" : "Ключ Gemini (AIza…)", autocomplete: "off" });
  const stForm = [
    el("div", { class: "m" }, "ИИ раскладывает траты по категориям. Нужен личный бесплатный ключ Google AI Studio. Ключ хранится только на этом телефоне и никуда не синхронизируется."),
    el("ol", { class: "m", style: "margin:0;padding-left:20px;display:flex;flex-direction:column;gap:3px" },
      el("li", null, el("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener" }, "Откройте страницу ключа"), " и войдите тем же аккаунтом Google."),
      el("li", null, "Нажмите «Create API key» и выберите проект (или создайте новый)."),
      el("li", null, "Скопируйте ключ — он начинается с «AIza»."),
      el("li", null, "Вернитесь сюда, нажмите «Вставить из буфера», затем кнопку проверки ниже.")),   // П13.4 (D1)
    key,
    el("div", { class: "row" }, el("button", { class: "btn", type: "button", onclick: async () => { try { const t = (await navigator.clipboard.readText()).trim(); if (t) { key.value = t; aiMsg = /^AIza[\w-]{20,}$/.test(t) ? "" : "В буфере не похоже на ключ: он начинается с «AIza» и без пробелов."; } else aiMsg = "Буфер пуст: скопируйте ключ на странице Google."; } catch (e) { aiMsg = "Браузер не дал доступ к буферу — вставьте ключ вручную в поле."; } const v = key.value; renderConn(); const k2 = document.getElementById("kwKey"); if (k2) k2.value = v; } }, "Вставить из буфера")),
    el("div", { class: "m" }, "Что уходит в Gemini: названия получателей и назначения платежей; для фото — само фото чека. Суммы и номера счетов при разборе операций не отправляются. Единственное исключение — кнопка «Неверно — спросить ИИ» при незнакомом формате выписки: уходят первые строки файла, номера счетов обезличены. Внимание: на бесплатном уровне Google может использовать отправленное для улучшения своих продуктов."),
    el("div", { class: "row" }, el("button", { class: "btn primary", type: "button", disabled: aiBusy, onclick: async () => { const v = key.value.trim(); if (!v && !hasKey) { aiMsg = "Вставьте ключ."; renderConn(); return; } await aiCheck(v); } }, aiBusy ? "Проверяю…" : hasKey && !key.value ? "Проверить ключ" : "Сохранить и проверить"),
      hasKey ? el("button", { class: "btn", type: "button", onclick: async () => { await kvSet("geminiKey", ""); ls.del(lk("gk")); aiMsg = "Ключ удалён."; window.dispatchEvent(new Event("koshelek-ai")); renderConn(); } }, "Удалить ключ") : null),
  ];
  const stAi = hasKey ? [el("div", { class: "m" }, "Ключ сохранён на этом телефоне. ИИ раскладывает траты по категориям."), el("details", null, el("summary", null, "Изменить или удалить ключ"), el("div", { style: "display:flex;flex-direction:column;gap:8px;margin-top:8px" }, stForm))] : stForm;
  if (aiMsg) stAi.push(el("div", { class: "m" + (/^✓/.test(aiMsg) ? "" : " bad") }, aiMsg));
  const adv = el("details", null, el("summary", null, "Дополнительно"), el("div", { class: "m" }, "Модель Gemini: "), el("input", { type: "text", value: AI.model(), onchange: ev => { const v = ev.target.value.trim(); if (v) { kvSet("model", v); ls.set(lk("gm"), v); } } }), el("div", { class: "m" }, "Запасная модель (если основная отвечает 503): "), el("input", { type: "text", value: AI.fallback() || CFG.fallbackModel, onchange: ev => { const v = ev.target.value.trim(); kvSet("model2", v); ls.set(lk("gm2"), v); } }));
  const inst = standalone();
  const body = [
    el("h2", null, gateMode ? "Настроим «Кошелёк»" + (PROF.list.length > 1 ? " · " + curProf().name : "") : "Подключения"),
    stepBox(1, "Установка на главный экран", inst ? true : "bad", inst ? "готово" : "нужно", inst ? el("div", { class: "m" }, "Приложение запущено как установленное.") : el("div", { class: "m" }, "Меню Chrome ⋮ → «Добавить на главный экран» → «Установить». Дальше открывайте «Кошелёк» с главного экрана: так он работает надёжнее. Защищает от потери копия на Диске (шаг 2).")),
    stepBox(2, "Вход Google и копия на Диске", g, g ? "подключено" : "не подключено", el("div", { style: "display:flex;flex-direction:column;gap:8px" }, stGoogle)),
    stepBox(3, "ИИ-помощник (Gemini)", hasKey, hasKey ? "ключ есть" : "не задан", el("div", { style: "display:flex;flex-direction:column;gap:8px" }, stAi, adv)),
  ];
  if (gateMode) body.push(el("div", { class: "row" }, el("button", { class: "btn primary", type: "button", onclick: () => finishGate() }, g || hasKey ? "Продолжить" : "Пропустить, настрою позже")), el("div", { class: "m" }, "Все шаги можно пройти позже: «Настройки» → «Подключения» или значок в правом верхнем углу."));
  else body.push(el("div", { class: "row" }, el("button", { class: "btn", type: "button", onclick: () => dlg.close() }, "Закрыть")));
  dlg.replaceChildren(el("div", { class: "kw" }, body));
}
async function aiCheck(v) {
  aiBusy = true; aiMsg = ""; renderConn();
  const old = AI.key();
  try {
    if (v) { await kvSet("geminiKey", v); ls.set(lk("gk"), v); }
    const r = await sampleText("Ответь одним словом: ок", { modelTier: "quick" });
    aiMsg = "✓ Ключ работает (ответ: " + String(r.text).trim().slice(0, 20) + ").";
  } catch (e) {
    if (v && old !== v) { await kvSet("geminiKey", old || ""); old ? ls.set(lk("gk"), old) : ls.del(lk("gk")); }
    aiMsg = e.code === "not_granted" ? "Ключ не принят Google. Проверьте, что скопировали его целиком." : e.code === "rate_limited" ? "Ключ принят, но лимит запросов исчерпан. Подождите минуту." : e.code === "upstream_error" ? "Не получилось связаться с Gemini: " + e.message : "Ошибка: " + (e.message || e.code);
    if (e.code === "rate_limited" && v) aiMsg = "✓ Ключ сохранён, но сейчас лимит запросов — повторите позже.";
  }
  aiBusy = false; window.dispatchEvent(new Event("koshelek-ai")); renderConn();
}
async function googleLogin() {
  gMsg = ""; renderConn();
  try {
    await Auth.get("select_account consent");
    await kvSet("consented", true);
    Sync.set("sync", "Ищу копию на Диске…");
    const files = await Sync.remote();
    let data = null; for (const f of files) { try { data = await Sync.load(f); break; } catch (e) { } }
    const localEmpty = docCount() === 0;
    if (data && localEmpty) { await Sync.replaceLocal(data); location.reload(); return; }
    if (data && !localEmpty) { Sync.conflict = { data, kind: "both" }; Sync.set("conflict", "На Диске уже есть копия"); }
    else { await kvSet("dirty", true); await Sync.run(); }
  } catch (e) {
    gMsg = e.code === "access_denied" ? "Доступ не дан. Нажмите «Разрешить» в окне Google." : e.code === "popup" || e.code === "popup_failed_to_open" ? "Окно входа не открылось. Разрешите всплывающие окна для этого приложения и повторите." : e.code === "no_client" ? "Не задан Client ID." : (e.message || "Не получилось войти.");
    Sync.set("off", "");
  }
  renderConn();
}
let dlgMode = "conn", usr = { edit: null, del: null, msg: "" };
function ensureDlg() { mountUI(); if (!dlg) { dlg = el("dialog", { id: "kwDlg" }); document.body.append(dlg); dlg.addEventListener("close", () => { if (gateMode && !gateRes) return; }); dlg.addEventListener("cancel", ev => { if (gateMode) ev.preventDefault(); }); } }
function openConn() { ensureDlg(); dlgMode = "conn"; renderConn(); if (!dlg.open) dlg.showModal(); }
function openUsers() { ensureDlg(); dlgMode = "users"; usr = { edit: null, del: null, msg: "" }; renderUsers(); if (!dlg.open) dlg.showModal(); }
async function flushSync() { try { if (Sync.consented() && kv.dirty && !Sync.conflict) await Promise.race([Sync.run(true), sleep(5000)]); } catch (e) { } }
async function switchTo(id) { usr.msg = "Переключаю…"; renderUsers(); await flushSync(); PROF.act = id; saveProf(); location.reload(); }
function addProf(name, email) {
  name = String(name || "").trim(); if (!name) { usr.msg = "Введите имя."; renderUsers(); return; }
  const id = "u" + Date.now().toString(36); PROF.list.push({ id, name: name.slice(0, 30), email: String(email || "").trim() }); saveProf(); switchTo(id);
}
function delProf(id) {
  const i = PROF.list.findIndex(p => p.id === id); if (i < 0 || id === pid) return;
  PROF.list.splice(i, 1); saveProf();
  try { indexedDB.deleteDatabase("koshelek-w" + (id === "p1" ? "" : "-" + id)); } catch (e) { }
  for (const k of ["gk", "gm", "gm2"]) ls.del(id === "p1" ? k : k + ":" + id);
  try { for (let i2 = localStorage.length - 1; i2 >= 0; i2--) { const k = localStorage.key(i2); if (k && k.startsWith("u:" + id + ":")) _ld.call(localStorage, k); } } catch (e) { }
  usr.del = null; usr.msg = "Пользователь удалён с этого телефона. Копия на Диске осталась."; renderUsers();
}
function renderUsers() {
  if (!dlg) return;
  const rows = PROF.list.map(p => {
    const me = p.id === pid;
    if (usr.edit === p.id) {
      const n = el("input", { type: "text", value: p.name, maxlength: 30, "aria-label": "Имя пользователя" }), m = el("input", { type: "text", value: p.email || "", placeholder: "Google-почта (необязательно)", autocomplete: "off", "aria-label": "Google-почта" });
      return el("div", { class: "st" }, n, m, el("div", { class: "row" },
        el("button", { class: "btn primary", type: "button", onclick: () => { const v = n.value.trim(); if (!v) return; p.name = v.slice(0, 30); p.email = m.value.trim(); saveProf(); usr.edit = null; renderUsers(); } }, "Сохранить"),
        el("button", { class: "btn", type: "button", onclick: () => { usr.edit = null; renderUsers(); } }, "Отмена")));
    }
    return el("div", { class: "st" + (me ? " done" : "") },
      el("div", { class: "hd" }, el("h3", null, p.name), me ? el("span", { class: "tag ok" }, "активен") : null),
      p.email ? el("div", { class: "m" }, p.email) : null,
      el("div", { class: "row" },
        me ? null : el("button", { class: "btn primary", type: "button", onclick: () => switchTo(p.id) }, "Переключиться"),
        el("button", { class: "btn", type: "button", onclick: () => { usr.edit = p.id; usr.del = null; renderUsers(); } }, "Изменить"),
        me || PROF.list.length < 2 ? null : el("button", { class: "btn", type: "button", onclick: () => { if (usr.del === p.id) delProf(p.id); else { usr.del = p.id; renderUsers(); } } }, usr.del === p.id ? "Точно удалить?" : "Удалить")));
  });
  const nn = el("input", { type: "text", id: "kwNewName", placeholder: "Имя нового пользователя", maxlength: 30, autocomplete: "off" }), nm = el("input", { type: "text", id: "kwNewMail", placeholder: "Google-почта (необязательно)", autocomplete: "off" });
  dlg.replaceChildren(el("div", { class: "kw" },
    el("h2", null, "Пользователи"),
    el("div", { class: "m" }, "У каждого свои данные, ключ ИИ и копия на Диске. Общие только приложение и его Client ID. Если у пользователя свой аккаунт Google, укажите его почту: так вход и обновление не перепутают аккаунты."),
    rows,
    el("div", { class: "st" }, el("h3", null, "Добавить пользователя"), nn, nm, el("button", { class: "btn primary", type: "button", onclick: () => addProf(nn.value, nm.value) }, "Добавить и переключить")),
    usr.msg ? el("div", { class: "m" }, usr.msg) : null,
    el("div", { class: "row" }, el("button", { class: "btn", type: "button", onclick: () => dlg.close() }, "Закрыть"))));
}
document.addEventListener("click", ev => { if (ev.target.closest("#kwUser")) openUsers(); });
function finishGate() { gateMode = false; kvSet("setupDone", true); dlg.close(); gateRes?.(); gateRes = null; }
function gate() {
  if (kv.setupDone || docCount()) return Promise.resolve();
  return new Promise(res => { gateRes = res; gateMode = true; const go = () => { mountUI(); openConn(); }; if (document.body) go(); else addEventListener("DOMContentLoaded", go); });
}

/* ============ запуск ============ */
const readyP = (async () => {
  idb.db = await idbOpen(); await idbLoadAll();
  if (!kv.device) await kvSet("device", Math.random().toString(36).slice(2, 10));
  if (kv.consented === undefined && ls.get("consented") === "1" && Auth.cid()) await kvSet("consented", true);   // перенос из тест-страницы того же адреса
  (async () => { try { let p = await navigator.storage?.persisted?.(); if (!p) p = await navigator.storage?.persist?.(); persisted = !!p; } catch (e) { persisted = false; } plog("storage", persisted ? "закреплено" : "не закреплено"); try { Sync.onState?.(); } catch (e) { } })();
  Sync.set(Sync.consented() ? (kv.dirty ? "pending" : "ok") : "off", "");
})();
async function afterAppStart() {
  mountUI(); plog("platform", BUILD + " · google " + (Sync.consented() ? "вкл" : "выкл") + " · ключ " + (AI.key() ? "есть" : "нет"));
  setTimeout(renderWarn, 3000);
  if (!Sync.consented()) return;
  setTimeout(() => Sync.check(true), 2500);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { if (Date.now() - Sync.lastCheck > 60000) Sync.check(false); } else if (kv.dirty) Sync.run().catch(() => { }); });
  addEventListener("online", () => Sync.check(false));
  setInterval(() => { if (document.visibilityState === "visible" && Date.now() - Sync.lastCheck > 300000) Sync.check(false); }, 60000);
  /* токен истёк, а тихо обновить без касания нельзя — обновляем по первому нажатию */
  document.addEventListener("pointerdown", () => { if (Sync.state === "login" && Date.now() - Auth.lastSilent > 30000) { Auth.lastSilent = Date.now(); Sync.run(true).catch(() => { }); } }, { passive: true });
}
const user = Object.freeze({ id: async () => "local", isOwner: async () => true, canEdit: async () => true, can: async () => true, me: async () => ({ id: "local", name: "" }) });
const permissions = Object.freeze({ state: async () => ({ gemini: !!AI.key(), google: Sync.consented() }), manage: async () => { openConn(); } });
const use = async name => {
  await readyP;
  if (name === "db") { await gate(); setTimeout(afterAppStart, 0); return db; }
  if (name === "user") return user;
  if (name === "sample") return AI.key() ? sampleText : null;
  if (name === "downloads") return downloads;
  if (name === "permissions") return permissions;
  return null;
};
window.claude = Object.freeze({ use });
/* имя пользователя латиницей (Алина → alina): не источник дохода — переводы «от себя» */
window.KW_NOINC = () => { try { const n = String((curProf() || {}).name || "").trim().toLowerCase(); if (!n) return []; const M = {а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sh",ы:"i",э:"e",ю:"ju",я:"ja",ь:"",ъ:""}; const l = [...n].map(c => M[c] != null ? M[c] : c).join(""); return [...new Set([n, l])].filter(x => x.length >= 3); } catch (e) { return []; } };
window.KOSHELEK = { _hsh: hsh, openConn, openUsers, profile: curProf, Sync, AI, mem, kv, db, build: BUILD };
})();
