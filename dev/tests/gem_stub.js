// Заглушка Gemini: пишет тела запросов в файл, отвечает правдоподобно. Режим ошибок — через файл /tmp/gem_mode.
const fs = require('fs'); const OUT = '/home/claude/audit/work/gem_requests.jsonl';
module.exports = async (route, rec) => {
  let mode = 'ok'; try { mode = fs.readFileSync('/tmp/gem_mode', 'utf8').trim(); } catch (e) { }
  const h = route.request().headers();
  fs.appendFileSync(OUT, JSON.stringify({ t: Date.now(), url: rec.u, key_in_url: /key=/.test(rec.u), key_hdr: h['x-goog-api-key'] ? 'present' : 'none', mode, body: rec.body }) + '\n');
  if (mode === '429') return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Quota exceeded for quota metric (audit stub)' } }) });
  if (mode === '503') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'The model is overloaded (audit stub)' } }) });
  if (mode === 'badkey') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.' } }) });
  if (mode === 'net') return route.abort('internetdisconnected');
  if (mode === 'garbage') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Извините, не могу помочь <b>с этим</b>' }] } }] }) });
  let text = 'ок'; const b = rec.body || '';
  if (/раскладываешь банковские операции/.test(b)) text = '[]';
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }) });
};
