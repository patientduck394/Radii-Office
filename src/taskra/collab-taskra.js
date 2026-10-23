/* =====================================================================
   Radii Collab adapter for Taskra! Every task is its own synced unit, so
   two people can add, tick and edit different tasks at once. Comments ride
   on the tasks, and teammates show as colored dots on the task they're on!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof tasks === 'undefined') return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#a5b4fc');
    root.setProperty('--rc-b', '#6366f1');
    root.setProperty('--rc-rim', '#c7d2fe');
    root.setProperty('--rc-glow', 'rgba(99, 102, 241, 0.45)');
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    let picked = null;

    function snapshot() {
        const out = {};
        tasks.forEach(function (t) { out['t:' + t.id] = t; });
        return out;
    }
    function apply() {
        const next = RC.unitKeys('t:').map(function (k) { return clone(RC.unit(k)); }).filter(function (t) { return validTask(t); });
        tasks = next;
        try { localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ tasks: tasks })); } catch (e) {}
        render();
        paint();
        return [];
    }

    /* ---------- Sessions: joining opens a backup of your own list ---------- */
    const BACKUP = 'taskra_collab_backup';
    function backup() { try { localStorage.setItem(BACKUP, JSON.stringify(tasks)); return true; } catch (e) { return false; } }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const list = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!Array.isArray(list)) return;
        tasks = list.filter(validTask);
        persist();
        render();
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) { if (mode === 'guest') { tasks = []; render(); } paint(); }

    /* ---------- Presence + comments ---------- */
    function titleOf(id) { const t = tasks.find(function (x) { return x.id === id; }); return t ? t.title : ''; }
    function cursor() { return { t: picked }; }
    function where(cur) { const n = cur && cur.t ? titleOf(cur.t) : ''; return n ? 'On "' + n.slice(0, 28) + '"' : 'Looking around'; }
    let peersNow = [];
    function paint() {
        const list = document.getElementById('tasks-list');
        if (!list) return;
        [].forEach.call(list.querySelectorAll('.task-row'), function (row) {
            let layer = row.querySelector(':scope > .rc-tabdots');
            const id = (row.querySelector('.task-check') || {}).getAttribute ? (/'([^']+)'/.exec(row.querySelector('.task-check').getAttribute('onchange') || '') || [])[1] : null;
            if (!layer) { layer = document.createElement('div'); layer.className = 'rc-tabdots'; layer.style.cssText = 'display:flex;gap:4px;align-items:center;margin-right:6px'; row.insertBefore(layer, row.querySelector('.task-actions')); }
            RC.keyed(layer, peersNow.filter(function (p) { return p.cur && p.cur.t === id; }).map(function (p) {
                return { key: p.id, tag: 'i', cls: '', style: 'background:' + p.color + ';width:12px;height:12px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)', title: p.name, html: '' };
            }));
            const t = tasks.find(function (x) { return x.id === id; });
            row.classList.toggle('rc-picked', id === picked);
            let b = row.querySelector('.rc-count');
            const n = t && t.comments ? t.comments.length : 0;
            if (n && !b) { b = document.createElement('span'); b.className = 'rc-count'; b.style.cssText = 'font-size:11px;font-weight:800;color:#6366f1;margin-left:6px'; row.querySelector('.task-title').after(b); }
            if (b) { if (n) b.textContent = '💬 ' + n; else b.remove(); }
        });
    }
    function drawCursors(peers) { peersNow = peers; paint(); }
    function idFromRow(row) { const c = row.querySelector('.task-check'); const m = c && /'([^']+)'/.exec(c.getAttribute('onchange') || ''); return m ? m[1] : null; }
    document.addEventListener('click', function (e) {
        const row = e.target.closest && e.target.closest('.task-row');
        if (row) { picked = idFromRow(row); paint(); RC.cursorMoved(); }
    });
    function follow() {}

    function label(t) { return '“' + String(t.title).slice(0, 28) + '”'; }
    function commit(t) { persist(); render(); paint(); }
    const comments = {
        hint: 'Comment on the task you clicked',
        list: function () {
            const out = [];
            tasks.forEach(function (t) { (t.comments || []).forEach(function (c) { out.push({ id: t.id + '|' + c.id, where: label(t), items: c.items }); }); });
            return out;
        },
        add: function (text, me) {
            const t = tasks.find(function (x) { return x.id === picked; });
            if (!t) { RC.toast('Click a task first, then write your comment!'); return false; }
            t.comments = t.comments || [];
            t.comments.push({ id: 'c' + RC.uid(8), items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            commit(t);
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            const t = tasks.find(function (x) { return x.id === p[0]; });
            const c = t && (t.comments || []).find(function (x) { return x.id === p[1]; });
            if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); commit(t); }
        },
        resolve: function (id) {
            const p = id.split('|');
            const t = tasks.find(function (x) { return x.id === p[0]; });
            if (t) { t.comments = (t.comments || []).filter(function (x) { return x.id !== p[1]; }); if (!t.comments.length) delete t.comments; commit(t); }
        },
        jump: function (id) {
            picked = id.split('|')[0];
            paint();
            const rows = document.querySelectorAll('#tasks-list .task-row');
            [].forEach.call(rows, function (r) { if (idFromRow(r) === picked) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.add('rc-flash'); setTimeout(function () { r.classList.remove('rc-flash'); }, 1300); } });
        }
    };

    RC.init({
        app: 'taskra',
        appName: 'Taskra',
        docName: 'task list',
        adapter: { snapshot: snapshot, apply: apply, mergeable: function () { return false; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    // Every change goes through persist()!
    const origPersist = window.persist;
    window.persist = function () { const r = origPersist.apply(this, arguments); RC.changed(); return r; };
    const origRender = window.render;
    window.render = function () { const r = origRender.apply(this, arguments); paint(); return r; };

    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad action-btn', label: 'Share & Chat' }));
})();
