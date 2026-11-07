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
    let mode = 'visual', src = null, applying = false, srcTimer = 0, viewTimer = 0, lastText = '', touched = false, lastSel = null;

    const css = document.createElement('style');
    css.textContent = [
        '.kd-modes{position:fixed;right:16px;bottom:46px;z-index:70;display:flex;gap:2px;padding:3px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(224,242,254,.94));border:1px solid rgba(2,132,199,.45);box-shadow:0 6px 18px rgba(3,105,161,.22);font:700 12px system-ui,sans-serif}',
        '.kd-modes button{font:inherit;border:0;background:none;color:#0369a1;padding:5px 12px;border-radius:999px;cursor:pointer}',
        '.kd-modes button[aria-pressed="true"]{background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}',
        '.kd-src{display:none;box-sizing:border-box;width:100%;min-height:70vh;margin:0;padding:22px 26px;border:1px solid rgba(2,132,199,.35);border-radius:10px;background:#fff;color:#0f172a;font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;resize:vertical;tab-size:4}',
        'body.kd-mode-source .kd-src{display:block}',
        'body.kd-mode-source #wysiwyg-canvas,body.kd-mode-source #wo-sheets,body.kd-mode-source #bb-sheets{display:none!important}',
        'body.kd-mode-source .kd-src{position:relative;z-index:8;min-height:60vh}',
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
                if (mode === 'source') lastText = textNow();
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
        ['pointerdown', 'keydown', 'focus'].forEach(function (t) { src.addEventListener(t, function () { touched = true; }); });
        // where the caret is, as the box last said (the page may move it when a ribbon button takes the focus)
        ['select', 'keyup', 'mouseup', 'input', 'blur', 'click'].forEach(function (t) { src.addEventListener(t, function () { lastSel = [src.selectionStart, src.selectionEnd]; }); });
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


    /* ---------- things added while in Source (Skills, Insert, emoji...) are written into the text box, where the caret is ---------- */
    const INLINE_TAGS = /^(SPAN|A|B|I|U|S|EM|STRONG|CODE|SUB|SUP|MARK|IMG|FONT|BR|SMALL|KBD|ABBR)$/;
    function srcInsert(text, block) {
        const s = ensureSrc(), v = s.value;
        let a = v.length, z = v.length;
        // (the caret stays where you left it when you click a ribbon button; before you touch the box, things go at the end)
        if (touched) { const sel = lastSel || [s.selectionStart, s.selectionEnd]; a = Math.min(v.length, sel[0] || 0); z = Math.min(v.length, sel[1] || 0); }
        let ins = String(text);
        if (block) { if (a > 0 && v.charAt(a - 1) !== '\n') ins = '\n' + ins; if (!/\n$/.test(ins) && v.charAt(z) !== '\n') ins += '\n'; }
        s.setRangeText(ins, a, z, 'end');
        touched = true; lastSel = [s.selectionStart, s.selectionEnd];
        lastText = textNow();
        s.dispatchEvent(new Event('input'));
        try { s.scrollTop = Math.max(s.scrollTop, 0); } catch (e) {}
    }
    function nodeToText(node) {
        if (node.nodeType === 3) return { text: node.nodeValue, block: false };
        if (node.nodeType !== 1) return { text: '', block: false };
        const w = document.createElement('div');
        w.appendChild(node.cloneNode(true));
        let text = '';
        try { text = kdDoc.sourceOf(w).replace(/\n+$/, ''); } catch (e) { text = w.textContent || ''; }
        return { text: text, block: !INLINE_TAGS.test(node.tagName) || text.indexOf('\n') !== -1 };
    }
    // the editors' "put this at the caret" helper: in Source it types the node's Keydown text into the box instead
    ['fmtInsertNodeAtCaret'].forEach(function (name) {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function (node) {
            if (mode === 'source' && node) {
                const t = nodeToText(node);
                if (t.text) { srcInsert(t.text, t.block); return true; }
            }
            return orig.apply(this, arguments);
        };
    });
    // anything else that changes the page while Source is open (a plugin, a dialog) is added to the box the same way:
    // the new text is compared with the old, and what is new goes in at the caret
    let diffTimer = 0;
    function followPage() {
        if (mode !== 'source' || !src || applying) return;
        const now = textNow();
        if (now === lastText) return;
        if (src.value === now) { lastText = now; return; }
        const old = lastText;
        let pre = 0;
        while (pre < old.length && pre < now.length && old.charAt(pre) === now.charAt(pre)) pre++;
        let suf = 0;
        while (suf < old.length - pre && suf < now.length - pre && old.charAt(old.length - 1 - suf) === now.charAt(now.length - 1 - suf)) suf++;
        const added = now.slice(pre, now.length - suf), removed = old.length - pre - suf;
        lastText = now;
        // (a different page opened, or text was replaced: show that page; plain additions go in at the caret)
        if (!added || removed) { src.value = now; return; }
        srcInsert(added, /\n/.test(added) || /^\s*$/.test(old.charAt(pre - 1) || '\n'));
    }


    // Formatting buttons in Source work on the text: Bold and Italic wrap the picked text in ** and *, the list buttons put "* " in front of the lines
    function srcRange() {
        const s = ensureSrc(), v = s.value;
        const sel = touched ? (lastSel || [s.selectionStart, s.selectionEnd]) : [v.length, v.length];
        return [Math.min(v.length, sel[0] || 0), Math.min(v.length, sel[1] || 0)];
    }
    function srcDone(a, z) { const s = src; s.setSelectionRange(a, z); touched = true; lastSel = [a, z]; s.dispatchEvent(new Event('input')); }
    function srcWrap(mark) {
        const s = ensureSrc(), r = srcRange(), v = s.value, picked = v.slice(r[0], r[1]), m = mark.length;
        if (picked.length >= 2 * m && picked.slice(0, m) === mark && picked.slice(-m) === mark && !(mark === '*' && picked.slice(0, 2) === '**')) {
            s.setRangeText(picked.slice(m, picked.length - m), r[0], r[1], 'select');
        } else s.setRangeText(mark + picked + mark, r[0], r[1], 'select');
        srcDone(s.selectionStart, s.selectionEnd);
    }
    function srcBullets() {
        const s = ensureSrc(), r = srcRange(), v = s.value;
        const from = v.lastIndexOf('\n', r[0] - 1) + 1;
        let to = v.indexOf('\n', r[1]); if (to < 0) to = v.length;
        const lines = v.slice(from, to).split('\n'), all = lines.every(function (l) { return /^\*\s/.test(l) || !l.trim(); });
        const out = lines.map(function (l) { return !l.trim() ? l : (all ? l.replace(/^\*\s+/, '') : (/^\*\s/.test(l) ? l : '* ' + l)); }).join('\n');
        s.setRangeText(out, from, to, 'select');
        srcDone(s.selectionStart, s.selectionEnd);
    }
    let shimmed = false;
    function installShims() {
        if (shimmed) return;
        shimmed = true;
        const exec = document.execCommand.bind(document);
        document.execCommand = function (cmd) {
            if (mode === 'source') {
                if (cmd === 'bold') { srcWrap('**'); return true; }
                if (cmd === 'italic') { srcWrap('*'); return true; }
                if (cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') { srcBullets(); return true; }
            }
            return exec.apply(document, arguments);
        };
        if (window.KdBlockEditor && typeof window.KdBlockEditor.toggleList === 'function') {
            const tl = window.KdBlockEditor.toggleList;
            window.KdBlockEditor.toggleList = function () { if (mode === 'source') { srcBullets(); return true; } return tl.apply(this, arguments); };
        }
        // Annotate draws on the page itself, so it needs the page showing
        if (window.AnnotateInk && typeof window.AnnotateInk.start === 'function') {
            const st = window.AnnotateInk.start;
            window.AnnotateInk.start = function () { if (mode === 'source') { toast('Annotate draws right on the page: switch to Visual mode to use it!'); return; } return st.apply(this, arguments); };
        }
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
                    installShims();
                    ensureSrc().value = textNow();
                    lastText = src.value; touched = false; lastSel = null;
                    paintBar();
                    setTimeout(function () { try { src.focus(); src.setSelectionRange(0, 0); src.scrollTop = 0; } catch (e) {} touched = false; }, 0);
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
        if (mode === 'view') { clearTimeout(viewTimer); viewTimer = setTimeout(function () { if (mode === 'view' && !applying) build(textNow()); }, 120); }
    }).observe(ed, { childList: true });
    new MutationObserver(function () { if (mode === 'source' && src && !applying) { clearTimeout(diffTimer); diffTimer = setTimeout(followPage, 40); } }).observe(ed, { childList: true, subtree: true, characterData: true });

    window.KdModes = { set: set, get: function () { return mode; }, sourceText: textNow };
    paintBar();
    // the mode you used last comes back (once the page has loaded)
    setTimeout(function () {
        let m = 'visual';
        try { m = localStorage.getItem(KEY) || 'visual'; } catch (e) {}
        if (m !== 'visual') set(m);
    }, 900);
})();
