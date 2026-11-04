// Yuzu! An email app, all in your browser: an inbox, folders, search, starring, drafts and compose, with
// Keydown in every message (bold, gel orbs, highlights, links...) and a .YZ file you can back up or move with!
// No real mail server here: Yuzu starts with an empty mailbox, and everything you do is saved
// right in this browser (and exported/imported as a .YZ file whenever you like)!
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const uid = (p) => p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const STORAGE_KEY = 'yuzu_mail_v1';
    const ME = { name: 'You', email: 'you@yuzu.mail' };
    const FOLDERS = { inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts', trash: 'Trash' };

    /* ---------- state + storage ---------- */
    const state = { folder: 'inbox', emails: [], activeId: null, query: '', compose: null, view: 'list' };
    // Yuzu used to start with ten demo messages: a one-time cleanup removes exactly those (matched by sender and subject), never anything you wrote
    const DEMO = ['Marina Costa <marina@dolphins.swim>|Pool party this Saturday!', 'Kai Lindqvist <kai@sharks.swim>|Lane 4 is booked for tomorrow', 'Radii Office <team@radii-office.com>|Welcome to Yuzu!',
        'Ana Ruiz <ana@otters.swim>|Re: Saturday swim meet results', 'Pool Maintenance <noreply@pool.local>|Diving pool closed for repairs', 'Tomás Reyes <tomas@dolphins.swim>|Relay team for next month?',
        'Zoe Park <zoe@seals.swim>|Thanks for the lesson tips!', 'you@yuzu.mail|Re: Lane 4 is booked for tomorrow', 'you@yuzu.mail|Great meet today!', 'you@yuzu.mail|Question about the winter schedule'];
    const isDemo = (m) => DEMO.includes(m.from + '|' + m.subject);
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data.emails)) {
                    state.emails = data.demoRemoved ? data.emails : data.emails.filter((m) => !isDemo(m));
                    if (!data.demoRemoved) save();
                    return;
                }
            }
        } catch (e) { /* ignore and start empty */ }
        state.emails = [];
    }
    let saveTimer = 0;
    function save() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ emails: state.emails, demoRemoved: true })); } catch (e) { toast('This browser\'s storage is full, so the newest changes could not be saved!'); } }, 150);
    }

    /* ---------- little helpers the ribbon (office.js) also needs ---------- */
    const renderHooks = [];
    function render() { renderHooks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }
    function toast(msg) { try { if (window.OfficeShell) { window.OfficeShell.toast(msg); return; } } catch (e) {} const t = $('yz-toast'); if (!t) { alert(msg); return; } t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2400); }
    const emails = () => state.emails;
    const byId = (id) => state.emails.find((m) => m.id === id);
    const inFolder = (f) => state.emails.filter((m) => m.folder === f);
    const unreadCount = (f) => inFolder(f).filter((m) => !m.read).length;
    const dateStr = (iso) => {
        const d = new Date(iso), now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        return sameDay ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    const nameOf = (addr) => String(addr || '').replace(/\s*<[^>]*>\s*$/, '').trim() || addr;
    const initials = (addr) => { const n = nameOf(addr); const parts = n.split(/\s+/).filter(Boolean); return (parts[0] ? parts[0][0] : '?').toUpperCase() + (parts[1] ? parts[1][0].toUpperCase() : ''); };
    const plain = (kd) => { const d = document.createElement('div'); d.innerHTML = typeof window.kdRender === 'function' ? window.kdRender(kd) : esc(kd); return (d.textContent || '').trim(); };
    const kdHtml = (kd) => (typeof window.kdRender === 'function' ? window.kdRender(kd) : '<p>' + esc(kd).replace(/\n/g, '<br>') + '</p>');

    function setFolder(f) { state.folder = f; state.activeId = null; state.query = ''; render(); }
    function setQuery(q) { state.query = q; render(); }
    function visibleEmails() {
        let list = state.folder === 'starred' ? state.emails.filter((m) => m.starred && m.folder !== 'trash') : inFolder(state.folder);
        const q = state.query.trim().toLowerCase();
        if (q) list = state.emails.filter((m) => m.folder !== 'trash').filter((m) => (m.subject + ' ' + m.from + ' ' + m.to + ' ' + plain(m.body)).toLowerCase().includes(q));
        return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    function openEmail(id) {
        state.activeId = id;
        const m = byId(id);
        if (m && !m.read) { m.read = true; save(); }
        render();
    }
    function toggleStar(id) { const m = byId(id); if (!m) return; m.starred = !m.starred; save(); render(); }
    function deleteEmail(id) {
        const m = byId(id);
        if (!m) return;
        if (m.folder === 'trash') { state.emails = state.emails.filter((x) => x.id !== id); toast('Deleted for good!'); }
        else { m.folder = 'trash'; toast('Moved to Trash!'); }
        if (state.activeId === id) state.activeId = null;
        save(); render();
    }
    function restoreEmail(id) { const m = byId(id); if (!m) return; m.folder = m.to === ME.email || m.to === '' ? 'inbox' : 'sent'; save(); render(); toast('Restored!'); }
    function emptyTrash() { state.emails = state.emails.filter((m) => m.folder !== 'trash'); if (byId(state.activeId) === undefined) state.activeId = null; save(); render(); toast('Trash emptied!'); }

    /* ---------- compose ---------- */
    function openCompose(opts) {
        opts = opts || {};
        state.compose = { id: opts.draftId || null, to: opts.to || '', subject: opts.subject || '', body: opts.body || '' };
        state.view = 'compose';
        render();
        setTimeout(() => { const el = $('yz-compose-to') || $('yz-compose-body'); if (el) el.focus(); }, 30);
    }
    function closeCompose() { state.compose = null; state.view = 'list'; render(); }
    function readComposeForm() {
        const c = state.compose;
        if (!c) return;
        c.to = $('yz-compose-to') ? $('yz-compose-to').value : c.to;
        c.subject = $('yz-compose-subject') ? $('yz-compose-subject').value : c.subject;
        c.body = $('yz-compose-body') ? $('yz-compose-body').value : c.body;
    }
    function saveDraft(silent) {
        readComposeForm();
        const c = state.compose;
        if (!c) return;
        let m = c.id ? byId(c.id) : null;
        if (!m) { m = { id: uid('m'), folder: 'drafts', read: true, starred: false }; state.emails.unshift(m); c.id = m.id; }
        m.from = ME.email; m.to = c.to; m.subject = c.subject; m.body = c.body; m.date = new Date().toISOString(); m.folder = 'drafts';
        save();
        if (!silent) { toast('Draft saved!'); render(); }
    }
    function send() {
        readComposeForm();
        const c = state.compose;
        if (!c) return;
        if (!c.to.trim()) { toast('Add someone to send it to first!'); return; }
        let m = c.id ? byId(c.id) : null;
        if (!m) { m = { id: uid('m'), read: true, starred: false }; state.emails.unshift(m); }
        m.from = ME.email; m.to = c.to.trim(); m.subject = c.subject.trim() || '(No subject)'; m.body = c.body; m.date = new Date().toISOString(); m.folder = 'sent';
        save();
        closeCompose();
        toast('Sent!');
    }
    function reply(id) {
        const m = byId(id);
        if (!m) return;
        const who = m.folder === 'sent' ? m.to : m.from;
        const quoted = m.body.split('\n').map((l) => '> ' + l).join('\n');
        openCompose({ to: who, subject: /^Re:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject, body: '\n\n' + nameOf(who) + ' wrote:\n' + quoted });
    }
    function forward(id) {
        const m = byId(id);
        if (!m) return;
        const quoted = m.body.split('\n').map((l) => '> ' + l).join('\n');
        openCompose({ to: '', subject: /^Fwd:/i.test(m.subject) ? m.subject : 'Fwd: ' + m.subject, body: '\n\n---- Forwarded message ----\nFrom: ' + m.from + '\nSubject: ' + m.subject + '\n\n' + quoted });
    }
    function editDraft(id) { const m = byId(id); if (m) openCompose({ draftId: m.id, to: m.to, subject: m.subject, body: m.body }); }

    /* ---------- export / import ---------- */
    function download(name, text, type) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' }));
        a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    function exportYZ() { download('yuzu-mailbox.yz', JSON.stringify({ format: 'yuzu', version: 1, emails: state.emails }, null, 2), 'application/json'); toast('Saved yuzu-mailbox.yz!'); }
    function importYZ(ev) {
        const f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        f.text().then((t) => {
            let data;
            try { data = JSON.parse(t); } catch (e) { toast('That .yz file could not be read!'); return; }
            if (!data || !Array.isArray(data.emails)) { toast('That does not look like a Yuzu mailbox!'); return; }
            state.emails = state.emails.concat(data.emails.map((m) => Object.assign({}, m, { id: uid('m') })));
            save(); render();
            toast('Imported ' + data.emails.length + ' message' + (data.emails.length === 1 ? '' : 's') + '!');
        });
    }
    function exportEML(id) {
        const m = byId(id);
        if (!m) return;
        const eml = ['From: ' + m.from, 'To: ' + m.to, 'Subject: ' + m.subject, 'Date: ' + new Date(m.date).toUTCString(), 'Content-Type: text/plain; charset=utf-8', '', plain(m.body)].join('\r\n');
        download((m.subject || 'message').replace(/[^\w -]+/g, '').slice(0, 60).trim() + '.eml', eml, 'message/rfc822');
        toast('Saved as .eml!');
    }

    /* ---------- the classic list + reading pane (shared by both looks: the ribbon layout just re-skins it with CSS) ---------- */
    function folderIcon(f) {
        return { inbox: '📥', starred: '⭐', sent: '📤', drafts: '📝', trash: '🗑️' }[f] || '📁';
    }
    function renderSidebar() {
        const el = $('yz-folders');
        if (!el) return;
        el.innerHTML = Object.keys(FOLDERS).map((f) => {
            const n = f === 'starred' ? state.emails.filter((m) => m.starred && m.folder !== 'trash').length : (f === 'inbox' || f === 'drafts') ? unreadCount(f) : 0;
            return '<button type="button" class="yz-folder' + (state.folder === f && !state.query ? ' on' : '') + '" data-folder="' + f + '">' +
                '<span class="yz-folder-icon" aria-hidden="true">' + folderIcon(f) + '</span><span class="yz-folder-name">' + FOLDERS[f] + '</span>' +
                (n ? '<span class="yz-folder-count">' + n + '</span>' : '') + '</button>';
        }).join('');
    }
    function renderList() {
        const el = $('yz-list');
        if (!el) return;
        const list = visibleEmails();
        $('yz-list-title').textContent = state.query ? 'Search results' : FOLDERS[state.folder];
        $('yz-list-count').textContent = list.length + (list.length === 1 ? ' message' : ' messages');
        if (!list.length) { el.innerHTML = '<div class="yz-empty">Nothing here!' + (state.folder === 'trash' ? '' : ' <button type="button" class="yz-link" id="yz-empty-compose">Write something?</button>') + '</div>'; const b = $('yz-empty-compose'); if (b) b.onclick = () => openCompose(); return; }
        el.innerHTML = list.map((m) => {
            const who = m.folder === 'sent' ? m.to : m.from;
            return '<button type="button" class="yz-row' + (!m.read ? ' unread' : '') + (m.id === state.activeId ? ' on' : '') + '" data-id="' + m.id + '">' +
                '<span class="yz-avatar" style="background:' + avatarColor(who) + '">' + esc(initials(who)) + '</span>' +
                '<span class="yz-row-mid"><span class="yz-row-top"><span class="yz-row-from">' + esc(nameOf(who) || '(no recipient)') + '</span><span class="yz-row-date">' + dateStr(m.date) + '</span></span>' +
                '<span class="yz-row-subject">' + esc(m.subject || '(No subject)') + '</span><span class="yz-row-snip">' + esc(plain(m.body).slice(0, 90)) + '</span></span>' +
                '<button type="button" class="yz-star' + (m.starred ? ' on' : '') + '" data-star="' + m.id + '" aria-label="' + (m.starred ? 'Remove star' : 'Star this message') + '" aria-pressed="' + m.starred + '">★</button>' +
                '</button>';
        }).join('');
    }
    const PALETTE = ['#0065ff', '#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];
    function avatarColor(addr) { let h = 0; const s = String(addr || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
    function renderReading() {
        const el = $('yz-reading');
        if (!el) return;
        if (state.view === 'compose') { renderComposeInto(el); return; }
        const m = byId(state.activeId);
        if (!m) { el.innerHTML = '<div class="yz-placeholder"><span class="yz-placeholder-icon" aria-hidden="true">✉️</span><p>Pick a message to read it, or write a new one!</p></div>'; return; }
        const who = m.folder === 'sent' ? m.to : m.from;
        el.innerHTML =
            '<div class="yz-read-top">' +
                '<h2 class="yz-read-subject">' + esc(m.subject || '(No subject)') + '</h2>' +
                '<div class="yz-read-actions">' +
                    (m.folder === 'trash' ? '<button type="button" class="yz-btn" data-act="restore">Restore</button>' : '<button type="button" class="yz-btn" data-act="reply">↩ Reply</button><button type="button" class="yz-btn" data-act="forward">➦ Forward</button>') +
                    '<button type="button" class="yz-btn" data-act="star">' + (m.starred ? '★ Starred' : '☆ Star') + '</button>' +
                    '<button type="button" class="yz-btn" data-act="eml">⬇ .eml</button>' +
                    '<button type="button" class="yz-btn yz-danger" data-act="delete">' + (m.folder === 'trash' ? '🗑 Delete forever' : '🗑 Delete') + '</button>' +
                '</div></div>' +
            '<div class="yz-read-meta"><span class="yz-avatar" style="background:' + avatarColor(who) + '">' + esc(initials(who)) + '</span>' +
                '<div><b>' + esc(nameOf(who)) + '</b><span class="yz-read-addr">' + esc(who) + '</span></div>' +
                '<span class="yz-read-date">' + new Date(m.date).toLocaleString() + '</span></div>' +
            '<div class="yz-read-body keydown-doc">' + kdHtml(m.body) + '</div>';
        el.querySelector('[data-act="reply"]')?.addEventListener('click', () => reply(m.id));
        el.querySelector('[data-act="forward"]')?.addEventListener('click', () => forward(m.id));
        el.querySelector('[data-act="star"]').addEventListener('click', () => toggleStar(m.id));
        el.querySelector('[data-act="eml"]').addEventListener('click', () => exportEML(m.id));
        el.querySelector('[data-act="delete"]').addEventListener('click', () => deleteEmail(m.id));
        el.querySelector('[data-act="restore"]')?.addEventListener('click', () => restoreEmail(m.id));
    }
    function renderComposeInto(el) {
        const c = state.compose || { to: '', subject: '', body: '' };
        el.innerHTML =
            '<div class="yz-compose">' +
                '<div class="yz-compose-top"><h2>New message</h2><button type="button" class="yz-btn" id="yz-compose-close" aria-label="Close">✕</button></div>' +
                '<label class="yz-field"><span>To</span><input id="yz-compose-to" type="text" placeholder="Someone\'s name or address" value="' + esc(c.to) + '"></label>' +
                '<label class="yz-field"><span>Subject</span><input id="yz-compose-subject" type="text" placeholder="Subject" value="' + esc(c.subject) + '"></label>' +
                '<label class="yz-field yz-field-body"><span>Message <small>(Keydown works here: **bold**, =B=gel orbs=B=, #R(color ink)...)</small></span><textarea id="yz-compose-body" spellcheck="true" placeholder="Write your message!">' + esc(c.body) + '</textarea></label>' +
                '<div class="yz-compose-preview keydown-doc" id="yz-compose-preview">' + kdHtml(c.body) + '</div>' +
                '<div class="yz-compose-actions"><button type="button" class="yz-btn yz-primary" id="yz-compose-send">Send</button><button type="button" class="yz-btn" id="yz-compose-save">Save draft</button><button type="button" class="yz-btn" id="yz-compose-cancel">Cancel</button></div>' +
            '</div>';
        $('yz-compose-close').addEventListener('click', closeCompose);
        $('yz-compose-cancel').addEventListener('click', closeCompose);
        $('yz-compose-send').addEventListener('click', send);
        $('yz-compose-save').addEventListener('click', () => saveDraft(false));
        $('yz-compose-body').addEventListener('input', () => { $('yz-compose-preview').innerHTML = kdHtml($('yz-compose-body').value); });
    }

    function wire() {
        document.addEventListener('click', (e) => {
            const folderBtn = e.target.closest('[data-folder]');
            if (folderBtn) { setFolder(folderBtn.dataset.folder); return; }
            const star = e.target.closest('[data-star]');
            if (star) { e.stopPropagation(); toggleStar(star.dataset.star); return; }
            const row = e.target.closest('.yz-row');
            if (row) { state.view = 'list'; openEmail(row.dataset.id); return; }
        });
        const search = $('yz-search');
        if (search) search.addEventListener('input', () => setQuery(search.value));
        const composeBtn = $('yz-compose-btn');
        if (composeBtn) composeBtn.addEventListener('click', () => openCompose());
        const importInput = $('yz-import-input');
        if (importInput) importInput.addEventListener('change', importYZ);
        const exportBtn = $('yz-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportYZ);
        const importBtn = $('yz-import-btn');
        if (importBtn && importInput) importBtn.addEventListener('click', () => importInput.click());
    }

    function renderAll() { renderSidebar(); renderList(); renderReading(); }
    renderHooks.push(renderAll);

    document.addEventListener('DOMContentLoaded', () => { load(); wire(); render(); });

    window.Yuzu = {
        $, state, FOLDERS, ME, renderHooks, render,
        emails, byId, inFolder, unreadCount, visibleEmails,
        setFolder, setQuery, openEmail, toggleStar, deleteEmail, restoreEmail, emptyTrash,
        openCompose, closeCompose, saveDraft, send, reply, forward, editDraft,
        exportYZ, importYZ, exportEML, toast, plain, kdHtml, dateStr, nameOf,
    };
})();
