/* =====================================================================
   Radii File IDs! Every app can open a named file straight from the link:
   https://radii-office.com/formly/?file=k7q2mz9p4x
   With no ?file= you get the app's main file, exactly as before. With one,
   the app works on its OWN separate file (saved in this browser under that
   ID), so bookmarks, new tabs and invites can each point at a different
   document! Load this BEFORE the app's own scripts (identical copy per app)!

   RadiiFile.scope(/^my_doc_key/)  keys of the app's document data
   RadiiFile.id                    the current ID ('' = the main file)
   RadiiFile.suffix()              '@id' (or '') for databases and the like
   RadiiFile.link(id)              the link for an ID (default: this file)
   RadiiFile.newId()               a fresh random ID
   RadiiFile.open(id)              open an ID in a new tab (default: new file)
   ===================================================================== */
(function () {
    'use strict';
    if (window.RadiiFile) return;
    const m = /[?&]file=([^&#]*)/.exec(location.search);
    let id = '';
    try { id = m ? decodeURIComponent(m[1]).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) : ''; } catch (e) { id = ''; }
    const scopes = [];
    const ls = window.localStorage;
    function mapKey(k) {
        k = String(k);
        if (!id) return k;
        for (let i = 0; i < scopes.length; i++) if (scopes[i].test(k)) return k + '@' + id;
        return k;
    }
    let gi = null, si = null, ri = null, touched = 0;
    function isScoped(k) { for (let i = 0; i < scopes.length; i++) if (scopes[i].test(String(k))) return true; return false; }
    try {
        const P = Storage.prototype;
        gi = P.getItem; si = P.setItem; ri = P.removeItem;
        P.getItem = function (k) { return gi.call(this, this === ls ? mapKey(k) : k); };
        P.setItem = function (k, v) { if (this === ls && isScoped(k)) touched = Date.now(); return si.call(this, this === ls ? mapKey(k) : k, v); };
        P.removeItem = function (k) { return ri.call(this, this === ls ? mapKey(k) : k); };
    } catch (e) {}
    // Raw access (no ?file= mapping), for the Documents library: every file's own keys, how big it is, copying and deleting it
    const rawGet = function (k) { return (gi || ls.getItem).call(ls, k); };
    const rawSet = function (k, v) { return (si || ls.setItem).call(ls, k, v); };
    const rawDel = function (k) { return (ri || ls.removeItem).call(ls, k); };
    const SUF = /@([A-Za-z0-9_-]{1,64})$/;
    function keysOf(forId) {
        const out = [];
        for (let i = 0; i < ls.length; i++) {
            const k = ls.key(i);
            if (forId) { if (k.length > forId.length + 1 && k.slice(-(forId.length + 1)) === '@' + forId && isScoped(k.slice(0, -(forId.length + 1)))) out.push(k); }
            else if (isScoped(k) && !SUF.test(k)) out.push(k);
        }
        return out;
    }
    function idsInStorage() {
        const seen = {};
        for (let i = 0; i < ls.length; i++) {
            const k = ls.key(i), m = SUF.exec(k);
            if (m && isScoped(k.slice(0, -(m[1].length + 1)))) seen[m[1]] = true;
        }
        return Object.keys(seen);
    }
    function newId() {
        const a = new Uint8Array(9);
        (window.crypto || window.msCrypto).getRandomValues(a);
        return [].map.call(a, function (b) { return (b % 36).toString(36); }).join('');
    }
    function link(forId) {
        const u = new URL(location.href);
        u.hash = '';
        u.search = '';
        const v = forId === undefined ? id : forId;
        if (v) u.searchParams.set('file', v);
        return u.toString();
    }
    window.RadiiFile = {
        id: id,
        suffix: function () { return id ? '@' + id : ''; },
        scope: function (re) { scopes.push(re); },
        newId: newId,
        link: link,
        open: function (forId) { window.open(link(forId || newId()), '_blank', 'noopener'); },
        // for the Documents library
        ids: idsInStorage,
        touched: function () { return touched; },
        size: function (forId) { return keysOf(forId || '').reduce(function (n, k) { return n + k.length + String(rawGet(k) || '').length; }, 0); },
        copy: function (fromId, toId) {
            const off = fromId ? fromId.length + 1 : 0;
            keysOf(fromId || '').forEach(function (k) { rawSet((off ? k.slice(0, -off) : k) + '@' + toId, rawGet(k)); });
        },
        remove: function (forId) { keysOf(forId || '').forEach(rawDel); }
    };
})();
