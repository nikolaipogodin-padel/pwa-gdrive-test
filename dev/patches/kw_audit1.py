# П15.3 — этап 1 аудита (K-01, K-02, K-03, K-06, K-07, K-09, K-10, K-11, K-13, K-16, K-23). Точечные замены; каждая обязана сработать ровно один раз.
import sys, re
root = sys.argv[1]
NEW = "П15.3 · 12.11.2026"; OLD = "П15.2г · 09.11.2026"
def sub1(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)
p = root + '/index.html'; s = open(p, encoding='utf-8').read()
# K-01: head
headtags = '''<title>Кошелёк</title>
<meta name="theme-color" content="#0d5c6e">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Кошелёк">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png?v=1"><link rel="apple-touch-icon" href="icon-192.png?v=1">
'''
s = sub1(s, '\n' + headtags, '\n')
s = sub1(s, '<!doctype html><html><head><meta charset=utf8>', '<!doctype html><html lang="ru"><head><meta charset="utf-8">')
s = sub1(s, '</style></head><body>\n<script>window.KW_INDEX_BUILD', '</style>\n' + headtags + '</head><body>\n<script>window.KW_INDEX_BUILD')
s = sub1(s, OLD, NEW)
# K-06
s = sub1(s, '$("qCoachGo").addEventListener("click", () => { S.qIntroDone = true; $("qCoach").hidden = true; });',
            '$("qCoachGo").addEventListener("click", () => { S.qIntroDone = true; $("qCoach").hidden = true; if ($("p-q").hidden) selectTab("q"); });')
# K-07
s = sub1(s, '  if (imp.stage === "done") { box.innerHTML = waitQ; return; }',
 '  if (imp.stage === "done") { const list = imp.list || [], tot = list.reduce((a, x) => a + (x.added || 0), 0), sk = list.reduce((a, x) => a + (x.skipped || 0), 0);\n'
 '    box.innerHTML = `<p class="note ok">✓ ${tot ? `Добавлено: ${pl(tot, "новая операция", "новые операции", "новых операций")}` : "Новых операций нет — всё уже было в учёте"}${tot && sk ? `, ещё ${sk} уже были в учёте` : ""}.</p>` + waitQ; return; }')
# K-09
s = sub1(s, 'ИИ использует лимит вашего аккаунта.<br>Номера счетов и карт ему не передаются. Операции хранятся в вашем личном разделе; файлы выписок не сохраняются.',
            'ИИ работает по вашему ключу Gemini.<br>Номера счетов и карт ему не передаются. Операции хранятся на этом устройстве; файл выписки не сохраняется.')
# K-10
s = sub1(s, "'формат определён неуверенно — можно спросить Claude' : 'формат не определён — можно спросить Claude (он увидит первые строки файла)'",
            "'Формат файла определён неуверенно.' : 'Не удалось распознать формат файла.'")
s = sub1(s, 'можно спросить Claude ещё раз', 'можно спросить ИИ ещё раз')
s = sub1(s, 'ИИ в этом просмотре недоступен — выберите колонки сами.', 'ИИ не подключён. Укажите колонки сами — или подключите ИИ: «Настройки» → «Подключения».')
s = sub1(s, 'Выгрузите выписку из банка заново (CSV или Excel) или пришлите файл владельцу аппа.', 'Выгрузите выписку из интернет-банка заново (CSV или Excel) и загрузите снова.')
# K-23: понятный текст отказа (исходный остаётся в журнале)
s = sub1(s, 'function helpHtml(imp, c) {',
 'function impNice(m) { m = String(m || "");\n'
 '  if (/нет строки входящего или исходящего остатка/.test(m)) return "Выписка неполная: в файле нет начального или конечного остатка. Выгрузите её из банка целиком, без фильтров.";\n'
 '  if (/ожидается положительная сумма/.test(m)) return "Файл повреждён или изменён вручную. Выгрузите выписку из банка заново.";\n'
 '  if (/не сходится сам с собой/.test(m)) return "Суммы в файле не сходятся с остатком — похоже, выгрузка неполная. Выгрузите выписку из банка заново.";\n'
 '  return m ? m[0].toUpperCase() + m.slice(1) : m; }\n'
 'function helpHtml(imp, c) {')
s = sub1(s, '${esc(imp.error || imp.learn?.message || "файл не читается")}', '${esc(impNice(imp.error || imp.learn?.message || "файл не читается"))}')
s = sub1(s, '<p class="note bad">${esc(c.message || "файл не прошёл проверку")}</p>', '<p class="note bad">${esc(impNice(c.message || "файл не прошёл проверку"))}</p>')
s = sub1(s, '${esc(c.message || "Формат файла не определился.")}</p>`];', '${esc(impNice(c.message || "Формат файла не определился."))}</p>`];')
# K-11
a = s.index('$("aiTest").addEventListener("click", async () => {'); b = s.index('document.addEventListener("click", async ev => { if (!ev.target.closest("#inPerm"))')
s = s[:a] + '''$("aiTest").addEventListener("click", async () => {
  const o = $("aiTestOut"); o.textContent = "Проверяю…"; let res = "", det = "";
  try {
    const s = S.sample || await use("sample");
    if (!s) res = "ИИ не подключён. Ключ Gemini: «Настройки» → «Подключения».";
    else { S.sample = s; try { const r = await s("Ответь одним словом: ок", { modelTier: "quick", cache: false }); det = "ответ: " + String(r.text).slice(0, 40); res = "✓ ИИ отвечает."; }
      catch (e) { det = (e.code || "") + " " + (e.message || ""); res = e.code === "not_granted" ? "Ключ Gemini не принят. Проверьте его: «Настройки» → «Подключения»." : e.code === "rate_limited" ? "Слишком много запросов — попробуйте через минуту." : "Нет связи с Gemini. Проверьте интернет и попробуйте ещё раз."; } }
  } catch (e) { det = String(e.message || e); res = "Проверка не удалась — попробуйте ещё раз."; }
  o.textContent = res; try { logEv("ai-test", (res + (det ? " · " + det : "")).slice(0, 200)); } catch (e) { /* журнал недоступен */ }
});
''' + s[b:]
# K-13
s = sub1(s, '''  ev.preventDefault();
  if (S.cashKind !== "in" && $("cNote").value.trim() &&''', '''  ev.preventDefault();
  { const raw = String($("cAmt").value).replace(/\\s/g, "").replace(",", "."); if (raw && !(parseFloat(raw) > 0)) { $("cMsg").className = "small errmsg"; $("cMsg").textContent = "Укажите сумму больше нуля."; return; } }
  if (S.cashKind !== "in" && $("cNote").value.trim() &&''')
# K-03
s = sub1(s, '    if (NAME_RE.test(c) && c.length <= 40) n.set(c, (n.get(c) || 0) + 1);\n  }\n  return [...n].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);',
            '    if (NAME_RE.test(c) && c.length <= 40 && !ORG_RE.test(c)) n.set(c, (n.get(c) || 0) + 1);   // П15.3: банк и юрлицо — не «своё имя»\n  }\n  return [...n].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);')
s = sub1(s, 'function ownNames() {', 'const ORG_RE = /(^|[\\s"«.,-])(AS|A\\/S|SIA|AB|UAB|OÜ|OU|SE|OY|OYJ|LTD|LLC|GMBH|INC|PLC|IK|ZS|BANK|BANKA|BANKAS|PANK|SWEDBANK|SEB|CITADELE|LUMINOR|REVOLUT|WISE|PAYSERA|N26)($|[\\s"».,-])/i;\nfunction ownNames() {')
# K-16
s = sub1(s, '      <p class="note" id="foot"></p>\n', '      <p class="note" id="foot"></p>\n      <p class="small"><a href="../privacy.html" target="_blank" rel="noopener">Политика конфиденциальности</a> · <a href="../about.html" target="_blank" rel="noopener">О приложении</a></p>\n')
open(p, 'w', encoding='utf-8').write(s)
p = root + '/platform.js'; s = open(p, encoding='utf-8').read()
s = sub1(s, OLD, NEW)
# K-02: в значке только точка; текст — в подсказке и для экранного диктора
s = sub1(s, '#kwPill.ok span,#kwPill.sync span,#kwPill.pending span{display:none}', '#kwPill{padding:0;justify-content:center}#kwPill span{display:none}')
s = sub1(s, 'pill.title = (STATE_LABEL[Sync.state] || "") + (Sync.msg ? ": " + Sync.msg : "");', 'pill.title = (STATE_LABEL[Sync.state] || "") + (Sync.msg ? ": " + Sync.msg : ""); pill.setAttribute("aria-label", "Подключения" + (pill.title ? ": " + pill.title : ""));')
i = s.index('    el("div", { class: "m" }, "Что уходит в Gemini:'); j = s.index('\n', i)
s = s[:j+1] + '    el("div", { class: "m" }, el("a", { href: "../privacy.html", target: "_blank", rel: "noopener" }, "Политика конфиденциальности"), " · ", el("a", { href: "../about.html", target: "_blank", rel: "noopener" }, "О приложении")),\n' + s[j+1:]
open(p, 'w', encoding='utf-8').write(s)
p = root + '/sw.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, 'const CACHE = "koshelek-v2";', 'const CACHE = "koshelek-v3";'); open(p, 'w', encoding='utf-8').write(s)
print('ok')
