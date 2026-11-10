/* =====================================================================
   Writeout More! A batch of everyday writing tools:
     Symbols          a picker for arrows, math, Greek, currency, punctuation and shapes (click to insert)
     Quick Parts      save the selected text (with its formatting) and drop it back in with one click
     Lorem Ipsum      filler paragraphs for layouts
     Captions         "Figure 1: ...", "Table 2: ..." under a picture or table, numbered for you
     Table of Figures a clickable list of every caption (and an Update button)
     Sort Lines       A to Z or Z to A for the selected paragraphs or list items
     Superscript and Subscript
     AutoCorrect      -- becomes a dash, (c) becomes a copyright sign, 1/2 becomes a half, and more
                      (off until you turn it on in Review, and it never touches code)
   Loaded after writeout-plus.js!
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed) return;
    const OS = window.OfficeShell || null;
    const toast = function (m) { try { if (OS) OS.toast(m); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const rid = function () { return Math.random().toString(36).slice(2, 9); };
    const save = function () { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} };
    const dialog = function (title, body, buttons, opts) { return OS ? OS.dialog(title, body, buttons, opts) : Promise.resolve(null); };
    const store = {
        get: function (k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    };

    /* ---------- the caret, remembered while a dialog has focus ---------- */
    let saved = null;
    function remember() {
        const s = window.getSelection();
        if (s && s.rangeCount && ed.contains(s.getRangeAt(0).commonAncestorContainer)) saved = s.getRangeAt(0).cloneRange();
        return saved;
    }
    function restore() {
        ed.focus();
        if (!saved) return false;
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved);
        return true;
    }
    function insertHTML(html) {
        restore();
        if (!document.queryCommandSupported || !document.execCommand('insertHTML', false, html)) {
            const s = window.getSelection();
            if (s.rangeCount) { const r = s.getRangeAt(0); r.deleteContents(); const t = document.createElement('template'); t.innerHTML = html; r.insertNode(t.content); }
        }
        save();
    }
    function insertText(text) {
        restore();
        if (!document.execCommand('insertText', false, text)) insertHTML(esc(text));
        save();
    }
    const blockOf = function (n) {
        let x = n && n.nodeType === 3 ? n.parentNode : n;
        while (x && x !== ed && !/^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE|TABLE|FIGURE|UL|OL)$/.test(x.tagName)) x = x.parentNode;
        return x && x !== ed ? x : null;
    };

    /* ---------- symbols ---------- */
    const SYMBOLS = [
        ['Common', '© ® ™ § ¶ † ‡ • · … ‰ ° ′ ″ № ¿ ¡ « » ‹ › “ ” ‘ ’ – — ‐ ‑ ‒ ※ ✓ ✗ ✔ ✘ ★ ☆ ♥ ♦ ♠ ♣ ☀ ☁ ☂ ☎ ✉ ✂ ✎'],
        ['Arrows', '← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇐ ⇒ ⇑ ⇓ ⇔ ⇕ ↩ ↪ ↺ ↻ ➔ ➜ ➤ ➥ ⟵ ⟶ ⟷ ↦ ↤ ⤴ ⤵'],
        ['Math', '± × ÷ ≈ ≠ ≡ ≤ ≥ ≪ ≫ ∞ √ ∛ ∑ ∏ ∫ ∂ ∆ ∇ ∈ ∉ ⊂ ⊃ ∪ ∩ ∧ ∨ ¬ ∀ ∃ ∅ ∝ ∴ ∵ ⊥ ∥ ∠ ½ ⅓ ⅔ ¼ ¾ ⅛ ² ³ ⁿ ₀ ₁ ₂ ₃'],
        ['Greek', 'α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω Α Β Γ Δ Ε Ζ Η Θ Λ Ξ Π Σ Φ Ψ Ω'],
        ['Currency', '$ ¢ £ ¤ ¥ € ₹ ₽ ₩ ₪ ₫ ₱ ₺ ₿ ฿ ₴ ₦ ₡ ₲ ₵'],
        ['Letters', 'à á â ã ä å æ ç è é ê ë ì í î ï ñ ò ó ô õ ö ø œ ù ú û ü ý ÿ ß À Á Â Ã Ä Å Æ Ç È É Ê Ë Ñ Ö Ø Œ Ü ð þ'],
        ['Shapes', '■ □ ▪ ▫ ▲ △ ▼ ▽ ◆ ◇ ○ ● ◎ ◐ ◑ ◯ ▶ ◀ ▷ ◁ ❖ ✦ ✧ ✪ ✿ ❀ ❁ ♪ ♫ ♩ ♬ ☮ ☯ ☺ ☹ ⚠ ⚡ ⚑ ⚐']
    ];
    async function symbols() {
        remember();
        const wrap = document.createElement('div');
        let tab = 0;
        const draw = function () {
            wrap.innerHTML = '<div class="wo-sym-tabs" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + SYMBOLS.map(function (g, i) { return '<button type="button" class="os-dlg-btn' + (i === tab ? ' primary' : '') + '" data-t="' + i + '">' + g[0] + '</button>'; }).join('') + '</div>' +
                '<div class="wo-sym-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:4px;max-height:300px;overflow:auto">' + SYMBOLS[tab][1].split(' ').map(function (c) { return '<button type="button" data-s="' + esc(c) + '" title="Insert ' + esc(c) + '" style="font-size:20px;line-height:1;height:38px;border:1px solid rgba(128,128,128,.35);border-radius:8px;background:transparent;color:inherit;cursor:pointer">' + esc(c) + '</button>'; }).join('') + '</div>' +
                '<p style="margin:10px 0 0;font-size:12px;opacity:.7">Click a symbol to put it in your text, then keep clicking for more!</p>';
        };
        draw();
        wrap.addEventListener('mousedown', function (e) { if (e.target.closest('[data-s]')) e.preventDefault(); });
        wrap.addEventListener('click', function (e) {
            const t = e.target.closest('[data-t]'); if (t) { tab = Number(t.dataset.t); draw(); return; }
            const s = e.target.closest('[data-s]'); if (s) { insertText(s.dataset.s); remember(); }
        });
        await dialog('Symbols', wrap, [{ label: 'Done', value: true, primary: true }]);
    }

    /* ---------- Quick Parts ---------- */
    const QP_KEY = 'writeout_quickparts_v1';
    const parts = function () { const a = store.get(QP_KEY, []); return Array.isArray(a) ? a : []; };
    function quickPartsMenu() {
        remember();
        const items = [{ label: 'Save selection as a Quick Part...', icon: 'plus', run: saveQuickPart }];
        parts().forEach(function (p) {
            items.push({ label: p.name, icon: 'notes', run: function () { insertHTML(p.html); toast('Quick Part added!'); } });
        });
        if (parts().length) items.push({ label: 'Delete a Quick Part...', icon: 'trash', run: deleteQuickPart });
        else items.push({ label: 'Nothing saved yet! Select some text and save it', icon: 'info', run: function () {} });
        return items;
    }
    async function saveQuickPart() {
        const r = remember();
        if (!r || r.collapsed) { toast('Select the text you want to save first!'); return; }
        const box = document.createElement('div'); box.appendChild(r.cloneContents());
        const html = box.innerHTML;
        const name = OS ? await OS.prompt('Save Quick Part', 'Name', (box.textContent || '').trim().slice(0, 30), 'Save') : null;
        if (!name || !name.trim()) return;
        const a = parts().filter(function (p) { return p.name !== name.trim(); });
        a.push({ name: name.trim().slice(0, 60), html: html });
        store.set(QP_KEY, a);
        toast('Saved! Find it under Insert, then Quick Parts!');
    }
    async function deleteQuickPart() {
        const a = parts(); if (!a.length) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = '<label class="os-field"><span>Quick Part</span><select class="os-dlg-input">' + a.map(function (p, i) { return '<option value="' + i + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label>';
        const v = await dialog('Delete a Quick Part', wrap, [{ label: 'Cancel', value: null }, { label: 'Delete', danger: true, primary: true, value: function (b) { return b.querySelector('select').value; } }]);
        if (v === null) return;
        a.splice(Number(v), 1); store.set(QP_KEY, a); toast('Deleted!');
    }

    /* ---------- Lorem Ipsum ---------- */
    const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
    function lorem(paras) {
        let i = 0; const out = [];
        for (let p = 0; p < paras; p++) {
            const sents = [];
            for (let s = 0; s < 4 + (p % 3); s++) {
                const n = 8 + ((p * 5 + s * 3) % 9), w = [];
                for (let k = 0; k < n; k++) w.push(WORDS[i++ % WORDS.length]);
                w[0] = w[0].charAt(0).toUpperCase() + w[0].slice(1);
                sents.push(w.join(' ') + '.');
            }
            out.push('<p>' + sents.join(' ') + '</p>');
        }
        return out.join('');
    }
    function loremMenu() {
        remember();
        return [1, 3, 5].map(function (n) { return { label: n + (n === 1 ? ' paragraph' : ' paragraphs') + ' of Lorem Ipsum', icon: 'lines', run: function () { insertHTML(lorem(n)); } }; });
    }

    /* ---------- captions and the table of figures ---------- */
    const KINDS = ['Figure', 'Table', 'Equation', 'Chart'];
    const capStyle = 'text-align:center;font-style:italic;font-size:.9em;margin:.4em 0 1em';
    function renumber() {
        const count = {};
        [].forEach.call(ed.querySelectorAll('p.wo-caption'), function (p) {
            const k = p.dataset.kind || 'Figure'; count[k] = (count[k] || 0) + 1;
            const n = p.querySelector('.wo-cap-n'); if (n) n.textContent = k + ' ' + count[k];
        });
    }
    async function caption(kind) {
        const r = remember();
        let target = r ? blockOf(r.startContainer) : null;
        if (r && r.startContainer.nodeType === 1) { const c = r.startContainer.childNodes[r.startOffset]; if (c && /^(IMG|TABLE|FIGURE)$/.test(c.tagName)) target = c; }
        const wrap = document.createElement('div');
        wrap.innerHTML = '<label class="os-field"><span>' + kind + ' caption</span><input class="os-dlg-input" spellcheck="false" placeholder="What the ' + kind.toLowerCase() + ' shows"></label>';
        const text = await dialog('Insert Caption', wrap, [{ label: 'Cancel', value: null }, { label: 'Add Caption', primary: true, value: function (b) { return b.querySelector('input').value.trim(); } }]);
        if (text === null) return;
        const id = 'wo-cap-' + rid();
        const html = '<p class="wo-caption" id="' + id + '" data-kind="' + kind + '" style="' + capStyle + '"><b class="wo-cap-n">' + kind + '</b>' + (text ? ': <span class="wo-cap-t">' + esc(text) + '</span>' : '<span class="wo-cap-t"></span>') + '</p>';
        if (target && target !== ed) {
            const t = document.createElement('template'); t.innerHTML = html;
            const top = target.closest('table, figure') || target;
            top.parentNode.insertBefore(t.content, top.nextSibling);
        } else insertHTML(html);
        renumber(); save();
        toast(kind + ' caption added!');
    }
    function captionMenu() {
        remember();
        return KINDS.map(function (k) { return { label: k + ' caption...', icon: 'tag', run: function () { caption(k); } }; });
    }
    function tofHTML(kind) {
        const caps = [].filter.call(ed.querySelectorAll('p.wo-caption'), function (p) { return (p.dataset.kind || 'Figure') === kind; });
        if (!caps.length) return '<p><i>No ' + kind.toLowerCase() + ' captions yet!</i></p>';
        return caps.map(function (p) {
            const n = p.querySelector('.wo-cap-n'), t = p.querySelector('.wo-cap-t');
            return '<p style="margin:.2em 0"><a href="#' + p.id + '">' + esc((n ? n.textContent : kind) + (t && t.textContent ? ': ' + t.textContent : '')) + '</a></p>';
        }).join('');
    }
    function tofMenu() {
        remember();
        const items = ['Figure', 'Table'].map(function (k) {
            return { label: 'Table of ' + k + 's', icon: 'lines', run: function () { insertHTML('<div class="wo-tof" data-kind="' + k + '"><p><b>' + k + 's</b></p>' + tofHTML(k) + '</div><p><br></p>'); } };
        });
        items.push({ label: 'Update Tables of Figures', icon: 'reset', run: function () {
            renumber();
            [].forEach.call(ed.querySelectorAll('.wo-tof'), function (d) { const k = d.dataset.kind || 'Figure'; d.innerHTML = '<p><b>' + k + 's</b></p>' + tofHTML(k); });
            save(); toast('Updated!');
        } });
        return items;
    }

    /* ---------- sort lines ---------- */
    function sortLines(desc) {
        const s = window.getSelection();
        const kb = window.KdBlockEditor;
        const r = (kb && kb.virtualRange && kb.virtualRange()) || (s.rangeCount ? s.getRangeAt(0) : null);
        if (!r) { toast('Select some paragraphs or list items first (Ctrl+A or Shift+arrows)!'); return; }
        const LINE = 'li, p, h1, h2, h3, h4, h5, h6, div';
        const lineOf = function (n) { let x = n.nodeType === 3 ? n.parentNode : n; const l = x.closest && x.closest(LINE); return l && l !== ed && ed.contains(l) ? l : null; };
        const edge = function (c, o, end) { if (c.nodeType === 1 && c.childNodes.length) { const k = c.childNodes[Math.max(0, Math.min(c.childNodes.length - 1, end ? o - 1 : o))]; return k || c; } return c; };
        const a = lineOf(edge(r.startContainer, r.startOffset, false)), b = lineOf(edge(r.endContainer, r.endOffset, true));
        if (!a || !b || a === b || a.parentNode !== b.parentNode) { toast('Select two or more neighbouring lines to sort!'); return; }
        const kids = [].slice.call(a.parentNode.children);
        const i = kids.indexOf(a), j = kids.indexOf(b);
        const run = kids.slice(Math.min(i, j), Math.max(i, j) + 1);
        const keyOf = function (el) { return (el.textContent || '').trim().toLowerCase(); };
        const sorted = run.slice().sort(function (x, y) { const c = keyOf(x).localeCompare(keyOf(y), undefined, { numeric: true }); return desc ? -c : c; });
        const anchor = run[run.length - 1].nextSibling, parent = a.parentNode;
        sorted.forEach(function (el) { parent.insertBefore(el, anchor); });
        save(); toast(sorted.length + ' lines sorted ' + (desc ? 'Z to A' : 'A to Z') + '!');
    }

    /* ---------- AutoCorrect ---------- */
    const AC_KEY = 'writeout_autocorrect_v1';
    let acOn = store.get(AC_KEY, false) === true;
    const FIXES = [
        [/(^|[^-])--$/, '$1—'], [/\.\.\.$/, '…'], [/\(c\)$/i, '©'], [/\(r\)$/i, '®'], [/\(tm\)$/i, '™'],
        [/(^|\s)->$/, '$1→'], [/(^|\s)<-$/, '$1←'], [/(^|\s)1\/2$/, '$1½'], [/(^|\s)1\/4$/, '$1¼'], [/(^|\s)3\/4$/, '$1¾'],
        [/(^|[\s(])i$/, '$1I'], [/(^|[\s(])i'(m|ll|ve|d)$/, '$1I\'$2']
    ];
    ed.addEventListener('input', function (e) {
        if (!acOn || e.inputType !== 'insertText' || e.data !== ' ') return;
        const s = window.getSelection();
        if (!s.rangeCount || !s.isCollapsed) return;
        const node = s.anchorNode, off = s.anchorOffset;
        if (!node || node.nodeType !== 3 || off < 2) return;
        const el = node.parentElement;
        if (!el || el.closest('code, pre, .kd-code, .katex, .wo-docmeta')) return;
        const lock = el.closest('[contenteditable="false"]');
        if (lock && lock !== ed && ed.contains(lock)) return;   // (the canvas itself is read-only glue under the Block Editor)
        const before = node.data.slice(0, off - 1);
        for (let i = 0; i < FIXES.length; i++) {
            const m = FIXES[i][0].exec(before);
            if (!m) continue;
            const fixed = before.replace(FIXES[i][0], FIXES[i][1]);
            node.data = fixed + node.data.slice(off - 1);
            const r = document.createRange(); r.setStart(node, fixed.length + 1); r.collapse(true); s.removeAllRanges(); s.addRange(r);
            save();
            break;
        }
    });
    function setAutoCorrect(v) { acOn = !!v; store.set(AC_KEY, acOn); toast(acOn ? 'AutoCorrect is on! Try typing -- or (c) and a space!' : 'AutoCorrect is off!'); }

    /* ---------- superscript and subscript ---------- */
    function script(kind) { ed.focus(); document.execCommand(kind, false, null); save(); }

    /* ---------- small caps, emphasis dots and dimming (the built-in Keydown tags {sc} {dots} {dim}) ---------- */
    // Inline marks (small caps, dots, dim, code, tooltip underline) work on a selection AND at the caret: with nothing selected, the mark opens
    // empty (holding one zero-width character) and the next words you type go inside it; pressing the button again steps out of it
    const ZW = '\u200b', ours = new WeakSet();
    function inMark(sel, n) { const el = n && (n.nodeType === 3 ? n.parentElement : n); const hit = el && el.closest ? el.closest(sel) : null; return hit && ed.contains(hit) ? hit : null; }
    function toggleMark(sel, make) {
        const KB = window.KdBlockEditor;
        if (KB && KB.virtualRange && KB.virtualRange()) { toast('Select text inside one line for this!'); return false; }
        ed.focus();
        const s = window.getSelection();
        if (!s.rangeCount || !ed.contains(s.anchorNode)) { toast('Click in the text first!'); return false; }
        const r = s.getRangeAt(0);
        const on = inMark(sel, r.startContainer);
        if (on) {
            if (r.collapsed) {   // step out of it
                const tail = document.createTextNode(ZW); ours.add(tail);
                on.parentNode.insertBefore(tail, on.nextSibling);
                const nr = document.createRange(); nr.setStart(tail, 1); nr.collapse(true); s.removeAllRanges(); s.addRange(nr);
            } else {             // take it off
                const frag = document.createDocumentFragment();
                while (on.firstChild) frag.appendChild(on.firstChild);
                const last = frag.lastChild; on.replaceWith(frag);
                if (last) { const rr = document.createRange(); rr.selectNodeContents(last); s.removeAllRanges(); s.addRange(rr); }
            }
            save(); return true;
        }
        const el = make();
        if (r.collapsed) {
            const z = document.createTextNode(ZW); ours.add(z); el.appendChild(z);
            r.insertNode(el);
            const nr = document.createRange(); nr.setStart(z, 1); nr.collapse(true); s.removeAllRanges(); s.addRange(nr);
        } else {
            try { r.surroundContents(el); } catch (e) { el.appendChild(r.extractContents()); r.insertNode(el); }
            s.removeAllRanges(); const rr = document.createRange(); rr.selectNodeContents(el); s.addRange(rr);
        }
        save(); return true;
    }
    // the zero-width character only holds the caret open: once there are real letters next to it, drop it (and keep the caret where it was)
    ed.addEventListener('input', function () {
        const s = window.getSelection();
        if (!s.rangeCount) return;
        const n = s.anchorNode;
        if (!n || n.nodeType !== 3 || !ours.has(n) || n.data.length < 2 || n.data.indexOf(ZW) < 0) return;
        const off = s.anchorOffset, idx = n.data.indexOf(ZW);
        n.data = n.data.replace(ZW, '');
        const nr = document.createRange(); nr.setStart(n, Math.max(0, off - (idx < off ? 1 : 0))); nr.collapse(true); s.removeAllRanges(); s.addRange(nr);
    });
    function emphasis(kind) {
        const KN = window.KeydownNext;
        const def = KN && KN.builtins && KN.builtins.filter(function (d) { return d.cls === 'kdx-t-' + kind; })[0];
        if (!def) { toast('Emphasis needs Keydown Next, and it did not load!'); return; }
        KN.useDef(def);
        toggleMark('.' + def.cls, function () {
            const span = document.createElement('span');
            span.className = 'kdx-tag ' + def.cls; span.setAttribute('data-kd-open', def.open); span.setAttribute('data-kd-close', def.close);
            return span;
        });
    }
    function code() { return toggleMark('code', function () { return document.createElement('code'); }); }
    function codeActive() { const s = window.getSelection(); return !!(s.rangeCount && ed.contains(s.anchorNode) && inMark('code', s.anchorNode)); }

    /* ---------- Tooltip Underline: {tip red dashed|Tooltip text}words{/tip} ---------- */
    async function tooltipDialog() {
        const KN = window.KeydownNext;
        if (!KN || !KN.tipSpan) { toast('Tooltip Underline needs Keydown Next, and it did not load!'); return; }
        remember();
        const sel = window.getSelection();
        const existing = sel.rangeCount ? inMark('.kdx-tipu', sel.getRangeAt(0).startContainer) : null;
        let cur = { color: 'blue', style: 'straight', text: '' };
        if (existing) { cur = KN.parseTip((existing.getAttribute('data-kd-open') || '').replace(/^\{tip|\|.*$/g, '')); cur.text = existing.getAttribute('data-tip') || ''; }
        const STY = [['straight', 'Straight'], ['rounded', 'Rounded'], ['dashed', 'Dashed'], ['rounddash', 'Rounded dash'], ['dotted', 'Dotted']];
        const wrap = document.createElement('div');
        const draw = function () {
            wrap.innerHTML = '<label class="os-field"><span>Tooltip text</span><input class="os-dlg-input" id="tip-text" spellcheck="true" maxlength="200" placeholder="What shows when someone points at the words"></label>' +
                '<div style="font-weight:700;margin:10px 0 6px">Color</div><div style="display:flex;flex-wrap:wrap;gap:6px">' +
                Object.keys(KN.BAR_COLORS).map(function (n) { return '<button type="button" data-c="' + n + '" title="' + n + '" style="width:28px;height:28px;border-radius:50%;border:3px solid ' + (cur.color === n ? 'currentColor' : 'transparent') + ';background:' + KN.BAR_COLORS[n] + ';cursor:pointer;padding:0"></button>'; }).join('') + '</div>' +
                '<div style="font-weight:700;margin:12px 0 6px">Underline</div><div style="display:flex;flex-wrap:wrap;gap:6px">' +
                STY.map(function (x) { return '<button type="button" class="os-dlg-btn' + (cur.style === x[0] ? ' primary' : '') + '" data-s="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
                '<p style="margin:12px 0 0;font-size:12px;opacity:.7">Keydown: <code>' + esc(KN.tipOpen(cur, cur.text || 'tooltip')) + 'words{/tip}</code></p>';
            const inp = wrap.querySelector('#tip-text'); inp.value = cur.text;
            inp.addEventListener('input', function () { cur.text = inp.value; });
        };
        draw();
        wrap.addEventListener('click', function (e) {
            const c = e.target.closest('[data-c]'), st = e.target.closest('[data-s]');
            if (c) cur.color = c.dataset.c; else if (st) cur.style = st.dataset.s; else return;
            const keep = cur.text; draw(); cur.text = keep; wrap.querySelector('#tip-text').value = keep;
        });
        const v = await dialog('Tooltip Underline', wrap, [{ label: 'Cancel', value: null }, { label: existing ? 'Remove' : 'Close', value: 'remove' }, { label: existing ? 'Update' : 'Add', primary: true, value: 'add' }].filter(function (b) { return b.label !== 'Close'; }));
        if (v === null) return;
        restore();
        const s = window.getSelection();
        if (existing && ed.contains(existing)) {
            if (v === 'remove') { const f = document.createDocumentFragment(); while (existing.firstChild) f.appendChild(existing.firstChild); existing.replaceWith(f); save(); return; }
            const fresh = KN.tipSpan(cur);
            while (existing.firstChild) fresh.appendChild(existing.firstChild);
            existing.replaceWith(fresh); save(); return;
        }
        if (v !== 'add') return;
        if (!s.rangeCount) return;
        let r = s.getRangeAt(0);
        if (r.collapsed) {   // no selection: use the word at the caret
            const n = r.startContainer;
            if (n.nodeType === 3) {
                let a = r.startOffset, b = a;
                while (a > 0 && /\S/.test(n.data[a - 1])) a--;
                while (b < n.data.length && /\S/.test(n.data[b])) b++;
                if (b > a) { r = document.createRange(); r.setStart(n, a); r.setEnd(n, b); }
            }
            if (r.collapsed) { toast('Select the words to underline first!'); return; }
        }
        const span = KN.tipSpan(cur);
        try { r.surroundContents(span); } catch (e) { span.appendChild(r.extractContents()); r.insertNode(span); }
        save(); toast('Tooltip underline added!');
    }

    function emphasisActive(kind) {
        const s = window.getSelection();
        if (!s.rangeCount || !ed.contains(s.anchorNode)) return false;
        const n = s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode;
        return !!(n && n.closest && n.closest('.kdx-t-' + kind));
    }

    /* ---------- margin change bars: the bar itself lives in keydown-next.js as {bar red dashed left} at the start of a line,
       so it travels through Source, saving and every other Keydown app ---------- */
    function barBoxes() {
        const kb = window.KdBlockEditor, out = [];
        const vr = kb && kb.virtualRange && kb.virtualRange();
        if (vr && kb.allBoxes) { kb.allBoxes().forEach(function (b) { if (b.getAttribute && b.getAttribute('contenteditable') === 'true' && vr.intersectsNode(b)) out.push(b); }); if (out.length) return out; }
        const r = remember();
        const b = r ? blockOf(r.startContainer) : null;
        const box = b && b.closest ? (b.closest('[contenteditable="true"]') || b) : null;
        return box && box !== ed ? [box] : [];
    }
    (function () { if (document.getElementById('wo-mm-css')) return; const st = document.createElement('style'); st.id = 'wo-mm-css'; st.textContent = '.os-dlg.mm-dlg{width:min(660px,94vw);max-width:none}'; document.head.appendChild(st); })();
    function applyMarks(bar, mark) {
        const KN = window.KeydownNext;
        if (!KN || !KN.setBar) { toast('Margin marks need Keydown Next, and it did not load!'); return; }
        const boxes = barBoxes();
        if (!boxes.length) { toast('Click in a paragraph first!'); return; }
        boxes.forEach(function (b) { KN.setBar(b, bar || null); KN.setMark(b, mark || null); });
        save();
        toast(bar || mark ? 'Margin marks added!' : 'Margin marks removed!');
    }
    function setBar(o) { applyMarks(o || null, null); }
    // Margin Marks: a bar and/or a badge or label in the page margin, in any color, look and size
    async function marksDialog() {
        const KN = window.KeydownNext;
        if (!KN || !KN.BAR_COLORS || !KN.setMark) { toast('Margin marks need Keydown Next, and it did not load!'); return; }
        const boxes = barBoxes();
        const st = { bar: { on: true, color: 'red', style: 'solid', look: 'flat', side: 'left', size: 'medium' }, mark: { on: false, kind: 'star', color: 'red', look: 'gel', side: 'left', size: 'medium', pos: 'top', text: '' } };
        const first = boxes[0];
        if (first) {
            const bm = first.querySelector(':scope > .kdx-barmark'), mm = first.querySelector(':scope > .kdx-mkmark');
            if (bm) st.bar = Object.assign({ on: true }, KN.parseBar(String(bm.getAttribute('data-kd-src')).replace(/^\{bar|\}$/g, ''))); else if (mm) st.bar.on = false;
            if (mm) { const t = /^\{mark((?:\s+[#\w-]+)*)(?:\|([^{}\n]*))?\}$/.exec(String(mm.getAttribute('data-kd-src'))); if (t) st.mark = Object.assign({ on: true }, KN.parseMark(t[1], t[2])); }
        }
        const wrap = document.createElement('div');
        const lab = function (t) { return '<div style="font-weight:700;margin:10px 0 5px">' + t + '</div>'; };
        const btns = function (list, cur, attr, label) { return '<div style="display:flex;flex-wrap:wrap;gap:5px">' + list.map(function (x) { return '<button type="button" class="os-dlg-btn' + (cur === x ? ' primary' : '') + '" data-' + attr + '="' + x + '" style="padding:3px 10px">' + (label ? label(x) : x) + '</button>'; }).join('') + '</div>'; };
        const swatches = function (cur, attr) { return '<div style="display:flex;flex-wrap:wrap;gap:6px">' + Object.keys(KN.BAR_COLORS).map(function (n) { return '<button type="button" data-' + attr + '="' + n + '" title="' + n + '" style="width:24px;height:24px;border-radius:50%;border:3px solid ' + (cur === n ? 'currentColor' : 'transparent') + ';background:' + KN.BAR_COLORS[n] + ';cursor:pointer;padding:0"></button>'; }).join('') + '</div>'; };
        const cap = function (x) { return x.charAt(0).toUpperCase() + x.slice(1).replace('rounddash', ' dash'); };
        function preview() {
            const box = wrap.querySelector('#mm-sample'); if (!box) return;
            KN.setBar(box, st.bar.on ? st.bar : null); KN.setMark(box, st.mark.on ? st.mark : null);
        }
        function draw() {
            const b = st.bar, m = st.mark;
            wrap.innerHTML =
                '<div style="position:sticky;top:-2px;z-index:3;padding:12px 100px;background:rgba(150,150,150,.2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:10px;margin-bottom:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12)"><div id="mm-sample" style="position:relative;padding:4px 0;min-height:30px">A paragraph with margin marks beside it, like this one!</div></div>' +
                '<label style="display:flex;align-items:center;gap:8px;font-weight:800;margin-top:8px"><input type="checkbox" id="mm-bar-on"' + (b.on ? ' checked' : '') + '> Bar</label>' +
                (b.on ? lab('Color') + swatches(b.color, 'bc') + lab('Shape') + btns(KN.BAR_STYLES, b.style, 'bs', cap) + lab('Look') + btns(KN.BAR_LOOKS, b.look, 'bl', cap) +
                    '<div style="display:flex;gap:24px;flex-wrap:wrap"><div>' + lab('Side') + btns(['left', 'right'], b.side, 'bd', cap) + '</div><div>' + lab('Width') + btns(['thin', 'medium', 'thick'], b.size, 'bz', cap) + '</div></div>' : '') +
                '<label style="display:flex;align-items:center;gap:8px;font-weight:800;margin-top:14px"><input type="checkbox" id="mm-mk-on"' + (m.on ? ' checked' : '') + '> Badge or label</label>' +
                (m.on ? lab('Symbol') + '<div style="display:flex;flex-wrap:wrap;gap:5px">' + Object.keys(KN.MARK_KINDS).map(function (k) { return '<button type="button" class="os-dlg-btn' + (m.kind === k ? ' primary' : '') + '" data-mk="' + k + '" title="' + k + '" style="min-width:34px;padding:3px 8px">' + (k === 'text' ? 'Aa' : KN.MARK_KINDS[k]) + '</button>'; }).join('') + '</div>' +
                    '<label class="os-field" style="margin-top:10px"><span>' + (m.kind === 'text' ? 'Label' : 'Label (optional, shown beside the symbol)') + '</span><input class="os-dlg-input" id="mm-text" maxlength="30" spellcheck="true"></label>' +
                    lab('Color') + swatches(m.color, 'mc') + lab('Look') + btns(KN.MARK_LOOKS, m.look, 'ml', cap) +
                    '<div style="display:flex;gap:24px;flex-wrap:wrap"><div>' + lab('Side') + btns(['left', 'right'], m.side, 'md', cap) + '</div><div>' + lab('Size') + btns(KN.MARK_SIZES, m.size, 'mz', cap) + '</div><div>' + lab('Position') + btns(KN.MARK_POS, m.pos, 'mp', cap) + '</div></div>' : '') +
                '<p style="margin:14px 0 0;font-size:12px;opacity:.7">Keydown, at the start of a line: ' + (b.on ? '<code>' + esc(KN.barText(b)) + '</code> ' : '') + (m.on ? '<code>' + esc(KN.markText(m)) + '</code>' : '') + '</p>';
            const t = wrap.querySelector('#mm-text'); if (t) { t.value = m.text; t.addEventListener('input', function () { m.text = t.value; preview(); }); }
            preview();
        }
        draw();
        wrap.addEventListener('change', function (e) {
            if (e.target.id === 'mm-bar-on') { st.bar.on = e.target.checked; draw(); } else if (e.target.id === 'mm-mk-on') { st.mark.on = e.target.checked; draw(); }
        });
        wrap.addEventListener('click', function (e) {
            const x = e.target.closest('button'); if (!x) return;
            const d = x.dataset;
            if (d.bc) st.bar.color = d.bc; else if (d.bs) st.bar.style = d.bs; else if (d.bl) st.bar.look = d.bl; else if (d.bd) st.bar.side = d.bd; else if (d.bz) st.bar.size = d.bz;
            else if (d.mk) { st.mark.kind = d.mk; if (d.mk === 'text' && !st.mark.text) st.mark.text = 'Note'; } else if (d.mc) st.mark.color = d.mc; else if (d.ml) st.mark.look = d.ml; else if (d.md) st.mark.side = d.md; else if (d.mz) st.mark.size = d.mz; else if (d.mp) st.mark.pos = d.mp;
            else return;
            draw();
        });
        const v = await dialog('Margin Marks', wrap, [{ label: 'Cancel', value: null }, { label: 'Remove marks', value: 'remove' }, { label: 'Apply', primary: true, value: 'add' }], { cls: 'mm-dlg' });
        if (v === 'add') applyMarks(st.bar.on ? st.bar : null, st.mark.on ? st.mark : null); else if (v === 'remove') applyMarks(null, null);
    }

    window.WriteoutMore = {
        marksDialog: marksDialog, applyMarks: applyMarks, setBar: setBar,
        emphasis: emphasis, emphasisActive: emphasisActive, code: code, codeActive: codeActive, tooltipDialog: tooltipDialog,
        symbols: symbols, quickPartsMenu: quickPartsMenu, saveQuickPart: saveQuickPart, loremMenu: loremMenu, lorem: lorem,
        captionMenu: captionMenu, tofMenu: tofMenu, sortLines: sortLines, script: script,
        autoCorrect: function () { return acOn; }, setAutoCorrect: setAutoCorrect, remember: remember
    };
})();
