/* =====================================================================
   Radii Collab adapter for Hexa! The calendar's events and the Boards
   (columns + cards) all sync live: every event and every card is its own
   unit, and the card order inside each column is merged so two people
   adding cards at once both keep theirs! Comments ride on events and cards,
   and teammates show as colored dots beside the month title!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof events === 'undefined') return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#5eead4');
    root.setProperty('--rc-b', '#14b8a6');
    root.setProperty('--rc-rim', '#99f6e4');
    root.setProperty('--rc-glow', 'rgba(20, 184, 166, 0.45)');
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    /* ---------- Snapshot: events, boards, columns, cards ---------- */
    function snapshot() {
        const out = { bo: boards.map(function (b) { return b.id; }) };
        events.forEach(function (e) { out['e:' + e.id] = e; });
        boards.forEach(function (b) {
            out['bm:' + b.id] = { name: b.name };
            out['bc:' + b.id] = b.columns.map(function (c) { return c.id; });
            b.columns.forEach(function (c) {
                out['cm:' + b.id + ':' + c.id] = { name: c.name };
                out['ko:' + b.id + ':' + c.id] = c.cards.map(function (k) { return k.id; });
                c.cards.forEach(function (k) { out['k:' + k.id] = Object.assign({ b: b.id, c: c.id }, k); });
            });
        });
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
        const local = full ? {} : snapshot();
        function order(key, exists) {
            const ids = (RC.unit(key) || []).filter(exists);
            const a = insertMissing(ids, lost[key], exists);
            const b = full ? false : insertMissing(ids, local[key], exists);
            if (a || b) again.push(key);
            return ids;
        }
        // Cards by column, so strays (a card whose column order isn't here yet) still land!
        const cardsBy = {};
        RC.unitKeys('k:').forEach(function (k) { const u = RC.unit(k); if (u) (cardsBy[u.b + ':' + u.c] = cardsBy[u.b + ':' + u.c] || []).push(k.slice(2)); });
        const bExists = function (id) { return RC.unit('bm:' + id) != null; };
        const nextBoards = order('bo', bExists).map(function (bid) {
            const cExists = function (id) { return RC.unit('cm:' + bid + ':' + id) != null; };
            const cols = order('bc:' + bid, cExists).map(function (cid) {
                const has = cardsBy[bid + ':' + cid] || [];
                const kExists = function (id) { return has.indexOf(id) !== -1; };
                const ids = order('ko:' + bid + ':' + cid, kExists);
                has.forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
                return { id: cid, name: (RC.unit('cm:' + bid + ':' + cid) || {}).name || 'Column', cards: ids.map(function (id) { const c = clone(RC.unit('k:' + id)); delete c.b; delete c.c; return c; }) };
            });
            return { id: bid, name: (RC.unit('bm:' + bid) || {}).name || 'Board', columns: cols };
        }).filter(function (b) { return b.columns.length; });
        events = RC.unitKeys('e:').map(function (k) { return clone(RC.unit(k)); }).filter(function (e) { return e && typeof e.title === 'string' && parseDateStr(e.date); });
        boards = nextBoards;
        ensureBoards();
        try { localStorage.setItem(HEXA_STORAGE_KEY, JSON.stringify({ events: events, boards: boards, activeBoardId: activeBoardId })); } catch (e) {}
        render();
        if (currentView === 'boards') renderBoards();
        paint();
        return again;
    }

    /* ---------- Sessions ---------- */
    const BACKUP = 'hexa_collab_backup';
    function backup() { try { localStorage.setItem(BACKUP, JSON.stringify({ events: events, boards: boards })); return true; } catch (e) { return false; } }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const d = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!d) return;
        events = Array.isArray(d.events) ? d.events : [];
        boards = Array.isArray(d.boards) ? d.boards : [];
        ensureBoards();
        persist();
        render();
        if (currentView === 'boards') renderBoards();
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) {
        if (mode === 'guest') { events = []; boards = []; ensureBoards(); render(); if (currentView === 'boards') renderBoards(); }
        paint();
    }

    /* ---------- Presence ---------- */
    let peersNow = [], layer = null;
    function cursor() { return { v: currentView, d: selectedDate, y: cursorYear, m: cursorMonth, b: activeBoardId }; }
    function where(cur) {
        if (!cur) return 'Looking around';
        if (cur.v === 'boards') { const b = boards.find(function (x) { return x.id === cur.b; }); return 'On board ' + (b ? '"' + b.name + '"' : ''); }
        return 'Viewing ' + (cur.m != null ? MONTHS[cur.m] + ' ' + cur.y : 'the calendar');
    }
    function paint() {
        const host = document.querySelector('.calendar-toolbar .toolbar-hint') || document.querySelector('.calendar-toolbar');
        if (!host) return;
        if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.className = 'rc-tabdots'; layer.style.cssText = 'display:flex;gap:5px;align-items:center;margin-left:10px'; host.after(layer); }
        RC.keyed(layer, peersNow.map(function (p) {
            return { key: p.id, tag: 'i', cls: '', style: 'background:' + p.color + ';width:13px;height:13px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)', title: p.name + ' · ' + where(p.cur), html: '' };
        }));
        document.querySelectorAll('[data-rc-id]').forEach(function (e) { e.removeAttribute('data-rc-id'); });
    }
    function drawCursors(peers) { peersNow = peers; paint(); }
    function follow(cur) {
        if (!cur) return;
        if (cur.v && cur.v !== currentView) setViewMode(cur.v);
        if (cur.y != null && cur.m != null) { cursorYear = cur.y; cursorMonth = cur.m; render(); }
    }

    /* ---------- Comments: on the event or card you last opened ---------- */
    let picked = null; // {kind:'e'|'k', id}
    document.addEventListener('click', function (e) {
        const el = e.target.closest && e.target.closest('[onclick]');
        if (!el) return;
        const code = el.getAttribute('onclick') || '';
        let m = /editEvent\('([^']+)'\)/.exec(code);
        if (m) { picked = { kind: 'e', id: m[1] }; RC.cursorMoved(); return; }
        m = /editCard\('[^']*',\s*'[^']*',\s*'([^']+)'\)/.exec(code);
        if (m) picked = { kind: 'k', id: m[1] };
    });
    document.addEventListener('click', function (e) {
        const card = e.target.closest && e.target.closest('.kanban-card');
        if (!card) return;
        const t = card.querySelector('div') && card.querySelector('div').textContent;
        boards.forEach(function (b) { b.columns.forEach(function (c) { c.cards.forEach(function (k) { if (k.title === t) picked = { kind: 'k', id: k.id }; }); }); });
    }, true);
    function find(kind, id) {
        if (kind === 'e') return events.find(function (x) { return x.id === id; });
        let hit = null;
        boards.forEach(function (b) { b.columns.forEach(function (c) { c.cards.forEach(function (k) { if (k.id === id) hit = k; }); }); });
        return hit;
    }
    function commit() { persist(); render(); if (currentView === 'boards') renderBoards(); }
    const comments = {
        hint: 'Comment on the event or card you opened',
        list: function () {
            const out = [];
            events.forEach(function (x) { (x.comments || []).forEach(function (c) { out.push({ id: 'e|' + x.id + '|' + c.id, where: 'Event · ' + x.title, items: c.items }); }); });
            boards.forEach(function (b) { b.columns.forEach(function (c) { c.cards.forEach(function (k) { (k.comments || []).forEach(function (cm) { out.push({ id: 'k|' + k.id + '|' + cm.id, where: 'Card · ' + k.title, items: cm.items }); }); }); }); });
            return out;
        },
        add: function (text, me) {
            const t = picked && find(picked.kind, picked.id);
            if (!t) { RC.toast('Open an event or a card first (click it), then comment!'); return false; }
            t.comments = t.comments || [];
            t.comments.push({ id: 'c' + RC.uid(8), items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            commit();
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            const t = find(p[0], p[1]);
            const c = t && (t.comments || []).find(function (x) { return x.id === p[2]; });
            if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); commit(); }
        },
        resolve: function (id) {
            const p = id.split('|');
            const t = find(p[0], p[1]);
            if (t) { t.comments = (t.comments || []).filter(function (x) { return x.id !== p[2]; }); if (!t.comments.length) delete t.comments; commit(); }
        },
        jump: function (id) {
            const p = id.split('|');
            const t = find(p[0], p[1]);
            if (!t) return;
            if (p[0] === 'e' && t.date) { const d = parseDateStr(t.date); selectedDate = t.date; if (d) { cursorYear = d.y != null ? d.y : cursorYear; cursorMonth = d.m != null ? d.m : cursorMonth; } if (currentView !== 'calendar') setViewMode('calendar'); render(); }
            else if (p[0] === 'k' && currentView !== 'boards') setViewMode('boards');
        }
    };

    RC.init({
        app: 'hexa',
        appName: 'Hexa',
        docName: 'calendar',
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k === 'bo' || k.indexOf('bc:') === 0 || k.indexOf('ko:') === 0; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    const origPersist = window.persist;
    window.persist = function () { const r = origPersist.apply(this, arguments); RC.changed(); return r; };
    const origRender = window.render;
    window.render = function () { const r = origRender.apply(this, arguments); RC.cursorMoved(); return r; };
    const origSwitch = window.setViewMode;
    window.setViewMode = function () { const r = origSwitch.apply(this, arguments); RC.cursorMoved(); return r; };

    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad action-btn', label: 'Share & Chat' }));
})();
