const { launch, shot, BASE, txt } = require('./lib');
const D = '/home/claude/audit/work/data/'; const R = []; const ok = (n, c, d) => { R.push((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
(async () => {
  require('fs').rmSync('/home/claude/audit/work/profiles/DUP1', { recursive: true, force: true });
  const { browser, page, logs } = await launch({ profile: 'DUP1' });
  const sleep = ms => page.waitForTimeout(ms);
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(2500);
  await page.setInputFiles('#wFile', D + 'pend_a.csv'); await sleep(2500);
  await page.locator('#incList input[type=checkbox]').first().check(); await page.click('#incSave'); await sleep(2000);
  await page.click('#qCoachGo').catch(() => { }); await sleep(800);
  for (const c of await page.$$('.qc-chk:not([disabled])')) await c.check();
  if (await page.locator('#qFootGo').isVisible()) { await page.click('#qFootGo').catch(() => { }); await sleep(1200); }
  const pp = page.locator('#qPostpone'); if (await pp.isVisible()) { await pp.click(); await sleep(800); }
  await sleep(4500); if (await page.evaluate(() => !!document.querySelector('#kwDlg')?.open)) { await page.getByText('Пропустить, настрою позже').click(); await sleep(600); }
  await page.click('#tabs [data-tab="in"]'); await sleep(500);
  const enter = async s => { await page.fill('#inText', s); await page.click('#inGo'); await sleep(3000); };
  const warn = async () => (await page.locator('#propList .warn-line').allInnerTexts()).join(' | ');
  const iso = d => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
  await enter('аптека 9,69'); ok('первая запись — без предупреждения о повторе', !/уже/.test(await warn()), await warn());
  await page.click('#propSave'); await sleep(1500);
  // тот же день, та же сумма — прежнее поведение: отметка снята
  await enter('лекарства 9,69'); let w = await warn();
  ok('тот же день, набрано вручную: подсказка, отметка остаётся (П15.16)', /Такая запись уже внесена/.test(w) && /снимите отметку/.test(w) && await page.locator('#propList input[type=checkbox]').first().isChecked() && !(await page.locator('#propSave').isDisabled()), w);
  // другая дата (2 дня назад), другое название — новое мягкое предупреждение, отметка остаётся
  await page.fill('#pd0', iso(2)); await page.locator('#pd0').dispatchEvent('change'); await sleep(700); w = await warn();
  const chk = page.locator('#propList input[type=checkbox]').first(); if (!(await chk.isChecked())) await chk.check(); await sleep(300); await page.fill('#pd0', iso(1)); await page.locator('#pd0').dispatchEvent('change'); await sleep(700); w = await warn();
  ok('±3 дня, другое название: мягкая подсказка', /На эту сумму уже есть запись/.test(w) && /снимите отметку/.test(w), w); await shot(page, 's9_dup_weak');
  await page.fill('#pd0', iso(6)); await page.locator('#pd0').dispatchEvent('change'); await sleep(700); w = await warn();
  ok('6 дней: подсказки нет', !/уже/.test(w), w);
  // свежий разбор с датой «позавчера» — отметка должна стоять сама
  const fresh = await page.evaluate(d => { const p = { date: d, amount: 9.69, desc: 'лекарства', kind: 'card' }; const r = knownManual(p); return r && { near: r.near, weak: !!r.weak }; }, iso(2));
  ok('движок: near+weak (отметка не снимается)', fresh && fresh.near && fresh.weak, JSON.stringify(fresh));
  const other = await page.evaluate(d => knownManual({ date: d, amount: 9.70, desc: 'лекарства', kind: 'card' }), iso(2));
  ok('другая сумма: ничего', other === null);
  const nm = await page.evaluate(d => { const r = knownManual({ date: d, amount: 9.69, desc: 'аптека на углу', kind: 'card' }); return r && { near: r.near, weak: !!r.weak }; }, iso(5));
  ok('похожее название ±5 дней — прежняя «похожая запись»', nm && nm.near && !nm.weak, JSON.stringify(nm));
  ok('ошибок консоли нет', !logs.filter(l => /PAGEERROR/.test(l)).length, logs.filter(l => /PAGEERROR/.test(l)).join(';').slice(0, 300));
  console.log(R.join('\n')); await browser.close();
})().catch(e => { console.log(R.join('\n')); console.error('FAIL', String(e).slice(0, 500)); process.exit(1); });
