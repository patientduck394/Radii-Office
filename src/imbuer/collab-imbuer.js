/* =====================================================================
   Radii Collab adapter for Imbuer! Every CELL is its own synced unit
   (value + style + note + sparkline), plus one unit per sheet's settings
   and one for the sheet order, so two people editing different cells
   never collide! Remote selections show as colored boxes with name flags,
   and comments are Imbuer's own cell notes (so they save with the book)!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof book === 'undefined') return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#98f838');
    root.setProperty('--rc-b', '#54c702');
    root.setProperty('--rc-rim', '#b2fc7d');
    root.setProperty('--rc-glow', 'rgba(104, 199, 2, 0.35)');

    const CELL_MAPS = { d: 'data', s: 'styles', n: 'notes', k: 'sparks' };
    const SKIP = { id: 1, data: 1, styles: 1, notes: 1, sparks: 1, _sel: 1 };

    /* ---------- Snapshot ---------- */
    function meta(s) {
        const m = {};
        Object.keys(s).forEach(function (k) { if (!SKIP[k]) m[k] = s[k]; });
        return m;
    }
    function snapshot() {
        const out = { book: { name: book.name }, sheets: book.sheets.map(function (s) { return s.id; }) };
        book.sheets.forEach(function (s) {
            out['s:' + s.id] = meta(s);
            const cells = {};
            Object.keys(CELL_MAPS).forEach(function (short) {
                const map = s[CELL_MAPS[short]] || {};
                Object.keys(map).forEach(function (id) {
                    if (map[id] === undefined || map[id] === null || map[id] === '') return;
                    (cells[id] = cells[id] || {})[short] = map[id];
                });
            });
            Object.keys(cells).forEach(function (id) { out['c:' + s.id + ':' + id] = cells[id]; });
        });
        return out;
    }

    /* ---------- Apply remote changes ---------- */
    function sheetById(id) { return book.sheets.find(function (s) { return s.id === id; }); }
    function blankSheet(id) {
        const s = newSheet('Sheet');
        s.id = id;
        return s;
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
        const activeId = (book.sheets[book.active] || {}).id;
        let structural = full;
        if (full) {
            // First sync: the room's workbook replaces this one entirely!
            book.sheets.forEach(function (s) { Object.keys(CELL_MAPS).forEach(function (k) { s[CELL_MAPS[k]] = {}; }); });
        }
        if (full || 'sheets' in changed || 'sheets' in lost) {
            const exists = function (id) { return RC.unit('s:' + id) != null; };
            const order = (RC.unit('sheets') || []).filter(exists);
            const a = insertMissing(order, lost.sheets, exists);
            const b = full ? false : insertMissing(order, book.sheets.map(function (s) { return s.id; }), exists);
            if (order.length) {
                book.sheets = order.map(function (id) { return sheetById(id) || blankSheet(id); });
                structural = true;
            }
            if (a || b) again.push('sheets');
        }
        Object.keys(changed).forEach(function (k) {
            if (k.indexOf('s:') === 0) {
                const s = sheetById(k.slice(2));
                const m = changed[k];
                if (!s || !m) return;
                Object.keys(s).forEach(function (f) { if (!SKIP[f] && !(f in m)) delete s[f]; });
                Object.assign(s, m);
                fixSheet(s);
                structural = true;
            }
        });
        Object.keys(changed).forEach(function (k) {
            if (k.indexOf('c:') !== 0) return;
            const p = k.split(':');
            const s = sheetById(p[1]);
            if (!s) return;
            const cell = p.slice(2).join(':');
            const v = changed[k] || {};
            Object.keys(CELL_MAPS).forEach(function (short) {
                const map = s[CELL_MAPS[short]] || (s[CELL_MAPS[short]] = {});
                if (v[short] === undefined) delete map[cell];
                else map[cell] = v[short];
            });
        });
        if ('book' in changed && changed.book && changed.book.name) {
            book.name = changed.book.name;
            try { syncBookName(); } catch (e) {}
        }
        // Stay on the sheet you were looking at (if it still exists)!
        const idx = book.sheets.findIndex(function (s) { return s.id === activeId; });
        book.active = idx >= 0 ? idx : 0;
        try {
            recalc();
            if (structural) { initGrid(); renderSheetTabs(); }
            else renderAll(true);
            drawSel({ animate: false });
            saveNow();
        } catch (e) { console.error(e); }
        drawSoon();
        return again;
    }

    /* ---------- Sessions + backups ---------- */
    const BACKUP = 'imbuer_collab_backup';
    function refreshAll() {
        try { resetTransient(); } catch (e) {}
        recalc();
        initGrid();
        renderSheetTabs();
        try { syncBookName(); } catch (e) {}
        drawSel({ animate: false });
        saveNow();
    }
    function backup() {
        try { localStorage.setItem(BACKUP, JSON.stringify(book)); return true; } catch (e) { return false; }
    }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const b = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!b || !Array.isArray(b.sheets) || !b.sheets.length) return;
        b.sheets.forEach(fixSheet);
        b.active = Math.max(0, Math.min(b.sheets.length - 1, b.active | 0));
        book = b;
        refreshAll();
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) {
        if (mode === 'guest') {
            if (isEditing()) commitEdit(0, 0);
            book = newBook();
            book.name = 'Joining…';
            refreshAll();
        }
        drawSoon();
    }

    /* ---------- Presence: remote selections as colored boxes ---------- */
    function cursor() {
        const R = rng();
        return { s: (book.sheets[book.active] || {}).id, r0: R.r0, c0: R.c0, r1: R.r1, c1: R.c1 };
    }
    function where(cur) {
        if (!cur) return '';
        const s = sheetById(cur.s);
        if (!s) return '';
        const a = idOf(cur.r0, cur.c0), b = idOf(cur.r1, cur.c1);
        return s.name + '!' + (a === b ? a : a + ':' + b);
    }
    let peersNow = [], drawQ = false;
    function drawSoon() {
        if (drawQ) return;
        drawQ = true;
        requestAnimationFrame(function () { drawQ = false; drawCursors(peersNow); });
    }
    function drawCursors(peers) {
        peersNow = peers;
        const ov = document.getElementById('ov');
        if (!ov) return;
        let layer = document.getElementById('rc-cells');
        if (!layer) { layer = document.createElement('div'); layer.id = 'rc-cells'; layer.className = 'rc-cursors'; ov.appendChild(layer); }
        const act = (book.sheets[book.active] || {}).id;
        const items = [];
        peers.forEach(function (p) {
            const c = p.cur;
            if (!c || c.s !== act) return;
            try {
                const a = cellRect(c.r0, c.c0), b = cellRect(c.r1, c.c1);
                items.push({ key: p.id, cls: 'rc-box', style: 'left:' + a.x + 'px;top:' + a.y + 'px;width:' + (b.x + b.w - a.x) + 'px;height:' + (b.y + b.h - a.y) + 'px;border-color:' + p.color + ';background:' + p.color + '14', html: '<span class="rc-flag" style="background:' + p.color + '">' + RC.esc(p.name) + '</span>' });
            } catch (e) {}
        });
        // Keyed: boxes glide between cells; name tags pop only when someone arrives!
        RC.keyed(layer, items);
        // Colored dots on the sheet tabs show who's on which sheet!
        document.querySelectorAll('.stab').forEach(function (tab, i) {
            const s = book.sheets[i];
            let dots = tab.querySelector('.rc-tabdots');
            const here = peers.filter(function (p) { return p.cur && s && p.cur.s === s.id; });
            if (!here.length) { if (dots) dots.remove(); return; }
            if (!dots) { dots = document.createElement('span'); dots.className = 'rc-tabdots'; tab.appendChild(dots); }
            dots.innerHTML = here.map(function (p) { return '<i style="background:' + p.color + '" title="' + RC.esc(p.name) + '"></i>'; }).join('');
        });
    }
    function follow(cur) {
        if (!cur) return;
        const i = book.sheets.findIndex(function (s) { return s.id === cur.s; });
        if (i >= 0 && i !== book.active) switchSheet(i);
        selectCell(cur.r0, cur.c0);
    }

    /* ---------- Comments = cell notes ("Name: text" lines) ---------- */
    function parseNote(text) {
        return String(text || '').split('\n').filter(Boolean).map(function (line) {
            const m = line.match(/^([^:\n]{1,24}): ([\s\S]*)$/);
            return m ? { name: m[1], by: m[1], text: m[2] } : { name: 'Note', by: 'note', text: line };
        });
    }
    function noteChange(sid, cell, fn) {
        const s = sheetById(sid);
        if (!s) return;
        const next = fn(s.notes[cell] || '');
        if (next) s.notes[cell] = next; else delete s.notes[cell];
        renderAll(false);
        persistSheets();
    }
    const comments = {
        hint: 'Comment on the selected cell',
        list: function () {
            const out = [];
            book.sheets.forEach(function (s) {
                Object.keys(s.notes || {}).forEach(function (cell) {
                    if (s.notes[cell]) out.push({ id: s.id + '|' + cell, where: s.name + '!' + cell, items: parseNote(s.notes[cell]) });
                });
            });
            return out;
        },
        add: function (text, me) {
            const s = sh();
            const cell = idOf(sel.act.r, sel.act.c);
            noteChange(s.id, cell, function (old) { return (old ? old + '\n' : '') + me.name + ': ' + text.replace(/\n/g, ' '); });
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            noteChange(p[0], p[1], function (old) { return (old ? old + '\n' : '') + me.name + ': ' + text.replace(/\n/g, ' '); });
        },
        resolve: function (id) {
            const p = id.split('|');
            noteChange(p[0], p[1], function () { return ''; });
        },
        jump: function (id) {
            const p = id.split('|');
            const i = book.sheets.findIndex(function (s) { return s.id === p[0]; });
            if (i >= 0 && i !== book.active) switchSheet(i);
            const rc = rcOf(p[1]);
            selectCell(rc.r, rc.c);
        }
    };

    /* ---------- Wire it up ---------- */
    RC.init({
        app: 'imbuer',
        appName: 'Imbuer',
        docName: 'workbook',
        toast: function (m) { try { toast(m); } catch (e) {} },
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k === 'sheets'; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    // Every edit ends in persistSheets(): that's our "something changed" signal!
    const origPersist = window.persistSheets;
    window.persistSheets = function () { origPersist.apply(this, arguments); RC.changed(); RC.cursorMoved(); };
    // Selections move without saving, so drawSel tells presence too!
    const origDrawSel = window.drawSel;
    window.drawSel = function () { const r = origDrawSel.apply(this, arguments); RC.cursorMoved(); drawSoon(); return r; };
    const origInit = window.initGrid;
    window.initGrid = function () { const r = origInit.apply(this, arguments); drawSoon(); return r; };

    // Share buttons: the Excel title bar + the Imbuer Classic sidebar!
    const tr = document.querySelector('#titlebar .tb-right');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('#classic-side .pad-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad pad-btn', label: 'Share & Chat' }));
})();
