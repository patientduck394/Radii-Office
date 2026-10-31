/* =====================================================================
   draw.io diagrams! Opens the draw.io editor (embed mode, from embed.diagrams.net)
   in a window over the page, and brings the finished diagram back as a PNG
   picture. draw.io tucks the diagram itself inside that PNG, so double-
   clicking the picture later opens it again, fully editable!
   draw.io is © draw.io Ltd (previously JGraph) and draw.io AG, under the
   Apache License 2.0; Radii Office is not affiliated with draw.io (see NOTICE).
   Each app (Writeout, Bitbook, Imbuer, Amber) keeps an identical copy of this file!

   RadiiDrawio.open({ png, title, onDone({ png, w, h }) })
   (png: a picture made by draw.io earlier, to keep editing it)
   ===================================================================== */
(function () {
    'use strict';
    const ORIGIN = 'https://embed.diagrams.net';
    const URL_ = ORIGIN + '/?embed=1&proto=json&spin=1&libraries=1&saveAndExit=1&noSaveBtn=1&modified=unsavedChanges';
    let state = null;

    const CSS = '.rd-back{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:grid;place-items:center;padding:14px;backdrop-filter:blur(3px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '.rd-dlg{width:min(1400px,100%);height:min(900px,100%);display:flex;flex-direction:column;background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.45);overflow:hidden}' +
        '.rd-head{display:flex;align-items:center;gap:10px;padding:9px 14px;color:#fff;font-weight:800;font-size:14px;background:linear-gradient(180deg,var(--rd-a1,#38bdf8),var(--rd-a2,#0284c7))}' +
        '.rd-head span{flex:1}.rd-head small{font-weight:500;opacity:.9}' +
        '.rd-x{border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:6px;width:28px;height:28px;font-size:15px;cursor:pointer}' +
        '.rd-frame{flex:1;border:0;width:100%;background:#f8fafc}' +
        '.rd-msg{padding:40px;text-align:center;color:#475569;font-size:14px}' +
        '.rd-foot{padding:7px 14px;font-size:11px;line-height:1.45;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0}' +
        '.rd-foot a{color:inherit}';

    function ensureCss() {
        if (document.getElementById('rd-css')) return;
        const s = document.createElement('style');
        s.id = 'rd-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }
    function send(msg) { try { state.frame.contentWindow.postMessage(JSON.stringify(msg), ORIGIN); } catch (e) { /* the editor is gone */ } }
    function close() {
        if (!state) return;
        window.removeEventListener('message', state.onMsg);
        document.removeEventListener('keydown', state.onKey, true);
        clearTimeout(state.timer);
        state.el.remove();
        state = null;
    }
    // how big a PNG is, so the picture keeps its shape
    function sizeOf(png) {
        return new Promise((ok) => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => ok({ w: 400, h: 300 }); im.src = png; });
    }

    function open(opts) {
        opts = opts || {};
        close();
        ensureCss();
        const el = document.createElement('div');
        el.className = 'rd-back';
        if (opts.accent) {
            el.style.setProperty('--rd-a2', opts.accent);
            el.style.setProperty('--rd-a1', opts.accent2 || opts.accent);
        }
        el.innerHTML = '<div class="rd-dlg" role="dialog" aria-label="draw.io"><div class="rd-head"><span>draw.io' +
            ' <small>· ' + (opts.png ? 'editing a diagram' : 'a new diagram') + ' · press Save &amp; Exit when you are done</small></span><button type="button" class="rd-x" title="Close without saving">✕</button></div>' +
            '<iframe class="rd-frame" title="draw.io diagram editor" src="' + URL_ + '" allow="clipboard-read; clipboard-write"></iframe>' +
            // the disclaimer: draw.io is someone else's trademark and product
            '<div class="rd-foot">draw.io is a registered trademark of draw.io Ltd (EU trademark #018062448). Radii Office is not affiliated with, endorsed by or sponsored by draw.io. ' +
            'The editor above is the official draw.io editor, loaded from embed.diagrams.net; its source code is available under the ' +
            '<a href="https://github.com/jgraph/drawio" target="_blank" rel="noopener noreferrer">Apache License 2.0</a>. Diagrams you make are yours.</div></div>';
        document.body.appendChild(el);
        state = { el, opts, frame: el.querySelector('.rd-frame'), ready: false };
        state.onKey = (e) => { if (e.key === 'Escape' && document.activeElement !== state.frame) { e.preventDefault(); close(); } };
        document.addEventListener('keydown', state.onKey, true);
        el.querySelector('.rd-x').addEventListener('click', close);
        // no answer from draw.io in 25 seconds: probably offline
        state.timer = setTimeout(() => {
            if (state && !state.ready) state.el.querySelector('.rd-foot').insertAdjacentHTML('beforebegin', '<p class="rd-msg">The draw.io editor did not load! It needs an internet connection (embed.diagrams.net). Close this and try again!</p>');
        }, 25000);
        state.onMsg = (e) => {
            if (!state || e.origin !== ORIGIN || e.source !== state.frame.contentWindow) return;
            let m;
            try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
            if (!m || !m.event) return;
            if (m.event === 'init') {
                state.ready = true;
                // a picture made by draw.io still holds its diagram, so it opens ready to edit
                send(state.opts.png ? { action: 'load', xmlpng: state.opts.png, autosave: 0 } : { action: 'load', xml: '', autosave: 0, title: state.opts.title || 'Diagram' });
            } else if (m.event === 'save') {
                // ask for a PNG that carries the diagram inside it (2x for sharp text)
                send({ action: 'export', format: 'xmlpng', spinKey: 'saving', scale: 2, border: 8 });
            } else if (m.event === 'export' && m.data) {
                const png = m.data;
                const cb = state.opts.onDone;
                close();
                if (cb) sizeOf(png).then((sz) => cb({ png, w: Math.round(sz.w / 2), h: Math.round(sz.h / 2) }));
            } else if (m.event === 'exit') {
                close();
            }
        };
        window.addEventListener('message', state.onMsg);
    }

    window.RadiiDrawio = { open, close };

    /* ---------- Writeout and Bitbook: diagrams go in at the caret, double-click one to edit it ---------- */
    const editor = () => document.getElementById('wysiwyg-canvas');
    if (!editor()) return;
    const KEY = location.pathname.indexOf('bitbook') !== -1 ? 'bitbook' : 'writeout';
    const THEME = KEY === 'bitbook' ? { accent: '#9333ea', accent2: '#d946ef' } : { accent: '#0284c7', accent2: '#38bdf8' };
    function placeDiagram(png, w, saved) {
        const ed = editor();
        ed.focus();
        try { if (saved) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); } } catch (e) {}
        const holder = document.createElement('span');
        holder.className = 'img-resize';
        const img = document.createElement('img');
        img.src = png;
        img.alt = 'Diagram';
        img.className = 'drawio-diagram';
        img.title = 'Double-click to edit this diagram!';
        img.style.width = Math.min(w, 640) + 'px';
        holder.appendChild(img);
        if (typeof fmtInsertNodeAtCaret === 'function') fmtInsertNodeAtCaret(holder); else ed.appendChild(holder);
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    }
    function openNew() {
        const ed = editor();
        let saved = null;
        try { const s = window.getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); } catch (e) {}
        open(Object.assign({ onDone: (r) => { placeDiagram(r.png, r.w, saved); try { if (window.OfficeShell) window.OfficeShell.toast('draw.io diagram added! Double-click it to edit it again!'); } catch (e) {} } }, THEME));
    }
    window.openDrawioDiagram = openNew;
    editor().addEventListener('dblclick', (e) => {
        const img = e.target.closest && e.target.closest('img.drawio-diagram');
        if (!img) return;
        e.preventDefault();
        open(Object.assign({ png: img.getAttribute('src'), onDone: (r) => {
            img.src = r.png;
            editor().dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
            try { if (window.OfficeShell) window.OfficeShell.toast('Diagram updated!'); } catch (err) {}
        } }, THEME));
    });
    // Classic Insert menu: "draw.io Diagram..." right under "Image..."!
    const imgItem = document.querySelector('#insert-menu-popup [data-insert="image"]');
    if (imgItem) {
        const b = imgItem.cloneNode(true);
        b.setAttribute('data-insert', 'drawio');
        if (b.lastChild && b.lastChild.nodeType === 3) b.lastChild.nodeValue = 'draw.io Diagram...';
        imgItem.after(b);
    }
    const orig = window.runInsertKind;
    if (typeof orig === 'function') {
        window.runInsertKind = function (kind) {
            if (kind === 'drawio') { try { if (typeof closeInsertMenu === 'function') closeInsertMenu(); } catch (e) {} openNew(); return; }
            return orig.apply(this, arguments);
        };
    }
})();
