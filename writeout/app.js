// ==========================================
// PART 1: GLOBAL ELEMENT SELECTORS & STATE
// ==========================================
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
    
    if (currentActivePadId === "3") {
        temporaryTableScratchContent = canvas.innerHTML;
    } else {
        const saveKeyId = `writedown_save_slot_${currentActivePadId}`;
        localStorage.setItem(saveKeyId, canvas.innerHTML);
    }
    // Keep the tab snapshot in lockstep (programmatic edits fire no input event)!
    try {
        if (typeof kdActiveTab === 'function' && typeof kdSaveTabs === 'function') {
            const t = kdActiveTab();
            if (t) t.html = canvas.innerHTML;
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

// Floating spheres on/off (Settings persists writeout_hide_ambient = '1')!
function kdAmbientHidden() {
    try { return localStorage.getItem('writeout_hide_ambient') === '1'; } catch (e) { return false; }
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
            const trailingText = afterText + (e.key === ' ' ? ' ' : '\n');
            const trailingNode = document.createTextNode(trailingText);
            newNode.parentNode.insertBefore(trailingNode, newNode.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(trailingNode, 1); // Positions caret directly right after the element
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

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
                localStorage.removeItem('writedown_save_slot_1');
                localStorage.removeItem('writedown_save_slot_2');
                
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
    return 'writeout';
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
    kdDownloadBlob(dataBlobPayload, 'canvas_snapshot.kd');
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
    const safeTitle = kdEscapeXml(title || 'writeout');
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
    const safeTitle = kdEscapeXml(title || 'writeout');
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

function fmtWireInsertMenu() {
    if (fmtWireInsertMenu._done) return;
    fmtWireInsertMenu._done = true;
    const btn = document.getElementById('insert-menu-btn');
    if (btn) btn.addEventListener('click', toggleInsertMenu);
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
    if (fmt === 'kd') exportKeydownFile();
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

// Action: Read .kd files, strip out the YAML configurations, and render HTML variables
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
        canvasViewport.innerHTML = kdParsedRaw.tabs ? kdRestoreTabs(kdParsedRaw.tabs) : kdRestoreTabs([{ name: 'Main', html: kdParsedRaw.html }]);
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
            let mdName = 'Main';
            const mdTitle = rawMarkdownText.split('\n').find(function (l) { return l.trim().startsWith('# '); });
            if (mdTitle) mdName = mdTitle.replace(/^#+\s*/, '').trim().substring(0, 60) || 'Main';
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
                topPos = caretRect.top - wrapperRect.top - tbH - 12;
                if (topPos < 10) topPos = caretRect.bottom - wrapperRect.top + 12; // Cramped: dock below!
                leftPos = caretRect.left - wrapperRect.left;
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
        document.execCommand('formatBlock', false, `<${e.target.value}>`);
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

// Wrap the selection (or park a collapsed caret) in a styled span!
function fmtWrapInline(prop, value) {
    if (typeof canvas === 'undefined' || !canvas) return false;
    const sel = window.getSelection();
    if (!sel.rangeCount || !canvas.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    try {
        const span = document.createElement('span');
        span.style.setProperty(prop, value);
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
function fmtApplyPickerClass(cls) {
    try {
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

var FMT_PICKER_VIEW_KEY = 'writeout_picker_view';
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
    const items = isExt ? fmtExtensionVariants() : FMT_DEFAULT_STYLES;
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
            playAeroClickSound(600, 0.08);
            const cls = btn.getAttribute('data-picker-class');
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
// (Page size rides along inside every .KD snapshot!)
// ==========================================
var FMT_GROUP_KEY = 'writeout_format_group';
var KD_PAGE_SIZE_KEY = 'writeout_page_size';
var KD_PAGE_ORIENT_KEY = 'writeout_page_orientation';
var KD_PAGE_SIZES = [
    { id: 'kd', name: 'KD Document', hint: 'current canvas size' },
    { id: 'a4', name: 'A4', w: 794, h: 1123 },
    { id: 'a5', name: 'A5', w: 559, h: 794 },
    { id: 'a3', name: 'A3', w: 1123, h: 1587 },
    { id: 'letter', name: 'Letter', w: 816, h: 1056 },
    { id: 'legal', name: 'Legal', w: 816, h: 1344 }
];
var kdPageSizeId = 'kd';
var kdPageOrient = 'portrait';
var KD_DOC_PASSWORD_KEY = 'writeout_doc_password';
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

// Shared .KD content loader (locked imports resume here after unlock)!
function kdLoadDocContent(afterText) {
    const kdParsedFile = kdParseTabsFence(String(afterText || '').trim());
    canvasViewport.innerHTML = kdParsedFile.tabs ? kdRestoreTabs(kdParsedFile.tabs) : kdRestoreTabs([{ name: 'Main', html: kdParsedFile.html }]);
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

// Front-matter document settings ride inside every .KD file!
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
    }

    // Sync Font Weight Dropdown (snap the caret's computed weight to the nearest step!)
    const weightSelect = topFormatBar.querySelector('[data-edit-action="fontWeight"]');
    if (weightSelect && computed.fontWeight) {
        const w = String(computed.fontWeight).toLowerCase();
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
        const px = Math.round(parseFloat(computed.fontSize));
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
    const mobileTargetUrl = 'mobile.html'; 
    
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
    hint.textContent = fmtScopeRange().whole ? 'Scope: Document' : 'Scope: Selection';
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
        fmtUnwrap(el);
        return true;
    }, false);
}

var FMT_STYLE_TAGS = ['B', 'STRONG', 'I', 'EM', 'U', 'STRIKE', 'S', 'A', 'CODE'];
var FMT_STYLE_SPAN_SEL = FMT_HIGHLIGHT_SEL + ', ' + FMT_EFFECT_SEL + ', span[class*="orange-hl-"], span[class*="green-hl-"], span[class*="blue-hl-"], span[class*="pool-hl-"], span[class*="mkt-cp-"], span[class*="bcp-"], span[class*="pill-hl-"]';
var FMT_INLINE_PROPS = [
    { prop: 'fontWeight', cssProp: 'font-weight', css: 'bold', label: 'Bold', test: function (v) { return v === 'bold' || v === 'bolder' || parseInt(v, 10) >= 600; } },
    { prop: 'fontStyle', cssProp: 'font-style', css: 'italic', label: 'Italic', test: function (v) { return v === 'italic' || v === 'oblique'; } },
    { prop: 'fontSize', cssProp: 'font-size', css: '18px', label: 'Size', test: function (v) { return !!(v || '').trim(); } },
    { prop: 'textDecoration', cssProp: 'text-decoration', css: 'underline', label: 'Underline', test: function (v) { return (v || '').indexOf('underline') !== -1; } },
    { prop: 'textDecoration', cssProp: 'text-decoration', css: 'line-through', label: 'Strikethrough', test: function (v) { return (v || '').indexOf('line-through') !== -1; } }
];

function fmtCheckInline(el, consider) {
    if (!el || !el.style) return;
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
                        consider('cls:' + el.className, { kind: 'cls', cls: el.className, label: el.className, el: el });
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

if (typeof canvas !== 'undefined' && canvas) {
    fmtWireSidebar();
    kdWireLockDialog();
    fmtWireInsertMenu();
    fmtWireFileChip();
    const fmtRefresh = function () { fmtUpdateScopeHint(); fmtRenderStyleList(); fmtSyncAlignButtons(); };
    canvas.addEventListener('keyup', fmtRefresh);
    canvas.addEventListener('mouseup', fmtRefresh);
    document.addEventListener('selectionchange', fmtRefresh);
    document.addEventListener('DOMContentLoaded', function () {
        fmtWireSidebar();
        fmtRefresh();
        fmtUpdateResetButtons();
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
// everything persists to localStorage AND inside .kd files!
// ==========================================
var kdTabs = [];
var kdActiveTabId = null;
var kdExpandedTabs = {};
var KD_TABS_KEY = 'writeout_tabs_v1';
var KD_TAB_ACTIVE_KEY = 'writeout_tabs_active';

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

var KD_RESTORE_KEY = 'writeout_restore_docs';

// Restoring is ON by default (only an explicit '0' wipes on boot)!
function kdRestoreEnabled() {
    try { return localStorage.getItem(KD_RESTORE_KEY) !== '0'; } catch (e) { return true; }
}

function kdFreshTabs() {
    // Fresh start: wipe all pages + outlines, then seed one empty Main!
    try {
        localStorage.removeItem(KD_TABS_KEY);
        localStorage.removeItem(KD_TAB_ACTIVE_KEY);
        localStorage.removeItem('writedown_save_slot_1');
        localStorage.removeItem('writedown_save_slot_2');
    } catch (e) {}
    kdTabs = [{ id: kdTabId(), name: 'Main', html: '' }];
    kdActiveTabId = kdTabs[0].id;
    kdExpandedTabs = {};
    kdSaveTabs();
}

function kdLoadTabs() {
    if (!kdRestoreEnabled()) { kdFreshTabs(); return; }
    // Restore the saved document: pages, outlines, and active tab survive reloads!
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
        try { legacy = localStorage.getItem('writedown_save_slot_1') || ''; } catch (e) {}
        kdTabs = [{ id: kdTabId(), name: 'Main', html: legacy }];
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
            playAeroClickSound(600, 0.08);
            kdActivateTab(tab.id);
        });
        name.addEventListener('dblclick', function () {
            if (typeof window.prompt !== 'function') return;
            let next = null;
            try { next = window.prompt('Rename page', tab.name); } catch (e) { return; }
            if (next && next.trim()) {
                tab.name = next.trim().substring(0, 60);
                kdSaveTabs();
                kdRenderTabs();
            }
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

// --- Tabs fence inside .kd files (appended after the canvas HTML!) ---
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
    if (!kdTabs.length) kdTabs = [{ id: kdTabId(), name: 'Main', html: '' }];
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
        while (kdTabs.some(function (t) { return t.name === 'Page ' + n; })) n++;
        kdTabs.push({ id: kdTabId(), name: 'Page ' + n, html: '' });
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