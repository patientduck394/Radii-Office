/* =====================================================================
   Radii Collab adapter for Amber! Every slide OBJECT is its own synced
   unit (plus one per slide's settings and one for the slide order), so
   two people moving different shapes never collide! Objects update in
   place (drags and text edits in progress keep going), remote
   selections glow in each person's color, thumbnails show who's where,
   and slide comments ride inside the deck (and its .ka file)!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof slides === 'undefined') return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#fbbf24');
    root.setProperty('--rc-b', '#d97706');
    root.setProperty('--rc-rim', '#fde68a');
    root.setProperty('--rc-glow', 'rgba(217, 119, 6, 0.35)');

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function slideById(id) { return slides.find(function (s) { return s.id === id; }); }

    /* ---------- Snapshot ---------- */
    function snapshot() {
        const out = { order: slides.map(function (s) { return s.id; }) };
        slides.forEach(function (s) {
            const props = {};
            Object.keys(s).forEach(function (k) { if (k !== 'elements' && k !== 'id') props[k] = s[k]; });
            out['sl:' + s.id] = props;
            s.elements.forEach(function (el) { out['el:' + s.id + ':' + el.id] = el; });
        });
        return out;
    }

    /* ---------- Apply (in place, so drags + edits in progress survive!) ---------- */
    function assignInPlace(target, src, keep) {
        Object.keys(target).forEach(function (k) { if (!(k in src) && !(keep && keep[k])) delete target[k]; });
        Object.assign(target, clone(src));
    }
    function insertMissing(out, list, exists) {
        let added = false;
        (list || []).forEach(function (id, i) {
            if (out.indexOf(id) !== -1 || !exists(id)) return;
            let at = 0;
            for (let k = i - 1; k >= 0; k--) { const p = out.indexOf(list[k]); if (p !== -1) { at = p + 1; break; } }
            out.splice(at, 0, id);
            added = true;
        });
        return added;
    }
    // Remember the caret while someone types in a text box, then put it back!
    function editCaret() {
        if (editingElementId === null) return null;
        const span = document.querySelector('#slide-canvas .slide-element[data-el-id="' + editingElementId + '"] .slide-text-content');
        const s = window.getSelection();
        if (!span || !s.rangeCount || !span.contains(s.anchorNode)) return null;
        const r = document.createRange();
        r.selectNodeContents(span);
        r.setEnd(s.anchorNode, s.anchorOffset);
        return { id: editingElementId, n: r.toString().length };
    }
    function restoreCaret(c) {
        if (!c) return;
        const span = document.querySelector('#slide-canvas .slide-element[data-el-id="' + c.id + '"] .slide-text-content');
        if (!span) return;
        span.focus();
        const w = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
        let t, left = c.n;
        while ((t = w.nextNode())) {
            if (left <= t.nodeValue.length) { try { window.getSelection().collapse(t, left); } catch (e) {} return; }
            left -= t.nodeValue.length;
        }
    }
    function apply(changed, full, lost) {
        lost = lost || {};
        const again = [];
        const activeId = slides[activeSlideIndex] ? slides[activeSlideIndex].id : null;
        const editing = editingElementId;
        const caret = editCaret();
        if (full) slides.forEach(function (s) { s.elements = []; });
        if (full || 'order' in changed || 'order' in lost) {
            const exists = function (id) { return RC.unit('sl:' + id) != null; };
            const order = (RC.unit('order') || []).filter(exists);
            const a = insertMissing(order, lost.order, exists);
            const b = full ? false : insertMissing(order, slides.map(function (s) { return s.id; }), exists);
            if (order.length) {
                const next = order.map(function (id) { return slideById(id) || { id: id, title: '', background: '#000', elements: [] }; });
                slides.length = 0;
                next.forEach(function (s) { slides.push(s); });
            }
            if (a || b) again.push('order');
        }
        Object.keys(changed).forEach(function (k) {
            if (k.indexOf('sl:') !== 0) return;
            const s = slideById(k.slice(3));
            if (s && changed[k]) assignInPlace(s, changed[k], { id: 1, elements: 1 });
        });
        Object.keys(changed).forEach(function (k) {
            if (k.indexOf('el:') !== 0) return;
            const p = k.split(':');
            const s = slideById(p[1]);
            if (!s) return;
            const id = p.slice(2).join(':');
            // The box you're typing in right now keeps YOUR text (it syncs when you finish)!
            if (id === editing) { again.push(k); return; }
            const i = s.elements.findIndex(function (e) { return e.id === id; });
            const v = changed[k];
            if (v === null) { if (i !== -1) s.elements.splice(i, 1); }
            else if (i !== -1) assignInPlace(s.elements[i], v);
            else s.elements.push(clone(v));
        });
        let ai = slides.findIndex(function (s) { return s.id === activeId; });
        activeSlideIndex = ai >= 0 ? ai : Math.min(activeSlideIndex, slides.length - 1);
        if (activeElementId && !(slides[activeSlideIndex] && slides[activeSlideIndex].elements.some(function (e) { return e.id === activeElementId; }))) activeElementId = null;
        if (editingElementId && !(slides[activeSlideIndex] && slides[activeSlideIndex].elements.some(function (e) { return e.id === editingElementId; }))) editingElementId = null;
        // Redrawing removes the text box you're typing in: silence its blur so your
        // edit keeps going in the fresh copy (caret and all)!
        if (editingElementId !== null) {
            document.querySelectorAll('#slide-canvas .slide-text-content').forEach(function (sp) { sp.onblur = null; });
        }
        renderThumbnails();
        renderActiveSlide();
        restoreCaret(caret);
        return again;
    }

    /* ---------- Sessions + backups ---------- */
    const BACKUP = 'amber_collab_backup';
    function backup() {
        try { localStorage.setItem(BACKUP, JSON.stringify({ slides: slides, active: activeSlideIndex })); return true; } catch (e) { return false; }
    }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const b = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!b || !Array.isArray(b.slides) || !b.slides.length) return;
        const clean = b.slides.map(sanitizeKaSlide).filter(Boolean);
        slides.length = 0;
        clean.forEach(function (s) { slides.push(s); });
        window.Amber.goToSlide(Math.max(0, Math.min(clean.length - 1, b.active | 0)));
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) {
        if (mode === 'guest') {
            slides.length = 0;
            slides.push({ id: 'rc-loading', title: 'Joining…', background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)', elements: [], transition: null, notes: '', hidden: false, comments: [] });
            window.Amber.goToSlide(0);
        }
    }

    /* ---------- Presence ---------- */
    function cursor() {
        return { s: slides[activeSlideIndex] ? slides[activeSlideIndex].id : null, e: activeElementId, t: editingElementId !== null };
    }
    function where(cur) {
        if (!cur) return '';
        const i = slides.findIndex(function (s) { return s.id === cur.s; });
        return i < 0 ? '' : 'Slide ' + (i + 1) + (cur.t ? ' · typing' : cur.e ? ' · editing an object' : '');
    }
    let peersNow = [], glowLayer = null;
    function drawCursors(peers) {
        peersNow = peers;
        const canvasEl = document.getElementById('slide-canvas');
        if (canvasEl) {
            // One persistent layer: slide redraws wipe the canvas, so re-attach it
            // (its boxes survive, so name tags don't pop again on every redraw)!
            if (!glowLayer) { glowLayer = document.createElement('div'); glowLayer.className = 'rc-cursors'; glowLayer.style.zIndex = '9999'; }
            if (glowLayer.parentNode !== canvasEl) canvasEl.appendChild(glowLayer);
            const act = slides[activeSlideIndex] ? slides[activeSlideIndex].id : null;
            const items = [];
            peers.forEach(function (p) {
                const c = p.cur;
                if (!c || c.s !== act || !c.e) return;
                const el = slides[activeSlideIndex].elements.find(function (e) { return e.id === c.e; });
                if (!el) return;
                items.push({ key: p.id, cls: 'rc-box', style: 'left:' + (el.left - 4) + 'px;top:' + (el.top - 4) + 'px;width:' + ((el.width || 120) + 8) + 'px;height:' + ((el.height || 40) + 8) + 'px;border-color:' + p.color + ';box-shadow:0 0 12px ' + p.color + '66', html: '<span class="rc-flag" style="background:' + p.color + '">' + RC.esc(p.name) + (c.t ? ' ✎' : '') + '</span>' });
            });
            RC.keyed(glowLayer, items);
        }
        document.querySelectorAll('#thumbnail-strip .thumbnail-card').forEach(function (card, i) {
            const s = slides[i];
            let dots = card.querySelector('.rc-tabdots');
            const here = peers.filter(function (p) { return p.cur && s && p.cur.s === s.id; });
            if (!here.length) { if (dots) dots.remove(); return; }
            if (!dots) { dots = document.createElement('span'); dots.className = 'rc-tabdots rc-thumbdots'; card.appendChild(dots); }
            dots.innerHTML = here.map(function (p) { return '<i style="background:' + p.color + '" title="' + RC.esc(p.name) + '"></i>'; }).join('');
        });
    }
    function follow(cur) {
        if (!cur) return;
        const i = slides.findIndex(function (s) { return s.id === cur.s; });
        if (i >= 0) window.Amber.goToSlide(i);
    }

    /* ---------- Comments: threads on slides ---------- */
    function slideNow() { return slides[activeSlideIndex]; }
    const comments = {
        hint: 'Comment on this slide',
        list: function () {
            const out = [];
            slides.forEach(function (s, i) {
                (s.comments || []).forEach(function (c) { out.push({ id: s.id + '|' + c.id, where: 'Slide ' + (i + 1) + (s.title ? ': ' + s.title : ''), items: c.items }); });
            });
            return out;
        },
        add: function (text, me) {
            const s = slideNow();
            if (!s) return false;
            s.comments = s.comments || [];
            s.comments.push({ id: 'c' + RC.uid(8), items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            renderThumbnails();
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            const s = slideById(p[0]);
            const c = s && (s.comments || []).find(function (x) { return x.id === p[1]; });
            if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); renderThumbnails(); }
        },
        resolve: function (id) {
            const p = id.split('|');
            const s = slideById(p[0]);
            if (s) { s.comments = (s.comments || []).filter(function (x) { return x.id !== p[1]; }); renderThumbnails(); }
        },
        jump: function (id) {
            const i = slides.findIndex(function (s) { return s.id === id.split('|')[0]; });
            if (i >= 0) window.Amber.goToSlide(i);
        }
    };

    /* ---------- Wire it up ---------- */
    RC.init({
        app: 'amber',
        appName: 'Amber',
        docName: 'presentation',
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k === 'order'; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    // Every change ends in an autosave: that's our "something changed" signal!
    const origQueue = window.amberQueueSave;
    window.amberQueueSave = function () { origQueue.apply(this, arguments); RC.changed(); };
    const origSaveNow = window.amberSaveNow;
    window.amberSaveNow = function () { origSaveNow.apply(this, arguments); RC.changed(); };
    // Redraws wipe the canvas: put the remote selection glows back each time!
    const origRender = window.renderActiveSlide;
    window.renderActiveSlide = function () { const r = origRender.apply(this, arguments); RC.cursorMoved(); drawCursors(peersNow); return r; };
    const origThumbs = window.renderThumbnails;
    window.renderThumbnails = function () { const r = origThumbs.apply(this, arguments); drawCursors(peersNow); return r; };
    // Dragging + typing show up live for everyone!
    document.addEventListener('mousemove', function () { if (typeof draggedElement !== 'undefined' && (draggedElement || resizingElement)) RC.changed(); });

    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('#sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad pad-toggle-btn', label: 'Share & Chat' }));
})();
