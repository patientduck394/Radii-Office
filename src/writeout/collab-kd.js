/* =====================================================================
   Radii Collab adapter for the Keydown editors (Writeout + Bitbook)!
   Every page is a list of paragraph "blocks" tagged with a tiny
   data-rb id, and each block syncs on its own, so two people typing in
   different paragraphs never collide! Carets survive remote updates,
   remote cursors show with name flags, and comments wrap the text they
   talk about (so they travel inside the document itself)!
   Identical copy in Writeout + Bitbook; set window.RADII_COLLAB_APP first!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof canvas === 'undefined' || !canvas) return;
    const RC = window.RadiiCollab;
    const APP = window.RADII_COLLAB_APP || { key: 'writeout', name: 'Writeout', doc: 'document', a: '#38bdf8', b: '#0284c7', rim: '#7dd3fc', glow: 'rgba(2, 132, 199, 0.35)' };
    const ed = canvas;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', APP.a);
    root.setProperty('--rc-b', APP.b);
    root.setProperty('--rc-rim', APP.rim);
    root.setProperty('--rc-glow', APP.glow);

    function save() { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} }
    function activeId() { try { return kdActiveTab().id; } catch (e) { return null; } }
    function tabById(id) { return kdTabs.find(function (t) { return t.id === id; }); }
    function bid() { return RC.uid(8); }

    /* ---------- Blocks: every top-level node becomes a tagged element ---------- */
    const BLOCKY = /^(DIV|P|H[1-6]|UL|OL|BLOCKQUOTE|PRE|TABLE|HR|FIGURE|SECTION|DETAILS|IMG)$/;
    // Wraps loose text/inline runs in <div>s and gives every block a unique id!
    // (Text never changes, so whole-page character offsets keep the caret put!)
    function normalize(container) {
        let run = null;
        [].slice.call(container.childNodes).forEach(function (n) {
            if (n.nodeType === 8) { n.remove(); return; }
            if (n.nodeType === 1 && BLOCKY.test(n.tagName)) { run = null; return; }
            if (!run) { run = document.createElement('div'); container.insertBefore(run, n); }
            run.appendChild(n);
            if (n.nodeType === 1 && n.tagName === 'BR') run = null;
        });
        const seen = {};
        [].slice.call(container.children).forEach(function (n) {
            let id = n.getAttribute('data-rb');
            if (!id || seen[id]) { id = bid(); n.setAttribute('data-rb', id); }
            seen[id] = true;
        });
    }
    function needsNormalize(container) {
        const seen = {};
        for (let n = container.firstChild; n; n = n.nextSibling) {
            if (n.nodeType !== 1 || !BLOCKY.test(n.tagName)) return true;
            const id = n.getAttribute('data-rb');
            if (!id || seen[id]) return true;
            seen[id] = true;
        }
        return false;
    }
    function normalizeLive() {
        if (!needsNormalize(ed)) return;
        const s = window.getSelection();
        // Keep the caret by NODE (not by character offset: an empty new line has the
        // same offset as the end of the line above, which threw the caret back after Enter)!
        let keep = null;
        if (s && s.rangeCount && ed.contains(s.anchorNode)) keep = { an: s.anchorNode, ao: s.anchorOffset, fn: s.focusNode, fo: s.focusOffset };
        normalize(ed);
        if (keep && ed.contains(keep.an) && ed.contains(keep.fn)) {
            try { s.setBaseAndExtent(keep.an, keep.ao, keep.fn, keep.fo); } catch (e) {}
        }
    }
    function parse(html) {
        const t = document.createElement('template');
        t.innerHTML = html || '';
        return t.content;
    }
    function blocksOf(container) {
        return [].slice.call(container.children).map(function (n) { return [n.getAttribute('data-rb'), n.outerHTML]; });
    }

    /* ---------- Caret save/restore (by block id + character offset) ---------- */
    function blockOf(node) {
        while (node && node.parentNode !== ed) node = node.parentNode;
        return node && node.nodeType === 1 ? node : null;
    }
    function offsetIn(block, node, off) {
        try {
            const r = document.createRange();
            r.setStart(block, 0);
            r.setEnd(node, off);
            return r.toString().length;
        } catch (e) { return 0; }
    }
    function pointAt(block, n) {
        const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        let t, left = n;
        while ((t = w.nextNode())) {
            if (left <= t.nodeValue.length) return [t, left];
            left -= t.nodeValue.length;
        }
        return [block, block.childNodes.length];
    }
    function getCaret() {
        const s = window.getSelection();
        if (!s || !s.rangeCount || !ed.contains(s.anchorNode)) return null;
        const a = blockOf(s.anchorNode), f = blockOf(s.focusNode);
        if (!a || !f) return null;
        return { a: a.getAttribute('data-rb'), ao: offsetIn(a, s.anchorNode, s.anchorOffset), f: f.getAttribute('data-rb'), fo: offsetIn(f, s.focusNode, s.focusOffset), ai: [].indexOf.call(ed.children, a) };
    }
    function findBlock(id, idx) {
        return (id && ed.querySelector(':scope > [data-rb="' + id + '"]')) || (idx != null ? ed.children[Math.min(idx, ed.children.length - 1)] : null);
    }
    function setCaret(c) {
        if (!c) return;
        const a = findBlock(c.a, c.ai), f = findBlock(c.f, c.ai);
        if (!a || !f) return;
        try {
            const pa = pointAt(a, c.ao), pf = pointAt(f, c.fo);
            const s = window.getSelection();
            s.setBaseAndExtent(pa[0], pa[1], pf[0], pf[1]);
        } catch (e) {}
    }

    /* ---------- Snapshot: pages + block order + blocks ---------- */
    function snapshot() {
        const out = { pages: kdTabs.map(function (t) { return { id: t.id, name: t.name }; }) };
        const act = activeId();
        kdTabs.forEach(function (t) {
            let frag;
            if (t.id === act) {
                normalizeLive();
                frag = ed;
            } else {
                frag = parse(t.html);
                normalize(frag);
                const div = document.createElement('div');
                div.appendChild(frag);
                t.html = div.innerHTML;
                frag = div;
            }
            const bl = blocksOf(frag);
            out['o:' + t.id] = bl.map(function (b) { return b[0]; });
            bl.forEach(function (b) { out['b:' + t.id + ':' + b[0]] = b[1]; });
        });
        return out;
    }

    /* ---------- Apply remote changes ---------- */
    // Paragraph order MERGES: the room's order, plus paragraphs that only we
    // (or a list that lost the race) have, slotted in after the paragraph they
    // followed there! Nobody's lines vanish!
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
    let lostNow = {};
    function mergedOrder(pid, localOrder) {
        const exists = function (id) { return RC.unit('b:' + pid + ':' + id) != null; };
        const remote = (RC.unit('o:' + pid) || []).filter(exists);
        const out = remote.slice();
        const a = insertMissing(out, lostNow['o:' + pid], exists);
        const b = insertMissing(out, localOrder, exists);
        return { order: out, merged: a || b || out.length !== (RC.unit('o:' + pid) || []).length };
    }
    function patchActive(pid, full) {
        normalizeLive();
        const local = full ? [] : [].map.call(ed.children, function (n) { return n.getAttribute('data-rb'); });
        const mo = mergedOrder(pid, local);
        const caret = getCaret();
        const keep = {};
        let prev = null;
        mo.order.forEach(function (id) {
            const html = RC.unit('b:' + pid + ':' + id);
            if (html == null) return;
            keep[id] = true;
            let el = ed.querySelector(':scope > [data-rb="' + id + '"]');
            if (!el || el.outerHTML !== html) {
                const fresh = parse(html).firstElementChild;
                if (!fresh) return;
                fresh.setAttribute('data-rb', id);
                if (el) el.replaceWith(fresh); else ed.insertBefore(fresh, prev ? prev.nextSibling : ed.firstChild);
                el = fresh;
            } else if ((prev ? prev.nextSibling : ed.firstChild) !== el) {
                ed.insertBefore(el, prev ? prev.nextSibling : ed.firstChild);
            }
            prev = el;
        });
        [].slice.call(ed.childNodes).forEach(function (n) {
            if (n.nodeType !== 1 || !keep[n.getAttribute('data-rb')]) n.remove();
        });
        if (caret) setCaret(caret);
        try { if (typeof kdHydrateInteractions === 'function') kdHydrateInteractions(ed); } catch (e) {}
        return mo.merged;
    }
    function apply(changed, full, lost) {
        const touched = {};
        const again = [];
        lostNow = lost || {};
        const pagesChanged = full || ('pages' in changed) || ('pages' in lostNow);
        Object.keys(changed).concat(Object.keys(lostNow)).forEach(function (k) {
            const m = k.match(/^[ob]:([^:]+)/);
            if (m) touched[m[1]] = true;
        });
        const act0 = activeId();
        if (pagesChanged) {
            const list = RC.unit('pages') || [];
            if (list.length) {
                const ids = list.map(function (p) { return p.id; });
                // Pages only we have (just added, not sent yet) stay too!
                const mine = full ? [] : kdTabs.filter(function (t) { return ids.indexOf(t.id) === -1 && t.id !== 'rc-loading' && RC.unit('o:' + t.id) == null; });
                // Pages someone added at the same instant (a list that lost the race) stay too!
                const lostPages = (lostNow.pages || []).filter(function (p) { return ids.indexOf(p.id) === -1; });
                const next = list.concat(lostPages).map(function (p) {
                    const t = tabById(p.id) || { id: p.id, name: p.name, html: '' };
                    if (ids.indexOf(p.id) !== -1) t.name = p.name;
                    if (full || lostPages.indexOf(p) !== -1) touched[p.id] = true;
                    return t;
                }).concat(mine);
                if (mine.length || lostPages.length) again.push('pages');
                kdTabs.length = 0;
                next.forEach(function (t) { kdTabs.push(t); });
                if (!tabById(kdActiveTabId)) {
                    kdActiveTabId = kdTabs[0].id;
                    ed.innerHTML = '';
                    touched[kdActiveTabId] = true;
                }
            }
        }
        const act = activeId();
        Object.keys(touched).forEach(function (pid) {
            const t = tabById(pid);
            if (!t) return;
            if (pid === act) {
                const fresh = act !== act0 || full;
                if (fresh) ed.innerHTML = '';
                if (patchActive(pid, fresh)) again.push('o:' + pid);
                t.html = ed.innerHTML;
            } else {
                const d = document.createElement('div');
                d.innerHTML = t.html || '';
                normalize(d);
                const mo = mergedOrder(pid, full ? [] : [].map.call(d.children, function (n) { return n.getAttribute('data-rb'); }));
                t.html = mo.order.map(function (id) { return RC.unit('b:' + pid + ':' + id) || ''; }).join('');
                if (mo.merged) again.push('o:' + pid);
            }
        });
        try { kdSaveTabs(); kdRenderTabs(); kdRenderOutline(); } catch (e) {}
        drawSoon();
        return again;
    }

    /* ---------- Session lifecycle + backups ---------- */
    const BACKUP = APP.key + '_collab_backup';
    function currentTabs() {
        const act = activeId();
        return kdTabs.map(function (t) { return { id: t.id, name: t.name, html: t.id === act ? ed.innerHTML : t.html }; });
    }
    function backup() {
        try {
            localStorage.setItem(BACKUP, JSON.stringify({ tabs: currentTabs(), active: activeId(), at: Date.now() }));
            return true;
        } catch (e) {
            return window.confirm ? window.confirm('Your ' + APP.doc + ' is too big to back up here! Download a copy first? (Cancel to stop joining)') && false : false;
        }
    }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const b = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!b || !Array.isArray(b.tabs) || !b.tabs.length) return;
        kdTabs.length = 0;
        b.tabs.forEach(function (t) { kdTabs.push({ id: t.id, name: t.name, html: t.html || '' }); });
        kdActiveTabId = tabById(b.active) ? b.active : kdTabs[0].id;
        ed.innerHTML = tabById(kdActiveTabId).html || '';
        try { kdHydrateInteractions(ed); } catch (e) {}
        kdSaveTabs(); kdRenderTabs(); kdRenderOutline();
        save();
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) {
        if (mode === 'guest') {
            // A blank slate until the room's pages arrive (yours are backed up!)
            kdTabs.length = 0;
            kdTabs.push({ id: 'rc-loading', name: 'Joining…', html: '' });
            kdActiveTabId = 'rc-loading';
            ed.innerHTML = '';
            kdSaveTabs(); kdRenderTabs(); kdRenderOutline();
        } else normalize(ed);
        drawSoon();
    }
    function strip(html) { return String(html || '').replace(/\sdata-rb="[^"]*"/g, ''); }
    function end() {
        const c = getCaret();
        ed.querySelectorAll('[data-rb]').forEach(function (n) { n.removeAttribute('data-rb'); });
        kdTabs.forEach(function (t) { if (t.id !== activeId()) t.html = strip(t.html); });
        if (c) setCaret(c);
        save();
        kdSaveTabs();
        drawSoon();
    }

    /* ---------- Presence: where am I, remote carets ---------- */
    function cursor() {
        const c = getCaret();
        return { p: activeId(), b: c ? c.f : null, o: c ? c.fo : 0, i: c ? c.ai : null };
    }
    function where(cur) {
        if (!cur) return '';
        const t = tabById(cur.p);
        return t ? 'On "' + t.name + '"' : '';
    }
    let layer = null, peersNow = [], drawQ = false;
    function drawSoon() {
        if (drawQ) return;
        drawQ = true;
        requestAnimationFrame(function () { drawQ = false; drawCursors(peersNow); });
    }
    function drawCursors(peers) {
        peersNow = peers;
        if (!layer) { layer = document.createElement('div'); layer.className = 'rc-cursors'; layer.style.position = 'fixed'; document.body.appendChild(layer); }
        const act = activeId();
        const box = ed.getBoundingClientRect();
        const items = [];
        peers.forEach(function (p) {
            const c = p.cur;
            if (!c || c.p !== act) return;
            const block = findBlock(c.b, c.i);
            if (!block) return;
            let r = null;
            try {
                const pt = pointAt(block, c.o || 0);
                const rg = document.createRange();
                rg.setStart(pt[0], pt[1]);
                rg.collapse(true);
                r = rg.getClientRects()[0] || null;
            } catch (e) {}
            if (!r || !r.height) { const br = block.getBoundingClientRect(); r = { left: br.left, top: br.top, height: Math.min(22, br.height || 20) }; }
            if (r.top < box.top - 4 || r.top > box.bottom) return;
            items.push({ key: p.id, cls: 'rc-caret', style: 'left:' + r.left + 'px;top:' + r.top + 'px;height:' + r.height + 'px;background:' + p.color, html: '<span class="rc-flag" style="background:' + p.color + '">' + RC.esc(p.name) + '</span>' });
        });
        // Keyed: a name tag pops in once when that person arrives, never on redraws!
        RC.keyed(layer, items);
    }
    function follow(cur) {
        if (!cur) return;
        if (cur.p && cur.p !== activeId() && tabById(cur.p)) kdActivateTab(cur.p);
        const b = findBlock(cur.b, cur.i);
        if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' });
        drawSoon();
    }

    /* ---------- Comments: wrapped text + a thread riding in data-thread ---------- */
    let lastSel = null;
    document.addEventListener('selectionchange', function () {
        const s = window.getSelection();
        if (s && s.rangeCount && !s.isCollapsed && ed.contains(s.anchorNode)) lastSel = s.getRangeAt(0).cloneRange();
    });
    function threadOf(el) { try { return JSON.parse(el.getAttribute('data-thread') || '[]'); } catch (e) { return []; } }
    function allAnchors() {
        const out = [];
        const act = activeId();
        kdTabs.forEach(function (t) {
            const root = t.id === act ? ed : (function () { const d = document.createElement('div'); d.innerHTML = t.html || ''; return d; })();
            root.querySelectorAll('.rc-anchor[data-cid]').forEach(function (a) { out.push({ tab: t, el: a, live: t.id === act }); });
        });
        return out;
    }
    function editThread(id, fn) {
        const act = activeId();
        kdTabs.forEach(function (t) {
            if (t.id === act) {
                const a = ed.querySelector('.rc-anchor[data-cid="' + id + '"]');
                if (a) fn(a);
            } else if ((t.html || '').indexOf(id) !== -1) {
                const d = document.createElement('div');
                d.innerHTML = t.html;
                const a = d.querySelector('.rc-anchor[data-cid="' + id + '"]');
                if (a) { fn(a); t.html = d.innerHTML; }
            }
        });
        save();
        kdSaveTabs();
    }
    const comments = {
        hint: 'Select text, then comment on it',
        list: function () {
            return allAnchors().map(function (x) {
                const txt = (x.el.textContent || '').trim();
                return { id: x.el.getAttribute('data-cid'), where: '“' + (txt.length > 40 ? txt.slice(0, 40) + '…' : txt) + '” · ' + x.tab.name, items: threadOf(x.el) };
            });
        },
        add: function (text, me) {
            const r = lastSel;
            if (!r || r.collapsed || !ed.contains(r.startContainer)) { RC.toast('Select some text in the ' + APP.doc + ' first, then write your comment!'); return false; }
            if (blockOf(r.startContainer) !== blockOf(r.endContainer)) { RC.toast('Select text inside one paragraph to comment on it!'); return false; }
            const span = document.createElement('span');
            span.className = 'rc-anchor';
            span.setAttribute('data-cid', 'c' + RC.uid(8));
            span.setAttribute('data-thread', JSON.stringify([{ by: me.id, name: me.name, text: text, at: Date.now() }]));
            try {
                span.appendChild(r.extractContents());
                r.insertNode(span);
            } catch (e) { RC.toast('Could not comment on that selection!'); return false; }
            lastSel = null;
            save();
            RC.changed();
            return true;
        },
        reply: function (id, text, me) {
            editThread(id, function (a) { const th = threadOf(a); th.push({ by: me.id, name: me.name, text: text, at: Date.now() }); a.setAttribute('data-thread', JSON.stringify(th)); });
        },
        resolve: function (id) {
            editThread(id, function (a) { while (a.firstChild) a.parentNode.insertBefore(a.firstChild, a); a.remove(); });
        },
        jump: function (id) {
            const hit = allAnchors().find(function (x) { return x.el.getAttribute('data-cid') === id; });
            if (!hit) return;
            if (!hit.live) kdActivateTab(hit.tab.id);
            const a = ed.querySelector('.rc-anchor[data-cid="' + id + '"]');
            if (a) { a.scrollIntoView({ block: 'center', behavior: 'smooth' }); a.classList.add('rc-flash'); setTimeout(function () { a.classList.remove('rc-flash'); }, 1300); }
        }
    };

    /* ---------- Wire it up ---------- */
    RC.init({
        app: APP.key,
        appName: APP.name,
        docName: APP.doc,
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k === 'pages' || k.indexOf('o:') === 0; }, begin: begin, end: end, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    ed.addEventListener('input', function () { RC.changed(); RC.cursorMoved(); });
    // Page adds, renames, deletes and switches all pass through kdSaveTabs!
    const origSave = window.kdSaveTabs;
    window.kdSaveTabs = function () { origSave.apply(this, arguments); RC.changed(); };
    new MutationObserver(function () { if (RC.isLive() && !RC.isApplying()) RC.changed(); }).observe(ed, { childList: true, subtree: true, characterData: true });
    ed.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.rc-anchor')) RC.open('comments');
    });
    document.addEventListener('scroll', drawSoon, true);
    window.addEventListener('resize', drawSoon);

    // Share buttons: in the Office title bar and in the Classic sidebar!
    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('#sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad pad-toggle-btn', label: 'Share & Chat' }));
})();
