/* Bitbook service worker: offline-first app shell, zero dependencies! */
var BITBOOK_CACHE = 'bitbook-shell-v20261132r';
var BITBOOK_SHELL = [
  './',
  'index.html',
  'app.js?v=20261132r',
  'style.css?v=20261131e',
  'keydown.css?v=20261132c',
  'marketplace.js?v=20261009',
  'marketplace.css?v=20261007',
  'settings.js?v=20261118',
  'settings.css?v=20261118',
  'block-editor.js?v=20261049',
  'bitlang.js?v=20261130',
  'programs.js?v=20261118',
  'image-resize.js?v=20261040',
  'office-shell.js?v=20261132r',
  'office-shell.css?v=20261132r',
  'bitbook-office.js?v=20261132r',
  'bitbook-office.css?v=20261132r',
  'radii-images.js?v=20261131v',
  'images-glue.js?v=20261131v',
  'drawio-plugin.js?v=20261132f',
  'radii-file.js?v=20261042',
  'radii-collab.js?v=20261120',
  'radii-collab.css?v=20261042',
  'collab-kd.js?v=20261021',
  'manifest.json',
  'latex.js?v=20261130',
  'keydown-doc.js?v=20261132c',
  'css-presets.js?v=20261005',
  'favicon.svg',
  'favicon-96.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(BITBOOK_CACHE).then(function (cache) {
      return cache.addAll(BITBOOK_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        // only this app's own old copies (the suite's offline copy and the other apps' copies stay)
        if (key !== BITBOOK_CACHE && key.indexOf('bitbook-shell-') === 0) return caches.delete(key);
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
        caches.open(BITBOOK_CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        // the exact page first (so the mobile version opens as itself), then the app's main page
        return caches.match(req, { ignoreSearch: true }).then(function (page) { return page || caches.match('index.html'); }).then(function (hit) { return hit || caches.match('./'); });
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
          caches.open(BITBOOK_CACHE).then(function (cache) { cache.put(req, copy); });
          return res;
        }).catch(function () {
          return caches.match(req, { ignoreSearch: true }).then(function (old) { return old || Response.error(); });
        });
      })
    );
  }
});
