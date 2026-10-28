// Hexa! A month calendar with an agenda, plus Kanban boards whose due cards show up on the
// calendar. Plain JavaScript, no build step!
// Everything lives in one state object as plain data, and becomes JSON only at the edges
// (localStorage, .kh / .ics files and live collaboration)!
(function () {
    'use strict';

    const STORAGE_KEY = 'hexa-calendar-v1';
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Gel Bubble Remix Pack: thirty rainbow shades, one per id, stable forever!
    const SHADES = ['red', 'coral', 'orange', 'amber', 'gold', 'yellow', 'cream', 'lime', 'olive', 'green', 'emerald', 'mint', 'teal', 'turquoise',
        'cyan', 'sky', 'blue', 'navy', 'indigo', 'violet', 'purple', 'lavender', 'fuchsia', 'pink', 'rose', 'brown', 'white', 'fog', 'slate', 'black'];
    const isShade = (s) => SHADES.includes(s);

    const state = {
        events: [], boards: [], activeBoard: null, view: 'calendar',
        year: 2026, month: 0, selected: null,
        editingEvent: null, editingCard: null,
        pendingColor: '', pendingCardColor: '', colorTarget: 'event', popupBuilt: false,
    };

    // The ribbon and live collaboration hook in here instead of wrapping functions!
    const renderHooks = [];
    const boardsHooks = [];
    const persistHooks = [];
    const viewHooks = [];

    const $ = (id) => document.getElementById(id);
    const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
    const str = (x) => (x === undefined || x === null ? '' : String(x));

    function clickSound(frequency = 600, duration = 0.08) {
        try {
            const C = window.AudioContext || window.webkitAudioContext;
            const ctx = window.hexaAudioCtx || (window.hexaAudioCtx = new C());
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const now = ctx.currentTime;
            if (ctx.state === 'suspended') ctx.resume();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(now + duration);
        } catch (e) { /* no sound, no problem */ }
    }

    // ---------- Dates ----------
    const pad2 = (n) => String(n).padStart(2, '0');
    const dateStr = (y, m, d) => y + '-' + pad2(m + 1) + '-' + pad2(d);
    const jsDateStr = (d) => dateStr(d.getFullYear(), d.getMonth(), d.getDate());
    const todayStr = () => jsDateStr(new Date());

    function parseDate(s) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
        return m ? { y: parseInt(m[1], 10), m: parseInt(m[2], 10) - 1, d: parseInt(m[3], 10) } : null;
    }

    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

    // Sunday-start month grid: 6 rows x 7 days, dimmed outer days included!
    function monthGrid(y, m) {
        const firstDow = new Date(y, m, 1).getDay();
        const prevDays = daysInMonth(y, m - 1);
        const cells = [];
        for (let i = firstDow - 1; i >= 0; i--) cells.push({ date: jsDateStr(new Date(y, m - 1, prevDays - i)), inMonth: false });
        for (let d = 1; d <= daysInMonth(y, m); d++) cells.push({ date: dateStr(y, m, d), inMonth: true });
        const total = Math.max(42, 7 * Math.ceil(cells.length / 7));
        for (let n = 1, extra = total - cells.length; n <= extra; n++) cells.push({ date: jsDateStr(new Date(y, m + 1, n)), inMonth: false });
        const weeks = [];
        for (let i = 0; i + 7 <= cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
        return weeks;
    }

    const makeId = () => 'hx_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

    const esc = (s) => str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    // The same stable shade for an id, so colors never change!
    function bubbleClass(id) {
        let h = 0;
        for (const ch of str(id)) h = (h * 31 + ch.charCodeAt(0)) % 4294967296;
        return 'mkt-bubble-' + SHADES[h % SHADES.length];
    }
    const eventBubble = (ev) => (isShade(ev.color) ? 'mkt-bubble-' + ev.color : bubbleClass(ev.id));
    const cardBubble = eventBubble;

    // ---------- Reading the state ----------
    const events = () => state.events;
    const boards = () => state.boards;
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

    function eventsOn(date) {
        return events().filter((e) => e.date === date).sort((a, b) => cmp(a.time || '99', b.time || '99'));
    }

    function cardsDueOn(date) {
        const out = [];
        boards().forEach((b) => b.columns.forEach((col) => col.cards.forEach((card) => {
            if (card.due === date) out.push({ board: b, col: col, card: card });
        })));
        return out;
    }

    function findCard(boardId, cardId) {
        for (const b of boards()) {
            if (b.id !== boardId) continue;
            for (const col of b.columns) for (const card of col.cards) if (card.id === cardId) return { board: b, col: col, card: card };
        }
        return null;
    }

    const overdue = (d) => cmp(d, todayStr()) < 0;

    function validCard(c) {
        if (!isObj(c) || typeof c.title !== 'string') return false;
        const due = c.due === undefined || c.due === null || c.due === false ? '' : c.due;
        return typeof due === 'string' && (due === '' || !!parseDate(due));
    }

    function validBoard(b) {
        return isObj(b) && typeof b.name === 'string' && typeof b.id === 'string'
            && Array.isArray(b.columns) && b.columns.length > 0
            && b.columns.every((col) => isObj(col) && typeof col.name === 'string' && Array.isArray(col.cards)
                && col.cards.every((k) => validCard(k) && typeof k.id === 'string'));
    }

    const fixColor = (x) => (isShade(x.color) ? x : Object.assign({}, x, { color: '' }));

    const cleanEvents = (list) => list.filter((e) => isObj(e) && typeof e.title === 'string' && parseDate(e.date)).map(fixColor);

    const cleanBoards = (list) => list.filter(validBoard)
        .map((b) => Object.assign({}, b, { columns: b.columns.map((c) => Object.assign({}, c, { cards: c.cards.map(fixColor) })) }));

    const freshBoard = (name) => ({
        id: makeId(), name: name,
        columns: [{ id: makeId(), name: 'To Do', cards: [] }, { id: makeId(), name: 'Doing', cards: [] }, { id: makeId(), name: 'Done', cards: [] }],
    });

    function ensureBoards() {
        const bs = cleanBoards(state.boards || []);
        if (bs.length) {
            state.boards = bs;
        } else {
            const b = freshBoard('Tasks');
            state.boards = [b];
            state.activeBoard = b.id;
        }
        if (!state.boards.some((b) => b.id === state.activeBoard)) state.activeBoard = state.boards[0].id;
    }

    function activeBoard() {
        ensureBoards();
        return state.boards.find((b) => b.id === state.activeBoard) || state.boards[0];
    }

    // ---------- Saving ----------
    const saveJson = () => ({ events: events(), boards: boards(), activeBoardId: state.activeBoard });

    function persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saveJson())); } catch (e) { /* storage full or blocked */ }
        persistHooks.forEach((f) => f());
    }

    function restore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const doc = JSON.parse(raw);
            if (Array.isArray(doc.events)) state.events = cleanEvents(doc.events);
            if (Array.isArray(doc.boards)) {
                state.boards = cleanBoards(doc.boards);
                if (typeof doc.activeBoardId === 'string') state.activeBoard = doc.activeBoardId;
            }
        } catch (e) { /* a broken save just means a fresh calendar */ }
    }

    // ---------- Drawing the calendar ----------
    function dayCell(cell) {
        const date = cell.date;
        const evs = eventsOn(date);
        const due = cardsDueOn(date);
        const shown = evs.slice(0, 3);
        const total = evs.length + due.length;
        const cls = ['day-cell'];
        if (!cell.inMonth) cls.push('dim');
        if (date === todayStr()) cls.push('today');
        if (date === state.selected) cls.push('selected');
        return '<div class="' + cls.join(' ') + '" onclick="pickDay(\'' + date + '\')">'
            + '<div class="day-number">' + parseInt(date.substring(8, 10), 10) + '</div>'
            + shown.map((ev) => '<div class="event-chip ' + eventBubble(ev) + '">' + esc(ev.time ? ev.time + ' ' : '') + esc(ev.title || 'Untitled') + '</div>').join('')
            + due.slice(0, Math.max(0, 3 - shown.length)).map(({ card }) => '<div class="event-chip ' + cardBubble(card) + '">📌 ' + esc(card.title) + '</div>').join('')
            + (total > 3 ? '<div class="more-chip">+' + (total - 3) + ' more</div>' : '')
            + '</div>';
    }

    function render() {
        const { year, month, selected } = state;
        $('month-title-text').innerText = MONTHS[month] + ' ' + year;
        $('event-count').innerText = events().length + ' Events';
        $('hexa-grid').innerHTML = monthGrid(year, month).map((week) => week.map(dayCell).join('')).join('');
        const evs = eventsOn(selected);
        const due = cardsDueOn(selected);
        $('agenda-date').innerText = 'Agenda — ' + selected;
        $('agenda-list').innerHTML = !evs.length && !due.length
            ? '<div style="color:#99f6e4;">No events! Press Add Event to create one!</div>'
            : evs.map((ev) => '<div class="agenda-item"><span>' + esc(ev.time || 'all-day') + ' — ' + esc(ev.title || 'Untitled') + '</span>'
                + '<button onclick="editEvent(\'' + ev.id + '\')" title="Edit!">✏️</button>'
                + '<button onclick="askDeleteEvent(\'' + ev.id + '\')" title="Delete!">🗑️</button></div>').join('')
            + due.map(({ board, col, card }) => '<div class="agenda-item"><span>📌 ' + esc(card.title) + ' <small>(' + esc(board.name) + ' / ' + esc(col.name) + ')</small></span>'
                + '<button onclick="editCard(\'' + board.id + '\', \'' + col.id + '\', \'' + card.id + '\')" title="Edit!">✏️</button></div>').join('');
        renderHooks.forEach((f) => f());
    }

    // ---------- Events ----------
    function addEvent(ev) {
        const rec = Object.assign({ id: makeId(), title: '', date: todayStr(), time: '', desc: '' }, ev);
        if (!parseDate(rec.date)) return null;
        state.events = events().concat([rec]);
        persist(); render();
        return rec;
    }

    function updateEvent(id, patch) {
        const cur = events().find((e) => e.id === id);
        const next = cur ? Object.assign({}, cur, patch) : null;
        if (!next || !parseDate(next.date)) return null;
        state.events = events().map((e) => (e.id === id ? next : e));
        persist(); render();
        return true;
    }

    function deleteEvent(id) {
        state.events = events().filter((e) => e.id !== id);
        persist(); render();
    }

    function clearCalendar() {
        state.events = [];
        persist(); render();
    }

    // ---------- The shared color popup (events and cards) ----------
    function paintColorButton() {
        const card = state.colorTarget === 'card';
        const btn = $(card ? 'card-color-btn' : 'event-color-btn');
        const v = card ? state.pendingCardColor : state.pendingColor;
        if (!btn) return;
        btn.className = 'event-chip ' + (isShade(v) ? 'mkt-bubble-' + v : 'mkt-bubble-slate');
        btn.textContent = isShade(v) ? v : 'auto';
    }

    function wireColorPopup() {
        const popup = $('event-color-popup');
        if (!popup || state.popupBuilt) return;
        state.popupBuilt = true;
        SHADES.forEach((shade) => {
            const sw = document.createElement('button');
            sw.type = 'button';
            sw.className = 'event-chip mkt-bubble-' + shade;
            sw.textContent = shade[0].toUpperCase();
            sw.title = shade;
            sw.onclick = () => pickEventColor(shade);
            popup.appendChild(sw);
        });
        // BOTH pickers share this one popup: a click on EITHER button keeps it open!
        document.addEventListener('click', (e) => {
            const pop = $('event-color-popup');
            const inside = (id) => $(id) && $(id).contains(e.target);
            if (pop && pop.style.display !== 'none' && !pop.contains(e.target) && !inside('event-color-btn') && !inside('card-color-btn')) {
                pop.style.display = 'none';
            }
        });
    }

    function toggleColorPopup(which) {
        clickSound(500, 0.05);
        state.colorTarget = which === 'card' ? 'card' : 'event';
        wireColorPopup();
        const popup = $('event-color-popup');
        if (popup) {
            const d = popup.style.display;
            popup.style.display = d === 'none' || d === '' ? 'flex' : 'none';
        }
    }

    function pickEventColor(shade) {
        clickSound(600, 0.06);
        const v = isShade(shade) ? shade : '';
        if (state.colorTarget === 'card') state.pendingCardColor = v; else state.pendingColor = v;
        paintColorButton();
        $('event-color-popup').style.display = 'none';
    }

    // ---------- .ics ----------
    const escapeIcs = (s) => str(s).split('\\').join('\\\\').split(';').join('\\;').split(',').join('\\,').split('\n').join('\\n');
    const unescapeIcs = (s) => str(s).split('\\n').join('\n').split('\\,').join(',').split('\\;').join(';').split('\\\\').join('\\');

    const icsStamp = (d) => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T'
        + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';

    function eventToIcs(ev) {
        const flat = ev.date.split('-').join('');
        const lines = ['BEGIN:VEVENT', 'UID:' + ev.id + '@hexa', 'DTSTAMP:' + icsStamp(new Date()),
            /^\d{2}:\d{2}$/.test(str(ev.time)) ? 'DTSTART:' + flat + 'T' + ev.time.split(':').join('') + '00' : 'DTSTART;VALUE=DATE:' + flat,
            'SUMMARY:' + escapeIcs(ev.title)];
        if (ev.desc) lines.push('DESCRIPTION:' + escapeIcs(ev.desc));
        if (isShade(ev.color)) lines.push('X-HEXA-COLOR:' + ev.color);
        lines.push('END:VEVENT');
        return lines;
    }

    function icsContent(list) {
        return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Radii Office//Hexa//EN']
            .concat(...list.map(eventToIcs), ['END:VCALENDAR']).join('\r\n');
    }

    // Basic VEVENT import: UID/SUMMARY/DESCRIPTION/DTSTART (DATE or floating DATETIME)!
    function parseIcs(text) {
        const unfolded = str(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
        const seen = new Set(events().map((e) => e.id));
        const out = [];
        let cur = null;
        unfolded.split(/\r?\n/).map((l) => l.trim()).forEach((line) => {
            let m;
            if (line === 'BEGIN:VEVENT') {
                cur = { id: '', title: '', date: '', time: '', desc: '' };
            } else if (line === 'END:VEVENT') {
                // a UID we already have is skipped, so re-imports stay idempotent!
                if (cur && parseDate(cur.date) && !(cur.id && seen.has(cur.id))) {
                    if (!cur.id) cur.id = makeId();
                    seen.add(cur.id);
                    out.push(cur);
                }
                cur = null;
            } else if (cur) {
                if ((m = /^UID:(.*)$/.exec(line))) cur.id = m[1].replace(/@hexa$/, '');
                else if ((m = /^X-HEXA-COLOR:(.*)$/.exec(line))) { if (isShade(m[1])) cur.color = m[1]; }
                else if ((m = /^SUMMARY:(.*)$/.exec(line))) cur.title = unescapeIcs(m[1]);
                else if ((m = /^DESCRIPTION:(.*)$/.exec(line))) cur.desc = unescapeIcs(m[1]);
                else if ((m = /^DTSTART(?:;[^:]*)?:(\d{8})(?:T(\d{4})(\d{2})?)?$/.exec(line))) {
                    cur.date = m[1].substring(0, 4) + '-' + m[1].substring(4, 6) + '-' + m[1].substring(6, 8);
                    if (m[2]) cur.time = m[2].substring(0, 2) + ':' + m[2].substring(2, 4);
                }
            }
        });
        return out;
    }

    // ---------- Moving around the calendar ----------
    function shiftMonth(dir) {
        clickSound(600, 0.06);
        const m = state.month + dir;
        if (m < 0) { state.month = 11; state.year -= 1; }
        else if (m > 11) { state.month = 0; state.year += 1; }
        else state.month = m;
        render();
    }

    function goToday() {
        clickSound(650, 0.08);
        const t = new Date();
        state.year = t.getFullYear(); state.month = t.getMonth(); state.selected = todayStr();
        render();
    }

    function pickDay(date) {
        clickSound(550, 0.06);
        state.selected = date;
        const p = parseDate(date);
        if (p) { state.year = p.y; state.month = p.m; }
        render();
    }

    // ---------- The event window ----------
    function openEventModal(ev) {
        ev = isObj(ev) && !(ev instanceof Event) ? ev : null;
        state.editingEvent = ev ? ev.id : null;
        state.pendingColor = ev && isShade(ev.color) ? ev.color : '';
        state.colorTarget = 'event';
        $('modal-title-text').innerText = ev ? 'Edit Event' : 'Add Event';
        $('event-title').value = (ev && ev.title) || '';
        $('event-date').value = (ev && ev.date) || state.selected;
        $('event-time').value = (ev && ev.time) || '';
        $('event-desc').value = (ev && ev.desc) || '';
        paintColorButton();
        const popup = $('event-color-popup');
        if (popup) popup.style.display = 'none';
        $('event-modal').style.display = 'flex';
    }

    function closeEventModal() { $('event-modal').style.display = 'none'; }

    function saveEvent() {
        const patch = {
            title: $('event-title').value, date: $('event-date').value,
            time: $('event-time').value, desc: $('event-desc').value,
            color: isShade(state.pendingColor) ? state.pendingColor : '',
        };
        if (!patch.title.trim() || !parseDate(patch.date)) {
            alert('Give the event a title and a valid date!');
            return;
        }
        clickSound(700, 0.08);
        if (state.editingEvent) updateEvent(state.editingEvent, patch); else addEvent(patch);
        state.selected = patch.date;
        closeEventModal();
        render();
    }

    function editEvent(id) { const rec = events().find((e) => e.id === id); if (rec) openEventModal(rec); }
    function askDeleteEvent(id) { clickSound(400, 0.08); deleteEvent(id); }
    function askClearCalendar() {
        clickSound(350, 0.12);
        if (confirm('Delete ALL events?')) clearCalendar();
    }

    // ---------- Boards ----------
    function setViewMode(mode) {
        clickSound(550, 0.08);
        const v = mode === 'boards' ? 'boards' : 'calendar';
        state.view = v;
        $('calendar-view').style.display = v === 'calendar' ? 'flex' : 'none';
        $('boards-view').style.display = v === 'boards' ? 'flex' : 'none';
        $('view-calendar-btn').classList.toggle('active', v === 'calendar');
        $('view-boards-btn').classList.toggle('active', v === 'boards');
        if (v === 'boards') renderBoards(); else render();
        viewHooks.forEach((f) => f());
    }

    function redraw() { if (state.view === 'boards') renderBoards(); else render(); }

    function updateBoard(boardId, f) {
        state.boards = boards().map((b) => (b.id === boardId ? f(b) : b));
    }

    // f gets each column and returns it changed
    function updateCards(boardId, f) {
        updateBoard(boardId, (b) => Object.assign({}, b, { columns: b.columns.map(f) }));
    }

    function addBoard(name) {
        const clean = str(name).trim();
        if (!clean) return null;
        clickSound(700, 0.08);
        const b = freshBoard(clean.substring(0, 60));
        state.boards = boards().concat([b]);
        state.activeBoard = b.id;
        persist(); renderBoards();
        return b;
    }

    function deleteBoard(id) {
        if (boards().length <= 1) return null;
        const bs = boards().filter((b) => b.id !== id);
        state.boards = bs;
        if (state.activeBoard === id) state.activeBoard = bs[0] ? bs[0].id : null;
        persist(); renderBoards();
        return true;
    }

    function switchBoard(id) {
        clickSound(550, 0.06);
        if (boards().some((b) => b.id === id)) state.activeBoard = id;
        renderBoards();
    }

    function addColumn(boardId, name) {
        const clean = str(name).trim();
        if (!clean || !boards().some((b) => b.id === boardId)) return null;
        clickSound(650, 0.08);
        const col = { id: makeId(), name: clean.substring(0, 40), cards: [] };
        updateBoard(boardId, (b) => Object.assign({}, b, { columns: b.columns.concat([col]) }));
        persist(); renderBoards();
        return col;
    }

    function deleteColumn(boardId, colId) {
        const b = boards().find((x) => x.id === boardId);
        if (!b || b.columns.length <= 1 || !b.columns.some((c) => c.id === colId)) return null;
        updateBoard(boardId, (bd) => {
            const gone = bd.columns.find((c) => c.id === colId);
            const cols = bd.columns.filter((c) => c.id !== colId);
            // its cards move to the first column
            cols[0] = Object.assign({}, cols[0], { cards: cols[0].cards.concat(gone.cards) });
            return Object.assign({}, bd, { columns: cols });
        });
        persist(); renderBoards();
        return true;
    }

    function addCard(boardId, colId, fields) {
        const title = str(fields.title).trim();
        const due = fields.due || '';
        const b = boards().find((x) => x.id === boardId);
        if (!b || !b.columns.some((c) => c.id === colId) || !title || !(due === '' || parseDate(due))) return null;
        const card = {
            id: makeId(), title: title.substring(0, 120), due: due,
            desc: str(fields.desc).substring(0, 2000), color: isShade(fields.color) ? fields.color : '',
        };
        updateCards(boardId, (c) => (c.id === colId ? Object.assign({}, c, { cards: c.cards.concat([card]) }) : c));
        persist(); redraw();
        return card;
    }

    function updateCard(boardId, cardId, fields) {
        if (!findCard(boardId, cardId)) return null;
        const has = (v) => v !== undefined && v !== null;
        const title = has(fields.title) ? String(fields.title).trim() : null;
        const due = fields.due;
        if (title === '' || !(!has(due) || due === '' || parseDate(due))) return null;
        updateCards(boardId, (col) => Object.assign({}, col, {
            cards: col.cards.map((k) => {
                if (k.id !== cardId) return k;
                const n = Object.assign({}, k);
                if (title) n.title = title.substring(0, 120);
                if (has(due)) n.due = due;
                if (has(fields.desc)) n.desc = String(fields.desc).substring(0, 2000);
                if (has(fields.color)) n.color = isShade(fields.color) ? fields.color : '';
                return n;
            }),
        }));
        persist(); redraw();
        return true;
    }

    function deleteCard(boardId, cardId) {
        if (!findCard(boardId, cardId)) return null;
        updateCards(boardId, (col) => Object.assign({}, col, { cards: col.cards.filter((k) => k.id !== cardId) }));
        persist(); redraw();
        return true;
    }

    function moveCard(boardId, cardId, toColId) {
        const found = findCard(boardId, cardId);
        if (!found || !found.board.columns.some((c) => c.id === toColId)) return null;
        if (found.col.id !== toColId) {
            updateCards(boardId, (c) => {
                if (c.id === found.col.id) return Object.assign({}, c, { cards: c.cards.filter((k) => k.id !== cardId) });
                if (c.id === toColId) return Object.assign({}, c, { cards: c.cards.concat([found.card]) });
                return c;
            });
            persist();
            if (state.view === 'boards') renderBoards();
        }
        return true;
    }

    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }

    function renderBoards() {
        ensureBoards();
        const board = activeBoard();
        const wrap = $('board-columns');
        $('board-select').innerHTML = boards().map((b) => '<option value="' + b.id + '"' + (b.id === board.id ? ' selected' : '') + '>' + esc(b.name) + '</option>').join('');
        $('board-count').innerText = board.columns.reduce((n, c) => n + c.cards.length, 0) + ' Cards';
        wrap.innerHTML = '';
        board.columns.forEach((col) => {
            const colDiv = el('div', 'board-column');
            const head = el('div', 'column-head', col.name + ' (' + col.cards.length + ')');
            const delCol = el('button', null, '✕');
            const add = el('button', 'kanban-add', '＋ Add card');
            colDiv.ondragover = (e) => e.preventDefault();
            colDiv.ondrop = (e) => {
                e.preventDefault();
                try {
                    const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (payload && payload.cardId) {
                        clickSound(600, 0.06);
                        moveCard(board.id, payload.cardId, col.id);
                    }
                } catch (err) { /* not a card */ }
            };
            delCol.title = 'Delete column!';
            delCol.onclick = () => { clickSound(400, 0.08); deleteColumn(board.id, col.id); };
            head.appendChild(delCol);
            colDiv.appendChild(head);
            col.cards.forEach((card) => {
                const late = !!card.due && overdue(card.due);
                const c = el('div', 'kanban-card' + (late ? ' overdue' : ''));
                const title = el('div', null, card.title);
                c.draggable = true;
                c.ondragstart = (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ boardId: board.id, cardId: card.id }));
                title.style.fontWeight = '800';
                c.appendChild(title);
                if (card.due) c.appendChild(el('div', 'kanban-due' + (late ? ' late' : ''), '📅 ' + card.due));
                c.onclick = () => openCardModal(board.id, col.id, card);
                colDiv.appendChild(c);
            });
            add.onclick = () => openCardModal(board.id, col.id, null);
            colDiv.appendChild(add);
            wrap.appendChild(colDiv);
        });
        boardsHooks.forEach((f) => f());
    }

    function askAddBoard() { const n = prompt('Board name:'); if (n && n.trim()) addBoard(n); }
    function askDeleteBoard() {
        const b = activeBoard();
        clickSound(400, 0.08);
        if (confirm('Delete board "' + b.name + '" and all its cards?')) deleteBoard(b.id);
    }
    function askAddColumn() { const n = prompt('Column name:'); if (n && n.trim()) addColumn(activeBoard().id, n); }
    function askDeleteColumn(boardId, colId) { clickSound(400, 0.08); deleteColumn(boardId, colId); }

    // ---------- The card window ----------
    function openCardModal(boardId, colId, card) {
        card = isObj(card) ? card : null;
        state.editingCard = { boardId: boardId, colId: colId, cardId: card ? card.id : null };
        state.pendingCardColor = card && isShade(card.color) ? card.color : '';
        state.colorTarget = 'card';
        $('card-modal-title-text').innerText = card ? 'Edit Card' : 'Add Card';
        $('card-title').value = (card && card.title) || '';
        $('card-due').value = (card && card.due) || '';
        $('card-desc').value = (card && card.desc) || '';
        paintColorButton();
        const popup = $('event-color-popup');
        if (popup) popup.style.display = 'none';
        $('card-modal').style.display = 'flex';
    }

    function closeCardModal() { $('card-modal').style.display = 'none'; }

    function saveCard() {
        const title = $('card-title').value;
        const due = $('card-due').value;
        const desc = $('card-desc').value;
        const color = isShade(state.pendingCardColor) ? state.pendingCardColor : '';
        const editing = state.editingCard;
        if (!title.trim() || (due !== '' && !parseDate(due))) {
            alert('Give the card a title and a valid due date!');
            return;
        }
        clickSound(700, 0.08);
        if (editing && editing.cardId) updateCard(editing.boardId, editing.cardId, { title, due, desc, color });
        else if (editing) addCard(editing.boardId, editing.colId, { title, due, desc, color });
        closeCardModal();
        renderBoards();
    }

    function editCard(boardId, colId, cardId) {
        const found = findCard(boardId, cardId);
        if (found) openCardModal(boardId, colId, found.card);
    }
    function askDeleteCard(boardId, cardId) { clickSound(400, 0.08); deleteCard(boardId, cardId); }

    // ---------- Files ----------
    function download(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    function exportICS() {
        clickSound(750, 0.12);
        download(new Blob([icsContent(events())], { type: 'text/calendar' }), 'hexa-calendar.ics');
    }

    // Hexa snapshot format (.KH): EVERYTHING in one file, boards included!
    const kh = () => ({ app: 'Hexa', version: '1.0', exportedAt: new Date().toISOString(), events: events(), boards: boards(), activeBoardId: state.activeBoard });

    function applyKh(doc) {
        const has = (v) => v !== undefined && v !== null;
        if (!isObj(doc) || !(doc.app === undefined || doc.app === null || doc.app === 'Hexa')
            || !(!has(doc.events) || Array.isArray(doc.events)) || !(!has(doc.boards) || Array.isArray(doc.boards))) return null;
        if (has(doc.events)) state.events = cleanEvents(doc.events);
        if (has(doc.boards)) {
            state.boards = cleanBoards(doc.boards);
            if (typeof doc.activeBoardId === 'string') state.activeBoard = doc.activeBoardId;
            ensureBoards();
        }
        return has(doc.events) || has(doc.boards);
    }

    function exportKH() {
        clickSound(750, 0.12);
        download(new Blob([JSON.stringify(kh(), null, 2)], { type: 'application/json' }), 'hexa-calendar.kh');
    }

    function readFile(evt, onText) {
        clickSound(850, 0.15);
        const file = evt.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => onText(e.target.result);
        reader.readAsText(file);
    }

    function importKH(evt) {
        readFile(evt, (text) => {
            try {
                if (applyKh(JSON.parse(text))) {
                    persist(); render();
                    if (state.view === 'boards') renderBoards();
                    alert('Hexa file (.kh) loaded successfully!');
                } else {
                    alert('Invalid .kh file format.');
                }
            } catch (e) { alert('Invalid .kh file format.'); }
        });
    }

    function importICS(evt) {
        readFile(evt, (text) => {
            try {
                const incoming = parseIcs(text);
                state.events = events().concat(incoming);
                persist(); render();
                alert('Imported ' + incoming.length + ' events!');
            } catch (e) { alert('Invalid .ics file format.'); }
        });
    }

    // The ribbon (office.js) and live collaboration (collab.js) build on this!
    window.Hexa = {
        state, renderHooks, boardsHooks, persistHooks, viewHooks, STORAGE_KEY, MONTHS,
        $, events, boards, activeBoard, ensureBoards, parseDate, saveJson, persist, render, renderBoards,
        addBoard, deleteBoard, switchBoard, addColumn, clearCalendar, setViewMode, shiftMonth, goToday,
        openEventModal, editEvent, openCardModal, exportICS, exportKH,
    };

    // ---------- The page's onclick handlers call these by name! ----------
    Object.assign(window, {
        shiftMonth, goToday, pickDay, openEventModal, closeEventModal, saveEvent, editEvent, askDeleteEvent,
        askClearCalendar, exportICS, importICS, exportKH, importKH, setViewMode, switchBoard, askAddBoard,
        askDeleteBoard, askAddColumn, askDeleteColumn, openCardModal, closeCardModal, saveCard, editCard,
        askDeleteCard, toggleColorPopup,
    });

    const t = new Date();
    state.year = t.getFullYear(); state.month = t.getMonth(); state.selected = todayStr();
    restore();
    ensureBoards();
    if ($('hexa-grid')) render();
})();
