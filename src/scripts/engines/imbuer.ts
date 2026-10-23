// engines/imbuer.ts — TypeScript source of the build-time spreadsheet engine!
// Compiles to imbuer.js (committed, Node runs the output as-is)!
// Recompile with: npx -y -p typescript tsc --project tsconfig.json
// SUM, AVG, MIN, MAX, COUNT over ranges PLUS arithmetic: cell refs,
// +-*/ parentheses and unary minus (e.g. =A1*2, =(A1+A2)/2, =SUM(A1:A3)*2)!

export interface CellRef {
    col: number;
    row: number;
}

export type SheetData = Record<string, unknown>;
export type SheetResult = Record<string, unknown>;

export interface ColumnStats {
    count: number;
    sum: number;
    mean: number;
    min: number;
    max: number;
}

export function colToIndex(col: unknown): number {
    // 0-based!
    let idx = 0;
    for (const ch of String(col).toUpperCase()) {
        idx = idx * 26 + (ch.charCodeAt(0) - 65 + 1);
    }
    return idx - 1;
}

export function indexToCol(idx: number): string {
    let name = "";
    let c = idx;
    while (c >= 0) {
        name = String.fromCharCode((c % 26) + 65) + name;
        c = Math.floor(c / 26) - 1;
    }
    return name;
}

export function parseCellRef(ref: unknown): CellRef | null {
    const m = /^([A-Za-z]+)(\d+)$/.exec(String(ref).trim());
    if (!m) return null;
    return { col: colToIndex(m[1]), row: parseInt(m[2], 10) };
}

export function cellId(col: number, row: number): string {
    return indexToCol(col) + String(row);
}

function numOrNull(v: unknown): number | null {
    const n = parseFloat(String(v).trim());
    return isNaN(n) ? null : n;
}

export function getRangeValues(data: SheetData, startRef: string, endRef: string): number[] {
    const s = parseCellRef(startRef);
    const e = parseCellRef(endRef);
    if (!s || !e) return [];
    const vals: number[] = [];
    for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
        for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) {
            // Missing cells count as 0!
            const raw: unknown = data[cellId(c, r)] === undefined ? "0" : data[cellId(c, r)];
            if (String(raw).startsWith("=")) continue; // unresolved formula: skip!
            const n = numOrNull(raw);
            if (n !== null) vals.push(n);
        }
    }
    return vals;
}

type ArithNode =
    | { kind: "num"; value: number }
    | { kind: "ref"; cell: string }
    | { kind: "call"; fn: string; start: string; end: string }
    | { kind: "add"; l: ArithNode; r: ArithNode }
    | { kind: "sub"; l: ArithNode; r: ArithNode }
    | { kind: "mul"; l: ArithNode; r: ArithNode }
    | { kind: "div"; l: ArithNode; r: ArithNode }
    | { kind: "neg"; v: ArithNode };

const FNAMES: Set<string> = new Set(["SUM", "AVG", "MIN", "MAX", "COUNT"]);

class ArithParser {
    private pos = 0;
    refs: string[] = [];
    constructor(private text: string) {}

    private skipWs(): void {
        while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) this.pos++;
    }

    parse(): ArithNode | null {
        const n = this.parseExpr();
        if (!n) return null;
        this.skipWs();
        return this.pos === this.text.length ? n : null;
    }

    private parseExpr(): ArithNode | null {
        let l = this.parseTerm();
        if (!l) return null;
        for (;;) {
            this.skipWs();
            const c = this.text[this.pos];
            if (c !== "+" && c !== "-") return l;
            this.pos++;
            const r = this.parseTerm();
            if (!r) return null;
            l = c === "+" ? { kind: "add", l, r } : { kind: "sub", l, r };
        }
    }

    private parseTerm(): ArithNode | null {
        let l = this.parseFactor();
        if (!l) return null;
        for (;;) {
            this.skipWs();
            const c = this.text[this.pos];
            if (c !== "*" && c !== "/") return l;
            this.pos++;
            const r = this.parseFactor();
            if (!r) return null;
            l = c === "*" ? { kind: "mul", l, r } : { kind: "div", l, r };
        }
    }

    private parseFactor(): ArithNode | null {
        this.skipWs();
        if (this.pos >= this.text.length) return null;
        const c = this.text[this.pos];
        if (c === "(") {
            this.pos++;
            const n = this.parseExpr();
            if (!n) return null;
            this.skipWs();
            if (this.text[this.pos] !== ")") return null;
            this.pos++;
            return n;
        }
        if (c === "-") {
            this.pos++;
            const v = this.parseFactor();
            return v ? { kind: "neg", v } : null;
        }
        const num = /^[0-9]+(\.[0-9]+)?/.exec(this.text.slice(this.pos));
        if (num) {
            this.pos += num[0].length;
            return { kind: "num", value: parseFloat(num[0]) };
        }
        const word = /^[A-Za-z]+/.exec(this.text.slice(this.pos));
        if (word) {
            const name = word[0].toUpperCase();
            let j = this.pos + word[0].length;
            while (j < this.text.length && /\s/.test(this.text[j])) j++;
            if (this.text[j] === "(") {
                if (!FNAMES.has(name)) return null;
                this.pos = j + 1;
                const start = this.parseRef();
                if (!start) return null;
                this.skipWs();
                if (this.text[this.pos] !== ":") return null;
                this.pos++;
                const end = this.parseRef();
                if (!end) return null;
                this.skipWs();
                if (this.text[this.pos] !== ")") return null;
                this.pos++;
                this.refs.push(...rangeCells(start, end));
                return { kind: "call", fn: name, start, end };
            }
            const ref = /^([A-Za-z]+\d+)/.exec(this.text.slice(this.pos));
            if (ref && parseCellRef(ref[1])) {
                this.pos += ref[1].length;
                this.refs.push(ref[1].toUpperCase());
                return { kind: "ref", cell: ref[1].toUpperCase() };
            }
            return null;
        }
        return null;
    }

    private parseRef(): string | null {
        this.skipWs();
        const ref = /^([A-Za-z]+\d+)/.exec(this.text.slice(this.pos));
        if (!ref || !parseCellRef(ref[1])) return null;
        this.pos += ref[1].length;
        return ref[1].toUpperCase();
    }
}

function rangeCells(startRef: string, endRef: string): string[] {
    const s = parseCellRef(startRef);
    const e = parseCellRef(endRef);
    if (!s || !e) return [];
    const out: string[] = [];
    for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
        for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) {
            out.push(cellId(c, r));
        }
    }
    return out;
}

function parseArithmetic(inner: string): { node: ArithNode; refs: string[] } | null {
    const parser = new ArithParser(inner.toUpperCase());
    const node = parser.parse();
    if (!node) return null;
    return { node, refs: parser.refs };
}

function refValue(cell: string, data: SheetData): number {
    const raw = data[cell];
    if (raw === undefined) return 0; // missing counts as 0!
    if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
    const s = String(raw).trim();
    if (s.startsWith("=")) return 0; // unresolved formula counts as 0!
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n; // plain text counts as 0!
}

function evalNode(node: ArithNode, data: SheetData): number {
    switch (node.kind) {
        case "num": return node.value;
        case "ref": return refValue(node.cell, data);
        case "neg": return -evalNode(node.v, data);
        case "add": return evalNode(node.l, data) + evalNode(node.r, data);
        case "sub": return evalNode(node.l, data) - evalNode(node.r, data);
        case "mul": return evalNode(node.l, data) * evalNode(node.r, data);
        case "div": return evalNode(node.l, data) / evalNode(node.r, data);
        case "call": {
            const vals = getRangeValues(data, node.start, node.end);
            if (node.fn === "SUM") return vals.reduce((a, b) => a + b, 0);
            if (node.fn === "COUNT") return vals.length;
            if (node.fn === "MIN") return vals.length === 0 ? 0 : Math.min(...vals);
            if (node.fn === "MAX") return vals.length === 0 ? 0 : Math.max(...vals);
            return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
        }
    }
}

export function computeFormula(formula: unknown, data?: SheetData): unknown {
    const s = String(formula);
    if (!s.startsWith("=")) return formula;
    const parsed = parseArithmetic(s.slice(1).trim());
    if (!parsed) return "ERROR";
    const result = evalNode(parsed.node, data || {});
    return isFinite(result) ? result : "ERROR";
}

export function formulaDeps(formula: unknown): string[] {
    const s = String(formula);
    if (!s.startsWith("=")) return [];
    const parsed = parseArithmetic(s.slice(1).trim());
    return parsed ? parsed.refs : [];
}

export function evaluateSheet(data?: SheetData): SheetResult {
    const result: SheetResult = {};
    const pending: SheetResult = {};
    for (const k of Object.keys(data || {})) {
        if (String((data as SheetData)[k]).startsWith("=")) pending[k] = (data as SheetData)[k];
        else result[k] = (data as SheetData)[k];
    }
    const maxIters = Object.keys(pending).length + 1;
    for (let i = 0; i < maxIters; i++) {
        if (Object.keys(pending).length === 0) break;
        let progressed = false;
        for (const k of Object.keys(pending)) {
            if (formulaDeps(pending[k]).some((d) => pending[d] !== undefined)) continue;
            const view: SheetData = {};
            for (const rk of Object.keys(result)) view[rk] = String(result[rk]);
            result[k] = computeFormula(pending[k], view);
            delete pending[k];
            progressed = true;
        }
        if (!progressed) {
            for (const k of Object.keys(pending)) result[k] = "ERROR:CYCLE";
            break;
        }
    }
    return result;
}

export function columnStats(values?: number[]): ColumnStats {
    if (!values || values.length === 0) return { count: 0, sum: 0, mean: 0, min: 0, max: 0 };
    const sum = values.reduce((a, b) => a + b, 0);
    return {
        count: values.length, sum, mean: sum / values.length,
        min: Math.min(...values), max: Math.max(...values),
    };
}
