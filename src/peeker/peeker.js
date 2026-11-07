// Peeker! A PDF editor that runs fully in the browser!
// pdf.js draws the pages, pdf-lib writes the edited PDF, and IndexedDB keeps your documents!
// Marks (text, highlights, ink, boxes, whiteout, pictures, signatures) live in each page's
// own unrotated frame (points, top-left origin), so rotating a page carries its marks along!

(function () {
'use strict';
// Each library has a backup CDN, so one blocked or slow CDN never stops Peeker!
// pdf.js 5.7 draws every gradient type (older versions painted some in hot pink!). Browsers without
// its newest JavaScript features (older Safari) get its "legacy" build, which brings polyfills!
const PDFJS_FLAVOR = typeof Map.prototype.getOrInsertComputed === 'function' ? 'build/' : 'legacy/build/';
const PDFJS_CDNS = [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/' + PDFJS_FLAVOR,
    'https://unpkg.com/pdfjs-dist@5.7.284/' + PDFJS_FLAVOR,
];
// html-to-image turns Keydown-formatted text into a picture when you save (the browser itself draws it,
// so every chip, gradient and highlight looks exactly as on screen)!
const H2I_URLS = [
    'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',
    'https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js',
];
const PDFLIB_URLS = [
    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
];

const $ = (id) => document.getElementById(id);
// Bitbook's Annotate inks (bitbook/annotate-ink.js), when they loaded
const AI = window.AnnotateInk && window.AnnotateInk.strokeSvg ? window.AnnotateInk : null;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- Libraries (loaded on demand from the CDN) ---------- */
class EngineError extends Error {}
let pdfjs = null;
let pdfjsP = null;
function loadPdfjs() {
    if (pdfjs) return Promise.resolve(pdfjs);
    if (!pdfjsP) {
        pdfjsP = (async () => {
            let last = null;
            for (const base of PDFJS_CDNS) {
                try {
                    const m = await import(base + 'pdf.min.mjs');
                    m.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
                    pdfjs = m;
                    return m;
                } catch (e) { last = e; console.warn('pdf.js CDN failed:', base, e); }
            }
            pdfjsP = null;
            throw new EngineError('Peeker could not download its PDF reader (pdf.js)! Check your internet connection or ad blocker! (' + (last && last.message) + ')');
        })();
    }
    return pdfjsP;
}
let pdfLibP = null;
function loadScript(src) {
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => res();
        s.onerror = () => { s.remove(); rej(new Error(src)); };
        document.head.appendChild(s);
    });
}
function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!pdfLibP) {
        pdfLibP = (async () => {
            for (const src of PDFLIB_URLS) {
                try { await loadScript(src); if (window.PDFLib) return window.PDFLib; } catch (e) { console.warn('pdf-lib CDN failed:', src); }
            }
            pdfLibP = null;
            throw new EngineError('Peeker could not download its PDF writer (pdf-lib)! Check your internet connection or ad blocker!');
        })();
    }
    return pdfLibP;
}
// Turns any failure into a sentence a person can act on!
function why(e) {
    if (e instanceof EngineError) return e.message;
    const n = e && e.name, m = String((e && e.message) || e || 'unknown problem');
    if (n === 'PasswordException') return 'it is locked with a password!';
    if (n === 'InvalidPDFException' || /Invalid PDF/i.test(m)) return 'the file is damaged or not really a PDF!';
    if (/not a pdf/.test(m)) return 'that file is not a PDF!';
    if (/quota/i.test(m)) return 'the browser storage is full! Delete some documents in Peeker!';
    return m.replace(/[.!]*$/, '!');
}

/* ---------- Storage: meta (the list), docs (pages + marks), blobs (the PDF bytes, written once) ---------- */
let dbp = null;
const mem = { meta: new Map(), docs: new Map(), blobs: new Map() }; // used when IndexedDB is unavailable
function openDb() {
    if (!dbp) {
        dbp = new Promise((res, rej) => {
            try {
                const r = indexedDB.open('peeker', 1);
                r.onupgradeneeded = () => ['meta', 'docs', 'blobs'].forEach((n) => r.result.createObjectStore(n));
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            } catch (e) { rej(e); }
        });
    }
    return dbp;
}
function done(t) { return new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); }
function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
const db = {
    async list() {
        try { const d = await openDb(); return await req(d.transaction('meta').objectStore('meta').getAll()); }
        catch (e) { return [...mem.meta.values()]; }
    },
    async get(store, key) {
        try { const d = await openDb(); return await req(d.transaction(store).objectStore(store).get(key)); }
        catch (e) { return mem[store].get(key); }
    },
    async putDoc(doc) {
        const meta = { id: doc.id, name: doc.name, pages: doc.pages.length, updated: doc.updated };
        try {
            const d = await openDb();
            const t = d.transaction(['meta', 'docs'], 'readwrite');
            t.objectStore('docs').put(doc, doc.id);
            t.objectStore('meta').put(meta, doc.id);
            await done(t);
        } catch (e) { mem.docs.set(doc.id, doc); mem.meta.set(doc.id, meta); }
    },
    async putBlob(key, bytes) {
        try { const d = await openDb(); const t = d.transaction('blobs', 'readwrite'); t.objectStore('blobs').put(bytes, key); await done(t); }
        catch (e) { mem.blobs.set(key, bytes); }
    },
    async remove(doc) {
        try {
            const d = await openDb();
            const t = d.transaction(['meta', 'docs', 'blobs'], 'readwrite');
            t.objectStore('meta').delete(doc.id);
            t.objectStore('docs').delete(doc.id);
            (doc.sids || []).forEach((sid) => t.objectStore('blobs').delete(doc.id + ':' + sid));
            await done(t);
        } catch (e) { mem.meta.delete(doc.id); mem.docs.delete(doc.id); }
    },
};

/* ---------- State ---------- */
let cur = null;           // { id, name, sids, pages: [{sid, index, w, h, rot, annots}], forms: {sid: {field: value}}, updated }
let bytes = {};           // sid -> Uint8Array for the open document
const pdfDocs = new Map(); // sid -> pdf.js document promise
let zoom = 1;
let fitMode = true;
let tool = 'select';
let selId = null;         // selected mark id
let curPage = 0;
let picked = new Set();   // thumbnails picked with Ctrl/Shift
let undoStack = [];
let redoStack = [];
const COLORS = ['#111111', '#ff7a00', '#e5371c', '#1d6fe0', '#14a44d', '#ffd400', '#c2185b', '#ffffff'];
const style = {
    text: { color: '#111111', size: 16, font: 'sans', bold: false, italic: false, underline: false, strike: false },
    hl: { color: '#ffd400', size: 0 },
    ink: { color: '#ff7a00', size: 3, kind: 'plain', ic: 'blue' }, // kind: 'plain', or one of Bitbook's Annotate inks (ic: its color)
    box: { color: '#e5371c', size: 2 },
};

// Text fonts: what the page shows, and the PDF's own standard font for plain, bold, italic and bold italic
const FONTS = {
    sans: { css: 'Helvetica, Arial, sans-serif', pdf: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'] },
    serif: { css: "'Times New Roman', Times, serif", pdf: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'] },
    mono: { css: "'Courier New', Courier, monospace", pdf: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique'] },
};
const FMT = ['bold', 'italic', 'underline', 'strike'];
// A text mark's look (z = zoom)
function textCss(a, z) {
    const deco = [a.underline ? 'underline' : '', a.strike ? 'line-through' : ''].filter(Boolean).join(' ');
    return `font-size:${a.size * z}px;color:${esc(a.color)};font-family:${(FONTS[a.font] || FONTS.sans).css};font-weight:${a.bold ? 700 : 400};font-style:${a.italic ? 'italic' : 'normal'};text-decoration:${deco || 'none'};`;
}
// Keydown in text marks: chips, highlights, the Gel Series, Unique Styles and the rest, drawn by keydown.js!
const kdHtml = (t) => (typeof window.kdRender === 'function' ? window.kdRender(t) : esc(t));
const hasKeydown = (t) => typeof window.kdRender === 'function' && window.kdRender(t) !== (typeof window.kdEscapeHtml === 'function' ? window.kdEscapeHtml(t) : esc(t));

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
}

/* ---------- Opening PDFs ---------- */
async function getPdf(sid) {
    if (!pdfDocs.has(sid)) {
        const p = loadPdfjs().then((lib) => {
            const task = lib.getDocument({ data: bytes[sid].slice() });
            task.onPassword = (give, reason) => {
                const pw = prompt(reason === 2 ? 'Wrong password! Try again!' : 'This PDF is locked! Enter its password!');
                if (pw === null) task.destroy(); else give(pw);
            };
            return task.promise;
        });
        p.catch(() => pdfDocs.delete(sid));
        pdfDocs.set(sid, p);
    }
    return pdfDocs.get(sid);
}
// Reads a PDF file into a new source, returning its page list!
async function addSource(file, docId) {
    const data = new Uint8Array(await file.arrayBuffer());
    if (String.fromCharCode(...data.slice(0, 5)) !== '%PDF-' && !/\.pdf$/i.test(file.name)) throw new Error('not a pdf');
    const sid = 's' + uid();
    bytes[sid] = data;
    const doc = await getPdf(sid);
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i);
        const vp = pg.getViewport({ scale: 1, rotation: 0 });
        pages.push({ sid, index: i - 1, w: vp.width, h: vp.height, rot: ((pg.rotate || 0) % 360 + 360) % 360, annots: [] });
    }
    await db.putBlob(docId + ':' + sid, data);
    return { sid, pages };
}
async function openFiles(files) {
    const list = [...files].filter((f) => f && (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)));
    if (!list.length) { toast('That is not a PDF!'); return; }
    for (const f of list) {
        const id = 'd' + uid();
        const prevBytes = bytes;
        bytes = {};
        try {
            toast('Opening ' + f.name + '!');
            const { sid, pages } = await addSource(f, id);
            const doc = { id, name: f.name.replace(/\.pdf$/i, ''), sids: [sid], pages, forms: {}, updated: Date.now() };
            await db.putDoc(doc);
            await showDoc(doc, bytes);
            toast('Opened ' + f.name + ' (' + pages.length + ' page' + (pages.length === 1 ? '' : 's') + ')!');
        } catch (e) {
            console.error(e);
            bytes = prevBytes;
            toast(e instanceof EngineError ? e.message : 'Could not open ' + f.name + ': ' + why(e), 9000);
        }
    }
    renderDocList();
}
async function newBlank() {
    const doc = { id: 'd' + uid(), name: 'Untitled', sids: [], pages: [{ sid: 'blank', index: 0, w: 612, h: 792, rot: 0, annots: [] }], forms: {}, updated: Date.now() };
    await db.putDoc(doc);
    await showDoc(doc, {});
    renderDocList();
    toast('A fresh blank PDF!');
}
async function mergeFile(file) {
    if (!cur) { openFiles([file]); return; }
    try {
        const { sid, pages } = await addSource(file, cur.id);
        pushUndo();
        cur.sids.push(sid);
        cur.pages.push(...pages);
        rebuild();
        save();
        scrollToPage(cur.pages.length - pages.length);
        toast('Added ' + pages.length + ' page' + (pages.length === 1 ? '' : 's') + ' from ' + file.name + '!');
    } catch (e) { console.error(e); toast('Could not add ' + file.name + ': ' + why(e), 9000); }
}

async function openDoc(id) {
    if (cur && cur.id === id) return;
    const doc = await db.get('docs', id);
    if (!doc) { toast('That document is gone!'); renderDocList(); return; }
    const b = {};
    for (const sid of doc.sids) b[sid] = await db.get('blobs', id + ':' + sid);
    if (doc.sids.some((s) => !b[s])) { toast('Some pages of this document are missing!'); }
    await showDoc(doc, b);
    renderDocList();
}
async function showDoc(doc, b) {
    for (const p of pdfDocs.values()) p.then((d) => d.destroy()).catch(() => {});
    pdfDocs.clear();
    textCache.clear();
    cur = doc;
    bytes = b;
    undoStack = []; redoStack = [];
    selId = null; curPage = 0; picked = new Set(); fitMode = true;
    try { localStorage.setItem('peeker_last', doc.id); } catch (e) {}
    closePanel();
    rebuild();
}
async function deleteDoc(id) {
    const meta = (await db.list()).find((m) => m.id === id);
    if (!meta || !confirm('Delete "' + meta.name + '" from Peeker? (Your original file on disk stays!)')) return;
    const doc = await db.get('docs', id);
    await db.remove(doc || { id, sids: [] });
    if (cur && cur.id === id) { cur = null; bytes = {}; rebuild(); }
    renderDocList();
    toast('Deleted!');
}

let saveTimer = null;
function save() {
    if (!cur) return;
    cur.updated = Date.now();
    clearTimeout(saveTimer);
    const doc = cur;
    saveTimer = setTimeout(() => { db.putDoc(doc).then(renderDocList); }, 400);
    updateInfo();
}

/* ---------- Sidebar ---------- */
const DOC_ICON = '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4"/></svg>';
async function renderDocList() {
    const list = (await db.list()).sort((a, b) => b.updated - a.updated);
    const box = $('doc-list');
    if (!list.length) { box.innerHTML = '<div class="doc-empty">No documents yet! Open a PDF!</div>'; return; }
    box.innerHTML = list.map((m) => `<div class="doc-item${cur && cur.id === m.id ? ' active' : ''}" data-id="${esc(m.id)}">` +
        `<button class="doc-pick" title="${esc(m.name)}">${DOC_ICON}<span class="doc-name">${esc(m.name)}</span><span class="doc-count">${m.pages}</span></button>` +
        `<button class="doc-del" title="Delete from Peeker">✖</button></div>`).join('');
}
function updateInfo() {
    const name = $('doc-name');
    name.disabled = !cur;
    if (document.activeElement !== name) name.value = cur ? cur.name : '';
    const n = cur ? cur.pages.length : 0;
    const marks = cur ? cur.pages.reduce((s, p) => s + p.annots.length, 0) : 0;
    $('doc-info').textContent = cur ? n + ' page' + (n === 1 ? '' : 's') + ' · ' + marks + ' mark' + (marks === 1 ? '' : 's') + '!' : 'Nothing open yet!';
    $('page-info').textContent = 'Page ' + (n ? curPage + 1 : 0) + ' of ' + n + (picked.size > 1 ? ' · ' + picked.size + ' picked' : '');
    ['save-btn', 'extract-btn', 'forms-btn', 'find-btn', 'merge-btn'].forEach((b) => { $(b).disabled = !cur; });
    $('undo-btn').disabled = !undoStack.length;
    $('redo-btn').disabled = !redoStack.length;
    $('del-mark-btn').disabled = !selId;
    document.body.classList.toggle('no-doc', !cur);
}

/* ---------- Undo ---------- */
function snap() { return JSON.stringify({ pages: cur.pages, forms: cur.forms }); }
function pushUndo() {
    if (!cur) return;
    undoStack.push(snap());
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
}
function restore(s) {
    const o = JSON.parse(s);
    cur.pages = o.pages;
    cur.forms = o.forms || {};
    selId = null;
    curPage = Math.min(curPage, cur.pages.length - 1);
    rebuild();
    save();
}
function undo() { if (!cur || !undoStack.length) return; redoStack.push(snap()); restore(undoStack.pop()); toast('Undone!'); }
function redo() { if (!cur || !redoStack.length) return; undoStack.push(snap()); restore(redoStack.pop()); toast('Redone!'); }

/* ---------- Layout + rendering ---------- */
const viewer = $('viewer');
const pagesEl = $('pages');
const thumbsEl = $('thumbs');
let io = null;
let buildToken = 0;

function dims(pg) { return pg.rot % 180 ? [pg.h, pg.w] : [pg.w, pg.h]; }
function fitZoom() {
    if (!cur || !cur.pages.length) return 1;
    const widest = Math.max(...cur.pages.map((p) => dims(p)[0]));
    return Math.max(0.25, Math.min(3, (viewer.clientWidth - 56) / widest));
}
function rebuild() {
    buildToken++;
    $('empty').hidden = !!cur;
    if (!cur) { pagesEl.innerHTML = ''; thumbsEl.innerHTML = ''; updateInfo(); return; }
    if (!cur.pages.length) {
        cur.pages.push({ sid: 'blank', index: 0, w: 612, h: 792, rot: 0, annots: [] });
    }
    curPage = Math.max(0, Math.min(curPage, cur.pages.length - 1));
    if (fitMode) zoom = fitZoom();
    $('zoom-fit').textContent = Math.round(zoom * 100) + '%';
    if (io) io.disconnect();
    io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) renderPage(+e.target.dataset.i); }), { root: viewer, rootMargin: '800px 0px' });
    pagesEl.innerHTML = '';
    cur.pages.forEach((pg, i) => {
        const el = document.createElement('div');
        el.className = 'pk-page' + (i === curPage ? ' current' : '');
        el.dataset.i = i;
        el.innerHTML = '<div class="pk-sheet"><canvas></canvas><svg class="pk-ink"></svg><div class="pk-ex"></div><div class="pk-annots"></div></div><div class="pk-pnum">' + (i + 1) + '</div>';
        pagesEl.appendChild(el);
        sizePage(i);
        renderLayer(i);
        io.observe(el);
    });
    buildThumbs();
    updateInfo();
    showExisting();
}
function sizePage(i) {
    const pg = cur.pages[i];
    const el = pagesEl.children[i];
    const [dw, dh] = dims(pg);
    el.style.width = dw * zoom + 'px';
    el.style.height = dh * zoom + 'px';
    const sh = el.firstChild;
    sh.style.width = pg.w * zoom + 'px';
    sh.style.height = pg.h * zoom + 'px';
    sh.style.left = (dw - pg.w) * zoom / 2 + 'px';
    sh.style.top = (dh - pg.h) * zoom / 2 + 'px';
    sh.style.transform = pg.rot ? 'rotate(' + pg.rot + 'deg)' : '';
    sh.querySelector('svg').setAttribute('viewBox', '0 0 ' + pg.w + ' ' + pg.h);
}
async function drawInto(canvas, pg, scale) {
    const W = Math.max(1, Math.round(pg.w * scale)), H = Math.max(1, Math.round(pg.h * scale));
    if (pg.sid === 'blank' || !bytes[pg.sid]) {
        canvas.width = W; canvas.height = H;
        const c = canvas.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
        return;
    }
    const doc = await getPdf(pg.sid);
    const page = await doc.getPage(pg.index + 1);
    const vp = page.getViewport({ scale, rotation: 0 });
    const off = document.createElement('canvas');
    off.width = Math.round(vp.width); off.height = Math.round(vp.height);
    await page.render({ canvasContext: off.getContext('2d'), viewport: vp }).promise;
    canvas.width = off.width; canvas.height = off.height;
    canvas.getContext('2d').drawImage(off, 0, 0);
}
async function renderPage(i) {
    if (!cur || !cur.pages[i]) return;
    const pg = cur.pages[i];
    const canvas = pagesEl.children[i] && pagesEl.children[i].querySelector('canvas');
    if (!canvas) return;
    const key = zoom + '|' + pg.sid + '|' + pg.index;
    if (canvas.dataset.key === key) return;
    canvas.dataset.key = key;
    const tok = buildToken;
    try {
        const tmp = document.createElement('canvas');
        await drawInto(tmp, pg, zoom * Math.min(window.devicePixelRatio || 1, 2));
        if (tok !== buildToken || canvas.dataset.key !== key) return;
        canvas.width = tmp.width; canvas.height = tmp.height;
        canvas.getContext('2d').drawImage(tmp, 0, 0);
    } catch (e) { if (tok === buildToken) { canvas.dataset.key = ''; console.error(e); } }
}

// Draws the marks of one page!
function renderLayer(i) {
    const pg = cur.pages[i];
    const sheet = pagesEl.children[i].firstChild;
    const svg = sheet.querySelector('svg');
    const box = sheet.querySelector('.pk-annots');
    let ink = '', html = '';
    const z = zoom;
    for (const a of pg.annots) {
        const sel = a.id === selId ? ' sel' : '';
        if (a.t === 'ink') {
            if (a.kind && AI) ink += '<g>' + AI.strokeSvg({ t: a.kind, c: a.ic, w: a.size, d: AI.pathOf(a.pts) }) + '</g>';
            else ink += `<path d="${inkPath(a.pts)}" fill="none" stroke="${esc(a.color)}" stroke-width="${a.size}" stroke-linecap="round" stroke-linejoin="round"/>`;
            const b = inkBounds(a);
            html += `<div class="pk-a ink inkhit${sel}" data-id="${a.id}" style="left:${b.x * z}px;top:${b.y * z}px;width:${b.w * z}px;height:${b.h * z}px"></div>`;
        } else if (a.t === 'text') {
            html += `<div class="pk-a text${sel}" data-id="${a.id}" style="left:${a.x * z}px;top:${a.y * z}px;${textCss(a, z)}${a.rot ? `transform:rotate(${-a.rot}deg)` : ''}">${kdHtml(a.text)}</div>`;
        } else {
            const inner = a.t === 'img' ? `<img src="${a.data}" alt="">` : '';
            const look = a.t === 'white' && a.color ? `background:${esc(a.color)}` : a.t === 'hl' ? `background:${esc(a.color)}` : a.t === 'box' ? `border:${a.size * z}px solid ${esc(a.color)}` : '';
            const rot = a.t === 'img' && a.rot ? `transform:rotate(${-a.rot}deg);transform-origin:0 0;` : '';
            html += `<div class="pk-a ${a.t}${sel}" data-id="${a.id}" style="left:${a.x * z}px;top:${a.y * z}px;width:${a.w * z}px;height:${a.h * z}px;${rot}${look}">${inner}${sel ? '<i class="pk-handle"></i>' : ''}</div>`;
        }
    }
    svg.innerHTML = (AI && /<g>/.test(ink) ? AI.DEFS : '') + ink;
    box.innerHTML = html;
}
function inkPath(pts) {
    if (!pts.length) return '';
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    if (pts.length === 1) d += 'l0.01 0';
    for (let k = 1; k < pts.length; k++) d += 'L' + pts[k][0].toFixed(1) + ' ' + pts[k][1].toFixed(1);
    return d;
}
function inkBounds(a) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of a.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const pad = a.kind ? a.size * 3 + 10 : a.size / 2 + 3; // (Annotate inks glow and shine past their line)
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/* ---------- Thumbnails ---------- */
function buildThumbs() {
    const tok = buildToken;
    thumbsEl.innerHTML = cur.pages.map((pg, i) => {
        const [dw, dh] = dims(pg);
        const s = 110 / Math.max(dw, dh * 0.78);
        return `<div class="pk-thumb${i === curPage ? ' current' : ''}${picked.has(i) ? ' picked' : ''}" data-i="${i}" draggable="true" title="Page ${i + 1} (drag to reorder, Ctrl+click to pick several)">` +
            `<div class="pk-thumb-box" style="height:${Math.round(dh * s)}px"><canvas style="width:${Math.round(pg.w * s)}px;height:${Math.round(pg.h * s)}px;transform:translate(-50%,-50%)${pg.rot ? ` rotate(${pg.rot}deg)` : ''}"></canvas></div><span>${i + 1}</span></div>`;
    }).join('');
    (async () => {
        for (let i = 0; i < cur.pages.length; i++) {
            if (tok !== buildToken) return;
            const c = thumbsEl.children[i] && thumbsEl.children[i].querySelector('canvas');
            if (!c) return;
            const pg = cur.pages[i];
            const [dw, dh] = dims(pg);
            try { await drawInto(c, pg, (110 / Math.max(dw, dh * 0.78)) * 1.5); } catch (e) {}
        }
    })();
}
function setCurrent(i, scroll) {
    if (!cur) return;
    curPage = Math.max(0, Math.min(i, cur.pages.length - 1));
    [...pagesEl.children].forEach((el, k) => el.classList.toggle('current', k === curPage));
    [...thumbsEl.children].forEach((el, k) => { el.classList.toggle('current', k === curPage); el.classList.toggle('picked', picked.has(k)); });
    if (scroll) scrollToPage(curPage);
    const th = thumbsEl.children[curPage];
    if (th) {
        const r = th.getBoundingClientRect(), b = thumbsEl.getBoundingClientRect();
        if (r.top < b.top || r.bottom > b.bottom) th.scrollIntoView({ block: 'nearest' });
    }
    updateInfo();
}
// While a jump is gliding, the scroll watcher must not re-pick the pages passing by!
let scrollLockUntil = 0;
function scrollToPage(i) {
    const el = pagesEl.children[i];
    if (!el) return;
    scrollLockUntil = Date.now() + 900;
    viewer.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
    el.classList.remove('pk-flash');
    void el.offsetWidth;
    el.classList.add('pk-flash');
}
viewer.addEventListener('scroll', () => {
    if (!cur || Date.now() < scrollLockUntil) return;
    const mid = viewer.scrollTop + viewer.clientHeight / 3;
    let best = curPage;
    for (let k = 0; k < pagesEl.children.length; k++) {
        const el = pagesEl.children[k];
        if (el.offsetTop <= mid) best = k; else break;
    }
    if (best !== curPage) setCurrent(best, false);
}, { passive: true });

thumbsEl.addEventListener('click', (e) => {
    const t = e.target.closest('.pk-thumb');
    if (!t) return;
    const i = +t.dataset.i;
    if (e.ctrlKey || e.metaKey) { picked.has(i) ? picked.delete(i) : picked.add(i); if (!picked.size) picked.add(i); }
    else if (e.shiftKey) { const a = Math.min(i, curPage), b = Math.max(i, curPage); picked = new Set(); for (let k = a; k <= b; k++) picked.add(k); }
    else picked = new Set([i]);
    setCurrent(i, true);
});
let dragFrom = -1;
thumbsEl.addEventListener('dragstart', (e) => { const t = e.target.closest('.pk-thumb'); if (!t) return; dragFrom = +t.dataset.i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'peeker-page'); });
thumbsEl.addEventListener('dragover', (e) => {
    if (dragFrom < 0) return;
    e.preventDefault();
    [...thumbsEl.children].forEach((c) => c.classList.remove('drop-before'));
    const t = e.target.closest('.pk-thumb');
    if (t) t.classList.add('drop-before');
});
thumbsEl.addEventListener('drop', (e) => {
    if (dragFrom < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.target.closest('.pk-thumb');
    let to = t ? +t.dataset.i : cur.pages.length;
    const from = dragFrom;
    dragFrom = -1;
    if (to === from || to === from + 1) { rebuildThumbsOnly(); return; }
    pushUndo();
    const [moved] = cur.pages.splice(from, 1);
    if (to > from) to--;
    cur.pages.splice(to, 0, moved);
    curPage = to; picked = new Set([to]);
    rebuild(); save();
    toast('Moved page ' + (from + 1) + ' to ' + (to + 1) + '!');
});
thumbsEl.addEventListener('dragend', () => { dragFrom = -1; [...thumbsEl.children].forEach((c) => c.classList.remove('drop-before')); });
function rebuildThumbsOnly() { [...thumbsEl.children].forEach((c) => c.classList.remove('drop-before')); }

/* ---------- Page tools ---------- */
function pickedPages() { return picked.size > 1 ? [...picked].sort((a, b) => a - b) : [curPage]; }
$('pagebar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (!b || !cur) return;
    const act = b.dataset.page;
    const list = pickedPages();
    pushUndo();
    if (act === 'rotl' || act === 'rotr') {
        list.forEach((i) => { const p = cur.pages[i]; p.rot = (p.rot + (act === 'rotr' ? 90 : 270)) % 360; });
        toast('Rotated!');
    } else if (act === 'del') {
        if (list.length >= cur.pages.length) { undoStack.pop(); toast('A PDF needs at least one page!'); return; }
        for (const i of [...list].reverse()) cur.pages.splice(i, 1);
        picked = new Set();
        toast('Deleted ' + list.length + ' page' + (list.length === 1 ? '' : 's') + '!');
    } else if (act === 'up' || act === 'down') {
        const i = curPage, j = act === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= cur.pages.length) { undoStack.pop(); return; }
        [cur.pages[i], cur.pages[j]] = [cur.pages[j], cur.pages[i]];
        curPage = j; picked = new Set([j]);
    } else if (act === 'dup') {
        const copy = JSON.parse(JSON.stringify(cur.pages[curPage]));
        copy.annots.forEach((a) => { a.id = uid(); });
        cur.pages.splice(curPage + 1, 0, copy);
        curPage++;
        toast('Duplicated!');
    } else if (act === 'blank') {
        const p = cur.pages[curPage];
        cur.pages.splice(curPage + 1, 0, { sid: 'blank', index: 0, w: p ? p.w : 612, h: p ? p.h : 792, rot: p ? p.rot : 0, annots: [] });
        curPage++;
        toast('Blank page added!');
    }
    rebuild(); save();
    setCurrent(curPage, act !== 'rotl' && act !== 'rotr');
});

/* ---------- Tools + styles ---------- */
function setTool(t) {
    if (t === 'img') { $('file-img').click(); return; }
    if (t === 'sign') { openSign(); return; }
    tool = t;
    document.body.dataset.tool = t;
    document.querySelectorAll('#tools [data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    if (t !== 'select') select(null);
    renderStyle();
    showExisting();
}
function styleKey() {
    const a = selected();
    if (a && style[a.t]) {
        // a picked text mark shows its own font settings
        if (a.t === 'text') { style.text.font = a.font || 'sans'; FMT.forEach((f) => { style.text[f] = !!a[f]; }); }
        return a.t;
    }
    return style[tool] ? tool : 'text';
}
function renderStyle() {
    const k = styleKey();
    const s = style[k];
    // the Draw tool's ink: a plain pen, or one of Bitbook's Annotate inks (which use the 13 Annotate colors)
    const kindSel = $('ink-kind');
    const sa = selected();
    const kind = k === 'ink' ? (sa && sa.t === 'ink' ? sa.kind || 'plain' : style.ink.kind) : 'plain';
    if (kindSel) {
        kindSel.hidden = k !== 'ink' || !AI;
        if (AI && !kindSel.options.length) {
            kindSel.innerHTML = '<option value="plain">Plain pen</option><optgroup label="Annotate inks">' + AI.INKS.map((n) => `<option value="${n[0]}">${esc(n[1])}</option>`).join('') + '</optgroup>' +
                AI.PACKS.map((pk) => `<optgroup label="${esc(pk[1])}">` + pk[2].map((st) => `<option value="${st[0]}">${esc(st[1])}</option>`).join('') + '</optgroup>').join('');
        }
        kindSel.value = kind;
    }
    if (kind !== 'plain' && AI) {
        const ic = sa && sa.t === 'ink' && sa.kind ? sa.ic : style.ink.ic;
        $('swatches').innerHTML = AI.COLORS.map((c) => `<button class="swatch${c[0] === ic ? ' on' : ''}" data-acolor="${c[0]}" style="background:linear-gradient(180deg,${c[3]},${c[1]})" title="${c[0]}"></button>`).join('');
    } else
    $('swatches').innerHTML = COLORS.map((c) => `<button class="swatch${c === s.color ? ' on' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('');
    const inp = $('size-input');
    inp.disabled = k === 'hl';
    inp.value = k === 'hl' ? '' : s.size;
    $('size-label').textContent = k === 'text' ? 'Text size' : k === 'hl' ? 'Size' : 'Line';
    // the font controls belong to text only
    const t = style.text;
    $('font-group').hidden = k !== 'text';
    $('font-select').value = t.font;
    document.querySelectorAll('#font-group [data-fmt]').forEach((b) => { const on = !!t[b.dataset.fmt]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
}
// font, bold, italic, underline and strike: for new text, and for the selected text mark
function setTextStyle(key, value) {
    style.text[key] = value;
    const a = selected();
    if (a && a.t === 'text') { pushUndo(); a[key] = value; refreshMark(); save(); }
    renderStyle();
}
$('font-select').addEventListener('change', () => setTextStyle('font', $('font-select').value));
$('font-group').addEventListener('click', (e) => { const b = e.target.closest('[data-fmt]'); if (b) setTextStyle(b.dataset.fmt, !style.text[b.dataset.fmt]); });
$('tools').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });
$('swatches').addEventListener('click', (e) => {
    const ac = e.target.closest('[data-acolor]');
    if (ac) {
        style.ink.ic = ac.dataset.acolor;
        const a = selected();
        if (a && a.t === 'ink' && a.kind) { pushUndo(); a.ic = ac.dataset.acolor; refreshMark(); save(); }
        renderStyle();
        return;
    }
    const b = e.target.closest('[data-color]');
    if (!b) return;
    const k = styleKey();
    style[k].color = b.dataset.color;
    const a = selected();
    if (a && a.t === k) { pushUndo(); a.color = b.dataset.color; refreshMark(); save(); }
    renderStyle();
});
$('ink-kind').addEventListener('change', () => {
    const v = $('ink-kind').value;
    style.ink.kind = v;
    // each Annotate ink starts at its own usual width (the Line box can change it)
    if (v !== 'plain' && AI) style.ink.size = Math.round(AI.BASE[v] || 6);
    else style.ink.size = 3;
    const a = selected();
    if (a && a.t === 'ink') {
        pushUndo();
        if (v === 'plain') { delete a.kind; delete a.ic; } else { a.kind = v; a.ic = a.ic || style.ink.ic; }
        a.size = style.ink.size;
        refreshMark(); save();
    }
    renderStyle();
});
$('size-input').addEventListener('change', () => {
    const k = styleKey();
    const v = Math.max(1, Math.min(96, parseFloat($('size-input').value) || style[k].size));
    style[k].size = v;
    const a = selected();
    if (a && a.t === k) { pushUndo(); a.size = v; refreshMark(); save(); }
});

function findMark(id) {
    if (!cur || !id) return null;
    for (let i = 0; i < cur.pages.length; i++) {
        const a = cur.pages[i].annots.find((x) => x.id === id);
        if (a) return { a, i };
    }
    return null;
}
function selected() { const f = findMark(selId); return f && f.a; }
function select(id) {
    if (id === selId) return;
    const old = findMark(selId);
    selId = id;
    if (old) renderLayer(old.i);
    const now = findMark(id);
    if (now && (!old || now.i !== old.i)) renderLayer(now.i);
    renderStyle();
    updateInfo();
}
function refreshMark() { const f = findMark(selId); if (f) renderLayer(f.i); }
function deleteSelected() {
    const f = findMark(selId);
    if (!f) return;
    pushUndo();
    cur.pages[f.i].annots = cur.pages[f.i].annots.filter((a) => a.id !== selId);
    selId = null;
    renderLayer(f.i); save(); renderStyle();
    toast('Mark deleted!');
}

/* ---------- Pointer work on the pages ---------- */
// Screen point -> the page's own unrotated frame (points, top-left origin)!
function localPoint(pageEl, e) {
    const pg = cur.pages[+pageEl.dataset.i];
    const r = pageEl.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const a = pg.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    return { x: (lx + pg.w * zoom / 2) / zoom, y: (ly + pg.h * zoom / 2) / zoom };
}
let drag = null;
pagesEl.addEventListener('pointerdown', (e) => {
    if (!cur || e.button !== 0) return;
    const pageEl = e.target.closest('.pk-page');
    if (!pageEl) return;
    if (e.target.closest('[contenteditable]')) return;
    // clicking away always finishes the text being typed
    const typing = pagesEl.querySelector('[contenteditable]');
    if (typing) typing.blur();
    const i = +pageEl.dataset.i;
    const pg = cur.pages[i];
    if (i !== curPage) { picked = new Set([i]); setCurrent(i, false); }
    const p = localPoint(pageEl, e);
    const markEl = e.target.closest('.pk-a');
    if (tool === 'edit' && !markEl) {
        const hit = e.target.closest('.pk-ex-hit');
        if (hit) { e.preventDefault(); takeExisting(i, hit.dataset.k); return; }
    }
    if (tool === 'select' || tool === 'edit' || (tool === 'text' && markEl && markEl.classList.contains('text'))) {
        if (!markEl) { select(null); return; }
        const id = markEl.dataset.id;
        if (tool === 'text' || (tool === 'edit' && markEl.classList.contains('text'))) { editText(i, id); e.preventDefault(); return; }
        select(id);
        const a = selected();
        drag = { kind: e.target.classList.contains('pk-handle') ? 'resize' : 'move', i, pageEl, start: p, orig: JSON.parse(JSON.stringify(a)), a, moved: false };
        e.preventDefault();
        return;
    }
    e.preventDefault();
    if (tool === 'text') {
        pushUndo();
        const t = style.text;
        const a = { id: uid(), t: 'text', x: p.x, y: p.y - t.size * 0.6, size: t.size, color: t.color, font: t.font, bold: t.bold, italic: t.italic, underline: t.underline, strike: t.strike, text: '', rot: pg.rot, fresh: true };
        pg.annots.push(a);
        renderLayer(i);
        editText(i, a.id);
        return;
    }
    if (tool === 'ink') {
        const a = { id: uid(), t: 'ink', pts: [[p.x, p.y]], color: style.ink.color, size: style.ink.size };
        if (style.ink.kind !== 'plain' && AI) { a.kind = style.ink.kind; a.ic = style.ink.ic; }
        pushUndo();
        pg.annots.push(a);
        drag = { kind: 'ink', i, pageEl, a };
        renderLayer(i);
        return;
    }
    if (tool === 'hl' || tool === 'box' || tool === 'white') {
        const d = document.createElement('div');
        d.className = 'pk-draft';
        pageEl.firstChild.appendChild(d);
        drag = { kind: 'rect', i, pageEl, start: p, el: d, end: p };
    }
});
window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = localPoint(drag.pageEl, e);
    if (drag.kind === 'ink') {
        const last = drag.a.pts[drag.a.pts.length - 1];
        if (Math.hypot(p.x - last[0], p.y - last[1]) > 0.8) { drag.a.pts.push([+p.x.toFixed(2), +p.y.toFixed(2)]); renderLayer(drag.i); }
    } else if (drag.kind === 'rect') {
        drag.end = p;
        const x = Math.min(drag.start.x, p.x), y = Math.min(drag.start.y, p.y);
        Object.assign(drag.el.style, { left: x * zoom + 'px', top: y * zoom + 'px', width: Math.abs(p.x - drag.start.x) * zoom + 'px', height: Math.abs(p.y - drag.start.y) * zoom + 'px' });
    } else if (drag.kind === 'move' || drag.kind === 'resize') {
        const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
        if (!drag.moved && Math.hypot(dx, dy) * zoom < 2) return;
        if (!drag.moved) { pushUndo(); drag.moved = true; }
        const a = drag.a, o = drag.orig;
        if (drag.kind === 'move') {
            if (a.t === 'ink') a.pts = o.pts.map(([x, y]) => [x + dx, y + dy]);
            else { a.x = o.x + dx; a.y = o.y + dy; }
        } else {
            // resize in the mark's own frame (pictures can be turned with their page)!
            const r = (a.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
            const lx = dx * c - dy * s, ly = dx * s + dy * c;
            if (a.t === 'img' && !e.shiftKey) { const k = Math.max(0.05, (o.w + lx) / o.w); a.w = o.w * k; a.h = o.h * k; }
            else { a.w = Math.max(4, o.w + lx); a.h = Math.max(4, o.h + ly); }
        }
        renderLayer(drag.i);
    }
});
window.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    const pg = cur.pages[d.i];
    if (d.kind === 'ink') { save(); updateInfo(); return; }
    if (d.kind === 'rect') {
        d.el.remove();
        const x = Math.min(d.start.x, d.end.x), y = Math.min(d.start.y, d.end.y);
        const w = Math.abs(d.end.x - d.start.x), h = Math.abs(d.end.y - d.start.y);
        if (w < 3 || h < 3) return;
        pushUndo();
        const a = { id: uid(), t: tool, x, y, w, h };
        if (tool === 'hl') a.color = style.hl.color;
        if (tool === 'box') { a.color = style.box.color; a.size = style.box.size; }
        pg.annots.push(a);
        renderLayer(d.i); save();
        return;
    }
    if (d.moved) save();
});
pagesEl.addEventListener('dblclick', (e) => {
    const m = e.target.closest('.pk-a.text');
    if (m && tool === 'select') editText(+e.target.closest('.pk-page').dataset.i, m.dataset.id);
});

function editText(i, id) {
    const el = pagesEl.children[i].querySelector('.pk-a[data-id="' + id + '"]');
    const f = findMark(id);
    if (!el || !f) return;
    const a = f.a;
    const before = a.text;
    selId = id;
    el.classList.add('sel');
    // while typing, the Keydown shows as written; it turns into chips again when you click away
    el.textContent = a.text;
    try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(range);
    const finish = () => {
        el.removeEventListener('blur', finish);
        const text = el.innerText.replace(/ /g, ' ').replace(/\n$/, '');
        const page = cur.pages[i];
        if (!text.trim()) {
            if (!a.fresh || before) pushUndo();
            else undoStack.pop();
            page.annots = page.annots.filter((x) => x.id !== id);
            selId = null;
        } else if (a.orig !== undefined && text === a.orig && a.x === a.ox && a.y === a.oy) {
            // nothing changed: the line stays exactly as it was in the PDF
            undoStack.pop();
            page.annots = page.annots.filter((x) => x.id !== id && x.id !== a.cover);
            page.ex = (page.ex || []).filter((k) => k !== a.exKey);
            selId = null;
        } else if (text !== before) {
            if (!a.fresh) pushUndo();
            a.text = text;
        }
        delete a.fresh;
        renderLayer(i); save(); renderStyle(); updateInfo(); showExisting();
    };
    el.addEventListener('blur', finish);
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); el.blur(); } ev.stopPropagation(); });
}

/* ---------- Edit what is already in the PDF ---------- */
// The Edit tool outlines every line of text and every picture that is already on the page. Click one and it becomes a mark you can
// change: a cover in the paper's color goes over the original, and a text mark (same size, font and color) or a picture takes its place.
// A page's text, read piece by piece (older browsers cannot loop over pdf.js's streams, so this reads the stream by hand)
async function textContentOf(page) {
    const reader = page.streamTextContent().getReader();
    const items = [], styles = {};
    for (;;) {
        const r = await reader.read();
        if (r.done) break;
        for (const it of r.value.items) items.push(it);
        Object.assign(styles, r.value.styles);
    }
    return { items, styles };
}
const exCache = new Map();
function existingOf(pg) {
    if (pg.sid === 'blank' || !bytes[pg.sid]) return Promise.resolve([]);
    const key = pg.sid + '|' + pg.index;
    if (!exCache.has(key)) exCache.set(key, (async () => {
        const lib = await loadPdfjs();
        const doc = await getPdf(pg.sid);
        const page = await doc.getPage(pg.index + 1);
        const vp = page.getViewport({ scale: 1, rotation: 0 });
        const out = [];
        // lines of text: pieces on the same baseline that sit side by side belong together
        let tc;
        try { tc = await textContentOf(page); } catch (e) { console.warn('Peeker: reading the text failed', e); tc = { items: [], styles: {} }; }
        const runs = [];
        tc.items.forEach((it) => {
            if (!it.str) return;
            const tr = lib.Util.transform(vp.transform, it.transform);
            const size = Math.hypot(tr[0], tr[1]);
            if (size < 3 || Math.abs(tr[1]) > size * 0.15 || Math.abs(tr[2]) > size * 0.6) return;   // straight text only
            runs.push({ str: it.str, x: tr[4], base: tr[5], size, w: Math.max(0, it.width), font: it.fontName });
        });
        runs.sort((a, b) => Math.round(a.base) - Math.round(b.base) || a.x - b.x);
        const lines = [];
        let ln = null;
        runs.forEach((r) => {
            if (ln && Math.abs(r.base - ln.base) < ln.size * 0.3 && r.x - ln.end < ln.size * 1.5 && r.x - ln.end > -ln.size) {
                const gap = r.x - ln.end;
                ln.text += (gap > ln.size * 0.18 && !/\s$/.test(ln.text) && !/^\s/.test(r.str) ? ' ' : '') + r.str;
                ln.end = Math.max(ln.end, r.x + r.w);
            } else { ln = { text: r.str, x: r.x, base: r.base, size: r.size, end: r.x + r.w, font: r.font }; lines.push(ln); }
        });
        lines.forEach((l, n) => {
            const text = l.text.replace(/\s+$/, '');
            if (!text.trim()) return;
            let name = '';
            try { const fo = page.commonObjs.has(l.font) ? page.commonObjs.get(l.font) : null; name = (fo && fo.name) || ''; } catch (e) { /* the font is not loaded yet */ }
            const fam = (tc.styles[l.font] && tc.styles[l.font].fontFamily) || '';
            const font = /mono|courier|consol|menlo/i.test(name) || fam === 'monospace' ? 'mono' : /times|serif|georgia|garamond|minion|roman|palatino|book/i.test(name) && !/sans/i.test(name) || fam === 'serif' ? 'serif' : 'sans';
            out.push({ key: 't' + n, kind: 'text', text, x: l.x, base: l.base, size: l.size, y: l.base - l.size * 0.92, w: Math.max(4, l.end - l.x), h: l.size * 1.2, font, bold: /bold|black|heavy|semibold|demi/i.test(name), italic: /italic|oblique/i.test(name) });
        });
        // pictures: where the page paints an image, found by following the page's drawing steps
        let ol;
        try { ol = await page.getOperatorList(); } catch (e) { console.warn('Peeker: getOperatorList failed', e && e.stack || e); return out; }
        const O = lib.OPS;
        const isImg = new Set([O.paintImageXObject, O.paintInlineImageXObject, O.paintImageMaskXObject, O.paintJpegXObject].filter((v) => v !== undefined));
        let ctm = [1, 0, 0, 1, 0, 0];
        const stack = [];
        let n = 0;
        for (let k = 0; k < ol.fnArray.length; k++) {
            const fn = ol.fnArray[k], args = ol.argsArray[k];
            if (fn === O.save) stack.push(ctm.slice());
            else if (fn === O.restore) { if (stack.length) ctm = stack.pop(); }
            else if (fn === O.transform) ctm = lib.Util.transform(ctm, args);
            else if (fn === O.paintFormXObjectBegin) { stack.push(ctm.slice()); if (args && args[0]) ctm = lib.Util.transform(ctm, args[0]); }
            else if (fn === O.paintFormXObjectEnd) { if (stack.length) ctm = stack.pop(); }
            else if (isImg.has(fn)) {
                const m = lib.Util.transform(vp.transform, ctm);
                const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map((p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]);
                const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
                const y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
                const w = x1 - x0, h = y1 - y0;
                if (w < 6 || h < 6 || (w * h) > vp.width * vp.height * 0.9) continue;
                out.push({ key: 'i' + (n++), kind: 'img', x: x0, y: y0, w, h });
            }
        }
        return out;
    })().catch((e) => { exCache.delete(key); console.warn('Peeker could not read the page for editing:', e); return []; }));
    return exCache.get(key);
}
let exToken = 0;
async function showExisting() {
    const tok = ++exToken;
    if (!cur) return;
    for (let i = 0; i < cur.pages.length; i++) {
        const box = pagesEl.children[i] && pagesEl.children[i].querySelector('.pk-ex');
        if (!box) continue;
        if (tool !== 'edit') { box.innerHTML = ''; continue; }
        const pg = cur.pages[i];
        const items = await existingOf(pg);
        if (tok !== exToken || tool !== 'edit') return;
        const used = pg.ex || [];
        box.innerHTML = items.filter((it) => !used.includes(it.key)).map((it) =>
            `<div class="pk-ex-hit ${it.kind}" data-k="${it.key}" title="${it.kind === 'text' ? 'Click to edit this text' : 'Click to move, resize or delete this picture'}" style="left:${it.x * zoom - 1}px;top:${it.y * zoom - 1}px;width:${it.w * zoom + 2}px;height:${it.h * zoom + 2}px"></div>`).join('');
    }
}
// The paper color around a spot (the edge of its box) and the ink color inside it (the pixel that differs most)
function sampleColors(canvas, px, it) {
    const c = canvas.getContext('2d');
    const x0 = Math.max(0, Math.floor((it.x - 3) * px)), y0 = Math.max(0, Math.floor((it.y - 3) * px));
    const x1 = Math.min(canvas.width, Math.ceil((it.x + it.w + 3) * px)), y1 = Math.min(canvas.height, Math.ceil((it.y + it.h + 3) * px));
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2) return { bg: '#ffffff', fg: '#111111' };
    const d = c.getImageData(x0, y0, w, h).data;
    const at = (x, y) => { const o = (y * w + x) * 4; return [d[o], d[o + 1], d[o + 2]]; };
    const edge = [];
    for (let x = 0; x < w; x++) { edge.push(at(x, 0), at(x, h - 1)); }
    for (let y = 0; y < h; y++) { edge.push(at(0, y), at(w - 1, y)); }
    const med = (k) => edge.map((p) => p[k]).sort((a, b) => a - b)[edge.length >> 1];
    const bg = [med(0), med(1), med(2)];
    let best = null, bd = -1;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = at(x, y), dist = Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]);
        if (dist > bd) { bd = dist; best = p; }
    }
    const hx = (p) => '#' + p.map((v) => v.toString(16).padStart(2, '0')).join('');
    return { bg: hx(bg), fg: bd > 60 && best ? hx(best) : '#111111' };
}
async function takeExisting(i, key) {
    const pg = cur.pages[i];
    const it = (await existingOf(pg)).find((x) => x.key === key);
    if (!it || (pg.ex || []).includes(key)) return;
    await renderPage(i);
    const canvas = pagesEl.children[i].querySelector('canvas');
    const px = canvas.width / pg.w;
    const col = sampleColors(canvas, px, it);
    pushUndo();
    (pg.ex = pg.ex || []).push(key);
    const cover = { id: uid(), t: 'white', x: it.x - 1, y: it.y - 1, w: it.w + 2, h: it.h + 2, color: col.bg };
    pg.annots.push(cover);
    if (it.kind === 'text') {
        const a = { id: uid(), t: 'text', x: it.x, y: it.base - it.size * 0.94, size: +it.size.toFixed(1), color: col.fg, font: it.font, bold: it.bold, italic: it.italic, underline: false, strike: false, text: it.text, rot: 0, orig: it.text, cover: cover.id, exKey: key };
        a.ox = a.x; a.oy = a.y;
        pg.annots.push(a);
        renderLayer(i);
        editText(i, a.id);
    } else {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(it.w * px)); c.height = Math.max(1, Math.round(it.h * px));
        c.getContext('2d').drawImage(canvas, it.x * px, it.y * px, it.w * px, it.h * px, 0, 0, c.width, c.height);
        const a = { id: uid(), t: 'img', data: c.toDataURL('image/png'), rot: 0, x: it.x, y: it.y, w: it.w, h: it.h, cover: cover.id };
        pg.annots.push(a);
        selId = a.id;
        renderLayer(i); save(); updateInfo(); renderStyle();
        toast('Picture ready! Drag it, pull the dot to resize, or press Delete to remove it!');
    }
    showExisting();
}

/* ---------- Pictures + signatures ---------- */
function placeImage(dataUrl, natW, natH, label) {
    if (!cur) return;
    const i = curPage, pg = cur.pages[i];
    const [dw] = dims(pg);
    const w = Math.min(label === 'sign' ? 200 : 260, dw * 0.6);
    const h = w * natH / natW;
    // centre of the page as the reader sees it, in the page's own frame
    const a = { id: uid(), t: 'img', data: dataUrl, rot: pg.rot, w, h };
    const r = pg.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    // the picture's own frame is turned by -rot; put its centre on the page centre
    const cx = pg.w / 2, cy = pg.h / 2;
    const hx = w / 2, hy = h / 2;
    a.x = cx - (hx * c + hy * s);
    a.y = cy - (-hx * s + hy * c);
    pushUndo();
    pg.annots.push(a);
    setTool('select');
    select(a.id);
    renderLayer(i); save();
    scrollToPage(i);
    toast(label === 'sign' ? 'Signature placed! Drag it where it belongs!' : 'Picture placed! Drag it, or pull the dot to resize!');
}
function toPng(src) {
    return new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => {
            const max = 1600, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
            const c = document.createElement('canvas');
            c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            const jpg = /^data:image\/jpe?g/i.test(src);
            res({ data: c.toDataURL(jpg ? 'image/jpeg' : 'image/png', 0.9), w: c.width, h: c.height });
        };
        im.onerror = rej;
        im.src = src;
    });
}
$('file-img').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f || !cur) return;
    const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    try { const p = await toPng(url); placeImage(p.data, p.w, p.h, 'img'); } catch (err) { toast('Could not read that picture!'); }
});

const pad = $('sign-pad');
let padInk = [];
function openSign() {
    if (!cur) { toast('Open a PDF first!'); return; }
    padInk = [];
    drawPad();
    $('sign-modal').hidden = false;
}
function drawPad() {
    const c = pad.getContext('2d');
    c.clearRect(0, 0, pad.width, pad.height);
    c.strokeStyle = '#cfd6e4'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(30, 160); c.lineTo(pad.width - 30, 160); c.stroke();
    c.strokeStyle = '#13213f'; c.lineWidth = 3.2; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of padInk) { c.beginPath(); s.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
}
function padPt(e) { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height]; }
pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); padInk.push([padPt(e)]); drawPad(); });
pad.addEventListener('pointermove', (e) => { if (e.buttons && padInk.length) { padInk[padInk.length - 1].push(padPt(e)); drawPad(); } });
$('sign-clear').onclick = () => { padInk = []; drawPad(); };
$('sign-cancel').onclick = () => { $('sign-modal').hidden = true; };
$('sign-ok').onclick = () => {
    if (!padInk.length) { toast('Draw a signature first!'); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    padInk.flat().forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const m = 6, w = Math.ceil(x1 - x0 + m * 2), h = Math.ceil(y1 - y0 + m * 2);
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const g = c.getContext('2d');
    g.scale(2, 2); g.translate(m - x0, m - y0);
    g.strokeStyle = '#13213f'; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of padInk) { g.beginPath(); s.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    $('sign-modal').hidden = true;
    placeImage(c.toDataURL('image/png'), w, h, 'sign');
};

/* ---------- Side panel: Find + Forms ---------- */
const textCache = new Map();
function openPanel(title, html) {
    $('panel-title').textContent = title;
    $('panel-body').innerHTML = html;
    $('panel').hidden = false;
    if (fitMode) setTimeout(() => { zoom = fitZoom(); rebuild(); }, 0);
}
function closePanel() { const was = !$('panel').hidden; $('panel').hidden = true; if (was && cur && fitMode) { zoom = fitZoom(); rebuild(); } }
$('panel-close').onclick = closePanel;

async function pageText(pg) {
    if (pg.sid === 'blank' || !bytes[pg.sid]) return '';
    const key = pg.sid + ':' + pg.index;
    if (!textCache.has(key)) {
        const doc = await getPdf(pg.sid);
        const tc = await textContentOf(await doc.getPage(pg.index + 1));
        textCache.set(key, tc.items.map((it) => it.str + (it.hasEOL ? '\n' : '')).join('').replace(/\s+/g, ' '));
    }
    return textCache.get(key);
}
function openFind() {
    if (!cur) return;
    openPanel('Find text', '<input class="aero-input" id="find-q" placeholder="Type a word and press Enter!" autocomplete="off"><div id="find-out" class="pk-note">Searches the words on every page!</div>');
    const q = $('find-q');
    q.focus();
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') runFind(q.value); e.stopPropagation(); });
}
async function runFind(q) {
    const out = $('find-out');
    q = q.trim();
    if (!q) return;
    out.innerHTML = 'Searching…';
    const needle = q.toLowerCase();
    const hits = [];
    let total = 0;
    for (let i = 0; i < cur.pages.length; i++) {
        let text = '';
        try { text = await pageText(cur.pages[i]); } catch (e) {}
        const low = text.toLowerCase();
        let at = low.indexOf(needle), n = 0, first = at;
        while (at >= 0) { n++; at = low.indexOf(needle, at + needle.length); }
        if (n) {
            total += n;
            const a = Math.max(0, first - 40), b = Math.min(text.length, first + needle.length + 40);
            const snip = esc(text.slice(a, first)) + '<mark>' + esc(text.slice(first, first + needle.length)) + '</mark>' + esc(text.slice(first + needle.length, b));
            hits.push(`<button class="pk-hit" data-i="${i}"><b>Page ${i + 1}</b> · ${n} match${n === 1 ? '' : 'es'}<br>${a ? '…' : ''}${snip}${b < text.length ? '…' : ''}</button>`);
        }
    }
    out.innerHTML = hits.length ? `<div class="pk-note">${total} match${total === 1 ? '' : 'es'} on ${hits.length} page${hits.length === 1 ? '' : 's'}!</div>` + hits.join('') : 'No matches! (Scanned pages have pictures instead of words.)';
    out.onclick = (e) => { const b = e.target.closest('.pk-hit'); if (b) { picked = new Set([+b.dataset.i]); setCurrent(+b.dataset.i, true); } };
}

const formDocs = new Map(); // sid -> pdf-lib PDFDocument (read only, for listing fields)
async function openForms() {
    if (!cur) return;
    openPanel('Fill forms', '<div class="pk-note">Loading the form fields…</div>');
    let lib;
    try { lib = await loadPdfLib(); } catch (e) { $('panel-body').innerHTML = '<div class="pk-note">' + esc(why(e)) + '</div>'; return; }
    const used = [...new Set(cur.pages.map((p) => p.sid).filter((s) => s !== 'blank' && bytes[s]))];
    let html = '';
    for (const sid of used) {
        try {
            if (!formDocs.has(sid)) formDocs.set(sid, await lib.PDFDocument.load(bytes[sid], { ignoreEncryption: true }));
            const fields = formDocs.get(sid).getForm().getFields();
            const vals = (cur.forms[sid] = cur.forms[sid] || {});
            for (const f of fields) {
                const name = f.getName();
                const kind = f.constructor.name;
                const k = esc(sid) + '" data-field="' + esc(name);
                if (f instanceof lib.PDFTextField) {
                    const v = vals[name] !== undefined ? vals[name] : (f.getText() || '');
                    html += `<label class="pk-field"><span>${esc(name)}</span><input class="aero-input" data-sid="${k}" value="${esc(v)}"></label>`;
                } else if (f instanceof lib.PDFCheckBox) {
                    const v = vals[name] !== undefined ? vals[name] : f.isChecked();
                    html += `<label class="pk-field pk-check"><input type="checkbox" data-sid="${k}"${v ? ' checked' : ''}><span>${esc(name)}</span></label>`;
                } else if (f instanceof lib.PDFDropdown || f instanceof lib.PDFRadioGroup || f instanceof lib.PDFOptionList) {
                    const opts = f.getOptions();
                    const curV = vals[name] !== undefined ? vals[name] : ([].concat(f.getSelected ? f.getSelected() : [])[0] || '');
                    html += `<label class="pk-field"><span>${esc(name)}</span><select class="aero-input" data-sid="${k}"><option value="">(none)</option>${opts.map((o) => `<option${o === curV ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
                } else void kind;
            }
        } catch (e) { console.error(e); }
    }
    $('panel-body').innerHTML = html
        ? '<div class="pk-note">Type your answers! They get written into the PDF (and flattened) when you press Save PDF!</div>' + html
        : '<div class="pk-note">This PDF has no fillable fields! Use the Text tool to type anywhere instead!</div>';
    $('panel-body').oninput = (e) => {
        const el = e.target.closest('[data-field]');
        if (!el) return;
        const sid = el.dataset.sid, name = el.dataset.field;
        cur.forms[sid] = cur.forms[sid] || {};
        cur.forms[sid][name] = el.type === 'checkbox' ? el.checked : el.value;
        save();
    };
    $('panel-body').onchange = $('panel-body').oninput;
}

/* ---------- Saving a real PDF ---------- */
function hex(lib, c) {
    const m = /^#?([0-9a-f]{6})$/i.exec(c || '') || [0, '111111'];
    const n = parseInt(m[1], 16);
    return lib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
function loadH2i() {
    if (window.htmlToImage) return Promise.resolve(window.htmlToImage);
    return H2I_URLS.reduce((p, u) => p.catch(() => loadScript(u)), Promise.reject(new Error('start')))
        .then(() => window.htmlToImage)
        .catch(() => { throw new EngineError('Peeker could not download html-to-image, which saves Keydown text! Check your internet connection!'); });
}
// A Keydown text mark becomes a sharp picture (4x), with a little room around it for glows and shadows
// Firefox outlines a thick stroke's curves coarsely at tight turns (a hand-drawn star's points came out as
// polygons in the saved PDF), but it draws round joins between straight pieces perfectly! So the smooth path
// is split into tiny straight pieces (about a quarter point long) before it is drawn for the PDF
function densePath(d, step) {
    const out = [];
    let x = 0, y = 0, m;
    const re = /([MLQl])([^MLQl]*)/g;
    const at = (px, py) => px.toFixed(2) + ' ' + py.toFixed(2);
    while ((m = re.exec(String(d)))) {
        const v = (m[2].match(/-?\d*\.?\d+/g) || []).map(Number);
        if (m[1] === 'M') { x = v[0]; y = v[1]; out.push('M' + at(x, y)); }
        else if (m[1] === 'L') { x = v[0]; y = v[1]; out.push('L' + at(x, y)); }
        else if (m[1] === 'l') { x += v[0]; y += v[1]; out.push('L' + at(x, y)); }
        else if (m[1] === 'Q') {
            const [cx, cy, ex, ey] = v;
            const n = Math.max(1, Math.ceil((Math.hypot(cx - x, cy - y) + Math.hypot(ex - cx, ey - cy)) / step));
            for (let i = 1; i <= n; i++) {
                const t = i / n, u = 1 - t;
                out.push('L' + at(u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey));
            }
            x = ex; y = ey;
        }
    }
    return out.join('');
}
// a quarter point per piece, coarser for very long strokes so the path stays a sane size
function inkStep(pts) {
    let len = 0;
    for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    return Math.max(0.25, len / 9000);
}
// An Annotate ink stroke as a sharp picture (4 pixels per point), drawn by the same code that shows it on the page
async function rasterInk(a) {
    const b = inkBounds(a);
    const S = Math.max(1, Math.min(4, 6000 / Math.max(b.w, b.h)));
    // The inks' glow + shadow filters cover a huge area (12000 x 40000) so they never clip on the page, but at
    // 4x that is far past what browsers render at full quality: Firefox drops the blur and others can blur
    // coarsely, so the saved stroke looked hard-edged and "low poly"! Here they (and the Outline Pill's mask) cover just this stroke's box
    const fit = (s) => s.replace(/x="-4000" y="-4000" width="12000" height="40000"/g, 'x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '"');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.ceil(b.w * S) + '" height="' + Math.ceil(b.h * S) + '" viewBox="' + b.x + ' ' + b.y + ' ' + b.w + ' ' + b.h + '">' +
        fit(AI.DEFS) + '<g>' + fit(AI.strokeSvg({ t: a.kind, c: a.ic, w: a.size, d: densePath(AI.pathOf(a.pts), inkStep(a.pts)) })) + '</g></svg>';
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = Math.ceil(b.w * S); c.height = Math.ceil(b.h * S);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
        return { png: new Uint8Array(await blob.arrayBuffer()), x: b.x, y: b.y, w: b.w, h: b.h };
    } finally { URL.revokeObjectURL(url); }
}
const RASTER_PAD = 8;
// Safari's engine (WebKit: Safari, and the Mac and Linux desktop apps) gets two things wrong in html-to-image's
// snapshot: an SVG picture inside it (the round glossy ends of the Gel Underline and Gel Strike bars) loses its
// own gradients and turns black, and soft outer shadows (gel highlights, Gel Box, Gel Orbs) become gray slabs
// beside the mark! So in WebKit the throwaway copy gets those SVGs as PNGs and its shadows as drop-shadow filters
const WEBKIT = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/.test(navigator.userAgent);
const splitTop = (s) => { const out = []; let d = 0, part = ''; for (const ch of s) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && !d) { out.push(part.trim()); part = ''; } else part += ch; } if (part.trim()) out.push(part.trim()); return out; };
async function svgToPng(url, w, h) {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
}
async function webkitSafe(root) {
    for (const n of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(n);
        if (/data:image\/svg\+xml/.test(cs.backgroundImage)) {
            const sizes = splitTop(cs.backgroundSize), fs = parseFloat(cs.fontSize) || 16;
            const layers = [];
            for (const [i, layer] of splitTop(cs.backgroundImage).entries()) {
                const m = /^url\("(data:image\/svg\+xml.*)"\)$/.exec(layer);
                if (!m) { layers.push(layer); continue; }
                const sz = (sizes[i] || sizes[0] || '').split(/\s+/).map(parseFloat);
                // 8 pixels per CSS pixel: still sharp after the 4x snapshot
                try { layers.push('url("' + await svgToPng(m[1], (sz[0] || fs) * 8, (sz[1] || sz[0] || fs) * 8) + '")'); } catch (e) { layers.push(layer); }
            }
            n.style.backgroundImage = layers.join(', ');
        }
        if (cs.boxShadow && cs.boxShadow !== 'none') {
            const sh = splitTop(cs.boxShadow), inset = sh.filter((s) => /\binset\b/.test(s)), outer = sh.filter((s) => !/\binset\b/.test(s));
            if (!outer.length) continue;
            n.style.boxShadow = inset.length ? inset.join(', ') : 'none';
            n.style.filter = outer.map((s) => {
                const col = (s.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/i) || ['rgba(0, 0, 0, 0.2)'])[0];
                return 'drop-shadow(' + col + ' ' + s.replace(col, '').trim().split(/\s+/).slice(0, 3).join(' ') + ')';
            }).join(' ');
        }
    }
}
// Firefox paints every CSS gradient in a snapshot as one flat color (its first one) once the snapshot is drawn
// 3x or bigger, so gel highlights lost their fade! Pictures still scale fine there, so in Firefox each linear or
// radial gradient of the throwaway copy is painted on a canvas (4 pixels per CSS pixel) and put back as a PNG
const FIREFOX = /Firefox\//.test(navigator.userAgent);
const toRgba = (c) => c.replace(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+%?))?\)/g, (_, r, g, b, al) =>
    'rgba(' + Math.round(r * 255) + ', ' + Math.round(g * 255) + ', ' + Math.round(b * 255) + ', ' + (al === undefined ? 1 : /%$/.test(al) ? parseFloat(al) / 100 : al) + ')');
// "red 20%", "red 0% 50%", "red" or a bare hint "40%" -> [{ c, p }] (p: a fraction, null when left out; hints are skipped)
function gradStops(parts, len) {
    const pos = (v) => /%$/.test(v) ? parseFloat(v) / 100 : parseFloat(v) / len;
    const stops = [];
    for (const s of parts) {
        const m = /^(.*?\))?\s*([^()]*)$/.exec(s.trim());
        const col = (m && m[1]) || s.trim().split(/\s+/)[0];
        const rest = (m && m[1] ? m[2] : s.trim().split(/\s+/).slice(1).join(' ')).trim().split(/\s+/).filter(Boolean);
        if (/^-?[\d.]/.test(col)) continue;
        if (!rest.length) stops.push({ c: col, p: null });
        rest.forEach((r) => stops.push({ c: col, p: pos(r) }));
    }
    if (!stops.length) return stops;
    if (stops[0].p === null) stops[0].p = 0;
    if (stops[stops.length - 1].p === null) stops[stops.length - 1].p = 1;
    for (let i = 1, last = 0; i < stops.length; i++) {
        if (stops[i].p === null) continue;
        for (let j = last + 1; j < i; j++) stops[j].p = stops[last].p + (stops[i].p - stops[last].p) * (j - last) / (i - last);
        stops[i].p = Math.max(stops[i].p, stops[last].p);
        last = i;
    }
    return stops;
}
function paintGradient(layer, w, h) {
    const m = /^(linear|radial)-gradient\((.*)\)$/.exec(layer.trim());
    if (!m || w < 1 || h < 1) return null;
    const S = Math.min(4, 4096 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * S)); c.height = Math.max(1, Math.round(h * S));
    const x = c.getContext('2d');
    x.scale(c.width / w, c.height / h);
    let parts = splitTop(toRgba(m[2])), g;
    if (m[1] === 'linear') {
        let ang = 180;
        const first = parts[0];
        const deg = /^(-?[\d.]+)(deg|turn|rad|grad)$/.exec(first);
        if (deg) { ang = parseFloat(deg[1]) * ({ deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 })[deg[2]]; parts = parts.slice(1); }
        else if (/^to /.test(first)) {
            const d = first.slice(3);
            const tb = /top/.test(d) ? -1 : /bottom/.test(d) ? 1 : 0, lr = /left/.test(d) ? -1 : /right/.test(d) ? 1 : 0;
            ang = tb && lr ? (Math.atan2(lr * h, -tb * w) * 180 / Math.PI) : { '0,-1': 0, '1,0': 90, '0,1': 180, '-1,0': 270 }[lr + ',' + tb];
            parts = parts.slice(1);
        }
        const r = ang * Math.PI / 180, sx = Math.sin(r), sy = -Math.cos(r);
        const L = Math.abs(w * sx) + Math.abs(h * sy);
        g = x.createLinearGradient(w / 2 - sx * L / 2, h / 2 - sy * L / 2, w / 2 + sx * L / 2, h / 2 + sy * L / 2);
        gradStops(parts, L).forEach((s) => g.addColorStop(Math.min(1, Math.max(0, s.p)), s.c));
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
    } else {
        let cx = w / 2, cy = h / 2, circle = false, size = 'farthest-corner', rx = null, ry = null;
        const first = parts[0];
        if (!/^(rgba?|hsla?|#|transparent)/.test(first) && /^(circle|ellipse|closest|farthest|at |-?[\d.])/.test(first)) {
            parts = parts.slice(1);
            const [shape, at] = first.split(/\s*\bat\b\s*/);
            const coord = (v, len) => v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? len : v === 'center' ? len / 2 : /%$/.test(v) ? parseFloat(v) / 100 * len : parseFloat(v);
            if (at) {
                let [px, py] = at.trim().split(/\s+/);
                if (px === 'top' || px === 'bottom') [px, py] = [py || 'center', px];
                cx = coord(px, w); cy = coord(py || 'center', h);
            }
            circle = /circle/.test(shape);
            const kw = /(closest|farthest)-(side|corner)/.exec(shape);
            if (kw) size = kw[0];
            const lens = (shape || '').split(/\s+/).filter((v) => /^-?[\d.]/.test(v));
            if (lens.length) { rx = /%$/.test(lens[0]) ? parseFloat(lens[0]) / 100 * w : parseFloat(lens[0]); ry = lens[1] ? (/%$/.test(lens[1]) ? parseFloat(lens[1]) / 100 * h : parseFloat(lens[1])) : rx; }
        }
        if (rx === null) {
            const dx = [cx, w - cx], dy = [cy, h - cy];
            const pick = /closest/.test(size) ? Math.min : Math.max;
            if (/side/.test(size)) { rx = pick(...dx); ry = pick(...dy); if (circle) rx = ry = pick(rx, ry); }
            else {
                const ex = pick(...dx), ey = pick(...dy);
                if (circle) rx = ry = Math.hypot(ex, ey);
                else { rx = ex * Math.SQRT2; ry = ey * Math.SQRT2; }
            }
        }
        rx = Math.max(rx, 0.01); ry = Math.max(ry, 0.01);
        x.translate(cx, cy); x.scale(1, ry / rx);
        g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
        gradStops(parts, rx).forEach((s) => g.addColorStop(Math.min(1, Math.max(0, s.p)), s.c));
        x.fillStyle = g;
        x.fillRect(-cx, -cy * rx / ry, w, h * rx / ry);
    }
    return c.toDataURL('image/png');
}
function firefoxSafe(root) {
    for (const n of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(n);
        if (!/(^|[\s,])(linear|radial)-gradient\(/.test(cs.backgroundImage)) continue;
        const rect = n.getClientRects()[0];
        if (!rect) continue;
        // the gradient fills the padding box unless background-size says otherwise
        const bw = rect.width - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
        const bh = rect.height - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
        const sizes = splitTop(cs.backgroundSize), layers = splitTop(cs.backgroundImage);
        const outSizes = [];
        n.style.backgroundImage = layers.map((layer, i) => {
            const sz = (sizes[i % sizes.length] || 'auto').split(/\s+/);
            outSizes.push(sizes[i % sizes.length] || 'auto');
            if (!/^(linear|radial)-gradient\(/.test(layer)) return layer;
            // a length, a percentage or a calc() of them, like calc(100% - 4.1px)
            const dim = (v, box) => {
                if (v === undefined || v === 'auto') return box;
                let t = 0;
                v.replace(/calc\(|\)/g, '').replace(/\s*([+-])\s+/g, ' $1').split(/\s+/).forEach((term) => {
                    const n = parseFloat(term);
                    if (!isNaN(n)) t += /%$/.test(term) ? n / 100 * box : n;
                });
                return t;
            };
            if (sz[0] === 'cover' || sz[0] === 'contain') sz[0] = sz[1] = 'auto';
            const w = dim(sz[0], bw), h = dim(sz[1] === undefined ? 'auto' : sz[1], bh);
            let png = null;
            try { png = paintGradient(layer, w, h); } catch (e) { png = null; }
            if (!png) return layer;
            // an auto size becomes 100% so each line of a wrapped highlight still gets the whole fade
            if (sz[0] === 'auto' || sz[0] === undefined) outSizes[i] = '100% 100%';
            return 'url("' + png + '")';
        }).join(', ');
        n.style.backgroundSize = outSizes.join(', ');
    }
}
// Chips like the Rim family fade through colors the browser writes as color(srgb r g b / alpha). Snapshots in some browsers cannot read that
// form, so the fill (a whole gradient!) went missing: every such color on the throwaway copy is written as plain rgba() first
function srgbSafe(root) {
    for (const n of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(n);
        if (/color\(srgb/.test(cs.backgroundImage)) n.style.backgroundImage = toRgba(cs.backgroundImage);
        if (/color\(srgb/.test(cs.boxShadow)) n.style.boxShadow = toRgba(cs.boxShadow);
        if (/color\(srgb/.test(cs.textShadow)) n.style.textShadow = toRgba(cs.textShadow);
        if (/color\(srgb/.test(cs.color)) n.style.color = toRgba(cs.color);
        ['Top', 'Right', 'Bottom', 'Left'].forEach((side) => { const v = cs['border' + side + 'Color']; if (/color\(srgb/.test(v)) n.style['border' + side + 'Color'] = toRgba(v); });
    }
}
async function rasterText(a) {
    const h2i = await loadH2i();
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:0;top:0;z-index:-9999;pointer-events:none;padding:${RASTER_PAD}px;background:transparent;`;
    const el = document.createElement('div');
    el.className = 'pk-a text';
    el.style.cssText = 'position:static;' + textCss(a, 1);
    el.innerHTML = kdHtml(a.text);
    host.appendChild(el);
    document.body.appendChild(host);
    try {
        // Unique Styles load their style sheet the first time they are used: wait for it
        const us = document.getElementById('kd-unique-styles');
        for (let k = 0; us && !us.sheet && k < 60; k++) await new Promise((r) => setTimeout(r, 50));
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const opts = { pixelRatio: 4, skipFonts: true, width: host.offsetWidth, height: host.offsetHeight };
        // WebKit loads the pictures inside a snapshot only after the first one is drawn, so it draws twice
        srgbSafe(host);
        if (WEBKIT) { await webkitSafe(host); await h2i.toPng(host, opts); }
        if (FIREFOX) firefoxSafe(host);
        const png = await h2i.toPng(host, opts);
        return { png, w: host.offsetWidth, h: host.offsetHeight, plain: el.innerText };
    } finally { host.remove(); }
}
async function buildPdf(indices) {
    const lib = await loadPdfLib();
    const { PDFDocument, StandardFonts, degrees, BlendMode, LineCapStyle } = lib;
    const out = await PDFDocument.create();
    const fontCache = {};
    const embed = async (name) => (fontCache[name] = fontCache[name] || await out.embedFont(StandardFonts[name]));
    const font = await embed('Helvetica');
    const srcs = new Map();
    const images = new Map();
    const src = async (sid) => {
        if (!srcs.has(sid)) {
            const d = await PDFDocument.load(bytes[sid], { ignoreEncryption: true });
            if (d.isEncrypted) throw new Error('encrypted');
            const vals = cur.forms[sid];
            if (vals && Object.keys(vals).length) {
                const form = d.getForm();
                for (const [name, v] of Object.entries(vals)) {
                    try {
                        const f = form.getField(name);
                        if (f instanceof lib.PDFTextField) f.setText(String(v));
                        else if (f instanceof lib.PDFCheckBox) (v ? f.check() : f.uncheck());
                        else if (v && (f instanceof lib.PDFDropdown || f instanceof lib.PDFRadioGroup || f instanceof lib.PDFOptionList)) f.select(String(v));
                    } catch (e) { console.warn('field', name, e); }
                }
                try { form.flatten(); } catch (e) { console.warn(e); }
            }
            srcs.set(sid, d);
        }
        return srcs.get(sid);
    };
    // Helvetica only knows Latin letters, so anything else becomes "?"!
    const safe = (t, f) => [...t].map((ch) => { if (ch === '\n') return ch; try { (f || font).encodeText(ch); return ch; } catch (e) { return '?'; } }).join('');
    for (const i of indices) {
        const pg = cur.pages[i];
        let page;
        if (pg.sid === 'blank' || !bytes[pg.sid]) page = out.addPage([pg.w, pg.h]);
        else { const [cp] = await out.copyPages(await src(pg.sid), [pg.index]); page = out.addPage(cp); }
        page.setRotation(degrees(pg.rot));
        const cb = pg.sid === 'blank' ? { x: 0, y: 0, width: pg.w, height: pg.h } : page.getCropBox();
        const X = (x) => cb.x + x, Y = (y) => cb.y + cb.height - y;
        for (const a of pg.annots) {
            if (a.t === 'hl') page.drawRectangle({ x: X(a.x), y: Y(a.y + a.h), width: a.w, height: a.h, color: hex(lib, a.color), opacity: 0.42, blendMode: BlendMode.Multiply });
            else if (a.t === 'white') page.drawRectangle({ x: X(a.x), y: Y(a.y + a.h), width: a.w, height: a.h, color: a.color ? hex(lib, a.color) : lib.rgb(1, 1, 1) });
            else if (a.t === 'box') page.drawRectangle({ x: X(a.x + a.size / 2), y: Y(a.y + a.h - a.size / 2), width: Math.max(0, a.w - a.size), height: Math.max(0, a.h - a.size), borderColor: hex(lib, a.color), borderWidth: a.size });
            else if (a.t === 'ink' && a.pts.length && a.kind && AI) {
                const pic = await rasterInk(a);
                const im = await out.embedPng(pic.png);
                page.drawImage(im, { x: X(pic.x), y: Y(pic.y + pic.h), width: pic.w, height: pic.h, blendMode: a.kind === 'marker' ? BlendMode.Multiply : BlendMode.Normal });
            }
            else if (a.t === 'ink' && a.pts.length) page.drawSvgPath(inkPath(a.pts), { x: cb.x, y: cb.y + cb.height, borderColor: hex(lib, a.color), borderWidth: a.size, borderLineCap: LineCapStyle.Round });
            else if (a.t === 'text' && a.text) {
                // the mark's own frame, turned with it (CSS rotate(-rot)): right and down, in page points
                const r = -(a.rot || 0) * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
                const at = (dx, dy) => ({ x: X(a.x + dx * c - dy * sn), y: Y(a.y + dx * sn + dy * c) });
                const f = await embed((FONTS[a.font] || FONTS.sans).pdf[(a.bold ? 1 : 0) + (a.italic ? 2 : 0)]);
                const lh = a.size * 1.2, base = a.size * 0.94;
                if (hasKeydown(a.text) || safe(a.text, f) !== a.text) {
                    // Keydown (or letters the standard fonts lack): a picture of the text as it looks, plus invisible real text for search and copy
                    const pic = await rasterText(a);
                    const im = await out.embedPng(pic.png);
                    const bl = at(-RASTER_PAD, pic.h - RASTER_PAD);
                    page.drawImage(im, { x: bl.x, y: bl.y, width: pic.w, height: pic.h, rotate: degrees(a.rot || 0) });
                    const o = at(0, base);
                    page.drawText(safe(pic.plain, f), { x: o.x, y: o.y, size: a.size, font: f, lineHeight: lh, opacity: 0, rotate: degrees(a.rot || 0) });
                } else {
                    const o = at(0, base);
                    page.drawText(a.text, { x: o.x, y: o.y, size: a.size, font: f, color: hex(lib, a.color), lineHeight: lh, rotate: degrees(a.rot || 0) });
                    // underline and strikethrough are real lines under / through each line of text
                    a.text.split('\n').forEach((line, k) => {
                        const w = f.widthOfTextAtSize(line, a.size);
                        if (!w) return;
                        const y0 = base + k * lh;
                        const rule = (dy) => page.drawLine({ start: at(0, y0 + dy), end: at(w, y0 + dy), thickness: Math.max(0.5, a.size * 0.06), color: hex(lib, a.color) });
                        if (a.underline) rule(a.size * 0.12);
                        if (a.strike) rule(-a.size * 0.3);
                    });
                }
            } else if (a.t === 'img') {
                let im = images.get(a.data);
                if (!im) { im = /^data:image\/jpe?g/i.test(a.data) ? await out.embedJpg(a.data) : await out.embedPng(a.data); images.set(a.data, im); }
                const r = -(a.rot || 0) * Math.PI / 180;
                const sx = a.x - a.h * Math.sin(r), sy = a.y + a.h * Math.cos(r);
                page.drawImage(im, { x: X(sx), y: Y(sy), width: a.w, height: a.h, rotate: degrees(a.rot || 0) });
            }
        }
    }
    out.setTitle(cur.name);
    out.setProducer('Peeker (Radii Office)');
    return out.save();
}
async function download(indices, suffix) {
    if (!cur) return;
    toast('Building your PDF…');
    try {
        const data = await buildPdf(indices);
        const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = (cur.name || 'document').replace(/[\\/:*?"<>|]+/g, '_') + suffix + '.pdf';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast('Saved ' + a.download + '!');
    } catch (e) {
        console.error(e);
        toast(String(e && e.message) === 'encrypted' ? 'Locked PDFs can be viewed but not saved with edits!' : 'Saving failed: ' + why(e), 9000);
    }
}

/* ---------- Zoom ---------- */
function setZoom(z, fit) {
    if (!cur) return;
    const anchor = viewer.scrollTop / Math.max(1, pagesEl.scrollHeight);
    fitMode = !!fit;
    zoom = fit ? fitZoom() : Math.max(0.25, Math.min(4, z));
    rebuild();
    viewer.scrollTop = anchor * pagesEl.scrollHeight;
}
$('zoom-in').onclick = () => setZoom(zoom * 1.2);
$('zoom-out').onclick = () => setZoom(zoom / 1.2);
$('zoom-fit').onclick = () => setZoom(0, true);
let resizeTimer = null;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (cur && fitMode) setZoom(0, true); }, 200); });

/* ---------- Buttons, files, keys ---------- */
$('open-btn').onclick = () => $('file-open').click();
$('empty-open').onclick = () => $('file-open').click();
$('blank-btn').onclick = newBlank;
$('merge-btn').onclick = () => $('file-merge').click();
$('save-btn').onclick = () => download(cur.pages.map((_, i) => i), '-edited');
$('extract-btn').onclick = () => {
    const list = pickedPages();
    download(list, list.length === 1 ? '-page' + (list[0] + 1) : '-pages');
    if (picked.size < 2) toast('Tip: Ctrl+click thumbnails to extract several pages!');
};
$('forms-btn').onclick = openForms;
$('find-btn').onclick = openFind;
$('undo-btn').onclick = undo;
$('redo-btn').onclick = redo;
$('del-mark-btn').onclick = deleteSelected;
$('file-open').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; openFiles(f); });
$('file-merge').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) mergeFile(f); });
$('doc-list').addEventListener('click', (e) => {
    const item = e.target.closest('.doc-item');
    if (!item) return;
    if (e.target.closest('.doc-del')) deleteDoc(item.dataset.id); else openDoc(item.dataset.id);
});
$('doc-name').addEventListener('input', (e) => { if (!cur) return; cur.name = e.target.value.trim().slice(0, 120) || 'Untitled'; save(); });

let dragDepth = 0;
const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
window.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragDepth++; $('drop-veil').classList.add('on'); } });
window.addEventListener('dragleave', (e) => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; $('drop-veil').classList.remove('on'); } });
window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    $('drop-veil').classList.remove('on');
    openFiles(e.dataTransfer.files);
});

document.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (cur) $('save-btn').click(); return; }
    if (mod && e.key.toLowerCase() === 'f') { if (cur) { e.preventDefault(); openFind(); } return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(zoom * 1.2); return; }
    if (mod && e.key === '-') { e.preventDefault(); setZoom(zoom / 1.2); return; }
    if (mod && e.key === '0') { e.preventDefault(); setZoom(0, true); return; }
    // Ctrl+B / Ctrl+I / Ctrl+U on a picked text mark
    const picked1 = selected();
    if (mod && picked1 && picked1.t === 'text' && /^[biu]$/i.test(e.key)) { e.preventDefault(); const f = { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]; setTextStyle(f, !style.text[f]); return; }
    if (mod) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { e.preventDefault(); deleteSelected(); return; }
    if (e.key === 'Escape') { if (!$('sign-modal').hidden) $('sign-modal').hidden = true; else if (selId) select(null); else closePanel(); return; }
    const keys = { v: 'select', e: 'edit', t: 'text', h: 'hl', d: 'ink', b: 'box', w: 'white' };
    if (keys[e.key.toLowerCase()] && cur) { setTool(keys[e.key.toLowerCase()]); return; }
    if (cur && (e.key === 'PageDown' || e.key === 'PageUp') && !e.altKey) { e.preventDefault(); setCurrent(curPage + (e.key === 'PageDown' ? 1 : -1), true); }
});

/* ---------- Boot ---------- */
(async () => {
    setTool('select');
    await renderDocList();
    let last = null;
    try { last = localStorage.getItem('peeker_last'); } catch (e) {}
    const list = await db.list();
    if (last && list.some((m) => m.id === last)) await openDoc(last);
    else rebuild();
    loadPdfjs().catch((e) => { $('empty-msg').textContent = why(e); });
})();

// for tests and the console!
window.Peeker = { openFiles, newBlank, buildPdf: (idx) => buildPdf(idx || cur.pages.map((_, i) => i)), state: () => ({ cur, zoom, tool, selId, curPage }), setTool, undo, redo };
})();
