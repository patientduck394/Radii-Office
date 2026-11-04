/* =====================================================================
   Keydown in Amber! The same Keydown as Writeout and Bitbook, on slides:
   - type Keydown in any text box (**bold**, *italic*, =B=gel orb=B=, #R(ink),
     #B.neon(glow), $math$, # headings, * bullets and hundreds more) and it
     formats when you press Enter, or when you click away from the box
   - Keydown tab: Re-format and Un-format (one box, this slide, or every
     slide), a Keydown Text Box (write Keydown, see it live, put it on the
     slide), Keydown Styles for the selected text, and the Keydown guide
   Uses writeout/keydown-doc.js (window.kdDoc) and the Keydown style sheets.
   window.AmberKeydown
   ===================================================================== */
(function () {
    'use strict';
    if (typeof slides === 'undefined') return;
    const OS = function () { return window.OfficeShell || null; };
    const toast = function (m) { try { if (OS()) OS().toast(m); } catch (e) {} };
    const KD = function () { return window.kdDoc || null; };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const redraw = function () { try { renderThumbnails(); renderActiveSlide(); if (OS()) OS().sync(); } catch (e) {} try { amberQueueSave(); } catch (e) {} };
    const isText = function (el) { return el && typeof el.content === 'string' && el.content.trim() !== ''; };
    function editingSpan() {
        if (editingElementId === null) return null;
        return document.querySelector('#slide-canvas .slide-element[data-el-id="' + editingElementId + '"] .slide-text-content');
    }
    function slideEl(id) { return slides[activeSlideIndex].elements.find(function (e) { return e.id === id; }) || null; }

    // A box's HTML formatted or un-formatted off-screen (Keydown reads the page's styles, so the box is on the page while it works)
    let shelf = null;
    function work(html, fn) {
        if (!shelf) {
            shelf = document.createElement('div');
            shelf.setAttribute('aria-hidden', 'true');
            shelf.style.cssText = 'position:fixed;left:-30000px;top:0;width:720px;visibility:hidden;pointer-events:none';
            document.body.appendChild(shelf);
        }
        const box = document.createElement('span');
        box.className = 'slide-text-content';
        box.innerHTML = html;
        shelf.appendChild(box);
        try { const r = fn(box); return { html: box.innerHTML, r: r }; } finally { box.remove(); }
    }
    function eachBox(scope, fn) {
        const list = scope === 'all' ? slides : [slides[activeSlideIndex]];
        let boxes = 0;
        list.forEach(function (s) {
            s.elements.forEach(function (el) {
                if (scope === 'box' && el.id !== activeElementId) return;
                if (!isText(el)) return;
                boxes++;
                fn(el, s);
            });
        });
        return boxes;
    }

    /* ---------- Re-format and Un-format ---------- */
    function reformat(scope) {
        const kd = KD();
        if (!kd) { toast('Keydown could not load!'); return; }
        if (scope === 'box' && !activeElementId) { toast('Select a text box first!'); return; }
        commitEditing();
        saveState();
        let n = 0; const problems = [], errors = [];
        const boxes = eachBox(scope, function (el, s) {
            const out = work(el.content, function (box) { return kd.reformat(box); });
            el.content = out.html;
            const r = out.r || {};
            n += r.formatted || 0;
            (r.problems || []).forEach(function (p) { problems.push({ tag: p.tag, line: p.line, slide: slides.indexOf(s) + 1 }); });
            (r.errors || []).forEach(function (e) { errors.push(String(e && e.message || e)); });
        });
        redraw();
        if (!boxes) { toast(scope === 'box' ? 'That object has no text!' : scope === 'all' ? 'No slide has any text yet!' : 'This slide has no text yet!'); return; }
        if (errors.length) { OS().dialog('Re-format hit a problem', '<p class="os-dlg-text">Re-format formatted everything it could, but ' + errors.length + ' part' + (errors.length === 1 ? '' : 's') + ' hit an error!</p><pre class="os-dlg-text" style="white-space:pre-wrap;max-height:200px;overflow:auto;font-size:11px">' + esc(errors.slice(0, 5).join('\n')) + '</pre>', [{ label: 'Got it!', primary: true, value: true }]); return; }
        if (problems.length) {
            OS().dialog('Keydown check', '<p class="os-dlg-text">' + problems.length + ' tag' + (problems.length === 1 ? ' could' : 's could') + ' not be formatted! A closing tag may be missing or mistyped:</p><ul class="os-dlg-text" style="max-height:260px;overflow:auto;margin:0;padding-left:20px">' +
                problems.slice(0, 50).map(function (p) { return '<li><b>Slide ' + p.slide + ':</b> <code>' + esc(p.tag) + '</code> in “' + esc(p.line) + '”</li>'; }).join('') + '</ul>', [{ label: 'Got it!', primary: true, value: true }]);
            return;
        }
        toast((scope === 'all' ? 'Formatted every slide' : scope === 'box' ? 'Formatted the text box' : 'Formatted this slide') + (n ? '' : ' (there was nothing new to format)') + ', and every Keydown tag checks out!');
    }
    function unformat(scope) {
        const kd = KD();
        if (!kd) { toast('Keydown could not load!'); return; }
        if (scope === 'box' && !activeElementId) { toast('Select a text box first!'); return; }
        commitEditing();
        saveState();
        let n = 0;
        eachBox(scope, function (el) {
            const out = work(el.content, function (box) { return kd.unformat(box); });
            el.content = out.html;
            n += out.r || 0;
        });
        redraw();
        toast(n ? 'Un-formatted ' + n + ' piece' + (n === 1 ? '' : 's') + '! Fix any mistakes, then press Re-format!' : 'There is no Keydown formatting ' + (scope === 'all' ? 'in this deck' : scope === 'box' ? 'in that box' : 'on this slide') + '!');
    }
    function commitEditing() {
        const span = editingSpan();
        if (!span) return;
        const el = slideEl(editingElementId);
        if (el) el.content = span.innerHTML;
        editingElementId = null;
    }

    /* ---------- Formatting while you type ---------- */
    // Enter at the end of a line: that line's Keydown turns into its formatting (like Writeout)
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
        const span = editingSpan();
        const kd = KD();
        if (!span || !kd || !span.contains(e.target === span ? span : (window.getSelection().anchorNode || null))) return;
        let done = false;
        try { done = kd.formatLine(span); } catch (err) { done = false; }
        if (!done) return;
        e.preventDefault();
        if (done !== 'line') newLineAfter(span);
        span.dispatchEvent(new Event('input', { bubbles: true }));
    }, true);
    // A new line after the one just formatted, outside its formatting (so the next words are plain again)
    function newLineAfter(span) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        let n = sel.getRangeAt(0).endContainer;
        if (n === span) n = span.childNodes[Math.max(0, sel.getRangeAt(0).endOffset - 1)] || null;
        while (n && n.parentNode && n.parentNode !== span) n = n.parentNode;
        // (after a heading, list or other block the next line starts by itself: only the caret needs a place to sit)
        if (n && n.nodeType === 1 && /^(H[1-6]|DIV|P|UL|OL|BLOCKQUOTE|PRE|TABLE|FIGURE)$/.test(n.tagName)) {
            const t = document.createTextNode('\u200B');
            span.insertBefore(t, n.nextSibling);
            const r0 = document.createRange();
            r0.setStart(t, 1); r0.collapse(true);
            sel.removeAllRanges(); sel.addRange(r0);
            return;
        }
        const br = document.createElement('br');
        if (n && n.parentNode === span) span.insertBefore(br, n.nextSibling); else span.appendChild(br);
        // (a line break at the very end needs a second one to show the new line)
        if (!br.nextSibling || (br.nextSibling.nodeType === 3 && !br.nextSibling.nodeValue && !br.nextSibling.nextSibling)) span.appendChild(document.createElement('br'));
        const r = document.createRange();
        r.setStartAfter(br);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
    }
    // Clicking away from a box: anything still written as Keydown in it gets formatted
    // (on the press itself, because Amber redraws the slide on that click before the box ever loses focus)
    function formatAway(span) {
        if (!span || span.contentEditable !== 'true' || !KD() || !prefs.onBlur) return;
        if (!/[#*=~`&$[{!@%^+:;\\_,?]/.test(span.textContent || '')) return;
        try {
            const r = KD().reformat(span);
            if (r && r.formatted) span.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (err) {}
    }
    document.addEventListener('pointerdown', function (e) {
        const span = editingSpan();
        if (span && !span.contains(e.target) && !(e.target.closest && e.target.closest('.os-menu, .os-dlg, .os-dialog, #os-ribbon'))) formatAway(span);
    }, true);
    document.addEventListener('focusout', function (e) {
        const span = e.target && e.target.classList && e.target.classList.contains('slide-text-content') ? e.target : null;
        if (span && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.os-menu, #os-ribbon'))) formatAway(span);
    }, true);

    const PREF_KEY = 'amber_keydown_prefs';
    const prefs = Object.assign({ onBlur: true }, (function () { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; } })());
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

    /* ---------- A Keydown Text Box: write Keydown, see it live, put it on the slide ---------- */
    async function textBoxDialog() {
        const kd = KD();
        if (!kd || !OS()) { toast('Keydown could not load!'); return; }
        const el = activeElementId ? slideEl(activeElementId) : null;
        const editing = el && isText(el);
        const start = editing ? (kd.htmlToText ? kd.htmlToText(el.content) : '') : '# A title\n**Bold**, *italic*, =B=gel orbs=B=, #R(color ink) and $e^{i\\pi}+1=0$!\n* a bullet\n* another one';
        const box = document.createElement('div');
        box.className = 'akd-dlg';
        box.innerHTML = '<p class="os-dlg-text">Write Keydown at the top, and see the slide text below it! ' + (editing ? 'This changes the selected text box.' : 'It goes on this slide as a new text box.') + '</p>' +
            '<div class="akd-split"><textarea class="akd-src" spellcheck="false" aria-label="Keydown text"></textarea><div class="akd-prev" aria-live="polite"></div></div>' +
            '<p class="os-dlg-text akd-hint">Open the guide from the Keydown tab to see every tag!</p>';
        const ta = box.querySelector('.akd-src'), pv = box.querySelector('.akd-prev');
        ta.value = start;
        const paint = function () { try { pv.innerHTML = kd.textToHtml(ta.value); } catch (e) { pv.textContent = ta.value; } };
        ta.addEventListener('input', paint);
        paint();
        setTimeout(function () { ta.focus(); }, 30);
        const src = await OS().dialog(editing ? 'Edit as Keydown' : 'Keydown Text Box', box, [{ label: 'Cancel', value: null }, { label: editing ? 'Update' : 'Insert', primary: true, value: function () { return ta.value; } }]);
        if (src == null || !String(src).trim()) return;
        saveState();
        const html = kd.textToHtml(String(src));
        if (editing) { el.content = html; redraw(); toast('Updated the text box!'); return; }
        const id = 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
        const lines = String(src).split('\n').length;
        slides[activeSlideIndex].elements.push({ id: id, type: 'text', content: html, top: 90, left: 110, width: 500, height: Math.min(300, 40 + lines * 34), fontSize: '22px', color: '#ffffff', zIndex: slides[activeSlideIndex].elements.length + 1 });
        activeElementId = id;
        redraw();
        toast('Keydown text box added!');
    }

    /* ---------- Keydown Styles: wrap the selected words in a style ---------- */
    function stylesMenu(anchor) {
        const kd = KD(), os = OS();
        if (!kd || !kd.styleCategories || !os) return [{ label: 'Keydown could not load!', icon: 'info', run: function () {} }];
        let saved = null;
        try { const s = window.getSelection(); if (s.rangeCount && editingSpan() && editingSpan().contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); } catch (e) {}
        const cats = function () { return kd.styleCategories().map(function (c) { return { label: c.name, hint: c.styles.length + ' styles', icon: 'sparkle', run: function () { showCat(c); } }; }); };
        const showCat = function (cat) {
            const items = [{ header: cat.name + ' (' + cat.styles.length + ')' }];
            cat.styles.forEach(function (st) {
                const tag = st.tag === 'mark' ? 'mark' : (st.tag || 'span');
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'os-mitem kd-style-pick';
                b.title = st.open + 'text' + st.close;
                b.innerHTML = '<span class="os-mlabel"><' + tag + (st.cls ? ' class="' + esc(st.cls) + '"' : '') + '>' + esc(st.label) + '</' + tag + '></span><span class="os-mkbd">' + esc(st.open + '…' + st.close) + '</span>';
                b.addEventListener('mousedown', function (e) { e.preventDefault(); });
                b.addEventListener('click', function () {
                    os.closeMenu();
                    const span = editingSpan();
                    if (!span || !saved || !span.contains(saved.startContainer)) { toast('Double-click a text box and select some words first, then pick a style!'); return; }
                    kd.applyStyle(saved, st.tag, st.cls);
                    span.dispatchEvent(new Event('input', { bubbles: true }));
                });
                items.push({ node: b });
            });
            items.push({ sep: true }, { label: '← All categories', icon: 'chevLeft', run: function () { setTimeout(function () { os.openMenu(anchor, cats(), { cls: 'kd-style-menu' }); }, 0); } });
            setTimeout(function () { os.openMenu(anchor, items, { cls: 'kd-style-menu' }); }, 0);
        };
        return cats();
    }

    /* ---------- The guide ---------- */
    function guide() {
        if (!OS()) return;
        const html = typeof window.kdBuildGuideHTML === 'function' ? window.kdBuildGuideHTML() : '';
        OS().dialog('Keydown guide', '<p class="os-dlg-text">Keydown works in every Amber text box! Type a tag, then press Enter or click away, and it formats!</p><div class="akd-guide keydown-doc">' + (html || 'The guide could not load!') + '</div>', [{ label: 'Got it!', primary: true, value: true }]);
    }

    /* ---------- Look ---------- */
    const st = document.createElement('style');
    // (Amber's text boxes are flexboxes, which would put every formatted piece side by side and drop the spaces and line breaks:
    // a box with formatting inside flows like normal text, still centered top to bottom)
    st.textContent = '.slide-text-content:has(> *){display:block;align-content:center;overflow-wrap:break-word}' +
        '.slide-text-content > :is(h1,h2,h3,h4,p,ul,ol,blockquote,div,pre){margin-top:0;margin-bottom:.2em}' +
        '.slide-text-content .kd-math{display:inline-block}' +
        '.akd-split{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;width:100%}.akd-src,.akd-prev{box-sizing:border-box;width:100%}' +
        '.akd-src{min-height:150px;resize:vertical;font:13px/1.5 "JetBrains Mono",ui-monospace,monospace;padding:10px;border-radius:10px;border:1px solid #fcd34d;background:#fffdf5;color:#1c1917}' +
        '.akd-prev{min-height:120px;max-height:260px;overflow:auto;padding:12px 14px;border-radius:10px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;font-size:20px;line-height:1.35}' +
        '.akd-guide{max-height:60vh;overflow:auto;width:min(860px,82vw)}.akd-hint{opacity:.75;font-size:12px}' +
        '';
    document.head.appendChild(st);

    // Keydown Next (custom @style tags, {{live values}}, ::blocks) on every slide's text boxes (not the one being typed in)
    function next(rootEl) {
        if (!window.KeydownNext || !rootEl) return;
        rootEl.querySelectorAll('.slide-text-content').forEach(function (span) {
            if (span.contentEditable === 'true') return;
            try { window.KeydownNext.apply(span, { editing: false }); } catch (e) {}
        });
    }
    (function () {
        const orig = window.renderActiveSlide;
        if (typeof orig === 'function') window.renderActiveSlide = function () { const r = orig.apply(this, arguments); next(document.getElementById('slide-canvas')); return r; };
    })();

    window.AmberKeydown = {
        reformat: reformat, unformat: unformat, textBox: textBoxDialog, stylesMenu: stylesMenu, guide: guide,
        onBlur: function (v) { if (v === undefined) return prefs.onBlur; prefs.onBlur = !!v; savePrefs(); },
        format: function (html) { return work(html, function (b) { return KD().reformat(b); }).html; },
        next: next
    };
})();
