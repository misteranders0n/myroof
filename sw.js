// MyRoof offline support.
// App files: served from cache, refreshed in the background when there's signal.
// Satellite tiles: saved the first time they load, so a job's satellite view works offline afterward.
const APP = 'myroof-app-v3';
const TILES = 'myroof-tiles-v1';
const SHELL = ['./', './index.html', './deck.js', './logo.png', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './vendor/jspdf.umd.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== APP && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'server.arcgisonline.com') {           // satellite tiles: cache first
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res && (res.ok || res.type === 'opaque')) c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin === location.origin) {                       // app files: cache, then update in background
    e.respondWith(caches.open(APP).then(async c => {
      const hit = await c.match(e.request, {ignoreSearch: true});
      const net = fetch(e.request).then(res => { if (res && res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
