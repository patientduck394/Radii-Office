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
        if (sidebar.classList.contains('collapsed')) {
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            toggleIcon.style.transform = 'rotate(0deg)';
        }
    });
}

// RESTORED SIDEBAR ACTIONS: Handlers strictly trigger our explicit filesystem saving loops
document.querySelectorAll('.pad-toggle-btn, #btn-one-time-table').forEach(btn => {
    btn.addEventListener('click', function() {
        // Play the responsive audio blip on every button hover click state
        playAeroClickSound(550, 0.1);
        
        // Use short checks to handle your export/import actions cleanly based on button text
        const actionLabelText = btn.innerText.trim().toLowerCase();
        
        if (actionLabelText.includes('export')) {
            exportKeydownFile();
        } else if (actionLabelText.includes('import')) {
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
initializeAmbientDroplets();

// Launch on application boot directly to Slot 1


// ==========================================
// PART 4: KEYDOWN SHORTCUT & MACRO ENGINE (SECTION A)
// ==========================================
if (canvas) {
    canvas.addEventListener('keydown', function(e) {
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
                textNode.nodeValue = currentLineText.replace('::draw', ''); 
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
// Action: Package view content and generate a .kd text document blob download
let isExporting = false; // Add this global flag variable near the top of your script if not already present

function exportKeydownFile() {
    if (isExporting) return; // Prevent double firing completely!
    isExporting = true;
    setTimeout(() => { isExporting = false; }, 500);

    playAeroClickSound(750, 0.12);
    const canvasInnerContentHTML = canvasViewport.innerHTML;
    const currentTimestampString = new Date().toISOString();

    // Compile un-bloated, human-scannable YAML parameters
    let yamlConfigBlock = "---\n";
    yamlConfigBlock += "app: \"Writedown WYSIWYG Suite\"\n";
    yamlConfigBlock += "format: \"keydown-yaml-canvas\"\n";
    yamlConfigBlock += `exported_at: \"${currentTimestampString}\"\n`;
    yamlConfigBlock += "---\n\n";

    const completePayloadContent = yamlConfigBlock + canvasInnerContentHTML;
    const dataBlobPayload = new Blob([completePayloadContent], { type: 'text/yaml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(dataBlobPayload);
    
    const phantomAnchorLink = document.createElement('a');
    phantomAnchorLink.href = blobUrl;
    phantomAnchorLink.download = 'canvas_snapshot.kd';
    phantomAnchorLink.style.display = 'none';
    
    document.body.appendChild(phantomAnchorLink);
    phantomAnchorLink.click();
    
    setTimeout(() => {
        document.body.removeChild(phantomAnchorLink);
        URL.revokeObjectURL(blobUrl);
    }, 100);
}

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
                // Hydrate the editable layout arena with the stripped code layers directly
                canvasViewport.innerHTML = fullFileStringContent.substring(pureContentTextOffset).trim();
                return;
            }
        }
        canvasViewport.innerHTML = fullFileStringContent;
    };
    fileReaderInstance.readAsText(fileTarget);
}

// Collapsible sidebar drawer movement triggers
if (toggleZoneContainer) {
    toggleZoneContainer.addEventListener('click', function() {
        playAeroClickSound(450, 0.12);
        sidebarPanel.classList.toggle('collapsed');
        toggleIconGlyph.style.transform = sidebarPanel.classList.contains('collapsed') ? 'rotate(180deg)' : 'rotate(0deg)';
    });
}

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
    const wrapper = document.querySelector('.workspace-viewport-wrapper'); // <-- ADDED THIS LINE

    if (!canvas || !selToolbar || !blockToolbar || !wrapper) return; // <-- UPDATED SAFETY CHECK

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
        // 2. Cursor is on an empty new line -> Snap cleanly to cursor coordinates
        else if (isEmptyLine) {
            selToolbar.style.display = 'none';
            document.querySelectorAll('.aero-dropdown').forEach(d => d.classList.remove('active'));
            
            // Calculate precise offset relative to your workspace wrapper container
            let topPos, leftPos;
            if (rect && rect.top !== 0) {
                topPos = rect.top - wrapperRect.top - 40;
                leftPos = rect.left - wrapperRect.left;
            } else {
                // Fallback if rect is zeroed on an empty line
                topPos = 30;
                leftPos = 30;
            }

            blockToolbar.style.top = `${Math.max(10, topPos)}px`;
            blockToolbar.style.left = `${Math.max(10, leftPos)}px`;
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
    button.addEventListener('click', () => {
        playAeroClickSound(600, 0.08);
        const styleType = button.getAttribute('data-style');
        
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

    if (styleAction) {
        if (styleAction === 'code') {
            document.execCommand('insertHTML', false, `<code>${window.getSelection().toString()}</code>`);
        } else {
            document.execCommand(styleAction, false, null);
        }
    } else if (classAction) {
        const selection = window.getSelection();
        if (!selection.isCollapsed) {
            const span = document.createElement('span');
            span.className = classAction;
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
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return null;
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

// ==========================================
// TOP FORMAT BAR & SELECTION SYNC ENGINE
// ==========================================
const topFormatBar = document.getElementById('top-format-bar');

if (topFormatBar) {
    // 1. Handle changes from top toolbar dropdowns & pickers using data-edit-action
    topFormatBar.addEventListener('change', (e) => {
        const action = e.target.getAttribute('data-edit-action');
        if (!action) return;
        
        canvas.focus();
        const value = e.target.value;
        document.execCommand(action, false, value);
        autoSaveCanvasContent();
    });

    topFormatBar.addEventListener('input', (e) => {
        // Handles live color picker updates if using 'input' events
        const action = e.target.getAttribute('data-edit-action');
        if (!action) return;
        
        canvas.focus();
        const value = e.target.value;
        document.execCommand(action, false, value);
        autoSaveCanvasContent();
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

    // Sync Font Size Dropdown
    const sizeSelect = topFormatBar.querySelector('[data-edit-action="fontSize"]');
    if (sizeSelect && computed.fontSize) {
        // Map computed pixel size roughly to execCommand font sizes (1-7) if needed, 
        // or match value if your options use pt/px
    }
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

// ========================================================
// MOBILE TOUCH INJECTIONS FOR ::DRAW CONSOLE
// ========================================================

// Place this directly inside the if (currentLineText === '::draw') block
// exactly where you currently have paintCanvas.addEventListener('mousedown'...)

// Prevent scrolling while drawing on the canvas
paintCanvas.addEventListener('touchstart', function(evt) {
    evt.preventDefault(); 
    isDrawing = true;
    const touch = evt.touches[0];
    const coords = getMouseCoordinates({ clientX: touch.clientX, clientY: touch.clientY });
    lastX = coords.x;
    lastY = coords.y;
}, { passive: false });

paintCanvas.addEventListener('touchmove', function(evt) {
    evt.preventDefault();
    if (!isDrawing) return;
    
    const touch = evt.touches[0];
    const coords = getMouseCoordinates({ clientX: touch.clientX, clientY: touch.clientY });
    
    const sizeSlider = consoleWrapper.querySelector('.brush-size-slider');
    const opacitySlider = consoleWrapper.querySelector('.brush-opacity-slider');
    
    const baseHexColor = colorPicker.value;
    const alphaValue = opacitySlider.value / 100;
    
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
}, { passive: false });

paintCanvas.addEventListener('touchend', function() { isDrawing = false; });
paintCanvas.addEventListener('touchcancel', function() { isDrawing = false; });


// ========================================================
// MOBILE SIDEBAR TRIGGER LOGIC
// ========================================================
// Place this at the top of app.js with your other event listeners
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileShield = document.getElementById('mobile-sidebar-shield');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        playAeroClickSound(550, 0.1);
        sidebarPanel.classList.remove('collapsed');
        mobileShield.classList.add('active');
    });
}

// Allow tapping the blurred background to close the menu
if (mobileShield) {
    mobileShield.addEventListener('click', () => {
        playAeroClickSound(450, 0.12);
        sidebarPanel.classList.add('collapsed');
        mobileShield.classList.remove('active');
    });
}

// ==========================================
// MOBILE MENU TOGGLE LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileShield = document.getElementById('mobile-sidebar-shield');
    const sideMenu = document.getElementById('sidebar');

    if (mobileMenuBtn && sideMenu && mobileShield) {
        // Open sidebar when clicking the hamburger button
        mobileMenuBtn.addEventListener('click', () => {
            if (typeof playAeroClickSound === 'function') playAeroClickSound(550, 0.1);
            sideMenu.classList.remove('collapsed');
            mobileShield.classList.add('active');
        });

        // Close sidebar when clicking the background blur shield
        mobileShield.addEventListener('click', () => {
            if (typeof playAeroClickSound === 'function') playAeroClickSound(450, 0.12);
            sideMenu.classList.add('collapsed');
            mobileShield.classList.remove('active');
        });
    }
});

// ==========================================
// BULLETPROOF MOBILE MENU TRIGGER & CLOSE
// ==========================================
function openMobileMenu() {
    playAeroClickSound(550, 0.1);
    const sideMenu = document.getElementById('sidebar');
    const mobileShield = document.getElementById('mobile-sidebar-shield');
    
    if (sideMenu) sideMenu.classList.remove('collapsed');
    if (mobileShield) mobileShield.classList.add('active');
}

function closeMobileMenu() {
    playAeroClickSound(450, 0.12);
    const sideMenu = document.getElementById('sidebar');
    const mobileShield = document.getElementById('mobile-sidebar-shield');
    
    if (sideMenu) sideMenu.classList.add('collapsed');
    if (mobileShield) mobileShield.classList.remove('active');
}