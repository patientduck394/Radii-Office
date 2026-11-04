// Yuzu! Real email in your browser: sign in with Google or Microsoft, read your inbox, and send mail for real, with Keydown in
// every message you write (bold, gel orbs, highlights, links...) and a .YZ file for backing up your drafts and local messages!
// The mail itself lives at Gmail or Outlook: Yuzu loads it into this page and never keeps a copy of other people's messages on this device.
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const uid = (p) => p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const STORAGE_KEY = 'yuzu_mail_v1';
    const FOLDERS = { inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts', trash: 'Trash' };
    const PROVIDERS = { yuzu: 'Yuzu', google: 'Google', microsoft: 'Microsoft' };
    const DOMAIN = ((window.YUZU_CONFIG || {}).domain || 'radii-office.com');
    const LOGO = {
        yuzu: '<img src="favicon.svg" alt="" width="20" height="20">',
        google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
        microsoft: '<svg viewBox="0 0 23 23" aria-hidden="true"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>',
    };

    /* ---------- state + storage ---------- */
    // emails: what is on screen (in local mode it is the same list as local; signed in, it is the loaded mail plus local drafts)
    // local: messages kept on this device (drafts, and anything written before signing in), the only mail saved to storage
    const state = { folder: 'inbox', emails: [], local: [], activeId: null, query: '', compose: null, view: 'list', account: null, loading: false, error: '', sending: false };
    const remote = {}; // folder -> loaded messages (memory only)
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
                    state.local = data.demoRemoved ? data.emails : data.emails.filter((m) => !isDemo(m));
                    if (data.account && data.account.email && data.account.provider) state.account = data.account;
                    if (!data.demoRemoved) save();
                }
            }
        } catch (e) { /* ignore and start empty */ }
        rebuild();
    }
    let saveTimer = 0;
    function save() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ emails: state.local, demoRemoved: true, account: state.account })); }
            catch (e) { toast('This browser\'s storage is full, so the newest changes could not be saved!'); }
        }, 150);
    }
    const online = () => !!state.account && !!window.YuzuMail && YuzuMail.hasSession(state.account.provider);
    function rebuild() {
        if (!state.account) { state.emails = state.local; return; }
        const map = new Map();
        Object.keys(remote).forEach((f) => (remote[f] || []).forEach((m) => { if (!map.has(m.id)) map.set(m.id, m); }));
        state.emails = Array.from(map.values()).concat(state.local.filter((m) => m.folder === 'drafts'));
    }

    /* ---------- little helpers the ribbon (office.js) also needs ---------- */
    const renderHooks = [];
    function render() { renderHooks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }
    function toast(msg) { try { if (window.OfficeShell) { window.OfficeShell.toast(msg); return; } } catch (e) {} const t = $('yz-toast'); if (!t) { alert(msg); return; } t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600); }
    const emails = () => state.emails;
    const byId = (id) => state.emails.find((m) => m.id === id);
    const inFolder = (f) => state.emails.filter((m) => m.folder === f);
    const unreadCount = (f) => inFolder(f).filter((m) => !m.read).length;
    const myEmail = () => (state.account ? state.account.email : '');
    const dateStr = (iso) => {
        const d = new Date(iso), now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        return sameDay ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    const nameOf = (addr) => String(addr || '').replace(/\s*<[^>]*>\s*$/, '').replace(/^"|"$/g, '').trim() || addr;
    const initials = (addr) => { const n = nameOf(addr); const parts = n.split(/\s+/).filter(Boolean); return (parts[0] ? parts[0][0] : '?').toUpperCase() + (parts[1] ? parts[1][0].toUpperCase() : ''); };
    const plain = (kd) => { const d = document.createElement('div'); d.innerHTML = typeof window.kdRender === 'function' ? window.kdRender(kd) : esc(kd); return (d.textContent || '').trim(); };
    const kdHtml = (kd) => (typeof window.kdRender === 'function' ? window.kdRender(kd) : '<p>' + esc(kd).replace(/\n/g, '<br>') + '</p>');
    // mail from other people is shown as plain text (links clickable), never run through Keydown
    const plainHtml = (t) => esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)&])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    const bodyText = (m) => (m.remote ? m.body : plain(m.body));

    /* ---------- the mail account ---------- */
    function showError(e) {
        const msg = e && e.message ? e.message : String(e);
        if (e && YuzuMail && e instanceof YuzuMail.Expired) { state.error = msg; render(); }
        toast(msg);
    }
    async function connect(provider, creds) {
        if (!window.YuzuMail) return false;
        if (!YuzuMail.configured(provider)) { openSetup(provider); return false; }
        if (provider === 'yuzu' && !creds) { openYuzu(); return false; }
        try {
            const acct = await YuzuMail.connect(provider, creds);
            state.account = acct; state.error = '';
            Object.keys(remote).forEach((k) => delete remote[k]);
            save(); rebuild(); closeModal(); render();
            toast('Signed in as ' + acct.email + '!');
            sync(true);
            return true;
        } catch (e) { showError(e); return false; }
    }
    function disconnect() {
        if (window.YuzuMail) YuzuMail.disconnect();
        state.account = null; state.error = ''; state.activeId = null;
        Object.keys(remote).forEach((k) => delete remote[k]);
        save(); rebuild(); closeModal(); render();
        toast('Signed out! Nothing from your mailbox is kept on this device!');
    }
    async function loadFolder(f) {
        if (!online() || f === 'drafts') { rebuild(); render(); return; }
        state.loading = true; state.error = ''; render();
        try { remote[f] = await YuzuMail.list(state.account.provider, f); }
        catch (e) { state.error = e.message || String(e); }
        state.loading = false; rebuild(); render();
    }
    // load this folder (and, the first time, the Inbox too) from Gmail or Outlook
    async function sync(first) {
        if (!state.account) { toast('Sign in first!'); return; }
        if (!online()) { state.error = 'Sign in again to load your mail!'; render(); return; }
        await loadFolder(state.folder);
        if (first && state.folder !== 'inbox') loadFolder('inbox');
        if (!first && !state.error) toast('Up to date!');
    }

    /* ---------- reading and managing mail ---------- */
    function setFolder(f) { state.folder = f; state.activeId = null; state.query = ''; render(); if (state.account && f !== 'drafts') loadFolder(f); }
    function setQuery(q) { state.query = q; render(); }
    function visibleEmails() {
        let list = state.folder === 'starred' ? state.emails.filter((m) => m.starred && m.folder !== 'trash') : inFolder(state.folder);
        const q = state.query.trim().toLowerCase();
        if (q) list = state.emails.filter((m) => m.folder !== 'trash').filter((m) => (m.subject + ' ' + m.from + ' ' + m.to + ' ' + bodyText(m)).toLowerCase().includes(q));
        return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    const remoteDo = (m, fn) => (online() ? fn() : Promise.reject(new YuzuMail.Expired('Sign in again to do that!')));
    function openEmail(id) {
        state.activeId = id;
        const m = byId(id);
        if (m && !m.read) { m.read = true; if (m.remote) remoteDo(m, () => YuzuMail.setRead(state.account.provider, m, true)).catch(showError); else save(); }
        render();
    }
    function toggleStar(id) {
        const m = byId(id);
        if (!m) return;
        m.starred = !m.starred;
        if (m.remote) remoteDo(m, () => YuzuMail.setStar(state.account.provider, m, m.starred)).catch((e) => { m.starred = !m.starred; render(); showError(e); });
        else save();
        render();
    }
    function dropLocal(id) { state.local = state.local.filter((x) => x.id !== id); if (!state.account) state.emails = state.local; else rebuild(); }
    function deleteEmail(id) {
        const m = byId(id);
        if (!m) return;
        if (state.activeId === id) state.activeId = null;
        if (m.remote) {
            const prov = state.account.provider, wasTrash = m.folder === 'trash';
            remoteDo(m, () => (wasTrash ? YuzuMail.remove(prov, m) : YuzuMail.trash(prov, m))).then(() => {
                Object.keys(remote).forEach((k) => { remote[k] = (remote[k] || []).filter((x) => x.id !== m.id); });
                if (!wasTrash) { m.folder = 'trash'; (remote.trash = remote.trash || []).unshift(m); }
                rebuild(); render(); toast(wasTrash ? 'Deleted for good!' : 'Moved to Trash!');
            }).catch(showError);
            return;
        }
        if (m.folder === 'trash' || m.folder === 'drafts') { dropLocal(id); toast('Deleted for good!'); }
        else { m.folder = 'trash'; toast('Moved to Trash!'); }
        save(); render();
    }
    function restoreEmail(id) {
        const m = byId(id);
        if (!m) return;
        if (m.remote) {
            remoteDo(m, () => YuzuMail.untrash(state.account.provider, m)).then(() => { m.folder = 'inbox'; state.activeId = null; loadFolder('trash'); toast('Restored to your Inbox!'); }).catch(showError);
            return;
        }
        m.folder = 'inbox'; save(); render(); toast('Restored!');
    }
    function emptyTrash() {
        if (state.account) { const list = (remote.trash || []).slice(); if (!list.length) { toast('Trash is already empty!'); return; } Promise.all(list.map((m) => remoteDo(m, () => YuzuMail.remove(state.account.provider, m)).catch(() => null))).then(() => { remote.trash = []; rebuild(); render(); toast('Trash emptied!'); }); return; }
        state.local = state.local.filter((m) => m.folder !== 'trash'); state.emails = state.local; state.activeId = null; save(); render(); toast('Trash emptied!');
    }

    /* ---------- compose ---------- */
    function openCompose(opts) {
        opts = opts || {};
        state.compose = { id: opts.draftId || null, to: opts.to || '', subject: opts.subject || '', body: opts.body || '', reply: opts.reply || null };
        state.view = 'compose';
        render();
        setTimeout(() => { const el = $('yz-compose-to'); if (el) el.focus(); }, 30);
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
        let m = c.id ? state.local.find((x) => x.id === c.id) : null;
        if (!m) { m = { id: uid('m'), folder: 'drafts', read: true, starred: false }; state.local.unshift(m); c.id = m.id; }
        m.from = myEmail(); m.to = c.to; m.subject = c.subject; m.body = c.body; m.date = new Date().toISOString(); m.folder = 'drafts';
        if (state.account) rebuild(); else state.emails = state.local;
        save();
        if (!silent) { toast('Draft saved on this device!'); render(); }
    }
    async function send() {
        readComposeForm();
        const c = state.compose;
        if (!c || state.sending) return;
        if (!state.account) { saveDraft(true); toast('Sign in with Google or Microsoft to send real email!'); openAccounts(); return; }
        if (!online()) { toast('Your sign-in ran out, so please sign in again to send!'); openAccounts(); return; }
        const to = YuzuMail.addrList(c.to);
        if (!to.length) { toast('Add someone to send it to first!'); return; }
        const bad = to.find((a) => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(a.email));
        if (bad) { toast('"' + bad.email + '" does not look like an email address!'); return; }
        const parts = YuzuMail.fromKeydown(c.body);
        state.sending = true;
        const btn = $('yz-compose-send'); if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
        try {
            await YuzuMail.send(state.account.provider, { from: { name: state.account.name === state.account.email ? '' : state.account.name, email: state.account.email }, to, subject: c.subject.trim() || '(No subject)', text: parts.text, html: parts.html,
                threadId: c.reply && c.reply.threadId, inReplyTo: c.reply && c.reply.msgId });
            if (c.id) dropLocal(c.id);
            state.sending = false;
            closeCompose();
            toast('Sent to ' + to.map((a) => a.email).join(', ') + '!');
            if (state.folder === 'sent') loadFolder('sent'); else { delete remote.sent; }
            save();
        } catch (e) {
            state.sending = false;
            const b2 = $('yz-compose-send'); if (b2) { b2.disabled = false; b2.textContent = 'Send'; }
            showError(new Error('That could not be sent: ' + (e.message || e)));
        }
    }
    function reply(id) {
        const m = byId(id);
        if (!m) return;
        const who = m.folder === 'sent' ? m.to : m.from;
        const quoted = bodyText(m).split('\n').map((l) => '> ' + l).join('\n');
        openCompose({ to: who, subject: /^Re:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject, body: '\n\n' + nameOf(who) + ' wrote:\n' + quoted, reply: m.remote ? { threadId: m.threadId, msgId: m.msgId } : null });
    }
    function forward(id) {
        const m = byId(id);
        if (!m) return;
        const quoted = bodyText(m).split('\n').map((l) => '> ' + l).join('\n');
        openCompose({ to: '', subject: /^Fwd:/i.test(m.subject) ? m.subject : 'Fwd: ' + m.subject, body: '\n\n---- Forwarded message ----\nFrom: ' + m.from + '\nSubject: ' + m.subject + '\n\n' + quoted });
    }
    function editDraft(id) { const m = byId(id); if (m) openCompose({ draftId: m.id, to: m.to, subject: m.subject, body: m.body }); }

    /* ---------- export / import (messages kept on this device) ---------- */
    function download(name, text, type) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' }));
        a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    function exportYZ() { download('yuzu-drafts.yz', JSON.stringify({ format: 'yuzu', version: 1, emails: state.local }, null, 2), 'application/json'); toast('Saved yuzu-drafts.yz (the messages kept on this device)!'); }
    function importYZ(ev) {
        const f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        f.text().then((t) => {
            let data;
            try { data = JSON.parse(t); } catch (e) { toast('That .yz file could not be read!'); return; }
            if (!data || !Array.isArray(data.emails)) { toast('That does not look like a Yuzu file!'); return; }
            state.local = state.local.concat(data.emails.map((m) => Object.assign({}, m, { id: uid('m'), remote: false })));
            rebuild(); save(); render();
            toast('Imported ' + data.emails.length + ' message' + (data.emails.length === 1 ? '' : 's') + '!');
        });
    }
    function exportEML(id) {
        const m = byId(id);
        if (!m) return;
        const eml = ['From: ' + m.from, 'To: ' + m.to, 'Subject: ' + m.subject, 'Date: ' + new Date(m.date).toUTCString(), 'Content-Type: text/plain; charset=utf-8', '', bodyText(m)].join('\r\n');
        download((m.subject || 'message').replace(/[^\w -]+/g, '').slice(0, 60).trim() + '.eml', eml, 'message/rfc822');
        toast('Saved as .eml!');
    }

    /* ---------- pop-up windows (accounts and sign-in setup) ---------- */
    function closeModal() { const m = $('yz-modal'); if (m) m.remove(); }
    function modal(title, html, wide) {
        closeModal();
        const back = document.createElement('div');
        back.id = 'yz-modal'; back.className = 'yz-modal-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', title);
        back.innerHTML = '<div class="yz-modal-card' + (wide ? ' wide' : '') + '"><div class="yz-modal-head"><h2>' + esc(title) + '</h2><button type="button" class="yz-btn" data-x aria-label="Close">✕</button></div><div class="yz-modal-body">' + html + '</div></div>';
        back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-x]')) closeModal(); });
        document.body.appendChild(back);
        const first = back.querySelector('input, button:not([data-x])'); if (first) first.focus();
        return back;
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    const yuzuButtons = () => '<button type="button" class="yz-signin yz-signin-yuzu" data-yuzu="create">' + LOGO.yuzu + '<span>Get your @' + esc(DOMAIN) + ' address</span></button>' +
        '<button type="button" class="yz-signin" data-yuzu="login">' + LOGO.yuzu + '<span>Sign in with a Yuzu address</span></button>';
    const signInButtons = () => yuzuButtons() + ['google', 'microsoft'].map((p) => '<button type="button" class="yz-signin" data-signin="' + p + '">' + LOGO[p] + '<span>Sign in with ' + PROVIDERS[p] + '</span></button>').join('');
    function openAccounts() {
        const a = state.account;
        const m = modal('Your mail account',
            (a ? '<div class="yz-acct-card"><span class="yz-avatar" style="background:#0065ff">' + esc(initials(a.name || a.email)) + '</span><div><b>' + esc(a.name || a.email) + '</b><span class="yz-read-addr">' + esc(a.email) + ' · ' + PROVIDERS[a.provider] + '</span></div></div>' +
                '<p class="yz-note">' + (online() ? 'Connected! Your mail is loaded straight from ' + PROVIDERS[a.provider] + ' and is not kept on this device.' : 'Your connection ran out (it only lasts while this tab is open), so sign in again to load your mail!') + '</p>' +
                '<div class="yz-modal-actions">' + (online() ? '' : '<button type="button" class="yz-signin" data-signin="' + a.provider + '">' + LOGO[a.provider] + '<span>Sign in again</span></button>') + '<button type="button" class="yz-btn" data-out>Sign out</button></div>'
                : '<p class="yz-note">Sign in with your own account to read and send real email! Yuzu never sees your password: Google or Microsoft asks you in their own window.</p><div class="yz-modal-actions col">' + signInButtons() + '</div>') +
            '<p class="yz-note small"><button type="button" class="yz-link" data-setup>Set up sign-in</button> (the one-time settings that let this copy of Yuzu talk to Google and Microsoft)</p>');
        m.addEventListener('click', (e) => {
            const s = e.target.closest('[data-signin]'); if (s) connect(s.dataset.signin);
            const y = e.target.closest('[data-yuzu]'); if (y) { if (YuzuMail.configured('yuzu')) openYuzu(y.dataset.yuzu === 'login' ? 'login' : 'create'); else openSetup('yuzu'); }
            if (e.target.closest('[data-out]')) disconnect();
            if (e.target.closest('[data-setup]')) openSetup();
        });
    }
    function openYuzu(mode) {
        mode = mode === 'login' ? 'login' : 'create';
        const create = mode === 'create';
        const m = modal(create ? 'Get your Yuzu address' : 'Sign in with your Yuzu address',
            '<p class="yz-note">' + (create ? 'Pick a name and a password and you get your own <b>name@' + esc(DOMAIN) + '</b> address, free, to send and receive real email!' : 'Use the name and password you made for your Yuzu address.') + '</p>' +
            '<form id="yz-yuzu-form" autocomplete="on">' +
            (create ? '<label class="yz-field"><span>Your name <small>(shown to the people you write to)</small></span><input id="yz-yz-name" type="text" autocomplete="name" maxlength="60"></label>' : '') +
            '<label class="yz-field"><span>Address</span><span class="yz-addr"><input id="yz-yz-user" type="text" autocomplete="username" spellcheck="false" autocapitalize="none" maxlength="60" placeholder="example"><b>@' + esc(DOMAIN) + '</b></span></label>' +
            (create ? '<p class="yz-note small" id="yz-yz-avail" aria-live="polite">&nbsp;</p>' : '') +
            '<label class="yz-field"><span>Password' + (create ? ' <small>(at least 8 characters)</small>' : '') + '</span><input id="yz-yz-pass" type="password" autocomplete="' + (create ? 'new-password' : 'current-password') + '" maxlength="200"></label>' +
            '<p class="yz-note yz-error" id="yz-yz-err" role="alert" hidden></p>' +
            '<div class="yz-modal-actions"><button type="submit" class="yz-btn yz-primary" id="yz-yz-go">' + (create ? 'Create my address' : 'Sign in') + '</button><button type="button" class="yz-btn" data-switch>' + (create ? 'I already have one' : 'Make a new address') + '</button></div></form>');
        const err = m.querySelector('#yz-yz-err'), go = m.querySelector('#yz-yz-go'), user = m.querySelector('#yz-yz-user');
        const userName = () => user.value.trim().toLowerCase().replace(new RegExp('@' + DOMAIN.replace(/\./g, '\\.') + '$'), '');
        let t = 0;
        if (create) user.addEventListener('input', () => {
            clearTimeout(t); const av = m.querySelector('#yz-yz-avail'), u = userName();
            if (u.length < 3) { av.className = 'yz-note small'; av.textContent = ' '; return; }
            av.className = 'yz-note small'; av.textContent = 'Checking…';
            t = setTimeout(() => YuzuMail.yuzuAvailable(u).then((r) => { if (userName() !== u) return; av.className = 'yz-note small ' + (r.available ? 'yz-ok' : 'yz-error'); av.textContent = r.available ? '✓ ' + r.email + ' is free!' : r.reason; }).catch(() => { av.textContent = ' '; }), 350);
        });
        m.addEventListener('click', (e) => { if (e.target.closest('[data-switch]')) openYuzu(create ? 'login' : 'create'); });
        m.querySelector('#yz-yuzu-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            err.hidden = true; go.disabled = true; const label = go.textContent; go.textContent = 'One moment…';
            try {
                const acct = await YuzuMail.connect('yuzu', { create, username: userName(), password: m.querySelector('#yz-yz-pass').value, name: create ? m.querySelector('#yz-yz-name').value : '' });
                state.account = acct; state.error = ''; Object.keys(remote).forEach((k) => delete remote[k]);
                save(); rebuild(); closeModal(); render(); toast((create ? 'Welcome! Your address is ' : 'Signed in as ') + acct.email + '!'); sync(true);
            } catch (ex) { err.textContent = ex.message || String(ex); err.hidden = false; go.disabled = false; go.textContent = label; }
        });
    }
    function openSetup(want) {
        const ids = YuzuMail.ids(), origin = YuzuMail.origin(), redirect = YuzuMail.redirectUri();
        const m = modal('Set up sign-in',
            '<p class="yz-note">' + (want ? '<b>' + (want === 'yuzu' ? 'The Yuzu mail server is' : PROVIDERS[want] + ' sign-in is') + ' not set up yet.</b> ' : '') + 'Yuzu addresses need the Yuzu mail server (below), and Google and Microsoft each need a free "app" registration for Yuzu, done once by whoever hosts it. You get a <b>client ID</b> (it is public, not a secret): paste it below. It is kept only in this browser. (The site owner can also put it in <code>yuzu/config.js</code> so everyone gets it.)</p>' +
            '<details' + (want === 'yuzu' ? ' open' : '') + '><summary>Yuzu addresses (name@' + esc(DOMAIN) + ')</summary><ol class="yz-steps"><li>In <code>yuzu/worker/</code> (included with Yuzu) follow <b>README.md</b>: make the database, turn on Email Routing and Email Sending for <b>' + esc(DOMAIN) + '</b>, set the <b>SECRET</b> and deploy the Worker.</li><li>Copy the address the deploy prints (like <code>https://yuzu-mail.you.workers.dev</code>) here:</li></ol><input id="yz-id-api" type="text" spellcheck="false" placeholder="https://yuzu-mail.example.workers.dev" value="' + esc(ids.api) + '"></details>' +
            '<details' + (want === 'google' ? ' open' : '') + '><summary>Google (Gmail)</summary><ol class="yz-steps"><li>Open <b>console.cloud.google.com</b>, make a project, and turn on the <b>Gmail API</b>.</li><li>In <b>OAuth consent screen</b>, choose External and add your own address as a <b>test user</b> (needed until Google verifies the app).</li><li>In <b>Credentials</b>, create an <b>OAuth client ID</b> of type <b>Web application</b>.</li><li>Under <b>Authorized JavaScript origins</b> add <code>' + esc(origin) + '</code>.</li><li>Copy the <b>Client ID</b> here:</li></ol><input id="yz-id-google" type="text" spellcheck="false" placeholder="1234567890-abc.apps.googleusercontent.com" value="' + esc(ids.google) + '"></details>' +
            '<details' + (want === 'microsoft' ? ' open' : '') + '><summary>Microsoft (Outlook, Hotmail, Microsoft 365)</summary><ol class="yz-steps"><li>Open <b>portal.azure.com</b> → <b>App registrations</b> → <b>New registration</b>.</li><li>Pick <b>Accounts in any organizational directory and personal Microsoft accounts</b>.</li><li>Set the redirect: platform <b>Single-page application</b>, address <code>' + esc(redirect) + '</code>.</li><li>In <b>API permissions</b> add <b>Microsoft Graph</b> → <b>Delegated</b>: <code>Mail.ReadWrite</code>, <code>Mail.Send</code>, <code>User.Read</code>.</li><li>Copy the <b>Application (client) ID</b> here:</li></ol><input id="yz-id-microsoft" type="text" spellcheck="false" placeholder="00000000-0000-0000-0000-000000000000" value="' + esc(ids.microsoft) + '"></details>' +
            '<div class="yz-modal-actions"><button type="button" class="yz-btn yz-primary" data-save>Save</button><button type="button" class="yz-btn" data-x>Cancel</button></div>', true);
        m.addEventListener('click', (e) => {
            if (!e.target.closest('[data-save]')) return;
            YuzuMail.setClientIds($('yz-id-google').value, $('yz-id-microsoft').value, $('yz-id-api').value);
            closeModal(); render(); toast('Saved! Now press Sign in!');
            if (want && YuzuMail.configured(want)) openAccounts();
        });
    }

    /* ---------- drawing the sidebar, list and reading pane (shared by both looks: the ribbon layout just re-skins it with CSS) ---------- */
    const folderIcon = (f) => ({ inbox: '📥', starred: '⭐', sent: '📤', drafts: '📝', trash: '🗑️' }[f] || '📁');
    function renderAccount() {
        const el = $('yz-account');
        if (!el) return;
        const a = state.account;
        el.innerHTML = a
            ? '<button type="button" class="yz-acct" data-open-accounts><span class="yz-avatar" style="background:#0065ff">' + esc(initials(a.name || a.email)) + '</span><span class="yz-acct-text"><b>' + esc(a.name || a.email) + '</b><small>' + esc(a.email) + (online() ? '' : ' · signed out') + '</small></span></button>'
            : '<button type="button" class="yz-acct" data-open-accounts><span class="yz-acct-text"><b>Not signed in</b><small>Sign in to send and read real mail</small></span></button>';
    }
    function renderSidebar() {
        renderAccount();
        const el = $('yz-folders');
        if (!el) return;
        el.innerHTML = Object.keys(FOLDERS).map((f) => {
            const n = f === 'starred' ? state.emails.filter((m) => m.starred && m.folder !== 'trash').length : (f === 'inbox' || f === 'drafts') ? unreadCount(f) : 0;
            return '<button type="button" class="yz-folder' + (state.folder === f && !state.query ? ' on' : '') + '" data-folder="' + f + '">' +
                '<span class="yz-folder-icon" aria-hidden="true">' + folderIcon(f) + '</span><span class="yz-folder-name">' + FOLDERS[f] + '</span>' +
                (n ? '<span class="yz-folder-count">' + n + '</span>' : '') + '</button>';
        }).join('');
    }
    const avatarColor = (addr) => { let h = 0; const s = String(addr || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return ['#0065ff', '#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308'][h % 8]; };
    function renderList() {
        const el = $('yz-list');
        if (!el) return;
        const list = visibleEmails();
        $('yz-list-title').textContent = state.query ? 'Search results' : FOLDERS[state.folder];
        $('yz-list-count').textContent = state.loading ? 'Loading…' : list.length + (list.length === 1 ? ' message' : ' messages');
        if (state.error && !list.length) { el.innerHTML = '<div class="yz-empty yz-error">' + esc(state.error) + (state.account && !online() ? ' <button type="button" class="yz-link" data-open-accounts>Sign in</button>' : '') + '</div>'; return; }
        if (!list.length) { el.innerHTML = '<div class="yz-empty">' + (state.loading ? 'Loading your mail…' : 'Nothing here!' + (state.folder === 'trash' ? '' : ' <button type="button" class="yz-link" id="yz-empty-compose">Write something?</button>')) + '</div>'; const b = $('yz-empty-compose'); if (b) b.onclick = () => openCompose(); return; }
        el.innerHTML = list.map((m) => {
            const who = m.folder === 'sent' ? m.to : m.from;
            return '<button type="button" class="yz-row' + (!m.read ? ' unread' : '') + (m.id === state.activeId ? ' on' : '') + '" data-id="' + esc(m.id) + '">' +
                '<span class="yz-avatar" style="background:' + avatarColor(who) + '">' + esc(initials(who)) + '</span>' +
                '<span class="yz-row-mid"><span class="yz-row-top"><span class="yz-row-from">' + esc(nameOf(who) || '(no recipient)') + '</span><span class="yz-row-date">' + dateStr(m.date) + '</span></span>' +
                '<span class="yz-row-subject">' + esc(m.subject || '(No subject)') + '</span><span class="yz-row-snip">' + esc(bodyText(m).replace(/\s+/g, ' ').slice(0, 90)) + '</span></span>' +
                '<button type="button" class="yz-star' + (m.starred ? ' on' : '') + '" data-star="' + esc(m.id) + '" aria-label="' + (m.starred ? 'Remove star' : 'Star this message') + '" aria-pressed="' + m.starred + '">★</button>' +
                '</button>';
        }).join('');
    }
    function renderReading() {
        const el = $('yz-reading');
        if (!el) return;
        if (state.view === 'compose') { renderComposeInto(el); return; }
        const m = byId(state.activeId);
        if (!m) {
            el.innerHTML = state.account
                ? '<div class="yz-placeholder"><span class="yz-placeholder-icon" aria-hidden="true">✉️</span><p>Pick a message to read it, or write a new one!</p>' + (!online() ? '<button type="button" class="yz-signin" data-open-accounts>Sign in again</button>' : '') + '</div>'
                : '<div class="yz-welcome"><img src="favicon.svg" alt="" width="72" height="72"><h2>Welcome to Yuzu!</h2><p>Get your own free @' + esc(DOMAIN) + ' address, or sign in with Google or Microsoft, to read your inbox and send real email, with Keydown in every message you write!</p><div class="yz-modal-actions col">' + signInButtons() + '</div><p class="yz-note small">Mail is loaded into this page and is not kept on this device, and Google and Microsoft sign-ins never show Yuzu your password. <button type="button" class="yz-link" data-setup>Set up sign-in</button></p></div>';
            return;
        }
        const who = m.folder === 'sent' ? m.to : m.from;
        const isDraft = m.folder === 'drafts';
        el.innerHTML =
            '<div class="yz-read-top">' +
                '<h2 class="yz-read-subject">' + esc(m.subject || '(No subject)') + '</h2>' +
                '<div class="yz-read-actions">' +
                    (isDraft ? '<button type="button" class="yz-btn" data-act="edit">✎ Edit draft</button>' : m.folder === 'trash' ? '<button type="button" class="yz-btn" data-act="restore">Restore</button>' : '<button type="button" class="yz-btn" data-act="reply">↩ Reply</button><button type="button" class="yz-btn" data-act="forward">➦ Forward</button>') +
                    (isDraft ? '' : '<button type="button" class="yz-btn" data-act="star">' + (m.starred ? '★ Starred' : '☆ Star') + '</button>') +
                    '<button type="button" class="yz-btn" data-act="eml">⬇ .eml</button>' +
                    '<button type="button" class="yz-btn yz-danger" data-act="delete">' + (m.folder === 'trash' ? '🗑 Delete forever' : '🗑 Delete') + '</button>' +
                '</div></div>' +
            '<div class="yz-read-meta"><span class="yz-avatar" style="background:' + avatarColor(who) + '">' + esc(initials(who)) + '</span>' +
                '<div><b>' + esc(nameOf(who) || '(no recipient)') + '</b><span class="yz-read-addr">' + esc(who) + '</span></div>' +
                '<span class="yz-read-date">' + new Date(m.date).toLocaleString() + '</span></div>' +
            (m.remote ? '<div class="yz-read-body yz-plain">' + plainHtml(m.body) + '</div>' : '<div class="yz-read-body keydown-doc">' + kdHtml(m.body) + '</div>');
        const on = (a, fn) => { const b = el.querySelector('[data-act="' + a + '"]'); if (b) b.addEventListener('click', fn); };
        on('reply', () => reply(m.id)); on('forward', () => forward(m.id)); on('star', () => toggleStar(m.id)); on('eml', () => exportEML(m.id));
        on('delete', () => deleteEmail(m.id)); on('restore', () => restoreEmail(m.id)); on('edit', () => editDraft(m.id));
    }
    function renderComposeInto(el) {
        const c = state.compose || { to: '', subject: '', body: '' };
        const a = state.account;
        el.innerHTML =
            '<div class="yz-compose">' +
                '<div class="yz-compose-top"><h2>New message</h2><button type="button" class="yz-btn" id="yz-compose-close" aria-label="Close">✕</button></div>' +
                '<div class="yz-from">From <b>' + (a ? esc(a.email) : 'not signed in') + '</b>' + (a ? '' : ' <button type="button" class="yz-link" data-open-accounts>Sign in to send</button>') + '</div>' +
                '<label class="yz-field"><span>To <small>(separate several addresses with commas)</small></span><input id="yz-compose-to" type="text" placeholder="name@example.com" value="' + esc(c.to) + '"></label>' +
                '<label class="yz-field"><span>Subject</span><input id="yz-compose-subject" type="text" placeholder="Subject" value="' + esc(c.subject) + '"></label>' +
                '<label class="yz-field yz-field-body"><span>Message <small>(Keydown works here: **bold**, =B=gel orbs=B=, #R(color ink)... it is sent as formatted text)</small></span><textarea id="yz-compose-body" spellcheck="true" placeholder="Write your message!">' + esc(c.body) + '</textarea></label>' +
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
            if (e.target.closest('#yz-modal')) return;
            const so = e.target.closest('[data-signin]'); if (so) { connect(so.dataset.signin); return; }
            const yz = e.target.closest('[data-yuzu]'); if (yz) { if (YuzuMail.configured('yuzu')) openYuzu(yz.dataset.yuzu === 'login' ? 'login' : 'create'); else openSetup('yuzu'); return; }
            if (e.target.closest('[data-setup]')) { openSetup(); return; }
            if (e.target.closest('[data-open-accounts]')) { openAccounts(); return; }
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
        const syncBtn = $('yz-sync-btn');
        if (syncBtn) syncBtn.addEventListener('click', () => sync());
        // fresh mail every couple of minutes while the tab is open and showing
        setInterval(() => { if (online() && !document.hidden && state.view !== 'compose' && !state.loading && state.folder !== 'drafts') { const f = state.folder; YuzuMail.list(state.account.provider, f).then((l) => { remote[f] = l; rebuild(); render(); }).catch(() => {}); } }, 120000);
    }

    function renderAll() { renderSidebar(); renderList(); renderReading(); }
    renderHooks.push(renderAll);

    document.addEventListener('DOMContentLoaded', () => {
        load(); wire(); render();
        if (state.account) { if (online()) sync(true); else { state.error = 'Sign in again to load your mail!'; render(); } }
    });

    window.Yuzu = {
        $, state, FOLDERS, PROVIDERS, renderHooks, render, online,
        emails, byId, inFolder, unreadCount, visibleEmails,
        setFolder, setQuery, openEmail, toggleStar, deleteEmail, restoreEmail, emptyTrash, sync,
        openCompose, closeCompose, saveDraft, send, reply, forward, editDraft,
        connect, disconnect, openAccounts, openSetup, openYuzu, myEmail,
        exportYZ, importYZ, exportEML, toast, plain, kdHtml, dateStr, nameOf,
    };
})();
