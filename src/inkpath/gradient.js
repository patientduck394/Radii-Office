/* =====================================================================
   Inkpath Gradient tool (G)!
   Pick a shape, press G (or the Gradient tool), and its gradient shows up on the canvas as handles you can drag:
   - a linear gradient has a start square, an end circle and a diamond for every color stop on the line between them
   - a radial gradient has a center, a width handle and a height handle, with its stops on the width line
   - drag a handle to move it, drag the line itself to move the whole gradient, double-click the line to add a stop,
     Delete removes the selected stop, drag on the shape to draw a brand new gradient
   - Shift while dragging: the angle snaps (15 degree steps), a moved gradient keeps to one direction, a radial one stays a circle, a stop snaps to tenths
   - the handles can go past the shape (the 100% limit does not exist here): the colors just keep going, like in Inkscape
   The gradient is saved on the shape as fillLine (linear: two points in fractions of the shape's box, which can be below 0 or above 1)
   or fillRadial (center and radii, the same way). app.js paints it (applyFillGradient).
   ===================================================================== */
(function () {
    'use strict';
    if (typeof svg === 'undefined' || typeof objects === 'undefined' || typeof render !== 'function') return;
    const NS = 'http://www.w3.org/2000/svg';
    let layer = null, drag = null, createDrag = null;

    function el(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
        return e;
    }
    function ensureLayer() {
        if (layer && layer.isConnected) return layer;
        layer = el('g', { id: 'gradient-layer' });
        svg.appendChild(layer);
        setLayerTransform();
        return layer;
    }
    function setLayerTransform() {
        if (layer) layer.setAttribute('transform', 'translate(' + panOffset.x + ', ' + panOffset.y + ') scale(' + zoomLevel + ')');
    }
    function active() { return currentTool === 'gradient'; }
    function toast(msg) {
        let t = document.getElementById('pro-toast');
        if (!t) { t = document.createElement('div'); t.id = 'pro-toast'; document.body.appendChild(t); }
        t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
    }

    /* ---------- the shape being edited, and the box its gradient is measured in ---------- */
    function current() {
        if (selectedIndices.length !== 1) return null;
        const idx = selectedIndices[0], top = objects[idx];
        if (!top || top.hidden || top.locked) return null;
        const o = paintTarget(top);
        if (!o || o.type === 'boolean' || o.type === 'group' || o.type === 'mask' || o.type === 'line') return null;
        return { idx, o };
    }
    // the box SVG itself uses for the gradient: the drawn shape's own box (without its stroke)
    function boxOf(idx, o) {
        const e = drawLayer.querySelector('.shape-element[data-idx="' + idx + '"]');
        if (e && e.getBBox) { try { const b = e.getBBox(); if (b.width > 0 || b.height > 0) return { x: b.x, y: b.y, w: Math.max(b.width, 0.001), h: Math.max(b.height, 0.001) }; } catch (err) { /* fall through */ } }
        const b = shapeBBox(o);
        return { x: b.x, y: b.y, w: Math.max(b.w, 0.001), h: Math.max(b.h, 0.001) };
    }
    function frameOf(c) {
        return { box: boxOf(c.idx, c.o), rot: parseFloat(c.o.rotation) || 0, pivot: getCenter(c.o) };
    }
    const toWorld = (f, fx, fy) => {
        const p = { x: f.box.x + fx * f.box.w, y: f.box.y + fy * f.box.h };
        return f.rot ? rotPt(p, f.rot, f.pivot) : p;
    };
    const toFrac = (f, p) => {
        const q = f.rot ? rotPt(p, -f.rot, f.pivot) : p;
        return { x: (q.x - f.box.x) / f.box.w, y: (q.y - f.box.y) / f.box.h };
    };

    /* ---------- the gradient of a shape as numbers ---------- */
    function lineOf(o) {
        if (o.fillLine && [o.fillLine.x1, o.fillLine.y1, o.fillLine.x2, o.fillLine.y2].every(isFinite)) return o.fillLine;
        return linearGradientVector(o.fillAngle, o.fillScale);
    }
    function radialOf(o) {
        const r = o.fillRadial || {};
        const n = (v, d) => (isFinite(parseFloat(v)) ? parseFloat(v) : d);
        return { cx: n(r.cx, 0.5), cy: n(r.cy, 0.5), rx: Math.max(0.001, n(r.rx, 0.5)), ry: Math.max(0.001, n(r.ry, 0.5)) };
    }
    function setLine(o, L) {
        const r = (v) => Math.round(v * 10000) / 10000;
        o.fillLine = { x1: r(L.x1), y1: r(L.y1), x2: r(L.x2), y2: r(L.y2) };
        o.fillAngle = Math.round(((Math.atan2(L.y2 - L.y1, L.x2 - L.x1) * 180 / Math.PI) % 360 + 360) % 360);   // (the angle slider follows)
    }
    function setRadial(o, R) {
        const r = (v) => Math.round(v * 10000) / 10000;
        o.fillRadial = { cx: r(R.cx), cy: r(R.cy), rx: r(Math.max(0.001, R.rx)), ry: r(Math.max(0.001, R.ry)) };
    }
    // a shape without a gradient yet gets one made from its colors
    function makeGradient(o, type) {
        o.fillType = type;
        if (type === 'linear' && !o.fillLine) setLine(o, linearGradientVector(o.fillAngle, o.fillScale));
        getFillStops(o);
    }

    /* ---------- drawing the handles ---------- */
    function drawHandles() {
        ensureLayer();
        layer.innerHTML = '';
        setLayerTransform();
        if (!active()) return;
        const c = current();
        if (!c) return;
        const o = c.o;
        if (o.fillType !== 'linear' && o.fillType !== 'radial') return;
        const f = frameOf(c), z = zoomLevel || 1, stops = getFillStops(o);
        const sel = selectedFillStopIdx(c.idx);
        const R1 = 6 / z, sw = 1.6 / z;
        const mk = (kind, p, shape, fill, extra) => {
            const h = shape === 'sq' ? el('rect', { x: p.x - R1, y: p.y - R1, width: R1 * 2, height: R1 * 2, rx: 1.5 / z })
                : shape === 'dia' ? el('polygon', { points: [[p.x, p.y - R1 * 1.25], [p.x + R1 * 1.25, p.y], [p.x, p.y + R1 * 1.25], [p.x - R1 * 1.25, p.y]].map((q) => q.join(',')).join(' ') })
                    : el('circle', { cx: p.x, cy: p.y, r: R1 });
            h.setAttribute('fill', fill); h.setAttribute('stroke', (extra && extra.sel) ? '#ff2d95' : '#1d1d2b'); h.setAttribute('stroke-width', (extra && extra.sel) ? sw * 1.8 : sw);
            h.style.cursor = 'grab'; h.setAttribute('class', 'gr-handle');
            h.addEventListener('mousedown', (e) => down(e, kind, extra));
            layer.appendChild(h);
            return h;
        };
        const stopColor = (s) => { const st = stopStyle(s.c, activePrimaryColor); return st.color; };
        // the stop whose color the Color panel is editing
        const pickStop = (i) => { fillStopSel[c.idx] = i; };
        if (o.fillType === 'linear') {
            const L = lineOf(o), p1 = toWorld(f, L.x1, L.y1), p2 = toWorld(f, L.x2, L.y2);
            layer.appendChild(el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: '#ffffff', 'stroke-width': 3.4 / z, 'pointer-events': 'none', opacity: 0.9 }));
            layer.appendChild(el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: '#1d1d2b', 'stroke-width': 1.2 / z, 'pointer-events': 'none' }));
            const hit = el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: 'rgba(0,0,0,0)', 'stroke-width': 12 / z });
            hit.style.cursor = 'move';
            hit.addEventListener('mousedown', (e) => down(e, 'line', {}));
            layer.appendChild(hit);
            const lo = stops.reduce((a, s, i) => (s.o < stops[a].o ? i : a), 0), hi = stops.reduce((a, s, i) => (s.o > stops[a].o ? i : a), 0);
            stops.forEach((s, i) => {
                if (i === lo || i === hi) return;
                mk('stop', { x: p1.x + (p2.x - p1.x) * s.o, y: p1.y + (p2.y - p1.y) * s.o }, 'dia', stopColor(s), { stop: s, sel: i === sel, pick: () => pickStop(i) });
            });
            mk('end1', p1, 'sq', stopColor(stops[lo]), { stop: stops[lo], sel: lo === sel, pick: () => pickStop(lo) });
            mk('end2', p2, 'circ', stopColor(stops[hi]), { stop: stops[hi], sel: hi === sel, pick: () => pickStop(hi) });
        } else {
            const R = radialOf(o);
            const cW = toWorld(f, R.cx, R.cy), xW = toWorld(f, R.cx + R.rx, R.cy), yW = toWorld(f, R.cx, R.cy - R.ry);
            const ring = el('ellipse', { cx: 0, cy: 0, rx: R.rx * f.box.w, ry: R.ry * f.box.h, fill: 'none', stroke: '#1d1d2b', 'stroke-width': 1.2 / z, 'stroke-dasharray': (5 / z) + ' ' + (4 / z), 'pointer-events': 'none' });
            const lx = f.box.x + R.cx * f.box.w, ly = f.box.y + R.cy * f.box.h;
            ring.setAttribute('transform', 'translate(' + lx + ' ' + ly + ')' + (f.rot ? ' rotate(' + f.rot + ' ' + (f.pivot.x - lx) + ' ' + (f.pivot.y - ly) + ')' : ''));
            layer.appendChild(ring);
            layer.appendChild(el('line', { x1: cW.x, y1: cW.y, x2: xW.x, y2: xW.y, stroke: '#ffffff', 'stroke-width': 3.4 / z, 'pointer-events': 'none', opacity: 0.9 }));
            layer.appendChild(el('line', { x1: cW.x, y1: cW.y, x2: xW.x, y2: xW.y, stroke: '#1d1d2b', 'stroke-width': 1.2 / z, 'pointer-events': 'none' }));
            const hit = el('line', { x1: cW.x, y1: cW.y, x2: xW.x, y2: xW.y, stroke: 'rgba(0,0,0,0)', 'stroke-width': 12 / z });
            hit.style.cursor = 'copy';
            hit.addEventListener('mousedown', (e) => down(e, 'rline', {}));
            layer.appendChild(hit);
            const lo = stops.reduce((a, s, i) => (s.o < stops[a].o ? i : a), 0), hi = stops.reduce((a, s, i) => (s.o > stops[a].o ? i : a), 0);
            stops.forEach((s, i) => {
                if (i === lo || i === hi) return;
                mk('stop', { x: cW.x + (xW.x - cW.x) * s.o, y: cW.y + (xW.y - cW.y) * s.o }, 'dia', stopColor(s), { stop: s, sel: i === sel, pick: () => pickStop(i) });
            });
            mk('ry', yW, 'circ', '#ffffff', {});
            mk('rx', xW, 'sq', stopColor(stops[hi]), { stop: stops[hi], sel: hi === sel, pick: () => pickStop(hi) });
            mk('center', cW, 'circ', stopColor(stops[lo]), { stop: stops[lo], sel: lo === sel, pick: () => pickStop(lo) });
        }
    }

    /* ---------- dragging ---------- */
    const snap15 = (dx, dy) => { const L = Math.hypot(dx, dy), a = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12); return { x: Math.cos(a) * L, y: Math.sin(a) * L }; };
    let lastLine = null;   // (the handles are redrawn after every click, so a double-click on the line is spotted here, not with dblclick)
    function down(e, kind, extra) {
        if (e.button === 2 || !active()) return;
        const c = current();
        if (!c) return;
        e.stopPropagation(); e.preventDefault();
        if (kind === 'line' || kind === 'rline') {
            const now = Date.now(), dbl = lastLine && now - lastLine.t < 420 && Math.hypot(e.clientX - lastLine.x, e.clientY - lastLine.y) < 6;
            lastLine = { t: now, x: e.clientX, y: e.clientY };
            if (dbl) { lastLine = null; addStopOnLine(e, c); return; }
            if (kind === 'rline') return;
        }
        pushHistory(true);
        if (extra && extra.pick) { extra.pick(); try { syncInspector(); } catch (err) { /* ignore */ } }
        const f = frameOf(c);
        drag = { kind, c, f, extra: extra || {}, start: toFrac(f, getMousePos(e)), line0: Object.assign({}, lineOf(c.o)), rad0: radialOf(c.o), moved: false };
        window.addEventListener('mousemove', move, true);
        window.addEventListener('mouseup', up, true);
        render();
    }
    function move(e) {
        if (!drag) return;
        e.stopImmediatePropagation(); e.preventDefault();
        const { c, f, kind } = drag, o = c.o;
        const m = getMousePos(e), mf = toFrac(f, m);
        drag.moved = true;
        const W = f.box.w, H = f.box.h;
        if (kind === 'end1' || kind === 'end2') {
            const L = drag.line0, fixed = kind === 'end1' ? { x: L.x2, y: L.y2 } : { x: L.x1, y: L.y1 };
            let p = mf;
            if (e.shiftKey) {   // the angle snaps in 15 degree steps (measured on the page, not in the shape's box)
                const fw = toWorld(f, fixed.x, fixed.y), s = snap15(m.x - fw.x, m.y - fw.y);
                p = toFrac(f, { x: fw.x + s.x, y: fw.y + s.y });
            }
            setLine(o, kind === 'end1' ? { x1: p.x, y1: p.y, x2: L.x2, y2: L.y2 } : { x1: L.x1, y1: L.y1, x2: p.x, y2: p.y });
        } else if (kind === 'line') {
            let dx = mf.x - drag.start.x, dy = mf.y - drag.start.y;
            if (e.shiftKey) { if (Math.abs(dx * W) >= Math.abs(dy * H)) dy = 0; else dx = 0; }
            const L = drag.line0;
            setLine(o, { x1: L.x1 + dx, y1: L.y1 + dy, x2: L.x2 + dx, y2: L.y2 + dy });
        } else if (kind === 'stop') {
            let p1, p2;
            if (o.fillType === 'linear') { const L = lineOf(o); p1 = toWorld(f, L.x1, L.y1); p2 = toWorld(f, L.x2, L.y2); }
            else { const R = radialOf(o); p1 = toWorld(f, R.cx, R.cy); p2 = toWorld(f, R.cx + R.rx, R.cy); }
            const vx = p2.x - p1.x, vy = p2.y - p1.y, len2 = vx * vx + vy * vy || 1;
            let t = ((m.x - p1.x) * vx + (m.y - p1.y) * vy) / len2;
            t = Math.max(0, Math.min(1, t));
            if (e.shiftKey) t = Math.round(t * 10) / 10;
            const s = drag.extra.stop;
            s.o = Math.round(t * 1000) / 1000;
            getFillStops(o);                                   // (sorts them again; the stop keeps its place in the Color panel)
            fillStopSel[c.idx] = o.fillStops.indexOf(s);
            mirrorFillStops(o);
        } else if (kind === 'center') {
            let dx = mf.x - drag.start.x, dy = mf.y - drag.start.y;
            if (e.shiftKey) { if (Math.abs(dx * W) >= Math.abs(dy * H)) dy = 0; else dx = 0; }
            const R = drag.rad0;
            setRadial(o, { cx: R.cx + dx, cy: R.cy + dy, rx: R.rx, ry: R.ry });
        } else if (kind === 'rx' || kind === 'ry') {
            const R = drag.rad0;
            let rx = R.rx, ry = R.ry;
            if (kind === 'rx') { rx = Math.max(0.001, Math.abs(mf.x - R.cx)); if (e.shiftKey) ry = rx * W / H; }
            else { ry = Math.max(0.001, Math.abs(mf.y - R.cy)); if (e.shiftKey) rx = ry * H / W; }
            setRadial(o, { cx: R.cx, cy: R.cy, rx, ry });
        }
        render();
    }
    function up(e) {
        if (!drag) return;
        e.stopImmediatePropagation();
        window.removeEventListener('mousemove', move, true);
        window.removeEventListener('mouseup', up, true);
        drag = null;
        try { syncInspector(); } catch (err) { /* ignore */ }
        render();
    }
    function addStopOnLine(e, c) {
        const f = frameOf(c);
        let p1, p2;
        if (c.o.fillType === 'linear') { const L = lineOf(c.o); p1 = toWorld(f, L.x1, L.y1); p2 = toWorld(f, L.x2, L.y2); }
        else { const R = radialOf(c.o); p1 = toWorld(f, R.cx, R.cy); p2 = toWorld(f, R.cx + R.rx, R.cy); }
        const m = getMousePos(e), vx = p2.x - p1.x, vy = p2.y - p1.y;
        const t = Math.max(0.001, Math.min(0.999, ((m.x - p1.x) * vx + (m.y - p1.y) * vy) / ((vx * vx + vy * vy) || 1)));
        pushHistory(true);
        const stops = getFillStops(c.o), col = sampleGradientAt(stops, t), s = { o: Math.round(t * 1000) / 1000, c: col };
        stops.push(s);
        getFillStops(c.o);
        fillStopSel[c.idx] = c.o.fillStops.indexOf(s);
        mirrorFillStops(c.o);
        try { syncInspector(); } catch (err) { /* ignore */ }
        render();
    }

    /* ---------- the canvas: pick a shape, or draw a new gradient by dragging on it ---------- */
    window.addEventListener('mousedown', (e) => {
        if (!active() || e.button !== 0 || !svg.contains(e.target)) return;
        if (layer && layer.contains(e.target)) return;                 // (a handle: it handles itself)
        const shapeEl = e.target.closest ? e.target.closest('.shape-element') : null;
        const idx = shapeEl ? +shapeEl.dataset.idx : -1;
        e.stopImmediatePropagation(); e.preventDefault();
        if (idx >= 0 && objects[idx] && !objects[idx].locked) {
            if (!(selectedIndices.length === 1 && selectedIndices[0] === idx)) { selectedIndices = [idx]; render(); try { syncInspector(); } catch (err) { /* ignore */ } }
            const c = current();
            if (c) {
                createDrag = { c, f: frameOf(c), start: getMousePos(e), made: false };
                window.addEventListener('mousemove', moveCreate, true);
                window.addEventListener('mouseup', upCreate, true);
            }
        } else if (!shapeEl) {
            selectedIndices = []; render(); try { syncInspector(); } catch (err) { /* ignore */ }
        }
    }, true);
    function moveCreate(e) {
        if (!createDrag) return;
        e.stopImmediatePropagation(); e.preventDefault();
        const m = getMousePos(e), d = createDrag;
        if (!d.made && Math.hypot(m.x - d.start.x, m.y - d.start.y) < 5 / (zoomLevel || 1)) return;
        if (!d.made) {
            d.made = true; pushHistory(true);
            if (d.c.o.fillType !== 'linear' && d.c.o.fillType !== 'radial') { d.c.o.fillType = 'linear'; getFillStops(d.c.o); }
            else if (d.c.o.fillType === 'radial') d.radial = true;
        }
        let end = m;
        if (e.shiftKey) { const s = snap15(m.x - d.start.x, m.y - d.start.y); end = { x: d.start.x + s.x, y: d.start.y + s.y }; }
        const a = toFrac(d.f, d.start), b = toFrac(d.f, end);
        if (d.radial) {
            const r = Math.hypot((b.x - a.x) * d.f.box.w, (b.y - a.y) * d.f.box.h);
            setRadial(d.c.o, { cx: a.x, cy: a.y, rx: r / d.f.box.w, ry: e.shiftKey ? r / d.f.box.w * d.f.box.w / d.f.box.h : r / d.f.box.h });
        } else setLine(d.c.o, { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        render();
    }
    function upCreate(e) {
        if (!createDrag) return;
        e.stopImmediatePropagation();
        window.removeEventListener('mousemove', moveCreate, true);
        window.removeEventListener('mouseup', upCreate, true);
        createDrag = null;
        try { syncInspector(); } catch (err) { /* ignore */ }
        render();
    }

    /* ---------- keys: G picks the tool, Delete removes the selected stop, Esc leaves ---------- */
    window.addEventListener('keydown', (e) => {
        const t = e.target, tag = t && t.tagName;
        const typing = tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable) || (tag === 'INPUT' && /^(text|number|search|password|url|email|tel)$/i.test(t.type || ''));
        if (typing) return;
        if (!active()) return;
        if (e.key === 'Escape') { setTool('select'); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const c = current();
            if (!c || (c.o.fillType !== 'linear' && c.o.fillType !== 'radial')) return;
            e.stopImmediatePropagation(); e.preventDefault();
            const stops = getFillStops(c.o);
            if (stops.length <= 2) { try { toast('A gradient needs at least two colors!'); } catch (err) { /* ignore */ } return; }
            pushHistory(true);
            stops.splice(selectedFillStopIdx(c.idx), 1);
            fillStopSel[c.idx] = 0;
            mirrorFillStops(c.o);
            try { syncInspector(); } catch (err) { /* ignore */ }
            render();
        }
    }, true);
    function toolOn() { setTool('gradient'); }
    // choosing the tool (button or key G) tells what to do next
    hookLate('setTool', (orig) => function (tool) { const r = orig.apply(this, arguments); if (tool === 'gradient' && !current()) toast('Gradient tool: pick a shape, then drag its handles (or drag on a shape to draw a gradient)!'); return r; });

    // draw the handles after every render, and keep them on the canvas when it pans and zooms
    function hookLate(name, make) { hook(name, make); }
    function hook(name, make) { const orig = window[name]; if (typeof orig !== 'function') return; window[name] = make(orig); }
    hook('render', (orig) => function () { const r = orig.apply(this, arguments); try { drawHandles(); } catch (err) { console.error(err); } return r; });
    hook('applyTransform', (orig) => function () { const r = orig.apply(this, arguments); try { setLayerTransform(); } catch (err) { /* ignore */ } return r; });
    window.inkpathGradient = { on: toolOn };
    try { ensureLayer(); } catch (err) { /* ignore */ }
})();
