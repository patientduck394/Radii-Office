// engines/inkpath.mjs — build-time vector geometry (replaces py/engines/inkpath.py)!
// Cubic Bezier eval, length, bbox, flatten, and SVG path builder!

export function node(x, y, cx1, cy1, cx2, cy2) {
    return {
        x, y,
        cx1: cx1 ?? x, cy1: cy1 ?? y, cx2: cx2 ?? x, cy2: cy2 ?? y,
    };
}

export function cubicPoint(p0, p1, t) {
    const u = 1.0 - t;
    return [
        u ** 3 * p0.x + 3 * u ** 2 * t * p0.cx2 + 3 * u * t ** 2 * p1.cx1 + t ** 3 * p1.x,
        u ** 3 * p0.y + 3 * u ** 2 * t * p0.cy2 + 3 * u * t ** 2 * p1.cy1 + t ** 3 * p1.y,
    ];
}

export function cubicLength(p0, p1, n = 32) {
    let total = 0.0;
    let [px, py] = [p0.x, p0.y];
    for (let i = 1; i <= n; i++) {
        const [x, y] = cubicPoint(p0, p1, i / n);
        total += Math.hypot(x - px, y - py);
        [px, py] = [x, y];
    }
    return total;
}

export function pathLength(nodes) {
    if (nodes.length < 2) return 0.0;
    let total = 0.0;
    for (let i = 1; i < nodes.length; i++) total += cubicLength(nodes[i - 1], nodes[i]);
    return total;
}

export function pathBbox(nodes) {
    if (nodes.length === 0) return { x: 0.0, y: 0.0, w: 10.0, h: 10.0 };
    const xs = nodes.flatMap((nd) => [nd.x, nd.cx1, nd.cx2]);
    const ys = nodes.flatMap((nd) => [nd.y, nd.cy1, nd.cy2]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    return { x: x0, y: y0, w: Math.max(x1 - x0, 1.0), h: Math.max(y1 - y0, 1.0) };
}

export function flattenPath(nodes, segments = 16) {
    if (nodes.length === 0) return [];
    const pts = [{ x: nodes[0].x, y: nodes[0].y }];
    for (let i = 1; i < nodes.length; i++) {
        for (let j = 1; j <= segments; j++) {
            const [x, y] = cubicPoint(nodes[i - 1], nodes[i], j / segments);
            pts.push({ x, y });
        }
    }
    return pts;
}

function numstr(n) {
    // Matches the JS buildPathData look: whole floats print with a decimal point!
    return Number.isInteger(n) ? `${n}.0` : String(n);
}

// Matches the app's buildPathData format: "M x y C cx2 cy2, cx1 cy1, x y"!
export function buildPathData(nodes) {
    if (nodes.length === 0) return "";
    let d = `M ${numstr(nodes[0].x)} ${numstr(nodes[0].y)}`;
    for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1], cur = nodes[i];
        d += ` C ${numstr(prev.cx2)} ${numstr(prev.cy2)},`
            + ` ${numstr(cur.cx1)} ${numstr(cur.cy1)},`
            + ` ${numstr(cur.x)} ${numstr(cur.y)}`;
    }
    return d;
}
