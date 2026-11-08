// (This is the last part of Keydown.js: scripts/build_keydown_js.mjs puts it after the engine's pieces.)
const kdDoc = window.kdDoc;
const kdEsc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const classKey = (c) => String(c || '').trim().split(/\s+/).filter(Boolean).sort().join(' ');

// Applets: the document engine draws them as plain chips; the portable renderer knows their working insides
const APPLETS = new Map();
Portable.KD_ALL.forEach((d) => {
    const kind = Portable.kdKindFor(d);
    if (d.cls && kind && kind !== 'em' && kind !== 'duplex' && !APPLETS.has(classKey(d.cls))) APPLETS.set(classKey(d.cls), kind);
});

// Math is drawn by KaTeX (the same version the site uses), loaded the first time an equation shows up
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';
let katexLoading = null;
function ensureMath(root) {
    if (window.katex || !root.querySelector('.kd-math')) { if (window.katex && window.kdMathRefresh) window.kdMathRefresh(root); return; }
    if (katexLoading) return;
    katexLoading = new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = KATEX + 'katex.min.css';
        document.head.appendChild(link);
        const s = document.createElement('script');
        s.src = KATEX + 'katex.min.js';
        s.onload = () => { try { window.kdMathRefresh && window.kdMathRefresh(); } catch (e) {} resolve(true); };
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

// @@ink drawings: the layer lives at the top of its document (its strokes are measured from the document's corner),
// the document is where it is anchored (.keydown-doc is position: relative), and it covers the whole document
function inkLayers(root) {
    const layers = Array.from(root.querySelectorAll('svg.an-ink-layer'));
    if (!layers.length) return;
    layers.forEach((layer, i) => {
        // (two drawings in one document become one, like in Bitbook)
        if (i > 0 && window.AnnotateInk) {
            const first = layers[0], all = window.AnnotateInk.strokesOf(first).concat(window.AnnotateInk.strokesOf(layer));
            const t = document.createElement('template'); t.innerHTML = window.AnnotateInk.layerHtml(all);
            first.replaceWith(t.content.firstChild); layers[0] = root.querySelector('svg.an-ink-layer'); layer.remove();
            return;
        }
        const holder = layer.parentNode;
        if (holder !== root) {
            root.appendChild(layer);
            if (holder && !holder.textContent.replace(/[\s\u200B]/g, '') && !holder.querySelector('img, svg, input, table, [data-kd]')) holder.remove();
        }
    });
    const layer = root.querySelector('svg.an-ink-layer');
    if (!layer || !root.isConnected) return;
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    // (measured with the layer folded away, so it never makes its own document look bigger)
    layer.setAttribute('width', 0); layer.setAttribute('height', 0);
    layer.setAttribute('width', Math.max(root.scrollWidth, root.clientWidth));
    layer.setAttribute('height', Math.max(root.scrollHeight, root.clientHeight));
}

// Make everything inside an element work: applets get their insides, timers and capsules keep counting
function upgrade(root) {
    if (!root || !root.querySelectorAll) return root;
    injectStyles(root.ownerDocument);
    root.querySelectorAll('span[class]').forEach((el) => {
        const kind = APPLETS.get(classKey(el.className));
        if (!kind || el.hasAttribute('data-kd') || el.hasAttribute('data-text')) return;
        const label = (el.getAttribute('data-label') || el.textContent || '').replace(/​/g, '').trim();
        if (kind === 'mirror') { el.setAttribute('data-text', label); return; }
        if (kind === 'wave') {
            if (!el.querySelector('.kinetic-wave-char')) el.innerHTML = label.split('').map((ch, i) => '<span class="kinetic-wave-char" style="animation-delay:' + (i * 90) + 'ms">' + kdEsc(ch) + '</span>').join('');
            return;
        }
        el.setAttribute('data-kd', kind);
        el.setAttribute('data-label', label);
        el.innerHTML = Portable.kdAppletInner(el, kdEsc(label));
        // in an editor an applet is one solid piece: the caret (and Enter) can never land inside its parts
    });
    // in an editor an applet is one solid piece (the caret and Enter never land inside its parts), and one that ends
    // its line gets an invisible spot after it, so the caret (and your typing) lands outside it
    if (root.isContentEditable || (root.closest && root.closest('[contenteditable="true"]'))) {
        root.querySelectorAll('[data-kd]').forEach((el) => {
            el.setAttribute('contenteditable', 'false');
            const next = el.nextSibling;
            if (!next || (next.nodeType === 1 && next.tagName === 'BR')) el.parentNode.insertBefore(document.createTextNode('\u200B'), next);
        });
    }
    inkLayers(root);
    try { pmSweep(); tcSweep(); } catch (e) {}
    try { ensureMath(root); } catch (e) {}
    try { if (window.KeydownNext) window.KeydownNext.apply(root, { editing: root.isContentEditable || (root.closest && !!root.closest('[contenteditable="true"]')) }); } catch (e) {}
    return root;
}

// Keydown text -> HTML (a whole document: headings, lists, tables, math, Skills, applets and every tag)
function draw(text) {
    injectStyles();
    const box = document.createElement('div');
    box.innerHTML = kdDoc.textToHtml(String(text == null ? '' : text));
    upgrade(box);
    return box.innerHTML;
}
// (a document with an @@ink drawing comes in its own .keydown-doc box, which the drawing is anchored to and fills)
function render(text) {
    const html = draw(text);
    return /class="an-ink-layer"/.test(html) ? '<div class="keydown-doc kd-ink-wrap">' + html + '</div>' : html;
}
// HTML (or an element) -> Keydown text, ready to save
function toText(html) {
    return kdDoc.htmlToText(html && html.nodeType === 1 ? html.innerHTML : String(html || ''));
}

// The Skills you can put in a document, with friendly starting values
const SKILLS = [
    { name: 'dice', label: '🎲 Dice', params: { dice: '1d6' } },
    { name: 'timer', label: '⏱️ Focus timer', params: { label: 'Focus', minutes: '25' } },
    { name: 'flashcard', label: '🃏 Flashcard', params: { front: 'Question?', back: 'Answer!' } },
    { name: 'capsule', label: '💊 Time capsule', params: () => ({ label: 'Open me tomorrow', open: String(Date.now() + 864e5), message: 'Hello from yesterday!' }) },
    { name: 'unichip', label: '🔷 Uni-Chip', params: { text: 'Uni-Chip', color: 'blue' } },
    { name: 'customchip', label: '🎨 Custom Chip', params: { text: 'Custom', style: '1', color: '#0ea5e9' } },
    { name: 'sprite', label: '👾 Pixel sprite', params: { size: 'md', pixels: '.....444..444.......4444444444......4444444444.....44444444444444....444444444444.....4444444444......44444444.........444444...........4444.............44..........................................................................' } },
    { name: 'program', label: '🕹️ Program', params: { title: 'Hello' }, body: 'print("Hello from BitLang!")' },
    { name: 'beepbox', label: '🎵 BeepBox song', params: { label: 'BeepBox Song', link: '' } },
    { name: 'jumper', label: '🦘 Jumper', params: () => ({ id: 'j' + Date.now().toString(36), label: 'Jump here' }) },
];
function skillHtml(name, params, body) {
    const def = SKILLS.find((s) => s.name === name) || {};
    const p = Object.assign({}, typeof def.params === 'function' ? def.params() : def.params, params || {});
    return kdDoc.skillHtml(name, p, body !== undefined ? body : def.body || '');
}

// Put HTML where the caret is (or was) in an editor
function insertAt(el, html, range) {
    const sel = window.getSelection();
    let r = range && el.contains(range.startContainer) ? range : (sel.rangeCount && el.contains(sel.anchorNode) ? sel.getRangeAt(0) : null);
    if (!r) { r = document.createRange(); r.selectNodeContents(el); r.collapse(false); }
    r.deleteContents();
    const tpl = document.createElement('template');
    tpl.innerHTML = html + ' ';
    const frag = tpl.content;
    const last = frag.lastChild;
    r.insertNode(frag);
    if (last) { const after = document.createRange(); after.setStartAfter(last); after.collapse(true); sel.removeAllRanges(); sel.addRange(after); }
    upgrade(el);
}

// A live Keydown editor: type tags, and Enter (or Space after a tag) turns them into formatting
function editor(el, opts) {
    opts = opts || {};
    // (one editor per element: asking again hands back the same one)
    if (el.__kdEditor) { if (opts.value !== undefined) el.__kdEditor.setText(opts.value); return el.__kdEditor; }
    injectStyles(el.ownerDocument);
    el.classList.add('keydown-doc');
    if (!el.isContentEditable) el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', opts.spellcheck === false ? 'false' : 'true');
    if (opts.value !== undefined) el.innerHTML = draw(opts.value);
    else if (el.textContent.trim() && !el.children.length) el.innerHTML = draw(el.textContent);
    upgrade(el);
    let lastRange = null, timer = null;
    const changed = () => { clearTimeout(timer); timer = setTimeout(() => { if (typeof opts.onChange === 'function') opts.onChange(toText(el)); }, opts.delay || 250); };
    const format = () => { try { const done = kdDoc.formatLine(el); if (done) { upgrade(el); changed(); } return done; } catch (e) { return false; } };
    const onKeydown = (e) => {
        // ('line': the formatting already used the Enter, like in a table cell or after a new block: no extra line)
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && format() === 'line') e.preventDefault();
    };
    // Space right after a closing tag formats it, like in Writeout and Bitbook
    const onKeyup = (e) => {
        if (e.key !== ' ' || e.isComposing) return;
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return;
        const n = sel.anchorNode;
        const before = n && n.nodeType === 3 ? n.nodeValue.slice(0, sel.anchorOffset).replace(/[\s ]+$/, '') : '';
        if (/[#*~=%!@^_+;`&\]\-$|]$/.test(before)) format();
    };
    // the Skills inside: roll, flip, start/stop, open (BeepBox songs, Programs and applets answer clicks on their own)
    const ACT = [['.fl-chip', flFlip], ['.pm-chip', pmToggle], ['.dc-chip', dcRollChip], ['.tc-chip', tcToggleChip]];
    const chipAt = (t) => { for (const [s, fn] of ACT) { const c = t && t.closest ? t.closest(s) : null; if (c && el.contains(c)) return [c, fn]; } return null; };
    const onMousedown = (e) => { if (chipAt(e.target)) e.preventDefault(); };
    const onClick = (e) => { const hit = chipAt(e.target); if (hit) { e.preventDefault(); hit[1](hit[0]); changed(); } };
    // pasting brings plain text (Keydown in it gets formatted with Enter like anything typed)
    const onPaste = (e) => {
        const t = e.clipboardData && e.clipboardData.getData('text/plain');
        if (t === undefined || t === null) return;
        e.preventDefault();
        document.execCommand('insertText', false, t);
    };
    const onSel = () => { const s = window.getSelection(); if (s.rangeCount && el.contains(s.anchorNode)) lastRange = s.getRangeAt(0).cloneRange(); };
    el.addEventListener('keydown', onKeydown);
    el.addEventListener('keyup', onKeyup);
    el.addEventListener('mousedown', onMousedown);
    el.addEventListener('click', onClick);
    el.addEventListener('paste', onPaste);
    el.addEventListener('input', changed);
    document.addEventListener('selectionchange', onSel);
    // tables get Radii Table's floating toolbar (rows, columns, header, style) and Tab between cells
    try { if (window.RadiiTable) window.RadiiTable.attach(el); } catch (e) {}
    const sweep = setInterval(() => { try { tcSweep(); } catch (e) {} }, 30000);
    const api = el.__kdEditor = {
        el,
        getText: () => toText(el),
        setText: (t) => { el.innerHTML = draw(t); upgrade(el); },
        format,
        insertSkill: (name, params, body) => { const h = skillHtml(name, params, body); if (h) { insertAt(el, h, lastRange); changed(); } return !!h; },
        insertHtml: (h) => { insertAt(el, h, lastRange); changed(); },
        unformat: () => { const n = kdDoc.unformat(el); changed(); return n; },
        reformat: () => { const r = kdDoc.reformat(el); upgrade(el); changed(); return r; },
        exitFormatting: () => kdDoc.exitFormatting(el),
        // the Insert Table window (rows, columns, header row, style, or a sheet from Imbuer), at the caret
        // Annotate: draw on the text with Bitbook's inks (Done or Esc goes back to typing); onStop runs when drawing ends
        annotate: (onStop) => { if (window.AnnotateInk) window.AnnotateInk.start(el, { onStop: () => { changed(); if (typeof onStop === 'function') onStop(); } }); },
        insertTable: () => {
            if (!window.RadiiTable) return;
            el.focus();
            if (lastRange && el.contains(lastRange.startContainer)) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(lastRange); }
            window.RadiiTable.insertIntoEditor(el);
        },
        destroy: () => {
            ['keydown', 'keyup', 'mousedown', 'click', 'paste', 'input'].forEach((t) => el.removeEventListener(t, { keydown: onKeydown, keyup: onKeyup, mousedown: onMousedown, click: onClick, paste: onPaste, input: changed }[t]));
            document.removeEventListener('selectionchange', onSel);
            clearInterval(sweep);
            clearTimeout(timer);
            delete el.__kdEditor;
        },
    };
    return api;
}

/* ---------- The Keydown class (Keydown.js 1.x's API keeps working) ---------- */
class Keydown {
    constructor(options = {}) {
        this.selector = options.selector || '[data-keydown]';
        this.soundEnabled = options.sound !== false;
        if (!this.soundEnabled) Keydown.sound = false;
        // extra tags of your own: [{ open: '~ME~', close: '~ME~', className: 'my-chip' } or tagName: 'mark']
        this.definitions = Array.isArray(options.definitions) ? options.definitions : [];
        this.applets = new Map();
        this.editors = new Map();
        this.initApplets();
        if (options.auto !== false) this.init();
    }

    // Register custom applets: ::name[a, b] or ::name{a, b} anywhere in the text
    registerApplet(name, renderCallback) {
        this.applets.set(name, renderCallback);
    }

    // The 1.x applets (the ::name[...] spelling; whole ::name{...} lines are drawn by the engine)
    initApplets() {
        this.registerApplet('glass', (args) => `<div class="aero-glass-block">${args.join(' ') || 'Glass Header'}</div>`);
        this.registerApplet('bubble', (args) => `<span class="aqua-bubble-text">${args.join(' ') || 'Liquid Stream'}</span>`);
        this.registerApplet('alert', (args) => `<div class="tactile-alert-plate"><div class="alert-icon-orb">!</div> ⚠️ ${args.join(' ') || 'CRITICAL WARNING SYSTEM INITIALIZED'}</div>`);
        this.registerApplet('media', (args) => `<div class="media-track-wrap"><span class="media-track-text">NOW PLAYING: ${args.join(' ') || 'Track_Audio_Stream.wav'}</span><div class="media-control-orb"></div></div>`);
        this.registerApplet('aqua', (args) => `<div class="aqua-aero-box"><div class="aqua-box-content">${args.join(' ') || 'Start typing your aqua summary notes here...'}</div></div>`);
        this.registerApplet('code', (args) => `<div class="writedown-code-block"><div class="code-block-header"><span>CODE SPEC</span></div><pre class="code-block-content">${args.join(' ') || '// Write text lines here...'}</pre></div>`);
        this.registerApplet('emerald', (args) => `<div class="aqua-aero-box aqua-emerald-box"><div class="aqua-box-content">${args.join(' ') || '🌿 Start writing your eco-project logs here...'}</div></div>`);
        this.registerApplet('amber', (args) => `<div class="aqua-aero-box aqua-amber-box"><div class="aqua-box-content">${args.join(' ') || '☀️ Start writing your highlight notes here...'}</div></div>`);
        this.registerApplet('crimson', (args) => `<div class="aqua-aero-box aqua-crimson-box"><div class="aqua-box-content">${args.join(' ') || '🚨 Start writing urgent system tasks here...'}</div></div>`);
        this.registerApplet('amethyst', (args) => `<div class="aqua-aero-box aqua-amethyst-box"><div class="aqua-box-content">${args.join(' ') || '🔮 Start writing creative drafts here...'}</div></div>`);
        this.registerApplet('gsky', (args) => `<div class="aero-glass-panel panel-sky"><div class="glass-panel-header"><span>🔹 SKY COMPONENT</span></div><p class="glass-panel-content">${args.join(' ') || 'Start writing sky log notes here...'}</p></div>`);
        this.registerApplet('gemerald', (args) => `<div class="aero-glass-panel panel-emerald"><div class="glass-panel-header"><span>🌿 ECO COMPONENT</span></div><p class="glass-panel-content">${args.join(' ') || 'Start writing organic project logs here...'}</p></div>`);
        this.registerApplet('divider', () => `<div class="aero-liquid-divider"></div>`);
        this.registerApplet('console', (args) => `<div class="writedown-console-block"><div class="console-block-header"><span>⚠️ SYSTEM DEBUG CONSOLE</span></div><pre class="console-block-content">${args.join(' ') || 'error: Undefined reference tracking index bounds fault.'}</pre></div>`);
        this.registerApplet('gamber', (args) => `<div class="aero-glass-panel panel-amber"><div class="glass-panel-header"><span>☀️ AMBER MATRIX</span></div><p class="glass-panel-content">${args.join(' ') || 'Start writing highlights or bullet specs here...'}</p></div>`);
        this.registerApplet('gcrimson', (args) => `<div class="aero-glass-panel panel-crimson"><div class="glass-panel-header"><span>🚨 ALERT MANIFEST</span></div><p class="glass-panel-content">${args.join(' ') || 'Start writing urgent warning items here...'}</p></div>`);
        this.registerApplet('foldout', (args, content) => {
            // ::foldout[Title, body text here, closed]: the title, the body (commas in it are fine), and "closed" to start shut
            let title = 'TITLE', body = 'TEXT', closed = false;
            const idx = (content || '').indexOf(',');
            if (idx === -1) { if ((content || '').trim()) title = content.trim(); }
            else {
                title = content.slice(0, idx).trim() || 'TITLE';
                body = content.slice(idx + 1).trim() || 'TEXT';
                const lastComma = body.lastIndexOf(',');
                if (lastComma !== -1 && ['closed', 'collapsed', 'close', 'shut'].includes(body.slice(lastComma + 1).trim().toLowerCase())) { closed = true; body = body.slice(0, lastComma).trim() || 'TEXT'; }
            }
            const bodyHTML = body.startsWith('<') ? body : `<p>${body}</p>`;
            return `<div class="aero-foldout-panel${closed ? ' panel-collapsed' : ''}"><div class="foldout-panel-header"><div class="foldout-arrow-orb">▲</div><div class="foldout-panel-title-input">${title}</div></div><div class="foldout-panel-content">${bodyHTML}</div></div>`;
        });
        this.registerApplet('diff', (args) => `<div class="writedown-diff-block"><div class="diff-row-content">${args.join(' ') || '<p class="diff-add">+ function initializeWorkspace() {</p><p class="diff-del">- function setupOldEngine() {</p>'}</div></div>`);
        this.registerApplet('horizon', () => `<div class="writedown-horizon-block"><div class="horizon-pitch-line"></div></div>`);
        this.registerApplet('waypoint', (args) => `<div class="writedown-waypoint-block"><div class="waypoint-block-header"><span>🛰️ FLIGHT WAYPOINT MONITOR</span></div><div class="waypoint-block-content">${args.join(' ') || 'NAV: WP_01 // COORD: 34.1803° N, 118.3090° W // ALT: ~2,400 FT'}</div></div>`);
        this.registerApplet('entry', (args) => `<div class="writedown-journal-entry"><div class="journal-entry-content"><p>${args.join(' ') || "Write today's logs inside the ring binder entry..."}</p></div></div>`);
        this.registerApplet('draw', () => `<div class="writedown-code-block"><div class="code-block-header"><span>SKETCHPAD</span></div><pre class="code-block-content">🎨 Interactive sketchpad lives in Writeout — type ::draw there!</pre></div>`);
    }

    hasValidPair(text, open, close) {
        const a = text.indexOf(open);
        return a !== -1 && text.indexOf(close, a + open.length) !== -1;
    }

    // Keydown text -> HTML: everything the engine knows, plus ::name[...] applets and your own definitions
    parse(text, inPlace) {
        if (!text) return '';
        const store = [];
        const hold = (html) => { store.push(html); return '' + (store.length - 1) + ''; };
        let src = String(text);
        // ::name[...] / ::name{...} applets (a whole ::name{...} line the engine knows stays with the engine)
        src = src.replace(/::([a-zA-Z0-9_-]+)(?:\[([^\]]+)\]|\{([^}]+)\})?/g, (m, name, br, bc, at, all) => {
            const lineStart = all.lastIndexOf('\n', at - 1) + 1, lineEnd = all.indexOf('\n', at);
            const wholeLine = all.slice(lineStart, lineEnd === -1 ? all.length : lineEnd).trim() === m;
            if (br === undefined && wholeLine && kdDoc.blockFromLine(m)) return m;
            if (!this.applets.has(name)) return wholeLine && kdDoc.blockFromLine(m) ? m : (br !== undefined || bc !== undefined ? hold(`<span class="kd-unknown-applet keydown-modifier-${kdEsc(name)}">${kdEsc(br || bc || '')}</span>`) : m);
            const content = (br !== undefined ? br : bc || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            try { return hold(this.applets.get(name)(content ? content.split(',').map((s) => s.trim()) : [], content)); }
            catch (e) { return hold('<span style="color: red;">[Error rendering applet: ' + kdEsc(name) + ']</span>'); }
        });
        // your own tags (new Keydown({ definitions: [...] }))
        this.definitions.forEach((def) => {
            if (!def || !def.open || !def.close || !this.hasValidPair(src, def.open, def.close)) return;
            const re = new RegExp(def.open.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '([\\s\\S]+?)' + def.close.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
            src = src.replace(re, (m, inner) => hold(def.className ? '<span class="' + kdEsc(def.className) + '">' + kdDoc.inlineHtml(inner) + '</span>'
                : '<' + (def.tagName || 'span') + '>' + kdDoc.inlineHtml(inner) + '</' + (def.tagName || 'span') + '>'));
        });
        // (inPlace: going straight into a .keydown-doc element, which anchors any drawing itself)
        let html = inPlace ? draw(src) : render(src);
        for (let k = 0; k < 4 && /\d+/.test(html); k++) html = html.replace(/(\d+)/g, (m, i) => store[+i]);
        return html;
    }

    init() {
        injectStyles();
        document.querySelectorAll(this.selector).forEach((el) => this.bindElement(el));
        this.initFoldoutToggle();
    }

    // Writeout-style foldouts: the arrow orb opens and closes the panel
    initFoldoutToggle() {
        if (Keydown._foldoutWired) return;
        Keydown._foldoutWired = true;
        document.addEventListener('click', (e) => {
            const orb = e.target && e.target.closest ? e.target.closest('.foldout-arrow-orb') : null;
            const panel = orb && orb.closest('.aero-foldout-panel');
            if (!panel) return;
            panel.classList.toggle('panel-collapsed');
            this.blip(panel.classList.contains('panel-collapsed') ? 350 : 650, 0.1);
        });
    }

    blip(frequency = 450, duration = 0.1) {
        if (this.soundEnabled) window.playAeroClickSound(frequency, duration);
    }

    // An editable element becomes a live editor; anything else shows its Keydown drawn
    bindElement(el) {
        if (!el || el.__keydown) return;
        el.__keydown = true;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return; // (inputs keep their raw text)
        if (el.isContentEditable) {
            const raw = el.getAttribute('data-raw') || el.textContent;
            this.editors.set(el, editor(el, { value: raw }));
            return;
        }
        const raw = el.getAttribute('data-raw') || (el.children && el.children.length ? el.innerHTML : el.textContent);
        el.classList.add('keydown-doc');
        el.innerHTML = this.parse(raw, true);
        upgrade(el);
    }
}

Object.assign(Keydown, {
    version: window.__KeydownJS,
    sound: true,
    css: KEYDOWN_CSS,
    injectStyles,
    render,
    toText,
    upgrade,
    editor,
    skills: SKILLS.map((s) => ({ name: s.name, label: s.label })),
    skillHtml,
    guide: () => Portable.kdBuildGuideHTML() + newSyntaxGuide(),
    styleCategories: () => kdDoc.styleCategories(),
    file: { toText: kdDoc.toFileText, fromText: kdDoc.fromFileText, parse: kdDoc.parse },
    doc: kdDoc,
});
window.Keydown = Keydown;

// Like Keydown.js 1.x: every [data-keydown] element is drawn (or made editable) when the page is ready
// (a page that only wants the editors, like KeydownBox.svelte, sets window.__KeydownNoAuto first)
const boot = () => { if (!window.KeydownEngine && !window.__KeydownNoAuto) window.KeydownEngine = new Keydown(); };
// The newer syntax, drawn by the full engine: code blocks and inline code styles, blanks to write in, page numbers and dividers
function newSyntaxGuide() {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows = [
        ['```js{terminal|app.js}\nnpm run build\n```', 'Code block styles: terminal, mac, dark, paper, blueprint, neon, ember, gel, diff (add "lines" for numbers)'],
        ['`ls -la`{terminal}', 'Inline code styles: terminal, dark, paper, blueprint, neon, ember, gel, key'],
        ['Water is made of [__8|hydrogen] and oxygen', 'A blank to write in: [__8] a line 8 characters wide, [__8|answer] hides the answer until clicked'],
        ['Fill the [##6] box', 'The same blank as an empty box: [##6] or [##6|answer]'],
        ['::blank{lines|3|Write here}', 'Room to write: box, dashed, lines, grid or dots, the rows and a label'],
        ['::divider{glass|Title|blue}', 'Dividers: aqua, poolside, dual, notched, swallow, triple, stepped, crest, ticket, gel, glass, rim and more, in 16 colors'],
        ['::pagenumbers{roman|1}', 'Page numbers from this page on: none, arabic, roman, alpha, greek (and upper- versions)'],
    ];
    const preview = (src) => {
        try {
            if (/^::/.test(src)) return (kdDoc.blockFromLine && kdDoc.blockFromLine(src)) || esc(src);
            if (/^```/.test(src)) return kdDoc.textToHtml ? kdDoc.textToHtml(src) : esc(src);
            return kdDoc.inlineHtml(src);
        } catch (e) { return esc(src); }
    };
    return '<div class="kd-guide-group"><div class="kd-guide-title">Code, blanks, dividers and page numbers (' + rows.length + ')</div>'
        + rows.map((r) => '<div class="kd-guide-row"><code>' + esc(r[0]).replace(/\n/g, '<br>') + '</code><span>' + preview(r[0]) + '<small class="kd-guide-hint"> ' + esc(r[1]) + '</small></span></div>').join('')
        + '</div>';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
