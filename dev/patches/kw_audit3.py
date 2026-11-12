# П15.5 — остаток этапа 2: K-22, K-33, K-34, K-35, K-42, K-43 (коды ошибок)
import sys, re
root = sys.argv[1]; NEW = "П15.5 · 12.11.2026"; OLD = "П15.4 · 12.11.2026"
def sub1(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)
p = root + '/koshelek/platform.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW); open(p, 'w', encoding='utf-8').write(s)
p = root + '/koshelek/sw.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, '"koshelek-v4"', '"koshelek-v5"'); open(p, 'w', encoding='utf-8').write(s)
p = root + '/koshelek/index.html'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW)
# K-34: пропорциональные цифры в интерфейсе (в печатном отчёте таблицы не трогаем)
cut = s.index('<body>'); head, rest = s[:cut], s[cut:]
i = rest.index('<style>'); j = rest.index('</style>', i); css = rest[i:j]
n = css.count('font-variant-numeric: tabular-nums'); assert n >= 15, n
rest = rest[:i] + css.replace('font-variant-numeric: tabular-nums', 'font-variant-numeric: normal') + rest[j:]; s = head + rest
# K-33: одна основная кнопка на всех экранах и в окне «Подключения»
a = ':is(body.is-onb, body:has(#wizard:not([hidden])), #p-q, #p-in) .btn.primary { background: var(--grad, var(--accent)); border: 0; color: var(--accent-ink); font-weight: 750; border-radius: 12px; }'
s = sub1(s, a, a + '\n:is(#p-home, #p-ops, #p-cash, #p-set, #kwDlg, #dlg) .btn.primary { background: var(--grad, var(--accent)); border: 0; color: var(--accent-ink); border-radius: 12px; }')
# K-35: знак «−» в строках операций
s = sub1(s, '<span class="amt num${o.a > 0 ? " in" : ""}">${o.a > 0 ? "+" : ""}${eur(o.a)}</span>', '<span class="amt num${o.a > 0 ? " in" : ""}">${o.a > 0 ? "+" : o.a < 0 ? "−" : ""}${eur(Math.abs(o.a))}</span>')
# K-42: группа и подстатья с одним названием — одно название
s = sub1(s, 'c.type + " · " : "") + c.group + " → " + c.sub;', 'c.type + " · " : "") + (c.group === c.sub ? c.group : c.group + " → " + c.sub);')
# K-43: код ошибки — в журнал, не в текст
s = sub1(s, 'const pickErr = (map, e, dflt) => (map[e?.code] || dflt) + (e?.code ? ` [${e.code}]` : "");', 'const pickErr = (map, e, dflt) => (map[e?.code] || dflt);')
open(p, 'w', encoding='utf-8').write(s)
# K-22: политика, редакция 4
p = root + '/privacy.html'; s = open(p, encoding='utf-8').read()
s = sub1(s, 'Редакция 3 от 8 ноября 2026', 'Редакция 4 от 12 ноября 2026'); s = sub1(s, 'редакция 3 от 08.11.2026', 'редакция 4 от 12.11.2026')
a = '    <div class="note">Данные, которые уходят в Gemini, не анонимизированы.'
s = sub1(s, a, '    <p><strong>Голосовой ввод.</strong> Кнопка с микрофоном использует распознавание речи вашего браузера. В Chrome звук для распознавания может передаваться в Google; приложение получает только готовый текст и запись не хранит. Если это не подходит — вводите траты с клавиатуры.</p>\n' + a)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
