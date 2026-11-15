/* =====================================================================
   Overshare link! Open a file shared through Overshare (overshare.radii-office.com) in its own app, and it updates live:
   when anyone changes the file, you see it here, and when you change it, they see it there!
   The link looks like  https://radii-office.com/taskra/?file=os_abc123#overshare=<file id>.<key>&n=<your name>
   It plugs a "shared file" into the app's own "keep a file on this computer" code (RadiiCollab.disk, radii-collab.js),
   so every app that can save and open its own file format (.kd, .tk, .zr ...) works the same way!
   One identical copy at the site root, loaded by each app after radii-collab.js!
   ===================================================================== */
(function () {
    'use strict';
    var m = /[#&]overshare=([a-z0-9]+)\.([a-z0-9]+)/i.exec(location.hash);
    if (!m) return;
    var slug = m[1], key = m[2];
    var nm = /[#&]n=([^&]*)/.exec(location.hash);
    var om = /[#&]o=([^&]*)/.exec(location.hash);
    var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var API = local && om ? decodeURIComponent(om[1]) : 'https://overshare.radii-office.com';
    var NAME_KEY = 'overshare_name';
    var name = '';
    try { name = (nm ? decodeURIComponent(nm[1]) : '') || localStorage.getItem(NAME_KEY) || ''; } catch (e) { name = nm ? decodeURIComponent(nm[1]) : ''; }
    name = name.replace(/[^\w .'-]/g, '').slice(0, 24);
    var cid = Math.random().toString(36).slice(2, 12).padEnd(10, 'x');
    var norm = function (s) { return String(s).replace(/\r\n?/g, '\n'); };

    var state = { name: '', role: 'view', here: [], status: 'Connecting...', ok: false };
    var pill = null, closed = false;
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function draw() {
        if (closed) return;
        if (!pill) {
            pill = document.createElement('div');
            pill.setAttribute('role', 'status');
            pill.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147482000;max-width:min(92vw,420px);font:600 12.5px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#2b0f3a;background:#fbf0ff;border:1.5px solid #d663ff;border-radius:14px;padding:8px 30px 8px 12px;box-shadow:0 6px 22px rgba(120,30,160,.28)';
            document.body.appendChild(pill);
        }
        var people = state.here.map(function (p) { return '<span style="display:inline-flex;align-items:center;gap:4px;margin-right:8px"><i style="width:9px;height:9px;border-radius:50%;background:' + esc(p.color) + ';display:inline-block"></i>' + esc(p.name) + '</span>'; }).join('');
        var ask = !name && !state.noNameNeeded;
        pill.innerHTML = '<button id="os-x" type="button" title="Hide this box (the file keeps syncing)" aria-label="Hide the Overshare box" style="position:absolute;top:5px;right:6px;width:22px;height:22px;border:0;border-radius:50%;background:#f0d2fb;color:#7b1fa2;font:700 13px/1 system-ui,sans-serif;cursor:pointer;padding:0">&#x2715;</button><div><b style="color:#a93ad4">Overshare</b> · ' + esc(state.name || 'a shared file') + ' · ' + esc(state.status) + (state.role === 'view' ? ' · <b>view only</b> (your changes stay on this page)' : '') + '</div>' +
            (people ? '<div style="margin-top:3px">' + people + '</div>' : '') +
            (ask ? '<div style="margin-top:6px"><input id="os-name" maxlength="24" placeholder="Your name" aria-label="Your name" style="font:inherit;padding:3px 8px;border:1.5px solid #d663ff;border-radius:8px;width:130px"> <button id="os-go" type="button" style="font:inherit;font-weight:700;border:0;border-radius:999px;padding:3px 12px;color:#fff;background:#a93ad4;cursor:pointer">Join in!</button></div>' : '') +
            '<div style="margin-top:3px"><a href="' + esc(API) + '/f/' + esc(slug) + '#k=' + esc(key) + '" target="_blank" rel="noopener" style="color:#7b1fa2">Open in Overshare</a></div>';
        pill.querySelector('#os-x').addEventListener('click', function () { closed = true; if (pill) { pill.remove(); pill = null; } });
        var go = pill.querySelector('#os-go');
        if (go) go.addEventListener('click', function () { var v = (pill.querySelector('#os-name').value || '').trim().replace(/[^\w .'-]/g, '').slice(0, 24) || 'Guest'; name = v; try { localStorage.setItem(NAME_KEY, v); } catch (e) {} draw(); });
    }

    // a stand-in for a file on this computer: getFile() and createWritable(), but it talks to the shared copy
    function makeHandle() {
        var rev = 0, text = '', counter = 0, seen = -1, last = 0, bump = '', hbAt = 0, fileName = 'shared';
        function post(body) {
            body.cid = cid; body.name = name || 'Guest';
            return fetch(API + '/api/files/' + slug + '/sync', { method: 'POST', headers: { 'content-type': 'application/json', 'x-overshare-key': key }, body: JSON.stringify(body) }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Overshare cannot be reached'); e.status = r.status; throw e; } return d; });
            });
        }
        function got(d) { state.here = d.here || state.here; state.ok = true; }
        function refresh() {
            if (Date.now() - last < 600) return Promise.resolve();
            var hb = Date.now() - hbAt > 10000;
            return post({ rev: rev, hb: hb }).then(function (d) {
                last = Date.now(); if (hb) hbAt = last; got(d);
                if (d.text !== undefined) text = norm(d.text);
                rev = d.rev;
                if (rev !== seen) { seen = rev; counter++; }
                state.status = 'Live'; draw();
            }).catch(function (e) { state.ok = false; state.status = e.status === 404 ? 'This file is no longer shared' : 'Offline, trying again...'; draw(); });
        }
        return {
            name: fileName,
            first: function () {
                return fetch(API + '/api/files/' + slug, { headers: { 'x-overshare-key': key } }).then(function (r) {
                    return r.json().catch(function () { return {}; }).then(function (d) {
                        if (!r.ok) throw new Error(d.error || 'That shared file was not found, or its link is turned off');
                        fileName = d.file.name; this.name = fileName; text = norm(d.content); rev = d.file.rev; seen = rev; counter = 1; last = Date.now();
                        state.name = fileName; state.role = d.file.role === 'view' ? 'view' : 'edit'; state.here = d.here || []; state.status = 'Live'; state.noNameNeeded = !!d.file.keys; draw();
                        return d.file;
                    }.bind(this));
                }.bind(this));
            },
            getFile: function () {
                return refresh().then(function () {
                    if (bump === 'go') { counter++; bump = ''; } else if (bump === 'wait1') bump = 'go';
                    return { lastModified: counter, size: text.length, name: fileName, text: function () { return Promise.resolve(text); } };
                });
            },
            createWritable: function () {
                var buf = '';
                return Promise.resolve({
                    write: function (t) { buf = norm(typeof t === 'string' ? t : (t && t.data) || t); return Promise.resolve(); },
                    close: function () {
                        if (state.role === 'view') return Promise.resolve();
                        return post({ rev: rev, text: buf, hb: Date.now() - hbAt > 10000 }).then(function (d) {
                            last = Date.now(); got(d);
                            if (d.text !== undefined && norm(d.text) !== buf) { text = norm(d.text); rev = d.rev; seen = rev; counter++; bump = 'wait1'; }
                            else { text = buf; rev = d.rev; seen = rev; }
                            state.status = 'Live'; draw();
                        });
                    },
                });
            },
        };
    }

    function start() {
        var C = window.RadiiCollab;
        if (!C || !C.ready || !C.ready() || !C.disk || !C.disk.useRemote || !window.radiiFileFormat) return false;
        var hd = makeHandle();
        hd.first().then(function (f) { return C.disk.useRemote(hd, f.name); }).then(function () { state.status = 'Live'; draw(); }).catch(function (e) { state.status = e.message || 'Could not open the shared file'; draw(); });
        return true;
    }
    function boot() {
        draw();
        var tries = 0;
        var t = setInterval(function () { tries++; if (start() || tries > 60) { clearInterval(t); if (tries > 60) { state.status = 'This app cannot open shared files'; draw(); } } }, 250);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
