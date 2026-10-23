let tasks = [];
let editingTaskId = null;
let filterMode = 'all';
let searchQuery = '';

const TASKS_STORAGE_KEY = 'tasks-app-v1';
const PRIORITIES = ['low', 'med', 'high'];

function playTasksClickSound(frequency = 600, duration = 0.08) {
    try {
        const ctx = window.tasksAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.tasksAudioCtx) window.tasksAudioCtx = ctx;
        if (ctx.state === 'suspended') ctx.resume();
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

function pad2(n) {
    return String(n).padStart(2, '0');
}

function todayStr() {
    const t = new Date();
    return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}

function validDate(s) {
    if (s === '' || s === undefined) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function makeId() {
    return 'tk_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

function validTask(t) {
    return t && typeof t.title === 'string' && typeof t.id === 'string' &&
        PRIORITIES.includes(t.priority) && typeof t.done === 'boolean' &&
        validDate(t.due || '') && typeof (t.notes || '') === 'string';
}

function addTask(patch) {
    const title = String((patch && patch.title) || '').trim();
    const due = (patch && patch.due) || '';
    const priority = PRIORITIES.includes(patch && patch.priority) ? patch.priority : 'med';
    if (!title || !validDate(due)) return null;
    const rec = {
        id: makeId(), title: title.slice(0, 200), due,
        priority, notes: String((patch && patch.notes) || '').slice(0, 2000),
        done: false, createdAt: new Date().toISOString(),
    };
    tasks.push(rec);
    persist();
    render();
    return rec;
}

function updateTask(id, patch) {
    const rec = tasks.find(t => t.id === id);
    if (!rec) return false;
    if (patch.title !== undefined) {
        const title = String(patch.title).trim();
        if (!title) return false;
        rec.title = title.slice(0, 200);
    }
    if (patch.due !== undefined) {
        if (!validDate(patch.due)) return false;
        rec.due = patch.due;
    }
    if (patch.priority !== undefined) {
        if (!PRIORITIES.includes(patch.priority)) return false;
        rec.priority = patch.priority;
    }
    if (patch.notes !== undefined) rec.notes = String(patch.notes).slice(0, 2000);
    persist();
    render();
    return true;
}

function toggleTask(id) {
    const rec = tasks.find(t => t.id === id);
    if (!rec) return false;
    playTasksClickSound(rec.done ? 500 : 750, 0.08);
    rec.done = !rec.done;
    persist();
    render();
    return true;
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    persist();
    render();
}

function clearCompleted() {
    tasks = tasks.filter(t => !t.done);
    persist();
    render();
}

function isOverdue(t) {
    return !t.done && t.due !== '' && t.due < todayStr();
}

function visibleTasks() {
    const q = searchQuery.trim().toLowerCase();
    let list = tasks.filter(t =>
        t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)
    );
    if (filterMode === 'active') list = list.filter(t => !t.done);
    else if (filterMode === 'done') list = list.filter(t => t.done);
    else if (filterMode === 'overdue') list = list.filter(t => isOverdue(t));
    const priRank = { high: 0, med: 1, low: 2 };
    return [...list].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if ((a.due || '~~~~') !== (b.due || '~~~~')) return (a.due || '~~~~') < (b.due || '~~~~') ? -1 : 1;
        return priRank[a.priority] - priRank[b.priority];
    });
}

function counts() {
    return {
        total: tasks.length,
        done: tasks.filter(t => t.done).length,
        overdue: tasks.filter(t => isOverdue(t)).length,
    };
}

function persist() {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ tasks }));
    } catch (e) {}
}

function restore() {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(TASKS_STORAGE_KEY);
        if (!raw) return;
        const doc = JSON.parse(raw);
        if (doc && Array.isArray(doc.tasks)) tasks = doc.tasks.filter(validTask);
    } catch (e) {}
}

function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setFilter(mode) {
    playTasksClickSound(550, 0.06);
    filterMode = ['all', 'active', 'done', 'overdue'].includes(mode) ? mode : 'all';
    render();
}

function setSearch(q) {
    searchQuery = String(q || '');
    render();
}

function render() {
    const list = visibleTasks();
    const c = counts();
    document.getElementById('task-count').innerText =
        `${c.total} Tasks · ${c.done} done · ${c.overdue} overdue`;

    const frame = document.getElementById('tasks-list');
    if (list.length === 0) {
        frame.innerHTML = `<div class="empty-note">Nothing here! Press Add Task to get going!</div>`;
        return;
    }
    frame.innerHTML = list.map(t => `
        <div class="task-row pri-${t.priority}${t.done ? ' done' : ''}">
            <input type="checkbox" class="task-check" ${t.done ? 'checked' : ''} onchange="toggleTask('${t.id}')" title="Toggle done!">
            <div>
                <div class="task-title">${escapeHtml(t.title)}</div>
                <div class="task-meta">${t.priority} priority` +
                (t.due ? ` · due ${escapeHtml(t.due)}` : ' · no due date') +
                (isOverdue(t) ? ` · <span class="late">OVERDUE!</span>` : '') +
                (t.notes ? ` · ${escapeHtml(t.notes.slice(0, 60))}` : '') + `</div>
            </div>
            <div class="task-actions">
                <button onclick="editTask('${t.id}')" title="Edit!">✏️</button>
                <button onclick="askDeleteTask('${t.id}')" title="Delete!">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openTaskModal(task = null) {
    editingTaskId = task ? task.id : null;
    document.getElementById('task-modal-title-text').innerText = task ? 'Edit Task' : 'Add Task';
    document.getElementById('task-title').value = task ? task.title : '';
    document.getElementById('task-due').value = task ? (task.due || '') : '';
    document.getElementById('task-priority').value = task ? task.priority : 'med';
    document.getElementById('task-notes').value = task ? (task.notes || '') : '';
    document.getElementById('task-modal').style.display = 'flex';
}

function closeTaskModal() {
    document.getElementById('task-modal').style.display = 'none';
}

function saveTask() {
    const patch = {
        title: document.getElementById('task-title').value,
        due: document.getElementById('task-due').value,
        priority: document.getElementById('task-priority').value,
        notes: document.getElementById('task-notes').value,
    };
    if (!patch.title.trim() || !validDate(patch.due)) {
        alert('Give the task a title and a valid due date!');
        return;
    }
    playTasksClickSound(700, 0.08);
    if (editingTaskId) updateTask(editingTaskId, patch);
    else addTask(patch);
    closeTaskModal();
    render();
}

function editTask(id) {
    const rec = tasks.find(t => t.id === id);
    if (rec) openTaskModal(rec);
}

function askDeleteTask(id) {
    playTasksClickSound(400, 0.08);
    deleteTask(id);
}

function askClearCompleted() {
    playTasksClickSound(350, 0.12);
    if (!confirm('Delete all completed tasks?')) return;
    clearCompleted();
}

function buildTasksFile() {
    return {
        app: 'Taskra',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tasks,
    };
}

function applyTasksFile(doc) {
    if (!doc || typeof doc !== 'object') return false;
    if (doc.app && doc.app !== 'Taskra' && doc.app !== 'Tasks') return false;
    if (!Array.isArray(doc.tasks)) return false;
    tasks = doc.tasks.filter(validTask);
    persist();
    render();
    return true;
}

function downloadFile(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function exportTasks() {
    playTasksClickSound(750, 0.12);
    downloadFile(new Blob([JSON.stringify(buildTasksFile(), null, 2)], { type: 'application/json' }), 'tasks.tk');
}

function importTasks(evt) {
    playTasksClickSound(850, 0.15);
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const doc = JSON.parse(e.target.result);
            if (!applyTasksFile(doc)) throw new Error('bad-tasks');
            alert('Tasks file (.tk) loaded successfully!');
        } catch (err) {
            alert('Invalid .tk file format.');
        }
    };
    reader.readAsText(file);
}

(function boot() {
    restore();
    if (typeof document !== 'undefined' && document.getElementById && document.getElementById('tasks-list')) {
        render();
    }
})();

// Export pure helpers for build-time testing in Node!
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addTask, updateTask, toggleTask, deleteTask, clearCompleted,
        visibleTasks, counts, isOverdue, validDate, validTask,
        persist, restore, buildTasksFile, applyTasksFile,
        setFilter, setSearch, getTasks: () => tasks,
        setTasks: (list) => { tasks = list; },
    };
}
if (typeof globalThis !== 'undefined') {
    Object.assign(globalThis, {
        setFilter, setSearch, openTaskModal, closeTaskModal, saveTask,
        editTask, askDeleteTask, askClearCompleted, toggleTask,
        exportTasks, importTasks,
    });
}
