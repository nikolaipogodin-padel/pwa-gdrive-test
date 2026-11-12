const { launch, shot, BASE, txt } = require('./lib'); const fs = require('fs');
const D = '/home/claude/audit/work/data/', DL = '/home/claude/audit/work/dl/'; const R = []; const ok = (n, c, d) => { R.push((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); };
const gem = require('./gem_stub.js'); fs.writeFileSync('/tmp/gem_mode', 'ok'); try { fs.unlinkSync('/home/claude/audit/work/gem_requests.jsonl'); } catch (e) { }
(async () => {
  const { browser, page, logs, net } = await launch({ profile: 'R1', gemini: gem });
  const sleep = ms => page.waitForTimeout(ms);
  const openData = async () => { await page.click('#tabs [data-tab="set"]'); await sleep(400); await page.evaluate(() => { document.querySelector('#saData').open = true; }); await sleep(300); };
  const home = async () => { await page.click('#tabs [data-tab="home"]'); await sleep(700); return (await txt(page, '#p-home', 1200)); };
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(2500);
  const h0 = await home(); const n0 = await page.evaluate(() => window.KOSHELEK.mem.size);
  ok('K-19 kv не виден со страницы', await page.evaluate(() => window.KOSHELEK.kv === undefined));
  await openData(); await shot(page, 's6_data');
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#sExport')]); await d.saveAs(DL + 'backup.json');
  const bk = JSON.parse(fs.readFileSync(DL + 'backup.json', 'utf8')); ok('K-04 копия — полный снимок', bk.koshelek_backup === 1 && Object.keys(bk.docs).length >= 10 && !/AIza/.test(JSON.stringify(bk)), 'документов ' + Object.keys(bk.docs).length);
  // плохие файлы
  fs.writeFileSync(DL + 'bad.json', 'не json'); fs.writeFileSync(DL + 'empty.json', JSON.stringify({ koshelek_backup: 1, docs: {} }));
  for (const [f, re] of [['bad.json', /не файл копии/], ['empty.json', /нет данных/], ['export.json', /старой версией/]]) { await page.setInputFiles('#sRestoreFile', DL + f); await sleep(500); const m = await txt(page, '#sExportMsg'); ok('K-04 отказ: ' + f, re.test(m) && await page.evaluate(() => document.querySelector('#sRestoreBox').hidden), m); }
  // правка после копии, затем восстановление
  await page.click('#tabs [data-tab="cash"]'); await sleep(400); await page.fill('#cAmt', '77'); await page.fill('#cNote', 'после копии'); await page.selectOption('#cGroup', { label: 'Продукты' }); await page.click('#cSave'); await sleep(1500);
  const h1 = await home(); ok('данные изменены после копии', h1 !== h0);
  await openData(); await page.setInputFiles('#sRestoreFile', DL + 'backup.json'); await sleep(500);
  ok('K-04 предупреждение о замене', /будут заменены/.test(await txt(page, '#sRestoreInfo'))); await shot(page, 's6_restore_confirm');
  await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => { }), page.click('#sRestoreGo')]); await sleep(3500);
  ok('K-04 после восстановления — как в момент копии', (await home()) === h0 && await page.evaluate(() => window.KOSHELEK.mem.size) >= n0);
  // ключ + удаление с галочкой
  await page.click('#kwPill'); await sleep(400); await page.fill('#kwKey', 'AIzaSyAUDIT_FAKE_KEY_0000000000000000000'); await page.getByText('Сохранить и проверить').click(); await sleep(1500); await page.locator('#kwDlg').getByText('Закрыть').click();
  await page.evaluate(() => document.querySelector('#qOpen').click()); await sleep(800); if (await page.locator('#sugGo').isVisible()) { await page.click('#sugGo'); await sleep(3000); }
  const reqs = fs.existsSync('/home/claude/audit/work/gem_requests.jsonl') ? fs.readFileSync('/home/claude/audit/work/gem_requests.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(JSON.parse(l).body)) : [];
  const js = reqs.filter(b => b.generationConfig); ok('K-24 запрос JSON без temperature', js.length > 0 && js.every(b => !('temperature' in b.generationConfig)), 'запросов JSON: ' + js.length);
  await openData(); await page.evaluate(() => { document.querySelector('#sDelBox').open = true; }); await sleep(400);
  ok('K-12 галочка ключа видна, Диска — нет (не подключён)', await page.locator('#sDelKeyL').isVisible() && !(await page.locator('#sDelDriveL').isVisible())); await shot(page, 's6_delete');
  await page.check('#sDelKey'); await page.fill('#sDelWord', 'удалить'); await page.click('#sDel'); await sleep(3500);
  ok('K-12 ключ и черновик удалены', await page.evaluate(() => !localStorage.getItem('gk') && !localStorage.getItem('koshelek.draft') && !window.KOSHELEK.hasKey()));
  ok('после удаления — первый экран', /Загрузите выписку/.test(await txt(page, '#wizard', 200)));
  // восстановление с первого экрана
  await page.setInputFiles('#wRestoreFile', DL + 'bad.json'); await sleep(500); ok('первый экран: отказ плохого файла', /не файл копии/.test(await txt(page, '#wMsg')));
  await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => { }), page.setInputFiles('#wRestoreFile', DL + 'backup.json')]); await sleep(3500);
  ok('K-04 восстановление на пустом устройстве', (await home()) === h0);
  await sleep(4000); ok('окно настройки после восстановления не всплывает', !(await page.evaluate(() => !!document.querySelector('#kwDlg')?.open)));
  // Excel локально
  await page.click('#tabs [data-tab="in"]'); await sleep(400); await page.setInputFiles('#impFile', D + 'revolut_2026-10.xlsx'); await sleep(3500);
  ok('K-20 Excel читается локальной библиотекой', /проверьте первые операции/i.test(await txt(page, '#impBox', 400)) && await page.evaluate(() => window.XLSX && window.XLSX.version) === '0.20.3' && !net.some(x => /cdnjs/.test(x.u)), 'версия ' + await page.evaluate(() => window.XLSX && window.XLSX.version));
  ok('ошибок консоли нет', !logs.filter(l => /PAGEERROR/.test(l)).length, logs.filter(l => /PAGEERROR/.test(l)).join(';').slice(0, 300));
  console.log(R.join('\n')); await browser.close();
})().catch(e => { console.log(R.join('\n')); console.error('FAIL', String(e).slice(0, 600)); process.exit(1); });
