// formula_engine.ts — TypeScript source of the live Imbuer formula engine!
// Compiles to formula_engine.js (committed, browsers run the output as-is)!
// Recompile with: npx -y -p typescript tsc --project tsconfig.json
// NOTE: keep this file free of runtime import/export so the output stays a
// classic script loadable via <script src>!
// Covers SUM, AVG, MIN, MAX, COUNT plus dependency ordering and cycle safety!

interface CellRef {
    col: number;
    row: number;
}

interface RangeCall {
    fn: string;
    start: string;
    end: string;
}

type SheetData = Record<string, unknown>;
type SheetResult = Record<string, unknown>;

interface ColumnStats {
    count: number;
    sum: number;
    mean: number;
    min: number;
    max: number;
}

interface FormulaEngineApi {
    colToIndex(col: unknown): number;
    indexToCol(idx: number): string;
    parseCellRef(ref: unknown): CellRef | null;
    getRangeValues(data: SheetData, startRef: string, endRef: string): number[];
    computeFormula(formula: unknown, data?: SheetData): unknown;
    evaluateSheet(data?: SheetData): SheetResult;
    columnStats(values?: number[]): ColumnStats;
}

declare const module: any;

(function (root: any): void {
    function colToIndex(col: unknown): number {
        let idx = 0;
        const up = String(col).toUpperCase();
        for (let i = 0; i < up.length; i++) {
            idx = idx * 26 + (up.charCodeAt(i) - 65 + 1);
        }
        return idx - 1; // 0-based!
    }

    function indexToCol(idx: number): string {
        let name = "";
        let c = idx;
        while (c >= 0) {
            name = String.fromCharCode((c % 26) + 65) + name;
            c = Math.floor(c / 26) - 1;
        }
        return name;
    }

    function parseCellRef(ref: unknown): CellRef | null {
        const m = /^([A-Za-z]+)(\d+)$/.exec(String(ref).trim());
        if (!m) return null;
        return { col: colToIndex(m[1]), row: parseInt(m[2], 10) };
    }

    function cellId(col: number, row: number): string {
        return indexToCol(col) + String(row);
    }

    function numOrNull(v: unknown): number | null {
        const n = parseFloat(String(v).trim());
        return isNaN(n) ? null : n;
    }

    function getRangeValues(data: SheetData, startRef: string, endRef: string): number[] {
        const s = parseCellRef(startRef);
        const e = parseCellRef(endRef);
        if (!s || !e) return [];
        const c0 = Math.min(s.col, e.col), c1 = Math.max(s.col, e.col);
        const r0 = Math.min(s.row, e.row), r1 = Math.max(s.row, e.row);
        const vals: number[] = [];
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                // Missing cells count as 0!
                const raw: unknown = data[cellId(c, r)] === undefined ? "0" : data[cellId(c, r)];
                if (String(raw).startsWith("=")) continue; // unresolved formula: skip!
                const n = numOrNull(raw);
                if (n !== null) vals.push(n);
            }
        }
        return vals;
    }

    function extractRange(formula: unknown): RangeCall | null {
        const m = /^(SUM|AVG|MIN|MAX|COUNT)\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)$/.exec(
            String(formula).slice(1).trim().toUpperCase()
        );
        if (!m) return null;
        return { fn: m[1], start: m[2], end: m[3] };
    }

    function computeFormula(formula: unknown, data?: SheetData): unknown {
        if (!String(formula).startsWith("=")) return formula;
        const parsed = extractRange(formula);
        if (!parsed) return "ERROR";
        const vals = getRangeValues(data || {}, parsed.start, parsed.end);
        if (parsed.fn === "SUM") return vals.reduce((a, b) => a + b, 0);
        if (parsed.fn === "COUNT") return vals.length;
        if (parsed.fn === "MIN") return vals.length === 0 ? 0 : Math.min(...vals);
        if (parsed.fn === "MAX") return vals.length === 0 ? 0 : Math.max(...vals);
        if (parsed.fn === "AVG") return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
        return "ERROR";
    }

    function formulaDeps(formula: unknown): string[] {
        if (!String(formula).startsWith("=")) return [];
        const parsed = extractRange(formula);
        if (!parsed) return [];
        const s = parseCellRef(parsed.start);
        const e = parseCellRef(parsed.end);
        if (!s || !e) return [];
        const deps: string[] = [];
        for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
            for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) {
                deps.push(cellId(c, r));
            }
        }
        return deps;
    }

    function evaluateSheet(data?: SheetData): SheetResult {
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
                const deps = formulaDeps(pending[k]);
                if (deps.some((d) => pending[d] !== undefined)) continue; // blocked: dep still a pending formula!
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

    function columnStats(values?: number[]): ColumnStats {
        if (!values || values.length === 0) return { count: 0, sum: 0, mean: 0, min: 0, max: 0 };
        const sum = values.reduce((a, b) => a + b, 0);
        return { count: values.length, sum, mean: sum / values.length, min: Math.min(...values), max: Math.max(...values) };
    }

    const FormulaEngine: FormulaEngineApi = {
        colToIndex, indexToCol, parseCellRef, getRangeValues,
        computeFormula, evaluateSheet, columnStats,
    };
    if (typeof module !== "undefined" && module.exports) module.exports = FormulaEngine;
    root.FormulaEngine = FormulaEngine;
})(typeof window !== "undefined" ? window : globalThis);
