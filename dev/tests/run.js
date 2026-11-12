// node run.js <profile> '<js body using page, shot, txt, D, sleep, net, logs>' [viewport WxH]
const { launch, shot, BASE, txt } = require('./lib');
const D = '/home/claude/audit/work/data/';
(async () => {
  const [, , profile, body, vp] = process.argv;
  const o = { profile }; if (vp) { const [w, h] = vp.split('x').map(Number); o.ctx = { viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700, deviceScaleFactor: w < 700 ? 2 : 1 }; if (w >= 700) o.ctx.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'; }
  if (process.env.GEM) o.gemini = require(process.env.GEM);
  const { browser, ctx, page, net, logs } = await launch(o);
  const sleep = ms => page.waitForTimeout(ms);
  if (!process.env.NOGOTO) { await page.goto(BASE, { waitUntil: 'load' }); await sleep(2500); }
  try { await (new Function('page', 'shot', 'txt', 'D', 'sleep', 'net', 'logs', 'ctx', 'BASE', 'return (async()=>{' + body + '})()'))(page, (n, f) => shot(page, n, f), (s, n) => txt(page, s, n), D, sleep, net, logs, ctx, BASE); }
  catch (e) { console.log('SCRIPT ERROR:', String(e.message || e).slice(0, 600)); await shot(page, 'zz_error'); }
  if (logs.length) console.log('LOGS:\n' + logs.slice(0, 20).join('\n'));
  const ext = net.filter(x => !/fonts|xlsx/.test(x.u)); if (ext.length) console.log('NET:\n' + ext.map(x => x.m + ' ' + x.u.slice(0, 110)).join('\n'));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
