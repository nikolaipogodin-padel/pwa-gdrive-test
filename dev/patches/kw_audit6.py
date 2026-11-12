# П15.8 — этап 3: K-04 (восстановление из копии), K-12 (удаление ключа и копии с Диска), K-19/K-20 (xlsx локально, kv не в window), K-24 (без temperature)
import sys
root = sys.argv[1]; NEW = "П15.8 · 12.11.2026"; OLD = "П15.7 · 12.11.2026"
def sub1(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)
p = root + '/platform.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW)
s = sub1(s, 'generationConfig: { responseMimeType: "application/json", temperature: 0.2 }', 'generationConfig: { responseMimeType: "application/json" }')   # K-24
s = sub1(s, 'window.KOSHELEK = { _hsh: hsh, openConn, openUsers, profile: curProf, Sync, AI, mem, kv, db, build: BUILD };', '''/* П15.8 (K-04, K-12): резервная копия файлом и полное удаление */
const Backup = {
  make() { const docs = {}; for (const [k, v] of mem) if (!isLog(k)) docs[k] = v; return JSON.stringify({ koshelek_backup: 1, build: BUILD, savedAt: new Date().toISOString(), docs }); },
  read(text) {
    let d; try { d = JSON.parse(text); } catch (e) { throw { code: "bad", message: "Это не файл копии «Кошелька»." }; }
    if (d && !d.koshelek_backup && (d.journal || d.exported)) throw { code: "old", message: "Эта копия сделана старой версией (до П15.8) и не восстанавливается. Сделайте новую копию." };
    if (!d || d.koshelek_backup !== 1 || !d.docs || typeof d.docs !== "object" || Array.isArray(d.docs)) throw { code: "bad", message: "Это не файл копии «Кошелька»." };
    const keys = Object.keys(d.docs).filter(k => !isLog(k)); if (!keys.length) throw { code: "empty", message: "В копии нет данных." };
    return { n: keys.length, savedAt: d.savedAt || "", build: d.build || "", docs: Object.fromEntries(keys.map(k => [k, d.docs[k]])) };
  },
  async restore(text) {
    const b = this.read(text), docs = Object.assign({}, b.docs); for (const [k, v] of mem) if (isLog(k)) docs[k] = v;
    await idbTx(["docs"], "readwrite", tx => { const st = tx.objectStore("docs"); st.clear(); for (const [k, v] of Object.entries(docs)) st.put(v, k); });
    mem.clear(); for (const [k, v] of Object.entries(docs)) mem.set(k, v);
    await kvSet("dirty", true); await kvSet("setupDone", true);   // восстановленное уйдёт на Диск обычной отправкой
    plog("storage", "восстановлено из файла: документов " + b.n); bc?.postMessage({ t: "reload", from: TAB });
    return b.n;
  },
  /* вместе с «Удалить все данные»: ключ ИИ и/или копии на Диске */
  async wipe(opt) {
    const out = { key: false, drive: null };
    if (opt && opt.key) { await kvSet("geminiKey", ""); ls.del(lk("gk")); out.key = true; }
    if (opt && opt.drive && Sync.consented()) {
      const files = (await drive.list()).filter(f => SLOTS.includes(f.name)); let n = 0;
      for (const f of files) { await drive.api("/drive/v3/files/" + f.id, { method: "DELETE" }); n++; }
      await kvSet("baseRev", 0); await kvSet("baseHash", {}); await kvSet("dirty", false); out.drive = n; plog("sync", "копии на Диске удалены: " + n);
    }
    return out;
  },
};
window.KOSHELEK = { _hsh: hsh, openConn, openUsers, profile: curProf, Sync, AI, mem, db, build: BUILD, backup: { make: () => Backup.make(), read: t => { const b = Backup.read(t); return { n: b.n, savedAt: b.savedAt, build: b.build }; }, restore: t => Backup.restore(t), wipe: o => Backup.wipe(o) }, driveOn: () => Sync.consented(), hasKey: () => !!AI.key() };''')
open(p, 'w', encoding='utf-8').write(s)
p = root + '/sw.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, '"koshelek-v7"', '"koshelek-v8"'); s = sub1(s, '|cdnjs\\.cloudflare\\.com', ''); open(p, 'w', encoding='utf-8').write(s)
p = root + '/index.html'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW)
s = sub1(s, 'const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";', 'const XLSX_URL = "xlsx.full.min.js";   // П15.8: SheetJS 0.20.3 лежит рядом с приложением')
# K-04: разметка
s = sub1(s, '<div class="inline"><button class="btn" type="button" id="sExport">Скачать копию (JSON)</button><span class="note" id="sExportMsg" aria-live="polite"></span></div>',
 '<div class="inline"><button class="btn" type="button" id="sExport">Скачать копию (JSON)</button><label class="btn filebtn">Восстановить из копии<input id="sRestoreFile" type="file" accept=".json,application/json" class="vh"></label><span class="note" id="sExportMsg" aria-live="polite"></span></div>\n'
 '      <div id="sRestoreBox" hidden><p class="note" id="sRestoreInfo"></p><div class="inline"><button class="btn primary" type="button" id="sRestoreGo">Заменить данные копией</button><button class="btn" type="button" id="sRestoreNo">Отмена</button></div></div>\n'
 '      <p class="small muted">Копия — файл со всеми операциями, правками и правилами. Его можно загрузить обратно здесь же, в том числе на другом устройстве. Ключ ИИ в копию не входит.</p>')
# K-12: разметка и текст
s = sub1(s, 'Ключ ИИ и копия на Google Диске при этом остаются: ключ удаляется в «Подключениях», копию с Диска — как описано в политике конфиденциальности. Для подтверждения напишите «удалить».</p>',
 'Для подтверждения напишите «удалить».</p>\n          <label class="small" id="sDelKeyL" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="sDelKey"> Удалить и ключ ИИ с этого устройства</label>\n          <label class="small" id="sDelDriveL" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="sDelDrive"> Удалить и копии на Google Диске</label>')
# K-04: экспорт = полная копия; восстановление
a = s.index('$("sExport").addEventListener("click", async () => {'); b = s.index('$("sDelWord").addEventListener("input"')
s = s[:a] + '''$("sExport").addEventListener("click", async () => {
  if (!S.downloads) return;
  try { if (SAVE.p) await SAVE.p; await S.downloads.save({ filename: `koshelek-kopija-${todayISO()}.json`, data: window.KOSHELEK.backup.make() }); $("sExportMsg").textContent = "Файл сохранён."; }
  catch (e) { $("sExportMsg").textContent = e?.code === "declined" ? "Скачивание отменено." : "Не получилось скачать."; }
});
/* П15.8 (K-04): восстановление из файла копии */
let restoreText = "";
$("sRestoreFile").addEventListener("change", async ev => {
  const f = ev.target.files && ev.target.files[0]; ev.target.value = ""; restoreText = ""; $("sRestoreBox").hidden = true; if (!f) return;
  try { const t = await f.text(), b = window.KOSHELEK.backup.read(t); restoreText = t;
    $("sRestoreInfo").textContent = `Копия${b.savedAt ? " от " + new Date(b.savedAt).toLocaleString("ru-RU") : ""}. Все данные на этом устройстве будут заменены данными из копии. Вернуть нельзя.`;
    $("sRestoreBox").hidden = false; $("sExportMsg").textContent = ""; }
  catch (e) { $("sExportMsg").textContent = e?.message || "Файл не читается."; }
});
$("sRestoreNo").addEventListener("click", () => { restoreText = ""; $("sRestoreBox").hidden = true; });
$("sRestoreGo").addEventListener("click", async () => {
  if (!restoreText || S.busy) return; S.busy = true; busy("Восстанавливаю из копии…");
  try { if (SAVE.p) await SAVE.p; await window.KOSHELEK.backup.restore(restoreText); logEv("click", "restore"); location.reload(); }
  catch (e) { S.busy = false; busy(null); $("sExportMsg").textContent = e?.message || "Не получилось восстановить."; $("sRestoreBox").hidden = true; }
});
document.addEventListener("toggle", ev => { if (ev.target && ev.target.id === "sDelBox" && ev.target.open) { $("sDelKeyL").hidden = !window.KOSHELEK.hasKey(); $("sDelDriveL").hidden = !window.KOSHELEK.driveOn(); } }, true);
''' + s[b:]
# K-12: перед перезагрузкой после удаления
s = sub1(s, '''    if (fail) throw fail;
    S.saved.clear();
    location.reload();''', '''    if (fail) throw fail;
    S.saved.clear();
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* нет хранилища */ }
    try { await window.KOSHELEK.backup.wipe({ key: $("sDelKey").checked, drive: $("sDelDrive").checked }); }
    catch (e) { alertNote = "Данные на устройстве удалены, но копии на Google Диске удалить не получилось" + (e?.message ? ": " + e.message : "") + ". Удалите их по инструкции из политики конфиденциальности."; }
    if (alertNote) { S.busy = false; busy(null); showErr(alertNote); setTimeout(() => location.reload(), 8000); return; }
    location.reload();''')
s = sub1(s, '$("sDel").addEventListener("click", async () => {', 'let alertNote = "";\n$("sDel").addEventListener("click", async () => {')
open(p, 'w', encoding='utf-8').write(s); print('ok')
