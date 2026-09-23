let numRows = 15;
let numCols = 6;
let cellData = {}; 
let cellStyles = {}; 
let activeCellId = "A1";

let currentChartColIndex = 0;
let isChartOpen = false;

// ==========================================
// AERO AUDIO SOUND EFFECTS SYNTHESIZER
// ==========================================
function playAeroClickSound(frequency = 600, duration = 0.08) {
    try {
        const ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {}
}

// The inline Keydown formatting tags mapped to their Aero CSS classes
const keydownDefinitions = [
    { open: '=Y=',  close: '=Y=',  className: 'gel-orb gel-y' },
    { open: '=R=',  close: '=R=',  className: 'gel-orb gel-r' },
    { open: '=G=',  close: '=G=',  className: 'gel-orb gel-g' },
    { open: '=C=',  close: '=C=',  className: 'gel-orb gel-c' },
    { open: '=B=',  close: '=B=',  className: 'gel-orb gel-b' },
    { open: '&&',   close: '&&',   className: 'spark-text' },
    { open: '~G~',  close: '~G~',  className: 'gel-green-flash' },
    { open: '~U~',  close: '~U~',  className: 'liquid-underline' },
    { open: '~B~',  close: '~B~',  className: 'glossy-border-badge' },
    { open: '~S~',  close: '~S~',  className: 'cyber-glow-spark' },
    { open: '~L~',  close: '~L~',  className: 'liquid-text-glow' },
    { open: '~E~',  close: '~E~',  className: 'embossed-glass-text' },
    { open: '~WD~', close: '~WD~', className: 'gel-chip-waterdrop' },
    { open: '~AW~', close: '~AW~', className: 'gel-chip-aurorawave' },
    { open: '~SF~', close: '~SF~', className: 'gel-chip-solarflare' },
    { open: '!#A#', close: '#',    className: 'aero-tag-chip tag-chip-a' },
    { open: '!#G#', close: '#',    className: 'aero-tag-chip tag-chip-g' },
    { open: '!#O#', close: '#',    className: 'aero-tag-chip tag-chip-o' },
    { open: '#C#',  close: '#',    className: 'gel-bubble-chip gel-chip-cyan' },
    { open: '#O#',  close: '#',    className: 'gel-bubble-chip gel-chip-orange' },
    { open: '#G#',  close: '#',    className: 'gel-bubble-chip gel-chip-green' },
    { open: '~MP~', close: '~MP~', className: 'effect-mercury-pearl' },
    { open: '~CB~', close: '~CB~', className: 'effect-screen-cavity' },
    { open: '~DS~', close: '~DS~', className: 'effect-drop-shadow-window' },
    { open: '~GL~', close: '~GL~', className: 'effect-glow-tube' },
    { open: '~PM~', close: '~PM~', className: 'effect-plasma-gel' },
    { open: '`',    close: '`',    tagName: 'code' },
    { open: '**',   close: '**',   tagName: 'strong' },
    { open: '*',    close: '*',    tagName: 'em' }
];

document.addEventListener("DOMContentLoaded", () => {
    initGrid();
    
    // Attach audio clicks to all standard sidebar pad buttons
    document.querySelectorAll('.pad-toggle-btn, .sidebar-action-btn').forEach(btn => {
        btn.addEventListener('click', () => playAeroClickSound(550, 0.1));
    });
});

function getColumnName(colIndex) {
    let name = "";
    while (colIndex >= 0) {
        name = String.fromCharCode((colIndex % 26) + 65) + name;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return name;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyKeydownFormatting(text) {
    if (!text) return "";
    let html = text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    keydownDefinitions.forEach(def => {
        const regex = new RegExp(escapeRegExp(def.open) + '(.*?)' + escapeRegExp(def.close), 'g');
        if (def.className) {
            html = html.replace(regex, `<span class="${def.className}">$1</span>`);
        } else if (def.tagName) {
            html = html.replace(regex, `<${def.tagName}>$1</${def.tagName}>`);
        }
    });
    return html;
}

function toggleColorPopup(event) {
    event.stopPropagation();
    playAeroClickSound(750, 0.12);
    const popup = document.getElementById("aero-color-popup");
    if (popup) popup.classList.toggle("show");
}

document.addEventListener("click", (e) => {
    const popup = document.getElementById("aero-color-popup");
    const btn = document.getElementById("color-picker-btn");
    if (popup && popup.classList.contains("show") && !popup.contains(e.target) && e.target !== btn) {
        playAeroClickSound(450, 0.08);
        popup.classList.remove("show");
    }
});

function applyCellStyles(bg, border) {
    playAeroClickSound(650, 0.08);
    if (!activeCellId) return;

    if (!cellStyles[activeCellId]) {
        cellStyles[activeCellId] = {};
    }

    if (bg !== null) cellStyles[activeCellId].bg = bg;
    if (border !== null) cellStyles[activeCellId].border = border;

    const cell = document.getElementById(activeCellId);
    if (cell) {
        if (cellStyles[activeCellId].bg) {
            cell.style.backgroundColor = cellStyles[activeCellId].bg;
        }
        if (cellStyles[activeCellId].border) {
            cell.style.borderColor = cellStyles[activeCellId].border;
            cell.style.borderWidth = "2px";
        }
    }
}

function initGrid() {
    const headerRow = document.getElementById("table-header-row");
    headerRow.innerHTML = '<th class="corner-header"></th>';
    for (let c = 0; c < numCols; c++) {
        let th = document.createElement("th");
        th.innerText = getColumnName(c);
        headerRow.appendChild(th);
    }

    const tBody = document.getElementById("table-body");
    tBody.innerHTML = "";
    for (let r = 1; r <= numRows; r++) {
        let tr = document.createElement("tr");
        let rowHeader = document.createElement("td");
        rowHeader.className = "row-header";
        rowHeader.innerText = r;
        tr.appendChild(rowHeader);

        for (let c = 0; c < numCols; c++) {
            let td = document.createElement("td");
            let cellId = `${getColumnName(c)}${r}`;
            td.className = "sheet-cell";
            td.contentEditable = "true";
            td.id = cellId;
            
            td.addEventListener("focus", () => {
                playAeroClickSound(500, 0.04);
                activeCellId = cellId;
                document.getElementById("selected-cell-label").innerText = cellId;
                const formulaInput = document.getElementById("formula-input");
                formulaInput.value = cellData[cellId] || "";
                td.innerText = cellData[cellId] || "";
            });
            
            td.addEventListener("blur", () => {
                evaluateFormulas(); 
            });

            td.addEventListener("input", (e) => handleCellInput(cellId, e.target.innerText));
            
            if (cellStyles[cellId]) {
                if (cellStyles[cellId].bg) td.style.backgroundColor = cellStyles[cellId].bg;
                if (cellStyles[cellId].border) {
                    td.style.borderColor = cellStyles[cellId].border;
                    td.style.borderWidth = "2px";
                }
            }

            tr.appendChild(td);
        }
        tBody.appendChild(tr);
    }
    evaluateFormulas();
}

function handleCellInput(cellId, value) {
    cellData[cellId] = value;
    if (activeCellId === cellId) {
        document.getElementById("formula-input").value = value;
    }
    if (isChartOpen) {
        renderChartForColumn(currentChartColIndex);
    }
}

function updateCellFromFormula(value) {
    if (!activeCellId) return;
    cellData[activeCellId] = value;
    const cell = document.getElementById(activeCellId);
    if (cell) cell.innerText = value;
    if (isChartOpen) {
        renderChartForColumn(currentChartColIndex);
    }
}

function evaluateFormulas() {
    for (let r = 1; r <= numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            let cellId = `${getColumnName(c)}${r}`;
            let val = cellData[cellId] || "";
            let cell = document.getElementById(cellId);
            
            if (cellId === activeCellId) continue;

            if (val.startsWith("=")) {
                let result = computeFormula(val);
                if (cell) cell.innerHTML = applyKeydownFormatting(result);
            } else {
                if (cell) cell.innerHTML = applyKeydownFormatting(val);
            }
        }
    }
}

function computeFormula(formula) {
    try {
        let cleanFormula = formula.substring(1).toUpperCase();
        if (cleanFormula.startsWith("SUM(") || cleanFormula.startsWith("AVG(")) {
            let isAvg = cleanFormula.startsWith("AVG(");
            let range = cleanFormula.substring(4, cleanFormula.indexOf(")"));
            let parts = range.split(":");
            if (parts.length === 2) {
                let values = getRangeValues(parts[0].trim(), parts[1].trim());
                let sum = values.reduce((a, b) => a + b, 0);
                if (isAvg) return values.length > 0 ? sum / values.length : 0;
                return sum;
            }
        }
        return "ERROR";
    } catch (e) {
        return "ERROR";
    }
}

function getRangeValues(startCell, endCell) {
    let colStart = startCell.charCodeAt(0) - 65;
    let rowStart = parseInt(startCell.substring(1));
    let colEnd = endCell.charCodeAt(0) - 65;
    let rowEnd = parseInt(endCell.substring(1));

    let values = [];
    for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
            let cid = `${getColumnName(c)}${r}`;
            let raw = cellData[cid] || "0";
            let num = parseFloat(raw);
            if (!isNaN(num)) values.push(num);
        }
    }
    return values;
}

// Cycle chart columns via < and > buttons
function cycleChartColumn(direction) {
    playAeroClickSound(600, 0.06);
    currentChartColIndex += direction;
    if (currentChartColIndex < 0) {
        currentChartColIndex = numCols - 1;
    } else if (currentChartColIndex >= numCols) {
        currentChartColIndex = 0;
    }
    renderChartForColumn(currentChartColIndex);
}

function generateAeroChart() {
    playAeroClickSound(750, 0.12);
    if (activeCellId) {
        let colLetter = activeCellId.replace(/[0-9]/g, '');
        let colIdx = colLetter.charCodeAt(0) - 65;
        if (colIdx >= 0 && colIdx < numCols) {
            currentChartColIndex = colIdx;
        }
    }
    isChartOpen = true;
    document.getElementById("chart-viewport").style.display = "block";
    renderChartForColumn(currentChartColIndex);
}

function renderChartForColumn(colIdx) {
    const colLetter = getColumnName(colIdx);
    const values = [];
    let maxVal = 0;

    for (let r = 1; r <= numRows; r++) {
        let cid = `${colLetter}${r}`;
        let rawVal = cellData[cid] || "";
        
        if (rawVal.startsWith("=")) {
            rawVal = computeFormula(rawVal);
        }
        
        let num = parseFloat(rawVal);
        if (!isNaN(num)) {
            values.push({ label: cid, val: num });
            if (Math.abs(num) > maxVal) maxVal = Math.abs(num);
        }
    }

    const container = document.getElementById("chart-bar-container");
    if (!container) return;
    container.innerHTML = "";

    document.getElementById("chart-title-text").innerText = `📊 COLUMN ${colLetter} DATA VISUALIZER`;

    if (values.length === 0) {
        container.innerHTML = `<div style="margin:auto; font-family:'JetBrains Mono'; font-size:12px; color:#94a3b8;">No numeric data in Column ${colLetter}</div>`;
        return;
    }

    values.forEach(item => {
        const percentage = maxVal > 0 ? (Math.abs(item.val) / maxVal) * 100 : 0;
        
        const colDiv = document.createElement("div");
        colDiv.className = "chart-bar-column";
        
        const valBadge = document.createElement("span");
        valBadge.className = "chart-value-badge";
        valBadge.innerText = item.val;

        const barFill = document.createElement("div");
        barFill.className = "chart-bar-fill";
        barFill.style.height = percentage + "%";
        barFill.title = `${item.label}: ${item.val}`;

        const labelSpan = document.createElement("span");
        labelSpan.className = "chart-bar-label";
        labelSpan.innerText = item.label;

        colDiv.appendChild(valBadge);
        colDiv.appendChild(barFill);
        colDiv.appendChild(labelSpan);
        container.appendChild(colDiv);
    });
}

function closeChart() {
    playAeroClickSound(450, 0.08);
    isChartOpen = false;
    const chartViewport = document.getElementById("chart-viewport");
    if (chartViewport) chartViewport.style.display = "none";
}

function addNewRow() {
    playAeroClickSound(650, 0.08);
    numRows++;
    initGrid();
}

function addNewColumn() {
    playAeroClickSound(650, 0.08);
    numCols++;
    initGrid();
}

function toggleSidebar() {
    playAeroClickSound(450, 0.12);
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.toggle("collapsed");
    }
}

function toggleModal(show) {
    playAeroClickSound(show ? 750 : 450, 0.1);
    const modal = document.getElementById("aero-modal-overlay");
    if (show) modal.classList.add("active");
    else modal.classList.remove("active");
}

function exportSheetsFile() {
    playAeroClickSound(750, 0.12);
    const payload = {
        data: cellData,
        styles: cellStyles
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "spreadsheet.ks");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importSheetsFile(event) {
    playAeroClickSound(850, 0.15);
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.data) {
                cellData = parsed.data || {};
                cellStyles = parsed.styles || {};
            } else {
                cellData = parsed;
                cellStyles = {};
            }
            initGrid();
        } catch (err) {
            alert("Invalid .ks file format.");
        }
    };
    reader.readAsText(file);
}