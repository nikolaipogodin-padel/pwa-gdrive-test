const { launch, shot, BASE, txt } = require('./lib');
const D = '/home/claude/audit/work/data/'; const R = []; const ok = (n, c, d) => { R.push((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
(async () => {
  const { browser, page, logs } = await launch({ profile: 'L1' });
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
  // аптека внесена дважды (повтор), «кино 33» — нет в выписке, «кофе 15,00» — в выписке есть близкая сумма 15,55
  await page.fill('#inText', 'аптека 9,69; аптека повтор 9,69; кино 33; кофе 15'); await page.click('#inGo'); await sleep(3000);
  for (const c of await page.$$('#propBox input[type=checkbox]')) await c.check().catch(() => { });
  await page.click('#propSave'); await sleep(2000);
  await page.setInputFiles('#impFile', D + 'pend_b.csv'); await sleep(2500); await page.click('#impGo'); await sleep(2500);
  if (await page.locator('[data-prelimall]').count()) { await page.click('[data-prelimall]'); await sleep(400); }
  const waiting = () => page.evaluate(() => Object.values(S.pending).filter(p => !p.bank_id).map(p => p.desc).join(' ; '));
  console.log('ждут:', await waiting());
  // кнопка «Связать» в списке появляется только у «застоявшихся» записей — диалог открываем той же функцией напрямую
  const open = async re => { await page.evaluate(src => { const id = Object.keys(S.pending).find(k => new RegExp(src, 'i').test(S.pending[k].desc) && !S.pending[k].bank_id); openLink(id); }, re.source); await sleep(600); return (await txt(page, '#dlgLink', 700)).replace(/\n/g, ' | '); };
  let t = await open(/аптека/i); ok('повтор: объяснение и кнопка «Удалить повтор»', /уже связана с вашей записью/.test(t) && await page.locator('#lkDup').isVisible() && !/NESTE|MAXIMA/.test(t), t.slice(0, 330)); await shot(page, 's8_link_dup');
  await page.click('#lkDup'); await sleep(1800);
  ok('повтор удалён, первая запись осталась связанной', !/аптека/i.test(await waiting()) && await page.evaluate(() => Object.values(S.pending).filter(p => /аптека/.test(p.desc) && p.bank_id).length) === 1, await waiting());
  t = await open(/кино/i); ok('нет суммы в выписке: кандидатов нет', /в выписке пока нет/.test(t) && !(await page.locator('#lkList input').count()), t.slice(0, 200)); await page.click('#lkCancel'); await sleep(300);
  t = await open(/кофе/i); ok('близкая сумма — отдельным списком с пометкой', /Близкие по сумме/.test(t) && /MAXIMA/.test(t) && !/NESTE/.test(t), t.slice(0, 260)); await shot(page, 's8_link_near');
  await page.locator('#lkList input').first().check(); await page.click('#lkSave'); await sleep(1800);
  ok('ручная связь работает', !/кофе/i.test(await waiting()), await waiting());
  ok('ошибок консоли нет', !logs.filter(l => /PAGEERROR/.test(l)).length, logs.filter(l => /PAGEERROR/.test(l)).join(';').slice(0, 300));
  console.log(R.join('\n')); await browser.close();
})().catch(e => { console.log(R.join('\n')); console.error('FAIL', String(e).slice(0, 500)); process.exit(1); });
