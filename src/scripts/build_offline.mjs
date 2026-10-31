// Builds sw.js, the whole suite's offline service worker (run: node scripts/build_offline.mjs)!
// It lists every page, every file those pages load (and the pictures their style sheets use),
// and all of OpenDB's data, so one online visit is enough to use the whole suite offline.
// Anything not on the list (big fonts, the music synth, libraries from CDNs) is saved the first time it is used.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'downloads', 'target', '.claude', 'rust', 'scripts', 'tasks']);
const MAX = 1.5 * 1024 * 1024; // bigger files are saved when first used, not up front

function walk(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) out.push(...walk(path.join(dir, e.name), rel + e.name + '/')); }
    else if (e.isFile()) out.push(rel + e.name);
  }
  return out;
}
const exists = (rel) => { try { const st = fs.statSync(path.join(ROOT, rel)); return st.isFile() && st.size <= MAX; } catch (e) { return false; } };

export function build() {
  const files = walk(ROOT);
  const urls = new Set(['/']);
  const add = (rel, query) => { if (exists(rel)) urls.add('/' + rel + (query || '')); };
  // a link inside a file, as a site path (with its ?v= kept, since that is what the page asks for)
  const refsIn = (fromRel, text, re) => {
    const base = path.posix.dirname(fromRel);
    let m;
    while ((m = re.exec(text))) {
      let ref = m[1].trim();
      if (!ref || /^(https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/|\$\{)/i.test(ref) || /[<>{}'"`\s]/.test(ref)) continue;
      ref = ref.split('#')[0];
      const q = ref.indexOf('?');
      const query = q === -1 ? '' : ref.slice(q);
      const p = q === -1 ? ref : ref.slice(0, q);
      if (!p) continue;
      const rel = p.startsWith('/') ? p.slice(1) : path.posix.normalize(path.posix.join(base, p));
      if (rel.startsWith('..')) continue;
      if (rel.endsWith('/')) { add(rel + 'index.html'); urls.add('/' + rel); continue; }
      add(rel, query);
      if (/\.css$/.test(rel) && exists(rel)) cssQueue.push(rel);
    }
  };
  const cssQueue = [];
  // every page, and the files it loads
  for (const f of files.filter((x) => /\.html$/.test(x))) {
    add(f);
    if (/(^|\/)index\.html$/.test(f)) urls.add('/' + f.replace(/index\.html$/, ''));
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    refsIn(f, html, /\b(?:src|href)\s*=\s*"([^"]+)"/g);
  }
  // the pictures and fonts that those style sheets use
  const seenCss = new Set();
  while (cssQueue.length) {
    const c = cssQueue.pop();
    if (seenCss.has(c)) continue;
    seenCss.add(c);
    refsIn(c, fs.readFileSync(path.join(ROOT, c), 'utf8'), /url\(\s*["']?([^"')]+)["']?\s*\)/g);
  }
  // files that scripts load on their own: OpenDB's whole database, Keydown's Unique Styles, the icons
  for (const f of files) {
    if (/^opendb\/(data|icons)\//.test(f)) add(f);
  }
  add('writeout/unique-styles.css');
  add('manifest.json');
  const list = [...urls].filter((u) => u === '/' || u.endsWith('/') || exists(decodeURIComponent(u.slice(1).split('?')[0]))).sort();
  // each file's own fingerprint, so an update only downloads the files that really changed
  const fileHash = (u) => {
    const rel = u.endsWith('/') ? u.slice(1) + 'index.html' : decodeURIComponent(u.slice(1).split('?')[0]);
    try { return crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 10); } catch (e) { return '0'; }
  };
  const core = list.map((u) => [u, fileHash(u)]);
  const version = crypto.createHash('sha1').update(JSON.stringify(core)).digest('hex').slice(0, 12);
  const sw = `/* Radii Office offline service worker (made by scripts/build_offline.mjs: do not edit by hand)!
   One online visit saves every app, so the whole suite opens with no internet.
   Pages and OpenDB's data try the network first (so they stay fresh) and fall back to the saved copy;
   versioned files (?v=) come straight from the saved copy; other files show the saved copy and refresh it
   in the background. Libraries and fonts from the CDNs are saved the first time they load. */
const VERSION = '${version}';
const CACHE = 'radii-offline-' + VERSION;
const RUNTIME = 'radii-offline-runtime';
const CORE = ${JSON.stringify(core).replace(/\],\[/g, '],\n  [')};
const CDN = /^https:\\/\\/(cdn\\.jsdelivr\\.net|unpkg\\.com|cdnjs\\.cloudflare\\.com|fonts\\.googleapis\\.com|fonts\\.gstatic\\.com|code\\.jquery\\.com|cdn\\.tailwindcss\\.com)\\//;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // files that have not changed since the last version are copied over instead of downloaded again
    const olds = (await caches.keys()).filter((k) => k.startsWith('radii-offline-') && k !== CACHE && k !== RUNTIME);
    let old = null, before = {};
    for (const k of olds) { const c = await caches.open(k); const m = await c.match('/__radii-offline-files'); if (m) { old = c; before = await m.json(); } }
    // a few at a time, and one missing file never stops the rest
    for (let i = 0; i < CORE.length; i += 12) {
      await Promise.allSettled(CORE.slice(i, i + 12).map(async ([u, h]) => {
        if (old && before[u] === h) { const hit = await old.match(u); if (hit) return cache.put(u, hit); }
        return cache.add(new Request(u, { cache: 'reload' }));
      }));
    }
    await cache.put('/__radii-offline-files', new Response(JSON.stringify(Object.fromEntries(CORE)), { headers: { 'Content-Type': 'application/json' } }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('radii-offline-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, copy)); } return res; };
// a saved copy of this page, or of the folder's index.html, or (last) the suite's home page
async function savedPage(url) {
  const tries = [url.href, url.pathname, url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname + '/', url.pathname.replace(/index\\.html$/, '')];
  for (const t of tries) { const hit = await caches.match(t, { ignoreSearch: true }); if (hit) return hit; }
  return (await caches.match('/')) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith(fetch(req).then((res) => save(req, res)).catch(() => savedPage(url)));
      return;
    }
    // OpenDB's data and other fresh-content files: network first
    if (/^\\/opendb\\/data\\//.test(url.pathname) || /\\.(json|kd|kn)$/.test(url.pathname)) {
      event.respondWith(fetch(req).then((res) => save(req, res)).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error())));
      return;
    }
    event.respondWith(caches.match(req).then((hit) => {
      if (hit && url.search.indexOf('v=') !== -1) return hit;
      const fresh = fetch(req).then((res) => save(req, res));
      if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
      // offline and never saved at this version: an older version of the same file is better than nothing
      return fresh.catch(() => caches.match(req, { ignoreSearch: true }).then((old) => old || Response.error()));
    }));
    return;
  }
  if (CDN.test(req.url)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
  }
});
`;
  fs.writeFileSync(path.join(ROOT, 'sw.js'), sw);
  return { count: list.length, version };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = build();
  console.log('Offline worker built! ' + r.count + ' files saved on the first visit (version ' + r.version + ')!');
}
