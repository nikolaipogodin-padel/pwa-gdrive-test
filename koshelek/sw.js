const CACHE = "koshelek-v2";
const SHELL = ["./", "./index.html", "./config.js", "./platform.js", "./manifest.webmanifest", "./icon-192.png?v=1", "./icon-512.png?v=1"];
const EXT = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//;
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => fetch(new Request(u, { cache: "reload" })).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("koshelek") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith(fetch(r, { cache: "no-cache" }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: false }).then(m => m || caches.match("./index.html"))));
  } else if (EXT.test(r.url)) {
    e.respondWith(caches.open(CACHE).then(async c => { const m = await c.match(r); const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => m); return m || net; }));
  }
});
