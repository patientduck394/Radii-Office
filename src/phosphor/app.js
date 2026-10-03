// Phosphor LIVE! Zero-setup chat: public MQTT relays, local identity, no accounts!
// Open the page, pick a name, create or join a Space with a code. That's it!

import { MiniMqtt } from './mqtt.js';

const ROOT = 'radii-phosphor/v1';
const BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
];
const HEARTBEAT_MS = 20000;
const PRESENCE_TTL = 50000;
const HIST_MAX = 100;

let me = null; // {clientId, name}
let spaces = []; // [{code, name, desc, mine}]
let activeCode = null;
let members = new Map(); // clientId -> {name, at}
let seenIds = new Set();
let dirRetryTimer = null;
let mqtt = null;
let connectSeq = 0;
let reconnectTimer = null;
let heartbeatTimer = null;
let sweepTimer = null;

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function storeGet(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
}
function storeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

function uiSound(name) {
    try {
        if (typeof window !== 'undefined' && typeof window.playUiSound === 'function') window.playUiSound(name);
    } catch (e) {}
}

// ---------- Theme (light / dark toggle for the chat menu!) ----------
function getTheme() {
    const saved = storeGet('phosphor_theme', null);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
}

function applyTheme(theme) {
    const mode = theme === 'light' ? 'light' : 'dark';
    try {
        document.documentElement.setAttribute('data-theme', mode);
        document.body.classList.toggle('light-theme', mode === 'light');
    } catch (e) {}
    try {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.title = mode === 'light' ? 'Switch to dark mode!' : 'Switch to light mode!';
            btn.setAttribute('aria-label', mode === 'light' ? 'Switch to dark mode!' : 'Switch to light mode!');
        });
    } catch (e) {}
}

function toggleTheme() {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    storeSet('phosphor_theme', next);
    applyTheme(next);
    uiSound('theme');
    return false;
}

function initTheme() {
    applyTheme(getTheme());
}

// ---------- Mentions (@ context menu + chips + red space badges!) ----------
let stagedMentions = new Map(); // lowerName -> {name, id}
let mentionCandidates = []; // [{name, id}] currently shown in the menu!
let mentionMenuIndex = 0;
let mentionBadges = {}; // code -> count!
let mentionBadgesEnabled = true;

function loadMentionBadges() {
    const saved = storeGet('phosphor_mentions', {});
    mentionBadges = (saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : {};
    for (const k of Object.keys(mentionBadges)) {
        mentionBadges[k] = Math.max(0, parseInt(mentionBadges[k], 10) || 0);
        if (!mentionBadges[k]) delete mentionBadges[k];
    }
}

function saveMentionBadges() {
    storeSet('phosphor_mentions', mentionBadges);
}

function loadMentionPref() {
    try {
        const raw = localStorage.getItem('phosphor_mention_badges');
        mentionBadgesEnabled = raw !== '0';
    } catch (e) { mentionBadgesEnabled = true; }
    try {
        document.body.classList.toggle('badges-off', !mentionBadgesEnabled);
    } catch (e) {}
}

const BELL_SVG = '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.34 17.726H8.659m6.683 0c0 5.699-6.683 5.699-6.683 0m6.683 0c1.801 0 8.053.263 4.674-3.15C15.32 10.986 21 2 11.999 2s-3.318 8.986-8.013 12.576c-3.38 3.412 2.869 3.15 4.672 3.15" /></svg>';
const ONLINE_SVG = '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M2 9.483c5.603-5.31 14.397-5.31 20 0" /><path d="M19 12.9c-3.866-3.867-10.134-3.867-14 0m11 3.257a5.657 5.657 0 0 0-8 0m4 3.093v-.5" /></g></svg>';

function updateMentionToggle() {
    try {
        const btn = document.getElementById('mention-toggle');
        if (btn) {
            btn.innerHTML = BELL_SVG + '<span>Mentions: ' + (mentionBadgesEnabled ? 'On!' : 'Off!') + '</span>';
            btn.classList.toggle('off', !mentionBadgesEnabled);
        }
    } catch (e) {}
}

function toggleMentionBadges() {
    mentionBadgesEnabled = !mentionBadgesEnabled;
    try { localStorage.setItem('phosphor_mention_badges', mentionBadgesEnabled ? '1' : '0'); } catch (e) {}
    try { document.body.classList.toggle('badges-off', !mentionBadgesEnabled); } catch (e) {}
    if (!mentionBadgesEnabled) {
        mentionBadges = {};
        saveMentionBadges();
    }
    updateMentionToggle();
    renderSpaces();
    uiSound('toggle');
    return false;
}

function clearMentionBadge(code) {
    if (!code || !mentionBadges[code]) return;
    delete mentionBadges[code];
    saveMentionBadges();
    renderSpaces();
}

function bumpMentionBadge(code) {
    if (!mentionBadgesEnabled || !code) return;
    mentionBadges[code] = (parseInt(mentionBadges[code], 10) || 0) + 1;
    saveMentionBadges();
    renderSpaces();
}

let knownUsers = []; // global directory of everyone ever seen {name, id, at}!

function loadKnownUsers() {
    const saved = storeGet('phosphor_known_users', []);
    knownUsers = Array.isArray(saved) ? saved.filter(u => u && u.name) : [];
}

function saveKnownUsers() {
    storeSet('phosphor_known_users', knownUsers.slice(-200));
}

function rememberUser(name, id) {
    const clean = String(name || '').trim().slice(0, 24);
    if (clean.length < 2) return;
    if (me && id && id === me.clientId) return;
    const key = clean.toLowerCase();
    const existing = knownUsers.find(u => String(u.name).toLowerCase() === key);
    if (existing) {
        existing.name = clean;
        if (id) existing.id = id;
        existing.at = Date.now();
    } else {
        knownUsers.push({ name: clean, id: id || null, at: Date.now() });
        if (knownUsers.length > 200) knownUsers = knownUsers.slice(-200);
    }
    saveKnownUsers();
}

function getKnownUsers() {
    const byLower = new Map();
    const add = (name, id, online) => {
        const clean = String(name || '').trim().slice(0, 24);
        if (clean.length < 2) return;
        const key = clean.toLowerCase();
        const cur = byLower.get(key);
        if (!cur) byLower.set(key, { name: clean, id: id || null, online: !!online });
        else {
            if (online) cur.online = true;
            if (id && !cur.id) cur.id = id;
        }
    };
    // Folks in this Space right now come first!
    try {
        for (const [id, m] of members) add(m.name, id, true);
    } catch (e) {}
    if (me) add(me.name, me.clientId, true);
    // History from EVERY Space, so offline folks elsewhere stay mentionable!
    try {
        for (const s of spaces) {
            try {
                for (const h of loadHist(s.code)) add(h.name, h.from, false);
            } catch (e) {}
        }
    } catch (e) {}
    // Persistent directory, so they survive even cleared history!
    try {
        for (const u of knownUsers) add(u.name, u.id, false);
    } catch (e) {}
    return [...byLower.values()].sort((a, b) => ((b.online - a.online) || a.name.localeCompare(b.name)));
}

function extractMentionNames(text) {
    const out = [];
    const seen = new Set();
    const re = /@([A-Za-z0-9_.\-]{2,24})/g;
    let m;
    while ((m = re.exec(String(text ?? '')))) {
        const key = m[1].toLowerCase();
        if (!seen.has(key)) { seen.add(key); out.push(m[1]); }
    }
    return out;
}

function resolveMention(name) {
    const key = String(name || '').toLowerCase();
    const known = getKnownUsers().find(u => u.name.toLowerCase() === key);
    if (known) return known;
    return { name: String(name).slice(0, 24), id: null };
}

function findUnstagedMentionMatch(text) {
    for (const name of extractMentionNames(text)) {
        const key = name.toLowerCase();
        if (stagedMentions.has(key)) continue;
        const known = getKnownUsers().find(u => u.name.toLowerCase() === key);
        if (known) return known;
    }
    return null;
}

function stageMention(name, id) {
    const clean = String(name || '').trim().slice(0, 24);
    if (clean.length < 2) return;
    stagedMentions.set(clean.toLowerCase(), { name: clean, id: id || null });
    renderMentionChips();
}

function unstageMention(name) {
    stagedMentions.delete(String(name || '').toLowerCase());
    renderMentionChips();
}

function renderMentionChips() {
    const tray = document.getElementById('mention-chips');
    if (!tray) return;
    tray.innerHTML = '';
    if (!stagedMentions.size) { tray.style.display = 'none'; return; }
    tray.style.display = 'flex';
    for (const { name } of stagedMentions.values()) {
        const chip = document.createElement('span');
        chip.className = 'mention-chip';
        chip.textContent = '@' + name + ' ';
        const x = document.createElement('button');
        x.type = 'button';
        x.innerText = '✖';
        x.title = 'Remove @' + name + '!';
        x.onclick = (e) => { e.stopPropagation(); unstageMention(name); };
        chip.appendChild(x);
        tray.appendChild(chip);
    }
}

function resetMentionComposer() {
    stagedMentions = new Map();
    mentionCandidates = [];
    mentionMenuIndex = 0;
    try { renderMentionChips(); } catch (e) {}
    try { closeMentionMenu(); } catch (e) {}
}

function isMentionMenuOpen() {
    try {
        const menu = document.getElementById('mention-menu');
        return !!menu && menu.style.display !== 'none';
    } catch (e) { return false; }
}

function closeMentionMenu() {
    const menu = document.getElementById('mention-menu');
    if (menu) { menu.innerHTML = ''; menu.style.display = 'none'; }
    mentionCandidates = [];
    mentionMenuIndex = 0;
}

function openMentionMenu(cands, query) {
    const menu = document.getElementById('mention-menu');
    const input = document.getElementById('send-input');
    if (!menu || !input) return;
    mentionCandidates = cands;
    mentionMenuIndex = 0;
    menu.innerHTML = '';
    cands.forEach((u, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mention-item' + (i === 0 ? ' active' : '');
        const av = document.createElement('span');
        av.className = 'mention-avatar';
        av.innerText = u.name.slice(0, 1).toUpperCase();
        const label = document.createElement('span');
        label.innerText = '@' + u.name;
        const dot = document.createElement('span');
        dot.className = 'mention-status' + (u.online ? ' on' : '');
        dot.title = u.online ? 'In this Space now!' : 'Away or in another Space — still mentionable!';
        b.appendChild(av);
        b.appendChild(label);
        b.appendChild(dot);
        b.onmousedown = (e) => { e.preventDefault(); pickMention(i); };
        menu.appendChild(b);
    });
    menu.style.display = 'flex';
}

function highlightMentionMenu() {
    const menu = document.getElementById('mention-menu');
    if (!menu) return;
    [...menu.children].forEach((el, i) => el.classList.toggle('active', i === mentionMenuIndex));
}

function getMentionQuery() {
    const input = document.getElementById('send-input');
    if (!input) return null;
    const caret = (typeof input.selectionStart === 'number') ? input.selectionStart : input.value.length;
    const before = input.value.slice(0, caret);
    const m = /@([A-Za-z0-9_.\-]{0,24})$/.exec(before);
    if (!m) return null;
    return { query: m[1], start: caret - m[0].length };
}

function refreshMentionMenu() {
    const q = getMentionQuery();
    if (!q) { closeMentionMenu(); return; }
    const users = getKnownUsers();
    const ql = q.query.toLowerCase();
    const cands = users.filter(u => u.name.toLowerCase().startsWith(ql)).slice(0, 8);
    if (!cands.length) { closeMentionMenu(); return; }
    openMentionMenu(cands, q.query);
}

function pickMention(i) {
    const input = document.getElementById('send-input');
    const u = mentionCandidates[i ?? mentionMenuIndex];
    const q = getMentionQuery();
    if (!u || !input || !q) { closeMentionMenu(); return false; }
    const caret = (typeof input.selectionStart === 'number') ? input.selectionStart : input.value.length;
    const after = input.value.slice(caret);
    input.value = input.value.slice(0, q.start) + '@' + u.name + ' ' + after;
    stageMention(u.name, u.id);
    closeMentionMenu();
    try {
        const pos = q.start + u.name.length + 2;
        input.focus();
        input.setSelectionRange(pos, pos);
    } catch (e) {}
    updateKdTypingIcon();
    uiSound('click');
    return false;
}

function wireMentionSystem() {
    const input = document.getElementById('send-input');
    if (!input || input.dataset.mentionWired === '1') return;
    input.dataset.mentionWired = '1';
    input.addEventListener('input', refreshMentionMenu);
    input.addEventListener('click', refreshMentionMenu);
    input.addEventListener('blur', () => setTimeout(closeMentionMenu, 150));
    input.addEventListener('keydown', (e) => {
        if (!isMentionMenuOpen()) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); mentionMenuIndex = (mentionMenuIndex + 1) % mentionCandidates.length; highlightMentionMenu(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); mentionMenuIndex = (mentionMenuIndex - 1 + mentionCandidates.length) % mentionCandidates.length; highlightMentionMenu(); }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); pickMention(mentionMenuIndex); }
        else if (e.key === 'Escape') { e.preventDefault(); closeMentionMenu(); }
    }, true);
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('mention-menu');
        if (menu && menu.style.display !== 'none' && !e.target.closest('.composer-anchor')) closeMentionMenu();
    });
}

function highlightMentionsInHtml(html, msg) {
    try {
        const names = [];
        if (msg && Array.isArray(msg.mentions)) for (const m of msg.mentions) { if (m && m.name) names.push(String(m.name)); }
        for (const n of extractMentionNames(msg && msg.body)) { if (!names.some(x => x.toLowerCase() === n.toLowerCase())) names.push(n); }
        if (!names.length) return html;
        const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = String(html).split(/(<[^>]*>)/g);
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].startsWith('<')) continue;
            for (const name of names) {
                const isMe = me && name.toLowerCase() === me.name.toLowerCase();
                parts[i] = parts[i].replace(new RegExp('@' + escRe(name) + '\\b', 'g'),
                    `<span class="mention-chip${isMe ? ' mention-me' : ''}">@${esc(name)}</span>`);
            }
        }
        return parts.join('');
    } catch (e) { return html; }
}

function isMentioned(msg) {
    if (!me || !msg || msg.from === me.clientId) return false;
    try {
        if (Array.isArray(msg.mentions)) {
            for (const m of msg.mentions) {
                if (!m) continue;
                if (m.id && m.id === me.clientId) return true;
                if (m.name && String(m.name).toLowerCase() === me.name.toLowerCase()) return true;
            }
        }
    } catch (e) {}
    return extractMentionNames(msg.body).some(n => n.toLowerCase() === me.name.toLowerCase());
}

function buildMentionsForSend(text) {
    const out = [];
    const seen = new Set();
    const push = (name, id) => {
        const key = String(name).toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ name: String(name).slice(0, 24), id: id || null });
    };
    for (const { name, id } of stagedMentions.values()) push(name, id);
    for (const n of extractMentionNames(text)) {
        if (seen.has(n.toLowerCase())) continue;
        push(resolveMention(n).name, resolveMention(n).id);
    }
    return out;
}

function initMentions() {
    loadMentionBadges();
    loadMentionPref();
    loadKnownUsers();
    updateMentionToggle();
    wireMentionSystem();
    renderMentionChips();
}

// ---------- Identity (your "account" lives in this browser!) ----------
function loadIdentity() {
    me = storeGet('phosphor_identity', null);
    if (me && me.clientId && me.name) return true;
    me = null;
    return false;
}

function enterName(e) {
    e.preventDefault();
    const name = document.getElementById('auth-name').value.trim().slice(0, 24);
    if (name.length < 2) {
        const err = document.getElementById('auth-error');
        err.innerText = 'Pick a name (2+ chars)!';
        err.style.display = 'block';
        return false;
    }
    me = { clientId: 'ph_' + Math.random().toString(36).slice(2, 14), name };
    storeSet('phosphor_identity', me);
    uiSound('success');
    enterApp();
    return false;
}

function switchName() {
    uiSound('close');
    leaveView();
    me = null;
    try { localStorage.removeItem('phosphor_identity'); } catch (e) {}
    document.getElementById('app-view').style.display = 'none';
    document.getElementById('auth-view').style.display = 'flex';
    document.getElementById('auth-name').value = '';
}

// ---------- Spaces ----------
function loadSpaces() {
    spaces = storeGet('phosphor_spaces', []);
    if (!Array.isArray(spaces)) spaces = [];
}
function saveSpaces() {
    storeSet('phosphor_spaces', spaces);
}

function newCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    for (const b of bytes) code += chars[b % chars.length];
    return code;
}

function renderSpaces() {
    const list = document.getElementById('space-list');
    list.innerHTML = '';
    spaces.forEach(s => {
        const row = document.createElement('div');
        row.className = 'space-row';
        const b = document.createElement('button');
        b.className = 'action-btn space-btn' + (s.code === activeCode ? ' active' : '');
        b.innerHTML = `<span># ${esc(s.name)}<small>${esc(s.code)}</small></span>`;
        const badgeCount = mentionBadgesEnabled ? (parseInt(mentionBadges[s.code], 10) || 0) : 0;
        if (badgeCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'mention-badge';
            badge.innerText = badgeCount > 99 ? '99+' : String(badgeCount);
            badge.title = badgeCount + ' mention' + (badgeCount === 1 ? '' : 's') + '!';
            b.appendChild(badge);
        }
        b.onclick = () => openSpace(s.code);
        const x = document.createElement('button');
        x.className = 'leave-btn';
        x.innerText = '✖';
        x.title = 'Leave ' + s.name + '!';
        x.onclick = (e) => { e.stopPropagation(); askLeaveSpace(s.code); };
        row.appendChild(b);
        row.appendChild(x);
        list.appendChild(row);
    });
}

function askLeaveSpace(code) {
    const s = spaces.find(x => x.code === code);
    if (s && confirm(`Leave ${s.name}? Its local history goes too!`)) leaveSpace(code);
}

function leaveSpace(code) {
    if (mqtt && mqtt.connected && me) {
        try {
            mqtt.publish(topicPresence(code, me.clientId), JSON.stringify({ name: me.name, at: Date.now(), online: false }), true);
            mqtt.unsubscribe([topicMsg(code), topicDir(code), ROOT + '/presence/' + code + '/+']);
        } catch (e) {}
    }
    spaces = spaces.filter(s => s.code !== code);
    saveSpaces();
    try { localStorage.removeItem(histKey(code)); } catch (e) {}
    try { localStorage.removeItem('phosphor_hist_' + code); } catch (e) {}
    if (mentionBadges[code]) { delete mentionBadges[code]; saveMentionBadges(); }
    uiSound('leave');
    renderSpaces();
    if (activeCode === code) {
        activeCode = null;
        members = new Map();
        document.getElementById('empty-chat').style.display = 'block';
        document.getElementById('chat-view').style.display = 'none';
    }
}

function openSpaceModal() {
    uiSound('open');
    document.getElementById('new-space-name').value = '';
    document.getElementById('new-space-desc').value = '';
    document.getElementById('space-modal').style.display = 'flex';
}

function openJoinModal() {
    uiSound('open');
    document.getElementById('join-code').value = '';
    document.getElementById('join-modal').style.display = 'flex';
}

function closeModals() {
    uiSound('close');
    document.getElementById('space-modal').style.display = 'none';
    document.getElementById('join-modal').style.display = 'none';
}

function createSpace() {
    const name = document.getElementById('new-space-name').value.trim().slice(0, 40);
    if (name.length < 2) { alert('Name your Space (2+ chars)!'); uiSound('error'); return; }
    const description = document.getElementById('new-space-desc').value.trim().slice(0, 200);
    const code = newCode();
    spaces.push({ code, name, description, mine: true });
    saveSpaces();
    publishDir(code, name, description);
    closeModals();
    renderSpaces();
    openSpace(code);
}

function joinSpace() {
    const code = document.getElementById('join-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { alert('That code looks too short!'); uiSound('error'); return; }
    if (!spaces.some(s => s.code === code)) {
        spaces.push({ code, name: code, description: 'Resolving…', mine: false });
        saveSpaces();
    }
    closeModals();
    renderSpaces();
    openSpace(code);
    // Ask the network who lives here!
    if (mqtt && mqtt.connected) mqtt.subscribe(ROOT + '/dir/' + code);
}

function publishDir(code, name, description) {
    if (!mqtt || !mqtt.connected) return;
    mqtt.publish(ROOT + '/dir/' + code, JSON.stringify({ name, description, at: Date.now() }), true);
}

// ---------- Chat ----------
function topicMsg(code) { return `${ROOT}/msg/${code}`; }
function topicDir(code) { return `${ROOT}/dir/${code}`; }
function topicPresence(code, id) { return `${ROOT}/presence/${code}/${id}`; }

function spaceMsgTopics() {
    return spaces.map(s => topicMsg(s.code));
}

function subscribeAllSpaceMsgs() {
    if (!mqtt || !mqtt.connected) return;
    try {
        const topics = spaceMsgTopics();
        if (topics.length) mqtt.subscribe(topics);
    } catch (e) {}
}

function openSpace(code) {
    uiSound('open');
    leaveView(false);
    activeCode = code;
    members = new Map();
    seenIds = new Set();
    clearMentionBadge(code);
    resetMentionComposer();
    renderSpaces();
    const space = spaces.find(s => s.code === code) || { code, name: code, description: '' };
    document.getElementById('empty-chat').style.display = 'none';
    document.getElementById('chat-view').style.display = 'flex';
    document.getElementById('chat-name').innerText = '# ' + space.name;
    updateMeta();
    const invite = document.getElementById('invite-code');
    invite.innerText = 'Invite: ' + code;
    invite.onclick = () => {
        if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
        invite.innerText = 'Copied!';
        setTimeout(() => { invite.innerText = 'Invite: ' + code; }, 1200);
    };
    renderHistory();
    if (mqtt && mqtt.connected) {
        subscribeAllSpaceMsgs();
        mqtt.subscribe([topicDir(code), ROOT + '/presence/' + code + '/+']);
        heartbeat();
    }
    // If we joined blind, the retained directory usually answers instantly —
    // but ask again in a few seconds in case the first ask got lost!
    clearTimeout(dirRetryTimer);
    const joined = spaces.find(s => s.code === code);
    if (joined && joined.name === joined.code) {
        dirRetryTimer = setTimeout(() => {
            const still = spaces.find(s => s.code === code);
            if (still && still.name === still.code && mqtt && mqtt.connected) {
                mqtt.subscribe(topicDir(code));
            }
        }, 5000);
    }
}

function leaveView(clearActive = true) {
    if (mqtt && mqtt.connected && activeCode && me) {
        try {
            mqtt.publish(topicPresence(activeCode, me.clientId), JSON.stringify({ online: false }), true);
            mqtt.unsubscribe([topicMsg(activeCode), topicDir(activeCode), ROOT + '/presence/' + activeCode + '/+']);
        } catch (e) {}
    }
    clearInterval(heartbeatTimer);
    clearInterval(sweepTimer);
    clearTimeout(dirRetryTimer);
    if (clearActive) {
        activeCode = null;
        renderSpaces();
        document.getElementById('empty-chat').style.display = 'block';
        document.getElementById('chat-view').style.display = 'none';
    }
}

function updateMeta() {
    const online = [...members.values()].filter(m => m.online).length;
    const space = spaces.find(s => s.code === activeCode);
    const names = [...members.values()].filter(m => m.online).map(m => m.name).slice(0, 12).join(', ');
    document.getElementById('chat-meta').innerText =
        ((space && space.description) || 'No description!') + ` · ${online} online!`;
    const bar = document.getElementById('members-bar');
    if (names) {
        bar.style.display = 'flex';
        bar.innerHTML = ONLINE_SVG + '<span>' + esc(names) + '</span>';
    } else bar.style.display = 'none';
    try { if (isMentionMenuOpen()) refreshMentionMenu(); } catch (e) {}
}

function histKey(code) { return 'phosphor_hist_' + code; }

function loadHist(code) {
    const h = storeGet(histKey(code), []);
    return Array.isArray(h) ? h : [];
}

function saveHist(code, list) {
    storeSet(histKey(code), list.slice(-HIST_MAX));
}

function renderHistory() {
    const box = document.getElementById('messages');
    box.innerHTML = '';
    for (const m of loadHist(activeCode)) box.appendChild(renderMessage(m));
    box.scrollTop = box.scrollHeight;
    box.onscroll = null;
}

function fmtTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return sameDay ? `${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function kdBody(raw) {
    const text = String(raw ?? '');
    try {
        if (typeof kdRender === 'function') return kdRender(text);
    } catch (e) {}
    return esc(text);
}

function renderMessage(m) {
    const div = document.createElement('div');
    div.className = 'msg' + (me && m.from === me.clientId ? ' me' : '');
    if (isMentioned(m)) div.classList.add('mentions-me');
    div.innerHTML = `<span class="who">${esc(m.name)}</span>`
        + `<span class="when">${fmtTime(m.at)}</span><br><span class="msg-body">${highlightMentionsInHtml(kdBody(m.body), m)}</span>`;
    return div;
}

function showMessage(m, forceScroll) {
    const box = document.getElementById('messages');
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    box.appendChild(renderMessage(m));
    if (forceScroll || nearBottom) box.scrollTop = box.scrollHeight;
}

function onChatMessage(code, payload) {
    let m = null;
    try { m = JSON.parse(payload); } catch (e) { return; }
    if (!m || m.v !== 1 || !m.id || !m.body || !m.from) return;
    if (seenIds.has(m.id)) return;
    seenIds.add(m.id);
    if (seenIds.size > 500) seenIds = new Set([...seenIds].slice(-300));
    m.body = String(m.body).slice(0, 2000);
    if (!Array.isArray(m.mentions)) m.mentions = [];
    rememberUser(m.name, m.from);
    const mentioned = isMentioned(m);
    const viewing = (code === activeCode);
    if (viewing) {
        showMessage(m);
        if (!me || m.from !== me.clientId) uiSound(mentioned ? 'mention' : 'receive');
    } else if (mentioned) {
        bumpMentionBadge(code);
        uiSound('mention');
    }
    const hist = loadHist(code);
    hist.push({ id: m.id, from: m.from, name: m.name, body: m.body, at: m.at, mentions: m.mentions.slice(0, 20) });
    saveHist(code, hist);
}

function onDirMessage(code, payload) {
    let d = null;
    try { d = JSON.parse(payload); } catch (e) { return; }
    if (!d || !d.name) return;
    const s = spaces.find(x => x.code === code);
    if (s && !s.mine) {
        s.name = String(d.name).slice(0, 40);
        s.description = String(d.description || '').slice(0, 200);
        saveSpaces();
        renderSpaces();
        if (code === activeCode) {
            document.getElementById('chat-name').innerText = '# ' + s.name;
            updateMeta();
        }
    }
}

function onPresenceMessage(clientId, payload) {
    let p = null;
    try { p = JSON.parse(payload); } catch (e) { return; }
    if (!p) return;
    if (me && clientId === me.clientId) {
        if (p.online === false) members.delete(clientId);
        else members.set(clientId, { name: String(p.name || '?').slice(0, 24), at: p.at || Date.now(), online: true });
        updateMeta();
        return;
    }
    if (p.online === false) {
        if (members.has(clientId)) uiSound('leave');
        members.delete(clientId);
    } else {
        if (!members.has(clientId)) uiSound('join');
        members.set(clientId, { name: String(p.name || '?').slice(0, 24), at: p.at || Date.now(), online: true });
        rememberUser(p.name, clientId);
    }
    updateMeta();
}

function sweepPresence() {
    const now = Date.now();
    let changed = false;
    for (const [id, m] of members) {
        if (now - m.at > PRESENCE_TTL) { members.delete(id); changed = true; }
    }
    if (changed) updateMeta();
}

function heartbeat() {
    if (!mqtt || !mqtt.connected || !activeCode || !me) return;
    mqtt.publish(topicPresence(activeCode, me.clientId),
        JSON.stringify({ name: me.name, at: Date.now(), online: true }), true);
}

// ---------- Connection ----------
function setConn(on, label) {
    document.getElementById('conn-dot').classList.toggle('on', !!on);
    const lab = document.getElementById('conn-label');
    if (lab) lab.innerText = label || (on ? 'Live!' : 'Connecting…');
}

function connect() {
    if (!me) return;
    closeMqtt();
    setConn(false, 'Connecting…');
    // Race every broker in parallel: first CONNACK wins! Blocked ports and
    // dead relays fail fast (7s) instead of hanging the whole app!
    const mySeq = ++connectSeq;
    const pending = new Set();
    let won = false;
    const cleanupLosers = () => {
        pending.forEach(m => { try { m.close(); } catch (e) {} });
        pending.clear();
    };
    const allFailed = () => {
        if (won || mySeq !== connectSeq) return;
        cleanupLosers();
        setConn(false, 'Retrying…');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            if (me && (activeCode || spaces.length)) connect();
        }, 3000);
    };
    const onWin = (m) => {
        if (won || mySeq !== connectSeq) { try { m.close(); } catch (e) {} return; }
        won = true;
        cleanupLosers();
        mqtt = m;
        mqtt.onmessage = (topic, payload) => {
            if (topic.startsWith(ROOT + '/msg/')) {
                onChatMessage(topic.slice((ROOT + '/msg/').length), payload);
                return;
            }
            if (!activeCode) return;
            if (topic === topicDir(activeCode)) onDirMessage(activeCode, payload);
            else if (topic.startsWith(ROOT + '/presence/' + activeCode + '/')) {
                onPresenceMessage(topic.split('/').pop(), payload);
            } else if (topic.startsWith(ROOT + '/dir/')) {
                onDirMessage(topic.slice((ROOT + '/dir/').length), payload);
            }
        };
        mqtt.onclose = () => {
            if (mqtt !== m) return;
            mqtt = null;
            setConn(false, 'Retrying…');
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                if (me && (activeCode || spaces.length)) connect();
            }, 3000);
        };
        mqtt.onerror = () => {};
        setConn(true, 'Live!');
        uiSound('connect');
        renderSpaces();
        if (activeCode) {
            subscribeAllSpaceMsgs();
            mqtt.subscribe([topicDir(activeCode), ROOT + '/presence/' + activeCode + '/+']);
            heartbeat();
            clearInterval(heartbeatTimer);
            heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
            clearInterval(sweepTimer);
            sweepTimer = setInterval(sweepPresence, 10000);
        }
    };
    for (const url of BROKERS) {
        const m = new MiniMqtt(url, { clientId: me.clientId + '_' + Date.now().toString(36), keepalive: 60 });
        pending.add(m);
        const timer = setTimeout(() => {
            try { m.close(); } catch (e) {}
            pending.delete(m);
            allFailed();
        }, 7000);
        m.onopen = () => { clearTimeout(timer); pending.delete(m); onWin(m); };
        m.onclose = () => { clearTimeout(timer); pending.delete(m); allFailed(); };
        m.onerror = () => {};
        try { m.connect(); } catch (e) { clearTimeout(timer); pending.delete(m); allFailed(); }
    }
    if (pending.size === 0) allFailed();
}

function closeMqtt() {
    connectSeq++;
    clearInterval(heartbeatTimer);
    clearInterval(sweepTimer);
    clearTimeout(reconnectTimer);
    if (mqtt) { try { mqtt.close(); } catch (e) {} }
    mqtt = null;
}

function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('send-input');
    const body = input.value.trim();
    if (!body) return false;
    // Mention flow: picking from the @ menu never sends, it stages a chip!
    if (isMentionMenuOpen()) { pickMention(mentionMenuIndex); return false; }
    const unstaged = findUnstagedMentionMatch(body);
    if (unstaged) {
        stageMention(unstaged.name, unstaged.id);
        closeMentionMenu();
        uiSound('click');
        return false;
    }
    if (!mqtt || !mqtt.connected || !activeCode) return false;
    const mentions = buildMentionsForSend(body);
    const msg = {
        v: 1,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
        from: me.clientId,
        name: me.name,
        body: body.slice(0, 2000),
        mentions: mentions.slice(0, 20),
        at: Date.now(),
    };
    seenIds.add(msg.id);
    mqtt.publish(topicMsg(activeCode), JSON.stringify(msg), false);
    showMessage(msg, true);
    uiSound('send');
    const hist = loadHist(activeCode);
    hist.push({ id: msg.id, from: msg.from, name: msg.name, body: msg.body, at: msg.at, mentions: msg.mentions });
    saveHist(activeCode, hist);
    input.value = '';
    resetMentionComposer();
    updateKdTypingIcon();
    return false;
}

function isKeydownDetected(text) {
    const s = String(text ?? '');
    if (!s.trim()) return false;
    // Primary check: does the full Keydown renderer produce rich output?!
    try {
        if (typeof kdRender === 'function') {
            const html = kdRender(s);
            if (/<(span|code|strong|em|div)[\s>]/i.test(html)) return true;
        }
    } catch (e) {}
    // Fallback: quick trigger scan (covers core + marketplace + ::blocks)!
    if (/::(glass|bubble|alert|media|aqua|code|emerald|amber|crimson|amethyst|gsky|gemerald|gamber|gcrimson|foldout|divider|console|diff|horizon|waypoint|entry|draw)\s*$/i.test(s.trim())) return true;
    return /(\*\*.+?\*\*|\*.+?\*|`[^`]+`|&&.+?&&|~[A-Z0-9]+~.+?~[A-Z0-9]+~|=[A-Z]+=.+?=[A-Z]+=|!#[A-Z]+#.+?#)/s.test(s);
}

function updateKdTypingIcon() {
    const input = document.getElementById('send-input');
    const icon = document.getElementById('kd-typing-icon');
    if (!input || !icon) return;
    if (isKeydownDetected(input.value)) icon.classList.add('show');
    else icon.classList.remove('show');
}

function wireKdTypingIcon() {
    const input = document.getElementById('send-input');
    if (!input || input.dataset.kdWired === '1') return;
    input.dataset.kdWired = '1';
    // Keydown while typing: re-check on every keystroke + paste + cut!
    input.addEventListener('keydown', () => requestAnimationFrame(updateKdTypingIcon));
    input.addEventListener('input', updateKdTypingIcon);
    input.addEventListener('paste', () => requestAnimationFrame(updateKdTypingIcon));
    input.addEventListener('cut', () => requestAnimationFrame(updateKdTypingIcon));
    updateKdTypingIcon();
}

function enterApp() {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'flex';
    document.getElementById('me-name').innerText = me.name;
    loadSpaces();
    renderSpaces();
    connect();
    wireKdTypingIcon();
    initMentions();
}

// Inline handlers (the page uses onclick)!
Object.assign(window, {
    enterName, switchName, openSpaceModal, openJoinModal, closeModals,
    createSpace, joinSpace, sendMessage, askLeaveSpace, leaveSpace, toggleTheme,
    toggleMentionBadges, pickMention, unstageMention,
});

// ---------- Boot ----------
initTheme();
initMentions();
if (loadIdentity()) {
    enterApp();
} else {
    document.getElementById('auth-view').style.display = 'flex';
}
wireKdTypingIcon();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireKdTypingIcon);
}
