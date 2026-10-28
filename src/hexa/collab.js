// Radii Collab adapter for Hexa! The calendar's events and the Boards (columns + cards) all sync
// live: every event and every card is its own unit, and the card order inside each column is
// merged so two people adding cards at once both keep theirs!
// Comments ride on events and cards, and teammates show as colored dots beside the month title!
(function () {
    'use strict';
    const app = window.Hexa;
    const RC = window.RadiiCollab;
    if (!app || !RC) return;

    const BACKUP_KEY = 'hexa_collab_backup';
    const clone = (x) => (x === undefined || x === null ? null : JSON.parse(JSON.stringify(x)));
    const has = (x) => x !== undefined && x !== null;

    let picked = null; // { kind: "e" | "k", id }
    let peersNow = [];
    let layer = null;

    // ---------- Snapshot: events, boards, columns, cards ----------
    function snapshot() {
        const out = { bo: app.boards().map((b) => b.id) };
        app.events().forEach((e) => { out['e:' + e.id] = e; });
        app.boards().forEach((b) => {
            out['bm:' + b.id] = { name: b.name };
            out['bc:' + b.id] = b.columns.map((c) => c.id);
            b.columns.forEach((c) => {
                out['cm:' + b.id + ':' + c.id] = { name: c.name };
                out['ko:' + b.id + ':' + c.id] = c.cards.map((k) => k.id);
                c.cards.forEach((k) => { out['k:' + k.id] = Object.assign({ b: b.id, c: c.id }, k); });
            });
        });
        return clone(out);
    }

    // Puts ids from `list` that `out` is missing back in, right after their old neighbor!
    function insertMissing(out, list, exists) {
        out = out.slice();
        let added = false;
        (list || []).forEach((id, i) => {
            if (out.includes(id) || !exists(id)) return;
            let at = 0;
            for (let k = i - 1; k >= 0; k--) {
                const p = out.indexOf(list[k]);
                if (p >= 0) { at = p + 1; break; }
            }
            out.splice(at, 0, id);
            added = true;
        });
        return [out, added];
    }

    const unit = (k) => clone(RC.unit(k));
    const nameOr = (u, fallback) => (u && has(u.name) && u.name !== false ? u.name : fallback);

    const style = document.documentElement.style;
    Object.entries({ '--rc-a': '#5eead4', '--rc-b': '#14b8a6', '--rc-rim': '#99f6e4', '--rc-glow': 'rgba(20, 184, 166, 0.45)' })
        .forEach(([k, v]) => style.setProperty(k, v));

    function where(cur) {
        if (!cur) return 'Looking around';
        if (cur.v === 'boards') {
            const b = app.boards().find((x) => x.id === cur.b);
            return 'On board ' + (b ? '"' + b.name + '"' : '');
        }
        return 'Viewing ' + (has(cur.m) ? app.MONTHS[cur.m] + ' ' + cur.y : 'the calendar');
    }

    function paint() {
        const host = document.querySelector('.calendar-toolbar .toolbar-hint') || document.querySelector('.calendar-toolbar');
        if (!host) return;
        if (!(layer && layer.isConnected)) {
            layer = document.createElement('div');
            layer.className = 'rc-tabdots';
            layer.style.cssText = 'display:flex;gap:5px;align-items:center;margin-left:10px';
            host.after(layer);
        }
        RC.keyed(layer, peersNow.map((p) => ({
            key: p.id, tag: 'i', cls: '', html: '', title: p.name + ' · ' + where(p.cur),
            style: 'background:' + p.color + ';width:13px;height:13px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)',
        })));
        document.querySelectorAll('[data-rc-id]').forEach((e) => e.removeAttribute('data-rc-id'));
    }

    function redraw() { app.render(); if (app.state.view === 'boards') app.renderBoards(); }

    function findThing(kind, id) {
        if (kind === 'e') return app.events().find((e) => e.id === id) || null;
        for (const b of app.boards()) for (const c of b.columns) for (const k of c.cards) if (k.id === id) return k;
        return null;
    }

    function updateThing(kind, id, f) {
        const swap = (x) => (x.id === id ? f(Object.assign({}, x)) : x);
        if (kind === 'e') {
            app.state.events = app.events().map(swap);
        } else {
            app.state.boards = app.boards().map((b) => Object.assign({}, b, {
                columns: b.columns.map((c) => Object.assign({}, c, { cards: c.cards.map(swap) })),
            }));
        }
    }

    function commit() { app.persist(); redraw(); }
    const comment = (me, text) => ({ by: me.id, name: me.name, text: text, at: Date.now() });

    const adapter = {
        snapshot: snapshot,
        apply: (_changed, full, lost) => {
            lost = lost || {};
            const local = full ? {} : snapshot();
            const again = [];
            const order = (key, exists) => {
                let ids = (RC.unit(key) || []).filter(exists);
                let a, b;
                [ids, a] = insertMissing(ids, lost[key], exists);
                if (full) b = false;
                else [ids, b] = insertMissing(ids, local[key], exists);
                if (a || b) again.push(key);
                return ids;
            };
            // Cards by column, so strays (a card whose column order isn't here yet) still land!
            const cardsBy = {};
            Array.from(RC.unitKeys('k:')).forEach((k) => {
                const u = RC.unit(k);
                if (u) (cardsBy[u.b + ':' + u.c] = cardsBy[u.b + ':' + u.c] || []).push(k.substring(2));
            });
            const bExists = (id) => has(RC.unit('bm:' + id));
            const nextBoards = order('bo', bExists).map((bid) => {
                const cExists = (cid) => has(RC.unit('cm:' + bid + ':' + cid));
                const cols = order('bc:' + bid, cExists).map((cid) => {
                    const here = cardsBy[bid + ':' + cid] || [];
                    let ids = order('ko:' + bid + ':' + cid, (id) => here.includes(id));
                    ids = ids.concat(here.filter((id) => !ids.includes(id)));
                    return {
                        id: cid, name: nameOr(unit('cm:' + bid + ':' + cid), 'Column'),
                        cards: ids.map((id) => { const k = unit('k:' + id); if (k) { delete k.b; delete k.c; } return k; }),
                    };
                });
                return { id: bid, name: nameOr(unit('bm:' + bid), 'Board'), columns: cols };
            }).filter((b) => b.columns.length);
            const evs = Array.from(RC.unitKeys('e:')).map(unit)
                .filter((e) => e && typeof e.title === 'string' && app.parseDate(e.date));
            app.state.events = evs;
            app.state.boards = nextBoards;
            app.ensureBoards();
            // save quietly: this change came FROM the session, so no RC.changed() echo
            try { localStorage.setItem(app.STORAGE_KEY, JSON.stringify(app.saveJson())); } catch (e) { /* fine */ }
            redraw();
            paint();
            return again;
        },
        mergeable: (k) => k === 'bo' || k.startsWith('bc:') || k.startsWith('ko:'),
        begin: (mode) => {
            if (mode === 'guest') {
                app.state.events = [];
                app.state.boards = [];
                app.ensureBoards();
                redraw();
            }
            paint();
        },
        backup: () => {
            try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ events: app.events(), boards: app.boards() })); return true; } catch (e) { return false; }
        },
        hasBackup: () => { try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; } },
        restore: () => {
            const d = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
            if (!d) return;
            app.state.events = Array.isArray(d.events) ? d.events : [];
            app.state.boards = Array.isArray(d.boards) ? d.boards : [];
            app.ensureBoards();
            app.persist();
            redraw();
            try { localStorage.removeItem(BACKUP_KEY); } catch (e) { /* fine */ }
        },
        cursor: () => {
            const s = app.state;
            return { v: s.view, d: s.selected, y: s.year, m: s.month, b: s.activeBoard };
        },
        where: where,
        drawCursors: (peers) => { peersNow = Array.from(peers); paint(); },
        follow: (cur) => {
            if (!cur) return;
            if (cur.v && cur.v !== app.state.view) app.setViewMode(cur.v);
            if (has(cur.y) && has(cur.m)) {
                app.state.year = cur.y;
                app.state.month = cur.m;
                app.render();
            }
        },
        comments: {
            hint: 'Comment on the event or card you opened',
            list: () => {
                const out = [];
                app.events().forEach((x) => (x.comments || []).forEach((c) => {
                    out.push({ id: 'e|' + x.id + '|' + c.id, where: 'Event · ' + x.title, items: c.items });
                }));
                app.boards().forEach((b) => b.columns.forEach((col) => col.cards.forEach((k) => (k.comments || []).forEach((c) => {
                    out.push({ id: 'k|' + k.id + '|' + c.id, where: 'Card · ' + k.title, items: c.items });
                }))));
                return out;
            },
            add: (text, me) => {
                if (!(picked && picked.kind && findThing(picked.kind, picked.id))) {
                    RC.toast('Open an event or a card first (click it), then comment!');
                    return false;
                }
                updateThing(picked.kind, picked.id, (t) => {
                    t.comments = (t.comments || []).concat([{ id: 'c' + RC.uid(8), items: [comment(me, text)] }]);
                    return t;
                });
                commit();
                return true;
            },
            reply: (id, text, me) => {
                const [kind, tid, cid] = id.split('|');
                updateThing(kind, tid, (t) => {
                    t.comments = (t.comments || []).map((c) => (c.id === cid ? Object.assign({}, c, { items: (c.items || []).concat([comment(me, text)]) }) : c));
                    return t;
                });
                commit();
            },
            resolve: (id) => {
                const [kind, tid, cid] = id.split('|');
                updateThing(kind, tid, (t) => {
                    const cs = (t.comments || []).filter((c) => c.id !== cid);
                    if (cs.length) t.comments = cs; else delete t.comments;
                    return t;
                });
                commit();
            },
            jump: (id) => {
                const [kind, tid] = id.split('|');
                const t = findThing(kind, tid);
                if (!t) return;
                if (kind === 'e' && t.date) {
                    app.state.selected = t.date;
                    const p = app.parseDate(t.date);
                    if (p) { app.state.year = p.y; app.state.month = p.m; }
                    if (app.state.view !== 'calendar') app.setViewMode('calendar');
                    app.render();
                } else if (kind === 'k' && app.state.view !== 'boards') {
                    app.setViewMode('boards');
                }
            },
        },
    };

    // Comments go on the event or card you last opened!
    document.addEventListener('click', (e) => {
        const el = e.target.closest && e.target.closest('[onclick]');
        if (!el) return;
        const code = el.getAttribute('onclick') || '';
        let m;
        if ((m = /editEvent\('([^']+)'\)/.exec(code))) {
            picked = { kind: 'e', id: m[1] };
            RC.cursorMoved();
        } else if ((m = /editCard\('[^']*',\s*'[^']*',\s*'([^']+)'\)/.exec(code))) {
            picked = { kind: 'k', id: m[1] };
        }
    });
    document.addEventListener('click', (e) => {
        const card = e.target.closest && e.target.closest('.kanban-card');
        if (!card) return;
        const first = card.querySelector('div');
        const t = first ? first.textContent : undefined;
        app.boards().forEach((b) => b.columns.forEach((c) => c.cards.forEach((k) => {
            if (k.title === t) picked = { kind: 'k', id: k.id };
        })));
    }, true);
    RC.init({ app: 'hexa', appName: 'Hexa', docName: 'calendar', adapter: adapter });
    app.persistHooks.push(() => RC.changed());
    app.renderHooks.push(() => RC.cursorMoved());
    app.viewHooks.push(() => RC.cursorMoved());
    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad action-btn', label: 'Share & Chat' }));
})();
