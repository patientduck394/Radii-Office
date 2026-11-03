// pro.js: what Excel, Numbers and LibreOffice Calc have that Imbuer didn't!
//   Data Validation   dropdown lists, number / date / text-length / custom rules, input messages, error alerts, Circle Invalid Data
//   Hyperlinks        links on any cell (web, email, or a place in this workbook), Ctrl/Cmd+K, Ctrl/Cmd+click to follow, HYPERLINK()
//   Pivot Tables      summarize a table by rows (and columns) into a new sheet, and refresh it
//   Goal Seek         find the input that makes a formula give the answer you want
//   Merge Cells       Merge & Center, Merge Across, Unmerge
// (Loaded after features.js: everything lives in the sheet, so undo, save and sharing all keep it!)
(function () {
    'use strict';
    if (typeof book === 'undefined' || typeof registerCommands !== 'function') return;
    const $ = (id) => document.getElementById(id);
    const esc = (s) => escapeHtml(String(s == null ? '' : s));
    const ensure = (s) => { if (!s.validation) s.validation = []; if (!s.merges) s.merges = []; if (!s.links) s.links = {}; return s; };
    const inR = (R, r, c) => r >= R.r0 && r <= R.r1 && c >= R.c0 && c <= R.c1;

    /* ======================================================================
       ICONS
       ====================================================================== */
    Object.assign(ICONS, {
        validation: '<rect x="3" y="4" width="14" height="6" rx="1.5"/><path d="M6 7h6"/><path d="M5 14l3 3 6-7"/><path d="M13.5 6.5l1.3 1.3 2.2-2.6"/>',
        link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
        pivot: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><path d="M12.5 13h5M12.5 17h5"/>',
        goalseek: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/><path d="M20 4l-6 6"/>',
        merge: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M8 12h8M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l-2 2"/>',
        circleBad: '<ellipse cx="12" cy="12" rx="9" ry="6"/><path d="M9.5 10l5 4M14.5 10l-5 4"/>',
    });

    /* ======================================================================
       DATA VALIDATION
       ====================================================================== */
    const OPS = [['between', 'between'], ['notBetween', 'not between'], ['eq', 'equal to'], ['ne', 'not equal to'], ['gt', 'greater than'], ['lt', 'less than'], ['gte', 'greater than or equal to'], ['lte', 'less than or equal to']];
    const TYPES = [['any', 'Any value'], ['list', 'List'], ['whole', 'Whole number'], ['decimal', 'Decimal'], ['date', 'Date'], ['length', 'Text length'], ['custom', 'Custom formula']];
    let bypass = false;
    let circles = false;

    function ruleAt(r, c, s) {
        s = ensure(s || sh());
        for (let i = s.validation.length - 1; i >= 0; i--) if (inR(s.validation[i].range, r, c)) return s.validation[i];
        return null;
    }
    // the items of a list rule: "Yes,No,Maybe" typed in, or a range like =$A$1:$A$5 / =Sheet2!A1:A9
    function listItems(rule) {
        const src = String(rule.list || '').trim();
        if (!src) return [];
        if (src[0] !== '=') return src.split(',').map((x) => x.trim()).filter((x) => x !== '');
        const body = src.slice(1).trim();
        let sheetName = null, ref = body;
        const bang = body.lastIndexOf('!');
        if (bang >= 0) { sheetName = body.slice(0, bang).replace(/^'|'$/g, ''); ref = body.slice(bang + 1); }
        const parts = ref.replace(/\$/g, '').split(':');
        const a = parseCellId(parts[0]), b = parseCellId(parts[1] || parts[0]);
        if (!a || !b || isNaN(a.row)) return [];
        const si = sheetName ? book.sheets.findIndex((x) => x.name === sheetName) : book.active;
        if (si < 0) return [];
        const out = [];
        for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
            const v = valueAt(r, c, si);
            const t = v === null || v === undefined ? '' : (typeof v === 'object' ? '' : String(v));
            if (t !== '' && !out.includes(t)) out.push(t);
        }
        return out;
    }
    function litNum(text, type) {
        const lit = FormulaEngine.parseLiteral(String(text));
        if (type === 'date') return typeof lit.value === 'number' && lit.fmt === 'date' ? lit.value : null;
        return typeof lit.value === 'number' ? lit.value : null;
    }
    // the rule's number limits, which may be numbers, dates or formulas (=B1)
    function limitOf(txt, type, r, c) {
        txt = String(txt == null ? '' : txt).trim();
        if (txt === '') return null;
        if (txt[0] === '=') { const v = FormulaEngine.computeFormula(txt, sh().data); return typeof v === 'number' ? v : null; }
        return litNum(txt, type === 'date' ? 'date' : 'num');
    }
    // null when the typed text is fine, otherwise the reason it isn't
    function invalidReason(rule, text, r, c, s) {
        s = s || sh();
        text = String(text == null ? '' : text);
        if (text === '') return rule.blank === false ? 'This cell cannot be left empty.' : null;
        if (rule.type === 'any') return null;
        if (rule.type === 'list') {
            const items = listItems(rule);
            return items.some((x) => x.toLowerCase() === text.trim().toLowerCase()) ? null : 'The value must be one of: ' + items.slice(0, 8).join(', ') + (items.length > 8 ? '…' : '') + '.';
        }
        if (rule.type === 'custom') {
            const first = { r: rule.range.r0, c: rule.range.c0 };
            let f = String(rule.v1 || '').trim();
            if (f[0] !== '=') f = '=' + f;
            const shifted = FormulaEngine.shiftFormula(f, r - first.r, c - first.c);
            const data = Object.assign({}, s.data); data[idOf(r, c)] = text;
            const v = FormulaEngine.computeFormula(shifted, data);
            return v === true || v === 'TRUE' || (typeof v === 'number' && v !== 0) ? null : 'The value does not meet the rule.';
        }
        let x;
        if (rule.type === 'length') x = text.length;
        else {
            x = litNum(text, rule.type);
            if (x === null) return rule.type === 'date' ? 'Enter a date.' : 'Enter a number.';
            if (rule.type === 'whole' && !Number.isInteger(x)) return 'Enter a whole number.';
        }
        const a = limitOf(rule.v1, rule.type, r, c), b = limitOf(rule.v2, rule.type, r, c);
        if (a === null) return null;
        const label = (v) => (rule.type === 'date' ? FormulaEngine.formatPattern(v, 'yyyy-mm-dd') : String(v));
        switch (rule.op) {
            case 'between': return b === null || (x >= Math.min(a, b) && x <= Math.max(a, b)) ? null : 'Enter a value between ' + label(a) + ' and ' + label(b) + '.';
            case 'notBetween': return b === null || x < Math.min(a, b) || x > Math.max(a, b) ? null : 'Enter a value outside ' + label(a) + ' to ' + label(b) + '.';
            case 'eq': return x === a ? null : 'The value must equal ' + label(a) + '.';
            case 'ne': return x !== a ? null : 'The value must not equal ' + label(a) + '.';
            case 'gt': return x > a ? null : 'The value must be greater than ' + label(a) + '.';
            case 'lt': return x < a ? null : 'The value must be less than ' + label(a) + '.';
            case 'gte': return x >= a ? null : 'The value must be at least ' + label(a) + '.';
            case 'lte': return x <= a ? null : 'The value must be at most ' + label(a) + '.';
        }
        return null;
    }
    function isInvalid(r, c, s) {
        s = s || sh();
        const rule = ruleAt(r, c, s);
        if (!rule || rule.type === 'any') return false;
        const raw = s.data[idOf(r, c)];
        if (raw === undefined || raw === '') return false;
        const v = valueAt(r, c, book.sheets.indexOf(s));
        const text = typeof raw === 'string' && raw[0] === '=' ? (v === null || typeof v === 'object' ? '' : String(v)) : String(raw);
        return invalidReason(rule, text, r, c, s) !== null;
    }

    // typing a value that breaks a rule: Stop blocks it, Warning and Information ask first
    function guardCommit() {
        const _commit = commitEdit;
        commitEdit = function (dr, dc, allCells) {
            if (!bypass && typeof isEditing === 'function' && isEditing() && edit) {
                const E = edit, s = book.sheets[E.si];
                const rule = s && ruleAt(E.r, E.c, s);
                let val = activeInput().value;
                if (rule && rule.type !== 'any' && val[0] !== '=') {
                    const why = invalidReason(rule, val, E.r, E.c, s);
                    if (why) {
                        showAlert(rule, why, () => { bypass = true; try { _commit.call(null, dr, dc, allCells); } finally { bypass = false; } });
                        return;
                    }
                }
            }
            return _commit.apply(this, arguments);
        };
    }
    async function showAlert(rule, why, proceed) {
        const style = rule.alert || 'stop';
        const icon = style === 'stop' ? '⛔' : style === 'warning' ? '⚠️' : 'ℹ️';
        const title = rule.errTitle || (style === 'stop' ? 'Invalid entry' : style === 'warning' ? 'Check this entry' : 'Entry notice');
        const msg = rule.errMsg || why;
        const body = `<p class="dlg-text"><span style="font-size:22px;margin-right:8px">${icon}</span>${esc(msg)}</p>${rule.errMsg ? '' : ''}`;
        if (style === 'stop') {
            const r = await openDialog({ title, body, width: 380, buttons: [{ label: 'Retry', value: 'retry', primary: true }, { label: 'Cancel entry', value: 'cancel' }] });
            if (r.value === 'cancel' || r.value === null) { cancelEdit(); }
            else { const ed = activeInput(); if (ed) { ed.focus(); if (ed.select) ed.select(); } }
            return;
        }
        const r = await openDialog({ title, body: body + (style === 'warning' ? '<p class="dlg-text">Do you want to keep the entry anyway?</p>' : '<p class="dlg-text">Keep the entry?</p>'), width: 400, buttons: [{ label: 'Yes', value: 'yes', primary: true }, { label: 'No', value: 'no' }] });
        if (r.value === 'yes') proceed();
        else { const ed = activeInput(); if (ed) { ed.focus(); if (ed.select) ed.select(); } }
    }

    /* the dropdown arrow and the input message next to the active cell */
    let dvArrow = null, dvMenu = null, dvTip = null;
    function ensureDvEls() {
        const inner = $('grid-inner');
        if (!inner || dvArrow) return;
        dvArrow = document.createElement('button');
        dvArrow.id = 'dv-arrow'; dvArrow.type = 'button'; dvArrow.tabIndex = -1; dvArrow.title = 'Choose from the list (Alt+↓)';
        dvArrow.innerHTML = '<svg viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>';
        dvArrow.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); toggleDvMenu(); });
        inner.appendChild(dvArrow);
        dvTip = document.createElement('div'); dvTip.id = 'dv-tip'; inner.appendChild(dvTip);
    }
    function closeDvMenu() { if (dvMenu) { dvMenu.remove(); dvMenu = null; } }
    function toggleDvMenu() {
        if (dvMenu) { closeDvMenu(); return; }
        const rule = ruleAt(sel.act.r, sel.act.c);
        if (!rule || rule.type !== 'list') return;
        const items = listItems(rule);
        const inner = $('grid-inner');
        const rc = cellRect(sel.act.r, sel.act.c);
        dvMenu = document.createElement('div');
        dvMenu.id = 'dv-menu';
        const s = sh(), id = idOf(sel.act.r, sel.act.c), cur = String(s.data[id] === undefined ? '' : s.data[id]);
        dvMenu.innerHTML = items.length ? items.map((it, i) => `<button type="button" class="dv-item${it === cur ? ' on' : ''}" data-i="${i}">${esc(it)}</button>`).join('') : '<div class="dv-empty">The list is empty!</div>';
        dvMenu.style.left = rc.x + 'px'; dvMenu.style.top = (rc.y + rc.h + 1) + 'px'; dvMenu.style.minWidth = Math.max(rc.w, 90) + 'px';
        dvMenu.addEventListener('mousedown', (e) => e.preventDefault());
        dvMenu.addEventListener('click', (e) => {
            const b = e.target.closest('.dv-item'); if (!b) return;
            const val = items[+b.dataset.i], r = sel.act.r, c = sel.act.c;
            closeDvMenu();
            change(() => { setRaw(sh(), r, c, val); autoFormat(sh(), r, c, val); }, { skipFlash: id });
            animCell(r, c, 'in');
            updateDvUi();
        });
        inner.appendChild(dvMenu);
        setTimeout(() => document.addEventListener('mousedown', function off(e) { if (!dvMenu || dvMenu.contains(e.target) || e.target === dvArrow || (dvArrow && dvArrow.contains(e.target))) return; closeDvMenu(); document.removeEventListener('mousedown', off, true); }, true), 0);
    }
    function updateDvUi() {
        ensureDvEls();
        if (!dvArrow) return;
        closeDvMenu();
        const s = sh(), r = sel.act.r, c = sel.act.c;
        const rule = r >= 1 && r <= s.rows ? ruleAt(r, c, s) : null;
        if (rule && rule.type === 'list' && rule.dropdown !== false) {
            const rc = cellRect(r, c);
            dvArrow.style.display = 'flex';
            dvArrow.style.left = (rc.x + rc.w - 18) + 'px'; dvArrow.style.top = (rc.y + Math.max(0, (rc.h - 18) / 2)) + 'px';
        } else dvArrow.style.display = 'none';
        if (rule && (rule.inMsg || rule.inTitle) && !isEditingNow()) {
            const rc = cellRect(r, c);
            dvTip.innerHTML = (rule.inTitle ? `<b>${esc(rule.inTitle)}</b>` : '') + esc(rule.inMsg || '');
            dvTip.style.left = (rc.x + 6) + 'px'; dvTip.style.top = (rc.y + rc.h + 6) + 'px'; dvTip.style.display = 'block';
        } else if (dvTip) dvTip.style.display = 'none';
        drawCircles();
    }
    const isEditingNow = () => { try { return isEditing(); } catch (e) { return false; } };
    let circleEls = [];
    function drawCircles() {
        circleEls.forEach((e) => e.remove()); circleEls = [];
        if (!circles) return;
        const inner = $('grid-inner'), s = sh();
        ensure(s);
        let n = 0;
        for (const rule of s.validation) {
            const R = rule.range;
            for (let r = R.r0; r <= Math.min(R.r1, s.rows); r++) for (let c = R.c0; c <= Math.min(R.c1, s.cols - 1); c++) {
                if (n > 800) return;
                if (ruleAt(r, c, s) !== rule || !isInvalid(r, c, s)) continue;
                const rc = cellRect(r, c), d = document.createElement('div');
                d.className = 'dv-circle'; d.style.cssText = `left:${rc.x - 3}px;top:${rc.y - 2}px;width:${rc.w + 6}px;height:${rc.h + 4}px`;
                inner.appendChild(d); circleEls.push(d); n++;
            }
        }
    }

    /* the Data Validation dialog */
    function selectedRange() { const R = rng(); return { r0: R.r0, r1: R.r1, c0: R.c0, c1: R.c1 }; }
    async function validationDialog() {
        const s = ensure(sh()), R = selectedRange();
        const old = ruleAt(sel.act.r, sel.act.c, s);
        const v = old || { type: 'any', op: 'between', v1: '', v2: '', list: '', blank: true, dropdown: true, alert: 'stop', errTitle: '', errMsg: '', inTitle: '', inMsg: '' };
        const opts = (arr, cur) => arr.map(([k, l]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${l}</option>`).join('');
        const body = `<div class="dv-dlg">
            <div class="dv-tabs"><button type="button" class="on" data-t="0">Settings</button><button type="button" data-t="1">Input Message</button><button type="button" data-t="2">Error Alert</button></div>
            <div class="dv-pane" data-p="0">
                <label class="dlg-field"><span>Allow</span><select id="dv-type" class="dlg-input">${opts(TYPES, v.type)}</select></label>
                <div id="dv-op-row"><label class="dlg-field"><span>Data</span><select id="dv-op" class="dlg-input">${opts(OPS, v.op)}</select></label></div>
                <div id="dv-list-row"><label class="dlg-field"><span>Source (items separated by commas, or a range like =$A$1:$A$5)</span><input id="dv-list" class="dlg-input" value="${esc(v.list)}" spellcheck="false" placeholder="Yes, No, Maybe"></label>
                    <label class="dlg-check"><input type="checkbox" id="dv-dd" ${v.dropdown !== false ? 'checked' : ''}> In-cell dropdown</label></div>
                <div id="dv-v1-row"><label class="dlg-field"><span id="dv-v1-lbl">Minimum</span><input id="dv-v1" class="dlg-input" value="${esc(v.v1)}" spellcheck="false"></label></div>
                <div id="dv-v2-row"><label class="dlg-field"><span>Maximum</span><input id="dv-v2" class="dlg-input" value="${esc(v.v2)}" spellcheck="false"></label></div>
                <label class="dlg-check"><input type="checkbox" id="dv-blank" ${v.blank !== false ? 'checked' : ''}> Ignore blank</label>
                <p class="dlg-text small" id="dv-range-note">Applies to ${rangeText(R)}${old ? ' (this changes the rule on these cells)' : ''}.</p>
            </div>
            <div class="dv-pane" data-p="1" hidden>
                <label class="dlg-field"><span>Title</span><input id="dv-intitle" class="dlg-input" maxlength="40" value="${esc(v.inTitle)}"></label>
                <label class="dlg-field"><span>Message shown when the cell is selected</span><textarea id="dv-inmsg" class="dlg-input" rows="3">${esc(v.inMsg)}</textarea></label>
            </div>
            <div class="dv-pane" data-p="2" hidden>
                <label class="dlg-field"><span>Style</span><select id="dv-alert" class="dlg-input">${opts([['stop', 'Stop (blocks the entry)'], ['warning', 'Warning (asks first)'], ['info', 'Information (asks first)']], v.alert)}</select></label>
                <label class="dlg-field"><span>Title</span><input id="dv-errtitle" class="dlg-input" maxlength="40" value="${esc(v.errTitle)}"></label>
                <label class="dlg-field"><span>Message (leave empty for a standard one)</span><textarea id="dv-errmsg" class="dlg-input" rows="3">${esc(v.errMsg)}</textarea></label>
            </div></div>`;
        const r = await openDialog({
            title: 'Data Validation', width: 440, body,
            buttons: [{ label: 'Clear All', value: 'clear', danger: true }, { label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: null }],
            onOpen: (dlg) => {
                const q = (id) => dlg.querySelector('#' + id);
                const upd = () => {
                    const t = q('dv-type').value, op = q('dv-op').value;
                    q('dv-op-row').style.display = ['whole', 'decimal', 'date', 'length'].includes(t) ? '' : 'none';
                    q('dv-list-row').style.display = t === 'list' ? '' : 'none';
                    const num = ['whole', 'decimal', 'date', 'length'].includes(t) || t === 'custom';
                    q('dv-v1-row').style.display = num ? '' : 'none';
                    q('dv-v2-row').style.display = ['whole', 'decimal', 'date', 'length'].includes(t) && (op === 'between' || op === 'notBetween') ? '' : 'none';
                    q('dv-v1-lbl').textContent = t === 'custom' ? 'Formula (true means the entry is allowed)' : (op === 'between' || op === 'notBetween' ? 'Minimum' : 'Value');
                    q('dv-v1').placeholder = t === 'custom' ? '=COUNTIF($A:$A,A1)=1' : t === 'date' ? 'e.g. 2026-01-01' : 'e.g. 10';
                };
                q('dv-type').addEventListener('change', upd); q('dv-op').addEventListener('change', upd); upd();
                dlg.querySelectorAll('.dv-tabs button').forEach((b) => b.addEventListener('click', () => {
                    dlg.querySelectorAll('.dv-tabs button').forEach((x) => x.classList.toggle('on', x === b));
                    dlg.querySelectorAll('.dv-pane').forEach((p) => { p.hidden = p.dataset.p !== b.dataset.t; });
                }));
            },
        });
        if (r.value === null) return;
        if (r.value === 'clear') { clearValidation(); return; }
        const q = (id) => r.el.querySelector('#' + id);
        const rule = { range: R, type: q('dv-type').value, op: q('dv-op').value, v1: q('dv-v1').value.trim(), v2: q('dv-v2').value.trim(), list: q('dv-list').value.trim(), blank: q('dv-blank').checked, dropdown: q('dv-dd').checked, alert: q('dv-alert').value, errTitle: q('dv-errtitle').value.trim(), errMsg: q('dv-errmsg').value.trim(), inTitle: q('dv-intitle').value.trim(), inMsg: q('dv-inmsg').value.trim() };
        change(() => {
            // the new rule replaces what it covers
            s.validation = s.validation.filter((x) => !(x.range.r0 >= R.r0 && x.range.r1 <= R.r1 && x.range.c0 >= R.c0 && x.range.c1 <= R.c1));
            if (rule.type !== 'any' || rule.inMsg || rule.inTitle) s.validation.push(rule);
        });
        toast(rule.type === 'any' && !rule.inMsg && !rule.inTitle ? 'Validation removed!' : 'Data validation set for ' + rangeText(R) + '!');
        updateDvUi();
    }
    function clearValidation() {
        const s = ensure(sh()), R = selectedRange();
        const before = s.validation.length;
        change(() => { s.validation = s.validation.filter((x) => !(x.range.r1 >= R.r0 && x.range.r0 <= R.r1 && x.range.c1 >= R.c0 && x.range.c0 <= R.c1)); });
        toast(before === s.validation.length ? 'No validation here!' : 'Validation cleared!');
        updateDvUi();
    }
    function toggleCircles() {
        circles = !circles;
        const s = ensure(sh());
        let bad = 0;
        if (circles) for (const rule of s.validation) for (let r = rule.range.r0; r <= Math.min(rule.range.r1, s.rows); r++) for (let c = rule.range.c0; c <= Math.min(rule.range.c1, s.cols - 1); c++) if (ruleAt(r, c, s) === rule && isInvalid(r, c, s)) bad++;
        drawCircles();
        toast(circles ? (bad ? 'Circled ' + bad + ' invalid ' + (bad === 1 ? 'cell' : 'cells') + '!' : 'Every cell passes its rule!') : 'Circles cleared!');
    }

    /* ======================================================================
       HYPERLINKS
       ====================================================================== */
    function linkOf(r, c, s) {
        s = ensure(s || sh());
        const id = idOf(r, c);
        if (s.links[id]) return s.links[id];
        const raw = s.data[id];
        if (typeof raw === 'string' && /^=\s*HYPERLINK\s*\(/i.test(raw)) {
            const inner = raw.replace(/^=\s*HYPERLINK\s*\(/i, '').replace(/\)\s*$/, '');
            // the first argument: a "quoted address" or any formula
            let depth = 0, q = false, cut = inner.length;
            for (let i = 0; i < inner.length; i++) { const ch = inner[i]; if (ch === '"') q = !q; else if (!q) { if (ch === '(') depth++; else if (ch === ')') depth--; else if (ch === ',' && depth === 0) { cut = i; break; } } }
            const arg = inner.slice(0, cut).trim();
            const v = FormulaEngine.computeFormula('=' + arg, s.data);
            if (typeof v === 'string' && v) return { url: v, fromFormula: true };
        }
        return null;
    }
    function followLink(link) {
        let url = String(link.url || '').trim();
        if (!url) return;
        if (url[0] === '#') {
            const m = /^#(?:'([^']+)'|([^!]+))?!?\$?([A-Z]+)\$?(\d+)/i.exec(url.replace(/^#/, '#'));
            const body = url.slice(1);
            let sheetName = null, ref = body; const bang = body.lastIndexOf('!');
            if (bang >= 0) { sheetName = body.slice(0, bang).replace(/^'|'$/g, ''); ref = body.slice(bang + 1); }
            const si = sheetName ? book.sheets.findIndex((x) => x.name === sheetName) : book.active;
            if (si < 0) { toast('That sheet is not in this workbook!'); return; }
            const p = parseCellId(ref.replace(/\$/g, '').split(':')[0]);
            if (si !== book.active) switchSheet(si);
            if (p && !isNaN(p.row)) { selectCell(p.row, p.col); scrollIntoView(p.row, p.col); }
            toast('Jumped to ' + body + '!');
            return;
        }
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) url = 'mailto:' + url;
        else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
        if (/^\s*(javascript|data|vbscript):/i.test(url)) { toast('That link type is not allowed!'); return; }
        window.open(url, '_blank', 'noopener');
    }
    async function linkDialog() {
        const s = ensure(sh()), r = sel.act.r, c = sel.act.c, id = idOf(r, c);
        const cur = s.links[id], raw = s.data[id];
        const text = typeof raw === 'string' && raw[0] !== '=' ? raw : '';
        const isDoc = cur && cur.url && cur.url[0] === '#';
        const sheetOpts = book.sheets.map((x, i) => `<option value="${esc(x.name)}"${isDoc && cur.url.slice(1).startsWith(x.name + '!') ? ' selected' : (!isDoc && i === book.active ? ' selected' : '')}>${esc(x.name)}</option>`).join('');
        const body = `<div class="dv-dlg">
            <div class="dv-tabs"><button type="button" class="${isDoc ? '' : 'on'}" data-t="0">Web page or email</button><button type="button" class="${isDoc ? 'on' : ''}" data-t="1">Place in this workbook</button></div>
            <label class="dlg-field"><span>Text to display</span><input id="lk-text" class="dlg-input" value="${esc((cur && cur.text) || text)}"></label>
            <div class="dv-pane" data-p="0" ${isDoc ? 'hidden' : ''}><label class="dlg-field"><span>Address</span><input id="lk-url" class="dlg-input" value="${esc(cur && !isDoc ? cur.url : '')}" spellcheck="false" placeholder="https://example.com or name@example.com"></label></div>
            <div class="dv-pane" data-p="1" ${isDoc ? '' : 'hidden'}>
                <label class="dlg-field"><span>Sheet</span><select id="lk-sheet" class="dlg-input">${sheetOpts}</select></label>
                <label class="dlg-field"><span>Cell</span><input id="lk-cell" class="dlg-input" value="${esc(isDoc ? cur.url.slice(1).split('!').pop() : 'A1')}" spellcheck="false"></label></div></div>`;
        const res = await openDialog({
            title: 'Link', width: 430, body,
            buttons: cur ? [{ label: 'Remove Link', value: 'rm', danger: true }, { label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: null }] : [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: null }],
            onOpen: (dlg) => dlg.querySelectorAll('.dv-tabs button').forEach((b) => b.addEventListener('click', () => {
                dlg.querySelectorAll('.dv-tabs button').forEach((x) => x.classList.toggle('on', x === b));
                dlg.querySelectorAll('.dv-pane').forEach((p) => { p.hidden = p.dataset.p !== b.dataset.t; });
            })),
            validate: (dlg, v) => { if (v !== 'ok') return true; const onDoc = !dlg.querySelector('.dv-pane[data-p="1"]').hidden; const val = onDoc ? dlg.querySelector('#lk-cell').value : dlg.querySelector('#lk-url').value; if (!val.trim()) { toast('Type an address first!'); return false; } return true; },
        });
        if (res.value === null) return;
        if (res.value === 'rm') { removeLink(); return; }
        const q = (i) => res.el.querySelector('#' + i);
        const onDoc = !res.el.querySelector('.dv-pane[data-p="1"]').hidden;
        const url = onDoc ? '#' + q('lk-sheet').value + '!' + q('lk-cell').value.trim().toUpperCase().replace(/\$/g, '') : q('lk-url').value.trim();
        const disp = q('lk-text').value;
        change(() => {
            s.links[id] = { url: url };
            const shown = disp || (typeof raw === 'string' && raw && raw[0] !== '=' ? raw : url.replace(/^#/, '').replace(/^mailto:/, ''));
            if (!(typeof raw === 'string' && raw[0] === '=' && !disp)) setRaw(s, r, c, shown);
        });
        toast('Link added! Hold ' + (isMac() ? '⌘' : 'Ctrl') + ' and click it to follow it!');
    }
    function removeLink() {
        const s = ensure(sh()), R = selectedRange();
        let n = 0;
        change(() => { for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) { const id = idOf(r, c); if (s.links[id]) { delete s.links[id]; n++; } } });
        toast(n ? 'Link removed!' : 'No link here!');
    }

    /* ======================================================================
       PIVOT TABLES
       ====================================================================== */
    const AGG = { sum: 'Sum', count: 'Count', average: 'Average', max: 'Maximum', min: 'Minimum', counta: 'Count (not empty)' };
    function readTable(srcSheet, R) {
        const si = book.sheets.indexOf(srcSheet), head = [];
        for (let c = R.c0; c <= R.c1; c++) { const v = valueAt(R.r0, c, si); head.push(v === null || v === undefined || v === '' ? 'Column ' + getColumnName(c) : String(plainValue(v))); }
        const rows = [];
        for (let r = R.r0 + 1; r <= R.r1; r++) { const row = []; let any = false; for (let c = R.c0; c <= R.c1; c++) { let v = valueAt(r, c, si); v = isErrVal(v) ? null : plainValue(v); if (v !== null && v !== undefined && v !== '') any = true; row.push(v === undefined ? null : v); } if (any) rows.push(row); }
        return { head, rows };
    }
    function aggregate(vals, fn) {
        const n = vals.filter((v) => typeof v === 'number');
        switch (fn) {
            case 'count': return n.length;
            case 'counta': return vals.filter((v) => v !== null && v !== '').length;
            case 'average': return n.length ? n.reduce((a, b) => a + b, 0) / n.length : '';
            case 'max': return n.length ? Math.max(...n) : '';
            case 'min': return n.length ? Math.min(...n) : '';
            default: return n.reduce((a, b) => a + b, 0);
        }
    }
    const keyOf = (v) => (v === null || v === undefined || v === '' ? '(blank)' : String(v));
    function buildPivot(def) {
        const src = book.sheets.find((x) => x.id === def.src);
        if (!src) return null;
        const t = readTable(src, def.range), hi = (n) => t.head.indexOf(n);
        const ri = hi(def.rows), ci = def.cols ? hi(def.cols) : -1, vi = hi(def.val);
        if (ri < 0 || vi < 0) return null;
        const order = (arr) => arr.slice().sort((a, b) => { const na = Number(a), nb = Number(b); return !isNaN(na) && !isNaN(nb) ? na - nb : String(a).localeCompare(String(b), undefined, { numeric: true }); });
        const rKeys = order([...new Set(t.rows.map((r) => keyOf(r[ri])))]), cKeys = ci >= 0 ? order([...new Set(t.rows.map((r) => keyOf(r[ci])))]) : [];
        const cell = (rk, ck) => aggregate(t.rows.filter((r) => keyOf(r[ri]) === rk && (ck === null || keyOf(r[ci]) === ck)).map((r) => r[vi]), def.fn);
        const label = AGG[def.fn] + ' of ' + def.val;
        const out = [], R = [];
        if (ci >= 0) {
            out.push([label, ...cKeys.map(() => ''), def.totals ? '' : undefined].filter((x) => x !== undefined)); out[0][1] = def.cols;
            out.push([def.rows, ...cKeys, ...(def.totals ? ['Grand Total'] : [])]);
            rKeys.forEach((rk) => out.push([rk, ...cKeys.map((ck) => cell(rk, ck)), ...(def.totals ? [cell(rk, null)] : [])]));
            if (def.totals) out.push(['Grand Total', ...cKeys.map((ck) => aggregate(t.rows.filter((r) => keyOf(r[ci]) === ck).map((r) => r[vi]), def.fn)), aggregate(t.rows.map((r) => r[vi]), def.fn)]);
        } else {
            out.push([def.rows, label]);
            rKeys.forEach((rk) => out.push([rk, cell(rk, null)]));
            if (def.totals) out.push(['Grand Total', aggregate(t.rows.map((r) => r[vi]), def.fn)]);
        }
        return { grid: out, header: ci >= 0 ? 1 : 0, total: def.totals, hasCols: ci >= 0, cols: out[0].length };
    }
    function fillPivot(ns, def) {
        const P = buildPivot(def);
        if (!P) return false;
        ns.data = {}; ns.styles = {};
        const head = { b: true, fill: '#dbeafe', color: '#1e3a8a' }, tot = { b: true, fill: '#f1f5f9' };
        P.grid.forEach((row, ri) => row.forEach((v, ci) => {
            if (v === '' || v === undefined || v === null) return;
            const id = idOf(ri + 1, ci);
            ns.data[id] = typeof v === 'number' ? String(Math.round(v * 1e9) / 1e9) : String(v);
            const isHead = ri <= P.header, isTot = P.total && (ri === P.grid.length - 1 || (P.hasCols && ci === row.length - 1)) && !isHead;
            if (isHead) ns.styles[id] = Object.assign({}, head); else if (isTot) ns.styles[id] = Object.assign({}, tot);
            else if (ci === 0) ns.styles[id] = { b: true };
        }));
        ns.rows = Math.max(ns.rows, P.grid.length + 5); ns.cols = Math.max(ns.cols, P.cols + 2);
        ns.colW = { 0: 130 };
        ns.pivot = def;
        return true;
    }
    async function pivotDialog() {
        const s = sh(), R0 = rng();
        let R = rangeSize(R0) > 1 ? R0 : currentRegion(sel.act.r, sel.act.c);
        if (!R || R.r1 <= R.r0 || R.c1 <= R.c0) { toast('Click inside a table with a header row first!'); return; }
        const T = readTable(s, R);
        const opts = (list, none) => (none ? '<option value="">(none)</option>' : '') + list.map((n) => `<option>${esc(n)}</option>`).join('');
        const numericCols = T.head.filter((h, i) => T.rows.some((r) => typeof r[i] === 'number'));
        const body = `<p class="dlg-text">Summarize <b>${rangeText(R)}</b> (${T.rows.length} rows) into a new sheet!</p>
            <label class="dlg-field"><span>Rows (the groups down the side)</span><select id="pv-rows" class="dlg-input">${opts(T.head)}</select></label>
            <label class="dlg-field"><span>Columns (optional, groups across the top)</span><select id="pv-cols" class="dlg-input">${opts(T.head, true)}</select></label>
            <label class="dlg-field"><span>Values (what to calculate)</span><select id="pv-val" class="dlg-input">${opts(numericCols.length ? numericCols.concat(T.head.filter((h) => !numericCols.includes(h))) : T.head)}</select></label>
            <label class="dlg-field"><span>Calculate with</span><select id="pv-fn" class="dlg-input">${Object.keys(AGG).map((k) => `<option value="${k}">${AGG[k]}</option>`).join('')}</select></label>
            <label class="dlg-check"><input type="checkbox" id="pv-tot" checked> Show grand totals</label>`;
        const r = await openDialog({ title: 'PivotTable', width: 420, body, buttons: [{ label: 'Create', value: 'ok', primary: true }, { label: 'Cancel', value: null }],
            onOpen: (dlg) => { const first = dlg.querySelector('#pv-rows'), val = dlg.querySelector('#pv-val'); if (first.value === val.value) for (let i = 0; i < val.options.length; i++) if (val.options[i].value !== first.value) { val.selectedIndex = i; break; } } });
        if (r.value !== 'ok') return;
        const q = (i) => r.el.querySelector('#' + i);
        const def = { src: s.id, range: { r0: R.r0, r1: R.r1, c0: R.c0, c1: R.c1 }, rows: q('pv-rows').value, cols: q('pv-cols').value, val: q('pv-val').value, fn: q('pv-fn').value, totals: q('pv-tot').checked };
        if (def.cols && def.cols === def.rows) def.cols = '';
        let n = 1; const names = new Set(book.sheets.map((x) => x.name));
        while (names.has('PivotTable' + n)) n++;
        const ns = newSheet('PivotTable' + n);
        if (!fillPivot(ns, def)) { toast('Pick different fields!'); return; }
        change(() => { book.sheets.push(ns); }, { rebuild: true });
        switchSheet(book.sheets.length - 1);
        renderSheetTabs();
        toast('PivotTable made! Change the source data, then press Refresh PivotTable!');
    }
    function refreshPivot() {
        const s = sh();
        if (!s.pivot) { toast('Open a PivotTable sheet first!'); return; }
        change(() => { fillPivot(s, s.pivot); }, { rebuild: true });
        toast('PivotTable refreshed!');
    }

    /* ======================================================================
       GOAL SEEK
       ====================================================================== */
    async function goalSeek() {
        const s = sh();
        const body = `<p class="dlg-text">Find the number to put in one cell so that a formula gives the answer you want!</p>
            <label class="dlg-field"><span>Set cell (a cell with a formula)</span><input id="gs-set" class="dlg-input" value="${esc(idOf(sel.act.r, sel.act.c))}" spellcheck="false"></label>
            <label class="dlg-field"><span>To value</span><input id="gs-val" class="dlg-input" value="" placeholder="e.g. 1000"></label>
            <label class="dlg-field"><span>By changing cell (a cell with a number)</span><input id="gs-by" class="dlg-input" value="" spellcheck="false" placeholder="e.g. B1"></label>`;
        const r = await openDialog({ title: 'Goal Seek', width: 420, body, buttons: [{ label: 'Solve', value: 'ok', primary: true }, { label: 'Cancel', value: null }] });
        if (r.value !== 'ok') return;
        const q = (i) => r.el.querySelector('#' + i).value.trim();
        const setP = parseCellId(q('gs-set').toUpperCase().replace(/\$/g, '')), byP = parseCellId(q('gs-by').toUpperCase().replace(/\$/g, '')), target = Number(q('gs-val'));
        if (!setP || !byP || isNaN(setP.row) || isNaN(byP.row) || q('gs-val') === '' || !isFinite(target)) { toast('Fill in all three boxes (the value must be a number)!'); return; }
        const setId = idOf(setP.row, setP.col), byId = idOf(byP.row, byP.col);
        if (!(typeof s.data[setId] === 'string' && s.data[setId][0] === '=')) { toast('The Set cell must contain a formula!'); return; }
        const sheetsCopy = () => book.sheets.map((x) => ({ name: x.name, data: Object.assign({}, x.data), rows: x.rows, cols: x.cols }));
        const f = (x) => {
            const sc = sheetsCopy(); sc[book.active].data[byId] = String(x);
            const v = FormulaEngine.evaluateWorkbook(sc).values[book.active][setId];
            const n = FormulaEngine.isErr(v) ? NaN : (typeof v === 'number' ? v : Number(v));
            return n - target;
        };
        const start = Number(s.data[byId]); let x0 = isFinite(start) ? start : 0;
        let best = null;
        // secant, then bisection if that stalls
        let f0 = f(x0), x1 = x0 + (Math.abs(x0) > 1e-6 ? Math.abs(x0) * 0.1 : 1), f1 = f(x1);
        for (let i = 0; i < 80 && isFinite(f1); i++) {
            if (Math.abs(f1) < 1e-9) { best = x1; break; }
            if (f1 === f0) break;
            const x2 = x1 - f1 * (x1 - x0) / (f1 - f0);
            x0 = x1; f0 = f1; x1 = x2; f1 = f(x1);
        }
        if (best === null && isFinite(f1) && Math.abs(f1) < 1e-6) best = x1;
        if (best === null) {
            let lo = -1e6, hi = 1e6, flo = f(lo), fhi = f(hi);
            if (isFinite(flo) && isFinite(fhi) && flo * fhi <= 0) { for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (!isFinite(fm)) break; if (Math.abs(fm) < 1e-9) { best = mid; break; } if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } best = mid; } }
        }
        if (best === null || !isFinite(best) || Math.abs(f(best)) > 1e-4 * Math.max(1, Math.abs(target))) {
            await openDialog({ title: 'Goal Seek', body: '<p class="dlg-text">Goal Seek could not find a solution. Try a starting number closer to the answer in the changing cell, or check that the formula really depends on it!</p>', buttons: [{ label: 'OK', value: 'ok', primary: true }] });
            return;
        }
        const nice = Math.abs(best) < 1e12 ? String(Math.round(best * 1e9) / 1e9) : String(best);
        const ans = await openDialog({ title: 'Goal Seek', width: 400, body: `<p class="dlg-text">Found a solution! Setting <b>${esc(byId)}</b> to <b>${esc(nice)}</b> makes <b>${esc(setId)}</b> equal ${esc(String(target))}.</p>`, buttons: [{ label: 'Keep it', value: 'ok', primary: true }, { label: 'Cancel', value: null }] });
        if (ans.value !== 'ok') return;
        change(() => { setRaw(s, byP.row, byP.col, nice); });
        toast('Goal reached! ' + byId + ' is now ' + nice + '!');
    }

    /* ======================================================================
       MERGE CELLS
       ====================================================================== */
    function mergeAt(r, c, s) {
        s = ensure(s || sh());
        for (const m of s.merges) if (inR(m, r, c)) return m;
        return null;
    }
    const isCovered = (r, c, s) => { const m = mergeAt(r, c, s); return !!m && !(m.r0 === r && m.c0 === c); };
    function mergeCells(mode) {
        const s = ensure(sh()), R = selectedRange();
        if (rangeSize(R) < 2) { toast('Select two or more cells to merge!'); return; }
        const pieces = mode === 'across' ? Array.from({ length: R.r1 - R.r0 + 1 }, (_, i) => ({ r0: R.r0 + i, r1: R.r0 + i, c0: R.c0, c1: R.c1 })) : [R];
        const lost = pieces.some((P) => { let n = 0; for (let r = P.r0; r <= P.r1; r++) for (let c = P.c0; c <= P.c1; c++) if ((r !== P.r0 || c !== P.c0) && s.data[idOf(r, c)] !== undefined && s.data[idOf(r, c)] !== '') n++; return n > 0; });
        const go = () => {
            change(() => {
                for (const P of pieces) {
                    if (P.c1 === P.c0 && P.r1 === P.r0) continue;
                    s.merges = s.merges.filter((m) => !(m.r1 >= P.r0 && m.r0 <= P.r1 && m.c1 >= P.c0 && m.c0 <= P.c1));
                    for (let r = P.r0; r <= P.r1; r++) for (let c = P.c0; c <= P.c1; c++) if (r !== P.r0 || c !== P.c0) { delete s.data[idOf(r, c)]; delete s.styles[idOf(r, c)]; }
                    s.merges.push({ r0: P.r0, r1: P.r1, c0: P.c0, c1: P.c1 });
                    if (mode === 'center') { const id = idOf(P.r0, P.c0); s.styles[id] = Object.assign({}, s.styles[id] || {}, { align: 'center', valign: 'middle' }); }
                }
            }, { rebuild: true });
            selectCell(R.r0, R.c0);
            toast('Cells merged!');
        };
        if (lost) confirmDialog('Merge Cells', 'Merging keeps only the top-left value and throws away the rest. Merge anyway?', 'Merge').then((ok) => { if (ok) go(); });
        else go();
    }
    function unmergeCells() {
        const s = ensure(sh()), R = selectedRange();
        const hit = s.merges.filter((m) => m.r1 >= R.r0 && m.r0 <= R.r1 && m.c1 >= R.c0 && m.c0 <= R.c1);
        if (!hit.length) { toast('No merged cells here!'); return; }
        change(() => { s.merges = s.merges.filter((m) => !hit.includes(m)); }, { rebuild: true });
        toast('Cells unmerged!');
    }
    // the grid: the top-left cell spans the whole merged block, the cells it covers stay out of the way
    function wireMergeRender() {
        const _render = renderCell;
        renderCell = function (r, c) {
            const out = _render.apply(this, arguments);
            const row = cellEls[r], td = row && row[c];
            if (td) {
                const s = sh(), m = s.merges && s.merges.length ? mergeAt(r, c, s) : null;
                if (m && m.r0 === r && m.c0 === c) { td.colSpan = m.c1 - m.c0 + 1; td.rowSpan = m.r1 - m.r0 + 1; td.classList.add('merged'); td.style.display = ''; }
                else if (m) { td.colSpan = 1; td.rowSpan = 1; td.style.display = 'none'; td.classList.add('mcov'); }
                else if (td.colSpan > 1 || td.rowSpan > 1 || td.classList.contains('merged') || td.classList.contains('mcov')) { td.colSpan = 1; td.rowSpan = 1; td.classList.remove('merged', 'mcov'); }
            }
            return out;
        };
        // selecting a covered cell means selecting the merged cell; the selection box grows to the whole block
        const _cellRect = cellRect;
        cellRect = function (r, c) {
            const m = mergeAt(r, c);
            if (m && m.r0 === r && m.c0 === c && (m.r1 > r || m.c1 > c)) {
                const a = _cellRect(m.r0, m.c0), b = _cellRect(m.r1, m.c1);
                return { x: a.x, y: a.y, w: Math.max(0, b.x + b.w - a.x), h: Math.max(0, b.y + b.h - a.y) };
            }
            return _cellRect(r, c);
        };
        const _select = selectCell;
        selectCell = function (r, c, opts) { const m = mergeAt(r, c); if (m) { r = m.r0; c = m.c0; } return _select.call(this, r, c, opts); };
    }

    /* ======================================================================
       SHELL: commands, ribbon buttons, shortcuts, styles
       ====================================================================== */
    registerCommands({
        dataValidation: { label: 'Data Validation', icon: 'validation', run: validationDialog },
        circleInvalid: { label: 'Circle Invalid Data', icon: 'circleBad', run: toggleCircles },
        clearValidation: { label: 'Clear Data Validation', icon: 'eraser', run: clearValidation },
        insertLink: { label: 'Link', icon: 'link', run: linkDialog },
        removeLink: { label: 'Remove Link', icon: 'link', run: removeLink },
        pivotTable: { label: 'PivotTable', icon: 'pivot', run: pivotDialog },
        refreshPivot: { label: 'Refresh PivotTable', icon: 'refresh', run: refreshPivot },
        goalSeek: { label: 'Goal Seek', icon: 'goalseek', run: goalSeek },
        mergeCenter: { label: 'Merge & Center', icon: 'merge', run: () => mergeCells('center') },
        mergeAll: { label: 'Merge Cells', icon: 'merge', run: () => mergeCells('all') },
        mergeAcross: { label: 'Merge Across', icon: 'merge', run: () => mergeCells('across') },
        unmerge: { label: 'Unmerge Cells', icon: 'merge', run: unmergeCells },
    });
    function btn(cmd, title, icon, lines, size) {
        const b = document.createElement('button');
        b.className = 'rb ' + (size || 'big'); b.dataset.cmd = cmd; b.title = title;
        b.innerHTML = ico(icon) + '<span>' + lines + '</span>';
        return b;
    }
    function group(label, kids) {
        const g = document.createElement('div'); g.className = 'rgroup';
        const body = document.createElement('div'); body.className = 'rg-body';
        kids.forEach((k) => body.appendChild(k));
        const lab = document.createElement('div'); lab.className = 'rg-label'; lab.textContent = label;
        g.appendChild(body); g.appendChild(lab);
        return g;
    }
    const stack = (kids) => { const d = document.createElement('div'); d.className = 'stack'; kids.forEach((k) => d.appendChild(k)); return d; };
    function buildRibbon() {
        const data = document.querySelector('.rpanel[data-panel="data"]');
        if (data && !data.querySelector('[data-cmd="dataValidation"]')) {
            data.appendChild(group('Validation', [btn('dataValidation', 'Data Validation: dropdown lists and limits for what can be typed', 'validation', 'Data<br>Validation'), stack([btn('circleInvalid', 'Circle the cells that break their rules', 'circleBad', 'Circle Invalid', 'sm'), btn('clearValidation', 'Clear data validation from the selection', 'eraser', 'Clear Rules', 'sm')])]));
            data.appendChild(group('Analyze', [btn('pivotTable', 'PivotTable: summarize a table by groups', 'pivot', 'PivotTable'), btn('refreshPivot', 'Refresh this PivotTable from its source data', 'refresh', 'Refresh<br>PivotTable'), btn('goalSeek', 'Goal Seek: find the input that gives the answer you want', 'goalseek', 'Goal<br>Seek')]));
        }
        const ins = document.querySelector('.rpanel[data-panel="insert"]');
        if (ins && !ins.querySelector('[data-cmd="insertLink"]')) ins.appendChild(group('Links', [btn('insertLink', 'Add a link to this cell (' + (isMac() ? '⌘' : 'Ctrl') + '+K)', 'link', 'Link'), btn('removeLink', 'Remove the link from the selected cells', 'link', 'Remove<br>Link')]));
        const home = document.querySelector('.rpanel[data-panel="home"]');
        const wrap = home && home.querySelector('[data-cmd="wrap"]');
        if (home && !home.querySelector('[data-cmd="mergeCenter"]')) {
            const g = group('Merge', [btn('mergeCenter', 'Merge & Center the selected cells', 'merge', 'Merge &amp;<br>Center'), stack([btn('mergeAll', 'Merge cells into one', 'merge', 'Merge Cells', 'sm'), btn('mergeAcross', 'Merge each row of the selection', 'merge', 'Merge Across', 'sm'), btn('unmerge', 'Split merged cells back apart', 'merge', 'Unmerge', 'sm')])]);
            const anchor = wrap ? wrap.closest('.rgroup') : null;
            if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(g, anchor.nextSibling); else home.appendChild(g);
        }
    }
    const css = document.createElement('style');
    css.textContent = `
#dv-arrow { position: absolute; z-index: 6; width: 18px; height: 18px; display: none; align-items: center; justify-content: center; padding: 0; border: 1px solid #8aa6c8; border-radius: 3px; background: linear-gradient(180deg, #ffffff, #dbe9f8); cursor: pointer; }
#dv-arrow svg { width: 11px; height: 11px; fill: none; stroke: #2a4f86; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
#dv-arrow:hover { background: linear-gradient(180deg, #ffffff, #c4dcf6); }
#dv-menu { position: absolute; z-index: 40; max-height: 220px; overflow: auto; background: #ffffff; border: 1px solid #8aa6c8; border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,0.25); padding: 3px; display: flex; flex-direction: column; }
#dv-menu .dv-item { text-align: left; border: 0; background: transparent; padding: 5px 10px; border-radius: 4px; font: inherit; color: #1b1b1b; cursor: pointer; white-space: nowrap; }
#dv-menu .dv-item:hover { background: #dbe9f8; } #dv-menu .dv-item.on { background: #bcd7f5; font-weight: 700; } #dv-menu .dv-empty { padding: 8px 12px; color: #667; }
#dv-tip { position: absolute; z-index: 5; display: none; max-width: 240px; padding: 6px 9px; border: 1px solid #c8b24a; background: #fff8cc; color: #4a3d00; border-radius: 4px; font-size: 12px; line-height: 1.35; box-shadow: 0 3px 8px rgba(0,0,0,0.2); pointer-events: none; }
#dv-tip b { display: block; }
.dv-circle { position: absolute; z-index: 5; border: 2px solid #e03131; border-radius: 50%; pointer-events: none; box-shadow: 0 0 4px rgba(224,49,49,0.5); }
.dv-dlg .dv-tabs { display: flex; gap: 4px; border-bottom: 2px solid #8aa6c8; margin-bottom: 10px; }
.dv-dlg .dv-tabs button { border: 1px solid #8aa6c8; border-bottom: 0; border-radius: 7px 7px 0 0; padding: 5px 12px; background: linear-gradient(180deg, #fff, #e4eefa); cursor: pointer; font: 700 12px inherit; color: #274a7a; }
.dv-dlg .dv-tabs button.on { background: linear-gradient(180deg, #5da4ee, #2f6fcf); color: #fff; }
.dv-dlg .dlg-field { margin-bottom: 8px; } .dv-dlg textarea.dlg-input { width: 100%; box-sizing: border-box; resize: vertical; font: inherit; }
.dlg-check { display: flex; gap: 6px; align-items: center; margin: 4px 0 8px; font-size: 13px; } .dlg-text.small { font-size: 12px; color: #667; }
td.has-link .ct { color: #0563c1; text-decoration: underline; }
td.merged { background-clip: padding-box; }
`;
    document.head.appendChild(css);

    // keep everything in step with the app
    function init() {
        ensure(sh());
        book.sheets.forEach(ensure);
        guardCommit();
        wireMergeRender();
        // links: colored and underlined, a tooltip, Ctrl/Cmd+click follows
        const _cv = cellView;
        cellView = function (r, c) {
            const v = _cv.apply(this, arguments);
            const s = sh();
            const L = linkOf(r, c, s); if (L) { v.cls += ' has-link'; v.style += 'cursor:pointer;'; }
            return v;
        };
        document.addEventListener('click', (e) => {
            const td = e.target.closest && e.target.closest('#table-body td');
            if (!td || !(e.metaKey || e.ctrlKey)) return;
            const L = linkOf(+td.dataset.r, +td.dataset.c);
            if (L) { e.preventDefault(); e.stopPropagation(); followLink(L); }
        }, true);
        document.addEventListener('mouseover', (e) => { const td = e.target.closest && e.target.closest('#table-body td.has-link'); if (td && !td.title) { const L = linkOf(+td.dataset.r, +td.dataset.c); if (L) td.title = (L.url || '') + '\n' + (isMac() ? '⌘' : 'Ctrl') + '+click to follow'; } });
        // after anything moves the selection or redraws it, the dropdown arrow and message follow
        const _draw = drawSel;
        drawSel = function () { const out = _draw.apply(this, arguments); try { updateDvUi(); } catch (e) {} return out; };
        const sc = scroller(); if (sc) sc.addEventListener('scroll', () => { if (dvMenu) closeDvMenu(); drawCircles(); }, { passive: true });
        // keys: Alt+Down opens the list, Ctrl/Cmd+K makes a link
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'ArrowDown' && !isEditingNow()) { const rule = ruleAt(sel.act.r, sel.act.c); if (rule && rule.type === 'list') { e.preventDefault(); toggleDvMenu(); } }
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k' && !document.querySelector('.dlg')) {
                const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && t.id !== 'cell-editor';
                if (typing) return;
                e.preventDefault(); if (isEditingNow()) commitEdit(0, 0); linkDialog();
            }
        }, true);
        buildRibbon();
        if (typeof initGrid === 'function') { try { initGrid(); } catch (e) {} }
        updateDvUi();
    }
    window.ImbuerPro = { ruleAt, invalidReason, listItems, isInvalid, linkOf, followLink, buildPivot, fillPivot, mergeAt, mergeCells, unmergeCells, goalSeek, pivotDialog, validationDialog, linkDialog, toggleCircles };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)); else setTimeout(init, 0);
})();
