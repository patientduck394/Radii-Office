let currentTool = 'select';
let objects = [];
let selectedIndices = []; // Multi-selection index array
let activePathNodes = [];

let isDrawingShape = false;
let isMovingShape = false;
let isScalingShape = false;
let isMultiSelecting = false;
let selectBoxStart = { x: 0, y: 0 };
let selectBoxCurrent = { x: 0, y: 0 };

let isPencilDrawing = false;
let pencilPoints = [];
let startPoint = { x: 0, y: 0 };
let currentDragPos = { x: 0, y: 0 };
let dragTarget = null;

// Global Active Palette State
let activePrimaryColor = '#A305FF';
let activeSecondaryColor = '#38bdf8';

// Inspector panel state: 'design' or 'style' (Stroke & Fill)
let inspectorTab = 'design';
// Style sub-panel state: 'fill' or 'stroke'
let styleTab = 'fill';
// Gradient stop selection + drag state (per-object selected stop index)
let fillStopSel = {};
let strokeStopSel = {};
let stopDrag = null;
// Guard: marker pointerup rebuilds the track, which can retarget the
// follow-up click onto the track itself (adding a phantom stop).
// Marker interactions set this timestamp; track clicks ignore clicks before it.
let suppressTrackClickUntil = 0;

// Canvas Zoom & Pan
let zoomLevel = 1;
let panOffset = { x: 0, y: 0 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
const CANVAS_BOUNDS = { width: 1200, height: 800 };

const svg = document.getElementById('viewport');
const defs = document.getElementById('svg-defs');
const drawLayer = document.getElementById('drawing-layer');
const previewLayer = document.getElementById('preview-layer');
const uiLayer = document.getElementById('ui-layer');

// Web Audio API Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playUISound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'click') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
            gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'snap') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
            gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.08);
            osc.start(now); osc.stop(now + 0.08);
        } else if (type === 'delete') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.1);
            gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        }
    } catch(e){}
}

function setTool(tool) {
    currentTool = tool;
    playUISound('click');
    document.querySelectorAll('.tools-grid .pad-toggle-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${tool}`);
    if (activeBtn) activeBtn.classList.add('active');
    document.getElementById('current-tool-text').innerText = tool.toUpperCase();

    if ((tool === 'node' || tool === 'bezier') && selectedIndices.length > 0) {
        convertSelectedToPath();
    } else if (tool !== 'bezier' && tool !== 'node' && activePathNodes.length > 0) {
        finalizeBezierPath();
    }
    render();
}

function clearCanvas() {
    playUISound('delete');
    objects = []; selectedIndices = []; activePathNodes = []; render();
}

function getMousePos(evt) {
    const rect = svg.getBoundingClientRect();
    let rawX = (evt.clientX - rect.left - panOffset.x) / zoomLevel;
    let rawY = (evt.clientY - rect.top - panOffset.y) / zoomLevel;
    return {
        x: Math.max(0, Math.min(CANVAS_BOUNDS.width, rawX)),
        y: Math.max(0, Math.min(CANVAS_BOUNDS.height, rawY))
    };
}

// Right Click Animation & Context Menu Trigger
window.addEventListener('DOMContentLoaded', () => {
    svg.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        playUISound('click');
        const menu = document.getElementById("context-menu");
        if (!menu) return;

        menu.style.left = e.clientX + "px";
        menu.style.top = e.clientY + "px";
        menu.classList.remove("hiding");
        menu.classList.add("show");
    });

    document.addEventListener("click", () => {
        const menu = document.getElementById("context-menu");
        if (menu && menu.classList.contains("show")) {
            menu.classList.remove("show");
            menu.classList.add("hiding");
            setTimeout(() => menu.classList.remove("hiding"), 120);
        }
    });

    document.addEventListener("click", (e) => {
        ['stroke-popup', 'stroke2-popup', 'fill-popup', 'fill2-popup'].forEach(id => {
            const popup = document.getElementById(id);
            if (!popup || popup.style.display === 'none' || popup.style.display === '') return;
            if (popup.contains(e.target)) return;
            const swatchId = id.replace('popup', 'swatch');
            const swatch = document.getElementById(swatchId);
            if (swatch && swatch.contains(e.target)) return;
            popup.style.display = 'none';
        });
    });

    const aeroTooltip = document.getElementById("aero-tooltip");
    function placeAeroTooltip(x, y) {
        if (!aeroTooltip) return;
        const pad = 8, offX = 14, offY = 18;
        const w = aeroTooltip.offsetWidth || 0, h = aeroTooltip.offsetHeight || 0;
        let lx = x + offX, ly = y + offY;
        lx = Math.max(pad, Math.min(window.innerWidth - w - pad, lx));
        ly = Math.max(pad, Math.min(window.innerHeight - h - pad, ly));
        aeroTooltip.style.left = lx + "px";
        aeroTooltip.style.top = ly + "px";
    }
    document.addEventListener("mouseover", (e) => {
        const t = e.target && e.target.closest ? e.target.closest("[data-tooltip]") : null;
        if (!t || !aeroTooltip) return;
        aeroTooltip.textContent = t.getAttribute("data-tooltip") || "";
        aeroTooltip.classList.add("show");
        placeAeroTooltip(e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", (e) => {
        if (!aeroTooltip || !aeroTooltip.classList.contains("show")) return;
        const t = e.target && e.target.closest ? e.target.closest("[data-tooltip]") : null;
        if (!t) { aeroTooltip.classList.remove("show"); return; }
        const tip = t.getAttribute("data-tooltip") || "";
        if (aeroTooltip.textContent !== tip) aeroTooltip.textContent = tip;
        placeAeroTooltip(e.clientX, e.clientY);
    });
    document.addEventListener("mouseout", (e) => {
        const t = e.target && e.target.closest ? e.target.closest("[data-tooltip]") : null;
        if (!t || !aeroTooltip) return;
        const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest("[data-tooltip]") : null;
        if (to === t) return;
        aeroTooltip.classList.remove("show");
    });
    document.addEventListener("click", () => { if (aeroTooltip) aeroTooltip.classList.remove("show"); }, true);

    document.addEventListener("click", (e) => {
        [['ops-popup', 'ops-btn'], ['edit-popup', 'edit-btn']].forEach(([popId, btnId]) => {
            const pop = document.getElementById(popId);
            if (pop && pop.style.display !== 'none' && pop.style.display !== '') {
                const btn = document.getElementById(btnId);
                if (!pop.contains(e.target) && !(btn && btn.contains(e.target))) pop.style.display = 'none';
            }
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === 'Escape') {
            closeOpsPopup();
            closeEditPopup();
            ['stroke-popup', 'stroke2-popup', 'fill-popup', 'fill2-popup'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            return;
        }
        const t = e.target;
        const tag = t && t.tagName;
        const inputType = (tag === 'INPUT' && t.type) ? String(t.type).toLowerCase() : '';
        const isTextEdit = tag === 'TEXTAREA' || (t && t.isContentEditable) ||
            (tag === 'INPUT' && /^(text|number|search|password|url|email|tel)$/.test(inputType)) ||
            tag === 'SELECT';
        const kd = (e.key || '').toLowerCase();
        if (kd === 'enter' && isTextEdit) { t.blur(); return; }
        // Backspace/Delete belong to the app everywhere except real text
        // editing (plain Backspace must work — no modifier gate here).
        if ((kd === 'backspace' || kd === 'delete') && !isTextEdit) {
            e.preventDefault();
            if (selectedIndices.length > 0) deleteSelectedObject();
            return;
        }
        if (isTextEdit) return;
        if (!(e.metaKey || e.ctrlKey)) return;
        if (kd === 'd' && !e.shiftKey) { e.preventDefault(); duplicateSelected(); return; }
        // Union = Cmd/Ctrl + "+" (aka Cmd/Ctrl + Shift + "=") ; Subtract = Cmd/Ctrl + "-"
        if (e.key === '+' || e.key === '=') { e.preventDefault(); doBooleanOp('union'); return; }
        if (e.key === '-' || e.key === '_') { e.preventDefault(); doBooleanOp('subtract'); return; }
        if (!e.shiftKey) return;
        const k = (e.key || '').toLowerCase();
        const opsMap = {
            i: () => doBooleanOp('intersect'),
            x: () => doBooleanOp('exclude'),
            c: () => doMask(),
            m: () => doClip(),
            g: () => releaseOp(),
            p: () => convertToPathMenu()
        };
        if (opsMap[k]) { e.preventDefault(); opsMap[k](); }
    });
});

svg.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    if (evt.ctrlKey || evt.altKey) {
        // Pinch-to-zoom (trackpads report it with ctrlKey) or Alt+wheel:
        // cursor-anchored zoom.
        const rect = svg.getBoundingClientRect();
        const mouseX = evt.clientX - rect.left;
        const mouseY = evt.clientY - rect.top;
        const worldX = (mouseX - panOffset.x) / zoomLevel;
        const worldY = (mouseY - panOffset.y) / zoomLevel;
        let zoomFactor = Math.exp(-evt.deltaY * 0.00405);
        zoomFactor = Math.max(0.65, Math.min(1.5, zoomFactor));
        const newZoom = Math.max(0.2, Math.min(5, zoomLevel * zoomFactor));
        panOffset.x = mouseX - worldX * newZoom;
        panOffset.y = mouseY - worldY * newZoom;
        zoomLevel = newZoom;
        applyTransform();
        return;
    }
    // Two-finger scroll / mouse wheel: pan the canvas (natural direction).
    let dx = evt.deltaX, dy = evt.deltaY;
    if (evt.deltaMode === 1) { dx *= 16; dy *= 16; }
    else if (evt.deltaMode === 2) {
        const rect = svg.getBoundingClientRect();
        dx *= rect.width; dy *= rect.height;
    }
    panOffset.x -= dx; panOffset.y -= dy;
    applyTransform();
}, { passive: false });

function applyTransform() {
    drawLayer.setAttribute('transform', `translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`);
    previewLayer.setAttribute('transform', `translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`);
    uiLayer.setAttribute('transform', `translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`);
}

function handleCanvasMouseDown(evt) {
    if (colorPickMode) { sampleColorFromCanvas(evt); if (evt.stopPropagation) evt.stopPropagation(); return; }
    if (evt.button === 2) return; // Ignore right clicks for drawing
    const pt = getMousePos(evt);
    startPoint = pt; currentDragPos = pt;

    if (currentTool === 'zoom') {
        isPanning = true;
        panStart = { x: evt.clientX - panOffset.x, y: evt.clientY - panOffset.y };
        return;
    }

    if (currentTool === 'eraser') {
        if (selectedIndices.length > 0 && evt.target !== svg) deleteSelectedObject();
        return;
    }

    if (currentTool === 'eyedropper') {
        if (selectedIndices.length > 0) {
            const obj = objects[selectedIndices[0]];
            activePrimaryColor = obj.fill && obj.fill.startsWith('#') ? obj.fill : '#A305FF';
            playUISound('snap');
            setTool('select');
        }
        return;
    }

    if (currentTool === 'pencil') {
        isPencilDrawing = true;
        pencilPoints = [{ x: pt.x, y: pt.y, cx1: pt.x, cy1: pt.y, cx2: pt.x, cy2: pt.y }];
        return;
    }

    if (currentTool === 'select') {
        if (evt.target.classList.contains('scale-handle')) {
            isScalingShape = true;
        } else if (selectedIndices.length > 0 && evt.target !== svg && evt.target.classList.contains('shape-element')) {
            isMovingShape = true;
        } else {
            // Unselect or start multi-select box
            selectBoxStart = pt;
            selectBoxCurrent = pt;
            isMultiSelecting = true;
            if (!evt.shiftKey) selectedIndices = [];
            render();
        }
    } else if (currentTool === 'bezier') {
        const selNodes = selectedPathNodes();
        if (selNodes) {
            selNodes.push({ x: pt.x, y: pt.y, cx1: pt.x - 30, cy1: pt.y, cx2: pt.x + 30, cy2: pt.y });
        } else {
            activePathNodes.push({ x: pt.x, y: pt.y, cx1: pt.x - 30, cy1: pt.y, cx2: pt.x + 30, cy2: pt.y });
        }
        playUISound('snap');
        render();
    } else if (currentTool === 'text') {
        const newText = {
            type: 'text', text: 'Inkpath', fontSize: 28, fontFamily: 'JetBrains Mono',
            fontWeight: 'bold', textAlign: 'start', x: pt.x, y: pt.y,
            fill: activePrimaryColor, fillType: 'color', stroke: '#ffffff', strokeWidth: 1, opacity: 1, blur: 0, rotation: 0
        };
        objects.push(newText);
        selectedIndices = [objects.length - 1];
        playUISound('snap');
        setTool('select');
    } else {
        isDrawingShape = true;
    }
}

function handleCanvasMouseMove(evt) {
    if (isPanning) {
        panOffset.x = evt.clientX - panStart.x;
        panOffset.y = evt.clientY - panStart.y;
        applyTransform();
        return;
    }

    const pt = getMousePos(evt);

    if (isMultiSelecting) {
        selectBoxCurrent = pt;
        renderMultiSelectBox();
        return;
    }

    if (isPencilDrawing) {
        pencilPoints.push({ x: pt.x, y: pt.y, cx1: pt.x, cy1: pt.y, cx2: pt.x, cy2: pt.y });
        renderPreviewPencil();
        return;
    }

    if (dragTarget) {
        let nodes = selectedPathNodes();
        if (!nodes) nodes = currentTool === 'bezier' ? activePathNodes : (selectedIndices.length > 0 ? objects[selectedIndices[0]].nodes : null);
        if (nodes) {
            if (dragTarget.kind === 'node') {
                const node = nodes[dragTarget.index];
                const dx = pt.x - node.x, dy = pt.y - node.y;
                node.x = pt.x; node.y = pt.y;
                node.cx1 += dx; node.cy1 += dy;
                node.cx2 += dx; node.cy2 += dy;
            } else if (dragTarget.kind === 'control1') {
                nodes[dragTarget.index].cx1 = pt.x; nodes[dragTarget.index].cy1 = pt.y;
            } else if (dragTarget.kind === 'control2') {
                nodes[dragTarget.index].cx2 = pt.x; nodes[dragTarget.index].cy2 = pt.y;
            }
        }
        render();
        return;
    }

    if (isMovingShape && selectedIndices.length > 0) {
        const dx = pt.x - currentDragPos.x, dy = pt.y - currentDragPos.y;
        selectedIndices.forEach(idx => moveObject(objects[idx], dx, dy));
        currentDragPos = pt;
        render();
        return;
    }

    if (isScalingShape && selectedIndices.length > 0) {
        const scaleFactor = 1 + (pt.x - currentDragPos.x) / 100;
        selectedIndices.forEach(idx => scaleObject(objects[idx], scaleFactor));
        currentDragPos = pt;
        render();
        return;
    }

    if (isDrawingShape || currentTool === 'bezier') {
        currentDragPos = pt;
        renderPreviewShape();
    }
}

function handleCanvasMouseUp(evt) {
    isPanning = false;

    if (isMultiSelecting) {
        isMultiSelecting = false;
        previewLayer.innerHTML = '';
        calculateBoxMultiSelection();
        render();
        return;
    }

    if (isPencilDrawing) {
        isPencilDrawing = false;
        if (pencilPoints.length > 1) {
            objects.push({
                type: 'path', nodes: pencilPoints, fill: 'none', fillType: 'none',
                stroke: activePrimaryColor, strokeWidth: 3, opacity: 1, blur: 0, rotation: 0
            });
            selectedIndices = [objects.length - 1];
            playUISound('snap');
        }
        previewLayer.innerHTML = '';
        render();
        return;
    }

    if (isDrawingShape) {
        createShapeFromDrag(startPoint, getMousePos(evt));
        isDrawingShape = false;
        previewLayer.innerHTML = '';
        playUISound('snap');
        render();
    }
    isMovingShape = false; isScalingShape = false; dragTarget = null;
}

function renderMultiSelectBox() {
    previewLayer.innerHTML = '';
    const x = Math.min(selectBoxStart.x, selectBoxCurrent.x);
    const y = Math.min(selectBoxStart.y, selectBoxCurrent.y);
    const w = Math.abs(selectBoxCurrent.x - selectBoxStart.x);
    const h = Math.abs(selectBoxCurrent.y - selectBoxStart.y);

    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('x', x); box.setAttribute('y', y);
    box.setAttribute('width', w); box.setAttribute('height', h);
    box.setAttribute('fill', 'rgba(163, 5, 255, 0.15)');
    box.setAttribute('stroke', '#A305FF');
    box.setAttribute('stroke-width', '1');
    box.setAttribute('stroke-dasharray', '4 4');
    previewLayer.appendChild(box);
}

function calculateBoxMultiSelection() {
    const x1 = Math.min(selectBoxStart.x, selectBoxCurrent.x);
    const y1 = Math.min(selectBoxStart.y, selectBoxCurrent.y);
    const x2 = Math.max(selectBoxStart.x, selectBoxCurrent.x);
    const y2 = Math.max(selectBoxStart.y, selectBoxCurrent.y);

    if (Math.abs(x2 - x1) < 4 && Math.abs(y2 - y1) < 4) return;

    selectedIndices = [];
    objects.forEach((obj, idx) => {
        const c = getCenter(obj);
        if (c.x >= x1 && c.x <= x2 && c.y >= y1 && c.y <= y2) {
            selectedIndices.push(idx);
        }
    });
    if (selectedIndices.length > 0) playUISound('snap');
}

function createShapeFromDrag(p1, p2) {
    const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
    if (w < 2 && h < 2 && currentTool !== 'line') return;

    const baseStyle = { fill: activePrimaryColor, fill2: activeSecondaryColor, fillType: 'color', fillAngle: 0, stroke: '#ffffffff', stroke2: '#38bdf8ff', strokeType: 'color', strokeAngle: 0, strokeWidth: 2, rx: 6, opacity: 1, blur: 0, rotation: 0 };
    let newShape = null;

    if (currentTool === 'rect') newShape = { type: 'rect', x, y, width: w, height: h, ...baseStyle };
    else if (currentTool === 'roundrect') newShape = { type: 'rect', x, y, width: w, height: h, ...baseStyle, rx: 18 };
    else if (currentTool === 'circle') newShape = { type: 'circle', cx: p1.x, cy: p1.y, r: Math.hypot(p2.x - p1.x, p2.y - p1.y), ...baseStyle };
    else if (currentTool === 'ellipse') newShape = { ...baseStyle, type: 'ellipse', cx: x + w / 2, cy: y + h / 2, rx: Math.max(w / 2, 4), ry: Math.max(h / 2, 4) };
    else if (currentTool === 'line') newShape = { type: 'line', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...baseStyle, fillType: 'none', stroke: activePrimaryColor, strokeWidth: 3 };
    else if (currentTool === 'triangle') newShape = { type: 'polygon', cx: p1.x, cy: p1.y, r: Math.hypot(p2.x - p1.x, p2.y - p1.y), sides: 3, ...baseStyle };
    else if (currentTool === 'polygon') newShape = { type: 'polygon', cx: p1.x, cy: p1.y, r: Math.hypot(p2.x - p1.x, p2.y - p1.y), sides: 5, ...baseStyle };
    else if (currentTool === 'star') newShape = { type: 'star', cx: p1.x, cy: p1.y, r: Math.hypot(p2.x - p1.x, p2.y - p1.y), points: 5, ...baseStyle };

    if (newShape) { objects.push(newShape); selectedIndices = [objects.length - 1]; }
}

function moveObject(obj, dx, dy) {
    if (!obj) return;
    if (obj.type === 'rect' || obj.type === 'text') { obj.x += dx; obj.y += dy; }
    else if (obj.type === 'circle' || obj.type === 'ellipse' || obj.type === 'polygon' || obj.type === 'star') { obj.cx += dx; obj.cy += dy; }
    else if (obj.type === 'line') { obj.x1 += dx; obj.y1 += dy; obj.x2 += dx; obj.y2 += dy; }
    else if (obj.type === 'path') { obj.nodes.forEach(n => { n.x += dx; n.y += dy; n.cx1 += dx; n.cy1 += dy; n.cx2 += dx; n.cy2 += dy; }); }
    else if (obj.type === 'boolean' && Array.isArray(obj.children)) { obj.children.forEach(c => moveObject(c, dx, dy)); }
    else if ((obj.type === 'clip' || obj.type === 'mask')) {
        if (obj.clip) moveObject(obj.clip, dx, dy);
        if (obj.mask) moveObject(obj.mask, dx, dy);
        if (Array.isArray(obj.children)) obj.children.forEach(c => moveObject(c, dx, dy));
    }
}

function scaleObject(obj, s) {
    if (!obj || !isFinite(s) || s <= 0) return;
    if (obj.type === 'rect') { obj.width *= s; obj.height *= s; }
    else if (obj.type === 'circle' || obj.type === 'polygon' || obj.type === 'star') { obj.r *= s; }
    else if (obj.type === 'ellipse') { obj.rx *= s; obj.ry *= s; }
    else if (obj.type === 'text') { obj.fontSize = Math.round(obj.fontSize * s); }
    else if (obj.type === 'path' && Array.isArray(obj.nodes) && obj.nodes.length > 0) {
        const bb = shapeBBox(obj);
        scaleObjectAbout(obj, s, bb.x + bb.w / 2, bb.y + bb.h / 2);
    }
    else if (obj.type === 'boolean' || obj.type === 'clip' || obj.type === 'mask') {
        const bb = shapeBBox(obj);
        scaleObjectAbout(obj, s, bb.x + bb.w / 2, bb.y + bb.h / 2);
    }
}

// Scale geometry about a fixed center, so operated groups grow as one whole
// instead of each part growing in place.
function scaleObjectAbout(obj, s, cx, cy) {
    if (!obj || !isFinite(s) || s <= 0) return;
    const px = (x) => cx + (x - cx) * s, py = (y) => cy + (y - cy) * s;
    if (obj.type === 'rect' || obj.type === 'text') {
        obj.x = px(obj.x); obj.y = py(obj.y);
        if (obj.type === 'rect') { obj.width *= s; obj.height *= s; }
        else obj.fontSize = Math.max(1, Math.round((obj.fontSize || 28) * s));
    }
    else if (obj.type === 'circle' || obj.type === 'ellipse' || obj.type === 'polygon' || obj.type === 'star') {
        obj.cx = px(obj.cx); obj.cy = py(obj.cy);
        if (obj.type === 'circle' || obj.type === 'polygon' || obj.type === 'star') obj.r *= s;
        else { obj.rx *= s; obj.ry *= s; }
    }
    else if (obj.type === 'line') { obj.x1 = px(obj.x1); obj.y1 = py(obj.y1); obj.x2 = px(obj.x2); obj.y2 = py(obj.y2); }
    else if (obj.type === 'path' && Array.isArray(obj.nodes)) {
        obj.nodes.forEach(n => {
            n.x = px(n.x); n.y = py(n.y);
            n.cx1 = px(n.cx1); n.cy1 = py(n.cy1);
            n.cx2 = px(n.cx2); n.cy2 = py(n.cy2);
        });
    }
    else if (obj.type === 'boolean' && Array.isArray(obj.children)) { obj.children.forEach(c => scaleObjectAbout(c, s, cx, cy)); }
    else if (obj.type === 'clip' || obj.type === 'mask') {
        if (obj.clip) scaleObjectAbout(obj.clip, s, cx, cy);
        if (obj.mask) scaleObjectAbout(obj.mask, s, cx, cy);
        if (Array.isArray(obj.children)) obj.children.forEach(c => scaleObjectAbout(c, s, cx, cy));
    }
}

function shapeToNodes(obj) {
    if (!obj || obj.type === 'path') return null;
    const P = (x, y) => ({ x, y, cx1: x, cy1: y, cx2: x, cy2: y });
    if (obj.type === 'rect') {
        const x = obj.x || 0, y = obj.y || 0, w = obj.width || 0, h = obj.height || 0;
        const rx = clampNum(obj.rx || 0, 0, Math.min(w, h) / 2);
        if (!(rx > 0)) {
            return [
                { x: x, y: y, cx1: x, cy1: y, cx2: x, cy2: y },
                { x: x + w, y: y, cx1: x + w, cy1: y, cx2: x + w, cy2: y },
                { x: x + w, y: y + h, cx1: x + w, cy1: y + h, cx2: x + w, cy2: y + h },
                { x: x, y: y + h, cx1: x, cy1: y + h, cx2: x, cy2: y + h }
            ];
        }
        // Rounded rectangle: 8 arc/edge nodes plus an explicit closing node so
        // every corner curve (including the wrap segment) is drawn, not chorded.
        const d = 0.5522847498 * rx;
        const x0 = x, x1 = x + rx, x2 = x + w - rx, x3 = x + w;
        const y0 = y, y1 = y + rx, y2 = y + h - rx, y3 = y + h;
        const S = (px, py, ax, ay, bx, by) => ({ x: px, y: py, cx1: ax, cy1: ay, cx2: bx, cy2: by });
        return [
            S(x2, y0, x2, y0, x2 + d, y0),
            S(x3, y1, x3, y1 - d, x3, y1),
            S(x3, y2, x3, y2, x3, y2 + d),
            S(x2, y3, x2 + d, y3, x2, y3),
            S(x1, y3, x1, y3, x1 - d, y3),
            S(x0, y2, x0, y2 + d, x0, y2),
            S(x0, y1, x0, y1, x0, y1 - d),
            S(x1, y0, x1 - d, y0, x1, y0),
            S(x2, y0, x2, y0, x2, y0)
        ];
    }
    if (obj.type === 'circle' || obj.type === 'ellipse') {
        const cx = obj.cx || 0, cy = obj.cy || 0;
        const rx = obj.type === 'circle' ? (obj.r || 0) : (obj.rx || 0);
        const ry = obj.type === 'circle' ? (obj.r || 0) : (obj.ry || 0);
        const k = 0.5522847498, kx = k * rx, ky = k * ry;
        // Explicit closing node: otherwise the wrap arc is dropped (stroke)
        // or chorded (fill), leaving a visible sliver out of the loop.
        return [
            { x: cx + rx, y: cy, cx1: cx + rx, cy1: cy - ky, cx2: cx + rx, cy2: cy + ky },
            { x: cx, y: cy + ry, cx1: cx + kx, cy1: cy + ry, cx2: cx - kx, cy2: cy + ry },
            { x: cx - rx, y: cy, cx1: cx - rx, cy1: cy + ky, cx2: cx - rx, cy2: cy - ky },
            { x: cx, y: cy - ry, cx1: cx - kx, cy1: cy - ry, cx2: cx + kx, cy2: cy - ry },
            { x: cx + rx, y: cy, cx1: cx + rx, cy1: cy - ky, cx2: cx + rx, cy2: cy + ky }
        ];
    }
    if (obj.type === 'polygon' || obj.type === 'star') {
        const cx = obj.cx || 0, cy = obj.cy || 0, r = obj.r || 0;
        const spikes = obj.type === 'polygon' ? (obj.sides || 5) : (obj.points || 5);
        const inner = obj.type === 'polygon' ? r / 2 : r / 2;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes, pts = [];
        for (let i = 0; i < spikes; i++) {
            pts.push([cx + Math.cos(rot) * r, cy + Math.sin(rot) * r]); rot += step;
            pts.push([cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner]); rot += step;
        }
        return pts.map(([x, y]) => P(x, y));
    }
    if (obj.type === 'line') {
        return [P(obj.x1 || 0, obj.y1 || 0), P(obj.x2 || 0, obj.y2 || 0)];
    }
    return null;
}

// Nodes of the primary selected path (if any) — the Bezier tool extends these.
function selectedPathNodes() {
    if (selectedIndices.length === 0) return null;
    const obj = objects[selectedIndices[0]];
    if (obj && obj.type === 'path' && Array.isArray(obj.nodes)) return obj.nodes;
    return null;
}

function convertSelectedToPath() {
    if (selectedIndices.length === 0) return;
    let converted = false;
    selectedIndices.forEach(idx => {
        const obj = objects[idx];
        const nodes = shapeToNodes(obj);
        if (nodes) { objects[idx] = { ...obj, type: 'path', nodes }; converted = true; }
    });
    if (converted) playUISound('snap');
}

function finalizeBezierPath() {
    if (activePathNodes.length > 1) {
        objects.push({
            type: 'path', nodes: JSON.parse(JSON.stringify(activePathNodes)),
            fill: activePrimaryColor, fill2: activeSecondaryColor, fillType: 'none', stroke: activePrimaryColor, strokeWidth: 4, opacity: 1, blur: 0, rotation: 0
        });
        selectedIndices = [objects.length - 1];
        playUISound('snap');
    }
    activePathNodes = [];
    render();
}

function renderPreviewPencil() {
    previewLayer.innerHTML = '';
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', buildPathData(pencilPoints));
    pathEl.setAttribute('fill', 'none'); pathEl.setAttribute('stroke', activePrimaryColor); pathEl.setAttribute('stroke-width', '3');
    previewLayer.appendChild(pathEl);
}

function renderPreviewShape() {
    previewLayer.innerHTML = '';
    const p1 = startPoint, p2 = currentDragPos;
    const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);

    if (currentTool === 'bezier' && activePathNodes.length > 0) {
        const previewNodes = [...activePathNodes, { x: p2.x, y: p2.y, cx1: p2.x - 30, cy1: p2.y, cx2: p2.x + 30, cy2: p2.y }];
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', buildPathData(previewNodes));
        pathEl.setAttribute('fill', 'none'); pathEl.setAttribute('stroke', activePrimaryColor);
        pathEl.setAttribute('stroke-width', '2'); pathEl.setAttribute('stroke-dasharray', '4 4');
        previewLayer.appendChild(pathEl);
        return;
    }

    if (currentTool === 'bezier') {
        const selNodes = selectedPathNodes();
        if (selNodes && selNodes.length > 0) {
            const previewNodes = [...selNodes, { x: p2.x, y: p2.y, cx1: p2.x - 30, cy1: p2.y, cx2: p2.x + 30, cy2: p2.y }];
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', buildPathData(previewNodes));
            pathEl.setAttribute('fill', 'none'); pathEl.setAttribute('stroke', activePrimaryColor);
            pathEl.setAttribute('stroke-width', '2'); pathEl.setAttribute('stroke-dasharray', '4 4');
            previewLayer.appendChild(pathEl);
            return;
        }
    }

    let el = document.createElementNS('http://www.w3.org/2000/svg', 
        currentTool === 'rect' || currentTool === 'roundrect' ? 'rect' : 
        currentTool === 'circle' || currentTool === 'polygon' || currentTool === 'triangle' ? 'circle' : 
        currentTool === 'star' ? 'polygon' :
        currentTool === 'ellipse' ? 'ellipse' : 'line');
    el.classList.add('preview-shape');

    if (currentTool === 'rect' || currentTool === 'roundrect') { el.setAttribute('x', x); el.setAttribute('y', y); el.setAttribute('width', w); el.setAttribute('height', h); }
    else if (currentTool === 'circle' || currentTool === 'polygon' || currentTool === 'triangle') { el.setAttribute('cx', p1.x); el.setAttribute('cy', p1.y); el.setAttribute('r', Math.hypot(p2.x - p1.x, p2.y - p1.y)); }
    else if (currentTool === 'star') { el.setAttribute('points', buildStarPoints(p1.x, p1.y, 5, Math.hypot(p2.x - p1.x, p2.y - p1.y), Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2)); }
    else if (currentTool === 'ellipse') { el.setAttribute('cx', x + w / 2); el.setAttribute('cy', y + h / 2); el.setAttribute('rx', Math.max(w / 2, 4)); el.setAttribute('ry', Math.max(h / 2, 4)); }
    else if (currentTool === 'line') { el.setAttribute('x1', p1.x); el.setAttribute('y1', p1.y); el.setAttribute('x2', p2.x); el.setAttribute('y2', p2.y); }

    previewLayer.appendChild(el);
}

// ---- Boolean / clip / mask rendering ----
function makeBlurFilter(idp, blurVal) {
    blurVal = parseFloat(blurVal) || 0;
    if (!(blurVal > 0)) return null;
    const fId = `blur-${idp}`;
    const filt = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filt.setAttribute('id', fId);
    filt.setAttribute('x', '-50%'); filt.setAttribute('y', '-50%');
    filt.setAttribute('width', '200%'); filt.setAttribute('height', '200%');
    filt.innerHTML = `<feGaussianBlur stdDeviation="${clampNum(blurVal, 0, 20)}" />`;
    defs.appendChild(filt);
    return `url(#${fId})`;
}

// Gradient angle helpers. Angle convention: 0 = left-to-right (matches the
// classic SVG default look), 90 = top-to-bottom, clockwise positive.
function linearGradientVector(angleDeg) {
    const a = ((parseFloat(angleDeg) || 0) * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const r = (n) => Math.round(n * 1000) / 1000;
    return { x1: r(0.5 - dx / 2), y1: r(0.5 - dy / 2), x2: r(0.5 + dx / 2), y2: r(0.5 + dy / 2) };
}
function applyGradientAngle(gradEl, angleDeg) {
    const v = linearGradientVector(angleDeg);
    gradEl.setAttribute('x1', v.x1); gradEl.setAttribute('y1', v.y1);
    gradEl.setAttribute('x2', v.x2); gradEl.setAttribute('y2', v.y2);
}

// Standalone leaf painter (used inside boolean/clip/mask groups).
// Mirrors the top-level leaf path in render(); keeps gradients working via unique idp.
// mode: 'both' (default) | 'fill' (suppress stroke) | 'stroke' (suppress fill).
function leafPaintFor(obj, idp, mode) {
    let fillAttr = obj.fill || activePrimaryColor;
    if (obj.fillType === 'linear' || obj.fillType === 'radial') {
        const gradId = `grad-${idp}`;
        const grad = document.createElementNS('http://www.w3.org/2000/svg', obj.fillType === 'linear' ? 'linearGradient' : 'radialGradient');
        grad.setAttribute('id', gradId);
        if (obj.fillType === 'linear') applyGradientAngle(grad, obj.fillAngle);
        grad.innerHTML = getFillStops(obj).map(s => {
            const st = stopStyle(s.c, activePrimaryColor);
            return `<stop offset="${Math.round(clampNum(s.o, 0, 1) * 100)}%" stop-color="${st.color}" stop-opacity="${st.opacity}" />`;
        }).join('');
        defs.appendChild(grad);
        fillAttr = `url(#${gradId})`;
    } else if (obj.fillType === 'none') { fillAttr = 'none'; }
    if (mode === 'stroke') fillAttr = 'none';

    let strokeAttr = obj.stroke || '#ffffffff';
    const strokeType = obj.strokeType || 'color';
    if (strokeType === 'linear' || strokeType === 'radial') {
        const sgradId = `sgrad-${idp}`;
        const sgrad = document.createElementNS('http://www.w3.org/2000/svg', strokeType === 'linear' ? 'linearGradient' : 'radialGradient');
        sgrad.setAttribute('id', sgradId);
        if (strokeType === 'linear') applyGradientAngle(sgrad, obj.strokeAngle);
        sgrad.innerHTML = getStrokeStops(obj).map(s => {
            const st = stopStyle(s.c, '#ffffffff');
            return `<stop offset="${Math.round(clampNum(s.o, 0, 1) * 100)}%" stop-color="${st.color}" stop-opacity="${st.opacity}" />`;
        }).join('');
        defs.appendChild(sgrad);
        strokeAttr = `url(#${sgradId})`;
    } else if (strokeType === 'none') { strokeAttr = 'none'; }
    if (mode === 'fill') strokeAttr = 'none';

    const filterAttr = makeBlurFilter(idp, obj.blur);
    let el = null;
    if (obj.type === 'rect') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        el.setAttribute('x', obj.x); el.setAttribute('y', obj.y); el.setAttribute('width', obj.width); el.setAttribute('height', obj.height); el.setAttribute('rx', obj.rx || 0);
    } else if (obj.type === 'circle') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('cx', obj.cx); el.setAttribute('cy', obj.cy); el.setAttribute('r', obj.r);
    } else if (obj.type === 'ellipse') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        el.setAttribute('cx', obj.cx); el.setAttribute('cy', obj.cy); el.setAttribute('rx', obj.rx); el.setAttribute('ry', obj.ry);
    } else if (obj.type === 'line') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        el.setAttribute('x1', obj.x1); el.setAttribute('y1', obj.y1); el.setAttribute('x2', obj.x2); el.setAttribute('y2', obj.y2);
    } else if (obj.type === 'polygon') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        el.setAttribute('points', buildStarPoints(obj.cx, obj.cy, obj.sides || 5, obj.r, obj.r / 2));
    } else if (obj.type === 'star') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        el.setAttribute('points', buildStarPoints(obj.cx, obj.cy, obj.points || 5, obj.r, obj.r / 2));
    } else if (obj.type === 'text') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        el.setAttribute('x', obj.x); el.setAttribute('y', obj.y);
        el.setAttribute('font-size', obj.fontSize || 28);
        el.setAttribute('font-family', obj.fontFamily || 'JetBrains Mono, sans-serif');
        el.setAttribute('font-weight', obj.fontWeight || 'normal');
        el.setAttribute('text-anchor', obj.textAlign || 'start');
        el.textContent = obj.text || 'Inkpath';
    } else if (obj.type === 'path') {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('d', buildPathData(obj.nodes));
    }
    if (!el) return { el: null, filterAttr: null };
    el.classList.add('shape-element');
    el.setAttribute('fill', fillAttr);
    el.setAttribute('stroke', strokeAttr);
    el.setAttribute('stroke-width', obj.strokeWidth ?? 2);
    el.setAttribute('opacity', obj.opacity !== undefined ? obj.opacity : 1);
    if (filterAttr) el.setAttribute('filter', filterAttr);
    if (obj.rotation) el.setAttribute('transform', `rotate(${obj.rotation} ${getCenter(obj).x} ${getCenter(obj).y})`);
    return { el, filterAttr };
}

function selectHandlerFor(topIdx) {
    return (e) => {
        if (e.button === 2) return;
        if (currentTool === 'select' || currentTool === 'node' || currentTool === 'eyedropper' || currentTool === 'eraser') {
            e.stopPropagation();
            if (!e.shiftKey && !selectedIndices.includes(topIdx)) {
                selectedIndices = [topIdx];
            } else if (e.shiftKey) {
                if (selectedIndices.includes(topIdx)) selectedIndices = selectedIndices.filter(i => i !== topIdx);
                else selectedIndices.push(topIdx);
            }
            if (currentTool === 'node') convertSelectedToPath();
            playUISound('click');
            if (currentTool === 'eraser') { deleteSelectedObject(); return; }
            isMovingShape = currentTool === 'select';
            currentDragPos = getMousePos(e);
            render();
        }
    };
}

function renderChildInto(child, idp, parent, topIdx) {
    if (!child) return;
    if (child.type === 'boolean' || child.type === 'clip' || child.type === 'mask') {
        renderContainerInto(child, idp, parent, topIdx);
        return;
    }
    const built = leafPaintFor(child, idp);
    if (!built.el) return;
    built.el.dataset.idx = topIdx;
    built.el.onmousedown = selectHandlerFor(topIdx);
    parent.appendChild(built.el);
}

function silhouettePathEl(d, fill, transform) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', fill);
    if (transform) p.setAttribute('transform', transform);
    return p;
}

// Silhouette plus the source shape's own rotation, so clip/mask/boolean
// cutouts stay aligned when the source shape is rotated. The center matches
// getCenter(), which is also what leaf rendering rotates about.
function silhouetteWithTransform(obj) {
    const d = silhouettePathData(obj);
    const r = obj ? (parseFloat(obj.rotation) || 0) : 0;
    if (!r) return { d, transform: null };
    const c = getCenter(obj);
    return { d, transform: `rotate(${r} ${c.x} ${c.y})` };
}

// Mask region expanded to survive any rotation about a center inside the
// bbox (worst-case reach = full diagonal). Extra area is harmless.
function expandedRegion(bb) {
    const pad = Math.hypot(Math.max(bb.w, 1), Math.max(bb.h, 1));
    return { x: bb.x - pad, y: bb.y - pad, w: Math.max(bb.w, 1) + pad * 2, h: Math.max(bb.h, 1) + pad * 2 };
}

function coverRect(region, fill) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', region.x); r.setAttribute('y', region.y);
    r.setAttribute('width', region.w); r.setAttribute('height', region.h);
    r.setAttribute('fill', fill);
    return r;
}

function renderContainerInto(obj, idp, parent, topIdx) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(svgNS, 'g');
    g.dataset.idx = topIdx;
    g.setAttribute('opacity', obj.opacity !== undefined ? obj.opacity : 1);
    if (obj.rotation) { const c = getCenter(obj); g.setAttribute('transform', `rotate(${obj.rotation} ${c.x} ${c.y})`); }
    const bf = makeBlurFilter('c' + idp, obj.blur);
    if (bf) g.setAttribute('filter', bf);

    if (obj.type === 'boolean') {
        const kids = Array.isArray(obj.children) ? obj.children : [];
        if (obj.op === 'union') {
            // True union look: fills merged (no interior strokes), then one
            // outline per leaf drawn only where it lies outside the others.
            const bb = unionBBox(kids.map(shapeBBox));
            const region = expandedRegion(bb);
            const paintKid = (c, childIdp, mode) => {
                if (!c || c.type === 'boolean' || c.type === 'clip' || c.type === 'mask') return;
                const built = leafPaintFor(c, childIdp, mode);
                if (!built.el) return;
                built.el.dataset.idx = topIdx;
                built.el.onmousedown = selectHandlerFor(topIdx);
                g.appendChild(built.el);
            };
            kids.forEach((c, i) => {
                if (c && (c.type === 'boolean' || c.type === 'clip' || c.type === 'mask')) {
                    renderChildInto(c, `${idp}uf${i}`, g, topIdx);
                } else {
                    paintKid(c, `${idp}uf${i}`, 'fill');
                }
            });
            kids.forEach((c, i) => {
                if (!c || c.type === 'boolean' || c.type === 'clip' || c.type === 'mask') return;
                if ((c.strokeType || 'color') === 'none' || !((c.strokeWidth ?? 2) > 0)) return;
                const others = kids.filter((o, j) => j !== i && o);
                if (others.length === 0) { paintKid(c, `${idp}us${i}`, 'stroke'); return; }
                const mId = `bunl-${idp}n${i}`;
                const mask = document.createElementNS(svgNS, 'mask');
                mask.setAttribute('id', mId);
                mask.setAttribute('maskUnits', 'userSpaceOnUse');
                mask.setAttribute('x', region.x); mask.setAttribute('y', region.y);
                mask.setAttribute('width', region.w); mask.setAttribute('height', region.h);
                mask.appendChild(coverRect(region, '#ffffff'));
                others.forEach(o => {
                    const cut = silhouetteWithTransform(o);
                    mask.appendChild(silhouettePathEl(cut.d, '#000000', cut.transform));
                });
                defs.appendChild(mask);
                const ga = document.createElementNS(svgNS, 'g');
                ga.setAttribute('mask', `url(#${mId})`);
                const built = leafPaintFor(c, `${idp}us${i}`, 'stroke');
                if (built.el) {
                    built.el.dataset.idx = topIdx;
                    built.el.onmousedown = selectHandlerFor(topIdx);
                    ga.appendChild(built.el);
                }
                g.appendChild(ga);
            });
        } else if (obj.op === 'subtract' && kids.length >= 2) {
            const bb = unionBBox(kids.map(shapeBBox));
            const region = expandedRegion(bb);
            const mId = `bsub-${idp}`;
            const mask = document.createElementNS(svgNS, 'mask');
            mask.setAttribute('id', mId);
            mask.setAttribute('maskUnits', 'userSpaceOnUse');
            mask.setAttribute('x', region.x); mask.setAttribute('y', region.y);
            mask.setAttribute('width', region.w); mask.setAttribute('height', region.h);
            mask.appendChild(coverRect(region, '#ffffff'));
            const cut = silhouetteWithTransform(kids[1]);
            mask.appendChild(silhouettePathEl(cut.d, '#000000', cut.transform));
            defs.appendChild(mask);
            const ga = document.createElementNS(svgNS, 'g');
            ga.setAttribute('mask', `url(#${mId})`);
            renderChildInto(kids[0], `${idp}sa`, ga, topIdx);
            g.appendChild(ga);
        } else if (obj.op === 'intersect' && kids.length >= 2) {
            const cId = `bint-${idp}`;
            const clip = document.createElementNS(svgNS, 'clipPath');
            clip.setAttribute('id', cId);
            const area = silhouetteWithTransform(kids[1]);
            clip.appendChild(silhouettePathEl(area.d, '#000000', area.transform));
            defs.appendChild(clip);
            const ga = document.createElementNS(svgNS, 'g');
            ga.setAttribute('clip-path', `url(#${cId})`);
            renderChildInto(kids[0], `${idp}ia`, ga, topIdx);
            g.appendChild(ga);
        } else if (obj.op === 'exclude' && kids.length >= 2) {
            const bb = unionBBox(kids.map(shapeBBox));
            const region = expandedRegion(bb);
            [['a', kids[0], kids[1]], ['b', kids[1], kids[0]]].forEach(([tag, A, B], k) => {
                const mId = `bexc-${idp}${tag}`;
                const mask = document.createElementNS(svgNS, 'mask');
                mask.setAttribute('id', mId);
                mask.setAttribute('maskUnits', 'userSpaceOnUse');
                mask.setAttribute('x', region.x); mask.setAttribute('y', region.y);
                mask.setAttribute('width', region.w); mask.setAttribute('height', region.h);
                mask.appendChild(coverRect(region, '#ffffff'));
                const cut = silhouetteWithTransform(B);
                mask.appendChild(silhouettePathEl(cut.d, '#000000', cut.transform));
                defs.appendChild(mask);
                const ga = document.createElementNS(svgNS, 'g');
                ga.setAttribute('mask', `url(#${mId})`);
                renderChildInto(A, `${idp}e${k}`, ga, topIdx);
                g.appendChild(ga);
            });
        } else {
            kids.forEach((c, i) => renderChildInto(c, `${idp}u${i}`, g, topIdx));
        }
    } else if (obj.type === 'clip') {
        const kids = Array.isArray(obj.children) ? obj.children : [];
        const cId = `bclip-${idp}`;
        const clip = document.createElementNS(svgNS, 'clipPath');
        clip.setAttribute('id', cId);
        const area = silhouetteWithTransform(obj.clip || kids[0]);
        clip.appendChild(silhouettePathEl(area.d, '#000000', area.transform));
        defs.appendChild(clip);
        const ga = document.createElementNS(svgNS, 'g');
        ga.setAttribute('clip-path', `url(#${cId})`);
        kids.forEach((c, i) => renderChildInto(c, `${idp}c${i}`, ga, topIdx));
        g.appendChild(ga);
    } else if (obj.type === 'mask') {
        const kids = Array.isArray(obj.children) ? obj.children : [];
        const bb = unionBBox([(obj.mask ? shapeBBox(obj.mask) : null), ...kids.map(shapeBBox)]);
        const region = expandedRegion(bb);
        const mId = `bmask-${idp}`;
        const mask = document.createElementNS(svgNS, 'mask');
        mask.setAttribute('id', mId);
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', region.x); mask.setAttribute('y', region.y);
        mask.setAttribute('width', region.w); mask.setAttribute('height', region.h);
        mask.appendChild(coverRect(region, '#000000'));
        const area = silhouetteWithTransform(obj.mask || kids[0]);
        mask.appendChild(silhouettePathEl(area.d, '#ffffff', area.transform));
        defs.appendChild(mask);
        const ga = document.createElementNS(svgNS, 'g');
        ga.setAttribute('mask', `url(#${mId})`);
        kids.forEach((c, i) => renderChildInto(c, `${idp}m${i}`, ga, topIdx));
        g.appendChild(ga);
    }

    if (selectedIndices.includes(topIdx)) g.classList.add('shape-selected');
    g.onmousedown = selectHandlerFor(topIdx);
    parent.appendChild(g);
}

function render() {
    drawLayer.innerHTML = ''; uiLayer.innerHTML = ''; defs.innerHTML = '';

    const boundaryBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    boundaryBox.setAttribute('x', 0); boundaryBox.setAttribute('y', 0);
    boundaryBox.setAttribute('width', CANVAS_BOUNDS.width); boundaryBox.setAttribute('height', CANVAS_BOUNDS.height);
    boundaryBox.setAttribute('fill', 'none'); boundaryBox.setAttribute('stroke', 'rgba(163, 5, 255, 0.4)');
    boundaryBox.setAttribute('stroke-width', '2'); boundaryBox.setAttribute('stroke-dasharray', '8 8');
    drawLayer.appendChild(boundaryBox);

    objects.forEach((obj, idx) => {
        if (obj.type === 'boolean' || obj.type === 'clip' || obj.type === 'mask') {
            renderContainerInto(obj, `${idx}`, drawLayer, idx);
            return;
        }
        let el;
        let fillAttr = obj.fill || activePrimaryColor;

        if (obj.fillType === 'linear' || obj.fillType === 'radial') {
            const gradId = `grad-${idx}`;
            const grad = document.createElementNS('http://www.w3.org/2000/svg', obj.fillType === 'linear' ? 'linearGradient' : 'radialGradient');
            grad.setAttribute('id', gradId);
            if (obj.fillType === 'linear') applyGradientAngle(grad, obj.fillAngle);
            grad.innerHTML = getFillStops(obj).map(s => {
                const st = stopStyle(s.c, activePrimaryColor);
                return `<stop offset="${Math.round(clampNum(s.o, 0, 1) * 100)}%" stop-color="${st.color}" stop-opacity="${st.opacity}" />`;
            }).join('');
            defs.appendChild(grad);
            fillAttr = `url(#${gradId})`;
        } else if (obj.fillType === 'none') { fillAttr = 'none'; }

        let strokeAttr = obj.stroke || '#ffffffff';
        const strokeType = obj.strokeType || 'color';
        if (strokeType === 'linear' || strokeType === 'radial') {
            const sgradId = `sgrad-${idx}`;
            const sgrad = document.createElementNS('http://www.w3.org/2000/svg', strokeType === 'linear' ? 'linearGradient' : 'radialGradient');
            sgrad.setAttribute('id', sgradId);
            if (strokeType === 'linear') applyGradientAngle(sgrad, obj.strokeAngle);
            sgrad.innerHTML = getStrokeStops(obj).map(s => {
                const st = stopStyle(s.c, '#ffffffff');
                return `<stop offset="${Math.round(clampNum(s.o, 0, 1) * 100)}%" stop-color="${st.color}" stop-opacity="${st.opacity}" />`;
            }).join('');
            defs.appendChild(sgrad);
            strokeAttr = `url(#${sgradId})`;
        } else if (strokeType === 'none') { strokeAttr = 'none'; }

        let filterAttr = null;
        const blurVal = parseFloat(obj.blur) || 0;
        if (blurVal > 0) {
            const fId = `blur-${idx}`;
            const filt = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            filt.setAttribute('id', fId);
            filt.setAttribute('x', '-50%'); filt.setAttribute('y', '-50%');
            filt.setAttribute('width', '200%'); filt.setAttribute('height', '200%');
            filt.innerHTML = `<feGaussianBlur stdDeviation="${clampNum(blurVal, 0, 20)}" />`;
            defs.appendChild(filt);
            filterAttr = `url(#${fId})`;
        }

        if (obj.type === 'rect') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            el.setAttribute('x', obj.x); el.setAttribute('y', obj.y); el.setAttribute('width', obj.width); el.setAttribute('height', obj.height); el.setAttribute('rx', obj.rx || 0);
        } else if (obj.type === 'circle') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            el.setAttribute('cx', obj.cx); el.setAttribute('cy', obj.cy); el.setAttribute('r', obj.r);
        } else if (obj.type === 'ellipse') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            el.setAttribute('cx', obj.cx); el.setAttribute('cy', obj.cy); el.setAttribute('rx', obj.rx); el.setAttribute('ry', obj.ry);
        } else if (obj.type === 'line') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            el.setAttribute('x1', obj.x1); el.setAttribute('y1', obj.y1); el.setAttribute('x2', obj.x2); el.setAttribute('y2', obj.y2);
        } else if (obj.type === 'polygon') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            el.setAttribute('points', buildStarPoints(obj.cx, obj.cy, obj.sides || 5, obj.r, obj.r / 2));
        } else if (obj.type === 'star') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            el.setAttribute('points', buildStarPoints(obj.cx, obj.cy, obj.points || 5, obj.r, obj.r / 2));
        } else if (obj.type === 'text') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            el.setAttribute('x', obj.x); el.setAttribute('y', obj.y);
            el.setAttribute('font-size', obj.fontSize || 28);
            el.setAttribute('font-family', obj.fontFamily || 'JetBrains Mono, sans-serif');
            el.setAttribute('font-weight', obj.fontWeight || 'normal');
            el.setAttribute('text-anchor', obj.textAlign || 'start');
            el.textContent = obj.text || 'Inkpath';

            el.ondblclick = (e) => {
                e.stopPropagation();
                const userInput = prompt('Edit Text Content:', obj.text);
                if (userInput !== null) { obj.text = userInput; render(); }
            };
        } else if (obj.type === 'path') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            el.setAttribute('d', buildPathData(obj.nodes));
        }

        if (el) {
            el.classList.add('shape-element');
            el.dataset.idx = idx;
            el.setAttribute('fill', fillAttr);
            el.setAttribute('stroke', strokeAttr);
            el.setAttribute('stroke-width', obj.strokeWidth ?? 2);
            el.setAttribute('opacity', obj.opacity !== undefined ? obj.opacity : 1);
            if (filterAttr) el.setAttribute('filter', filterAttr);
            if (obj.rotation) el.setAttribute('transform', `rotate(${obj.rotation} ${getCenter(obj).x} ${getCenter(obj).y})`);
            if (selectedIndices.includes(idx)) el.classList.add('shape-selected');

            el.onmousedown = (e) => {
                if (e.button === 2) return;
                if (currentTool === 'select' || currentTool === 'node' || currentTool === 'eyedropper' || currentTool === 'eraser') {
                    e.stopPropagation();
                    if (!e.shiftKey && !selectedIndices.includes(idx)) {
                        selectedIndices = [idx];
                    } else if (e.shiftKey) {
                        if (selectedIndices.includes(idx)) selectedIndices = selectedIndices.filter(i => i !== idx);
                        else selectedIndices.push(idx);
                    }
                    if (currentTool === 'node') convertSelectedToPath();
                    playUISound('click');
                    if (currentTool === 'eraser') { deleteSelectedObject(); return; }
                    isMovingShape = currentTool === 'select';
                    currentDragPos = getMousePos(e);
                    render();
                }
            };
            drawLayer.appendChild(el);
        }
    });

    if (selectedIndices.length > 0 && currentTool === 'select') {
        const primaryObj = objects[selectedIndices[0]];
        const bb = shapeBBox(primaryObj);
        createCircle(bb.x + bb.w, bb.y + bb.h, 6, 'scale-handle', () => {});
    }

    if ((currentTool === 'node' || currentTool === 'bezier') && (selectedIndices.length > 0 || activePathNodes.length > 0)) {
        const nodes = selectedPathNodes() || (currentTool === 'bezier' ? activePathNodes : objects[selectedIndices[0]].nodes);
        if (nodes) {
            nodes.forEach((node, i) => {
                createLine(node.x, node.y, node.cx1, node.cy1, 'control-line');
                createLine(node.x, node.y, node.cx2, node.cy2, 'control-line');
                createCircle(node.cx1, node.cy1, 5, 'control-handle', (e) => { e.stopPropagation(); dragTarget = { kind: 'control1', index: i }; });
                createCircle(node.cx2, node.cy2, 5, 'control-handle', (e) => { e.stopPropagation(); dragTarget = { kind: 'control2', index: i }; });
                
                const circle = createCircle(node.x, node.y, 7, 'node-handle', (e) => { e.stopPropagation(); dragTarget = { kind: 'node', index: i }; });
                circle.ondblclick = () => { if (nodes.length > 2) { nodes.splice(i, 1); playUISound('delete'); render(); } };
            });
        }
    }

    applyTransform();
    syncInspector();
}

function getCenter(obj) {
    if (!obj) return { x: 0, y: 0 };
    if (obj.type === 'rect' || obj.type === 'text') return { x: obj.x + (obj.width || 50) / 2, y: obj.y + (obj.height || 20) / 2 };
    if (obj.type === 'circle' || obj.type === 'ellipse' || obj.type === 'polygon' || obj.type === 'star') return { x: obj.cx, y: obj.cy };
    if (obj.type === 'line') return { x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2 };
    if (obj.type === 'path' && obj.nodes.length > 0) return { x: obj.nodes[0].x, y: obj.nodes[0].y };
    if (obj.type === 'boolean' || obj.type === 'clip' || obj.type === 'mask') {
        const bb = shapeBBox(obj);
        return { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
    }
    return { x: 0, y: 0 };
}

// Bounding box + silhouette helpers (power boolean ops, clip/mask, node conversion)
function shapeBBox(obj) {
    if (!obj) return { x: 0, y: 0, w: 10, h: 10 };
    if (obj.type === 'rect') return { x: obj.x || 0, y: obj.y || 0, w: obj.width || 0, h: obj.height || 0 };
    if (obj.type === 'circle') { const r = obj.r || 0; return { x: (obj.cx || 0) - r, y: (obj.cy || 0) - r, w: r * 2, h: r * 2 }; }
    if (obj.type === 'ellipse') { const rx = obj.rx || 0, ry = obj.ry || 0; return { x: (obj.cx || 0) - rx, y: (obj.cy || 0) - ry, w: rx * 2, h: ry * 2 }; }
    if (obj.type === 'line') {
        const pad = Math.max((obj.strokeWidth || 2) / 2, 1);
        return { x: Math.min(obj.x1 || 0, obj.x2 || 0) - pad, y: Math.min(obj.y1 || 0, obj.y2 || 0) - pad, w: Math.abs((obj.x2 || 0) - (obj.x1 || 0)) + pad * 2, h: Math.abs((obj.y2 || 0) - (obj.y1 || 0)) + pad * 2 };
    }
    if (obj.type === 'polygon' || obj.type === 'star') { const r = obj.r || 0; return { x: (obj.cx || 0) - r, y: (obj.cy || 0) - r, w: r * 2, h: r * 2 }; }
    if (obj.type === 'text') {
        const fs = obj.fontSize || 28, t = String(obj.text || 'Inkpath');
        return { x: obj.x || 0, y: (obj.y || 0) - fs, w: Math.max(t.length * fs * 0.6, 10), h: fs * 1.2 };
    }
    if (obj.type === 'path' && Array.isArray(obj.nodes) && obj.nodes.length > 0) {
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        obj.nodes.forEach(n => {
            [n.x, n.cx1, n.cx2].forEach(x => { if (isFinite(x)) { x1 = Math.min(x1, x); x2 = Math.max(x2, x); } });
            [n.y, n.cy1, n.cy2].forEach(y => { if (isFinite(y)) { y1 = Math.min(y1, y); y2 = Math.max(y2, y); } });
        });
        if (!isFinite(x1)) return { x: 0, y: 0, w: 10, h: 10 };
        return { x: x1, y: y1, w: Math.max(x2 - x1, 1), h: Math.max(y2 - y1, 1) };
    }
    if (obj.type === 'boolean' && Array.isArray(obj.children)) return unionBBox(obj.children.map(shapeBBox));
    if (obj.type === 'clip' || obj.type === 'mask') {
        const boxes = [];
        if (obj.clip) boxes.push(shapeBBox(obj.clip));
        if (obj.mask) boxes.push(shapeBBox(obj.mask));
        (obj.children || []).forEach(c => boxes.push(shapeBBox(c)));
        return unionBBox(boxes);
    }
    return { x: 0, y: 0, w: 10, h: 10 };
}

function unionBBox(boxes) {
    const valid = boxes.filter(b => b && isFinite(b.x) && isFinite(b.y));
    if (valid.length === 0) return { x: 0, y: 0, w: 10, h: 10 };
    const x1 = Math.min(...valid.map(b => b.x)), y1 = Math.min(...valid.map(b => b.y));
    const x2 = Math.max(...valid.map(b => b.x + (b.w || 0))), y2 = Math.max(...valid.map(b => b.y + (b.h || 0)));
    return { x: x1, y: y1, w: Math.max(x2 - x1, 1), h: Math.max(y2 - y1, 1) };
}

function rectPathData(x, y, w, h, rx) {
    x = x || 0; y = y || 0; w = Math.max(w || 0, 0.1); h = Math.max(h || 0, 0.1);
    rx = clampNum(rx || 0, 0, Math.min(w, h) / 2);
    if (rx <= 0) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    return `M ${x + rx} ${y} H ${x + w - rx} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} V ${y + h - rx} A ${rx} ${rx} 0 0 1 ${x + w - rx} ${y + h} H ${x + rx} A ${rx} ${rx} 0 0 1 ${x} ${y + h - rx} V ${y + rx} A ${rx} ${rx} 0 0 1 ${x + rx} ${y} Z`;
}

function ellipsePathData(cx, cy, rx, ry) {
    const k = 0.5522847498, kx = k * rx, ky = k * ry;
    return `M ${cx + rx} ${cy} C ${cx + rx} ${cy + ky}, ${cx + kx} ${cy + ry}, ${cx} ${cy + ry} C ${cx - kx} ${cy + ry}, ${cx - rx} ${cy + ky}, ${cx - rx} ${cy} C ${cx - rx} ${cy - ky}, ${cx - kx} ${cy - ry}, ${cx} ${cy - ry} C ${cx + kx} ${cy - ry}, ${cx + rx} ${cy - ky}, ${cx + rx} ${cy} Z`;
}

// Closed silhouette path for clip/mask/boolean use (any shape type)
function silhouettePathData(obj) {
    if (!obj) return rectPathData(0, 0, 10, 10, 0);
    if (obj.type === 'path' && Array.isArray(obj.nodes) && obj.nodes.length > 0) return buildPathData(obj.nodes) + ' Z';
    if (obj.type === 'rect') return rectPathData(obj.x, obj.y, obj.width, obj.height, obj.rx);
    if (obj.type === 'circle') { const r = Math.max(obj.r || 0, 0.1); return ellipsePathData(obj.cx || 0, obj.cy || 0, r, r); }
    if (obj.type === 'ellipse') return ellipsePathData(obj.cx || 0, obj.cy || 0, Math.max(obj.rx || 0, 0.1), Math.max(obj.ry || 0, 0.1));
    if (obj.type === 'polygon' || obj.type === 'star') {
        const pts = buildStarPoints(obj.cx || 0, obj.cy || 0, obj.type === 'polygon' ? (obj.sides || 5) : (obj.points || 5), Math.max(obj.r || 0, 0.1), Math.max(obj.r || 0, 0.1) / 2);
        const pairs = pts.split(' ').map(p => p.split(','));
        return 'M ' + pairs.map(p => p.join(' ')).join(' L ') + ' Z';
    }
    const bb = shapeBBox(obj);
    return rectPathData(bb.x, bb.y, bb.w, bb.h, 0);
}

function buildStarPoints(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3, step = Math.PI / spikes, pts = [];
    for (let i = 0; i < spikes; i++) {
        pts.push(`${cx + Math.cos(rot) * outerRadius},${cy + Math.sin(rot) * outerRadius}`); rot += step;
        pts.push(`${cx + Math.cos(rot) * innerRadius},${cy + Math.sin(rot) * innerRadius}`); rot += step;
    }
    return pts.join(' ');
}

function buildPathData(nodes) {
    if (!nodes || nodes.length === 0) return '';
    let d = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 1; i < nodes.length; i++) {
        d += ` C ${nodes[i-1].cx2} ${nodes[i-1].cy2}, ${nodes[i].cx1} ${nodes[i].cy1}, ${nodes[i].x} ${nodes[i].y}`;
    }
    return d;
}

function createCircle(cx, cy, r, className, onMouseDown) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
    c.className.baseVal = className; c.onmousedown = onMouseDown;
    uiLayer.appendChild(c);
    return c;
}

function createLine(x1, y1, x2, y2, className) {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    l.className.baseVal = className;
    uiLayer.appendChild(l);
}

// MIXED Property Collision Resolution
function getMixedProperty(propName) {
    if (selectedIndices.length === 0) return '';
    const firstVal = objects[selectedIndices[0]][propName];
    const isMixed = selectedIndices.some(idx => objects[idx][propName] !== firstVal);
    return isMixed ? 'MIXED' : firstVal;
}

// Stroke HSVA color helpers
function clampNum(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360; s = clampNum(s, 0, 1); v = clampNum(v, 0, 1);
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60) { rp = c; gp = x; } else if (h < 120) { rp = x; gp = c; }
    else if (h < 180) { gp = c; bp = x; } else if (h < 240) { gp = x; bp = c; }
    else if (h < 300) { rp = x; bp = c; } else { rp = c; bp = x; }
    return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) };
}
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d !== 0) {
        if (mx === r) h = 60 * (((g - b) / d) % 6);
        else if (mx === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return { h, s: mx === 0 ? 0 : d / mx, v: mx };
}
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => clampNum(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function rgbaToHex8(r, g, b, a = 1) {
    const aa = clampNum(Math.round(clampNum(a, 0, 1) * 255), 0, 255).toString(16).padStart(2, '0');
    return rgbToHex(r, g, b) + aa;
}
function stopStyle(colorStr, fallback) {
    const { r, g, b, a } = parseColorToRgba(colorStr || fallback);
    return { color: rgbToHex(r, g, b), opacity: Math.round(clampNum(a ?? 1, 0, 1) * 100) / 100 };
}
function toHex8String(str, fallback) {
    if (typeof str !== 'string') return null;
    let s = str.trim();
    if (s === '') return null;
    if (s === 'MIXED') return null;
    if (!s.startsWith('#') && !/^rgba?\(/i.test(s)) s = '#' + s;
    const { r, g, b, a } = parseColorToRgba(s);
    if (/^#/.test(s) && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) {
        if (!/^rgba?\(/i.test(s)) return null;
    }
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return null;
    return rgbaToHex8(r, g, b, a ?? 1);
}
function parseColorToRgba(str) {
    if (typeof str !== 'string') return { r: 255, g: 255, b: 255, a: 1 };
    str = str.trim();
    let m;
    if ((m = str.match(/^#([0-9a-fA-F]{3})$/))) {
        return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
    }
    if ((m = str.match(/^#([0-9a-fA-F]{6})$/))) {
        return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
    }
    if ((m = str.match(/^#([0-9a-fA-F]{8})$/))) {
        return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: parseInt(m[1].slice(6, 8), 16) / 255 };
    }
    if ((m = str.match(/^rgba?\(\s*([^)]+)\)$/i))) {
        const parts = m[1].split(',').map(s => s.trim());
        if (parts.length >= 3) {
            return { r: parseFloat(parts[0]) || 0, g: parseFloat(parts[1]) || 0, b: parseFloat(parts[2]) || 0, a: parts.length >= 4 ? (parseFloat(parts[3]) ?? 1) : 1 };
        }
    }
    return { r: 255, g: 255, b: 255, a: 1 };
}
// Gradient multi-stop system (backward compatible with 2-stop fill/fill2)
// NOTE: normalizes in place to preserve stop object identity (drag/selection rely on it)
function normalizeStops(stops, fallback1, fallback2) {
    const d1 = toHex8String(fallback1, '#ffffffff') || '#ffffffff';
    const d2 = toHex8String(fallback2, '#38bdf8ff') || '#38bdf8ff';
    if (!Array.isArray(stops) || stops.length < 2) {
        return [{ o: 0, c: d1 }, { o: 1, c: d2 }];
    }
    for (let i = stops.length - 1; i >= 0; i--) {
        const s = stops[i];
        if (!s || !isFinite(s.o) || typeof s.c !== 'string') { stops.splice(i, 1); continue; }
        s.o = clampNum(parseFloat(s.o) || 0, 0, 1);
        s.c = toHex8String(s.c, d1) || d1;
    }
    if (stops.length < 2) return [{ o: 0, c: d1 }, { o: 1, c: d2 }];
    stops.sort((a, b) => a.o - b.o);
    return stops;
}
function getFillStops(obj) {
    const stops = normalizeStops(obj.fillStops, obj.fill || activePrimaryColor, obj.fill2 || activeSecondaryColor);
    obj.fillStops = stops;
    return stops;
}
function getStrokeStops(obj) {
    const stops = normalizeStops(obj.strokeStops, obj.stroke || '#ffffffff', obj.stroke2 || '#38bdf8ff');
    obj.strokeStops = stops;
    return stops;
}
function mirrorFillStops(obj) {
    const stops = getFillStops(obj);
    obj.fill = stops[0].c; obj.fill2 = stops[stops.length - 1].c;
}
function mirrorStrokeStops(obj) {
    const stops = getStrokeStops(obj);
    obj.stroke = stops[0].c; obj.stroke2 = stops[stops.length - 1].c;
}
// Paint target: clip groups expose their bottom content shape (children[0])
// for editing — that is the shape actually seen through the clip window.
function paintTarget(obj) {
    if (obj && obj.type === 'clip') {
        if (obj.children && obj.children[0]) return obj.children[0];
        return obj;
    }
    return obj;
}
function selectedFillStopIdx(objIdx) {
    const obj = paintTarget(objects[objIdx]); if (!obj) return 0;
    const stops = getFillStops(obj);
    const si = fillStopSel[objIdx];
    if (!isFinite(si)) return 0;
    return clampNum(Math.round(si), 0, stops.length - 1);
}
function selectedStrokeStopIdx(objIdx) {
    const obj = paintTarget(objects[objIdx]); if (!obj) return 0;
    const stops = getStrokeStops(obj);
    const si = strokeStopSel[objIdx];
    if (!isFinite(si)) return 0;
    return clampNum(Math.round(si), 0, stops.length - 1);
}
function stopsKey(stops) { return stops.map(s => `${Math.round(s.o * 1000)}:${s.c}`).join('|'); }
function sampleGradientAt(stops, t) {
    const sorted = [...stops].sort((a, b) => a.o - b.o);
    t = clampNum(t, 0, 1);
    if (t <= sorted[0].o) return sorted[0].c;
    if (t >= sorted[sorted.length - 1].o) return sorted[sorted.length - 1].c;
    for (let i = 1; i < sorted.length; i++) {
        if (t <= sorted[i].o) {
            const a0 = sorted[i - 1], a1 = sorted[i];
            const span = (a1.o - a0.o) || 1, k = (t - a0.o) / span;
            const c0 = parseColorToRgba(a0.c), c1 = parseColorToRgba(a1.c);
            return rgbaToHex8(c0.r + (c1.r - c0.r) * k, c0.g + (c1.g - c0.g) * k, c0.b + (c1.b - c0.b) * k, (c0.a ?? 1) + ((c1.a ?? 1) - (c0.a ?? 1)) * k);
        }
    }
    return sorted[sorted.length - 1].c;
}
function applyColorToProp(prop, hex8) {
    selectedIndices.forEach(idx => {
        const o = paintTarget(objects[idx]); if (!o) return;
        if (prop === 'fill' && (o.fillType === 'linear' || o.fillType === 'radial')) {
            const stops = getFillStops(o);
            stops[selectedFillStopIdx(idx)].c = hex8;
            mirrorFillStops(o);
        } else if (prop === 'fill2' && (o.fillType === 'linear' || o.fillType === 'radial')) {
            const stops = getFillStops(o);
            stops[stops.length - 1].c = hex8;
            mirrorFillStops(o);
        } else if (prop === 'stroke' && (o.strokeType === 'linear' || o.strokeType === 'radial')) {
            const stops = getStrokeStops(o);
            stops[selectedStrokeStopIdx(idx)].c = hex8;
            mirrorStrokeStops(o);
        } else if (prop === 'stroke2' && (o.strokeType === 'linear' || o.strokeType === 'radial')) {
            const stops = getStrokeStops(o);
            stops[stops.length - 1].c = hex8;
            mirrorStrokeStops(o);
        } else {
            o[prop] = hex8;
        }
    });
    if (prop === 'fill') activePrimaryColor = hex8;
    if (prop === 'fill2') activeSecondaryColor = hex8;
}
function paintStopTrack(trackEl, stops, kind, selIdx) {
    if (!trackEl) return;
    // NOTE: the inspector track always previews left-to-right (never rotated
    // to the gradient angle) so stops stay visually connected while editing.
    trackEl.style.background = `linear-gradient(to right, ${stops.map(s => `${s.c} ${Math.round(s.o * 100)}%`).join(', ')})`;
    trackEl.innerHTML = '';
    stops.forEach((s, i) => {
        const m = document.createElement('button');
        m.className = 'stop-marker' + (i === selIdx ? ' selected' : '');
        m.style.left = (s.o * 100) + '%';
        m.style.background = s.c;
        m.setAttribute('data-tooltip', `Stop ${i + 1} (${Math.round(s.o * 100)}%)`);
        m.setAttribute('aria-label', `Gradient stop ${i + 1}`);
        // NOTE: indices are resolved live from the DOM (not closures), so
        // events arriving after a re-render can never select the wrong stop.
        m.addEventListener('pointerdown', (e) => startStopDrag(kind, liveMarkerIndex(e), e));
        m.addEventListener('click', (e) => { e.stopPropagation(); selectStop(kind, liveMarkerIndex(e)); });
        m.addEventListener('focus', () => selectStopLight(kind, liveMarkerIndex({ currentTarget: m, target: m })));
        m.addEventListener('dblclick', (e) => { e.stopPropagation(); deleteStop(kind, liveMarkerIndex(e)); });
        trackEl.appendChild(m);
    });
}

// Live marker index: immune to stale closures after track re-renders.
// Returns -1 when the marker is no longer attached (caller must ignore).
function liveMarkerIndex(e) {
    const m = (e && e.currentTarget) || (e && e.target);
    if (!m || !m.parentNode || !m.parentNode.children) return -1;
    return Array.prototype.indexOf.call(m.parentNode.children, m);
}
function renderStopTracks() {
    const fillGroup = document.getElementById('grp-fill-stops');
    const strokeGroup = document.getElementById('grp-stroke-stops');
    const fillTrack = document.getElementById('fill-stop-track');
    const strokeTrack = document.getElementById('stroke-stop-track');
    if (selectedIndices.length === 0) {
        if (fillGroup) fillGroup.style.display = 'none';
        if (strokeGroup) strokeGroup.style.display = 'none';
        return;
    }
    const objIdx = selectedIndices[0];
    const obj = paintTarget(objects[objIdx]);
    const isFillGrad = obj && (obj.fillType === 'linear' || obj.fillType === 'radial');
    const isStrokeGrad = obj && ((obj.strokeType || 'color') === 'linear' || (obj.strokeType || 'color') === 'radial');
    if (fillGroup) fillGroup.style.display = isFillGrad ? 'flex' : 'none';
    if (strokeGroup) strokeGroup.style.display = isStrokeGrad ? 'flex' : 'none';
    if (isFillGrad) {
        const stops = getFillStops(obj);
        paintStopTrack(fillTrack, stops, 'fill', selectedFillStopIdx(objIdx));
    }
    if (isStrokeGrad) {
        const stops = getStrokeStops(obj);
        paintStopTrack(strokeTrack, stops, 'stroke', selectedStrokeStopIdx(objIdx));
    }
}
function selectStop(kind, i) {
    if (!isFinite(i) || i < 0) return;
    if (selectedIndices.length === 0) return;
    const objIdx = selectedIndices[0];
    const obj = paintTarget(objects[objIdx]); if (!obj) return;
    if (kind === 'fill') fillStopSel[objIdx] = clampNum(i, 0, getFillStops(obj).length - 1);
    else strokeStopSel[objIdx] = clampNum(i, 0, getStrokeStops(obj).length - 1);
    playUISound('click');
    render();
}
// Lightweight stop selection (no full render, preserves focus for keyboard users)
function selectStopLight(kind, i) {
    if (!isFinite(i) || i < 0) return;
    if (selectedIndices.length === 0) return;
    const objIdx = selectedIndices[0];
    const obj = paintTarget(objects[objIdx]); if (!obj) return;
    if (kind === 'fill') fillStopSel[objIdx] = clampNum(i, 0, getFillStops(obj).length - 1);
    else strokeStopSel[objIdx] = clampNum(i, 0, getStrokeStops(obj).length - 1);
    const track = document.getElementById(kind === 'fill' ? 'fill-stop-track' : 'stroke-stop-track');
    if (track) Array.from(track.children).forEach((m, mi) => m.classList.toggle('selected', mi === i));
    loadStopIntoSliders(kind);
}
function addStopAt(kind, t) {
    if (selectedIndices.length === 0) return;
    const objIdx = selectedIndices[0];
    const obj = paintTarget(objects[objIdx]); if (!obj) return;
    t = Math.round(clampNum(t, 0, 1) * 1000) / 1000;
    if (kind === 'fill') {
        const stops = getFillStops(obj);
        const c = sampleGradientAt(stops, t);
        stops.push({ o: t, c });
        stops.sort((a, b) => a.o - b.o);
        fillStopSel[objIdx] = stops.findIndex(s => s.o === t && s.c === c);
        mirrorFillStops(obj);
    } else {
        const stops = getStrokeStops(obj);
        const c = sampleGradientAt(stops, t);
        stops.push({ o: t, c });
        stops.sort((a, b) => a.o - b.o);
        strokeStopSel[objIdx] = stops.findIndex(s => s.o === t && s.c === c);
        mirrorStrokeStops(obj);
    }
    playUISound('snap');
    render();
}
function fillTrackClick(evt) {
    if (Date.now() < suppressTrackClickUntil) return;
    if (evt.target !== evt.currentTarget) return;
    const track = evt.currentTarget;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    addStopAt('fill', (evt.clientX - rect.left) / rect.width);
}
function strokeTrackClick(evt) {
    if (Date.now() < suppressTrackClickUntil) return;
    if (evt.target !== evt.currentTarget) return;
    const track = evt.currentTarget;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    addStopAt('stroke', (evt.clientX - rect.left) / rect.width);
}
function deleteStop(kind, which) {
    if (selectedIndices.length === 0) return;
    const objIdx = selectedIndices[0];
    const obj = paintTarget(objects[objIdx]); if (!obj) return;
    const stops = kind === 'fill' ? getFillStops(obj) : getStrokeStops(obj);
    if (stops.length <= 2) { playUISound('delete'); return; }
    const rawSi = (which !== undefined) ? which : (kind === 'fill' ? selectedFillStopIdx(objIdx) : selectedStrokeStopIdx(objIdx));
    if (!isFinite(rawSi) || rawSi < 0) return;
    const si = rawSi;
    stops.splice(clampNum(si, 0, stops.length - 1), 1);
    if (kind === 'fill') { fillStopSel[objIdx] = clampNum(si, 0, stops.length - 1); mirrorFillStops(obj); }
    else { strokeStopSel[objIdx] = clampNum(si, 0, stops.length - 1); mirrorStrokeStops(obj); }
    playUISound('delete');
    render();
}
function deleteFillStop(evt) { if (evt) evt.stopPropagation(); deleteStop('fill'); }
function deleteStrokeStop(evt) { if (evt) evt.stopPropagation(); deleteStop('stroke'); }
function loadStopIntoSliders(kind) {
    if (selectedIndices.length === 0) return;
    const objIdx = selectedIndices[0];
    const obj = paintTarget(objects[objIdx]); if (!obj) return;
    const stops = kind === 'fill' ? getFillStops(obj) : getStrokeStops(obj);
    const si = kind === 'fill' ? selectedFillStopIdx(objIdx) : selectedStrokeStopIdx(objIdx);
    const { r, g, b, a } = parseColorToRgba(stops[si].c);
    const { h, s, v } = rgbToHsv(r, g, b);
    const prefix = kind === 'fill' ? 'fill' : 'stroke';
    document.getElementById(`insp-${prefix}-h`).value = Math.round(h);
    document.getElementById(`insp-${prefix}-s`).value = Math.round(s * 100);
    document.getElementById(`insp-${prefix}-v`).value = Math.round(v * 100);
    document.getElementById(`insp-${prefix}-a`).value = Math.round(clampNum(a ?? 1, 0, 1) * 100);
    updateColorSliderGradients(prefix, h, s * 100, v * 100);
    const swatch = document.getElementById(`${prefix}-swatch`);
    if (swatch) { swatch.style.background = stops[si].c; swatch.textContent = stops[si].c; }
    const preview = document.getElementById(`${prefix}-preview`);
    if (preview) preview.style.background = stops[si].c;
    const hexEl = document.getElementById(`${prefix}-hex`);
    if (hexEl) { hexEl.value = stops[si].c; hexEl.placeholder = ''; }
}
function startStopDrag(kind, stopIdx, evt) {
    evt.stopPropagation(); evt.preventDefault();
    if (selectedIndices.length === 0) return;
    const objIdx = selectedIndices[0];
    const obj = paintTarget(objects[objIdx]); if (!obj) return;
    if (!isFinite(stopIdx) || stopIdx < 0) return;
    if (kind === 'fill') fillStopSel[objIdx] = stopIdx; else strokeStopSel[objIdx] = stopIdx;
    loadStopIntoSliders(kind);
    const track = kind === 'fill' ? document.getElementById('fill-stop-track') : document.getElementById('stroke-stop-track');
    if (track) Array.from(track.children).forEach((m, mi) => m.classList.toggle('selected', mi === stopIdx));
    const marker = evt.currentTarget;
    stopDrag = { kind, objIdx, stopIdx };
    try { marker.setPointerCapture(evt.pointerId); } catch (e) {}
    const onMove = (e) => {
        if (!stopDrag || stopDrag.kind !== kind) return;
        const o = paintTarget(objects[stopDrag.objIdx]); if (!o) return;
        const rect = track.getBoundingClientRect();
        if (!rect.width) return;
        const t = Math.round(clampNum((e.clientX - rect.left) / rect.width, 0, 1) * 1000) / 1000;
        const stops = kind === 'fill' ? getFillStops(o) : getStrokeStops(o);
        const stop = stops[stopDrag.stopIdx]; if (!stop) return;
        stop.o = t;
        marker.style.left = (t * 100) + '%';
        marker.setAttribute('data-tooltip', `Stop ${stopDrag.stopIdx + 1} (${Math.round(t * 100)}%)`);
        track.style.background = `linear-gradient(to right, ${[...stops].sort((a, b) => a.o - b.o).map(s => `${s.c} ${Math.round(s.o * 100)}%`).join(', ')})`;
        const gid = kind === 'fill' ? `grad-${stopDrag.objIdx}` : `sgrad-${stopDrag.objIdx}`;
        const gradEl = defs.querySelector(`#${gid}`);
        if (gradEl && gradEl.children[stopDrag.stopIdx]) gradEl.children[stopDrag.stopIdx].setAttribute('offset', `${Math.round(t * 100)}%`);
    };
    const onUp = () => {
        marker.removeEventListener('pointermove', onMove);
        marker.removeEventListener('pointerup', onUp);
        marker.removeEventListener('pointercancel', onUp);
        suppressTrackClickUntil = Date.now() + 400;
        if (!stopDrag) return;
        const o = paintTarget(objects[stopDrag.objIdx]);
        const keep = o ? (kind === 'fill' ? getFillStops(o)[stopDrag.stopIdx] : getStrokeStops(o)[stopDrag.stopIdx]) : null;
        if (o) {
            const stops = kind === 'fill' ? getFillStops(o) : getStrokeStops(o);
            stops.sort((a, b) => a.o - b.o);
            const ni = keep ? stops.indexOf(keep) : stopDrag.stopIdx;
            if (kind === 'fill') { fillStopSel[stopDrag.objIdx] = Math.max(0, ni); mirrorFillStops(o); }
            else { strokeStopSel[stopDrag.objIdx] = Math.max(0, ni); mirrorStrokeStops(o); }
        }
        stopDrag = null;
        playUISound('snap');
        render();
    };
    marker.addEventListener('pointermove', onMove);
    marker.addEventListener('pointerup', onUp);
    marker.addEventListener('pointercancel', onUp);
}
function hsvaToStrokeString(h, sPct, vPct, aPct) {
    const { r, g, b } = hsvToRgb(h, sPct / 100, vPct / 100);
    const a = clampNum(aPct / 100, 0, 1);
    return rgbaToHex8(r, g, b, a);
}
function rgbCss(r, g, b, a = 1) {
    r = clampNum(Math.round(r), 0, 255); g = clampNum(Math.round(g), 0, 255); b = clampNum(Math.round(b), 0, 255);
    if (a >= 0.995) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${Math.round(clampNum(a, 0, 1) * 100) / 100})`;
}
function updateStrokeSliderGradients(h, sPct, vPct) {
    updateColorSliderGradients('stroke', h, sPct, vPct);
}
function toggleStrokePopup(evt) {
    toggleColorPopup('stroke-popup', evt);
}
function closeStrokePopup() {
    const popup = document.getElementById('stroke-popup');
    if (popup) popup.style.display = 'none';
}
function updateStrokeFromHSVA() {
    const colorStr = updateColorFromHSVA('stroke', 'stroke');
    if (colorStr === null) return;
    render();
    const popup = document.getElementById('stroke-popup');
    if (popup) popup.style.display = 'flex';
}
function syncStrokePopup(strokeVal) {
    syncColorPopup('stroke', strokeVal, '#ffffffff');
}

function updateColorSliderGradients(prefix, h, sPct, vPct) {
    const hEl = document.getElementById(`insp-${prefix}-h`);
    const sEl = document.getElementById(`insp-${prefix}-s`);
    const vEl = document.getElementById(`insp-${prefix}-v`);
    const aEl = document.getElementById(`insp-${prefix}-a`);
    if (!hEl || !sEl || !vEl || !aEl) return;
    h = ((h % 360) + 360) % 360; sPct = clampNum(sPct, 0, 100); vPct = clampNum(vPct, 0, 100);
    hEl.style.background = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';
    const s0 = hsvToRgb(h, 0, vPct / 100), s50 = hsvToRgb(h, 0.5, vPct / 100), s100 = hsvToRgb(h, 1, vPct / 100);
    sEl.style.background = `linear-gradient(to right, ${rgbCss(s0.r, s0.g, s0.b)} 0%, ${rgbCss(s50.r, s50.g, s50.b)} 50%, ${rgbCss(s100.r, s100.g, s100.b)} 100%)`;
    const v0 = hsvToRgb(h, sPct / 100, 0), v50 = hsvToRgb(h, sPct / 100, 0.5), v100 = hsvToRgb(h, sPct / 100, 1);
    vEl.style.background = `linear-gradient(to right, ${rgbCss(v0.r, v0.g, v0.b)} 0%, ${rgbCss(v50.r, v50.g, v50.b)} 50%, ${rgbCss(v100.r, v100.g, v100.b)} 100%)`;
    const full = hsvToRgb(h, sPct / 100, vPct / 100);
    aEl.style.background = `linear-gradient(to right, ${rgbCss(full.r, full.g, full.b, 0)} 0%, ${rgbCss(full.r, full.g, full.b, 1)} 100%), repeating-conic-gradient(#555 0% 25%, #999 0% 50%) 0 0 / 12px 12px`;
}
function toggleColorPopup(popupId, evt) {
    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
    playUISound('click');
    const popup = document.getElementById(popupId);
    if (!popup) return;
    const willShow = popup.style.display === 'none' || popup.style.display === '';
    ['stroke-popup', 'stroke2-popup', 'fill-popup', 'fill2-popup'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (willShow) popup.style.display = 'flex';
}
function toggleFillPopup(evt) { toggleColorPopup('fill-popup', evt); }
function toggleFill2Popup(evt) { toggleColorPopup('fill2-popup', evt); }
function toggleStroke2Popup(evt) { toggleColorPopup('stroke2-popup', evt); }
function updateColorFromHSVA(prefix, prop) {
    if (selectedIndices.length === 0) return null;
    const h = parseFloat(document.getElementById(`insp-${prefix}-h`).value) || 0;
    const s = parseFloat(document.getElementById(`insp-${prefix}-s`).value) || 0;
    const v = parseFloat(document.getElementById(`insp-${prefix}-v`).value) || 0;
    const a = parseFloat(document.getElementById(`insp-${prefix}-a`).value);
    const aSafe = isNaN(a) ? 100 : a;
    const colorStr = hsvaToStrokeString(h, s, v, aSafe);
    applyColorToProp(prop, colorStr);
    const swatch = document.getElementById(`${prefix}-swatch`);
    if (swatch) { swatch.style.background = colorStr; swatch.textContent = colorStr; }
    const preview = document.getElementById(`${prefix}-preview`);
    if (preview) preview.style.background = colorStr;
    const hexEl = document.getElementById(`${prefix}-hex`);
    if (hexEl && document.activeElement !== hexEl) { hexEl.value = colorStr; hexEl.placeholder = ''; }
    const vh = document.getElementById(`val-${prefix}-h`); if (vh) vh.innerText = Math.round(h);
    const vs = document.getElementById(`val-${prefix}-s`); if (vs) vs.innerText = Math.round(s);
    const vv = document.getElementById(`val-${prefix}-v`); if (vv) vv.innerText = Math.round(v);
    const va = document.getElementById(`val-${prefix}-a`); if (va) va.innerText = Math.round(aSafe);
    updateColorSliderGradients(prefix, h, s, v);
    return colorStr;
}
function setColorFromHex(prefix, prop) {
    if (selectedIndices.length === 0) return;
    const hexEl = document.getElementById(`${prefix}-hex`);
    if (!hexEl) return;
    const fallback = prop === 'fill' ? '#a305ffff' : '#38bdf8ff';
    const hex8 = toHex8String(hexEl.value, fallback);
    if (!hex8) { playUISound('delete'); render(); return; }
    applyColorToProp(prop, hex8);
    playUISound('snap');
    render();
    const popup = document.getElementById(`${prefix}-popup`);
    if (popup) popup.style.display = 'flex';
    const hexAgain = document.getElementById(`${prefix}-hex`);
    if (hexAgain) { hexAgain.focus(); }
}
let colorPickMode = null;
async function pickFromCanvas(prefix, prop, evt) {
    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
    if (selectedIndices.length === 0) return;
    if (window.EyeDropper) {
        try {
            const eye = new window.EyeDropper();
            const res = await eye.open();
            const hex8 = toHex8String(res && res.sRGBHex ? res.sRGBHex : '', '#ffffffff');
            if (hex8) {
                applyColorToProp(prop, hex8);
                playUISound('snap');
                render();
            }
            const popup = document.getElementById(`${prefix}-popup`);
            if (popup) popup.style.display = 'flex';
            return;
        } catch (e) { /* user cancelled or failed: fall through to canvas mode */ }
    }
    colorPickMode = { prefix, prop };
    playUISound('click');
    document.querySelectorAll('.popup-pick-btn').forEach(b => b.classList.remove('armed'));
    const popup = document.getElementById(`${prefix}-popup`);
    const btn = popup ? popup.querySelector('.popup-pick-btn') : null;
    if (btn) btn.classList.add('armed');
    svg.style.cursor = 'crosshair';
}
function sampleColorFromCanvas(evt) {
    const mode = colorPickMode;
    colorPickMode = null;
    svg.style.cursor = '';
    document.querySelectorAll('.popup-pick-btn').forEach(b => b.classList.remove('armed'));
    if (!mode || selectedIndices.length === 0) { render(); return; }
    const t = evt.target;
    const srcIdx = t && t.dataset && t.dataset.idx !== undefined ? parseInt(t.dataset.idx, 10) : NaN;
    if (isNaN(srcIdx) || !objects[srcIdx]) { render(); return; }
    const fallback = mode.prop === 'fill' ? '#a305ffff' : '#38bdf8ff';
    const src = objects[srcIdx][mode.prop] || objects[srcIdx].fill || fallback;
    const hex8 = toHex8String(src, fallback) || fallback;
    applyColorToProp(mode.prop, hex8);
    playUISound('snap');
    render();
    setTimeout(() => {
        const popup = document.getElementById(`${mode.prefix}-popup`);
        if (popup) popup.style.display = 'flex';
    }, 0);
}
function updateFillFromHSVA() {
    const colorStr = updateColorFromHSVA('fill', 'fill');
    if (colorStr === null) return;
    render();
    const popup = document.getElementById('fill-popup');
    if (popup) popup.style.display = 'flex';
}
function updateFill2FromHSVA() {
    const colorStr = updateColorFromHSVA('fill2', 'fill2');
    if (colorStr === null) return;
    render();
    const popup = document.getElementById('fill2-popup');
    if (popup) popup.style.display = 'flex';
}
function updateStroke2FromHSVA() {
    const colorStr = updateColorFromHSVA('stroke2', 'stroke2');
    if (colorStr === null) return;
    render();
    const popup = document.getElementById('stroke2-popup');
    if (popup) popup.style.display = 'flex';
}
function syncColorPopup(prefix, colorVal, fallback) {
    const hEl = document.getElementById(`insp-${prefix}-h`);
    const sEl = document.getElementById(`insp-${prefix}-s`);
    const vEl = document.getElementById(`insp-${prefix}-v`);
    const aEl = document.getElementById(`insp-${prefix}-a`);
    const swatch = document.getElementById(`${prefix}-swatch`);
    const preview = document.getElementById(`${prefix}-preview`);
    const hexEl = document.getElementById(`${prefix}-hex`);
    if (!hEl || !sEl || !vEl || !aEl) return;
    const activeId = document.activeElement && document.activeElement.id;
    const editing = activeId === `insp-${prefix}-h` || activeId === `insp-${prefix}-s` || activeId === `insp-${prefix}-v` || activeId === `insp-${prefix}-a` || activeId === `${prefix}-hex`;
    if (colorVal === 'MIXED') {
        if (swatch && !editing) { swatch.style.background = 'repeating-conic-gradient(#666 0% 25%, #999 0% 50%) 0 0 / 12px 12px'; swatch.textContent = 'MIXED'; }
        if (hexEl && !editing) { hexEl.value = ''; hexEl.placeholder = 'MIXED'; }
        updateColorSliderGradients(prefix, parseFloat(hEl.value) || 0, parseFloat(sEl.value) || 0, parseFloat(vEl.value) || 0);
        return;
    }
    const { r, g, b, a } = parseColorToRgba(colorVal || fallback);
    const { h, s, v } = rgbToHsv(r, g, b);
    const aPct = Math.round(clampNum(a ?? 1, 0, 1) * 100);
    if (!editing) {
        hEl.value = Math.round(h); sEl.value = Math.round(s * 100); vEl.value = Math.round(v * 100); aEl.value = aPct;
    }
    const colorStr = toHex8String(colorVal || fallback, fallback) || fallback;
    if (swatch) { swatch.style.background = colorStr; swatch.textContent = colorStr; }
    if (preview) preview.style.background = colorStr;
    if (hexEl && document.activeElement !== hexEl) { hexEl.value = colorStr; hexEl.placeholder = ''; }
    const vh = document.getElementById(`val-${prefix}-h`); if (vh) vh.innerText = Math.round(h);
    const vs = document.getElementById(`val-${prefix}-s`); if (vs) vs.innerText = Math.round(s * 100);
    const vv = document.getElementById(`val-${prefix}-v`); if (vv) vv.innerText = Math.round(v * 100);
    const va = document.getElementById(`val-${prefix}-a`); if (va) va.innerText = aPct;
    updateColorSliderGradients(prefix, h, s * 100, v * 100);
}
function syncFillPopup(fillVal) { syncColorPopup('fill', fillVal, '#a305ffff'); }
function syncFill2Popup(fill2Val) { syncColorPopup('fill2', fill2Val, '#38bdf8ff'); }
function syncStroke2Popup(stroke2Val) { syncColorPopup('stroke2', stroke2Val, '#38bdf8ff'); }

function setFillType(type) {
    if (selectedIndices.length === 0) return;
    if (!['color', 'linear', 'radial', 'none'].includes(type)) return;
    playUISound('click');
    selectedIndices.forEach(idx => {
        const t = paintTarget(objects[idx]); if (!t) return;
        t.fillType = type;
        if (type === 'linear' || type === 'radial') { getFillStops(t); if (!isFinite(fillStopSel[idx])) fillStopSel[idx] = 0; }
        if (type === 'linear' && !isFinite(t.fillAngle)) t.fillAngle = 0;
    });
    render();
}
function setStrokeType(type) {
    if (selectedIndices.length === 0) return;
    if (!['color', 'linear', 'radial', 'none'].includes(type)) return;
    playUISound('click');
    selectedIndices.forEach(idx => {
        const t = paintTarget(objects[idx]); if (!t) return;
        t.strokeType = type;
        if (type === 'linear' || type === 'radial') { getStrokeStops(t); if (!isFinite(strokeStopSel[idx])) strokeStopSel[idx] = 0; }
        if (type === 'linear' && !isFinite(t.strokeAngle)) t.strokeAngle = 0;
    });
    render();
}
function updateGradientAngle(kind) {
    if (selectedIndices.length === 0) return;
    const input = document.getElementById(kind === 'fill' ? 'insp-fill-angle' : 'insp-stroke-angle');
    if (!input) return;
    const label = document.getElementById(kind === 'fill' ? 'val-fill-angle' : 'val-stroke-angle');
    const ang = clampNum(Math.round(parseFloat(input.value) || 0), 0, 360);
    if (label) label.innerText = ang;
    selectedIndices.forEach(idx => {
        const o = paintTarget(objects[idx]); if (!o) return;
        if (kind === 'fill') o.fillAngle = ang; else o.strokeAngle = ang;
    });
    render();
}

function switchStyleTab(tab) {
    styleTab = (tab === 'stroke') ? 'stroke' : 'fill';
    playUISound('click');
    syncInspector();
}

function switchInspectorTab(tab) {
    inspectorTab = (tab === 'style' || tab === 'layers') ? tab : 'design';
    playUISound('click');
    syncInspector();
}

function syncInspector() {
    const content = document.getElementById('inspector-content');
    const empty = document.getElementById('inspector-empty');

    if (selectedIndices.length > 0) {
        content.style.display = 'flex'; empty.style.display = 'none';

        const segDesign = document.getElementById('seg-design');
        const segStyle = document.getElementById('seg-style');
        if (segDesign) segDesign.classList.toggle('active', inspectorTab === 'design');
        if (segStyle) segStyle.classList.toggle('active', inspectorTab === 'style');
        const segLayers = document.getElementById('seg-layers');
        if (segLayers) segLayers.classList.toggle('active', inspectorTab === 'layers');
        const panelDesign = document.getElementById('panel-design');
        const panelStyle = document.getElementById('panel-style');
        if (panelDesign) panelDesign.style.display = inspectorTab === 'design' ? 'flex' : 'none';
        if (panelStyle) panelStyle.style.display = inspectorTab === 'style' ? 'flex' : 'none';
        const panelLayers = document.getElementById('panel-layers');
        if (panelLayers) panelLayers.style.display = inspectorTab === 'layers' ? 'flex' : 'none';
        renderLayerList();

        const clipContent = (selectedIndices.length > 0 && objects[selectedIndices[0]] && objects[selectedIndices[0]].type === 'clip') ? paintTarget(objects[selectedIndices[0]]) : null;
        const fillVal = clipContent ? clipContent.fill : getMixedProperty('fill');
        const fill2Val = clipContent ? clipContent.fill2 : getMixedProperty('fill2');
        const strokeVal = clipContent ? clipContent.stroke : getMixedProperty('stroke');
        const stroke2Val = clipContent ? clipContent.stroke2 : getMixedProperty('stroke2');
        const fillTypeVal = clipContent ? (clipContent.fillType || 'color') : getMixedProperty('fillType');
        const strokeTypeVal = clipContent ? (clipContent.strokeType || 'color') : getMixedProperty('strokeType');
        const strokeWidthVal = clipContent ? clipContent.strokeWidth : getMixedProperty('strokeWidth');
        const isFillGrad = fillTypeVal === 'linear' || fillTypeVal === 'radial';
        const isStrokeGrad = strokeTypeVal === 'linear' || strokeTypeVal === 'radial';

        const segFill = document.getElementById('seg-fill');
        const segStroke = document.getElementById('seg-stroke');
        if (segFill) segFill.classList.toggle('active', styleTab !== 'stroke');
        if (segStroke) segStroke.classList.toggle('active', styleTab === 'stroke');
        const subFill = document.getElementById('subpanel-fill');
        const subStroke = document.getElementById('subpanel-stroke');
        if (subFill) subFill.style.display = styleTab === 'stroke' ? 'none' : 'flex';
        if (subStroke) subStroke.style.display = styleTab === 'stroke' ? 'flex' : 'none';

        ['color', 'linear', 'radial', 'none'].forEach(t => {
            const btn = document.getElementById(`filltype-${t}`);
            if (btn) btn.classList.toggle('active', fillTypeVal !== 'MIXED' && (fillTypeVal || 'color') === t);
        });
        ['color', 'linear', 'radial', 'none'].forEach(t => {
            const btn = document.getElementById(`stroketype-${t}`);
            if (btn) btn.classList.toggle('active', strokeTypeVal !== 'MIXED' && (strokeTypeVal || 'color') === t);
        });
        const grpFill1 = document.getElementById('grp-fill-color');
        const grpFill2 = document.getElementById('grp-fill-color2');
        if (grpFill1) grpFill1.style.display = (fillTypeVal === 'none') ? 'none' : 'flex';
        if (grpFill2) grpFill2.style.display = 'none';
        const grpStroke1 = document.getElementById('grp-stroke-color');
        const grpStroke2 = document.getElementById('grp-stroke-color2');
        const grpStrokeW = document.getElementById('grp-stroke-width');
        const strokeTypeEff = strokeTypeVal === 'MIXED' ? 'color' : (strokeTypeVal || 'color');
        if (grpStroke1) grpStroke1.style.display = (strokeTypeEff === 'none') ? 'none' : 'flex';
        if (grpStroke2) grpStroke2.style.display = 'none';
        if (grpStrokeW) grpStrokeW.style.display = (strokeTypeEff === 'none') ? 'none' : 'flex';
        const fillLabel = document.getElementById('fill-color-label');
        const strokeLabel = document.getElementById('stroke-color-label');
        let fillDisplayVal = fillVal, strokeDisplayVal = strokeVal;
        if (selectedIndices.length > 0) {
            const pObj = paintTarget(objects[selectedIndices[0]]);
            if (isFillGrad && pObj) {
                const pStops = getFillStops(pObj);
                const sameFill = selectedIndices.every(idx => { const t = paintTarget(objects[idx]); return t && stopsKey(getFillStops(t)) === stopsKey(pStops); });
                const si = selectedFillStopIdx(selectedIndices[0]);
                fillDisplayVal = sameFill ? pStops[clampNum(si, 0, pStops.length - 1)].c : 'MIXED';
                if (fillLabel) fillLabel.innerText = `Stop ${clampNum(si, 0, pStops.length - 1) + 1} of ${pStops.length} Color`;
            } else if (fillLabel) fillLabel.innerText = 'Fill Color 1';
            if (isStrokeGrad && pObj) {
                const pStops = getStrokeStops(pObj);
                const sameStroke = selectedIndices.every(idx => { const t = paintTarget(objects[idx]); return t && stopsKey(getStrokeStops(t)) === stopsKey(pStops); });
                const si = selectedStrokeStopIdx(selectedIndices[0]);
                strokeDisplayVal = sameStroke ? pStops[clampNum(si, 0, pStops.length - 1)].c : 'MIXED';
                if (strokeLabel) strokeLabel.innerText = `Stop ${clampNum(si, 0, pStops.length - 1) + 1} of ${pStops.length} Color`;
            } else if (strokeLabel) strokeLabel.innerText = 'Stroke Color 1';
        }
        syncFillPopup(fillDisplayVal);
        syncFill2Popup(fill2Val);
        syncStrokePopup(strokeDisplayVal);
        syncStroke2Popup(stroke2Val);
        const fillAngleVal = clipContent ? clipContent.fillAngle : getMixedProperty('fillAngle');
        const strokeAngleVal = clipContent ? clipContent.strokeAngle : getMixedProperty('strokeAngle');
        const grpFillAngle = document.getElementById('grp-fill-angle');
        const grpStrokeAngle = document.getElementById('grp-stroke-angle');
        if (grpFillAngle) grpFillAngle.style.display = (fillTypeVal === 'linear') ? 'flex' : 'none';
        if (grpStrokeAngle) grpStrokeAngle.style.display = (strokeTypeVal === 'linear') ? 'flex' : 'none';
        const fillAngleInput = document.getElementById('insp-fill-angle');
        if (fillAngleInput && document.activeElement !== fillAngleInput && fillAngleVal !== 'MIXED' && fillAngleVal !== undefined) {
            fillAngleInput.value = fillAngleVal;
        }
        const strokeAngleInput = document.getElementById('insp-stroke-angle');
        if (strokeAngleInput && document.activeElement !== strokeAngleInput && strokeAngleVal !== 'MIXED' && strokeAngleVal !== undefined) {
            strokeAngleInput.value = strokeAngleVal;
        }
        const valFillAngle = document.getElementById('val-fill-angle');
        if (valFillAngle && fillAngleVal !== 'MIXED' && fillAngleVal !== undefined) valFillAngle.innerText = Math.round(fillAngleVal);
        const valStrokeAngle = document.getElementById('val-stroke-angle');
        if (valStrokeAngle && strokeAngleVal !== 'MIXED' && strokeAngleVal !== undefined) valStrokeAngle.innerText = Math.round(strokeAngleVal);
        renderStopTracks();

        const strokeWidthInput = document.getElementById('insp-stroke-width');
        if (document.activeElement !== strokeWidthInput) {
            if (strokeWidthVal === 'MIXED' || strokeWidthVal === undefined || strokeWidthVal === '') {
                strokeWidthInput.value = '';
                strokeWidthInput.placeholder = strokeWidthVal === 'MIXED' ? 'MIXED' : '';
            } else {
                strokeWidthInput.value = strokeWidthVal;
                strokeWidthInput.placeholder = '';
            }
        }

        const cornerVal = clipContent ? clipContent.rx : getMixedProperty('rx');
        const cornerInput = document.getElementById('insp-corner-radius');
        if (cornerInput && document.activeElement !== cornerInput) {
            if (cornerVal === 'MIXED' || cornerVal === undefined || cornerVal === '') {
                cornerInput.value = '';
                cornerInput.placeholder = cornerVal === 'MIXED' ? 'MIXED' : '';
            } else {
                cornerInput.value = cornerVal;
                cornerInput.placeholder = '';
            }
        }

        const opacityVal = getMixedProperty('opacity');
        const blurVal = getMixedProperty('blur');
        const rotationVal = getMixedProperty('rotation');
        const opacityInput = document.getElementById('insp-opacity');
        const blurInput = document.getElementById('insp-blur');
        const rotationInput = document.getElementById('insp-rotation');
        if (opacityInput && document.activeElement !== opacityInput && opacityVal !== 'MIXED' && opacityVal !== undefined) {
            opacityInput.value = opacityVal;
        }
        if (blurInput && document.activeElement !== blurInput && blurVal !== 'MIXED' && blurVal !== undefined) {
            blurInput.value = blurVal;
        }
        if (rotationInput && document.activeElement !== rotationInput && rotationVal !== 'MIXED' && rotationVal !== undefined) {
            rotationInput.value = rotationVal;
        }
        const valOpacity = document.getElementById('val-opacity');
        const valBlur = document.getElementById('val-blur');
        const valRotation = document.getElementById('val-rotation');
        if (valOpacity && opacityVal !== 'MIXED' && opacityVal !== undefined) valOpacity.innerText = Math.round(opacityVal * 100);
        if (valBlur && blurVal !== 'MIXED' && blurVal !== undefined) valBlur.innerText = blurVal;
        if (valRotation && rotationVal !== 'MIXED' && rotationVal !== undefined) valRotation.innerText = rotationVal;

        const isTextSelection = selectedIndices.every(idx => objects[idx] && objects[idx].type === 'text');
        const lblText = document.getElementById('lbl-text-section');
        const grpText = document.getElementById('grp-text-content');
        const grpFont = document.getElementById('grp-font-size');
        if (lblText) lblText.style.display = isTextSelection ? '' : 'none';
        if (grpText) grpText.style.display = isTextSelection ? '' : 'none';
        if (grpFont) grpFont.style.display = isTextSelection ? '' : 'none';

        if (isTextSelection) {
            const textVal = getMixedProperty('text');
            const fontSizeVal = getMixedProperty('fontSize');
            const textInput = document.getElementById('insp-text-val');
            const fontInput = document.getElementById('insp-font-size');
            if (document.activeElement !== textInput) {
                textInput.value = textVal === 'MIXED' ? '' : (textVal ?? '');
                textInput.placeholder = textVal === 'MIXED' ? 'MIXED' : '';
            }
            if (document.activeElement !== fontInput) {
                if (fontSizeVal === 'MIXED' || fontSizeVal === undefined || fontSizeVal === '') {
                    fontInput.value = '';
                    fontInput.placeholder = fontSizeVal === 'MIXED' ? 'MIXED' : '';
                } else {
                    fontInput.value = fontSizeVal;
                    fontInput.placeholder = '';
                }
            }
        }
    } else if (inspectorTab === 'layers') {
        content.style.display = 'flex'; empty.style.display = 'none';
        const segDesign = document.getElementById('seg-design');
        const segStyle = document.getElementById('seg-style');
        const segLayers = document.getElementById('seg-layers');
        if (segDesign) segDesign.classList.remove('active');
        if (segStyle) segStyle.classList.remove('active');
        if (segLayers) segLayers.classList.add('active');
        const panelDesign = document.getElementById('panel-design');
        const panelStyle = document.getElementById('panel-style');
        const panelLayers = document.getElementById('panel-layers');
        if (panelDesign) panelDesign.style.display = 'none';
        if (panelStyle) panelStyle.style.display = 'none';
        if (panelLayers) panelLayers.style.display = 'flex';
        renderLayerList();
    } else {
        content.style.display = 'none'; empty.style.display = 'block';
    }
}

function updateSelectedObject() {
    if (selectedIndices.length === 0) return;

    const activeId = document.activeElement && document.activeElement.id;
    const textInput = document.getElementById('insp-text-val');
    const fontInput = document.getElementById('insp-font-size');
    const strokeWidthInput = document.getElementById('insp-stroke-width');
    const cornerInput = document.getElementById('insp-corner-radius');
    const opacityInput = document.getElementById('insp-opacity');
    const blurInput = document.getElementById('insp-blur');
    const rotationInput = document.getElementById('insp-rotation');
    const newText = textInput ? textInput.value : '';
    const newFontSize = fontInput ? parseInt(fontInput.value, 10) : NaN;
    const newStrokeWidth = strokeWidthInput ? parseFloat(strokeWidthInput.value) : NaN;
    const newCorner = cornerInput ? parseFloat(cornerInput.value) : NaN;
    const newOpacity = opacityInput ? parseFloat(opacityInput.value) : NaN;
    const newBlur = blurInput ? parseFloat(blurInput.value) : NaN;
    const newRotation = rotationInput ? parseFloat(rotationInput.value) : NaN;
    const textIsMixedPlaceholder = textInput && textInput.placeholder === 'MIXED' && textInput.value === '';
    const fontIsMixedPlaceholder = fontInput && fontInput.placeholder === 'MIXED' && fontInput.value === '';
    const strokeWidthIsMixedPlaceholder = strokeWidthInput && strokeWidthInput.placeholder === 'MIXED' && strokeWidthInput.value === '';
    const cornerIsMixedPlaceholder = cornerInput && cornerInput.placeholder === 'MIXED' && cornerInput.value === '';

    selectedIndices.forEach(idx => {
        const obj = objects[idx];
        const paint = paintTarget(obj); if (!paint) return;
        const editingStrokeWidth = activeId === 'insp-stroke-width' || !strokeWidthIsMixedPlaceholder;
        if (editingStrokeWidth && !isNaN(newStrokeWidth)) paint.strokeWidth = Math.max(0, Math.min(50, newStrokeWidth));
        const editingCorner = activeId === 'insp-corner-radius' || !cornerIsMixedPlaceholder;
        if (editingCorner && !isNaN(newCorner) && (paint.type === 'rect')) paint.rx = Math.max(0, Math.min(100, newCorner));
        if (!isNaN(newOpacity)) obj.opacity = Math.max(0, Math.min(1, newOpacity));
        if (!isNaN(newBlur)) obj.blur = Math.max(0, Math.min(20, newBlur));
        if (!isNaN(newRotation)) obj.rotation = Math.max(0, Math.min(360, newRotation));
        if (obj.type === 'text') {
            const editingText = activeId === 'insp-text-val' || !textIsMixedPlaceholder;
            const editingFont = activeId === 'insp-font-size' || !fontIsMixedPlaceholder;
            if (editingText) obj.text = newText;
            if (editingFont && !isNaN(newFontSize)) obj.fontSize = Math.max(8, Math.min(200, newFontSize));
        }
    });

    render();
    if (activeId) {
        const refocus = document.getElementById(activeId);
        if (refocus && document.activeElement !== refocus && (activeId === 'insp-text-val' || activeId === 'insp-font-size' || activeId === 'insp-stroke-width')) {
            refocus.focus();
            if (refocus.setSelectionRange && refocus.value) {
                try { refocus.setSelectionRange(refocus.value.length, refocus.value.length); } catch(e) {}
            }
        }
    }
}

function deleteSelectedObject() {
    if (selectedIndices.length > 0) {
        playUISound('delete');
        objects = objects.filter((_, idx) => !selectedIndices.includes(idx));
        selectedIndices = [];
        render();
    }
}

// ---- Boolean operations / clip / mask ----
function sortedSelected() { return [...selectedIndices].sort((a, b) => a - b); }

function replaceSelectedWith(newObj) {
    const idxs = sortedSelected();
    if (idxs.length === 0) return -1;
    const copies = idxs.map(i => JSON.parse(JSON.stringify(objects[i])));
    for (let k = idxs.length - 1; k >= 0; k--) objects.splice(idxs[k], 1);
    const at = Math.min(idxs[0], objects.length);
    objects.splice(at, 0, newObj);
    selectedIndices = [at];
    return at;
}

function doBooleanOp(op) {
    if (!['union', 'subtract', 'intersect', 'exclude'].includes(op)) return;
    if (selectedIndices.length < 2) { playUISound('delete'); closeOpsPopup(); return; }
    const copies = sortedSelected().map(i => JSON.parse(JSON.stringify(objects[i])));
    let acc = { type: 'boolean', op, children: [copies[0], copies[1]], opacity: 1, rotation: 0, blur: 0 };
    for (let k = 2; k < copies.length; k++) {
        acc = { type: 'boolean', op, children: [acc, copies[k]], opacity: 1, rotation: 0, blur: 0 };
    }
    replaceSelectedWith(acc);
    playUISound('snap');
    closeOpsPopup();
    render();
}

function doClip() {
    if (selectedIndices.length < 2) { playUISound('delete'); closeOpsPopup(); return; }
    const copies = sortedSelected().map(i => JSON.parse(JSON.stringify(objects[i])));
    const clipShape = copies[copies.length - 1];
    replaceSelectedWith({ type: 'clip', clip: clipShape, children: copies.slice(0, -1), opacity: 1, rotation: 0, blur: 0 });
    playUISound('snap');
    closeOpsPopup();
    render();
}

function doMask() {
    if (selectedIndices.length < 2) { playUISound('delete'); closeOpsPopup(); return; }
    const copies = sortedSelected().map(i => JSON.parse(JSON.stringify(objects[i])));
    const maskShape = copies[copies.length - 1];
    replaceSelectedWith({ type: 'mask', mask: maskShape, children: copies.slice(0, -1), opacity: 1, rotation: 0, blur: 0 });
    playUISound('snap');
    closeOpsPopup();
    render();
}

function releaseOp() {
    if (selectedIndices.length === 0) { playUISound('delete'); closeOpsPopup(); return; }
    const at = sortedSelected()[0];
    const obj = objects[at];
    if (!obj || (obj.type !== 'clip' && obj.type !== 'mask' && obj.type !== 'boolean')) { playUISound('delete'); closeOpsPopup(); return; }
    let parts = [];
    if (obj.type === 'clip') parts = [obj.clip, ...(obj.children || [])].filter(Boolean);
    else if (obj.type === 'mask') parts = [obj.mask, ...(obj.children || [])].filter(Boolean);
    else parts = (obj.children || []).slice();
    if (parts.length === 0) { playUISound('delete'); closeOpsPopup(); return; }
    objects.splice(at, 1);
    parts.forEach((p, k) => objects.splice(at + k, 0, p));
    selectedIndices = parts.map((_, k) => at + k);
    playUISound('snap');
    closeOpsPopup();
    render();
}

function convertToPathMenu() {
    if (selectedIndices.length === 0) { playUISound('delete'); closeOpsPopup(); return; }
    const before = JSON.stringify(objects);
    convertSelectedToPath();
    closeOpsPopup();
    if (JSON.stringify(objects) === before) { playUISound('delete'); return; }
    render();
}

function toggleOpsPopup(evt) {
    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
    playUISound('click');
    const popup = document.getElementById('ops-popup');
    if (!popup) return;
    popup.style.display = (popup.style.display === 'none' || popup.style.display === '') ? 'flex' : 'none';
}

function closeOpsPopup() {
    const popup = document.getElementById('ops-popup');
    if (popup) popup.style.display = 'none';
}

function toggleEditPopup(evt) {
    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
    playUISound('click');
    const popup = document.getElementById('edit-popup');
    if (!popup) return;
    popup.style.display = (popup.style.display === 'none' || popup.style.display === '') ? 'flex' : 'none';
}

function closeEditPopup() {
    const popup = document.getElementById('edit-popup');
    if (popup) popup.style.display = 'none';
}

// ---- Layers (fixes the Layer Stacking buttons, powers the Layers panel) ----
function moveLayerByIndex(idx, dir) {
    if (!isFinite(idx) || !objects[idx]) return;
    let to = idx;
    if (dir === 'top') to = objects.length - 1;
    else if (dir === 'bottom') to = 0;
    else if (dir === 'up') to = Math.min(objects.length - 1, idx + 1);
    else if (dir === 'down') to = Math.max(0, idx - 1);
    else return;
    if (to === idx) return;
    const item = objects.splice(idx, 1)[0];
    objects.splice(to, 0, item);
    selectedIndices = selectedIndices.map(i => i === idx ? to : (idx < i && i <= to ? i - 1 : (to <= i && i < idx ? i + 1 : i)));
    playUISound('snap');
    render();
}

function moveLayer(dir) {
    if (selectedIndices.length === 0) return;
    moveLayerByIndex(selectedIndices[0], dir);
}

function deleteObjectByIndex(idx) {
    if (!isFinite(idx) || !objects[idx]) return;
    playUISound('delete');
    objects.splice(idx, 1);
    selectedIndices = selectedIndices.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
    render();
}

function duplicateSelected() {
    if (selectedIndices.length === 0) return;
    const idxs = [...selectedIndices].sort((a, b) => a - b);
    const copies = idxs.map(i => JSON.parse(JSON.stringify(objects[i])));
    copies.forEach(c => objects.push(c));
    selectedIndices = copies.map((_, k) => objects.length - copies.length + k);
    playUISound('snap');
    render();
}

function layerNameFor(o, i) {
    if (!o) return `Layer ${i + 1}`;
    if (o.type === 'text') { const t = String(o.text || 'Inkpath'); return `"${t.length > 14 ? t.slice(0, 14) + '…' : t}"`; }
    if (o.type === 'path') return `Path (${(o.nodes || []).length} pts)`;
    if (o.type === 'boolean') return { union: 'Union', subtract: 'Subtract', intersect: 'Intersect', exclude: 'Exclude' }[o.op] || 'Boolean';
    if (o.type === 'clip') return 'Clip group';
    if (o.type === 'mask') return 'Mask group';
    return o.type.charAt(0).toUpperCase() + o.type.slice(1);
}

function layerSwatchFor(o) {
    if (!o) return 'rgba(255,255,255,0.25)';
    if (o.type === 'clip' && o.children && o.children[0]) o = o.children[0];
    if (o.type === 'boolean' || o.type === 'clip' || o.type === 'mask') return 'rgba(255,255,255,0.25)';
    const f = o.fill;
    if (typeof f === 'string' && f.charAt(0) === '#') return f.slice(0, 7);
    return '#A305FF';
}

function renderLayerList() {
    const list = document.getElementById('layer-list');
    if (!list) return;
    list.innerHTML = '';
    if (objects.length === 0) {
        const d = document.createElement('div');
        d.className = 'layer-empty';
        d.textContent = 'No layers yet. Draw something!';
        list.appendChild(d);
        return;
    }
    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        const row = document.createElement('div');
        row.className = 'layer-row' + (selectedIndices.includes(i) ? ' selected' : '');
        const sw = document.createElement('span');
        sw.className = 'layer-swatch';
        sw.style.background = layerSwatchFor(o);
        const nm = document.createElement('span');
        nm.className = 'layer-name';
        nm.textContent = layerNameFor(o, i);
        const up = document.createElement('button');
        up.className = 'layer-mini'; up.textContent = '↑'; up.title = 'Move up';
        up.onclick = (e) => { e.stopPropagation(); moveLayerByIndex(i, 'up'); };
        const down = document.createElement('button');
        down.className = 'layer-mini'; down.textContent = '↓'; down.title = 'Move down';
        down.onclick = (e) => { e.stopPropagation(); moveLayerByIndex(i, 'down'); };
        const del = document.createElement('button');
        del.className = 'layer-mini'; del.textContent = '✕'; del.title = 'Delete';
        del.onclick = (e) => { e.stopPropagation(); deleteObjectByIndex(i); };
        row.onclick = (e) => {
            if (e.shiftKey) {
                if (selectedIndices.includes(i)) selectedIndices = selectedIndices.filter(x => x !== i);
                else selectedIndices.push(i);
            } else {
                selectedIndices = [i];
            }
            playUISound('click');
            render();
        };
        row.appendChild(sw); row.appendChild(nm);
        row.appendChild(up); row.appendChild(down); row.appendChild(del);
        list.appendChild(row);
    }
}

function exportKV() {
    playUISound('click');
    const kvStr = jsyaml.dump({ inkpath_version: "2.5", shapes: objects });
    downloadFile(new Blob([kvStr], { type: 'text/yaml' }), 'drawing.kv');
}

function importKV(evt) {
    const file = evt.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const doc = jsyaml.load(e.target.result);
        if (doc && doc.shapes) { objects = doc.shapes; selectedIndices = []; playUISound('snap'); render(); }
    };
    reader.readAsText(file);
}

function exportSVG() {
    playUISound('click');
    const cloneSvg = svg.cloneNode(true);
    cloneSvg.querySelector('#ui-layer').remove(); cloneSvg.querySelector('#preview-layer').remove();
    downloadFile(new Blob([cloneSvg.outerHTML], { type: 'image/svg+xml' }), 'export.svg');
}

function exportPNG() {
    playUISound('click');
    const cloneSvg = svg.cloneNode(true);
    cloneSvg.querySelector('#ui-layer').remove(); cloneSvg.querySelector('#preview-layer').remove();
    const svgData = new XMLSerializer().serializeToString(cloneSvg);
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_BOUNDS.width; canvas.height = CANVAS_BOUNDS.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => downloadFile(blob, 'export.png'));
    };
}

function downloadFile(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

render();