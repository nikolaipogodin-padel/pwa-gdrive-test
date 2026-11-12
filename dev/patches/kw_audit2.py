# П15.4 — этап 2 аудита: K-05, K-12 (текст), K-14, K-21, K-34, K-40, K-41, K-43.
import sys
root = sys.argv[1]; NEW = "П15.4 · 12.11.2026"; OLD = "П15.3 · 12.11.2026"
def sub1(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)
p = root + '/platform.js'; s = open(p, encoding='utf-8').read()
s = sub1(s, OLD, NEW)
# K-05: окно настройки — после первой выписки и конца первого запуска, а не первым экраном
s = sub1(s, '''function gate() {
  if (kv.setupDone || docCount()) return Promise.resolve();
  return new Promise(res => { gateRes = res; gateMode = true; const go = () => { mountUI(); openConn(); }; if (document.body) go(); else addEventListener("DOMContentLoaded", go); });
}''', '''function gate() {
  if (!kv.setupDone) { if (!docCount()) kvSet("gateLater", true); else if (!kv.gateLater) kvSet("setupDone", true); }   // П15.4: у тех, кто уже с данными, окно не показываем
  return Promise.resolve();
}
function gateWatch() {
  if (kv.setupDone || !kv.gateLater) return;
  const t = setInterval(() => {
    if (kv.setupDone) { clearInterval(t); return; }
    if (!docCount() || !document.body || /(^|\\s)is-onb/.test(document.body.className) || document.querySelector("dialog[open]") || document.visibilityState !== "visible") return;
    const w = document.getElementById("wizard"); if (w && !w.hidden) return;
    clearInterval(t); gateRes = null; gateMode = true; openConn();
  }, 2500);
}
document.addEventListener("click", ev => { if (ev.target.closest("#kwRestore")) openConn(); });''')
s = sub1(s, 'async function afterAppStart() {\n  mountUI();', 'async function afterAppStart() {\n  mountUI(); gateWatch();')
s = sub1(s, 'gateMode ? el("div", { class: "m" }, "Эти шаги необязательны и не нужны для загрузки выписки: можно нажать «Пропустить» внизу и вернуться к ним позже.") : null,',
            'gateMode ? el("div", { class: "m" }, "Выписка загружена. Остались необязательные шаги: копия на Google Диске бережёт данные, ИИ помогает с незнакомыми платежами. Можно пропустить и вернуться позже.") : null,')
s = sub1(s, 'inst ? true : IS_PHONE ? "bad" : false, inst ? "готово" : IS_PHONE ? "нужно" : "по желанию"', 'inst ? true : false, inst ? "готово" : IS_PHONE ? "советуем" : "по желанию"')
open(p, 'w', encoding='utf-8').write(s)
p = root + '/index.html'; s = open(p, encoding='utf-8').read()
s = sub1(s, OLD, NEW)
s = sub1(s, '      <p class="wiz-note" id="wMsg" role="status"></p>', '      <p class="wiz-note" id="wMsg" role="status"></p>\n      <p class="small muted" style="text-align:center">Уже пользовались «Кошельком»? <button type="button" class="linkbtn" id="kwRestore">Вернуть данные с Google Диска</button></p>')
# K-14
s = sub1(s, 'o.g === "Прочие расходы" && o.s === "Прочие расходы" && catMark(o)?.src !== "user";', 'o.g === "Прочие расходы" && o.s === "Прочие расходы" && catMark(o)?.src !== "user" && !["batch", "single"].includes(catMark(o)?.chk);   // П15.4: отмеченное галочкой в «Разборе» — подтверждено')
# K-40
s = sub1(s, '$("qTabs").innerHTML = Q_TABS.map(([k, t]) =>', '$("qTabs").innerHTML = Q_TABS.filter(([k]) => V.by[k].length || k === V.tab).map(([k, t]) =>')
# K-41
s = sub1(s, 't: String(x.ops[0].info || cpText(x.ops[0]) || "—").replace(/\\s+/g, " ").trim() };',
            't: (String(x.ops[0].info || cpText(x.ops[0]) || "—").replace(/\\b\\d{4,6}\\*{2,}\\d{2,4}\\b|\\b(?:[\\d*]{4} ){3}[\\d*]{4}\\b/g, "").replace(/\\b\\d{1,2}\\.\\d{1,2}\\.\\d{4}\\b/g, "").replace(/\\b\\d+[.,]\\d{2}\\s*EUR\\b/gi, "").replace(/\\(\\d{4,}\\)/g, "").replace(/\\s+/g, " ").trim() || "—") };')
# K-43
s = sub1(s, 'Правило по «${esc(R.m)}»: эти ${pl(n, "операция", "операции", "операций")}', 'Правило по «${esc(R.m)}»: ${n === 1 ? "эта операция" : "эти " + pl(n, "операция", "операции", "операций")}')
# K-12
s = sub1(s, 'Перед этим можно «Скачать копию (JSON)». Для подтверждения напишите «удалить».', 'Ключ ИИ и копия на Google Диске при этом остаются: ключ удаляется в «Подключениях», копию с Диска — как описано в политике конфиденциальности. Для подтверждения напишите «удалить».')
# K-21
s = sub1(s, 'const infoTxt = t => cleanInfo(t).replace(', 'const infoTxt = t => cleanInfo(t).replace(/\\b[A-Z]{2}\\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\\b/g, "").replace(/\\b\\d{4,6}\\*{2,}\\d{2,4}\\b|\\b(?:[\\d*]{4} ){3}[\\d*]{4}\\b/g, "").replace(/(?<![\\d.,])\\d{1,7}\\s*(EUR|€)/gi, "").replace(')
# K-34
s = sub1(s, '.num { font-variant-numeric: tabular-nums; }', '.num { font-variant-numeric: normal; }')
open(p, 'w', encoding='utf-8').write(s)
p = root + '/sw.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, '"koshelek-v3"', '"koshelek-v4"'); open(p, 'w', encoding='utf-8').write(s)
print('ok')
