/* =====================================================================
   Inkpath SVG import! Open an .svg and every shape becomes a REAL,
   editable Inkpath shape: rectangles, circles, ellipses and lines stay
   themselves (when nothing rotates or skews them), and paths, polygons,
   polylines and anything transformed become Bézier paths with every
   node and handle in place. Fills, strokes, opacity and gradients come
   along, shapes with holes (like an "O") become Exclude groups, <use>
   copies are expanded, and text stays text!
   The SVG is read inside a sandboxed frame with no scripts, so its own
   styles and scripts never touch Inkpath.
   ===================================================================== */
(function () {
    'use strict';
    if (typeof objects === 'undefined') return;
    const NS = 'http://www.w3.org/2000/svg';
    const XL = 'http://www.w3.org/1999/xlink';

    /* ---------- Matrices ---------- */
    const apply = (m, x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    const axisAligned = (m) => Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9;
    const scaleOf = (m) => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;

    /* ---------- Path data: every command becomes cubic segments ---------- */
    // A subpath is { x, y, segs: [[c1x, c1y, c2x, c2y, x, y], ...], closed }
    function parsePath(d) {
        const s = String(d || '');
        let i = 0;
        const skip = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
        const num = () => {
            skip();
            const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(s.slice(i));
            if (!m) return null;
            i += m[0].length;
            return parseFloat(m[0]);
        };
        const flag = () => { skip(); const c = s[i]; if (c === '0' || c === '1') { i++; return c === '1'; } return null; };
        const subs = [];
        let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = '', lc = null, lq = null;
        const line = (nx, ny) => { cur.segs.push([x, y, nx, ny, nx, ny]); x = nx; y = ny; };
        while (true) {
            skip();
            if (i >= s.length) break;
            if (/[a-zA-Z]/.test(s[i])) cmd = s[i++];
            else if (!cmd) break;
            const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
            const ox = rel ? x : 0, oy = rel ? y : 0;
            if (C === 'Z') {
                if (cur) { if (Math.hypot(x - sx, y - sy) > 1e-9) line(sx, sy); cur.closed = true; x = sx; y = sy; }
                cur = null; lc = lq = null; cmd = '';
                continue;
            }
            if (!cur && C !== 'M') { cur = { x: x, y: y, segs: [], closed: false }; subs.push(cur); sx = x; sy = y; }
            if (C === 'M') {
                const a = num(), b = num(); if (a === null || b === null) break;
                x = ox + a; y = oy + b; sx = x; sy = y;
                cur = { x: x, y: y, segs: [], closed: false }; subs.push(cur);
                cmd = rel ? 'l' : 'L'; lc = lq = null;
                continue;
            }
            if (C === 'L') { const a = num(), b = num(); if (a === null || b === null) break; line(ox + a, oy + b); lc = lq = null; }
            else if (C === 'H') { const a = num(); if (a === null) break; line((rel ? x : 0) + a, y); lc = lq = null; }
            else if (C === 'V') { const a = num(); if (a === null) break; line(x, (rel ? y : 0) + a); lc = lq = null; }
            else if (C === 'C' || C === 'S') {
                let c1x, c1y;
                if (C === 'C') { c1x = num(); c1y = num(); if (c1y === null) break; c1x += ox; c1y += oy; }
                else { c1x = lc ? 2 * x - lc[0] : x; c1y = lc ? 2 * y - lc[1] : y; }
                let c2x = num(), c2y = num(), ex = num(), ey = num(); if (ey === null) break;
                c2x += ox; c2y += oy; ex += ox; ey += oy;
                cur.segs.push([c1x, c1y, c2x, c2y, ex, ey]); lc = [c2x, c2y]; lq = null; x = ex; y = ey;
            } else if (C === 'Q' || C === 'T') {
                let qx, qy;
                if (C === 'Q') { qx = num(); qy = num(); if (qy === null) break; qx += ox; qy += oy; }
                else { qx = lq ? 2 * x - lq[0] : x; qy = lq ? 2 * y - lq[1] : y; }
                let ex = num(), ey = num(); if (ey === null) break;
                ex += ox; ey += oy;
                cur.segs.push([x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey]);
                lq = [qx, qy]; lc = null; x = ex; y = ey;
            } else if (C === 'A') {
                const rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag();
                let ex = num(), ey = num(); if (ey === null || large === null || sweep === null) break;
                ex += ox; ey += oy;
                arcTo(cur.segs, x, y, rx, ry, rot, large, sweep, ex, ey);
                x = ex; y = ey; lc = lq = null;
            } else break;
        }
        return subs.filter((p) => p.segs.length);
    }
    // An elliptical arc as cubics (each at most a quarter turn)
    function arcTo(out, x1, y1, rx, ry, rotDeg, large, sweep, x2, y2) {
        if (Math.hypot(x2 - x1, y2 - y1) < 1e-9) return;
        rx = Math.abs(rx); ry = Math.abs(ry);
        if (!rx || !ry) { out.push([x1, y1, x2, y2, x2, y2]); return; }
        const phi = rotDeg * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi);
        const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
        const px = cp * dx + sp * dy, py = -sp * dx + cp * dy;
        const lam = (px * px) / (rx * rx) + (py * py) / (ry * ry);
        if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        const num = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
        let k = Math.sqrt(Math.max(0, num / (rx * rx * py * py + ry * ry * px * px)));
        if (large === sweep) k = -k;
        const cxp = k * rx * py / ry, cyp = -k * ry * px / rx;
        const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
        const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
        const t1 = ang(1, 0, (px - cxp) / rx, (py - cyp) / ry);
        let dt = ang((px - cxp) / rx, (py - cyp) / ry, (-px - cxp) / rx, (-py - cyp) / ry);
        if (!sweep && dt > 0) dt -= 2 * Math.PI;
        if (sweep && dt < 0) dt += 2 * Math.PI;
        const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
        const step = dt / n, h = 4 / 3 * Math.tan(step / 4);
        const pt = (t) => ({ x: cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, y: cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp });
        const dv = (t) => ({ x: -rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, y: -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp });
        for (let j = 0; j < n; j++) {
            const a = t1 + j * step, b = a + step, p0 = pt(a), p1 = pt(b), d0 = dv(a), d1 = dv(b);
            out.push([p0.x + h * d0.x, p0.y + h * d0.y, p1.x - h * d1.x, p1.y - h * d1.y, j === n - 1 ? x2 : p1.x, j === n - 1 ? y2 : p1.y]);
        }
    }
    // A subpath (already in drawing coordinates) as Inkpath nodes
    function subToNodes(p) {
        const nodes = [{ x: p.x, y: p.y, cx1: p.x, cy1: p.y, cx2: p.segs[0][0], cy2: p.segs[0][1] }];
        p.segs.forEach((g, k) => {
            const nx = p.segs[k + 1];
            nodes.push({ x: g[4], y: g[5], cx1: g[2], cy1: g[3], cx2: nx ? nx[0] : g[4], cy2: nx ? nx[1] : g[5] });
        });
        if (p.closed) {
            // the closing node is a copy of the first one (Inkpath's closed loops), with the curve coming in kept
            const first = nodes[0], last = nodes[nodes.length - 1];
            first.cx1 = last.cx1; first.cy1 = last.cy1;
            last.cx2 = first.cx2; last.cy2 = first.cy2;
        }
        return nodes;
    }
    const mapSub = (p, m) => {
        const s = apply(m, p.x, p.y);
        return { x: s.x, y: s.y, closed: p.closed, segs: p.segs.map((g) => { const a = apply(m, g[0], g[1]), b = apply(m, g[2], g[3]), c = apply(m, g[4], g[5]); return [a.x, a.y, b.x, b.y, c.x, c.y]; }) };
    };

    /* ---------- Paint ---------- */
    function hex8(css, alphaMul) {
        const m = /rgba?\(([^)]+)\)/i.exec(String(css || ''));
        if (!m) return null;
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
        const a = (p.length > 3 ? p[3] : 1) * (alphaMul === undefined ? 1 : alphaMul);
        return rgbaToHex8(Math.round(p[0]), Math.round(p[1]), Math.round(p[2]), Math.max(0, Math.min(1, a)));
    }
    const frac = (v, dflt) => { if (v === null || v === '') return dflt; const n = parseFloat(v); return /%$/.test(String(v).trim()) ? n / 100 : n; };
    // A gradient, following href="#other" for stops and attributes
    function gradientOf(doc, id, win) {
        let g = doc.getElementById(id);
        if (!g || !/Gradient$/.test(g.localName)) return null;
        const chain = [];
        for (let k = 0; g && k < 8; k++) { chain.push(g); const h = g.getAttribute('href') || g.getAttributeNS(XL, 'href'); g = h && h[0] === '#' ? doc.getElementById(h.slice(1)) : null; }
        const attr = (n) => { for (const e of chain) if (e.hasAttribute(n)) return e.getAttribute(n); return null; };
        const holder = chain.find((e) => e.querySelector('stop'));
        const stops = holder ? Array.from(holder.querySelectorAll('stop')).map((st) => {
            const cs = win.getComputedStyle(st);
            return { o: Math.max(0, Math.min(1, frac(st.getAttribute('offset'), 0))), c: hex8(cs.stopColor, parseFloat(cs.stopOpacity)) || '#000000ff' };
        }) : [];
        return { kind: chain[0].localName === 'radialGradient' ? 'radial' : 'linear', stops: stops, x1: frac(attr('x1'), 0), y1: frac(attr('y1'), 0), x2: frac(attr('x2'), 1), y2: frac(attr('y2'), 0) };
    }
    // fill/stroke: { type, color, stops, angle, scale }
    function paintOf(value, opacity, doc, win) {
        const v = String(value || 'none').trim();
        if (v === 'none') return { type: 'none' };
        const u = /url\(\s*["']?#([^"')]+)["']?\s*\)/.exec(v);
        if (u) {
            const g = gradientOf(doc, u[1], win);
            if (g && g.stops.length >= 2) {
                const stops = g.stops.map((st) => ({ o: st.o, c: rgbaToHex8(...hexRgb(st.c), (parseInt(st.c.slice(7, 9), 16) / 255) * opacity) }));
                const dx = g.x2 - g.x1, dy = g.y2 - g.y1;
                return { type: g.kind, stops: stops, color: stops[0].c, color2: stops[stops.length - 1].c, angle: Math.round(Math.atan2(dy, dx) * 180 / Math.PI), scale: Math.round(Math.max(0.1, Math.hypot(dx, dy)) * 1000) / 1000 };
            }
            if (g && g.stops.length === 1) return { type: 'color', color: g.stops[0].c };
            // (a pattern or a missing gradient: its fallback color, or a gray)
            const fb = v.replace(/url\([^)]*\)/, '').trim();
            return { type: 'color', color: hex8(fb, opacity) || rgbaToHex8(136, 136, 136, opacity) };
        }
        const c = hex8(v, opacity);
        return c ? { type: 'color', color: c } : { type: 'none' };
    }
    const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    function styleOf(el, win, doc, m) {
        const cs = win.getComputedStyle(el);
        let op = 1;
        for (let e = el; e && e.nodeType === 1 && e.localName !== 'svg'; e = e.parentNode) op *= parseFloat(win.getComputedStyle(e).opacity) || 0;
        const f = paintOf(cs.fill, parseFloat(cs.fillOpacity), doc, win);
        const s = paintOf(cs.stroke, parseFloat(cs.strokeOpacity), doc, win);
        const sw = (parseFloat(cs.strokeWidth) || 0) * scaleOf(m);
        const out = { fillType: f.type, fill: f.color || '#000000ff', fill2: f.color2 || f.color || '#000000ff', fillAngle: f.angle || 0,
            strokeType: s.type === 'none' || !(sw > 0) ? 'none' : s.type, stroke: s.color || '#000000ff', stroke2: s.color2 || s.color || '#000000ff', strokeAngle: s.angle || 0,
            strokeWidth: Math.round(sw * 100) / 100, opacity: Math.round(op * 1000) / 1000, blur: 0, rotation: 0, rx: 0 };
        // line caps and joins, miter limit, dashes, fill rule, blend mode and paint order
        const sc = scaleOf(m);
        if (cs.strokeLinecap && cs.strokeLinecap !== 'butt') out.linecap = cs.strokeLinecap;
        if (cs.strokeLinejoin && cs.strokeLinejoin !== 'miter' && /^(round|bevel)$/.test(cs.strokeLinejoin)) out.linejoin = cs.strokeLinejoin;
        const ml = parseFloat(cs.strokeMiterlimit); if (ml && ml !== 4) out.miterlimit = ml;
        const da = String(cs.strokeDasharray || 'none');
        if (da !== 'none' && out.strokeType !== 'none') {
            const parts = da.split(/[\s,]+/).map((v) => parseFloat(v)).filter((v) => isFinite(v) && v >= 0);
            if (parts.length && parts.some((v) => v > 0)) { out.dashPreset = 'custom'; out.dashCustom = parts.map((v) => Math.round(v * sc * 100) / 100).join(' '); const off = parseFloat(cs.strokeDashoffset); if (off) out.dashOffset = Math.round(off * sc * 100) / 100; }
        }
        if (cs.fillRule === 'evenodd') out.fillRule = 'evenodd';
        if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') out.blend = cs.mixBlendMode;
        if (/^stroke/.test(cs.paintOrder || '')) out.paintOrder = 'stroke';
        if (f.stops) { out.fillStops = f.stops; if (f.scale !== 1) out.fillScale = f.scale; }
        if (s.stops) out.strokeStops = s.stops;
        return out;
    }

    /* ---------- Elements to shapes ---------- */
    const len = (el, n) => { const v = parseFloat(el.getAttribute(n)); return isFinite(v) ? v : 0; };
    function pathFromSubs(subs, st) {
        const paths = subs.map((p) => Object.assign({ type: 'path', pathMode: 'bezier', nodes: subToNodes(p) }, JSON.parse(JSON.stringify(st))));
        if (paths.length < 2) return paths;
        // several pieces: filled ones combine as Exclude (holes stay holes!); outlines stay separate paths
        if (st.fillType === 'none') return paths;
        let acc = { type: 'boolean', op: 'exclude', children: [paths[0], paths[1]], opacity: 1, rotation: 0, blur: 0 };
        for (let k = 2; k < paths.length; k++) acc = { type: 'boolean', op: 'exclude', children: [acc, paths[k]], opacity: 1, rotation: 0, blur: 0 };
        return [acc];
    }
    function rectD(x, y, w, h, rx, ry) {
        if (!(rx > 0 || ry > 0)) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
        rx = Math.min(rx || ry, w / 2); ry = Math.min(ry || rx, h / 2);
        return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    const ellipseD = (cx, cy, rx, ry) => `M${cx + rx} ${cy}A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}Z`;
    function shapesOf(el, m, st, win) {
        const t = el.localName;
        const asPath = (d) => pathFromSubs(parsePath(d).map((p) => mapSub(p, m)), st);
        if (t === 'path') return asPath(el.getAttribute('d'));
        if (t === 'rect') {
            const x = len(el, 'x'), y = len(el, 'y'), w = len(el, 'width'), h = len(el, 'height');
            if (!(w > 0 && h > 0)) return [];
            const rx = len(el, 'rx'), ry = len(el, 'ry');
            if (axisAligned(m)) {
                const p = apply(m, x, y), q = apply(m, x + w, y + h);
                return [Object.assign({}, st, { type: 'rect', x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), width: Math.abs(q.x - p.x), height: Math.abs(q.y - p.y), rx: (rx || ry) * Math.min(Math.abs(m.a), Math.abs(m.d)) })];
            }
            return asPath(rectD(x, y, w, h, rx, ry));
        }
        if (t === 'circle' || t === 'ellipse') {
            const cx = len(el, 'cx'), cy = len(el, 'cy');
            const rx = t === 'circle' ? len(el, 'r') : len(el, 'rx'), ry = t === 'circle' ? len(el, 'r') : len(el, 'ry');
            if (!(rx > 0 && ry > 0)) return [];
            if (axisAligned(m)) {
                const c = apply(m, cx, cy), ax = rx * Math.abs(m.a), ay = ry * Math.abs(m.d);
                if (Math.abs(ax - ay) < 1e-6) return [Object.assign({}, st, { type: 'circle', cx: c.x, cy: c.y, r: ax })];
                return [Object.assign({}, st, { type: 'ellipse', cx: c.x, cy: c.y, rx: ax, ry: ay })];
            }
            return asPath(ellipseD(cx, cy, rx, ry));
        }
        if (t === 'line') {
            const p = apply(m, len(el, 'x1'), len(el, 'y1')), q = apply(m, len(el, 'x2'), len(el, 'y2'));
            return [Object.assign({}, st, { type: 'line', x1: p.x, y1: p.y, x2: q.x, y2: q.y, fillType: 'none' })];
        }
        if (t === 'polyline' || t === 'polygon') {
            const n = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(parseFloat).filter(isFinite);
            if (n.length < 4) return [];
            let d = 'M' + n[0] + ' ' + n[1];
            for (let k = 2; k + 1 < n.length; k += 2) d += 'L' + n[k] + ' ' + n[k + 1];
            return asPath(d + (t === 'polygon' ? 'Z' : ''));
        }
        if (t === 'image') {
            const href = (el.getAttribute('href') || el.getAttributeNS(XL, 'href') || '').trim();
            const w = len(el, 'width'), h = len(el, 'height');
            if (!/^data:image\//i.test(href) || !(w > 0 && h > 0) || !axisAligned(m)) return [];
            const p = apply(m, len(el, 'x'), len(el, 'y')), q = apply(m, len(el, 'x') + w, len(el, 'y') + h);
            const par = (el.getAttribute('preserveAspectRatio') || 'xMidYMid meet').trim();
            return [{ type: 'image', x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), width: Math.abs(q.x - p.x), height: Math.abs(q.y - p.y), href: href, aspect: par === 'none' ? 'none' : par, opacity: st.opacity, rotation: 0, blur: 0 }];
        }
        if (t === 'text') {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) return [];
            const cs = win.getComputedStyle(el);
            const first = el.querySelector('tspan[x], tspan[y]');
            const x = parseFloat(el.getAttribute('x')) || (first ? parseFloat(first.getAttribute('x')) : 0) || 0;
            const y = parseFloat(el.getAttribute('y')) || (first ? parseFloat(first.getAttribute('y')) : 0) || 0;
            const p = apply(m, x, y);
            const anchor = cs.textAnchor === 'middle' ? 'middle' : cs.textAnchor === 'end' ? 'end' : 'start';
            return [Object.assign({}, st, { type: 'text', text: text, x: p.x, y: p.y, fontSize: Math.max(1, Math.round((parseFloat(cs.fontSize) || 16) * scaleOf(m))), fontFamily: cs.fontFamily || 'JetBrains Mono', fontWeight: cs.fontWeight || 'normal', textAlign: anchor, strokeType: st.strokeType === 'none' ? 'none' : st.strokeType })];
        }
        return [];
    }

    /* ---------- Reading the file ---------- */
    const SKIP_IN = 'defs, clipPath, mask, pattern, marker, symbol, linearGradient, radialGradient, filter, metadata, title, desc';
    const SHAPES = 'path, rect, circle, ellipse, line, polyline, polygon, text, image';
    function sanitize(root) {
        root.querySelectorAll('script, foreignObject, iframe, object, embed, audio, video, animate, animateTransform, animateMotion, set').forEach((e) => e.remove());
        [root].concat(Array.from(root.querySelectorAll('*'))).forEach((e) => {
            Array.from(e.attributes).forEach((a) => {
                if (/^on/i.test(a.name)) e.removeAttribute(a.name);
                else if (/href$/i.test(a.name) && !/^#/.test(a.value.trim()) && !(e.localName === 'image' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(a.value.trim()))) e.removeAttributeNode(a); // (only links inside the file; pictures stay when they are embedded)
            });
        });
        root.querySelectorAll('style').forEach((s) => { s.textContent = s.textContent.replace(/@import[^;]*;?/gi, '').replace(/url\(\s*["']?(?!#)[^)]*\)/gi, 'none'); });
    }
    // <use href="#a"> becomes a copy of #a, so its shapes are real shapes
    function expandUses(doc) {
        for (let round = 0; round < 6; round++) {
            const uses = Array.from(doc.querySelectorAll('use')).filter((u) => !u.closest('defs, symbol, clipPath, mask, pattern, marker'));
            if (!uses.length) return;
            uses.forEach((u) => {
                const h = (u.getAttribute('href') || u.getAttributeNS(XL, 'href') || '').trim();
                const ref = h[0] === '#' ? doc.getElementById(h.slice(1)) : null;
                const g = doc.createElementNS(NS, 'g');
                Array.from(u.attributes).forEach((a) => { if (!/^(x|y|width|height|href|xlink:href|id)$/.test(a.name)) g.setAttribute(a.name, a.value); });
                const tx = len(u, 'x'), ty = len(u, 'y');
                g.setAttribute('transform', (u.getAttribute('transform') || '') + (tx || ty ? ` translate(${tx} ${ty})` : ''));
                if (ref && !ref.contains(u)) {
                    if (ref.localName === 'symbol') Array.from(ref.childNodes).forEach((c) => g.appendChild(c.cloneNode(true)));
                    else { const c = ref.cloneNode(true); c.removeAttribute('id'); g.appendChild(c); }
                }
                u.replaceWith(g);
            });
        }
    }
    function svgToShapes(text) {
        const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
        const root0 = parsed.documentElement;
        if (!root0 || root0.localName !== 'svg' || parsed.querySelector('parsererror')) throw new Error('That file is not an SVG Inkpath can read!');
        // a sandboxed frame with no scripts: the SVG's styles stay inside it, and the browser works out every style and transform
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-same-origin');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:1200px;height:800px;border:0;opacity:0;pointer-events:none';
        document.body.appendChild(frame);
        try {
            const doc = frame.contentDocument, win = frame.contentWindow;
            doc.open(); doc.write('<!doctype html><html><head></head><body style="margin:0"></body></html>'); doc.close();
            const root = doc.importNode(root0, true);
            sanitize(root);
            // its own size in its own units: 1 SVG unit = 1 Inkpath unit
            const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(parseFloat);
            if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { root.setAttribute('width', vb[2]); root.setAttribute('height', vb[3]); }
            else { if (!parseFloat(root.getAttribute('width'))) root.setAttribute('width', 1200); if (!parseFloat(root.getAttribute('height'))) root.setAttribute('height', 800); }
            root.style.display = 'block';
            doc.body.appendChild(root);
            expandUses(doc);
            const base = root.getScreenCTM().inverse();
            const out = [];
            let skipped = 0;
            root.querySelectorAll(SHAPES).forEach((el) => {
                if (el.closest(SKIP_IN) || el.parentNode.closest('text')) return;
                for (let e = el; e && e !== root; e = e.parentNode) if (win.getComputedStyle(e).display === 'none') return;
                if (win.getComputedStyle(el).visibility === 'hidden') return;
                const sc = el.getScreenCTM();
                if (!sc) { skipped++; return; }
                const m = base.multiply(sc);
                const st = styleOf(el, win, doc, m);
                if (st.fillType === 'none' && st.strokeType === 'none' && el.localName !== 'text' && el.localName !== 'image') return;
                try {
                    const made = shapesOf(el, m, st, win);
                    // a <title> becomes the shape's name
                    const ti = Array.from(el.children).find((c) => c.localName === 'title');
                    if (ti && made.length === 1 && ti.textContent.trim()) made[0].name = ti.textContent.trim().slice(0, 80);
                    made.forEach((s) => out.push(s));
                } catch (e) { skipped++; }
            });
            return { shapes: out, skipped: skipped };
        } finally { frame.remove(); }
    }

    /* ---------- Into the drawing ---------- */
    function placeOnCanvas(shapes) {
        if (!shapes.length) return;
        const bb = unionBBox(shapes.map(shapeBBox));
        const W = CANVAS_BOUNDS.width, H = CANVAS_BOUNDS.height, room = 40;
        const s = Math.min(1, (W - room * 2) / Math.max(bb.w, 1), (H - room * 2) / Math.max(bb.h, 1));
        if (s < 1) shapes.forEach((o) => { scaleObjectAbout(o, s, bb.x, bb.y); if (o.strokeWidth) o.strokeWidth = Math.round(o.strokeWidth * s * 100) / 100; });
        const b2 = unionBBox(shapes.map(shapeBBox));
        // already on the canvas: it stays where the SVG put it; otherwise it moves to the middle
        if (b2.x < 0 || b2.y < 0 || b2.x + b2.w > W || b2.y + b2.h > H) {
            const dx = W / 2 - (b2.x + b2.w / 2), dy = H / 2 - (b2.y + b2.h / 2);
            shapes.forEach((o) => moveObject(o, dx, dy));
        }
    }
    window.inkpathImportSVGText = function (text) {
        const got = svgToShapes(text);
        if (!got.shapes.length) return got;
        placeOnCanvas(got.shapes);
        pushHistory(true);
        const at = objects.length;
        got.shapes.forEach((o) => objects.push(o));
        selectedIndices = got.shapes.map((_, k) => at + k);
        render();
        return got;
    };
    window.importSVG = function (evt) {
        const input = evt.target, file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const got = window.inkpathImportSVGText(String(reader.result || ''));
                if (!got.shapes.length) { playUISound('delete'); alert('That SVG has no shapes Inkpath can bring in!'); }
                else playUISound('snap');
            } catch (e) { playUISound('delete'); alert(e.message || 'That SVG could not be read!'); }
            input.value = '';
        };
        reader.readAsText(file);
    };
})();
