/* Radii Trigger! Type rules like  #!trigger-[sync]-Mainkey->Inkpath!#  and glowing pods react.
   Events come from two places: documents changing in this browser (other Radii tabs write to the same storage),
   and a watched folder of .radii files (the files each app keeps up to date from Share > Keep a file on this computer).
   In the desktop app the folder is read through its own file commands, so it works between separate app windows too! */
(function () {
    'use strict';
    const TI = window.__TAURI_INTERNALS__;
    const hasDir = !!window.showDirectoryPicker;
    const $ = (id) => document.getElementById(id);
    const COLORS = { red: '#ef4444', orange: '#ff8a1b', amber: '#f5a30b', yellow: '#eab308', lime: '#84cc16', green: '#22c55e', teal: '#14b8a6', cyan: '#22d3ee', blue: '#2f7cf6', indigo: '#6366f1', purple: '#a855f7', pink: '#ec4899', gray: '#94a3b8' };
    const APPS = ['Writeout', 'Bitbook', 'Amber', 'Omicron', 'Formly', 'Cabinet', 'Hexa', 'Taskra', 'Imbuer', 'Inkpath', 'Zonerider', 'Mainkey', 'Peeker', 'Phosphor', 'Antimony', 'Waterflow', 'Yuzu'];
    const APP_PATH = { Writeout: '/writeout/', Bitbook: '/bitbook/', Amber: '/amber/', Omicron: '/omicron/', Formly: '/formly/', Cabinet: '/cabinet/', Hexa: '/hexa/', Taskra: '/taskra/', Imbuer: '/imbuer/', Inkpath: '/inkpath/', Zonerider: '/zonerider/', Mainkey: '/mainkey/', Peeker: '/peeker/', Phosphor: '/phosphor/', Antimony: '/antimony/', Waterflow: '/waterflow/', Yuzu: '/yuzu/' };
    const KEYAPP = [[/^(writedown_|writeout_)/, 'Writeout'], [/^bitbook_/, 'Bitbook'], [/^amber_/, 'Amber'], [/^omicron_/, 'Omicron'], [/^formly_/, 'Formly'], [/^cabinet_/, 'Cabinet'], [/^hexa/, 'Hexa'], [/^tasks-app/, 'Taskra'], [/^imbuer/, 'Imbuer'], [/^inkpath_/, 'Inkpath'], [/^zonerider_/, 'Zonerider'], [/^mainkey/, 'Mainkey'], [/^peeker_/, 'Peeker'], [/^phosphor_/, 'Phosphor'], [/^antimony_/, 'Antimony'], [/^waterflow_/, 'Waterflow'], [/^yuzu/, 'Yuzu']];
    const DEFAULT = '#!trigger-[sync]-Writeout->notify,pod:orange!#\n#!trigger-[change]-Mainkey->Inkpath!#\n#!trigger-[save]-Any->log,pod:blue!#\n#!trigger-[every:60s]-Any->pod:cyan!#\n';
    const LS = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };

    let rules = [], running = true, folder = null, folderName = '', needPerm = false, seen = new Map(), timers = [], opened = new Set(), pollT = null;

    /* ---------- rules ---------- */
    function parse(text) {
        const out = [];
        String(text).split('\n').forEach(function (line, i) {
            const t = line.trim();
            if (!t) return;
            const m = t.match(/^#!trigger-\[([^\]]+)\]-\s*([^>]+?)\s*->\s*(.+?)\s*!#$/);
            if (!m) { out.push({ line: i + 1, bad: 'Not a rule: ' + t.slice(0, 40), raw: t }); return; }
            const ev = m[1].trim().toLowerCase();
            const em = ev.match(/^every:(\d+)(s|m)?$/);
            if (!em && !/^(change|save|sync|start)$/.test(ev)) { out.push({ line: i + 1, bad: 'Unknown event ' + ev, raw: t }); return; }
            const acts = m[3].split(',').map((a) => a.trim()).filter(Boolean);
            out.push({ line: i + 1, raw: t, event: em ? 'every' : ev, every: em ? Number(em[1]) * (em[2] === 'm' ? 60 : 1) : 0, src: m[2], acts: acts, id: 'r' + i });
        });
        return out;
    }
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const podColor = (r) => { const a = (r.acts || []).find((x) => /^pod:/i.test(x)); const n = a && a.slice(4).trim().toLowerCase(); return COLORS[n] || (a && /^#[0-9a-f]{6}$/i.test(a.slice(4)) ? a.slice(4) : '') || COLORS.cyan; };

    function draw() {
        const pods = $('tg-pods');
        pods.innerHTML = '';
        rules.forEach(function (r) {
            const d = document.createElement('div');
            d.className = 'tg-pod' + (r.bad ? ' bad' : '');
            d.dataset.id = r.id || '';
            if (r.bad) { d.innerHTML = '<i class="tg-orb" style="--pc:#7a2d2d"></i><b>Line ' + r.line + '</b><span></span>'; d.lastChild.textContent = r.bad; }
            else {
                d.style.setProperty('--pc', podColor(r));
                d.innerHTML = '<i class="tg-orb" style="--pc:' + podColor(r) + '"></i><b></b><span></span>';
                d.children[1].textContent = '[' + (r.event === 'every' ? 'every ' + r.every + 's' : r.event) + '] ' + r.src;
                d.children[2].textContent = r.acts.join(', ');
            }
            pods.appendChild(d);
        });
        $('tg-count').textContent = rules.filter((r) => !r.bad).length + ' rules';
    }
    function flash(r) {
        const d = document.querySelector('.tg-pod[data-id="' + r.id + '"]');
        if (!d) return;
        d.classList.remove('fire'); void d.offsetWidth; d.classList.add('fire');
        setTimeout(function () { d.classList.remove('fire'); }, 2600);
    }
    function log(msg, err) {
        const ol = $('tg-log');
        const li = document.createElement('li');
        if (err) li.className = 'err';
        const t = document.createElement('i');
        t.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
        li.appendChild(t); li.appendChild(document.createTextNode(msg));
        ol.insertBefore(li, ol.firstChild);
        while (ol.children.length > 80) ol.lastChild.remove();
    }

    /* ---------- actions ---------- */
    async function act(r, a, info) {
        const lower = a.toLowerCase();
        const arg = a.indexOf(':') > -1 ? a.slice(a.indexOf(':') + 1).trim() : '';
        const label = info.app + ' ' + info.event;
        if (lower === 'log') { log(label + (info.file ? ' (' + info.file + ')' : '')); return; }
        if (lower === 'notify') {
            log('Notice: ' + label);
            try {
                if ('Notification' in window) {
                    if (Notification.permission === 'default') await Notification.requestPermission();
                    if (Notification.permission === 'granted') new Notification('Radii Trigger', { body: label });
                }
            } catch (e) {}
            return;
        }
        if (lower.indexOf('pod:') === 0) return;
        const appName = APPS.find((x) => norm(x) === norm(lower.indexOf('open:') === 0 ? arg : a));
        if (appName) {
            log('Opening ' + appName + ' (from ' + label + ')');
            if (opened.has(appName) && lower.indexOf('open:') !== 0) return;
            opened.add(appName);
            if (TI) log('Open ' + appName + ' from the Products page: desktop apps run in their own windows.');
            else window.open(APP_PATH[appName], 'radii_' + appName.toLowerCase());
            return;
        }
        if (lower.indexOf('webhook:') === 0) {
            try { await fetch(arg, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ app: info.app, event: info.event, time: new Date().toISOString() }) }); log('Sent to ' + arg); }
            catch (e) { log('Could not reach ' + arg, true); }
            return;
        }
        if (lower.indexOf('copy:') === 0) {
            if (!info.text) { log('Copy needs a file event from a watched folder.', true); return; }
            try { await writeIn('copy-' + (arg || 'backup').replace(/[^\w\- ]+/g, '') + '-' + info.app + '.radii', info.text); log('Copied ' + info.app + ' to copy-' + arg + '-' + info.app + '.radii'); }
            catch (e) { log('Copy failed: ' + (e && e.message || e), true); }
            return;
        }
        log('Unknown action "' + a + '"', true);
    }
    function emit(event, app, extra) {
        if (!running) return;
        const info = Object.assign({ event: event, app: app }, extra || {});
        rules.forEach(function (r) {
            if (r.bad || r.event === 'every' || r.event === 'start') return;
            if (!(r.event === 'change' || r.event === event)) return;
            if (norm(r.src) !== 'any' && norm(r.src) !== norm(app)) return;
            flash(r);
            r.acts.forEach(function (a) { act(r, a, info); });
        });
    }

    /* ---------- event source 1: documents changing in this browser ---------- */
    const quiet = {};
    window.addEventListener('storage', function (e) {
        if (!e.key) return;
        const k = e.key.replace(/@.*$/, '');
        const hit = KEYAPP.find((p) => p[0].test(k));
        if (!hit || /collab_backup|_ts$|_path$/.test(k)) return;
        const app = hit[1];
        clearTimeout(quiet[app]);
        quiet[app] = setTimeout(function () { emit('save', app, { key: k }); }, 500);
    });

    /* ---------- event source 2: a watched folder ---------- */
    const idb = () => new Promise((res, rej) => { const r = indexedDB.open('radii-disk', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const idbGet = (k) => idb().then((d) => new Promise((res) => { const q = d.transaction('h').objectStore('h').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); })).catch(() => null);
    const idbSet = (k, v) => idb().then((d) => new Promise((res) => { const t = d.transaction('h', 'readwrite'); t.objectStore('h').put(v, k); t.oncomplete = () => res(); t.onerror = () => res(); })).catch(() => {});
    const inv = (c, a) => TI.invoke(c, a || {});
    async function listFolder() {
        if (TI) return (await inv('radii_list', { path: folder })).filter((f) => /\.radii$/i.test(f.name));
        const out = [];
        for await (const [name, h] of folder.entries()) if (h.kind === 'file' && /\.radii$/i.test(name)) out.push({ name: name, mtime: (await h.getFile()).lastModified, h: h });
        return out;
    }
    async function readIn(f) {
        if (TI) return (await inv('radii_read', { path: folder + '/' + f.name })).text;
        return await (await f.h.getFile()).text();
    }
    async function writeIn(name, text) {
        if (!folder) throw new Error('Choose a folder to watch first');
        if (TI) { await inv('radii_write', { path: folder + '/' + name, text: text }); return; }
        const h = await folder.getFileHandle(name, { create: true });
        const w = await h.createWritable(); await w.write(text); await w.close();
    }
    async function scan(first) {
        if (!folder || needPerm || !running) return;
        let files;
        try { files = await listFolder(); } catch (e) { return; }
        for (const f of files) {
            if (/^copy-/i.test(f.name)) continue;
            const old = seen.get(f.name);
            seen.set(f.name, f.mtime);
            if (first || old === undefined || old === f.mtime) continue;
            let text = '', app = f.name.replace(/\.radii$/i, '');
            try { text = await readIn(f); const o = JSON.parse(text); if (o && o.app) app = o.app; } catch (e) { continue; }
            app = APPS.find((x) => norm(x) === norm(app)) || app;
            emit('sync', app, { file: f.name, text: text });
        }
    }
    function setFolderLabel() {
        $('tg-folder').textContent = folder ? (needPerm ? 'Reconnect ' + folderName : 'Watching ' + folderName) : 'Watch a folder…';
    }
    async function chooseFolder() {
        if (folder && needPerm && !TI) {
            try { if ((await folder.requestPermission({ mode: 'readwrite' })) === 'granted') { needPerm = false; setFolderLabel(); await scan(true); log('Reconnected to ' + folderName); } } catch (e) {}
            return;
        }
        try {
            if (TI) {
                const p = await inv('radii_pick_dir');
                if (!p) return;
                folder = p; folderName = p.split(/[\\/]/).pop() || p; LS('trigger_folder_path', p);
            } else if (hasDir) {
                folder = await window.showDirectoryPicker({ mode: 'readwrite' }); folderName = folder.name; await idbSet('trigger_folder', folder);
            } else { log('This browser cannot watch a folder. Chrome, Edge and the desktop app can!', true); return; }
            needPerm = false; seen = new Map(); setFolderLabel(); await scan(true);
            log('Watching ' + folderName + ': every .radii file in it now triggers rules when it changes');
        } catch (e) { if (!(e && e.name === 'AbortError')) log(String(e && e.message || e), true); }
    }
    async function restoreFolder() {
        try {
            if (TI) { const p = LS('trigger_folder_path'); if (!p) return; folder = p; folderName = p.split(/[\\/]/).pop() || p; }
            else { const h = await idbGet('trigger_folder'); if (!h) return; folder = h; folderName = h.name; if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted') needPerm = true; }
            setFolderLabel(); if (!needPerm) await scan(true);
        } catch (e) {}
    }

    /* ---------- timers, start ---------- */
    function arm() {
        timers.forEach(clearInterval); timers = [];
        rules.forEach(function (r) {
            if (r.bad || r.event !== 'every' || !r.every) return;
            timers.push(setInterval(function () { if (!running) return; flash(r); r.acts.forEach((a) => act(r, a, { event: 'every ' + r.every + 's', app: r.src })); }, Math.max(1, r.every) * 1000));
        });
    }
    function fireStart() {
        rules.forEach(function (r) { if (!r.bad && r.event === 'start') { flash(r); r.acts.forEach((a) => act(r, a, { event: 'start', app: r.src })); } });
    }
    function load() { rules = parse($('tg-rules').value); draw(); arm(); }

    function setRunning(on) {
        running = on;
        $('tg-run').textContent = on ? 'Pause' : 'Run';
        $('tg-state').textContent = on ? 'Running' : 'Paused';
        $('tg-state').classList.toggle('off', !on);
        if (on) scan(true);
    }

    function init() {
        const ta = $('tg-rules');
        ta.value = LS('trigger_rules_v1') || DEFAULT;
        ta.addEventListener('input', function () { LS('trigger_rules_v1', ta.value); load(); });
        $('tg-run').addEventListener('click', function () { setRunning(!running); });
        $('tg-folder').addEventListener('click', chooseFolder);
        load();
        restoreFolder();
        pollT = setInterval(function () { scan(false); }, 1200);
        setTimeout(fireStart, 300);
        log('Radii Trigger is ready! Edit a document in another Radii tab, or watch a folder of .radii files!');
        window.RadiiTrigger = { parse: parse, emit: emit, rules: function () { return rules; } };
    }
    init();
})();
