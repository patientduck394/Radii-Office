// Tags + Skills for Bitbook Mobile Classic!
// The chip builders below are copied from /bitbook/app.js, so a chip made on a phone is exactly the chip the
// desktop Bitbook makes (and keydown-doc.js saves and loads them the same way in .kd files).
// The bigger skills (BeepBox, sprites, Uni-Chip and friends) live in the New style, so their buttons go there.

// ==========================================
// TIME CAPSULE (from /bitbook/app.js)
// ==========================================
var tcSavedRange = null;
var tcTimer = null;
function tcEncode(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}
function tcDecode(b64) {
    try {
        const bin = atob(b64 || '');
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    } catch (e) { return ''; }
}
function tcLeftLabel(ms) {
    if (ms <= 0) return 'Ready!';
    const m = Math.ceil(ms / 60000);
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    if (d >= 1) return d + 'd ' + h + 'h';
    if (h >= 1) return h + 'h ' + mm + 'm';
    return mm + 'm';
}
function tcFormatDate(ms) {
    try {
        return new Date(ms).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (e) { return new Date(ms).toString(); }
}
// datetime-local wants local "YYYY-MM-DDTHH:MM"!
function tcLocalInputValue(ms) {
    const d = new Date(ms);
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
// TIME CAPSULE part 2: chip states (sealed -> ready -> opened)!
function tcRefreshChip(chip, now) {
    const open = parseInt(chip.getAttribute('data-tc-open'), 10) || 0;
    const ready = now >= open;
    const count = chip.querySelector('.tc-chip-count');
    if (ready && !chip.classList.contains('tc-ready')) chip.classList.add('tc-ready');
    if (!ready && chip.classList.contains('tc-ready')) chip.classList.remove('tc-ready');
    if (count) {
        const want = chip.classList.contains('tc-opened') ? 'Opened!' : (ready ? 'Tap to open!' : tcLeftLabel(open - now));
        if (count.textContent !== want) count.textContent = want;
    }
    const t = (ready ? 'Opened on ' : 'Sealed until ') + tcFormatDate(open) + '!';
    if (chip.title !== t) chip.title = t;
}
function tcSweep() {
    const now = Date.now();
    try {
        document.querySelectorAll('#wysiwyg-canvas .tc-chip').forEach(function (chip) { tcRefreshChip(chip, now); });
    } catch (e) {}
}
function tcBuildChip(label, msg, openMs) {
    const chip = document.createElement('span');
    chip.className = 'tc-chip';
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-tc-open', String(openMs));
    chip.setAttribute('data-tc-msg', tcEncode(msg));
    const lock = document.createElement('span');
    lock.className = 'tc-chip-lock';
    const name = document.createElement('span');
    name.className = 'tc-chip-name';
    name.textContent = label;
    const count = document.createElement('span');
    count.className = 'tc-chip-count';
    chip.appendChild(lock);
    chip.appendChild(name);
    chip.appendChild(count);
    tcRefreshChip(chip, Date.now());
    return chip;
}
function tcToggleChip(chip) {
    const open = parseInt(chip.getAttribute('data-tc-open'), 10) || 0;
    if (Date.now() < open) {
        // Still sealed: rattle it!
        chip.classList.remove('tc-shake');
        void chip.offsetWidth;
        chip.classList.add('tc-shake');
        setTimeout(function () { chip.classList.remove('tc-shake'); }, 500);
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(220, 0.08); } catch (e) {}
        return;
    }
    const shown = chip.querySelector('.tc-chip-msg');
    if (shown) {
        shown.remove();
        chip.classList.remove('tc-opened');
    } else {
        const m = document.createElement('span');
        m.className = 'tc-chip-msg';
        m.textContent = tcDecode(chip.getAttribute('data-tc-msg'));
        chip.appendChild(m);
        chip.classList.add('tc-opened');
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(990, 0.1); } catch (e) {}
    }
    tcRefreshChip(chip, Date.now());
}

// ==========================================
// FLASHCARD (from /bitbook/app.js)
// ==========================================
function flBuildChip(front, back) {
    const chip = document.createElement('span');
    chip.className = 'fl-chip';
    chip.setAttribute('contenteditable', 'false');
    chip.title = 'Flashcard: click to flip!';
    const f = document.createElement('span');
    f.className = 'fl-face fl-front';
    f.textContent = front;
    const b = document.createElement('span');
    b.className = 'fl-face fl-back';
    b.textContent = back;
    chip.appendChild(f);
    chip.appendChild(b);
    return chip;
}
function flFlip(chip) {
    chip.classList.toggle('fl-flipped');
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(chip.classList.contains('fl-flipped') ? 820 : 620, 0.06); } catch (e) {}
}

// ==========================================
// FOCUS TIMER (from /bitbook/app.js)
// ==========================================
var pmSavedRange = null;
var pmTimer = null;
var pmMinutes = 25;
function pmFormat(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(t / 60), s = t % 60;
    return m + ':' + String(s).padStart(2, '0');
}
function pmRefreshChip(chip, now) {
    const mins = parseFloat(chip.getAttribute('data-pm-min')) || 25;
    const end = parseInt(chip.getAttribute('data-pm-end'), 10) || 0;
    const count = chip.querySelector('.pm-chip-count');
    let txt, state;
    if (!end) { txt = pmFormat(mins * 60000); state = 'idle'; }
    else if (now >= end) { txt = 'Done!'; state = 'done'; }
    else { txt = pmFormat(end - now); state = 'run'; }
    if (count && count.textContent !== txt) count.textContent = txt;
    const ring = chip.querySelector('.pm-chip-ring');
    if (ring) {
        const left = state === 'run' ? (end - now) / (mins * 60000) : (state === 'done' ? 0 : 1);
        ring.style.setProperty('--pm-left', String(Math.max(0, Math.min(1, left))));
    }
    if (chip.getAttribute('data-pm-state') !== state) {
        // Just hit zero while open: chime!
        if (state === 'done' && chip.getAttribute('data-pm-state') === 'run') pmChime();
        chip.setAttribute('data-pm-state', state);
    }
    return state;
}
function pmChime() {
    try {
        if (typeof playAeroClickSound !== 'function') return;
        [880, 1175, 1568].forEach(function (f, i) { setTimeout(function () { playAeroClickSound(f, 0.18); }, i * 180); });
    } catch (e) {}
}
function pmSweep() {
    const now = Date.now();
    let running = false;
    document.querySelectorAll('#wysiwyg-canvas .pm-chip').forEach(function (chip) {
        if (pmRefreshChip(chip, now) === 'run') running = true;
    });
    if (running && !pmTimer) pmTimer = setInterval(pmSweep, 500);
    if (!running && pmTimer) { clearInterval(pmTimer); pmTimer = null; }
}
function pmBuildChip(label, mins) {
    const chip = document.createElement('span');
    chip.className = 'pm-chip';
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-pm-min', String(mins));
    chip.title = 'Focus timer: click to start, click again to reset!';
    const ring = document.createElement('span');
    ring.className = 'pm-chip-ring';
    const name = document.createElement('span');
    name.className = 'pm-chip-name';
    name.textContent = label;
    const count = document.createElement('span');
    count.className = 'pm-chip-count';
    chip.appendChild(ring);
    chip.appendChild(name);
    chip.appendChild(count);
    pmRefreshChip(chip, Date.now());
    return chip;
}
function pmToggle(chip) {
    const state = chip.getAttribute('data-pm-state');
    if (state === 'idle') {
        const mins = parseFloat(chip.getAttribute('data-pm-min')) || 25;
        chip.setAttribute('data-pm-end', String(Date.now() + mins * 60000));
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
    } else {
        chip.removeAttribute('data-pm-end');
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(440, 0.08); } catch (e) {}
    }
    pmSweep();
}

// ==========================================
// DICE ROLLER (from /bitbook/app.js)
// ==========================================
var dcSavedRange = null;
var dcCount = 1, dcSides = 20;
function dcRandInt(n) {
    try {
        const a = new Uint32Array(1);
        const lim = Math.floor(0x100000000 / n) * n;
        do { crypto.getRandomValues(a); } while (a[0] >= lim);
        return (a[0] % n) + 1;
    } catch (e) { return 1 + Math.floor(Math.random() * n); }
}
function dcRoll(n, s) {
    const rolls = [];
    for (let i = 0; i < n; i++) rolls.push(dcRandInt(s));
    return rolls;
}
function dcRender(chip, rolls) {
    const total = rolls.reduce(function (a, b) { return a + b; }, 0);
    const res = chip.querySelector('.dc-chip-result');
    if (res) res.textContent = String(total);
    chip.title = (chip.getAttribute('data-dc') || '') + ' rolled ' + rolls.join(' + ') + (rolls.length > 1 ? ' = ' + total : '') + ' (click to roll again!)';
    const sides = parseInt((chip.getAttribute('data-dc') || '1d20').split('d')[1], 10) || 20;
    chip.classList.toggle('dc-max', rolls.every(function (r) { return r === sides; }));
    chip.classList.toggle('dc-min', rolls.every(function (r) { return r === 1; }));
}
function dcBuildChip(n, s) {
    const chip = document.createElement('span');
    chip.className = 'dc-chip';
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-dc', n + 'd' + s);
    const die = document.createElement('span');
    die.className = 'dc-chip-die';
    const lab = document.createElement('span');
    lab.className = 'dc-chip-label';
    lab.textContent = n + 'd' + s;
    const res = document.createElement('span');
    res.className = 'dc-chip-result';
    chip.appendChild(die);
    chip.appendChild(lab);
    chip.appendChild(res);
    dcRender(chip, dcRoll(n, s));
    return chip;
}
function dcRollChip(chip) {
    const parts = (chip.getAttribute('data-dc') || '1d20').split('d');
    const n = Math.max(1, Math.min(10, parseInt(parts[0], 10) || 1));
    const s = Math.max(2, Math.min(100, parseInt(parts[1], 10) || 20));
    chip.classList.remove('dc-rolling');
    void chip.offsetWidth;
    chip.classList.add('dc-rolling');
    setTimeout(function () { chip.classList.remove('dc-rolling'); }, 450);
    dcRender(chip, dcRoll(n, s));
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(520 + Math.random() * 300, 0.06); } catch (e) {}
}

// ==========================================
// THE PHONE PART: sheets, little forms, and putting chips where the caret was!
// ==========================================
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const cv = () => $('wysiwyg-canvas');
    const click = (f, v) => { try { if (typeof playAeroClickSound === 'function') playAeroClickSound(f, v || 0.08); } catch (e) {} };
    const save = () => { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} };

    // A tap on a header button takes the focus away from the note, so the caret is remembered as it moves!
    let lastRange = null;
    document.addEventListener('selectionchange', function () {
        try {
            const sel = window.getSelection(), c = cv();
            if (sel.rangeCount && c && c.contains(sel.anchorNode)) lastRange = sel.getRangeAt(0).cloneRange();
        } catch (e) {}
    });

    function insertChip(chip) {
        const c = cv();
        if (!c) return;
        let range = lastRange && c.contains(lastRange.startContainer) ? lastRange : null;
        if (!range) {
            range = document.createRange();
            range.selectNodeContents(c);
            range.collapse(false);
        }
        if (!range.collapsed) range.collapse(false);
        range.insertNode(chip);
        const sp = document.createTextNode(' ');
        chip.parentNode.insertBefore(sp, chip.nextSibling);
        try {
            const caret = document.createRange();
            caret.setStart(sp, 1);
            caret.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(caret);
            lastRange = caret.cloneRange();
        } catch (e) {}
        save();
        click(880);
        if (chip.classList.contains('pm-chip')) pmSweep();
    }

    // ---- sheets ----
    const SHEETS = ['sl-tags-sheet', 'sl-skills-sheet', 'sl-form-sheet'];
    function show(id) {
        SHEETS.forEach((s) => { const el = $(s); if (el) el.hidden = s !== id; });
        $('sl-shield').hidden = !id;
        // keep the phone's keyboard from covering the sheet while picking
        if (id && id !== 'sl-form-sheet') try { document.activeElement && document.activeElement.blur(); } catch (e) {}
    }
    const hide = () => show(null);

    // ---- one small form for every chip that asks something ----
    let onOk = null, check = null;
    function form(title, okLabel, html, setup) {
        $('sl-form-title').textContent = title;
        $('sl-form-ok').textContent = okLabel || 'Insert';
        $('sl-form-body').innerHTML = html;
        onOk = null; check = null;
        setup($('sl-form-body'));
        show('sl-form-sheet');
        if (check) check();
        const first = $('sl-form-body').querySelector('input, textarea');
        if (first) setTimeout(() => { try { first.focus(); } catch (e) {} }, 60);
    }
    const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
    const field = (id, label, value, type) => '<label>' + esc(label) + (type === 'area'
        ? '<textarea id="' + id + '">' + esc(value || '') + '</textarea>'
        : '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value || '') + '" autocomplete="off">') + '</label>';
    function textForm(title, label, value, make) {
        form(title, 'Insert', field('sl-f1', label, value), function (body) {
            const inp = body.querySelector('#sl-f1');
            check = () => { $('sl-form-ok').disabled = !inp.value.trim(); };
            inp.addEventListener('input', check);
            inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('sl-form-ok').click(); } });
            onOk = () => make(inp.value.trim());
        });
    }

    // ---- Tags (the same markup as the desktop Tags menu) ----
    const ICON = {
        important: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.629 8.662a1.22 1.22 0 0 0 1.136-.826a30.3 30.3 0 0 1 2.286-5.295c.409-.73 1.499-.712 1.898 0a30 30 0 0 1 2.285 5.295c.164.476.634.818 1.137.826a32 32 0 0 1 4.741.473c.861.15 1.184 1.132.572 1.73a35 35 0 0 1-3.789 3.216a1.14 1.14 0 0 0-.42 1.28a30.3 30.3 0 0 1 1.267 5.48c.111.839-.788 1.431-1.567 1.031a31.7 31.7 0 0 1-4.422-2.749a1.3 1.3 0 0 0-1.507 0a32 32 0 0 1-4.422 2.749c-.78.4-1.678-.192-1.566-1.032c.25-1.862.674-3.696 1.266-5.478a1.14 1.14 0 0 0-.42-1.281a34.5 34.5 0 0 1-3.789-3.216c-.61-.598-.287-1.58.573-1.73a33 33 0 0 1 4.74-.473" /></svg>',
        idea: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.6 1.5 2.6h4c0-1 .7-2 1.5-2.6A6 6 0 0 0 12 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>'
    };
    function span(cls, text) {
        const s = document.createElement('span');
        s.className = cls;
        s.setAttribute('spellcheck', 'false');
        if (text !== undefined) s.textContent = text;
        return s;
    }
    const TAGS = {
        important: () => textForm('Important', 'Important:', '', (v) => { const s = span('tag-important-chip'); s.insertAdjacentHTML('afterbegin', ICON.important); s.appendChild(document.createTextNode(v)); return s; }),
        idea: () => textForm('Idea', 'Idea:', '', (v) => { const s = span('tag-idea-chip'); s.insertAdjacentHTML('afterbegin', ICON.idea); s.appendChild(document.createTextNode(v)); return s; }),
        checkbox: () => textForm('Checkbox', 'Checkbox label:', 'Task', (v) => {
            const box = span('tag-check-chip');
            box.setAttribute('contenteditable', 'false');
            const tick = document.createElement('input');
            tick.type = 'checkbox';
            tick.className = 'tag-check-box';
            box.appendChild(tick);
            box.appendChild(span('tag-check-label', v));
            box.lastChild.removeAttribute('spellcheck');
            return box;
        }),
        user: () => textForm('User tag', 'Tag user:', '', (v) => span('tag-user-chip', '@' + v)),
        dropdown: () => textForm('Dropdown chip', 'Options (comma-separated):', 'To do, Doing, Done', (v) => {
            const opts = v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
            if (!opts.length) return null;
            const wrap = span('tag-drop-chip');
            wrap.setAttribute('contenteditable', 'false');
            const sel = document.createElement('select');
            sel.className = 'tag-drop-select';
            opts.forEach((o) => { const op = document.createElement('option'); op.value = o; op.textContent = o; sel.appendChild(op); });
            wrap.appendChild(sel);
            return wrap;
        }),
        date: () => { hide(); insertChip(span('tag-date-chip', new Date().toLocaleDateString())); },
        hashtag: () => textForm('Hashtag', 'Hashtag:', '', (v) => { const t = v.replace(/^#+/, ''); return t ? span('tag-hash-chip', '#' + t) : null; }),
        contact: () => textForm('Contact', 'Contact info (name, phone, email...):', '', (v) => span('tag-contact-chip', v)),
    };

    // ---- Skills ----
    const pills = (attr, vals, cur, fmt) => '<div class="sl-pills">' + vals.map((v) => '<button type="button" class="sl-pill' + (v === cur ? ' active' : '') + '" ' + attr + '="' + v + '">' + (fmt ? fmt(v) : v) + '</button>').join('') + '</div>';
    function pickPills(body, attr, set) {
        body.querySelectorAll('[' + attr + ']').forEach((b) => b.addEventListener('click', function () {
            body.querySelectorAll('[' + attr + ']').forEach((x) => x.classList.toggle('active', x === b));
            set(parseFloat(b.getAttribute(attr)));
        }));
    }
    const SKILLS = {
        dice: () => form('Dice Roller', 'Insert', '<label>How many dice' + pills('data-n', [1, 2, 3, 4, 5, 6], dcCount) + '</label><label>Sides' + pills('data-s', [4, 6, 8, 10, 12, 20, 100], dcSides, (v) => 'd' + v) + '</label><div class="sl-status" id="sl-dc-prev"></div>', function (body) {
            const prev = () => { body.querySelector('#sl-dc-prev').textContent = 'Rolls ' + dcCount + 'd' + dcSides + '! Tap the chip to roll again!'; };
            pickPills(body, 'data-n', (v) => { dcCount = v; prev(); });
            pickPills(body, 'data-s', (v) => { dcSides = v; prev(); });
            prev();
            onOk = () => dcBuildChip(dcCount, dcSides);
        }),
        timer: () => form('Focus Timer', 'Insert', field('sl-pm-label', 'Label', 'Focus') + '<label>Minutes' + pills('data-m', [5, 10, 15, 25, 45, 60], 25) + '</label>' + field('sl-pm-min', 'Or type minutes (1 to 180)', '25', 'number'), function (body) {
            const min = body.querySelector('#sl-pm-min');
            pickPills(body, 'data-m', (v) => { min.value = String(v); check(); });
            check = () => { const v = parseFloat(min.value); $('sl-form-ok').disabled = !(isFinite(v) && v > 0); };
            min.addEventListener('input', () => { body.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('active', parseFloat(x.getAttribute('data-m')) === parseFloat(min.value))); check(); });
            onOk = () => pmBuildChip(body.querySelector('#sl-pm-label').value.trim() || 'Focus', Math.max(1, Math.min(180, parseFloat(min.value) || 25)));
        }),
        flashcard: () => form('Flashcard', 'Insert', field('sl-fl-front', 'Front (question)', '', 'area') + field('sl-fl-back', 'Back (answer)', '', 'area'), function (body) {
            const f = body.querySelector('#sl-fl-front'), b = body.querySelector('#sl-fl-back');
            check = () => { $('sl-form-ok').disabled = !f.value.trim() || !b.value.trim(); };
            f.addEventListener('input', check);
            b.addEventListener('input', check);
            onOk = () => flBuildChip(f.value.trim(), b.value.trim());
        }),
        capsule: () => form('Time Capsule', 'Seal it', field('sl-tc-label', 'Label', 'Time Capsule') + field('sl-tc-msg', 'A message for the future', '', 'area') +
            field('sl-tc-when', 'Opens on', tcLocalInputValue(Date.now() + 7 * 86400000), 'datetime-local') +
            '<div class="sl-pills"><button type="button" class="sl-pill" data-add="day">+1 day</button><button type="button" class="sl-pill active" data-add="week">+1 week</button><button type="button" class="sl-pill" data-add="month">+1 month</button><button type="button" class="sl-pill" data-add="year">+1 year</button></div><div class="sl-status" id="sl-tc-status"></div>', function (body) {
            const msg = body.querySelector('#sl-tc-msg'), when = body.querySelector('#sl-tc-when'), st = body.querySelector('#sl-tc-status');
            when.min = tcLocalInputValue(Date.now() + 60000);
            body.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', function () {
                const d = new Date(), a = b.getAttribute('data-add');
                if (a === 'day') d.setDate(d.getDate() + 1);
                else if (a === 'week') d.setDate(d.getDate() + 7);
                else if (a === 'month') d.setMonth(d.getMonth() + 1);
                else d.setFullYear(d.getFullYear() + 1);
                when.value = tcLocalInputValue(d.getTime());
                body.querySelectorAll('[data-add]').forEach((x) => x.classList.toggle('active', x === b));
                check();
            }));
            check = () => {
                const t = when.value ? new Date(when.value).getTime() : NaN;
                let ok = false, bad = false, text;
                if (!msg.value.trim()) text = 'Write a message for the future!';
                else if (isNaN(t)) { text = 'Pick when it opens!'; bad = true; }
                else if (t <= Date.now()) { text = 'Pick a time in the future!'; bad = true; }
                else { text = 'Opens ' + tcFormatDate(t) + ' (in ' + tcLeftLabel(t - Date.now()) + ')!'; ok = true; }
                st.textContent = text;
                st.classList.toggle('bad', bad);
                $('sl-form-ok').disabled = !ok;
            };
            msg.addEventListener('input', check);
            when.addEventListener('input', check);
            when.addEventListener('change', check);
            onOk = () => tcBuildChip(body.querySelector('#sl-tc-label').value.trim() || 'Time Capsule', msg.value.trim(), new Date(when.value).getTime());
        }),
    };
    function toNewStyle() {
        try { localStorage.setItem('radii-mobile-style-bitbook', 'new'); } catch (e) {}
        location.href = 'new/';
    }

    function start() {
        if (!$('sl-tags-sheet')) return;
        const tagsBtn = $('sl-tags-btn'), skillsBtn = $('sl-skills-btn');
        [tagsBtn, skillsBtn].forEach((b) => b && b.addEventListener('mousedown', (e) => e.preventDefault()));
        if (tagsBtn) tagsBtn.addEventListener('click', () => { click(700); show($('sl-tags-sheet').hidden ? 'sl-tags-sheet' : null); });
        if (skillsBtn) skillsBtn.addEventListener('click', () => { click(700); show($('sl-skills-sheet').hidden ? 'sl-skills-sheet' : null); });
        $('sl-shield').addEventListener('click', hide);
        document.querySelectorAll('.sl-sheet .sl-x').forEach((x) => x.addEventListener('click', hide));
        $('sl-form-cancel').addEventListener('click', hide);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sl-shield').hidden) hide(); });
        document.querySelectorAll('#sl-tags-sheet [data-tag]').forEach((b) => b.addEventListener('click', () => { const f = TAGS[b.getAttribute('data-tag')]; if (f) f(); }));
        document.querySelectorAll('#sl-skills-sheet [data-skill]').forEach((b) => b.addEventListener('click', function () {
            const f = SKILLS[b.getAttribute('data-skill')];
            if (f) f(); else toNewStyle();
        }));
        $('sl-form-ok').addEventListener('click', function () {
            if (this.disabled || !onOk) return;
            const chip = onOk();
            if (!chip) return;
            hide();
            insertChip(chip);
        });

        // Tapping a chip in the note: flip, start/reset, roll, open, tick!
        const c = cv();
        if (!c) return;
        const ACT = [['.fl-chip', flFlip], ['.pm-chip', pmToggle], ['.dc-chip', dcRollChip], ['.tc-chip', tcToggleChip]];
        const chipAt = (t) => { for (const [sel, fn] of ACT) { const el = t && t.closest ? t.closest(sel) : null; if (el && c.contains(el)) return [el, fn]; } return null; };
        c.addEventListener('mousedown', (e) => { if (chipAt(e.target)) e.preventDefault(); });
        c.addEventListener('click', function (e) {
            const hit = chipAt(e.target);
            if (hit) { e.preventDefault(); hit[1](hit[0]); save(); return; }
            const box = e.target && e.target.closest ? e.target.closest('.tag-check-box') : null;
            if (box) { if (box.checked) box.setAttribute('checked', ''); else box.removeAttribute('checked'); save(); }
        });
        // a dropdown chip keeps its pick when the note is saved
        c.addEventListener('change', function (e) {
            const s = e.target;
            if (!s || !s.classList || !s.classList.contains('tag-drop-select')) return;
            Array.from(s.options).forEach((o) => { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
            save();
        });
        // running timers keep counting (their end time is saved on the chip), capsules count down too
        pmSweep();
        tcSweep();
        setInterval(tcSweep, 30000);
        try {
            new MutationObserver(function (recs) {
                for (const r of recs) if (r.type === 'childList' && r.addedNodes.length) { pmSweep(); tcSweep(); return; }
            }).observe(c, { childList: true, subtree: true });
        } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
