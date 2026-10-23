/* =====================================================================
   Radii Collab adapter for Omicron! Every CARD is its own synced unit,
   plus one unit for the card order (merged, so two people adding cards
   at once both keep theirs) and one for the page look (accent, width,
   title). Cards redraw one at a time, and a card you're typing in gets
   patched in place so your caret never jumps! Teammates show up as
   glowing card outlines with name tags, and comments ride on the cards!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof elementsList === 'undefined') return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#5ff0db');
    root.setProperty('--rc-b', '#00a88f');
    root.setProperty('--rc-rim', '#7effeb');
    root.setProperty('--rc-glow', 'rgba(0, 214, 182, 0.45)');
    const page = document.getElementById('wysiwyg-page');
    const scroller = document.getElementById('spreadsheet-container');
    const widthSel = document.getElementById('canvas-width-select');
    const TITLE_KEY = 'omicron_title';

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function title() { try { return localStorage.getItem(TITLE_KEY) || ''; } catch (e) { return ''; } }

    function snapshot() {
        const out = {
            order: elementsList.map(function (x) { return String(x.id); }),
            meta: { accent: accentColor, width: widthSel ? widthSel.value : '720px', title: title(), flex: pageFlex, code: pageCode }
        };
        elementsList.forEach(function (x) { out['b:' + x.id] = x; });
        return out;
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

    /* ---------- Caret keeping (text offsets survive an innerHTML swap!) ---------- */
    function caretOffset(el) {
        const s = window.getSelection();
        if (!s.rangeCount || !el.contains(s.anchorNode)) return null;
        const r = s.getRangeAt(0);
        const pre = document.createRange();
        pre.selectNodeContents(el);
        pre.setEnd(r.startContainer, r.startOffset);
        return pre.toString().length;
    }
    function setCaret(el, off) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n, left = off;
        while ((n = w.nextNode())) {
            if (left <= n.nodeValue.length) {
                const r = document.createRange();
                r.setStart(n, left);
                r.collapse(true);
                const s = window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
                return;
            }
            left -= n.nodeValue.length;
        }
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
    }

    // Move/insert/remove card DOM to match elementsList, redrawing only what changed!
    function reconcile(dirty, all) {
        const have = {};
        [].forEach.call(page.children, function (b) { if (b.classList.contains('wysiwyg-block')) have[b.dataset.id] = b; });
        const active = document.activeElement;
        let prev = null;
        elementsList.forEach(function (item) {
            let el = have[item.id];
            delete have[item.id];
            if (el && (all || dirty[item.id])) {
                const fresh = buildBlock(item);
                if (el.contains(active) && active.isContentEditable) {
                    // Patch the card you're typing in, keeping your caret!
                    const olds = el.querySelectorAll('[contenteditable="true"]');
                    const news = fresh.querySelectorAll('[contenteditable="true"]');
                    const i = [].indexOf.call(olds, active);
                    if (olds.length === news.length && i !== -1 && el.firstElementChild && fresh.firstElementChild && el.firstElementChild.className === fresh.firstElementChild.className) {
                        if (active.innerHTML !== news[i].innerHTML) {
                            const off = caretOffset(active);
                            active.innerHTML = news[i].innerHTML;
                            if (off != null) setCaret(active, off);
                        }
                        olds.forEach(function (o, j) { if (o !== active && o.innerHTML !== news[j].innerHTML) o.innerHTML = news[j].innerHTML; });
                        el.firstElementChild.setAttribute('style', fresh.firstElementChild.getAttribute('style') || '');
                        badge(el, item);
                        fresh.remove();
                    } else {
                        if (el.classList.contains('om-cur')) fresh.classList.add('om-cur');
                        el.replaceWith(fresh);
                        el = fresh;
                    }
                } else {
                    if (el.classList.contains('om-cur')) fresh.classList.add('om-cur');
                    el.replaceWith(fresh);
                    el = fresh;
                }
            }
            if (!el) el = buildBlock(item);
            const want = prev ? prev.nextSibling : page.firstChild;
            if (el !== want) page.insertBefore(el, want);
            prev = el;
        });
        Object.keys(have).forEach(function (k) { have[k].remove(); });
    }

    function apply(changed, full, lost) {
        lost = lost || {};
        const again = [];
        const exists = function (id) { return RC.unit('b:' + id) != null; };
        const order = (RC.unit('order') || []).filter(exists);
        const a = insertMissing(order, lost.order, exists);
        const b = full ? false : insertMissing(order, elementsList.map(function (x) { return String(x.id); }), exists);
        if (a || b) again.push('order');
        const byId = {};
        elementsList.forEach(function (x) { byId[x.id] = x; });
        const dirty = {};
        const next = order.map(function (id) {
            const k = 'b:' + id;
            const cur = byId[id];
            if (cur && !full && !(k in changed)) return cur;
            dirty[id] = true;
            return clone(RC.unit(k));
        });
        let all = !!full;
        const meta = RC.unit('meta');
        if (meta && (full || 'meta' in changed)) {
            if (meta.accent && meta.accent !== accentColor) { accentColor = meta.accent; all = true; const i = document.getElementById('accent-color'); if (i) i.value = meta.accent; }
            if (meta.width && widthSel && widthSel.value !== meta.width) { page.style.width = meta.width; widthSel.value = meta.width; }
            if (meta.flex) pageFlex = Object.assign({}, pageFlex, meta.flex);
            if (meta.code) pageCode = Object.assign({}, pageCode, meta.code);
            applyPageLayout();
            if (meta.title != null && meta.title !== title()) { try { localStorage.setItem(TITLE_KEY, meta.title); } catch (e) {} }
        }
        elementsList = next;
        reconcile(dirty, all);
        saveDoc();
        if (window.OfficeShell) window.OfficeShell.sync();
        drawSoon();
        return again;
    }

    /* ---------- Sessions + backups ---------- */
    const BACKUP = 'omicron_collab_backup';
    function backup() { try { localStorage.setItem(BACKUP, JSON.stringify({ elementsList: elementsList, accentColor: accentColor, width: widthSel ? widthSel.value : '', title: title(), flex: pageFlex, code: pageCode })); return true; } catch (e) { return false; } }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const d = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!d || !Array.isArray(d.elementsList)) return;
        elementsList = d.elementsList;
        accentColor = d.accentColor || accentColor;
        if (d.title) { try { localStorage.setItem(TITLE_KEY, d.title); } catch (e) {} }
        if (d.width) updateCanvasWidth(d.width);
        renderDocument();
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) {
        if (mode === 'guest') { elementsList = []; renderDocument(); }
        drawSoon();
    }

    /* ---------- Presence: glowing card outlines with name tags ---------- */
    function myBlock() {
        const s = window.getSelection();
        const n = s.rangeCount ? s.anchorNode : null;
        const e = n && (n.nodeType === 1 ? n : n.parentElement);
        const b = e && page.contains(e) ? e.closest('.wysiwyg-block') : null;
        if (b) return b;
        return page.querySelector('.wysiwyg-block.om-cur');
    }
    let typing = 0;
    function cursor() {
        const b = myBlock();
        return b ? { b: b.dataset.id, t: Date.now() - typing < 2500 ? 1 : 0 } : {};
    }
    function where(cur) {
        if (!cur || !cur.b) return 'Looking around';
        const i = elementsList.findIndex(function (x) { return String(x.id) === String(cur.b); });
        return i === -1 ? 'Looking around' : (cur.t ? 'Typing in card ' : 'On card ') + (i + 1);
    }
    let layer = null, peersNow = [], drawQ = false;
    function drawSoon() {
        if (drawQ) return;
        drawQ = true;
        requestAnimationFrame(function () { drawQ = false; drawCursors(peersNow); });
    }
    function drawCursors(peers) {
        peersNow = peers;
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'rc-cursors om-rc-layer';
            layer.style.cssText = 'position:fixed;overflow:hidden;pointer-events:none;z-index:50';
            document.body.appendChild(layer);
        }
        const box = scroller.getBoundingClientRect();
        layer.style.left = box.left + 'px';
        layer.style.top = box.top + 'px';
        layer.style.width = box.width + 'px';
        layer.style.height = box.height + 'px';
        const items = [];
        peers.forEach(function (p) {
            const c = p.cur;
            if (!c || !c.b) return;
            const b = page.querySelector('.wysiwyg-block[data-id="' + c.b + '"]');
            if (!b) return;
            const r = b.getBoundingClientRect();
            items.push({ key: p.id, cls: 'rc-box', style: 'left:' + (r.left - box.left - 3) + 'px;top:' + (r.top - box.top - 3) + 'px;width:' + (r.width + 6) + 'px;height:' + (r.height + 6) + 'px;border-color:' + p.color + ';box-shadow:0 0 12px ' + p.color + '55', html: '<span class="rc-flag" style="background:' + p.color + '">' + RC.esc(p.name) + (c.t ? ' ✎' : '') + '</span>' });
        });
        // Keyed: outlines glide between cards; name tags pop only when someone arrives!
        RC.keyed(layer, items);
    }
    function follow(cur) {
        if (!cur || !cur.b) return;
        const b = page.querySelector('.wysiwyg-block[data-id="' + cur.b + '"]');
        if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    /* ---------- Comments ride on the cards ---------- */
    function label(item, i) {
        const t = String(item.type === 'image' ? 'Picture' : item.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split('|')[0];
        return 'Card ' + (i + 1) + (t ? ' · “' + t.slice(0, 24) + (t.length > 24 ? '…' : '') + '”' : '');
    }
    function find(id) { return elementsList.find(function (x) { return String(x.id) === String(id); }); }
    function redraw(item) { const d = {}; d[item.id] = true; reconcile(d, false); saveDoc(); }
    const comments = {
        hint: 'Comment on the card you are on',
        list: function () {
            const out = [];
            elementsList.forEach(function (item, i) {
                (item.comments || []).forEach(function (c) { out.push({ id: item.id + '|' + c.id, where: label(item, i), items: c.items }); });
            });
            return out;
        },
        add: function (text, me) {
            const b = myBlock();
            const item = b && find(b.dataset.id);
            if (!item) { RC.toast('Click a card first, then write your comment!'); return false; }
            item.comments = item.comments || [];
            item.comments.push({ id: 'c' + RC.uid(8), items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            redraw(item);
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            const item = find(p[0]);
            const c = item && (item.comments || []).find(function (x) { return x.id === p[1]; });
            if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); redraw(item); }
        },
        resolve: function (id) {
            const p = id.split('|');
            const item = find(p[0]);
            if (item) { item.comments = (item.comments || []).filter(function (x) { return x.id !== p[1]; }); if (!item.comments.length) delete item.comments; redraw(item); }
        },
        jump: function (id) {
            const b = page.querySelector('.wysiwyg-block[data-id="' + id.split('|')[0] + '"]');
            if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('rc-flash'); setTimeout(function () { b.classList.remove('rc-flash'); }, 1300); }
        }
    };
    // A little 💬 badge on cards with comments (it never reaches the export)!
    function badge(el, item) {
        let bd = el.querySelector(':scope > .om-com-badge');
        const n = (item.comments || []).length;
        if (!n) { if (bd) bd.remove(); return; }
        if (!bd) {
            bd = document.createElement('button');
            bd.type = 'button';
            bd.className = 'om-com-badge';
            bd.contentEditable = 'false';
            bd.addEventListener('mousedown', function (e) { e.preventDefault(); });
            bd.addEventListener('click', function () { RC.open('comments'); });
            el.appendChild(bd);
        }
        bd.textContent = '💬 ' + n;
    }
    const origBuild = window.buildBlock;
    window.buildBlock = function (item) { const el = origBuild(item); badge(el, item); return el; };

    RC.init({
        app: 'omicron',
        appName: 'Omicron',
        docName: 'page',
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k === 'order'; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    // Every change ends in saveDoc(): that's our "something changed" signal!
    window.onOmicronChange = function () { RC.changed(); RC.cursorMoved(); drawSoon(); };
    page.addEventListener('input', function () { typing = Date.now(); });
    document.addEventListener('selectionchange', function () { if (myBlock()) RC.cursorMoved(); });
    page.addEventListener('mousedown', function () { setTimeout(function () { RC.cursorMoved(); }, 0); });
    scroller.addEventListener('scroll', drawSoon);
    window.addEventListener('resize', drawSoon);

    // Share buttons: in the Sway title bar and in the Classic sidebar!
    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad sidebar-action-btn', label: 'Share & Chat' }));
})();
