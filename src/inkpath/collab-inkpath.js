/* =====================================================================
   Radii Collab adapter for Inkpath! Every SHAPE is its own synced unit
   (tagged with a tiny "rid"), plus one unit for the stacking order, so
   two people drawing or moving different shapes never collide! Remote
   mouse pointers glide over the canvas with name tags, and comments ride
   on the shapes themselves (so they save in .kv files too)!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof objects === 'undefined') return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#ff92d8');
    root.setProperty('--rc-b', '#FF60C5');
    root.setProperty('--rc-rim', '#ffb8e4');
    root.setProperty('--rc-glow', 'rgba(255, 96, 197, 0.45)');
    const svgEl = document.getElementById('viewport');
    // Zoom + pan live on the drawing layer, so map pointers through ITS transform!
    const layerEl = document.getElementById('drawing-layer');

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    // Every shape gets a stable id (duplicates made by copy/paste get a fresh one)!
    function ensureIds() {
        const seen = {};
        objects.forEach(function (o) {
            if (!o.rid || seen[o.rid]) o.rid = 'k' + RC.uid(8);
            seen[o.rid] = true;
        });
    }
    function byRid(rid) { return objects.find(function (o) { return o.rid === rid; }); }

    function snapshot() {
        ensureIds();
        const out = { order: objects.map(function (o) { return o.rid; }) };
        objects.forEach(function (o) { out['o:' + o.rid] = o; });
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
    function apply(changed, full, lost) {
        lost = lost || {};
        const again = [];
        const selRids = selectedIndices.map(function (i) { return objects[i] && objects[i].rid; }).filter(Boolean);
        // Shapes you're dragging or scaling right now keep YOUR version!
        const busy = (isMovingShape || isScalingShape || nodePress) ? selRids : [];
        const exists = function (rid) { return RC.unit('o:' + rid) != null; };
        const order = (RC.unit('order') || []).filter(exists);
        const a = insertMissing(order, lost.order, exists);
        const b = full ? false : insertMissing(order, objects.map(function (o) { return o.rid; }), exists);
        if (a || b) again.push('order');
        const next = order.map(function (rid) {
            const cur = byRid(rid);
            const k = 'o:' + rid;
            if (busy.indexOf(rid) !== -1 && cur) { if (k in changed) again.push(k); return cur; }
            if (cur && (k in changed || full)) {
                const v = RC.unit(k);
                Object.keys(cur).forEach(function (f) { if (!(f in v)) delete cur[f]; });
                Object.assign(cur, clone(v));
                return cur;
            }
            return cur || clone(RC.unit(k));
        });
        objects.length = 0;
        next.forEach(function (o) { objects.push(o); });
        selectedIndices = selRids.map(function (rid) { return objects.findIndex(function (o) { return o.rid === rid; }); }).filter(function (i) { return i >= 0; });
        render();
        drawSoon();
        return again;
    }

    /* ---------- Sessions + backups ---------- */
    const BACKUP = 'inkpath_collab_backup';
    function backup() { try { localStorage.setItem(BACKUP, JSON.stringify(objects)); return true; } catch (e) { return false; } }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const list = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!Array.isArray(list)) return;
        objects.length = 0;
        list.forEach(function (o) { objects.push(o); });
        selectedIndices = [];
        render();
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) {
        if (mode === 'guest') { objects.length = 0; selectedIndices = []; render(); }
        drawSoon();
    }

    /* ---------- Presence: live mouse pointers with name tags ---------- */
    let pointer = null;
    function toCanvas(e) {
        const m = layerEl.getScreenCTM();
        if (!m) return null;
        const p = svgEl.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        const q = p.matrixTransform(m.inverse());
        return { x: Math.round(q.x), y: Math.round(q.y) };
    }
    svgEl.addEventListener('mousemove', function (e) { pointer = toCanvas(e); RC.cursorMoved(); });
    svgEl.addEventListener('mouseleave', function () { pointer = null; RC.cursorMoved(); });
    function cursor() {
        return { p: pointer, sel: selectedIndices.map(function (i) { return objects[i] && objects[i].rid; }).filter(Boolean), tool: currentTool };
    }
    function where(cur) {
        if (!cur) return '';
        const n = (cur.sel || []).length;
        return (cur.tool ? cur.tool.charAt(0).toUpperCase() + cur.tool.slice(1) + ' tool' : 'Drawing') + (n ? ' · ' + n + ' selected' : '');
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
        const m = layerEl.getScreenCTM();
        const box = svgEl.getBoundingClientRect();
        if (!m) { RC.keyed(layer, []); return; }
        const items = [];
        peers.forEach(function (pr) {
            const c = pr.cur;
            if (!c || !c.p) return;
            const pt = svgEl.createSVGPoint();
            pt.x = c.p.x; pt.y = c.p.y;
            const s = pt.matrixTransform(m);
            if (s.x < box.left || s.x > box.right || s.y < box.top || s.y > box.bottom) return;
            items.push({ key: pr.id, cls: 'rc-pointer', style: 'left:' + s.x + 'px;top:' + s.y + 'px;color:' + pr.color, html: '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 1.5l13 6.2-5.6 1.6-2.4 5.6z" fill="currentColor" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg><span class="rc-flag" style="background:' + pr.color + '">' + RC.esc(pr.name) + '</span>' });
        });
        // Keyed: pointers glide; name tags pop only when someone arrives!
        RC.keyed(layer, items);
    }
    function follow(cur) {
        if (!cur || !cur.sel || !cur.sel.length) return;
        selectedIndices = cur.sel.map(function (rid) { return objects.findIndex(function (o) { return o.rid === rid; }); }).filter(function (i) { return i >= 0; });
        render();
    }

    /* ---------- Comments ride on the shapes ---------- */
    function label(o) {
        if (o.type === 'text') return '“' + String(o.text || '').slice(0, 24) + '”';
        return (o.name || (o.type.charAt(0).toUpperCase() + o.type.slice(1)));
    }
    const comments = {
        hint: 'Comment on the selected shape',
        list: function () {
            const out = [];
            objects.forEach(function (o) {
                (o.comments || []).forEach(function (c) { out.push({ id: o.rid + '|' + c.id, where: label(o), items: c.items }); });
            });
            return out;
        },
        add: function (text, me) {
            const o = objects[selectedIndices[0]];
            if (!o) { RC.toast('Select a shape first, then write your comment!'); return false; }
            ensureIds();
            o.comments = o.comments || [];
            o.comments.push({ id: 'c' + RC.uid(8), items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            render();
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            const o = byRid(p[0]);
            const c = o && (o.comments || []).find(function (x) { return x.id === p[1]; });
            if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); render(); }
        },
        resolve: function (id) {
            const p = id.split('|');
            const o = byRid(p[0]);
            if (o) { o.comments = (o.comments || []).filter(function (x) { return x.id !== p[1]; }); if (!o.comments.length) delete o.comments; render(); }
        },
        jump: function (id) {
            const i = objects.findIndex(function (o) { return o.rid === id.split('|')[0]; });
            if (i >= 0) { selectedIndices = [i]; render(); }
        }
    };

    // The drawing autosaves in this browser (under its ?file= ID), so files persist and can be opened by link!
    const DOC_KEY = 'inkpath_doc_v1';
    let saveT = 0;
    function autosave() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(DOC_KEY, JSON.stringify(objects)); } catch (e) {} }, 600); }
    try {
        const saved = JSON.parse(localStorage.getItem(DOC_KEY) || 'null');
        if (Array.isArray(saved) && saved.length && !objects.length) { saved.forEach(function (o) { objects.push(o); }); render(); }
    } catch (e) {}
    RC.init({
        app: 'inkpath',
        appName: 'Inkpath',
        docName: 'drawing',
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k === 'order'; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    // Every change ends in render(): that's our "something changed" signal!
    const origRender = window.render;
    window.render = function () { const r = origRender.apply(this, arguments); RC.changed(); RC.cursorMoved(); autosave(); return r; };
    window.addEventListener('resize', drawSoon);
    svgEl.addEventListener('wheel', function () { setTimeout(drawSoon, 30); });

    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) stack.appendChild(RC.shareButton({ cls: 'rc-pad action-btn', label: 'Share & Chat' }));
})();
