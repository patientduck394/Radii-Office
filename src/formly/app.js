// Formly! Build a form, preview it like a visitor, and trade .kfe (editable), .kfv (viewable)
// and .kfa (answers) files. Plain JavaScript, no build step!
// The whole form lives in one state object as plain data, and becomes JSON only at the edges!
(function () {
    'use strict';

    const STORAGE_KEY = 'formly_doc_v1';
    // Formly's violet accent
    const ACCENT = '#9D84FF';
    const FIELD_TYPES = ['text', 'textarea', 'select', 'chip', 'optrow', 'rating', 'checkbox'];
    const TYPE_NAMES = { optrow: 'Option Row' };
    const typeName = (t) => TYPE_NAMES[t] || t[0].toUpperCase() + t.slice(1);
    // an Option Row has between 2 and 10 buttons
    const ROW_MIN = 2, ROW_MAX = 10;

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
    const state = { form: starterForm(), mode: 'builder' };

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

    // --- Keydown: the full renderer from keydown.js (chips, highlights, Gel Series, Unique Styles, blocks and all) ---
    function keydownHTML(text) {
        if (!text || !String(text).trim()) return '';
        return kdRender(String(text));
    }

    // Does the text use any Keydown? (it renders to something other than plain text)
    function keydown(text) {
        return !!text && keydownHTML(text) !== kdEscapeHtml(String(text));
    }

    // --- Saving: the form survives reloads (and lives under its ?file= ID)! ---
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ form: form(), mode: builder() ? 'builder' : 'view' }));
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

    // --- Chip Select chips: each option gets its own gel color, in order ---
    const CHIP_COLORS = ['blue', 'green', 'purple', 'orange', 'pink', 'teal', 'gold', 'red', 'cyan', 'lime'];
    let justPicked = '';
    function chipButton(text, i, on, pop, locked, pick) {
        const chip = el('button');
        chip.type = 'button';
        chip.className = 'fm-chip gel-bubble-chip gel-chip-' + CHIP_COLORS[i % CHIP_COLORS.length] + (on ? ' is-on' : '') + (pop ? ' fm-pop' : '');
        chip.setAttribute('role', 'radio');
        chip.setAttribute('aria-checked', String(on));
        chip.disabled = locked;
        const dot = el('span');
        dot.className = 'fm-chip-dot';
        dot.setAttribute('aria-hidden', 'true');
        const label = el('span');
        label.textContent = text;
        chip.appendChild(dot);
        chip.appendChild(label);
        if (pick) chip.onclick = pick;
        return chip;
    }

    // --- Option Row: a centered row of buttons; click one to answer, click another to change it ---
    function optionRow(field, locked) {
        const row = el('div');
        row.className = 'fm-optrow';
        row.setAttribute('role', 'radiogroup');
        row.setAttribute('aria-label', String(field.label || 'Choices').replace(/<[^>]*>/g, ''));
        optionsOf(field, 'Option 1, Option 2, Option 3').forEach((o, i) => {
            const key = field.id + '\u0000' + o;
            const on = o === field.value;
            const b = el('button');
            b.type = 'button';
            b.className = 'fm-opt' + (on ? ' is-on' : '') + (key === justPicked ? ' fm-pop' : '');
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', String(on));
            b.disabled = locked;
            b.textContent = o;
            b.onclick = () => {
                clickSound(620 + i * 50, 0.06);
                justPicked = key;
                updateField(field.id, (f) => Object.assign(f, { value: o }));
                render();
            };
            row.appendChild(b);
        });
        justPicked = '';
        return row;
    }

    // the builder's "Buttons: − 4 +" stepper: adds "Option N" buttons or drops the last ones
    function buttonCount(field) {
        const wrap = el('div');
        wrap.className = 'fm-count';
        const names = () => optionsOf(field, '').filter(Boolean);
        const n = names().length;
        const step = (d) => {
            const list = names();
            const want = Math.min(ROW_MAX, Math.max(ROW_MIN, list.length + d));
            while (list.length < want) list.push('Option ' + (list.length + 1));
            list.length = want;
            clickSound(d > 0 ? 760 : 520, 0.05);
            updateField(field.id, (f) => Object.assign(f, { options: list.join(', '), value: list.includes(f.value) ? f.value : '' }));
            render();
        };
        const label = el('span');
        label.textContent = 'Buttons';
        const minus = el('button');
        const count = el('output');
        const plus = el('button');
        minus.type = plus.type = 'button';
        minus.textContent = '−';
        plus.textContent = '+';
        minus.setAttribute('aria-label', 'Fewer buttons');
        plus.setAttribute('aria-label', 'More buttons');
        minus.disabled = n <= ROW_MIN;
        plus.disabled = n >= ROW_MAX;
        minus.onclick = () => step(-1);
        plus.onclick = () => step(1);
        count.textContent = String(n);
        [label, minus, count, plus].forEach((x) => wrap.appendChild(x));
        return wrap;
    }

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
            opt.textContent = typeName(t).toUpperCase();
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
                // the choices are glossy Bubble Chips: tap one to pick it!
                const row = el('div');
                row.className = 'fm-chip-row';
                row.setAttribute('role', 'radiogroup');
                row.setAttribute('aria-label', String(field.label || 'Choices').replace(/<[^>]*>/g, ''));
                optionsOf(field, 'Chip 1, Chip 2').forEach((o, i) => {
                    const on = o === field.value;
                    row.appendChild(chipButton(o, i, on, field.id + '\u0000' + o === justPicked, locked, () => {
                        clickSound(700 + i * 40, 0.06);
                        justPicked = field.id + '\u0000' + o;
                        setValue(o);
                        render();
                    }));
                });
                justPicked = '';
                return row;
            }
            case 'optrow': return optionRow(field, locked);
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
            if (field.type === 'select' || field.type === 'chip' || field.type === 'optrow') card.appendChild(optionsInput(field));
            if (field.type === 'optrow') card.appendChild(buttonCount(field));
        } else {
            const label = el('div', MONO + 'font-weight: 700; font-size: 0.95rem; color: #1e293b;');
            label.innerHTML = keydownHTML(field.label || 'Untitled Field');
            card.appendChild(label);
        }
        if (mode() === 'readonly-answers') {
            const read = el('div', MONO + 'width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(157, 132, 255, 0.1); color: #1e293b; box-sizing: border-box; font-weight: bold;');
            if (field.type === 'chip' && filled(field.value)) {
                // a chip answer shows as the chip that was picked
                const opts = optionsOf(field, String(field.value));
                read.appendChild(chipButton(String(field.value), Math.max(0, opts.indexOf(String(field.value))), true, false, true, null));
            } else if (field.type === 'optrow') {
                // an Option Row answer shows the whole row, with the picked button lit
                read.style.background = 'transparent';
                read.style.border = 'none';
                read.appendChild(optionRow(field, true));
            } else read.textContent = filled(field.value) ? String(field.value) : '(No answer provided)';
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
        badge.style.color = ACCENT;
        const list = $('form-fields-list');
        list.innerHTML = '';
        fields().forEach((f) => list.appendChild(fieldCard(f)));
        save();
        renderHooks.forEach((f) => f());
    }

    // --- Building ---
    function addField(type) {
        clickSound(800, 0.08);
        state.form = Object.assign({}, state.form, {
            fields: fields().concat([{
                id: 'f_' + Math.random().toString(36).substring(2, 9),
                type: type,
                label: 'New ' + typeName(type) + ' Field',
                placeholder: '',
                value: type === 'checkbox' ? false : type === 'rating' ? '5' : '',
                options: type === 'select' || type === 'chip' || type === 'optrow' ? 'Option 1, Option 2, Option 3' : '',
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
        download(pretty({ format: 'kfe', version: '1.0', form: form() }), fileName('.kfe'), 'application/json');
    }

    function downloadKfv() {
        clickSound(850, 0.1);
        download(pretty({ format: 'kfv', version: '1.0', form: form() }), fileName('.kfv'), 'application/json');
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
                    alert('Editable Form (.kfe) loaded successfully!');
                    break;
                case 'kfv':
                    state.form = doc.form; state.mode = 'view';
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
            }
        } catch (e) { /* a broken save just means a fresh form */ }
    }

    // The ribbon (office.js) and live collaboration (collab.js) build on this!
    window.Formly = {
        state, renderHooks, changeHooks,
        $, form, fields, mode, builder, updateField, save, render,
        addField, setMode, resetForm, downloadKfe, downloadKfv, exportKfa,
    };
    // old global names, for anything that still calls them
    window.renderForm = render;
    window.saveFormly = save;

    wire();
    restore();
    render();
})();
