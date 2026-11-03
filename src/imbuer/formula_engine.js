"use strict";
// formula_engine.js — the live Imbuer formula engine! Plain JavaScript, browsers run it as-is!
// Excel-style formulas: + - * / ^ & % and comparisons, strings, booleans,
// $absolute refs, ranges (A1:B5, A:A, 1:1), cross-sheet refs (Sheet2!A1,
// 'My Sheet'!A1:B2) and ~100 functions (math, stats, logic, text, lookup, date)!
// Errors behave like Excel (#DIV/0!, #VALUE!, #REF!, #NAME?, #N/A, #NUM!, #CIRC!)!
// The legacy API (computeFormula, evaluateSheet, getRangeValues, columnStats)
// is kept so older callers keep working!
(function (root) {
    // ---------- cell ids ----------
    function colToIndex(col) {
        let idx = 0;
        const up = String(col).toUpperCase();
        for (let i = 0; i < up.length; i++) {
            idx = idx * 26 + (up.charCodeAt(i) - 65 + 1);
        }
        return idx - 1; // 0-based!
    }
    function indexToCol(idx) {
        let name = "";
        let c = idx;
        while (c >= 0) {
            name = String.fromCharCode((c % 26) + 65) + name;
            c = Math.floor(c / 26) - 1;
        }
        return name;
    }
    function parseCellRef(ref) {
        const m = /^([A-Za-z]+)(\d+)$/.exec(String(ref).trim());
        if (!m)
            return null;
        return { col: colToIndex(m[1]), row: parseInt(m[2], 10) };
    }
    function cellId(col, row) {
        return indexToCol(col) + String(row);
    }
    // ---------- errors ----------
    class FErr {
        constructor(code) { this.code = code; }
        toString() { return this.code; }
    }
    const ERR = {
        DIV0: new FErr("#DIV/0!"), VALUE: new FErr("#VALUE!"), REF: new FErr("#REF!"),
        NAME: new FErr("#NAME?"), NA: new FErr("#N/A"), NUM: new FErr("#NUM!"),
        CIRC: new FErr("#CIRC!"), PARSE: new FErr("#ERROR!"),
    };
    const ERROR_CODES = {};
    for (const k of Object.keys(ERR))
        ERROR_CODES[ERR[k].code] = ERR[k];
    function isErr(v) { return v instanceof FErr; }
    function fail(e) { throw e; }
    // ---------- literals typed into cells ----------
    const DAY_MS = 86400000;
    const EPOCH = Date.UTC(1899, 11, 30);
    function dateToSerial(y, m, d) {
        return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY_MS);
    }
    function serialToDate(serial) {
        return new Date(EPOCH + Math.floor(serial) * DAY_MS);
    }
    // Parses what a person typed: numbers, 12%, $1,234.50, TRUE, dates, 'text!
    function parseLiteral(raw) {
        if (raw === undefined || raw === null)
            return { value: null };
        if (typeof raw === "number")
            return { value: raw };
        if (typeof raw === "boolean")
            return { value: raw };
        const s = String(raw);
        if (s === "")
            return { value: null };
        if (s[0] === "'")
            return { value: s.slice(1), fmt: "text" };
        const t = s.trim();
        if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t))
            return { value: parseFloat(t) };
        if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t))
            return { value: parseFloat(t.replace(/,/g, "")), fmt: "comma" };
        let m = /^([-+]?)\$\s?(\d{1,3}(,\d{3})*|\d+)(\.\d+)?$/.exec(t);
        if (m)
            return { value: parseFloat(m[1] + m[2].replace(/,/g, "") + (m[4] || "")), fmt: "currency" };
        m = /^([-+]?(\d+\.?\d*|\.\d+))\s?%$/.exec(t);
        if (m)
            return { value: parseFloat(m[1]) / 100, fmt: "percent" };
        const up = t.toUpperCase();
        if (up === "TRUE")
            return { value: true };
        if (up === "FALSE")
            return { value: false };
        if (ERROR_CODES[up])
            return { value: ERROR_CODES[up] };
        m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
        if (m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) {
            return { value: dateToSerial(+m[1], +m[2], +m[3]), fmt: "date" };
        }
        m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t);
        if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) {
            const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
            return { value: dateToSerial(y, +m[1], +m[2]), fmt: "date" };
        }
        m = /^(\d{1,2}):(\d{2})(:(\d{2}))?\s*([AaPp][Mm])?$/.exec(t);
        if (m && +m[2] < 60) {
            let h = +m[1];
            if (m[5]) {
                const pm = /p/i.test(m[5]);
                if (h === 12)
                    h = 0;
                if (pm)
                    h += 12;
            }
            if (h < 24)
                return { value: (h * 3600 + +m[2] * 60 + (m[4] ? +m[4] : 0)) / 86400, fmt: "time" };
        }
        return { value: s };
    }
    // Keydown gel-orb text like "=Y=hello=Y=" starts with "=" but is text, not a formula!
    function isFormulaText(raw) {
        if (typeof raw !== "string" || raw.length < 2 || raw[0] !== "=")
            return false;
        return !/^=[A-Z]{1,2}=/.test(raw);
    }
    const SHEET_PFX = "(?:'((?:[^']|'')+)'|([A-Za-z_\\u00C0-\\uFFFF][\\w.\\u00C0-\\uFFFF]*))!";
    const CELL = "(\\$?)([A-Za-z]{1,3})(\\$?)(\\d+)";
    const RE_RANGE = new RegExp("^(?:" + SHEET_PFX + ")?" + CELL + "(?::" + CELL + ")?");
    const RE_COLS = new RegExp("^(?:" + SHEET_PFX + ")?(\\$?)([A-Za-z]{1,3}):(\\$?)([A-Za-z]{1,3})(?![\\w(])");
    const RE_ROWS = new RegExp("^(?:" + SHEET_PFX + ")?(\\$?)(\\d+):(\\$?)(\\d+)");
    const MAX_COL = 16383;
    function tokenize(src) {
        const out = [];
        let i = 0;
        const push = (t, v, s, e, ref) => {
            out.push({ t, v, s, e, text: src.slice(s, e), ref });
        };
        while (i < src.length) {
            const ch = src[i];
            if (/\s/.test(ch)) {
                i++;
                continue;
            }
            const rest = src.slice(i);
            if (ch === '"') {
                let j = i + 1, str = "";
                for (;;) {
                    if (j >= src.length) {
                        push("bad", null, i, src.length);
                        return out;
                    }
                    if (src[j] === '"') {
                        if (src[j + 1] === '"') {
                            str += '"';
                            j += 2;
                            continue;
                        }
                        break;
                    }
                    str += src[j++];
                }
                push("str", str, i, j + 1);
                i = j + 1;
                continue;
            }
            if (ch === "#") {
                const m = /^#(DIV\/0!|VALUE!|REF!|NAME\?|N\/A|NUM!|CIRC!|ERROR!|NULL!)/i.exec(rest);
                if (m) {
                    push("err", m[0].toUpperCase(), i, i + m[0].length);
                    i += m[0].length;
                    continue;
                }
            }
            // References come first (they can start with digits or quotes)!
            let m = RE_ROWS.exec(rest);
            if (m && (i === 0 || !/[\w.]/.test(src[i - 1]))) {
                const sheet = m[1] !== undefined ? m[1].replace(/''/g, "'") : (m[2] !== undefined ? m[2] : null);
                const a = +m[4], b = +m[6];
                if (a >= 1 && b >= 1) {
                    push("ref", null, i, i + m[0].length, {
                        sheet, kind: "rows", r0: Math.min(a, b), r1: Math.max(a, b), c0: 0, c1: MAX_COL,
                        ar0: !!m[3], ar1: !!m[5], ac0: false, ac1: false,
                    });
                    i += m[0].length;
                    continue;
                }
            }
            m = RE_COLS.exec(rest);
            if (m && (i === 0 || !/[\w.]/.test(src[i - 1]))) {
                const sheet = m[1] !== undefined ? m[1].replace(/''/g, "'") : (m[2] !== undefined ? m[2] : null);
                const a = colToIndex(m[4]), b = colToIndex(m[6]);
                push("ref", null, i, i + m[0].length, {
                    sheet, kind: "cols", r0: 1, r1: 1048576, c0: Math.min(a, b), c1: Math.max(a, b),
                    ar0: false, ar1: false, ac0: !!m[3], ac1: !!m[5],
                });
                i += m[0].length;
                continue;
            }
            m = RE_RANGE.exec(rest);
            if (m && (i === 0 || !/[\w.]/.test(src[i - 1])) && !/^[\w.(]/.test(src.slice(i + m[0].length))) {
                const sheet = m[1] !== undefined ? m[1].replace(/''/g, "'") : (m[2] !== undefined ? m[2] : null);
                const c0 = colToIndex(m[4]), r0 = +m[6];
                if (c0 <= MAX_COL && r0 >= 1) {
                    if (m[8] !== undefined) {
                        const c1 = colToIndex(m[8]), r1 = +m[10];
                        push("ref", null, i, i + m[0].length, {
                            sheet, kind: "range",
                            r0: Math.min(r0, r1), r1: Math.max(r0, r1), c0: Math.min(c0, c1), c1: Math.max(c0, c1),
                            ar0: !!m[5], ac0: !!m[3], ar1: !!m[9], ac1: !!m[7],
                        });
                    }
                    else {
                        push("ref", null, i, i + m[0].length, {
                            sheet, kind: "cell", r0, r1: r0, c0, c1: c0, ar0: !!m[5], ac0: !!m[3], ar1: !!m[5], ac1: !!m[3],
                        });
                    }
                    i += m[0].length;
                    continue;
                }
            }
            m = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(rest);
            if (m) {
                push("num", parseFloat(m[0]), i, i + m[0].length);
                i += m[0].length;
                continue;
            }
            m = /^[A-Za-z_][\w.]*/.exec(rest);
            if (m) {
                push("ident", m[0].toUpperCase(), i, i + m[0].length);
                i += m[0].length;
                continue;
            }
            const two = rest.slice(0, 2);
            if (two === "<>" || two === "<=" || two === ">=") {
                push("op", two, i, i + 2);
                i += 2;
                continue;
            }
            if ("+-*/^&=<>%".indexOf(ch) >= 0) {
                push("op", ch, i, i + 1);
                i++;
                continue;
            }
            if (ch === "(") {
                push("lp", ch, i, i + 1);
                i++;
                continue;
            }
            if (ch === ")") {
                push("rp", ch, i, i + 1);
                i++;
                continue;
            }
            if (ch === "," || ch === ";") {
                push("comma", ch, i, i + 1);
                i++;
                continue;
            }
            push("bad", ch, i, i + 1);
            i++;
        }
        return out;
    }
    class Parser {
        constructor(toks) {
            this.pos = 0;
            this.toks = toks;
        }
        peek() { return this.toks[this.pos]; }
        isOp(...ops) { const t = this.peek(); return !!t && t.t === "op" && ops.indexOf(t.v) >= 0; }
        parse() {
            const n = this.cmp();
            if (this.pos !== this.toks.length)
                fail(ERR.PARSE);
            return n;
        }
        cmp() {
            let l = this.cat();
            while (this.isOp("=", "<>", "<", ">", "<=", ">=")) {
                const op = this.toks[this.pos++].v;
                l = { t: "bin", op, l, r: this.cat() };
            }
            return l;
        }
        cat() {
            let l = this.add();
            while (this.isOp("&")) {
                this.pos++;
                l = { t: "bin", op: "&", l, r: this.add() };
            }
            return l;
        }
        add() {
            let l = this.mul();
            while (this.isOp("+", "-")) {
                const op = this.toks[this.pos++].v;
                l = { t: "bin", op, l, r: this.mul() };
            }
            return l;
        }
        mul() {
            let l = this.pow();
            while (this.isOp("*", "/")) {
                const op = this.toks[this.pos++].v;
                l = { t: "bin", op, l, r: this.pow() };
            }
            return l;
        }
        pow() {
            let l = this.unary();
            while (this.isOp("^")) {
                this.pos++;
                l = { t: "bin", op: "^", l, r: this.unary() };
            }
            return l;
        }
        unary() {
            if (this.isOp("-")) {
                this.pos++;
                return { t: "neg", v: this.unary() };
            }
            if (this.isOp("+")) {
                this.pos++;
                return this.unary();
            }
            let n = this.primary();
            while (this.isOp("%")) {
                this.pos++;
                n = { t: "pct", v: n };
            }
            return n;
        }
        primary() {
            const t = this.toks[this.pos++];
            if (!t)
                fail(ERR.PARSE);
            switch (t.t) {
                case "num": return { t: "num", v: t.v };
                case "str": return { t: "str", v: t.v };
                case "err": return { t: "err", v: ERROR_CODES[t.v] || ERR.PARSE };
                case "ref": return { t: "ref", ref: t.ref };
                case "lp": {
                    const n = this.cmp();
                    const c = this.toks[this.pos++];
                    if (!c || c.t !== "rp")
                        fail(ERR.PARSE);
                    return n;
                }
                case "ident": {
                    const nx = this.peek();
                    if (nx && nx.t === "lp") {
                        this.pos++;
                        const args = [];
                        const close = this.peek();
                        if (close && close.t === "rp") {
                            this.pos++;
                            return { t: "fn", name: t.v, args };
                        }
                        for (;;) {
                            const p = this.peek();
                            if (p && (p.t === "comma" || p.t === "rp"))
                                args.push({ t: "empty" });
                            else
                                args.push(this.cmp());
                            const d = this.toks[this.pos++];
                            if (!d)
                                fail(ERR.PARSE);
                            if (d.t === "rp")
                                break;
                            if (d.t !== "comma")
                                fail(ERR.PARSE);
                        }
                        return { t: "fn", name: t.v, args };
                    }
                    if (t.v === "TRUE")
                        return { t: "bool", v: true };
                    if (t.v === "FALSE")
                        return { t: "bool", v: false };
                    return { t: "name", v: t.v };
                }
            }
            return fail(ERR.PARSE);
        }
    }
    const parseCache = new Map();
    function parseFormula(src) {
        const hit = parseCache.get(src);
        if (hit)
            return hit;
        let res;
        try {
            const toks = tokenize(src);
            if (toks.some((t) => t.t === "bad"))
                res = ERR.PARSE;
            else
                res = new Parser(toks).parse();
        }
        catch (e) {
            res = isErr(e) ? e : ERR.PARSE;
        }
        if (parseCache.size > 5000)
            parseCache.clear();
        parseCache.set(src, res);
        return res;
    }
    function isRange(v) { return !!v && v.ref === true && Array.isArray(v.m); }
    class Ctx {
        constructor(sheets) {
            this.cache = new Map();
            this.visiting = new Set();
            this.hints = [];
            this.sheets = sheets;
            for (let i = 0; i < sheets.length; i++)
                this.hints.push({});
        }
        sheetIndex(name, cur) {
            if (name === null)
                return cur;
            const low = name.toLowerCase();
            for (let i = 0; i < this.sheets.length; i++)
                if (this.sheets[i].name.toLowerCase() === low)
                    return i;
            return -1;
        }
        cell(si, r, c) {
            const id = cellId(c, r);
            const key = si + "|" + id;
            if (this.cache.has(key))
                return this.cache.get(key);
            const raw = this.sheets[si].data[id];
            let val;
            if (raw === undefined || raw === null || raw === "")
                val = null;
            else if (isFormulaText(raw)) {
                if (this.visiting.has(key))
                    return ERR.CIRC;
                this.visiting.add(key);
                const node = parseFormula(raw.slice(1));
                try {
                    if (isErr(node))
                        val = node;
                    else {
                        val = this.evalNode(node, si);
                        if (isRange(val))
                            val = implicit(val);
                        if (val === null)
                            val = 0;
                        const hint = dateHint(node);
                        if (hint)
                            this.hints[si][id] = hint;
                    }
                }
                catch (e) {
                    val = isErr(e) ? e : ERR.VALUE;
                }
                this.visiting.delete(key);
                if (typeof val === "number" && !isFinite(val))
                    val = ERR.NUM;
            }
            else
                val = parseLiteral(raw).value;
            this.cache.set(key, val);
            return val;
        }
        evalNode(n, si) {
            switch (n.t) {
                case "num":
                case "str":
                case "bool": return n.v;
                case "err": return fail(n.v);
                case "empty": return null;
                case "name": return fail(ERR.NAME);
                case "ref": {
                    const tsi = this.sheetIndex(n.ref.sheet, si);
                    if (tsi < 0)
                        return fail(ERR.REF);
                    const sh = this.sheets[tsi];
                    if (n.ref.kind === "cell") {
                        const v = this.cell(tsi, n.ref.r0, n.ref.c0);
                        return v;
                    }
                    const maxR = Math.min(n.ref.r1, Math.max(sh.rows || 0, maxRowOf(sh)));
                    const maxC = Math.min(n.ref.c1, Math.max((sh.cols || 0) - 1, maxColOf(sh)));
                    const m = [];
                    for (let r = n.ref.r0; r <= maxR; r++) {
                        const row = [];
                        for (let c = n.ref.c0; c <= maxC; c++)
                            row.push(this.cell(tsi, r, c));
                        m.push(row);
                    }
                    return { m, ref: true };
                }
                case "neg": return -toNum(this.scalar(n.v, si));
                case "pct": return toNum(this.scalar(n.v, si)) / 100;
                case "bin": return this.bin(n.op, n.l, n.r, si);
                case "fn": {
                    const f = FN[n.name];
                    if (!f)
                        return fail(ERR.NAME);
                    return f.run(n.args, this, si);
                }
            }
        }
        scalar(n, si) {
            let v = this.evalNode(n, si);
            if (isRange(v))
                v = implicit(v);
            if (isErr(v))
                fail(v);
            return v;
        }
        bin(op, ln, rn, si) {
            const l = this.scalar(ln, si), r = this.scalar(rn, si);
            switch (op) {
                case "+": return toNum(l) + toNum(r);
                case "-": return toNum(l) - toNum(r);
                case "*": return toNum(l) * toNum(r);
                case "/": {
                    const d = toNum(r);
                    if (d === 0)
                        fail(ERR.DIV0);
                    return toNum(l) / d;
                }
                case "^": {
                    const v = Math.pow(toNum(l), toNum(r));
                    if (!isFinite(v))
                        fail(ERR.NUM);
                    return v;
                }
                case "&": return toStr(l) + toStr(r);
                default: {
                    const c = compare(l, r);
                    switch (op) {
                        case "=": return c === 0;
                        case "<>": return c !== 0;
                        case "<": return c < 0;
                        case ">": return c > 0;
                        case "<=": return c <= 0;
                        case ">=": return c >= 0;
                    }
                }
            }
            return fail(ERR.VALUE);
        }
    }
    function maxRowOf(sh) {
        let max = 0;
        for (const k of Object.keys(sh.data)) {
            const m = /\d+$/.exec(k);
            if (m && +m[0] > max)
                max = +m[0];
        }
        return max;
    }
    function maxColOf(sh) {
        let max = 0;
        for (const k of Object.keys(sh.data)) {
            const m = /^[A-Z]+/.exec(k);
            if (m) {
                const c = colToIndex(m[0]);
                if (c > max)
                    max = c;
            }
        }
        return max;
    }
    function implicit(r) {
        if (r.m.length === 0 || r.m[0].length === 0)
            return null;
        return r.m[0][0];
    }
    function dateHint(n) {
        if (n.t !== "fn")
            return null;
        if (n.name === "NOW")
            return "datetime";
        if (["TODAY", "DATE", "EDATE", "EOMONTH", "WORKDAY", "DATEVALUE"].indexOf(n.name) >= 0)
            return "date";
        if (n.name === "TIME")
            return "time";
        return null;
    }
    // ---------- coercion ----------
    function toNum(v) {
        if (typeof v === "number")
            return v;
        if (v === null || v === undefined)
            return 0;
        if (typeof v === "boolean")
            return v ? 1 : 0;
        if (isErr(v))
            return fail(v);
        const s = String(v).trim();
        if (s === "")
            return 0;
        const lit = parseLiteral(s);
        if (typeof lit.value === "number")
            return lit.value;
        return fail(ERR.VALUE);
    }
    function toStr(v) {
        if (v === null || v === undefined)
            return "";
        if (typeof v === "boolean")
            return v ? "TRUE" : "FALSE";
        if (typeof v === "number")
            return numText(v);
        if (isErr(v))
            return fail(v);
        return String(v);
    }
    function numText(n) {
        if (Number.isInteger(n))
            return String(n);
        return String(parseFloat(n.toPrecision(15)));
    }
    function toBool(v) {
        if (typeof v === "boolean")
            return v;
        if (typeof v === "number")
            return v !== 0;
        if (v === null || v === undefined)
            return false;
        if (isErr(v))
            return fail(v);
        const s = String(v).toUpperCase();
        if (s === "TRUE")
            return true;
        if (s === "FALSE")
            return false;
        return fail(ERR.VALUE);
    }
    function typeRank(v) {
        if (typeof v === "number" || v === null)
            return 0;
        if (typeof v === "string")
            return 1;
        return 2;
    }
    function compare(a, b) {
        if (a === null && typeof b === "string")
            a = "";
        if (b === null && typeof a === "string")
            b = "";
        if (a === null && typeof b === "boolean")
            a = false;
        if (b === null && typeof a === "boolean")
            b = false;
        const ra = typeRank(a), rb = typeRank(b);
        if (ra !== rb)
            return ra - rb;
        if (ra === 0) {
            const x = a === null ? 0 : a, y = b === null ? 0 : b;
            return x === y ? 0 : x < y ? -1 : 1;
        }
        if (ra === 1) {
            const x = a.toLowerCase(), y = b.toLowerCase();
            return x === y ? 0 : x < y ? -1 : 1;
        }
        return a === b ? 0 : a ? 1 : -1;
    }
    const FN = {};
    function def(names, cat, sig, desc, run) {
        for (const n of names.split(" "))
            FN[n] = { run, cat, sig: sig.replace(/^\w[\w.]*/, n), desc };
    }
    // Every value an argument holds, flattened (ranges keep their blanks as null)!
    function each(args, ctx, si, cb) {
        for (const a of args) {
            if (a.t === "empty")
                continue;
            const v = ctx.evalNode(a, si);
            if (isRange(v)) {
                for (const row of v.m)
                    for (const x of row)
                        cb(x, true);
            }
            else
                cb(v, a.t === "ref");
        }
    }
    function nums(args, ctx, si) {
        const out = [];
        each(args, ctx, si, (v, fromRef) => {
            if (isErr(v))
                fail(v);
            if (typeof v === "number")
                out.push(v);
            else if (!fromRef && v !== null)
                out.push(toNum(v));
        });
        return out;
    }
    function arg(args, i, ctx, si, dflt) {
        const a = args[i];
        if (!a || a.t === "empty") {
            if (dflt === undefined)
                fail(ERR.VALUE);
            return dflt;
        }
        return ctx.scalar(a, si);
    }
    function argNum(args, i, ctx, si, dflt) {
        return toNum(arg(args, i, ctx, si, dflt));
    }
    function argStr(args, i, ctx, si, dflt) {
        return toStr(arg(args, i, ctx, si, dflt));
    }
    function matrix(args, i, ctx, si) {
        const a = args[i];
        if (!a)
            return fail(ERR.VALUE);
        const v = ctx.evalNode(a, si);
        if (isRange(v))
            return v.m;
        return [[v]];
    }
    function flatM(m) { const o = []; for (const r of m)
        for (const x of r)
            o.push(x); return o; }
    function need(args, min, max = 255) {
        if (args.length < min || args.length > max)
            fail(ERR.VALUE);
    }
    // Criteria like ">5", "<>x", "app*", 10 for the *IF functions!
    function criterion(c) {
        if (typeof c === "number" || typeof c === "boolean")
            return (v) => compare(v === null ? null : v, c) === 0 && v !== null;
        const s = toStr(c);
        const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(s);
        const op = m[1] || "=";
        const rhsRaw = m[2];
        const lit = parseLiteral(rhsRaw);
        const rhsNum = typeof lit.value === "number" ? lit.value : null;
        const wild = /[*?]/.test(rhsRaw);
        const re = wild ? new RegExp("^" + rhsRaw.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[\\s\\S]*").replace(/\?/g, ".") + "$", "i") : null;
        return (v) => {
            if (isErr(v))
                return false;
            if (op === "=" || op === "<>") {
                let eq;
                if (rhsRaw === "")
                    eq = v === null || v === "";
                else if (rhsNum !== null)
                    eq = typeof v === "number" ? v === rhsNum : (typeof v === "string" && parseLiteral(v).value === rhsNum);
                else if (re)
                    eq = typeof v === "string" && re.test(v);
                else
                    eq = v !== null && toStrSafe(v).toLowerCase() === rhsRaw.toLowerCase();
                return op === "=" ? eq : !eq;
            }
            if (rhsNum !== null) {
                if (typeof v !== "number")
                    return false;
                return op === "<" ? v < rhsNum : op === ">" ? v > rhsNum : op === "<=" ? v <= rhsNum : v >= rhsNum;
            }
            if (typeof v !== "string")
                return false;
            const cmp = compare(v, rhsRaw);
            return op === "<" ? cmp < 0 : op === ">" ? cmp > 0 : op === "<=" ? cmp <= 0 : cmp >= 0;
        };
    }
    function toStrSafe(v) { try {
        return toStr(v);
    }
    catch (e) {
        return "";
    } }
    function ifsCollect(args, start, ctx, si, shape) {
        // Pairs of (range, criterion) from `start`; returns a mask over the flattened shape!
        let mask = null;
        for (let i = start; i + 1 < args.length; i += 2) {
            const m = matrix(args, i, ctx, si);
            if (shape && (m.length !== shape.length || (m[0] || []).length !== (shape[0] || []).length))
                fail(ERR.VALUE);
            const test = criterion(arg(args, i + 1, ctx, si, ""));
            const flat = flatM(m);
            if (!mask)
                mask = flat.map(() => true);
            flat.forEach((v, k) => { if (!test(v))
                mask[k] = false; });
        }
        return mask || [];
    }
    function roundTo(n, d, mode) {
        const f = Math.pow(10, d);
        const x = n * f;
        let r;
        if (mode === "round")
            r = Math.sign(x) * Math.round(Math.abs(x) + 1e-9);
        else if (mode === "up")
            r = Math.sign(x) * Math.ceil(Math.abs(x) - 1e-9);
        else
            r = Math.sign(x) * Math.floor(Math.abs(x) + 1e-9);
        return r / f;
    }
    function variance(xs, sample) {
        const n = xs.length;
        if (n < (sample ? 2 : 1))
            fail(ERR.DIV0);
        const mean = xs.reduce((a, b) => a + b, 0) / n;
        return xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (sample ? n - 1 : n);
    }
    // ---------- functions: math ----------
    def("SUM", "Math", "SUM(number1, [number2], ...)", "Adds all the numbers!", (a, c, s) => nums(a, c, s).reduce((x, y) => x + y, 0));
    def("PRODUCT", "Math", "PRODUCT(number1, [number2], ...)", "Multiplies all the numbers!", (a, c, s) => nums(a, c, s).reduce((x, y) => x * y, 1));
    def("SUMPRODUCT", "Math", "SUMPRODUCT(array1, [array2], ...)", "Multiplies matching items and adds the products!", (a, c, s) => {
        const ms = a.map((_, i) => flatM(matrix(a, i, c, s)));
        const n = ms[0].length;
        if (ms.some((m) => m.length !== n))
            fail(ERR.VALUE);
        let tot = 0;
        for (let i = 0; i < n; i++) {
            let p = 1;
            for (const m of ms)
                p *= typeof m[i] === "number" ? m[i] : 0;
            tot += p;
        }
        return tot;
    });
    def("SUMIF", "Math", "SUMIF(range, criteria, [sum_range])", "Adds the cells that meet a condition!", (a, c, s) => {
        need(a, 2, 3);
        const rng = flatM(matrix(a, 0, c, s));
        const sum = a[2] ? flatM(matrix(a, 2, c, s)) : rng;
        const test = criterion(arg(a, 1, c, s, ""));
        let t = 0;
        rng.forEach((v, i) => { if (test(v) && typeof sum[i] === "number")
            t += sum[i]; });
        return t;
    });
    def("SUMIFS", "Math", "SUMIFS(sum_range, criteria_range1, criteria1, ...)", "Adds the cells that meet every condition!", (a, c, s) => {
        const shape = matrix(a, 0, c, s);
        const vals = flatM(shape);
        const mask = ifsCollect(a, 1, c, s, shape);
        return vals.reduce((t, v, i) => t + (mask[i] && typeof v === "number" ? v : 0), 0);
    });
    def("ABS", "Math", "ABS(number)", "The number without its sign!", (a, c, s) => Math.abs(argNum(a, 0, c, s)));
    def("ROUND", "Math", "ROUND(number, digits)", "Rounds to a number of digits!", (a, c, s) => roundTo(argNum(a, 0, c, s), argNum(a, 1, c, s, 0), "round"));
    def("ROUNDUP", "Math", "ROUNDUP(number, digits)", "Rounds away from zero!", (a, c, s) => roundTo(argNum(a, 0, c, s), argNum(a, 1, c, s, 0), "up"));
    def("ROUNDDOWN", "Math", "ROUNDDOWN(number, digits)", "Rounds toward zero!", (a, c, s) => roundTo(argNum(a, 0, c, s), argNum(a, 1, c, s, 0), "down"));
    def("INT", "Math", "INT(number)", "Rounds down to the nearest whole number!", (a, c, s) => Math.floor(argNum(a, 0, c, s)));
    def("TRUNC", "Math", "TRUNC(number, [digits])", "Cuts off the decimal part!", (a, c, s) => roundTo(argNum(a, 0, c, s), argNum(a, 1, c, s, 0), "down"));
    def("MOD", "Math", "MOD(number, divisor)", "The remainder after dividing!", (a, c, s) => {
        const n = argNum(a, 0, c, s), d = argNum(a, 1, c, s);
        if (d === 0)
            fail(ERR.DIV0);
        return n - d * Math.floor(n / d);
    });
    def("POWER", "Math", "POWER(number, power)", "Raises a number to a power!", (a, c, s) => Math.pow(argNum(a, 0, c, s), argNum(a, 1, c, s)));
    def("SQRT", "Math", "SQRT(number)", "The square root!", (a, c, s) => { const n = argNum(a, 0, c, s); if (n < 0)
        fail(ERR.NUM); return Math.sqrt(n); });
    def("EXP", "Math", "EXP(number)", "e raised to a power!", (a, c, s) => Math.exp(argNum(a, 0, c, s)));
    def("LN", "Math", "LN(number)", "The natural logarithm!", (a, c, s) => { const n = argNum(a, 0, c, s); if (n <= 0)
        fail(ERR.NUM); return Math.log(n); });
    def("LOG", "Math", "LOG(number, [base])", "The logarithm in a base (10 by default)!", (a, c, s) => {
        const n = argNum(a, 0, c, s), b = argNum(a, 1, c, s, 10);
        if (n <= 0 || b <= 0 || b === 1)
            fail(ERR.NUM);
        return Math.log(n) / Math.log(b);
    });
    def("LOG10", "Math", "LOG10(number)", "The base-10 logarithm!", (a, c, s) => { const n = argNum(a, 0, c, s); if (n <= 0)
        fail(ERR.NUM); return Math.log10(n); });
    def("PI", "Math", "PI()", "The number pi!", () => Math.PI);
    def("RAND", "Math", "RAND()", "A random number from 0 to 1!", () => Math.random());
    def("RANDBETWEEN", "Math", "RANDBETWEEN(bottom, top)", "A random whole number between two numbers!", (a, c, s) => {
        const lo = Math.ceil(argNum(a, 0, c, s)), hi = Math.floor(argNum(a, 1, c, s));
        if (hi < lo)
            fail(ERR.NUM);
        return lo + Math.floor(Math.random() * (hi - lo + 1));
    });
    def("CEILING", "Math", "CEILING(number, [significance])", "Rounds up to a multiple!", (a, c, s) => {
        const n = argNum(a, 0, c, s), m = argNum(a, 1, c, s, 1);
        return m === 0 ? 0 : Math.ceil(n / m - 1e-12) * m;
    });
    def("FLOOR", "Math", "FLOOR(number, [significance])", "Rounds down to a multiple!", (a, c, s) => {
        const n = argNum(a, 0, c, s), m = argNum(a, 1, c, s, 1);
        if (m === 0)
            fail(ERR.DIV0);
        return Math.floor(n / m + 1e-12) * m;
    });
    def("MROUND", "Math", "MROUND(number, multiple)", "Rounds to the nearest multiple!", (a, c, s) => {
        const n = argNum(a, 0, c, s), m = argNum(a, 1, c, s);
        return m === 0 ? 0 : Math.round(n / m) * m;
    });
    def("SIGN", "Math", "SIGN(number)", "1, 0 or -1 depending on the sign!", (a, c, s) => Math.sign(argNum(a, 0, c, s)));
    def("FACT", "Math", "FACT(number)", "The factorial!", (a, c, s) => {
        const n = Math.floor(argNum(a, 0, c, s));
        if (n < 0)
            fail(ERR.NUM);
        let f = 1;
        for (let i = 2; i <= n; i++)
            f *= i;
        return f;
    });
    def("GCD", "Math", "GCD(number1, [number2], ...)", "The greatest common divisor!", (a, c, s) => {
        const g = (x, y) => (y ? g(y, x % y) : x);
        return nums(a, c, s).map((x) => Math.floor(Math.abs(x))).reduce((x, y) => g(x, y), 0);
    });
    def("LCM", "Math", "LCM(number1, [number2], ...)", "The least common multiple!", (a, c, s) => {
        const g = (x, y) => (y ? g(y, x % y) : x);
        return nums(a, c, s).map((x) => Math.floor(Math.abs(x))).reduce((x, y) => (x && y ? (x * y) / g(x, y) : 0), 1);
    });
    def("EVEN", "Math", "EVEN(number)", "Rounds up to the next even number!", (a, c, s) => { const n = argNum(a, 0, c, s); const v = Math.ceil(Math.abs(n) / 2) * 2; return n < 0 ? -v : v; });
    def("ODD", "Math", "ODD(number)", "Rounds up to the next odd number!", (a, c, s) => {
        const n = argNum(a, 0, c, s);
        let v = Math.ceil(Math.abs(n));
        if (v % 2 === 0)
            v++;
        return n < 0 ? -v : v;
    });
    def("DEGREES", "Math", "DEGREES(angle)", "Radians to degrees!", (a, c, s) => (argNum(a, 0, c, s) * 180) / Math.PI);
    def("RADIANS", "Math", "RADIANS(angle)", "Degrees to radians!", (a, c, s) => (argNum(a, 0, c, s) * Math.PI) / 180);
    def("SIN", "Math", "SIN(angle)", "The sine of an angle in radians!", (a, c, s) => Math.sin(argNum(a, 0, c, s)));
    def("COS", "Math", "COS(angle)", "The cosine of an angle in radians!", (a, c, s) => Math.cos(argNum(a, 0, c, s)));
    def("TAN", "Math", "TAN(angle)", "The tangent of an angle in radians!", (a, c, s) => Math.tan(argNum(a, 0, c, s)));
    // ---------- functions: statistics ----------
    def("AVERAGE AVG", "Statistical", "AVERAGE(number1, [number2], ...)", "The average (mean)!", (a, c, s) => {
        const xs = nums(a, c, s);
        if (!xs.length)
            fail(ERR.DIV0);
        return xs.reduce((x, y) => x + y, 0) / xs.length;
    });
    def("AVERAGEIF", "Statistical", "AVERAGEIF(range, criteria, [average_range])", "The average of cells that meet a condition!", (a, c, s) => {
        const rng = flatM(matrix(a, 0, c, s));
        const av = a[2] ? flatM(matrix(a, 2, c, s)) : rng;
        const test = criterion(arg(a, 1, c, s, ""));
        let t = 0, n = 0;
        rng.forEach((v, i) => { if (test(v) && typeof av[i] === "number") {
            t += av[i];
            n++;
        } });
        if (!n)
            fail(ERR.DIV0);
        return t / n;
    });
    def("AVERAGEIFS", "Statistical", "AVERAGEIFS(average_range, criteria_range1, criteria1, ...)", "The average of cells that meet every condition!", (a, c, s) => {
        const shape = matrix(a, 0, c, s);
        const vals = flatM(shape);
        const mask = ifsCollect(a, 1, c, s, shape);
        let t = 0, n = 0;
        vals.forEach((v, i) => { if (mask[i] && typeof v === "number") {
            t += v;
            n++;
        } });
        if (!n)
            fail(ERR.DIV0);
        return t / n;
    });
    def("MEDIAN", "Statistical", "MEDIAN(number1, [number2], ...)", "The middle number!", (a, c, s) => {
        const xs = nums(a, c, s).sort((x, y) => x - y);
        if (!xs.length)
            fail(ERR.NUM);
        const h = Math.floor(xs.length / 2);
        return xs.length % 2 ? xs[h] : (xs[h - 1] + xs[h]) / 2;
    });
    def("MODE", "Statistical", "MODE(number1, [number2], ...)", "The most common number!", (a, c, s) => {
        const xs = nums(a, c, s);
        const cnt = new Map();
        let best = null, bn = 1;
        for (const x of xs) {
            const k = (cnt.get(x) || 0) + 1;
            cnt.set(x, k);
            if (k > bn) {
                bn = k;
                best = x;
            }
        }
        if (best === null)
            fail(ERR.NA);
        return best;
    });
    def("MIN", "Statistical", "MIN(number1, [number2], ...)", "The smallest number!", (a, c, s) => { const xs = nums(a, c, s); return xs.length ? Math.min(...xs) : 0; });
    def("MAX", "Statistical", "MAX(number1, [number2], ...)", "The largest number!", (a, c, s) => { const xs = nums(a, c, s); return xs.length ? Math.max(...xs) : 0; });
    def("MINIFS", "Statistical", "MINIFS(min_range, criteria_range1, criteria1, ...)", "The smallest number that meets every condition!", (a, c, s) => {
        const shape = matrix(a, 0, c, s);
        const mask = ifsCollect(a, 1, c, s, shape);
        const xs = flatM(shape).filter((v, i) => mask[i] && typeof v === "number");
        return xs.length ? Math.min(...xs) : 0;
    });
    def("MAXIFS", "Statistical", "MAXIFS(max_range, criteria_range1, criteria1, ...)", "The largest number that meets every condition!", (a, c, s) => {
        const shape = matrix(a, 0, c, s);
        const mask = ifsCollect(a, 1, c, s, shape);
        const xs = flatM(shape).filter((v, i) => mask[i] && typeof v === "number");
        return xs.length ? Math.max(...xs) : 0;
    });
    def("COUNT", "Statistical", "COUNT(value1, [value2], ...)", "Counts the cells that hold numbers!", (a, c, s) => {
        let n = 0;
        each(a, c, s, (v, fromRef) => { if (typeof v === "number")
            n++;
        else if (!fromRef && v !== null && !isErr(v) && typeof parseLiteral(v).value === "number")
            n++; });
        return n;
    });
    def("COUNTA", "Statistical", "COUNTA(value1, [value2], ...)", "Counts the cells that are not empty!", (a, c, s) => {
        let n = 0;
        each(a, c, s, (v) => { if (v !== null && v !== "")
            n++; });
        return n;
    });
    def("COUNTBLANK", "Statistical", "COUNTBLANK(range)", "Counts the empty cells!", (a, c, s) => flatM(matrix(a, 0, c, s)).filter((v) => v === null || v === "").length);
    def("COUNTIF", "Statistical", "COUNTIF(range, criteria)", "Counts the cells that meet a condition!", (a, c, s) => {
        need(a, 2, 2);
        const test = criterion(arg(a, 1, c, s, ""));
        return flatM(matrix(a, 0, c, s)).filter(test).length;
    });
    def("COUNTIFS", "Statistical", "COUNTIFS(criteria_range1, criteria1, ...)", "Counts the cells that meet every condition!", (a, c, s) => ifsCollect(a, 0, c, s, null).filter(Boolean).length);
    def("STDEV STDEV.S", "Statistical", "STDEV(number1, [number2], ...)", "Standard deviation of a sample!", (a, c, s) => Math.sqrt(variance(nums(a, c, s), true)));
    def("STDEV.P STDEVP", "Statistical", "STDEV.P(number1, [number2], ...)", "Standard deviation of a whole population!", (a, c, s) => Math.sqrt(variance(nums(a, c, s), false)));
    def("VAR VAR.S", "Statistical", "VAR(number1, [number2], ...)", "Variance of a sample!", (a, c, s) => variance(nums(a, c, s), true));
    def("VAR.P VARP", "Statistical", "VAR.P(number1, [number2], ...)", "Variance of a whole population!", (a, c, s) => variance(nums(a, c, s), false));
    def("LARGE", "Statistical", "LARGE(array, k)", "The k-th largest number!", (a, c, s) => {
        const xs = flatM(matrix(a, 0, c, s)).filter((v) => typeof v === "number").sort((x, y) => y - x);
        const k = Math.floor(argNum(a, 1, c, s));
        if (k < 1 || k > xs.length)
            fail(ERR.NUM);
        return xs[k - 1];
    });
    def("SMALL", "Statistical", "SMALL(array, k)", "The k-th smallest number!", (a, c, s) => {
        const xs = flatM(matrix(a, 0, c, s)).filter((v) => typeof v === "number").sort((x, y) => x - y);
        const k = Math.floor(argNum(a, 1, c, s));
        if (k < 1 || k > xs.length)
            fail(ERR.NUM);
        return xs[k - 1];
    });
    def("RANK RANK.EQ", "Statistical", "RANK(number, ref, [order])", "The rank of a number in a list!", (a, c, s) => {
        const n = argNum(a, 0, c, s);
        const xs = flatM(matrix(a, 1, c, s)).filter((v) => typeof v === "number");
        const asc = argNum(a, 2, c, s, 0) !== 0;
        if (xs.indexOf(n) < 0)
            fail(ERR.NA);
        return 1 + xs.filter((x) => (asc ? x < n : x > n)).length;
    });
    def("CORREL", "Statistical", "CORREL(array1, array2)", "How closely two lists move together (-1 to 1)!", (a, c, s) => {
        const x = flatM(matrix(a, 0, c, s)), y = flatM(matrix(a, 1, c, s));
        if (x.length !== y.length)
            fail(ERR.NA);
        const px = [], py = [];
        x.forEach((v, i) => { if (typeof v === "number" && typeof y[i] === "number") {
            px.push(v);
            py.push(y[i]);
        } });
        if (px.length < 2)
            fail(ERR.DIV0);
        const mx = px.reduce((p, q) => p + q, 0) / px.length, my = py.reduce((p, q) => p + q, 0) / py.length;
        let sxy = 0, sxx = 0, syy = 0;
        px.forEach((v, i) => { sxy += (v - mx) * (py[i] - my); sxx += (v - mx) ** 2; syy += (py[i] - my) ** 2; });
        if (!sxx || !syy)
            fail(ERR.DIV0);
        return sxy / Math.sqrt(sxx * syy);
    });
    // ---------- functions: logic ----------
    def("IF", "Logical", "IF(test, value_if_true, [value_if_false])", "Picks a value depending on a test!", (a, c, s) => {
        need(a, 1, 3);
        const t = toBool(arg(a, 0, c, s));
        if (t)
            return a[1] && a[1].t !== "empty" ? c.scalar(a[1], s) : (a[1] ? 0 : true);
        return a.length > 2 ? (a[2].t === "empty" ? 0 : c.scalar(a[2], s)) : false;
    });
    def("IFS", "Logical", "IFS(test1, value1, [test2, value2], ...)", "The value for the first test that is TRUE!", (a, c, s) => {
        for (let i = 0; i + 1 < a.length; i += 2)
            if (toBool(arg(a, i, c, s)))
                return c.scalar(a[i + 1], s);
        return fail(ERR.NA);
    });
    def("IFERROR", "Logical", "IFERROR(value, value_if_error)", "A fallback when something errors!", (a, c, s) => {
        try {
            return c.scalar(a[0], s);
        }
        catch (e) {
            if (isErr(e))
                return arg(a, 1, c, s, "");
            throw e;
        }
    });
    def("IFNA", "Logical", "IFNA(value, value_if_na)", "A fallback for #N/A!", (a, c, s) => {
        try {
            return c.scalar(a[0], s);
        }
        catch (e) {
            if (e === ERR.NA)
                return arg(a, 1, c, s, "");
            throw e;
        }
    });
    def("AND", "Logical", "AND(logical1, [logical2], ...)", "TRUE when everything is TRUE!", (a, c, s) => {
        let r = true, any = false;
        each(a, c, s, (v) => { if (v === null)
            return; any = true; if (!toBool(v))
            r = false; });
        if (!any)
            fail(ERR.VALUE);
        return r;
    });
    def("OR", "Logical", "OR(logical1, [logical2], ...)", "TRUE when anything is TRUE!", (a, c, s) => {
        let r = false, any = false;
        each(a, c, s, (v) => { if (v === null)
            return; any = true; if (toBool(v))
            r = true; });
        if (!any)
            fail(ERR.VALUE);
        return r;
    });
    def("XOR", "Logical", "XOR(logical1, [logical2], ...)", "TRUE when an odd number of things are TRUE!", (a, c, s) => {
        let n = 0;
        each(a, c, s, (v) => { if (v !== null && toBool(v))
            n++; });
        return n % 2 === 1;
    });
    def("NOT", "Logical", "NOT(logical)", "Flips TRUE and FALSE!", (a, c, s) => !toBool(arg(a, 0, c, s)));
    def("TRUE", "Logical", "TRUE()", "The value TRUE!", () => true);
    def("FALSE", "Logical", "FALSE()", "The value FALSE!", () => false);
    def("SWITCH", "Logical", "SWITCH(value, match1, result1, ..., [default])", "Matches a value against a list!", (a, c, s) => {
        const v = arg(a, 0, c, s);
        let i = 1;
        for (; i + 1 < a.length; i += 2)
            if (compare(v, arg(a, i, c, s)) === 0)
                return c.scalar(a[i + 1], s);
        if (i < a.length)
            return c.scalar(a[i], s);
        return fail(ERR.NA);
    });
    def("CHOOSE", "Logical", "CHOOSE(index, value1, [value2], ...)", "Picks a value by its position!", (a, c, s) => {
        const i = Math.floor(argNum(a, 0, c, s));
        if (i < 1 || i >= a.length)
            fail(ERR.VALUE);
        return c.scalar(a[i], s);
    });
    // ---------- functions: info ----------
    def("ISBLANK", "Information", "ISBLANK(value)", "TRUE for an empty cell!", (a, c, s) => { const v = c.evalNode(a[0], s); return (isRange(v) ? implicit(v) : v) === null; });
    def("ISNUMBER", "Information", "ISNUMBER(value)", "TRUE for a number!", (a, c, s) => { try {
        return typeof c.scalar(a[0], s) === "number";
    }
    catch (e) {
        return false;
    } });
    def("ISTEXT", "Information", "ISTEXT(value)", "TRUE for text!", (a, c, s) => { try {
        return typeof c.scalar(a[0], s) === "string";
    }
    catch (e) {
        return false;
    } });
    def("ISLOGICAL", "Information", "ISLOGICAL(value)", "TRUE for TRUE or FALSE!", (a, c, s) => { try {
        return typeof c.scalar(a[0], s) === "boolean";
    }
    catch (e) {
        return false;
    } });
    def("ISERROR", "Information", "ISERROR(value)", "TRUE for any error!", (a, c, s) => { try {
        c.scalar(a[0], s);
        return false;
    }
    catch (e) {
        return isErr(e);
    } });
    def("ISNA", "Information", "ISNA(value)", "TRUE for #N/A!", (a, c, s) => { try {
        c.scalar(a[0], s);
        return false;
    }
    catch (e) {
        return e === ERR.NA;
    } });
    def("ISEVEN", "Information", "ISEVEN(number)", "TRUE for an even number!", (a, c, s) => Math.floor(Math.abs(argNum(a, 0, c, s))) % 2 === 0);
    def("ISODD", "Information", "ISODD(number)", "TRUE for an odd number!", (a, c, s) => Math.floor(Math.abs(argNum(a, 0, c, s))) % 2 === 1);
    def("NA", "Information", "NA()", "The #N/A error!", () => fail(ERR.NA));
    // ---------- functions: text ----------
    def("CONCAT CONCATENATE", "Text", "CONCAT(text1, [text2], ...)", "Joins text together!", (a, c, s) => {
        let out = "";
        each(a, c, s, (v) => { out += toStr(v); });
        return out;
    });
    def("TEXTJOIN", "Text", "TEXTJOIN(delimiter, ignore_empty, text1, ...)", "Joins text with a separator!", (a, c, s) => {
        const d = argStr(a, 0, c, s, ""), skip = toBool(arg(a, 1, c, s, true));
        const parts = [];
        each(a.slice(2), c, s, (v) => { const t = toStr(v); if (!(skip && t === ""))
            parts.push(t); });
        return parts.join(d);
    });
    def("LEN", "Text", "LEN(text)", "The number of characters!", (a, c, s) => argStr(a, 0, c, s).length);
    def("LEFT", "Text", "LEFT(text, [count])", "Characters from the start!", (a, c, s) => argStr(a, 0, c, s).slice(0, Math.max(0, argNum(a, 1, c, s, 1))));
    def("RIGHT", "Text", "RIGHT(text, [count])", "Characters from the end!", (a, c, s) => {
        const t = argStr(a, 0, c, s), n = Math.max(0, argNum(a, 1, c, s, 1));
        return n ? t.slice(-n) : "";
    });
    def("MID", "Text", "MID(text, start, count)", "Characters from the middle!", (a, c, s) => {
        const st = argNum(a, 1, c, s);
        if (st < 1)
            fail(ERR.VALUE);
        return argStr(a, 0, c, s).substr(st - 1, Math.max(0, argNum(a, 2, c, s)));
    });
    def("UPPER", "Text", "UPPER(text)", "Makes text UPPERCASE!", (a, c, s) => argStr(a, 0, c, s).toUpperCase());
    def("LOWER", "Text", "LOWER(text)", "Makes text lowercase!", (a, c, s) => argStr(a, 0, c, s).toLowerCase());
    def("PROPER", "Text", "PROPER(text)", "Capitalizes Each Word!", (a, c, s) => argStr(a, 0, c, s).toLowerCase().replace(/(^|[^A-Za-z])([a-z])/g, (m, p, l) => p + l.toUpperCase()));
    def("TRIM", "Text", "TRIM(text)", "Removes extra spaces!", (a, c, s) => argStr(a, 0, c, s).replace(/ +/g, " ").trim());
    def("SUBSTITUTE", "Text", "SUBSTITUTE(text, old, new, [instance])", "Swaps text for other text!", (a, c, s) => {
        const t = argStr(a, 0, c, s), o = argStr(a, 1, c, s), n = argStr(a, 2, c, s);
        if (!o)
            return t;
        if (a[3]) {
            const k = argNum(a, 3, c, s);
            let idx = -1;
            for (let i = 0; i < k; i++) {
                idx = t.indexOf(o, idx + 1);
                if (idx < 0)
                    return t;
            }
            return t.slice(0, idx) + n + t.slice(idx + o.length);
        }
        return t.split(o).join(n);
    });
    def("REPLACE", "Text", "REPLACE(text, start, count, new_text)", "Replaces characters by position!", (a, c, s) => {
        const t = argStr(a, 0, c, s), st = argNum(a, 1, c, s), n = argNum(a, 2, c, s);
        return t.slice(0, st - 1) + argStr(a, 3, c, s) + t.slice(st - 1 + n);
    });
    def("FIND", "Text", "FIND(find_text, within_text, [start])", "Where text appears (case-sensitive)!", (a, c, s) => {
        const i = argStr(a, 1, c, s).indexOf(argStr(a, 0, c, s), argNum(a, 2, c, s, 1) - 1);
        if (i < 0)
            fail(ERR.VALUE);
        return i + 1;
    });
    def("SEARCH", "Text", "SEARCH(find_text, within_text, [start])", "Where text appears (any case, wildcards)!", (a, c, s) => {
        const pat = argStr(a, 0, c, s);
        const re = new RegExp(pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[\\s\\S]*").replace(/\?/g, "."), "i");
        const from = argNum(a, 2, c, s, 1) - 1;
        const m = re.exec(argStr(a, 1, c, s).slice(from));
        if (!m)
            fail(ERR.VALUE);
        return m.index + from + 1;
    });
    def("REPT", "Text", "REPT(text, times)", "Repeats text!", (a, c, s) => argStr(a, 0, c, s).repeat(Math.max(0, Math.min(10000, Math.floor(argNum(a, 1, c, s))))));
    def("EXACT", "Text", "EXACT(text1, text2)", "TRUE when two texts match exactly!", (a, c, s) => argStr(a, 0, c, s) === argStr(a, 1, c, s));
    def("VALUE", "Text", "VALUE(text)", "Turns text into a number!", (a, c, s) => toNum(argStr(a, 0, c, s)));
    def("CHAR", "Text", "CHAR(number)", "The character for a code!", (a, c, s) => String.fromCharCode(argNum(a, 0, c, s)));
    def("CODE", "Text", "CODE(text)", "The code of the first character!", (a, c, s) => { const t = argStr(a, 0, c, s); if (!t)
        fail(ERR.VALUE); return t.charCodeAt(0); });
    def("TEXT", "Text", "TEXT(value, format)", "Formats a number as text (like \"0.00\" or \"yyyy-mm-dd\")!", (a, c, s) => formatPattern(arg(a, 0, c, s), argStr(a, 1, c, s)));
    // ---------- functions: lookup ----------
    def("VLOOKUP", "Lookup", "VLOOKUP(value, table, column, [approximate])", "Finds a row by its first column!", (a, c, s) => {
        const v = arg(a, 0, c, s), t = matrix(a, 1, c, s), col = Math.floor(argNum(a, 2, c, s));
        const approx = a[3] ? toBool(arg(a, 3, c, s, true)) : true;
        if (col < 1 || col > (t[0] || []).length)
            fail(ERR.REF);
        const i = lookupIndex(v, t.map((r) => r[0]), approx);
        return t[i][col - 1];
    });
    def("HLOOKUP", "Lookup", "HLOOKUP(value, table, row, [approximate])", "Finds a column by its first row!", (a, c, s) => {
        const v = arg(a, 0, c, s), t = matrix(a, 1, c, s), row = Math.floor(argNum(a, 2, c, s));
        const approx = a[3] ? toBool(arg(a, 3, c, s, true)) : true;
        if (row < 1 || row > t.length)
            fail(ERR.REF);
        const i = lookupIndex(v, t[0] || [], approx);
        return t[row - 1][i];
    });
    def("XLOOKUP", "Lookup", "XLOOKUP(value, lookup_array, return_array, [if_not_found])", "Finds a match and returns the matching item!", (a, c, s) => {
        const v = arg(a, 0, c, s), look = flatM(matrix(a, 1, c, s)), ret = flatM(matrix(a, 2, c, s));
        for (let i = 0; i < look.length; i++)
            if (look[i] !== null && compare(look[i], v) === 0)
                return ret[i] === undefined ? fail(ERR.NA) : ret[i];
        if (a[3] && a[3].t !== "empty")
            return c.scalar(a[3], s);
        return fail(ERR.NA);
    });
    def("MATCH", "Lookup", "MATCH(value, range, [type])", "The position of a value in a list!", (a, c, s) => {
        const v = arg(a, 0, c, s), list = flatM(matrix(a, 1, c, s)), type = argNum(a, 2, c, s, 1);
        if (type === 0) {
            const test = typeof v === "string" ? criterion(v) : (x) => x !== null && compare(x, v) === 0;
            for (let i = 0; i < list.length; i++)
                if (test(list[i]))
                    return i + 1;
            return fail(ERR.NA);
        }
        let best = -1;
        for (let i = 0; i < list.length; i++) {
            if (list[i] === null)
                continue;
            const cmp = compare(list[i], v);
            if (type > 0 ? cmp <= 0 : cmp >= 0)
                best = i;
            else
                break;
        }
        if (best < 0)
            fail(ERR.NA);
        return best + 1;
    });
    def("INDEX", "Lookup", "INDEX(range, row, [column])", "The value at a position in a range!", (a, c, s) => {
        const m = matrix(a, 0, c, s);
        let r = Math.floor(argNum(a, 1, c, s, 0)), col = Math.floor(argNum(a, 2, c, s, 0));
        if (m.length === 1 && a.length === 2) {
            col = r;
            r = 1;
        }
        if (r === 0)
            r = 1;
        if (col === 0)
            col = 1;
        if (r < 1 || r > m.length || col < 1 || col > (m[0] || []).length)
            fail(ERR.REF);
        return m[r - 1][col - 1];
    });
    def("ROW", "Lookup", "ROW([reference])", "The row number of a reference!", (a) => {
        if (!a[0] || a[0].t !== "ref")
            return fail(ERR.VALUE);
        return a[0].ref.r0;
    });
    def("COLUMN", "Lookup", "COLUMN([reference])", "The column number of a reference!", (a) => {
        if (!a[0] || a[0].t !== "ref")
            return fail(ERR.VALUE);
        return a[0].ref.c0 + 1;
    });
    def("ROWS", "Lookup", "ROWS(range)", "How many rows a range has!", (a, c, s) => matrix(a, 0, c, s).length);
    def("COLUMNS", "Lookup", "COLUMNS(range)", "How many columns a range has!", (a, c, s) => (matrix(a, 0, c, s)[0] || []).length);
    function lookupIndex(v, list, approx) {
        if (!approx) {
            const test = typeof v === "string" ? criterion(v) : (x) => x !== null && compare(x, v) === 0;
            for (let i = 0; i < list.length; i++)
                if (test(list[i]))
                    return i;
            return fail(ERR.NA);
        }
        let best = -1;
        for (let i = 0; i < list.length; i++) {
            if (list[i] === null)
                continue;
            if (compare(list[i], v) <= 0)
                best = i;
            else
                break;
        }
        if (best < 0)
            fail(ERR.NA);
        return best;
    }
    // ---------- functions: date & time ----------
    function nowSerial() {
        const d = new Date();
        return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) - EPOCH) / DAY_MS;
    }
    def("TODAY", "Date", "TODAY()", "Today's date!", () => Math.floor(nowSerial()));
    def("NOW", "Date", "NOW()", "The date and time right now!", () => nowSerial());
    def("DATE", "Date", "DATE(year, month, day)", "Builds a date!", (a, c, s) => {
        const y = Math.floor(argNum(a, 0, c, s)), m = Math.floor(argNum(a, 1, c, s)), d = Math.floor(argNum(a, 2, c, s));
        return Math.round((Date.UTC(y < 1900 ? y + 1900 : y, m - 1, d) - EPOCH) / DAY_MS);
    });
    def("TIME", "Date", "TIME(hour, minute, second)", "Builds a time!", (a, c, s) => {
        const v = (argNum(a, 0, c, s) * 3600 + argNum(a, 1, c, s) * 60 + argNum(a, 2, c, s)) / 86400;
        return v - Math.floor(v);
    });
    def("DATEVALUE", "Date", "DATEVALUE(text)", "Turns date text into a date!", (a, c, s) => {
        const lit = parseLiteral(argStr(a, 0, c, s));
        if (lit.fmt !== "date")
            fail(ERR.VALUE);
        return lit.value;
    });
    def("YEAR", "Date", "YEAR(date)", "The year of a date!", (a, c, s) => serialToDate(argNum(a, 0, c, s)).getUTCFullYear());
    def("MONTH", "Date", "MONTH(date)", "The month of a date (1-12)!", (a, c, s) => serialToDate(argNum(a, 0, c, s)).getUTCMonth() + 1);
    def("DAY", "Date", "DAY(date)", "The day of the month!", (a, c, s) => serialToDate(argNum(a, 0, c, s)).getUTCDate());
    def("WEEKDAY", "Date", "WEEKDAY(date, [type])", "The day of the week (Sunday = 1)!", (a, c, s) => {
        const d = serialToDate(argNum(a, 0, c, s)).getUTCDay(), t = argNum(a, 1, c, s, 1);
        if (t === 2)
            return d === 0 ? 7 : d;
        if (t === 3)
            return d === 0 ? 6 : d - 1;
        return d + 1;
    });
    def("HOUR", "Date", "HOUR(time)", "The hour (0-23)!", (a, c, s) => Math.floor(((argNum(a, 0, c, s) % 1) * 24) + 1e-9));
    def("MINUTE", "Date", "MINUTE(time)", "The minute (0-59)!", (a, c, s) => Math.floor((((argNum(a, 0, c, s) % 1) * 1440) + 1e-9) % 60));
    def("SECOND", "Date", "SECOND(time)", "The second (0-59)!", (a, c, s) => Math.round(((argNum(a, 0, c, s) % 1) * 86400)) % 60);
    def("DAYS", "Date", "DAYS(end_date, start_date)", "Days between two dates!", (a, c, s) => Math.floor(argNum(a, 0, c, s)) - Math.floor(argNum(a, 1, c, s)));
    def("EDATE", "Date", "EDATE(start_date, months)", "A date some months away!", (a, c, s) => {
        const d = serialToDate(argNum(a, 0, c, s)), m = Math.floor(argNum(a, 1, c, s));
        const y = d.getUTCFullYear(), mo = d.getUTCMonth() + m;
        const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
        return Math.round((Date.UTC(y, mo, Math.min(d.getUTCDate(), last)) - EPOCH) / DAY_MS);
    });
    def("EOMONTH", "Date", "EOMONTH(start_date, months)", "The last day of a month some months away!", (a, c, s) => {
        const d = serialToDate(argNum(a, 0, c, s)), m = Math.floor(argNum(a, 1, c, s));
        return Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m + 1, 0) - EPOCH) / DAY_MS);
    });
    def("NETWORKDAYS", "Date", "NETWORKDAYS(start_date, end_date)", "Weekdays between two dates (inclusive)!", (a, c, s) => {
        let x = Math.floor(argNum(a, 0, c, s)), y = Math.floor(argNum(a, 1, c, s)), sign = 1;
        if (y < x) {
            const t = x;
            x = y;
            y = t;
            sign = -1;
        }
        let n = 0;
        for (let d = x; d <= y && d - x < 100000; d++) {
            const w = serialToDate(d).getUTCDay();
            if (w !== 0 && w !== 6)
                n++;
        }
        return n * sign;
    });
    // ---------- TEXT() patterns ----------
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const DAYS_N = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    function formatPattern(v, pat) {
        if (/[ymdhs]/i.test(pat.replace(/"[^"]*"/g, ""))) {
            const n = toNum(v), d = new Date(EPOCH + Math.round(n * DAY_MS));
            const pad = (x, w = 2) => String(x).padStart(w, "0");
            return pat.replace(/yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|AM\/PM|"[^"]*"/gi, (tok) => {
                const lo = tok.toLowerCase();
                if (tok[0] === '"')
                    return tok.slice(1, -1);
                if (lo === "yyyy")
                    return String(d.getUTCFullYear());
                if (lo === "yy")
                    return pad(d.getUTCFullYear() % 100);
                if (lo === "mmmm")
                    return MONTHS[d.getUTCMonth()];
                if (lo === "mmm")
                    return MONTHS[d.getUTCMonth()].slice(0, 3);
                if (lo === "mm")
                    return /h/i.test(pat) && !/[dy]/i.test(pat) ? pad(d.getUTCMinutes()) : pad(d.getUTCMonth() + 1);
                if (lo === "m")
                    return String(d.getUTCMonth() + 1);
                if (lo === "dddd")
                    return DAYS_N[d.getUTCDay()];
                if (lo === "ddd")
                    return DAYS_N[d.getUTCDay()].slice(0, 3);
                if (lo === "dd")
                    return pad(d.getUTCDate());
                if (lo === "d")
                    return String(d.getUTCDate());
                if (lo === "hh")
                    return pad(/am\/pm/i.test(pat) ? ((d.getUTCHours() + 11) % 12) + 1 : d.getUTCHours());
                if (lo === "h")
                    return String(/am\/pm/i.test(pat) ? ((d.getUTCHours() + 11) % 12) + 1 : d.getUTCHours());
                if (lo === "ss")
                    return pad(d.getUTCSeconds());
                if (lo === "s")
                    return String(d.getUTCSeconds());
                return d.getUTCHours() < 12 ? "AM" : "PM";
            });
        }
        if (typeof v !== "number") {
            const lit = parseLiteral(v);
            if (typeof lit.value !== "number")
                return toStr(v);
            v = lit.value;
        }
        const m = /^([^0#]*)([#,0]*)(\.(0+|#+))?(%?)(.*)$/.exec(pat);
        if (!m || !m[2])
            return toStr(v);
        let n = v;
        if (m[5])
            n *= 100;
        const dec = m[4] ? m[4].length : 0;
        const comma = m[2].indexOf(",") >= 0;
        let s = Math.abs(n).toFixed(dec);
        if (m[4] && m[4][0] === "#")
            s = String(parseFloat(s));
        if (comma) {
            const p = s.split(".");
            p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            s = p.join(".");
        }
        const minInt = (m[2].match(/0/g) || []).length;
        const ip = s.split(".")[0].replace(/,/g, "");
        if (ip.length < minInt)
            s = "0".repeat(minInt - ip.length) + s;
        return (n < 0 ? "-" : "") + m[1] + s + m[5] + m[6];
    }
    // ---------- public: workbook evaluation ----------
    function evaluateWorkbook(sheets) {
        const ctx = new Ctx(sheets);
        const values = [];
        sheets.forEach((sh, si) => {
            const out = {};
            for (const id of Object.keys(sh.data)) {
                const p = parseCellRef(id);
                if (!p)
                    continue;
                out[id] = ctx.cell(si, p.row, p.col);
            }
            values.push(out);
        });
        return { values, hints: ctx.hints };
    }
    // ---------- public: formula rewriting ----------
    function refText(ref, sheetText) {
        const col = (c, abs) => (abs ? "$" : "") + indexToCol(c);
        const row = (r, abs) => (abs ? "$" : "") + r;
        if (ref.kind === "cell")
            return sheetText + col(ref.c0, ref.ac0) + row(ref.r0, ref.ar0);
        if (ref.kind === "range")
            return sheetText + col(ref.c0, ref.ac0) + row(ref.r0, ref.ar0) + ":" + col(ref.c1, ref.ac1) + row(ref.r1, ref.ar1);
        if (ref.kind === "cols")
            return sheetText + col(ref.c0, ref.ac0) + ":" + col(ref.c1, ref.ac1);
        return sheetText + row(ref.r0, ref.ar0) + ":" + row(ref.r1, ref.ar1);
    }
    function sheetPrefix(tok) {
        const bang = tok.text.lastIndexOf("!");
        return bang >= 0 ? tok.text.slice(0, bang + 1) : "";
    }
    function quoteSheet(name) {
        return /^[A-Za-z_][\w.]*$/.test(name) && !/^[A-Za-z]{1,3}\d+$/.test(name) ? name + "!" : "'" + name.replace(/'/g, "''") + "'!";
    }
    function rewrite(formula, fn) {
        const s = String(formula);
        if (!isFormulaText(s))
            return s;
        const body = s.slice(1);
        const toks = tokenize(body);
        let out = "", last = 0;
        for (const t of toks) {
            if (t.t !== "ref" || !t.ref)
                continue;
            const rep = fn(t, t.ref);
            if (rep === null)
                continue;
            out += body.slice(last, t.s) + rep;
            last = t.e;
        }
        return "=" + out + body.slice(last);
    }
    // Relative refs move with the formula (fill handle, copy/paste)!
    function shiftFormula(formula, dr, dc) {
        if (!dr && !dc)
            return String(formula);
        return rewrite(formula, (tok, ref) => {
            const r = { ...ref };
            if (ref.kind !== "cols") {
                if (!r.ar0)
                    r.r0 += dr;
                if (!r.ar1)
                    r.r1 += dr;
            }
            if (ref.kind !== "rows") {
                if (!r.ac0)
                    r.c0 += dc;
                if (!r.ac1)
                    r.c1 += dc;
            }
            if (r.r0 < 1 || r.r1 < 1 || r.c0 < 0 || r.c1 < 0)
                return sheetPrefix(tok) + "#REF!";
            return refText(r, sheetPrefix(tok));
        });
    }
    // Keeps refs pointing at the same data when rows/columns are inserted or deleted!
    // axis "row": `at` is 1-based; axis "col": `at` is 0-based; count > 0 inserts, < 0 deletes!
    function adjustFormula(formula, opts) {
        const { axis, at, count } = opts;
        return rewrite(formula, (tok, ref) => {
            const target = ref.sheet === null ? opts.formulaSheet : ref.sheet;
            if (target.toLowerCase() !== opts.sheet.toLowerCase())
                return null;
            if (axis === "row" && ref.kind === "cols")
                return null;
            if (axis === "col" && ref.kind === "rows")
                return null;
            let a = axis === "row" ? ref.r0 : ref.c0;
            let b = axis === "row" ? ref.r1 : ref.c1;
            if (count > 0) {
                if (a >= at)
                    a += count;
                if (b >= at)
                    b += count;
            }
            else {
                const n = -count, end = at + n - 1;
                if (a >= at && b <= end)
                    return sheetPrefix(tok) + "#REF!";
                if (a > end)
                    a -= n;
                else if (a >= at)
                    a = at;
                if (b > end)
                    b -= n;
                else if (b >= at)
                    b = at - 1;
            }
            const r = { ...ref };
            if (axis === "row") {
                r.r0 = a;
                r.r1 = b;
            }
            else {
                r.c0 = a;
                r.c1 = b;
            }
            const txt = refText(r, sheetPrefix(tok));
            return txt === tok.text ? null : txt;
        });
    }
    // Moving (or cutting) a block drags every reference into it along, like Excel!
    function moveRefs(formula, opts) {
        return rewrite(formula, (tok, ref) => {
            const target = ref.sheet === null ? opts.formulaSheet : ref.sheet;
            if (target.toLowerCase() !== opts.sheet.toLowerCase())
                return null;
            if (ref.kind === "rows" || ref.kind === "cols")
                return null;
            if (ref.r0 < opts.r0 || ref.r1 > opts.r1 || ref.c0 < opts.c0 || ref.c1 > opts.c1)
                return null;
            const r = { ...ref, r0: ref.r0 + opts.dr, r1: ref.r1 + opts.dr, c0: ref.c0 + opts.dc, c1: ref.c1 + opts.dc };
            if (r.r0 < 1 || r.c0 < 0)
                return sheetPrefix(tok) + "#REF!";
            return refText(r, sheetPrefix(tok));
        });
    }
    function renameSheetInFormula(formula, oldName, newName) {
        return rewrite(formula, (tok, ref) => {
            if (ref.sheet === null || ref.sheet.toLowerCase() !== oldName.toLowerCase())
                return null;
            return quoteSheet(newName) + tok.text.slice(tok.text.lastIndexOf("!") + 1);
        });
    }
    // Every reference in a formula with its text position (for colored highlights)!
    function refsIn(formula) {
        const s = String(formula);
        if (s[0] !== "=")
            return [];
        return tokenize(s.slice(1)).filter((t) => t.t === "ref").map((t) => ({ s: t.s + 1, e: t.e + 1, ref: t.ref, text: t.text }));
    }
    function tokensOf(formula) {
        const s = String(formula);
        if (s[0] !== "=")
            return [];
        return tokenize(s.slice(1)).map((t) => ({ ...t, s: t.s + 1, e: t.e + 1 }));
    }
    function isValidFormula(formula) {
        const s = String(formula);
        if (s[0] !== "=")
            return true;
        return !isErr(parseFormula(s.slice(1)));
    }
    function functionList() {
        return Object.keys(FN).sort().map((name) => ({ name, cat: FN[name].cat, sig: FN[name].sig, desc: FN[name].desc }));
    }
    // ---------- legacy API (kept for older callers) ----------
    function getRangeValues(data, startRef, endRef) {
        const s = parseCellRef(startRef);
        const e = parseCellRef(endRef);
        if (!s || !e)
            return [];
        const c0 = Math.min(s.col, e.col), c1 = Math.max(s.col, e.col);
        const r0 = Math.min(s.row, e.row), r1 = Math.max(s.row, e.row);
        const vals = [];
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                // Missing cells count as 0!
                const raw = data[cellId(c, r)] === undefined ? "0" : data[cellId(c, r)];
                if (String(raw).startsWith("="))
                    continue; // unresolved formula: skip!
                const n = parseFloat(String(raw).trim());
                if (!isNaN(n))
                    vals.push(n);
            }
        }
        return vals;
    }
    // =====================================================================
    // MORE FUNCTIONS: the finance, statistics, engineering, text and date
    // functions from Excel, Numbers and LibreOffice Calc that Imbuer was missing!
    // =====================================================================
    const num = (a, i, c, s, d) => argNum(a, i, c, s, d);
    const numList = (a, i, c, s) => flatM(matrix(a, i, c, s)).filter((v) => typeof v === "number");
    const badNum = (cond) => { if (cond) fail(ERR.NUM); };
    const sumOf = (xs) => xs.reduce((p, q) => p + q, 0);
    const meanOf = (xs) => { if (!xs.length) fail(ERR.DIV0); return sumOf(xs) / xs.length; };
    // two lists of the same size, only the pairs where both are numbers
    function pairList(a, c, s) {
        const x = flatM(matrix(a, 0, c, s)), y = flatM(matrix(a, 1, c, s));
        if (x.length !== y.length) fail(ERR.NA);
        const px = [], py = [];
        x.forEach((v, i) => { if (typeof v === "number" && typeof y[i] === "number") { px.push(v); py.push(y[i]); } });
        return [px, py];
    }
    // ---------- math & trigonometry ----------
    const trig1 = (name, desc, fn, lo, hi) => def(name, "Math", name + "(number)", desc, (a, c, s) => { const x = num(a, 0, c, s); if (lo !== undefined) badNum(x < lo || x > hi); const r = fn(x); if (!isFinite(r)) fail(ERR.NUM); return r; });
    trig1("ACOS", "The arccosine, in radians!", Math.acos, -1, 1);
    trig1("ASIN", "The arcsine, in radians!", Math.asin, -1, 1);
    trig1("ATAN", "The arctangent, in radians!", Math.atan);
    trig1("ACOSH", "The inverse hyperbolic cosine!", Math.acosh, 1, Infinity);
    trig1("ASINH", "The inverse hyperbolic sine!", Math.asinh);
    trig1("ATANH", "The inverse hyperbolic tangent!", Math.atanh, -0.999999999999999, 0.999999999999999);
    trig1("COSH", "The hyperbolic cosine!", Math.cosh);
    trig1("SINH", "The hyperbolic sine!", Math.sinh);
    trig1("TANH", "The hyperbolic tangent!", Math.tanh);
    trig1("COT", "The cotangent!", (x) => 1 / Math.tan(x));
    trig1("SEC", "The secant!", (x) => 1 / Math.cos(x));
    trig1("CSC", "The cosecant!", (x) => 1 / Math.sin(x));
    def("ATAN2", "Math", "ATAN2(x_num, y_num)", "The angle of a point, in radians!", (a, c, s) => { const x = num(a, 0, c, s), y = num(a, 1, c, s); if (x === 0 && y === 0) fail(ERR.DIV0); return Math.atan2(y, x); });
    const factorial = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    def("COMBIN", "Math", "COMBIN(n, k)", "How many ways to choose k things from n!", (a, c, s) => {
        const n = Math.floor(num(a, 0, c, s)), k = Math.floor(num(a, 1, c, s)); badNum(n < 0 || k < 0 || k > n);
        let r = 1; for (let i = 1; i <= Math.min(k, n - k); i++) r = r * (n - i + 1) / i; return Math.round(r);
    });
    def("COMBINA", "Math", "COMBINA(n, k)", "Combinations with repeats allowed!", (a, c, s) => {
        const n = Math.floor(num(a, 0, c, s)), k = Math.floor(num(a, 1, c, s)); badNum(n < 0 || k < 0 || (n === 0 && k > 0));
        if (n === 0 && k === 0) return 1; const m = n + k - 1; let r = 1; for (let i = 1; i <= Math.min(k, m - k); i++) r = r * (m - i + 1) / i; return Math.round(r);
    });
    def("PERMUT", "Math", "PERMUT(n, k)", "How many ordered ways to pick k of n!", (a, c, s) => {
        const n = Math.floor(num(a, 0, c, s)), k = Math.floor(num(a, 1, c, s)); badNum(n < 0 || k < 0 || k > n);
        let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r;
    });
    def("FACTDOUBLE", "Math", "FACTDOUBLE(number)", "The double factorial (n!!)!", (a, c, s) => { const n = Math.floor(num(a, 0, c, s)); badNum(n < -1); let r = 1; for (let i = n; i > 1; i -= 2) r *= i; return r; });
    def("MULTINOMIAL", "Math", "MULTINOMIAL(number1, [number2], ...)", "The multinomial coefficient!", (a, c, s) => { const xs = nums(a, c, s).map(Math.floor); badNum(xs.some((x) => x < 0)); return Math.round(factorial(sumOf(xs)) / xs.reduce((p, q) => p * factorial(q), 1)); });
    def("SUMSQ", "Math", "SUMSQ(number1, [number2], ...)", "The sum of the squares!", (a, c, s) => sumOf(nums(a, c, s).map((x) => x * x)));
    def("SUMX2MY2", "Math", "SUMX2MY2(array_x, array_y)", "The sum of x squared minus y squared!", (a, c, s) => { const [x, y] = pairList(a, c, s); return sumOf(x.map((v, i) => v * v - y[i] * y[i])); });
    def("SUMX2PY2", "Math", "SUMX2PY2(array_x, array_y)", "The sum of x squared plus y squared!", (a, c, s) => { const [x, y] = pairList(a, c, s); return sumOf(x.map((v, i) => v * v + y[i] * y[i])); });
    def("SUMXMY2", "Math", "SUMXMY2(array_x, array_y)", "The sum of (x minus y) squared!", (a, c, s) => { const [x, y] = pairList(a, c, s); return sumOf(x.map((v, i) => (v - y[i]) ** 2)); });
    def("QUOTIENT", "Math", "QUOTIENT(numerator, denominator)", "The whole-number part of a division!", (a, c, s) => { const d = num(a, 1, c, s); if (d === 0) fail(ERR.DIV0); return Math.trunc(num(a, 0, c, s) / d); });
    def("SQRTPI", "Math", "SQRTPI(number)", "The square root of a number times pi!", (a, c, s) => { const x = num(a, 0, c, s); badNum(x < 0); return Math.sqrt(x * Math.PI); });
    const ROMAN_T = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    def("ROMAN", "Math", "ROMAN(number)", "A number in Roman numerals!", (a, c, s) => { let n = Math.floor(num(a, 0, c, s)); if (n < 0 || n > 3999) fail(ERR.VALUE); let r = ""; for (const [v, t] of ROMAN_T) while (n >= v) { r += t; n -= v; } return r; });
    def("ARABIC", "Math", "ARABIC(text)", "Roman numerals as a number!", (a, c, s) => {
        const t = argStr(a, 0, c, s).trim().toUpperCase(); if (t === "") return 0;
        if (!/^-?[MDCLXVI]+$/.test(t)) fail(ERR.VALUE);
        const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; const neg = t[0] === "-"; const u = neg ? t.slice(1) : t; let r = 0;
        for (let i = 0; i < u.length; i++) { const v = val[u[i]], n = val[u[i + 1]] || 0; r += v < n ? -v : v; } return neg ? -r : r;
    });
    def("BASE", "Math", "BASE(number, radix, [min_length])", "A number as text in another base (2 to 36)!", (a, c, s) => { const n = Math.floor(num(a, 0, c, s)), r = Math.floor(num(a, 1, c, s)); badNum(n < 0 || r < 2 || r > 36); return n.toString(r).toUpperCase().padStart(Math.floor(num(a, 2, c, s, 0)), "0"); });
    def("DECIMAL", "Math", "DECIMAL(text, radix)", "Text in another base as a number!", (a, c, s) => { const t = argStr(a, 0, c, s).trim().toUpperCase(), r = Math.floor(num(a, 1, c, s)); badNum(r < 2 || r > 36); const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, r); let v = 0; for (const ch of t) { const d = digits.indexOf(ch); if (d < 0) fail(ERR.NUM); v = v * r + d; } return v; });
    def("CEILING.MATH", "Math", "CEILING.MATH(number, [significance], [mode])", "Rounds up to a multiple!", (a, c, s) => {
        const x = num(a, 0, c, s), sig = Math.abs(num(a, 1, c, s, 1)), mode = num(a, 2, c, s, 0); if (sig === 0) return 0;
        if (x >= 0) return Math.ceil(x / sig - 1e-12) * sig;
        return mode ? -Math.ceil(-x / sig - 1e-12) * sig : -Math.floor(-x / sig + 1e-12) * sig;
    });
    def("FLOOR.MATH", "Math", "FLOOR.MATH(number, [significance], [mode])", "Rounds down to a multiple!", (a, c, s) => {
        const x = num(a, 0, c, s), sig = Math.abs(num(a, 1, c, s, 1)), mode = num(a, 2, c, s, 0); if (sig === 0) return 0;
        if (x >= 0) return Math.floor(x / sig + 1e-12) * sig;
        return mode ? -Math.floor(-x / sig + 1e-12) * sig : -Math.ceil(-x / sig - 1e-12) * sig;
    });
    // ---------- bits and number bases ----------
    const bitArg = (a, i, c, s) => { const v = Math.floor(num(a, i, c, s)); badNum(v < 0 || v > 281474976710655); return v; };
    def("BITAND", "Engineering", "BITAND(number1, number2)", "Bits that are on in both!", (a, c, s) => Number(BigInt(bitArg(a, 0, c, s)) & BigInt(bitArg(a, 1, c, s))));
    def("BITOR", "Engineering", "BITOR(number1, number2)", "Bits that are on in either!", (a, c, s) => Number(BigInt(bitArg(a, 0, c, s)) | BigInt(bitArg(a, 1, c, s))));
    def("BITXOR", "Engineering", "BITXOR(number1, number2)", "Bits that are on in just one!", (a, c, s) => Number(BigInt(bitArg(a, 0, c, s)) ^ BigInt(bitArg(a, 1, c, s))));
    def("BITLSHIFT", "Engineering", "BITLSHIFT(number, shift)", "Shifts the bits left!", (a, c, s) => { const r = bitArg(a, 0, c, s) * Math.pow(2, Math.floor(num(a, 1, c, s))); badNum(r > 281474976710655); return Math.floor(r); });
    def("BITRSHIFT", "Engineering", "BITRSHIFT(number, shift)", "Shifts the bits right!", (a, c, s) => Math.floor(bitArg(a, 0, c, s) / Math.pow(2, Math.floor(num(a, 1, c, s)))));
    const BASES = { BIN: [2, 10], OCT: [8, 10], DEC: [10, 0], HEX: [16, 10] };
    function toBase(n, base, bits, places) {
        const lim = Math.pow(2, bits - 1); badNum(n < -lim || n >= lim);
        const v = n < 0 ? n + Math.pow(2, bits) : n; let t = v.toString(base).toUpperCase();
        if (places !== undefined) { badNum(t.length > places || places < 1 || places > 10); t = t.padStart(places, "0"); } return t;
    }
    function fromBase(t, base, bits) {
        t = String(t).trim(); const digits = "0123456789ABCDEF".slice(0, base); badNum(t === "" || t.length > 10 || [...t.toUpperCase()].some((ch) => digits.indexOf(ch) < 0));
        let v = parseInt(t, base); const lim = Math.pow(2, bits - 1); if (v >= lim && t.length === 10) v -= Math.pow(2, bits); return v;
    }
    const BITS = { 2: 10, 8: 30, 16: 40 };
    for (const from of ["BIN", "OCT", "DEC", "HEX"]) for (const to of ["BIN", "OCT", "DEC", "HEX"]) {
        if (from === to) continue;
        const fb = from === "BIN" ? 2 : from === "OCT" ? 8 : from === "HEX" ? 16 : 10, tb = to === "BIN" ? 2 : to === "OCT" ? 8 : to === "HEX" ? 16 : 10;
        def(from + "2" + to, "Engineering", from + "2" + to + "(number" + (to === "DEC" ? "" : ", [places]") + ")", "Converts " + from.toLowerCase() + " to " + to.toLowerCase() + "!", (a, c, s) => {
            const raw = from === "DEC" ? Math.trunc(num(a, 0, c, s)) : fromBase(arg(a, 0, c, s) === null ? "0" : toStr(arg(a, 0, c, s)), fb, BITS[fb]);
            if (to === "DEC") return raw;
            return toBase(raw, tb, BITS[tb], a[1] && a[1].t !== "empty" ? Math.floor(num(a, 1, c, s)) : undefined);
        });
    }
    def("DELTA", "Engineering", "DELTA(number1, [number2])", "1 if two numbers are equal, else 0!", (a, c, s) => (num(a, 0, c, s) === num(a, 1, c, s, 0) ? 1 : 0));
    def("GESTEP", "Engineering", "GESTEP(number, [step])", "1 if a number is at least the step, else 0!", (a, c, s) => (num(a, 0, c, s) >= num(a, 1, c, s, 0) ? 1 : 0));
    // ---------- the normal curve (erf, gamma) ----------
    function erf(x) {
        const ax = Math.abs(x); if (ax > 6) return Math.sign(x);
        if (ax < 2.5) { let sum = ax, term = ax; for (let n = 1; n < 200; n++) { term *= -ax * ax / n; const d = term / (2 * n + 1); sum += d; if (Math.abs(d) < 1e-17) break; } return Math.sign(x) * 2 / Math.sqrt(Math.PI) * sum; }
        // continued fraction for erfc
        let f = 0; for (let k = 60; k >= 1; k--) f = k / 2 / (ax + f);
        return Math.sign(x) * (1 - Math.exp(-ax * ax) / Math.sqrt(Math.PI) / (ax + f));
    }
    const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
    function normInv(p) {
        badNum(p <= 0 || p >= 1);
        const a1 = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b1 = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
        const c1 = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d1 = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
        let x; const lo = 0.02425;
        if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c1[0] * q + c1[1]) * q + c1[2]) * q + c1[3]) * q + c1[4]) * q + c1[5]) / ((((d1[0] * q + d1[1]) * q + d1[2]) * q + d1[3]) * q + 1); }
        else if (p > 1 - lo) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c1[0] * q + c1[1]) * q + c1[2]) * q + c1[3]) * q + c1[4]) * q + c1[5]) / ((((d1[0] * q + d1[1]) * q + d1[2]) * q + d1[3]) * q + 1); }
        else { const q = p - 0.5, r = q * q; x = (((((a1[0] * r + a1[1]) * r + a1[2]) * r + a1[3]) * r + a1[4]) * r + a1[5]) * q / (((((b1[0] * r + b1[1]) * r + b1[2]) * r + b1[3]) * r + b1[4]) * r + 1); }
        for (let i = 0; i < 3; i++) { const e = normCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2); x = x - u / (1 + x * u / 2); }
        return x;
    }
    function gammaLn(x) {
        const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
        let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (const gj of g) ser += gj / ++y; return -tmp + Math.log(2.5066282746310005 * ser / x);
    }
    def("ERF", "Engineering", "ERF(x)", "The error function!", (a, c, s) => erf(num(a, 0, c, s)));
    def("GAMMALN", "Statistical", "GAMMALN(x)", "The natural log of the gamma function!", (a, c, s) => { const x = num(a, 0, c, s); badNum(x <= 0); return gammaLn(x); });
    def("NORM.S.DIST", "Statistical", "NORM.S.DIST(z, cumulative)", "The standard normal curve!", (a, c, s) => { const z = num(a, 0, c, s); return toBool(arg(a, 1, c, s, true)) ? normCdf(z) : Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); });
    def("NORM.DIST", "Statistical", "NORM.DIST(x, mean, standard_dev, cumulative)", "The normal curve!", (a, c, s) => { const x = num(a, 0, c, s), m = num(a, 1, c, s), sd = num(a, 2, c, s); badNum(sd <= 0); const z = (x - m) / sd; return toBool(arg(a, 3, c, s, true)) ? normCdf(z) : Math.exp(-z * z / 2) / (sd * Math.sqrt(2 * Math.PI)); });
    def("NORM.S.INV", "Statistical", "NORM.S.INV(probability)", "The z-score for a probability!", (a, c, s) => normInv(num(a, 0, c, s)));
    def("NORM.INV", "Statistical", "NORM.INV(probability, mean, standard_dev)", "The value for a probability on a normal curve!", (a, c, s) => { const sd = num(a, 2, c, s); badNum(sd <= 0); return num(a, 1, c, s) + sd * normInv(num(a, 0, c, s)); });
    def("STANDARDIZE", "Statistical", "STANDARDIZE(x, mean, standard_dev)", "How many standard deviations from the mean!", (a, c, s) => { const sd = num(a, 2, c, s); badNum(sd <= 0); return (num(a, 0, c, s) - num(a, 1, c, s)) / sd; });
    def("CONFIDENCE.NORM", "Statistical", "CONFIDENCE.NORM(alpha, standard_dev, size)", "The margin of a confidence interval!", (a, c, s) => { const al = num(a, 0, c, s), sd = num(a, 1, c, s), n = Math.floor(num(a, 2, c, s)); badNum(al <= 0 || al >= 1 || sd <= 0 || n < 1); return -normInv(al / 2) * sd / Math.sqrt(n); });
    def("EXPON.DIST", "Statistical", "EXPON.DIST(x, lambda, cumulative)", "The exponential curve!", (a, c, s) => { const x = num(a, 0, c, s), l = num(a, 1, c, s); badNum(x < 0 || l <= 0); return toBool(arg(a, 2, c, s, true)) ? 1 - Math.exp(-l * x) : l * Math.exp(-l * x); });
    def("POISSON.DIST", "Statistical", "POISSON.DIST(x, mean, cumulative)", "The Poisson curve!", (a, c, s) => { const x = Math.floor(num(a, 0, c, s)), m = num(a, 1, c, s); badNum(x < 0 || m < 0); const pmf = (k) => Math.exp(-m + k * Math.log(m || 1e-300) - gammaLn(k + 1)); if (!toBool(arg(a, 2, c, s, true))) return m === 0 ? (x === 0 ? 1 : 0) : pmf(x); let t = 0; for (let k = 0; k <= x; k++) t += m === 0 ? (k === 0 ? 1 : 0) : pmf(k); return t; });
    def("BINOM.DIST", "Statistical", "BINOM.DIST(successes, trials, probability, cumulative)", "The binomial curve!", (a, c, s) => { const x = Math.floor(num(a, 0, c, s)), n = Math.floor(num(a, 1, c, s)), p = num(a, 2, c, s); badNum(x < 0 || x > n || p < 0 || p > 1); const pmf = (k) => Math.exp(gammaLn(n + 1) - gammaLn(k + 1) - gammaLn(n - k + 1)) * Math.pow(p, k) * Math.pow(1 - p, n - k); if (!toBool(arg(a, 3, c, s, true))) return pmf(x); let t = 0; for (let k = 0; k <= x; k++) t += pmf(k); return t; });
    def("FISHER", "Statistical", "FISHER(x)", "The Fisher transformation!", (a, c, s) => { const x = num(a, 0, c, s); badNum(x <= -1 || x >= 1); return Math.atanh(x); });
    def("FISHERINV", "Statistical", "FISHERINV(y)", "The inverse Fisher transformation!", (a, c, s) => Math.tanh(num(a, 0, c, s)));
    // ---------- statistics ----------
    def("STDEV.S", "Statistical", "STDEV.S(number1, [number2], ...)", "The standard deviation of a sample!", (a, c, s) => Math.sqrt(variance(nums(a, c, s), true)));
    def("VAR.S", "Statistical", "VAR.S(number1, [number2], ...)", "The variance of a sample!", (a, c, s) => variance(nums(a, c, s), true));
    def("GEOMEAN", "Statistical", "GEOMEAN(number1, [number2], ...)", "The geometric mean!", (a, c, s) => { const xs = nums(a, c, s); badNum(!xs.length || xs.some((x) => x <= 0)); return Math.exp(meanOf(xs.map(Math.log))); });
    def("HARMEAN", "Statistical", "HARMEAN(number1, [number2], ...)", "The harmonic mean!", (a, c, s) => { const xs = nums(a, c, s); badNum(!xs.length || xs.some((x) => x <= 0)); return xs.length / sumOf(xs.map((x) => 1 / x)); });
    def("AVEDEV", "Statistical", "AVEDEV(number1, [number2], ...)", "The average distance from the mean!", (a, c, s) => { const xs = nums(a, c, s), m = meanOf(xs); return meanOf(xs.map((x) => Math.abs(x - m))); });
    def("DEVSQ", "Statistical", "DEVSQ(number1, [number2], ...)", "The sum of squared distances from the mean!", (a, c, s) => { const xs = nums(a, c, s), m = meanOf(xs); return sumOf(xs.map((x) => (x - m) ** 2)); });
    def("SKEW", "Statistical", "SKEW(number1, [number2], ...)", "How lopsided the data is!", (a, c, s) => { const xs = nums(a, c, s), n = xs.length; if (n < 3) fail(ERR.DIV0); const m = meanOf(xs), sd = Math.sqrt(variance(xs, true)); if (sd === 0) fail(ERR.DIV0); return n / ((n - 1) * (n - 2)) * sumOf(xs.map((x) => ((x - m) / sd) ** 3)); });
    def("KURT", "Statistical", "KURT(number1, [number2], ...)", "How peaked the data is!", (a, c, s) => { const xs = nums(a, c, s), n = xs.length; if (n < 4) fail(ERR.DIV0); const m = meanOf(xs), sd = Math.sqrt(variance(xs, true)); if (sd === 0) fail(ERR.DIV0); return n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * sumOf(xs.map((x) => ((x - m) / sd) ** 4)) - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)); });
    def("TRIMMEAN", "Statistical", "TRIMMEAN(array, percent)", "The mean without the highest and lowest values!", (a, c, s) => { const xs = numList(a, 0, c, s).sort((p, q) => p - q), pc = num(a, 1, c, s); badNum(pc < 0 || pc >= 1 || !xs.length); const cut = Math.floor(xs.length * pc / 2); return meanOf(xs.slice(cut, xs.length - cut)); });
    function percentile(xs, k, exc) {
        xs = xs.slice().sort((p, q) => p - q); const n = xs.length; badNum(!n);
        if (exc) { badNum(k <= 0 || k >= 1); const pos = k * (n + 1); badNum(pos < 1 || pos > n); const lo = Math.floor(pos), f = pos - lo; return lo >= n ? xs[n - 1] : xs[lo - 1] + f * (xs[lo] - xs[lo - 1]); }
        badNum(k < 0 || k > 1); const pos = k * (n - 1), lo = Math.floor(pos), f = pos - lo; return lo + 1 >= n ? xs[n - 1] : xs[lo] + f * (xs[lo + 1] - xs[lo]);
    }
    def("PERCENTILE PERCENTILE.INC", "Statistical", "PERCENTILE(array, k)", "The value at a percentile (0 to 1)!", (a, c, s) => percentile(numList(a, 0, c, s), num(a, 1, c, s), false));
    def("PERCENTILE.EXC", "Statistical", "PERCENTILE.EXC(array, k)", "The value at a percentile, leaving out 0 and 1!", (a, c, s) => percentile(numList(a, 0, c, s), num(a, 1, c, s), true));
    def("QUARTILE QUARTILE.INC", "Statistical", "QUARTILE(array, quart)", "A quartile (0 to 4) of the data!", (a, c, s) => { const q = Math.floor(num(a, 1, c, s)); badNum(q < 0 || q > 4); return percentile(numList(a, 0, c, s), q / 4, false); });
    def("QUARTILE.EXC", "Statistical", "QUARTILE.EXC(array, quart)", "A quartile (1 to 3), leaving out the extremes!", (a, c, s) => { const q = Math.floor(num(a, 1, c, s)); badNum(q < 1 || q > 3); return percentile(numList(a, 0, c, s), q / 4, true); });
    def("PERCENTRANK PERCENTRANK.INC", "Statistical", "PERCENTRANK(array, x, [significance])", "The percentile rank of a value!", (a, c, s) => {
        const xs = numList(a, 0, c, s).sort((p, q) => p - q), x = num(a, 1, c, s), sig = Math.floor(num(a, 2, c, s, 3)); badNum(!xs.length || x < xs[0] || x > xs[xs.length - 1]);
        let r; const i = xs.findIndex((v) => v >= x); if (xs[i] === x) r = i / (xs.length - 1); else r = (i - 1 + (x - xs[i - 1]) / (xs[i] - xs[i - 1])) / (xs.length - 1);
        const f = Math.pow(10, sig); return Math.floor(r * f + 1e-9) / f;
    });
    const modeAlias = FN.MODE, rankAlias = FN.RANK;
    if (modeAlias) def("MODE.SNGL", "Statistical", "MODE.SNGL(number1, [number2], ...)", "The most common number!", modeAlias.run);
    if (rankAlias) def("RANK.EQ", "Statistical", "RANK.EQ(number, ref, [order])", "The rank of a number in a list!", rankAlias.run);
    def("SLOPE", "Statistical", "SLOPE(known_ys, known_xs)", "The slope of the best-fit line!", (a, c, s) => { const [y, x] = pairList(a, c, s); if (x.length < 2) fail(ERR.DIV0); const mx = meanOf(x), my = meanOf(y); let n = 0, d = 0; x.forEach((v, i) => { n += (v - mx) * (y[i] - my); d += (v - mx) ** 2; }); if (d === 0) fail(ERR.DIV0); return n / d; });
    def("INTERCEPT", "Statistical", "INTERCEPT(known_ys, known_xs)", "Where the best-fit line crosses y!", (a, c, s) => { const [y, x] = pairList(a, c, s); if (x.length < 2) fail(ERR.DIV0); const mx = meanOf(x), my = meanOf(y); let n = 0, d = 0; x.forEach((v, i) => { n += (v - mx) * (y[i] - my); d += (v - mx) ** 2; }); if (d === 0) fail(ERR.DIV0); return my - n / d * mx; });
    def("RSQ", "Statistical", "RSQ(known_ys, known_xs)", "How well the best-fit line explains the data (0 to 1)!", (a, c, s) => { const [y, x] = pairList(a, c, s); if (x.length < 2) fail(ERR.DIV0); const mx = meanOf(x), my = meanOf(y); let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; }); if (!sxx || !syy) fail(ERR.DIV0); return sxy * sxy / (sxx * syy); });
    def("FORECAST FORECAST.LINEAR", "Statistical", "FORECAST(x, known_ys, known_xs)", "Predicts a value from a trend line!", (a, c, s) => { const x0 = num(a, 0, c, s), [y, x] = pairList(a.slice(1), c, s); if (x.length < 2) fail(ERR.DIV0); const mx = meanOf(x), my = meanOf(y); let n = 0, d = 0; x.forEach((v, i) => { n += (v - mx) * (y[i] - my); d += (v - mx) ** 2; }); if (d === 0) fail(ERR.DIV0); const sl = n / d; return my + sl * (x0 - mx); });
    def("STEYX", "Statistical", "STEYX(known_ys, known_xs)", "The typical error of the best-fit line!", (a, c, s) => { const [y, x] = pairList(a, c, s); if (x.length < 3) fail(ERR.DIV0); const mx = meanOf(x), my = meanOf(y); let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; }); if (!sxx) fail(ERR.DIV0); return Math.sqrt((syy - sxy * sxy / sxx) / (x.length - 2)); });
    def("COVARIANCE.P", "Statistical", "COVARIANCE.P(array1, array2)", "How two lists vary together (whole population)!", (a, c, s) => { const [x, y] = pairList(a, c, s); const mx = meanOf(x), my = meanOf(y); return sumOf(x.map((v, i) => (v - mx) * (y[i] - my))) / x.length; });
    def("COVARIANCE.S", "Statistical", "COVARIANCE.S(array1, array2)", "How two lists vary together (a sample)!", (a, c, s) => { const [x, y] = pairList(a, c, s); if (x.length < 2) fail(ERR.DIV0); const mx = meanOf(x), my = meanOf(y); return sumOf(x.map((v, i) => (v - mx) * (y[i] - my))) / (x.length - 1); });
    def("SUBTOTAL", "Math", "SUBTOTAL(function_num, ref1, [ref2], ...)", "A total with a function number (1 average, 2 count, 4 max, 5 min, 9 sum, +100 too)!", (a, c, s) => {
        const f = Math.floor(num(a, 0, c, s)) % 100, xs = nums(a.slice(1), c, s);
        switch (f) { case 1: return meanOf(xs); case 2: case 3: return xs.length; case 4: return xs.length ? Math.max(...xs) : 0; case 5: return xs.length ? Math.min(...xs) : 0; case 6: return xs.reduce((p, q) => p * q, 1); case 7: return Math.sqrt(variance(xs, true)); case 8: return Math.sqrt(variance(xs, false)); case 9: return sumOf(xs); case 10: return variance(xs, true); case 11: return variance(xs, false); default: return fail(ERR.VALUE); }
    });
    // ---------- finance ----------
    function pmt(rate, nper, pv, fv, type) { if (rate === 0) return -(pv + fv) / nper; const f = Math.pow(1 + rate, nper); return -(pv * f + fv) * rate / ((1 + rate * type) * (f - 1)); }
    function fvf(rate, nper, pm, pv, type) { if (rate === 0) return -(pv + pm * nper); const f = Math.pow(1 + rate, nper); return -(pv * f + pm * (1 + rate * type) * (f - 1) / rate); }
    const finArgs = (a, c, s, i) => [num(a, i, c, s, 0), num(a, i + 1, c, s, 0)];
    def("PMT", "Financial", "PMT(rate, nper, pv, [fv], [type])", "The payment for a loan or savings plan!", (a, c, s) => { const n = num(a, 1, c, s); if (n === 0) fail(ERR.NUM); return pmt(num(a, 0, c, s), n, num(a, 2, c, s), num(a, 3, c, s, 0), num(a, 4, c, s, 0) ? 1 : 0); });
    def("FV", "Financial", "FV(rate, nper, pmt, [pv], [type])", "What an investment is worth later!", (a, c, s) => fvf(num(a, 0, c, s), num(a, 1, c, s), num(a, 2, c, s), num(a, 3, c, s, 0), num(a, 4, c, s, 0) ? 1 : 0));
    def("PV", "Financial", "PV(rate, nper, pmt, [fv], [type])", "What a stream of payments is worth now!", (a, c, s) => { const r = num(a, 0, c, s), n = num(a, 1, c, s), pm = num(a, 2, c, s), fv = num(a, 3, c, s, 0), t = num(a, 4, c, s, 0) ? 1 : 0; if (r === 0) return -(fv + pm * n); const f = Math.pow(1 + r, n); return -(fv + pm * (1 + r * t) * (f - 1) / r) / f; });
    def("NPER", "Financial", "NPER(rate, pmt, pv, [fv], [type])", "How many payments it takes!", (a, c, s) => { const r = num(a, 0, c, s), pm = num(a, 1, c, s), pv = num(a, 2, c, s), fv = num(a, 3, c, s, 0), t = num(a, 4, c, s, 0) ? 1 : 0; if (r === 0) { if (pm === 0) fail(ERR.NUM); return -(pv + fv) / pm; } const k = pm * (1 + r * t) / r, num1 = k - fv, den = k + pv; badNum(!(num1 / den > 0) || !(r > -1)); return Math.log(num1 / den) / Math.log(1 + r); });
    def("RATE", "Financial", "RATE(nper, pmt, pv, [fv], [type], [guess])", "The interest rate per period!", (a, c, s) => {
        const n = num(a, 0, c, s), pm = num(a, 1, c, s), pv = num(a, 2, c, s), fv = num(a, 3, c, s, 0), t = num(a, 4, c, s, 0) ? 1 : 0; let r = num(a, 5, c, s, 0.1);
        for (let i = 0; i < 100; i++) { const f = fvf(r, n, pm, pv, t) - fv, h = 1e-6, d = (fvf(r + h, n, pm, pv, t) - fvf(r - h, n, pm, pv, t)) / (2 * h); if (!d) break; const nr = r - f / d; if (!isFinite(nr)) fail(ERR.NUM); if (Math.abs(nr - r) < 1e-12) return nr; r = nr; }
        return fail(ERR.NUM);
    });
    def("IPMT", "Financial", "IPMT(rate, per, nper, pv, [fv], [type])", "The interest part of a payment!", (a, c, s) => { const r = num(a, 0, c, s), per = Math.floor(num(a, 1, c, s)), n = Math.floor(num(a, 2, c, s)), pv = num(a, 3, c, s), fv = num(a, 4, c, s, 0), t = num(a, 5, c, s, 0) ? 1 : 0; badNum(per < 1 || per > n); return ipmtCalc(r, per, n, pv, fv, t); });
    // interest in period `per` (negative when you pay it, like Excel)
    function ipmtCalc(r, per, n, pv, fv, t) {
        const p = pmt(r, n, pv, fv, t);
        if (!t) return fvf(r, per - 1, p, pv, 0) * r;
        if (per === 1) return 0;
        return r * (fvf(r, per - 2, p, pv, 1) - p);
    }
    def("PPMT", "Financial", "PPMT(rate, per, nper, pv, [fv], [type])", "The principal part of a payment!", (a, c, s) => { const r = num(a, 0, c, s), per = Math.floor(num(a, 1, c, s)), n = Math.floor(num(a, 2, c, s)), pv = num(a, 3, c, s), fv = num(a, 4, c, s, 0), t = num(a, 5, c, s, 0) ? 1 : 0; badNum(per < 1 || per > n); return pmt(r, n, pv, fv, t) - ipmtCalc(r, per, n, pv, fv, t); });
    def("NPV", "Financial", "NPV(rate, value1, [value2], ...)", "The present value of future cash flows!", (a, c, s) => { const r = num(a, 0, c, s); if (r === -1) fail(ERR.DIV0); const xs = nums(a.slice(1), c, s); return xs.reduce((t, v, i) => t + v / Math.pow(1 + r, i + 1), 0); });
    function irrOf(xs, guess) {
        badNum(!xs.some((x) => x > 0) || !xs.some((x) => x < 0));
        let r = guess; for (let i = 0; i < 200; i++) { let f = 0, d = 0; xs.forEach((v, k) => { f += v / Math.pow(1 + r, k); d -= k * v / Math.pow(1 + r, k + 1); }); if (!d) break; const nr = r - f / d; if (!isFinite(nr) || nr <= -1) break; if (Math.abs(nr - r) < 1e-12) return nr; r = nr; }
        for (let lo = -0.99, hi = 10, k = 0; k < 300; k++) { const mid = (lo + hi) / 2, fm = xs.reduce((t, v, j) => t + v / Math.pow(1 + mid, j), 0), fl = xs.reduce((t, v, j) => t + v / Math.pow(1 + lo, j), 0); if (fl * fm <= 0) hi = mid; else lo = mid; if (hi - lo < 1e-14) return mid; }
        return fail(ERR.NUM);
    }
    def("IRR", "Financial", "IRR(values, [guess])", "The internal rate of return!", (a, c, s) => irrOf(numList(a, 0, c, s), num(a, 1, c, s, 0.1)));
    def("MIRR", "Financial", "MIRR(values, finance_rate, reinvest_rate)", "The modified internal rate of return!", (a, c, s) => { const xs = numList(a, 0, c, s), fr = num(a, 1, c, s), rr = num(a, 2, c, s), n = xs.length; badNum(n < 2); const pos = xs.reduce((t, v, i) => t + (v > 0 ? v * Math.pow(1 + rr, n - 1 - i) : 0), 0), neg = xs.reduce((t, v, i) => t + (v < 0 ? v / Math.pow(1 + fr, i) : 0), 0); if (!pos || !neg) fail(ERR.DIV0); return Math.pow(-pos / neg, 1 / (n - 1)) - 1; });
    function xCash(a, c, s) { const v = numList(a, 1, c, s), d = flatM(matrix(a, 2, c, s)).filter((x) => typeof x === "number"); if (v.length !== d.length || v.length < 2) fail(ERR.NUM); return [v, d.map((x) => Math.floor(x) - Math.floor(d[0]))]; }
    def("XNPV", "Financial", "XNPV(rate, values, dates)", "Present value of cash flows on certain dates!", (a, c, s) => { const r = num(a, 0, c, s), [v, d] = xCash(a, c, s); return v.reduce((t, x, i) => t + x / Math.pow(1 + r, d[i] / 365), 0); });
    def("XIRR", "Financial", "XIRR(values, dates, [guess])", "The internal rate of return for dated cash flows!", (a, c, s) => {
        const vv = numList(a, 0, c, s), dd = flatM(matrix(a, 1, c, s)).filter((x) => typeof x === "number"); if (vv.length !== dd.length) fail(ERR.NUM); badNum(!vv.some((x) => x > 0) || !vv.some((x) => x < 0));
        const t = dd.map((x) => (x - dd[0]) / 365); let r = num(a, 2, c, s, 0.1);
        for (let i = 0; i < 200; i++) { let f = 0, d = 0; vv.forEach((v, k) => { f += v / Math.pow(1 + r, t[k]); d -= t[k] * v / Math.pow(1 + r, t[k] + 1); }); if (!d) break; const nr = r - f / d; if (!isFinite(nr) || nr <= -1) break; if (Math.abs(nr - r) < 1e-12) return nr; r = nr; }
        return fail(ERR.NUM);
    });
    def("SLN", "Financial", "SLN(cost, salvage, life)", "Straight-line depreciation per period!", (a, c, s) => { const l = num(a, 2, c, s); if (l === 0) fail(ERR.DIV0); return (num(a, 0, c, s) - num(a, 1, c, s)) / l; });
    def("SYD", "Financial", "SYD(cost, salvage, life, per)", "Sum-of-years' digits depreciation!", (a, c, s) => { const cost = num(a, 0, c, s), sal = num(a, 1, c, s), life = num(a, 2, c, s), per = num(a, 3, c, s); badNum(life <= 0 || per < 1 || per > life); return (cost - sal) * (life - per + 1) * 2 / (life * (life + 1)); });
    def("DDB", "Financial", "DDB(cost, salvage, life, period, [factor])", "Double-declining balance depreciation!", (a, c, s) => { const cost = num(a, 0, c, s), sal = num(a, 1, c, s), life = num(a, 2, c, s), per = num(a, 3, c, s), f = num(a, 4, c, s, 2); badNum(life <= 0 || per < 1 || per > life || cost < 0 || sal < 0); let book = cost, d = 0; for (let p = 1; p <= per; p++) { d = Math.min(book * f / life, Math.max(0, book - sal)); book -= d; } return d; });
    def("EFFECT", "Financial", "EFFECT(nominal_rate, periods)", "The effective yearly interest rate!", (a, c, s) => { const n = Math.floor(num(a, 1, c, s)), r = num(a, 0, c, s); badNum(r <= 0 || n < 1); return Math.pow(1 + r / n, n) - 1; });
    def("NOMINAL", "Financial", "NOMINAL(effect_rate, periods)", "The nominal yearly interest rate!", (a, c, s) => { const n = Math.floor(num(a, 1, c, s)), r = num(a, 0, c, s); badNum(r <= 0 || n < 1); return n * (Math.pow(1 + r, 1 / n) - 1); });
    def("CUMIPMT", "Financial", "CUMIPMT(rate, nper, pv, start, end, type)", "Interest paid between two periods!", (a, c, s) => { const r = num(a, 0, c, s), n = Math.floor(num(a, 1, c, s)), pv = num(a, 2, c, s), st = Math.floor(num(a, 3, c, s)), en = Math.floor(num(a, 4, c, s)), t = num(a, 5, c, s) ? 1 : 0; badNum(r <= 0 || n <= 0 || pv <= 0 || st < 1 || en < st || en > n); let tot = 0; for (let p = st; p <= en; p++) tot += ipmtCalc(r, p, n, pv, 0, t); return tot; });
    def("CUMPRINC", "Financial", "CUMPRINC(rate, nper, pv, start, end, type)", "Principal paid between two periods!", (a, c, s) => { const r = num(a, 0, c, s), n = Math.floor(num(a, 1, c, s)), pv = num(a, 2, c, s), st = Math.floor(num(a, 3, c, s)), en = Math.floor(num(a, 4, c, s)), t = num(a, 5, c, s) ? 1 : 0; badNum(r <= 0 || n <= 0 || pv <= 0 || st < 1 || en < st || en > n); let tot = 0; for (let p = st; p <= en; p++) tot += pmt(r, n, pv, 0, t) - ipmtCalc(r, p, n, pv, 0, t); return tot; });
    def("FVSCHEDULE", "Financial", "FVSCHEDULE(principal, schedule)", "A value grown by a list of rates!", (a, c, s) => numList(a, 1, c, s).reduce((t, r) => t * (1 + r), num(a, 0, c, s)));
    // ---------- text ----------
    def("CLEAN", "Text", "CLEAN(text)", "Removes non-printing characters!", (a, c, s) => argStr(a, 0, c, s).replace(/[\u0000-\u001f]/g, ""));
    def("CONCATENATE", "Text", "CONCATENATE(text1, [text2], ...)", "Joins text together!", (a, c, s) => { let r = ""; each(a, c, s, (v) => { r += toStr(v); }); return r; });
    const withCommas = (n, d) => { const f = Math.abs(n).toFixed(d), [i, dec] = f.split("."); return (n < 0 ? "-" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec ? "." + dec : ""); };
    def("FIXED", "Text", "FIXED(number, [decimals], [no_commas])", "A number as text with set decimals!", (a, c, s) => { const d = Math.max(0, Math.floor(num(a, 1, c, s, 2))), n = Math.round(num(a, 0, c, s) * Math.pow(10, d) + 1e-9 * Math.sign(num(a, 0, c, s))) / Math.pow(10, d); return toBool(arg(a, 2, c, s, false)) ? n.toFixed(d) : withCommas(n, d); });
    def("DOLLAR", "Text", "DOLLAR(number, [decimals])", "A number as text with a $ sign!", (a, c, s) => { const d = Math.max(0, Math.floor(num(a, 1, c, s, 2))), n = num(a, 0, c, s); const t = withCommas(Math.abs(n), d); return n < 0 ? "-$" + t : "$" + t; });
    def("NUMBERVALUE", "Text", "NUMBERVALUE(text, [decimal_separator], [group_separator])", "Text as a number, whatever the separators!", (a, c, s) => { let t = argStr(a, 0, c, s).replace(/\s/g, ""); const dec = argStr(a, 1, c, s, "."), grp = argStr(a, 2, c, s, ","); if (t === "") return 0; if (grp) t = t.split(grp).join(""); if (dec !== ".") t = t.split(dec).join("."); let pct = 0; while (t.endsWith("%")) { pct++; t = t.slice(0, -1); } const v = Number(t); if (!isFinite(v) || t === "") fail(ERR.VALUE); return v / Math.pow(100, pct); });
    function splitAt(text, delim, inst, ci) {
        if (delim === "") return null; const hay = ci ? text.toLowerCase() : text, nd = ci ? delim.toLowerCase() : delim; const idx = []; let p = 0; for (;;) { const i = hay.indexOf(nd, p); if (i < 0) break; idx.push(i); p = i + nd.length; }
        if (!inst || Math.abs(inst) > idx.length) return null; return inst > 0 ? idx[inst - 1] : idx[idx.length + inst];
    }
    def("TEXTBEFORE", "Text", "TEXTBEFORE(text, delimiter, [instance], [match_mode], [if_not_found])", "The text before a delimiter!", (a, c, s) => { const t = argStr(a, 0, c, s), d = argStr(a, 1, c, s), i = Math.floor(num(a, 2, c, s, 1)); const at = splitAt(t, d, i, num(a, 3, c, s, 0) === 1); if (at === null) { if (a[4] && a[4].t !== "empty") return c.scalar(a[4], s); return fail(ERR.NA); } return t.slice(0, at); });
    def("TEXTAFTER", "Text", "TEXTAFTER(text, delimiter, [instance], [match_mode], [if_not_found])", "The text after a delimiter!", (a, c, s) => { const t = argStr(a, 0, c, s), d = argStr(a, 1, c, s), i = Math.floor(num(a, 2, c, s, 1)); const at = splitAt(t, d, i, num(a, 3, c, s, 0) === 1); if (at === null) { if (a[4] && a[4].t !== "empty") return c.scalar(a[4], s); return fail(ERR.NA); } return t.slice(at + d.length); });
    def("UNICHAR", "Text", "UNICHAR(number)", "The character for a Unicode number!", (a, c, s) => { const n = Math.floor(num(a, 0, c, s)); if (n < 1 || n > 1114111) fail(ERR.VALUE); return String.fromCodePoint(n); });
    def("UNICODE", "Text", "UNICODE(text)", "The Unicode number of the first character!", (a, c, s) => { const t = argStr(a, 0, c, s); if (!t) fail(ERR.VALUE); return t.codePointAt(0); });
    def("T", "Text", "T(value)", "The value if it is text, else nothing!", (a, c, s) => { const v = arg(a, 0, c, s, ""); return typeof v === "string" ? v : ""; });
    def("N", "Info", "N(value)", "The value as a number!", (a, c, s) => { const v = arg(a, 0, c, s, 0); return typeof v === "number" ? v : typeof v === "boolean" ? (v ? 1 : 0) : 0; });
    const rx = (p, f) => { try { return new RegExp(p, f); } catch (e) { return fail(ERR.VALUE); } };
    def("REGEXTEST", "Text", "REGEXTEST(text, pattern, [case_sensitivity])", "TRUE if the text matches a pattern!", (a, c, s) => rx(argStr(a, 1, c, s), num(a, 2, c, s, 0) === 1 ? "i" : "").test(argStr(a, 0, c, s)));
    def("REGEXEXTRACT", "Text", "REGEXEXTRACT(text, pattern, [case_sensitivity])", "The first part of the text that matches a pattern!", (a, c, s) => { const m = rx(argStr(a, 1, c, s), num(a, 2, c, s, 0) === 1 ? "i" : "").exec(argStr(a, 0, c, s)); return m ? m[0] : fail(ERR.NA); });
    def("REGEXREPLACE", "Text", "REGEXREPLACE(text, pattern, replacement, [occurrence], [case_sensitivity])", "Replaces what matches a pattern!", (a, c, s) => { const o = Math.floor(num(a, 3, c, s, 0)); const re = rx(argStr(a, 1, c, s), (o === 0 ? "g" : "") + (num(a, 4, c, s, 0) === 1 ? "i" : "")); return argStr(a, 0, c, s).replace(re, argStr(a, 2, c, s)); });
    // ---------- dates ----------
    const ymd = (n) => { const d = serialToDate(n); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
    def("DATEDIF", "Date", "DATEDIF(start_date, end_date, unit)", "The gap between two dates in years (Y), months (M), days (D), or YM, YD, MD!", (a, c, s) => {
        const s0 = Math.floor(num(a, 0, c, s)), e0 = Math.floor(num(a, 1, c, s)), u = argStr(a, 2, c, s).toUpperCase(); badNum(e0 < s0);
        const [y1, m1, d1] = ymd(s0), [y2, m2, d2] = ymd(e0); let months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
        if (u === "Y") return Math.floor(months / 12); if (u === "M") return months; if (u === "D") return e0 - s0; if (u === "YM") return ((months % 12) + 12) % 12;
        if (u === "MD") { let dd = d2 - d1; if (dd < 0) dd += new Date(Date.UTC(y2, m2 - 1, 0)).getUTCDate(); return dd; }
        if (u === "YD") { const sy = Math.floor(months / 12); const base = Date.UTC(y1 + sy, m1 - 1, d1); return Math.round((EPOCH + e0 * DAY_MS - base) / DAY_MS); }
        return fail(ERR.NUM);
    });
    function weekNum(n, mode) {
        const [y] = ymd(n); const jan1 = dateToSerial(y, 1, 1); const startDay = mode === 2 || mode === 11 ? 1 : mode === 12 ? 2 : mode === 13 ? 3 : mode === 14 ? 4 : mode === 15 ? 5 : mode === 16 ? 6 : mode === 17 ? 0 : 0;
        const wd1 = serialToDate(jan1).getUTCDay(); const offset = (wd1 - startDay + 7) % 7; return Math.floor((n - jan1 + offset) / 7) + 1;
    }
    def("WEEKNUM", "Date", "WEEKNUM(date, [type])", "The week of the year!", (a, c, s) => { const t = Math.floor(num(a, 1, c, s, 1)); if (t === 21) return isoWeek(Math.floor(num(a, 0, c, s))); return weekNum(Math.floor(num(a, 0, c, s)), t); });
    function isoWeek(n) { const d = serialToDate(n), day = (d.getUTCDay() + 6) % 7; const th = new Date(d.getTime() + (3 - day) * DAY_MS); const y = th.getUTCFullYear(); const jan4 = Date.UTC(y, 0, 4); const w1 = jan4 - (((new Date(jan4).getUTCDay() + 6) % 7) * DAY_MS); return Math.floor((th.getTime() - w1) / (7 * DAY_MS)) + 1; }
    def("ISOWEEKNUM", "Date", "ISOWEEKNUM(date)", "The ISO week of the year!", (a, c, s) => isoWeek(Math.floor(num(a, 0, c, s))));
    function holidays(a, i, c, s) { return a[i] && a[i].t !== "empty" ? new Set(flatM(matrix(a, i, c, s)).filter((x) => typeof x === "number").map(Math.floor)) : new Set(); }
    def("WORKDAY", "Date", "WORKDAY(start_date, days, [holidays])", "A date some working days away!", (a, c, s) => { let d = Math.floor(num(a, 0, c, s)), n = Math.trunc(num(a, 1, c, s)); const hol = holidays(a, 2, c, s), step = n < 0 ? -1 : 1; while (n !== 0) { d += step; const w = serialToDate(d).getUTCDay(); if (w !== 0 && w !== 6 && !hol.has(d)) n -= step; } return d; });
    def("NETWORKDAYS.HOL", "Date", "NETWORKDAYS.HOL(start_date, end_date, holidays)", "Working days between two dates, minus holidays!", (a, c, s) => { let x = Math.floor(num(a, 0, c, s)), y = Math.floor(num(a, 1, c, s)), sign = 1; const hol = holidays(a, 2, c, s); if (y < x) { const t = x; x = y; y = t; sign = -1; } let n = 0; for (let d = x; d <= y && d - x < 100000; d++) { const w = serialToDate(d).getUTCDay(); if (w !== 0 && w !== 6 && !hol.has(d)) n++; } return n * sign; });
    def("DAYS360", "Date", "DAYS360(start_date, end_date, [method])", "Days between dates on a 360-day year!", (a, c, s) => { let [y1, m1, d1] = ymd(Math.floor(num(a, 0, c, s))), [y2, m2, d2] = ymd(Math.floor(num(a, 1, c, s))); const eu = toBool(arg(a, 2, c, s, false)); if (eu) { if (d1 === 31) d1 = 30; if (d2 === 31) d2 = 30; } else { const last = (y, m, d) => d === new Date(Date.UTC(y, m, 0)).getUTCDate(); if (m1 === 2 && last(y1, m1, d1)) d1 = 30; if (d1 === 31) d1 = 30; if (d2 === 31 && d1 >= 30) d2 = 30; } return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1); });
    def("YEARFRAC", "Date", "YEARFRAC(start_date, end_date, [basis])", "The part of a year between two dates!", (a, c, s) => {
        let s0 = Math.floor(num(a, 0, c, s)), e0 = Math.floor(num(a, 1, c, s)); const basis = Math.floor(num(a, 2, c, s, 0)); if (e0 < s0) { const t = s0; s0 = e0; e0 = t; }
        const [y1, m1, d1] = ymd(s0), [y2, m2, d2] = ymd(e0);
        if (basis === 0 || basis === 4) { let dd1 = d1, dd2 = d2; if (basis === 4) { if (dd1 === 31) dd1 = 30; if (dd2 === 31) dd2 = 30; } else { const last = (y, m, d) => d === new Date(Date.UTC(y, m, 0)).getUTCDate(); if (m1 === 2 && last(y1, m1, d1)) { dd1 = 30; if (m2 === 2 && last(y2, m2, d2)) dd2 = 30; } if (dd1 === 31) dd1 = 30; if (dd2 === 31 && dd1 >= 30) dd2 = 30; } return ((y2 - y1) * 360 + (m2 - m1) * 30 + (dd2 - dd1)) / 360; }
        if (basis === 2) return (e0 - s0) / 360; if (basis === 3) return (e0 - s0) / 365;
        if (basis === 1) { const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; let days = 0, n = 0; for (let y = y1; y <= y2; y++) { days += leap(y) ? 366 : 365; n++; } return (e0 - s0) / (days / n); }
        return fail(ERR.NUM);
    });
    def("TIMEVALUE", "Date", "TIMEVALUE(text)", "Time text as a fraction of a day!", (a, c, s) => { const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\s*$/i.exec(argStr(a, 0, c, s)); if (!m) fail(ERR.VALUE); let h = +m[1]; if (m[4]) { h = h % 12 + (m[4].toUpperCase() === "PM" ? 12 : 0); } return (h * 3600 + +m[2] * 60 + (+m[3] || 0)) / 86400; });
    // ---------- information, lookup ----------
    def("HYPERLINK", "Lookup", "HYPERLINK(link_location, [friendly_name])", "A cell that opens a link (Ctrl/Cmd+click)!", (a, c, s) => { const link = argStr(a, 0, c, s); return a[1] && a[1].t !== "empty" ? arg(a, 1, c, s, "") : link; });
    def("ISNONTEXT", "Info", "ISNONTEXT(value)", "TRUE if the value is not text!", (a, c, s) => typeof arg(a, 0, c, s, null) !== "string");
    def("ISERR", "Info", "ISERR(value)", "TRUE for any error except #N/A!", (a, c, s) => { try { arg(a, 0, c, s, null); return false; } catch (e) { return isErr(e) && e !== ERR.NA; } });
    def("TYPE", "Info", "TYPE(value)", "1 number, 2 text, 4 logical, 16 error!", (a, c, s) => { try { const v = arg(a, 0, c, s, null); return typeof v === "string" ? 2 : typeof v === "boolean" ? 4 : 1; } catch (e) { if (isErr(e)) return 16; throw e; } });
    def("ERROR.TYPE", "Info", "ERROR.TYPE(error_val)", "A number for each kind of error!", (a, c, s) => { try { arg(a, 0, c, s, null); return fail(ERR.NA); } catch (e) { const k = { "#NULL!": 1, "#DIV/0!": 2, "#VALUE!": 3, "#REF!": 4, "#NAME?": 5, "#NUM!": 6, "#N/A": 7 }[e && e.code]; if (k) return k; throw e; } });
    def("XMATCH", "Lookup", "XMATCH(value, lookup_array, [match_mode], [search_mode])", "The position of a value in a list!", (a, c, s) => {
        const v = arg(a, 0, c, s), list = flatM(matrix(a, 1, c, s)), mode = Math.floor(num(a, 2, c, s, 0)), back = num(a, 3, c, s, 1) < 0; const idx = list.map((_, i) => i); if (back) idx.reverse();
        if (mode === 2) { const t = criterion(argStr(a, 0, c, s)); for (const i of idx) if (t(list[i])) return i + 1; return fail(ERR.NA); }
        let best = -1; for (const i of idx) { const x = list[i]; if (x === null) continue; const cmp = compare(x, v); if (cmp === 0) return i + 1; if (mode === -1 && cmp < 0 && (best < 0 || compare(x, list[best]) > 0)) best = i; if (mode === 1 && cmp > 0 && (best < 0 || compare(x, list[best]) < 0)) best = i; }
        return best >= 0 ? best + 1 : fail(ERR.NA);
    });
    def("LOOKUP", "Lookup", "LOOKUP(value, lookup_vector, [result_vector])", "Finds the last value at or below the one you give!", (a, c, s) => { const v = arg(a, 0, c, s), look = flatM(matrix(a, 1, c, s)), res = a[2] && a[2].t !== "empty" ? flatM(matrix(a, 2, c, s)) : look; let at = -1; for (let i = 0; i < look.length; i++) { if (look[i] === null) continue; if (compare(look[i], v) <= 0) at = i; else break; } return at < 0 || at >= res.length ? fail(ERR.NA) : res[at]; });
    const colLetters = (n) => { let t = ""; for (; n > 0; n = Math.floor((n - 1) / 26)) t = String.fromCharCode(65 + (n - 1) % 26) + t; return t; };
    def("ADDRESS", "Lookup", "ADDRESS(row, column, [abs_num], [a1], [sheet])", "A cell's address as text!", (a, c, s) => { const r = Math.floor(num(a, 0, c, s)), col = Math.floor(num(a, 1, c, s)), t = Math.floor(num(a, 2, c, s, 1)); badNum(r < 1 || col < 1 || t < 1 || t > 4); const addr = (t === 1 || t === 2 ? "$" : "") + colLetters(col) + ((t === 1 || t === 3) ? "$" : "") + r; const sh = a[4] && a[4].t !== "empty" ? argStr(a, 4, c, s) : ""; return (sh ? (/[^A-Za-z0-9_]/.test(sh) ? "'" + sh + "'" : sh) + "!" : "") + addr; });
    function plain(v) { return isErr(v) ? v.code : v; }
    function evaluateSheet(data) {
        const res = evaluateWorkbook([{ name: "Sheet1", data: data || {} }]).values[0];
        const out = {};
        for (const k of Object.keys(res))
            out[k] = plain(res[k]);
        return out;
    }
    function computeFormula(formula, data) {
        const s = String(formula);
        if (!s.startsWith("="))
            return formula;
        const ctx = new Ctx([{ name: "Sheet1", data: data || {} }]);
        const node = parseFormula(s.slice(1));
        if (isErr(node))
            return node.code;
        try {
            let v = ctx.evalNode(node, 0);
            if (isRange(v))
                v = implicit(v);
            return plain(v === null ? 0 : v);
        }
        catch (e) {
            return isErr(e) ? e.code : "#VALUE!";
        }
    }
    function columnStats(values) {
        if (!values || values.length === 0)
            return { count: 0, sum: 0, mean: 0, min: 0, max: 0 };
        const sum = values.reduce((a, b) => a + b, 0);
        return { count: values.length, sum, mean: sum / values.length, min: Math.min(...values), max: Math.max(...values) };
    }
    const FormulaEngine = {
        colToIndex, indexToCol, parseCellRef, cellId, getRangeValues,
        computeFormula, evaluateSheet, columnStats,
        evaluateWorkbook, parseLiteral, formatPattern, isErr,
        shiftFormula, adjustFormula, moveRefs, renameSheetInFormula, refsIn, tokensOf,
        isValidFormula, isFormulaText, functionList, dateToSerial, serialToDate,
    };
    if (typeof module !== "undefined" && module.exports)
        module.exports = FormulaEngine;
    root.FormulaEngine = FormulaEngine;
})(typeof window !== "undefined" ? window : globalThis);
