/* Inkpath Pro: the professional tools.
   Rulers and guides, a grid, snapping with smart guides, align and distribute, a numeric position and size panel, copy and paste,
   a real layers panel (hide, lock, rename, drag to reorder), path tools (simplify, smooth, add nodes, join, offset, outline stroke),
   artboards and export (scale, selection, artboards, optimized SVG, PDF) and a keyboard shortcut sheet.
   It hooks into Inkpath's own functions (render, applyTransform, getMousePos...) and keeps its own layer; everything is also reachable from the "Pro" panel.
   Needs pro-path.js (geometry) and pro-icons.js (icons). Public domain. */
(function () {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const G = window.InkGeom, IC = window.InkProIcon || function () { return ''; };
    const P = window.inkpathPro = {};
    const st = P.state = { rulers: true, grid: false, gridSize: 20, snapGrid: false, snapObjects: true, snapGuides: true, showGuides: true, guides: [], artboards: [], activeArtboard: -1, lockRatio: false, alignTo: 'selection',
        exportScope: 'canvas', exportFormat: 'png', exportScale: 2, exportBg: 'transparent', exportBgColor: '#ffffff', simplifyTol: 2, offsetDist: 8, offsetJoin: 'miter', tab: 'arrange' };
    const g = (name) => window[name];
    const $ = (sel, root) => (root || document).querySelector(sel);
    const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
    const sel = () => selectedIndices.filter((i) => objects[i]);
    const selObjs = () => sel().map((i) => objects[i]);
    const num = (v, d) => { v = parseFloat(v); return isFinite(v) ? v : (d || 0); };
    const round = (v, p) => { const k = Math.pow(10, p === undefined ? 2 : p); return Math.round(v * k) / k; };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const history = () => { try { pushHistory(true); } catch (e) { /* ignore */ } };
    const redraw = () => { try { render(); } catch (e) { console.error(e); } };
    function toast(msg) {
        let t = $('#pro-toast');
        if (!t) { t = el('div'); t.id = 'pro-toast'; document.body.appendChild(t); }
        t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
    }
    P.toast = toast;

    /* ================= boxes that know about rotation ================= */
    function vbox(o) {
        const bb = shapeBBox(o), rot = parseFloat(o.rotation) || 0;
        if (!rot) return { x: bb.x, y: bb.y, w: bb.w, h: bb.h };
        const c = getCenter(o), pts = [[bb.x, bb.y], [bb.x + bb.w, bb.y], [bb.x + bb.w, bb.y + bb.h], [bb.x, bb.y + bb.h]].map((p) => rotPt({ x: p[0], y: p[1] }, rot, c));
        const b = G.bounds(pts); return { x: b.x, y: b.y, w: b.w, h: b.h };
    }
    function unionBox(list) { const b = list.map(vbox), x1 = Math.min(...b.map((r) => r.x)), y1 = Math.min(...b.map((r) => r.y)), x2 = Math.max(...b.map((r) => r.x + r.w)), y2 = Math.max(...b.map((r) => r.y + r.h)); return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; }
    P.vbox = vbox;

    /* ================= document extras: save and load ================= */
    function proMeta() { return { guides: st.guides, grid: { on: st.grid, size: st.gridSize, snap: st.snapGrid }, artboards: st.artboards, canvas: { w: CANVAS_BOUNDS.width, h: CANVAS_BOUNDS.height } }; }
    function loadMeta(m) {
        if (!m) { st.guides = []; st.artboards = []; st.activeArtboard = -1; refresh(); return; }
        st.guides = Array.isArray(m.guides) ? m.guides : []; st.artboards = Array.isArray(m.artboards) ? m.artboards : [];
        if (m.grid) { st.grid = !!m.grid.on; st.gridSize = num(m.grid.size, 20) || 20; st.snapGrid = !!m.grid.snap; }
        if (m.canvas && m.canvas.w > 0 && m.canvas.h > 0) { CANVAS_BOUNDS.width = m.canvas.w; CANVAS_BOUNDS.height = m.canvas.h; }
        st.activeArtboard = st.artboards.length ? 0 : -1;
        refresh(); redraw(); syncPanel();
    }
    P.meta = proMeta; P.loadMeta = loadMeta;

    /* ================= the layer inside the drawing area ================= */
    let proLayer, gridLayer, gridPat, gridRect;
    function ensureLayers() {
        if (proLayer && proLayer.isConnected) return;
        gridLayer = document.createElementNS(NS, 'g'); gridLayer.id = 'pro-grid'; gridLayer.setAttribute('pointer-events', 'none');
        const defsEl = document.createElementNS(NS, 'defs');
        gridPat = document.createElementNS(NS, 'pattern'); gridPat.id = 'pro-grid-pat'; gridPat.setAttribute('patternUnits', 'userSpaceOnUse');
        defsEl.appendChild(gridPat); gridLayer.appendChild(defsEl);
        gridRect = document.createElementNS(NS, 'rect'); gridRect.setAttribute('fill', 'url(#pro-grid-pat)'); gridLayer.appendChild(gridRect);
        svg.insertBefore(gridLayer, drawLayer);
        proLayer = document.createElementNS(NS, 'g'); proLayer.id = 'pro-layer'; svg.appendChild(proLayer);
    }
    function setLayerTransform() {
        const t = `translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`;
        if (gridLayer) gridLayer.setAttribute('transform', t);
        if (proLayer) proLayer.setAttribute('transform', t);
    }
    function lineEl(x1, y1, x2, y2, stroke, extra) {
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); l.setAttribute('stroke', stroke);
        l.setAttribute('stroke-width', 1); l.setAttribute('vector-effect', 'non-scaling-stroke');
        if (extra) Object.keys(extra).forEach((k) => l.setAttribute(k, extra[k]));
        return l;
    }

    /* ================= grid ================= */
    function drawGrid() {
        ensureLayers();
        gridLayer.style.display = st.grid ? '' : 'none';
        if (!st.grid) return;
        const s = Math.max(2, st.gridSize), major = s * 5;
        gridPat.setAttribute('width', major); gridPat.setAttribute('height', major);
        gridPat.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const a = i * s, strong = i === 0;
            const v = lineEl(a, 0, a, major, strong ? 'rgba(124,92,255,0.34)' : 'rgba(124,92,255,0.16)'), h = lineEl(0, a, major, a, strong ? 'rgba(124,92,255,0.34)' : 'rgba(124,92,255,0.16)');
            gridPat.appendChild(v); gridPat.appendChild(h);
        }
        gridRect.setAttribute('x', 0); gridRect.setAttribute('y', 0); gridRect.setAttribute('width', CANVAS_BOUNDS.width); gridRect.setAttribute('height', CANVAS_BOUNDS.height);
    }

    /* ================= guides and artboards drawn on the page ================= */
    let smartLines = [];
    function drawLayerContent() {
        ensureLayers();
        proLayer.innerHTML = '';
        // artboards
        st.artboards.forEach((a, i) => {
            const r = document.createElementNS(NS, 'rect');
            r.setAttribute('x', a.x); r.setAttribute('y', a.y); r.setAttribute('width', a.w); r.setAttribute('height', a.h); r.setAttribute('fill', 'none');
            r.setAttribute('stroke', i === st.activeArtboard ? '#7c5cff' : 'rgba(124,92,255,0.55)'); r.setAttribute('stroke-width', i === st.activeArtboard ? 1.6 : 1); r.setAttribute('vector-effect', 'non-scaling-stroke'); r.setAttribute('pointer-events', 'none');
            proLayer.appendChild(r);
            const t = document.createElementNS(NS, 'text');
            t.setAttribute('x', a.x); t.setAttribute('y', a.y - 6 / zoomLevel); t.setAttribute('font-size', 12 / zoomLevel); t.setAttribute('fill', i === st.activeArtboard ? '#7c5cff' : 'rgba(124,92,255,0.8)');
            t.setAttribute('font-family', 'system-ui, sans-serif'); t.setAttribute('font-weight', '600'); t.style.cursor = 'pointer'; t.textContent = a.name || ('Artboard ' + (i + 1));
            t.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); st.activeArtboard = i; startArtboardDrag(i, e); });
            proLayer.appendChild(t);
        });
        // guides
        if (st.showGuides) st.guides.forEach((gd, i) => {
            const vert = gd.axis === 'x', pos = gd.pos;
            const line = vert ? lineEl(pos, 0, pos, CANVAS_BOUNDS.height, '#00b7ff') : lineEl(0, pos, CANVAS_BOUNDS.width, pos, '#00b7ff');
            line.setAttribute('pointer-events', 'none'); proLayer.appendChild(line);
            const hit = vert ? lineEl(pos, 0, pos, CANVAS_BOUNDS.height, 'rgba(0,0,0,0)') : lineEl(0, pos, CANVAS_BOUNDS.width, pos, 'rgba(0,0,0,0)');
            hit.setAttribute('stroke-width', 9); hit.style.cursor = vert ? 'ew-resize' : 'ns-resize'; hit.setAttribute('pointer-events', 'stroke');
            hit.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); startGuideDrag(i, e); });
            hit.addEventListener('dblclick', (e) => { e.stopPropagation(); st.guides.splice(i, 1); refresh(); });
            proLayer.appendChild(hit);
        });
        // smart guide lines (shown while moving)
        smartLines.forEach((s) => proLayer.appendChild(s.axis === 'x' ? lineEl(s.pos, 0, s.pos, CANVAS_BOUNDS.height, '#ff2d95', { 'stroke-dasharray': '4 3', 'pointer-events': 'none' }) : lineEl(0, s.pos, CANVAS_BOUNDS.width, s.pos, '#ff2d95', { 'stroke-dasharray': '4 3', 'pointer-events': 'none' })));
    }
    function startGuideDrag(i, e0) {
        const gd = st.guides[i], vert = gd.axis === 'x'; let moved = false;
        const onMove = (e) => { const p = worldFromClient(e.clientX, e.clientY); gd.pos = round(vert ? p.x : p.y, 1); moved = true; drawLayerContent(); drawRulers(); };
        const onUp = (e) => {
            document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
            const r = svg.getBoundingClientRect(), outside = vert ? (e.clientX < r.left + 18) : (e.clientY < r.top + 18);
            if (moved && outside) st.guides.splice(i, 1);
            refresh(); syncPanel();
        };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    }
    function startArtboardDrag(i, e0) {
        const a = st.artboards[i], start = worldFromClient(e0.clientX, e0.clientY), ox = a.x, oy = a.y; let moved = false;
        const onMove = (e) => { const p = worldFromClient(e.clientX, e.clientY); a.x = round(ox + p.x - start.x, 0); a.y = round(oy + p.y - start.y, 0); moved = true; drawLayerContent(); };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); void moved; refresh(); syncPanel(); };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    }
    function worldFromClient(cx, cy) { const r = svg.getBoundingClientRect(); return { x: (cx - r.left - panOffset.x) / zoomLevel, y: (cy - r.top - panOffset.y) / zoomLevel }; }

    /* ================= rulers ================= */
    let rulerH, rulerV, rulerCorner;
    function niceStep(minWorld) { const pows = [1, 2, 5]; let base = 1; for (let k = 0; k < 8; k++) for (const m of pows) { const s = m * base; if (s >= minWorld) return s; if (m === 5) base *= 10; } return 1000; }
    function ensureRulers() {
        const frame = $('.canvas-frame');
        if (!frame || (rulerH && rulerH.isConnected)) return;
        if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
        rulerH = el('canvas', 'pro-ruler pro-ruler-h'); rulerV = el('canvas', 'pro-ruler pro-ruler-v'); rulerCorner = el('div', 'pro-ruler-corner');
        frame.appendChild(rulerH); frame.appendChild(rulerV); frame.appendChild(rulerCorner);
        rulerCorner.title = 'Rulers: drag from a ruler onto the page to make a guide. Double-click a guide to remove it.';
        const begin = (vert) => (e0) => {
            e0.preventDefault();
            const gd = { axis: vert ? 'x' : 'y', pos: 0 }; st.guides.push(gd); const idx = st.guides.length - 1; st.showGuides = true;
            const onMove = (e) => { const p = worldFromClient(e.clientX, e.clientY); gd.pos = round(vert ? p.x : p.y, 1); drawLayerContent(); drawRulers(); };
            const onUp = (e) => {
                document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
                const r = svg.getBoundingClientRect(), outside = vert ? (e.clientX < r.left + 18) : (e.clientY < r.top + 18);
                if (outside) st.guides.splice(idx, 1);
                refresh(); syncPanel();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        };
        rulerH.addEventListener('mousedown', begin(false)); rulerV.addEventListener('mousedown', begin(true));
        window.addEventListener('resize', () => setTimeout(drawRulers, 30));
    }
    function drawRulers() {
        ensureRulers();
        if (!rulerH) return;
        const on = st.rulers;
        [rulerH, rulerV, rulerCorner].forEach((n) => { n.style.display = on ? '' : 'none'; });
        if (!on) return;
        const r = svg.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, T = 18;
        const dark = document.body.classList.contains('ik-dark') || window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches && !document.body.classList.contains('ik-light');
        const bg = dark ? '#1b1f2b' : '#eef0f6', fg = dark ? '#9aa4bd' : '#5b6479', tick = dark ? '#3a4258' : '#c5cadb';
        const paint = (cv, len, horizontal) => {
            cv.style.width = (horizontal ? len - T : T) + 'px'; cv.style.height = (horizontal ? T : len - T) + 'px';
            const w = Math.max(1, Math.round((horizontal ? len - T : T) * dpr)), h = Math.max(1, Math.round((horizontal ? T : len - T) * dpr));
            if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h;
            const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height);
            c.font = '9px system-ui, sans-serif'; c.fillStyle = fg; c.strokeStyle = tick; c.lineWidth = 1; c.textBaseline = 'top';
            const step = niceStep(60 / zoomLevel), minor = step / 5, off = horizontal ? panOffset.x : panOffset.y, span = len - T;
            const first = Math.floor((-off) / zoomLevel / minor) * minor, last = (span - off) / zoomLevel;
            for (let v = first; v <= last + minor; v += minor) {
                const pos = off + v * zoomLevel - (horizontal ? T : T);   // ruler canvases start after the corner
                const px = pos + T, isMajor = Math.abs(v / step - Math.round(v / step)) < 1e-6, isMid = Math.abs(v / (step / 2) - Math.round(v / (step / 2))) < 1e-6;
                if (px < T || px > len) continue;
                const rel = px - T, size = isMajor ? T : isMid ? 9 : 5;
                c.beginPath(); if (horizontal) { c.moveTo(rel + 0.5, T - size); c.lineTo(rel + 0.5, T); } else { c.moveTo(T - size, rel + 0.5); c.lineTo(T, rel + 0.5); } c.stroke();
                if (isMajor) { const label = String(round(v, 2)); if (horizontal) c.fillText(label, rel + 3, 1); else { c.save(); c.translate(1, rel + 3); c.rotate(-Math.PI / 2); c.fillText(label, -c.measureText(label).width - 1, 0); c.restore(); } }
            }
            // where the pointer is
            if (P.pointer) { const c2 = cv.getContext('2d'); c2.fillStyle = '#7c5cff'; const m = (horizontal ? P.pointer.x : P.pointer.y) * zoomLevel + off - 0; if (horizontal) c2.fillRect(m, 0, 1, T); else c2.fillRect(0, m, T, 1); }
        };
        rulerH.style.cssText = `position:absolute;left:${T}px;top:0;height:${T}px;`; rulerV.style.cssText = `position:absolute;left:0;top:${T}px;width:${T}px;`;
        rulerCorner.style.cssText = `position:absolute;left:0;top:0;width:${T}px;height:${T}px;background:${bg};`;
        paint(rulerH, r.width, true); paint(rulerV, r.height, false);
        // the paint above used the ruler's own origin; fix the offset for the corner width
    }

    /* ================= snapping ================= */
    function snapTargets(exclude) {
        const xs = [], ys = [], thr = 6 / zoomLevel;
        if (st.snapGuides) st.guides.forEach((gd) => (gd.axis === 'x' ? xs : ys).push({ v: gd.pos, kind: 'guide' }));
        if (st.snapObjects) {
            objects.forEach((o, i) => {
                if (exclude.indexOf(i) >= 0 || !o || o.hidden) return;
                const b = vbox(o); xs.push({ v: b.x, kind: 'obj' }, { v: b.x + b.w / 2, kind: 'obj' }, { v: b.x + b.w, kind: 'obj' }); ys.push({ v: b.y, kind: 'obj' }, { v: b.y + b.h / 2, kind: 'obj' }, { v: b.y + b.h, kind: 'obj' });
            });
            st.artboards.forEach((a) => { xs.push({ v: a.x, kind: 'art' }, { v: a.x + a.w / 2, kind: 'art' }, { v: a.x + a.w, kind: 'art' }); ys.push({ v: a.y, kind: 'art' }, { v: a.y + a.h / 2, kind: 'art' }, { v: a.y + a.h, kind: 'art' }); });
            xs.push({ v: 0, kind: 'page' }, { v: CANVAS_BOUNDS.width / 2, kind: 'page' }, { v: CANVAS_BOUNDS.width, kind: 'page' }); ys.push({ v: 0, kind: 'page' }, { v: CANVAS_BOUNDS.height / 2, kind: 'page' }, { v: CANVAS_BOUNDS.height, kind: 'page' });
        }
        return { xs, ys, thr };
    }
    function bestSnap(values, targets, thr) {
        let best = null;
        values.forEach((v) => targets.forEach((t) => { const d = t.v - v; if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t.v }; }));
        return best;
    }
    function snapGridValue(v) { return Math.round(v / st.gridSize) * st.gridSize; }
    // for the shape being moved: returns { dx, dy, lines } to add so its edges land on something
    function snapBox(b, exclude) {
        const T = snapTargets(exclude), xs = T.xs.slice(), ys = T.ys.slice();
        if (st.snapGrid) {
            [b.x, b.x + b.w / 2, b.x + b.w].forEach((v) => xs.push({ v: snapGridValue(v), kind: 'grid' })); [b.y, b.y + b.h / 2, b.y + b.h].forEach((v) => ys.push({ v: snapGridValue(v), kind: 'grid' }));
        }
        const bx = bestSnap([b.x, b.x + b.w / 2, b.x + b.w], xs, T.thr), by = bestSnap([b.y, b.y + b.h / 2, b.y + b.h], ys, T.thr);
        const lines = []; if (bx) lines.push({ axis: 'x', pos: bx.at }); if (by) lines.push({ axis: 'y', pos: by.at });
        return { dx: bx ? bx.d : 0, dy: by ? by.d : 0, lines };
    }
    // for a single point (drawing tools, nodes)
    function snapPoint(p) {
        const T = snapTargets([]), xs = T.xs.slice(), ys = T.ys.slice();
        if (st.snapGrid) { xs.push({ v: snapGridValue(p.x), kind: 'grid' }); ys.push({ v: snapGridValue(p.y), kind: 'grid' }); }
        const bx = bestSnap([p.x], xs, T.thr), by = bestSnap([p.y], ys, T.thr);
        return { x: bx ? bx.at : p.x, y: by ? by.at : p.y, hit: !!(bx || by) };
    }
    P.snapPoint = snapPoint;

    /* ================= hooks into Inkpath ================= */
    let corr = null;
    function hook(name, make) { const orig = window[name]; if (typeof orig !== 'function') return; window[name] = make(orig); }
    function installHooks() {
        hook('applyTransform', (orig) => function () { orig.apply(this, arguments); try { setLayerTransform(); drawLayerContent(); drawRulers(); } catch (e) { console.error(e); } });
        hook('render', (orig) => function () { orig.apply(this, arguments); try { drawGrid(); drawLayerContent(); syncPanel(); renderLayerListPro(); } catch (e) { console.error(e); } });
        hook('renderOne', (orig) => function (obj, idx) {
            const start = drawLayer.childNodes.length; orig.apply(this, arguments);
            if (obj && obj.type === 'text' && obj.onPath) { try { applyTextPath(obj, start); } catch (e) { console.error(e); } }
            if (obj && (obj.hidden || obj.locked)) for (let i = start; i < drawLayer.childNodes.length; i++) { const n = drawLayer.childNodes[i]; if (n.style) { if (obj.hidden) n.style.display = 'none'; else n.style.pointerEvents = 'none'; } }
        });
        hook('getMousePos', (orig) => function (evt) {
            const p = orig.apply(this, arguments);
            P.pointer = { x: p.x, y: p.y };
            const drawing = currentTool !== 'select' && !['zoom', 'eraser', 'eyedropper', 'pencil'].includes(currentTool);
            if ((drawing || dragTarget) && (st.snapGrid || st.snapGuides) && !(evt && (evt.metaKey || evt.ctrlKey))) { const s = snapPoint(p); if (s.hit) return { x: s.x, y: s.y }; }
            return p;
        });
        hook('handleCanvasMouseMove', (orig) => function (evt) {
            try { if (corr && isMovingShape) { sel().forEach((i) => moveObject(objects[i], -corr.x, -corr.y)); corr = null; } } catch (e) { corr = null; }
            orig.apply(this, arguments);
            try {
                if (isMovingShape && sel().length && !(evt.metaKey || evt.ctrlKey)) {
                    const exclude = sel(), b = unionBox(selObjs()), s = snapBox(b, exclude);
                    smartLines = s.lines;
                    if (s.dx || s.dy) { selObjs().forEach((o) => moveObject(o, s.dx, s.dy)); corr = { x: s.dx, y: s.dy }; redraw(); }
                    else drawLayerContent();
                } else if (smartLines.length) { smartLines = []; drawLayerContent(); }
                if (P.pointer) drawRulers();
            } catch (e) { console.error(e); }
        });
        hook('handleCanvasMouseUp', (orig) => function () { corr = null; smartLines = []; const r = orig.apply(this, arguments); try { drawLayerContent(); } catch (e) { /* ignore */ } return r; });
        hook('calculateBoxMultiSelection', (orig) => function () { orig.apply(this, arguments); selectedIndices = selectedIndices.filter((i) => objects[i] && !objects[i].locked && !objects[i].hidden); });
        hook('renderLayerList', () => function () { renderLayerListPro(); });
        hook('syncInspector', (orig) => function () { const r = orig.apply(this, arguments); try { syncPanel(); } catch (e) { /* ignore */ } return r; });
        hook('exportKV', (orig) => function () { return orig.apply(this, arguments); });
        // the drawing file carries the guides, grid and artboards too
        if (window.radiiFileFormat) {
            const f = window.radiiFileFormat, make = f.make, load = f.load;
            f.make = function () { const t = make.apply(this, arguments); try { const doc = jsyaml.load(t); doc.pro = proMeta(); return jsyaml.dump(doc); } catch (e) { return t; } };
            f.load = function (text) { load.apply(this, arguments); try { const doc = jsyaml.load(text); loadMeta(doc && doc.pro); } catch (e) { /* ignore */ } };
        }
    }

    /* ================= align, distribute, size ================= */
    function alignRef() {
        const objs = selObjs();
        if (st.alignTo === 'artboard' && st.artboards[st.activeArtboard]) { const a = st.artboards[st.activeArtboard]; return { x: a.x, y: a.y, w: a.w, h: a.h }; }
        if (st.alignTo === 'canvas' || objs.length < 2) return { x: 0, y: 0, w: CANVAS_BOUNDS.width, h: CANVAS_BOUNDS.height };
        return unionBox(objs);
    }
    P.align = function (how) {
        const objs = selObjs(); if (!objs.length) return toast('Select something to align first');
        history();
        const ref = alignRef();
        objs.forEach((o) => {
            const b = vbox(o); let dx = 0, dy = 0;
            if (how === 'left') dx = ref.x - b.x; else if (how === 'center') dx = ref.x + ref.w / 2 - (b.x + b.w / 2); else if (how === 'right') dx = ref.x + ref.w - (b.x + b.w);
            else if (how === 'top') dy = ref.y - b.y; else if (how === 'middle') dy = ref.y + ref.h / 2 - (b.y + b.h / 2); else if (how === 'bottom') dy = ref.y + ref.h - (b.y + b.h);
            moveObject(o, dx, dy);
        });
        redraw();
    };
    P.distribute = function (axis) {
        const idx = sel(); if (idx.length < 3) return toast('Select three or more shapes to distribute');
        history();
        const items = idx.map((i) => ({ o: objects[i], b: vbox(objects[i]) }));
        const horiz = axis === 'h';
        items.sort((a, b) => (horiz ? a.b.x - b.b.x : a.b.y - b.b.y));
        const first = items[0].b, last = items[items.length - 1].b;
        const start = horiz ? first.x + first.w : first.y + first.h, end = horiz ? last.x : last.y;
        const total = items.slice(1, -1).reduce((s, it) => s + (horiz ? it.b.w : it.b.h), 0), gap = (end - start - total) / (items.length - 1);
        let pos = start + gap;
        items.slice(1, -1).forEach((it) => { const cur = horiz ? it.b.x : it.b.y; if (horiz) moveObject(it.o, pos - cur, 0); else moveObject(it.o, 0, pos - cur); pos += (horiz ? it.b.w : it.b.h) + gap; });
        redraw();
    };
    P.flip = function (axis) {
        const objs = selObjs(); if (!objs.length) return; history();
        const b = unionBox(objs), sx = axis === 'h' ? -1 : 1, sy = axis === 'v' ? -1 : 1, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        objs.forEach((o) => flipObject(o, sx, sy, cx, cy));
        redraw();
    };
    function flipObject(o, sx, sy, cx, cy) {
        const fx = (x) => 2 * cx - x, fy = (y) => 2 * cy - y;
        const nodes = shapeToNodes(o);
        if (o.type === 'circle' || o.type === 'ellipse') { if (sx < 0) o.cx = fx(o.cx); if (sy < 0) o.cy = fy(o.cy); }
        else if (o.type === 'line') { if (sx < 0) { o.x1 = fx(o.x1); o.x2 = fx(o.x2); } if (sy < 0) { o.y1 = fy(o.y1); o.y2 = fy(o.y2); } }
        else if (isRectLike(o)) { const bb = shapeBBox(o); if (sx < 0) o.x = 2 * cx - (bb.x + bb.w); if (sy < 0) o.y = 2 * cy - (bb.y + bb.h); o.flipX = sx < 0 ? !o.flipX : o.flipX; o.flipY = sy < 0 ? !o.flipY : o.flipY; }
        else if (o.type === 'path' && Array.isArray(o.nodes)) o.nodes.forEach((n) => { if (sx < 0) { n.x = fx(n.x); n.cx1 = fx(n.cx1); n.cx2 = fx(n.cx2); } if (sy < 0) { n.y = fy(n.y); n.cy1 = fy(n.cy1); n.cy2 = fy(n.cy2); } });
        else if (nodes && (o.type === 'polygon' || o.type === 'star')) { Object.assign(o, { type: 'path', pathMode: 'bezier', nodes }); flipObject(o, sx, sy, cx, cy); return; }
        else if (o.type === 'text') { if (sx < 0) o.x = fx(o.x); if (sy < 0) o.y = fy(o.y); }
        else if (Array.isArray(o.children)) { o.children.forEach((c) => flipObject(c, sx, sy, cx, cy)); if (o.clip) flipObject(o.clip, sx, sy, cx, cy); if (o.mask) flipObject(o.mask, sx, sy, cx, cy); }
        if (o.rotation) { const r = parseFloat(o.rotation) || 0; o.rotation = (sx * sy < 0) ? -r : r; }
    }
    P.setBox = function (field, value) {
        const objs = selObjs(); if (!objs.length) return; value = num(value);
        history();
        if (field === 'rotation') { if (objs.length === 1) objs[0].rotation = value; redraw(); return; }
        const b = unionBox(objs);
        if (field === 'x') objs.forEach((o) => moveObject(o, value - b.x, 0));
        else if (field === 'y') objs.forEach((o) => moveObject(o, 0, value - b.y));
        else if (field === 'w' || field === 'h') {
            const ub = objs.length === 1 ? shapeBBox(objs[0]) : b; let sx = field === 'w' ? Math.max(0.5, value) / Math.max(ub.w, 1) : 1, sy = field === 'h' ? Math.max(0.5, value) / Math.max(ub.h, 1) : 1;
            if (st.lockRatio) { if (field === 'w') sy = sx; else sx = sy; }
            objs.forEach((o) => scaleXYAbout(o, sx, sy, ub.x, ub.y));
        }
        redraw();
    };

    /* ================= copy and paste ================= */
    let clip = null, pasteCount = 0;
    P.copy = function (cut) {
        const objs = selObjs(); if (!objs.length) return;
        clip = objs.map(clone); pasteCount = 0;
        try { navigator.clipboard && navigator.clipboard.writeText('inkpath:' + JSON.stringify(clip)); } catch (e) { /* ignore */ }
        if (cut) { deleteSelectedObject(); toast('Cut ' + objs.length + ' shape' + (objs.length > 1 ? 's' : '')); } else toast('Copied ' + objs.length + ' shape' + (objs.length > 1 ? 's' : ''));
    };
    P.paste = function (inPlace) {
        if (!clip || !clip.length) return toast('Nothing copied yet');
        history(); pasteCount++;
        const off = inPlace ? 0 : 12 * pasteCount, copies = clip.map(clone);
        copies.forEach((c) => { if (off) moveObject(c, off, off); objects.push(c); });
        selectedIndices = copies.map((_, k) => objects.length - copies.length + k);
        redraw(); toast('Pasted');
    };
    P.selectAll = function () { selectedIndices = objects.map((_, i) => i).filter((i) => !objects[i].locked && !objects[i].hidden); redraw(); };
    P.toggleHide = function () { const o = selObjs(); if (!o.length) return; history(); const v = !o.every((x) => x.hidden); o.forEach((x) => { x.hidden = v; }); if (v) selectedIndices = []; redraw(); };
    P.toggleLock = function () { const o = selObjs(); if (!o.length) return; history(); const v = !o.every((x) => x.locked); o.forEach((x) => { x.locked = v; }); redraw(); };
    P.showAll = function () { history(); objects.forEach((o) => { delete o.hidden; }); redraw(); };

    /* ================= path tools ================= */
    function pathParts(o) {
        // { nodes (cubic), closed, copy } for any shape that can be a path
        let nodes;
        if (o.type === 'path') nodes = displayNodesFor(o); else nodes = shapeToNodes(o);
        if (!nodes || nodes.length < 2) return null;
        nodes = nodes.map((n) => ({ x: n.x, y: n.y, cx1: n.cx1, cy1: n.cy1, cx2: n.cx2, cy2: n.cy2 }));
        const f = nodes[0], l = nodes[nodes.length - 1], duplicate = nodes.length > 2 && Math.hypot(f.x - l.x, f.y - l.y) < 0.01;
        // rectangles, circles, ellipses, polygons and stars are closed shapes even when their node list does not repeat the first node
        const closed = duplicate || (o.type !== 'path' && /^(rect|image|circle|ellipse|polygon|star)$/.test(o.type));
        if (duplicate) nodes.pop();
        return { nodes, closed };
    }
    function packNodes(nodes, closed) { const out = nodes.map((n) => ({ x: n.x, y: n.y, cx1: n.cx1, cy1: n.cy1, cx2: n.cx2, cy2: n.cy2 })); if (closed && out.length) { const f = out[0]; out.push({ x: f.x, y: f.y, cx1: f.cx1, cy1: f.cy1, cx2: f.cx2, cy2: f.cy2 }); } return out; }
    function eachPath(fn, need) {
        const idx = sel(); if (!idx.length) { toast('Select a shape first'); return 0; }
        history(); let done = 0;
        idx.forEach((i) => { const o = objects[i], pp = pathParts(o); if (!pp) return; const r = fn(o, pp, i); if (r) { done++; } });
        if (!done) { toast(need || 'That tool needs a path or shape'); return 0; }
        redraw(); return done;
    }
    P.simplify = function () {
        let before = 0, after = 0;
        const n = eachPath((o, pp) => { const r = G.simplifyNodes(pp.nodes, pp.closed, st.simplifyTol); before += pp.nodes.length; after += r.nodes.length; Object.assign(o, { type: 'path', pathMode: 'bezier', nodes: packNodes(r.nodes, pp.closed) }); return true; });
        if (n) toast('Simplified: ' + before + ' nodes became ' + after);
    };
    P.smooth = function () { eachPath((o, pp) => { Object.assign(o, { type: 'path', pathMode: 'bezier', nodes: packNodes(G.smoothNodes(pp.nodes, pp.closed), pp.closed) }); return true; }); };
    P.sharp = function () { eachPath((o, pp) => { Object.assign(o, { type: 'path', pathMode: 'bezier', nodes: packNodes(G.sharpNodes(pp.nodes), pp.closed) }); return true; }); };
    P.addNodes = function () { const n = eachPath((o, pp) => { Object.assign(o, { type: 'path', pathMode: 'bezier', nodes: packNodes(G.subdivideNodes(pp.nodes.map((x) => Object.assign({}, x)), pp.closed), pp.closed) }); return true; }); if (n) toast('Added a node in every segment'); };
    P.reverse = function () { eachPath((o, pp) => { Object.assign(o, { type: 'path', pathMode: 'bezier', nodes: packNodes(G.reverseNodes(pp.nodes), pp.closed) }); return true; }); };
    P.closePath = function () { eachPath((o, pp) => { if (pp.closed) return false; Object.assign(o, { type: 'path', pathMode: 'bezier', nodes: packNodes(pp.nodes, true) }); return true; }, 'Pick an open path to close'); };
    P.openPath = function () { eachPath((o, pp) => { if (!pp.closed) return false; Object.assign(o, { type: 'path', pathMode: 'bezier', nodes: packNodes(pp.nodes, false) }); return true; }, 'Pick a closed path to open'); };
    P.join = function () {
        const idx = sel().filter((i) => objects[i].type === 'path'); if (idx.length !== 2) return toast('Select exactly two open paths to join');
        const a = pathParts(objects[idx[0]]), b = pathParts(objects[idx[1]]); if (!a || !b || a.closed || b.closed) return toast('Both paths must be open');
        history(); const joined = G.joinNodes(a.nodes, b.nodes), keep = Math.min(idx[0], idx[1]), drop = Math.max(idx[0], idx[1]);
        Object.assign(objects[keep], { nodes: packNodes(joined, false), pathMode: 'bezier' }); objects.splice(drop, 1); selectedIndices = [keep]; redraw(); toast('Joined into one path');
    };
    function applyPathLike(src, nodes, extra) {
        return Object.assign({ type: 'path', pathMode: 'bezier', nodes, fill: 'none', fillType: 'none', stroke: '#000000', strokeWidth: 0, opacity: src.opacity === undefined ? 1 : src.opacity, blur: 0, rotation: 0 }, extra || {});
    }
    // turn the stroke into a filled shape of its own
    P.outlineStroke = function () {
        const idx = sel(); if (!idx.length) return toast('Select a shape with a stroke');
        history(); const made = []; let count = 0;
        idx.forEach((i) => {
            const o = objects[i], pp = pathParts(o); if (!pp) return;
            const w = num(o.strokeWidth, 0); if (!(w > 0) || !o.stroke || o.stroke === 'none') return;
            const pts = G.flattenNodes(pp.nodes, pp.closed, 0.3), cap = o.linecap || 'butt', join = o.linejoin || 'miter';
            const res = G.strokeOutline(pts, w, pp.closed, cap, join, num(o.miterlimit, 4));
            if (!res.contours.length) return;
            const colour = o.stroke, mk = (poly) => applyPathLike(o, packNodes(G.polylineToNodes(poly), true), { fill: colour, fillType: 'color', stroke: 'none', strokeWidth: 0 });
            let out;
            if (res.contours.length > 1) out = { type: 'boolean', op: 'subtract', children: [mk(res.contours[0]), mk(res.contours[1])], opacity: o.opacity === undefined ? 1 : o.opacity, rotation: 0, blur: 0 };
            else out = mk(res.contours[0]);
            made.push({ at: i, out, keepFill: o.fill && o.fill !== 'none' && o.fillType !== 'none' ? Object.assign(clone(o), { stroke: 'none', strokeWidth: 0 }) : null });
            count++;
        });
        if (!count) { undoStack.pop(); return toast('Nothing to outline: the shape needs a stroke with a width'); }
        made.sort((a, b) => b.at - a.at).forEach((m) => { objects.splice(m.at, 1, m.out); if (m.keepFill) objects.splice(m.at, 0, m.keepFill); });
        selectedIndices = made.map((m) => m.at).sort((a, b) => a - b); redraw(); toast('Stroke turned into a shape');
    };
    // a bigger (or smaller, with a minus) copy of the shape's outline
    P.offset = function () {
        const idx = sel(); if (!idx.length) return toast('Select a shape first');
        history(); const added = []; let count = 0;
        idx.forEach((i) => {
            const o = objects[i], pp = pathParts(o); if (!pp || !pp.closed) return;
            const pts = G.flattenNodes(pp.nodes, true, 0.3), r = G.offsetPolygon(pts, st.offsetDist, st.offsetJoin, 4);
            if (r.length < 3) return;
            const smoothOut = st.offsetJoin === 'round' ? G.pointsToNodes(G.rdp(r, 0.4, true), true, { cornerAngle: 40 }) : G.polylineToNodes(r);
            added.push(applyPathLike(o, packNodes(smoothOut, true), { fill: o.fill, fillType: o.fillType, fillAngle: o.fillAngle, stroke: o.stroke, strokeWidth: o.strokeWidth })); count++;
        });
        if (!count) { undoStack.pop(); return toast('Offset needs a closed shape or path'); }
        added.forEach((a) => objects.push(a)); selectedIndices = added.map((_, k) => objects.length - added.length + k); redraw(); toast('Offset path made');
    };
    // double-click a segment of a path in node mode to add a node there
    function installNodeAdd() {
        svg.addEventListener('dblclick', (e) => {
            if (currentTool !== 'node' || sel().length !== 1) return;
            const o = objects[sel()[0]]; if (!o || o.type !== 'path') return;
            const p = getMousePos(e), pp = pathParts(o); if (!pp) return;
            const hit = G.nearestOnNodes(pp.closed ? pp.nodes : pp.nodes, pp.closed, p.x, p.y);
            if (!hit || hit.distance > 10 / zoomLevel) return;
            e.stopPropagation(); history();
            o.nodes = packNodes(G.insertNodeAt(pp.nodes, pp.closed, hit.segment, hit.t), pp.closed); o.pathMode = 'bezier'; redraw(); toast('Node added');
        });
    }

    /* ================= text on a path ================= */
    const uidOf = () => 'p' + Math.random().toString(36).slice(2, 9);
    P.textOnPath = function () {
        const idx = sel(), t = idx.find((i) => objects[i].type === 'text'), p = idx.find((i) => objects[i].type === 'path');
        if (t === undefined || p === undefined) return toast('Select one text and one path, then press this');
        history(); const path = objects[p]; if (!path.uid) path.uid = uidOf();
        objects[t].onPath = path.uid; objects[t].pathOffset = num(st.textOffset, 0) + '%'; redraw(); toast('The text now follows the path');
    };
    P.textOffPath = function () { const o = selObjs().filter((x) => x.type === 'text' && x.onPath); if (!o.length) return toast('Select text that sits on a path'); history(); o.forEach((x) => { delete x.onPath; delete x.pathOffset; }); redraw(); };
    function applyTextPath(obj, start) {
        if (!obj || obj.type !== 'text' || !obj.onPath) return;
        const tgt = objects.find((o) => o && o.uid === obj.onPath && o.type === 'path'); if (!tgt) return;
        const pid = 'pro-tp-' + obj.onPath;
        if (!defs.querySelector('#' + pid)) { const pe = document.createElementNS(NS, 'path'); pe.id = pid; pe.setAttribute('d', buildPathData(displayNodesFor(tgt))); defs.appendChild(pe); }
        for (let i = start; i < drawLayer.childNodes.length; i++) {
            const n = drawLayer.childNodes[i], te = n.tagName === 'text' ? n : (n.querySelector && n.querySelector('text')); if (!te) continue;
            const txt = String(obj.text || ''); te.textContent = '';
            const tp = document.createElementNS(NS, 'textPath'); tp.setAttribute('href', '#' + pid); tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + pid); tp.setAttribute('startOffset', obj.pathOffset || '0%'); tp.textContent = txt; te.appendChild(tp);
            te.removeAttribute('x'); te.removeAttribute('y'); break;
        }
    }

    /* ================= the knife ================= */
    let knife = null;
    function clipHalf(pts, a, n, keep) {
        const out = [], side = (p) => ((p.x - a.x) * n.x + (p.y - a.y) * n.y) * keep;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length], sp = side(p), sq = side(q);
            if (sp >= 0) out.push(p);
            if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) { const t = sp / (sp - sq); out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
        }
        return out;
    }
    // how many times the polyline crosses the drawn knife segment (a vertex exactly on the line counts once)
    function crossesSegment(pts, closed, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, nrm = { x: -dy, y: dx }; let hits = 0;
        const n = closed ? pts.length : pts.length - 1;
        for (let i = 0; i < n; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length], sp = (p.x - a.x) * nrm.x + (p.y - a.y) * nrm.y, sq = (q.x - a.x) * nrm.x + (q.y - a.y) * nrm.y;
            if ((sp >= 0) === (sq >= 0)) continue;
            const t = sp / (sp - sq), x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t, along = ((x - a.x) * dx + (y - a.y) * dy) / l2;
            if (along >= 0 && along <= 1) hits++;
        }
        return hits;
    }
    function splitOpen(pts, a, nrm) {
        const pieces = []; let cur = [pts[0]]; const side = (p) => ((p.x - a.x) * nrm.x + (p.y - a.y) * nrm.y);
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i - 1], q = pts[i], sp = side(p), sq = side(q);
            if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) { const t = sp / (sp - sq), x = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; cur.push(x); pieces.push(cur); cur = [x, q]; } else cur.push(q);
        }
        pieces.push(cur); return pieces.filter((c) => c.length > 1);
    }
    function cutObject(o, a, b) {
        const pp = pathParts(o); if (!pp) return null;
        const pts = G.flattenNodes(pp.nodes, pp.closed, 0.3), nrm = { x: -(b.y - a.y), y: b.x - a.x };
        if (pp.closed) {
            if (crossesSegment(pts, true, a, b) < 2) return null;
            const s1 = clipHalf(pts, a, nrm, 1), s2 = clipHalf(pts, a, nrm, -1), out = [];
            [s1, s2].forEach((poly) => { if (poly.length >= 3 && Math.abs(G.polyArea(poly)) > 1) { const nodes = G.pointsToNodes(G.rdp(poly, 0.35, true), true, { cornerAngle: 38 }); out.push(Object.assign(clone(o), { type: 'path', pathMode: 'bezier', nodes: packNodes(nodes, true), rotation: 0 })); } });
            return out.length > 1 ? out : null;
        }
        if (crossesSegment(pts, false, a, b) < 1) return null;
        const pieces = splitOpen(pts, a, nrm); if (pieces.length < 2) return null;
        return pieces.map((poly) => Object.assign(clone(o), { type: 'path', pathMode: 'bezier', nodes: packNodes(G.pointsToNodes(G.rdp(poly, 0.35, false), false, { cornerAngle: 38 }), false), rotation: 0 }));
    }
    P.cutAlong = function (a, b, onlySelected) {
        history(); const targets = onlySelected && sel().length ? sel() : objects.map((_, i) => i).filter((i) => !objects[i].locked && !objects[i].hidden);
        const made = []; let cuts = 0;
        targets.sort((x, y) => y - x).forEach((i) => { const pieces = cutObject(objects[i], a, b); if (pieces) { objects.splice(i, 1, ...pieces); made.push(i); cuts++; } });
        if (!cuts) { undoStack.pop(); return toast('The line did not cross any shape'); }
        selectedIndices = []; redraw(); toast('Cut ' + cuts + ' shape' + (cuts > 1 ? 's' : ''));
    };
    P.startKnife = function () {
        if (knife) return stopKnife();
        knife = { a: null, b: null }; svg.style.cursor = 'crosshair'; toast('Knife: drag a line across the shapes to cut (Esc to stop)');
        document.querySelectorAll('[data-knife]').forEach((b) => b.classList.add('on'));
        svg.addEventListener('mousedown', knifeDown, true);
    };
    function stopKnife() { knife = null; svg.style.cursor = ''; svg.removeEventListener('mousedown', knifeDown, true); drawLayerContent(); document.querySelectorAll('[data-knife]').forEach((b) => b.classList.remove('on')); }
    function knifeDown(e) {
        if (!knife || e.button === 2) return;
        e.stopPropagation(); e.preventDefault();
        const a = worldFromClient(e.clientX, e.clientY); let b = a;
        const onMove = (ev) => { b = worldFromClient(ev.clientX, ev.clientY); drawLayerContent(); proLayer.appendChild(lineEl(a.x, a.y, b.x, b.y, '#ff2d95', { 'stroke-dasharray': '6 4', 'pointer-events': 'none' })); };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (Math.hypot(b.x - a.x, b.y - a.y) > 4 / zoomLevel) P.cutAlong(a, b, false); stopKnife(); };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && knife) stopKnife(); });

    /* ================= artboards and canvas ================= */
    const PRESETS = { 'Icon 24': [24, 24], 'Icon 512': [512, 512], 'Social post 1080': [1080, 1080], 'Story 1080 x 1920': [1080, 1920], 'HD 1920 x 1080': [1920, 1080], 'A4 (595 x 842)': [595, 842], 'Letter (612 x 792)': [612, 792], 'Banner 1500 x 500': [1500, 500], 'Phone 390 x 844': [390, 844] };
    P.addArtboard = function (w, h, name) {
        history(); w = Math.max(1, Math.round(w || 400)); h = Math.max(1, Math.round(h || 300));
        const n = st.artboards.length, x = n ? Math.max(...st.artboards.map((a) => a.x + a.w)) + 40 : 40, y = 40;
        if (x + w > CANVAS_BOUNDS.width) CANVAS_BOUNDS.width = x + w + 40; if (y + h > CANVAS_BOUNDS.height) CANVAS_BOUNDS.height = y + h + 40;
        st.artboards.push({ name: name || ('Artboard ' + (n + 1)), x: n ? x : 40, y, w, h }); st.activeArtboard = st.artboards.length - 1;
        refresh(); redraw(); syncPanel(); applyTransform();
    };
    P.artboardFromSelection = function () {
        const objs = selObjs(); if (!objs.length) return toast('Select something to fit an artboard around');
        const b = unionBox(objs), pad = 20; const a = { name: 'Artboard ' + (st.artboards.length + 1), x: Math.round(b.x - pad), y: Math.round(b.y - pad), w: Math.round(b.w + pad * 2), h: Math.round(b.h + pad * 2) };
        st.artboards.push(a); st.activeArtboard = st.artboards.length - 1; refresh(); syncPanel();
    };
    P.deleteArtboard = function () { if (st.activeArtboard < 0) return; st.artboards.splice(st.activeArtboard, 1); st.activeArtboard = st.artboards.length ? 0 : -1; refresh(); syncPanel(); };
    P.setCanvas = function (w, h) { CANVAS_BOUNDS.width = Math.max(100, Math.round(num(w, 1200))); CANVAS_BOUNDS.height = Math.max(100, Math.round(num(h, 800))); redraw(); applyTransform(); };
    P.zoomFit = function () {
        const r = svg.getBoundingClientRect(); let b;
        if (sel().length) b = unionBox(selObjs()); else if (objects.length) b = unionBox(objects.filter((o) => !o.hidden)); else b = { x: 0, y: 0, w: CANVAS_BOUNDS.width, h: CANVAS_BOUNDS.height };
        const pad = 50, z = Math.max(0.2, Math.min(5, Math.min((r.width - pad * 2) / Math.max(b.w, 1), (r.height - pad * 2) / Math.max(b.h, 1))));
        zoomLevel = z; panOffset.x = (r.width - b.w * z) / 2 - b.x * z; panOffset.y = (r.height - b.h * z) / 2 - b.y * z; applyTransform();
    };
    P.zoom100 = function () { const r = svg.getBoundingClientRect(), c = worldFromClient(r.left + r.width / 2, r.top + r.height / 2); zoomLevel = 1; panOffset.x = r.width / 2 - c.x; panOffset.y = r.height / 2 - c.y; applyTransform(); };

    /* ================= export ================= */
    function svgFor(region, onlyObjects, scale, bg) {
        let text;
        if (onlyObjects) {
            const saved = objects, savedSel = selectedIndices;
            try { objects = onlyObjects; selectedIndices = []; render(); text = cleanedExportSvg(); } finally { objects = saved; selectedIndices = savedSel; render(); }
        } else text = cleanedExportSvg();
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml'), root = doc.documentElement;
        root.setAttribute('viewBox', [region.x, region.y, region.w, region.h].join(' ')); root.setAttribute('width', Math.round(region.w * scale)); root.setAttribute('height', Math.round(region.h * scale));
        doc.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((n) => n.remove());
        if (bg) { const r = doc.createElementNS(NS, 'rect'); r.setAttribute('x', region.x); r.setAttribute('y', region.y); r.setAttribute('width', region.w); r.setAttribute('height', region.h); r.setAttribute('fill', bg); root.insertBefore(r, root.querySelector('defs') ? root.querySelector('defs').nextSibling : root.firstChild); }
        return new XMLSerializer().serializeToString(doc);
    }
    function optimize(text) {
        return text.replace(/(\d+\.\d{3,})/g, (m) => String(round(parseFloat(m), 2))).replace(/\s{2,}/g, ' ').replace(/>\s+</g, '><').replace(/ (opacity|stroke-opacity|fill-opacity)="1"/g, '').replace(/ transform="translate\(0, ?0\) scale\(1\)"/g, '');
    }
    function pngBlob(text, w, h) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => (b ? resolve(b) : reject(new Error('The picture could not be made'))), 'image/png'); };
            img.onerror = () => reject(new Error('The browser could not draw this drawing as a picture'));
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
        });
    }
    function printPdf(text, w, h) {
        const win = window.open('', '_blank');
        if (!win) return toast('Your browser blocked the pop-up. Allow pop-ups for this page, then try again.');
        win.document.write('<!doctype html><title>Inkpath PDF</title><style>@page{size:' + w + 'px ' + h + 'px;margin:0}html,body{margin:0}svg{display:block}</style>' + text.replace(/<\?xml[^>]*\?>/, ''));
        win.document.close(); setTimeout(() => { try { win.focus(); win.print(); } catch (e) { /* the user can print by hand */ } }, 400);
        toast('Choose "Save as PDF" in the print window');
    }
    P.exportNow = async function () {
        try {
            const scale = num(st.exportScale, 1), bg = st.exportBg === 'transparent' ? null : (st.exportBg === 'white' ? '#ffffff' : st.exportBgColor);
            const jobs = [];
            if (st.exportScope === 'selection') { const objs = selObjs(); if (!objs.length) return toast('Select something to export'); const b = unionBox(objs), pad = 4; jobs.push({ name: 'selection', region: { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }, only: objs.map(clone) }); }
            else if (st.exportScope === 'artboard') { const a = st.artboards[st.activeArtboard]; if (!a) return toast('Add an artboard first (Pages tab)'); jobs.push({ name: a.name, region: { x: a.x, y: a.y, w: a.w, h: a.h } }); }
            else if (st.exportScope === 'artboards') { if (!st.artboards.length) return toast('Add an artboard first (Pages tab)'); st.artboards.forEach((a) => jobs.push({ name: a.name, region: { x: a.x, y: a.y, w: a.w, h: a.h } })); }
            else jobs.push({ name: 'drawing', region: { x: 0, y: 0, w: CANVAS_BOUNDS.width, h: CANVAS_BOUNDS.height } });
            for (const j of jobs) {
                const text0 = svgFor(j.region, j.only, scale, bg), safe = String(j.name || 'drawing').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'drawing';
                if (st.exportFormat === 'png') downloadFile(await pngBlob(text0, j.region.w * scale, j.region.h * scale), safe + (scale !== 1 ? '@' + scale + 'x' : '') + '.png');
                else if (st.exportFormat === 'svg') downloadFile(new Blob([text0], { type: 'image/svg+xml' }), safe + '.svg');
                else if (st.exportFormat === 'svgmin') downloadFile(new Blob([optimize(text0)], { type: 'image/svg+xml' }), safe + '.min.svg');
                else if (st.exportFormat === 'pdf') printPdf(text0, Math.round(j.region.w), Math.round(j.region.h));
            }
            toast('Exported ' + jobs.length + ' file' + (jobs.length > 1 ? 's' : ''));
        } catch (e) { console.error(e); toast('Export failed: ' + e.message); }
    };
    P.svgFor = svgFor; P.optimize = optimize;

    /* ================= layers panel ================= */
    let lastLayerClick = { i: -1, t: 0 };
    function startRename(i) {
        const o = objects[i], row = document.querySelector('.pro-layer-row[data-i="' + i + '"]'), nm = row && row.querySelector('.layer-name'); if (!o || !nm) return;
        const inp = el('input', 'pro-rename'); inp.value = o.name || nm.textContent.replace(/^"|"$/g, ''); nm.replaceWith(inp); inp.focus(); inp.select();
        let finished = false;
        const done = (ok) => { if (finished) return; finished = true; if (ok && inp.value.trim()) { history(); o.name = inp.value.trim(); } redraw(); };
        inp.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false); }; inp.onblur = () => done(true); inp.onclick = (ev) => ev.stopPropagation(); inp.ondblclick = (ev) => ev.stopPropagation();
    }
    function renderLayerListPro() {
        const list = document.getElementById('layer-list'); if (!list) return;
        list.innerHTML = '';
        if (!objects.length) { const d = el('div', 'layer-empty', 'No layers yet. Draw something!'); list.appendChild(d); return; }
        let dragFrom = -1;
        for (let i = objects.length - 1; i >= 0; i--) {
            const o = objects[i];
            const row = el('div', 'layer-row pro-layer-row' + (selectedIndices.includes(i) ? ' selected' : '') + (o.hidden ? ' is-hidden' : '') + (o.locked ? ' is-locked' : ''));
            row.draggable = true;
            const eye = el('button', 'layer-mini pro-lbtn', IC(o.hidden ? 'eyeOff' : 'eye', 14)); eye.title = o.hidden ? 'Show' : 'Hide'; eye.onclick = (e) => { e.stopPropagation(); history(); o.hidden = !o.hidden; if (o.hidden) selectedIndices = selectedIndices.filter((x) => x !== i); redraw(); };
            const lock = el('button', 'layer-mini pro-lbtn', IC(o.locked ? 'lock' : 'unlock', 14)); lock.title = o.locked ? 'Unlock' : 'Lock'; lock.onclick = (e) => { e.stopPropagation(); history(); o.locked = !o.locked; redraw(); };
            const sw = el('span', 'layer-swatch'); sw.style.background = layerSwatchFor(o);
            row.dataset.i = i;
            const nm = el('span', 'layer-name'); nm.textContent = layerNameFor(o, i); nm.title = 'Double-click to rename';
            nm.ondblclick = (e) => { e.stopPropagation(); startRename(i); };
            const up = el('button', 'layer-mini', '↑'); up.title = 'Move up'; up.onclick = (e) => { e.stopPropagation(); moveLayerByIndex(i, 'up'); };
            const down = el('button', 'layer-mini', '↓'); down.title = 'Move down'; down.onclick = (e) => { e.stopPropagation(); moveLayerByIndex(i, 'down'); };
            const del = el('button', 'layer-mini', '✕'); del.title = 'Delete'; del.onclick = (e) => { e.stopPropagation(); deleteObjectByIndex(i); };
            row.onclick = (e) => {
                // a second click on the name soon after the first is a double-click (the list is rebuilt after the first click, so the browser may not see one)
                const now = Date.now();
                if (e.target.classList && e.target.classList.contains('layer-name') && lastLayerClick.i === i && now - lastLayerClick.t < 500) { lastLayerClick = { i: -1, t: 0 }; startRename(i); return; }
                lastLayerClick = { i, t: now };
                if (o.locked && !e.shiftKey) { selectedIndices = [i]; }
                else if (e.shiftKey || e.metaKey || e.ctrlKey) { if (selectedIndices.includes(i)) selectedIndices = selectedIndices.filter((x) => x !== i); else selectedIndices.push(i); } else selectedIndices = [i];
                redraw();
            };
            row.addEventListener('dragstart', (e) => { dragFrom = i; row.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* ignore */ } });
            row.addEventListener('dragend', () => { dragFrom = -1; row.classList.remove('dragging'); list.querySelectorAll('.drop-above,.drop-below').forEach((n) => n.classList.remove('drop-above', 'drop-below')); });
            row.addEventListener('dragover', (e) => { if (dragFrom < 0) return; e.preventDefault(); const r = row.getBoundingClientRect(), above = e.clientY < r.top + r.height / 2; row.classList.toggle('drop-above', above); row.classList.toggle('drop-below', !above); });
            row.addEventListener('dragleave', () => row.classList.remove('drop-above', 'drop-below'));
            row.addEventListener('drop', (e) => {
                e.preventDefault(); if (dragFrom < 0 || dragFrom === i) return;
                const r = row.getBoundingClientRect(), above = e.clientY < r.top + r.height / 2;   // the top of the list is the front
                history(); const item = objects.splice(dragFrom, 1)[0]; let to = i; if (dragFrom < i) to = i - 1; if (above) to += 1;
                to = Math.max(0, Math.min(objects.length, to)); objects.splice(to, 0, item); selectedIndices = [to]; dragFrom = -1; redraw();
            });
            row.appendChild(eye); row.appendChild(lock); row.appendChild(sw); row.appendChild(nm); row.appendChild(up); row.appendChild(down); row.appendChild(del);
            list.appendChild(row);
        }
    }

    /* ================= the Pro panel ================= */
    let win;
    const tabs = [['arrange', 'Arrange'], ['view', 'View'], ['path', 'Path'], ['pages', 'Pages']];
    function field(label, id, value, opts) {
        opts = opts || {};
        return '<label class="pro-f"><span>' + label + '</span><input id="' + id + '" type="number" step="' + (opts.step || 1) + '" value="' + value + '"' + (opts.min !== undefined ? ' min="' + opts.min + '"' : '') + '></label>';
    }
    const btn = (id, icon, label, tip) => '<button type="button" class="pro-b" id="' + id + '" title="' + (tip || label) + '">' + IC(icon, 16) + (label ? '<span>' + label + '</span>' : '') + '</button>';
    const check = (id, label, on) => '<label class="pro-c"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span>' + label + '</span></label>';
    const selectBox = (id, items, cur) => '<select id="' + id + '" class="pro-s">' + items.map((it) => '<option value="' + it[0] + '"' + (it[0] == cur ? ' selected' : '') + '>' + it[1] + '</option>').join('') + '</select>';

    function buildWindow() {
        win = el('div', 'fx-window pro-window'); win.id = 'pro-window'; win.style.display = 'none';
        win.innerHTML = '<div class="fx-head pro-head" id="pro-head"><span class="fx-title">Pro</span><div class="pro-tabs" id="pro-tabs">' + tabs.map((t) => '<button type="button" class="pro-tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') +
            '</div><button type="button" class="fx-close pro-x" id="pro-close" title="Close">✕</button></div><div class="pro-body" id="pro-body"></div>';
        document.body.appendChild(win);
        $('#pro-close', win).onclick = () => P.toggle(false);
        win.querySelectorAll('.pro-tab').forEach((b) => { b.onclick = () => { st.tab = b.dataset.tab; buildBody(); }; });
        // drag by the head
        const head = $('#pro-head', win); let drag = null;
        head.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop }; try { head.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
        head.addEventListener('pointermove', (e) => { if (!drag) return; win.style.left = Math.max(0, e.clientX - drag.x) + 'px'; win.style.top = Math.max(0, e.clientY - drag.y) + 'px'; win.style.right = 'auto'; });
        head.addEventListener('pointerup', () => { drag = null; });
        buildBody();
    }
    function buildBody() {
        const body = $('#pro-body', win); if (!body) return;
        win.querySelectorAll('.pro-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab));
        const objs = selObjs(), b = objs.length ? unionBox(objs) : { x: 0, y: 0, w: 0, h: 0 }, one = objs.length === 1 ? objs[0] : null;
        let h = '';
        if (st.tab === 'arrange') {
            h += '<div class="pro-sec"><div class="pro-cap">Position and size</div><div class="pro-grid2">' + field('X', 'pro-x', round(b.x, 1)) + field('Y', 'pro-y', round(b.y, 1)) + field('W', 'pro-w', round(b.w, 1)) + field('H', 'pro-h', round(b.h, 1)) + '</div>' +
                '<div class="pro-row">' + field('Turn °', 'pro-rot', one ? round(parseFloat(one.rotation) || 0, 1) : 0) + check('pro-ratio', 'Keep shape (lock ratio)', st.lockRatio) + '</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Align to ' + selectBox('pro-alignto', [['selection', 'the selection'], ['artboard', 'the artboard'], ['canvas', 'the canvas']], st.alignTo) + '</div><div class="pro-btns">' +
                btn('pro-al-left', 'alignLeftEdge', '', 'Align left edges') + btn('pro-al-center', 'alignCenterH', '', 'Align centers (sideways)') + btn('pro-al-right', 'alignRightEdge', '', 'Align right edges') + btn('pro-al-top', 'alignTopEdge', '', 'Align tops') + btn('pro-al-middle', 'alignMiddleV', '', 'Align middles (up and down)') + btn('pro-al-bottom', 'alignBottomEdge', '', 'Align bottoms') + '</div>' +
                '<div class="pro-btns">' + btn('pro-dist-h', 'distributeH', 'Space across', 'Even gaps from left to right (3 or more shapes)') + btn('pro-dist-v', 'distributeV', 'Space down', 'Even gaps from top to bottom (3 or more shapes)') + btn('pro-flip-h', 'flipHorizontal', 'Flip', 'Mirror left to right') + btn('pro-flip-v', 'flipVertical', 'Flip', 'Mirror top to bottom') + '</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Clipboard and layers</div><div class="pro-btns">' + btn('pro-copy', 'copy', 'Copy', 'Copy (' + mod() + 'C)') + btn('pro-cut', 'cut', 'Cut', 'Cut (' + mod() + 'X)') + btn('pro-paste', 'paste', 'Paste', 'Paste (' + mod() + 'V), Paste in place (' + mod() + 'Shift V)') + btn('pro-hide', 'eyeOff', 'Hide', 'Hide or show the selection') + btn('pro-lock', 'lock', 'Lock', 'Lock or unlock the selection') + '</div></div>';
        } else if (st.tab === 'view') {
            h += '<div class="pro-sec"><div class="pro-cap">Rulers and guides</div>' + check('pro-rulers', 'Show rulers', st.rulers) + check('pro-showguides', 'Show guides', st.showGuides) + check('pro-snapguides', 'Snap to guides', st.snapGuides) +
                '<div class="pro-row">' + selectBox('pro-gaxis', [['x', 'Vertical guide at'], ['y', 'Horizontal guide at']], 'x') + '<input id="pro-gpos" type="number" class="pro-n" value="0"><button type="button" class="pro-b" id="pro-gadd">Add</button></div>' +
                '<div class="pro-hint">Drag from a ruler to make a guide. Drag a guide to move it, double-click to remove it.</div><div class="pro-btns">' + btn('pro-gclear', 'trash', 'Clear all guides') + '</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Grid and snapping</div>' + check('pro-grid', 'Show grid', st.grid) + check('pro-snapgrid', 'Snap to grid', st.snapGrid) + check('pro-snapobj', 'Smart guides (snap to other shapes)', st.snapObjects) +
                '<div class="pro-row">' + field('Grid size', 'pro-gridsize', st.gridSize, { min: 2 }) + '</div><div class="pro-hint">Hold ' + mod() + ' while dragging to move without snapping.</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Zoom</div><div class="pro-btns">' + btn('pro-fit', 'maximize', 'Fit everything', 'Zoom to fit the selection, or the whole drawing') + btn('pro-100', 'resize', '100%') + '</div></div>';
        } else if (st.tab === 'path') {
            h += '<div class="pro-sec"><div class="pro-cap">Simplify</div><div class="pro-row">' + field('Tolerance (px)', 'pro-tol', st.simplifyTol, { step: 0.5, min: 0.2 }) + btn('pro-simplify', 'sparkles', 'Simplify', 'Fewer nodes, almost the same shape') + '</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Nodes</div><div class="pro-btns">' + btn('pro-smooth', 'curve', 'Smooth all', 'Make every node smooth') + btn('pro-sharp', 'lineTool', 'Sharp all', 'Remove all handles') + btn('pro-addnodes', 'anchorPlus', 'Add nodes', 'A node in the middle of every segment') + btn('pro-reverse', 'swapHorizontal', 'Reverse') + '</div>' +
                '<div class="pro-btns">' + btn('pro-join', 'nodePath', 'Join paths', 'Join two selected open paths') + btn('pro-close2', 'check', 'Close path') + btn('pro-open2', 'close', 'Open path') + '</div><div class="pro-hint">In Edit Nodes mode, double-click a line to add a node; double-click a node to remove it.</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Cut and text</div><div class="pro-btns">' + btn('pro-knife', 'knife', 'Knife', 'Drag a line across shapes to cut them in two') + btn('pro-textpath', 'pencil', 'Text on path', 'Select one text and one path') + btn('pro-textoff', 'close', 'Release text') + '</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Outline and offset</div><div class="pro-btns">' + btn('pro-outline', 'strokeStyle', 'Outline stroke', 'Turn the stroke into a filled shape') + '</div><div class="pro-row">' + field('Distance', 'pro-offd', st.offsetDist, { step: 1 }) + selectBox('pro-offj', [['miter', 'Sharp corners'], ['round', 'Round corners']], st.offsetJoin) + btn('pro-offset', 'pathUnite', 'Offset', 'A copy of a closed shape, bigger (plus) or smaller (minus)') + '</div></div>';
        } else {
            const ab = st.artboards[st.activeArtboard];
            h += '<div class="pro-sec"><div class="pro-cap">Canvas</div><div class="pro-row">' + field('W', 'pro-cw', CANVAS_BOUNDS.width, { min: 100 }) + field('H', 'pro-ch', CANVAS_BOUNDS.height, { min: 100 }) + btn('pro-csize', 'check', 'Set') + '</div></div>' +
                '<div class="pro-sec"><div class="pro-cap">Artboards</div><div class="pro-list">' + (st.artboards.length ? st.artboards.map((a, i) => '<button type="button" class="pro-art' + (i === st.activeArtboard ? ' on' : '') + '" data-i="' + i + '">' + (a.name || 'Artboard') + ' <em>' + a.w + ' x ' + a.h + '</em></button>').join('') : '<div class="pro-hint">No artboards yet. An artboard marks the part of the canvas you export.</div>') + '</div>' +
                '<div class="pro-row">' + selectBox('pro-preset', Object.keys(PRESETS).map((k) => [k, k]), 'HD 1920 x 1080') + btn('pro-addart', 'plus', 'Add', 'Add an artboard of that size') + '</div><div class="pro-btns">' + btn('pro-artsel', 'crop', 'Fit to selection') + btn('pro-artdel', 'trash', 'Delete') + '</div>' +
                (ab ? '<div class="pro-row"><label class="pro-f"><span>Name</span><input id="pro-aname" type="text" value="' + String(ab.name).replace(/"/g, '&quot;') + '"></label></div><div class="pro-grid2">' + field('X', 'pro-ax', ab.x) + field('Y', 'pro-ay', ab.y) + field('W', 'pro-aw', ab.w, { min: 1 }) + field('H', 'pro-ah', ab.h, { min: 1 }) + '</div>' : '') + '</div>' +
                '<div class="pro-sec"><div class="pro-cap">Export</div><div class="pro-row">' + selectBox('pro-escope', [['canvas', 'Whole canvas'], ['selection', 'Selection'], ['artboard', 'Active artboard'], ['artboards', 'Every artboard']], st.exportScope) + selectBox('pro-efmt', [['png', 'PNG'], ['svg', 'SVG'], ['svgmin', 'SVG (smaller)'], ['pdf', 'PDF (print)']], st.exportFormat) + '</div>' +
                '<div class="pro-row">' + selectBox('pro-escale', [['1', '1x'], ['2', '2x'], ['3', '3x'], ['4', '4x']], String(st.exportScale)) + selectBox('pro-ebg', [['transparent', 'Clear background'], ['white', 'White'], ['color', 'Color']], st.exportBg) + '<input id="pro-ebgc" type="text" class="pro-n" value="' + st.exportBgColor + '" title="Background color"></div>' +
                '<div class="pro-btns">' + btn('pro-export', 'export', 'Export', 'Make the file') + '</div></div>';
        }
        body.innerHTML = h; wireBody(body);
    }
    function mod() { return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'; }
    function wireBody(body) {
        const on = (id, ev, fn) => { const n = $('#' + id, body); if (n) n.addEventListener(ev, fn); };
        const click = (id, fn) => on(id, 'click', fn);
        const stop = (e) => e.stopPropagation();
        body.querySelectorAll('input[type=number],input[type=text]').forEach((n) => n.addEventListener('keydown', (e) => { stop(e); if (e.key === 'Enter') n.blur(); }));
        ['x', 'y', 'w', 'h'].forEach((f) => on('pro-' + f, 'change', (e) => P.setBox(f, e.target.value)));
        on('pro-rot', 'change', (e) => P.setBox('rotation', e.target.value));
        on('pro-ratio', 'change', (e) => { st.lockRatio = e.target.checked; });
        on('pro-alignto', 'change', (e) => { st.alignTo = e.target.value; });
        ['left', 'center', 'right', 'top', 'middle', 'bottom'].forEach((k) => click('pro-al-' + k, () => P.align(k)));
        click('pro-dist-h', () => P.distribute('h')); click('pro-dist-v', () => P.distribute('v')); click('pro-flip-h', () => P.flip('h')); click('pro-flip-v', () => P.flip('v'));
        click('pro-copy', () => P.copy(false)); click('pro-cut', () => P.copy(true)); click('pro-paste', (e) => P.paste(e.shiftKey)); click('pro-hide', P.toggleHide); click('pro-lock', P.toggleLock);
        on('pro-rulers', 'change', (e) => { st.rulers = e.target.checked; refresh(); }); on('pro-showguides', 'change', (e) => { st.showGuides = e.target.checked; refresh(); }); on('pro-snapguides', 'change', (e) => { st.snapGuides = e.target.checked; });
        on('pro-grid', 'change', (e) => { st.grid = e.target.checked; refresh(); }); on('pro-snapgrid', 'change', (e) => { st.snapGrid = e.target.checked; if (st.snapGrid && !st.grid) { st.grid = true; refresh(); buildBody(); } }); on('pro-snapobj', 'change', (e) => { st.snapObjects = e.target.checked; });
        on('pro-gridsize', 'change', (e) => { st.gridSize = Math.max(2, num(e.target.value, 20)); refresh(); });
        click('pro-gadd', () => { const ax = $('#pro-gaxis', body).value, pos = num($('#pro-gpos', body).value, 0); st.guides.push({ axis: ax, pos }); st.showGuides = true; refresh(); });
        click('pro-gclear', () => { st.guides = []; refresh(); });
        click('pro-fit', P.zoomFit); click('pro-100', P.zoom100);
        on('pro-tol', 'change', (e) => { st.simplifyTol = Math.max(0.2, num(e.target.value, 2)); });
        click('pro-simplify', P.simplify); click('pro-smooth', P.smooth); click('pro-sharp', P.sharp); click('pro-addnodes', P.addNodes); click('pro-reverse', P.reverse); click('pro-join', P.join); click('pro-close2', P.closePath); click('pro-open2', P.openPath); click('pro-outline', P.outlineStroke); click('pro-knife', P.startKnife); click('pro-textpath', P.textOnPath); click('pro-textoff', P.textOffPath);
        on('pro-offd', 'change', (e) => { st.offsetDist = num(e.target.value, 8); }); on('pro-offj', 'change', (e) => { st.offsetJoin = e.target.value; }); click('pro-offset', P.offset);
        click('pro-csize', () => P.setCanvas($('#pro-cw', body).value, $('#pro-ch', body).value));
        body.querySelectorAll('.pro-art').forEach((b) => b.addEventListener('click', () => { st.activeArtboard = +b.dataset.i; refresh(); buildBody(); }));
        click('pro-addart', () => { const k = $('#pro-preset', body).value, p = PRESETS[k]; P.addArtboard(p[0], p[1], k.replace(/ \(.*\)| \d.*$/, '') + ' ' + (st.artboards.length + 1)); buildBody(); });
        click('pro-artsel', () => { P.artboardFromSelection(); buildBody(); }); click('pro-artdel', () => { P.deleteArtboard(); buildBody(); });
        [['ax', 'x'], ['ay', 'y'], ['aw', 'w'], ['ah', 'h']].forEach(([id, k]) => on('pro-' + id, 'change', (e) => { const a = st.artboards[st.activeArtboard]; if (a) { a[k] = Math.max(k === 'w' || k === 'h' ? 1 : -1e5, num(e.target.value)); refresh(); } }));
        on('pro-aname', 'change', (e) => { const a = st.artboards[st.activeArtboard]; if (a) { a.name = e.target.value || 'Artboard'; refresh(); buildBody(); } });
        on('pro-escope', 'change', (e) => { st.exportScope = e.target.value; }); on('pro-efmt', 'change', (e) => { st.exportFormat = e.target.value; }); on('pro-escale', 'change', (e) => { st.exportScale = num(e.target.value, 1); });
        on('pro-ebg', 'change', (e) => { st.exportBg = e.target.value; }); on('pro-ebgc', 'change', (e) => { st.exportBgColor = e.target.value || '#ffffff'; st.exportBg = 'color'; });
        click('pro-export', P.exportNow);
    }
    function syncPanel() {
        if (!win || win.style.display === 'none') return;
        // only the numbers that follow the selection are refreshed, so typing is never interrupted
        if (st.tab === 'arrange' && document.activeElement && !win.contains(document.activeElement)) buildBody();
        else if (st.tab === 'pages' || st.tab === 'path' || st.tab === 'view') { /* these do not depend on the selection */ }
    }
    function refresh() { try { drawGrid(); drawLayerContent(); drawRulers(); } catch (e) { console.error(e); } }
    P.refresh = refresh;
    P.toggle = function (force) {
        if (!win) buildWindow();
        const show = force === undefined ? win.style.display === 'none' : !!force;
        win.style.display = show ? '' : 'none'; if (show) buildBody();
        document.querySelectorAll('[data-pro-toggle]').forEach((b) => b.classList.toggle('active', show));
    };
    P.openTab = function (t) { st.tab = t; if (!win) buildWindow(); P.toggle(true); buildBody(); };

    /* ================= keyboard ================= */
    const TOOL_KEYS = { v: 'select', a: 'node', p: 'bezier', t: 'text', r: 'rect', o: 'ellipse', c: 'circle', l: 'line', g: 'polygon', e: 'eraser', i: 'eyedropper', z: 'zoom' };
    const SHORTCUTS = [
        ['Tools', [['V', 'Select'], ['A', 'Edit nodes'], ['P', 'Pen'], ['T', 'Text'], ['R', 'Rectangle'], ['O', 'Ellipse'], ['C', 'Circle'], ['L', 'Line'], ['G', 'Polygon or star'], ['E', 'Eraser'], ['I', 'Eyedropper'], ['Z', 'Zoom']]],
        ['Edit', [['⌘ Z / ⇧⌘ Z', 'Undo and redo'], ['⌘ C / ⌘ X / ⌘ V', 'Copy, cut, paste'], ['⇧⌘ V', 'Paste in place'], ['⌘ D', 'Duplicate'], ['⌘ A', 'Select all'], ['Delete', 'Delete'], ['Arrows', 'Nudge 1 px (Shift: 10 px)'], ['Esc', 'Close menus']]],
        ['Arrange', [['⌘ ]  /  ⌘ [', 'Forward and backward'], ['⇧⌘ ]  /  ⇧⌘ [', 'To front and to back'], ['⇧⌘ H', 'Hide the selection'], ['⇧⌘ L', 'Lock the selection'], ['⌥⌘ H', 'Show everything']]],
        ['View', [['⌘ \'', 'Show or hide the grid'], ['⇧⌘ R', 'Show or hide the rulers'], ['⇧⌘ 9', 'Fit everything on screen'], ['⇧⌘ 1', 'Zoom to 100%'], ['Hold ⌘', 'Move without snapping']]],
        ['Boolean and path', [['⌘ +', 'Union'], ['⌘ −', 'Subtract'], ['⇧⌘ I / X', 'Intersect, exclude'], ['⇧⌘ M / C', 'Clip, mask'], ['⇧⌘ P', 'Convert to path'], ['⇧⌘ O', 'Outline stroke'], ['⇧⌘ S', 'Simplify path'], ['⇧⌘ J', 'Join two paths'], ['⇧⌘ K', 'Knife']]],
        ['Pro panel', [['⌥ P', 'Open or close the Pro tools'], ['?', 'This list']]],
    ];
    function showShortcuts() {
        let o = $('#pro-keys'); if (o) { o.remove(); return; }
        o = el('div'); o.id = 'pro-keys';
        const m = /Mac|iPhone|iPad/.test(navigator.platform), fix = (s) => (m ? s : s.replace(/⇧⌘ ?/g, 'Ctrl+Shift+').replace(/⌥⌘ ?/g, 'Ctrl+Alt+').replace(/⌘ ?/g, 'Ctrl+').replace(/⌥ ?/g, 'Alt+'));
        o.innerHTML = '<div class="pro-keys-box"><div class="pro-keys-h"><b>Keyboard shortcuts</b><button type="button" id="pro-keys-x">✕</button></div><div class="pro-keys-grid">' +
            SHORTCUTS.map((s) => '<div><h4>' + s[0] + '</h4>' + s[1].map((r) => '<p><kbd>' + fix(r[0]) + '</kbd><span>' + r[1] + '</span></p>').join('') + '</div>').join('') + '</div></div>';
        document.body.appendChild(o); o.addEventListener('click', (e) => { if (e.target === o || e.target.id === 'pro-keys-x') o.remove(); });
    }
    P.shortcuts = showShortcuts;
    function installKeys() {
        document.addEventListener('keydown', (e) => {
            const t = e.target, tag = t && t.tagName, typing = tag === 'TEXTAREA' || (t && t.isContentEditable) || tag === 'SELECT' || (tag === 'INPUT' && /^(text|number|search|password|url|email|tel)$/.test(String(t.type || '').toLowerCase()));
            if (typing) return;
            const meta = e.metaKey || e.ctrlKey, k = (e.key || '').toLowerCase(), code = e.code;
            if (e.key === '?' || (e.code === 'Slash' && e.shiftKey && !meta) || (e.key === '/' && meta)) { e.preventDefault(); showShortcuts(); return; }
            if (e.key === 'Escape') { const o = $('#pro-keys'); if (o) o.remove(); return; }
            if (e.altKey && !meta && code === 'KeyP') { e.preventDefault(); P.toggle(); return; }
            if (meta && !e.shiftKey && !e.altKey) {
                if (k === 'c') { e.preventDefault(); P.copy(false); return; }
                if (k === 'x') { e.preventDefault(); P.copy(true); return; }
                if (k === 'v') { e.preventDefault(); P.paste(false); return; }
                if (k === 'a') { e.preventDefault(); P.selectAll(); return; }
                if (k === '\'') { e.preventDefault(); st.grid = !st.grid; refresh(); return; }
                if (code === 'BracketRight') { e.preventDefault(); moveLayer('up'); return; }
                if (code === 'BracketLeft') { e.preventDefault(); moveLayer('down'); return; }
            }
            if (meta && e.shiftKey) {
                if (k === 'v') { e.preventDefault(); P.paste(true); return; }
                if (code === 'BracketRight') { e.preventDefault(); moveLayer('top'); return; }
                if (code === 'BracketLeft') { e.preventDefault(); moveLayer('bottom'); return; }
                if (k === 'h') { e.preventDefault(); P.toggleHide(); return; }
                if (k === 'l') { e.preventDefault(); P.toggleLock(); return; }
                if (k === 'r') { e.preventDefault(); st.rulers = !st.rulers; refresh(); return; }
                if (k === 'o') { e.preventDefault(); P.outlineStroke(); return; }
                if (k === 's') { e.preventDefault(); P.simplify(); return; }
                if (k === 'j') { e.preventDefault(); P.join(); return; }
                if (k === 'k') { e.preventDefault(); P.startKnife(); return; }
                if (code === 'Digit9' || k === '(') { e.preventDefault(); P.zoomFit(); return; }
                if (code === 'Digit1' || k === '!') { e.preventDefault(); P.zoom100(); return; }
            }
            if (meta && e.altKey && k === 'h') { e.preventDefault(); P.showAll(); return; }
            if (!meta && !e.altKey && !e.shiftKey && TOOL_KEYS[k] && document.getElementById('btn-' + TOOL_KEYS[k]) || (!meta && !e.altKey && !e.shiftKey && k === 'v')) {
                const tool = TOOL_KEYS[k]; if (tool && typeof setTool === 'function') { e.preventDefault(); setTool(tool); }
            }
        });
    }

    /* ================= start ================= */
    function addEntryPoints() {
        // classic layout: a button in the toolbar next to Filters; Nova: the dock calls inkpathPro.toggle()
        const wrap = $('#fx-btn') && $('#fx-btn').parentElement;
        if (wrap && !$('#pro-btn')) {
            const w = el('div', 'ops-wrap'); const b = el('button', 'action-btn', 'Pro ▾'); b.id = 'pro-btn'; b.setAttribute('data-pro-toggle', ''); b.title = 'Rulers, guides, align, path tools, artboards and export (Alt+P)';
            b.onclick = (e) => { e.stopPropagation(); P.toggle(); }; w.appendChild(b); wrap.parentElement.insertBefore(w, wrap.nextSibling);
            const k = el('button', 'action-btn', '?'); k.title = 'Keyboard shortcuts'; k.onclick = (e) => { e.stopPropagation(); showShortcuts(); }; w.appendChild(k);
        }
    }
    function init() {
        try {
            installHooks(); installKeys(); installNodeAdd(); ensureLayers(); ensureRulers(); addEntryPoints();
            setLayerTransform(); drawGrid(); drawLayerContent(); drawRulers(); renderLayerListPro();
            if (!document.getElementById('pro-window')) buildWindow();
            window.addEventListener('resize', () => setTimeout(drawRulers, 50));
            new ResizeObserver(() => drawRulers()).observe($('.canvas-frame') || document.body);
        } catch (e) { console.error('Inkpath Pro could not start', e); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
