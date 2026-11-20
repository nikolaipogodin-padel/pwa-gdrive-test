const { launch, shot, BASE, txt } = require('./lib'); const fs = require('fs');
const D = '/home/claude/audit/work/data/'; const R = []; const ok = (n, c, d) => { R.push((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
(async () => {
  const { browser, page, logs } = await launch({ profile: process.argv[2] || 'M2' });
  const sleep = ms => page.waitForTimeout(ms);
  await page.clock.install({ time: new Date('2026-11-15T12:00:00') });   // даты в pend_*.csv привязаны к 15.11.2026
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(2500);
  await page.setInputFiles('#wFile', D + 'pend_a.csv'); await sleep(2500);
  await page.locator('#incList input[type=checkbox]').first().check(); await page.click('#incSave'); await sleep(2000);
  await page.click('#qCoachGo').catch(() => { }); await sleep(800);
  for (const c of await page.$$('.qc-chk:not([disabled])')) await c.check();
  if (await page.locator('#qFootGo').isVisible()) { await page.click('#qFootGo').catch(() => { }); await sleep(1200); }
  const pp = page.locator('#qPostpone'); if (await pp.isVisible()) { await pp.click(); await sleep(800); }
  await sleep(4500); if (await page.evaluate(() => !!document.querySelector('#kwDlg')?.open)) { await page.getByText('Пропустить, настрою позже').click(); await sleep(600); }
  await page.click('#tabs [data-tab="in"]'); await sleep(500);
  await page.fill('#inText', 'такси 8,40; аптека 9,69; кино 33'); await page.click('#inGo'); await sleep(3000);
  await page.click('#propSave'); await sleep(2000);
  const before = (await txt(page, '#p-in', 1500)).replace(/\n/g, ' | ');
  ok('записи сохранены как предварительные', /такси/i.test(before) && /кино/i.test(before));
  await page.setInputFiles('#impFile', D + 'pend_b.csv'); await sleep(2500);
  console.log('preview:', (await txt(page, '#impBox', 500)).replace(/\n/g, ' | '));
  await page.click('#impGo'); await sleep(2500);
  const after = (await txt(page, '#p-in', 2500)).replace(/\n/g, ' | ');
  const m = /Подтверждены выпиской: (\d+)/.exec(after); ok('такси и аптека связаны с выпиской (дата записи = день проводки, покупка на 2 дня раньше)', m && +m[1] === 2, (m ? m[0] : 'нет строки') + ' ¦ ' + after.slice(after.indexOf('Ждут'), after.indexOf('Ждут') + 260));
  ok('«кино 33» остаётся ждать', /кино/i.test(after) && !/нет проводки[^|]*\|[^|]*такси/i.test(after));
  await shot(page, 's7_prelim', true);
  await page.click('#tabs [data-tab="home"]'); await sleep(600);
  // журнал
  await page.click('#tabs [data-tab="set"]'); await sleep(400); await page.evaluate(() => document.querySelectorAll('#p-set details').forEach(d => d.open = true)); await sleep(500);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('#kwLogFile')]);
  ok('журнал скачивается', !!d); if (d) { await d.saveAs('/home/claude/audit/work/dl/log_new.json'); const j = JSON.parse(fs.readFileSync('/home/claude/audit/work/dl/log_new.json', 'utf8')); ok('журнал читается, ключа ИИ в нём нет', !!j.ver && !/AIza|AQ\./.test(JSON.stringify(j)), 'ver ' + j.ver); }
  ok('нет «Ошибка в аппе»', !/Ошибка в аппе/.test(await txt(page, null, 3000)));
  ok('ошибок консоли нет', !logs.filter(l => /PAGEERROR/.test(l)).length, logs.filter(l => /PAGEERROR/.test(l)).join(';').slice(0, 300));
  console.log(R.join('\n')); await browser.close();
})().catch(e => { console.log(R.join('\n')); console.error('FAIL', String(e).slice(0, 500)); process.exit(1); });
