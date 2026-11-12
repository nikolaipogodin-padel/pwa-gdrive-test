# П15.7 — K-44 («Это мой счёт» одним нажатием), K-38 (связь «Внести» ↔ «Наличные»)
import sys
root = sys.argv[1]; NEW = "П15.7 · 12.11.2026"; OLD = "П15.6 · 12.11.2026"
def sub1(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)
p = root + '/platform.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW); open(p, 'w', encoding='utf-8').write(s)
p = root + '/sw.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, '"koshelek-v6"', '"koshelek-v7"'); open(p, 'w', encoding='utf-8').write(s)
p = root + '/index.html'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW)
# K-44: кнопка в карточке, если подсказка — запасная «Переводы людям» по списанию
s = sub1(s, '''    ${open ? qEditor(x) : ""}
    <details class="qg-ops" data-qops="${k}"''', '''    ${open ? qEditor(x) : ""}
    ${!open && !dirty && x.dir !== "in" && c && c.by === "запасная" && c.group === "Переводы людям" ? `<div class="qc-own"><button type="button" class="linkbtn" data-qown="${k}">Это мой счёт — не расход</button></div>` : ""}
    <details class="qg-ops" data-qops="${k}"''')
s = sub1(s, '''  const ed = ev.target.closest("[data-qedit]");
  if (ed) { qOpenEd(ed.dataset.qedit); return; }''', '''  const ow = ev.target.closest("[data-qown]");
  if (ow) { const key = ow.dataset.qown, r = qEditOf(key); if (!r) return; Object.assign(r.e, OWN_CAT, { gNew: false, sNew: false, rule: false, marker: "" }); qTouch(r.e); logEv("click", "qOwn"); qSave(key); return; }   // П15.7
  const ed = ev.target.closest("[data-qedit]");
  if (ed) { qOpenEd(ed.dataset.qedit); return; }''')
s = sub1(s, '.linkbtn { text-decoration: none; }', '.linkbtn { text-decoration: none; }\n.qc-own { padding: 2px 0 8px 44px; } .qc-own .linkbtn { font-weight: 650; min-height: 36px; }')
# K-38
s = sub1(s, '''      <h2>Траты вне выписки</h2>
''', '''      <h2>Траты вне выписки</h2>
      <p class="small muted" style="margin:0 0 8px">Любые траты, которых ещё нет в выписке — можно несколько сразу. Остаток наличных и их история — <button type="button" class="linkbtn" data-go="cash">во вкладке «Наличные»</button>.</p>
''')
s = sub1(s, '''      <span class="small muted" id="cMsg" aria-live="polite"></span>
    </form>''', '''      <span class="small muted" id="cMsg" aria-live="polite"></span>
      <p class="small muted" style="margin:0">Несколько трат одной строкой или по фото чека — <button type="button" class="linkbtn" data-go="in">во «Внести»</button>.</p>
    </form>''')
open(p, 'w', encoding='utf-8').write(s); print('ok')
