// Taskra! Plain JavaScript, no build step!
// All the tasks live in one state object as plain data, and turn into JSON only at the edges
// (localStorage, .tk files and live collaboration)!
(function () {
    'use strict';

    const STORAGE_KEY = 'tasks-app-v1';
    const PRIORITIES = ['low', 'med', 'high'];
    const PRI_RANK = { high: 0, med: 1, low: 2 };
    const FILTERS = ['all', 'active', 'done', 'overdue'];

    const state = { tasks: [], editing: null, filter: 'all', search: '' };

    // The ribbon and live collaboration hook in here instead of wrapping functions!
    const renderHooks = [];
    const persistHooks = [];

    const $ = (id) => document.getElementById(id);
    const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
    const str = (x) => (x === undefined || x === null ? '' : String(x));
    const blank = (s) => !str(s).trim();

    // ---------- Sounds ----------
    function clickSound(frequency = 600, duration = 0.08) {
        try {
            const C = window.AudioContext || window.webkitAudioContext;
            const ctx = window.tasksAudioCtx || (window.tasksAudioCtx = new C());
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const now = ctx.currentTime;
            if (ctx.state === 'suspended') ctx.resume();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(now + duration);
        } catch (e) { /* no sound, no problem */ }
    }

    // ---------- Helpers ----------
    const pad2 = (n) => String(n).padStart(2, '0');

    function todayStr() {
        const t = new Date();
        return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
    }

    const validDate = (s) => s === undefined || s === null || s === '' || /^\d{4}-\d{2}-\d{2}$/.test(String(s));

    const makeId = () => 'tk_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

    function validTask(t) {
        return isObj(t)
            && typeof t.title === 'string'
            && typeof t.id === 'string'
            && PRIORITIES.includes(t.priority)
            && typeof t.done === 'boolean'
            && validDate(t.due || '')
            && typeof (t.notes || '') === 'string';
    }

    const esc = (s) => str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const tasks = () => state.tasks;
    const findTask = (id) => tasks().find((t) => t.id === id) || null;
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

    const overdue = (t) => !t.done && (t.due || '') !== '' && cmp(t.due, todayStr()) < 0;

    function counts() {
        const ts = tasks();
        return { total: ts.length, done: ts.filter((t) => t.done).length, overdue: ts.filter(overdue).length };
    }

    function visibleTasks() {
        const q = state.search.trim().toLowerCase();
        const hit = (t) => t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q);
        const keep = { active: (t) => !t.done, done: (t) => t.done, overdue: overdue }[state.filter] || (() => true);
        const key = (t) => [t.done ? 1 : 0, blank(t.due) ? '~~~~' : t.due, PRI_RANK[t.priority]];
        return tasks().filter((t) => hit(t) && keep(t)).sort((a, b) => {
            const ka = key(a), kb = key(b);
            return cmp(ka[0], kb[0]) || cmp(ka[1], kb[1]) || cmp(ka[2], kb[2]);
        });
    }

    // ---------- Saving ----------
    function persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: tasks() })); } catch (e) { /* storage full or blocked */ }
        persistHooks.forEach((f) => f());
    }

    const parseTasks = (list) => list.filter(validTask);

    function restore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const doc = JSON.parse(raw);
            if (doc && Array.isArray(doc.tasks)) state.tasks = parseTasks(doc.tasks);
        } catch (e) { /* a broken save just means a fresh list */ }
    }

    // ---------- Drawing ----------
    function taskRow(t) {
        return '<div class="task-row pri-' + t.priority + (t.done ? ' done' : '') + '">'
            + '<input type="checkbox" class="task-check" ' + (t.done ? 'checked' : '') + ' onchange="toggleTask(\'' + t.id + '\')" title="Toggle done!">'
            + '<div><div class="task-title">' + esc(t.title) + '</div>'
            + '<div class="task-meta">' + t.priority + ' priority'
            + (blank(t.due) ? ' · no due date' : ' · due ' + esc(t.due))
            + (overdue(t) ? ' · <span class="late">OVERDUE!</span>' : '')
            + (!blank(t.notes) ? ' · ' + esc(t.notes.substring(0, 60)) : '')
            + '</div></div>'
            + '<div class="task-actions">'
            + '<button onclick="editTask(\'' + t.id + '\')" title="Edit!">✏️</button>'
            + '<button onclick="askDeleteTask(\'' + t.id + '\')" title="Delete!">🗑️</button>'
            + '</div></div>';
    }

    function render() {
        const c = counts();
        const list = visibleTasks();
        $('task-count').innerText = c.total + ' Tasks · ' + c.done + ' done · ' + c.overdue + ' overdue';
        $('tasks-list').innerHTML = list.length
            ? list.map(taskRow).join('')
            : '<div class="empty-note">Nothing here! Press Add Task to get going!</div>';
        renderHooks.forEach((f) => f());
    }

    function changed() { persist(); render(); }

    // ---------- Editing ----------
    function addTask(fields) {
        const title = str(fields.title).trim();
        const due = fields.due || '';
        if (title === '' || !validDate(due)) return null;
        const rec = {
            id: makeId(),
            title: title.substring(0, 200),
            due: due,
            priority: PRIORITIES.includes(fields.priority) ? fields.priority : 'med',
            notes: str(fields.notes).substring(0, 2000),
            done: false,
            createdAt: new Date().toISOString(),
        };
        state.tasks = tasks().concat([rec]);
        changed();
        return rec;
    }

    function updateTask(id, fields) {
        const rec = findTask(id);
        if (!rec) return null;
        const has = (v) => v !== undefined && v !== null;
        const title = has(fields.title) ? String(fields.title).trim() : null;
        const next = Object.assign({}, rec);
        if (title) next.title = title.substring(0, 200);
        if (has(fields.due)) next.due = fields.due;
        if (has(fields.priority)) next.priority = fields.priority;
        if (has(fields.notes)) next.notes = String(fields.notes).substring(0, 2000);
        if (title === '' || !validDate(next.due) || !PRIORITIES.includes(next.priority)) return null;
        state.tasks = tasks().map((t) => (t.id === id ? next : t));
        changed();
        return true;
    }

    function toggleTask(id) {
        const rec = findTask(id);
        if (!rec) return null;
        clickSound(rec.done ? 500 : 750, 0.08);
        state.tasks = tasks().map((t) => (t.id === id ? Object.assign({}, t, { done: !t.done }) : t));
        changed();
        return true;
    }

    function deleteTask(id) {
        state.tasks = tasks().filter((t) => t.id !== id);
        changed();
    }

    function clearCompleted() {
        state.tasks = tasks().filter((t) => !t.done);
        changed();
    }

    function setFilter(mode) {
        clickSound(550, 0.06);
        state.filter = FILTERS.includes(mode) ? mode : 'all';
        render();
    }

    function setSearch(q) {
        state.search = str(q);
        render();
    }

    // ---------- The task window ----------
    function openTaskModal(task) {
        task = isObj(task) && !(task instanceof Event) ? task : null;
        state.editing = task ? task.id : null;
        $('task-modal-title-text').innerText = task ? 'Edit Task' : 'Add Task';
        $('task-title').value = (task && task.title) || '';
        $('task-due').value = (task && task.due) || '';
        $('task-priority').value = (task && task.priority) || 'med';
        $('task-notes').value = (task && task.notes) || '';
        $('task-modal').style.display = 'flex';
    }

    function closeTaskModal() { $('task-modal').style.display = 'none'; }

    function saveTask() {
        const patch = {
            title: $('task-title').value,
            due: $('task-due').value,
            priority: $('task-priority').value,
            notes: $('task-notes').value,
        };
        if (blank(patch.title) || !validDate(patch.due)) {
            alert('Give the task a title and a valid due date!');
            return;
        }
        clickSound(700, 0.08);
        if (state.editing) updateTask(state.editing, patch); else addTask(patch);
        closeTaskModal();
        render();
    }

    function editTask(id) { const rec = findTask(id); if (rec) openTaskModal(rec); }

    function askDeleteTask(id) { clickSound(400, 0.08); deleteTask(id); }

    function askClearCompleted() {
        clickSound(350, 0.12);
        if (confirm('Delete all completed tasks?')) clearCompleted();
    }

    // ---------- .tk files ----------
    const tasksFile = () => ({ app: 'Taskra', version: '1.0', exportedAt: new Date().toISOString(), tasks: tasks() });

    function applyTasksFile(doc) {
        if (isObj(doc) && [undefined, null, 'Taskra', 'Tasks'].includes(doc.app) && Array.isArray(doc.tasks)) {
            state.tasks = parseTasks(doc.tasks);
            changed();
            return true;
        }
        return false;
    }

    function download(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    function exportTasks() {
        clickSound(750, 0.12);
        download(new Blob([JSON.stringify(tasksFile(), null, 2)], { type: 'application/json' }), 'tasks.tk');
    }

    function importTasks(evt) {
        clickSound(850, 0.15);
        const file = evt.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (applyTasksFile(JSON.parse(e.target.result))) alert('Tasks file (.tk) loaded successfully!');
                else alert('Invalid .tk file format.');
            } catch (err) { alert('Invalid .tk file format.'); }
        };
        reader.readAsText(file);
    }

    // The ribbon (office.js) and live collaboration (collab.js) build on this!
    window.Taskra = {
        state, renderHooks, persistHooks, STORAGE_KEY,
        $, tasks, findTask, counts, validTask, parseTasks, persist, render, changed,
        clearCompleted, setFilter, openTaskModal, editTask, exportTasks,
    };

    // ---------- The page's onclick handlers call these by name! ----------
    Object.assign(window, {
        setFilter, setSearch, openTaskModal, closeTaskModal, saveTask, editTask,
        askDeleteTask, askClearCompleted, toggleTask, exportTasks, importTasks,
    });

    restore();
    if ($('tasks-list')) render();
})();
