// --- Web Audio Synthesizer Engine ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playAeroClickSound(frequency = 600, duration = 0.08) {
  try {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

// --- Page State ---
let elementsList = [
  { id: 1, type: 'heading', variant: 'h1', content: 'Welcome to Omicron Builder' },
  { id: 2, type: 'paragraph', variant: 'standard', content: 'Try typing ::aqua, ::console, or =Y=Yellow Gel=Y= and hit Spacebar!' }
];

let accentColor = '#00D6B6';
// Page-level layout (flexbox) + hand-written code for experienced users!
let pageFlex = { dir: 'column', wrap: 'nowrap', justify: 'flex-start', align: 'stretch', gap: 20 };
let pageCode = { css: '', js: '', head: '' };
const BLOCK_STYLE_KEYS = ['width', 'height', 'minHeight', 'maxWidth', 'minWidth', 'maxHeight', 'fontSize', 'lineHeight', 'textAlign', 'alignSelf', 'flex', 'order', 'padding', 'margin'];
// One card's size + alignment, as CSS (block alignment = auto margins)!
function blockStyleCss(item) {
  const st = (item && item.style) || {};
  const kebab = k => k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  let css = '';
  BLOCK_STYLE_KEYS.forEach(k => { if (st[k] !== undefined && st[k] !== '') css += kebab(k) + ':' + String(st[k]).replace(/[;{}<>"]/g, '') + ';'; });
  if (st.blockAlign === 'center') css += 'margin-left:auto;margin-right:auto;';
  else if (st.blockAlign === 'right') css += 'margin-left:auto;margin-right:0;';
  else if (st.blockAlign === 'left') css += 'margin-left:0;margin-right:auto;';
  return css;
}
function pageFlexCss() {
  const f = pageFlex || {};
  return 'display:flex;flex-direction:' + (f.dir || 'column') + ';flex-wrap:' + (f.wrap || 'nowrap') + ';justify-content:' + (f.justify || 'flex-start') + ';align-items:' + (f.align || 'stretch') + ';gap:' + (parseInt(f.gap, 10) || 0) + 'px;';
}
function applyPageLayout() {
  const page = document.getElementById('wysiwyg-page');
  if (!page) return;
  const f = pageFlex || {};
  page.style.display = 'flex';
  page.style.flexDirection = f.dir || 'column';
  page.style.flexWrap = f.wrap || 'nowrap';
  page.style.justifyContent = f.justify || 'flex-start';
  page.style.alignItems = f.align || 'stretch';
  page.style.gap = (parseInt(f.gap, 10) || 0) + 'px';
  // Your own CSS applies inside the page only (@scope keeps it off the Omicron UI)!
  let st = document.getElementById('om-page-css');
  if (!st) { st = document.createElement('style'); st.id = 'om-page-css'; document.head.appendChild(st); }
  st.textContent = pageCode.css ? '@scope (#wysiwyg-page) {\n' + pageCode.css + '\n}' : '';
}

// --- Autosave: your page survives reloads (omicron_doc_v1)! ---
const OMICRON_KEY = 'omicron_doc_v1';
function saveDoc() {
  try { localStorage.setItem(OMICRON_KEY, JSON.stringify({ elementsList: elementsList, accentColor: accentColor, width: (document.getElementById('canvas-width-select') || {}).value, pageFlex: pageFlex, pageCode: pageCode })); } catch (e) {}
  if (typeof window.onOmicronChange === 'function') window.onOmicronChange();
}
(function loadDoc() {
  try {
    const d = JSON.parse(localStorage.getItem(OMICRON_KEY) || 'null');
    if (d && Array.isArray(d.elementsList)) { elementsList = d.elementsList; accentColor = d.accentColor || accentColor; window.__omicronWidth = d.width; if (d.pageFlex) pageFlex = Object.assign(pageFlex, d.pageFlex); if (d.pageCode) pageCode = Object.assign(pageCode, d.pageCode); }
  } catch (e) {}
})();

function updateAccent(color) {
  accentColor = color;
  renderDocument();
}

// Card titles + text save too (title|text)!
function updateCard(id, part, html) {
  const item = elementsList.find(el => el.id === id);
  if (!item) return;
  const parts = String(item.content).split('|');
  parts[part] = html.replace(/\|/g, '&#124;');
  item.content = parts.join('|');
  saveDoc();
}

function updateCanvasWidth(widthVal) {
  document.getElementById('wysiwyg-page').style.width = widthVal;
  const sel = document.getElementById('canvas-width-select');
  if (sel && sel.value !== widthVal) sel.value = widthVal;
  saveDoc();
}

function toggleMenu(menuId, event) {
  event.stopPropagation();
  document.querySelectorAll('.variation-menu').forEach(m => {
    if (m.id !== menuId) m.classList.remove('active');
  });
  const menu = document.getElementById(menuId);
  if (menu) menu.classList.toggle('active');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.variation-menu').forEach(m => m.classList.remove('active'));
});

function spawnElement(type, variant) {
  playAeroClickSound(750, 0.1);
  let content = 'New Content';

  if (type === 'heading') {
    if (variant === 'h1') content = 'Main Hero Title';
    if (variant === 'h2') content = 'Section Title';
    if (variant === 'subtitle') content = 'A compelling subtitle statement';
  } else if (type === 'paragraph') {
    if (variant === 'standard') content = 'Type your keydown paragraph macros here...';
    if (variant === 'lead') content = 'Lead paragraph callout...';
    if (variant === 'quote') content = '"Inspirational quote or highlighted note."';
  } else if (type === 'button') {
    content = 'Interactive Button';
  } else if (type === 'image') {
    content = `https://picsum.photos/700/350?random=${Date.now()}`;
  } else if (type === 'card') {
    content = 'Feature Card Title|Detailed description text for this feature block.';
  }

  elementsList.push({ id: newBlockId(), type, variant, content });
  renderDocument();
}

// Block ids stay unique even when two people add a block in the same millisecond!
function newBlockId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function deleteElement(id) {
  playAeroClickSound(350, 0.12);
  elementsList = elementsList.filter(el => el.id !== id);
  renderDocument();
}

function updateContent(id, newText) {
  const item = elementsList.find(el => el.id === id);
  if (item) item.content = newText;
  saveDoc();
}

// --- Code blocks: live preview in a sandboxed frame ---
function previewDoc(bodyHtml) {
  const base = location.href.replace(/[^/]*$/, '');
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><base href="' + base + '"><link rel="stylesheet" href="export-style.css">' +
    (pageCode.head || '') + '<style>body{padding:0;margin:0;display:block;background:transparent}' + (pageCode.css || '') + '</style></head><body><div class="kd-content">' + bodyHtml + '</div><script>' + String(pageCode.js || '').replace(/<\/script/gi, '<\\/script') + '<\/script></body></html>';
}
function refreshCodePreview(wrapper, html) {
  const f = wrapper.querySelector('.om-code-prev');
  if (f) f.srcdoc = previewDoc(html);
}
let codeTimers = {};
function updateCodeBlock(id, ta) {
  const item = elementsList.find(el => el.id === id);
  if (!item) return;
  item.content = ta.value;
  saveDoc();
  clearTimeout(codeTimers[id]);
  codeTimers[id] = setTimeout(() => refreshCodePreview(ta.closest('.wysiwyg-block'), ta.value), 350);
}

// --- Render Document Canvas ---
function renderDocument() {
  const page = document.getElementById('wysiwyg-page');
  page.innerHTML = '';
  elementsList.forEach(item => page.appendChild(buildBlock(item)));
  applyPageLayout();
  if (window.BitLang) BitLang.hydrate(page);
  saveDoc();
}

// One block's DOM (live co-editing redraws single blocks with this)!
function buildBlock(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wysiwyg-block';
    wrapper.dataset.id = item.id;
    const bs = blockStyleCss(item);
    if (bs) wrapper.style.cssText = bs;

    let innerHTML = '';

    if (item.type === 'heading') {
      const cls = item.variant === 'h2' ? 'wysiwyg-h2' : item.variant === 'subtitle' ? 'wysiwyg-subtitle' : 'wysiwyg-h1';
      innerHTML = `<div class="${cls}" contenteditable="true" oninput="updateContent(${item.id}, this.innerHTML)" style="${item.variant === 'h1' ? 'color:' + accentColor : ''}">${item.content}</div>`;
    } else if (item.type === 'paragraph') {
      const cls = item.variant === 'lead' ? 'wysiwyg-p-lead' : item.variant === 'quote' ? 'wysiwyg-p-quote' : 'wysiwyg-p-standard';
      innerHTML = `<div class="${cls} kd-content" contenteditable="true" oninput="updateContent(${item.id}, this.innerHTML)">${item.content}</div>`;
    } else if (item.type === 'button') {
      if (item.variant === 'glass') {
        innerHTML = `<button class="btn-glass" style="--om-a:${accentColor}">${item.content}</button>`;
      } else if (item.variant === 'outline') {
        innerHTML = `<button class="btn-outline" style="--om-a:${accentColor}">${item.content}</button>`;
      } else {
        innerHTML = `<button class="btn-primary" style="--om-a:${accentColor}">${item.content}</button>`;
      }
    } else if (item.type === 'image') {
      const cls = item.variant === 'avatar' ? 'img-avatar' : item.variant === 'card' ? 'img-card' : 'img-hero';
      innerHTML = `<img class="${cls}" src="${item.content}">`;
    } else if (item.type === 'rich') {
      // A Bitbook note (or any rich Keydown HTML), Skills + Tags included!
      innerHTML = `<div class="wysiwyg-rich kd-content" contenteditable="true" oninput="updateContent(${item.id}, this.innerHTML)">${item.content}</div>`;
    } else if (item.type === 'html') {
      // Raw HTML for experienced users: edit the code, watch the live preview (scripts run in a sandbox)!
      innerHTML = `<div class="om-code-card"><div class="om-code-head"><b>&lt;/&gt; HTML Block</b><span>Your own HTML (scripts run in the preview and the export)</span></div><textarea class="om-code-area" spellcheck="false" oninput="updateCodeBlock(${item.id}, this)"></textarea><iframe class="om-code-prev" sandbox="allow-scripts" title="Preview"></iframe></div>`;
    } else if (item.type === 'card') {
      const parts = item.content.split('|');
      const cls = item.variant === 'glass' ? 'card-glass' : 'card-border';
      innerHTML = `
        <div class="${cls}" style="--om-a:${accentColor}">
          <h3 contenteditable="true" style="margin-bottom:6px; font-weight:800;" oninput="updateCard(${item.id}, 0, this.innerHTML)">${parts[0]}</h3>
          <p contenteditable="true" style="color:#64748b;" oninput="updateCard(${item.id}, 1, this.innerHTML)">${parts[1] || ''}</p>
        </div>
      `;
    }

    wrapper.innerHTML = `
      ${innerHTML}
      <div class="block-controls">
        <button class="ctrl-btn" onclick="deleteElement(${item.id})">✕ Remove</button>
      </div>
    `;
    if (item.type === 'html') {
      const ta = wrapper.querySelector('.om-code-area');
      ta.value = item.content;
      refreshCodePreview(wrapper, item.content);
    }
    return wrapper;
}

// --- ROBUST RANGE-BASED KEYDOWN PARSER & FULL TAG REGISTRY ---
document.addEventListener('DOMContentLoaded', () => {
  const pageContainer = document.getElementById('wysiwyg-page');
  if (!pageContainer) return;

  pageContainer.addEventListener('keydown', function(e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    let textContent = '';
    if (container.nodeType === Node.TEXT_NODE) {
      textContent = container.nodeValue.substring(0, range.startOffset);
    } else {
      textContent = container.textContent || '';
    }

    // 1. Block-Level Double-Colon (::) Macros
    if (e.key === ' ') {
      const trimmed = textContent.trim();
      
      const blockMacros = ['::glass', '::aqua', '::console', '::divider', '::bubble', '::alert', '::media', '::code', '::emerald', '::amber', '::crimson', '::amethyst', '::gsky', '::foldout', '::horizon', '::entry'];
      
      if (blockMacros.includes(trimmed)) {
        e.preventDefault();
        playAeroClickSound(750, 0.15);

        if (container.nodeType === Node.TEXT_NODE) {
          container.nodeValue = container.nodeValue.replace(trimmed, '');
        }

        const newEl = document.createElement('div');
        if (trimmed === '::glass') {
          newEl.className = 'aero-glass-block';
          newEl.innerHTML = 'Aero Glass Module';
        } else if (trimmed === '::aqua') {
          newEl.className = 'aqua-aero-box';
          newEl.innerHTML = '<div class="aqua-box-content" contenteditable="true">🌊 Type notes here...</div>';
        } else if (trimmed === '::console') {
          newEl.className = 'writedown-console-block';
          newEl.innerHTML = '<div class="console-block-header"><span>⚠️ SYSTEM DEBUG CONSOLE</span></div><pre class="console-block-content" contenteditable="true">error: System bounds fault.</pre>';
        } else if (trimmed === '::divider') {
          newEl.className = 'aero-liquid-divider';
        } else if (trimmed === '::bubble') {
          newEl.className = 'aqua-bubble-text';
          newEl.innerText = 'Liquid Stream';
        } else if (trimmed === '::alert') {
          newEl.className = 'tactile-alert-plate';
          newEl.innerHTML = '<div class="alert-icon-orb">!</div> ⚠️ SYSTEM ALERT';
        } else if (trimmed === '::code') {
          newEl.className = 'writedown-code-block';
          newEl.innerHTML = '<div class="code-block-header"><span>CODE SPEC</span></div><pre class="code-block-content" contenteditable="true">// Write code lines here...</pre>';
        } else if (trimmed === '::foldout') {
          newEl.className = 'aero-foldout-panel';
          newEl.innerHTML = '<div class="foldout-panel-header"><div class="foldout-arrow-orb">▲</div><div class="foldout-panel-title-input" contenteditable="true">TITLE</div></div><div class="foldout-panel-content" contenteditable="true"><p>TEXT</p></div>';
        } else {
          newEl.className = 'aero-glass-block';
          newEl.innerHTML = trimmed.toUpperCase();
        }

        range.insertNode(newEl);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        const host = newEl.parentElement && newEl.parentElement.closest('[contenteditable="true"]');
        if (host) host.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }

    // Inline macros need a caret inside a text node (a caret sitting on an element has no offsets to cut)!
    if (container.nodeType !== Node.TEXT_NODE) return;

    // 2. Comprehensive Inline Macro & Tag Registry
    const inlineDefinitions = [
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
      { open: '~M~',  close: '~M~',  className: 'reflected-text-block', isMirror: true },
      { open: '~E~',  close: '~E~',  className: 'embossed-glass-text' },
      { open: '~W~',  close: '~W~',  className: 'kinetic-wave-text', isWave: true },
      { open: '`',    close: '`',    tagName: 'code' },
      { open: '**',   close: '**',   tagName: 'strong' },
      { open: '*',    close: '*',    tagName: 'em', isItalic: true },
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
      { open: '~FN~', close: '~FN~', className: 'applet-foldout-tab' },
      { open: '~TS~', close: '~TS~', className: 'applet-aqua-switch', isToggle: true },
      { open: '~SM~', close: '~SM~', className: 'applet-glass-stamp' },
      { open: '~TB~', close: '~TB~', className: 'applet-state-button state-green', isStateToggle: true },
      { open: '~VD~', close: '~VD~', className: 'applet-volume-dial', isVolumeDial: true },
      { open: '~BC~', close: '~BC~', className: 'applet-battery-cell', isBatteryCell: true },
      { open: '~CD~', close: '~CD~', className: 'applet-calendar-desk' },
      { open: '~SR~', close: '~SR~', className: 'applet-star-rating' },
      { open: '~CC~', close: '~CC~', className: 'applet-counter-badge' },
      { open: '~LK~', close: '~LK~', className: 'applet-security-latch', isSecurityLatch: true },
      { open: '~PR~', close: '~PR~', className: 'applet-playback-ribbon' },
      { open: '~CR~', close: '~CR~', className: 'applet-cpu-gauge' },
      { open: '~SI~', close: '~SI~', className: 'applet-stepper-mesh' },
      { open: '~MP~', close: '~MP~', className: 'effect-mercury-pearl' },
      { open: '~PG~', close: '~PG~', className: 'effect-prism-refract' },
      { open: '~CB~', close: '~CB~', className: 'effect-screen-cavity' },
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
      { open: '~XG~', close: '~XG~', className: 'effect-xray-glass' },
      { open: '~ORB~', close: '~ORB~', className: 'applet-hydro-orb orb-blue' },
      { open: '~WL~', close: '~WL~', className: 'effect-waveform-line' },
      { open: '~PM~', close: '~PM~', className: 'effect-plasma-gel' },
      { open: '~SLS~', close: '~SLS~', className: 'applet-lock-slider' },
      { open: '~VM~', close: '~VM~', className: 'applet-gadget-clock' },
      { open: '~WB~', close: '~WB~', className: 'effect-water-bubble' },
      { open: '~GLO~', close: '~GLO~', className: 'effect-glow-tracer' },
      { open: '~MT~', close: '~MT~', className: 'applet-metal-trigger' },
      { open: '~IC~', close: '~IC~', className: 'applet-inset-check' },
      { open: '~ST~', close: '~ST~', className: 'effect-shimmer-title' },
      { open: '~WD-Y~', close: '~', className: 'droplet-amber' },
      { open: '~WD-R~', close: '~', className: 'droplet-crimson' },
      { open: '~WD-PK~', close: '~', className: 'droplet-fuchsia' },
      { open: '~WD-PR~', close: '~', className: 'droplet-amethyst' },
      { open: '~WD-O~', close: '~', className: 'droplet-tangerine' },
      { open: '~WD-SL~', close: '~', className: 'droplet-slate' },
      { open: '~FUNC~', close: '~FUNC~', className: 'dev-chip-function' },
      { open: '~VAR~', close: '~VAR~', className: 'dev-chip-variable' },
      { open: '~HEX~', close: '~HEX~', className: 'dev-chip-hex' },
      { open: '~STR~', close: '~STR~', className: 'dev-chip-string' },
      { open: '~RS~', close: '~RS~', className: 'av-chip-radar-sweep' },
      { open: '~HD~', close: '~HD~', className: 'av-chip-heading' },
      { open: '~AL~', close: '~AL~', className: 'av-chip-altimeter' },
      { open: '~SG~', close: '~SG~', className: 'av-chip-signal' },
      { open: '~PP-C~', close: '~', className: 'megachip-plasma plasma-cyan' },
      { open: '~PP-O~', close: '~', className: 'megachip-plasma plasma-orange' },
      { open: '~PP-R~', close: '~', className: 'megachip-plasma plasma-crimson' },
      { open: '~PP-L~', close: '~', className: 'megachip-plasma plasma-lime' },
      { open: '~GB-B~', close: '~', className: 'megachip-glass-bracket bracket-blue' },
      { open: '~GB-PR~', close: '~', className: 'megachip-glass-bracket bracket-amethyst' },
      { open: '~GB-PK~', close: '~', className: 'megachip-glass-bracket bracket-fuchsia' },
      { open: '~GB-Y~', close: '~', className: 'megachip-glass-bracket bracket-amber' },
      { open: '~CN-SL~', close: '~', className: 'megachip-circuit-node circuit-slate' },
      { open: '~CN-T~', close: '~', className: 'megachip-circuit-node circuit-teal' },
      { open: '~CN-GL~', close: '~', className: 'megachip-circuit-node circuit-gold' },
      { open: '~CN-R~', close: '~', className: 'megachip-circuit-node circuit-ruby' },
      { open: '~DR~', close: '~DR~', className: 'jr-chip-date-plate' },
      { open: '~MD~', close: '~MD~', className: 'jr-chip-mood' },
      { open: '~VO~', close: '~VO~', className: 'jr-chip-voice-tag' },
      { open: '~WX~', close: '~WX~', className: 'jr-chip-weather' },
      { open: '~WS~', close: '~WS~', className: 'jr-chip-wax-stamp' },
      { open: '~B-B~', close: '~', className: 'aero-glass-badge-chip badge-frame-sky' },
      { open: '~B-G~', close: '~', className: 'aero-glass-badge-chip badge-frame-emerald' },
      { open: '~B-O~', close: '~', className: 'aero-glass-badge-chip badge-frame-orange' },
      { open: '~B-R~', close: '~', className: 'aero-glass-badge-chip badge-frame-crimson' },
      { open: '~B-PR~', close: '~', className: 'aero-glass-badge-chip badge-frame-amethyst' },
      { open: '~B-PK~', close: '~', className: 'aero-glass-badge-chip badge-frame-rose' },
      { open: '~B-Y~', close: '~', className: 'aero-glass-badge-chip badge-frame-gold' },
      { open: '~TL~', close: '~TL~', className: 'effect-tinted-lens' },
      { open: '~NO~', close: '~NO~', className: 'applet-neon-node node-cyan' },
      { open: '~SL~', close: '~SL~', className: 'effect-audio-stream-loop' },
      { open: '~BG~', close: '~BG~', className: 'effect-biogel-capsule' },
      { open: '~LS~', close: '~LS~', className: 'applet-latch-toggle' },
      { open: '~TIM~', close: '~TIM~', className: 'applet-gadget-system-clock' },
      { open: '~FT~', close: '~FT~', className: 'jr-folder-tab' },
      { open: '~PT~', close: '~PT~', className: 'jr-progress-capsule' },
      { open: '~MC~', close: '~MC~', className: 'jr-digital-counter' },
      { open: '~RD~', close: '~RD~', className: 'jr-dot-matrix' },
      { open: '~LL~', close: '~ST~', className: 'jr-latch-lock' },
      { open: '~WR~', close: '~WR~', className: 'effect-neon-ribbon' },
      { open: '~DH-B~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-sky', isMultiDuplex: true },
      { open: '~DH-G~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-emerald', isMultiDuplex: true },
      { open: '~DH-O~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-orange', isMultiDuplex: true },
      { open: '~DH-PR~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-amethyst', isMultiDuplex: true },
      { open: '~SH-B~', close: '~', className: 'gel-chip-swayed swayed-sky' },
      { open: '~SH-G~', close: '~', className: 'gel-chip-swayed swayed-emerald' },
      { open: '~SH-O~', close: '~', className: 'gel-chip-swayed swayed-orange' },
      { open: '~SH-PR~', close: '~', className: 'gel-chip-swayed swayed-amethyst' },
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
      { open: '~DR-SL~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-slate' }
    ].concat(window.OMICRON_EXTRA_DEFS || []);

    for (let def of inlineDefinitions) {
      let openIdx = textContent.indexOf(def.open);
      if (openIdx === -1) continue;

      let closeIdx = textContent.indexOf(def.close, openIdx + def.open.length);
      if (closeIdx === -1) continue;

      e.preventDefault();
      playAeroClickSound(850, 0.12);

      const targetText = textContent.substring(openIdx + def.open.length, closeIdx).trim();

      const targetRange = document.createRange();
      targetRange.setStart(container, openIdx);
      targetRange.setEnd(container, closeIdx + def.close.length);
      targetRange.deleteContents();

      let newNode;
      if (def.isMultiDuplex) {
        newNode = document.createElement('div');
        newNode.className = def.className;
        newNode.setAttribute('contenteditable', 'false');
        const leftInput = document.createElement('div');
        leftInput.className = 'input-left';
        leftInput.setAttribute('contenteditable', 'true');
        leftInput.innerText = targetText || 'Left';
        const rightInput = document.createElement('div');
        rightInput.className = 'input-right';
        rightInput.setAttribute('contenteditable', 'true');
        rightInput.innerText = 'Right';
        newNode.appendChild(leftInput); newNode.appendChild(rightInput);
      } else {
        newNode = document.createElement(def.tagName || 'span');
        newNode.className = def.className || '';
        if (def.isMirror) {
          newNode.setAttribute('data-text', targetText);
          newNode.innerText = targetText;
        } else if (def.isWave) {
          for (let i = 0; i < targetText.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.className = 'kinetic-wave-char';
            charSpan.innerText = targetText[i];
            charSpan.style.animationDelay = (i * 0.1) + 's';
            newNode.appendChild(charSpan);
          }
        } else {
          newNode.innerText = targetText;
        }
      }

      // Interactive Applet Behaviors
      if (def.isToggle) { 
        newNode.innerHTML = `<span>${targetText}</span><div class="switch-pill"></div>`; 
        newNode.addEventListener('click', function() { 
          playAeroClickSound(650, 0.08); 
          newNode.classList.toggle('turned-on'); 
        }); 
      }
      if (def.isStateToggle) {
        newNode.innerText = targetText;
        newNode.addEventListener('click', function() {
          if (newNode.classList.contains('state-green')) {
            playAeroClickSound(400, 0.12);
            newNode.classList.remove('state-green');
            newNode.classList.add('state-red');
          } else {
            playAeroClickSound(650, 0.08);
            newNode.classList.remove('state-red');
            newNode.classList.add('state-green');
          }
        });
      }
      if (def.isVolumeDial) {
        newNode.innerHTML = `<span>${targetText}: 0%</span><div class="dial-knob"></div>`;
        let level = 0;
        newNode.addEventListener('click', function() {
          level = (level + 25) % 125;
          newNode.querySelector('span').innerText = `${targetText}: ${level}%`;
          newNode.querySelector('.dial-knob').style.transform = `rotate(${(level / 100) * 270}deg)`;
          playAeroClickSound(400 + (level * 2), 0.08);
        });
      }
      if (def.isBatteryCell) {
        newNode.innerHTML = `<span>${targetText}</span><div class="battery-juice-grid"><div class="juice-block"></div><div class="juice-block"></div><div class="juice-block"></div></div>`;
        let capacity = 3;
        newNode.addEventListener('click', function() {
          capacity = capacity === 0 ? 3 : capacity - 1;
          playAeroClickSound(300 + (capacity * 100), 0.1);
          const blocks = newNode.querySelectorAll('.juice-block');
          blocks.forEach((block, idx) => {
            if (idx < capacity) block.classList.remove('drain');
            else block.classList.add('drain');
          });
        });
      }
      if (def.isSecurityLatch) {
        newNode.innerHTML = `<span class="latch-icon-frame">🔒</span> <span>${targetText}: LOCKED</span>`;
        let locked = true;
        newNode.addEventListener('click', function() {
          locked = !locked;
          if (!locked) {
            playAeroClickSound(900, 0.15);
            newNode.classList.add('latch-unlocked');
            newNode.querySelector('.latch-icon-frame').innerText = "🔓";
            newNode.querySelector('span:not(.latch-icon-frame)').innerText = `${targetText}: OPEN`;
          } else {
            playAeroClickSound(350, 0.12);
            newNode.classList.remove('latch-unlocked');
            newNode.querySelector('.latch-icon-frame').innerText = "🔒";
            newNode.querySelector('span:not(.latch-icon-frame)').innerText = `${targetText}: LOCKED`;
          }
        });
      }

      targetRange.insertNode(newNode);

      const afterRange = document.createRange();
      afterRange.setStartAfter(newNode);
      afterRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(afterRange);
      const host2 = newNode.parentElement && newNode.parentElement.closest('[contenteditable="true"]');
      if (host2) host2.dispatchEvent(new Event('input', { bubbles: true }));
      break;
    }
  });
});

function clearPage() {
  playAeroClickSound(400, 0.1);
  elementsList = [];
  renderDocument();
}

function exportBodyHTML() {
  let bodyHTML = '';
  elementsList.forEach(item => {
    let inner = '';
    if (item.type === 'heading') {
      const tag = item.variant === 'h2' ? 'h2' : item.variant === 'subtitle' ? 'p' : 'h1';
      const cls = item.variant === 'h2' ? 'wysiwyg-h2' : item.variant === 'subtitle' ? 'wysiwyg-subtitle' : 'wysiwyg-h1';
      inner = `<${tag} class="${cls}"${item.variant === 'h1' ? ` style="color:${accentColor}"` : ''}>${item.content}</${tag}>`;
    } else if (item.type === 'paragraph') {
      const cls = item.variant === 'lead' ? 'wysiwyg-p-lead' : item.variant === 'quote' ? 'wysiwyg-p-quote' : 'wysiwyg-p-standard';
      inner = `<div class="${cls} kd-content">${item.content}</div>`;
    } else if (item.type === 'button') {
      const cls = item.variant === 'glass' ? 'btn-glass' : item.variant === 'outline' ? 'btn-outline' : 'btn-primary';
      inner = `<button class="${cls}" style="--om-a:${accentColor}">${item.content}</button>`;
    } else if (item.type === 'image') {
      const cls = item.variant === 'avatar' ? 'img-avatar' : item.variant === 'card' ? 'img-card' : 'img-hero';
      inner = `<img class="${cls}" src="${item.content}" alt="">`;
    } else if (item.type === 'rich') {
      inner = `<div class="wysiwyg-rich kd-content">${item.content}</div>`;
    } else if (item.type === 'html') {
      inner = item.content;
    } else if (item.type === 'card') {
      const parts = String(item.content).split('|');
      const cls = item.variant === 'glass' ? 'card-glass' : 'card-border';
      inner = `<div class="${cls}" style="--om-a:${accentColor}">\n    <h3>${parts[0]}</h3>\n    <p>${parts[1] || ''}</p>\n  </div>`;
    }
    const bs = blockStyleCss(item);
    bodyHTML += `  <div class="omicron-block"${bs ? ` style="${bs}"` : ''}>${inner}</div>\n`;
  });
  return bodyHTML;
}

// Pages holding BitLang programs carry the tiny runtime so they play when exported!
let blSrc = '', bbSrc = '';
fetch('bitlang.js?v=20261118').then(r => r.text()).then(t => { blSrc = t; }).catch(() => {});
fetch('bb-lite.js?v=20261118').then(r => r.text()).then(t => { bbSrc = t; }).catch(() => {});
function blExportScript() {
  const body = exportBodyHTML();
  const hasProg = /bl-prog/.test(body), hasSong = /bb-chip/.test(body);
  if (!hasProg && !hasSong) return '';
  const safe = t => t.replace(/<\/script/gi, '<\\/script');
  let out = '\n<script>\n';
  if (hasProg && blSrc) out += safe(blSrc) + '\n';
  // songs in exported pages load the player from the live site!
  if (bbSrc) out += "window.BB_SYNTH_URL='https://radii-office.com/omicron/abyssbox_synth.min.js';\n" + safe(bbSrc) + '\n';
  if (hasProg && blSrc) out += 'BitLang.hydrate(document);\n';
  return out + '<\/script>';
}

function generateExportHTML(inlineCss) {
  const width = (document.getElementById('canvas-width-select') || {}).value || '720px';
  const styleTag = inlineCss ? `<style>\n${inlineCss}\n</style>` : '<link rel="stylesheet" href="Style.css">';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Webpage</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap">
  ${styleTag}${pageCode.css ? `\n  <style>\n${pageCode.css}\n  </style>` : ''}${pageCode.head ? `\n  ${pageCode.head}` : ''}
</head>
<body>
<main class="page-paper" style="width:${width};${pageFlexCss()}">
${exportBodyHTML().replace(/<button[^>]*class="bl-chip-edit"[^>]*>[^<]*<\/button>/g, '')}</main>${blExportScript()}${pageCode.js ? `\n<script>\n${String(pageCode.js).replace(/<\/script/gi, '<\\/script')}\n</script>` : ''}
</body>
</html>`;
}

function openExportModal() {
  playAeroClickSound(750, 0.12);
  document.getElementById('export-textarea').value = generateExportHTML();
  document.getElementById('export-modal').classList.add('active');
}

function closeExportModal() {
  document.getElementById('export-modal').classList.remove('active');
}

function copyCodeToClipboard() {
  const textarea = document.getElementById('export-textarea');
  textarea.select();
  navigator.clipboard.writeText(textarea.value);
  const btn = document.getElementById('copy-btn');
  btn.innerText = '✅ COPIED!';
  setTimeout(() => btn.innerText = '📋 COPY TO CLIPBOARD', 2000);
}

// Initial Load
if (window.__omicronWidth) updateCanvasWidth(window.__omicronWidth);
renderDocument();