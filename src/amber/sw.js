/* ========================================================
   AMBER SERVICE WORKER — offline-first app shell!
   ======================================================== */
const AMBER_CACHE = 'amber-shell-v20261002-3';

const APP_SHELL = [
  './',
  './index.html',
  './slides-style.css?v=20261002-3',
  './marketplace.css?v=20261002-3',
  './slides-app.js?v=20261002-3',
  './marketplace.js?v=20261002-3',
  './manifest.json',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(AMBER_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== AMBER_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Same-origin GETs only — fonts/CDN traffic passes straight through!
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(AMBER_CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => {
        // Offline navigation fallback lands back on the deck!
        if (req.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline');
      });
    })
  );
});
