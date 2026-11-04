// Yuzu Mail server! One Cloudflare Worker that
//   1. receives mail sent to anything@radii-office.com (Cloudflare Email Routing hands it to email() below),
//   2. keeps each Yuzu address's messages in a D1 database, and
//   3. answers Yuzu's requests: create an address, sign in, list, read, star, trash, send.
// Mail between two Yuzu addresses is delivered straight into the other inbox; mail to anyone else goes out through Cloudflare Email Sending.
// Secrets: SECRET (a long random string that signs the sign-in tokens): npx wrangler secret put SECRET
import PostalMime from 'postal-mime';

const MAX_BODY = 200000;         // characters kept per message
const MAX_RAW = 5 * 1024 * 1024; // bytes accepted per incoming message
const DAILY_SENDS = 50;
const TOKEN_DAYS = 7;
const RESERVED = new Set(['admin', 'administrator', 'postmaster', 'abuse', 'hostmaster', 'webmaster', 'root', 'support', 'security', 'noreply', 'no-reply', 'mailer-daemon', 'info', 'contact', 'help', 'team', 'staff', 'yuzu', 'radii', 'office', 'billing', 'privacy', 'legal', 'www', 'ftp', 'mail', 'email']);
const enc = new TextEncoder();

/* ---------- small helpers ---------- */
const b64 = (buf) => { let s = ''; new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b))); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64u = (s) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return s; };
const newId = () => crypto.randomUUID().replace(/-/g, '');
const clean = (s, n) => String(s == null ? '' : s).replace(/\u0000/g, '').slice(0, n);
const htmlToText = (h) => String(h || '').replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
const addrOf = (x) => (x && x.address ? (x.name ? x.name.replace(/[<>"]/g, '') + ' <' + x.address + '>' : x.address) : '');
const bareEmail = (s) => { const m = /<([^>]+)>\s*$/.exec(String(s)); return (m ? m[1] : String(s)).trim().toLowerCase(); };

function corsHeaders(req, env) {
    const origin = req.headers.get('Origin') || '';
    const ok = String(env.ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
    const allowed = ok.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    return { 'Access-Control-Allow-Origin': allowed ? origin : ok[0] || '', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (data, status, cors) => new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors) });
class Problem extends Error { constructor(msg, status) { super(msg); this.status = status || 400; } }

/* ---------- passwords and sign-in tokens ---------- */
async function hashPassword(password, saltB64) {
    const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
    return { salt: b64(salt), hash: b64(bits) };
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function hmacKey(env) { if (!env.SECRET || env.SECRET.length < 16) throw new Problem('The mail server is not finished being set up (it needs its SECRET)!', 500); return crypto.subtle.importKey('raw', enc.encode(env.SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function makeToken(env, username) {
    const payload = b64u(btoa(JSON.stringify({ u: username, exp: Date.now() + TOKEN_DAYS * 864e5 })));
    const sig = b64u(b64(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload))));
    return { token: payload + '.' + sig, expires: Date.now() + TOKEN_DAYS * 864e5 };
}
async function whoIs(req, env) {
    const m = /^Bearer (.+)$/.exec(req.headers.get('Authorization') || '');
    if (!m) throw new Problem('Sign in first!', 401);
    const [payload, sig] = m[1].split('.');
    if (!payload || !sig) throw new Problem('Sign in again!', 401);
    let ok = false, p = null;
    try { ok = await crypto.subtle.verify('HMAC', await hmacKey(env), unb64(unb64u(sig)), enc.encode(payload)); p = JSON.parse(atob(unb64u(payload))); } catch (e) { if (e instanceof Problem) throw e; ok = false; }
    if (!ok || !p || !p.u || p.exp < Date.now()) throw new Problem('Your sign-in ran out, so please sign in again!', 401);
    const acct = await env.DB.prepare('SELECT username, name FROM accounts WHERE username = ?').bind(p.u).first();
    if (!acct) throw new Problem('That address no longer exists!', 401);
    return acct;
}
const addressOf = (env, u) => u + '@' + env.DOMAIN;

/* ---------- accounts ---------- */
function checkUsername(u) {
    u = String(u || '').trim().toLowerCase();
    if (u.length < 3 || u.length > 30) throw new Problem('Pick a name with 3 to 30 characters!');
    if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(u) || /[._-]{2}/.test(u)) throw new Problem('Use letters, numbers, dots, dashes and underscores, starting and ending with a letter or number, with no two symbols in a row!');
    if (RESERVED.has(u) || /^(admin|postmaster|abuse|root|support|noreply)/.test(u)) throw new Problem('That name is kept for the team, so please pick another!');
    return u;
}
async function signup(req, env, body) {
    const u = checkUsername(body.username);
    const pw = String(body.password || '');
    if (pw.length < 8) throw new Problem('Use a password with at least 8 characters!');
    if (pw.length > 200) throw new Problem('That password is too long!');
    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    const day = Date.now() - 864e5;
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM signups WHERE ip = ? AND ts > ?').bind(ip, day).first();
    if (n && n.n >= 5) throw new Problem('That is plenty of new addresses for today, so please try again tomorrow!', 429);
    if (await env.DB.prepare('SELECT 1 AS x FROM accounts WHERE username = ?').bind(u).first()) throw new Problem('That address is already taken, so please pick another!', 409);
    const h = await hashPassword(pw);
    const name = clean(body.name, 60).replace(/[<>"\r\n]/g, '').trim() || u;
    await env.DB.batch([
        env.DB.prepare('INSERT INTO accounts (username, name, salt, hash, created) VALUES (?, ?, ?, ?, ?)').bind(u, name, h.salt, h.hash, Date.now()),
        env.DB.prepare('INSERT INTO signups (ip, ts) VALUES (?, ?)').bind(ip, Date.now()),
        env.DB.prepare("DELETE FROM signups WHERE ts < ?").bind(day - 864e5),
        env.DB.prepare("INSERT INTO messages (id, username, folder, from_addr, to_addr, subject, body, date, is_read, starred) VALUES (?, ?, 'inbox', ?, ?, ?, ?, ?, 0, 0)")
            .bind(newId(), u, 'Yuzu <welcome@' + env.DOMAIN + '>', addressOf(env, u), 'Welcome to Yuzu!', 'Your new address is ' + addressOf(env, u) + '!\n\nWrite messages with Keydown (**bold**, #R(color ink)...) and Yuzu sends them as formatted email. Anyone can write to you at this address, and messages to other Yuzu addresses arrive instantly.', Date.now()),
    ]);
    return Object.assign({ email: addressOf(env, u), name }, await makeToken(env, u));
}
async function login(env, body) {
    const u = String(body.username || '').trim().toLowerCase().replace(new RegExp('@' + env.DOMAIN.replace(/\./g, '\\.') + '$'), '');
    const row = await env.DB.prepare('SELECT * FROM accounts WHERE username = ?').bind(u).first();
    const bad = new Problem('That address or password is not right!', 401);
    if (!row) { await hashPassword('x'.repeat(8)); throw bad; } // same wait either way
    if (row.locked_until > Date.now()) throw new Problem('Too many wrong tries, so please wait a few minutes and try again!', 429);
    const h = await hashPassword(String(body.password || ''), row.salt);
    if (!same(h.hash, row.hash)) {
        const fails = row.fails + 1;
        await env.DB.prepare('UPDATE accounts SET fails = ?, locked_until = ? WHERE username = ?').bind(fails >= 8 ? 0 : fails, fails >= 8 ? Date.now() + 15 * 60000 : 0, u).run();
        throw bad;
    }
    if (row.fails) await env.DB.prepare('UPDATE accounts SET fails = 0 WHERE username = ?').bind(u).run();
    return Object.assign({ email: addressOf(env, u), name: row.name }, await makeToken(env, u));
}

/* ---------- messages ---------- */
const view = (r) => ({ id: r.id, folder: r.folder, from: r.from_addr, to: r.to_addr, subject: r.subject, body: r.body, date: new Date(r.date).toISOString(), read: !!r.is_read, starred: !!r.starred, msgId: r.msgid || '' });
async function list(env, acct, folder) {
    const sel = 'SELECT * FROM messages WHERE username = ? AND ';
    const q = folder === 'starred' ? env.DB.prepare(sel + "starred = 1 AND folder != 'trash' ORDER BY date DESC LIMIT 100").bind(acct.username)
        : env.DB.prepare(sel + 'folder = ? ORDER BY date DESC LIMIT 100').bind(acct.username, ['inbox', 'sent', 'trash'].includes(folder) ? folder : 'inbox');
    return (await q.all()).results.map(view);
}
async function change(env, acct, id, body) {
    const row = await env.DB.prepare('SELECT * FROM messages WHERE id = ? AND username = ?').bind(id, acct.username).first();
    if (!row) throw new Problem('That message is gone!', 404);
    const sets = [], vals = [];
    if (typeof body.read === 'boolean') { sets.push('is_read = ?'); vals.push(body.read ? 1 : 0); }
    if (typeof body.starred === 'boolean') { sets.push('starred = ?'); vals.push(body.starred ? 1 : 0); }
    if (body.folder === 'trash' && row.folder !== 'trash') { sets.push("folder = 'trash'", 'prev = ?'); vals.push(row.folder); }
    if (body.folder === 'restore' && row.folder === 'trash') { sets.push('folder = ?', 'prev = NULL'); vals.push(row.prev || 'inbox'); }
    if (sets.length) await env.DB.prepare('UPDATE messages SET ' + sets.join(', ') + ' WHERE id = ?').bind(...vals, id).run();
}
const store = (env, m) => env.DB.prepare('INSERT INTO messages (id, username, folder, from_addr, to_addr, subject, body, date, is_read, starred, msgid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)')
    .bind(newId(), m.username, m.folder, clean(m.from, 300), clean(m.to, 1000), clean(m.subject || '(No subject)', 300), clean(m.body, MAX_BODY), Date.now(), m.read ? 1 : 0, clean(m.msgid, 300) || null);

async function send(env, acct, body) {
    const list = (Array.isArray(body.to) ? body.to : []).map((a) => ({ email: String((a && a.email) || '').trim().toLowerCase(), name: clean(a && a.name, 80).replace(/[<>"\r\n]/g, '') }));
    if (!list.length) throw new Problem('Add someone to send it to first!');
    if (list.length > 20) throw new Problem('That is too many people for one message (the limit is 20)!');
    const bad = list.find((a) => !/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(a.email) || a.email.length > 200);
    if (bad) throw new Problem('"' + bad.email + '" does not look like an email address!');
    const subject = clean(body.subject, 300).replace(/[\r\n]+/g, ' ').trim() || '(No subject)';
    const text = clean(body.text, MAX_BODY), html = clean(body.html, MAX_BODY * 2);
    const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE username = ? AND folder = 'sent' AND date > ?").bind(acct.username, Date.now() - 864e5).first();
    if (used && used.n >= DAILY_SENDS) throw new Problem('That is the limit of ' + DAILY_SENDS + ' messages in a day, so please try again tomorrow!', 429);
    const from = addressOf(env, acct.username), fromFull = acct.name + ' <' + from + '>';
    const dom = '@' + env.DOMAIN;
    const inside = list.filter((a) => a.email.endsWith(dom)), outside = list.filter((a) => !a.email.endsWith(dom));
    const writes = [];
    for (const a of inside) {
        const u = a.email.slice(0, -dom.length);
        if (await env.DB.prepare('SELECT 1 AS x FROM accounts WHERE username = ?').bind(u).first()) writes.push(store(env, { username: u, folder: 'inbox', from: fromFull, to: list.map((x) => x.email).join(', '), subject, body: text }));
        else throw new Problem('Nobody has ' + a.email + ' yet!');
    }
    if (outside.length) {
        if (!env.EMAIL) throw new Problem('Sending to addresses outside ' + env.DOMAIN + ' is not turned on yet!', 501);
        try {
            await env.EMAIL.send({ from: { email: from, name: acct.name }, to: outside.map((a) => (a.name ? { email: a.email, name: a.name } : a.email)), subject, text: text || htmlToText(html), html: html || undefined, replyTo: from });
        } catch (e) { throw new Problem('That could not be sent: ' + clean(e && e.message, 200), 502); }
    }
    writes.push(store(env, { username: acct.username, folder: 'sent', from: fromFull, to: list.map((a) => (a.name ? a.name + ' <' + a.email + '>' : a.email)).join(', '), subject, body: text, read: true }));
    await env.DB.batch(writes);
    return { ok: true };
}

/* ---------- the web API ---------- */
async function handle(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '') || '/', method = req.method;
    let body = {};
    if (method === 'POST' || method === 'PATCH') { try { body = await req.json(); } catch (e) { throw new Problem('That request was not understood!'); } }
    if (path === '/api/available' && method === 'GET') {
        let u; try { u = checkUsername(url.searchParams.get('u')); } catch (e) { return { available: false, reason: e.message }; }
        const taken = await env.DB.prepare('SELECT 1 AS x FROM accounts WHERE username = ?').bind(u).first();
        return { available: !taken, email: addressOf(env, u), reason: taken ? 'That address is already taken!' : '' };
    }
    if (path === '/api/signup' && method === 'POST') return signup(req, env, body);
    if (path === '/api/login' && method === 'POST') return login(env, body);
    const acct = await whoIs(req, env);
    if (path === '/api/me' && method === 'GET') return { email: addressOf(env, acct.username), name: acct.name };
    if (path === '/api/messages' && method === 'GET') return { messages: await list(env, acct, url.searchParams.get('folder') || 'inbox') };
    if (path === '/api/send' && method === 'POST') return send(env, acct, body);
    const m = /^\/api\/messages\/([a-f0-9]{32})$/.exec(path);
    if (m && method === 'PATCH') { await change(env, acct, m[1], body); return { ok: true }; }
    if (m && method === 'DELETE') { await env.DB.prepare('DELETE FROM messages WHERE id = ? AND username = ?').bind(m[1], acct.username).run(); return { ok: true }; }
    throw new Problem('Not found!', 404);
}

export default {
    async fetch(req, env) {
        const cors = corsHeaders(req, env);
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        try { return json(await handle(req, env), 200, cors); }
        catch (e) { return json({ error: e instanceof Problem ? e.message : 'Something went wrong on the mail server!' }, e instanceof Problem ? e.status : 500, cors); }
    },

    // mail arriving for anything@radii-office.com (Cloudflare Email Routing: a catch-all rule that sends to this Worker)
    async email(message, env) {
        const to = String(message.to || '').toLowerCase();
        const at = to.lastIndexOf('@');
        const user = to.slice(0, at), dom = to.slice(at + 1);
        if (dom !== env.DOMAIN) { message.setReject('This is not one of our addresses'); return; }
        const row = await env.DB.prepare('SELECT 1 AS x FROM accounts WHERE username = ?').bind(user).first();
        if (!row) { message.setReject('There is no Yuzu address like that'); return; }
        if (message.rawSize > MAX_RAW) { message.setReject('That message is too big'); return; }
        const parsed = await PostalMime.parse(await new Response(message.raw).arrayBuffer());
        const text = parsed.text || htmlToText(parsed.html) || '';
        await store(env, { username: user, folder: 'inbox', from: addrOf(parsed.from) || message.from, to: (parsed.to || []).map(addrOf).join(', ') || to, subject: parsed.subject, body: text, msgid: parsed.messageId }).run();
    },
};
