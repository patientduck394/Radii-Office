// app.ts — TypeScript source of Mainkey (incremental typing pilot)!
// Compiles to app.js (committed, browsers run the output as-is)!
// Recompile with: npx -y -p typescript tsc --project tsconfig.dom.json

interface Field {
    id: string;
    name: string;
    type: string;
}

interface Rec {
    id: number;
    [key: string]: unknown;
}

declare const module: any;
declare const jsyaml: any;
declare const PySilent: any;

let fields: Field[] = [
    { id: 'title', name: 'Title', type: 'text' },
    { id: 'status', name: 'Status', type: 'tag' },
    { id: 'value', name: 'Value', type: 'number' }
];

let records: Rec[] = [
    { id: 1, title: 'Project Alpha', status: 'In Progress', value: 1200 },
    { id: 2, title: 'Radii Game Asset', status: 'Completed', value: 450 }
];

let editingRecordId: number | null = null;
let currentView = 'table';
let sortField: string | null = null;
let sortDir = 1;

const STORAGE_KEY = 'mainkey-base-v1';

function escapeHtml(s: unknown): string {
    return String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function persist(): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ fields, records }));
    } catch (e) {}
}

function restore(): void {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const doc = JSON.parse(raw);
        if (doc && Array.isArray(doc.fields) && Array.isArray(doc.records)) {
            if (doc.fields.length > 0) fields = doc.fields;
            records = doc.records;
        }
    } catch (e) {}
}

function setViewMode(mode: string): void {
    currentView = mode;
    (document.getElementById('table-view') as HTMLElement).style.display = mode === 'table' ? 'block' : 'none';
    (document.getElementById('cards-view') as HTMLElement).style.display = mode === 'cards' ? 'block' : 'none';
    render();
}

function getFilteredSorted(): Rec[] {
    const query = (document.getElementById('search-input') as HTMLInputElement).value.toLowerCase();
    let filtered = records.filter(r =>
        Object.values(r).some(val => String(val).toLowerCase().includes(query))
    );
    if (sortField) {
        const sortKey: string = sortField;
        const numeric = fields.find(f => f.id === sortKey)?.type === 'number';
        filtered = [...filtered].sort((a, b) => {
            let av: unknown = a[sortKey], bv: unknown = b[sortKey];
            if (av === undefined) return 1;
            if (bv === undefined) return -1;
            if (numeric) return (Number(av) - Number(bv)) * sortDir;
            return String(av).localeCompare(String(bv)) * sortDir;
        });
    }
    return filtered;
}

function sortBy(fieldId: string): void {
    if (sortField === fieldId) {
        sortDir = sortDir === 1 ? -1 : 1;
    } else {
        sortField = fieldId;
        sortDir = 1;
    }
    render();
}

function render(): void {
    const filtered = getFilteredSorted();

    (document.getElementById('record-count') as HTMLElement).innerText = `${filtered.length} Records`;

    if (currentView === 'table') {
        renderTable(filtered);
    } else {
        renderCards(filtered);
    }
    renderStatsBar(filtered);
    renderExistingFields();
}

function renderStatsBar(data: Rec[]): void {
    const bar = document.getElementById('stats-bar');
    if (!bar) return;
    const numericFields = fields.filter(f => f.type === 'number');
    if (data.length === 0) {
        bar.innerText = 'No records to summarize! Add one to get started!';
        return;
    }
    const parts = [`${data.length} shown`];
    numericFields.forEach(f => {
        const vals = data.map(r => Number(r[f.id])).filter(v => !isNaN(v));
        if (vals.length === 0) return;
        const sum = vals.reduce((a, b) => a + b, 0);
        const avg = sum / vals.length;
        parts.push(`${f.name}: sum ${sum} / avg ${Math.round(avg * 100) / 100}`);
    });
    const statuses: Record<string, number> = {};
    data.forEach(r => {
        const s = String(r.status || 'General');
        statuses[s] = (statuses[s] || 0) + 1;
    });
    const topStatus = Object.entries(statuses).sort((a, b) => b[1] - a[1])[0];
    if (topStatus) parts.push(`top status: ${topStatus[0]} (${topStatus[1]})`);
    bar.innerText = parts.join('  •  ');
    renderStatsMedians(bar, data, numericFields);
}

// Per-field medians, silently Python-backed (JS fallback, no branding)!
// Field names only ever enter via textContent, so custom names stay safe!
function renderStatsMedians(bar: HTMLElement, data: Rec[], numericFields: Field[]): void {
    if (typeof PySilent === "undefined") return;
    const jobs = numericFields.map(f => ({
        name: f.name,
        vals: data.map(r => Number(r[f.id])).filter(v => !isNaN(v))
    })).filter(j => j.vals.length > 0);
    if (jobs.length === 0) return;
    const meds: Record<string, number> = {};
    jobs.forEach(j => {
        meds[j.name] = Math.round(PySilent.fallback(j.vals).median * 100) / 100;
    });
    const paint = (engine: string): void => {
        const el = document.getElementById("stats-py-meds");
        if (!el) return;
        el.textContent = "medians: " + jobs.map(j => `${j.name} ${meds[j.name]}`).join(" / ");
        try { (el as HTMLElement).dataset.engine = engine; } catch (e) {}
    };
    bar.innerHTML += '  •  <span id="stats-py-meds"></span>';
    paint("js-fallback");
    jobs.forEach(j => {
        PySilent.run(j.vals, (r: any) => {
            const src = r || PySilent.fallback(j.vals);
            meds[j.name] = Math.round(src.median * 100) / 100;
            paint(r ? "pyodide" : "js-fallback");
        });
    });
}

function renderTable(data: Rec[]): void {
    const headerRow = document.getElementById('table-header-row') as HTMLElement;
    const tbody = document.getElementById('table-body') as HTMLElement;

    headerRow.innerHTML = fields.map(f => {
        const arrow = sortField === f.id ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
        return `<th class="sortable-th" onclick="sortBy('${escapeHtml(f.id)}')" title="Click to sort!">${escapeHtml(f.name)}${arrow}</th>`;
    }).join('') + '<th>Actions</th>';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${fields.length + 1}" style="text-align:center; padding:20px; color:#64748b;">No matching records! Try a different search!</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(rec => `
        <tr>
            ${fields.map(f => `<td>${escapeHtml(rec[f.id] !== undefined ? rec[f.id] : '')}</td>`).join('')}
            <td class="row-actions">
                <button onclick="editRecord(${rec.id})" title="Edit!" style="cursor:pointer; background:none; border:none;">✏️</button>
                <button onclick="duplicateRecord(${rec.id})" title="Duplicate!" style="cursor:pointer; background:none; border:none;">📋</button>
                <button onclick="deleteRecord(${rec.id})" title="Delete!" style="cursor:pointer; background:none; border:none;">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderCards(data: Rec[]): void {
    const container = document.getElementById('cards-container') as HTMLElement;
    if (data.length === 0) {
        container.innerHTML = `<div style="padding:20px; color:#64748b;">No matching records! Try a different search!</div>`;
        return;
    }
    container.innerHTML = data.map(rec => `
        <div class="aero-card" onclick="editRecord(${rec.id})">
            <span class="status-badge">${escapeHtml(rec.status || 'General')}</span>
            <div style="font-size:14px; font-weight:bold;">${escapeHtml(rec.title || 'Untitled')}</div>
            ${fields.filter(f => f.id !== 'title' && f.id !== 'status').map(f => `
                <div style="font-size:11px; color:#64748b;">
                    <strong>${escapeHtml(f.name)}:</strong> ${escapeHtml(rec[f.id] !== undefined ? rec[f.id] : '')}
                </div>
            `).join('')}
            <div class="card-actions" onclick="event.stopPropagation()">
                <button onclick="duplicateRecord(${rec.id})" title="Duplicate!">📋 Duplicate</button>
                <button onclick="deleteRecord(${rec.id})" title="Delete!">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function openRecordModal(rec: Rec | null = null): void {
    editingRecordId = rec ? rec.id : null;
    (document.getElementById('modal-title-text') as HTMLElement).innerText = rec ? 'Edit Record' : 'Add Record';

    const form = document.getElementById('record-form-fields') as HTMLElement;
    form.innerHTML = fields.map(f => `
        <div class="control-group">
            <label>${escapeHtml(f.name)}</label>
            <input type="${f.type === 'number' ? 'number' : 'text'}" id="field-input-${escapeHtml(f.id)}" value="${escapeHtml(rec && rec[f.id] !== undefined ? rec[f.id] : '')}">
        </div>
    `).join('');

    (document.getElementById('record-modal') as HTMLElement).style.display = 'flex';
}

function closeRecordModal(): void {
    (document.getElementById('record-modal') as HTMLElement).style.display = 'none';
}

function saveRecord(): void {
    let rec: Rec = editingRecordId ? records.find(r => r.id === editingRecordId) as Rec : { id: Date.now() };
    fields.forEach(f => {
        const val = (document.getElementById(`field-input-${f.id}`) as HTMLInputElement).value;
        rec[f.id] = f.type === 'number' ? Number(val) : val;
    });

    if (!editingRecordId) records.push(rec);
    closeRecordModal();
    persist();
    render();
}

function editRecord(id: number): void {
    const rec = records.find(r => r.id === id);
    if (rec) openRecordModal(rec);
}

function duplicateRecord(id: number): void {
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    const copy: Rec = { ...rec, id: Date.now() };
    if (copy.title) copy.title = `${copy.title} (copy)`;
    records.push(copy);
    persist();
    render();
}

function deleteRecord(id: number): void {
    records = records.filter(r => r.id !== id);
    persist();
    render();
}

function openFieldModal(): void {
    renderExistingFields();
    (document.getElementById('field-modal') as HTMLElement).style.display = 'flex';
}
function closeFieldModal(): void { (document.getElementById('field-modal') as HTMLElement).style.display = 'none'; }

function renderExistingFields(): void {
    const box = document.getElementById('existing-fields');
    if (!box) return;
    box.innerHTML = fields.map(f => `
        <div class="field-row">
            <span>${escapeHtml(f.name)} <small>(${escapeHtml(f.type)})</small></span>
            <button onclick="deleteField('${escapeHtml(f.id)}')" title="Delete field!">🗑️</button>
        </div>
    `).join('');
}

function createField(): void {
    const name = (document.getElementById('new-field-name') as HTMLInputElement).value.trim();
    const type = (document.getElementById('new-field-type') as HTMLSelectElement).value;
    if (!name) return;

    let id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!id) return;
    let suffix = 2;
    const base = id;
    while (fields.some(f => f.id === id)) id = `${base}_${suffix++}`;
    fields.push({ id, name, type });
    (document.getElementById('new-field-name') as HTMLInputElement).value = '';
    persist();
    closeFieldModal();
    render();
}

function deleteField(id: string): void {
    if (fields.length <= 1) {
        alert('Keep at least one field!');
        return;
    }
    fields = fields.filter(f => f.id !== id);
    records.forEach(r => { delete r[id]; });
    if (sortField === id) sortField = null;
    persist();
    render();
}

function clearDatabase(): void {
    if (!confirm('Clear all records? Fields are kept!')) return;
    records = [];
    persist();
    render();
}

function resetDemo(): void {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
}

function csvCell(v: unknown): string {
    const s = String(v === undefined || v === null ? '' : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV(): void {
    const header = fields.map(f => csvCell(f.name)).join(',');
    const lines = records.map(rec => fields.map(f => csvCell(rec[f.id])).join(','));
    downloadFile(new Blob([[header, ...lines].join('\n')], { type: 'text/csv' }), 'database.csv');
}

function exportKB(): void {
    const kbStr = jsyaml.dump({ app: "Radii Base", version: "1.0", fields, records });
    downloadFile(new Blob([kbStr], { type: 'text/yaml' }), 'database.kb');
}

function importKB(evt: any): void {
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
        const doc = jsyaml.load(e.target.result);
        if (doc && doc.records && doc.fields) {
            fields = doc.fields;
            records = doc.records;
            sortField = null;
            persist();
            render();
        }
    };
    reader.readAsText(file);
}

function downloadFile(blob: Blob, filename: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

restore();
render();

// Export pure helpers for build-time testing in Node!
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml, csvCell, getFilteredSorted, sortBy, duplicateRecord, deleteField, createField };
}
if (typeof globalThis !== 'undefined') {
    Object.assign(globalThis, { setViewMode, render, renderTable, renderCards, openRecordModal, closeRecordModal, saveRecord, editRecord, duplicateRecord, deleteRecord, openFieldModal, closeFieldModal, createField, deleteField, clearDatabase, resetDemo, exportCSV, exportKB, importKB, sortBy });
}
