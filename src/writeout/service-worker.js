/* Writeout service worker: offline-first app shell, zero dependencies! */
var WRITEOUT_CACHE = 'writeout-shell-v20260929';
var WRITEOUT_SHELL = [
  './',
  'index.html',
  'app.js?v=20260928',
  'style.css?v=20260928',
  'keydown.css?v=20260928',
  'marketplace.js?v=20260928',
  'marketplace.css?v=20260928',
  'settings.js?v=20260928',
  'settings.css?v=20260928',
  'manifest.json',
  'favicon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(WRITEOUT_CACHE).then(function (cache) {
      return cache.addAll(WRITEOUT_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== WRITEOUT_CACHE) return caches.delete(key);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Navigations: network first, shell fallback offline!
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(WRITEOUT_CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match('index.html').then(function (hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }
  // Same-origin assets: cache first, network top-up!
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          const copy = res.clone();
          caches.open(WRITEOUT_CACHE).then(function (cache) { cache.put(req, copy); });
          return res;
        });
      })
    );
  }
});
