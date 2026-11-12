# П15.6 — K-33: палитра и элементы эталона 01–04 на всех вкладках (светлая тема)
import sys
root = sys.argv[1]; NEW = "П15.6 · 12.11.2026"; OLD = "П15.5 · 12.11.2026"
def sub1(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)
p = root + '/platform.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW); open(p, 'w', encoding='utf-8').write(s)
p = root + '/sw.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, '"koshelek-v5"', '"koshelek-v6"'); open(p, 'w', encoding='utf-8').write(s)
p = root + '/index.html'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW)
s = sub1(s, ':is(body.is-onb, body:has(#wizard:not([hidden])), body:has(#p-q:not([hidden])), body:has(#p-in:not([hidden])))', 'body', 4)
s = sub1(s, ':is(body.is-onb, body:has(#wizard:not([hidden])), #p-q, #p-in)', 'body', 8)
s = sub1(s, 'Цвета — только в светлой теме и только в этих разделах; «Главная», «Наличные», «Настройки» и меню не меняются.', 'Цвета — только в светлой теме. С П15.6 (решение владельца 12.11.2026) палитра и кнопки действуют на всех вкладках.')
open(p, 'w', encoding='utf-8').write(s); print('ok')
