/* Offline cache for the Istanbul itinerary. Bump VERSION when the plan changes. */
const VERSION = 'ist-v1';
const SHELL = ['./', './index.html', './gaziantep.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VERSION + '-runtime').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isShell = url.origin === location.origin;
  // Page shell: network first so edits show up, cache as fallback when offline.
  if (isShell) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
    return;
  }
  // Fonts, Leaflet, map tiles: cache first, fill the cache as you browse, so what you've looked at works offline.
  e.respondWith(caches.open(VERSION + '-runtime').then(async (c) => {
    const hit = await c.match(req);
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
    catch (err) { return hit || Response.error(); }
  }));
});
