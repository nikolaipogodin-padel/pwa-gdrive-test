# П15.10 — мелочи после аудита: политика ред. 5, зоны нажатия (K-39), сумма дня при одной операции, theme-color
import sys
root = sys.argv[1]; NEW = "П15.10 · 13.11.2026"; OLD = "П15.9 · 12.11.2026"
def sub1(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)
p = root + '/koshelek/platform.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW)
s = sub1(s, '#kwPill{padding:0;justify-content:center}', '#kwPill{padding:0;justify-content:center}#kwPill::after{content:"";position:absolute;inset:-7px}')
open(p, 'w', encoding='utf-8').write(s)
p = root + '/koshelek/sw.js'; s = open(p, encoding='utf-8').read(); s = sub1(s, '"koshelek-v9"', '"koshelek-v10"'); open(p, 'w', encoding='utf-8').write(s)
p = root + '/koshelek/manifest.webmanifest'; s = open(p, encoding='utf-8').read(); s = sub1(s, '"theme_color":"#0d5c6e"', '"theme_color":"#007e98"'); open(p, 'w', encoding='utf-8').write(s)
p = root + '/koshelek/index.html'; s = open(p, encoding='utf-8').read(); s = sub1(s, OLD, NEW)
s = sub1(s, '<meta name="theme-color" content="#0d5c6e">', '<meta name="theme-color" content="#007e98" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0d5c6e" media="(prefers-color-scheme: dark)">')
s = sub1(s, '.mnav-b::after { content: ""; position: absolute; inset: -5px -3px; }', '.mnav-b::after { content: ""; position: absolute; inset: -5px -3px; }\n@media (max-width: 719px) { #hdrMonth .mnav-b::after { inset: -5px -7px; } }')
s = sub1(s, '  const dayTot = new Map(); for (const o of ops) dayTot.set(', '  const dayCnt = new Map(); for (const o of ops) dayCnt.set(o.d, (dayCnt.get(o.d) || 0) + 1);   // П15.10: сумма дня — только если операций больше одной\n  const dayTot = new Map(); for (const o of ops) dayTot.set(')
s = sub1(s, '${Math.abs(v) >= 0.005 ? `<span class="num">${v > 0 ? "+" : "−"}${eur(Math.abs(v))}</span>` : ""}</div>`; }', '${Math.abs(v) >= 0.005 && dayCnt.get(o.d) > 1 ? `<span class="num">${v > 0 ? "+" : "−"}${eur(Math.abs(v))}</span>` : ""}</div>`; }')
open(p, 'w', encoding='utf-8').write(s)
p = root + '/privacy.html'; s = open(p, encoding='utf-8').read()
s = sub1(s, 'Редакция 4 от 12 ноября 2026', 'Редакция 5 от 13 ноября 2026'); s = sub1(s, 'редакция 4 от 12.11.2026', 'редакция 5 от 13.11.2026')
s = sub1(s, 'Удаляются операции, правки, правила, настройки и журнал. Перед этим можно нажать «Скачать копию (JSON)».', 'Удаляются операции, правки, правила, настройки и журнал. В том же окне можно отметить «Удалить и ключ ИИ с этого устройства». Перед удалением можно нажать «Скачать копию (JSON)»: это файл со всеми операциями, правками и правилами без ключа ИИ. Он не зашифрован, хранится там, куда вы его сохранили, и загружается обратно кнопкой «Восстановить из копии» — в том числе на другом устройстве; при восстановлении данные на устройстве заменяются данными из файла.')
s = sub1(s, 'кнопка «Удалить все данные» в приложении её не удаляет, и при повторном входе Google копия вернётся на устройство. Чтобы стереть её, откройте', 'кнопка «Удалить все данные» удаляет её, только если в окне удаления отмечено «Удалить и копии на Google Диске» (пункт виден, когда Диск подключён). Без этой отметки копия остаётся и при повторном входе Google вернётся на устройство. Стереть её можно и вручную: откройте')
open(p, 'w', encoding='utf-8').write(s); print('ok')
