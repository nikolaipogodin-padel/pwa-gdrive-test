import sys, re
root = sys.argv[1]
def sub(path, old, new, n=1):
    s = open(path, encoding="utf-8").read()
    assert s.count(old) == n, (path, old[:60], s.count(old))
    open(path, "w", encoding="utf-8").write(s.replace(old, new))
ix = root + "/index.html"
sub(ix, "  return near ? Object.assign({ near: true }, near.x) : null;\n}",
"""  if (near) return Object.assign({ near: true }, near.x);
  /* П15.15: та же сумма в пределах 3 дней среди записей по карте (ждут выписку или уже связаны), название другое или его нет —
     мягкая подсказка, отметка остаётся. По случаю 15.11: аптека внесена дважды, вторая запись осталась «ждать выписку» навсегда. */
  const weak = Object.values(S.pending || {}).filter(x => amt(x) && /^\\d{4}-\\d{2}-\\d{2}$/.test(x.date || "") && Math.abs(dayDiff(x.date, p.date)) <= 3)
    .sort((a, b) => Math.abs(dayDiff(a.date, p.date)) - Math.abs(dayDiff(b.date, p.date)))[0];
  return weak ? Object.assign({ near: true, weak: true }, weak) : null;
}""")
sub(ix, """: dm ? `<div class="warn-line">${dm.near ? "Похожая запись уже есть" : "Такая запись уже внесена"}:""",
        """: dm ? `<div class="warn-line">${dm.weak ? "На эту сумму уже есть запись" : dm.near ? "Похожая запись уже есть" : "Такая запись уже внесена"}:""")
sub(ix, """${p.on ? "Если это ещё одна трата — оставьте отметку." :""",
        """${p.on ? (dm.weak ? "Если это та же трата — снимите отметку." : "Если это ещё одна трата — оставьте отметку.") :""")
sub(ix, "(p.dupManual && (!p.dupManual.near || file))) p.on = false;", "(p.dupManual && (!p.dupManual.near || (file && !p.dupManual.weak)))) p.on = false;")
# сборка
s = open(ix, encoding="utf-8").read()
m = re.search(r'window\.KW_INDEX_BUILD\s*=\s*"([^"]+)"', s); old = m.group(1); print("old build", old)
new = "П15.15 · 15.11.2026"
open(ix, "w", encoding="utf-8").write(s.replace(m.group(0), m.group(0).replace(old, new)))
p = root + "/platform.js"; s = open(p, encoding="utf-8").read()
m2 = re.search(r'BUILD\s*=\s*"([^"]+)"', s); assert m2.group(1) == old, m2.group(1)
open(p, "w", encoding="utf-8").write(s.replace(m2.group(0), m2.group(0).replace(old, new), 1))
p = root + "/sw.js"; s = open(p, encoding="utf-8").read(); assert "koshelek-v14" in s
open(p, "w", encoding="utf-8").write(s.replace("koshelek-v14", "koshelek-v15"))
