/* =====================================================================
   Writeout's document tools! The things a real document needs and a
   notebook doesn't: a Table of Contents (with page numbers), Footnotes,
   Readability + a Word Goal, Version History, and Mail Merge with a
   Mainkey database (.kb), CSV or JSON. Loaded after writeout-office.js!
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed) return;
    const OS = window.OfficeShell || null;
    const toast = function (m) { try { if (OS) OS.toast(m); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const rid = function () { return Math.random().toString(36).slice(2, 9); };
    const lsGet = function (k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
    const lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
    const save = function () { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} };
    const dialog = function (title, body, buttons, opts) { return OS ? OS.dialog(title, body, buttons, opts) : Promise.resolve(null); };

    /* ---------- Styles ---------- */
    const css = document.createElement('style');
    css.textContent = [
        '.wo-toc{margin:10px 0 16px;padding:14px 18px;border:1px solid rgba(2,132,199,.35);border-radius:10px;background:linear-gradient(180deg,rgba(240,249,255,.85),rgba(224,242,254,.55));user-select:none}',
        '.wo-toc-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}',
        '.wo-toc-title{font-weight:800;font-size:1.15em;color:#075985}',
        '.wo-toc-btn{font:inherit;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid rgba(2,132,199,.5);background:#fff;color:#0369a1;cursor:pointer}',
        '.wo-toc-list{list-style:none;margin:0;padding:0}',
        '.wo-toc-list li{margin:2px 0}',
        '.wo-toc-list a{display:flex;align-items:baseline;gap:6px;color:inherit;text-decoration:none;cursor:pointer}',
        '.wo-toc-list a:hover .wo-toc-t{text-decoration:underline}',
        '.wo-toc-l1{font-weight:700}.wo-toc-l2{padding-left:1.4em}.wo-toc-l3{padding-left:2.8em;font-size:.95em}',
        '.wo-toc-dots{flex:1;border-bottom:1px dotted rgba(15,23,42,.35);transform:translateY(-.25em)}',
        '.wo-toc-p{font-variant-numeric:tabular-nums;color:#475569}',
        '.wo-toc-empty{margin:0;color:#64748b;font-style:italic}',
        '.wo-fn-ref{font-size:.7em;font-weight:800;color:#0369a1;cursor:pointer;padding:0 1px;user-select:none}',
        '.wo-fn-ref:hover{text-decoration:underline}',
        '.wo-footnotes{margin-top:28px;padding-top:10px;border-top:1px solid rgba(15,23,42,.25);font-size:.9em;user-select:none}',
        '.wo-fn-head{font-weight:800;color:#334155;margin-bottom:4px}',
        '.wo-fn-list{margin:0;padding-left:1.6em}',
        '.wo-fn-list li{margin:3px 0}',
        '.wo-fn-text{outline:none;user-select:text;min-width:2em;display:inline-block}',
        '.wo-fn-text:empty::before{content:"Type the note…";color:#94a3b8}',
        '.wo-fn-back{font:inherit;font-size:.85em;border:0;background:none;color:#0369a1;cursor:pointer;padding:0 4px}',
        '.wo-fn-flash{animation:woFlash 1s ease}',
        '@keyframes woFlash{0%{background:rgba(250,204,21,.6)}100%{background:transparent}}',
        '.wo-merge{display:inline-block;padding:0 6px;margin:0 1px;border-radius:6px;background:linear-gradient(180deg,#ede9fe,#ddd6fe);color:#5b21b6;font-weight:700;border:1px solid #c4b5fd;user-select:none;white-space:nowrap}',
        '.wo-merge.wo-merge-live{background:linear-gradient(180deg,#dcfce7,#bbf7d0);color:#166534;border-color:#86efac}',
        '::highlight(wo-long){background-color:rgba(251,191,36,.38)}',
        '.wo-goal{display:inline-flex;align-items:center;gap:6px}',
        '.wo-goal-bar{display:inline-block;width:60px;height:7px;border-radius:999px;background:rgba(148,163,184,.35);overflow:hidden;vertical-align:middle}',
        '.wo-goal-bar i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#22c55e);border-radius:999px}',
        '.wo-rd td{padding:3px 10px 3px 0}.wo-rd td+td{font-weight:700}',
        '.wo-rd-long{margin:6px 0 0;padding-left:18px;font-size:12px;color:#475569}',
        '.wo-vh{max-height:46vh;overflow:auto;display:flex;flex-direction:column;gap:6px}',
        '.wo-vh-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid rgba(148,163,184,.4);border-radius:8px}',
        '.wo-vh-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}',
        '.wo-vh-meta{font-size:11px;color:#64748b;white-space:nowrap}',
        '.wo-mini{font:inherit;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid rgba(2,132,199,.45);background:#fff;color:#0369a1;cursor:pointer}',
        '.wo-mini.danger{color:#b91c1c;border-color:rgba(220,38,38,.45)}',
        '.wo-vh-frame{width:100%;height:46vh;border:1px solid rgba(148,163,184,.5);border-radius:8px;background:#fff}',
        '.wo-mm-fields{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}',
        '.wo-mm-nav{display:flex;align-items:center;gap:8px;margin-top:8px}'
    ].join('\n');
    document.head.appendChild(css);

    /* ---------- Where the caret was (ribbon clicks steal focus) ---------- */
    let lastRange = null;
    document.addEventListener('selectionchange', function () {
        const s = window.getSelection();
        if (s && s.rangeCount && ed.contains(s.anchorNode)) lastRange = s.getRangeAt(0).cloneRange();
    });
    function restoreCaret() {
        if (!lastRange || !ed.contains(lastRange.startContainer)) return false;
        const host = lastRange.startContainer.nodeType === 1 ? lastRange.startContainer : lastRange.startContainer.parentNode;
        if (host && host.closest && host.closest('.wo-toc, .wo-footnotes')) return false; // (not inside the contents box or the notes)
        const box = host && host.closest ? host.closest('[contenteditable="true"]') : null;
        if (box) { try { box.focus({ preventScroll: true }); } catch (e) {} }
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(lastRange);
        return true;
    }
    function caretLine() {
        const n = lastRange && ed.contains(lastRange.startContainer) ? lastRange.startContainer : null;
        if (!n) return null;
        if (window.KdBlockEditor && window.KdBlockEditor.blockOf) return window.KdBlockEditor.blockOf(n);
        let el = n.nodeType === 1 ? n : n.parentNode;
        while (el && el.parentNode !== ed) el = el.parentNode;
        return el;
    }
    function freshLine() { const d = document.createElement('div'); d.setAttribute('contenteditable', 'true'); d.innerHTML = '<br>'; return d; }
    function insertBlock(node) {
        const line = caretLine();
        const notes = ed.querySelector('.wo-footnotes');
        if (line && line.parentNode) (line.tagName === 'LI' ? line.closest('ul, ol') : line).after(node);
        else if (notes) notes.before(node);
        else ed.appendChild(node);
        if (!node.nextElementSibling || node.nextElementSibling.classList.contains('wo-footnotes')) node.after(freshLine());
    }
    const pageOf = function (el) { try { return window.WriteoutPages && window.WriteoutPages.pageOf ? window.WriteoutPages.pageOf(el) : 1; } catch (e) { return 1; } };

    /* ================= Table of Contents ================= */
    function headings() { return [].filter.call(ed.querySelectorAll('h1, h2, h3'), function (h) { return !h.closest('.wo-toc, .wo-footnotes'); }); }
    function tocList() {
        const hs = headings();
        if (!hs.length) return '<p class="wo-toc-empty">No headings yet! Make some lines Heading 1, 2 or 3, and they show up here!</p>';
        return '<ol class="wo-toc-list">' + hs.map(function (h) {
            if (!h.id) h.id = 'wo-h-' + rid();
            return '<li class="wo-toc-l' + h.tagName.charAt(1) + '"><a data-wo-jump="' + esc(h.id) + '"><span class="wo-toc-t">' + esc(h.textContent.trim() || '(untitled)') + '</span><span class="wo-toc-dots"></span><span class="wo-toc-p">' + pageOf(h) + '</span></a></li>';
        }).join('') + '</ol>';
    }
    function updateTOCs(quiet) {
        const tocs = ed.querySelectorAll('.wo-toc');
        if (!tocs.length) { if (!quiet) toast('There is no table of contents yet: Insert one from References!'); return; }
        const list = tocList();
        let changed = false;
        tocs.forEach(function (t) { const body = t.querySelector('.wo-toc-body'); if (body && body.innerHTML !== list) { body.innerHTML = list; changed = true; } });
        if (changed) save();
        if (!quiet) toast('Table of contents updated!');
    }
    function insertTOC() {
        const box = document.createElement('div');
        box.className = 'wo-toc';
        box.setAttribute('contenteditable', 'false');
        box.innerHTML = '<div class="wo-toc-head"><span class="wo-toc-title">Contents</span><button type="button" class="wo-toc-btn" data-wo-toc-update>↻ Update</button></div><div class="wo-toc-body"></div>';
        insertBlock(box);
        box.querySelector('.wo-toc-body').innerHTML = tocList();
        save();
        toast('Table of contents added! It updates as you write, and the page numbers follow Pages view!');
    }

    /* ================= Footnotes ================= */
    function notesBox(make) {
        let sec = ed.querySelector('.wo-footnotes');
        if (!sec && make) {
            sec = document.createElement('div');
            sec.className = 'wo-footnotes';
            sec.setAttribute('contenteditable', 'false');
            sec.innerHTML = '<div class="wo-fn-head">Notes</div><ol class="wo-fn-list"></ol>';
            ed.appendChild(sec);
        }
        return sec;
    }
    function renumber() {
        const refs = [].slice.call(ed.querySelectorAll('.wo-fn-ref'));
        const sec = notesBox(false);
        if (!refs.length) { if (sec) { sec.remove(); save(); } return; }
        const list = notesBox(true).querySelector('.wo-fn-list');
        let changed = false;
        refs.forEach(function (r, i) {
            const n = String(i + 1);
            if (r.textContent !== n) { r.textContent = n; changed = true; }
            let li = list.querySelector('li[data-fn="' + r.getAttribute('data-fn') + '"]');
            if (!li) { li = noteItem(r.getAttribute('data-fn')); changed = true; }
            if (list.children[i] !== li) { list.insertBefore(li, list.children[i] || null); changed = true; }
        });
        [].slice.call(list.children).forEach(function (li) { if (!ed.querySelector('.wo-fn-ref[data-fn="' + li.getAttribute('data-fn') + '"]')) { li.remove(); changed = true; } });
        const sec2 = notesBox(false);
        if (sec2 && sec2 !== ed.lastElementChild) { ed.appendChild(sec2); changed = true; } // (the notes always stay at the very end)
        if (changed) save();
    }
    function noteItem(id) {
        const li = document.createElement('li');
        li.setAttribute('data-fn', id);
        li.innerHTML = '<span class="wo-fn-text" contenteditable="true" spellcheck="true"></span><button type="button" class="wo-fn-back" title="Back to the text">↩</button>';
        return li;
    }
    function insertFootnote() {
        if (!restoreCaret()) { toast('Click in your text where the note should go, then Insert Footnote!'); return; }
        const id = 'fn' + rid();
        const sup = document.createElement('sup');
        sup.className = 'wo-fn-ref';
        sup.setAttribute('contenteditable', 'false');
        sup.setAttribute('data-fn', id);
        sup.title = 'Footnote';
        sup.textContent = '*';
        if (typeof fmtInsertNodeAtCaret !== 'function' || !fmtInsertNodeAtCaret(sup)) { toast('Click in your text first!'); return; }
        notesBox(true).querySelector('.wo-fn-list').appendChild(noteItem(id));
        renumber();
        const txt = ed.querySelector('.wo-footnotes li[data-fn="' + id + '"] .wo-fn-text');
        if (txt) { txt.focus(); txt.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        toast('Footnote added! Type the note at the end of the document!');
    }

    /* ================= Clicks inside the document ================= */
    ed.addEventListener('click', function (e) {
        const t = e.target;
        const jump = t.closest && t.closest('[data-wo-jump]');
        if (jump) { e.preventDefault(); const h = document.getElementById(jump.getAttribute('data-wo-jump')); if (h) { h.scrollIntoView({ block: 'start', behavior: 'smooth' }); flash(h); } return; }
        if (t.closest && t.closest('[data-wo-toc-update]')) { e.preventDefault(); updateTOCs(false); return; }
        const ref = t.closest && t.closest('.wo-fn-ref');
        if (ref) { const txt = ed.querySelector('.wo-footnotes li[data-fn="' + ref.getAttribute('data-fn') + '"] .wo-fn-text'); if (txt) { txt.scrollIntoView({ block: 'center', behavior: 'smooth' }); txt.focus(); flash(txt.parentNode); } return; }
        const back = t.closest && t.closest('.wo-fn-back');
        if (back) { const li = back.closest('li'); const r = li && ed.querySelector('.wo-fn-ref[data-fn="' + li.getAttribute('data-fn') + '"]'); if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(r); } }
    });
    function flash(el) { el.classList.remove('wo-fn-flash'); void el.offsetWidth; el.classList.add('wo-fn-flash'); }
    // note text is typed in its own little box: keep the main editor's keys out of it, and save as it changes
    ed.addEventListener('keydown', function (e) { if (e.target.classList && e.target.classList.contains('wo-fn-text')) { e.stopPropagation(); if (e.key === 'Enter') e.preventDefault(); } }, true);
    ed.addEventListener('input', function (e) { if (e.target.classList && e.target.classList.contains('wo-fn-text')) save(); });

    /* ================= Readability + Word goal ================= */
    function plainText() {
        const c = ed.cloneNode(true);
        c.querySelectorAll('.wo-toc, .wo-footnotes, .wo-fn-ref').forEach(function (x) { x.remove(); });
        c.querySelectorAll('div, p, h1, h2, h3, li, blockquote, pre, br').forEach(function (x) { x.append('\n'); });
        return c.textContent;
    }
    const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
    function syllables(w) {
        w = w.toLowerCase().replace(/[^a-z]/g, '');
        if (!w) return 0;
        if (w.length <= 3) return 1;
        w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
        const m = w.match(/[aeiouy]{1,2}/g);
        return Math.max(1, m ? m.length : 1);
    }
    function sentencesOf(text) { return (text.match(/[^.!?\n]+[.!?]*/g) || []).map(function (s) { return s.trim(); }).filter(function (s) { return (s.match(WORD) || []).length; }); }
    function analyze() {
        const text = plainText();
        const words = text.match(WORD) || [];
        const sents = sentencesOf(text);
        const syl = words.reduce(function (t, w) { return t + syllables(w); }, 0);
        const W = words.length, S = Math.max(1, sents.length);
        const ease = W ? 206.835 - 1.015 * (W / S) - 84.6 * (syl / W) : 0;
        const grade = W ? 0.39 * (W / S) + 11.8 * (syl / W) - 15.59 : 0;
        const long = sents.map(function (s) { return { s: s, n: (s.match(WORD) || []).length }; }).filter(function (x) { return x.n > 25; }).sort(function (a, b) { return b.n - a.n; });
        return { words: W, sentences: sents.length, syllables: syl, ease: ease, grade: grade, long: long };
    }
    function easeLabel(e) {
        return e >= 90 ? 'Very easy' : e >= 80 ? 'Easy' : e >= 70 ? 'Fairly easy' : e >= 60 ? 'Plain English' : e >= 50 ? 'Fairly hard' : e >= 30 ? 'Hard' : 'Very hard';
    }
    const mins = function (w, wpm) { const m = w / wpm; return m < 1 ? Math.max(1, Math.round(m * 60)) + ' sec' : Math.round(m) + ' min'; };
    function readability() {
        const a = analyze();
        if (!a.words) { toast('Write a few sentences first!'); return; }
        const row = function (k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; };
        const html = '<table class="wo-rd">' +
            row('Reading ease', Math.round(a.ease) + ' · ' + easeLabel(a.ease)) +
            row('School grade', Math.max(1, Math.round(a.grade)) + '') +
            row('Words', a.words.toLocaleString()) +
            row('Sentences', a.sentences.toLocaleString()) +
            row('Words per sentence', (a.words / Math.max(1, a.sentences)).toFixed(1)) +
            row('Reading time', mins(a.words, 230)) +
            row('Speaking time', mins(a.words, 130)) + '</table>' +
            (a.long.length ? '<p style="margin:10px 0 0;font-weight:700">' + a.long.length + ' long sentence' + (a.long.length === 1 ? '' : 's') + ' (over 25 words):</p><ol class="wo-rd-long">' + a.long.slice(0, 5).map(function (x) { return '<li>' + esc(x.s.slice(0, 110)) + (x.s.length > 110 ? '…' : '') + ' <b>(' + x.n + ')</b></li>'; }).join('') + '</ol>' : '<p style="margin:10px 0 0">No sentence is over 25 words. Nice and clear!</p>');
        dialog('Readability', html, [
            { label: prefs.long ? 'Stop marking long sentences' : 'Mark long sentences', value: function () { setLong(!prefs.long); return true; } },
            { label: 'OK', value: true, primary: true }
        ]);
    }
    // Long sentences are marked with the CSS Highlight API, so nothing is written into the document
    const prefs = Object.assign({ long: false, goal: 0 }, lsGet('writeout_pro_prefs', {}));
    function savePrefs() { lsSet('writeout_pro_prefs', prefs); }
    function setLong(on) {
        prefs.long = !!on; savePrefs(); markLong();
        toast(on ? 'Long sentences are marked in yellow!' : 'Long sentence marks are off!');
    }
    function markLong() {
        if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
        if (!prefs.long) { CSS.highlights.delete('wo-long'); return; }
        const ranges = [];
        ed.querySelectorAll('[contenteditable="true"]').forEach(function (line) {
            if (line.closest('.wo-toc, .wo-footnotes')) return;
            const nodes = [], starts = [];
            let all = '';
            const w = document.createTreeWalker(line, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { const x = n.parentNode.closest('.wo-fn-ref, [contenteditable="false"]'); return x && line.contains(x) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
            let n;
            while ((n = w.nextNode())) { nodes.push(n); starts.push(all.length); all += n.nodeValue; }
            if (!nodes.length) return;
            const re = /[^.!?]+[.!?]*/g;
            let m;
            while ((m = re.exec(all))) {
                if ((m[0].match(WORD) || []).length <= 25) continue;
                const s0 = m.index + (m[0].length - m[0].replace(/^\s+/, '').length), s1 = m.index + m[0].replace(/\s+$/, '').length;
                const at = function (pos) { for (let i = nodes.length - 1; i >= 0; i--) if (starts[i] <= pos) return [nodes[i], Math.min(nodes[i].nodeValue.length, pos - starts[i])]; return [nodes[0], 0]; };
                const r = document.createRange();
                const a = at(s0), b = at(s1);
                try { r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); ranges.push(r); } catch (e) {}
            }
        });
        CSS.highlights.set('wo-long', new Highlight(...ranges));
    }
    function setGoal() {
        const box = document.createElement('div');
        box.innerHTML = '<label class="os-field"><span>Word goal for this document (0 = no goal)</span><input class="os-dlg-input" id="wo-goal-n" type="number" min="0" step="50"></label>';
        box.querySelector('#wo-goal-n').value = prefs.goal || 1000;
        dialog('Word Goal', box, [{ label: 'Cancel', value: null }, { label: 'Set Goal', primary: true, value: function (b) { return Math.max(0, Math.round(Number(b.querySelector('#wo-goal-n').value) || 0)); } }]).then(function (v) {
            if (v === null || v === undefined) return;
            prefs.goal = v; savePrefs();
            toast(v ? 'Goal set: ' + v.toLocaleString() + ' words! Watch the progress bar at the bottom!' : 'Word goal turned off!');
            try { if (OS && OS.sync) OS.sync(); } catch (e) {}
        });
    }
    let goalWords = 0, goalAt = 0;
    function goalStatus() {
        if (!prefs.goal) return '';
        if (Date.now() - goalAt > 800) { goalWords = (plainText().match(WORD) || []).length; goalAt = Date.now(); }
        const pct = Math.min(100, Math.round(goalWords / prefs.goal * 100));
        return '<span class="wo-goal" title="Word goal">🎯 <span class="wo-goal-bar"><i style="width:' + pct + '%"></i></span> ' + goalWords.toLocaleString() + ' / ' + prefs.goal.toLocaleString() + (pct >= 100 ? ' ✓' : '') + '</span>';
    }

    /* ================= Version History ================= */
    const VKEY = 'writeout_versions_v1';
    function tabKey() { try { const t = typeof kdActiveTab === 'function' ? kdActiveTab() : null; return t ? String(t.id) : 'doc'; } catch (e) { return 'doc'; } }
    function versions() { return lsGet(VKEY, []); }
    function keepVersion(name, quiet) {
        const html = ed.innerHTML;
        if (html.length > 1500000) { toast('This document is too big to keep versions of here (over 1.5 MB)!'); return false; }
        const list = versions();
        list.unshift({ id: rid(), tab: tabKey(), name: String(name || '').trim().slice(0, 80) || 'Version', at: Date.now(), words: (plainText().match(WORD) || []).length, html: html });
        const mine = list.filter(function (v) { return v.tab === tabKey(); });
        const trimmed = list.filter(function (v) { return v.tab !== tabKey() || mine.indexOf(v) < 25; });
        let ok = lsSet(VKEY, trimmed);
        while (!ok && trimmed.length > 1) { trimmed.pop(); ok = lsSet(VKEY, trimmed); } // (browser storage full: drop the oldest)
        if (!quiet) toast(ok ? 'Version saved! Find it in Version History!' : 'Could not save the version (browser storage is full)!');
        return ok;
    }
    function saveVersion() {
        const box = document.createElement('div');
        box.innerHTML = '<label class="os-field"><span>Name this version</span><input class="os-dlg-input" id="wo-ver-name" spellcheck="false"></label>';
        box.querySelector('#wo-ver-name').value = 'Version of ' + new Date().toLocaleString();
        dialog('Save Version', box, [{ label: 'Cancel', value: null }, { label: 'Save', primary: true, value: function (b) { return b.querySelector('#wo-ver-name').value; } }]).then(function (n) { if (n !== null && n !== undefined) keepVersion(n); });
    }
    function history() {
        const box = document.createElement('div');
        const draw = function () {
            const mine = versions().filter(function (v) { return v.tab === tabKey(); });
            if (!mine.length) { box.innerHTML = '<p class="os-dlg-text">No versions of this page yet! Use Save Version to keep a copy you can come back to!</p>'; return; }
            box.innerHTML = '<div class="wo-vh">' + mine.map(function (v) {
                return '<div class="wo-vh-row" data-id="' + v.id + '"><span class="wo-vh-name" title="' + esc(v.name) + '">' + esc(v.name) + '</span><span class="wo-vh-meta">' + new Date(v.at).toLocaleString() + ' · ' + v.words.toLocaleString() + ' words</span><button type="button" class="wo-mini" data-a="view">Preview</button><button type="button" class="wo-mini" data-a="restore">Restore</button><button type="button" class="wo-mini danger" data-a="del">Delete</button></div>';
            }).join('') + '</div>';
        };
        draw();
        box.addEventListener('click', function (e) {
            const b = e.target.closest && e.target.closest('[data-a]');
            if (!b) return;
            const id = b.closest('[data-id]').getAttribute('data-id');
            const v = versions().find(function (x) { return x.id === id; });
            if (!v) return;
            const act = b.getAttribute('data-a');
            if (act === 'view') {
                const f = document.createElement('iframe');
                f.className = 'wo-vh-frame';
                f.setAttribute('sandbox', ''); // (a frozen picture of the version: nothing in it can run)
                f.srcdoc = '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:18px;line-height:1.6">' + v.html + '</body>';
                dialog('Preview: ' + v.name, f, [{ label: 'Close', value: null, primary: true }], { cls: 'wo-vh-dlg' });
            } else if (act === 'restore') {
                if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'Sure? Click again'; return; }
                keepVersion('Before restoring "' + v.name + '"', true); // (so the restore itself can be undone)
                ed.innerHTML = v.html;
                ed.dispatchEvent(new Event('input', { bubbles: true }));
                save();
                renumber(); updateTOCs(true); markLong();
                toast('Restored "' + v.name + '"! Your previous text was saved as a version too!');
                draw();
            } else if (act === 'del') {
                if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'Sure?'; return; }
                lsSet(VKEY, versions().filter(function (x) { return x.id !== id; }));
                draw();
            }
        });
        dialog('Version History', box, [{ label: 'Close', value: null, primary: true }]);
    }

    /* ================= Mail Merge (Mainkey .kb, CSV or JSON) ================= */
    const MKEY = 'writeout_merge_data';
    let merge = lsGet(MKEY, null); // { name, fields: [ids], records: [{...}] }
    let mergeAt = 0, mergeLive = false;
    function csvParse(text) {
        const rows = [];
        let row = [], cell = '', q = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
            else if (c === '"') q = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
            else cell += c;
        }
        if (cell || row.length) { row.push(cell); rows.push(row); }
        const head = (rows.shift() || []).map(function (h) { return h.trim(); });
        return { fields: head, records: rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); }).map(function (r) { const o = {}; head.forEach(function (h, i) { o[h] = r[i] !== undefined ? r[i] : ''; }); return o; }) };
    }
    function loadMainkey() {
        if (window.Mainkey && window.Mainkey.parse) return Promise.resolve(window.Mainkey);
        return new Promise(function (res, rej) {
            const s = document.createElement('script');
            s.src = '../mainkey/live/mainkey-live.js';
            s.onload = function () { window.Mainkey ? res(window.Mainkey) : rej(new Error('no Mainkey')); };
            s.onerror = function () { rej(new Error('Could not load the Mainkey reader')); };
            document.head.appendChild(s);
        });
    }
    function readData(file) {
        return file.text().then(function (text) {
            const name = file.name || 'data';
            if (/\.csv$/i.test(name)) return csvParse(text.replace(/^﻿/, ''));
            if (/\.json$/i.test(name)) {
                const j = JSON.parse(text);
                const recs = Array.isArray(j) ? j : (j && Array.isArray(j.records) ? j.records : null);
                if (!recs) throw new Error('That JSON needs a list of records!');
                const fields = j.fields ? j.fields.map(function (f) { return f.id || f; }) : Object.keys(recs[0] || {});
                return { fields: fields, records: recs };
            }
            // .kb (Mainkey): YAML or JSON with fields + records
            return loadMainkey().then(function (M) { return M.parse(text); }).then(function (db) { return { fields: db.fields.map(function (f) { return f.id; }), labels: db.fields.map(function (f) { return f.name; }), records: db.records }; });
        }).then(function (d) {
            const fields = (d.fields || []).filter(function (f) { return f && f !== 'id'; }).map(String);
            if (!fields.length || !d.records.length) throw new Error('No fields or records found in that file!');
            return { name: file.name, fields: fields, records: d.records.slice(0, 5000).map(function (r) { const o = {}; fields.forEach(function (f) { o[f] = r[f] === undefined || r[f] === null ? '' : String(r[f]); }); return o; }) };
        });
    }
    function chip(field) {
        const s = document.createElement('span');
        s.className = 'wo-merge';
        s.setAttribute('contenteditable', 'false');
        s.setAttribute('data-field', field);
        s.textContent = '«' + field + '»';
        return s;
    }
    function insertField(field) {
        if (!restoreCaret()) { toast('Click in your text where the field should go first!'); return; }
        if (typeof fmtInsertNodeAtCaret === 'function' && fmtInsertNodeAtCaret(chip(field))) { paintFields(); save(); toast('«' + field + '» added!'); }
    }
    function paintFields() {
        const rec = merge && merge.records[mergeAt];
        ed.querySelectorAll('.wo-merge').forEach(function (c) {
            const f = c.getAttribute('data-field');
            const live = mergeLive && rec && Object.prototype.hasOwnProperty.call(rec, f);
            c.textContent = live ? (rec[f] || '—') : '«' + f + '»';
            c.classList.toggle('wo-merge-live', !!live);
        });
    }
    function mergedHTML() {
        const base = ed.cloneNode(true);
        base.querySelectorAll('.wo-toc-btn').forEach(function (b) { b.remove(); });
        base.querySelectorAll('[contenteditable]').forEach(function (x) { x.removeAttribute('contenteditable'); });
        return merge.records.map(function (rec, i) {
            const c = base.cloneNode(true);
            c.querySelectorAll('.wo-merge').forEach(function (m) { m.replaceWith(document.createTextNode(rec[m.getAttribute('data-field')] || '')); });
            return '<section class="wo-copy"' + (i < merge.records.length - 1 ? ' style="page-break-after:always;break-after:page"' : '') + '>' + c.innerHTML + '</section>';
        }).join('\n');
    }
    function mergedPage() {
        return '<!doctype html><html><head><meta charset="utf-8"><title>Mail merge</title><style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6;max-width:760px;margin:24px auto;padding:0 20px}' + css.textContent.replace(/::highlight[^}]*\}/g, '') + '</style></head><body>' + mergedHTML() + '</body></html>';
    }
    function mailMerge() {
        const box = document.createElement('div');
        const draw = function () {
            const n = (ed.querySelectorAll('.wo-merge') || []).length;
            box.innerHTML = '<p class="os-dlg-text" style="margin-top:0">Write your letter once, put <b>«fields»</b> where names and details go, then make one copy per record. Data can be a <b>Mainkey database (.kb)</b>, a <b>CSV</b> or <b>JSON</b> file!</p>' +
                '<label class="wo-mini" style="display:inline-block">📂 Load data<input type="file" accept=".kb,.csv,.json,.yaml,.yml" hidden id="wo-mm-file"></label> ' +
                (merge ? '<span style="font-size:12px">' + esc(merge.name) + ': <b>' + merge.records.length + '</b> records</span>' : '<span style="font-size:12px;color:#64748b">No data loaded yet!</span>') +
                (merge ? '<p style="margin:10px 0 0;font-weight:700">Insert a field at the caret:</p><div class="wo-mm-fields">' + merge.fields.map(function (f) { return '<button type="button" class="wo-mini" data-f="' + esc(f) + '">«' + esc(f) + '»</button>'; }).join('') + '</div>' +
                    '<div class="wo-mm-nav"><label style="font-size:12px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="wo-mm-live"' + (mergeLive ? ' checked' : '') + '> Preview with data</label><button type="button" class="wo-mini" data-nav="-1">◀</button><span style="font-size:12px">Record ' + (mergeAt + 1) + ' of ' + merge.records.length + '</span><button type="button" class="wo-mini" data-nav="1">▶</button></div>' +
                    '<p style="font-size:12px;color:#64748b;margin:8px 0 0">' + n + ' field' + (n === 1 ? '' : 's') + ' in the document.</p>' : '');
            const fi = box.querySelector('#wo-mm-file');
            if (fi) fi.addEventListener('change', function () {
                const f = fi.files && fi.files[0];
                if (!f) return;
                readData(f).then(function (d) { merge = d; mergeAt = 0; if (!lsSet(MKEY, d)) toast('Loaded! (It is too big to remember after a reload.)'); else toast('Loaded ' + d.records.length + ' records!'); draw(); paintFields(); })
                    .catch(function (e) { toast(String(e && e.message || e)); });
            });
            const lv = box.querySelector('#wo-mm-live');
            if (lv) lv.addEventListener('change', function () { mergeLive = lv.checked; paintFields(); });
        };
        draw();
        box.addEventListener('click', function (e) {
            const f = e.target.closest && e.target.closest('[data-f]');
            if (f) { insertField(f.getAttribute('data-f')); draw(); return; }
            const nv = e.target.closest && e.target.closest('[data-nav]');
            if (nv && merge) { mergeAt = (mergeAt + Number(nv.getAttribute('data-nav')) + merge.records.length) % merge.records.length; mergeLive = true; paintFields(); draw(); }
        });
        dialog('Mail Merge', box, [
            { label: 'Download merged copies', keep: true, value: function () {
                if (!merge) { toast('Load some data first!'); return; }
                const blob = new Blob([mergedPage()], { type: 'text/html' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mail-merge.html'; document.body.appendChild(a); a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
                toast(merge.records.length + ' copies downloaded as one HTML file (one per page when printed)!');
            } },
            { label: 'Print all copies', keep: true, value: function () {
                if (!merge) { toast('Load some data first!'); return; }
                const w = window.open('', '_blank');
                if (!w) { toast('Allow pop-ups to print!'); return; }
                w.document.open(); w.document.write(mergedPage()); w.document.close();
                setTimeout(function () { try { w.focus(); w.print(); } catch (er) {} }, 300);
            } },
            { label: 'Done', value: null, primary: true }
        ]).then(function () { mergeLive = false; paintFields(); });
    }
    function fieldMenu() {
        if (!merge) return [{ label: 'Load data in Mail Merge first', icon: 'folder', run: mailMerge }];
        return merge.fields.map(function (f) { return { label: '«' + f + '»', run: function () { insertField(f); } }; });
    }

    /* ---------- Keep things fresh while writing ---------- */
    let tq = 0;
    ed.addEventListener('input', function () {
        clearTimeout(tq);
        tq = setTimeout(function () { renumber(); if (ed.querySelector('.wo-toc')) updateTOCs(true); markLong(); paintFields(); }, 700);
    });
    setTimeout(function () { renumber(); updateTOCs(true); markLong(); paintFields(); }, 600);

    window.WriteoutPro = {
        insertTOC: insertTOC, updateTOCs: function () { updateTOCs(false); },
        insertFootnote: insertFootnote,
        readability: readability, setGoal: setGoal, goalStatus: goalStatus,
        longOn: function () { return !!prefs.long; }, setLong: setLong,
        saveVersion: saveVersion, history: history,
        mailMerge: mailMerge, fieldMenu: fieldMenu,
        analyze: analyze
    };
})();
