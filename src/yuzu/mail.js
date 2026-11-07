// Yuzu Mail! Real email through Google (Gmail) or Microsoft (Outlook.com, Hotmail, Microsoft 365).
// You sign in with your own account in a pop-up window from Google or Microsoft: Yuzu never sees your password.
// Mail is fetched and sent straight from your browser to Gmail's or Microsoft Graph's own servers (nothing goes through Radii Office),
// and the sign-in token lives only in this browser tab (sessionStorage), so closing the tab signs you out of the mail connection.
// window.YuzuMail = { clientId, setClientIds, configured, hasSession, connect, disconnect, list, setRead, setStar, trash, untrash, remove, send, fromKeydown }
(function () {
    'use strict';

    /* ---------- sign-in settings: an OAuth "client ID" per provider (public, not a secret), from config.js or pasted in Yuzu ---------- */
    const CFG_KEY = 'yuzu_client_ids';
    function ids() {
        let o = {};
        try { o = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { o = {}; }
        const d = window.YUZU_CONFIG || {};
        return { google: String(o.google || d.google || '').trim(), microsoft: String(o.microsoft || d.microsoft || '').trim(), api: String(o.api || d.api || '').trim().replace(/\/+$/, '') };
    }
    const clientId = (p) => ids()[p === 'yuzu' ? 'api' : p] || '';
    function setClientIds(g, m, api) { try { localStorage.setItem(CFG_KEY, JSON.stringify({ google: String(g || '').trim(), microsoft: String(m || '').trim(), api: String(api || '').trim().replace(/\/+$/, '') })); } catch (e) {} }

    /* ---------- the token, kept for this browser tab only ---------- */
    const SESSION_KEY = 'yuzu_session';
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { session = null; }
    function setSession(s) { session = s; try { if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }
    const hasSession = (provider) => !!session && (!provider || session.provider === provider) && (session.expires > Date.now() + 30000 || !!session.refresh);
    class Expired extends Error {}
    async function token() {
        if (!session) throw new Expired('Sign in first!');
        if (session.expires > Date.now() + 60000) return session.token;
        if (session.provider === 'microsoft' && session.refresh) { await msRefresh(); return session.token; }
        setSession(null);
        throw new Expired('Your sign-in ran out, so please sign in again!');
    }
    const expired = () => { setSession(null); return new Expired('Your sign-in ran out, so please sign in again!'); };

    /* ---------- little helpers ---------- */
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const utf8b64 = (s) => btoa(unescape(encodeURIComponent(s)));
    const b64url = (s) => utf8b64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const wrap76 = (s) => s.replace(/(.{76})/g, '$1\r\n');
    function fromB64url(s) {
        s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        const bin = atob(s), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    }
    const htmlToText = (h) => String(h || '').replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n').replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
    const iso = (d, fallback) => { const t = new Date(d); return isNaN(t) ? new Date(fallback || Date.now()).toISOString() : t.toISOString(); };

    /* ---------- what you write (Keydown) becomes a plain-text part and a simple HTML part, so every mail app shows it ---------- */
    function stripKeydown(s) {
        return String(s)
            // Rim chips (!!#R#text#, !!=R#text#, !!^R#text# and the rest of the family) come first, before the highlight rule can see their #R#
            .replace(/!![#^~=+%:;\-?\/][A-Z]{1,2}#([^#\n]*?)#/g, '$1')
            .replace(/&&([^&\n]+)&&/g, '$1')
            .replace(/(^|[^\w&])&(?=[^\s&])([^\s&](?:[^&\n]*[^\s&])?)&(?![\w&])/g, '$1$2')
            .replace(/#[A-Z]{1,3}(?:\.[a-z]+)?\(([^)\n]*)\)/g, '$1')
            .replace(/=\+?[A-Z]{1,3}\+?=([\s\S]*?)=\+?[A-Z]{1,3}\+?=/g, '$1')
            .replace(/\+\+[A-Z]{1,3}[+=*^:!~%?]([\s\S]*?)\+\+/g, '$1')
            .replace(/#[A-Z]{1,3}#([\s\S]*?)(?:##|#_|#~|#=|#\]|#-|#)/g, '$1');
    }
    function inlineHtml(t) {
        let h = esc(t);
        // math ($x^2$) has no email-safe form, so it shows as its LaTeX in a code span, kept away from the bold and italic rules below
        const keep = [];
        h = h.replace(/(^|[^\w$])\$(?=\S)([^$\n]*?\S)\$(?![\w$])/g, (m, pre, tex) => { keep.push('<code>' + tex + '</code>'); return pre + '\u0001' + (keep.length - 1) + '\u0001'; });
        h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
        h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1">$1</a>');
        return h.replace(/\u0001(\d+)\u0001/g, (m, n) => keep[+n]);
    }
    function fromKeydown(kd) {
        const lines = stripKeydown(String(kd || '').replace(/\r/g, '')).split('\n');
        const text = [], html = [];
        let list = false, quote = [];
        const endList = () => { if (list) { html.push('</ul>'); list = false; } };
        const endQuote = () => { if (quote.length) { html.push('<blockquote style="margin:0 0 0 4px;padding-left:10px;border-left:3px solid #c8dcff;color:#44557a">' + quote.join('<br>') + '</blockquote>'); quote = []; } };
        lines.forEach((l) => {
            let m;
            // styled quotes (!> ?> >> %> ...) go out as plain quotes
            l = l.replace(/^(!>|\?>|>>|%>|\*>|\+>|->|=>|~>|\$>|#>|\^>|@>|&>)\s+/, '> ');
            if ((m = /^>\s?(.*)$/.exec(l))) { endList(); quote.push(inlineHtml(m[1])); text.push('> ' + m[1]); return; }
            endQuote();
            if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { endList(); html.push('<h' + (m[1].length + 1) + ' style="margin:.6em 0 .3em">' + inlineHtml(m[2]) + '</h' + (m[1].length + 1) + '>'); text.push(m[2]); return; }
            if ((m = /^\*\s+(.*)$/.exec(l)) || (m = /^-\s+(.*)$/.exec(l))) { if (!list) { html.push('<ul>'); list = true; } html.push('<li>' + inlineHtml(m[1]) + '</li>'); text.push('- ' + m[1].replace(/\*\*/g, '')); return; }
            endList();
            // ::divider{style|Title} and ::pagebreak become a rule (with the title in the middle), a leading | is an indent step
            if ((m = /^::(divider|pagebreak)(?:\{([^}]*)\})?\s*$/.exec(l.trim()))) {
                const title = m[1] === 'divider' ? String(m[2] || '').split('|')[1] || '' : '';
                html.push(title.trim()
                    ? '<div style="text-align:center;color:#44557a;margin:8px 0;border-top:1px solid #c8dcff;line-height:0"><span style="background:#fff;padding:0 10px;line-height:1">' + esc(title.trim()) + '</span></div>'
                    : '<hr style="border:0;border-top:1px solid #c8dcff;margin:10px 0">');
                text.push(title.trim() ? '--- ' + title.trim() + ' ---' : '----------');
                return;
            }
            if ((m = /^(\|+)\s*(.*)$/.exec(l))) {
                const n = Math.min(8, m[1].length);
                html.push('<div>' + '&nbsp;'.repeat(n * 4) + inlineHtml(m[2]) + '</div>');
                text.push('    '.repeat(n) + m[2]);
                return;
            }
            html.push(l.trim() ? '<div>' + inlineHtml(l) + '</div>' : '<div><br></div>');
            text.push(l.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2').replace(/`([^`]+)`/g, '$1'));
        });
        endList(); endQuote();
        return { text: text.join('\n'), html: '<div style="font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif">' + html.join('') + '</div>' };
    }
    function parseAddr(s) {
        s = String(s || '').trim();
        const m = /^(.*?)\s*<([^>]+)>$/.exec(s);
        return m ? { name: m[1].replace(/^"|"$/g, '').trim(), email: m[2].trim() } : { name: '', email: s };
    }
    const addrList = (s) => String(s || '').split(/[,;]/).map(parseAddr).filter((a) => a.email);
    const hdrAddr = (a) => (a.name ? '"' + a.name.replace(/"/g, '') + '" <' + a.email + '>' : a.email);
    const hdrText = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + utf8b64(s) + '?=');
    function buildMime(o) {
        const b = 'yuzu_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        const head = ['From: ' + hdrAddr(o.from), 'To: ' + o.to.map(hdrAddr).join(', '), 'Subject: ' + hdrText(o.subject), 'Date: ' + new Date().toUTCString(), 'MIME-Version: 1.0'];
        if (o.inReplyTo) { head.push('In-Reply-To: ' + o.inReplyTo, 'References: ' + o.inReplyTo); }
        head.push('Content-Type: multipart/alternative; boundary="' + b + '"');
        const part = (type, body) => '--' + b + '\r\nContent-Type: ' + type + '; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n' + wrap76(utf8b64(body)) + '\r\n';
        return head.join('\r\n') + '\r\n\r\n' + part('text/plain', o.text) + part('text/html', o.html) + '--' + b + '--\r\n';
    }

    /* ==================================================================
       GOOGLE (Gmail API, Google Identity Services)
       ================================================================== */
    const GSCOPE = 'openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send';
    function loadGsi() {
        return new Promise((ok, bad) => {
            if (window.google && google.accounts && google.accounts.oauth2) { ok(); return; }
            const s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
            s.onload = () => ok();
            s.onerror = () => bad(new Error('Google sign-in could not load! Check your internet connection!'));
            document.head.appendChild(s);
        });
    }
    async function googleConnect() {
        await loadGsi();
        await new Promise((ok, bad) => {
            const tc = google.accounts.oauth2.initTokenClient({
                client_id: clientId('google'), scope: GSCOPE,
                callback: (r) => {
                    if (r.error) { bad(new Error(r.error_description || r.error)); return; }
                    if (!/gmail\.modify/.test(r.scope || '') || !/gmail\.send/.test(r.scope || '')) { bad(new Error('Yuzu needs permission to read and send mail, so please allow both when Google asks!')); return; }
                    setSession({ provider: 'google', token: r.access_token, expires: Date.now() + (+r.expires_in || 3600) * 1000 });
                    ok();
                },
                error_callback: (e) => bad(new Error(e && e.type === 'popup_closed' ? 'The sign-in window was closed!' : (e && (e.message || e.type)) || 'Google sign-in failed!')),
            });
            tc.requestAccessToken({ prompt: 'select_account' });
        });
        const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + (await token()) } });
        if (!r.ok) throw new Error('Google would not say who you are (' + r.status + ')!');
        const u = await r.json();
        return { provider: 'google', email: u.email, name: u.name || u.email };
    }
    const GAPI = 'https://gmail.googleapis.com/gmail/v1/users/me';
    async function gfetch(path, opt) {
        const t = await token();
        const r = await fetch(GAPI + path, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, (opt && opt.headers) || {}) }));
        if (r.status === 401) throw expired();
        if (!r.ok) { let m = ''; try { m = (await r.json()).error.message; } catch (e) {} throw new Error(m || 'Gmail answered ' + r.status + '!'); }
        return r.status === 204 ? null : r.json();
    }
    function gBody(payload) {
        let plain = '', html = '';
        (function walk(p) {
            if (!p) return;
            const data = p.body && p.body.data;
            if (data && /^text\/plain/i.test(p.mimeType || '') && !plain) plain = fromB64url(data);
            else if (data && /^text\/html/i.test(p.mimeType || '') && !html) html = fromB64url(data);
            (p.parts || []).forEach(walk);
        })(payload);
        return (plain || htmlToText(html)).replace(/\r/g, '');
    }
    function gMessage(m, asFolder) {
        const h = {};
        ((m.payload && m.payload.headers) || []).forEach((x) => { h[x.name.toLowerCase()] = x.value; });
        const L = m.labelIds || [];
        return {
            id: m.id, remote: true, provider: 'google', threadId: m.threadId, msgId: h['message-id'] || '',
            folder: L.includes('TRASH') ? 'trash' : L.includes('SENT') ? 'sent' : L.includes('DRAFT') ? 'drafts' : asFolder === 'starred' ? 'inbox' : asFolder,
            from: h.from || '', to: h.to || '', subject: h.subject || '', date: iso(h.date, +m.internalDate), read: !L.includes('UNREAD'), starred: L.includes('STARRED'),
            body: gBody(m.payload) || m.snippet || '',
        };
    }
    const GLABEL = { inbox: 'INBOX', starred: 'STARRED', sent: 'SENT', trash: 'TRASH' };
    async function googleList(folder) {
        const q = '?maxResults=30&labelIds=' + GLABEL[folder] + (folder === 'trash' ? '&includeSpamTrash=true' : '');
        const res = await gfetch('/messages' + q);
        const full = await Promise.all((res.messages || []).map((x) => gfetch('/messages/' + x.id + '?format=full').catch(() => null)));
        return full.filter(Boolean).map((m) => gMessage(m, folder));
    }
    const gModify = (m, add, remove) => gfetch('/messages/' + m.id + '/modify', { method: 'POST', body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }) });

    /* ==================================================================
       MICROSOFT (Microsoft Graph, OAuth code + PKCE in a pop-up)
       ================================================================== */
    const MAUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0';
    const MSCOPE = 'openid profile email offline_access User.Read Mail.ReadWrite Mail.Send';
    const redirectUri = () => new URL('auth.html', document.baseURI).href;
    const rnd = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (x) => ('0' + x.toString(16)).slice(-2)).join(''); };
    async function challenge(v) {
        const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
        return btoa(String.fromCharCode.apply(null, new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    async function msToken(params) {
        const r = await fetch(MAUTH + '/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(Object.assign({ client_id: clientId('microsoft'), scope: MSCOPE }, params)).toString() });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.access_token) throw new Error(j.error_description ? j.error_description.split('\r')[0] : 'Microsoft sign-in failed (' + r.status + ')!');
        setSession({ provider: 'microsoft', token: j.access_token, expires: Date.now() + (+j.expires_in || 3600) * 1000, refresh: j.refresh_token || (session && session.refresh) || '' });
    }
    async function msRefresh() {
        try { await msToken({ grant_type: 'refresh_token', refresh_token: session.refresh }); }
        catch (e) { setSession(null); throw new Expired('Your sign-in ran out, so please sign in again!'); }
    }
    async function microsoftConnect() {
        const verifier = rnd(32), state = rnd(8);
        const url = MAUTH + '/authorize?' + new URLSearchParams({ client_id: clientId('microsoft'), response_type: 'code', redirect_uri: redirectUri(), response_mode: 'query', scope: MSCOPE, state, code_challenge: await challenge(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
        const w = window.open(url, 'yuzu-sign-in', 'width=520,height=700');
        if (!w) throw new Error('Your browser blocked the sign-in window! Allow pop-ups for this page and try again!');
        const code = await new Promise((ok, bad) => {
            const done = () => { window.removeEventListener('message', on); clearInterval(poll); };
            const on = (e) => {
                if (e.origin !== location.origin || !e.data || e.data.type !== 'yuzu-auth') return;
                done();
                if (e.data.state !== state) { bad(new Error('That sign-in did not match, so please try again!')); return; }
                if (e.data.error) { bad(new Error(e.data.error_description || e.data.error)); return; }
                ok(e.data.code);
            };
            const poll = setInterval(() => { if (w.closed) { done(); bad(new Error('The sign-in window was closed!')); } }, 600);
            window.addEventListener('message', on);
        });
        await msToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier });
        const me = await mfetch('/me?$select=displayName,mail,userPrincipalName');
        return { provider: 'microsoft', email: me.mail || me.userPrincipalName, name: me.displayName || me.mail || me.userPrincipalName };
    }
    const MAPI = 'https://graph.microsoft.com/v1.0';
    async function mfetch(path, opt) {
        const t = await token();
        const r = await fetch(MAPI + path, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', Prefer: 'outlook.body-content-type="text"' }, (opt && opt.headers) || {}) }));
        if (r.status === 401) throw expired();
        if (!r.ok) { let m = ''; try { m = (await r.json()).error.message; } catch (e) {} throw new Error(m || 'Microsoft answered ' + r.status + '!'); }
        return r.status === 204 || r.status === 202 ? null : r.json();
    }
    const mAddr = (x) => (x && x.emailAddress ? (x.emailAddress.name ? x.emailAddress.name + ' <' + x.emailAddress.address + '>' : x.emailAddress.address) : '');
    const MFOLDER = { inbox: 'inbox', sent: 'sentitems', trash: 'deleteditems' };
    function mMessage(m, folder) {
        return {
            id: m.id, remote: true, provider: 'microsoft', threadId: m.conversationId, msgId: m.internetMessageId || '',
            folder: folder === 'starred' ? 'inbox' : folder, from: mAddr(m.from), to: (m.toRecipients || []).map(mAddr).join(', '), subject: m.subject || '', date: iso(m.receivedDateTime || m.sentDateTime),
            read: m.isRead !== false, starred: !!(m.flag && m.flag.flagStatus === 'flagged'),
            body: (m.body && m.body.contentType === 'html' ? htmlToText(m.body.content) : (m.body && m.body.content) || m.bodyPreview || '').replace(/\r/g, ''),
        };
    }
    const MSELECT = '$select=id,subject,from,toRecipients,receivedDateTime,sentDateTime,isRead,flag,body,bodyPreview,conversationId,internetMessageId';
    async function microsoftList(folder) {
        const url = folder === 'starred' ? "/me/messages?$filter=flag/flagStatus eq 'flagged'&$top=30&" + MSELECT : '/me/mailFolders/' + MFOLDER[folder] + '/messages?$top=30&$orderby=' + (folder === 'sent' ? 'sentDateTime' : 'receivedDateTime') + ' desc&' + MSELECT;
        const res = await mfetch(url.replace(/ /g, '%20'));
        return (res.value || []).map((m) => mMessage(m, folder));
    }

    /* ==================================================================
       the one set of calls Yuzu uses, for either provider
       ================================================================== */
    /* ---------- a Yuzu address (name@radii-office.com): Radii Office's own mail server, signed in with a name and password ---------- */
    async function yfetch(path, opt, noAuth) {
        const api = clientId('yuzu');
        if (!api) throw new Error('The Yuzu mail server is not set up yet!');
        const headers = Object.assign({ 'Content-Type': 'application/json' }, noAuth ? {} : { Authorization: 'Bearer ' + (await token()) });
        let r;
        try { r = await fetch(api + path, Object.assign({}, opt, { headers })); } catch (e) { throw new Error('Could not reach the Yuzu mail server, so check your connection!'); }
        let j = null;
        try { j = await r.json(); } catch (e) { j = null; }
        if (r.status === 401 && !noAuth) throw expired();
        if (!r.ok) throw new Error((j && j.error) || 'The Yuzu mail server said no (' + r.status + ')!');
        return j;
    }
    async function yuzuConnect(c) {
        c = c || {};
        const j = await yfetch(c.create ? '/api/signup' : '/api/login', { method: 'POST', body: JSON.stringify({ username: c.username, password: c.password, name: c.name }) }, true);
        setSession({ provider: 'yuzu', token: j.token, expires: j.expires });
        return { provider: 'yuzu', email: j.email, name: j.name || j.email };
    }
    async function yuzuList(folder) {
        const j = await yfetch('/api/messages?folder=' + encodeURIComponent(folder));
        return (j.messages || []).map((m) => Object.assign({}, m, { remote: true, provider: 'yuzu', threadId: '' }));
    }
    const yPatch = (m, body) => yfetch('/api/messages/' + m.id, { method: 'PATCH', body: JSON.stringify(body) });
    const yuzuAvailable = (u) => yfetch('/api/available?u=' + encodeURIComponent(u), null, true);

    const P = {
        yuzu: {
            connect: yuzuConnect, list: yuzuList,
            setRead: (m, v) => yPatch(m, { read: !!v }), setStar: (m, v) => yPatch(m, { starred: !!v }),
            trash: (m) => yPatch(m, { folder: 'trash' }), untrash: (m) => yPatch(m, { folder: 'restore' }),
            remove: (m) => yfetch('/api/messages/' + m.id, { method: 'DELETE' }),
            send: (o) => yfetch('/api/send', { method: 'POST', body: JSON.stringify({ to: o.to, subject: o.subject, text: o.text, html: o.html }) }),
        },
        google: {
            connect: googleConnect, list: googleList,
            setRead: (m, v) => (v ? gModify(m, [], ['UNREAD']) : gModify(m, ['UNREAD'], [])),
            setStar: (m, v) => (v ? gModify(m, ['STARRED'], []) : gModify(m, [], ['STARRED'])),
            trash: (m) => gfetch('/messages/' + m.id + '/trash', { method: 'POST' }),
            untrash: (m) => gfetch('/messages/' + m.id + '/untrash', { method: 'POST' }),
            remove: (m) => gfetch('/messages/' + m.id, { method: 'DELETE' }),
            send: (o) => gfetch('/messages/send', { method: 'POST', body: JSON.stringify(Object.assign({ raw: b64url(buildMime(o)) }, o.threadId ? { threadId: o.threadId } : {})) }),
        },
        microsoft: {
            connect: microsoftConnect, list: microsoftList,
            setRead: (m, v) => mfetch('/me/messages/' + m.id, { method: 'PATCH', body: JSON.stringify({ isRead: !!v }) }),
            setStar: (m, v) => mfetch('/me/messages/' + m.id, { method: 'PATCH', body: JSON.stringify({ flag: { flagStatus: v ? 'flagged' : 'notFlagged' } }) }),
            trash: (m) => mfetch('/me/messages/' + m.id + '/move', { method: 'POST', body: JSON.stringify({ destinationId: 'deleteditems' }) }),
            untrash: (m) => mfetch('/me/messages/' + m.id + '/move', { method: 'POST', body: JSON.stringify({ destinationId: 'inbox' }) }),
            remove: (m) => mfetch('/me/messages/' + m.id, { method: 'DELETE' }),
            send: (o) => mfetch('/me/sendMail', { method: 'POST', body: JSON.stringify({ message: { subject: o.subject, body: { contentType: 'HTML', content: o.html }, toRecipients: o.to.map((a) => ({ emailAddress: { address: a.email, name: a.name || undefined } })) }, saveToSentItems: true }) }),
        },
    };
    const need = (p) => { if (!P[p]) throw new Error('Unknown mail account type!'); return P[p]; };

    window.YuzuMail = {
        clientId, setClientIds, configured: (p) => !!clientId(p), hasSession, ids,
        redirectUri, origin: () => location.origin,
        async connect(p, creds) { const a = await need(p).connect(creds); return a; }, yuzuAvailable,
        disconnect() {
            const s = session;
            setSession(null);
            try { if (s && s.provider === 'google' && window.google && google.accounts && google.accounts.oauth2) google.accounts.oauth2.revoke(s.token, () => {}); } catch (e) {}
        },
        list: (p, f) => need(p).list(f), setRead: (p, m, v) => need(p).setRead(m, v), setStar: (p, m, v) => need(p).setStar(m, v),
        trash: (p, m) => need(p).trash(m), untrash: (p, m) => need(p).untrash(m), remove: (p, m) => need(p).remove(m),
        send: (p, o) => need(p).send(o),
        fromKeydown, parseAddr, addrList, Expired, htmlToText,
    };
})();
