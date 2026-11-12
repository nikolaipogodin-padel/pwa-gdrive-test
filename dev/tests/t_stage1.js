const { launch, shot, BASE, txt } = require('./lib');
const D = '/home/claude/audit/work/data/'; const R = []; const ok = (n, c, d) => { R.push((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
(async () => {
  const { browser, ctx, page, logs } = await launch({ profile: 'N1' });
  const sleep = ms => page.waitForTimeout(ms);
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(2500);
  const cdp = await ctx.newCDPSession(page); const m = await cdp.send('Page.getAppManifest');
  ok('K-01 манифест найден', /manifest\.webmanifest$/.test(m.url) && !m.errors.length, m.url);
  ok('K-01 lang', await page.evaluate(() => document.documentElement.lang) === 'ru');
  if (await page.evaluate(() => !!document.querySelector('#kwDlg')?.open)) { await page.getByText('Пропустить, настрою позже').click(); await sleep(800); }
  await page.evaluate(() => { document.querySelector('#wSet').open = true; });
  ok('K-09 текст', /по вашему ключу Gemini/.test(await txt(page, '#wSet')));
  await page.setInputFiles('#wFile', D + 'sw_main_2026-05_2026-10.csv'); await sleep(2500);
  await page.click('#incSave'); await sleep(2000);
  await page.reload({ waitUntil: 'load' }); await sleep(2500);
  ok('K-06 коуч после перезапуска', await page.evaluate(() => !document.querySelector('#qCoach').hidden));
  await page.click('#qCoachGo'); await sleep(800);
  ok('K-06 открыт Разбор', await page.evaluate(() => !document.querySelector('#p-q').hidden));
  for (const c of await page.$$('.qc-chk:not([disabled])')) await c.check();
  await page.click('#qFootGo'); await sleep(1200); const pp = page.locator('#qPostpone'); if (await pp.isVisible()) { await pp.click(); await sleep(1200); }
  await sleep(4500); if (await page.evaluate(() => !!document.querySelector('#kwDlg')?.open)) { await page.getByText('Пропустить, настрою позже').click(); await sleep(600); }
  await page.click('#tabs [data-tab="home"]'); await sleep(600);
  const ov = await page.evaluate(() => { const a = document.querySelector('#qOpen').getBoundingClientRect(), p = document.querySelector('#kwPill').getBoundingClientRect(); const ox = Math.max(0, Math.min(a.right, p.right) - Math.max(a.left, p.left)), oy = Math.max(0, Math.min(a.bottom, p.bottom) - Math.max(a.top, p.top)); const t = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2); return { ox, oy, top: t.id || t.parentElement.id, w: p.width, vis: a.width > 0, lab: document.querySelector('#kwPill').getAttribute('aria-label') }; });
  ok('K-02 «Разбор» не перекрыт', ov.ox * ov.oy === 0 && ov.top === 'qOpen', JSON.stringify(ov));
  await shot(page, 's1_home');
  // K-03
  await page.click('#tabs [data-tab="ops"]'); await sleep(500); await page.selectOption('#fMonth', ''); await page.fill('#fText', 'procentu'); await sleep(900);
  const t3 = await txt(page, '#opsList', 600); ok('K-03 проценты не «Свои счета»', /41,15/.test(t3) && !/Свои счета/.test(t3), t3.replace(/\n/g, ' | ').slice(0, 160));
  await page.fill('#fText', '');
  // K-07
  await page.click('#tabs [data-tab="in"]'); await sleep(500);
  await page.setInputFiles('#impFile', D + 'sw_main_2026-10-15_2026-11-10.csv'); await sleep(2000); await page.click('#impGo'); await sleep(1500);
  const t7 = await txt(page, '#impBox', 300); ok('K-07 итог импорта', /Добавлено: 9 новых операций/.test(t7), t7.replace(/\n/g, ' '));
  await shot(page, 's1_import_done');
  const rej = async f => { await page.setInputFiles('#impFile', D + f); let l = ''; for (let i = 0; i < 12; i++) { await sleep(500); const b = await txt(page, '#impBox', 500); if (b === l && b && !/Читаю/.test(b)) break; l = b; } const c = page.locator('#impCancel'); if (await c.count() && await c.isVisible()) await c.click(); await sleep(300); return l.replace(/\n/g, ' | '); };
  let t = await rej('e_nobal.csv'); ok('K-23 без остатков', /^Выписка неполная/.test(t), t.slice(0, 120));
  t = await rej('e_wrongbal.csv'); ok('K-23 не сходится', /^Суммы в файле не сходятся/.test(t), t.slice(0, 120));
  t = await rej('e_comma_delim.csv'); ok('K-23 повреждён', /^Файл повреждён/.test(t), t.slice(0, 120));
  t = await rej('e_garbage.csv'); ok('K-10 без Claude', !/Claude|владельцу|в этом просмотре/.test(t) && /Не удалось распознать/.test(t), t.slice(0, 260));
  t = await rej('sw_main_2026-05_2026-10.csv'); ok('дубли по-прежнему отсекаются', /Новых \| 0/.test(t), t.slice(0, 140));
  // K-13
  await page.click('#tabs [data-tab="cash"]'); await sleep(400);
  const cash = async (a, n) => { await page.fill('#cAmt', a); await page.fill('#cNote', n); await page.click('#cSave'); await sleep(1000); return (await txt(page, '#cMsg', 200)).trim(); };
  t = await cash('0', 'рынок'); ok('K-13 сумма 0', t === 'Укажите сумму больше нуля.', t);
  t = await cash('-5', 'рынок'); ok('K-13 сумма −5', t === 'Укажите сумму больше нуля.', t);
  await page.selectOption('#cGroup', { label: 'Продукты' }); t = await cash('12,5', 'рынок'); ok('наличные 12,5 сохраняются', /Добавлено/.test(t), t);
  // K-11, K-16
  await page.click('#tabs [data-tab="set"]'); await sleep(400); await page.evaluate(() => document.querySelectorAll('#p-set details').forEach(d => d.open = true)); await sleep(400);
  await page.click('#aiTest'); await sleep(2500); t = await txt(page, '#aiTestOut'); ok('K-11 понятный текст', /ИИ не подключён|Ключ Gemini не принят/.test(t) && !/Claude/.test(t), t);
  ok('K-16 ссылки в «О программе»', await page.locator('#saAbout a[href="../privacy.html"]').count() === 1);
  await page.click('#kwPill'); await sleep(500); ok('K-16 ссылки в «Подключениях»', await page.locator('#kwDlg a[href="../privacy.html"]').count() === 1); await shot(page, 's1_conn');
  ok('метка сборки', /П15\.8/.test(await page.evaluate(() => window.KOSHELEK.build)), await page.evaluate(() => window.KOSHELEK.build));
  ok('плашка «разные версии» не показана', await page.evaluate(() => { const e = document.querySelector('#kwStale'); return !e || e.hidden || getComputedStyle(e).display === 'none'; }));
  for (const u of ['../privacy.html', '../about.html', '../']) { const r = await page.request.get(new URL(u, BASE).href); ok('страница ' + u, r.status() === 200); }
  await ctx.setOffline(true); let off = true; try { await page.reload({ waitUntil: 'load', timeout: 15000 }); } catch (e) { off = false; } await sleep(2000);
  ok('офлайн-запуск', off && /Кошелёк/.test(await txt(page, null, 200)));
  ok('ошибок консоли нет', !logs.filter(l => /PAGEERROR/.test(l)).length, logs.filter(l => /PAGEERROR/.test(l)).join(' ; ').slice(0, 300));
  console.log(R.join('\n')); console.log(R.filter(x => x.startsWith('FAIL')).length ? 'HAS FAILURES' : 'ALL PASS ' + R.length);
  await browser.close();
})().catch(e => { console.log(R.join('\n')); console.error('FAIL', String(e).slice(0, 500)); process.exit(1); });
