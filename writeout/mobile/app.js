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
// Hand-rolled toggle path first (works everywhere!), execCommand fallback!
function applyTextFormatting(commandName) {
    playAeroClickSound(600, 0.08);
    const cmd = String(commandName || '').toLowerCase();
    const tagMap = { bold: 'b', italic: 'i', underline: 'u', strikethrough: 's', strikeThrough: 's', strike: 's' };
    if (tagMap[cmd] && typeof fmtApplyBasicStyle === 'function' && fmtApplyBasicStyle(tagMap[cmd])) {
        return;
    }
    try {
        if (typeof document.execCommand === 'function') document.execCommand(commandName, false, null);
    } catch (e) {}
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
            if (typeof fmtApplyBasicStyle === 'function' && fmtApplyBasicStyle('b')) { autoSaveCanvasContent(); return; }
            try { document.execCommand('bold', false, null); } catch (e) {}
        } else if (styleType === 'italic') {
            if (typeof fmtApplyBasicStyle === 'function' && fmtApplyBasicStyle('i')) { autoSaveCanvasContent(); return; }
            try { document.execCommand('italic', false, null); } catch (e) {}
        } else if (styleType === 'underline') {
            if (typeof fmtApplyBasicStyle === 'function' && fmtApplyBasicStyle('u')) { autoSaveCanvasContent(); return; }
            try { document.execCommand('underline', false, null); } catch (e) {}
        } else if (styleType === 'strike') {
            if (typeof fmtApplyBasicStyle === 'function' && fmtApplyBasicStyle('s')) { autoSaveCanvasContent(); return; }
            try { document.execCommand('strikeThrough', false, null); } catch (e) {}
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
// (Guarded: paintCanvas only exists inside the ::draw console builder below,
// so these touch hooks attach only when a sketchpad is actually present!)
if (typeof paintCanvas !== 'undefined' && paintCanvas) {
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
} // end paintCanvas guard -- dead sketchpad hooks stay parked until ::draw builds one!


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

// ==========================================
// PORTED FROM DESKTOP: HIGHLIGHTER (25 Aero washes!)
// EXIT FORMATTING (Cmd/Ctrl+Shift+E!) + B/I/U/S TOGGLE ROW!
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
    if (main) {
        main.addEventListener('mousedown', function (e) { e.preventDefault(); });
        main.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            fmtToggleHighlightPopup();
        });
    }
    const chev = document.getElementById('hl-chevron-btn');
    if (chev) {
        chev.addEventListener('mousedown', function (e) { e.preventDefault(); });
        chev.addEventListener('click', function () {
            playAeroClickSound(600, 0.08);
            fmtToggleHighlightPopup();
        });
    }
    if (grid) {
        grid.addEventListener('mousedown', function (e) {
            if (e.target.closest && e.target.closest('[data-hl-class]')) e.preventDefault();
        });
        grid.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-hl-class]') : null;
            if (!btn) return;
            playAeroClickSound(600, 0.08);
            fmtApplyHighlight(btn.getAttribute('data-hl-class'));
        });
    }
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

// --- EXIT FORMATTING (global!): Cmd/Ctrl+Shift+E hops out of the current
// style from ANY focus -- canvas, ribbon, or popup -- nodes untouched! ---
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
    const popOpen = document.querySelector('.modal-blur-gate.active:not(#mobile-sidebar-shield)') ||
        ['hl-popup', 'style-picker-popup', 'file-chip-popup', 'help-deck-dialog'].some(function (id) {
            const p = document.getElementById(id);
            if (!p) return false;
            if (typeof p.open === 'boolean') return !!p.open;
            return !p.hidden;
        }) ||
        ['download-menu', 'insert-menu-popup'].some(function (id) {
            const p = document.getElementById(id);
            return p && p.style.display !== 'none';
        });
    if (popOpen) return false;
    return fmtExitFormattingNow();
}

// --- BASIC INLINE STYLES (B/I/U/S!): selection wraps, collapsed caret
// gets a fresh element with the caret parked inside -- zero dependencies!
// Second press frees the NEXT letter: the word keeps its style!
// (Only a fresh empty tag gets removed outright!) ---
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
        // --- Collapsed: inside the style? Free the NEXT letter, keep the word! ---
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
        // --- Expanded: anchored inside the style? Unwrap it! ---
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
            try {
                const host = range.commonAncestorContainer;
                const scope = (host && host.nodeType === 1) ? host : (host && host.parentElement);
                if (scope && scope.querySelectorAll) {
                    Array.from(scope.querySelectorAll('b,strong,i,em,u,s,strike,del')).forEach(function (x) {
                        if (!x.isConnected || !canvas.contains(x)) return;
                        if (!fmtBasicTagMatches(x, tag)) return;
                        let inside = false;
                        try {
                            if (typeof range.intersectsNode === 'function') inside = range.intersectsNode(x);
                            else if (sel.containsNode) inside = sel.containsNode(x, true);
                        } catch (e) { inside = false; }
                        if (inside) fmtUnwrapInline(x);
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

if (typeof canvas !== 'undefined' && canvas) {
    fmtWireHighlighter();
    fmtWireChips();
    fmtWireAqua();
    fmtWireExitAndBasic();
    document.addEventListener('keydown', function (e) {
        fmtExitFormatting(e);
    });
    document.addEventListener('DOMContentLoaded', function () {
        fmtWireHighlighter();
        fmtWireChips();
        fmtWireExitAndBasic();
    });
}
// ==========================================
// PORTED FROM DESKTOP: FORMAT SIDEBAR ENGINE
// (Main/Style/Doc groups + style inspector + page sizes!)
// ==========================================
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
var FMT_STYLE_SPAN_SEL = FMT_HIGHLIGHT_SEL + ', ' + FMT_EFFECT_SEL + ', span[class*="orange-hl-"], span[class*="green-hl-"], span[class*="blue-hl-"], span[class*="pool-hl-"], span[class*="mkt-cp-"], span[class*="bcp-"], span[class*="pill-hl-"], span[class*="hl-"], span[class*="cp-"], span[class*="aq-"]';
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

// ==========================================
// MOBILE FORMAT SIDEBAR ROOT WIRE
// (Groups + sidebar text controls + live inspector refresh!)
// ==========================================

function fmtWireSidebar() {
    if (typeof fmtSetGroup === 'function') fmtSetGroup(fmtStoredGroup(), true);
    if (typeof kdApplyPageSize === 'function') kdApplyPageSize();
    if (typeof fmtWireDocSettings === 'function') fmtWireDocSettings();
    if (typeof fmtWireStylePicker === 'function') fmtWireStylePicker();
    if (typeof fmtWireChips === 'function') fmtWireChips();
    if (typeof fmtWireAqua === 'function') fmtWireAqua();
    if (typeof fmtRenderStyleList === 'function') fmtRenderStyleList();
    const side = document.getElementById('format-sidebar');
    // Sidebar text controls: weight / size / font / color!
    if (side && !side._fmtControlsWired) {
        side._fmtControlsWired = true;
        side.addEventListener('mousedown', function (e) {
            if (e.target.closest && e.target.closest('button')) e.preventDefault();
        });
        side.addEventListener('change', function (e) {
            const action = e.target.getAttribute && e.target.getAttribute('data-edit-action');
            if (!action) return;
            if (action === 'fontWeight') { fmtApplyWeight(e.target.value); autoSaveCanvasContent(); return; }
            if (action === 'fontSizePx') { fmtApplySizePx(e.target.value); autoSaveCanvasContent(); return; }
            if (typeof canvas !== 'undefined' && canvas) {
                try { canvas.focus(); } catch (err) {}
                try {
                    if (typeof document.execCommand === 'function') document.execCommand(action, false, e.target.value);
                } catch (err) {}
                autoSaveCanvasContent();
            }
        });
        side.addEventListener('input', function (e) {
            const action = e.target.getAttribute && e.target.getAttribute('data-edit-action');
            if (!action || action === 'fontWeight' || action === 'fontSizePx') return;
            if (action !== 'foreColor') return;
            if (typeof canvas !== 'undefined' && canvas) {
                try { canvas.focus(); } catch (err) {}
                try {
                    if (typeof document.execCommand === 'function') document.execCommand(action, false, e.target.value);
                } catch (err) {}
                autoSaveCanvasContent();
            }
        });
        side.addEventListener('click', function (e) {
            const reset = e.target.closest ? e.target.closest('[data-reset-action]') : null;
            if (reset) {
                playAeroClickSound(600, 0.08);
                fmtResetColor(reset.getAttribute('data-reset-action'));
                autoSaveCanvasContent();
                fmtUpdateResetButtons();
                return;
            }
            const alignBtn = e.target.closest ? e.target.closest('[data-align]') : null;
            if (alignBtn) {
                playAeroClickSound(600, 0.08);
                fmtAlignBlocks(alignBtn.getAttribute('data-align'));
                return;
            }
            const indentBtn = e.target.closest ? e.target.closest('[data-indent]') : null;
            if (indentBtn) {
                playAeroClickSound(600, 0.08);
                fmtIndentBlocks(indentBtn.getAttribute('data-indent') === 'in' ? 'in' : 'out');
            }
        });
    }
    // Collapse latch (stays visible when collapsed)!
    const toggle = document.getElementById('format-toggle-zone');
    if (toggle && !toggle._fmtLatchWired) {
        toggle._fmtLatchWired = true;
        toggle.addEventListener('click', function () {
            playAeroClickSound(450, 0.12);
            const collapsed = document.body.classList.toggle('format-collapsed');
            const panel = document.getElementById('format-sidebar');
            if (!collapsed && panel && typeof panel.focus === 'function') {
                try { panel.focus(); } catch (e) {}
            }
        });
    }
}

if (typeof canvas !== 'undefined' && canvas) {
    fmtWireSidebar();
    const fmtRefresh = function () {
        if (typeof fmtUpdateScopeHint === 'function') fmtUpdateScopeHint();
        if (typeof fmtRenderStyleList === 'function') fmtRenderStyleList();
        if (typeof fmtSyncAlignButtons === 'function') fmtSyncAlignButtons();
    };
    canvas.addEventListener('keyup', fmtRefresh);
    canvas.addEventListener('mouseup', fmtRefresh);
    document.addEventListener('selectionchange', fmtRefresh);
    document.addEventListener('DOMContentLoaded', function () {
        fmtWireSidebar();
        fmtRefresh();
        if (typeof fmtUpdateResetButtons === 'function') fmtUpdateResetButtons();
    });
}
