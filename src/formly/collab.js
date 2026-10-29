// Radii Collab adapter for Formly! The form's title and description are one unit, every field is
// its own unit (label, type, options AND the answer, so everyone sees answers appear live), and
// the field order is merged so two people adding fields at once both keep theirs!
// Redraws wait while you're typing, so what you type is never replaced under you. Comments ride
// on fields, and teammates show as dots on the field they're on!
(function () {
    'use strict';
    const app = window.Formly;
    const RC = window.RadiiCollab;
    if (!app || !RC) return;

    const BACKUP_KEY = 'formly_collab_backup';
    const clone = (x) => (x === undefined || x === null ? x : JSON.parse(JSON.stringify(x)));

    let picked = null;
    let peersNow = [];
    let deferTimer = null;

    const listEl = () => app.$('form-fields-list');

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

    function labelOf(id) {
        const f = app.fields().find((x) => x.id === id);
        if (!f) return '';
        return String(f.label === undefined || f.label === null ? '' : f.label).replace(/#[A-Z]+#|~[A-Z-]+~|=[A-Z]+=/g, '').slice(0, 30);
    }

    function typingInside() {
        const a = document.activeElement;
        return !!(a && a.closest && a.closest('#form-fields-list') && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
    }

    const style = document.documentElement.style;
    Object.entries({ '--rc-a': '#c4b5fd', '--rc-b': '#8b5cf6', '--rc-rim': '#ddd6fe', '--rc-glow': 'rgba(139, 92, 246, 0.45)' })
        .forEach(([k, v]) => style.setProperty(k, v));

    function paint() {
        const cards = Array.from(listEl().children);
        const fs = app.fields();
        cards.slice(0, fs.length).forEach((card, i) => {
            const f = fs[i];
            let layer = card.querySelector(':scope > .rc-tabdots');
            if (!layer) {
                layer = document.createElement('div');
                layer.className = 'rc-tabdots';
                layer.style.cssText = 'position:absolute;top:-7px;right:14px;display:flex;gap:4px';
                card.appendChild(layer);
            }
            const n = (f.comments || []).length;
            const badge = card.querySelector(':scope > .rc-count');
            RC.keyed(layer, peersNow.filter((p) => p.cur && p.cur.f === f.id).map((p) => ({
                key: p.id, tag: 'i', cls: '', title: p.name, html: '',
                style: 'background:' + p.color + ';width:13px;height:13px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)',
            })));
            if (n > 0 && badge) {
                badge.textContent = '💬 ' + n;
            } else if (n > 0) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'rc-count';
                b.style.cssText = 'position:absolute;top:-9px;left:14px;border:0;border-radius:999px;padding:1px 8px;font:700 11px "JetBrains Mono",monospace;color:#fff;background:linear-gradient(180deg,#c4b5fd,#8b5cf6);cursor:pointer';
                b.textContent = '💬 ' + n;
                b.addEventListener('click', () => RC.open('comments'));
                card.appendChild(b);
            } else if (badge) {
                badge.remove();
            }
        });
    }

    function redraw() {
        if (typingInside()) {
            // redraw once you stop typing (the state is already updated)!
            clearTimeout(deferTimer);
            deferTimer = setTimeout(() => (typingInside() ? redraw() : app.render()), 900);
        } else {
            app.render();
        }
    }

    function fieldIdAt(card) {
        const i = Array.from(listEl().children).indexOf(card);
        const f = i >= 0 ? app.fields()[i] : null;
        return f ? f.id : null;
    }

    function pick(e) {
        const c = e.target.closest('.form-field-card');
        if (c) { picked = fieldIdAt(c); RC.cursorMoved(); }
    }

    function follow(cur) {
        if (!cur || !cur.f) return;
        const i = app.fields().findIndex((f) => f.id === cur.f);
        const c = i >= 0 ? listEl().children[i] : null;
        if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    const commit = () => app.render();
    const comment = (me, text) => ({ by: me.id, name: me.name, text: text, at: Date.now() });

    const adapter = {
        snapshot: () => {
            const f = app.form();
            const snap = { meta: { title: f.title, description: f.description }, order: f.fields.map((x) => x.id) };
            f.fields.forEach((x) => { snap['f:' + x.id] = clone(x); });
            return snap;
        },
        apply: (changed, full, lost) => {
            const exists = (id) => RC.unit('f:' + id) !== undefined && RC.unit('f:' + id) !== null;
            lost = lost || {};
            let ids = (RC.unit('order') || []).filter(exists);
            let a, b;
            [ids, a] = insertMissing(ids, lost.order, exists);
            if (full) b = false;
            else [ids, b] = insertMissing(ids, app.fields().map((x) => x.id), exists);
            const mine = {};
            app.fields().forEach((x) => { mine[x.id] = x; });
            const fields = ids.map((id) => {
                const cur = mine[id];
                // only fields that changed over there are replaced, the rest stay as you have them
                if (cur && !full && !(changed && Object.prototype.hasOwnProperty.call(changed, 'f:' + id))) return cur;
                return clone(RC.unit('f:' + id));
            });
            const meta = clone(RC.unit('meta'));
            const next = Object.assign({}, app.form(), { fields: fields });
            if (meta) { next.title = meta.title; next.description = meta.description; }
            app.state.form = next;
            app.save();
            redraw();
            return a || b ? ['order'] : [];
        },
        mergeable: (k) => k === 'order',
        begin: (mode) => {
            if (mode === 'guest') {
                app.state.form = { title: 'Shared form', description: '', fields: [] };
                app.state.mode = 'builder';
                app.state.locked = false;
                app.render();
            }
            paint();
        },
        backup: () => { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(app.form())); return true; } catch (e) { return false; } },
        hasBackup: () => { try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; } },
        restore: () => {
            const d = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
            if (d && Array.isArray(d.fields)) {
                app.state.form = d;
                app.state.mode = 'builder';
                app.state.locked = false;
                app.render();
                try { localStorage.removeItem(BACKUP_KEY); } catch (e) { /* fine */ }
            }
        },
        cursor: () => ({ f: picked, m: app.mode() }),
        where: (cur) => {
            const n = cur && cur.f ? labelOf(cur.f) : '';
            return n ? 'On "' + n + '"' : 'Looking around';
        },
        drawCursors: (peers) => { peersNow = Array.from(peers); paint(); },
        follow: follow,
        comments: {
            hint: 'Comment on the field you are on',
            list: () => {
                const out = [];
                app.fields().forEach((f) => (f.comments || []).forEach((c) => {
                    out.push({ id: f.id + '|' + c.id, where: 'Field · ' + labelOf(f.id), items: c.items });
                }));
                return out;
            },
            add: (text, me) => {
                if (!app.fields().some((f) => f.id === picked)) {
                    RC.toast('Click a field first, then write your comment!');
                    return false;
                }
                app.updateField(picked, (f) => {
                    f.comments = (f.comments || []).concat([{ id: 'c' + RC.uid(8), items: [comment(me, text)] }]);
                    return f;
                });
                commit();
                return true;
            },
            reply: (id, text, me) => {
                const [fid, cid] = id.split('|');
                app.updateField(fid, (f) => {
                    f.comments = (f.comments || []).map((c) => (c.id === cid ? Object.assign({}, c, { items: (c.items || []).concat([comment(me, text)]) }) : c));
                    return f;
                });
                commit();
            },
            resolve: (id) => {
                const [fid, cid] = id.split('|');
                app.updateField(fid, (f) => {
                    const cs = (f.comments || []).filter((c) => c.id !== cid);
                    if (cs.length) f.comments = cs; else delete f.comments;
                    return f;
                });
                commit();
            },
            jump: (id) => {
                picked = id.split('|')[0];
                follow({ f: picked });
            },
        },
    };

    listEl().addEventListener('focusin', pick);
    listEl().addEventListener('click', pick);
    RC.init({ app: 'formly', appName: 'Formly', docName: 'form', adapter: adapter });
    app.changeHooks.push(() => { RC.changed(); RC.cursorMoved(); });
    app.renderHooks.push(paint);
    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad pad-toggle-btn', label: 'Share & Chat' }));
})();
