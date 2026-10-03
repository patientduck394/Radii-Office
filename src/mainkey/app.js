let fields = [
    { id: 'title', name: 'Title', type: 'text' },
    { id: 'status', name: 'Status', type: 'tag' },
    { id: 'value', name: 'Value', type: 'number' }
];

let records = [
    { id: 1, title: 'Project Alpha', status: 'In Progress', value: 1200 },
    { id: 2, title: 'Radii Game Asset', status: 'Completed', value: 450 }
];

let editingRecordId = null;
let currentView = 'table';

function setViewMode(mode) {
    currentView = mode;
    document.getElementById('table-view').style.display = mode === 'table' ? 'block' : 'none';
    document.getElementById('cards-view').style.display = mode === 'cards' ? 'block' : 'none';
    render();
}

function render() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = records.filter(r => 
        Object.values(r).some(val => String(val).toLowerCase().includes(query))
    );

    document.getElementById('record-count').innerText = `${filtered.length} Records`;

    if (currentView === 'table') {
        renderTable(filtered);
    } else {
        renderCards(filtered);
    }
}

function renderTable(data) {
    const headerRow = document.getElementById('table-header-row');
    const tbody = document.getElementById('table-body');
    
    headerRow.innerHTML = fields.map(f => `<th>${f.name}</th>`).join('') + '<th>Actions</th>';
    
    tbody.innerHTML = data.map(rec => `
        <tr>
            ${fields.map(f => `<td>${rec[f.id] !== undefined ? rec[f.id] : ''}</td>`).join('')}
            <td>
                <button onclick="editRecord(${rec.id})" style="cursor:pointer; background:none; border:none;">✏️</button>
                <button onclick="deleteRecord(${rec.id})" style="cursor:pointer; background:none; border:none;">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderCards(data) {
    const container = document.getElementById('cards-container');
    container.innerHTML = data.map(rec => `
        <div class="aero-card" onclick="editRecord(${rec.id})">
            <span class="status-badge">${rec.status || 'General'}</span>
            <div style="font-size:14px; font-weight:bold;">${rec.title || 'Untitled'}</div>
            ${fields.filter(f => f.id !== 'title' && f.id !== 'status').map(f => `
                <div style="font-size:11px; color:#64748b;">
                    <strong>${f.name}:</strong> ${rec[f.id] !== undefined ? rec[f.id] : ''}
                </div>
            `).join('')}
        </div>
    `).join('');
}

function openRecordModal(rec = null) {
    editingRecordId = rec ? rec.id : null;
    document.getElementById('modal-title-text').innerText = rec ? 'Edit Record' : 'Add Record';
    
    const form = document.getElementById('record-form-fields');
    form.innerHTML = fields.map(f => `
        <div class="control-group">
            <label>${f.name}</label>
            <input type="${f.type === 'number' ? 'number' : 'text'}" id="field-input-${f.id}" value="${rec && rec[f.id] !== undefined ? rec[f.id] : ''}">
        </div>
    `).join('');

    document.getElementById('record-modal').style.display = 'flex';
}

function closeRecordModal() {
    document.getElementById('record-modal').style.display = 'none';
}

function saveRecord() {
    let rec = editingRecordId ? records.find(r => r.id === editingRecordId) : { id: Date.now() };
    fields.forEach(f => {
        const val = document.getElementById(`field-input-${f.id}`).value;
        rec[f.id] = f.type === 'number' ? Number(val) : val;
    });

    if (!editingRecordId) records.push(rec);
    closeRecordModal();
    render();
}

function editRecord(id) {
    const rec = records.find(r => r.id === id);
    if (rec) openRecordModal(rec);
}

function deleteRecord(id) {
    records = records.filter(r => r.id !== id);
    render();
}

function openFieldModal() { document.getElementById('field-modal').style.display = 'flex'; }
function closeFieldModal() { document.getElementById('field-modal').style.display = 'none'; }

function createField() {
    const name = document.getElementById('new-field-name').value;
    const type = document.getElementById('new-field-type').value;
    if (!name) return;

    const id = name.toLowerCase().replace(/\s+/g, '_');
    fields.push({ id, name, type });
    closeFieldModal();
    render();
}

function clearDatabase() {
    records = [];
    render();
}

function exportKB() {
    const kbStr = jsyaml.dump({ app: "Radii Base", version: "1.0", fields, records });
    downloadFile(new Blob([kbStr], { type: 'text/yaml' }), 'database.kb');
}

function importKB(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const doc = jsyaml.load(e.target.result);
        if (doc && doc.records && doc.fields) {
            fields = doc.fields;
            records = doc.records;
            render();
        }
    };
    reader.readAsText(file);
}

function downloadFile(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

render();