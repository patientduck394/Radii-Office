/* =====================================================================
   ANIMATION for Inkpath! Keyframes on a timeline, played live, and exported as a REAL animated SVG!

   Each shape can carry `anim` tracks: { dx, dy, rot, scale, opacity, fill }, and every track is a list of keyframes
   { t: 0..1 (a fraction of the animation's length), v: the value }. The animation's own settings (length, loop, easing)
   live in the drawing's file under `animation`. Between keyframes the value moves with the chosen easing.

   How it is drawn: while the Animate window is open (and when exporting), app.js calls inkpathAnim.after() for every shape,
   which wraps what the shape drew in <g> layers carrying SMIL <animateTransform> / <animate> elements. SMIL is part of
   the SVG itself, so the exported .svg animates in any browser without scripts, and Blur Behind (frosted glass) copies keep
   moving in step with the shapes behind them. The editor plays, pauses and scrubs it with pauseAnimations / setCurrentTime.
   ===================================================================== */
(function (root) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const A = { dur: 3, loop: true, ease: 'ease-in-out' };
    let open = false, exporting = false, playing = false, tNow = 0, raf = 0, dock = null, autoKey = false, selSig = '';
    const snaps = {};   // idx -> a copy of the shape as it was before you moved it (what a new keyframe is measured against)
    const BEZ = { 'ease': [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
    const PROPS = [
        { id: 'dx', label: 'Move X', unit: 'px', def: 0, min: -1500, max: 1500, step: 1 },
        { id: 'dy', label: 'Move Y', unit: 'px', def: 0, min: -1500, max: 1500, step: 1 },
        { id: 'rot', label: 'Rotate', unit: '°', def: 0, min: -1440, max: 1440, step: 1 },
        { id: 'scale', label: 'Scale', unit: '×', def: 1, min: 0, max: 8, step: 0.05 },
        { id: 'opacity', label: 'Opacity', unit: '×', def: 1, min: 0, max: 1, step: 0.05 },
        { id: 'fill', label: 'Fill', unit: '', def: null, color: true }
    ];
    const f3 = (n) => String(+(+n).toFixed(3));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in (attrs || {})) e.setAttribute(k, attrs[k]); return e; };

    /* ---------- the maths: tracks, easing, colours ---------- */
    const hasTracks = (o) => !!(o && o.anim && PROPS.some((p) => o.anim[p.id] && o.anim[p.id].length));
    const anyAnimation = () => typeof objects !== 'undefined' && objects.some(hasTracks);
    function bezier(x1, y1, x2, y2) {
        const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
        const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
        return (x) => {
            let t = x;
            for (let i = 0; i < 8; i++) { const e = X(t) - x; if (Math.abs(e) < 1e-6) break; const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
            return Y(clamp(t, 0, 1));
        };
    }
    function easeFn() {
        if (A.ease === 'linear') return (u) => u;
        if (A.ease === 'discrete') return () => 0;
        const b = BEZ[A.ease] || BEZ['ease-in-out'];
        return bezier(b[0], b[1], b[2], b[3]);
    }
    const rgba = (c) => { const m = /^#?([0-9a-f]{3,8})$/i.exec(String(c || '').trim()); if (!m) return [128, 128, 128, 1]; let h = m[1]; if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; };
    const toHex = (a) => '#' + [0, 1, 2].map((i) => clamp(Math.round(a[i]), 0, 255).toString(16).padStart(2, '0')).join('') + (a[3] < 0.999 ? clamp(Math.round(a[3] * 255), 0, 255).toString(16).padStart(2, '0') : '');
    const sorted = (keys) => (keys || []).slice().sort((a, b) => a.t - b.t);
    function valueAt(keys, tf, def, isColor) {
        const k = sorted(keys);
        if (!k.length) return def;
        if (tf <= k[0].t) return k[0].v;
        if (tf >= k[k.length - 1].t) return k[k.length - 1].v;
        let i = 0; while (i < k.length - 2 && tf >= k[i + 1].t) i++;
        const a = k[i], b = k[i + 1], u = easeFn()((tf - a.t) / Math.max(1e-6, b.t - a.t));
        if (A.ease === 'discrete') return a.v;
        if (isColor) { const x = rgba(a.v), y = rgba(b.v); return toHex([0, 1, 2, 3].map((j) => x[j] + (y[j] - x[j]) * u)); }
        return a.v + (b.v - a.v) * u;
    }
    const defOf = (obj, p) => (p.id === 'fill' ? (obj.fill || '#a305ff') : p.def);
    const center = (obj) => { try { const b = shapeBBox(obj); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; } catch (e) { return { x: 0, y: 0 }; } };

    /* ---------- SMIL ---------- */
    function timing(el, ts, values) {
        el.setAttribute('dur', f3(A.dur) + 's');
        el.setAttribute('begin', '0s');
        el.setAttribute('repeatCount', A.loop ? 'indefinite' : '1');
        el.setAttribute('fill', 'freeze');
        el.setAttribute('keyTimes', ts.map(f3).join(';'));
        el.setAttribute('values', values.join(';'));
        if (A.ease === 'discrete') el.setAttribute('calcMode', 'discrete');
        else if (A.ease === 'linear') el.setAttribute('calcMode', 'linear');
        else {
            const b = BEZ[A.ease] || BEZ['ease-in-out'];
            el.setAttribute('calcMode', 'spline');
            el.setAttribute('keySplines', ts.slice(1).map(() => b.join(' ')).join(';'));
        }
        return el;
    }
    const timesOf = (...lists) => { const s = new Set([0, 1]); lists.forEach((l) => (l || []).forEach((k) => s.add(clamp(k.t, 0, 1)))); return Array.from(s).sort((a, b) => a - b); };
    // the motion of a shape as animateTransform elements, grouped by what each pair of layers does (position, rotation, scale)
    function motion(obj, c) {
        const tr = obj.anim || {}, out = [];
        if ((tr.dx && tr.dx.length) || (tr.dy && tr.dy.length)) {
            const ts = timesOf(tr.dx, tr.dy);
            out.push([timing(mk('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum' }), ts, ts.map((t) => f3(valueAt(tr.dx, t, 0)) + ' ' + f3(valueAt(tr.dy, t, 0))))]);
        }
        if (tr.rot && tr.rot.length) {
            const ts = timesOf(tr.rot);
            out.push([timing(mk('animateTransform', { attributeName: 'transform', type: 'rotate', additive: 'sum' }), ts, ts.map((t) => f3(valueAt(tr.rot, t, 0)) + ' ' + f3(c.x) + ' ' + f3(c.y)))]);
        }
        if (tr.scale && tr.scale.length) {
            // (scale about the shape's centre: a translate that cancels the drift, then the scale)
            const ts = timesOf(tr.scale), s = (t) => valueAt(tr.scale, t, 1);
            out.push([
                timing(mk('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum' }), ts, ts.map((t) => f3(c.x * (1 - s(t))) + ' ' + f3(c.y * (1 - s(t))))),
                timing(mk('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum' }), ts, ts.map((t) => f3(s(t))))
            ]);
        }
        return out;
    }
    const active = () => open || exporting;

    // called by app.js right after a shape (and its Blur Behind layer) was drawn
    function after(obj, idx, start, layer) {
        if (!active() || !hasTracks(obj)) return;
        const kids = Array.from(layer.childNodes).slice(start);
        const bb = kids.find((n) => n.getAttribute && n.getAttribute('data-blur-behind') !== null);
        const vis = kids.filter((n) => n !== bb);
        if (!vis.length) return;
        const c = center(obj), groups = motion(obj, c), tr = obj.anim;
        // the frosted-glass copy keeps pace with the shape: its clip outline gets the same motion
        const uses = root.inkpathBB && root.inkpathBB.uses[idx];
        if (uses) uses.forEach((use) => motion(obj, c).forEach((els) => els.forEach((e) => use.appendChild(e))));
        const leaf = vis.find((n) => n.classList && n.classList.contains('shape-element'));
        if (tr.fill && tr.fill.length && leaf && (!obj.fillType || obj.fillType === 'color')) {
            const ts = timesOf(tr.fill), col = (t) => rgba(valueAt(tr.fill, t, obj.fill || '#a305ff', true));
            leaf.appendChild(timing(mk('animate', { attributeName: 'fill' }), ts, ts.map((t) => toHex(col(t)).slice(0, 7))));
            leaf.appendChild(timing(mk('animate', { attributeName: 'fill-opacity' }), ts, ts.map((t) => f3(col(t)[3]))));
        }
        let outer = null, inner = null;
        const nest = (g) => { if (!outer) outer = g; else inner.appendChild(g); inner = g; };
        if (tr.opacity && tr.opacity.length) {
            const g = mk('g'), ts = timesOf(tr.opacity);
            g.appendChild(timing(mk('animate', { attributeName: 'opacity' }), ts, ts.map((t) => f3(clamp(valueAt(tr.opacity, t, 1), 0, 1)))));
            nest(g);
        }
        groups.forEach((els) => { const g = mk('g'); els.forEach((e) => g.appendChild(e)); nest(g); });
        if (!outer) return;
        layer.insertBefore(outer, vis[0]);
        vis.forEach((n) => inner.appendChild(n));
    }

    /* ---------- playing, pausing and scrubbing (the editor drives the SVG's own clock) ---------- */
    const sv = () => document.getElementById('viewport');
    function seek(sec) {
        tNow = clamp(sec, 0, A.dur);
        snapshotSelection();
        const s = sv(); if (s && s.pauseAnimations && active()) { try { s.pauseAnimations(); s.setCurrentTime(tNow); } catch (e) {} }
        refresh();
    }
    function play() {
        if (!active() || !anyAnimation()) { note('Add keyframes first: pick a shape and a preset, or press the diamond beside a property!'); return; }
        playing = true;
        const s = sv();
        try { s.setCurrentTime(tNow >= A.dur - 0.01 && !A.loop ? 0 : tNow); s.unpauseAnimations(); } catch (e) {}
        cancelAnimationFrame(raf);
        const tick = () => {
            if (!playing) return;
            let cur = 0; try { cur = s.getCurrentTime(); } catch (e) {}
            tNow = A.loop ? cur % A.dur : Math.min(cur, A.dur);
            if (!A.loop && cur >= A.dur) { playing = false; try { s.pauseAnimations(); } catch (e) {} }
            refresh(true);
            if (playing) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        refresh();
    }
    function pause() { playing = false; cancelAnimationFrame(raf); try { sv().pauseAnimations(); } catch (e) {} refresh(); }
    function stop() { pause(); seek(0); }
    // after every render: the SMIL elements are new, so the clock is put back where the playhead is
    function sync() {
        if (!active()) return;
        const sig = (typeof selectedIndices !== 'undefined' ? selectedIndices : []).join(',');
        if (sig !== selSig) { selSig = sig; snapshotSelection(); }
        const s = sv(); if (!s) return;
        try { s.setCurrentTime(tNow); if (playing) s.unpauseAnimations(); else s.pauseAnimations(); } catch (e) {}
        refresh();
    }

    /* ---------- editing tracks ---------- */
    const target = () => (typeof selectedIndices !== 'undefined' && selectedIndices.length ? objects[selectedIndices[0]] : null);
    function setKey(obj, pid, tf, v) {
        const p = PROPS.find((x) => x.id === pid);
        obj.anim = obj.anim || {};
        const list = obj.anim[pid] = obj.anim[pid] || [];
        // the first keyframe of a property set later in the animation also gets the plain value at the start
        if (!list.length && tf > 0.001) list.push({ t: 0, v: defOf(obj, p) });
        const hit = list.find((k) => Math.abs(k.t - tf) < 0.004);
        if (hit) hit.v = v; else list.push({ t: +f3(tf), v: v });
        list.sort((a, b) => a.t - b.t);
    }
    function removeKey(obj, pid, tf) {
        const list = obj.anim && obj.anim[pid]; if (!list) return;
        const i = list.findIndex((k) => Math.abs(k.t - tf) < 0.012);
        if (i >= 0) list.splice(i, 1);
        if (!list.length) delete obj.anim[pid];
        if (!Object.keys(obj.anim).length) delete obj.anim;
    }
    /* ---------- Set keyframe: capture what you did to the shape at the playhead ----------
       The tracks hold how far a shape is from where it is drawn (its base). You drag, turn, resize or recolour a shape on the canvas
       while the playhead is at a time, then Set keyframe measures the difference against the copy taken before you touched it,
       adds it to what the animation already does at that time, keys EVERY property there, and puts the base back, so the shape
       stays exactly where you left it and the animation carries the change. */
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const plain = (o) => { const c = clone(o); delete c.anim; return c; };
    function snapshot(i) { if (objects[i]) snaps[i] = plain(objects[i]); }
    function snapshotSelection() { Object.keys(snaps).forEach((k) => delete snaps[k]); (selectedIndices || []).forEach(snapshot); }
    const changedSince = (i) => !!objects[i] && !!snaps[i] && JSON.stringify(plain(objects[i])) !== JSON.stringify(snaps[i]);
    function capture(i, tf) {
        const o = objects[i]; if (!o) return false;
        const s0 = snaps[i] || plain(o);
        const cur = (pid) => valueAt(o.anim && o.anim[pid], tf, defOf(s0, PROPS.find((x) => x.id === pid)), pid === 'fill');
        let b0 = { x: 0, y: 0, w: 1, h: 1 }, b1 = b0;
        try { b0 = shapeBBox(s0); b1 = shapeBBox(o); } catch (e) {}
        const area0 = Math.max(1e-6, b0.w * b0.h), area1 = Math.max(1e-6, b1.w * b1.h);
        const vals = {
            dx: cur('dx') + ((b1.x + b1.w / 2) - (b0.x + b0.w / 2)),
            dy: cur('dy') + ((b1.y + b1.h / 2) - (b0.y + b0.h / 2)),
            rot: cur('rot') + ((o.rotation || 0) - (s0.rotation || 0)),
            scale: clamp(cur('scale') * Math.sqrt(area1 / area0), 0, 8),
            opacity: clamp(cur('opacity') * ((s0.opacity === 0 || s0.opacity === undefined) ? 1 : (o.opacity === undefined ? 1 : o.opacity) / s0.opacity), 0, 1)
        };
        const solid = !o.fillType || o.fillType === 'color';
        if (solid) vals.fill = (o.fill !== s0.fill) ? o.fill : cur('fill');
        Object.keys(vals).forEach((pid) => setKey(o, pid, tf, typeof vals[pid] === 'number' ? +f3(vals[pid]) : vals[pid]));
        // the base goes back to what it was: the animation now carries the change
        Object.keys(o).forEach((k) => { if (k !== 'anim') delete o[k]; });
        Object.assign(o, clone(s0));
        snapshot(i);
        return true;
    }
    function setKeyframe(quiet) {
        const sel = (selectedIndices || []).filter((i) => objects[i]);
        if (!sel.length) { if (!quiet) note('Pick a shape first, then move it and press Set keyframe!'); return; }
        if (playing) pause();
        pushHistory(true);
        const tf = A.dur ? tNow / A.dur : 0;
        sel.forEach((i) => capture(i, tf));
        render();
        if (!quiet) { playUISound && playUISound('snap'); note('Keyframe set at ' + tNow.toFixed(2) + 's for ' + sel.length + (sel.length === 1 ? ' shape' : ' shapes') + '. Move the playhead, move the shape, and set another!'); }
    }
    // Auto-key: finishing a drag, a turn or a slider while the Animate window is open keys the change at the playhead
    function maybeAutoKey() {
        if (!open || !autoKey || playing) return;
        const sel = (selectedIndices || []).filter((i) => changedSince(i));
        if (!sel.length) return;
        pushHistory(true);
        const tf = A.dur ? tNow / A.dur : 0;
        sel.forEach((i) => capture(i, tf));
        render();
        note('Auto-key: keyframe set at ' + tNow.toFixed(2) + 's');
    }
    ['mouseup', 'touchend', 'change', 'keyup'].forEach((ev) => document.addEventListener(ev, (e) => {
        if (!open || !autoKey || (dock && dock.contains(e.target))) return;
        setTimeout(maybeAutoKey, 30);
    }, true));

    // presets: each makes tracks over the whole animation
    const PRESETS = {
        'Fade in': () => ({ opacity: [{ t: 0, v: 0 }, { t: 0.35, v: 1 }] }),
        'Fade out': () => ({ opacity: [{ t: 0.65, v: 1 }, { t: 1, v: 0 }] }),
        'Pop in': () => ({ scale: [{ t: 0, v: 0 }, { t: 0.3, v: 1.15 }, { t: 0.45, v: 1 }], opacity: [{ t: 0, v: 0 }, { t: 0.15, v: 1 }] }),
        'Slide in from left': () => ({ dx: [{ t: 0, v: -300 }, { t: 0.4, v: 0 }], opacity: [{ t: 0, v: 0 }, { t: 0.25, v: 1 }] }),
        'Slide in from right': () => ({ dx: [{ t: 0, v: 300 }, { t: 0.4, v: 0 }], opacity: [{ t: 0, v: 0 }, { t: 0.25, v: 1 }] }),
        'Drop in from above': () => ({ dy: [{ t: 0, v: -260 }, { t: 0.4, v: 0 }], opacity: [{ t: 0, v: 0 }, { t: 0.25, v: 1 }] }),
        'Rise from below': () => ({ dy: [{ t: 0, v: 260 }, { t: 0.4, v: 0 }], opacity: [{ t: 0, v: 0 }, { t: 0.25, v: 1 }] }),
        'Spin': () => ({ rot: [{ t: 0, v: 0 }, { t: 1, v: 360 }] }),
        'Pulse': () => ({ scale: [{ t: 0, v: 1 }, { t: 0.5, v: 1.2 }, { t: 1, v: 1 }] }),
        'Bounce': () => ({ dy: [{ t: 0, v: 0 }, { t: 0.25, v: -90 }, { t: 0.5, v: 0 }, { t: 0.75, v: -35 }, { t: 1, v: 0 }] }),
        'Wiggle': () => ({ rot: [{ t: 0, v: 0 }, { t: 0.25, v: -12 }, { t: 0.5, v: 12 }, { t: 0.75, v: -12 }, { t: 1, v: 0 }] }),
        'Float': () => ({ dy: [{ t: 0, v: 0 }, { t: 0.5, v: -24 }, { t: 1, v: 0 }] }),
        'Blink': () => ({ opacity: [{ t: 0, v: 1 }, { t: 0.5, v: 0.15 }, { t: 1, v: 1 }] }),
        'Color cycle': (o) => ({ fill: [{ t: 0, v: o.fill || '#22d3ee' }, { t: 0.33, v: '#1b7fe0' }, { t: 0.66, v: '#ff8a1b' }, { t: 1, v: o.fill || '#22d3ee' }] })
    };
    function applyPreset(name) {
        if (!PRESETS[name] || !selectedIndices.length) return;
        pushHistory(true);
        selectedIndices.forEach((i) => { const o = objects[i]; o.anim = Object.assign({}, o.anim || {}, PRESETS[name](o)); });
        render(); playUISound && playUISound('snap');
        if (!playing) play();
    }

    /* ---------- the Animate window ---------- */
    function note(msg) { const n = dock && dock.querySelector('#ad-note'); if (n) { n.textContent = msg; clearTimeout(note.t); note.t = setTimeout(() => { n.textContent = ''; }, 4000); } }
    const CSS = `
#anim-dock{position:fixed;left:290px;right:330px;bottom:14px;z-index:1400;background:rgba(15,2,12,.97);border:2px solid rgba(255,96,197,.6);border-radius:14px;padding:8px 12px 10px;color:#ffd2ef;font:11px 'JetBrains Mono',monospace;box-shadow:0 10px 30px rgba(0,0,0,.5);max-height:44vh;overflow:auto}
#anim-dock[hidden]{display:none}
#anim-dock .ad-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#anim-dock b{color:#FF60C5;letter-spacing:1px;text-transform:uppercase}
#anim-dock button,#anim-dock select,#anim-dock input[type=number],#anim-dock input[type=text]{font:inherit;color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,96,197,.5);border-radius:8px;padding:4px 9px}
#anim-dock button{cursor:pointer}#anim-dock button:hover{background:rgba(255,96,197,.28)}
#anim-dock #ad-setkey{background:linear-gradient(180deg,#ff8a1b,#c25e00);border-color:#ffd2a0;font-weight:800}
#anim-dock .ad-on{background:linear-gradient(180deg,#ff60c5,#c026a0)!important;border-color:#ffd2ef!important}
#anim-dock #ad-scrub{flex:1;min-width:140px}
#anim-dock input[type=number]{width:62px}
#anim-dock .ad-body{margin-top:8px;display:grid;gap:5px}
#anim-dock .ad-presets{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#anim-dock .ad-row{display:grid;grid-template-columns:70px 76px 30px 1fr;gap:8px;align-items:center}
#anim-dock .ad-row .ad-label{color:#ffd2ef;font-weight:700}
#anim-dock .ad-track{position:relative;height:22px;border-radius:6px;background:rgba(255,255,255,.07);cursor:pointer;overflow:hidden}
#anim-dock .ad-dia{position:absolute;top:5px;width:12px;height:12px;margin-left:-6px;background:#38bdf8;transform:rotate(45deg) scale(.8);border:1px solid #fff;cursor:pointer}
#anim-dock .ad-dia.now{background:#ff8a1b}
#anim-dock .ad-line{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#FF60C5;pointer-events:none}
#anim-dock .ad-key{padding:2px 0;text-align:center}
#anim-dock .ad-swatch{display:inline-block;width:14px;height:14px;border-radius:4px;border:1px solid #fff;vertical-align:middle;margin-right:4px}
#anim-dock #ad-note{color:#7dd3fc;min-height:14px}`;
    function build() {
        if (dock) return dock;
        const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
        dock = document.createElement('div'); dock.id = 'anim-dock'; dock.hidden = true;
        dock.innerHTML = `<div class="ad-head"><b>Animation</b>
            <button id="ad-setkey" title="Capture the selected shapes (position, rotation, size, opacity, fill) as a keyframe at the playhead">◆ Set keyframe</button>
            <button id="ad-play" title="Play or pause">Play</button><button id="ad-stop" title="Back to the start">Stop</button>
            <input type="range" id="ad-scrub" min="0" max="1000" value="0" title="Move the playhead"><span id="ad-time">0.00s</span>
            <label>Length <input type="number" id="ad-dur" min="0.5" max="120" step="0.5"> s</label>
            <label><input type="checkbox" id="ad-loop"> Loop</label>
            <label title="Moving, turning, resizing or recolouring a shape sets a keyframe at the playhead by itself"><input type="checkbox" id="ad-auto"> Auto-key</label>
            <label>Easing <select id="ad-ease"><option value="ease-in-out">Ease in out</option><option value="ease">Ease</option><option value="ease-in">Ease in</option><option value="ease-out">Ease out</option><option value="linear">Linear</option><option value="discrete">Steps</option></select></label>
            <button id="ad-export" title="Download an SVG that animates by itself">Export animated SVG</button><button id="ad-close" title="Close">✕</button></div>
          <div class="ad-body"><div class="ad-presets"><select id="ad-preset"><option value="">Preset…</option>${Object.keys(PRESETS).map((k) => '<option>' + k + '</option>').join('')}</select>
            <button id="ad-apply" title="Give every selected shape this animation">Apply to selection</button><button id="ad-clear" title="Remove the keyframes of the selected shapes">Clear animation</button><span id="ad-note"></span></div>
            <div id="ad-rows"></div></div>`;
        document.body.appendChild(dock);
        const $ = (id) => dock.querySelector('#' + id);
        $('ad-setkey').onclick = () => setKeyframe();
        $('ad-auto').onchange = (e) => { autoKey = e.target.checked; note(autoKey ? 'Auto-key is on: change a shape at the playhead and it is keyed!' : 'Auto-key is off.'); };
        $('ad-play').onclick = () => (playing ? pause() : play());
        $('ad-stop').onclick = stop;
        $('ad-close').onclick = closeDock;
        $('ad-scrub').oninput = (e) => { if (playing) pause(); seek(+e.target.value / 1000 * A.dur); };
        $('ad-dur').onchange = (e) => { A.dur = clamp(+e.target.value || 3, 0.5, 120); render(); };
        $('ad-loop').onchange = (e) => { A.loop = e.target.checked; render(); };
        $('ad-ease').onchange = (e) => { A.ease = e.target.value; render(); };
        $('ad-apply').onclick = () => { const v = $('ad-preset').value; if (v) applyPreset(v); else note('Pick a preset first!'); };
        $('ad-clear').onclick = () => { if (!selectedIndices.length) return; pushHistory(true); selectedIndices.forEach((i) => { delete objects[i].anim; }); render(); };
        $('ad-export').onclick = exportAnimated;
        ['dx', 'dy', 'rot', 'scale', 'opacity', 'fill'];
        return dock;
    }
    function rowsHtml(o) {
        const tf = A.dur ? tNow / A.dur : 0;
        return PROPS.map((p) => {
            const keys = o.anim && o.anim[p.id] || [];
            const v = valueAt(keys, tf, defOf(o, p), p.color);
            const on = keys.some((k) => Math.abs(k.t - tf) < 0.012);
            const val = p.color
                ? `<input type="text" class="ad-val" data-p="${p.id}" value="${String(v).slice(0, 9)}" size="8" style="width:76px">`
                : `<input type="number" class="ad-val" data-p="${p.id}" value="${f3(v)}" min="${p.min}" max="${p.max}" step="${p.step}">`;
            const dias = keys.map((k) => `<i class="ad-dia${Math.abs(k.t - tf) < 0.012 ? ' now' : ''}" data-p="${p.id}" data-t="${k.t}" style="left:${k.t * 100}%" title="${f3(k.t * A.dur)}s"></i>`).join('');
            return `<div class="ad-row" data-p="${p.id}"><span class="ad-label">${p.label}</span>${val}<button class="ad-key${on ? ' ad-on' : ''}" data-p="${p.id}" title="${on ? 'Remove the keyframe here' : 'Add a keyframe at the playhead'}">◆</button><div class="ad-track" data-p="${p.id}">${dias}<b class="ad-line" style="left:${tf * 100}%"></b></div></div>`;
        }).join('');
    }
    let lastRowsKey = '';
    function refresh(light) {
        if (!dock || dock.hidden) return;
        const $ = (id) => dock.querySelector('#' + id);
        const tf = A.dur ? tNow / A.dur : 0;
        $('ad-play').textContent = playing ? 'Pause' : 'Play'; $('ad-play').classList.toggle('ad-on', playing);
        if (document.activeElement !== $('ad-scrub')) $('ad-scrub').value = Math.round(tf * 1000);
        $('ad-time').textContent = tNow.toFixed(2) + 's';
        if (document.activeElement !== $('ad-dur')) $('ad-dur').value = A.dur;
        $('ad-loop').checked = A.loop; $('ad-ease').value = A.ease; $('ad-auto').checked = autoKey;
        const rows = $('ad-rows'), o = target();
        if (!o) { rows.innerHTML = '<div style="color:#ffd2ef;opacity:.8">Pick a shape to animate it, or apply a preset to the selection. Number boxes and the ◆ buttons make keyframes at the playhead.</div>'; lastRowsKey = ''; return; }
        if (light) {   // while playing only the playhead lines move
            rows.querySelectorAll('.ad-line').forEach((l) => { l.style.left = tf * 100 + '%'; });
            return;
        }
        if (rows.contains(document.activeElement) && document.activeElement.classList.contains('ad-val')) return;
        rows.innerHTML = rowsHtml(o);
        wireRows(rows, o);
    }
    function wireRows(rows, o) {
        const tf = A.dur ? tNow / A.dur : 0;
        rows.querySelectorAll('.ad-val').forEach((inp) => {
            inp.onchange = () => {
                const p = PROPS.find((x) => x.id === inp.dataset.p);
                const v = p.color ? inp.value.trim() : clamp(parseFloat(inp.value), p.min, p.max);
                if (p.color ? !/^#[0-9a-f]{3,8}$/i.test(v) : isNaN(v)) return;
                pushHistory(true); setKey(o, p.id, tf, v); render();
            };
        });
        rows.querySelectorAll('.ad-key').forEach((b) => {
            b.onclick = () => {
                const p = PROPS.find((x) => x.id === b.dataset.p), keys = (o.anim && o.anim[p.id]) || [];
                pushHistory(true);
                if (keys.some((k) => Math.abs(k.t - tf) < 0.012)) removeKey(o, p.id, tf);
                else setKey(o, p.id, tf, valueAt(keys, tf, defOf(o, p), p.color));
                render();
            };
        });
        rows.querySelectorAll('.ad-track').forEach((tr) => {
            tr.onmousedown = (e) => {
                const d = e.target.closest('.ad-dia');
                const r = tr.getBoundingClientRect();
                if (playing) pause();
                seek(d ? +d.dataset.t * A.dur : clamp((e.clientX - r.left) / r.width, 0, 1) * A.dur);
                render();
            };
        });
    }
    function openDock() { build(); snapshotSelection(); open = true; dock.hidden = false; const b = document.getElementById('anim-btn'); if (b) b.classList.add('active'); render(); }
    function closeDock() { pause(); open = false; if (dock) dock.hidden = true; const b = document.getElementById('anim-btn'); if (b) b.classList.remove('active'); render(); }
    function toggle() { if (open) closeDock(); else openDock(); }

    /* ---------- export ---------- */
    function exportAnimated() {
        if (!anyAnimation()) { note('Nothing is animated yet: add keyframes or a preset first!'); return; }
        beginExport();
        const text = cleanedExportSvg();
        endExport();
        downloadFile(new Blob([text], { type: 'image/svg+xml' }), 'animation.svg');
        note('Saved animation.svg: it plays by itself in any browser!');
    }
    // SVG export keeps the animation inside the file: shapes are drawn with it for a moment, then drawn plainly again
    function beginExport() { exporting = true; render(); }
    function endExport() { exporting = false; render(); }

    function mountButton() {
        const fx = document.getElementById('fx-btn');
        if (!fx || document.getElementById('anim-btn')) return;
        const wrap = document.createElement('div'); wrap.className = 'ops-wrap';
        const b = document.createElement('button'); b.id = 'anim-btn'; b.className = 'action-btn'; b.textContent = 'Animate'; b.title = 'Keyframe animation: play it, and export it as an animated SVG';
        b.onclick = toggle; wrap.appendChild(b);
        fx.parentNode.parentNode.insertBefore(wrap, fx.parentNode.nextSibling);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountButton); else mountButton();

    root.inkpathAnim = {
        after: after, sync: sync, toggle: toggle, open: openDock, close: closeDock, play: play, pause: pause, seek: seek,
        beginExport: beginExport, endExport: endExport, anyAnimation: anyAnimation,
        settings: () => (anyAnimation() ? { duration: A.dur, loop: A.loop, ease: A.ease } : undefined),
        load: (s) => { if (!s) return; A.dur = clamp(+s.duration || 3, 0.5, 120); A.loop = s.loop !== false; A.ease = s.ease || 'ease-in-out'; },
        setKeyframe: setKeyframe, valueAt: valueAt, state: () => ({ open: open, playing: playing, t: tNow, A: A })
    };
})(typeof window !== 'undefined' ? window : this);
