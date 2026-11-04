/* =====================================================================
   Radii Collab adapter for Zonerider! Build a 3D scene together, live.
   Every object is its own synced unit ('ob:<uuid>': its place in the tree, transform, material, light or camera
   settings), so two people moving different objects never collide. A mesh's vertices ride in their own unit
   ('geo:<uuid>.<version>'), so dragging a big imported model doesn't resend its geometry, and built-in shapes
   send only their settings. The world, render settings, screen effects, animation range and comments are one
   more unit ('settings'). Other people's selections glow in their color with a name tag, and Follow jumps to
   what they're working on. Everything else (rooms, encryption, chat, invites) is Radii Collab itself.
   ===================================================================== */
export function installCollab(Z) {
    const RC = window.RadiiCollab;
    if (!RC) return null;
    const { THREE, world, state } = Z;
    const root = document.documentElement.style;
    root.setProperty('--rc-a', '#a3e635');
    root.setProperty('--rc-b', '#4d7c0f');
    root.setProperty('--rc-rim', '#d9f99d');
    root.setProperty('--rc-glow', 'rgba(132, 204, 22, 0.35)');

    const clone = (o) => JSON.parse(JSON.stringify(o));
    const kindOf = (o) => (o.isMesh ? 'Mesh' : o.isPointLight ? 'PointLight' : o.isDirectionalLight ? 'DirectionalLight' : o.isSpotLight ? 'SpotLight' : o.isPerspectiveCamera ? 'PerspectiveCamera' : o.isGroup ? 'Group' : 'Object3D');
    const kids = (p) => p.children.filter((c) => c.name !== '__target');
    const geoCache = new Map();         // geometry unit key -> its JSON (built once)
    const seen = new WeakMap();         // object -> { mk: material json, gk: geometry key } it was last built from
    const matLoader = new THREE.MaterialLoader();
    const geoLoader = new THREE.BufferGeometryLoader();

    function geoKey(o) {
        const z = o.userData.zr || {};
        if (z.prim && Z.PRIMS[z.prim]) return null;
        return 'geo:' + o.geometry.uuid + '.' + (z.gv || 0);
    }
    function matJson(m) {
        const pick = (x) => { const j = x.toJSON(); delete j.metadata; return j; };
        return Array.isArray(m) ? m.map(pick) : pick(m);
    }

    /* ---------- Snapshot: the scene as units ---------- */
    function snapshot() {
        const out = {
            settings: { world: state.worldSet, render: state.renderSet, fx: state.fxSet, screenShader: state.screenShader || null, end: state.end, fps: state.fps, sceneCamera: state.sceneCamera, comments: state.comments || [] }
        };
        Z.rememberLights();
        world.traverse((o) => {
            if (o === world || o.name === '__target') return;
            o.updateMatrix();
            const ud = clone(o.userData || {});
            const u = { p: o.parent === world ? '' : o.parent.uuid, i: kids(o.parent).indexOf(o), k: kindOf(o), n: o.name, m: o.matrix.toArray(), v: o.visible, ud: ud, sh: [!!o.castShadow, !!o.receiveShadow] };
            if (o.isMesh) {
                u.mat = matJson(o.material);
                const gk = geoKey(o);
                u.g = gk;
                if (gk) {
                    if (!geoCache.has(gk)) { const j = o.geometry.toJSON(); delete j.metadata; geoCache.set(gk, j); }
                    out[gk] = geoCache.get(gk);
                }
            }
            if (o.isLight) u.l = { c: '#' + o.color.getHexString(), i: o.userData.zrIntensity != null ? o.userData.zrIntensity : o.intensity, d: o.distance || 0, a: o.angle || 0, pe: o.penumbra || 0, de: o.decay != null ? o.decay : 2, cs: !!o.castShadow };
            if (o.isPerspectiveCamera) u.c = { fov: o.fov, near: o.near, far: o.far, aspect: o.aspect };
            out['ob:' + o.uuid] = u;
        });
        return out;
    }

    /* ---------- Apply: build or update objects in place ---------- */
    function build(v, uuid) {
        let o;
        if (v.k === 'Mesh') o = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial());
        else if (v.k === 'PointLight') o = new THREE.PointLight();
        else if (v.k === 'DirectionalLight') o = new THREE.DirectionalLight();
        else if (v.k === 'SpotLight') o = new THREE.SpotLight();
        else if (v.k === 'PerspectiveCamera') o = new THREE.PerspectiveCamera();
        else if (v.k === 'Group') o = new THREE.Group();
        else o = new THREE.Object3D();
        o.uuid = uuid;
        return o;
    }
    // false: the geometry hasn't arrived yet (try again on the next change)
    function update(o, v, changed) {
        o.name = v.n;
        o.matrix.fromArray(v.m);
        o.matrix.decompose(o.position, o.quaternion, o.scale);
        o.visible = v.v;
        o.userData = clone(v.ud || {});
        o.castShadow = !!(v.sh && v.sh[0]); o.receiveShadow = !!(v.sh && v.sh[1]);
        const was = seen.get(o) || {};
        if (o.isMesh) {
            const z = o.userData.zr || {};
            const gk = v.g || ('prim:' + (z.prim || '') + JSON.stringify(z.params || {}));
            if (gk !== was.gk) {
                if (v.g) {
                    const j = changed[v.g] || RC.unit(v.g);
                    if (!j) return false;
                    o.geometry.dispose(); o.geometry = geoLoader.parse(j);
                } else if (z.prim && Z.PRIMS[z.prim]) {
                    o.geometry.dispose(); o.geometry = Z.primGeometry(z.prim, Object.assign({}, Z.PRIMS[z.prim].params, z.params || {}));
                }
                was.gk = gk;
            }
            const mk = JSON.stringify(v.mat);
            if (mk !== was.mk) {
                const mm = Array.isArray(v.mat) ? v.mat.map((m) => matLoader.parse(m)) : matLoader.parse(v.mat);
                (Array.isArray(mm) ? mm : [mm]).forEach((x) => Z.hydrateGd(x));
                o.material = mm;
                was.mk = mk;
            }
        }
        if (o.isLight && v.l) {
            o.color.set(v.l.c);
            o.userData.zrIntensity = v.l.i;
            o.intensity = v.l.i;
            if ('distance' in o) o.distance = v.l.d;
            if (o.isSpotLight) { o.angle = v.l.a; o.penumbra = v.l.pe; }
            if ('decay' in o) o.decay = v.l.de;
            o.castShadow = v.l.cs;
            if (o.shadow) { o.shadow.mapSize.set(2048, 2048); o.shadow.bias = -0.0005; }
            Z.attachTarget(o);
        }
        if (o.isPerspectiveCamera && v.c) { o.fov = v.c.fov; o.near = v.c.near; o.far = v.c.far; o.aspect = v.c.aspect || o.aspect; o.updateProjectionMatrix(); }
        seen.set(o, was);
        return true;
    }
    // what I'm in the middle of keeps MY version (it syncs when I let go)
    function busy(o) {
        if (Z.gizmoDragging() && (state.selected.includes(o) || state.active === o)) return true;
        if (state.edit && state.edit.mesh === o) return true;
        return false;
    }
    function apply(changed, full) {
        const again = [];
        if (full) { while (world.children.length) world.remove(world.children[0]); }
        if (changed.settings) {
            const s = changed.settings;
            Object.assign(state.worldSet, s.world || {});
            Object.assign(state.renderSet, s.render || {});
            state.fxSet = Object.assign({}, Z.FX_DEFAULTS, s.fx || {});
            state.end = s.end || state.end; state.fps = s.fps || state.fps;
            state.sceneCamera = s.sceneCamera || null;
            state.comments = s.comments || [];
            state.screenShader = s.screenShader || null;
        }
        const keys = Object.keys(changed).filter((k) => k.indexOf('ob:') === 0);
        const placed = [];
        keys.forEach((k) => {
            const uuid = k.slice(3), v = changed[k];
            let o = Z.byUuid(uuid);
            if (v === null) { if (o && o.parent) { if (state.edit && state.edit.mesh === o) Z.setMode('object'); o.parent.remove(o); } return; }
            if (o && busy(o)) { again.push(k); return; }
            if (!o || kindOf(o) !== v.k) {
                const fresh = build(v, uuid);
                if (o) { kids(o).forEach((c) => fresh.add(c)); if (o.parent) o.parent.remove(o); }
                o = fresh;
            }
            if (!update(o, v, changed)) { again.push(k); if (!o.parent) world.add(o); }
            placed.push([o, v]);
        });
        // the tree: each object under its parent, in its place
        placed.forEach(([o, v]) => {
            const parent = v.p ? Z.byUuid(v.p) : world;
            if (!parent) { if (!o.parent) world.add(o); again.push('ob:' + o.uuid); return; }
            if (o.parent !== parent) parent.add(o);
        });
        // ...in its place among its brothers and sisters (the outliner's order)
        placed.forEach(([o, v]) => {
            const p = o.parent; if (!p) return;
            const list = kids(p), at = list.indexOf(o), want = Math.min(Math.max(0, v.i | 0), list.length - 1);
            if (at < 0 || at === want) return;
            p.children.splice(p.children.indexOf(o), 1);
            const rest = kids(p), before = rest[want];
            if (before) p.children.splice(p.children.indexOf(before), 0, o); else p.children.push(o);
        });
        Z.afterRemote();
        return again;
    }

    /* ---------- Sessions + backups ---------- */
    const BACKUP = 'zonerider_collab_backup';
    function backup() { try { localStorage.setItem(BACKUP, JSON.stringify(Z.serialize())); return true; } catch (e) { return false; } }
    function hasBackup() { try { return !!localStorage.getItem(BACKUP); } catch (e) { return false; } }
    function restoreBackup() {
        const b = JSON.parse(localStorage.getItem(BACKUP) || 'null');
        if (!b) return;
        Z.restore(b, true);
        try { localStorage.removeItem(BACKUP); } catch (e) {}
    }
    function begin(mode) {
        if (mode === 'guest') { while (world.children.length) world.remove(world.children[0]); Z.afterRemote(); }
    }

    /* ---------- Presence: who has what selected ---------- */
    function cursor() { return { s: state.active ? state.active.uuid : null, e: state.mode === 'edit' }; }
    function where(cur) {
        if (!cur || !cur.s) return 'Looking around';
        const o = Z.byUuid(cur.s);
        return o ? (cur.e ? 'Editing the vertices of ' : 'Working on ') + o.name : 'Looking around';
    }
    const marks = new Map();   // peer id -> { box, tag }
    function drawCursors(peers) {
        const live = new Set();
        peers.forEach((p) => {
            const o = p.cur && p.cur.s ? Z.byUuid(p.cur.s) : null;
            if (!o) return;
            live.add(p.id);
            let m = marks.get(p.id);
            if (!m || m.obj !== o) {
                if (m) { Z.helpers.remove(m.box); m.tag.remove(); }
                const box = new THREE.BoxHelper(o, new THREE.Color(p.color));
                box.material.depthTest = false; box.material.transparent = true; box.material.opacity = 0.95;
                Z.helpers.add(box);
                const tag = document.createElement('div');
                tag.className = 'zr-peer';
                document.getElementById('zr-view').appendChild(tag);
                m = { box, tag, obj: o };
                marks.set(p.id, m);
            }
            m.box.material.color.set(p.color);
            m.tag.style.background = p.color;
            m.tag.textContent = (p.name || 'Someone') + (p.cur.e ? ' (vertices)' : '');
        });
        for (const [id, m] of marks) if (!live.has(id)) { Z.helpers.remove(m.box); m.tag.remove(); marks.delete(id); }
    }
    // each frame: boxes follow their objects, name tags sit above them
    const v3 = new THREE.Vector3();
    function frame(camera, w, h) {
        for (const m of marks.values()) {
            if (!m.obj.parent) { m.tag.style.display = 'none'; continue; }
            m.box.update();
            const b = new THREE.Box3().setFromObject(m.obj);
            if (b.isEmpty()) b.setFromCenterAndSize(m.obj.getWorldPosition(v3.clone()), new THREE.Vector3(0.5, 0.5, 0.5));
            v3.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2).project(camera);
            const off = v3.z > 1 || v3.z < -1;
            m.tag.style.display = off ? 'none' : '';
            m.tag.style.left = ((v3.x + 1) / 2 * w) + 'px';
            m.tag.style.top = ((1 - v3.y) / 2 * h) + 'px';
        }
    }
    function follow(cur) {
        const o = cur && cur.s ? Z.byUuid(cur.s) : null;
        if (!o) return;
        if (state.mode === 'edit') Z.setMode('object');
        Z.select([o]);
        Z.frameObjects([o]);
    }

    /* ---------- Comments, pinned to objects (or the whole scene) ---------- */
    const comments = {
        hint: 'Comment on the selected object (or the scene)',
        list: () => (state.comments || []).map((c) => { const o = c.obj ? Z.byUuid(c.obj) : null; return { id: c.id, where: o ? o.name : 'The scene', items: c.items }; }),
        add: (text, me) => {
            state.comments = state.comments || [];
            state.comments.push({ id: 'c' + RC.uid(8), obj: state.active ? state.active.uuid : null, items: [{ by: me.id, name: me.name, text: text, at: Date.now() }] });
            Z.changed();
            return true;
        },
        reply: (id, text, me) => { const c = (state.comments || []).find((x) => x.id === id); if (c) { c.items.push({ by: me.id, name: me.name, text: text, at: Date.now() }); Z.changed(); } },
        resolve: (id) => { state.comments = (state.comments || []).filter((x) => x.id !== id); Z.changed(); },
        jump: (id) => { const c = (state.comments || []).find((x) => x.id === id); const o = c && c.obj ? Z.byUuid(c.obj) : null; if (o) { Z.select([o]); Z.frameObjects([o]); } }
    };

    RC.init({
        app: 'zonerider',
        appName: 'Zonerider',
        docName: 'scene',
        adapter: { snapshot, apply, mergeable: () => false, begin, backup, hasBackup, restore: restoreBackup, cursor, where, drawCursors, follow, comments }
    });
    return { frame, share: () => RC.toggle && RC.toggle(), button: (o) => RC.shareButton(o) };
}
