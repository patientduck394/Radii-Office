// Inkpath: turn text into real, editable paths!
// The browser draws the text exactly like you see it (any font, weight, italic, spacing), then we trace the
// outline of every letter and fit smooth curves to it. Letters with holes (like O and A) become an Exclude of
// their pieces, the same way imported SVG paths do.
(function () {
    'use strict';

    /* ---------- 1. draw the text big on a canvas ---------- */
    function rasterize(obj) {
        const fs = obj.fontSize || 28;
        const text = String(obj.text || '');
        const probe = document.createElement('canvas').getContext('2d');
        const fontSpec = (obj.fontStyle === 'italic' ? 'italic ' : '') + (obj.fontWeight || 'normal') + ' ' + fs + 'px ' + fontStack(obj.fontFamily);
        probe.font = fontSpec;
        const ls = obj.letterSpacing || 0;
        const hasLS = 'letterSpacing' in probe;
        const baseW = probe.measureText(text).width + (hasLS ? ls * text.length : ls * Math.max(0, text.length - 1));
        // scale so a letter is about 900 pixels tall, but never a giant canvas
        let k = Math.max(3, Math.min(40, 900 / fs));
        const padEm = fs * 0.6;
        while ((baseW + padEm * 2) * k > 9000 && k > 1) k *= 0.8;
        const W = Math.ceil((baseW + padEm * 2) * k), H = Math.ceil(fs * 2.2 * k);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.font = (obj.fontStyle === 'italic' ? 'italic ' : '') + (obj.fontWeight || 'normal') + ' ' + (fs * k) + 'px ' + fontStack(obj.fontFamily);
        g.fillStyle = '#000';
        g.textBaseline = 'alphabetic';
        const anchor = obj.textAlign === 'middle' ? 'center' : obj.textAlign === 'end' ? 'right' : 'left';
        // where the text's own point (x, y) sits on the canvas
        const ox = anchor === 'center' ? (baseW / 2 + padEm) * k : anchor === 'right' ? (baseW + padEm) * k : padEm * k;
        const oy = fs * 1.6 * k;
        g.textAlign = anchor;
        if (hasLS) {
            g.letterSpacing = (ls * k) + 'px';
            // the browser adds spacing after the last letter too, so centered and right text shifts a little, like SVG does
            g.fillText(text, ox, oy);
        } else if (ls) {
            // no letter-spacing support: draw one letter at a time
            let x = anchor === 'center' ? ox - (baseW * k) / 2 : anchor === 'right' ? ox - baseW * k : ox;
            g.textAlign = 'left';
            for (const ch of text) { g.fillText(ch, x, oy); x += g.measureText(ch).width + ls * k; }
        } else g.fillText(text, ox, oy);
        // underline and strikethrough, like the SVG draws them
        const lineW = baseW * k;
        const x0 = anchor === 'center' ? ox - lineW / 2 : anchor === 'right' ? ox - lineW : ox;
        if (obj.underline) g.fillRect(x0, oy + fs * 0.1 * k, lineW, Math.max(1, fs * 0.06 * k));
        if (obj.strike) g.fillRect(x0, oy - fs * 0.3 * k, lineW, Math.max(1, fs * 0.06 * k));
        const data = g.getImageData(0, 0, W, H).data;
        const a = new Float32Array(W * H);
        for (let i = 0, j = 3; i < a.length; i++, j += 4) a[i] = data[j] / 255;
        return { a, W, H, k, ox, oy };
    }

    /* ---------- 2. trace the outlines (marching squares with smooth edges) ---------- */
    function traceLoops(a, W, H) {
        const val = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : a[y * W + x];
        // edges: T = top of the cell, R = right, B = bottom, L = left; a key names a grid edge
        const key = (t, x, y) => t + x + ',' + y;
        const pointOf = (k) => {
            const t = k[0], [x, y] = k.slice(1).split(',').map(Number);
            if (t === 'h') { const v0 = val(x, y), v1 = val(x + 1, y); const f = (0.5 - v0) / ((v1 - v0) || 1e-6); return [x + Math.max(0, Math.min(1, f)), y]; }
            const v0 = val(x, y), v1 = val(x, y + 1); const f = (0.5 - v0) / ((v1 - v0) || 1e-6);
            return [x, y + Math.max(0, Math.min(1, f))];
        };
        const next = new Map(); // start edge key -> end edge key
        const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        for (let y = -1; y < H; y++) {
            for (let x = -1; x < W; x++) {
                const tl = val(x, y) >= 0.5, tr = val(x + 1, y) >= 0.5, br = val(x + 1, y + 1) >= 0.5, bl = val(x, y + 1) >= 0.5;
                const n = (tl ? 1 : 0) + (tr ? 1 : 0) + (br ? 1 : 0) + (bl ? 1 : 0);
                if (n === 0 || n === 4) continue;
                const E = { T: [key('h', x, y), x + 0.5, y], R: [key('v', x + 1, y), x + 1, y + 0.5], B: [key('h', x, y + 1), x + 0.5, y + 1], L: [key('v', x, y), x, y + 0.5] };
                const add = (e1, e2, cx, cy, cornerInside) => {
                    // keep the inside on the right-hand side of the direction of travel
                    const p = E[e1], q = E[e2];
                    const cr = cross(p[1], p[2], q[1], q[2], cx, cy);
                    const insideRight = cr > 0;
                    if (insideRight === cornerInside) next.set(p[0], q[0]); else next.set(q[0], p[0]);
                };
                const C = { tl: [x, y, tl], tr: [x + 1, y, tr], br: [x + 1, y + 1, br], bl: [x, y + 1, bl] };
                if ((tl && br && !tr && !bl) || (tr && bl && !tl && !br)) {
                    // a saddle: decide with the middle of the cell
                    const mid = (val(x, y) + val(x + 1, y) + val(x, y + 1) + val(x + 1, y + 1)) / 4 >= 0.5;
                    const around = { tl: ['T', 'L'], tr: ['T', 'R'], br: ['R', 'B'], bl: ['B', 'L'] };
                    ['tl', 'tr', 'br', 'bl'].forEach((c) => { if (C[c][2] === !mid) add(around[c][0], around[c][1], C[c][0], C[c][1], C[c][2]); });
                    continue;
                }
                // one or three corners differ: cut off the odd corner
                const odd = n === 1 ? ['tl', 'tr', 'br', 'bl'].find((c) => C[c][2]) : ['tl', 'tr', 'br', 'bl'].find((c) => !C[c][2]);
                const around = { tl: ['T', 'L'], tr: ['T', 'R'], br: ['R', 'B'], bl: ['B', 'L'] }[odd];
                if (n === 1 || n === 3) { add(around[0], around[1], C[odd][0], C[odd][1], C[odd][2]); continue; }
                // two corners differ: a straight cut
                const cut = tl && tr ? ['L', 'R'] : bl && br ? ['L', 'R'] : tl && bl ? ['T', 'B'] : ['T', 'B'];
                const ref = tl && tr ? C.tl : bl && br ? C.bl : tl && bl ? C.tl : C.tr;
                add(cut[0], cut[1], ref[0], ref[1], ref[2]);
            }
        }
        const loops = [];
        const seen = new Set();
        for (const start of next.keys()) {
            if (seen.has(start)) continue;
            const pts = [];
            let k = start, guard = 0;
            while (k && !seen.has(k) && guard++ < 4000000) { seen.add(k); pts.push(pointOf(k)); k = next.get(k); }
            if (pts.length > 8) loops.push(pts.map((p) => ({ x: p[0], y: p[1] })));
        }
        return loops;
    }

    /* ---------- 3. simplify and fit smooth curves (Schneider's algorithm) ---------- */
    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
    const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
    const dot = (a, b) => a.x * b.x + a.y * b.y;
    const len = (a) => Math.hypot(a.x, a.y);
    const unit = (a) => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };

    function rdp(pts, eps, closed) {
        if (pts.length < 4) return pts;
        const keep = new Uint8Array(pts.length);
        const run = (i, j) => {
            let max = 0, at = -1;
            const a = pts[i], b = pts[j], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9;
            for (let m = i + 1; m < j; m++) {
                let d;
                if (l2 < 1e-6) d = Math.hypot(pts[m].x - a.x, pts[m].y - a.y);
                else d = Math.abs((pts[m].x - a.x) * dy - (pts[m].y - a.y) * dx) / Math.sqrt(l2);
                if (d > max) { max = d; at = m; }
            }
            if (max > eps && at > 0) { keep[at] = 1; run(i, at); run(at, j); }
        };
        if (closed) {
            // split at the two farthest-apart points so both halves are open runs
            let far = 0, fd = -1;
            for (let m = 1; m < pts.length; m++) { const d = (pts[m].x - pts[0].x) ** 2 + (pts[m].y - pts[0].y) ** 2; if (d > fd) { fd = d; far = m; } }
            keep[0] = 1; keep[far] = 1;
            run(0, far);
            const tail = pts.slice(far).concat([pts[0]]);
            const kept2 = rdpOpen(tail, eps);
            const first = pts.filter((_, m) => keep[m]);
            return first.concat(kept2.slice(1, -1));
        }
        keep[0] = 1; keep[pts.length - 1] = 1;
        run(0, pts.length - 1);
        return pts.filter((_, m) => keep[m]);
    }
    function rdpOpen(pts, eps) { return rdp(pts, eps, false); }

    function bezAt(b, t) {
        const u = 1 - t;
        return {
            x: u * u * u * b[0].x + 3 * u * u * t * b[1].x + 3 * u * t * t * b[2].x + t * t * t * b[3].x,
            y: u * u * u * b[0].y + 3 * u * u * t * b[1].y + 3 * u * t * t * b[2].y + t * t * t * b[3].y,
        };
    }
    function bezDeriv(b, t, n) {
        // n = 1 or 2: first and second derivative
        const u = 1 - t;
        if (n === 1) return {
            x: 3 * u * u * (b[1].x - b[0].x) + 6 * u * t * (b[2].x - b[1].x) + 3 * t * t * (b[3].x - b[2].x),
            y: 3 * u * u * (b[1].y - b[0].y) + 6 * u * t * (b[2].y - b[1].y) + 3 * t * t * (b[3].y - b[2].y),
        };
        return {
            x: 6 * u * (b[2].x - 2 * b[1].x + b[0].x) + 6 * t * (b[3].x - 2 * b[2].x + b[1].x),
            y: 6 * u * (b[2].y - 2 * b[1].y + b[0].y) + 6 * t * (b[3].y - 2 * b[2].y + b[1].y),
        };
    }
    function chordParams(pts) {
        const u = [0];
        for (let i = 1; i < pts.length; i++) u.push(u[i - 1] + len(sub(pts[i], pts[i - 1])));
        const total = u[u.length - 1] || 1;
        return u.map((v) => v / total);
    }
    function generateBezier(pts, u, t1, t2) {
        const p0 = pts[0], p3 = pts[pts.length - 1];
        let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
        for (let i = 0; i < pts.length; i++) {
            const t = u[i], s = 1 - t;
            const b0 = s * s * s, b1 = 3 * t * s * s, b2 = 3 * t * t * s, b3 = t * t * t;
            const a1 = mul(t1, b1), a2 = mul(t2, b2);
            c00 += dot(a1, a1); c01 += dot(a1, a2); c11 += dot(a2, a2);
            const tmp = sub(pts[i], add(mul(p0, b0 + b1), mul(p3, b2 + b3)));
            x0 += dot(a1, tmp); x1 += dot(a2, tmp);
        }
        const det = c00 * c11 - c01 * c01;
        const seg = len(sub(p3, p0));
        let al = 0, ar = 0;
        if (Math.abs(det) > 1e-12) { al = (x0 * c11 - x1 * c01) / det; ar = (c00 * x1 - c01 * x0) / det; }
        const eps = 1e-6 * seg;
        if (al < eps || ar < eps) { al = ar = seg / 3; }
        return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, ar)), p3];
    }
    function reparam(b, pts, u) {
        return u.map((t, i) => {
            const d = sub(bezAt(b, t), pts[i]), d1 = bezDeriv(b, t, 1), d2 = bezDeriv(b, t, 2);
            const num = dot(d, d1), den = dot(d1, d1) + dot(d, d2);
            return Math.abs(den) < 1e-9 ? t : Math.max(0, Math.min(1, t - num / den));
        });
    }
    function maxError(b, pts, u) {
        let max = 0, at = Math.floor(pts.length / 2);
        for (let i = 1; i < pts.length - 1; i++) {
            const d = sub(bezAt(b, u[i]), pts[i]); const e = dot(d, d);
            if (e > max) { max = e; at = i; }
        }
        return { max, at };
    }
    function fitCubic(pts, t1, t2, err, out) {
        if (pts.length === 2) {
            const d = len(sub(pts[1], pts[0])) / 3;
            out.push([pts[0], add(pts[0], mul(t1, d)), add(pts[1], mul(t2, d)), pts[1]]);
            return;
        }
        let u = chordParams(pts);
        let b = generateBezier(pts, u, t1, t2);
        let { max, at } = maxError(b, pts, u);
        if (max < err) { out.push(b); return; }
        if (max < err * 16) {
            for (let it = 0; it < 6; it++) {
                u = reparam(b, pts, u);
                b = generateBezier(pts, u, t1, t2);
                ({ max, at } = maxError(b, pts, u));
                if (max < err) { out.push(b); return; }
            }
        }
        at = Math.max(1, Math.min(pts.length - 2, at));
        const tc = unit(sub(pts[at - 1], pts[at + 1]));
        fitCubic(pts.slice(0, at + 1), t1, tc, err, out);
        fitCubic(pts.slice(at), mul(tc, -1), t2, err, out);
    }
    function fitRun(pts, err, t1o, t2o) {
        const n = pts.length;
        const look = (i, dir) => { const j = Math.max(0, Math.min(n - 1, i + dir * Math.min(4, n - 1))); return unit(sub(pts[j], pts[i])); };
        const t1 = t1o || look(0, 1), t2 = t2o || mul(look(n - 1, -1), 1);
        const out = [];
        fitCubic(pts, t1, t2, err, out);
        return out;
    }

    // a closed outline -> a list of cubic segments (the loop closes itself)
    function fitLoop(loop, eps, err) {
        let pts = rdp(loop, eps, true);
        if (pts.length < 3) return null;
        const n = pts.length;
        // corners: the outline turns sharply
        const corner = new Array(n).fill(false);
        const CORNER = Math.cos((50 * Math.PI) / 180);
        for (let i = 0; i < n; i++) {
            const p = pts[(i + n - 1) % n], c = pts[i], q = pts[(i + 1) % n];
            const v1 = sub(c, p), v2 = sub(q, c);
            if (len(v1) < 1e-6 || len(v2) < 1e-6) continue;
            if (dot(unit(v1), unit(v2)) < CORNER) corner[i] = true;
        }
        const cornerIdx = corner.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
        const segs = [];
        const closedPts = (from, to) => { // points from index "from" around to index "to" (inclusive), wrapping
            const r = []; let i = from;
            for (let g = 0; g <= n; g++) { r.push(pts[i]); if (i === to && g > 0) break; i = (i + 1) % n; }
            return r;
        };
        if (!cornerIdx.length) {
            // smooth loop: one run starting and ending at point 0
            const run = closedPts(0, 0);
            const tStart = unit(sub(pts[1], pts[n - 1]));
            const out = fitRun(run, err, tStart, mul(tStart, -1));
            return out;
        }
        for (let c = 0; c < cornerIdx.length; c++) {
            const a = cornerIdx[c], b = cornerIdx[(c + 1) % cornerIdx.length];
            const run = closedPts(a, b);
            if (run.length < 2) continue;
            segs.push(...fitRun(run, err));
        }
        return segs;
    }

    function nodesFromSegs(segs) {
        const s0 = segs[0][0];
        const nodes = [{ x: s0.x, y: s0.y, cx1: s0.x, cy1: s0.y, cx2: segs[0][1].x, cy2: segs[0][1].y }];
        segs.forEach((g, k) => {
            const nx = segs[k + 1];
            nodes.push({ x: g[3].x, y: g[3].y, cx1: g[2].x, cy1: g[2].y, cx2: nx ? nx[1].x : g[3].x, cy2: nx ? nx[1].y : g[3].y });
        });
        // Inkpath closes a loop with a copy of the first node
        const first = nodes[0], last = nodes[nodes.length - 1];
        first.cx1 = last.cx1; first.cy1 = last.cy1;
        last.cx2 = first.cx2; last.cy2 = first.cy2;
        return nodes;
    }

    const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p.x * q.y - q.x * p.y; } return s / 2; };
    function inside(pt, poly) {
        let c = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i], b = poly[j];
            if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
        }
        return c;
    }

    /* ---------- 4. text object -> path objects ---------- */
    function textToPieces(obj) {
        const text = String(obj.text || '');
        if (!text.trim()) return [];
        const R = rasterize(obj);
        const loops = traceLoops(R.a, R.W, R.H);
        if (!loops.length) return [];
        const eps = 0.45 * Math.max(1, R.k / 8), err = 1.1 * Math.max(1, R.k / 8);
        const shapes = [];
        loops.forEach((l) => { const segs = fitLoop(l, eps, err * err); if (segs && segs.length) shapes.push({ raw: l, segs, area: area(l) }); });
        if (!shapes.length) return [];
        // outer outlines and holes have opposite directions
        const biggest = shapes.reduce((m, s) => (Math.abs(s.area) > Math.abs(m.area) ? s : m), shapes[0]);
        const outerSign = Math.sign(biggest.area) || 1;
        const outers = shapes.filter((s) => Math.sign(s.area) === outerSign).sort((a, b) => Math.abs(a.area) - Math.abs(b.area));
        const holes = shapes.filter((s) => Math.sign(s.area) !== outerSign);
        outers.forEach((o) => { o.holes = []; });
        holes.forEach((h) => {
            const probe = h.raw[0];
            const owner = outers.find((o) => Math.abs(o.area) > Math.abs(h.area) && inside(probe, o.raw));
            if (owner) owner.holes.push(h);
        });
        // back to the drawing's units, and bake in any rotation
        const cen = typeof getCenter === 'function' ? getCenter(obj) : { x: obj.x, y: obj.y };
        const rad = ((obj.rotation || 0) * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
        const place = (p) => {
            let x = (obj.x || 0) + (p.x - R.ox) / R.k, y = (obj.y || 0) + (p.y - R.oy) / R.k;
            if (rad) { const dx = x - cen.x, dy = y - cen.y; x = cen.x + dx * cs - dy * sn; y = cen.y + dx * sn + dy * cs; }
            return { x, y };
        };
        const keep = JSON.parse(JSON.stringify(obj));
        ['text', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'underline', 'strike', 'letterSpacing', 'textAlign', 'x', 'y', 'rotation'].forEach((k) => delete keep[k]);
        const pathOf = (s) => {
            const segs = s.segs.map((b) => b.map(place));
            return Object.assign({}, JSON.parse(JSON.stringify(keep)), { type: 'path', pathMode: 'bezier', nodes: nodesFromSegs(segs), rotation: 0 });
        };
        const result = [];
        // left to right, like reading
        outers.sort((a, b) => Math.min(...a.raw.map((p) => p.x)) - Math.min(...b.raw.map((p) => p.x)));
        outers.forEach((o) => {
            const parts = [pathOf(o)].concat(o.holes.map(pathOf));
            if (parts.length === 1) { result.push(parts[0]); return; }
            let acc = { type: 'boolean', op: 'exclude', children: [parts[0], parts[1]], opacity: keep.opacity === undefined ? 1 : keep.opacity, rotation: 0, blur: keep.blur || 0 };
            for (let k = 2; k < parts.length; k++) acc = { type: 'boolean', op: 'exclude', children: [acc, parts[k]], opacity: 1, rotation: 0, blur: 0 };
            // the pieces inside keep their own look; the wrapper carries opacity and blur only once
            parts.forEach((p) => { p.opacity = 1; p.blur = 0; });
            result.push(acc);
        });
        return result;
    }

    function fontSpecOf(obj) {
        return (obj.fontStyle === 'italic' ? 'italic ' : '') + (obj.fontWeight || 'normal') + ' ' + (obj.fontSize || 28) + 'px ' + fontStack(obj.fontFamily);
    }

    // convert every selected text; returns true when something changed
    window.convertTextsToPaths = async function convertTextsToPaths() {
        const idxs = selectedIndices.filter((i) => objects[i] && objects[i].type === 'text');
        if (!idxs.length) return false;
        for (const i of idxs) {
            try { if (document.fonts && document.fonts.load) await document.fonts.load(fontSpecOf(objects[i]), String(objects[i].text || 'A')); } catch (e) {}
        }
        const made = new Map();
        idxs.forEach((i) => { try { const p = textToPieces(objects[i]); if (p.length) made.set(i, p); } catch (e) { console.error(e); } });
        if (!made.size) return false;
        pushHistory(true);
        const sel = new Set(selectedIndices), out = [], newSel = [];
        objects.forEach((o, i) => {
            const r = made.get(i);
            if (r) r.forEach((p) => { newSel.push(out.length); out.push(p); });
            else { if (sel.has(i)) newSel.push(out.length); out.push(o); }
        });
        objects.length = 0;
        out.forEach((o) => objects.push(o));
        selectedIndices = newSel;
        return true;
    };
})();
