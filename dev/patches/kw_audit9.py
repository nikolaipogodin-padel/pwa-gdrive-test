import sys, re
root = sys.argv[1]
def sub(path, old, new, n=1):
    s = open(path, encoding="utf-8").read()
    assert s.count(old) == n, (path, old[:60], s.count(old))
    open(path, "w", encoding="utf-8").write(s.replace(old, new))
ix = root + "/index.html"
# П15.16: набранное вручную — отметка не снимается, только подсказка; с фото — как раньше (решение владельца 20.11.2026)
sub(ix, "r.dupManual = knownManual(r); if (r.dupManual && !r.dupManual.near) r.on = false; return r; });", "r.dupManual = knownManual(r); return r; });")
sub(ix, "p.dupBank = p.kind !== \"cash\" ? knownInBank(p) : null; p.dupManual = knownManual(p); if (p.dupBank || (p.dupManual && !p.dupManual.near)) p.on = false;",
        "p.dupBank = p.kind !== \"cash\" ? knownInBank(p) : null; p.dupManual = knownManual(p);")
sub(ix, "if (p.dupBank || (p.dupManual && (!p.dupManual.near || (file && !p.dupManual.weak)))) p.on = false; } }",
        "if (file && (p.dupBank || (p.dupManual && !p.dupManual.weak))) p.on = false; } }")
sub(ix, "${eur(dup.a)} €. Отметка снята, чтобы не задвоить.</div>`",
        "${eur(dup.a)} €. ${p.on ? \"Если это та же покупка — снимите отметку.\" : \"Отметка снята, чтобы не задвоить.\"}</div>`")
sub(ix, "${p.on ? (dm.weak ? \"Если это та же трата — снимите отметку.\" : \"Если это ещё одна трата — оставьте отметку.\") :",
        "${p.on ? (dm.weak || !dm.near ? \"Если это та же трата — снимите отметку.\" : \"Если это ещё одна трата — оставьте отметку.\") :")
s = open(ix, encoding="utf-8").read()
old, new = "П15.15 · 15.11.2026", "П15.16 · 20.11.2026"
assert s.count(old) == 1; open(ix, "w", encoding="utf-8").write(s.replace(old, new))
p = root + "/platform.js"; s = open(p, encoding="utf-8").read(); assert s.count(old) == 1; open(p, "w", encoding="utf-8").write(s.replace(old, new))
p = root + "/sw.js"; s = open(p, encoding="utf-8").read(); assert "koshelek-v15" in s; open(p, "w", encoding="utf-8").write(s.replace("koshelek-v15", "koshelek-v16"))
