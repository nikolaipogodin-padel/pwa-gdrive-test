// Общая обвязка тестов аудита: локальная копия сайта, заглушки внешних сервисов, вымышленные данные.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const W = '/home/claude/audit/work';
const BASE = 'http://localhost:8765/koshelek/';
async function launch(opts = {}) {
  const copts0 = {};
  let browser, ctx;
  const mk = async (o) => { if (opts.profile) { ctx = await chromium.launchPersistentContext('/home/claude/audit/work/profiles/' + opts.profile, Object.assign({ headless: true }, o)); browser = { close: () => ctx.close() }; } else { browser = await chromium.launch({ headless: true }); ctx = await browser.newContext(o); } };
  await mk(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Riga',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' }, opts.ctx || {}));
  const net = [];
  await ctx.route(/^https?:\/\/(?!localhost)/, async route => {
    const u = route.request().url();
    net.push({ u, m: route.request().method(), body: route.request().postData() });
    if (u.includes('fonts.googleapis.com')) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(W + '/onest.css', 'utf8').replace(/https:\/\/fonts\.gstatic\.com\/s\/onest\/v11\//g, 'https://fonts.gstatic.com/x/') });
    if (u.includes('fonts.gstatic.com')) { const f = W + '/fonts/' + path.basename(u); return fs.existsSync(f) ? route.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(f) }) : route.abort(); }
    if (u.includes('xlsx.full.min.js')) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(W + '/xlsx.full.min.js') });
    if (u.includes('generativelanguage.googleapis.com')) { if (opts.gemini) return opts.gemini(route, net[net.length - 1]); return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { message: 'API key not valid (audit stub)' } }) }); }
    return route.abort();
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => logs.push('PAGEERROR: ' + String(e.message).slice(0, 400)));
  page.on('dialog', d => { logs.push('DIALOG ' + d.type() + ': ' + d.message().slice(0, 200)); d.dismiss().catch(() => {}); });
  return { browser, ctx, page, net, logs };
}
const shot = (page, name, full) => page.screenshot({ path: '/home/claude/audit/shots/' + name + '.png', fullPage: !!full });
module.exports = { launch, shot, BASE, W };

const txt = async (page, sel, n) => (await page.evaluate(([s, n]) => { const e = s ? document.querySelector(s) : document.body; if (!e) return 'NO ' + s; const vis = x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; return e.innerText.slice(0, n || 3000); }, [sel, n])).replace(/\n{2,}/g, '\n');
module.exports.txt = txt;
