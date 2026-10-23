/* =====================================================================
   Block Editor (Writeout + Bitbook)! Every line, heading and list item is
   its OWN text box, exactly like Omicron's cards, but the boxes sit flush
   together so the page still looks like one canvas!

   Because each box is a separate editable, browsers never get to guess how
   a multi-line selection should delete: we do it ourselves, the same way in
   every browser. A drag stays inside the box it started in (like Omicron),
   and Select All (Cmd/Ctrl+A) spans every box and deletes exactly what is
   highlighted!

   The canvas itself becomes read-only glue, and this file adds back what
   the browser used to do across the whole canvas: Enter splits a box,
   Backspace/Delete join boxes, arrow keys walk between boxes, paste breaks
   into boxes and undo/redo covers all of it!
   Identical copy in Writeout and Bitbook (loaded right after app.js)!
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed) return;

    const TEXT_BLOCKS = /^(DIV|P|H[1-6]|BLOCKQUOTE|PRE|LI)$/;
    const SKIP_TAGS = /^(SCRIPT|STYLE|TEMPLATE)$/;
    let busy = false;

    /* ---------- Structure: make every line its own editable box ---------- */
    function isBlockEl(n) { return n.nodeType === 1 && /^(DIV|P|H[1-6]|UL|OL|BLOCKQUOTE|PRE|TABLE|HR|FIGURE|SECTION|DETAILS|IMG|ASIDE|ARTICLE|HEADER|FOOTER|NAV)$/.test(n.tagName); }
    function makeEditable(el) {
        if (!el.hasAttribute('contenteditable')) el.setAttribute('contenteditable', 'true');
    }
    function ensureBlocks() {
        if (busy) return;
        busy = true;
        try {
            if (ed.getAttribute('contenteditable') !== 'false') ed.setAttribute('contenteditable', 'false');
            // 1. Loose text and inline nodes on the canvas get a box of their own!
            let run = null;
            [].slice.call(ed.childNodes).forEach(function (n) {
                if (n.nodeType === 8) { n.remove(); return; }
                if (n.nodeType === 1 && SKIP_TAGS.test(n.tagName)) { run = null; return; }
                if (isBlockEl(n)) { run = null; return; }
                if (n.nodeType === 3 && !/\S/.test(n.nodeValue) && !run) { n.remove(); return; }
                if (!run) { run = document.createElement('div'); ed.insertBefore(run, n); }
                run.appendChild(n);
                if (n.nodeType === 1 && n.tagName === 'BR') run = null;
            });
            // 1b. Quick blocks ("> ", "* ") land INSIDE the line's box: lift them to be the box itself!
            const sel0 = window.getSelection();
            const keepN = sel0.rangeCount ? sel0.anchorNode : null, keepO = sel0.rangeCount ? sel0.anchorOffset : 0;
            let lifted = false;
            [].slice.call(ed.children).forEach(function (b) {
                if (b.tagName !== 'DIV' || b.hasAttribute('contenteditable') && b.getAttribute('contenteditable') === 'false') return;
                if (b.className || b.getAttribute('style')) return;
                let only = null, extra = false;
                [].forEach.call(b.childNodes, function (c) {
                    if (c.nodeType === 3 && !(c.nodeValue || '').replace(/[\s​]/g, '')) return;
                    if (c.nodeName === 'BR') return;
                    if (!only && c.nodeType === 1 && /^(BLOCKQUOTE|UL|OL|H[1-6]|PRE)$/.test(c.tagName)) only = c; else extra = true;
                });
                if (only && !extra) { b.replaceWith(only); lifted = true; }
            });
            if (lifted && keepN && keepN.isConnected && ed.contains(keepN)) {
                const nb = blockOf(keepN);
                if (nb && nb.setAttribute) { nb.setAttribute('contenteditable', 'true'); }
                try { placeCaret(keepN, Math.min(keepO, keepN.nodeType === 3 ? keepN.nodeValue.length : keepN.childNodes.length)); } catch (e) {}
            }
            // 2. Every box is a separate editing host (lists: each item; tables: each cell)!
            [].forEach.call(ed.children, function (b) {
                if (b.hasAttribute('contenteditable') && b.getAttribute('contenteditable') === 'false') return;
                if (SKIP_TAGS.test(b.tagName) || /^(HR|IMG)$/.test(b.tagName)) return;
                if (/^(UL|OL)$/.test(b.tagName)) {
                    b.setAttribute('contenteditable', 'false');
                    [].forEach.call(b.children, function (li) { if (li.tagName === 'LI') makeEditable(li); });
                } else if (b.tagName === 'TABLE') {
                    b.setAttribute('contenteditable', 'false');
                    [].forEach.call(b.querySelectorAll('td, th'), makeEditable);
                } else makeEditable(b);
            });
            // 3. Never an empty canvas: always one box to type in!
            if (!ed.children.length) {
                const d = document.createElement('div');
                d.setAttribute('contenteditable', 'true');
                d.appendChild(document.createElement('br'));
                ed.appendChild(d);
            }
            markEmpty();
        } finally { busy = false; }
    }
    function markEmpty() {
        const only = ed.children.length === 1 ? ed.firstElementChild : null;
        const empty = !!only && !(only.textContent || '').replace(/[\s​]/g, '') && !only.querySelector('img, input, select, svg, canvas, [contenteditable="false"]');
        ed.toggleAttribute('data-empty', empty);
    }

    new MutationObserver(function (list) {
        for (let i = 0; i < list.length; i++) {
            const t = list[i].target;
            if (t === ed || t.parentNode === ed || (t.parentNode && t.parentNode.parentNode === ed) || (t.parentNode && t.parentNode.parentNode && t.parentNode.parentNode.parentNode === ed)) { ensureBlocks(); return; }
        }
    }).observe(ed, { childList: true, subtree: true });
    ed.addEventListener('input', markEmpty);

    // Style: boxes look like one continuous page!
    const css = document.createElement('style');
    css.textContent =
        '#wysiwyg-canvas [contenteditable="true"]{outline:none}' +
        '#wysiwyg-canvas[data-empty]>:first-child::before{content:var(--kd-ph,"Start typing…");float:left;height:0;color:#94a3b8;pointer-events:none;white-space:nowrap}';
    document.head.appendChild(css);
    try { const ph = ed.getAttribute('placeholder'); if (ph) ed.style.setProperty('--kd-ph', JSON.stringify(ph)); } catch (e) {}

    /* ---------- Helpers ---------- */
    // The box (editing host) a node lives in!
    function blockOf(node) {
        let n = node && (node.nodeType === 1 ? node : node.parentNode);
        while (n && n !== ed) {
            if (n.parentNode === ed) return n;
            if (n.tagName === 'LI' && n.parentNode && n.parentNode.parentNode === ed) return n;
            if ((n.tagName === 'TD' || n.tagName === 'TH') && n.closest('table') && n.closest('table').parentNode === ed) return n;
            n = n.parentNode;
        }
        return null;
    }
    function isTextBox(b) { return !!b && TEXT_BLOCKS.test(b.tagName) && b.getAttribute('contenteditable') === 'true'; }
    function allBoxes() {
        const out = [];
        [].forEach.call(ed.children, function (b) {
            if (/^(UL|OL)$/.test(b.tagName)) [].forEach.call(b.children, function (li) { if (li.tagName === 'LI') out.push(li); });
            else out.push(b);
        });
        return out;
    }
    function neighbor(b, dir) {
        const boxes = allBoxes().filter(function (x) { return x.getAttribute('contenteditable') === 'true'; });
        const i = boxes.indexOf(b);
        return i === -1 ? null : boxes[i + dir] || null;
    }
    function placeCaret(node, offset) {
        const r = document.createRange();
        try { r.setStart(node, offset); } catch (e) { r.selectNodeContents(node); r.collapse(true); }
        r.collapse(true);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
    }
    function caretToStart(b) {
        b.focus && b.focus({ preventScroll: true });
        const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
        const t = w.nextNode();
        if (t) placeCaret(t, 0); else placeCaret(b, 0);
    }
    function caretToEnd(b) {
        b.focus && b.focus({ preventScroll: true });
        const r = document.createRange();
        r.selectNodeContents(b);
        r.collapse(false);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
    }
    // Typing inside a program's code box (or any form field) is never ours to handle
    function isField(t) { return !!(t && t.tagName && /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName)); }
    function isBlank(b) {
        return !(b.textContent || '').replace(/[\s​]/g, '') && !b.querySelector('img, input, select, svg, canvas, hr, [contenteditable="false"]');
    }
    // Removing the focused box makes the browser drop focus to <body> on the next frame: take it back!
    function keepFocusSoon() {
        const s = window.getSelection();
        if (!s.rangeCount || !ed.contains(s.anchorNode)) return;
        const n = s.anchorNode, o = s.anchorOffset;
        const back = function () {
            const a = document.activeElement;
            if (n.isConnected && ed.contains(n) && (!a || a === document.body)) {
                const b = blockOf(n);
                if (b && b.focus) b.focus({ preventScroll: true });
                placeCaret(n, Math.min(o, n.nodeType === 3 ? n.nodeValue.length : n.childNodes.length));
            }
        };
        requestAnimationFrame(back);
        setTimeout(back, 30);
        setTimeout(back, 120);
    }
    function fire(target, type) {
        try { (target || ed).dispatchEvent(new InputEvent('input', { bubbles: true, inputType: type || 'insertText' })); } catch (e) {}
        keepFocusSoon();
    }
    function stripEmptyChips(root) {
        [].slice.call(root.querySelectorAll('span[class]')).forEach(function (s) {
            if (!(s.textContent || '').replace(/[\s​]/g, '') && !s.querySelector('input, select, img, [contenteditable="false"]')) s.remove();
        });
    }
    function ensureFiller(b) {
        if (!b.firstChild || isBlank(b) && !b.querySelector('br')) { if (!b.firstChild || !b.querySelector('br')) b.appendChild(document.createElement('br')); }
    }
    function atBoundary(b, range, end) {
        const r = document.createRange();
        r.selectNodeContents(b);
        if (end) r.setStart(range.endContainer, range.endOffset); else r.setEnd(range.startContainer, range.startOffset);
        const holder = r.cloneContents();
        return !(r.toString().replace(/​/g, '')) && !(holder.querySelector && holder.querySelector('img, input, select, svg, [contenteditable="false"]'));
    }

    /* ---------- Undo / redo (snapshots of the whole page) ---------- */
    const hasBitbookUndo = typeof window.bbUndo === 'function';
    const states = [], redo = [];
    let settleTimer = 0, applyingUndo = false;
    function textOffset() {
        const s = window.getSelection();
        if (!s.rangeCount || !ed.contains(s.anchorNode)) return 0;
        const r = document.createRange();
        r.selectNodeContents(ed);
        r.setEnd(s.anchorNode, s.anchorOffset);
        return r.toString().length;
    }
    function caretAtOffset(off) {
        const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
        let t, left = off;
        while ((t = w.nextNode())) {
            if (left <= t.nodeValue.length) { const b = blockOf(t); if (b) b.focus && b.focus({ preventScroll: true }); placeCaret(t, left); return; }
            left -= t.nodeValue.length;
        }
        const boxes = allBoxes();
        if (boxes.length) caretToEnd(boxes[boxes.length - 1]);
    }
    function snap() { return { html: ed.innerHTML, off: textOffset() }; }
    function settle() {
        clearTimeout(settleTimer);
        settleTimer = 0;
        if (hasBitbookUndo || applyingUndo) return;
        const s = snap();
        if (!states.length || states[states.length - 1].html !== s.html) { states.push(s); if (states.length > 200) states.shift(); redo.length = 0; }
        else states[states.length - 1].off = s.off;
    }
    function settleSoon() { if (hasBitbookUndo) return; clearTimeout(settleTimer); settleTimer = setTimeout(settle, 450); }
    if (!hasBitbookUndo) states.push(snap());
    ed.addEventListener('input', function () { if (!applyingUndo) settleSoon(); });
    function restore(s) {
        applyingUndo = true;
        try {
            ed.innerHTML = s.html;
            ensureBlocks();
            caretAtOffset(s.off);
            fire(ed, 'historyUndo');
        } finally { applyingUndo = false; }
    }
    function undo() {
        if (hasBitbookUndo) return window.bbUndo();
        if (settleTimer) settle();
        if (states.length < 2) return false;
        redo.push(states.pop());
        restore(states[states.length - 1]);
        return true;
    }
    function redoIt() {
        if (hasBitbookUndo) return window.bbRedo();
        if (!redo.length) return false;
        const s = redo.pop();
        states.push(s);
        restore(s);
        return true;
    }
    window.kdBlockUndo = undo;
    window.kdBlockRedo = redoIt;
    // Structural edits are their own undo steps!
    function checkpoint() { if (!hasBitbookUndo) settle(); }

    /* ---------- Enter: split the box ---------- */
    function exitList(li) {
        const list = li.parentNode;
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'true');
        div.appendChild(document.createElement('br'));
        const after = [];
        for (let n = li.nextElementSibling; n; n = n.nextElementSibling) after.push(n);
        if (after.length) {
            const tail = list.cloneNode(false);
            after.forEach(function (n) { tail.appendChild(n); });
            list.after(tail);
        }
        list.after(div);
        li.remove();
        if (!list.children.length) list.remove();
        return div;
    }
    function splitBox(b, range) {
        if (b.tagName === 'LI' && isBlank(b)) { const d = exitList(b); caretToStart(d); fire(d, 'insertParagraph'); return d; }
        // Enter on an empty quote or code line leaves it (back to a plain line)!
        if (/^(BLOCKQUOTE|PRE)$/.test(b.tagName) && isBlank(b)) { const d = retag(b, 'div'); caretToStart(d); fire(d, 'insertParagraph'); return d; }
        const tail = document.createRange();
        tail.setStart(range.startContainer, range.startOffset);
        tail.setEnd(b, b.childNodes.length);
        const frag = tail.extractContents();
        const wasHeading = /^H[1-6]$/.test(b.tagName);
        const rest = !isBlank({ textContent: frag.textContent || '', querySelector: function () { return frag.querySelector('img, input, select, svg, [contenteditable="false"]'); } });
        const nb = (wasHeading && !rest) ? document.createElement('div') : b.cloneNode(false);
        nb.removeAttribute('data-rb');
        nb.removeAttribute('id');
        nb.setAttribute('contenteditable', 'true');
        nb.appendChild(frag);
        stripEmptyChips(nb);
        ensureFiller(nb);
        ensureFiller(b);
        b.after(nb);
        caretToStart(nb);
        fire(nb, 'insertParagraph');
        return nb;
    }
    window.kdSplitBlock = function () {
        const s = window.getSelection();
        if (!s.rangeCount) return null;
        const b = blockOf(s.getRangeAt(0).startContainer);
        return isTextBox(b) ? splitBox(b, s.getRangeAt(0)) : null;
    };

    /* ---------- Join boxes (Backspace at the start / Delete at the end) ---------- */
    function cleanupParent(p) {
        while (p && p !== ed && !p.firstChild) { const up = p.parentNode; p.remove(); p = up; }
    }
    // Moves everything from `from` into the end of `into`, caret at the seam!
    function joinInto(into, from) {
        const parent = from.parentNode;
        if (isBlank(into) && !into.querySelector('img, input, select, svg, [contenteditable="false"]')) [].slice.call(into.querySelectorAll('br')).forEach(function (x) { x.remove(); });
        const idx = into.childNodes.length;
        const wasOnlyBr = from.childNodes.length === 1 && from.firstChild.nodeName === 'BR';
        if (!wasOnlyBr) while (from.firstChild) into.appendChild(from.firstChild);
        from.remove();
        cleanupParent(parent);
        ensureFiller(into);
        placeCaret(into, Math.min(idx, into.childNodes.length));
        fire(into, 'deleteContentBackward');
    }
    function joinBackward(b) {
        if (b.tagName === 'LI') {
            const prev = b.previousElementSibling;
            if (prev && prev.tagName === 'LI') { joinInto(prev, b); return true; }
            // First item: it becomes a plain line above the list!
            const list = b.parentNode;
            const d = document.createElement('div');
            d.setAttribute('contenteditable', 'true');
            while (b.firstChild) d.appendChild(b.firstChild);
            ensureFiller(d);
            list.before(d);
            b.remove();
            if (!list.children.length) list.remove();
            caretToStart(d);
            fire(d, 'deleteContentBackward');
            return true;
        }
        const p = neighbor(b, -1);
        if (!p) {
            // First line: headings and quotes turn back into plain lines!
            if (b.tagName !== 'DIV') {
                const d = document.createElement('div');
                d.setAttribute('contenteditable', 'true');
                while (b.firstChild) d.appendChild(b.firstChild);
                ensureFiller(d);
                b.replaceWith(d);
                caretToStart(d);
                fire(d, 'deleteContentBackward');
            }
            return true;
        }
        if (isBlank(p) && p.tagName !== 'LI') { const parent = p.parentNode; p.remove(); cleanupParent(parent); caretToStart(b); fire(b, 'deleteContentBackward'); return true; }
        // Something sits between (a table, picture or widget)? Leave it alone.
        const sib = b.previousElementSibling;
        if (sib && sib !== p && !/^(UL|OL)$/.test(sib.tagName)) return true;
        joinInto(p, b);
        return true;
    }
    function joinForward(b) {
        const n = neighbor(b, 1);
        if (!n) return true;
        if (b.nextElementSibling && b.nextElementSibling !== n && !/^(UL|OL)$/.test(b.nextElementSibling.tagName) && b.tagName !== 'LI') return true;
        if (isBlank(b) && b.tagName !== 'LI') { const parent = b.parentNode; b.remove(); cleanupParent(parent); caretToStart(n); fire(n, 'deleteContentForward'); return true; }
        joinInto(b, n);
        return true;
    }

    /* ---------- A selection across boxes: delete exactly what is highlighted ---------- */
    function crossInfo() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed || !ed.contains(sel.anchorNode) || !ed.contains(sel.focusNode)) return null;
        const R = sel.getRangeAt(0);
        const sb = blockOf(R.startContainer.nodeType === 1 && R.startContainer === ed ? ed.childNodes[R.startOffset] : R.startContainer);
        const eb = blockOf(R.endContainer.nodeType === 1 && R.endContainer === ed ? ed.childNodes[Math.max(0, R.endOffset - 1)] : R.endContainer);
        if (sb === eb) return null;
        return { R: R, sb: sb, eb: eb, sel: sel };
    }
    function deleteCross(info) {
        checkpoint();
        const R = info.R, sb = info.sb, eb = info.eb, sel = info.sel;
        const sc = R.startContainer, so = R.startOffset;
        R.deleteContents();
        if (eb && eb !== sb && eb.isConnected) {
            const parent = eb.parentNode;
            if (sb && sb.isConnected) {
                if (isBlank(sb)) [].slice.call(sb.querySelectorAll('br')).forEach(function (x) { x.remove(); });
                const onlyBr = eb.childNodes.length === 1 && eb.firstChild.nodeName === 'BR';
                if (!onlyBr) while (eb.firstChild) sb.appendChild(eb.firstChild);
                ensureFiller(sb);
            }
            eb.remove();
            cleanupParent(parent);
        }
        ensureBlocks();
        if (sc.isConnected && ed.contains(sc)) placeCaret(sc, Math.min(so, sc.nodeType === 3 ? sc.nodeValue.length : sc.childNodes.length));
        else if (sb && sb.isConnected) caretToStart(sb);
        else { const bx = allBoxes(); if (bx.length) caretToStart(bx[0]); }
        fire(blockOf(window.getSelection().anchorNode) || ed, 'deleteContent');
        settle();
    }

    /* ---------- Virtual selection: a highlight that spans boxes ----------
       Browsers refuse to select across separate editable boxes, so a selection
       that crosses lines is OUR range: we paint it, and Delete, typing, cut and
       copy all act on exactly that range!  */
    const SEL_COLOR = location.pathname.indexOf('bitbook') !== -1 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(20, 149, 255, 0.35)';
    let vs = null, vsLayer = null, vsQueued = false, drag = null;
    const vcss = document.createElement('style');
    vcss.textContent = '#wysiwyg-canvas.kd-vs ::selection{background:transparent !important;color:inherit !important}';
    document.head.appendChild(vcss);

    function editableBoxes() { return allBoxes().filter(function (x) { return x.getAttribute('contenteditable') === 'true'; }); }
    function startOf(b) { const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); const t = w.nextNode(); return t ? { n: t, o: 0 } : { n: b, o: 0 }; }
    function endOf(b) { const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let t = null, n; while ((n = w.nextNode())) t = n; return t ? { n: t, o: t.nodeValue.length } : { n: b, o: b.childNodes.length }; }
    function vsRange() {
        if (!vs || !vs.a.n.isConnected || !vs.f.n.isConnected) return null;
        const r = document.createRange();
        try {
            r.setStart(vs.a.n, vs.a.o);
            r.setEnd(vs.f.n, vs.f.o);
            if (r.collapsed && (vs.a.n !== vs.f.n || vs.a.o !== vs.f.o)) { r.setStart(vs.f.n, vs.f.o); r.setEnd(vs.a.n, vs.a.o); }
        } catch (e) { return null; }
        return r.collapsed ? null : r;
    }
    function boxAtBoundary(container, offset, isEnd) {
        if (container === ed) return blockOf(isEnd ? ed.childNodes[Math.max(0, offset - 1)] : ed.childNodes[offset]);
        return blockOf(container);
    }
    function vsInfo() {
        const R = vsRange();
        if (!R) return null;
        return { R: R, sb: boxAtBoundary(R.startContainer, R.startOffset, false), eb: boxAtBoundary(R.endContainer, R.endOffset, true), sel: window.getSelection() };
    }
    function vsText(R) {
        const out = [];
        editableBoxes().forEach(function (b) {
            if (!R.intersectsNode(b)) return;
            const br = document.createRange();
            br.selectNodeContents(b);
            const sub = document.createRange();
            if (R.compareBoundaryPoints(Range.START_TO_START, br) > 0) sub.setStart(R.startContainer, R.startOffset); else sub.setStart(br.startContainer, br.startOffset);
            if (R.compareBoundaryPoints(Range.END_TO_END, br) < 0) sub.setEnd(R.endContainer, R.endOffset); else sub.setEnd(br.endContainer, br.endOffset);
            out.push(sub.toString().replace(/​/g, ''));
        });
        return out.join('\n');
    }
    function setVS(a, f) {
        vs = { a: a, f: f };
        if (!vsRange()) { clearVS(); return; }
        ed.classList.add('kd-vs');
        const s = window.getSelection();
        try { if (s.rangeCount && !s.isCollapsed) s.collapse(s.anchorNode, s.anchorOffset); } catch (e) {}
        soonPaint();
    }
    function clearVS() {
        if (!vs) return;
        vs = null;
        ed.classList.remove('kd-vs');
        if (vsLayer) vsLayer.textContent = '';
    }
    function soonPaint() { if (!vsQueued) { vsQueued = true; requestAnimationFrame(paintVS); } }
    function paintVS() {
        vsQueued = false;
        if (!vsLayer) {
            vsLayer = document.createElement('div');
            vsLayer.id = 'kd-vs-layer';
            vsLayer.setAttribute('aria-hidden', 'true');
            vsLayer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:41';
            document.body.appendChild(vsLayer);
        }
        vsLayer.textContent = '';
        const R = vsRange();
        if (!R) return;
        const frag = document.createDocumentFragment();
        const add = function (x, y, w, h, tab) {
            const d = document.createElement('div');
            d.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;background:' + SEL_COLOR + (tab ? ';border-radius:0 3px 3px 0' : '');
            frag.appendChild(d);
        };
        const boxes = editableBoxes();
        boxes.forEach(function (b, i) {
            if (!R.intersectsNode(b)) return;
            const br = document.createRange();
            br.selectNodeContents(b);
            const sub = document.createRange();
            if (R.compareBoundaryPoints(Range.START_TO_START, br) > 0) sub.setStart(R.startContainer, R.startOffset); else sub.setStart(br.startContainer, br.startOffset);
            const endsHere = R.compareBoundaryPoints(Range.END_TO_END, br) <= 0;
            if (endsHere) sub.setEnd(R.endContainer, R.endOffset); else sub.setEnd(br.endContainer, br.endOffset);
            let lastRect = null;
            [].forEach.call(sub.getClientRects(), function (rc) { if (rc.width > 0 && rc.height > 0) { add(rc.left, rc.top, rc.width, rc.height); lastRect = rc; } });
            // A selected line break shows as a little tab at the end of its line!
            if (!endsHere && i < boxes.length - 1) {
                const bb = b.getBoundingClientRect();
                if (lastRect) add(lastRect.right, lastRect.top, 9, lastRect.height, true);
                else add(bb.left, bb.top, 9, Math.min(bb.height, 28), true);
            }
        });
        vsLayer.appendChild(frag);
    }
    document.addEventListener('scroll', function () { if (vs) soonPaint(); }, true);
    window.addEventListener('resize', function () { if (vs) soonPaint(); });
    function caretIn(node, offset) {
        const b = blockOf(node);
        if (b && b.focus) b.focus({ preventScroll: true });
        placeCaret(node, offset);
    }
    function selectAllVS() {
        const boxes = editableBoxes();
        if (!boxes.length) return false;
        setVS(startOf(boxes[0]), endOf(boxes[boxes.length - 1]));
        return true;
    }
    // Nearest box to a point, with the caret position inside it (past a margin = line edge)!
    function pointInNearestBox(x, y) {
        const boxes = editableBoxes();
        if (!boxes.length) return null;
        let best = boxes[boxes.length - 1], bestD = Infinity;
        boxes.forEach(function (b) {
            const r = b.getBoundingClientRect();
            const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
            if (d < bestD) { bestD = d; best = b; }
        });
        const r = best.getBoundingClientRect();
        const cx = Math.max(r.left + 1, Math.min(x, r.right - 1)), cy = Math.max(r.top + 2, Math.min(y, r.bottom - 2));
        const p = caretAtPoint(cx, cy);
        if (p && best.contains(p.node)) return { box: best, node: p.node, offset: p.offset };
        const e = y < r.top ? startOf(best) : endOf(best);
        return { box: best, node: e.n, offset: e.o };
    }
    function stepChar(f, dir) {
        const b = blockOf(f.n);
        if (f.n.nodeType === 3) {
            if (dir > 0 && f.o < f.n.nodeValue.length) return { n: f.n, o: f.o + 1 };
            if (dir < 0 && f.o > 0) return { n: f.n, o: f.o - 1 };
            const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
            w.currentNode = f.n;
            const t = dir > 0 ? w.nextNode() : w.previousNode();
            if (t) return dir > 0 ? { n: t, o: 0 } : { n: t, o: t.nodeValue.length };
        }
        const nb = neighbor(b, dir);
        if (!nb) return dir > 0 ? endOf(b) : startOf(b);
        return dir > 0 ? startOf(nb) : endOf(nb);
    }
    function stepFocus(f, key) {
        if (key === 'ArrowLeft' || key === 'ArrowRight') return stepChar(f, key === 'ArrowRight' ? 1 : -1);
        const up = key === 'ArrowUp';
        const r = document.createRange();
        try { r.setStart(f.n, f.o); } catch (e) { return f; }
        r.collapse(true);
        const rect = rectOfCaret(r);
        const b = blockOf(f.n);
        if (rect) {
            const p = caretAtPoint(rect.left, up ? rect.top - 4 : rect.bottom + 4);
            if (p && ed.contains(p.node) && blockOf(p.node) && (blockOf(p.node) !== b || Math.abs((rectOfCaret((function () { const q = document.createRange(); q.setStart(p.node, p.offset); q.collapse(true); return q; })()) || rect).top - rect.top) > 2)) return { n: p.node, o: p.offset };
        }
        const t = neighbor(b, up ? -1 : 1);
        if (t) return up ? endOf(t) : startOf(t);
        return up ? startOf(b) : endOf(b);
    }
    function vsKeydown(e) {
        if (!vs) return false;
        const R = vsRange();
        if (!R) { clearVS(); return false; }
        const key = e.key;
        if (e.metaKey || e.ctrlKey) {
            const k = String(key).toLowerCase();
            if (k === 'z' || k === 'y') clearVS();
            return false; // copy, cut and paste have their own handlers
        }
        if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta' || key === 'CapsLock') return false;
        if (e.shiftKey && /^Arrow/.test(key)) { e.preventDefault(); setVS(vs.a, stepFocus(vs.f, key)); return true; }
        if (key === 'Escape') { clearVS(); return true; }
        if (/^(ArrowLeft|ArrowUp|Home)$/.test(key)) { e.preventDefault(); clearVS(); caretIn(R.startContainer, R.startOffset); return true; }
        if (/^(ArrowRight|ArrowDown|End)$/.test(key)) { e.preventDefault(); clearVS(); caretIn(R.endContainer, R.endOffset); return true; }
        if (key === 'Backspace' || key === 'Delete') { e.preventDefault(); const info = vsInfo(); clearVS(); deleteCross(info); return true; }
        if (key === 'Enter') {
            e.preventDefault();
            const info = vsInfo();
            clearVS();
            deleteCross(info);
            const b = blockOf(window.getSelection().anchorNode);
            if (isTextBox(b)) splitBox(b, window.getSelection().getRangeAt(0));
            return true;
        }
        if (key.length === 1) { const info = vsInfo(); clearVS(); deleteCross(info); return false; } // the typed letter lands in the collapsed caret
        return false;
    }
    // Shift+Arrow at the edge of a box starts a selection that crosses into the next box!
    function startVSFromKey(e, b, sel) {
        if (!sel.rangeCount || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return false;
        const a = { n: sel.anchorNode, o: sel.anchorOffset }, f = { n: sel.focusNode, o: sel.focusOffset };
        const fr = document.createRange();
        try { fr.setStart(f.n, f.o); } catch (err) { return false; }
        fr.collapse(true);
        let edge = false;
        if (e.key === 'ArrowLeft') edge = atBoundary(b, fr, false);
        else if (e.key === 'ArrowRight') edge = atBoundary(b, fr, true);
        else { const up = e.key === 'ArrowUp'; const cur = rectOfCaret(fr), ln = lineRect(b, !up); edge = !!cur && !!ln && Math.abs(cur.top - ln.top) < lineH(b, ln) * 0.75; }
        if (!edge) return false;
        const nf = stepFocus(f, e.key);
        if (blockOf(nf.n) === b) return false;
        e.preventDefault();
        setVS(a, nf);
        return true;
    }
    function copyVS(e) {
        const R = vsRange();
        if (!R) return false;
        try {
            const h = document.createElement('div');
            h.appendChild(R.cloneContents());
            e.clipboardData.setData('text/plain', vsText(R));
            e.clipboardData.setData('text/html', h.innerHTML.replace(/ contenteditable="(true|false)"/g, ''));
            e.preventDefault();
            return true;
        } catch (err) { return false; }
    }
    ed.addEventListener('copy', function (e) { if (vs) copyVS(e); }, true);
    document.addEventListener('mousemove', function (e) {
        if (!drag) return;
        if (!(e.buttons & 1)) { drag = null; return; }
        if (!drag.a) return;
        const t = pointInNearestBox(e.clientX, e.clientY);
        if (!t) return;
        if (t.box === drag.box) { if (vs) clearVS(); return; }
        setVS(drag.a, { n: t.node, o: t.offset });
    });
    document.addEventListener('mouseup', function () { drag = null; }, true);

    /* ---------- Keys ---------- */
    function rectOfCaret(range) {
        let rect = null;
        const rs = range.getClientRects();
        if (rs.length) rect = rs[0];
        if (!rect || (!rect.width && !rect.height && !rect.top)) {
            const el = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
            rect = el ? el.getBoundingClientRect() : null;
        }
        return rect;
    }
    function lineH(b, rect) {
        const lh = parseFloat(getComputedStyle(b).lineHeight);
        return isFinite(lh) && lh > 0 ? lh : Math.max(16, ((rect && rect.height) || 16) * 1.4);
    }
    function lineRect(b, end) {
        const r = document.createRange();
        r.selectNodeContents(b);
        r.collapse(!end);
        const rect = rectOfCaret(r);
        return rect || b.getBoundingClientRect();
    }
    function caretAtPoint(x, y) {
        if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, offset: p.offset } : null; }
        if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, offset: r.startOffset } : null; }
        return null;
    }
    function moveTo(target, x, up) {
        const rb = target.getBoundingClientRect();
        const y = up ? rb.bottom - 3 : rb.top + 3;
        target.focus && target.focus({ preventScroll: true });
        const p = caretAtPoint(x, y);
        if (p && target.contains(p.node)) placeCaret(p.node, p.offset);
        else if (up) caretToEnd(target); else caretToStart(target);
        try { target.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }

    ed.addEventListener('keydown', function (e) {
        if (e.isComposing || isField(e.target)) return;
        const mod = e.metaKey || e.ctrlKey;
        const key = e.key;
        // Select All spans every box (a virtual selection, since browsers never select across separate boxes)!
        if (mod && !e.shiftKey && !e.altKey && (key === 'a' || key === 'A')) {
            if (selectAllVS()) e.preventDefault();
            return;
        }
        if (vsKeydown(e)) return;
        // Undo / redo for all structural edits!
        if (mod && !e.altKey && (key === 'z' || key === 'Z' || key === 'y' || key === 'Y')) {
            if (hasBitbookUndo) return; // Bitbook's own handler does it
            e.preventDefault();
            if ((key === 'z' || key === 'Z') && !e.shiftKey) undo(); else redoIt();
            return;
        }
        if (mod || e.altKey) return;
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const info = crossInfo();
        // Anything typed over a selection that spans boxes replaces it!
        if (info) {
            if (key === 'Backspace' || key === 'Delete') { e.preventDefault(); deleteCross(info); }
            else if (key === 'Enter') { e.preventDefault(); deleteCross(info); const b = blockOf(window.getSelection().anchorNode); if (isTextBox(b)) splitBox(b, window.getSelection().getRangeAt(0)); }
            else if (key.length === 1) deleteCross(info);
            return;
        }
    }, true);

    // Single-box keys run AFTER the app's own handlers (macros on Enter, quick blocks...)!
    ed.addEventListener('keydown', function (e) {
        if (e.isComposing || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isField(e.target)) return;
        const key = e.key;
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const b = blockOf(range.startContainer);
        if (!b) return;
        // Within one box the browser handles a selection, except Enter (needs our split)!
        if (key === 'Enter' && !e.shiftKey && !e.defaultPrevented) {
            if (!isTextBox(b)) return;
            e.preventDefault();
            checkpoint();
            if (!sel.isCollapsed) { range.deleteContents(); }
            splitBox(b, window.getSelection().getRangeAt(0));
            settle();
            return;
        }
        if (e.shiftKey) { startVSFromKey(e, b, sel); return; }
        if (!sel.isCollapsed) return;
        if (!isTextBox(b)) return;
        if (key === 'Backspace' && atBoundary(b, range, false)) { e.preventDefault(); checkpoint(); joinBackward(b); settle(); return; }
        if (key === 'Delete' && atBoundary(b, range, true)) { e.preventDefault(); checkpoint(); joinForward(b); settle(); return; }
        if (key === 'ArrowLeft' && atBoundary(b, range, false)) { const p = neighbor(b, -1); if (p) { e.preventDefault(); caretToEnd(p); } return; }
        if (key === 'ArrowRight' && atBoundary(b, range, true)) { const n = neighbor(b, 1); if (n) { e.preventDefault(); caretToStart(n); } return; }
        if (key === 'ArrowUp' || key === 'ArrowDown') {
            const up = key === 'ArrowUp';
            const t = neighbor(b, up ? -1 : 1);
            if (!t) return;
            const cur = rectOfCaret(range), edge = lineRect(b, !up);
            if (!cur || !edge) return;
            // Inline chips and pictures make a line's top uneven, so compare against a whole line height (not the glyph height)!
            if (Math.abs(cur.top - edge.top) < lineH(b, edge) * 0.75) { e.preventDefault(); moveTo(t, cur.left, up); }
        }
    });

    // The same applies to cut, drop-over-selection and IME input that bypass keydown!
    ed.addEventListener('beforeinput', function (e) {
        if (busy || !e.inputType) return;
        const info = crossInfo();
        if (!info) return;
        if (e.inputType.indexOf('delete') === 0) { e.preventDefault(); deleteCross(info); }
        else if (e.inputType.indexOf('insert') === 0 && e.inputType !== 'insertParagraph') deleteCross(info);
    });
    ed.addEventListener('cut', function (e) {
        if (isField(e.target)) return;
        if (vs) {
            const vinfo = vsInfo();
            if (vinfo && copyVS(e)) { clearVS(); deleteCross(vinfo); }
            return;
        }
        const info = crossInfo();
        if (!info) return;
        try {
            const holder = document.createElement('div');
            holder.appendChild(info.R.cloneContents());
            e.clipboardData.setData('text/plain', info.sel.toString());
            e.clipboardData.setData('text/html', holder.innerHTML);
            e.preventDefault();
        } catch (err) { return; }
        deleteCross(info);
    }, true);

    /* ---------- Paste: lines become boxes ---------- */
    function cleanHTML(html) {
        const d = new DOMParser().parseFromString(String(html || ''), 'text/html');
        d.querySelectorAll('script, style, link, meta, iframe, object, embed, title').forEach(function (n) { n.remove(); });
        d.querySelectorAll('*').forEach(function (n) {
            [].slice.call(n.attributes).forEach(function (a) { if (/^on/i.test(a.name) || a.name === 'contenteditable' || a.name === 'data-rb' || a.name === 'id') n.removeAttribute(a.name); });
        });
        return d.body;
    }
    // Break pasted content into [{ tag, nodes }] lines!
    function toLines(body) {
        const lines = [];
        let inline = null;
        const flush = function () { if (inline && inline.nodes.length) lines.push(inline); inline = null; };
        (function walk(parent) {
            [].slice.call(parent.childNodes).forEach(function (n) {
                if (n.nodeType === 1 && /^(UL|OL)$/.test(n.tagName)) { flush(); [].forEach.call(n.children, function (li) { lines.push({ tag: 'DIV', nodes: [].slice.call(li.childNodes), bullet: true }); }); return; }
                if (n.nodeType === 1 && /^(H[1-6]|BLOCKQUOTE|PRE)$/.test(n.tagName)) { flush(); lines.push({ tag: n.tagName, nodes: [].slice.call(n.childNodes) }); return; }
                if (n.nodeType === 1 && /^(DIV|P|SECTION|ARTICLE|TR|TABLE|TBODY|FIGURE|DETAILS)$/.test(n.tagName)) {
                    flush();
                    if (n.querySelector('div, p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, tr')) walk(n);
                    else lines.push({ tag: 'DIV', nodes: [].slice.call(n.childNodes) });
                    return;
                }
                if (n.nodeType === 1 && n.tagName === 'BR') { flush(); lines.push({ tag: 'DIV', nodes: [] }); return; }
                if (!inline) inline = { tag: 'DIV', nodes: [] };
                inline.nodes.push(n);
            });
        })(body);
        flush();
        return lines;
    }
    ed.addEventListener('paste', function (e) {
        const cd = e.clipboardData;
        if (!cd || (cd.files && cd.files.length) || isField(e.target)) return;
        if (vs) { const vinfo = vsInfo(); clearVS(); if (vinfo) deleteCross(vinfo); }
        const sel = window.getSelection();
        if (!sel.rangeCount || !ed.contains(sel.anchorNode)) return;
        let lines = null;
        const html = cd.getData('text/html');
        const text = cd.getData('text/plain');
        if (html) lines = toLines(cleanHTML(html));
        else if (text) lines = text.replace(/\r\n?/g, '\n').split('\n').map(function (t) { return { tag: 'DIV', nodes: t ? [document.createTextNode(t)] : [] }; });
        if (!lines || lines.length < 2) return; // one line: the browser pastes it into the box
        e.preventDefault();
        checkpoint();
        const info = crossInfo();
        if (info) deleteCross(info);
        else if (!sel.isCollapsed) sel.getRangeAt(0).deleteContents();
        const range = window.getSelection().getRangeAt(0);
        const b = blockOf(range.startContainer);
        if (!isTextBox(b)) return;
        const tailR = document.createRange();
        tailR.setStart(range.startContainer, range.startOffset);
        tailR.setEnd(b, b.childNodes.length);
        const tail = tailR.extractContents();
        const mk = function (ln, host) {
            const el = host || document.createElement(ln.tag);
            if (!host) el.setAttribute('contenteditable', 'true');
            ln.nodes.forEach(function (n) { el.appendChild(n.cloneNode(true)); });
            return el;
        };
        // First pasted line joins the text before the caret!
        [].slice.call(b.querySelectorAll('br')).forEach(function (x) { if (isBlank(b)) x.remove(); });
        lines[0].nodes.forEach(function (n) { b.appendChild(n.cloneNode(true)); });
        let last = b;
        for (let i = 1; i < lines.length; i++) {
            const el = mk(lines[i]);
            last.after(el);
            last = el;
        }
        // The text that followed the caret joins the end of the last pasted line!
        [].slice.call(last.querySelectorAll('br')).forEach(function (x) { if (isBlank(last) && last !== b) x.remove(); });
        const idx = last.childNodes.length;
        last.appendChild(tail);
        ensureFiller(last);
        ensureFiller(b);
        ensureBlocks();
        placeCaret(last, Math.min(idx, last.childNodes.length));
        fire(last, 'insertFromPaste');
        settle();
    }, true);

    /* ---------- Clicks outside every box: land the caret in the nearest one ---------- */
    ed.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        if (e.target !== ed) {
            // Shift+click across boxes extends our virtual selection; a plain press starts a drag!
            const hb = blockOf(e.target);
            const s0 = window.getSelection();
            if (e.shiftKey && hb) {
                const a0 = vs ? vs.a : (s0.rangeCount && ed.contains(s0.anchorNode) ? { n: s0.anchorNode, o: s0.anchorOffset } : null);
                const t0 = pointInNearestBox(e.clientX, e.clientY);
                if (a0 && t0 && blockOf(a0.n) !== t0.box) { e.preventDefault(); setVS(a0, { n: t0.node, o: t0.offset }); return; }
            }
            clearVS();
            const pp = hb ? caretAtPoint(e.clientX, e.clientY) : null;
            drag = hb ? { box: hb, a: pp && hb.contains(pp.node) ? { n: pp.node, o: pp.offset } : null } : null;
            return;
        }
        clearVS();
        const boxes = allBoxes().filter(function (x) { return x.getAttribute('contenteditable') === 'true'; });
        if (!boxes.length) return;
        let best = boxes[boxes.length - 1], bestD = Infinity;
        boxes.forEach(function (b) {
            const r = b.getBoundingClientRect();
            const d = e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0;
            if (d < bestD) { bestD = d; best = b; }
        });
        e.preventDefault();
        const r = best.getBoundingClientRect();
        const p = caretAtPoint(Math.max(r.left + 1, Math.min(e.clientX, r.right - 1)), Math.max(r.top + 2, Math.min(e.clientY, r.bottom - 2)));
        best.focus && best.focus({ preventScroll: true });
        if (p && best.contains(p.node)) placeCaret(p.node, p.offset); else caretToEnd(best);
    });

    // The rest of the app asks canvas.focus() to put the caret back: do it in the last box!
    ed.focus = function () {
        const s = window.getSelection();
        if (s.rangeCount && ed.contains(s.anchorNode)) { const b = blockOf(s.anchorNode); if (b && b.focus) { b.focus({ preventScroll: true }); return; } }
        const boxes = allBoxes().filter(function (x) { return x.getAttribute('contenteditable') === 'true'; });
        if (boxes.length) caretToEnd(boxes[boxes.length - 1]);
    };

    /* ---------- Block formats (Normal, Heading 1-3, Quote, Code, lists) ---------- */
    // The boxes a format applies to: every box in a virtual selection, else the caret's box!
    function targetBoxes() {
        const R = vsRange();
        if (R) return editableBoxes().filter(function (b) { return R.intersectsNode(b); });
        const s = window.getSelection();
        if (!s.rangeCount) return [];
        const b = blockOf(s.anchorNode);
        return b && b.getAttribute('contenteditable') === 'true' ? [b] : [];
    }
    function caretOff(b) {
        const s = window.getSelection();
        if (!s.rangeCount || !b.contains(s.anchorNode)) return null;
        const r = document.createRange();
        r.selectNodeContents(b);
        r.setEnd(s.anchorNode, s.anchorOffset);
        return r.toString().length;
    }
    function restoreOff(n, off) {
        if (off == null) return;
        n.focus && n.focus({ preventScroll: true });
        const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
        let t, left = off;
        while ((t = w.nextNode())) { if (left <= t.nodeValue.length) { placeCaret(t, left); return; } left -= t.nodeValue.length; }
        caretToEnd(n);
    }
    // Takes a list item out of its list (splitting the list around it)!
    function pullOutOfList(li, el) {
        const list = li.parentNode;
        const after = [];
        for (let n = li.nextElementSibling; n; n = n.nextElementSibling) after.push(n);
        list.after(el);
        if (after.length) { const tail = list.cloneNode(false); after.forEach(function (n) { tail.appendChild(n); }); el.after(tail); }
        li.remove();
        if (!list.children.length) list.remove();
    }
    function retag(b, tag, cls) {
        const off = caretOff(b);
        const n = document.createElement(tag);
        n.setAttribute('contenteditable', 'true');
        if (cls) n.className = cls;
        const st = b.getAttribute('style');
        if (st) n.setAttribute('style', st);
        while (b.firstChild) n.appendChild(b.firstChild);
        ensureFiller(n);
        if (b.tagName === 'LI') pullOutOfList(b, n); else b.replaceWith(n);
        restoreOff(n, off);
        return n;
    }
    function setBlock(tag, cls) {
        const boxes = targetBoxes();
        if (!boxes.length) return false;
        checkpoint();
        boxes.forEach(function (b) { retag(b, tag, cls); });
        ensureBlocks();
        fire(blockOf(window.getSelection().anchorNode) || ed, 'formatBlock');
        settle();
        return true;
    }
    function toggleList(ordered) {
        const boxes = targetBoxes();
        if (!boxes.length) return false;
        checkpoint();
        const want = ordered ? 'OL' : 'UL';
        boxes.forEach(function (b) {
            if (b.tagName === 'LI') {
                const list = b.parentNode;
                if (list.tagName === want) { retag(b, 'div'); return; }
                // Other list type: the whole list switches!
                const nl = document.createElement(want.toLowerCase());
                nl.setAttribute('contenteditable', 'false');
                if (!ordered) nl.className = 'bulleted-list';
                while (list.firstChild) nl.appendChild(list.firstChild);
                list.replaceWith(nl);
                return;
            }
            if (!/^(DIV|P|H[1-6]|BLOCKQUOTE|PRE)$/.test(b.tagName)) return;
            const off = caretOff(b);
            const li = document.createElement('li');
            li.setAttribute('contenteditable', 'true');
            while (b.firstChild) li.appendChild(b.firstChild);
            ensureFiller(li);
            const prev = b.previousElementSibling, next = b.nextElementSibling;
            let list;
            if (prev && prev.tagName === want) { list = prev; list.appendChild(li); b.remove(); }
            else { list = document.createElement(want.toLowerCase()); list.setAttribute('contenteditable', 'false'); if (!ordered) list.className = 'bulleted-list'; list.appendChild(li); b.replaceWith(list); }
            if (next && next.tagName === want && next.parentNode === ed) { while (next.firstChild) list.appendChild(next.firstChild); next.remove(); }
            restoreOff(li, off);
        });
        ensureBlocks();
        fire(blockOf(window.getSelection().anchorNode) || ed, 'insertUnorderedList');
        settle();
        return true;
    }
    function align(a) {
        const boxes = targetBoxes();
        if (!boxes.length) return false;
        checkpoint();
        boxes.forEach(function (b) { b.style.textAlign = a === 'left' ? '' : a; if (!b.getAttribute('style')) b.removeAttribute('style'); });
        fire(boxes[0], 'formatJustify');
        settle();
        return true;
    }
    function currentBoxTag() {
        const s = window.getSelection();
        const b = s.rangeCount ? blockOf(s.anchorNode) : null;
        return b ? (b.tagName === 'LI' ? 'LI:' + b.parentNode.tagName : b.tagName) : '';
    }

    ensureBlocks();
    window.KdBlockEditor = { keepFocus: keepFocusSoon, setBlock: setBlock, align: align, toggleList: toggleList, currentBoxTag: currentBoxTag, selectAll: selectAllVS, clearSelection: clearVS, hasVirtualSelection: function () { return !!vsRange(); }, ensureBlocks: ensureBlocks, blockOf: blockOf, splitBox: splitBox, undo: undo, redo: redoIt, allBoxes: allBoxes };
})();
