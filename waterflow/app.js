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
    
    if (canvas) {
        if (padId === "3") {
            canvas.innerHTML = temporaryTableScratchContent;
        } else {
            const saveKeyId = `writedown_save_slot_${padId}`;
            const historicalContent = localStorage.getItem(saveKeyId);
            
            if (historicalContent) {
                canvas.innerHTML = historicalContent;
            } else {
                canvas.innerHTML = `<h1>Pad Slot ${padId}</h1><p>Start writing your document entries here...</p>`;
            }
        }
    }
    
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

// Link button click events to handle pad switches
document.querySelectorAll('.pad-toggle-btn, #btn-one-time-table').forEach(btn => {
    // Map your silver button data-pad slot tag programmatically if missing
    if (btn.id === 'btn-one-time-table') btn.setAttribute('data-pad', "3");

    btn.addEventListener('click', function() {
        const targetPadSlot = btn.getAttribute('data-pad');
        if (targetPadSlot === currentActivePadId) return;
        
        playAeroClickSound(550, 0.1);
        loadActivePadDataStream(targetPadSlot);
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
loadActivePadDataStream("1");


// ==========================================
// PART 4: KEYDOWN SHORTCUT & MACRO ENGINE
// ==========================================
if (canvas) {
    canvas.addEventListener('keydown', function(e) {
        // Only monitor spacebar and regular enter key processing rules
        if (e.key !== ' ' && e.key !== 'Enter') return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType !== Node.TEXT_NODE) return;

        const currentLineText = textNode.nodeValue.substring(0, range.startOffset);
        // --- SECTION A: Block Elements & Double Colon (::) Injections (On Spacebar) ---
        if (e.key === ' ') {
            if (currentLineText === '#') {
                e.preventDefault(); playAeroClickSound(700, 0.1);
                document.execCommand('formatBlock', false, '<h1>');
                textNode.nodeValue = ''; return;
            }
            if (currentLineText === '##') {
                e.preventDefault(); playAeroClickSound(650, 0.1);
                document.execCommand('formatBlock', false, '<h2>');
                textNode.nodeValue = ''; return;
            }
            if (currentLineText === '###') {
                e.preventDefault(); playAeroClickSound(600, 0.1);
                document.execCommand('formatBlock', false, '<h3>');
                textNode.nodeValue = ''; return;
            }
            if (currentLineText === '>') {
                e.preventDefault(); playAeroClickSound(400, 0.15);
                document.execCommand('formatBlock', false, 'blockquote');
                textNode.nodeValue = ''; return;
            }
            if (currentLineText === '*' || currentLineText === '-') {
                e.preventDefault(); playAeroClickSound(550, 0.05);
                document.execCommand('insertUnorderedList', false, null);
                textNode.nodeValue = ''; return;
            }

            // --- Double Colon Visual Injections ---
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
                    // --- Injected Multi-Line Code Block Shortcut ---
            if (currentLineText === '::code') {
                e.preventDefault();
                playAeroClickSound(750, 0.12);
                
                // 1. Build the main parent box (Non-editable layout deck)
                const codeBlockWrapper = document.createElement('div');
                codeBlockWrapper.className = 'writedown-code-block';
                codeBlockWrapper.setAttribute('contenteditable', 'false');
                
                // 2. Build the top header label component
                const header = document.createElement('div');
                header.className = 'code-block-header';
                header.innerHTML = '<span>CODE SPEC</span>';
                
                // 3. Build the editable code text area cavity
                const contentArea = document.createElement('pre');
                contentArea.className = 'code-block-content';
                contentArea.setAttribute('contenteditable', 'true'); // Unlocks internal typing
                contentArea.innerText = '// Paste or write your text lines here...';
                
                // 4. Build the bottom toolbar element layout
                const footer = document.createElement('div');
                footer.className = 'code-block-footer';
                
                // 5. Build the functional copy button orb
                const copyBtn = document.createElement('button');
                copyBtn.className = 'code-copy-btn';
                copyBtn.innerText = 'COPY CODE';
                
                // Wire up the clip copy function directly to the button event hook
                copyBtn.addEventListener('click', function() {
                    playAeroClickSound(600, 0.08);
                    navigator.clipboard.writeText(contentArea.innerText).then(() => {
                        copyBtn.innerText = 'COPIED!';
                        setTimeout(() => { copyBtn.innerText = 'COPY CODE'; }, 1500);
                    });
                });
                
                // 6. Lock the components into the structural window tree wrapper
                footer.appendChild(copyBtn);
                codeBlockWrapper.appendChild(header);
                codeBlockWrapper.appendChild(contentArea);
                codeBlockWrapper.appendChild(footer);
                
                range.insertNode(codeBlockWrapper);
                textNode.nodeValue = '';
                
                // 7. Force focus right inside the text area container safely
                const newRange = document.createRange();
                newRange.selectNodeContents(contentArea);
                newRange.collapse(false);
                selection.removeAllRanges();
                selection.addRange(newRange);
                contentArea.focus();
                return;
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

            // 8 Brand New Custom !# Prefix Tag Highlight Options
            { open: '!#A#', close: '#', className: 'aero-tag-chip tag-chip-a' },
            { open: '!#G#', close: '#', className: 'aero-tag-chip tag-chip-g' },
            { open: '!#O#', close: '#', className: 'aero-tag-chip tag-chip-o' },
            { open: '!#R#', close: '#', className: 'aero-tag-chip tag-chip-r' },
            { open: '!#PR#', close: '#', className: 'aero-tag-chip tag-chip-pr' },
            { open: '!#PK#', close: '#', className: 'aero-tag-chip tag-chip-pk' },
            { open: '!#Y#', close: '#', className: 'aero-tag-chip tag-chip-y' },
            { open: '!#SL#', close: '#', className: 'aero-tag-chip tag-chip-sl' },

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
            { open: '~TIM~',  close: '~GC~',  className: 'applet-gadget-system-clock', isSystemGadclock: true },

            { open: '~FT~',  close: '~FT~',  className: 'jr-folder-tab' },
            { open: '~PT~',  close: '~PT~',  className: 'jr-progress-capsule', isProgCapsule: true },
            { open: '~MC~',  close: '~MC~',  className: 'jr-digital-counter' },
            { open: '~RD~',  close: '~RD~',  className: 'jr-dot-matrix', isDotMatrix: true },
            { open: '~LL~',  close: '~ST~',  className: 'jr-latch-lock', isLatchLock: true },
            { open: '~WR~',  close: '~WR~',  className: 'effect-neon-ribbon' },

            { open: '~DH-B~', close: '~DH-B~', className: 'aero-duplex-input-chassis duplex-chassis-sky', isMultiDuplex: true },
            { open: '~DH-G~', close: '~DH-G~', className: 'aero-duplex-input-chassis duplex-chassis-emerald', isMultiDuplex: true },
            { open: '~DH-O~', close: '~DH-O~', className: 'aero-duplex-input-chassis duplex-chassis-orange', isMultiDuplex: true },
            { open: '~DH-PR~', close: '~DH-PR~', className: 'aero-duplex-input-chassis duplex-chassis-amethyst', isMultiDuplex: true },
            // Style 2: Swayed Rounded Square Variations
            { open: '~SH-B~', close: '~SH-B~', className: 'gel-chip-swayed swayed-sky' },
            { open: '~SH-G~', close: '~SH-G~', className: 'gel-chip-swayed swayed-emerald' },
            { open: '~SH-O~', close: '~SH-O~', className: 'gel-chip-swayed swayed-orange' },
            { open: '~SH-PR~', close: '~SH-PR~', className: 'gel-chip-swayed swayed-amethyst' },
            // Style 3: Rounded Pill Chip Variations
            { open: '~PH-B~', close: '~PH-B~', className: 'gel-chip-pill-variant pill-sky' },
            { open: '~PH-G~', close: '~PH-G~', className: 'gel-chip-pill-variant pill-emerald' },
            { open: '~PH-O~', close: '~PH-O~', className: 'gel-chip-pill-variant pill-orange' },
            { open: '~PH-PR~', close: '~PH-PR~', className: 'gel-chip-pill-variant pill-amethyst' },

            { open: '~PC-Y~', close: '~PC-Y~', className: 'gel-chip-pastel pastel-yellow' },
            { open: '~PC-B~', close: '~PC-B~', className: 'gel-chip-pastel pastel-blue' },
            { open: '~PC-G~', close: '~PC-G~', className: 'gel-chip-pastel pastel-green' },
            { open: '~PC-PK~', close: '~PC-PK~', className: 'gel-chip-pastel pastel-pink' },
            { open: '~PC-PR~', close: '~PC-PR~', className: 'gel-chip-pastel pastel-purple' },
            { open: '~PC-O~', close: '~PC-O~', className: 'gel-chip-pastel pastel-orange' },

            { open: '~DR-O~', close: '~DR-O~', className: 'gel-chip-droplet-ribbon droplet-ribbon-tangerine' },
            { open: '~DR-Y~', close: '~DR-Y~', className: 'gel-chip-droplet-ribbon droplet-ribbon-citrus' },
            { open: '~DR-G~', close: '~DR-G~', className: 'gel-chip-droplet-ribbon droplet-ribbon-emerald' },
            { open: '~DR-B~', close: '~DR-B~', className: 'gel-chip-droplet-ribbon droplet-ribbon-sapphire' },
            { open: '~DR-PR~', close: '~DR-PR~', className: 'gel-chip-droplet-ribbon droplet-ribbon-amethyst' },
            { open: '~DR-PK~', close: '~DR-PK~', className: 'gel-chip-droplet-ribbon droplet-ribbon-fuchsia' },
            { open: '~DR-R~', close: '~DR-R~', className: 'gel-chip-droplet-ribbon droplet-ribbon-crimson' },
            { open: '~DR-SL~', close: '~DR-SL~', className: 'gel-chip-droplet-ribbon droplet-ribbon-slate' },
        ];
        for (let def of definitions) {
            let openIdx = currentLineText.indexOf(def.open);
            if (openIdx === -1) continue;
            if (def.isItalic && (currentLineText.charAt(openIdx + 1) === '*' || currentLineText.charAt(openIdx - 1) === '*')) continue;

            let closeIdx = currentLineText.indexOf(def.close, openIdx + def.open.length);
            if (closeIdx === -1) continue;
            if (def.isItalic && (currentLineText.charAt(closeIdx + 1) === '*' || currentLineText.charAt(closeIdx - 1) === '*')) continue;

            // Target pattern matched securely! Clear input event block execution bounds
            e.preventDefault();

            let beforeText = currentLineText.substring(0, openIdx);
            let targetText = currentLineText.substring(openIdx + def.open.length, closeIdx).trim();
            let afterText = currentLineText.substring(closeIdx + def.close.length);

            textNode.nodeValue = beforeText;

            let newNode;
            if (def.className) {
                newNode = document.createElement('span');
                newNode.className = def.className;
                if (def.isMirror) {
                    newNode.setAttribute('data-text', targetText); newNode.innerText = targetText;
                } else if (def.isWave) {
                    for (let i = 0; i < targetText.length; i++) {
                        const charSpan = document.createElement('span');
                        charSpan.className = 'kinetic-wave-char'; charSpan.innerText = targetText[i];
                        charSpan.style.animationDelay = (i * 0.1) + 's'; newNode.appendChild(charSpan);
                    }
                } else {
                    newNode.innerText = targetText;
                }
                playAeroClickSound(850, 0.12);
            } else {
                newNode = document.createElement(def.tagName);
                newNode.innerText = targetText;
                playAeroClickSound(500, 0.05);
            }

            range.insertNode(newNode);

            const trailingText = afterText + (e.key === ' ' ? ' ' : '\n');
            const trailingNode = document.createTextNode(trailingText);
            newNode.parentNode.insertBefore(trailingNode, newNode.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(trailingNode, trailingText.length);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
                    // --- Attach Live Desktop Applet Behaviors Dynamically ---
            if (def.isFoldout) {
                newNode.addEventListener('click', function() { 
                    playAeroClickSound(500, 0.15); 
                }); 
            } 
            if (def.isToggle) { 
                // Build internal sub-nodes for the physical slider chassis using the correct variable
                newNode.innerHTML = `<span>${targetText}</span><div class="switch-pill"></div>`; 
                newNode.addEventListener('click', function() { 
                    playAeroClickSound(650, 0.08); 
                    newNode.classList.toggle('turned-on'); 
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
            // --- Attach Multi-Input Duplex Generation Logic ---
            if (def.isMultiDuplex) {
                // 1. FORCE THE SELECTION CARRIER TO HIGHLIGHT BOTH TAGS AND INTERNAL TEXT
                const selectRange = document.createRange();
                
                // Lock the boundaries over the text line from the start to the cursor split
                selectRange.setStart(textNode, openIdx);
                selectRange.setEnd(textNode, range.startOffset);
                
                // Delete the entire raw text string chunk off the editor line instantly
                selectRange.deleteContents();

                // 2. BUILD THE EMPTY SINGLE-LINE CONTAINER FRAMEWAY
                newNode.setAttribute('contenteditable', 'false'); // Freeze parent chassis
                
                const leftInput = document.createElement('div');
                leftInput.className = 'input-left';
                leftInput.setAttribute('contenteditable', 'true');
                leftInput.innerText = 'Hello'; // Sets the default text on the left box channel
                
                const rightInput = document.createElement('div');
                rightInput.className = 'input-right';
                rightInput.setAttribute('contenteditable', 'true');
                rightInput.innerText = 'World'; // Sets the default text on the right box channel
                
                newNode.appendChild(leftInput);
                newNode.appendChild(rightInput);
                
                // Plunge the clean double-input box module right into the deleted text slot
                selectRange.insertNode(newNode);
                
                // 3. SECURE CARRET FOCUS INSIDE THE EDITABLE BOX UNITS
                const newRange = document.createRange();
                newRange.selectNodeContents(leftInput);
                newRange.collapse(false);
                selection.removeAllRanges();
                selection.addRange(newRange);
                leftInput.focus();
                
                // Wire up tactile click sound tones to the separate inputs
                leftInput.addEventListener('click', function() { playAeroClickSound(700, 0.05); });
                rightInput.addEventListener('click', function() { playAeroClickSound(750, 0.05); });
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
                loadActivePadDataStream("1");
                
                // 4. Update display banner states to confirm execution success
                wipeBtn.innerText = "REGISTRY PURGED SUCCESS!";
                setTimeout(() => { wipeBtn.innerText = "WIPE ALL PAD HISTORY"; }, 2000);
                closeSettingsWindow();
            }
        });
    }
});
