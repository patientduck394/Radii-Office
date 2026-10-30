/* =====================================================================
   Amber's PowerPoint layout! A ribbon (Home, Insert, Design, Transitions,
   Animations, Slide Show, View), a big zoomed slide, a Notes pane, an
   Animation Pane, a Slide Sorter and drag-to-reorder thumbnails, all on
   top of Amber's own slide engine. Amber Classic stays one click away!
   Loaded after slides-app.js, marketplace.js, office-shell.js and
   amber-show.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || !window.AmberShow || typeof slides === 'undefined') return;
    const OS = window.OfficeShell;
    const SHOW = window.AmberShow;
    const FX = SHOW.EFFECTS;
    const TR = SHOW.TRANSITIONS;

    const PREF_KEY = 'amber_ppt_prefs';
    const prefs = Object.assign({ notes: true, animPane: false, zoom: 1, sorter: false }, (function () {
        try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; }
    })());
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }
    function office() { return document.body.classList.contains('os-office'); }

    /* ---------- Model helpers ---------- */
    function slide() { return slides[activeSlideIndex]; }
    function activeEl() {
        if (!activeElementId) return null;
        return slide().elements.find(function (e) { return e.id === activeElementId; }) || null;
    }
    function refresh() { renderThumbnails(); renderActiveSlide(); OS.sync(); }
    function needEl(fn) {
        return function () {
            const el = activeEl();
            if (!el) { OS.toast('Select an object on the slide first!'); return; }
            fn(el);
        };
    }
    function uid(p) { return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
    function plain(html) { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); }
    function editingSpan() {
        if (editingElementId === null) return null;
        return document.querySelector('#slide-canvas .slide-element[data-el-id="' + editingElementId + '"] .slide-text-content');
    }

    /* ---------- Clipboard (objects) ---------- */
    let clip = null;
    function copyEl(cut) {
        const el = activeEl();
        if (!el) { OS.toast('Select an object to copy!'); return; }
        clip = JSON.parse(JSON.stringify(el));
        if (cut) { deleteActiveElement(); OS.toast('Cut!'); } else OS.toast('Copied!');
        OS.sync();
    }
    function pasteEl() {
        if (!clip) { OS.toast('Copy an object first!'); return; }
        saveState();
        const c = JSON.parse(JSON.stringify(clip));
        c.id = uid('el');
        c.morphId = null;
        c.left = (c.left || 0) + 20;
        c.top = (c.top || 0) + 20;
        c.zIndex = slide().elements.length + 1;
        (c.anims || []).forEach(function (a, k) { a.order = nextOrder() + k; });
        slide().elements.push(c);
        clip.left = c.left;
        clip.top = c.top;
        activeElementId = c.id;
        editingElementId = null;
        refresh();
    }
    function duplicateEl() { const el = activeEl(); if (!el) { OS.toast('Select an object to duplicate!'); return; } const keep = clip; clip = JSON.parse(JSON.stringify(el)); pasteEl(); clip = keep; }

    /* ---------- Slides ---------- */
    const BG_DEFAULT = 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)';
    function textEl(content, top, left, width, height, size, extra) {
        return Object.assign({ id: uid('el'), type: 'text', content: content, top: top, left: left, width: width, height: height, zIndex: 1, fontSize: size, color: '#ffffff' }, extra || {});
    }
    const LAYOUTS = {
        title: { label: 'Title Slide', make: function () { return [textEl('CLICK TO ADD TITLE', 130, 110, 500, 64, '40px', { textAlign: 'center' }), textEl('Click to add subtitle', 210, 160, 400, 36, '20px', { zIndex: 2, textAlign: 'center' })]; } },
        content: { label: 'Title and Content', make: function () { return [textEl('Slide Title', 30, 40, 640, 54, '32px'), textEl('• First point<br>• Second point<br>• Third point', 110, 50, 600, 230, '22px', { zIndex: 2, textAlign: 'left' })]; } },
        section: { label: 'Section Header', make: function () { return [textEl('Section Title', 150, 60, 600, 64, '44px', { textAlign: 'left' }), textEl('A short description', 226, 64, 560, 34, '18px', { zIndex: 2, textAlign: 'left' })]; } },
        two: { label: 'Two Content', make: function () { return [textEl('Slide Title', 30, 40, 640, 54, '32px'), textEl('• Left point<br>• Left point', 110, 40, 300, 220, '20px', { zIndex: 2, textAlign: 'left' }), textEl('• Right point<br>• Right point', 110, 380, 300, 220, '20px', { zIndex: 3, textAlign: 'left' })]; } },
        titleOnly: { label: 'Title Only', make: function () { return [textEl('Slide Title', 30, 40, 640, 54, '32px')]; } },
        blank: { label: 'Blank', make: function () { return []; } }
    };
    function newSlide(kind) {
        saveState();
        const L = LAYOUTS[kind] || LAYOUTS.content;
        const cur = slide();
        slides.splice(activeSlideIndex + 1, 0, { id: uid('slide'), title: L.label, background: cur ? cur.background : BG_DEFAULT, elements: L.make(), transition: cur && cur.transition ? JSON.parse(JSON.stringify(cur.transition)) : null, notes: '', hidden: false });
        activeSlideIndex++;
        activeElementId = null;
        editingElementId = null;
        refresh();
        flyInThumb();
    }
    function duplicateSlide() {
        saveState();
        const copy = JSON.parse(JSON.stringify(slide()));
        copy.id = uid('slide');
        // Morph matches the copies with their originals!
        copy.elements.forEach(function (el) { el.morphId = el.morphId || el.id; el.id = uid('el'); });
        slides.splice(activeSlideIndex + 1, 0, copy);
        activeSlideIndex++;
        activeElementId = null;
        editingElementId = null;
        refresh();
        flyInThumb();
        OS.toast('Duplicated! Move things around, then try the Morph transition!');
    }
    function deleteSlide() {
        if (slides.length <= 1) { OS.toast('A deck needs at least one slide!'); return; }
        deleteCurrentSlide();
        OS.sync();
    }
    function toggleHidden() {
        saveState();
        slide().hidden = !slide().hidden;
        refresh();
        OS.toast(slide().hidden ? 'Hidden slide: it is skipped in the slide show!' : 'Slide unhidden!');
    }
    function moveSlide(from, to) {
        if (from === to || to < 0 || to >= slides.length) return;
        saveState();
        const [s] = slides.splice(from, 1);
        slides.splice(to, 0, s);
        activeSlideIndex = to;
        refresh();
    }
    function flyInThumb() {
        requestAnimationFrame(function () {
            const t = document.querySelectorAll('#thumbnail-strip .thumbnail-card')[activeSlideIndex];
            if (t) { t.classList.remove('am-thumb-in'); void t.offsetWidth; t.classList.add('am-thumb-in'); t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        });
    }

    /* ---------- Text ---------- */
    const FONTS = [['', 'Default'], ['JetBrains Mono', 'JetBrains Mono'], ['Segoe UI', 'Segoe UI'], ['Arial', 'Arial'], ['Georgia', 'Georgia'], ['Verdana', 'Verdana'], ['Trebuchet MS', 'Trebuchet MS'], ['Courier New', 'Courier New'], ['Impact', 'Impact'], ['Comic Sans MS', 'Comic Sans MS']];
    const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 72, 96];
    function setProp(key, val) {
        return needEl(function (el) { saveState(); if (val === '' || val == null) delete el[key]; else el[key] = val; refresh(); });
    }
    function bumpSize(d) {
        const el = activeEl();
        if (!el) { OS.toast('Select a text box or shape first!'); return; }
        const cur = parseFloat(el.fontSize) || 18;
        let n = d > 0 ? SIZES.find(function (s) { return s > cur; }) : SIZES.slice().reverse().find(function (s) { return s < cur; });
        if (!n) n = d > 0 ? cur + 12 : Math.max(8, cur - 2);
        changeActiveFontSize(n + 'px');
        OS.sync();
    }
    function wrapWhole(el, tag) {
        const re = new RegExp('^<' + tag + '>([\\s\\S]*)</' + tag + '>$', 'i');
        const c = String(el.content || '');
        el.content = re.test(c) ? c.replace(re, '$1') : '<' + tag + '>' + c + '</' + tag + '>';
    }
    function textStyle(cmd, tag) {
        return function () {
            const span = editingSpan();
            if (span) {
                OS.restoreSelection();
                try { document.execCommand(cmd); } catch (e) {}
                const el = activeEl();
                if (el) { el.content = span.innerHTML; renderThumbnails(); }
                return;
            }
            needEl(function (el) { saveState(); wrapWhole(el, tag); refresh(); })();
        };
    }
    function hasTag(tag) {
        const span = editingSpan();
        if (span) { try { return document.queryCommandState({ b: 'bold', i: 'italic', u: 'underline', s: 'strikeThrough' }[tag]); } catch (e) { return false; } }
        const el = activeEl();
        return !!(el && new RegExp('^<' + tag + '>', 'i').test(String(el.content || '')));
    }
    function clearText() {
        needEl(function (el) { saveState(); el.content = OS.esc(plain(el.content)); delete el.fontFamily; delete el.textAlign; refresh(); })();
    }

    const COLORS = ['#ffffff', '#f8fafc', '#cbd5e1', '#64748b', '#334155', '#0f172a', '#000000', '#fbbf24', '#f59e0b', '#d97706', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16'];
    let lastText = '#fbbf24', lastFill = '#38bdf8';
    function pickCustom(cur, cb) {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#ffffff';
        inp.style.cssText = 'position:fixed;left:-40px;top:0;opacity:0';
        document.body.appendChild(inp);
        inp.addEventListener('change', function () { cb(inp.value); inp.remove(); });
        inp.addEventListener('blur', function () { setTimeout(function () { inp.remove(); }, 400); });
        inp.click();
    }
    function textColorMenu() {
        return [{ header: 'Font Color' }, { swatches: COLORS.map(function (c) { return { color: c, title: c, run: function () { lastText = c; needEl(function () { changeActiveTextColor(c); })(); } }; }), cols: 10 },
            { sep: true }, { label: 'More Colors…', icon: 'palette', run: function () { const el = activeEl(); if (!el) { OS.toast('Select an object first!'); return; } pickCustom(el.color, function (c) { lastText = c; changeActiveTextColor(c); }); } }];
    }
    function fillMenu() {
        return [{ header: 'Shape Fill' }, { swatches: COLORS.map(function (c) { return { color: c, title: c, run: function () { lastFill = c; applyFill(c); } }; }), cols: 10 },
            { sep: true }, { label: 'More Colors…', icon: 'palette', run: function () { const el = activeEl(); if (!el) { OS.toast('Select a shape first!'); return; } pickCustom(el.fillColor, function (c) { lastFill = c; applyFill(c); }); } }];
    }
    function applyFill(c) {
        const el = activeEl();
        if (!el || el.type !== 'shape') { OS.toast('Select a shape to fill!'); return; }
        changeActiveShapeColor(c);
        OS.sync();
    }

    /* ---------- Shapes ---------- */
    const SHAPES = [['rect', 'Rectangle'], ['rounded', 'Rounded Rectangle'], ['circle', 'Oval'], ['diamond', 'Diamond'], ['triangle', 'Triangle'], ['star', 'Star'], ['heart', 'Heart'], ['hexagon', 'Hexagon'], ['arrow-right', 'Right Arrow'], ['arrow-left', 'Left Arrow'], ['speech', 'Speech Bubble'], ['plus', 'Plus'], ['chip', 'Aero Chip']];
    function shapeIcon(t) {
        const p = {
            rect: '<rect x="3" y="6" width="18" height="12" rx="1"/>', rounded: '<rect x="3" y="6" width="18" height="12" rx="4"/>', circle: '<ellipse cx="12" cy="12" rx="9" ry="7"/>',
            diamond: '<path d="M12 3l9 9-9 9-9-9z"/>', triangle: '<path d="M12 4l9 16H3z"/>', star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"/>',
            heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>', hexagon: '<path d="M7 4h10l5 8-5 8H7l-5-8z"/>', 'arrow-right': '<path d="M3 9h11V5l7 7-7 7v-4H3z"/>',
            'arrow-left': '<path d="M21 9H10V5l-7 7 7 7v-4h11z"/>', speech: '<path d="M4 5h16v10H10l-5 4v-4H4z"/>', plus: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>', chip: '<rect x="2" y="8" width="20" height="8" rx="4"/>'
        }[t] || '';
        return '<svg class="os-ico" viewBox="0 0 24 24" fill="color-mix(in srgb, var(--os-accent) 22%, transparent)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">' + p + '</svg>';
    }
    function shapesMenu() {
        return [{ header: 'Shapes' }, { cols: 7, cls: 'am-shape-grid', swatches: SHAPES.map(function (s) { return { html: shapeIcon(s[0]), title: s[1], run: function () { addShape(s[0]); OS.sync(); } }; }) }];
    }
    function arrangeMenu() {
        return [
            { label: 'Bring to Front', icon: 'bringFront', run: needEl(function () { changeLayer('front'); }) },
            { label: 'Bring Forward', icon: 'arrowUp', run: needEl(function () { changeLayer('forward'); }) },
            { label: 'Send Backward', icon: 'arrowDown', run: needEl(function () { changeLayer('backward'); }) },
            { label: 'Send to Back', icon: 'sendBack', run: needEl(function () { changeLayer('back'); }) },
            { sep: true },
            { label: 'Align Center (horizontal)', icon: 'aCenter', run: needEl(function (el) { saveState(); el.left = Math.round((720 - (el.width || 120)) / 2); refresh(); }) },
            { label: 'Align Middle (vertical)', icon: 'aJustify', run: needEl(function (el) { saveState(); el.top = Math.round((405 - (el.height || 60)) / 2); refresh(); }) }
        ];
    }
    function insertText(content, extra) {
        saveState();
        const el = textEl(content, 300, 40, 260, 36, '16px', Object.assign({ zIndex: slide().elements.length + 1 }, extra || {}));
        slide().elements.push(el);
        activeElementId = el.id;
        editingElementId = null;
        refresh();
    }

    /* ---------- Design ---------- */
    const THEMES = [
        ['Goldenrod Aero', 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)'],
        ['Lime Aero', 'linear-gradient(180deg, #a3e635 0%, #65a30d 100%)'],
        ['Aqua Gel', 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'],
        ['Classic Glass', 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)'],
        ['Sunset', 'linear-gradient(135deg, #f97316 0%, #db2777 100%)'],
        ['Ocean', 'linear-gradient(160deg, #0ea5e9 0%, #1e3a8a 100%)'],
        ['Violet', 'linear-gradient(180deg, #a855f7 0%, #4c1d95 100%)'],
        ['Midnight', 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'],
        ['Mint', 'linear-gradient(180deg, #6ee7b7 0%, #059669 100%)'],
        ['Rose', 'linear-gradient(180deg, #fda4af 0%, #e11d48 100%)'],
        ['Paper', 'linear-gradient(180deg, #fffbeb 0%, #fde68a 100%)'],
        ['Graphite', 'linear-gradient(180deg, #52525b 0%, #18181b 100%)']
    ];
    function marketThemes() {
        const M = window.AmberMarketplace;
        if (!M) return [];
        let ids = [];
        try { ids = M.installed(); } catch (e) {}
        const out = [];
        (M.catalog || []).forEach(function (ext) {
            if (ext.kind === 'theme-pack' && ids.indexOf(ext.id) !== -1) (ext.backgrounds || []).forEach(function (b) { out.push([b.name, b.css]); });
        });
        return out;
    }
    let themeSig = '';
    function themeGalleryItems() {
        return THEMES.concat(marketThemes()).map(function (t) {
            return { label: t[0], title: t[0], preview: '<i class="am-theme-prev" style="background:' + t[1] + '"><b>Aa</b></i>', run: function () { changeBackground(t[1]); OS.sync(); }, active: function () { return slide().background === t[1]; } };
        });
    }
    function applyBgToAll() {
        saveState();
        const bg = slide().background;
        slides.forEach(function (s) { s.background = bg; });
        refresh();
        OS.toast('Background applied to all ' + slides.length + ' slides!');
    }
    function formatBackground() {
        const cur = slide().background;
        const m = String(cur).match(/#[0-9a-f]{6}/gi) || ['#fbbf24', '#d97706'];
        const box = document.createElement('div');
        box.innerHTML = '<div class="am-bg-row"><label class="os-field"><span>Top color</span><input type="color" id="am-bg-a" value="' + m[0] + '"></label><label class="os-field"><span>Bottom color</span><input type="color" id="am-bg-b" value="' + (m[1] || m[0]) + '"></label></div>' +
            '<label class="os-check"><input type="checkbox" id="am-bg-solid"><span>Solid color (use the top color only)</span></label><div class="am-bg-prev" id="am-bg-prev"></div>';
        const css = function () {
            const a = box.querySelector('#am-bg-a').value, b = box.querySelector('#am-bg-b').value;
            return box.querySelector('#am-bg-solid').checked ? a : 'linear-gradient(180deg, ' + a + ' 0%, ' + b + ' 100%)';
        };
        const upd = function () { box.querySelector('#am-bg-prev').style.background = css(); };
        box.addEventListener('input', upd);
        box.addEventListener('change', upd);
        setTimeout(upd, 0);
        OS.dialog('Format Background', box, [{ label: 'Cancel', value: null }, { label: 'Apply to All', value: function () { return { all: true, css: css() }; } }, { label: 'Apply', primary: true, value: function () { return { css: css() }; } }]).then(function (v) {
            if (!v) return;
            changeBackground(v.css);
            if (v.all) applyBgToAll();
        });
    }

    /* ---------- Transitions ---------- */
    function curTr() { return slide().transition || null; }
    function setTransition(type) {
        saveState();
        if (type === 'none') slide().transition = null;
        else {
            const old = slide().transition || {};
            slide().transition = { type: type, dir: TR[type].dirs ? (old.dir || 'left') : 'left', duration: old.duration || (type === 'morph' ? 1.2 : 0.8), advanceAfter: old.advanceAfter != null ? old.advanceAfter : null };
        }
        refresh();
        if (type !== 'none') SHOW.preview(activeSlideIndex, { animations: false });
    }
    function trDirMenu() {
        const t = curTr();
        if (!t || !TR[t.type].dirs) return [{ header: 'This transition has no direction options!' }];
        const names = t.type === 'split' ? { left: 'Vertical Out', up: 'Horizontal Out' } : { left: 'From Right', right: 'From Left', up: 'From Bottom', down: 'From Top' };
        return Object.keys(names).map(function (d) {
            return { label: names[d], icon: { left: 'chevLeft', right: 'chevRight', up: 'arrowUp', down: 'arrowDown' }[d], checked: t.dir === d, run: function () { saveState(); t.dir = d; refresh(); SHOW.preview(activeSlideIndex, { animations: false }); } };
        });
    }
    function applyTrToAll() {
        saveState();
        const t = curTr();
        slides.forEach(function (s) { s.transition = t ? JSON.parse(JSON.stringify(t)) : null; });
        refresh();
        OS.toast(t ? TR[t.type].label + ' applied to all ' + slides.length + ' slides!' : 'Transitions removed from every slide!');
    }
    // Little animated previews of each transition (they play on hover)!
    function trPreview(type) {
        return '<i class="am-trp am-trp-' + type + '"><i class="a"></i><i class="b"></i></i>';
    }
    const trGallery = Object.keys(TR).map(function (k) {
        return { label: TR[k].label, title: TR[k].label + (k === 'morph' ? ': matching objects glide between slides!' : ''), preview: trPreview(k), run: function () { setTransition(k); }, active: function () { const t = curTr(); return k === 'none' ? !t : !!(t && t.type === k); } };
    });

    /* ---------- Animations (an object can have several, in a row!) ---------- */
    // Which of the selected object's animations the ribbon edits: {el, idx}!
    let pick = { el: null, idx: 0 };
    function anims(el) { if (!el.anims) el.anims = []; return el.anims; }
    function hasAnims(el) { return !!(el && el.anims && el.anims.length); }
    // Every animation on the slide, in play order: [{el, a}]!
    function animated() { return SHOW.entries(slide()); }
    function nextOrder() {
        let m = 0;
        slide().elements.forEach(function (e) { (e.anims || []).forEach(function (a) { m = Math.max(m, a.order || 0); }); });
        return m + 1;
    }
    function renumber() { animated().forEach(function (en, i) { en.a.order = i + 1; }); }
    function curAnim() {
        const el = activeEl();
        if (!hasAnims(el)) return null;
        const idx = pick.el === el.id ? Math.min(pick.idx, el.anims.length - 1) : 0;
        return el.anims[idx];
    }
    function selectAnim(el, a) {
        pick = { el: el.id, idx: Math.max(0, el.anims.indexOf(a)) };
    }
    function newEntry(effect, from) {
        const fx = FX[effect];
        return {
            effect: effect,
            dir: fx.dirs ? (from && from.dir) || (fx.kind === 'exit' ? 'right' : 'left') : 'up',
            start: from ? from.start : 'click',
            duration: from && from.effect !== 'appear' && effect !== 'appear' ? from.duration : (fx.dur || 0.6),
            delay: from ? from.delay : 0,
            order: from ? from.order : nextOrder()
        };
    }
    // Gallery click: change the picked animation's effect (or give it its first one)!
    function setAnim(effect) {
        const el = activeEl();
        if (!el) { OS.toast('Select an object to animate first!'); return; }
        saveState();
        const cur = curAnim();
        if (effect === 'none') {
            if (cur) el.anims.splice(el.anims.indexOf(cur), 1);
            pick.idx = Math.max(0, pick.idx - 1);
            renumber();
            refresh();
            return;
        }
        const entry = newEntry(effect, cur);
        if (cur) el.anims[el.anims.indexOf(cur)] = entry;
        else anims(el).push(entry);
        selectAnim(el, entry);
        refresh();
        SHOW.previewElement(el, entry);
    }
    // Add Animation: stack ANOTHER effect onto the same object (Float In, then Teeter...)!
    function addAnim(effect) {
        const el = activeEl();
        if (!el) { OS.toast('Select an object to animate first!'); return; }
        saveState();
        const entry = newEntry(effect, null);
        // Follow-ups play right after the object's previous animation by default!
        if (hasAnims(el)) entry.start = 'after';
        anims(el).push(entry);
        selectAnim(el, entry);
        // Slot it right after this object's last animation in the play order!
        const list = animated();
        const mine = list.filter(function (en) { return en.el === el && en.a !== entry; });
        const before = mine.length ? list.indexOf(mine[mine.length - 1]) + 1 : list.length - 1;
        const without = list.filter(function (en) { return en.a !== entry; });
        without.splice(Math.min(before, without.length), 0, { el: el, a: entry });
        without.forEach(function (en, i) { en.a.order = i + 1; });
        refresh();
        SHOW.previewElement(el, entry);
        OS.toast(FX[effect].label + ' added! This object now has ' + el.anims.length + ' animation' + (el.anims.length === 1 ? '' : 's') + '!');
    }
    function addAnimMenu() {
        const out = [];
        ['entrance', 'emphasis', 'exit'].forEach(function (kind) {
            out.push({ header: kind[0].toUpperCase() + kind.slice(1) });
            out.push({ cols: 6, cls: 'am-add-grid', swatches: Object.keys(FX).filter(function (k) { return FX[k].kind === kind; }).map(function (k) {
                return { html: '<b style="color:' + KIND_COLOR[kind] + '">★</b><span>' + OS.esc(FX[k].label) + '</span>', title: 'Add ' + FX[k].label, run: function () { addAnim(k); } };
            }) });
        });
        return out;
    }
    function animDirMenu() {
        const a = curAnim();
        const el = activeEl();
        if (!a || !FX[a.effect].dirs) return [{ header: 'Pick Fly In, Wipe or Fly Out for direction options!' }];
        const kind = FX[a.effect].kind;
        const names = kind === 'exit' ? { left: 'To Left', right: 'To Right', up: 'To Top', down: 'To Bottom' } : { left: 'From Left', right: 'From Right', up: 'From Bottom', down: 'From Top' };
        return Object.keys(names).map(function (d) {
            return { label: names[d], icon: { left: 'chevLeft', right: 'chevRight', up: 'arrowUp', down: 'arrowDown' }[d], checked: a.dir === d, run: function () { saveState(); a.dir = d; refresh(); SHOW.previewElement(el, a); } };
        });
    }
    // Move Earlier / Later: shift the picked animation through the slide's play order!
    function moveAnim(d) {
        const a = curAnim();
        if (!a) { OS.toast('Select an animated object first!'); return; }
        const list = animated();
        const i = list.findIndex(function (en) { return en.a === a; });
        const j = i + d;
        if (j < 0 || j >= list.length) return;
        saveState();
        const [en] = list.splice(i, 1);
        list.splice(j, 0, en);
        list.forEach(function (x, k) { x.a.order = k + 1; });
        refresh();
    }
    const KIND_COLOR = { entrance: '#22c55e', emphasis: '#f59e0b', exit: '#ef4444' };
    function animPreview(k) {
        const f = FX[k];
        return '<i class="am-anp" style="--k:' + KIND_COLOR[f.kind] + '"><b class="am-anp-' + k + '">★</b></i>';
    }
    const animGallery = [{ label: 'None', title: 'Remove the selected animation', preview: '<i class="am-anp" style="--k:#94a3b8"><b>∅</b></i>', run: function () { setAnim('none'); }, active: function () { const e = activeEl(); return !!e && !hasAnims(e); } }]
        .concat(Object.keys(FX).map(function (k) {
            return { label: FX[k].label, title: FX[k].label + ' (' + FX[k].kind + ')', cls: 'am-k-' + FX[k].kind, preview: animPreview(k), run: function () { setAnim(k); }, active: function () { const a = curAnim(); return !!(a && a.effect === k); } };
        }));
    function animProp(key, val) {
        const a = curAnim();
        if (!a) { OS.toast('Give the object an animation first!'); return; }
        saveState();
        a[key] = val;
        refresh();
    }
    function noAnim() { return !curAnim(); }

    /* ---------- Editor decorations (zoomed slide, badges, thumbnails) ---------- */
    function fitCanvas() {
        const c = document.getElementById('slide-canvas');
        const stage = document.querySelector('.canvas-stage');
        if (!c || !stage) return;
        if (!office()) { c.style.zoom = ''; return; }
        const w = stage.clientWidth - 48, h = stage.clientHeight - 48;
        const z = Math.max(0.3, Math.min(w / 720, h / 405)) * (prefs.zoom || 1);
        c.style.zoom = String(Math.round(z * 1000) / 1000);
    }

    function badges() {
        const c = document.getElementById('slide-canvas');
        if (!c) return;
        c.querySelectorAll('.am-badge').forEach(function (b) { b.remove(); });
        const show = office() && (document.querySelector('#os-tabs .os-tab.on[data-tab="animations"]') || prefs.animPane);
        if (!show) return;
        const steps = SHOW.buildSteps(slide());
        const num = {};
        let n = 0;
        steps.forEach(function (st, i) {
            const label = st.auto ? 0 : ++n;
            st.items.forEach(function (it) { (num[it.el.id] = num[it.el.id] || []).push({ n: label, kind: FX[it.a.effect].kind }); });
        });
        Object.keys(num).forEach(function (id) {
            const node = c.querySelector('.slide-element[data-el-id="' + id + '"]');
            if (!node) return;
            const b = document.createElement('span');
            b.className = 'am-badge am-badge-' + num[id][0].kind;
            b.textContent = num[id].map(function (x) { return x.n; }).filter(function (n, i, arr) { return arr.indexOf(n) === i; }).join(',') + (num[id].length > 1 ? ' ×' + num[id].length : '');
            node.appendChild(b);
        });
    }

    function decorateThumbs() {
        const cards = document.querySelectorAll('#thumbnail-strip .thumbnail-card');
        cards.forEach(function (card, i) {
            const s = slides[i];
            if (!s) return;
            card.classList.toggle('am-hidden-slide', !!s.hidden);
            if (s.transition || s.elements.some(hasAnims)) {
                const st = document.createElement('span');
                st.className = 'am-thumb-star';
                st.title = (s.transition ? TR[s.transition.type].label + ' transition' : '') + (s.elements.some(hasAnims) ? (s.transition ? ' + ' : '') + 'animations' : '');
                st.textContent = '★';
                card.appendChild(st);
            }
            if (card._amWired) return;
            card._amWired = true;
            card.draggable = true;
            card.addEventListener('dragstart', function (e) { card.classList.add('am-dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/amber-slide', String([].indexOf.call(card.parentNode.children, card))); });
            card.addEventListener('dragend', function () { card.classList.remove('am-dragging'); document.querySelectorAll('.am-drop-before,.am-drop-after').forEach(function (x) { x.classList.remove('am-drop-before', 'am-drop-after'); }); });
            card.addEventListener('dragover', function (e) {
                if (![].includes.call(e.dataTransfer.types, 'text/amber-slide')) return;
                e.preventDefault();
                const r = card.getBoundingClientRect();
                const after = e.clientY > r.top + r.height / 2;
                card.classList.toggle('am-drop-after', after);
                card.classList.toggle('am-drop-before', !after);
            });
            card.addEventListener('dragleave', function () { card.classList.remove('am-drop-before', 'am-drop-after'); });
            card.addEventListener('drop', function (e) {
                e.preventDefault();
                const from = +e.dataTransfer.getData('text/amber-slide');
                const idx = [].indexOf.call(card.parentNode.children, card);
                const after = card.classList.contains('am-drop-after');
                card.classList.remove('am-drop-before', 'am-drop-after');
                let to = idx + (after ? 1 : 0);
                if (from < to) to--;
                moveSlide(from, to);
                flyInThumb();
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                const idx = [].indexOf.call(card.parentNode.children, card);
                if (idx !== activeSlideIndex) card.click();
                OS.openMenu(null, [
                    { label: 'New Slide', icon: 'newSlide', run: function () { newSlide('content'); } },
                    { label: 'Duplicate Slide', icon: 'duplicate', run: duplicateSlide },
                    { label: slides[idx] && slides[idx].hidden ? 'Unhide Slide' : 'Hide Slide', icon: 'eye', run: toggleHidden },
                    { sep: true },
                    { label: 'Move Up', icon: 'arrowUp', run: function () { moveSlide(activeSlideIndex, activeSlideIndex - 1); } },
                    { label: 'Move Down', icon: 'arrowDown', run: function () { moveSlide(activeSlideIndex, activeSlideIndex + 1); } },
                    { sep: true },
                    { label: 'Present From Here', icon: 'play', run: function () { SHOW.start(activeSlideIndex); } },
                    { label: 'Delete Slide', icon: 'trash', run: deleteSlide }
                ], { x: e.clientX, y: e.clientY });
            });
        });
    }

    function syncNotes() {
        const ta = document.getElementById('amber-notes-text');
        if (ta && document.activeElement !== ta) ta.value = slide().notes || '';
    }

    function renderAnimPane() {
        const list = document.getElementById('am-pane-list');
        if (!list) return;
        const items = animated();
        const steps = SHOW.buildSteps(slide());
        const stepOf = new Map();
        let n = 0;
        steps.forEach(function (st) { const label = st.auto ? 0 : ++n; st.items.forEach(function (it) { stepOf.set(it.a, label); }); });
        if (!items.length) { list.innerHTML = '<p class="am-pane-empty">No animations yet! Select an object, then pick an effect on the Animations tab! Use <b>Add Animation</b> to give one object several effects in a row!</p>'; return; }
        const cur = curAnim();
        list.innerHTML = items.map(function (en, i) {
            const e = en.el, a = en.a;
            const f = FX[a.effect];
            const txt = plain(e.content) || (e.type === 'shape' ? (e.shapeType || 'Shape').replace(/-/g, ' ') : 'Text');
            const nth = e.anims.length > 1 ? ' <i class="am-pane-nth">' + (e.anims.indexOf(a) + 1) + '/' + e.anims.length + '</i>' : '';
            const together = a.start === 'with' && i > 0;
            return '<div class="am-pane-item' + (a === cur ? ' on' : '') + (together ? ' am-with' : '') + '" data-i="' + i + '"><span class="am-pane-num">' + stepOf.get(a) + '</span><span class="am-pane-star" style="color:' + KIND_COLOR[f.kind] + '">★</span><span class="am-pane-name"><b>' + OS.esc(txt.slice(0, 24)) + nth + '</b><small>' + OS.esc(f.label) + ' · ' + a.duration + 's' + (a.delay ? ' · +' + a.delay + 's' : '') + '</small></span>' +
                '<select class="am-pane-start" data-i="' + i + '" title="When it starts"><option value="click"' + (a.start === 'click' ? ' selected' : '') + '>⦿ On Click</option><option value="with"' + (a.start === 'with' ? ' selected' : '') + '>⇉ With Previous</option><option value="after"' + (a.start === 'after' ? ' selected' : '') + '>⏱ After Previous</option></select>' +
                '<i class="am-pane-bar" style="--k:' + KIND_COLOR[f.kind] + ';--w:' + Math.min(100, a.duration * 40) + '%;--d:' + Math.min(60, (a.delay || 0) * 40) + '%"></i></div>';
        }).join('');
    }

    let sorterSig = '';
    function renderSorter() {
        const box = document.getElementById('amber-sorter');
        if (!box || !prefs.sorter || !office()) return;
        const sig = JSON.stringify(slides) + activeSlideIndex;
        if (sig === sorterSig) return;
        sorterSig = sig;
        box.innerHTML = '';
        slides.forEach(function (s, i) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'am-sort-card' + (i === activeSlideIndex ? ' on' : '') + (s.hidden ? ' am-hidden-slide' : '');
            card.innerHTML = '<div class="am-sort-thumb"></div><span class="am-sort-num">' + (i + 1) + '</span><span class="am-sort-title">' + OS.esc(s.title || 'Slide ' + (i + 1)) + '</span>' + (s.transition ? '<span class="am-sort-tr" title="Transition">★ ' + OS.esc(TR[s.transition.type].label) + '</span>' : '');
            const holder = card.querySelector('.am-sort-thumb');
            const mini = document.getElementById('thumbnail-strip').children[i];
            if (mini) {
                const live = mini.querySelector('.thumbnail-live');
                if (live) holder.appendChild(live.cloneNode(true));
            }
            card.draggable = true;
            card.addEventListener('click', function () { if (typeof activeSlideIndex !== 'undefined') { window.Amber.goToSlide(i); sorterSig = ''; renderSorter(); } });
            card.addEventListener('dblclick', function () { setSorter(false); window.Amber.goToSlide(i); });
            card.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/amber-slide', String(i)); card.classList.add('am-dragging'); });
            card.addEventListener('dragend', function () { card.classList.remove('am-dragging'); });
            card.addEventListener('dragover', function (e) { e.preventDefault(); card.classList.add('am-drop-before'); });
            card.addEventListener('dragleave', function () { card.classList.remove('am-drop-before'); });
            card.addEventListener('drop', function (e) { e.preventDefault(); card.classList.remove('am-drop-before'); const from = +e.dataTransfer.getData('text/amber-slide'); let to = i; if (from < to) to--; moveSlide(from, Math.max(0, to)); sorterSig = ''; renderSorter(); });
            box.appendChild(card);
        });
    }
    function setSorter(on) {
        prefs.sorter = !!on;
        savePrefs();
        applyView();
        if (on) { sorterSig = ''; renderSorter(); }
    }

    function applyView() {
        const on = office();
        document.body.classList.toggle('am-notes-on', on && !!prefs.notes);
        document.body.classList.toggle('am-pane-on', on && !!prefs.animPane);
        document.body.classList.toggle('am-sorter', on && !!prefs.sorter);
        fitCanvas();
        badges();
        renderAnimPane();
        renderSorter();
        OS.sync();
    }

    // Wrap Amber's renderers so every redraw keeps the extras fresh!
    const origRenderActive = window.renderActiveSlide;
    const origRenderThumbs = window.renderThumbnails;
    window.renderActiveSlide = function () {
        origRenderActive.apply(this, arguments);
        if (!office()) return;
        fitCanvas();
        badges();
        renderAnimPane();
        syncNotes();
        OS.sync();
    };
    window.renderThumbnails = function () {
        origRenderThumbs.apply(this, arguments);
        decorateThumbs();
        if (office()) renderSorter();
    };

    /* ---------- Extra DOM: notes, animation pane, sorter ---------- */
    function buildExtras() {
        const main = document.querySelector('.workspace-viewport-wrapper');
        const notes = document.createElement('div');
        notes.id = 'amber-notes';
        notes.innerHTML = '<textarea id="amber-notes-text" placeholder="Click to add notes" spellcheck="true"></textarea>';
        main.appendChild(notes);
        const ta = notes.querySelector('textarea');
        ta.addEventListener('input', function () { slide().notes = ta.value; if (window.Amber.saveNow) { clearTimeout(ta._t); ta._t = setTimeout(window.Amber.saveNow, 300); } });

        const sorter = document.createElement('div');
        sorter.id = 'amber-sorter';
        main.appendChild(sorter);

        const pane = document.createElement('aside');
        pane.id = 'amber-anim-pane';
        pane.className = 'am-pane';
        pane.innerHTML = '<div class="am-pane-head"><b>Animation Pane</b><button type="button" class="am-pane-x" title="Close">' + OS.ico('x') + '</button></div>' +
            '<div class="am-pane-tools"><button type="button" class="am-pane-play">' + OS.ico('play') + ' Play All</button><button type="button" data-mv="-1" title="Move Earlier">' + OS.ico('arrowUp') + '</button><button type="button" data-mv="1" title="Move Later">' + OS.ico('arrowDown') + '</button></div>' +
            '<div id="am-pane-list"></div>';
        document.body.appendChild(pane);
        pane.querySelector('.am-pane-x').addEventListener('click', function () { prefs.animPane = false; savePrefs(); applyView(); });
        pane.querySelector('.am-pane-play').addEventListener('click', function () { SHOW.preview(activeSlideIndex, { transition: false }); });
        pane.addEventListener('click', function (e) {
            const mv = e.target.closest('[data-mv]');
            if (mv) { moveAnim(+mv.dataset.mv); return; }
            if (e.target.closest('select')) return;
            const it = e.target.closest('.am-pane-item');
            const en = it && animated()[+it.dataset.i];
            if (en) {
                activeElementId = en.el.id;
                editingElementId = null;
                selectAnim(en.el, en.a);
                renderActiveSlide();
                SHOW.previewElement(en.el, en.a);
            }
        });
        // Each row's Start picker: On Click, With Previous (same time!) or After Previous!
        pane.addEventListener('change', function (e) {
            const sel = e.target.closest('select.am-pane-start');
            const en = sel && animated()[+sel.dataset.i];
            if (!en) return;
            saveState();
            en.a.start = sel.value;
            activeElementId = en.el.id;
            selectAnim(en.el, en.a);
            refresh();
        });
    }

    /* ---------- File screen ---------- */
    function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
    async function newDeck() {
        if (slides.length > 1 || slides[0].elements.length > 2) {
            if (!(await OS.confirm('New Presentation', 'Start a new presentation? You can undo this (⌘Z)!', 'Start New'))) return;
        }
        saveState();
        slides.splice(0, slides.length, { id: uid('slide'), title: 'Presentation Title', background: BG_DEFAULT, elements: LAYOUTS.title.make(), transition: null, notes: '', hidden: false });
        slides[0].elements[0].content = 'PRESENTATION TITLE';
        slides[0].elements[1].content = 'Your subtitle here!';
        window.Amber.goToSlide(0);
        OS.sync();
    }
    function openKa() { const i = document.getElementById('ka-file-input'); if (i) i.click(); }
    function layoutCardPrev(kind) {
        const L = LAYOUTS[kind];
        return '<div class="os-card-prev am-lay-prev" style="background:' + BG_DEFAULT + '">' + L.make().map(function (e) {
            return '<i style="left:' + (e.left / 7.2) + '%;top:' + (e.top / 4.05) + '%;width:' + (e.width / 7.2) + '%;height:' + (e.height / 4.05) + '%"></i>';
        }).join('') + '</div>';
    }
    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'Blank Presentation', hint: 'Start a fresh deck!', preview: '<div class="os-card-prev" style="background:' + BG_DEFAULT + '"></div>', run: newDeck },
                    { label: 'Open a .ka file', hint: 'Import an Amber deck!', icon: 'folder', run: openKa },
                    { label: 'Marketplace', hint: 'Themes, templates and shape packs!', icon: 'store', run: function () { if (window.AmberMarketplace) window.AmberMarketplace.open(); } }
                ]));
                b.insertAdjacentHTML('beforeend', '<h2>This presentation</h2><div class="am-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + OS.esc(slides[0].title || 'Presentation') + '</b><span>' + slides.length + ' slide' + (slides.length === 1 ? '' : 's') + ' · ' + slides.reduce(function (n, s) { return n + SHOW.entries(s).length; }, 0) + ' animations · saves automatically in this browser!</span></div></div>');
            }
        },
        {
            id: 'new', label: 'New', icon: 'newDoc', render: function (b) {
                b.innerHTML = '<h1>New</h1>';
                b.appendChild(OS.bsCards([{ label: 'Blank Presentation', hint: 'Replaces this deck (undo with ⌘Z)!', preview: '<div class="os-card-prev" style="background:' + BG_DEFAULT + '"></div>', run: newDeck }].concat(Object.keys(LAYOUTS).map(function (k) {
                    return { label: 'Add: ' + LAYOUTS[k].label, hint: 'A new slide after this one!', preview: layoutCardPrev(k), run: function () { newSlide(k); } };
                }))));
            }
        },
        { id: 'open', label: 'Open', icon: 'folder', render: function (b) { b.innerHTML = '<h1>Open</h1>'; b.appendChild(OS.bsCards([{ label: 'Browse…', hint: 'Open an Amber .ka deck!', icon: 'folder', run: openKa }])); b.insertAdjacentHTML('beforeend', '<p class="os-note">Your deck also saves automatically in this browser!</p>'); } },
        { id: 'save', label: 'Save a Copy', icon: 'save', action: function () { exportKaFile(); OS.flashSaved('Saved!'); } },
        { id: 'present', label: 'Present', icon: 'play', action: function () { SHOW.start(0); } },
        { id: 'about', label: 'About', icon: 'info', render: function (b) { b.innerHTML = '<h1>About Amber</h1><div class="am-bs-doc"><img src="favicon-96.png" alt=""><div><b>Amber</b><span>Radii Office\'s slides app: glossy vector shapes, ' + (Object.keys(TR).length - 1) + ' transitions (including Morph), ' + Object.keys(FX).length + ' animation effects and a full-screen slide show!</span></div></div>'; } }
    ];

    function settingsExtra(b) {
        b.insertAdjacentHTML('beforeend', '<h2>Slide Show</h2>');
        const o = document.createElement('div');
        o.className = 'os-opts';
        o.appendChild(OS.optRow('Full screen', 'Slide shows fill the whole screen!', function () { return SHOW.prefs.fullscreen; }, function (v) { SHOW.prefs.fullscreen = v; SHOW.savePrefs(); }));
        o.appendChild(OS.optRow('Loop continuously', 'After the last slide, start again!', function () { return SHOW.prefs.loop; }, function (v) { SHOW.prefs.loop = v; SHOW.savePrefs(); }));
        b.appendChild(o);
        b.insertAdjacentHTML('beforeend', '<h2>Editing</h2>');
        const o2 = document.createElement('div');
        o2.className = 'os-opts';
        o2.appendChild(OS.optRow('Snap to center (horizontal)', 'Guides when you drag near the middle!', function () { return snapRules.hCenter; }, function (v) { toggleSnapRule('hCenter', v); syncSnapBoxes(); }));
        o2.appendChild(OS.optRow('Snap to center (vertical)', '', function () { return snapRules.vCenter; }, function (v) { toggleSnapRule('vCenter', v); syncSnapBoxes(); }));
        o2.appendChild(OS.optRow('Smart guides', 'Line up with other objects\' edges and centers!', function () { return snapRules.objects !== false; }, function (v) { toggleSnapRule('objects', v); syncSnapBoxes(); }));
        o2.appendChild(OS.optRow('Snap to grid (20px)', '', function () { return snapRules.grid; }, function (v) { toggleSnapRule('grid', v); syncSnapBoxes(); }));
        b.appendChild(o2);
    }
    function syncSnapBoxes() {
        const m = { hCenter: 'snap-h-center', vCenter: 'snap-v-center', grid: 'snap-grid', objects: 'snap-objects' };
        Object.keys(m).forEach(function (k) { const b = document.getElementById(m[k]); if (b) b.checked = !!snapRules[k]; });
    }
    function snapCheck(key, label) {
        return { check: true, label: label, get: function () { return snapRules[key]; }, set: function (v) { toggleSnapRule(key, v); syncSnapBoxes(); } };
    }

    function helpDeck() {
        const rows = [['F5 / Present', 'Start the slide show'], ['→ Space Enter', 'Next animation or slide'], ['← Backspace', 'Previous slide'], ['B / W', 'Black or white screen'], ['Esc', 'End the show'], ['Double-click', 'Edit text in a box'], ['Arrow keys', 'Nudge the selected object (Shift = 10px)'], ['⌘Z / ⌘⇧Z', 'Undo / redo'], ['⌘S', 'Save a .ka copy'], ['Drag thumbnails', 'Reorder slides']];
        OS.dialog('Help Deck', '<p class="os-dlg-text">Select an object, then use <b>Animations</b> to make it fly, fade or bounce! Use <b>Transitions</b> to animate between slides, and <b>Duplicate Slide + Morph</b> to make objects glide!</p><table class="am-keys">' + rows.map(function (r) { return '<tr><td><b>' + OS.esc(r[0]) + '</b></td><td>' + OS.esc(r[1]) + '</td></tr>'; }).join('') + '</table>');
    }

    /* ---------- Ribbon ---------- */
    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'Clipboard', items: [
                    { big: true, icon: 'paste', label: 'Paste', title: 'Paste the copied object', run: pasteEl, disabled: function () { return !clip; } },
                    { stack: [
                        { sm: true, icon: 'cut', label: 'Cut', run: function () { copyEl(true); } },
                        { sm: true, icon: 'copy', label: 'Copy', run: function () { copyEl(false); } },
                        { sm: true, icon: 'duplicate', label: 'Duplicate', run: duplicateEl }
                    ] }
                ] },
                { label: 'Slides', items: [
                    { big: true, icon: 'newSlide', label: 'New\nSlide', run: function () { newSlide('content'); }, menu: function () { return Object.keys(LAYOUTS).map(function (k) { return { label: LAYOUTS[k].label, icon: 'slide', run: function () { newSlide(k); } }; }).concat([{ sep: true }, { label: 'Duplicate Slide', icon: 'duplicate', run: duplicateSlide }]); } },
                    { stack: [
                        { sm: true, icon: 'duplicate', label: 'Duplicate', run: duplicateSlide },
                        { sm: true, icon: 'trash', label: 'Delete', run: deleteSlide },
                        { sm: true, icon: 'eye', label: 'Hide Slide', run: toggleHidden, checked: function () { return !!slide().hidden; } }
                    ] }
                ] },
                { label: 'Font', items: [{ rows: [
                    [
                        { select: true, title: 'Font', width: 128, options: FONTS, get: function () { const e = activeEl(); return e ? (e.fontFamily || '') : ''; }, set: function (v) { setProp('fontFamily', v)(); }, sel: false },
                        { select: true, title: 'Font Size', width: 62, options: SIZES.map(function (s) { return [s + 'px', String(s)]; }), get: function () { const e = activeEl(); return e ? (e.fontSize || '18px') : '18px'; }, set: function (v) { if (!activeEl()) { OS.toast('Select a text box first!'); return; } changeActiveFontSize(v); }, sel: false },
                        { icon: 'growFont', title: 'Increase Font Size', run: function () { bumpSize(1); } },
                        { icon: 'shrinkFont', title: 'Decrease Font Size', run: function () { bumpSize(-1); } }
                    ],
                    [
                        { glyph: 'B', glyphCls: 'b', title: 'Bold', run: textStyle('bold', 'b'), checked: function () { return hasTag('b'); } },
                        { glyph: 'I', glyphCls: 'it', title: 'Italic', run: textStyle('italic', 'i'), checked: function () { return hasTag('i'); } },
                        { glyph: 'U', glyphCls: 'u', title: 'Underline', run: textStyle('underline', 'u'), checked: function () { return hasTag('u'); } },
                        { glyph: 'ab', glyphCls: 's', title: 'Strikethrough', run: textStyle('strikeThrough', 's'), checked: function () { return hasTag('s'); } },
                        { icon: 'clearFormat', title: 'Clear Formatting', run: clearText },
                        { sep: true },
                        { icon: 'fontColor', title: 'Font Color', bar: function () { const e = activeEl(); return e ? e.color : lastText; }, run: function () { needEl(function () { changeActiveTextColor(lastText); })(); }, menu: textColorMenu }
                    ]
                ] }] },
                { label: 'Paragraph', items: [{ rows: [
                    [
                        { icon: 'aLeft', title: 'Align Left', run: setProp('textAlign', 'left'), checked: function () { const e = activeEl(); return !!e && e.textAlign === 'left'; } },
                        { icon: 'aCenter', title: 'Center', run: setProp('textAlign', 'center'), checked: function () { const e = activeEl(); return !!e && e.textAlign === 'center'; } },
                        { icon: 'aRight', title: 'Align Right', run: setProp('textAlign', 'right'), checked: function () { const e = activeEl(); return !!e && e.textAlign === 'right'; } },
                        { icon: 'aJustify', title: 'Justify', run: setProp('textAlign', 'justify'), checked: function () { const e = activeEl(); return !!e && e.textAlign === 'justify'; } }
                    ],
                    [
                        { icon: 'bullets', title: 'Bullets (adds • to each line)', run: needEl(function (el) { saveState(); const lines = String(el.content || '').split(/<br\s*\/?>/i); const has = lines.every(function (l) { return /^\s*•/.test(l); }); el.content = lines.map(function (l) { return has ? l.replace(/^\s*•\s?/, '') : '• ' + l; }).join('<br>'); refresh(); }) }
                    ]
                ] }] },
                { label: 'Drawing', items: [
                    { big: true, icon: 'shapes', label: 'Shapes', menu: shapesMenu },
                    { big: true, icon: 'bringFront', label: 'Arrange', menu: arrangeMenu },
                    { stack: [
                        { sm: true, icon: 'palette', label: 'Shape Fill', bar: function () { const e = activeEl(); return e && e.type === 'shape' ? e.fillColor : lastFill; }, run: function () { applyFill(lastFill); }, menu: fillMenu },
                        { sm: true, icon: 'textbox', label: 'Text Box', run: function () { addTextBox(); OS.sync(); } },
                        { sm: true, icon: 'trash', label: 'Delete Object', run: needEl(function () { deleteActiveElement(); OS.sync(); }) }
                    ] }
                ] }
            ]
        },
        {
            id: 'insert', label: 'Insert', groups: [
                { label: 'Slides', items: [{ big: true, icon: 'newSlide', label: 'New\nSlide', run: function () { newSlide('content'); }, menu: function () { return Object.keys(LAYOUTS).map(function (k) { return { label: LAYOUTS[k].label, icon: 'slide', run: function () { newSlide(k); } }; }); } }] },
                { label: 'Illustrations', items: [
                    { big: true, icon: 'search', label: 'OpenDB\nImages', title: 'Pick a free CC0 picture from OpenDB!', run: function () { window.openOnlinePictures(); } },
                    { big: true, icon: 'shapes', label: 'Shapes', menu: shapesMenu },
                    { big: true, icon: 'bubble', label: 'Aero\nChip', run: function () { addShape('chip'); OS.sync(); } }
                ] },
                { label: 'Text', items: [
                    { big: true, icon: 'textbox', label: 'Text\nBox', run: function () { addTextBox(); OS.sync(); } },
                    { stack: [
                        { sm: true, icon: 'calendar', label: 'Date & Time', run: function () { insertText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })); } },
                        { sm: true, icon: 'numbers', label: 'Slide Number', run: function () { insertText(String(activeSlideIndex + 1), { left: 640, top: 360, width: 60, height: 32, textAlign: 'right' }); } },
                        { sm: true, icon: 'star', label: 'Big Title', run: function () { insertText('BIG TITLE', { fontSize: '48px', width: 420, height: 64, left: 150, top: 150, textAlign: 'center' }); } }
                    ] }
                ] },
                { label: 'Extensions', items: [{ big: true, icon: 'store', label: 'Marketplace', run: function () { if (window.AmberMarketplace) window.AmberMarketplace.open(); } }] }
            ]
        },
        {
            id: 'design', label: 'Design', groups: [
                { label: 'Themes', items: [{ gallery: true, cls: 'am-theme-gal', items: themeGalleryItems, refresh: function () { const sig = marketThemes().length + ''; if (sig !== themeSig) { themeSig = sig; return true; } return false; } }] },
                { label: 'Customize', items: [
                    { big: true, icon: 'background', label: 'Format\nBackground', run: formatBackground },
                    { big: true, icon: 'duplicate', label: 'Apply to\nAll Slides', run: applyBgToAll }
                ] }
            ]
        },
        {
            id: 'transitions', label: 'Transitions', groups: [
                { label: 'Preview', items: [{ big: true, icon: 'play', label: 'Preview', title: 'Play this slide\'s transition', run: function () { if (!curTr()) { OS.toast('Pick a transition first!'); return; } SHOW.preview(activeSlideIndex, { animations: false }); } }] },
                { label: 'Transition to This Slide', items: [
                    { gallery: true, cls: 'am-tr-gal', items: trGallery },
                    { big: true, icon: 'transition', label: 'Effect\nOptions', menu: trDirMenu, disabled: function () { const t = curTr(); return !t || !TR[t.type].dirs; } }
                ] },
                { label: 'Timing', items: [{ rows: [
                    [{ number: true, label: 'Duration', unit: 's', width: 56, min: 0.1, max: 10, step: 0.1, get: function () { const t = curTr(); return t ? t.duration : 0.8; }, set: function (v) { const t = curTr(); if (!t) { OS.toast('Pick a transition first!'); return; } saveState(); t.duration = v; refresh(); }, sel: false }],
                    [{ check: true, label: 'After', get: function () { const t = curTr(); return !!(t && t.advanceAfter != null); }, set: function (v) { const t = curTr(); if (!t) { OS.toast('Pick a transition first (Fade works great)!'); OS.sync(); return; } saveState(); t.advanceAfter = v ? 5 : null; refresh(); } },
                     { number: true, unit: 's', width: 52, min: 0, max: 600, step: 0.5, title: 'Advance to the next slide after this many seconds', get: function () { const t = curTr(); return t && t.advanceAfter != null ? t.advanceAfter : 5; }, set: function (v) { const t = curTr(); if (!t) return; saveState(); t.advanceAfter = v; refresh(); }, sel: false }],
                    [{ sm: true, icon: 'duplicate', label: 'Apply To All', run: applyTrToAll }]
                ] }] }
            ]
        },
        {
            id: 'animations', label: 'Animations', groups: [
                { label: 'Preview', items: [{ big: true, icon: 'play', label: 'Preview', title: 'Play this slide\'s animations', run: function () { if (!animated().length) { OS.toast('Animate an object first!'); return; } SHOW.preview(activeSlideIndex, { transition: false }); } }] },
                { label: 'Animation', items: [
                    { gallery: true, cls: 'am-an-gal', items: animGallery },
                    { big: true, icon: 'transition', label: 'Effect\nOptions', menu: animDirMenu, disabled: function () { const a = curAnim(); return !a || !FX[a.effect].dirs; } }
                ] },
                { label: 'Advanced Animation', items: [
                    { big: true, icon: 'plus', label: 'Add\nAnimation', title: 'Give the selected object ANOTHER animation (Float In, then Teeter, then Fade Out...)!', menu: addAnimMenu, menuCls: 'am-add-menu' },
                    { big: true, icon: 'animPane', label: 'Animation\nPane', run: function () { prefs.animPane = !prefs.animPane; savePrefs(); applyView(); }, checked: function () { return prefs.animPane; } }
                ] },
                { label: 'Timing', items: [{ rows: [
                    [{ select: true, title: 'Start', width: 128, options: [['click', 'On Click'], ['with', 'With Previous'], ['after', 'After Previous']], get: function () { const a = curAnim(); return a ? a.start : 'click'; }, set: function (v) { animProp('start', v); }, sel: false, disabled: noAnim },
                     { sm: true, icon: 'arrowUp', label: 'Earlier', run: function () { moveAnim(-1); } }],
                    [{ number: true, label: 'Duration', unit: 's', width: 52, min: 0.05, max: 20, step: 0.05, get: function () { const a = curAnim(); return a ? a.duration : null; }, set: function (v) { animProp('duration', v); }, sel: false, disabled: noAnim },
                     { sm: true, icon: 'arrowDown', label: 'Later', run: function () { moveAnim(1); } }],
                    [{ number: true, label: 'Delay', unit: 's', width: 52, min: 0, max: 60, step: 0.25, get: function () { const a = curAnim(); return a ? a.delay : null; }, set: function (v) { animProp('delay', v); }, sel: false, disabled: noAnim },
                     { sm: true, icon: 'x', label: 'Remove', run: function () { setAnim('none'); } }]
                ] }] }
            ]
        },
        {
            id: 'show', label: 'Slide Show', groups: [
                { label: 'Start Slide Show', items: [
                    { big: true, icon: 'play', label: 'From\nBeginning', kbd: 'F5', run: function () { SHOW.start(0); } },
                    { big: true, icon: 'playFrom', label: 'From Current\nSlide', run: function () { SHOW.start(activeSlideIndex); } }
                ] },
                { label: 'Set Up', items: [
                    { big: true, icon: 'eye', label: 'Hide\nSlide', run: toggleHidden, checked: function () { return !!slide().hidden; } },
                    { stack: [
                        { check: true, label: 'Loop Continuously', get: function () { return SHOW.prefs.loop; }, set: function (v) { SHOW.prefs.loop = v; SHOW.savePrefs(); } },
                        { check: true, label: 'Full Screen', get: function () { return SHOW.prefs.fullscreen; }, set: function (v) { SHOW.prefs.fullscreen = v; SHOW.savePrefs(); } }
                    ] }
                ] }
            ]
        },
        {
            id: 'view', label: 'View', groups: [
                { label: 'Presentation Views', items: [
                    { big: true, icon: 'slide', label: 'Normal', run: function () { setSorter(false); }, checked: function () { return !prefs.sorter; } },
                    { big: true, icon: 'sorter', label: 'Slide\nSorter', run: function () { setSorter(true); }, checked: function () { return prefs.sorter; } },
                    { big: true, icon: 'notes', label: 'Notes', run: function () { prefs.notes = !prefs.notes; savePrefs(); applyView(); }, checked: function () { return prefs.notes; } }
                ] },
                { label: 'Show', items: [{ stack: [snapCheck('hCenter', 'Center Guides ↔'), snapCheck('vCenter', 'Center Guides ↕'), snapCheck('objects', 'Smart Guides')] }, { stack: [snapCheck('grid', 'Snap to Grid')] }] },
                { label: 'Zoom', items: [
                    { big: true, icon: 'zoom', label: 'Zoom', menu: function () { return [50, 75, 100, 125, 150].map(function (z) { return { label: z + '%', checked: Math.round(prefs.zoom * 100) === z, run: function () { prefs.zoom = z / 100; savePrefs(); fitCanvas(); OS.sync(); } }; }); } },
                    { big: true, icon: 'fullscreen', label: 'Fit to\nWindow', run: function () { prefs.zoom = 1; savePrefs(); fitCanvas(); OS.sync(); } }
                ] },
                { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: function () { return [{ label: 'PowerPoint', icon: 'layout', checked: true, run: function () { OS.setLayout('office'); } }, { label: 'Amber Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }] }
            ]
        },
        {
            id: 'help', label: 'Help', groups: [
                { label: 'Help', items: [{ big: true, icon: 'help', label: 'Help\nDeck', run: helpDeck }] },
                { label: 'Extensions', items: [{ big: true, icon: 'store', label: 'Marketplace', run: function () { if (window.AmberMarketplace) window.AmberMarketplace.open(); } }] }
            ]
        }
    ];

    /* ---------- Boot ---------- */
    buildExtras();
    OS.init({
        app: 'Amber',
        officeName: 'PowerPoint',
        kind: 'ppt',
        key: 'amber',
        icon: 'favicon-96.png',
        officeHint: 'A ribbon with Transitions and Animations, a Notes pane and a Slide Sorter, like PowerPoint!',
        classicHint: 'The original Amber: a glass sidebar, gel tool buttons and a golden toolbar!',
        theme: { accent: '#d97706', 'accent-d': '#b45309', 'accent-l': '#fef3c7', title: '#d97706', gel1: '#fbbf24', gel2: '#d97706', 'gel-border': '#fde68a', 'gel-glow': 'rgba(217, 119, 6, 0.35)', glow: 'rgba(253, 230, 138, 0.9)', 'thumb-bg': '#0f172a' },
        editor: function () { return editingSpan(); },
        keepSelection: true,
        title: function () { return slides[0] ? (slides[0].title || 'Presentation') : 'Presentation'; },
        rename: function (name) { saveState(); slides[0].title = name; const inp = document.getElementById('slide-title-input'); if (inp && activeSlideIndex === 0) inp.value = name; renderThumbnails(); },
        qat: [
            { icon: 'save', title: 'Save a copy (.ka, ⌘S)', run: function () { exportKaFile(); OS.flashSaved('Saved!'); } },
            { icon: 'undo', title: 'Undo (⌘Z)', run: function () { undo(); OS.sync(); } },
            { icon: 'redo', title: 'Redo (⌘⇧Z)', run: function () { redo(); OS.sync(); } },
            { icon: 'play', title: 'Start From Beginning (F5)', run: function () { SHOW.start(0); } }
        ],
        tabs: tabs,
        backstage: backstage,
        settings: settingsExtra,
        status: function () {
            const s = slide();
            const n = SHOW.entries(s).length;
            return ['Slide <b>' + (activeSlideIndex + 1) + '</b> of <b>' + slides.length + '</b>', s.transition ? '★ ' + OS.esc(TR[s.transition.type].label) : 'No transition', '<b>' + n + '</b> animation' + (n === 1 ? '' : 's'), s.hidden ? 'Hidden slide' : ''].filter(Boolean);
        },
        views: [
            { icon: 'notes', title: 'Notes', run: function () { prefs.notes = !prefs.notes; savePrefs(); applyView(); }, active: function () { return prefs.notes; } },
            { icon: 'slide', title: 'Normal', run: function () { setSorter(false); }, active: function () { return !prefs.sorter; } },
            { icon: 'sorter', title: 'Slide Sorter', run: function () { setSorter(true); }, active: function () { return prefs.sorter; } },
            { icon: 'play', title: 'Slide Show (from current slide)', run: function () { SHOW.start(activeSlideIndex); } }
        ],
        zoom: { get: function () { return prefs.zoom; }, set: function (z) { prefs.zoom = Math.max(0.5, Math.min(1.5, z)); savePrefs(); fitCanvas(); }, min: 50, max: 150 },
        searchExtra: function (q) {
            const out = [];
            slides.forEach(function (s, i) {
                const t = (s.title || '') + ' ' + s.elements.map(function (e) { return plain(e.content); }).join(' ');
                if (t.toLowerCase().indexOf(q) !== -1) out.push({ label: 'Go to slide ' + (i + 1) + ': ' + (s.title || ''), icon: 'slide', where: 'Slides', it: { run: function () { window.Amber.goToSlide(i); } } });
            });
            return out.slice(0, 5);
        },
        onLayout: function () { applyView(); renderThumbnails(); renderActiveSlide(); }
    });

    // Amber Classic's dead Help Deck + Settings buttons now work, with layout cards!
    const foot = document.querySelectorAll('#sidebar .sidebar-action-btn');
    if (foot[0]) foot[0].addEventListener('click', helpDeck);
    if (foot[1]) foot[1].addEventListener('click', function () {
        const box = document.createElement('div');
        box.className = 'am-classic-settings';
        box.innerHTML = '<h4>Layout</h4>';
        box.appendChild(OS.layoutCards());
        const h = document.createElement('h4');
        h.textContent = 'Slide Show';
        box.appendChild(h);
        const o = document.createElement('div');
        o.className = 'os-opts';
        o.appendChild(OS.optRow('Full screen', 'Slide shows fill the whole screen!', function () { return SHOW.prefs.fullscreen; }, function (v) { SHOW.prefs.fullscreen = v; SHOW.savePrefs(); }));
        o.appendChild(OS.optRow('Loop continuously', 'After the last slide, start again!', function () { return SHOW.prefs.loop; }, function (v) { SHOW.prefs.loop = v; SHOW.savePrefs(); }));
        box.appendChild(o);
        OS.dialog('Settings', box, [{ label: 'Done', primary: true, value: true }], { cls: 'wide am-classic-dlg' });
    });

    // Re-badge when the Animations tab opens; refit the slide on resizes!
    document.getElementById('os-tabs').addEventListener('click', function () { setTimeout(badges, 0); });
    window.addEventListener('resize', fitCanvas);
    if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(document.querySelector('.canvas-stage'));
    window.Amber.onSaved = function () { if (office()) OS.flashSaved('Saved'); };
    document.addEventListener('keydown', function (e) {
        if (!office() || SHOW.isShowing()) return;
        if (e.key === 'F5') { e.preventDefault(); SHOW.start(e.shiftKey ? activeSlideIndex : 0); return; }
        const t = e.target;
        const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
        const mod = e.metaKey || e.ctrlKey;
        if (typing) return;
        if (mod && e.key.toLowerCase() === 'c' && activeEl()) { e.preventDefault(); copyEl(false); }
        else if (mod && e.key.toLowerCase() === 'x' && activeEl()) { e.preventDefault(); copyEl(true); }
        else if (mod && e.key.toLowerCase() === 'v' && clip) { e.preventDefault(); pasteEl(); }
        else if (mod && e.key.toLowerCase() === 'd' && activeEl()) { e.preventDefault(); duplicateEl(); }
        else if (mod && e.key.toLowerCase() === 'm') { e.preventDefault(); newSlide('content'); }
    });
    renderThumbnails();
    renderActiveSlide();
    applyView();
})();
