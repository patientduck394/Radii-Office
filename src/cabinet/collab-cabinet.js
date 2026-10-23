/* =====================================================================
   Radii Collab adapter for Cabinet! The shared thing is the ACTIVE
   drawer. Every file and folder is its own synced unit (with its parent),
   each folder keeps two merged order lists (files + folders), and the
   drawer name rides in one more unit! Joining a drawer opens it as a NEW
   drawer, so your own drawers are never touched! Comments attach to the
   folder you're in (or the drawer itself at the top), and teammates show
   as little colored dots next to the drawer title with the folder they're
   in on hover!
   ===================================================================== */
(function () {
    'use strict';
    const cab = window.RadiiCabinet && window.RadiiCabinet._collab;
    if (!window.RadiiCollab || !cab) return;
    const RC = window.RadiiCollab;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#ff9a8f');
    root.setProperty('--rc-b', '#FF6B5E');
    root.setProperty('--rc-rim', '#ffc2bb');
    root.setProperty('--rc-glow', 'rgba(255, 107, 94, 0.45)');

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    const ROOT = 'root';

    /* ---------- Snapshot: the drawer flattened into units ---------- */
    function snapshot() {
        const d = cab.drawer();
        const out = { meta: { name: d.name, comments: d.comments || [] } };
        (function walk(P, files, folders) {
            out['of:' + P] = files.map(function (f) { return f.id; });
            out['od:' + P] = folders.map(function (f) { return f.id; });
            files.forEach(function (f) { out['n:' + f.id] = Object.assign({ k: 'f', p: P }, f); });
            folders.forEach(function (f) {
                const n = Object.assign({ k: 'd', p: P }, f);
                delete n.files; delete n.folders;
                out['n:' + f.id] = n;
                walk(f.id, f.files || [], f.folders || []);
            });
        })(ROOT, d.files, d.folders);
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

    /* ---------- Apply: rebuild the tree from the units ---------- */
    function apply(changed, full, lost) {
        lost = lost || {};
        const again = [];
        const local = full ? {} : snapshot();
        // Group node units by parent so strays still land somewhere!
        const kids = {};
        RC.unitKeys('n:').forEach(function (k) {
            const u = RC.unit(k);
            if (!u || !u.k) return;
            (kids[u.p] = kids[u.p] || []).push({ id: k.slice(2), u: u });
        });
        function order(key, kind, P) {
            const have = (kids[P] || []).filter(function (x) { return x.u.k === kind; }).map(function (x) { return x.id; });
            const ids = (RC.unit(key) || []).filter(function (id) { return have.indexOf(id) !== -1; });
            const exists = function (id) { return have.indexOf(id) !== -1; };
            const a = insertMissing(ids, lost[key], exists);
            const b = full ? false : insertMissing(ids, local[key], exists);
            if (a || b) again.push(key);
            have.forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
            return ids;
        }
        const seen = {};
        function build(P) {
            const files = order('of:' + P, 'f', P).map(function (id) { const n = clone(RC.unit('n:' + id)); delete n.k; delete n.p; return n; });
            const folders = [];
            order('od:' + P, 'd', P).forEach(function (id) {
                if (seen[id]) return;
                seen[id] = true;
                const n = clone(RC.unit('n:' + id));
                delete n.k; delete n.p;
                n.files = []; n.folders = [];
                const sub = build(id);
                n.files = sub.files; n.folders = sub.folders;
                folders.push(n);
            });
            return { files: files, folders: folders };
        }
        const t = build(ROOT);
        const meta = RC.unit('meta') || {};
        cab.set(meta.name || cab.drawer().name, t.files, t.folders, meta.comments || []);
        drawSoon();
        return again;
    }

    /* ---------- Sessions: joining opens a NEW drawer ---------- */
    const OWN = 'cabinet_collab_own_drawer';
    let ownId = null;
    try { ownId = localStorage.getItem(OWN); } catch (e) {}
    function backup() { ownId = cab.id(); try { localStorage.setItem(OWN, ownId); } catch (e) {} return true; }
    function hasBackup() { return !!ownId && cab.has(ownId) && cab.id() !== ownId; }
    function restore() {
        if (!ownId || !cab.has(ownId)) return;
        const shared = cab.id();
        cab.switchTo(ownId);
        // The shared copy stays as its own drawer, so nothing is lost!
        try { localStorage.removeItem(OWN); } catch (e) {}
        ownId = null;
        if (shared !== cab.id()) { /* kept in the drawer list on purpose */ }
    }
    function begin(mode) {
        if (mode === 'guest') {
            if (!ownId) backup();
            cab.fresh('Shared Drawer');
        }
        drawSoon();
    }

    /* ---------- Presence: dots by the title, folder on hover ---------- */
    function nameOf(path) {
        if (!path || !path.length) return 'the top of the drawer';
        const id = path[path.length - 1];
        let hit = null;
        (function walk(list) { list.forEach(function (f) { if (f.id === id) hit = f; if (!hit) walk(f.folders || []); }); })(cab.drawer().folders);
        return hit ? hit.name : 'a folder';
    }
    function cursor() { return { path: cab.path() }; }
    function where(cur) { return cur ? 'In ' + nameOf(cur.path) : 'Browsing'; }
    let layer = null, peersNow = [], drawQ = false;
    function drawSoon() {
        if (drawQ) return;
        drawQ = true;
        requestAnimationFrame(function () { drawQ = false; drawCursors(peersNow); });
    }
    function drawCursors(peers) {
        peersNow = peers;
        const head = document.querySelector('.drawer-menu-head');
        if (!head) return;
        if (!layer || layer.parentNode !== head) {
            layer = document.createElement('div');
            layer.className = 'rc-tabdots rc-cab-dots';
            layer.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:8px;min-height:0';
            const h1 = head.querySelector('h1');
            (h1 && h1.parentNode || head).appendChild(layer);
        }
        // Keyed: a dot pops once when someone arrives and shrinks away when they leave!
        RC.keyed(layer, peers.map(function (p) {
            return { key: p.id, tag: 'i', cls: '', style: 'background:' + p.color + ';width:12px;height:12px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)', title: p.name + ' · ' + where(p.cur), html: '' };
        }));
    }
    function follow(cur) { if (cur && cur.path) cab.goPath(cur.path); }
    new MutationObserver(function () { RC.cursorMoved(); }).observe(document.getElementById('folder-breadcrumb') || document.body, { childList: true, subtree: true });

    /* ---------- Comments: on the folder you're in, or the drawer ---------- */
    function findFolder(id) {
        let hit = null, trail = [];
        (function walk(list, t) { list.forEach(function (f) { if (hit) return; const tt = t.concat(f.id); if (f.id === id) { hit = f; trail = tt; } else walk(f.folders || [], tt); }); })(cab.drawer().folders, []);
        return hit ? { f: hit, trail: trail } : null;
    }
    function target(id) { return id === ROOT ? cab.drawer() : (findFolder(id) || {}).f; }
    function curTarget() { const p = cab.path(); return p.length ? { id: p[p.length - 1], t: target(p[p.length - 1]) } : { id: ROOT, t: cab.drawer() }; }
    function commit() { cab.set(cab.drawer().name, cab.drawer().files, cab.drawer().folders, cab.drawer().comments); }
    const comments = {
        hint: 'Comment on the folder you are in (or the drawer)',
        list: function () {
            const out = [];
            const d = cab.drawer();
            (d.comments || []).forEach(function (c) { out.push({ id: ROOT + '|' + c.id, where: 'Drawer · ' + d.name, items: c.items }); });
            (function walk(list) { list.forEach(function (f) { (f.comments || []).forEach(function (c) { out.push({ id: f.id + '|' + c.id, where: 'Folder · ' + f.name, items: c.items }); }); walk(f.folders || []); }); })(d.folders);
            return out;
        },
        add: function (text, me) {
            const c = curTarget();
            if (!c.t) { RC.toast('Open a folder first, or stay at the top for a drawer comment!'); return false; }
            c.t.comments = c.t.comments || [];
            c.t.comments.push({ id: 'c' + RC.uid(8), items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            commit();
            return true;
        },
        reply: function (id, text, me) {
            const p = id.split('|');
            const t = target(p[0]);
            const c = t && (t.comments || []).find(function (x) { return x.id === p[1]; });
            if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); commit(); }
        },
        resolve: function (id) {
            const p = id.split('|');
            const t = target(p[0]);
            if (t) { t.comments = (t.comments || []).filter(function (x) { return x.id !== p[1]; }); if (!t.comments.length) delete t.comments; commit(); }
        },
        jump: function (id) {
            const p = id.split('|')[0];
            if (p === ROOT) cab.goPath([]);
            else { const hit = findFolder(p); if (hit) cab.goPath(hit.trail); }
        }
    };

    RC.init({
        app: 'cabinet',
        appName: 'Cabinet',
        docName: 'drawer',
        adapter: { snapshot: snapshot, apply: apply, mergeable: function (k) { return k.indexOf('of:') === 0 || k.indexOf('od:') === 0; }, begin: begin, backup: backup, hasBackup: hasBackup, restore: restore, cursor: cursor, where: where, drawCursors: drawCursors, follow: follow, comments: comments }
    });
    window.onCabinetChange = function () { RC.changed(); drawSoon(); };

    const tr = document.querySelector('#os-title .os-tr');
    if (tr) tr.insertBefore(RC.shareButton(), tr.firstChild);
    const pads = document.querySelector('#sidebar .pad-selection-stack');
    if (pads) pads.appendChild(RC.shareButton({ cls: 'rc-pad pad-toggle-btn', label: 'Share & Chat' }));
})();
