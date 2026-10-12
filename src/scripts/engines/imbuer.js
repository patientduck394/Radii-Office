// engines/imbuer.ts — TypeScript source of the build-time spreadsheet engine!
// Compiles to imbuer.js (committed, Node runs the output as-is)!
// Recompile with: npx -y -p typescript tsc --project tsconfig.json
// SUM, AVG, MIN, MAX, COUNT plus dependency ordering and cycle detection!
export function colToIndex(col) {
    // 0-based!
    let idx = 0;
    for (const ch of String(col).toUpperCase()) {
        idx = idx * 26 + (ch.charCodeAt(0) - 65 + 1);
    }
    return idx - 1;
}
export function indexToCol(idx) {
    let name = "";
    let c = idx;
    while (c >= 0) {
        name = String.fromCharCode((c % 26) + 65) + name;
        c = Math.floor(c / 26) - 1;
    }
    return name;
}
export function parseCellRef(ref) {
    const m = /^([A-Za-z]+)(\d+)$/.exec(String(ref).trim());
    if (!m)
        return null;
    return { col: colToIndex(m[1]), row: parseInt(m[2], 10) };
}
export function cellId(col, row) {
    return indexToCol(col) + String(row);
}
function numOrNull(v) {
    const n = parseFloat(String(v).trim());
    return isNaN(n) ? null : n;
}
export function getRangeValues(data, startRef, endRef) {
    const s = parseCellRef(startRef);
    const e = parseCellRef(endRef);
    if (!s || !e)
        return [];
    const vals = [];
    for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
        for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) {
            // Missing cells count as 0!
            const raw = data[cellId(c, r)] === undefined ? "0" : data[cellId(c, r)];
            if (String(raw).startsWith("="))
                continue; // unresolved formula: skip!
            const n = numOrNull(raw);
            if (n !== null)
                vals.push(n);
        }
    }
    return vals;
}
const FNAMES = new Set(["SUM", "AVG", "MIN", "MAX", "COUNT"]);
export function extractRange(formula) {
    const m = /^(SUM|AVG|MIN|MAX|COUNT)\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)$/.exec(String(formula).slice(1).trim().toUpperCase());
    if (!m || !FNAMES.has(m[1]))
        return null;
    return { fn: m[1], start: m[2], end: m[3] };
}
export function computeFormula(formula, data) {
    if (!String(formula).startsWith("="))
        return formula;
    const parsed = extractRange(formula);
    if (!parsed)
        return "ERROR";
    const vals = getRangeValues(data || {}, parsed.start, parsed.end);
    if (parsed.fn === "SUM")
        return vals.reduce((a, b) => a + b, 0);
    if (parsed.fn === "COUNT")
        return vals.length;
    if (parsed.fn === "MIN")
        return vals.length === 0 ? 0 : Math.min(...vals);
    if (parsed.fn === "MAX")
        return vals.length === 0 ? 0 : Math.max(...vals);
    if (parsed.fn === "AVG") {
        return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return "ERROR";
}
export function formulaDeps(formula) {
    if (!String(formula).startsWith("="))
        return [];
    const parsed = extractRange(formula);
    if (!parsed)
        return [];
    const s = parseCellRef(parsed.start);
    const e = parseCellRef(parsed.end);
    if (!s || !e)
        return [];
    const deps = [];
    for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
        for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) {
            deps.push(cellId(c, r));
        }
    }
    return deps;
}
export function evaluateSheet(data) {
    const result = {};
    const pending = {};
    for (const k of Object.keys(data || {})) {
        if (String(data[k]).startsWith("="))
            pending[k] = data[k];
        else
            result[k] = data[k];
    }
    const maxIters = Object.keys(pending).length + 1;
    for (let i = 0; i < maxIters; i++) {
        if (Object.keys(pending).length === 0)
            break;
        let progressed = false;
        for (const k of Object.keys(pending)) {
            if (formulaDeps(pending[k]).some((d) => pending[d] !== undefined))
                continue;
            const view = {};
            for (const rk of Object.keys(result))
                view[rk] = String(result[rk]);
            result[k] = computeFormula(pending[k], view);
            delete pending[k];
            progressed = true;
        }
        if (!progressed) {
            for (const k of Object.keys(pending))
                result[k] = "ERROR:CYCLE";
            break;
        }
    }
    return result;
}
export function columnStats(values) {
    if (!values || values.length === 0)
        return { count: 0, sum: 0, mean: 0, min: 0, max: 0 };
    const sum = values.reduce((a, b) => a + b, 0);
    return {
        count: values.length, sum, mean: sum / values.length,
        min: Math.min(...values), max: Math.max(...values),
    };
}
