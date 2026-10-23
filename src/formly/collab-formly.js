/* =====================================================================
   Radii Collab adapter for Formly! The form's title and description are
   one unit, every field is its own unit (label, type, options AND the
   answer, so everyone sees answers appear live), and the field order is
   merged so two people adding fields at once both keep theirs! Fields are
   updated in place, so what you're typing is never replaced under you.
   Comments ride on fields, and teammates show as dots on the field they're
   on!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.RadiiCollab || typeof formState === 'undefined') return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#c4b5fd');
    root.setProperty('--rc-b', '#8b5cf6');
    root.setProperty('--rc-rim', '#ddd6fe');
    root.setProperty('--rc-glow', 'rgba(139, 92, 246, 0.45)');
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    function snapshot() {
        const out = { meta: { title: formState.title, description: formState.description }, order: formState.fields.map(function (f) { return f.id; }) };
        formState.fields.forEach(function (f) { out['f:' + f.id] = f; });
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
    let deferT = 0;
    function typingInside() {
        const a = document.activeElement;
        return !!(a && a.closest && a.closest('#form-fields-list') && /^(INPUT|TEXTAREA)$/.test(a.tagName) || (a && a.isContentEditable && a.closest && a.closest('#form-fields-list')));
    }
    function redraw() {
        if (typingInside()) {
            // Redraw once you stop typing (the state is already updated, in place)!
            clearTimeout(deferT);
            deferT = setTimeout(function () { if (typingInside()) redraw(); else { renderForm(); paint(); } }, 900);
            return;
        }
        renderForm();
        paint();
    }
    function apply(changed, full, lost) {
        lost = lost || {};
        const again = [];
        const exists = function (id) { return RC.unit('f:' + id) != null; };
        const order = (RC.unit('order') || []).filter(exists);
        const a = insertMissing(order, lost.order, exists);
        const b = full ? false : insertMissing(order, formState.fields.map(function (f) { return f.id; }), exists);
        if (a || b) again.push('order');
        const byId = {};
        formState.fields.forEach(function (f) { byId[f.id] = f; });
        formState.fields = order.map(function (id) {
            const v = clone(RC.unit('f:' + id));
            const cur = byId[id];
            if (!cur) return v;
            if (full || ('f:' + id) in changed) { Object.keys(cur).forEach(function (k) { if (!(k in v)) delete cur[k]; }); Object.assign(cur, v); }
            return cur;
        });
        const meta = RC.unit('meta');
        if (meta) { formState.title = meta.title; formState.description = meta.description; }
        saveFormly();
        redraw();
        return again;
    }

    const BACKUP = 'formly_collab_backup';
    function backup() { try { localStorage.setItem(BACKUP, JSON.stringify(formState)); return true; } catch (e) { return false; } }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restore() {
        const d = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!d || !Array.isArray(d.fields)) return;
        formState = d;
        currentMode = 'builder';
        renderForm();
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) { if (mode === 'guest') { formState = { title: 'Shared form', description: '', fields: [] }; currentMode = 'builder'; renderForm(); } paint(); }

    /* ---------- Presence + comments ---------- */
    let picked = null, peersNow = [];
    function fieldIdAt(card) { const i = [].indexOf.call(formFieldsList.children, card); return i === -1 ? null : (formState.fields[i] || {}).id || null; }
    formFieldsList.addEventListener('focusin', function (e) { const c = e.target.closest('.form-field-card'); if (c) { picked = fieldIdAt(c); RC.cursorMoved(); } });
    formFieldsList.addEventListener('click', function (e) { const c = e.target.closest('.form-field-card'); if (c) { picked = fieldIdAt(c); RC.cursorMoved(); } });
    function cursor() { return { f: picked, m: currentMode }; }
    function labelOf(id) { const f = formState.fields.find(function (x) { return x.id === id; }); return f ? String(f.label).replace(/#[A-Z]+#|~[A-Z-]+~|=[A-Z]+=/g, '').slice(0, 30) : ''; }
    function where(cur) { const n = cur && cur.f ? labelOf(cur.f) : ''; return n ? 'On "' + n + '"' : 'Looking around'; }
    function paint() {
        [].forEach.call(formFieldsList.children, function (card, i) {
            const f = formState.fields[i];
            if (!f) return;
            let layer = card.querySelector(':scope > .rc-tabdots');
            if (!layer) { layer = document.createElement('div'); layer.className = 'rc-tabdots'; layer.style.cssText = 'position:absolute;top:-7px;right:14px;display:flex;gap:4px'; card.appendChild(layer); }
            RC.keyed(layer, peersNow.filter(function (p) { return p.cur && p.cur.f === f.id; }).map(function (p) {
                return { key: p.id, tag: 'i', cls: '', style: 'background:' + p.color + ';width:13px;height:13px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)', title: p.name, html: '' };
            }));
            let b = card.querySelector(':scope > .rc-count');
            const n = (f.comments || []).length;
            if (n && !b) { b = document.createElement('button'); b.type = 'button'; b.className = 'rc-count'; b.style.cssText = 'position:absolute;top:-9px;left:14px;border:0;border-radius:999px;padding:1px 8px;font:700 11px "JetBrains Mono",monospace;color:#fff;background:linear-gradient(180deg,#c4b5fd,#8b5cf6);cursor:pointer'; b.addEventListener('click', function () { RC.open('comments'); }); card.appendChild(b); }
            if (b) { if (n) b.textContent = '💬 ' + n; else b.remove(); }
        });
    }
    function drawCursors(peers) { peersNow = peers; paint(); }
    function follow(cur) { if (cur && cur.f) { const i = formState.fields.findIndex(function (f) { return f.id === cur.f; }); const c = formFieldsList.children[i]; if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
    function commit() { saveFormly(); renderForm(); paint(); }
    const comments = {
        hint: 'Comment on the field you are on',
        list: function () { const out = []; formState.fields.forEach(function (f) { (f.comments || []).forEach(function (c) { out.push({ id: f.id + '|' + c.id, where: 'Field · ' + labelOf(f.id), items: c.items }); }); }); return out; },
        add: function (text, me) {
            const f = formState.fields.find(function (x) { return x.id === picked; });
            if (!f) { RC.toast('Click a field first, then write your comment!'); return false; }
            f.comments = f.comments || [];
            f.comments.push({ id: 'c' + RC.uid(8), items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            commit();
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            const f = formState.fields.find(function (x) { return x.id === p[0]; });
            const c = f && (f.comments || []).find(function (x) { return x.id === p[1]; });
            if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); commit(); }
        },
        resolve: function (id) {
            const p = id.split('|');
            const f = formState.fields.find(function (x) { return x.id === p[0]; });
            if (f) { f.comments = (f.comments || []).filter(function (x) { return x.id !== p[1]; }); if (!f.comments.length) delete f.comments; commit(); }
        },
        jump: function (id) { picked = id.split('|')[0]; follow({ f: picked }); }
    };

    RC.init({
        app: 'formly',
        appName: 'Formly',
        docName: 'form',
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k === 'order'; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    window.onFormlyChange = function () { RC.changed(); RC.cursorMoved(); };
    const origRender = window.renderForm;
    window.renderForm = function () { const r = origRender.apply(this, arguments); paint(); return r; };

    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad pad-toggle-btn', label: 'Share & Chat' }));
})();
