// Radii Collab adapter for Taskra! Every task is its own synced unit, so two people can add,
// tick and edit different tasks at once. Comments ride on the tasks, and teammates show as
// colored dots on the task they're on! (The sync engine is radii-collab.js!)
(function () {
    'use strict';
    const app = window.Taskra;
    const RC = window.RadiiCollab;
    if (!app || !RC) return;

    const BACKUP_KEY = 'taskra_collab_backup';
    const clone = (x) => (x === undefined || x === null ? x : JSON.parse(JSON.stringify(x)));

    let picked = null;
    let peersNow = [];

    function updateTask(id, f) {
        app.state.tasks = app.tasks().map((t) => (t.id === id ? f(Object.assign({}, t)) : t));
    }

    function idFromRow(row) {
        const c = row.querySelector('.task-check');
        const m = c ? /'([^']+)'/.exec(c.getAttribute('onchange') || '') : null;
        return m ? m[1] : null;
    }

    const style = document.documentElement.style;
    Object.entries({ '--rc-a': '#a5b4fc', '--rc-b': '#6366f1', '--rc-rim': '#c7d2fe', '--rc-glow': 'rgba(99, 102, 241, 0.45)' })
        .forEach(([k, v]) => style.setProperty(k, v));

    function paint() {
        const list = app.$('tasks-list');
        if (!list) return;
        list.querySelectorAll('.task-row').forEach((row) => {
            const id = idFromRow(row);
            let layer = row.querySelector(':scope > .rc-tabdots');
            if (!layer) {
                layer = document.createElement('div');
                layer.className = 'rc-tabdots';
                layer.style.cssText = 'display:flex;gap:4px;align-items:center;margin-right:6px';
                row.insertBefore(layer, row.querySelector('.task-actions'));
            }
            const t = app.findTask(id);
            const n = ((t && t.comments) || []).length;
            const badge = row.querySelector('.rc-count');
            RC.keyed(layer, peersNow.filter((p) => p.cur && p.cur.t === id).map((p) => ({
                key: p.id, tag: 'i', cls: '', title: p.name, html: '',
                style: 'background:' + p.color + ';width:12px;height:12px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)',
            })));
            row.classList.toggle('rc-picked', id === picked);
            if (n > 0 && badge) {
                badge.textContent = '💬 ' + n;
            } else if (n > 0) {
                const b = document.createElement('span');
                b.className = 'rc-count';
                b.style.cssText = 'font-size:11px;font-weight:800;color:#6366f1;margin-left:6px';
                b.textContent = '💬 ' + n;
                row.querySelector('.task-title').after(b);
            } else if (badge) {
                badge.remove();
            }
        });
    }

    function commit() { app.changed(); paint(); }
    const label = (t) => '“' + String(t.title === undefined || t.title === null ? '' : t.title).substring(0, 28) + '”';
    const titleOf = (id) => { const t = app.findTask(id); return (t && t.title) || ''; };
    const comment = (me, text) => ({ by: me.id, name: me.name, text: text, at: Date.now() });

    const adapter = {
        snapshot: () => {
            const out = {};
            app.tasks().forEach((t) => { out['t:' + t.id] = clone(t); });
            return out;
        },
        apply: () => {
            const next = Array.from(RC.unitKeys('t:')).map((k) => clone(RC.unit(k))).filter(app.validTask);
            app.state.tasks = next;
            // save quietly: this change came FROM the session, so no RC.changed() echo
            try { localStorage.setItem(app.STORAGE_KEY, JSON.stringify({ tasks: next })); } catch (e) { /* fine */ }
            app.render();
            paint();
            return [];
        },
        mergeable: () => false,
        begin: (mode) => {
            if (mode === 'guest') { app.state.tasks = []; app.render(); }
            paint();
        },
        backup: () => { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(app.tasks())); return true; } catch (e) { return false; } },
        hasBackup: () => { try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; } },
        restore: () => {
            const list = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
            if (Array.isArray(list)) {
                app.state.tasks = app.parseTasks(list);
                app.changed();
                try { localStorage.removeItem(BACKUP_KEY); } catch (e) { /* fine */ }
            }
        },
        cursor: () => ({ t: picked }),
        where: (cur) => {
            const n = cur && cur.t ? titleOf(cur.t) : '';
            return n ? 'On "' + n.substring(0, 28) + '"' : 'Looking around';
        },
        drawCursors: (peers) => { peersNow = Array.from(peers); paint(); },
        follow: () => null,
        comments: {
            hint: 'Comment on the task you clicked',
            list: () => {
                const out = [];
                app.tasks().forEach((t) => (t.comments || []).forEach((c) => {
                    out.push({ id: t.id + '|' + c.id, where: label(t), items: c.items });
                }));
                return out;
            },
            add: (text, me) => {
                if (!app.findTask(picked)) {
                    RC.toast('Click a task first, then write your comment!');
                    return false;
                }
                updateTask(picked, (t) => {
                    t.comments = (t.comments || []).concat([{ id: 'c' + RC.uid(8), items: [comment(me, text)] }]);
                    return t;
                });
                commit();
                return true;
            },
            reply: (id, text, me) => {
                const [tid, cid] = id.split('|');
                updateTask(tid, (t) => {
                    t.comments = (t.comments || []).map((c) => (c.id === cid ? Object.assign({}, c, { items: (c.items || []).concat([comment(me, text)]) }) : c));
                    return t;
                });
                commit();
            },
            resolve: (id) => {
                const [tid, cid] = id.split('|');
                updateTask(tid, (t) => {
                    const cs = (t.comments || []).filter((c) => c.id !== cid);
                    if (cs.length) t.comments = cs; else delete t.comments;
                    return t;
                });
                commit();
            },
            jump: (id) => {
                picked = id.split('|')[0];
                paint();
                document.querySelectorAll('#tasks-list .task-row').forEach((r) => {
                    if (idFromRow(r) !== picked) return;
                    r.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    r.classList.add('rc-flash');
                    setTimeout(() => r.classList.remove('rc-flash'), 1300);
                });
            },
        },
    };

    document.addEventListener('click', (e) => {
        const row = e.target.closest && e.target.closest('.task-row');
        if (!row) return;
        picked = idFromRow(row);
        paint();
        RC.cursorMoved();
    });
    RC.init({ app: 'taskra', appName: 'Taskra', docName: 'task list', adapter: adapter });
    // every local change goes through persist(), every redraw through render()
    app.persistHooks.push(() => RC.changed());
    app.renderHooks.push(paint);
    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad action-btn', label: 'Share & Chat' }));
})();
