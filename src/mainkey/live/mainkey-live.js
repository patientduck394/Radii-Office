/*!
 * mainkey-live.js — turn a Mainkey .kb file into a live database on any website!
 *
 * Zero setup: put database.kb and this file next to your page, then add
 *     <div data-mainkey="database.kb"></div>
 *     <script src="mainkey-live.js"></script>
 * and you get a searchable, sortable, editable database!
 *
 * Or drive it from code with the API:
 *     const db = await Mainkey.load('database.kb');
 *     db.insert({ title: 'New thing', status: 'Todo', value: 5 });
 *     db.query({ search: 'alpha', sort: 'value', dir: 'desc' });
 *     db.subscribe(change => console.log(change.type));
 *
 * Edits are saved in each visitor's own browser (localStorage) and stay in
 * sync across their open tabs! Publish a new .kb file and visitors pick it up
 * automatically! Shared edits between different visitors need a server: use
 * the `onChange` option or db.subscribe() to send changes to your backend!
 *
 * Reading YAML .kb files uses js-yaml (loaded from cdnjs on demand if it isn't
 * on the page already). JSON .kb files need nothing extra!
 */
(function (root) {
    'use strict';

    var VERSION = '1.0.0';
    var YAML_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js';
    var FIELD_TYPES = ['text', 'number', 'tag'];
    var STORE_PREFIX = 'mainkey-live:';

    var hasDOM = typeof document !== 'undefined';
    var registry = {}; // storage key -> Promise<Database>, so widgets share one live db!
    var yamlPromise = null;

    // ---------- small helpers ----------

    function escapeHtml(s) {
        return String(s === undefined || s === null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clone(v) { return JSON.parse(JSON.stringify(v)); }

    // FNV-1a hash: tells us when the site owner publishes a new .kb file!
    function hash(str) {
        var h = 0x811c9dc5;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h.toString(36);
    }

    function storage() {
        try {
            var ls = root.localStorage;
            var probe = STORE_PREFIX + 'probe';
            ls.setItem(probe, '1');
            ls.removeItem(probe);
            return ls;
        } catch (e) {
            return null;
        }
    }

    function csvCell(v) {
        var s = String(v === undefined || v === null ? '' : v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function slug(name) {
        return String(name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    function isBlank(v) { return v === undefined || v === null || v === ''; }

    function loadYaml() {
        if (root.jsyaml) return Promise.resolve(root.jsyaml);
        if (yamlPromise) return yamlPromise;
        yamlPromise = new Promise(function (resolve, reject) {
            if (!hasDOM) return reject(new Error('Mainkey: YAML .kb files need js-yaml (set globalThis.jsyaml) outside the browser!'));
            var s = document.createElement('script');
            s.src = YAML_CDN;
            s.onload = function () {
                root.jsyaml ? resolve(root.jsyaml) : reject(new Error('Mainkey: js-yaml loaded but jsyaml is missing!'));
            };
            s.onerror = function () {
                yamlPromise = null;
                reject(new Error('Mainkey: could not load js-yaml to read this YAML .kb file! Add js-yaml to the page, or export the file as JSON!'));
            };
            document.head.appendChild(s);
        });
        return yamlPromise;
    }

    // ---------- parsing & normalizing ----------

    function parseKB(text) {
        var t = String(text).replace(/^\uFEFF/, '').trim();
        if (!t) return Promise.reject(new Error('Mainkey: the .kb file is empty!'));
        if (t.charAt(0) === '{') {
            try { return Promise.resolve(JSON.parse(t)); } catch (e) { /* not JSON, try YAML! */ }
        }
        return loadYaml().then(function (y) { return y.load(t); });
    }

    function normalize(doc) {
        if (!doc || typeof doc !== 'object') throw new Error('Mainkey: this is not a Mainkey database!');
        if (!Array.isArray(doc.fields) || !Array.isArray(doc.records)) {
            throw new Error('Mainkey: a .kb file needs "fields" and "records" lists!');
        }
        var seen = {};
        var fields = [];
        doc.fields.forEach(function (f) {
            if (!f || typeof f !== 'object') return;
            var id = String(isBlank(f.id) ? slug(f.name || '') : f.id);
            if (!id || seen[id]) return;
            seen[id] = true;
            fields.push({
                id: id,
                name: String(isBlank(f.name) ? id : f.name),
                type: FIELD_TYPES.indexOf(f.type) >= 0 ? f.type : 'text'
            });
        });
        if (fields.length === 0) throw new Error('Mainkey: the database has no fields!');
        var ids = {};
        var records = [];
        doc.records.forEach(function (r) {
            if (!r || typeof r !== 'object' || Array.isArray(r)) return;
            var rec = clone(r);
            if (isBlank(rec.id) || ids[String(rec.id)]) rec.id = nextId(ids);
            ids[String(rec.id)] = true;
            records.push(rec);
        });
        return {
            app: doc.app || 'Radii Base',
            version: String(doc.version || '1.0'),
            fields: fields,
            records: records
        };
    }

    var idCounter = 0;
    function nextId(taken) {
        var id = Date.now() * 100 + (idCounter++ % 100);
        while (taken[String(id)]) id++;
        return id;
    }

    function readSource(source) {
        if (source && typeof source === 'object') {
            return Promise.resolve({ doc: source, text: JSON.stringify(source) });
        }
        var src = String(source || '');
        if (!src) return Promise.reject(new Error('Mainkey: no database source given!'));
        if (src.charAt(0) === '#') {
            // Inline data: <script type="application/json" id="my-db">…</script>
            var el = hasDOM ? document.querySelector(src) : null;
            if (!el) return Promise.reject(new Error('Mainkey: no element matches ' + src + '!'));
            var inline = el.textContent || '';
            return parseKB(inline).then(function (doc) { return { doc: doc, text: inline }; });
        }
        if (typeof fetch !== 'function') return Promise.reject(new Error('Mainkey: fetch() is not available here!'));
        return fetch(src, { cache: 'no-cache' }).then(function (res) {
            if (!res.ok) throw new Error('Mainkey: could not load ' + src + ' (HTTP ' + res.status + ')!');
            return res.text();
        }, function () {
            var local = hasDOM && root.location && root.location.protocol === 'file:';
            throw new Error('Mainkey: could not load ' + src + '!' + (local
                ? ' Pages opened straight from your disk cannot fetch files, so serve the folder from a website (or use the one-file HTML export)!'
                : ''));
        }).then(function (text) {
            return parseKB(text).then(function (doc) { return { doc: doc, text: text }; });
        });
    }

    function storeKeyFor(source, options) {
        if (options.key) return STORE_PREFIX + options.key;
        if (source && typeof source === 'object') return null; // objects have no stable name!
        var src = String(source);
        if (src.charAt(0) !== '#' && hasDOM) {
            try { src = new URL(src, document.baseURI).href; } catch (e) {}
        } else if (hasDOM && root.location) {
            src = root.location.pathname + src;
        }
        return STORE_PREFIX + src;
    }

    // ---------- the Database ----------

    function Database(state, meta) {
        this._fields = state.fields;
        this._records = state.records;
        this._app = state.app;
        this._version = state.version;
        this._original = meta.original;   // normalized copy of the published file!
        this._base = meta.base;           // hash of the published file!
        this._storeKey = meta.storeKey;
        this._persist = meta.persist && !!meta.storeKey;
        this._listeners = [];
        this._onChange = meta.onChange;
        this.source = meta.source;
        this.edited = !!meta.edited;
        this._watchOtherTabs();
    }

    Database.prototype = {
        // --- reading ---

        get fields() { return clone(this._fields); },
        get count() { return this._records.length; },

        all: function () { return clone(this._records); },

        get: function (id) {
            var r = this._find(id);
            return r ? clone(r) : null;
        },

        field: function (id) {
            for (var i = 0; i < this._fields.length; i++) {
                if (this._fields[i].id === String(id)) return clone(this._fields[i]);
            }
            return null;
        },

        // query({ search, where, sort, dir, limit, offset })!
        // where: { status: 'Done' } (exact match), { value: v => v > 10 }, or a function(record)!
        query: function (opts) {
            opts = opts || {};
            var self = this;
            var out = this._records.slice();

            var q = String(opts.search || '').trim().toLowerCase();
            if (q) {
                out = out.filter(function (r) {
                    return self._fields.some(function (f) {
                        return !isBlank(r[f.id]) && String(r[f.id]).toLowerCase().indexOf(q) >= 0;
                    });
                });
            }

            var where = opts.where;
            if (typeof where === 'function') {
                out = out.filter(function (r) { return where(clone(r)); });
            } else if (where && typeof where === 'object') {
                Object.keys(where).forEach(function (k) {
                    var want = where[k];
                    out = out.filter(function (r) {
                        return typeof want === 'function' ? !!want(r[k], clone(r)) : String(r[k]) === String(want);
                    });
                });
            }

            if (opts.sort) {
                var key = String(opts.sort);
                var dir = opts.dir === 'desc' || opts.dir === -1 ? -1 : 1;
                var f = this.field(key);
                var numeric = f && f.type === 'number';
                out.sort(function (a, b) {
                    var av = a[key], bv = b[key];
                    if (isBlank(av) && isBlank(bv)) return 0;
                    if (isBlank(av)) return 1;
                    if (isBlank(bv)) return -1;
                    if (numeric) return (Number(av) - Number(bv)) * dir;
                    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
                });
            }

            var start = Math.max(0, Number(opts.offset) || 0);
            var end = opts.limit === undefined ? undefined : start + Math.max(0, Number(opts.limit) || 0);
            return clone(out.slice(start, end));
        },

        // stats('value') → { count, sum, avg, min, max, median }!
        stats: function (fieldId, records) {
            var src = records || this._records;
            var vals = src.map(function (r) { return r[fieldId]; })
                .filter(function (v) { return !isBlank(v) && !isNaN(Number(v)); })
                .map(Number)
                .sort(function (a, b) { return a - b; });
            if (vals.length === 0) return { count: 0, sum: 0, avg: 0, min: 0, max: 0, median: 0 };
            var sum = vals.reduce(function (a, b) { return a + b; }, 0);
            var mid = Math.floor(vals.length / 2);
            return {
                count: vals.length,
                sum: sum,
                avg: sum / vals.length,
                min: vals[0],
                max: vals[vals.length - 1],
                median: vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
            };
        },

        // counts('status') → { 'In Progress': 2, Completed: 1 }!
        counts: function (fieldId, records) {
            var out = {};
            (records || this._records).forEach(function (r) {
                var k = isBlank(r[fieldId]) ? '' : String(r[fieldId]);
                out[k] = (out[k] || 0) + 1;
            });
            return out;
        },

        // --- writing ---

        insert: function (data) {
            var rec = this._coerce(data || {});
            var taken = this._idMap();
            rec.id = !isBlank(data && data.id) && !taken[String(data.id)] ? data.id : nextId(taken);
            this._records.push(rec);
            this._commit({ type: 'insert', id: rec.id, record: clone(rec) });
            return clone(rec);
        },

        update: function (id, patch) {
            var rec = this._find(id);
            if (!rec) return null;
            var clean = this._coerce(patch || {}, true);
            Object.keys(clean).forEach(function (k) { rec[k] = clean[k]; });
            this._commit({ type: 'update', id: rec.id, record: clone(rec) });
            return clone(rec);
        },

        remove: function (id) {
            var rec = this._find(id);
            if (!rec) return false;
            this._records = this._records.filter(function (r) { return r !== rec; });
            this._commit({ type: 'remove', id: rec.id, record: clone(rec) });
            return true;
        },

        duplicate: function (id) {
            var rec = this._find(id);
            if (!rec) return null;
            var copy = clone(rec);
            delete copy.id;
            if (!isBlank(copy.title)) copy.title = copy.title + ' (copy)';
            return this.insert(copy);
        },

        clear: function () {
            this._records = [];
            this._commit({ type: 'clear' });
        },

        addField: function (name, type) {
            var label = String(name || '').trim();
            var base = slug(label);
            if (!base) throw new Error('Mainkey: a field needs a name with letters or numbers!');
            var id = base, n = 2, self = this;
            while (this._fields.some(function (f) { return f.id === id; })) id = base + '_' + n++;
            var field = { id: id, name: label, type: FIELD_TYPES.indexOf(type) >= 0 ? type : 'text' };
            this._fields.push(field);
            this._commit({ type: 'addField', field: clone(field) });
            return clone(field);
        },

        removeField: function (id) {
            id = String(id);
            if (this._fields.length <= 1) throw new Error('Mainkey: keep at least one field!');
            var before = this._fields.length;
            this._fields = this._fields.filter(function (f) { return f.id !== id; });
            if (this._fields.length === before) return false;
            this._records.forEach(function (r) { delete r[id]; });
            this._commit({ type: 'removeField', field: { id: id } });
            return true;
        },

        // Throw away this visitor's edits and go back to the published file!
        revert: function () {
            var o = clone(this._original);
            this._fields = o.fields;
            this._records = o.records;
            this.edited = false;
            var ls = this._persist && storage();
            if (ls) { try { ls.removeItem(this._storeKey); } catch (e) {} }
            this._emit({ type: 'revert' }, false);
        },

        // Replace everything with another Mainkey document (object or .kb text)!
        replace: function (doc) {
            var self = this;
            var p = typeof doc === 'string' ? parseKB(doc) : Promise.resolve(doc);
            return p.then(function (d) {
                var n = normalize(d);
                self._fields = n.fields;
                self._records = n.records;
                self._commit({ type: 'replace' });
                return self;
            });
        },

        // --- events ---

        // subscribe(fn) → unsubscribe()! fn gets { type, id?, record?, field?, fromOtherTab? }!
        subscribe: function (fn) {
            var self = this;
            if (typeof fn !== 'function') throw new Error('Mainkey: subscribe() needs a function!');
            this._listeners.push(fn);
            return function () {
                self._listeners = self._listeners.filter(function (l) { return l !== fn; });
            };
        },

        on: function (event, fn) {
            if (event !== 'change') throw new Error('Mainkey: the only event is "change"!');
            return this.subscribe(fn);
        },

        // --- exporting ---

        toJSON: function () {
            return { app: this._app, version: this._version, fields: clone(this._fields), records: clone(this._records) };
        },

        // YAML when js-yaml is on the page, otherwise JSON (which is valid YAML too)!
        // Either way Mainkey's "Import .KB" button reads it!
        toKB: function () {
            var doc = this.toJSON();
            if (root.jsyaml && typeof root.jsyaml.dump === 'function') return root.jsyaml.dump(doc);
            return JSON.stringify(doc, null, 2);
        },

        toCSV: function () {
            var fs = this._fields;
            var lines = [fs.map(function (f) { return csvCell(f.name); }).join(',')];
            this._records.forEach(function (r) {
                lines.push(fs.map(function (f) { return csvCell(r[f.id]); }).join(','));
            });
            return lines.join('\n');
        },

        download: function (format, filename) {
            if (!hasDOM) throw new Error('Mainkey: download() needs a browser!');
            var csv = format === 'csv';
            var blob = new Blob([csv ? this.toCSV() : this.toKB()], { type: csv ? 'text/csv' : 'text/yaml' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename || (csv ? 'database.csv' : 'database.kb');
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        },

        // --- internals ---

        _find: function (id) {
            var key = String(id);
            for (var i = 0; i < this._records.length; i++) {
                if (String(this._records[i].id) === key) return this._records[i];
            }
            return null;
        },

        _idMap: function () {
            var m = {};
            this._records.forEach(function (r) { m[String(r.id)] = true; });
            return m;
        },

        // Numbers become numbers, empty number fields stay empty, unknown keys are kept!
        _coerce: function (data, partial) {
            var out = {};
            var types = {};
            this._fields.forEach(function (f) { types[f.id] = f.type; });
            Object.keys(data).forEach(function (k) {
                if (k === 'id') return;
                var v = data[k];
                if (types[k] === 'number') {
                    out[k] = isBlank(v) || isNaN(Number(v)) ? '' : Number(v);
                } else {
                    out[k] = v === undefined || v === null ? '' : (typeof v === 'object' ? v : String(v));
                }
            });
            if (!partial) {
                this._fields.forEach(function (f) { if (!(f.id in out)) out[f.id] = ''; });
            }
            return out;
        },

        _commit: function (change) {
            this.edited = true;
            this._save();
            this._emit(change, true);
        },

        _save: function () {
            var ls = this._persist && storage();
            if (!ls) return;
            try {
                ls.setItem(this._storeKey, JSON.stringify({
                    base: this._base, fields: this._fields, records: this._records
                }));
            } catch (e) { /* storage full: edits still live for this visit! */ }
        },

        _emit: function (change, notifyHook) {
            var self = this;
            this._listeners.slice().forEach(function (fn) {
                try { fn(change, self); } catch (e) { setTimeout(function () { throw e; }); }
            });
            if (notifyHook && typeof this._onChange === 'function') {
                try { this._onChange(change, this); } catch (e) { setTimeout(function () { throw e; }); }
            }
        },

        // Another tab edited the same database? Pick it up live!
        _watchOtherTabs: function () {
            var self = this;
            if (!this._persist || !hasDOM || !root.addEventListener) return;
            root.addEventListener('storage', function (e) {
                if (e.key !== self._storeKey) return;
                if (e.newValue === null) {
                    var o = clone(self._original);
                    self._fields = o.fields;
                    self._records = o.records;
                    self.edited = false;
                } else {
                    try {
                        var saved = JSON.parse(e.newValue);
                        if (saved.base !== self._base) return;
                        var n = normalize(saved);
                        self._fields = n.fields;
                        self._records = n.records;
                        self.edited = true;
                    } catch (err) { return; }
                }
                self._emit({ type: 'sync', fromOtherTab: true }, false);
            });
        }
    };

    // ---------- public loader ----------

    // load(source, options) → Promise<Database>!
    // source: a URL ('database.kb'), an inline element ('#my-db'), or a { fields, records } object!
    // options: { key, persist (default true), onChange(change, db) }
    function load(source, options) {
        options = options || {};
        var storeKey = storeKeyFor(source, options);
        var persist = options.persist !== false;
        var regKey = storeKey ? storeKey + (persist ? '' : '#nopersist') : null;
        if (regKey && registry[regKey]) return registry[regKey];

        var p = readSource(source).then(function (got) {
            var original = normalize(got.doc);
            var base = hash(JSON.stringify(original));
            var state = clone(original);
            var edited = false;
            var ls = persist && storeKey && storage();
            if (ls) {
                try {
                    var saved = JSON.parse(ls.getItem(storeKey) || 'null');
                    if (saved && saved.base === base) {
                        var n = normalize(saved);
                        state.fields = n.fields;
                        state.records = n.records;
                        edited = true;
                    } else if (saved) {
                        ls.removeItem(storeKey); // the site published a new file, start fresh!
                    }
                } catch (e) {}
            }
            return new Database(state, {
                original: original, base: base, storeKey: storeKey, persist: persist,
                onChange: options.onChange, source: typeof source === 'string' ? source : null, edited: edited
            });
        });
        if (regKey) {
            registry[regKey] = p;
            p.catch(function () { delete registry[regKey]; });
        }
        return p;
    }

    // ---------- the widget ----------

    var CSS = [
        '.mk-live{--mk-accent:#a305ff;--mk-accent-2:#c45eff;--mk-ink:#1e293b;--mk-muted:#64748b;--mk-line:rgba(163,5,255,.18);',
        'font-family:"JetBrains Mono",ui-monospace,"Segoe UI",monospace;font-size:13px;color:var(--mk-ink);box-sizing:border-box;',
        'background:linear-gradient(180deg,#fff 0%,#f6e6ff 100%);border:1px solid var(--mk-line);border-radius:14px;',
        'box-shadow:0 10px 30px rgba(40,0,70,.15);padding:12px;display:flex;flex-direction:column;gap:10px;position:relative;text-align:left}',
        '.mk-live *,.mk-live *::before,.mk-live *::after{box-sizing:border-box}',
        '.mk-live [hidden]{display:none!important}',
        '.mk-title{margin:0 2px;font-size:16px;font-weight:800;color:var(--mk-accent)}',
        '.mk-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
        '.mk-search{flex:1 1 180px;min-width:0;font:inherit;color:inherit;background:#fff;border:1px solid var(--mk-line);border-radius:8px;padding:7px 10px;outline:none}',
        '.mk-search:focus,.mk-input:focus{border-color:var(--mk-accent);box-shadow:0 0 0 3px rgba(163,5,255,.15)}',
        '.mk-count{font-size:11px;color:var(--mk-muted);white-space:nowrap}',
        '.mk-btn{font:inherit;font-size:12px;font-weight:700;color:var(--mk-ink);background:#fff;border:1px solid var(--mk-line);border-radius:8px;padding:6px 10px;cursor:pointer;white-space:nowrap}',
        '.mk-btn:hover{border-color:var(--mk-accent)}',
        '.mk-btn.mk-primary,.mk-btn[aria-pressed="true"]{color:#fff;border-color:transparent;background:linear-gradient(180deg,var(--mk-accent-2),var(--mk-accent));box-shadow:0 3px 10px rgba(163,5,255,.35)}',
        '.mk-btn.mk-danger{color:#b91c1c;border-color:rgba(239,68,68,.4)}',
        '.mk-seg{display:inline-flex;gap:4px}',
        '.mk-menu-wrap{position:relative}',
        '.mk-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:20;background:#fff;border:1px solid var(--mk-line);border-radius:10px;box-shadow:0 10px 25px rgba(40,0,70,.2);padding:4px;display:flex;flex-direction:column;min-width:190px}',
        '.mk-menu button{font:inherit;font-size:12px;text-align:left;background:none;border:0;border-radius:6px;padding:7px 10px;cursor:pointer;color:var(--mk-ink)}',
        '.mk-menu button:hover{background:rgba(163,5,255,.1)}',
        '.mk-body{overflow:auto;max-height:var(--mk-height,none);border-radius:10px}',
        '.mk-table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden}',
        '.mk-table th{background:linear-gradient(180deg,var(--mk-accent-2),var(--mk-accent));color:#fff;font-size:12px;text-align:left;padding:8px 10px;white-space:nowrap}',
        '.mk-table th button{all:unset;cursor:pointer;display:block;width:100%}',
        '.mk-table th button:focus-visible{outline:2px solid #fff;outline-offset:2px}',
        '.mk-table td{padding:7px 10px;border-bottom:1px solid var(--mk-line);vertical-align:top;overflow-wrap:anywhere}',
        '.mk-table tr:last-child td{border-bottom:0}',
        '.mk-table td.mk-num{text-align:right;font-variant-numeric:tabular-nums}',
        '.mk-acts{white-space:nowrap;text-align:right;width:1%}',
        '.mk-icon{font:inherit;background:none;border:0;cursor:pointer;padding:2px 4px;border-radius:5px}',
        '.mk-icon:hover{background:rgba(163,5,255,.12)}',
        '.mk-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}',
        '.mk-card{background:#fff;border:1px solid var(--mk-line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:5px;box-shadow:0 3px 10px rgba(40,0,70,.06)}',
        '.mk-card-title{font-weight:800;font-size:14px;overflow-wrap:anywhere}',
        '.mk-card-row{font-size:11px;color:var(--mk-muted);overflow-wrap:anywhere}',
        '.mk-card-row strong{color:var(--mk-ink)}',
        '.mk-card .mk-acts{text-align:left;margin-top:4px}',
        '.mk-tag{display:inline-block;white-space:nowrap;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;color:hsl(var(--h),70%,30%);background:hsl(var(--h),85%,92%);border:1px solid hsl(var(--h),60%,80%)}',
        '.mk-empty{padding:22px;text-align:center;color:var(--mk-muted);background:#fff;border-radius:10px}',
        '.mk-stats{font-size:11px;color:var(--mk-muted)}',
        '.mk-error{padding:14px;border-radius:10px;background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;font-size:13px}',
        '.mk-modal{position:fixed;inset:0;z-index:2147483000;background:rgba(15,0,30,.45);display:flex;align-items:center;justify-content:center;padding:16px}',
        '.mk-dialog{width:min(420px,100%);max-height:90vh;overflow:auto;background:linear-gradient(180deg,#fff,#f6e6ff);border-radius:14px;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px}',
        '.mk-dialog h3{margin:0;font-size:15px;color:var(--mk-accent)}',
        '.mk-label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:var(--mk-muted)}',
        '.mk-input{font:inherit;font-size:13px;color:var(--mk-ink);background:#fff;border:1px solid var(--mk-line);border-radius:8px;padding:7px 10px;outline:none}',
        '.mk-dialog-acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}',
        '.mk-dialog-acts .mk-danger{margin-right:auto}',
        '.mk-confirm{font-size:12px;color:#9f1239}'
    ].join('\n');

    function injectCSS() {
        if (!hasDOM || document.getElementById('mainkey-live-css')) return;
        var s = document.createElement('style');
        s.id = 'mainkey-live-css';
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function tagHue(v) {
        var h = 0, s = String(v);
        for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
        return h;
    }

    function round(n) { return Math.round(n * 100) / 100; }

    function attrBool(v, dflt) {
        if (v === undefined || v === null) return dflt;
        return !/^(false|0|no|off)$/i.test(String(v).trim());
    }

    function Widget(el, db, opts) {
        this.el = el;
        this.db = db;
        this.opts = opts;
        this.view = opts.view === 'cards' ? 'cards' : 'table';
        this.search = '';
        this.sort = null;
        this.dir = 'asc';
        this.editing = null; // null = closed, '' = new record, otherwise a record id!
        this._build();
        var self = this;
        this._unsub = db.subscribe(function () { self.render(); });
        this.render();
    }

    Widget.prototype = {
        _build: function () {
            var o = this.opts;
            var el = this.el;
            el.classList.add('mk-live');
            if (o.accent) el.style.setProperty('--mk-accent', o.accent), el.style.setProperty('--mk-accent-2', o.accent);
            if (o.height) el.style.setProperty('--mk-height', /^\d+$/.test(String(o.height)) ? o.height + 'px' : o.height);
            el.innerHTML =
                (o.title ? '<h2 class="mk-title">' + escapeHtml(o.title) + '</h2>' : '') +
                '<div class="mk-bar">' +
                    (o.search ? '<input class="mk-search" type="search" placeholder="Search records!" aria-label="Search records">' : '') +
                    '<span class="mk-count" aria-live="polite"></span>' +
                    '<span class="mk-seg" role="group" aria-label="View">' +
                        '<button type="button" class="mk-btn" data-act="view" data-view="table">Table</button>' +
                        '<button type="button" class="mk-btn" data-act="view" data-view="cards">Cards</button>' +
                    '</span>' +
                    (o.editable ? '<button type="button" class="mk-btn mk-primary" data-act="add">+ Add</button>' : '') +
                    (o.downloads || o.editable ? '<span class="mk-menu-wrap"><button type="button" class="mk-btn" data-act="menu" aria-haspopup="true" aria-expanded="false" title="More">⋯</button>' +
                        '<div class="mk-menu" hidden>' +
                            (o.downloads ? '<button type="button" data-act="dl-kb">Download .kb</button><button type="button" data-act="dl-csv">Download .csv</button>' : '') +
                            (o.editable ? '<button type="button" data-act="revert">Undo all my changes</button>' : '') +
                        '</div></span>' : '') +
                '</div>' +
                '<div class="mk-body"></div>' +
                '<div class="mk-stats"></div>' +
                '<div class="mk-modal" hidden></div>';
            this.$ = function (sel) { return el.querySelector(sel); };
            var self = this;
            this._onClick = function (e) { self._click(e); };
            this._onInput = function (e) {
                if (e.target.classList.contains('mk-search')) { self.search = e.target.value; self.render(); }
            };
            this._onKey = function (e) {
                if (e.key === 'Escape') { self._closeMenu(); if (self.editing !== null) self._closeForm(); }
            };
            this._onDocClick = function (e) { if (!el.contains(e.target)) self._closeMenu(); };
            this._onSubmit = function (e) { e.preventDefault(); self._saveForm(); };
            el.addEventListener('click', this._onClick);
            el.addEventListener('input', this._onInput);
            el.addEventListener('keydown', this._onKey);
            el.addEventListener('submit', this._onSubmit);
            document.addEventListener('click', this._onDocClick);
        },

        render: function () {
            var db = this.db;
            var rows = db.query({ search: this.search, sort: this.sort, dir: this.dir });
            var fields = db.fields;
            var self = this;

            this.el.querySelectorAll('[data-act="view"]').forEach(function (b) {
                b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === self.view));
            });
            this.$('.mk-count').textContent = rows.length === db.count
                ? db.count + (db.count === 1 ? ' record' : ' records')
                : rows.length + ' of ' + db.count + ' records';

            var body = this.$('.mk-body');
            if (rows.length === 0) {
                body.innerHTML = '<div class="mk-empty">' + (db.count === 0
                    ? 'No records yet!' + (this.opts.editable ? ' Click + Add to make one!' : '')
                    : 'No matching records! Try a different search!') + '</div>';
            } else {
                body.innerHTML = this.view === 'cards' ? this._cards(rows, fields) : this._table(rows, fields);
            }
            this._stats(rows, fields);
            if (this.editing !== null && this.editing !== '' && this.editing !== '__revert__' && !db.get(this.editing)) this._closeForm();
        },

        _cell: function (rec, f) {
            var v = rec[f.id];
            if (isBlank(v)) return '';
            if (f.type === 'tag') return '<span class="mk-tag" style="--h:' + tagHue(v) + '">' + escapeHtml(v) + '</span>';
            if (typeof v === 'object') return escapeHtml(JSON.stringify(v));
            return escapeHtml(v);
        },

        _actions: function (id) {
            if (!this.opts.editable) return '';
            var i = escapeHtml(id);
            return '<span class="mk-acts">' +
                '<button type="button" class="mk-icon" data-act="edit" data-id="' + i + '" title="Edit" aria-label="Edit">✏️</button>' +
                '<button type="button" class="mk-icon" data-act="dup" data-id="' + i + '" title="Duplicate" aria-label="Duplicate">📋</button>' +
                '<button type="button" class="mk-icon" data-act="del" data-id="' + i + '" title="Delete" aria-label="Delete">🗑️</button>' +
                '</span>';
        },

        _table: function (rows, fields) {
            var self = this;
            var head = fields.map(function (f) {
                var arrow = self.sort === f.id ? (self.dir === 'asc' ? ' ▲' : ' ▼') : '';
                var aria = self.sort === f.id ? (self.dir === 'asc' ? 'ascending' : 'descending') : 'none';
                return '<th aria-sort="' + aria + '"><button type="button" data-act="sort" data-field="' + escapeHtml(f.id) + '" title="Sort">' +
                    escapeHtml(f.name) + arrow + '</button></th>';
            }).join('') + (this.opts.editable ? '<th aria-label="Actions"></th>' : '');
            var body = rows.map(function (r) {
                return '<tr>' + fields.map(function (f) {
                    return '<td' + (f.type === 'number' ? ' class="mk-num"' : '') + '>' + self._cell(r, f) + '</td>';
                }).join('') + (self.opts.editable ? '<td class="mk-acts">' + self._actions(r.id) + '</td>' : '') + '</tr>';
            }).join('');
            return '<table class="mk-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
        },

        _cards: function (rows, fields) {
            var self = this;
            var titleField = fields.filter(function (f) { return f.id === 'title'; })[0] ||
                fields.filter(function (f) { return f.type === 'text'; })[0] || fields[0];
            return '<div class="mk-cards">' + rows.map(function (r) {
                var rest = fields.filter(function (f) { return f !== titleField; });
                return '<div class="mk-card">' +
                    '<div class="mk-card-title">' + (self._cell(r, titleField) || 'Untitled') + '</div>' +
                    rest.map(function (f) {
                        if (f.type === 'tag') return isBlank(r[f.id]) ? '' : '<div>' + self._cell(r, f) + '</div>';
                        return '<div class="mk-card-row"><strong>' + escapeHtml(f.name) + ':</strong> ' + self._cell(r, f) + '</div>';
                    }).join('') +
                    self._actions(r.id) +
                    '</div>';
            }).join('') + '</div>';
        },

        _stats: function (rows, fields) {
            var bar = this.$('.mk-stats');
            var db = this.db;
            if (rows.length === 0) { bar.textContent = ''; return; }
            var parts = [];
            fields.forEach(function (f) {
                if (f.type !== 'number') return;
                var s = db.stats(f.id, rows);
                if (s.count) parts.push(f.name + ': sum ' + round(s.sum) + ' / avg ' + round(s.avg) + ' / median ' + round(s.median));
            });
            var tag = fields.filter(function (f) { return f.type === 'tag'; })[0];
            if (tag) {
                var c = db.counts(tag.id, rows);
                delete c[''];
                var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0];
                if (top !== undefined) parts.push('top ' + tag.name.toLowerCase() + ': ' + top + ' (' + c[top] + ')');
            }
            bar.textContent = parts.join('  •  ');
        },

        _click: function (e) {
            var t = e.target.closest('[data-act]');
            if (!t || !this.el.contains(t)) return;
            var act = t.getAttribute('data-act');
            var id = t.getAttribute('data-id');
            var db = this.db;
            if (act !== 'menu') this._closeMenu();
            switch (act) {
                case 'view': this.view = t.getAttribute('data-view'); this.render(); break;
                case 'sort': {
                    var f = t.getAttribute('data-field');
                    if (this.sort === f) this.dir = this.dir === 'asc' ? 'desc' : 'asc';
                    else { this.sort = f; this.dir = 'asc'; }
                    this.render();
                    var again = this.el.querySelector('[data-act="sort"][data-field="' + cssEscape(f) + '"]');
                    if (again) again.focus();
                    break;
                }
                case 'add': this._openForm(''); break;
                case 'edit': this._openForm(id); break;
                case 'dup': db.duplicate(id); break;
                case 'del': this._openConfirm(id); break;
                case 'menu': this._toggleMenu(t); break;
                case 'dl-kb': db.download('kb'); break;
                case 'dl-csv': db.download('csv'); break;
                case 'revert': this._openRevert(); break;
                case 'cancel': this._closeForm(); break;
                case 'confirm-del': db.remove(this.editing); this._closeForm(); break;
                case 'confirm-revert': db.revert(); this._closeForm(); break;
                case 'ask-del': this._openConfirm(this.editing); break;
            }
        },

        _toggleMenu: function (btn) {
            var m = this.$('.mk-menu');
            m.hidden = !m.hidden;
            btn.setAttribute('aria-expanded', String(!m.hidden));
        },

        _closeMenu: function () {
            var m = this.$('.mk-menu');
            if (m && !m.hidden) {
                m.hidden = true;
                this.$('[data-act="menu"]').setAttribute('aria-expanded', 'false');
            }
        },

        _modal: function (html) {
            var m = this.$('.mk-modal');
            m.innerHTML = '<div class="mk-dialog" role="dialog" aria-modal="true">' + html + '</div>';
            m.hidden = false;
            this._lastFocus = document.activeElement;
            var first = m.querySelector('input, button.mk-primary, button');
            if (first) first.focus();
        },

        _openForm: function (id) {
            var rec = id === '' ? null : this.db.get(id);
            if (id !== '' && !rec) return;
            this.editing = id;
            var inputs = this.db.fields.map(function (f, i) {
                var v = rec && !isBlank(rec[f.id]) ? rec[f.id] : '';
                if (typeof v === 'object') v = JSON.stringify(v);
                return '<label class="mk-label">' + escapeHtml(f.name) +
                    '<input class="mk-input" name="f' + i + '" type="' + (f.type === 'number' ? 'number' : 'text') + '"' +
                    (f.type === 'number' ? ' step="any"' : '') + ' value="' + escapeHtml(v) + '"></label>';
            }).join('');
            this._modal('<form><h3>' + (rec ? 'Edit record' : 'Add record') + '</h3>' +
                '<div style="display:flex;flex-direction:column;gap:8px;margin:10px 0">' + inputs + '</div>' +
                '<div class="mk-dialog-acts">' +
                    (rec ? '<button type="button" class="mk-btn mk-danger" data-act="ask-del">Delete</button>' : '') +
                    '<button type="button" class="mk-btn" data-act="cancel">Cancel</button>' +
                    '<button type="submit" class="mk-btn mk-primary">Save</button>' +
                '</div></form>');
        },

        _saveForm: function () {
            var form = this.$('.mk-modal form');
            if (!form) return;
            var data = {};
            this.db.fields.forEach(function (f, i) {
                var input = form.querySelector('[name="f' + i + '"]');
                if (input) data[f.id] = input.value;
            });
            var id = this.editing;
            this._closeForm();
            if (id === '') this.db.insert(data); else this.db.update(id, data);
        },

        _openConfirm: function (id) {
            var rec = this.db.get(id);
            if (!rec) return;
            this.editing = id;
            var fields = this.db.fields;
            var name = !isBlank(rec.title) ? rec.title : rec[fields[0].id];
            this._modal('<h3>Delete this record?</h3>' +
                '<div class="mk-confirm">' + (isBlank(name) ? 'This record' : '“' + escapeHtml(name) + '”') + ' will be removed!</div>' +
                '<div class="mk-dialog-acts">' +
                    '<button type="button" class="mk-btn" data-act="cancel">Keep it</button>' +
                    '<button type="button" class="mk-btn mk-primary" data-act="confirm-del">Delete</button>' +
                '</div>');
        },

        _openRevert: function () {
            this.editing = '__revert__';
            this._modal('<h3>Undo all your changes?</h3>' +
                '<div class="mk-confirm">This brings back the original published database!</div>' +
                '<div class="mk-dialog-acts">' +
                    '<button type="button" class="mk-btn" data-act="cancel">Keep my changes</button>' +
                    '<button type="button" class="mk-btn mk-primary" data-act="confirm-revert">Undo changes</button>' +
                '</div>');
        },

        _closeForm: function () {
            var m = this.$('.mk-modal');
            m.hidden = true;
            m.innerHTML = '';
            this.editing = null;
            if (this._lastFocus && this._lastFocus.focus && document.contains(this._lastFocus)) this._lastFocus.focus();
        },

        destroy: function () {
            this._unsub();
            this.el.removeEventListener('click', this._onClick);
            this.el.removeEventListener('input', this._onInput);
            this.el.removeEventListener('keydown', this._onKey);
            this.el.removeEventListener('submit', this._onSubmit);
            document.removeEventListener('click', this._onDocClick);
            this.el.classList.remove('mk-live');
            this.el.innerHTML = '';
            delete this.el.mainkey;
        }
    };

    function cssEscape(s) {
        return root.CSS && root.CSS.escape ? root.CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
    }

    function widgetOptions(el, opts) {
        var d = el.dataset || {};
        opts = opts || {};
        return {
            view: opts.view || d.mainkeyView || 'table',
            editable: opts.editable !== undefined ? !!opts.editable : attrBool(d.mainkeyEditable, true),
            search: opts.search !== undefined ? !!opts.search : attrBool(d.mainkeySearch, true),
            downloads: opts.downloads !== undefined ? !!opts.downloads : attrBool(d.mainkeyDownloads, true),
            title: opts.title !== undefined ? opts.title : (d.mainkeyTitle || ''),
            accent: opts.accent || d.mainkeyAccent || '',
            height: opts.height || d.mainkeyHeight || '',
            key: opts.key || d.mainkeyKey || undefined,
            persist: opts.persist !== undefined ? opts.persist : attrBool(d.mainkeyPersist, true),
            onChange: opts.onChange
        };
    }

    // mount(target, source | db, options) → Promise<Widget>!
    function mount(target, source, opts) {
        if (!hasDOM) return Promise.reject(new Error('Mainkey: mount() needs a browser!'));
        var el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return Promise.reject(new Error('Mainkey: no element matches ' + target + '!'));
        if (el.mainkey && el.mainkey.widget) return Promise.resolve(el.mainkey.widget);
        injectCSS();
        var o = widgetOptions(el, opts);
        var src = source !== undefined && source !== null ? source : el.getAttribute('data-mainkey');
        var dbp = src instanceof Database ? Promise.resolve(src)
            : load(src, { key: o.key, persist: o.persist, onChange: o.onChange });
        var pending = { widget: null };
        el.mainkey = pending;
        el.classList.add('mk-live');
        el.setAttribute('aria-busy', 'true');
        if (!el.innerHTML.trim()) el.innerHTML = '<div class="mk-empty">Loading database!</div>';
        return dbp.then(function (db) {
            el.removeAttribute('aria-busy');
            var w = new Widget(el, db, o);
            pending.widget = w;
            pending.db = db;
            return w;
        }, function (err) {
            el.removeAttribute('aria-busy');
            el.innerHTML = '<div class="mk-error">' + escapeHtml(err && err.message ? err.message : err) + '</div>';
            delete el.mainkey;
            throw err;
        });
    }

    // Mount every [data-mainkey] element on the page that isn't live yet!
    function scan(rootEl) {
        if (!hasDOM) return [];
        var els = (rootEl || document).querySelectorAll('[data-mainkey]');
        return Array.prototype.map.call(els, function (el) {
            if (el.mainkey) return Promise.resolve(el.mainkey.widget);
            return mount(el).catch(function (err) {
                if (root.console) console.error(err);
                return null;
            });
        });
    }

    var Mainkey = {
        version: VERSION,
        load: load,
        mount: mount,
        scan: scan,
        parse: function (text) { return parseKB(text).then(normalize); },
        Database: Database
    };

    root.Mainkey = Mainkey;
    if (typeof module !== 'undefined' && module.exports) module.exports = Mainkey;

    if (hasDOM) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); });
        else setTimeout(function () { scan(); }, 0);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
