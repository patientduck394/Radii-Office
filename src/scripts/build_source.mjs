// Builds the downloadable source of the whole site (run: node scripts/build_source.mjs)!
//   downloads/radii-office-source.zip  every file (except downloads and build junk)
//   downloads/radii-office-source.kc   a Cabinet drawer: code + small images, one folder per app
//   downloads/source-info.json         sizes + file counts for the Source page
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// OpenDB's index is built from its entry files first, so the download always matches!
await import('./build_opendb.mjs').then((m) => m.build());
const OUT = path.join(ROOT, 'downloads');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'downloads', 'target', '.claude', '.idea', '.vscode']);
// (music and videos stay out too: the download has to fit the host's 25 MiB limit per file!)
const SKIP_FILES = /^(\.DS_Store|Thumbs\.db)$|\.(dmg|exe|msi|zip|kc|mp3|ogg|oga|wav|mp4|m4v|mov|mkv)$/i;
const TEXT = /\.(html?|js|mjs|ts|css|scss|json|md|txt|svg|xml|yml|yaml|toml|rs|jl|lua|py|cljs|clj|scala|d\.ts)$/i;
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', svg: 'image/svg+xml', html: 'text/html', htm: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', md: 'text/markdown', txt: 'text/plain', xml: 'application/xml', ts: 'text/typescript', scss: 'text/x-scss' };
const KC_IMAGE_MAX = 50 * 1024;
const KC_TEXT_MAX = 1.2 * 1024 * 1024; // keeps the .kc under the host limit of 25 MiB per file!

function walk(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) out.push(...walk(path.join(dir, e.name), rel + e.name + '/')); }
    else if (e.isFile() && !SKIP_FILES.test(e.name)) out.push(rel + e.name);
  }
  return out;
}

const files = walk(ROOT).sort();

// ---- ZIP (deflate) ----
function dosTime(d) { return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
const parts = [], central = [];
let offset = 0;
for (const f of files) {
  const data = fs.readFileSync(path.join(ROOT, f));
  const st = fs.statSync(path.join(ROOT, f));
  const comp = zlib.deflateRawSync(data, { level: 9 });
  const useComp = comp.length < data.length;
  const body = useComp ? comp : data;
  const name = Buffer.from('radii-office/' + f);
  const crc = zlib.crc32(data) >>> 0;
  const { t, d } = dosTime(st.mtime);
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(useComp ? 8 : 0, 8); h.writeUInt16LE(t, 10); h.writeUInt16LE(d, 12);
  h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
  parts.push(h, name, body);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(useComp ? 8 : 0, 10); c.writeUInt16LE(t, 12); c.writeUInt16LE(d, 14);
  c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
  central.push(c, name);
  offset += h.length + name.length + body.length;
}
const csize = central.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(csize, 12); end.writeUInt32LE(offset, 16);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'radii-office-source.zip'), Buffer.concat([...parts, ...central, end]));

// ---- KC (Cabinet drawer, same YAML subset Cabinet writes and reads) ----
function yq(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r') + '"'; }
const tree = { files: [], folders: new Map() };
let kcCount = 0;
for (const f of files) {
  const ext = path.extname(f).slice(1).toLowerCase();
  const size = fs.statSync(path.join(ROOT, f)).size;
  const isText = TEXT.test(f);
  if (!isText && !(MIME[ext] && size <= KC_IMAGE_MAX)) continue;
  if (isText && size > KC_TEXT_MAX) continue;
  const segs = f.split('/');
  let node = tree;
  for (const s of segs.slice(0, -1)) {
    if (!node.folders.has(s)) node.folders.set(s, { files: [], folders: new Map() });
    node = node.folders.get(s);
  }
  node.files.push({ f, name: segs[segs.length - 1], ext, size });
  kcCount++;
}
const lines = ['---', 'app: "Radii Cabinet"', 'format: "kc"', 'version: 1', 'name: ' + yq('Radii Office Source'), 'exported_at: "' + new Date().toISOString() + '"', '---', ''];
let n = 0;
function emitFiles(list, indent) {
  const pad = ' '.repeat(indent);
  if (!list.length) { lines.push(pad + 'files: []'); return; }
  lines.push(pad + 'files:');
  for (const e of list) {
    const buf = fs.readFileSync(path.join(ROOT, e.f));
    const mime = MIME[e.ext] || 'text/plain';
    const data = 'data:' + mime + ';base64,' + buf.toString('base64');
    lines.push(pad + '  - id: ' + yq('src' + (++n)), pad + '    name: ' + yq(e.name), pad + '    type: ' + yq(mime), pad + '    size: ' + e.size, pad + '    tags: [' + yq(e.ext || 'file') + ']', pad + '    data: |-', pad + '      ' + data);
  }
}
function emitFolders(map, indent) {
  const pad = ' '.repeat(indent);
  if (!map.size) { lines.push(pad + 'folders: []'); return; }
  lines.push(pad + 'folders:');
  for (const [name, node] of [...map.entries()].sort()) {
    lines.push(pad + '  - id: ' + yq('srcdir' + (++n)), pad + '    name: ' + yq(name), pad + '    kind: folder', pad + '    tags: []');
    emitFiles(node.files, indent + 4);
    emitFolders(node.folders, indent + 4);
  }
}
emitFiles(tree.files, 0);
emitFolders(tree.folders, 0);
fs.writeFileSync(path.join(OUT, 'radii-office-source.kc'), lines.join('\n') + '\n');

const info = { built: new Date().toISOString(), zipFiles: files.length, zipBytes: fs.statSync(path.join(OUT, 'radii-office-source.zip')).size, kcFiles: kcCount, kcBytes: fs.statSync(path.join(OUT, 'radii-office-source.kc')).size };
fs.writeFileSync(path.join(OUT, 'source-info.json'), JSON.stringify(info, null, 1) + '\n');
console.log(info);
