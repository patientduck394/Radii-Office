/* =====================================================================
   Chip guard! One shared rule for EVERY formatting chip in the note (Gel Orbs, Gel Bubbles and all their
   cousins, Aero and Logo chips, Unique Chips, Custom Chips, Custom CSS chips, tag chips, Annotate highlights,
   effect text, Marketplace styles...):
   1. A chip is never empty. An empty inline chip would collapse to a thin line (it has no text to give it a
      height), so it always holds a zero-width placeholder and keeps its full chip shape and size!
   2. Deleting the last letter of a chip (Backspace, Delete, word delete or deleting a selection inside it) leaves
      the empty chip in place with the caret inside, so typing goes right back into it! Only a Backspace on an
      already empty chip removes it, and Delete on an empty chip hops over it!
   3. Typing into an emptied chip drops the placeholder, so the saved text stays clean!
   (Bold, italic, underline and the like are handled by each app's own code.)
   window.KdChips = { sel: () => selector, host, seed }
   ===================================================================== */
(function () {
    'use strict';
    const MARK = '​';
    const canvas = document.getElementById('wysiwyg-canvas');
    if (!canvas) return;

    const BASE = [
        '.gel-orb', 'span[class*="-chip"]', 'span[class*="gel-chip-"]', 'span[class*="megachip-"]', 'span[class*="droplet-"]',
        'span[class*="effect-"]', 'span[class*="mkt-"]', 'span[class*="orange-hl-"]', 'span[class*="dev-chip-"]',
        '.uni-chip', '.cc-chip', '.us-chip', '.bbcss-chip', 'mark.an-hl', '.spark-text', '.liquid-underline',
        '.glossy-border-badge', '.cyber-glow-spark', '.liquid-text-glow', '.aqua-bubble-text', '.reflected-text-block',
        '.embossed-glass-text', '.kinetic-wave-text'
    ].join(', ');
    // plus whatever styles the app itself knows about (and the Marketplace's)
    function selector() {
        let s = BASE;
        try { if (typeof FMT_STYLE_SPAN_SEL === 'string') s += ', ' + FMT_STYLE_SPAN_SEL; } catch (e) {}
        try { if (typeof fmtMarketplaceSuffix === 'function') s += fmtMarketplaceSuffix(); } catch (e) {}
        return s;
    }
    function lockedPieces(c) { return c.querySelector('input, textarea, button, select, [contenteditable="false"]'); }
    // the innermost chip around a node (never an applet or a chip holding locked pieces)
    function host(node) {
        const el = node && (node.nodeType === 3 ? node.parentElement : node);
        if (!el || !el.closest) return null;
        let s = null;
        try { s = el.closest(selector()); } catch (e) { return null; }
        while (s) {
            if (s !== canvas && canvas.contains(s) && s.getAttribute('contenteditable') !== 'false' && s.isContentEditable && !lockedPieces(s)) return s;
            s = s.parentElement && s.parentElement.closest ? s.parentElement.closest(selector()) : null;
        }
        return null;
    }
    const text = (el) => (el.textContent || '').split(MARK).join('');
    const save = () => { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} };
    function caretIn(el) {
        let t = el.lastChild;
        if (!t || t.nodeType !== 3) { t = document.createTextNode(MARK); el.appendChild(t); }
        const r = document.createRange();
        r.setStart(t, t.length);
        r.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
    }
    // swaps a chip's whole text for the placeholder (a normal edit, so Undo brings the letters back)
    function keep(el) {
        const sel = window.getSelection();
        try {
            const r = document.createRange();
            r.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(r);
            document.execCommand('insertText', false, MARK);
        } catch (e) {}
        if (!el.isConnected) return false; // (the browser dropped it)
        if (text(el) !== '' || (el.textContent || '').indexOf(MARK) === -1) el.textContent = MARK;
        el.setAttribute('data-empty-style', '1');
        caretIn(el);
        return true;
    }
    // a brand new empty chip at the caret (made by any menu) gets its placeholder, so it has its full size
    function seed() {
        const s = window.getSelection();
        if (!s || !s.rangeCount || !s.isCollapsed) return;
        const h = host(s.anchorNode);
        if (!h || (h.textContent || '') !== '') return;
        while (h.firstChild) h.removeChild(h.firstChild);
        h.appendChild(document.createTextNode(MARK));
        h.setAttribute('data-empty-style', '1');
        caretIn(h);
    }
    let seedT = 0;
    document.addEventListener('selectionchange', function () {
        if (seedT) return;
        seedT = setTimeout(function () { seedT = 0; seed(); }, 0);
    });

    canvas.addEventListener('beforeinput', function (ev) {
        try {
            const type = ev.inputType || '';
            if (type.indexOf('delete') !== 0 || ev.isComposing || type === 'deleteByCut' || type === 'deleteByDrag') return;
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const cur = sel.getRangeAt(0);
            if (!canvas.contains(cur.commonAncestorContainer)) return;
            const backward = /Backward/.test(type);
            // what would this keypress delete?
            let target = null;
            try {
                const tr = ev.getTargetRanges ? ev.getTargetRanges() : [];
                if (tr && tr.length === 1) {
                    target = document.createRange();
                    target.setStart(tr[0].startContainer, tr[0].startOffset);
                    target.setEnd(tr[0].endContainer, tr[0].endOffset);
                }
            } catch (e) { target = null; }
            if (!target) target = cur.cloneRange();
            // the chip this deletion lives in (or the one chip it exactly covers)
            let h = host(target.commonAncestorContainer);
            if (!h && target.startContainer === target.endContainer && target.endOffset - target.startOffset === 1) {
                const n = target.startContainer.childNodes && target.startContainer.childNodes[target.startOffset];
                if (n && n.nodeType === 1 && host(n) === n) h = n;
            }
            if (!h && sel.isCollapsed) {
                const at = host(cur.startContainer);
                if (at && text(at) === '') h = at;
            }
            if (!h) return;
            if (text(h) === '') {
                // already empty. Backspace removes it, Delete hops over it and deletes what is next
                ev.preventDefault();
                const r = document.createRange();
                r.setStartAfter(h);
                r.collapse(true);
                if (backward) {
                    const parent = h.parentNode;
                    const idx = Array.prototype.indexOf.call(parent.childNodes, h);
                    h.remove();
                    r.setStart(parent, Math.min(idx, parent.childNodes.length));
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                } else {
                    sel.removeAllRanges();
                    sel.addRange(r);
                    try { document.execCommand('forwardDelete'); } catch (e) {}
                }
                save();
                return;
            }
            // this deletion would wipe the chip's whole text, so empty it but keep it
            const gone = target.toString().split(MARK).join('');
            if (!gone || gone !== text(h)) return;
            ev.preventDefault();
            keep(h);
            save();
        } catch (e) {}
    }, true);

    // real text arrived in an emptied chip, so the placeholder goes and the caret stays put
    canvas.addEventListener('input', function () {
        try {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const h = host(sel.anchorNode);
            if (!h || !h.hasAttribute('data-empty-style') || text(h) === '') return;
            const an = sel.anchorNode, ao = sel.anchorOffset;
            let off = ao;
            const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(function (t) {
                if (t.data.indexOf(MARK) === -1) return;
                if (t === an) off = ao - (t.data.slice(0, ao).split(MARK).length - 1);
                t.data = t.data.split(MARK).join('');
            });
            h.removeAttribute('data-empty-style');
            if (an && an.nodeType === 3 && an.isConnected) {
                const r = document.createRange();
                r.setStart(an, Math.max(0, Math.min(off, an.length)));
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
            }
        } catch (e) {}
    });

    window.KdChips = { sel: selector, host: host, seed: seed, handlesChips: true };
})();
