const { launch, shot, BASE, txt } = require('./lib');
const D = '/home/claude/audit/work/data/'; const R = [];
(async () => {
  require('fs').rmSync('/home/claude/audit/work/profiles/COF', { recursive: true, force: true });
  const { browser, page, logs } = await launch({ profile: 'COF' });
  const sleep = ms => page.waitForTimeout(ms);
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(2500);
  await page.setInputFiles('#wFile', D + 'coffee_a.csv'); await sleep(2500);
  await page.locator('#incList input[type=checkbox]').first().check(); await page.click('#incSave'); await sleep(2000);
  await page.click('#qCoachGo').catch(() => { }); await sleep(800);
  for (const c of await page.$$('.qc-chk:not([disabled])')) await c.check();
  if (await page.locator('#qFootGo').isVisible()) { await page.click('#qFootGo').catch(() => { }); await sleep(1200); }
  const pp = page.locator('#qPostpone'); if (await pp.isVisible()) { await pp.click(); await sleep(800); }
  await sleep(4500); if (await page.evaluate(() => !!document.querySelector('#kwDlg')?.open)) { await page.getByText('Пропустить, настрою позже').click(); await sleep(600); }
  const st = async tag => console.log(tag, JSON.stringify(await page.evaluate(() => ({ bankCoffee: allOps().filter(o => !isManual(o) && /CAFFEINE/.test(o.cp || '')).length, pend: Object.values(S.pending).map(p => p.date + ' ' + p.amount + ' ' + (p.bank_id ? 'связана ' + p.bank_id : p.state)), }))));
  await st('после выписки A:');
  await page.click('#tabs [data-tab="in"]'); await sleep(500);
  const enter = async (s, tag, tick) => { await page.fill('#inText', s); await page.click('#inGo'); await sleep(3000);
    const w = (await page.locator('#propList .warn-line').allInnerTexts()).join(' | '); const c = page.locator('#propList input[type=checkbox]').first(); const on = await c.isChecked();
    R.push((on && !(await page.locator('#propSave').isDisabled()) ? 'PASS ' : 'FAIL ') + tag + ' — отметка стоит, сохранить можно'); console.log(tag, '| отметка:', on ? 'стоит' : 'СНЯТА', '| кнопка:', (await page.locator('#propSave').isDisabled()) ? 'неактивна' : 'активна', '|', w || 'без подсказки');
    await shot(page, 'cof_' + tag.replace(/\W+/g, '_'));
    if (tick && !on) await c.check(); await sleep(300);
    if (await page.locator('#propSave').isDisabled()) { await page.click('#propDrop'); } else await page.click('#propSave'); await sleep(1500); };
  await enter('кофе 2,50', '1-й кофе сегодня', false); await st(' ');
  await enter('кофе 2,50', '2-й кофе сегодня', false); await st(' ');
  await page.setInputFiles('#impFile', D + 'coffee_b.csv'); await sleep(2500); console.log('импорт B:', (await txt(page, '#p-in', 500)).replace(/\n/g, ' | ').slice(0, 300)); await page.click('#impGo').catch(e => console.log('impGo нет')); await sleep(2500);
  if (await page.locator('[data-prelimall]').count()) { await page.click('[data-prelimall]'); await sleep(400); }
  await st('после выписки B (проводки до 19.11):');
  await page.click('#tabs [data-tab="in"]'); await sleep(500);
  await enter('кофе 2,50', 'кофе после выписки B', false); await st(' ');
  const n = await page.evaluate(() => ({ b: allOps().filter(o => !isManual(o) && /CAFFEINE/.test(o.cp || '')).length, p: Object.keys(S.pending).length }));
  R.push((n.b === 9 ? 'PASS ' : 'FAIL ') + 'выписка: все 9 одинаковых операций загружены'); R.push((n.p === 3 ? 'PASS ' : 'FAIL ') + 'три ручные записи сохранены'); console.log(R.join('\n'));
  console.log('ERR', logs.filter(l => /PAGEERROR/.test(l)).join(';').slice(0, 300));
  await browser.close();
})().catch(e => { console.error('FAIL', String(e).slice(0, 500)); process.exit(1); });
