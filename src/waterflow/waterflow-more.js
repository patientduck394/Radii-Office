/* =====================================================================
   Waterflow More! Another round of features:
     Wiki links       [[Note title]] (or [[Note title|words]]) links notes together, with a Linked here list on the side
     Templates        meeting notes, weekly review, recipes and more, plus your own saved ones
     Tasks            every [ ] checkbox from every note in one list, tick them right there
     Calendar         a month view of your journal, click a day to open or start its note
     Version history  Waterflow snapshots each note as you write, so you can look back and restore
     Writing goal     a daily word goal with a progress chip, plus a focus timer
     Stats            streaks, words per day, top tags, longest notes
     Find & Replace   inside the open note
     Quick capture    Ctrl+Alt+Q jots a thought into your Inbox
     Typewriter mode  keeps the line you are writing in the middle of the screen
     Insert menu      links, date, time, table of contents, callouts, badges, checklists
   Icons by Vadivam (MIT License, github.com/praveenjuge/vadivam).
   ===================================================================== */
(function () {
    'use strict';
    const WF = window.Waterflow;
    if (!WF) return;
    const $ = (id) => document.getElementById(id);
    const esc = WF.esc;
    const LS = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)); } catch (e) { return null; } };
    const vi = (name) => '<svg viewBox="0 0 24 24" class="wm-i" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ((window.WF_ICONS || {})[name] || '') + '</svg>';
    const notes = () => WF.notes().filter((n) => !n.trashed);
    const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dayKey = (t) => WF.ymd(new Date(t));
    const plural = (n, w) => n + ' ' + (n === 1 ? w : w === 'match' ? 'matches' : w + 's');

    /* ---------- wiki links ---------- */
    const titleKey = (n) => WF.titleOf(n).trim().toLowerCase();
    function findByTitle(t) { const k = String(t).trim().toLowerCase(); return notes().find((n) => titleKey(n) === k) || null; }
    // run fn on the pieces of text outside code fences and inline code
    function mapOutside(text, fn) {
        let fence = false;
        return text.split('\n').map(function (l) {
            if (/^\s*```/.test(l)) { fence = !fence; return l; }
            if (fence) return l;
            return l.split(/(`[^`\n]*`)/).map(function (p, i) { return i % 2 ? p : fn(p); }).join('');
        }).join('\n');
    }
    const WIKI = /\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/g;
    function wikiOut(t) {
        if (t.indexOf('[[') < 0) return t;
        return mapOutside(t, function (p) {
            return p.replace(WIKI, function (m, a, b) {
                const n = findByTitle(a), label = (b || a).trim();
                return n ? '[' + label + '](#n=' + n.id + ')' : '[' + label + '](#new=' + encodeURIComponent(a.trim()) + ')';
            });
        });
    }
    function wikiIn(t) {
        if (t.indexOf('(#n=') < 0 && t.indexOf('(#new=') < 0) return t;
        return mapOutside(t, function (p) {
            return p.replace(/\[([^\]\n]*)\]\(#(n|new)=([^)\s]+)\)/g, function (m, label, kind, v) {
                let title;
                if (kind === 'n') { const n = WF.notes().find((x) => x.id === v); if (!n) return m; title = WF.titleOf(n); }
                else { try { title = decodeURIComponent(v); } catch (e) { return m; } }
                return label.trim() === title ? '[[' + title + ']]' : '[[' + title + '|' + label + ']]';
            });
        });
    }
    // a link to a note that does not exist yet makes the note
    window.addEventListener('hashchange', function () {
        const m = /#new=([^&]+)/.exec(location.hash);
        if (!m) return;
        let title = ''; try { title = decodeURIComponent(m[1]); } catch (e) { return; }
        WF.readMode();
        const n = findByTitle(title) || WF.newNote({ title: title }, true);
        if (n && WF.cur() !== n) WF.openNote(n);
        WF.toast('Made a note called ' + title + '!');
    });
    // in Visual, a plain click edits the words, so Ctrl or Cmd click (or a double click) follows the link
    document.addEventListener('click', function (e) {
        const a = e.target.closest && e.target.closest('#wf-visual a[href^="#n="], #wf-visual a[href^="#new="]');
        if (!a) return;
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) { WF.readMode(); location.hash = a.getAttribute('href'); }
    }, true);
    document.addEventListener('dblclick', function (e) {
        const a = e.target.closest && e.target.closest('#wf-visual a[href^="#n="], #wf-visual a[href^="#new="]');
        if (a) { e.preventDefault(); WF.readMode(); location.hash = a.getAttribute('href'); }
    });

    /* ---------- linked here (backlinks) ---------- */
    function backlinks(n) {
        const re = new RegExp('\\[\\[\\s*' + escRe(WF.titleOf(n)) + '\\s*(\\||\\]\\])', 'i');
        return notes().filter((m) => m !== n && re.test(m.text || ''));
    }
    function outgoing(n) {
        const out = []; let m; WIKI.lastIndex = 0;
        const t = n.text || '';
        while ((m = WIKI.exec(t))) { const x = findByTitle(m[1]); if (x && x !== n && out.indexOf(x) < 0) out.push(x); }
        return out;
    }
    function renderBack() {
        const n = WF.cur(); const box = $('wm-back'); if (!box) return;
        if (!n || n.scratch) { box.innerHTML = ''; return; }
        const inn = backlinks(n), out = outgoing(n);
        const row = (x) => '<button type="button" data-open="' + esc(x.id) + '">' + esc(WF.titleOf(x)) + '</button>';
        box.innerHTML = (inn.length ? inn.map(row).join('') : '<p>Nothing links here yet. Type [[' + esc(WF.titleOf(n).slice(0, 20)) + ']] in another note!</p>')
            + (out.length ? '<h3>Links to</h3>' + out.map(row).join('') : '');
    }
    function mountBack() {
        const side = $('wf-side'); if (!side || $('wm-back')) return;
        side.insertAdjacentHTML('beforeend', '<h3>Linked here</h3><nav class="wm-back" id="wm-back"></nav>');
        $('wm-back').addEventListener('click', function (e) { const b = e.target.closest('[data-open]'); if (b) { WF.readMode(); WF.open(b.dataset.open); } });
    }

    /* ---------- version history ---------- */
    const SNAP_MS = 5 * 60 * 1000;
    function snap(n, force) {
        if (!n || n.scratch || !n.text || !n.text.trim()) return;
        const h = n.history || (n.history = []), last = h[h.length - 1];
        if (last && last.text === n.text) return;
        if (!force && last && Date.now() - last.t < SNAP_MS) return;
        h.push({ t: Date.now(), title: n.title || '', text: n.text });
        while (h.length > 20) h.shift();
    }
    function historyDialog() {
        const n = WF.cur(); if (!n) return;
        WF.readMode(); snap(n, true);
        const h = (n.history || []).slice().reverse();
        const nowWords = WF.words(n.text);
        const html = h.length < 2 ? '<p class="wm-note">Waterflow keeps a snapshot of this note about every five minutes while you write. Keep writing and come back!</p>'
            : '<div class="wm-hist"><div class="wm-hlist">' + h.map(function (s, i) {
                const w = WF.words(s.text), d = w - nowWords;
                return '<button type="button" data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '"><b>' + esc(new Date(s.t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) + '</b><span>' + plural(w, 'word') + (i === 0 ? ' (now)' : d ? ', ' + (d > 0 ? '+' : '') + d + ' vs now' : '') + '</span></button>';
            }).join('') + '</div><div class="wm-hprev"><div class="wm-hbody wf-paper" id="wm-hbody"></div><button type="button" class="wf-gel" id="wm-hrestore">' + vi('rotate-ccw-clock') + 'Restore this version</button></div></div>';
        WF.dialog('History of ' + WF.titleOf(n), html, function (body) {
            if (h.length < 2) return;
            let sel = 0;
            const show = function () {
                const s = h[sel], PK = WF.PK();
                const kd = WF.isPK(n) && PK ? PK.toKD(s.text) : s.text;
                try { $('wm-hbody').innerHTML = window.Keydown.render(wikiOut(kd)); } catch (e) { $('wm-hbody').textContent = s.text; }
                body.querySelectorAll('.wm-hlist button').forEach((b) => b.classList.toggle('on', Number(b.dataset.i) === sel));
                $('wm-hrestore').hidden = sel === 0;
            };
            body.querySelector('.wm-hlist').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) { sel = Number(b.dataset.i); show(); } });
            $('wm-hrestore').addEventListener('click', function () {
                const s = h[sel]; snap(n, true);
                n.text = s.text; n.title = s.title || n.title; WF.touch(n);
                WF.closeDialog(); $('wf-title').value = n.title || ''; WF.loadMode(); WF.afterTextChange(false); WF.renderList();
                WF.toast('Restored the version from ' + new Date(s.t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + '!');
            });
            show();
        });
    }

    /* ---------- writing goal, word log, focus timer ---------- */
    const logRead = () => { try { return JSON.parse(LS('waterflow2_wordlog') || '{}') || {}; } catch (e) { return {}; } };
    const lastWords = {};
    function addWords(n, save) {
        const w = WF.words(n.text);
        if (lastWords[n.id] == null) { lastWords[n.id] = w; return; }
        const d = w - lastWords[n.id]; lastWords[n.id] = w;
        if (save && d > 0 && d < 400) { const lg = logRead(), k = dayKey(Date.now()); lg[k] = (lg[k] || 0) + d; LS('waterflow2_wordlog', JSON.stringify(lg)); goalChip(); }
    }
    function goalChip() {
        const c = $('wm-goal'); if (!c) return;
        const g = Number(WF.settings().goal) || 0;
        c.hidden = !g;
        if (!g) return;
        const t = logRead()[dayKey(Date.now())] || 0, pct = Math.min(100, Math.round(t / g * 100));
        c.innerHTML = vi('target') + '<span>' + t + ' / ' + g + '</span><i style="width:' + pct + '%"></i>';
        c.classList.toggle('done', t >= g);
        c.title = t >= g ? 'You reached today\'s goal!' : 'Today\'s writing goal: ' + (g - t) + ' words to go';
    }
    function goalDialog() {
        const g = Number(WF.settings().goal) || 0;
        WF.dialog('Daily word goal', '<p class="wm-note">Waterflow counts the words you add to notes today. Set 0 to switch the goal off!</p><label class="wm-field"><span>Words a day</span><input type="number" id="wm-gin" min="0" step="50" value="' + (g || 300) + '"></label><button type="button" class="wf-gel" id="wm-gok">Save goal</button>', function () {
            $('wm-gok').addEventListener('click', function () { const v = Math.max(0, Math.round(Number($('wm-gin').value) || 0)); WF.settings().goal = v; WF.applySettings(); WF.closeDialog(); goalChip(); WF.toast(v ? 'Goal set to ' + v + ' words a day!' : 'Goal switched off!'); });
        });
    }
    let timer = null;
    function timerChip() {
        const c = $('wm-timer'); if (!c) return;
        if (!timer) { c.hidden = true; return; }
        c.hidden = false;
        const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
        c.innerHTML = vi('timer') + '<span>' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + '</span>';
        if (left <= 0) { const m = timer.min; timer = null; timerChip(); WF.toast('Time is up! ' + m + ' focused minutes done, take a stretch!'); try { document.title = 'Time is up! Waterflow'; setTimeout(() => { document.title = 'Waterflow'; }, 4000); } catch (e) {} }
    }
    function startTimer(min) {
        timer = { end: Date.now() + min * 60000, min: min };
        document.body.classList.add('wf-focus'); WF.toast('Focus timer: ' + min + ' minutes, focus mode on!');
        timerChip();
        if (!startTimer.iv) startTimer.iv = setInterval(timerChip, 1000);
    }
    function timerMenu(anchor) {
        const items = [[15, '15 minutes'], [25, '25 minutes (a classic)'], [45, '45 minutes'], [60, 'An hour']].map((x) => ['Focus for ' + x[1], () => startTimer(x[0])]);
        if (timer) items.unshift(['Stop the timer', () => { timer = null; timerChip(); WF.toast('Timer stopped!'); }, 'danger']);
        WF.menu(anchor, items);
    }

    /* ---------- tasks ---------- */
    const TASK = /^(\s*(?:[-*+]|\([+.~=*]?\))\s+)\[( |x|X)\](\s+.*)$/;
    function allTasks() {
        const out = [];
        notes().forEach(function (n) {
            (n.text || '').split('\n').forEach(function (l, i) { const m = TASK.exec(l); if (m) out.push({ n: n, i: i, done: m[2] !== ' ', text: WF.plain(m[3]) || m[3].trim() }); });
        });
        return out;
    }
    function tasksDialog(filter) {
        filter = filter || 'open';
        const all = allTasks(), open = all.filter((t) => !t.done).length;
        const shown = all.filter((t) => filter === 'all' || (filter === 'open' ? !t.done : t.done));
        const groups = new Map(); shown.forEach((t) => { if (!groups.has(t.n)) groups.set(t.n, []); groups.get(t.n).push(t); });
        let html = '<div class="wm-seg" role="tablist">' + [['open', 'To do (' + open + ')'], ['done', 'Done (' + (all.length - open) + ')'], ['all', 'All']].map((f) => '<button type="button" data-f="' + f[0] + '" class="' + (f[0] === filter ? 'on' : '') + '">' + f[1] + '</button>').join('') + '</div>';
        html += '<div class="wm-add"><input type="text" id="wm-tin" placeholder="Add a task to your Tasks note" maxlength="140"><button type="button" class="wf-gel" id="wm-tadd">' + vi('plus') + 'Add</button></div>';
        html += groups.size ? Array.from(groups.entries()).map(function (g) {
            return '<h4><button type="button" class="wm-link" data-note="' + esc(g[0].id) + '">' + esc(WF.titleOf(g[0])) + '</button></h4>' + g[1].map(function (t) {
                return '<label class="wm-task' + (t.done ? ' done' : '') + '"><input type="checkbox" data-n="' + esc(t.n.id) + '" data-i="' + t.i + '"' + (t.done ? ' checked' : '') + '><span>' + esc(t.text) + '</span></label>';
            }).join('');
        }).join('') : '<p class="wm-note">' + (all.length ? 'Nothing here! Switch the tab above.' : 'No tasks yet! Write a line like <code>- [ ] Call the bakery</code> in any note, and it shows up here.') + '</p>';
        WF.dialog('Tasks from every note', html, function (body) {
            body.addEventListener('change', function (e) {
                const c = e.target.closest('input[type=checkbox][data-n]'); if (!c) return;
                const n = WF.notes().find((x) => x.id === c.dataset.n); if (!n) return;
                if (n === WF.cur()) WF.readMode();
                const lines = n.text.split('\n'), i = Number(c.dataset.i);
                lines[i] = lines[i].replace(/\[( |x|X)\]/, c.checked ? '[x]' : '[ ]');
                n.text = lines.join('\n'); WF.touch(n);
                if (n === WF.cur()) { WF.loadMode(); WF.afterTextChange(false); }
                tasksDialog(filter);
            });
            body.addEventListener('click', function (e) {
                const f = e.target.closest('[data-f]'); if (f) { tasksDialog(f.dataset.f); return; }
                const l = e.target.closest('[data-note]'); if (l) { WF.closeDialog(); WF.readMode(); WF.open(l.dataset.note); }
            });
            const add = function () {
                const v = $('wm-tin').value.trim(); if (!v) return;
                let n = notes().find((x) => x.title === 'Tasks');
                if (!n) n = WF.newNote({ title: 'Tasks', tags: ['tasks'], text: '' }, false);
                if (n === WF.cur()) WF.readMode();
                n.text = (n.text || '').replace(/\s+$/, '') + (n.text ? '\n' : '') + '- [ ] ' + v + '\n'; WF.touch(n);
                if (n === WF.cur()) { WF.loadMode(); WF.afterTextChange(false); }
                WF.renderAll(); tasksDialog('open');
            };
            $('wm-tadd').addEventListener('click', add);
            $('wm-tin').addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
        });
    }

    /* ---------- calendar ---------- */
    let calM = new Date(); calM.setDate(1);
    let calSel = dayKey(Date.now());
    function journalNb() {
        let jb = WF.nbs().find((b) => b.name === 'Journal');
        if (!jb) { jb = { id: WF.uid(), name: 'Journal', color: WF.COLORS[6] }; WF.nbs().push(jb); WF.saveNbs(); }
        return jb;
    }
    function openDay(key) {
        let n = notes().find((x) => x.title === key);
        if (!n) {
            const d = new Date(key + 'T12:00:00'), jb = journalNb();
            n = WF.blank({ title: key, nb: jb.id, tags: ['journal'], text: (WF.newLang() === 'pk' ? '/ ' : '# ') + d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + '\n' });
            WF.notes().push(n); WF.touch(n);
        }
        WF.setStream({ kind: 'all' }); WF.readMode(); WF.openNote(n);
    }
    function calDialog() {
        const y = calM.getFullYear(), m = calM.getMonth();
        const start = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
        const counts = {}, journal = {};
        notes().forEach(function (n) {
            const a = dayKey(n.created), b = dayKey(n.updated);
            counts[a] = (counts[a] || 0) + 1; if (b !== a) counts[b] = (counts[b] || 0) + 1;
            if (/^\d{4}-\d\d-\d\d$/.test(n.title)) journal[n.title] = true;
        });
        const todayK = dayKey(Date.now());
        let cells = ''; for (let i = 0; i < start; i++) cells += '<i></i>';
        for (let d = 1; d <= dim; d++) {
            const k = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'), c = counts[k] || 0;
            cells += '<button type="button" data-d="' + k + '" class="' + (k === todayK ? 'today ' : '') + (k === calSel ? 'sel ' : '') + (journal[k] ? 'jr' : '') + '"><b>' + d + '</b><u>' + (c ? '<s></s>'.repeat(Math.min(3, c)) : '') + '</u></button>';
        }
        const dayNotes = notes().filter((n) => dayKey(n.created) === calSel || dayKey(n.updated) === calSel);
        const html = '<div class="wm-calhead"><button type="button" class="wf-mini" data-m="-1" title="Last month">' + vi('chevron-left') + '</button><b>' + esc(calM.toLocaleDateString([], { month: 'long', year: 'numeric' })) + '</b><button type="button" class="wf-mini" data-m="1" title="Next month">' + vi('chevron-right') + '</button><button type="button" class="wf-ghost wm-todaybtn" data-m="0">Today</button></div>'
            + '<div class="wm-cal"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>' + cells + '</div>'
            + '<h4>' + esc(new Date(calSel + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })) + '</h4>'
            + '<div class="wm-daylist">' + (dayNotes.length ? dayNotes.map((n) => '<button type="button" class="wm-link" data-note="' + esc(n.id) + '">' + esc(WF.titleOf(n)) + '</button>').join('') : '<p class="wm-note">No notes on this day yet!</p>') + '</div>'
            + '<button type="button" class="wf-gel" id="wm-openday">' + vi('calendar-check') + (journal[calSel] ? 'Open this day\'s journal note' : 'Start a journal note for this day') + '</button>';
        WF.dialog('Calendar', html, function (body) {
            body.onclick = function (e) {
                const mo = e.target.closest('[data-m]'); if (mo) { const v = Number(mo.dataset.m); if (v === 0) { calM = new Date(); calM.setDate(1); calSel = todayK; } else calM = new Date(calM.getFullYear(), calM.getMonth() + v, 1); calDialog(); return; }
                const d = e.target.closest('[data-d]'); if (d) { calSel = d.dataset.d; calDialog(); return; }
                const l = e.target.closest('[data-note]'); if (l) { WF.closeDialog(); WF.readMode(); WF.open(l.dataset.note); return; }
                if (e.target.closest('#wm-openday')) { WF.closeDialog(); openDay(calSel); }
            };
        });
    }

    /* ---------- templates ---------- */
    const TEMPLATES = [
        ['Meeting notes', 'Agenda, notes, decisions and who does what', '# Meeting notes\n**Date:** {date}\n**With:** \n\n## Agenda\n- First topic\n- Second topic\n\n## Notes\n\n## Decisions\n- \n\n## Action items\n- [ ] Who does what, by when?', ['meeting']],
        ['Weekly review', 'Look back, look ahead, reset', '# Weekly review\n**Week of {date}**\n\n## What went well\n- \n\n## What was hard\n- \n\n## Next week\n- [ ] Top priority\n- [ ] Second priority\n- [ ] One small joy\n\n## Notes to my future self\n', ['review']],
        ['Project plan', 'Goal, steps, risks and a progress bar', '# Project plan\n::progress 10% Progress\n\n## The goal\nWhat does done look like?\n\n## Steps\n- [ ] Step one\n- [ ] Step two\n- [ ] Step three\n\n## Risks\n- What could go wrong?\n\n## Links and notes\n', ['project']],
        ['Book notes', 'Quotes, ideas and a rating', '# Book notes\n**Title:** \n**Author:** \n**Finished:** {date}\n::rating 4/5 My rating\n\n## In one sentence\n\n## Best quotes\n> A line worth keeping\n\n## Ideas I want to use\n- [ ] \n', ['books']],
        ['Recipe', 'Ingredients, steps and a timer', '# Recipe\n**Serves:** 4    **Time:** 30 minutes\n\n## Ingredients\n- [ ] \n- [ ] \n- [ ] \n\n## Steps\n1. \n2. \n3. \n\n## Tips\n::note Good to know\nWrite what you would change next time.\n::end', ['recipes']],
        ['Decision log', 'Options, pros and cons, the call', '# Decision\n**Date:** {date}\n\n## The question\n\n## Options\n::proscons Option A\n+ A good thing\n- A not so good thing\n::end\n\n## The call\n\n## Why\n', ['decisions']],
        ['Brainstorm', 'Wild ideas first, sorting later', '# Brainstorm\n**Topic:** \n\n## Wild ideas (no judging!)\n- \n- \n- \n\n## Favorites\n- [ ] \n\n## Next small step\n', ['ideas']],
        ['Study notes', 'Key terms, a summary and a quiz', '# Study notes\n**Subject:** \n**Date:** {date}\n\n## Key terms\n- **Term:** what it means\n\n## Summary\n\n## Quiz myself\n::quiz A question to test myself?\n* A wrong answer\n* [x] The right answer\n* Another wrong answer\n::end', ['study']],
        ['Trip plan', 'Countdown, packing list and ideas', '# Trip plan\n::countdown 2027-01-01 Departure\n\n## Packing\n- [ ] Passport\n- [ ] Charger\n- [ ] Comfortable shoes\n\n## Places to see\n- \n\n## Bookings\n- \n', ['travel']],
        ['Daily planner', 'Top three, schedule and a gratitude line', '# Daily plan\n**{date}**\n\n## Top three\n- [ ] \n- [ ] \n- [ ] \n\n## Schedule\n- 09:00 \n- 13:00 \n- 17:00 \n\n## One good thing today\n', ['planner']]
    ];
    const userTpl = () => { try { return JSON.parse(LS('waterflow2_templates') || '[]') || []; } catch (e) { return []; } };
    const saveTpl = (a) => LS('waterflow2_templates', JSON.stringify(a));
    const fillDate = (t) => t.replace(/\{date\}/g, new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    function templatesDialog(insertMode) {
        const mine = userTpl();
        const card = (t, i, user) => '<button type="button" class="wm-tcard" data-i="' + i + '" data-user="' + (user ? 1 : 0) + '"><b>' + esc(t[0]) + '</b><span>' + esc(t[1]) + '</span>' + (user ? '<em data-del="' + i + '" title="Delete this template">' + vi('x') + '</em>' : '') + '</button>';
        const html = '<p class="wm-note">' + (insertMode ? 'Pick one to add to the end of this note!' : 'Pick one to start a new note from it!') + '</p><div class="wm-tgrid">' + TEMPLATES.map((t, i) => card(t, i, false)).join('') + '</div>'
            + '<h4>Your templates</h4><div class="wm-tgrid">' + (mine.length ? mine.map((t, i) => card([t.name, t.desc || 'Your own template'], i, true)).join('') : '<p class="wm-note">Open a note and run "Save this note as a template" (Ctrl+K) to keep it here!</p>') + '</div>';
        WF.dialog(insertMode ? 'Add a template to this note' : 'Start from a template', html, function (body) {
            body.addEventListener('click', function (e) {
                const del = e.target.closest('[data-del]');
                if (del) { e.stopPropagation(); const a = userTpl(); a.splice(Number(del.dataset.del), 1); saveTpl(a); templatesDialog(insertMode); return; }
                const c = e.target.closest('.wm-tcard'); if (!c) return;
                const i = Number(c.dataset.i), user = c.dataset.user === '1';
                const tpl = user ? { name: mine[i].name, kd: mine[i].kd, tags: mine[i].tags || [] } : { name: TEMPLATES[i][0], kd: TEMPLATES[i][2], tags: TEMPLATES[i][3] };
                const kd = fillDate(tpl.kd);
                WF.closeDialog();
                if (insertMode && WF.cur()) { WF.insertText(kd); WF.toast('Added the ' + tpl.name + ' template!'); return; }
                const PK = WF.PK(), pk = WF.newLang() === 'pk' && PK;
                const short = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
                const n = WF.newNote({ title: tpl.name === 'Daily planner' || tpl.name === 'Meeting notes' || tpl.name === 'Weekly review' ? tpl.name + ', ' + short : tpl.name, text: pk ? PK.toPK(kd) : kd, tags: (tpl.tags || []).slice(), lang: pk ? 'pk' : 'kd' }, true);
                WF.toast('New note from the ' + tpl.name + ' template!');
                return n;
            });
        });
    }
    function saveAsTemplate() {
        const n = WF.cur(); if (!n) return;
        WF.readMode();
        const PK = WF.PK(), kd = WF.isPK(n) && PK ? PK.toKD(n.text || '') : (n.text || '');
        WF.dialog('Save as a template', '<label class="wm-field"><span>Template name</span><input type="text" id="wm-tname" maxlength="40" value="' + esc(WF.titleOf(n)) + '"></label><label class="wm-field"><span>Short description</span><input type="text" id="wm-tdesc" maxlength="80" placeholder="What is it for?"></label><button type="button" class="wf-gel" id="wm-tsave">' + vi('layout-template') + 'Save template</button>', function () {
            $('wm-tsave').addEventListener('click', function () {
                const a = userTpl(); a.push({ name: $('wm-tname').value.trim() || 'My template', desc: $('wm-tdesc').value.trim(), kd: kd, tags: (n.tags || []).slice() }); saveTpl(a);
                WF.closeDialog(); WF.toast('Saved! Find it under Templates!');
            });
        });
    }

    /* ---------- stats ---------- */
    function statsDialog() {
        const ns = notes(), lg = logRead();
        const totalWords = ns.reduce((a, n) => a + WF.words(n.text), 0);
        const days = new Set(); ns.forEach((n) => { days.add(dayKey(n.created)); days.add(dayKey(n.updated)); }); Object.keys(lg).forEach((k) => { if (lg[k] > 0) days.add(k); });
        let streak = 0; const d = new Date(); if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
        while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
        const bars = []; for (let i = 13; i >= 0; i--) { const dd = new Date(); dd.setDate(dd.getDate() - i); const k = dayKey(dd); bars.push([k, lg[k] || 0, dd]); }
        const max = Math.max(50, ...bars.map((b) => b[1]));
        const svg = '<svg class="wm-chart" viewBox="0 0 280 90" role="img" aria-label="Words written in the last 14 days">' + bars.map(function (b, i) {
            const h = Math.round(b[1] / max * 62);
            return '<rect x="' + (i * 20 + 3) + '" y="' + (70 - h) + '" width="14" height="' + Math.max(2, h) + '" rx="4" class="' + (i === 13 ? 'now' : '') + '"><title>' + esc(b[2].toLocaleDateString([], { month: 'short', day: 'numeric' })) + ': ' + b[1] + ' words</title></rect><text x="' + (i * 20 + 10) + '" y="85" text-anchor="middle">' + b[2].getDate() + '</text>';
        }).join('') + '</svg>';
        const tc = {}; ns.forEach((n) => (n.tags || []).forEach((t) => { tc[t] = (tc[t] || 0) + 1; }));
        const tags = Object.keys(tc).sort((a, b) => tc[b] - tc[a]).slice(0, 8);
        const longest = ns.slice().sort((a, b) => WF.words(b.text) - WF.words(a.text)).slice(0, 5);
        const tile = (n, l) => '<div class="wm-tile"><b>' + n + '</b><span>' + l + '</span></div>';
        const html = '<div class="wm-tiles">' + tile(ns.length, 'notes') + tile(totalWords.toLocaleString(), 'words') + tile(streak, streak === 1 ? 'day streak' : 'day streak') + tile(allTasks().filter((t) => !t.done).length, 'open tasks') + '</div>'
            + '<h4>Words written, last 14 days</h4>' + svg
            + '<h4>Top tags</h4><div class="wm-tags">' + (tags.length ? tags.map((t) => '<span>#' + esc(t) + ' <b>' + tc[t] + '</b></span>').join('') : '<p class="wm-note">Add tags to your notes and they appear here!</p>') + '</div>'
            + '<h4>Longest notes</h4>' + longest.map((n) => '<button type="button" class="wm-link wm-row" data-note="' + esc(n.id) + '"><span>' + esc(WF.titleOf(n)) + '</span><i>' + plural(WF.words(n.text), 'word') + '</i></button>').join('');
        WF.dialog('Your writing', html, function (body) { body.addEventListener('click', function (e) { const l = e.target.closest('[data-note]'); if (l) { WF.closeDialog(); WF.readMode(); WF.open(l.dataset.note); } }); });
    }

    /* ---------- find and replace in this note ---------- */
    let lastFind = { f: '', r: '', c: false, w: false };
    function findDialog() {
        const n = WF.cur(); if (!n) { WF.toast('Open a note first!'); return; }
        WF.dialog('Find and replace in this note', '<label class="wm-field"><span>Find</span><input type="text" id="wm-ff" spellcheck="false"></label><label class="wm-field"><span>Replace with</span><input type="text" id="wm-fr" spellcheck="false"></label><label class="wm-check"><input type="checkbox" id="wm-fc"> Match upper and lower case</label><label class="wm-check"><input type="checkbox" id="wm-fw"> Whole words only</label><p class="wm-note" id="wm-fn">Type something to find!</p><button type="button" class="wf-gel" id="wm-fgo">' + vi('replace') + 'Replace all</button>', function () {
            $('wm-ff').value = lastFind.f; $('wm-fr').value = lastFind.r; $('wm-fc').checked = lastFind.c; $('wm-fw').checked = lastFind.w;
            const re = () => { lastFind = { f: $('wm-ff').value, r: $('wm-fr').value, c: $('wm-fc').checked, w: $('wm-fw').checked }; if (!lastFind.f) return null; const s = escRe(lastFind.f); return new RegExp(lastFind.w ? '\\b' + s + '\\b' : s, lastFind.c ? 'g' : 'gi'); };
            const count = () => { WF.readMode(); const r = re(), m = r ? (n.text || '').match(r) : null; $('wm-fn').textContent = !r ? 'Type something to find!' : m ? plural(m.length, 'match') + ' in this note!' : 'No matches!'; };
            ['wm-ff', 'wm-fc', 'wm-fw'].forEach((id) => $(id).addEventListener('input', count));
            $('wm-fgo').addEventListener('click', function () {
                WF.readMode(); const r = re(); if (!r) return;
                const k = (n.text.match(r) || []).length; if (!k) { WF.toast('No matches!'); return; }
                snap(n, true);
                n.text = n.text.replace(r, () => lastFind.r); WF.touch(n); WF.closeDialog(); WF.loadMode(); WF.afterTextChange(false); WF.renderList();
                WF.toast('Replaced ' + plural(k, 'match') + '! (The old version is in History.)');
            });
            setTimeout(() => $('wm-ff').focus(), 30); count();
        });
    }

    /* ---------- quick capture ---------- */
    function captureDialog() {
        WF.dialog('Quick capture', '<p class="wm-note">Jot it down now, sort it later! It lands in your Inbox notebook.</p><textarea id="wm-cap" rows="6" placeholder="What is on your mind?"></textarea><button type="button" class="wf-gel" id="wm-capgo">' + vi('inbox') + 'Save to Inbox</button>', function () {
            const go = function () {
                const t = $('wm-cap').value.trim(); if (!t) return;
                let nb = WF.nbs().find((b) => b.name === 'Inbox');
                if (!nb) { nb = { id: WF.uid(), name: 'Inbox', color: WF.COLORS[2] }; WF.nbs().push(nb); WF.saveNbs(); }
                const first = t.split('\n')[0].replace(/^[#\s\-*]+/, '').slice(0, 60);
                const PK = WF.PK(), pk = WF.newLang() === 'pk' && PK;
                WF.newNote({ title: first, nb: nb.id, tags: ['inbox'], text: pk ? PK.toPK(t) : t, lang: pk ? 'pk' : 'kd' }, false);
                WF.closeDialog(); WF.renderAll(); WF.toast('Saved to your Inbox!');
            };
            $('wm-capgo').addEventListener('click', go);
            $('wm-cap').addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') go(); });
            setTimeout(() => $('wm-cap').focus(), 30);
        });
    }

    /* ---------- typewriter mode ---------- */
    function applyType() { document.body.classList.toggle('wm-type', !!WF.settings().type); }
    function centerCaret() {
        if (!WF.settings().type || !WF.cur()) return;
        if (WF.mode() === 'source') {
            const ta = $('wf-source'); if (document.activeElement !== ta) return;
            const ratio = ta.selectionStart / Math.max(1, ta.value.length);
            ta.scrollTop = Math.max(0, ratio * ta.scrollHeight - ta.clientHeight / 2); $('wf-hl').scrollTop = ta.scrollTop;
        } else if (WF.mode() === 'visual') {
            const v = $('wf-visual'), s = window.getSelection(); if (!s || !s.rangeCount || !v.contains(s.anchorNode)) return;
            const r = s.getRangeAt(0).cloneRange(); r.collapse(true);
            let rect = r.getClientRects()[0]; if (!rect) { const el = s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode; rect = el && el.getBoundingClientRect(); }
            if (!rect) return;
            const vr = v.getBoundingClientRect(), delta = rect.top - (vr.top + vr.height * 0.45);
            if (Math.abs(delta) > 24) v.scrollTop += delta;
        }
    }
    ['input', 'keyup'].forEach((ev) => { $('wf-visual').addEventListener(ev, centerCaret); $('wf-source').addEventListener(ev, centerCaret); });
    function toggleType() { const s = WF.settings(); s.type = !s.type; WF.applySettings(); applyType(); WF.toast(s.type ? 'Typewriter mode on: the line you write stays in the middle!' : 'Typewriter mode off!'); }

    /* ---------- the Insert menu ---------- */
    const BADGE_COLORS = ['blue', 'sky', 'teal', 'green', 'lime', 'yellow', 'orange', 'red', 'pink', 'purple', 'indigo', 'gray'];
    const BADGE_STYLES = ['soft', 'solid', 'outline', 'dashed', 'pill', 'square', 'tag', 'glow', 'gradient', 'glass', 'dot'];
    const BADGE_ICONS = ['star', 'check', 'bolt', 'heart', 'flag', 'info', 'fire', 'rocket', 'sparkle', 'bell', 'lock', 'user', 'tag', 'clock', 'bug', 'gift', 'crown', 'leaf', 'flask', 'shield'];
    function badgeDialog() {
        const opts = (a, sel) => a.map((x) => '<option value="' + x + '"' + (x === sel ? ' selected' : '') + '>' + x[0].toUpperCase() + x.slice(1) + '</option>').join('');
        WF.dialog('Insert a badge', '<div class="wm-badgeprev" id="wm-bp"></div><label class="wm-field"><span>Words (empty for just the icon)</span><input type="text" id="wm-bt" value="New" maxlength="30"></label><div class="wm-two"><label class="wm-field"><span>Color</span><select id="wm-bc">' + opts(BADGE_COLORS, 'blue') + '</select></label><label class="wm-field"><span>Style</span><select id="wm-bs">' + opts(BADGE_STYLES, 'soft') + '</select></label></div><div class="wm-two"><label class="wm-field"><span>Icon</span><select id="wm-bi"><option value="">None</option>' + opts(BADGE_ICONS, 'star') + '</select></label><label class="wm-field"><span>Size</span><select id="wm-bz"><option value="xs">Tiny</option><option value="sm">Small</option><option value="md" selected>Normal</option><option value="lg">Large</option></select></label></div><button type="button" class="wf-gel" id="wm-bgo">' + vi('badge-check') + 'Insert badge</button>', function () {
            const src = () => { const p = [$('wm-bt').value.replace(/[{}|\n]/g, ' ').trim(), $('wm-bc').value, $('wm-bs').value]; if ($('wm-bi').value) p.push($('wm-bi').value); if ($('wm-bz').value !== 'md') p.push($('wm-bz').value); return '{badge ' + p.join(' | ') + '}'; };
            const draw = function () { const b = $('wm-bp'); b.textContent = src(); try { if (window.KeydownNext) window.KeydownNext.apply(b); } catch (e) {} };
            ['wm-bt', 'wm-bc', 'wm-bs', 'wm-bi', 'wm-bz'].forEach((id) => { $(id).addEventListener('input', draw); $(id).addEventListener('change', draw); });
            $('wm-bgo').addEventListener('click', function () { const s = src(); WF.closeDialog(); WF.insertText(null, () => s + ' '); });
            draw();
        });
    }
    function linkPicker() {
        const cur = WF.cur();
        const list = notes().filter((n) => n !== cur).sort((a, b) => b.updated - a.updated);
        WF.dialog('Link to a note', '<input type="text" id="wm-lq" class="wm-search" placeholder="Search your notes" autocomplete="off"><div class="wm-picklist" id="wm-ll"></div>', function (body) {
            const draw = function () {
                const q = $('wm-lq').value.trim().toLowerCase();
                const hits = list.filter((n) => !q || WF.titleOf(n).toLowerCase().includes(q)).slice(0, 40);
                $('wm-ll').innerHTML = hits.map((n) => '<button type="button" data-id="' + esc(n.id) + '">' + vi('file-text') + '<span>' + esc(WF.titleOf(n)) + '</span></button>').join('') + (q ? '<button type="button" data-new="1">' + vi('plus') + '<span>Make a new note called "' + esc($('wm-lq').value.trim()) + '"</span></button>' : '') || '<p class="wm-note">No other notes yet!</p>';
            };
            $('wm-lq').addEventListener('input', draw);
            body.addEventListener('click', function (e) {
                const b = e.target.closest('button[data-id], button[data-new]'); if (!b) return;
                let t;
                if (b.dataset.new) t = $('wm-lq').value.trim(); else { const n = WF.notes().find((x) => x.id === b.dataset.id); t = n && WF.titleOf(n); }
                if (!t) return;
                WF.closeDialog();
                if (WF.mode() === 'source') { WF.insertText(null, (sel) => '[[' + t + (sel && sel !== t ? '|' + sel : '') + ']] '); return; }
                WF.insertText(null, (sel) => { const n = findByTitle(t); return '[' + (sel || t) + '](#' + (n ? 'n=' + n.id : 'new=' + encodeURIComponent(t)) + ') '; });
            });
            draw(); setTimeout(() => $('wm-lq').focus(), 30);
        });
    }
    function insertMenu(anchor) {
        const now = new Date();
        WF.menu(anchor, [
            ['Link to a note…', linkPicker],
            '-',
            ['Today\'s date', () => WF.insertText(null, () => now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))],
            ['The time', () => WF.insertText(null, () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))],
            '-',
            ['Checklist', () => WF.insertText('- [ ] First thing\n- [ ] Second thing\n- [ ] Third thing')],
            ['Table of contents', () => WF.insertText('::toc 3 Contents')],
            ['Word count', () => WF.insertText('::wordcount')],
            ['Note box', () => WF.insertText('::note Good to know\nThe words go here.\n::end')],
            ['Warning box', () => WF.insertText('::warning Careful\nThe words go here.\n::end')],
            ['Badge…', badgeDialog],
            '-',
            ['Template…', () => templatesDialog(true)]
        ]);
    }
    function mountInsertButton() {
        const t = $('wf-tools'); if (!t || t.querySelector('[data-t="wm"]')) return;
        const b = document.createElement('button'); b.type = 'button'; b.dataset.t = 'wm'; b.className = 'wm-plus'; b.title = 'More to insert: links, date, table of contents, badges and more';
        b.innerHTML = vi('plus') + 'More';
        t.appendChild(b);
    }
    $('wf-tools').addEventListener('click', function (e) { const b = e.target.closest('[data-t="wm"]'); if (b) { e.stopPropagation(); insertMenu(b); } }, true);
    new MutationObserver(mountInsertButton).observe($('wf-tools'), { childList: true });

    /* ---------- little commands ---------- */
    function randomNote() { const ns = notes(); if (!ns.length) return; WF.readMode(); WF.openNote(ns[Math.floor(Math.random() * ns.length)]); }
    function oldNote() { const ns = notes().filter((n) => !n.scratch).sort((a, b) => a.updated - b.updated); if (!ns.length) return; WF.readMode(); WF.openNote(ns[0]); WF.toast('The note you have not touched for longest!'); }
    function copyText(t, msg) { try { navigator.clipboard.writeText(t).then(() => WF.toast(msg), () => WF.toast('The browser would not let me copy!')); } catch (e) { WF.toast('The browser would not let me copy!'); } }
    function commands() {
        const cur = WF.cur();
        const c = [
            ['New binder', '', () => binderDialog()], ['Templates: start a note from one', '', () => templatesDialog(false)], ['Tasks from every note', '', () => tasksDialog()], ['Calendar', '', calDialog],
            ['Your writing stats', '', statsDialog], ['Quick capture to the Inbox', 'Ctrl+Alt+Q', captureDialog], ['Daily word goal…', '', goalDialog],
            ['Focus timer: 25 minutes', '', () => startTimer(25)], ['Typewriter mode', '', toggleType], ['Open a random note', '', randomNote], ['Open the note you have not touched longest', '', oldNote]
        ];
        if (cur) c.push(
            ['History of this note', '', historyDialog], ['Find and replace in this note', '', findDialog], ['Save this note as a template', '', saveAsTemplate],
            ['Insert a link to another note', '', linkPicker], ['Insert a badge', '', badgeDialog], ['Copy a [[link]] to this note', '', () => copyText('[[' + WF.titleOf(cur) + ']]', 'Copied! Paste it into any note to link here!')],
            ['Copy this note as plain text', '', () => { WF.readMode(); copyText(WF.plain(cur.text), 'Copied the words of this note!'); }]
        );
        return c;
    }

    /* ---------- hooks the app calls ---------- */
    let backT = 0;
    function opened(n) {
        if (!n || n.scratch) { renderBack(); return; }
        const h = n.history, last = h && h[h.length - 1];
        if (!last || Date.now() - last.t > 60000) snap(n, true);
        if (lastWords[n.id] == null) lastWords[n.id] = WF.words(n.text);
        renderBack(); goalChip();
    }
    function changed(n, save) {
        if (!n || n.scratch) return;
        if (save) { snap(n, false); addWords(n, true); clearTimeout(backT); backT = setTimeout(renderBack, 900); }
    }

    /* ---------- the rail buttons and footer chips ---------- */
    function mountRail() {
        const rb = document.querySelector('.wf-railbtns'); if (!rb || $('wm-rail')) return;
        const row = document.createElement('div'); row.className = 'wf-railbtns wm-rail'; row.id = 'wm-rail';
        row.innerHTML = [['tasks', 'list-checks', 'Tasks', 'Every checkbox from every note'], ['cal', 'calendar-days', 'Calendar', 'Your journal by month'], ['tpl', 'layout-template', 'Templates', 'Start a note from a template'], ['stats', 'chart-column', 'Writing', 'Streaks and words per day']].map((b) => '<button type="button" class="wf-ghost" data-wm="' + b[0] + '" title="' + b[3] + '">' + vi(b[1]) + b[2] + '</button>').join('');
        rb.parentNode.insertBefore(row, rb);
        row.addEventListener('click', function (e) {
            const b = e.target.closest('[data-wm]'); if (!b) return;
            ({ tasks: () => tasksDialog(), cal: calDialog, tpl: () => templatesDialog(false), stats: statsDialog })[b.dataset.wm]();
        });
    }
    function mountFoot() {
        const foot = document.querySelector('.wf-foot'); if (!foot || $('wm-goal')) return;
        const when = $('wf-when');
        const goal = document.createElement('button'); goal.type = 'button'; goal.id = 'wm-goal'; goal.className = 'wm-chip'; goal.hidden = true;
        const tm = document.createElement('button'); tm.type = 'button'; tm.id = 'wm-timer'; tm.className = 'wm-chip'; tm.hidden = true;
        const start = document.createElement('button'); start.type = 'button'; start.className = 'wm-chip wm-quiet'; start.id = 'wm-timerbtn'; start.title = 'Focus timer'; start.innerHTML = vi('timer') + '<span>Focus</span>';
        [start, tm, goal].forEach((x) => foot.insertBefore(x, when));
        goal.addEventListener('click', goalDialog); tm.addEventListener('click', () => timerMenu(tm)); start.addEventListener('click', () => timerMenu(start));
        goalChip(); timerChip();
    }

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'q') { e.preventDefault(); captureDialog(); }
    });

    /* ---------- binders: colored clear folders that hold notebooks ---------- */
    const BINDER_COLORS = [['Red', '#e5484d'], ['Orange', '#f76b15'], ['Yellow', '#f5b800'], ['Green', '#2fb560'], ['Teal', '#14b8a6'], ['Blue', '#1b7fe0'], ['Purple', '#7c4dff'], ['Pink', '#ec4899'], ['Gray', '#64748b'],
        ['Maroon', '#9f1239'], ['Coral', '#ff6b57'], ['Gold', '#d4a017'], ['Lime', '#84cc16'], ['Sky', '#0ea5e9'], ['Indigo', '#4f46e5'], ['Brown', '#92643a']];
    const PASTEL_COLORS = [['Pastel rose', '#ffc2cf'], ['Pastel peach', '#ffd3b6'], ['Pastel apricot', '#ffe0a8'], ['Pastel butter', '#fff3a6'], ['Pastel lemon', '#eef7a0'], ['Pastel mint', '#bff0cf'], ['Pastel sage', '#cfe5c1'], ['Pastel seafoam', '#b6efe1'],
        ['Pastel aqua', '#b4ecf2'], ['Pastel sky', '#bfe0ff'], ['Pastel periwinkle', '#c7cdff'], ['Pastel lavender', '#dcc8ff'], ['Pastel lilac', '#eac4f6'], ['Pastel blush', '#ffc8e8'], ['Pastel cloud', '#dfe6ee'], ['Pastel sand', '#f0e0c8']];
    // light colors get dark words on the tab and a darker edge so the folder still shows up
    function binderTone(hex) {
        const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return { ink: '#fff', edge: hex || '#e5484d' };
        const v = [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16)), lum = (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255;
        const light = lum > 0.7, k = light ? 0.72 : 1;
        return { ink: light ? '#16324a' : '#fff', edge: '#' + v.map((c) => Math.round(c * k).toString(16).padStart(2, '0')).join(''), light: light };
    }
    const BINDER_STYLES = [['clear', 'Clear plastic'], ['solid', 'Solid'], ['frosted', 'Frosted'], ['glossy', 'Glossy'], ['manila', 'Manila'], ['leather', 'Leather'], ['ring', 'Ring binder'], ['neon', 'Neon']];
    const PAPER = '#9ad8ee';
    const binders = () => { try { return JSON.parse(LS('waterflow2_binders') || '[]') || []; } catch (e) { return []; } };
    const saveBinders = (a) => LS('waterflow2_binders', JSON.stringify(a));
    const binderById = (id) => binders().find((b) => b.id === id) || null;
    const inBinder = (n, id) => { const nb = WF.nbs().find((x) => x.id === n.nb); return !!nb && nb.binder === id; };
    function nbsOf(id) { return WF.nbs().filter((x) => x.binder === id); }
    // the three papers you see inside: the most recently used notebooks (in their own color), then the latest notes
    function paperItems(nbList) {
        const stamp = (nb) => notes().filter((n) => n.nb === nb.id).reduce((a, n) => Math.max(a, n.updated || 0), 0);
        const sorted = nbList.slice().sort((a, b) => stamp(b) - stamp(a));
        const items = sorted.slice(0, 3).map((nb) => ({ label: nb.name, color: nb.color || PAPER }));
        if (items.length < 3) {
            const ids = new Set(nbList.map((x) => x.id));
            notes().filter((n) => ids.has(n.nb)).sort((a, b) => b.updated - a.updated).slice(0, 3 - items.length).forEach((n) => {
                const nb = nbList.find((x) => x.id === n.nb);
                items.push({ label: WF.titleOf(n), color: n.color || (nb && nb.color) || PAPER, note: true });
            });
        }
        return items;
    }
    // one clear plastic folder: a tinted back with a label tab, papers peeking out, a see-through front over them
    function folderHtml(name, color, items, sub, cls, style) {
        const rot = ['-0.8deg', '0.7deg', '-0.9deg'], left = ['9%', '5%', '2%'], top = [35, 23, 11];
        const papers = items.slice(0, 3).reverse().map(function (it, ri) {
            const i = items.slice(0, 3).length - 1 - ri;   // the first item is the front-most paper
            return '<b class="wm-paper' + (it.note ? ' note' : '') + '" style="--pc:' + it.color + ';left:' + left[i] + ';top:' + top[i] + 'px;transform:rotate(' + rot[i] + ')"><i></i><span>' + esc(it.label) + '</span></b>';
        }).join('');
        const tone = binderTone(color);
        return '<span class="wm-bind wm-st-' + (BINDER_STYLES.some((x) => x[0] === style) ? style : 'clear') + ' ' + (cls || '') + (tone.light ? ' light' : '') + '" style="--bc:' + color + ';--bd:' + tone.edge + ';--bi:' + tone.ink + '"><span class="wm-bk"><em class="wm-tab"><span>' + esc(name) + '</span></em></span>'
            + '<span class="wm-papers">' + papers + '</span><span class="wm-fr"></span><span class="wm-rings"><i></i><i></i><i></i></span>'
            + '<span class="wm-foot"><small>' + esc(sub) + '</small></span></span>';
    }
    function subOf(b) {
        const list = nbsOf(b.id), ids = new Set(list.map((x) => x.id)), count = notes().filter((n) => ids.has(n.nb)).length;
        return list.length ? plural(list.length, 'notebook') + ', ' + plural(count, 'note') : 'Empty: add notebooks';
    }
    function railBinders() {
        const box = $('wm-binders'); if (!box) return;
        const st = WF.stream(), bs = binders();
        box.innerHTML = bs.length ? bs.map((b) => '<button type="button" class="wm-bbtn' + (st.kind === 'binder' && st.id === b.id ? ' on' : '') + '" data-id="' + esc(b.id) + '" title="Open ' + esc(b.name) + ' (right click to change it)">' + folderHtml(b.name, b.color, paperItems(nbsOf(b.id)), subOf(b), '', b.style) + '</button>').join('')
            : '<p class="wm-note wm-none">Binders hold notebooks together. Press + to make one!</p>';
    }
    function mountBinders() {
        if ($('wm-binders')) return;
        const nbsec = $('wf-addnb') && $('wf-addnb').closest('.wf-sect'); if (!nbsec) return;
        nbsec.insertAdjacentHTML('beforebegin', '<div class="wf-sect"><span>Binders</span><button type="button" class="wf-mini" id="wm-addbinder" title="New binder">' + vi('plus') + '</button></div><div class="wm-binders" id="wm-binders"></div>');
        $('wm-addbinder').addEventListener('click', () => binderDialog());
        $('wm-binders').addEventListener('click', function (e) {
            const b = e.target.closest('.wm-bbtn'); if (!b) return;
            WF.readMode(); WF.setStream({ kind: 'binder', id: b.dataset.id }); document.body.dataset.rail = '';
        });
        $('wm-binders').addEventListener('contextmenu', function (e) { const b = e.target.closest('.wm-bbtn'); if (b) { e.preventDefault(); binderDialog(b.dataset.id); } });
    }
    function binderDialog(id) {
        const all = binders(), old = id ? all.find((b) => b.id === id) : null;
        if (id && !old) return;
        const draft = { name: old ? old.name : 'New binder', color: old ? old.color : BINDER_COLORS[0][1], style: old && old.style ? old.style : 'clear', nbs: old ? nbsOf(id).map((x) => x.id) : [] };
        const nbList = WF.nbs();
        const html = '<div class="wm-bprev" id="wm-bprev"></div>'
            + '<label class="wm-field"><span>Label (the name on the tab)</span><input type="text" id="wm-bname" maxlength="28"></label>'
            + '<div class="wm-field"><span>Style</span><div class="wm-bstyles" id="wm-bstyles">' + BINDER_STYLES.map((x) => '<button type="button" data-s="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>'
            + '<div class="wm-field"><span>Folder color</span><div class="wm-bcols" id="wm-bcols">' + BINDER_COLORS.map((c) => '<button type="button" data-c="' + c[1] + '" title="' + c[0] + '" style="--bc:' + c[1] + '"></button>').join('') + '</div></div>'
            + '<div class="wm-field"><span>Pastel colors</span><div class="wm-bcols" id="wm-bpastel">' + PASTEL_COLORS.map((c) => '<button type="button" data-c="' + c[1] + '" title="' + c[0] + '" style="--bc:' + c[1] + '"></button>').join('') + '</div></div>'
            + '<div class="wm-field"><span>Notebooks inside</span>' + (nbList.length ? '<div class="wm-bnbs" id="wm-bnbs">' + nbList.map((nb) => '<label class="wm-check"><input type="checkbox" value="' + esc(nb.id) + '"><i style="background:' + (nb.color || PAPER) + '"></i><span>' + esc(nb.name) + '</span>' + (nb.binder && nb.binder !== id && binderById(nb.binder) ? '<small>now in ' + esc(binderById(nb.binder).name) + '</small>' : '') + '</label>').join('') + '</div>' : '<p class="wm-note">You have no notebooks yet. Make one with the + next to Notebooks, then come back!</p>') + '</div>'
            + '<div class="wm-bbar"><button type="button" class="wf-gel" id="wm-bsave">' + vi('check') + (old ? 'Save binder' : 'Make binder') + '</button>' + (old ? '<button type="button" class="wf-gel wf-red" id="wm-bdel">' + vi('trash') + 'Delete binder</button>' : '') + '</div>';
        WF.dialog(old ? 'Binder' : 'New binder', html, function (body) {
            $('wm-bname').value = draft.name;
            body.querySelectorAll('#wm-bnbs input').forEach((c) => { c.checked = draft.nbs.includes(c.value); });
            const draw = function () {
                const list = nbList.filter((nb) => draft.nbs.includes(nb.id));
                $('wm-bprev').innerHTML = folderHtml(draft.name || 'Binder', draft.color, paperItems(list), list.length ? plural(list.length, 'notebook') : 'Empty', 'big', draft.style);
                body.querySelectorAll('#wm-bstyles button').forEach((b) => b.classList.toggle('on', b.dataset.s === draft.style));
                body.querySelectorAll('#wm-bcols button, #wm-bpastel button').forEach((b) => b.classList.toggle('on', b.dataset.c === draft.color));
            };
            $('wm-bstyles').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { draft.style = b.dataset.s; draw(); } });
            $('wm-bname').addEventListener('input', () => { draft.name = $('wm-bname').value.trim(); draw(); });
            ['wm-bcols', 'wm-bpastel'].forEach((id) => $(id).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { draft.color = b.dataset.c; draw(); } }));
            const nbs = $('wm-bnbs'); if (nbs) nbs.addEventListener('change', () => { draft.nbs = Array.from(nbs.querySelectorAll('input:checked')).map((c) => c.value); draw(); });
            $('wm-bsave').addEventListener('click', function () {
                const name = ($('wm-bname').value.trim() || 'Binder').slice(0, 28);
                const list = binders(); let b = id ? list.find((x) => x.id === id) : null;
                if (!b) { b = { id: WF.uid() }; list.push(b); }
                b.name = name; b.color = draft.color; b.style = draft.style; saveBinders(list);
                nbList.forEach((nb) => { if (draft.nbs.includes(nb.id)) nb.binder = b.id; else if (nb.binder === b.id) delete nb.binder; });
                WF.saveNbs(); WF.closeDialog(); WF.renderAll(); WF.toast(id ? 'Binder saved!' : 'Binder made! Click it to open everything inside!');
            });
            if ($('wm-bdel')) $('wm-bdel').addEventListener('click', function () {
                if (!confirm('Delete the binder "' + old.name + '"? Its notebooks and notes stay, they just leave the binder.')) return;
                saveBinders(binders().filter((x) => x.id !== id)); nbList.forEach((nb) => { if (nb.binder === id) delete nb.binder; }); WF.saveNbs();
                const st = WF.stream(); WF.closeDialog();
                if (st.kind === 'binder' && st.id === id) WF.setStream({ kind: 'all' }); else WF.renderAll();
                WF.toast('Binder deleted!');
            });
            draw(); setTimeout(() => $('wm-bname').select(), 30);
        });
    }

    window.WaterflowMore = { wikiOut: wikiOut, wikiIn: wikiIn, snap: snap, opened: opened, changed: changed, commands: commands, backlinks: backlinks, inBinder: inBinder, binderName: (id) => { const b = binderById(id); return b ? b.name : ''; }, binderDialog: binderDialog, rail: railBinders, tasks: allTasks, templates: templatesDialog, calendar: calDialog, stats: statsDialog, history: historyDialog };
    mountBinders(); railBinders(); mountBack(); mountRail(); mountFoot(); mountInsertButton(); applyType();
})();
