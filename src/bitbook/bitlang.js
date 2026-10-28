/* =====================================================================
   BitLang! The tiny game language behind Bitbook's Programs skill.
   A Python-feeling language with indentation, `fn` functions and event
   functions (onstart, onframe, onkey, onend), document-only output,
   rich-text output lines and skills (like BeepBox songs).

   This file has no dependencies: Bitbook and Omicron both load it, and any
   `.bl-prog` block in a note or page comes alive when you click it!
   Identical copy in Bitbook and Omicron.
   ===================================================================== */
(function () {
    'use strict';

    /* ================= Errors ================= */
    function BitError(msg, line) { this.message = msg; this.line = line || 0; }
    BitError.prototype = Object.create(Error.prototype);
    function fail(line, msg) { throw new BitError(msg, line); }

    /* ================= Lexer ================= */
    const KEYWORDS = { fn: 1, var: 1, temp: 1, if: 1, elif: 1, else: 1, while: 1, for: 1, in: 1, return: 1, break: 1, continue: 1, pass: 1, and: 1, or: 1, not: 1, true: 1, false: 1, null: 1 };
    // off is either a number (lines before this text) or a list giving the real source line of every line of it
    function lineAt(off, n) { if (Array.isArray(off)) return off[n] !== undefined ? off[n] : (off.length ? off[off.length - 1] + (n - off.length + 1) : n + 1); return (off || 0) + n + 1; }
    function lex(src, off) {
        const tokens = [];
        const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
        const stack = [0];
        let depth = 0; // brackets: newlines inside them don't end a statement
        let cont = false; // a line that ends with & carries on into the next line
        for (let ln = 0; ln < lines.length; ln++) {
            let line = lines[ln];
            const lineNo = lineAt(off, ln);
            let i = 0;
            const joining = cont;
            cont = false;
            if (joining && /^\s*(#.*)?$/.test(line)) { cont = true; continue; }
            if (depth === 0 && !joining) {
                // blank or comment-only lines are ignored
                if (/^\s*(#.*)?$/.test(line)) continue;
                let ind = 0;
                while (i < line.length && (line[i] === ' ' || line[i] === '\t')) { ind += line[i] === '\t' ? 4 : 1; i++; }
                if (ind > stack[stack.length - 1]) { stack.push(ind); tokens.push({ t: 'INDENT', line: lineNo }); }
                else {
                    while (ind < stack[stack.length - 1]) { stack.pop(); tokens.push({ t: 'DEDENT', line: lineNo }); }
                    if (ind !== stack[stack.length - 1]) fail(lineNo, 'The indentation does not line up with an earlier line!');
                }
            }
            while (i < line.length) {
                const c = line[i];
                if (c === ' ' || c === '\t') { i++; continue; }
                if (c === '#') break;
                // A bare link is a string: https://example.com/#song
                if ((c === 'h') && /^https?:\/\//.test(line.slice(i))) {
                    const m = /^https?:\/\/[^\s,)\]}]*/.exec(line.slice(i));
                    tokens.push({ t: 'STR', v: m[0], line: lineNo });
                    i += m[0].length;
                    continue;
                }
                if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(line[i + 1] || ''))) {
                    const m = /^(0x[0-9a-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?)/.exec(line.slice(i));
                    tokens.push({ t: 'NUM', v: Number(m[0]), line: lineNo });
                    i += m[0].length;
                    continue;
                }
                if (/[A-Za-z_]/.test(c)) {
                    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(i));
                    const w = m[0];
                    tokens.push(KEYWORDS[w] ? { t: 'KW', v: w, line: lineNo } : { t: 'NAME', v: w, line: lineNo });
                    i += w.length;
                    continue;
                }
                if (c === '"' && line[i + 1] === '>' && tokens.length && tokens[tokens.length - 1].t === 'OP' && tokens[tokens.length - 1].v === ']' && tokens[tokens.length - 1].line === lineNo) {
                    tokens.push({ t: 'OP', v: '">', line: lineNo }); // the mouse operator: matc Name ["old" ~> "x"] "> ["new" ~> "y"]
                    i += 2;
                    continue;
                }
                if (c === '"' || c === "'") {
                    let j = i + 1, out = '';
                    while (j < line.length && line[j] !== c) {
                        if (line[j] === '\\' && j + 1 < line.length) {
                            const n = line[j + 1];
                            out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
                            j += 2;
                        } else out += line[j++];
                    }
                    if (j >= line.length) fail(lineNo, 'This text is missing its closing quote!');
                    tokens.push({ t: 'STR', v: out, line: lineNo });
                    i = j + 1;
                    continue;
                }
                const two = line.slice(i, i + 2);
                if (two === '~>' || two === '<|' || two === '|>' || two === '**' || two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '+=' || two === '-=' || two === '*=' || two === '/=') { tokens.push({ t: 'OP', v: two, line: lineNo }); i += 2; continue; }
                if ('+-*/%<>=()[]{},.:&;'.indexOf(c) !== -1) {
                    if ('([{'.indexOf(c) !== -1) depth++;
                    if (')]}'.indexOf(c) !== -1) depth = Math.max(0, depth - 1);
                    tokens.push({ t: 'OP', v: c, line: lineNo });
                    i++;
                    continue;
                }
                fail(lineNo, 'I do not know what "' + c + '" means here!');
            }
            if (depth === 0) {
                const last = tokens[tokens.length - 1];
                if (last && last.t === 'OP' && last.v === '&' && last.line === lineNo) cont = true; // (& at the end of a line: the next line joins this one)
                else tokens.push({ t: 'NL', line: lineNo });
            }
        }
        while (stack.length > 1) { stack.pop(); tokens.push({ t: 'DEDENT', line: lines.length }); }
        tokens.push({ t: 'EOF', line: lines.length });
        return tokens;
    }

    /* ================= Parser ================= */
    // lam(a; b; c): each ";" starts a new statement (a trailing & carries on into the next one).
    // Finds every lam( ... ) in the source and parses its statements as a little body, remembered by number.
    function scanTo(src, i, stopAt) {
        // walks from i (just after an opener) to its matching ")" skipping strings, comments and bare links; returns the index
        let depth = 0;
        for (; i < src.length; i++) {
            const c = src[i];
            if (c === '"' && src[i + 1] === '>' && /\]\s*$/.test(src.slice(Math.max(0, i - 40), i))) { i++; continue; }
            if (c === '"' || c === "'") { const q = c; i++; while (i < src.length && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') i++; i++; } continue; }
            if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
            if (c === 'h' && /^https?:\/\//.test(src.slice(i, i + 8)) && !/\w/.test(src[i - 1] || ' ')) { const m = /^https?:\/\/[^\s,)\]}]*/.exec(src.slice(i)); i += m[0].length - 1; continue; }
            if (c === '(' || c === '[' || c === '{') depth++;
            else if (c === ')' || c === ']' || c === '}') { if (depth === 0) return i; depth--; }
        }
        return -1;
    }
    function splitStatements(inner) {
        const out = [];
        let start = 0, depth = 0;
        for (let i = 0; i < inner.length; i++) {
            const c = inner[i];
            if (c === '"' && inner[i + 1] === '>' && /\]\s*$/.test(inner.slice(Math.max(0, i - 40), i))) { i++; continue; }
            if (c === '"' || c === "'") { const q = c; i++; while (i < inner.length && inner[i] !== q && inner[i] !== '\n') { if (inner[i] === '\\') i++; i++; } continue; }
            if (c === '#') { while (i < inner.length && inner[i] !== '\n') i++; continue; }
            if (c === 'h' && /^https?:\/\//.test(inner.slice(i, i + 8)) && !/\w/.test(inner[i - 1] || ' ')) { const m = /^https?:\/\/[^\s,)\]}]*/.exec(inner.slice(i)); i += m[0].length - 1; continue; }
            if (c === '(' || c === '[' || c === '{') depth++;
            else if (c === ')' || c === ']' || c === '}') depth--;
            else if (c === ';' && depth === 0) { out.push({ t: inner.slice(start, i), s: start }); start = i + 1; }
        }
        out.push({ t: inner.slice(start), s: start });
        return out;
    }
    function inStringOrComment(text) {
        let q = '';
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (q) { if (c === '\\') i++; else if (c === q) q = ''; }
            else if (c === '"' && text[i + 1] === '>' && /\]\s*$/.test(text.slice(0, i))) i++;
            else if (c === '"' || c === "'") q = c;
            else if (c === '#') return true;
        }
        return !!q;
    }
    function preLam(src, ctx, off) {
        if (src.indexOf('lam') === -1) return src;
        let out = '', last = 0;
        const re = /(^|[^\w.])lam\s*\(/g;
        let m;
        while ((m = re.exec(src))) {
            const open = m.index + m[0].length - 1;
            // make sure the match is not inside a string or a comment on its line
            const lineStart = src.lastIndexOf('\n', m.index) + 1;
            const before = src.slice(lineStart, m.index + m[1].length);
            if (inStringOrComment(before)) continue; // inside a quote or after a # on its line: leave it alone
            const close = scanTo(src, open + 1);
            if (close === -1) continue; // lex/parse will report the unclosed bracket
            const inner = src.slice(open + 1, close);
            const nlCount = function (upto) { return (src.slice(0, upto).match(/\n/g) || []).length; };
            const pieces = [], lineMap = [];
            splitStatements(inner).forEach(function (pc) {
                const lead = pc.t.length - pc.t.replace(/^\s+/, '').length;
                const text = pc.t.trim();
                if (!text) return;
                const startAbs = open + 1 + pc.s + lead;
                const startLine = lineAt(off || 0, nlCount(startAbs));
                text.split('\n').forEach(function (_, kk) { lineMap.push(startLine + kk); });
                pieces.push(text);
            });
            const idx = ctx.lams.length;
            ctx.lams.push([]);
            ctx.lams[idx] = parse(pieces.join('\n'), ctx, lineMap);
            const nlIn = (inner.match(/\n/g) || []).length;
            out += src.slice(last, m.index + m[1].length) + 'lam(' + idx + new Array(nlIn + 1).join('\n') + ')';
            last = close + 1;
            re.lastIndex = close + 1;
        }
        return out + src.slice(last);
    }
    function parse(src, ctx, off) {
        if (!ctx) ctx = { lams: [] };
        src = preLam(src, ctx, off || 0);
        const toks = lex(src, off || 0);
        let p = 0;
        const peek = function () { return toks[p]; };
        const next = function () { return toks[p++]; };
        const isOp = function (v) { const t = toks[p]; return t.t === 'OP' && t.v === v; };
        const isKw = function (v) { const t = toks[p]; return t.t === 'KW' && t.v === v; };
        function expectOp(v) { const t = next(); if (t.t !== 'OP' || t.v !== v) fail(t.line, 'I expected "' + v + '" here!'); return t; }
        function expectNL() { const t = peek(); if (t.t === 'NL') { p++; return; } if (t.t === 'EOF' || t.t === 'DEDENT') return; fail(t.line, 'There is something extra at the end of this line!'); }
        function block() {
            expectOp(':');
            const nl = next();
            if (nl.t !== 'NL') fail(nl.line, 'After ":" the code goes on the next lines, indented!');
            const ind = next();
            if (ind.t !== 'INDENT') fail(ind.line, 'This needs indented lines under it!');
            const body = [];
            while (peek().t !== 'DEDENT' && peek().t !== 'EOF') body.push(statement());
            if (peek().t === 'DEDENT') p++;
            return body;
        }
        function statement() {
            const t = peek();
            const line = t.line;
            if (t.t === 'NAME' && t.v === 'matc' && toks[p + 1].t === 'NAME' && toks[p + 2].t === 'OP' && toks[p + 2].v === '[') {
                // matc Name ["old key" ~> old value] "> ["new key" ~> new value]   - changes one pair of a matcher
                p++;
                const name = next().v;
                const pairIn = function () {
                    expectOp('[');
                    const k = expr();
                    if (!isOp('~>')) fail(peek().line, 'matc reads: matc Name ["old" ~> "old value"] "> ["new" ~> "new value"]!');
                    p++;
                    const v = expr();
                    expectOp(']');
                    return { k: k, v: v };
                };
                const from = pairIn();
                if (!isOp('">')) fail(peek().line, 'matc needs the mouse operator "> between the old pair and the new one!');
                p++;
                const to = pairIn();
                expectNL();
                return { k: 'matc', name: name, from: from, to: to, line: line };
            }
            if (t.t === 'NAME' && t.v === 'mat' && toks[p + 1].t === 'NAME' && toks[p + 2].t === 'OP' && toks[p + 2].v === ':') {
                // mat Name: ( "key" ~> value   "other" ~> value ... )  - a matcher
                p++;
                const name = next().v;
                p++; // the ":"
                expectOp('(');
                const pairs = [];
                while (!isOp(')')) {
                    if (peek().t === 'EOF') fail(line, 'This matcher is missing its closing )!');
                    if (isOp(',')) { p++; continue; }
                    const key = expr();
                    if (!isOp('~>')) fail(peek().line, 'A matcher line reads: "what to find" ~> what it becomes!');
                    p++;
                    pairs.push({ k: key, v: expr() });
                }
                expectOp(')');
                expectNL();
                return { k: 'matcher', name: name, pairs: pairs, line: line };
            }
            if (t.t === 'NAME' && t.v === 'use' && toks[p + 1].t === 'NAME' && (toks[p + 2].t === 'NL' || toks[p + 2].t === 'EOF' || toks[p + 2].t === 'DEDENT' || toks[p + 2].t === 'NAME' || (toks[p + 2].t === 'OP' && toks[p + 2].v === ','))) {
                // use python / use sqlite / use lua   (python can name extra packages: use python numpy, pandas)
                p++;
                const lib = next().v;
                if (['python', 'sqlite', 'lua'].indexOf(lib) < 0) fail(line, 'I do not know the library "' + lib + '" (try: use python, use sqlite or use lua)!');
                const pkgs = [];
                while (peek().t === 'NAME' || isOp(',')) { if (isOp(',')) { p++; continue; } pkgs.push(next().v); }
                expectNL();
                return { k: 'use', lib: lib, pkgs: pkgs, line: line };
            }
            if (t.t === 'KW') {
                if (t.v === 'var') {
                    p++;
                    let temp = false;
                    if (isKw('temp')) { p++; temp = true; }
                    const n = next();
                    if (n.t !== 'NAME') fail(n.line, 'A variable needs a name after var!');
                    expectOp('=');
                    const e = expr();
                    expectNL();
                    return { k: 'var', name: n.v, temp: temp, e: e, line: line };
                }
                if (t.v === 'fn') {
                    p++;
                    const n = next();
                    if (n.t !== 'NAME') fail(n.line, 'A function needs a name after fn!');
                    expectOp('(');
                    const params = [];
                    while (!isOp(')')) {
                        const pn = next();
                        if (pn.t !== 'NAME') fail(pn.line, 'A parameter needs a name!');
                        let def = null;
                        if (isOp('=')) { p++; def = expr(); }
                        params.push({ name: pn.v, def: def });
                        if (isOp(',')) p++; else break;
                    }
                    expectOp(')');
                    return { k: 'fn', name: n.v, params: params, body: block(), line: line };
                }
                if (t.v === 'if') {
                    p++;
                    const arms = [];
                    let els = null;
                    arms.push({ c: expr(), body: block() });
                    while (isKw('elif')) { p++; arms.push({ c: expr(), body: block() }); }
                    if (isKw('else')) { p++; els = block(); }
                    return { k: 'if', arms: arms, els: els, line: line };
                }
                if (t.v === 'while') { p++; const c = expr(); return { k: 'while', c: c, body: block(), line: line }; }
                if (t.v === 'for') {
                    p++;
                    const n = next();
                    if (n.t !== 'NAME') fail(n.line, 'A loop needs a name for each item!');
                    if (!isKw('in')) fail(peek().line, 'A for loop reads: for item in something:');
                    p++;
                    const it = expr();
                    return { k: 'for', name: n.v, it: it, body: block(), line: line };
                }
                if (t.v === 'return') { p++; let e = null; if (peek().t !== 'NL' && peek().t !== 'EOF' && peek().t !== 'DEDENT') e = expr(); expectNL(); return { k: 'return', e: e, line: line }; }
                if (t.v === 'break' || t.v === 'continue' || t.v === 'pass') { p++; expectNL(); return { k: t.v, line: line }; }
            }
            // assignment or expression statement
            const e = expr();
            const nx = peek();
            if (nx.t === 'OP' && (nx.v === '=' || nx.v === '+=' || nx.v === '-=' || nx.v === '*=' || nx.v === '/=')) {
                p++;
                if (e.k !== 'name' && e.k !== 'index' && e.k !== 'member') fail(nx.line, 'You can only put a value into a variable, a list slot or a map key!');
                const v = expr();
                expectNL();
                return { k: 'assign', target: e, op: nx.v, e: v, line: line };
            }
            expectNL();
            return { k: 'expr', e: e, line: line };
        }
        function expr() { return orExpr(); }
        function orExpr() { let l = andExpr(); while (isKw('or')) { const line = next().line; l = { k: 'bin', op: 'or', l: l, r: andExpr(), line: line }; } return l; }
        function andExpr() { let l = notExpr(); while (isKw('and')) { const line = next().line; l = { k: 'bin', op: 'and', l: l, r: notExpr(), line: line }; } return l; }
        function notExpr() { if (isKw('not')) { const line = next().line; return { k: 'not', e: notExpr(), line: line }; } return cmp(); }
        function cmp() {
            let l = add();
            for (;;) {
                const t = peek();
                if (t.t === 'OP' && (t.v === '==' || t.v === '!=' || t.v === '<' || t.v === '>' || t.v === '<=' || t.v === '>=')) { p++; l = { k: 'bin', op: t.v, l: l, r: add(), line: t.line }; }
                else if (t.t === 'KW' && t.v === 'in') { p++; l = { k: 'bin', op: 'in', l: l, r: add(), line: t.line }; }
                else break;
            }
            return l;
        }
        function add() { let l = mul(); for (;;) { const t = peek(); if (t.t === 'OP' && (t.v === '+' || t.v === '-' || t.v === '&')) { p++; l = { k: 'bin', op: t.v, l: l, r: mul(), line: t.line }; } else break; } return l; }
        function mul() { let l = unary(); for (;;) { const t = peek(); if (t.t === 'OP' && (t.v === '*' || t.v === '/' || t.v === '%')) { p++; l = { k: 'bin', op: t.v, l: l, r: unary(), line: t.line }; } else break; } return l; }
        function unary() { if (isOp('-')) { const line = next().line; return { k: 'neg', e: unary(), line: line }; } return pow(); }
        function pow() { const l = postfix(); if (isOp('**')) { const line = next().line; return { k: 'bin', op: '**', l: l, r: unary(), line: line }; } return l; }
        function postfix() {
            let e = primary();
            for (;;) {
                if (isOp('(')) {
                    const line = next().line;
                    const args = [];
                    while (!isOp(')')) {
                        let name = null;
                        if (peek().t === 'NAME' && toks[p + 1].t === 'OP' && toks[p + 1].v === '=') { name = next().v; p++; }
                        args.push({ name: name, e: expr() });
                        if (isOp(',')) p++; else break;
                    }
                    expectOp(')');
                    e = { k: 'call', f: e, args: args, line: line };
                } else if (isOp('[')) { const line = next().line; const i = expr(); expectOp(']'); e = { k: 'index', e: e, i: i, line: line }; }
                else if (isOp('.')) { const line = next().line; const n = next(); if (n.t !== 'NAME' && n.t !== 'KW') fail(n.line, 'A dot needs a name after it!'); e = { k: 'member', e: e, name: n.v, line: line }; }
                else break;
            }
            return e;
        }
        function primary() {
            const t = next();
            if (t.t === 'NUM') return { k: 'lit', v: t.v, line: t.line };
            if (t.t === 'STR') return { k: 'lit', v: t.v, line: t.line };
            if (t.t === 'NAME') return { k: 'name', name: t.v, line: t.line };
            if (t.t === 'KW') {
                if (t.v === 'true') return { k: 'lit', v: true, line: t.line };
                if (t.v === 'false') return { k: 'lit', v: false, line: t.line };
                if (t.v === 'null') return { k: 'lit', v: null, line: t.line };
                if (t.v === 'temp') return { k: 'name', name: 'temp', line: t.line };
            }
            if (t.t === 'OP' && t.v === '(') { const e = expr(); expectOp(')'); return e; }
            if (t.t === 'OP' && t.v === '<|') {
                const items = [];
                while (!isOp('|>')) { items.push(expr()); if (isOp(',')) p++; else break; }
                expectOp('|>');
                return { k: 'vec', items: items, line: t.line };
            }
            if (t.t === 'OP' && t.v === '[') {
                // [1 2; 3 4] is a matrix (a ; between rows, spaces between numbers); [1, 2] is a list
                let depth = 0, semi = false, comma = false;
                for (let q = p; q < toks.length; q++) {
                    const tk = toks[q];
                    if (tk.t === 'OP') {
                        if (tk.v === '(' || tk.v === '[' || tk.v === '{' || tk.v === '<|') depth++;
                        else if (tk.v === ')' || tk.v === '}' || tk.v === '|>') depth--;
                        else if (tk.v === ']') { if (depth === 0) break; depth--; }
                        else if (depth === 0 && tk.v === ';') semi = true;
                        else if (depth === 0 && tk.v === ',') comma = true;
                    }
                    if (tk.t === 'EOF') break;
                }
                const startsElement = function () { const x = peek(); return x.t === 'NUM' || x.t === 'NAME' || x.t === 'STR' || (x.t === 'KW' && (x.v === 'true' || x.v === 'false' || x.v === 'null')) || (x.t === 'OP' && (x.v === '(' || x.v === '[' || x.v === '-' || x.v === '<|')); };
                let matrix = semi;
                if (!semi && !comma && !isOp(']')) {
                    const save = p;
                    try { unary(); if (!isOp(']') && startsElement()) matrix = true; } catch (er) { matrix = false; }
                    p = save;
                }
                if (matrix) {
                    const rows = [[]];
                    while (!isOp(']')) {
                        if (isOp(';')) { p++; rows.push([]); continue; }
                        if (isOp(',')) { p++; continue; }
                        if (peek().t === 'EOF') fail(t.line, 'This matrix is missing its closing ]!');
                        rows[rows.length - 1].push(comma ? expr() : unary());
                    }
                    expectOp(']');
                    if (!rows[rows.length - 1].length) rows.pop();
                    return { k: 'mat', rows: rows, line: t.line };
                }
                const items = [];
                while (!isOp(']')) { items.push(expr()); if (isOp(',')) p++; else break; }
                expectOp(']');
                return { k: 'list', items: items, line: t.line };
            }
            if (t.t === 'OP' && t.v === '{') {
                const items = [];
                while (!isOp('}')) {
                    const kt = next();
                    if (kt.t !== 'NAME' && kt.t !== 'STR') fail(kt.line, 'A map key must be a name or text!');
                    expectOp(':');
                    items.push([kt.v, expr()]);
                    if (isOp(',')) p++; else break;
                }
                expectOp('}');
                return { k: 'map', items: items, line: t.line };
            }
            fail(t.line, 'I did not expect this here!');
        }
        const body = [];
        body.lams = ctx.lams;
        while (peek().t !== 'EOF') { if (peek().t === 'NL' || peek().t === 'DEDENT') { p++; continue; } body.push(statement()); }
        return body;
    }

    /* ================= Interpreter ================= */
    const INHERIT = { __inherit: true, toString: function () { return 'inherit'; } };
    function Signal(kind, v) { this.kind = kind; this.v = v; }
    function BitFn(def, closure) { this.def = def; this.closure = closure; }
    // vectors <| 1, 2, 3 |> and matrices [1 2; 3 4] (numbers only)
    function BitMatcher(name, pairs, scope) { this.name = name; this.pairs = pairs; this.scope = scope; }
    function BitVec(a) { this.a = a; }
    function BitMat(r) { this.r = r; }
    function anyValues(list, line, what) { list.forEach(function (x) { if (x instanceof BitFn || typeof x === 'function') fail(line, what + ' cannot hold a function!'); }); return list; }
    function arith(op, x, y, line) {
        if (typeof x === 'number' && typeof y === 'number') return op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y;
        if (op === '+' && (typeof x === 'string' || typeof y === 'string')) return (typeof x === 'string' ? x : show(x)) + (typeof y === 'string' ? y : show(y));
        if (op === '*' && typeof x === 'string' && typeof y === 'number') return x.repeat(Math.max(0, Math.min(1000, Math.floor(y))));
        if (op === '*' && typeof y === 'string' && typeof x === 'number') return y.repeat(Math.max(0, Math.min(1000, Math.floor(x))));
        fail(line, 'A vector slot with ' + (typeof x === 'string' || typeof y === 'string' ? 'text' : 'that kind of value') + ' cannot be used with ' + op + ' like that (only + joins text, * repeats it)!');
    }
    function numVec(v, line, who) { v.a.forEach(function (x) { if (typeof x !== 'number') fail(line, who + ' needs a vector of numbers!'); }); return v; }
    function numOnly(list, line, what) { list.forEach(function (x) { if (typeof x !== 'number') fail(line, what + ' can only hold numbers!'); }); return list; }
    function revive(v) {
        if (Array.isArray(v)) return v.map(revive);
        if (v && typeof v === 'object' && !(v instanceof BitFn) && !(v instanceof BitVec) && !(v instanceof BitMat)) {
            if (Array.isArray(v.$vec)) return new BitVec(v.$vec.slice());
            if (Array.isArray(v.$mat)) return new BitMat(v.$mat.map(function (r) { return r.slice(); }));
            const o = {}; Object.keys(v).forEach(function (k) { o[k] = revive(v[k]); }); return o;
        }
        return v;
    }
    function dimStr(m) { return m.r.length + '×' + (m.r[0] ? m.r[0].length : 0); }
    function matMul(A, B, line) {
        const n = A.r.length, k = A.r[0].length, m = B.r[0].length;
        if (B.r.length !== k) fail(line, 'These matrices do not fit: ' + dimStr(A) + ' times ' + dimStr(B) + ' (the columns of the first must match the rows of the second)!');
        const out = [];
        for (let i = 0; i < n; i++) { const row = []; for (let j = 0; j < m; j++) { let t = 0; for (let x = 0; x < k; x++) t += A.r[i][x] * B.r[x][j]; row.push(t); } out.push(row); }
        return new BitMat(out);
    }
    function transpose(M) { const out = []; for (let j = 0; j < M.r[0].length; j++) { const row = []; for (let i = 0; i < M.r.length; i++) row.push(M.r[i][j]); out.push(row); } return new BitMat(out); }
    function identity(n) { const out = []; for (let i = 0; i < n; i++) { const row = []; for (let j = 0; j < n; j++) row.push(i === j ? 1 : 0); out.push(row); } return new BitMat(out); }
    function det(M, line) {
        if (M.r.length !== M.r[0].length) fail(line, 'Only square matrices have a determinant!');
        const n = M.r.length, a = M.r.map(function (r) { return r.slice(); });
        let d = 1;
        for (let c = 0; c < n; c++) {
            let piv = c;
            for (let i = c + 1; i < n; i++) if (Math.abs(a[i][c]) > Math.abs(a[piv][c])) piv = i;
            if (Math.abs(a[piv][c]) < 1e-12) return 0;
            if (piv !== c) { const t = a[piv]; a[piv] = a[c]; a[c] = t; d = -d; }
            d *= a[c][c];
            for (let i = c + 1; i < n; i++) { const f = a[i][c] / a[c][c]; for (let j = c; j < n; j++) a[i][j] -= f * a[c][j]; }
        }
        return d;
    }
    function inverse(M, line) {
        if (M.r.length !== M.r[0].length) fail(line, 'Only square matrices can be inverted!');
        const n = M.r.length, a = M.r.map(function (r, i) { return r.concat(identity(n).r[i]); });
        for (let c = 0; c < n; c++) {
            let piv = c;
            for (let i = c + 1; i < n; i++) if (Math.abs(a[i][c]) > Math.abs(a[piv][c])) piv = i;
            if (Math.abs(a[piv][c]) < 1e-12) fail(line, 'This matrix has no inverse (its determinant is 0)!');
            const t = a[piv]; a[piv] = a[c]; a[c] = t;
            const d = a[c][c];
            for (let j = 0; j < 2 * n; j++) a[c][j] /= d;
            for (let i = 0; i < n; i++) if (i !== c) { const f = a[i][c]; for (let j = 0; j < 2 * n; j++) a[i][j] -= f * a[c][j]; }
        }
        return new BitMat(a.map(function (r) { return r.slice(n); }));
    }
    function vecMathOp(op, l, r, line) {
        const isV = function (x) { return x instanceof BitVec; }, isM = function (x) { return x instanceof BitMat; }, isN = function (x) { return typeof x === 'number' || typeof x === 'string'; };
        const each = function (a, b, f) { return a.map(function (x, i) { return f(x, b[i]); }); };
        if (op === '==') return same(l, r);
        if (op === '!=') return !same(l, r);
        if (op === 'in') fail(line, 'Use contains(list, x) to look inside a list; vectors and matrices have no "in"!');
        if (op === '<' || op === '>' || op === '<=' || op === '>=') fail(line, 'Vectors and matrices cannot be compared with ' + op + '!');
        if (isV(l) && isV(r)) {
            if (l.a.length !== r.a.length) fail(line, 'These vectors have different lengths (' + l.a.length + ' and ' + r.a.length + ')!');
            if (op === '+' || op === '-' || op === '*' || op === '/') return new BitVec(each(l.a, r.a, function (x, y) { return arith(op, x, y, line); })); // slot by slot (use dot() for the dot product)
        }
        if (isM(l) && isM(r)) {
            if (op === '*') return matMul(l, r, line);
            if (l.r.length !== r.r.length || l.r[0].length !== r.r[0].length) fail(line, 'These matrices have different sizes (' + dimStr(l) + ' and ' + dimStr(r) + ')!');
            if (op === '+') return new BitMat(l.r.map(function (row, i) { return each(row, r.r[i], function (x, y) { return x + y; }); }));
            if (op === '-') return new BitMat(l.r.map(function (row, i) { return each(row, r.r[i], function (x, y) { return x - y; }); }));
        }
        if (isM(l) && isV(r) && op === '*') { numVec(r, line, 'A matrix times a vector');  const out = matMul(l, new BitMat(r.a.map(function (x) { return [x]; })), line); return new BitVec(out.r.map(function (row) { return row[0]; })); }
        if (isV(l) && isM(r) && op === '*') { numVec(l, line, 'A vector times a matrix');  const out = matMul(new BitMat([l.a]), r, line); return new BitVec(out.r[0]); }
        if (isN(r) && (isV(l) || isM(l))) {
            const f = { '+': function (x) { return arith('+', x, r, line); }, '-': function (x) { return arith('-', x, r, line); }, '*': function (x) { return arith('*', x, r, line); }, '/': function (x) { return arith('/', x, r, line); } }[op];
            if (f) return isV(l) ? new BitVec(l.a.map(f)) : new BitMat(l.r.map(function (row) { return row.map(f); }));
            if (op === '**' && isM(l)) {
                if (l.r.length !== l.r[0].length) fail(line, 'Only square matrices can be raised to a power!');
                if (r !== Math.floor(r) || r < 0 || r > 64) fail(line, 'A matrix power must be a whole number from 0 to 64!');
                let out = identity(l.r.length);
                for (let i = 0; i < r; i++) out = matMul(out, l, line);
                return out;
            }
        }
        if (isN(l) && (isV(r) || isM(r))) {
            const f = { '+': function (x) { return arith('+', l, x, line); }, '-': function (x) { return arith('-', l, x, line); }, '*': function (x) { return arith('*', l, x, line); } }[op];
            if (f) return isV(r) ? new BitVec(r.a.map(f)) : new BitMat(r.r.map(function (row) { return row.map(f); }));
        }
        fail(line, 'I cannot do ' + op + ' with these (' + (isV(l) ? 'a vector' : isM(l) ? 'a matrix' : 'a ' + typeof l) + ' and ' + (isV(r) ? 'a vector' : isM(r) ? 'a matrix' : 'a ' + typeof r) + ')!');
    }
    function Scope(parent) { this.vars = Object.create(null); this.parent = parent || null; }
    Scope.prototype.find = function (n) { for (let s = this; s; s = s.parent) if (n in s.vars) return s; return null; };

    function truthy(v) { return !(v === false || v === null || v === undefined || v === 0 || v === '' || (Array.isArray(v) && !v.length)); }
    function show(v) {
        if (v === null || v === undefined) return 'null';
        if (v === true) return 'true';
        if (v === false) return 'false';
        if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
        if (Array.isArray(v)) return '[' + v.map(function (x) { return typeof x === 'string' ? JSON.stringify(x) : show(x); }).join(', ') + ']';
        if (v instanceof BitFn) return '<fn ' + v.def.name + '>';
        if (v instanceof BitMatcher) return '<matcher ' + v.name + '>';
        if (v instanceof BitVec) return '<| ' + v.a.map(function (x) { return typeof x === 'string' ? JSON.stringify(x) : show(x); }).join(', ') + ' |>';
        if (v instanceof BitMat) return '[' + v.r.map(function (r) { return r.map(show).join(' '); }).join('; ') + ']';
        if (v === INHERIT) return 'inherit';
        if (typeof v === 'object') return '{' + Object.keys(v).map(function (k) { return k + ': ' + (typeof v[k] === 'string' ? JSON.stringify(v[k]) : show(v[k])); }).join(', ') + '}';
        return String(v);
    }

    function Runtime(code, host) {
        this.host = host || {};
        this.ast = parse(code);
        this.lams = this.ast.lams || [];
        this.libs = [];
        this.ast.forEach(function (st) { if (st.k === 'use') { let l = this.libs.find(function (x) { return x.lib === st.lib; }); if (!l) { l = { lib: st.lib, pkgs: [], line: st.line }; this.libs.push(l); } st.pkgs.forEach(function (n) { if (l.pkgs.indexOf(n) < 0) l.pkgs.push(n); }); } }, this);
        this.globals = new Scope(null);
        this.steps = 0;
        this.budget = 400000;
        this.fns = Object.create(null);
        this.stopped = false;
        this.persist = this.host.vars || {};
        this.skills = [];
        this.btns = [];
        this.inputs = [];
        installBuiltins(this);
    }
    Runtime.prototype.tick = function (line) { if (++this.steps > this.budget) fail(line, 'This program took too long without a break (an endless loop?)! I stopped it.'); };
    Runtime.prototype.lookup = function (scope, name, line) {
        const s = scope.find(name);
        if (s) return s.vars[name];
        fail(line, 'I do not know a "' + name + '" (check the spelling, or create it with var)!');
    };
    Runtime.prototype.evalE = function (e, scope) {
        this.tick(e.line);
        switch (e.k) {
            case 'lit': return e.v;
            case 'name': return this.lookup(scope, e.name, e.line);
            case 'list': return e.items.map(function (x) { return this.evalE(x, scope); }, this);
            case 'vec': return new BitVec(anyValues(e.items.map(function (x) { return this.evalE(x, scope); }, this), e.line, 'A vector'));
            case 'mat': {
                const rows = e.rows.map(function (r) { return numOnly(r.map(function (x) { return this.evalE(x, scope); }, this), e.line, 'A matrix'); }, this);
                if (!rows.length || !rows[0].length) fail(e.line, 'A matrix needs at least one number!');
                rows.forEach(function (r) { if (r.length !== rows[0].length) fail(e.line, 'Every row of a matrix needs the same number of values (this one has ' + r.length + ' and the first has ' + rows[0].length + ')!'); });
                return new BitMat(rows);
            }
            case 'map': { const o = {}; e.items.forEach(function (kv) { o[kv[0]] = this.evalE(kv[1], scope); }, this); return o; }
            case 'neg': { const v = this.evalE(e.e, scope); if (v instanceof BitVec) return new BitVec(numVec(v, e.line, 'Negating a vector').a.map(function (x) { return -x; })); if (v instanceof BitMat) return new BitMat(v.r.map(function (r) { return r.map(function (x) { return -x; }); })); if (typeof v !== 'number') fail(e.line, 'Only numbers can be negated!'); return -v; }
            case 'not': return !truthy(this.evalE(e.e, scope));
            case 'bin': return this.binary(e, scope);
            case 'index': {
                const o = this.evalE(e.e, scope), i = this.evalE(e.i, scope);
                if (o instanceof BitVec || o instanceof BitMat) {
                    if (typeof i !== 'number') fail(e.line, 'A position must be a number!');
                    const n = o instanceof BitVec ? o.a.length : o.r.length, k = i < 0 ? n + i : i;
                    if (k < 0 || k >= n) return null;
                    return o instanceof BitVec ? o.a[k] : new BitVec(o.r[k]); // a matrix row is a live vector: m[1][0] = 5 works
                }
                if (Array.isArray(o) || typeof o === 'string') {
                    if (typeof i !== 'number') fail(e.line, 'A position must be a number!');
                    const k = i < 0 ? o.length + i : i;
                    return k >= 0 && k < o.length ? o[k] : null;
                }
                if (o && typeof o === 'object') return Object.prototype.hasOwnProperty.call(o, i) ? o[i] : null;
                fail(e.line, 'You can only use [ ] on lists, text and maps!');
            }
            case 'member': {
                const o = this.evalE(e.e, scope);
                if (o instanceof BitVec) {
                    const ix = { x: 0, y: 1, z: 2, w: 3 }[e.name];
                    if (ix !== undefined) return ix < o.a.length ? o.a[ix] : null;
                    if (e.name === 'length' || e.name === 'len') return o.a.length;
                    fail(e.line, 'A vector has .x .y .z .w and .length!');
                }
                if (o instanceof BitMat) {
                    if (e.name === 'rows') return o.r.length;
                    if (e.name === 'cols') return o.r[0].length;
                    if (e.name === 'T') return transpose(o);
                    fail(e.line, 'A matrix has .rows .cols and .T (transpose)!');
                }
                if (o && typeof o === 'object' && !Array.isArray(o)) return Object.prototype.hasOwnProperty.call(o, e.name) ? o[e.name] : null;
                if (Array.isArray(o) || typeof o === 'string') { if (e.name === 'length' || e.name === 'len') return o.length; }
                fail(e.line, 'Only maps have .names!');
            }
            case 'call': return this.callE(e, scope);
        }
        fail(e.line, 'Unknown expression!');
    };
    Runtime.prototype.binary = function (e, scope) {
        const op = e.op;
        if (op === 'and') { const l = this.evalE(e.l, scope); return truthy(l) ? this.evalE(e.r, scope) : l; }
        if (op === 'or') { const l = this.evalE(e.l, scope); return truthy(l) ? l : this.evalE(e.r, scope); }
        // inside an expression (like a & renderRT(" ") & b), renderRT just hands back its rich text instead of showing it
        this.depth = (this.depth || 0) + 1;
        let l, r;
        try { l = this.evalE(e.l, scope); r = this.evalE(e.r, scope); } finally { this.depth--; }
        if (op !== '&' && (l instanceof BitVec || l instanceof BitMat || r instanceof BitVec || r instanceof BitMat)) return vecMathOp(op, l, r, e.line);
        switch (op) {
            case '&': return show0(l) + show0(r); // joins pieces into one line (buttons in a row!)
            case '+':
                if (typeof l === 'number' && typeof r === 'number') return l + r;
                if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
                if (typeof l === 'string' || typeof r === 'string') return show0(l) + show0(r);
                fail(e.line, 'I cannot add these two things together!');
            case '-': case '*': case '/': case '%': case '**': {
                if (op === '*' && typeof l === 'string' && typeof r === 'number') return l.repeat(Math.max(0, Math.min(1000, Math.floor(r))));
                if (typeof l !== 'number' || typeof r !== 'number') fail(e.line, 'The ' + op + ' sign needs two numbers!');
                if (op === '-') return l - r;
                if (op === '*') return l * r;
                if (op === '/') { if (r === 0) fail(e.line, 'You cannot divide by zero!'); return l / r; }
                if (op === '%') { if (r === 0) fail(e.line, 'You cannot divide by zero!'); return ((l % r) + r) % r; }
                return Math.pow(l, r);
            }
            case '==': return same(l, r);
            case '!=': return !same(l, r);
            case '<': return cmpv(l, r, e) < 0;
            case '>': return cmpv(l, r, e) > 0;
            case '<=': return cmpv(l, r, e) <= 0;
            case '>=': return cmpv(l, r, e) >= 0;
            case 'in':
                if (Array.isArray(r)) return r.some(function (x) { return same(x, l); });
                if (typeof r === 'string') return r.indexOf(String(l)) !== -1;
                if (r && typeof r === 'object') return Object.prototype.hasOwnProperty.call(r, l);
                fail(e.line, 'You can only use in with lists, text and maps!');
        }
    };
    function show0(v) { return typeof v === 'string' ? v : show(v); }
    function same(a, b) { if (a instanceof BitVec && b instanceof BitVec) return same(a.a, b.a); if (a instanceof BitMat && b instanceof BitMat) return same(a.r, b.r); if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every(function (x, i) { return same(x, b[i]); }); return a === b; }
    function cmpv(a, b, e) {
        if ((typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string')) return a < b ? -1 : a > b ? 1 : 0;
        fail(e.line, 'I can only compare two numbers or two pieces of text!');
    }
    Runtime.prototype.callE = function (e, scope) {
        if (e.f.k === 'name' && e.f.name === 'remvar' && e.args.length === 1 && e.args[0].e.k === 'name' && !this.fns.remvar) {
            // remvar(x): x is the variable's NAME (not its value), and it has to be a "var temp"
            const nm = e.args[0].e.name, sc = scope.find(nm);
            if (!sc) fail(e.line, 'remvar: I do not know a "' + nm + '"!');
            if (!sc.temps || !sc.temps[nm]) fail(e.line, 'remvar only removes "var temp" variables (and "' + nm + '" is not one)!');
            delete sc.vars[nm]; delete sc.temps[nm];
            return null;
        }
        if (e.f.k === 'name' && e.f.name === 'lam' && e.args.length === 1 && e.args[0].e.k === 'lit' && this.lams[e.args[0].e.v]) {
            // lam(...): a function made of the statements inside (called later, like a button's function)
            return new BitFn({ name: 'lam', params: [], body: this.lams[e.args[0].e.v], line: e.line }, scope);
        }
        const f = this.evalE(e.f, scope);
        const args = [], kw = {};
        this.depth = (this.depth || 0) + 1; // (a call inside another call's arguments is "nested")
        try { e.args.forEach(function (a) { const v = this.evalE(a.e, scope); if (a.name) kw[a.name] = v; else args.push(v); }, this); } finally { this.depth--; }
        if (e.f.k === 'name' && (e.f.name === 'textbox' || e.f.name === 'counter')) {
            // variable=score binds the box to a variable: it needs the variable itself (not its value)
            // the short form works too: textbox("Text here", sentence) and counter(score)
            if (!e.args.some(function (x) { return x.name === 'variable'; })) {
                const posIdx = e.f.name === 'textbox' ? 1 : 0;
                const posEx = e.args.filter(function (x) { return !x.name; })[posIdx];
                if (posEx && posEx.e.k === 'name' && scope.find(posEx.e.name) && !(scope.find(posEx.e.name).vars[posEx.e.name] instanceof BitFn) && typeof scope.find(posEx.e.name).vars[posEx.e.name] !== 'function') {
                    args.splice(posIdx, 1);
                    kw.variable = { bindName: posEx.e.name, bindScope: scope.find(posEx.e.name) };
                }
            }
            const ve = e.args.find(function (x) { return x.name === 'variable'; });
            if (ve) {
                const nm = ve.e.k === 'name' ? ve.e.name : (typeof kw.variable === 'string' ? kw.variable : null);
                const sc = nm ? scope.find(nm) : null;
                if (!sc) fail(e.line, e.f.name + ': the variable "' + (nm === null ? '?' : nm) + '" does not exist yet (create it with var first)!');
                kw.variable = { bindName: nm, bindScope: sc };
            }
        }
        return this.callFn(f, args, kw, e.line, e.f.name);
    };
    Runtime.prototype.callFn = function (f, args, kw, line, label) {
        if (typeof f === 'function') {
            try { return f.call(this, args, kw, line); } catch (err) { if (err instanceof BitError) throw err; throw new BitError(String(err && err.message || err), line); }
        }
        if (f instanceof BitFn) {
            const sc = new Scope(f.closure);
            const defs = f.def.params;
            defs.forEach(function (pr, i) {
                if (i < args.length) sc.vars[pr.name] = args[i];
                else if (pr.name in kw) sc.vars[pr.name] = kw[pr.name];
                else if (pr.def) sc.vars[pr.name] = this.evalE(pr.def, f.closure);
                else fail(line, (label || f.def.name) + ' needs a value for "' + pr.name + '"!');
            }, this);
            if (args.length > defs.length) fail(line, (label || f.def.name) + ' only takes ' + defs.length + ' value' + (defs.length === 1 ? '' : 's') + '!');
            const keepDepth = this.depth;
            this.depth = 0; // (inside a function body, renderRT shows things again)
            try { this.execBlock(f.def.body, sc); } catch (s) { if (s instanceof Signal && s.kind === 'return') return s.v; throw s; } finally { this.depth = keepDepth; }
            return null;
        }
        fail(line, 'That is not something you can call!');
    };
    Runtime.prototype.execBlock = function (body, scope) { for (let i = 0; i < body.length; i++) this.exec(body[i], scope); };
    Runtime.prototype.exec = function (s, scope) {
        this.tick(s.line);
        switch (s.k) {
            case 'var': {
                if (s.temp || !(s.name in this.persist)) scope.vars[s.name] = this.evalE(s.e, scope);
                else scope.vars[s.name] = revive(this.persist[s.name]);
                if (!s.temp && scope === this.globals) this.savedNames[s.name] = true;
                if (s.temp) { const hs = scope; (hs.temps = hs.temps || {})[s.name] = true; }
                return;
            }
            case 'matcher': scope.vars[s.name] = new BitMatcher(s.name, s.pairs, scope); return;
            case 'matc': {
                const sc = scope.find(s.name);
                const m = sc ? sc.vars[s.name] : null;
                if (!(m instanceof BitMatcher)) fail(s.line, '"' + s.name + '" is not a matcher (make one with: mat ' + s.name + ': ( "find" ~> "becomes" ))!');
                const oldK = this.evalE(s.from.k, scope), oldV = this.evalE(s.from.v, scope);
                const i = m.pairs.findIndex(function (pr) { return same(this.evalE(pr.k, m.scope), oldK) && same(this.evalE(pr.v, m.scope), oldV); }, this);
                if (i < 0) fail(s.line, s.name + ' has no pair ' + show(oldK) + ' ~> ' + show(oldV) + ' to change!');
                // the new pair is worked out now, so it keeps the values it has at this moment
                m.pairs[i] = { k: { k: 'lit', v: this.evalE(s.to.k, scope), line: s.line }, v: { k: 'lit', v: this.evalE(s.to.v, scope), line: s.line } };
                return;
            }
            case 'use': return; // (the libraries are loaded before the program starts)
            case 'fn': scope.vars[s.name] = new BitFn(s, scope); this.fns[s.name] = scope.vars[s.name]; return;
            case 'assign': return this.assign(s, scope);
            case 'expr': {
                const v = this.evalE(s.e, scope);
                // a quick command (annotate_bubble(...), beepbox(...), btn(...)) on its own line shows itself right away!
                if (typeof v === 'string' && this.host.renderRT && ((s.e.k === 'call' && v.indexOf('\u2063') !== -1) || (s.e.k === 'bin' && s.e.op === '&'))) this.host.renderRT(v, null, this, s.line);
                return;
            }
            case 'if': {
                for (let i = 0; i < s.arms.length; i++) if (truthy(this.evalE(s.arms[i].c, scope))) { this.execBlock(s.arms[i].body, scope); return; }
                if (s.els) this.execBlock(s.els, scope);
                return;
            }
            case 'while': {
                while (truthy(this.evalE(s.c, scope))) {
                    try { this.execBlock(s.body, scope); } catch (g) { if (g instanceof Signal && g.kind === 'break') break; if (g instanceof Signal && g.kind === 'continue') continue; throw g; }
                }
                return;
            }
            case 'for': {
                const it = this.evalE(s.it, scope);
                const list = it instanceof BitVec ? it.a.slice() : it instanceof BitMat ? it.r.map(function (r) { return new BitVec(r.slice()); }) : Array.isArray(it) ? it.slice() : typeof it === 'string' ? it.split('') : it && typeof it === 'object' ? Object.keys(it) : null;
                if (!list) fail(s.line, 'You can only loop over a list, text or a map!');
                for (let i = 0; i < list.length; i++) {
                    scope.vars[s.name] = list[i];
                    try { this.execBlock(s.body, scope); } catch (g) { if (g instanceof Signal && g.kind === 'break') break; if (g instanceof Signal && g.kind === 'continue') continue; throw g; }
                }
                return;
            }
            case 'return': throw new Signal('return', s.e ? this.evalE(s.e, scope) : null);
            case 'break': throw new Signal('break');
            case 'continue': throw new Signal('continue');
            case 'pass': return;
        }
        fail(s.line, 'Unknown statement!');
    };
    Runtime.prototype.assign = function (s, scope) {
        const t = s.target;
        let v = this.evalE(s.e, scope);
        const combine = (function (cur) {
            if (s.op === '=') return v;
            const fake = { k: 'bin', op: s.op[0], l: { k: 'lit', v: cur, line: s.line }, r: { k: 'lit', v: v, line: s.line }, line: s.line };
            return this.binary(fake, scope);
        }).bind(this);
        if (t.k === 'name') {
            const sc = scope.find(t.name);
            if (!sc) fail(s.line, 'Create "' + t.name + '" with var before changing it!');
            sc.vars[t.name] = combine(sc.vars[t.name]);
            return;
        }
        const o = this.evalE(t.k === 'index' ? t.e : t.e, scope);
        const key = t.k === 'index' ? this.evalE(t.i, scope) : t.name;
        if (o instanceof BitVec) {
            if (typeof key !== 'number') fail(s.line, 'A vector position must be a number!');
            const k = key < 0 ? o.a.length + key : key;
            if (k < 0 || k >= o.a.length) fail(s.line, 'That vector position does not exist!');
            const nv = combine(o.a[k]);
            if (nv instanceof BitFn || typeof nv === 'function') fail(s.line, 'A vector cannot hold a function!');
            o.a[k] = nv;
            return;
        }
        if (o instanceof BitMat) {
            if (typeof key !== 'number') fail(s.line, 'A matrix row must be a number!');
            const k = key < 0 ? o.r.length + key : key;
            if (k < 0 || k >= o.r.length) fail(s.line, 'That matrix row does not exist!');
            const nv = combine(new BitVec(o.r[k]));
            const row = nv instanceof BitVec ? nv.a : Array.isArray(nv) ? nv : null;
            if (!row || row.length !== o.r[0].length) fail(s.line, 'A row needs ' + o.r[0].length + ' numbers!');
            o.r[k] = numOnly(row.slice(), s.line, 'A matrix');
            return;
        }
        if (Array.isArray(o)) {
            if (typeof key !== 'number') fail(s.line, 'A list position must be a number!');
            const k = key < 0 ? o.length + key : key;
            if (k < 0 || k > o.length) fail(s.line, 'That list position does not exist!');
            o[k] = combine(o[k] === undefined ? null : o[k]);
        } else if (o && typeof o === 'object') o[key] = combine(Object.prototype.hasOwnProperty.call(o, key) ? o[key] : null);
        else fail(s.line, 'You can only set slots in lists and maps!');
    };
    // Runs the program's top level (defining functions + vars); returns the event functions!
    Runtime.prototype.start = function () {
        this.savedNames = {};
        this.execBlock(this.ast, this.globals);
    };
    Runtime.prototype.has = function (name) { return this.fns[name] instanceof BitFn; };
    Runtime.prototype.call = function (name, args) {
        if (!this.has(name)) return null;
        this.steps = 0;
        return this.callFn(this.fns[name], args || [], {}, 0, name);
    };
    Runtime.prototype.saveVars = function () {
        const out = {};
        Object.keys(this.savedNames || {}).forEach(function (n) { const v = this.globals.vars[n]; if (v instanceof BitVec) { out[n] = { $vec: v.a }; return; } if (v instanceof BitMat) { out[n] = { $mat: v.r }; return; } if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || Array.isArray(v) || (v && typeof v === 'object' && !(v instanceof BitFn))) out[n] = v; }, this);
        return out;
    };

    /* ================= Built-ins ================= */
    function installBuiltins(rt) {
        const g = rt.globals.vars;
        const host = rt.host;
        const num = function (v, line, what) { if (typeof v !== 'number') fail(line, what + ' needs a number!'); return v; };
        const def = function (name, fn) { g[name] = fn; };
        g.PI = Math.PI;
        g.inherit = INHERIT;
        // ---- math ----
        ['floor', 'ceil', 'round', 'abs', 'sqrt', 'sin', 'cos', 'tan'].forEach(function (n) { def(n, function (a, k, line) { return Math[n](num(a[0], line, n)); }); });
        def('atan2', function (a, k, line) { return Math.atan2(num(a[0], line, 'atan2'), num(a[1], line, 'atan2')); });
        def('pow', function (a, k, line) { return Math.pow(num(a[0], line, 'pow'), num(a[1], line, 'pow')); });
        def('min', function (a) { const l = a.length === 1 && Array.isArray(a[0]) ? a[0] : a; return Math.min.apply(null, l); });
        def('max', function (a) { const l = a.length === 1 && Array.isArray(a[0]) ? a[0] : a; return Math.max.apply(null, l); });
        def('random', function (a) { return a.length >= 2 ? a[0] + Math.random() * (a[1] - a[0]) : Math.random(); });
        def('randint', function (a, k, line) { const lo = Math.ceil(num(a[0], line, 'randint')), hi = Math.floor(num(a[1], line, 'randint')); return lo + Math.floor(Math.random() * (hi - lo + 1)); });
        def('clamp', function (a) { return Math.max(a[1], Math.min(a[2], a[0])); });
        // ---- text + lists ----
        def('str', function (a) { return show0(a[0]); });
        def('num', function (a) { const n = Number(a[0]); return isFinite(n) ? n : null; });
        def('len', function (a, k, line) { const v = a[0]; if (v instanceof BitVec) return v.a.length; if (v instanceof BitMat) return v.r.length; if (Array.isArray(v) || typeof v === 'string') return v.length; if (v && typeof v === 'object') return Object.keys(v).length; fail(line, 'len needs a list, text or map!'); });
        def('range', function (a, k, line) { let lo = 0, hi, st = 1; if (a.length === 1) hi = a[0]; else { lo = a[0]; hi = a[1]; if (a.length > 2) st = a[2]; } num(lo, line, 'range'); num(hi, line, 'range'); if (!st) fail(line, 'range cannot step by zero!'); const out = []; for (let x = lo; st > 0 ? x < hi : x > hi; x += st) { out.push(x); if (out.length > 100000) fail(line, 'That range is too big!'); } return out; });
        def('push', function (a, k, line) { if (!Array.isArray(a[0])) fail(line, 'push needs a list first!'); a[0].push(a[1]); return a[0]; });
        def('pop', function (a, k, line) { if (!Array.isArray(a[0])) fail(line, 'pop needs a list!'); const v = a[0].pop(); return v === undefined ? null : v; });
        def('remove', function (a, k, line) { if (!Array.isArray(a[0])) fail(line, 'remove needs a list first!'); const i = a[0].findIndex(function (x) { return same(x, a[1]); }); if (i !== -1) a[0].splice(i, 1); return a[0]; });
        def('join', function (a) { return (a[0] || []).map(show0).join(a.length > 1 ? String(a[1]) : ''); });
        def('split', function (a) { return String(a[0]).split(a.length > 1 ? String(a[1]) : ''); });
        def('upper', function (a) { return String(a[0]).toUpperCase(); });
        def('lower', function (a) { return String(a[0]).toLowerCase(); });
        def('contains', function (a) { return Array.isArray(a[0]) ? a[0].some(function (x) { return same(x, a[1]); }) : String(a[0]).indexOf(String(a[1])) !== -1; });
        def('keys', function (a) { return a[0] && typeof a[0] === 'object' ? Object.keys(a[0]) : []; });
        def('time', function () { return (performance.now() - (host.t0 || 0)) / 1000; });
        // ---- output ----
        def('print', function (a) { if (host.print) host.print(a.map(show0).join(' ')); return null; });
        def('renderRT', function (a, k, line) {
            const html = show0(a.length ? a[0] : k.html);
            const explicit = k.line !== undefined || a[1] !== undefined;
            // renderRT inside another call (like skill(content=renderRT("..."))) just hands back its rich text; on its own it shows it!
            if (rt.depth > 0 && !explicit) return html;
            // line="N" always takes over line N (whatever was written there before); with no line it adds the next free line
            if (host.renderRT) host.renderRT(html, explicit ? String(k.line !== undefined ? k.line : a[1]) : null, rt, line);
            return null;
        });
        // renderPT: plain text (no Keydown, no HTML), on a line the same way renderRT picks lines
        def('renderPT', function (a, k, line) {
            const txt = show0(a.length ? a[0] : k.text);
            const html = '<span class="bl-pt">' + esc(txt) + '</span>';
            const explicit = k.line !== undefined || a[1] !== undefined;
            if (rt.depth > 0 && !explicit) return html;
            if (host.renderRT) host.renderRT(html, explicit ? String(k.line !== undefined ? k.line : a[1]) : null, rt, line);
            return null;
        });
        // ---- skills: skill(skill="beepbox", get=link, content=inherit) -> text you can show with renderRT ----
        const AN_TYPES = { highlight: 'hl', hl: 'hl', underline: 'ul', ul: 'ul', strikethrough: 'st', strike: 'st', st: 'st', box: 'bx', bx: 'bx', halo: 'ha', ha: 'ha', brackets: 'cb', corners: 'cb', cb: 'cb', spotlight: 'gf', gf: 'gf', accent: 'ga', ga: 'ga', bubble: 'gb', gb: 'gb', dusk: 'dk', dk: 'dk', prism: 'pr', pr: 'pr', complement: 'cm', cm: 'cm', ticket: 'tk', tk: 'tk', neon: 'nn', nn: 'nn', stamp: 'sm', sm: 'sm', tape: 'tp', tp: 'tp', checker: 'ck', ck: 'ck', halftone: 'ht', ht: 'ht', aurora: 'au', au: 'au', mild: 'ml', ml: 'ml', wrap: 'gw', gelwrap: 'gw', gw: 'gw', belt: 'bt', bt: 'bt', bucket: 'bk', bk: 'bk', torpedo: 'tr', tr: 'tr', bottle: 'bo', bo: 'bo', packet: 'pk', pk: 'pk', select: 'sl', sl: 'sl', capsule: 'cs', cs: 'cs', frost: 'fr', fr: 'fr', pixel: 'px', px: 'px', flag: 'fl', fl: 'fl', gem: 'gm', gm: 'gm' };
        const AN_COLORS = ['red', 'orange', 'gold', 'yellow', 'lime', 'green', 'turquoise', 'teal', 'cyan', 'blue', 'purple', 'pink', 'slate'];
        // color can be a name ("pink") or a number (1 = red ... 13 = slate)
        const annotateToken = function (line, type, color, content) {
            const ty = String(type).toLowerCase();
            if (!AN_TYPES[ty]) fail(line, 'The annotate type "' + ty + '" is not known! Try highlight, underline, strikethrough, box, halo, brackets, spotlight, accent, bubble, dusk, prism, complement, ticket, neon, stamp, tape, checker, halftone, aurora, mild, wrap, belt, bucket, torpedo, bottle, packet, select, capsule, frost, pixel, flag or gem.');
            let col = color === undefined || color === null ? 'yellow' : (typeof color === 'number' ? AN_COLORS[Math.round(color) - 1] : String(color).toLowerCase());
            if (AN_COLORS.indexOf(col) < 0) fail(line, 'The annotate color "' + color + '" is not known! Use 1 to 13 or one of: ' + AN_COLORS.join(', ') + '.');
            rt.skills.push({ skill: 'annotate', style: AN_TYPES[ty], color: col, content: show0(content) });
            return '⁣skill:' + (rt.skills.length - 1) + '⁣';
        };
        // quick commands: annotate_bubble("text", color=1), annotate_box("text", "blue")...
        ['highlight', 'underline', 'strikethrough', 'box', 'halo', 'brackets', 'spotlight', 'accent', 'bubble', 'dusk', 'prism', 'complement', 'ticket', 'neon', 'stamp', 'tape', 'checker', 'halftone', 'aurora', 'mild', 'wrap', 'belt', 'bucket', 'torpedo', 'bottle', 'packet', 'select', 'capsule', 'frost', 'pixel', 'flag', 'gem'].forEach(function (t) {
            def('annotate_' + t, function (a, k, line) {
                if (!a.length && k.content === undefined && k.text === undefined) fail(line, 'annotate_' + t + ' needs the text to mark, like annotate_' + t + '("Some **text**")!');
                return annotateToken(line, t, k.color !== undefined ? k.color : a[1], a.length ? a[0] : (k.content !== undefined ? k.content : k.text));
            });
        });
        def('beepbox', function (a, k, line) {
            const link = k.get !== undefined ? k.get : (a.length ? a[0] : undefined);
            if (link === undefined) fail(line, 'beepbox needs the song link, like beepbox(link)!');
            const label = k.label !== undefined ? String(k.label) : (a[1] !== undefined ? String(a[1]) : '');
            const lk = String(link);
            let si = rt.skills.findIndex(function (x) { return x.skill === 'beepbox' && x.get === lk && x.label === label; });
            if (si < 0) { rt.skills.push({ skill: 'beepbox', get: lk, label: label }); si = rt.skills.length - 1; }
            return '⁣skill:' + si + '⁣';
        });
        def('skill', function (a, k, line) {
            const name = String(k.skill !== undefined ? k.skill : a[0] || '').toLowerCase();
            if (name === 'annotate') {
                if (k.content === undefined && a[1] === undefined) fail(line, 'The annotate skill needs content=the text to mark, like content=renderRT("Some **text**")!');
                return annotateToken(line, k.type !== undefined ? k.type : 'highlight', k.color, k.content !== undefined ? k.content : a[1]);
            }
            if (name !== 'beepbox') fail(line, 'The "' + name + '" skill is not available in BitLang (only "beepbox" and "annotate")!');
            if (k.get === undefined && a[1] === undefined) fail(line, 'The beepbox skill needs get=the song link!');
            const link = String(k.get !== undefined ? k.get : a[1]);
            if (k.content !== undefined && k.content !== INHERIT) fail(line, 'content can only be inherit (the beepbox song is taken from the link)!');
            const label = k.label !== undefined ? String(k.label) : '';
            let si = rt.skills.findIndex(function (x) { return x.skill === 'beepbox' && x.get === link && x.label === label; });
            if (si < 0) { rt.skills.push({ skill: name, get: link, label: label }); si = rt.skills.length - 1; }
            return '⁣skill:' + si + '⁣';
        });
        // ---- textbox / counter: things the person playing can type into ----
        const inputToken = function (kind, a2, k2, line) {
            const bind = k2.variable && typeof k2.variable === 'object' && k2.variable.bindName ? k2.variable : null;
            const ph = k2.placeholder !== undefined ? show0(k2.placeholder) : (a2.length ? show0(a2[0]) : '');
            const ent = {
                kind: kind, placeholder: ph, name: bind ? bind.bindName : '', sc: bind ? bind.bindScope : null,
                value: k2.value !== undefined ? show0(k2.value) : '',
                min: k2.min !== undefined ? num(k2.min, line, kind) : null, max: k2.max !== undefined ? num(k2.max, line, kind) : null
            };
            const key = JSON.stringify([ent.kind, ent.placeholder, ent.name, ent.value, ent.min, ent.max, ent.sc ? 1 : 0]);
            let i = rt.inputs.findIndex(function (x) { return x.key === key && x.sc === ent.sc; });
            if (i < 0) { ent.key = key; ent.last = ent.sc ? ent.sc.vars[ent.name] : undefined; rt.inputs.push(ent); i = rt.inputs.length - 1; }
            return '⁣input:' + i + '⁣';
        };
        def('textbox', function (a2, k2, line) { return inputToken('text', a2, k2, line); });
        def('counter', function (a2, k2, line) { return inputToken('number', a2, k2, line); });
        // ---- btn(function, contents): a clickable button for renderRT ----
        def('btn', function (a, k, line) {
            const f = a.length ? a[0] : k.fn;
            if (!(typeof f === 'function' || f instanceof BitFn)) fail(line, 'btn needs a function first (what happens on click), then the contents!');
            const c = show0(a.length > 1 ? a[1] : (k.content !== undefined ? k.content : 'Button'));
            let i = rt.btns.findIndex(function (b) { return b.fn === f && b.content === c; });
            if (i < 0) { rt.btns.push({ fn: f, content: c }); i = rt.btns.length - 1; }
            return '\u2063btn:' + i + '\u2063';
        });
        // ---- input ----
        // the old screen (canvas) is gone: programs only change the document
        ['size', 'width', 'height', 'clear', 'rect', 'circle', 'line', 'text', 'mouse_x', 'mouse_y', 'mouse_down'].forEach(function (n) {
            def(n, function (a2, k2, line) { fail(line, n + '() is gone: programs only change the document now. Use renderRT, btn and print instead!'); });
        });
        def('key', function (a) { return !!(host.keys && host.keys[String(a[0]).toLowerCase()]); });
        def('mouse_x', function () { return host.mouse ? host.mouse.x : 0; });
        def('mouse_y', function () { return host.mouse ? host.mouse.y : 0; });
        def('mouse_down', function () { return !!(host.mouse && host.mouse.down); });
        def('beep', function (a, k) { if (host.beep) host.beep(a.length ? a[0] : (k.freq || 440), a.length > 1 ? a[1] : (k.ms || 100)); return null; });
        def('remvar', function (a, k, line) { fail(line, 'remvar needs the name of a var temp variable, like remvar(score)!'); });
        def('lam', function (a, k, line) { fail(line, 'lam needs statements inside, separated by ";", like lam(renderRT("hi"); btn(stop, "Exit"))!'); });
        // ---- saved data (the browser's localStorage, one private shelf per program; shared=true uses a shelf all programs share) ----
        const plain = function (v, line, d) {
            if (d > 8) fail(line, 'That is nested too deeply to save!');
            if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
            if (v instanceof BitVec) return { $vec: v.a.slice() };
            if (v instanceof BitMat) return { $mat: v.r.map(function (r) { return r.slice(); }) };
            if (Array.isArray(v)) return v.map(function (x) { return plain(x, line, (d || 0) + 1); });
            if (v && typeof v === 'object' && !(v instanceof BitFn)) { const o = {}; Object.keys(v).forEach(function (kk) { o[kk] = plain(v[kk], line, (d || 0) + 1); }); return o; }
            fail(line, 'Functions cannot be saved, only numbers, text, true/false, lists and maps!');
        };
        const lsKey = function (key, k, line) {
            const kk = String(key === undefined ? '' : key);
            if (!kk || kk.length > 100) fail(line, 'A storage key needs 1 to 100 characters!');
            return (k.shared ? 'bitlang_ls:shared:' : (host.lsPrefix || 'bitlang_ls:x:')) + kk;
        };
        def('ls_set', function (a, k, line) {
            const json = JSON.stringify(plain(a.length > 1 ? a[1] : k.value, line, 0));
            if (json === undefined || json.length > 200000) fail(line, 'That is too big to save!');
            try { localStorage.setItem(lsKey(a[0], k, line), json); } catch (e) { if (e instanceof BitError) throw e; fail(line, 'Could not save (the browser storage is full or blocked)!'); }
            return a.length > 1 ? a[1] : null;
        });
        def('ls_get', function (a, k, line) {
            const dflt = a.length > 1 ? a[1] : (k.default !== undefined ? k.default : null);
            try { const t = localStorage.getItem(lsKey(a[0], k, line)); return t === null ? dflt : revive(JSON.parse(t)); } catch (e) { if (e instanceof BitError) throw e; return dflt; }
        });
        def('ls_remove', function (a, k, line) { try { localStorage.removeItem(lsKey(a[0], k, line)); } catch (e) { if (e instanceof BitError) throw e; } return null; });
        def('ls_keys', function (a, k) {
            const pre = k.shared ? 'bitlang_ls:shared:' : (host.lsPrefix || 'bitlang_ls:x:');
            const out = [];
            try { for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (n.indexOf(pre) === 0) out.push(n.slice(pre.length)); } } catch (e) {}
            return out.sort();
        });
        def('ls_clear', function (a, k) {
            const pre = k.shared ? 'bitlang_ls:shared:' : (host.lsPrefix || 'bitlang_ls:x:');
            try { const del = []; for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (n.indexOf(pre) === 0) del.push(n); } del.forEach(function (n) { localStorage.removeItem(n); }); } catch (e) {}
            return null;
        });
        def('to_json', function (a, k, line) { return JSON.stringify(plain(a[0], line, 0), null, k.pretty ? 2 : 0); });
        def('from_json', function (a, k, line) { try { return JSON.parse(String(a[0])); } catch (e) { return a.length > 1 ? a[1] : (k.default !== undefined ? k.default : null); } });
        // ---- files: export_file(name, text) saves a file; import_file(fn) lets the person pick one and calls fn(name, text) ----
        def('export_file', function (a, k, line) {
            const name = String(a.length ? a[0] : (k.name || 'file.txt')).replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 100) || 'file.txt';
            const text = show0(a.length > 1 ? a[1] : (k.content !== undefined ? k.content : ''));
            if (text.length > 5000000) fail(line, 'That file is too big to export!');
            if (host.exportFile) host.exportFile(name, text);
            return null;
        });
        def('import_file', function (a, k, line) {
            const cb = a.length ? a[0] : k.fn;
            if (!(typeof cb === 'function' || cb instanceof BitFn)) fail(line, 'import_file needs a function first: it receives the file name and its text, like fn got(name, text)!');
            if (host.importFile) host.importFile(cb, String(k.accept !== undefined ? k.accept : (a[1] !== undefined ? a[1] : '.txt,.csv,.json,.md,.log,text/*')));
            return null;
        });
        // ---- regex: patterns work like JavaScript's (flags: i = ignore case, m, s, g in regex_all/replace is automatic) ----
        const rx = function (pat, flags, line, extra) {
            const ps = String(pat);
            if (ps.length > 500) fail(line, 'That pattern is too long (500 characters at most)!');
            let fl = String(flags === undefined || flags === null ? '' : flags).replace(/[^imsu]/g, '');
            fl = fl.replace(/(.)(?=.*\1)/g, '');
            if (extra && fl.indexOf(extra) === -1) fl += extra;
            try { return new RegExp(ps, fl); } catch (e) { fail(line, 'That pattern is not valid: ' + String(e.message || e).replace(/^Invalid regular expression: /, '') + '!'); }
        };
        const rtext = function (t, line) { const x = show0(t); if (x.length > 200000) fail(line, 'That text is too long for a regex (200000 characters at most)!'); return x; };
        const mapOf = function (m) {
            const o = { text: m[0], index: m.index, groups: m.slice(1).map(function (g) { return g === undefined ? null : g; }) };
            if (m.groups) { o.named = {}; Object.keys(m.groups).forEach(function (n) { o.named[n] = m.groups[n] === undefined ? null : m.groups[n]; }); }
            return o;
        };
        def('regex_test', function (a, k, line) { return rx(a[0], k.flags !== undefined ? k.flags : a[2], line).test(rtext(a[1], line)); });
        def('regex_match', function (a, k, line) { const m = rx(a[0], k.flags !== undefined ? k.flags : a[2], line).exec(rtext(a[1], line)); return m ? mapOf(m) : null; });
        def('regex_all', function (a, k, line) {
            const r = rx(a[0], k.flags !== undefined ? k.flags : a[2], line, 'g'), t = rtext(a[1], line), out = [];
            let m, guard = 0;
            while ((m = r.exec(t)) && guard++ < 20000) { out.push(k.full ? mapOf(m) : m[0]); if (m[0] === '') r.lastIndex++; }
            return out;
        });
        def('regex_replace', function (a, k, line) { return rtext(a[1], line).replace(rx(a[0], k.flags !== undefined ? k.flags : a[3], line, 'g'), show0(a[2])); });
        def('regex_split', function (a, k, line) { return rtext(a[1], line).split(rx(a[0], k.flags !== undefined ? k.flags : a[2], line)); });
        // ---- vectors and matrices:  <| 1, 2, 3 |>   and   [1 2; 3 4]  ----
        const asVec = function (v, line, who) { if (v instanceof BitVec) return numVec(v, line, who); if (Array.isArray(v)) return numVec(new BitVec(v.slice()), line, who); fail(line, who + ' needs a vector (like <| 1, 2 |>)!'); };
        const asMat = function (v, line, who) { if (v instanceof BitMat) return v; fail(line, who + ' needs a matrix (like [1 2; 3 4])!'); };
        def('vec', function (a, k, line) { return new BitVec(anyValues(a.length === 1 && Array.isArray(a[0]) ? a[0].slice() : a.slice(), line, 'A vector')); });
        def('mat', function (a, k, line) {
            const rows = a.length === 1 && Array.isArray(a[0]) ? a[0] : a;
            const out = rows.map(function (r) { return numOnly((r instanceof BitVec ? r.a : Array.isArray(r) ? r : [r]).slice(), line, 'A matrix'); });
            if (!out.length || !out[0].length) fail(line, 'A matrix needs at least one number!');
            out.forEach(function (r) { if (r.length !== out[0].length) fail(line, 'Every row of a matrix needs the same number of values!'); });
            return new BitMat(out);
        });
        def('dot', function (a, k, line) { const x = asVec(a[0], line, 'dot'), y = asVec(a[1], line, 'dot'); if (x.a.length !== y.a.length) fail(line, 'dot needs two vectors of the same length!'); return x.a.reduce(function (t, v, i) { return t + v * y.a[i]; }, 0); });
        def('cross', function (a, k, line) { const x = asVec(a[0], line, 'cross'), y = asVec(a[1], line, 'cross'); if (x.a.length !== 3 || y.a.length !== 3) fail(line, 'cross needs two vectors with 3 numbers each!'); return new BitVec([x.a[1] * y.a[2] - x.a[2] * y.a[1], x.a[2] * y.a[0] - x.a[0] * y.a[2], x.a[0] * y.a[1] - x.a[1] * y.a[0]]); });
        def('norm', function (a, k, line) { const x = asVec(a[0], line, 'norm'); return Math.sqrt(x.a.reduce(function (t, v) { return t + v * v; }, 0)); });
        def('normalize', function (a, k, line) { const x = asVec(a[0], line, 'normalize'); const n = Math.sqrt(x.a.reduce(function (t, v) { return t + v * v; }, 0)); if (!n) fail(line, 'A vector of zeros cannot be normalized!'); return new BitVec(x.a.map(function (v) { return v / n; })); });
        def('det', function (a, k, line) { return det(asMat(a[0], line, 'det'), line); });
        def('transpose', function (a, k, line) { const m = a[0]; if (m instanceof BitVec) return new BitMat(numVec(m, line, 'transpose').a.map(function (x) { return [x]; })); return transpose(asMat(m, line, 'transpose')); });
        def('inverse', function (a, k, line) { return inverse(asMat(a[0], line, 'inverse'), line); });
        def('identity', function (a, k, line) { const n = num(a[0], line, 'identity'); if (n < 1 || n > 64 || n !== Math.floor(n)) fail(line, 'identity needs a whole number from 1 to 64!'); return identity(n); });
        def('zeros', function (a, k, line) {
            const r = num(a[0], line, 'zeros'), c = a.length > 1 ? num(a[1], line, 'zeros') : null;
            if (r < 1 || r > 256 || r !== Math.floor(r) || (c !== null && (c < 1 || c > 256 || c !== Math.floor(c)))) fail(line, 'zeros needs sizes from 1 to 256!');
            if (c === null) return new BitVec(new Array(r).fill(0));
            return new BitMat(Array.from({ length: r }, function () { return new Array(c).fill(0); }));
        });
        def('trace', function (a, k, line) { const m = asMat(a[0], line, 'trace'); let t = 0; for (let i = 0; i < Math.min(m.r.length, m.r[0].length); i++) t += m.r[i][i]; return t; });
        def('rows', function (a, k, line) { return asMat(a[0], line, 'rows').r.length; });
        def('cols', function (a, k, line) { return asMat(a[0], line, 'cols').r[0].length; });
        def('to_list', function (a, k, line) { const v = a[0]; if (v instanceof BitVec) return v.a.slice(); if (v instanceof BitMat) return v.r.map(function (r) { return r.slice(); }); fail(line, 'to_list needs a vector or a matrix!'); });
        // ---- libraries (use python / use sqlite / use lua) ----
        const L = function (name, line) {
            const lib = host.libs && host.libs[name];
            if (!lib) fail(line, 'Add "use ' + name + '" at the top of your program before using ' + ({ python: 'python()', sqlite: 'sql()', lua: 'lua()' }[name]) + '!');
            return lib;
        };
        const fromJs = function (v) {
            if (v === undefined || v === null) return null;
            if (typeof v === 'bigint') return Number(v);
            if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
            if (v instanceof Set) return Array.from(v).map(fromJs);
            if (v instanceof Map) { const o = {}; v.forEach(function (x, kk) { o[String(kk)] = fromJs(x); }); return o; }
            if (Array.isArray(v) || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(v))) return Array.from(v).map(fromJs);
            if (typeof v === 'object') { const o = {}; Object.keys(v).forEach(function (kk) { o[kk] = fromJs(v[kk]); }); return o; }
            return String(v);
        };
        const toJs = function (v) {
            if (v instanceof BitVec) return v.a.slice();
            if (v instanceof BitMat) return v.r.map(function (r) { return r.slice(); });
            if (Array.isArray(v)) return v.map(toJs);
            if (v instanceof BitFn || typeof v === 'function') return null;
            if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(function (kk) { o[kk] = toJs(v[kk]); }); return o; }
            return v;
        };
        const kwVars = function (k, skip) { const o = {}; Object.keys(k).forEach(function (n) { if (skip.indexOf(n) < 0 && /^[A-Za-z_]\w*$/.test(n)) o[n] = toJs(k[n]); }); return o; };
        // python(code, name=value, ...): runs Python (Pyodide) and gives back the last expression's value
        def('python', function (a, k, line) {
            const lib = L('python', line), py = lib.py;
            const raw = a.length ? a[0] : k.code;
            // python(print("hi")) runs BitLang's print first and hands Python its result (null): the code has to be text in quotes
            if (typeof raw !== 'string') fail(line, 'python() needs Python code as text in quotes, like python("print(\'Hello!\')"); it got ' + show(raw) + ' instead!');
            const code = raw;
            if (code.length > 100000) fail(line, 'That Python code is too long!');
            try {
                const vars = kwVars(k, ['code']);
                Object.keys(vars).forEach(function (n) { const v = vars[n]; lib.ns.set(n, v !== null && typeof v === 'object' ? py.toPy(v) : v); });
                py.setStdout({ batched: function (t) { if (host.print) host.print(t); } });
                py.setStderr({ batched: function (t) { if (host.print) host.print(t); } });
                const r = py.runPython(code, { globals: lib.ns });
                py.runPython('import sys\nsys.stdout.flush()\nsys.stderr.flush()');
                if (r && typeof r === 'object' && typeof r.toJs === 'function') { const js = r.toJs({ dict_converter: Object.fromEntries, create_pyproxies: false }); if (r.destroy) r.destroy(); return fromJs(js); }
                return fromJs(r);
            } catch (e) {
                if (e instanceof BitError) throw e;
                const lines = String(e && e.message || e).trim().split('\n');
                fail(line, 'Python: ' + (lines[lines.length - 1] || 'something went wrong') + '!');
            }
        });
        // sql(query, params): runs SQLite; SELECT gives a list of maps, anything else gives how many rows changed
        def('sql', function (a, k, line) {
            const lib = L('sqlite', line);
            const q = show0(a.length ? a[0] : k.query);
            const params = a.length > 1 ? a[1] : (k.params !== undefined ? k.params : null);
            try {
                if (params !== null && params !== undefined) {
                    const st = lib.db.prepare(q);
                    st.bind(toJs(Array.isArray(params) ? params : [params]));
                    const rows = [];
                    while (st.step()) rows.push(fromJs(st.getAsObject()));
                    st.free();
                    return rows.length || /^\s*select/i.test(q) ? rows : lib.db.getRowsModified();
                }
                const res = lib.db.exec(q);
                if (!res.length) return lib.db.getRowsModified();
                const last = res[res.length - 1];
                return last.values.map(function (vals) { const o = {}; last.columns.forEach(function (c, i) { o[c] = fromJs(vals[i]); }); return o; });
            } catch (e) { if (e instanceof BitError) throw e; fail(line, 'SQLite: ' + String(e && e.message || e).replace(/^Error: /, '') + '!'); }
        });
        const dbKey = function (k) { return 'bitlang_sqldb:' + (host.lsPrefix ? host.lsPrefix.replace(/^bitlang_ls:/, '') : 'x:') + String(k.name !== undefined ? k.name : 'main'); };
        def('sql_save', function (a, k, line) {
            const lib = L('sqlite', line);
            const bytes = lib.db.export();
            if (bytes.length > 3000000) fail(line, 'This database is too big to save in the browser (3 MB at most)!');
            let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            try { localStorage.setItem(dbKey(k), btoa(bin)); } catch (e) { fail(line, 'Could not save the database (the browser storage is full or blocked)!'); }
            return null;
        });
        def('sql_load', function (a, k, line) {
            const lib = L('sqlite', line);
            let t = null; try { t = localStorage.getItem(dbKey(k)); } catch (e) {}
            if (!t) return false;
            try { const bin = atob(t), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); lib.db.close(); lib.db = new lib.SQL.Database(bytes); return true; } catch (e) { fail(line, 'That saved database could not be opened!'); }
        });
        // lua(code, name=value, ...): runs Lua (Fengari) in its own sealed box and gives back the result
        def('lua', function (a, k, line) {
            const lib = L('lua', line), fg = lib.fg, lua = fg.lua, la = fg.lauxlib, S = fg.to_luastring, Ls = lib.L;
            const raw = a.length ? a[0] : k.code;
            if (typeof raw !== 'string') fail(line, 'lua() needs Lua code as text in quotes, like lua("print(\'Hello!\')"); it got ' + show(raw) + ' instead!');
            if (raw.length > 100000) fail(line, 'That Lua code is too long!');
            lib.out = function (t) { if (host.print) host.print(t); };
            const pushLua = function (v, d) {
                if (v === null || v === undefined || d > 20) lua.lua_pushnil(Ls);
                else if (typeof v === 'boolean') lua.lua_pushboolean(Ls, v);
                else if (typeof v === 'number') lua.lua_pushnumber(Ls, v);
                else if (typeof v === 'string') lua.lua_pushstring(Ls, S(v));
                else if (Array.isArray(v)) { lua.lua_createtable(Ls, v.length, 0); v.forEach(function (x, i) { pushLua(x, d + 1); lua.lua_rawseti(Ls, -2, i + 1); }); }
                else if (typeof v === 'object') { lua.lua_createtable(Ls, 0, 0); Object.keys(v).forEach(function (kk) { pushLua(v[kk], d + 1); lua.lua_setfield(Ls, -2, S(kk)); }); }
                else lua.lua_pushnil(Ls);
            };
            const readLua = function (idx, d) {
                const t = lua.lua_type(Ls, idx);
                if (t === lua.LUA_TNIL || t === lua.LUA_TNONE) return null;
                if (t === lua.LUA_TBOOLEAN) return lua.lua_toboolean(Ls, idx);
                if (t === lua.LUA_TNUMBER) return lua.lua_tonumber(Ls, idx);
                if (t === lua.LUA_TSTRING) return lua.lua_tojsstring(Ls, idx);
                if (t === lua.LUA_TTABLE) {
                    if (d > 20) return null;
                    const abs = lua.lua_absindex(Ls, idx), keys = [], vals = [];
                    lua.lua_pushnil(Ls);
                    while (lua.lua_next(Ls, abs) !== 0) {
                        const kt = lua.lua_type(Ls, -2);
                        keys.push(kt === lua.LUA_TNUMBER ? lua.lua_tonumber(Ls, -2) : kt === lua.LUA_TSTRING ? lua.lua_tojsstring(Ls, -2) : null);
                        vals.push(readLua(-1, d + 1));
                        lua.lua_pop(Ls, 1);
                        if (keys.length > 100000) { lua.lua_pop(Ls, 1); break; }
                    }
                    // 1, 2, 3 ... with nothing else is a list; anything else is a map
                    const isList = keys.every(function (kk) { return typeof kk === 'number' && kk >= 1 && kk === Math.floor(kk) && kk <= keys.length; });
                    if (isList) { const arr = new Array(keys.length); keys.forEach(function (kk, i) { arr[kk - 1] = vals[i]; }); return arr; }
                    const o = {}; keys.forEach(function (kk, i) { if (kk !== null) o[String(kk)] = vals[i]; }); return o;
                }
                return '<lua value>'; // (functions and other Lua-only things)
            };
            const clean = function (m) { return String(m || 'something went wrong').replace(/^lua:(\d+):\s*/, 'line $1: '); };
            const top = lua.lua_gettop(Ls);
            try {
                const vars = kwVars(k, ['code']);
                Object.keys(vars).forEach(function (n) { pushLua(vars[n], 0); lua.lua_setglobal(Ls, S(n)); });
                // like python(), a lone expression gives its value back: try "return <code>" first
                let buf = S('return ' + raw);
                let st = la.luaL_loadbufferx(Ls, buf, buf.length, S('=lua'), null);
                if (st !== lua.LUA_OK) { lua.lua_settop(Ls, top); buf = S(raw); st = la.luaL_loadbufferx(Ls, buf, buf.length, S('=lua'), null); }
                if (st !== lua.LUA_OK) { const msg = lua.lua_tojsstring(Ls, -1); lua.lua_settop(Ls, top); fail(line, 'Lua: ' + clean(msg) + '!'); }
                let ticks = 0;
                lua.lua_sethook(Ls, function (L2) { if (++ticks > 3000) la.luaL_error(L2, S('this Lua code took too long (an endless loop?), so it was stopped')); }, lua.LUA_MASKCOUNT, 1000);
                st = lua.lua_pcall(Ls, 0, lua.LUA_MULTRET, 0);
                lua.lua_sethook(Ls, null, 0, 0);
                if (st !== lua.LUA_OK) { const msg = lua.lua_tojsstring(Ls, -1); lua.lua_settop(Ls, top); fail(line, 'Lua: ' + clean(msg) + '!'); }
                const v = lua.lua_gettop(Ls) > top ? readLua(top + 1, 0) : null;
                lua.lua_settop(Ls, top);
                return v;
            } catch (e) {
                try { lua.lua_settop(Ls, top); } catch (er) {}
                if (e instanceof BitError) throw e;
                fail(line, 'Lua: ' + String(e && e.message || e) + '!');
            }
        });
        // ---- matchers: mat Name: ( "find" ~> "becomes" ... ) ----
        const pairsOf = function (m, line, who) {
            if (!(m instanceof BitMatcher)) fail(line, who + ' needs a matcher (made with: mat Name: ( "find" ~> "becomes" ))!');
            // keys and values are read now, so they always use the variables' current values
            return m.pairs.map(function (pr) { return { k: rt.evalE(pr.k, m.scope), v: rt.evalE(pr.v, m.scope) }; });
        };
        const matchOne = function (input, pairs) {
            for (let i = 0; i < pairs.length; i++) if (same(input, pairs[i].k)) return { hit: true, v: pairs[i].v };
            if (typeof input === 'string') {
                // inside text: every key is found and swapped in ONE pass (left to right, longest key first),
                // so a replacement is never matched again (no endless chains like a -> b -> a)
                const keys = pairs.filter(function (pr) { return typeof pr.k === 'string' && pr.k.length; }).sort(function (x, y) { return y.k.length - x.k.length; });
                if (!keys.length) return { hit: false, v: input };
                let out = '', i = 0, hit = false;
                while (i < input.length) {
                    const pr = keys.find(function (x) { return input.startsWith(x.k, i); });
                    if (pr) { out += show0(pr.v); i += pr.k.length; hit = true; } else { out += input[i]; i++; }
                }
                return { hit: hit, v: out };
            }
            return { hit: false, v: input };
        };
        def('mat_match', function (a, k, line) {
            const pairs = pairsOf(a[1], line, 'mat_match');
            const input = a[0];
            if (Array.isArray(input)) return input.map(function (x) { return matchOne(x, pairs).v; });
            if (input instanceof BitVec) return new BitVec(input.a.map(function (x) { return matchOne(x, pairs).v; }));
            return matchOne(input, pairs).v;
        });
        def('mat_has', function (a, k, line) { return matchOne(a[0], pairsOf(a[1], line, 'mat_has')).hit; });
        def('mat_keys', function (a, k, line) { return pairsOf(a[0], line, 'mat_keys').map(function (pr) { return pr.k; }); });
        def('stop', function () { rt.stopped = true; return null; });
    }

    /* ================= Playing a program in a block ================= */
    const KEYNAME = function (e) { return e.key === ' ' ? 'space' : String(e.key).toLowerCase(); };
    const SAMPLE =
`var best = 0
var temp target = 1
var temp tries = 0

fn onstart():
    renderRT("=Y=BitLang=Y= **Guess the number!** I picked 1 to 9. Press a number key!", line="1")
    newGame()

fn newGame():
    target = randint(1, 9)
    tries = 0
    renderRT("Make a guess!", line="3")
    renderRT(btn(newGame, "#C#New game#") + "", line="4")
    showBest()

fn showBest():
    if best == 0:
        renderRT("Best: no wins yet", line="5")
    else:
        renderRT("Best: " + best + " tries", line="5")

fn onkey(k):
    if len(k) == 1 and contains("123456789", k):
        guess(num(k))

fn guess(n):
    tries += 1
    if n == target:
        beep(880, 80)
        renderRT("=Y=Yes!=Y= It was " + n + " after " + tries + " tries!", line="3")
        if best == 0 or tries < best:
            best = tries
        showBest()
    elif n < target:
        renderRT("**" + n + "** is too low!", line="3")
    else:
        renderRT("**" + n + "** is too high!", line="3")
`;
    const PROG_STYLE_NOTE = 'bl-prog';

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function newId() { return 'bl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

    // Syntax colors (editor + guide)!
    const HL_BUILTINS = ('pow min max random randint clamp str num len range push pop remove join split upper lower contains keys time print renderRT skill btn remvar key beep stop floor ceil round abs sqrt sin cos tan atan2 PI inherit textbox counter beepbox annotate_highlight annotate_underline annotate_strikethrough annotate_box annotate_halo annotate_brackets annotate_spotlight annotate_accent annotate_bubble annotate_dusk annotate_prism annotate_complement annotate_ticket annotate_neon annotate_stamp annotate_tape annotate_checker annotate_halftone annotate_aurora annotate_mild annotate_wrap annotate_belt annotate_bucket annotate_torpedo annotate_bottle annotate_packet annotate_select annotate_capsule annotate_frost annotate_pixel annotate_flag annotate_gem lua mat_match mat_has mat_keys renderPT python sql sql_save sql_load lam vec mat dot cross norm normalize det transpose inverse identity zeros trace rows cols to_list ls_set ls_get ls_remove ls_keys ls_clear to_json from_json export_file import_file regex_test regex_match regex_all regex_replace regex_split').split(' ');
    const HL_EVENTS = ['onstart', 'onkey', 'onkeyup', 'onend'];
    const HL_RE = /(#[^\n]*)|(https?:\/\/[^\s"'\)\],]+)|((?<=\][ \t]*)">|~>)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
    function highlight(code) {
        let out = '', last = 0, prevKw = '', m;
        HL_RE.lastIndex = 0;
        while ((m = HL_RE.exec(code))) {
            out += esc(code.slice(last, m.index));
            last = m.index + m[0].length;
            let c = '';
            if (m[1]) c = 'c'; else if (m[3]) c = 'k'; /* the mouse operator "> and the matcher arrow ~> */ else if (m[2] || m[4]) c = 's'; else if (m[5]) c = 'n';
            else {
                const w = m[6];
                if (KEYWORDS[w] || ((w === 'mat' || w === 'matc') && /^\s*(mat\s+\w+\s*:|matc\s+\w+\s*\[)/.test(code.slice(Math.max(0, code.lastIndexOf('\n', m.index) + 1)))) || (w === 'use' && /^\s*use\s+(python|sqlite|lua)\b/.test(code.slice(Math.max(0, code.lastIndexOf('\n', m.index) + 1))))) c = 'k';
                else if (prevKw === 'fn') c = HL_EVENTS.indexOf(w) >= 0 ? 'e' : 'f';
                else if (HL_EVENTS.indexOf(w) >= 0) c = 'e';
                else if (HL_BUILTINS.indexOf(w) >= 0) c = 'b';
                prevKw = w === 'fn' ? 'fn' : '';
            }
            if (!m[6]) prevKw = '';
            out += c ? '<span class="bl-t-' + c + '">' + esc(m[0]) + '</span>' : esc(m[0]);
        }
        return out + esc(code.slice(last));
    }

    /* ================= BBML: a little markup that sets up the page before onstart ================= */
    // <line>Hello **{name}**</line>  <btn do="go">#G#Go#</btn>  <textbox var="name">Your name</textbox> ...
    // It is turned into BitLang (renderRT lines) and runs right after the program's top-level code, before onstart.
    const BB_LINE = 100000; // (BBML line numbers ride along as 100000 + n, so errors can say "BBML line n")
    function parseBBML(src) {
        const root = { name: '#root', kids: [], line: 1 }, stack = [root];
        let i = 0, line = 1, text = '', textLine = 1;
        const flush = function () { if (text) { stack[stack.length - 1].kids.push({ t: 'text', v: text, line: textLine }); text = ''; } };
        const bad = function (msg, ln) { throw new BitError(msg, BB_LINE + (ln || line)); };
        while (i < src.length) {
            const c = src[i];
            if (c === '\\' && (src[i + 1] === '<' || src[i + 1] === '{' || src[i + 1] === '}' || src[i + 1] === '\\')) { if (!text) textLine = line; text += c + src[i + 1]; i += 2; continue; }
            if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); const end = e < 0 ? src.length : e + 3; line += (src.slice(i, end).match(/\n/g) || []).length; i = end; continue; }
            if (c === '<' && /[A-Za-z\/]/.test(src[i + 1] || '')) {
                flush();
                const startLine = line;
                if (src[i + 1] === '/') {
                    const m = /^<\/([A-Za-z][\w-]*)\s*>/.exec(src.slice(i));
                    if (!m) bad('A closing tag should look like </line>!');
                    const top = stack[stack.length - 1];
                    if (stack.length < 2 || top.name !== m[1].toLowerCase()) bad('</' + m[1] + '> closes ' + (stack.length < 2 ? 'nothing' : 'the wrong tag (the open one is <' + top.name + '>)') + '!');
                    stack.pop();
                    i += m[0].length;
                    continue;
                }
                const nm = /^<([A-Za-z][\w-]*)/.exec(src.slice(i));
                const el = { t: 'el', name: nm[1].toLowerCase(), attrs: {}, kids: [], line: startLine };
                i += nm[0].length;
                let closed = false;
                for (;;) {
                    while (i < src.length && /\s/.test(src[i])) { if (src[i] === '\n') line++; i++; }
                    if (i >= src.length) bad('The <' + el.name + '> tag is missing its closing >!', startLine);
                    if (src.startsWith('/>', i)) { i += 2; closed = true; break; }
                    if (src[i] === '>') { i++; break; }
                    const an = /^[A-Za-z_][\w:-]*/.exec(src.slice(i));
                    if (!an) bad('I do not understand this part of the <' + el.name + '> tag!', line);
                    i += an[0].length;
                    let val = true;
                    if (src[i] === '=') {
                        i++;
                        const q = src[i];
                        if (q === '"' || q === "'") { const e = src.indexOf(q, i + 1); if (e < 0) bad('An attribute value is missing its closing quote!'); val = { s: src.slice(i + 1, e) }; line += (val.s.match(/\n/g) || []).length; i = e + 1; }
                        else if (q === '{') { let d = 0, j = i; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } val = { x: src.slice(i + 1, j) }; i = j + 1; }
                        else { const bw = /^[^\s>]+/.exec(src.slice(i)); val = { s: bw ? bw[0].replace(/\/$/, '') : '' }; i += bw ? bw[0].length - (/\/$/.test(bw[0]) ? 1 : 0) : 0; }
                    }
                    el.attrs[an[0].toLowerCase()] = val;
                }
                stack[stack.length - 1].kids.push(el);
                if (!closed && el.name !== 'br') stack.push(el);
                continue;
            }
            if (!text) textLine = line;
            if (c === '\n') line++;
            text += c;
            i++;
        }
        flush();
        if (stack.length > 1) bad('<' + stack[stack.length - 1].name + '> is never closed (add </' + stack[stack.length - 1].name + '>)!', stack[stack.length - 1].line);
        return root;
    }
    function bbStr(t) { return '"' + String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'; }
    // text with {expressions}: "Hi " & (name) & "!"
    function bbText(t) {
        const parts = [];
        let i = 0, buf = '';
        while (i < t.length) {
            if (t[i] === '\\' && i + 1 < t.length && '<{}\\'.indexOf(t[i + 1]) >= 0) { buf += t[i + 1]; i += 2; continue; }
            if (t[i] === '{') {
                let d = 0, j = i;
                for (; j < t.length; j++) { if (t[j] === '{') d++; else if (t[j] === '}' && --d === 0) break; }
                if (j >= t.length) { buf += t.slice(i); break; }
                if (buf) { parts.push(bbStr(buf)); buf = ''; }
                const ex = t.slice(i + 1, j);
                // a # outside quotes would start a BitLang comment and swallow the rest: that's almost always text missing its quotes
                let q = '';
                for (let x = 0; x < ex.length; x++) { const ch = ex[x]; if (q) { if (ch === '\\') x++; else if (ch === q) q = ''; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '#') throw new BitError('Inside {...} is BitLang code, so text needs "quotes" (a # there starts a comment), like {mat_match("#O#Mango#", Mango)}!', BB_LINE + (bbText.line || 0)); }
                parts.push('(' + ex + ')');
                i = j + 1;
                continue;
            }
            buf += t[i++];
        }
        if (buf) parts.push(bbStr(buf));
        return parts;
    }
    function bbAttr(el, name, kind) {
        const a = el.attrs[name];
        if (a === undefined) return null;
        if (a === true) return kind === 'code' ? null : 'true';
        if (a.x !== undefined) return '(' + a.x + ')';
        if (kind === 'code') return a.s; // do="go", var="name", n="5", min="0": BitLang itself
        if (kind === 'num') return /^-?\d+(\.\d+)?$/.test(a.s) ? a.s : bbStr(a.s);
        return bbStr(a.s);
    }
    function bbContent(kids, inline) {
        // joins every child into one BitLang expression (pieces joined with &)
        const parts = [];
        kids.forEach(function (k, idx) {
            if (k.t === 'text') {
                let v = k.v.replace(/\s*\n\s*/g, ' ');
                if (idx === 0) v = v.replace(/^\s+/, '');
                if (idx === kids.length - 1) v = v.replace(/\s+$/, '');
                bbText.line = k.line;
                if (v) parts.push.apply(parts, bbText(v));
            } else parts.push(bbElement(k));
        });
        return parts.length ? parts.join(' & ') : '""';
    }
    function bbElement(el) {
        const bad = function (msg) { throw new BitError(msg, BB_LINE + el.line); };
        const content = function () { return bbContent(el.kids, true); };
        switch (el.name) {
            case 'line': case 'row': case 'span': return content();
            case 'br': return '"<br>"';
            case 'pt': return 'renderPT(' + content() + ')';
            case 'btn': case 'button': {
                const d = bbAttr(el, 'do', 'code') || bbAttr(el, 'onclick', 'code');
                if (!d) bad('<btn> needs do="the function to run", like <btn do="start">Start</btn>!');
                return 'btn(' + d + ', ' + content() + ')';
            }
            case 'textbox': case 'counter': {
                const v = bbAttr(el, 'var', 'code');
                if (v !== null && !/^[A-Za-z_]\w*$/.test(v)) bad('<' + el.name + ' var="..."> needs the name of a variable!');
                const args = [content()];
                if (v) args.push('variable=' + v);
                ['min', 'max'].forEach(function (n) { const x = bbAttr(el, n, 'code'); if (x !== null) args.push(n + '=' + x); });
                const val = bbAttr(el, 'value', 'text'); if (val !== null) args.push('value=' + val);
                return el.name + '(' + args.join(', ') + ')';
            }
            case 'annotate': case 'mark': {
                const ty = bbAttr(el, 'type', 'text') || '"highlight"', co = bbAttr(el, 'color', 'num');
                return 'skill(skill="annotate", type=' + ty + (co !== null ? ', color=' + co : '') + ', content=' + content() + ')';
            }
            case 'beepbox': case 'song': {
                const src = el.attrs.src || el.attrs.href || el.attrs.get;
                if (!src) bad('<beepbox> needs src="the song link"!');
                const link = src.x !== undefined ? '(' + src.x + ')' : bbStr(src.s);
                const lb = bbAttr(el, 'label', 'text');
                return 'beepbox(' + link + (lb !== null ? ', label=' + lb : '') + ')';
            }
            default: {
                // anything else is plain HTML (like <b> or <i>), passed through as it is
                let open = '<' + el.name;
                Object.keys(el.attrs).forEach(function (n) { const a = el.attrs[n]; open += a === true ? ' ' + n : ' ' + n + '="' + String(a.s !== undefined ? a.s : '').replace(/"/g, '&quot;') + '"'; });
                return bbStr(open + '>') + ' & ' + content() + ' & ' + bbStr('</' + el.name + '>');
            }
        }
    }
    function compileBBML(src) {
        const root = parseBBML(String(src || ''));
        const code = [], map = [];
        const emit = function (stmt, ln) { code.push(stmt); map.push(BB_LINE + ln); };
        root.kids.forEach(function (k) {
            if (k.t === 'text') {
                // loose text: every non-empty line becomes its own line on the page
                k.v.split('\n').forEach(function (ln, j) { const t = ln.trim(); bbText.line = k.line + j; if (t) emit('renderRT(' + bbText(t).join(' & ') + ')', k.line + j); });
                return;
            }
            if (k.name === 'line' || k.name === 'row') {
                const n = bbAttr(k, 'n', 'code') || bbAttr(k, 'line', 'code');
                emit('renderRT(' + bbContent(k.kids) + (n ? ', line=' + n : '') + ')', k.line);
                return;
            }
            if (k.name === 'pt') { emit('renderPT(' + bbContent(k.kids) + ')', k.line); return; }
            emit('renderRT(' + bbElement(k) + ')', k.line);
        });
        return { code: code.join('\n'), map: map };
    }
    function highlightBBML(src) {
        let out = '', i = 0;
        const plain = function (t) { out += esc(t); };
        const expr = function (t) { out += '{' + highlight(t) + '}'; };
        while (i < src.length) {
            if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); const end = e < 0 ? src.length : e + 3; out += '<span class="bl-t-c">' + esc(src.slice(i, end)) + '</span>'; i = end; continue; }
            const tag = /^<(\/?)([A-Za-z][\w-]*)/.exec(src.slice(i, i + 64));
            if (tag) {
                plain('<' + tag[1]); out += '<span class="bl-t-tag">' + esc(tag[2]) + '</span>';
                i += tag[0].length;
                while (i < src.length && src[i] !== '>') {
                    const c = src[i];
                    if (c === '"' || c === "'") { const e = src.indexOf(c, i + 1); const end = e < 0 ? src.length : e + 1; out += '<span class="bl-t-s">' + esc(src.slice(i, end)) + '</span>'; i = end; continue; }
                    if (c === '{') { let d = 0, j = i; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } expr(src.slice(i + 1, j)); i = j + 1; continue; }
                    const an = /^[A-Za-z_][\w:-]*/.exec(src.slice(i));
                    if (an) { out += '<span class="bl-t-b">' + esc(an[0]) + '</span>'; i += an[0].length; continue; }
                    plain(c); i++;
                }
                if (src[i] === '>') { plain('>'); i++; }
                continue;
            }
            if (src[i] === '{') { let d = 0, j = i; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } if (j < src.length) { expr(src.slice(i + 1, j)); i = j + 1; continue; } }
            plain(src[i]); i++;
        }
        return out;
    }

    // The markup of a program block (static, so notes + exports keep it and Omicron can run it too)!
    function blockHTML(code, id, title) {
        return '<span class="bl-prog" contenteditable="false" data-bl-id="' + esc(id || newId()) + '" data-bl-title="' + esc(title || 'Program') + '" title="Click to play the program"><span class="bl-chip-icon" aria-hidden="true"></span><span class="bl-chip-text">' + esc(title || 'Program') + '</span><button type="button" class="bl-chip-edit" title="Edit the code" aria-label="Edit program">✎</button><textarea class="bl-code" hidden spellcheck="false">\n' + esc(code == null ? SAMPLE : code) + '</textarea><textarea class="bl-bbml" hidden spellcheck="false">\n' + esc(arguments[3] || '') + '</textarea></span>';
    }

    const live = new WeakMap(); // prog element -> running state
    function stateKey(prog) { return 'bitlang_vars:' + (prog.getAttribute('data-bl-id') || 'x'); }
    function loadVars(prog) { try { return JSON.parse(localStorage.getItem(stateKey(prog)) || '{}') || {}; } catch (e) { return {}; } }
    function saveVars(prog, vars) { try { localStorage.setItem(stateKey(prog), JSON.stringify(vars)); } catch (e) {} }

    let audio = null;
    function beepNow(freq, ms) {
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            const o = audio.createOscillator(), g = audio.createGain();
            o.type = 'square'; o.frequency.value = Math.max(40, Math.min(4000, Number(freq) || 440));
            g.gain.value = 0.04;
            o.connect(g); g.connect(audio.destination);
            o.start(); o.stop(audio.currentTime + Math.max(10, Math.min(1000, Number(ms) || 100)) / 1000);
        } catch (e) {}
    }

    // Sanitized rich text + Keydown (=Y=gel=Y=, **bold**, #C#chip#…) when the Keydown renderer is around!
    function richText(html) {
        const d = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
        d.querySelectorAll('script, iframe, object, embed, link, meta, style').forEach(function (n) { n.remove(); });
        d.querySelectorAll('*').forEach(function (n) { [].slice.call(n.attributes).forEach(function (a) { if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name); }); });
        const kd = (window.RadiiCollab && window.RadiiCollab.kdRender) || function (t) { return t.replace(/=[A-Za-z]=(.+?)=[A-Za-z]=/g, '<mark>$1</mark>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }; // (plain pages get a small stand-in)
        if (kd) {
            const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
            const hits = [];
            let t;
            while ((t = w.nextNode())) hits.push(t);
            hits.forEach(function (n) { if (!/[=*`~#&]/.test(n.nodeValue)) return; if (n.parentNode && n.parentNode.closest && n.parentNode.closest('.bl-pt')) return; const sp = d.createElement('span'); sp.innerHTML = kd(n.nodeValue); n.replaceWith.apply(n, [].slice.call(sp.childNodes)); });
        }
        return d.body.innerHTML;
    }

    /* ================= Libraries: sqlite (sql.js), python (Pyodide), lua (Fengari) ================= */
    const SQLJS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
    const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
    const FENGARI = 'https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js';
    let luaP = null;
    function loadLua() { if (!luaP) luaP = (window.fengari ? Promise.resolve() : loadScript(FENGARI)).then(function () { if (!window.fengari) throw new Error('Lua did not load'); return window.fengari; }).catch(function (e) { luaP = null; throw e; }); return luaP; }
    // A fresh Lua world for each run, with only the safe standard libraries (no files, no page, no JavaScript)
    function newLua(fg, lib) {
        const lua = fg.lua, la = fg.lauxlib, S = fg.to_luastring;
        const Ls = la.luaL_newstate();
        fg.lualib.luaL_openlibs(Ls);
        lua.lua_pushcfunction(Ls, function (L2) {
            const n = lua.lua_gettop(L2), parts = [];
            for (let i = 1; i <= n; i++) { la.luaL_tolstring(L2, i); parts.push(lua.lua_tojsstring(L2, -1)); lua.lua_pop(L2, 1); }
            if (lib.out) lib.out(parts.join('\t'));
            return 0;
        });
        lua.lua_setglobal(Ls, S('print'));
        const seal = S('io = nil; dofile = nil; loadfile = nil; require = nil; package = nil; if os then os.exit = nil; os.execute = nil; os.remove = nil; os.rename = nil; os.tmpname = nil; os.getenv = nil end');
        if (la.luaL_loadbufferx(Ls, seal, seal.length, S('=seal'), null) === lua.LUA_OK) lua.lua_pcall(Ls, 0, 0, 0); else lua.lua_settop(Ls, 0);
        return Ls;
    }
    let sqlP = null, pyP = null;
    function loadScript(src) { return new Promise(function (res, rej) { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = function () { sc.remove(); rej(new Error('Could not load ' + src + ' (are you online?)')); }; document.head.appendChild(sc); }); }
    function loadSQL() { if (!sqlP) sqlP = (window.initSqlJs ? Promise.resolve() : loadScript(SQLJS + 'sql-wasm.js')).then(function () { return window.initSqlJs({ locateFile: function (f) { return SQLJS + f; } }); }).catch(function (e) { sqlP = null; throw e; }); return sqlP; }
    const PY_GUARD = 'import sys, importlib.abc\\nclass _BitLangGuard(importlib.abc.MetaPathFinder):\\n    def find_spec(self, name, path=None, target=None):\\n        if name.split(".")[0] in ("js", "pyodide_js") or name == "pyodide.code":\\n            raise ImportError("BitLang programs cannot use the page (" + name + ")")\\n        return None\\nsys.meta_path.insert(0, _BitLangGuard())\\nfor _m in ("js", "pyodide_js", "pyodide.code"):\\n    sys.modules.pop(_m, None)\\ndel _BitLangGuard\\n';
    function loadPy(pkgs) {
        if (!pyP) pyP = (window.loadPyodide ? Promise.resolve() : loadScript(PYODIDE + 'pyodide.js')).then(function () { return window.loadPyodide({ indexURL: PYODIDE }); }).then(function (py) { py.runPython(PY_GUARD.replace(/\\n/g, '\n')); return py; }).catch(function (e) { pyP = null; throw e; });
        return pyP.then(function (py) { const want = pkgs.filter(function (n) { return /^[A-Za-z0-9_.-]+$/.test(n); }); return want.length ? py.loadPackage(want).then(function () { return py; }) : py; });
    }
    function hashOf(t) { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length; }
    function dialog(html, onReady) {
        return new Promise(function (resolve) {
            const back = document.createElement('div');
            back.className = 'bl-edit-back';
            back.innerHTML = '<div class="bl-edit-dlg" role="dialog" style="max-width:520px">' + html + '</div>';
            document.body.appendChild(back);
            const done = function (v) { back.remove(); resolve(v); };
            if (onReady) onReady(back, done);
            back.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') done(null); });
        });
    }
    // Python can reach beyond the program, so the person is asked first (remembered for this exact program)
    function askTrust(kind, code) {
        const key = 'bitlang_trust:' + kind + ':' + hashOf(code);
        try { if (localStorage.getItem(key)) return Promise.resolve(true); } catch (e) {}
        const msg = 'This program uses <b>Python</b>. Python runs inside this page with much more freedom than BitLang itself, so only allow programs you trust (for example, one you wrote or read).';
        return dialog('<div class="bl-docs-head"><b>Allow Python?</b></div><div class="bl-edit-body"><p style="margin:0;line-height:1.5">' + msg + '</p><label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" class="bl-trust-always"> Always allow this exact program</label></div><div class="bl-edit-foot"><span class="bl-sp"></span><button type="button" class="bl-btn bl-cancel" data-a="no">Cancel</button><button type="button" class="bl-btn bl-run" data-a="yes">Allow</button></div>', function (back, done) {
            back.addEventListener('click', function (e) {
                const b = e.target.closest && e.target.closest('[data-a]');
                if (!b) return;
                if (b.getAttribute('data-a') === 'yes') { if (back.querySelector('.bl-trust-always').checked) { try { localStorage.setItem(key, '1'); } catch (er) {} } done(true); } else done(false);
            });
        });
    }
    // loads what the program asked for with "use ..."; resolves to { python: {...}, sqlite: {...}, lua: {...} }
    function loadLibs(prog, code, libs, note) {
        const out = {};
        let chain = Promise.resolve();
        libs.forEach(function (l) {
            chain = chain.then(function () {
                if (l.lib === 'lua') { note('Loading Lua (Fengari)…'); return loadLua().then(function (fg) { const lib = { fg: fg, out: null }; lib.L = newLua(fg, lib); out.lua = lib; }); }
                if (l.lib === 'sqlite') { note('Loading SQLite…'); return loadSQL().then(function (SQL) { out.sqlite = { SQL: SQL, db: new SQL.Database() }; }); }
                if (l.lib === 'python') {
                    return askTrust('python', code).then(function (ok) {
                        if (!ok) throw new Error('Python was not allowed, so the program did not start');
                        note('Loading Python… (about 10 MB the first time)');
                        return loadPy(l.pkgs).then(function (py) { out.python = { py: py, ns: py.globals.get('dict')() }; });
                    });
                }
            });
        });
        return chain.then(function () { return out; });
    }

    let current = null; // the program that has taken over the document
    function play(prog) {
        if (current && current !== prog) stop(current, true);
        stop(prog, true);
        const ta = prog.querySelector('.bl-code');
        const cont = prog.closest('#wysiwyg-canvas, #wysiwyg-page, .page-paper') || document.body;
        // The document itself becomes the program until it stops: the real content is set aside
        // (same nodes, nothing copied) and comes straight back afterwards!
        const over = document.createElement('div');
        over.className = 'bl-view';
        over.setAttribute('contenteditable', 'false'); // (while a program plays, the page cannot be edited: only textbox() and counter() take typing)
        over.innerHTML = '<button type="button" class="bl-over-stop" title="Stop (Esc)">■ Stop</button><div class="bl-out" aria-live="polite"></div>';
        const frag = document.createDocumentFragment();
        while (cont.firstChild) frag.appendChild(cont.firstChild);
        cont.appendChild(over);
        const prevEdit = cont.getAttribute('contenteditable');
        if (prevEdit !== null) cont.setAttribute('contenteditable', 'false');
        // Anything that saves the page by reading its HTML gets the REAL content (never the program's view), so a reload can never save the view into the note
        const liveViews = BitLang.__views || (BitLang.__views = new WeakSet());
        liveViews.add(over);
        over.__prog = prog;
        let patched = false;
        if (cont !== document.body) {
            try {
                Object.defineProperty(cont, 'innerHTML', {
                    configurable: true,
                    get: function () {
                        const d = document.createElement('div');
                        [].forEach.call(frag.childNodes, function (n) { d.appendChild(n.cloneNode(true)); });
                        [].forEach.call(d.querySelectorAll('.bl-playing'), function (x) { x.classList.remove('bl-playing'); });
                        return d.innerHTML;
                    },
                    set: function (v) { stop(prog, true); cont.innerHTML = v; } // (the page is being replaced: the program ends first)
                });
                patched = true;
            } catch (e) {}
        }
        const onHide = function () { stop(prog, true); };
        window.addEventListener('pagehide', onHide);
        window.addEventListener('beforeunload', onHide);
        let noSave = null;
        if (typeof window.autoSaveCanvasContent === 'function') { noSave = function () {}; window.savedAutoSave = window.autoSaveCanvasContent; window.autoSaveCanvasContent = noSave; } // (the playing view is never saved into the note)
        const out = over.querySelector('.bl-out');
        try { over.scrollIntoView({ block: 'nearest' }); } catch (e) {}
        const st = { raf: 0, keys: {}, mouse: { x: 0, y: 0, down: false }, rt: null, off: [], t0: performance.now(), over: over, cont: cont, frag: frag, noSave: noSave, prevEdit: prevEdit, dead: false, patched: patched, onHide: onHide };
        // If the page gets reset behind the program's back (another note opens, the page redraws...), the program stops by itself, so nobody is ever trapped in it!
        const gone = function () { return !over.isConnected || over.parentNode !== cont || !cont.isConnected; };
        let mo = null;
        try { mo = new MutationObserver(function () { if (live.get(prog) === st && gone()) stop(prog, true); }); mo.observe(cont, { childList: true }); } catch (e) {}
        const watch = setInterval(function () { if (live.get(prog) !== st) { clearInterval(watch); return; } if (gone()) stop(prog, true); }, 400);
        st.off.push(function () { clearInterval(watch); if (mo) mo.disconnect(); });
        live.set(prog, st);
        current = prog;
        prog.classList.add('bl-playing');
        const lines = {};
        const lineEl = function (n) {
            if (!lines[n]) {
                const d = document.createElement('div');
                d.className = 'bl-line';
                d.setAttribute('data-line', n);
                const after = [].find.call(out.children, function (c) { return parseFloat(c.getAttribute('data-line')) > parseFloat(n); });
                out.insertBefore(d, after || null);
                lines[n] = d;
            }
            return lines[n];
        };
        // numbered lines: line="N" takes over line N; with no line, each statement gets the next free number (and keeps it)
        let autoNext = 1;
        const autoMap = {};
        const resolveLine = function (ln, srcLine) {
            if (ln !== null && ln !== undefined) {
                const n = parseFloat(ln);
                if (!isNaN(n) && n >= autoNext) autoNext = Math.floor(n) + 1;
                return String(ln);
            }
            if (autoMap[srcLine] === undefined) autoMap[srcLine] = autoNext++;
            return String(autoMap[srcLine]);
        };
        const halt = function () { st.dead = true; cancelAnimationFrame(st.raf); };
        const showError = function (err) {
            const l = lineEl('error');
            l.className = 'bl-line bl-error';
            l.textContent = (err instanceof BitError ? (err.line ? (err.line > BB_LINE ? 'BBML line ' + (err.line - BB_LINE) : 'Line ' + err.line) + ': ' : '') : 'Oops: ') + (err && err.message || err);
            halt();
        };
        const host = {
            keys: st.keys, mouse: st.mouse, t0: st.t0, vars: loadVars(prog),
            lsPrefix: 'bitlang_ls:' + (prog.getAttribute('data-bl-id') || 'x') + ':',
            exportFile: function (name, text) {
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = name; a.style.display = 'none';
                document.body.appendChild(a); a.click();
                setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1000);
            },
            importFile: function (cb, accept) {
                const inp = document.createElement('input');
                inp.type = 'file'; inp.accept = accept; inp.style.display = 'none';
                inp.addEventListener('change', function () {
                    const f = inp.files && inp.files[0];
                    inp.remove();
                    if (!f || live.get(prog) !== st) return;
                    if (f.size > 1000000) { showError(new BitError('That file is too big to import (1 MB at most)!', 0)); return; }
                    const fr = new FileReader();
                    fr.onload = function () {
                        if (live.get(prog) !== st) return;
                        run(function () { st.rt.steps = 0; const n = cb instanceof BitFn ? cb.def.params.length : 2; st.rt.callFn(cb, [f.name, String(fr.result)].slice(0, n), {}, 0, 'import'); });
                    };
                    fr.onerror = function () { showError(new BitError('I could not read that file!', 0)); };
                    fr.readAsText(f);
                });
                document.body.appendChild(inp);
                inp.click();
            },
            print: function (s) { const d = lineEl(String(autoNext++)); d.className = 'bl-line bl-print'; d.textContent = s; },
            beep: beepNow,
            renderRT: function (html, ln, rt, srcLine) {
                ln = resolveLine(ln, srcLine);
                const el = lineEl(ln);
                const expandAll = function () {
                    for (let n = 0; n < 8; n++) {
                        const before = html;
                        // annotate skills turn into highlight marks right away (their text can hold buttons, boxes or songs too)!
                        html = html.replace(/⁣skill:(\d+)⁣/g, function (m, i) {
                            const sk = rt.skills[+i];
                            return sk && sk.skill === 'annotate' ? '<mark class="an-hl an-hl-' + sk.color + (sk.style === 'hl' ? '' : ' an-s-' + sk.style) + '">' + sk.content + '</mark>' : m;
                        });
                        html = html.replace(/⁣btn:(\d+)⁣/g, function (m, i) { const b = rt.btns[+i]; return b ? '<button type="button" class="bl-ubtn" data-bl-btn="' + i + '">' + b.content + '</button>' : ''; });
                        html = html.replace(/⁣input:(\d+)⁣/g, function (m, i) {
                            const en = rt.inputs[+i];
                            if (!en) return '';
                            const num2 = en.kind === 'number';
                            return '<span class="bl-tb' + (num2 ? ' bl-ct' : '') + '"><span class="bl-ph" aria-hidden="true">' + en.placeholder + '</span><input class="bl-in" data-bl-in="' + i + '" type="text"' + (num2 ? ' inputmode="decimal"' : '') + ' autocomplete="off" spellcheck="false"></span>';
                        });
                        if (html === before) break;
                    }
                };
                expandAll();
                // inputs: keep what is typed; show a value the program changed; remember focus when a line is redrawn
                const syncInputs = function (focusIdx, selS, selE) {
                    [].forEach.call(el.querySelectorAll('input[data-bl-in]'), function (inp) {
                        const en = rt.inputs[+inp.getAttribute('data-bl-in')];
                        if (!en) return;
                        let shown;
                        if (en.sc) {
                            const cur = en.sc.vars[en.name];
                            if (cur === en.last && typeof en.raw === 'string') shown = en.raw; // (nothing in the program changed it: keep what was typed)
                            else { shown = cur === null || cur === undefined ? '' : String(cur); en.raw = shown; en.last = cur; }
                        } else shown = typeof en.raw === 'string' ? en.raw : en.value;
                        const fresh = inp.getAttribute('data-bl-init') === null;
                        if (inp.value !== shown && (fresh || document.activeElement !== inp)) inp.value = shown;
                        inp.setAttribute('data-bl-init', '1');
                        const wrap = inp.parentNode;
                        if (wrap && wrap.classList) wrap.classList.toggle('bl-empty', inp.value === '');
                    });
                    if (focusIdx !== null) {
                        const again = el.querySelector('input[data-bl-in="' + focusIdx + '"]');
                        if (again) { again.focus(); try { again.setSelectionRange(selS, selE); } catch (e) {} }
                    }
                };
                if (el._bl === html) { syncInputs(null); return; } // (same picture: leave it alone so buttons keep working)
                const ae = document.activeElement;
                const hadFocus = ae && ae.getAttribute && el.contains(ae) && ae.getAttribute('data-bl-in') !== null ? ae : null;
                const fIdx = hadFocus ? hadFocus.getAttribute('data-bl-in') : null;
                const fS = hadFocus ? hadFocus.selectionStart : 0, fE = hadFocus ? hadFocus.selectionEnd : 0;
                el._bl = html;
                const tokens = html.match(/⁣skill:\d+⁣/g) || [];
                let shown = html;
                tokens.forEach(function (tk) { shown = shown.replace(tk, '<span class="bl-skill-wait">…</span>'); });
                el.innerHTML = richText(shown);
                syncInputs(fIdx, fS, fE);
                tokens.forEach(function (tk) {
                    const sk = rt.skills[+/\d+/.exec(tk)[0]];
                    const hook = BitLang.host && BitLang.host.skill;
                    Promise.resolve(hook ? hook(sk.skill, sk) : '<span class="bl-skill-miss">♪ <a href="' + esc(sk.get) + '" target="_blank" rel="noopener noreferrer">' + esc(sk.label || 'Open the song') + '</a></span>')
                        .then(function (h) { html = html.replace(tk, h || ''); if (el._bl !== undefined && lines[ln] === el) el.innerHTML = richText(html); try { if (BitLang.host && BitLang.host.afterSkill) BitLang.host.afterSkill(el); } catch (e) {} })
                        .catch(function (e) { html = html.replace(tk, '<span class="bl-error">(' + esc(e && e.message || 'skill failed') + ')</span>'); el.innerHTML = richText(html); });
                });
            }
        };
        const run = function (fn) { if (st.dead) return; try { fn(); } catch (err) { showError(err); } if (st.rt && st.rt.stopped) stop(prog); };
        const kd = function (e) {
            if (live.get(prog) !== st) return;
            const k = KEYNAME(e);
            if (k === 'escape') { e.preventDefault(); stop(prog); return; } // (Esc always leaves, even from inside a textbox)
            if (e.target.closest && e.target.closest('textarea, input, select')) return;
            if (/^(arrow|space)/i.test(k) || k === ' ') e.preventDefault();
            st.keys[k] = true;
            if (st.rt && st.rt.has('onkey')) run(function () { st.rt.call('onkey', [k]); });
        };
        const ku = function (e) { const k = KEYNAME(e); st.keys[k] = false; if (st.rt && st.rt.has('onkeyup')) run(function () { st.rt.call('onkeyup', [k]); }); };
                const bc = function (e) {
            // BeepBox song chips in the document play and stop when clicked (Bitbook's player)!
            const chip = e.target.closest && e.target.closest('.bb-chip');
            if (chip) { e.preventDefault(); e.stopPropagation(); if (typeof window.bbToggleChip === 'function') window.bbToggleChip(chip); return; }
            const b = e.target.closest && e.target.closest('[data-bl-btn]');
            if (!b || !st.rt) return;
            const o = st.rt.btns[+b.getAttribute('data-bl-btn')];
            if (o) run(function () { st.rt.steps = 0; st.rt.callFn(o.fn, [], {}, 0, 'button'); });
        };
        // typing into textbox() / counter(): the variable follows live, but only when the text really changed
        const plainKd = function (text) {
            const kdr = window.RadiiCollab && window.RadiiCollab.kdRender;
            const d = document.createElement('span');
            if (kdr) { try { d.innerHTML = kdr(text); return d.textContent; } catch (e) {} }
            return text.replace(/=[A-Za-z]=(.+?)=[A-Za-z]=/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/#[A-Za-z]#(.+?)#/g, '$1');
        };
        const onType = function (e, commit) {
            const inp = e.target;
            if (!inp.getAttribute || inp.getAttribute('data-bl-in') === null || !st.rt) return;
            const en = st.rt.inputs[+inp.getAttribute('data-bl-in')];
            if (!en) return;
            let raw = inp.value.replace(/\u2063/g, '');
            let val;
            if (en.kind === 'number') {
                let t = raw.replace(/[^0-9.\-]/g, '');
                t = (t.charAt(0) === '-' ? '-' : '') + t.replace(/-/g, '');
                const dot = t.indexOf('.');
                if (dot !== -1) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '');
                raw = t;
                val = /\d/.test(t) ? Number(t) : 0;
                if (commit) {
                    if (en.min !== null && val < en.min) val = en.min;
                    if (en.max !== null && val > en.max) val = en.max;
                    if (/\d/.test(t)) raw = String(val);
                }
            } else val = plainKd(raw.slice(0, 2000));
            if (inp.value !== raw) inp.value = raw;
            en.raw = raw;
            if (inp.parentNode && inp.parentNode.classList) inp.parentNode.classList.toggle('bl-empty', raw === '');
            if (en.sc && val !== en.last) { en.sc.vars[en.name] = val; en.last = val; } // (the variable only changes when the text did)
        };
        out.addEventListener('input', function (e) { onType(e, false); });
        out.addEventListener('change', function (e) { onType(e, true); });
        out.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('.bl-ct') && e.target.select) setTimeout(function () { try { e.target.select(); } catch (err) {} }, 0); }); // (a counter selects its number, so typing replaces it)
        document.addEventListener('keydown', kd, true);
        document.addEventListener('keyup', ku, true);
        out.addEventListener('click', bc);
        over.querySelector('.bl-over-stop').addEventListener('click', function () { stop(prog); });
        st.off.push(function () { document.removeEventListener('keydown', kd, true); document.removeEventListener('keyup', ku, true); });
        let rt;
        try { rt = new Runtime(ta ? ta.value : '', host); st.rt = rt; } catch (err) { showError(err); return; }
        const begin = function () {
            if (live.get(prog) !== st || st.dead) return;
            try {
                rt.start();
                const bbEl = prog.querySelector('.bl-bbml');
                if (bbEl && bbEl.value.trim()) {
                    // BBML: the page's starting lines, set up before onstart runs
                    const comp = compileBBML(bbEl.value);
                    rt.execBlock(parse(comp.code, { lams: rt.lams }, comp.map), rt.globals);
                }
                if (rt.has('onclick')) fail(0, 'onclick is gone: programs only change the document now (use btn to make something clickable)!');
                rt.call('onstart');
            } catch (err) { showError(err); return; }
            if (st.rt.stopped) { stop(prog); return; }
            if (st.rt.has('onframe')) {
                let last = performance.now();
                const frame = function (now) {
                    if (live.get(prog) !== st || st.dead) return;
                    const dt = Math.min(0.1, (now - last) / 1000);
                    last = now;
                    run(function () { st.rt.call('onframe', [dt]); });
                    if (live.get(prog) === st && !st.dead) st.raf = requestAnimationFrame(frame);
                };
                st.raf = requestAnimationFrame(frame);
            }
        };
        if (rt.libs.length) {
            const note = function (t) { const l = lineEl('lib'); l.className = 'bl-line bl-print'; l.textContent = t; };
            loadLibs(prog, ta ? ta.value : '', rt.libs, note).then(function (got) {
                if (live.get(prog) !== st) return;
                host.libs = got;
                if (lines.lib) { lines.lib.remove(); delete lines.lib; }
                begin();
            }).catch(function (e) { if (live.get(prog) === st) showError(new BitError(String(e && e.message || e) + '!', 0)); });
        } else begin();
    }
    function stop(prog, quiet) {
        const st = live.get(prog);
        if (!st) { prog.classList.remove('bl-playing'); return; }
        live.delete(prog);
        if (current === prog) current = null;
        cancelAnimationFrame(st.raf);
        st.off.forEach(function (f) { f(); });
        try { if (st.over && window.bbOwner && st.over.contains(window.bbOwner) && typeof window.bbStop === 'function') window.bbStop(); } catch (e) {}
        if (st.patched) { try { delete st.cont.innerHTML; } catch (e) {} } // (back to the normal innerHTML)
        window.removeEventListener('pagehide', st.onHide); window.removeEventListener('beforeunload', st.onHide);
        if (st.over && st.over.parentNode === st.cont) { st.over.remove(); st.cont.appendChild(st.frag); } // (the document is back to normal)
        else if (st.over && st.over.parentNode) st.over.remove();
        if (st.prevEdit !== null && st.prevEdit !== undefined && st.cont) st.cont.setAttribute('contenteditable', st.prevEdit);
        if (st.noSave && window.autoSaveCanvasContent === st.noSave) window.autoSaveCanvasContent = window.savedAutoSave;
        prog.classList.remove('bl-playing');
        if (st.rt) {
            if (!quiet && !st.dead) { try { st.rt.call('onend'); } catch (e) {} }
            try { saveVars(prog, st.rt.saveVars()); } catch (e) {}
        }
    }

    // Tab + Enter that behave in a code box!
    function codeKeys(ta) {
        ta.addEventListener('keydown', function (e) {
            e.stopPropagation();
            // A "tab" is 4 spaces of indentation: Tab, Backspace, Delete and the arrow keys treat it as ONE piece
            const v = ta.value, a = ta.selectionStart, z = ta.selectionEnd;
            const lineStart = v.lastIndexOf('\n', a - 1) + 1;
            const indentEnd = lineStart + /^ */.exec(v.slice(lineStart))[0].length; // end of this line's leading spaces
            const changed = function () { ta.dispatchEvent(new Event('input', { bubbles: true })); };
            const prevStop = function (pos) { const col = pos - lineStart; return pos - (col % 4 || 4); };
            const nextStop = function (pos) { const col = pos - lineStart; return Math.min(indentEnd, pos + (4 - col % 4)); };
            if (e.key === 'Tab' && e.shiftKey) {
                // Shift+Tab: one tab less on this line
                e.preventDefault();
                const cut = Math.min(4, indentEnd - lineStart) && ((indentEnd - lineStart) % 4 || 4);
                if (cut) { ta.setRangeText('', lineStart, lineStart + cut, 'preserve'); ta.setSelectionRange(Math.max(lineStart, a - cut), Math.max(lineStart, z - cut)); changed(); }
            }
            else if (e.key === 'Tab') { e.preventDefault(); const col = a - lineStart; ta.setRangeText('    '.slice(0, 4 - col % 4), a, z, 'end'); changed(); }
            else if (e.key === 'Backspace' && a === z && a > lineStart && a <= indentEnd && !e.altKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                ta.setRangeText('', prevStop(a), a, 'end'); changed();
            }
            else if (e.key === 'Delete' && a === z && a >= lineStart && a < indentEnd && !e.altKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                ta.setRangeText('', a, nextStop(a), 'start'); changed();
            }
            else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.metaKey && !e.ctrlKey) {
                // the moving end of the selection (the caret) jumps a whole tab inside the indentation
                const back = ta.selectionDirection === 'backward';
                const caret = e.shiftKey ? (back ? a : z) : (e.key === 'ArrowLeft' ? a : z);
                if (!e.shiftKey && a !== z) return; // (a plain arrow with a selection just collapses it, as usual)
                const cs = v.lastIndexOf('\n', caret - 1) + 1, ce = cs + /^ */.exec(v.slice(cs))[0].length;
                let to = null;
                if (e.key === 'ArrowLeft' && caret > cs && caret <= ce) { const col = caret - cs; to = caret - (col % 4 || 4); }
                if (e.key === 'ArrowRight' && caret >= cs && caret < ce) { const col = caret - cs; to = Math.min(ce, caret + (4 - col % 4)); }
                if (to === null) return;
                e.preventDefault();
                if (!e.shiftKey) ta.setSelectionRange(to, to);
                else { const anchor = back ? z : a; ta.setSelectionRange(Math.min(anchor, to), Math.max(anchor, to), to < anchor ? 'backward' : 'forward'); }
            }
            else if (e.key === 'Enter') {
                const s = ta.selectionStart;
                const before = ta.value.slice(0, s);
                const ln = before.slice(before.lastIndexOf('\n') + 1);
                const ind = /^\s*/.exec(ln)[0] + (/:\s*$/.test(ln) ? '    ' : '');
                e.preventDefault();
                ta.setRangeText('\n' + ind, s, ta.selectionEnd, 'end');
                ta.dispatchEvent(new Event('input', { bubbles: true })); // (so the colored copy behind the box updates right away)
            }
        });
        ['keyup', 'keypress'].forEach(function (ev) { ta.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    }

    // The ✎ editor: name + code!
    function openEditor(prog) {
        stop(prog, true);
        const ta = prog.querySelector('.bl-code');
        const back = document.createElement('div');
        back.className = 'bl-edit-back';
        back.innerHTML = '<div class="bl-edit-dlg" role="dialog" aria-label="Edit program"><div class="bl-docs-head"><b>Edit program</b><button type="button" class="bl-docs-x" title="Close">✕</button></div>' +
            '<div class="bl-edit-body"><label class="bl-edit-lbl">Name<input class="bl-edit-name" type="text" maxlength="40" spellcheck="false"></label><div class="bl-edit-lbl">Code<span class="bl-seg" role="tablist" aria-label="Code language"><button type="button" class="bl-seg-b on" data-mode="bitlang" role="tab" aria-selected="true">BitLang</button><button type="button" class="bl-seg-b" data-mode="bbml" role="tab" aria-selected="false">BBML</button></span><span class="bl-edit-wrap"><pre class="bl-hl" aria-hidden="true"></pre><textarea class="bl-edit-code" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></span><span class="bl-seg-note" hidden>BBML sets up the page before <b>onstart</b> runs: <code>&lt;line&gt;</code>, <code>&lt;btn do="fn"&gt;</code>, <code>&lt;textbox var="x"&gt;</code>, <code>{expressions}</code>… (see the Guide)</span></div></div>' +
            '<div class="bl-edit-foot"><button type="button" class="bl-btn bl-docs" data-a="docs" title="BitLang guide">? Guide</button><span class="bl-sp"></span><button type="button" class="bl-btn bl-cancel" data-a="cancel">Cancel</button><button type="button" class="bl-btn" data-a="save">Save</button><button type="button" class="bl-btn bl-run" data-a="play">Save &amp; ▶ Play</button></div></div>';
        document.body.appendChild(back);
        const name = back.querySelector('.bl-edit-name'), code = back.querySelector('.bl-edit-code');
        name.value = prog.getAttribute('data-bl-title') || 'Program';
        code.value = ta ? ta.value : '';
        codeKeys(code);
        const bbTa = prog.querySelector('.bl-bbml');
        const bufs = { bitlang: code.value, bbml: bbTa ? bbTa.value : '' };
        let mode = 'bitlang';
        const hlEl = back.querySelector('.bl-hl');
        const paint = function () { hlEl.innerHTML = (mode === 'bbml' ? highlightBBML(code.value) : highlight(code.value)) + '\n'; hlEl.scrollTop = code.scrollTop; hlEl.scrollLeft = code.scrollLeft; };
        back.querySelectorAll('.bl-seg-b').forEach(function (b) {
            b.addEventListener('click', function () {
                const to = b.getAttribute('data-mode');
                if (to === mode) return;
                bufs[mode] = code.value;
                mode = to;
                code.value = bufs[mode];
                back.querySelectorAll('.bl-seg-b').forEach(function (x) { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
                back.querySelector('.bl-seg-note').hidden = mode !== 'bbml';
                code.setAttribute('aria-label', mode === 'bbml' ? 'BBML markup' : 'BitLang code');
                code.focus(); code.setSelectionRange(0, 0); code.scrollTop = 0; code.scrollLeft = 0;
                paint();
            });
        });
        code.addEventListener('input', paint);
        code.addEventListener('scroll', function () { hlEl.scrollTop = code.scrollTop; hlEl.scrollLeft = code.scrollLeft; });
        paint();
        name.addEventListener('keydown', function (e) { e.stopPropagation(); });
        const close = function () { back.remove(); document.removeEventListener('keydown', onKey, true); };
        const onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
        document.addEventListener('keydown', onKey, true);
        const save = function () {
            const t = (name.value || 'Program').trim().slice(0, 40) || 'Program';
            prog.setAttribute('data-bl-title', t);
            const tx = prog.querySelector('.bl-chip-text'); if (tx) tx.textContent = t;
            bufs[mode] = code.value;
            let bbBox = prog.querySelector('.bl-bbml');
            if (!bbBox && bufs.bbml) { bbBox = document.createElement('textarea'); bbBox.className = 'bl-bbml'; bbBox.hidden = true; bbBox.setAttribute('spellcheck', 'false'); prog.appendChild(bbBox); }
            // (HTML drops the first newline inside a <textarea>, so the saved copy gets one extra in front)
            if (bbBox) { bbBox.textContent = '\n' + bufs.bbml; bbBox.value = bufs.bbml; }
            if (ta) { ta.textContent = '\n' + bufs.bitlang; ta.value = bufs.bitlang; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        };
        back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
        back.querySelector('.bl-docs-x').addEventListener('click', close);
        back.addEventListener('click', function (e) {
            const a = e.target.closest && e.target.closest('[data-a]');
            if (!a) return;
            const act = a.getAttribute('data-a');
            if (act === 'docs') openDocs();
            else if (act === 'cancel') close();
            else if (act === 'save') { save(); close(); }
            else if (act === 'play') { save(); close(); play(prog); }
        });
        setTimeout(function () { code.focus(); code.setSelectionRange(0, 0); code.scrollTop = 0; paint(); }, 0);
    }

    const wired = new WeakSet();
    function hydrate(root) {
        const scope = root || document;
        // a program view that is saved inside a note but not running (left by an older version, or a crash) is just clutter: remove it
        [].forEach.call(scope.querySelectorAll('.bl-view'), function (v) { if (!(BitLang.__views && BitLang.__views.has(v) && v.isConnected && v.querySelector('.bl-over-stop') && live.get(v.__prog))) v.remove(); });
        // programs saved by the first version (a big block) become chips!
        scope.querySelectorAll('.bl-prog .bl-head').forEach(function (h) {
            const old = h.closest('.bl-prog');
            const oc = old.querySelector('.bl-code');
            const t = document.createElement('div');
            t.innerHTML = blockHTML(oc ? oc.value : '', old.getAttribute('data-bl-id'));
            old.replaceWith(t.firstElementChild);
        });
        scope.querySelectorAll('.bl-prog').forEach(function (prog) {
            if (wired.has(prog)) return;
            wired.add(prog); // (tracked here, never in the note's saved HTML)
            if (!prog.getAttribute('data-bl-id')) prog.setAttribute('data-bl-id', newId());
            const ta = prog.querySelector('.bl-code');
            if (ta) ta.addEventListener('input', function () { const v = ta.value; ta.textContent = '\n' + v; ta.value = v; });
            prog.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
            prog.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                if (e.target.closest && e.target.closest('.bl-chip-edit')) openEditor(prog);
                else if (live.get(prog)) stop(prog); else play(prog);
            });
        });
    }

    /* ================= Guide ================= */
    const DOCS = `
<h1>BitLang</h1>
<p>BitLang is a tiny language for making little programs and games inside Bitbook notes (and Omicron pages). Add a <b>Programs</b> skill to a note and it becomes a chip, just like a BeepBox song: press <b>✎</b> on the chip to edit the code, and click the chip to play! While a program plays it <b>takes over the whole document</b> (text, buttons and songs), and the <b>■ Stop</b> button at the top-right (or Esc) brings your document back. Bitbook is the editor; the same chip also plays in Omicron.</p>

<h2>Your first program</h2>
<pre>fn onstart():
    renderRT("=Y=Hello=Y= from **BitLang**!", line="1")</pre>
<p><code>fn onstart():</code> runs once when the program starts. Indentation (4 spaces) shows what belongs to a function, an <code>if</code> or a loop, like in Python.</p>

<h2>Variables</h2>
<pre>var best = 0              # saved between plays (great for high scores!)
var temp score = 0        # temporary: starts fresh every play
score = score + 1
score += 1
var name = "Ava"
var pos = {x: 10, y: 20} # a map
var items = [1, 2, 3]    # a list</pre>
<ul><li><code>var</code> keeps its value after you stop, and comes back next time you play.</li><li><code>var temp</code> is reset on every play.</li><li>Values: numbers, <code>"text"</code>, <code>true</code>/<code>false</code>, <code>null</code>, lists <code>[ ]</code>, maps <code>{ }</code>.</li><li>A bare link is text: <code>var song = https://example.com/#abc</code></li><li>Comments start with <code>#</code>.</li></ul>

<h2>Functions and events</h2>
<pre>fn add(a, b=1):
    return a + b

fn onstart():     # once, when the program starts
fn onframe(dt):   # about 60 times a second while it plays; dt = seconds since the last frame
fn onkey(k):      # a key goes down ("a", "arrowleft", "space"...)
fn onkeyup(k):    # a key goes up
fn onend():       # when the program stops</pre>
<p>In the code editor, <b>Tab</b> indents to the next step of 4 spaces, <b>Shift+Tab</b> takes one step away, and inside the indentation <b>Backspace</b>, <b>Delete</b> and the <b>arrow keys</b> treat each 4 spaces as one tab.</p>
<p>Call a function with <code>add(2, 3)</code> or by name: <code>add(2, b=5)</code>.</p>

<p><code>onframe</code> only changes the document (<code>renderRT</code>, <code>print</code>, buttons...). Rewriting the same text is free, so a clock or a counter can update every frame:</p>
<pre>var temp t = 0

fn onframe(dt):
    t += dt
    renderRT("Seconds: **" + floor(t) + "**", line="1")</pre>

<h2>Choices and loops</h2>
<pre>if score > 10:
    print("Great!")
elif score > 5:
    print("Nice")
else:
    print("Keep going")

while lives > 0:
    lives -= 1

for i in range(5):        # 0, 1, 2, 3, 4
    print(i)
for item in items:
    print(item)
# break  continue  pass  return</pre>
<p>Operators: <code>+ - * / % **</code>, comparisons <code>== != &lt; &gt; &lt;= &gt;=</code>, <code>and or not</code>, and <code>in</code> (<code>3 in items</code>). Text + anything joins: <code>"Score " + score</code>.</p>

<h2>Input and sound</h2>
<table>
<tr><td><code>key("ArrowLeft")</code></td><td><code>true</code> while that key is held (<code>key("a")</code>, <code>key("space")</code>)</td></tr>
<tr><td><code>beep(freq, ms)</code></td><td>A little square-wave beep</td></tr>
<tr><td><code>remvar(name)</code></td><td>Removes a <code>var temp</code> variable (give its name, like <code>remvar(score)</code>). Using it afterwards is an error until you create it again with <code>var temp</code>. Saved <code>var</code> variables can't be removed!</td></tr>
<tr><td><code>stop()</code></td><td>End the program</td></tr>
<tr><td><code>time()</code></td><td>Seconds since you pressed Play</td></tr>
</table>

<h2>Text output</h2>
<table>
<tr><td><code>print(a, b, ...)</code></td><td>Adds a line of plain text</td></tr>
<tr><td><code>renderRT(html, line="1")</code></td><td>Shows <b>rich text</b> on a numbered line. <code>line="2"</code> <b>takes over</b> line 2, replacing whatever was written there before (by <code>renderRT</code>, a quick command, or <code>print</code>). Leave <code>line</code> out and it adds the next free line instead (the same statement keeps its own line, so a loop or <code>onframe</code> updates it in place). It understands HTML and Keydown: <code>=Y=gel=Y=</code>, <code>**bold**</code>, <code>#C#chip#</code>…</td></tr>
<tr><td><code>renderPT(text, line="1")</code></td><td>Like <code>renderRT</code>, but <b>plain text</b>: no Keydown, no HTML, shown exactly as written (<code>**stars**</code> stay as stars). Same line rules: <code>line=N</code> takes over line N, no <code>line</code> adds the next free line, and inside another call or a <code>&amp;</code> row it just hands back its text.</td></tr>
<tr><td><code>btn(function, contents)</code></td><td>A clickable button! The <b>function</b> runs when it is clicked; the <b>contents</b> can be anything <code>renderRT</code> understands. A button has <b>no style of its own</b>, so whatever you put inside becomes the button: a Keydown chip (<code>#C#Play#</code>), an Annotate highlight, an image, plain text… Show it with <code>renderRT(btn(restart, "↻ Again") + "", line="2")</code>. You can mix buttons, text and skills in one line.</td></tr>
</table>

<h2>BBML: set up the page without renderRT</h2>
<p>BBML is a little markup (it looks like HTML) for a program's <b>starting page</b>. In the ✎ editor, switch the <b>BitLang | BBML</b> button to write it. When the program plays, the BBML lines appear first (right after your top-level code), then <code>onstart</code> runs and keeps adding lines after them.</p>
<pre class="bbml">&lt;!-- comments look like this --&gt;
&lt;line&gt;Welcome, **{name}**! Next year you are {age + 1}.&lt;/line&gt;
A loose line of text becomes its own line too.
&lt;row&gt;
    &lt;btn do="start"&gt;#G#Start#&lt;/btn&gt;
    &lt;btn do="stop"&gt;#R#Exit#&lt;/btn&gt;
&lt;/row&gt;
&lt;line&gt;Name: &lt;textbox var="name"&gt;Your name&lt;/textbox&gt; Age: &lt;counter var="age" min="0" max="120"/&gt;&lt;/line&gt;
&lt;line n="9"&gt;&lt;annotate type="bubble" color="pink"&gt;Line 9, in a bubble&lt;/annotate&gt;&lt;/line&gt;
&lt;pt&gt;Plain text: **these stars stay**&lt;/pt&gt;</pre>
<table>
<tr><td><code>&lt;line&gt;…&lt;/line&gt;</code> <code>&lt;row&gt;</code></td><td>One line of rich text (Keydown works). <code>n="9"</code> puts it on line 9. Everything inside, buttons included, sits on that one line.</td></tr>
<tr><td><code>{expression}</code></td><td>Any BitLang expression, worked out when the page is set up: <code>{name}</code>, <code>{age + 1}</code>, <code>{upper(name)}</code>. Write <code>\{</code> for a real brace and <code>\&lt;</code> for a real &lt;.</td></tr>
<tr><td><code>&lt;btn do="fn"&gt;…&lt;/btn&gt;</code></td><td>A button that runs a function (or <code>stop</code>, or <code>do="lam(...)"</code>). Its contents are what it looks like.</td></tr>
<tr><td><code>&lt;textbox var="x"&gt;hint&lt;/textbox&gt;</code></td><td>A textbox tied to a variable (<code>value="..."</code> to start with text).</td></tr>
<tr><td><code>&lt;counter var="x" min="0" max="9"/&gt;</code></td><td>A number box tied to a variable.</td></tr>
<tr><td><code>&lt;annotate type="box" color="3"&gt;…&lt;/annotate&gt;</code></td><td>An Annotate highlight (any type, color by number or name).</td></tr>
<tr><td><code>&lt;beepbox src="link" label="Song"/&gt;</code></td><td>A BeepBox song chip.</td></tr>
<tr><td><code>&lt;pt&gt;…&lt;/pt&gt;</code></td><td>Plain text (no Keydown).</td></tr>
<tr><td><code>&lt;b&gt;</code> <code>&lt;i&gt;</code> <code>&lt;br&gt;</code>…</td><td>Any other tag is passed through as HTML.</td></tr>
</table>
<p>Variables and functions come from your BitLang code, so declare them there (<code>var name = ""</code>, <code>fn start():</code>). Mistakes show as <b>BBML line N</b>. In the editor, BBML tag names are bright green, attribute names blue, values and text in quotes green, and <code>{expressions}</code> are colored like BitLang.</p>

<h2>Lines: writing and overwriting</h2>
<pre>fn onstart():
    renderRT("first")                  # no line: takes the next free line (1)
    renderRT("second")                 # line 2
    renderRT("OVERRIDDEN", line=1)     # line 1 now says OVERRIDDEN
    annotate_bubble("quick commands count as lines too")   # line 3
    print("so does print")                                  # line 4</pre>
<p>Every piece of output sits on a numbered line, in order. <code>renderRT("text", line=N)</code> always <b>replaces</b> line N, even when it has been written on already, so you can redraw one line (a score, a status) without touching the rest. Without <code>line</code>, a new line is added at the end.</p>

<h2>Rows: several things on one line</h2>
<p>End a line with <code>&amp;</code> and the next line joins it, so quick commands and buttons sit side by side. They can be stacked as long as you like:</p>
<pre>fn onstart():
    btn(submit, renderRT("#C#Submit#")) &amp;
    btn(stop, renderRT("#R#Exit#")) &amp;
    btn(go, renderRT("#G#Go#"))

fn submit():
    renderRT("Submitted!", line=9)

fn go():
    renderRT("Going!", line=9)</pre>
<p>The three buttons appear in one row (one output line). <code>&amp;</code> also works inside <code>renderRT(...)</code> to join text pieces, and the next component can be indented however you like. The last line of a row has no <code>&amp;</code>.</p>

<h2>Lambdas: lam(...)</h2>
<p>A lambda is a little function written in one place. Put statements inside <code>lam(...)</code>, separated by <code>;</code>, and keep it in a variable (or hand it straight to a button):</p>
<pre>var done = lam(renderRT("Good job! You did it", line=1); btn(stop, renderRT("#R#Exit#")) &amp;; btn(submit, renderRT("#G#Submit#")))

fn onstart():
    done()                  # runs every statement, in order

fn later():
    btn(lam(renderPT("clicked", line=5); beep(660, 80)), "#C#Click me#")   # a lambda as a button's function</pre>
<ul>
<li>Each <code>;</code> starts the next statement, exactly like a new line.</li>
<li>A <code>&amp;</code> right before a <code>;</code> keeps the next statement on the same line of output (the <code>&amp;</code> row rule), so the Exit and Submit buttons sit side by side.</li>
<li>A lambda takes no values. It sees your variables, and <code>return</code> works inside it.</li>
</ul>

<h2>Saving data (browser storage)</h2>
<table>
<tr><td><code>ls_set(key, value)</code></td><td>Saves a number, text, true/false, list or map under a name. It is still there next time (even after closing the page).</td></tr>
<tr><td><code>ls_get(key, default)</code></td><td>Reads it back (or <code>default</code>, or <code>null</code>, when nothing is saved).</td></tr>
<tr><td><code>ls_remove(key)</code></td><td>Forgets one key.</td></tr>
<tr><td><code>ls_keys()</code></td><td>A list of every key this program saved.</td></tr>
<tr><td><code>ls_clear()</code></td><td>Forgets all of this program's keys.</td></tr>
<tr><td><code>to_json(x)</code> <code>from_json(text, default)</code></td><td>Turn a list/map into text and back (handy with files).</td></tr>
</table>
<pre>var temp visits = ls_get("visits", 0)
fn onstart():
    ls_set("visits", visits + 1)
    renderPT("You have been here " + (visits + 1) + " times", line=1)</pre>
<p>Every program has its own private shelf. Add <code>shared=true</code> (like <code>ls_get("name", "", shared=true)</code>) to use a shelf all programs share. (<code>var</code> variables are also saved for you, but <code>ls_</code> gives you named keys, lists and maps.)</p>

<h2>Files: export_file and import_file</h2>
<table>
<tr><td><code>export_file(name, text)</code></td><td>Saves a text file to the person's computer (their browser downloads it).</td></tr>
<tr><td><code>import_file(fn)</code></td><td>Opens the file picker. When a file is chosen, <code>fn(name, text)</code> runs with its name and text. Add <code>accept=".csv,.json"</code> to limit the types. Files up to 1 MB.</td></tr>
</table>
<pre>fn onstart():
    btn(pick, "#C#Open a file#") &amp;
    btn(save, "#G#Save a file#")

fn pick():
    import_file(got)

fn got(name, text):
    renderPT(name + " has " + len(text) + " letters", line=3)

fn save():
    export_file("hello.txt", "Hello from BitLang!")</pre>
<p>The browser only opens the picker (or a download) after a click, so call these from a button's function. Programs can only read a file the person picks, and only save through a normal download.</p>

<h2>Regex (patterns for text)</h2>
<table>
<tr><td><code>regex_test(pattern, text)</code></td><td><code>true</code> if the pattern is found anywhere in the text.</td></tr>
<tr><td><code>regex_match(pattern, text)</code></td><td>The first match as a map (<code>m.text</code>, <code>m.index</code>, <code>m.groups</code> = the (...) parts, <code>m.named</code> for (?&lt;name&gt;...) parts) or <code>null</code>.</td></tr>
<tr><td><code>regex_all(pattern, text)</code></td><td>A list of every match (add <code>full=true</code> for maps like regex_match).</td></tr>
<tr><td><code>regex_replace(pattern, text, with)</code></td><td>Replaces every match. <code>$1</code> in <code>with</code> is the first (...) part.</td></tr>
<tr><td><code>regex_split(pattern, text)</code></td><td>Cuts the text at each match into a list.</td></tr>
</table>
<pre>regex_test("^[A-Z]", "Hello")                       # true
regex_all("\\d+", "a1 b22 c333")                      # ["1", "22", "333"]
regex_replace("(\\w+)@(\\w+)", "me@site", "$2/$1")    # "site/me"
regex_match("(?&lt;y&gt;\\d{4})-(\\d\\d)", "on 2026-10").named.y   # "2026"</pre>
<p>Patterns work like JavaScript's. Write a backslash twice inside quotes (<code>"\\d"</code> for a digit). Add <code>flags="i"</code> to ignore case (also <code>m</code>, <code>s</code>). Patterns up to 500 letters and texts up to 200,000 letters; a bad pattern shows a plain error.</p>

<h2>Buttons (step by step)</h2>
<p>A button runs one of your functions when someone clicks it. You need two things: <b>a function</b> that says what happens, and a <code>btn(...)</code> that puts a clickable thing on the page.</p>

<h3>1. The smallest button</h3>
<pre>fn onstart():
    btn(hello, "Click me")

fn hello():
    renderRT("You clicked it! =Y=Hooray=Y=", line="2")</pre>
<ul>
<li><code>btn(hello, "Click me")</code> has <b>two parts</b>: first the function's name, then what the button looks like.</li>
<li>Write the function name <b>without brackets</b>: <code>hello</code>, not <code>hello()</code>. With brackets you would run it right now instead of giving it to the button.</li>
<li>On a line of its own, <code>btn(...)</code> shows itself. Inside other text, use <code>renderRT</code> (see 3).</li>
</ul>

<h3>2. A button that changes something (a counter)</h3>
<pre>var temp clicks = 0

fn onstart():
    draw()

fn draw():
    renderRT("Clicks: **" + clicks + "** " + btn(add, "#C#+1#"), line="1")

fn add():
    clicks += 1
    draw()</pre>
<ul>
<li>A button's function takes <b>no values</b>, so keep what you need in a <code>var</code> or <code>var temp</code> (here <code>clicks</code>).</li>
<li>Pressing the button changes <code>clicks</code>, then <code>draw()</code> writes the same line again with the new number. Writing a line again <b>replaces</b> it, so the button stays in place.</li>
</ul>

<h3>3. Buttons inside text, and several at once</h3>
<pre>fn onstart():
    renderRT("Pick one: " + btn(red, "Red") + " " + btn(blue, "Blue"), line="1")

fn red():
    renderRT("You picked **red**!", line="2")

fn blue():
    renderRT("You picked **blue**!", line="2")</pre>
<p>Join buttons with <code>+</code> and text, like any other text. Each <code>btn</code> needs its own function.</p>

<h3>4. Make the button look like anything</h3>
<p>A button has <b>no style of its own</b>: whatever you put inside becomes the button. Try a Keydown chip, an Annotate highlight (the quick commands are perfect), or an image:</p>
<pre>fn onstart():
    renderRT(btn(go, "#C#Go!#") + " " + btn(go, annotate_bubble("Or this", color=6)) + " " + btn(go, annotate_accent("Or this", 10)), line="1")

fn go():
    renderRT("Went!", line="2")</pre>

<h3>5. A button that stops the program</h3>
<pre>fn onstart():
    btn(stop, "Quit")</pre>
<p>Built-in commands like <code>stop</code> work as the function too. (The ■ Stop button, or Esc, always works as well.)</p>

<h3>If your button does nothing</h3>
<ul>
<li>Did you write <code>btn(hello, ...)</code> and not <code>btn(hello(), ...)</code>?</li>
<li>Is there a <code>fn hello():</code> in your code with the same spelling?</li>
<li>Is it on a line of its own, or inside <code>renderRT(...)</code>? A button saved in a variable is not shown until you give it to <code>renderRT</code>.</li>
<li>Did the program stop before you clicked? A program with only <code>onstart</code> keeps running until you press ■ Stop, but an error stops everything: read the red message!</li>
<li>Buttons cannot hand values to the function (<code>btn(add(5), ...)</code> will not work). Put the value in a <code>var</code> first.</li>
</ul>

<h2>Typing: textbox() and counter()</h2>
<p>While a program plays, the page can't be edited, so nobody can change your text by accident. The exceptions are boxes you add yourself:</p>
<pre>var name = ""
var temp age = 0

fn onstart():
    renderRT("Name: " + textbox("Type your name", variable=name), line="1")
    renderRT("Age: " + counter(variable=age, min=0, max=120), line="2")
    renderRT(btn(hello, "#C#Say hi#"), line="3")

fn hello():
    renderRT("Hi **" + name + "**, you are " + age + "!", line="4")</pre>
<table>
<tr><td><code>textbox(placeholder, variable=x)</code></td><td>A box to type in. <code>variable=x</code> (no quotes) updates the variable <b>while the person types</b>. The short form <code>textbox("Text here", x)</code> does the same. The placeholder is the dimmed hint; it understands <b>Keydown and skills</b> (<code>textbox(annotate_box("Name"))</code>, even songs). <code>value="..."</code> sets what it starts with.</td></tr>
<tr><td><code>counter(variable=x, min=0, max=10)</code></td><td>(Short form: <code>counter(x)</code>.) A smaller box for <b>numbers only</b> (digits, one dot, a leading minus). The variable gets a real number. Empty counts as 0. <code>min</code> and <code>max</code> are applied when the person leaves the box. It takes a placeholder too, but no Keydown typing.</td></tr>
</table>
<ul>
<li>People <b>can type Keydown</b> into a textbox (<code>**bold**</code>, <code>=Y=gel=Y=</code>), but the variable gets its <b>plain text</b> ("bold", "gel"). They <b>cannot</b> add skills: anything typed is only text.</li>
<li>A variable only changes when the text really changed, so typing stays smooth.</li>
<li>If your program changes the variable (<code>name = ""</code>), the box shows the new value. Create the variable with <code>var</code> or <code>var temp</code> before using it in <code>variable=...</code>.</li>
<li>Like buttons, boxes need <code>renderRT</code> (or a line of their own) to appear. Keys typed inside a box don't trigger <code>onkey</code>.</li>
</ul>

<h2>Skills inside programs</h2>
<pre>var temp song = https://ultraabox.github.io/#u5N0btuff...

fn onstart():
    renderRT(skill(skill="beepbox", get=song, content=inherit) + "", line="1")</pre>
<p><code>skill(skill="beepbox", get=link, content=inherit)</code> builds a BeepBox song player. <code>content=inherit</code> means the song data is taken from the link itself (<b>inherit only works with the BeepBox skill</b>). Add <code>label="My song"</code> to name the chip. In Bitbook the chip plays the song; in Omicron it opens the link.</p>

<h2>Annotate: highlights in your text</h2>
<pre>renderRT("Look: " + skill(skill="annotate", type="bubble", color="pink", content=renderRT("Some **totally random** text here")), line="1")</pre>
<p><code>skill(skill="annotate", type=..., color=..., content=...)</code> wraps text in one of Bitbook's Annotate highlights. <code>content</code> can be <code>renderRT("...")</code>: used inside another call, <code>renderRT</code> just hands back its rich text instead of showing it. <b>type</b> is <code>highlight</code>, <code>underline</code>, <code>strikethrough</code>, <code>box</code>, <code>halo</code>, <code>brackets</code>, <code>spotlight</code>, <code>accent</code>, <code>bubble</code> or one of the colorful ones: <code>dusk</code> <code>prism</code> <code>complement</code> <code>ticket</code> <code>neon</code> <code>stamp</code> <code>tape</code> <code>checker</code> <code>halftone</code> <code>aurora</code> <code>mild</code> (pale versions of every color) <code>wrap</code> <code>belt</code> <code>bucket</code> <code>torpedo</code> <code>bottle</code> <code>packet</code> <code>select</code> <code>capsule</code> <code>frost</code> <code>pixel</code> <code>flag</code> <code>gem</code>. <b>color</b> (default <code>yellow</code>) is red, orange, gold, yellow, lime, green, turquoise, teal, cyan, blue, purple, pink or slate. Annotate highlights make great <code>btn</code> contents!</p>

<h2>Quick commands</h2>
<p>The long <code>skill(...)</code> forms have short versions:</p>
<table>
<tr><td><code>annotate_bubble("Some **totally cool** text here", color=1)</code></td><td>The same as <code>skill(skill="annotate", type="bubble", color=..., content=...)</code>. There is one for every type: <code>annotate_highlight</code> <code>annotate_underline</code> <code>annotate_strikethrough</code> <code>annotate_box</code> <code>annotate_halo</code> <code>annotate_brackets</code> <code>annotate_spotlight</code> <code>annotate_accent</code> <code>annotate_bubble</code> and <code>annotate_dusk</code> <code>annotate_prism</code> <code>annotate_complement</code> <code>annotate_ticket</code> <code>annotate_neon</code> <code>annotate_stamp</code> <code>annotate_tape</code> <code>annotate_checker</code> <code>annotate_halftone</code> <code>annotate_aurora</code> <code>annotate_mild</code> <code>annotate_wrap</code> <code>annotate_belt</code> <code>annotate_bucket</code> <code>annotate_torpedo</code> <code>annotate_bottle</code> <code>annotate_packet</code> <code>annotate_select</code> <code>annotate_capsule</code> <code>annotate_frost</code> <code>annotate_pixel</code> <code>annotate_flag</code> <code>annotate_gem</code></td></tr>
<tr><td><code>color=1</code> … <code>color=13</code></td><td>Colors by number: 1 red, 2 orange, 3 gold, 4 yellow, 5 lime, 6 green, 7 turquoise, 8 teal, 9 cyan, 10 blue, 11 purple, 12 pink, 13 slate. Names work too: <code>color="pink"</code>, or put it second: <code>annotate_box("text", "blue")</code></td></tr>
<tr><td><code>beepbox(link, label="My song")</code></td><td>The same as <code>skill(skill="beepbox", get=link, content=inherit)</code></td></tr>
</table>
<p>On a line of their own they show themselves right away. Inside <code>renderRT(...)</code> you can mix them with other text:</p>
<pre>annotate_bubble("Some **totally cool** text here", color=1)
renderRT("Hi " + annotate_box("there", "blue") + " " + beepbox(song), line="9")</pre>

<h2>Lists, maps and text</h2>
<table>
<tr><td><code>len(x)</code></td><td>How many items / letters</td></tr>
<tr><td><code>push(list, x)</code> <code>pop(list)</code> <code>remove(list, x)</code></td><td>Change a list</td></tr>
<tr><td><code>list[0]</code> <code>list[-1]</code> <code>map.key</code> <code>map["key"]</code></td><td>Read (or set) a slot; a missing one is <code>null</code></td></tr>
<tr><td><code>range(n)</code> <code>range(a, b)</code> <code>range(a, b, step)</code></td><td>Lists of numbers</td></tr>
<tr><td><code>str(x)</code> <code>num(x)</code> <code>join(list, sep)</code> <code>split(text, sep)</code> <code>upper</code> <code>lower</code> <code>contains</code> <code>keys</code></td><td>Handy tools</td></tr>
</table>

<h2>Matchers: find and swap</h2>
<pre>var who = "Text"

mat Censor: (
    "badword"        ~> "*******"
    "just some text" ~> 1
)

mat Swap: (
    "matchme"    ~> "replaceme"
    "a_variable" ~> who          # a value can be a variable
    who          ~> "a_variable" # and so can what you look for
)

fn onstart():
    renderRT(mat_match("a_variable", Swap), line=1)          # Text
    renderRT(mat_match("no badword here", Censor), line=2)   # no ******* here
    renderPT(mat_match("just some text", Censor), line=3)    # 1</pre>
<ul>
<li><code>mat Name: ( ... )</code> makes a matcher: one <code>"what to find" ~&gt; what it becomes</code> per line (commas are fine too, and <code>#</code> comments work inside).</li>
<li><code>mat_match(x, Name)</code>: if <code>x</code> <b>is exactly</b> one of the keys, you get its value (any kind: text, a number, a list...). Otherwise, if <code>x</code> is text, every key found <b>inside</b> it is swapped (longest first).</li>
<li>Swapping happens <b>once</b>: a replacement is never matched again, so <code>"a_variable"</code> becomes <code>"Text"</code> and stays <code>"Text"</code> even though <code>"Text"</code> is also a key.</li>
<li>Keys and values are read when you match, so they always use the variables' current values.</li>
<li><code>mat_match(list, Name)</code> matches every item. <code>mat_has(x, Name)</code> is <code>true</code> when anything matched, and <code>mat_keys(Name)</code> lists the keys.</li>
<li><b>Change a pair</b> with <code>matc</code> and the mouse operator <code>"&gt;</code>: <code>matc Censor ["badword" ~&gt; "*******"] "&gt; ["badword" ~&gt; "(oops)"]</code>. The first <code>[...]</code> is the pair as it is now (key and value), the second is what it becomes. The new key and value are read right then.</li>
<li>Not to be confused with <code>mat(...)</code>, which makes a matrix: a matcher is <code>mat</code>, a name, then a colon.</li>
</ul>

<h2>Vectors and matrices</h2>
<pre>var v = &lt;| 1, 2, 3 |&gt;        # a vector: &lt;| numbers, separated by commas |&gt;
var m = [1 2; 3 4]            # a matrix: numbers with spaces, ; starts a new row
var id = identity(2)          # [1 0; 0 1]</pre>
<ul>
<li><b>Vector</b> <code>&lt;| 1, 2, 3 |&gt;</code> (or <code>vec(1, 2, 3)</code>). Read parts with <code>v[0]</code> or <code>v.x</code> <code>v.y</code> <code>v.z</code> <code>v.w</code>, count with <code>v.length</code> or <code>len(v)</code>, change with <code>v[1] = 9</code> or <code>v[1] += 5</code>, and loop with <code>for x in v:</code>.</li>
<li><b>Matrix</b> <code>[1 2; 3 4]</code> (or <code>mat([[1, 2], [3, 4]])</code>). Spaces separate the numbers, so use brackets for sums: <code>[(1 + 2) 4]</code>, and <code>[1 -2]</code> is two numbers. <code>m[1]</code> is a row (a live vector), <code>m[1][0]</code> one number, <code>m.rows</code> <code>m.cols</code> and <code>m.T</code> (the transpose) work. <code>[1, 2; 3, 4]</code> with commas is fine too, and then each part can be a full sum.</li>
<li>Plain <code>[1, 2, 3]</code> with commas and no <code>;</code> is still a normal list.</li>
</ul>
<table>
<tr><td><code>v + w</code> <code>v - w</code></td><td>Add or subtract vectors (or matrices) of the same size.</td></tr>
<tr><td><code>v * 2</code> <code>2 * v</code> <code>v / 2</code></td><td>Scale. A number with <code>+</code> or <code>-</code> goes into every slot.</td></tr>
<tr><td><code>v * w</code></td><td>Vectors multiply slot by slot. For the dot product use <code>dot(v, w)</code>.</td></tr>
<tr><td><code>m * n</code> <code>m * v</code> <code>m ** 3</code></td><td>Matrix times matrix, matrix times vector (the vector stands up as a column), and matrix power.</td></tr>
<tr><td><code>dot(v, w)</code> <code>cross(v, w)</code> <code>norm(v)</code> <code>normalize(v)</code></td><td>Dot product, cross product (3 numbers each), length, and the same direction with length 1.</td></tr>
<tr><td><code>det(m)</code> <code>inverse(m)</code> <code>transpose(m)</code> <code>trace(m)</code></td><td>Determinant, inverse, transpose, and the sum of the diagonal.</td></tr>
<tr><td><code>identity(n)</code> <code>zeros(n)</code> <code>zeros(r, c)</code></td><td>The identity matrix, a vector of zeros, and a matrix of zeros.</td></tr>
<tr><td><code>rows(m)</code> <code>cols(m)</code> <code>to_list(x)</code></td><td>Sizes, and turn a vector or matrix into plain lists.</td></tr>
<tr><td><code>v == w</code></td><td>Are they the same numbers? (Vectors and matrices cannot be compared with &lt; or &gt;.)</td></tr>
</table>
<pre>var temp m = [2 0; 0 2]
fn onstart():
    renderPT("m * &lt;| 1, 3 |&gt; = " + str(m * &lt;| 1, 3 |&gt;), line=1)     # &lt;| 2, 6 |&gt;</pre>
<p>They show up as <code>&lt;| 1, 2, 3 |&gt;</code> and <code>[1 2; 3 4]</code> in text. Saved <code>var</code>s and <code>ls_set</code> keep them. A <b>matrix</b> only holds numbers. A <b>vector</b> can hold numbers, text, true/false and variables, like a list that also does vector math: <code>&lt;| name, "hi", 3, ok |&gt;</code> (the variables <code>name</code> and <code>ok</code> are read when the vector is made). <code>+</code> <code>*</code> still work slot by slot on text (<code>+</code> joins, <code>* 3</code> repeats); the number-only tools (<code>dot</code>, <code>cross</code>, <code>norm</code>, <code>normalize</code>, matrix products) ask for numbers.</p>

<h2>Libraries: use python, use sqlite, use lua</h2>
<p>Put <code>use</code> lines at the very top of your program to load a library. They load before the program starts (you will see a loading message the first time).</p>
<pre>use sqlite
use python
use python numpy, pandas      # extra Python packages from Pyodide's list
use lua</pre>

<h3>python(code)  (Pyodide)</h3>
<pre>use python

fn onstart():
    var temp total = python("sum(range(10)) * k", k=2)     # 90
    renderPT("total = " + total, line=1)
    python("import math\\nroots = [math.sqrt(x) for x in range(4)]")
    renderPT(to_json(python("roots")), line=2)             # variables stay for the next python() call
    python("print('hello from Python')")                   # prints show up as lines</pre>
<ul>
<li><code>python("code")</code> runs the code and gives back the value of its <b>last expression</b> (numbers, text, true/false, <code>None</code> = <code>null</code>, lists, and dicts become maps). Extra <code>name=value</code> pieces become Python variables first (<code>k=2</code> above).</li>
<li>Python keeps its variables between calls while the program runs. Errors show the Python message and the line of your BitLang program.</li>
<li>The first run downloads Pyodide (about 10 MB) from the internet; after that it is cached by the browser.</li>
<li><b>Python is more powerful than BitLang</b>, so the first time you play a program that uses it you are asked to <b>Allow</b> it (you can tick "Always allow this exact program"). BitLang blocks Python's <code>js</code> module (the way into the page), but treat this as a safety net, not a wall: only allow programs you trust.</li>
</ul>

<h3>sql(query, params)  (SQLite)</h3>
<pre>use sqlite

fn onstart():
    sql("create table scores (name text, points integer)")
    sql("insert into scores values (?, ?)", ["Ann", 12])
    sql("insert into scores values ('Bob', 7)")
    var temp rows = sql("select * from scores order by points desc")
    renderPT(rows[0].name + " leads with " + rows[0].points, line=1)
    sql_save()          # keeps the database in this browser; sql_load() brings it back later</pre>
<ul>
<li><code>sql(query)</code> gives a <b>list of maps</b> for a SELECT (one map per row, columns as names) and the number of changed rows for anything else. Put <code>?</code> in the query and a list as the second value to fill them safely.</li>
<li>The database starts empty each time the program plays (it lives in memory). <code>sql_save()</code> stores it (up to 3 MB) and <code>sql_load()</code> returns <code>true</code> when it found a saved one. Use <code>name="other"</code> for more than one.</li>
<li>SQLite runs in a sealed box (sql.js), so it needs no permission.</li>
</ul>

<h3>lua(code)  (Fengari)</h3>
<pre>use lua

fn onstart():
    renderPT("sum = " + lua("local t = 0 for i = 1, n do t = t + i end return t", n=5), line=1)   # 15
    renderPT(lua("string.upper('hi')"), line=2)        # a single expression gives its value back
    lua("print('Hello from Lua!')")                     # prints show up as lines</pre>
<ul>
<li><code>lua("code")</code> runs Lua 5.3 (Fengari, a Lua written in JavaScript). Use <code>return</code> to give a value back, or pass just an expression. Tables like <code>{1, 2, 3}</code> become lists and <code>{name = "Ann"}</code> becomes a map; <code>nil</code> is <code>null</code>.</li>
<li><code>name=value</code> pieces become Lua variables first, and Lua's own variables stay between calls while the program runs.</li>
<li>Lua runs in a <b>sealed box</b>: no files, no <code>require</code>, and no way into the page or JavaScript, so it needs no permission. An endless loop is stopped for you.</li>
<li>Strings in Lua can use single quotes, which is handy inside BitLang's double quotes: <code>lua("print('hi')")</code>.</li>
</ul>

<h2>Math</h2>
<p><code>floor ceil round abs sqrt sin cos tan atan2 pow min max clamp(v, lo, hi)</code>, <code>PI</code>, <code>random()</code> (0 to 1), <code>random(a, b)</code>, <code>randint(a, b)</code>.</p>

<h2>A bigger example</h2>
<p>The Programs skill starts you with <b>Guess the number</b>: <code>onkey</code> reads the number keys, <code>renderRT</code> shows the hints, <code>btn</code> makes the New game button, and a <code>var</code> remembers your best score.</p>

<h2>If something goes wrong</h2>
<p>BitLang shows the line number and a plain-English message in the document. An endless loop is stopped for you after a moment. Programs can't touch the rest of your note or your files: they only change the document you are playing in.</p>
`;
    let docsEl = null;
    function openDocs() {
        if (docsEl && docsEl.isConnected) { docsEl.remove(); }
        docsEl = document.createElement('div');
        docsEl.className = 'bl-docs-back';
        docsEl.innerHTML = '<div class="bl-docs-dlg" role="dialog" aria-label="BitLang guide"><div class="bl-docs-head"><b>BitLang Guide</b><button type="button" class="bl-docs-x" title="Close">✕</button></div><div class="bl-docs-body">' + DOCS + '</div></div>';
        document.body.appendChild(docsEl);
        docsEl.querySelectorAll('.bl-docs-body pre').forEach(function (pr) { pr.innerHTML = pr.classList.contains('bbml') ? highlightBBML(pr.textContent) : highlight(pr.textContent); });
        const close = function () { if (docsEl) { docsEl.remove(); docsEl = null; } document.removeEventListener('keydown', onKey, true); };
        const onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
        document.addEventListener('keydown', onKey, true);
        docsEl.addEventListener('mousedown', function (e) { if (e.target === docsEl) close(); });
        docsEl.querySelector('.bl-docs-x').addEventListener('click', close);
    }

    const BL_CSS = "\n.bl-prog { display: inline-flex; align-items: center; gap: 7px; vertical-align: middle; margin: 2px 3px; padding: 3px 5px 3px 4px; border-radius: 7px; border: 1px solid #3b4a63; border-bottom-color: #0b1220; background: linear-gradient(180deg, #243247 0%, #111b2c 55%, #0b1220 100%); color: #e2e8f0; font: 700 13px/1.3 'JetBrains Mono', monospace; box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(56,189,248,0.1), 0 2px 6px rgba(2,6,23,0.4); cursor: pointer; user-select: none; white-space: nowrap; transition: filter 0.15s, box-shadow 0.15s; }\n.bl-prog:hover { filter: brightness(1.18); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(74,222,128,0.35), 0 2px 10px rgba(74,222,128,0.25); }\n.bl-prog.bl-playing { border-color: #f87171; box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 2px rgba(248,113,113,0.35), 0 2px 10px rgba(248,113,113,0.4); }\n.bl-chip-icon { width: 20px; height: 20px; border-radius: 5px; display: inline-grid; place-items: center; background: linear-gradient(180deg, #86efac 0%, #16a34a 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.4); }\n.bl-chip-icon::before { content: \"\u25b6\"; color: #052e16; font-size: 9px; margin-left: 1px; }\n.bl-prog.bl-playing .bl-chip-icon { background: linear-gradient(180deg, #fca5a5 0%, #dc2626 100%); }\n.bl-prog.bl-playing .bl-chip-icon::before { content: \"\u25a0\"; color: #450a0a; margin-left: 0; }\n.bl-chip-text { padding: 0 1px; }\n.bl-chip-text::before { content: \"</> \"; color: #38bdf8; font-weight: 800; }\n.bl-chip-text::after { content: \"\u258d\"; color: #4ade80; margin-left: 2px; animation: bl-blink 1.1s steps(1) infinite; }\n@keyframes bl-blink { 50% { opacity: 0; } }\n.bl-chip-edit { width: 21px; height: 21px; padding: 0; border-radius: 5px; border: 1px solid #475569; background: linear-gradient(180deg, #334155, #1e293b); color: #cbd5e1; font-size: 12px; line-height: 1; cursor: pointer; }\n.bl-chip-edit:hover { color: #fff; border-color: #38bdf8; }\n.bl-prog .bl-code { display: none; }\n.bl-view { position: relative; display: block; width: 100%; flex: 1 1 100%; box-sizing: border-box; min-height: 120px; }\n.bl-over-stop { position: absolute; top: 4px; right: 4px; z-index: 3; font: 800 12px 'JetBrains Mono', monospace; color: #fff; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.8); background: linear-gradient(180deg, #fca5a5 0%, #dc2626 100%); text-shadow: 0 1px 2px rgba(0,0,0,0.35); box-shadow: inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.35); cursor: pointer; }\n.bl-over-stop:hover { filter: brightness(1.1); }\n.bl-out { font-size: 15px; line-height: 1.6; }\n.bl-line { margin: 4px 0; }\n.bl-print { font-family: 'JetBrains Mono', monospace; opacity: 0.85; }\n.bl-error { color: #b91c1c; font-weight: 700; background: #fee2e2; border-radius: 6px; padding: 4px 8px; }\n.bl-skill-wait { opacity: 0.6; }\n.bl-btn { font: 800 13px 'JetBrains Mono', monospace; color: #fff; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.75); background: linear-gradient(180deg, #86efac 0%, #16a34a 100%); text-shadow: 0 1px 2px rgba(0,0,0,0.3); box-shadow: inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.25); cursor: pointer; transition: transform 0.12s, filter 0.15s; }\n.bl-ubtn { all: unset; display: inline; cursor: pointer; -webkit-tap-highlight-color: transparent; }\n.bl-ubtn:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; border-radius: 4px; }\n.bl-ubtn:hover { filter: brightness(1.08); }\n.bl-ubtn:active { filter: brightness(0.92); }\n.bl-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }\n.bl-btn:active { transform: translateY(1px); }\n.bl-cancel { background: linear-gradient(180deg, #fca5a5 0%, #dc2626 100%); }\n.bl-docs { background: linear-gradient(180deg, #ffffff 0%, #bae6fd 100%); color: #075985; text-shadow: none; }\n.bl-sp { flex: 1; }\n.bl-edit-back { position: fixed; inset: 0; z-index: 2147483000; background: rgba(15,23,42,0.6); display: grid; place-items: center; padding: 16px; backdrop-filter: blur(3px); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }\n.bl-edit-dlg { width: min(760px, 100%); max-height: 94vh; display: flex; flex-direction: column; background: #fff; color: #1e293b; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,0.4); }\n.bl-edit-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; overflow: auto; }\n.bl-edit-lbl { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 800; color: #075985; }\n.bl-edit-name { font: 14px system-ui, sans-serif; padding: 7px 10px; border: 1px solid #94a3b8; border-radius: 8px; }\n.bl-edit-foot { display: flex; gap: 8px; align-items: center; padding: 10px 16px; border-top: 1px solid #e2e8f0; background: #f1f5f9; }\n.bl-docs { background: linear-gradient(180deg, #ffffff 0%, #bae6fd 100%); color: #075985; text-shadow: none; padding: 5px 10px; }\n.bl-docs-back { position: fixed; inset: 0; z-index: 2147483000; background: rgba(15, 23, 42, 0.6); display: grid; place-items: center; padding: 16px; backdrop-filter: blur(3px); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }\n.bl-docs-dlg { width: min(860px, 100%); max-height: 92vh; display: flex; flex-direction: column; background: #fff; color: #1e293b; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,0.4); }\n.bl-docs-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; color: #fff; font-weight: 800; background: linear-gradient(180deg, #38bdf8, #0369a1); }\n.bl-docs-x { border: 0; background: rgba(255,255,255,0.22); color: #fff; width: 28px; height: 28px; border-radius: 6px; font-size: 15px; cursor: pointer; }\n.bl-docs-body { padding: 6px 22px 22px; overflow: auto; line-height: 1.55; font-size: 14px; }\n.bl-docs-body h1 { margin: 14px 0 6px; font-size: 26px; color: #0369a1; }\n.bl-docs-body h2 { margin: 22px 0 6px; font-size: 17px; color: #075985; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }\n.bl-docs-body pre { background: #0b1220; color: #e2e8f0; padding: 12px 14px; border-radius: 10px; overflow: auto; font: 12.5px/1.55 'JetBrains Mono', monospace; }\n.bl-docs-body code { font-family: 'JetBrains Mono', monospace; background: #e0f2fe; color: #075985; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }\n.bl-docs-body pre code { background: transparent; color: inherit; padding: 0; }\n.bl-docs-body table { border-collapse: collapse; width: 100%; margin: 8px 0; }\n.bl-docs-body td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }\n.bl-docs-body td:first-child { white-space: nowrap; }\n\n.bl-edit-wrap { position: relative; display: block; background: #0b1220; border: 1px solid #1d4f7a; border-radius: 10px; overflow: hidden; }\n.bl-hl, .bl-edit-code { margin: 0; border: 0; padding: 12px 14px; font: 12.5px/1.6 'JetBrains Mono', monospace; tab-size: 4; white-space: pre; letter-spacing: 0; box-sizing: border-box; width: 100%; height: 340px; }\n.bl-hl { position: absolute; inset: 0; overflow: hidden; pointer-events: none; color: #e2e8f0; }\n.bl-edit-code { position: relative; display: block; background: transparent !important; color: transparent !important; caret-color: #e2e8f0; resize: none; outline: none; overflow: auto; min-height: 0; border: 0 !important; border-radius: 0 !important; }\n.bl-edit-code::selection { background: rgba(56,189,248,0.35); color: transparent; }\n.bl-t-k { color: #f472b6; font-weight: 700; }\n.bl-t-s { color: #86efac; }\n.bl-t-n { color: #fbbf24; }\n.bl-t-c { color: #64748b; font-style: italic; }\n.bl-t-b { color: #38bdf8; }\n.bl-t-f { color: #c4b5fd; font-weight: 700; }\n.bl-t-e { color: #fde68a; font-weight: 700; }\n.bl-view { user-select: text; }\n.bl-tb { position: relative; display: inline-block; vertical-align: middle; min-width: 12em; margin: 2px 4px; }\n.bl-in { font: inherit; color: inherit; width: 100%; box-sizing: border-box; padding: 5px 10px; border: 1.5px solid rgba(100,116,139,0.55); border-radius: 8px; background: rgba(255,255,255,0.65); box-shadow: inset 0 1px 3px rgba(0,0,0,0.12); outline: none; position: relative; z-index: 1; }\n.bl-in:focus { border-color: #0284c7; box-shadow: inset 0 1px 3px rgba(0,0,0,0.12), 0 0 0 3px rgba(2,132,199,0.25); }\n.bl-ph { position: absolute; left: 11px; right: 8px; top: 50%; transform: translateY(-50%); z-index: 2; pointer-events: none; opacity: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }\n.bl-tb.bl-empty .bl-ph { opacity: 0.45; }\n.bl-tb.bl-empty .bl-in:focus + .bl-ph, .bl-tb.bl-empty:focus-within .bl-ph { opacity: 0.3; }\n.bl-ct { min-width: 0; width: 6.5em; }\n.bl-ct .bl-in { padding: 2px 6px; font-size: 0.9em; text-align: right; border-radius: 6px; }\n.bl-ct .bl-ph { left: 7px; right: 7px; text-align: right; font-size: 0.9em; }\n.bl-pt { white-space: pre-wrap; }\n.bl-prog .bl-bbml { display: none; }\n.bl-t-tag { color: #abff04; font-weight: 700; }\n.bl-seg { display: inline-flex; align-self: flex-start; margin: 2px 0 2px; vertical-align: middle; border: 1px solid #0369a1; border-radius: 999px; overflow: hidden; box-shadow: inset 0 1px 1px rgba(255,255,255,0.7); }\n.bl-seg-b { font: 800 11px 'JetBrains Mono', monospace; padding: 3px 12px; border: 0; background: linear-gradient(180deg, #ffffff, #e0f2fe); color: #075985; cursor: pointer; }\n.bl-seg-b + .bl-seg-b { border-left: 1px solid #0369a1; }\n.bl-seg-b.on { background: linear-gradient(180deg, #38bdf8, #0369a1); color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }\n.bl-seg-note { font-size: 12px; font-weight: 500; color: #334155; }\n.bl-seg-note[hidden] { display: none; }\n";
    (function () { if (document.getElementById('bitlang-style')) return; const st = document.createElement('style'); st.id = 'bitlang-style'; st.textContent = BL_CSS; document.head.appendChild(st); })();

    const BitLang = {
        parse: parse,
        Runtime: Runtime,
        BitError: BitError,
        sample: SAMPLE,
        blockHTML: blockHTML,
        hydrate: hydrate,
        compileBBML: compileBBML,
        highlightBBML: highlightBBML,
        play: play,
        stop: stop,
        docs: DOCS,
        openDocs: openDocs,
        host: null // pages set host.skill(name, opts) -> Promise<html>
    };
    window.BitLang = BitLang;
    // Programs in a page come alive on their own (Omicron pages, imported notes, exports)!
    if (document.readyState !== 'loading') hydrate(document); else document.addEventListener('DOMContentLoaded', function () { hydrate(document); });
})();
