let events = [];

let boards = [];
let activeBoardId = null;
let editingCard = null;
let currentView = 'calendar';

let cursorYear = null;
let cursorMonth = null;
let selectedDate = null;
let editingEventId = null;

const HEXA_STORAGE_KEY = 'hexa-calendar-v1';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

function playHexaClickSound(frequency = 600, duration = 0.08) {
    try {
        const ctx = window.hexaAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.hexaAudioCtx) window.hexaAudioCtx = ctx;
        if (ctx.state === 'suspended') ctx.resume();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {}
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function dateStr(y, m, d) {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function todayStr() {
    const t = new Date();
    return dateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

function parseDateStr(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    return { y: parseInt(m[1], 10), m: parseInt(m[2], 10) - 1, d: parseInt(m[3], 10) };
}

function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
}

// Sunday-start month grid: 6 rows x 7 days, dimmed outer days included!
function buildMonthGrid(y, m) {
    const firstDow = new Date(y, m, 1).getDay();
    const days = daysInMonth(y, m);
    const prevDays = daysInMonth(y, m - 1);
    const cells = [];
    for (let i = firstDow - 1; i >= 0; i--) {
        const d = new Date(y, m - 1, prevDays - i);
        cells.push({ date: dateStr(d.getFullYear(), d.getMonth(), d.getDate()), inMonth: false });
    }
    for (let d = 1; d <= days; d++) {
        cells.push({ date: dateStr(y, m, d), inMonth: true });
    }
    let next = 1;
    while (cells.length % 7 !== 0 || cells.length < 42) {
        const d = new Date(y, m + 1, next++);
        cells.push({ date: dateStr(d.getFullYear(), d.getMonth(), d.getDate()), inMonth: false });
    }
    const weeks = [];
    for (let w = 0; w < cells.length; w += 7) weeks.push(cells.slice(w, w + 7));
    return weeks;
}

function eventsOn(date) {
    return events
        .filter(e => e.date === date)
        .sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1);
}

function makeId() {
    return 'hx_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

function addEvent(ev) {
    const rec = { id: makeId(), title: '', date: todayStr(), time: '', desc: '', ...ev };
    if (!parseDateStr(rec.date)) return null;
    events.push(rec);
    persist();
    render();
    return rec;
}

function updateEvent(id, patch) {
    const rec = events.find(e => e.id === id);
    if (!rec) return false;
    Object.assign(rec, patch);
    if (!parseDateStr(rec.date)) return false;
    persist();
    render();
    return true;
}

function deleteEvent(id) {
    events = events.filter(e => e.id !== id);
    persist();
    render();
}

function clearCalendar() {
    events = [];
    persist();
    render();
}

function persist() {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(HEXA_STORAGE_KEY, JSON.stringify({ events, boards, activeBoardId }));
    } catch (e) {}
}

function validCard(c) {
    return c && typeof c.title === 'string' && typeof (c.due || '') === 'string' &&
        (c.due === '' || c.due === undefined || parseDateStr(c.due));
}

// Explicit card color wins on the calendar; otherwise the stable hash shade!
function cardBubble(card) {
    if (card && isShade(card.color)) return 'mkt-bubble-' + card.color;
    return bubbleClass(card && card.id);
}

function validBoard(b) {
    return b && typeof b.name === 'string' && Array.isArray(b.columns) && b.columns.length > 0 &&
        b.columns.every(col => col && typeof col.name === 'string' && Array.isArray(col.cards) &&
            col.cards.every(c => validCard(c) && typeof c.id === 'string')) &&
        typeof b.id === 'string';
}

function ensureBoards() {
    if (!Array.isArray(boards)) boards = [];
    boards = boards.filter(validBoard);
    if (boards.length === 0) {
        const bid = makeId();
        boards = [{
            id: bid, name: 'Tasks', columns: [
                { id: makeId(), name: 'To Do', cards: [] },
                { id: makeId(), name: 'Doing', cards: [] },
                { id: makeId(), name: 'Done', cards: [] },
            ]
        }];
        activeBoardId = bid;
    }
    if (!boards.some(b => b.id === activeBoardId)) activeBoardId = boards[0].id;
}

function restore() {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(HEXA_STORAGE_KEY);
        if (!raw) return;
        const doc = JSON.parse(raw);
        if (doc && Array.isArray(doc.events)) {
            events = doc.events.filter(e => e && typeof e.title === 'string' && parseDateStr(e.date));
            events.forEach(e => { if (!isShade(e.color)) e.color = ''; });
        }
        if (doc && Array.isArray(doc.boards)) {
            boards = doc.boards.filter(validBoard);
            boards.forEach(b => b.columns.forEach(col => col.cards.forEach(c => {
                if (!isShade(c.color)) c.color = '';
            })));
            if (typeof doc.activeBoardId === 'string') activeBoardId = doc.activeBoardId;
        }
    } catch (e) {}
}

function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Gel Bubble Remix Pack: thirty rainbow shades, one per id, stable forever!
const BUBBLE_SHADES = ['red', 'coral', 'orange', 'amber', 'gold', 'yellow',
    'cream', 'lime', 'olive', 'green', 'emerald', 'mint', 'teal', 'turquoise',
    'cyan', 'sky', 'blue', 'navy', 'indigo', 'violet', 'purple', 'lavender',
    'fuchsia', 'pink', 'rose', 'brown', 'white', 'fog', 'slate', 'black'];

function bubbleClass(id) {
    const s = String(id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h * 31) + s.charCodeAt(i)) >>> 0;
    }
    return 'mkt-bubble-' + BUBBLE_SHADES[h % BUBBLE_SHADES.length];
}

function isShade(s) {
    return BUBBLE_SHADES.includes(s);
}

// Explicit event color wins; otherwise the stable hash shade applies!
function eventBubble(ev) {
    if (ev && isShade(ev.color)) return 'mkt-bubble-' + ev.color;
    return bubbleClass(ev && ev.id);
}

let pendingColor = '';
let colorTarget = 'event';
let pendingCardColor = '';
let colorPopupBuilt = false;

function paintColorButton() {
    const btn = document.getElementById(colorTarget === 'card' ? 'card-color-btn' : 'event-color-btn');
    const val = colorTarget === 'card' ? pendingCardColor : pendingColor;
    if (!btn) return;
    btn.className = 'event-chip ' + (isShade(val) ? 'mkt-bubble-' + val : 'mkt-bubble-slate');
    btn.textContent = isShade(val) ? val : 'auto';
}

function wireColorPopup() {
    const popup = document.getElementById('event-color-popup');
    if (!popup || colorPopupBuilt) return;
    colorPopupBuilt = true;
    BUBBLE_SHADES.forEach(shade => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'event-chip mkt-bubble-' + shade;
        sw.textContent = shade.charAt(0).toUpperCase();
        sw.title = shade;
        sw.onclick = () => pickEventColor(shade);
        popup.appendChild(sw);
    });
    document.addEventListener('click', (e) => {
        const pop = document.getElementById('event-color-popup');
        // BOTH pickers share this one popup: a click on EITHER button keeps it open!
        const btnE = document.getElementById('event-color-btn');
        const btnC = document.getElementById('card-color-btn');
        if (!pop || pop.style.display === 'none') return;
        if (pop.contains(e.target)) return;
        if ((btnE && btnE.contains(e.target)) || (btnC && btnC.contains(e.target))) return;
        pop.style.display = 'none';
    });
}

function toggleColorPopup(which) {
    playHexaClickSound(500, 0.05);
    colorTarget = (which === 'card') ? 'card' : 'event';
    wireColorPopup();
    const popup = document.getElementById('event-color-popup');
    if (!popup) return;
    popup.style.display = popup.style.display === 'none' || !popup.style.display ? 'flex' : 'none';
}

function pickEventColor(shade) {
    playHexaClickSound(600, 0.06);
    const val = isShade(shade) ? shade : '';
    if (colorTarget === 'card') pendingCardColor = val;
    else pendingColor = val;
    paintColorButton();
    document.getElementById('event-color-popup').style.display = 'none';
}

function escapeICS(s) {
    return String(s === undefined || s === null ? '' : s)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function unescapeICS(s) {
    return String(s).replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function icsTimestamp(d) {
    return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

function eventToICS(ev) {
    const lines = [
        'BEGIN:VEVENT',
        `UID:${ev.id}@hexa`,
        `DTSTAMP:${icsTimestamp(new Date())}`,
    ];
    const flat = ev.date.replace(/-/g, '');
    if (ev.time && /^\d{2}:\d{2}$/.test(ev.time)) {
        lines.push(`DTSTART:${flat}T${ev.time.replace(':', '')}00`);
    } else {
        lines.push(`DTSTART;VALUE=DATE:${flat}`);
    }
    lines.push(`SUMMARY:${escapeICS(ev.title)}`);
    if (ev.desc) lines.push(`DESCRIPTION:${escapeICS(ev.desc)}`);
    if (isShade(ev.color)) lines.push(`X-HEXA-COLOR:${ev.color}`);
    lines.push('END:VEVENT');
    return lines;
}

function exportICSContent(list) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Radii Office//Hexa//EN'];
    list.forEach(ev => lines.push(...eventToICS(ev)));
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

// Basic VEVENT import: UID/SUMMARY/DESCRIPTION/DTSTART (DATE or floating DATETIME)!
function parseICS(text) {
    const unfolded = String(text || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);
    const out = [];
    let cur = null;
    const seen = {};
    events.forEach(e => { seen[e.id] = true; });
    lines.forEach(rawLine => {
        const line = rawLine.trim();
        if (line === 'BEGIN:VEVENT') {
            cur = { id: '', title: '', date: '', time: '', desc: '' };
        } else if (line === 'END:VEVENT') {
            if (cur && parseDateStr(cur.date)) {
                if (cur.id && seen[cur.id]) {
                    // Already have this UID: skip so re-imports stay idempotent!
                } else {
                    if (!cur.id) cur.id = makeId();
                    seen[cur.id] = true;
                    out.push(cur);
                }
            }
            cur = null;
        } else if (cur) {
            let m;
            if ((m = /^UID:(.*)$/.exec(line))) {
                cur.id = m[1].replace(/@hexa$/, '');
            } else if ((m = /^X-HEXA-COLOR:(.*)$/.exec(line))) {
                if (isShade(m[1])) cur.color = m[1];
            } else if ((m = /^SUMMARY:(.*)$/.exec(line))) {
                cur.title = unescapeICS(m[1]);
            } else if ((m = /^DESCRIPTION:(.*)$/.exec(line))) {
                cur.desc = unescapeICS(m[1]);
            } else if ((m = /^DTSTART(?:;[^:]*)?:(\d{8})(?:T(\d{4})(\d{2})?)?$/.exec(line))) {
                cur.date = `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`;
                if (m[2]) cur.time = `${m[2].slice(0, 2)}:${m[2].slice(2, 4)}`;
            }
        }
    });
    return out;
}

function shiftMonth(dir) {
    playHexaClickSound(600, 0.06);
    cursorMonth += dir;
    if (cursorMonth < 0) { cursorMonth = 11; cursorYear--; }
    if (cursorMonth > 11) { cursorMonth = 0; cursorYear++; }
    render();
}

function goToday() {
    playHexaClickSound(650, 0.08);
    const t = new Date();
    cursorYear = t.getFullYear();
    cursorMonth = t.getMonth();
    selectedDate = todayStr();
    render();
}

function pickDay(date) {
    playHexaClickSound(550, 0.06);
    selectedDate = date;
    const p = parseDateStr(date);
    if (p) { cursorYear = p.y; cursorMonth = p.m; }
    render();
}

function render() {
    const weeks = buildMonthGrid(cursorYear, cursorMonth);
    document.getElementById('month-title-text').innerText = `${MONTHS[cursorMonth]} ${cursorYear}`;
    document.getElementById('event-count').innerText = `${events.length} Events`;

    const grid = document.getElementById('hexa-grid');
    grid.innerHTML = weeks.map(week => week.map(cell => {
        const dayEvents = eventsOn(cell.date);
        const dueCards = cardsDueOn(cell.date);
        const shown = dayEvents.slice(0, 3).map(ev =>
            `<div class="event-chip ${eventBubble(ev)}">${escapeHtml(ev.time ? ev.time + ' ' : '')}${escapeHtml(ev.title || 'Untitled')}</div>`
        ).join('');
        const cardShown = dueCards.slice(0, Math.max(0, 3 - dayEvents.slice(0, 3).length)).map(({ card }) =>
            `<div class="event-chip ${cardBubble(card)}">📌 ${escapeHtml(card.title)}</div>`
        ).join('');
        const total = dayEvents.length + dueCards.length;
        const more = total > 3 ? `<div class="more-chip">+${total - 3} more</div>` : '';
        const cls = ['day-cell'];
        if (!cell.inMonth) cls.push('dim');
        if (cell.date === todayStr()) cls.push('today');
        if (cell.date === selectedDate) cls.push('selected');
        const dayNum = parseInt(cell.date.slice(8, 10), 10);
        return `<div class="${cls.join(' ')}" onclick="pickDay('${cell.date}')">` +
            `<div class="day-number">${dayNum}</div>${shown}${cardShown}${more}</div>`;
    }).join('')).join('');

    const dayEvents = eventsOn(selectedDate);
    const dueCards = cardsDueOn(selectedDate);
    const agenda = document.getElementById('agenda-list');
    document.getElementById('agenda-date').innerText = `Agenda — ${selectedDate}`;
    if (dayEvents.length === 0 && dueCards.length === 0) {
        agenda.innerHTML = `<div style="color:#99f6e4;">No events! Press Add Event to create one!</div>`;
        return;
    }
    agenda.innerHTML = dayEvents.map(ev => `
        <div class="agenda-item">
            <span>${escapeHtml(ev.time || 'all-day')} — ${escapeHtml(ev.title || 'Untitled')}</span>
            <button onclick="editEvent('${ev.id}')" title="Edit!">✏️</button>
            <button onclick="askDeleteEvent('${ev.id}')" title="Delete!">🗑️</button>
        </div>
    `).join('') + dueCards.map(({ board, col, card }) => `
        <div class="agenda-item">
            <span>📌 ${escapeHtml(card.title)} <small>(${escapeHtml(board.name)} / ${escapeHtml(col.name)})</small></span>
            <button onclick="editCard('${board.id}', '${col.id}', '${card.id}')" title="Edit!">✏️</button>
        </div>
    `).join('');
}

function openEventModal(ev = null) {
    editingEventId = ev ? ev.id : null;
    document.getElementById('modal-title-text').innerText = ev ? 'Edit Event' : 'Add Event';
    document.getElementById('event-title').value = ev ? ev.title : '';
    document.getElementById('event-date').value = ev ? ev.date : selectedDate;
    document.getElementById('event-time').value = ev ? ev.time : '';
    document.getElementById('event-desc').value = ev ? ev.desc : '';
    pendingColor = (ev && isShade(ev.color)) ? ev.color : '';
    colorTarget = 'event';
    paintColorButton();
    const popup = document.getElementById('event-color-popup');
    if (popup) popup.style.display = 'none';
    document.getElementById('event-modal').style.display = 'flex';
}

function closeEventModal() {
    document.getElementById('event-modal').style.display = 'none';
}

function saveEvent() {
    const patch = {
        title: document.getElementById('event-title').value,
        date: document.getElementById('event-date').value,
        time: document.getElementById('event-time').value,
        desc: document.getElementById('event-desc').value,
        color: isShade(pendingColor) ? pendingColor : '',
    };
    if (!patch.title.trim() || !parseDateStr(patch.date)) {
        alert('Give the event a title and a valid date!');
        return;
    }
    playHexaClickSound(700, 0.08);
    if (editingEventId) updateEvent(editingEventId, patch);
    else addEvent(patch);
    selectedDate = patch.date;
    closeEventModal();
    render();
}

function editEvent(id) {
    const rec = events.find(e => e.id === id);
    if (rec) openEventModal(rec);
}

function askDeleteEvent(id) {
    playHexaClickSound(400, 0.08);
    deleteEvent(id);
}

function askClearCalendar() {
    playHexaClickSound(350, 0.12);
    if (!confirm('Delete ALL events?')) return;
    clearCalendar();
}

function setViewMode(mode) {
    playHexaClickSound(550, 0.08);
    currentView = (mode === 'boards') ? 'boards' : 'calendar';
    document.getElementById('calendar-view').style.display = currentView === 'calendar' ? 'flex' : 'none';
    document.getElementById('boards-view').style.display = currentView === 'boards' ? 'flex' : 'none';
    document.getElementById('view-calendar-btn').classList.toggle('active', currentView === 'calendar');
    document.getElementById('view-boards-btn').classList.toggle('active', currentView === 'boards');
    if (currentView === 'boards') renderBoards();
    else render();
}

function activeBoard() {
    ensureBoards();
    return boards.find(b => b.id === activeBoardId) || boards[0];
}

function findCard(boardId, cardId) {
    const board = boards.find(b => b.id === boardId);
    if (!board) return null;
    for (const col of board.columns) {
        const card = col.cards.find(c => c.id === cardId);
        if (card) return { board, col, card };
    }
    return null;
}

function addBoard(name) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    playHexaClickSound(700, 0.08);
    const board = {
        id: makeId(), name: clean.slice(0, 60), columns: [
            { id: makeId(), name: 'To Do', cards: [] },
            { id: makeId(), name: 'Doing', cards: [] },
            { id: makeId(), name: 'Done', cards: [] },
        ]
    };
    boards.push(board);
    activeBoardId = board.id;
    persist();
    renderBoards();
    return board;
}

function deleteBoard(id) {
    if (boards.length <= 1) return false;
    boards = boards.filter(b => b.id !== id);
    if (activeBoardId === id) activeBoardId = boards[0].id;
    persist();
    renderBoards();
    return true;
}

function switchBoard(id) {
    playHexaClickSound(550, 0.06);
    if (boards.some(b => b.id === id)) activeBoardId = id;
    renderBoards();
}

function addColumn(boardId, name) {
    const board = boards.find(b => b.id === boardId);
    const clean = String(name || '').trim();
    if (!board || !clean) return null;
    playHexaClickSound(650, 0.08);
    const col = { id: makeId(), name: clean.slice(0, 40), cards: [] };
    board.columns.push(col);
    persist();
    renderBoards();
    return col;
}

function deleteColumn(boardId, colId) {
    const board = boards.find(b => b.id === boardId);
    if (!board || board.columns.length <= 1) return false;
    const idx = board.columns.findIndex(c => c.id === colId);
    if (idx === -1) return false;
    const [gone] = board.columns.splice(idx, 1);
    const target = board.columns[0];
    gone.cards.forEach(c => target.cards.push(c));
    persist();
    renderBoards();
    return true;
}

function addCard(boardId, colId, patch) {
    const board = boards.find(b => b.id === boardId);
    const col = board && board.columns.find(c => c.id === colId);
    const title = String((patch && patch.title) || '').trim();
    const due = (patch && patch.due) || '';
    if (!col || !title || (due !== '' && !parseDateStr(due))) return null;
    const color = (patch && isShade(patch.color)) ? patch.color : '';
    const card = { id: makeId(), title: title.slice(0, 120), due, desc: String((patch && patch.desc) || '').slice(0, 2000), color };
    col.cards.push(card);
    persist();
    if (currentView === 'boards') renderBoards();
    else render();
    return card;
}

function updateCard(boardId, cardId, patch) {
    const found = findCard(boardId, cardId);
    if (!found) return false;
    if (patch.title !== undefined) {
        const title = String(patch.title).trim();
        if (!title) return false;
        found.card.title = title.slice(0, 120);
    }
    if (patch.due !== undefined) {
        if (patch.due !== '' && !parseDateStr(patch.due)) return false;
        found.card.due = patch.due;
    }
    if (patch.desc !== undefined) found.card.desc = String(patch.desc).slice(0, 2000);
    if (patch.color !== undefined) found.card.color = isShade(patch.color) ? patch.color : '';
    persist();
    if (currentView === 'boards') renderBoards();
    else render();
    return true;
}

function deleteCard(boardId, cardId) {
    const found = findCard(boardId, cardId);
    if (!found) return false;
    found.col.cards = found.col.cards.filter(c => c.id !== cardId);
    persist();
    if (currentView === 'boards') renderBoards();
    else render();
    return true;
}

function moveCard(boardId, cardId, toColId) {
    const found = findCard(boardId, cardId);
    if (!found) return false;
    const target = found.board.columns.find(c => c.id === toColId);
    if (!target) return false;
    if (found.col.id === toColId) return true;
    found.col.cards = found.col.cards.filter(c => c.id !== cardId);
    target.cards.push(found.card);
    persist();
    if (currentView === 'boards') renderBoards();
    return true;
}

// Cards with due dates surface on the calendar and agenda!
function cardsDueOn(date) {
    const out = [];
    boards.forEach(board => {
        board.columns.forEach(col => {
            col.cards.forEach(card => {
                if (card.due === date) out.push({ board, col, card });
            });
        });
    });
    return out;
}

function isOverdue(dateStr) {
    return dateStr < todayStr();
}

function renderBoards() {
    ensureBoards();
    const board = activeBoard();
    const select = document.getElementById('board-select');
    select.innerHTML = boards.map(b => `<option value="${b.id}"${b.id === board.id ? ' selected' : ''}>${escapeHtml(b.name)}</option>`).join('');
    const total = board.columns.reduce((n, c) => n + c.cards.length, 0);
    document.getElementById('board-count').innerText = `${total} Cards`;

    const wrap = document.getElementById('board-columns');
    wrap.innerHTML = '';
    board.columns.forEach(col => {
        const colDiv = document.createElement('div');
        colDiv.className = 'board-column';
        colDiv.ondragover = (e) => e.preventDefault();
        colDiv.ondrop = (e) => {
            e.preventDefault();
            try {
                const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (payload && payload.cardId) {
                    playHexaClickSound(600, 0.06);
                    moveCard(board.id, payload.cardId, col.id);
                }
            } catch (err) {}
        };
        const head = document.createElement('div');
        head.className = 'column-head';
        head.textContent = `${col.name} (${col.cards.length})`;
        const delCol = document.createElement('button');
        delCol.title = 'Delete column!';
        delCol.textContent = '✕';
        delCol.onclick = () => askDeleteColumn(board.id, col.id);
        head.appendChild(delCol);
        colDiv.appendChild(head);

        col.cards.forEach(card => {
            const el = document.createElement('div');
            el.className = 'kanban-card' + ((card.due && isOverdue(card.due)) ? ' overdue' : '');
            el.draggable = true;
            el.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ boardId: board.id, cardId: card.id }));
            };
            const title = document.createElement('div');
            title.style.fontWeight = '800';
            title.textContent = card.title;
            el.appendChild(title);
            if (card.due) {
                const due = document.createElement('div');
                due.className = 'kanban-due' + (isOverdue(card.due) ? ' late' : '');
                due.textContent = '📅 ' + card.due;
                el.appendChild(due);
            }
            el.onclick = () => openCardModal(board.id, col.id, card);
            colDiv.appendChild(el);
        });

        const add = document.createElement('button');
        add.className = 'kanban-add';
        add.textContent = '＋ Add card';
        add.onclick = () => openCardModal(board.id, col.id, null);
        colDiv.appendChild(add);
        wrap.appendChild(colDiv);
    });
}

function askAddBoard() {
    if (typeof prompt === 'undefined') return;
    const name = prompt('Board name:');
    if (name && name.trim()) addBoard(name);
}

function askDeleteBoard() {
    const board = activeBoard();
    playHexaClickSound(400, 0.08);
    if (!confirm(`Delete board "${board.name}" and all its cards?`)) return;
    deleteBoard(board.id);
}

function askAddColumn() {
    if (typeof prompt === 'undefined') return;
    const name = prompt('Column name:');
    if (name && name.trim()) addColumn(activeBoard().id, name);
}

function askDeleteColumn(boardId, colId) {
    playHexaClickSound(400, 0.08);
    deleteColumn(boardId, colId);
}

function openCardModal(boardId, colId, card) {
    editingCard = card ? { boardId, colId, cardId: card.id } : { boardId, colId, cardId: null };
    document.getElementById('card-modal-title-text').innerText = card ? 'Edit Card' : 'Add Card';
    document.getElementById('card-title').value = card ? card.title : '';
    document.getElementById('card-due').value = card ? (card.due || '') : '';
    document.getElementById('card-desc').value = card ? (card.desc || '') : '';
    pendingCardColor = (card && isShade(card.color)) ? card.color : '';
    colorTarget = 'card';
    paintColorButton();
    const popup = document.getElementById('event-color-popup');
    if (popup) popup.style.display = 'none';
    document.getElementById('card-modal').style.display = 'flex';
}

function closeCardModal() {
    document.getElementById('card-modal').style.display = 'none';
}

function saveCard() {
    const title = document.getElementById('card-title').value;
    const due = document.getElementById('card-due').value;
    const desc = document.getElementById('card-desc').value;
    const color = isShade(pendingCardColor) ? pendingCardColor : '';
    if (!title.trim() || (due !== '' && !parseDateStr(due))) {
        alert('Give the card a title and a valid due date!');
        return;
    }
    playHexaClickSound(700, 0.08);
    if (editingCard && editingCard.cardId) updateCard(editingCard.boardId, editingCard.cardId, { title, due, desc, color });
    else if (editingCard) addCard(editingCard.boardId, editingCard.colId, { title, due, desc, color });
    closeCardModal();
    renderBoards();
}

function editCard(boardId, colId, cardId) {
    const found = findCard(boardId, cardId);
    if (found) openCardModal(boardId, colId, found.card);
}

function askDeleteCard(boardId, cardId) {
    playHexaClickSound(400, 0.08);
    deleteCard(boardId, cardId);
}

function downloadFile(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function exportICS() {
    playHexaClickSound(750, 0.12);
    downloadFile(new Blob([exportICSContent(events)], { type: 'text/calendar' }), 'hexa-calendar.ics');
}

// Hexa snapshot format (.KH): EVERYTHING in one file, boards included!
function buildKH() {
    return {
        app: 'Hexa',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        events,
        boards,
        activeBoardId,
    };
}

function applyKH(doc) {
    if (!doc || typeof doc !== 'object') return false;
    if (doc.app && doc.app !== 'Hexa') return false;
    let okEvents = true, okBoards = true;
    if (doc.events !== undefined) {
        if (!Array.isArray(doc.events)) return false;
        events = doc.events.filter(e => e && typeof e.title === 'string' && parseDateStr(e.date));
        events.forEach(e => { if (!isShade(e.color)) e.color = ''; });
    } else {
        okEvents = false;
    }
    if (doc.boards !== undefined) {
        if (!Array.isArray(doc.boards)) return false;
        boards = doc.boards.filter(validBoard);
        boards.forEach(b => b.columns.forEach(col => col.cards.forEach(c => {
            if (!isShade(c.color)) c.color = '';
        })));
        if (typeof doc.activeBoardId === 'string') activeBoardId = doc.activeBoardId;
        ensureBoards();
    } else {
        okBoards = false;
    }
    return okEvents || okBoards;
}

function exportKH() {
    playHexaClickSound(750, 0.12);
    downloadFile(new Blob([JSON.stringify(buildKH(), null, 2)], { type: 'application/json' }), 'hexa-calendar.kh');
}

function importKH(evt) {
    playHexaClickSound(850, 0.15);
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const doc = JSON.parse(e.target.result);
            if (!applyKH(doc)) throw new Error('bad-kh');
            persist();
            render();
            if (currentView === 'boards') renderBoards();
            alert('Hexa file (.kh) loaded successfully!');
        } catch (err) {
            alert('Invalid .kh file format.');
        }
    };
    reader.readAsText(file);
}

function importICS(evt) {
    playHexaClickSound(850, 0.15);
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const incoming = parseICS(e.target.result);
            incoming.forEach(ev => events.push(ev));
            persist();
            render();
            alert(`Imported ${incoming.length} events!`);
        } catch (err) {
            alert('Invalid .ics file format.');
        }
    };
    reader.readAsText(file);
}

(function boot() {
    const t = new Date();
    cursorYear = t.getFullYear();
    cursorMonth = t.getMonth();
    selectedDate = todayStr();
    restore();
    ensureBoards();
    if (typeof document !== 'undefined' && document.getElementById && document.getElementById('hexa-grid')) {
        render();
    }
})();

// Export pure helpers for build-time testing in Node!
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildMonthGrid, daysInMonth, parseDateStr, dateStr, todayStr,
        eventsOn, addEvent, updateEvent, deleteEvent, clearCalendar,
        persist, restore, escapeICS, unescapeICS, eventToICS,
        exportICSContent, parseICS, getEvents: () => events,
        setEvents: (list) => { events = list; },
        buildKH, applyKH, exportKH, importKH,
        ensureBoards, activeBoard, findCard,
        addBoard, deleteBoard, switchBoard, addColumn, deleteColumn,
        addCard, updateCard, deleteCard, moveCard,
        cardsDueOn, isOverdue, setViewMode,
        bubbleClass, BUBBLE_SHADES, isShade, eventBubble, cardBubble,
        getBoards: () => boards, setBoards: (list) => { boards = list; },
        getActiveBoardId: () => activeBoardId,
    };
}
if (typeof globalThis !== 'undefined') {
    Object.assign(globalThis, {
        shiftMonth, goToday, pickDay, openEventModal, closeEventModal,
        saveEvent, editEvent, askDeleteEvent, askClearCalendar,
        exportICS, importICS, exportKH, importKH, setViewMode, switchBoard,
        askAddBoard, askDeleteBoard, askAddColumn, askDeleteColumn,
        openCardModal, closeCardModal, saveCard, editCard, askDeleteCard,
        toggleColorPopup,
    });
}
