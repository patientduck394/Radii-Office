/* =====================================================================
   Three ways to work on a page, in Writeout and Bitbook (like a wiki's Read / Edit / Edit source):
     View    no editing: the whole page is read from its Keydown text again, so everything is formatted
     Visual  the normal editor (type, Enter formats a line, the ribbon works)
     Source  the page as Keydown text in a plain text box; going back to View or Visual formats ALL of it
   Source mode is the sure way to fix anything that did not format (a $$ equation over several lines,
   tags cut apart by colors...): the page is built again from its text, as a whole.
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed || !window.kdDoc || typeof kdDoc.sourceOf !== 'function' || typeof kdDoc.toEditorHtml !== 'function') return;
    const APP = /\/bitbook\//i.test(location.pathname) ? 'bitbook' : 'writeout';
    const KEY = APP + '_edit_mode';
    const OS = window.OfficeShell || null;
    const toast = function (m) { try { if (OS) OS.toast(m); } catch (e) {} };
    let mode = 'visual', src = null, applying = false, srcTimer = 0, viewTimer = 0;

    const css = document.createElement('style');
    css.textContent = [
        '.kd-modes{position:fixed;right:16px;bottom:46px;z-index:70;display:flex;gap:2px;padding:3px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(224,242,254,.94));border:1px solid rgba(2,132,199,.45);box-shadow:0 6px 18px rgba(3,105,161,.22);font:700 12px system-ui,sans-serif}',
        '.kd-modes button{font:inherit;border:0;background:none;color:#0369a1;padding:5px 12px;border-radius:999px;cursor:pointer}',
        '.kd-modes button[aria-pressed="true"]{background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}',
        '.kd-src{display:none;box-sizing:border-box;width:100%;min-height:70vh;margin:0;padding:22px 26px;border:1px solid rgba(2,132,199,.35);border-radius:10px;background:#fff;color:#0f172a;font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;resize:vertical;tab-size:4}',
        'body.kd-mode-source .kd-src{display:block}',
        'body.kd-mode-source #wysiwyg-canvas,body.kd-mode-source #wo-sheets{display:none!important}',
        'body.kd-mode-view #wysiwyg-canvas,body.kd-mode-view #wysiwyg-canvas *{caret-color:transparent}',
        'body.kd-mode-view #wysiwyg-canvas [contenteditable="true"]{cursor:default}',
        '@media print{.kd-modes{display:none}}'
    ].join('\n');
    document.head.appendChild(css);

    /* ---------- the switch ---------- */
    const bar = document.createElement('div');
    bar.className = 'kd-modes';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Editing mode');
    bar.innerHTML = '<button type="button" data-m="view" title="View: read the page, fully formatted (no editing)">👁 View</button>' +
        '<button type="button" data-m="visual" title="Visual: edit the formatted page">✏️ Visual</button>' +
        '<button type="button" data-m="source" title="Source: edit the page as Keydown text">&lt;/&gt; Source</button>';
    bar.addEventListener('mousedown', function (e) { e.preventDefault(); });
    bar.addEventListener('click', function (e) { const b = e.target.closest('[data-m]'); if (b) set(b.dataset.m); });
    document.body.appendChild(bar);
    function paintBar() {
        bar.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === mode)); });
        ['view', 'visual', 'source'].forEach(function (m) { document.body.classList.toggle('kd-mode-' + m, m === mode); });
        try { if (OS) OS.sync(); } catch (e) {}
    }

    /* ---------- page <-> Keydown text ---------- */
    function save() { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} }
    function hydrate() {
        try { if (typeof kdHydrateInteractions === 'function') kdHydrateInteractions(); } catch (e) {}
        try { if (window.BitLang && window.BitLang.hydrate) window.BitLang.hydrate(ed); } catch (e) {}
        try { if (typeof kdRenderOutline === 'function') kdRenderOutline(); } catch (e) {}
    }
    // builds the page again from Keydown text, as a whole (the same way a .kd file opens)
    function build(text) {
        return kdDoc.toEditorHtml(String(text || '')).then(function (html) {
            applying = true;
            try {
                ed.innerHTML = html && html.trim() ? html : '<div><br></div>';
                // every line is its own editable box in these editors
                if (ed.getAttribute('contenteditable') === 'false') {
                    Array.from(ed.children).forEach(function (c) { if (!c.hasAttribute('contenteditable') && !c.hidden) c.setAttribute('contenteditable', 'true'); });
                }
                hydrate();
                save();
            } finally { setTimeout(function () { applying = false; }, 0); }
        });
    }
    function textNow() { return kdDoc.sourceOf(ed).replace(/\n{3,}/g, '\n\n'); }

    /* ---------- Source ---------- */
    function ensureSrc() {
        if (src) return src;
        src = document.createElement('textarea');
        src.className = 'kd-src';
        src.spellcheck = false;
        src.setAttribute('aria-label', 'Page source (Keydown text)');
        ed.parentNode.insertBefore(src, ed.nextSibling);
        // typing keeps the page (and its save) up to date, a moment after you stop
        src.addEventListener('input', function () { clearTimeout(srcTimer); srcTimer = setTimeout(function () { build(src.value); }, 700); });
        // leaving the box (for another page tab, the ribbon...) saves what you typed right away
        src.addEventListener('blur', function () { if (srcTimer) { clearTimeout(srcTimer); srcTimer = 0; build(src.value); } });
        src.addEventListener('keydown', function (e) {
            if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                // Tab puts one | at the start of each picked line (one | is one indent step), and Shift+Tab takes one away!
                e.preventDefault();
                const v = src.value, a = src.selectionStart, z = src.selectionEnd;
                const from = v.lastIndexOf('\n', a - 1) + 1;
                let to = v.indexOf('\n', z > a && v.charAt(z - 1) === '\n' ? z - 1 : z);
                if (to < 0) to = v.length;
                let moved = 0, first = 0;
                const out = v.slice(from, to).split('\n').map(function (ln, k) {
                    if (!e.shiftKey) { if (k === 0) first = 1; moved++; return '|' + ln; }
                    const m = /^[\t|]/.test(ln); if (m) { if (k === 0) first = -1; moved--; return ln.slice(1); }
                    return ln;
                }).join('\n');
                src.setRangeText(out, from, to, 'preserve');
                const na = Math.max(from, a + first), nz = Math.max(na, z + moved);
                src.setSelectionRange(na, nz);
                src.dispatchEvent(new Event('input'));
            }
        });
        return src;
    }

    /* ---------- View: no editing ---------- */
    const NAV = /^(Arrow|Page|Home|End|Escape|Tab|F\d+)/;
    function blockKeys(e) {
        if (mode !== 'view' || !ed.contains(e.target)) return;
        if (NAV.test(e.key) || ((e.metaKey || e.ctrlKey) && /^[acfp]$/i.test(e.key))) return;   // moving, copying, finding, printing
        e.preventDefault(); e.stopImmediatePropagation();
    }
    function blockInput(e) { if (mode === 'view' && ed.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } }
    document.addEventListener('keydown', blockKeys, true);
    ['beforeinput', 'paste', 'drop', 'cut'].forEach(function (t) { document.addEventListener(t, blockInput, true); });

    /* ---------- switching ---------- */
    let busy = Promise.resolve();
    function set(m) {
        if (!/^(view|visual|source)$/.test(m) || m === mode) return busy;
        const from = mode;
        busy = busy.then(function () {
            clearTimeout(srcTimer);
            // leaving Source: the text becomes the page (all of it formatted)
            const fromSource = from === 'source' && src ? build(src.value) : Promise.resolve();
            return fromSource.then(function () {
                mode = m;
                try { localStorage.setItem(KEY, m); } catch (e) {}
                if (m === 'source') {
                    ensureSrc().value = textNow();
                    paintBar();
                    setTimeout(function () { try { src.focus(); src.setSelectionRange(0, 0); src.scrollTop = 0; } catch (e) {} }, 0);
                    return;
                }
                if (m === 'view') {
                    // read the page again from its text, so everything on it is formatted
                    return build(textNow()).then(function () { paintBar(); try { ed.blur(); } catch (e) {} });
                }
                paintBar();
            });
        }).catch(function (e) { try { console.error('[Keydown] mode switch failed', e); } catch (x) {} toast('Could not switch modes: ' + (e && e.message || e)); paintBar(); });
        return busy;
    }

    // another page tab (or a file) opened while in Source or View: show that page the same way
    new MutationObserver(function () {
        if (applying) return;
        if (mode === 'source' && src && document.activeElement !== src) src.value = textNow();
        else if (mode === 'view') { clearTimeout(viewTimer); viewTimer = setTimeout(function () { if (mode === 'view' && !applying) build(textNow()); }, 120); }
    }).observe(ed, { childList: true });

    window.KdModes = { set: set, get: function () { return mode; }, sourceText: textNow };
    paintBar();
    // the mode you used last comes back (once the page has loaded)
    setTimeout(function () {
        let m = 'visual';
        try { m = localStorage.getItem(KEY) || 'visual'; } catch (e) {}
        if (m !== 'visual') set(m);
    }, 900);
})();
