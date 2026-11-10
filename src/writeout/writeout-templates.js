/* =====================================================================
   Writeout Templates! Snippets of Keydown (the same text Source mode shows) that you can save and paste back in.
     Pre-made   Meeting Notes, Weekly Planner, Project Brief, Pros and Cons, Cornell Notes, a Letter, a Recipe... (edit before you paste!)
     Your own   select some of the page (or nothing, for the whole page) and Save as a Template; or write one by hand in the Templates window
   In Source mode a template is typed in at the cursor; in Visual or View mode it is formatted and put after the line you are on.
   Your templates live in this browser (localStorage "writeout_templates_v1"). Loaded after writeout-more.js!
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed) return;
    const OS = window.OfficeShell || null;
    const toast = function (m) { try { if (OS) OS.toast(m); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const save = function () { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} };
    const dialog = function (title, body, buttons, opts) { return OS ? OS.dialog(title, body, buttons, opts) : Promise.resolve(null); };
    const KEY = 'writeout_templates_v1';
    const mine = function () { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(function (t) { return t && typeof t.text === 'string'; }) : []; } catch (e) { return []; } };
    const keep = function (a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} };
    const uid = function () { return Math.random().toString(36).slice(2, 9); };

    (function () { if (document.getElementById('wo-tpl-css')) return; const st = document.createElement('style'); st.id = 'wo-tpl-css'; st.textContent = '.os-dlg.wt-dlg{width:min(880px,94vw);max-width:none}.wt-wrap .kd-hl,.wt-wrap .kd-src{padding:12px 14px;font-size:13px;min-height:280px}.wt-wrap .kd-src{overflow:hidden}.wt-wrap .kd-hl{min-height:100%}'; document.head.appendChild(st); })();

    /* ---------- the pre-made ones (Keydown text) ---------- */
    const PRE = [
        ['Meeting Notes', 'Work', '# Meeting Notes\n**Date:** \n**Attendees:** \n**Goal:** \n\n## Agenda\n* First topic\n* Second topic\n\n## Notes\n* \n\n## Decisions\n* \n\n## Action items\n| Owner | Task | Due |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |'],
        ['Weekly Planner', 'Work', '# Week of \n| Day | Focus | To do |\n| --- | --- | --- |\n| Monday |  |  |\n| Tuesday |  |  |\n| Wednesday |  |  |\n| Thursday |  |  |\n| Friday |  |  |\n| Weekend |  |  |'],
        ['Project Brief', 'Work', '# Project Brief\n## Goal\nOne sentence on what this project is for.\n\n## Why it matters\n* \n\n## Who is involved\n* \n\n## Milestones\n| Milestone | Date | Owner |\n| --- | --- | --- |\n|  |  |  |\n\n## Risks\n* \n\n## Next step\n#G#Start here##'],
        ['Status Report', 'Work', '# Status Report\n**Period:** \n\n## Overall\n#G#On track## #O#At risk## #R#Blocked##\n\n## Done this period\n* \n\n## Next period\n* \n\n## Needs help with\n* '],
        ['Bug Report', 'Work', '# Bug Report\n**Summary:** \n**Seen on:** \n**How bad:** #R#Crash## #O#Wrong result## #Y#Annoying##\n\n## Steps to reproduce\n1. \n2. \n3. \n\n## What should happen\n\n## What happens instead\n\n## Notes\n'],
        ['Pros and Cons', 'Thinking', '# Pros and Cons: \n| Pros | Cons |\n| --- | --- |\n|  |  |\n|  |  |\n|  |  |\n\n**Decision:** '],
        ['Cornell Notes', 'Study', '# Cornell Notes\n**Topic:** \n**Date:** \n\n| Cues and questions | Notes |\n| --- | --- |\n|  |  |\n|  |  |\n|  |  |\n\n## Summary\nIn two sentences, what did you learn?'],
        ['Lesson Plan', 'Study', '# Lesson Plan\n**Subject:** \n**Time:** \n\n## Goals\n* \n\n## Materials\n* \n\n## Steps\n| Minutes | Activity |\n| --- | --- |\n| 5 | Warm-up |\n| 20 | Teach |\n| 15 | Practice |\n| 5 | Wrap-up |\n\n## Check for understanding\n* '],
        ['Formal Letter', 'Writing', 'Your Name\nYour address\n\nDate\n\nRecipient Name\nTheir address\n\nDear Recipient,\n\nOpen with why you are writing.\n\nGive the details they need.\n\nClose with what you would like to happen next.\n\nSincerely,\nYour Name'],
        ['Daily Journal', 'Writing', '# Journal: \n**Mood:** \n\n## Three good things\n1. \n2. \n3. \n\n## What I learned\n\n## Tomorrow\n* '],
        ['Recipe', 'Home', '# Recipe: \n**Serves:** \n**Time:** \n\n## Ingredients\n* \n* \n* \n\n## Steps\n1. \n2. \n3. \n\n> Tip: '],
        ['Resume', 'Writing', '# Your Name\nEmail | Phone | City\n\n## Summary\nTwo lines on who you are and what you do best.\n\n## Experience\n**Job title**, Company (Year to Year)\n* What you did, with a number\n* What you improved\n\n## Education\n**Degree**, School (Year)\n\n## Skills\n* '],
        ['Gel Showcase', 'Fun', '# Gel showcase\n#R#underline#_ #B#strike#~ #G#box#= #PR#bracket#[ #O#guillemets#> #PK#double#[[\n{bar blue gel}A paragraph with a gel bar in the margin.\n{mark star gold gel}A paragraph with a gel star badge.\nHover the {tip teal rounddash|A rounded dashed underline!}tooltip underline{/tip}, and see {sc}small caps{/sc}, {dots}emphasis dots{/dots} and {dim}dimmed words{/dim}.']
    ];

    // (an empty bullet or number would draw as a lone * or 1.: give it a placeholder to type over)
    PRE.forEach(function (p) { p[2] = p[2].replace(/^(\*|\d+\.) $/gm, '$1 \u2026'); });

    /* ---------- reading the page as Keydown ---------- */
    function sourceOfRange(range) {
        const box = document.createElement('div'); box.appendChild(range.cloneContents());
        const KN = window.KeydownNext; try { if (KN && KN.restore) KN.restore(box); } catch (e) {}
        // (every line the selection touched is its own box under the Block Editor: one line of text each)
        let t = '';
        try { t = kdDoc.htmlToText(box.innerHTML); } catch (e) { t = box.textContent; }
        return String(t || '').replace(/​/g, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    function selectionSource() {
        const KB = window.KdBlockEditor;
        const vr = KB && KB.virtualRange && KB.virtualRange();
        if (vr) return sourceOfRange(vr);
        const s = window.getSelection();
        if (s.rangeCount && !s.isCollapsed && ed.contains(s.anchorNode)) return sourceOfRange(s.getRangeAt(0));
        return '';
    }
    function wholePageSource() { try { return String(kdDoc.sourceOf(ed) || '').replace(/​/g, '').trim(); } catch (e) { return ''; } }

    /* ---------- putting a template in ---------- */
    let saved = null;
    function remember() {
        const s = window.getSelection();
        if (s && s.rangeCount && ed.contains(s.getRangeAt(0).commonAncestorContainer)) saved = s.getRangeAt(0).cloneRange();
    }
    async function insertSource(text) {
        text = String(text || '');
        if (!text.trim()) return false;
        const mode = window.KdModes && window.KdModes.get ? window.KdModes.get() : 'visual';
        if (mode === 'source') {
            const ta = document.querySelector('textarea.kd-src');
            if (!ta) return false;
            ta.focus();
            const at = ta.selectionEnd, before = ta.value.slice(0, at), lead = before && !/\n$/.test(before) ? '\n' : '';
            ta.setRangeText(lead + text + '\n', at, at, 'end');
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        }
        let html = '';
        try { html = await kdDoc.toEditorHtml(text); } catch (e) { toast('That template did not format!'); return false; }
        ed.focus();
        const KB = window.KdBlockEditor;
        let box = null;
        if (saved && ed.contains(saved.startContainer)) {
            let n = saved.startContainer.nodeType === 3 ? saved.startContainer.parentElement : saved.startContainer;
            while (n && n !== ed && n.parentNode !== ed && !(n.getAttribute && n.getAttribute('contenteditable') === 'true' && /^(DIV|P|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(n.tagName))) n = n.parentNode;
            box = n && n !== ed ? n : null;
            // an UL or OL box lives deeper: put the template after the whole list
            if (box && box.parentNode && /^(UL|OL)$/.test(box.parentNode.tagName) && box.parentNode.parentNode === ed) box = box.parentNode;
        }
        const t = document.createElement('template'); t.innerHTML = html;
        const frag = t.content;
        if (box && box.parentNode) {
            const empty = !box.textContent.replace(/​/g, '').trim() && !box.querySelector('img,table,svg,canvas,video,iframe');
            box.parentNode.insertBefore(frag, box.nextSibling);
            if (empty && box.parentNode === ed) box.remove();
        } else ed.appendChild(frag);
        try { if (KB && KB.ensureBlocks) KB.ensureBlocks(); } catch (e) {}
        try { if (window.KeydownNext) window.KeydownNext.apply(ed, { editing: true }); } catch (e) {}
        try { ed.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        save();
        return true;
    }

    /* ---------- saving ---------- */
    async function saveCurrent(defaultText) {
        const text = defaultText !== undefined ? defaultText : (selectionSource() || wholePageSource());
        if (!text) { toast('There is nothing to save yet!'); return; }
        const first = text.split('\n').map(function (l) { return l.replace(/^[#>*\-+\s]+/, '').trim(); }).filter(Boolean)[0] || 'My template';
        const name = OS ? await OS.prompt('Save as a Template', 'Name', first.slice(0, 40), 'Save') : null;
        if (!name || !name.trim()) return;
        const a = mine().filter(function (t) { return t.name !== name.trim(); });
        a.push({ id: uid(), name: name.trim().slice(0, 60), text: text });
        keep(a);
        toast('Saved! Find it under Insert, then Templates!');
    }

    /* ---------- the Templates window ---------- */
    async function manager() {
        remember();
        let cur = { kind: 'pre', i: 0 };
        let working = PRE[0][2];
        const wrap = document.createElement('div');
        const listHtml = function () {
            const cats = [];
            PRE.forEach(function (p) { if (cats.indexOf(p[1]) < 0) cats.push(p[1]); });
            const row = function (kind, i, name, sub) { return '<button type="button" class="wt-row' + (cur.kind === kind && cur.i === i ? ' on' : '') + '" data-k="' + kind + '" data-i="' + i + '" style="display:block;width:100%;text-align:left;padding:5px 9px;margin:1px 0;border:1px solid ' + (cur.kind === kind && cur.i === i ? 'currentColor' : 'transparent') + ';border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer">' + esc(name) + (sub ? '<small style="opacity:.6"> ' + esc(sub) + '</small>' : '') + '</button>'; };
            const m = mine();
            let h = '<div style="font-weight:800;margin:2px 0 4px">My templates</div>' + (m.length ? m.map(function (t, i) { return row('mine', i, t.name, ''); }).join('') : '<div style="opacity:.6;font-size:12px;padding:2px 9px">None yet! Save one, or press New.</div>');
            cats.forEach(function (c) { h += '<div style="font-weight:800;margin:10px 0 4px">' + esc(c) + '</div>' + PRE.map(function (p, i) { return p[1] === c ? row('pre', i, p[0], '') : ''; }).join(''); });
            return h;
        };
        const draw = function (keepText) {
            const m = mine();
            const name = cur.kind === 'pre' ? PRE[cur.i][0] : (m[cur.i] ? m[cur.i].name : '');
            wrap.innerHTML = '<div style="display:grid;grid-template-columns:minmax(150px,34%) 1fr;gap:14px;min-height:340px">' +
                '<div id="wt-list" style="overflow:auto;max-height:420px;padding-right:6px">' + listHtml() + '</div>' +
                '<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><div style="display:flex;gap:6px;align-items:center"><input id="wt-name" class="os-dlg-input" style="flex:1" maxlength="60" placeholder="Template name" spellcheck="true"' + (cur.kind === 'pre' ? ' readonly' : '') + '>' +
                '<button type="button" class="os-dlg-btn" data-a="new">New</button><button type="button" class="os-dlg-btn" data-a="copy" title="Keep a copy in My templates">' + (cur.kind === 'pre' ? 'Save a copy' : 'Save') + '</button>' + (cur.kind === 'mine' ? '<button type="button" class="os-dlg-btn danger" data-a="del">Delete</button>' : '') + '</div>' +
                '<div class="wt-wrap" style="position:relative;flex:1;min-height:280px;max-height:380px;overflow:auto;border-radius:10px;border:1px solid var(--kc-line,#0f6a7d);background:var(--kc-bg,#06323d)"><pre class="kd-hl" id="wt-hl" aria-hidden="true"></pre><textarea id="wt-text" class="kd-src" spellcheck="false" aria-label="Template (Keydown)"></textarea></div>' +
                '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px"><span style="opacity:.7;flex:1;min-width:200px">This is Keydown, the same text Source mode shows. Change it before you insert, if you like!</span><label style="display:flex;align-items:center;gap:6px;font-weight:700">Code theme <select id="wt-theme" class="os-dlg-input" style="width:auto;padding:2px 8px"></select></label></div></div></div>';
            wrap.querySelector('#wt-name').value = name;
            const ta = wrap.querySelector('#wt-text'), hl = wrap.querySelector('#wt-hl'), KM = window.KdModes;
            ta.value = keepText !== undefined ? keepText : working;
            // the colored copy (the same highlighter Source mode uses) sits under the see-through box; the box grows with its text so both line up
            const paint = function () {
                try { hl.innerHTML = KM && KM.highlight ? KM.highlight(ta.value) : esc(ta.value); } catch (e) { hl.textContent = ta.value; }
                ta.style.height = 'auto'; ta.style.height = Math.max(280, ta.scrollHeight) + 'px';
            };
            ta.addEventListener('input', function () { working = ta.value; paint(); });
            ta.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } });
            setTimeout(paint, 0); paint();
            const sel = wrap.querySelector('#wt-theme');
            if (KM && KM.themes) {
                sel.innerHTML = KM.themes.map(function (t) { return '<option value="' + t[0] + '"' + (KM.codeTheme() === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('');
                sel.addEventListener('change', function () { KM.setCodeTheme(sel.value); });
            } else sel.parentNode.remove();
        };
        working = PRE[0][2]; draw();
        wrap.addEventListener('click', function (e) {
            const r = e.target.closest('.wt-row');
            if (r) { cur = { kind: r.dataset.k, i: Number(r.dataset.i) }; working = cur.kind === 'pre' ? PRE[cur.i][2] : (mine()[cur.i] || { text: '' }).text; draw(); return; }
            const a = e.target.closest('[data-a]'); if (!a) return;
            const act = a.dataset.a, nm = (wrap.querySelector('#wt-name').value || '').trim();
            if (act === 'new') { cur = { kind: 'mine', i: -1 }; working = ''; draw(''); wrap.querySelector('#wt-name').focus(); }
            else if (act === 'copy') {
                if (!working.trim()) { toast('Write something first!'); return; }
                const list = mine(), name = nm || (cur.kind === 'pre' ? PRE[cur.i][0] + ' (mine)' : 'My template');
                const at = cur.kind === 'mine' && list[cur.i] ? cur.i : list.findIndex(function (t) { return t.name === name; });
                if (at >= 0) { list[at].name = name; list[at].text = working; } else list.push({ id: uid(), name: name, text: working });
                keep(list); cur = { kind: 'mine', i: at >= 0 ? at : list.length - 1 }; draw(working); toast('Saved in My templates!');
            } else if (act === 'del') {
                const list = mine(); if (list[cur.i]) { list.splice(cur.i, 1); keep(list); }
                cur = { kind: 'pre', i: 0 }; working = PRE[0][2]; draw(); toast('Deleted!');
            }
        });
        const v = await dialog('Templates', wrap, [{ label: 'Close', value: null }, { label: 'Insert', primary: true, value: function () { return working; } }], { cls: 'wt-dlg' });
        if (typeof v === 'string' && v.trim()) { if (await insertSource(v)) toast('Template added!'); }
    }

    function menu() {
        remember();
        const items = [{ label: 'Browse and edit templates...', icon: 'templates', run: manager }, { label: 'Save selection as a template...', icon: 'plus', run: function () { saveCurrent(); } }];
        const m = mine();
        if (m.length) items.push({ label: '— My templates —', icon: 'info', run: function () {} });
        m.forEach(function (t) { items.push({ label: t.name, icon: 'notes', run: function () { insertSource(t.text).then(function (ok) { if (ok) toast('Template added!'); }); } }); });
        items.push({ label: '— Pre-made —', icon: 'info', run: function () {} });
        PRE.forEach(function (p) { items.push({ label: p[0], icon: 'newDoc', run: function () { insertSource(p[2]).then(function (ok) { if (ok) toast('Template added!'); }); } }); });
        return items;
    }

    window.WriteoutTemplates = { menu: menu, manager: manager, saveCurrent: saveCurrent, insertSource: insertSource, premade: function () { return PRE.map(function (p) { return { name: p[0], category: p[1], text: p[2] }; }); }, mine: mine };
})();
