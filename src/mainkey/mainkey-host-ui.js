// Mainkey Host: this browser tab becomes the database "server" for every visitor of your site!
// It uses mainkey-live.js's Mainkey.host(): visitors reach this tab through public relays,
// and every message is sealed with a key that only your page snippet knows.
(function () {
    'use strict';
    const ROOM_KEY = 'mainkey-host-room';
    const EDIT_KEY = 'mainkey-host-edit';
    let hostObj = null;
    const $ = (id) => document.getElementById(id);
    const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

    // the room stays the same every time, so the snippet on your site keeps working!
    function room() {
        let r = lsGet(ROOM_KEY);
        if (!r) { r = window.Mainkey.makeRoom(); lsSet(ROOM_KEY, r); }
        return r;
    }
    function snippet() {
        return '<div data-mainkey="database.kb" data-mainkey-host="' + room() + '"></div>\n<script src="mainkey-live.js"></script>';
    }
    function setStatus(text) { const el = $('host-status'); if (el) el.textContent = text; }
    function paint(info) {
        const btn = $('btn-host');
        if (!hostObj) {
            if (btn) btn.textContent = '📡 Host';
            setStatus('Not hosting. Click Start hosting, and keep this tab open while people use your site!');
        } else {
            const v = info ? info.visitors : 0, r = info ? info.relays : 0;
            if (btn) btn.textContent = '📡 Hosting · ' + v + (v === 1 ? ' visitor' : ' visitors');
            setStatus(info && info.error ? info.error : (r ? 'Hosting live through ' + r + (r === 1 ? ' relay' : ' relays') + '! ' + v + (v === 1 ? ' visitor' : ' visitors') + ' connected' + (info && info.readOnly ? ' (read-only)' : '') + '!' : 'Connecting to the relays…'));
        }
        const start = $('host-start'), stopB = $('host-stop');
        if (start) start.hidden = !!hostObj;
        if (stopB) stopB.hidden = !hostObj;
        const sn = $('host-snippet');
        if (sn) sn.textContent = snippet();
    }

    window.openHostModal = function () {
        const edit = $('host-edit');
        if (edit) edit.checked = lsGet(EDIT_KEY) !== '0';
        paint(hostObj ? hostObj.info() : null);
        $('host-modal').style.display = 'flex';
    };
    window.closeHostModal = function () { $('host-modal').style.display = 'none'; };
    window.startHosting = function () {
        if (hostObj) return;
        if (!window.Mainkey || !window.Mainkey.host) { setStatus('The hosting library did not load!'); return; }
        try {
            hostObj = window.Mainkey.host({
                getDoc: () => ({ app: 'Radii Base', version: '1.0', fields: fields, records: records }),
                // a visitor changed something: take the new data, save it here, and redraw
                setDoc: (doc) => { fields = doc.fields; records = doc.records; savePlain(); render(); }
            }, { room: room(), readOnly: !($('host-edit') ? $('host-edit').checked : true), onStatus: paint });
        } catch (e) { setStatus(e.message); return; }
        paint(hostObj.info());
    };
    window.stopHosting = function () { if (hostObj) { hostObj.stop(); hostObj = null; } paint(null); };
    window.hostEditToggle = function () {
        const on = $('host-edit').checked;
        lsSet(EDIT_KEY, on ? '1' : '0');
        if (hostObj) hostObj.setReadOnly(!on);
    };
    window.hostNewRoom = function () {
        if (hostObj) window.stopHosting();
        lsSet(ROOM_KEY, window.Mainkey.makeRoom());
        paint(null);
        setStatus('New room made! Update the snippet on your site (the old one stops working)!');
    };
    window.copyHostSnippet = function () {
        const t = snippet();
        const ok = () => setStatus('Snippet copied! Paste it into your page, next to database.kb and mainkey-live.js!');
        try { navigator.clipboard.writeText(t).then(ok, () => setStatus('Select the snippet and copy it yourself!')); } catch (e) { setStatus('Select the snippet and copy it yourself!'); }
    };

    // your own edits here go out to every visitor too!
    const savePlain = window.persist;
    window.persist = function () { savePlain(); if (hostObj) hostObj.changed(); };
    window.addEventListener('beforeunload', () => { if (hostObj) hostObj.stop(); });
})();
