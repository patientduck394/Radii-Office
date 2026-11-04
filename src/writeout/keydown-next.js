/* =====================================================================
   Keydown Next: three new things Keydown can do, on top of every Keydown engine (Writeout, Bitbook, Amber, OpenDB,
   Keydown.js and the Svelte components). It runs after Keydown has drawn a page: KeydownNext.apply(root).

   1. CUSTOM TAGS: invent your own tags inside the document, with CSS:
        @style ~~sale~~ { background: linear-gradient(#ff8a00, #e52e71); color: #fff; border-radius: 999px; padding: 0 10px; }
        Everything is ~~sale~~50% off~~sale~~ today!
      (a different closing tag: @style <<star <<end { … }; pseudo parts: &::before { … } and &::after { … } inside)
   2. LIVE VALUES: documents that calculate:
        {{price = 4.50}} {{qty = 3}}           set values (hidden when reading, little chips while editing)
        {{price * qty}}  {{money(price*qty)}}  show results; {{today}}, {{days_until("2026-12-25")}}...
        {{check paid}} {{counter tickets = 2}} {{slider temp = 27 from 20 to 34}}   things to click that change the totals
   3. INTERACTIVE BLOCKS: lines from ::name to ::end become something you can use:
        ::chart bar|line|pie|donut Title   (a | table | of | rows |)       ::poll Question (* options)
        ::quiz Question (* [x] right answer, * wrong ones)                   ::scene (a .zr/.glb/.gltf link, or .zr text)
        ::timer 5:00 Label   and   ::map 38.72, -9.14 13 Label   (one line each)

   Everything it makes keeps its Keydown text in data-kd-src, so Un-format and saving give the text back:
   KeydownNext.restore(root). KeydownNext.recalc(root) recomputes the live values.
   ===================================================================== */
(function (root) {
    'use strict';
    if (root.KeydownNext) return;
    const doc = root.document;
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
    const SKIP = 'pre, code, textarea, script, style, .kd-math, .katex, .kdx-block, .kdx-def, .kdx-val, .kdx-set, .kdx-input, .kd-tpl-keep, [data-kdx-skip]';
    const BLOCK = /^(DIV|P|LI|H[1-6]|BLOCKQUOTE|PRE|UL|OL|TABLE|SECTION|ARTICLE|FIGURE|HEADER|FOOTER|DL|DT|DD|FIGCAPTION|HR)$/;
    const changed = (el) => { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {} };
    const isEditing = (el) => !!(el && (el.isContentEditable || (el.closest && el.closest('[contenteditable="true"]')) || (el.querySelector && el.querySelector('[contenteditable="true"]'))));

    /* ---------- the look of everything it makes ---------- */
    function injectCss() {
        if (doc.getElementById('kdx-base-css')) return;
        const st = doc.createElement('style');
        st.id = 'kdx-base-css';
        st.textContent = [
            '.kdx-def,.kdx-set{display:none}',
            '.kdx-editing .kdx-def,.kdx-editing .kdx-set{display:inline-flex;align-items:center;gap:6px;font:600 11.5px/1.6 ui-monospace,Menlo,monospace;color:#075985;background:#e0f2fe;border:1px dashed #38bdf8;border-radius:8px;padding:0 7px;margin:1px 2px;vertical-align:middle;user-select:none}',
            '.kdx-editing div.kdx-def{display:flex;width:max-content;max-width:100%}',
            '.kdx-def-sample{font:inherit}',
            '.kdx-val{font-weight:700;color:inherit;font-variant-numeric:tabular-nums;border-bottom:1.5px dotted #38bdf8}',
            '.kdx-val.kdx-err{color:#b91c1c;border-bottom-color:#dc2626;font-weight:600}',
            '.kdx-input{display:inline-flex;align-items:center;gap:4px;vertical-align:middle;font:600 13px system-ui,sans-serif;color:#075985}',
            '.kdx-input input[type=checkbox]{width:16px;height:16px;accent-color:#0284c7;margin:0}',
            '.kdx-input input[type=range]{width:110px;accent-color:#0284c7}',
            '.kdx-input button{width:22px;height:22px;border-radius:50%;border:1px solid #0369a1;background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;font:700 14px/1 system-ui;cursor:pointer;padding:0}',
            '.kdx-input b{min-width:1.6em;text-align:center;font-variant-numeric:tabular-nums}',
            '.kdx-block{display:block;margin:10px 0;padding:12px 14px;border-radius:14px;border:1px solid rgba(2,132,199,.35);background:linear-gradient(180deg,#fff,#f0f9ff);color:#0c4a6e;font:14px/1.45 system-ui,sans-serif;box-shadow:0 4px 14px rgba(3,105,161,.12);user-select:none;max-width:640px}',
            '.kdx-block :is(button,input,select){user-select:none}',
            '.kdx-title{font-weight:800;color:#075985;margin:0 0 8px;font-size:15px}',
            '.kdx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
            '.kdx-chart svg{display:block;width:100%;height:auto}.kdx-legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:12.5px}.kdx-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}',
            '.kdx-opt{display:block;position:relative;width:100%;text-align:left;margin:5px 0;padding:7px 12px;border-radius:10px;border:1px solid rgba(2,132,199,.35);background:#fff;color:#0c4a6e;font:600 14px system-ui,sans-serif;cursor:pointer;overflow:hidden}',
            '.kdx-opt:hover{border-color:#0284c7}.kdx-opt:focus-visible{outline:3px solid #f97316;outline-offset:2px}',
            '.kdx-opt .kdx-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#bae6fd,#7dd3fc);transition:width .3s;z-index:0}',
            '.kdx-opt span{position:relative;z-index:1}.kdx-opt .kdx-n{float:right;font-variant-numeric:tabular-nums}',
            '.kdx-opt.kdx-mine{border-color:#0284c7;box-shadow:inset 3px 0 0 #0284c7}',
            '.kdx-opt.kdx-right{border-color:#16a34a;background:#f0fdf4}.kdx-opt.kdx-wrong{border-color:#dc2626;background:#fef2f2}',
            '.kdx-note{font-size:12.5px;color:#4b7a94;margin-top:6px}',
            '.kdx-timer{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.kdx-clock{font:800 30px ui-monospace,Menlo,monospace;color:#075985;font-variant-numeric:tabular-nums;min-width:4.5ch}',
            '.kdx-timer.kdx-done .kdx-clock{color:#dc2626;animation:kdx-blink 1s steps(2) 3}',
            '@keyframes kdx-blink{50%{opacity:.25}}',
            '.kdx-bar{flex-basis:100%;height:6px;border-radius:999px;background:#e0f2fe;overflow:hidden}.kdx-bar i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#0284c7);transition:width .25s linear}',
            '.kdx-btn{padding:5px 14px;border-radius:999px;border:1px solid #0369a1;background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;font:700 13px system-ui,sans-serif;cursor:pointer}',
            '.kdx-btn.kdx-ghost{background:#fff;color:#0369a1;border-color:rgba(2,132,199,.4)}',
            '.kdx-btn:focus-visible,.kdx-input button:focus-visible{outline:3px solid #f97316;outline-offset:2px}',
            '.kdx-frame{display:block;width:100%;height:280px;border:0;border-radius:10px;background:#2b2f35}',
            '.kdx-map .kdx-frame{background:#e5e7eb}',
            '.kdx-block a{color:#0369a1}',
            '@media (prefers-reduced-motion:reduce){.kdx-opt .kdx-fill,.kdx-bar i{transition:none}.kdx-timer.kdx-done .kdx-clock{animation:none}}'
        ].join('\n');
        (doc.head || doc.documentElement).appendChild(st);
    }

    /* ==================================================================
       LINES: a page, read as the lines a person typed (Keydown engines draw a line as a <div>, a <p>, a <li>,
       or a run of words ended by <br> or a newline)
       ================================================================== */
    function splitNewlines(rootEl) {
        const w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        const hits = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) if (t.nodeValue.includes('\n') && !(t.parentElement && t.parentElement.closest('pre, code, textarea, script, style, .kdx-block'))) hits.push(t);
        hits.forEach((t) => {
            const parts = t.nodeValue.split('\n');
            const frag = doc.createDocumentFragment();
            parts.forEach((p, i) => { if (i) frag.appendChild(doc.createElement('br')); if (p) frag.appendChild(doc.createTextNode(p)); });
            t.parentNode.replaceChild(frag, t);
        });
    }
    function lines(rootEl) {
        const out = [];
        let cur = null;
        const walk = (el) => {
            for (const n of Array.from(el.childNodes)) {
                if (n.nodeType === 1 && n.classList.contains('kdx-block')) { out.push({ nodes: [n], block: n, text: '', widget: true }); cur = null; continue; }
                if (n.nodeType === 1 && BLOCK.test(n.tagName)) {
                    cur = null;
                    if (n.tagName === 'UL' || n.tagName === 'OL' || n.tagName === 'TABLE' && false) { walk(n); cur = null; continue; }
                    const hasBlocks = Array.from(n.children).some((c) => BLOCK.test(c.tagName) || c.classList.contains('kdx-block'));
                    const hasBr = Array.from(n.children).some((c) => c.tagName === 'BR' && c !== n.lastChild);
                    if ((hasBlocks || hasBr) && !/^(PRE|TABLE|HR)$/.test(n.tagName)) { walk(n); cur = null; continue; }
                    out.push({ nodes: [n], block: n, text: n.tagName === 'TABLE' ? '' : n.textContent, li: n.tagName === 'LI', table: n.tagName === 'TABLE' ? n : null });
                    continue;
                }
                if (n.nodeType === 1 && n.tagName === 'BR') { if (!cur) { cur = { nodes: [], text: '' }; out.push(cur); } cur.nodes.push(n); cur = null; continue; }
                if (n.nodeType === 8) continue;
                if (!cur) { cur = { nodes: [], text: '' }; out.push(cur); }
                cur.nodes.push(n);
                cur.text += n.textContent;
            }
        };
        walk(rootEl);
        out.forEach((L) => {
            L.text = L.text.replace(/​/g, '').replace(/ /g, ' ');
            // a list item drawn as a span (Phosphor) or kept as "* " text: an item too
            if (!L.li && L.nodes[0] && L.nodes[0].nodeType === 1 && L.nodes[0].classList && L.nodes[0].classList.contains('bulleted-list')) L.li = true;
        });
        return out;
    }
    // the typed text of a line (list items get their "* " back)
    const typed = (L) => (L.li && !/^\s*\*\s/.test(L.text) ? '* ' + L.text.trim() : L.text.trim());
    function removeLine(L) {
        L.nodes.forEach((n) => {
            const p = n.parentNode;
            if (!p) return;
            p.removeChild(n);
            // an emptied list or paragraph goes too
            let q = p;
            while (q && q !== doc.body && q.childNodes.length === 0 && /^(UL|OL|P|LI|DIV)$/.test(q.tagName) && !q.hasAttribute('contenteditable') && !q.id) { const up = q.parentNode; up.removeChild(q); q = up; }
        });
    }
    function insertBefore(L, el) {
        const first = L.nodes[0];
        if (first && first.parentNode) first.parentNode.insertBefore(el, first);
    }
    // lines -> the text a person typed (for data-kd-src)
    const srcOf = (ls) => ls.map(typed).join('\n');

    /* ==================================================================
       1. CUSTOM TAGS
       ================================================================== */
    const tagRules = new Map(); // class -> css text
    function tagCssEl() {
        let st = doc.getElementById('kdx-tags-css');
        if (!st) { st = doc.createElement('style'); st.id = 'kdx-tags-css'; (doc.head || doc.documentElement).appendChild(st); }
        return st;
    }
    // only declarations survive: no rules breaking out, no outside requests, nothing pinned over the page
    function cleanDecls(s) {
        return String(s).replace(/[{}<>]/g, ' ').replace(/@import[^;]*;?/gi, '').replace(/expression\s*\(/gi, '(')
            .replace(/url\(\s*(['"]?)(?!data:image\/)[^)]*\)/gi, 'none')
            .replace(/position\s*:\s*(fixed|sticky)/gi, 'position: relative')
            .replace(/z-index\s*:\s*-?\d{3,}/gi, 'z-index: 2');
    }
    // "@style OPEN [CLOSE] { decls &::before { … } &::after { … } }" -> { open, close, cls, css }
    function parseDef(text) {
        const m = /^\s*@style\s+(\S+)(?:\s+(\S+))?\s*\{([\s\S]*)\}\s*$/.exec(text);
        if (!m) return null;
        const open = m[1], close = m[2] && m[2] !== '{' ? m[2] : m[1];
        let body = m[3];
        const parts = {};
        body = body.replace(/&\s*(::?(?:before|after)|:hover)\s*\{([^{}]*)\}/gi, (x, which, decls) => { parts[which.replace(/^:+/, '').toLowerCase()] = cleanDecls(decls); return ''; });
        const cls = 'kdx-t-' + hash(open + '|' + close + '|' + m[3]);
        let css = '.' + cls + '{' + cleanDecls(body) + '}';
        if (parts.before !== undefined) css += '.' + cls + '::before{content:"";' + parts.before + '}';
        if (parts.after !== undefined) css += '.' + cls + '::after{content:"";' + parts.after + '}';
        if (parts.hover !== undefined) css += '.' + cls + ':hover{' + parts.hover + '}';
        if ((parts.before !== undefined || parts.after !== undefined) && !/position\s*:/.test(body)) css += '.' + cls + '{position:relative}';
        return { open, close, cls, css };
    }
    function useDef(d) {
        if (!tagRules.has(d.cls)) { tagRules.set(d.cls, d.css); tagCssEl().textContent = Array.from(tagRules.values()).join('\n'); }
    }
    // the definitions on the page: whole lines starting with @style (a long one can run over several lines)
    function collectDefs(rootEl, editing) {
        const defs = [];
        // already made: just read them back
        rootEl.querySelectorAll('.kdx-def[data-kd-src]').forEach((el) => { const d = parseDef(el.getAttribute('data-kd-src')); if (d) { defs.push(d); useDef(d); } });
        const ls = lines(rootEl);
        for (let i = 0; i < ls.length; i++) {
            const t = ls[i].text.trim();
            if (!/^@style\s/.test(t)) continue;
            let j = i, text = t, depth = (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
            while (depth > 0 && j + 1 < ls.length && j - i < 40) { j++; const u = ls[j].text.trim(); text += '\n' + u; depth += (u.match(/\{/g) || []).length - (u.match(/\}/g) || []).length; }
            const d = parseDef(text);
            if (!d) continue;
            useDef(d);
            defs.push(d);
            const block = !!ls[i].block;
            const el = doc.createElement(block ? 'div' : 'span');
            el.className = 'kdx kdx-def';
            el.setAttribute('contenteditable', 'false');
            el.setAttribute('data-kd-src', text);
            el.innerHTML = '@style <span class="kdx-def-sample ' + d.cls + '">' + esc(d.open) + '</span>';
            el.title = 'A custom Keydown tag: ' + d.open + 'text' + d.close;
            insertBefore(ls[i], el);
            for (let k = i; k <= j; k++) removeLine(ls[k]);
            i = j;
        }
        return defs;
    }
    // wrap OPEN…CLOSE runs inside one line (they may hold other formatting, like **bold**)
    function applyTags(rootEl, defs) {
        if (!defs.length) return 0;
        let n = 0;
        lines(rootEl).forEach((L) => {
            if (L.widget) return;
            const container = L.block || null;
            for (const d of defs) {
                let guard = 0;
                while (guard++ < 50) {
                    const map = textMap(L, container);
                    const s = map.text;
                    const a = s.indexOf(d.open);
                    if (a < 0) break;
                    const b = s.indexOf(d.close, a + d.open.length);
                    if (b < 0) break;
                    const r0 = map.at(a), r1 = map.at(a + d.open.length), r2 = map.at(b), r3 = map.at(b + d.close.length);
                    if (!r0 || !r3) break;
                    // take the closing tag out first (so the earlier positions stay right), then the inside, then the opening tag
                    const cut = (p, q) => { const r = doc.createRange(); r.setStart(p.node, p.offset); r.setEnd(q.node, q.offset); r.deleteContents(); };
                    const inner = doc.createRange(); inner.setStart(r1.node, r1.offset); inner.setEnd(r2.node, r2.offset);
                    const span = doc.createElement('span');
                    span.className = 'kdx-tag ' + d.cls;
                    span.setAttribute('data-kd-open', d.open);
                    span.setAttribute('data-kd-close', d.close);
                    span.appendChild(inner.extractContents());
                    inner.insertNode(span);
                    // the markers: the text right after the span begins with CLOSE, right before it ends with OPEN
                    const after = span.nextSibling, before = span.previousSibling;
                    if (after && after.nodeType === 3 && after.nodeValue.startsWith(d.close)) after.nodeValue = after.nodeValue.slice(d.close.length);
                    if (before && before.nodeType === 3 && before.nodeValue.endsWith(d.open)) before.nodeValue = before.nodeValue.slice(0, -d.open.length);
                    n++;
                    if (container == null) L.nodes = Array.from(new Set(L.nodes.filter((x) => x.parentNode).concat([span])));
                }
            }
        });
        return n;
    }
    // a line's text and where each character lives (text nodes only, outside things that must not change)
    function textMap(L, container) {
        const texts = [];
        const pushText = (node) => {
            if (node.nodeType === 3) { if (!(node.parentElement && node.parentElement.closest(SKIP))) texts.push(node); return; }
            if (node.nodeType !== 1 || node.matches(SKIP)) return;
            const w = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let t = w.nextNode(); t; t = w.nextNode()) if (!(t.parentElement && t.parentElement.closest(SKIP))) texts.push(t);
        };
        if (container) pushText(container); else L.nodes.forEach((n) => { if (n.parentNode) pushText(n); });
        let text = '';
        const starts = texts.map((t) => { const s = text.length; text += t.nodeValue; return s; });
        return {
            text,
            at(pos) {
                for (let i = texts.length - 1; i >= 0; i--) if (pos >= starts[i]) return { node: texts[i], offset: Math.min(pos - starts[i], texts[i].nodeValue.length) };
                return texts[0] ? { node: texts[0], offset: 0 } : null;
            }
        };
    }

    /* ==================================================================
       2. LIVE VALUES: a small, safe expression language (no eval)
       ================================================================== */
    function tokenize(s) {
        const out = [];
        const re = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_][\w]*)|(==|!=|<=|>=|&&|\|\||[-+*/%^(),<>!?:×÷]))/gy;
        let m, i = 0;
        s = String(s);
        while (i < s.length) {
            re.lastIndex = i;
            m = re.exec(s);
            if (!m || m.index !== i) { if (/^\s*$/.test(s.slice(i))) break; throw new Error('I could not read "' + s.slice(i).trim().slice(0, 12) + '"'); }
            i = re.lastIndex;
            if (m[1]) out.push({ t: 'num', v: parseFloat(m[1]) });
            else if (m[2]) out.push({ t: 'str', v: m[2].slice(1, -1).replace(/\\(.)/g, '$1') });
            else if (m[3]) out.push({ t: 'id', v: m[3] });
            else if (m[4]) out.push({ t: 'op', v: m[4] === '×' ? '*' : m[4] === '÷' ? '/' : m[4] });
        }
        return out;
    }
    const pad2 = (n) => String(n).padStart(2, '0');
    const dayMs = 86400000;
    const dateOf = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s).trim()); if (!m) throw new Error('Dates look like "2026-12-25"'); return new Date(+m[1], +m[2] - 1, +m[3]); };
    const midnight = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
    const num = (v) => { const n = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v); if (isNaN(n)) throw new Error('"' + v + '" is not a number'); return n; };
    const FUNCS = {
        round: (x, d) => { const k = Math.pow(10, d ? num(d) : 0); return Math.round(num(x) * k) / k; },
        floor: (x) => Math.floor(num(x)), ceil: (x) => Math.ceil(num(x)), abs: (x) => Math.abs(num(x)), sqrt: (x) => Math.sqrt(num(x)),
        pow: (a, b) => Math.pow(num(a), num(b)), min: (...a) => Math.min(...a.map(num)), max: (...a) => Math.max(...a.map(num)),
        sum: (...a) => a.reduce((s, x) => s + num(x), 0), avg: (...a) => (a.length ? a.reduce((s, x) => s + num(x), 0) / a.length : 0),
        money: (x, sym) => (sym === undefined ? '' : String(sym)) + num(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        fixed: (x, d) => num(x).toFixed(d === undefined ? 2 : num(d)),
        percent: (x, d) => (num(x) * 100).toFixed(d === undefined ? 0 : num(d)) + '%',
        if: (c, a, b) => (c && c !== '0' ? a : b),
        upper: (s) => String(s).toUpperCase(), lower: (s) => String(s).toLowerCase(),
        today: () => new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        now: () => { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); },
        year: () => new Date().getFullYear(),
        weekday: () => new Date().toLocaleDateString(undefined, { weekday: 'long' }),
        days_until: (s) => Math.round((dateOf(s) - midnight()) / dayMs),
        days_since: (s) => Math.round((midnight() - dateOf(s)) / dayMs),
        pi: () => Math.PI
    };
    const BARE = new Set(['today', 'now', 'year', 'weekday', 'pi']);
    function parseExpr(src) {
        const T = tokenize(src);
        let i = 0;
        const peek = () => T[i], take = () => T[i++];
        const isOp = (v) => T[i] && T[i].t === 'op' && T[i].v === v;
        const expect = (v) => { if (!isOp(v)) throw new Error('A "' + v + '" is missing'); i++; };
        function ternary() { const c = or(); if (isOp('?')) { i++; const a = ternary(); expect(':'); const b = ternary(); return { k: '?', c, a, b }; } return c; }
        function bin(next, ops) { return function () { let l = next(); while (T[i] && T[i].t === 'op' && ops.includes(T[i].v)) { const op = take().v; l = { k: 'bin', op, l, r: next() }; } return l; }; }
        function power() { const b = unary(); if (isOp('^')) { i++; return { k: 'bin', op: '^', l: b, r: power() }; } return b; }
        function unary() { if (isOp('-')) { i++; return { k: 'neg', e: unary() }; } if (isOp('+')) { i++; return unary(); } if (isOp('!')) { i++; return { k: 'not', e: unary() }; } return primary(); }
        function primary() {
            const t = take();
            if (!t) throw new Error('Something is missing at the end');
            if (t.t === 'num') return { k: 'num', v: t.v };
            if (t.t === 'str') return { k: 'str', v: t.v };
            if (t.t === 'op' && t.v === '(') { const e = ternary(); expect(')'); return e; }
            if (t.t === 'id') {
                if (t.v === 'true' || t.v === 'false') return { k: 'num', v: t.v === 'true' ? 1 : 0 };
                if (isOp('(')) { i++; const args = []; if (!isOp(')')) { do { args.push(ternary()); } while (isOp(',') && ++i); } expect(')'); return { k: 'call', f: t.v, args }; }
                return { k: 'var', v: t.v };
            }
            throw new Error('"' + t.v + '" is out of place');
        }
        const mul = bin(power, ['*', '/', '%']), add = bin(mul, ['+', '-']), cmp = bin(add, ['<', '>', '<=', '>=']), eq = bin(cmp, ['==', '!=']), and = bin(eq, ['&&']);
        const or = bin(and, ['||']);
        const e = ternary();
        if (i < T.length) throw new Error('"' + T[i].v + '" is out of place');
        return e;
    }
    function evaluate(e, vars) {
        switch (e.k) {
            case 'num': case 'str': return e.v;
            case 'var':
                if (Object.prototype.hasOwnProperty.call(vars, e.v)) return vars[e.v];
                if (BARE.has(e.v)) return FUNCS[e.v]();
                throw new Error('"' + e.v + '" has no value yet');
            case 'neg': return -num(evaluate(e.e, vars));
            case 'not': { const v = evaluate(e.e, vars); return v && v !== '0' ? 0 : 1; }
            case '?': { const c = evaluate(e.c, vars); return c && c !== '0' ? evaluate(e.a, vars) : evaluate(e.b, vars); }
            case 'call': {
                const f = FUNCS[e.f];
                if (!f || !Object.prototype.hasOwnProperty.call(FUNCS, e.f)) throw new Error('There is no "' + e.f + '()"');
                return f(...e.args.map((a) => evaluate(a, vars)));
            }
            case 'bin': {
                const l = evaluate(e.l, vars), r = evaluate(e.r, vars);
                switch (e.op) {
                    case '+': return typeof l === 'string' || typeof r === 'string' ? String(l) + String(r) : num(l) + num(r);
                    case '-': return num(l) - num(r); case '*': return num(l) * num(r);
                    case '/': { if (num(r) === 0) throw new Error('Dividing by zero'); return num(l) / num(r); }
                    case '%': return num(l) % num(r); case '^': return Math.pow(num(l), num(r));
                    case '<': return num(l) < num(r) ? 1 : 0; case '>': return num(l) > num(r) ? 1 : 0;
                    case '<=': return num(l) <= num(r) ? 1 : 0; case '>=': return num(l) >= num(r) ? 1 : 0;
                    case '==': return l == r ? 1 : 0; case '!=': return l != r ? 1 : 0; // eslint-disable-line eqeqeq
                    case '&&': return l && l !== '0' ? r : l; case '||': return l && l !== '0' ? l : r;
                }
            }
        }
        throw new Error('I could not work that out');
    }
    const show = (v) => (typeof v === 'number' ? (isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }) : '∞') : String(v));
    // what is inside {{ }}: a setting, a display, or something to click
    function readLive(inner) {
        const s = inner.trim();
        let m;
        if ((m = /^check\s+([A-Za-z_]\w*)(?:\s*=\s*(true|false|1|0))?(?:\s+(.+))?$/.exec(s))) return { kind: 'check', name: m[1], value: m[2] === 'true' || m[2] === '1' ? 1 : 0, label: m[3] || '' };
        if ((m = /^counter\s+([A-Za-z_]\w*)(?:\s*=\s*(-?\d+(?:\.\d+)?))?(?:\s+step\s+(\d+(?:\.\d+)?))?$/.exec(s))) return { kind: 'counter', name: m[1], value: m[2] ? parseFloat(m[2]) : 0, step: m[3] ? parseFloat(m[3]) : 1 };
        if ((m = /^slider\s+([A-Za-z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?)\s+from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)(?:\s+step\s+(\d+(?:\.\d+)?))?$/.exec(s))) return { kind: 'slider', name: m[1], value: parseFloat(m[2]), min: parseFloat(m[3]), max: parseFloat(m[4]), step: m[5] ? parseFloat(m[5]) : 1 };
        if ((m = /^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/.exec(s))) { const e = parseExpr(m[2]); return { kind: 'set', name: m[1], expr: e }; }
        return { kind: 'show', expr: parseExpr(s) };
    }
    // is this {{…}} a live value (and not one of OpenDB's {{templates}})?
    function looksLive(inner, names) {
        const s = inner.trim();
        if (/^(check|counter|slider)\s/.test(s)) return true;
        if (/^[a-z][a-z ]*(\|.*)?$/i.test(s) && !/^[A-Za-z_]\w*$/.test(s)) return false; // "citation needed", "main|x": templates
        if (/^[A-Za-z_]\w*$/.test(s)) return names.has(s) || BARE.has(s);
        try { readLive(s); return true; } catch (e) { return /[=+\-*/()\d"]/.test(s); }
    }
    function liveSpan(inner, editing) {
        const src = '{{' + inner.trim() + '}}';
        let L = null, err = '';
        try { L = readLive(inner); } catch (e) { err = e.message; }
        const el = doc.createElement('span');
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-kd-src', src);
        if (!L) { el.className = 'kdx kdx-val kdx-err'; el.textContent = src; el.title = err; return el; }
        if (L.kind === 'show') { el.className = 'kdx kdx-val'; el.textContent = '…'; return el; }
        if (L.kind === 'set') { el.className = 'kdx kdx-set'; el.textContent = L.name + ' = …'; return el; }
        el.className = 'kdx kdx-input kdx-' + L.kind;
        el.setAttribute('data-kdx-name', L.name);
        const id = 'kdx-' + L.name + '-' + Math.random().toString(36).slice(2, 7);
        if (L.kind === 'check') el.innerHTML = '<input type="checkbox" id="' + id + '"' + (L.value ? ' checked' : '') + '>' + (L.label ? '<label for="' + id + '">' + esc(L.label) + '</label>' : '');
        else if (L.kind === 'counter') el.innerHTML = '<button type="button" aria-label="Less ' + esc(L.name) + '">−</button><b aria-live="polite">' + show(L.value) + '</b><button type="button" aria-label="More ' + esc(L.name) + '">+</button>';
        else el.innerHTML = '<input type="range" min="' + L.min + '" max="' + L.max + '" step="' + L.step + '" value="' + L.value + '" aria-label="' + esc(L.name) + '"><b aria-live="polite">' + show(L.value) + '</b>';
        return el;
    }
    // {{…}} written as plain text, or drawn by Keydown as a template chip (span.kd-tpl / OpenDB's tpl-unknown)
    function makeLive(rootEl, editing) {
        // the names that get values, so a bare {{price}} is known to be live
        const names = new Set();
        const scan = (s) => { for (const m of String(s).matchAll(/\{\{\s*(?:check\s+|counter\s+|slider\s+)?([A-Za-z_]\w*)\s*=/g)) names.add(m[1]); for (const m of String(s).matchAll(/\{\{\s*(?:check|counter|slider)\s+([A-Za-z_]\w*)/g)) names.add(m[1]); };
        scan(rootEl.textContent);
        rootEl.querySelectorAll('[data-kd-tpl]').forEach((el) => scan('{{' + el.getAttribute('data-kd-tpl') + '}}'));
        rootEl.querySelectorAll('.kdx-set[data-kd-src], .kdx-input[data-kd-src]').forEach((el) => scan(el.getAttribute('data-kd-src')));
        let n = 0;
        rootEl.querySelectorAll('span.kd-tpl[data-kd-tpl], .tpl-unknown').forEach((el) => {
            const inner = el.hasAttribute('data-kd-tpl') ? el.getAttribute('data-kd-tpl') : el.textContent.replace(/^\{\{|\}\}$/g, '');
            if (!looksLive(inner, names)) return;
            el.replaceWith(liveSpan(inner, editing)); n++;
        });
        const w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        const hits = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) if (t.nodeValue.includes('{{') && !(t.parentElement && t.parentElement.closest(SKIP))) hits.push(t);
        hits.forEach((t) => {
            const s = t.nodeValue, re = /\{\{([^{}]+)\}\}/g;
            let m, last = 0, any = false;
            const frag = doc.createDocumentFragment();
            while ((m = re.exec(s))) {
                if (!looksLive(m[1], names)) continue;
                any = true;
                frag.appendChild(doc.createTextNode(s.slice(last, m.index)));
                frag.appendChild(liveSpan(m[1], editing));
                last = re.lastIndex; n++;
            }
            if (!any) return;
            frag.appendChild(doc.createTextNode(s.slice(last)));
            t.parentNode.replaceChild(frag, t);
        });
        return n;
    }
    // work every value out again: settings in page order (a few passes, so order does not matter), then the displays
    function recalc(rootEl) {
        const vars = {};
        rootEl.querySelectorAll('.kdx-input[data-kdx-name]').forEach((el) => {
            const name = el.getAttribute('data-kdx-name');
            if (el.classList.contains('kdx-check')) vars[name] = el.querySelector('input').checked ? 1 : 0;
            else if (el.classList.contains('kdx-slider')) vars[name] = parseFloat(el.querySelector('input').value);
            else vars[name] = parseFloat(el.getAttribute('data-kdx-value') || readLive(el.getAttribute('data-kd-src').slice(2, -2)).value);
        });
        const sets = Array.from(rootEl.querySelectorAll('.kdx-set[data-kd-src]')).map((el) => { try { return { el, L: readLive(el.getAttribute('data-kd-src').slice(2, -2)) }; } catch (e) { return { el, err: e.message }; } });
        for (let pass = 0; pass < 6; pass++) {
            let progress = false;
            sets.forEach((s) => {
                if (!s.L || s.done) return;
                try { vars[s.L.name] = evaluate(s.L.expr, vars); s.done = true; s.err = ''; progress = true; } catch (e) { s.err = e.message; }
            });
            if (!progress) break;
        }
        sets.forEach((s) => {
            const name = s.L ? s.L.name : '?';
            s.el.textContent = name + ' = ' + (s.done ? show(vars[name]) : '?');
            s.el.title = s.err || '';
            s.el.classList.toggle('kdx-err', !!s.err && !s.done);
        });
        rootEl.querySelectorAll('.kdx-val[data-kd-src]').forEach((el) => {
            try { const L = readLive(el.getAttribute('data-kd-src').slice(2, -2)); el.textContent = show(evaluate(L.expr, vars)); el.classList.remove('kdx-err'); el.title = el.getAttribute('data-kd-src'); }
            catch (e) { el.textContent = el.getAttribute('data-kd-src'); el.classList.add('kdx-err'); el.title = e.message; }
        });
        return vars;
    }
    // the things to click: they change their own Keydown text too, so the page saves what was clicked
    function wireInputs(rootEl, editing) {
        rootEl.querySelectorAll('.kdx-input[data-kdx-name]').forEach((el) => {
            if (el._kdx) return;
            el._kdx = true;
            const L = readLive(el.getAttribute('data-kd-src').slice(2, -2));
            const write = (v) => {
                let src;
                if (L.kind === 'check') src = '{{check ' + L.name + (v ? ' = true' : '') + (L.label ? ' ' + L.label : '') + '}}';
                else if (L.kind === 'counter') src = '{{counter ' + L.name + ' = ' + v + (L.step !== 1 ? ' step ' + L.step : '') + '}}';
                else src = '{{slider ' + L.name + ' = ' + v + ' from ' + L.min + ' to ' + L.max + (L.step !== 1 ? ' step ' + L.step : '') + '}}';
                el.setAttribute('data-kd-src', src);
                recalc(rootEl);
                if (editing) changed(el);
            };
            if (L.kind === 'check') el.querySelector('input').addEventListener('change', (e) => write(e.target.checked ? 1 : 0));
            else if (L.kind === 'slider') el.querySelector('input').addEventListener('input', (e) => { el.querySelector('b').textContent = show(parseFloat(e.target.value)); write(parseFloat(e.target.value)); });
            else {
                let v = L.value;
                el.setAttribute('data-kdx-value', v);
                const [less, more] = el.querySelectorAll('button');
                const step = (d) => { v = Math.round((v + d) * 1e6) / 1e6; el.setAttribute('data-kdx-value', v); el.querySelector('b').textContent = show(v); write(v); };
                less.addEventListener('click', (e) => { e.preventDefault(); step(-L.step); });
                more.addEventListener('click', (e) => { e.preventDefault(); step(L.step); });
            }
            // a click in an editor must not move the caret into the page or start a drag
            el.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
        });
    }

    /* ==================================================================
       3. INTERACTIVE BLOCKS
       ================================================================== */
    const NS = 'http://www.w3.org/2000/svg';
    const PALETTE = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#64748b'];
    function rowsOf(ls) {
        const rows = [];
        ls.forEach((L) => {
            if (L.table) { L.table.querySelectorAll('tr').forEach((tr) => rows.push(Array.from(tr.children).map((c) => c.textContent.trim()))); return; }
            const t = L.text.trim();
            if (!t || /^\|?\s*:?-{2,}/.test(t)) return;
            rows.push(t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        });
        return rows;
    }
    const numOf = (s) => { const v = parseFloat(String(s).replace(/[^\d.\-]/g, '')); return isNaN(v) ? 0 : v; };
    function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
    function chartHtml(kind, title, rows) {
        if (rows.length < 2) return '<div class="kdx-note">A chart needs a | table | of | rows |: the first row names the columns, the others hold the numbers!</div>';
        const head = rows[0], data = rows.slice(1);
        const series = head.slice(1).length ? head.slice(1) : ['Value'];
        const labels = data.map((r) => r[0]);
        const vals = data.map((r) => series.map((_, j) => numOf(r[j + 1])));
        const W = 480, H = 260, L = 44, B = 34, T = 12, R = 12;
        let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc((title ? title + ': ' : '') + kind + ' chart') + '">';
        if (kind === 'pie' || kind === 'donut') {
            const v = vals.map((r) => Math.max(0, r[0])), total = v.reduce((a, b) => a + b, 0) || 1;
            let a0 = -Math.PI / 2;
            const cx = W / 2, cy = H / 2, r = 108, ir = kind === 'donut' ? 58 : 0;
            v.forEach((x, i) => {
                const a1 = a0 + (x / total) * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0;
                const p = (a, rr) => (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
                const d = x >= total ? 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0' :
                    'M' + p(a0, r) + 'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + p(a1, r) + (ir ? 'L' + p(a1, ir) + 'A' + ir + ' ' + ir + ' 0 ' + big + ' 0 ' + p(a0, ir) : 'L' + cx + ' ' + cy) + 'Z';
                svg += '<path d="' + d + '" fill="' + PALETTE[i % PALETTE.length] + '" stroke="#fff" stroke-width="2"' + (ir && x >= total ? ' fill-rule="evenodd"' : '') + '><title>' + esc(labels[i] + ': ' + show(x) + ' (' + Math.round((x / total) * 100) + '%)') + '</title></path>';
                a0 = a1;
            });
            if (ir) svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ir + '" fill="#fff"/><text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-size="18" font-weight="800" fill="#075985">' + esc(show(total)) + '</text>';
            svg += '</svg><div class="kdx-legend">' + labels.map((l, i) => '<span><i style="background:' + PALETTE[i % PALETTE.length] + '"></i>' + esc(l) + '</span>').join('') + '</div>';
        } else {
            const all = vals.flat(), max = niceMax(Math.max(0, ...all)), min = Math.min(0, ...all);
            const y = (v) => T + (H - T - B) * (1 - (v - min) / ((max - min) || 1));
            for (let k = 0; k <= 4; k++) { const v = min + ((max - min) * k) / 4, yy = y(v); svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="#e0f2fe"/><text x="' + (L - 6) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#4b7a94">' + esc(show(v)) + '</text>'; }
            const slot = (W - L - R) / Math.max(1, labels.length);
            labels.forEach((l, i) => { svg += '<text x="' + (L + slot * i + slot / 2).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="11.5" fill="#0c4a6e">' + esc(String(l).slice(0, 14)) + '</text>'; });
            if (kind === 'line' || kind === 'area') {
                series.forEach((sName, j) => {
                    const pts = vals.map((r, i) => [L + slot * i + slot / 2, y(r[j])]);
                    const col = PALETTE[j % PALETTE.length];
                    if (kind === 'area') svg += '<path d="M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'L' + pts[pts.length - 1][0].toFixed(1) + ' ' + y(Math.max(0, min)).toFixed(1) + 'L' + pts[0][0].toFixed(1) + ' ' + y(Math.max(0, min)).toFixed(1) + 'Z" fill="' + col + '" fill-opacity=".18"/>';
                    svg += '<polyline points="' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
                    pts.forEach((p, i) => { svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" fill="#fff" stroke="' + col + '" stroke-width="2.5"><title>' + esc(labels[i] + ', ' + sName + ': ' + show(vals[i][j])) + '</title></circle>'; });
                });
            } else {
                const gw = slot * 0.72, bw = gw / series.length;
                vals.forEach((r, i) => r.forEach((v, j) => {
                    const x = L + slot * i + (slot - gw) / 2 + bw * j, y0 = y(Math.max(0, min)), y1 = y(v);
                    svg += '<rect x="' + x.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + Math.max(1, bw - 3).toFixed(1) + '" height="' + Math.abs(y0 - y1).toFixed(1) + '" rx="4" fill="' + PALETTE[j % PALETTE.length] + '"><title>' + esc(labels[i] + ', ' + series[j] + ': ' + show(v)) + '</title></rect>';
                }));
            }
            svg += '</svg>' + (series.length > 1 ? '<div class="kdx-legend">' + series.map((s, j) => '<span><i style="background:' + PALETTE[j % PALETTE.length] + '"></i>' + esc(s) + '</span>').join('') + '</div>' : '');
        }
        // the same numbers as a table, for screen readers
        const table = '<table class="kdx-sr"><caption>' + esc(title || 'Chart') + '</caption><tr>' + head.map((h) => '<th>' + esc(h) + '</th>').join('') + '</tr>' + data.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</table>';
        return svg + table;
    }
    // poll and quiz options: "* text", "* [x] text" (the right answer), "* text [3]" (votes so far)
    function optionsOf(ls) {
        return ls.map(typed).filter((t) => /^\*\s+/.test(t)).map((t) => {
            let s = t.replace(/^\*\s+/, '');
            let right = false, votes = 0, m;
            if ((m = /^\[(x|X| )\]\s*/.exec(s))) { right = m[1] !== ' '; s = s.slice(m[0].length); }
            if ((m = /\s*\[(\d+)\]\s*$/.exec(s))) { votes = parseInt(m[1], 10); s = s.slice(0, m.index); }
            return { text: s, right, votes };
        });
    }
    function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) {} return null; }
    function buildPoll(el, head, opts, editing) {
        const key = 'kdx-poll-' + hash(head + '|' + opts.map((o) => o.text).join('|'));
        const draw = () => {
            const mine = store(key);
            const total = opts.reduce((s, o) => s + o.votes, 0);
            el.innerHTML = '<div class="kdx-title">' + esc(head || 'Poll') + '</div>' + opts.map((o, i) => {
                const pct = total ? Math.round((o.votes / total) * 100) : 0;
                return '<button type="button" class="kdx-opt' + (String(i) === mine ? ' kdx-mine' : '') + '" data-i="' + i + '" aria-pressed="' + (String(i) === mine) + '"><span class="kdx-fill" style="width:' + (mine !== null ? pct : 0) + '%"></span><span>' + esc(o.text) + '</span>' + (mine !== null ? '<span class="kdx-n">' + o.votes + ' · ' + pct + '%</span>' : '') + '</button>';
            }).join('') + '<div class="kdx-note" role="status">' + (mine !== null ? total + ' vote' + (total === 1 ? '' : 's') + '! Click another answer to change yours!' : 'Pick an answer to vote and see the results!') + (editing ? '' : ' (Votes made here are kept in this browser.)') + '</div>';
        };
        el.addEventListener('click', (e) => {
            const b = e.target.closest('.kdx-opt');
            if (!b) return;
            e.preventDefault();
            const i = +b.dataset.i, mine = store(key);
            if (String(i) === mine) return;
            if (mine !== null && opts[+mine]) opts[+mine].votes = Math.max(0, opts[+mine].votes - 1);
            opts[i].votes++;
            store(key, String(i));
            // in an editor the votes are written into the poll's own text, so they are saved with the document
            if (editing) { el.setAttribute('data-kd-src', '::poll ' + head + '\n' + opts.map((o) => '* ' + o.text + (o.votes ? ' [' + o.votes + ']' : '')).join('\n') + '\n::end'); changed(el); }
            draw();
            const again = el.querySelector('.kdx-opt[data-i="' + i + '"]'); if (again) again.focus();
        });
        draw();
    }
    function buildQuiz(el, head, opts) {
        let picked = -1;
        const draw = () => {
            const right = opts.findIndex((o) => o.right);
            el.innerHTML = '<div class="kdx-title">' + esc(head || 'Quiz') + '</div>' + opts.map((o, i) => {
                const cls = picked < 0 ? '' : o.right ? ' kdx-right' : i === picked ? ' kdx-wrong' : '';
                return '<button type="button" class="kdx-opt' + cls + '" data-i="' + i + '"' + (picked >= 0 ? ' aria-disabled="true"' : '') + '><span>' + esc(o.text) + '</span>' + (picked >= 0 && o.right ? '<span class="kdx-n">✓</span>' : picked === i && !o.right ? '<span class="kdx-n">✗</span>' : '') + '</button>';
            }).join('') + '<div class="kdx-note" role="status">' + (picked < 0 ? (right < 0 ? 'Mark the right answer with [x], like "* [x] Lisbon"!' : 'Pick an answer!') : opts[picked].right ? 'Right!' : 'Not quite! The right answer is “' + esc(opts[right] ? opts[right].text : '?') + '”!') + '</div>' +
                (picked >= 0 ? '<button type="button" class="kdx-btn kdx-ghost" data-act="again">Try again</button>' : '');
        };
        el.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            e.preventDefault();
            if (b.dataset.act === 'again') { picked = -1; draw(); el.querySelector('.kdx-opt')?.focus(); return; }
            if (picked >= 0) return;
            picked = +b.dataset.i; draw();
            el.querySelector('[data-act="again"]')?.focus();
        });
        draw();
    }
    function parseTime(s) {
        s = String(s || '').trim();
        let m;
        if ((m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s))) return m[3] !== undefined ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
        if ((m = /^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h)?$/i.exec(s))) { const v = parseFloat(m[1]), u = (m[2] || 'm').toLowerCase(); return Math.round(u[0] === 's' ? v : u[0] === 'h' ? v * 3600 : v * 60); }
        return 300;
    }
    const clock = (t) => { t = Math.max(0, Math.ceil(t)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s); };
    function buildTimer(el, arg) {
        const parts = String(arg || '').trim().split(/\s+/);
        const total = parseTime(parts[0]), label = parts.slice(1).join(' ');
        let left = total, run = null, last = 0;
        el.classList.add('kdx-timer-block');
        el.innerHTML = '<div class="kdx-timer">' + (label ? '<div class="kdx-title" style="flex-basis:100%;margin:0">' + esc(label) + '</div>' : '') + '<span class="kdx-clock" role="timer" aria-live="off">' + clock(total) + '</span><button type="button" class="kdx-btn" data-act="go">Start</button><button type="button" class="kdx-btn kdx-ghost" data-act="reset">Reset</button><div class="kdx-bar" aria-hidden="true"><i style="width:100%"></i></div><span class="kdx-sr" role="status"></span></div>';
        const face = el.querySelector('.kdx-clock'), go = el.querySelector('[data-act="go"]'), bar = el.querySelector('.kdx-bar i'), say = el.querySelector('[role="status"]'), box = el.querySelector('.kdx-timer');
        const paint = () => { face.textContent = clock(left); bar.style.width = (left / total) * 100 + '%'; };
        const stop = () => { cancelAnimationFrame(run); run = null; go.textContent = left > 0 ? 'Start' : 'Start'; };
        const tick = (t) => {
            if (!el.isConnected) { stop(); return; }
            left -= (t - last) / 1000; last = t;
            if (left <= 0) { left = 0; paint(); stop(); box.classList.add('kdx-done'); say.textContent = (label || 'Timer') + ' is done!'; beep(); return; }
            paint(); run = requestAnimationFrame(tick);
        };
        el.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            e.preventDefault();
            if (b.dataset.act === 'reset') { stop(); left = total; box.classList.remove('kdx-done'); paint(); go.textContent = 'Start'; return; }
            if (run) { stop(); go.textContent = 'Start'; return; }
            if (left <= 0) { left = total; box.classList.remove('kdx-done'); }
            last = performance.now(); run = requestAnimationFrame(tick); go.textContent = 'Pause';
        });
    }
    function beep() {
        try {
            const A = new (root.AudioContext || root.webkitAudioContext)();
            [0, 0.28, 0.56].forEach((d) => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, A.currentTime + d); g.gain.exponentialRampToValueAtTime(0.2, A.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + d + 0.2); o.connect(g).connect(A.destination); o.start(A.currentTime + d); o.stop(A.currentTime + d + 0.22); });
        } catch (e) {}
    }
    function buildMap(el, arg) {
        const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s+(\d{1,2}))?(?:\s+(.*))?$/.exec(arg || '');
        if (!m) { el.innerHTML = '<div class="kdx-note">Write ::map with a place\'s latitude and longitude, like <code>::map 38.72, -9.14 13 Lisbon</code>!</div>'; return; }
        const lat = Math.max(-85, Math.min(85, +m[1])), lon = Math.max(-180, Math.min(180, +m[2])), z = Math.max(1, Math.min(19, +(m[3] || 13))), label = m[4] || '';
        const dx = 360 / Math.pow(2, z) * 0.9, dy = dx * 0.55;
        const src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + [lon - dx, lat - dy, lon + dx, lat + dy].map((v) => v.toFixed(5)).join('%2C') + '&layer=mapnik&marker=' + lat + '%2C' + lon;
        el.innerHTML = (label ? '<div class="kdx-title">' + esc(label) + '</div>' : '') + '<iframe class="kdx-frame" title="' + esc('Map' + (label ? ' of ' + label : '')) + '" loading="lazy" referrerpolicy="no-referrer" src="' + src + '"></iframe>' +
            '<div class="kdx-note"><a href="https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=' + z + '/' + lat + '/' + lon + '" target="_blank" rel="noopener noreferrer">Open the bigger map</a> · map data © OpenStreetMap contributors</div>';
    }
    // a 3D view in a sandboxed frame (three.js from a CDN, like ZoneriderView): the scene text, or a link to one
    function buildScene(el, head, body) {
        const src = body.trim();
        const link = /^https?:\/\/\S+$/.test(src) ? src : '';
        let data = null;
        if (!link) { try { data = JSON.parse(src); } catch (e) { el.innerHTML = '<div class="kdx-title">' + esc(head || '3D scene') + '</div><div class="kdx-note">Put a Zonerider scene (.zr text) or a link to a .zr, .glb or .gltf file between ::scene and ::end!</div>'; return; } }
        const T = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
        const payload = JSON.stringify({ link, data }).replace(/</g, '\\u003c');
        const page = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:#2b2f35}canvas{display:block;width:100%;height:100%;touch-action:none}#m{position:absolute;left:8px;bottom:6px;font:12px system-ui;color:#c5ff11}</style>' +
            '<script type="importmap">' + JSON.stringify({ imports: { three: T + '/build/three.module.min.js', 'three/addons/': T + '/examples/jsm/' } }) + '<\/script></head><body><canvas id="c"></canvas><div id="m">Loading…</div><script type="application/json" id="d">' + payload + '<\/script><script type="module">' +
            'import*as THREE from"three";import{OrbitControls}from"three/addons/controls/OrbitControls.js";import{RoomEnvironment}from"three/addons/environments/RoomEnvironment.js";import{GLTFLoader}from"three/addons/loaders/GLTFLoader.js";' +
            'const D=JSON.parse(document.getElementById("d").textContent),M=document.getElementById("m"),c=document.getElementById("c");' +
            'const P={cube:p=>new THREE.BoxGeometry(p.width??2,p.height??2,p.depth??2),sphere:p=>new THREE.SphereGeometry(p.radius??1,p.widthSegments??32,p.heightSegments??16),icosphere:p=>new THREE.IcosahedronGeometry(p.radius??1,p.detail??2),cylinder:p=>new THREE.CylinderGeometry(p.radiusTop??1,p.radiusBottom??1,p.height??2,p.radialSegments??32),cone:p=>new THREE.ConeGeometry(p.radius??1,p.height??2,p.radialSegments??32),torus:p=>new THREE.TorusGeometry(p.radius??1,p.tube??.3,p.radialSegments??16,p.tubularSegments??48),torusknot:p=>new THREE.TorusKnotGeometry(p.radius??1,p.tube??.3,p.tubularSegments??128,p.radialSegments??16,p.p??2,p.q??3),plane:p=>new THREE.PlaneGeometry(p.width??2,p.depth??2).rotateX(-Math.PI/2),capsule:p=>new THREE.CapsuleGeometry(p.radius??.6,p.length??1.2,8,24)};' +
            'const r=new THREE.WebGLRenderer({canvas:c,antialias:true});r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;' +
            'const s=new THREE.Scene();s.background=new THREE.Color("#2b2f35");s.environment=new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(),.04).texture;s.add(new THREE.HemisphereLight(16777215,4473924,.6));s.add(new THREE.GridHelper(20,20,0x5a6270,0x40454d));' +
            'const cam=new THREE.PerspectiveCamera(45,1,.05,2000);cam.position.set(7,5,8);const ctl=new OrbitControls(cam,c);ctl.enableDamping=true;ctl.autoRotate=true;ctl.autoRotateSpeed=.8;c.addEventListener("pointerdown",()=>{ctl.autoRotate=false});' +
            'const g=new THREE.Group();s.add(g);' +
            'function frame(){const b=new THREE.Box3().setFromObject(g);if(b.isEmpty())return;const m=b.getCenter(new THREE.Vector3()),rr=Math.max(.5,b.getSize(new THREE.Vector3()).length()/2);ctl.target.copy(m);cam.position.copy(m).add(new THREE.Vector3(1,.7,1.15).normalize().multiplyScalar(rr/Math.sin(cam.fov*Math.PI/360)*.85));ctl.update();}' +
            'function zr(d){if(d.format!=="zonerider"||!d.scene)throw new Error("not a Zonerider scene");const o=new THREE.ObjectLoader().parse(d.scene);o.traverse(x=>{const z=x.userData.zr;if(x.isMesh&&z&&z.prim&&P[z.prim]){x.geometry.dispose();x.geometry=P[z.prim](z.params||{})}if(x.isLight)x.intensity=(x.userData.zrIntensity??x.intensity)*.35;if(x.userData.zrHidden)x.visible=false});const bg=d.settings&&d.settings.world&&d.settings.world.bg;if(bg)s.background=new THREE.Color(bg);g.add(o)}' +
            'try{if(D.link){if(/\\.(glb|gltf)(\\?|$)/i.test(D.link)){const gl=await new GLTFLoader().loadAsync(D.link);g.add(gl.scene)}else{zr(await(await fetch(D.link)).json())}}else zr(D.data);frame();M.textContent="Drag to turn, scroll to zoom!"}catch(e){M.textContent="Could not show the scene: "+e.message}' +
            'const sz=()=>{r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/Math.max(1,innerHeight);cam.updateProjectionMatrix()};addEventListener("resize",sz);sz();r.setAnimationLoop(()=>{ctl.update();r.render(s,cam)});' +
            '<\/script></body></html>';
        el.innerHTML = '<div class="kdx-title">' + esc(head || '3D scene') + '</div>';
        const f = doc.createElement('iframe');
        f.className = 'kdx-frame';
        f.title = head || '3D scene';
        f.setAttribute('sandbox', 'allow-scripts');
        f.srcdoc = page;
        el.appendChild(f);
    }
    // a block, from its Keydown text
    function buildBlock(src, editing) {
        const L = src.split('\n');
        const m = /^::(\w+)\s*(.*)$/.exec(L[0].trim());
        const kind = m[1].toLowerCase(), arg = m[2] || '';
        const bodyLines = L.slice(1, L[L.length - 1].trim() === '::end' ? -1 : undefined);
        const el = doc.createElement('div');
        el.className = 'kdx kdx-block kdx-' + kind;
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-kd-src', src);
        const fakeLines = bodyLines.map((t) => ({ text: t, li: false }));
        if (kind === 'chart') {
            const am = /^(bar|line|area|pie|donut)?\s*(.*)$/i.exec(arg.trim());
            const type = (am[1] || 'bar').toLowerCase();
            el.innerHTML = (am[2] ? '<div class="kdx-title">' + esc(am[2]) + '</div>' : '') + chartHtml(type, am[2], rowsOf(fakeLines));
        } else if (kind === 'poll') buildPoll(el, arg.trim(), optionsOf(fakeLines), editing);
        else if (kind === 'quiz') buildQuiz(el, arg.trim(), optionsOf(fakeLines));
        else if (kind === 'timer') buildTimer(el, arg);
        else if (kind === 'map') buildMap(el, arg);
        else if (kind === 'scene') buildScene(el, arg.trim(), bodyLines.join('\n'));
        return el;
    }
    const MULTI = /^::(chart|poll|quiz|scene)\b/i, SINGLE = /^::(timer|map)\b/i;
    function makeBlocks(rootEl, editing) {
        let n = 0;
        // blocks made before (a saved page, or a second pass): drawn again from their text, so they work
        rootEl.querySelectorAll('.kdx-block[data-kd-src]').forEach((old) => {
            if (old._kdx) return;
            const fresh = buildBlock(old.getAttribute('data-kd-src'), editing);
            fresh._kdx = true;
            old.replaceWith(fresh);
        });
        const ls = lines(rootEl);
        for (let i = 0; i < ls.length; i++) {
            const t = ls[i].text.trim();
            if (ls[i].widget || !t.startsWith('::')) continue;
            if (SINGLE.test(t)) {
                const el = buildBlock(t, editing); el._kdx = true;
                insertBefore(ls[i], el); removeLine(ls[i]); n++;
                continue;
            }
            if (!MULTI.test(t)) continue;
            let j = i + 1;
            while (j < ls.length && ls[j].text.trim() !== '::end' && j - i < 400) j++;
            if (j >= ls.length) continue; // not closed yet (still being typed)
            const src = [t].concat(ls.slice(i + 1, j).map((L) => (L.table ? Array.from(L.table.querySelectorAll('tr')).map((tr) => '| ' + Array.from(tr.children).map((c) => c.textContent.trim()).join(' | ') + ' |').join('\n') : typed(L)))).concat(['::end']).join('\n');
            const el = buildBlock(src, editing); el._kdx = true;
            insertBefore(ls[i], el);
            for (let k = i; k <= j; k++) removeLine(ls[k]);
            n++;
            i = j;
        }
        return n;
    }

    /* ==================================================================
       apply / restore
       ================================================================== */
    function apply(rootEl, opts) {
        if (!rootEl || !rootEl.nodeType) return { tags: 0, values: 0, blocks: 0 };
        opts = opts || {};
        injectCss();
        const editing = opts.editing !== undefined ? !!opts.editing : isEditing(rootEl);
        rootEl.classList.toggle('kdx-editing', editing);
        if (!editing) splitNewlines(rootEl);
        const blocks = makeBlocks(rootEl, editing);
        const defs = collectDefs(rootEl, editing);
        const tags = applyTags(rootEl, defs);
        const values = makeLive(rootEl, editing);
        wireInputs(rootEl, editing);
        if (rootEl.querySelector('.kdx-val, .kdx-set')) recalc(rootEl);
        return { tags, values, blocks };
    }
    // everything back to its Keydown text (for Un-format, saving and Source view); returns how many were turned back
    function restoreTags(rootEl) {
        let n = 0;
        rootEl.querySelectorAll('.kdx-tag[data-kd-open]').forEach((el) => {
            el.insertBefore(doc.createTextNode(el.getAttribute('data-kd-open')), el.firstChild);
            el.appendChild(doc.createTextNode(el.getAttribute('data-kd-close')));
            el.replaceWith(...Array.from(el.childNodes));
            n++;
        });
        return n;
    }
    function restore(rootEl) {
        if (!rootEl || !rootEl.querySelectorAll) return 0;
        let n = restoreTags(rootEl);
        rootEl.querySelectorAll('[data-kd-src].kdx').forEach((el) => {
            const src = el.getAttribute('data-kd-src');
            if (el.tagName === 'DIV' && src.includes('\n')) {
                // one line each, the way the page around it keeps its lines
                const frag = doc.createDocumentFragment();
                src.split('\n').forEach((t) => { const d = doc.createElement('div'); d.textContent = t; frag.appendChild(d); });
                el.replaceWith(frag);
            } else if (el.tagName === 'DIV') { const d = doc.createElement('div'); d.textContent = src; el.replaceWith(d); }
            else el.replaceWith(doc.createTextNode(src));
            n++;
        });
        if (rootEl.normalize) rootEl.normalize();
        return n;
    }

    root.KeydownNext = { apply, restore, recalc, evaluate: (s, vars) => evaluate(parseExpr(s), vars || {}), parseDef, version: '1.0.0', FUNCS: Object.keys(FUNCS) };

    // Writeout, Bitbook and Amber: the new things are made after Enter, after Re-format and when a page opens,
    // and Un-format / saving as text give their Keydown back
    function hookDocEngine() {
        const kd = root.kdDoc;
        if (!kd || kd.__kdxHooked) return;
        kd.__kdxHooked = true;
        const origFormat = kd.formatLine, origRe = kd.reformat, origUn = kd.unformat, origToText = kd.htmlToText;
        if (origFormat) kd.formatLine = function (canvas) { const r = origFormat.apply(this, arguments); setTimeout(() => { try { apply(canvas, { editing: true }); } catch (e) { console.warn('[KeydownNext]', e); } }, 0); return r; };
        if (origRe) kd.reformat = function (box) { const r = origRe.apply(this, arguments); try { const a = apply(box, { editing: isEditing(box) || box.id === 'wysiwyg-canvas' }); if (r && typeof r === 'object') r.formatted = (r.formatted || 0) + a.tags + a.values + a.blocks; } catch (e) { console.warn('[KeydownNext]', e); } return r; };
        if (origUn) kd.unformat = function (box) { const n = restore(box); const r = origUn.apply(this, arguments); return (typeof r === 'number' ? r : 0) + n; };
        // (keydown-doc saves every .kdx[data-kd-src] as its own text; only custom-tag spans need their tags put back first)
        if (origToText) kd.htmlToText = function (html) {
            if (typeof html === 'string' && html.includes('data-kd-open')) { const box = doc.createElement('div'); box.innerHTML = html; restoreTags(box); html = box.innerHTML; }
            return origToText.call(this, html);
        };
    }
    hookDocEngine();
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', hookDocEngine); else setTimeout(hookDocEngine, 0);
    // a Writeout or Bitbook page: its saved blocks and values come back to life when it opens
    function wakeEditors() {
        const c = doc.getElementById('wysiwyg-canvas');
        if (c && c.querySelector('.kdx, [data-kd-tpl]')) apply(c, { editing: true });
    }
    if (doc.readyState === 'complete') setTimeout(wakeEditors, 600); else root.addEventListener('load', () => setTimeout(wakeEditors, 600));
})(typeof window !== 'undefined' ? window : this);
