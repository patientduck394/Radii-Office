/* Inkpath path geometry: flatten curves, simplify, offset, outline a stroke, join, reverse, smooth.
   Pure functions on plain points {x, y} and Inkpath nodes {x, y, cx1, cy1, cx2, cy2}; no page needed (it also loads in Node for tests).
   A node's cx1/cy1 is the handle BEFORE it and cx2/cy2 the handle AFTER it, the same as the rest of Inkpath. */
(function (root) {
    'use strict';
    const EPS = 1e-9;
    const hyp = Math.hypot;

    const corner = (x, y) => ({ x, y, cx1: x, cy1: y, cx2: x, cy2: y });
    const isCorner = (n) => hyp(n.cx1 - n.x, n.cy1 - n.y) < 0.01 && hyp(n.cx2 - n.x, n.cy2 - n.y) < 0.01;

    // ---------- curves to points ----------
    function cubicPoint(p0, p1, p2, p3, t) {
        const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
    }
    // a path's nodes as a polyline: curves are sampled more where they are longer (tolerance in pixels)
    function flattenNodes(nodes, closed, tol) {
        tol = tol || 0.35;
        const out = [];
        if (!nodes || !nodes.length) return out;
        const segs = closed ? nodes.length : nodes.length - 1;
        out.push({ x: nodes[0].x, y: nodes[0].y });
        for (let i = 0; i < segs; i++) {
            const a = nodes[i], b = nodes[(i + 1) % nodes.length];
            const p0 = { x: a.x, y: a.y }, p1 = { x: a.cx2, y: a.cy2 }, p2 = { x: b.cx1, y: b.cy1 }, p3 = { x: b.x, y: b.y };
            const straight = hyp(p1.x - p0.x, p1.y - p0.y) < 0.01 && hyp(p2.x - p3.x, p2.y - p3.y) < 0.01;
            if (straight) { if (!(closed && i === segs - 1)) out.push({ x: p3.x, y: p3.y }); continue; }
            const len = hyp(p1.x - p0.x, p1.y - p0.y) + hyp(p2.x - p1.x, p2.y - p1.y) + hyp(p3.x - p2.x, p3.y - p2.y);
            const n = Math.max(4, Math.min(64, Math.ceil(Math.sqrt(len / tol) * 1.4)));
            for (let k = 1; k <= n; k++) { if (closed && i === segs - 1 && k === n) break; out.push(cubicPoint(p0, p1, p2, p3, k / n)); }
        }
        return out;
    }

    // ---------- measuring ----------
    function polyArea(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return a / 2; }
    function polyLength(pts, closed) { let l = 0; for (let i = 1; i < pts.length; i++) l += hyp(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (closed && pts.length > 1) l += hyp(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y); return l; }
    function bounds(pts) { let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; for (const p of pts) { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); } return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; }
    function distToSegment(p, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
        if (l2 < EPS) return hyp(p.x - a.x, p.y - a.y);
        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2; t = Math.max(0, Math.min(1, t));
        return hyp(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    }
    // the largest distance from any point of a to the polyline b (to check that a simplified line stays close)
    function maxDeviation(a, b, closed) {
        let worst = 0;
        for (const p of a) { let best = Infinity; const n = closed ? b.length : b.length - 1; for (let i = 0; i < n; i++) best = Math.min(best, distToSegment(p, b[i], b[(i + 1) % b.length])); worst = Math.max(worst, best); }
        return worst;
    }

    // ---------- simplify (Ramer-Douglas-Peucker) ----------
    function rdp(pts, eps, closed) {
        if (pts.length < 3) return pts.slice();
        if (closed) {
            // split the loop at its two most distant points so both halves are simplified as open lines
            let a = 0, b = 0, best = -1;
            for (let i = 0; i < pts.length; i++) { const d = hyp(pts[i].x - pts[0].x, pts[i].y - pts[0].y); if (d > best) { best = d; b = i; } }
            if (b === 0) return pts.slice();
            const left = rdp(pts.slice(a, b + 1), eps, false), right = rdp(pts.slice(b).concat([pts[0]]), eps, false);
            return left.slice(0, -1).concat(right.slice(0, -1));
        }
        let idx = 0, dmax = 0;
        for (let i = 1; i < pts.length - 1; i++) { const d = distToSegment(pts[i], pts[0], pts[pts.length - 1]); if (d > dmax) { dmax = d; idx = i; } }
        if (dmax <= eps) return [pts[0], pts[pts.length - 1]];
        return rdp(pts.slice(0, idx + 1), eps, false).slice(0, -1).concat(rdp(pts.slice(idx), eps, false));
    }

    // points to smooth nodes: handles follow the neighbours (Catmull-Rom), but a sharp turn stays a corner
    function pointsToNodes(pts, closed, opts) {
        opts = opts || {};
        const cornerAngle = (opts.cornerAngle === undefined ? 55 : opts.cornerAngle) * Math.PI / 180, tension = opts.tension === undefined ? 1 / 6 : opts.tension;
        const n = pts.length, nodes = [];
        if (n === 0) return nodes;
        for (let i = 0; i < n; i++) {
            const p = pts[i], prev = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)], next = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
            const ends = !closed && (i === 0 || i === n - 1);
            let isSharp = ends;
            if (!ends) {
                const ax = prev.x - p.x, ay = prev.y - p.y, bx = next.x - p.x, by = next.y - p.y, la = hyp(ax, ay), lb = hyp(bx, by);
                if (la > EPS && lb > EPS) { const turn = Math.PI - Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))); isSharp = turn > cornerAngle; }
            }
            if (isSharp) { nodes.push(corner(p.x, p.y)); continue; }
            const tx = (next.x - prev.x) * tension, ty = (next.y - prev.y) * tension;
            // handles are never longer than a third of the neighbouring gaps, so a curve cannot overshoot
            const lp = hyp(prev.x - p.x, prev.y - p.y) / 3, ln = hyp(next.x - p.x, next.y - p.y) / 3, tl = hyp(tx, ty) || 1;
            const f1 = Math.min(1, lp / tl), f2 = Math.min(1, ln / tl);
            nodes.push({ x: p.x, y: p.y, cx1: p.x - tx * f1, cy1: p.y - ty * f1, cx2: p.x + tx * f2, cy2: p.y + ty * f2 });
        }
        return nodes;
    }
    // simplify a path: fewer nodes, same shape within `tol` pixels. Returns { nodes, before, after }.
    function simplifyNodes(nodes, closed, tol) {
        tol = tol === undefined ? 1.5 : tol;
        const flat = flattenNodes(nodes, closed, 0.25), simple = rdp(flat, tol, closed);
        const out = pointsToNodes(simple, closed, { cornerAngle: 50 });
        return { nodes: out, before: nodes.length, after: out.length };
    }

    // ---------- offsetting ----------
    function segmentIntersection(a, b, c, d) {
        const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y }, den = r.x * s.y - r.y * s.x;
        if (Math.abs(den) < EPS) return null;
        const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
        if (t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6) return { x: a.x + t * r.x, y: a.y + t * r.y, t, u };
        return null;
    }
    // cut out the little loops an offset makes inside sharp inner corners
    function removeLoops(pts, closed) {
        if (pts.length > 700) return pts;
        let out = pts.slice(), changed = true, guard = 0;
        while (changed && guard++ < 6) {
            changed = false;
            const n = out.length, segCount = closed ? n : n - 1;
            outer:
            for (let i = 0; i < segCount; i++) {
                for (let j = i + 2; j < segCount; j++) {
                    if (closed && i === 0 && j === segCount - 1) continue;
                    const x = segmentIntersection(out[i], out[(i + 1) % n], out[j], out[(j + 1) % n]);
                    if (!x) continue;
                    // keep the larger side of the loop
                    const inner = out.slice(i + 1, j + 1), outerPart = out.slice(j + 1).concat(out.slice(0, i + 1));
                    const ia = Math.abs(polyArea(inner.concat([{ x: x.x, y: x.y }]))), oa = Math.abs(polyArea(outerPart.concat([{ x: x.x, y: x.y }])));
                    out = (ia < oa || !closed) ? out.slice(0, i + 1).concat([{ x: x.x, y: x.y }]).concat(out.slice(j + 1)) : [{ x: x.x, y: x.y }].concat(inner);
                    changed = true; break outer;
                }
            }
        }
        return out;
    }
    // move a polyline sideways by d (positive = to the left of the direction it runs). join: 'miter' | 'round' | 'bevel'
    function offsetLine(pts, d, closed, join, miterLimit) {
        join = join || 'miter'; miterLimit = miterLimit || 4;
        const n = pts.length, out = [];
        if (n < 2) return pts.slice();
        const dir = (i) => { const a = pts[i], b = pts[(i + 1) % n], l = hyp(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }; };
        const nrm = (v) => ({ x: v.y * d, y: -v.x * d });   // left normal times d (screen y points down)
        const segs = closed ? n : n - 1;
        for (let i = 0; i < n; i++) {
            const p = pts[i];
            if (!closed && i === 0) { const v = nrm(dir(0)); out.push({ x: p.x + v.x, y: p.y + v.y }); continue; }
            if (!closed && i === n - 1) { const v = nrm(dir(n - 2)); out.push({ x: p.x + v.x, y: p.y + v.y }); continue; }
            const d0 = dir(closed ? (i - 1 + n) % n : i - 1), d1 = dir(i);
            const n0 = nrm(d0), n1 = nrm(d1), cross = d0.x * d1.y - d0.y * d1.x, dotp = d0.x * d1.x + d0.y * d1.y;
            const outside = (cross * d) > 0;   // the offset side is the outer side of the turn
            if (Math.abs(cross) < 1e-6 && dotp > 0) { out.push({ x: p.x + n1.x, y: p.y + n1.y }); continue; }
            const mx = n0.x + n1.x, my = n0.y + n1.y, ml = hyp(mx, my);
            if (!outside) {
                // inner corner: the two offset lines cross; use their meeting point (the loop removal cleans the rest)
                out.push({ x: p.x + n0.x, y: p.y + n0.y }); out.push({ x: p.x + n1.x, y: p.y + n1.y });
                continue;
            }
            const cosHalf = ml / (2 * Math.abs(d));      // cos of half the turn angle
            const miterRatio = 1 / Math.max(cosHalf, 1e-6);
            if (join === 'miter' && miterRatio <= miterLimit && ml > 1e-6) {
                const s = (2 * d * d) / (ml * ml);
                out.push({ x: p.x + mx * s, y: p.y + my * s });
            } else if (join === 'round') {
                const a0 = Math.atan2(n0.y, n0.x); let a1 = Math.atan2(n1.y, n1.x), diff = a1 - a0;
                while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
                const steps = Math.max(2, Math.ceil(Math.abs(diff) / (Math.PI / 12)));
                for (let k = 0; k <= steps; k++) { const a = a0 + diff * (k / steps); out.push({ x: p.x + Math.cos(a) * Math.abs(d), y: p.y + Math.sin(a) * Math.abs(d) }); }
            } else { out.push({ x: p.x + n0.x, y: p.y + n0.y }); out.push({ x: p.x + n1.x, y: p.y + n1.y }); }
        }
        return removeLoops(out, closed);
    }
    // a closed shape made bigger (d > 0) or smaller (d < 0). Works on a polyline; the result is a polyline.
    function offsetPolygon(pts, d, join, miterLimit) {
        if (pts.length < 3) return pts.slice();
        const clockwise = polyArea(pts) > 0;    // y points down, so a positive area runs clockwise on screen
        const side = clockwise ? d : -d;        // grow outward whichever way the shape runs (the left of a clockwise shape is outside)
        return offsetLine(pts, side, true, join, miterLimit);
    }

    // ---------- outline a stroke ----------
    // gives { contours: [polygon, ...] } where the first contour is the outside and any others are holes (closed paths make a ring)
    function strokeOutline(pts, width, closed, cap, join, miterLimit) {
        cap = cap || 'butt'; join = join || 'miter';
        const hw = width / 2;
        if (pts.length < 2) return { contours: [] };
        if (closed) {
            const a = offsetLine(pts, hw, true, join, miterLimit), b = offsetLine(pts, -hw, true, join, miterLimit);
            // the bigger loop is the outside
            const A = Math.abs(polyArea(a)), B = Math.abs(polyArea(b));
            return { contours: A >= B ? [a, b] : [b, a], ring: true };
        }
        const left = offsetLine(pts, hw, false, join, miterLimit), right = offsetLine(pts, -hw, false, join, miterLimit).reverse();
        // which way is "forward" at the ends decides which way the caps bulge
        const d1 = { x: pts[pts.length - 1].x - pts[pts.length - 2].x, y: pts[pts.length - 1].y - pts[pts.length - 2].y }, d0 = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
        const lastL = left[left.length - 1], lastR = right[0], firstR = right[right.length - 1], firstL = left[0];
        const poly1 = left.concat(capPoints(lastL, lastR, d1, cap, hw)).concat(right).concat(capPoints(firstR, firstL, { x: -d0.x, y: -d0.y }, cap, hw));
        return { contours: [removeLoops(poly1, true)], ring: false };
    }
    // the points of a cap that joins `from` to `to` bulging along direction dir
    function capPoints(from, to, dir, cap, hw) {
        const l = hyp(dir.x, dir.y) || 1, ux = dir.x / l, uy = dir.y / l;
        if (cap === 'square') return [{ x: from.x + ux * hw, y: from.y + uy * hw }, { x: to.x + ux * hw, y: to.y + uy * hw }];
        if (cap === 'round') {
            const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, a0 = Math.atan2(from.y - mid.y, from.x - mid.x), out = [];
            const bulge = Math.atan2(uy, ux);
            // rotate from a0 to a0 + 180 degrees in the direction that passes through the bulge direction
            let diff = Math.PI; const test = Math.atan2(Math.sin(a0 + diff / 2), Math.cos(a0 + diff / 2)); let dd = test - bulge; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
            if (Math.abs(dd) > Math.PI / 2) diff = -Math.PI;
            for (let k = 1; k < 12; k++) { const a = a0 + diff * (k / 12); out.push({ x: mid.x + Math.cos(a) * hw, y: mid.y + Math.sin(a) * hw }); }
            return out;
        }
        return [];
    }

    // ---------- small path operations ----------
    function reverseNodes(nodes) { return nodes.slice().reverse().map((n) => ({ x: n.x, y: n.y, cx1: n.cx2, cy1: n.cy2, cx2: n.cx1, cy2: n.cy1 })); }
    // join two open paths where their ends are closest; returns the new node list
    function joinNodes(a, b) {
        const ends = (n) => [n[0], n[n.length - 1]];
        const ea = ends(a), eb = ends(b);
        let best = Infinity, ia = 0, ib = 0;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const d = hyp(ea[i].x - eb[j].x, ea[i].y - eb[j].y); if (d < best) { best = d; ia = i; ib = j; } }
        const A = ia === 1 ? a.map(clone) : reverseNodes(a), B = ib === 0 ? b.map(clone) : reverseNodes(b);
        const last = A[A.length - 1], first = B[0];
        if (best < 0.5) { last.cx2 = first.cx2; last.cy2 = first.cy2; return A.concat(B.slice(1)); }
        return A.concat(B);
    }
    function clone(n) { return { x: n.x, y: n.y, cx1: n.cx1, cy1: n.cy1, cx2: n.cx2, cy2: n.cy2 }; }
    // add a node in the middle of every segment (de Casteljau, so the shape does not change)
    function subdivideNodes(nodes, closed) {
        const out = [], segs = closed ? nodes.length : nodes.length - 1;
        for (let i = 0; i < nodes.length; i++) {
            const a = clone(nodes[i]);
            if (i >= segs) { out.push(a); continue; }
            const b = nodes[(i + 1) % nodes.length], p0 = { x: a.x, y: a.y }, p1 = { x: a.cx2, y: a.cy2 }, p2 = { x: b.cx1, y: b.cy1 }, p3 = { x: b.x, y: b.y };
            const m = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }), p01 = m(p0, p1), p12 = m(p1, p2), p23 = m(p2, p3), p012 = m(p01, p12), p123 = m(p12, p23), mid = m(p012, p123);
            a.cx2 = p01.x; a.cy2 = p01.y;
            out.push(a);
            out.push({ x: mid.x, y: mid.y, cx1: p012.x, cy1: p012.y, cx2: p123.x, cy2: p123.y });
            // the next node's incoming handle shrinks to the second half
            nodes[(i + 1) % nodes.length] = Object.assign({}, b, { cx1: p23.x, cy1: p23.y });
        }
        return out;
    }
    // turn every node smooth (handles from the neighbours) or sharp (no handles)
    function smoothNodes(nodes, closed) { return pointsToNodes(nodes.map((n) => ({ x: n.x, y: n.y })), closed, { cornerAngle: 181 }); }
    function sharpNodes(nodes) { return nodes.map((n) => corner(n.x, n.y)); }
    // the closest point on a path to (x, y): { point, segment, t, distance }, for adding a node by clicking the line
    function nearestOnNodes(nodes, closed, x, y) {
        let best = null; const segs = closed ? nodes.length : nodes.length - 1;
        for (let i = 0; i < segs; i++) {
            const a = nodes[i], b = nodes[(i + 1) % nodes.length], p0 = { x: a.x, y: a.y }, p1 = { x: a.cx2, y: a.cy2 }, p2 = { x: b.cx1, y: b.cy1 }, p3 = { x: b.x, y: b.y };
            for (let k = 0; k <= 40; k++) { const t = k / 40, p = cubicPoint(p0, p1, p2, p3, t), d = hyp(p.x - x, p.y - y); if (!best || d < best.distance) best = { point: p, segment: i, t, distance: d }; }
        }
        return best;
    }
    function insertNodeAt(nodes, closed, segment, t) {
        const a = nodes[segment], bi = (segment + 1) % nodes.length, b = nodes[bi];
        const p0 = { x: a.x, y: a.y }, p1 = { x: a.cx2, y: a.cy2 }, p2 = { x: b.cx1, y: b.cy1 }, p3 = { x: b.x, y: b.y };
        const lerp = (p, q) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
        const p01 = lerp(p0, p1), p12 = lerp(p1, p2), p23 = lerp(p2, p3), p012 = lerp(p01, p12), p123 = lerp(p12, p23), m = lerp(p012, p123);
        const out = nodes.map(clone);
        out[segment].cx2 = p01.x; out[segment].cy2 = p01.y;
        out[bi].cx1 = p23.x; out[bi].cy1 = p23.y;
        out.splice(segment + 1, 0, { x: m.x, y: m.y, cx1: p012.x, cy1: p012.y, cx2: p123.x, cy2: p123.y });
        return out;
    }
    // sharp-cornered nodes straight from a polyline
    function polylineToNodes(pts) { return pts.map((p) => corner(p.x, p.y)); }

    const api = { corner, isCorner, flattenNodes, cubicPoint, polyArea, polyLength, bounds, distToSegment, maxDeviation, rdp, pointsToNodes, simplifyNodes, offsetLine, offsetPolygon, strokeOutline, removeLoops,
        reverseNodes, joinNodes, subdivideNodes, smoothNodes, sharpNodes, nearestOnNodes, insertNodeAt, polylineToNodes, segmentIntersection };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.InkGeom = api;
})(typeof window !== 'undefined' ? window : globalThis);
