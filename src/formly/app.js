// Formly! Build a form, preview it like a visitor, and trade .kfe (editable), .kfv (viewable)
// and .kfa (answers) files. Plain JavaScript, no build step!
// The whole form lives in one state object as plain data, and becomes JSON only at the edges!
(function () {
    'use strict';

    const STORAGE_KEY = 'formly_doc_v1';
    const DEFAULT_THEME = '#9D84FF';
    const FIELD_TYPES = ['text', 'textarea', 'select', 'chip', 'rating', 'checkbox'];

    const starterForm = () => ({
        title: 'My Awesome Frutiger Aero Form',
        description: 'Please fill out the fields below and export your answers when finished!',
        fields: [
            { id: 'f1', type: 'text', label: '#G#Your Full Name#', placeholder: 'e.g. Duck User', value: '', options: '' },
            { id: 'f2', type: 'select', label: 'Favorite Design Aesthetic', placeholder: '', value: 'Frutiger Aero', options: 'Frutiger Aero, Flat Design, Neumorphism, Y2K Retro' },
            { id: 'f3', type: 'chip', label: 'Preferred Platforms', placeholder: '', value: 'Bluesky', options: 'Bluesky, Mastodon, Matrix, Discord' },
            { id: 'f4', type: 'rating', label: 'Rate this interface experience', placeholder: '', value: '5', options: '1, 2, 3, 4, 5' },
            { id: 'f5', type: 'textarea', label: 'Why do you love glossy interfaces?', placeholder: 'Write your thoughts here...', value: '', options: '' },
            { id: 'f6', type: 'checkbox', label: 'Subscribe to Aero updates newsletter', placeholder: '', value: true, options: '' },
        ],
    });

    // mode is "builder", "view" or "readonly-answers"
    const state = { form: starterForm(), theme: DEFAULT_THEME, mode: 'builder' };

    // The ribbon and live collaboration hook in here instead of wrapping functions!
    const renderHooks = [];
    const changeHooks = [];

    const $ = (id) => document.getElementById(id);
    const form = () => state.form;
    const fields = () => state.form.fields;
    const mode = () => state.mode;
    const builder = () => state.mode === 'builder';
    const filled = (s) => s !== undefined && s !== null && s !== '';

    function updateField(id, f) {
        state.form = Object.assign({}, state.form, { fields: fields().map((x) => (x.id === id ? f(Object.assign({}, x)) : x)) });
    }

    // --- Web Audio synthesizer ---
    function clickSound(frequency = 600, duration = 0.08) {
        try {
            const C = window.AudioContext || window.webkitAudioContext;
            const ctx = window.audioCtx || (window.audioCtx = new C());
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const now = ctx.currentTime;
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(now + duration);
        } catch (e) { /* no sound, no problem */ }
    }

    // --- Keydown tags: the little glossy chips you can type in labels ---
    const keydownPairs = [].concat(
        [['=Y=', '=Y='], ['=R=', '=R='], ['=G=', '=G='], ['=C=', '=C='], ['=B=', '=B='], ['=V=', '=V='], ['=P=', '=P='], ['=O=', '=O='],
         ['=MG=', '=MG='], ['=LM=', '=LM='], ['=AQ=', '=AQ='], ['=SL=', '=SL='], ['&&', '&&'], ['`', '`'], ['**', '**'], ['*', '*']],
        ['G', 'U', 'B', 'S', 'L', 'E', 'WD', 'SF', 'AW', 'SM', 'MP', 'PG', 'CB', 'SR', 'OA', 'MM', 'FE', 'MR', 'PO', 'LF', 'DS', 'GL', 'HB', 'IS', 'GC', 'KO',
         'XG', 'WL', 'PM', 'WB', 'GLO', 'ST', 'FUNC', 'VAR', 'STR', 'RS', 'HD', 'AL', 'DR', 'MD', 'WX', 'TL', 'SL', 'BG', 'FT', 'MC', 'WR', 'H1', 'H2', 'H3', 'BQ', 'BUL', 'MH']
            .map((t) => ['~' + t + '~', '~' + t + '~']),
        ['WD-Y', 'WD-R', 'WD-PK', 'WD-PR', 'WD-O', 'WD-SL', 'PP-C', 'PP-O', 'PP-R', 'PP-L', 'GB-B', 'GB-PR', 'GB-PK', 'GB-Y',
         'B-B', 'B-G', 'B-O', 'B-R', 'B-PR', 'B-Y', 'SH-B', 'SH-G', 'SH-O', 'SH-PR', 'PH-B', 'PH-G', 'PH-O', 'PH-PR',
         'PC-Y', 'PC-B', 'PC-G', 'PC-PK', 'PC-PR', 'PC-O', 'DR-O', 'DR-Y', 'DR-G', 'DR-B', 'DR-PR', 'DR-PK', 'DR-R', 'DR-SL']
            .map((t) => ['~' + t + '~', '~']),
        ['!#A#', '!#G#', '!#O#', '!#R#', '!#PR#', '!#PK#', '!#Y#', '!#SL#', '#C#', '#O#', '#G#', '#R#', '#PR#', '#PK#', '#Y#', '#B#', '#L#',
         '#T#', '#GL#', '#SL#', '#W#', '#BK#', '#FG#', '#TU#']
            .map((t) => [t, '#'])
    );

    // Does the text hold BOTH an opening and a closing tag?
    function keydown(text) {
        if (!text) return false;
        if (/^(#{1,4}|\*)\s+\S/.test(text)) return true;
        return keydownPairs.some(([open, close]) => {
            const i = text.indexOf(open);
            return i >= 0 && text.indexOf(close, i + open.length) >= 0;
        });
    }

    const LINE_CLASSES = { '#': 'header-1', '##': 'header-2', '###': 'header-3', '####': 'mega-header', '*': 'bulleted-list' };

    // Line shortcuts: "# " "## " "### " headings, "#### " the mega header, "* " a bullet!
    function lineShortcut(text) {
        const m = /^(#{1,4}|\*)\s+(\S[\s\S]*)$/.exec(text);
        return m ? '<span class="' + LINE_CLASSES[m[1]] + '">' + keydownHTML(m[2]) + '</span>' : null;
    }

    const CHIP_RULES = [
        [/#G#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-green">$1</span>'],
        [/#C#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-cyan">$1</span>'],
        [/#O#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-orange">$1</span>'],
        [/#R#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-red">$1</span>'],
        [/#PR#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-purple">$1</span>'],
        [/#PK#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-pink">$1</span>'],
        [/#Y#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-yellow">$1</span>'],
        [/#B#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-blue">$1</span>'],
        [/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'],
        [/\*([^*]+)\*/g, '<em>$1</em>'],
        [/`([^`]+)`/g, '<code>$1</code>'],
    ];

    function keydownHTML(text) {
        if (!text || !String(text).trim()) return '';
        const line = lineShortcut(text);
        if (line) return line;
        const safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return CHIP_RULES.reduce((html, [re, rep]) => html.replace(re, rep), safe);
    }

    // --- Saving: the form survives reloads (and lives under its ?file= ID)! ---
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ form: form(), theme: state.theme, mode: builder() ? 'builder' : 'view' }));
        } catch (e) { /* storage full or blocked */ }
        changeHooks.forEach((f) => f());
    }

    // --- Little DOM helpers ---
    function el(tag, css) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        return e;
    }

    const MONO = "font-family: 'JetBrains Mono', monospace;";
    const optionsOf = (field, fallback) => (field.options || fallback).split(',').map((s) => s.trim());

    // --- One field card ---
    function builderHeader(field) {
        const id = field.id;
        const row = el('div', 'display: flex; justify-content: space-between; align-items: center; gap: 10px;');
        const box = el('div', 'position: relative; flex: 1; display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; padding: 0 0 0 10px; min-height: 34px; overflow: hidden;');
        const title = el('div', MONO + 'font-weight: 700; font-size: 0.95rem; outline: none; flex: 1; color: #1e293b; white-space: pre-wrap; word-break: break-all;');
        const badge = el('img', 'height: 100%; width: 44px; display: ' + (keydown(field.label) ? 'block' : 'none') + '; margin: 0; object-fit: cover; flex-shrink: 0; filter: drop-shadow(rgba(0, 219, 255, 0.5) -2px 0px 6px);');
        const typeSelect = el('select', MONO + 'font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #fff; outline: none; cursor: pointer; color: #334155;');
        const del = el('button', 'background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;');
        const labelNow = () => { const f = fields().find((x) => x.id === id); return f ? f.label : undefined; };
        title.contentEditable = true;
        title.innerHTML = keydownHTML(field.label);
        badge.src = 'keydown.svg';
        badge.alt = 'Keydown Active';
        badge.title = 'Valid Keydown syntax detected!';
        title.oninput = () => {
            const text = title.textContent;
            updateField(id, (f) => Object.assign(f, { label: text }));
            badge.style.display = keydown(text) ? 'block' : 'none';
        };
        title.onblur = () => { title.innerHTML = keydownHTML(labelNow()); };
        title.onfocus = () => { title.textContent = labelNow(); };
        box.appendChild(title);
        box.appendChild(badge);
        FIELD_TYPES.forEach((t) => {
            const opt = el('option');
            opt.value = t;
            opt.textContent = t.toUpperCase();
            if (t === field.type) opt.selected = true;
            typeSelect.appendChild(opt);
        });
        typeSelect.onchange = (e) => {
            clickSound(500, 0.05);
            const t = e.target.value;
            updateField(id, (f) => { f.type = t; if (t === 'checkbox') f.value = false; return f; });
            render();
        };
        del.innerHTML = '&times;';
        del.title = 'Remove Field';
        del.onclick = () => {
            clickSound(300, 0.08);
            state.form = Object.assign({}, state.form, { fields: fields().filter((x) => x.id !== id) });
            render();
        };
        row.appendChild(box);
        row.appendChild(typeSelect);
        row.appendChild(del);
        return row;
    }

    function optionsInput(field) {
        const input = el('input', MONO + 'font-size: 0.8rem; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; background: rgba(0,0,0,0.02); outline: none; color: #64748b;');
        input.type = 'text';
        input.value = field.options || '';
        input.placeholder = 'Options separated by comma (e.g. Option 1, Option 2)';
        input.oninput = (e) => { const v = e.target.value; updateField(field.id, (f) => Object.assign(f, { options: v })); };
        return input;
    }

    function answerInput(field) {
        const id = field.id;
        const locked = builder();
        const setValue = (v) => updateField(id, (f) => Object.assign(f, { value: v }));
        const text = (v) => (v === undefined || v === null || v === false ? '' : String(v));
        const boxCss = MONO + 'width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(255,255,255,0.9); outline: none; box-sizing: border-box; color: #334155;';
        const choices = (fallback, sound, redraw) => {
            const select = el('select', boxCss + 'cursor: pointer;');
            select.disabled = locked;
            optionsOf(field, fallback).forEach((o) => {
                const opt = el('option');
                opt.value = o;
                opt.textContent = o;
                if (o === field.value) opt.selected = true;
                select.appendChild(opt);
            });
            select.onchange = (e) => { clickSound(sound, 0.05); setValue(e.target.value); if (redraw) render(); };
            return select;
        };
        switch (field.type) {
            case 'text': {
                const input = el('input', boxCss);
                input.type = 'text';
                input.value = text(field.value);
                input.placeholder = field.placeholder || 'Enter value...';
                input.disabled = locked;
                input.oninput = (e) => setValue(e.target.value);
                return input;
            }
            case 'textarea': {
                const area = el('textarea', boxCss + 'height: 80px; resize: vertical;');
                area.value = text(field.value);
                area.placeholder = field.placeholder || 'Enter detailed text...';
                area.disabled = locked;
                area.oninput = (e) => setValue(e.target.value);
                return area;
            }
            case 'select': return choices('Option 1, Option 2', 650, false);
            case 'chip': {
                const wrap = el('div', 'display: flex; flex-direction: column; gap: 8px;');
                wrap.appendChild(choices('Chip 1, Chip 2', 700, true));
                return wrap;
            }
            case 'rating': {
                const row = el('div', 'display: flex; gap: 6px; align-items: center;');
                let current = parseInt(field.value, 10);
                if (isNaN(current)) current = 5;
                for (let i = 1; i <= 5; i++) {
                    const star = el('button', 'background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: ' + (i <= current ? '#f59e0b' : '#cbd5e1') + ';');
                    star.type = 'button';
                    star.innerHTML = i <= current ? '★' : '☆';
                    star.disabled = locked;
                    star.onclick = () => { clickSound(750 + i * 30, 0.06); setValue(String(i)); render(); };
                    row.appendChild(star);
                }
                return row;
            }
            case 'checkbox': {
                const label = el('label', 'display: flex; align-items: center; gap: 10px;' + MONO + 'font-size: 0.9rem; cursor: pointer; color: #334155;');
                const box = el('input');
                const span = el('span');
                box.type = 'checkbox';
                box.checked = !!field.value;
                box.disabled = locked;
                box.onchange = (e) => { clickSound(700, 0.05); setValue(e.target.checked); };
                span.textContent = 'Enable / True';
                label.appendChild(box);
                label.appendChild(span);
                return label;
            }
            default: return el('div');
        }
    }

    function fieldCard(field) {
        const card = el('div', 'background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 12px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 10px; position: relative;');
        const wrap = el('div');
        card.className = 'form-field-card';
        if (builder()) {
            card.appendChild(builderHeader(field));
            if (field.type === 'select' || field.type === 'chip') card.appendChild(optionsInput(field));
        } else {
            const label = el('div', MONO + 'font-weight: 700; font-size: 0.95rem; color: #1e293b;');
            label.innerHTML = keydownHTML(field.label || 'Untitled Field');
            card.appendChild(label);
        }
        if (mode() === 'readonly-answers') {
            const read = el('div', MONO + 'width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(157, 132, 255, 0.1); color: #1e293b; box-sizing: border-box; font-weight: bold;');
            read.textContent = filled(field.value) ? String(field.value) : '(No answer provided)';
            wrap.appendChild(read);
        } else {
            wrap.appendChild(answerInput(field));
        }
        card.appendChild(wrap);
        return card;
    }

    // --- Render engine ---
    function render() {
        const { title, description } = form();
        const titleInput = $('form-title-input');
        const descInput = $('form-desc-input');
        const badge = $('mode-badge');
        if (builder()) {
            const header = $('view-form-header');
            if (header) header.style.display = 'none';
            titleInput.style.display = 'block';
            descInput.style.display = 'block';
            titleInput.value = title;
            descInput.value = description;
            $('builder-controls').style.display = 'flex';
            $('view-mode-footer').style.display = 'none';
            badge.textContent = 'BUILDER';
            $('formula-input').value = 'Builder mode';
            $('btn-download-kfe').style.display = 'flex';
            $('btn-download-kfv-text').textContent = 'Download Viewable';
        } else {
            const answers = mode() === 'readonly-answers';
            let header = $('view-form-header');
            if (!header) {
                header = el('div');
                header.id = 'view-form-header';
                titleInput.parentNode.insertBefore(header, titleInput);
            }
            titleInput.style.display = 'none';
            descInput.style.display = 'none';
            header.innerHTML = '<div style="font-family: \'JetBrains Mono\', monospace; font-size: 1.4rem; font-weight: 800; color: #1e293b; margin-bottom: 8px;">' + keydownHTML(title) + '</div>'
                + '<div style="font-family: \'JetBrains Mono\', monospace; font-size: 0.9rem; color: #475569; white-space: pre-wrap;">' + keydownHTML(description) + '</div>';
            header.style.display = 'block';
            $('builder-controls').style.display = 'none';
            $('view-mode-footer').style.display = answers ? 'none' : 'flex';
            badge.textContent = answers ? 'VIEWING SUBMITTED ANSWERS (.kfa)' : 'VIEWER (.kfv)';
            $('formula-input').value = answers ? 'Viewing submitted user response file (.kfa).' : 'Fill out your responses below and click Download answers at the bottom!';
            $('btn-download-kfe').style.display = 'none';
            $('btn-download-kfv-text').textContent = 'Download form';
        }
        badge.style.color = state.theme;
        const list = $('form-fields-list');
        list.innerHTML = '';
        fields().forEach((f) => list.appendChild(fieldCard(f)));
        save();
        renderHooks.forEach((f) => f());
    }

    // --- Theme ---
    function setThemeColor(color) {
        state.theme = color;
        document.documentElement.style.setProperty('--aero-primary', color);
        render();
    }

    // --- Building ---
    function addField(type) {
        clickSound(800, 0.08);
        state.form = Object.assign({}, state.form, {
            fields: fields().concat([{
                id: 'f_' + Math.random().toString(36).substring(2, 9),
                type: type,
                label: 'New ' + type[0].toUpperCase() + type.slice(1) + ' Field',
                placeholder: '',
                value: type === 'checkbox' ? false : type === 'rating' ? '5' : '',
                options: type === 'select' || type === 'chip' ? 'Option 1, Option 2, Option 3' : '',
            }]),
        });
        render();
    }

    function setMode(m) { state.mode = m; render(); }

    function resetForm() {
        state.form = { title: 'Untitled Form', description: 'Enter instructions here...', fields: [] };
        state.mode = 'builder';
        render();
    }

    // --- Files: .kfe (editable), .kfv (viewable), .kfa (answers) ---
    function download(content, filename, contentType) {
        const url = URL.createObjectURL(new Blob([content], { type: contentType }));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const fileName = (suffix) => (form().title || 'form') + suffix;
    const pretty = (data) => JSON.stringify(data, null, 2);

    function downloadKfe() {
        clickSound(850, 0.1);
        download(pretty({ format: 'kfe', version: '1.0', theme: state.theme, form: form() }), fileName('.kfe'), 'application/json');
    }

    function downloadKfv() {
        clickSound(850, 0.1);
        download(pretty({ format: 'kfv', version: '1.0', theme: state.theme, form: form() }), fileName('.kfv'), 'application/json');
    }

    function exportKfa() {
        clickSound(900, 0.12);
        const answers = fields().map((f) => {
            const o = {};
            ['id', 'label', 'type', 'value', 'options'].forEach((k) => { if (k in f) o[k] = f[k]; });
            return o;
        });
        download(pretty({ format: 'kfa', version: '1.0', formTitle: form().title, submittedAt: new Date().toISOString(), answers: answers }),
            fileName('_answers.kfa'), 'application/json');
    }

    function loadFileText(text) {
        try {
            const doc = JSON.parse(text);
            switch (doc.format) {
                case 'kfe':
                    state.form = doc.form; state.mode = 'builder';
                    if (doc.theme) setThemeColor(doc.theme);
                    alert('Editable Form (.kfe) loaded successfully!');
                    break;
                case 'kfv':
                    state.form = doc.form; state.mode = 'view';
                    if (doc.theme) setThemeColor(doc.theme);
                    alert('Viewable Form (.kfv) loaded successfully!');
                    break;
                case 'kfa':
                    state.mode = 'readonly-answers';
                    state.form = {
                        title: doc.formTitle || 'Submitted Form Response',
                        description: 'Submitted at: ' + new Date(doc.submittedAt).toLocaleString(),
                        fields: Array.from(doc.answers || []),
                    };
                    alert('Loaded Form Answers (.kfa) successfully!');
                    break;
                default:
                    if (Array.isArray(doc.fields)) { state.form = doc; state.mode = 'builder'; }
            }
            render();
        } catch (e) {
            alert('Error parsing file: Invalid format.');
        }
    }

    // --- Wiring the page ---
    function on(id, ev, f) { const e = $(id); if (e) e.addEventListener(ev, f); }

    function wire() {
        on('sidebar-latch', 'click', () => { clickSound(450, 0.08); $('sidebar').classList.toggle('collapsed'); });
        on('palette-toggle-btn', 'click', (e) => { e.stopPropagation(); clickSound(600, 0.06); $('aero-palette-menu').classList.toggle('show'); });
        document.addEventListener('click', (e) => {
            const menu = $('aero-palette-menu');
            if (menu && !menu.contains(e.target) && !$('palette-toggle-btn').contains(e.target)) menu.classList.remove('show');
        });
        document.querySelectorAll('.color-swatch').forEach((sw) => {
            sw.addEventListener('click', () => { clickSound(700, 0.08); setThemeColor(sw.dataset.color); });
        });
        on('custom-color-picker', 'input', (e) => setThemeColor(e.target.value));
        on('reset-theme-btn', 'click', () => { clickSound(500, 0.08); setThemeColor(DEFAULT_THEME); $('custom-color-picker').value = DEFAULT_THEME; });
        on('form-title-input', 'input', (e) => { state.form = Object.assign({}, state.form, { title: e.target.value }); });
        on('form-desc-input', 'input', (e) => { state.form = Object.assign({}, state.form, { description: e.target.value }); });
        document.querySelectorAll('.add-field-btn').forEach((btn) => btn.addEventListener('click', () => addField(btn.dataset.type)));
        on('btn-create-form', 'click', () => { clickSound(750, 0.08); setMode('builder'); });
        on('btn-clear-form', 'click', () => { clickSound(350, 0.15); if (confirm('Are you sure you want to reset the form workspace?')) resetForm(); });
        on('btn-download-kfe', 'click', downloadKfe);
        on('btn-download-kfv', 'click', downloadKfv);
        on('btn-export-kfa', 'click', exportKfa);
        on('btn-upload-file', 'click', () => { clickSound(750, 0.08); $('hidden-file-input').click(); });
        on('hidden-file-input', 'change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => loadFileText(ev.target.result);
                reader.readAsText(file);
            }
            $('hidden-file-input').value = '';
        });
        // typing anywhere in the form saves it (without redrawing under your cursor)
        ['input', 'change'].forEach((ev) => document.addEventListener(ev, (e) => {
            if (e.target && e.target.closest && e.target.closest('#form-builder-root')) save();
        }));
        document.addEventListener('focusout', (e) => {
            if (e.target.closest && e.target.closest('#form-fields-list')) save();
        });
    }

    function restore() {
        try {
            const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (d && d.form && Array.isArray(d.form.fields)) {
                state.form = d.form;
                if (d.theme) {
                    state.theme = d.theme;
                    document.documentElement.style.setProperty('--aero-primary', d.theme);
                }
            }
        } catch (e) { /* a broken save just means a fresh form */ }
    }

    // The ribbon (office.js) and live collaboration (collab.js) build on this!
    window.Formly = {
        state, renderHooks, changeHooks, DEFAULT_THEME,
        $, form, fields, mode, builder, updateField, save, render,
        setThemeColor, addField, setMode, resetForm, downloadKfe, downloadKfv, exportKfa,
    };
    // old global names, for anything that still calls them
    window.setThemeColor = setThemeColor;
    window.renderForm = render;
    window.saveFormly = save;

    wire();
    restore();
    render();
})();
