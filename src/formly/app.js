// Custom Theme Accent (#9D84FF requested)
let currentThemeColor = '#9D84FF';

// Application State
let formState = {
    title: "My Awesome Frutiger Aero Form",
    description: "Please fill out the fields below and export your answers when finished!",
    fields: [
        { id: 'f1', type: 'text', label: '#G#Your Full Name#', placeholder: 'e.g. Duck User', value: '', options: '' },
        { id: 'f2', type: 'select', label: 'Favorite Design Aesthetic', placeholder: '', value: 'Frutiger Aero', options: 'Frutiger Aero, Flat Design, Neumorphism, Y2K Retro' },
        { id: 'f3', type: 'chip', label: 'Preferred Platforms', placeholder: '', value: 'Bluesky', options: 'Bluesky, Mastodon, Matrix, Discord' },
        { id: 'f4', type: 'rating', label: 'Rate this interface experience', placeholder: '', value: '5', options: '1, 2, 3, 4, 5' },
        { id: 'f5', type: 'textarea', label: 'Why do you love glossy interfaces?', placeholder: 'Write your thoughts here...', value: '', options: '' },
        { id: 'f6', type: 'checkbox', label: 'Subscribe to Aero updates newsletter', placeholder: '', value: true, options: '' }
    ]
};

let currentMode = 'builder'; // 'builder', 'view', 'readonly-answers'

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarLatch = document.getElementById('sidebar-latch');
const paletteToggleBtn = document.getElementById('palette-toggle-btn');
const aeroPaletteMenu = document.getElementById('aero-palette-menu');
const customColorPicker = document.getElementById('custom-color-picker');
const resetThemeBtn = document.getElementById('reset-theme-btn');
const modeBadge = document.getElementById('mode-badge');
const formulaInput = document.getElementById('formula-input');
const formTitleInput = document.getElementById('form-title-input');
const formDescInput = document.getElementById('form-desc-input');
const formFieldsList = document.getElementById('form-fields-list');
const builderControls = document.getElementById('builder-controls');
const viewModeFooter = document.getElementById('view-mode-footer');

// Buttons
const btnCreateForm = document.getElementById('btn-create-form');
const btnDownloadKfe = document.getElementById('btn-download-kfe');
const btnDownloadKfv = document.getElementById('btn-download-kfv');
const btnDownloadKfvText = document.getElementById('btn-download-kfv-text');
const btnUploadFile = document.getElementById('btn-upload-file');
const hiddenFileInput = document.getElementById('hidden-file-input');
const btnExportKfa = document.getElementById('btn-export-kfa');
const btnClearForm = document.getElementById('btn-clear-form');

// Sidebar Toggle
sidebarLatch.addEventListener('click', () => {
    playAeroClickSound(450, 0.08);
    sidebar.classList.toggle('collapsed');
});

// Palette Menu Toggle
paletteToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playAeroClickSound(600, 0.06);
    aeroPaletteMenu.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!aeroPaletteMenu.contains(e.target) && !paletteToggleBtn.contains(e.target)) {
        aeroPaletteMenu.classList.remove('show');
    }
});

// Theme Swatch Selector
document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        playAeroClickSound(700, 0.08);
        setThemeColor(swatch.dataset.color);
    });
});

customColorPicker.addEventListener('input', (e) => {
    setThemeColor(e.target.value);
});

resetThemeBtn.addEventListener('click', () => {
    playAeroClickSound(500, 0.08);
    setThemeColor('#9D84FF');
    customColorPicker.value = '#9D84FF';
});

function setThemeColor(color) {
    currentThemeColor = color;
    document.documentElement.style.setProperty('--aero-primary', color);
    renderForm();
}

// --- Web Audio Synthesizer Engine ---
function playAeroClickSound(frequency = 600, duration = 0.08) {
    try {
        const ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine'; 
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.connect(gainNode); 
        gainNode.connect(ctx.destination);
        oscillator.start(); 
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {}
}

// --- Keydown Tag Parser Engine ---
const keydownDefinitions = [
    { open: '=Y=',  close: '=Y=',  className: 'gel-orb gel-y' },
    { open: '=R=',  close: '=R=',  className: 'gel-orb gel-r' },
    { open: '=G=',  close: '=G=',  className: 'gel-orb gel-g' },
    { open: '=C=',  close: '=C=',  className: 'gel-orb gel-c' },
    { open: '=B=',  close: '=B=',  className: 'gel-orb gel-b' },
    { open: '=V=',  close: '=V=',  className: 'gel-orb gel-v' },
    { open: '=P=',  close: '=P=',  className: 'gel-orb gel-p' },
    { open: '=O=',  close: '=O=',  className: 'gel-orb gel-o' },
    { open: '=MG=', close: '=MG=', className: 'gel-orb gel-mg' },
    { open: '=LM=', close: '=LM=', className: 'gel-orb gel-lm' },
    { open: '=AQ=', close: '=AQ=', className: 'gel-orb gel-aq' },
    { open: '=SL=', close: '=SL=', className: 'gel-orb gel-sl' },
    
    { open: '&&',    close: '&&',    className: 'spark-text' },
    
    { open: '~G~', close: '~G~', className: 'gel-green-flash' },
    { open: '~U~', close: '~U~', className: 'liquid-underline' },
    { open: '~B~', close: '~B~', className: 'glossy-border-badge' },
    { open: '~S~', close: '~S~', className: 'cyber-glow-spark' },
    { open: '~L~',  close: '~L~',  className: 'liquid-text-glow' },
    { open: '~E~',  close: '~E~',  className: 'embossed-glass-text' },
    
    { open: '`',    close: '`',    tagName: 'code' },
    { open: '**',   close: '**',   tagName: 'strong' },
    { open: '*',    close: '*',    tagName: 'em', isItalic: true },
    
    // 8 Brand New Custom !# Prefix Tag Highlight Options
    { open: '!#A#', close: '#', className: 'aero-tag-chip tag-chip-a' },
    { open: '!#G#', close: '#', className: 'aero-tag-chip tag-chip-g' },
    { open: '!#O#', close: '#', className: 'aero-tag-chip tag-chip-o' },
    { open: '!#R#', close: '#', className: 'aero-tag-chip tag-chip-r' },
    { open: '!#PR#', close: '#', className: 'aero-tag-chip tag-chip-pr' },
    { open: '!#PK#', close: '#', className: 'aero-tag-chip tag-chip-pk' },
    { open: '!#Y#', close: '#', className: 'aero-tag-chip tag-chip-y' },
    { open: '!#SL#', close: '#', className: 'aero-tag-chip tag-chip-sl' },

    { open: '#C#', close: '#', className: 'gel-bubble-chip gel-chip-cyan' },
    { open: '#O#', close: '#', className: 'gel-bubble-chip gel-chip-orange' },
    { open: '#G#', close: '#', className: 'gel-bubble-chip gel-chip-green' },
    { open: '#R#', close: '#', className: 'gel-bubble-chip gel-chip-red' },
    { open: '#PR#', close: '#', className: 'gel-bubble-chip gel-chip-purple' },
    { open: '#PK#', close: '#', className: 'gel-bubble-chip gel-chip-pink' },
    { open: '#Y#', close: '#', className: 'gel-bubble-chip gel-chip-yellow' },
    { open: '#B#', close: '#', className: 'gel-bubble-chip gel-chip-blue' },
    { open: '#L#', close: '#', className: 'gel-bubble-chip gel-chip-lime' },
    { open: '#T#', close: '#', className: 'gel-bubble-chip gel-chip-teal' },
    { open: '#GL#', close: '#', className: 'gel-bubble-chip gel-chip-gold' },
    { open: '#SL#', close: '#', className: 'gel-bubble-chip gel-chip-slate' },
    { open: '#W#', close: '#', className: 'gel-bubble-chip gel-chip-white' },
    { open: '#BK#', close: '#', className: 'gel-bubble-chip gel-chip-black' },
    { open: '#FG#', close: '#', className: 'gel-bubble-chip gel-chip-fog' },
    { open: '#TU#', close: '#', className: 'gel-bubble-chip gel-chip-turquoise' },

    { open: '~WD~', close: '~WD~', className: 'gel-chip-waterdrop' },
    { open: '~SF~', close: '~SF~', className: 'gel-chip-solarflare' },
    { open: '~AW~', close: '~AW~', className: 'gel-chip-aurorawave' },

    { open: '~SM~', close: '~SM~', className: 'applet-glass-stamp' },

    { open: '~MP~', close: '~MP~', className: 'effect-mercury-pearl' },
    { open: '~PG~', close: '~PG~', className: 'effect-prism-refract' },
    { open: '~CB~', close: '~CB~', className: 'effect-screen-cavity' },
    { open: '~SR~', close: '~SR~', className: 'effect-sunlight-ray' },
    { open: '~OA~', close: '~OA~', className: 'effect-abyssal-plate' },
    { open: '~MM~', close: '~MM~', className: 'effect-metallic-mesh' },
    { open: '~FE~', close: '~FE~', className: 'effect-fluid-expand' },

    { open: '~MR~', close: '~MR~', className: 'effect-metric-cavity' },
    { open: '~PO~', close: '~PO~', className: 'effect-pearl-orb' },
    { open: '~LF~', close: '~LF~', className: 'effect-lens-flare' },

    { open: '~DS~', close: '~DS~', className: 'effect-drop-shadow-window' },
    { open: '~GL~', close: '~GL~', className: 'effect-glow-tube' },
    { open: '~HB~', close: '~HB~', className: 'effect-hardware-bevel' },
    { open: '~IS~', close: '~IS~', className: 'effect-screen-segment' },
    { open: '~GC~', close: '~GC~', className: 'effect-gel-capsule' },
    { open: '~KO~', close: '~KO~', className: 'effect-fluid-orbit' },

    { open: '~XG~',  close: '~XG~',  className: 'effect-xray-glass' },
    { open: '~WL~',  close: '~WL~',  className: 'effect-waveform-line' }, // Did not include in guide
    { open: '~PM~',  close: '~PM~',  className: 'effect-plasma-gel' },

    { open: '~WB~',  close: '~WB~',  className: 'effect-water-bubble' },
    { open: '~GLO~', close: '~GLO~', className: 'effect-glow-tracer' },
    { open: '~ST~',  close: '~ST~',  className: 'effect-shimmer-title' },

    { open: '~WD-Y~', close: '~', className: 'droplet-amber' },
    { open: '~WD-R~', close: '~', className: 'droplet-crimson' },
    { open: '~WD-PK~', close: '~', className: 'droplet-fuchsia' },
    { open: '~WD-PR~', close: '~', className: 'droplet-amethyst' },
    { open: '~WD-O~', close: '~', className: 'droplet-tangerine' },
    { open: '~WD-SL~', close: '~', className: 'droplet-slate' },

    { open: '~FUNC~',  close: '~FUNC~',  className: 'dev-chip-function' },
    { open: '~VAR~', close: '~VAR~', className: 'dev-chip-variable' },
    { open: '~STR~', close: '~STR~', className: 'dev-chip-string' },

    { open: '~RS~', close: '~RS~', className: 'av-chip-radar-sweep' },
    { open: '~HD~', close: '~HD~', className: 'av-chip-heading' },
    { open: '~AL~', close: '~AL~', className: 'av-chip-altimeter' },

    // STYLE 1: Liquid Plasma Pods (4 Colors)
    { open: '~PP-C~', close: '~', className: 'megachip-plasma plasma-cyan' },
    { open: '~PP-O~', close: '~', className: 'megachip-plasma plasma-orange' },
    { open: '~PP-R~', close: '~', className: 'megachip-plasma plasma-crimson' },
    { open: '~PP-L~', close: '~', className: 'megachip-plasma plasma-lime' },

    // STYLE 2: Glossy Glass Badge Brackets (4 Colors)
    { open: '~GB-B~', close: '~', className: 'megachip-glass-bracket bracket-blue' },
    { open: '~GB-PR~', close: '~', className: 'megachip-glass-bracket bracket-amethyst' },
    { open: '~GB-PK~', close: '~', className: 'megachip-glass-bracket bracket-fuchsia' },
    { open: '~GB-Y~', close: '~', className: 'megachip-glass-bracket bracket-amber' },

    { open: '~DR~', close: '~DR~', className: 'jr-chip-date-plate' },
    { open: '~MD~', close: '~MD~', className: 'jr-chip-mood' },
    { open: '~WX~', close: '~WX~', className: 'jr-chip-weather' },

    { open: '~B-B~', close: '~', className: 'aero-glass-badge-chip badge-frame-sky' },
    { open: '~B-G~', close: '~', className: 'aero-glass-badge-chip badge-frame-emerald' },
    { open: '~B-O~', close: '~', className: 'aero-glass-badge-chip badge-frame-orange' },
    { open: '~B-R~', close: '~', className: 'aero-glass-badge-chip badge-frame-crimson' },
    { open: '~B-PR~', close: '~', className: 'aero-glass-badge-chip badge-frame-amethyst' },
    { open: '~B-Y~', close: '~', className: 'aero-glass-badge-chip badge-frame-gold' },

    { open: '~TL~',  close: '~TL~',  className: 'effect-tinted-lens' },
    { open: '~SL~',  close: '~SL~',  className: 'effect-audio-stream-loop' },
    { open: '~BG~',  close: '~BG~',  className: 'effect-biogel-capsule' },

    { open: '~FT~',  close: '~FT~',  className: 'jr-folder-tab' },
    { open: '~MC~',  close: '~MC~',  className: 'jr-digital-counter' },
    { open: '~WR~',  close: '~WR~',  className: 'effect-neon-ribbon' },

    // Style 2: Swayed Rounded Square Variations
    { open: '~SH-B~', close: '~', className: 'gel-chip-swayed swayed-sky' },
    { open: '~SH-G~', close: '~', className: 'gel-chip-swayed swayed-emerald' },
    { open: '~SH-O~', close: '~', className: 'gel-chip-swayed swayed-orange' },
    { open: '~SH-PR~', close: '~', className: 'gel-chip-swayed swayed-amethyst' },
    // Style 3: Rounded Pill Chip Variations
    { open: '~PH-B~', close: '~', className: 'gel-chip-pill-variant pill-sky' },
    { open: '~PH-G~', close: '~', className: 'gel-chip-pill-variant pill-emerald' },
    { open: '~PH-O~', close: '~', className: 'gel-chip-pill-variant pill-orange' },
    { open: '~PH-PR~', close: '~', className: 'gel-chip-pill-variant pill-amethyst' },

    { open: '~PC-Y~', close: '~', className: 'gel-chip-pastel pastel-yellow' },
    { open: '~PC-B~', close: '~', className: 'gel-chip-pastel pastel-blue' },
    { open: '~PC-G~', close: '~', className: 'gel-chip-pastel pastel-green' },
    { open: '~PC-PK~', close: '~', className: 'gel-chip-pastel pastel-pink' },
    { open: '~PC-PR~', close: '~', className: 'gel-chip-pastel pastel-purple' },
    { open: '~PC-O~', close: '~', className: 'gel-chip-pastel pastel-orange' },

    { open: '~DR-O~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-tangerine' },
    { open: '~DR-Y~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-citrus' },
    { open: '~DR-G~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-emerald' },
    { open: '~DR-B~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-sapphire' },
    { open: '~DR-PR~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-amethyst' },
    { open: '~DR-PK~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-fuchsia' },
    { open: '~DR-R~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-crimson' },
    { open: '~DR-SL~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-slate' },

    { open: '~H1~',  close: '~H1~',  className: 'header-1'},
    { open: '~H2~',  close: '~H2~',  className: 'header-2'},
    { open: '~H3~',  close: '~H3~',  className: 'header-3'},
    { open: '~BQ~',  close: '~BQ~',  className: 'blockquote-list'},
    { open: '~BUL~', close: '~BUL~', className: 'bulleted-list'},
    { open: '~MH~',  close: '~MH~',  className: 'mega-header'},
];

// Verify if text contains BOTH an opening and closing tag pair
function hasValidKeydownPair(text) {
    if (!text) return false;
    return keydownDefinitions.some(def => {
        let firstIndex = text.indexOf(def.open);
        if (firstIndex === -1) return false;
        let secondIndex = text.indexOf(def.close, firstIndex + def.open.length);
        return secondIndex !== -1;
    });
}

function parseKeydownTags(text) {
    if (!text) return '';
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    html = html.replace(/#G#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-green">$1</span>');
    html = html.replace(/#C#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-cyan">$1</span>');
    html = html.replace(/#O#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-orange">$1</span>');
    html = html.replace(/#R#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-red">$1</span>');
    html = html.replace(/#PR#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-purple">$1</span>');
    html = html.replace(/#PK#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-pink">$1</span>');
    html = html.replace(/#Y#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-yellow">$1</span>');
    html = html.replace(/#B#([^#]+)#/g, '<span class="gel-bubble-chip gel-chip-blue">$1</span>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    return html;
}

// --- Render Engine ---
function renderForm() {
    if (currentMode === 'view' || currentMode === 'readonly-answers') {
        formTitleInput.style.display = 'none';
        formDescInput.style.display = 'none';
        
        let viewHeader = document.getElementById('view-form-header');
        if (!viewHeader) {
            viewHeader = document.createElement('div');
            viewHeader.id = 'view-form-header';
            formTitleInput.parentNode.insertBefore(viewHeader, formTitleInput);
        }
        viewHeader.innerHTML = `
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 800; color: #1e293b; margin-bottom: 8px;">${parseKeydownTags(formState.title)}</div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: #475569; white-space: pre-wrap;">${parseKeydownTags(formState.description)}</div>
        `;
        viewHeader.style.display = 'block';

        builderControls.style.display = 'none';
        viewModeFooter.style.display = currentMode === 'view' ? 'flex' : 'none';
        modeBadge.textContent = currentMode === 'readonly-answers' ? 'VIEWING SUBMITTED ANSWERS (.kfa)' : 'VIEWER (.kfv)';
        modeBadge.style.color = currentThemeColor;
        formulaInput.value = currentMode === 'readonly-answers' ? 'Viewing submitted user response file (.kfa).' : 'Fill out your responses below and click Download answers at the bottom!';
        
        btnDownloadKfe.style.display = 'none';
        btnDownloadKfvText.textContent = 'Download form';
    } else {
        let viewHeader = document.getElementById('view-form-header');
        if (viewHeader) viewHeader.style.display = 'none';
        
        formTitleInput.style.display = 'block';
        formDescInput.style.display = 'block';
        formTitleInput.value = formState.title;
        formDescInput.value = formState.description;

        builderControls.style.display = 'flex';
        viewModeFooter.style.display = 'none';
        modeBadge.textContent = 'BUILDER';
        modeBadge.style.color = currentThemeColor;
        formulaInput.value = 'Builder mode';
        
        btnDownloadKfe.style.display = 'flex';
        btnDownloadKfvText.textContent = 'Download Viewable';
    }

    formFieldsList.innerHTML = '';

    formState.fields.forEach((field, index) => {
        const card = document.createElement('div');
        card.className = 'form-field-card';
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.04);
            display: flex;
            flex-direction: column;
            gap: 10px;
            position: relative;
        `;

        if (currentMode === 'builder') {
            let headerRow = document.createElement('div');
            headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 10px;';
            
            // Editable title box wrapper with zero-margin flush right indicator image
            let titleBoxWrapper = document.createElement('div');
            titleBoxWrapper.style.cssText = 'position: relative; flex: 1; display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; padding: 0 0 0 10px; min-height: 34px; overflow: hidden;';
            
            let titleEditable = document.createElement('div');
            titleEditable.contentEditable = true;
            titleEditable.innerHTML = parseKeydownTags(field.label);
            titleEditable.style.cssText = 'font-family: \'JetBrains Mono\', monospace; font-weight: 700; font-size: 0.95rem; outline: none; flex: 1; color: #1e293b; white-space: pre-wrap; word-break: break-all;';
            
            let indicatorImg = document.createElement('img');
            indicatorImg.src = 'keydown.svg';
            indicatorImg.alt = 'Keydown Active';
            indicatorImg.title = 'Valid Keydown syntax detected!';
            indicatorImg.style.cssText = `height: 100%; width: 44px; display: ${hasValidKeydownPair(field.label) ? 'block' : 'none'}; margin: 0; object-fit: cover; flex-shrink: 0; filter: drop-shadow(rgba(0, 219, 255, 0.5) -2px 0px 6px);`;

            titleEditable.oninput = (e) => {
                field.label = titleEditable.textContent;
                if (hasValidKeydownPair(field.label)) {
                    indicatorImg.style.display = 'block';
                } else {
                    indicatorImg.style.display = 'none';
                }
            };

            titleEditable.onblur = () => {
                titleEditable.innerHTML = parseKeydownTags(field.label);
            };

            titleEditable.onfocus = () => {
                titleEditable.textContent = field.label;
            };

            titleBoxWrapper.appendChild(titleEditable);
            titleBoxWrapper.appendChild(indicatorImg);

            let typeSelect = document.createElement('select');
            typeSelect.style.cssText = 'font-family: \'JetBrains Mono\', monospace; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #fff; outline: none; cursor: pointer; color: #334155;';
            ['text', 'textarea', 'select', 'chip', 'rating', 'checkbox'].forEach(t => {
                let opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t.toUpperCase();
                if (t === field.type) opt.selected = true;
                typeSelect.appendChild(opt);
            });
            typeSelect.onchange = (e) => {
                playAeroClickSound(500, 0.05);
                field.type = e.target.value;
                if(field.type === 'checkbox') field.value = false;
                renderForm();
            };

            let deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.style.cssText = 'background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;';
            deleteBtn.title = 'Remove Field';
            deleteBtn.onclick = () => {
                playAeroClickSound(300, 0.08);
                formState.fields.splice(index, 1);
                renderForm();
            };

            headerRow.appendChild(titleBoxWrapper);
            headerRow.appendChild(typeSelect);
            headerRow.appendChild(deleteBtn);
            card.appendChild(headerRow);

            if (field.type === 'select' || field.type === 'chip') {
                let optsInput = document.createElement('input');
                optsInput.type = 'text';
                optsInput.value = field.options || '';
                optsInput.placeholder = 'Options separated by comma (e.g. Option 1, Option 2)';
                optsInput.style.cssText = 'font-family: \'JetBrains Mono\', monospace; font-size: 0.8rem; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; background: rgba(0,0,0,0.02); outline: none; color: #64748b;';
                optsInput.oninput = (e) => { field.options = e.target.value; };
                card.appendChild(optsInput);
            }
        } else {
            let viewLabel = document.createElement('div');
            viewLabel.innerHTML = parseKeydownTags(field.label || 'Untitled Field');
            viewLabel.style.cssText = 'font-family: \'JetBrains Mono\', monospace; font-weight: 700; font-size: 0.95rem; color: #1e293b;';
            card.appendChild(viewLabel);
        }

        let inputWrapper = document.createElement('div');
        
        if (currentMode === 'readonly-answers') {
            let readBox = document.createElement('div');
            readBox.style.cssText = 'font-family: \'JetBrains Mono\', monospace; width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(157, 132, 255, 0.1); color: #1e293b; box-sizing: border-box; font-weight: bold;';
            readBox.textContent = field.value !== undefined && field.value !== '' ? String(field.value) : '(No answer provided)';
            inputWrapper.appendChild(readBox);
        } else {
            if (field.type === 'text') {
                let input = document.createElement('input');
                input.type = 'text';
                input.value = field.value || '';
                input.placeholder = field.placeholder || 'Enter value...';
                input.style.cssText = 'font-family: \'JetBrains Mono\', monospace; width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(255,255,255,0.9); outline: none; box-sizing: border-box; color: #334155;';
                if (currentMode === 'builder') input.disabled = true;
                input.oninput = (e) => { field.value = e.target.value; };
                inputWrapper.appendChild(input);
            } else if (field.type === 'textarea') {
                let textarea = document.createElement('textarea');
                textarea.value = field.value || '';
                textarea.placeholder = field.placeholder || 'Enter detailed text...';
                textarea.style.cssText = 'font-family: \'JetBrains Mono\', monospace; width: 100%; height: 80px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(255,255,255,0.9); outline: none; box-sizing: border-box; resize: vertical; color: #334155;';
                if (currentMode === 'builder') textarea.disabled = true;
                textarea.oninput = (e) => { field.value = e.target.value; };
                inputWrapper.appendChild(textarea);
            } else if (field.type === 'select') {
                let select = document.createElement('select');
                select.style.cssText = 'font-family: \'JetBrains Mono\', monospace; width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(255,255,255,0.9); outline: none; color: #334155; cursor: pointer;';
                if (currentMode === 'builder') select.disabled = true;
                
                let opts = (field.options || 'Option 1, Option 2').split(',').map(o => o.trim());
                opts.forEach(optText => {
                    let opt = document.createElement('option');
                    opt.value = optText;
                    opt.textContent = optText;
                    if (optText === field.value) opt.selected = true;
                    select.appendChild(opt);
                });
                select.onchange = (e) => {
                    playAeroClickSound(650, 0.05);
                    field.value = e.target.value;
                };
                inputWrapper.appendChild(select);
            } else if (field.type === 'chip') {
                let chipContainer = document.createElement('div');
                chipContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
                
                let select = document.createElement('select');
                select.style.cssText = 'font-family: \'JetBrains Mono\', monospace; width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(255,255,255,0.9); outline: none; color: #334155; cursor: pointer;';
                if (currentMode === 'builder') select.disabled = true;

                let opts = (field.options || 'Chip 1, Chip 2').split(',').map(o => o.trim());
                opts.forEach(optText => {
                    let opt = document.createElement('option');
                    opt.value = optText;
                    opt.textContent = optText;
                    if (optText === field.value) opt.selected = true;
                    select.appendChild(opt);
                });
                
                select.onchange = (e) => {
                    playAeroClickSound(700, 0.05);
                    field.value = e.target.value;
                    renderForm();
                };
                chipContainer.appendChild(select);
                inputWrapper.appendChild(chipContainer);
            } else if (field.type === 'rating') {
                let ratingContainer = document.createElement('div');
                ratingContainer.style.cssText = 'display: flex; gap: 6px; align-items: center;';
                let currentVal = parseInt(field.value) || 5;
                
                for (let i = 1; i <= 5; i++) {
                    let starBtn = document.createElement('button');
                    starBtn.type = 'button';
                    starBtn.innerHTML = i <= currentVal ? '★' : '☆';
                    starBtn.style.cssText = `background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: ${i <= currentVal ? '#f59e0b' : '#cbd5e1'};`;
                    if (currentMode === 'builder') starBtn.disabled = true;
                    starBtn.onclick = () => {
                        playAeroClickSound(750 + (i * 30), 0.06);
                        field.value = String(i);
                        renderForm();
                    };
                    ratingContainer.appendChild(starBtn);
                }
                inputWrapper.appendChild(ratingContainer);
            } else if (field.type === 'checkbox') {
                let label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 10px; font-family: \'JetBrains Mono\', monospace; font-size: 0.9rem; cursor: pointer; color: #334155;';
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !!field.value;
                if (currentMode === 'builder') checkbox.disabled = true;
                checkbox.onchange = (e) => {
                    playAeroClickSound(700, 0.05);
                    field.value = e.target.checked;
                };
                
                let span = document.createElement('span');
                span.textContent = 'Enable / True';
                label.appendChild(checkbox);
                label.appendChild(span);
                inputWrapper.appendChild(label);
            }
        }

        card.appendChild(inputWrapper);
        formFieldsList.appendChild(card);
    });
}

formTitleInput.addEventListener('input', (e) => { formState.title = e.target.value; });
formDescInput.addEventListener('input', (e) => { formState.description = e.target.value; });

document.querySelectorAll('.add-field-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        playAeroClickSound(800, 0.08);
        let type = btn.dataset.type;
        let newField = {
            id: 'f_' + Math.random().toString(36).substring(2, 9),
            type: type,
            label: 'New ' + type.charAt(0).toUpperCase() + type.slice(1) + ' Field',
            placeholder: '',
            value: type === 'checkbox' ? false : (type === 'rating' ? '5' : ''),
            options: type === 'select' || type === 'chip' ? 'Option 1, Option 2, Option 3' : ''
        };
        formState.fields.push(newField);
        renderForm();
    });
});

btnCreateForm.addEventListener('click', () => {
    playAeroClickSound(750, 0.08);
    currentMode = 'builder';
    renderForm();
});

btnClearForm.addEventListener('click', () => {
    playAeroClickSound(350, 0.15);
    if (confirm('Are you sure you want to reset the form workspace?')) {
        formState = {
            title: "Untitled Form",
            description: "Enter instructions here...",
            fields: []
        };
        currentMode = 'builder';
        renderForm();
    }
});

// --- File Format Handling (.kfe, .kfv, .kfa) ---

// 1. Download Editable Format (.kfe)
btnDownloadKfe.addEventListener('click', () => {
    playAeroClickSound(850, 0.1);
    let exportData = {
        format: 'kfe',
        version: '1.0',
        theme: currentThemeColor,
        form: formState
    };
    downloadFile(JSON.stringify(exportData, null, 2), (formState.title || 'form') + '.kfe', 'application/json');
});

// 2. Download Viewable Format (.kfv)
btnDownloadKfv.addEventListener('click', () => {
    playAeroClickSound(850, 0.1);
    let exportData = {
        format: 'kfv',
        version: '1.0',
        theme: currentThemeColor,
        form: formState
    };
    downloadFile(JSON.stringify(exportData, null, 2), (formState.title || 'form') + '.kfv', 'application/json');
});

// 3. Export Answers Format (.kfa)
btnExportKfa.addEventListener('click', () => {
    playAeroClickSound(900, 0.12);
    let answersData = {
        format: 'kfa',
        version: '1.0',
        formTitle: formState.title,
        submittedAt: new Date().toISOString(),
        answers: formState.fields.map(f => ({
            id: f.id,
            label: f.label,
            type: f.type,
            value: f.value,
            options: f.options
        }))
    };
    downloadFile(JSON.stringify(answersData, null, 2), (formState.title || 'form') + '_answers.kfa', 'application/json');
});

// 4. Load Format (.kfe / .kfv / .kfa)
btnUploadFile.addEventListener('click', () => {
    playAeroClickSound(750, 0.08);
    hiddenFileInput.click();
});

hiddenFileInput.addEventListener('change', (e) => {
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(evt) {
        try {
            let parsed = JSON.parse(evt.target.result);
            if (parsed.format === 'kfe') {
                formState = parsed.form;
                if (parsed.theme) setThemeColor(parsed.theme);
                currentMode = 'builder';
                alert('Editable Form (.kfe) loaded successfully!');
            } else if (parsed.format === 'kfv') {
                formState = parsed.form;
                if (parsed.theme) setThemeColor(parsed.theme);
                currentMode = 'view';
                alert('Viewable Form (.kfv) loaded successfully!');
            } else if (parsed.format === 'kfa') {
                formState.title = parsed.formTitle || 'Submitted Form Response';
                formState.description = `Submitted at: ${new Date(parsed.submittedAt).toLocaleString()}`;
                formState.fields = parsed.answers;
                currentMode = 'readonly-answers';
                alert('Loaded Form Answers (.kfa) successfully!');
            } else {
                if (parsed.fields) {
                    formState = parsed;
                    currentMode = 'builder';
                }
            }
            renderForm();
        } catch (err) {
            alert('Error parsing file: Invalid format.');
        }
    };
    reader.readAsText(file);
    hiddenFileInput.value = '';
});

function downloadFile(content, filename, contentType) {
    let blob = new Blob([content], { type: contentType });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

renderForm();