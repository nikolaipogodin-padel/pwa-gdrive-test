const { launch, shot, BASE, txt } = require('./lib');
const D = '/home/claude/audit/work/data/'; const R = []; const ok = (n, c, d) => { R.push((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
(async () => {
  const { browser, page, logs } = await launch({ profile: 'N4' });
  const sleep = ms => page.waitForTimeout(ms);
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(2500);
  await page.setInputFiles('#wFile', D + 'sw_main_2026-05_2026-10.csv'); await sleep(2500);
  await page.click('#incSave'); await sleep(2000); await page.click('#qCoachGo'); await sleep(800);
  const own = page.locator('[data-qown]'); ok('K-44 кнопка одна, у перевода человеку', await own.count() === 1, 'кнопок: ' + await own.count());
  const card = page.locator('.qg', { has: own }); ok('K-44 кнопка у JANIS PARAUGS', /JANIS PARAUGS/.test(await card.innerText()));
  await card.scrollIntoViewIfNeeded(); await sleep(3500); ok('плашки про Диск нет в первом запуске', await page.evaluate(() => { const b = document.querySelector('#kwBar'); return !b || b.hidden || getComputedStyle(b).display === 'none'; })); await shot(page, 's5_own_btn');
  await own.click(); await sleep(1800);
  ok('K-44 карточка ушла из разбора', await page.locator('.qg', { hasText: 'JANIS PARAUGS' }).count() === 0);
  const st = await page.evaluate(() => { const o = []; for (const m of ['2026-09', '2026-10']) for (const x of (S.months[m]?.ops || [])) if (/JANIS/.test(x.cp)) o.push(x.t + '/' + x.g + '/' + x.s); return o.join(' ; '); });
  ok('K-44 операции — «Свои счета»', st === 'Перемещение/Перемещение/Свои счета ; Перемещение/Перемещение/Свои счета', st);
  ok('K-44 есть отмена', /Отменить/.test(await txt(page, '#undoBar', 200)), (await txt(page, '#undoBar', 120)).replace(/\n/g, ' '));
  for (const c of await page.$$('.qc-chk:not([disabled])')) await c.check();
  await page.click('#qFootGo'); await sleep(1200); const pp = page.locator('#qPostpone'); if (await pp.isVisible()) { await pp.click(); await sleep(800); }
  await sleep(4500); if (await page.evaluate(() => !!document.querySelector('#kwDlg')?.open)) { await page.getByText('Пропустить, настрою позже').click(); await sleep(600); }
  await page.click('#tabs [data-tab="home"]'); await sleep(600); const h = await txt(page, '#p-home', 700);
  ok('K-44 «Переводы людям» нет в расходах', !/Переводы людям/.test(h), h.replace(/\n/g, ' | ').slice(0, 220));
  await page.click('#tabs [data-tab="in"]'); await sleep(500); await page.locator('#inForm [data-go="cash"]').click(); await sleep(600);
  ok('K-38 ссылка «Внести» → «Наличные»', await page.evaluate(() => !document.querySelector('#p-cash').hidden)); await shot(page, 's5_cash');
  await page.locator('#cashForm [data-go="in"]').click(); await sleep(600);
  ok('K-38 ссылка «Наличные» → «Внести»', await page.evaluate(() => !document.querySelector('#p-in').hidden)); await shot(page, 's5_in');
  ok('ошибок консоли нет', !logs.filter(l => /PAGEERROR/.test(l)).length, logs.filter(l => /PAGEERROR/.test(l)).join(';').slice(0, 300));
  console.log(R.join('\n')); await browser.close();
})().catch(e => { console.log(R.join('\n')); console.error('FAIL', String(e).slice(0, 500)); process.exit(1); });
