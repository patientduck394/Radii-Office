/* =====================================================================
   Omicron's Sway layout! A teal ribbon (Home, Insert, Design, View, Help),
   a File screen with a ZIP export (index.html + Style.css), Bitbook note
   import (Tags + Skills included!), the Marketplace Keydown packs, and
   Omicron Classic one click away in Settings!
   Loaded after app.js and office-shell.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof elementsList === 'undefined') return;
    const OS = window.OfficeShell;
    const page = document.getElementById('wysiwyg-page');
    const PREF_KEY = 'omicron_sway_prefs';
    const TITLE_KEY = 'omicron_title';
    const prefs = Object.assign({ zoom: 1, outlines: true, pane: false, spacing: false }, (function () {
        try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; }
    })());
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }
    const LOGO = 'favicon-96.png';
    function office() { return document.body.classList.contains('os-office'); }
    function docTitle() { try { return localStorage.getItem(TITLE_KEY) || 'My Omicron Page'; } catch (e) { return 'My Omicron Page'; } }

    /* ---------- Style.css (Keydown + Marketplace + Skills + Tags) ---------- */
    let styleCss = null;
    function loadStyleCss() {
        if (styleCss) return Promise.resolve(styleCss);
        return fetch('export-style.css').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (t) { styleCss = t; return t; });
    }
    // The editor shows every library style too (minus the exported page frame)!
    loadStyleCss().then(function (css) {
        const at = css.indexOf('/* ---------- 1.');
        const st = document.createElement('style');
        st.id = 'om-content-css';
        st.textContent = at === -1 ? css : css.substring(at);
        document.head.appendChild(st);
    }).catch(function () {});

    // Marketplace Keydown: every pack's trigger works while you type!
    let MKT = [];
    fetch('marketplace-styles.json').then(function (r) { return r.json(); }).then(function (packs) {
        MKT = Array.isArray(packs) ? packs : [];
        const defs = [];
        MKT.forEach(function (p) { (p.styles || []).forEach(function (s) { if (s.trigger && s.trigger.open && s.className) defs.push({ open: s.trigger.open, close: s.trigger.close || s.trigger.open, className: s.className }); }); });
        // Longer triggers first, so "~NEO~" never gets eaten by a shorter "~NE~"!
        defs.sort(function (a, b) { return b.open.length - a.open.length; });
        window.OMICRON_EXTRA_DEFS = defs;
        OS.rebuild();
    }).catch(function () {});

    let US = [];
    fetch('unique-styles.json').then(function (r) { return r.json(); }).then(function (f) { US = Array.isArray(f) ? f : []; }).catch(function () {});

    /* ---------- Blocks ---------- */
    let curId = null;
    page.addEventListener('focusin', function (e) { const b = e.target.closest && e.target.closest('.wysiwyg-block'); if (b) { curId = +b.dataset.id; markCurrent(); } });
    page.addEventListener('mousedown', function (e) { const b = e.target.closest && e.target.closest('.wysiwyg-block'); if (b) { curId = +b.dataset.id; markCurrent(); } });
    function markCurrent() { page.querySelectorAll('.wysiwyg-block').forEach(function (b) { b.classList.toggle('om-cur', +b.dataset.id === curId); }); OS.sync(); }
    function curIndex() { return elementsList.findIndex(function (x) { return x.id === curId; }); }
    function blockEl(id) { return page.querySelector('.wysiwyg-block[data-id="' + id + '"]'); }
    function focusBlock(id, atEnd) {
        const b = blockEl(id);
        if (!b) return;
        curId = id;
        markCurrent();
        b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        const ed = b.querySelector('[contenteditable="true"]');
        if (!ed) return;
        ed.focus();
        if (atEnd !== false) {
            const r = document.createRange();
            r.selectNodeContents(ed);
            r.collapse(false);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(r);
        }
    }
    // Sway-style: new cards land right after the one you're on!
    function addBlock(type, variant, content) {
        spawnElement(type, variant);
        const item = elementsList[elementsList.length - 1];
        if (content != null) item.content = content;
        // In a flexed page a new line or block gets a row of its own, never squeezed into the one above!
        if (pageFlex.dir === 'row' || pageFlex.dir === 'row-reverse') {
            item.style = Object.assign({ width: '100%' }, item.style || {});
            if (pageFlex.wrap === 'nowrap') { pageFlex.wrap = 'wrap'; }
        }
        const at = curIndex();
        if (at !== -1 && at < elementsList.length - 2) { elementsList.pop(); elementsList.splice(at + 1, 0, item); }
        renderDocument();
        focusBlock(item.id);
        return item;
    }
    function moveBlock(d) {
        const i = curIndex();
        const j = i + d;
        if (i === -1) { OS.toast('Click a card first!'); return; }
        if (j < 0 || j >= elementsList.length) return;
        const t = elementsList[i]; elementsList[i] = elementsList[j]; elementsList[j] = t;
        renderDocument();
        focusBlock(curId, false);
    }
    function duplicateBlock() {
        const i = curIndex();
        if (i === -1) { OS.toast('Click a card first!'); return; }
        const copy = JSON.parse(JSON.stringify(elementsList[i]));
        copy.id = newBlockId();
        delete copy.comments;
        elementsList.splice(i + 1, 0, copy);
        renderDocument();
        focusBlock(copy.id);
    }
    function deleteBlock() {
        if (curIndex() === -1) { OS.toast('Click a card first!'); return; }
        const i = curIndex();
        deleteElement(curId);
        const next = elementsList[Math.min(i, elementsList.length - 1)];
        curId = next ? next.id : null;
        markCurrent();
    }
    function curType() { const i = curIndex(); return i === -1 ? '' : elementsList[i].type + ':' + elementsList[i].variant; }
    function setVariant(type, variant) {
        const i = curIndex();
        if (i === -1 || elementsList[i].type !== type) { addBlock(type, variant); return; }
        elementsList[i].variant = variant;
        renderDocument();
        focusBlock(curId, false);
    }

    /* ---------- Caret + wrapping ---------- */
    function editableAt(node) {
        const e = node && (node.nodeType === 1 ? node : node.parentElement);
        const h = e && e.closest('[contenteditable="true"]');
        return h && page.contains(h) ? h : null;
    }
    // A caret inside a card, or a fresh Rich Text card to type into!
    function caretHost() {
        OS.restoreSelection();
        const s = window.getSelection();
        let h = s.rangeCount ? editableAt(s.anchorNode) : null;
        if (h) return h;
        const item = addBlock('rich', '', '');
        const b = blockEl(item.id);
        return b ? b.querySelector('[contenteditable="true"]') : null;
    }
    function changed(host) { if (host) host.dispatchEvent(new Event('input', { bubbles: true })); }
    function insertNode(node, space) {
        const host = caretHost();
        if (!host) return;
        const s = window.getSelection();
        const r = s.getRangeAt(0);
        r.deleteContents();
        r.insertNode(node);
        let after = node;
        if (space !== false) { after = document.createTextNode(' '); node.parentNode.insertBefore(after, node.nextSibling); }
        const c = document.createRange();
        c.setStartAfter(after);
        c.collapse(true);
        s.removeAllRanges();
        s.addRange(c);
        changed(host);
    }
    // Wrap the selection in a styled span (a bare caret gets a "Text" chip, pre-selected)!
    function wrap(cls, style, attrs) {
        const host = caretHost();
        if (!host) return;
        const s = window.getSelection();
        const r = s.getRangeAt(0);
        const span = document.createElement((attrs && attrs.__tag) || 'span');
        span.className = cls;
        if (style) span.setAttribute('style', style);
        Object.keys(attrs || {}).forEach(function (k) { if (k !== '__tag') span.setAttribute(k, attrs[k]); });
        if (r.collapsed) {
            span.textContent = 'Text';
            r.insertNode(span);
            const t = document.createRange();
            t.selectNodeContents(span);
            s.removeAllRanges();
            s.addRange(t);
        } else {
            span.appendChild(r.extractContents());
            r.insertNode(span);
            const t = document.createRange();
            t.setStartAfter(span);
            t.collapse(true);
            s.removeAllRanges();
            s.addRange(t);
        }
        if (span.getAttribute('data-text') === '') span.setAttribute('data-text', span.textContent);
        changed(host);
        try { playAeroClickSound(850, 0.08); } catch (e) {}
    }
    function exec(cmd, val) {
        const host = caretHost();
        try { document.execCommand(cmd, false, val); } catch (e) {}
        changed(host);
    }
    function inTag(sel) {
        const s = window.getSelection();
        const n = s.rangeCount ? s.anchorNode : null;
        const e = n && (n.nodeType === 1 ? n : n.parentElement);
        return !!(e && page.contains(e) && e.closest(sel));
    }
    // Keydown block macros (::aqua, ::console…) go through Omicron's own parser!
    function blockMacro(m) {
        const host = caretHost();
        if (!host) return;
        const s = window.getSelection();
        const r = s.getRangeAt(0);
        const t = document.createTextNode(m);
        r.insertNode(t);
        const c = document.createRange();
        c.setStart(t, m.length);
        c.collapse(true);
        s.removeAllRanges();
        s.addRange(c);
        host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        if (t.parentNode && !t.nodeValue) t.remove();
    }

    /* ---------- Keydown style lists ---------- */
    const ORBS = [['y', 'Yellow'], ['r', 'Red'], ['g', 'Green'], ['c', 'Cyan'], ['b', 'Blue'], ['v', 'Violet'], ['p', 'Pink'], ['o', 'Orange'], ['mg', 'Magenta'], ['lm', 'Lime'], ['aq', 'Aqua'], ['sl', 'Slate']].map(function (o) { return { cls: 'gel-orb gel-' + o[0], label: o[1] + ' Gel Orb' }; });
    const BUBBLES = ['cyan', 'orange', 'green', 'red', 'purple', 'pink', 'yellow', 'blue', 'lime', 'teal', 'gold', 'slate', 'white', 'black', 'fog', 'turquoise'].map(function (c) { return { cls: 'gel-bubble-chip gel-chip-' + c, label: c.charAt(0).toUpperCase() + c.slice(1) + ' Bubble' }; });
    const TAGCHIPS = [['a', 'Aqua'], ['g', 'Green'], ['o', 'Orange'], ['r', 'Red'], ['pr', 'Purple'], ['pk', 'Pink'], ['y', 'Yellow'], ['sl', 'Slate']].map(function (o) { return { cls: 'aero-tag-chip tag-chip-' + o[0], label: o[1] + ' Tag Chip' }; });
    const PASTELS = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'].map(function (c) { return { cls: 'gel-chip-pastel pastel-' + c, label: 'Pastel ' + c }; })
        .concat(['sky', 'emerald', 'orange', 'amethyst'].map(function (c) { return { cls: 'gel-chip-pill-variant pill-' + c, label: 'Pill ' + c }; }))
        .concat(['sky', 'emerald', 'orange', 'crimson', 'amethyst', 'rose', 'gold'].map(function (c) { return { cls: 'aero-glass-badge-chip badge-frame-' + c, label: 'Glass Badge ' + c }; }))
        .concat(['tangerine', 'citrus', 'emerald', 'sapphire', 'amethyst', 'fuchsia', 'crimson', 'slate'].map(function (c) { return { cls: 'gel-chip-droplet-ribbon droplet-ribbon-' + c, label: 'Droplet Ribbon ' + c }; }));
    const EFFECTS = [
        ['spark-text', 'Spark Text'], ['gel-green-flash', 'Green Flash'], ['liquid-underline', 'Liquid Underline'], ['glossy-border-badge', 'Glossy Badge'],
        ['cyber-glow-spark', 'Cyber Glow'], ['liquid-text-glow', 'Liquid Glow'], ['embossed-glass-text', 'Embossed Glass'], ['effect-shimmer-title', 'Shimmer Title'],
        ['effect-neon-ribbon', 'Neon Ribbon'], ['gel-chip-waterdrop', 'Waterdrop'], ['gel-chip-solarflare', 'Solar Flare'], ['gel-chip-aurorawave', 'Aurora Wave'],
        ['effect-gel-capsule', 'Gel Capsule'], ['effect-pearl-orb', 'Pearl Orb'], ['effect-glow-tube', 'Glow Tube'], ['effect-lens-flare', 'Lens Flare'],
        ['effect-mercury-pearl', 'Mercury Pearl'], ['effect-prism-refract', 'Prism'], ['effect-plasma-gel', 'Plasma Gel'], ['effect-water-bubble', 'Water Bubble'],
        ['dev-chip-function', 'Function'], ['dev-chip-variable', 'Variable'], ['dev-chip-hex', 'Hex'], ['dev-chip-string', 'String'],
        ['jr-chip-date-plate', 'Date Plate'], ['jr-chip-mood', 'Mood'], ['jr-chip-weather', 'Weather'], ['jr-chip-wax-stamp', 'Wax Stamp']
    ].map(function (e) { return { cls: e[0], label: e[1] }; });
    /* ---------- Highlighter: Bitbook's Annotate styles, in every color ---------- */
    const HL_COLORS = ['red', 'orange', 'gold', 'yellow', 'lime', 'green', 'turquoise', 'teal', 'cyan', 'blue', 'purple', 'pink', 'slate'];
    const HL_STYLES = [['hl', 'Highlight'], ['ul', 'Gel Underline'], ['st', 'Gel Strikethrough'], ['bx', 'Gel Box'], ['ha', 'Halo'], ['cb', 'Corner Brackets'], ['gf', 'Spotlight'], ['ga', 'Gel Accent'], ['gb', 'Gel Bubble'], ['dk', 'Dusk'], ['pr', 'Prism'], ['cm', 'Complement'], ['tk', 'Ticket'], ['nn', 'Neon'], ['sm', 'Stamp'], ['tp', 'Washi Tape'], ['ck', 'Checker'], ['ht', 'Halftone'], ['au', 'Aurora'], ['ml', 'Mild'], ['gw', 'Gel Wrap'], ['bt', 'Highlight Belt'], ['bk', 'Gel Bucket'], ['tr', 'Gel Torpedo'], ['bo', 'Gel Bottle'], ['pk', 'Gel Packet'], ['sl', 'Gel Select']];
    function hlClass(c, st) { return 'an-hl an-hl-' + c + (st === 'hl' ? '' : ' an-s-' + st); }
    function unmark() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const host = caretHost();
        const n = sel.anchorNode;
        const m = n && (n.nodeType === 1 ? n : n.parentElement) && (n.nodeType === 1 ? n : n.parentElement).closest('mark.an-hl');
        if (!m) { OS.toast('Put the caret inside a highlight first!'); return; }
        while (m.firstChild) m.parentNode.insertBefore(m.firstChild, m);
        m.remove();
        changed(host);
    }
    function highlightMenu() {
        const out = [];
        HL_STYLES.forEach(function (st) {
            out.push({ header: st[1] });
            out.push({ cols: 7, cls: 'om-sw-grid', swatches: HL_COLORS.map(function (c) { return { cls: 'om-sw', html: '<mark class="' + hlClass(c, st[0]) + '">Aa</mark>', title: c + ' ' + st[1].toLowerCase(), run: function () { wrap(hlClass(c, st[0]), null, { __tag: 'mark' }); } }; }) });
        });
        out.push({ sep: true }, { label: 'Remove highlight', icon: 'clearFormat', run: unmark });
        return out;
    }
    function chipMenu(title, list, cols) {
        return [{ header: title }, { cols: cols || 4, cls: 'om-sw-grid', swatches: list.map(function (s) { return { cls: 'om-sw', html: '<span class="' + s.cls + '">Aa</span>', title: s.label, run: function () { wrap(s.cls); } }; }) }];
    }
    function marketMenu() {
        if (!MKT.length) return [{ header: 'Marketplace' }, { label: 'Loading the Marketplace packs…', disabled: true }];
        const out = [{ header: 'Marketplace Keydown (' + MKT.length + ' packs)' }];
        MKT.forEach(function (p) {
            out.push({ label: p.name, hint: (p.styles || []).length + ' style' + ((p.styles || []).length === 1 ? '' : 's'), icon: 'store', run: function () { marketPack(p); } });
        });
        return out;
    }
    function marketPack(p) {
        const box = document.createElement('div');
        box.className = 'om-pack';
        (p.styles || []).forEach(function (s) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'om-pack-item';
            b.innerHTML = '<span class="' + OS.esc(s.className) + '">' + OS.esc(s.name || 'Text') + '</span><small>' + (s.trigger ? OS.esc(s.trigger.open + 'text' + (s.trigger.close || s.trigger.open)) : '') + '</small>';
            b.addEventListener('click', function () { box._pick = s; box.querySelectorAll('.om-pack-item').forEach(function (x) { x.classList.toggle('on', x === b); }); });
            box.appendChild(b);
        });
        OS.dialog(p.name, box, [{ label: 'Cancel', value: null }, { label: 'Apply style!', primary: true, value: function (b) { return b._pick || (p.styles || [])[0]; } }]).then(function (s) { if (s) wrap(s.className); });
    }

    /* ---------- Tags (Bitbook's chips, same markup!) ---------- */
    const SVG_STAR = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.629 8.662a1.22 1.22 0 0 0 1.136-.826a30.3 30.3 0 0 1 2.286-5.295c.409-.73 1.499-.712 1.898 0a30 30 0 0 1 2.285 5.295c.164.476.634.818 1.137.826a32 32 0 0 1 4.741.473c.861.15 1.184 1.132.572 1.73a35 35 0 0 1-3.789 3.216a1.14 1.14 0 0 0-.42 1.28a30.3 30.3 0 0 1 1.267 5.48c.111.839-.788 1.431-1.567 1.031a31.7 31.7 0 0 1-4.422-2.749a1.3 1.3 0 0 0-1.507 0a32 32 0 0 1-4.422 2.749c-.78.4-1.678-.192-1.566-1.032c.25-1.862.674-3.696 1.266-5.478a1.14 1.14 0 0 0-.42-1.281a34.5 34.5 0 0 1-3.789-3.216c-.61-.598-.287-1.58.573-1.73a33 33 0 0 1 4.74-.473" /></svg>';
    const SVG_IDEA = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.6 1.5 2.6h4c0-1 .7-2 1.5-2.6A6 6 0 0 0 12 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>';
    function chip(cls, html, editable) {
        const n = document.createElement('span');
        n.className = cls;
        n.setAttribute('spellcheck', 'false');
        if (editable === false) n.setAttribute('contenteditable', 'false');
        n.innerHTML = html;
        return n;
    }
    function ask(title, label, value) {
        OS.restoreSelection();
        const keep = (function () { const s = window.getSelection(); return s.rangeCount && editableAt(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null; })();
        return OS.prompt(title, label, value || '', 'Insert').then(function (v) {
            if (keep) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(keep); }
            return v == null || !String(v).trim() ? null : String(v).trim();
        });
    }
    function tag(kind) {
        const E = OS.esc;
        if (kind === 'date') { insertNode(chip('tag-date-chip', E(new Date().toLocaleDateString()))); return; }
        const q = {
            important: ['Important', 'Important:'], idea: ['Idea', 'Idea:'], checkbox: ['To Do', 'Checkbox label:', 'Task'], user: ['Person', 'Tag user:'],
            dropdown: ['Dropdown', 'Options (comma-separated):', 'To do, Doing, Done'], hashtag: ['Hashtag', 'Hashtag:'], contact: ['Contact', 'Contact info (name, phone, email...):']
        }[kind];
        ask(q[0], q[1], q[2]).then(function (v) {
            if (!v) return;
            if (kind === 'important') insertNode(chip('tag-important-chip', SVG_STAR + E(v)));
            else if (kind === 'idea') insertNode(chip('tag-idea-chip', SVG_IDEA + E(v)));
            else if (kind === 'checkbox') insertNode(chip('tag-check-chip', '<input type="checkbox" class="tag-check-box"><span class="tag-check-label">' + E(v) + '</span>', false));
            else if (kind === 'user') insertNode(chip('tag-user-chip', '@' + E(v)));
            else if (kind === 'hashtag') insertNode(chip('tag-hash-chip', '#' + E(v.replace(/^#+/, ''))));
            else if (kind === 'contact') insertNode(chip('tag-contact-chip', E(v)));
            else if (kind === 'dropdown') {
                const opts = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20);
                if (opts.length) insertNode(chip('tag-drop-chip', '<select class="tag-drop-select">' + opts.map(function (o) { return '<option value="' + E(o) + '">' + E(o) + '</option>'; }).join('') + '</select>', false));
            }
        });
    }
    // Ticks and dropdown picks save (and sync) with the page!
    page.addEventListener('change', function (e) {
        const t = e.target;
        if (t.matches && t.matches('input.tag-check-box')) { if (t.checked) t.setAttribute('checked', ''); else t.removeAttribute('checked'); }
        else if (t.matches && t.matches('select.tag-drop-select')) { [].forEach.call(t.options, function (o) { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); }); }
        else return;
        changed(editableAt(t.parentNode));
    });
    page.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('.tag-drop-select')) e.stopPropagation(); });

    /* ---------- Skills: Uni-Chip, Custom Chip, Unique Styles ---------- */
    function hexOk(v) { return /^#[0-9a-f]{6}$/i.test(v); }
    function skill(which) {
        const box = document.createElement('div');
        box.className = 'om-skill';
        const st = { tab: which || 'uni', uni: '#a78bfa', cc: '#8b5cf6', ccs: 1, us: null, col: 'regular', q: '' };
        const COLS = [['regular', 'Regular'], ['aero', 'Frutiger Aero'], ['aero2', 'Aero 2'], ['aero3', 'Aero 3'], ['pool', 'Poolside'], ['pool2', 'Poolside 2'], ['pool3', 'Poolside 3']];
        function draw() {
            let h = '<div class="os-seg om-skill-tabs">' + [['uni', 'Uni-Chip'], ['cc', 'Custom Chip'], ['us', 'Unique Styles']].map(function (t) { return '<button type="button" data-t="' + t[0] + '" class="' + (st.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
            if (st.tab === 'uni') {
                h += '<p class="om-skill-hint">One glossy chip in any color!</p><label class="om-skill-row">Color <input type="color" data-k="uni" value="' + st.uni + '"></label>' +
                    '<div class="om-skill-stage"><span class="uni-chip" style="--uni-accent:' + st.uni + '">Text</span></div>';
            } else if (st.tab === 'cc') {
                h += '<p class="om-skill-hint">50 chip shapes, one color of your choice!</p><label class="om-skill-row">Color <input type="color" data-k="cc" value="' + st.cc + '"></label><div class="om-skill-grid">';
                for (let i = 1; i <= 50; i++) h += '<button type="button" data-ccs="' + i + '" class="' + (st.ccs === i ? 'on' : '') + '"><span class="cc-chip cc-s' + i + '" style="--cc:' + st.cc + '">Aa</span></button>';
                h += '</div>';
            } else {
                h += '<div class="os-seg om-skill-cols">' + COLS.map(function (c) { return '<button type="button" data-col="' + c[0] + '" class="' + (st.col === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>' +
                    '<input class="os-dlg-input om-skill-q" placeholder="Search styles (neon, gold, jelly...)" value="' + OS.esc(st.q) + '"><div class="om-skill-grid om-us-grid">';
                const q = st.q.toLowerCase();
                let n = 0;
                US.forEach(function (f) {
                    if ((f[3] || 'regular') !== st.col && !q) return;
                    f[2].forEach(function (pal, i) {
                        if (q && (f[1] + ' ' + pal).toLowerCase().indexOf(q) === -1) return;
                        if (n++ > 240) return;
                        const cls = 'us-chip us-' + f[0] + ' us-' + f[0] + '-' + (i + 1);
                        h += '<button type="button" data-us="' + cls + '" title="' + OS.esc(f[1] + ' · ' + pal) + '" class="' + (st.us === cls ? 'on' : '') + '"><span class="' + cls + '">Text</span></button>';
                    });
                });
                h += '</div>' + (n ? '' : '<p class="om-skill-hint">' + (US.length ? 'No styles match that search!' : 'Loading the styles…') + '</p>');
            }
            box.innerHTML = h;
            const qi = box.querySelector('.om-skill-q');
            if (qi) { qi.addEventListener('input', function () { st.q = qi.value; const p = qi.selectionStart; draw(); const n2 = box.querySelector('.om-skill-q'); n2.focus(); n2.setSelectionRange(p, p); }); }
            box.querySelectorAll('input[type=color]').forEach(function (c) { c.addEventListener('input', function () { if (hexOk(c.value)) { st[c.dataset.k] = c.value; draw(); } }); });
        }
        box.addEventListener('click', function (e) {
            const b = e.target.closest('button');
            if (!b) return;
            if (b.dataset.t) st.tab = b.dataset.t;
            else if (b.dataset.ccs) st.ccs = +b.dataset.ccs;
            else if (b.dataset.us) st.us = b.dataset.us;
            else if (b.dataset.col) st.col = b.dataset.col;
            else return;
            draw();
        });
        draw();
        OS.dialog('Skills', box, [{ label: 'Cancel', value: null }, { label: 'Apply style!', primary: true, value: function () { return Object.assign({}, st); } }], { cls: 'om-skill-dlg' }).then(function (v) {
            if (!v) return;
            if (v.tab === 'uni') wrap('uni-chip', '--uni-accent:' + v.uni);
            else if (v.tab === 'cc') wrap('cc-chip cc-s' + v.ccs, '--cc:' + v.cc);
            else if (v.us) wrap(v.us);
            else OS.toast('Pick a style first!');
        });
    }

    /* ---------- Bitbook notes ---------- */
    // Imported HTML never brings scripts or inline handlers along!
    function clean(html) {
        const d = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
        d.querySelectorAll('script, iframe, object, embed, link, meta, style[data-skip]').forEach(function (n) { n.remove(); });
        d.querySelectorAll('*').forEach(function (n) {
            [].slice.call(n.attributes).forEach(function (a) {
                if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
            });
        });
        return d.body.innerHTML;
    }
    function parseKn(text) {
        let body = String(text || '');
        if (body.indexOf('---') === 0) {
            const end = body.indexOf('---', 3);
            if (end !== -1) {
                if (/doc_password:\s*"[^"]+"/.test(body.substring(3, end))) return { locked: true };
                body = body.substring(end + 3).trim();
            }
        }
        const mark = '\n---tabs---\n';
        const at = body.indexOf(mark);
        if (at === -1) return { pages: [{ name: 'Note', html: body }] };
        const pages = [];
        let cur = null;
        body.substring(at + mark.length).split('\n').forEach(function (ln) {
            let m = ln.match(/^\s*-\s*name:\s*(.*)\s*$/);
            if (m) { cur = { name: '', html: '' }; pages.push(cur); try { cur.name = JSON.parse(m[1]); } catch (e) { cur.name = m[1]; } return; }
            m = ln.match(/^\s*html:\s*(.*)\s*$/);
            if (m && cur) { try { cur.html = JSON.parse(m[1]); } catch (e) { cur.html = m[1]; } }
        });
        return { pages: pages.length ? pages : [{ name: 'Note', html: body.substring(0, at) }] };
    }
    function pickFile(accept) {
        return new Promise(function (res) {
            const i = document.createElement('input');
            i.type = 'file';
            i.accept = accept;
            i.addEventListener('change', function () { res(i.files && i.files[0] ? i.files[0] : null); });
            i.click();
        });
    }
    function importBitbook() {
        pickFile('.kn,.kd,.html,.htm,.txt').then(function (f) {
            if (!f) return;
            f.text().then(function (text) {
                const isHtml = /\.html?$/i.test(f.name);
                const isTxt = /\.txt$/i.test(f.name);
                const got = isHtml ? { pages: [{ name: f.name, html: (new DOMParser().parseFromString(text, 'text/html').body || {}).innerHTML || '' }] }
                    : isTxt ? { pages: [{ name: f.name, html: OS.esc(text) }] } : parseKn(text);
                if (got.locked) { OS.toast('That note is locked! Unlock it in Bitbook first, then try again!'); return; }
                const pages = got.pages.filter(function (p) { return String(p.html || '').replace(/<[^>]*>/g, '').trim() || /<(img|svg|input|select)/i.test(p.html || ''); });
                if (!pages.length) { OS.toast('That note looks empty!'); return; }
                const go = function (list) {
                    let at = curIndex();
                    list.forEach(function (p) {
                        const add = [];
                        if (pages.length > 1) add.push({ id: newBlockId(), type: 'heading', variant: 'h2', content: OS.esc(p.name || 'Page') });
                        add.push({ id: newBlockId(), type: 'rich', variant: 'bitbook', content: clean(p.html) });
                        add.forEach(function (it) { if (at === -1) elementsList.push(it); else elementsList.splice(++at, 0, it); });
                    });
                    renderDocument();
                    const last = elementsList[at === -1 ? elementsList.length - 1 : at];
                    if (last) focusBlock(last.id, false);
                    OS.toast(list.length === 1 ? 'Bitbook note added as a paragraph, tags and skills included!' : list.length + ' Bitbook pages added!');
                };
                if (pages.length === 1) { go(pages); return; }
                const box = document.createElement('div');
                box.innerHTML = '<p class="os-dlg-text">This notebook has ' + pages.length + ' pages! Which ones should come in?</p>' +
                    '<div class="om-pages">' + pages.map(function (p, i) { return '<label><input type="checkbox" checked data-i="' + i + '"> ' + OS.esc(p.name || 'Page ' + (i + 1)) + '</label>'; }).join('') + '</div>';
                OS.dialog('Insert Bitbook Note', box, [{ label: 'Cancel', value: null }, { label: 'Insert', primary: true, value: function (b) { return [].filter.call(b.querySelectorAll('input'), function (c) { return c.checked; }).map(function (c) { return pages[+c.dataset.i]; }); } }]).then(function (list) { if (list && list.length) go(list); });
            });
        });
    }

    /* ---------- Export: index.html + Style.css in a ZIP ---------- */
    let crcT = null;
    function crc32(b) {
        if (!crcT) { crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcT[n] = c >>> 0; } }
        let c = 0xFFFFFFFF;
        for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    // Stored (uncompressed) ZIP: [{ name, data }] -> Uint8Array!
    function buildZip(files) {
        const enc = new TextEncoder();
        const parts = [], central = [];
        let offset = 0;
        const u16 = function (a, v) { a.push(v & 0xFF, (v >> 8) & 0xFF); };
        const u32 = function (a, v) { a.push(v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >>> 24) & 0xFF); };
        files.forEach(function (f) {
            const name = enc.encode(f.name);
            const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
            const crc = crc32(data);
            const h = [0x50, 0x4B, 0x03, 0x04];
            u16(h, 20); u16(h, 0x0800); u16(h, 0); u16(h, 0); u16(h, 0); u32(h, crc); u32(h, data.length); u32(h, data.length); u16(h, name.length); u16(h, 0);
            parts.push(new Uint8Array(h), name, data);
            const c = [0x50, 0x4B, 0x01, 0x02];
            u16(c, 20); u16(c, 20); u16(c, 0x0800); u16(c, 0); u16(c, 0); u16(c, 0); u32(c, crc); u32(c, data.length); u32(c, data.length); u16(c, name.length); u16(c, 0); u16(c, 0); u16(c, 0); u16(c, 0); u32(c, 0); u32(c, offset);
            central.push(new Uint8Array(c), name);
            offset += h.length + name.length + data.length;
        });
        let csize = 0;
        central.forEach(function (c) { csize += c.length; });
        const e = [0x50, 0x4B, 0x05, 0x06];
        u16(e, 0); u16(e, 0); u16(e, files.length); u16(e, files.length); u32(e, csize); u32(e, offset); u16(e, 0);
        const all = parts.concat(central, [new Uint8Array(e)]);
        const out = new Uint8Array(offset + csize + e.length);
        let p = 0;
        all.forEach(function (a) { out.set(a, p); p += a.length; });
        return out;
    }
    function download(name, data, type) {
        const url = URL.createObjectURL(new Blob([data], { type: type }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    }
    function slug() { return (docTitle().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'omicron-page'); }
    function pageHTML(inline) {
        return generateExportHTML(inline).replace('<title>Exported Webpage</title>', '<title>' + OS.esc(docTitle()) + '</title>');
    }
    function exportZip() {
        loadStyleCss().then(function (css) {
            download(slug() + '.zip', buildZip([{ name: 'index.html', data: pageHTML() }, { name: 'Style.css', data: css }]), 'application/zip');
            OS.toast('ZIP ready: index.html + Style.css!');
        }).catch(function () { OS.toast('Could not read Style.css (open Omicron through a web server or the app)!'); });
    }
    function exportSingle() {
        loadStyleCss().then(function (css) {
            download(slug() + '.html', pageHTML(css), 'text/html');
            OS.toast('One HTML file with every style inside!');
        }).catch(function () { OS.toast('Could not read Style.css!'); });
    }
    function saveProject() {
        download(slug() + '.omicron.json', JSON.stringify({ omicron: 1, title: docTitle(), accentColor: accentColor, width: document.getElementById('canvas-width-select').value, elementsList: elementsList }, null, 1), 'application/json');
        OS.flashSaved('Saved!');
    }
    function openProject() {
        pickFile('.json').then(function (f) {
            if (!f) return;
            f.text().then(function (t) {
                let d = null;
                try { d = JSON.parse(t); } catch (e) {}
                if (!d || !Array.isArray(d.elementsList)) { OS.toast('That is not an Omicron project!'); return; }
                elementsList = d.elementsList.map(function (x) { x.content = x.type === 'image' ? String(x.content) : clean(String(x.content)); return x; });
                if (d.title) setTitle(d.title);
                if (d.width) updateCanvasWidth(d.width);
                setAccent(d.accentColor || '#00D6B6');
                OS.closeBackstage();
                OS.toast('Opened "' + (d.title || f.name) + '"!');
            });
        });
    }
    function setTitle(t) { try { localStorage.setItem(TITLE_KEY, String(t).substring(0, 80)); } catch (e) {} if (window.onOmicronChange) window.onOmicronChange(); }
    function setAccent(c) { accentColor = c; const i = document.getElementById('accent-color'); if (i) i.value = c; renderDocument(); }
    function newPage() {
        OS.confirm('New Page', 'Start a blank page? This one will be cleared (save a project or ZIP first to keep it)!', 'Start Fresh', true).then(function (ok) {
            if (!ok) return;
            elementsList = [{ id: newBlockId(), type: 'heading', variant: 'h1', content: 'Your Title' }, { id: newBlockId(), type: 'paragraph', variant: 'standard', content: 'Start typing, or try ::aqua then Space!' }];
            setTitle('My Omicron Page');
            renderDocument();
            OS.closeBackstage();
            OS.toast('Fresh page, ready to build!');
        });
    }
    function codeView(b) {
        b.innerHTML = '<h1>HTML Code</h1><p class="om-bs-p">This is the index.html inside the ZIP (it links Style.css)!</p>';
        const ta = document.createElement('textarea');
        ta.className = 'om-code';
        ta.readOnly = true;
        ta.spellcheck = false;
        ta.value = pageHTML();
        b.appendChild(ta);
        b.appendChild(OS.bsCards([
            { label: 'Copy code', hint: 'To the clipboard!', icon: 'copy', run: function () { ta.select(); try { navigator.clipboard.writeText(ta.value); } catch (e) { document.execCommand('copy'); } OS.toast('Copied!'); } },
            { label: 'Download ZIP', hint: 'index.html + Style.css!', icon: 'download', run: exportZip }
        ]));
    }

    /* ---------- File screen ---------- */
    function stats() {
        const text = page.innerText || '';
        return { blocks: elementsList.length, words: (text.match(/[^\s]+/g) || []).length };
    }
    function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
    const EXPORTS = [
        { label: 'Website ZIP', hint: 'index.html + Style.css, ready to host!', icon: 'web', run: exportZip },
        { label: 'Single HTML file', hint: 'Every style inlined into one file!', icon: 'page', run: exportSingle },
        { label: 'HTML code', hint: 'View and copy the code!', icon: 'code', run: function () { OS.openBackstage('code'); } },
        { label: 'Omicron project', hint: 'A .json you can open again later!', icon: 'save', run: saveProject }
    ];
    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'New page', hint: 'Start a blank page!', icon: 'newDoc', run: newPage },
                    { label: 'Insert a Bitbook note', hint: 'A .kn note, tags and skills included!', icon: 'notebook', run: function () { OS.closeBackstage(); importBitbook(); } },
                    { label: 'Export a website', hint: 'index.html + Style.css in a ZIP!', icon: 'web', run: exportZip }
                ]));
                const s = stats();
                b.insertAdjacentHTML('beforeend', '<h2>This page</h2><div class="bb-bs-doc om-bs-doc"><img src="' + LOGO + '" alt=""><div><b>' + OS.esc(docTitle()) + '</b><span>' + s.blocks + ' card' + (s.blocks === 1 ? '' : 's') + ' · ' + s.words.toLocaleString() + ' words · saves automatically in this browser!</span></div></div>');
            }
        },
        { id: 'new', label: 'New', icon: 'newDoc', render: function (b) { b.innerHTML = '<h1>New</h1>'; b.appendChild(OS.bsCards([{ label: 'Blank page', hint: 'Clears this page!', icon: 'newDoc', run: newPage }])); } },
        { id: 'open', label: 'Open', icon: 'folder', render: function (b) { b.innerHTML = '<h1>Open</h1>'; b.appendChild(OS.bsCards([{ label: 'Omicron project', hint: 'A .omicron.json file!', icon: 'folder', run: openProject }, { label: 'Bitbook note', hint: 'Insert a .kn note as a paragraph!', icon: 'notebook', run: function () { OS.closeBackstage(); importBitbook(); } }])); } },
        { id: 'save', label: 'Save a Copy', icon: 'save', render: function (b) { b.innerHTML = '<h1>Save a Copy</h1>'; b.appendChild(OS.bsCards([EXPORTS[3]])); } },
        { id: 'export', label: 'Export', icon: 'export', render: function (b) { b.innerHTML = '<h1>Export</h1>'; b.appendChild(OS.bsCards(EXPORTS)); } },
        { id: 'code', label: 'HTML Code', icon: 'code', render: codeView },
        { id: 'info', label: 'Info', icon: 'info', render: function (b) { const s = stats(); b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Cards</td><td><b>' + s.blocks + '</b></td></tr><tr><td>Words</td><td><b>' + s.words + '</b></td></tr><tr><td>Width</td><td><b>' + OS.esc(document.getElementById('canvas-width-select').value) + '</b></td></tr><tr><td>Accent</td><td><b style="color:' + OS.esc(accentColor) + '">' + OS.esc(accentColor) + '</b></td></tr><tr><td>Marketplace packs</td><td><b>' + MKT.length + '</b></td></tr></table>'; } }
    ];
    function settingsExtra(b) {
        b.insertAdjacentHTML('beforeend', '<h2>Omicron</h2>');
        const o = document.createElement('div');
        o.className = 'os-opts';
        o.appendChild(OS.optRow('Card outlines', 'Show a faint outline around the card you are editing!', function () { return prefs.outlines; }, function (v) { prefs.outlines = v; savePrefs(); applyView(); }));
        b.appendChild(o);
    }

    /* ---------- View ---------- */
    function setZoom(z) { prefs.zoom = Math.max(0.5, Math.min(2, Math.round(z * 100) / 100)); savePrefs(); applyView(); }
    function applyView() {
        page.style.zoom = office() && prefs.zoom !== 1 ? prefs.zoom : '';
        document.body.classList.toggle('om-no-outlines', !prefs.outlines);
        OS.sync();
    }

    /* ---------- Ribbon ---------- */
    const ACCENTS = ['#00D6B6', '#0284c7', '#2563eb', '#7c3aed', '#9333ea', '#db2777', '#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a', '#0f172a'];
    const WIDTHS = [['720px', 'Default Desktop (720px)'], ['920px', 'Wide Desktop (920px)'], ['420px', 'Mobile Frame (420px)']];
    function currentWidth() { return document.getElementById('canvas-width-select').value; }
    const MACROS = [['::aqua', 'Aqua Box'], ['::glass', 'Glass Block'], ['::console', 'Debug Console'], ['::code', 'Code Block'], ['::alert', 'Alert Plate'], ['::foldout', 'Foldout Panel'], ['::bubble', 'Liquid Bubble'], ['::divider', 'Liquid Divider']];
    const cardsGallery = [
        { label: 'Title', preview: '<i class="om-gp om-gp-h1">Aa</i>', run: function () { setVariant('heading', 'h1'); }, active: function () { return curType() === 'heading:h1'; } },
        { label: 'Heading', preview: '<i class="om-gp om-gp-h2">Aa</i>', run: function () { setVariant('heading', 'h2'); }, active: function () { return curType() === 'heading:h2'; } },
        { label: 'Subtitle', preview: '<i class="om-gp om-gp-sub">Aa</i>', run: function () { setVariant('heading', 'subtitle'); }, active: function () { return curType() === 'heading:subtitle'; } },
        { label: 'Text', preview: '<i class="om-gp om-gp-p">Aa</i>', run: function () { setVariant('paragraph', 'standard'); }, active: function () { return curType() === 'paragraph:standard'; } },
        { label: 'Lead', preview: '<i class="om-gp om-gp-lead">Aa</i>', run: function () { setVariant('paragraph', 'lead'); }, active: function () { return curType() === 'paragraph:lead'; } },
        { label: 'Quote', preview: '<i class="om-gp om-gp-q">Aa</i>', run: function () { setVariant('paragraph', 'quote'); }, active: function () { return curType() === 'paragraph:quote'; } }
    ];
    const tagGallery = [
        { label: 'To Do', preview: '<i class="bb-tg bb-tg-todo">☐</i>', title: 'To Do: a checkbox you can tick!', run: function () { tag('checkbox'); } },
        { label: 'Important', preview: '<i class="bb-tg bb-tg-imp">★</i>', run: function () { tag('important'); } },
        { label: 'Idea', preview: '<i class="bb-tg bb-tg-idea">💡</i>', run: function () { tag('idea'); } },
        { label: 'Contact', preview: '<i class="bb-tg bb-tg-contact">☎</i>', run: function () { tag('contact'); } },
        { label: 'Person', preview: '<i class="bb-tg bb-tg-user">@</i>', title: 'Tag a person (@name)', run: function () { tag('user'); } },
        { label: 'Hashtag', preview: '<i class="bb-tg bb-tg-hash">#</i>', run: function () { tag('hashtag'); } },
        { label: 'Date', preview: '<i class="bb-tg bb-tg-date">📅</i>', run: function () { tag('date'); } },
        { label: 'Dropdown', preview: '<i class="bb-tg bb-tg-drop">▾</i>', title: 'A dropdown chip (To do / Doing / Done)', run: function () { tag('dropdown'); } }
    ];
    function cardMenu(type) {
        const m = {
            heading: [['h1', 'Main Hero Title'], ['h2', 'Section Heading'], ['subtitle', 'Subtitle / Lead']],
            paragraph: [['standard', 'Standard Paragraph'], ['lead', 'Large Lead Text'], ['quote', 'Blockquote Callout']],
            button: [['primary', 'Solid Accent Button'], ['glass', 'Frosted Glass Button'], ['outline', 'Neon Outline Button']],
            image: [['hero', 'Wide Hero Banner'], ['card', 'Aspect Square Card'], ['avatar', 'Circular Avatar']],
            card: [['border', 'Left Border Accent'], ['glass', 'Full Aero Glass Panel']]
        }[type];
        return m.map(function (v) { return { label: v[1], run: function () { addBlock(type, v[0]); } }; });
    }
    function insertImage() {
        OS.prompt('Picture', 'Image address (URL):', 'https://picsum.photos/700/350?random=' + Date.now(), 'Insert').then(function (u) {
            if (!u || !/^(https?:|data:image\/)/i.test(u.trim())) { if (u) OS.toast('Use an http(s) image address!'); return; }
            addBlock('image', 'hero', u.trim());
        });
    }
    /* ---------- Layout: flexbox, alignment, sizes ---------- */
    function curItem() { const i = curIndex(); return i === -1 ? null : elementsList[i]; }
    function styleOf(k) { const it = curItem(); return it && it.style && it.style[k] !== undefined ? it.style[k] : ''; }
    function setStyle(k, v) {
        const it = curItem();
        if (!it) { OS.toast('Click a card first!'); return; }
        it.style = it.style || {};
        if (v === '' || v == null) delete it.style[k]; else it.style[k] = v;
        if (!Object.keys(it.style).length) delete it.style;
        renderDocument();
        focusBlock(it.id, false);
    }
    function setFlex(k, v) { pageFlex[k] = v; applyPageLayout(); saveDoc(); OS.sync(); }
    const WIDTHS_CARD = [['', 'Auto'], ['100%', '100%'], ['75%', '75%'], ['66.66%', '2/3'], ['50%', '50%'], ['33.33%', '1/3'], ['25%', '25%'], ['200px', '200px'], ['320px', '320px'], ['480px', '480px']];
    const HEIGHTS_CARD = [['', 'Auto'], ['80px', '80px'], ['120px', '120px'], ['200px', '200px'], ['320px', '320px'], ['50vh', 'Half screen'], ['100vh', 'Full screen']];
    const LINE_H = [['', 'Default'], ['1', '1.0'], ['1.2', '1.2'], ['1.4', '1.4'], ['1.6', '1.6'], ['1.8', '1.8'], ['2', '2.0'], ['2.4', '2.4']];
    const FONT_S = [['', 'Default'], ['0.8rem', 'Small'], ['1rem', 'Normal'], ['1.25rem', 'Large'], ['1.6rem', 'X-Large'], ['2.2rem', 'Huge'], ['3rem', 'Giant']];
    // Visual box model: margin around padding around the content size, like browser dev tools!
    function sides(v) {
        const t = String(v || '').trim().split(/\s+/).filter(Boolean);
        if (!t.length) return ['', '', '', ''];
        if (t.length === 1) return [t[0], t[0], t[0], t[0]];
        if (t.length === 2) return [t[0], t[1], t[0], t[1]];
        if (t.length === 3) return [t[0], t[1], t[2], t[1]];
        return t.slice(0, 4);
    }
    function cssLen(v) { v = String(v || '').trim(); return /^-?\d+(\.\d+)?$/.test(v) ? v + 'px' : v; }
    function advancedLayout() {
        const it = curItem();
        if (!it) { OS.toast('Click a card first!'); return; }
        const st = it.style || {};
        const m = sides(st.margin), pd = sides(st.padding);
        const box = document.createElement('div');
        box.className = 'om-adv';
        const side = function (grp, i, v) { return '<input class="om-bx" data-g="' + grp + '" data-i="' + i + '" value="' + OS.esc(String(v).replace(/px$/, '')) + '" placeholder="0" title="' + grp + ' ' + ['top', 'right', 'bottom', 'left'][i] + '">'; };
        const F = [['minWidth', 'Min width', 'e.g. 200px'], ['maxWidth', 'Max width', 'e.g. 600px'], ['minHeight', 'Min height', ''], ['maxHeight', 'Max height', ''], ['fontSize', 'Font size', 'e.g. 1.25rem'], ['lineHeight', 'Line height', 'e.g. 1.6'], ['flex', 'Flex (grow shrink basis)', 'e.g. 1 1 0%'], ['order', 'Order', 'e.g. 2']];
        const sel = function (key, label, options) { return '<label><span>' + label + '</span><select data-k="' + key + '">' + options.map(function (o) { return '<option value="' + o[0] + '"' + ((st[key] || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>'; };
        box.innerHTML = '<p class="os-dlg-text">Type numbers (pixels), or values like <b>50%</b>, <b>auto</b> or <b>2rem</b>! Empty means automatic.</p>' +
            '<div class="om-boxmodel"><div class="om-bm-m"><b>MARGIN</b><div class="om-bm-row">' + side('m', 0, m[0]) + '</div><div class="om-bm-mid">' + side('m', 3, m[3]) +
            '<div class="om-bm-p"><b>PADDING</b><div class="om-bm-row">' + side('p', 0, pd[0]) + '</div><div class="om-bm-mid">' + side('p', 3, pd[3]) +
            '<div class="om-bm-c"><b>SIZE</b><div class="om-bm-size"><input class="os-dlg-input" data-k="width" placeholder="auto" value="' + OS.esc(st.width || '') + '" title="Width"><i>×</i><input class="os-dlg-input" data-k="height" placeholder="auto" value="' + OS.esc(st.height || '') + '" title="Height"></div></div>' +
            side('p', 1, pd[1]) + '</div><div class="om-bm-row">' + side('p', 2, pd[2]) + '</div></div>' + side('m', 1, m[1]) + '</div><div class="om-bm-row">' + side('m', 2, m[2]) + '</div></div></div>' +
            '<label class="om-link"><input type="checkbox" class="om-linkall"> Change all four sides together</label>' +
            '<div class="om-adv-grid">' + F.map(function (f) { return '<label><span>' + f[1] + '</span><input class="os-dlg-input" data-k="' + f[0] + '" placeholder="' + f[2] + '" value="' + OS.esc(st[f[0]] || '') + '"></label>'; }).join('') +
            sel('textAlign', 'Text align', [['', 'Default'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right'], ['justify', 'Justify']]) +
            sel('blockAlign', 'Card align', [['', 'Default'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right']]) +
            sel('alignSelf', 'Align self (flexbox)', [['', 'Auto'], ['flex-start', 'Start'], ['center', 'Center'], ['flex-end', 'End'], ['stretch', 'Stretch']]) + '</div>';
        box.addEventListener('input', function (e) {
            const t = e.target;
            if (t.classList.contains('om-bx') && box.querySelector('.om-linkall').checked) [].forEach.call(box.querySelectorAll('.om-bx[data-g="' + t.dataset.g + '"]'), function (x) { x.value = t.value; });
        });
        const join = function (g) {
            const v = [0, 1, 2, 3].map(function (i) { return cssLen(box.querySelector('.om-bx[data-g="' + g + '"][data-i="' + i + '"]').value); });
            if (v.every(function (x) { return x === ''; })) return '';
            return v.map(function (x) { return x === '' ? '0' : x; }).join(' ');
        };
        OS.dialog('Margin, Padding & Size', box, [{ label: 'Cancel', value: null }, { label: 'Apply', primary: true, value: function (b) {
            const o = {};
            [].forEach.call(b.querySelectorAll('[data-k]'), function (x) { if (x.value !== '') o[x.dataset.k] = /^(width|height|minWidth|maxWidth|minHeight|maxHeight)$/.test(x.dataset.k) ? cssLen(x.value) : x.value; });
            const mm = join('m'), pp = join('p');
            if (mm) o.margin = mm;
            if (pp) o.padding = pp;
            return o;
        } }], { cls: 'om-adv-dlg' }).then(function (o) {
            if (!o) return;
            if (Object.keys(o).length) it.style = o; else delete it.style;
            renderDocument();
            focusBlock(it.id, false);
        });
    }
    function codeDialog(tab) {
        const box = document.createElement('div');
        box.className = 'om-codebox';
        const T = [['css', 'CSS', 'Styles for the whole page (they also apply inside the editor)!', '.my-class { color: tomato; }'], ['js', 'JavaScript', 'Runs on the exported page and in Preview (not in the editor)!', "document.querySelector('h1').addEventListener('click', () => alert('Hi!'));"], ['head', 'Head HTML', 'Extra tags for <head>: fonts, meta, links…', '<meta name="description" content="My page">']];
        let cur = tab || 'css';
        box.innerHTML = '<div class="os-seg om-code-tabs">' + T.map(function (t) { return '<button type="button" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><p class="om-skill-hint"></p>' + T.map(function (t) { return '<textarea class="om-code-ta" spellcheck="false" data-t="' + t[0] + '" placeholder="' + OS.esc(t[3]) + '"></textarea>'; }).join('');
        [].forEach.call(box.querySelectorAll('textarea'), function (ta) {
            ta.value = pageCode[ta.dataset.t] || '';
            ta.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); } });
        });
        const show = function () {
            [].forEach.call(box.querySelectorAll('textarea'), function (x) { x.hidden = x.dataset.t !== cur; });
            [].forEach.call(box.querySelectorAll('.om-code-tabs button'), function (x) { x.classList.toggle('on', x.dataset.t === cur); });
            box.querySelector('.om-skill-hint').textContent = T.find(function (t) { return t[0] === cur; })[2];
        };
        box.querySelector('.om-code-tabs').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) { cur = b.dataset.t; show(); } });
        show();
        OS.dialog('Page Code', box, [{ label: 'Cancel', value: null }, { label: 'Save code', primary: true, value: function (b) { const o = {}; [].forEach.call(b.querySelectorAll('textarea'), function (x) { o[x.dataset.t] = x.value; }); return o; } }], { cls: 'om-code-dlg' }).then(function (o) {
            if (!o) return;
            pageCode = { css: o.css, js: o.js, head: o.head };
            renderDocument();
            OS.toast('Page code saved! Use Preview Page to run it!');
        });
    }
    function alignBtn(icon, title, val) { return { icon: icon, title: title, run: function () { setStyle('textAlign', styleOf('textAlign') === val ? '' : val); }, checked: function () { return styleOf('textAlign') === val; } }; }
    function blockBtn(icon, title, val) { return { icon: icon, title: title, run: function () { setStyle('blockAlign', styleOf('blockAlign') === val ? '' : val); }, checked: function () { return styleOf('blockAlign') === val; } }; }

    /* ---------- Easy layouts: content blocks + flexbox presets, drawn as little pictures ---------- */
    const PH = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f1f5f9"/><circle cx="165" cy="115" r="16" fill="#94a3b8"/><path d="M90 210l60-70 40 45 35-35 85 60z" fill="#94a3b8"/></svg>');
    function ph(extra) { return '<img data-ph="1" src="' + PH + '" alt="Picture" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;display:block' + (extra || '') + '">'; }
    function tt(h) { return '<h3 style="margin:10px 0 6px">' + (h || 'Title') + '</h3><p style="margin:0;color:#64748b">Describe this block in a sentence or two.</p>'; }
    function cap() { return '<p style="margin:8px 0 0;text-align:center;font-weight:700">Caption</p>'; }
    function grid(n, inner, gap) { return '<div style="display:grid;grid-template-columns:' + (typeof n === 'number' ? 'repeat(' + n + ',minmax(0,1fr))' : n) + ';gap:' + (gap || 18) + 'px;align-items:start;width:100%">' + inner + '</div>'; }
    const CONTENT_BLOCKS = [
        ['Picture + text', 'One picture with a title and text beside it', function () { return grid(2, '<div>' + ph() + '</div><div style="align-self:center">' + tt('Title') + '</div>', 22); }, 'a'],
        ['Two pictures', 'Two pictures, each with a title and text', function () { return grid(2, '<div>' + ph() + tt('First') + '</div><div>' + ph() + tt('Second') + '</div>'); }, 'b'],
        ['Gallery', 'Two small pictures beside one big one', function () { return grid('minmax(0,1fr) minmax(0,2fr)', '<div style="display:grid;gap:14px">' + ph() + ph() + '</div><div>' + ph() + '</div>'); }, 'c'],
        ['Three columns', 'Three pictures with titles and text', function () { return grid(3, '<div>' + ph() + tt('One') + '</div><div>' + ph() + tt('Two') + '</div><div>' + ph() + tt('Three') + '</div>'); }, 'd'],
        ['Two features', 'Two small pictures, each with text beside it', function () { return grid(2, '<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:14px;align-items:center"><div>' + ph() + '</div><div>' + tt('First') + '</div></div><div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:14px;align-items:center"><div>' + ph() + '</div><div>' + tt('Second') + '</div></div>', 26); }, 'e'],
        ['Four pictures', 'A row of four pictures with captions', function () { return grid(4, '<div>' + ph() + cap() + '</div><div>' + ph() + cap() + '</div><div>' + ph() + cap() + '</div><div>' + ph() + cap() + '</div>', 14); }, 'f']
    ];
    // Little line drawings (like Google Slides' Content Blocks)!
    function dia(kind) {
        const R = function (x, y, w, h) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="#f8fafc" stroke="#cbd5e1"/><circle cx="' + (x + w * 0.3) + '" cy="' + (y + h * 0.36) + '" r="' + Math.max(1.5, Math.min(w, h) * 0.09) + '" fill="#64748b"/><path d="M' + (x + w * 0.12) + ' ' + (y + h * 0.86) + 'l' + (w * 0.3) + ' ' + (-h * 0.4) + 'l' + (w * 0.2) + ' ' + (h * 0.24) + 'l' + (w * 0.16) + ' ' + (-h * 0.16) + 'l' + (w * 0.2) + ' ' + (h * 0.32) + 'z" fill="#64748b"/>'; };
        const L = function (x, y, w, strong) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (strong ? 2.6 : 1.6) + '" rx="1" fill="' + (strong ? '#94a3b8' : '#cbd5e1') + '"/>'; };
        const paras = function (x, y, w) { return L(x, y, w, true) + L(x, y + 6, w) + L(x, y + 11, w) + L(x, y + 16, w * 0.7); };
        const W = 72, H = 50;
        let b = '';
        if (kind === 'a') b = R(6, 12, 28, 26) + paras(40, 14, 26);
        else if (kind === 'b') b = R(6, 6, 28, 22) + paras(6, 32, 28) + R(38, 6, 28, 22) + paras(38, 32, 28);
        else if (kind === 'c') b = R(6, 6, 16, 16) + R(6, 26, 16, 16) + R(26, 6, 40, 36);
        else if (kind === 'd') b = R(5, 6, 18, 18) + paras(5, 28, 18) + R(27, 6, 18, 18) + paras(27, 28, 18) + R(49, 6, 18, 18) + paras(49, 28, 18);
        else if (kind === 'e') b = R(6, 14, 14, 14) + paras(23, 14, 11) + R(40, 14, 14, 14) + paras(57, 14, 10);
        else if (kind === 'f') b = R(4, 12, 15, 15) + L(5, 33, 13, true) + R(21, 12, 15, 15) + L(22, 33, 13, true) + R(38, 12, 15, 15) + L(39, 33, 13, true) + R(55, 12, 15, 15) + L(56, 33, 13, true);
        else if (kind === 'stack') b = '<rect x="10" y="6" width="52" height="10" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="10" y="20" width="52" height="10" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="10" y="34" width="52" height="10" rx="2" fill="#99f6e4" stroke="#14b8a6"/>';
        else if (kind === 'row') b = '<rect x="5" y="15" width="18" height="20" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="27" y="15" width="18" height="20" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="49" y="15" width="18" height="20" rx="2" fill="#99f6e4" stroke="#14b8a6"/>';
        else if (kind === 'wrap') b = '<rect x="5" y="7" width="18" height="16" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="27" y="7" width="18" height="16" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="49" y="7" width="18" height="16" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="5" y="27" width="18" height="16" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="27" y="27" width="18" height="16" rx="2" fill="#99f6e4" stroke="#14b8a6"/>';
        else if (kind === 'c2') b = '<rect x="6" y="8" width="29" height="14" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="37" y="8" width="29" height="14" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="6" y="28" width="29" height="14" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="37" y="28" width="29" height="14" rx="2" fill="#99f6e4" stroke="#14b8a6"/>';
        else if (kind === 'c3') b = [5, 27, 49].map(function (x) { return '<rect x="' + x + '" y="8" width="18" height="14" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="' + x + '" y="28" width="18" height="14" rx="2" fill="#99f6e4" stroke="#14b8a6"/>'; }).join('');
        else if (kind === 'c4') b = [3, 21, 39, 57].map(function (x) { return '<rect x="' + x + '" y="12" width="13" height="26" rx="2" fill="#99f6e4" stroke="#14b8a6"/>'; }).join('');
        else if (kind === 'center') b = '<rect x="20" y="6" width="32" height="10" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="14" y="20" width="44" height="10" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="24" y="34" width="24" height="10" rx="2" fill="#99f6e4" stroke="#14b8a6"/>';
        else if (kind === 'between') b = '<rect x="4" y="15" width="14" height="20" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="29" y="15" width="14" height="20" rx="2" fill="#99f6e4" stroke="#14b8a6"/><rect x="54" y="15" width="14" height="20" rx="2" fill="#99f6e4" stroke="#14b8a6"/>';
        return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="64" height="44" style="display:block;background:#fff;border:1px solid #d5dce6;border-radius:4px">' + b + '</svg>';
    }
    function insertContentBlock(i) {
        const c = CONTENT_BLOCKS[i];
        const item = addBlock('rich', '', c[2]());
        item.style = Object.assign({}, item.style || {}, { width: '100%' });
        if (pageFlex.dir !== 'column' && pageFlex.wrap === 'nowrap') pageFlex.wrap = 'wrap';
        renderDocument();
        focusBlock(item.id, false);
        OS.toast(c[0] + ' added! Double-click a picture to swap it for a free online one!');
        return item;
    }
    const FLEX_PRESETS = [
        ['Stack', 'Cards one under another', 'stack', { dir: 'column', wrap: 'nowrap', justify: 'flex-start', align: 'stretch', gap: 20 }, 0],
        ['Row', 'Cards side by side', 'row', { dir: 'row', wrap: 'nowrap', justify: 'flex-start', align: 'stretch', gap: 20 }, 0],
        ['Wrap', 'A row that wraps onto new lines', 'wrap', { dir: 'row', wrap: 'wrap', justify: 'flex-start', align: 'stretch', gap: 20 }, 0],
        ['2 Columns', 'Every card half the width', 'c2', { dir: 'row', wrap: 'wrap', justify: 'flex-start', align: 'stretch', gap: 20 }, 2],
        ['3 Columns', 'Every card a third of the width', 'c3', { dir: 'row', wrap: 'wrap', justify: 'flex-start', align: 'stretch', gap: 20 }, 3],
        ['4 Columns', 'Every card a quarter of the width', 'c4', { dir: 'row', wrap: 'wrap', justify: 'flex-start', align: 'stretch', gap: 16 }, 4],
        ['Centered', 'Everything centered', 'center', { dir: 'column', wrap: 'nowrap', justify: 'flex-start', align: 'center', gap: 20 }, 0],
        ['Spread', 'Space between cards', 'between', { dir: 'row', wrap: 'wrap', justify: 'space-between', align: 'center', gap: 20 }, 0]
    ];
    function applyFlexPreset(pr) {
        pageFlex = Object.assign({}, pageFlex, pr[3]);
        const n = pr[4];
        elementsList.forEach(function (x) {
            if (n) { x.style = x.style || {}; x.style.width = 'calc((100% - ' + (n - 1) * (pr[3].gap) + 'px) / ' + n + ')'; }
            else if (x.style && /^calc\(/.test(x.style.width || '')) { delete x.style.width; if (!Object.keys(x.style).length) delete x.style; }
        });
        renderDocument();
        OS.sync();
        OS.toast(pr[0] + ': ' + pr[1] + '!');
    }
    const SPACE = [['None', '0'], ['Small', '8px'], ['Medium', '16px'], ['Large', '32px'], ['Extra large', '64px']];
    function spaceMenu(key) {
        const items = [{ header: key === 'margin' ? 'Margin (space outside)' : 'Padding (space inside)' }].concat(SPACE.map(function (o) { return { label: o[0], hint: o[1], checked: styleOf(key) === o[1], run: function () { setStyle(key, o[1] === '0' ? '' : o[1]); } }; }));
        if (key === 'margin') items.push({ label: 'Centered (auto)', hint: '0 auto', checked: styleOf('margin') === '0 auto', run: function () { setStyle('margin', '0 auto'); } });
        else items.push({ label: 'Comfortable', hint: '16px 24px', checked: styleOf('padding') === '16px 24px', run: function () { setStyle('padding', '16px 24px'); } });
        items.push({ sep: true }, { label: 'Exact numbers…', icon: 'size', run: advancedLayout });
        return items;
    }
    // Double-click a placeholder (or any picture inside a rich card) to swap it for a free online one!
    page.addEventListener('dblclick', function (e) {
        const img = e.target.closest && e.target.closest('.wysiwyg-rich img');
        if (!img || !window.RadiiImages) return;
        e.preventDefault();
        const host = img.closest('.wysiwyg-rich');
        window.RadiiImages.open({
            title: 'Swap this picture', accent: '#00a88f', accent2: '#00D6B6', glow: 'rgba(0,214,182,.3)', hotlink: true,
            onPick: function (r) {
                img.src = r.url;
                img.alt = r.alt;
                img.removeAttribute('data-ph');
                img.title = r.credit;
                if (r.withCredit) {
                    const small = document.createElement('p');
                    small.style.cssText = 'margin:4px 0 0;font-size:.7rem;color:#64748b';
                    small.innerHTML = r.creditHtml;
                    (img.parentNode.querySelector('p[style*="font-size:.7rem"]') || { remove: function () {} }).remove();
                    img.after(small);
                }
                host.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    });

    // A fresh full-width line directly below the card you're on (never joins the flexed block above)!
    function lineBelow() {
        const it = addBlock('paragraph', 'standard', '');
        it.style = Object.assign({}, it.style || {}, { width: '100%' });
        if (pageFlex.dir !== 'column' && pageFlex.wrap === 'nowrap') pageFlex.wrap = 'wrap';
        renderDocument();
        focusBlock(it.id);
        OS.toast('A new line below! It gets a full row of its own!');
        return it;
    }

    /* ---------- Cards pane: see, reorder and size every card in one list ---------- */
    const TYPE_ICON = { heading: 'font', paragraph: 'page', rich: 'notes', button: 'bubble', image: 'image', card: 'cards', html: 'code' };
    function cardLabel(it) {
        const t = String(it.type === 'image' ? 'Picture' : it.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split('|')[0];
        return t ? t.slice(0, 30) : '(empty ' + it.type + ')';
    }
    let pane = null;
    function paneEnsure() {
        if (pane && pane.isConnected) return pane;
        pane = document.createElement('div');
        pane.id = 'om-pane';
        pane.innerHTML = '<div class="omp-head"><b>Cards</b><span class="omp-sub">Click to select, drag to reorder</span></div><div class="omp-list"></div><div class="omp-foot"></div>';
        const wrap = document.querySelector('.workspace-viewport-wrapper');
        wrap.insertBefore(pane, wrap.firstChild);
        const list = pane.querySelector('.omp-list');
        list.addEventListener('click', function (e) {
            const row = e.target.closest('.omp-item');
            if (!row) return;
            const id = +row.dataset.id;
            const btn = e.target.closest('button[data-a]');
            if (btn) {
                curId = id;
                const a = btn.dataset.a;
                if (a === 'up') moveBlock(-1); else if (a === 'down') moveBlock(1); else if (a === 'dup') duplicateBlock(); else if (a === 'del') deleteBlock();
                return;
            }
            if (e.target.closest('select')) return;
            focusBlock(id, false);
        });
        list.addEventListener('change', function (e) {
            const sel = e.target.closest('select');
            const row = e.target.closest('.omp-item');
            if (!sel || !row) return;
            const it = elementsList.find(function (x) { return x.id === +row.dataset.id; });
            if (!it) return;
            it.style = it.style || {};
            if (sel.value === '') delete it.style.width; else it.style.width = sel.value;
            if (!Object.keys(it.style).length) delete it.style;
            renderDocument();
        });
        let dragId = null;
        list.addEventListener('dragstart', function (e) { const row = e.target.closest('.omp-item'); if (row) { dragId = +row.dataset.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'card'); } catch (x) {} } });
        list.addEventListener('dragover', function (e) { if (dragId == null) return; e.preventDefault(); const row = e.target.closest('.omp-item'); [].forEach.call(list.querySelectorAll('.omp-over'), function (x) { x.classList.remove('omp-over'); }); if (row) row.classList.add('omp-over'); });
        list.addEventListener('drop', function (e) {
            e.preventDefault();
            const row = e.target.closest('.omp-item');
            if (dragId == null || !row) { dragId = null; return; }
            const from = elementsList.findIndex(function (x) { return x.id === dragId; });
            let to = elementsList.findIndex(function (x) { return x.id === +row.dataset.id; });
            dragId = null;
            if (from === -1 || to === -1 || from === to) { paneRefresh(); return; }
            const it = elementsList.splice(from, 1)[0];
            elementsList.splice(to, 0, it);
            renderDocument();
            focusBlock(it.id, false);
        });
        list.addEventListener('dragend', function () { dragId = null; [].forEach.call(list.querySelectorAll('.omp-over'), function (x) { x.classList.remove('omp-over'); }); });
        return pane;
    }
    const PANE_W = [['', 'Auto'], ['100%', '100%'], ['75%', '75%'], ['50%', '50%'], ['33.33%', '1/3'], ['25%', '25%']];
    function paneRefresh() {
        if (!prefs.pane) return;
        paneEnsure();
        const list = pane.querySelector('.omp-list');
        list.innerHTML = elementsList.map(function (it, i) {
            const w = (it.style && it.style.width) || '';
            const known = PANE_W.some(function (o) { return o[0] === w; });
            return '<div class="omp-item' + (it.id === curId ? ' on' : '') + '" draggable="true" data-id="' + it.id + '"><span class="omp-ic">' + OS.ico(TYPE_ICON[it.type] || 'page') + '</span><span class="omp-t"><b>' + (i + 1) + '</b> ' + OS.esc(cardLabel(it)) + '</span>' +
                '<select title="Width">' + PANE_W.concat(known ? [] : [[w, w.length > 12 ? 'Custom' : w]]).map(function (o) { return '<option value="' + OS.esc(o[0]) + '"' + (o[0] === w ? ' selected' : '') + '>' + OS.esc(o[1]) + '</option>'; }).join('') + '</select>' +
                '<span class="omp-btns"><button type="button" data-a="up" title="Move up">▲</button><button type="button" data-a="down" title="Move down">▼</button><button type="button" data-a="dup" title="Duplicate">⧉</button><button type="button" data-a="del" title="Delete">✕</button></span></div>';
        }).join('');
        pane.querySelector('.omp-foot').innerHTML = elementsList.length + ' card' + (elementsList.length === 1 ? '' : 's') + ' · <a href="#" class="omp-add">+ Line below</a>';
        const add = pane.querySelector('.omp-add');
        if (add) add.onclick = function (e) { e.preventDefault(); lineBelow(); };
    }
    function setPane(on) {
        prefs.pane = !!on;
        savePrefs();
        document.body.classList.toggle('om-pane-on', !!on);
        if (on) { paneEnsure().hidden = false; paneRefresh(); } else if (pane) pane.hidden = true;
        OS.sync();
        setTimeout(placeHandles, 0);
    }

    /* ---------- Size handles on the selected card ---------- */
    const HN = [['nw', 'nwse-resize'], ['n', 'ns-resize'], ['ne', 'nesw-resize'], ['e', 'ew-resize'], ['se', 'nwse-resize'], ['s', 'ns-resize'], ['sw', 'nesw-resize'], ['w', 'ew-resize']];
    let hLayer = null, hDrag = null, hQueued = false, gripDrag = null;
    function sidesPx(v) { return sides(v).map(function (x) { const n = parseFloat(x); return isFinite(n) ? Math.max(0, n) : 0; }); }
    function ensureHandles() {
        if (hLayer) return hLayer;
        hLayer = document.createElement('div');
        hLayer.id = 'om-h-layer';
        HN.forEach(function (h) {
            const d = document.createElement('div');
            d.className = 'om-h';
            d.dataset.h = h[0];
            d.style.cursor = h[1];
            d.addEventListener('pointerdown', startHandle);
            hLayer.appendChild(d);
        });
        // Margin (outward, orange) and padding (inward, green): shaded bands with a grip on every side!
        ['m', 'p'].forEach(function (g) {
            ['t', 'r', 'b', 'l'].forEach(function (sd) {
                const band = document.createElement('div');
                band.className = 'om-band om-band-' + g;
                band.dataset.b = g + '-' + sd;
                hLayer.insertBefore(band, hLayer.firstChild);
                const gr = document.createElement('div');
                gr.className = 'om-grip om-grip-' + g;
                gr.dataset.g = g + '-' + sd;
                gr.title = (g === 'm' ? 'Margin ' : 'Padding ') + { t: 'top', r: 'right', b: 'bottom', l: 'left' }[sd] + ' (drag; hold Shift for all sides)';
                gr.addEventListener('pointerdown', startGrip);
                hLayer.appendChild(gr);
            });
        });
        const tip = document.createElement('div');
        tip.className = 'om-h-tip';
        tip.hidden = true;
        hLayer.appendChild(tip);
        document.body.appendChild(hLayer);
        return hLayer;
    }
    function placeHandles() {
        hQueued = false;
        const b = office() && curId != null ? blockEl(curId) : null;
        if (!b) { if (hLayer) hLayer.style.display = 'none'; return; }
        ensureHandles().style.display = 'block';
        const r = b.getBoundingClientRect();
        // Size handles sit just OUTSIDE the card so they never cover your text!
        const o = 8;
        const pos = { nw: [r.left - o, r.top - o], n: [r.left + r.width / 2, r.top - o], ne: [r.right + o, r.top - o], e: [r.right + o, r.top + r.height / 2], se: [r.right + o, r.bottom + o], s: [r.left + r.width / 2, r.bottom + o], sw: [r.left - o, r.bottom + o], w: [r.left - o, r.top + r.height / 2] };
        [].forEach.call(hLayer.querySelectorAll('.om-h'), function (d) { const q = pos[d.dataset.h]; d.style.left = q[0] + 'px'; d.style.top = q[1] + 'px'; });
        // The margin and padding bands are exactly as thick as the chosen numbers!
        const it0 = curItem();
        const k0 = b.offsetWidth ? r.width / b.offsetWidth : 1;
        const m = (gripDrag ? gripDrag.m : sidesPx((it0 && it0.style && it0.style.margin) || '')).map(function (x) { return x * k0; });
        const pd = (gripDrag ? gripDrag.p : sidesPx((it0 && it0.style && it0.style.padding) || '')).map(function (x) { return x * k0; });
        const put = function (key, x, y, w, h) { const e = hLayer.querySelector('[data-b="' + key + '"]'); e.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + Math.max(0, w) + 'px;height:' + Math.max(0, h) + 'px'; };
        put('m-t', r.left - m[3], r.top - m[0], r.width + m[1] + m[3], m[0]);
        put('m-b', r.left - m[3], r.bottom, r.width + m[1] + m[3], m[2]);
        put('m-l', r.left - m[3], r.top, m[3], r.height);
        put('m-r', r.right, r.top, m[1], r.height);
        put('p-t', r.left, r.top, r.width, pd[0]);
        put('p-b', r.left, r.bottom - pd[2], r.width, pd[2]);
        put('p-l', r.left, r.top + pd[0], pd[3], r.height - pd[0] - pd[2]);
        put('p-r', r.right - pd[1], r.top + pd[0], pd[1], r.height - pd[0] - pd[2]);
        const gp = { 'm-t': [r.left + r.width * 0.25, r.top - m[0]], 'm-b': [r.left + r.width * 0.25, r.bottom + m[2]], 'm-l': [r.left - m[3], r.top + r.height * 0.25], 'm-r': [r.right + m[1], r.top + r.height * 0.25], 'p-t': [r.left + r.width * 0.75, r.top + pd[0]], 'p-b': [r.left + r.width * 0.75, r.bottom - pd[2]], 'p-l': [r.left + pd[3], r.top + r.height * 0.75], 'p-r': [r.right - pd[1], r.top + r.height * 0.75] };
        // Margin + padding guides are opt-in (Layout > Spacing Guides): grips on top of the text got in the way!
        const showSpacing = !!(prefs.spacing || gripDrag);
        [].forEach.call(hLayer.querySelectorAll('.om-grip, .om-band'), function (g) { g.style.display = showSpacing ? '' : 'none'; });
        [].forEach.call(hLayer.querySelectorAll('.om-grip'), function (g) { const q = gp[g.dataset.g]; g.style.left = q[0] + 'px'; g.style.top = q[1] + 'px'; });
        const tip = hLayer.querySelector('.om-h-tip');
        if (hDrag || gripDrag) { tip.hidden = false; tip.textContent = hDrag ? (hDrag.label || '') : gripDrag.label; tip.style.left = (r.left + r.width / 2) + 'px'; tip.style.top = (r.bottom + (m[2] || 0) + 12) + 'px'; } else tip.hidden = true;
    }
    // Drag a margin (outward) or padding (inward) grip: only that side changes, Shift changes all four!
    function startGrip(e) {
        const it = curItem(), b = blockEl(curId);
        if (!it || !b) return;
        e.preventDefault();
        e.stopPropagation();
        const parts = e.target.dataset.g.split('-');
        const st = it.style || {};
        gripDrag = { g: parts[0], s: { t: 0, r: 1, b: 2, l: 3 }[parts[1]], x: e.clientX, y: e.clientY, k: b.offsetWidth ? b.getBoundingClientRect().width / b.offsetWidth : 1, m: sidesPx(st.margin), p: sidesPx(st.padding), m0: sidesPx(st.margin), p0: sidesPx(st.padding), b: b, it: it, label: '' };
        e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
        document.addEventListener('pointermove', moveGrip);
        document.addEventListener('pointerup', endGrip, { once: true });
    }
    function moveGrip(e) {
        const d = gripDrag;
        if (!d) return;
        const dx = (e.clientX - d.x) / d.k, dy = (e.clientY - d.y) / d.k;
        const raw = d.g === 'm' ? [-dy, dx, dy, -dx][d.s] : [dy, -dx, -dy, dx][d.s];
        const arr = d.g === 'm' ? d.m : d.p, base = d.g === 'm' ? d.m0 : d.p0;
        const v = Math.max(0, Math.min(400, Math.round(base[d.s] + raw)));
        if (e.shiftKey) for (let i = 0; i < 4; i++) arr[i] = v; else { for (let i = 0; i < 4; i++) arr[i] = base[i]; arr[d.s] = v; }
        d.b.style[d.g === 'm' ? 'margin' : 'padding'] = arr.map(function (x) { return x + 'px'; }).join(' ');
        d.label = (d.g === 'm' ? 'margin ' : 'padding ') + (e.shiftKey ? 'all sides' : ['top', 'right', 'bottom', 'left'][d.s]) + ' ' + v + 'px';
        placeHandles();
    }
    function endGrip() {
        document.removeEventListener('pointermove', moveGrip);
        const d = gripDrag;
        gripDrag = null;
        if (d) {
            const st = d.it.style = d.it.style || {};
            const out = function (arr) { return arr.every(function (x) { return x === 0; }) ? '' : arr.map(function (x) { return x + 'px'; }).join(' '); };
            const mm = out(d.m), pp = out(d.p);
            if (mm) st.margin = mm; else delete st.margin;
            if (pp) st.padding = pp; else delete st.padding;
            if (!Object.keys(st).length) delete d.it.style;
            saveDoc();
            paneRefresh();
        }
        placeHandles();
        OS.sync();
    }
    function soonHandles() { if (!hQueued) { hQueued = true; requestAnimationFrame(placeHandles); } }
    function startHandle(e) {
        const b = blockEl(curId);
        const it = curItem();
        if (!b || !it) return;
        e.preventDefault();
        e.stopPropagation();
        const cs = getComputedStyle(page);
        const pw = page.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const r = b.getBoundingClientRect();
        const k = b.offsetWidth ? r.width / b.offsetWidth : 1;
        hDrag = { h: e.target.dataset.h, x: e.clientX, y: e.clientY, w: b.offsetWidth, hh: b.offsetHeight, pw: pw, k: k || 1, b: b, it: it, label: '' };
        e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
        document.addEventListener('pointermove', moveHandle);
        document.addEventListener('pointerup', endHandle, { once: true });
    }
    function moveHandle(e) {
        if (!hDrag) return;
        const d = hDrag, h = d.h;
        const dx = (e.clientX - d.x) / d.k, dy = (e.clientY - d.y) / d.k;
        let label = '';
        if (/e|w/.test(h)) {
            let w = Math.max(40, d.w + (/w/.test(h) ? -dx : dx));
            if (e.altKey) { w = Math.round(w); d.b.style.width = w + 'px'; label = w + 'px'; }
            else { const pct = Math.max(5, Math.min(100, Math.round(w / d.pw * 100))); d.b.style.width = pct + '%'; label = pct + '%'; }
        }
        if (/n|s/.test(h)) {
            const hh = Math.max(30, Math.round(d.hh + (/n/.test(h) ? -dy : dy)));
            d.b.style.height = hh + 'px';
            label += (label ? ' × ' : '') + hh + 'px';
        }
        d.label = label + (/e|w/.test(h) ? '  (hold Alt for px)' : '');
        placeHandles();
    }
    function endHandle() {
        document.removeEventListener('pointermove', moveHandle);
        const d = hDrag;
        hDrag = null;
        if (d) {
            const st = d.it.style = d.it.style || {};
            if (d.b.style.width) st.width = d.b.style.width;
            if (d.b.style.height) st.height = d.b.style.height;
            saveDoc();
            paneRefresh();
        }
        placeHandles();
        OS.sync();
    }
    document.addEventListener('scroll', soonHandles, true);
    window.addEventListener('resize', soonHandles);
    new MutationObserver(soonHandles).observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    const origRender = window.renderDocument;
    window.renderDocument = function () { const r = origRender.apply(this, arguments); paneRefresh(); soonHandles(); return r; };
    page.addEventListener('mousedown', function () { setTimeout(function () { paneRefresh(); soonHandles(); }, 0); });
    page.addEventListener('focusin', function () { setTimeout(function () { paneRefresh(); soonHandles(); }, 0); });
    // Online pictures: free CC0 / CC BY / CC BY-SA images, linked straight from Wikimedia Commons!
    function onlinePicture() {
        if (!window.RadiiImages) return;
        window.RadiiImages.open({
            title: 'Online Pictures', accent: '#00a88f', accent2: '#00D6B6', glow: 'rgba(0,214,182,.3)', hotlink: true,
            onPick: function (r) {
                const img = addBlock('image', 'hero', r.url);
                if (r.withCredit) {
                    const c = addBlock('paragraph', 'standard', '<span style="font-size:.75rem;color:#64748b">' + r.creditHtml + '</span>');
                }
                OS.toast(r.withCredit ? 'Picture added with its credit line!' : 'Picture added!');
            }
        });
    }
    window.openOnlinePictures = onlinePicture;
    const CARDS_GROUP = { label: 'Cards', items: [
        { big: true, icon: 'font', label: 'Heading', run: function () { addBlock('heading', 'h2'); }, menu: function () { return cardMenu('heading'); } },
        { big: true, icon: 'page', label: 'Text', run: function () { addBlock('paragraph', 'standard'); }, menu: function () { return cardMenu('paragraph'); } },
        { big: true, icon: 'notes', label: 'Rich\nText', title: 'A free-form Keydown card (tags, skills, chips)!', run: function () { addBlock('rich', '', ''); } },
        { stack: [
            { sm: true, icon: 'bubble', label: 'Button', run: function () { addBlock('button', 'primary'); }, menu: function () { return cardMenu('button'); } },
            { sm: true, icon: 'image', label: 'Picture', run: insertImage, menu: function () { return cardMenu('image'); } },
            { sm: true, icon: 'cards', label: 'Feature Card', run: function () { addBlock('card', 'border'); }, menu: function () { return cardMenu('card'); } }
        ] },
        { big: true, icon: 'search', label: 'Online\nPicture', title: 'Search free CC0 / CC BY / CC BY-SA pictures!', run: onlinePicture },
        { big: true, icon: 'code', label: 'HTML\nBlock', title: 'Your own HTML, with a live preview!', run: function () { addBlock('html', '', '<div style="padding:20px;border-radius:12px;background:#f1f5f9">Hello from your own HTML!</div>'); } }
    ] };
    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'Clipboard', items: [
                    { big: true, icon: 'paste', label: 'Paste', run: function () { OS.toast('Use ⌘V (Ctrl+V) to paste!'); } },
                    { stack: [
                        { sm: true, icon: 'cut', label: 'Cut', run: function () { exec('cut'); } },
                        { sm: true, icon: 'copy', label: 'Copy', run: function () { exec('copy'); } },
                        { sm: true, icon: 'clearFormat', label: 'Clear Formatting', run: function () { exec('removeFormat'); } }
                    ] }
                ] },
                { label: 'Font', items: [{ rows: [
                    [
                        { glyph: 'B', glyphCls: 'b', title: 'Bold', kbd: '⌘B', run: function () { exec('bold'); }, checked: function () { return inTag('b, strong'); } },
                        { glyph: 'I', glyphCls: 'it', title: 'Italic', kbd: '⌘I', run: function () { exec('italic'); }, checked: function () { return inTag('i, em'); } },
                        { glyph: 'U', glyphCls: 'u', title: 'Underline', kbd: '⌘U', run: function () { exec('underline'); }, checked: function () { return inTag('u'); } },
                        { glyph: 'ab', glyphCls: 's', title: 'Strikethrough', run: function () { exec('strikethrough'); }, checked: function () { return inTag('s, strike, del'); } },
                        { icon: 'code', title: 'Inline Code', run: function () { wrapTag('code'); }, checked: function () { return inTag('code'); } }
                    ],
                    [
                        { icon: 'highlighter', title: 'Highlighter (Annotate styles: highlight, underline, strike, box, halo, corner brackets, spotlight)', menu: highlightMenu },
                        { icon: 'orb', title: 'Gel Orbs', menu: function () { return chipMenu('Gel Orbs', ORBS, 4); } },
                        { icon: 'bubble', title: 'Gel Bubbles', menu: function () { return chipMenu('Gel Bubbles', BUBBLES, 4); } },
                        { icon: 'tag', title: 'Tag Chips', menu: function () { return chipMenu('Tag Chips', TAGCHIPS, 4); } },
                        { icon: 'sparkle', title: 'Effects', menu: function () { return chipMenu('Keydown Effects', EFFECTS, 4); } },
                        { icon: 'droplets', title: 'Pastels, Pills & Badges', menu: function () { return chipMenu('Pastels, Pills & Badges', PASTELS, 5); } }
                    ]
                ] }] },
                { label: 'Card Styles', items: [{ gallery: true, cls: 'om-card-gal', items: cardsGallery, menu: function () { return [{ header: 'Card Styles' }].concat(cardsGallery.map(function (g) { return { label: g.label, checked: g.active(), run: g.run }; })); } }] },
                { label: 'Keydown', items: [
                    { big: true, icon: 'store', label: 'Marketplace\nStyles', title: 'Every Marketplace Keydown pack!', menu: marketMenu },
                    { big: true, icon: 'palette', label: 'Skills', title: 'Uni-Chip, Custom Chip and 3150 Unique Styles!', run: function () { skill('us'); }, menu: function () { return [{ label: 'Uni-Chip', icon: 'palette', run: function () { skill('uni'); } }, { label: 'Custom Chip', icon: 'bubble', run: function () { skill('cc'); } }, { label: 'Unique Styles', icon: 'sparkle', run: function () { skill('us'); } }]; } }
                ] },
                { label: 'Arrange', items: [{ stack: [
                    { sm: true, icon: 'arrowUp', label: 'Move Up', run: function () { moveBlock(-1); } },
                    { sm: true, icon: 'arrowDown', label: 'Move Down', run: function () { moveBlock(1); } },
                    { sm: true, icon: 'duplicate', label: 'Duplicate', run: duplicateBlock }
                ] }, { big: true, icon: 'trash', label: 'Delete\nCard', run: deleteBlock }] }
            ]
        },
        {
            id: 'insert', label: 'Insert', groups: [
                CARDS_GROUP,
                { label: 'Content Blocks', items: [{ gallery: true, cls: 'om-cb-gal', items: CONTENT_BLOCKS.map(function (c, i) { return { label: c[0], title: c[1], preview: dia(c[3]), run: function () { insertContentBlock(i); } }; }) }] },
                { label: 'Bitbook', items: [{ big: true, icon: 'notebook', label: 'Bitbook\nNote', title: 'Insert a .kn note as a paragraph (tags + skills included)!', run: importBitbook }] },
                { label: 'Tags', items: [{ gallery: true, cls: 'bb-tag-gal', items: tagGallery }] },
                { label: 'Skills', items: [
                    { big: true, icon: 'palette', label: 'Uni-Chip', run: function () { skill('uni'); } },
                    { big: true, icon: 'bubble', label: 'Custom\nChip', run: function () { skill('cc'); } },
                    { big: true, icon: 'sparkle', label: 'Unique\nStyles', run: function () { skill('us'); } }
                ] },
                { label: 'Keydown Blocks', items: [{ big: true, icon: 'shapes', label: 'Blocks', menu: function () { return MACROS.map(function (m) { return { label: m[1], hint: m[0], run: function () { blockMacro(m[0]); } }; }); } }] }
            ]
        },
        {
            id: 'design', label: 'Design', groups: [
                { label: 'Accent', items: [
                    { custom: function (c) {
                        c.className += ' om-accents';
                        ACCENTS.forEach(function (a) {
                            const b = document.createElement('button');
                            b.type = 'button';
                            b.title = a;
                            b.style.background = a;
                            b.addEventListener('click', function () { setAccent(a); });
                            c.appendChild(b);
                        });
                    } },
                    { big: true, icon: 'palette', label: 'Custom\nColor', run: function () { const i = document.getElementById('accent-color'); if (i) i.click(); } }
                ] },
                { label: 'Page', items: [
                    { select: true, title: 'Page Width', width: 190, options: WIDTHS, get: currentWidth, set: function (v) { updateCanvasWidth(v); } }
                ] },
                { label: 'Page Title', items: [{ big: true, icon: 'textbox', label: 'Rename', run: function () { OS.prompt('Page Title', 'Title (used for the export too):', docTitle(), 'Rename').then(function (v) { if (v) { setTitle(v); OS.rebuild(); } }); } }] }
            ]
        },
        {
            id: 'layout', label: 'Layout', groups: [
                { label: 'Page Layout', items: [{ gallery: true, cls: 'om-fx-gal', items: FLEX_PRESETS.map(function (pr) { return { label: pr[0], title: pr[1], preview: dia(pr[2]), run: function () { applyFlexPreset(pr); }, active: function () { return pr[4] === 0 && pageFlex.dir === pr[3].dir && pageFlex.wrap === pr[3].wrap && pageFlex.justify === pr[3].justify && pageFlex.align === pr[3].align; } }; }) }] },
                { label: 'Fine-tune Flexbox', items: [{ rows: [
                    [
                        { select: true, title: 'Direction', width: 110, options: [['column', 'Column ↓'], ['row', 'Row →'], ['column-reverse', 'Column ↑'], ['row-reverse', 'Row ←']], get: function () { return pageFlex.dir; }, set: function (v) { setFlex('dir', v); } },
                        { select: true, title: 'Wrap', width: 92, options: [['nowrap', 'No wrap'], ['wrap', 'Wrap']], get: function () { return pageFlex.wrap; }, set: function (v) { setFlex('wrap', v); } },
                        { number: true, title: 'Gap (px)', width: 46, min: 0, max: 200, get: function () { return parseInt(pageFlex.gap, 10) || 0; }, set: function (v) { setFlex('gap', v); } }
                    ],
                    [
                        { select: true, title: 'Justify content', width: 128, options: [['flex-start', 'Start'], ['center', 'Center'], ['flex-end', 'End'], ['space-between', 'Space between'], ['space-around', 'Space around'], ['space-evenly', 'Space evenly']], get: function () { return pageFlex.justify; }, set: function (v) { setFlex('justify', v); } },
                        { select: true, title: 'Align items', width: 108, options: [['stretch', 'Stretch'], ['flex-start', 'Top'], ['center', 'Middle'], ['flex-end', 'Bottom'], ['baseline', 'Baseline']], get: function () { return pageFlex.align; }, set: function (v) { setFlex('align', v); } }
                    ]
                ] }] },
                { label: 'Manage', items: [
                    { big: true, icon: 'navPane', label: 'Cards\nList', title: 'A list of every card: select, reorder, resize', run: function () { setPane(!prefs.pane); }, checked: function () { return prefs.pane; } },
                    { big: true, icon: 'plus', label: 'Line\nBelow', title: 'A new full-width line under this card (it never joins a flexed row)', run: lineBelow }
                ] },
                { label: 'Card Spacing', items: [
                    { big: true, icon: 'margins', label: 'Margin', title: 'Space OUTSIDE the card', menu: function () { return spaceMenu('margin'); } },
                    { big: true, icon: 'pageColor', label: 'Padding', title: 'Space INSIDE the card', menu: function () { return spaceMenu('padding'); } },
                    { big: true, icon: 'size', label: 'Box &\nSize…', title: 'Margin, padding and size on one picture', run: advancedLayout },
                    { big: true, icon: 'ruler', label: 'Spacing\nGuides', title: 'Show the orange margin and green padding bands with drag grips', run: function () { prefs.spacing = !prefs.spacing; savePrefs(); placeHandles(); OS.sync(); }, checked: function () { return prefs.spacing; } }
                ] },
                { label: 'Card Align', items: [{ rows: [
                    [alignBtn('aLeft', 'Text: left', 'left'), alignBtn('aCenter', 'Text: center', 'center'), alignBtn('aRight', 'Text: right', 'right'), alignBtn('aJustify', 'Text: justify', 'justify')],
                    [blockBtn('aLeft', 'Card: left side', 'left'), blockBtn('aCenter', 'Card: centered', 'center'), blockBtn('aRight', 'Card: right side', 'right')]
                ] }] },
                { label: 'Card Size', items: [{ rows: [
                    [
                        { select: true, title: 'Width', width: 92, options: WIDTHS_CARD, get: function () { return styleOf('width'); }, set: function (v) { setStyle('width', v); } },
                        { select: true, title: 'Height', width: 108, options: HEIGHTS_CARD, get: function () { return styleOf('height'); }, set: function (v) { setStyle('height', v); } }
                    ],
                    [
                        { select: true, title: 'Font size', width: 92, options: FONT_S, get: function () { return styleOf('fontSize'); }, set: function (v) { setStyle('fontSize', v); } },
                        { select: true, title: 'Line height', width: 108, options: LINE_H, get: function () { return styleOf('lineHeight'); }, set: function (v) { setStyle('lineHeight', v); } }
                    ]
                ] }] }
            ]
        },
        {
            id: 'code', label: 'Code', groups: [
                { label: 'Insert', items: [{ big: true, icon: 'code', label: 'HTML\nBlock', title: 'Your own HTML, with a live preview!', run: function () { addBlock('html', '', '<div style="padding:20px;border-radius:12px;background:#f1f5f9">Hello from your own HTML!</div>'); } }] },
                { label: 'Page Code', items: [
                    { big: true, icon: 'css', label: 'CSS', title: 'Styles for the whole page', run: function () { codeDialog('css'); } },
                    { big: true, icon: 'jumper', label: 'JavaScript', title: 'Script for the exported page', run: function () { codeDialog('js'); } },
                    { big: true, icon: 'web', label: 'Head\nHTML', title: 'Extra tags for <head>', run: function () { codeDialog('head'); } }
                ] },
                { label: 'Run', items: [{ big: true, icon: 'eye', label: 'Preview\nPage', title: 'Run the page with your CSS and JavaScript', run: previewPage }] }
            ]
        },
        {
            id: 'view', label: 'View', groups: [
                { label: 'Zoom', items: [
                    { big: true, icon: 'zoom', label: 'Zoom', menu: function () { return [50, 75, 90, 100, 125, 150].map(function (z) { return { label: z + '%', checked: Math.round(prefs.zoom * 100) === z, run: function () { setZoom(z / 100); } }; }); } },
                    { big: true, glyph: '100', label: '100%', run: function () { setZoom(1); } }
                ] },
                { label: 'Show', items: [{ stack: [
                    { check: true, label: 'Card Outlines', get: function () { return prefs.outlines; }, set: function (v) { prefs.outlines = v; savePrefs(); applyView(); } },
                    { check: true, label: 'Cards List', get: function () { return prefs.pane; }, set: function (v) { setPane(v); } }
                ] }] },
                { label: 'Preview', items: [{ big: true, icon: 'eye', label: 'Preview\nPage', title: 'Open the exported page in a new tab!', run: previewPage }] },
                { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: function () { return [{ label: 'Sway', checked: true, icon: 'layout', run: function () { OS.setLayout('office'); } }, { label: 'Omicron Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }] }
            ]
        },
        {
            id: 'help', label: 'Help', groups: [
                { label: 'Help', items: [{ big: true, icon: 'keyboard', label: 'Keydown\nCheat Sheet', run: cheatSheet }] },
                { label: 'BitLang', items: [{ big: true, icon: 'code', label: 'BitLang\nGuide', run: function () { if (window.BitLang) BitLang.openDocs(); } }] }
            ]
        }
    ];
    function wrapTag(t) {
        const host = caretHost();
        if (!host) return;
        const s = window.getSelection();
        const r = s.getRangeAt(0);
        const n = document.createElement(t);
        if (r.collapsed) n.textContent = 'code'; else n.appendChild(r.extractContents());
        r.insertNode(n);
        const c = document.createRange();
        c.setStartAfter(n);
        s.removeAllRanges();
        s.addRange(c);
        changed(host);
    }
    function previewPage() {
        loadStyleCss().then(function (css) {
            const w = window.open('', '_blank');
            if (!w) { OS.toast('Allow pop-ups to preview!'); return; }
            w.document.open();
            w.document.write(pageHTML(css));
            w.document.close();
        }).catch(function () { OS.toast('Could not read Style.css!'); });
    }
    function cheatSheet() {
        const rows = [['=Y=text=Y=', 'Yellow gel orb (R, G, C, B, V, P, O, MG, LM, AQ, SL too)'], ['#C#text#', 'Cyan gel bubble'], ['!#A#text#', 'Aqua tag chip'], ['**text**', 'Bold'], ['*text*', 'Italic'], ['`code`', 'Inline code'], ['~W~text~W~', 'Kinetic wave'], ['~M~text~M~', 'Mirrored text'], ['::aqua', 'Aqua box (then Space)'], ['::console', 'Debug console'], ['::foldout', 'Foldout panel']];
        (window.OMICRON_EXTRA_DEFS || []).slice(0, 400).forEach(function (d) { rows.push([d.open + 'text' + d.close, 'Marketplace: ' + d.className.replace(/^mkt-/, '')]); });
        const box = document.createElement('div');
        box.className = 'om-cheat';
        box.innerHTML = '<p class="os-dlg-text">Type a trigger in any card, then press Space!</p><table>' + rows.map(function (r) { return '<tr><td><code>' + OS.esc(r[0]) + '</code></td><td>' + OS.esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
        OS.dialog('Keydown Cheat Sheet', box, [{ label: 'Done', primary: true, value: true }]);
    }

    /* ---------- Boot ---------- */
    OS.init({
        app: 'Omicron',
        officeName: 'Sway',
        kind: 'word',
        key: 'omicron',
        icon: LOGO,
        officeHint: 'A teal ribbon with cards, styles, tags and skills, and a File screen with a website ZIP export, like Sway!',
        classicHint: 'The original Omicron: a dark glass sidebar and gel dropdowns!',
        classicToast: 'Omicron Classic: dark glass and gel!',
        theme: { accent: '#00D6B6', 'accent-d': '#00a88f', 'accent-l': '#ccfbf1', title: '#00a88f', gel1: '#00D6B6', gel2: '#00a88f', 'gel-border': '#7effeb', 'gel-glow': 'rgba(0, 214, 182, 0.5)', glow: 'rgba(204, 251, 241, 0.9)', 'thumb-bg': '#0f172a' },
        editor: function () { return page; },
        keepSelection: true,
        title: docTitle,
        rename: function (name) { setTitle(name); },
        qat: [
            { icon: 'save', title: 'Save a copy (.omicron.json)', run: saveProject },
            { icon: 'undo', title: 'Undo (⌘Z)', run: function () { exec('undo'); } },
            { icon: 'redo', title: 'Redo (⌘⇧Z)', run: function () { exec('redo'); } },
            { icon: 'web', title: 'Export website ZIP', run: exportZip }
        ],
        tabs: tabs,
        backstage: backstage,
        settings: settingsExtra,
        status: function () {
            const s = stats();
            const i = curIndex();
            return [(i === -1 ? '' : 'Card <b>' + (i + 1) + '</b> of ') + '<b>' + s.blocks + '</b> card' + (s.blocks === 1 ? '' : 's'), '<b>' + s.words.toLocaleString() + '</b> word' + (s.words === 1 ? '' : 's'), 'Width <b>' + OS.esc(currentWidth()) + '</b>'];
        },
        zoom: { get: function () { return prefs.zoom; }, set: setZoom, min: 50, max: 200 },
        searchExtra: function (q) {
            const out = [];
            MKT.forEach(function (p) { if (p.name.toLowerCase().indexOf(q) !== -1) out.push({ label: 'Marketplace: ' + p.name, icon: 'store', where: 'Keydown', it: { run: function () { marketPack(p); } } }); });
            return out.slice(0, 6);
        },
        onLayout: function () { applyView(); }
    });

    // Omicron Classic gets a Layout button (with the layout cards) too!
    const foot = document.querySelector('.aero-sidebar .sidebar-footer-controls');
    if (foot) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sidebar-action-btn om-classic-layout';
        b.textContent = '🧩 Layout & Settings';
        b.addEventListener('click', function () {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your page stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Sway or Omicron Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'om-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        foot.insertBefore(b, foot.firstChild);
    }
    // Keep ribbon state + the status bar fresh while typing!
    page.addEventListener('input', function () { OS.sync(); });
    const accentInput = document.getElementById('accent-color');
    if (accentInput) accentInput.addEventListener('input', function () { updateAccent(accentInput.value); });
    applyView();
    if (prefs.pane) setPane(true);
    soonHandles();
    window.OmicronSway = { prefs: prefs, addBlock: addBlock, importBitbook: importBitbook, exportZip: exportZip, buildZip: buildZip, pageHTML: pageHTML, parseKn: parseKn, skill: skill, tag: tag, wrap: wrap, focusBlock: focusBlock, docTitle: docTitle, setTitle: setTitle, setAccent: setAccent };
})();

// Programs pasted/imported/co-edited into cards come alive too!
(function () {
    const page = document.getElementById('wysiwyg-page');
    if (!page || !window.BitLang || !window.MutationObserver) return;
    new MutationObserver(function () { BitLang.hydrate(page); }).observe(page, { childList: true, subtree: true });
})();
