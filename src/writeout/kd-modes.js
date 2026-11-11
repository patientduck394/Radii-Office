/* =====================================================================
   Three ways to work on a page, in Writeout and Bitbook (like a wiki's Read / Edit / Edit source):
     View    no editing: the whole page is read from its Keydown text again, so everything is formatted
     Visual  the normal editor (type, Enter formats a line, the ribbon works)
     Source  the page as Keydown text in a plain text box; going back to View or Visual formats ALL of it
   Source mode is the sure way to fix anything that did not format (a $$ equation over several lines,
   tags cut apart by colors...): the page is built again from its text, as a whole.
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed || !window.kdDoc || typeof kdDoc.sourceOf !== 'function' || typeof kdDoc.toEditorHtml !== 'function') return;
    const APP = /\/bitbook\//i.test(location.pathname) ? 'bitbook' : 'writeout';
    const KEY = APP + '_edit_mode';
    const OS = window.OfficeShell || null;
    const toast = function (m) { try { if (OS) OS.toast(m); } catch (e) {} };
    let mode = 'visual', src = null, applying = false, srcTimer = 0, viewTimer = 0, lastText = '', touched = false, lastSel = null;

    const css = document.createElement('style');
    css.textContent = [
        // Code themes (Source mode and the Templates window): Poolside (default, the Waterflow look), Poolside Light and Monokai
        ':root{--kc-bg:#06323d;--kc-line:#0f6a7d;--kc-fg:#d6f4fa;--kc-caret:#ffa94d;--kc-sel:#0f7a90;--kc-gut:rgba(255,255,255,.05);--kc-fold:#4f93a3;--kc-h:#2ee6ff;--kc-k:#ff9b3d;--kc-s:#a8f1ff;--kc-n:#5aa9ff;--kc-c:#4f93a3;--kc-t:#6fe7ff;--kc-p:#7cc0ff;--kc-b:#ffb066;--kc-i:#ffb066;--kc-l:#6fe7ff;--kc-d:#4f93a3;--kc-f:#ff9b3d;--kc-fbg:rgba(255,155,61,.16)}',
        'body[data-kd-code="poolside-light"]{--kc-bg:#f2fcff;--kc-line:#36cdee;--kc-fg:#0b2a44;--kc-caret:#f97316;--kc-sel:#b9ecf7;--kc-gut:rgba(14,165,233,.08);--kc-fold:#6b8fa0;--kc-h:#0a93b2;--kc-k:#c85f00;--kc-s:#0e7490;--kc-n:#1b6fe0;--kc-c:#6b8fa0;--kc-t:#0a93b2;--kc-p:#1b6fe0;--kc-b:#c85f00;--kc-i:#c85f00;--kc-l:#0a93b2;--kc-d:#6b8fa0;--kc-f:#c85f00;--kc-fbg:rgba(249,115,22,.14)}',
        'body[data-kd-code="monokai"]{--kc-bg:#272822;--kc-line:#3e3d32;--kc-fg:#f8f8f2;--kc-caret:#f8f8f0;--kc-sel:#49483e;--kc-gut:rgba(255,255,255,.04);--kc-fold:#90908a;--kc-h:#a6e22e;--kc-k:#f92672;--kc-s:#e6db74;--kc-n:#ae81ff;--kc-c:#75715e;--kc-t:#66d9ef;--kc-p:#fd971f;--kc-b:#fd971f;--kc-i:#fd971f;--kc-l:#66d9ef;--kc-d:#75715e;--kc-f:#fd971f;--kc-fbg:rgba(253,151,31,.14)}',
        '.kd-modes{position:fixed;right:16px;bottom:46px;z-index:70;display:flex;gap:2px;padding:3px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(224,242,254,.94));border:1px solid rgba(2,132,199,.45);box-shadow:0 6px 18px rgba(3,105,161,.22);font:700 12px system-ui,sans-serif}',
        '.kd-modes button{font:inherit;border:0;background:none;color:#0369a1;padding:5px 12px;border-radius:999px;cursor:pointer}',
        '.kd-modes button[aria-pressed="true"]{background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}',
        '.kd-srcwrap{display:none;position:relative;box-sizing:border-box;width:100%;min-height:60vh;border:1px solid var(--kc-line);border-radius:10px;background:var(--kc-bg);box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:8;overflow:hidden}',
        'body.kd-mode-source .kd-srcwrap{display:block}',
        '.kd-hl,.kd-src{box-sizing:border-box;width:100%;margin:0;padding:22px 26px 22px 40px;border:0;font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,"JetBrains Mono",monospace;letter-spacing:0;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;tab-size:4;font-variant-ligatures:none}',
        '.kd-hl{position:absolute;left:0;top:0;right:0;min-height:100%;color:var(--kc-fg);pointer-events:none;overflow:hidden}',
        '.kd-src{display:block;position:relative;min-height:60vh;background:transparent;color:transparent;-webkit-text-fill-color:transparent;caret-color:var(--kc-caret);resize:none;overflow:hidden;outline:none}',
        '.kd-src::selection{background:var(--kc-sel);-webkit-text-fill-color:transparent}',
        '.kd-hl .m-h{color:var(--kc-h);font-weight:700}.kd-hl .m-k{color:var(--kc-k)}.kd-hl .m-s{color:var(--kc-s)}.kd-hl .m-n{color:var(--kc-n)}.kd-hl .m-c{color:var(--kc-c)}',
        '.kd-l{min-height:1.6em}',
        '.kd-gutter{position:absolute;left:0;top:0;bottom:0;width:32px;z-index:2;pointer-events:none;background:linear-gradient(90deg,var(--kc-gut),rgba(255,255,255,0));border-right:1px solid var(--kc-line)}',
        '.kd-fold{position:absolute;left:6px;width:20px;height:22px;padding:0;border:0;background:none;color:var(--kc-fold);font:14px/22px system-ui,sans-serif;cursor:pointer;pointer-events:auto;border-radius:4px;opacity:.7;transition:opacity .15s,background .15s}',
        '.kd-fold:hover,.kd-srcwrap:hover .kd-fold{opacity:1}.kd-fold:hover{background:var(--kc-line);color:var(--kc-fg)}.kd-fold.on{opacity:1;color:var(--kc-k)}',
        '.kd-hl .m-f{color:var(--kc-f);background:var(--kc-fbg);border-radius:4px;padding:0 4px;font-style:italic}',
        '.kd-hl .m-t{color:var(--kc-t)}.kd-hl .m-p{color:var(--kc-p)}.kd-hl .m-b{color:var(--kc-b);font-weight:700}.kd-hl .m-i{color:var(--kc-i);font-style:italic}.kd-hl .m-l{color:var(--kc-l);text-decoration:underline}.kd-hl .m-d{color:var(--kc-d)}',
        'body.kd-mode-source #wysiwyg-canvas,body.kd-mode-source #wo-sheets,body.kd-mode-source #bb-sheets{display:none!important}',
        'body.kd-mode-view #wysiwyg-canvas,body.kd-mode-view #wysiwyg-canvas *{caret-color:transparent}',
        'body.kd-mode-view #wysiwyg-canvas [contenteditable="true"]{cursor:default}',
        '@media print{.kd-modes{display:none}}'
    ].join('\n');
    document.head.appendChild(css);

    /* ---------- the switch ---------- */
    const bar = document.createElement('div');
    bar.className = 'kd-modes';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Editing mode');
    bar.innerHTML = '<button type="button" data-m="view" title="View: read the page, fully formatted (no editing)">👁 View</button>' +
        '<button type="button" data-m="visual" title="Visual: edit the formatted page">✏️ Visual</button>' +
        '<button type="button" data-m="source" title="Source: edit the page as Keydown text">&lt;/&gt; Source</button>';
    bar.addEventListener('mousedown', function (e) { e.preventDefault(); });
    bar.addEventListener('click', function (e) { const b = e.target.closest('[data-m]'); if (b) set(b.dataset.m); });
    document.body.appendChild(bar);
    function paintBar() {
        bar.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === mode)); });
        ['view', 'visual', 'source'].forEach(function (m) { document.body.classList.toggle('kd-mode-' + m, m === mode); });
        try { if (OS) OS.sync(); } catch (e) {}
    }

    /* ---------- page <-> Keydown text ---------- */
    function save() { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} }
    function hydrate() {
        // Keydown Next (::chart, ::timer, {{values}}, ;;pk{ Poolside Keydown }) is drawn again for the rebuilt page
        try { if (window.KeydownNext) window.KeydownNext.apply(ed, { editing: mode !== 'view' }); } catch (e) {}
        try { if (typeof kdHydrateInteractions === 'function') kdHydrateInteractions(); } catch (e) {}
        try { if (window.BitLang && window.BitLang.hydrate) window.BitLang.hydrate(ed); } catch (e) {}
        try { if (typeof kdRenderOutline === 'function') kdRenderOutline(); } catch (e) {}
    }
    // builds the page again from Keydown text, as a whole (the same way a .kd file opens)
    function build(text) {
        return kdDoc.toEditorHtml(String(text || '')).then(function (html) {
            applying = true;
            try {
                ed.innerHTML = html && html.trim() ? html : '<div><br></div>';
                // every line is its own editable box in these editors
                if (ed.getAttribute('contenteditable') === 'false') {
                    Array.from(ed.children).forEach(function (c) { if (!c.hasAttribute('contenteditable') && !c.hidden) c.setAttribute('contenteditable', 'true'); });
                }
                hydrate();
                save();
                if (mode === 'source') lastText = textNow();
            } finally { setTimeout(function () { applying = false; }, 0); }
        });
    }
    function textNow() { return kdDoc.sourceOf(ed); }


    /* ---------- Monokai colors for the Keydown text ---------- */
    const escH = function (t) { return String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
    const sp = function (cls, t) { return '<span class="' + cls + '">' + escH(t) + '</span>'; };
    // chip and tag marks: ++R+ ++ ;;R; !!#R# #R# ##  ~X~ =R= ^^R^ %R% &&  *sp(  @family-1@  and friends
    const MARKS = '\\{(?:bar|mark|tip)(?:\\s+[#\\w-]+)*(?:\\|[^{}\\n]*)?\\}|\\{/?(?:sc|dots|dim|tip)\\}|\\+\\+[A-Z]{1,2}[+~!%?*:^=/\\-@;#&.,_]|;;[A-Z]{1,2}[;:~]|!!?[#^~=+%:;\\-?/*@!][A-Z]{1,2}[#!]?|[!?]{2}[A-Z]{1,2}[!?]|#[A-Z]{1,2}#(?:[_~=.][a-z]*)?|~[A-Z][A-Z0-9-]*~|=[A-Z]{1,2}=|\\^\\^[A-Z]{1,2}\\^|%[A-Z]{1,2}%|%\\d{1,2}%[A-Z]{1,2}%|&&|@[a-z0-9]+(?:-[1-5])?@|##|#_|#~|#=|#\\]|#-|#\\[\\[|#\\[|#>|\\+\\+|;;|\\^\\^|!!|\\?\\?|\\*>|\\+>';
    const INLINE = new RegExp('(`[^`\\n]+`(?:\\{[A-Za-z0-9|-]+\\})?)|(\\$\\$[^$\\n]+\\$\\$|\\$[^$\\n]+\\$)|(\\[\\[[^\\]\\n]+\\]\\]|\\[[^\\]\\n]+\\]\\([^)\\n]+\\))|(\\*\\*[^*\\n]+\\*\\*)|(\\{\\{[^{}\\n]*\\}\\}|\\[\\^[^\\]\\n]+\\]|\\{align=[a-z]+\\})|(#[A-Z]{1,2}(?:\\.[a-z]+)?\\(|\\*sp\\(|#[%^+:;][A-Z]{1,2}[%^+:;]|!!?[#^~=+%:;\\-?/*@!][A-Z]{1,2}#)|(' + MARKS + ')|(\\*[^*\\s][^*\\n]*\\*)|(⟪…[^⟫\\n]*⟫)|(\\[(?:__|##)\\d+(?:\\|[^\\]\\n]*)?\\])', 'g');
    // (bold, italic and the (...) forms hold more Keydown inside them, so their insides are colored too)
    function hlInline(t) {
        let out = '', last = 0, m;
        const re = new RegExp(INLINE.source, 'g');   // (its own copy: the insides are colored by calling this again)
        while ((m = re.exec(t))) {
            if (m.index > last) out += escH(t.slice(last, m.index));
            let end = m.index + m[0].length;
            if (m[4]) out += '<span class="m-b">**' + hlInline(m[0].slice(2, -2)) + '**</span>';
            else if (m[8]) out += '<span class="m-i">*' + hlInline(m[0].slice(1, -1)) + '*</span>';
            else if (m[6]) {
                // a name( ... ): the closing ) is the one that matches, counting any ( ) inside
                let depth = 1, i = end;
                const paren = m[0].charAt(m[0].length - 1) === '(';
                const closer = paren ? ')' : m[0].charAt(m[0].length - 1);   // (#:G:text: and its cousins end with the same mark that opened them)
                if (paren) { while (i < t.length && depth > 0) { if (t.charAt(i) === '(') depth++; else if (t.charAt(i) === ')') depth--; i++; } }
                else {
                    depth = 1;
                    while (i < t.length) {
                        const ch = t.charAt(i);
                        if (ch === '$') { const z = t.indexOf('$', i + 1); if (z > 0) { i = z + 1; continue; } }   // (math inside can hold the mark)
                        if (ch === closer) { depth = 0; i++; break; }
                        i++;
                    }
                }
                if (depth === 0) { out += sp('m-n', m[0]) + hlInline(t.slice(end, i - 1)) + sp('m-n', closer); end = i; re.lastIndex = i; }
                else out += sp('m-n', m[0]);
            } else out += sp(m[10] ? 'm-p' : m[9] ? 'm-f' : m[1] ? 'm-s' : m[2] ? 'm-t' : m[3] ? 'm-l' : m[5] ? 'm-p' : 'm-n', m[0]);
            last = end;
            if (m[0].length === 0) re.lastIndex++;
            else if (end !== m.index + m[0].length) re.lastIndex = end;
        }
        return out + escH(t.slice(last));
    }
    const CODE_RE = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b(fn|var|temp|if|elif|else|while|for|in|return|break|continue|and|or|not|true|false|null)\b|\b([A-Za-z_]\w*)(?=\()/g;
    function hlCode(t) {
        let out = '', last = 0, m;
        CODE_RE.lastIndex = 0;
        while ((m = CODE_RE.exec(t))) {
            if (m.index > last) out += escH(t.slice(last, m.index));
            out += sp(m[1] ? 'm-c' : m[2] ? 'm-s' : m[3] ? 'm-n' : m[4] ? 'm-k' : 'm-h', m[0]);
            last = m.index + m[0].length;
        }
        return out + escH(t.slice(last));
    }
    const PH = /⟪…[^⟫\n]*⟫/;
    function hlLines(text) {
        let fence = false;
        return String(text).split('\n').map(function (line) {
            let m;
            if (/^\s*⟪…[^⟫\n]*⟫\s*$/.test(line)) return sp('m-f', line);
            if (!fence && (m = /^(@@[a-z]+)(=?)("[^"]*")?(```)\s*$/.exec(line.trim()))) { fence = true; return sp('m-k', m[1]) + escH(m[2]) + (m[3] ? sp('m-s', m[3]) : '') + sp('m-p', m[4]); }
            if ((m = /^(\s*```)([A-Za-z0-9_+#.-]*)(\{[^}]*\})?\s*$/.exec(line)) && !fence && (m[2] || m[3])) { fence = true; return sp('m-p', m[1]) + (m[2] ? sp('m-k', m[2]) : '') + (m[3] ? sp('m-s', m[3]) : ''); }
            if (/^\s*```/.test(line)) { fence = !fence; return sp('m-p', line); }
            if (fence) return hlCode(line);
            if ((m = /^(\|+)(.*)$/.exec(line)) && !/^\|.*\|(\{[a-z]+\})?\s*$/.test(line)) return sp('m-d', m[1]) + highlight(m[2]);
            if (/^\s*([-*_=])\1{2,}\s*$/.test(line)) return sp('m-d', line);
            if ((m = /^(\s*)(#{1,4})(\s+)(.*)$/.exec(line))) return escH(m[1]) + sp('m-h', m[2] + m[3]) + '<span class="m-h">' + hlInline(m[4]) + '</span>';
            if ((m = /^(\s*)(!>|\?>|>>|%>|\*>|\+>|->|=>|~>|\$>|#>|\^>|@>|&>|>)(\s+)(.*)$/.exec(line))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + hlInline(m[4]);
            if ((m = /^(\s*)([*+\-.~=])(\s+)(.*)$/.exec(line))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + hlInline(m[4]);
            if ((m = /^(::[a-z]+)(\{[^}]*\})?(.*)$/.exec(line))) return sp('m-k', m[1]) + (m[2] ? sp('m-p', m[2]) : '') + hlInline(m[3]);
            if ((m = /^(@@[a-z]+)(=")(.*)(")\s*$/.exec(line))) return sp('m-k', m[1]) + escH(m[2]) + sp('m-s', m[3]) + escH(m[4]);
            if (/^\|.*\|(\{[a-z]+\})?\s*$/.test(line)) return line.split('|').map(function (c, i, a) { return hlInline(c); }).join(sp('m-k', '|'));
            return hlInline(line);
        });
    }
    function highlight(text) { return hlLines(text).join('\n'); }
    // the colored copy sits under the box (whose own letters are see-through); the box grows with its text so both always line up
    let hlPre = null, gutter = null, folds = {}, nextFold = 1;
    /* ---------- folding: images and skills with long data, and code or math blocks, fold up from a little arrow on their first line ---------- */
    // (a folded part is swapped for a short ⟪…note #n⟫ mark in the box; the real text is kept and put back whenever the page is read)
    const PH_G = /⟪…[^⟫\n]*#(\d+)⟫/g;
    function expand(v) {
        let t = String(v);
        for (let k = 0; k < 6; k++) { const n = t.replace(PH_G, function (all, id) { return folds[id] !== undefined ? folds[id] : all; }); if (n === t) break; t = n; }
        return t;
    }
    const fullText = function () { return src ? expand(src.value) : ''; };
    const OPEN_FENCE = /^(\s*```\S*|@@[a-z]+(?:="(?:[^"\\]|\\.)*")?=```)\s*$/;
    const IMG = /^(\s*!\[[^\]\n]*\]\()([^)\n]{40,})(\).*)$/;
    const SKILL = /^(@@[a-z]+=")((?:[^"\\]|\\.){40,})(")\s*$/;
    const IMG_F = /^\s*!\[[^\]\n]*\]\(⟪…[^⟫\n]*⟫\)/, SKILL_F = /^@@[a-z]+="⟪…[^⟫\n]*⟫"\s*$/, WHOLE_F = /^\s*⟪…[^⟫\n]*⟫\s*$/;
    function foldInfo(lines) {
        const out = [];
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (OPEN_FENCE.test(l) || /^\s*\$\$\s*$/.test(l)) {
                const dollar = /^\s*\$\$\s*$/.test(l);
                let j = i + 1;
                while (j < lines.length && !(dollar ? /^\s*\$\$\s*$/.test(lines[j]) : /^\s*```\s*$/.test(lines[j]))) j++;
                if (j < lines.length && j - i >= 2) { out.push({ i: i, j: j, kind: 'block', folded: j === i + 2 && WHOLE_F.test(lines[i + 1]) }); i = j; }
            } else if (IMG_F.test(l) || SKILL_F.test(l)) out.push({ i: i, kind: 'line', folded: true });
            else if (IMG.test(l) || SKILL.test(l)) out.push({ i: i, kind: 'line', folded: false });
        }
        return out;
    }
    // Folded parts are remembered (by their own text), so they are folded again whenever Source mode is opened!
    const FOLD_KEY = 'writeout_source_folds_v1';
    const foldHash = function (t) { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + t.length; };
    function foldMem() { try { const a = JSON.parse(localStorage.getItem(FOLD_KEY) || '[]'); return new Set(Array.isArray(a) ? a : []); } catch (e) { return new Set(); } }
    function foldRemember(key, on) {
        const m = foldMem();
        if (on) { m.delete(key); m.add(key); } else m.delete(key);
        try { localStorage.setItem(FOLD_KEY, JSON.stringify(Array.from(m).slice(-300))); } catch (e) {}
    }
    const foldSize = function (n) { return n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' characters'; };
    function autoFold() {
        if (!src) return;
        const mem = foldMem();
        if (!mem.size) return;
        const lines = src.value.split('\n');
        let changed = false;
        // (bottom up, so the line numbers of the parts still to fold stay right)
        foldInfo(lines).filter(function (f) { return !f.folded; }).reverse().forEach(function (f) {
            if (f.kind === 'block') {
                const inner = lines.slice(f.i + 1, f.j);
                if (!mem.has('b' + foldHash(inner.join('\n')))) return;
                const id = nextFold++; folds[id] = inner.join('\n');
                lines.splice(f.i + 1, inner.length, '⟪…' + inner.length + (inner.length === 1 ? ' line #' : ' lines #') + id + '⟫'); changed = true;
            } else {
                const m = IMG.exec(lines[f.i]) || SKILL.exec(lines[f.i]);
                if (!m || !mem.has('l' + foldHash(m[2]))) return;
                const id = nextFold++; folds[id] = m[2];
                lines[f.i] = m[1] + '⟪…' + foldSize(m[2].length) + ' #' + id + '⟫' + m[3]; changed = true;
            }
        });
        if (changed) { src.value = lines.join('\n'); refresh(); }
    }
    function toggleFold(i) {
        const sc0 = scroller(), top0 = sc0.scrollTop;
        const lines = src.value.split('\n'), info = foldInfo(lines).find(function (f) { return f.i === i; });
        if (!info) return;
        let caret;
        if (info.kind === 'block') {
            if (info.folded) { const id = (PH_G.exec(lines[i + 1]) || [])[1]; PH_G.lastIndex = 0; if (folds[id] !== undefined) { foldRemember('b' + foldHash(folds[id]), false); lines[i + 1] = folds[id]; delete folds[id]; } }
            else { const id = nextFold++; const inner = lines.slice(i + 1, info.j); folds[id] = inner.join('\n'); foldRemember('b' + foldHash(folds[id]), true); lines.splice(i + 1, inner.length, '⟪…' + inner.length + (inner.length === 1 ? ' line #' : ' lines #') + id + '⟫'); }
        } else if (info.folded) {
            lines[i] = lines[i].replace(PH_G, function (all, id) { const o = folds[id] !== undefined ? folds[id] : all; if (folds[id] !== undefined) foldRemember('l' + foldHash(folds[id]), false); delete folds[id]; return o; });
        } else {
            const id = nextFold++, m = IMG.exec(lines[i]) || SKILL.exec(lines[i]);
            folds[id] = m[2]; foldRemember('l' + foldHash(m[2]), true);
            lines[i] = m[1] + '⟪…' + (m[2].length > 1024 ? Math.round(m[2].length / 1024) + ' KB' : m[2].length + ' characters') + ' #' + id + '⟫' + m[3];
        }
        caret = lines.slice(0, i).join('\n').length + (i ? 1 : 0);
        src.value = lines.join('\n');
        src.setSelectionRange(caret, caret);
        lastSel = [caret, caret]; touched = true;
        refresh();
        // (setting the caret and the new height can both move the page: put it back where it was)
        sc0.scrollTop = top0;
        requestAnimationFrame(function () { sc0.scrollTop = top0; });
    }
    function buildGutter() {
        if (!gutter || !hlPre) return;
        const kids = hlPre.children, info = foldInfo(src.value.split('\n'));
        gutter.innerHTML = '';
        info.forEach(function (f) {
            const row = kids[f.i];
            if (!row) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'kd-fold' + (f.folded ? ' on' : '');
            b.textContent = f.folded ? '▸' : '▾';
            b.title = f.folded ? 'Unfold' : 'Fold (hide) this ' + (f.kind === 'block' ? 'block' : 'long part');
            b.style.top = row.offsetTop + 'px';
            b.addEventListener('mousedown', function (e) { e.preventDefault(); });
            b.addEventListener('click', function (e) { e.preventDefault(); toggleFold(f.i); });
            gutter.appendChild(b);
        });
    }
    // the page area that scrolls (the box itself grows, so the area around it does the scrolling)
    function scroller() {
        for (let e = src && src.parentElement; e; e = e.parentElement) {
            if (/(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight) return e;
        }
        return document.scrollingElement || document.documentElement;
    }
    // runs something that resizes the box without the page jumping (the box is briefly measured at its own height, which would clamp the scroll)
    function keepScroll(fn) {
        const sc = scroller(), top = sc.scrollTop;
        fn();
        sc.scrollTop = top;
        requestAnimationFrame(function () { sc.scrollTop = top; });
    }
    // after typing, scroll only as much as needed to keep the line you are on in view
    function caretInView() {
        if (!src || !hlPre) return;
        const line = src.value.slice(0, src.selectionStart).split('\n').length - 1, row = hlPre.children[line];
        if (!row) return;
        const sc = scroller(), box = (sc === document.scrollingElement || sc === document.documentElement) ? { top: 0, bottom: window.innerHeight } : sc.getBoundingClientRect();
        const top = hlPre.getBoundingClientRect().top + row.offsetTop, bottom = top + row.offsetHeight;
        if (top < box.top + 12) sc.scrollTop -= box.top + 12 - top;
        else if (bottom > box.bottom - 12) sc.scrollTop += bottom - (box.bottom - 12);
    }
    // the colored copy sits under the box (whose own letters are see-through); the box grows with its text so both always line up
    function refresh(typing) {
        if (!src || !hlPre) return;
        keepScroll(function () {
            hlPre.innerHTML = hlLines(src.value).map(function (l) { return '<div class="kd-l">' + (l || '​') + '</div>'; }).join('');
            src.style.height = 'auto';
            src.style.height = Math.max(src.scrollHeight, 1) + 'px';
            buildGutter();
        });
        if (typing === true) caretInView();
    }
    function setSrc(v) { folds = {}; nextFold = 1; ensureSrc().value = v; refresh(); autoFold(); }

    /* ---------- Source ---------- */
    function ensureSrc() {
        if (src) return src;
        src = document.createElement('textarea');
        src.className = 'kd-src';
        src.spellcheck = false;
        src.setAttribute('aria-label', 'Page source (Keydown text)');
        const wrap = document.createElement('div');
        wrap.className = 'kd-srcwrap';
        hlPre = document.createElement('pre');
        hlPre.className = 'kd-hl';
        hlPre.setAttribute('aria-hidden', 'true');
        gutter = document.createElement('div');
        gutter.className = 'kd-gutter';
        wrap.appendChild(hlPre);
        wrap.appendChild(gutter);
        wrap.appendChild(src);
        ed.parentNode.insertBefore(wrap, ed.nextSibling);
        src.addEventListener('input', function () { refresh(true); });
        window.addEventListener('resize', refresh);
        ['pointerdown', 'keydown', 'focus'].forEach(function (t) { src.addEventListener(t, function () { touched = true; }); });
        // where the caret is, as the box last said (the page may move it when a ribbon button takes the focus)
        ['select', 'keyup', 'mouseup', 'input', 'blur', 'click'].forEach(function (t) { src.addEventListener(t, function () { lastSel = [src.selectionStart, src.selectionEnd]; }); });
        // typing keeps the page (and its save) up to date, a moment after you stop
        src.addEventListener('input', function () { clearTimeout(srcTimer); srcTimer = setTimeout(function () { build(fullText()); }, 700); });
        // leaving the box (for another page tab, the ribbon...) saves what you typed right away
        src.addEventListener('blur', function () { if (srcTimer) { clearTimeout(srcTimer); srcTimer = 0; build(fullText()); } });
        src.addEventListener('keydown', function (e) {
            if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                // Tab puts one | at the start of each picked line (one | is one indent step), and Shift+Tab takes one away!
                e.preventDefault();
                const v = src.value, a = src.selectionStart, z = src.selectionEnd;
                const from = v.lastIndexOf('\n', a - 1) + 1;
                let to = v.indexOf('\n', z > a && v.charAt(z - 1) === '\n' ? z - 1 : z);
                if (to < 0) to = v.length;
                let moved = 0, first = 0;
                const out = v.slice(from, to).split('\n').map(function (ln, k) {
                    if (!e.shiftKey) { if (k === 0) first = 1; moved++; return '|' + ln; }
                    const m = /^[\t|]/.test(ln); if (m) { if (k === 0) first = -1; moved--; return ln.slice(1); }
                    return ln;
                }).join('\n');
                src.setRangeText(out, from, to, 'preserve');
                const na = Math.max(from, a + first), nz = Math.max(na, z + moved);
                src.setSelectionRange(na, nz);
                src.dispatchEvent(new Event('input'));
            }
        });
        return src;
    }


    /* ---------- things added while in Source (Skills, Insert, emoji...) are written into the text box, where the caret is ---------- */
    const INLINE_TAGS = /^(SPAN|A|B|I|U|S|EM|STRONG|CODE|SUB|SUP|MARK|IMG|FONT|BR|SMALL|KBD|ABBR)$/;
    function srcInsert(text, block) {
        const s = ensureSrc(), v = s.value;
        let a = v.length, z = v.length;
        // (the caret stays where you left it when you click a ribbon button; before you touch the box, things go at the end)
        if (touched) { const sel = lastSel || [s.selectionStart, s.selectionEnd]; a = Math.min(v.length, sel[0] || 0); z = Math.min(v.length, sel[1] || 0); }
        let ins = String(text);
        if (block) { if (a > 0 && v.charAt(a - 1) !== '\n') ins = '\n' + ins; if (!/\n$/.test(ins) && v.charAt(z) !== '\n') ins += '\n'; }
        s.setRangeText(ins, a, z, 'end');
        touched = true; lastSel = [s.selectionStart, s.selectionEnd];
        lastText = textNow();
        s.dispatchEvent(new Event('input'));
        try { s.scrollTop = Math.max(s.scrollTop, 0); } catch (e) {}
    }
    function nodeToText(node) {
        if (node.nodeType === 3) return { text: node.nodeValue, block: false };
        if (node.nodeType !== 1) return { text: '', block: false };
        const w = document.createElement('div');
        w.appendChild(node.cloneNode(true));
        let text = '';
        try { text = kdDoc.sourceOf(w).replace(/\n+$/, ''); } catch (e) { text = w.textContent || ''; }
        return { text: text, block: !INLINE_TAGS.test(node.tagName) || text.indexOf('\n') !== -1 };
    }
    // the editors' "put this at the caret" helper: in Source it types the node's Keydown text into the box instead
    ['fmtInsertNodeAtCaret'].forEach(function (name) {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function (node) {
            if (mode === 'source' && node) {
                const t = nodeToText(node);
                if (t.text) { srcInsert(t.text, t.block); return true; }
            }
            return orig.apply(this, arguments);
        };
    });
    // anything else that changes the page while Source is open (a plugin, a dialog) is added to the box the same way:
    // the new text is compared with the old, and what is new goes in at the caret
    let diffTimer = 0;
    function followPage() {
        if (mode !== 'source' || !src || applying) return;
        const now = textNow();
        if (now === lastText) return;
        if (fullText() === now) { lastText = now; return; }
        const old = lastText;
        let pre = 0;
        while (pre < old.length && pre < now.length && old.charAt(pre) === now.charAt(pre)) pre++;
        let suf = 0;
        while (suf < old.length - pre && suf < now.length - pre && old.charAt(old.length - 1 - suf) === now.charAt(now.length - 1 - suf)) suf++;
        const added = now.slice(pre, now.length - suf), removed = old.length - pre - suf;
        lastText = now;
        // (a different page opened, or text was replaced: show that page; plain additions go in at the caret)
        if (!added || removed) { setSrc(now); return; }
        srcInsert(added, /\n/.test(added) || /^\s*$/.test(old.charAt(pre - 1) || '\n'));
    }


    // Formatting buttons in Source work on the text: Bold and Italic wrap the picked text in ** and *, the list buttons put "* " in front of the lines
    function srcRange() {
        const s = ensureSrc(), v = s.value;
        const sel = touched ? (lastSel || [s.selectionStart, s.selectionEnd]) : [v.length, v.length];
        return [Math.min(v.length, sel[0] || 0), Math.min(v.length, sel[1] || 0)];
    }
    function srcDone(a, z) { const s = src; s.setSelectionRange(a, z); touched = true; lastSel = [a, z]; s.dispatchEvent(new Event('input')); }
    function srcWrap(mark) {
        const s = ensureSrc(), r = srcRange(), v = s.value, picked = v.slice(r[0], r[1]), m = mark.length;
        if (picked.length >= 2 * m && picked.slice(0, m) === mark && picked.slice(-m) === mark && !(mark === '*' && picked.slice(0, 2) === '**')) {
            s.setRangeText(picked.slice(m, picked.length - m), r[0], r[1], 'select');
        } else s.setRangeText(mark + picked + mark, r[0], r[1], 'select');
        srcDone(s.selectionStart, s.selectionEnd);
    }
    function srcBullets() {
        const s = ensureSrc(), r = srcRange(), v = s.value;
        const from = v.lastIndexOf('\n', r[0] - 1) + 1;
        let to = v.indexOf('\n', r[1]); if (to < 0) to = v.length;
        const lines = v.slice(from, to).split('\n'), all = lines.every(function (l) { return /^\*\s/.test(l) || !l.trim(); });
        const out = lines.map(function (l) { return !l.trim() ? l : (all ? l.replace(/^\*\s+/, '') : (/^\*\s/.test(l) ? l : '* ' + l)); }).join('\n');
        s.setRangeText(out, from, to, 'select');
        srcDone(s.selectionStart, s.selectionEnd);
    }
    let shimmed = false;
    function installShims() {
        if (shimmed) return;
        shimmed = true;
        const exec = document.execCommand.bind(document);
        document.execCommand = function (cmd) {
            if (mode === 'source') {
                if (cmd === 'bold') { srcWrap('**'); return true; }
                if (cmd === 'italic') { srcWrap('*'); return true; }
                if (cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') { srcBullets(); return true; }
            }
            return exec.apply(document, arguments);
        };
        if (window.KdBlockEditor && typeof window.KdBlockEditor.toggleList === 'function') {
            const tl = window.KdBlockEditor.toggleList;
            window.KdBlockEditor.toggleList = function () { if (mode === 'source') { srcBullets(); return true; } return tl.apply(this, arguments); };
        }
        // Annotate draws on the page itself, so it needs the page showing
        if (window.AnnotateInk && typeof window.AnnotateInk.start === 'function') {
            const st = window.AnnotateInk.start;
            window.AnnotateInk.start = function (el, opts) {
                if (mode !== 'source') return st.apply(this, arguments);
                // Source: show the page to draw on, then come back to Source, where the drawing is now an @@ink line
                set('visual');
                const self = this, back = opts && typeof opts.onStop === 'function' ? opts.onStop : null;
                setTimeout(function () {
                    st.call(self, el, Object.assign({}, opts, { onStop: function () { if (back) back(); set('source'); toast('Your drawing is in the Source as @@ink!'); } }));
                }, 60);
            };
        }
    }

    /* ---------- View: no editing ---------- */
    const NAV = /^(Arrow|Page|Home|End|Escape|Tab|F\d+)/;
    function blockKeys(e) {
        if (mode !== 'view' || !ed.contains(e.target)) return;
        if (NAV.test(e.key)) return;   // moving
        // every browser shortcut still works here (copy, find, print, reload with Ctrl+Shift+R...): only the ones that would change the page are blocked
        if ((e.metaKey || e.ctrlKey) && !/^([xvzybiuke]|Enter|Backspace|Delete)$/i.test(e.key)) return;
        e.preventDefault(); e.stopImmediatePropagation();
    }
    function blockInput(e) { if (mode === 'view' && ed.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } }
    document.addEventListener('keydown', blockKeys, true);
    ['beforeinput', 'paste', 'drop', 'cut'].forEach(function (t) { document.addEventListener(t, blockInput, true); });

    /* ---------- switching ---------- */
    // Each mode remembers how far down you had scrolled: Visual and View are linked (one shared spot), Source has its own,
    // so going back to either lands where you left it, not at some random page!
    const scrollAt = { page: 0, source: 0 };
    let scrollToken = 0;
    const grpOf = function (m) { return m === 'source' ? 'source' : 'page'; };
    function scrollBoxOf(el) {
        for (let e = el && el.parentElement; e; e = e.parentElement) {
            if (/(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight) return e;
        }
        return document.scrollingElement || document.documentElement;
    }
    function rememberScroll(m) { try { scrollAt[grpOf(m)] = scrollBoxOf(m === 'source' ? src : ed).scrollTop; } catch (e) {} }
    // puts the remembered spot back once the new mode is laid out (a few tries while fonts and formulas settle; scrolling yourself cancels the rest)
    function restoreScroll(m) {
        const top = scrollAt[grpOf(m)] || 0, tok = ++scrollToken;
        const go = function () { if (tok !== scrollToken || mode !== m) return; try { scrollBoxOf(m === 'source' ? src : ed).scrollTop = top; } catch (e) {} };
        go(); requestAnimationFrame(go); setTimeout(go, 120); setTimeout(go, 450);
    }
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (t) { document.addEventListener(t, function () { scrollToken++; }, true); });
    let busy = Promise.resolve();
    function set(m) {
        if (!/^(view|visual|source)$/.test(m) || m === mode) return busy;
        const from = mode;
        busy = busy.then(function () {
            clearTimeout(srcTimer);
            rememberScroll(from);
            // leaving Source: the text becomes the page (all of it formatted)
            const fromSource = from === 'source' && src ? build(fullText()) : Promise.resolve();
            return fromSource.then(function () {
                mode = m;
                try { localStorage.setItem(KEY, m); } catch (e) {}
                if (m === 'source') {
                    installShims();
                    setSrc(textNow());
                    lastText = fullText(); touched = false; lastSel = null;
                    paintBar();
                    // (the box could only be measured once it showed: size it to its text now, and again when fonts arrive)
                    refresh(); requestAnimationFrame(refresh);
                    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh); } catch (e) {}
                    setTimeout(function () { try { src.focus({ preventScroll: true }); src.setSelectionRange(0, 0); src.scrollTop = 0; } catch (e) {} touched = false; restoreScroll('source'); }, 0);
                    return;
                }
                if (m === 'view') {
                    // read the page again from its text, so everything on it is formatted
                    return build(textNow()).then(function () { paintBar(); try { ed.blur(); } catch (e) {} restoreScroll('view'); });
                }
                paintBar();
                restoreScroll('visual');
            });
        }).catch(function (e) { try { console.error('[Keydown] mode switch failed', e); } catch (x) {} toast('Could not switch modes: ' + (e && e.message || e)); paintBar(); });
        return busy;
    }

    // another page tab (or a file) opened while in Source or View: show that page the same way
    new MutationObserver(function () {
        if (applying) return;
        if (mode === 'view') { clearTimeout(viewTimer); viewTimer = setTimeout(function () { if (mode === 'view' && !applying) build(textNow()); }, 120); }
    }).observe(ed, { childList: true });
    new MutationObserver(function () { if (mode === 'source' && src && !applying) { clearTimeout(diffTimer); diffTimer = setTimeout(followPage, 40); } }).observe(ed, { childList: true, subtree: true, characterData: true });

    // Code themes
    const CODE_THEMES = [['monokai', 'Monokai'], ['poolside', 'Poolside'], ['poolside-light', 'Poolside Light']];
    const THEME_KEY = 'writeout_code_theme';
    function codeTheme() { let t = 'poolside'; try { t = localStorage.getItem(THEME_KEY) || 'poolside'; } catch (e) {} return CODE_THEMES.some(function (x) { return x[0] === t; }) ? t : 'poolside'; }
    function setCodeTheme(t) {
        if (!CODE_THEMES.some(function (x) { return x[0] === t; })) t = 'poolside';
        document.body.setAttribute('data-kd-code', t);
        try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
        try { if (OS) OS.sync(); } catch (e) {}
    }
    document.body.setAttribute('data-kd-code', codeTheme());
    window.KdModes = { set: set, get: function () { return mode; }, sourceText: textNow, highlight: function (text) { return hlLines(text).map(function (l) { return '<div class="kd-l">' + (l || '\u200b') + '</div>'; }).join(''); }, themes: CODE_THEMES, codeTheme: codeTheme, setCodeTheme: setCodeTheme };
    paintBar();
    // the mode you used last comes back (once the page has loaded)
    setTimeout(function () {
        let m = 'visual';
        try { m = localStorage.getItem(KEY) || 'visual'; } catch (e) {}
        if (m !== 'visual') set(m);
    }, 900);
})();
