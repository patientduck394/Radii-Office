import { createCalls } from './rtc.js';
import { mountCallUI } from './call-ui.js';
import { createNets, NETS } from './nets.js';
// Phosphor LIVE! Zero-setup chat: public MQTT relays, local identity, no accounts!
// Open the page, pick a name, create or join a Space with a code. That's it!

import { MiniMqtt } from './mqtt.js';

const ROOT = 'radii-phosphor/v1';
// ONE central meeting-point relay + automatic backups! Everyone prefers the
// first entry, so near + far devices overlap by default! The rest only serve
// while central is unreachable (hot standby)! Note: plain ws:// is useless
// here (browsers block it on https pages), so every entry must be wss://!
const BROKERS = [
    'wss://mqtt.eclipseprojects.io:443/mqtt',
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
];
const CENTRALIZED = true; // single-path traffic via the preferred relay!
const HEARTBEAT_MS = 20000;
const PRESENCE_TTL = 50000;
const HIST_MAX = 100;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // big files ride chunked streams!
const MAX_SINGLE_BYTES = 2 * 1024 * 1024; // instant single-shot ceiling (relay permitting)!
const CHUNK_RAW = 32 * 1024; // raw bytes per chunk (base64 inflates it)!
const CHUNK_PER_TICK = 8; // chunks fired per pump tick!
const PUMP_MS = 60; // sender pacing, keeps the UI breathing!
const RETRY_WAIT_MS = 15000; // receiver patience before asking for gaps!
const MAX_RETRIES = 3; // then the transfer is marked failed!
const SEND_CACHE_MS = 120000; // senders keep chunks this long for retries!
const MAX_ZIP_FILES = 500; // folder sanity cap!
const MAX_BLOB_BYTES = 24 * 1024 * 1024; // in-memory completed downloads cap!
const MAX_FILE_DATA_CHARS = 3 * 1024 * 1024; // single-message inbound abuse guard!
const KEPT_FILE_PAYLOADS = 3; // only newest single-file contents persist locally!

let me = null; // {clientId, name}
let spaces = []; // [{code, name, desc, mine}]
let activeCode = null;
let members = new Map(); // clientId -> {name, at}
let seenIds = new Set();
let activeBrokerUrl = null; // first live relay (conn tooltip)!
let heartbeatTimer = null;
let sweepTimer = null;
let dirNudgeTimer = null;
let relays = []; // [{url, host, mqtt, retryTimer}] — one link per relay!
let wantedSubs = new Set(); // every topic we want, on every live relay!
let meshWon = false;

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

function getKnownUsers(opts) {
    const includeHidden = !!(opts && opts.includeHidden);
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
    let list = [...byLower.values()];
    // Hidden trolls stay out of suggestions (moderation still sees them)!
    if (!includeHidden) {
        try {
            const hidden = new Set(hiddenUsers.map(u => u.key));
            if (hidden.size) list = list.filter(u => !hidden.has(u.name.toLowerCase()));
        } catch (e) {}
    }
    return list.sort((a, b) => ((b.online - a.online) || a.name.localeCompare(b.name)));
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
        const hide = document.createElement('button');
        hide.type = 'button';
        hide.className = 'mention-hide';
        hide.innerText = '✖';
        hide.title = 'Hide @' + u.name + ' from suggestions!';
        hide.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); hideUser(u.name); };
        b.appendChild(av);
        b.appendChild(label);
        b.appendChild(dot);
        b.appendChild(hide);
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

// ---------- Moderation (/kick, /ban, /unban, /warn — Space owner only!) ----------
// Cooperative by necessity: relays are public with no accounts, so every
// client enforces what it can verify. Only the Space creator's clientId
// (published in the directory entry) may issue mod actions, targets obey
// on their own client, and warns stay invisible to everyone but the target!
let bans = {}; // code -> {at, by} — Spaces I am banned from!

function loadBans() {
    const saved = storeGet('phosphor_bans', {});
    bans = (saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : {};
}

function saveBans() {
    storeSet('phosphor_bans', bans);
}

function isBanned(code) {
    return !!(code && bans && bans[code]);
}

function setBan(code, by) {
    bans[code] = { at: Date.now(), by: String(by || '').slice(0, 24) };
    saveBans();
}

function clearBan(code) {
    if (code && bans[code]) {
        delete bans[code];
        saveBans();
    }
}

function isSpaceOwner(code) {
    const s = spaces.find(x => x.code === code);
    if (!s || !me) return false;
    if (s.owner) return s.owner === me.clientId;
    return !!s.mine;
}

function isSenderOwner(code, senderId) {
    const s = spaces.find(x => x.code === code);
    if (!s || !senderId || !s.owner) return false;
    return senderId === s.owner;
}

function splitTarget(rest) {
    let r = String(rest || '').trim().replace(/^@/, '');
    if (!r) return null;
    const users = getKnownUsers({ includeHidden: true });
    let best = null;
    for (const u of users) {
        if (r.length >= u.name.length && r.slice(0, u.name.length).toLowerCase() === u.name.toLowerCase()) {
            const after = r.slice(u.name.length);
            if (after === '' || /^[\s"']/.test(after)) {
                if (!best || u.name.length > best.name.length) best = { name: u.name, rest: after.trim() };
            }
        }
    }
    if (best) return best;
    const tok = r.split(/\s+/)[0];
    return { name: tok, rest: r.slice(tok.length).trim() };
}

function resolveTarget(name) {
    const key = String(name || '').trim().toLowerCase().replace(/^@/, '');
    if (!key) return null;
    const hit = getKnownUsers({ includeHidden: true }).find(u => u.name.toLowerCase() === key);
    if (hit) return { id: hit.id || null, name: hit.name };
    return null;
}

function modFallback(action, targetName, ownerName) {
    if (action === 'warn') return '🔒 Private notice for @' + targetName + ' — update Phosphor to view!';
    if (action === 'kick') return '🔨 ' + ownerName + ' kicked @' + targetName + '!';
    if (action === 'ban') return '🔨 ' + ownerName + ' banned @' + targetName + '!';
    return '🔓 ' + ownerName + ' unbanned @' + targetName + '!';
}

function sendMod(code, action, target, text) {
    const msg = {
        v: 1,
        id: genMsgId(),
        from: me.clientId,
        name: me.name,
        body: modFallback(action, target.name, me.name),
        kind: 'mod',
        mod: { action, target: { id: target.id || null, name: target.name }, text: String(text || '').slice(0, 2000) },
        at: Date.now(),
    };
    seenIds.add(msg.id);
    try {
        mesh.publish(topicMsg(code), JSON.stringify(msg), false);
    } catch (e) {
        alert('Send failed!');
        uiSound('error');
        return null;
    }
    return msg;
}

function buildSysNotice(text) {
    const div = document.createElement('div');
    div.className = 'msg sys';
    div.textContent = String(text || '');
    return div;
}

function showLocalNotice(text) {
    try {
        const box = document.getElementById('messages');
        if (!box) return;
        const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
        box.appendChild(buildSysNotice(text));
        if (nearBottom) box.scrollTop = box.scrollHeight;
    } catch (e) {}
}

function addSysNotice(code, text, id) {
    const entry = { id: id || genMsgId(), from: '', name: '', body: '', at: Date.now(), kind: 'sys', text: String(text || '').slice(0, 500) };
    try {
        if (code === activeCode) {
            const box = document.getElementById('messages');
            if (box) {
                const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
                const div = buildSysNotice(entry.text);
                try { div.dataset.mid = String(entry.id); } catch (e) {}
                box.appendChild(div);
                if (nearBottom) box.scrollTop = box.scrollHeight;
                try { renumberMessages(); } catch (e) {}
            }
        }
    } catch (e) {}
    try {
        const hist = loadHist(code);
        hist.push(entry);
        saveHist(code, hist);
    } catch (e) {}
}

function onModMessage(code, m) {
    const mod = (m.mod && typeof m.mod === 'object') ? m.mod : null;
    if (!mod) return;
    const action = String(mod.action || '');
    if (!['kick', 'ban', 'unban', 'warn', 'delete'].includes(action)) return;
    if (!isSenderOwner(code, m.from)) return; // forged or unverifiable: ignore!
    const space = spaces.find(s => s.code === code);
    const sname = (space && space.name) || code;
    const ownerName = (space && space.ownerName) || m.name;
    const target = mod.target || {};
    const tname = String(target.name || '?').slice(0, 24);
    const isMe = (target.id && me && target.id === me.clientId)
        || (!target.id && me && tname.toLowerCase() === me.name.toLowerCase());
    const reason = String(mod.text || '').trim().slice(0, 200);
    if (action === 'warn') {
        if (!isMe) return; // private: only the target ever sees it!
        const entry = { id: m.id, from: m.from, name: m.name, body: String(mod.text || '').slice(0, 2000), at: m.at || Date.now(), kind: 'warn', warnFrom: ownerName };
        if (code === activeCode) showMessage(entry, true);
        try {
            const hist = loadHist(code);
            hist.push(entry);
            saveHist(code, hist);
        } catch (e) {}
        uiSound('mention');
        return;
    }
    if (action === 'delete') {
        const ids = (target && Array.isArray(target.ids)) ? target.ids.map(String).slice(0, 200) : [];
        if (!ids.length) return;
        const removed = deleteLocalMessages(code, ids);
        if (removed) addSysNotice(code, ownerName + ' deleted ' + removed + ' message(s)!', m.id);
        return;
    }
    if (action === 'unban') {
        if (isMe) {
            clearBan(code);
            renderSpaces();
            showLocalNotice('You were unbanned from #' + sname + '! Open it to rejoin the chat!');
            uiSound('success');
        } else {
            addSysNotice(code, ownerName + ' unbanned @' + tname + '!', m.id);
        }
        return;
    }
    const notice = ownerName + (action === 'kick' ? ' kicked @' : ' banned @') + tname + '!' + (reason ? ' ' + reason : '');
    if (isMe) {
        if (action === 'kick') {
            leaveSpace(code);
            alert('You were kicked from #' + sname + ' by ' + ownerName + '!' + (reason ? ' Reason: ' + reason : ''));
        } else {
            setBan(code, ownerName);
            try {
                mesh.publish(topicPresence(code, me.clientId), JSON.stringify({ online: false }), true);
                mesh.unsubscribe([ROOT + '/presence/' + code + '/+']);
            } catch (e) {}
            if (activeCode === code) {
                activeCode = null;
                members = new Map();
                document.getElementById('empty-chat').style.display = 'block';
                document.getElementById('chat-view').style.display = 'none';
            }
            renderSpaces();
            uiSound('leave');
            alert('You were banned from #' + sname + ' by ' + ownerName + '!' + (reason ? ' Reason: ' + reason : ''));
        }
        return;
    }
    addSysNotice(code, notice, m.id);
}

function checkModTarget(target, splitName) {
    if (!target) {
        showLocalNotice('Could not find @' + splitName + '! They need to have visited this Space!');
        uiSound('error');
        return false;
    }
    if (me && ((target.id && target.id === me.clientId) || target.name.toLowerCase() === me.name.toLowerCase())) {
        showLocalNotice('You cannot target yourself!');
        uiSound('error');
        return false;
    }
    const space = spaces.find(s => s.code === activeCode);
    if (space && space.owner && target.id && target.id === space.owner) {
        showLocalNotice('That is the Space owner — untouchable!');
        uiSound('error');
        return false;
    }
    if (space && space.ownerName && !target.id && target.name.toLowerCase() === String(space.ownerName).toLowerCase()) {
        showLocalNotice('That is the Space owner — untouchable!');
        uiSound('error');
        return false;
    }
    return true;
}

function doKickBan(cmd, rest) {
    if (!isSpaceOwner(activeCode)) {
        showLocalNotice('Only the Space owner can use /' + cmd + '!');
        uiSound('error');
        return true;
    }
    const split = splitTarget(rest);
    if (!split) {
        showLocalNotice('Who? Try /' + cmd + ' @name!');
        uiSound('error');
        return true;
    }
    const target = resolveTarget(split.name);
    if (!checkModTarget(target, split.name)) return true;
    const msg = sendMod(activeCode, cmd, target, split.rest);
    if (!msg) return true;
    addSysNotice(activeCode, me.name + (cmd === 'kick' ? ' kicked @' : ' banned @') + target.name + '!' + (split.rest ? ' ' + split.rest.slice(0, 200) : ''), msg.id);
    uiSound('send');
    return true;
}

function doWarnCmd(rest) {
    if (!isSpaceOwner(activeCode)) {
        showLocalNotice('Only the Space owner can use /warn!');
        uiSound('error');
        return true;
    }
    const split = splitTarget(rest);
    if (!split) {
        showLocalNotice('Who? Try /warn @name "message"!');
        uiSound('error');
        return true;
    }
    let text = split.rest;
    if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    text = text.trim().slice(0, 500);
    if (!text) {
        showLocalNotice('Give them a message! Try /warn @name "message"!');
        uiSound('error');
        return true;
    }
    const target = resolveTarget(split.name);
    if (!checkModTarget(target, split.name)) return true;
    const msg = sendMod(activeCode, 'warn', target, text);
    if (!msg) return true;
    showLocalNotice('Warned @' + target.name + ' — only they can see it!');
    uiSound('send');
    return true;
}

function doUnbanCmd(rest) {
    if (!isSpaceOwner(activeCode)) {
        showLocalNotice('Only the Space owner can use /unban!');
        uiSound('error');
        return true;
    }
    const split = splitTarget(rest);
    if (!split) {
        showLocalNotice('Who? Try /unban @name!');
        uiSound('error');
        return true;
    }
    const target = resolveTarget(split.name);
    if (!checkModTarget(target, split.name)) return true;
    const msg = sendMod(activeCode, 'unban', target, '');
    if (!msg) return true;
    addSysNotice(activeCode, me.name + ' unbanned @' + target.name + '!', msg.id);
    uiSound('send');
    return true;
}

// ---------- Delete (/delete 1-3&5 — owner wipes messages by number!) ----------
// Numbers are positions in history: top message is 1! Dashes delete ranges,
// ampersands delete multiples, combined like 1-10&7-3&6-8! Positions resolve
// to internal IDs here, so every device deletes the SAME messages even when
// histories differ! Enforcement is cooperative like the other mod commands!
function parseDeleteSpec(rest, total) {
    const s = String(rest || '').trim();
    if (!s) return { nums: [], error: 'Give message numbers! Try /delete 1-3&5!' };
    const parts = s.split('&').map(x => x.trim()).filter(x => x.length);
    if (!parts.length) return { nums: [], error: 'Give message numbers! Try /delete 1-3&5!' };
    const set = new Set();
    for (const part of parts) {
        const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
        if (!m) return { nums: [], error: 'Bad bit "' + part.slice(0, 20) + '"! Use numbers and ranges like 1-3&5!' };
        const a = parseInt(m[1], 10);
        const b = (m[2] === undefined) ? a : parseInt(m[2], 10);
        if (!(a >= 1) || !(b >= 1)) return { nums: [], error: 'Numbers start at 1! Bad bit "' + part.slice(0, 20) + '"!' };
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        if (lo > total) return { nums: [], error: 'Only ' + total + ' message(s) here! #' + lo + ' is out of range!' };
        const top = Math.min(hi, total);
        for (let n = lo; n <= top; n++) set.add(n);
    }
    if (!set.size) return { nums: [], error: 'Nothing to delete!' };
    return { nums: [...set].sort((x, y) => x - y), error: null };
}

function compactRanges(nums) {
    const sorted = [...new Set(nums)].map(Number).filter(n => n >= 1).sort((x, y) => x - y);
    if (!sorted.length) return '';
    const out = [];
    let start = sorted[0], prev = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
        const cur = sorted[i];
        if (cur === prev + 1) { prev = cur; continue; }
        out.push(start === prev ? String(start) : start + '-' + prev);
        start = cur; prev = cur;
    }
    return out.join('&');
}

function sendDelete(code, ids, nums) {
    const msg = {
        v: 1,
        id: genMsgId(),
        from: me.clientId,
        name: me.name,
        body: '🗑️ ' + me.name + ' deleted ' + ids.length + ' message(s)! (' + compactRanges(nums) + ')',
        kind: 'mod',
        mod: { action: 'delete', target: { ids: ids.slice(0, 200) }, text: compactRanges(nums).slice(0, 200) },
        at: Date.now(),
    };
    seenIds.add(msg.id);
    try {
        mesh.publish(topicMsg(code), JSON.stringify(msg), false);
    } catch (e) {
        alert('Send failed!');
        uiSound('error');
        return null;
    }
    return msg;
}

function deleteLocalMessages(code, ids) {
    const wanted = new Set((ids || []).map(String));
    if (!wanted.size) return 0;
    let removed = 0;
    try {
        const hist = loadHist(code);
        const kept = hist.filter(m => {
            const id = (m && m.id) ? String(m.id) : '';
            if (id && wanted.has(id)) { removed++; return false; }
            return true;
        });
        if (removed) {
            saveHist(code, kept);
            // Drop in-flight file transfers for removed messages!
            try {
                for (const id of wanted) {
                    const t = fileTransfers.get(id);
                    if (t) {
                        try { clearInterval(t.sendTimer); } catch (e) {}
                        try { clearTimeout(t.retryTimer); } catch (e) {}
                        try { if (t.transferId) transferByTid.delete(t.transferId); } catch (e) {}
                        fileTransfers.delete(id);
                    }
                }
            } catch (e) {}
        }
    } catch (e) { return 0; }
    if (removed && code === activeCode) {
        try { renderHistory(); } catch (e) {}
    }
    return removed;
}

function doDeleteCmd(rest) {
    if (!isSpaceOwner(activeCode)) {
        showLocalNotice('Only the Space owner can use /delete!');
        uiSound('error');
        return true;
    }
    const hist = loadHist(activeCode);
    if (!hist.length) {
        showLocalNotice('No messages to delete!');
        uiSound('error');
        return true;
    }
    const parsed = parseDeleteSpec(rest, hist.length);
    if (parsed.error) {
        showLocalNotice(parsed.error);
        uiSound('error');
        return true;
    }
    const ids = [];
    for (const n of parsed.nums) {
        const m = hist[n - 1];
        if (m && m.id) ids.push(String(m.id));
    }
    if (!ids.length) {
        showLocalNotice('Nothing to delete!');
        uiSound('error');
        return true;
    }
    const msg = sendDelete(activeCode, ids, parsed.nums);
    if (!msg) return true;
    const removed = deleteLocalMessages(activeCode, ids);
    showLocalNotice('Deleted ' + removed + ' message(s)! (' + compactRanges(parsed.nums) + ')');
    uiSound('send');
    return true;
}

function handleSlashCommand(raw) {
    const m = /^\/(\w+)\s*([\s\S]*)$/.exec(String(raw || '').trim());
    if (!m) return true;
    const cmd = m[1].toLowerCase();
    const rest = (m[2] || '').trim();
    if (!['kick', 'ban', 'unban', 'warn', 'delete'].includes(cmd)) {
        showLocalNotice('Unknown command! Try /kick, /ban, /unban, /warn, or /delete!');
        uiSound('error');
        return true;
    }
    if (!activeCode) return true;
    try { closeMentionMenu(); } catch (e) {}
    if (cmd === 'warn') return doWarnCmd(rest);
    if (cmd === 'unban') return doUnbanCmd(rest);
    if (cmd === 'delete') return doDeleteCmd(rest);
    return doKickBan(cmd, rest);
}

// ---------- Mention filter (hide trolls from @ suggestions, clear the index!) ----------
// Hiding only affects suggestions: typed-out mentions still notify, and mod
// commands can still target hidden users. The index itself (everyone ever
// seen) can be wiped; current Spaces + history keep suggesting as usual!
let hiddenUsers = []; // [{name, key}] — filtered out of @ suggestions!

function loadHiddenUsers() {
    const saved = storeGet('phosphor_hidden_users', []);
    hiddenUsers = Array.isArray(saved)
        ? saved.filter(u => u && u.key).map(u => ({ name: String(u.name || u.key).slice(0, 24), key: String(u.key).toLowerCase().slice(0, 24) }))
        : [];
}

function saveHiddenUsers() {
    storeSet('phosphor_hidden_users', hiddenUsers.slice(-200));
}

function hideUser(name) {
    const clean = String(name || '').trim().slice(0, 24);
    if (clean.length < 2) return false;
    const key = clean.toLowerCase();
    if (!hiddenUsers.some(u => u.key === key)) {
        hiddenUsers.push({ name: clean, key });
        if (hiddenUsers.length > 200) hiddenUsers = hiddenUsers.slice(-200);
        saveHiddenUsers();
    }
    updateFilterButton();
    renderHiddenList();
    try { refreshMentionMenu(); } catch (e) {}
    uiSound('click');
    return false;
}

function unhideUser(name) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return false;
    hiddenUsers = hiddenUsers.filter(u => u.key !== key);
    saveHiddenUsers();
    updateFilterButton();
    renderHiddenList();
    try { refreshMentionMenu(); } catch (e) {}
    uiSound('click');
    return false;
}

function unhideAllUsers() {
    hiddenUsers = [];
    saveHiddenUsers();
    updateFilterButton();
    renderHiddenList();
    try { refreshMentionMenu(); } catch (e) {}
    uiSound('toggle');
    return false;
}

function clearKnownUsers() {
    knownUsers = [];
    saveKnownUsers();
    updateFilterButton();
    renderHiddenList();
    try { refreshMentionMenu(); } catch (e) {}
    uiSound('toggle');
    return false;
}

function updateFilterButton() {
    try {
        const btn = document.getElementById('filter-open-btn');
        if (btn) btn.innerText = hiddenUsers.length ? 'Mention filter (' + hiddenUsers.length + ')!' : 'Mention filter!';
    } catch (e) {}
}

function renderHiddenList() {
    try {
        const count = document.getElementById('hidden-count');
        if (count) count.innerText = String(hiddenUsers.length);
        const indexed = document.getElementById('indexed-count');
        if (indexed) indexed.innerText = String(knownUsers.length);
        const all = document.getElementById('unhide-all-btn');
        if (all) all.style.display = hiddenUsers.length ? 'inline-block' : 'none';
        const list = document.getElementById('hidden-list');
        if (!list) return;
        list.innerHTML = '';
        if (!hiddenUsers.length) {
            const empty = document.createElement('div');
            empty.className = 'modal-note';
            empty.innerText = 'Nobody hidden! Everyone shows up in @ suggestions!';
            list.appendChild(empty);
            return;
        }
        for (const u of hiddenUsers.slice().sort((a, b) => a.name.localeCompare(b.name))) {
            const row = document.createElement('div');
            row.className = 'hidden-row';
            const label = document.createElement('span');
            label.innerText = '@' + u.name;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mini-btn';
            btn.innerText = 'Unhide';
            btn.title = 'Suggest @' + u.name + ' again!';
            btn.onclick = () => unhideUser(u.key);
            row.appendChild(label);
            row.appendChild(btn);
            list.appendChild(row);
        }
    } catch (e) {}
}

function openFilterModal() {
    renderHiddenList();
    updateFilterButton();
    document.getElementById('filter-modal').style.display = 'flex';
    uiSound('open');
    return false;
}

function initFilter() {
    loadHiddenUsers();
    updateFilterButton();
    renderHiddenList();
    try {
        const all = document.getElementById('unhide-all-btn');
        if (all && !all.dataset.wired) {
            all.dataset.wired = '1';
            all.onclick = () => unhideAllUsers();
        }
    } catch (e) {}
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
    try { nets.sync(spaces); } catch (e) {}
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
        b.className = 'action-btn space-btn' + (s.code === activeCode ? ' active' : '') + (isBanned(s.code) ? ' banned' : '');
        const net = NETS[s.net];
        b.innerHTML = `<span># ${esc(s.name)}<small>${esc(s.code)}${net ? ` <em class="net-tag net-${s.net}" title="${esc(net.blurb)}">${net.icon} ${net.label}</em>` : ''}</small></span>`;
        if (isBanned(s.code)) b.title = 'Banned from ' + s.name + '!';
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
    if (mesh.connected && me) {
        try {
            mesh.publish(topicPresence(code, me.clientId), JSON.stringify({ name: me.name, at: Date.now(), online: false }), true);
            mesh.unsubscribe([topicMsg(code), topicDir(code), ROOT + '/presence/' + code + '/+']);
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
    setNetPick('new', 'emqx');
    document.getElementById('space-modal').style.display = 'flex';
}

function openJoinModal() {
    uiSound('open');
    document.getElementById('join-code').value = '';
    setNetPick('join', 'auto');
    document.getElementById('join-modal').style.display = 'flex';
}

function closeModals() {
    uiSound('close');
    document.getElementById('space-modal').style.display = 'none';
    document.getElementById('join-modal').style.display = 'none';
    document.getElementById('filter-modal').style.display = 'none';
}

function createSpace() {
    const name = document.getElementById('new-space-name').value.trim().slice(0, 40);
    if (name.length < 2) { alert('Name your Space (2+ chars)!'); uiSound('error'); return; }
    const description = document.getElementById('new-space-desc').value.trim().slice(0, 200);
    const pick = readNetPick('new');
    if (!pick) return;
    const code = newCode();
    spaces.push(Object.assign({ code, name, description, mine: true, owner: me.clientId, ownerName: me.name }, pick));
    saveSpaces();
    publishDir(code, name, description);
    closeModals();
    renderSpaces();
    openSpace(code);
}

// ---------- Invites (click the Invite link -> invite page -> click to join!) ----------
function inviteUrl(code) {
    try {
        const u = new URL('invite.html', location.href);
        u.searchParams.set('code', code);
        const s = spaces.find(x => x.code === code);
        if (s && NETS[s.net]) u.searchParams.set('net', s.net);
        // RabbitMQ logins ride in the #hash, which browsers never send to any server!
        if (s && s.net === 'rabbitmq' && s.rmq) u.hash = 'rmq=' + btoa(unescape(encodeURIComponent(JSON.stringify(s.rmq))));
        return u.toString();
    } catch (e) {
        return 'invite.html?code=' + encodeURIComponent(code);
    }
}

function getInviteCodeFromUrl() {
    try {
        const q = new URLSearchParams(location.search);
        const c = String(q.get('code') || q.get('invite') || q.get('space') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (c.length >= 4) return c;
    } catch (e) {}
    try {
        const h = String(location.hash || '').replace(/^#/, '').replace(/^code=/i, '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (h.length >= 4) return h;
    } catch (e) {}
    return '';
}

function clearInviteCodeFromUrl() {
    try {
        const u = new URL(location.href);
        u.searchParams.delete('code');
        u.searchParams.delete('invite');
        u.searchParams.delete('space');
        u.searchParams.delete('net');
        u.hash = '';
        history.replaceState(null, '', u.toString());
    } catch (e) {}
}

function joinSpace() {
    const code = document.getElementById('join-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const pick = readNetPick('join');
    if (pick === null) return;
    joinSpaceByCode(code, pick);
}

// ---------- Space networks (EMQX, RabbitMQ, WebRTC) ----------
const RMQ_LAST = 'phosphor_rmq_last';
function setNetPick(which, net) {
    const box = document.getElementById(which + '-space-net');
    if (!box) return;
    box.querySelectorAll('[data-net]').forEach(b => b.classList.toggle('on', b.getAttribute('data-net') === net));
    const rf = document.getElementById(which + '-rmq');
    rf.hidden = net !== 'rabbitmq';
    if (net === 'rabbitmq') {
        const last = storeGet(RMQ_LAST, {}) || {};
        const u = document.getElementById(which + '-rmq-url');
        if (!u.value) u.value = last.url || '';
        const n = document.getElementById(which + '-rmq-user');
        if (!n.value) n.value = last.user || '';
    }
    const hint = document.getElementById(which + '-net-hint');
    if (hint) hint.innerText = NETS[net] ? NETS[net].blurb : 'Phosphor asks the Space which network it uses!';
}
function wireNetPickers() {
    ['new', 'join'].forEach(which => {
        const box = document.getElementById(which + '-space-net');
        if (!box || box.dataset.wired) return;
        box.dataset.wired = '1';
        box.addEventListener('click', (e) => {
            const b = e.target.closest('[data-net]');
            if (b) { uiSound('click'); setNetPick(which, b.getAttribute('data-net')); }
        });
    });
}
// {net, rmq?} for the picked network, {} for auto, null when the RabbitMQ form is not ready!
function readNetPick(which) {
    const on = document.querySelector('#' + which + '-space-net .on');
    const net = on ? on.getAttribute('data-net') : 'emqx';
    if (net === 'auto') return {};
    if (net !== 'rabbitmq') return { net };
    const url = document.getElementById(which + '-rmq-url').value.trim();
    const user = document.getElementById(which + '-rmq-user').value.trim();
    const pass = document.getElementById(which + '-rmq-pass').value;
    if (!/^wss?:\/\/.+/i.test(url)) { alert('Give the RabbitMQ Web MQTT address, like wss://rabbit.example.com:15676/ws!'); uiSound('error'); return null; }
    storeSet(RMQ_LAST, { url, user });
    return { net, rmq: { url: url.slice(0, 300), user: user.slice(0, 120), pass: pass.slice(0, 200) } };
}
// Move a Space to another network, carrying its subscriptions along!
function setSpaceNet(s, net, rmq) {
    const topics = [topicMsg(s.code)];
    if (s.code === activeCode) topics.push(ROOT + '/presence/' + s.code + '/+');
    const watching = s.code === activeCode;
    try { if (watching) calls.watch(null); } catch (e) {}
    try { mesh.unsubscribe(topics); } catch (e) {}
    s.net = net;
    if (rmq) s.rmq = rmq;
    delete s.netAuto;
    saveSpaces();
    try { mesh.subscribe(topics); } catch (e) {}
    try { if (watching) calls.watch(s.code); } catch (e) {}
    renderSpaces();
    updateNetChip();
    if (watching) heartbeat();
}
// The chip in the chat header: which road this Space's messages take!
function updateNetChip() {
    const chip = document.getElementById('net-chip');
    if (!chip) return;
    if (!activeCode) { chip.hidden = true; return; }
    const st = nets.status(activeCode);
    chip.hidden = false;
    const n = NETS[st.net];
    chip.className = 'net-chip' + (st.net ? ' net-' + st.net : '') + (st.ok ? ' ok' : ' bad');
    chip.innerHTML = '<i></i>' + esc((n ? n.icon + ' ' : '') + st.label) + (st.net === 'webrtc' ? ' · ' + (st.peers || 0) : '');
    chip.title = st.detail + (st.net === 'rabbitmq' ? ' Click to change the server or login!' : '');
}
function editSpaceNet() {
    const s = spaces.find(x => x.code === activeCode);
    if (!s) return;
    const st = nets.status(s.code);
    if (s.net !== 'rabbitmq') { phToast(st.label + ': ' + st.detail); return; }
    const cur = s.rmq || {};
    const url = prompt('RabbitMQ Web MQTT address (wss://host:15676/ws)!', cur.url || '');
    if (url === null) return;
    if (!/^wss?:\/\/.+/i.test(url.trim())) { phToast('That address needs to start with wss://!'); return; }
    const user = prompt('Username (leave empty for none, use vhost:user for a vhost)!', cur.user || '');
    if (user === null) return;
    const pass = user.trim() ? prompt('Password!', cur.pass || '') : '';
    if (pass === null) return;
    nets.resetLink(s.code);
    setSpaceNet(s, 'rabbitmq', { url: url.trim().slice(0, 300), user: user.trim().slice(0, 120), pass: String(pass).slice(0, 200) });
    phToast('Reconnecting to RabbitMQ!');
}
// A WebRTC peer handed over its recent history: merge what we missed!
function mergeSyncedHistory(code, items) {
    if (!spaces.some(s => s.code === code)) return;
    const hist = loadHist(code);
    const have = new Set(hist.map(m => m.id));
    let added = 0;
    for (const it of items) {
        if (!it || typeof it.id !== 'string' || have.has(it.id) || typeof it.body !== 'string' || typeof it.from !== 'string') continue;
        const clean = { id: it.id.slice(0, 64), from: it.from.slice(0, 64), name: String(it.name || '?').slice(0, 24), body: it.body.slice(0, 2000), at: Number(it.at) || Date.now(), mentions: Array.isArray(it.mentions) ? it.mentions.slice(0, 20) : [] };
        if (it.kind === 'file' && it.file && typeof it.file === 'object') {
            const f = it.file;
            clean.kind = 'file';
            clean.file = { name: String(f.name || 'file').slice(0, 120), size: f.size, type: String(f.type || '').slice(0, 80) };
            if (typeof f.data === 'string' && f.data.startsWith('data:') && f.data.length <= MAX_FILE_DATA_CHARS) clean.file.data = f.data;
            else clean.file.expired = true;
        }
        hist.push(clean);
        have.add(clean.id);
        added++;
    }
    if (!added) return;
    hist.sort((a, b) => (a.at || 0) - (b.at || 0));
    saveHist(code, hist);
    if (code === activeCode) renderHistory();
}

function joinSpaceByCode(rawCode, pick) {
    const code = String(rawCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { alert('That code looks too short!'); uiSound('error'); return false; }
    if (isBanned(code)) {
        alert('You are banned from this Space! Ask the owner for /unban!');
        uiSound('error');
        return false;
    }
    if (!spaces.some(s => s.code === code)) {
        const base = { code, name: code, description: 'Resolving…', mine: false };
        // A picked network (or one from the invite link) wins, otherwise the directory tells us!
        if (pick && NETS[pick.net]) Object.assign(base, pick); else base.netAuto = true;
        spaces.push(base);
        saveSpaces();
    }
    closeModals();
    renderSpaces();
    openSpace(code);
    // Ask the network who lives here!
    mesh.subscribe(ROOT + '/dir/' + code);
    return true;
}

function invitePickFromUrl() {
    try {
        const net = new URLSearchParams(location.search).get('net');
        if (!NETS[net]) return {};
        if (net !== 'rabbitmq') return { net };
        const m = /rmq=([^&]+)/.exec(location.hash || '');
        const r = m ? JSON.parse(decodeURIComponent(escape(atob(m[1])))) : {};
        const url = typeof r.url === 'string' && /^wss?:\/\//i.test(r.url) ? r.url.slice(0, 300) : '';
        return { net, rmq: { url, user: String(r.user || '').slice(0, 120), pass: String(r.pass || '').slice(0, 200) } };
    } catch (e) { return {}; }
}

function consumePendingInvite() {
    const code = getInviteCodeFromUrl();
    if (!code) return;
    const pick = invitePickFromUrl();
    if (isBanned(code)) {
        alert('You are banned from this Space!');
        clearInviteCodeFromUrl();
        return;
    }
    if (joinSpaceByCode(code, pick)) clearInviteCodeFromUrl();
    else {
        try {
            document.getElementById('join-code').value = code;
            openJoinModal();
        } catch (e) {}
    }
}

function publishDir(code, name, description) {
    if (!mesh.connected || !me) return;
    mesh.publish(ROOT + '/dir/' + code, JSON.stringify(Object.assign({ name, description, at: Date.now(), owner: me.clientId, ownerName: me.name }, dirNet(code))), true);
}

// The directory says which network a Space uses (never a password)!
function dirNet(code) {
    const s = spaces.find(x => x.code === code);
    if (!s || !NETS[s.net]) return {};
    return s.net === 'rabbitmq' ? { net: s.net, rmq: { url: (s.rmq && s.rmq.url) || '' } } : { net: s.net };
}

// ---------- Chat ----------
function topicMsg(code) { return `${ROOT}/msg/${code}`; }
function topicDir(code) { return `${ROOT}/dir/${code}`; }
function topicPresence(code, id) { return `${ROOT}/presence/${code}/${id}`; }

function spaceMsgTopics() {
    return spaces.map(s => topicMsg(s.code));
}

function subscribeAllSpaceMsgs() {
    try {
        const topics = spaceMsgTopics();
        if (topics.length) mesh.subscribe(topics);
    } catch (e) {}
}

function openSpace(code) {
    if (isBanned(code)) {
        alert('You are banned from this Space!');
        uiSound('error');
        return;
    }
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
    invite.title = 'Copy invite link! Share it, friends click Join on the invite page!';
    invite.onclick = () => {
        const link = inviteUrl(code);
        try {
            if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
        } catch (e) {}
        invite.innerText = 'Copied!';
        setTimeout(() => { invite.innerText = 'Invite: ' + code; }, 1200);
    };
    renderHistory();
    subscribeAllSpaceMsgs();
    mesh.subscribe([topicDir(code), ROOT + '/presence/' + code + '/+']);
    { const c = calls.state(); if (c && c.code !== code) { calls.leave(true); phToast('You left the call in the other Space!'); } }
    calls.watch(code);
    renderCalls();
    heartbeat();
    // Blind joins show "Resolving…" until the retained directory lands!
    // The global nudger keeps re-asking while it stays unresolved!
    nudgeUnresolvedDir();
    watchResolving(code);
}

function leaveView(clearActive = true) {
    if (mesh.connected && activeCode && me) {
        try {
            mesh.publish(topicPresence(activeCode, me.clientId), JSON.stringify({ online: false }), true);
            mesh.unsubscribe([topicMsg(activeCode), topicDir(activeCode), ROOT + '/presence/' + activeCode + '/+']);
        } catch (e) {}
    }
    if (clearActive) {
        try { calls.leave(true); } catch (e) {}
        activeCode = null;
        renderSpaces();
        document.getElementById('empty-chat').style.display = 'block';
        document.getElementById('chat-view').style.display = 'none';
    }
}

function isUnresolved(code) {
    const s = spaces.find(x => x.code === code);
    return !!(s && !s.mine && s.name === s.code);
}

function updateMeta() {
    const online = [...members.values()].filter(m => m.online).length;
    const space = spaces.find(s => s.code === activeCode);
    const names = [...members.values()].filter(m => m.online).map(m => m.name).slice(0, 12).join(', ');
    const metaEl = document.getElementById('chat-meta');
    if (space && space.name === space.code && !space.mine) {
        const live = relaysConnected().length;
        const total = relays.length || BROKERS.length;
        if (!mesh.connected) {
            metaEl.innerText = 'Still resolving… No relays yet! Wi-Fi may block chat ports! Click to retry! · ' + online + ' online!';
        } else {
            metaEl.innerText = 'Still resolving… Waiting for host! (' + live + '/' + total + ' relays)! Click to retry! · ' + online + ' online!';
        }
        metaEl.style.cursor = 'pointer';
        metaEl.title = 'Retry resolving this Space!';
        metaEl.onclick = () => retryResolving();
    } else {
        metaEl.innerText =
            ((space && space.description) || 'No description!') + ` · ${online} online!`;
        metaEl.style.cursor = '';
        metaEl.title = '';
        metaEl.onclick = null;
    }
    const bar = document.getElementById('members-bar');
    if (names) {
        bar.style.display = 'flex';
        bar.innerHTML = ONLINE_SVG + '<span>' + esc(names) + '</span>';
        try { bar.title = 'My relays: ' + myRelayHosts().join(', ') + '!'; } catch (e) {}
    } else bar.style.display = 'none';
    try { if (isMentionMenuOpen()) refreshMentionMenu(); } catch (e) {}
    updateMembersPanel();
    updateNetChip();
}

// The people panel: who is online here, and who is in the call!
function updateMembersPanel() {
    const chat = document.getElementById('chat-view');
    if (!chat) return;
    let panel = document.getElementById('member-panel');
    if (!panel) {
        panel = document.createElement('aside');
        panel.id = 'member-panel';
        panel.className = 'member-panel';
        chat.appendChild(panel);
    }
    const inCall = new Set(activeCode ? calls.inCallHere(activeCode).map(p => p.id) : []);
    const c = calls.state();
    if (c && c.code === activeCode && me) inCall.add(me.clientId);
    const list = [...members.entries()].filter(([, m]) => m.online).map(([id, m]) => ({ id, name: m.name }));
    if (me && !list.some(x => x.id === me.clientId)) list.unshift({ id: me.clientId, name: me.name });
    list.sort((a, b) => (inCall.has(b.id) - inCall.has(a.id)) || String(a.name).localeCompare(String(b.name)));
    const html = '<div class="mp-head">Online — ' + list.length + '</div>' + list.map(x =>
        `<div class="mp-row${inCall.has(x.id) ? ' calling' : ''}"><span class="av" style="--h:${avatarHue(x.id)}">${esc((String(x.name || '?').trim().charAt(0) || '?').toUpperCase())}</span><span class="mp-name">${esc(x.name)}${me && x.id === me.clientId ? ' (you)' : ''}</span>${inCall.has(x.id) ? '<span class="mp-call" title="In the call">🔊</span>' : ''}</div>`).join('');
    if (panel._html !== html) { panel._html = html; panel.innerHTML = html; }
}

// Little pop-up notes!
function phToast(msg) {
    let t = document.getElementById('ph-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ph-toast'; t.className = 'ph-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(phToast.timer);
    phToast.timer = setTimeout(() => t.classList.remove('show'), 3200);
}

function histKey(code) { return 'phosphor_hist_' + code; }

function loadHist(code) {
    const h = storeGet(histKey(code), []);
    return Array.isArray(h) ? h : [];
}

function saveHist(code, list) {
    const trimmed = list.slice(-HIST_MAX);
    trimFilePayloads(trimmed);
    if (trySaveHist(code, trimmed)) return;
    // Storage quota hit (huge file payloads!): drop ALL file contents, retry!
    for (const m of trimmed) {
        if (m && m.kind === 'file' && m.file && m.file.data) {
            m.file = { name: m.file.name, size: m.file.size, type: m.file.type, expired: true };
        }
    }
    if (trySaveHist(code, trimmed)) return;
    // Still failing: keep last text messages only!
    trySaveHist(code, trimmed.filter(m => !(m && m.kind === 'file')).slice(-30));
}

function trySaveHist(code, list) {
    try {
        localStorage.setItem(histKey(code), JSON.stringify(list));
        return true;
    } catch (e) { return false; }
}

function trimFilePayloads(trimmed) {
    // File contents are heavy: keep only the newest few, older ones stay as stubs!
    let kept = 0;
    for (let i = trimmed.length - 1; i >= 0; i--) {
        const m = trimmed[i];
        if (m && m.kind === 'file' && m.file && m.file.data) {
            kept++;
            if (kept > KEPT_FILE_PAYLOADS) {
                m.file = { name: m.file.name, size: m.file.size, type: m.file.type, expired: true };
            }
        }
    }
}

function fmtSize(n) {
    n = Math.max(0, parseInt(n, 10) || 0);
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
}

function renderFileCard(m) {
    const f = effectiveFile(m);
    const card = document.createElement('div');
    card.className = 'file-card';
    const hasData = !!(f.data && !f.expired && typeof f.data === 'string' && f.data.startsWith('data:'));
    if (hasData && /^data:image\//.test(f.data)) {
        const thumb = document.createElement('img');
        thumb.className = 'file-thumb';
        thumb.src = f.data;
        thumb.alt = String(f.name || 'image');
        card.appendChild(thumb);
    }
    const info = document.createElement('div');
    info.className = 'file-info';
    const nm = document.createElement('div');
    nm.className = 'file-name';
    nm.textContent = String(f.name || 'file');
    info.appendChild(nm);
    const sz = document.createElement('div');
    sz.className = 'file-size';
    sz.textContent = fmtSize(f.size) + (f.type ? ' · ' + String(f.type).slice(0, 80) : '');
    info.appendChild(sz);
    card.appendChild(info);
    if (hasData) {
        const a = document.createElement('a');
        a.className = 'file-dl';
        a.href = f.data;
        a.download = String(f.name || 'download');
        a.textContent = 'Download!';
        a.title = 'Download ' + String(f.name || 'file') + '!';
        card.appendChild(a);
    } else {
        const exp = document.createElement('div');
        exp.className = 'file-expired';
        exp.textContent = 'No longer stored here — ask the sender to resend!';
        card.appendChild(exp);
    }
    return card;
}

function genMsgId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function shareFile(el) {
    const f = el && el.files && el.files[0];
    if (el) el.value = '';
    if (!f) return false;
    if (!me || !activeCode || !mesh.connected) {
        alert('Join a Space and wait for Live first!');
        uiSound('error');
        return false;
    }
    if (f.size > MAX_FILE_BYTES || f.size <= 0) {
        alert(f.size > MAX_FILE_BYTES ? 'That file is too big! Keep it under 8 MB!' : 'That file looks empty!');
        uiSound('error');
        return false;
    }
    const code = activeCode;
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (!dataUrl.startsWith('data:')) {
            alert('Could not package that file!');
            uiSound('error');
            return;
        }
        if (!me || activeCode !== code) {
            alert('You switched Spaces — pick the file again!');
            uiSound('error');
            return;
        }
        deliverFile({ name: String(f.name).slice(0, 120), type: String(f.type || '').slice(0, 80), size: f.size, dataUrl }, code);
    };
    reader.onerror = () => { alert('Could not read that file!'); uiSound('error'); };
    try {
        reader.readAsDataURL(f);
    } catch (e) {
        alert('Could not read that file!');
        uiSound('error');
    }
    return false;
}

function shareFolder(el) {
    const files = el && el.files ? [...el.files] : [];
    if (el) el.value = '';
    if (!files.length) return false;
    if (!me || !activeCode || !mesh.connected) {
        alert('Join a Space and wait for Live first!');
        uiSound('error');
        return false;
    }
    if (files.length > MAX_ZIP_FILES) {
        alert('That folder has too many files! Keep it under ' + MAX_ZIP_FILES + '!');
        uiSound('error');
        return false;
    }
    let total = 0;
    for (const f of files) total += f.size || 0;
    if (total > MAX_FILE_BYTES || total <= 0) {
        alert(total > MAX_FILE_BYTES ? 'That folder is too big! Keep it under 8 MB!' : 'That folder looks empty!');
        uiSound('error');
        return false;
    }
    const code = activeCode;
    uiSound('open');
    Promise.all(files.map(f => f.arrayBuffer().then(buf => ({ f, buf }))))
        .then(items => {
            if (!me || activeCode !== code) {
                alert('You switched Spaces — pick the folder again!');
                uiSound('error');
                return;
            }
            const entries = [];
            for (const { f, buf } of items) {
                const p = cleanZipPath(f.webkitRelativePath || f.name);
                if (!p) continue;
                entries.push({ path: p, data: new Uint8Array(buf), time: f.lastModified });
            }
            if (!entries.length) {
                alert('That folder is empty!');
                uiSound('error');
                return;
            }
            let zip;
            try {
                zip = buildStoredZip(entries);
            } catch (e) {
                alert('Could not zip that folder!');
                uiSound('error');
                return;
            }
            const root = String((files[0].webkitRelativePath || files[0].name || 'folder').split('/')[0] || 'folder').slice(0, 80);
            deliverFile({ name: root + '.zip', type: 'application/zip', size: zip.length, dataUrl: 'data:application/zip;base64,' + b64encodeBytes(zip) }, code);
        })
        .catch(() => { alert('Could not read that folder!'); uiSound('error'); });
    return false;
}

function singleFileLimit() {
    // Respect the TRAFFIC relay: EMQX drops packets over ~1 MB!
    try {
        const p = preferredRelay();
        if (!p) return 512 * 1024;
        if (/emqx\.io/i.test(p.url || '')) return 512 * 1024;
        return MAX_SINGLE_BYTES;
    } catch (e) { return 512 * 1024; }
}

function deliverFile(p, code) {
    if (!me || !mesh.connected || activeCode !== code) {
        alert('Join a Space and wait for Live first!');
        uiSound('error');
        return false;
    }
    if (p.size <= singleFileLimit() && p.dataUrl.length <= MAX_FILE_DATA_CHARS) {
        const msg = {
            v: 1,
            id: genMsgId(),
            from: me.clientId,
            name: me.name,
            body: '📎 ' + p.name + ' (' + fmtSize(p.size) + ')',
            kind: 'file',
            file: { name: p.name, size: p.size, type: p.type, data: p.dataUrl },
            at: Date.now(),
        };
        seenIds.add(msg.id);
        try {
            mesh.publish(topicMsg(code), JSON.stringify(msg), false);
        } catch (e) {
            alert('Send failed!');
            uiSound('error');
            return false;
        }
        if (code === activeCode) showMessage(msg, true);
        uiSound('send');
        const hist = loadHist(code);
        hist.push({ id: msg.id, from: msg.from, name: msg.name, body: msg.body, at: msg.at, kind: 'file', file: msg.file });
        saveHist(code, hist);
        return true;
    }
    return startChunkedTransfer(p, code);
}

// ---------- Chunked big-file transfers (progress + retries, all over MQTT!) ----------
const fileTransfers = new Map(); // msgId -> transfer (both directions)!
const transferByTid = new Map(); // transferId -> transfer!
const orphanChunks = new Map(); // transferId -> {at, map} chunks before file-start!
const sentChunkCache = new Map(); // transferId -> {chunks} kept briefly for retries!
const fileBlobs = new Map(); // msgId -> dataUrl of completed downloads!
let fileBlobBytes = 0;

function stashFileBlob(msgId, dataUrl) {
    try {
        if (fileBlobs.has(msgId)) {
            fileBlobBytes -= (fileBlobs.get(msgId) || '').length;
            fileBlobs.delete(msgId);
        }
        fileBlobs.set(msgId, dataUrl);
        fileBlobBytes += dataUrl.length;
        while (fileBlobBytes > MAX_BLOB_BYTES && fileBlobs.size > 1) {
            const oldest = fileBlobs.keys().next().value;
            if (oldest === msgId) break;
            fileBlobBytes -= (fileBlobs.get(oldest) || '').length;
            fileBlobs.delete(oldest);
        }
    } catch (e) {}
}

function pruneTransferMaps() {
    if (transferByTid.size <= 120) return;
    for (const [tid, t] of transferByTid) {
        if ((t.done || t.failed) && transferByTid.size > 120) transferByTid.delete(tid);
    }
}

function startChunkedTransfer(p, code) {
    const comma = p.dataUrl.indexOf(',');
    const raw = comma >= 0 ? p.dataUrl.slice(comma + 1) : '';
    if (!raw) {
        alert('Could not package that file!');
        uiSound('error');
        return false;
    }
    const chunks = [];
    for (let i = 0; i < raw.length; i += CHUNK_RAW) chunks.push(raw.slice(i, i + CHUNK_RAW));
    if (!chunks.length || chunks.length > 400) {
        alert('That file is too big! Keep it under 8 MB!');
        uiSound('error');
        return false;
    }
    const transferId = genMsgId();
    const msg = {
        v: 1,
        id: genMsgId(),
        from: me.clientId,
        name: me.name,
        body: '📎 ' + p.name + ' (' + fmtSize(p.size) + ') — streaming…',
        kind: 'file',
        mentions: [],
        file: { name: p.name, size: p.size, type: p.type, transferId, chunks: chunks.length, chunked: true },
        at: Date.now(),
    };
    const t = {
        msgId: msg.id, code, transferId, name: p.name, size: p.size, type: p.type,
        total: chunks.length, chunks, sent: 0, received: null, count: 0,
        isSender: true, fromId: me.clientId, done: false, failed: false,
        retries: 0, lastActivity: Date.now(), sendTimer: null, retryTimer: null, msg,
    };
    fileTransfers.set(msg.id, t);
    transferByTid.set(transferId, t);
    pruneTransferMaps();
    seenIds.add(msg.id);
    try {
        mesh.publish(topicMsg(code), JSON.stringify(msg), false);
    } catch (e) {
        fileTransfers.delete(msg.id);
        transferByTid.delete(transferId);
        alert('Send failed!');
        uiSound('error');
        return false;
    }
    if (code === activeCode) showMessage(msg, true);
    uiSound('send');
    const hist = loadHist(code);
    hist.push({ id: msg.id, from: msg.from, name: msg.name, body: msg.body, at: msg.at, mentions: [], kind: 'file', file: { name: p.name, size: p.size, type: p.type, transferId, chunks: chunks.length, chunked: true } });
    saveHist(code, hist);
    stashFileBlob(msg.id, p.dataUrl);
    pumpSendQueue(t);
    return true;
}

function pumpSendQueue(t) {
    if (t.sendTimer) return;
    t.sendTimer = setInterval(() => {
        try {
            if (!mesh.connected) return;
            if (!spaces.some(s => s.code === t.code)) {
                clearInterval(t.sendTimer);
                t.sendTimer = null;
                t.failed = true;
                refreshFileSlot(t.msgId);
                uiSound('error');
                return;
            }
            let n = 0;
            while (n < CHUNK_PER_TICK && t.sent < t.total) {
                const i = t.sent;
                mesh.publish(topicMsg(t.code), JSON.stringify({ v: 1, id: t.transferId + ':' + i, from: me.clientId, name: me.name, kind: 'file-chunk', chunk: { t: t.transferId, i, d: t.chunks[i] } }), false);
                t.sent++;
                n++;
            }
            t.lastActivity = Date.now();
            refreshFileSlot(t.msgId);
            if (t.sent >= t.total) {
                clearInterval(t.sendTimer);
                t.sendTimer = null;
                t.done = true;
                sentChunkCache.set(t.transferId, { chunks: t.chunks, at: Date.now() });
                if (sentChunkCache.size > 5) sentChunkCache.delete(sentChunkCache.keys().next().value);
                setTimeout(() => { sentChunkCache.delete(t.transferId); }, SEND_CACHE_MS);
                t.chunks = null;
                refreshFileSlot(t.msgId);
                uiSound('success');
            }
        } catch (e) {
            clearInterval(t.sendTimer);
            t.sendTimer = null;
            t.failed = true;
            refreshFileSlot(t.msgId);
            uiSound('error');
        }
    }, PUMP_MS);
}

function registerIncomingTransfer(code, m) {
    const f = m.file || {};
    if (fileTransfers.has(m.id)) return;
    const total = parseInt(f.chunks, 10) || 0;
    const size = Math.max(0, parseInt(f.size, 10) || 0);
    const tid = String(f.transferId || '');
    if (!tid || total < 1 || total > 400 || size > MAX_FILE_BYTES) {
        m.file = { name: f.name, size: f.size, type: f.type, expired: true };
        return;
    }
    const t = {
        msgId: m.id, code, transferId: tid, name: String(f.name || 'file').slice(0, 120),
        size, type: String(f.type || '').slice(0, 80), total,
        chunks: null, sent: 0, received: new Array(total).fill(null), count: 0,
        isSender: false, fromId: m.from, done: false, failed: false,
        retries: 0, lastActivity: Date.now(), sendTimer: null, retryTimer: null, msg: m,
    };
    fileTransfers.set(m.id, t);
    transferByTid.set(tid, t);
    pruneTransferMaps();
    const orph = orphanChunks.get(tid);
    if (orph) {
        try {
            for (const [i, d] of orph.map) {
                if (i >= 0 && i < total && typeof d === 'string' && !t.received[i]) {
                    t.received[i] = d;
                    t.count++;
                }
            }
        } catch (e) {}
        orphanChunks.delete(tid);
    }
    if (t.count >= t.total) completeTransfer(t);
    else scheduleRetryCheck(t);
}

function onFileChunk(code, m) {
    const c = (m.chunk && typeof m.chunk === 'object') ? m.chunk : null;
    if (!c || typeof c.d !== 'string') return;
    const tid = String(c.t || '').slice(0, 64);
    const idx = parseInt(c.i, 10);
    if (!tid || !(idx >= 0)) return;
    if (me && m.from === me.clientId) return;
    const t = transferByTid.get(tid);
    if (!t) {
        let o = orphanChunks.get(tid);
        if (!o) {
            if (orphanChunks.size > 20) orphanChunks.delete(orphanChunks.keys().next().value);
            o = { at: Date.now(), map: new Map() };
            orphanChunks.set(tid, o);
        }
        if (idx < 2000) o.map.set(idx, c.d);
        return;
    }
    if (t.done || t.failed || t.isSender || t.code !== code || m.from !== t.fromId) return;
    if (idx >= t.total || t.received[idx]) return;
    t.received[idx] = c.d;
    t.count++;
    t.lastActivity = Date.now();
    refreshFileSlot(t.msgId);
    if (t.count >= t.total) completeTransfer(t);
}

function onFileRetry(code, m) {
    const r = (m.retry && typeof m.retry === 'object') ? m.retry : null;
    if (!r) return;
    const cache = sentChunkCache.get(String(r.t || ''));
    if (!cache || !mesh.connected || !me) return;
    const missing = (Array.isArray(r.missing) ? r.missing : [])
        .filter(i => Number.isInteger(i) && i >= 0 && i < cache.chunks.length)
        .slice(0, 500);
    for (const i of missing) {
        try {
            mesh.publish(topicMsg(code), JSON.stringify({ v: 1, id: r.t + ':' + i, from: me.clientId, name: me.name, kind: 'file-chunk', chunk: { t: r.t, i, d: cache.chunks[i] } }), false);
        } catch (e) { break; }
    }
}

function scheduleRetryCheck(t) {
    try { clearTimeout(t.retryTimer); } catch (e) {}
    t.retryTimer = setTimeout(() => checkTransfer(t), RETRY_WAIT_MS);
}

function checkTransfer(t) {
    if (!t || t.done || t.failed) return;
    const missing = [];
    for (let i = 0; i < t.total; i++) if (!t.received[i]) missing.push(i);
    if (!missing.length) return;
    if (t.retries >= MAX_RETRIES) {
        t.failed = true;
        transferByTid.delete(t.transferId);
        refreshFileSlot(t.msgId);
        uiSound('error');
        return;
    }
    t.retries++;
    try {
        if (mesh.connected && me) {
            mesh.publish(topicMsg(t.code), JSON.stringify({ v: 1, id: 'r' + genMsgId(), from: me.clientId, name: me.name, kind: 'file-retry', retry: { t: t.transferId, missing: missing.slice(0, 500) } }), false);
        }
    } catch (e) {}
    scheduleRetryCheck(t);
}

function completeTransfer(t) {
    if (t.done) return;
    try {
        stashFileBlob(t.msgId, 'data:' + (t.type || 'application/octet-stream') + ';base64,' + t.received.join(''));
    } catch (e) {
        t.failed = true;
        refreshFileSlot(t.msgId);
        return;
    }
    t.done = true;
    t.received = null;
    t.lastActivity = Date.now();
    try { clearTimeout(t.retryTimer); } catch (e) {}
    transferByTid.delete(t.transferId);
    pruneTransferMaps();
    refreshFileSlot(t.msgId);
    uiSound('success');
}

function effectiveFile(m) {
    const base = (m && m.file) || {};
    try {
        if (m && m.id && fileBlobs.has(m.id)) {
            const d = fileBlobs.get(m.id);
            fileBlobs.delete(m.id);
            fileBlobs.set(m.id, d);
            return { name: base.name, size: base.size, type: base.type, data: d };
        }
    } catch (e) {}
    return base;
}

function buildFileContent(m) {
    const t = m && m.id && fileTransfers.get(m.id);
    if (t && !t.done && !t.failed) return buildFileProgress(t);
    if (t && t.failed) return buildFileProgress(t);
    return renderFileCard(m);
}

function buildFileProgress(t) {
    const card = document.createElement('div');
    card.className = 'file-card file-progress';
    const info = document.createElement('div');
    info.className = 'file-info';
    const nm = document.createElement('div');
    nm.className = 'file-name';
    nm.textContent = String(t.name || 'file');
    info.appendChild(nm);
    const pct = t.total > 0 ? Math.round(((t.isSender ? t.sent : t.count) / t.total) * 100) : 0;
    const label = document.createElement('div');
    label.className = 'file-progress-label';
    label.textContent = t.failed
        ? 'Transfer failed — ask the sender to resend!'
        : (t.isSender ? 'Sending… ' : 'Receiving… ') + pct + '%';
    info.appendChild(label);
    const track = document.createElement('div');
    track.className = 'file-progress-track';
    const fill = document.createElement('div');
    fill.className = 'file-progress-fill' + (t.failed ? ' failed' : '');
    fill.style.width = (t.failed ? 100 : pct) + '%';
    track.appendChild(fill);
    info.appendChild(track);
    card.appendChild(info);
    return card;
}

function refreshFileSlot(msgId) {
    try {
        const t = fileTransfers.get(msgId);
        if (!t || !t.msg) return;
        const box = document.getElementById('messages');
        if (!box) return;
        const slot = box.querySelector('[data-fslot="' + msgId + '"]');
        if (!slot) return;
        const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
        slot.replaceChildren(buildFileContent(t.msg));
        if (nearBottom) box.scrollTop = box.scrollHeight;
    } catch (e) {}
}

// ---------- Tiny stored (uncompressed) ZIP writer for folder uploads! ----------
const _zipCrcTable = (() => {
    const tab = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        tab[n] = c >>> 0;
    }
    return tab;
})();

function zipCrc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = _zipCrcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function cleanZipPath(p) {
    return String(p || '').split('/').filter(seg => seg && seg !== '.' && seg !== '..').join('/').slice(0, 500);
}

function b64encodeBytes(bytes) {
    let s = '';
    const STEP = 0x8000;
    for (let i = 0; i < bytes.length; i += STEP) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP));
    }
    return btoa(s);
}

function buildStoredZip(entries) {
    const enc = new TextEncoder();
    const w16 = v => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); return b; };
    const w32 = v => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); return b; };
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const e of entries) {
        const nameB = enc.encode(e.path);
        const data = e.data;
        const crc = zipCrc32(data);
        const d = new Date(e.time || Date.now());
        const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
        const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
        const lh = [w32(0x04034b50), w16(20), w16(0x0800), w16(0), w16(time), w16(date), w32(crc), w32(data.length), w32(data.length), w16(nameB.length), w16(0), nameB, data];
        const lhSize = lh.reduce((n, p) => n + p.length, 0);
        locals.push(...lh);
        centrals.push([w32(0x02014b50), w16(20), w16(20), w16(0x0800), w16(0), w16(time), w16(date), w32(crc), w32(data.length), w32(data.length), w16(nameB.length), w16(0), w16(0), w16(0), w16(0), w32(0), w32(offset), nameB]);
        offset += lhSize;
    }
    const centralParts = [];
    for (const parts of centrals) centralParts.push(...parts);
    const cdSize = centralParts.reduce((n, p) => n + p.length, 0);
    const end = [w32(0x06054b50), w16(0), w16(0), w16(centrals.length), w16(centrals.length), w32(cdSize), w32(offset), w16(0)];
    const all = [...locals, ...centralParts, ...end];
    const total = all.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of all) { out.set(p, o); o += p.length; }
    return out;
}

function renderHistory() {
    const box = document.getElementById('messages');
    box.innerHTML = '';
    for (const m of loadHist(activeCode)) box.appendChild(renderMessage(m));
    box.scrollTop = box.scrollHeight;
    box.onscroll = null;
    try { renumberMessages(); } catch (e) {}
}

// Number badges! Every history-backed bubble shows its position (top = 1),
// so /delete numbers match exactly what you see! Local-only notes stay blank!
function renumberMessages() {
    try {
        const box = document.getElementById('messages');
        if (!box) return;
        let n = 0;
        for (const el of box.children) {
            try {
                if (!el.dataset || !el.dataset.mid) continue;
                n++;
                let badge = null;
                try { badge = el.querySelector(':scope > .msg-num'); } catch (e) { badge = null; }
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'msg-num';
                    el.prepend(badge);
                }
                badge.textContent = '#' + n;
                badge.title = 'Message ' + n + '! Try /delete ' + n + '!';
            } catch (e) {}
        }
    } catch (e) {}
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

function avatarHue(s) { let x = 0; for (const ch of String(s || '')) x = (x * 31 + ch.charCodeAt(0)) % 360; return x; }

function renderMessage(m) {
    const div = document.createElement('div');
    try { if (m && m.id) div.dataset.mid = String(m.id); } catch (e) {}
    if (m.kind === 'sys') {
        div.className = 'msg sys';
        div.textContent = String(m.text || m.body || '');
        return div;
    }
    if (m.kind === 'warn') {
        div.className = 'msg warn';
        const head = document.createElement('div');
        head.className = 'warn-head';
        head.textContent = '⚠️ Warning from ' + (m.warnFrom || m.name) + ' — only you can see this!';
        const bodyEl = document.createElement('div');
        bodyEl.className = 'warn-body';
        bodyEl.innerHTML = highlightMentionsInHtml(kdBody(m.body), m);
        div.appendChild(head);
        div.appendChild(bodyEl);
        return div;
    }
    div.className = 'msg' + (me && m.from === me.clientId ? ' me' : '');
    if (isMentioned(m)) div.classList.add('mentions-me');
    div.innerHTML = `<span class="av" style="--h:${avatarHue(m.from || m.name)}">${esc((String(m.name || '?').trim().charAt(0) || '?').toUpperCase())}</span>`
        + `<span class="who">${esc(m.name)}</span>`
        + `<span class="when">${fmtTime(m.at)}</span>`;
    if (m.kind === 'file' && m.file) {
        div.appendChild(document.createElement('br'));
        const slot = document.createElement('div');
        slot.className = 'file-slot';
        try { slot.dataset.fslot = m.id || ''; } catch (e) {}
        slot.appendChild(buildFileContent(m));
        div.appendChild(slot);
    } else {
        div.innerHTML += `<br><span class="msg-body">${highlightMentionsInHtml(kdBody(m.body), m)}</span>`;
    }
    return div;
}

function showMessage(m, forceScroll) {
    const box = document.getElementById('messages');
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    box.appendChild(renderMessage(m));
    if (forceScroll || nearBottom) box.scrollTop = box.scrollHeight;
    try { renumberMessages(); } catch (e) {}
}

function onChatMessage(code, payload) {
    let m = null;
    try { m = JSON.parse(payload); } catch (e) { return; }
    if (!m || m.v !== 1 || !m.id || !m.from) return;
    if (m.kind === 'file-chunk') { onFileChunk(code, m); return; }
    if (m.kind === 'file-retry') { onFileRetry(code, m); return; }
    if (!m.body) return;
    if (seenIds.has(m.id)) return;
    seenIds.add(m.id);
    if (seenIds.size > 500) seenIds = new Set([...seenIds].slice(-300));
    if (m.kind === 'mod') { onModMessage(code, m); return; }
    m.body = String(m.body).slice(0, 2000);
    if (!Array.isArray(m.mentions)) m.mentions = [];
    if (m.kind === 'file') {
        const f = (m.file && typeof m.file === 'object') ? m.file : null;
        if (!f) return;
        if (f.chunked) {
            m.file = { name: String(f.name || 'file').slice(0, 120), size: f.size, type: String(f.type || '').slice(0, 80), transferId: String(f.transferId || '').slice(0, 64), chunks: parseInt(f.chunks, 10) || 0, chunked: true };
        } else if (typeof f.data !== 'string' || !f.data.startsWith('data:') || f.data.length > MAX_FILE_DATA_CHARS) {
            m.file = { name: String(f.name || 'file').slice(0, 120), size: f.size, type: String(f.type || '').slice(0, 80), expired: true };
        } else {
            m.file = { name: String(f.name || 'file').slice(0, 120), size: f.size, type: String(f.type || '').slice(0, 80), data: f.data };
        }
    }
    rememberUser(m.name, m.from);
    if (m.kind === 'file' && m.file && m.file.chunked && me && m.from !== me.clientId) registerIncomingTransfer(code, m);
    const mentioned = isMentioned(m);
    const viewing = (code === activeCode);
    const bannedHere = isBanned(code);
    if (viewing) {
        showMessage(m);
        if (!me || m.from !== me.clientId) uiSound(mentioned ? 'mention' : 'receive');
    } else if (mentioned && !bannedHere) {
        bumpMentionBadge(code);
        uiSound('mention');
    }
    const hist = loadHist(code);
    hist.push({ id: m.id, from: m.from, name: m.name, body: m.body, at: m.at, mentions: m.mentions.slice(0, 20), kind: m.kind, file: m.file });
    saveHist(code, hist);
}

function onDirMessage(code, payload) {
    let d = null;
    try { d = JSON.parse(payload); } catch (e) { return; }
    if (!d || !d.name) return;
    const s = spaces.find(x => x.code === code);
    // Blind joins (code only) learn the Space's network from the directory!
    if (s && !s.mine && s.netAuto && NETS[d.net]) {
        let rmq = null;
        if (d.net === 'rabbitmq') {
            const url = d.rmq && typeof d.rmq.url === 'string' ? d.rmq.url.slice(0, 300) : '';
            rmq = { url: /^wss?:\/\//i.test(url) ? url : '', user: '', pass: '' };
        }
        setSpaceNet(s, d.net, rmq);
    }
    if (s && !s.mine) {
        s.name = String(d.name).slice(0, 40);
        s.description = String(d.description || '').slice(0, 200);
        if (d.owner) {
            s.owner = String(d.owner).slice(0, 32);
            s.ownerName = String(d.ownerName || '').slice(0, 24);
        }
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
    const peerRelays = Array.isArray(p.relays) ? p.relays.map(r => String(r).slice(0, 40)).slice(0, 6) : [];
    if (me && clientId === me.clientId) {
        if (p.online === false) members.delete(clientId);
        else members.set(clientId, { name: String(p.name || '?').slice(0, 24), at: p.at || Date.now(), online: true, relays: peerRelays });
        updateMeta();
        return;
    }
    if (p.online === false) {
        if (members.has(clientId)) uiSound('leave');
        members.delete(clientId);
    } else {
        if (!members.has(clientId)) uiSound('join');
        members.set(clientId, { name: String(p.name || '?').slice(0, 24), at: p.at || Date.now(), online: true, relays: peerRelays });
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

function myRelayHosts() {
    try {
        const p = preferredRelay();
        return p ? [String(p.host).slice(0, 40)] : [];
    } catch (e) { return []; }
}

function heartbeat() {
    if (!mesh.connected || !activeCode || !me) return;
    mesh.publish(topicPresence(activeCode, me.clientId),
        JSON.stringify({ v: 1, id: genMsgId(), name: me.name, at: Date.now(), online: true, relays: myRelayHosts() }), true);
    try { flushOutbox(); } catch (e) {}
}

// Offline outbox! Messages typed with zero relays queue locally (persisted!)
// and flush in order on reconnect, so flaky Wi-Fi never eats a message!
const OUTBOX_MAX = 20;
function loadOutbox() {
    const o = storeGet('phosphor_outbox', {});
    return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
}
function saveOutbox(o) {
    storeSet('phosphor_outbox', o);
}
function outboxCount(code) {
    try {
        const o = loadOutbox();
        return (o && Array.isArray(o[code])) ? o[code].length : 0;
    } catch (e) { return 0; }
}
function queueMessage(code, body, mentions) {
    const o = loadOutbox();
    if (!Array.isArray(o[code])) o[code] = [];
    o[code].push({ body: String(body).slice(0, 2000), mentions: (mentions || []).slice(0, 20), at: Date.now() });
    while (o[code].length > OUTBOX_MAX) o[code].shift();
    saveOutbox(o);
}
function flushOutbox() {
    if (!me) return false;
    const o = loadOutbox();
    const codes = Object.keys(o);
    if (!codes.length) return false;
    let sent = 0;
    for (const code of codes) {
        const list = o[code];
        if (!Array.isArray(list) || !list.length) { delete o[code]; continue; }
        if (isBanned(code) || !spaces.some(s => s.code === code)) { delete o[code]; continue; }
        if (!spaceLive(code)) continue;
        while (list.length) {
            const entry = list[0];
            const msg = {
                v: 1,
                id: genMsgId(),
                from: me.clientId,
                name: me.name,
                body: String(entry.body).slice(0, 2000),
                mentions: Array.isArray(entry.mentions) ? entry.mentions.slice(0, 20) : [],
                at: Date.now(),
            };
            try {
                mesh.publish(topicMsg(code), JSON.stringify(msg), false);
            } catch (e) { break; }
            list.shift();
            seenIds.add(msg.id);
            if (code === activeCode) showMessage(msg, true);
            uiSound('send');
            try {
                const hist = loadHist(code);
                hist.push({ id: msg.id, from: msg.from, name: msg.name, body: msg.body, at: msg.at, mentions: msg.mentions });
                saveHist(code, hist);
            } catch (e) {}
            sent++;
        }
        if (!list.length) delete o[code];
    }
    saveOutbox(o);
    if (sent && activeCode) updateMeta();
    return sent > 0;
}

// ---------- Connection ----------
// Centralized relay with hot-standby backups! EVERYONE prefers BROKERS[0],
// so near + far devices meet on the same broker by default! The other relays
// stay connected in the background purely for instant failover: if central
// drops, traffic moves as one path and moves back when central returns!
// Duplicates still collapse via the idempotent handlers + seenIds!
function setConn(on, label) {
    const dot = document.getElementById('conn-dot');
    if (dot) {
        dot.classList.toggle('on', !!on);
        dot.style.cursor = 'pointer';
        dot.title = 'Connection! Click to retry!';
        dot.onclick = () => reconnectNow();
    }
    const lab = document.getElementById('conn-label');
    if (lab) {
        lab.innerText = label || (on ? 'Live!' : 'Connecting…');
        lab.style.cursor = 'pointer';
        lab.title = 'Click to reconnect!';
        lab.onclick = () => reconnectNow();
    }
}

function relayHost(url) {
    try { return new URL(url).hostname.replace(/^broker\./, ''); } catch (e) { return url; }
}

function relaysConnected() {
    return relays.filter(r => r.mqtt && r.mqtt.connected);
}

// Centralized traffic! ONE preferred relay (first connected in BROKERS
// order = central when reachable) carries everything, so all devices meet
// on the same broker! Other live relays are hot standby for instant failover!
function preferredRelay() {
    for (const url of BROKERS) {
        const e = relays.find(r => r.url === url);
        if (e && e.mqtt && e.mqtt.connected) return e;
    }
    return null;
}

// Hands Space-network topics to their own road, returns the shared-relay rest!
function splitRoutes(topics, op) {
    const rest = [];
    for (const t of (Array.isArray(topics) ? topics : [topics])) {
        const own = nets.route(t);
        if (own) own[op]([t]); else rest.push(t);
    }
    return rest;
}

// Can this Space send right now? (WebRTC Spaces always can: history syncs to whoever links later!)
function spaceLive(code) {
    const st = nets.status(code);
    if (!st.net) return mesh.connected;
    return st.net === 'webrtc' ? true : st.ok;
}

const mesh = {
    get connected() { return !!preferredRelay(); },
    get via() { const p = preferredRelay(); return p ? p.host : null; },
    publish(topic, payload, retain) {
        // EMQX, RabbitMQ and WebRTC Spaces take their own road!
        const own = nets.route(topic);
        if (own) { own.publish(topic, payload, retain); return; }
        const p = preferredRelay();
        if (!p) throw new Error('No relay!');
        p.mqtt.publish(topic, payload, retain);
    },
    subscribe(topics) {
        const list = splitRoutes(topics, 'subscribe');
        for (const t of list) wantedSubs.add(t);
        const p = preferredRelay();
        if (p) {
            try { p.mqtt.subscribe(list); } catch (e) {}
        }
    },
    unsubscribe(topics) {
        const list = splitRoutes(topics, 'unsubscribe');
        for (const t of list) wantedSubs.delete(t);
        const p = preferredRelay();
        if (p) {
            try { p.mqtt.unsubscribe(list); } catch (e) {}
        }
    },
};

// (Re)subscribe the single traffic path! Called whenever the preferred
// relay changes, so failover never leaves us deaf!
function syncSubscription() {
    const p = preferredRelay();
    if (!p || !wantedSubs.size) return;
    try { p.mqtt.subscribe([...wantedSubs]); } catch (e) {}
}

function meshRoute(topic, payload, fromEntry) {
    if (topic.startsWith(ROOT + '/p2p/')) { nets.onSignal(topic.slice((ROOT + '/p2p/').length), payload); return; }
    if (topic.startsWith(ROOT + '/rtc/')) { calls.onSignal(topic.slice((ROOT + '/rtc/').length), payload); return; }
    if (topic.startsWith(ROOT + '/msg/')) {
        onChatMessage(topic.slice((ROOT + '/msg/').length), payload);
        bridgePacket(topic, payload, fromEntry, false);
        return;
    }
    // Directory first, so background Spaces resolve even with nothing open!
    if (topic.startsWith(ROOT + '/dir/')) {
        onDirMessage(topic.slice((ROOT + '/dir/').length), payload);
        bridgePacket(topic, payload, fromEntry, true);
        return;
    }
    // Presence from any Space gets bridged (member lists track chat!),
    // but only the open Space feeds the members bar!
    if (topic.startsWith(ROOT + '/presence/')) {
        bridgePacket(topic, payload, fromEntry, true);
    }
    if (!activeCode) return;
    if (topic === topicDir(activeCode)) onDirMessage(activeCode, payload);
    else if (topic.startsWith(ROOT + '/presence/' + activeCode + '/')) {
        onPresenceMessage(topic.split('/').pop(), payload);
    }
}

// One-hop bridge across relays (legacy mesh mode)! Disabled while CENTRALIZED:
// single-path traffic means nobody listens on the other relays, so bridging
// would only burn data! Kept for fallback if multi-path ever returns!
let bridgedIds = new Set();
let bridgedDirAt = {}; // code -> last bridged time (dirs carry no id)!
function bridgePacket(topic, payload, fromEntry, retain) {
    try {
        if (CENTRALIZED) return;
        if (relaysConnected().length < 2) return;
        let m = null;
        try { m = JSON.parse(payload); } catch (e) { return; }
        if (!m || typeof m !== 'object' || m.b) return;
        // Heavy streaming chunks stay on their home relay! Chunked file
        // headers would strand receivers (chunks never follow), so skip those!
        if (m.kind === 'file-chunk' || m.kind === 'file-retry') return;
        if (m.file && m.file.chunked) return;
        const isDir = topic.startsWith(ROOT + '/dir/');
        if (isDir) {
            const code = topic.slice((ROOT + '/dir/').length);
            const now = Date.now();
            if (bridgedDirAt[code] && now - bridgedDirAt[code] < 5000) return;
            bridgedDirAt[code] = now;
            if (!m.name) return;
        } else {
            if (!m.id || m.v !== 1) return;
            if (bridgedIds.has(m.id)) return;
            bridgedIds.add(m.id);
            if (bridgedIds.size > 1000) bridgedIds = new Set([...bridgedIds].slice(-600));
        }
        m.b = 1;
        const out = JSON.stringify(m);
        for (const r of relaysConnected()) {
            if (fromEntry && r === fromEntry) continue;
            try { r.mqtt.publish(topic, out, !!retain); } catch (e) {}
        }
    } catch (e) {}
}

let lastPreferredUrl = null;
function refreshConn() {
    const p = preferredRelay();
    const live = relaysConnected();
    if (p) {
        const central = p.url === BROKERS[0];
        setConn(true, 'Live! via ' + p.host + (central ? ' (central)!' : ' (backup)!'));
        try {
            const lab = document.getElementById('conn-label');
            if (lab) lab.title = 'Relay: ' + p.host + (central ? ' (central meeting point)!' : ' (backup — central unreachable)!') + ' Click to reconnect!';
            const dot = document.getElementById('conn-dot');
            if (dot) dot.title = 'Connected via ' + p.host + '! Click to reconnect!';
        } catch (e) {}
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setConn(false, 'Offline! Check Wi-Fi!');
    } else {
        setConn(false, meshWon ? 'Retrying… Tap to retry!' : 'Connecting…');
    }
    // Preferred relay changed? Move the single traffic path with it!
    const cur = p ? p.url : null;
    if (cur !== lastPreferredUrl) {
        const was = lastPreferredUrl;
        lastPreferredUrl = cur;
        if (was && cur) {
            try {
                const old = relays.find(r => r.url === was);
                if (old && old.mqtt && old.mqtt.connected) old.mqtt.unsubscribe([...wantedSubs]);
            } catch (e) {}
        }
        if (p) {
            try { syncSubscription(); } catch (e) {}
            try { publishAllMyDirs(); } catch (e) {}
            try { heartbeat(); } catch (e) {}
            try { flushOutbox(); } catch (e) {}
            if (activeCode && was && cur && was !== cur) {
                const central = BROKERS[0];
                if (was === central && cur !== central) showLocalNotice('Central relay lost! On backup — far-away users may not see you until it returns!');
                else if (was !== central && cur === central) showLocalNotice('Back on the central relay! Everyone can reach you again!');
            }
        }
    }
    try { if (activeCode) updateMeta(); } catch (e) {}
}

function publishAllMyDirs() {
    if (!me) return;
    for (const s of spaces) {
        if (!s || !s.mine || !s.name || s.name === s.code) continue;
        try {
            mesh.publish(ROOT + '/dir/' + s.code, JSON.stringify(Object.assign({ name: s.name, description: s.description || '', at: Date.now(), owner: me.clientId, ownerName: me.name }, dirNet(s.code))), true);
        } catch (e) {}
    }
    gossipKnownDirs();
}

let gossipAt = 0;
function gossipKnownDirs() {
    // Gossip: re-share resolved Space cards so newcomers on a different
    // relay can resolve even when the owner is offline!
    if (!me || !mesh.connected) return;
    const now = Date.now();
    if (now - gossipAt < 30000) return;
    gossipAt = now;
    for (const s of spaces) {
        if (!s || !s.name || s.name === s.code) continue;
        try {
            const payload = Object.assign({ name: s.name, description: s.description || '', at: Date.now() }, dirNet(s.code));
            if (s.owner) {
                payload.owner = String(s.owner).slice(0, 32);
                payload.ownerName = String(s.ownerName || '').slice(0, 24);
            } else if (s.mine) {
                payload.owner = me.clientId;
                payload.ownerName = me.name;
            } else continue;
            mesh.publish(ROOT + '/dir/' + s.code, JSON.stringify(payload), true);
        } catch (e) {}
    }
}

function nudgeUnresolvedDir() {
    try {
        if (!me || !activeCode) return;
        const s = spaces.find(x => x.code === activeCode);
        if (!s || s.name !== s.code) return;
        if (mesh.connected) mesh.subscribe(topicDir(activeCode));
        gossipKnownDirs();
        if (activeCode) updateMeta();
    } catch (e) {}
}

let resolveTimer = null;
function watchResolving(code) {
    try { clearTimeout(resolveTimer); } catch (e) {}
    resolveTimer = setTimeout(() => {
        try {
            if (activeCode !== code || !isUnresolved(code)) return;
            if (!mesh.connected) {
                showLocalNotice('Still resolving… No relays connected! This Wi-Fi may block chat ports (only 443 gets through)! Waiting + retrying automatically — click the status above to retry now!');
            } else {
                const live = relaysConnected().length;
                const total = relays.length || BROKERS.length;
                showLocalNotice('Still resolving… Connected (' + live + '/' + total + ' relays) but no host card yet! Wrong code, or owner offline on a different relay! Retrying automatically — click the status above to retry now!');
                mesh.subscribe(topicDir(code));
            }
            uiSound('error');
        } catch (e) {}
    }, 8000);
}

function retryResolving() {
    try {
        uiSound('click');
        if (!activeCode) return false;
        refreshConn();
        nudgeUnresolvedDir();
        heartbeat();
        showLocalNotice('Retrying… Re-asking all live relays for this Space!');
        watchResolving(activeCode);
    } catch (e) {}
    return false;
}

function relayBackoffMs(entry) {
    const fails = Math.max(0, entry.failCount || 0);
    const base = Math.min(30000, 2500 * Math.pow(2, Math.min(fails, 4)));
    return Math.round(base + Math.random() * 1000);
}

function scheduleRelayRetry(entry) {
    try { clearTimeout(entry.retryTimer); } catch (e) {}
    if (!me) return;
    entry.failCount = (entry.failCount || 0) + 1;
    const wait = relayBackoffMs(entry);
    entry.nextRetryAt = Date.now() + wait;
    entry.retryTimer = setTimeout(() => { if (me) dialRelay(entry); }, wait);
    refreshConn();
}

function reconnectNow() {
    try {
        uiSound('click');
        if (!me) return false;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            showLocalNotice('You look offline! Check Wi-Fi, then click to retry!');
            return false;
        }
        let redialed = 0;
        for (const entry of relays) {
            const live = entry.mqtt && entry.mqtt.connected;
            if (!live) {
                try { clearTimeout(entry.retryTimer); } catch (e) {}
                entry.failCount = 0;
                dialRelay(entry);
                redialed++;
            }
        }
        refreshConn();
        try { nudgeUnresolvedDir(); } catch (e) {}
        try { heartbeat(); } catch (e) {}
        try { flushOutbox(); } catch (e) {}
        if (activeCode) showLocalNotice(redialed ? 'Reconnecting ' + redialed + ' relay(s)! Hang tight!' : 'Already live! Re-asking for updates!');
        else if (redialed) showLocalNotice('Reconnecting ' + redialed + ' relay(s)! Hang tight!');
    } catch (e) {}
    return false;
}

let netListenersWired = false;
function wireNetListeners() {
    if (netListenersWired) return;
    netListenersWired = true;
    try {
        window.addEventListener('online', () => {
            try {
                showLocalNotice('Back online! Reconnecting!');
                reconnectNow();
            } catch (e) {}
        });
        window.addEventListener('offline', () => {
            try {
                setConn(false, 'Offline! Check Wi-Fi!');
                if (activeCode) showLocalNotice('You went offline! Messages queue until Wi-Fi returns!');
            } catch (e) {}
        });
        document.addEventListener('visibilitychange', () => {
            try {
                if (document.visibilityState !== 'visible' || !me) return;
                heartbeat();
                nudgeUnresolvedDir();
                let dead = 0;
                for (const entry of relays) {
                    if (!(entry.mqtt && entry.mqtt.connected)) dead++;
                }
                if (dead) reconnectNow();
                else refreshConn();
            } catch (e) {}
        });
    } catch (e) {}
}

function dialRelay(entry) {
    try { clearTimeout(entry.retryTimer); } catch (e) {}
    if (!me) return;
    try { if (entry.mqtt) entry.mqtt.close(); } catch (e) {}
    entry.mqtt = null;
    let clientId = 'ph_x';
    try { clientId = me.clientId + '_' + Date.now().toString(36); } catch (e) {}
    let m = null;
    try {
        m = new MiniMqtt(entry.url, { clientId, keepalive: 60 });
    } catch (e) {
        scheduleRelayRetry(entry);
        return;
    }
    entry.mqtt = m;
    let done = false;
    const failTimer = setTimeout(() => {
        if (done) return;
        done = true;
        try { m.close(); } catch (e) {}
        if (entry.mqtt === m) entry.mqtt = null;
        scheduleRelayRetry(entry);
        refreshConn();
    }, 7000);
    m.onopen = () => {
        if (done || entry.mqtt !== m || !me) return;
        done = true;
        clearTimeout(failTimer);
        entry.failCount = 0;
        entry.nextRetryAt = 0;
        const first = !meshWon;
        meshWon = true;
        if (!activeBrokerUrl) { try { activeBrokerUrl = entry.url; } catch (e) {} }
        m.onmessage = (t, p) => meshRoute(t, p, entry);
        m.onclose = () => {
            if (entry.mqtt !== m) return;
            entry.mqtt = null;
            refreshConn();
            scheduleRelayRetry(entry);
        };
        m.onerror = () => {};
        try {
            const subs = [...wantedSubs];
            if (subs.length) m.subscribe(subs);
        } catch (e) {}
        publishAllMyDirs();
        try { nets.sync(spaces); nets.rehello(); } catch (e) {}
        if (first) uiSound('connect');
        refreshConn();
        renderSpaces();
        try { nudgeUnresolvedDir(); } catch (e) {}
        heartbeat();
        try { flushOutbox(); } catch (e) {}
    };
    m.onclose = () => {
        if (done || entry.mqtt !== m) return;
        done = true;
        clearTimeout(failTimer);
        entry.mqtt = null;
        refreshConn();
        scheduleRelayRetry(entry);
    };
    m.onerror = () => {
        // Blocked ports fire error before close: fail fast, don't wait out the timer!
        if (done || entry.mqtt !== m || (m.connected)) return;
        done = true;
        try { clearTimeout(failTimer); } catch (e) {}
        try { m.close(); } catch (e) {}
        entry.mqtt = null;
        scheduleRelayRetry(entry);
        refreshConn();
    };
    try {
        m.connect();
    } catch (e) {
        if (!done) { done = true; clearTimeout(failTimer); }
        if (entry.mqtt === m) entry.mqtt = null;
        scheduleRelayRetry(entry);
        refreshConn();
    }
}

function connect() {
    if (!me) return;
    closeMqtt();
    wireNetListeners();
    meshWon = false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setConn(false, 'Offline! Check Wi-Fi!');
    } else {
        setConn(false, 'Connecting…');
    }
    relays = BROKERS.map(url => ({ url, host: relayHost(url), mqtt: null, retryTimer: null, failCount: 0, nextRetryAt: 0 }));
    // Stagger dials so one slow relay can't hog the burst + first win lands fast!
    relays.forEach((entry, i) => {
        if (i === 0) dialRelay(entry);
        else setTimeout(() => { if (me && relays.includes(entry) && !(entry.mqtt && entry.mqtt.connected)) dialRelay(entry); }, i * 400);
    });
    refreshConn();
    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
    clearInterval(sweepTimer);
    sweepTimer = setInterval(sweepPresence, 10000);
    clearInterval(dirNudgeTimer);
    dirNudgeTimer = setInterval(nudgeUnresolvedDir, 5000);
}

function closeMqtt() {
    for (const entry of relays) {
        try { clearTimeout(entry.retryTimer); } catch (e) {}
        try { if (entry.mqtt) entry.mqtt.close(); } catch (e) {}
        entry.mqtt = null;
    }
    relays = [];
    clearInterval(heartbeatTimer);
    clearInterval(sweepTimer);
    clearInterval(dirNudgeTimer);
}

function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('send-input');
    const body = input.value.trim();
    if (!body) return false;
    if (isBanned(activeCode)) {
        alert('You are banned from this Space!');
        uiSound('error');
        return false;
    }
    if (body.startsWith('/')) {
        handleSlashCommand(body);
        return false;
    }
    // Mention flow: picking from the @ menu never sends, it stages a chip!
    if (isMentionMenuOpen()) { pickMention(mentionMenuIndex); return false; }
    const unstaged = findUnstagedMentionMatch(body);
    if (unstaged) {
        stageMention(unstaged.name, unstaged.id);
        closeMentionMenu();
        uiSound('click');
        return false;
    }
    if (!activeCode || !spaceLive(activeCode)) {
        if (!activeCode) return false;
        // Offline? Queue it instead of dropping it! Flushes on reconnect!
        const mentions = buildMentionsForSend(body);
        queueMessage(activeCode, body, mentions);
        try { reconnectNow(); } catch (e) {}
        showLocalNotice('Offline! Queued — sends automatically when live! (' + outboxCount(activeCode) + ' queued!)');
        uiSound('click');
        input.value = '';
        resetMentionComposer();
        updateKdTypingIcon();
        return false;
    }
    try { flushOutbox(); } catch (e) {}
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
    mesh.publish(topicMsg(activeCode), JSON.stringify(msg), false);
    showMessage(msg, true);
    uiSound('send');
    const hist = loadHist(activeCode);
    hist.push({ id: msg.id, from: msg.from, name: msg.name, body: msg.body, at: msg.at, mentions: msg.mentions, kind: msg.kind, file: msg.file });
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
    initFilter();
    loadBans();
    wireNetPickers();
    try { consumePendingInvite(); } catch (e) {}
    if (!enterApp.callsMounted) { enterApp.callsMounted = true; renderCalls = mountCallUI(calls, { me: () => me, activeCode: () => activeCode, esc }); }
}

// ---------- Calls (WebRTC voice, video and screen sharing) ----------
let renderCalls = () => {};
const calls = createCalls({
    root: ROOT,
    publish: (t, p) => mesh.publish(t, p, false),
    subscribe: (t) => mesh.subscribe(t),
    unsubscribe: (t) => mesh.unsubscribe(t),
    me: () => me,
    activeCode: () => activeCode,
    spaceName: (c) => (spaces.find(s => s.code === c) || { name: c }).name,
    toast: (m) => phToast(m),
    sound: (n) => uiSound(n),
    onChange: () => { try { renderCalls(); updateMembersPanel(); } catch (e) {} },
});

// ---------- Space networks ----------
let netChangeQueued = false;
const nets = createNets({
    root: ROOT,
    me: () => me,
    spaceOf: (c) => spaces.find(s => s.code === c),
    deliver: (t, p) => meshRoute(t, p, null),
    // Signaling for WebRTC Spaces rides the shared relay (p2p topics never route elsewhere)!
    sig: { publish: (t, p) => mesh.publish(t, p, false), subscribe: (t) => mesh.subscribe(t), unsubscribe: (t) => mesh.unsubscribe(t) },
    history: (c) => loadHist(c),
    onSync: (c, items) => mergeSyncedHistory(c, items),
    toast: (m) => phToast(m),
    onChange: () => {
        if (netChangeQueued) return;
        netChangeQueued = true;
        setTimeout(() => { netChangeQueued = false; try { updateNetChip(); flushOutbox(); } catch (e) {} }, 120);
    },
});

// Inline handlers (the page uses onclick)!
Object.assign(window, {
    enterName, switchName, openSpaceModal, openJoinModal, closeModals,
    createSpace, joinSpace, joinSpaceByCode, editSpaceNet, inviteUrl, getInviteCodeFromUrl, retryResolving, reconnectNow, sendMessage, shareFile, shareFolder, askLeaveSpace, leaveSpace, toggleTheme,
    toggleMentionBadges, pickMention, unstageMention, openFilterModal, clearKnownUsers,
});

// ---------- Boot ----------
initTheme();
initMentions();
initFilter();
loadBans();
if (loadIdentity()) {
    enterApp();
} else {
    document.getElementById('auth-view').style.display = 'flex';
}
wireKdTypingIcon();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireKdTypingIcon);
}
