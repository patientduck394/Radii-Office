// ==========================================
// PART 1: GLOBAL ELEMENT SELECTORS & STATE
// ==========================================
// BITBOOK: one-time migration from shared Writeout keys to Bitbook-only keys!
// (Runs before any storage read so existing notes carry over, then never again!)
(function () {
    var pairs = [
        ['writedown_save_slot_1', 'bitbook_save_slot_1'],
        ['writedown_save_slot_2', 'bitbook_save_slot_2'],
        ['writeout_hide_ambient', 'bitbook_hide_ambient'],
        ['writeout_restore_docs', 'bitbook_restore_notes'],
        ['writeout_tabs_v1', 'bitbook_tabs_v1'],
        ['writeout_tabs_active', 'bitbook_tabs_active'],
        ['writeout_picker_view', 'bitbook_picker_view'],
        ['writeout_format_group', 'bitbook_format_group'],
        ['writeout_page_size', 'bitbook_note_size'],
        ['writeout_page_orientation', 'bitbook_note_orientation'],
        ['writeout_doc_password', 'bitbook_note_password'],
        ['writeout_marketplace_installed_v1', 'bitbook_marketplace_installed_v1'],
        ['writeout_marketplace_active_theme', 'bitbook_marketplace_active_theme'],
        ['writeout_marketplace_hide_installed', 'bitbook_marketplace_hide_installed']
    ];
    try {
        if (localStorage.getItem('bitbook_storage_migrated_v1') === '1') return;
        pairs.forEach(function (p) {
            try {
                if (localStorage.getItem(p[1]) !== null) return;
                var v = localStorage.getItem(p[0]);
                if (v !== null) localStorage.setItem(p[1], v);
            } catch (e) {}
        });
        try { localStorage.setItem('bitbook_storage_migrated_v1', '1'); } catch (e) {}
    } catch (e) {}
})();
const canvas = document.getElementById('wysiwyg-canvas');
const sidebar = document.getElementById('sidebar');
const toggleZone = document.getElementById('toggle-zone');
const toggleIcon = document.getElementById('toggle-icon');

// Track active document tracking loops
let currentActivePadId = "1"; 
let isInitialBootSync = true; // CRITICAL FLAG: Blocks empty save overwrites on refresh

// Temporary volatile memory variable to hold your Table notes while app stays open
let temporaryTableScratchContent = `<h1>One-Time Table Pad</h1><p>This is a temporary scratch space. Everything typed here will wipe completely clean when you close or refresh the app...</p>`;

function loadActivePadDataStream(padId) {
    // Only execute autoSave if we are NOT on the initial application boot cycle
    if (!isInitialBootSync) {
        autoSaveCanvasContent();
    }
    
    currentActivePadId = padId;
    
    // Synchronize your left side button highlighting states precisely
    document.querySelectorAll('.pad-toggle-btn').forEach(btn => {
        if (btn.getAttribute('data-pad') === padId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // --- FORCE NATIVE INLINE STRUCTURAL BLOCKING ---
    // Forces the browser engine to drop clean <div> rows on enter instead of bloated paragraphs
    document.execCommand('defaultParagraphSeparator', false, 'div');
    // Lower the gate flag right after our very first clean boot load completes
    isInitialBootSync = false;
}

function autoSaveCanvasContent() {
    // Prevent saves if initial boot streaming is still executing setup hooks
    if (!canvas || isInitialBootSync) return;

    // One serialization per save: innerHTML is the expensive part on big docs!
    const htmlNow = canvas.innerHTML;
    if (currentActivePadId === "3") {
        temporaryTableScratchContent = htmlNow;
    } else {
        const saveKeyId = `bitbook_save_slot_${currentActivePadId}`;
        localStorage.setItem(saveKeyId, htmlNow);
    }
    // Keep the tab snapshot in lockstep (programmatic edits fire no input event)!
    try {
        if (typeof kdActiveTab === 'function' && typeof kdSaveTabs === 'function') {
            const t = kdActiveTab();
            if (t) t.html = htmlNow;
            kdSaveTabs();
        }
    } catch (e) {}
}

// Intercept characters and input modifications to process notes
if (canvas) {
    canvas.addEventListener('input', autoSaveCanvasContent);
}

// ==========================================
// PART 2: AUDIO SOUND EFFECTS ENGINE
// ==========================================
function playAeroClickSound(frequency = 600, duration = 0.08) {
    try {
        const ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.connect(gainNode); gainNode.connect(ctx.destination);
        oscillator.start(); oscillator.stop(ctx.currentTime + duration);
    } catch (e) {}
}

// ==========================================
// PART 3: UI SIDEBAR & FULL CANVAS PAD SELECTION
// ==========================================
// ==========================================
// PART 3: UI SIDEBAR BUTTON INTERACTIVE LOGIC
// ==========================================
if (toggleZone) {
    toggleZone.addEventListener('click', function() {
        playAeroClickSound(450, 0.12);
        sidebar.classList.toggle('collapsed');
        const sidebarCollapsed = sidebar.classList.contains('collapsed');
        if (toggleIcon) toggleIcon.style.transform = sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        // Opening the sidebar moves keyboard focus straight into it!
        if (!sidebarCollapsed && typeof sidebar.focus === 'function') {
            try { sidebar.focus(); } catch (e) {}
        }
    });
}

// RESTORED SIDEBAR ACTIONS: Handlers strictly trigger our explicit filesystem saving loops
document.querySelectorAll('.pad-toggle-btn, #btn-one-time-table').forEach(btn => {
    btn.addEventListener('click', function() {
        // Play the responsive audio blip on every button hover click state
        playAeroClickSound(550, 0.1);

        // The Download button toggles its own popup via inline onclick — skip it here!
        if (btn.id === 'download-menu-btn') return;

        // Use short checks to handle your import actions cleanly based on button text
        const actionLabelText = btn.innerText.trim().toLowerCase();

        if (actionLabelText.includes('import')) {
            document.getElementById('file-loader-gate').click();
        }
    });
});


function initializeAmbientDroplets() {
    const dropletCount = 6;
    for (let i = 0; i < dropletCount; i++) {
        const drop = document.createElement('div'); drop.className = 'ambient-droplet';
        const size = Math.random() * 80 + 40;
        drop.style.width = size + 'px'; drop.style.height = size + 'px';
        drop.style.top = Math.random() * 80 + 'vh'; drop.style.left = Math.random() * 90 + 'vw';
        drop.style.animationDelay = (Math.random() * -15) + 's'; drop.style.animationDuration = (Math.random() * 10 + 15) + 's';
        document.body.appendChild(drop);
    }
}

// Floating spheres on/off (Settings persists bitbook_hide_ambient = '1')!
function kdAmbientHidden() {
    try { return localStorage.getItem('bitbook_hide_ambient') === '1'; } catch (e) { return false; }
}
try {
    if (kdAmbientHidden() && document.body) document.body.classList.add('hide-ambient');
} catch (e) {}
if (!kdAmbientHidden()) initializeAmbientDroplets();

// Launch on application boot directly to Slot 1


// ==========================================
// PART 4: KEYDOWN SHORTCUT & MACRO ENGINE (SECTION A)
// ==========================================
if (canvas) {
    canvas.addEventListener('keydown', function(e) {
        // --- DENT SHORTCUTS: Ctrl/Cmd+[ outdents, Ctrl/Cmd+] indents! ---
        if ((e.ctrlKey || e.metaKey) && (e.key === '[' || e.key === ']')) {
            e.preventDefault();
            if (typeof fmtIndentBlocks === 'function') fmtIndentBlocks(e.key === ']' ? 1 : -1);
            return;
        }
        // --- STYLE SHORTCUTS: Ctrl/Cmd+B/I/U on selections, Ctrl/Cmd+S exports! ---
        if ((e.ctrlKey || e.metaKey) && e.target && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            const k = String(e.key || '').toLowerCase();
            if (k === 'b' || k === 'i' || k === 'u') {
                const sel = window.getSelection();
                if (sel.rangeCount && !sel.isCollapsed && canvas.contains(sel.anchorNode)) {
                    e.preventDefault();
                    try {
                        if (typeof document.execCommand === 'function') {
                            document.execCommand(k === 'b' ? 'bold' : (k === 'i' ? 'italic' : 'underline'), false, null);
                        }
                    } catch (err) {}
                    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                }
                return;
            }
            if (k === 's') {
                e.preventDefault();
                if (typeof exportKeydownFile === 'function') exportKeydownFile();
                return;
            }
        }
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        // --- EMPTY FORMAT EXIT: Enter inside an empty chip/format clears it + line breaks! ---
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            const ae = document.activeElement;
            const aNodeX = selection.anchorNode;
            const inField = (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) ||
                (aNodeX && aNodeX.nodeType === 1 && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(aNodeX.tagName));
            // --- FOOTNOTES: "[^1]: text" + Enter becomes the definition block! ---
            if (!inField && kdTryFootnoteEnter(e, selection, range)) return;
            if (!inField && (function () {
                let startEl = null;
                if (aNodeX) startEl = (aNodeX.nodeType === Node.TEXT_NODE) ? aNodeX.parentElement : aNodeX;
                const INLINE_FMT = {SPAN:0,B:0,STRONG:0,I:0,EM:0,U:0,S:0,STRIKE:0,CODE:0,FONT:0,A:0};
                const BLOCK_FMT = {BLOCKQUOTE:0,H1:0,H2:0,H3:0};
                const isEmptyFmt = function (el) {
                    if (!el || el.nodeType !== 1 || el === canvas || !canvas.contains(el)) return false;
                    if (el.querySelector('input,textarea,button,select,[contenteditable="false"]')) return false;
                    if (((el.textContent || '').replace(/[\s\u200B]/g, '')) !== '') return false;
                    const tag = el.tagName;
                    if (tag === 'SPAN') return !!(el.className && String(el.className).trim());
                    if (tag in INLINE_FMT || tag in BLOCK_FMT) return true;
                    if ((tag === 'DIV' || tag === 'P' || tag === 'LI') && el.className && String(el.className).trim()) return true;
                    return false;
                };
                let outer = null;
                let probe = startEl;
                while (probe && isEmptyFmt(probe)) { outer = probe; probe = probe.parentElement; }
                if (!outer) return false;
                e.preventDefault();
                playAeroClickSound(600, 0.08);
                const parent = outer.parentNode;
                const wasBlock = /^(DIV|P|LI|H1|H2|H3|BLOCKQUOTE|UL|OL)$/.test(outer.tagName);
                const fresh = document.createElement('div');
                fresh.appendChild(document.createElement('br'));
                if (wasBlock) {
                    parent.insertBefore(fresh, outer);
                    outer.remove();
                } else {
                    outer.remove();
                    let block = parent;
                    while (block && block !== canvas && !/^(DIV|P|LI|H1|H2|H3|BLOCKQUOTE|UL|OL)$/.test(block.tagName)) block = block.parentNode;
                    if (!block || block === canvas) canvas.appendChild(fresh);
                    else block.parentNode.insertBefore(fresh, block.nextSibling);
                }
                const nr = document.createRange();
                nr.setStart(fresh, 0);
                nr.collapse(true);
                selection.removeAllRanges();
                selection.addRange(nr);
                if (window.KdBlockEditor) { try { fresh.setAttribute('contenteditable', 'true'); fresh.focus({ preventScroll: true }); selection.removeAllRanges(); selection.addRange(nr); window.KdBlockEditor.keepFocus(); } catch (err) {} }
                if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                return true;
            })()) return;
        }

        // --- ESCAPE MECHANIC: Break out cleanly to the right when typing \\ ---
        if (e.key === ' ' || e.key === 'Enter') {
            const container = range.startContainer;
            
            const formattingWrapper = container.nodeType === Node.TEXT_NODE 
                ? container.parentElement.closest('span, code, strong, em') 
                : container.closest('span, code, strong, em');

            if (formattingWrapper && formattingWrapper !== canvas) {
                const textContent = formattingWrapper.innerText || formattingWrapper.textContent;
                
                if (textContent.endsWith('\\\\')) {
                    e.preventDefault();
                    playAeroClickSound(550, 0.08);

                    // 1. Strip the trailing \\ from the wrapper
                    formattingWrapper.innerText = textContent.slice(0, -2);

                    // 2. Create a clean text node with a space outside to the right
                    const outerTextNode = document.createTextNode('\u00A0');
                    formattingWrapper.parentNode.insertBefore(outerTextNode, formattingWrapper.nextSibling);

                    // 3. Force focus and move the cursor directly into the new node
                    const newRange = document.createRange();
                    newRange.setStart(outerTextNode, 1);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    
                    autoSaveCanvasContent();
                    return;
                }
            }
        }

        const textNode = range.startContainer;
        if (textNode.nodeType !== Node.TEXT_NODE) return;

        const rawNodeTextValue = textNode.nodeValue;
        const currentCaretOffset = range.startOffset;
        
        // Unifying all line tracking under your exact variable name match
        const currentLineText = rawNodeTextValue.substring(0, currentCaretOffset);
        
        if (e.key === ' ') {
            // --- Double Colon Visual Component Injections ---
            // --- QUICK BLOCKS: "> " becomes a blockquote, "* " a bulleted list! ---
            if (currentLineText === '>') {
                e.preventDefault(); playAeroClickSound(750, 0.12);
                const bq = document.createElement('blockquote');
                bq.className = 'blockquote-list';
                const bzw = document.createTextNode('\u200B');
                bq.appendChild(bzw);
                range.insertNode(bq); textNode.nodeValue = '';
                const bnr = document.createRange();
                bnr.setStart(bzw, 1); bnr.collapse(true);
                selection.removeAllRanges(); selection.addRange(bnr);
                if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                return;
            }
            if (currentLineText === '*') {
                e.preventDefault(); playAeroClickSound(750, 0.12);
                const ul = document.createElement('ul');
                ul.className = 'bulleted-list';
                const li = document.createElement('li');
                const lzw = document.createTextNode('\u200B');
                li.appendChild(lzw);
                ul.appendChild(li);
                range.insertNode(ul); textNode.nodeValue = '';
                const lnr = document.createRange();
                lnr.setStart(lzw, 1); lnr.collapse(true);
                selection.removeAllRanges(); selection.addRange(lnr);
                if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                return;
            }
            // --- LINE SHORTCUTS: "# " "## " "### " are headings, "#### " the mega header, "* " a list! ---
            if (/^(#{1,4}|\*)$/.test(currentLineText) && !(textNode.parentNode && textNode.parentNode.closest && textNode.parentNode.closest('h1,h2,h3,li,pre,code,blockquote'))) {
                e.preventDefault(); playAeroClickSound(750, 0.12);
                const lvl = currentLineText.length;
                let blockEl, holder;
                if (currentLineText === '*') {
                    blockEl = document.createElement('ul'); blockEl.className = 'bulleted-list';
                    holder = document.createElement('li'); blockEl.appendChild(holder);
                } else {
                    blockEl = document.createElement(lvl === 4 ? 'h1' : 'h' + lvl);
                    blockEl.className = lvl === 4 ? 'mega-header' : 'header-' + lvl;
                    holder = blockEl;
                }
                const hzw = document.createTextNode('​');
                holder.appendChild(hzw);
                range.insertNode(blockEl); textNode.nodeValue = '';
                const hnr = document.createRange();
                hnr.setStart(hzw, 1); hnr.collapse(true);
                selection.removeAllRanges(); selection.addRange(hnr);
                if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                return;
            }
            // --- LaTeX: "$x^2$" or "$$...$$" then Space becomes typeset math (latex.js)! ---
            if (typeof window.kdMathTryConvert === 'function' && window.kdMathTryConvert(e, currentLineText, textNode, range, selection)) return;
            // --- FOOTNOTES: "[^1] " becomes a linkable chip, "[^1]: text " a definition! ---
            if (kdTryFootnoteSpace(e, currentLineText, textNode, range, selection)) return;
            if (currentLineText === '::glass') {
                e.preventDefault(); playAeroClickSound(750, 0.15);
                const glassBlock = document.createElement('div');
                glassBlock.className = 'aero-glass-block';
                glassBlock.innerHTML = 'Glass Header';
                range.insertNode(glassBlock); textNode.nodeValue = '';
                const targetNode = document.createTextNode('\u200B ');
                glassBlock.parentNode.insertBefore(targetNode, glassBlock.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }
            if (currentLineText === '::bubble') {
                e.preventDefault(); playAeroClickSound(850, 0.08);
                const bubbleSpan = document.createElement('span');
                bubbleSpan.className = 'aqua-bubble-text';
                bubbleSpan.innerText = 'Liquid Stream';
                range.insertNode(bubbleSpan); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode(' ');
                bubbleSpan.parentNode.insertBefore(targetNode, bubbleSpan.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }
            if (currentLineText === '::alert') {
                e.preventDefault(); playAeroClickSound(300, 0.2);
                const alertPlate = document.createElement('div');
                alertPlate.className = 'tactile-alert-plate';
                alertPlate.innerHTML = '<div class="alert-icon-orb">!</div> ⚠️ CRITICAL WARNING SYSTEM INITIALIZED';
                range.insertNode(alertPlate); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                alertPlate.parentNode.insertBefore(targetNode, alertPlate.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }
            if (currentLineText === '::media') {
                e.preventDefault(); playAeroClickSound(900, 0.05);
                const playerDeck = document.createElement('div');
                playerDeck.className = 'media-track-wrap';
                playerDeck.contentEditable = 'true';
                playerDeck.innerHTML = `<span class="media-track-text">NOW PLAYING: Track_Audio_Stream.wav</span><div class="media-control-orb"></div>`;
                range.insertNode(playerDeck); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                playerDeck.parentNode.insertBefore(targetNode, playerDeck.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }
            // --- Injected 3D Aqua Box Element Shortcut ---
            if (currentLineText === '::aqua') {
                e.preventDefault();
                playAeroClickSound(850, 0.15);
                
                // 1. Build the background container (Non-editable structure wrapper)
                const aquaBox = document.createElement('div');
                aquaBox.className = 'aqua-aero-box';
                aquaBox.setAttribute('contenteditable', 'false'); 
                
                // 2. Build the explicit foreground text area layer (EDIT-SAFE NODE)
                const innerContent = document.createElement('div');
                innerContent.className = 'aqua-box-content';
                innerContent.setAttribute('contenteditable', 'true'); // UNLOCKS EDITING CODES
                innerContent.innerHTML = '🌊 Start typing your aqua summary notes here...';
                
                // 3. Spawning the interactive upward-floating bubble clusters
                const bubbleCount = 5;
                for (let i = 0; i < bubbleCount; i++) {
                    const orb = document.createElement('div');
                    orb.className = 'aero-box-orb';
                    const size = Math.random() * 25 + 15; 
                    orb.style.width = size + 'px'; orb.style.height = size + 'px';
                    orb.style.left = (Math.random() * 80 + 10) + '%';
                    orb.style.animationDelay = (Math.random() * 4) + 's';
                    orb.style.animationDuration = (Math.random() * 3 + 4) + 's';
                    aquaBox.appendChild(orb);
                }
                
                aquaBox.appendChild(innerContent);
                range.insertNode(aquaBox);
                textNode.nodeValue = '';
                
                // 4. Force cursor focus cleanly INSIDE the newly generated text box area layer
                const newRange = document.createRange();
                newRange.selectNodeContents(innerContent);
                newRange.collapse(false); // Snap caret end position bounds
                selection.removeAllRanges();
                selection.addRange(newRange);
                innerContent.focus();
                return;
            }
            if (currentLineText === '::code') {
                e.preventDefault(); playAeroClickSound(750, 0.12);
                const codeBlockWrapper = document.createElement('div');
                codeBlockWrapper.className = 'writedown-code-block';
                codeBlockWrapper.setAttribute('contenteditable', 'false');
                const header = document.createElement('div');
                header.className = 'code-block-header'; header.innerHTML = '<span>CODE SPEC</span>';
                const contentArea = document.createElement('pre');
                contentArea.className = 'code-block-content'; contentArea.setAttribute('contenteditable', 'true');
                contentArea.innerText = '// Write text lines here...';
                codeBlockWrapper.appendChild(header); codeBlockWrapper.appendChild(contentArea);
                range.insertNode(codeBlockWrapper); textNode.nodeValue = '';
                const newRange = document.createRange(); newRange.selectNodeContents(contentArea);
                newRange.collapse(false); selection.removeAllRanges(); selection.addRange(newRange);
                contentArea.focus(); return;
            }
            // --- Helper Function to Spawn Edit-Safe Colored Bubble Boxes ---
            function createAeroBubbleBox(themeClass, placeholderText, textNode, range, selection) {
                playAeroClickSound(850, 0.15);
                
                const wrapper = document.createElement('div');
                wrapper.className = 'aqua-aero-box ' + themeClass;
                wrapper.setAttribute('contenteditable', 'false'); 
                
                const innerContent = document.createElement('div');
                innerContent.className = 'aqua-box-content';
                innerContent.setAttribute('contenteditable', 'true');
                innerContent.innerHTML = placeholderText;
                
                const bubbleCount = 5;
                for (let i = 0; i < bubbleCount; i++) {
                    const orb = document.createElement('div');
                    orb.className = 'aero-box-orb';
                    const size = Math.random() * 25 + 15; 
                    orb.style.width = size + 'px'; orb.style.height = size + 'px';
                    orb.style.left = (Math.random() * 80 + 10) + '%';
                    orb.style.animationDelay = (Math.random() * 4) + 's';
                    orb.style.animationDuration = (Math.random() * 3 + 4) + 's';
                    wrapper.appendChild(orb);
                }
                
                wrapper.appendChild(innerContent);
                range.insertNode(wrapper);
                textNode.nodeValue = '';
                
                const newRange = document.createRange();
                newRange.selectNodeContents(innerContent);
                newRange.collapse(false);
                selection.removeAllRanges();
                selection.addRange(newRange);
                innerContent.focus();
            }
                    // --- New Multi-Color Bubble Box Shortcut Intercepts ---
            if (currentLineText === '::emerald') {
                e.preventDefault();
                createAeroBubbleBox('aqua-emerald-box', '🌿 Start writing your eco-project logs here...', textNode, range, selection);
                return;
            }
            if (currentLineText === '::amber') {
                e.preventDefault();
                createAeroBubbleBox('aqua-amber-box', '☀️ Start writing your highlight notes here...', textNode, range, selection);
                return;
            }
            if (currentLineText === '::crimson') {
                e.preventDefault();
                createAeroBubbleBox('aqua-crimson-box', '🚨 Start writing urgent system tasks here...', textNode, range, selection);
                return;
            }
            if (currentLineText === '::amethyst') {
                e.preventDefault();
                createAeroBubbleBox('aqua-amethyst-box', '🔮 Start writing creative drafts here...', textNode, range, selection);
                return;
            }
                // --- Helper Function to Spawn Edit-Safe Embossed Glass Header Panels ---
                // --- Helper Function to Spawn 100% Fully Editable Glass Header Panels ---
            function createAeroGlassPanel(themeClass, headerLabel, placeholderText, textNode, range, selection) {
                playAeroClickSound(750, 0.12);
                
                // 1. Build the main structural chassis
                const panelWrapper = document.createElement('div');
                panelWrapper.className = 'aero-glass-panel ' + themeClass;
                panelWrapper.setAttribute('contenteditable', 'true'); // Unlocks typing across the entire container
                
                // 2. Build the top header banner deck (NOW OPEN FOR TYPING)
                const header = document.createElement('div');
                header.className = 'glass-panel-header';
                
                // Using a span inside ensures your custom font properties apply cleanly
                const headerSpan = document.createElement('span');
                headerSpan.innerText = headerLabel;
                headerSpan.setAttribute('placeholder', 'CLICK TO NAMING...'); // Set title placeholder bounds
                
                header.appendChild(headerSpan);
                
                // 3. Build the inner text area paragraph element
                const contentArea = document.createElement('p');
                contentArea.className = 'glass-panel-content';
                contentArea.innerHTML = placeholderText;
                
                // 4. Assemble the layout node tree
                panelWrapper.appendChild(header);
                panelWrapper.appendChild(contentArea);
                
                range.insertNode(panelWrapper);
                textNode.nodeValue = '';
                
                // 5. Force selection caret inside the body paragraph layer by default
                const newRange = document.createRange();
                newRange.selectNodeContents(contentArea);
                newRange.collapse(false);
                selection.removeAllRanges();
                selection.addRange(newRange);
                contentArea.focus();
            }
                        // --- New 3D Embossed Glass Panel Macro Intercepts ---
            if (currentLineText === '::gsky') {
                e.preventDefault();
                createAeroGlassPanel('panel-sky', '🔹 SKY COMPONENT', 'Start writing sky log notes here...', textNode, range, selection);
                return;
            }
            if (currentLineText === '::gemerald') {
                e.preventDefault();
                createAeroGlassPanel('panel-emerald', '🌿 ECO COMPONENT', 'Start writing organic project logs here...', textNode, range, selection);
                return;
            }
            if (currentLineText === '::gamber') {
                e.preventDefault();
                createAeroGlassPanel('panel-amber', '☀️ AMBER MATRIX', 'Start writing highlights or bullet specs here...', textNode, range, selection);
                return;
            }
            if (currentLineText === '::gcrimson') {
                e.preventDefault();
                createAeroGlassPanel('panel-crimson', '🚨 ALERT MANIFEST', 'Start writing urgent warning items here...', textNode, range, selection);
                return;
            }
            if (currentLineText === '::foldout') {
                e.preventDefault();
                playAeroClickSound(750, 0.12);
                
                // 1. Build the main parent box (Container Chassis)
                const foldoutBox = document.createElement('div');
                foldoutBox.className = 'aero-foldout-panel';
                foldoutBox.setAttribute('contenteditable', 'false'); // Secures parent layout frameworks
                
                // 2. Build the top header panel banner deck strip
                const header = document.createElement('div');
                header.className = 'foldout-panel-header';
                
                // Tactile caret toggle button arrow orb matching your wireframe example
                const arrowOrb = document.createElement('div');
                arrowOrb.className = 'foldout-arrow-orb';
                arrowOrb.innerText = '▲'; 
                
                const titleInput = document.createElement('div');
                titleInput.className = 'foldout-panel-title-input';
                titleInput.setAttribute('contenteditable', 'true'); // Unlocks editing on the title line text string
                titleInput.innerText = 'TITLE';
                
                header.appendChild(arrowOrb);
                header.appendChild(titleInput);
                
                // 3. Build the inner multi-line text paragraph element cavity
                const contentArea = document.createElement('div');
                contentArea.className = 'foldout-panel-content';
                contentArea.setAttribute('contenteditable', 'true'); // Unlocks multi-line body text typing
                contentArea.innerHTML = '<p>TEXT</p>';
                
                // 4. Wire up the foldout macro trigger action click hook
                arrowOrb.addEventListener('click', function() {
                    playAeroClickSound(450, 0.1);
                    foldoutBox.classList.toggle('panel-collapsed');
                });
                
                // 5. Assemble the node tree components
                foldoutBox.appendChild(header);
                foldoutBox.appendChild(contentArea);
                
                range.insertNode(foldoutBox);
                textNode.nodeValue = '';
                
                // 6. Force focus directly inside the text area body container cleanly
                const newRange = document.createRange();
                newRange.selectNodeContents(contentArea);
                newRange.collapse(false);
                selection.removeAllRanges();
                selection.addRange(newRange);
                contentArea.focus();
                return;
            }
            // --- Translucent Aqua Divider Line Shortcut ---
            if (currentLineText === '::divider') {
                e.preventDefault(); playAeroClickSound(400, 0.05);
                const divider = document.createElement('div');
                divider.className = 'aero-liquid-divider';
                divider.setAttribute('contenteditable', 'false');
                range.insertNode(divider); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                divider.parentNode.insertBefore(targetNode, divider.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range);
                return;
            }
            // --- Brushed Hardware Debug Terminal Panel Shortcut ---
            if (currentLineText === '::console') {
                e.preventDefault(); playAeroClickSound(300, 0.2);
                
                const consoleBlock = document.createElement('div');
                consoleBlock.className = 'writedown-console-block';
                consoleBlock.setAttribute('contenteditable', 'false');
                
                const header = document.createElement('div');
                header.className = 'console-block-header';
                header.innerHTML = '<span>⚠️ SYSTEM DEBUG CONSOLE</span>';
                
                const contentArea = document.createElement('pre');
                contentArea.className = 'console-block-content';
                contentArea.setAttribute('contenteditable', 'true');
                contentArea.innerText = 'error: Undefined reference tracking index bounds fault.';
                
                consoleBlock.appendChild(header); consoleBlock.appendChild(contentArea);
                range.insertNode(consoleBlock); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                consoleBlock.parentNode.insertBefore(targetNode, consoleBlock.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }

            // --- Translucent Revision Compare Block Shortcut ---
            if (currentLineText === '::diff') {
                e.preventDefault(); playAeroClickSound(500, 0.1);
                
                const diffBlock = document.createElement('div');
                diffBlock.className = 'writedown-diff-block';
                diffBlock.setAttribute('contenteditable', 'false');
                
                const contentArea = document.createElement('div');
                contentArea.className = 'diff-row-content';
                contentArea.setAttribute('contenteditable', 'true');
                contentArea.innerHTML = '<p class="diff-add">+ function initializeWorkspace() {</p><p class="diff-del">- function setupOldEngine() {</p>';
                
                diffBlock.appendChild(contentArea);
                range.insertNode(diffBlock); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                diffBlock.parentNode.insertBefore(targetNode, diffBlock.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
                        // --- Cockpit Artificial Horizon Indicator Shortcut ---
            }
            if (currentLineText === '::horizon') {
                e.preventDefault(); playAeroClickSound(600, 0.1);
                
                const horizonBlock = document.createElement('div');
                horizonBlock.className = 'writedown-horizon-block';
                horizonBlock.setAttribute('contenteditable', 'false');
                
                const pitchLine = document.createElement('div');
                pitchLine.className = 'horizon-pitch-line';
                
                let angles = [-15, 0, 15, 30, 0];
                let currentStep = 0;
                horizonBlock.addEventListener('click', function() {
                    currentStep = (currentStep + 1) % angles.length;
                    playAeroClickSound(550, 0.06);
                    pitchLine.style.transform = `rotate(${angles[currentStep]}deg) translateY(${angles[currentStep] * -0.5}px)`;
                });
                
                horizonBlock.appendChild(pitchLine);
                range.insertNode(horizonBlock); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                horizonBlock.parentNode.insertBefore(targetNode, horizonBlock.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }

            // --- Glowing Neon-Cyan Waypoint Navigation Plate Shortcut ---
            if (currentLineText === '::waypoint') {
                e.preventDefault(); playAeroClickSound(750, 0.12);
                
                const waypointBlock = document.createElement('div');
                waypointBlock.className = 'writedown-waypoint-block';
                waypointBlock.setAttribute('contenteditable', 'false');
                
                const header = document.createElement('div');
                header.className = 'waypoint-block-header';
                header.innerHTML = '<span>🛰️ FLIGHT WAYPOINT MONITOR</span>';
                
                const contentArea = document.createElement('div');
                contentArea.className = 'waypoint-block-content';
                contentArea.setAttribute('contenteditable', 'true');
                contentArea.innerHTML = 'NAV: WP_01 // COORD: 34.1803° N, 118.3090° W // ALT: ~2,400 FT';
                
                waypointBlock.appendChild(header); waypointBlock.appendChild(contentArea);
                range.insertNode(waypointBlock); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                waypointBlock.parentNode.insertBefore(targetNode, waypointBlock.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }
            // --- Skeuomorphic Ring Binder Journal Sheet Shortcut ---
            if (currentLineText === '::entry') {
                e.preventDefault(); playAeroClickSound(450, 0.12);
                
                const entryWrapper = document.createElement('div');
                entryWrapper.className = 'writedown-journal-entry';
                entryWrapper.setAttribute('contenteditable', 'false');
                
                const contentArea = document.createElement('div');
                contentArea.className = 'journal-entry-content';
                contentArea.setAttribute('contenteditable', 'true'); // Unlocks internal notebook rows
                contentArea.innerHTML = '<p>Write today\'s logs inside the ring binder entry...</p>';
                
                entryWrapper.appendChild(contentArea);
                range.insertNode(entryWrapper); textNode.nodeValue = '';
                
                const targetNode = document.createTextNode('\u200B ');
                entryWrapper.parentNode.insertBefore(targetNode, entryWrapper.nextSibling);
                range.setStart(targetNode, 1); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range); return;
            }
                        // --- Skeuomorphic Cockpit Speedo Gauge Block Shortcut ---
            
            // --- Genuine Real-Time Graphical Equalizer Block Shortcut ---
            
            // --- Interactive 3D Sketchpad Console Shortcut ---
            // --- Pixel-Perfect Multi-Line Sketchpad Console Shortcut ---
            // --- Pixel-Perfect, Color-Corrected Sketchpad Console ---
            // --- Pixel-Perfect, Color-Corrected Sketchpad Console Trigger ---
            if (currentLineText === '::draw') {
                e.preventDefault();
                playAeroClickSound(750, 0.12);
                
                // 1. Build the main parent box wrapper (Layout Chassis)
                const consoleWrapper = document.createElement('div');
                consoleWrapper.className = 'aero-draw-console';
                consoleWrapper.setAttribute('contenteditable', 'false'); // Secures parent frame border limits
                
                // 2. Build the top tool dashboard deck strip
                const dashboard = document.createElement('div');
                dashboard.className = 'draw-console-dashboard';
                
                const leftCluster = document.createElement('div');
                leftCluster.className = 'draw-tool-cluster';
                leftCluster.innerHTML = `<label>Color:</label>`;
                
                const colorPicker = document.createElement('input');
                colorPicker.type = 'color';
                colorPicker.className = 'draw-picker-orb';
                colorPicker.value = '#0369a1'; // Set signature sky blue theme color out of the box
                leftCluster.appendChild(colorPicker);
                
                leftCluster.innerHTML += `<label style="margin-left:8px;">Size:</label>
                                         <input type="range" class="draw-slider-fluid brush-size-slider" min="1" max="20" value="4">`;
                
                const rightCluster = document.createElement('div');
                rightCluster.className = 'draw-tool-cluster';
                rightCluster.innerHTML = `<label>Opacity:</label>
                                          <input type="range" class="draw-slider-fluid brush-opacity-slider" min="1" max="100" value="100">`;
                
                const clearBtn = document.createElement('button');
                clearBtn.className = 'draw-clear-orb';
                clearBtn.innerText = 'CLEAR';
                rightCluster.appendChild(clearBtn);
                
                dashboard.appendChild(leftCluster);
                dashboard.appendChild(rightCluster);
                
                // 3. Build the hardware canvas node element with fixed resolution bounds
                const paintCanvas = document.createElement('canvas');
                paintCanvas.className = 'draw-surface-canvas';
                paintCanvas.width = 540;  // Direct coordinate resolution assignments stop stretching artifacts
                paintCanvas.height = 180; 
                
                consoleWrapper.appendChild(dashboard);
                consoleWrapper.appendChild(paintCanvas);
                
                // Clear out the raw typed trigger characters from the line track node right before insertion
                textNode.nodeValue = beforeText; 
                range.insertNode(consoleWrapper);
                
                // 4. Initialize Core HTML5 2D Graphics Context Operations
                const ctx = paintCanvas.getContext('2d');
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                let isDrawing = false;
                let lastX = 0;
                let lastY = 0;
                
                // Hardware calculation matrix to synchronize your exact mouse cursor tip positions
                function getMouseCoordinates(evt) {
                    const rect = paintCanvas.getBoundingClientRect();
                    return {
                        x: (evt.clientX - rect.left) * (paintCanvas.width / rect.width),
                        y: (evt.clientY - rect.top) * (paintCanvas.height / rect.height)
                    };
                }
                
                // Track draw loop vectors sequentially on mouse events
                paintCanvas.addEventListener('mousedown', function(evt) {
                    isDrawing = true;
                    const coords = getMouseCoordinates(evt);
                    lastX = coords.x;
                    lastY = coords.y;
                });
                
                paintCanvas.addEventListener('mousemove', function(evt) {
                    if (!isDrawing) return;
                    
                    const coords = getMouseCoordinates(evt);
                    
                    const sizeSlider = consoleWrapper.querySelector('.brush-size-slider');
                    const opacitySlider = consoleWrapper.querySelector('.brush-opacity-slider');
                    
                    // PULL COLOR SELECTION DYNAMICALLY: Fixes color-locking failure bug
                    const baseHexColor = colorPicker.value;
                    const alphaValue = opacitySlider.value / 100;
                    
                    // Convert hex to rgb smoothly inline on every frame movement loop tick
                    const r = parseInt(baseHexColor.slice(1, 3), 16);
                    const g = parseInt(baseHexColor.slice(3, 5), 16);
                    const b = parseInt(baseHexColor.slice(5, 7), 16);
                    
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(coords.x, coords.y);
                    
                    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
                    ctx.lineWidth = sizeSlider.value;
                    ctx.stroke();
                    
                    lastX = coords.x;
                    lastY = coords.y;
                });
                
                paintCanvas.addEventListener('mouseup', function() { isDrawing = false; });
                paintCanvas.addEventListener('mouseleave', function() { isDrawing = false; });
                
                clearBtn.addEventListener('click', function() {
                    playAeroClickSound(350, 0.1);
                    ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
                });
                
                // 5. Append trailing character text spacer element node to anchor your blinking cursor below the block element
                const targetNode = document.createTextNode('\u200B ');
                consoleWrapper.parentNode.insertBefore(targetNode, consoleWrapper.nextSibling);
                
                const newRange = document.createRange();
                newRange.setStart(targetNode, 1);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                return;
            }

        }
        // --- SECTION B: Inline Saturated Formatting Definition Matrix ---
        // Only Space or Enter compile a macro (any other key used to fire it mid-typing, e.g. "**" + "b")!
        if (e.key !== ' ' && e.key !== 'Enter') return;
        const definitions = [
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

            { open: '~FN~', close: '~FN~', className: 'applet-foldout-tab', isFoldout: true },
            { open: '~TS~', close: '~TS~', className: 'applet-aqua-switch', isToggle: true },
            { open: '~SM~', close: '~SM~', className: 'applet-glass-stamp' },
            
            { open: '~TB~', close: '~TB~', className: 'applet-state-button state-green', isStateToggle: true },
            { open: '~VD~', close: '~VD~', className: 'applet-volume-dial', isVolumeDial: true },
            { open: '~BC~', close: '~BC~', className: 'applet-battery-cell', isBatteryCell: true },
            { open: '~CD~', close: '~CD~', className: 'applet-calendar-desk', isCalendarDesk: true },
            { open: '~SR~', close: '~SR~', className: 'applet-star-rating', isStarRating: true },
            { open: '~CC~', close: '~CC~', className: 'applet-counter-badge', isCounterBadge: true },
            { open: '~LK~', close: '~LK~', className: 'applet-security-latch', isSecurityLatch: true },
            
            { open: '~PR~', close: '~PR~', className: 'applet-playback-ribbon', isPlaybackRibbon: true },
            { open: '~CR~', close: '~CR~', className: 'applet-cpu-gauge', isCpuGauge: true },
            { open: '~SI~', close: '~SI~', className: 'applet-stepper-mesh', isStepperMesh: true },

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
            { open: '~ORB~', close: '~ORB~', className: 'applet-hydro-orb orb-blue', isHydroOrb: true },
            { open: '~WL~',  close: '~WL~',  className: 'effect-waveform-line' }, // Did not include in guide
            { open: '~PM~',  close: '~PM~',  className: 'effect-plasma-gel' },
            { open: '~SLS~', close: '~SLS~', className: 'applet-lock-slider', isLockSlider: true },
            { open: '~VM~',  close: '~VM~',  className: 'applet-gadget-clock', isGadclock: true },

            { open: '~WB~',  close: '~WB~',  className: 'effect-water-bubble' },
            { open: '~GLO~', close: '~GLO~', className: 'effect-glow-tracer' },
            { open: '~MT~',  close: '~MT~',  className: 'applet-metal-trigger', isMetalTrigger: true },
            { open: '~IC~',  close: '~IC~',  className: 'applet-inset-check', isInsetCheck: true },
            { open: '~ST~',  close: '~ST~',  className: 'effect-shimmer-title' },

            { open: '~WD-Y~', close: '~', className: 'droplet-amber' },
            { open: '~WD-R~', close: '~', className: 'droplet-crimson' },
            { open: '~WD-PK~', close: '~', className: 'droplet-fuchsia' },
            { open: '~WD-PR~', close: '~', className: 'droplet-amethyst' },
            { open: '~WD-O~', close: '~', className: 'droplet-tangerine' },
            { open: '~WD-SL~', close: '~', className: 'droplet-slate' },

            { open: '~FUNC~',  close: '~FUNC~',  className: 'dev-chip-function' },
            { open: '~VAR~', close: '~VAR~', className: 'dev-chip-variable' },
            { open: '~HEX~', close: '~HEX~', className: 'dev-chip-hex', isHexSwatch: true },
            { open: '~STR~', close: '~STR~', className: 'dev-chip-string' },

            { open: '~RS~', close: '~RS~', className: 'av-chip-radar-sweep' },
            { open: '~HD~', close: '~HD~', className: 'av-chip-heading' },
            { open: '~AL~', close: '~AL~', className: 'av-chip-altimeter' },
            { open: '~SG~', close: '~SG~', className: 'av-chip-signal', isSignalNode: true },

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

            // STYLE 3: Tactile Circuit Node Strips (4 Colors)
            { open: '~CN-SL~', close: '~', className: 'megachip-circuit-node circuit-slate', isCircuitNode: true },
            { open: '~CN-T~', close: '~', className: 'megachip-circuit-node circuit-teal', isCircuitNode: true },
            { open: '~CN-GL~', close: '~', className: 'megachip-circuit-node circuit-gold', isCircuitNode: true },
            { open: '~CN-R~', close: '~', className: 'megachip-circuit-node circuit-ruby', isCircuitNode: true },

            { open: '~DR~', close: '~DR~', className: 'jr-chip-date-plate' },
            { open: '~MD~', close: '~MD~', className: 'jr-chip-mood' },
            { open: '~VO~', close: '~VO~', className: 'jr-chip-voice-tag', isVoiceTag: true },
            { open: '~WX~', close: '~WX~', className: 'jr-chip-weather' },
            { open: '~WS~', close: '~WS~', className: 'jr-chip-wax-stamp', isWaxStamp: true },

            { open: '~B-B~', close: '~', className: 'aero-glass-badge-chip badge-frame-sky' },
            { open: '~B-G~', close: '~', className: 'aero-glass-badge-chip badge-frame-emerald' },
            { open: '~B-O~', close: '~', className: 'aero-glass-badge-chip badge-frame-orange' },
            { open: '~B-R~', close: '~', className: 'aero-glass-badge-chip badge-frame-crimson' },
            { open: '~B-PR~', close: '~', className: 'aero-glass-badge-chip badge-frame-amethyst' },
            { open: '~B-Y~', close: '~', className: 'aero-glass-badge-chip badge-frame-gold' },

            { open: '~TL~',  close: '~TL~',  className: 'effect-tinted-lens' },
            { open: '~NO~',  close: '~NO~',  className: 'applet-neon-node node-cyan', isNeonNode: true },
            { open: '~SL~',  close: '~SL~',  className: 'effect-audio-stream-loop' },
            { open: '~BG~',  close: '~BG~',  className: 'effect-biogel-capsule' },
            { open: '~LS~',  close: '~LS~',  className: 'applet-latch-toggle', isLatchToggle: true },
            { open: '~TIM~',  close: '~TIM~',  className: 'applet-gadget-system-clock', isSystemGadclock: true },

            { open: '~FT~',  close: '~FT~',  className: 'jr-folder-tab' },
            { open: '~PT~',  close: '~PT~',  className: 'jr-progress-capsule', isProgCapsule: true },
            { open: '~MC~',  close: '~MC~',  className: 'jr-digital-counter' },
            { open: '~RD~',  close: '~RD~',  className: 'jr-dot-matrix', isDotMatrix: true },
            { open: '~LL~',  close: '~ST~',  className: 'jr-latch-lock', isLatchLock: true },
            { open: '~WR~',  close: '~WR~',  className: 'effect-neon-ribbon' },

            { open: '~DH-B~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-sky', isMultiDuplex: true },
            { open: '~DH-G~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-emerald', isMultiDuplex: true },
            { open: '~DH-O~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-orange', isMultiDuplex: true },
            { open: '~DH-PR~', close: '~', className: 'aero-duplex-input-chassis duplex-chassis-amethyst', isMultiDuplex: true },
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
        for (let def of definitions) {
            let openIdx = currentLineText.indexOf(def.open);
            if (openIdx === -1) continue;

            let closeIdx = currentLineText.indexOf(def.close, openIdx + def.open.length);
            if (closeIdx === -1) continue;

            // Match established across your text nodes. Intercept standard input dump
            e.preventDefault();

                        // --- CLEAN, WORKING CHARACTER COMPILER SPLIT MATRIX ---
            let beforeText = currentLineText.substring(0, openIdx);
            let targetText = currentLineText.substring(openIdx + def.open.length, closeIdx).trim();
            let afterText = currentLineText.substring(closeIdx + def.close.length);

            // 1. Shrink the primary text node up to your starting token boundary marker
            textNode.nodeValue = beforeText;
            // (Setting the text collapses the caret to offset 0, which put the chip BEFORE the text in front of it!)
            range.setStart(textNode, beforeText.length);
            range.collapse(true);

            // 2. Build out the replacement node element using the single correct variable name
            let newNode;
            if (def.className) {
                newNode = document.createElement('span');
                newNode.className = def.className;
                newNode.setAttribute('spellcheck', 'false');
                newNode.innerText = targetText;
                playAeroClickSound(850, 0.12);
            } else {
                newNode = document.createElement(def.tagName);
                newNode.innerText = targetText;
                playAeroClickSound(500, 0.05);
            }



            // 3. CORRECT MATCH: Insert only the singular newly validated element node
            range.insertNode(newNode);

            // 4. Reconstruct your trailing content stream bounds to anchor your blinking caret
            // Enter must really START A NEW LINE (a fake "\n" put the caret back on the old line)!
            const trailingText = afterText + (e.key === ' ' ? ' ' : '');
            const trailingNode = document.createTextNode(trailingText);
            newNode.parentNode.insertBefore(trailingNode, newNode.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(trailingNode, e.key === ' ' ? 1 : trailingText.length); // Positions caret directly right after the element
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            if (e.key !== ' ') { try { if (typeof window.kdSplitBlock === 'function') window.kdSplitBlock(); else document.execCommand('insertParagraph'); } catch (err) {} }

            if (def.isFoldout) {
                newNode.addEventListener('click', function() { 
                    playAeroClickSound(500, 0.15); 
                }); 
            } 
            if (def.isToggle) { 
                newNode.innerHTML = `<span>${targetText}</span><div class="switch-pill"></div>`; 
                newNode.addEventListener('click', function() { 
                    playAeroClickSound(650, 0.08); newNode.classList.toggle('turned-on'); 
                }); 
            }
            if (def.isStateToggle) {
                newNode.innerText = targetText;
                newNode.addEventListener('click', function() {
                    // Determine which color tone direction to play based on active states
                    if (newNode.classList.contains('state-green')) {
                        playAeroClickSound(400, 0.12); // Deeper glass toggle click tone
                        newNode.classList.remove('state-green');
                        newNode.classList.add('state-red');
                    } else {
                        playAeroClickSound(650, 0.08); // Higher responsive click tone
                        newNode.classList.remove('state-red');
                        newNode.classList.add('state-green');
                    }
                });
            }
            if (def.isVolumeDial) {
                newNode.innerHTML = `<span>${targetText}: 0%</span><div class="dial-knob"></div>`;
                let level = 0;
                newNode.addEventListener('click', function() {
                    level = (level + 25) % 125; // Loop steps: 0% -> 25% -> 50% -> 75% -> 100%
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
            if (def.isCalendarDesk) {
                const now = new Date();
                const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                newNode.innerHTML = `<div class="cal-deck-top">${months[now.getMonth()]}</div><div class="cal-deck-body">${now.getDate()}</div>`;
                newNode.addEventListener('click', function() { playAeroClickSound(700, 0.05); });
            }
            if (def.isStarRating) {
                newNode.innerHTML = `<span style="margin-right:6px;">${targetText}</span><span class="rating-star-node">★</span><span class="rating-star-node">★</span><span class="rating-star-node">★</span>`;
                let rating = 0;
                newNode.addEventListener('click', function(e) {
                    rating = (rating + 1) % 4; playAeroClickSound(600 + (rating * 50), 0.06);
                    const stars = newNode.querySelectorAll('.rating-star-node');
                    stars.forEach((star, idx) => {
                        if (idx < rating) star.classList.add('star-glow');
                        else star.classList.remove('star-glow');
                    });
                });
            }
            if (def.isCounterBadge) {
                let count = 0;
                newNode.innerHTML = `<span>${targetText}</span><div class="badge-count-orb">${count}</div>`;
                newNode.addEventListener('click', function() {
                    count++; playAeroClickSound(800, 0.05);
                    newNode.querySelector('.badge-count-orb').innerText = count;
                });
            }
            if (def.isSecurityLatch) {
                newNode.innerHTML = `<span class="latch-icon-frame">🔒</span> <span>${targetText}: LOCKED</span>`;
                let locked = true;
                newNode.addEventListener('click', function() {
                    locked = !locked;
                    if (!locked) {
                        playAeroClickSound(900, 0.15); // Clear chime
                        newNode.classList.add('latch-unlocked');
                        newNode.querySelector('.latch-icon-frame').innerText = "🔓";
                        newNode.querySelector('span:not(.latch-icon-frame)').innerText = `${targetText}: OPEN`;
                    } else {
                        playAeroClickSound(350, 0.12); // Lock thud
                        newNode.classList.remove('latch-unlocked');
                        newNode.querySelector('.latch-icon-frame').innerText = "🔒";
                        newNode.querySelector('span:not(.latch-icon-frame)').innerText = `${targetText}: LOCKED`;
                    }
                });
            }
            if (def.isPlaybackRibbon) {
                newNode.innerHTML = `<span>${targetText}</span><div class="playback-track-bar"><div class="playback-fill-fluid"></div></div>`;
                let activeInterval = null;
                let percent = 0;
                newNode.addEventListener('click', function() {
                    if (activeInterval) {
                        clearInterval(activeInterval);
                        activeInterval = null;
                        playAeroClickSound(400, 0.05); // Pause tone
                    } else {
                        playAeroClickSound(600, 0.05); // Play tone
                        activeInterval = setInterval(() => {
                            percent = percent >= 100 ? 0 : percent + 2;
                            newNode.querySelector('.playback-fill-fluid').style.width = percent + '%';
                        }, 100);
                    }
                });
            }
            if (def.isCpuGauge) {
                newNode.innerHTML = '<div class="gauge-needle-vector"></div>';
                let angles = [-90, -45, 0, 45, 90];
                let step = 0;
                newNode.addEventListener('click', function() {
                    step = (step + 1) % angles.length;
                    playAeroClickSound(500 + (step * 80), 0.06);
                    newNode.querySelector('.gauge-needle-vector').style.transform = `rotate(${angles[step]}deg)`;
                });
            }
            if (def.isStepperMesh) {
                let val = 1;
                newNode.innerHTML = `<span>${targetText}: ${val}</span><div class="stepper-arrow-box">▲<br>▼</div>`;
                newNode.addEventListener('click', function(e) {
                    val++;
                    playAeroClickSound(750, 0.04);
                    newNode.querySelector('span').innerText = `${targetText}: ${val}`;
                });
            }
            // --- Attach Aero Expansion Block 3 Interaction Logic ---
            if (def.isHydroOrb) {
                newNode.innerHTML = '<div class="hydro-sphere"></div> <span>' + targetText + ': SAFE</span>';
                let state = 0; // 0 = Blue, 1 = Yellow, 2 = Red
                newNode.addEventListener('click', function() {
                    state = (state + 1) % 3;
                    newNode.className = 'applet-hydro-orb'; // Reset classes
                    if (state === 0) {
                        playAeroClickSound(700, 0.06);
                        newNode.classList.add('orb-blue');
                        newNode.querySelector('span').innerText = targetText + ': SAFE';
                    } else if (state === 1) {
                        playAeroClickSound(550, 0.08);
                        newNode.classList.add('orb-yellow');
                        newNode.querySelector('span').innerText = targetText + ': WARN';
                    } else {
                        playAeroClickSound(350, 0.12);
                        newNode.classList.add('orb-red');
                        newNode.querySelector('span').innerText = targetText + ': CRIT';
                    }
                });
            }
            if (def.isLockSlider) {
                newNode.innerHTML = '<span>' + targetText + '</span><div class="slider-chassis"><div class="slider-handle-metal"></div></div>';
                let open = false;
                newNode.addEventListener('click', function() {
                    open = !open;
                    if (open) {
                        playAeroClickSound(850, 0.1);
                        newNode.classList.add('unlocked-state');
                    } else {
                        playAeroClickSound(400, 0.08);
                        newNode.classList.remove('unlocked-state');
                    }
                });
            }
            if (def.isGadclock) {
                newNode.innerHTML = '<div class="clock-hand-vector"></div>';
                setInterval(() => {
                    const now = new Date();
                    const secondsAngle = now.getSeconds() * 6; // 360 degrees / 60 seconds
                    const hand = newNode.querySelector('.clock-hand-vector');
                    if (hand) hand.style.transform = `rotate(${secondsAngle}deg)`;
                }, 1000);
            }
            // --- Attach Aero Expansion Block 4 Interaction Logic ---
            if (def.isMetalTrigger) {
                newNode.innerHTML = `<span>▶ ${targetText}</span>`;
                let playing = false;
                newNode.addEventListener('click', function() {
                    playing = !playing;
                    playAeroClickSound(playing ? 650 : 450, 0.08);
                    newNode.className = 'applet-metal-trigger';
                    if (playing) {
                        newNode.classList.add('trigger-playing');
                        newNode.querySelector('span').innerText = `■ ${targetText}`;
                    } else {
                        newNode.querySelector('span').innerText = `▶ ${targetText}`;
                    }
                });
            }
            if (def.isInsetCheck) {
                newNode.innerHTML = '<div class="check-cavity-box"></div> <span>' + targetText + '</span>';
                newNode.addEventListener('click', function() {
                    playAeroClickSound(600, 0.05);
                    newNode.classList.toggle('box-checked');
                });
            }
            // --- Attach Code Matrix Swatch Interaction Logic ---
            if (def.isHexSwatch) {
                newNode.innerHTML = `<div class="hex-color-orb" style="background-color: ${targetText};"></div> <span>${targetText}</span>`;
                newNode.addEventListener('click', function() {
                    playAeroClickSound(750, 0.05);
                    newNode.classList.toggle('swatch-active');
                });
            }
            // --- Attach Cockpit Telemetry Interaction Logic ---
            if (def.isSignalNode) {
                newNode.innerHTML = '<div class="signal-ping-orb"></div> <span>' + targetText + ': CONNECTED</span>';
                let connected = true;
                newNode.addEventListener('click', function() {
                    connected = !connected;
                    if (connected) {
                        playAeroClickSound(800, 0.05); // High link ping
                        newNode.classList.remove('sig-disconnect');
                        newNode.querySelector('span').innerText = targetText + ': CONNECTED';
                    } else {
                        playAeroClickSound(300, 0.12); // Warning thud
                        newNode.classList.add('sig-disconnect');
                        newNode.querySelector('span').innerText = targetText + ': DISCONNECT';
                    }
                });
            }
            // --- Attach Circuit Node Internal Infrastructure Logic ---
            if (def.isCircuitNode) {
                newNode.innerHTML = '<div class="node-dot"></div> <span>' + targetText + '</span>';
                newNode.addEventListener('click', function() { playAeroClickSound(750, 0.05); });
            }
            // --- Attach Journal Theme Interaction Logic ---
            if (def.isVoiceTag) {
                newNode.innerHTML = `<span>🔊 PLAY DICTATION: ${targetText}</span>`;
                let playing = false;
                newNode.addEventListener('click', function() {
                    playing = !playing;
                    playAeroClickSound(playing ? 500 : 350, 0.2); // Simulated playback note
                    newNode.querySelector('span').innerText = playing ? `⏳ PLAYING: ${targetText}` : `🔊 PLAY DICTATION: ${targetText}`;
                });
            }
            if (def.isWaxStamp) {
                newNode.innerText = targetText;
                newNode.addEventListener('click', function() {
                    playAeroClickSound(250, 0.15); // Deep thud crack sound
                });
            }
            // --- Attach Aero Expansion Block 11 Interaction Logic ---
            if (def.isNeonNode) {
                newNode.innerHTML = '<div class="neon-node-sphere"></div> <span>' + targetText + ': INFO</span>';
                let cycleState = 0; // 0 = Cyan, 1 = Yellow, 2 = Pink
                newNode.addEventListener('click', function() {
                    cycleState = (cycleState + 1) % 3;
                    newNode.className = 'applet-neon-node'; // Purge styles
                    if (cycleState === 0) {
                        playAeroClickSound(750, 0.05);
                        newNode.classList.add('node-cyan');
                        newNode.querySelector('span').innerText = targetText + ': INFO';
                    } else if (cycleState === 1) {
                        playAeroClickSound(550, 0.08);
                        newNode.classList.add('node-yellow');
                        newNode.querySelector('span').innerText = targetText + ': WARN';
                    } else {
                        playAeroClickSound(350, 0.12);
                        newNode.classList.add('node-pink');
                        newNode.querySelector('span').innerText = targetText + ': ALERT';
                    }
                });
            }
            if (def.isLatchToggle) {
                newNode.innerHTML = '<span>' + targetText + '</span><div class="latch-track-chassis"><div class="latch-slider-handle"></div></div>';
                let active = false;
                newNode.addEventListener('click', function() {
                    active = !active;
                    playAeroClickSound(active ? 800 : 400, 0.08);
                    if (active) newNode.classList.add('latch-active-state');
                    else newNode.classList.remove('latch-active-state');
                });
            }
            if (def.isSystemGadclock) {
                newNode.innerHTML = '<div class="gadget-clock-hand"></div>';
                setInterval(() => {
                    const now = new Date();
                    const angleValue = now.getSeconds() * 6; // 360 deg / 60 seconds
                    const pointer = newNode.querySelector('.gadget-clock-hand');
                    if (pointer) pointer.style.transform = `rotate(${angleValue}deg)`;
                }, 1000);
            }
            // --- Attach Overhauled Master Interaction Logic ---
            if (def.isProgCapsule) {
                newNode.innerHTML = `<span>${targetText}</span><div class="capsule-fluid-bar"><div class="capsule-fluid-fill"></div></div>`;
                let fillWidth = 35;
                newNode.addEventListener('click', function() {
                    fillWidth = fillWidth >= 95 ? 15 : fillWidth + 20;
                    playAeroClickSound(550 + fillWidth, 0.05);
                    newNode.querySelector('.capsule-fluid-fill').style.width = fillWidth + '%';
                });
            }
            if (def.isDotMatrix) {
                newNode.innerHTML = `<span style="margin-right:6px;">${targetText}</span><div class="matrix-bead"></div><div class="matrix-bead"></div><div class="matrix-bead"></div>`;
                let rating = 0;
                newNode.addEventListener('click', function() {
                    rating = (rating + 1) % 4;
                    playAeroClickSound(600, 0.05);
                    const beads = newNode.querySelectorAll('.matrix-bead');
                    beads.forEach((bead, idx) => {
                        if (idx < rating) bead.classList.add('bead-glow');
                        else bead.classList.remove('bead-glow');
                    });
                });
            }
            if (def.isLatchLock) {
                newNode.innerHTML = '<div class="latch-bolt"></div> <span>' + targetText + '</span>';
                let secure = false;
                newNode.addEventListener('click', function() {
                    secure = !secure;
                    playAeroClickSound(secure ? 850 : 350, 0.1);
                    if (secure) newNode.classList.add('latch-secure');
                    else newNode.classList.remove('latch-secure');
                });
            }
            // --- Attach Horizontal Slot Separation Logic ---
            if (def.isDuplexSlot) {
                // Cuts the text container into two stacked horizontal rows
                newNode.innerHTML = `
                    <div class="slot-top">${targetText}</div>
                    <div class="slot-bottom">${targetText}</div>
                `;
                newNode.addEventListener('click', function() { playAeroClickSound(700, 0.05); });
            }
            if (def.isMultiDuplex) {
                const selectRange = document.createRange();
                selectRange.setStart(textNode, openIdx); selectRange.setEnd(textNode, range.startOffset);
                selectRange.deleteContents(); newNode.setAttribute('contenteditable', 'true');
                const leftInput = document.createElement('div'); leftInput.className = 'input-left'; leftInput.setAttribute('contenteditable', 'true'); leftInput.innerText = 'Hello';
                const rightInput = document.createElement('div'); rightInput.className = 'input-right'; rightInput.setAttribute('contenteditable', 'true'); rightInput.innerText = 'World';
                const newRange = document.createRange(); newRange.selectNodeContents(leftInput); newRange.collapse(false);
                break;
            }
            break;
        }
    });
}

// ==========================================
// PART 8: FORMATTING HELP DIALOG PANEL MODAL
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const helpBtn = document.getElementById('help-trigger-btn');
    const closeBtn = document.getElementById('dialog-close-btn');
    const confirmBtn = document.getElementById('dialog-confirm-btn');
    const overlay = document.getElementById('aero-modal-overlay');

    function openHelpDialog() {
        playAeroClickSound(750, 0.15); // Glass expansion ping
        if (overlay) overlay.classList.add('active');
    }

    function closeHelpDialog() {
        playAeroClickSound(450, 0.08); // Liquid escape click
        if (overlay) overlay.classList.remove('active');
    }

    // Attach click listeners to UI element nodes safely
    if (helpBtn) helpBtn.addEventListener('click', openHelpDialog);
    if (closeBtn) closeBtn.addEventListener('click', closeHelpDialog);
    if (confirmBtn) confirmBtn.addEventListener('click', closeHelpDialog);

    // Close the dialogue card automatically if a user clicks outside the frame limits
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeHelpDialog();
        });
    }
});

// ==========================================
// PART 9: MANAGEMENT CONTROL CENTER (SETTINGS)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settings-trigger-btn');
    const closeBtn = document.getElementById('settings-close-btn');
    const confirmBtn = document.getElementById('settings-confirm-btn');
    const overlay = document.getElementById('settings-modal-overlay');
    const wipeBtn = document.getElementById('btn-wipe-history');

    function openSettingsWindow() {
        playAeroClickSound(750, 0.15); // Glass expand tone
        if (overlay) overlay.classList.add('active');
    }

    function closeSettingsWindow() {
        playAeroClickSound(450, 0.08); // Liquid toggle close tone
        if (overlay) overlay.classList.remove('active');
    }

    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsWindow);
    if (closeBtn) closeBtn.addEventListener('click', closeSettingsWindow);
    if (confirmBtn) confirmBtn.addEventListener('click', closeSettingsWindow);

    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeSettingsWindow();
        });
    }

    // --- WIPE HISTORY ENGINE FUNCTION ---
    if (wipeBtn) {
        wipeBtn.addEventListener('click', function() {
            // Fire deep thud alarm warnings
            playAeroClickSound(250, 0.25);
            
            if (confirm("Are you sure you want to wipe all history? This will clear all pad contents completely.")) {
                // 1. Purge persistent local storage registry indices
                localStorage.removeItem('bitbook_save_slot_1');
                localStorage.removeItem('bitbook_save_slot_2');
                
                // 2. Clear out volatile table string cache memory parameters
                temporaryTableScratchContent = `<h1>One-Time Table Pad</h1><p>This is a temporary scratch space. Everything typed here will wipe completely clean when you close or refresh the app...</p>`;
                
                // 3. Reset the application interface back to boot configuration states
                isInitialBootSync = true;
                
                // 4. Update display banner states to confirm execution success
                wipeBtn.innerText = "REGISTRY PURGED SUCCESS!";
                setTimeout(() => { wipeBtn.innerText = "WIPE ALL PAD HISTORY"; }, 2000);
                closeSettingsWindow();
            }
        });
    }
});
// ========================================================
// RE-ENGINEERED ARRAYS: PURE STREAM INTERCEPT FILESYSTEM
// ========================================================
const canvasViewport = document.getElementById('wysiwyg-canvas');
const sidebarPanel = document.getElementById('sidebar');
const toggleZoneContainer = document.getElementById('toggle-zone');
const toggleIconGlyph = document.getElementById('toggle-icon');

// Sound feedback system engine helper
function playAeroClickSound(frequency = 600, duration = 0.08) {
    try {
        const context = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = context;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.04, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gainNode); gainNode.connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch (e) {}
}
// ========================================================
// DOWNLOAD CENTER: multi-format export engine (KD/PDF/DOCX/ODT/TXT/EPUB/Web)
// ========================================================
let isExporting = false; // Add this global flag variable near the top of your script if not already present

// --- Minimal CRC32 (for hand-rolled stored ZIP archives) ---
var kdCrcTable = null;
function kdCrc32(bytes) {
    if (!kdCrcTable) {
        kdCrcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            kdCrcTable[n] = c >>> 0;
        }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = kdCrcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function kdUtf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
        else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
            const hi = c, lo = str.charCodeAt(++i);
            const cp = 0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00);
            out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
        } else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
    return new Uint8Array(out);
}

// --- Stored (uncompressed) ZIP builder: [{ name, data }] -> Uint8Array ---
function kdBuildZip(files) {
    const enc = function (s) { return kdUtf8(s); };
    const chunks = [];
    const central = [];
    let offset = 0;
    const pushU16 = function (arr, v) { arr.push(v & 0xFF, (v >> 8) & 0xFF); };
    const pushU32 = function (arr, v) { arr.push(v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF); };
    files.forEach(function (f) {
        const nameBytes = enc(f.name);
        const dataBytes = (typeof f.data === 'string') ? enc(f.data) : f.data;
        const crc = kdCrc32(dataBytes);
        const local = [0x50, 0x4B, 0x03, 0x04];
        pushU16(local, 20);
        pushU16(local, 0x0800);
        pushU16(local, 0);
        pushU16(local, 0); pushU16(local, 0);
        pushU32(local, crc);
        pushU32(local, dataBytes.length);
        pushU32(local, dataBytes.length);
        pushU16(local, nameBytes.length);
        pushU16(local, 0);
        const localBytes = new Uint8Array([...local, ...nameBytes, ...dataBytes]);
        chunks.push({ bytes: localBytes, offset: offset });
        offset += localBytes.length;
        const cen = [0x50, 0x4B, 0x01, 0x02];
        pushU16(cen, 20); pushU16(cen, 20);
        pushU16(cen, 0x0800); pushU16(cen, 0);
        pushU16(cen, 0); pushU16(cen, 0);
        pushU32(cen, crc);
        pushU32(cen, dataBytes.length);
        pushU32(cen, dataBytes.length);
        pushU16(cen, nameBytes.length);
        pushU16(cen, 0); pushU16(cen, 0); pushU16(cen, 0); pushU16(cen, 0);
        pushU32(cen, 0);
        pushU32(cen, chunks[chunks.length - 1].offset);
        central.push({ bytes: new Uint8Array([...cen, ...nameBytes]) });
    });
    let centralSize = 0;
    central.forEach(function (c) { centralSize += c.bytes.length; });
    const centralOffset = offset;
    const end = [0x50, 0x4B, 0x05, 0x06];
    pushU16(end, 0); pushU16(end, 0);
    pushU16(end, files.length); pushU16(end, files.length);
    pushU32(end, centralSize);
    pushU32(end, centralOffset);
    pushU16(end, 0);
    const total = offset + centralSize + end.length;
    const out = new Uint8Array(total);
    let p = 0;
    chunks.forEach(function (c) { out.set(c.bytes, p); p += c.bytes.length; });
    central.forEach(function (c) { out.set(c.bytes, p); p += c.bytes.length; });
    out.set(end, p);
    return out;
}

function kdEscapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Download helper (records the payload for automated checks)!
function kdDownloadBlob(blob, filename) {
    try { window.__lastDownload = { blob: blob, filename: filename }; } catch (e) {}
    try {
        const blobUrl = URL.createObjectURL(blob);
        const phantomAnchorLink = document.createElement('a');
        phantomAnchorLink.href = blobUrl;
        phantomAnchorLink.download = filename;
        phantomAnchorLink.style.display = 'none';
        document.body.appendChild(phantomAnchorLink);
        phantomAnchorLink.click();
        setTimeout(() => {
            document.body.removeChild(phantomAnchorLink);
            URL.revokeObjectURL(blobUrl);
        }, 100);
        return true;
    } catch (e) {
        return false;
    }
}

function kdExportBaseName() {
    try {
        const head = canvasViewport.querySelector('h1, h2, h3');
        const raw = head ? head.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
        if (raw) return raw.substring(0, 40);
    } catch (e) {}
    return 'bitbook-note';
}

// Structured blocks: [{ style, runs: [{ text, bold, italic, underline }] }]
function kdCanvasBlocks(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const blocks = [];
    const walkRuns = function (node, fmt, runs) {
        if (node.nodeType === 3) {
            if (node.nodeValue) runs.push({ text: node.nodeValue, bold: fmt.bold, italic: fmt.italic, underline: fmt.underline });
            return;
        }
        if (node.nodeType !== 1) return;
        const tag = node.tagName;
        const f2 = {
            bold: fmt.bold || tag === 'B' || tag === 'STRONG',
            italic: fmt.italic || tag === 'I' || tag === 'EM',
            underline: fmt.underline || tag === 'U'
        };
        if (tag === 'BR') { runs.push({ text: '\n', bold: f2.bold, italic: f2.italic, underline: f2.underline }); return; }
        Array.from(node.childNodes).forEach(function (c) { walkRuns(c, f2, runs); });
    };
    Array.from(tmp.childNodes).forEach(function (kid) {
        if (kid.nodeType === 3) {
            if (kid.nodeValue.trim()) blocks.push({ style: 'p', runs: [{ text: kid.nodeValue, bold: false, italic: false, underline: false }] });
            return;
        }
        if (kid.nodeType !== 1) return;
        const tag = kid.tagName;
        if (tag === 'UL' || tag === 'OL') {
            Array.from(kid.children).forEach(function (li) {
                const runs = [];
                walkRuns(li, { bold: false, italic: false, underline: false }, runs);
                blocks.push({ style: 'li', runs: runs });
            });
            return;
        }
        let style = 'p';
        if (tag === 'H1') style = 'h1';
        else if (tag === 'H2') style = 'h2';
        else if (tag === 'H3') style = 'h3';
        else if (tag === 'BLOCKQUOTE') style = 'quote';
        else if (tag === 'LI') style = 'li';
        const runs = [];
        walkRuns(kid, { bold: false, italic: false, underline: false }, runs);
        blocks.push({ style: style, runs: runs });
    });
    return blocks;
}

function kdKeydownPayload(html) {
    const currentTimestampString = new Date().toISOString();
    let yamlConfigBlock = "---\n";
    yamlConfigBlock += "app: \"Writedown WYSIWYG Suite\"\n";
    yamlConfigBlock += "format: \"keydown-yaml-canvas\"\n";
    yamlConfigBlock += `exported_at: \"${currentTimestampString}\"\n`;
    yamlConfigBlock += `page_size: \"${kdPageSizeId}\"\n`;
    yamlConfigBlock += `page_orientation: \"${kdPageOrient}\"\n`;
    if (kdDocPasswordHash) yamlConfigBlock += `doc_password: \"${kdDocPasswordHash}\"\n`;
    var saveInfo = true;
    try { saveInfo = localStorage.getItem('bitbook_save_note_info') !== '0'; } catch (e) {}
    if (saveInfo) {
        var noteInfoText = '';
        try {
            var nib = document.getElementById('note-info-text');
            noteInfoText = nib ? nib.value : (localStorage.getItem('bitbook_note_info') || '');
        } catch (e) {}
        yamlConfigBlock += `note_info: ${JSON.stringify(String(noteInfoText))}\n`;
    }
    yamlConfigBlock += "---\n\n";
    return yamlConfigBlock + html;
}

function exportKeydownFile() {
    if (isExporting) return; // Prevent double firing completely!
    isExporting = true;
    setTimeout(() => { isExporting = false; }, 500);

    playAeroClickSound(750, 0.12);
    try {
        const curTab = (typeof kdActiveTab === 'function') ? kdActiveTab() : null;
        if (curTab) curTab.html = canvasViewport.innerHTML;
        if (typeof kdSaveTabs === 'function') kdSaveTabs();
    } catch (e) {}
    const completePayloadContent = kdKeydownPayload(canvasViewport.innerHTML) + kdTabsFence();
    const dataBlobPayload = new Blob([completePayloadContent], { type: 'text/yaml;charset=utf-8' });
    kdDownloadBlob(dataBlobPayload, 'bitbook_note.kn');
}

function exportTXTFile() {
    playAeroClickSound(750, 0.12);
    autoSaveCanvasContent();
    const text = canvasViewport.innerText || canvasViewport.textContent || '';
    kdDownloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), kdExportBaseName() + '.txt');
}

function exportPDFFile() {
    closeDownloadMenu();
    printWriteoutPage();
}

function exportDOCXFile() {
    playAeroClickSound(750, 0.12);
    autoSaveCanvasContent();
    const bytes = kdBuildDOCX(canvasViewport.innerHTML);
    kdDownloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), kdExportBaseName() + '.docx');
}

function exportODTFile() {
    playAeroClickSound(750, 0.12);
    autoSaveCanvasContent();
    const bytes = kdBuildODT(canvasViewport.innerHTML);
    kdDownloadBlob(new Blob([bytes], { type: 'application/vnd.oasis.opendocument.text' }), kdExportBaseName() + '.odt');
}

function exportEPUBFile() {
    playAeroClickSound(750, 0.12);
    autoSaveCanvasContent();
    const bytes = kdBuildEPUB(kdExportBaseName(), canvasViewport.innerHTML);
    kdDownloadBlob(new Blob([bytes], { type: 'application/epub+zip' }), kdExportBaseName() + '.epub');
}

function kdImageSVG(html, cssText, w, h) {
    const safeHtml = String(html)
        .replace(/<(br|hr|input|img|link|meta|source|wbr)([^>]*?)>/gi, '<$1$2/>');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
        '<foreignObject x="0" y="0" width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + w + 'px;background:#ffffff;">' +
        '<style>' + (cssText || '') + '</style>' +
        safeHtml +
        '</div></foreignObject></svg>';
}

function kdCollectPageCSS() {
    let css = '';
    try {
        Array.from(document.styleSheets || []).forEach(function (sheet) {
            let rules = null;
            try { rules = sheet.cssRules; } catch (e) { rules = null; }
            if (!rules) return;
            Array.from(rules).forEach(function (rule) {
                try { css += rule.cssText + '\n'; } catch (e) {}
            });
        });
    } catch (e) {}
    return css;
}

function kdB64Decode(b64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const clean = String(b64).replace(/[^A-Za-z0-9+/=]/g, '');
    const bytes = [];
    for (let i = 0; i < clean.length; i += 4) {
        const a = chars.indexOf(clean[i]);
        const b = chars.indexOf(clean[i + 1]);
        const c = clean[i + 2] === '=' ? 0 : chars.indexOf(clean[i + 2]);
        const d = clean[i + 3] === '=' ? 0 : chars.indexOf(clean[i + 3]);
        const n = (a << 18) | (b << 12) | (c << 6) | d;
        bytes.push((n >> 16) & 0xFF);
        if (clean[i + 2] !== '=') bytes.push((n >> 8) & 0xFF);
        if (clean[i + 3] !== '=') bytes.push(n & 0xFF);
    }
    return new Uint8Array(bytes);
}

function kdDataURLToBlob(dataUrl) {
    const parts = String(dataUrl).split(',');
    return new Blob([kdB64Decode(parts[1] || '')], { type: 'image/jpeg' });
}

// --- True vector SVG export: rect/text/fill tags any vector editor parses!
// (JPEG keeps the foreignObject raster path; SVG gets real geometry!) ---
function kdFlattenColor(css) {
    const s = String(css || '').trim();
    const hexed = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexed) {
        let h = hexed[1].toLowerCase();
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return '#' + h;
    }
    const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (!m) return '#ffffff';
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    const mix = function (c) { return Math.round(parseInt(c, 10) * a + 255 * (1 - a)); };
    return '#' + ((1 << 24) + (mix(m[1]) << 16) + (mix(m[2]) << 8) + mix(m[3])).toString(16).slice(1);
}

function kdVectorFont(el) {
    const f = { family: 'sans-serif', size: 16, weight: 'normal', style: 'normal', deco: '', fill: '#000000' };
    try {
        const cs = window.getComputedStyle(el);
        if (cs.fontFamily) f.family = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || f.family;
        if (cs.fontSize) {
            const px = parseFloat(cs.fontSize);
            if (!isNaN(px) && px > 0) f.size = px;
        }
        const wNum = parseInt(cs.fontWeight, 10);
        f.weight = !isNaN(wNum) ? (wNum >= 600 ? 'bold' : 'normal') : (cs.fontWeight || 'normal');
        if (cs.fontStyle && cs.fontStyle !== 'normal') f.style = cs.fontStyle;
        const td = ((cs.textDecorationLine || cs.textDecoration) || '').toLowerCase();
        if (td.indexOf('underline') !== -1 && td.indexOf('line-through') !== -1) f.deco = 'underline line-through';
        else if (td.indexOf('underline') !== -1) f.deco = 'underline';
        else if (td.indexOf('line-through') !== -1) f.deco = 'line-through';
        if (cs.color) f.fill = kdFlattenColor(cs.color);
    } catch (e) {}
    return f;
}

function kdVectorMeasure(measCtx, text, f) {
    if (measCtx) {
        try {
            measCtx.font = f.style + ' ' + f.weight + ' ' + f.size + 'px ' + f.family;
            return measCtx.measureText(text).width;
        } catch (e) {}
    }
    return text.length * f.size * 0.6;
}

function kdVectorText(text, f, x, y) {
    let attrs = 'x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + f.fill + '"';
    attrs += ' font-family="' + kdEscapeXml(f.family) + '" font-size="' + f.size + '"';
    attrs += ' font-weight="' + f.weight + '" font-style="' + f.style + '"';
    if (f.deco) attrs += ' text-decoration="' + f.deco + '"';
    return '<text ' + attrs + '>' + kdEscapeXml(text) + '</text>';
}

var kdGradSeq = 0;
function kdNextGradId() {
    kdGradSeq++;
    return 'kdgrad' + kdGradSeq;
}

// Split on top-level commas (never inside parens)!
function kdSplitTop(s) {
    const parts = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) {
            parts.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    parts.push(cur);
    return parts;
}

var kdNamedColors = {aliceblue:'#f0f8ff',antiquewhite:'#faebd7',aqua:'#00ffff',aquamarine:'#7fffd4',azure:'#f0ffff',beige:'#f5f5dc',bisque:'#ffe4c4',black:'#000000',blanchedalmond:'#ffebcd',blue:'#0000ff',blueviolet:'#8a2be2',brown:'#a52a2a',burlywood:'#deb887',cadetblue:'#5f9ea0',chartreuse:'#7fff00',chocolate:'#d2691e',coral:'#ff7f50',cornflowerblue:'#6495ed',cornsilk:'#fff8dc',crimson:'#dc143c',cyan:'#00ffff',darkblue:'#00008b',darkcyan:'#008b8b',darkgoldenrod:'#b8860b',darkgray:'#a9a9a9',darkgrey:'#a9a9a9',darkgreen:'#006400',darkkhaki:'#bdb76b',darkmagenta:'#8b008b',darkolivegreen:'#556b2f',darkorange:'#ff8c00',darkorchid:'#9932cc',darkred:'#8b0000',darksalmon:'#e9967a',darkseagreen:'#8fbc8f',darkslateblue:'#483d8b',darkslategray:'#2f4f4f',darkslategrey:'#2f4f4f',darkturquoise:'#00ced1',darkviolet:'#9400d3',deeppink:'#ff1493',deepskyblue:'#00bfff',dimgray:'#696969',dimgrey:'#696969',dodgerblue:'#1e90ff',firebrick:'#b22222',floralwhite:'#fffaf0',forestgreen:'#228b22',fuchsia:'#ff00ff',gainsboro:'#dcdcdc',ghostwhite:'#f8f8ff',gold:'#ffd700',goldenrod:'#daa520',gray:'#808080',grey:'#808080',green:'#008000',greenyellow:'#adff2f',honeydew:'#f0fff0',hotpink:'#ff69b4',indianred:'#cd5c5c',indigo:'#4b0082',ivory:'#fffff0',khaki:'#f0e68c',lavender:'#e6e6fa',lavenderblush:'#fff0f5',lawngreen:'#7cfc00',lemonchiffon:'#fffacd',lightblue:'#add8e6',lightcoral:'#f08080',lightcyan:'#e0ffff',lightgoldenrodyellow:'#fafad2',lightgray:'#d3d3d3',lightgrey:'#d3d3d3',lightgreen:'#90ee90',lightpink:'#ffb6c1',lightsalmon:'#ffa07a',lightseagreen:'#20b2aa',lightskyblue:'#87cefa',lightslategray:'#778899',lightslategrey:'#778899',lightsteelblue:'#b0c4de',lightyellow:'#ffffe0',lime:'#00ff00',limegreen:'#32cd32',linen:'#faf0e6',magenta:'#ff00ff',maroon:'#800000',mediumaquamarine:'#66cdaa',mediumblue:'#0000cd',mediumorchid:'#ba55d3',mediumpurple:'#9370db',mediumseagreen:'#3cb371',mediumslateblue:'#7b68ee',mediumspringgreen:'#00fa9a',mediumturquoise:'#48d1cc',mediumvioletred:'#c71585',midnightblue:'#191970',mintcream:'#f5fffa',mistyrose:'#ffe4e1',moccasin:'#ffe4b5',navajowhite:'#ffdead',navy:'#000080',oldlace:'#fdf5e6',olive:'#808000',olivedrab:'#6b8e23',orange:'#ffa500',orangered:'#ff4500',orchid:'#da70d6',palegoldenrod:'#eee8aa',palegreen:'#98fb98',paleturquoise:'#afeeee',palevioletred:'#db7093',papayawhip:'#ffefd5',peachpuff:'#ffdab9',peru:'#cd853f',pink:'#ffc0cb',plum:'#dda0dd',powderblue:'#b0e0e6',purple:'#800080',rebeccapurple:'#663399',red:'#ff0000',rosybrown:'#bc8f8f',royalblue:'#4169e1',saddlebrown:'#8b4513',salmon:'#fa8072',sandybrown:'#f4a460',seagreen:'#2e8b57',seashell:'#fff5ee',sienna:'#a0522d',silver:'#c0c0c0',skyblue:'#87ceeb',slateblue:'#6a5acd',slategray:'#708090',slategrey:'#708090',snow:'#fffafa',springgreen:'#00ff7f',steelblue:'#4682b4',tan:'#d2b48c',teal:'#008080',thistle:'#d8bfd8',tomato:'#ff6347',turquoise:'#40e0d0',violet:'#ee82ee',wheat:'#f5deb3',white:'#ffffff',whitesmoke:'#f5f5f5',yellow:'#ffff00',yellowgreen:'#9acd32'};

function kdHslToRgb(h, s, l) {
    h = ((parseFloat(h) % 360) + 360) % 360;
    s = Math.min(1, Math.max(0, parseFloat(s) / 100));
    l = Math.min(1, Math.max(0, parseFloat(l) / 100));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0; let gg = 0; let b = 0;
    if (h < 60) { r = c; gg = x; b = 0; }
    else if (h < 120) { r = x; gg = c; b = 0; }
    else if (h < 180) { r = 0; gg = c; b = x; }
    else if (h < 240) { r = 0; gg = x; b = c; }
    else if (h < 300) { r = x; gg = 0; b = c; }
    else { r = c; gg = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((gg + m) * 255), Math.round((b + m) * 255)];
}

function kdParseColor(token) {
    const s = String(token || '').trim().toLowerCase();
    if (s === 'transparent') return { hex: 'transparent', opacity: 0 };
    if (kdNamedColors[s]) return { hex: kdNamedColors[s], opacity: 1 };
    let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (m) {
        let h = m[1];
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        else if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
        if (h.length === 8) {
            return { hex: '#' + h.substring(0, 6), opacity: Math.round((parseInt(h.substring(6, 8), 16) / 255) * 10000) / 10000 };
        }
        return { hex: '#' + h, opacity: 1 };
    }
    m = s.match(/^hsla?\(\s*(-?[\d.]+)(deg|turn|rad|grad)?\s*[,\s]+\s*(\d+(?:\.\d+)?)%\s*[,\s]+\s*(\d+(?:\.\d+)?)%\s*(?:[,\/\s]+\s*([\d.]+%|[\d.]+)\s*)?\)$/);
    if (m) {
        let hue = parseFloat(m[1]);
        const u = m[2] || 'deg';
        if (u === 'turn') hue = hue * 360;
        else if (u === 'rad') hue = hue * 180 / Math.PI;
        else if (u === 'grad') hue = hue * 0.9;
        const rgb = kdHslToRgb(hue, m[3], m[4]);
        let a = 1;
        if (m[5] !== undefined) a = m[5].indexOf('%') !== -1 ? parseFloat(m[5]) / 100 : parseFloat(m[5]);
        return {
            hex: '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1),
            opacity: isNaN(a) ? 1 : a
        };
    }
    m = s.match(/^rgba?\(\s*(\d+(?:\.\d+)?%|[\d.]+)\s*[,\s]+\s*(\d+(?:\.\d+)?%|[\d.]+)\s*[,\s]+\s*(\d+(?:\.\d+)?%|[\d.]+)\s*(?:[,\/\s]+\s*([\d.]+%|[\d.]+)\s*)?\)$/);
    if (!m) return null;
    const chan = function (v) {
        v = String(v);
        if (v.indexOf('%') !== -1) return Math.round(parseFloat(v) * 255 / 100);
        return parseInt(v, 10);
    };
    let a = 1;
    if (m[4] !== undefined) a = String(m[4]).indexOf('%') !== -1 ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return {
        hex: '#' + ((1 << 24) + (chan(m[1]) << 16) + (chan(m[2]) << 8) + chan(m[3])).toString(16).slice(1),
        opacity: isNaN(a) ? 1 : a
    };
}

function kdAngleVector(deg) {
    const rad = (parseFloat(deg) * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const r2 = function (v) { return Math.round((v + Number.EPSILON) * 10000) / 10000; };
    return { x1: r2(0.5 - dx / 2), y1: r2(0.5 - dy / 2), x2: r2(0.5 + dx / 2), y2: r2(0.5 + dy / 2) };
}

function kdDirectionVector(dir) {
    const d = String(dir || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const map = {
        'to top': [0.5, 1, 0.5, 0],
        'to bottom': [0.5, 0, 0.5, 1],
        'to left': [1, 0.5, 0, 0.5],
        'to right': [0, 0.5, 1, 0.5],
        'to top left': [1, 1, 0, 0],
        'to top right': [0, 1, 1, 0],
        'to bottom left': [1, 0, 0, 1],
        'to bottom right': [0, 0, 1, 1]
    };
    const v = map[d] || map['to bottom'];
    return { x1: v[0], y1: v[1], x2: v[2], y2: v[3] };
}

function kdNormalizeStops(stops) {
    const out = stops.map(function (s) { return { color: s.color, opacity: s.opacity, offset: s.offset }; });
    if (!out.length) return out;
    if (out[0].offset === null || out[0].offset === undefined) out[0].offset = 0;
    if (out[out.length - 1].offset === null || out[out.length - 1].offset === undefined) {
        out[out.length - 1].offset = 1;
    }
    let runStart = 0;
    for (let i = 1; i < out.length; i++) {
        if (out[i].offset === null || out[i].offset === undefined) continue;
        const from = out[runStart].offset;
        const to = out[i].offset;
        const gap = i - runStart;
        for (let j = 1; j < gap; j++) {
            out[runStart + j].offset = from + ((to - from) * j) / gap;
        }
        runStart = i;
    }
    return out;
}

function kdPosToOffset(pos) {
    pos = String(pos).trim();
    if (pos.indexOf('%') !== -1) return parseFloat(pos) / 100;
    return parseFloat(pos);
}

function kdParseStop(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    // Double position: "color 0% 50%" -> hard stop pair!
    let m2 = s.match(/^(.*\S)\s+(-?[\d.]+%|-?[\d.]+)\s+(-?[\d.]+%|-?[\d.]+)$/);
    if (m2 && kdParseColor(m2[1])) {
        const c = kdParseColor(m2[1]);
        return [
            { color: c.hex, opacity: c.opacity, offset: kdPosToOffset(m2[2]) },
            { color: c.hex, opacity: c.opacity, offset: kdPosToOffset(m2[3]) }
        ];
    }
    let colorPart = s;
    let offset = null;
    const m = s.match(/^(.*\S)\s+(-?[\d.]+%|-?[\d.]+)$/);
    if (m && kdParseColor(m[1])) {
        colorPart = m[1];
        offset = kdPosToOffset(m[2]);
    }
    const c = kdParseColor(colorPart);
    if (!c) return null;
    return { color: c.hex, opacity: c.opacity, offset: offset };
}

function kdParseGradient(layer) {
    const s = String(layer || '').trim();
    const m = s.match(/^(?:-webkit-|-moz-)?(repeating-)?(linear|radial)-gradient\s*\((.*)\)$/i);
    if (!m) return null;
    const repeating = !!m[1];
    const kind = m[2].toLowerCase();
    const args = kdSplitTop(m[3]);
    if (!args.length) return null;
    const g = { kind: kind, repeating: repeating, stops: [] };
    let stopArgs = args;
    if (kind === 'linear') {
        const first = (args[0] || '').trim();
        const ang = first.match(/^(-?[\d.]+)(deg|turn|rad|grad)$/i);
        const toDir = first.match(/^to\s+[a-z ]+$/i);
        if (ang || toDir) {
            let degVal = '180';
            if (ang) {
                const n = parseFloat(ang[1]);
                const u = ang[2].toLowerCase();
                degVal = u === 'turn' ? n * 360 : (u === 'rad' ? n * 180 / Math.PI : (u === 'grad' ? n * 0.9 : n));
            }
            const v = ang ? kdAngleVector(degVal) : kdDirectionVector(first);
            g.x1 = v.x1; g.y1 = v.y1; g.x2 = v.x2; g.y2 = v.y2;
            stopArgs = args.slice(1);
        } else {
            g.x1 = 0.5; g.y1 = 0; g.x2 = 0.5; g.y2 = 1;
        }
    } else {
        g.cx = 0.5; g.cy = 0.5; g.r = 0.75;
        const first = (args[0] || '').trim();
        const at = first.match(/^(?:circle|ellipse)?\s*at\s+([^\s,]+)\s+([^\s,]+)/i);
        if (at) {
            const px = function (v, fb) {
                const pm = String(v).match(/^(-?[\d.]+)%$/);
                return pm ? parseFloat(pm[1]) / 100 : fb;
            };
            g.cx = px(at[1], 0.5);
            g.cy = px(at[2], 0.5);
            stopArgs = args.slice(1);
        } else if (/^(circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner|contain|cover)/i.test(first) && !kdParseColor(first)) {
            stopArgs = args.slice(1);
        }
    }
    stopArgs.forEach(function (raw) {
        const st = kdParseStop(raw);
        if (!st) return;
        if (Array.isArray(st)) st.forEach(function (one) { g.stops.push(one); });
        else g.stops.push(st);
    });
    if (!g.stops.length) return null;
    g.stops = kdNormalizeStops(g.stops);
    g.stops = kdResolveTransparentStops(g.stops);
    return g;
}

// A bare `transparent` keyword carries NO hue! Worse: real browsers hand us the
// COMPUTED value -- `rgba(0, 0, 0, 0)`, transparent BLACK -- so the keyword never
// even reaches us in production! Either form drags the fade through muddy gray,
// so any fully-transparent stop WITHOUT its own hue inherits the nearest
// hue-carrying stop instead! (Explicit hues like rgba(255,0,0,0) keep theirs!)
function kdHueLess(st) {
    if (!st || st.opacity !== 0) return false;
    return st.color === 'transparent' || st.color === '#000000';
}
function kdResolveTransparentStops(stops) {
    return stops.map(function (st, i) {
        if (!kdHueLess(st)) return st;
        let hue = null;
        for (let d = 1; d < stops.length && !hue; d++) {
            const left = stops[i - d];
            if (left && left.color && !kdHueLess(left)) hue = left.color === 'transparent' ? null : left.color;
            if (hue) break;
            const right = stops[i + d];
            if (right && right.color && !kdHueLess(right)) hue = right.color === 'transparent' ? null : right.color;
        }
        return { color: hue || '#000000', opacity: 0, offset: st.offset };
    });
}

function kdGradientDef(g, id) {
    const parts = [];
    if (g.kind === 'radial') {
        parts.push('<radialGradient id="' + id + '" gradientUnits="objectBoundingBox" cx="' + g.cx +
            '" cy="' + g.cy + '" r="' + g.r + '"' + (g.repeating ? ' spreadMethod="repeat"' : '') + '>');
    } else {
        parts.push('<linearGradient id="' + id + '" gradientUnits="objectBoundingBox" x1="' + g.x1 +
            '" y1="' + g.y1 + '" x2="' + g.x2 + '" y2="' + g.y2 + '"' + (g.repeating ? ' spreadMethod="repeat"' : '') + '>');
    }
    g.stops.forEach(function (st) {
        parts.push('<stop offset="' + (+st.offset.toFixed(4)) + '" stop-color="' + st.color + '"' +
            (st.opacity < 1 ? ' stop-opacity="' + (+st.opacity.toFixed(4)) + '"' : '') + '/>');
    });
    parts.push(g.kind === 'radial' ? '</radialGradient>' : '</linearGradient>');
    return parts.join('');
}

// Element background as paint layers, back-to-front (base color last)!
function kdBackgroundFills(cs) {
    const fills = [];
    let layers = [];
    try { layers = kdSplitTop(cs.backgroundImage || ''); } catch (e) { layers = []; }
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i].trim();
        if (!layer || layer.toLowerCase() === 'none') continue;
        const g = kdParseGradient(layer);
        if (g) fills.push({ kind: 'gradient', g: g });
    }
    let base = null;
    try { base = kdParseColor(cs.backgroundColor); } catch (e) {}
    if (base && base.hex !== 'transparent' && !(base.opacity === 1 && base.hex === '#ffffff')) {
        fills.push({ kind: 'solid', color: base.hex, opacity: base.opacity });
    }
    return fills;
}

function kdBorderOf(cs) {
    try {
        const w = parseFloat(cs.borderTopWidth);
        const style = (cs.borderTopStyle || '').toLowerCase();
        if (!w || isNaN(w) || style === 'none' || style === 'hidden' || !style) return null;
        let c = kdParseColor(cs.borderTopColor) || { hex: '#000000', opacity: 1 };
        if (c.hex === 'transparent') c = { hex: '#000000', opacity: 0 };
        let dash = '';
        if (style === 'dotted') dash = '2,3';
        else if (style === 'dashed') dash = '8,5';
        return { width: w, color: c.hex, opacity: c.opacity, dash: dash };
    } catch (e) { return null; }
}

function kdCornerRadius(cs) {
    try {
        const direct = parseFloat(cs.borderTopLeftRadius);
        if (!isNaN(direct) && direct > 0) return direct;
        const m = String(cs.borderRadius || '').match(/(-?[\d.]+)px/);
        if (m) {
            const v = parseFloat(m[1]);
            if (!isNaN(v) && v > 0) return v;
        }
    } catch (e) {}
    return 0;
}

// Paint one element's box: stacked fills, stroke on top, rounded corners!
// (Box-shadows stay out: shadow rects only washed the chips out!)
function kdPaintBox(out, defs, el, box, forceBase) {
    let fills = [];
    let border = null;
    let rx = 0;
    try {
        const cs = window.getComputedStyle(el);
        fills = kdBackgroundFills(cs);
        border = kdBorderOf(cs);
        rx = kdCornerRadius(cs);
    } catch (e) {}
    if (!fills.length && !border) {
        if (!forceBase) return;
        fills = [{ kind: 'solid', color: '#ffffff', opacity: 1 }];
    }
    const geom = 'x="' + box.x.toFixed(1) + '" y="' + box.y.toFixed(1) +
        '" width="' + Math.max(0, box.w).toFixed(1) + '" height="' + Math.max(0, box.h).toFixed(1) + '"';
    const rxAttr = rx ? ' rx="' + rx.toFixed(1) + '"' : '';
    fills.forEach(function (f, idx) {
        const top = idx === fills.length - 1;
        let stroke = '';
        if (top && border) {
            stroke = ' stroke="' + border.color + '" stroke-width="' + border.width + '"';
            if (border.opacity < 1) stroke += ' stroke-opacity="' + (+border.opacity.toFixed(4)) + '"';
            if (border.dash) stroke += ' stroke-dasharray="' + border.dash + '"';
        }
        if (f.kind === 'gradient') {
            const id = kdNextGradId();
            defs.push(kdGradientDef(f.g, id));
            out.push('<rect ' + geom + rxAttr + ' fill="url(#' + id + ')"' + stroke + '/>');
        } else {
            let fill = ' fill="' + f.color + '"';
            if (f.opacity < 1) fill += ' fill-opacity="' + (+f.opacity.toFixed(4)) + '"';
            out.push('<rect ' + geom + rxAttr + fill + stroke + '/>');
        }
    });
}

function kdBuildVectorSVG() {
    const W = canvasViewport.scrollWidth || canvasViewport.offsetWidth || 900;
    const H = canvasViewport.scrollHeight || canvasViewport.offsetHeight || 600;
    let measCtx = null;
    try {
        const mc = document.createElement('canvas');
        measCtx = mc.getContext('2d');
    } catch (e) { measCtx = null; }
    const defs = [];
    const body = ['<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>'];
    let crect = null;
    try { crect = canvasViewport.getBoundingClientRect(); } catch (e) {}
    const rel = function (r) {
        if (!crect) return { x: r.left, y: r.top, w: r.width, h: r.height };
        return { x: r.left - crect.left, y: r.top - crect.top, w: r.width, h: r.height };
    };
    const boxOf = function (el) {
        try {
            if (typeof el.getBoundingClientRect !== 'function') return null;
            return rel(el.getBoundingClientRect());
        } catch (e) { return null; }
    };
    Array.from(canvasViewport.children).forEach(function (block) {
        if (!block || block.nodeType !== 1) return;
        const bb = boxOf(block);
        if (bb) kdPaintBox(body, defs, block, bb, true);
        // Inline highlights + nested boxes: paint every descendant with its own fill/border!
        let kids = [];
        try { kids = Array.from(block.querySelectorAll('*')); } catch (e) { kids = []; }
        kids.forEach(function (el) {
            const b = boxOf(el);
            if (!b || b.w <= 0 || b.h <= 0) return;
            kdPaintBox(body, defs, el, b, false);
        });
        let estX = bb ? bb.x : 0;
        const estY = bb ? bb.y : 0;
        const texts = [];
        (function walk(node) {
            if (node.nodeType === 3) {
                if (node.nodeValue) texts.push(node);
                return;
            }
            if (node.nodeType !== 1) return;
            Array.from(node.childNodes).forEach(walk);
        })(block);
        texts.forEach(function (tn) {
            const parent = tn.parentElement || block;
            const f = kdVectorFont(parent);
            let boxes = [];
            try {
                const rr = document.createRange();
                rr.selectNode(tn);
                boxes = Array.from(rr.getClientRects());
            } catch (e) { boxes = []; }
            if (boxes.length) {
                boxes.forEach(function (b) {
                    const lb = rel(b);
                    body.push(kdVectorText(tn.nodeValue, f, lb.x, lb.y + lb.h - f.size * 0.2));
                });
            } else {
                const wdt = kdVectorMeasure(measCtx, tn.nodeValue, f);
                body.push(kdVectorText(tn.nodeValue, f, estX, estY + f.size * 0.8));
                estX += wdt;
            }
        });
    });
    const head = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">';
    const defStr = defs.length ? '<defs>' + defs.join('') + '</defs>' : '';
    return head + defStr + body.join('') + '</svg>';
}

function kdRenderImage(svgText, w, h, onDone) {
    let img = null;
    try { img = new window.Image(); } catch (e) { onDone(null); return; }
    img.onload = function () {
        try {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            if (!ctx) { onDone(null); return; }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            onDone(c.toDataURL('image/jpeg', 0.92));
        } catch (e) { onDone(null); }
    };
    img.onerror = function () { onDone(null); };
    try {
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    } catch (e) { onDone(null); }
}

function exportJPEGFile() {
    playAeroClickSound(750, 0.12);
    autoSaveCanvasContent();
    const w = canvasViewport.scrollWidth || canvasViewport.offsetWidth || 900;
    const h = canvasViewport.scrollHeight || canvasViewport.offsetHeight || 600;
    const svg = kdImageSVG(canvasViewport.innerHTML, kdCollectPageCSS(), w, h);
    const name = kdExportBaseName() + '.jpg';
    kdRenderImage(svg, w, h, function (dataUrl) {
        if (!dataUrl) {
            try { alert('JPEG export needs a browser with image rendering!'); } catch (e) {}
            return;
        }
        kdDownloadBlob(kdDataURLToBlob(dataUrl), name);
    });
}

function exportSVGFile() {
    playAeroClickSound(750, 0.12);
    autoSaveCanvasContent();
    const svg = kdBuildVectorSVG();
    kdDownloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), kdExportBaseName() + '.svg');
}

function exportWebFile() {
    playAeroClickSound(750, 0.12);
    autoSaveCanvasContent();
    const title = kdExportBaseName();
    const html = canvasViewport.innerHTML;
    const finish = function (cssText) {
        const bytes = kdBuildWeb(title, html, cssText);
        kdDownloadBlob(new Blob([bytes], { type: 'application/zip' }), title + '-web.zip');
    };
    try {
        if (typeof fetch === 'function') {
            Promise.all([
                fetch('keydown.css').then(r => r.ok ? r.text() : '').catch(() => ''),
                fetch('style.css').then(r => r.ok ? r.text() : '').catch(() => '')
            ]).then(parts => finish('/* keydown.css */\n' + parts[0] + '\n/* style.css */\n' + parts[1]))
              .catch(() => finish('/* styles unavailable offline */\n'));
        } else {
            finish('/* styles unavailable offline */\n');
        }
    } catch (e) {
        finish('/* styles unavailable offline */\n');
    }
}

function kdBuildDOCX(html) {
    const blocks = kdCanvasBlocks(html);
    const styleFor = function (s) {
        if (s === 'h1') return 'Heading1';
        if (s === 'h2') return 'Heading2';
        if (s === 'h3') return 'Heading3';
        if (s === 'li') return 'ListParagraph';
        return 'Normal';
    };
    let paras = '';
    blocks.forEach(function (b) {
        let runs = '';
        b.runs.forEach(function (r) {
            let rPr = '';
            if (r.bold || r.italic || r.underline) {
                rPr = '<w:rPr>' + (r.bold ? '<w:b/>' : '') + (r.italic ? '<w:i/>' : '') + (r.underline ? '<w:u w:val="single"/>' : '') + '</w:rPr>';
            }
            runs += '<w:r>' + rPr + '<w:t xml:space="preserve">' + kdEscapeXml(r.text) + '</w:t></w:r>';
        });
        if (!runs) runs = '<w:r><w:t xml:space="preserve"></w:t></w:r>';
        paras += '<w:p><w:pPr><w:pStyle w:val="' + styleFor(b.style) + '"/></w:pPr>' + runs + '</w:p>';
    });
    if (!paras) paras = '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>';
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>';
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
        paras +
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>';
    return kdBuildZip([
        { name: '[Content_Types].xml', data: contentTypes },
        { name: '_rels/.rels', data: rels },
        { name: 'word/document.xml', data: doc }
    ]);
}

function kdBuildODT(html) {
    const blocks = kdCanvasBlocks(html);
    const paraFor = function (b) {
        let inner = '';
        const emitRun = function (r) {
            let t = kdEscapeXml(r.text);
            if (r.italic) t = '<text:span text:style-name="I">' + t + '</text:span>';
            if (r.bold) t = '<text:span text:style-name="B">' + t + '</text:span>';
            if (r.underline) t = '<text:span text:style-name="U">' + t + '</text:span>';
            return t;
        };
        b.runs.forEach(function (r) { inner += emitRun(r); });
        if (!inner) inner = '';
        if (b.style === 'h1') return '<text:h text:outline-level="1">' + inner + '</text:h>';
        if (b.style === 'h2') return '<text:h text:outline-level="2">' + inner + '</text:h>';
        if (b.style === 'h3') return '<text:h text:outline-level="3">' + inner + '</text:h>';
        if (b.style === 'li') return '<text:list><text:list-item><text:p>' + inner + '</text:p></text:list-item></text:list>';
        return '<text:p>' + inner + '</text:p>';
    };
    let body = '';
    blocks.forEach(function (b) { body += paraFor(b); });
    if (!body) body = '<text:p/>';
    const content = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
        'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
        'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" ' +
        'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" office:version="1.2">' +
        '<office:automatic-styles>' +
        '<style:style style:name="B" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>' +
        '<style:style style:name="I" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>' +
        '<style:style style:name="U" style:family="text"><style:text-properties style:text-underline-style="solid"/></style:style>' +
        '</office:automatic-styles>' +
        '<office:body><office:text>' + body + '</office:text></office:body></office:document-content>';
    const styles = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2">' +
        '<office:styles></office:styles></office:document-styles>';
    const manifest = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">' +
        '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>' +
        '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
        '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
        '</manifest:manifest>';
    return kdBuildZip([
        { name: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
        { name: 'content.xml', data: content },
        { name: 'styles.xml', data: styles },
        { name: 'META-INF/manifest.xml', data: manifest }
    ]);
}

function kdBuildEPUB(title, html) {
    const blocks = kdCanvasBlocks(html);
    const tagFor = function (s) {
        if (s === 'h1') return 'h1';
        if (s === 'h2') return 'h2';
        if (s === 'h3') return 'h3';
        if (s === 'quote') return 'blockquote';
        if (s === 'li') return 'li';
        return 'p';
    };
    let body = '';
    let openList = false;
    blocks.forEach(function (b) {
        const tag = tagFor(b.style);
        if (tag === 'li' && !openList) { body += '<ul>'; openList = true; }
        if (tag !== 'li' && openList) { body += '</ul>'; openList = false; }
        let inner = '';
        b.runs.forEach(function (r) {
            let t = kdEscapeXml(r.text);
            if (r.underline) t = '<u>' + t + '</u>';
            if (r.italic) t = '<em>' + t + '</em>';
            if (r.bold) t = '<strong>' + t + '</strong>';
            inner += t;
        });
        body += '<' + tag + '>' + inner + '</' + tag + '>';
    });
    if (openList) body += '</ul>';
    if (!body) body = '<p></p>';
    const safeTitle = kdEscapeXml(title || 'bitbook-note');
    const chapter = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>' + safeTitle + '</title>' +
        '<style>body{font-family:sans-serif;line-height:1.6;}blockquote{border-left:3px solid #888;margin:1em 0;padding:.5em 1em;color:#555;}</style>' +
        '</head><body>' + body + '</body></html>';
    const container = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
    const opf = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<package version="3.0" unique-identifier="wid" xmlns="http://www.idpf.org/2007/opf">' +
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
        '<dc:title>' + safeTitle + '</dc:title><dc:language>en</dc:language>' +
        '<dc:identifier id="wid">writeout-export</dc:identifier>' +
        '<meta property="dcterms:modified">2024-01-01T00:00:00Z</meta></metadata>' +
        '<manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>' +
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest>' +
        '<spine><itemref idref="chapter"/></spine></package>';
    const nav = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">' +
        '<head><title>Contents</title></head><body><nav epub:type="toc"><ol>' +
        '<li><a href="chapter.xhtml">' + safeTitle + '</a></li></ol></nav></body></html>';
    return kdBuildZip([
        { name: 'mimetype', data: 'application/epub+zip' },
        { name: 'META-INF/container.xml', data: container },
        { name: 'OEBPS/content.opf', data: opf },
        { name: 'OEBPS/nav.xhtml', data: nav },
        { name: 'OEBPS/chapter.xhtml', data: chapter }
    ]);
}

function kdBuildWeb(title, html, cssText) {
    const safeTitle = kdEscapeXml(title || 'bitbook-note');
    const page = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
        '<title>' + safeTitle + '</title>\n<link rel="stylesheet" href="styles.css" />\n</head>\n' +
        '<body>\n<main class="writeout-export">\n<h1>' + safeTitle + '</h1>\n' +
        '<div id="wysiwyg-canvas">\n' + html + '\n</div>\n</main>\n</body>\n</html>';
    return kdBuildZip([
        { name: 'index.html', data: page },
        { name: 'styles.css', data: cssText || '/* styles unavailable */\n' }
    ]);
}

// --- Download popup menu wiring ---
let downloadMenuWired = false;
function toggleDownloadMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('download-menu');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    menu.style.display = isOpen ? 'none' : 'block';
    if (!isOpen && !downloadMenuWired) {
        downloadMenuWired = true;
        document.addEventListener('click', function (ev) {
            const m = document.getElementById('download-menu');
            const b = document.getElementById('download-menu-btn');
            if (!m || m.style.display === 'none') return;
            if (m.contains(ev.target) || (b && b.contains(ev.target))) return;
            m.style.display = 'none';
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') closeDownloadMenu();
        });
    }
}

function closeDownloadMenu() {
    const menu = document.getElementById('download-menu');
    if (menu) menu.style.display = 'none';
}

// ==========================================
// INSERT MENU (top format bar!)
// ==========================================
var insertMenuWired = false;

function toggleInsertMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('insert-menu-popup');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    try { closeTagsMenu(); } catch (err) {}
    try { closeSkillsMenu(); } catch (err2) {}
    menu.style.display = isOpen ? 'none' : 'block';
    if (!isOpen && !insertMenuWired) {
        insertMenuWired = true;
        document.addEventListener('click', function (ev) {
            const m = document.getElementById('insert-menu-popup');
            const b = document.getElementById('insert-menu-btn');
            if (!m || m.style.display === 'none') return;
            if (m.contains(ev.target) || (b && b.contains(ev.target))) return;
            m.style.display = 'none';
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') closeInsertMenu();
        });
    }
}

function closeInsertMenu() {
    const menu = document.getElementById('insert-menu-popup');
    if (menu) menu.style.display = 'none';
}

// ==========================================
// TAGS MENU (top format bar, next to Insert!)
// ==========================================
var tagsMenuWired = false;

function toggleTagsMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('tags-menu-popup');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    try { closeInsertMenu(); } catch (err) {}
    try { closeSkillsMenu(); } catch (err2) {}
    menu.style.display = isOpen ? 'none' : 'block';
    if (!isOpen && !tagsMenuWired) {
        tagsMenuWired = true;
        document.addEventListener('click', function (ev) {
            const m = document.getElementById('tags-menu-popup');
            const b = document.getElementById('tags-menu-btn');
            if (!m || m.style.display === 'none') return;
            if (m.contains(ev.target) || (b && b.contains(ev.target))) return;
            m.style.display = 'none';
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') closeTagsMenu();
        });
    }
}

function closeTagsMenu() {
    const menu = document.getElementById('tags-menu-popup');
    if (menu) menu.style.display = 'none';
}

// ==========================================
// SKILLS MENU (top format bar, next to Tags!)
// ==========================================
var skillsMenuWired = false;

function toggleSkillsMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('skills-menu-popup');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    try { closeInsertMenu(); } catch (err) {}
    try { closeTagsMenu(); } catch (err2) {}
    menu.style.display = isOpen ? 'none' : 'block';
    if (!isOpen && !skillsMenuWired) {
        skillsMenuWired = true;
        document.addEventListener('click', function (ev) {
            const m = document.getElementById('skills-menu-popup');
            const b = document.getElementById('skills-menu-btn');
            if (!m || m.style.display === 'none') return;
            if (m.contains(ev.target) || (b && b.contains(ev.target))) return;
            m.style.display = 'none';
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') closeSkillsMenu();
        });
    }
}

function closeSkillsMenu() {
    const menu = document.getElementById('skills-menu-popup');
    if (menu) menu.style.display = 'none';
}

// ==========================================
// ANNOTATE SKILL: its own view with the document in the center!
// The real canvas moves into the view (read-only) and goes back on Quit!
// Select text and it's highlighted right away, then deselected (like Kami)!
// ==========================================
var anState = null;
var anColor = 'yellow';
var anStyle = 'hl';    // hl = Highlighter, ul = Gel Underline, st = Gel Strikethrough!
var anPressed = false; // a mouse/finger is down: a selection is still being made!
var anTimer = 0;
// Text nodes the range covers, with the slice of each one to highlight!
// Chips (contenteditable=false islands) and blank lines between blocks are skipped!
function anTextPieces(range, cv) {
    const out = [];
    const root = range.commonAncestorContainer;
    const walker = document.createTreeWalker(root.nodeType === 3 ? root.parentNode : root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
        if (!cv.contains(n) || !range.intersectsNode(n)) continue;
        const start = n === range.startContainer ? range.startOffset : 0;
        const end = n === range.endContainer ? range.endOffset : n.length;
        if (end <= start) continue;
        const piece = n.data.slice(start, end);
        if (/^\s*$/.test(piece) && piece.indexOf('\n') !== -1) continue;
        const island = n.parentNode.closest('[contenteditable="false"], script, style, svg');
        if (island && island !== cv) continue;
        out.push({ node: n, start: start, end: end });
    }
    return out;
}
// A highlight covering ALL of an inline element (bold, a styled chip...) wraps the
// element instead, so one highlight reads as one pill, not a row of little ones!
function anPromote(mark, cv) {
    let p = mark.parentNode;
    while (p && p !== cv && p.nodeType === 1 && p.childNodes.length === 1 && !p.classList.contains('an-hl') &&
        p.getAttribute('contenteditable') !== 'false' && /^inline/.test(getComputedStyle(p).display)) {
        // <p><mark>text</mark></p>  ->  <mark><p>text</p></mark>
        while (mark.firstChild) p.appendChild(mark.firstChild);
        p.removeChild(mark);
        p.parentNode.insertBefore(mark, p);
        mark.appendChild(p);
        p = mark.parentNode;
    }
}
// Touching highlights of the same color join into one!
function anMerge(mark) {
    const same = function (o) { return o && o.nodeType === 1 && o.tagName === 'MARK' && o.className === mark.className; };
    while (same(mark.previousSibling)) {
        const prev = mark.previousSibling;
        while (mark.firstChild) prev.appendChild(mark.firstChild);
        mark.parentNode.removeChild(mark);
        mark = prev;
    }
    while (same(mark.nextSibling)) {
        const next = mark.nextSibling;
        while (next.firstChild) mark.appendChild(next.firstChild);
        next.parentNode.removeChild(next);
    }
    mark.normalize();
}
// ERASE: only Annotate's own highlights (<mark class="an-hl">) ever go; bold, chips and
// every other style stay! The selected part of a highlight is cut out of it (the rest of
// that highlight stays), or click a highlight to erase all of it!
function anUnwrap(mark) {
    const p = mark.parentNode;
    if (!p) return;
    while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
    p.removeChild(mark);
    p.normalize();
}
// Join touching same-color highlights + tidy split-up text across the block!
function anTidy(cv, nodes) {
    const blocks = [];
    nodes.forEach(function (t) {
        const b = t.parentNode && (t.parentNode.closest('div, p, li, h1, h2, h3, blockquote') || cv);
        if (b && blocks.indexOf(b) === -1) blocks.push(b);
    });
    blocks.forEach(function (b) {
        b.querySelectorAll('mark.an-hl').forEach(function (m) { if (m.isConnected && !m.textContent) m.parentNode.removeChild(m); });
        b.querySelectorAll('mark.an-hl').forEach(function (m) { if (m.isConnected) anMerge(m); });
        b.normalize();
    });
}
// Split the text so each selected run is its own text node, and return those nodes!
function anIsolate(range, cv) {
    return anTextPieces(range, cv).map(function (pc) {
        let t = pc.node;
        if (pc.end < t.length) t.splitText(pc.end);
        if (pc.start > 0) t = t.splitText(pc.start);
        return t;
    });
}
// Take Annotate highlights off exactly these letters: every highlight they sit in is cut
// around them, so the letters before + after keep their highlight (inner tags split cleanly)!
function anClearNodes(nodes, cv) {
    let changed = false;
    for (let guard = 0; guard < 20; guard++) {
        const groups = [];
        nodes.forEach(function (t) {
            if (!t.parentNode) return;
            const m = t.parentNode.closest('mark.an-hl');
            if (!m || !cv.contains(m)) return;
            let g = groups.filter(function (x) { return x.mark === m; })[0];
            if (!g) { g = { mark: m, first: t, last: t }; groups.push(g); }
            g.last = t;
        });
        if (!groups.length) break;
        groups.forEach(function (g) {
            const m = g.mark;
            const keep = function (r, before) {
                if (r.collapsed) return;
                const frag = r.extractContents();
                fmtPruneEmpty(frag);
                if (!frag.textContent) return;
                const part = m.cloneNode(false);
                part.appendChild(frag);
                m.parentNode.insertBefore(part, before ? m : m.nextSibling);
            };
            const after = document.createRange();
            after.setStartAfter(g.last);
            after.setEnd(m, m.childNodes.length);
            keep(after, false);
            const before = document.createRange();
            before.setStart(m, 0);
            before.setEndBefore(g.first);
            keep(before, true);
            const p = m.parentNode;
            while (m.firstChild) p.insertBefore(m.firstChild, m);
            p.removeChild(m);
        });
        changed = true; // loop again: an outer highlight could still hold some letters!
    }
    return changed;
}
function anEraseRange(range, cv) {
    return anClearNodes(anIsolate(range, cv), cv);
}
function anErased() {
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { playAeroClickSound(420, 0.06); } catch (e) {}
}
function anHighlightSelection() {
    anTimer = 0;
    if (!anState || anPressed) return false;
    const cv = document.getElementById('wysiwyg-canvas');
    const sel = window.getSelection();
    if (!cv || !sel || !sel.rangeCount || sel.isCollapsed) return false;
    const range = sel.getRangeAt(0).cloneRange();
    if (!range.intersectsNode(cv)) return false;
    // Drags that run past the page edges only count the part on the page!
    if (!cv.contains(range.startContainer)) range.setStart(cv, 0);
    if (!cv.contains(range.endContainer)) range.setEnd(cv, cv.childNodes.length);
    const nodes = anIsolate(range, cv);
    sel.removeAllRanges();
    if (!nodes.length) return false;
    // The old highlight comes off JUST these letters first (the rest keeps it)...
    const cleared = anClearNodes(nodes, cv);
    if (anColor === 'erase') {
        anTidy(cv, nodes);
        if (cleared) anErased();
        return cleared;
    }
    // ...then the new color goes on!
    const marks = nodes.map(function (t) {
        const m = document.createElement('mark');
        m.className = 'an-hl an-hl-' + anColor + (anStyle && anStyle !== 'hl' ? ' an-s-' + anStyle : '');
        t.parentNode.insertBefore(m, t);
        m.appendChild(t);
        return m;
    });
    marks.forEach(function (m) { anPromote(m, cv); });
    anTidy(cv, nodes);
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { playAeroClickSound(900, 0.05); } catch (e) {}
    return true;
}
function anOpen() {
    const view = document.getElementById('annotate-view');
    const stage = document.getElementById('an-stage');
    const cv = document.getElementById('wysiwyg-canvas');
    if (!view || !stage || !cv || anState) return;
    const spot = document.createComment('annotate-spot');
    cv.parentNode.insertBefore(spot, cv);
    anState = { spot: spot, editable: cv.getAttribute('contenteditable'), overflow: document.body.style.overflow };
    try { if (cv.contains(document.activeElement)) cv.blur(); } catch (e) {}
    cv.setAttribute('contenteditable', 'false');
    stage.appendChild(cv);
    document.body.style.overflow = 'hidden';
    view.hidden = false;
    try { playAeroClickSound(650, 0.1); } catch (e) {}
    try { document.getElementById('an-quit-btn').focus(); } catch (e) {}
}
function anQuit() {
    const view = document.getElementById('annotate-view');
    const cv = document.getElementById('wysiwyg-canvas');
    if (!anState) return;
    if (cv && anState.spot.parentNode) {
        anState.spot.parentNode.insertBefore(cv, anState.spot);
        if (anState.editable === null) cv.removeAttribute('contenteditable');
        else cv.setAttribute('contenteditable', anState.editable);
    }
    if (anState.spot.parentNode) anState.spot.parentNode.removeChild(anState.spot);
    document.body.style.overflow = anState.overflow;
    anState = null;
    if (view) view.hidden = true;
    try { playAeroClickSound(450, 0.1); } catch (e) {}
}
function anWireSkills() {
    if (anWireSkills._done) return;
    anWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="annotate"]').forEach(function (item) {
            item.addEventListener('click', function () {
                try { closeSkillsMenu(); } catch (e) {}
                anOpen();
            });
        });
    } catch (e) {}
    const quit = document.getElementById('an-quit-btn');
    if (quit) quit.addEventListener('click', anQuit);
    // Dropdowns: one open at a time! Opening one closes the other; pressing the open one closes it!
    const setDrop = function (drop, open) {
        drop.classList.toggle('is-open', open);
        const btn = drop.querySelector('[data-an-drop-btn]');
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        const colors = drop.querySelector('.an-drop-colors');
        if (colors) { if (open) colors.removeAttribute('inert'); else colors.setAttribute('inert', ''); }
    };
    document.querySelectorAll('#annotate-view [data-an-drop-btn]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const mine = btn.closest('.an-drop');
            const open = !mine.classList.contains('is-open');
            document.querySelectorAll('#annotate-view .an-drop').forEach(function (d) { setDrop(d, d === mine && open); });
            try { playAeroClickSound(open ? 700 : 500, 0.06); } catch (e) {}
        });
    });
    document.querySelectorAll('#annotate-view [data-an-color]').forEach(function (b) {
        b.addEventListener('click', function () {
            anColor = b.getAttribute('data-an-color');
            if (anColor !== 'erase') anStyle = b.getAttribute('data-an-style') || 'hl';
            const v = document.getElementById('annotate-view');
            if (v) v.classList.toggle('an-erasing', anColor === 'erase');
            document.querySelectorAll('#annotate-view [data-an-color]').forEach(function (o) {
                const on = o === b;
                o.classList.toggle('is-active', on);
                o.setAttribute('aria-checked', on ? 'true' : 'false');
            });
            // The dropdown holding the tool in use keeps a ring, even while it's closed!
            document.querySelectorAll('#annotate-view .an-drop').forEach(function (d) { d.classList.toggle('has-active', d.contains(b)); });
            try { playAeroClickSound(800, 0.06); } catch (e) {}
        });
    });
    document.addEventListener('keydown', function (ev) {
        if (!anState) return;
        if (ev.key === 'Escape') { anQuit(); return; }
        // Cmd/Ctrl+Z undoes a highlight (the note isn't focused in Annotate)!
        if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.defaultPrevented) {
            const k = (ev.key || '').toLowerCase();
            const isUndo = k === 'z' && !ev.shiftKey;
            const isRedo = (k === 'z' && ev.shiftKey) || (k === 'y' && ev.ctrlKey && !ev.metaKey);
            if (!isUndo && !isRedo) return;
            ev.preventDefault();
            if (isUndo) bbUndo(); else bbRedo();
            try { window.getSelection().removeAllRanges(); } catch (e) {}
        }
    });
    // Let go of a selection: highlight it! (Shift+arrow selections apply when Shift lifts!)
    // A new press cancels a check that hasn't run yet, so it can't grab a half-made drag!
    const press = function () {
        anPressed = true;
        if (anTimer) { clearTimeout(anTimer); anTimer = 0; }
    };
    const later = function () {
        anPressed = false;
        if (anState && !anTimer) anTimer = setTimeout(anHighlightSelection, 0);
    };
    // Eraser + a plain click on a highlight: the whole highlight goes!
    document.addEventListener('click', function (ev) {
        if (!anState || anColor !== 'erase' || !ev.target || !ev.target.closest) return;
        const sel = window.getSelection();
        if (sel && sel.rangeCount && !sel.isCollapsed) return;
        const cv = document.getElementById('wysiwyg-canvas');
        const m = ev.target.closest('mark.an-hl');
        if (!m || !cv || !cv.contains(m)) return;
        anUnwrap(m);
        anErased();
    });
    document.addEventListener('mousedown', press, true);
    document.addEventListener('touchstart', press, true);
    document.addEventListener('mouseup', later, true);
    document.addEventListener('touchend', later, true);
    document.addEventListener('touchcancel', function () { anPressed = false; }, true);
    document.addEventListener('keyup', function (ev) { if (ev.key === 'Shift' && !anPressed) later(); });
}

// ==========================================
// JUMPER SKILL part 1: ids + rail + smooth jump!
// ==========================================
var jumperSeq = 0;
try { jumperSeq = parseInt(localStorage.getItem('bitbook_jumper_seq') || '0', 10) || 0; } catch (e) { jumperSeq = 0; }
function jumperNextId() {
    jumperSeq += 1;
    try { localStorage.setItem('bitbook_jumper_seq', String(jumperSeq)); } catch (e) {}
    return 'jump-' + Date.now().toString(36) + '-' + jumperSeq;
}
function jumperScrollBox() {
    return document.querySelector('.canvas-scrollbox') || document.getElementById('wysiwyg-canvas');
}
function jumperEnsureRail() {
    let rail = document.getElementById('doc-jumper-rail');
    if (!rail) {
        rail = document.createElement('div');
        rail.id = 'doc-jumper-rail';
        rail.setAttribute('aria-label', 'Document jumpers — custom scrollbar');
        rail.innerHTML = '<div id="doc-jumper-rail-track"></div><div id="doc-jumper-rail-thumb"></div><div id="doc-jumper-rail-dots"></div>';
        document.body.appendChild(rail);
        jumperWireRailDrag(rail);
    }
    let gutter = document.getElementById('doc-jumper-gutter');
    if (!gutter) {
        const box = document.querySelector('.canvas-scrollbox');
        if (box) {
            gutter = document.createElement('div');
            gutter.id = 'doc-jumper-gutter';
            gutter.setAttribute('aria-hidden', 'true');
            box.appendChild(gutter);
        }
    }
    return rail;
}
function jumperJumpToId(id) {
    if (!id) return;
    const anchor = document.querySelector('.jumper-anchor[data-jumper-id="' + id + '"]');
    if (!anchor) return;
    const box = jumperScrollBox();
    try {
        if (box && typeof box.scrollTo === 'function') {
            const boxRect = box.getBoundingClientRect();
            const r = anchor.getBoundingClientRect();
            box.scrollTo({ top: box.scrollTop + (r.top - boxRect.top) - (boxRect.height * 0.3), behavior: 'smooth' });
        } else if (anchor.scrollIntoView) { anchor.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    } catch (e) { try { anchor.scrollIntoView({ block: 'center' }); } catch (err) {} }
    try {
        anchor.classList.remove('jumper-flash');
        void anchor.offsetWidth;
        anchor.classList.add('jumper-flash');
        setTimeout(function () { anchor.classList.remove('jumper-flash'); }, 1200);
    } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
}
function jumperLabelFor(anchor) {
    const id = anchor.getAttribute('data-jumper-id') || '';
    const label = anchor.getAttribute('data-jumper-label') || '';
    if (label) return label;
    return 'Jump ' + id.replace(/^jump-/, '').slice(-4);
}
// JUMPER part 2: rail dots positioned by relative doc position!
function jumperRailParts() {
    return {
        rail: document.getElementById('doc-jumper-rail'),
        track: document.getElementById('doc-jumper-rail-track'),
        thumb: document.getElementById('doc-jumper-rail-thumb'),
        dots: document.getElementById('doc-jumper-rail-dots'),
        gutter: document.getElementById('doc-jumper-gutter')
    };
}
function jumperScrollMetrics() {
    const box = jumperScrollBox();
    if (!box) return { scrollTop: 0, scrollH: 1, clientH: 1 };
    return { scrollTop: box.scrollTop || 0, scrollH: Math.max(1, box.scrollHeight || 1), clientH: Math.max(1, box.clientHeight || 1) };
}
function jumperSyncThumb() {
    const parts = jumperRailParts();
    if (!parts.rail || !parts.thumb) return;
    const m = jumperScrollMetrics();
    const railH = parts.rail.clientHeight || 1;
    const pad = 10;
    const trackH = Math.max(1, railH - pad * 2);
    const thumbH = Math.max(28, Math.min(trackH, trackH * (m.clientH / m.scrollH)));
    const maxScroll = Math.max(1, m.scrollH - m.clientH);
    const frac = Math.min(1, Math.max(0, m.scrollTop / maxScroll));
    parts.thumb.style.height = thumbH + 'px';
    parts.thumb.style.top = (pad + frac * (trackH - thumbH)) + 'px';
}
function jumperWireRailDrag(rail) {
    if (!rail || rail.dataset.wired === '1') return;
    rail.dataset.wired = '1';
    const scrollToFrac = function (frac) {
        const box = jumperScrollBox();
        if (!box) return;
        frac = Math.min(1, Math.max(0, frac));
        const max = Math.max(0, (box.scrollHeight || 1) - (box.clientHeight || 1));
        try { box.scrollTo({ top: frac * max, behavior: 'auto' }); }
        catch (e) { try { box.scrollTop = frac * max; } catch (err) {} }
        jumperSyncThumb();
        jumperScheduleRefresh();
    };
    rail.addEventListener('pointerdown', function (ev) {
        try {
            if (ev.target && ev.target.closest && (ev.target.closest('.doc-jumper-dot') || ev.target.closest('#doc-jumper-rail-thumb'))) return;
            const r = rail.getBoundingClientRect();
            const y = (ev.clientY - r.top - 10) / Math.max(1, r.height - 20);
            scrollToFrac(y);
            const move = function (e2) {
                const rr = rail.getBoundingClientRect();
                scrollToFrac((e2.clientY - rr.top - 10) / Math.max(1, rr.height - 20));
            };
            const up = function () {
                try { window.removeEventListener('pointermove', move); } catch (e) {}
                try { window.removeEventListener('pointerup', up); } catch (e) {}
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        } catch (e) {}
    });
    const thumbDrag = function (ev) {
        if (ev) { ev.stopPropagation(); ev.preventDefault(); }
        const startY = ev.clientY;
        const box = jumperScrollBox();
        const startTop = box ? box.scrollTop : 0;
        const railH = rail.clientHeight || 1;
        const pxPerScroll = (railH - 20) / Math.max(1, ((box ? box.scrollHeight : 1) - (box ? box.clientHeight : 1)));
        const move = function (e2) {
            const dy = e2.clientY - startY;
            const target = startTop + dy / Math.max(0.01, pxPerScroll);
            const max = Math.max(0, ((box ? box.scrollHeight : 1) - (box ? box.clientHeight : 1)));
            try { box.scrollTo({ top: Math.min(max, Math.max(0, target)), behavior: 'auto' }); }
            catch (e) { try { box.scrollTop = target; } catch (err) {} }
            jumperSyncThumb();
            jumperScheduleRefresh();
        };
        const up = function () {
            try { window.removeEventListener('pointermove', move); } catch (e) {}
            try { window.removeEventListener('pointerup', up); } catch (e) {}
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };
    const thumb = rail.querySelector('#doc-jumper-rail-thumb');
    if (thumb) thumb.addEventListener('pointerdown', thumbDrag);
}
// The anchor is a zero-size marker sitting at the TOP of its line, so find the line's
// real middle: the first character after the anchor (or the line height as a fallback)!
function jumperLineCenterY(anchor, ar) {
    try {
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        const w = document.createTreeWalker(cv, NodeFilter.SHOW_TEXT);
        w.currentNode = anchor;
        let n;
        while ((n = w.nextNode())) {
            const i = n.data.search(/[^\s\u200b]/);
            if (i === -1) continue;
            const r = document.createRange();
            r.setStart(n, i);
            r.setEnd(n, i + 1);
            const q = r.getClientRects()[0];
            // Only trust it if it's on the anchor's own line!
            if (q && q.top < ar.top + 4 + (parseFloat(getComputedStyle(n.parentElement).lineHeight) || 24)) return q.top + q.height / 2;
            break;
        }
    } catch (e) {}
    let lh = 0;
    try { lh = parseFloat(getComputedStyle(anchor.parentElement).lineHeight) || 0; } catch (e) {}
    return ar.top + (lh ? lh / 2 : 12);
}
function jumperRefreshRail() {
    const parts = jumperRailParts();
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!parts.rail || !parts.dots || !cv) return;
    jumperWireRailDrag(parts.rail);
    jumperSyncThumb();
    const box = jumperScrollBox();
    const dotsBox = parts.dots;
    const gutter = parts.gutter;
    dotsBox.innerHTML = '';
    if (gutter) gutter.innerHTML = '';
    const anchors = cv.querySelectorAll('.jumper-anchor[data-jumper-id]');
    // Track the line each anchor sits on so hover reveals its chip!
    const lineMap = [];
    anchors.forEach(function (a) {
        const id = a.getAttribute('data-jumper-id');
        if (!id) return;
        let frac = 0.05;
        try {
            if (box) {
                const boxRect = box.getBoundingClientRect();
                const r = a.getBoundingClientRect();
                frac = (r.top - boxRect.top + box.scrollTop) / Math.max(1, box.scrollHeight || 1);
            } else { frac = (a.offsetTop || 0) / Math.max(1, cv.scrollHeight || 1); }
        } catch (e) {}
        frac = Math.min(0.96, Math.max(0.03, frac));
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'doc-jumper-dot';
        dot.title = jumperLabelFor(a);
        dot.setAttribute('aria-label', 'Jump to ' + jumperLabelFor(a));
        dot.style.top = 'calc(' + (frac * 100).toFixed(2) + '% - 5px)';
        dot.addEventListener('click', function (ev) {
            if (ev) ev.stopPropagation();
            jumperJumpToId(id);
        });
        dotsBox.appendChild(dot);
        // Remember the anchor's screen spot for its left-side chip!
        try {
            const r2 = a.getBoundingClientRect();
            lineMap.push({ id: id, label: jumperLabelFor(a), centerY: jumperLineCenterY(a, r2), leftX: r2.left });
        } catch (e) {}
    });
    // Chips hover LEFT of their own jumper — peek on line hover!
    if (gutter && box) {
        try {
            const boxRect = box.getBoundingClientRect();
            const gutRect = gutter.getBoundingClientRect();
            lineMap.forEach(function (row) {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'doc-gutter-chip';
                chip.textContent = row.label;
                chip.title = 'Jump to ' + row.label;
                chip.setAttribute('aria-label', 'Jump to ' + row.label);
                chip.setAttribute('data-jumper-target', row.id);
                // Centered on its line (the CSS pulls it up by half its own height)!
                chip.style.top = Math.max(12, Math.min(gutRect.height - 12, row.centerY - boxRect.top + box.scrollTop - (gutter.offsetTop || 0))) + 'px';
                // Right edge kisses the jumper's left edge (8px gap)!
                try {
                    const chipW = Math.min(90, 20 + String(row.label || '').length * 7);
                    const wantRight = (row.leftX - boxRect.left - 8) - (gutter.offsetLeft || 0);
                    chip.style.left = Math.max(4, wantRight - chipW) + 'px';
                    chip.style.maxWidth = chipW + 'px';
                } catch (e) {}
                chip.addEventListener('click', function (ev) {
                    if (ev) ev.stopPropagation();
                    jumperJumpToId(row.id);
                });
                // Reveal only while hovering that exact line!
                chip.dataset.rowY = String(row.centerY);
                gutter.appendChild(chip);
            });
            jumperWireGutterHover(box, gutter);
        } catch (e) {}
    }
}
// Show the margin chip whose line sits under the cursor!
function jumperWireGutterHover(box, gutter) {
    if (!box || !gutter || gutter.dataset.hoverWired === '1') return;
    gutter.dataset.hoverWired = '1';
    const cv = document.getElementById('wysiwyg-canvas');
    const pick = function (clientY) {
        try {
            let best = null;
            let bestDist = 22;
            gutter.querySelectorAll('.doc-gutter-chip').forEach(function (c) {
                const ry = parseFloat(c.dataset.rowY || '0');
                // rowY is viewport-based — compare in viewport space!
                const d = Math.abs(ry - clientY);
                if (d < bestDist) { bestDist = d; best = c; }
            });
            gutter.querySelectorAll('.doc-gutter-chip').forEach(function (c) {
                const on = (c === best);
                c.style.opacity = on ? '1' : '0';
                c.style.pointerEvents = on ? 'auto' : 'none';
                c.style.transform = on ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.85)';
                c.style.zIndex = on ? '35' : '30';
            });
        } catch (e) {}
    };
    const hide = function () {
        try {
            gutter.querySelectorAll('.doc-gutter-chip').forEach(function (c) {
                c.style.opacity = '0';
                c.style.pointerEvents = 'none';
            });
        } catch (e) {}
    };
    if (cv) {
        cv.addEventListener('mousemove', function (ev) { pick(ev.clientY); }, { passive: true });
        cv.addEventListener('mouseleave', hide);
    }
    box.addEventListener('scroll', hide, { passive: true });
}
var jumperRefreshTimer = null;
function jumperScheduleRefresh() {
    try { if (jumperRefreshTimer) clearTimeout(jumperRefreshTimer); } catch (e) {}
    jumperRefreshTimer = setTimeout(function () { jumperRefreshRail(); }, 150);
}
// Thumb must glide on EVERY scroll — lightweight sync, no rebuild!
function jumperOnScroll() {
    try { jumperSyncThumb(); } catch (e) {}
    jumperScheduleRefresh();
}
// JUMPER part 3: insert a hover-chip anchor at the caret!
function jumperInsertAnchor() {
    try { closeSkillsMenu(); } catch (e) {}
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!cv) return;
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    let saved = null;
    try {
        const sel = window.getSelection();
        if (sel.rangeCount && cv.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange();
    } catch (e) {}
    try { cv.focus(); } catch (e) {}
    try {
        if (saved) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(saved);
        }
    } catch (e) {}
    let label = null;
    try { label = (typeof window.prompt === 'function') ? window.prompt('Jumper label (e.g. Chapter 2...):', '') : null; } catch (e) { label = null; }
    if (!label || !String(label).trim()) return;
    label = String(label).trim();
    const id = jumperNextId();
    const anchor = document.createElement('span');
    anchor.className = 'jumper-anchor';
    anchor.setAttribute('contenteditable', 'false');
    anchor.setAttribute('data-jumper-id', id);
    anchor.setAttribute('data-jumper-label', label);
    anchor.setAttribute('aria-hidden', 'true');
    // Zero-width space: zero advance width, keeps the caret valid!
    anchor.textContent = '​';
    let placed = false;
    try { if (typeof fmtInsertNodeAtCaret === 'function') placed = !!fmtInsertNodeAtCaret(anchor); } catch (e) { placed = false; }
    if (!placed) {
        try { cv.appendChild(anchor); placed = true; } catch (e) {}
    }
    if (placed) {
        // Park the caret right AFTER the zero-width marker — no spacer text!
        try {
            const caret = document.createRange();
            caret.setStartAfter(anchor);
            caret.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(caret);
        } catch (e) {}
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    }
    jumperEnsureRail();
    jumperScheduleRefresh();
    setTimeout(function () { jumperJumpToId(id); }, 60);
}
// JUMPER part 4: wire Skills btn + keep rail fresh on scroll/edit!
function jumperWireSkills() {
    if (jumperWireSkills._done) return;
    jumperWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill]').forEach(function (item) {
            item.addEventListener('click', function () {
                if (item.getAttribute('data-skill') === 'jumper') jumperInsertAnchor();
            });
        });
    } catch (e) {}
    try { jumperEnsureRail(); } catch (e) {}
    try {
        const cv = document.getElementById('wysiwyg-canvas');
        const box = document.querySelector('.canvas-scrollbox');
        if (box) {
            box.addEventListener('scroll', jumperOnScroll, { passive: true });
            if (cv) cv.addEventListener('scroll', jumperOnScroll, { passive: true });
            window.addEventListener('resize', jumperScheduleRefresh);
        }
        if (cv) {
            cv.addEventListener('input', jumperScheduleRefresh);
        }
        const rebuild = function () {
            try {
                // Strip any legacy inline chips — gutter owns the UI now!
                document.querySelectorAll('#wysiwyg-canvas .jumper-line-chip').forEach(function (c) {
                    try { c.remove(); } catch (e) {}
                });
            } catch (e) {}
            jumperEnsureRail();
            jumperScheduleRefresh();
        };
        setTimeout(rebuild, 400);
        setTimeout(rebuild, 1500);
    } catch (e) {}
}

// ==========================================
// UNI-CHIP part 1: Inkpath-style HSVA engine!
// ==========================================
function uniClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function uniHsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360; s = uniClamp(s, 0, 1); v = uniClamp(v, 0, 1);
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60) { rp = c; gp = x; } else if (h < 120) { rp = x; gp = c; }
    else if (h < 180) { gp = c; bp = x; } else if (h < 240) { gp = x; bp = c; }
    else if (h < 300) { rp = x; bp = c; } else { rp = c; bp = x; }
    return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) };
}
function uniRgbToHex(r, g, b) {
    const hx = function (v) { return uniClamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); };
    return '#' + hx(r) + hx(g) + hx(b);
}
function uniRgbaToHex8(r, g, b, a) {
    const aa = uniClamp(Math.round(uniClamp(a, 0, 1) * 255), 0, 255).toString(16).padStart(2, '0');
    return uniRgbToHex(r, g, b) + aa;
}
function uniParseHex(str) {
    if (typeof str !== 'string') return null;
    let s = str.trim();
    if (!s) return null;
    if (s[0] !== '#') s = '#' + s;
    let m;
    if ((m = s.match(/^#([0-9a-fA-F]{3})$/))) {
        return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
    }
    if ((m = s.match(/^#([0-9a-fA-F]{6})$/))) {
        return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
    }
    if ((m = s.match(/^#([0-9a-fA-F]{8})$/))) {
        return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: parseInt(m[1].slice(6, 8), 16) / 255 };
    }
    return null;
}
function uniRgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d !== 0) {
        if (mx === r) h = 60 * (((g - b) / d) % 6);
        else if (mx === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return { h: h, s: mx === 0 ? 0 : d / mx, v: mx };
}
// UNI-CHIP part 2: live Inkpath-style preview (sliders + hex + text)!
function uniReadHSVA() {
    const g = function (id, fb) {
        const el = document.getElementById(id);
        const v = el ? parseFloat(el.value) : fb;
        return isFinite(v) ? v : fb;
    };
    return { h: g('insp-uni-h', 280), s: g('insp-uni-s', 80), v: g('insp-uni-v', 90), a: g('insp-uni-a', 100) };
}
function uniCss(h, s, v, a) {
    const rgb = uniHsvToRgb(h, s / 100, v / 100);
    const al = uniClamp(a / 100, 0, 1);
    if (al >= 0.995) return 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + (Math.round(al * 100) / 100) + ')';
}
function uniPaintSliders(h, s, v) {
    h = ((h % 360) + 360) % 360; s = uniClamp(s, 0, 100); v = uniClamp(v, 0, 100);
    const hEl = document.getElementById('insp-uni-h');
    const sEl = document.getElementById('insp-uni-s');
    const vEl = document.getElementById('insp-uni-v');
    const aEl = document.getElementById('insp-uni-a');
    if (hEl) hEl.style.background = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';
    if (sEl) {
        const c0 = uniHsvToRgb(h, 0, v / 100), c5 = uniHsvToRgb(h, 0.5, v / 100), c1 = uniHsvToRgb(h, 1, v / 100);
        sEl.style.background = 'linear-gradient(to right, rgb(' + c0.r + ',' + c0.g + ',' + c0.b + ') 0%, rgb(' + c5.r + ',' + c5.g + ',' + c5.b + ') 50%, rgb(' + c1.r + ',' + c1.g + ',' + c1.b + ') 100%)';
    }
    if (vEl) {
        const c0 = uniHsvToRgb(h, s / 100, 0), c5 = uniHsvToRgb(h, s / 100, 0.5), c1 = uniHsvToRgb(h, s / 100, 1);
        vEl.style.background = 'linear-gradient(to right, rgb(' + c0.r + ',' + c0.g + ',' + c0.b + ') 0%, rgb(' + c5.r + ',' + c5.g + ',' + c5.b + ') 50%, rgb(' + c1.r + ',' + c1.g + ',' + c1.b + ') 100%)';
    }
    if (aEl) {
        const f = uniHsvToRgb(h, s / 100, v / 100);
        aEl.style.background = 'linear-gradient(to right, rgba(' + f.r + ',' + f.g + ',' + f.b + ',0) 0%, rgba(' + f.r + ',' + f.g + ',' + f.b + ',1) 100%)';
    }
}
function uniRefresh(fromHex) {
    const hsva = uniReadHSVA();
    const rgb = uniHsvToRgb(hsva.h, hsva.s / 100, hsva.v / 100);
    const hex8 = uniRgbaToHex8(rgb.r, rgb.g, rgb.b, hsva.a / 100);
    const css = uniCss(hsva.h, hsva.s, hsva.v, hsva.a);
    const setT = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    setT('val-uni-h', Math.round(hsva.h));
    setT('val-uni-s', Math.round(hsva.s));
    setT('val-uni-v', Math.round(hsva.v));
    setT('val-uni-a', Math.round(hsva.a));
    const prev = document.getElementById('uni-preview');
    if (prev) prev.style.background = css;
    if (!fromHex) {
        const hexEl = document.getElementById('uni-hex');
        if (hexEl && document.activeElement !== hexEl) hexEl.value = hex8;
    }
    const solid = uniRgbaToHex8(rgb.r, rgb.g, rgb.b, 1).slice(0, 7);
    const chip = document.getElementById('uni-chip-preview');
    if (chip) {
        // Gel Capsule: fill/edge/ink all come from the picked color!
        chip.style.setProperty('--uni-accent', solid);
        chip.textContent = uniPreviewText();
    }
    uniPaintSliders(hsva.h, hsva.s, hsva.v);
    return { hex8: hex8, css: css, solid: solid };
}
// UNI-CHIP part 3: a STYLE with custom settings! Selected text gets wrapped;
// a bare caret gets a fresh "Text" chip, pre-selected so you can type over it!
var UNI_DEFAULT_TEXT = 'Text';
var uniSavedRange = null;
function uniFromHex() {
    const hexEl = document.getElementById('uni-hex');
    if (!hexEl) return;
    const parsed = uniParseHex(hexEl.value);
    if (!parsed) { uniRefresh(true); return; }
    const hsv = uniRgbToHsv(parsed.r, parsed.g, parsed.b);
    const setV = function (id, v) { const el = document.getElementById(id); if (el) el.value = v; };
    setV('insp-uni-h', Math.round(hsv.h));
    setV('insp-uni-s', Math.round(hsv.s * 100));
    setV('insp-uni-v', Math.round(hsv.v * 100));
    setV('insp-uni-a', Math.round(uniClamp(parsed.a, 0, 1) * 100));
    uniRefresh(true);
}
function uniPreviewText() {
    let t = '';
    try { if (uniSavedRange && !uniSavedRange.collapsed) t = uniSavedRange.toString().replace(/\s+/g, ' ').trim(); } catch (e) {}
    if (!t) return UNI_DEFAULT_TEXT;
    return t.length > 40 ? t.slice(0, 39) + '…' : t;
}
function uniOpenDialog() {
    const dlg = document.getElementById('unichip-dialog');
    if (!dlg) return;
    // Remember the selection BEFORE the dialog steals focus!
    uniSavedRange = null;
    try {
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        const sel = window.getSelection();
        if (cv && sel.rangeCount && cv.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            uniSavedRange = sel.getRangeAt(0).cloneRange();
        }
    } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
    uniRefresh(false);
}
function uniCloseDialog() {
    const dlg = document.getElementById('unichip-dialog');
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
function uniApplyStyle() {
    const live = uniRefresh(false);
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    const range = uniSavedRange;
    uniSavedRange = null;
    uniCloseDialog();
    if (!cv) return false;
    try { cv.focus(); } catch (e) {}
    const chip = document.createElement('span');
    chip.className = 'uni-chip';
    chip.setAttribute('spellcheck', 'false');
    chip.setAttribute('data-uni-color', live.hex8);
    chip.style.setProperty('--uni-accent', live.solid);
    const sel = window.getSelection();
    try {
        if (range && !range.collapsed && cv.contains(range.commonAncestorContainer)) {
            chip.appendChild(range.extractContents());
            range.insertNode(chip);
        } else {
            chip.textContent = UNI_DEFAULT_TEXT;
            let placed = false;
            if (range && cv.contains(range.startContainer)) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
            try { if (typeof fmtInsertNodeAtCaret === 'function') placed = !!fmtInsertNodeAtCaret(chip); } catch (e) { placed = false; }
            if (!placed) cv.appendChild(chip);
        }
        // Select the chip's text: type to replace it, or Backspace to delete it!
        const r = document.createRange();
        r.selectNodeContents(chip);
        sel.removeAllRanges();
        sel.addRange(r);
    } catch (e) { return false; }
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection(); } catch (e) {}
    try { if (typeof fmtRenderStyleList === 'function') fmtRenderStyleList(); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
    return true;
}
// Old chips were locked frames with an inner editable span: flatten them into
// plain styled text so they select, edit and delete like any other style!
function uniNormalizeChips(root) {
    try {
        const scope = root || document.getElementById('wysiwyg-canvas');
        if (!scope || !scope.querySelectorAll) return;
        scope.querySelectorAll('.uni-chip[contenteditable], .uni-chip .uni-chip-text').forEach(function (el) {
            if (el.classList.contains('uni-chip')) {
                el.removeAttribute('contenteditable');
                el.setAttribute('spellcheck', 'false');
                el.classList.remove('uni-selected');
            } else {
                while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
                el.parentNode.removeChild(el);
            }
        });
    } catch (e) {}
}
// Whole-chip selections: Chrome mangles them when you type! A triple-click
// selection runs into the NEXT line (so typing merges the lines and wipes every
// chip), and a fully-replaced chip leaves its look behind as junk <font><b>
// "typing style". Tidy the selection on the keypress, before Chrome acts!
var CHIP_STYLE_SEL = '.uni-chip, .cc-chip, .us-chip, .bbcss-chip';
var chipTypingDirty = false;
function chipEscapeHtml(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function chipSelKeydown(ev) {
    try {
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        if (!cv) return;
        const k = ev.key;
        const printable = !!k && k.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.isComposing;
        const del = k === 'Backspace' || k === 'Delete';
        if (!printable && !del && k !== 'Enter') return;
        const sel = window.getSelection();
        if (!sel.rangeCount || !cv.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
        if (sel.isCollapsed) {
            // First letter after we cleared chips: plain text, so the old chip look can't stick!
            if (chipTypingDirty && printable) {
                const n = sel.anchorNode;
                const e = n && (n.nodeType === 3 ? n.parentElement : n);
                if (!(e && e.closest && e.closest(CHIP_STYLE_SEL))) {
                    ev.preventDefault();
                    document.execCommand('insertHTML', false, chipEscapeHtml(k));
                }
            }
            chipTypingDirty = false;
            return;
        }
        const r = sel.getRangeAt(0);
        const nr = r.cloneRange();
        const blockOf = function (n) {
            let e = n.nodeType === 3 ? n.parentElement : n;
            while (e && e !== cv && !/^(DIV|P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE)$/.test(e.tagName)) e = e.parentElement;
            return e || cv;
        };
        // Triple-click overshoot (ends at the very start of the next line): keep the line break,
        // on every line, so typing never swallows the line below!
        const sb = blockOf(nr.startContainer), eb = blockOf(nr.endContainer);
        let atLineStart = false;
        if (sb !== cv && sb !== eb) {
            const lead = document.createRange();
            lead.setStart(eb, 0);
            lead.setEnd(nr.endContainer, nr.endOffset);
            atLineStart = lead.toString() === '';
        }
        if (atLineStart) {
            nr.setEnd(sb, sb.childNodes.length);
            sel.removeAllRanges();
            sel.addRange(nr);
        }
        const touches = Array.from(cv.querySelectorAll(CHIP_STYLE_SEL)).filter(function (c) { return nr.intersectsNode(c); });
        if (!touches.length) return;
        // Exactly one chip's text selected: select INSIDE it, so typing keeps the chip!
        const hit = touches.filter(function (c) { return nr.intersectsNode(c); });
        const one = hit.length === 1 && !!hit[0].textContent && nr.toString() === hit[0].textContent;
        if (one) nr.selectNodeContents(hit[0]);
        sel.removeAllRanges();
        sel.addRange(nr);
        if (one && printable) return;
        if (printable) {
            // Several chips (or chips + text): replace with clean text (still one undo step each)!
            ev.preventDefault();
            document.execCommand('delete');
            document.execCommand('insertHTML', false, chipEscapeHtml(k));
            chipTypingDirty = false;
            return;
        }
        chipTypingDirty = true;
    } catch (e) {}
}
// EMPTY STYLES STAY: deleting a style's last letter keeps the (now empty) style in place,
// with the caret inside, so typing goes right back into it! Only a Backspace on an already
// empty style removes it! An invisible U+200B placeholder holds the caret, and gets cleaned
// out as soon as real text arrives!
var EMPTY_STYLE_MARK = '​';
var EMPTY_STYLE_TAGS = 'b,strong,i,em,u,s,strike,code';
function emptyStyleSel() {
    let s = CHIP_STYLE_SEL + ', ' + EMPTY_STYLE_TAGS;
    try { if (typeof FMT_STYLE_SPAN_SEL === 'string') s += ', ' + FMT_STYLE_SPAN_SEL; } catch (e) {}
    try { if (typeof fmtMarketplaceSuffix === 'function') s += fmtMarketplaceSuffix(); } catch (e) {}
    return s;
}
function emptyStyleHost(node, cv) {
    const el = node && (node.nodeType === 3 ? node.parentElement : node);
    if (!el || !el.closest) return null;
    let s = null;
    try { s = el.closest(emptyStyleSel()); } catch (e) { s = el.closest(CHIP_STYLE_SEL); }
    return s && s !== cv && cv.contains(s) ? s : null;
}
function emptyStyleText(el) {
    return (el.textContent || '').replace(/​/g, '');
}
function emptyStyleCaretIn(el) {
    let t = el.lastChild;
    if (!t || t.nodeType !== 3) {
        t = document.createTextNode(EMPTY_STYLE_MARK);
        el.appendChild(t);
    }
    const r = document.createRange();
    r.setStart(t, t.length);
    r.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
}
// Swap a style's whole text for the placeholder, keeping the style itself!
function emptyStyleKeep(el) {
    const sel = window.getSelection();
    try {
        const r = document.createRange();
        r.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('insertText', false, EMPTY_STYLE_MARK);
    } catch (e) {}
    // The browser dropped or misplaced it? Do it by hand!
    if (!el.isConnected) return false;
    if (emptyStyleText(el) !== '' || (el.textContent || '').indexOf(EMPTY_STYLE_MARK) === -1) el.textContent = EMPTY_STYLE_MARK;
    el.setAttribute('data-empty-style', '1');
    emptyStyleCaretIn(el);
    return true;
}
function emptyStyleBeforeInput(ev) {
    try {
        const type = ev.inputType || '';
        if (type.indexOf('delete') !== 0 || ev.isComposing) return;
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        const sel = window.getSelection();
        if (!cv || !sel.rangeCount) return;
        const cur = sel.getRangeAt(0);
        if (!cv.contains(cur.commonAncestorContainer)) return;
        const backward = /Backward/.test(type);
        // What would this keypress delete?
        let target = null;
        try {
            const tr = ev.getTargetRanges ? ev.getTargetRanges() : [];
            if (tr && tr.length === 1) {
                target = document.createRange();
                target.setStart(tr[0].startContainer, tr[0].startOffset);
                target.setEnd(tr[0].endContainer, tr[0].endOffset);
            }
        } catch (e) { target = null; }
        if (!target) target = cur.cloneRange();
        // The style this deletion lives in (or the one style it exactly covers)!
        let host = emptyStyleHost(target.commonAncestorContainer, cv);
        if (!host && target.startContainer === target.endContainer && target.endOffset - target.startOffset === 1) {
            const n = target.startContainer.childNodes && target.startContainer.childNodes[target.startOffset];
            if (n && n.nodeType === 1 && n.matches && n.matches(emptyStyleSel()) && cv.contains(n)) host = n;
        }
        if (!host && sel.isCollapsed) {
            const at = emptyStyleHost(cur.startContainer, cv);
            if (at && emptyStyleText(at) === '') host = at;
        }
        if (!host) return;
        if (emptyStyleText(host) === '') {
            // Already empty: Backspace removes it, Delete hops over it and deletes what's next!
            ev.preventDefault();
            const r = document.createRange();
            r.setStartAfter(host);
            r.collapse(true);
            if (backward) {
                const parent = host.parentNode;
                const idx = Array.prototype.indexOf.call(parent.childNodes, host);
                host.remove();
                r.setStart(parent, Math.min(idx, parent.childNodes.length));
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
            } else {
                sel.removeAllRanges();
                sel.addRange(r);
                try { document.execCommand('forwardDelete'); } catch (e) {}
            }
            if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
            return;
        }
        // This deletion would wipe the style's whole text: empty it, but keep it!
        const gone = target.toString().replace(/​/g, '');
        if (!gone || gone !== emptyStyleText(host)) return;
        ev.preventDefault();
        emptyStyleKeep(host);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    } catch (e) {}
}
// Real text arrived in an emptied style: drop the placeholder, keep the caret where it was!
function emptyStyleInput() {
    try {
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        const sel = window.getSelection();
        if (!cv || !sel.rangeCount) return;
        const host = emptyStyleHost(sel.anchorNode, cv);
        if (!host || !host.hasAttribute('data-empty-style') || emptyStyleText(host) === '') return;
        const an = sel.anchorNode, ao = sel.anchorOffset;
        let newNode = an, newOff = ao;
        const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (t) {
            if (t.data.indexOf(EMPTY_STYLE_MARK) === -1) return;
            if (t === an) newOff = ao - (t.data.slice(0, ao).split(EMPTY_STYLE_MARK).length - 1);
            t.data = t.data.replace(/​/g, '');
        });
        host.removeAttribute('data-empty-style');
        if (newNode && newNode.nodeType === 3) {
            const r = document.createRange();
            r.setStart(newNode, Math.max(0, Math.min(newOff, newNode.length)));
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        }
    } catch (e) {}
}
// ==========================================
// UNDO / REDO HISTORY: Bitbook keeps its own snapshots of the note, so Cmd+Z ALWAYS brings
// back what was deleted (chips + styles included), even when a feature edited the page
// directly instead of going through the browser! Every edit lands here: typing fires
// 'input', and features call autoSaveCanvasContent() after they change things!
// ==========================================
var UNDO_MAX = 200;
var UNDO_MAX_CHARS = 30000000; // ~60 MB of snapshots: big notes with images keep fewer steps!
var undoStack = [];
var redoStack = [];
var undoCur = null;      // the note as it is right now: { html, sel }
var undoDoc = null;      // which pad/tab the history belongs to!
var undoLast = { kind: '', t: 0 };
var undoBusy = false;
var undoTaskOpen = false; // changes made during ONE keypress/click are ONE undo step!
function undoCanvas() {
    return (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
}
function undoDocKey() {
    let tab = '';
    try { if (typeof kdActiveTabId !== 'undefined') tab = String(kdActiveTabId); } catch (e) {}
    let pad = '';
    try { if (typeof currentActivePadId !== 'undefined') pad = String(currentActivePadId); } catch (e) {}
    return pad + ':' + tab;
}
// Selections are saved as child-index paths, so they survive an innerHTML swap!
function undoPath(cv, node) {
    const path = [];
    while (node && node !== cv) {
        const p = node.parentNode;
        if (!p) return null;
        path.unshift(Array.prototype.indexOf.call(p.childNodes, node));
        node = p;
    }
    return node === cv ? path : null;
}
function undoNode(cv, path) {
    let n = cv;
    for (let i = 0; i < path.length; i++) {
        if (!n.childNodes[path[i]]) return null;
        n = n.childNodes[path[i]];
    }
    return n;
}
function undoGetSel(cv) {
    try {
        const sel = window.getSelection();
        if (!sel.rangeCount || !cv.contains(sel.anchorNode)) return null;
        const a = undoPath(cv, sel.anchorNode), f = undoPath(cv, sel.focusNode);
        if (!a || !f) return null;
        return { a: a, ao: sel.anchorOffset, f: f, fo: sel.focusOffset };
    } catch (e) { return null; }
}
function undoSetSel(cv, s) {
    try {
        const sel = window.getSelection();
        if (!s) {
            const r = document.createRange();
            r.selectNodeContents(cv);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
            return;
        }
        const an = undoNode(cv, s.a), fn = undoNode(cv, s.f);
        if (!an || !fn) return undoSetSel(cv, null);
        const len = function (n) { return n.nodeType === 3 ? n.length : n.childNodes.length; };
        sel.setBaseAndExtent(an, Math.min(s.ao, len(an)), fn, Math.min(s.fo, len(fn)));
    } catch (e) {}
}
// Start (or restart) the history from whatever is on screen now: nothing to undo yet!
function undoBaseline() {
    const cv = undoCanvas();
    if (!cv) return;
    undoStack = [];
    redoStack = [];
    undoDoc = undoDocKey();
    undoCur = { html: cv.innerHTML, sel: undoGetSel(cv) };
    undoLast = { kind: '', t: 0 };
}
// Something changed: remember the previous version! Typing/deleting bursts merge into one step!
function undoRecord(kind) {
    if (undoBusy) return;
    const cv = undoCanvas();
    if (!cv) return;
    try { if (typeof isInitialBootSync !== 'undefined' && isInitialBootSync) return; } catch (e) {}
    if (undoCur === null || undoDoc !== undoDocKey()) { undoBaseline(); return; }
    const html = cv.innerHTML;
    if (html === undoCur.html) { undoCur.sel = undoGetSel(cv) || undoCur.sel; return; }
    const now = Date.now();
    const burst = (kind === 'type' || kind === 'delete') && kind === undoLast.kind && now - undoLast.t < 1000;
    const merge = undoStack.length > 0 && (undoTaskOpen || burst);
    if (!undoTaskOpen) {
        undoTaskOpen = true;
        setTimeout(function () { undoTaskOpen = false; }, 0);
    }
    if (!merge) {
        undoStack.push(undoCur);
        if (undoStack.length > UNDO_MAX) undoStack.shift();
        let total = html.length;
        for (let i = undoStack.length - 1; i >= 0; i--) {
            total += undoStack[i].html.length;
            if (total > UNDO_MAX_CHARS && i < undoStack.length - 1) { undoStack.splice(0, i + 1); break; }
        }
    }
    undoCur = { html: html, sel: undoGetSel(cv) };
    redoStack = [];
    undoLast = { kind: kind, t: now };
}
function undoApply(from, to) {
    const cv = undoCanvas();
    if (!cv) return false;
    // Catch any change that hasn't been recorded yet, so it can be undone too!
    undoRecord('cmd');
    if (!from.length) return false;
    to.push(undoCur);
    undoCur = from.pop();
    undoBusy = true;
    try {
        cv.innerHTML = undoCur.html;
        try { if (typeof kdHydrateInteractions === 'function') kdHydrateInteractions(); } catch (e) {}
        try { cv.focus({ preventScroll: true }); } catch (e) {}
        undoSetSel(cv, undoCur.sel);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        try { if (typeof kdRenderOutline === 'function') kdRenderOutline(); } catch (e) {}
    } finally {
        undoBusy = false;
    }
    undoLast = { kind: '', t: 0 };
    return true;
}
function bbUndo() { return undoApply(undoStack, redoStack); }
function bbRedo() { return undoApply(redoStack, undoStack); }
function undoInCanvas() {
    const cv = undoCanvas();
    if (!cv) return false;
    const ae = document.activeElement;
    if (ae && (ae === cv || cv.contains(ae))) return true;
    try {
        const sel = window.getSelection();
        return !!(sel.rangeCount && cv.contains(sel.anchorNode) && (!ae || ae === document.body));
    } catch (e) { return false; }
}
function undoWire() {
    if (undoWire._done) return;
    const cv = undoCanvas();
    if (!cv) return;
    undoWire._done = true;
    // Every feature saves after it edits: that's our cue to snapshot!
    try {
        const save = window.autoSaveCanvasContent;
        if (typeof save === 'function') {
            window.autoSaveCanvasContent = function () {
                const out = save.apply(this, arguments);
                undoRecord('cmd');
                return out;
            };
        }
    } catch (e) {}
    cv.addEventListener('input', function (ev) {
        const t = (ev && ev.inputType) || '';
        undoRecord(t === 'insertText' || t === 'insertCompositionText' ? 'type' : (t.indexOf('delete') === 0 ? 'delete' : 'cmd'));
    });
    // Before the first edit (or after switching notes), start a fresh history!
    const ready = function () { if (undoCur === null || undoDoc !== undoDocKey()) undoBaseline(); };
    cv.addEventListener('focusin', ready);
    cv.addEventListener('mousedown', ready, true);
    cv.addEventListener('keydown', ready, true);
    // Edit menu / Cmd+Z both arrive here: we handle them, so nothing is ever lost!
    cv.addEventListener('beforeinput', function (ev) {
        if (ev.inputType === 'historyUndo' || ev.inputType === 'historyRedo') {
            ev.preventDefault();
            if (ev.inputType === 'historyUndo') bbUndo(); else bbRedo();
        }
    }, true);
    document.addEventListener('keydown', function (ev) {
        if (!(ev.metaKey || ev.ctrlKey) || ev.altKey) return;
        const k = (ev.key || '').toLowerCase();
        const isUndo = k === 'z' && !ev.shiftKey;
        const isRedo = (k === 'z' && ev.shiftKey) || (k === 'y' && ev.ctrlKey && !ev.metaKey);
        if (!isUndo && !isRedo) return;
        if (!undoInCanvas()) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (isUndo) bbUndo(); else bbRedo();
    }, true);
    setTimeout(function () { if (undoCur === null) undoBaseline(); }, 0);
}
function chipWireSelectionFix() {
    if (chipWireSelectionFix._done) return;
    chipWireSelectionFix._done = true;
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!cv) return;
    cv.addEventListener('keydown', chipSelKeydown, true);
    cv.addEventListener('beforeinput', emptyStyleBeforeInput, true);
    cv.addEventListener('input', emptyStyleInput);
    undoWire();
    cv.addEventListener('mousedown', function () { chipTypingDirty = false; }, true);
}
// UNI-CHIP part 4: wire the Skills btn + dialog controls (the Format sidebar's style picker opens it too)!
function uniWireSkills() {
    if (uniWireSkills._done) return;
    uniWireSkills._done = true;
    chipWireSelectionFix();
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="unichip"]').forEach(function (item) {
            item.addEventListener('click', function () {
                // Open first, so the dialog grabs the selection before the menu closes!
                uniOpenDialog();
                try { closeSkillsMenu(); } catch (e) {}
            });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        try {
            const el = document.getElementById(id);
            if (el) el.addEventListener(ev, fn);
        } catch (e) {}
    };
    ['insp-uni-h', 'insp-uni-s', 'insp-uni-v', 'insp-uni-a'].forEach(function (id) {
        on(id, 'input', function () { uniRefresh(false); });
    });
    on('uni-hex', 'change', function () { uniFromHex(); });
    on('uni-hex', 'input', function () {
        const parsed = uniParseHex(document.getElementById('uni-hex').value);
        if (parsed) uniFromHex();
    });
    on('unichip-insert-btn', 'click', function () { uniApplyStyle(); });
    on('unichip-cancel-btn', 'click', function () { uniSavedRange = null; uniCloseDialog(); });
    on('unichip-close-btn', 'click', function () { uniSavedRange = null; uniCloseDialog(); });
    try {
        const dlg = document.getElementById('unichip-dialog');
        if (dlg) dlg.addEventListener('click', function (ev) {
            if (ev.target === dlg) { uniSavedRange = null; uniCloseDialog(); }
        });
    } catch (e) {}
    try {
        const cv = document.getElementById('wysiwyg-canvas');
        if (cv) {
            uniNormalizeChips(cv);
            if (typeof MutationObserver === 'function') {
                new MutationObserver(function () {
                    if (cv.querySelector('.uni-chip[contenteditable], .uni-chip .uni-chip-text')) uniNormalizeChips(cv);
                }).observe(cv, { childList: true, subtree: true });
            }
        }
    } catch (e) {}
}

// ==========================================
// BEEPBOX SONG part 1: lazy-load the synths! AbyssBox plays BeepBox, JummBox, GoldBox,
// UltraBox + AbyssBox songs; JukeBox songs ("J..." data) get JukeBox's own engine!
// ==========================================
// Both engines define a global "beepbox", so each one is grabbed right as it loads
// and window.beepbox always goes back to the AbyssBox engine (or nothing)!
var BB_ENGINES = {
    abyss: { src: 'abyssbox_synth.min.js?v=20261018', lib: null, promise: null },
    jukebox: { src: 'jukebox_synth.min.js?v=20261016', lib: null, promise: null }
};
function bbEngineFor(data) {
    return String(data || '').charAt(0) === 'J' ? 'jukebox' : 'abyss';
}
function bbLoadSynth(engine) {
    const eng = BB_ENGINES[engine || 'abyss'];
    if (eng.lib) return Promise.resolve(eng.lib);
    if (eng.promise) return eng.promise;
    eng.promise = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = eng.src;
        s.onload = function () {
            const lib = window.beepbox;
            if (BB_ENGINES.abyss.lib) window.beepbox = BB_ENGINES.abyss.lib;
            else if (eng !== BB_ENGINES.abyss) window.beepbox = undefined; // var globals can't be deleted!
            if (lib && lib.Synth && lib !== BB_ENGINES.abyss.lib) { eng.lib = lib; resolve(lib); }
            else { eng.promise = null; reject(new Error('synth missing')); }
        };
        s.onerror = function () { eng.promise = null; s.remove(); reject(new Error('synth load failed')); };
        document.head.appendChild(s);
    });
    return eng.promise;
}
// Full link, player link or bare song data -> song data candidates to try in order!
// Big songs can't be shortened, so they arrive as long editor/player links, often
// wrapped (<...>, (...), quotes), line-broken, %23-encoded or with %20 decoded to spaces.
function bbSongCandidates(raw) {
    let s = String(raw || '').trim();
    if (s.indexOf('#') === -1 && /%23/i.test(s)) {
        try { s = decodeURIComponent(s); } catch (e) {}
    }
    const hashAt = s.indexOf('#');
    if (hashAt !== -1) s = s.slice(hashAt + 1);
    else if (/^<?https?:\/\//i.test(s)) return [];
    s = s.replace(/[\r\n\t]+/g, '');
    // Player links: #song=<data>&loop=... (sample URLs inside the song may hold &!)
    if (/^[a-z]+=/.test(s)) {
        let song = '';
        s.split(/&(?=[a-z]+=)/g).forEach(function (param) {
            if (param.indexOf('song=') === 0) song = param.slice(5);
        });
        s = song;
    }
    const trimmed = s.replace(/[\s>)\]"'`]+$/, '');
    const out = [];
    [s, trimmed].forEach(function (c) {
        c = c.trim();
        [c.replace(/ /g, '%20'), c.replace(/ /g, '')].forEach(function (v) {
            if (v && out.indexOf(v) === -1) out.push(v);
        });
    });
    return out;
}
// First candidate the synth can read wins!
function bbParseFirst(bb, candidates) {
    let lastErr = new Error('empty');
    for (let i = 0; i < candidates.length; i++) {
        try { return { data: candidates[i], song: bbParseSong(bb, candidates[i]) }; } catch (e) { lastErr = e; }
    }
    throw lastErr;
}
function bbSizeLabel(chars) {
    return chars >= 1024 * 1024 ? (chars / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(chars / 1024)) + ' KB';
}
// Chunked: String.fromCharCode.apply on a whole big song blows the stack!
function bbBytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
}
function bbB64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}
function bbPipe(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (buf) {
        return new Uint8Array(buf);
    });
}
// Deflate the song for storage (2-3x smaller!), raw fallback on old browsers!
function bbPackSong(data) {
    if (typeof CompressionStream !== 'function') return Promise.resolve({ attr: 'data-bb-song', value: data });
    return bbPipe(new TextEncoder().encode(data), new CompressionStream('deflate-raw')).then(function (z) {
        const b64 = bbBytesToB64(z);
        return b64.length < data.length ? { attr: 'data-bb-z', value: b64 } : { attr: 'data-bb-song', value: data };
    }).catch(function () {
        return { attr: 'data-bb-song', value: data };
    });
}
function bbChipSongData(chip) {
    const z = chip.getAttribute('data-bb-z');
    if (!z) return Promise.resolve(chip.getAttribute('data-bb-song') || '');
    if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('no DecompressionStream'));
    return bbPipe(bbB64ToBytes(z), new DecompressionStream('deflate-raw')).then(function (bytes) {
        return new TextDecoder().decode(bytes);
    });
}
// Did the chip REALLY land in storage? (kdSaveTabs swallows quota errors!)
// tabsNeedle is the JSON-escaped form (tabs are stored as JSON), slotNeedle the raw HTML form!
function bbSaveAndVerify(tabsNeedle, slotNeedle) {
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) { return false; }
    try {
        if (typeof currentActivePadId !== 'undefined' && currentActivePadId === '3') return true;
        if (typeof KD_TABS_KEY !== 'undefined' && typeof kdTabs !== 'undefined' && kdTabs && kdTabs.length) {
            const tabs = localStorage.getItem(KD_TABS_KEY);
            return !!tabs && tabs.indexOf(tabsNeedle) !== -1;
        }
        const slot = localStorage.getItem('bitbook_save_slot_' + currentActivePadId);
        return !!slot && slot.indexOf(slotNeedle) !== -1;
    } catch (e) { return false; }
}
// UltraBox/GoldBox songs list sample packs after a "|" (built-in packs, or custom sample URLs)!
// Bitbook doesn't ship those sample files, so the instruments that use them play silently.
function bbSamplePacks(data) {
    const parts = String(data || '').replace(/%7C/gi, '|').split('|').slice(1);
    const names = { legacysamples: 'Legacy', nintariboxsamples: 'Nintaribox', mariopaintboxsamples: 'Mario Paintbox' };
    const out = [];
    parts.forEach(function (p) {
        const k = p.trim().toLowerCase();
        if (!k) return;
        const label = names[k] || 'custom samples';
        if (out.indexOf(label) === -1) out.push(label);
    });
    return out;
}
function bbVariantName(data) {
    const c = data.charAt(0);
    if (c === 'a') return 'AbyssBox';
    if (c === 'u') return 'UltraBox';
    if (c === 'j') return 'JummBox';
    if (c === 'g') return 'GoldBox';
    if (c === 'J') return 'JukeBox';
    return 'BeepBox';
}
// Throws on anything the synth can't read (bad versions leave zero channels)!
function bbParseSong(bb, data) {
    if (!data) throw new Error('empty');
    const song = new bb.Song(data);
    if (!song.channels || !song.channels.length) throw new Error('unreadable');
    return song;
}

// BEEPBOX SONG part 2: one shared player, one song at a time!
var bbSynths = {};    // one player per engine
var bbSynth = null;   // the player in use right now
var bbOwner = null;   // the chip (or the dialog Preview btn) that's playing
var bbPlayToken = 0;  // drops stale clicks that land while the synth loads
function bbSetOwnerState(owner, playing) {
    if (!owner) return;
    try {
        if (owner.classList.contains('bb-chip')) owner.classList.toggle('bb-playing', playing);
        else owner.textContent = playing ? 'Stop preview' : 'Preview';
    } catch (e) {}
}
function bbStop() {
    bbPlayToken++;
    Object.keys(bbSynths).forEach(function (k) {
        try { bbSynths[k].pause(); bbSynths[k].snapToStart(); } catch (e) {}
    });
    const was = bbOwner;
    bbOwner = null;
    bbSetOwnerState(was, false);
}
function bbPlay(data, owner) {
    bbStop();
    const token = ++bbPlayToken;
    bbOwner = owner;
    bbSetOwnerState(owner, true);
    // data may be a promise (compressed chips unpack while the synth loads)!
    return Promise.resolve(data).then(function (d) {
        return bbLoadSynth(bbEngineFor(d)).then(function (bb) { return [bb, d]; });
    }).then(function (both) {
        const bb = both[0];
        data = both[1];
        if (token !== bbPlayToken) return;
        bbParseSong(bb, data);
        const engine = bbEngineFor(data);
        if (!bbSynths[engine]) bbSynths[engine] = new bb.Synth(data);
        else bbSynths[engine].setSong(data);
        bbSynth = bbSynths[engine];
        bbSynth.snapToStart();
        bbSynth.play();
    }).catch(function (err) {
        if (token === bbPlayToken) bbStop();
        throw err;
    });
}
function bbToggleChip(chip) {
    if (bbOwner === chip) { bbStop(); return; }
    bbPlay(bbChipSongData(chip), chip).catch(function () {
        try { chip.classList.add('bb-error'); setTimeout(function () { chip.classList.remove('bb-error'); }, 1200); } catch (e) {}
    });
}
// Playing chip deleted / tab swapped? Stop! Saved-while-playing chips? Un-glow!
function bbSweepChips() {
    if (bbOwner && bbOwner.classList && bbOwner.classList.contains('bb-chip') && !bbOwner.isConnected) bbStop();
    try {
        document.querySelectorAll('#wysiwyg-canvas .bb-chip.bb-playing').forEach(function (c) {
            if (c !== bbOwner) c.classList.remove('bb-playing');
        });
    } catch (e) {}
}

// BEEPBOX SONG part 3: dialog: paste link, validate live, preview, insert!
var bbDialogData = '';
var bbLabelTouched = false;
var bbSavedRange = null;
var bbValidateTimer = null;
function bbSetStatus(msg, kind) {
    const el = document.getElementById('bb-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'bb-status' + (kind ? ' bb-status-' + kind : '');
}
function bbSetDialogReady(ready) {
    ['beepbox-preview-btn', 'beepbox-insert-btn'].forEach(function (id) {
        const b = document.getElementById(id);
        if (b) b.disabled = !ready;
    });
}
function bbValidateLink() {
    const linkEl = document.getElementById('bb-link');
    const raw = linkEl ? linkEl.value : '';
    if (bbOwner && bbOwner.id === 'beepbox-preview-btn') bbStop();
    bbDialogData = '';
    bbSetDialogReady(false);
    if (!raw.trim()) { bbSetStatus('Paste a BeepBox, UltraBox, AbyssBox, JummBox, GoldBox or JukeBox song link!'); return; }
    // Sites shorten long links on screen with an ellipsis, and copying that text cuts the song!
    if (/(…|\.\.\.)[\s>)\]"'`]*$/.test(raw.trim())) {
        bbSetStatus('That link looks cut off (it ends with …)! Copy the full link from the address bar or the song\'s copy/share button.', 'error');
        return;
    }
    const candidates = bbSongCandidates(raw);
    if (!candidates.length) {
        bbSetStatus('No song data in that link! Short links won\'t work: open them, then copy the full link with the # part.', 'error');
        return;
    }
    const engine = bbEngineFor(candidates[0]);
    bbSetStatus('Reading song...' + (candidates[0].length > 20000 ? ' (' + bbSizeLabel(candidates[0].length) + ', big one!)' : '') +
        (engine === 'jukebox' && !BB_ENGINES.jukebox.lib ? ' Loading the JukeBox engine (3.4 MB, just this once)!' : ''));
    bbLoadSynth(engine).then(function (bb) {
        if ((document.getElementById('bb-link') || {}).value !== raw) return;
        let hit;
        try { hit = bbParseFirst(bb, candidates); } catch (e) {
            bbSetStatus('Couldn\'t read that song (' + bbSizeLabel(candidates[0].length) + ')! Is the whole song link there? Details: ' + String((e && e.message) || e).slice(0, 120), 'error');
            return;
        }
        const data = hit.data, song = hit.song;
        bbDialogData = data;
        const title = (song.title && song.title !== 'Untitled') ? song.title : '';
        const packs = bbSamplePacks(data);
        bbSetStatus('Got it! ' + (title ? '"' + title + '" · ' : '') + bbVariantName(data) + ' song · ' + song.channels.length + ' channels · ' + song.tempo + ' bpm · ' + song.barCount + ' bars · ' + bbSizeLabel(data.length) +
            (packs.length ? ' · Heads up: it uses ' + packs.join(' + ') + ' samples, which Bitbook can\'t load, so those instruments will be silent!' : ''), packs.length ? 'warn' : 'ok');
        if (!bbLabelTouched) {
            const lbl = document.getElementById('bb-label');
            if (lbl) lbl.value = (title || 'BeepBox Song').slice(0, 60);
            bbRenderStyleGrid();
        }
        bbSetDialogReady(true);
    }).catch(function () {
        bbSetStatus('Couldn\'t load the music engine! Check your connection and try again.', 'error');
    });
}
// Live mini chips (with your label) for each style!
function bbRenderStyleGrid() {
    const grid = document.getElementById('bb-style-grid');
    if (!grid) return;
    const lblEl = document.getElementById('bb-label');
    const label = (lblEl && lblEl.value.trim()) || 'BeepBox Song';
    if (!grid.children.length) {
        BB_STYLES.forEach(function (st) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bb-style-btn';
            b.setAttribute('data-bb-style', st.id);
            const chip = document.createElement('span');
            chip.className = 'bb-chip' + bbStyleClass(st.id);
            const icon = document.createElement('span');
            icon.className = 'bb-chip-icon';
            const text = document.createElement('span');
            text.className = 'bb-chip-text';
            chip.appendChild(icon);
            chip.appendChild(text);
            const nm = document.createElement('span');
            nm.className = 'bb-style-name';
            nm.textContent = st.name;
            b.appendChild(chip);
            b.appendChild(nm);
            grid.appendChild(b);
        });
    }
    grid.querySelectorAll('[data-bb-style]').forEach(function (b) {
        const on = b.getAttribute('data-bb-style') === bbChipStyle;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        const t = b.querySelector('.bb-chip-text');
        if (t) t.textContent = label;
    });
}
function bbOpenDialog() {
    try { closeSkillsMenu(); } catch (e) {}
    const dlg = document.getElementById('beepbox-dialog');
    if (!dlg) return;
    // Remember the caret so the chip lands where you were typing!
    bbSavedRange = null;
    try {
        const sel = window.getSelection();
        const cv = document.getElementById('wysiwyg-canvas');
        if (sel.rangeCount && cv && cv.contains(sel.anchorNode)) bbSavedRange = sel.getRangeAt(0).cloneRange();
    } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    const linkEl = document.getElementById('bb-link');
    const lbl = document.getElementById('bb-label');
    if (linkEl) linkEl.value = '';
    if (lbl) lbl.value = 'BeepBox Song';
    bbLabelTouched = false;
    bbRenderStyleGrid();
    bbValidateLink();
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
    try { if (linkEl) linkEl.focus(); } catch (e) {}
    // Warm the engine up while the user pastes!
    bbLoadSynth().catch(function () {});
}
function bbCloseDialog() {
    if (bbOwner && bbOwner.id === 'beepbox-preview-btn') bbStop();
    const dlg = document.getElementById('beepbox-dialog');
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
// Player chip looks: pick one in the dialog before inserting!
var BB_STYLES = [
    { id: 'cartridge', name: 'Cartridge' },
    { id: 'cassette', name: 'Cassette' },
    { id: 'vinyl', name: 'Vinyl' },
    { id: 'synth', name: 'Synthwave' },
    { id: 'aqua', name: 'Aqua Gel' },
    { id: 'piano', name: 'Piano' },
    { id: 'musicbox', name: 'Music Box' },
    { id: 'minimal', name: 'Minimal' }
];
var BB_STYLE_KEY = 'bitbook_bb_chip_style';
var bbChipStyle = 'cartridge';
try {
    const st = localStorage.getItem(BB_STYLE_KEY);
    if (st && BB_STYLES.some(function (x) { return x.id === st; })) bbChipStyle = st;
} catch (e) {}
function bbStyleClass(style) {
    return (style && style !== 'cartridge') ? ' bb-st-' + style : '';
}
function bbBuildChip(packed, label, style) {
    const chip = document.createElement('span');
    chip.className = 'bb-chip' + bbStyleClass(style);
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute(packed.attr, packed.value);
    // Unique per chip, so the save check can't be fooled by a twin song!
    chip.setAttribute('data-bb-id', Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    chip.setAttribute('title', 'Click to play / stop');
    const icon = document.createElement('span');
    icon.className = 'bb-chip-icon';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'bb-chip-text';
    text.textContent = label;
    chip.appendChild(icon);
    chip.appendChild(text);
    return chip;
}
var bbInserting = false;
function bbInsertChip() {
    if (!bbDialogData || bbInserting) return;
    bbInserting = true;
    bbSetDialogReady(false);
    bbSetStatus('Packing song...');
    bbPackSong(bbDialogData).then(function (packed) {
        bbInserting = false;
        bbPlaceChip(packed);
    }, function () {
        bbInserting = false;
        bbSetDialogReady(true);
    });
}
// Storage full? Pull the chip back out + reopen the dialog with the link intact!
function bbInsertFailed(chip, msg) {
    try {
        const sp = chip.nextSibling;
        if (sp && sp.nodeType === 3 && sp.nodeValue === ' ') sp.remove();
        chip.remove();
    } catch (e) {}
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    const dlg = document.getElementById('beepbox-dialog');
    try { if (dlg && !dlg.open) dlg.showModal(); } catch (e) {}
    bbSetStatus(msg, 'error');
    bbSetDialogReady(true);
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(300, 0.12); } catch (e) {}
}
function bbPlaceChip(packed) {
    const lblEl = document.getElementById('bb-label');
    const label = (lblEl && lblEl.value.trim()) || 'BeepBox Song';
    const chip = bbBuildChip(packed, label, bbChipStyle);
    try { localStorage.setItem(BB_STYLE_KEY, bbChipStyle); } catch (e) {}
    bbCloseDialog();
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!cv) return;
    try { cv.focus(); } catch (e) {}
    try {
        if (bbSavedRange && cv.contains(bbSavedRange.startContainer)) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(bbSavedRange);
        }
    } catch (e) {}
    let placed = false;
    try { if (typeof fmtInsertNodeAtCaret === 'function') placed = !!fmtInsertNodeAtCaret(chip); } catch (e) { placed = false; }
    // fmtInsertNodeAtCaret says false when the SAVE throws, after the chip is already in!
    if (!placed && chip.isConnected) placed = true;
    if (!placed) {
        try { cv.appendChild(chip); placed = true; } catch (e) {}
    }
    if (placed) {
        try {
            const sp = document.createTextNode(' ');
            chip.parentNode.insertBefore(sp, chip.nextSibling);
            const caret = document.createRange();
            caret.setStart(sp, 1);
            caret.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(caret);
        } catch (e) {}
        if (!bbSaveAndVerify('data-bb-id=\\"' + chip.getAttribute('data-bb-id') + '\\"', 'data-bb-id="' + chip.getAttribute('data-bb-id') + '"')) {
            bbInsertFailed(chip, 'Bitbook\'s storage is full (browsers allow about 5 MB), so this ' + bbSizeLabel(bbDialogData.length) + ' song didn\'t fit! Remove some big chips or notes, then try again.');
            return;
        }
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
    }
}

// BEEPBOX SONG part 4: wire Skills btn, dialog, chip clicks + sweeper!
function bbWireSkills() {
    if (bbWireSkills._done) return;
    bbWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="beepbox"]').forEach(function (item) {
            item.addEventListener('click', function () { bbOpenDialog(); });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        try {
            const el = document.getElementById(id);
            if (el) el.addEventListener(ev, fn);
        } catch (e) {}
    };
    on('bb-link', 'input', function () {
        clearTimeout(bbValidateTimer);
        bbValidateTimer = setTimeout(bbValidateLink, 200);
    });
    on('bb-label', 'input', function () { bbLabelTouched = true; bbRenderStyleGrid(); });
    on('bb-style-grid', 'click', function (ev) {
        const b = ev.target.closest ? ev.target.closest('[data-bb-style]') : null;
        if (!b) return;
        bbChipStyle = b.getAttribute('data-bb-style');
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.05); } catch (e) {}
        bbRenderStyleGrid();
    });
    on('bb-label', 'keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); bbInsertChip(); } });
    on('beepbox-preview-btn', 'click', function () {
        const btn = document.getElementById('beepbox-preview-btn');
        if (bbOwner === btn) { bbStop(); return; }
        if (!bbDialogData) return;
        bbPlay(bbDialogData, btn).catch(function () {
            bbSetStatus('Couldn\'t play that song!', 'error');
        });
    });
    on('beepbox-insert-btn', 'click', function () { bbInsertChip(); });
    on('beepbox-cancel-btn', 'click', function () { bbCloseDialog(); });
    on('beepbox-close-btn', 'click', function () { bbCloseDialog(); });
    try {
        const dlg = document.getElementById('beepbox-dialog');
        if (dlg) {
            dlg.addEventListener('click', function (ev) { if (ev.target === dlg) bbCloseDialog(); });
            // Esc closes natively; stop the preview with it!
            dlg.addEventListener('close', function () {
                if (bbOwner && bbOwner.id === 'beepbox-preview-btn') bbStop();
            });
        }
    } catch (e) {}
    const cv = document.getElementById('wysiwyg-canvas');
    if (!cv) return;
    // Press the chip to play, press again to stop!
    cv.addEventListener('mousedown', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest('.bb-chip') : null;
        if (chip) ev.preventDefault();
    });
    cv.addEventListener('click', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest('.bb-chip') : null;
        if (!chip) return;
        ev.preventDefault();
        bbToggleChip(chip);
    });
    try {
        new MutationObserver(bbSweepChips).observe(cv, { childList: true, subtree: true });
    } catch (e) {}
    bbSweepChips();
}

// ==========================================
// PIXEL SPRITE part 1: a 16x16 grid, one hex digit per cell ('.' = clear)!
// ==========================================
var PX_SIZE = 16;
var PX_PALETTE = ['#111111', '#4b5563', '#9ca3af', '#ffffff', '#ef4444', '#f97316', '#facc15', '#84cc16',
    '#16a34a', '#14b8a6', '#38bdf8', '#2563eb', '#9333ea', '#ec4899', '#92400e', '#fcd9b6'];
var PX_CELL = 20;
var pxCells = [];
var pxColor = 0;
var pxTool = 'pen';
var pxDisplay = 'm';
var pxEditing = null;
var pxSavedRange = null;
var pxDrawing = false;
function pxBlank() {
    const a = [];
    for (let i = 0; i < PX_SIZE * PX_SIZE; i++) a.push(-1);
    return a;
}
function pxEncode(cells) {
    return cells.map(function (c) { return c < 0 ? '.' : c.toString(16); }).join('');
}
function pxDecode(str) {
    const a = pxBlank();
    if (typeof str !== 'string') return a;
    for (let i = 0; i < a.length && i < str.length; i++) {
        const v = parseInt(str[i], 16);
        a[i] = isNaN(v) ? -1 : v;
    }
    return a;
}
// Real-size PNG for the chip (CSS scales it up crisp)!
function pxToDataUrl(cells) {
    const c = document.createElement('canvas');
    c.width = PX_SIZE; c.height = PX_SIZE;
    const g = c.getContext('2d');
    cells.forEach(function (v, i) {
        if (v < 0) return;
        g.fillStyle = PX_PALETTE[v] || '#000000';
        g.fillRect(i % PX_SIZE, Math.floor(i / PX_SIZE), 1, 1);
    });
    return c.toDataURL('image/png');
}
function pxIsEmpty(cells) {
    return cells.every(function (v) { return v < 0; });
}
// PIXEL SPRITE part 2: the editor canvas!
function pxDrawEditor() {
    const cv = document.getElementById('px-canvas');
    if (!cv) return;
    const g = cv.getContext('2d');
    const n = PX_SIZE, s = PX_CELL;
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            const v = pxCells[y * n + x];
            if (v < 0) {
                // Checkerboard = clear!
                g.fillStyle = '#ffffff'; g.fillRect(x * s, y * s, s, s);
                g.fillStyle = '#e9e3f5';
                g.fillRect(x * s, y * s, s / 2, s / 2);
                g.fillRect(x * s + s / 2, y * s + s / 2, s / 2, s / 2);
            } else {
                g.fillStyle = PX_PALETTE[v]; g.fillRect(x * s, y * s, s, s);
            }
        }
    }
    g.strokeStyle = 'rgba(88,28,135,0.16)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < n; i++) {
        g.moveTo(i * s + 0.5, 0); g.lineTo(i * s + 0.5, n * s);
        g.moveTo(0, i * s + 0.5); g.lineTo(n * s, i * s + 0.5);
    }
    g.stroke();
    // Centre guides help symmetry!
    g.strokeStyle = 'rgba(147,51,234,0.45)';
    g.beginPath();
    g.moveTo(n / 2 * s + 0.5, 0); g.lineTo(n / 2 * s + 0.5, n * s);
    g.moveTo(0, n / 2 * s + 0.5); g.lineTo(n * s, n / 2 * s + 0.5);
    g.stroke();
    const prev = document.getElementById('px-preview');
    if (prev) prev.src = pxToDataUrl(pxCells);
    const ins = document.getElementById('px-insert-btn');
    if (ins) ins.disabled = pxIsEmpty(pxCells);
}
function pxCellAt(ev) {
    const cv = document.getElementById('px-canvas');
    const r = cv.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) / r.width * PX_SIZE);
    const y = Math.floor((ev.clientY - r.top) / r.height * PX_SIZE);
    if (x < 0 || y < 0 || x >= PX_SIZE || y >= PX_SIZE) return -1;
    return y * PX_SIZE + x;
}
function pxFill(start, color) {
    const from = pxCells[start];
    if (from === color) return;
    const stack = [start];
    while (stack.length) {
        const i = stack.pop();
        if (pxCells[i] !== from) continue;
        pxCells[i] = color;
        const x = i % PX_SIZE, y = Math.floor(i / PX_SIZE);
        if (x > 0) stack.push(i - 1);
        if (x < PX_SIZE - 1) stack.push(i + 1);
        if (y > 0) stack.push(i - PX_SIZE);
        if (y < PX_SIZE - 1) stack.push(i + PX_SIZE);
    }
}
// Line tool: snapshot on press, redraw the preview from it on every move!
var pxLineStart = -1;
var pxLineBase = null;
var pxLineErase = false;
function pxCellAtClamped(ev) {
    const cv = document.getElementById('px-canvas');
    const r = cv.getBoundingClientRect();
    const x = uniClamp(Math.floor((ev.clientX - r.left) / r.width * PX_SIZE), 0, PX_SIZE - 1);
    const y = uniClamp(Math.floor((ev.clientY - r.top) / r.height * PX_SIZE), 0, PX_SIZE - 1);
    return y * PX_SIZE + x;
}
function pxLineTo(end, snap) {
    if (pxLineStart < 0 || !pxLineBase) return;
    const x0 = pxLineStart % PX_SIZE, y0 = Math.floor(pxLineStart / PX_SIZE);
    let x1 = end % PX_SIZE, y1 = Math.floor(end / PX_SIZE);
    // Shift: snap to horizontal, vertical or 45 degrees!
    if (snap) {
        const dx = x1 - x0, dy = y1 - y0, adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx > ady * 2) y1 = y0;
        else if (ady > adx * 2) x1 = x0;
        else {
            const d = Math.min(Math.max(adx, ady), Math.min(dx >= 0 ? PX_SIZE - 1 - x0 : x0, dy >= 0 ? PX_SIZE - 1 - y0 : y0));
            x1 = x0 + (dx >= 0 ? d : -d);
            y1 = y0 + (dy >= 0 ? d : -d);
        }
    }
    pxCells = pxLineBase.slice();
    const color = pxLineErase ? -1 : pxColor;
    // Bresenham: every pixel on the way, no gaps!
    let x = x0, y = y0;
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    const ddx = Math.abs(x1 - x0), ddy = -Math.abs(y1 - y0);
    let err = ddx + ddy;
    for (;;) {
        pxCells[y * PX_SIZE + x] = color;
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 >= ddy) { err += ddy; x += sx; }
        if (e2 <= ddx) { err += ddx; y += sy; }
    }
    pxDrawEditor();
}
function pxPaint(ev, erase) {
    const i = pxCellAt(ev);
    if (i < 0) return;
    const color = (erase || pxTool === 'erase') ? -1 : pxColor;
    if (pxTool === 'fill' && !erase) pxFill(i, color);
    else pxCells[i] = color;
    pxDrawEditor();
}
function pxRenderPalette() {
    const pal = document.getElementById('px-palette');
    if (!pal) return;
    pal.innerHTML = '';
    PX_PALETTE.forEach(function (hex, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'px-swatch' + (i === pxColor ? ' active' : '');
        b.style.background = hex;
        b.title = hex;
        b.setAttribute('data-px-color', String(i));
        pal.appendChild(b);
    });
}
function pxSetTool(tool) {
    pxTool = tool;
    document.querySelectorAll('#sprite-dialog [data-px-tool]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-px-tool') === tool);
    });
}
function pxSetDisplay(size) {
    pxDisplay = (size === 's' || size === 'l') ? size : 'm';
    document.querySelectorAll('#sprite-dialog [data-px-display]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-px-display') === pxDisplay);
    });
}
// PIXEL SPRITE part 3: open (new or edit), insert/save, wire!
function pxOpenDialog(chip) {
    const dlg = document.getElementById('sprite-dialog');
    if (!dlg) return;
    pxEditing = chip || null;
    pxSavedRange = null;
    if (!chip) {
        try {
            const sel = window.getSelection();
            const cv = document.getElementById('wysiwyg-canvas');
            if (sel.rangeCount && cv && cv.contains(sel.anchorNode)) pxSavedRange = sel.getRangeAt(0).cloneRange();
        } catch (e) {}
    }
    pxCells = chip ? pxDecode(chip.getAttribute('data-px')) : pxBlank();
    pxSetTool('pen');
    pxSetDisplay(chip ? (chip.getAttribute('data-px-size') || 'm') : pxDisplay);
    pxRenderPalette();
    const ttl = document.getElementById('sprite-title');
    if (ttl) ttl.textContent = chip ? 'Edit Pixel Sprite' : 'Pixel Sprite';
    const ins = document.getElementById('px-insert-btn');
    if (ins) ins.textContent = chip ? 'Save sprite!' : 'Insert sprite!';
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
    pxDrawEditor();
}
function pxCloseDialog() {
    pxDrawing = false;
    const dlg = document.getElementById('sprite-dialog');
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
function pxFillChip(chip) {
    chip.className = 'px-chip px-' + pxDisplay;
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-px', pxEncode(pxCells));
    chip.setAttribute('data-px-size', pxDisplay);
    chip.title = 'Pixel sprite: click to edit!';
    chip.innerHTML = '';
    const img = document.createElement('img');
    img.src = pxToDataUrl(pxCells);
    img.alt = 'Pixel sprite';
    img.setAttribute('draggable', 'false');
    chip.appendChild(img);
}
function pxInsertSprite() {
    if (pxIsEmpty(pxCells)) return;
    const editing = pxEditing;
    pxCloseDialog();
    if (editing && editing.isConnected) {
        pxFillChip(editing);
        // Hand the caret back, just after the sprite!
        try {
            const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
            if (cv) cv.focus();
            const r = document.createRange();
            r.setStartAfter(editing);
            r.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (e) {}
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
        return;
    }
    const chip = document.createElement('span');
    pxFillChip(chip);
    skInsertChipAt(chip, pxSavedRange);
}
// Shared by the new skills: drop a chip at the saved caret, then a space after it!
function skInsertChipAt(chip, savedRange) {
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!cv) return false;
    try { cv.focus(); } catch (e) {}
    try {
        if (savedRange && cv.contains(savedRange.startContainer)) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
        }
    } catch (e) {}
    let placed = false;
    try { if (typeof fmtInsertNodeAtCaret === 'function') placed = !!fmtInsertNodeAtCaret(chip); } catch (e) { placed = false; }
    if (!placed && chip.isConnected) placed = true;
    if (!placed) {
        try { cv.appendChild(chip); placed = true; } catch (e) {}
    }
    if (!placed) return false;
    try {
        const sp = document.createTextNode(' ');
        chip.parentNode.insertBefore(sp, chip.nextSibling);
        const caret = document.createRange();
        caret.setStart(sp, 1);
        caret.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(caret);
    } catch (e) {}
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
    return true;
}
function pxWireSkills() {
    if (pxWireSkills._done) return;
    pxWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="sprite"]').forEach(function (item) {
            item.addEventListener('click', function () {
                pxOpenDialog(null);
                try { closeSkillsMenu(); } catch (e) {}
            });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        try {
            const el = document.getElementById(id);
            if (el) el.addEventListener(ev, fn);
        } catch (e) {}
    };
    const pc = document.getElementById('px-canvas');
    if (pc) {
        pc.width = PX_SIZE * PX_CELL;
        pc.height = PX_SIZE * PX_CELL;
        pc.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
        pc.addEventListener('pointerdown', function (ev) {
            ev.preventDefault();
            if (pxTool === 'line') {
                const i = pxCellAt(ev);
                if (i < 0) return;
                try { pc.setPointerCapture(ev.pointerId); } catch (e) {}
                pxLineStart = i;
                pxLineBase = pxCells.slice();
                pxLineErase = ev.button === 2;
                pxDrawing = 'line';
                pxLineTo(i, false);
                return;
            }
            pxDrawing = pxTool !== 'fill';
            try { pc.setPointerCapture(ev.pointerId); } catch (e) {}
            pxPaint(ev, ev.button === 2);
            pxDrawing = pxDrawing ? (ev.button === 2 ? 'erase' : 'paint') : false;
        });
        pc.addEventListener('pointermove', function (ev) {
            if (!pxDrawing) return;
            if (pxDrawing === 'line') { pxLineTo(pxCellAtClamped(ev), ev.shiftKey); return; }
            pxPaint(ev, pxDrawing === 'erase');
        });
        const stop = function () {
            pxDrawing = false;
            pxLineStart = -1;
            pxLineBase = null;
        };
        pc.addEventListener('pointerup', stop);
        pc.addEventListener('pointercancel', stop);
    }
    on('px-palette', 'click', function (ev) {
        const b = ev.target.closest ? ev.target.closest('[data-px-color]') : null;
        if (!b) return;
        pxColor = parseInt(b.getAttribute('data-px-color'), 10) || 0;
        if (pxTool === 'erase') pxSetTool('pen');
        pxRenderPalette();
    });
    document.querySelectorAll('#sprite-dialog [data-px-tool]').forEach(function (b) {
        b.addEventListener('click', function () { pxSetTool(b.getAttribute('data-px-tool')); });
    });
    document.querySelectorAll('#sprite-dialog [data-px-display]').forEach(function (b) {
        b.addEventListener('click', function () { pxSetDisplay(b.getAttribute('data-px-display')); });
    });
    on('px-clear-btn', 'click', function () { pxCells = pxBlank(); pxDrawEditor(); });
    on('px-insert-btn', 'click', function () { pxInsertSprite(); });
    on('px-cancel-btn', 'click', function () { pxCloseDialog(); });
    on('px-close-btn', 'click', function () { pxCloseDialog(); });
    try {
        const dlg = document.getElementById('sprite-dialog');
        if (dlg) dlg.addEventListener('click', function (ev) { if (ev.target === dlg) pxCloseDialog(); });
    } catch (e) {}
    const cv = document.getElementById('wysiwyg-canvas');
    if (!cv) return;
    // Click a sprite to redraw it!
    cv.addEventListener('mousedown', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest('.px-chip') : null;
        if (chip) ev.preventDefault();
    });
    cv.addEventListener('click', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest('.px-chip') : null;
        if (!chip) return;
        ev.preventDefault();
        pxOpenDialog(chip);
    });
}

// ==========================================
// CUSTOM CHIP part 1: 50 styles, all painted from ONE color you pick!
// Like the Uni-Chip, it's a style: selected text gets wrapped, a bare caret
// gets a pre-selected "Text" chip!
// ==========================================
var CC_STYLES = ['Solid Pill', 'Soft Tint', 'Outline', 'Dashed', 'Dotted', 'Double Ring', 'Gradient Fade', 'Glossy Gel',
    'Neon Glow', 'Neon Outline', 'Underline Bar', 'Highlighter', 'Left Stripe', 'Tag Notch', 'Ribbon', 'Arrow',
    'Hexagon', 'Pixel Block', 'Retro Offset', 'Brutalist', 'Stamp', 'Sticker', 'Embossed', 'Pressed',
    'Glass', 'Aero Shine', 'Candy Stripe', 'Wavy Underline', 'Polka Dots', 'Grid Paper', 'Scanlines', 'Bevel 3D',
    'Keycap', 'Two-Tone', 'Ticket', 'Speech Bubble', 'Hand-Drawn', 'Sketch', 'Leaf', 'Brackets',
    'Terminal', 'Hashtag', 'Corner Fold', 'Shadow Lift', 'Inner Glow', 'Metallic', 'Iridescent', 'Pop Text',
    'Outline Text', 'Chalkboard'];
var CC_PREF_KEY = 'bitbook_custom_chip_pref';
var ccStyle = 1;
var ccSavedRange = null;
var ccStartHex = null;
// A typed hex stays exact (the sliders round it); moving a slider clears it!
var ccExactHex = null;
try {
    const pref = JSON.parse(localStorage.getItem(CC_PREF_KEY) || 'null');
    if (pref && pref.style >= 1 && pref.style <= CC_STYLES.length) ccStyle = pref.style;
    if (pref && pref.hex) ccStartHex = pref.hex;
} catch (e) {}
function ccReadHSV() {
    const g = function (id, fb) {
        const el = document.getElementById(id);
        const v = el ? parseFloat(el.value) : fb;
        return isFinite(v) ? v : fb;
    };
    return { h: g('cc-h', 200), s: g('cc-s', 75), v: g('cc-v', 85) };
}
// White ink on dark colors, deep ink on light ones, so every style stays readable!
function ccInkFor(rgb) {
    const lin = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
    return L > 0.4 ? '#1f1f29' : '#ffffff';
}
function ccPaintSliders(h, s, v) {
    const hEl = document.getElementById('cc-h');
    const sEl = document.getElementById('cc-s');
    const vEl = document.getElementById('cc-v');
    if (hEl) hEl.style.background = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';
    const css = function (c) { return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')'; };
    if (sEl) sEl.style.background = 'linear-gradient(to right, ' + css(uniHsvToRgb(h, 0, v / 100)) + ', ' + css(uniHsvToRgb(h, 1, v / 100)) + ')';
    if (vEl) vEl.style.background = 'linear-gradient(to right, #000000, ' + css(uniHsvToRgb(h, s / 100, 1)) + ')';
}
function ccRefresh(fromHex) {
    const hsv = ccReadHSV();
    const exact = ccExactHex ? uniParseHex(ccExactHex) : null;
    const rgb = exact || uniHsvToRgb(hsv.h, hsv.s / 100, hsv.v / 100);
    const hex = uniRgbToHex(rgb.r, rgb.g, rgb.b);
    const ink = ccInkFor(rgb);
    const setT = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    setT('val-cc-h', Math.round(hsv.h));
    setT('val-cc-s', Math.round(hsv.s));
    setT('val-cc-v', Math.round(hsv.v));
    if (!fromHex) {
        const hexEl = document.getElementById('cc-hex');
        if (hexEl && document.activeElement !== hexEl) hexEl.value = hex;
    }
    const sw = document.getElementById('cc-swatch');
    if (sw) sw.style.background = hex;
    // Every preview in the dialog inherits the color from here!
    const dlg = document.getElementById('customchip-dialog');
    if (dlg) {
        dlg.style.setProperty('--cc', hex);
        dlg.style.setProperty('--cc-ink', ink);
    }
    const prev = document.getElementById('cc-preview');
    if (prev) {
        prev.className = 'cc-chip cc-s' + ccStyle;
        prev.textContent = ccPreviewText();
    }
    setT('cc-style-name', ccStyle + '. ' + CC_STYLES[ccStyle - 1]);
    ccPaintSliders(hsv.h, hsv.s, hsv.v);
    return { hex: hex, ink: ink };
}
function ccFromHex() {
    const hexEl = document.getElementById('cc-hex');
    const parsed = hexEl ? uniParseHex(hexEl.value) : null;
    if (!parsed) return;
    ccSetHSVFromRgb(parsed);
    ccExactHex = uniRgbToHex(parsed.r, parsed.g, parsed.b);
    ccRefresh(true);
}
function ccSetHSVFromRgb(rgb) {
    const hsv = uniRgbToHsv(rgb.r, rgb.g, rgb.b);
    const setV = function (id, v) { const el = document.getElementById(id); if (el) el.value = v; };
    setV('cc-h', Math.round(hsv.h));
    setV('cc-s', Math.round(hsv.s * 100));
    setV('cc-v', Math.round(hsv.v * 100));
}
function ccPreviewText() {
    let t = '';
    try { if (ccSavedRange && !ccSavedRange.collapsed) t = ccSavedRange.toString().replace(/\s+/g, ' ').trim(); } catch (e) {}
    if (!t) return 'Text';
    return t.length > 40 ? t.slice(0, 39) + '…' : t;
}
// CUSTOM CHIP part 2: the 50-style grid!
function ccRenderGrid() {
    const grid = document.getElementById('cc-grid');
    if (!grid) return;
    if (!grid.children.length) {
        CC_STYLES.forEach(function (name, i) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'cc-grid-btn';
            b.title = (i + 1) + '. ' + name;
            b.setAttribute('data-cc-style', String(i + 1));
            const chip = document.createElement('span');
            chip.className = 'cc-chip cc-s' + (i + 1);
            chip.textContent = 'Aa';
            const nm = document.createElement('span');
            nm.className = 'cc-grid-name';
            nm.textContent = name;
            b.appendChild(chip);
            b.appendChild(nm);
            grid.appendChild(b);
        });
    }
    grid.querySelectorAll('[data-cc-style]').forEach(function (b) {
        const on = parseInt(b.getAttribute('data-cc-style'), 10) === ccStyle;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}
// CUSTOM CHIP part 3: open, apply, wire!
function ccOpenDialog() {
    const dlg = document.getElementById('customchip-dialog');
    if (!dlg) return;
    ccSavedRange = null;
    try {
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        const sel = window.getSelection();
        if (cv && sel.rangeCount && cv.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            ccSavedRange = sel.getRangeAt(0).cloneRange();
        }
    } catch (e) {}
    if (ccStartHex) {
        const p = uniParseHex(ccStartHex);
        if (p) {
            ccSetHSVFromRgb(p);
            ccExactHex = uniRgbToHex(p.r, p.g, p.b);
        }
        ccStartHex = null;
    }
    ccRenderGrid();
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
    ccRefresh(false);
    try {
        const active = document.querySelector('#cc-grid .cc-grid-btn.active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    } catch (e) {}
}
function ccCloseDialog() {
    const dlg = document.getElementById('customchip-dialog');
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
function ccApplyStyle() {
    const live = ccRefresh(false);
    try { localStorage.setItem(CC_PREF_KEY, JSON.stringify({ style: ccStyle, hex: live.hex })); } catch (e) {}
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    const range = ccSavedRange;
    ccSavedRange = null;
    ccCloseDialog();
    if (!cv) return false;
    try { cv.focus(); } catch (e) {}
    const chip = document.createElement('span');
    chip.className = 'cc-chip cc-s' + ccStyle;
    chip.setAttribute('spellcheck', 'false');
    chip.style.setProperty('--cc', live.hex);
    chip.style.setProperty('--cc-ink', live.ink);
    const sel = window.getSelection();
    try {
        if (range && !range.collapsed && cv.contains(range.commonAncestorContainer)) {
            chip.appendChild(range.extractContents());
            range.insertNode(chip);
        } else {
            chip.textContent = 'Text';
            let placed = false;
            if (range && cv.contains(range.startContainer)) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
            try { if (typeof fmtInsertNodeAtCaret === 'function') placed = !!fmtInsertNodeAtCaret(chip); } catch (e) { placed = false; }
            if (!placed && !chip.isConnected) cv.appendChild(chip);
        }
        // Select the chip's text: type to replace it, or Backspace to delete it!
        const r = document.createRange();
        r.selectNodeContents(chip);
        sel.removeAllRanges();
        sel.addRange(r);
    } catch (e) { return false; }
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { if (typeof fmtRenderStyleList === 'function') fmtRenderStyleList(); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
    return true;
}
function ccWireSkills() {
    if (ccWireSkills._done) return;
    ccWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="customchip"]').forEach(function (item) {
            item.addEventListener('click', function () {
                ccOpenDialog();
                try { closeSkillsMenu(); } catch (e) {}
            });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        try {
            const el = document.getElementById(id);
            if (el) el.addEventListener(ev, fn);
        } catch (e) {}
    };
    ['cc-h', 'cc-s', 'cc-v'].forEach(function (id) { on(id, 'input', function () { ccExactHex = null; ccRefresh(false); }); });
    on('cc-hex', 'input', function () { ccFromHex(); });
    on('cc-hex', 'change', function () { ccFromHex(); ccRefresh(false); });
    on('cc-grid', 'click', function (ev) {
        const b = ev.target.closest ? ev.target.closest('[data-cc-style]') : null;
        if (!b) return;
        ccStyle = parseInt(b.getAttribute('data-cc-style'), 10) || 1;
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.05); } catch (e) {}
        ccRenderGrid();
        ccRefresh(false);
    });
    on('cc-insert-btn', 'click', function () { ccApplyStyle(); });
    on('cc-cancel-btn', 'click', function () { ccSavedRange = null; ccCloseDialog(); });
    on('cc-close-btn', 'click', function () { ccSavedRange = null; ccCloseDialog(); });
    try {
        const dlg = document.getElementById('customchip-dialog');
        if (dlg) dlg.addEventListener('click', function (ev) {
            if (ev.target === dlg) { ccSavedRange = null; ccCloseDialog(); }
        });
    } catch (e) {}
}

// ==========================================
// UNIQUE CHIP STYLES part 1: 3150 ready-made looks in seven collections:
// Regular (90 designs), Frutiger Aero 1, 2 and 3 (90 designs each), Poolside, Poolside 2 and Poolside 3 (90 designs each), 5 colorways each!
// Plus a Favorites view of the styles you star!
// Works like the Uni-Chip: selected text gets wrapped, a bare caret gets a
// pre-selected "Text" chip. Pick from the gallery instead of a color picker!
// ==========================================
var US_FAMILIES = [["neontube","Neon Tube",["Cyber Pink","Laser Lime","Ice Blue","Sunset Orange","Ultraviolet"],"regular"],["lava","Lava Lamp",["Molten","Deep Ocean","Toxic","Grape Soda","Cola"],"regular"],["holo","Holo Foil",["Prism","Opal","Oil Slick","Pearl","Dragonfly"],"regular"],["retrosun","Retro Sun",["Outrun","Miami","Desert","Mint Dusk","Cherry"],"regular"],["vapor","Vaporwave",["Classic","Peach Mall","Seafoam","Dusk","Food Court"],"regular"],["sprinkles","Sprinkles",["Strawberry","Vanilla","Mint Choc","Blueberry","Lemon"],"regular"],["jelly","Jelly",["Grape","Lime","Cherry","Blue Raspberry","Peach"],"regular"],["puffy","Puffy",["Bubblegum","Sky","Mint","Sunny","Lilac"],"regular"],["comic","Comic Pop",["Pow","Zap","Bam","Kaboom","Whoosh"],"regular"],["graffiti","Graffiti",["Street","Bubble","Toxic Tag","Candy Tag","Chrome Tag"],"regular"],["circuit","Circuit Board",["PCB Green","Navy Board","Black Board","Purple Board","Red Board"],"regular"],["blueprint","Blueprint",["Classic","Cyanotype","Midnight","Graphite","Redline"],"regular"],["led","LED Matrix",["Amber","Red","Green","Blue","White"],"regular"],["crt","CRT Screen",["Phosphor","Amber Terminal","Ice","Mono","Pinkwave"],"regular"],["pixel","8-Bit Button",["Hero Red","Slime","Coin","Water","Ghost"],"regular"],["aurora","Aurora",["Borealis","Australis","Glacier","Ember","Nebula"],"regular"],["galaxy","Galaxy",["Andromeda","Milky Way","Supernova","Emerald Nebula","Crimson Void"],"regular"],["gem","Gemstone",["Ruby","Sapphire","Emerald","Amethyst","Topaz"],"regular"],["foil","Luxe Foil",["Gold","Rose Gold","Silver","Bronze","Platinum"],"regular"],["marble","Marble",["Carrara","Nero","Verde","Rosa","Lapis"],"regular"],["wood","Wood Plank",["Oak","Walnut","Birch","Cherrywood","Driftwood"],"regular"],["washi","Washi Tape",["Sakura","Matcha","Sky","Kraft","Lavender"],"regular"],["postit","Sticky Note",["Canary","Pink","Mint","Blue","Orange"],"regular"],["dymo","Label Maker",["Classic Red","Black","Blue","Green","Yellow"],"regular"],["enamel","Enamel Pin",["Gold & Red","Silver & Blue","Gold & Black","Copper & Teal","Silver & Pink"],"regular"],["neumorph","Soft UI",["Cloud","Sand","Sage","Blush","Slate"],"regular"],["glassblob","Glass Blob",["Peach Sky","Lime Berry","Ocean Coral","Violet Sun","Mint Rose"],"regular"],["ring","Spectrum Ring",["Rainbow","Night Rainbow","Fire Ring","Ice Ring","Toxic Ring"],"regular"],["element","Elemental Text",["Fire","Ice","Poison","Lightning","Shadow"],"regular"],["origami","Origami",["Crane Red","Paper Blue","Leaf","Fox","Plum"],"regular"],["bubblewrap","Bubble Wrap",["Clear Blue","Mint","Pink","Lemon","Smoke"],"regular"],["denim","Denim",["Indigo","Stonewash","Black Denim","Pink Denim","Olive Canvas"],"regular"],["leather","Leather",["Saddle","Black","Oxblood","Tan","Forest"],"regular"],["chrome","Chrome",["Mirror","Blue Steel","Gunmetal","Rose Chrome","Gold Chrome"],"regular"],["window","App Window",["Light","Dark","Purple","Teal","Retro Blue"],"regular"],["receipt","Receipt",["Thermal","Yellowed","Pink Slip","Blue Carbon","Mint Copy"],"regular"],["brick","Toy Brick",["Red","Yellow","Blue","Green","White"],"regular"],["scales","Mermaid Scales",["Lagoon","Coral Reef","Deep Sea","Pearl Shell","Seaweed"],"regular"],["plaid","Plaid",["Tartan Red","Flannel Blue","Highland Green","Buffalo Check","Cozy Beige"],"regular"],["gingham","Gingham",["Picnic Red","Sky Blue","Kelly Green","Butter","Lavender"],"regular"],["chevron","Chevron",["Coral","Navy","Mint","Mustard","Gray"],"regular"],["cyber","Cyber Panel",["Netrunner","Ghost","Corpo","Redline","Toxin"],"regular"],["camo","Camo",["Woodland","Desert","Urban","Arctic","Pink Camo"],"regular"],["barber","Barber Pole",["Classic","Candy Cane","Mint Swirl","Grape Swirl","Lemon Swirl"],"regular"],["sunburst","Sunburst",["Sunshine","Rising Sun","Circus","Ocean Burst","Retro Teal"],"regular"],["topo","Topo Map",["Trail","Alpine","Forest","Night Map","Canyon"],"regular"],["glitch","Glitch",["RGB","Acid","Gold Bug","Mint Bug","Mono Bug"],"regular"],["hud","Sci-Fi HUD",["Cyan","Amber","Lime","Red Alert","Violet"],"regular"],["hazard","Hazard Tape",["Caution","Danger","Construction","Biohazard","Cold Zone"],"regular"],["typewriter","Typewriter",["Black Ribbon","Red Ribbon","Blue Ribbon","Green Ribbon","Purple Ribbon"],"regular"],["crayon","Crayon",["Red","Blue","Green","Orange","Violet"],"regular"],["brickneon","Neon on Brick",["Pink Bar","Blue Diner","Lime Club","Open Late","Gold Lounge"],"regular"],["marquee","Marquee",["Broadway","Arcade","Casino","Carnival","Cinema"],"regular"],["polaroid","Polaroid",["Beach","Sunset","Forest","Lilac","Night"],"regular"],["film","Film Strip",["Classic","Sepia","Technicolor","Cyan Print","Gold Reel"],"regular"],["brush","Brush Stroke",["Crimson","Ink Blue","Matcha","Saffron","Charcoal"],"regular"],["watercolor","Watercolor",["Spring","Seaside","Autumn","Lavender Field","Moss"],"regular"],["stained","Stained Glass",["Cathedral","Garden","Ocean","Ember","Twilight"],"regular"],["tiedye","Tie-Dye",["Groovy","Ocean Swirl","Sherbet","Galaxy Dye","Earthy"],"regular"],["popart","Pop Art",["Lichtenstein","Blue Dots","Pink Dots","Mint Dots","Orange Dots"],"regular"],["riso","Risograph",["Pink & Blue","Teal & Orange","Purple & Yellow","Red & Green","Navy & Coral"],"regular"],["scroll","Parchment Scroll",["Ancient","Royal","Elven","Dragon","Frost"],"regular"],["wax","Wax Seal",["Royal Red","Navy","Forest","Gold","Black"],"regular"],["banner","Ribbon Banner",["Red","Royal Blue","Emerald","Gold","Purple"],"regular"],["notebook","Notebook",["College Ruled","Legal Pad","Kraft Journal","Night Notes","Mint Page"],"regular"],["capsule","Medicine Capsule",["Classic","Blue & White","Yellow & Black","Mint & Pink","Purple & Teal"],"regular"],["battery","Battery",["Full","Good","Half","Low","Critical"],"regular"],["loading","Loading Bar",["Progress Blue","Success Green","Warning Orange","Error Red","Busy Purple"],"regular"],["cloud","Fluffy Cloud",["Fair Weather","Cotton Candy","Storm","Sunrise","Dreamy"],"regular"],["glowtext","Glow Text",["Hot Pink","Electric Blue","Radioactive","Blaze","Royal Violet"],"regular"],["patch","Embroidered Patch",["Scout","Biker","Varsity","Space Camp","Kawaii"],"regular"],["softinset","Soft Inset",["Cloud","Peach","Mint","Lavender","Midnight"],"regular"],["clay","Clay",["Bubblegum","Sky","Lime","Tangerine","Grape"],"regular"],["layers","Paper Layers",["Sunset Stack","Ocean Stack","Forest Stack","Berry Stack","Mono Stack"],"regular"],["longshadow","Long Shadow",["Flat Red","Flat Blue","Flat Green","Flat Orange","Flat Purple"],"regular"],["engraved","Engraved Plate",["Brass","Steel","Copper","Pewter","Silver"],"regular"],["webtwo","Web 2.0",["Beta Orange","Social Blue","Lime Launch","Hot Pink","Glossy Black"],"regular"],["retrodesk","Retro Desktop",["Classic Gray","Desert","Lilac","Teal Desktop","Rainy Day"],"regular"],["coderain","Code Rain",["Green","Blue","Red","Gold","Violet"],"regular"],["bokeh","Bokeh",["City Lights","Fairy Lights","Neon Night","Forest Glow","Ice Lights"],"regular"],["ombre","Ombre",["Peach Fuzz","Northern","Citrus","Lagoon","Royal"],"regular"],["mesh","Mesh Gradient",["Candy","Spring","Dusk","Seafoam","Ember"],"regular"],["swoosh","Swoosh",["Red","Blue","Gold","Green","Purple"],"regular"],["circled","Circled",["Red Pen","Blue Pen","Green Pen","Highlighter","Pencil"],"regular"],["spoiler","Spoiler",["Blackout","Redacted","Purple Haze","Deep Blue","Gray Matter"],"regular"],["gradtext","Gradient Text",["Rainbow","Pastel","Sunset","Ocean","Forest"],"regular"],["shimmer","Shimmer",["Silver","Gold","Rose","Ice","Emerald"],"regular"],["extruded","Extruded",["Retro Red","Cool Blue","Lemon Lime","Hot Pink","Gold Block"],"regular"],["diecut","Die-Cut Text",["Cherry","Ocean","Grass","Tangerine","Grape"],"regular"],["letterpress","Letterpress",["Ink Black","Oxblood","Navy","Sage","Plum"],"regular"],["faaqua","Aqua Gel",["Aqua Blue","Graphite","Lime","Tangerine","Grape"],"aero"],["fabubble","Soap Bubble",["Rainbow Film","Mint Film","Sunny Film","Rose Film","Lilac Film"],"aero"],["faglass","Aero Glass",["Sky","Emerald","Twilight","Ruby","Slate"],"aero"],["fameadow","Bliss Hill",["Spring","Summer","Dusk","Highland","Lavender Sky"],"aero"],["fawater","Water Surface",["Lagoon","Pool","Tropical","Deep Blue","Glacier"],"aero"],["faleaf","Glossy Leaf",["Fresh Green","Lime Leaf","Teal Leaf","Autumn Leaf","Fern"],"aero"],["faflare","Lens Flare",["Sunbeam","Azure","Emerald Ray","Magenta Ray","Cyan Ray"],"aero"],["faswoosh","Vista Swoosh",["Aurora","Ocean","Emerald","Violet","Sunset"],"aero"],["facrystal","Crystal",["Ice","Quartz","Peridot","Citrine","Sapphire"],"aero"],["faunderwater","Bubble Stream",["Reef","Kelp","Abyss","Lagoon","Fizz"],"aero"],["faorb","Glossy Orb",["Start Blue","Start Green","Start Orange","Start Red","Start Black"],"aero"],["fafrost","Frosted Pane",["Sky","Mint","Lime","Peach","Iris"],"aero"],["fadew","Dewdrop",["Morning Leaf","Petal","Sky Drop","Lemon Drop","Teal Drop"],"aero"],["faeco","Eco Tech",["Green Energy","Clean Water","Solar","Fresh Air","Bloom"],"aero"],["fasunrise","Sunrise Glow",["Dawn","Golden Hour","Pink Sky","Mint Morning","Lilac Dawn"],"aero"],["fapinstripe","Aqua Pinstripe",["Aqua","Lime","Strawberry","Grape","Tangerine"],"aero"],["faclouds","Cloud Sky",["Blue Sky","Noon","Cotton","Mint Sky","Evening"],"aero"],["fataskbar","Glass Taskbar",["Cyan Glow","Green Glow","Amber Glow","Pink Glow","Violet Glow"],"aero"],["faaquarium","Aquarium",["Tropical Tank","Reef Tank","Night Tank","Koi Pond","Lagoon Tank"],"aero"],["faribbon","Gloss Ribbon",["Nature","Ocean","Citrus","Berry","Mint"],"aero"],["faluna","Luna Button",["Start Green","Royal Blue","Olive","Silver","Sunset"],"aero"],["fataskband","Luna Taskbar",["Classic Blue","Olive Green","Metallic","Royale","Zune"],"aero"],["fagadget","Sidebar Gadget",["Clock Blue","Weather Gold","CPU Green","Feed Orange","Notes Pink"],"aero"],["fachannel","Console Channel",["Sky Blue","Mii Gray","Shop Teal","Photo Green","Weather Orange"],"aero"],["famediawave","Media Wave",["January Blue","May Green","July Teal","October Gold","December Purple"],"aero"],["fablade","Dashboard Blade",["Games Green","Media Pink","Market Blue","System Silver","Friends Orange"],"aero"],["fapocket","Pocket Player",["Silver Blue","Lime Nano","Pink Nano","Orange Nano","Graphite"],"aero"],["fablackglass","Black Glass Button",["Blue Reflection","Green Reflection","Red Reflection","Gold Reflection","Violet Reflection"],"aero"],["fatoolbar","Toolbar Gel",["Explorer Blue","Office Silver","Media Green","Mail Orange","Calendar Red"],"aero"],["faprogress","Progress Gel",["Copy Green","Paused Yellow","Error Red","Install Blue","Defrag Teal"],"aero"],["fasearch","Search Field",["Focus Blue","Focus Green","Focus Orange","Focus Pink","Focus Violet"],"aero"],["fagltab","Glass Tab",["Browser Blue","Mint Tab","Peach Tab","Lilac Tab","Lemon Tab"],"aero"],["faballoon","Tray Balloon",["Info Cream","Update Blue","Secure Green","Warning Amber","Alert Rose"],"aero"],["fagrass","Grass Field",["Meadow","Golf Course","Spring Lawn","Evening Field","Prairie"],"aero"],["fahorizon","Ocean Horizon",["Midday","Tropic","Golden Sea","Calm Mint","Twilight Sea"],"aero"],["farainbow","Rainbow Arc",["Clear Sky","After Rain","Sunny","Pastel","Mint Sky"],"aero"],["fasunbeam","Sunbeams",["Morning Sky","Golden Rays","Forest Rays","Rose Rays","Aqua Rays"],"aero"],["fapetals","Blossom Petals",["Sakura","Plum Blossom","Orange Blossom","Apple Blossom","Jasmine"],"aero"],["fawavecrest","Wave Crest",["Surf","Tide Pool","Sunset Surf","Deep Swell","Lagoon Swell"],"aero"],["faripples","Pond Ripples",["Koi Pond","Lily Pond","Spring Pool","Sunset Pond","Moon Pond"],"aero"],["farainglass","Rain on Glass",["Window Blue","Green Glass","Storm Gray","Violet Glass","Teal Glass"],"aero"],["faicecube","Ice Cube",["Clear Ice","Mint Ice","Berry Ice","Lemon Ice","Grape Ice"],"aero"],["fasnowglobe","Snow Globe",["Winter Blue","Pine Green","Holiday Red","Night Sky","Lavender Snow"],"aero"],["fashafts","Forest Light",["Fern Glade","Misty Pine","Autumn Wood","Bluebell Wood","Jungle"],"aero"],["faglobe","Earth Globe",["Blue Planet","Ocean World","Night Earth","Dawn Earth","Eco World"],"aero"],["faveins","Leaf Vein",["Spring Leaf","Lime Leaf","Teal Leaf","Maple","Gold Leaf"],"aero"],["fabamboo","Bamboo",["Fresh Bamboo","Young Shoot","Jade","Dry Cane","Black Bamboo"],"aero"],["faskytext","Sky Text",["Blue Sky","Sunrise","Spring","Lagoon","Dusk"],"aero"],["faliquidchrome","Liquid Chrome",["Aqua Chrome","Mint Chrome","Rose Chrome","Lime Chrome","Indigo Chrome"],"aero"],["faliquid","Liquid Fill",["Water","Lime Soda","Orange Juice","Berry Smoothie","Grape Soda"],"aero"],["faprism","Glass Prism",["Crystal Clear","Sky Prism","Mint Prism","Rose Prism","Amber Prism"],"aero"],["fasmoked","Smoked Frost",["Graphite","Night Blue","Forest Smoke","Plum Smoke","Ember Smoke"],"aero"],["faneonedge","Neon Glass Edge",["Cyan Pink","Lime Blue","Sunset Edge","Aqua Mint","Violet Edge"],"aero"],["fahologlass","Holo Glass",["Opal Glass","Seafoam Glass","Peach Glass","Iris Glass","Citrus Glass"],"aero"],["fagelring","Gel Ring",["Aqua Ring","Lime Ring","Pink Ring","Orange Ring","Purple Ring"],"aero"],["fajellybean","Jelly Bean",["Cherry Bean","Lime Bean","Blueberry Bean","Tangerine Bean","Grape Bean"],"aero"],["facandygloss","Candy Gloss",["Strawberry","Spearmint","Blue Raspberry","Orange Fizz","Grape Twist"],"aero"],["famarble","Glass Marble",["Cat Eye","Swirl Green","Fireball","Ocean Swirl","Candy Swirl"],"aero"],["fawaterdrop","Water Drop",["Clear Drop","Lime Drop","Rose Drop","Teal Drop","Violet Drop"],"aero"],["fareflect","Mirror Floor",["Aqua","Leaf","Coral","Orchid","Graphite"],"aero"],["faorbs","Light Orbs",["Sky Orbs","Spring Orbs","Blossom Orbs","Ocean Orbs","Sunny Orbs"],"aero"],["fabrightribbon","Light Ribbons",["Aqua Flow","Spring Flow","Rose Flow","Ocean Flow","Sunset Flow"],"aero"],["faswirl","Swirl Wallpaper",["Blue Swirl","Green Swirl","Pink Swirl","Teal Swirl","Lilac Swirl"],"aero"],["fabanner","Web Banner",["Portal Blue","Eco Green","Promo Orange","Music Pink","Tech Steel"],"aero"],["fabadge","Glossy Badge",["New Blue","Fresh Green","Hot Red","Sale Orange","Beta Purple"],"aero"],["fatoggle","Glass Toggle",["On Green","On Blue","On Orange","On Pink","On Teal"],"aero"],["faicontile","Icon Tile",["Mail Blue","Messages Green","Music Red","Photos Sun","Store Purple"],"aero"],["fadunes","Rolling Dunes",["Pastel Dunes","Mint Hills","Lavender Dunes","Peach Hills","Sky Hills"],"aero"],["fasunsetsea","Sunset Sea",["Tropical Sunset","Pink Dusk","Golden Bay","Coral Evening","Lilac Bay"],"aero"],["fatropical","Tropical Leaves",["Palm","Monstera","Banana Leaf","Fern Grotto","Sunlit Jungle"],"aero"],["fawaterfall","Waterfall",["Cascade","Rainforest Falls","Glacier Falls","Lagoon Falls","Twilight Falls"],"aero"],["facluster","Bubble Cluster",["Aqua Fizz","Lime Fizz","Berry Fizz","Mint Fizz","Grape Fizz"],"aero"],["fawaveline","Glass Wave Line",["Blue Wave","Green Wave","Coral Wave","Teal Wave","Violet Wave"],"aero"],["faecoleaf","Eco Leaf Badge",["Leaf Green","Sea Green","Sky Leaf","Sun Leaf","Bloom Leaf"],"aero"],["farecycle","Recycle Swirl",["Green Blue","Lime Teal","Sky Mint","Sun Leaf","Aqua Violet"],"aero"],["fasolar","Solar Panel",["Mono Blue","Poly Blue","Night Cell","Teal Cell","Violet Cell"],"aero"],["faenergy","Energy Bars",["Charge","Signal","Heat","Calm","Boost"],"aero"],["fapebble","Wet Pebble",["River Stone","Jade Stone","Sea Glass","Sandstone","Slate Pebble"],"aero"],["fashard","Glass Shard",["Ice Shard","Emerald Shard","Ruby Shard","Amethyst Shard","Citrine Shard"],"aero"],["faripplering","Halo Ring",["Sky Halo","Leaf Halo","Sun Halo","Rose Halo","Iris Halo"],"aero"],["falightleak","Light Leak",["Warm Leak","Cool Leak","Fresh Leak","Golden Leak","Dream Leak"],"aero"],["faicetext","Ice Glaze Text",["Frost Blue","Mint Frost","Lilac Frost","Rose Frost","Silver Frost"],"aero"],["fawatertext","Water Text",["Ocean","Lagoon","Spring","Lilac","Coral"],"aero"],["faglosstext","Gel Text",["Aqua","Lime","Cherry","Tangerine","Grape"],"aero"],["fachrometext","Aqua Chrome Text",["Blue Chrome","Teal Chrome","Silver Chrome","Gold Chrome","Rose Chrome"],"aero"],["faleaftext","Leaf Text",["Fresh Leaf","Lime Sprout","Sea Leaf","Autumn","Golden Leaf"],"aero"],["faskypill","Sky Pill",["Clear Day","Mint Day","Peach Day","Lilac Day","Lemon Day"],"aero"],["famusicnote","Glossy Sticker",["Aqua Sticker","Lime Sticker","Pink Sticker","Orange Sticker","Purple Sticker"],"aero"],["faflowcard","Flow Card",["Blue Flow","Green Flow","Sunset Flow","Berry Flow","Ocean Flow"],"aero"],["faslider","Aqua Slider",["Volume Blue","Brightness Gold","Balance Green","Bass Purple","Treble Teal"],"aero"],["fbcapsule","Gel Capsule",["Aqua Capsule","Lime Capsule","Orange Capsule","Grape Capsule","Graphite Capsule"],"aero2"],["fbwand","Bubble Wand",["Rainbow Wand","Mint Wand","Sunny Wand","Rose Wand","Lilac Wand"],"aero2"],["fbtitlebar","Aero Title Bar",["Sky Caption","Emerald Caption","Twilight Caption","Teal Caption","Slate Caption"],"aero2"],["fbvalley","Bliss Valley",["Green Valley","Deep Valley","Golden Valley","Misty Valley","Violet Valley"],"aero2"],["fbcaustic","Sunlit Caustics",["Pool Floor","Shallows","Reef Floor","Deep End","Ice Floor"],"aero2"],["fbpetal","Glossy Petal",["Rose Petal","Orchid Petal","Sky Petal","Marigold Petal","Mint Petal"],"aero2"],["fbstreak","Flare Streak",["Gold Streak","Blue Streak","Green Streak","Pink Streak","Cyan Streak"],"aero2"],["fbtwinswoosh","Twin Swoosh",["Northern Lights","Deep Ocean","Forest Night","Royal Night","Ember Night"],"aero2"],["fbfacet","Diamond Facet",["Diamond","Rose Quartz","Emerald Cut","Topaz","Tanzanite"],"aero2"],["fbsoda","Soda Fizz",["Lemon Soda","Lime Soda","Orange Soda","Berry Soda","Blue Soda"],"aero2"],["fbpearl","Glossy Pearl",["Blue Pearl","Green Pearl","Peach Pearl","Pink Pearl","Lilac Pearl"],"aero2"],["fbstacked","Stacked Panes",["Sky Panes","Mint Panes","Lime Panes","Coral Panes","Iris Panes"],"aero2"],["fbdewbeads","Dew Beads",["Leaf Beads","Rose Beads","Sky Beads","Honey Beads","Teal Beads"],"aero2"],["fbstatus","Eco Status",["Online Green","Synced Blue","Charging Amber","Fresh Mint","Bloom Pink"],"aero2"],["fbsundisc","Sun Disc",["Midday Sun","Warm Sun","Pink Sun","Mint Sun","Lilac Sun"],"aero2"],["fbbrushed","Brushed Aluminum",["Blue LED","Green LED","Red LED","Amber LED","Violet LED"],"aero2"],["fbcloudbank","Cloud Bank",["Fair Weather","High Noon","Candy Sky","Mint Air","Late Sky"],"aero2"],["fbdockitem","Glass Dock Item",["Cyan Active","Green Active","Amber Active","Pink Active","Violet Active"],"aero2"],["fbtank","Planted Tank",["Fresh Tank","Jungle Tank","Moon Tank","Pond Tank","Coral Tank"],"aero2"],["fbsash","Gloss Sash",["Nature Sash","Ocean Sash","Citrus Sash","Berry Sash","Mint Sash"],"aero2"],["fbtaskpane","Task Pane Header",["Luna Pane","Olive Pane","Silver Pane","Royale Pane","Sunset Pane"],"aero2"],["fbtray","System Tray",["Tray Blue","Tray Olive","Tray Silver","Tray Royale","Tray Black"],"aero2"],["fbgauge","Gauge Gadget",["CPU Meter","RAM Meter","Battery Meter","Heat Meter","Network Meter"],"aero2"],["fbmenububble","Menu Bubble",["Start Blue","Disc Gray","Shop Aqua","Play Green","News Orange"],"aero2"],["fbvisualizer","Visualizer",["Spring Mix","Blue Mix","Teal Mix","Amber Mix","Violet Mix"],"aero2"],["fbhubtile","Hub Tile",["Games Tile","Media Tile","Market Tile","Settings Tile","Social Tile"],"aero2"],["fbclickwheel","Click Wheel",["Classic White","Blue Mini","Green Mini","Pink Mini","Gold Mini"],"aero2"],["fbpiano","Piano Black Strip",["Blue LED Strip","Green LED Strip","Red LED Strip","Gold LED Strip","Violet LED Strip"],"aero2"],["fbribbongroup","Ribbon Group",["Word Blue","Sheet Green","Slides Orange","Notes Purple","Mail Teal"],"aero2"],["fbmarquee","Busy Marquee",["Working Green","Syncing Blue","Waiting Amber","Updating Teal","Loading Violet"],"aero2"],["fbaddress","Address Bar",["Go Blue","Go Green","Go Orange","Go Pink","Go Violet"],"aero2"],["fbdocktab","Dock Tab",["Blue Dock Tab","Mint Dock Tab","Peach Dock Tab","Lilac Dock Tab","Lemon Dock Tab"],"aero2"],["fbtooltip","Glass Tooltip",["Help Blue","Tip Cream","Done Green","Note Lilac","Hint Peach"],"aero2"],["fbflowers","Flower Meadow",["Daisy Hill","Poppy Hill","Bluebell Hill","Evening Hill","Lavender Hill"],"aero2"],["fbisland","Desert Island",["Palm Isle","Sandbar","Golden Isle","Lagoon Isle","Dusk Isle"],"aero2"],["fbrainstreak","Rainbow Streak",["Bright Day","Soft Rain","Sun Shower","Cotton Candy","Fresh Mint"],"aero2"],["fbskybeams","Sky Beams",["Heaven Blue","Golden Beams","Glade Beams","Rose Beams","Lagoon Beams"],"aero2"],["fbdaisy","Daisy Pill",["Lawn Daisy","Sky Daisy","Pink Daisy","Lilac Daisy","Mint Daisy"],"aero2"],["fbsurf","Rolling Surf",["Blue Surf","Tide Surf","Sunset Surf","Storm Surf","Lagoon Surf"],"aero2"],["fbpuddle","Rain Puddle",["Rainy Day","Garden Puddle","Blue Puddle","Dusk Puddle","Night Puddle"],"aero2"],["fbmisted","Misted Window",["Misty Blue","Misty Green","Misty Gray","Misty Violet","Misty Teal"],"aero2"],["fbfrostcorner","Frost Corners",["Window Frost","Mint Frost","Pink Frost","Lemon Frost","Lilac Frost"],"aero2"],["fbsnowcap","Snow Cap",["Frozen Blue","Snowy Pine","Berry Snow","Midnight Snow","Violet Snow"],"aero2"],["fbdappled","Dappled Light",["Fern Shade","Pine Shade","Autumn Shade","Bluebell Shade","Rainforest Shade"],"aero2"],["fbplanet","Ringed Planet",["Ice Giant","Gas Giant","Jade Planet","Rose Planet","Violet Planet"],"aero2"],["fbfern","Fern Frond",["Spring Fern","Lime Fern","Sea Fern","Rust Fern","Shade Fern"],"aero2"],["fbmat","Bamboo Mat",["Green Mat","Straw Mat","Jade Mat","Honey Mat","Dark Mat"],"aero2"],["fbcloudtext","Cloud Text",["Cloudy Blue","Cloudy Dawn","Cloudy Meadow","Cloudy Lagoon","Cloudy Dusk"],"aero2"],["fbchromerim","Chrome Rim",["Aqua Rim","Mint Rim","Rose Rim","Lime Rim","Indigo Rim"],"aero2"],["fbleveltube","Level Tube",["Water Level","Lime Level","Juice Level","Berry Level","Grape Level"],"aero2"],["fbprismedge","Prism Edge",["Clear Edge","Sky Edge","Mint Edge","Rose Edge","Amber Edge"],"aero2"],["fbgrille","Speaker Grille",["Blue Glow Grille","Green Glow Grille","Red Glow Grille","Amber Glow Grille","Violet Glow Grille"],"aero2"],["fbneonring","Neon Ring Glass",["Cyan Pink Ring","Lime Blue Ring","Sunset Ring","Aqua Mint Ring","Violet Ring"],"aero2"],["fbiridescent","Iridescent Glass",["Opal Sheen","Seafoam Sheen","Peach Sheen","Iris Sheen","Citrus Sheen"],"aero2"],["fbtwinring","Twin Ring",["Aqua Twin","Lime Twin","Pink Twin","Orange Twin","Purple Twin"],"aero2"],["fbgummy","Sugar Gummy",["Cherry Gummy","Apple Gummy","Blue Gummy","Orange Gummy","Grape Gummy"],"aero2"],["fbpeppermint","Peppermint Stick",["Classic Mint","Spearmint Stick","Blue Mint","Orange Mint","Grape Mint"],"aero2"],["fbsuperball","Super Ball",["Blue Bounce","Green Bounce","Red Bounce","Teal Bounce","Purple Bounce"],"aero2"],["fbwaterbead","Water Bead",["Clear Bead","Lime Bead","Rose Bead","Teal Bead","Violet Bead"],"aero2"],["fbmirrorpill","Mirror Pill",["Aqua Mirror","Leaf Mirror","Coral Mirror","Orchid Mirror","Graphite Mirror"],"aero2"],["fbbokeh","Night Bokeh",["City Bokeh","Spring Bokeh","Blossom Bokeh","Ocean Bokeh","Ember Bokeh"],"aero2"],["fbsilk","Silk Streams",["Aqua Silk","Spring Silk","Rose Silk","Ocean Silk","Sunset Silk"],"aero2"],["fbflourish","Vector Flourish",["Blue Flourish","Green Flourish","Pink Flourish","Teal Flourish","Lilac Flourish"],"aero2"],["fbweb2","Web 2.0 Button",["Sign Up Blue","Download Green","Buy Now Orange","Join Pink","Learn Teal"],"aero2"],["fbstarburst","Starburst Sticker",["Hot Deal Red","New Burst Blue","Eco Burst Green","Sale Burst Orange","Bonus Burst Purple"],"aero2"],["fbradio","Radio Button",["Radio Green","Radio Blue","Radio Orange","Radio Pink","Radio Teal"],"aero2"],["fbrunapp","Running App",["Browser Blue","Chat Green","Video Red","Camera Sun","Game Purple"],"aero2"],["fbpastellayers","Pastel Layers",["Peach Layers","Mint Layers","Lavender Layers","Coral Layers","Sky Layers"],"aero2"],["fbmoonpath","Moon Path",["Midnight Bay","Purple Night","Teal Night","Harvest Moon","Blue Hour"],"aero2"],["fbpalmshade","Palm Shade",["Beach Palm","Lagoon Palm","Sunset Palm","Jungle Palm","Dusk Palm"],"aero2"],["fbrainshower","Rain Shower",["Spring Rain","Forest Rain","Silver Rain","Tropic Rain","Purple Rain"],"aero2"],["fbfizztrail","Fizz Trail",["Aqua Trail","Lime Trail","Berry Trail","Mint Trail","Grape Trail"],"aero2"],["fbsignalwave","Signal Wave",["Blue Signal","Green Signal","Coral Signal","Teal Signal","Violet Signal"],"aero2"],["fbdropbadge","Water Saver Badge",["Rain Drop Badge","River Drop Badge","Leaf Drop Badge","Sea Drop Badge","Lilac Drop Badge"],"aero2"],["fbcycle","Cycle Badge",["Green Cycle","Teal Cycle","Sky Cycle","Sun Cycle","Violet Cycle"],"aero2"],["fbbattery","Glossy Battery",["Full Green","Charging Blue","Saver Amber","Low Red","Boost Violet"],"aero2"],["fbsignalbars","Signal Strength",["Full Signal","Wi-Fi Blue","Warm Signal","Calm Signal","Boost Signal"],"aero2"],["fbfroststone","Frosted Stone",["Sea Glass Stone","Cobalt Stone","Amber Stone","Jade Stone Glass","Lavender Stone"],"aero2"],["fbbevel","Beveled Glass",["Ice Bevel","Emerald Bevel","Ruby Bevel","Amethyst Bevel","Citrine Bevel"],"aero2"],["fbbreathe","Breathing Halo",["Sky Breath","Leaf Breath","Sun Breath","Rose Breath","Iris Breath"],"aero2"],["fbbloom","Center Bloom",["Warm Bloom","Cool Bloom","Fresh Bloom","Rose Bloom","Dream Bloom"],"aero2"],["fbfroststroke","Frost Stroke Text",["Frost Blue Stroke","Mint Stroke","Lilac Stroke","Rose Stroke","Silver Stroke"],"aero2"],["fbbubbletext","Bubbly Text",["Ocean Bubbles","Lagoon Bubbles","Spring Bubbles","Lilac Bubbles","Coral Bubbles"],"aero2"],["fbstickertext","Sticker Text",["Aqua Sticker Text","Lime Sticker Text","Cherry Sticker Text","Orange Sticker Text","Grape Sticker Text"],"aero2"],["fbglasstext","Glass Text",["Blue Glass Text","Teal Glass Text","Smoke Glass Text","Amber Glass Text","Rose Glass Text"],"aero2"],["fbmeadowtext","Meadow Text",["Grass and Sky","Lime and Sun","Sea and Sky","Field and Dusk","Fern and Mist"],"aero2"],["fbskywindow","Sky Window",["Clear Window","Mint Window","Peach Window","Lilac Window","Lemon Window"],"aero2"],["fbpeel","Peeling Sticker",["Aqua Peel","Lime Peel","Pink Peel","Orange Peel","Purple Peel"],"aero2"],["fbsideflow","Side Flow Card",["Blue Side Flow","Green Side Flow","Sunset Side Flow","Berry Side Flow","Ocean Side Flow"],"aero2"],["fbcheckbox","Aqua Checkbox",["Check Blue","Check Gold","Check Green","Check Purple","Check Teal"],"aero2"],["fckeycap","Gel Keycap",["Aqua Key","Lime Key","Tangerine Key","Grape Key","Graphite Key"],"aero3"],["fctwinbubble","Bubble Twins",["Rainbow Twins","Mint Twins","Sunny Twins","Rose Twins","Lilac Twins"],"aero3"],["fcthumb","Glass Thumbnail",["Sky Thumb","Emerald Thumb","Twilight Thumb","Ruby Thumb","Slate Thumb"],"aero3"],["fchillsil","Hill Silhouette",["Dusk Hill","Twilight Hill","Golden Hill","Night Hill","Rose Hill"],"aero3"],["fcbelow","Surface From Below",["Sunny Shallows","Blue Lagoon","Green Cove","Deep Sea","Arctic Water"],"aero3"],["fcwillow","Willow Leaf",["Willow Green","Olive Willow","Sea Willow","Amber Willow","Blue Willow"],"aero3"],["fcsparkle","Sparkle Glint",["Gold Glint","Azure Glint","Jade Glint","Magenta Glint","Cyan Glint"],"aero3"],["fcvistaglow","Vista Glow",["Aurora Glow","Ocean Glow","Forest Glow","Violet Glow","Ember Glow"],"aero3"],["fccolumn","Faceted Column",["Ice Column","Quartz Column","Peridot Column","Citrine Column","Sapphire Column"],"aero3"],["fccurtain","Bubble Curtain",["Reef Curtain","Kelp Curtain","Abyss Curtain","Lagoon Curtain","Fizz Curtain"],"aero3"],["fcjewel","Jewel Orb",["Sapphire Orb","Emerald Orb","Ruby Orb","Amethyst Orb","Topaz Orb"],"aero3"],["fcfrostheader","Frosted Header",["Sky Header","Mint Header","Lime Header","Peach Header","Iris Header"],"aero3"],["fcdewcorner","Dew Corner",["Leaf Corner","Petal Corner","Sky Corner","Lemon Corner","Teal Corner"],"aero3"],["fcecocap","Eco Tab Pill",["Green Cap","Water Cap","Solar Cap","Air Cap","Bloom Cap"],"aero3"],["fcdawnbands","Dawn Bands",["Early Dawn","Golden Dawn","Pink Dawn","Mint Dawn","Lilac Dawn Bands"],"aero3"],["fcgraph","Aqua Graph Paper",["Aqua Grid","Lime Grid","Strawberry Grid","Grape Grid","Tangerine Grid"],"aero3"],["fccotton","Cotton Cloud",["Blue Cotton","Noon Cotton","Pink Cotton","Mint Cotton","Evening Cotton"],"aero3"],["fcstartbar","Start Orb Bar",["Blue Orb Bar","Green Orb Bar","Amber Orb Bar","Pink Orb Bar","Violet Orb Bar"],"aero3"],["fcfishbowl","Fish Bowl",["Goldfish Bowl","Guppy Bowl","Betta Bowl","Tetra Bowl","Koi Bowl"],"aero3"],["fccornerribbon","Corner Ribbon",["Nature Corner","Ocean Corner","Citrus Corner","Berry Corner","Mint Corner"],"aero3"],["fclunawindow","Luna Window",["Luna Blue","Luna Olive","Luna Silver","Luna Royale","Luna Black"],"aero3"],["fcquicklaunch","Quick Launch",["Launch Blue","Launch Olive","Launch Silver","Launch Royale","Launch Black"],"aero3"],["fcweather","Weather Gadget",["Sunny Day","Clear Evening","Spring Weather","Hazy Weather","Night Weather"],"aero3"],["fcconsolecard","Console Card",["Card Blue","Card Gray","Card Teal","Card Green","Card Orange"],"aero3"],["fclightbars","Light Bars",["February Blue","April Green","August Teal","September Gold","November Plum"],"aero3"],["fcarrow","Arrow Blade",["Go Green Blade","Media Blade","Store Blade","System Blade","Party Blade"],"aero3"],["fcminiscreen","Mini Player Screen",["Screen Blue","Screen Lime","Screen Pink","Screen Orange","Screen Graphite"],"aero3"],["fcblackpearl","Black Pearl",["Blue Pearl Rim","Green Pearl Rim","Red Pearl Rim","Gold Pearl Rim","Violet Pearl Rim"],"aero3"],["fcsplit","Split Button",["Split Blue","Split Silver","Split Green","Split Orange","Split Red"],"aero3"],["fcblocks","Block Progress",["Block Green","Block Blue","Block Amber","Block Red","Block Teal"],"aero3"],["fclens","Lens Search",["Lens Blue","Lens Green","Lens Orange","Lens Pink","Lens Violet"],"aero3"],["fcfoldertab","Folder Tab",["Manila Tab","Blue Folder","Green Folder","Pink Folder","Purple Folder"],"aero3"],["fcchat","Chat Bubble",["Chat Blue","Chat Green","Chat Pink","Chat Orange","Chat Gray"],"aero3"],["fclawn","Mown Lawn",["Park Lawn","Stadium Lawn","Spring Lawn Stripes","Sunset Lawn","Garden Lawn"],"aero3"],["fcsail","Sailing Day",["Blue Sail","Tropic Sail","Golden Sail","Mint Sail","Dusk Sail"],"aero3"],["fcrainbowrim","Rainbow Rim",["Sky Rim","Cloud Rim","Sunny Rim","Candy Rim","Mint Rim Glow"],"aero3"],["fcsunburst","Glossy Sunburst",["Blue Burst","Gold Burst","Green Burst","Rose Burst","Aqua Burst"],"aero3"],["fcblossomrow","Blossom Border",["Sakura Border","Plum Border","Orange Border","Apple Border","Forget-Me-Not"],"aero3"],["fcoceanbands","Ocean Bands",["Surf Bands","Tide Bands","Sunset Bands","Deep Bands","Lagoon Bands"],"aero3"],["fclilypad","Lily Pad",["Pond Pad","Lake Pad","Garden Pad","Sunset Pad","Moon Pad"],"aero3"],["fcdrips","Dripping Glass",["Drip Blue","Drip Green","Drip Gray","Drip Violet","Drip Teal"],"aero3"],["fcicicle","Icicle Ledge",["Clear Icicle","Mint Icicle","Berry Icicle","Lemon Icicle","Grape Icicle"],"aero3"],["fcsnowflake","Snowflake Tag",["Winter Flake","Pine Flake","Holly Flake","Midnight Flake","Lavender Flake"],"aero3"],["fcpines","Pine Ridge",["Alpine Ridge","Misty Ridge","Autumn Ridge","Dusk Ridge","Spring Ridge"],"aero3"],["fcmoon","Glossy Moon",["Silver Moon","Harvest Moon Orb","Blue Moon","Mint Moon","Rose Moon"],"aero3"],["fcleaffan","Leaf Fan",["Fan Green","Fan Lime","Fan Teal","Fan Maple","Fan Gold"],"aero3"],["fcgrove","Bamboo Grove",["Fresh Grove","Young Grove","Jade Grove","Golden Grove","Misty Grove"],"aero3"],["fchorizontext","Horizon Text",["Sea Horizon","Sunset Horizon","Field Horizon","Lagoon Horizon","Dusk Horizon"],"aero3"],["fcsilver","Silver Chrome Pill",["Chrome Aqua","Chrome Mint","Chrome Rose","Chrome Lime","Chrome Indigo"],"aero3"],["fcwavefill","Wave Fill",["Sea Fill","Lime Fill","Mango Fill","Cherry Fill","Plum Fill"],"aero3"],["fcprismfan","Prism Fan",["Clear Fan","Sky Fan","Mint Fan","Rose Fan","Amber Fan"],"aero3"],["fcvisor","Smoked Visor",["Visor Graphite","Visor Blue","Visor Green","Visor Plum","Visor Amber"],"aero3"],["fcunderglow","Underglow Glass",["Cyan Underglow","Lime Underglow","Sunset Underglow","Aqua Underglow","Violet Underglow"],"aero3"],["fcfoil","Hologram Foil",["Opal Foil","Seafoam Foil","Peach Foil","Iris Foil","Citrus Foil"],"aero3"],["fcbrackets","Gel Brackets",["Aqua Brackets","Lime Brackets","Pink Brackets","Orange Brackets","Purple Brackets"],"aero3"],["fcjellycube","Jelly Cube",["Cherry Cube","Lime Cube","Blueberry Cube","Orange Cube","Grape Cube"],"aero3"],["fcwrapper","Candy Wrapper",["Strawberry Wrap","Mint Wrap","Blue Wrap","Orange Wrap","Grape Wrap"],"aero3"],["fcgumball","Gumball Mix",["Classic Gumballs","Sour Gumballs","Berry Gumballs","Ocean Gumballs","Pastel Gumballs"],"aero3"],["fcsplash","Splash Pill",["Splash Blue","Splash Lime","Splash Rose","Splash Teal","Splash Violet"],"aero3"],["fcshelf","Glass Shelf",["Shelf Aqua","Shelf Leaf","Shelf Coral","Shelf Orchid","Shelf Graphite"],"aero3"],["fcspheres","Floating Spheres",["Sky Spheres","Spring Spheres","Blossom Spheres","Ocean Spheres","Sunny Spheres"],"aero3"],["fctwist","Twisted Ribbons",["Aqua Twist","Spring Twist","Rose Twist","Ocean Twist","Sunset Twist"],"aero3"],["fcrings","Ring Wallpaper",["Blue Rings","Green Rings","Pink Rings","Teal Rings","Lilac Rings"],"aero3"],["fcpricetag","Web Price Tag",["Tag Blue","Tag Green","Tag Orange","Tag Pink","Tag Steel"],"aero3"],["fcaward","Award Ribbon",["Blue Award","Green Award","Red Award","Orange Award","Purple Award"],"aero3"],["fcstepper","Glass Stepper",["Stepper Green","Stepper Blue","Stepper Orange","Stepper Pink","Stepper Teal"],"aero3"],["fcnotify","Notification Badge",["Inbox Blue","Chat Green Tile","Maps Tile","Photos Tile","Store Tile"],"aero3"],["fcwindripple","Wind Ripples",["Peach Ripples","Mint Ripples","Lavender Ripples","Sand Ripples","Sky Ripples"],"aero3"],["fcretrosun","Retro Sunset",["Tropic Retro","Pink Retro","Purple Retro","Ocean Retro","Teal Retro"],"aero3"],["fcvines","Hanging Vines",["Jungle Vines","Rain Vines","Lime Vines","Grotto Vines","Sunset Vines"],"aero3"],["fccurrent","River Current",["Blue Current","Forest Current","Glacier Current","Lagoon Current","Twilight Current"],"aero3"],["fcfoam","Bubble Bath",["Aqua Bath","Lime Bath","Berry Bath","Mint Bath","Lavender Bath"],"aero3"],["fcarc","Glass Arc",["Blue Arc","Green Arc","Coral Arc","Teal Arc","Violet Arc"],"aero3"],["fcsprout","Sprout Badge",["Sprout Green","Sprout Sea","Sprout Sky","Sprout Sun","Sprout Bloom"],"aero3"],["fcloop","Loop Ring",["Green Loop","Teal Loop","Sky Loop","Sun Loop","Violet Loop"],"aero3"],["fcplug","Power Plug",["Plug Green","Plug Blue","Plug Amber","Plug Teal","Plug Violet"],"aero3"],["fcbarchart","Bar Chart",["Growth Chart","Blue Chart","Warm Chart","Teal Chart","Violet Chart"],"aero3"],["fcstonestack","Stone Stack",["River Stack","Jade Stack","Sea Glass Stack","Sand Stack","Slate Stack"],"aero3"],["fcbrick","Glass Brick",["Ice Brick","Emerald Brick","Ruby Brick","Amethyst Brick","Citrine Brick"],"aero3"],["fccorona","Corona Glow",["Sky Corona","Leaf Corona","Sun Corona","Rose Corona","Iris Corona"],"aero3"],["fcstreak","Light Streak",["Warm Streak","Cool Streak","Fresh Streak","Golden Streak","Dream Streak"],"aero3"],["fcglaciertext","Glacier Text",["Glacier Blue","Glacier Mint","Glacier Lilac","Glacier Rose","Glacier Steel"],"aero3"],["fcrippletext","Rippling Text",["Ocean Ripple","Lagoon Ripple","Spring Ripple","Lilac Ripple","Coral Ripple"],"aero3"],["fccandytext","Candy Text",["Cherry Candy Text","Mint Candy Text","Blue Candy Text","Orange Candy Text","Grape Candy Text"],"aero3"],["fcmetaltext","Metal Text",["Blue Metal","Green Metal","Red Metal","Gold Metal","Violet Metal"],"aero3"],["fcspringtext","Spring Text",["Meadow Spring","Lime Spring","Sea Spring","Blossom Spring","Sun Spring"],"aero3"],["fccontrail","Contrail Pill",["Blue Contrail","Mint Contrail","Peach Contrail","Lilac Contrail","Lemon Contrail"],"aero3"],["fcpatch","Stitched Patch",["Aqua Patch","Lime Patch","Pink Patch","Orange Patch","Purple Patch"],"aero3"],["fcheadercard","Header Card",["Blue Header Card","Green Header Card","Sunset Header Card","Berry Header Card","Ocean Header Card"],"aero3"],["fcrange","Aqua Range",["Range Blue","Range Gold","Range Green","Range Purple","Range Teal"],"aero3"],["plripple","Pool Ripples",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plcaustic","Caustic Light",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plsurface","Water Surface",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plscallop","Scalloped Waves",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plsplash","Splash",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plbubbles","Rising Bubbles",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["pldeep","Deep End",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["plshimmer","Sun Shimmer",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["plclear","Clear Water",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plrays","Underwater Rays",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["pldrop","Water Drop",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plshore","Shoreline",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plwake","Swimmer's Wake",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plmist","Sprinkler Mist",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plsunref","Sun Reflection",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["pltiles","Pool Tiles",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["plmosaic","Mosaic",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["pllane","Lane Line",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["plrope","Lane Rope",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plbuoy","Buoy Ring",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["pldepth","Depth Marker",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plnodive","No Diving",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plcoping","Pool Coping",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plgutter","Overflow Gutter",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["pldrain","Drain Grate",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plladder","Pool Ladder",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["plboard","Diving Board",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["plblock","Starting Block",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["pllight","Pool Light",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plskimmer","Skimmer Lid",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["pldeck","Pool Deck",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plterrazzo","Terrazzo",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plwaterline","Waterline Tile",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plnighttile","Night Tiles",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plpenny","Penny Tile",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plring","Life Ring",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["plbeachball","Beach Ball",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["plnoodle","Pool Noodle",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["pltube","Inner Tube",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plkick","Kickboard",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["plgoggles","Goggles",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plcap","Swim Cap",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plfloatie","Arm Floatie",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plraft","Pool Raft",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plwhistle","Whistle",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plrescue","Rescue Tube",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["pltower","Guard Tower",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["plflags","Backstroke Flags",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["plumbrella","Sun Umbrella",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plcabana","Cabana Stripes",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["pltowel","Pool Towel",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plweave","Lounger Weave",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plflipflop","Flip-Flops",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plsunscreen","Sunscreen",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plshades","Mirror Shades",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plicepop","Ice Pop",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["plsoda","Orange Soda",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["plslush","Blue Slush",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["plcitrus","Orange Slice",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plcocktail","Drink Umbrella",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["plmotel","Motel Pool Sign",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plneon","Neon Night Swim",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plpalms","Palm Springs",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["platomic","Atomic Starburst",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plpostcard","Retro Postcard",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plsunset","Poolside Sunset",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["plmorning","Morning Swim",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["plheat","Heat Wave",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["plchlorine","Chlorine Fresh",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plscore","Scoreboard",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["plpace","Pace Clock",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plcaution","Splash Zone",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plslide","Water Slide",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plcannon","Cannonball",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plpass","Pool Pass",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plband","Wristband",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["plsticker","Swim Club Sticker",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["plpatch","Lifeguard Patch",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["plpin","Pool Club Pin",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plvarsity","Varsity Swim",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["plstencil","Deck Stencil",["Lifeguard","Popsicle","Sunset Swim","Deep End","Marigold Lane"],"pool"],["plinflate","Inflatable Letters",["Tangerine Tile","Lifeguard","Popsicle","Sunset Swim","Deep End"],"pool"],["plgel","Aqua Pool Gel",["Cabana","Tangerine Tile","Lifeguard","Popsicle","Sunset Swim"],"pool"],["plfade","Sun to Water Text",["Copacabana","Cabana","Tangerine Tile","Lifeguard","Popsicle"],"pool"],["plsplashtext","Splash Text",["Shallow End","Copacabana","Cabana","Tangerine Tile","Lifeguard"],"pool"],["plripplet","Ripple Text",["Night Swim","Shallow End","Copacabana","Cabana","Tangerine Tile"],"pool"],["plpolaroid","Pool Polaroid",["Marigold Lane","Night Swim","Shallow End","Copacabana","Cabana"],"pool"],["pltape","Summer Tape",["Deep End","Marigold Lane","Night Swim","Shallow End","Copacabana"],"pool"],["plradio","Poolside Radio",["Sunset Swim","Deep End","Marigold Lane","Night Swim","Shallow End"],"pool"],["plwaveedge","Wave Edge",["Popsicle","Sunset Swim","Deep End","Marigold Lane","Night Swim"],"pool"],["pwcrest","Wave Crest",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwrefract","Refraction",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwshallows","Sunlit Shallows",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwringlet","Ripple Ring",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwdroptrail","Droplet Trail",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwfoam","Foam Edge",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwwhirl","Whirlpool",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwjets","Jacuzzi Jets",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwburst","Splash Burst",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwglass","Water Glass",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwwetglass","Wet Glass",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwshine","Reflection Shine",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwundertow","Undertow",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwmistglow","Mist Glow",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwtidegrad","Tide Gradient",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwbigtile","Big Tiles",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwsubway","Subway Tile",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwhexpenny","Hex Penny",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwbullnose","Bullnose Edge",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwlanenum","Lane Number",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwdraincover","Drain Cover",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwsteps","Pool Steps",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwhandrail","Handrail",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwchevron","Lane Chevrons",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwdashrope","Dashed Rope",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwplanks","Deck Planks",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwconcrete","Concrete Deck",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwgate","Pool Gate",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwlattice","Fence Lattice",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwgauge","Pump Gauge",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwpleats","Filter Pleats",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwthermo","Thermometer",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwcover","Pool Cover",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwinfinity","Infinity Edge",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwarc","Water Arc",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwdivering","Dive Ring Toy",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwdivestick","Dive Stick",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwsquirt","Squirt Gun",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwballoon","Water Balloon",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwsnorkel","Snorkel",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwflippers","Flippers",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwdonut","Swim Donut",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwmattress","Float Mattress",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwducky","Rubber Ducky",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwbuckethat","Bucket Hat",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwvisor","Sun Visor",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwtowelroll","Rolled Towel",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwbagweave","Beach Bag Weave",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwcooler","Cooler Box",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwstraw","Cup & Straw",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwsmoothie","Smoothie Swirl",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwfreezepop","Freeze Pop",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwsnowcone","Snow Cone",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwtwistrim","Candy Twist Rim",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwsunhat","Sun Hat",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwsandal","Sandal Straps",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwroundshades","Round Shades",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwdrip","Lotion Drip",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwwatch","Swim Watch",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwmegaphone","Megaphone",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwneontube","Neon Pool Tube",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwarrowsign","Motel Arrow",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwmarquee","Marquee Bulbs",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwsnackbar","Snack Bar Board",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwpolka","Polka Swimsuit",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwstripesuit","Striped Suit",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwgingham","Gingham Picnic",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwhalfsun","Halftone Sun",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwriso","Riso Print",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwbadge","Vintage Badge",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwribbon","Ribbon Banner",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwpennant","Swim Pennant",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwstamp","Pool Stamp",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwmedal","Swim Medal",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwtrophy","Trophy Plate",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwlcd","Stopwatch LCD",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwlapcount","Lap Counter",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwpixelwave","Pixel Wave",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwglitch","Glitch Splash",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwholo","Holo Water",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["pwjelly","Jelly Float",["Tangerine","Aqua","Sunburn","Lagoon","Creamsicle"],"pool2"],["pwmarble","Glass Marble",["Chlorine","Tangerine","Aqua","Sunburn","Lagoon"],"pool2"],["pwbubble","Bubble Letters",["Marmalade","Chlorine","Tangerine","Aqua","Sunburn"],"pool2"],["pwlongshadow","Long Shadow",["Ice","Marmalade","Chlorine","Tangerine","Aqua"],"pool2"],["pwoutline","Outline Pill",["Apricot","Ice","Marmalade","Chlorine","Tangerine"],"pool2"],["pwdotted","Dotted Float",["Deep Dive","Apricot","Ice","Marmalade","Chlorine"],"pool2"],["pwwavyline","Wavy Underline",["Creamsicle","Deep Dive","Apricot","Ice","Marmalade"],"pool2"],["pwhighlight","Highlighter Swipe",["Lagoon","Creamsicle","Deep Dive","Apricot","Ice"],"pool2"],["pwduo","Duotone Split",["Sunburn","Lagoon","Creamsicle","Deep Dive","Apricot"],"pool2"],["pwsunsetmono","Mono Sunset",["Aqua","Sunburn","Lagoon","Creamsicle","Deep Dive"],"pool2"],["ptglitter","Glitter Water",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptdapple","Sun Dapples",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptcrown","Splash Crown",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["ptcolumn","Bubble Column",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["pttarget","Ripple Target",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptwaveunder","Wave Underline",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"],["ptombre","Pool Ombre",["High Dive","Orangeade","Lido","Deep Lane","Chlorine Blue"],"pool3"],["ptrain","Rain on the Pool",["Swim Meet","Sunset Deck","Riviera","Chlorine Blue","Mango Float"],"pool3"],["ptnightglow","Night Pool Glow",["Lido","Mango Float","High Dive","Splash Pad","Deep Lane"],"pool3"],["ptsunbeam","Sunbeam Rays",["Riviera","Orangeade","Swim Meet","Deep Lane","Sunset Deck"],"pool3"],["pthorizon","Horizon Split",["High Dive","Sunset Deck","Lido","Chlorine Blue","Splash Pad"],"pool3"],["pticecube","Ice Cube",["Swim Meet","Mango Float","Riviera","Splash Pad","Orangeade"],"pool3"],["ptsteam","Hot Tub Steam",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptfizz","Fizzy Splash",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptwavegloss","Wave Gloss",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["ptkidney","Kidney Pool",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["ptlapfloats","Lap Pool Floats",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptdivewell","Diving Well",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"],["ptspajets","Spa Jet Ring",["High Dive","Orangeade","Lido","Deep Lane","Chlorine Blue"],"pool3"],["ptchecker","Checker Border",["Swim Meet","Sunset Deck","Riviera","Chlorine Blue","Mango Float"],"pool3"],["ptorangegrout","Orange Grout",["Lido","Mango Float","High Dive","Splash Pad","Deep Lane"],"pool3"],["ptmosaicstrip","Mosaic Strip",["Riviera","Orangeade","Swim Meet","Deep Lane","Sunset Deck"],"pool3"],["ptdepthtile","Depth Tile",["High Dive","Sunset Deck","Lido","Chlorine Blue","Splash Pad"],"pool3"],["ptstones","Coping Stones",["Swim Meet","Mango Float","Riviera","Splash Pad","Orangeade"],"pool3"],["ptswag","Rope Swag",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptdeckdiag","Diagonal Deck",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptpickets","Picket Fence",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["ptwaterfall","Waterfall Wall",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["ptguardseat","Guard Seat",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptbeacon","Pool Alarm Beacon",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"],["ptpipes","Pump Room Pipes",["High Dive","Orangeade","Lido","Deep Lane","Chlorine Blue"],"pool3"],["ptporthole","Underwater Window",["Swim Meet","Sunset Deck","Riviera","Chlorine Blue","Mango Float"],"pool3"],["ptshower","Poolside Shower",["Lido","Mango Float","High Dive","Splash Pad","Deep Lane"],"pool3"],["ptrules","Pool Rules Sign",["Riviera","Orangeade","Swim Meet","Deep Lane","Sunset Deck"],"pool3"],["ptstripering","Striped Inflatable",["High Dive","Sunset Deck","Lido","Chlorine Blue","Splash Pad"],"pool3"],["ptwings","Water Wings",["Swim Meet","Mango Float","Riviera","Splash Pad","Orangeade"],"pool3"],["ptvolley","Pool Volleyball",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptpolocap","Water Polo Cap",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptpaddles","Hand Paddles",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["pttorpedo","Dive Torpedo",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["pthoop","Pool Hoop",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptlounge","Lounge Float",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"],["ptbucket","Splash Bucket",["High Dive","Orangeade","Lido","Deep Lane","Chlorine Blue"],"pool3"],["ptmask","Snorkel Mask",["Swim Meet","Sunset Deck","Riviera","Chlorine Blue","Mango Float"],"pool3"],["ptstrap","Goggle Strap",["Lido","Mango Float","High Dive","Splash Pad","Deep Lane"],"pool3"],["ptvtowel","Vertical Towel",["Riviera","Orangeade","Swim Meet","Deep Lane","Sunset Deck"],"pool3"],["ptaviator","Aviator Shades",["High Dive","Sunset Deck","Lido","Chlorine Blue","Splash Pad"],"pool3"],["ptsqueeze","Squeeze Tube",["Swim Meet","Mango Float","Riviera","Splash Pad","Orangeade"],"pool3"],["ptorangeade","Orangeade Glass",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptlolly","Swirl Lolly",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptfloat","Soda Float",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["ptshaved","Shaved Ice",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["ptjuicebox","Juice Box",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptbitten","Bitten Pop",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"],["ptlanyard","Pool Pass Lanyard",["High Dive","Orangeade","Lido","Deep Lane","Chlorine Blue"],"pool3"],["ptziplock","Dry Pouch",["Swim Meet","Sunset Deck","Riviera","Chlorine Blue","Mango Float"],"pool3"],["ptbagtag","Bag Tag",["Lido","Mango Float","High Dive","Splash Pad","Deep Lane"],"pool3"],["ptcap","Swim Team Cap",["Riviera","Orangeade","Swim Meet","Deep Lane","Sunset Deck"],"pool3"],["ptrescueboard","Rescue Board",["High Dive","Sunset Deck","Lido","Chlorine Blue","Splash Pad"],"pool3"],["ptnoodles","Noodle Twins",["Swim Meet","Mango Float","Riviera","Splash Pad","Orangeade"],"pool3"],["ptfirstaid","First Aid Cross",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptscript","Swim Club Script",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptinvite","Party Invite",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["ptneonwave","Neon Wave Sign",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["ptboomerang","Boomerang Sign",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptgoogie","Googie Sparkles",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"],["ptboomprint","Boomerang Print",["High Dive","Orangeade","Lido","Deep Lane","Chlorine Blue"],"pool3"],["pttileletters","Tile Letters",["Swim Meet","Sunset Deck","Riviera","Chlorine Blue","Mango Float"],"pool3"],["ptsleeve","Varsity Sleeve",["Lido","Mango Float","High Dive","Splash Pad","Deep Lane"],"pool3"],["ptjersey","Swim Team Jersey",["Riviera","Orangeade","Swim Meet","Deep Lane","Sunset Deck"],"pool3"],["ptsplitflap","Split-Flap Board",["High Dive","Sunset Deck","Lido","Chlorine Blue","Splash Pad"],"pool3"],["ptadmit","Admit One",["Swim Meet","Mango Float","Riviera","Splash Pad","Orangeade"],"pool3"],["ptbooth","Photo Booth Strip",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptslide","Film Slide",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptwavestamp","Wave Postage",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["ptcalendar","Summer Calendar",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["ptmixtape","Summer Mixtape",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptspeakers","Boombox Speakers",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"],["ptsurf","Surf Sticker",["High Dive","Orangeade","Lido","Deep Lane","Chlorine Blue"],"pool3"],["ptgumbubble","Gum Bubble",["Swim Meet","Sunset Deck","Riviera","Chlorine Blue","Mango Float"],"pool3"],["ptpopdots","Pop Art Dots",["Lido","Mango Float","High Dive","Splash Pad","Deep Lane"],"pool3"],["ptcomicburst","Comic Splash",["Riviera","Orangeade","Swim Meet","Deep Lane","Sunset Deck"],"pool3"],["ptextrude","3D Extrude Text",["High Dive","Sunset Deck","Lido","Chlorine Blue","Splash Pad"],"pool3"],["ptoutlineduo","Outline Duo Text",["Swim Meet","Mango Float","Riviera","Splash Pad","Orangeade"],"pool3"],["ptvgrad","Dive Gradient Text",["Lido","Orangeade","High Dive","Deep Lane","Chlorine Blue"],"pool3"],["ptchrome","Chrome Pool Text",["Riviera","Sunset Deck","Swim Meet","Chlorine Blue","Mango Float"],"pool3"],["ptfrosted","Frosted Cabana",["High Dive","Mango Float","Lido","Splash Pad","Deep Lane"],"pool3"],["ptcapsule","Duo Capsule",["Swim Meet","Orangeade","Riviera","Deep Lane","Sunset Deck"],"pool3"],["pttoggle","Pool Toggle",["Lido","Sunset Deck","High Dive","Chlorine Blue","Splash Pad"],"pool3"],["ptsunring","Sunset Ring",["Riviera","Mango Float","Swim Meet","Splash Pad","Orangeade"],"pool3"]];
var US_STYLES = [];
US_FAMILIES.forEach(function (f) {
    f[2].forEach(function (pal, i) {
        US_STYLES.push({ id: f[0] + '-' + (i + 1), fam: f[0], famName: f[1], name: pal, col: f[3] || 'regular', cls: 'us-chip us-' + f[0] + ' us-' + f[0] + '-' + (i + 1) });
    });
});
var US_PREF_KEY = 'bitbook_unique_chip_style';
var usSelected = US_STYLES[0].id;
var usFamFilter = 'all';
var usCollection = 'regular';
var US_COLLECTIONS = ['regular', 'aero', 'aero2', 'aero3', 'pool', 'pool2', 'pool3', 'fav'];
var US_FAV_KEY = 'bitbook_unique_chip_favs';
var US_VIEW_KEY = 'bitbook_unique_chip_view';
var usFavs = [];
try {
    const raw = JSON.parse(localStorage.getItem(US_FAV_KEY) || '[]');
    // Only keep favorites that still exist (styles removed from the gallery drop out)!
    if (Array.isArray(raw)) usFavs = raw.filter(function (id) { return typeof id === 'string' && US_STYLES.some(function (s) { return s.id === id; }); });
} catch (e) {}
var usSavedRange = null;
try {
    const pref = localStorage.getItem(US_PREF_KEY);
    if (pref && US_STYLES.some(function (s) { return s.id === pref; })) usSelected = pref;
} catch (e) {}
function usFind(id) {
    for (let i = 0; i < US_STYLES.length; i++) if (US_STYLES[i].id === id) return US_STYLES[i];
    return US_STYLES[0];
}
function usIsFav(id) { return usFavs.indexOf(id) !== -1; }
function usSaveFavs() {
    try { localStorage.setItem(US_FAV_KEY, JSON.stringify(usFavs)); } catch (e) {}
}
function usToggleFav(id) {
    const i = usFavs.indexOf(id);
    if (i === -1) usFavs.push(id); else usFavs.splice(i, 1);
    usSaveFavs();
    // Find Styles gets this star too (when Receive is on in Settings)!
    try { if (typeof csfGalleryFavChanged === 'function') csfGalleryFavChanged(id, i === -1); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(i === -1 ? 880 : 500, 0.06); } catch (e) {}
    usRefresh();
}
function usLabelForClass(className) {
    const m = String(className || '').match(/us-([a-z]+)-(\d+)/);
    if (!m) return 'Unique Chip';
    const st = usFind(m[1] + '-' + m[2]);
    return 'Unique Chip: ' + st.famName + ' · ' + st.name;
}
function usPreviewText() {
    let t = '';
    try { if (usSavedRange && !usSavedRange.collapsed) t = usSavedRange.toString().replace(/\s+/g, ' ').trim(); } catch (e) {}
    if (!t) return 'Text';
    return t.length > 40 ? t.slice(0, 39) + '…' : t;
}
// UNIQUE CHIP STYLES part 2: the gallery popup!
// The design dropdown only lists the current collection's designs (A-Z)!
function usBuildFamilyOptions() {
    const fams = document.getElementById('us-family');
    if (!fams) return;
    // Favorites lists only the designs you've starred, so it rebuilds when stars change!
    const favStyles = US_STYLES.filter(function (st) { return usIsFav(st.id); });
    const sig = usCollection + (usCollection === 'fav' ? ':' + favStyles.map(function (st) { return st.id; }).join(',') : '');
    if (fams.getAttribute('data-us-sig') === sig) return;
    fams.setAttribute('data-us-sig', sig);
    fams.innerHTML = '';
    const mk = function (key, label) {
        const o = document.createElement('option');
        o.value = key;
        o.textContent = label;
        fams.appendChild(o);
    };
    let inCol;
    if (usCollection === 'fav') {
        const keys = {};
        favStyles.forEach(function (st) { keys[st.fam] = true; });
        inCol = US_FAMILIES.filter(function (f) { return keys[f[0]]; });
        mk('all', 'All favorites (' + favStyles.length + ')');
    } else {
        inCol = US_FAMILIES.filter(function (f) { return (f[3] || 'regular') === usCollection; });
        mk('all', 'All designs (' + (inCol.length * 5) + ')');
    }
    inCol.slice().sort(function (x, y) { return x[1].localeCompare(y[1]); }).forEach(function (f) { mk(f[0], f[1]); });
    if (usFamFilter !== 'all' && !inCol.some(function (f) { return f[0] === usFamFilter; })) usFamFilter = 'all';
    fams.value = usFamFilter;
}
function usSetCollection(col) {
    usCollection = US_COLLECTIONS.indexOf(col) !== -1 ? col : 'regular';
    usFamFilter = 'all';
    try { localStorage.setItem(US_VIEW_KEY, usCollection); } catch (e) {}
    usBuildFamilyOptions();
    document.querySelectorAll('#us-collection [data-us-col]').forEach(function (b) {
        const on = b.getAttribute('data-us-col') === usCollection;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
}
function usBuildGallery() {
    const grid = document.getElementById('us-grid');
    usBuildFamilyOptions();
    if (grid && !grid.children.length) {
        const frag = document.createDocumentFragment();
        US_STYLES.forEach(function (st) {
            // A card: the style button, plus its own star button (no buttons inside buttons)!
            const tile = document.createElement('div');
            tile.className = 'us-tile';
            tile.setAttribute('data-us-style', st.id);
            tile.setAttribute('data-us-fam', st.fam);
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'us-tile-pick';
            b.title = st.famName + ' · ' + st.name + ' (double-click to apply!)';
            const stage = document.createElement('span');
            stage.className = 'us-tile-stage';
            const chip = document.createElement('span');
            chip.className = st.cls;
            chip.textContent = 'Text';
            stage.appendChild(chip);
            const nm = document.createElement('span');
            nm.className = 'us-tile-name';
            nm.textContent = st.name;
            const fm = document.createElement('span');
            fm.className = 'us-tile-fam';
            fm.textContent = st.famName;
            b.appendChild(stage);
            b.appendChild(nm);
            b.appendChild(fm);
            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'us-fav';
            tile.appendChild(b);
            tile.appendChild(star);
            frag.appendChild(tile);
        });
        grid.appendChild(frag);
    }
}
function usPaintStar(btn, st, withLabel) {
    const on = usIsFav(st.id);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + st.famName + ' · ' + st.name + (on ? ' from favorites' : ' to favorites'));
    btn.title = on ? 'Remove from favorites' : 'Add to favorites';
    btn.textContent = (on ? '★' : '☆') + (withLabel ? (on ? ' Favorited' : ' Favorite') : '');
}
function usRefresh() {
    usBuildFamilyOptions();
    const q = ((document.getElementById('us-search') || {}).value || '').trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('#us-grid [data-us-style]').forEach(function (tile) {
        const st = usFind(tile.getAttribute('data-us-style'));
        const inView = usCollection === 'fav' ? usIsFav(st.id) : st.col === usCollection;
        const famOk = inView && (usFamFilter === 'all' || st.fam === usFamFilter);
        const qOk = !q || (st.famName + ' ' + st.name).toLowerCase().indexOf(q) !== -1;
        tile.hidden = !(famOk && qOk);
        if (!tile.hidden) shown++;
        const on = st.id === usSelected;
        tile.classList.toggle('active', on);
        const pick = tile.querySelector('.us-tile-pick');
        if (pick) pick.setAttribute('aria-pressed', on ? 'true' : 'false');
        const star = tile.querySelector('.us-fav');
        if (star) usPaintStar(star, st, false);
    });
    const famSel = document.getElementById('us-family');
    if (famSel && famSel.value !== usFamFilter) famSel.value = usFamFilter;
    const empty = document.getElementById('us-empty');
    if (empty) {
        empty.hidden = shown > 0;
        empty.textContent = (usCollection === 'fav' && !usFavs.length) ? 'No favorites yet! Tap the ☆ on any style to save it here!' : 'No styles match that search!';
    }
    const cnt = document.getElementById('us-count');
    if (cnt) cnt.textContent = shown + (usCollection === 'fav' ? (shown === 1 ? ' favorite' : ' favorites') : (shown === 1 ? ' style' : ' styles'));
    const st = usFind(usSelected);
    const prev = document.getElementById('us-preview');
    if (prev) {
        prev.className = st.cls;
        prev.textContent = usPreviewText();
    }
    const nm = document.getElementById('us-preview-name');
    if (nm) nm.textContent = st.famName + ' · ' + st.name;
    const pfav = document.getElementById('us-fav-btn');
    if (pfav) usPaintStar(pfav, st, true);
}
// UNIQUE CHIP STYLES part 3: open, apply, wire!
function usOpenDialog() {
    const dlg = document.getElementById('uniquechip-dialog');
    if (!dlg) return;
    usSavedRange = null;
    try {
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        const sel = window.getSelection();
        if (cv && sel.rangeCount && cv.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            usSavedRange = sel.getRangeAt(0).cloneRange();
        }
    } catch (e) {}
    usBuildGallery();
    // Open on the view you used last (or the collection your last pick came from)!
    let view = null;
    try { view = localStorage.getItem(US_VIEW_KEY); } catch (e) {}
    usSetCollection(US_COLLECTIONS.indexOf(view) !== -1 ? view : usFind(usSelected).col);
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
    usRefresh();
    try {
        const active = document.querySelector('#us-grid .us-tile.active');
        if (active && !active.hidden && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    } catch (e) {}
}
function usCloseDialog() {
    const dlg = document.getElementById('uniquechip-dialog');
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
function usApplyStyle() {
    const st = usFind(usSelected);
    try { localStorage.setItem(US_PREF_KEY, st.id); } catch (e) {}
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    const range = usSavedRange;
    usSavedRange = null;
    usCloseDialog();
    if (!cv) return false;
    try { cv.focus(); } catch (e) {}
    const chip = document.createElement('span');
    chip.className = st.cls;
    chip.setAttribute('spellcheck', 'false');
    const sel = window.getSelection();
    try {
        if (range && !range.collapsed && cv.contains(range.commonAncestorContainer)) {
            chip.appendChild(range.extractContents());
            range.insertNode(chip);
        } else {
            chip.textContent = 'Text';
            let placed = false;
            if (range && cv.contains(range.startContainer)) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
            try { if (typeof fmtInsertNodeAtCaret === 'function') placed = !!fmtInsertNodeAtCaret(chip); } catch (e) { placed = false; }
            if (!placed && !chip.isConnected) cv.appendChild(chip);
        }
        // Select the chip's text: type to replace it, or Backspace to delete it!
        const r = document.createRange();
        r.selectNodeContents(chip);
        sel.removeAllRanges();
        sel.addRange(r);
    } catch (e) { return false; }
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { if (typeof fmtRenderStyleList === 'function') fmtRenderStyleList(); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
    return true;
}
function usWireSkills() {
    if (usWireSkills._done) return;
    usWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="uniquechip"]').forEach(function (item) {
            item.addEventListener('click', function () {
                usOpenDialog();
                try { closeSkillsMenu(); } catch (e) {}
            });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        try {
            const el = document.getElementById(id);
            if (el) el.addEventListener(ev, fn);
        } catch (e) {}
    };
    on('us-search', 'input', usRefresh);
    on('us-collection', 'click', function (ev) {
        const b = ev.target.closest ? ev.target.closest('[data-us-col]') : null;
        if (!b || b.getAttribute('data-us-col') === usCollection) return;
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.08); } catch (e) {}
        usSetCollection(b.getAttribute('data-us-col'));
        usRefresh();
        try { const g = document.getElementById('us-grid'); if (g) g.scrollTop = 0; } catch (e) {}
    });
    on('us-family', 'change', function () {
        usFamFilter = document.getElementById('us-family').value || 'all';
        usRefresh();
    });
    on('us-grid', 'click', function (ev) {
        const star = ev.target.closest ? ev.target.closest('.us-fav') : null;
        if (star) {
            const t = star.closest('[data-us-style]');
            if (t) usToggleFav(t.getAttribute('data-us-style'));
            return;
        }
        const b = ev.target.closest ? ev.target.closest('[data-us-style]') : null;
        if (!b) return;
        usSelected = b.getAttribute('data-us-style');
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.05); } catch (e) {}
        usRefresh();
    });
    on('us-grid', 'dblclick', function (ev) {
        if (ev.target.closest && ev.target.closest('.us-fav')) return;
        const b = ev.target.closest ? ev.target.closest('[data-us-style]') : null;
        if (!b) return;
        usSelected = b.getAttribute('data-us-style');
        usApplyStyle();
    });
    on('us-fav-btn', 'click', function () { usToggleFav(usSelected); });
    on('us-insert-btn', 'click', function () { usApplyStyle(); });
    on('us-cancel-btn', 'click', function () { usSavedRange = null; usCloseDialog(); });
    on('us-close-btn', 'click', function () { usSavedRange = null; usCloseDialog(); });
    try {
        const dlg = document.getElementById('uniquechip-dialog');
        if (dlg) dlg.addEventListener('click', function (ev) {
            if (ev.target === dlg) { usSavedRange = null; usCloseDialog(); }
        });
    } catch (e) {}
}

// ==========================================
// TIME CAPSULE part 1: seal a message until a date!
// The message is only encoded (base64), not encrypted: it's a fun seal, not a safe!
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
// TIME CAPSULE part 3: dialog + wiring!
function tcSetStatus(msg, kind) {
    const el = document.getElementById('tc-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'bb-status' + (kind ? ' bb-status-' + kind : '');
}
function tcValidate() {
    const msgEl = document.getElementById('tc-msg');
    const whenEl = document.getElementById('tc-when');
    const ins = document.getElementById('tc-insert-btn');
    const msg = msgEl ? msgEl.value.trim() : '';
    const when = whenEl && whenEl.value ? new Date(whenEl.value).getTime() : NaN;
    let ok = false;
    if (!msg) tcSetStatus('Write a message for the future!');
    else if (isNaN(when)) tcSetStatus('Pick when it opens!', 'error');
    else if (when <= Date.now()) tcSetStatus('Pick a time in the future!', 'error');
    else { tcSetStatus('Opens ' + tcFormatDate(when) + ' (in ' + tcLeftLabel(when - Date.now()) + ')!', 'ok'); ok = true; }
    if (ins) ins.disabled = !ok;
    return ok ? { msg: msg, when: when } : null;
}
function tcOpenDialog() {
    const dlg = document.getElementById('capsule-dialog');
    if (!dlg) return;
    tcSavedRange = null;
    try {
        const sel = window.getSelection();
        const cv = document.getElementById('wysiwyg-canvas');
        if (sel.rangeCount && cv && cv.contains(sel.anchorNode)) tcSavedRange = sel.getRangeAt(0).cloneRange();
    } catch (e) {}
    const msgEl = document.getElementById('tc-msg');
    const whenEl = document.getElementById('tc-when');
    const lbl = document.getElementById('tc-label');
    if (msgEl) msgEl.value = '';
    if (lbl) lbl.value = 'Time Capsule';
    if (whenEl) {
        whenEl.value = tcLocalInputValue(Date.now() + 7 * 86400000);
        whenEl.min = tcLocalInputValue(Date.now() + 60000);
    }
    tcValidate();
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
    try { if (msgEl) msgEl.focus(); } catch (e) {}
}
function tcCloseDialog() {
    const dlg = document.getElementById('capsule-dialog');
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
function tcInsertChip() {
    const v = tcValidate();
    if (!v) return;
    const lbl = document.getElementById('tc-label');
    const label = (lbl && lbl.value.trim()) || 'Time Capsule';
    const chip = tcBuildChip(label, v.msg, v.when);
    tcCloseDialog();
    skInsertChipAt(chip, tcSavedRange);
}
// ==========================================
// SKILL HELPERS: open/close a dialog + remember the caret, shared by the 3 new skills!
// ==========================================
function sk3SaveRange() {
    try {
        const sel = window.getSelection();
        const cv = document.getElementById('wysiwyg-canvas');
        if (sel.rangeCount && cv && cv.contains(sel.anchorNode)) return sel.getRangeAt(0).cloneRange();
    } catch (e) {}
    return null;
}
function sk3Open(id) {
    const dlg = document.getElementById(id);
    if (!dlg) return;
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
}
function sk3Close(id) {
    const dlg = document.getElementById(id);
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
function sk3Wire(skill, dlgId, openFn, insertFn, prefix) {
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="' + skill + '"]').forEach(function (item) {
            item.addEventListener('click', function () {
                openFn();
                try { closeSkillsMenu(); } catch (e) {}
            });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(ev, fn);
    };
    on(prefix + '-insert-btn', 'click', insertFn);
    on(prefix + '-cancel-btn', 'click', function () { sk3Close(dlgId); });
    on(prefix + '-close-btn', 'click', function () { sk3Close(dlgId); });
    const dlg = document.getElementById(dlgId);
    if (dlg) dlg.addEventListener('click', function (ev) { if (ev.target === dlg) sk3Close(dlgId); });
}
// Chips are atomic: press handling without moving the caret!
function sk3ChipClicks(selector, fn) {
    const cv = document.getElementById('wysiwyg-canvas');
    if (!cv) return;
    cv.addEventListener('mousedown', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest(selector) : null;
        if (chip) ev.preventDefault();
    });
    cv.addEventListener('click', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest(selector) : null;
        if (!chip) return;
        ev.preventDefault();
        fn(chip);
    });
}

// ==========================================
// FLASHCARD: front + back, click to flip!
// ==========================================
var flSavedRange = null;
function flValidate() {
    const f = (document.getElementById('fl-front') || {}).value || '';
    const b = (document.getElementById('fl-back') || {}).value || '';
    const ok = !!f.trim() && !!b.trim();
    const btn = document.getElementById('fl-insert-btn');
    if (btn) btn.disabled = !ok;
    return ok ? { front: f.trim(), back: b.trim() } : null;
}
function flOpenDialog() {
    flSavedRange = sk3SaveRange();
    ['fl-front', 'fl-back'].forEach(function (id) { const el = document.getElementById(id); if (el) el.value = ''; });
    flValidate();
    sk3Open('flashcard-dialog');
    try { document.getElementById('fl-front').focus(); } catch (e) {}
}
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
function flInsert() {
    const v = flValidate();
    if (!v) return;
    sk3Close('flashcard-dialog');
    skInsertChipAt(flBuildChip(v.front, v.back), flSavedRange);
}
function flFlip(chip) {
    chip.classList.toggle('fl-flipped');
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(chip.classList.contains('fl-flipped') ? 820 : 620, 0.06); } catch (e) {}
}
function flWireSkills() {
    if (flWireSkills._done) return;
    flWireSkills._done = true;
    sk3Wire('flashcard', 'flashcard-dialog', flOpenDialog, flInsert, 'fl');
    ['fl-front', 'fl-back'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', flValidate);
    });
    sk3ChipClicks('.fl-chip', flFlip);
}

// ==========================================
// FOCUS TIMER: a Pomodoro-style countdown chip! Click to start, click again to reset!
// The end time is stored on the chip, so a running timer survives a reload!
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
function pmSetMinutes(m) {
    pmMinutes = m;
    document.querySelectorAll('#timer-dialog [data-pm-min]').forEach(function (b) {
        b.classList.toggle('active', parseFloat(b.getAttribute('data-pm-min')) === m);
    });
    const custom = document.getElementById('pm-custom');
    if (custom && document.activeElement !== custom) custom.value = String(m);
}
function pmOpenDialog() {
    pmSavedRange = sk3SaveRange();
    const lbl = document.getElementById('pm-label');
    if (lbl) lbl.value = 'Focus';
    pmSetMinutes(25);
    sk3Open('timer-dialog');
}
function pmInsert() {
    const lbl = document.getElementById('pm-label');
    const label = (lbl && lbl.value.trim()) || 'Focus';
    const mins = Math.max(1, Math.min(180, pmMinutes || 25));
    sk3Close('timer-dialog');
    skInsertChipAt(pmBuildChip(label, mins), pmSavedRange);
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
function pmWireSkills() {
    if (pmWireSkills._done) return;
    pmWireSkills._done = true;
    sk3Wire('timer', 'timer-dialog', pmOpenDialog, pmInsert, 'pm');
    document.querySelectorAll('#timer-dialog [data-pm-min]').forEach(function (b) {
        b.addEventListener('click', function () { pmSetMinutes(parseFloat(b.getAttribute('data-pm-min'))); });
    });
    const custom = document.getElementById('pm-custom');
    if (custom) custom.addEventListener('input', function () {
        const v = parseFloat(custom.value);
        if (isFinite(v) && v > 0) pmSetMinutes(Math.min(180, v));
    });
    sk3ChipClicks('.pm-chip', pmToggle);
    const cv = document.getElementById('wysiwyg-canvas');
    pmSweep();
    try {
        if (cv) new MutationObserver(function (recs) {
            for (const r of recs) { if (r.type === 'childList' && r.addedNodes.length) { pmSweep(); return; } }
        }).observe(cv, { childList: true, subtree: true });
    } catch (e) {}
}

// ==========================================
// DICE ROLLER: pick NdS, click the chip to roll (fair, using crypto)!
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
function dcSetChoice() {
    document.querySelectorAll('#dice-dialog [data-dc-count]').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-dc-count'), 10) === dcCount); });
    document.querySelectorAll('#dice-dialog [data-dc-sides]').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-dc-sides'), 10) === dcSides); });
    const prev = document.getElementById('dc-preview');
    if (prev) prev.textContent = dcCount + 'd' + dcSides;
}
function dcOpenDialog() {
    dcSavedRange = sk3SaveRange();
    dcSetChoice();
    sk3Open('dice-dialog');
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
function dcInsert() {
    sk3Close('dice-dialog');
    skInsertChipAt(dcBuildChip(dcCount, dcSides), dcSavedRange);
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
function dcWireSkills() {
    if (dcWireSkills._done) return;
    dcWireSkills._done = true;
    sk3Wire('dice', 'dice-dialog', dcOpenDialog, dcInsert, 'dc');
    document.querySelectorAll('#dice-dialog [data-dc-count]').forEach(function (b) {
        b.addEventListener('click', function () { dcCount = parseInt(b.getAttribute('data-dc-count'), 10) || 1; dcSetChoice(); });
    });
    document.querySelectorAll('#dice-dialog [data-dc-sides]').forEach(function (b) {
        b.addEventListener('click', function () { dcSides = parseInt(b.getAttribute('data-dc-sides'), 10) || 20; dcSetChoice(); });
    });
    sk3ChipClicks('.dc-chip', dcRollChip);
}

function tcWireSkills() {
    if (tcWireSkills._done) return;
    tcWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="capsule"]').forEach(function (item) {
            item.addEventListener('click', function () {
                tcOpenDialog();
                try { closeSkillsMenu(); } catch (e) {}
            });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        try {
            const el = document.getElementById(id);
            if (el) el.addEventListener(ev, fn);
        } catch (e) {}
    };
    on('tc-msg', 'input', tcValidate);
    on('tc-when', 'input', tcValidate);
    on('tc-when', 'change', tcValidate);
    document.querySelectorAll('#capsule-dialog [data-tc-add]').forEach(function (b) {
        b.addEventListener('click', function () {
            const whenEl = document.getElementById('tc-when');
            if (!whenEl) return;
            const d = new Date();
            const add = b.getAttribute('data-tc-add');
            if (add === 'day') d.setDate(d.getDate() + 1);
            else if (add === 'week') d.setDate(d.getDate() + 7);
            else if (add === 'month') d.setMonth(d.getMonth() + 1);
            else if (add === 'year') d.setFullYear(d.getFullYear() + 1);
            whenEl.value = tcLocalInputValue(d.getTime());
            tcValidate();
        });
    });
    on('tc-insert-btn', 'click', function () { tcInsertChip(); });
    on('tc-cancel-btn', 'click', function () { tcCloseDialog(); });
    on('tc-close-btn', 'click', function () { tcCloseDialog(); });
    try {
        const dlg = document.getElementById('capsule-dialog');
        if (dlg) dlg.addEventListener('click', function (ev) { if (ev.target === dlg) tcCloseDialog(); });
    } catch (e) {}
    const cv = document.getElementById('wysiwyg-canvas');
    if (!cv) return;
    cv.addEventListener('mousedown', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest('.tc-chip') : null;
        if (chip) ev.preventDefault();
    });
    cv.addEventListener('click', function (ev) {
        const chip = ev.target && ev.target.closest ? ev.target.closest('.tc-chip') : null;
        if (!chip) return;
        ev.preventDefault();
        tcToggleChip(chip);
    });
    // Countdowns tick quietly (the autosave skips .tc-chip-count text)!
    tcSweep();
    try {
        new MutationObserver(function (recs) {
            for (const r of recs) {
                if (r.type === 'childList' && r.addedNodes.length) { tcSweep(); return; }
            }
        }).observe(cv, { childList: true, subtree: true });
    } catch (e) {}
    if (!tcTimer) tcTimer = setInterval(tcSweep, 15000);
}

// Drop one node at the caret (ranged selections collapse to the end first)!
// One divider design everywhere (menu + typed share it)!
function kdBuildDivider() {
    const div = document.createElement('div');
    div.className = 'aero-liquid-divider';
    div.setAttribute('contenteditable', 'false');
    return div;
}

function fmtInsertNodeAtCaret(node) {
    if (typeof canvas === 'undefined' || !canvas || !node) return false;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
    try {
        const range = sel.getRangeAt(0);
        if (!sel.isCollapsed) range.collapse(false);
        range.insertNode(node);
        // Splitting leaves empty husks around the insert -- sweep them!
        try {
            const prev = node.previousSibling;
            if (prev && prev.nodeType === 3 && prev.nodeValue === '') prev.remove();
            const next = node.nextSibling;
            if (next && next.nodeType === 3 && next.nodeValue === '') next.remove();
        } catch (e) {}
        const caret = document.createRange();
        caret.setStartAfter(node);
        caret.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caret);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        return true;
    } catch (e) { return false; }
}

function fmtInsertTextAtCaret(text) {
    return fmtInsertNodeAtCaret(document.createTextNode(String(text)));
}

function runInsertKind(kind) {
    closeInsertMenu();
    if (typeof canvas === 'undefined' || !canvas) return;
    playAeroClickSound(700, 0.08);
    // Snapshot the range: focusing the canvas may nudge the caret!
    let saved = null;
    try {
        const sel = window.getSelection();
        if (sel.rangeCount && canvas.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange();
    } catch (e) {}
    try { canvas.focus(); } catch (e) {}
    try {
        if (saved) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(saved);
        }
    } catch (e) {}
    if (kind === 'timestamp') {
        fmtInsertTextAtCaret(new Date().toLocaleString());
    } else if (kind === 'date') {
        fmtInsertTextAtCaret(new Date().toLocaleDateString());
    } else if (kind === 'divider') {
        // Dividers render at the caret -- or the very end with no selection!
        if (!fmtInsertNodeAtCaret(kdBuildDivider())) {
            const node = kdBuildDivider();
            canvas.appendChild(node);
            try {
                const caret = document.createRange();
                caret.setStartAfter(node);
                caret.collapse(true);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(caret);
            } catch (e) {}
            if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        }
    } else if (kind === 'image') {
        const picker = document.getElementById('insert-image-input');
        if (picker) picker.click();
    } else if (kind === 'file') {
        const picker = document.getElementById('insert-file-input');
        if (picker) picker.click();
    } else if (kind === 'symbols') {
        syOpenDialog();
    } else if (kind === 'link') {
        let url = null;
        try { url = (typeof window.prompt === 'function') ? window.prompt('Link URL:', 'https://') : null; } catch (e) { url = null; }
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        a.target = '_blank';
        fmtInsertNodeAtCaret(a);
    }
}

function fmtFileSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (Math.round(n / 102.4) / 10) + ' KB';
    return (Math.round(n / 104857.6) / 10) + ' MB';
}

function fmtFileStem(name) {
    const s = String(name || 'file');
    const m = s.match(/^(.*)(\.[a-z0-9]{1,8})$/i);
    return { stem: m ? (m[1] || s) : s, ext: m ? m[2] : '' };
}

function fmtFileExt(name, type) {
    const m = String(name || '').match(/\.([a-z0-9]{1,8})$/i);
    const ext = m ? m[1].toUpperCase() : '';
    if (ext && type) return ext + ' · ' + type;
    return ext || type || 'file';
}

// Uploaded-file pill (bytes ride along in attributes so reloads keep working)!
function fmtInsertFileChip(name, type, size, dataUrl) {
    if (!dataUrl) return false;
    const chip = document.createElement('span');
    chip.className = 'file-chip';
    chip.setAttribute('spellcheck', 'false');
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-filename', name || 'file');
    chip.setAttribute('data-filetype', type || '');
    chip.setAttribute('data-filesize', String(size || 0));
    chip.setAttribute('data-filedata', dataUrl);
    const ico = document.createElement('span');
    ico.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>';
    const nm = document.createElement('span');
    nm.className = 'file-chip-name';
    nm.textContent = fmtFileStem(name || 'file').stem;
    chip.appendChild(ico);
    chip.appendChild(nm);
    return fmtInsertNodeAtCaret(chip);
}

var fmtFileChipData = null;

function fmtOpenFileChip(chip, x, y) {
    if (!chip) return false;
    fmtFileChipNode = chip;
    fmtFileChipData = {
        name: chip.getAttribute('data-filename') || 'file',
        type: chip.getAttribute('data-filetype') || '',
        size: parseInt(chip.getAttribute('data-filesize') || '0', 10) || 0,
        dataUrl: chip.getAttribute('data-filedata') || ''
    };
    const popup = document.getElementById('file-chip-popup');
    const nm = document.getElementById('file-chip-name');
    const meta = document.getElementById('file-chip-meta');
    const prev = document.getElementById('file-chip-prev');
    if (!popup || !nm || !meta || !prev) return false;
    nm.textContent = fmtFileStem(fmtFileChipData.name).stem;
    meta.textContent = fmtFileExt(fmtFileChipData.name, fmtFileChipData.type) + ' · ' + fmtFileSize(fmtFileChipData.size);
    prev.innerHTML = '';
    if (/^image\//.test(fmtFileChipData.type) && fmtFileChipData.dataUrl) {
        const thumb = document.createElement('img');
        thumb.src = fmtFileChipData.dataUrl;
        thumb.alt = fmtFileChipData.name;
        prev.appendChild(thumb);
    } else {
        prev.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>';
    }
    popup.hidden = false;
    try {
        const vw = window.innerWidth || 1024;
        const vh = window.innerHeight || 768;
        popup.style.left = Math.max(8, Math.min(typeof x === 'number' ? x : 100, vw - 250)) + 'px';
        popup.style.top = Math.max(8, Math.min(typeof y === 'number' ? y : 100, vh - 160)) + 'px';
    } catch (e) {}
    return true;
}

var fmtFileChipNode = null;

function fmtShowFileRename() {
    const row = document.getElementById('file-chip-rename');
    const input = document.getElementById('file-chip-rename-input');
    if (!row || !input || !fmtFileChipData) return false;
    input.value = fmtFileStem(fmtFileChipData.name).stem;
    row.hidden = false;
    try { input.focus(); input.select(); } catch (e) {}
    return true;
}

function fmtApplyFileRename() {
    const row = document.getElementById('file-chip-rename');
    const input = document.getElementById('file-chip-rename-input');
    if (!row || !input || !fmtFileChipData) return false;
    const typed = String(input.value || '').trim();
    if (!typed) return false;
    const own = fmtFileStem(typed);
    const keep = fmtFileStem(fmtFileChipData.name);
    const next = own.ext ? typed : typed + keep.ext;
    fmtFileChipData.name = next;
    try {
        if (fmtFileChipNode && fmtFileChipNode.setAttribute) {
            fmtFileChipNode.setAttribute('data-filename', next);
            const label = fmtFileChipNode.querySelector('.file-chip-name');
            if (label) label.textContent = fmtFileStem(next).stem;
        }
    } catch (e) {}
    const title = document.getElementById('file-chip-name');
    if (title) title.textContent = fmtFileStem(next).stem;
    row.hidden = true;
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    return true;
}

function fmtHideFileChip() {
    fmtFileChipData = null;
    fmtFileChipNode = null;
    const row = document.getElementById('file-chip-rename');
    if (row) row.hidden = true;
    const popup = document.getElementById('file-chip-popup');
    if (popup) popup.hidden = true;
}

function fmtFileChipDownload() {
    const d = fmtFileChipData;
    if (!d || !d.dataUrl) return false;
    try {
        const parts = String(d.dataUrl).split(',');
        const mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
        const bin = atob(parts[1] || '');
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        if (!window.URL || typeof window.URL.createObjectURL !== 'function') return false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = d.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            try { a.remove(); } catch (e) {}
            try { window.URL.revokeObjectURL(url); } catch (e) {}
        }, 100);
        return true;
    } catch (e) { return false; }
}

function fmtWireFileChip() {
    if (fmtWireFileChip._done) return;
    fmtWireFileChip._done = true;
    if (typeof canvas !== 'undefined' && canvas) {
        canvas.addEventListener('click', function (e) {
            const chip = e.target.closest ? e.target.closest('.file-chip') : null;
            if (!chip || !canvas.contains(chip)) return;
            playAeroClickSound(700, 0.1);
            fmtOpenFileChip(chip, e.clientX, e.clientY);
        });
        canvas.addEventListener('mousedown', function (e) {
            const popup = document.getElementById('file-chip-popup');
            if (popup && !popup.hidden && !(e.target.closest && e.target.closest('.file-chip'))) fmtHideFileChip();
        });
    }
    const popup = document.getElementById('file-chip-popup');
    const x = document.getElementById('file-chip-x');
    const rn = document.getElementById('file-chip-rename-btn');
    const ok = document.getElementById('file-chip-rename-ok');
    const ri = document.getElementById('file-chip-rename-input');
    if (rn) rn.addEventListener('click', function () { playAeroClickSound(600, 0.08); fmtShowFileRename(); });
    if (ok) ok.addEventListener('click', function () { playAeroClickSound(600, 0.08); fmtApplyFileRename(); });
    if (ri) ri.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); fmtApplyFileRename(); }
    });
    const dl = document.getElementById('file-chip-download-btn');
    if (x) x.addEventListener('click', function () { playAeroClickSound(450, 0.08); fmtHideFileChip(); });
    if (dl) dl.addEventListener('click', function () { playAeroClickSound(700, 0.08); fmtFileChipDownload(); });
    document.addEventListener('mousedown', function (e) {
        const pop = document.getElementById('file-chip-popup');
        if (pop && !pop.hidden && !(e.target.closest && e.target.closest('#file-chip-popup')) &&
            !(e.target.closest && e.target.closest('.file-chip'))) fmtHideFileChip();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') fmtHideFileChip();
    });
}

function fmtInsertImageDataURL(dataUrl, name) {
    if (!dataUrl) return false;
    const holder = document.createElement('span');
    holder.className = 'img-resize';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = name || 'image';
    holder.appendChild(img);
    return fmtInsertNodeAtCaret(holder);
}

// ==========================================
// INSERT > SYMBOLS: a huge grid of 7,600+ characters!
// The data (with real Unicode names for search) lives in symbols-data.js,
// loaded the first time the dialog opens so Bitbook still starts fast!
// Click previews, double-click / Enter inserts and keeps the grid open!
// ==========================================
var SY_DATA_URL = 'symbols-data.js?v=20261065';
var SY_RECENT_KEY = 'bitbook_symbols_recent';
var SY_RECENT_MAX = 40;
var sySavedRange = null;
var syLoading = null;
var syBuilt = false;
var sySelected = '★';
var syNames = {};
var syRecent = [];
var sySearchTimer = null;
try {
    const raw = JSON.parse(localStorage.getItem(SY_RECENT_KEY) || '[]');
    if (Array.isArray(raw)) syRecent = raw.filter(function (c) { return typeof c === 'string' && c.length > 0 && c.length <= 4; }).slice(0, SY_RECENT_MAX);
} catch (e) {}

function syLoadData() {
    if (window.BB_SYMBOLS) return Promise.resolve(window.BB_SYMBOLS);
    if (syLoading) return syLoading;
    syLoading = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = SY_DATA_URL;
        s.onload = function () { window.BB_SYMBOLS ? resolve(window.BB_SYMBOLS) : reject(new Error('no data')); };
        s.onerror = function () { syLoading = null; reject(new Error('load failed')); };
        document.head.appendChild(s);
    });
    return syLoading;
}

function syEsc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function syCode(ch) {
    return 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
}
function syTitleCase(name) {
    return String(name || '').replace(/\b([a-z])/g, function (m, c) { return c.toUpperCase(); });
}
function syName(ch) {
    return syNames[ch] ? syTitleCase(syNames[ch]) : 'Symbol';
}

function syBuild(cats) {
    const grid = document.getElementById('sy-grid');
    const sel = document.getElementById('sy-cat');
    if (!grid || !sel) return;
    let html = '';
    let total = 0;
    sel.innerHTML = '';
    const all = document.createElement('option');
    all.value = 'all';
    sel.appendChild(all);
    cats.forEach(function (cat, ci) {
        const chars = Array.from(cat.c);
        const names = cat.k.split('|');
        total += chars.length;
        const o = document.createElement('option');
        o.value = String(ci);
        o.textContent = cat.n + ' (' + chars.length + ')';
        sel.appendChild(o);
        html += '<section class="sy-sec" data-sy-cat="' + ci + '"><h4 class="sy-sec-title">' + syEsc(cat.n) + '</h4><div class="sy-sec-grid">';
        chars.forEach(function (ch, i) {
            const name = names[i] || '';
            if (!syNames[ch]) syNames[ch] = name;
            html += '<button type="button" class="sy-t" data-c="' + syEsc(ch) + '" data-k="' + syEsc(name) + '" title="' + syEsc(syTitleCase(name) + ' · ' + syCode(ch)) + '">' + syEsc(ch) + '</button>';
        });
        html += '</div></section>';
    });
    all.textContent = 'All categories (' + total.toLocaleString() + ')';
    grid.innerHTML = html;
    syBuilt = true;
    syFilter();
    syRenderRecent();
    sySelect(sySelected);
}

function syFilter() {
    const grid = document.getElementById('sy-grid');
    if (!grid || !syBuilt) return;
    const raw = (document.getElementById('sy-search').value || '').trim();
    const q = raw.toLowerCase();
    const cat = document.getElementById('sy-cat').value || 'all';
    // "U+2603", "2603" or "0x2603" find a code point; a pasted character finds itself!
    const hex = /^(?:u\+|0x)?([0-9a-f]{4,6})$/i.exec(raw);
    const words = q.split(/\s+/).filter(Boolean);
    let shown = 0;
    grid.querySelectorAll('.sy-sec').forEach(function (sec) {
        const catOk = cat === 'all' || sec.getAttribute('data-sy-cat') === cat;
        let secShown = 0;
        sec.querySelectorAll('.sy-t').forEach(function (b) {
            let on = catOk;
            if (on && q) {
                const ch = b.getAttribute('data-c');
                const k = b.getAttribute('data-k');
                on = ch === raw ||
                    (hex && ch.codePointAt(0) === parseInt(hex[1], 16)) ||
                    words.every(function (w) { return k.indexOf(w) !== -1; });
            }
            b.hidden = !on;
            if (on) secShown++;
        });
        sec.hidden = secShown === 0;
        shown += secShown;
    });
    document.getElementById('sy-count').textContent = shown.toLocaleString() + (shown === 1 ? ' symbol' : ' symbols');
    document.getElementById('sy-empty').hidden = shown !== 0;
}

function sySelect(ch) {
    if (!ch) return;
    sySelected = ch;
    document.getElementById('sy-preview').textContent = ch;
    document.getElementById('sy-preview-name').textContent = syName(ch);
    document.getElementById('sy-preview-code').textContent = syCode(ch) + '  ·  &#x' + ch.codePointAt(0).toString(16).toUpperCase() + ';';
    document.querySelectorAll('#symbols-dialog .sy-t.active').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('#symbols-dialog .sy-t').forEach(function (b) {
        if (b.getAttribute('data-c') === ch) b.classList.add('active');
    });
}

function syRenderRecent() {
    const wrap = document.getElementById('sy-recent-wrap');
    const box = document.getElementById('sy-recent');
    if (!wrap || !box) return;
    wrap.hidden = syRecent.length === 0;
    box.innerHTML = syRecent.map(function (ch) {
        return '<button type="button" class="sy-t" data-c="' + syEsc(ch) + '" title="' + syEsc(syName(ch) + ' · ' + syCode(ch)) + '">' + syEsc(ch) + '</button>';
    }).join('');
}

function syRemember(ch) {
    syRecent = [ch].concat(syRecent.filter(function (c) { return c !== ch; })).slice(0, SY_RECENT_MAX);
    try { localStorage.setItem(SY_RECENT_KEY, JSON.stringify(syRecent)); } catch (e) {}
    syRenderRecent();
}

// Drop a character at the saved caret WITHOUT leaving the dialog, so you can keep picking!
function syInsertChar(ch) {
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!cv || !ch) return false;
    let r = sySavedRange && cv.contains(sySavedRange.startContainer) ? sySavedRange : null;
    // Symbols must land INSIDE a line (an editable box), never loose in the page: find that line first!
    const editableHost = function (node) {
        let n = node && node.nodeType === 1 ? node : node && node.parentNode;
        while (n && n !== cv) { if (n.getAttribute && n.getAttribute('contenteditable') === 'true') return n; n = n.parentNode; }
        return null;
    };
    let lineEl = r ? editableHost(r.startContainer) : null;
    if (!lineEl) {
        // No caret in a line yet: go to the end of the last line!
        const all = cv.querySelectorAll('[contenteditable="true"]');
        lineEl = all.length ? all[all.length - 1] : null;
        if (!lineEl) { lineEl = document.createElement('div'); lineEl.setAttribute('contenteditable', 'true'); lineEl.innerHTML = '<br>'; cv.appendChild(lineEl); }
        r = document.createRange();
        r.selectNodeContents(lineEl);
        r.collapse(false);
    }
    // an empty line is just a <br> placeholder: the symbol goes in front of it
    if (lineEl.childNodes.length === 1 && lineEl.firstChild.nodeName === 'BR') { r = document.createRange(); r.setStartBefore(lineEl.firstChild); r.collapse(true); }
    try {
        if (!r.collapsed) r.collapse(false);
        // Never type inside an atomic chip: hop out to just after it!
        const host = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode;
        const chip = host && host.closest ? host.closest('[contenteditable="false"]') : null;
        // (the page itself is not editable, so only a chip INSIDE the line counts: otherwise the symbol landed outside the page, bottom-left!)
        if (chip && chip !== cv && lineEl.contains(chip) && chip !== lineEl) { r.setStartAfter(chip); r.collapse(true); }
        const node = document.createTextNode(ch);
        r.insertNode(node);
        r.setStartAfter(node);
        r.collapse(true);
        sySavedRange = r;
        if (lineEl.childNodes.length > 1 && lineEl.lastChild.nodeName === 'BR' && lineEl.firstChild === node) lineEl.removeChild(lineEl.lastChild); // (the placeholder is not needed once there is text)
        try { lineEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    } catch (e) { return false; }
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.06); } catch (e) {}
    syRemember(ch);
    const hint = document.getElementById('sy-hint');
    if (hint) hint.textContent = 'Inserted ' + ch + ' (' + syName(ch) + ')! Keep picking, or click Done!';
    return true;
}

function syOpenDialog() {
    sySavedRange = sk3SaveRange();
    const hint = document.getElementById('sy-hint');
    if (hint) hint.textContent = 'Click a symbol to preview it! Double-click (or press Enter) to drop it in right away and keep picking!';
    sk3Open('symbols-dialog');
    if (!syBuilt) {
        syLoadData().then(syBuild).catch(function () {
            const grid = document.getElementById('sy-grid');
            if (grid) grid.innerHTML = '<p class="sy-loading">Could not load the symbols! Check your connection and try again!</p>';
        });
    } else {
        syRenderRecent();
        sySelect(sySelected);
    }
    try { const s = document.getElementById('sy-search'); if (s) s.focus(); } catch (e) {}
}

// Put the caret back after the last insert, so typing just carries on!
function syRestoreCaret() {
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!cv || !sySavedRange || !cv.contains(sySavedRange.startContainer)) return;
    try {
        cv.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(sySavedRange);
    } catch (e) {}
}

// Arrow keys walk the grid by rows and columns!
function syMoveFocus(from, key) {
    const tiles = Array.prototype.filter.call(document.querySelectorAll('#symbols-dialog .sy-t'), function (b) { return !b.hidden && b.offsetParent !== null; });
    const i = tiles.indexOf(from);
    if (i === -1) return;
    let next = null;
    if (key === 'ArrowRight') next = tiles[i + 1];
    else if (key === 'ArrowLeft') next = tiles[i - 1];
    else {
        // Up/Down: find the nearest row above or below, then the closest column in it!
        const down = key === 'ArrowDown';
        const r0 = from.getBoundingClientRect();
        const cx = r0.left + r0.width / 2;
        let rowTop = null, best = null, bestDx = Infinity;
        for (let j = down ? i + 1 : i - 1; down ? j < tiles.length : j >= 0; j += down ? 1 : -1) {
            const r = tiles[j].getBoundingClientRect();
            if (Math.abs(r.top - r0.top) < r0.height / 2) continue;
            if (rowTop === null) rowTop = r.top;
            else if (Math.abs(r.top - rowTop) >= r0.height / 2) break;
            const dx = Math.abs(r.left + r.width / 2 - cx);
            if (dx < bestDx) { bestDx = dx; best = tiles[j]; }
        }
        next = best;
    }
    if (next) {
        next.focus();
        if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' });
        sySelect(next.getAttribute('data-c'));
    }
}

function syWire() {
    if (syWire._done) return;
    syWire._done = true;
    sk3Wire('__symbols__', 'symbols-dialog', syOpenDialog, function () {
        if (syInsertChar(sySelected)) sk3Close('symbols-dialog');
    }, 'sy');
    const dlg = document.getElementById('symbols-dialog');
    if (!dlg) return;
    dlg.addEventListener('close', syRestoreCaret);
    dlg.addEventListener('click', function (ev) {
        const t = ev.target && ev.target.closest ? ev.target.closest('.sy-t') : null;
        if (t) sySelect(t.getAttribute('data-c'));
    });
    dlg.addEventListener('dblclick', function (ev) {
        const t = ev.target && ev.target.closest ? ev.target.closest('.sy-t') : null;
        if (t) syInsertChar(t.getAttribute('data-c'));
    });
    dlg.addEventListener('keydown', function (ev) {
        const t = ev.target && ev.target.classList && ev.target.classList.contains('sy-t') ? ev.target : null;
        if (!t) return;
        if (ev.key === 'Enter') {
            ev.preventDefault();
            sySelect(t.getAttribute('data-c'));
            syInsertChar(t.getAttribute('data-c'));
        } else if (/^Arrow(Up|Down|Left|Right)$/.test(ev.key)) {
            ev.preventDefault();
            syMoveFocus(t, ev.key);
        }
    });
    const search = document.getElementById('sy-search');
    if (search) search.addEventListener('input', function () {
        clearTimeout(sySearchTimer);
        sySearchTimer = setTimeout(syFilter, 90);
    });
    const cat = document.getElementById('sy-cat');
    if (cat) cat.addEventListener('change', function () {
        syFilter();
        const grid = document.getElementById('sy-grid');
        if (grid) grid.scrollTop = 0;
    });
}

function fmtWireInsertMenu() {
    if (fmtWireInsertMenu._done) return;
    fmtWireInsertMenu._done = true;
    const btn = document.getElementById('insert-menu-btn');
    if (btn) btn.addEventListener('click', toggleInsertMenu);
    // Tags + Skills buttons are wired in index.html (floated + placeUnder)!
    // No duplicate listeners here — double toggles would open-then-shut!
    document.querySelectorAll('#insert-menu-popup .insert-item').forEach(function (item) {
        item.addEventListener('click', function () {
            runInsertKind(item.getAttribute('data-insert'));
        });
    });
    const filePicker = document.getElementById('insert-file-input');
    if (filePicker) filePicker.addEventListener('change', function () {
        if (!filePicker.files || !filePicker.files[0]) return;
        const file = filePicker.files[0];
        try {
            const reader = new FileReader();
            reader.onload = function () {
                fmtInsertFileChip(file.name, file.type, file.size, String(reader.result || ''));
            };
            reader.readAsDataURL(file);
        } catch (e) {}
        try { filePicker.value = ''; } catch (err) {}
    });
    const picker = document.getElementById('insert-image-input');
    if (picker) picker.addEventListener('change', function () {
        if (!picker.files || !picker.files[0]) return;
        const file = picker.files[0];
        try {
            const reader = new FileReader();
            reader.onload = function () {
                fmtInsertImageDataURL(String(reader.result || ''), file.name);
            };
            reader.readAsDataURL(file);
        } catch (e) {}
        try { picker.value = ''; } catch (err) {}
    });
}

function runDownloadFormat(fmt) {
    closeDownloadMenu();
    if (fmt === 'kn' || fmt === 'kd') exportKeydownFile();
    else if (fmt === 'pdf') exportPDFFile();
    else if (fmt === 'docx') exportDOCXFile();
    else if (fmt === 'odt') exportODTFile();
    else if (fmt === 'txt') exportTXTFile();
    else if (fmt === 'epub') exportEPUBFile();
    else if (fmt === 'jpeg') exportJPEGFile();
    else if (fmt === 'svg') exportSVGFile();
    else if (fmt === 'web') exportWebFile();
}

document.querySelectorAll('#download-menu .download-item').forEach(function (item) {
    item.addEventListener('click', function (e) {
        e.stopPropagation();
        playAeroClickSound(600, 0.08);
        runDownloadFormat(item.getAttribute('data-fmt'));
    });
});

// Action: Read .kn files (.kd legacy too), strip YAML configs, render HTML!
function importKeydownFile(inputEvent) {
    playAeroClickSound(850, 0.15);
    const fileTarget = inputEvent.target.files[0];
    if (!fileTarget) return;

    const fileReaderInstance = new FileReader();
    fileReaderInstance.onload = function(readEvent) {
        const fullFileStringContent = readEvent.target.result;
        
        if (fullFileStringContent.startsWith("---")) {
            const closingGateIndexValue = fullFileStringContent.indexOf("---", 3);
            if (closingGateIndexValue !== -1) {
                const pureContentTextOffset = closingGateIndexValue + 3;
                const frontGate = fullFileStringContent.substring(3, closingGateIndexValue);
                const lockMatch = frontGate.match(/doc_password:\s*"([^"]+)"/);
                const afterText = fullFileStringContent.substring(pureContentTextOffset).trim();
                if (lockMatch && lockMatch[1]) {
                    kdPendingLock = { hash: lockMatch[1], frontGate: frontGate, afterText: afterText };
                    kdShowLockDialog();
                    return;
                }
                kdApplyDocSettings(frontGate);
                kdLoadDocContent(afterText);
                return;
            }
        }
        kdApplyDocSettings('');
        const kdParsedRaw = kdParseTabsFence(fullFileStringContent);
        canvasViewport.innerHTML = kdParsedRaw.tabs ? kdRestoreTabs(kdParsedRaw.tabs) : kdRestoreTabs([{ name: 'Quick Note', html: kdParsedRaw.html }]);
        kdHydrateInteractions();
        kdRenderTabs();
        kdRenderOutline();
    };
    fileReaderInstance.readAsText(fileTarget);
}

// Sidebar toggle lives in PART 3 above — single owner, no double-toggle!

// ========================================================
// RE-ENGINEERED SOVEREIGN MARKDOWN INGESTION (.md IMPORT)
// ========================================================
function importMarkdownFile(inputEvent) {
    playAeroClickSound(850, 0.15);
    const fileTarget = inputEvent.target.files[0];
    if (!fileTarget) return;

    const fileReader = new FileReader();
    fileReader.onload = function(readEvent) {
        const rawMarkdownText = readEvent.target.result;
        
        // Split the markdown raw data string cleanly line-by-line
        let mdLines = rawMarkdownText.split('\n');
        let parsedHTMLOutput = "";
        
        for (let i = 0; i < mdLines.length; i++) {
            let line = mdLines[i].trim();
            if (line === "") continue;

            // --- Block Element Level Parsing Logic ---
            if (line.startsWith('# ')) {
                parsedHTMLOutput += `<h1>${parseMarkdownInlineTokens(line.substring(2))}</h1>`;
            } else if (line.startsWith('## ')) {
                parsedHTMLOutput += `<h2>${parseMarkdownInlineTokens(line.substring(3))}</h2>`;
            } else if (line.startsWith('### ')) {
                parsedHTMLOutput += `<h3>${parseMarkdownInlineTokens(line.substring(4))}</h3>`;
            } else if (line.startsWith('> ')) {
                parsedHTMLOutput += `<blockquote>${parseMarkdownInlineTokens(line.substring(2))}</blockquote>`;
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                parsedHTMLOutput += `<ul><li>${parseMarkdownInlineTokens(line.substring(2))}</li></ul>`;
            } else {
                parsedHTMLOutput += `<div>${parseMarkdownInlineTokens(line)}</div>`;
            }
        }
        
        // Hydrate your JetBrains Mono canvas cleanly with the converted HTML blocks
        canvasViewport.innerHTML = parsedHTMLOutput;
        kdHydrateInteractions();
        try {
            let mdName = 'Quick Note';
            const mdTitle = rawMarkdownText.split('\n').find(function (l) { return l.trim().startsWith('# '); });
            if (mdTitle) mdName = mdTitle.replace(/^#+\s*/, '').trim().substring(0, 60) || 'Quick Note';
            kdRestoreTabs([{ name: mdName, html: parsedHTMLOutput }]);
        } catch (e) {}
        kdRenderTabs();
        kdRenderOutline();
    };
    fileReader.readAsText(fileTarget);
}

// Helper utility to parse inline markdown typography styles dynamically
function parseMarkdownInlineTokens(textStr) {
    let html = textStr.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Convert Markdown bold (**text**) -> standard strong html tags
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert Markdown italics (*text*) -> standard emphasis html tags
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert Markdown inline code blocks (`code`) -> code layout elements
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    return html;
}

// Add these relative token checks inside your local markdown parser utility area
function parseMarkdownInlineTokens(textStr) {
    let html = textStr.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Convert new structural text block pairs into standard browser tags dynamically
    // Line shortcuts first: # ## ### headings, #### the mega header, * list items!
    html = html.replace(/^#### (.+)$/gm, '<h1 class="mega-header">$1</h1>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^\* (.+)$/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/~H1~([^~]+)~H1~/g, '<h1>$1</h1>');
    html = html.replace(/~H2~([^~]+)~H2~/g, '<h2>$1</h2>');
    html = html.replace(/~H3~([^~]+)~H3~/g, '<h3>$1</h3>');
    html = html.replace(/~BQ~([^~]+)~BQ~/g, '<blockquote>$1</blockquote>');
    html = html.replace(/~BUL~([^~]+)~BUL~/g, '<ul><li>$1</li></ul>');

    return html;
}
// ==========================================
// PART 11: DUAL-TOOLBAR MANAGEMENT ENGINE
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const selToolbar = document.getElementById('aero-selection-toolbar');
    const blockToolbar = document.getElementById('aero-block-toolbar');
    const canvas = document.getElementById('wysiwyg-canvas');

    if (!canvas || !selToolbar || !blockToolbar) return;

    const pageScroller = canvas.parentElement;
    if (pageScroller && pageScroller.addEventListener) {
        pageScroller.addEventListener('scroll', function () {
            selToolbar.style.display = 'none';
            blockToolbar.style.display = 'none';
        });
    }

    function updateToolbars() {
        const selection = window.getSelection();
        if (!selection.rangeCount || !canvas.contains(selection.anchorNode)) {
            selToolbar.style.display = 'none';
            blockToolbar.style.display = 'none';
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect(); // Ensure wrapper is defined in your scope

        const anchorNode = selection.anchorNode;
        const textContent = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.nodeValue : anchorNode.innerText || "";
        const isEmptyLine = selection.isCollapsed && textContent.trim() === "";

        // 1. Text is selected/highlighted -> Show Selection Toolbar above text
        if (!selection.isCollapsed && selection.toString().trim().length > 0) {
            blockToolbar.style.display = 'none';
            const topPos = rect.top - wrapperRect.top - 50;
            const leftPos = rect.left - wrapperRect.left + (rect.width / 2) - (selToolbar.offsetWidth / 2);

            selToolbar.style.top = `${Math.max(10, topPos)}px`;
            selToolbar.style.left = `${Math.max(10, leftPos)}px`;
            selToolbar.style.display = 'flex';
        } 
        // 2. Cursor is on an empty new line -> hover right above the cursor!
        else if (isEmptyLine) {
            selToolbar.style.display = 'none';
            document.querySelectorAll('.aero-dropdown').forEach(d => d.classList.remove('active'));

            // Zeroed range rect? Measure the caret's own block instead!
            let caretRect = rect;
            if (!caretRect || (caretRect.top === 0 && caretRect.left === 0 && !caretRect.width && !caretRect.height)) {
                try {
                    const aNode = selection.anchorNode;
                    const aEl = aNode && aNode.nodeType === Node.TEXT_NODE ? aNode.parentElement : aNode;
                    const blk = aEl && aEl.closest ? aEl.closest('div, p, li, h1, h2, h3, blockquote, ul') : null;
                    if (blk && typeof blk.getBoundingClientRect === 'function') caretRect = blk.getBoundingClientRect();
                } catch (e) {}
            }
            const tbH = (typeof blockToolbar.offsetHeight === 'number' && blockToolbar.offsetHeight) || 40;
            const tbW = (typeof blockToolbar.offsetWidth === 'number' && blockToolbar.offsetWidth) || 120;
            let topPos, leftPos;
            if (caretRect && (caretRect.top !== 0 || caretRect.left !== 0 || caretRect.width !== 0 || caretRect.height !== 0)) {
                // Beside the empty line (never over the lines above, where it blocked clicks)!
                topPos = caretRect.top - wrapperRect.top + ((caretRect.height || 24) - tbH) / 2;
                leftPos = caretRect.left - wrapperRect.left + 28;
            } else {
                // Last resort: the canvas head -- never the dead corner!
                topPos = canvasRect.top - wrapperRect.top + 10;
                leftPos = canvasRect.left - wrapperRect.left + 10;
            }

            blockToolbar.style.top = `${Math.max(10, topPos)}px`;
            blockToolbar.style.left = `${Math.max(10, Math.min(leftPos, Math.max(10, wrapperRect.width - tbW - 10)))}px`;
            blockToolbar.style.display = 'flex';
        }
        // 3. Actively typing inside text -> Hide both completely
        else {
            selToolbar.style.display = 'none';
            blockToolbar.style.display = 'none';
            document.querySelectorAll('.aero-dropdown').forEach(d => d.classList.remove('active'));
        }
    }

    canvas.addEventListener('mouseup', updateToolbars);
    canvas.addEventListener('keyup', updateToolbars);

    // Update these existing canvas listeners to also trigger your style sync:
    canvas.addEventListener('mouseup', () => {
        updateToolbars();
        syncToolbarWithSelection();
    });
    
    canvas.addEventListener('keyup', () => {
        updateToolbars();
        syncToolbarWithSelection();
    });

    // Close everything when clicking outside
    document.addEventListener('mousedown', function(e) {
        if (!selToolbar.contains(e.target) && !blockToolbar.contains(e.target) && !canvas.contains(e.target)) {
            selToolbar.style.display = 'none';
            blockToolbar.style.display = 'none';
            document.querySelectorAll('.aero-dropdown').forEach(d => d.classList.remove('active'));
        }
    });

    // Dropdown toggles for selection toolbar
    selToolbar.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const parentDropdown = this.parentElement;
            selToolbar.querySelectorAll('.aero-dropdown').forEach(d => {
                if (d !== parentDropdown) d.classList.remove('active');
            });
            parentDropdown.classList.toggle('active');
        });
    });

    // Handle selection dropdown item clicks across all grid trays
    selToolbar.querySelectorAll('.color-swatch-item, .chip-swatch-item, .effect-swatch-item').forEach(item => {
        item.addEventListener('click', function() {
            playAeroClickSound(750, 0.1);
            const className = this.getAttribute('data-class');
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString();

            const wrapper = document.createElement('span');
            wrapper.className = className;
            wrapper.innerText = selectedText.length > 0 ? selectedText : 'Highlight';

            range.deleteContents();
            range.insertNode(wrapper);

            selToolbar.querySelectorAll('.aero-dropdown').forEach(d => d.classList.remove('active'));
            selToolbar.style.display = 'none';
            autoSaveCanvasContent();
        });
    });

    // Handle block toolbar format inserts on new lines (Blank elements ready for instant typing)
    blockToolbar.querySelectorAll('.style-bar-btn[data-tag]').forEach(btn => {
        btn.addEventListener('click', function() {
            playAeroClickSound(700, 0.08);
            const tag = this.getAttribute('data-tag');
            
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);

            let newElement;
            if (tag === '~H1~') {
                newElement = document.createElement('h1');
                newElement.className = 'header-1';
            } else if (tag === '~H2~') {
                newElement = document.createElement('h2');
                newElement.className = 'header-2';
            } else if (tag === '~H3~') {
                newElement = document.createElement('h3');
                newElement.className = 'header-3';
            } else if (tag === '~BQ~') {
                newElement = document.createElement('blockquote');
                newElement.className = 'blockquote-list';
            } else if (tag === '~BUL~') {
                newElement = document.createElement('ul');
                newElement.className = 'bulleted-list';
                const li = document.createElement('li');
                // Insert a zero-width space node to anchor the bullet precisely without placeholder text
                li.appendChild(document.createTextNode('\u200B'));
                newElement.appendChild(li);
            }

            if (newElement) {
                range.insertNode(newElement);
                
                // Snap cursor instantly inside the clean new element
                const targetNode = tag === '~BUL~' ? newElement.querySelector('li') : newElement;
                const newRange = document.createRange();
                newRange.selectNodeContents(targetNode);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }

            blockToolbar.style.display = 'none';
            autoSaveCanvasContent();
        });
    });
});

// Action: Open the Help Deck dialog box
function openHelpDeck() {
    playAeroClickSound(600, 0.1);
    const helpDialog = document.getElementById('help-deck-dialog');
    if (helpDialog) {
        if (typeof helpDialog.showModal === 'function') {
            helpDialog.showModal();
        } else {
            helpDialog.style.display = 'block';
        }
    }
}

// Bind click handler to the Help Deck toolbar button
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-deck-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', openHelpDeck);
    }
});

// Action: Apply text formatting toggles (Bold, Italic, Underline, Strikethrough)
function applyTextFormatting(commandName) {
    playAeroClickSound(600, 0.08);
    document.execCommand(commandName, false, null);
    autoSaveCanvasContent();
}

// Action: Insert interactive applets (Calculator or Sticky Note) into the canvas
function insertApplet(appletType) {
    playAeroClickSound(700, 0.1);
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    let appletContainer = document.createElement('span');
    appletContainer.className = 'aero-applet-box';
    appletContainer.style.cssText = 'display: inline-block; background: linear-gradient(135deg, #f0f8ff, #d2e6fa); border: 1.5px solid #7baed3; border-radius: 8px; padding: 8px 12px; margin: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); vertical-align: middle;';

    if (appletType === 'calculator') {
        appletContainer.innerHTML = `
            <div style="font-size: 11px; font-weight: bold; color: #1a4a75; margin-bottom: 4px;">🧮 Quick Calculator</div>
            <div style="display: flex; gap: 4px;">
                <input type="text" class="calc-input" placeholder="e.g. 5 + 5" style="width: 90px; padding: 2px 4px; border: 1px solid #7baed3; border-radius: 4px; font-size: 12px;" />
                <button class="style-bar-btn" style="padding: 2px 6px; font-size: 11px;" onclick="try { this.previousElementSibling.value = eval(this.previousElementSibling.value); } catch(e) { this.previousElementSibling.value = 'Error'; }">=</button>
            </div>
        `;
    } else if (appletType === 'notes') {
        appletContainer.innerHTML = `
            <div style="font-size: 11px; font-weight: bold; color: #1a4a75; margin-bottom: 4px;">📝 Sticky Note</div>
            <textarea placeholder="Type a quick note..." style="width: 140px; height: 40px; padding: 4px; border: 1px solid #7baed3; border-radius: 4px; font-size: 12px; resize: vertical; font-family: inherit;"></textarea>
        `;
    }

    range.deleteContents();
    range.insertNode(appletContainer);
    
    // Move cursor safely after the applet container
    range.setStartAfter(appletContainer);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    autoSaveCanvasContent();
}
// Wire up the floating selection toolbar buttons
document.querySelectorAll('#aero-selection-toolbar .style-bar-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const styleType = button.getAttribute('data-style');
        // Only own data-style buttons here; dropdown toggles & swatches are handled elsewhere.
        if (!styleType) return;
        // Stop the click from bubbling to the delegated selectionToolbar handler below,
        // which would fire the same execCommand a second time and toggle the style back off.
        e.stopPropagation();
        playAeroClickSound(600, 0.08);
        
        if (styleType === 'bold') {
            document.execCommand('bold', false, null);
        } else if (styleType === 'italic') {
            document.execCommand('italic', false, null);
        } else if (styleType === 'underline') {
            document.execCommand('underline', false, null);
        } else if (styleType === 'strike') {
            document.execCommand('strikeThrough', false, null);
        } else if (styleType === 'code') {
            // Apply inline code wrapping
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                const codeSpan = document.createElement('code');
                codeSpan.style.cssText = 'background: rgba(0,0,0,0.06); padding: 2px 4px; border-radius: 4px; font-family: monospace;';
                codeSpan.appendChild(range.extractContents());
                range.insertNode(codeSpan);
            }
        }
        autoSaveCanvasContent();
    });
});

// Wire up the block toolbar buttons using your app's native handler
document.querySelectorAll('#aero-block-toolbar .style-bar-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        playAeroClickSound(600, 0.08);

        const blockTag = button.getAttribute('data-tag');
        const appletType = button.getAttribute('data-applet');

        if (blockTag) {
            insertBlockTag(blockTag); // Passes ::glass, ::gsky, ::foldout right to your app
        } else if (appletType) {
            insertApplet(appletType);
        }
        autoSaveCanvasContent();
    });
});

// Toggle dropdown menus on click
document.querySelectorAll('.aero-dropdown .dropdown-toggle').forEach(toggleBtn => {
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playAeroClickSound(500, 0.05);
        
        // Close all other dropdowns first
        document.querySelectorAll('.aero-dropdown .dropdown-menu').forEach(menu => {
            if (menu !== toggleBtn.nextElementSibling) {
                menu.style.display = 'none';
            }
        });

        // Toggle current dropdown
        const menu = toggleBtn.nextElementSibling;
        if (menu) {
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        }
    });
});

// Close dropdowns when clicking outside
window.addEventListener('click', () => {
    document.querySelectorAll('.aero-dropdown .dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
});
document.getElementById('top-format-bar').addEventListener('change', (e) => {
  const action = e.target.getAttribute('data-edit-action');
  if (!action) return;
  
  const value = e.target.value;
  document.execCommand(action, false, value);
});

const selectionToolbar = document.getElementById('aero-selection-toolbar');
const wrapper = document.querySelector('.workspace-viewport-wrapper');

// Show/Position toolbar on text selection
document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (!selection.isCollapsed && canvas.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // Calculate position relative to the workspace wrapper
        const top = rangeRect.top - wrapperRect.top - selectionToolbar.offsetHeight - 10;
        const left = rangeRect.left - wrapperRect.left + (rangeRect.width / 2) - (selectionToolbar.offsetWidth / 2);

        selectionToolbar.style.top = `${Math.max(10, top)}px`;
        selectionToolbar.style.left = `${Math.max(10, left)}px`;
        selectionToolbar.style.display = 'flex';
    } else {
        // Hide toolbar if clicking away
        if (!selectionToolbar.contains(document.activeElement)) {
            selectionToolbar.style.display = 'none';
        }
    }
});

// Handle selection toolbar button clicks (Styles & Gel Orbs)
selectionToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const styleAction = btn.getAttribute('data-style');
    const classAction = btn.getAttribute('data-class');

    // data-style buttons (B/I/U/S/code) are already handled by their direct
    // per-button listener above — skip them here to avoid double-toggling.
    if (styleAction) {
        return;
    } else if (classAction) {
        const selection = window.getSelection();
        if (!selection.isCollapsed) {
            const span = document.createElement('span');
            span.className = classAction;
            span.setAttribute('spellcheck', 'false');
            span.textContent = selection.toString();
            
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(span);
        }
    }
});

// Grab your toolbar elements once
const fontSelect = document.getElementById('font-family-select');
const blockSelect = document.getElementById('block-format-select');
const textColorPicker = document.getElementById('text-color-picker');
const highlighterPicker = document.getElementById('highlighter-picker');

// Prevent toolbar clicks from stealing focus away from the canvas selection
selectionToolbar.addEventListener('mousedown', (e) => {
    e.preventDefault(); 
});

// 1. Handle Font Family Dropdown
if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
        canvas.focus();
        document.execCommand('fontName', false, e.target.value);
    });
}

// 2. Handle Block Formatting Dropdown
if (blockSelect) {
    blockSelect.addEventListener('change', (e) => {
        canvas.focus();
        const bt = String(e.target.value || 'div').toLowerCase();
        const cls = { h1: 'header-1', h2: 'header-2', h3: 'header-3', blockquote: 'blockquote-list' }[bt];
        if (!(window.KdBlockEditor && window.KdBlockEditor.setBlock(bt === 'p' ? 'div' : bt, cls))) document.execCommand('formatBlock', false, `<${e.target.value}>`);
    });
}

// 3. Handle Text Color Picker
if (textColorPicker) {
    textColorPicker.addEventListener('input', (e) => {
        canvas.focus();
        document.execCommand('foreColor', false, e.target.value);
    });
}

// 4. Handle Highlighter / Background Color Picker
if (highlighterPicker) {
    highlighterPicker.addEventListener('input', (e) => {
        canvas.focus();
        document.execCommand('hiliteColor', false, e.target.value);
    });
}

function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return null;
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (!match) return null;
    if (match[4] !== undefined && parseFloat(match[4]) === 0) return null;
    return "#" + match.slice(1, 4).map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join('');
}

function syncToolbarWithSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    let node = selection.anchorNode;
    if (!node) return;
    
    // If it's a text node, grab its parent element
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
    }

    // Safety check: ensure node is valid and inside the canvas
    if (!node || !canvas.contains(node)) return;

    const computed = window.getComputedStyle(node);

    // 1. Sync Font Family Dropdown Safely
    const fontSelectEl = document.getElementById('font-family-select');
    if (fontSelectEl && computed.fontFamily) {
        const fontFamily = computed.fontFamily.replace(/['"]+/g, '').toLowerCase();
        for (let option of fontSelectEl.options) {
            if (fontFamily.includes(option.value.toLowerCase())) {
                fontSelectEl.value = option.value;
                break;
            }
        }
    }

    // 2. Sync Block Format Dropdown Safely
    const blockSelectEl = document.getElementById('block-format-select');
    if (blockSelectEl && node.tagName) {
        const tagName = node.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'p', 'blockquote', 'pre'].includes(tagName)) {
            blockSelectEl.value = tagName;
        } else {
            blockSelectEl.value = 'p';
        }
    }

    // 3. Sync Text Color Picker Safely
    const textColorPickerEl = document.getElementById('text-color-picker');
    if (textColorPickerEl && computed.color) {
        const hexColor = rgbToHex(computed.color);
        if (hexColor) textColorPickerEl.value = hexColor;
    }

    // 4. Sync Highlighter Color Picker Safely
    const highlighterPickerEl = document.getElementById('highlighter-picker');
    if (highlighterPickerEl && computed.backgroundColor) {
        const hexBg = rgbToHex(computed.backgroundColor);
        if (hexBg) highlighterPickerEl.value = hexBg;
    }
}

// Strip an explicit color so the text inherits its ancestor rule (or theme default)!
function fmtResetColor(prop) {
    if (typeof canvas === 'undefined' || !canvas) return 0;
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return 0;
    const range = sel.getRangeAt(0);
    if (!canvas.contains(range.commonAncestorContainer)) return 0;
    const container = range.commonAncestorContainer;
    const root = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    const scopeEl = (root && canvas.contains(root)) ? root : canvas;
    const isText = prop === 'foreColor';
    const cssProp = isText ? 'color' : 'background-color';
    const cands = [];
    if (scopeEl.querySelectorAll) Array.from(scopeEl.querySelectorAll('font, span')).reverse().forEach(function (el) { cands.push(el); });
    fmtScopeChain(scopeEl).forEach(function (el) {
        if (el.tagName === 'FONT' || el.tagName === 'SPAN') cands.push(el);
    });
    return fmtEachTouching(scopeEl, range, function () { return cands; }, function (el) {
        let touched = false;
        if (isText && el.tagName === 'FONT' && el.hasAttribute && el.hasAttribute('color')) {
            try { el.removeAttribute('color'); } catch (e) {}
            touched = true;
        }
        if (el.style) {
            let v = '';
            try { v = el.style.getPropertyValue(cssProp) || ''; } catch (e) {}
            if (v) {
                try { el.style.removeProperty(cssProp); } catch (e) {}
                touched = true;
            }
        }
        if (touched) {
            fmtStripBare(el);
            return true;
        }
        return false;
    }, true);
}

// Show each reset button only while the caret sits under an explicit color!
// (Class-ruled chip colors and plain theme text have nothing to reset!)
function fmtUpdateResetButtons() {
    if (typeof canvas === 'undefined' || !canvas) return;
    const textBtn = document.querySelector('#format-text-controls [data-reset-action="foreColor"]');
    const hlBtn = document.querySelector('#format-text-controls [data-reset-action="hiliteColor"]');
    if (!textBtn && !hlBtn) return;
    const sel = window.getSelection();
    let anchorEl = null;
    if (sel.rangeCount) {
        const a = sel.anchorNode;
        if (a && canvas.contains(a)) anchorEl = a.nodeType === Node.TEXT_NODE ? a.parentElement : a;
    }
    const hasExplicit = function (prop, isText) {
        let el = anchorEl;
        while (el && el !== canvas && canvas.contains(el)) {
            if (isText && el.tagName === 'FONT') {
                try { if (el.hasAttribute && el.hasAttribute('color')) return true; } catch (e) {}
            }
            try {
                if (el.style && el.style.getPropertyValue(prop)) return true;
            } catch (e) {}
            el = el.parentElement;
        }
        return false;
    };
    if (textBtn) textBtn.style.display = (anchorEl && hasExplicit('color', true)) ? '' : 'none';
    if (hlBtn) hlBtn.style.display = (anchorEl && hasExplicit('background-color', false)) ? '' : 'none';
}

// Align one selection's blocks (execCommand first, inline style fallback)!
var FMT_ALIGN_CMDS = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' };

function fmtAlignBlocks(align) {
    if (typeof canvas === 'undefined' || !canvas) return;
    const cmd = FMT_ALIGN_CMDS[align];
    if (!cmd) return;
    if (window.KdBlockEditor && window.KdBlockEditor.align(align)) {
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        if (typeof fmtSyncAlignButtons === 'function') fmtSyncAlignButtons();
        return;
    }
    if (typeof document.execCommand === 'function') {
        try {
            canvas.focus();
            document.execCommand(cmd, false, null);
            if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
            fmtSyncAlignButtons();
            return;
        } catch (e) {}
    }
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const blocks = [];
    Array.from(canvas.children).forEach(function (kid) {
        try {
            if (range.intersectsNode(kid)) blocks.push(kid);
        } catch (e) {}
    });
    if (!blocks.length) {
        const node = sel.anchorNode;
        const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const block = (el && el.closest) ? fmtAlignScope(el) : null;
        if (block && canvas.contains(block)) blocks.push(block);
    }
    blocks.forEach(function (b) { b.style.textAlign = align; });
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    fmtSyncAlignButtons();
}

// Indent = tab char at each line start; outdent strips ONE leading tab (only if there)!
function fmtIndentBlocks(dir) {
    if (typeof canvas === 'undefined' || !canvas) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const blocks = [];
    Array.from(canvas.children).forEach(function (kid) {
        try {
            if (range.intersectsNode(kid)) blocks.push(kid);
        } catch (e) {}
    });
    if (!blocks.length) {
        const node = sel.anchorNode;
        const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const block = el && el.closest ? el.closest('div, p, li, h1, h2, h3, blockquote') : null;
        if (block && canvas.contains(block)) blocks.push(block);
    }
    // Remember a collapsed caret so it lands after its fresh tab (never at line start)!
    const wasCollapsed = sel.isCollapsed;
    let caretAnchor = null;
    let caretOffset = 0;
    let caretBlock = null;
    try {
        caretAnchor = sel.anchorNode;
        caretOffset = sel.anchorOffset;
        const ael = caretAnchor && caretAnchor.nodeType === 3 ? caretAnchor.parentElement : caretAnchor;
        caretBlock = (ael && ael.closest) ? ael.closest('div, p, li, h1, h2, h3, blockquote') : null;
        if (caretBlock && !canvas.contains(caretBlock)) caretBlock = null;
    } catch (e) {}
    let caretTab = null;
    let strippedNode = null;
    let strippedGoneBlock = null;
    blocks.forEach(function (b) {
        if (dir > 0) {
            const first = b.firstChild;
            let tabNode = null;
            if (first && first.nodeType === 3) { first.nodeValue = '\t' + first.nodeValue; tabNode = first; }
            else { tabNode = document.createTextNode('\t'); b.insertBefore(tabNode, first); }
            if (b === caretBlock) caretTab = tabNode;
        } else {
            let node = b.firstChild;
            while (node && node.nodeType === 3 && node.nodeValue === '') {
                const husk = node;
                node = node.nextSibling;
                husk.remove();
            }
            while (node && node.nodeType === 1 && node.tagName !== 'BR' && node.firstChild) node = node.firstChild;
            if (node && node.nodeType === 3 && node.nodeValue.charAt(0) === '\t') {
                const heldCaret = (node === caretAnchor);
                node.nodeValue = node.nodeValue.substring(1);
                if (!node.nodeValue.length) {
                    node.remove();
                    if (b === caretBlock && heldCaret) strippedGoneBlock = b;
                } else if (b === caretBlock) {
                    strippedNode = node;
                }
            }
        }
    });
    try {
        if (wasCollapsed && dir > 0 && caretTab) {
            const caret = document.createRange();
            caret.setStart(caretTab, 1);
            caret.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caret);
        } else if (wasCollapsed && dir < 0 && caretBlock && (strippedNode || strippedGoneBlock)) {
            const caret = document.createRange();
            if (strippedNode) {
                const at = (caretAnchor === strippedNode) ? Math.max(0, caretOffset - 1) : 0;
                caret.setStart(strippedNode, at);
            } else {
                caret.setStart(strippedGoneBlock, 0);
            }
            caret.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caret);
        }
    } catch (e) {}
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
}

// Nearest block-level box owns the line's alignment! Never guess tag names
// (closest('div,p,...') is blind to <center>, <section>, table cells, pasted
// markup!) -- ask layout: first non-inline ancestor-or-self wins!
function fmtAlignScope(el) {
    let node = el;
    while (node && typeof canvas !== 'undefined' && canvas && canvas.contains(node)) {
        if (node === canvas) return canvas;
        let disp = '';
        try { disp = String((window.getComputedStyle(node) || {}).display || '').toLowerCase(); } catch (e) {}
        if (disp !== 'inline') return node;
        node = node.parentElement;
    }
    return (typeof canvas !== 'undefined' && canvas) ? canvas : null;
}

function fmtSyncAlignButtons() {
    const bar = document.getElementById('format-text-controls');
    if (!bar) return;
    // Null = cursor is NOT in text: leave the last highlight alone (never lie)!
    // NOTE: the blinking cursor lives at the FOCUS end (anchor == focus collapsed)!
    let align = null;
    try {
        const sel = window.getSelection();
        if (sel.rangeCount) {
            let node = sel.focusNode || sel.anchorNode;
            if (node && typeof canvas !== 'undefined' && canvas && canvas.contains(node)) {
                align = 'left';
                const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                const scope = (el && el.closest) ? (fmtAlignScope(el) || canvas) : canvas;
                const computed = window.getComputedStyle(scope);
                const t = ((computed && computed.textAlign) || scope.style.textAlign || '').toLowerCase();
                if (t === 'center' || t === '-webkit-center') align = 'center';
                else if (t === 'right' || t === 'end' || t === '-webkit-right') align = 'right';
                else if (t === 'justify') align = 'justify';
            }
        }
    } catch (e) { align = null; }
    if (!align) return;
    bar.querySelectorAll('[data-align]').forEach(function (btn) {
        if (btn.getAttribute('data-align') === align) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// ==========================================
// TOP FORMAT BAR & SELECTION SYNC ENGINE
// (Controls live in the Format sidebar now; the bar docks utility buttons!)
// ==========================================
const topFormatBar = document.getElementById('format-text-controls') || document.getElementById('top-format-bar');

var FMT_WEIGHT_STEPS = ['300', '400', '500', '600', '700', '800', '900'];

// Text size + weight! A selection gets styled one text run at a time (so paragraphs never
// get pulled into an inline span), and with nothing selected the style waits for your
// next letters (WebKit can't keep the caret inside an empty span, so typing missed it)!
var fmtPending = null; // { 'font-size': '24px', ... } for the next typed letters
var fmtPendingSpot = null; // where the caret was when the style started waiting
var fmtLastRange = null; // the last caret/selection in the note (inputs steal the selection)
// A caret's spot as "this block, this many letters in", so clicking back onto the same
// spot counts as the same spot (browsers can describe one spot in different ways)!
function fmtCaretSpot() {
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed || !canvas.contains(sel.anchorNode)) return null;
    const r = sel.getRangeAt(0);
    const el = r.startContainer.nodeType === 3 ? r.startContainer.parentNode : r.startContainer;
    const block = (el.closest && el.closest('div, p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td')) || canvas;
    const pre = document.createRange();
    pre.selectNodeContents(block.contains(r.startContainer) ? block : canvas);
    pre.setEnd(r.startContainer, r.startOffset);
    return { block: block, n: pre.toString().length };
}
function fmtPendingHere() {
    const at = fmtCaretSpot();
    return !!(fmtPending && at && fmtPendingSpot && at.block === fmtPendingSpot.block && at.n === fmtPendingSpot.n);
}
function fmtStyleRuns(range, prop, value) {
    const nodes = (typeof anIsolate === 'function') ? anIsolate(range, canvas) : [];
    if (!nodes.length) return false;
    nodes.forEach(function (t) {
        const par = t.parentNode;
        // A plain style-only span around just this text gets updated (no span-in-span pileups)!
        const plain = par && par !== canvas && par.nodeName === 'SPAN' && par.childNodes.length === 1 &&
            !par.className && par.attributes.length === 1 && par.hasAttribute('style');
        let host = par;
        if (!plain) {
            host = document.createElement('span');
            par.insertBefore(host, t);
            host.appendChild(t);
        }
        host.style.setProperty(prop, value);
    });
    const sel = window.getSelection();
    const r = document.createRange();
    r.setStart(nodes[0], 0);
    r.setEnd(nodes[nodes.length - 1], nodes[nodes.length - 1].length);
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
}
function fmtWrapInline(prop, value) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    try {
        if (range.collapsed) {
            if (!fmtPendingHere()) fmtPending = null;
            fmtPending = fmtPending || {};
            fmtPending[prop] = value;
            fmtPendingSpot = fmtCaretSpot();
            if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
            return true;
        }
        fmtPending = null;
        if (!fmtStyleRuns(range, prop, value)) return false;
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
        return true;
    } catch (e) { return false; }
}
(function () {
    if (typeof canvas === 'undefined' || !canvas) return;
    document.addEventListener('selectionchange', function () {
        try {
            const sel = window.getSelection();
            if (sel.rangeCount && canvas.contains(sel.getRangeAt(0).commonAncestorContainer)) {
                fmtLastRange = sel.getRangeAt(0).cloneRange();
                // The caret went somewhere else in the note: the waiting style is dropped!
                if (fmtPending && !fmtPendingHere()) fmtPending = null;
            }
        } catch (e) {}
    });
    // The waiting style goes on the letters you type next!
    canvas.addEventListener('beforeinput', function (ev) {
        if (!fmtPending) return;
        if (ev.inputType !== 'insertText' || ev.isComposing || !ev.data) {
            if (ev.inputType !== 'insertCompositionText') fmtPending = null;
            return;
        }
        const sel = window.getSelection();
        if (!fmtPendingHere()) { fmtPending = null; return; }
        ev.preventDefault();
        const span = document.createElement('span');
        Object.keys(fmtPending).forEach(function (k) { span.style.setProperty(k, fmtPending[k]); });
        fmtPending = null;
        const t = document.createTextNode(ev.data);
        span.appendChild(t);
        const r = sel.getRangeAt(0);
        r.insertNode(span);
        const caret = document.createRange();
        caret.setStart(t, t.length);
        caret.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caret);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    });
})();

function fmtApplyWeight(value) {
    let v = String(value || '').trim().toLowerCase();
    if (v === 'normal') v = '400';
    else if (v === 'bold') v = '700';
    if (FMT_WEIGHT_STEPS.indexOf(v) === -1) {
        const n = parseInt(v, 10);
        v = isNaN(n) ? '400' : String(Math.min(900, Math.max(100, Math.round(n / 100) * 100)));
    }
    playAeroClickSound(600, 0.08);
    return fmtWrapInline('font-weight', v);
}

function fmtApplySizePx(value) {
    let px = Math.round(parseFloat(value));
    if (isNaN(px)) return false;
    px = Math.min(200, Math.max(6, px));
    playAeroClickSound(600, 0.08);
    return fmtWrapInline('font-size', px + 'px');
}

// ==========================================
// STYLE PICKER (Add Style + Extension, inside the Style group!)
// ==========================================
var FMT_DEFAULT_STYLES = [
    { label: 'Orb Yellow', cls: 'gel-orb gel-y' },
    { label: 'Orb Red', cls: 'gel-orb gel-r' },
    { label: 'Orb Green', cls: 'gel-orb gel-g' },
    { label: 'Orb Cyan', cls: 'gel-orb gel-c' },
    { label: 'Orb Blue', cls: 'gel-orb gel-b' },
    { label: 'Orb Violet', cls: 'gel-orb gel-v' },
    { label: 'Orb Pink', cls: 'gel-orb gel-p' },
    { label: 'Orb Orange', cls: 'gel-orb gel-o' },
    { label: 'Orb Magenta', cls: 'gel-orb gel-mg' },
    { label: 'Orb Lime', cls: 'gel-orb gel-lm' },
    { label: 'Orb Aqua', cls: 'gel-orb gel-aq' },
    { label: 'Orb Slate', cls: 'gel-orb gel-sl' },
    { label: 'Spark Text', cls: 'spark-text' },
    { label: 'Green Flash', cls: 'gel-green-flash' },
    { label: 'Liquid Underline', cls: 'liquid-underline' },
    { label: 'Glossy Border', cls: 'glossy-border-badge' },
    { label: 'Cyber Spark', cls: 'cyber-glow-spark' },
    { label: 'Liquid Glow', cls: 'liquid-text-glow' },
    { label: 'Mirror Block', cls: 'reflected-text-block' },
    { label: 'Embossed Glass', cls: 'embossed-glass-text' },
    { label: 'Wave Text', cls: 'kinetic-wave-text' },
    { label: 'Tag Amber', cls: 'aero-tag-chip tag-chip-a' },
    { label: 'Tag Green', cls: 'aero-tag-chip tag-chip-g' },
    { label: 'Tag Orange', cls: 'aero-tag-chip tag-chip-o' },
    { label: 'Tag Red', cls: 'aero-tag-chip tag-chip-r' },
    { label: 'Tag Purple', cls: 'aero-tag-chip tag-chip-pr' },
    { label: 'Tag Pink', cls: 'aero-tag-chip tag-chip-pk' },
    { label: 'Tag Yellow', cls: 'aero-tag-chip tag-chip-y' },
    { label: 'Tag Slate', cls: 'aero-tag-chip tag-chip-sl' },
    { label: 'Bubble Cyan', cls: 'gel-bubble-chip gel-chip-cyan' },
    { label: 'Bubble Orange', cls: 'gel-bubble-chip gel-chip-orange' },
    { label: 'Bubble Green', cls: 'gel-bubble-chip gel-chip-green' },
    { label: 'Bubble Red', cls: 'gel-bubble-chip gel-chip-red' },
    { label: 'Bubble Purple', cls: 'gel-bubble-chip gel-chip-purple' },
    { label: 'Bubble Pink', cls: 'gel-bubble-chip gel-chip-pink' },
    { label: 'Bubble Yellow', cls: 'gel-bubble-chip gel-chip-yellow' },
    { label: 'Bubble Blue', cls: 'gel-bubble-chip gel-chip-blue' },
    { label: 'Bubble Lime', cls: 'gel-bubble-chip gel-chip-lime' },
    { label: 'Bubble Teal', cls: 'gel-bubble-chip gel-chip-teal' },
    { label: 'Bubble Gold', cls: 'gel-bubble-chip gel-chip-gold' },
    { label: 'Bubble Slate', cls: 'gel-bubble-chip gel-chip-slate' },
    { label: 'Bubble White', cls: 'gel-bubble-chip gel-chip-white' },
    { label: 'Bubble Black', cls: 'gel-bubble-chip gel-chip-black' },
    { label: 'Bubble Fog', cls: 'gel-bubble-chip gel-chip-fog' },
    { label: 'Bubble Turquoise', cls: 'gel-bubble-chip gel-chip-turquoise' },
    { label: 'Mercury Pearl', cls: 'effect-mercury-pearl' },
    { label: 'Prism Refract', cls: 'effect-prism-refract' },
    { label: 'Screen Cavity', cls: 'effect-screen-cavity' },
    { label: 'Sunlight Ray', cls: 'effect-sunlight-ray' },
    { label: 'Abyssal Plate', cls: 'effect-abyssal-plate' },
    { label: 'Metallic Mesh', cls: 'effect-metallic-mesh' },
    { label: 'Fluid Expand', cls: 'effect-fluid-expand' },
    { label: 'Metric Cavity', cls: 'effect-metric-cavity' },
    { label: 'Pearl Orb', cls: 'effect-pearl-orb' },
    { label: 'Lens Flare', cls: 'effect-lens-flare' },
    { label: 'Waterdrop Chip', cls: 'gel-chip-waterdrop' },
    { label: 'Solarflare Chip', cls: 'gel-chip-solarflare' },
    { label: 'Aurorawave Chip', cls: 'gel-chip-aurorawave' },
    { label: 'Glass Stamp', cls: 'applet-glass-stamp' },
    { label: 'Drop Shadow', cls: 'effect-drop-shadow-window' },
    { label: 'Glow Tube', cls: 'effect-glow-tube' },
    { label: 'Hardware Bevel', cls: 'effect-hardware-bevel' },
    { label: 'Screen Segment', cls: 'effect-screen-segment' },
    { label: 'Gel Capsule', cls: 'effect-gel-capsule' },
    { label: 'Fluid Orbit', cls: 'effect-fluid-orbit' },
    { label: 'X-Ray Glass', cls: 'effect-xray-glass' },
    { label: 'Waveform Line', cls: 'effect-waveform-line' },
    { label: 'Plasma Gel', cls: 'effect-plasma-gel' },
    { label: 'Water Bubble', cls: 'effect-water-bubble' },
    { label: 'Glow Tracer', cls: 'effect-glow-tracer' },
    { label: 'Shimmer Title', cls: 'effect-shimmer-title' },
    { label: 'Tinted Lens', cls: 'effect-tinted-lens' },
    { label: 'Audio Loop', cls: 'effect-audio-stream-loop' },
    { label: 'Biogel Capsule', cls: 'effect-biogel-capsule' },
    { label: 'Neon Ribbon', cls: 'effect-neon-ribbon' },
    { label: 'Droplet Amber', cls: 'droplet-amber' },
    { label: 'Droplet Crimson', cls: 'droplet-crimson' },
    { label: 'Droplet Fuchsia', cls: 'droplet-fuchsia' },
    { label: 'Droplet Amethyst', cls: 'droplet-amethyst' },
    { label: 'Droplet Tangerine', cls: 'droplet-tangerine' },
    { label: 'Droplet Slate', cls: 'droplet-slate' },
    { label: 'Plasma Cyan', cls: 'megachip-plasma plasma-cyan' },
    { label: 'Plasma Orange', cls: 'megachip-plasma plasma-orange' },
    { label: 'Plasma Crimson', cls: 'megachip-plasma plasma-crimson' },
    { label: 'Plasma Lime', cls: 'megachip-plasma plasma-lime' },
    { label: 'Bracket Blue', cls: 'megachip-glass-bracket bracket-blue' },
    { label: 'Bracket Amethyst', cls: 'megachip-glass-bracket bracket-amethyst' },
    { label: 'Bracket Fuchsia', cls: 'megachip-glass-bracket bracket-fuchsia' },
    { label: 'Bracket Amber', cls: 'megachip-glass-bracket bracket-amber' },
    { label: 'Badge Sky', cls: 'aero-glass-badge-chip badge-frame-sky' },
    { label: 'Badge Emerald', cls: 'aero-glass-badge-chip badge-frame-emerald' },
    { label: 'Badge Orange', cls: 'aero-glass-badge-chip badge-frame-orange' },
    { label: 'Badge Crimson', cls: 'aero-glass-badge-chip badge-frame-crimson' },
    { label: 'Badge Amethyst', cls: 'aero-glass-badge-chip badge-frame-amethyst' },
    { label: 'Badge Gold', cls: 'aero-glass-badge-chip badge-frame-gold' },
    { label: 'Swayed Sky', cls: 'gel-chip-swayed swayed-sky' },
    { label: 'Swayed Emerald', cls: 'gel-chip-swayed swayed-emerald' },
    { label: 'Swayed Orange', cls: 'gel-chip-swayed swayed-orange' },
    { label: 'Swayed Amethyst', cls: 'gel-chip-swayed swayed-amethyst' },
    { label: 'Pill Sky', cls: 'gel-chip-pill-variant pill-sky' },
    { label: 'Pill Emerald', cls: 'gel-chip-pill-variant pill-emerald' },
    { label: 'Pill Orange', cls: 'gel-chip-pill-variant pill-orange' },
    { label: 'Pill Amethyst', cls: 'gel-chip-pill-variant pill-amethyst' },
    { label: 'Pastel Yellow', cls: 'gel-chip-pastel pastel-yellow' },
    { label: 'Pastel Blue', cls: 'gel-chip-pastel pastel-blue' },
    { label: 'Pastel Green', cls: 'gel-chip-pastel pastel-green' },
    { label: 'Pastel Pink', cls: 'gel-chip-pastel pastel-pink' },
    { label: 'Pastel Purple', cls: 'gel-chip-pastel pastel-purple' },
    { label: 'Pastel Orange', cls: 'gel-chip-pastel pastel-orange' },
    { label: 'Ribbon Tangerine', cls: 'gel-chip-droplet-ribbon droplet-ribbon-tangerine' },
    { label: 'Ribbon Citrus', cls: 'gel-chip-droplet-ribbon droplet-ribbon-citrus' },
    { label: 'Ribbon Emerald', cls: 'gel-chip-droplet-ribbon droplet-ribbon-emerald' },
    { label: 'Ribbon Sapphire', cls: 'gel-chip-droplet-ribbon droplet-ribbon-sapphire' },
    { label: 'Ribbon Amethyst', cls: 'gel-chip-droplet-ribbon droplet-ribbon-amethyst' },
    { label: 'Ribbon Fuchsia', cls: 'gel-chip-droplet-ribbon droplet-ribbon-fuchsia' },
    { label: 'Ribbon Crimson', cls: 'gel-chip-droplet-ribbon droplet-ribbon-crimson' },
    { label: 'Ribbon Slate', cls: 'gel-chip-droplet-ribbon droplet-ribbon-slate' },
    { label: 'Heading 1', cls: 'header-1' },
    { label: 'Heading 2', cls: 'header-2' },
    { label: 'Heading 3', cls: 'header-3' },
    { label: 'Blockquote', cls: 'blockquote-list' },
    { label: 'Bullet List', cls: 'bulleted-list' },
    { label: 'Mega Header', cls: 'mega-header' },
    { label: 'Code Function', cls: 'dev-chip-function' },
    { label: 'Code Variable', cls: 'dev-chip-variable' },
    { label: 'Code String', cls: 'dev-chip-string' },
    { label: 'Radar Sweep', cls: 'av-chip-radar-sweep' },
    { label: 'AV Heading', cls: 'av-chip-heading' },
    { label: 'Altimeter', cls: 'av-chip-altimeter' },
    { label: 'Folder Tab', cls: 'jr-folder-tab' }
];

// Every extension style that EXISTS, live from the Marketplace (nothing hardcoded)!
function fmtExtensionVariants() {
    const out = [];
    try {
        const M = window.WriteoutMarketplace;
        if (!M || !M.catalog || typeof M.installed !== 'function') return out;
        const installed = M.installed();
        M.catalog.forEach(function (ext) {
            if (ext.category !== 'styles') return;
            const isIn = installed.indexOf(ext.id) !== -1;
            let variants = [];
            if (ext.kind === 'style-pack' && Array.isArray(ext.styles)) variants = ext.styles;
            else if (ext.kind === 'toolbar-style' && ext.toolbarClass) {
                variants = [{ name: ext.name, className: ext.toolbarClass }];
            }
            variants.forEach(function (v) {
                if (v && v.className) {
                    out.push({ label: (v.name || v.className) + ' \u00B7 ' + ext.name, cls: v.className, extId: ext.id, installed: isIn });
                }
            });
        });
    } catch (e) {}
    return out;
}

// One shared apply path (Marketplace owns it; local fallback if missing)!
// Set when a collapsed insert parks the caret on purpose: rescue must NOT
// yank it back to the old offset (that lands AFTER the fresh style)!
var fmtParkedCaret = false;
function fmtApplyPickerClass(cls) {
    try {
        if (typeof canvas === 'undefined' || !canvas) return false;
        const sel = window.getSelection();
        if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
        // Collapsed caret? Park a fresh styled span, just like the highlight washes!
        if (sel.isCollapsed) {
            try {
                const range = sel.getRangeAt(0);
                const span = document.createElement('span');
                span.className = cls;
                span.setAttribute('spellcheck', 'false');
                span.appendChild(document.createTextNode(''));
                range.insertNode(span);
                const caret = document.createRange();
                caret.setStart(span.firstChild, 0);
                caret.collapse(true);
                sel.removeAllRanges();
                sel.addRange(caret);
                fmtParkedCaret = true;
                if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
                return true;
            } catch (e) { return false; }
        }
        const M = window.WriteoutMarketplace;
        if (M && typeof M.apply === 'function') { M.apply(cls); return true; }
    } catch (e) {}
    try {
        if (typeof canvas === 'undefined' || !canvas) return false;
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed || !canvas.contains(sel.anchorNode)) return false;
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.className = cls;
        span.setAttribute('spellcheck', 'false');
        span.appendChild(range.extractContents());
        range.insertNode(span);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        return true;
    } catch (e) { return false; }
}

// ==========================================
// HIGHLIGHTER (25 fresh washes in the Main group!)
// ==========================================
var FMT_HIGHLIGHT_STYLES = [
    { label: 'Marker Yellow', cls: 'hl-1' },
    { label: 'Marker Pink', cls: 'hl-2' },
    { label: 'Marker Green', cls: 'hl-3' },
    { label: 'Marker Blue', cls: 'hl-4' },
    { label: 'Marker Orange', cls: 'hl-5' },
    { label: 'Marker Purple', cls: 'hl-6' },
    { label: 'Marker Teal', cls: 'hl-7' },
    { label: 'Marker Red', cls: 'hl-8' },
    { label: 'Neon Lemon', cls: 'hl-9' },
    { label: 'Neon Magenta', cls: 'hl-10' },
    { label: 'Neon Mint', cls: 'hl-11' },
    { label: 'Neon Cyan', cls: 'hl-12' },
    { label: 'Pastel Lemon', cls: 'hl-13' },
    { label: 'Pastel Rose', cls: 'hl-14' },
    { label: 'Pastel Mint', cls: 'hl-15' },
    { label: 'Pastel Sky', cls: 'hl-16' },
    { label: 'Pastel Peach', cls: 'hl-17' },
    { label: 'Pastel Lilac', cls: 'hl-18' },
    { label: 'Sunset', cls: 'hl-19' },
    { label: 'Ocean', cls: 'hl-20' },
    { label: 'Berry', cls: 'hl-21' },
    { label: 'Citrus', cls: 'hl-22' },
    { label: 'Midnight', cls: 'hl-23' },
    { label: 'Espresso', cls: 'hl-24' },
    { label: 'Slate', cls: 'hl-25' }
];

function fmtApplyHighlight(cls) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    try {
        const span = document.createElement('span');
        span.className = cls;
        span.setAttribute('spellcheck', 'false');
        if (range.collapsed) {
            span.appendChild(document.createTextNode(''));
            range.insertNode(span);
            const caret = document.createRange();
            caret.setStart(span.firstChild, 0);
            caret.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caret);
        } else {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            const reselected = document.createRange();
            reselected.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(reselected);
        }
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
        return true;
    } catch (e) { return false; }
}

var hlPopupWired = false;

function fmtToggleHighlightPopup() {
    const popup = document.getElementById('hl-popup');
    if (!popup) return;
    popup.hidden = !popup.hidden;
}

function fmtWireHighlighter() {
    if (fmtWireHighlighter._done) return;
    fmtWireHighlighter._done = true;
    const grid = document.getElementById('hl-grid');
    if (grid && !grid.children.length) {
        FMT_HIGHLIGHT_STYLES.forEach(function (item) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hl-swatch ' + item.cls;
            btn.title = item.label;
            btn.textContent = 'Aa';
            btn.setAttribute('data-hl-class', item.cls);
            grid.appendChild(btn);
        });
    }
    const main = document.getElementById('hl-main-btn');
    if (main) main.addEventListener('click', function () {
        playAeroClickSound(600, 0.08);
        fmtToggleHighlightPopup();
    });
    const chev = document.getElementById('hl-chevron-btn');
    if (chev) chev.addEventListener('click', function () {
        playAeroClickSound(600, 0.08);
        fmtToggleHighlightPopup();
    });
    if (grid) grid.addEventListener('click', function (e) {
        const btn = e.target.closest ? e.target.closest('[data-hl-class]') : null;
        if (!btn) return;
        playAeroClickSound(600, 0.08);
        fmtApplyHighlight(btn.getAttribute('data-hl-class'));
    });
    if (!hlPopupWired) {
        hlPopupWired = true;
        document.addEventListener('click', function (ev) {
            const pop = document.getElementById('hl-popup');
            const m = document.getElementById('hl-main-btn');
            const c = document.getElementById('hl-chevron-btn');
            if (!pop || pop.hidden) return;
            if (pop.contains(ev.target)) return;
            if ((m && m.contains(ev.target)) || (c && c.contains(ev.target))) return;
            pop.hidden = true;
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') {
                const pop = document.getElementById('hl-popup');
                if (pop) pop.hidden = true;
            }
        });
    }
}

// ==========================================
// RAINBOW CHIPS (25 non-Keydown chips in the Highlight section!)
// Same split-button + popup architecture as the washes!
// ==========================================
var FMT_CHIP_STYLES = [
    { label: 'Orb Red', cls: 'gel-orb gel-r' },
    { label: 'Orb Orange', cls: 'gel-orb gel-o' },
    { label: 'Orb Yellow', cls: 'gel-orb gel-y' },
    { label: 'Orb Lime', cls: 'gel-orb gel-lm' },
    { label: 'Orb Green', cls: 'gel-orb gel-g' },
    { label: 'Orb Aqua', cls: 'gel-orb gel-aq' },
    { label: 'Orb Cyan', cls: 'gel-orb gel-c' },
    { label: 'Orb Blue', cls: 'gel-orb gel-b' },
    { label: 'Orb Violet', cls: 'gel-orb gel-v' },
    { label: 'Orb Magenta', cls: 'gel-orb gel-mg' },
    { label: 'Orb Pink', cls: 'gel-orb gel-p' },
    { label: 'Orb Slate', cls: 'gel-orb gel-sl' }
];

function fmtApplyChip(cls) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    try {
        const span = document.createElement('span');
        span.className = cls;
        span.setAttribute('spellcheck', 'false');
        if (range.collapsed) {
            span.appendChild(document.createTextNode(''));
            range.insertNode(span);
            const caret = document.createRange();
            caret.setStart(span.firstChild, 0);
            caret.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caret);
        } else {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            const reselected = document.createRange();
            reselected.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(reselected);
        }
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
        return true;
    } catch (e) { return false; }
}

var chipPopupWired = false;

function fmtToggleChipPopup() {
    const popup = document.getElementById('cp-popup');
    if (!popup) return;
    popup.hidden = !popup.hidden;
}

function fmtWireChips() {
    if (fmtWireChips._done) return;
    fmtWireChips._done = true;
    const grid = document.getElementById('cp-grid');
    if (grid && !grid.children.length) {
        FMT_CHIP_STYLES.forEach(function (item) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cp-swatch ' + item.cls;
            btn.title = item.label;
            btn.textContent = 'Aa';
            btn.setAttribute('data-chip-class', item.cls);
            grid.appendChild(btn);
        });
    }
    const main = document.getElementById('cp-main-btn');
    if (main) {
        main.addEventListener('mousedown', function (e) { e.preventDefault(); });
        main.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            fmtToggleChipPopup();
        });
    }
    const chev = document.getElementById('cp-chevron-btn');
    if (chev) {
        chev.addEventListener('mousedown', function (e) { e.preventDefault(); });
        chev.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            fmtToggleChipPopup();
        });
    }
    if (grid) {
        grid.addEventListener('mousedown', function (e) {
            if (e.target.closest && e.target.closest('[data-chip-class]')) e.preventDefault();
        });
        grid.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-chip-class]') : null;
            if (!btn) return;
            playAeroClickSound(600, 0.08);
            fmtApplyChip(btn.getAttribute('data-chip-class'));
        });
    }
    if (!chipPopupWired) {
        chipPopupWired = true;
        document.addEventListener('click', function (ev) {
            const pop = document.getElementById('cp-popup');
            const m = document.getElementById('cp-main-btn');
            const c = document.getElementById('cp-chevron-btn');
            if (!pop || pop.hidden) return;
            if (pop.contains(ev.target)) return;
            if ((m && m.contains(ev.target)) || (c && c.contains(ev.target))) return;
            pop.hidden = true;
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') {
                const pop = document.getElementById('cp-popup');
                if (pop) pop.hidden = true;
            }
        });
    }
}

// ==========================================
// AQUA CHIPS (25 hand-tuned droplet pills in the Highlight section!)
// Same split-button + popup architecture as the rainbow chips!
// ==========================================
var FMT_AQUA_STYLES = [
    { label: 'Bubble Red', cls: 'gel-bubble-chip gel-chip-red' },
    { label: 'Bubble Orange', cls: 'gel-bubble-chip gel-chip-orange' },
    { label: 'Bubble Yellow', cls: 'gel-bubble-chip gel-chip-yellow' },
    { label: 'Bubble Gold', cls: 'gel-bubble-chip gel-chip-gold' },
    { label: 'Bubble Lime', cls: 'gel-bubble-chip gel-chip-lime' },
    { label: 'Bubble Green', cls: 'gel-bubble-chip gel-chip-green' },
    { label: 'Bubble Teal', cls: 'gel-bubble-chip gel-chip-teal' },
    { label: 'Bubble Turquoise', cls: 'gel-bubble-chip gel-chip-turquoise' },
    { label: 'Bubble Cyan', cls: 'gel-bubble-chip gel-chip-cyan' },
    { label: 'Bubble Blue', cls: 'gel-bubble-chip gel-chip-blue' },
    { label: 'Bubble Purple', cls: 'gel-bubble-chip gel-chip-purple' },
    { label: 'Bubble Pink', cls: 'gel-bubble-chip gel-chip-pink' },
    { label: 'Bubble White', cls: 'gel-bubble-chip gel-chip-white' },
    { label: 'Bubble Fog', cls: 'gel-bubble-chip gel-chip-fog' },
    { label: 'Bubble Slate', cls: 'gel-bubble-chip gel-chip-slate' },
    { label: 'Bubble Black', cls: 'gel-bubble-chip gel-chip-black' }
];

function fmtApplyAqua(cls) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    try {
        const span = document.createElement('span');
        span.className = cls;
        span.setAttribute('spellcheck', 'false');
        if (range.collapsed) {
            span.appendChild(document.createTextNode(''));
            range.insertNode(span);
            const caret = document.createRange();
            caret.setStart(span.firstChild, 0);
            caret.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caret);
        } else {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            const reselected = document.createRange();
            reselected.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(reselected);
        }
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
        return true;
    } catch (e) { return false; }
}

var aquaPopupWired = false;

function fmtToggleAquaPopup() {
    const popup = document.getElementById('aq-popup');
    if (!popup) return;
    popup.hidden = !popup.hidden;
}

function fmtWireAqua() {
    if (fmtWireAqua._done) return;
    fmtWireAqua._done = true;
    const grid = document.getElementById('aq-grid');
    if (grid && !grid.children.length) {
        FMT_AQUA_STYLES.forEach(function (item) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'aq-swatch ' + item.cls;
            btn.title = item.label;
            btn.textContent = 'Aa';
            btn.setAttribute('data-aqua-class', item.cls);
            grid.appendChild(btn);
        });
    }
    const main = document.getElementById('aq-main-btn');
    if (main) {
        main.addEventListener('mousedown', function (e) { e.preventDefault(); });
        main.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            fmtToggleAquaPopup();
        });
    }
    const chev = document.getElementById('aq-chevron-btn');
    if (chev) {
        chev.addEventListener('mousedown', function (e) { e.preventDefault(); });
        chev.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            fmtToggleAquaPopup();
        });
    }
    if (grid) {
        grid.addEventListener('mousedown', function (e) {
            if (e.target.closest && e.target.closest('[data-aqua-class]')) e.preventDefault();
        });
        grid.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-aqua-class]') : null;
            if (!btn) return;
            playAeroClickSound(600, 0.08);
            fmtApplyAqua(btn.getAttribute('data-aqua-class'));
        });
    }
    if (!aquaPopupWired) {
        aquaPopupWired = true;
        document.addEventListener('click', function (ev) {
            const pop = document.getElementById('aq-popup');
            const m = document.getElementById('aq-main-btn');
            const c = document.getElementById('aq-chevron-btn');
            if (!pop || pop.hidden) return;
            if (pop.contains(ev.target)) return;
            if ((m && m.contains(ev.target)) || (c && c.contains(ev.target))) return;
            pop.hidden = true;
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') {
                const pop = document.getElementById('aq-popup');
                if (pop) pop.hidden = true;
            }
        });
    }
}

var FMT_UNI_PICKER_ITEM = { label: 'Uni-Chip (custom)...', cls: 'uni-chip' };
var FMT_PICKER_VIEW_KEY = 'bitbook_picker_view';
var fmtPickerTab = 'default';
var fmtPickerView = 'list';
try {
    const pv = localStorage.getItem(FMT_PICKER_VIEW_KEY);
    if (pv === 'mini' || pv === 'list') fmtPickerView = pv;
} catch (e) {}

function fmtRenderStylePicker() {
    const popup = document.getElementById('style-picker-popup');
    const list = document.getElementById('style-picker-list');
    if (!popup || !list) return;
    const tabs = document.getElementById('style-picker-tabs');
    if (tabs) {
        tabs.querySelectorAll('[data-picker-tab]').forEach(function (btn) {
            if (btn.getAttribute('data-picker-tab') === fmtPickerTab) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }
    const views = popup.querySelectorAll ? popup.querySelectorAll('[data-picker-view]') : [];
    Array.from(views).forEach(function (btn) {
        if (btn.getAttribute('data-picker-view') === fmtPickerView) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    const isExt = fmtPickerTab === 'ext';
    const mini = fmtPickerView === 'mini';
    // Uni-Chip leads the Default list: it opens its color settings first!
    const items = isExt ? fmtExtensionVariants() : [FMT_UNI_PICKER_ITEM].concat(FMT_DEFAULT_STYLES);
    if (mini) list.classList.add('mini');
    else list.classList.remove('mini');
    list.innerHTML = '';
    if (!items.length) {
        const p = document.createElement('p');
        p.className = 'style-picker-empty';
        p.textContent = isExt ? 'No extension styles installed yet.' : 'No default styles found.';
        list.appendChild(p);
        return;
    }
    items.forEach(function (item) {
        if (mini) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'style-picker-mini';
            btn.title = item.label;
            btn.setAttribute('data-picker-class', item.cls);
            if (item.extId) btn.setAttribute('data-picker-ext', item.extId);
            const sw = document.createElement('span');
            sw.className = item.cls;
            sw.textContent = 'Aa';
            btn.appendChild(sw);
            list.appendChild(btn);
        } else {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'style-picker-item';
            btn.setAttribute('data-picker-class', item.cls);
            if (item.extId) btn.setAttribute('data-picker-ext', item.extId);
            const sw = document.createElement('span');
            sw.className = 'picker-preview ' + item.cls;
            sw.textContent = 'Ab';
            const nm = document.createElement('span');
            nm.className = 'picker-name';
            nm.textContent = item.label + (item.extId && !item.installed ? ' (Get)' : '');
            btn.appendChild(sw);
            btn.appendChild(nm);
            list.appendChild(btn);
        }
    });
}

function fmtOpenStylePicker(kind) {
    fmtPickerTab = (kind === 'ext') ? 'ext' : 'default';
    const popup = document.getElementById('style-picker-popup');
    if (!popup) return;
    popup.removeAttribute('hidden');
    fmtRenderStylePicker();
}

function fmtToggleStylePicker(kind) {
    const popup = document.getElementById('style-picker-popup');
    if (!popup) return;
    const want = (kind === 'ext') ? 'ext' : 'default';
    if (!popup.hasAttribute('hidden') && fmtPickerTab === want) {
        popup.setAttribute('hidden', '');
        return;
    }
    fmtOpenStylePicker(want);
}

function fmtWireStylePicker() {
    const group = document.getElementById('format-group-style');
    if (group && !group._fmtMouseWired) {
        group._fmtMouseWired = true;
        group.addEventListener('mousedown', function (e) {
            if (e.target.closest && e.target.closest('button')) e.preventDefault();
        });
    }
    const add = document.getElementById('style-add-btn');
    if (add && !add._fmtPickerWired) {
        add._fmtPickerWired = true;
        add.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            fmtToggleStylePicker('default');
        });
    }
    const x = document.getElementById('style-picker-x');
    if (x && !x._fmtPickerWired) {
        x._fmtPickerWired = true;
        x.addEventListener('click', function () {
            const popup = document.getElementById('style-picker-popup');
            if (popup) popup.setAttribute('hidden', '');
        });
    }
    const list = document.getElementById('style-picker-list');
    if (list && !list._fmtPickerWired) {
        list._fmtPickerWired = true;
        list.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-picker-class]') : null;
            if (!btn) return;
            const cls = btn.getAttribute('data-picker-class');
            if (cls === FMT_UNI_PICKER_ITEM.cls && !btn.hasAttribute('data-picker-ext')) {
                if (typeof uniOpenDialog === 'function') uniOpenDialog();
                return;
            }
            playAeroClickSound(600, 0.08);
            const extId = btn.getAttribute('data-picker-ext');
            try {
                const M = window.WriteoutMarketplace;
                if (extId && M && typeof M.installed === 'function' && typeof M.install === 'function') {
                    if (M.installed().indexOf(extId) === -1) {
                        M.install(extId);
                        fmtRenderStylePicker();
                    }
                }
            } catch (err) {}
            if (typeof fmtRescueSelection === 'function') {
                fmtRescueSelection(function () { fmtApplyPickerClass(cls); });
            } else {
                fmtApplyPickerClass(cls);
            }
        });
    }
    const tabs = document.getElementById('style-picker-tabs');
    if (tabs && !tabs._fmtPickerWired) {
        tabs._fmtPickerWired = true;
        tabs.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-picker-tab]') : null;
            if (!btn) return;
            playAeroClickSound(600, 0.08);
            fmtPickerTab = btn.getAttribute('data-picker-tab') === 'ext' ? 'ext' : 'default';
            fmtRenderStylePicker();
        });
    }
    const popup = document.getElementById('style-picker-popup');
    if (popup && !popup._fmtViewWired) {
        popup._fmtViewWired = true;
        popup.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-picker-view]') : null;
            if (!btn) return;
            playAeroClickSound(600, 0.08);
            fmtPickerView = btn.getAttribute('data-picker-view') === 'mini' ? 'mini' : 'list';
            try { localStorage.setItem(FMT_PICKER_VIEW_KEY, fmtPickerView); } catch (err) {}
            fmtRenderStylePicker();
        });
    }
}

if (topFormatBar) {
    // 1. Handle changes from top toolbar dropdowns & pickers using data-edit-action
    topFormatBar.addEventListener('change', (e) => {
        const action = e.target.getAttribute('data-edit-action');
        if (!action) return;

        if (action === 'fontWeight' || action === 'fontSizePx') {
            // Snapshot the range: focusing the canvas may nudge the caret!
            let saved = null;
            try {
                const sel = window.getSelection();
                if (sel.rangeCount && canvas.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange();
                // The size box took the selection: use the last one from the note!
                else if (fmtLastRange && canvas.contains(fmtLastRange.commonAncestorContainer)) saved = fmtLastRange.cloneRange();
            } catch (e) {}
            canvas.focus();
            try {
                if (saved) {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(saved);
                }
            } catch (e) {}
            if (action === 'fontWeight') fmtApplyWeight(e.target.value);
            else fmtApplySizePx(e.target.value);
            autoSaveCanvasContent();
            return;
        }

        canvas.focus();
        const value = e.target.value;
        document.execCommand(action, false, value);
        autoSaveCanvasContent();
    });

    topFormatBar.addEventListener('input', (e) => {
        // Handles live color picker updates if using 'input' events
        const action = e.target.getAttribute('data-edit-action');
        if (!action) return;
        // Weight + size apply on commit (change) only -- never mid-keystroke!
        if (action === 'fontWeight' || action === 'fontSizePx') return;

        canvas.focus();
        const value = e.target.value;
        document.execCommand(action, false, value);
        autoSaveCanvasContent();
    });

    topFormatBar.addEventListener('click', (e) => {
        // Reset buttons strip back to the inherited color!
        const reset = e.target.closest ? e.target.closest('[data-reset-action]') : null;
        if (!reset) return;
        playAeroClickSound(600, 0.08);
        fmtResetColor(reset.getAttribute('data-reset-action'));
        autoSaveCanvasContent();
        fmtUpdateResetButtons();
    });

    // Mousedown on sidebar buttons must not steal the text selection!
    topFormatBar.addEventListener('mousedown', (e) => {
        if (e.target.closest && e.target.closest('button')) e.preventDefault();
    });

    topFormatBar.addEventListener('click', (e) => {
        // Paragraph alignment buttons!
        const alignBtn = e.target.closest ? e.target.closest('[data-align]') : null;
        if (!alignBtn) return;
        playAeroClickSound(600, 0.08);
        fmtAlignBlocks(alignBtn.getAttribute('data-align'));
    });

// ==========================================
// FORMAT SIDEBAR GROUPS + DOCUMENT PAGE SIZE
// (Note size rides along inside every .KN snapshot!)
// ==========================================
var FMT_GROUP_KEY = 'bitbook_format_group';
var KD_PAGE_SIZE_KEY = 'bitbook_note_size';
var KD_PAGE_ORIENT_KEY = 'bitbook_note_orientation';
var KD_PAGE_SIZES = [
    { id: 'kd', name: 'KD Note', hint: 'current canvas size' },
    { id: 'a4', name: 'A4', w: 794, h: 1123 },
    { id: 'a5', name: 'A5', w: 559, h: 794 },
    { id: 'a3', name: 'A3', w: 1123, h: 1587 },
    { id: 'letter', name: 'Letter', w: 816, h: 1056 },
    { id: 'legal', name: 'Legal', w: 816, h: 1344 }
];
var kdPageSizeId = 'kd';
var kdPageOrient = 'portrait';
var KD_DOC_PASSWORD_KEY = 'bitbook_note_password';
var kdDocPasswordHash = '';
try {
    const ph = localStorage.getItem(KD_DOC_PASSWORD_KEY);
    if (ph) kdDocPasswordHash = ph;
} catch (e) {}

// Salted sync hash (lock-screen deterrent, not encryption)!
function kdHashPassword(pw) {
    const s = 'writeout-doc-lock:' + String(pw);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ('00000000' + (h2 >>> 0).toString(16)).slice(-8) + ('00000000' + (h1 >>> 0).toString(16)).slice(-8);
}

function kdSetDocPassword(value) {
    kdDocPasswordHash = value ? kdHashPassword(value) : '';
    try {
        if (kdDocPasswordHash) localStorage.setItem(KD_DOC_PASSWORD_KEY, kdDocPasswordHash);
        else localStorage.removeItem(KD_DOC_PASSWORD_KEY);
    } catch (e) {}
    kdRenderDocSettings();
}

var kdPendingLock = null;

function kdLockDialogEls() {
    return {
        overlay: document.getElementById('doc-lock-overlay'),
        input: document.getElementById('doc-lock-input'),
        error: document.getElementById('doc-lock-error')
    };
}

function kdShowLockDialog() {
    const els = kdLockDialogEls();
    if (!els.overlay) return;
    if (els.input) els.input.value = '';
    if (els.error) els.error.setAttribute('hidden', '');
    els.overlay.classList.add('active');
    if (els.input && typeof els.input.focus === 'function') {
        try { els.input.focus(); } catch (e) {}
    }
}

function kdHideLockDialog() {
    const els = kdLockDialogEls();
    if (els.overlay) els.overlay.classList.remove('active');
    if (els.input) els.input.value = '';
    kdPendingLock = null;
}

function kdUnlockAttempt() {
    if (!kdPendingLock) return;
    const els = kdLockDialogEls();
    const attempt = els.input ? els.input.value : '';
    if (attempt && kdHashPassword(attempt) === kdPendingLock.hash) {
        const pending = kdPendingLock;
        kdHideLockDialog();
        kdApplyDocSettings(pending.frontGate);
        kdLoadDocContent(pending.afterText);
    } else {
        if (els.error) els.error.removeAttribute('hidden');
        if (els.input) {
            els.input.value = '';
            try { els.input.focus(); } catch (e) {}
        }
    }
}

function kdWireLockDialog() {
    if (kdWireLockDialog._done) return;
    kdWireLockDialog._done = true;
    const overlay = document.getElementById('doc-lock-overlay');
    const unlock = document.getElementById('doc-lock-unlock-btn');
    const cancel = document.getElementById('doc-lock-cancel-btn');
    const close = document.getElementById('doc-lock-close-btn');
    const input = document.getElementById('doc-lock-input');
    if (unlock) unlock.addEventListener('click', function () { playAeroClickSound(700, 0.1); kdUnlockAttempt(); });
    if (cancel) cancel.addEventListener('click', function () { playAeroClickSound(450, 0.08); kdHideLockDialog(); });
    if (close) close.addEventListener('click', function () { playAeroClickSound(450, 0.08); kdHideLockDialog(); });
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) kdHideLockDialog();
        });
    }
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); kdUnlockAttempt(); }
        });
    }
}

// Shared .KN content loader (locked imports resume here after unlock)!
function kdLoadDocContent(afterText) {
    const kdParsedFile = kdParseTabsFence(String(afterText || '').trim());
    canvasViewport.innerHTML = kdParsedFile.tabs ? kdRestoreTabs(kdParsedFile.tabs) : kdRestoreTabs([{ name: 'Quick Note', html: kdParsedFile.html }]);
    kdHydrateInteractions();
    kdRenderTabs();
    kdRenderOutline();
}
try {
    const sid = localStorage.getItem(KD_PAGE_SIZE_KEY);
    if (sid && KD_PAGE_SIZES.some(function (s) { return s.id === sid; })) kdPageSizeId = sid;
    const so = localStorage.getItem(KD_PAGE_ORIENT_KEY);
    if (so === 'landscape' || so === 'portrait') kdPageOrient = so;
} catch (e) {}

function kdPageSizeDef(id) {
    for (let i = 0; i < KD_PAGE_SIZES.length; i++) {
        if (KD_PAGE_SIZES[i].id === id) return KD_PAGE_SIZES[i];
    }
    return KD_PAGE_SIZES[0];
}

// Effective canvas width (null = KD Document = no override)!
function kdPageWidth() {
    const def = kdPageSizeDef(kdPageSizeId);
    if (!def.w) return null;
    return kdPageOrient === 'landscape' ? Math.max(def.w, def.h) : Math.min(def.w, def.h);
}

// Effective canvas height: fixed sizes use their page height, KD starts extended!
function kdPageHeight() {
    const def = kdPageSizeDef(kdPageSizeId);
    if (!def.h) return 1123;
    return kdPageOrient === 'landscape' ? Math.min(def.w, def.h) : Math.max(def.w, def.h);
}

function kdApplyPageSize() {
    try {
        if (typeof canvasViewport !== 'undefined' && canvasViewport) {
            const w = kdPageWidth();
            if (w) canvasViewport.style.maxWidth = w + 'px';
            else canvasViewport.style.removeProperty('max-width');
            canvasViewport.style.minHeight = kdPageHeight() + 'px';
        }
    } catch (e) {}
    kdRenderDocSettings();
}

function kdSetPageSize(id) {
    kdPageSizeId = kdPageSizeDef(id).id;
    try { localStorage.setItem(KD_PAGE_SIZE_KEY, kdPageSizeId); } catch (e) {}
    playAeroClickSound(600, 0.08);
    kdApplyPageSize();
}

function kdSetOrient(o) {
    kdPageOrient = (o === 'landscape') ? 'landscape' : 'portrait';
    try { localStorage.setItem(KD_PAGE_ORIENT_KEY, kdPageOrient); } catch (e) {}
    playAeroClickSound(600, 0.08);
    kdApplyPageSize();
}

function kdRenderDocSettings() {
    const box = document.getElementById('format-page-sizes');
    if (box) {
        box.innerHTML = '';
        KD_PAGE_SIZES.forEach(function (def) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'format-page-row' + (def.id === kdPageSizeId ? ' active' : '');
            btn.setAttribute('data-page-size', def.id);
            btn.textContent = def.name;
            box.appendChild(btn);
        });
    }
    const pwBox = document.getElementById('format-doc-password');
    if (pwBox && document.activeElement !== pwBox) {
        pwBox.placeholder = kdDocPasswordHash ? 'Protected - clear to unlock' : 'Set a password...';
    }
    const orow = document.getElementById('format-orient-row');
    if (orow) {
        orow.querySelectorAll('[data-orient]').forEach(function (btn) {
            if (btn.getAttribute('data-orient') === kdPageOrient) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }
}

var FMT_GROUPS = ['main', 'style', 'doc'];

function fmtStoredGroup() {
    try {
        const g = localStorage.getItem(FMT_GROUP_KEY);
        if (FMT_GROUPS.indexOf(g) !== -1) return g;
    } catch (e) {}
    return 'main';
}

function fmtSetGroup(g, silent) {
    if (FMT_GROUPS.indexOf(g) === -1) g = 'main';
    try { localStorage.setItem(FMT_GROUP_KEY, g); } catch (e) {}
    if (!silent) playAeroClickSound(600, 0.08);
    document.querySelectorAll('[data-fmt-group]').forEach(function (btn) {
        if (btn.getAttribute('data-fmt-group') === g) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    const panes = [['format-group-main', 'main'], ['format-group-style', 'style'], ['format-group-document', 'doc']];
    panes.forEach(function (pair) {
        const el = document.getElementById(pair[0]);
        if (!el) return;
        if (g === pair[1]) {
            el.removeAttribute('hidden');
            if (pair[1] === 'doc') kdRenderDocSettings();
        } else {
            el.setAttribute('hidden', '');
        }
    });
}

function fmtWireDocSettings() {
    const seg = document.querySelector('.format-segmented');
    if (seg && !seg._fmtGroupWired) {
        seg._fmtGroupWired = true;
        seg.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-fmt-group]') : null;
            if (!btn) return;
            fmtSetGroup(btn.getAttribute('data-fmt-group'));
        });
    }
    const box = document.getElementById('format-page-sizes');
    if (box && !box._fmtSizeWired) {
        box._fmtSizeWired = true;
        box.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-page-size]') : null;
            if (!btn) return;
            kdSetPageSize(btn.getAttribute('data-page-size'));
        });
    }
    const pwBox = document.getElementById('format-doc-password');
    if (pwBox && !pwBox._fmtPasswordWired) {
        pwBox._fmtPasswordWired = true;
        pwBox.addEventListener('input', function () {
            kdSetDocPassword(pwBox.value);
        });
    }
    const orow = document.getElementById('format-orient-row');
    if (orow && !orow._fmtOrientWired) {
        orow._fmtOrientWired = true;
        orow.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-orient]') : null;
            if (!btn) return;
            kdSetOrient(btn.getAttribute('data-orient'));
        });
    }
}

// Front-matter note settings ride inside every .KN file!
function kdApplyDocSettings(frontMatter) {
    const m = String(frontMatter || '');
    const size = (m.match(/page_size:\s*"([^"]+)"/) || [])[1];
    const orient = (m.match(/page_orientation:\s*"([^"]+)"/) || [])[1];
    const lock = (m.match(/doc_password:\s*"([^"]+)"/) || [])[1];
    kdDocPasswordHash = lock || '';
    try {
        if (kdDocPasswordHash) localStorage.setItem(KD_DOC_PASSWORD_KEY, kdDocPasswordHash);
        else localStorage.removeItem(KD_DOC_PASSWORD_KEY);
    } catch (e) {}
    kdPageSizeId = kdPageSizeDef(size).id;
    kdPageOrient = (orient === 'landscape' || orient === 'portrait') ? orient : 'portrait';
    var loadInfo = true;
    try { loadInfo = localStorage.getItem('bitbook_load_note_info') !== '0'; } catch (e) {}
    if (loadInfo) {
        var infoM = m.match(/^note_info:\s*"(.*)"\s*$/m);
        var noteInfo = '';
        if (infoM) {
            try { noteInfo = JSON.parse('"' + infoM[1] + '"'); }
            catch (e) { noteInfo = infoM[1]; }
        }
        try { localStorage.setItem('bitbook_note_info', noteInfo); } catch (e) {}
        var nib = document.getElementById('note-info-text');
        if (nib) nib.value = noteInfo;
    }
    try {
        localStorage.setItem(KD_PAGE_SIZE_KEY, kdPageSizeId);
        localStorage.setItem(KD_PAGE_ORIENT_KEY, kdPageOrient);
    } catch (e) {}
    kdApplyPageSize();
}

    topFormatBar.addEventListener('click', (e) => {
        // Paragraph indent/outdent buttons!
        const indBtn = e.target.closest ? e.target.closest('[data-indent]') : null;
        if (!indBtn) return;
        playAeroClickSound(600, 0.08);
        fmtIndentBlocks(indBtn.getAttribute('data-indent') === 'out' ? -1 : 1);
    });
}

// 2. Dynamic Synchronization: Update top bar controls to match selected text
function syncTopBarWithSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount || !topFormatBar) return;

    let node = selection.anchorNode;
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
    }

    if (!node || !canvas.contains(node)) return;
    const computed = window.getComputedStyle(node);

    // Sync Font Name Dropdown
    const fontSelect = topFormatBar.querySelector('[data-edit-action="fontName"]');
    if (fontSelect && computed.fontFamily) {
        const fontFamily = computed.fontFamily.replace(/['"]+/g, '').toLowerCase();
        for (let option of fontSelect.options) {
            if (fontFamily.includes(option.value.toLowerCase())) {
                fontSelect.value = option.value;
                break;
            }
        }
        if (typeof fpSyncLabel === 'function') fpSyncLabel();
    }

    // Sync Font Weight Dropdown (snap the caret's computed weight to the nearest step!)
    const weightSelect = topFormatBar.querySelector('[data-edit-action="fontWeight"]');
    if (weightSelect && computed.fontWeight) {
        const w = String(fmtPending && fmtPending['font-weight'] ? fmtPending['font-weight'] : computed.fontWeight).toLowerCase();
        const num = w === 'normal' ? 400 : (w === 'bold' ? 700 : parseInt(w, 10));
        if (!isNaN(num)) {
            const steps = [300, 400, 500, 600, 700, 800, 900];
            let best = steps[0];
            let bestDist = Math.abs(num - steps[0]);
            steps.forEach(function (s) {
                const dist = Math.abs(num - s);
                if (dist < bestDist) { bestDist = dist; best = s; }
            });
            const match = Array.from(weightSelect.options).some(function (o) { return o.value === String(best); });
            if (match) weightSelect.value = String(best);
        }
    }

    // Sync Text Size Number (raw pixels -- never clobber while the user types!)
    const sizeNumber = topFormatBar.querySelector('[data-edit-action="fontSizePx"]');
    if (sizeNumber && computed.fontSize && document.activeElement !== sizeNumber) {
        // A size waiting for your next letters shows instead of the caret's current one!
        const px = Math.round(parseFloat(fmtPending && fmtPending['font-size'] ? fmtPending['font-size'] : computed.fontSize));
        if (!isNaN(px)) sizeNumber.value = String(px);
    }

    // Sync Text Color Picker
    const forePicker = topFormatBar.querySelector('[data-edit-action="foreColor"]');
    if (forePicker && computed.color) {
        const hexColor = rgbToHex(computed.color);
        if (hexColor) forePicker.value = hexColor;
    }

    // Sync Highlight Color Picker (transparent stays untouched!)
    const hilitePicker = topFormatBar.querySelector('[data-edit-action="hiliteColor"]');
    if (hilitePicker && computed.backgroundColor) {
        const hexBg = rgbToHex(computed.backgroundColor);
        if (hexBg) hilitePicker.value = hexBg;
    }

    fmtUpdateResetButtons();
    fmtSyncAlignButtons();
}

// Hook synchronization into your existing canvas mouse/key events
canvas.addEventListener('mouseup', () => {
    syncTopBarWithSelection();
});

canvas.addEventListener('keyup', () => {
    syncTopBarWithSelection();
});

function printWriteoutPage() {
    playAeroClickSound(700, 0.12);
    
    // Auto-save content state before opening print dialog
    autoSaveCanvasContent();
    
    // Trigger the browser print/export modal window
    window.print();
}

// ==========================================
// ON-START MOBILE REDIRECT ENGINE
// ==========================================
function checkAndRedirectMobile() {
    // 1. Set your target mobile page URL here
    // (Relative to this page at /writeout/, so it lands on /writeout/mobile/index.html!)
    const mobileTargetUrl = 'mobile/index.html'; 
    
    // 2. Detect mobile via screen width (e.g., tablets/phones under 768px) and User Agent regex
    const isMobileScreen = window.innerWidth <= 768;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 3. Redirect if on mobile AND not already on the target page (prevents infinite loops)
    if ((isMobileScreen || isMobileUserAgent) && !window.location.pathname.includes(mobileTargetUrl)) {
        window.location.href = mobileTargetUrl;
    }
}

// Run automatically the exact moment the DOM loads on start
window.addEventListener('DOMContentLoaded', checkAndRedirectMobile);

// ==========================================
// PART 13: IMPORT HYDRATION (REVIVE IMPORTED CONTROLS)
// innerHTML hydration drops all listeners — this pass re-attaches every
// interactive behavior (state seeded from the surviving markup!), so an
// opened file works exactly like freshly typed formatting!
// ==========================================
var kdWiredSet = new WeakSet();

function kdWireOnce(el, fn) {
    if (!el || kdWiredSet.has(el)) return false;
    try { fn(el); } catch (e) {}
    kdWiredSet.add(el);
    return true;
}

function kdNum(text, fallback) {
    const m = String(text || '').match(/(-?\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : fallback;
}

function kdBaseLabel(text) {
    const t = String(text || '');
    const i = t.lastIndexOf(':');
    return (i > 0 ? t.substring(0, i) : t).trim();
}

function kdHydrateInteractions(root) {
    const scope = root || ((typeof canvas !== 'undefined') ? canvas : null);
    if (!scope || !scope.querySelectorAll) return 0;
    let wired = 0;
    const each = function (sel, fn) {
        scope.querySelectorAll(sel).forEach(function (el) {
            if (kdWireOnce(el, fn)) wired++;
        });
    };

    // --- Foldout panels (::foldout): arrow orb toggles collapse! ---
    each('.aero-foldout-panel .foldout-arrow-orb', function (orb) {
        const panel = orb.closest('.aero-foldout-panel');
        orb.addEventListener('click', function () {
            playAeroClickSound(450, 0.1);
            if (panel) panel.classList.toggle('panel-collapsed');
        });
    });

    // --- Foldout tab applet (~FN~): responsive blip! ---
    each('.applet-foldout-tab', function (el) {
        el.addEventListener('click', function () {
            playAeroClickSound(500, 0.15);
        });
    });

    // --- Aqua switch applet (~TS~): on/off toggle! ---
    each('.applet-aqua-switch', function (el) {
        el.addEventListener('click', function () {
            playAeroClickSound(650, 0.08);
            el.classList.toggle('turned-on');
        });
    });

    // --- State button applet (~TB~): green/red toggle! ---
    each('.applet-state-button', function (el) {
        el.addEventListener('click', function () {
            if (el.classList.contains('state-green')) {
                playAeroClickSound(400, 0.12);
                el.classList.remove('state-green');
                el.classList.add('state-red');
            } else {
                playAeroClickSound(650, 0.08);
                el.classList.remove('state-red');
                el.classList.add('state-green');
            }
        });
    });

    // --- Volume dial applet (~VD~): level seeded from its own label! ---
    each('.applet-volume-dial', function (el) {
        const label = el.querySelector('span');
        const knob = el.querySelector('.dial-knob');
        let level = label ? kdNum(label.textContent.split(':').pop(), 0) : 0;
        el.addEventListener('click', function () {
            level = (level + 25) % 125;
            if (label) label.textContent = kdBaseLabel(label.textContent) + ': ' + level + '%';
            if (knob) knob.style.transform = `rotate(${(level / 100) * 270}deg)`;
            playAeroClickSound(400 + (level * 2), 0.08);
        });
    });

    // --- Battery cell applet (~BC~): capacity seeded from lit blocks! ---
    each('.applet-battery-cell', function (el) {
        const blocks = el.querySelectorAll('.juice-block');
        let capacity = 0;
        blocks.forEach(function (b) { if (!b.classList.contains('drain')) capacity++; });
        if (!blocks.length) capacity = 3;
        el.addEventListener('click', function () {
            capacity = capacity === 0 ? 3 : capacity - 1;
            playAeroClickSound(300 + (capacity * 100), 0.1);
            blocks.forEach(function (block, idx) {
                if (idx < capacity) block.classList.remove('drain');
                else block.classList.add('drain');
            });
        });
    });

    // --- Calendar desk applet (~CD~): responsive blip! ---
    each('.applet-calendar-desk', function (el) {
        el.addEventListener('click', function () { playAeroClickSound(700, 0.05); });
    });

    // --- Star rating applet (~SR~): rating seeded from glowing stars! ---
    each('.applet-star-rating', function (el) {
        let rating = el.querySelectorAll('.rating-star-node.star-glow').length;
        el.addEventListener('click', function () {
            rating = (rating + 1) % 4;
            playAeroClickSound(600 + (rating * 50), 0.06);
            el.querySelectorAll('.rating-star-node').forEach(function (star, idx) {
                if (idx < rating) star.classList.add('star-glow');
                else star.classList.remove('star-glow');
            });
        });
    });

    // --- Counter badge applet (~CC~): count seeded from its own orb! ---
    each('.applet-counter-badge', function (el) {
        const orb = el.querySelector('.badge-count-orb');
        let count = orb ? kdNum(orb.textContent, 0) : 0;
        el.addEventListener('click', function () {
            count++;
            playAeroClickSound(800, 0.05);
            if (orb) orb.textContent = count;
        });
    });

    // --- Security latch applet (~LK~): lock state seeded from its label! ---
    each('.applet-security-latch', function (el) {
        const icon = el.querySelector('.latch-icon-frame');
        const label = el.querySelector('span:not(.latch-icon-frame)');
        const baseName = label ? kdBaseLabel(label.textContent) : '';
        let locked = !(label && /OPEN/.test(label.textContent));
        el.addEventListener('click', function () {
            locked = !locked;
            if (!locked) {
                playAeroClickSound(900, 0.15);
                el.classList.add('latch-unlocked');
                if (icon) icon.textContent = '🔓';
                if (label) label.textContent = baseName + ': OPEN';
            } else {
                playAeroClickSound(350, 0.12);
                el.classList.remove('latch-unlocked');
                if (icon) icon.textContent = '🔒';
                if (label) label.textContent = baseName + ': LOCKED';
            }
        });
    });

    // --- Playback ribbon applet (~PR~): play/pause progress! ---
    each('.applet-playback-ribbon', function (el) {
        const fill = el.querySelector('.playback-fill-fluid');
        let activeInterval = null;
        let percent = fill ? kdNum(fill.style.width, 0) : 0;
        el.addEventListener('click', function () {
            if (activeInterval) {
                clearInterval(activeInterval);
                activeInterval = null;
                playAeroClickSound(400, 0.05);
            } else {
                playAeroClickSound(600, 0.05);
                activeInterval = setInterval(() => {
                    percent = percent >= 100 ? 0 : percent + 2;
                    const bar = el.querySelector('.playback-fill-fluid');
                    if (bar) bar.style.width = percent + '%';
                }, 100);
            }
        });
    });

    // --- CPU gauge applet (~CR~): needle step seeded from its angle! ---
    each('.applet-cpu-gauge', function (el) {
        const angles = [-90, -45, 0, 45, 90];
        const needle = el.querySelector('.gauge-needle-vector');
        let step = 0;
        if (needle) {
            const found = angles.indexOf(kdNum(needle.style.transform, 0));
            if (found !== -1) step = found;
        }
        el.addEventListener('click', function () {
            step = (step + 1) % angles.length;
            playAeroClickSound(500 + (step * 80), 0.06);
            const pin = el.querySelector('.gauge-needle-vector');
            if (pin) pin.style.transform = `rotate(${angles[step]}deg)`;
        });
    });

    // --- Stepper mesh applet (~SI~): value seeded from its label! ---
    each('.applet-stepper-mesh', function (el) {
        const label = el.querySelector('span');
        let val = label ? kdNum(label.textContent, 1) : 1;
        if (!val) val = 1;
        el.addEventListener('click', function () {
            val++;
            playAeroClickSound(750, 0.04);
            if (label) label.textContent = kdBaseLabel(label.textContent) + ': ' + val;
        });
    });

    // --- Hydro orb applet (~ORB~): alert state seeded from its orb class! ---
    each('.applet-hydro-orb', function (el) {
        const label = el.querySelector('span');
        const baseName = label ? kdBaseLabel(label.textContent) : '';
        let state = 0;
        if (el.classList.contains('orb-yellow')) state = 1;
        else if (el.classList.contains('orb-red')) state = 2;
        el.addEventListener('click', function () {
            state = (state + 1) % 3;
            el.className = 'applet-hydro-orb';
            const tag = el.querySelector('span');
            if (state === 0) {
                playAeroClickSound(700, 0.06);
                el.classList.add('orb-blue');
                if (tag) tag.textContent = baseName + ': SAFE';
            } else if (state === 1) {
                playAeroClickSound(550, 0.08);
                el.classList.add('orb-yellow');
                if (tag) tag.textContent = baseName + ': WARN';
            } else {
                playAeroClickSound(350, 0.12);
                el.classList.add('orb-red');
                if (tag) tag.textContent = baseName + ': CRIT';
            }
        });
    });

    // --- Lock slider applet (~SLS~): seeded from its unlocked class! ---
    each('.applet-lock-slider', function (el) {
        let open = el.classList.contains('unlocked-state');
        el.addEventListener('click', function () {
            open = !open;
            if (open) {
                playAeroClickSound(850, 0.1);
                el.classList.add('unlocked-state');
            } else {
                playAeroClickSound(400, 0.08);
                el.classList.remove('unlocked-state');
            }
        });
    });

    // --- Gadget clocks (~VM~ / ~TIM~): restart the second hand! ---
    each('.applet-gadget-clock', function (el) {
        setInterval(() => {
            const now = new Date();
            const hand = el.querySelector('.clock-hand-vector');
            if (hand) hand.style.transform = `rotate(${now.getSeconds() * 6}deg)`;
        }, 1000);
    });
    each('.applet-gadget-system-clock', function (el) {
        setInterval(() => {
            const now = new Date();
            const pointer = el.querySelector('.gadget-clock-hand');
            if (pointer) pointer.style.transform = `rotate(${now.getSeconds() * 6}deg)`;
        }, 1000);
    });

    // --- Metal trigger applet (~MT~): play state seeded from its class! ---
    each('.applet-metal-trigger', function (el) {
        const label = el.querySelector('span');
        const baseName = label ? label.textContent.replace(/^[▶■]\s*/, '') : '';
        let playing = el.classList.contains('trigger-playing');
        el.addEventListener('click', function () {
            playing = !playing;
            playAeroClickSound(playing ? 650 : 450, 0.08);
            el.className = 'applet-metal-trigger';
            const tag = el.querySelector('span');
            if (playing) {
                el.classList.add('trigger-playing');
                if (tag) tag.textContent = `■ ${baseName}`;
            } else {
                if (tag) tag.textContent = `▶ ${baseName}`;
            }
        });
    });

    // --- Inset check applet (~IC~): stateless check toggle! ---
    each('.applet-inset-check', function (el) {
        el.addEventListener('click', function () {
            playAeroClickSound(600, 0.05);
            el.classList.toggle('box-checked');
        });
    });

    // --- Hex swatch applet (~HEX~): stateless active toggle! ---
    each('.dev-chip-hex', function (el) {
        el.addEventListener('click', function () {
            playAeroClickSound(750, 0.05);
            el.classList.toggle('swatch-active');
        });
    });

    // --- Signal node applet (~SG~): link state seeded from its class! ---
    each('.av-chip-signal', function (el) {
        const label = el.querySelector('span');
        const baseName = label ? kdBaseLabel(label.textContent) : '';
        let connected = !el.classList.contains('sig-disconnect');
        el.addEventListener('click', function () {
            connected = !connected;
            if (connected) {
                playAeroClickSound(800, 0.05);
                el.classList.remove('sig-disconnect');
                if (label) label.textContent = baseName + ': CONNECTED';
            } else {
                playAeroClickSound(300, 0.12);
                el.classList.add('sig-disconnect');
                if (label) label.textContent = baseName + ': DISCONNECT';
            }
        });
    });

    // --- Circuit node strips (~CN-*~): responsive blip! ---
    each('.megachip-circuit-node', function (el) {
        el.addEventListener('click', function () { playAeroClickSound(750, 0.05); });
    });

    // --- Voice tag applet (~VO~): playback flag seeded from its label! ---
    each('.jr-chip-voice-tag', function (el) {
        const label = el.querySelector('span');
        const baseName = label ? label.textContent.replace(/^[🔊⏳]\s*(PLAYING|PLAY DICTATION):\s*/, '') : '';
        let playing = !!(label && label.textContent.includes('PLAYING'));
        el.addEventListener('click', function () {
            playing = !playing;
            playAeroClickSound(playing ? 500 : 350, 0.2);
            if (label) label.textContent = playing ? `⏳ PLAYING: ${baseName}` : `🔊 PLAY DICTATION: ${baseName}`;
        });
    });

    // --- Wax stamp applet (~WS~): deep seal thud! ---
    each('.jr-chip-wax-stamp', function (el) {
        el.addEventListener('click', function () { playAeroClickSound(250, 0.15); });
    });

    // --- Neon node applet (~NO~): alert state seeded from its node class! ---
    each('.applet-neon-node', function (el) {
        const label = el.querySelector('span');
        const baseName = label ? kdBaseLabel(label.textContent) : '';
        let cycleState = 0;
        if (el.classList.contains('node-yellow')) cycleState = 1;
        else if (el.classList.contains('node-pink')) cycleState = 2;
        el.addEventListener('click', function () {
            cycleState = (cycleState + 1) % 3;
            el.className = 'applet-neon-node';
            const tag = el.querySelector('span');
            if (cycleState === 0) {
                playAeroClickSound(750, 0.05);
                el.classList.add('node-cyan');
                if (tag) tag.textContent = baseName + ': INFO';
            } else if (cycleState === 1) {
                playAeroClickSound(550, 0.08);
                el.classList.add('node-yellow');
                if (tag) tag.textContent = baseName + ': WARN';
            } else {
                playAeroClickSound(350, 0.12);
                el.classList.add('node-pink');
                if (tag) tag.textContent = baseName + ': ALERT';
            }
        });
    });

    // --- Latch toggle applet (~LS~): seeded from its active class! ---
    each('.applet-latch-toggle', function (el) {
        let active = el.classList.contains('latch-active-state');
        el.addEventListener('click', function () {
            active = !active;
            playAeroClickSound(active ? 800 : 400, 0.08);
            if (active) el.classList.add('latch-active-state');
            else el.classList.remove('latch-active-state');
        });
    });

    // --- Progress capsule applet (~PT~): fill seeded from its own bar! ---
    each('.jr-progress-capsule', function (el) {
        const fill = el.querySelector('.capsule-fluid-fill');
        let fillWidth = fill ? kdNum(fill.style.width, 35) : 35;
        el.addEventListener('click', function () {
            fillWidth = fillWidth >= 95 ? 15 : fillWidth + 20;
            playAeroClickSound(550 + fillWidth, 0.05);
            const bar = el.querySelector('.capsule-fluid-fill');
            if (bar) bar.style.width = fillWidth + '%';
        });
    });

    // --- Dot matrix applet (~RD~): rating seeded from glowing beads! ---
    each('.jr-dot-matrix', function (el) {
        let rating = el.querySelectorAll('.matrix-bead.bead-glow').length;
        el.addEventListener('click', function () {
            rating = (rating + 1) % 4;
            playAeroClickSound(600, 0.05);
            el.querySelectorAll('.matrix-bead').forEach(function (bead, idx) {
                if (idx < rating) bead.classList.add('bead-glow');
                else bead.classList.remove('bead-glow');
            });
        });
    });

    // --- Latch lock applet (~LL~): seeded from its secure class! ---
    each('.jr-latch-lock', function (el) {
        let secure = el.classList.contains('latch-secure');
        el.addEventListener('click', function () {
            secure = !secure;
            playAeroClickSound(secure ? 850 : 350, 0.1);
            if (secure) el.classList.add('latch-secure');
            else el.classList.remove('latch-secure');
        });
    });

    // --- Cockpit horizon block (::horizon): pitch step seeded from its line! ---
    each('.writedown-horizon-block', function (el) {
        const angles = [-15, 0, 15, 30, 0];
        const pitch = el.querySelector('.horizon-pitch-line');
        let currentStep = 0;
        if (pitch) {
            const found = angles.indexOf(kdNum(pitch.style.transform, 0));
            if (found !== -1) currentStep = found;
        }
        el.addEventListener('click', function () {
            currentStep = (currentStep + 1) % angles.length;
            playAeroClickSound(550, 0.06);
            const line = el.querySelector('.horizon-pitch-line');
            if (line) line.style.transform = `rotate(${angles[currentStep]}deg) translateY(${angles[currentStep] * -0.5}px)`;
        });
    });

    // --- Sketchpad console (::draw): rewire the paint engine (fresh strokes)! ---
    each('.aero-draw-console', function (box) {
        const paintCanvas = box.querySelector('canvas.draw-surface-canvas');
        if (!paintCanvas) return;
        let ctx = null;
        try { ctx = paintCanvas.getContext('2d'); } catch (e) {}
        if (!ctx) return;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const colorPicker = box.querySelector('.draw-picker-orb');
        const sizeSlider = box.querySelector('.brush-size-slider');
        const opacitySlider = box.querySelector('.brush-opacity-slider');
        const clearBtn = box.querySelector('.draw-clear-orb');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        function coords(evt) {
            const rect = paintCanvas.getBoundingClientRect();
            return {
                x: (evt.clientX - rect.left) * (paintCanvas.width / rect.width),
                y: (evt.clientY - rect.top) * (paintCanvas.height / rect.height)
            };
        }
        paintCanvas.addEventListener('mousedown', function (evt) {
            isDrawing = true;
            const c = coords(evt);
            lastX = c.x;
            lastY = c.y;
        });
        paintCanvas.addEventListener('mousemove', function (evt) {
            if (!isDrawing) return;
            const c = coords(evt);
            const baseHex = colorPicker ? colorPicker.value : '#0369a1';
            const alpha = opacitySlider ? (opacitySlider.value / 100) : 1;
            const r = parseInt(baseHex.slice(1, 3), 16);
            const g = parseInt(baseHex.slice(3, 5), 16);
            const b = parseInt(baseHex.slice(5, 7), 16);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(c.x, c.y);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = sizeSlider ? sizeSlider.value : 4;
            ctx.stroke();
            lastX = c.x;
            lastY = c.y;
        });
        paintCanvas.addEventListener('mouseup', function () { isDrawing = false; });
        paintCanvas.addEventListener('mouseleave', function () { isDrawing = false; });
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                playAeroClickSound(350, 0.1);
                ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
            });
        }
    });

    return wired;
}

// ==========================================
// PART 14: RIGHT FORMAT SIDEBAR (REMOVE FORMATTING)
// Buttons act on the text selection when one exists inside the canvas,
// otherwise they act on the whole document. The scope hint says which!
// ==========================================
var fmtWired = false;
var FMT_HIGHLIGHT_SEL = '.gel-orb, .gel-bubble-chip, .aero-tag-chip, .aero-glass-badge-chip, ' +
    'span[class*="gel-chip-"], span[class*="megachip-"], span[class*="droplet-"]';
var FMT_EFFECT_SEL = '.spark-text, .liquid-underline, .glossy-border-badge, .cyber-glow-spark, ' +
    '.liquid-text-glow, .aqua-bubble-text, .reflected-text-block, .embossed-glass-text, ' +
    '.kinetic-wave-text, span[class*="effect-"], span[class*="mkt-"], span[class*="orange-hl-"], ' +
    'span[class*="dev-chip-"], span[class*="av-chip-"], span[class*="jr-chip-"]';
var FMT_INLINE_TAGS = 'b, strong, i, em, u, strike, s, font';

// The live range when text is selected, else a range over the whole canvas!
function fmtScopeRange() {
    const sel = window.getSelection();
    if (sel.rangeCount) {
        const r = sel.getRangeAt(0);
        if (!sel.isCollapsed && canvas.contains(r.commonAncestorContainer)) return { range: r, whole: false };
    }
    const full = document.createRange();
    full.selectNodeContents(canvas);
    return { range: full, whole: true };
}

function fmtScopeEl(scope) {
    const container = scope.range.commonAncestorContainer;
    const root = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    return (root && canvas.contains(root)) ? root : canvas;
}

function fmtUpdateScopeHint() {
    const hint = document.getElementById('format-scope-hint');
    if (!hint || typeof canvas === 'undefined' || !canvas) return;
    hint.textContent = fmtScopeRange().whole ? 'Scope: Note' : 'Scope: Selection';
}

function fmtUnwrap(el) {
    // Lift real child nodes (never flatten!) so nested styles survive!
    const parent = el.parentNode;
    const moved = [];
    while (el.firstChild) {
        const kid = el.firstChild;
        parent.insertBefore(kid, el);
        moved.push(kid);
    }
    parent.removeChild(el);
    return moved.length ? moved[moved.length - 1] : null;
}

// Splitting at a tag's edge leaves an empty copy of it behind: drop those empties!
function fmtPruneEmpty(root) {
    if (!root || !root.querySelectorAll) return;
    Array.from(root.querySelectorAll('*')).reverse().forEach(function (el) {
        if (el.textContent || el.matches('img, br, svg, input, hr, [contenteditable="false"]') || el.querySelector('img, br, svg, input, hr, [contenteditable="false"]')) return;
        if (el.parentNode) el.parentNode.removeChild(el);
    });
}
// Cut a style element at the selection's edges: the parts outside the selection become
// copies of it (they KEEP the style) and el is left holding only the selected letters,
// so removing el's style takes it off just those letters!
function fmtSplitToRange(el, range) {
    if (!el || !el.parentNode || !range) return el;
    const cut = function (r, before) {
        if (r.collapsed) return;
        const frag = r.extractContents();
        fmtPruneEmpty(frag);
        if (!frag.textContent && !(frag.querySelector && frag.querySelector('img, br, svg, input'))) return;
        const part = el.cloneNode(false);
        if (part.removeAttribute) part.removeAttribute('id');
        part.appendChild(frag);
        el.parentNode.insertBefore(part, before ? el : el.nextSibling);
    };
    try {
        if (el.contains(range.endContainer)) {
            const r = document.createRange();
            r.setStart(range.endContainer, range.endOffset);
            r.setEnd(el, el.childNodes.length);
            cut(r, false);
        }
        if (el.contains(range.startContainer)) {
            const r = document.createRange();
            r.setStart(el, 0);
            r.setEnd(range.startContainer, range.startOffset);
            cut(r, true);
        }
    } catch (e) {}
    return el;
}

// Unwrap only when truly bare (an emptied style="" still counts as an attribute)!
function fmtStripBare(el) {
    try {
        if (el.hasAttribute && el.hasAttribute('style') && !(el.getAttribute('style') || '').trim()) {
            el.removeAttribute('style');
        }
    } catch (e) {}
    if (!el.attributes.length) fmtUnwrap(el);
}

// Self + every ancestor up to the canvas — nested styles hide up there!
function fmtScopeChain(scopeEl) {
    const chain = [scopeEl];
    let p = scopeEl.parentElement;
    while (p && (typeof canvas === 'undefined' || !canvas || canvas.contains(p))) {
        chain.push(p);
        p = p.parentElement;
    }
    return chain;
}

// One shared, mutation-proof sweep: snapshot candidates + the original range
// ONCE, then test each candidate against the snapshot (never live nodes)!
function fmtEachTouching(scopeEl, range, collect, fn, strict) {
    const cac = range.commonAncestorContainer;
    const cacPar = (cac.nodeType === Node.TEXT_NODE && cac.parentElement) ? cac.parentElement : null;
    let root = null;
    let snap = null;
    try {
        const node = cac;
        const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (el && el.closest) {
            const block = el.closest('div, p, li, h1, h2, h3, blockquote');
            if (block && canvas.contains(block)) root = block;
        }
        if (!root) root = canvas;
        const preS = range.cloneRange();
        preS.selectNodeContents(root);
        preS.setEnd(range.startContainer, range.startOffset);
        const preE = range.cloneRange();
        preE.selectNodeContents(root);
        preE.setEnd(range.endContainer, range.endOffset);
        snap = { s: preS.toString().length, e: preE.toString().length };
    } catch (e) { snap = null; }
    const owned = function (el) {
        if (!el || el === cac) return true;
        if (cacPar) {
            if (el === cacPar) return true;
            try { return cacPar.contains(el) && el !== cacPar; } catch (e) { return false; }
        }
        try { return !!(cac.contains && cac.contains(el)); } catch (e) { return false; }
    };
    const touches = function (el) {
        // Strict mode (property stripping) skips ancestor context; unwrap
        // mode keeps it — matching wrappers ARE the style being removed!
        if (strict && !owned(el)) return false;
        if (snap && root) {
            try {
                const r = document.createRange();
                r.selectNodeContents(root);
                r.setEnd(el, 0);
                const s = r.toString().length;
                const e = s + (el.textContent || '').length;
                return s < snap.e && e > snap.s;
            } catch (err) { return false; }
        }
        try { return range.intersectsNode(el); } catch (err) { return false; }
    };
    const cands = collect();
    let count = 0;
    cands.forEach(function (el) {
        if (!el || el.isConnected === false) return;
        if (touches(el) && fn(el)) count++;
    });
    return count;
}

// Unwrap every matching element touched by the scope (self included)!
function fmtStripInScope(selector) {
    if (typeof canvas === 'undefined' || !canvas) return 0;
    const scope = fmtScopeRange();
    const scopeEl = fmtScopeEl(scope);
    const descs = scopeEl.querySelectorAll ? Array.from(scopeEl.querySelectorAll(selector)).reverse() : [];
    const chain = fmtScopeChain(scopeEl).filter(function (el) {
        if (!el.matches) return false;
        try { return el.matches(selector); } catch (e) { return false; }
    });
    return fmtEachTouching(scopeEl, scope.range, function () { return descs.concat(chain); }, function (el) {
        if (!scope.whole) fmtSplitToRange(el, scope.range);
        fmtUnwrap(el);
        return true;
    }, false);
}

// Run an execCommand across the scope, restoring the caret afterwards!
// Manual fallback when execCommand is missing: unwrap the tag itself!
function fmtUnwrapTagsInScope(tagList) {
    if (typeof canvas === 'undefined' || !canvas) return 0;
    const scope = fmtScopeRange();
    const scopeEl = fmtScopeEl(scope);
    let count = 0;
    const tags = tagList.split(',').map(function (s) { return s.trim().toUpperCase(); });
    const walker = document.createTreeWalker(scopeEl, NodeFilter.SHOW_ELEMENT);
    const found = [];
    let n;
    while ((n = walker.nextNode())) {
        if (tags.indexOf(n.tagName) !== -1) found.push(n);
    }
    found.reverse();
    fmtScopeChain(scopeEl).forEach(function (el) {
        if (tags.indexOf(el.tagName) !== -1 && found.indexOf(el) === -1) found.push(el);
    });
    return fmtEachTouching(scopeEl, scope.range, function () { return found; }, function (el) {
        if (!scope.whole) fmtSplitToRange(el, scope.range);
        fmtUnwrap(el);
        return true;
    }, false);
}

var FMT_STYLE_TAGS = ['B', 'STRONG', 'I', 'EM', 'U', 'STRIKE', 'S', 'A', 'CODE'];
var FMT_STYLE_SPAN_SEL = FMT_HIGHLIGHT_SEL + ', ' + FMT_EFFECT_SEL + ', span.uni-chip, span.cc-chip, span.us-chip, span.bbcss-chip, span[class*="orange-hl-"], span[class*="green-hl-"], span[class*="blue-hl-"], span[class*="pool-hl-"], span[class*="mkt-cp-"], span[class*="bcp-"], span[class*="pill-hl-"], span[class*="hl-"], span[class*="cp-"], span[class*="aq-"]';
var FMT_INLINE_PROPS = [
    { prop: 'fontWeight', cssProp: 'font-weight', css: 'bold', label: 'Bold', test: function (v) { return v === 'bold' || v === 'bolder' || parseInt(v, 10) >= 600; } },
    { prop: 'fontStyle', cssProp: 'font-style', css: 'italic', label: 'Italic', test: function (v) { return v === 'italic' || v === 'oblique'; } },
    { prop: 'fontSize', cssProp: 'font-size', css: '18px', label: 'Size', test: function (v) { return !!(v || '').trim(); } },
    { prop: 'textDecoration', cssProp: 'text-decoration', css: 'underline', label: 'Underline', test: function (v) { return (v || '').indexOf('underline') !== -1; } },
    { prop: 'textDecoration', cssProp: 'text-decoration', css: 'line-through', label: 'Strikethrough', test: function (v) { return (v || '').indexOf('line-through') !== -1; } }
];

function fmtCheckInline(el, consider) {
    if (!el || !el.style) return;
    // A Custom CSS chip's bold/italic is part of the chip, not a separate style!
    if (el.classList && el.classList.contains('bbcss-chip')) return;
    FMT_INLINE_PROPS.forEach(function (rule) {
        let v = '';
        try { v = el.style[rule.prop] || ''; } catch (e) {}
        if (rule.test(v)) consider('inline:' + rule.prop + ':' + rule.css, { kind: 'inline', prop: rule.prop, cssProp: rule.cssProp, css: rule.css, label: rule.label, el: el });
    });
}

function fmtTagLabel(tag) {
    switch (tag) {
        case 'B': case 'STRONG': return 'Bold';
        case 'I': case 'EM': return 'Italic';
        case 'U': return 'Underline';
        case 'STRIKE': case 'S': return 'Strikethrough';
        case 'FONT': return 'Font';
        case 'A': return 'Link';
        case 'CODE': return 'Code';
        default: return tag;
    }
}

// Extra selector covering INSTALLED Marketplace styles (future packs included)!
function fmtMarketplaceSuffix() {
    const sels = [];
    try {
        const M = window.WriteoutMarketplace;
        if (!M || !M.catalog || typeof M.installed !== 'function') return '';
        const installed = M.installed();
        M.catalog.forEach(function (ext) {
            if (installed.indexOf(ext.id) === -1) return;
            let variants = [];
            if (ext.kind === 'style-pack' && Array.isArray(ext.styles)) variants = ext.styles;
            else if (ext.kind === 'toolbar-style' && ext.toolbarClass) variants = [{ className: ext.toolbarClass }];
            variants.forEach(function (v) {
                if (v.className) sels.push('span.' + String(v.className).trim().split(/\s+/).join('.'));
            });
        });
    } catch (e) {}
    return sels.length ? ', ' + sels.join(', ') : '';
}

// Every removable style touching the current selection!
function fmtDetectStyles() {
    const found = [];
    if (typeof canvas === 'undefined' || !canvas) return found;
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return found;
    const range = sel.getRangeAt(0);
    if (!canvas.contains(range.commonAncestorContainer)) return found;
    const seen = {};
    const consider = function (key, style) {
        try {
            if (!range.intersectsNode(style.el)) return;
        } catch (e) { return; }
        if (seen[key]) return;
        seen[key] = true;
        found.push(style);
    };
    const checkEl = function (el) {
        if (!el || !el.tagName) return;
        const tag = el.tagName;
        if (FMT_STYLE_TAGS.indexOf(tag) !== -1) {
            consider('tag:' + tag, { kind: 'tag', tag: tag, label: fmtTagLabel(tag), el: el });
        } else if (tag === 'SPAN') {
            if (el.className && typeof el.matches === 'function') {
                try {
                    if (el.matches(FMT_STYLE_SPAN_SEL + fmtMarketplaceSuffix())) {
                        const isUni = el.classList.contains('uni-chip');
                        const isCc = el.classList.contains('cc-chip');
                        const isUs = el.classList.contains('us-chip');
                        const isCss = el.classList.contains('bbcss-chip');
                        let label = el.className;
                        const vars = {};
                        if (isUni) {
                            label = 'Uni-Chip';
                            vars['--uni-accent'] = el.style.getPropertyValue('--uni-accent');
                        } else if (isCss) {
                            // Custom CSS chips carry their whole look inline, so the preview copies it all!
                            label = 'Custom CSS: ' + (el.getAttribute('data-bbcss-name') || 'Chip');
                            for (let i = 0; i < el.style.length; i++) vars[el.style[i]] = el.style.getPropertyValue(el.style[i]);
                            ['pid', 'before', 'after'].forEach(function (k) {
                                const v = el.getAttribute('data-bbcss-' + k);
                                if (v) vars['data-bbcss-' + k] = v;
                            });
                        } else if (isUs && typeof usLabelForClass === 'function') {
                            label = usLabelForClass(el.className);
                        } else if (isCc) {
                            const m = el.className.match(/cc-s(\d+)/);
                            const nm = m && typeof CC_STYLES !== 'undefined' ? CC_STYLES[parseInt(m[1], 10) - 1] : '';
                            label = 'Custom Chip' + (nm ? ': ' + nm : '');
                            vars['--cc'] = el.style.getPropertyValue('--cc');
                            vars['--cc-ink'] = el.style.getPropertyValue('--cc-ink');
                        }
                        consider('cls:' + el.className, { kind: 'cls', cls: el.className, label: label, el: el, vars: vars });
                    }
                } catch (e) {}
            }
            fmtCheckInline(el, consider);
        }
    };
    const container = range.commonAncestorContainer;
    const root = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    const scopeEl = (root && canvas.contains(root)) ? root : canvas;
    checkEl(scopeEl);
    if (scopeEl.querySelectorAll) {
        scopeEl.querySelectorAll('b, strong, i, em, u, strike, s, a, code, span').forEach(checkEl);
    }
    // Walk UP too: nested styles live on ancestors above the common ancestor!
    let ancestor = scopeEl.parentElement;
    while (ancestor && canvas.contains(ancestor)) {
        checkEl(ancestor);
        ancestor = ancestor.parentElement;
    }
    return found;
}

// Run fn while keeping the user's selection anchored by block offsets!
function fmtRescueSelection(fn) {
    const sel = window.getSelection();
    let saved = null;
    if (sel.rangeCount) {
        const r = sel.getRangeAt(0);
        let node = r.commonAncestorContainer;
        const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const block = (el && el.closest) ? (el.closest('div, p, li, h1, h2, h3, blockquote') || canvas) : canvas;
        if (canvas.contains(block)) {
            try {
                const preS = r.cloneRange();
                preS.selectNodeContents(block);
                preS.setEnd(r.startContainer, r.startOffset);
                const preE = r.cloneRange();
                preE.selectNodeContents(block);
                preE.setEnd(r.endContainer, r.endOffset);
                saved = { block: block, s: preS.toString().length, e: preE.toString().length };
            } catch (err) { saved = null; }
        }
    }
    const out = fn();
    // Fresh style parked the caret ON purpose: leave it inside, not after!
    if (typeof fmtParkedCaret !== 'undefined' && fmtParkedCaret) {
        fmtParkedCaret = false;
        return out;
    }
    if (saved && canvas.contains(saved.block)) {
        try {
            const walker = document.createTreeWalker(saved.block, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) nodes.push(n);
            if (nodes.length) {
                const total = nodes.reduce(function (a, t) { return a + t.nodeValue.length; }, 0);
                const point = function (abs) {
                    abs = Math.max(0, Math.min(abs, total));
                    let acc = 0;
                    for (const t of nodes) {
                        if (acc + t.nodeValue.length >= abs) return { node: t, off: abs - acc };
                        acc += t.nodeValue.length;
                    }
                    const last = nodes[nodes.length - 1];
                    return { node: last, off: last.nodeValue.length };
                };
                const a = point(saved.s);
                const b = point(saved.e);
                const nr = document.createRange();
                nr.setStart(a.node, a.off);
                nr.setEnd(b.node, b.off);
                sel.removeAllRanges();
                sel.addRange(nr);
            }
        } catch (err) {}
    }
    return out;
}

function fmtRemoveStyle(style) {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return 0;
    if (style.kind === 'tag') return fmtUnwrapTagsInScope(style.tag);
    if (style.kind === 'inline') {
        const range = sel.getRangeAt(0);
        if (!canvas.contains(range.commonAncestorContainer)) return 0;
        const scope = { range: range };
        const scopeEl = fmtScopeEl(scope);
        const cands = [];
        if (scopeEl.querySelectorAll) Array.from(scopeEl.querySelectorAll('span')).reverse().forEach(function (el) { cands.push(el); });
        fmtScopeChain(scopeEl).forEach(function (el) { if (el.tagName === 'SPAN') cands.push(el); });
        return fmtEachTouching(scopeEl, range, function () { return cands; }, function (el) {
            let v = '';
            try { v = el.style ? (el.style[style.prop] || '') : ''; } catch (e) {}
            if (!v) return false;
            fmtSplitToRange(el, range);
            try { el.style.removeProperty(style.cssProp); } catch (e) {}
            fmtStripBare(el);
            return true;
        }, true);
    }
    return fmtStripInScope('[class="' + style.cls + '"]');
}

function fmtRenderStyleList() {
    const list = document.getElementById('format-style-list');
    if (!list) return;
    list.innerHTML = '';
    const sel = window.getSelection();
    const hasSel = sel.rangeCount && !sel.isCollapsed &&
        typeof canvas !== 'undefined' && canvas && canvas.contains(sel.getRangeAt(0).commonAncestorContainer);
    if (!hasSel) {
        const p = document.createElement('p');
        p.className = 'format-empty';
        p.textContent = 'Select text to see its styles.';
        list.appendChild(p);
        return;
    }
    const styles = fmtDetectStyles();
    if (!styles.length) {
        const p = document.createElement('p');
        p.className = 'format-empty';
        p.textContent = 'No removable styles here.';
        list.appendChild(p);
        return;
    }
    styles.forEach(function (style) {
        const row = document.createElement('div');
        row.className = 'fmt-style-row';
        const preview = document.createElement('span');
        preview.className = 'fmt-style-preview';
        const sample = document.createElement(style.kind === 'tag' ? style.tag.toLowerCase() : 'span');
        if (style.kind === 'cls') sample.className = style.cls;
        if (style.vars) Object.keys(style.vars).forEach(function (k) {
            if (!style.vars[k]) return;
            // A Custom CSS chip's ::before/::after ride along as attributes, not styles!
            if (k.indexOf('data-bbcss-') === 0) sample.setAttribute(k, style.vars[k]);
            else sample.style.setProperty(k, style.vars[k]);
        });
        if (style.kind === 'inline') { try { sample.style[style.prop] = style.css; } catch (e) {} }
        sample.textContent = 'Ab';
        preview.appendChild(sample);
        const name = document.createElement('span');
        name.className = 'fmt-style-name';
        name.textContent = style.label;
        name.title = style.label;
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'fmt-style-x';
        x.textContent = '✕';
        x.title = 'Remove ' + style.label;
        x.addEventListener('mousedown', function (e) { e.preventDefault(); });
        x.addEventListener('click', function (e) {
            e.stopPropagation();
            playAeroClickSound(350, 0.1);
            fmtRescueSelection(function () { return fmtRemoveStyle(style); });
            if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
            fmtRenderStyleList();
            fmtUpdateScopeHint();
            fmtUpdateResetButtons();
        });
        row.appendChild(preview);
        row.appendChild(name);
        row.appendChild(x);
        list.appendChild(row);
    });
}

function fmtWireSidebar() {
    fmtSetGroup(fmtStoredGroup(), true);
    kdApplyPageSize();
    if (fmtWired) return;
    fmtWired = true;
    fmtWireDocSettings();
    fmtWireStylePicker();
    fmtWireHighlighter();
    fmtWireChips();
    fmtWireAqua();
    kdWireFootnotes();
    fmtWireExitAndBasic();
    fmtRenderStyleList();
    const toggle = document.getElementById('format-toggle-zone');
    if (toggle) toggle.addEventListener('click', function () {
        playAeroClickSound(450, 0.12);
        const collapsed = document.body.classList.toggle('format-collapsed');
        const panel = document.getElementById('format-sidebar');
        if (!collapsed && panel && typeof panel.focus === 'function') {
            try { panel.focus(); } catch (e) {}
        }
    });
}

// --- EXIT FORMATTING (global!): Cmd/Ctrl+Shift+E hops out of the current
// style from ANY focus -- canvas, sidebar, or popup -- nodes untouched! ---
// Button path shares the same hop via fmtExitFormattingNow()!
// --- Text selected? The escape button strips styles off the selection! ---
function fmtExitRemoveSelectedStyles() {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    if (!canvas.contains(range.commonAncestorContainer)) return false;
    const SEL = 'span[class],b,strong,i,em,u,s,strike,code,font,a';
    const nodeEl = function (n) {
        if (!n) return null;
        return (n.nodeType === Node.TEXT_NODE) ? n.parentElement : n;
    };
    const found = [];
    [selection.anchorNode, selection.focusNode].forEach(function (n) {
        let el = nodeEl(n);
        while (el && el !== canvas && canvas.contains(el)) {
            if (el.matches && el.matches(SEL)) found.push(el);
            el = el.parentElement;
        }
    });
    try {
        const host = range.commonAncestorContainer;
        const scope = (host && host.nodeType === 1) ? host : (host && host.parentElement);
        if (scope && scope.querySelectorAll) {
            Array.from(scope.querySelectorAll(SEL)).forEach(function (el) {
                let inside = false;
                try {
                    if (typeof range.intersectsNode === 'function') inside = range.intersectsNode(el);
                    else if (selection.containsNode) inside = selection.containsNode(el, true);
                } catch (e) { inside = false; }
                if (inside) found.push(el);
            });
        }
    } catch (e) {}
    const uniq = [];
    found.forEach(function (el) { if (uniq.indexOf(el) === -1) uniq.push(el); });
    uniq.sort(function (a, b) { return a.contains(b) ? -1 : (b.contains(a) ? 1 : 0); });
    const saved = range.cloneRange();
    let n = 0;
    uniq.forEach(function (el) {
        if (!el.isConnected || !canvas.contains(el) || el === canvas) return;
        // Hands off applets + form fields: unwrap text styles only!
        try {
            if (el.querySelector && el.querySelector('input,textarea,select,button,[contenteditable="false"]')) return;
        } catch (e) {}
        if (typeof fmtUnwrapInline === 'function') { fmtUnwrapInline(el); n++; }
    });
    if (!n) return false;
    try { selection.removeAllRanges(); selection.addRange(saved); } catch (e) {}
    playAeroClickSound(450, 0.08);
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
    return true;
}
function fmtExitFormattingNow() {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    // Text selected? Strip its styles instead of hopping!
    if (!selection.isCollapsed) return fmtExitRemoveSelectedStyles();
    const n = selection.anchorNode;
    if (!n || !canvas.contains(n)) return false;
    if (n.nodeType === 1 && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(n.tagName)) return false;
    if (n.parentElement && n.parentElement.closest && n.parentElement.closest('input,textarea,select,button')) return false;
    const el = (n.nodeType === Node.TEXT_NODE) ? n.parentElement : n;
    const styled = (el && el.closest && el !== canvas)
        ? el.closest('span[class],b,strong,i,em,u,s,strike,code,font,a')
        : null;
    if (!styled || styled === canvas || !canvas.contains(styled)) return false;
    playAeroClickSound(450, 0.08);
    // At the very start? Hop back out front. Otherwise hop forward!
    let atStart = false;
    try {
        const probe = document.createRange();
        probe.selectNodeContents(styled);
        probe.setEnd(selection.anchorNode, selection.anchorOffset);
        atStart = probe.toString().length === 0;
    } catch (err) { atStart = false; }
    const r = document.createRange();
    if (atStart) r.setStartBefore(styled);
    else r.setStartAfter(styled);
    r.collapse(true);
    selection.removeAllRanges();
    selection.addRange(r);
    return true;
}
function fmtExitFormatting(e) {
    if (!e || (e.key !== 'E' && e.key !== 'e') || !e.shiftKey || !(e.metaKey || e.ctrlKey)) return false;
    if (typeof canvas === 'undefined' || !canvas) return false;
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    const popOpen = document.querySelector('.modal-blur-gate.active') ||
        ['hl-popup', 'style-picker-popup', 'file-chip-popup'].some(function (id) {
            const p = document.getElementById(id);
            return p && !p.hidden;
        }) ||
        ['download-menu', 'insert-menu-popup', 'tags-menu-popup', 'skills-menu-popup'].some(function (id) {
            const p = document.getElementById(id);
            return p && p.style.display !== 'none';
        });
    if (popOpen) return false;
    return fmtExitFormattingNow();
}

// --- BASIC INLINE STYLES (sidebar B/I/U/S!): selection wraps, collapsed caret
// gets a fresh element with the caret parked inside -- zero dependencies!
// Second press toggles OFF: unwraps the run instead of nesting! ---
function fmtBasicTagMatches(el, tag) {
    if (!el || el.nodeType !== 1) return false;
    const t = String(el.tagName || '').toUpperCase();
    if (tag === 'b') return t === 'B' || t === 'STRONG';
    if (tag === 'i') return t === 'I' || t === 'EM';
    if (tag === 'u') return t === 'U';
    if (tag === 's') return t === 'S' || t === 'STRIKE' || t === 'DEL';
    return false;
}
function fmtUnwrapInline(el) {
    if (!el || !el.parentNode) return;
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
}
function fmtApplyBasicStyle(tag) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const allowed = { b: 1, i: 1, u: 1, s: 1 };
    tag = String(tag || '').toLowerCase();
    if (!allowed[tag]) return false;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    try {
        const nodeEl = function (n) {
            if (!n) return null;
            return (n.nodeType === Node.TEXT_NODE) ? n.parentElement : n;
        };
        // --- TOGGLE OFF: collapsed caret sitting in the style exits it for
        // the NEXT letter -- the word keeps its style, future typing is plain!
        // (Only a fresh empty tag gets removed outright!) ---
        if (range.collapsed) {
            const here = nodeEl(sel.anchorNode);
            const wrap = (here && here.closest && here !== canvas)
                ? here.closest('b,strong,i,em,u,s,strike,del')
                : null;
            let mine = wrap;
            while (mine && !fmtBasicTagMatches(mine, tag)) {
                mine = mine.parentElement && mine.parentElement.closest
                    ? mine.parentElement.closest('b,strong,i,em,u,s,strike,del')
                    : null;
            }
            if (mine && mine !== canvas && canvas.contains(mine)) {
                // Fresh empty pending tag? Remove it outright!
                if (((mine.textContent || '').replace(/[\s\u200B]/g, '')) === '') {
                    fmtUnwrapInline(mine);
                    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                    if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
                    return true;
                }
                // Real word: split-and-exit! Style stays, caret parks outside!
                let atStart = false, atEnd = false;
                try {
                    const p1 = document.createRange();
                    p1.selectNodeContents(mine);
                    p1.setEnd(sel.anchorNode, sel.anchorOffset);
                    atStart = p1.toString().length === 0;
                } catch (e) { atStart = false; }
                try {
                    const p2 = document.createRange();
                    p2.setStart(sel.anchorNode, sel.anchorOffset);
                    p2.setEnd(mine, mine.childNodes.length);
                    atEnd = p2.toString().length === 0;
                } catch (e) { atEnd = false; }
                try {
                    if (atStart) {
                        const caret = document.createRange();
                        caret.setStartBefore(mine);
                        caret.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(caret);
                    } else if (atEnd) {
                        const caret = document.createRange();
                        caret.setStartAfter(mine);
                        caret.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(caret);
                    } else {
                        const after = document.createRange();
                        after.setStart(sel.anchorNode, sel.anchorOffset);
                        after.setEnd(mine, mine.childNodes.length);
                        const frag = after.extractContents();
                        const clone = mine.cloneNode(false);
                        clone.appendChild(frag);
                        mine.parentNode.insertBefore(clone, mine.nextSibling);
                        const parent = mine.parentNode;
                        const idx = Array.prototype.indexOf.call(parent.childNodes, clone);
                        const caret = document.createRange();
                        caret.setStart(parent, idx);
                        caret.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(caret);
                    }
                } catch (e) {
                    const caret = document.createRange();
                    caret.setStartAfter(mine);
                    caret.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(caret);
                }
                if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
                if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
                return true;
            }
            const el = document.createElement(tag);
            el.appendChild(document.createTextNode(''));
            range.insertNode(el);
            const caret = document.createRange();
            caret.setStart(el.firstChild, 0);
            caret.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caret);
            if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
            if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
            return true;
        }
        // --- TOGGLE OFF: selection anchored inside the style unwraps it! ---
        const aWrapRaw = (function () {
            const a = nodeEl(sel.anchorNode);
            return (a && a.closest) ? a.closest('b,strong,i,em,u,s,strike,del') : null;
        })();
        const fWrapRaw = (function () {
            const f = nodeEl(sel.focusNode);
            return (f && f.closest) ? f.closest('b,strong,i,em,u,s,strike,del') : null;
        })();
        const matchUp = function (w) {
            let m = w;
            while (m && !fmtBasicTagMatches(m, tag)) {
                m = m.parentElement && m.parentElement.closest
                    ? m.parentElement.closest('b,strong,i,em,u,s,strike,del')
                    : null;
            }
            return (m && m !== canvas && canvas.contains(m)) ? m : null;
        };
        const aMine = matchUp(aWrapRaw);
        const fMine = matchUp(fWrapRaw);
        if (aMine || fMine) {
            const saved = range.cloneRange();
            if (aMine) fmtUnwrapInline(aMine);
            if (fMine && fMine !== aMine && fMine.isConnected) fmtUnwrapInline(fMine);
            // Styled descendants fully covered by the selection come off too!
            try {
                const host = range.commonAncestorContainer;
                const scope = (host && host.nodeType === 1) ? host : (host && host.parentElement);
                if (scope && scope.querySelectorAll) {
                    Array.from(scope.querySelectorAll('b,strong,i,em,u,s,strike,del')).forEach(function (d) {
                        if (!d.isConnected || !canvas.contains(d)) return;
                        if (!fmtBasicTagMatches(d, tag)) return;
                        let inside = false;
                        try {
                            if (typeof range.intersectsNode === 'function') inside = range.intersectsNode(d);
                            else if (sel.containsNode) inside = sel.containsNode(d, true);
                        } catch (e) { inside = false; }
                        if (inside) fmtUnwrapInline(d);
                    });
                }
            } catch (e) {}
            try {
                sel.removeAllRanges();
                sel.addRange(saved);
            } catch (e) {}
            if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
            if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
            return true;
        }
        const el = document.createElement(tag);
        el.appendChild(range.extractContents());
        range.insertNode(el);
        const reselected = document.createRange();
        reselected.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(reselected);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection();
        return true;
    } catch (err) { return false; }
}

function fmtWireExitAndBasic() {
    if (fmtWireExitAndBasic._done) return;
    fmtWireExitAndBasic._done = true;
    const ids = [
        ['fmt-exit-btn', null],
        ['fmt-bold-btn', 'b'],
        ['fmt-italic-btn', 'i'],
        ['fmt-underline-btn', 'u'],
        ['fmt-strike-btn', 's']
    ];
    ids.forEach(function (pair) {
        const btn = document.getElementById(pair[0]);
        if (!btn) return;
        btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
        btn.addEventListener('click', function () {
            if (!pair[1]) {
                const pop = document.getElementById('hl-popup');
                if (pop) pop.hidden = true;
                fmtExitFormattingNow();
            } else {
                playAeroClickSound(600, 0.08);
                fmtApplyBasicStyle(pair[1]);
            }
        });
    });
}

// ========================================================
// CUSTOM CSS (Skills!): chip styles made of real CSS! 110 starrable presets, an
// Interactive chip builder for people who don't know CSS, and a My CSS box for
// people who do! The CSS lives in the chip's own style="", so it saves with the note!
// ========================================================
var CSC_PREF_KEY = 'bitbook_css_chip_prefs';
var CSC_STAR_KEY = 'bitbook_css_chip_stars';
var CSC_TABS = ['presets', 'interactive', 'code', 'find'];
// One-click starters for My CSS!
var CSC_SNIPPETS = [
    ['Background', 'background: #fde047;'],
    ['Gradient', 'background: linear-gradient(90deg, #f472b6, #8b5cf6);'],
    ['Text color', 'color: #1e3a8a;'],
    ['Rounded', 'border-radius: 999px;'],
    ['Border', 'border: 2px solid #0ea5e9;'],
    ['Shadow', 'box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);'],
    ['Glow text', 'text-shadow: 0 0 6px #38bdf8;'],
    ['Bold', 'font-weight: 800;'],
    ['Font', 'font-family: Georgia, serif;'],
    ['Animation', 'animation: bbcss-pulse 1.6s ease-out infinite;']
];

function cscFindPreset(id) {
    if (!id || typeof CSS_CHIP_PRESETS === 'undefined') return null;
    for (let i = 0; i < CSS_CHIP_PRESETS.length; i++) if (CSS_CHIP_PRESETS[i].id === id) return CSS_CHIP_PRESETS[i];
    return null;
}
function cscCatName(cat) {
    const c = (typeof CSS_CHIP_CATEGORIES !== 'undefined' ? CSS_CHIP_CATEGORIES : []).filter(function (x) { return x[0] === cat; })[0];
    return c ? c[1] : '';
}
var cscTab = 'presets';
var cscPreset = 'aquagel';
// What My CSS starts with (and what Interactive's Start over goes back to)!
var CSC_STARTER = 'background: linear-gradient(90deg, #f472b6, #8b5cf6);\ncolor: #ffffff;\nborder-radius: 999px;\nfont-weight: 800;\n';
var cscCode = CSC_STARTER;
var cscCat = 'all';
var cscStars = [];
var cscSavedRange = null;
try {
    const pref = JSON.parse(localStorage.getItem(CSC_PREF_KEY) || 'null');
    if (pref && typeof pref === 'object') {
        if (CSC_TABS.indexOf(pref.tab) !== -1) cscTab = pref.tab;
        if (cscFindPreset(pref.preset)) cscPreset = pref.preset;
        if (typeof pref.code === 'string') cscCode = pref.code;
    }
    const raw = JSON.parse(localStorage.getItem(CSC_STAR_KEY) || '[]');
    if (Array.isArray(raw)) cscStars = raw.filter(function (id) { return !!cscFindPreset(id); });
    // The page-theme version of this skill is gone, so its old setting goes too!
    localStorage.removeItem('bitbook_custom_css');
    localStorage.removeItem('bitbook_custom_css_stars');
    localStorage.removeItem('bitbook_custom_css_tab');
} catch (e) {}
function cscSavePrefs() {
    try { localStorage.setItem(CSC_PREF_KEY, JSON.stringify({ tab: cscTab, preset: cscPreset, code: cscCode })); } catch (e) {}
}

// Splits CSS into "prop: value" pieces at top-level semicolons (not inside url(...;...) or strings)!
function cscSplitDecls(css) {
    const out = [];
    css = css.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
    let start = 0, parens = 0;
    for (let i = 0; i <= css.length; i++) {
        const c = css[i];
        if (c === '"' || c === "'") {
            let j = i + 1;
            while (j < css.length && css[j] !== c) { if (css[j] === '\\') j++; j++; }
            i = j;
            continue;
        }
        if (c === '(') parens++;
        else if (c === ')') parens--;
        else if ((c === ';' && parens <= 0) || i === css.length) {
            const piece = css.slice(start, i).trim();
            if (piece) out.push(piece);
            start = i + 1;
        }
    }
    return out;
}
// "prop: value" lines -> the ones the browser understands, plus friendly notes about the rest!
function cscCheckDecls(text, where) {
    const ok = [];
    const bad = [];
    const pre = where ? where + ': ' : '';
    cscSplitDecls(text).forEach(function (piece) {
        const m = piece.match(/^([-a-zA-Z]+)\s*:\s*([\s\S]+)$/);
        if (!m) { bad.push(pre + '"' + piece + '" needs a colon, like "color: red"!'); return; }
        const prop = m[1].toLowerCase();
        const value = m[2].replace(/\s*!\s*important\s*$/i, '').trim();
        // Nothing that could end a CSS rule (or an exported page's <style>) early ever gets through!
        if (/[{}]|<\//.test(value)) { bad.push(pre + '"' + value + '" can\'t use { } or </ !'); return; }
        let supported = false;
        try { supported = prop.indexOf('--') === 0 || CSS.supports(prop, value); } catch (e) { supported = false; }
        if (!supported) {
            let known = false;
            try { known = CSS.supports(prop, 'inherit'); } catch (e) {}
            bad.push(pre + (known ? '"' + value + '" isn\'t a value ' + prop + ' understands!' : '"' + prop + '" isn\'t a CSS property!'));
            return;
        }
        ok.push(prop + ': ' + m[2].trim() + ';');
    });
    return { ok: ok, bad: bad };
}
// My CSS -> the chip's own CSS, plus optional ::before { } and ::after { } blocks!
function cscCheckCode(code) {
    const bad = [];
    const pseudo = { before: [], after: [] };
    let main = code.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
    main = main.replace(/&?\s*::?(before|after)\s*\{([^{}]*)\}/gi, function (all, which, body) {
        const w = which.toLowerCase();
        const res = cscCheckDecls(body, '::' + w);
        pseudo[w] = pseudo[w].concat(res.ok);
        bad.push.apply(bad, res.bad);
        return ' ';
    });
    if (/[{}]/.test(main)) {
        return { css: '', ok: [], bad: ['The only blocks allowed are ::before { } and ::after { }! Everything else is plain lines like "color: red;"!'], before: '', after: '' };
    }
    const res = cscCheckDecls(main, '');
    ['before', 'after'].forEach(function (w) {
        if (pseudo[w].length && !pseudo[w].some(function (d) { return /^content\s*:/.test(d); })) {
            bad.push('::' + w + ' needs a content line (like content: "";) or it won\'t show up!');
        }
    });
    return { css: res.ok.join(' '), ok: res.ok.concat(pseudo.before, pseudo.after), bad: res.bad.concat(bad), before: pseudo.before.join(' '), after: pseudo.after.join(' ') };
}
function cscHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
}
// Puts the CSS on a chip: style="" for the chip itself, and data-bbcss-before/after for its
// ::before and ::after (style="" can't hold those, so bbcssSyncPseudo turns them into rules)!
function cscPaintChip(el, css, before, after) {
    el.setAttribute('style', css || '');
    if (before || after) {
        if (before) el.setAttribute('data-bbcss-before', before); else el.removeAttribute('data-bbcss-before');
        if (after) el.setAttribute('data-bbcss-after', after); else el.removeAttribute('data-bbcss-after');
        el.setAttribute('data-bbcss-pid', cscHash((before || '') + '|' + (after || '')));
    } else {
        el.removeAttribute('data-bbcss-before');
        el.removeAttribute('data-bbcss-after');
        el.removeAttribute('data-bbcss-pid');
    }
    bbcssSyncPseudo();
}
// One <style> with the ::before/::after rules for every chip on the page! The CSS is checked
// again here, so a note file can only ever add real declarations (never new rules)!
function bbcssSyncPseudo() {
    let tag = document.getElementById('bbcss-pseudo-css');
    const seen = {};
    const out = [];
    document.querySelectorAll('.bbcss-chip[data-bbcss-pid]').forEach(function (el) {
        const pid = el.getAttribute('data-bbcss-pid');
        if (!/^[a-z0-9]{1,13}$/.test(pid) || seen[pid]) return;
        seen[pid] = true;
        ['before', 'after'].forEach(function (w) {
            const raw = el.getAttribute('data-bbcss-' + w);
            if (!raw) return;
            const ok = cscCheckDecls(raw, '').ok;
            if (ok.length) out.push('.bbcss-chip[data-bbcss-pid="' + pid + '"]::' + w + ' { ' + ok.join(' ') + ' }');
        });
    });
    const text = out.join('\n');
    if (!tag) {
        if (!text) return;
        tag = document.createElement('style');
        tag.id = 'bbcss-pseudo-css';
        document.head.appendChild(tag);
    }
    if (tag.textContent !== text) tag.textContent = text;
}
// Keeps those rules in step as notes load, chips get pasted, undo runs, and so on!
(function () {
    let timer = 0;
    const run = function () { timer = 0; bbcssSyncPseudo(); };
    try {
        new MutationObserver(function () { if (!timer) timer = setTimeout(run, 60); })
            .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-bbcss-pid', 'data-bbcss-before', 'data-bbcss-after'] });
    } catch (e) {}
    run();
})();
// The style the open tab is showing: { css, name, sid }!
function cscCurrent() {
    if (cscTab === 'presets') {
        const pr = cscFindPreset(cscPreset) || CSS_CHIP_PRESETS[0];
        return { css: pr.css, name: pr.name, sid: pr.id, preset: pr };
    }
    if (cscTab === 'find') {
        // The chip-ready version of the style you picked in Find Styles!
        const e = cscFindSel ? csfFind(cscFindSel) : null;
        if (!e) return { css: '', name: 'Pick a style above!', sid: 'f0' };
        const st = csfStyleOf(e);
        const fcss = st.flat.join(' ');
        const fb = st.before.join(' ');
        const fa = st.after.join(' ');
        return { css: fcss, before: fb, after: fa, name: e.name, sid: 'f' + cscHash(fcss + '|' + fb + '|' + fa), found: e };
    }
    // Interactive and My CSS are two views of the same code!
    // Same CSS -> same class, so the Style menu groups (and removes) matching chips together!
    const res = cscCheckCode(cscCode);
    return { css: res.css, before: res.before, after: res.after, name: 'My CSS chip', sid: 'c' + cscHash(res.css + (res.before || res.after ? '|' + res.before + '|' + res.after : '')) };
}
function cscPreviewText() {
    let t = '';
    try { if (cscSavedRange && !cscSavedRange.collapsed) t = cscSavedRange.toString().replace(/\s+/g, ' ').trim(); } catch (e) {}
    if (!t) return 'Text';
    return t.length > 40 ? t.slice(0, 39) + '…' : t;
}

// CUSTOM CSS part 2: the dialog!
function cscSetTab(tab) {
    cscTab = CSC_TABS.indexOf(tab) !== -1 ? tab : 'presets';
    if (cscTab !== 'code') cscClosePick();
    csiCloseVarMenu();
    cscSavePrefs();
    document.querySelectorAll('#cs-tabs [data-cs-tab]').forEach(function (b) {
        const on = b.getAttribute('data-cs-tab') === cscTab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('#customcss-dialog [data-cs-panel]').forEach(function (p) {
        p.hidden = p.getAttribute('data-cs-panel') !== cscTab;
    });
    if (cscTab === 'find') cscFindBuild();
    if (cscTab === 'code') cscRenderColors();
    cscRefreshPreview();
}
function cscIsStar(id) { return cscStars.indexOf(id) !== -1; }
function cscToggleStar(id) {
    const i = cscStars.indexOf(id);
    if (i === -1) cscStars.push(id); else cscStars.splice(i, 1);
    try { localStorage.setItem(CSC_STAR_KEY, JSON.stringify(cscStars)); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(i === -1 ? 880 : 500, 0.06); } catch (e) {}
    cscRefreshPresets();
    cscRefreshPreview();
}
function cscPaintStar(btn, pr, withLabel) {
    const on = cscIsStar(pr.id);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', (on ? 'Unstar ' : 'Star ') + pr.name);
    btn.title = on ? 'Remove the star' : 'Star this style';
    btn.textContent = (on ? '★' : '☆') + (withLabel ? (on ? ' Starred' : ' Star') : '');
}
function cscBuildGallery() {
    const grid = document.getElementById('cs-grid');
    if (!grid || grid.children.length || typeof CSS_CHIP_PRESETS === 'undefined') return;
    const frag = document.createDocumentFragment();
    CSS_CHIP_PRESETS.forEach(function (pr) {
        const tile = document.createElement('div');
        tile.className = 'us-tile cs-tile';
        tile.setAttribute('data-cs-id', pr.id);
        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'us-tile-pick';
        pick.title = pr.name + ' · ' + cscCatName(pr.cat) + ' (double-click to apply!)';
        const stage = document.createElement('span');
        stage.className = 'us-tile-stage';
        const chip = document.createElement('span');
        chip.className = 'bbcss-chip';
        chip.setAttribute('style', pr.css);
        chip.textContent = 'Text';
        stage.appendChild(chip);
        const nm = document.createElement('span');
        nm.className = 'us-tile-name';
        nm.textContent = pr.name;
        const fm = document.createElement('span');
        fm.className = 'us-tile-fam';
        fm.textContent = cscCatName(pr.cat);
        pick.appendChild(stage);
        pick.appendChild(nm);
        pick.appendChild(fm);
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'us-fav cs-fav';
        tile.appendChild(pick);
        tile.appendChild(star);
        frag.appendChild(tile);
    });
    grid.appendChild(frag);
    const cats = document.getElementById('cs-cat');
    if (cats && !cats.options.length) {
        [['all', 'All styles (' + CSS_CHIP_PRESETS.length + ')'], ['star', '★ Starred']].concat(CSS_CHIP_CATEGORIES).forEach(function (c) {
            const o = document.createElement('option');
            o.value = c[0];
            o.textContent = c[1];
            cats.appendChild(o);
        });
    }
}
function cscRefreshPresets() {
    const q = ((document.getElementById('cs-search') || {}).value || '').trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('#cs-grid .cs-tile').forEach(function (tile) {
        const id = tile.getAttribute('data-cs-id');
        const pr = cscFindPreset(id);
        const catOk = cscCat === 'all' ? true : cscCat === 'star' ? cscIsStar(id) : pr.cat === cscCat;
        const qOk = !q || (pr.name + ' ' + cscCatName(pr.cat) + ' ' + pr.tags).toLowerCase().indexOf(q) !== -1;
        tile.hidden = !(catOk && qOk);
        if (!tile.hidden) shown++;
        const on = id === cscPreset;
        tile.classList.toggle('active', on);
        tile.querySelector('.us-tile-pick').setAttribute('aria-pressed', on ? 'true' : 'false');
        cscPaintStar(tile.querySelector('.cs-fav'), pr, false);
    });
    const cats = document.getElementById('cs-cat');
    if (cats && cats.value !== cscCat) cats.value = cscCat;
    const empty = document.getElementById('cs-empty');
    if (empty) {
        empty.hidden = shown > 0;
        empty.textContent = cscCat === 'star' && !cscStars.length ? 'No stars yet! Tap the ☆ on any style to keep it here!' : 'No styles match that search!';
    }
    const cnt = document.getElementById('cs-count');
    if (cnt) cnt.textContent = shown + (shown === 1 ? ' style' : ' styles');
}
function cscRefreshCode() {
    const box = document.getElementById('cs-code');
    if (box && box.value !== cscCode) box.value = cscCode;
    const status = document.getElementById('cs-code-status');
    if (!status) return;
    const res = cscCheckCode(cscCode);
    status.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'cs-code-ok';
    head.textContent = res.ok.length ? '✓ ' + res.ok.length + (res.ok.length === 1 ? ' line works!' : ' lines work!') : (cscCode.trim() ? 'Nothing works yet!' : 'Nothing here yet! Try a starter above!');
    status.appendChild(head);
    res.bad.forEach(function (msg) {
        const b = document.createElement('div');
        b.className = 'cs-code-bad';
        b.textContent = '⚠ ' + msg;
        status.appendChild(b);
    });
    cscRenderColors();
    csiSync();
}
function cscRefreshPreview() {
    const cur = cscCurrent();
    const prev = document.getElementById('cs-preview');
    if (prev) {
        cscPaintChip(prev, cur.css, cur.before, cur.after);
        prev.textContent = cscPreviewText();
    }
    const nm = document.getElementById('cs-preview-name');
    if (nm) nm.textContent = cur.preset ? cur.name + ' · ' + cscCatName(cur.preset.cat) : cur.found ? cur.name + ' · ' + cur.found.where[0] : cur.name;
    const big = document.getElementById('cs-star-btn');
    if (big) {
        big.hidden = !cur.preset;
        if (cur.preset) cscPaintStar(big, cur.preset, true);
    }
    const edit = document.getElementById('cs-edit-btn');
    if (edit) edit.hidden = cscTab === 'code' || cscTab === 'interactive' || (cscTab === 'find' && !cur.found);
    const apply = document.getElementById('cs-apply-btn');
    if (apply) apply.disabled = !cur.css && !cur.before && !cur.after;
}
function cscRefreshAll() {
    cscRefreshPresets();
    cscRefreshCode();
    cscRenderSaved();
    cscRefreshPreview();
}
function cscOpenDialog() {
    const dlg = document.getElementById('customcss-dialog');
    if (!dlg) return;
    cscSavedRange = null;
    try {
        const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
        const sel = window.getSelection();
        if (cv && sel.rangeCount && cv.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            cscSavedRange = sel.getRangeAt(0).cloneRange();
        }
    } catch (e) {}
    cscBuildGallery();
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08); } catch (e) {}
    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
        try { dlg.setAttribute('open', ''); } catch (err) {}
    }
    cscSetTab(cscTab);
    cscRefreshAll();
    try {
        const active = document.querySelector('#cs-grid .cs-tile.active');
        if (cscTab === 'presets' && active && !active.hidden && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    } catch (e) {}
}
function cscCloseDialog() {
    const dlg = document.getElementById('customcss-dialog');
    if (!dlg) return;
    try {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
    } catch (e) {
        try { dlg.removeAttribute('open'); } catch (err) {}
    }
}
function cscApplyStyle() {
    const cur = cscCurrent();
    if (!cur.css && !cur.before && !cur.after) return false;
    cscSavePrefs();
    const range = cscSavedRange;
    cscSavedRange = null;
    cscCloseDialog();
    return cscInsertChip(cur, range);
}
// Puts a Custom CSS chip ({ css, before, after, name, sid }) on a range (or a "Text" chip at the caret)!
function cscInsertChip(cur, range) {
    const cv = (typeof canvas !== 'undefined' && canvas) ? canvas : document.getElementById('wysiwyg-canvas');
    if (!cv) return false;
    try { cv.focus(); } catch (e) {}
    const chip = document.createElement('span');
    chip.className = 'bbcss-chip bbcss-' + cur.sid;
    chip.setAttribute('data-bbcss-name', cur.name);
    cscPaintChip(chip, cur.css, cur.before, cur.after);
    chip.setAttribute('spellcheck', 'false');
    const sel = window.getSelection();
    try {
        if (range && !range.collapsed && cv.contains(range.commonAncestorContainer)) {
            chip.appendChild(range.extractContents());
            range.insertNode(chip);
        } else {
            chip.textContent = 'Text';
            let placed = false;
            if (range && cv.contains(range.startContainer)) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
            try { if (typeof fmtInsertNodeAtCaret === 'function') placed = !!fmtInsertNodeAtCaret(chip); } catch (e) { placed = false; }
            if (!placed && !chip.isConnected) cv.appendChild(chip);
        }
        // Select the chip's text: type to replace it, or Backspace to delete it!
        const r = document.createRange();
        r.selectNodeContents(chip);
        sel.removeAllRanges();
        sel.addRange(r);
    } catch (e) { return false; }
    try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    try { if (typeof fmtRenderStyleList === 'function') fmtRenderStyleList(); } catch (e) {}
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.08); } catch (e) {}
    return true;
}
function cscInsertSnippet(text) {
    const box = document.getElementById('cs-code');
    if (!box) return;
    const s = box.selectionStart, e = box.selectionEnd;
    const before = box.value.slice(0, s);
    const pad = before && !/\n\s*$/.test(before) ? '\n' : '';
    box.value = before + pad + text + '\n' + box.value.slice(e);
    const pos = (before + pad + text + '\n').length;
    box.focus();
    box.setSelectionRange(pos, pos);
    box.dispatchEvent(new Event('input'));
}
// CUSTOM CSS part 3: Saved CSS! Name your My CSS and keep it for later!
var CSC_SAVED_KEY = 'bitbook_css_saved';
var cscSaved = [];
try {
    const raw = JSON.parse(localStorage.getItem(CSC_SAVED_KEY) || '[]');
    if (Array.isArray(raw)) cscSaved = raw.filter(function (s) { return s && typeof s.name === 'string' && typeof s.code === 'string'; });
} catch (e) {}
function cscStoreSaved() {
    try { localStorage.setItem(CSC_SAVED_KEY, JSON.stringify(cscSaved)); return true; } catch (e) { return false; }
}
function cscSaveMsg(text) {
    const msg = document.getElementById('cs-save-msg');
    if (!msg) return;
    msg.textContent = text;
    clearTimeout(cscSaveMsg._t);
    cscSaveMsg._t = setTimeout(function () { msg.textContent = ''; }, 2600);
}
function cscSaveCode() {
    if (!cscCode.trim()) { cscSaveMsg('Write some CSS first!'); return; }
    const box = document.getElementById('cs-save-name');
    let name = ((box && box.value) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!name) name = 'My CSS ' + (cscSaved.length + 1);
    // Same name = update that one, so saving again never makes duplicates!
    const hit = cscSaved.filter(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })[0];
    if (hit) {
        hit.code = cscCode;
        hit.t = Date.now();
    } else {
        cscSaved.unshift({ id: 's' + Date.now().toString(36), name: name, code: cscCode, t: Date.now() });
    }
    if (box) box.value = name;
    cscSaveMsg(cscStoreSaved() ? (hit ? '✓ Updated "' + name + '"!' : '✓ Saved "' + name + '"!') : 'Couldn\'t save (browser storage is full or blocked)!');
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(880, 0.06); } catch (e) {}
    cscRenderSaved();
    cscFindEntriesCache = null;
}
function cscRenderSaved() {
    const list = document.getElementById('cs-saved');
    if (!list) return;
    list.innerHTML = '';
    if (!cscSaved.length) {
        const empty = document.createElement('p');
        empty.className = 'cs-saved-empty';
        empty.textContent = 'Nothing saved yet! Name your CSS above and press Save CSS!';
        list.appendChild(empty);
        return;
    }
    cscSaved.forEach(function (s) {
        const row = document.createElement('div');
        row.className = 'cs-saved-row';
        row.setAttribute('data-cs-saved', s.id);
        const stage = document.createElement('span');
        stage.className = 'cs-saved-stage';
        const chip = document.createElement('span');
        chip.className = 'bbcss-chip';
        const res = cscCheckCode(s.code);
        cscPaintChip(chip, res.css, res.before, res.after);
        chip.textContent = 'Text';
        stage.appendChild(chip);
        const nm = document.createElement('span');
        nm.className = 'cs-saved-name';
        nm.textContent = s.name;
        nm.title = s.name;
        const load = document.createElement('button');
        load.type = 'button';
        load.className = 'px-seg-btn';
        load.setAttribute('data-cs-saved-act', 'load');
        load.textContent = 'Load';
        load.setAttribute('aria-label', 'Load ' + s.name);
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'px-seg-btn cs-saved-del';
        del.setAttribute('data-cs-saved-act', 'delete');
        del.textContent = 'Delete';
        del.setAttribute('aria-label', 'Delete ' + s.name);
        row.appendChild(stage);
        row.appendChild(nm);
        row.appendChild(load);
        row.appendChild(del);
        list.appendChild(row);
    });
}
function cscSavedAction(id, act, btn) {
    const i = cscSaved.findIndex(function (s) { return s.id === id; });
    if (i === -1) return;
    const s = cscSaved[i];
    if (act === 'load') {
        cscCode = s.code;
        const box = document.getElementById('cs-save-name');
        if (box) box.value = s.name;
        cscSavePrefs();
        cscRefreshCode();
        cscRefreshPreview();
        cscSaveMsg('Loaded "' + s.name + '"!');
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(760, 0.05); } catch (e) {}
        return;
    }
    // Delete asks once ("Sure?") so a stray click can't lose your CSS!
    if (!btn.classList.contains('armed')) {
        btn.classList.add('armed');
        btn.textContent = 'Sure?';
        setTimeout(function () {
            if (btn.isConnected) { btn.classList.remove('armed'); btn.textContent = 'Delete'; }
        }, 3000);
        return;
    }
    cscSaved.splice(i, 1);
    cscStoreSaved();
    cscSaveMsg('Deleted "' + s.name + '"!');
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(500, 0.06); } catch (e) {}
    cscRenderSaved();
    cscFindEntriesCache = null;
}

// CUSTOM CSS part 4: Find Styles! Every formatting style in Bitbook in one search,
// with the real CSS behind each one (read straight from the stylesheets)!
var CSF_SOURCES = [
    ['all', 'All sources'],
    ['fav', '★ Favorites'],
    ['gallery', 'Gallery'],
    ['keydown', 'Keydown'],
    ['market', 'Keydown Styles (Marketplace)'],
    ['highlight', 'Highlight (top bar)'],
    ['toolbar', 'Selection toolbar'],
    ['annotate', 'Annotate'],
    ['customchip', 'Custom Chip'],
    ['csspreset', 'Custom CSS presets'],
    ['saved', 'Saved CSS']
];
var CSF_GALLERY_COLS = { regular: 'Regular', aero: 'Frutiger Aero', aero2: 'Frutiger Aero 2', aero3: 'Frutiger Aero 3', pool: 'Poolside', pool2: 'Poolside 2', pool3: 'Poolside 3' };
var CSF_PAGE = 120;
var cscFindEntriesCache = null;
var cscFindSrc = 'all';
var cscFindShown = CSF_PAGE;
var cscFindSel = null;
var cscFindPackSheets = null;
var cscRuleCache = null;

function csfSourceName(src) {
    const s = CSF_SOURCES.filter(function (x) { return x[0] === src; })[0];
    return s ? s[1] : src;
}
// "gel-chip-waterdrop" -> "Waterdrop", for toolbar buttons with no title!
function csfPrettyClass(cls) {
    const last = String(cls).trim().split(/\s+/).pop() || '';
    return last.replace(/^(gel-chip|effect|gel|megachip|aero)-/, '').split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}
// Each Marketplace pack's CSS, parsed (installed or not) so it can be read and previewed!
function csfPackSheets() {
    if (cscFindPackSheets) return cscFindPackSheets;
    cscFindPackSheets = [];
    let catalog = [];
    try { catalog = (window.WriteoutMarketplace && window.WriteoutMarketplace.catalog) || []; } catch (e) {}
    let doc = null;
    try { doc = document.implementation.createHTMLDocument(''); } catch (e) {}
    catalog.forEach(function (ext) {
        if (!ext || ext.category !== 'styles' || !ext.css || !doc) return;
        try {
            const tag = doc.createElement('style');
            tag.textContent = ext.css;
            doc.head.appendChild(tag);
            if (tag.sheet) cscFindPackSheets.push({ ext: ext, sheet: tag.sheet });
        } catch (e) {}
    });
    // Previews of packs you haven't installed: the same CSS, but only inside Find Styles!
    if (!document.getElementById('cs-find-pack-css')) {
        const scoped = [];
        const scope = function (rules, out) {
            for (let i = 0; i < rules.length; i++) {
                const r = rules[i];
                if (r.selectorText !== undefined && r.style) {
                    out.push(csfSplitTop(r.selectorText, ',').map(function (p) { return '.cs-find-scope ' + p.trim(); }).join(', ') + ' { ' + r.style.cssText + ' }');
                } else if (r.media && r.cssRules) {
                    const inner = [];
                    scope(r.cssRules, inner);
                    out.push('@media ' + r.media.mediaText + ' { ' + inner.join(' ') + ' }');
                } else {
                    out.push(r.cssText);
                }
            }
        };
        cscFindPackSheets.forEach(function (p) { try { scope(p.sheet.cssRules, scoped); } catch (e) {} });
        const st = document.createElement('style');
        st.id = 'cs-find-pack-css';
        st.textContent = scoped.join('\n');
        document.head.appendChild(st);
    }
    return cscFindPackSheets;
}
function csfEntries() {
    if (cscFindEntriesCache) return cscFindEntriesCache;
    const list = [];
    const byKey = {};
    // One entry per look: a style found in two places lists both sources!
    const add = function (e) {
        e.tag = e.tag || 'span';
        e.vars = e.vars || '';
        e.css = e.css || '';
        e.before = e.before || '';
        e.after = e.after || '';
        e.key = e.tag + '|' + e.cls + '|' + e.vars + '|' + e.css + '|' + e.before + '|' + e.after;
        // A favorite's id stays the same even if the style's CSS changes later!
        e.fid = e.fid || 'c:' + e.tag + ':' + e.cls;
        const prev = byKey[e.key];
        if (prev) {
            if (prev.srcs.indexOf(e.src) === -1) {
                prev.srcs.push(e.src);
                prev.where.push(e.where);
                prev.search += ' ' + e.where.toLowerCase() + ' ' + e.name.toLowerCase();
            }
            if (!prev.trigger && e.trigger) prev.trigger = e.trigger;
            return;
        }
        e.srcs = [e.src];
        e.where = [e.where];
        e.search = (e.name + ' ' + e.where.join(' ') + ' ' + e.cls + ' ' + (e.tags || '') + ' ' + (e.trigger || '')).toLowerCase();
        byKey[e.key] = e;
        list.push(e);
    };
    try {
        (typeof FMT_DEFAULT_STYLES !== 'undefined' ? FMT_DEFAULT_STYLES : []).forEach(function (it) {
            add({ name: it.label, cls: it.cls, src: 'keydown', where: 'Keydown' });
        });
    } catch (e) {}
    try {
        [['FMT_HIGHLIGHT_STYLES', 'Highlighter'], ['FMT_CHIP_STYLES', 'Gel Orbs'], ['FMT_AQUA_STYLES', 'Gel Bubbles']].forEach(function (g) {
            const arr = window[g[0]] || [];
            arr.forEach(function (it) { add({ name: it.label, cls: it.cls, src: 'highlight', where: 'Top bar · ' + g[1] }); });
        });
    } catch (e) {}
    try {
        document.querySelectorAll('#aero-selection-toolbar [data-class]').forEach(function (b) {
            const cls = b.getAttribute('data-class');
            if (!cls) return;
            add({ name: b.getAttribute('title') || csfPrettyClass(cls), cls: cls, src: 'toolbar', where: 'Selection toolbar' });
        });
    } catch (e) {}
    try {
        if (typeof US_STYLES !== 'undefined') US_STYLES.forEach(function (st) {
            add({ name: st.famName + ' · ' + st.name, cls: st.cls, src: 'gallery', where: 'Gallery · ' + (CSF_GALLERY_COLS[st.col] || st.col), fid: 'g:' + st.id, usId: st.id });
        });
    } catch (e) {}
    try {
        csfPackSheets();
        const catalog = (window.WriteoutMarketplace && window.WriteoutMarketplace.catalog) || [];
        catalog.forEach(function (ext) {
            if (!ext || ext.category !== 'styles') return;
            const where = 'Marketplace · ' + ext.name;
            const trig = function (t) { return t && t.open ? t.open + 'text' + t.close : ''; };
            if (Array.isArray(ext.styles)) ext.styles.forEach(function (s) {
                if (s && s.className) add({ name: s.name, cls: s.className, src: 'market', where: where, trigger: trig(s.trigger) });
            });
            else if (ext.toolbarClass) add({ name: ext.name, cls: ext.toolbarClass, src: 'market', where: where, trigger: trig(ext.trigger) });
        });
    } catch (e) {}
    try {
        document.querySelectorAll('#annotate-view [data-an-color][data-an-style]').forEach(function (b) {
            const color = b.getAttribute('data-an-color');
            const style = b.getAttribute('data-an-style');
            if (!color || color === 'erase') return;
            const kind = { hl: 'Highlighter', ul: 'Gel Underline', st: 'Gel Strikethrough', bx: 'Gel Box', ha: 'Halo', cb: 'Corner Brackets', gf: 'Spotlight', ga: 'Gel Accent', gb: 'Gel Bubble', dk: 'Dusk', pr: 'Prism', cm: 'Complement', tk: 'Ticket', nn: 'Neon', sm: 'Stamp', tp: 'Washi Tape', ck: 'Checker', ht: 'Halftone', au: 'Aurora', ml: 'Mild', gw: 'Gel Wrap', bt: 'Highlight Belt', bk: 'Gel Bucket', tr: 'Gel Torpedo', bo: 'Gel Bottle', pk: 'Gel Packet', sl: 'Gel Select', cs: 'Gel Capsule', fr: 'Frost', px: 'Pixel', fl: 'Gel Flag', gm: 'Gel Gem' }[style] || style;
            add({ name: (b.getAttribute('aria-label') || color), tag: 'mark', cls: 'an-hl an-hl-' + color + (style !== 'hl' ? ' an-s-' + style : ''), src: 'annotate', where: 'Annotate · ' + kind });
        });
    } catch (e) {}
    try {
        if (typeof CC_STYLES !== 'undefined') {
            // Custom Chip styles are painted from one color: show them in your last pick!
            let hex = '#0ea5e9';
            try {
                const pref = JSON.parse(localStorage.getItem(CC_PREF_KEY) || 'null');
                if (pref && uniParseHex(pref.hex)) hex = pref.hex;
            } catch (e) {}
            const rgb = uniParseHex(hex);
            const vars = '--cc: ' + hex + '; --cc-ink: ' + (rgb ? ccInkFor(rgb) : '#ffffff') + ';';
            CC_STYLES.forEach(function (name, i) {
                add({ name: name, cls: 'cc-chip cc-s' + (i + 1), vars: vars, src: 'customchip', where: 'Custom Chip' });
            });
        }
    } catch (e) {}
    try {
        if (typeof CSS_CHIP_PRESETS !== 'undefined') CSS_CHIP_PRESETS.forEach(function (pr) {
            add({ name: pr.name, cls: 'bbcss-chip', css: pr.css, tags: pr.tags, src: 'csspreset', where: 'Custom CSS · ' + cscCatName(pr.cat), fid: 'p:' + pr.id });
        });
    } catch (e) {}
    cscSaved.forEach(function (s) {
        const res = cscCheckCode(s.code);
        add({ name: s.name, cls: 'bbcss-chip', css: res.css, before: res.before, after: res.after, src: 'saved', where: 'Saved CSS', fid: 's:' + s.id });
    });
    cscFindEntriesCache = list;
    return list;
}
// FIND STYLES FAVORITES! They sync with the Gallery's stars: Send (starring a Gallery style
// here stars it there) and Receive (starring one there stars it here), both in Settings!
var CSF_FAV_KEY = 'bitbook_find_favs';
var CSF_FAV_SEND_KEY = 'bitbook_fav_send';
var CSF_FAV_RECEIVE_KEY = 'bitbook_fav_receive';
var csfFavs = null;
function csfFavSync(key) {
    try { return localStorage.getItem(key) !== '0'; } catch (e) { return true; }
}
function csfStoreFavs() {
    try { localStorage.setItem(CSF_FAV_KEY, JSON.stringify(csfFavs)); } catch (e) {}
}
function csfLoadFavs() {
    if (csfFavs) return csfFavs;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(CSF_FAV_KEY) || 'null'); } catch (e) { raw = null; }
    csfFavs = Array.isArray(raw) ? raw.filter(function (f) { return typeof f === 'string'; }) : [];
    // The very first time, Receive brings in the Gallery stars you already have!
    if (!Array.isArray(raw)) {
        if (csfFavSync(CSF_FAV_RECEIVE_KEY) && typeof usFavs !== 'undefined') csfFavs = usFavs.map(function (id) { return 'g:' + id; });
        csfStoreFavs();
    }
    return csfFavs;
}
function csfIsFav(e) { return csfLoadFavs().indexOf(e.fid) !== -1; }
function csfSetFav(fid, on) {
    const list = csfLoadFavs();
    const i = list.indexOf(fid);
    if (on && i === -1) list.push(fid);
    else if (!on && i !== -1) list.splice(i, 1);
    else return;
    csfStoreFavs();
}
function csfPaintStar(btn, e, withLabel) {
    const on = csfIsFav(e);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', (on ? 'Unfavorite ' : 'Favorite ') + e.name);
    btn.title = on ? 'Remove from Favorites' : 'Add to Favorites';
    btn.textContent = (on ? '★' : '☆') + (withLabel ? (on ? ' Favorite' : ' Star') : '');
}
function csfRefreshFavs() {
    const grid = document.getElementById('cs-find-grid');
    if (grid && grid.children.length) csfRenderGrid();
    const view = document.getElementById('cs-find-view');
    if (view && !view.hidden) csfRenderView();
}
function csfToggleFav(e) {
    const on = !csfIsFav(e);
    csfSetFav(e.fid, on);
    // Send: a Gallery style starred here gets starred in the Gallery too!
    if (e.usId && csfFavSync(CSF_FAV_SEND_KEY) && typeof usFavs !== 'undefined') {
        const i = usFavs.indexOf(e.usId);
        if (on && i === -1) usFavs.push(e.usId);
        else if (!on && i !== -1) usFavs.splice(i, 1);
        usSaveFavs();
    }
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(on ? 880 : 500, 0.06); } catch (e2) {}
    csfRefreshFavs();
}
// Receive: the Gallery calls this when one of its stars changes!
function csfGalleryFavChanged(id, on) {
    if (!csfFavSync(CSF_FAV_RECEIVE_KEY)) return;
    csfSetFav('g:' + id, on);
    csfRefreshFavs();
}
// Settings calls this when Receive is turned on: every Gallery star comes over!
function csfOnFavSettings() {
    if (!csfFavSync(CSF_FAV_RECEIVE_KEY) || typeof usFavs === 'undefined') return;
    usFavs.forEach(function (id) { csfSetFav('g:' + id, true); });
    csfRefreshFavs();
}
function csfFind(key) {
    const list = csfEntries();
    for (let i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
}

// Splits at top-level commas (or other chars), skipping ( ) and [ ] groups!
function csfSplitTop(s, ch) {
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (c === ch && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
    }
    out.push(s.slice(start));
    return out;
}
// The last compound of a selector part ("#page .x > .y:hover" -> ".y:hover")!
function csfSubject(part) {
    let depth = 0;
    for (let i = part.length - 1; i >= 0; i--) {
        const c = part[i];
        if (c === ')' || c === ']') depth++;
        else if (c === '(' || c === '[') depth--;
        else if (depth === 0 && (c === ' ' || c === '>' || c === '+' || c === '~')) return part.slice(i + 1).trim();
    }
    return part.trim();
}
// Every style rule Bitbook has, flattened once (with its @media and where it came from)!
function csfRules() {
    if (cscRuleCache) return cscRuleCache;
    const rules = [];
    const keyframes = {};
    const walk = function (list, media, from, href) {
        for (let i = 0; i < list.length; i++) {
            const r = list[i];
            if (r.selectorText !== undefined && r.style) rules.push({ sel: r.selectorText, style: r.style, media: media, from: from, href: href });
            else if (r.type === 7) { if (!keyframes[r.name]) keyframes[r.name] = { text: r.cssText, from: from }; }
            else if (r.cssRules) {
                const cond = r.media ? '@media ' + r.media.mediaText : (r.conditionText ? '@supports ' + r.conditionText : '');
                walk(r.cssRules, cond ? media.concat([cond]) : media, from, href);
            }
        }
    };
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
        const node = sh.ownerNode;
        // Pack CSS is read from the Marketplace itself (so uninstalled packs work too)!
        if (node && node.id && (node.id === 'cs-find-pack-css' || node.id.indexOf('mkt-style-') === 0)) return;
        let list = null;
        try { list = sh.cssRules; } catch (e) { list = null; }
        if (!list) return;
        let from = 'page <style>';
        if (sh.href) from = sh.href.split('/').pop().split('?')[0];
        walk(list, [], from, sh.href || '');
    });
    csfPackSheets().forEach(function (p) {
        try { walk(p.sheet.cssRules, [], 'Marketplace: ' + p.ext.name, ''); } catch (e) {}
    });
    cscRuleCache = { rules: rules, keyframes: keyframes };
    return cscRuleCache;
}
// Rough specificity of one compound, so the flattened CSS layers like the browser does!
function csfSpecificity(sub) {
    const s = sub.replace(/\([^)]*\)/g, '');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || []).length;
    const tags = (s.replace(/[#.:][\w-]+|\[[^\]]*\]|::?[\w-]+/g, ' ').match(/[a-zA-Z][\w-]*/g) || []).length;
    return ids * 10000 + cls * 100 + tags;
}
// A rule's declarations as text! If a shorthand used var() and a longhand was changed after
// it, the browser lists the shorthand's pieces with empty values, so it comes back whole here!
// The stylesheets' own text, fetched once, for the rare value the browser can't give back!
var csfSourceText = {};
function csfLoadSources(done) {
    if (csfLoadSources._started) return;
    csfLoadSources._started = true;
    const jobs = [];
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
        if (!sh.href || sh.href.indexOf(location.origin) !== 0) return;
        jobs.push(fetch(sh.href).then(function (res) { return res.ok ? res.text() : ''; }).then(function (t) {
            if (t) csfSourceText[sh.href] = t;
        }).catch(function () {}));
    });
    Promise.all(jobs).then(function () { if (done) done(); });
}
// Finds "prop: value" for one selector in a stylesheet's source text!
function csfSourceValue(href, selectorText, prop) {
    const text = csfSourceText[href];
    if (!text) return '';
    const first = csfSplitTop(selectorText, ',')[0].trim();
    let at = text.indexOf(first);
    while (at !== -1) {
        const open = text.indexOf('{', at);
        const between = open === -1 ? '' : text.slice(at + first.length, open);
        if (open !== -1 && /^[\s,]/.test(between || ' ') && !/[;}]/.test(between)) {
            const close = text.indexOf('}', open);
            const body = text.slice(open + 1, close === -1 ? undefined : close).replace(/\/\*[\s\S]*?\*\//g, ' ');
            const m = body.match(new RegExp('(?:^|[;\\s])' + csfEscapeRe(prop) + '\\s*:\\s*([^;]+)', 'i'));
            if (m) return m[1].trim();
        }
        at = text.indexOf(first, at + first.length);
    }
    return '';
}
function csfDecls(style, rule) {
    const out = [];
    const done = {};
    cscSplitDecls(style.cssText).forEach(function (d) {
        const m = d.match(/^([-\w]+)\s*:\s*([\s\S]*)$/);
        if (!m) return;
        if (m[2].trim()) { out.push(d); return; }
        const bits = m[1].split('-');
        for (let n = 1; n < bits.length; n++) {
            const sh = bits.slice(0, n).join('-');
            if (!sh) continue;
            if (done[sh]) return;
            let v = style.getPropertyValue(sh);
            if (!v && rule && rule.href) v = csfSourceValue(rule.href, rule.sel, sh);
            if (v) { done[sh] = true; out.push(sh + ': ' + v + (style.getPropertyPriority(sh) ? ' !important' : '')); return; }
        }
    });
    return out;
}
// What every Custom CSS chip gets from .bbcss-chip! Edit as CSS sets these to the original
// style's own values, so the chip doesn't pick up padding or corners the original never had!
var CSF_BASE_PROPS = {
    display: ['display'],
    position: ['position'],
    padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
    margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
    'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
    'line-height': ['line-height'],
    'vertical-align': ['vertical-align']
};
function csfBaseFill(entry, have) {
    const missing = [];
    Object.keys(CSF_BASE_PROPS).forEach(function (prop) {
        if (have.indexOf(prop) !== -1) return;
        CSF_BASE_PROPS[prop].forEach(function (k) { if (have.indexOf(k) === -1) missing.push(k); });
    });
    if (!missing.length) return [];
    const holder = document.createElement('div');
    holder.style.cssText = 'position: absolute; left: -9999px; top: 0; visibility: hidden;';
    const el = csfMakeChip(entry, 'Text');
    holder.appendChild(el);
    document.body.appendChild(holder);
    const cs = getComputedStyle(el);
    const out = [];
    missing.forEach(function (k) { out.push(k + ': ' + cs.getPropertyValue(k) + ';'); });
    holder.remove();
    return out;
}
function csfEscapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// Finds every rule that styles this entry, and builds both the full CSS and a chip-ready version!
function csfStyleOf(entry) {
    const out = { full: [], flat: [], before: [], after: [], skipped: 0, anims: [] };
    const classes = entry.cls.split(/\s+/).filter(Boolean);
    const probe = document.createElement(entry.tag);
    probe.className = entry.cls;
    const classRes = classes.map(function (c) { return new RegExp('\\.' + csfEscapeRe(c) + '(?![\\w-])'); });
    const db = csfRules();
    // Remembers the @keyframes an animation uses, so the full CSS can show them too!
    const noteAnims = function (decls) {
        decls.forEach(function (d) {
            const m = d.match(/^animation(-name)?\s*:\s*([\s\S]+)$/i);
            if (m) m[2].split(',').forEach(function (a) {
                a.trim().split(/\s+/).forEach(function (w) { if (db.keyframes[w] && out.anims.indexOf(w) === -1) out.anims.push(w); });
            });
        });
    };
    const flatRules = { main: [], before: [], after: [] };
    // Custom CSS chips get the .bbcss-chip base from their class, so only their own CSS goes inline!
    const ownCssOnly = entry.cls === 'bbcss-chip';
    let order = 0;
    let lastFrom = '';
    db.rules.forEach(function (r) {
        if (!classes.some(function (c) { return r.sel.indexOf(c) !== -1; })) return;
        const parts = [];
        const spec = { main: 0, before: 0, after: 0 };
        csfSplitTop(r.sel, ',').forEach(function (raw) {
            const part = raw.trim();
            const sub = csfSubject(part);
            if (!classRes.some(function (re) { return re.test(sub); })) return;
            const bare = sub.replace(/::?(before|after|first-letter|first-line|selection|marker|placeholder)\b|::[\w-]+(\([^)]*\))?/gi, '')
                .replace(/:(hover|focus|focus-visible|focus-within|active|visited|link)\b/gi, '');
            let hit = false;
            try { hit = probe.matches(bare || '*'); } catch (e) { hit = false; }
            if (!hit) return;
            parts.push(part);
            // Plain "this element" rules go in the chip's style="", and plain ::before/::after
            // rules go in its ::before { } / ::after { } blocks! (Hover, page-scoped and others can't.)
            if (part !== sub) return;
            const pe = sub.match(/::?(before|after)$/i);
            const slot = pe ? pe[1].toLowerCase() : 'main';
            if (bare === (pe ? sub.slice(0, -pe[0].length) : sub)) spec[slot] = Math.max(spec[slot], csfSpecificity(sub));
        });
        if (!parts.length) return;
        const decls = csfDecls(r.style, r);
        const head = r.from !== lastFrom ? '/* ' + r.from + ' */\n' : '';
        lastFrom = r.from;
        let block = parts.join(',\n') + ' {\n' + decls.map(function (d) { return '  ' + d + ';'; }).join('\n') + '\n}';
        r.media.slice().reverse().forEach(function (m) { block = m + ' {\n' + block.replace(/^/gm, '  ') + '\n}'; });
        out.full.push(head + block);
        if (ownCssOnly) {
            // (nothing to flatten: the class brings these rules along)
        } else if (!r.media.length && (spec.main || spec.before || spec.after)) {
            ['main', 'before', 'after'].forEach(function (slot) {
                if (spec[slot]) flatRules[slot].push({ spec: spec[slot], order: order, decls: decls });
            });
            order++;
        } else out.skipped++;
        noteAnims(decls);
    });
    noteAnims(cscSplitDecls(entry.vars + ' ' + entry.css));
    out.anims.forEach(function (n) { out.full.push('/* ' + db.keyframes[n].from + ' */\n' + db.keyframes[n].text); });
    // Layer the plain rules (low to high specificity), then the chip's own CSS on top!
    const layer = function (rules, own) {
        rules.sort(function (a, b) { return a.spec - b.spec || a.order - b.order; });
        const merged = {};
        const keys = [];
        const put = function (d) {
            const m = d.match(/^([-\w]+)\s*:\s*([\s\S]+)$/);
            if (!m) return;
            const prop = m[1].toLowerCase();
            const imp = /!\s*important\s*$/i.test(m[2]);
            if (merged[prop] && merged[prop].imp && !imp) return;
            if (!merged[prop]) keys.push(prop);
            merged[prop] = { text: prop + ': ' + m[2].trim(), imp: imp };
        };
        rules.forEach(function (fr) { fr.decls.forEach(put); });
        cscSplitDecls(own).forEach(put);
        return keys.map(function (k) { return merged[k].text + ';'; });
    };
    out.flat = layer(flatRules.main, entry.vars + ' ' + entry.css);
    if (!ownCssOnly) {
        const have = out.flat.map(function (d) { return d.split(':')[0].trim(); });
        out.flat = csfBaseFill(entry, have).concat(out.flat);
    }
    out.before = layer(flatRules.before, entry.before);
    out.after = layer(flatRules.after, entry.after);
    if (entry.vars || entry.css || entry.before || entry.after) {
        let own = '/* On the chip itself */\n' + cscSplitDecls(entry.vars + ' ' + entry.css).map(function (d) { return d + ';'; }).join('\n');
        ['before', 'after'].forEach(function (w) {
            if (entry[w]) own += '\n::' + w + ' {\n' + cscSplitDecls(entry[w]).map(function (d) { return '  ' + d + ';'; }).join('\n') + '\n}';
        });
        out.full.unshift(own);
    }
    return out;
}
function csfMakeChip(entry, text) {
    const el = document.createElement(entry.tag);
    el.className = entry.cls;
    const inline = (entry.vars + ' ' + entry.css).trim();
    if (entry.before || entry.after) cscPaintChip(el, inline, entry.before, entry.after);
    else if (inline) el.setAttribute('style', inline);
    el.textContent = text;
    return el;
}
// Previews sit in a line of text like they would in a note (a flex stage would turn
// inline styles like Annotate's <mark> into blocks and knock them off-center)!
function csfPreviewLine(entry, text) {
    const line = document.createElement('span');
    line.className = 'cs-find-line';
    line.appendChild(csfMakeChip(entry, text));
    return line;
}
function csfMatches() {
    const q = ((document.getElementById('cs-find-search') || {}).value || '').trim().toLowerCase();
    const words = q ? q.split(/\s+/) : [];
    return csfEntries().filter(function (e) {
        if (cscFindSrc === 'fav') { if (!csfIsFav(e)) return false; }
        else if (cscFindSrc !== 'all' && e.srcs.indexOf(cscFindSrc) === -1) return false;
        for (let i = 0; i < words.length; i++) if (e.search.indexOf(words[i]) === -1) return false;
        return true;
    });
}
function csfRenderGrid() {
    const grid = document.getElementById('cs-find-grid');
    if (!grid) return;
    const hits = csfMatches();
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    hits.slice(0, cscFindShown).forEach(function (e) {
        const tile = document.createElement('div');
        tile.className = 'us-tile cs-tile' + (e.key === cscFindSel ? ' active' : '');
        tile.setAttribute('data-csf-key', e.key);
        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'us-tile-pick';
        pick.title = e.name + ' · ' + e.where.join(' · ');
        pick.setAttribute('aria-pressed', e.key === cscFindSel ? 'true' : 'false');
        const stage = document.createElement('span');
        stage.className = 'us-tile-stage';
        stage.appendChild(csfPreviewLine(e, 'Text'));
        const nm = document.createElement('span');
        nm.className = 'us-tile-name';
        nm.textContent = e.name;
        const fm = document.createElement('span');
        fm.className = 'us-tile-fam';
        fm.textContent = e.where[0] + (e.where.length > 1 ? ' +' + (e.where.length - 1) : '');
        pick.appendChild(stage);
        pick.appendChild(nm);
        pick.appendChild(fm);
        tile.appendChild(pick);
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'us-fav cs-fav';
        csfPaintStar(star, e, false);
        tile.appendChild(star);
        frag.appendChild(tile);
    });
    grid.appendChild(frag);
    const cnt = document.getElementById('cs-find-count');
    if (cnt) cnt.textContent = hits.length + (hits.length === 1 ? ' style' : ' styles');
    const empty = document.getElementById('cs-find-empty');
    if (empty) {
        empty.hidden = hits.length > 0;
        empty.textContent = cscFindSrc === 'fav' && !csfLoadFavs().length ? 'No favorites yet! Tap the ☆ on any style to keep it here!' : 'No styles match that search!';
    }
    const more = document.getElementById('cs-find-more');
    if (more) {
        more.hidden = hits.length <= cscFindShown;
        more.textContent = 'Show more (' + (hits.length - Math.min(hits.length, cscFindShown)) + ' left)';
    }
}
function csfRenderView() {
    const view = document.getElementById('cs-find-view');
    if (!view) return;
    const e = cscFindSel ? csfFind(cscFindSel) : null;
    view.hidden = !e;
    if (!e) return;
    const stage = document.getElementById('cs-find-stage');
    if (stage) {
        stage.innerHTML = '';
        stage.appendChild(csfPreviewLine(e, cscPreviewText()));
    }
    const nm = document.getElementById('cs-find-name');
    if (nm) nm.textContent = e.name;
    const big = document.getElementById('cs-find-star');
    if (big) csfPaintStar(big, e, true);
    const meta = document.getElementById('cs-find-meta');
    if (meta) meta.textContent = e.where.join(' · ') + (e.trigger ? ' · Keydown: ' + e.trigger : '') + ' · class="' + e.cls + '"';
    const pre = document.getElementById('cs-find-css');
    if (pre) {
        const st = csfStyleOf(e);
        pre.textContent = st.full.length ? st.full.join('\n\n') : '/* No CSS rules found for this style! */';
        pre.scrollTop = 0;
    }
}
function cscFindBuild() {
    csfLoadSources(function () { csfRenderView(); cscRefreshPreview(); });
    const src = document.getElementById('cs-find-src');
    if (src && !src.options.length) {
        CSF_SOURCES.forEach(function (s) {
            const o = document.createElement('option');
            o.value = s[0];
            o.textContent = s[1];
            src.appendChild(o);
        });
    }
    if (src) src.value = cscFindSrc;
    csfRenderGrid();
    csfRenderView();
}
// Find Styles -> My CSS: the chip-ready lines, plus a note about anything left out!
function csfFlatCode(e) {
    const st = csfStyleOf(e);
    let head = '/* Started from ' + e.name + ' (' + e.where[0] + ')! */\n';
    if (st.skipped) head += '/* Heads up: ' + st.skipped + (st.skipped === 1 ? ' rule' : ' rules') + ' (hover, @media or page-scoped parts) can\'t live on one chip, so ' + (st.skipped === 1 ? 'it\'s' : 'they\'re') + ' left out! Find Styles shows the full CSS! */\n';
    let code = head + st.flat.join('\n') + '\n';
    ['before', 'after'].forEach(function (w) {
        if (st[w].length) code += '\n::' + w + ' {\n' + st[w].map(function (d) { return '  ' + d; }).join('\n') + '\n}\n';
    });
    return code;
}
// MY CSS COLORS: every color in the code gets an underline in its own color, and clicking
// one opens an HSV picker (like the Uni-Chip's) that rewrites that color as you drag!
var CSC_COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\([^()]*\)/gi;
var cscPick = null; // the color being edited: { start, end, fmt, h, s, v, a }
function cscColorTokens(text) {
    const out = [];
    CSC_COLOR_RE.lastIndex = 0;
    let m;
    while ((m = CSC_COLOR_RE.exec(text))) {
        let ok = false;
        try { ok = CSS.supports('color', m[0]); } catch (e) { ok = false; }
        if (ok) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
    return out;
}
function cscEscHtml(str) {
    return str.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}
// The editor grows to fit its text, so the box around it does all the scrolling!
function cscFitCode() {
    const box = document.getElementById('cs-code');
    const wrap = document.getElementById('cs-code-wrap');
    if (!box || !wrap || !box.offsetParent) return;
    const keep = wrap.scrollTop;
    box.style.height = 'auto';
    box.style.height = box.scrollHeight + 'px';
    wrap.scrollTop = keep;
}
// Redraws the underline copy behind the editor (same text, so it lines up letter for letter)!
function cscRenderColors() {
    const box = document.getElementById('cs-code');
    const hl = document.getElementById('cs-code-hl');
    if (!box || !hl) return;
    cscFitCode();
    const text = box.value;
    let html = '';
    let at = 0;
    cscColorTokens(text).forEach(function (t) {
        const on = cscPick && cscPick.start === t.start ? ' on' : '';
        html += cscEscHtml(text.slice(at, t.start)) + '<span class="cs-col' + on + '" data-cs-col="' + t.start + '" style="--c: ' + cscEscHtml(t.text) + '">' + cscEscHtml(t.text) + '</span>';
        at = t.end;
    });
    // The extra line keeps the copy as tall as the editor when the code ends in a newline!
    hl.innerHTML = html + cscEscHtml(text.slice(at)) + '\n ';
}
// Any CSS color -> { r, g, b, a }, letting the browser do the parsing!
function cscColorRgba(str) {
    if (!cscColorRgba._ctx) cscColorRgba._ctx = document.createElement('canvas').getContext('2d');
    const ctx = cscColorRgba._ctx;
    if (!ctx) return null;
    ctx.fillStyle = '#000000';
    ctx.fillStyle = str;
    const v = String(ctx.fillStyle);
    if (v[0] === '#') return uniParseHex(v);
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const n = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
}
function cscPlacePick() {
    const pick = document.getElementById('cs-pick');
    const outer = pick && pick.parentElement;
    // The color is either underlined in My CSS or a color button in Interactive!
    const span = cscPick && (cscPick.anchor || document.querySelector('#cs-code-hl [data-cs-col="' + cscPick.start + '"]'));
    if (!pick || !outer || !span) return;
    if (!span.isConnected) { cscClosePick(); return; }
    const r = span.getBoundingClientRect();
    const w = outer.getBoundingClientRect();
    // Its color scrolled out of sight: close instead of floating next to nothing!
    const view = document.getElementById(cscPick.anchor ? 'csi-list' : 'cs-code-wrap').getBoundingClientRect();
    if (r.bottom < view.top || r.top > view.bottom) { cscClosePick(); return; }
    const left = Math.max(4, Math.min(r.left - w.left, outer.clientWidth - pick.offsetWidth - 4));
    // Below the color, unless that would hang far past the editor: then above it!
    let top = r.bottom - w.top + 6;
    if (top + pick.offsetHeight > w.height + 60 && r.top - w.top - pick.offsetHeight - 6 >= -60) top = r.top - w.top - pick.offsetHeight - 6;
    pick.style.left = left + 'px';
    pick.style.top = top + 'px';
}
// Sliders, labels, swatch and hex box all follow the picked color!
function cscPaintPick(fromHex) {
    if (!cscPick) return;
    const set = function (id, v) { const el = document.getElementById(id); if (el) el.value = v; };
    const txt = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('cs-pick-h', cscPick.h); set('cs-pick-s', cscPick.s); set('cs-pick-v', cscPick.v); set('cs-pick-a', cscPick.a);
    txt('cs-pick-h-val', Math.round(cscPick.h)); txt('cs-pick-s-val', Math.round(cscPick.s));
    txt('cs-pick-v-val', Math.round(cscPick.v)); txt('cs-pick-a-val', Math.round(cscPick.a));
    const h = cscPick.h, sat = cscPick.s, val = cscPick.v;
    const css = function (c, a) { return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a === undefined ? 1 : a) + ')'; };
    const grad = function (a, b, c) { return 'linear-gradient(to right, ' + a + ' 0%, ' + b + ' 50%, ' + c + ' 100%)'; };
    const el = function (id) { return document.getElementById(id); };
    if (el('cs-pick-h')) el('cs-pick-h').style.background = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';
    if (el('cs-pick-s')) el('cs-pick-s').style.background = grad(css(uniHsvToRgb(h, 0, val / 100)), css(uniHsvToRgb(h, 0.5, val / 100)), css(uniHsvToRgb(h, 1, val / 100)));
    if (el('cs-pick-v')) el('cs-pick-v').style.background = grad(css(uniHsvToRgb(h, sat / 100, 0)), css(uniHsvToRgb(h, sat / 100, 0.5)), css(uniHsvToRgb(h, sat / 100, 1)));
    const rgb = uniHsvToRgb(h, sat / 100, val / 100);
    if (el('cs-pick-a')) el('cs-pick-a').style.background = 'linear-gradient(to right, ' + css(rgb, 0) + ' 0%, ' + css(rgb, 1) + ' 100%)';
    const sw = el('cs-pick-swatch');
    if (sw) sw.style.backgroundColor = css(rgb, Math.round(cscPick.a) / 100);
    const hex = el('cs-pick-hex');
    if (hex && !fromHex && document.activeElement !== hex) hex.value = uniRgbaToHex8(rgb.r, rgb.g, rgb.b, cscPick.a / 100);
}
// Writes the picked color back into the code, in the same format it was written in!
function cscApplyPick(fromHex) {
    const box = document.getElementById('cs-code');
    if (!cscPick || !box) return;
    const rgb = uniHsvToRgb(cscPick.h, cscPick.s / 100, cscPick.v / 100);
    const a = Math.round(cscPick.a) / 100;
    const str = cscPick.fmt === 'hex' ? (a < 1 ? uniRgbaToHex8(rgb.r, rgb.g, rgb.b, a) : uniRgbToHex(rgb.r, rgb.g, rgb.b)) : uniCss(cscPick.h, cscPick.s, cscPick.v, cscPick.a);
    const scroll = box.scrollTop;
    box.setRangeText(str, cscPick.start, cscPick.end, 'preserve');
    box.scrollTop = scroll;
    cscPick.end = cscPick.start + str.length;
    cscCode = box.value;
    cscSavePrefs();
    cscRefreshCode();
    cscRefreshPreview();
    cscPaintPick(fromHex);
    cscPlacePick();
}
function cscOpenPick(tok, anchor) {
    const c = cscColorRgba(tok.text);
    const pick = document.getElementById('cs-pick');
    if (!c || !pick) return;
    const hsv = uniRgbToHsv(c.r, c.g, c.b);
    cscPick = { start: tok.start, end: tok.end, fmt: tok.text[0] === '#' ? 'hex' : 'rgb', h: hsv.h, s: hsv.s * 100, v: hsv.v * 100, a: c.a * 100, anchor: anchor || null };
    // One picker for both tabs: it moves next to whichever editor opened it!
    const host = anchor ? anchor.closest('.csi-box') : document.getElementById('cs-code-box');
    if (host && pick.parentElement !== host) host.appendChild(pick);
    pick.hidden = false;
    cscRenderColors();
    cscPaintPick(false);
    cscPlacePick();
    try { if (typeof playAeroClickSound === 'function') playAeroClickSound(760, 0.05); } catch (e) {}
}
function cscClosePick() {
    const pick = document.getElementById('cs-pick');
    if (pick) pick.hidden = true;
    if (!cscPick) return;
    cscPick = null;
    cscRenderColors();
}
function cscWirePick() {
    const on = function (id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    const box = document.getElementById('cs-code');
    on('cs-code', 'click', function () {
        if (this.selectionStart !== this.selectionEnd) return;
        const pos = this.selectionStart;
        const tok = cscColorTokens(this.value).filter(function (t) { return pos >= t.start && pos <= t.end; })[0];
        if (tok) cscOpenPick(tok); else cscClosePick();
    });
    // The picker follows its color when the box scrolls!
    on('cs-code-wrap', 'scroll', cscPlacePick);
    // A wider or narrower editor re-wraps the text, so it needs a new height!
    try {
        const wrap = document.getElementById('cs-code-wrap');
        let lastW = 0;
        if (wrap) new ResizeObserver(function () {
            if (wrap.clientWidth === lastW) return;
            lastW = wrap.clientWidth;
            cscFitCode();
            cscPlacePick();
        }).observe(wrap);
    } catch (e) {}
    ['h', 's', 'v', 'a'].forEach(function (k) {
        on('cs-pick-' + k, 'input', function () {
            if (!cscPick) return;
            cscPick[k] = parseFloat(this.value) || 0;
            cscApplyPick(false);
        });
    });
    on('cs-pick-hex', 'input', function () {
        const p = uniParseHex(this.value);
        if (!cscPick || !p) return;
        const hsv = uniRgbToHsv(p.r, p.g, p.b);
        // Gray has no hue: keep the old one so the H slider doesn't jump!
        if (hsv.s > 0) cscPick.h = hsv.h;
        cscPick.s = hsv.s * 100;
        cscPick.v = hsv.v * 100;
        cscPick.a = p.a * 100;
        cscApplyPick(true);
    });
    on('cs-pick-done', 'click', function () {
        cscClosePick();
        if (box) box.focus();
    });
    on('cs-pick', 'keydown', function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cscClosePick(); if (box) box.focus(); }
    });
    // Escape closes the picker first (not the whole Custom CSS window)!
    const dlg = document.getElementById('customcss-dialog');
    if (dlg) {
        dlg.addEventListener('cancel', function (ev) { if (cscPick) { ev.preventDefault(); cscClosePick(); } });
        dlg.addEventListener('close', cscClosePick);
        dlg.addEventListener('mousedown', function (ev) {
            if (!cscPick) return;
            const t = ev.target;
            if (t.closest && (t.closest('#cs-pick') || t.closest('#cs-code') || t.closest('.csi-color'))) return;
            cscClosePick();
        });
    }
}
// INTERACTIVE: your My CSS code as an outline! Every line is a row with a friendly label,
// colors are color buttons (the same HSV picker), numbers are number boxes, and both tabs
// edit the very same code, so they always match!
var CSI_NAMES = {
    background: 'Background', 'background-color': 'Background color', 'background-image': 'Background image',
    color: 'Text color', border: 'Border', 'border-color': 'Border color', 'border-width': 'Border width',
    'border-radius': 'Roundness', 'box-shadow': 'Shadow', 'text-shadow': 'Text shadow', 'font-weight': 'Weight',
    'font-family': 'Font', 'font-size': 'Text size', 'font-style': 'Font style', 'letter-spacing': 'Letter spacing',
    'text-transform': 'Letters', 'text-decoration': 'Line', padding: 'Padding', margin: 'Margin',
    animation: 'Animation', opacity: 'See-through', content: 'Content', outline: 'Outline', transform: 'Transform'
};
var CSI_NUM_RE = /(^|[\s(,\/])(-?(?:\d+\.?\d*|\.\d+))(px|em|rem|%|deg|turn|s|ms|vh|vw|ch|ex|fr)?(?=$|[\s),\/])/g;
var csiState = { sig: '', pieces: [], decls: [] };
function csiLabel(prop) {
    if (CSI_NAMES[prop]) return CSI_NAMES[prop];
    if (prop.indexOf('--') === 0) return 'Variable ' + prop;
    const t = prop.replace(/^-(webkit|moz)-/, '').replace(/-/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
}
// My CSS -> sections (the chip, ::before, ::after) of declarations, each with its exact place in the code!
function csiParse(code) {
    const main = { name: '', decls: [] };
    const sections = [main];
    let cur = main, start = 0, depth = 0, i = 0;
    const flush = function (end) {
        const raw = code.slice(start, end);
        const text = raw.trim();
        if (!text) return;
        const s0 = start + (raw.length - raw.replace(/^\s+/, '').length);
        const m = text.match(/^([-a-zA-Z]+)(\s*:\s*)([\s\S]*)$/);
        if (!m) { cur.decls.push({ bad: true, text: text, start: s0, end: s0 + text.length }); return; }
        const value = m[3];
        const vStart = s0 + m[1].length + m[2].length;
        cur.decls.push({ prop: m[1].toLowerCase(), value: value, vStart: vStart, vEnd: vStart + value.length, start: s0, end: s0 + text.length });
    };
    while (i < code.length) {
        const c = code[i];
        if (c === '/' && code[i + 1] === '*') {
            flush(i);
            const e = code.indexOf('*/', i + 2);
            i = e === -1 ? code.length : e + 2;
            start = i;
            continue;
        }
        if (c === '"' || c === "'") {
            let j = i + 1;
            while (j < code.length && code[j] !== c) { if (code[j] === '\\') j++; j++; }
            i = j + 1;
            continue;
        }
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (depth <= 0 && c === ';') { flush(i); start = i + 1; }
        else if (depth <= 0 && c === '{') {
            // Only the last line names the block: anything above it is its own (unfinished) line!
            const nl = code.slice(start, i).replace(/\s+$/, '').lastIndexOf('\n');
            if (nl !== -1) { flush(start + nl); start += nl + 1; }
            const head = code.slice(start, i).trim().replace(/^&\s*/, '');
            const m = head.match(/^::?(before|after)$/i);
            cur = { name: m ? '::' + m[1].toLowerCase() : head, decls: [] };
            sections.push(cur);
            start = i + 1;
        } else if (depth <= 0 && c === '}') { flush(i); cur = main; start = i + 1; }
        i++;
    }
    flush(code.length);
    return sections;
}
// Dropdowns for properties that take one word (and border styles inside border/outline)!
var CSI_BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'hidden'];
var CSI_KEYWORDS = {
    display: ['inline', 'inline-block', 'inline-flex', 'inline-grid', 'block', 'flex', 'grid', 'contents', 'none'],
    position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'vertical-align': ['baseline', 'middle', 'top', 'bottom', 'text-top', 'text-bottom', 'sub', 'super'],
    'font-weight': ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold', 'lighter', 'bolder'],
    'font-style': ['normal', 'italic', 'oblique'],
    'font-variant': ['normal', 'small-caps'],
    'text-transform': ['none', 'uppercase', 'lowercase', 'capitalize'],
    'text-align': ['left', 'center', 'right', 'justify', 'start', 'end'],
    'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
    overflow: ['visible', 'hidden', 'clip', 'scroll', 'auto'],
    'box-sizing': ['content-box', 'border-box'],
    'pointer-events': ['auto', 'none'],
    visibility: ['visible', 'hidden', 'collapse'],
    cursor: ['auto', 'default', 'pointer', 'text', 'move', 'grab', 'help', 'not-allowed'],
    'text-decoration-style': ['solid', 'double', 'dotted', 'dashed', 'wavy'],
    'background-repeat': ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round'],
    'background-clip': ['border-box', 'padding-box', 'content-box', 'text'],
    'mix-blend-mode': ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'],
    isolation: ['auto', 'isolate']
};
var CSI_WIDE = ['inherit', 'initial', 'unset'];
// Values that stack layers with commas: each layer gets its own line!
var CSI_LAYERED = ['background', 'background-image', 'box-shadow', 'text-shadow', 'transition', 'animation', 'mask', 'mask-image', '-webkit-mask', '-webkit-mask-image'];
var CSI_GRAD_RE = /(?:repeating-)?(?:linear|radial|conic)-gradient\($/i;
function csiKeywordList(prop) {
    if (CSI_KEYWORDS[prop]) return CSI_KEYWORDS[prop];
    if (/^(border(-(top|right|bottom|left))?|outline)-style$/.test(prop)) return CSI_BORDER_STYLES;
    return null;
}
// Splits at top-level commas, skipping ( ) groups and quotes: [{ start, end }]!
function csiTopSplit(str) {
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === '"' || c === "'") { const j = str.indexOf(c, i + 1); i = j === -1 ? str.length : j; continue; }
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) { out.push({ start: start, end: i }); start = i + 1; }
    }
    out.push({ start: start, end: str.length });
    return out;
}
// Colors, numbers, border-style words and the plain text between them!
function csiFlat(str, off, prop) {
    // Functions first (outermost only): var() becomes a pill, other effects a green box!
    const marks = csiFuncs(str, off, prop);
    cscColorTokens(str).forEach(function (t) {
        if (!marks.some(function (c) { return t.start < c.end && t.end > c.start; })) marks.push({ type: 'color', start: t.start, end: t.end, text: t.text });
    });
    const clash = function (st, en) { return marks.some(function (c) { return st < c.end && en > c.start; }); };
    let m;
    CSI_NUM_RE.lastIndex = 0;
    while ((m = CSI_NUM_RE.exec(str))) {
        const st = m.index + m[1].length;
        const en = st + m[2].length + (m[3] || '').length;
        if (!clash(st, en)) marks.push({ type: 'num', start: st, end: en, num: m[2], unit: m[3] || '' });
        CSI_NUM_RE.lastIndex = en;
    }
    if (/^(border(-(top|right|bottom|left))?|outline)$/.test(prop)) {
        const re = new RegExp('(^|\\s)(' + CSI_BORDER_STYLES.join('|') + ')(?=\\s|$)', 'g');
        while ((m = re.exec(str))) {
            const st = m.index + m[1].length, en = st + m[2].length;
            if (!clash(st, en)) marks.push({ type: 'kw', start: st, end: en, text: m[2], opts: CSI_BORDER_STYLES });
        }
    }
    marks.sort(function (a, b) { return a.start - b.start; });
    const out = [];
    let at = 0;
    marks.forEach(function (p) {
        if (p.start > at) out.push({ type: 'text', start: at, end: p.start, text: str.slice(at, p.start) });
        out.push(p);
        at = p.end;
    });
    if (at < str.length) out.push({ type: 'text', start: at, end: str.length, text: str.slice(at) });
    out.forEach(function (p) { p.start += off; p.end += off; });
    return out;
}
// rgb()/hsl() colors stay color buttons; everything else that's a function gets grouped!
var CSI_COLOR_FUNCS = ['rgb', 'rgba', 'hsl', 'hsla'];
var CSI_FUNC_NAMES = { 'color-mix': 'Color mix', calc: 'Calc', min: 'Min', max: 'Max', clamp: 'Clamp', 'drop-shadow': 'Drop shadow', url: 'Image link', 'cubic-bezier': 'Easing curve', steps: 'Steps' };
// Finds the outermost functions in a string: { type: 'var' | 'func', start, end (relative), ... }!
function csiFuncs(str, off, prop) {
    const out = [];
    let i = 0;
    while (i < str.length) {
        const c = str[i];
        if (c === '"' || c === "'") { const q = str.indexOf(c, i + 1); i = q === -1 ? str.length : q + 1; continue; }
        if (c !== '(') { i++; continue; }
        let depth = 0, j = i;
        for (; j < str.length; j++) {
            if (str[j] === '(') depth++;
            else if (str[j] === ')' && --depth === 0) break;
        }
        const nm = str.slice(0, i).match(/([a-zA-Z][\w-]*)$/);
        const end = Math.min(j + 1, str.length);
        if (!nm) { i = end; continue; }
        const name = nm[1].toLowerCase();
        const start = i - nm[1].length;
        const text = str.slice(start, end);
        const inner = str.slice(i + 1, j);
        let isColor = false;
        try { isColor = CSI_COLOR_FUNCS.indexOf(name) !== -1 && CSS.supports('color', text); } catch (e) { isColor = false; }
        if (isColor) { i = end; continue; }
        if (name === 'var') {
            const vm = inner.match(/^(\s*)(--[\w-]+)\s*(,\s*)?/);
            if (vm) {
                const vnStart = off + i + 1 + vm[1].length;
                const fbAt = vm[3] ? vm[0].length : -1;
                out.push({
                    type: 'var', start: start, end: end, vname: vm[2], vnStart: vnStart, vnEnd: vnStart + vm[2].length,
                    fb: fbAt === -1 ? [] : csiFlat(inner.slice(fbAt), off + i + 1 + fbAt, prop)
                });
                i = end;
                continue;
            }
        }
        out.push({ type: 'func', name: name, start: start, end: end, inner: csiFlat(inner, off + i + 1, prop) });
        i = end;
    }
    return out;
}
// One layer of a value -> its pieces, with every gradient as a group of its own parts!
function csiLayer(str, off, prop) {
    const out = [];
    let at = 0, i = 0;
    while (i < str.length) {
        if (str[i] === '(' && CSI_GRAD_RE.test(str.slice(0, i + 1))) {
            const nameStart = str.slice(0, i + 1).search(CSI_GRAD_RE);
            let depth = 0, j = i;
            for (; j < str.length; j++) {
                if (str[j] === '(') depth++;
                else if (str[j] === ')' && --depth === 0) break;
            }
            if (nameStart > at) csiFlat(str.slice(at, nameStart), off + at, prop).forEach(function (p) { out.push(p); });
            const inner = str.slice(i + 1, j);
            const name = str.slice(nameStart, i).toLowerCase();
            const args = csiTopSplit(inner).map(function (r) {
                const raw = inner.slice(r.start, r.end);
                const lead = raw.length - raw.replace(/^\s+/, '').length;
                return csiFlat(raw.trim(), off + i + 1 + r.start + lead, prop);
            });
            out.push({ type: 'grad', name: name, start: off + nameStart, end: off + Math.min(j + 1, str.length), args: args });
            at = i = Math.min(j + 1, str.length);
            continue;
        }
        i++;
    }
    if (at < str.length) csiFlat(str.slice(at), off + at, prop).forEach(function (p) { out.push(p); });
    return out;
}
// A whole value -> pieces: a dropdown for one-word properties, otherwise layers of pieces!
function csiPieces(value, base, prop) {
    const imp = value.match(/\s*!\s*important\s*$/i);
    const core = imp ? value.slice(0, imp.index) : value;
    const tail = imp ? [{ type: 'text', start: base + imp.index, end: base + value.length, text: imp[0] }] : [];
    const opts = csiKeywordList(prop);
    if (opts && /^\s*[\w-]+\s*$/.test(core)) {
        const lead = core.length - core.replace(/^\s+/, '').length;
        const word = core.trim();
        return [{ type: 'kw', start: base + lead, end: base + lead + word.length, text: word, opts: opts }].concat(tail);
    }
    const layered = CSI_LAYERED.indexOf(prop) !== -1 || /gradient\(/i.test(core);
    const ranges = layered ? csiTopSplit(core) : [{ start: 0, end: core.length }];
    const out = [];
    ranges.forEach(function (r, k) {
        if (k) out.push({ type: 'break', start: base + r.start - 1, end: base + r.start });
        const raw = core.slice(r.start, r.end);
        const lead = raw.length - raw.replace(/^\s+/, '').length;
        csiLayer(raw.trim(), base + r.start + lead, prop).forEach(function (p) { out.push(p); });
    });
    return out.concat(tail);
}
// Writes new code everywhere: My CSS, Interactive, the preview and your saved prefs!
function csiCommit(code) {
    cscCode = code;
    cscSavePrefs();
    cscRefreshCode();
    cscRefreshPreview();
}
function csiStep(num) {
    const d = (num.split('.')[1] || '').length;
    return d ? Math.max(0.01, Math.pow(10, -d)) : 1;
}
var CSI_GRAD_NAMES = { 'linear-gradient': 'Linear gradient', 'radial-gradient': 'Radial gradient', 'conic-gradient': 'Conic gradient', 'repeating-linear-gradient': 'Repeating linear gradient', 'repeating-radial-gradient': 'Repeating radial gradient', 'repeating-conic-gradient': 'Repeating conic gradient' };
// Walks pieces (inside gradients too) in order, so every editable one gets a number!
function csiEach(pieces, fn) {
    pieces.forEach(function (p) {
        if (p.type === 'grad') p.args.forEach(function (a) { csiEach(a, fn); });
        if (p.type === 'func') csiEach(p.inner, fn);
        if (p.type === 'var') csiEach(p.fb, fn);
        fn(p);
    });
}
function csiBuildPiece(p, ids) {
    if (p.type === 'color') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'csi-color';
        b.setAttribute('data-csi-p', String(ids.get(p)));
        const sw = document.createElement('span');
        sw.className = 'csi-swatch';
        const nm = document.createElement('span');
        nm.className = 'csi-color-name';
        b.appendChild(sw);
        b.appendChild(nm);
        csiPaintColor(b, p);
        return b;
    }
    if (p.type === 'num') {
        const w = document.createElement('span');
        w.className = 'csi-num';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'csi-num-in';
        inp.setAttribute('data-csi-p', String(ids.get(p)));
        inp.value = p.num;
        inp.step = String(csiStep(p.num));
        inp.style.width = Math.max(3, p.num.length + 1.5) + 'ch';
        inp.title = 'Type a number, or use ↑ and ↓';
        inp.setAttribute('aria-label', 'Number' + (p.unit ? ' in ' + p.unit : ''));
        w.appendChild(inp);
        if (p.unit) {
            const u = document.createElement('span');
            u.className = 'csi-unit';
            u.textContent = p.unit;
            w.appendChild(u);
        }
        return w;
    }
    if (p.type === 'kw') {
        const sel = document.createElement('select');
        sel.className = 'csi-kw';
        sel.setAttribute('data-csi-p', String(ids.get(p)));
        sel.setAttribute('aria-label', 'Choose a value');
        const opts = p.opts.concat(CSI_WIDE);
        if (opts.indexOf(p.text) === -1) opts.unshift(p.text);
        opts.forEach(function (o) {
            const op = document.createElement('option');
            op.value = o;
            op.textContent = o;
            sel.appendChild(op);
        });
        sel.value = p.text;
        return sel;
    }
    if (p.type === 'var') {
        // var(): a Tag Pill that opens a menu of the variables this CSS defines!
        const w = document.createElement('span');
        w.className = 'csi-var-wrap';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'csi-var';
        b.setAttribute('data-csi-p', String(ids.get(p)));
        b.textContent = p.vname + ' ▾';
        b.title = 'Variable ' + p.vname + ': click to pick another one';
        b.setAttribute('aria-haspopup', 'listbox');
        w.appendChild(b);
        if (p.fb.length) {
            const or = document.createElement('span');
            or.className = 'csi-text csi-var-or';
            or.textContent = ' or ';
            w.appendChild(or);
            p.fb.forEach(function (q) { w.appendChild(csiBuildPiece(q, ids)); });
        }
        return w;
    }
    if (p.type === 'func') {
        // Color mixes and other effects: a green tinted box with a friendly name!
        const box = document.createElement('span');
        box.className = 'csi-func';
        const nm = document.createElement('span');
        nm.className = 'csi-func-name';
        nm.textContent = CSI_FUNC_NAMES[p.name] || (p.name.charAt(0).toUpperCase() + p.name.slice(1)).replace(/-/g, ' ');
        nm.title = p.name + '()';
        box.appendChild(nm);
        const sw = document.createElement('span');
        sw.className = 'csi-swatch csi-func-swatch';
        sw.setAttribute('data-csi-f', String(ids.get(p)));
        box.appendChild(sw);
        p.inner.forEach(function (q) { box.appendChild(csiBuildPiece(q, ids)); });
        csiPaintFunc(sw, p);
        return box;
    }
    if (p.type === 'break') {
        const br = document.createElement('span');
        br.className = 'csi-break';
        return br;
    }
    if (p.type === 'grad') {
        // A gradient gets its own tinted box: its kind, a preview, and each part as a pill!
        const box = document.createElement('span');
        box.className = 'csi-grad';
        const head = document.createElement('span');
        head.className = 'csi-grad-head';
        const nm = document.createElement('span');
        nm.className = 'csi-grad-name';
        nm.textContent = CSI_GRAD_NAMES[p.name] || p.name;
        const prev = document.createElement('span');
        prev.className = 'csi-grad-preview';
        prev.setAttribute('data-csi-g', String(ids.get(p)));
        head.appendChild(nm);
        head.appendChild(prev);
        box.appendChild(head);
        const args = document.createElement('span');
        args.className = 'csi-grad-args';
        p.args.forEach(function (a) {
            if (!a.length) return;
            const arg = document.createElement('span');
            arg.className = 'csi-grad-arg';
            a.forEach(function (q) { arg.appendChild(csiBuildPiece(q, ids)); });
            args.appendChild(arg);
        });
        box.appendChild(args);
        csiPaintGrad(prev, p);
        return box;
    }
    const t = document.createElement('span');
    t.className = 'csi-text';
    t.textContent = p.text;
    return t;
}
// A function that makes a color (like a color mix of plain colors) shows that color!
function csiPaintFunc(el, p) {
    const text = cscCode.slice(p.start, p.end);
    let ok = false;
    try { ok = !/var\(/i.test(text) && CSS.supports('color', text); } catch (e) { ok = false; }
    el.hidden = !ok;
    if (ok) el.style.setProperty('--c', text);
}
// The variables this CSS defines (in any section), for the var() menu!
function csiVariables() {
    const seen = {};
    const out = [];
    csiParse(cscCode).forEach(function (sec) {
        sec.decls.forEach(function (d) {
            if (d.bad || d.prop.indexOf('--') !== 0 || seen[d.prop]) return;
            seen[d.prop] = true;
            out.push({ name: d.prop, value: d.value.trim() });
        });
    });
    return out;
}
function csiCloseVarMenu() {
    const menu = document.getElementById('csi-varmenu');
    if (menu) menu.remove();
}
function csiOpenVarMenu(btn, p) {
    csiCloseVarMenu();
    cscClosePick();
    const host = btn.closest('.csi-box');
    if (!host) return;
    const menu = document.createElement('div');
    menu.id = 'csi-varmenu';
    menu.className = 'csi-varmenu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Pick a variable');
    const vars = csiVariables();
    if (!vars.length) {
        const none = document.createElement('p');
        none.className = 'csi-varmenu-empty';
        none.textContent = 'No variables here yet! Add one in My CSS, like --a: #ff0000;';
        menu.appendChild(none);
    }
    vars.forEach(function (v) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'csi-varmenu-item' + (v.name === p.vname ? ' on' : '');
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', v.name === p.vname ? 'true' : 'false');
        const sw = document.createElement('span');
        sw.className = 'csi-swatch';
        let isColor = false;
        try { isColor = CSS.supports('color', v.value); } catch (e) {}
        if (isColor) sw.style.setProperty('--c', v.value); else sw.classList.add('csi-swatch-none');
        const nm = document.createElement('span');
        nm.className = 'csi-varmenu-name';
        nm.textContent = v.name;
        const val = document.createElement('span');
        val.className = 'csi-varmenu-val';
        val.textContent = v.value;
        item.appendChild(sw);
        item.appendChild(nm);
        item.appendChild(val);
        item.addEventListener('click', function () {
            csiCloseVarMenu();
            if (v.name !== p.vname) csiCommit(cscCode.slice(0, p.vnStart) + v.name + cscCode.slice(p.vnEnd));
        });
        menu.appendChild(item);
    });
    host.appendChild(menu);
    const r = btn.getBoundingClientRect();
    const w = host.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(r.left - w.left, host.clientWidth - menu.offsetWidth - 4)) + 'px';
    menu.style.top = (r.bottom - w.top + 4) + 'px';
    const first = menu.querySelector('.csi-varmenu-item.on') || menu.querySelector('.csi-varmenu-item');
    if (first) first.focus();
    menu.addEventListener('keydown', function (ev) {
        const items = Array.from(menu.querySelectorAll('.csi-varmenu-item'));
        const at = items.indexOf(document.activeElement);
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); csiCloseVarMenu(); btn.focus(); }
        else if (ev.key === 'ArrowDown' && items.length) { ev.preventDefault(); items[(at + 1) % items.length].focus(); }
        else if (ev.key === 'ArrowUp' && items.length) { ev.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
    });
}
// The preview strip shows the real gradient (unless it uses var(), which only the chip knows)!
function csiPaintGrad(el, p) {
    const text = cscCode.slice(p.start, p.end);
    let ok = false;
    try { ok = !/var\(/i.test(text) && CSS.supports('background-image', text); } catch (e) { ok = false; }
    el.style.backgroundImage = ok ? text : '';
    el.classList.toggle('csi-grad-novar', !ok);
    el.title = ok ? '' : 'Uses var(), so the preview is on the chip below!';
}
function csiPaintColor(btn, p) {
    btn.style.setProperty('--c', p.text);
    btn.querySelector('.csi-color-name').textContent = p.text;
    btn.title = 'Change ' + p.text;
    btn.setAttribute('aria-label', 'Color ' + p.text + ': click to change it');
}
// Rebuilds the outline, or (when only values changed) just updates it in place, so a
// number box you're typing in keeps its focus!
function csiSync() {
    const list = document.getElementById('csi-list');
    if (!list) return;
    const sections = csiParse(cscCode);
    const pieces = [];
    const decls = [];
    const ids = new Map();
    const sigOf = function (arr) {
        return arr.map(function (p) {
            if (p.type === 'grad') return 'g' + p.name + '(' + p.args.map(sigOf).join('|') + ')';
            if (p.type === 'func') return 'f' + p.name + '(' + sigOf(p.inner) + ')';
            if (p.type === 'var') return 'v' + p.vname + '(' + sigOf(p.fb) + ')';
            return p.type === 'text' ? 't' + p.text : p.type[0];
        }).join(',');
    };
    let sig = '';
    sections.forEach(function (sec) {
        sig += '[' + sec.name + ']';
        sec.decls.forEach(function (d) {
            d.pieces = d.bad ? [] : csiPieces(d.value, d.vStart, d.prop);
            csiEach(d.pieces, function (p) { ids.set(p, pieces.length); pieces.push(p); });
            decls.push(d);
            sig += (d.bad ? '!' : d.prop) + ':' + sigOf(d.pieces) + ';';
        });
    });
    if (sig === csiState.sig && list.children.length) {
        // Same shape: just update values in place, so focus and dropdowns stay put!
        csiState.pieces = pieces;
        csiState.decls = decls;
        pieces.forEach(function (p, idx) {
            if (p.type === 'grad') {
                const g = list.querySelector('[data-csi-g="' + idx + '"]');
                if (g) csiPaintGrad(g, p);
                return;
            }
            if (p.type === 'func') {
                const f = list.querySelector('[data-csi-f="' + idx + '"]');
                if (f) csiPaintFunc(f, p);
                return;
            }
            const el = list.querySelector('[data-csi-p="' + idx + '"]');
            if (!el) return;
            if (p.type === 'color') csiPaintColor(el, p);
            else if ((p.type === 'num' || p.type === 'kw') && document.activeElement !== el) el.value = p.type === 'num' ? p.num : p.text;
        });
        csiCheckRows();
        return;
    }
    csiState = { sig: sig, pieces: pieces, decls: decls };
    if (cscPick && cscPick.anchor) cscClosePick();
    csiCloseVarMenu();
    list.innerHTML = '';
    let count = 0;
    sections.forEach(function (sec) {
        if (!sec.decls.length && !sec.name) return;
        if (sec.name) {
            const h = document.createElement('div');
            h.className = 'cs-ui-group csi-group';
            h.textContent = sec.name === '::before' || sec.name === '::after' ? sec.name + ' (an extra layer)' : sec.name;
            list.appendChild(h);
        }
        sec.decls.forEach(function (d) {
            const di = decls.indexOf(d);
            const row = document.createElement('div');
            row.className = 'csi-row';
            row.setAttribute('data-csi-d', String(di));
            const lab = document.createElement('span');
            lab.className = 'csi-label';
            lab.textContent = d.bad ? 'Not CSS yet' : csiLabel(d.prop) + ':';
            if (!d.bad) lab.title = d.prop;
            const val = document.createElement('span');
            val.className = 'csi-value';
            if (d.bad) {
                const t = document.createElement('span');
                t.className = 'csi-text';
                t.textContent = d.text;
                val.appendChild(t);
            } else {
                d.pieces.forEach(function (p) { val.appendChild(csiBuildPiece(p, ids)); });
            }
            const warn = document.createElement('span');
            warn.className = 'csi-warn';
            const tools = document.createElement('span');
            tools.className = 'csi-tools';
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'csi-btn';
            edit.setAttribute('data-csi-act', 'edit');
            edit.textContent = '✎';
            edit.title = 'Edit this line';
            edit.setAttribute('aria-label', 'Edit ' + (d.bad ? 'this line' : csiLabel(d.prop)));
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'csi-btn';
            del.setAttribute('data-csi-act', 'delete');
            del.textContent = '✕';
            del.title = 'Remove this line';
            del.setAttribute('aria-label', 'Remove ' + (d.bad ? 'this line' : csiLabel(d.prop)));
            tools.appendChild(warn);
            tools.appendChild(edit);
            tools.appendChild(del);
            row.appendChild(lab);
            row.appendChild(val);
            row.appendChild(tools);
            list.appendChild(row);
            count++;
        });
    });
    if (!count) {
        const empty = document.createElement('p');
        empty.className = 'cs-saved-empty';
        empty.textContent = 'Nothing here yet! Add a property below, or write some in My CSS!';
        list.appendChild(empty);
    }
    csiCheckRows();
}
// A ⚠ on any line the browser doesn't understand (same check as My CSS)!
function csiCheckRows() {
    csiState.decls.forEach(function (d, di) {
        const row = document.querySelector('#csi-list [data-csi-d="' + di + '"]');
        if (!row) return;
        const msg = d.bad ? cscCheckDecls(d.text, '').bad[0] : cscCheckDecls(d.prop + ': ' + d.value, '').bad[0];
        row.classList.toggle('bad', !!msg);
        const w = row.querySelector('.csi-warn');
        w.textContent = msg ? '⚠' : '';
        w.title = msg || '';
    });
}
// Removes a whole line (and its empty line) from the code!
function csiDelete(d) {
    const code = cscCode;
    let a = d.start;
    let b = code[d.end] === ';' ? d.end + 1 : d.end;
    const ls = code.lastIndexOf('\n', a - 1) + 1;
    let le = code.indexOf('\n', b);
    if (le === -1) le = code.length;
    if (!code.slice(ls, a).trim() && !code.slice(b, le).trim()) { a = ls; b = Math.min(code.length, le + 1); }
    csiCommit(code.slice(0, a) + code.slice(b));
}
// ✎ swaps a row's value for a text box: Enter keeps it, Escape cancels!
function csiEditRow(row, d) {
    const val = row.querySelector('.csi-value');
    if (!val || val.querySelector('.csi-raw')) return;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'unichip-text csi-raw';
    inp.spellcheck = false;
    inp.value = d.bad ? d.text : d.value;
    inp.setAttribute('aria-label', 'Edit ' + (d.bad ? 'this line' : csiLabel(d.prop)));
    val.innerHTML = '';
    val.appendChild(inp);
    inp.focus();
    inp.select();
    let done = false;
    const finish = function (keep) {
        if (done) return;
        done = true;
        if (keep) {
            const a = d.bad ? d.start : d.vStart;
            const b = d.bad ? d.end : d.vEnd;
            csiState.sig = '';
            csiCommit(cscCode.slice(0, a) + inp.value.replace(/[\r\n]+/g, ' ') + cscCode.slice(b));
        } else {
            csiState.sig = '';
            csiSync();
        }
    };
    inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); }
    });
    inp.addEventListener('blur', function () { finish(true); });
}
// "Add a property": the same starters as My CSS, added after the chip's last line!
function csiAdd(text) {
    const main = csiParse(cscCode)[0].decls;
    const code = cscCode;
    let at = 0;
    if (main.length) {
        const last = main[main.length - 1];
        at = code[last.end] === ';' ? last.end + 1 : last.end;
        if (code[last.end] !== ';') text = ';' + text;
    }
    const before = code.slice(0, at);
    const pad = before && !/\n\s*$/.test(before) ? '\n' : '';
    const after = code.slice(at);
    csiCommit(before + pad + text + (after && after[0] !== '\n' ? '\n' : '') + after);
}
function csiWire() {
    const list = document.getElementById('csi-list');
    const add = document.getElementById('csi-add');
    if (add && !add.options.length) {
        const first = document.createElement('option');
        first.value = '';
        first.textContent = '＋ Add a property…';
        add.appendChild(first);
        CSC_SNIPPETS.forEach(function (sn, i) {
            const o = document.createElement('option');
            o.value = String(i);
            o.textContent = sn[0];
            add.appendChild(o);
        });
        add.addEventListener('change', function () {
            if (this.value !== '') csiAdd(CSC_SNIPPETS[parseInt(this.value, 10)][1]);
            this.value = '';
        });
    }
    if (!list) return;
    list.addEventListener('click', function (ev) {
        const varBtn = ev.target.closest ? ev.target.closest('.csi-var') : null;
        if (varBtn) {
            const vp = csiState.pieces[parseInt(varBtn.getAttribute('data-csi-p'), 10)];
            if (!vp) return;
            if (document.getElementById('csi-varmenu')) { csiCloseVarMenu(); return; }
            csiOpenVarMenu(varBtn, vp);
            return;
        }
        const colorBtn = ev.target.closest ? ev.target.closest('.csi-color') : null;
        if (colorBtn) {
            const p = csiState.pieces[parseInt(colorBtn.getAttribute('data-csi-p'), 10)];
            if (!p) return;
            if (cscPick && cscPick.anchor === colorBtn) { cscClosePick(); return; }
            cscOpenPick({ start: p.start, end: p.end, text: p.text }, colorBtn);
            return;
        }
        const act = ev.target.closest ? ev.target.closest('[data-csi-act]') : null;
        const row = act && act.closest('[data-csi-d]');
        if (!row) return;
        const d = csiState.decls[parseInt(row.getAttribute('data-csi-d'), 10)];
        if (!d) return;
        if (act.getAttribute('data-csi-act') === 'delete') csiDelete(d);
        else csiEditRow(row, d);
    });
    list.addEventListener('change', function (ev) {
        const sel = ev.target;
        if (!sel.classList || !sel.classList.contains('csi-kw')) return;
        const p = csiState.pieces[parseInt(sel.getAttribute('data-csi-p'), 10)];
        if (p) csiCommit(cscCode.slice(0, p.start) + sel.value + cscCode.slice(p.end));
    });
    list.addEventListener('input', function (ev) {
        const inp = ev.target;
        if (!inp.classList || !inp.classList.contains('csi-num-in')) return;
        const p = csiState.pieces[parseInt(inp.getAttribute('data-csi-p'), 10)];
        // Half-typed numbers ("-", "1.") wait until they're whole!
        if (!p || inp.value === '' || !isFinite(parseFloat(inp.value))) return;
        csiCommit(cscCode.slice(0, p.start) + inp.value + p.unit + cscCode.slice(p.end));
    });
    // Clicking a number selects it, so you can type right over it!
    list.addEventListener('focusin', function (ev) {
        if (ev.target.classList && ev.target.classList.contains('csi-num-in')) setTimeout(function () { try { ev.target.select(); } catch (e) {} }, 0);
    });
    list.addEventListener('scroll', function () { cscPlacePick(); csiCloseVarMenu(); });
    const dlg = document.getElementById('customcss-dialog');
    if (dlg) {
        dlg.addEventListener('mousedown', function (ev) {
            const t = ev.target;
            if (t.closest && (t.closest('#csi-varmenu') || t.closest('.csi-var'))) return;
            csiCloseVarMenu();
        });
        dlg.addEventListener('close', csiCloseVarMenu);
        // Escape closes the menu first (not the whole Custom CSS window)!
        dlg.addEventListener('cancel', function (ev) { if (document.getElementById('csi-varmenu')) { ev.preventDefault(); csiCloseVarMenu(); } });
    }
}
function csWireSkills() {
    if (csWireSkills._done) return;
    csWireSkills._done = true;
    try {
        document.querySelectorAll('#skills-menu-popup [data-skill="customcss"]').forEach(function (item) {
            item.addEventListener('click', function () {
                cscOpenDialog();
                try { closeSkillsMenu(); } catch (e) {}
            });
        });
    } catch (e) {}
    const on = function (id, ev, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(ev, fn);
    };
    on('cs-tabs', 'click', function (ev) {
        const b = ev.target.closest ? ev.target.closest('[data-cs-tab]') : null;
        if (b) cscSetTab(b.getAttribute('data-cs-tab'));
    });
    on('cs-search', 'input', cscRefreshPresets);
    on('cs-cat', 'change', function () {
        cscCat = this.value;
        cscRefreshPresets();
    });
    on('cs-grid', 'click', function (ev) {
        const tile = ev.target.closest ? ev.target.closest('.cs-tile') : null;
        if (!tile) return;
        const id = tile.getAttribute('data-cs-id');
        if (ev.target.closest('.cs-fav')) { cscToggleStar(id); return; }
        cscPreset = id;
        cscSavePrefs();
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(760, 0.05); } catch (e) {}
        cscRefreshPresets();
        cscRefreshPreview();
    });
    on('cs-grid', 'dblclick', function (ev) {
        const pick = ev.target.closest ? ev.target.closest('.us-tile-pick') : null;
        if (pick) cscApplyStyle();
    });
    on('cs-star-btn', 'click', function () { cscToggleStar(cscPreset); });
    // Presets and Interactive can become editable code in My CSS (a great way to learn CSS)!
    on('cs-edit-btn', 'click', function () {
        const cur = cscCurrent();
        if (!cur.css && !cur.found) return;
        if (cur.found) {
            cscCode = csfFlatCode(cur.found);
        } else {
            const lines = cscSplitDecls(cur.css).map(function (d) { return d + ';'; }).join('\n');
            cscCode = '/* Started from ' + cur.name + '! */\n' + lines + '\n';
        }
        cscSavePrefs();
        cscRefreshCode();
        cscSetTab('code');
    });
    on('csi-reset', 'click', function () {
        csiCommit(CSC_STARTER);
    });
    csiWire();
    on('cs-code', 'input', function () {
        cscClosePick();
        cscCode = this.value;
        cscSavePrefs();
        cscRefreshCode();
        cscRefreshPreview();
    });
    on('cs-code', 'keydown', function (ev) {
        // Tab indents instead of leaving the box!
        if (ev.key === 'Tab' && !ev.shiftKey && !ev.altKey && !ev.metaKey && !ev.ctrlKey) {
            ev.preventDefault();
            this.setRangeText('  ', this.selectionStart, this.selectionEnd, 'end');
            this.dispatchEvent(new Event('input'));
        }
    });
    on('cs-snippets', 'click', function (ev) {
        const b = ev.target.closest ? ev.target.closest('[data-cs-snippet]') : null;
        if (b) cscInsertSnippet(CSC_SNIPPETS[parseInt(b.getAttribute('data-cs-snippet'), 10)][1]);
    });
    const snips = document.getElementById('cs-snippets');
    if (snips && !snips.children.length) {
        CSC_SNIPPETS.forEach(function (sn, i) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'px-seg-btn cs-snippet';
            b.setAttribute('data-cs-snippet', String(i));
            b.textContent = '+ ' + sn[0];
            snips.appendChild(b);
        });
    }
    on('cs-save-btn', 'click', cscSaveCode);
    on('cs-save-name', 'keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); cscSaveCode(); }
    });
    on('cs-saved', 'click', function (ev) {
        const b = ev.target.closest ? ev.target.closest('[data-cs-saved-act]') : null;
        const row = b && b.closest('[data-cs-saved]');
        if (row) cscSavedAction(row.getAttribute('data-cs-saved'), b.getAttribute('data-cs-saved-act'), b);
    });
    on('cs-find-search', 'input', function () {
        cscFindShown = CSF_PAGE;
        csfRenderGrid();
    });
    on('cs-find-src', 'change', function () {
        cscFindSrc = this.value;
        cscFindShown = CSF_PAGE;
        csfRenderGrid();
    });
    on('cs-find-star', 'click', function () {
        const fe = cscFindSel ? csfFind(cscFindSel) : null;
        if (fe) csfToggleFav(fe);
    });
    on('cs-find-more', 'click', function () {
        cscFindShown += CSF_PAGE;
        csfRenderGrid();
    });
    on('cs-find-grid', 'click', function (ev) {
        const tile = ev.target.closest ? ev.target.closest('[data-csf-key]') : null;
        if (!tile) return;
        if (ev.target.closest('.cs-fav')) {
            const fe = csfFind(tile.getAttribute('data-csf-key'));
            if (fe) csfToggleFav(fe);
            return;
        }
        cscFindSel = tile.getAttribute('data-csf-key');
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(760, 0.05); } catch (e) {}
        document.querySelectorAll('#cs-find-grid [data-csf-key]').forEach(function (t) {
            const on = t === tile;
            t.classList.toggle('active', on);
            const pick = t.querySelector('.us-tile-pick');
            if (pick) pick.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        csfRenderView();
        cscRefreshPreview();
    });
    on('cs-find-grid', 'dblclick', function (ev) {
        const pick = ev.target.closest ? ev.target.closest('.us-tile-pick') : null;
        if (pick && cscFindSel) cscApplyStyle();
    });
    cscWirePick();
    on('cs-apply-btn', 'click', cscApplyStyle);
    on('cs-cancel-btn', 'click', cscCloseDialog);
    on('cs-close-btn', 'click', cscCloseDialog);
}

if (typeof canvas !== 'undefined' && canvas) {
    fmtWireSidebar();
    kdWireLockDialog();
    fmtWireInsertMenu();
    fmtWireFileChip();
    try { if (typeof jumperWireSkills === 'function') jumperWireSkills(); } catch (e) {}
    try { if (typeof uniWireSkills === 'function') uniWireSkills(); } catch (e) {}
    try { if (typeof bbWireSkills === 'function') bbWireSkills(); } catch (e) {}
    try { if (typeof pxWireSkills === 'function') pxWireSkills(); } catch (e) {}
    try { if (typeof tcWireSkills === 'function') tcWireSkills(); } catch (e) {}
    try { if (typeof anWireSkills === 'function') anWireSkills(); } catch (e) {}
    try { if (typeof flWireSkills === 'function') flWireSkills(); } catch (e) {}
    try { if (typeof pmWireSkills === 'function') pmWireSkills(); } catch (e) {}
    try { if (typeof dcWireSkills === 'function') dcWireSkills(); } catch (e) {}
    try { if (typeof syWire === 'function') syWire(); } catch (e) {}
    try { if (typeof ccWireSkills === 'function') ccWireSkills(); } catch (e) {}
    try { if (typeof usWireSkills === 'function') usWireSkills(); } catch (e) {}
    try { if (typeof csWireSkills === 'function') csWireSkills(); } catch (e) {}
    // Throttled: selectionchange storms (scroll/IME/caret drift) coalesce here
    // instead of rebuilding the inspector on every single tick!
    let fmtRefreshArmed = true;
    let fmtRefreshQueued = false;
    const fmtRefresh = function () {
        if (!fmtRefreshArmed) { fmtRefreshQueued = true; return; }
        fmtRefreshArmed = false;
        fmtUpdateScopeHint(); fmtRenderStyleList(); fmtSyncAlignButtons();
        setTimeout(function () {
            fmtRefreshArmed = true;
            if (fmtRefreshQueued) { fmtRefreshQueued = false; fmtRefresh(); }
        }, 120);
    };
    canvas.addEventListener('keyup', fmtRefresh);
    canvas.addEventListener('mouseup', fmtRefresh);
    document.addEventListener('selectionchange', fmtRefresh);
    document.addEventListener('keydown', function (e) {
        fmtExitFormatting(e);
    });
    document.addEventListener('DOMContentLoaded', function () {
        fmtWireSidebar();
        fmtRefresh();
        fmtUpdateResetButtons();
    });
}

// ==========================================
// LINKABLE FOOTNOTE CHIPS ([^label] refs + definitions!)
// Type "[^1] " for a jump chip, "[^1]: text " for its definition!
// ==========================================
function kdFootnoteSlug(label) {
    const s = String(label || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'note';
}
function kdFootnoteEnsureBacklink(slug) {
    if (typeof canvas === 'undefined' || !canvas) return;
    const def = document.getElementById('fn-' + slug);
    if (!def || !canvas.contains(def)) return;
    const refs = canvas.querySelectorAll('a.kd-footnote-ref[href="#fn-' + slug + '"]');
    if (!refs.length) return;
    let back = def.querySelector('a.kd-footnote-back');
    if (!back) {
        back = document.createElement('a');
        back.className = 'kd-footnote-back';
        back.textContent = '\u21A9';
        back.setAttribute('spellcheck', 'false');
        def.insertBefore(back, def.firstChild);
    }
    back.setAttribute('href', '#' + refs[0].id);
}
function kdInsertFootnoteRef(label, textNode, caretOffset, range, selection) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const slug = kdFootnoteSlug(label);
    try {
        const tail = String(label || '');
        const r = document.createRange();
        r.setStart(textNode, caretOffset - (tail.length + 3));
        r.setEnd(textNode, caretOffset);
        r.deleteContents();
        const a = document.createElement('a');
        const existing = canvas.querySelectorAll('a.kd-footnote-ref[href="#fn-' + slug + '"]').length;
        a.id = 'fnref-' + slug + '-' + (existing + 1);
        a.className = 'kd-footnote-ref';
        a.setAttribute('href', '#fn-' + slug);
        a.setAttribute('spellcheck', 'false');
        a.textContent = label;
        r.insertNode(a);
        const sp = document.createTextNode(' ');
        a.parentNode.insertBefore(sp, a.nextSibling);
        const caret = document.createRange();
        caret.setStart(sp, 1);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
        playAeroClickSound(600, 0.08);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        kdFootnoteEnsureBacklink(slug);
        return true;
    } catch (e) { return false; }
}
function kdInsertFootnoteDef(slug, label, bodyText, textNode, range, selection) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    try {
        const block = textNode.parentElement;
        if (!block || !canvas.contains(block) || textNode.previousSibling) return false;
        block.textContent = '';
        const def = document.createElement('div');
        def.className = 'kd-footnote-def';
        def.id = 'fn-' + slug;
        const tag = document.createElement('span');
        tag.className = 'kd-footnote-tag';
        tag.textContent = label;
        def.appendChild(tag);
        def.appendChild(document.createTextNode(' '));
        const span = document.createElement('span');
        span.className = 'kd-footnote-text';
        span.textContent = bodyText;
        def.appendChild(span);
        def.appendChild(document.createTextNode(' '));
        block.appendChild(def);
        const caret = document.createRange();
        caret.setStart(def.lastChild, 1);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
        playAeroClickSound(600, 0.08);
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
        kdFootnoteEnsureBacklink(slug);
        return true;
    } catch (e) { return false; }
}
function kdTryFootnoteSpace(e, currentLineText, textNode, range, selection) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    if (!selection.isCollapsed) return false;
    try {
        const anchorEl = (textNode.nodeType === Node.TEXT_NODE) ? textNode.parentElement : textNode;
        if (anchorEl && anchorEl.closest && anchorEl.closest('a.kd-footnote-ref')) return false;
        // Reference only here: tail "[^label]" anywhere in the line!
        // (Definitions wait for Enter via kdTryFootnoteEnter!)
        const rm = /\[\^([^\]\s][^\]]*)\]$/.exec(currentLineText);
        if (rm) {
            e.preventDefault();
            return kdInsertFootnoteRef(rm[1], textNode, range.startOffset, range, selection);
        }
    } catch (err) {}
    return false;
}
function kdTryFootnoteEnter(e, selection, range) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    if (!selection.isCollapsed) return false;
    try {
        const textNode = range.startContainer;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return false;
        // Whole line "[^label]: text" with caret at the very end!
        if (range.startOffset !== textNode.nodeValue.length) return false;
        const dm = /^\[\^([^\]\s][^\]]*)\]:\s(\S[\s\S]*)$/.exec(textNode.nodeValue);
        if (!dm) return false;
        e.preventDefault();
        return kdInsertFootnoteDef(kdFootnoteSlug(dm[1]), dm[1], dm[2], textNode, range, selection);
    } catch (err) {}
    return false;
}
function kdWireFootnotes() {
    if (kdWireFootnotes._done) return;
    kdWireFootnotes._done = true;
    if (typeof canvas === 'undefined' || !canvas) return;
    // Contenteditable eats link clicks: jump manually instead!
    canvas.addEventListener('click', function (e) {
        const a = e.target.closest ? e.target.closest('a.kd-footnote-ref,a.kd-footnote-back') : null;
        if (!a || !canvas.contains(a)) return;
        const href = a.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        e.preventDefault();
        try {
            if (typeof target.scrollIntoView === 'function') target.scrollIntoView();
        } catch (err) {}
        try {
            const r = document.createRange();
            r.selectNodeContents(target);
            r.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (err) {}
    });
}

// ==========================================
// PART 15: DOCUMENT OUTLINE NAVIGATOR
// Live heading index in the left sidebar: click to jump,
// active row follows your caret!
// ==========================================
function kdOutlineJump(el) {
    if (!el || typeof canvas === 'undefined' || !canvas) return;
    try {
        canvas.focus();
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        if (typeof el.scrollIntoView === 'function') {
            try { el.scrollIntoView({ block: 'start' }); } catch (e) { el.scrollIntoView(); }
        }
    } catch (e) {}
}

function kdActiveHeading() {
    if (typeof canvas === 'undefined' || !canvas) return null;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return null;
    const heads = Array.from(canvas.querySelectorAll('h1, h2, h3'));
    if (!heads.length) return null;
    const caret = sel.getRangeAt(0);
    let current = null;
    heads.forEach(function (h) {
        try {
            const hr = document.createRange();
            hr.selectNodeContents(h);
            hr.collapse(true);
            if (caret.compareBoundaryPoints(window.Range.START_TO_START, hr) >= 0) current = h;
        } catch (e) {}
    });
    return current;
}

function kdRenderOutline() {
    const list = document.getElementById('doc-outline-list');
    if (!list || typeof canvas === 'undefined' || !canvas) return;
    list.innerHTML = '';
    const heads = Array.from(canvas.querySelectorAll('h1, h2, h3'));
    if (!heads.length) {
        const p = document.createElement('p');
        p.className = 'outline-empty';
        p.textContent = 'No headings yet.';
        list.appendChild(p);
        return;
    }
    const active = kdActiveHeading();
    heads.forEach(function (h) {
        const level = h.tagName === 'H1' ? 1 : (h.tagName === 'H2' ? 2 : 3);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'outline-item outline-item-l' + level + (h === active ? ' active' : '');
        btn.textContent = h.textContent.trim().substring(0, 60) || ('Heading ' + level);
        btn.title = h.textContent.trim();
        btn.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            kdOutlineJump(h);
            kdRenderOutline();
        });
        list.appendChild(btn);
    });
}

if (typeof canvas !== 'undefined' && canvas) {
    const kdOutlineRefresh = function () { kdRenderOutline(); };
    canvas.addEventListener('input', kdOutlineRefresh);
    canvas.addEventListener('keyup', kdOutlineRefresh);
    canvas.addEventListener('mouseup', kdOutlineRefresh);
    document.addEventListener('selectionchange', kdOutlineRefresh);
    document.addEventListener('DOMContentLoaded', function () {
        kdRenderOutline();
    });
    const outlineToggle = document.getElementById('outline-toggle-btn');
    if (outlineToggle) outlineToggle.addEventListener('click', function () {
        playAeroClickSound(450, 0.1);
        const section = document.querySelector('.outline-section');
        if (section) section.classList.toggle('collapsed');
    });
}

// ==========================================
// PART 16: DOCUMENT TABS (PAGES IN ONE DOCUMENT)
// Each tab is its own document; outlines nest inside tabs;
// everything persists to localStorage AND inside .kn files!
// ==========================================
var kdTabs = [];
var kdActiveTabId = null;
var kdExpandedTabs = {};
var KD_TABS_KEY = 'bitbook_tabs_v1';
var KD_TAB_ACTIVE_KEY = 'bitbook_tabs_active';

function kdTabId() {
    return 'tab-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
}

function kdActiveTab() {
    for (let i = 0; i < kdTabs.length; i++) {
        if (kdTabs[i].id === kdActiveTabId) return kdTabs[i];
    }
    return kdTabs[0] || null;
}

function kdSaveTabs() {
    try {
        localStorage.setItem(KD_TABS_KEY, JSON.stringify(kdTabs));
        localStorage.setItem(KD_TAB_ACTIVE_KEY, kdActiveTabId || '');
    } catch (e) {}
}

var KD_RESTORE_KEY = 'bitbook_restore_notes';

// Restoring is ON by default (only an explicit '0' wipes on boot)!
function kdRestoreEnabled() {
    try { return localStorage.getItem(KD_RESTORE_KEY) !== '0'; } catch (e) { return true; }
}

function kdFreshTabs() {
    // Fresh start: wipe all notes + outlines, then seed one empty Quick Note!
    try {
        localStorage.removeItem(KD_TABS_KEY);
        localStorage.removeItem(KD_TAB_ACTIVE_KEY);
        localStorage.removeItem('bitbook_save_slot_1');
        localStorage.removeItem('bitbook_save_slot_2');
    } catch (e) {}
    kdTabs = [{ id: kdTabId(), name: 'Quick Note', html: '' }];
    kdActiveTabId = kdTabs[0].id;
    kdExpandedTabs = {};
    kdSaveTabs();
}

function kdLoadTabs() {
    if (!kdRestoreEnabled()) { kdFreshTabs(); return; }
    // Restore the saved notebook: notes, outlines, and active tab survive reloads!
    kdTabs = [];
    kdActiveTabId = null;
    try {
        const raw = localStorage.getItem(KD_TABS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                parsed.forEach(function (t) {
                    if (t && typeof t.id === 'string') {
                        kdTabs.push({ id: t.id, name: String(t.name || 'Untitled').substring(0, 60), html: typeof t.html === 'string' ? t.html : '' });
                    }
                });
            }
        }
    } catch (e) { kdTabs = []; }
    if (!kdTabs.length) {
        let legacy = '';
        try { legacy = localStorage.getItem('bitbook_save_slot_1') || ''; } catch (e) {}
        kdTabs = [{ id: kdTabId(), name: 'Quick Note', html: legacy }];
    }
    try {
        const aid = localStorage.getItem(KD_TAB_ACTIVE_KEY);
        if (aid && kdTabs.some(function (t) { return t.id === aid; })) kdActiveTabId = aid;
    } catch (e) {}
    if (!kdActiveTabId || !kdTabs.some(function (t) { return t.id === kdActiveTabId; })) kdActiveTabId = kdTabs[0].id;
    kdSaveTabs();
}

function kdTabHeadings(tab) {
    try {
        const tmp = document.createElement('div');
        tmp.innerHTML = tab.html || '';
        return Array.from(tmp.querySelectorAll('h1, h2, h3')).map(function (h) {
            return { level: h.tagName === 'H1' ? 1 : (h.tagName === 'H2' ? 2 : 3), text: (h.textContent || '').trim().substring(0, 60) || ('Heading') };
        });
    } catch (e) { return []; }
}

function kdActivateTab(id, headIdx) {
    const tab = kdTabs.find(function (t) { return t.id === id; });
    if (!tab || typeof canvas === 'undefined' || !canvas) return;
    const cur = kdActiveTab();
    if (cur) cur.html = canvas.innerHTML;
    kdActiveTabId = id;
    canvas.innerHTML = tab.html || '';
    kdSaveTabs();
    kdHydrateInteractions();
    kdRenderTabs();
    kdRenderOutline();
    if (typeof headIdx === 'number') {
        const heads = canvas.querySelectorAll('h1, h2, h3');
        if (heads[headIdx]) kdOutlineJump(heads[headIdx]);
    } else {
        try {
            const r = document.createRange();
            r.selectNodeContents(canvas);
            r.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
            canvas.focus();
        } catch (e) {}
    }
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
}

function kdRenderTabs() {
    const list = document.getElementById('doc-tabs-list');
    if (!list) return;
    list.innerHTML = '';
    kdTabs.forEach(function (tab) {
        const row = document.createElement('div');
        row.className = 'tab-row';
        const heads = kdTabHeadings(tab);
        if (heads.length) {
            const exp = document.createElement('button');
            exp.type = 'button';
            exp.className = 'outline-toggle';
            exp.title = kdExpandedTabs[tab.id] ? 'Hide outline' : 'Show outline';
            exp.textContent = kdExpandedTabs[tab.id] ? '▾' : '▸';
            exp.addEventListener('click', function (e) {
                e.stopPropagation();
                playAeroClickSound(500, 0.06);
                if (kdExpandedTabs[tab.id]) delete kdExpandedTabs[tab.id];
                else kdExpandedTabs[tab.id] = true;
                kdRenderTabs();
            });
            row.appendChild(exp);
        }
        const name = document.createElement('button');
        name.type = 'button';
        name.className = 'outline-item' + (tab.id === kdActiveTabId ? ' active' : '');
        name.textContent = tab.name;
        name.title = tab.name;
        name.addEventListener('click', function () {
            if (tab.id === kdActiveTabId) return;
            playAeroClickSound(600, 0.08);
            kdActivateTab(tab.id);
        });
        name.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            if (name.querySelector('input')) return;
            playAeroClickSound(600, 0.08);
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'tab-rename-input';
            input.value = tab.name;
            input.maxLength = 60;
            name.textContent = '';
            name.appendChild(input);
            try { input.focus(); input.select(); } catch (err) {}
            let done = false;
            const commit = function (save) {
                if (done) return;
                done = true;
                const next = input.value.trim().substring(0, 60);
                if (save && next) {
                    tab.name = next;
                    kdSaveTabs();
                }
                kdRenderTabs();
            };
            input.addEventListener('keydown', function (ev) {
                ev.stopPropagation();
                if (ev.key === 'Enter') { ev.preventDefault(); commit(true); }
                else if (ev.key === 'Escape') { commit(false); }
            });
            input.addEventListener('blur', function () { commit(true); });
            input.addEventListener('click', function (ev) { ev.stopPropagation(); });
            input.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
            input.addEventListener('dblclick', function (ev) { ev.stopPropagation(); });
        });
        row.appendChild(name);
        if (kdTabs.length > 1) {
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'outline-toggle';
            close.textContent = '✕';
            close.title = 'Close page';
            close.addEventListener('click', function (e) {
                e.stopPropagation();
                let ok = true;
                if (tab.html && tab.html.trim()) {
                    try { ok = !window.confirm || window.confirm('Delete page "' + tab.name + '"?') !== false; }
                    catch (err) { ok = true; }
                }
                if (!ok) return;
                playAeroClickSound(350, 0.1);
                kdTabs = kdTabs.filter(function (t) { return t.id !== tab.id; });
                delete kdExpandedTabs[tab.id];
                if (kdActiveTabId === tab.id) {
                    kdActiveTabId = kdTabs[0].id;
                    canvas.innerHTML = kdTabs[0].html || '';
                    kdHydrateInteractions();
                    kdRenderOutline();
                }
                kdSaveTabs();
                kdRenderTabs();
            });
            row.appendChild(close);
        }
        list.appendChild(row);
        if (kdExpandedTabs[tab.id]) {
            heads.forEach(function (h, idx) {
                const hb = document.createElement('button');
                hb.type = 'button';
                hb.className = 'outline-item tab-head outline-item-l' + h.level;
                hb.textContent = h.text;
                hb.title = h.text;
                hb.addEventListener('click', function () {
                    playAeroClickSound(600, 0.08);
                    kdActivateTab(tab.id, idx);
                });
                list.appendChild(hb);
            });
        }
    });
}

// --- Tabs fence inside .kn files (appended after the canvas HTML!) ---
function kdTabsFence() {
    let out = '\n---tabs---\n';
    kdTabs.forEach(function (t) {
        const html = (t.id === kdActiveTabId && typeof canvasViewport !== 'undefined' && canvasViewport)
            ? canvasViewport.innerHTML : t.html;
        out += '- name: ' + JSON.stringify(t.name) + '\n';
        out += '  html: ' + JSON.stringify(html || '') + '\n';
    });
    return out;
}

function kdParseTabsFence(text) {
    const marker = '\n---tabs---\n';
    const idx = text.indexOf(marker);
    if (idx === -1) return { html: text, tabs: null };
    const tabs = [];
    let cur = null;
    text.substring(idx + marker.length).split('\n').forEach(function (ln) {
        let m = ln.match(/^\s*-\s*name:\s*(.*)\s*$/);
        if (m) {
            cur = { name: '', html: '' };
            tabs.push(cur);
            try { cur.name = JSON.parse(m[1]); } catch (e) { cur.name = m[1]; }
            return;
        }
        m = ln.match(/^\s*html:\s*(.*)\s*$/);
        if (m && cur) {
            try { cur.html = JSON.parse(m[1]); } catch (e) { cur.html = m[1]; }
        }
    });
    return { html: text.substring(0, idx), tabs: tabs.length ? tabs : null };
}

function kdRestoreTabs(tabs) {
    kdTabs = tabs.map(function (t) {
        return { id: kdTabId(), name: String(t.name || 'Untitled').substring(0, 60), html: typeof t.html === 'string' ? t.html : '' };
    });
    if (!kdTabs.length) kdTabs = [{ id: kdTabId(), name: 'Quick Note', html: '' }];
    kdActiveTabId = kdTabs[0].id;
    kdExpandedTabs = {};
    kdSaveTabs();
    return kdTabs[0].html || '';
}

if (typeof canvas !== 'undefined' && canvas) {
    kdLoadTabs();
    try { canvas.innerHTML = (kdActiveTab() || {}).html || ''; } catch (e) {}
    kdRenderTabs();
    kdRenderOutline();
    kdHydrateInteractions();
    isInitialBootSync = false;
    // Tag compiles + applet builds mutate the DOM with no input event --
    // watch mutations (debounced) so nothing un-renders on reload!
    // (Clock hands tick every second: pure clock batches never schedule saves!)
    let kdSaveTimer = null;
    if (typeof MutationObserver === 'function') {
        try {
            const kdObs = new MutationObserver(function (recs) {
                let relevant = false;
                for (const r of recs) {
                    const t = r.target;
                    const scope = (t && t.nodeType === 1) ? t : (t && t.parentElement);
                    if (scope && scope.closest && scope.closest('.applet-gadget-clock, .applet-gadget-system-clock, .tc-chip-count, .pm-chip-count, .pm-chip-ring')) continue;
                    relevant = true;
                    break;
                }
                if (!relevant || kdSaveTimer) return;
                kdSaveTimer = setTimeout(function () {
                    kdSaveTimer = null;
                    try {
                        if (typeof kdActiveTab === 'function' && typeof kdSaveTabs === 'function') {
                            const t = kdActiveTab();
                            if (t) t.html = canvas.innerHTML;
                            kdSaveTabs();
                        }
                    } catch (e) {}
                }, 300);
            });
            kdObs.observe(canvas, { childList: true, subtree: true, characterData: true, attributes: true });
        } catch (e) {}
    }
    canvas.addEventListener('input', function () {
        const t = kdActiveTab();
        if (t) {
            t.html = canvas.innerHTML;
            kdSaveTabs();
        }
        kdRenderTabs();
        kdRenderOutline();
    });
    document.addEventListener('DOMContentLoaded', function () {
        kdRenderTabs();
        kdRenderOutline();
    });
    const tabsAddBtn = document.getElementById('tabs-add-btn');
    if (tabsAddBtn) tabsAddBtn.addEventListener('click', function () {
        playAeroClickSound(700, 0.1);
        let n = kdTabs.length + 1;
        while (kdTabs.some(function (t) { return t.name === 'Note ' + n; })) n++;
        kdTabs.push({ id: kdTabId(), name: 'Note ' + n, html: '' });
        kdSaveTabs();
        kdActivateTab(kdTabs[kdTabs.length - 1].id);
    });
    const tabsToggleBtn = document.getElementById('tabs-toggle-btn');
    if (tabsToggleBtn) tabsToggleBtn.addEventListener('click', function () {
        playAeroClickSound(450, 0.1);
        const section = document.querySelector('.tabs-section');
        if (section) section.classList.toggle('collapsed');
    });
}
// ==========================================
// FONT PICKER (top bar): a custom menu with every font shown in its own typeface,
// plus My fonts: system fonts you add by name, and font files you upload! The hidden
// select is still the value behind it, so applying + syncing work just like before!
// ==========================================
var FP_KEY = 'bitbook_my_fonts';
var FP_DB = 'bitbook-fonts';
var FP_GENERIC = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong'];
var fpMine = [];
var fpRange = null;
try {
    const raw = JSON.parse(localStorage.getItem(FP_KEY) || '[]');
    if (Array.isArray(raw)) fpMine = raw.filter(function (f) { return f && typeof f.name === 'string' && (f.kind === 'system' || f.kind === 'file'); });
} catch (e) {}
function fpSave() {
    try { localStorage.setItem(FP_KEY, JSON.stringify(fpMine)); } catch (e) {}
}
// (Found anywhere: the top bar only gets its controls docked after this script runs!)
function fpSelect() { return document.querySelector('[data-edit-action="fontName"]'); }
function fpBuiltIn() {
    const sel = fpSelect();
    const mine = fpMine.map(function (f) { return f.name; });
    return sel ? Array.from(sel.options).map(function (o) { return o.value; }).filter(function (v) { return mine.indexOf(v) === -1; }) : [];
}
// Font names go into notes and CSS, so only plain names get in!
function fpClean(name) {
    return String(name || '').replace(/["'`;{}<>\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 64);
}
// Is this font really on this computer? Text drawn in it measures differently than the fallbacks!
function fpInstalled(name) {
    if (FP_GENERIC.indexOf(name.toLowerCase()) !== -1) return false;
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return true;
    const sample = 'mmmmmmmmmmlliWW@#0123456789';
    return ['monospace', 'serif', 'sans-serif'].some(function (base) {
        ctx.font = '72px ' + base;
        const a = ctx.measureText(sample).width;
        ctx.font = '72px "' + name + '", ' + base;
        return ctx.measureText(sample).width !== a;
    });
}
// Uploaded font files live in IndexedDB (they're too big for localStorage)!
function fpDb() {
    return new Promise(function (resolve, reject) {
        let req;
        try { req = indexedDB.open(FP_DB, 1); } catch (e) { reject(e); return; }
        req.onupgradeneeded = function () { req.result.createObjectStore('files'); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
    });
}
function fpDbDo(mode, fn) {
    return fpDb().then(function (db) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction('files', mode);
            const out = fn(tx.objectStore('files'));
            tx.oncomplete = function () { resolve(out && out.result); };
            tx.onerror = function () { reject(tx.error); };
        });
    });
}
function fpLoadFile(f) {
    return fpDbDo('readonly', function (st) { return st.get(f.id); }).then(function (buf) {
        if (!buf) throw new Error('missing');
        const face = new FontFace(f.name, buf);
        return face.load().then(function (loaded) { document.fonts.add(loaded); });
    });
}
// Keeps the hidden select's options matching Bitbook's fonts + yours (so syncing finds them)!
function fpSyncOptions() {
    const sel = fpSelect();
    if (!sel) return;
    Array.from(sel.options).forEach(function (o) { if (o.getAttribute('data-mine') && !fpMine.some(function (f) { return f.name === o.value; })) o.remove(); });
    fpMine.forEach(function (f) {
        if (Array.from(sel.options).some(function (o) { return o.value === f.name; })) return;
        const o = document.createElement('option');
        o.value = f.name;
        o.textContent = f.name;
        o.setAttribute('data-mine', '1');
        sel.appendChild(o);
    });
}
function fpSyncLabel() {
    const sel = fpSelect();
    const lab = document.getElementById('font-pick-label');
    if (!sel || !lab) return;
    lab.textContent = sel.value || 'Font';
    lab.style.fontFamily = sel.value ? '"' + sel.value + '", JetBrains Mono, monospace' : '';
}
function fpMsg(text, bad) {
    const m = document.getElementById('font-pick-msg');
    if (!m) return;
    m.textContent = text;
    m.classList.toggle('bad', !!bad);
}
function fpApply(name) {
    const sel = fpSelect();
    if (!sel) return;
    fpClose();
    // Put the text selection back first (typing a font name moved the focus away from it)!
    try {
        if (fpRange && canvas.contains(fpRange.commonAncestorContainer)) {
            canvas.focus();
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(fpRange);
        }
    } catch (e) {}
    sel.value = name;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    fpSyncLabel();
    try { playAeroClickSound(700, 0.06); } catch (e) {}
}
function fpItem(name, mine) {
    const sel = fpSelect();
    const row = document.createElement('div');
    row.className = 'font-pick-row';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'font-pick-item' + (sel && sel.value === name ? ' on' : '');
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', sel && sel.value === name ? 'true' : 'false');
    b.style.fontFamily = '"' + name + '", JetBrains Mono, monospace';
    b.textContent = name;
    b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    b.addEventListener('click', function () { fpApply(name); });
    row.appendChild(b);
    if (mine) {
        const tag = document.createElement('span');
        tag.className = 'font-pick-kind';
        tag.textContent = mine.kind === 'file' ? 'file' : 'system';
        row.appendChild(tag);
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'font-pick-x';
        x.textContent = '✕';
        x.title = 'Remove ' + name + ' from My fonts';
        x.setAttribute('aria-label', 'Remove ' + name);
        x.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        x.addEventListener('click', function () { fpRemove(mine); });
        row.appendChild(x);
    }
    return row;
}
function fpRenderList() {
    const list = document.getElementById('font-pick-list');
    if (!list) return;
    list.innerHTML = '';
    const head = function (t) { const h = document.createElement('div'); h.className = 'font-pick-head'; h.textContent = t; list.appendChild(h); };
    head('Bitbook fonts');
    fpBuiltIn().forEach(function (n) { list.appendChild(fpItem(n, null)); });
    head('My fonts');
    if (!fpMine.length) {
        const p = document.createElement('p');
        p.className = 'font-pick-empty';
        p.textContent = 'Add a font from your computer or a font file below!';
        list.appendChild(p);
    }
    fpMine.forEach(function (f) { list.appendChild(fpItem(f.name, f)); });
}
function fpAdd(entry) {
    fpMine.push(entry);
    fpSave();
    fpSyncOptions();
    fpRenderList();
}
function fpRemove(f) {
    fpMine = fpMine.filter(function (x) { return x !== f; });
    fpSave();
    if (f.kind === 'file') fpDbDo('readwrite', function (st) { st.delete(f.id); }).catch(function () {});
    const sel = fpSelect();
    if (sel && sel.value === f.name) sel.value = sel.options[0] ? sel.options[0].value : '';
    fpSyncOptions();
    fpRenderList();
    fpSyncLabel();
    fpMsg('Removed ' + f.name + '! Text already in it falls back to another font!');
}
function fpTaken(name) {
    return fpBuiltIn().concat(fpMine.map(function (f) { return f.name; })).some(function (n) { return n.toLowerCase() === name.toLowerCase(); });
}
function fpAddSystem(raw) {
    const name = fpClean(raw);
    if (!name) { fpMsg('Type a font name first!', true); return; }
    if (fpTaken(name)) { fpApply(name); return; }
    if (!fpInstalled(name)) { fpMsg('"' + name + '" isn\'t installed on this computer! Check the spelling (like "Helvetica Neue")!', true); return; }
    fpAdd({ name: name, kind: 'system' });
    fpApply(name);
}
function fpAddFile(file) {
    if (!file) return;
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) { fpMsg('Pick a .ttf, .otf, .woff or .woff2 font file!', true); return; }
    let name = fpClean(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')) || 'My Font';
    const baseName = name;
    for (let n = 2; fpTaken(name); n++) name = baseName + ' ' + n;
    fpMsg('Loading ' + file.name + '…');
    file.arrayBuffer().then(function (buf) {
        // Make sure the browser can actually read it before saving it!
        return new FontFace(name, buf).load().then(function (face) {
            document.fonts.add(face);
            const id = 'f' + Date.now().toString(36);
            return fpDbDo('readwrite', function (st) { st.put(buf, id); }).then(function () { return id; });
        });
    }).then(function (id) {
        fpAdd({ name: name, kind: 'file', id: id });
        fpMsg('Added ' + name + '!');
        fpApply(name);
    }).catch(function () {
        fpMsg('That file isn\'t a font Bitbook can read!', true);
    });
}
// Chrome can list the computer's fonts (it asks permission first)!
function fpBrowse() {
    const box = document.getElementById('font-pick-browse');
    if (!box || typeof window.queryLocalFonts !== 'function') return;
    fpMsg('Asking for your fonts…');
    window.queryLocalFonts().then(function (fonts) {
        const fams = Array.from(new Set(fonts.map(function (f) { return f.family; }))).sort(function (a, b) { return a.localeCompare(b); });
        box.hidden = false;
        box.innerHTML = '';
        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'font-pick-input';
        search.placeholder = 'Search ' + fams.length + ' fonts…';
        search.setAttribute('aria-label', 'Search your fonts');
        const results = document.createElement('div');
        results.className = 'font-pick-results';
        const draw = function () {
            const q = search.value.trim().toLowerCase();
            results.innerHTML = '';
            fams.filter(function (f) { return !q || f.toLowerCase().indexOf(q) !== -1; }).slice(0, 80).forEach(function (f) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'font-pick-item';
                b.style.fontFamily = '"' + fpClean(f) + '", JetBrains Mono, monospace';
                b.textContent = f;
                b.addEventListener('click', function () { fpAddSystem(f); });
                results.appendChild(b);
            });
        };
        search.addEventListener('input', draw);
        box.appendChild(search);
        box.appendChild(results);
        draw();
        fpMsg('');
        search.focus();
    }).catch(function () {
        fpMsg('No access to your fonts! You can still type a font name above!', true);
    });
}
function fpBuildMenu() {
    if (document.getElementById('font-pick-menu')) return document.getElementById('font-pick-menu');
    const menu = document.createElement('div');
    menu.id = 'font-pick-menu';
    menu.className = 'font-pick-menu';
    menu.hidden = true;
    menu.innerHTML =
        '<div id="font-pick-list" class="font-pick-list" role="listbox" aria-label="Fonts"></div>' +
        '<div class="font-pick-adds">' +
        '<div class="font-pick-head">Add a font</div>' +
        '<div class="font-pick-sysrow"><input id="font-pick-sysname" class="font-pick-input" type="text" placeholder="System font name, like Futura" spellcheck="false" autocomplete="off" aria-label="System font name">' +
        '<button type="button" id="font-pick-sysadd" class="font-pick-action">Add</button></div>' +
        '<button type="button" id="font-pick-browse-btn" class="font-pick-action" hidden>Browse system fonts…</button>' +
        '<div id="font-pick-browse" class="font-pick-browse" hidden></div>' +
        '<button type="button" id="font-pick-file-btn" class="font-pick-action">＋ Add a font file (.ttf, .otf, .woff)…</button>' +
        '<input type="file" id="font-pick-file" accept=".ttf,.otf,.woff,.woff2" hidden>' +
        '<p id="font-pick-msg" class="font-pick-msg" aria-live="polite"></p>' +
        '</div>';
    document.body.appendChild(menu);
    const name = document.getElementById('font-pick-sysname');
    document.getElementById('font-pick-sysadd').addEventListener('click', function () { fpAddSystem(name.value); });
    name.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); fpAddSystem(name.value); } });
    const browse = document.getElementById('font-pick-browse-btn');
    browse.hidden = typeof window.queryLocalFonts !== 'function';
    browse.addEventListener('click', fpBrowse);
    const file = document.getElementById('font-pick-file');
    document.getElementById('font-pick-file-btn').addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () { fpAddFile(file.files && file.files[0]); file.value = ''; });
    menu.addEventListener('keydown', function (ev) {
        const items = Array.from(menu.querySelectorAll('.font-pick-list .font-pick-item'));
        const at = items.indexOf(document.activeElement);
        if (ev.key === 'Escape') { ev.preventDefault(); fpClose(); document.getElementById('font-pick-btn').focus(); }
        else if (ev.key === 'ArrowDown' && at !== -1) { ev.preventDefault(); items[(at + 1) % items.length].focus(); }
        else if (ev.key === 'ArrowUp' && at !== -1) { ev.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
    });
    return menu;
}
function fpOpen() {
    const btn = document.getElementById('font-pick-btn');
    const menu = fpBuildMenu();
    // Remember the text selection: the menu has a text box that takes the focus!
    fpRange = null;
    try {
        const s = window.getSelection();
        if (s.rangeCount && canvas.contains(s.getRangeAt(0).commonAncestorContainer)) fpRange = s.getRangeAt(0).cloneRange();
    } catch (e) {}
    fpRenderList();
    fpMsg('');
    const box = document.getElementById('font-pick-browse');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.style.top = Math.min(r.bottom + 6, window.innerHeight - 120) + 'px';
    menu.style.maxHeight = Math.max(200, window.innerHeight - r.bottom - 20) + 'px';
    const on = menu.querySelector('.font-pick-item.on') || menu.querySelector('.font-pick-item');
    if (on) on.focus({ preventScroll: false });
}
function fpClose() {
    const menu = document.getElementById('font-pick-menu');
    if (menu) menu.hidden = true;
    const btn = document.getElementById('font-pick-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
}
(function () {
    const btn = document.getElementById('font-pick-btn');
    if (!btn) return;
    fpSyncOptions();
    fpSyncLabel();
    btn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const menu = document.getElementById('font-pick-menu');
        if (menu && !menu.hidden) fpClose(); else fpOpen();
    });
    document.addEventListener('mousedown', function (ev) {
        const menu = document.getElementById('font-pick-menu');
        if (!menu || menu.hidden) return;
        if (menu.contains(ev.target) || btn.contains(ev.target)) return;
        fpClose();
    });
    window.addEventListener('resize', fpClose);
    // Uploaded fonts load at startup, so notes that use them look right right away!
    fpMine.filter(function (f) { return f.kind === 'file'; }).forEach(function (f) {
        fpLoadFile(f).catch(function () {});
    });
})();


// ==========================================
// RIGHT-CLICK STYLES: right-click selected text for a menu of your favorite Gallery
// styles, or your starred CSS presets + saved CSS creations! Click one to style the text!
// ==========================================
var RC_TAB_KEY = 'bitbook_rclick_tab';
var rcRange = null;
var rcTab = 'gallery';
try { if (localStorage.getItem(RC_TAB_KEY) === 'css') rcTab = 'css'; } catch (e) {}
function rcClose() {
    const m = document.getElementById('rc-menu');
    if (m) m.hidden = true;
}
// The styles for a tab: { name, sub (its category), make(text) -> preview element, apply() }!
function rcItems(tab) {
    const out = [];
    if (tab === 'gallery') {
        (typeof usFavs !== 'undefined' ? usFavs : []).forEach(function (id) {
            const st = US_STYLES.filter(function (x) { return x.id === id; })[0];
            if (!st) return;
            out.push({
                name: st.name,
                sub: st.famName,
                make: function (text) { const c = document.createElement('span'); c.className = st.cls; c.textContent = text; return c; },
                apply: function (range) { usSelected = st.id; usSavedRange = range; return usApplyStyle(); }
            });
        });
        return out;
    }
    cscStars.forEach(function (id) {
        const pr = cscFindPreset(id);
        if (!pr) return;
        out.push({
            name: pr.name,
            sub: cscCatName(pr.cat),
            make: function (text) { const c = document.createElement('span'); c.className = 'bbcss-chip'; c.setAttribute('style', pr.css); c.textContent = text; return c; },
            apply: function (range) { return cscInsertChip({ css: pr.css, name: pr.name, sid: pr.id }, range); }
        });
    });
    cscSaved.forEach(function (sv) {
        const res = cscCheckCode(sv.code);
        if (!res.css && !res.before && !res.after) return;
        out.push({
            name: sv.name,
            sub: 'Saved CSS',
            make: function (text) { const c = document.createElement('span'); c.className = 'bbcss-chip'; cscPaintChip(c, res.css, res.before, res.after); c.textContent = text; return c; },
            apply: function (range) {
                return cscInsertChip({ css: res.css, before: res.before, after: res.after, name: sv.name, sid: 'c' + cscHash(res.css + (res.before || res.after ? '|' + res.before + '|' + res.after : '')) }, range);
            }
        });
    });
    return out;
}
function rcRender() {
    const menu = document.getElementById('rc-menu');
    if (!menu) return;
    menu.querySelectorAll('[data-rc-tab]').forEach(function (b) {
        const on = b.getAttribute('data-rc-tab') === rcTab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const grid = menu.querySelector('.rc-grid');
    grid.innerHTML = '';
    const text = 'Aa';
    const items = rcItems(rcTab);
    if (!items.length) {
        const p = document.createElement('p');
        p.className = 'rc-empty';
        p.textContent = rcTab === 'gallery'
            ? 'No Gallery favorites yet! Tap the ☆ on styles in Skills → Unique Chip Styles (or Find Styles)!'
            : 'No CSS styles yet! Star a preset or save a creation in Skills → Custom CSS!';
        grid.appendChild(p);
        return;
    }
    items.forEach(function (it) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rc-item';
        b.title = it.name + ' · ' + it.sub;
        b.setAttribute('aria-label', 'Style the selected text with ' + it.name + ' (' + it.sub + ')');
        const stage = document.createElement('span');
        stage.className = 'rc-stage';
        stage.appendChild(it.make(text));
        const nm = document.createElement('span');
        nm.className = 'rc-name';
        nm.textContent = it.name;
        const sub = document.createElement('span');
        sub.className = 'rc-sub';
        sub.textContent = it.sub;
        b.appendChild(stage);
        b.appendChild(nm);
        b.appendChild(sub);
        b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        b.addEventListener('click', function () {
            const range = rcRange;
            rcClose();
            if (range && !range.collapsed && canvas.contains(range.commonAncestorContainer)) it.apply(range);
        });
        grid.appendChild(b);
    });
}
function rcBuild() {
    let menu = document.getElementById('rc-menu');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'rc-menu';
    menu.className = 'rc-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Style the selected text');
    menu.innerHTML =
        '<div class="format-segmented us-collection rc-tabs" role="tablist" aria-label="Which styles">' +
        '<button type="button" class="format-segment-btn" data-rc-tab="gallery" role="tab">★ Gallery</button>' +
        '<button type="button" class="format-segment-btn" data-rc-tab="css" role="tab">★ CSS</button>' +
        '</div><div class="rc-grid"></div>';
    document.body.appendChild(menu);
    menu.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    menu.querySelectorAll('[data-rc-tab]').forEach(function (b) {
        b.addEventListener('click', function () {
            rcTab = b.getAttribute('data-rc-tab');
            try { localStorage.setItem(RC_TAB_KEY, rcTab); } catch (e) {}
            rcRender();
        });
    });
    menu.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); rcClose(); }
    });
    return menu;
}
(function () {
    if (typeof canvas === 'undefined' || !canvas) return;
    canvas.addEventListener('contextmenu', function (ev) {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return; // no selection: the normal menu!
        const range = sel.getRangeAt(0);
        if (!canvas.contains(range.commonAncestorContainer)) return;
        ev.preventDefault();
        rcRange = range.cloneRange();
        const menu = rcBuild();
        rcRender();
        menu.hidden = false;
        menu.style.left = Math.max(8, Math.min(ev.clientX, window.innerWidth - menu.offsetWidth - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(ev.clientY, window.innerHeight - menu.offsetHeight - 8)) + 'px';
        const first = menu.querySelector('.rc-item') || menu.querySelector('[data-rc-tab].active');
        if (first) first.focus({ preventScroll: true });
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.05); } catch (e) {}
    });
    document.addEventListener('mousedown', function (ev) {
        const m = document.getElementById('rc-menu');
        if (m && !m.hidden && !m.contains(ev.target)) rcClose();
    });
    window.addEventListener('resize', rcClose);
    document.addEventListener('scroll', function (ev) {
        const m = document.getElementById('rc-menu');
        if (m && !m.hidden && !m.contains(ev.target)) rcClose();
    }, true);
})();

// ==========================================
// ENTER NEVER DRAGS A CHIP ONTO THE NEW LINE!
// Browsers copy an inline style (like a Keydown chip) onto the empty new line, so
// the next letters came out chipped and Enter seemed to "bring the cursor back"!
// ==========================================
if (typeof canvas !== 'undefined' && canvas) {
    canvas.addEventListener('input', function (e) {
        if (e.inputType !== 'insertParagraph' && e.inputType !== 'insertLineBreak') return;
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return;
        const n = sel.anchorNode;
        let el = n && (n.nodeType === 1 ? n : n.parentElement);
        let top = null;
        while (el && el !== canvas && canvas.contains(el) && el.tagName === 'SPAN' && el.className && String(el.className).trim() &&
               !(el.textContent || '').replace(/[\s​]/g, '') && !el.querySelector('input,select,textarea,[contenteditable="false"]')) {
            top = el;
            el = el.parentElement;
        }
        if (!top) return;
        const host = top.parentNode;
        const idx = Array.prototype.indexOf.call(host.childNodes, top);
        while (top.firstChild) host.insertBefore(top.firstChild, top);
        top.remove();
        if (!host.firstChild) host.appendChild(document.createElement('br'));
        const r = document.createRange();
        r.setStart(host, Math.min(idx, host.childNodes.length));
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
    });
}

// ==========================================
// SELECTION TRUTH: the highlight must show EXACTLY what Delete will remove!
// When a drag ends at the page margin the browser may select a line break without
// painting it, so every selected line break gets its own little highlight tab!
// ==========================================
(function () {
    if (typeof canvas === 'undefined' || !canvas) return;
    const COLOR = location.pathname.indexOf('bitbook') !== -1 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(20, 149, 255, 0.35)';
    let layer = null, queued = false;
    const LEAF_BLOCKS = 'div, p, h1, h2, h3, h4, h5, h6, blockquote, li, pre';
    const NESTED = 'div, p, h1, h2, h3, h4, h5, h6, blockquote, li, ul, ol, pre';
    function ensure() {
        if (layer) return layer;
        layer = document.createElement('div');
        layer.id = 'selection-linebreak-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:40';
        document.body.appendChild(layer);
        return layer;
    }
    function draw() {
        queued = false;
        const L = ensure();
        L.textContent = '';
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed || !canvas.contains(sel.anchorNode) || !canvas.contains(sel.focusNode)) return;
        const R = sel.getRangeAt(0);
        const blocks = [].filter.call(canvas.querySelectorAll(LEAF_BLOCKS), function (b) { return !b.querySelector(NESTED); });
        const frag = document.createDocumentFragment();
        blocks.forEach(function (b, i) {
            if (!R.intersectsNode(b) || i === blocks.length - 1) return;
            const br = document.createRange();
            br.selectNodeContents(b);
            // The selection must run PAST the end of this line to include its line break!
            if (R.compareBoundaryPoints(Range.END_TO_END, br) <= 0) return;
            let rect = null;
            const rs = br.getClientRects();
            if (rs.length && (b.textContent || '').length) rect = rs[rs.length - 1];
            const bb = b.getBoundingClientRect();
            const x = rect ? rect.right : bb.left;
            const y = rect ? rect.top : bb.top;
            const h = rect ? rect.height : Math.min(bb.height, 28);
            if (!h || y + h < 0 || y > window.innerHeight) return;
            const tab = document.createElement('div');
            tab.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:9px;height:' + h + 'px;background:' + COLOR + ';border-radius:0 3px 3px 0';
            frag.appendChild(tab);
        });
        L.appendChild(frag);
    }
    function soon() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
    document.addEventListener('selectionchange', soon);
    document.addEventListener('mouseup', soon, true);
    window.addEventListener('resize', soon);
    document.addEventListener('scroll', soon, true);
})();

// ==========================================
// MULTI-LINE DELETE, THE SAME IN EVERY BROWSER!
// When a selection spans several lines, the app deletes EXACTLY the range you see
// highlighted (some browsers only delete the last line when a drag ends at the margin)!
// ==========================================
(function () {
    if (typeof canvas === 'undefined' || !canvas) return;
    const ed = canvas;
    return; // Replaced by block-editor.js (every line is its own box now)!
    const LEAF = 'div, p, h1, h2, h3, h4, h5, h6, blockquote, li, pre';
    const NESTED = 'div, p, h1, h2, h3, h4, h5, h6, blockquote, li, ul, ol, pre, table';
    let busy = false, lastUndo = null;

    function leafOf(node) {
        let n = node && (node.nodeType === 1 ? node : node.parentNode);
        while (n && n !== ed) {
            if (n.matches && n.matches(LEAF) && !n.querySelector(NESTED)) return n;
            n = n.parentNode;
        }
        return null;
    }
    // A boundary that sits directly on the canvas points at a child: use that child's leaf!
    function boundaryLeaf(container, offset, isEnd) {
        if (container === ed) {
            const kids = ed.childNodes;
            const k = isEnd ? kids[offset - 1] : kids[offset];
            if (!k) return null;
            if (k.nodeType === 1) { const inner = k.matches && k.matches(LEAF) && !k.querySelector(NESTED) ? k : null; if (inner) return inner; const leaves = k.querySelectorAll(LEAF); const flt = [].filter.call(leaves, function (x) { return !x.querySelector(NESTED); }); return flt.length ? (isEnd ? flt[flt.length - 1] : flt[0]) : null; }
            return null;
        }
        return leafOf(container);
    }
    function spans() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed || !ed.contains(sel.anchorNode) || !ed.contains(sel.focusNode)) return null;
        const R = sel.getRangeAt(0);
        const sb = boundaryLeaf(R.startContainer, R.startOffset, false);
        const eb = boundaryLeaf(R.endContainer, R.endOffset, true);
        // Both ends inside the same line (or the same loose text): the browser handles it!
        if (sb === eb) return null;
        return { R: R, sb: sb, eb: eb, sel: sel };
    }
    function textOffset(range) {
        const pre = document.createRange();
        pre.selectNodeContents(ed);
        pre.setEnd(range.startContainer, range.startOffset);
        return pre.toString().length;
    }
    function deleteSpan(info) {
        if (busy) return;
        busy = true;
        try {
            const R = info.R, sb = info.sb, eb = info.eb, sel = info.sel;
            lastUndo = { html: ed.innerHTML, off: textOffset(R), at: Date.now() };
            const sc = R.startContainer, so = R.startOffset;
            R.deleteContents();
            if (eb && eb !== sb && eb.isConnected) {
                const parent = eb.parentNode;
                if (sb && sb.isConnected && sb !== eb) {
                    // Join the rest of the last line onto the first line!
                    if (!sb.textContent.length && !sb.querySelector('img, input, select, [contenteditable="false"]')) sb.querySelectorAll('br').forEach(function (b) { b.remove(); });
                    while (eb.firstChild) {
                        if (eb.firstChild.nodeName === 'BR' && eb.childNodes.length === 1 && sb.childNodes.length) { eb.firstChild.remove(); break; }
                        sb.appendChild(eb.firstChild);
                    }
                    if (!sb.firstChild) sb.appendChild(document.createElement('br'));
                } else {
                    // The first line is loose text on the canvas: pull the last line's content out beside it!
                    while (eb.firstChild) parent.insertBefore(eb.firstChild, eb);
                }
                let p = parent;
                eb.remove();
                while (p && p !== ed && !p.firstChild) { const up = p.parentNode; p.remove(); p = up; }
            }
            const r = document.createRange();
            try {
                if (sc.isConnected) { r.setStart(sc, Math.min(so, sc.nodeType === 3 ? sc.nodeValue.length : sc.childNodes.length)); }
                else if (sb && sb.isConnected) r.setStart(sb, 0);
                else r.setStart(ed, 0);
            } catch (e) { r.setStart(ed, 0); }
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
            const mine = lastUndo;
            ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent' }));
            mine.after = ed.innerHTML;
            lastUndo = mine;
        } finally { busy = false; }
    }
    ed.addEventListener('keydown', function (e) {
        if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
        const del = e.key === 'Backspace' || e.key === 'Delete';
        const typing = e.key === 'Enter' || (e.key && e.key.length === 1);
        if (!del && !typing) return;
        const info = spans();
        if (!info) return;
        if (del) e.preventDefault();
        deleteSpan(info);
    }, true);
    ed.addEventListener('beforeinput', function (e) {
        if (busy || !e.inputType) return;
        const del = e.inputType.indexOf('delete') === 0;
        const ins = e.inputType.indexOf('insert') === 0 && e.inputType !== 'insertParagraph';
        if (!del && !ins) return;
        const info = spans();
        if (!info) return;
        if (del) e.preventDefault();
        deleteSpan(info);
    });
    ed.addEventListener('cut', function (e) {
        const info = spans();
        if (!info) return;
        try {
            const holder = document.createElement('div');
            holder.appendChild(info.R.cloneContents());
            e.clipboardData.setData('text/plain', info.sel.toString());
            e.clipboardData.setData('text/html', holder.innerHTML);
            e.preventDefault();
        } catch (err) { return; }
        deleteSpan(info);
    }, true);
    // Writeout has no snapshot undo: Cmd/Ctrl+Z right after a multi-line delete puts it back!
    if (typeof bbUndo !== 'function') {
        ed.addEventListener('input', function (e) { if (e.isTrusted) lastUndo = null; });
        ed.addEventListener('keydown', function (e) {
            if (!lastUndo || !lastUndo.after || !(e.metaKey || e.ctrlKey) || e.shiftKey || String(e.key).toLowerCase() !== 'z') return;
            if (ed.innerHTML !== lastUndo.after) { lastUndo = null; return; }
            e.preventDefault();
            ed.innerHTML = lastUndo.html;
            const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
            let t, left = lastUndo.off;
            const r = document.createRange();
            r.setStart(ed, 0);
            while ((t = w.nextNode())) { if (left <= t.nodeValue.length) { r.setStart(t, left); break; } left -= t.nodeValue.length; }
            r.collapse(true);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(r);
            lastUndo = null;
            ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'historyUndo' }));
        }, true);
    }
})();
