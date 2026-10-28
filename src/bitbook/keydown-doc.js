/* keydown-doc.js — one .kd family for Writeout, Bitbook and OpenDB!
   Writeout documents (.kd) and Bitbook notes (.kn) hold the editor's HTML after their header;
   OpenDB entries (.kd) hold Keydown text. This file reads all of them:
   - kdDoc.parse(fileText) splits any of them into { meta, kind: 'html' | 'keydown', body, tabs }!
   - kdDoc.textToHtml(keydown) draws Keydown text as editor HTML (headings, bullets, chips,
     highlights, math, footnotes, [[links]], images and {{templates}})!
   - kdDoc.htmlToText(html) turns editor HTML back into Keydown text, so nothing is lost!
   - kdDoc.toEditorHtml(fileText) opens an OpenDB entry in Writeout or Bitbook (title, summary and all)!
   One identical copy lives in writeout/ and bitbook/, and OpenDB loads the Writeout one! */
(function (root) {
    'use strict';

    // Where OpenDB lives, worked out from this script's own address (works from every app and page)
    const SCRIPT = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
    const OPENDB = SCRIPT ? new URL('../opendb/', SCRIPT).href : '../opendb/';

    // Gel highlights, the Annotator's first three tools: #R#text## #R#text#_ #R#text#~ in its 13 colors!
    const HL_COLORS = [['R', 'red'], ['O', 'orange'], ['GL', 'gold'], ['Y', 'yellow'], ['L', 'lime'], ['G', 'green'], ['TU', 'turquoise'],
        ['T', 'teal'], ['C', 'cyan'], ['B', 'blue'], ['PR', 'purple'], ['PK', 'pink'], ['SL', 'slate']];
    const HL_STYLES = [['##', ''], ['#_', ' an-s-ul'], ['#~', ' an-s-st']];
    const HIGHLIGHTS = [];
    HL_COLORS.forEach(([k, c]) => HL_STYLES.forEach(([close, s]) => HIGHLIGHTS.push(['#' + k + '#', close, 'mark', 'an-hl an-hl-' + c + s])));

    // Writeout's own trigger table: [open, close, tag, classes]
    const TRIGGERS = [
        ['=Y=','=Y=','span','gel-orb gel-y'], ['=R=','=R=','span','gel-orb gel-r'], ['=G=','=G=','span','gel-orb gel-g'], ['=C=','=C=','span','gel-orb gel-c'], ['=B=','=B=','span','gel-orb gel-b'], ['=V=','=V=','span','gel-orb gel-v'],
        ['=P=','=P=','span','gel-orb gel-p'], ['=O=','=O=','span','gel-orb gel-o'], ['=MG=','=MG=','span','gel-orb gel-mg'], ['=LM=','=LM=','span','gel-orb gel-lm'], ['=AQ=','=AQ=','span','gel-orb gel-aq'], ['=SL=','=SL=','span','gel-orb gel-sl'],
        ['&&','&&','span','spark-text'], ['~G~','~G~','span','gel-green-flash'], ['~U~','~U~','span','liquid-underline'], ['~B~','~B~','span','glossy-border-badge'], ['~S~','~S~','span','cyber-glow-spark'], ['~L~','~L~','span','liquid-text-glow'],
        ['~M~','~M~','span','reflected-text-block'], ['~E~','~E~','span','embossed-glass-text'], ['~W~','~W~','span','kinetic-wave-text'], ['`','`','code',''], ['**','**','strong',''], ['*','*','em',''],
        ['!#A#','#','span','aero-tag-chip tag-chip-a'], ['!#G#','#','span','aero-tag-chip tag-chip-g'], ['!#O#','#','span','aero-tag-chip tag-chip-o'], ['!#R#','#','span','aero-tag-chip tag-chip-r'], ['!#PR#','#','span','aero-tag-chip tag-chip-pr'], ['!#PK#','#','span','aero-tag-chip tag-chip-pk'],
        ['!#Y#','#','span','aero-tag-chip tag-chip-y'], ['!#SL#','#','span','aero-tag-chip tag-chip-sl'], ['#C#','#','span','gel-bubble-chip gel-chip-cyan'], ['#O#','#','span','gel-bubble-chip gel-chip-orange'], ['#G#','#','span','gel-bubble-chip gel-chip-green'], ['#R#','#','span','gel-bubble-chip gel-chip-red'],
        ['#PR#','#','span','gel-bubble-chip gel-chip-purple'], ['#PK#','#','span','gel-bubble-chip gel-chip-pink'], ['#Y#','#','span','gel-bubble-chip gel-chip-yellow'], ['#B#','#','span','gel-bubble-chip gel-chip-blue'], ['#L#','#','span','gel-bubble-chip gel-chip-lime'], ['#T#','#','span','gel-bubble-chip gel-chip-teal'],
        ['#GL#','#','span','gel-bubble-chip gel-chip-gold'], ['#SL#','#','span','gel-bubble-chip gel-chip-slate'], ['#W#','#','span','gel-bubble-chip gel-chip-white'], ['#BK#','#','span','gel-bubble-chip gel-chip-black'], ['#FG#','#','span','gel-bubble-chip gel-chip-fog'], ['#TU#','#','span','gel-bubble-chip gel-chip-turquoise'],
        ['~WD~','~WD~','span','gel-chip-waterdrop'], ['~SF~','~SF~','span','gel-chip-solarflare'], ['~AW~','~AW~','span','gel-chip-aurorawave'], ['~FN~','~FN~','span','applet-foldout-tab'], ['~TS~','~TS~','span','applet-aqua-switch'], ['~SM~','~SM~','span','applet-glass-stamp'],
        ['~TB~','~TB~','span','applet-state-button state-green'], ['~VD~','~VD~','span','applet-volume-dial'], ['~BC~','~BC~','span','applet-battery-cell'], ['~CD~','~CD~','span','applet-calendar-desk'], ['~SR~','~SR~','span','applet-star-rating'], ['~CC~','~CC~','span','applet-counter-badge'],
        ['~LK~','~LK~','span','applet-security-latch'], ['~PR~','~PR~','span','applet-playback-ribbon'], ['~CR~','~CR~','span','applet-cpu-gauge'], ['~SI~','~SI~','span','applet-stepper-mesh'], ['~MP~','~MP~','span','effect-mercury-pearl'], ['~PG~','~PG~','span','effect-prism-refract'],
        ['~CB~','~CB~','span','effect-screen-cavity'], ['~SR~','~SR~','span','effect-sunlight-ray'], ['~OA~','~OA~','span','effect-abyssal-plate'], ['~MM~','~MM~','span','effect-metallic-mesh'], ['~FE~','~FE~','span','effect-fluid-expand'], ['~MR~','~MR~','span','effect-metric-cavity'],
        ['~PO~','~PO~','span','effect-pearl-orb'], ['~LF~','~LF~','span','effect-lens-flare'], ['~DS~','~DS~','span','effect-drop-shadow-window'], ['~GL~','~GL~','span','effect-glow-tube'], ['~HB~','~HB~','span','effect-hardware-bevel'], ['~IS~','~IS~','span','effect-screen-segment'],
        ['~GC~','~GC~','span','effect-gel-capsule'], ['~KO~','~KO~','span','effect-fluid-orbit'], ['~XG~','~XG~','span','effect-xray-glass'], ['~ORB~','~ORB~','span','applet-hydro-orb orb-blue'], ['~WL~','~WL~','span','effect-waveform-line'], ['~PM~','~PM~','span','effect-plasma-gel'],
        ['~SLS~','~SLS~','span','applet-lock-slider'], ['~VM~','~VM~','span','applet-gadget-clock'], ['~WB~','~WB~','span','effect-water-bubble'], ['~GLO~','~GLO~','span','effect-glow-tracer'], ['~MT~','~MT~','span','applet-metal-trigger'], ['~IC~','~IC~','span','applet-inset-check'],
        ['~ST~','~ST~','span','effect-shimmer-title'], ['~WD-Y~','~','span','droplet-amber'], ['~WD-R~','~','span','droplet-crimson'], ['~WD-PK~','~','span','droplet-fuchsia'], ['~WD-PR~','~','span','droplet-amethyst'], ['~WD-O~','~','span','droplet-tangerine'],
        ['~WD-SL~','~','span','droplet-slate'], ['~FUNC~','~FUNC~','span','dev-chip-function'], ['~VAR~','~VAR~','span','dev-chip-variable'], ['~HEX~','~HEX~','span','dev-chip-hex'], ['~STR~','~STR~','span','dev-chip-string'], ['~RS~','~RS~','span','av-chip-radar-sweep'],
        ['~HD~','~HD~','span','av-chip-heading'], ['~AL~','~AL~','span','av-chip-altimeter'], ['~SG~','~SG~','span','av-chip-signal'], ['~PP-C~','~','span','megachip-plasma plasma-cyan'], ['~PP-O~','~','span','megachip-plasma plasma-orange'], ['~PP-R~','~','span','megachip-plasma plasma-crimson'],
        ['~PP-L~','~','span','megachip-plasma plasma-lime'], ['~GB-B~','~','span','megachip-glass-bracket bracket-blue'], ['~GB-PR~','~','span','megachip-glass-bracket bracket-amethyst'], ['~GB-PK~','~','span','megachip-glass-bracket bracket-fuchsia'], ['~GB-Y~','~','span','megachip-glass-bracket bracket-amber'], ['~CN-SL~','~','span','megachip-circuit-node circuit-slate'],
        ['~CN-T~','~','span','megachip-circuit-node circuit-teal'], ['~CN-GL~','~','span','megachip-circuit-node circuit-gold'], ['~CN-R~','~','span','megachip-circuit-node circuit-ruby'], ['~DR~','~DR~','span','jr-chip-date-plate'], ['~MD~','~MD~','span','jr-chip-mood'], ['~VO~','~VO~','span','jr-chip-voice-tag'],
        ['~WX~','~WX~','span','jr-chip-weather'], ['~WS~','~WS~','span','jr-chip-wax-stamp'], ['~B-B~','~','span','aero-glass-badge-chip badge-frame-sky'], ['~B-G~','~','span','aero-glass-badge-chip badge-frame-emerald'], ['~B-O~','~','span','aero-glass-badge-chip badge-frame-orange'], ['~B-R~','~','span','aero-glass-badge-chip badge-frame-crimson'],
        ['~B-PR~','~','span','aero-glass-badge-chip badge-frame-amethyst'], ['~B-Y~','~','span','aero-glass-badge-chip badge-frame-gold'], ['~TL~','~TL~','span','effect-tinted-lens'], ['~NO~','~NO~','span','applet-neon-node node-cyan'], ['~SL~','~SL~','span','effect-audio-stream-loop'], ['~BG~','~BG~','span','effect-biogel-capsule'],
        ['~LS~','~LS~','span','applet-latch-toggle'], ['~TIM~','~TIM~','span','applet-gadget-system-clock'], ['~FT~','~FT~','span','jr-folder-tab'], ['~PT~','~PT~','span','jr-progress-capsule'], ['~MC~','~MC~','span','jr-digital-counter'], ['~RD~','~RD~','span','jr-dot-matrix'],
        ['~LL~','~ST~','span','jr-latch-lock'], ['~WR~','~WR~','span','effect-neon-ribbon'], ['~DH-B~','~','span','aero-duplex-input-chassis duplex-chassis-sky'], ['~DH-G~','~','span','aero-duplex-input-chassis duplex-chassis-emerald'], ['~DH-O~','~','span','aero-duplex-input-chassis duplex-chassis-orange'], ['~DH-PR~','~','span','aero-duplex-input-chassis duplex-chassis-amethyst'],
        ['~SH-B~','~','span','gel-chip-swayed swayed-sky'], ['~SH-G~','~','span','gel-chip-swayed swayed-emerald'], ['~SH-O~','~','span','gel-chip-swayed swayed-orange'], ['~SH-PR~','~','span','gel-chip-swayed swayed-amethyst'], ['~PH-B~','~','span','gel-chip-pill-variant pill-sky'], ['~PH-G~','~','span','gel-chip-pill-variant pill-emerald'],
        ['~PH-O~','~','span','gel-chip-pill-variant pill-orange'], ['~PH-PR~','~','span','gel-chip-pill-variant pill-amethyst'], ['~PC-Y~','~','span','gel-chip-pastel pastel-yellow'], ['~PC-B~','~','span','gel-chip-pastel pastel-blue'], ['~PC-G~','~','span','gel-chip-pastel pastel-green'], ['~PC-PK~','~','span','gel-chip-pastel pastel-pink'],
        ['~PC-PR~','~','span','gel-chip-pastel pastel-purple'], ['~PC-O~','~','span','gel-chip-pastel pastel-orange'], ['~DR-O~','~','span','gel-chip-droplet-ribbon droplet-ribbon-tangerine'], ['~DR-Y~','~','span','gel-chip-droplet-ribbon droplet-ribbon-citrus'], ['~DR-G~','~','span','gel-chip-droplet-ribbon droplet-ribbon-emerald'], ['~DR-B~','~','span','gel-chip-droplet-ribbon droplet-ribbon-sapphire'],
        ['~DR-PR~','~','span','gel-chip-droplet-ribbon droplet-ribbon-amethyst'], ['~DR-PK~','~','span','gel-chip-droplet-ribbon droplet-ribbon-fuchsia'], ['~DR-R~','~','span','gel-chip-droplet-ribbon droplet-ribbon-crimson'], ['~DR-SL~','~','span','gel-chip-droplet-ribbon droplet-ribbon-slate'], ['~H1~','~H1~','span','header-1'], ['~H2~','~H2~','span','header-2'],
        ['~H3~','~H3~','span','header-3'], ['~BQ~','~BQ~','span','blockquote-list'], ['~BUL~','~BUL~','span','bulleted-list'], ['~MH~','~MH~','span','mega-header'],
    ];
    // longest openers first (so ** beats * and !#R# beats #R#); highlights go before all of them, each with its NEAREST ending
    const ORDER = TRIGGERS.slice().sort((a, b) => b[0].length - a[0].length);
    const HL_RE = new RegExp('#(' + HL_COLORS.map((x) => x[0]).sort((a, b) => b.length - a.length).join('|') + ')#([^#]+?)#([#_~])', 'g');
    const classKey = (cls) => String(cls || '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
    const BY_CLASS = new Map();
    TRIGGERS.concat(HIGHLIGHTS).forEach((d) => { if (d[3] && !BY_CLASS.has(classKey(d[3]))) BY_CLASS.set(classKey(d[3]), d); });

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'note';

    // Short notices for OpenDB's {{templates}}, so Writeout and Bitbook show what they mean!
    const NOTICES = {
        'stub': '🌱 This is a stub: it could be expanded!', 'more citations': '📚 This needs more sources!', 'unreferenced': '❓ This does not cite any sources yet!',
        'file improvement': '🖼️ This file could be improved!', 'images needed': '📷 This needs images!', 'image needed': '📷 This needs images!', 'cleanup': '🧹 This may need cleanup!', 'copy edit': '✏️ This may need copy editing!',
        'too technical': '🔬 This may be too technical for most readers!', 'outdated': '⏳ Parts of this may be out of date!', 'disputed': '⚠️ The accuracy of this is disputed!',
        'expand': '➕ This section needs more detail!', 'orphan': '🔗 No other entries link here yet!', 'in use': '🚧 This is being written right now!',
        'merge': '🔀 It has been suggested that this be merged with another entry!',
    };
    const INLINE_TAGS = { 'citation needed': 'citation needed', 'cn': 'citation needed', 'fact': 'citation needed', 'clarify': 'clarification needed', 'dubious': 'dubious',
        'vague': 'vague', 'when': 'when?', 'who': 'who?', 'which': 'which?', 'page needed': 'page needed' };
    const tplName = (raw) => String(raw).split('|')[0].trim().toLowerCase().replace(/[\s_-]+/g, ' ');
    function tplHtml(raw, block) {
        const name = tplName(raw);
        const args = String(raw).split('|').slice(1).map((s) => s.trim()).filter(Boolean);
        let text = INLINE_TAGS[name] ? '[' + INLINE_TAGS[name] + ']' : NOTICES[name];
        if (!text && /^(main|see also|further|distinguish|about)$/.test(name)) text = '↪ ' + name.replace(/^./, (c) => c.toUpperCase()) + ': ' + args.join(', ');
        if (!text) text = '⚑ {{' + raw + '}}';
        else if (args.length && NOTICES[name]) text += ' (' + args.join(', ') + ')';
        const tag = block ? 'div' : 'span';
        return '<' + tag + ' class="kd-tpl' + (block ? ' kd-tpl-block' : '') + '" data-kd-tpl="' + esc(raw) + '" contenteditable="false">' + esc(text) + '</' + tag + '>';
    }

    function mathHtml(tex, display) {
        const inner = typeof root.kdMathHTML === 'function' ? root.kdMathHTML(tex, display) : '<code class="kd-math-src">' + esc((display ? '$$' : '$') + tex + (display ? '$$' : '$')) + '</code>';
        const tag = display ? 'div' : 'span';
        return '<' + tag + ' class="kd-math' + (display ? ' kd-math-display' : '') + '" contenteditable="false" data-tex="' + esc(tex) + '" data-display="' + (display ? '1' : '0') + '" title="Double-click to edit this equation!">' + inner + '</' + tag + '>';
    }

    /* ---------- Keydown text -> editor HTML ---------- */
    // opts: { title(id) -> a title for [[id]] links, media(id) -> an image address or null, notes: { count } }
    function inline(text, opts) {
        const store = [];
        const stash = (html) => { store.push(html); return '\u0001' + (store.length - 1) + '\u0001'; };
        let s = String(text);
        // `code` is taken literally, so nothing inside it turns into links, math or chips
        s = s.replace(/`([^`\n]+)`/g, (_, t) => stash('<code>' + esc(t) + '</code>'));
        s = s.replace(/\\\$/g, () => stash('$'));
        s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash(mathHtml(t.trim(), true)));
        s = s.replace(/(^|[^\w$])\$(?=\S)([^$\n]*?\S)\$(?![\w$])/g, (_, pre, t) => pre + stash(mathHtml(t, false)));
        s = s.replace(/\{\{([^{}]+)\}\}/g, (_, raw) => stash(tplHtml(raw, false)));
        // [[id]] shows the entry's title; data-kd-auto remembers that, so it saves back as [[id]] (unless you change the words)
        s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
            const text = label || (opts.title && opts.title(id)) || id;
            return stash('<a class="kd-link" data-kd-link="' + id + '"' + (label ? '' : ' data-kd-auto="' + esc(text) + '"') + ' href="' + OPENDB + '#/e/' + id + '" target="_blank" rel="noopener">' + esc(text) + '</a>');
        });
        s = s.replace(/\[\^([^\]\s][^\]]*)\]/g, (_, label) => {
            const n = (opts.notes[slug(label)] = (opts.notes[slug(label)] || 0) + 1);
            return stash('<a class="kd-footnote-ref" id="fnref-' + slug(label) + '-' + n + '" href="#fn-' + slug(label) + '" spellcheck="false">' + esc(label) + '</a>');
        });
        s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|#)[^)\s]+)\)/g, (_, t, u) => stash('<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>'));
        // Keydown triggers: the inside of each goes through the triggers too, so a highlight can hold bold or a chip!
        const triggers = (str) => {
            // (a fresh copy each time: the same /g pattern used again inside its own replace would loop forever)
            str = str.replace(new RegExp(HL_RE), (m, k, body, end) => stash('<mark class="an-hl an-hl-' + HL_COLORS.find((x) => x[0] === k)[1] +
                (end === '_' ? ' an-s-ul' : end === '~' ? ' an-s-st' : '') + '" spellcheck="false">\u0002' + triggers(body.trim()) + '\u0003</mark>'));
            ORDER.forEach(([open, close, tag, cls]) => {
                let at = str.indexOf(open);
                while (at !== -1) {
                    const end = str.indexOf(close, at + open.length);
                    if (end === -1) break;
                    const body = str.slice(at + open.length, end).trim();
                    if (!body) { at = str.indexOf(open, at + open.length); continue; }
                    str = str.slice(0, at) + stash('<' + tag + (cls ? ' class="' + cls + '" spellcheck="false"' : '') + '>\u0002' + triggers(body) + '\u0003</' + tag + '>') + str.slice(end + close.length);
                    at = str.indexOf(open);
                }
            });
            return str;
        };
        s = triggers(s);
        // escape what is left as plain text, then put the stashed pieces back (a trigger's inside is drawn the same way, so they can nest)
        const render = (raw) => esc(raw).replace(/\u0001(\d+)\u0001/g, (_, i) => store[+i].replace(/\u0002([\s\S]*?)\u0003/g, (__, inner) => render(inner)));
        return render(s);
    }

    function textToHtml(src, opts) {
        opts = Object.assign({ notes: {} }, opts || {});
        const lines = String(src || '').replace(/\r/g, '').split('\n');
        const out = [];
        let list = null;
        const endList = () => { if (list) { out.push('<ul class="bulleted-list">' + list.join('') + '</ul>'); list = null; } };
        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();
            let m;
            if (/^```/.test(t)) {
                endList();
                const body = [];
                for (i++; i < lines.length && !/^```/.test(lines[i].trim()); i++) body.push(lines[i]);
                out.push('<pre><code>' + esc(body.join('\n')) + '</code></pre>');
                continue;
            }
            if ((m = /^\*\s+(\S.*)$/.exec(t))) { (list = list || []).push('<li>' + inline(m[1], opts) + '</li>'); continue; }
            endList();
            if (!t) { out.push('<div><br></div>'); continue; }
            if ((m = /^\{\{([^{}]+)\}\}$/.exec(t)) && !INLINE_TAGS[tplName(m[1])]) { out.push(tplHtml(m[1], true)); continue; }
            if ((m = /^(#{1,4})\s+(\S.*)$/.exec(t))) {
                const n = m[1].length;
                out.push(n === 4 ? '<h1 class="mega-header">' + inline(m[2], opts) + '</h1>' : '<h' + n + ' class="header-' + n + '">' + inline(m[2], opts) + '</h' + n + '>');
                continue;
            }
            if ((m = /^>\s+(\S.*)$/.exec(t))) { out.push('<blockquote class="blockquote-list">' + inline(m[1], opts) + '</blockquote>'); continue; }
            if ((m = /^\[\^([^\]\s][^\]]*)\]:\s*(.*)$/.exec(t))) {
                out.push('<div class="kd-footnote-def" id="fn-' + slug(m[1]) + '"><span class="kd-footnote-tag">' + esc(m[1]) + '</span> <span class="kd-footnote-text">' + inline(m[2], opts) + '</span></div>');
                continue;
            }
            if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
                const target = m[2];
                const src2 = target.startsWith('media:') ? (opts.media && opts.media(target.slice(6))) : (/^https:\/\//.test(target) ? target : null);
                out.push('<figure class="kd-figure" data-kd-media="' + esc(target) + '" contenteditable="false">' + (src2 ? '<img src="' + esc(src2) + '" alt="' + esc(m[1]) + '">' : '') +
                    '<figcaption>' + esc(m[1] || target) + '</figcaption></figure>');
                continue;
            }
            if (/^\$\$[\s\S]*\$\$$/.test(t)) { out.push(mathHtml(t.slice(2, -2).trim(), true)); continue; }
            out.push('<div>' + inline(t, opts) + '</div>');
        }
        endList();
        return out.join('');
    }

    /* ---------- editor HTML -> Keydown text ---------- */
    const BLOCK = /^(P|DIV|H1|H2|H3|H4|H5|H6|UL|OL|LI|BLOCKQUOTE|PRE|FIGURE|TABLE|SECTION|ARTICLE|HR)$/;
    function inlineText(node) {
        if (node.nodeType === 3) return node.nodeValue.replace(/​/g, '').replace(/\$/g, '\\$').replace(/ /g, ' ');
        if (node.nodeType !== 1) return '';
        const el = node;
        const kids = () => Array.from(el.childNodes).map(inlineText).join('');
        const tag = el.tagName;
        if (el.hasAttribute('data-kd-tpl')) return '{{' + el.getAttribute('data-kd-tpl') + '}}';
        if (el.classList.contains('kd-math')) {
            const tex = el.getAttribute('data-tex') || '';
            return el.getAttribute('data-display') === '1' ? '$$' + tex + '$$' : '$' + tex + '$';
        }
        if (tag === 'BR') return '\n';
        if (tag === 'IMG') {
            const src = el.getAttribute('src') || '';
            return /^https:\/\//.test(src) ? '![' + (el.getAttribute('alt') || '') + '](' + src + ')' : '';
        }
        if (tag === 'A') {
            if (el.classList.contains('kd-footnote-ref')) return '[^' + el.textContent.trim() + ']';
            if (el.classList.contains('kd-footnote-back')) return '';
            const id = el.getAttribute('data-kd-link');
            if (id) { const t = el.textContent.trim(); return '[[' + id + (t && t !== id && t !== el.getAttribute('data-kd-auto') ? '|' + t : '') + ']]'; }
            const href = el.getAttribute('href') || '';
            return /^(https?:|mailto:)/.test(href) ? '[' + kids() + '](' + href + ')' : kids();
        }
        if (tag === 'STRONG' || tag === 'B') return wrap('**', kids());
        if (tag === 'EM' || tag === 'I') return wrap('*', kids());
        if (tag === 'CODE') return wrap('`', el.textContent);
        if (tag === 'MARK' && el.classList.contains('an-hl')) {
            const color = (Array.from(el.classList).find((c) => /^an-hl-/.test(c)) || 'an-hl-yellow').slice(6);
            const code = (HL_COLORS.find((x) => x[1] === color) || [])[0];
            const style = el.classList.contains('an-s-ul') ? '#_' : el.classList.contains('an-s-st') ? '#~' : (Array.from(el.classList).some((c) => /^an-s-/.test(c)) ? null : '##');
            return code && style ? '#' + code + '#' + kids() + style : kids();
        }
        const d = el.className ? BY_CLASS.get(classKey(el.className)) : null;
        if (d && d[2] === 'span') {
            const label = el.getAttribute('data-label') || (el.querySelector('span') && !/^(gel-|aero-tag|spark|liquid|glossy|cyber|embossed)/.test(d[3]) ? el.querySelector('span').textContent : el.textContent);
            return d[0] + String(label).replace(/​/g, '').trim() + d[1];
        }
        return kids();
    }
    // **x** keeps its spaces outside the markers, so "a **b** c" stays readable
    function wrap(mark, t) {
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t);
        return m[2] ? m[1] + mark + m[2] + mark + m[3] : t;
    }

    // a block's contents (its own classes are the block, like header-2, so they never become triggers)
    const kidsText = (el) => Array.from(el.childNodes).map(inlineText).join('');

    function htmlToText(html) {
        const box = document.createElement('div');
        box.innerHTML = String(html || '');
        const lines = [];
        let cur = '';
        const flush = () => { if (cur.trim() !== '') cur.split('\n').forEach((l) => lines.push(l.trim())); cur = ''; };
        const push = (line) => { flush(); lines.push(line); };
        function walk(node) {
            if (node.nodeType === 3) { cur += inlineText(node); return; }
            if (node.nodeType !== 1) return;
            const el = node, tag = el.tagName;
            if (el.classList.contains('kd-meta') || /^(SCRIPT|STYLE|TEMPLATE)$/.test(tag)) return;
            if (el.hasAttribute('data-kd-tpl') && el.classList.contains('kd-tpl-block')) { push('{{' + el.getAttribute('data-kd-tpl') + '}}'); return; }
            if (el.classList.contains('kd-math') && el.getAttribute('data-display') === '1') { push('$$' + (el.getAttribute('data-tex') || '') + '$$'); return; }
            if (el.hasAttribute('data-kd-media')) {
                const cap = el.querySelector('figcaption');
                const target = el.getAttribute('data-kd-media');
                push('![' + (cap && cap.textContent !== target ? cap.textContent.trim() : '') + '](' + target + ')');
                return;
            }
            if (el.classList.contains('kd-footnote-def')) {
                const tagEl = el.querySelector('.kd-footnote-tag'), textEl = el.querySelector('.kd-footnote-text');
                push('[^' + (tagEl ? tagEl.textContent.trim() : slug(el.id.replace(/^fn-/, ''))) + ']: ' + (textEl ? inlineText(textEl).trim() : ''));
                return;
            }
            if (/^H[1-6]$/.test(tag)) {
                const n = el.classList.contains('mega-header') ? 4 : Math.min(3, +tag[1]);
                push('#'.repeat(n) + ' ' + kidsText(el).replace(/\n+/g, ' ').trim());
                return;
            }
            if (tag === 'UL' || tag === 'OL') {
                Array.from(el.querySelectorAll('li')).forEach((li) => {
                    const t = Array.from(li.childNodes).filter((c) => !(c.nodeType === 1 && /^(UL|OL)$/.test(c.tagName))).map(inlineText).join('').replace(/\n+/g, ' ').trim();
                    if (t) push('* ' + t);
                });
                return;
            }
            if (tag === 'BLOCKQUOTE') { push('> ' + kidsText(el).replace(/\n+/g, ' ').trim()); return; }
            if (tag === 'PRE') { flush(); lines.push('```'); el.textContent.replace(/\n$/, '').split('\n').forEach((l) => lines.push(l)); lines.push('```'); return; }
            if (tag === 'HR') { push(''); return; }
            if (BLOCK.test(tag)) {
                flush();
                const hasBlocks = Array.from(el.children).some((c) => BLOCK.test(c.tagName) || c.classList.contains('kd-math-display') || c.hasAttribute('data-kd-media'));
                if (hasBlocks) { Array.from(el.childNodes).forEach(walk); flush(); return; }
                const t = kidsText(el).replace(/\s+$/, '');
                if (t.trim() === '') lines.push('');
                else t.split('\n').forEach((l) => lines.push(l.trim()));
                return;
            }
            cur += inlineText(el);
        }
        Array.from(box.childNodes).forEach(walk);
        flush();
        return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    /* ---------- Files ---------- */
    function parseValue(v) {
        v = String(v).trim();
        if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch (e) { return v.slice(1, -1).replace(/\\"/g, '"'); } }
        if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
        return v;
    }
    function parseTabs(text) {
        const marker = '\n---tabs---\n';
        const idx = text.indexOf(marker);
        if (idx === -1) return { html: text, tabs: null };
        const tabs = [];
        let cur = null;
        text.substring(idx + marker.length).split('\n').forEach((ln) => {
            let m = /^\s*-\s*name:\s*(.*)\s*$/.exec(ln);
            if (m) { cur = { name: '', html: '' }; tabs.push(cur); try { cur.name = JSON.parse(m[1]); } catch (e) { cur.name = m[1]; } return; }
            m = /^\s*html:\s*(.*)\s*$/.exec(ln);
            if (m && cur) { try { cur.html = JSON.parse(m[1]); } catch (e) { cur.html = m[1]; } }
        });
        return { html: text.substring(0, idx), tabs: tabs.length ? tabs : null };
    }
    // Any .kd or .kn file: { meta, kind, body, tabs }
    function parse(fileText) {
        const text = String(fileText || '').replace(/^﻿/, '').replace(/\r\n/g, '\n');
        const meta = { infobox: {} };
        let body = text;
        const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
        if (m) {
            m[1].split('\n').forEach((line) => {
                const kv = /^([A-Za-z][\w .-]*?):\s?(.*)$/.exec(line);
                if (!kv) return;
                const key = kv[1].trim();
                if (key.startsWith('infobox.')) meta.infobox[key.slice(8)] = String(parseValue(kv[2]));
                else meta[key] = parseValue(kv[2]);
            });
            body = m[2];
        }
        const keydown = meta.format === 'keydown-text' || (!!meta.id && !!meta.type && !meta.page_size) || (!m && !/<[a-z][\s\S]*>/i.test(text));
        if (keydown) return { meta, kind: 'keydown', body: body.trim(), tabs: null };
        const t = parseTabs(body.trim());
        return { meta, kind: 'html', body: t.html.trim(), tabs: t.tabs };
    }
    const isKeydownText = (fileText) => parse(fileText).kind === 'keydown';

    // OpenDB's index, for entry titles and media files (loaded once, only when needed)
    let indexP = null;
    function opendbIndex() {
        if (!indexP) indexP = fetch(OPENDB + 'data/index.json').then((r) => (r.ok ? r.json() : { entries: [] })).catch(() => ({ entries: [] }));
        return indexP;
    }
    // An OpenDB entry, ready for Writeout's or Bitbook's editor: title, summary, then the text!
    function toEditorHtml(fileText) {
        const doc = parse(fileText);
        const needIndex = /\[\[|media:/.test(doc.body);
        return (needIndex ? opendbIndex() : Promise.resolve({ entries: [] })).then((index) => {
            const byId = new Map((index.entries || []).map((e) => [e.id, e]));
            const opts = {
                title: (id) => (byId.get(id) || {}).title,
                media: (id) => { const e = byId.get(id); return e && e.file ? OPENDB + 'data/' + e.file : null; },
            };
            const meta = doc.meta;
            const keep = {};
            Object.keys(meta).forEach((k) => { if (!/^(format|app|exported_at)$/.test(k)) keep[k] = meta[k]; });
            return (Object.keys(keep).length > 1 || Object.keys(meta.infobox || {}).length ? '<div class="kd-meta" hidden data-kd-meta="' + esc(JSON.stringify(keep)) + '"></div>' : '') +
                (meta.title ? '<h1 class="header-1" data-kd-title="1">' + esc(meta.title) + '</h1>' : '') +
                (meta.summary ? '<div data-kd-summary="1"><em>' + esc(meta.summary) + '</em></div><div><br></div>' : '') +
                (meta.abstract ? '<blockquote class="blockquote-list" data-kd-abstract="1">' + esc(meta.abstract) + '</blockquote>' : '') +
                textToHtml(doc.body, opts);
        });
    }
    // The other way: any .kd/.kn file as an OpenDB entry draft { title, summary, body, ...meta }
    const clean = (t) => String(t || '').replace(/[\u200B\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
    function toEntry(fileText) {
        const doc = parse(fileText);
        if (doc.kind === 'keydown') return Object.assign({}, doc.meta, { body: doc.body });
        const parts = doc.tabs && doc.tabs.length > 1 ? doc.tabs : [{ name: '', html: doc.tabs ? doc.tabs[0].html : doc.body }];
        const box = document.createElement('div');
        box.innerHTML = parts.map((p) => (p.name && parts.length > 1 ? '<h2>' + esc(p.name) + '</h2>' : '') + p.html).join('');
        let entry = {};
        const metaEl = box.querySelector('.kd-meta[data-kd-meta]');
        if (metaEl) { try { entry = JSON.parse(metaEl.getAttribute('data-kd-meta')) || {}; } catch (e) { entry = {}; } metaEl.remove(); }
        const titleEl = box.querySelector('[data-kd-title]') || (box.firstElementChild && /^H1$/.test(box.firstElementChild.tagName) ? box.firstElementChild : null);
        if (titleEl) { entry.title = clean(titleEl.textContent); titleEl.remove(); }
        const sumEl = box.querySelector('[data-kd-summary]');
        if (sumEl) { entry.summary = clean(sumEl.textContent); const gap = sumEl.nextElementSibling; sumEl.remove(); if (gap && gap.tagName === 'DIV' && !gap.textContent.trim() && !gap.querySelector('img')) gap.remove(); }
        const absEl = box.querySelector('[data-kd-abstract]');
        if (absEl) { entry.abstract = clean(absEl.textContent); absEl.remove(); }
        if (!entry.summary && doc.meta.note_info) entry.summary = String(doc.meta.note_info).split('\n')[0].slice(0, 300);
        entry.body = htmlToText(box.innerHTML);
        return entry;
    }

    /* ---------- Enter at the end of a line: every Keydown tag on it becomes its formatting, in place ---------- */
    const LINE_BLOCK = /^(DIV|P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|UL|OL|TABLE|FIGURE)$/;
    const SKIP = 'code, pre, a, .kd-math, .kd-tpl, [contenteditable="false"]';
    function formatLine(canvas) {
        const sel = window.getSelection();
        if (!canvas || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
        const r = sel.getRangeAt(0);
        if (!canvas.contains(r.startContainer)) return false;
        // the line: the block around the caret, or (text sitting right in the canvas) the run of inline nodes around it
        let block = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
        while (block && block !== canvas && !LINE_BLOCK.test(block.tagName)) block = block.parentElement;
        if (!block) return false;
        let nodes;
        if (block === canvas) {
            let top = r.startContainer;
            while (top.parentNode !== canvas) top = top.parentNode;
            const inline = (n) => n && !(n.nodeType === 1 && (n.tagName === 'BR' || LINE_BLOCK.test(n.tagName))) && !(n.nodeType === 3 && /\n/.test(n.nodeValue));
            let first = top, last = top;
            while (inline(first.previousSibling)) first = first.previousSibling;
            while (inline(last.nextSibling)) last = last.nextSibling;
            nodes = [];
            for (let n = first; n; n = n.nextSibling) { nodes.push(n); if (n === last) break; }
        } else {
            nodes = Array.from(block.childNodes);
        }
        if (!nodes.length) return false;
        // only at the END of the line (an Enter in the middle just splits it, like always)
        const rest = document.createRange();
        rest.setStart(r.startContainer, r.startOffset);
        rest.setEndAfter(nodes[nodes.length - 1]);
        if (rest.toString().replace(/[\s\u200B\u00A0]/g, '') !== '') return false;
        const texts = [];
        nodes.forEach((n) => {
            if (n.nodeType === 3) texts.push(n);
            else if (n.nodeType === 1 && !n.matches(SKIP)) {
                const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
                for (let t = w.nextNode(); t; t = w.nextNode()) if (!(t.parentElement && t.parentElement.closest(SKIP))) texts.push(t);
            }
        });
        let changed = false;
        texts.forEach((t) => {
            const text = t.nodeValue;
            if (!/[#*=~`&$[{!]/.test(text)) return;
            const html = inline(text, { notes: {} });
            if (html === esc(text)) return;
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            t.parentNode.replaceChild(tpl.content, t);
            changed = true;
        });
        if (!changed) return false;
        // the caret goes after the line's last piece (outside any new chip), ready for the new line
        const lastNode = block === canvas ? nodes.filter((n) => n.isConnected).pop() || null : block.lastChild;
        const holder = document.createTextNode('');
        if (lastNode && lastNode.parentNode) lastNode.parentNode.insertBefore(holder, lastNode.nextSibling);
        else block.appendChild(holder);
        const caret = document.createRange();
        caret.setStart(holder, 0);
        caret.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caret);
        return true;
    }

    // How OpenDB's pieces look inside Writeout and Bitbook's editor
    if (typeof document !== 'undefined' && document.head && !document.getElementById('kd-doc-style')) {
        const st = document.createElement('style');
        st.id = 'kd-doc-style';
        st.textContent = '.kd-tpl{display:inline-block;padding:0 6px;border-radius:999px;font-size:.8em;font-style:italic;background:rgba(56,189,248,.14);color:#0369a1;user-select:none}' +
            '.kd-tpl-block{display:block;margin:6px 0;padding:8px 12px;border-radius:10px;border-left:6px solid #f28500;background:#fff9f2;color:#5b3a00;font-style:normal;font-size:.95em}' +
            '.kd-figure{margin:10px 0;text-align:center}.kd-figure img{max-width:100%;border-radius:10px}.kd-figure figcaption{font-size:.85em;opacity:.75;margin-top:4px}';
        document.head.appendChild(st);
    }

    root.kdDoc = { parse, isKeydownText, formatLine, textToHtml, htmlToText, toEditorHtml, toEntry, HL_COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
