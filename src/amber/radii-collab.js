/* =====================================================================
   Radii Collab! Live co-editing, presence + cursors, comments and chat
   for Writeout, Amber, Imbuer and Bitbook, with NO database!

   How: browsers meet on the same free public MQTT relays Phosphor and
   Antimony use (central relay + automatic backups). Everything a room
   sends is end-to-end encrypted (AES-GCM) with a key that lives ONLY in
   the invite link's #fragment, which browsers never send to any server.
   The relays just pass sealed envelopes along!

   The document is a map of small "units" (a paragraph, a cell, a slide
   object...) and each unit is last-writer-wins with a Lamport clock, so
   edits to DIFFERENT units merge cleanly and edits to the SAME unit
   settle the same way on every screen. A sealed snapshot is also kept on
   the relay (retained), so a room can be reopened when nobody is online!

   Each app plugs in an adapter (see collab-*.js). Identical copy in each
   app folder (Tauri bundles one folder) - keep the copies in sync!
   ===================================================================== */
(function () {
    'use strict';

    const ROOT = 'radii-office/v1';
    // Same meeting points as Phosphor + Antimony: everyone prefers the first!
    const BROKERS = [
        'wss://mqtt.eclipseprojects.io:443/mqtt',
        'wss://broker.emqx.io:8084/mqtt',
        'wss://broker.hivemq.com:8884/mqtt',
        'wss://test.mosquitto.org:8081/mqtt'
    ];
    const PHOSPHOR_ROOT = 'radii-phosphor/v1';
    const ANTIMONY_ROOT = 'radii-antimony/v1';
    const AW_MS = 2500;          // presence heartbeat!
    const PEER_TTL = 9000;       // a peer vanishes after this much silence!
    const CHUNK_CHARS = 48000;   // big envelopes ride in pieces (relay-friendly)!
    const SNAPSHOT_MAX = 900000; // retained snapshot ceiling (sealed + compressed)!
    const COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5'];

    /* ---------- Tiny MQTT 3.1.1 over WebSocket (a port of Phosphor's mqtt.js!) ---------- */
    const enc = new TextEncoder(), dec = new TextDecoder();
    function mStr(s) { const b = enc.encode(s); const o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
    function mLen(n) { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; o.push(b); } while (n > 0); return new Uint8Array(o); }
    function cat(parts) { let n = 0; parts.forEach(function (p) { n += p.length; }); const o = new Uint8Array(n); let i = 0; parts.forEach(function (p) { o.set(p, i); i += p.length; }); return o; }
    function pkt(head, body) { return cat([new Uint8Array([head]), mLen(body.length), body]); }

    function Mqtt(url, clientId, will) {
        this.url = url; this.clientId = clientId; this.will = will;
        this.buf = new Uint8Array(0); this.pid = 1; this.connected = false;
    }
    Mqtt.prototype.connect = function () {
        const self = this;
        this.ws = new WebSocket(this.url, 'mqtt');
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = function () {
            let flags = 0x02;
            if (self.will) flags |= 0x04 | (self.will.retain ? 0x20 : 0);
            const parts = [new Uint8Array([0, 4, 77, 81, 84, 84, 4, flags, 0, 60]), mStr(self.clientId)];
            if (self.will) { parts.push(mStr(self.will.topic)); parts.push(mStr(self.will.message)); }
            self.ws.send(pkt(0x10, cat(parts)));
        };
        this.ws.onmessage = function (e) {
            const chunk = new Uint8Array(e.data);
            const j = new Uint8Array(self.buf.length + chunk.length);
            j.set(self.buf, 0); j.set(chunk, self.buf.length);
            let o = 0;
            while (o + 2 <= j.length) {
                let mult = 1, len = 0, i = 1, b = 0;
                do { if (o + i >= j.length) { len = -1; break; } b = j[o + i]; len += (b & 127) * mult; mult *= 128; i++; } while (b & 128);
                if (len < 0 || o + i + len > j.length) break;
                self.handle(j[o], j.slice(o + i, o + i + len));
                o += i + len;
            }
            self.buf = j.slice(o);
        };
        this.ws.onclose = function () { self.connected = false; clearInterval(self.ping); if (self.onclose) self.onclose(); };
        this.ws.onerror = function () { if (self.onerror) self.onerror(); };
    };
    Mqtt.prototype.handle = function (head, body) {
        const type = head >> 4;
        if (type === 2) {
            if (body[1] === 0) {
                this.connected = true;
                const self = this;
                this.ping = setInterval(function () { try { self.ws.send(new Uint8Array([0xc0, 0])); } catch (e) {} }, 25000);
                if (this.onopen) this.onopen();
            } else if (this.onerror) this.onerror();
        } else if (type === 3) {
            const qos = (head >> 1) & 3;
            const tl = (body[0] << 8) | body[1];
            const topic = dec.decode(body.slice(2, 2 + tl));
            const payload = dec.decode(body.slice(2 + tl + (qos ? 2 : 0)));
            if (this.onmessage) this.onmessage(topic, payload);
        }
    };
    Mqtt.prototype.subscribe = function (topics) {
        const id = (this.pid++ % 60000) + 1;
        const parts = [new Uint8Array([id >> 8, id & 255])];
        topics.forEach(function (t) { parts.push(mStr(t)); parts.push(new Uint8Array([0])); });
        this.ws.send(pkt(0x82, cat(parts)));
    };
    Mqtt.prototype.unsubscribe = function (topics) {
        const id = (this.pid++ % 60000) + 1;
        const parts = [new Uint8Array([id >> 8, id & 255])];
        topics.forEach(function (t) { parts.push(mStr(t)); });
        this.ws.send(pkt(0xa2, cat(parts)));
    };
    Mqtt.prototype.publish = function (topic, payload, retain) {
        this.ws.send(pkt(0x30 | (retain ? 1 : 0), cat([mStr(topic), enc.encode(payload)])));
    };
    Mqtt.prototype.close = function () {
        clearInterval(this.ping);
        try { this.ws.send(new Uint8Array([0xe0, 0])); } catch (e) {}
        try { this.ws.close(); } catch (e) {}
    };

    /* ---------- A link to EVERY relay at once (like Phosphor)! ----------
       We listen on all of them and publish to every live one, so two people
       always share at least one relay, even when some are blocked or down! */
    const relay = {
        links: [], subs: new Set(), handlers: [], want: false,
        start: function () {
            if (this.want) return;
            this.want = true;
            const self = this;
            this.links = BROKERS.map(function (url) { return { url: url, mq: null, live: false, tries: 0, timer: null }; });
            this.links.forEach(function (L) { self.open(L); });
        },
        open: function (L) {
            const self = this;
            clearTimeout(L.timer);
            if (!this.want) return;
            let mq;
            try { mq = new Mqtt(L.url, 'rc_' + Math.random().toString(36).slice(2, 12), null); mq.connect(); }
            catch (e) { this.retry(L); return; }
            L.mq = mq;
            const giveUp = setTimeout(function () { if (!mq.connected) { try { mq.close(); } catch (e) {} } }, 9000);
            mq.onopen = function () {
                clearTimeout(giveUp);
                L.live = true;
                L.tries = 0;
                if (self.subs.size) mq.subscribe([...self.subs]);
                ui.status();
                self.handlers.forEach(function (h) { if (h.open) h.open(L); });
            };
            mq.onmessage = function (t, p) { self.handlers.forEach(function (h) { if (h.msg) h.msg(t, p); }); };
            mq.onclose = function () {
                clearTimeout(giveUp);
                L.live = false;
                if (L.mq === mq) { L.mq = null; ui.status(); self.retry(L); }
            };
            mq.onerror = function () {};
        },
        retry: function (L) {
            if (!this.want) return;
            L.tries++;
            const self = this;
            L.timer = setTimeout(function () { self.open(L); }, Math.min(30000, 1500 * L.tries));
        },
        stop: function () {
            this.want = false;
            this.links.forEach(function (L) {
                clearTimeout(L.timer);
                if (L.mq) { const m = L.mq; L.mq = null; L.live = false; try { m.close(); } catch (e) {} }
            });
            ui.status();
        },
        liveLinks: function () { return this.links.filter(function (L) { return L.live && L.mq && L.mq.connected; }); },
        live: function () { return this.liveLinks().length > 0; },
        host: function () { const L = this.liveLinks()[0]; try { return L ? new URL(L.url).hostname : ''; } catch (e) { return ''; } },
        hosts: function () { return this.liveLinks().map(function (L) { try { return new URL(L.url).hostname; } catch (e) { return '?'; } }); },
        sub: function (topics) {
            const self = this;
            topics.forEach(function (t) { self.subs.add(t); });
            this.liveLinks().forEach(function (L) { try { L.mq.subscribe(topics); } catch (e) {} });
        },
        unsub: function (topics) {
            const self = this;
            topics.forEach(function (t) { self.subs.delete(t); });
            this.liveLinks().forEach(function (L) { try { L.mq.unsubscribe(topics); } catch (e) {} });
        },
        pub: function (topic, payload, retain) {
            let ok = false;
            this.liveLinks().forEach(function (L) { try { L.mq.publish(topic, payload, retain); ok = true; } catch (e) {} });
            return ok;
        }
    };
    // The same envelope arrives once per relay: keep only the first copy!
    const seenEnv = new Set();
    function firstCopy(key) {
        if (seenEnv.has(key)) return false;
        seenEnv.add(key);
        if (seenEnv.size > 800) { const it = seenEnv.values(); for (let i = 0; i < 300; i++) seenEnv.delete(it.next().value); }
        return true;
    }

    /* ---------- Sealed envelopes: gzip + AES-GCM, key from the #fragment ---------- */
    const b64u = {
        enc: function (bytes) { let s = ''; const ch = 0x8000; for (let i = 0; i < bytes.length; i += ch) s += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
        dec: function (str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
    };
    async function gz(bytes, inflate) {
        if (typeof CompressionStream === 'undefined') return null;
        const stream = new Blob([bytes]).stream().pipeThrough(inflate ? new DecompressionStream('gzip') : new CompressionStream('gzip'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    async function importKey(raw) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
    async function seal(obj) {
        let data = enc.encode(JSON.stringify(obj));
        let flag = 0;
        if (data.length > 600) { const z = await gz(data); if (z && z.length < data.length) { data = z; flag = 1; } }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, room.key, data));
        return flag + '.' + b64u.enc(iv) + '.' + b64u.enc(ct);
    }
    async function unseal(str) {
        const p = String(str).split('.');
        if (p.length !== 3) return null;
        let data = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.dec(p[1]) }, room.key, b64u.dec(p[2])));
        if (p[0] === '1') data = await gz(data, true);
        return JSON.parse(dec.decode(data));
    }

    /* ---------- Identity (shares your Phosphor name when you have one!) ---------- */
    function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    /* ---------- Keydown in messages: =Y=gel=Y=, **bold**, ~W~wave~W~, #C#chip# and 570+ more! ---------- */
    const KD_MACROS = [["~PASTEL~","~PASTEL~","mkt-pastel-pop",""],["~CHROME~","~CHROME~","mkt-chrome-capsule",""],["~MATCHA~","~MATCHA~","mkt-kp-matcha",""],["~WD-PK~","~","droplet-fuchsia",""],["~WD-PR~","~","droplet-amethyst",""],["~WD-SL~","~","droplet-slate",""],["~GB-PR~","~","megachip-glass-bracket bracket-amethyst",""],["~GB-PK~","~","megachip-glass-bracket bracket-fuchsia",""],["~CN-SL~","~","megachip-circuit-node circuit-slate",""],["~CN-GL~","~","megachip-circuit-node circuit-gold",""],["~DH-PR~","~","aero-duplex-input-chassis duplex-chassis-amethyst",""],["~SH-PR~","~","gel-chip-swayed swayed-amethyst",""],["~PH-PR~","~","gel-chip-pill-variant pill-amethyst",""],["~PC-PK~","~","gel-chip-pastel pastel-pink",""],["~PC-PR~","~","gel-chip-pastel pastel-purple",""],["~DR-PR~","~","gel-chip-droplet-ribbon droplet-ribbon-amethyst",""],["~DR-PK~","~","gel-chip-droplet-ribbon droplet-ribbon-fuchsia",""],["~DR-SL~","~","gel-chip-droplet-ribbon droplet-ribbon-slate",""],["~GRAPE~","~GRAPE~","mkt-kp-grape",""],["~LEMON~","~LEMON~","mkt-kp-lemon",""],["~NIGHT~","~NIGHT~","mkt-kp-night",""],["~CANDY~","~CANDY~","mkt-kp-candy",""],["~FROST~","~FROST~","mkt-kp-frost",""],["~STICK~","~STICK~","mkt-kp-stick",""],["~WD-Y~","~","droplet-amber",""],["~WD-R~","~","droplet-crimson",""],["~WD-O~","~","droplet-tangerine",""],["~FUNC~","~FUNC~","dev-chip-function",""],["~PP-C~","~","megachip-plasma plasma-cyan",""],["~PP-O~","~","megachip-plasma plasma-orange",""],["~PP-R~","~","megachip-plasma plasma-crimson",""],["~PP-L~","~","megachip-plasma plasma-lime",""],["~GB-B~","~","megachip-glass-bracket bracket-blue",""],["~GB-Y~","~","megachip-glass-bracket bracket-amber",""],["~CN-T~","~","megachip-circuit-node circuit-teal",""],["~CN-R~","~","megachip-circuit-node circuit-ruby",""],["~B-PR~","~","aero-glass-badge-chip badge-frame-amethyst",""],["~B-PK~","~","aero-glass-badge-chip badge-frame-rose",""],["~DH-B~","~","aero-duplex-input-chassis duplex-chassis-sky",""],["~DH-G~","~","aero-duplex-input-chassis duplex-chassis-emerald",""],["~DH-O~","~","aero-duplex-input-chassis duplex-chassis-orange",""],["~SH-B~","~","gel-chip-swayed swayed-sky",""],["~SH-G~","~","gel-chip-swayed swayed-emerald",""],["~SH-O~","~","gel-chip-swayed swayed-orange",""],["~PH-B~","~","gel-chip-pill-variant pill-sky",""],["~PH-G~","~","gel-chip-pill-variant pill-emerald",""],["~PH-O~","~","gel-chip-pill-variant pill-orange",""],["~PC-Y~","~","gel-chip-pastel pastel-yellow",""],["~PC-B~","~","gel-chip-pastel pastel-blue",""],["~PC-G~","~","gel-chip-pastel pastel-green",""],["~PC-O~","~","gel-chip-pastel pastel-orange",""],["~DR-O~","~","gel-chip-droplet-ribbon droplet-ribbon-tangerine",""],["~DR-Y~","~","gel-chip-droplet-ribbon droplet-ribbon-citrus",""],["~DR-G~","~","gel-chip-droplet-ribbon droplet-ribbon-emerald",""],["~DR-B~","~","gel-chip-droplet-ribbon droplet-ribbon-sapphire",""],["~DR-R~","~","gel-chip-droplet-ribbon droplet-ribbon-crimson",""],["~HOLO~","~HOLO~","mkt-holo-chip",""],["~SEAL~","~SEAL~","mkt-crimson-seal",""],["~FOAM~","~FOAM~","mkt-kp-foam",""],["~LAVA~","~LAVA~","mkt-kp-lava",""],["~GOLD~","~GOLD~","mkt-kp-gold",""],["~MINT~","~MINT~","mkt-kp-mint",""],["~OR10~","~OR10~","orange-hl-10",""],["~OR11~","~OR11~","orange-hl-11",""],["~OR12~","~OR12~","orange-hl-12",""],["~OR13~","~OR13~","orange-hl-13",""],["~OR14~","~OR14~","orange-hl-14",""],["~OR15~","~OR15~","orange-hl-15",""],["~OR16~","~OR16~","orange-hl-16",""],["~OR17~","~OR17~","orange-hl-17",""],["~OR18~","~OR18~","orange-hl-18",""],["~OR19~","~OR19~","orange-hl-19",""],["~OR20~","~OR20~","orange-hl-20",""],["~OR21~","~OR21~","orange-hl-21",""],["~OR22~","~OR22~","orange-hl-22",""],["~OR23~","~OR23~","orange-hl-23",""],["~OR24~","~OR24~","orange-hl-24",""],["~OR25~","~OR25~","orange-hl-25",""],["~OR26~","~OR26~","orange-hl-26",""],["~OR27~","~OR27~","orange-hl-27",""],["~OR28~","~OR28~","orange-hl-28",""],["~OR29~","~OR29~","orange-hl-29",""],["~OR30~","~OR30~","orange-hl-30",""],["~OR31~","~OR31~","orange-hl-31",""],["~OR32~","~OR32~","orange-hl-32",""],["~OR33~","~OR33~","orange-hl-33",""],["~OR34~","~OR34~","orange-hl-34",""],["~OR35~","~OR35~","orange-hl-35",""],["~OR36~","~OR36~","orange-hl-36",""],["~OR37~","~OR37~","orange-hl-37",""],["~OR38~","~OR38~","orange-hl-38",""],["~OR39~","~OR39~","orange-hl-39",""],["~OR40~","~OR40~","orange-hl-40",""],["~OR41~","~OR41~","orange-hl-41",""],["~OR42~","~OR42~","orange-hl-42",""],["~OR43~","~OR43~","orange-hl-43",""],["~OR44~","~OR44~","orange-hl-44",""],["~OR45~","~OR45~","orange-hl-45",""],["~OR46~","~OR46~","orange-hl-46",""],["~OR47~","~OR47~","orange-hl-47",""],["~OR48~","~OR48~","orange-hl-48",""],["~OR49~","~OR49~","orange-hl-49",""],["~OR50~","~OR50~","orange-hl-50",""],["~GR10~","~GR10~","green-hl-10",""],["~GR11~","~GR11~","green-hl-11",""],["~GR12~","~GR12~","green-hl-12",""],["~GR13~","~GR13~","green-hl-13",""],["~GR14~","~GR14~","green-hl-14",""],["~GR15~","~GR15~","green-hl-15",""],["~GR16~","~GR16~","green-hl-16",""],["~GR17~","~GR17~","green-hl-17",""],["~GR18~","~GR18~","green-hl-18",""],["~GR19~","~GR19~","green-hl-19",""],["~GR20~","~GR20~","green-hl-20",""],["~GR21~","~GR21~","green-hl-21",""],["~GR22~","~GR22~","green-hl-22",""],["~GR23~","~GR23~","green-hl-23",""],["~GR24~","~GR24~","green-hl-24",""],["~GR25~","~GR25~","green-hl-25",""],["~GR26~","~GR26~","green-hl-26",""],["~GR27~","~GR27~","green-hl-27",""],["~GR28~","~GR28~","green-hl-28",""],["~GR29~","~GR29~","green-hl-29",""],["~GR30~","~GR30~","green-hl-30",""],["~GR31~","~GR31~","green-hl-31",""],["~GR32~","~GR32~","green-hl-32",""],["~GR33~","~GR33~","green-hl-33",""],["~GR34~","~GR34~","green-hl-34",""],["~GR35~","~GR35~","green-hl-35",""],["~GR36~","~GR36~","green-hl-36",""],["~GR37~","~GR37~","green-hl-37",""],["~GR38~","~GR38~","green-hl-38",""],["~GR39~","~GR39~","green-hl-39",""],["~GR40~","~GR40~","green-hl-40",""],["~GR41~","~GR41~","green-hl-41",""],["~GR42~","~GR42~","green-hl-42",""],["~GR43~","~GR43~","green-hl-43",""],["~GR44~","~GR44~","green-hl-44",""],["~GR45~","~GR45~","green-hl-45",""],["~GR46~","~GR46~","green-hl-46",""],["~GR47~","~GR47~","green-hl-47",""],["~GR48~","~GR48~","green-hl-48",""],["~GR49~","~GR49~","green-hl-49",""],["~GR50~","~GR50~","green-hl-50",""],["~BL10~","~BL10~","blue-hl-10",""],["~BL11~","~BL11~","blue-hl-11",""],["~BL12~","~BL12~","blue-hl-12",""],["~BL13~","~BL13~","blue-hl-13",""],["~BL14~","~BL14~","blue-hl-14",""],["~BL15~","~BL15~","blue-hl-15",""],["~BL16~","~BL16~","blue-hl-16",""],["~BL17~","~BL17~","blue-hl-17",""],["~BL18~","~BL18~","blue-hl-18",""],["~BL19~","~BL19~","blue-hl-19",""],["~BL20~","~BL20~","blue-hl-20",""],["~BL21~","~BL21~","blue-hl-21",""],["~BL22~","~BL22~","blue-hl-22",""],["~BL23~","~BL23~","blue-hl-23",""],["~BL24~","~BL24~","blue-hl-24",""],["~BL25~","~BL25~","blue-hl-25",""],["~BL26~","~BL26~","blue-hl-26",""],["~BL27~","~BL27~","blue-hl-27",""],["~BL28~","~BL28~","blue-hl-28",""],["~BL29~","~BL29~","blue-hl-29",""],["~BL30~","~BL30~","blue-hl-30",""],["~BL31~","~BL31~","blue-hl-31",""],["~BL32~","~BL32~","blue-hl-32",""],["~BL33~","~BL33~","blue-hl-33",""],["~BL34~","~BL34~","blue-hl-34",""],["~BL35~","~BL35~","blue-hl-35",""],["~BL36~","~BL36~","blue-hl-36",""],["~BL37~","~BL37~","blue-hl-37",""],["~BL38~","~BL38~","blue-hl-38",""],["~BL39~","~BL39~","blue-hl-39",""],["~BL40~","~BL40~","blue-hl-40",""],["~BL41~","~BL41~","blue-hl-41",""],["~BL42~","~BL42~","blue-hl-42",""],["~BL43~","~BL43~","blue-hl-43",""],["~BL44~","~BL44~","blue-hl-44",""],["~BL45~","~BL45~","blue-hl-45",""],["~BL46~","~BL46~","blue-hl-46",""],["~BL47~","~BL47~","blue-hl-47",""],["~BL48~","~BL48~","blue-hl-48",""],["~BL49~","~BL49~","blue-hl-49",""],["~BL50~","~BL50~","blue-hl-50",""],["~PU10~","~PU10~","pool-hl-10",""],["~PU11~","~PU11~","pool-hl-11",""],["~PU12~","~PU12~","pool-hl-12",""],["~PU13~","~PU13~","pool-hl-13",""],["~PU14~","~PU14~","pool-hl-14",""],["~PU15~","~PU15~","pool-hl-15",""],["~PU16~","~PU16~","pool-hl-16",""],["~PU17~","~PU17~","pool-hl-17",""],["~PU18~","~PU18~","pool-hl-18",""],["~PU19~","~PU19~","pool-hl-19",""],["~PU20~","~PU20~","pool-hl-20",""],["~PU21~","~PU21~","pool-hl-21",""],["~PU22~","~PU22~","pool-hl-22",""],["~PU23~","~PU23~","pool-hl-23",""],["~PU24~","~PU24~","pool-hl-24",""],["~PU25~","~PU25~","pool-hl-25",""],["~PU26~","~PU26~","pool-hl-26",""],["~PU27~","~PU27~","pool-hl-27",""],["~PU28~","~PU28~","pool-hl-28",""],["~PU29~","~PU29~","pool-hl-29",""],["~PU30~","~PU30~","pool-hl-30",""],["~PU31~","~PU31~","pool-hl-31",""],["~PU32~","~PU32~","pool-hl-32",""],["~PU33~","~PU33~","pool-hl-33",""],["~PU34~","~PU34~","pool-hl-34",""],["~PU35~","~PU35~","pool-hl-35",""],["~PU36~","~PU36~","pool-hl-36",""],["~PU37~","~PU37~","pool-hl-37",""],["~PU38~","~PU38~","pool-hl-38",""],["~PU39~","~PU39~","pool-hl-39",""],["~PU40~","~PU40~","pool-hl-40",""],["~PU41~","~PU41~","pool-hl-41",""],["~PU42~","~PU42~","pool-hl-42",""],["~PU43~","~PU43~","pool-hl-43",""],["~PU44~","~PU44~","pool-hl-44",""],["~PU45~","~PU45~","pool-hl-45",""],["~PU46~","~PU46~","pool-hl-46",""],["~PU47~","~PU47~","pool-hl-47",""],["~PU48~","~PU48~","pool-hl-48",""],["~PU49~","~PU49~","pool-hl-49",""],["~PU50~","~PU50~","pool-hl-50",""],["~BP10~","~BP10~","bcp-marker",""],["~PL10~","~PL10~","pill-hl-sky",""],["~PL11~","~PL11~","pill-hl-blue",""],["~PL12~","~PL12~","pill-hl-indigo",""],["~PL13~","~PL13~","pill-hl-violet",""],["~PL14~","~PL14~","pill-hl-fuchsia",""],["~PL15~","~PL15~","pill-hl-pink",""],["~PL16~","~PL16~","pill-hl-slate",""],["~PS10~","~PS10~","mkt-pool-fusion",""],["~AU10~","~AU10~","mkt-autumn-orchard",""],["~WN10~","~WN10~","mkt-winter-cranberry",""],["~FR10~","~FR10~","mkt-fruit-peach",""],["~FR11~","~FR11~","mkt-fruit-pear",""],["~FR12~","~FR12~","mkt-fruit-plum",""],["~FR13~","~FR13~","mkt-fruit-kiwi",""],["~FR14~","~FR14~","mkt-fruit-pineapple",""],["~FR15~","~FR15~","mkt-fruit-watermelon",""],["~FR16~","~FR16~","mkt-fruit-banana",""],["~FR17~","~FR17~","mkt-fruit-coconut",""],["~FR18~","~FR18~","mkt-fruit-raspberry",""],["~FR19~","~FR19~","mkt-fruit-blackberry",""],["~FR20~","~FR20~","mkt-fruit-pomegranate",""],["~HK10~","~HK10~","mkt-hacker-panic",""],["~HK11~","~HK11~","mkt-hacker-null",""],["~HK12~","~HK12~","mkt-hacker-bitflip",""],["~HK13~","~HK13~","mkt-hacker-firewall",""],["~HK14~","~HK14~","mkt-hacker-darknet",""],["~HK15~","~HK15~","mkt-hacker-sniffer",""],["~HK16~","~HK16~","mkt-hacker-overclock",""],["~HK17~","~HK17~","mkt-hacker-leak",""],["~HK18~","~HK18~","mkt-hacker-zeroday",""],["~HK19~","~HK19~","mkt-hacker-backdoor",""],["~HK20~","~HK20~","mkt-hacker-cipher",""],["~HK21~","~HK21~","mkt-hacker-daemon",""],["~HK22~","~HK22~","mkt-hacker-fork",""],["~HK23~","~HK23~","mkt-hacker-segfault",""],["~HK24~","~HK24~","mkt-hacker-uptime",""],["~HK25~","~HK25~","mkt-hacker-latency",""],["~HK26~","~HK26~","mkt-hacker-mainframe",""],["~HK27~","~HK27~","mkt-hacker-punchcard",""],["~HK28~","~HK28~","mkt-hacker-turing",""],["~HK29~","~HK29~","mkt-hacker-quantum",""],["~HK30~","~HK30~","mkt-hacker-sudo",""],["~MG10~","~MG10~","mkt-mg-sky",""],["~MG11~","~MG11~","mkt-mg-blue",""],["~MG12~","~MG12~","mkt-mg-indigo",""],["~MG13~","~MG13~","mkt-mg-violet",""],["~MG14~","~MG14~","mkt-mg-fuchsia",""],["~MG15~","~MG15~","mkt-mg-pink",""],["~MG16~","~MG16~","mkt-mg-slate",""],["~DW10~","~DW10~","mkt-dew-teal",""],["~DW11~","~DW11~","mkt-dew-gold",""],["~DW12~","~DW12~","mkt-dew-slate",""],["~DW13~","~DW13~","mkt-dew-white",""],["~DW14~","~DW14~","mkt-dew-black",""],["~DW15~","~DW15~","mkt-dew-fog",""],["~DW16~","~DW16~","mkt-dew-turquoise",""],["~BB10~","~BB10~","mkt-bubble-green",""],["~BB11~","~BB11~","mkt-bubble-emerald",""],["~BB12~","~BB12~","mkt-bubble-mint",""],["~BB13~","~BB13~","mkt-bubble-teal",""],["~BB14~","~BB14~","mkt-bubble-turquoise",""],["~BB15~","~BB15~","mkt-bubble-cyan",""],["~BB16~","~BB16~","mkt-bubble-sky",""],["~BB17~","~BB17~","mkt-bubble-blue",""],["~BB18~","~BB18~","mkt-bubble-navy",""],["~BB19~","~BB19~","mkt-bubble-indigo",""],["~BB20~","~BB20~","mkt-bubble-violet",""],["~BB21~","~BB21~","mkt-bubble-purple",""],["~BB22~","~BB22~","mkt-bubble-lavender",""],["~BB23~","~BB23~","mkt-bubble-fuchsia",""],["~BB24~","~BB24~","mkt-bubble-pink",""],["~BB25~","~BB25~","mkt-bubble-rose",""],["~BB26~","~BB26~","mkt-bubble-brown",""],["~BB27~","~BB27~","mkt-bubble-white",""],["~BB28~","~BB28~","mkt-bubble-fog",""],["~BB29~","~BB29~","mkt-bubble-slate",""],["~BB30~","~BB30~","mkt-bubble-black",""],["!#PR#","#","aero-tag-chip tag-chip-pr",""],["!#PK#","#","aero-tag-chip tag-chip-pk",""],["!#SL#","#","aero-tag-chip tag-chip-sl",""],["~ORB~","~ORB~","applet-hydro-orb orb-blue",""],["~SLS~","~SLS~","applet-lock-slider",""],["~GLO~","~GLO~","effect-glow-tracer",""],["~VAR~","~VAR~","dev-chip-variable",""],["~HEX~","~HEX~","dev-chip-hex",""],["~STR~","~STR~","dev-chip-string",""],["~B-B~","~","aero-glass-badge-chip badge-frame-sky",""],["~B-G~","~","aero-glass-badge-chip badge-frame-emerald",""],["~B-O~","~","aero-glass-badge-chip badge-frame-orange",""],["~B-R~","~","aero-glass-badge-chip badge-frame-crimson",""],["~B-Y~","~","aero-glass-badge-chip badge-frame-gold",""],["~TIM~","~TIM~","applet-gadget-system-clock",""],["~OLM~","~OLM~","mkt-ol-magenta",""],["~OLV~","~OLV~","mkt-ol-violet",""],["~OLE~","~OLE~","mkt-ol-emerald",""],["~OLA~","~OLA~","mkt-ol-amber",""],["~OLR~","~OLR~","mkt-ol-rose",""],["~SHM~","~SHM~","mkt-shimmer-title",""],["~SKY~","~SKY~","mkt-sky-tape",""],["~SUN~","~SUN~","mkt-kp-sunset",""],["~GUM~","~GUM~","mkt-kp-gum",""],["~KEY~","~KEY~","mkt-kp-key",""],["~OR1~","~OR1~","orange-hl-1",""],["~OR2~","~OR2~","orange-hl-2",""],["~OR3~","~OR3~","orange-hl-3",""],["~OR4~","~OR4~","orange-hl-4",""],["~OR5~","~OR5~","orange-hl-5",""],["~OR6~","~OR6~","orange-hl-6",""],["~OR7~","~OR7~","orange-hl-7",""],["~OR8~","~OR8~","orange-hl-8",""],["~OR9~","~OR9~","orange-hl-9",""],["~GR1~","~GR1~","green-hl-1",""],["~GR2~","~GR2~","green-hl-2",""],["~GR3~","~GR3~","green-hl-3",""],["~GR4~","~GR4~","green-hl-4",""],["~GR5~","~GR5~","green-hl-5",""],["~GR6~","~GR6~","green-hl-6",""],["~GR7~","~GR7~","green-hl-7",""],["~GR8~","~GR8~","green-hl-8",""],["~GR9~","~GR9~","green-hl-9",""],["~BL1~","~BL1~","blue-hl-1",""],["~BL2~","~BL2~","blue-hl-2",""],["~BL3~","~BL3~","blue-hl-3",""],["~BL4~","~BL4~","blue-hl-4",""],["~BL5~","~BL5~","blue-hl-5",""],["~BL6~","~BL6~","blue-hl-6",""],["~BL7~","~BL7~","blue-hl-7",""],["~BL8~","~BL8~","blue-hl-8",""],["~BL9~","~BL9~","blue-hl-9",""],["~PU1~","~PU1~","pool-hl-1",""],["~PU2~","~PU2~","pool-hl-2",""],["~PU3~","~PU3~","pool-hl-3",""],["~PU4~","~PU4~","pool-hl-4",""],["~PU5~","~PU5~","pool-hl-5",""],["~PU6~","~PU6~","pool-hl-6",""],["~PU7~","~PU7~","pool-hl-7",""],["~PU8~","~PU8~","pool-hl-8",""],["~PU9~","~PU9~","pool-hl-9",""],["~CPR~","~CPR~","mkt-cp-red",""],["~CPO~","~CPO~","mkt-cp-orange",""],["~CPA~","~CPA~","mkt-cp-amber",""],["~CPY~","~CPY~","mkt-cp-yellow",""],["~CPL~","~CPL~","mkt-cp-lime",""],["~CPG~","~CPG~","mkt-cp-green",""],["~CPE~","~CPE~","mkt-cp-emerald",""],["~CPT~","~CPT~","mkt-cp-teal",""],["~CPC~","~CPC~","mkt-cp-cyan",""],["~CPS~","~CPS~","mkt-cp-sky",""],["~CPB~","~CPB~","mkt-cp-blue",""],["~CPI~","~CPI~","mkt-cp-indigo",""],["~CPV~","~CPV~","mkt-cp-violet",""],["~CPF~","~CPF~","mkt-cp-fuchsia",""],["~CPP~","~CPP~","mkt-cp-pink",""],["~CPQ~","~CPQ~","mkt-cp-slate",""],["~BP1~","~BP1~","bcp-tide",""],["~BP2~","~BP2~","bcp-highlighter",""],["~BP3~","~BP3~","bcp-bevel",""],["~BP4~","~BP4~","bcp-stitch",""],["~BP5~","~BP5~","bcp-scan",""],["~BP6~","~BP6~","bcp-hatch",""],["~BP7~","~BP7~","bcp-emboss",""],["~BP8~","~BP8~","bcp-halo",""],["~BP9~","~BP9~","bcp-dots",""],["~PL1~","~PL1~","pill-hl-red",""],["~PL2~","~PL2~","pill-hl-orange",""],["~PL3~","~PL3~","pill-hl-amber",""],["~PL4~","~PL4~","pill-hl-yellow",""],["~PL5~","~PL5~","pill-hl-lime",""],["~PL6~","~PL6~","pill-hl-green",""],["~PL7~","~PL7~","pill-hl-emerald",""],["~PL8~","~PL8~","pill-hl-teal",""],["~PL9~","~PL9~","pill-hl-cyan",""],["~PS1~","~PS1~","mkt-pool-tide",""],["~PS2~","~PS2~","mkt-pool-sunset",""],["~PS3~","~PS3~","mkt-pool-chlorine",""],["~PS4~","~PS4~","mkt-pool-beachball",""],["~PS5~","~PS5~","mkt-pool-wave",""],["~PS6~","~PS6~","mkt-pool-lounger",""],["~PS7~","~PS7~","mkt-pool-deep",""],["~PS8~","~PS8~","mkt-pool-foam",""],["~PS9~","~PS9~","mkt-pool-lifeguard",""],["~AU1~","~AU1~","mkt-autumn-harvest",""],["~AU2~","~AU2~","mkt-autumn-pumpkin",""],["~AU3~","~AU3~","mkt-autumn-cider",""],["~AU4~","~AU4~","mkt-autumn-candy",""],["~AU5~","~AU5~","mkt-autumn-leaves",""],["~AU6~","~AU6~","mkt-autumn-golden",""],["~AU7~","~AU7~","mkt-autumn-bonfire",""],["~AU8~","~AU8~","mkt-autumn-frost",""],["~AU9~","~AU9~","mkt-autumn-flannel",""],["~WN1~","~WN1~","mkt-winter-icicle",""],["~WN2~","~WN2~","mkt-winter-frost",""],["~WN3~","~WN3~","mkt-winter-pine",""],["~WN4~","~WN4~","mkt-winter-garnet",""],["~WN5~","~WN5~","mkt-winter-snowdrift",""],["~WN6~","~WN6~","mkt-winter-aurora",""],["~WN7~","~WN7~","mkt-winter-pond",""],["~WN8~","~WN8~","mkt-winter-seal",""],["~WN9~","~WN9~","mkt-winter-blizzard",""],["~FR1~","~FR1~","mkt-fruit-apple",""],["~FR2~","~FR2~","mkt-fruit-mango",""],["~FR3~","~FR3~","mkt-fruit-grape",""],["~FR4~","~FR4~","mkt-fruit-strawberry",""],["~FR5~","~FR5~","mkt-fruit-blueberry",""],["~FR6~","~FR6~","mkt-fruit-orange",""],["~FR7~","~FR7~","mkt-fruit-lemon",""],["~FR8~","~FR8~","mkt-fruit-lime",""],["~FR9~","~FR9~","mkt-fruit-cherry",""],["~HK1~","~HK1~","mkt-hacker-prompt",""],["~HK2~","~HK2~","mkt-hacker-matrix",""],["~HK3~","~HK3~","mkt-hacker-amber",""],["~HK4~","~HK4~","mkt-hacker-scan",""],["~HK5~","~HK5~","mkt-hacker-alert",""],["~HK6~","~HK6~","mkt-hacker-hex",""],["~HK7~","~HK7~","mkt-hacker-root",""],["~HK8~","~HK8~","mkt-hacker-ghost",""],["~HK9~","~HK9~","mkt-hacker-ice",""],["~MG1~","~MG1~","mkt-mg-red",""],["~MG2~","~MG2~","mkt-mg-orange",""],["~MG3~","~MG3~","mkt-mg-amber",""],["~MG4~","~MG4~","mkt-mg-yellow",""],["~MG5~","~MG5~","mkt-mg-lime",""],["~MG6~","~MG6~","mkt-mg-green",""],["~MG7~","~MG7~","mkt-mg-emerald",""],["~MG8~","~MG8~","mkt-mg-teal",""],["~MG9~","~MG9~","mkt-mg-cyan",""],["~DW1~","~DW1~","mkt-dew-cyan",""],["~DW2~","~DW2~","mkt-dew-orange",""],["~DW3~","~DW3~","mkt-dew-green",""],["~DW4~","~DW4~","mkt-dew-red",""],["~DW5~","~DW5~","mkt-dew-purple",""],["~DW6~","~DW6~","mkt-dew-pink",""],["~DW7~","~DW7~","mkt-dew-yellow",""],["~DW8~","~DW8~","mkt-dew-blue",""],["~DW9~","~DW9~","mkt-dew-lime",""],["~BB1~","~BB1~","mkt-bubble-red",""],["~BB2~","~BB2~","mkt-bubble-coral",""],["~BB3~","~BB3~","mkt-bubble-orange",""],["~BB4~","~BB4~","mkt-bubble-amber",""],["~BB5~","~BB5~","mkt-bubble-gold",""],["~BB6~","~BB6~","mkt-bubble-yellow",""],["~BB7~","~BB7~","mkt-bubble-cream",""],["~BB8~","~BB8~","mkt-bubble-lime",""],["~BB9~","~BB9~","mkt-bubble-olive",""],["=MG=","=MG=","gel-orb gel-mg",""],["=LM=","=LM=","gel-orb gel-lm",""],["=AQ=","=AQ=","gel-orb gel-aq",""],["=SL=","=SL=","gel-orb gel-sl",""],["!#A#","#","aero-tag-chip tag-chip-a",""],["!#G#","#","aero-tag-chip tag-chip-g",""],["!#O#","#","aero-tag-chip tag-chip-o",""],["!#R#","#","aero-tag-chip tag-chip-r",""],["!#Y#","#","aero-tag-chip tag-chip-y",""],["#PR#","#","gel-bubble-chip gel-chip-purple",""],["#PK#","#","gel-bubble-chip gel-chip-pink",""],["#GL#","#","gel-bubble-chip gel-chip-gold",""],["#SL#","#","gel-bubble-chip gel-chip-slate",""],["#BK#","#","gel-bubble-chip gel-chip-black",""],["#FG#","#","gel-bubble-chip gel-chip-fog",""],["#TU#","#","gel-bubble-chip gel-chip-turquoise",""],["~WD~","~WD~","gel-chip-waterdrop",""],["~SF~","~SF~","gel-chip-solarflare",""],["~AW~","~AW~","gel-chip-aurorawave",""],["~FN~","~FN~","applet-foldout-tab",""],["~TS~","~TS~","applet-aqua-switch",""],["~SM~","~SM~","applet-glass-stamp",""],["~TB~","~TB~","applet-state-button state-green",""],["~VD~","~VD~","applet-volume-dial",""],["~BC~","~BC~","applet-battery-cell",""],["~CD~","~CD~","applet-calendar-desk",""],["~SR~","~SR~","applet-star-rating",""],["~CC~","~CC~","applet-counter-badge",""],["~LK~","~LK~","applet-security-latch",""],["~PR~","~PR~","applet-playback-ribbon",""],["~CR~","~CR~","applet-cpu-gauge",""],["~SI~","~SI~","applet-stepper-mesh",""],["~MP~","~MP~","effect-mercury-pearl",""],["~PG~","~PG~","effect-prism-refract",""],["~CB~","~CB~","effect-screen-cavity",""],["~OA~","~OA~","effect-abyssal-plate",""],["~MM~","~MM~","effect-metallic-mesh",""],["~FE~","~FE~","effect-fluid-expand",""],["~MR~","~MR~","effect-metric-cavity",""],["~PO~","~PO~","effect-pearl-orb",""],["~LF~","~LF~","effect-lens-flare",""],["~DS~","~DS~","effect-drop-shadow-window",""],["~GL~","~GL~","effect-glow-tube",""],["~HB~","~HB~","effect-hardware-bevel",""],["~IS~","~IS~","effect-screen-segment",""],["~GC~","~GC~","effect-gel-capsule",""],["~KO~","~KO~","effect-fluid-orbit",""],["~XG~","~XG~","effect-xray-glass",""],["~WL~","~WL~","effect-waveform-line",""],["~PM~","~PM~","effect-plasma-gel",""],["~VM~","~VM~","applet-gadget-clock",""],["~WB~","~WB~","effect-water-bubble",""],["~MT~","~MT~","applet-metal-trigger",""],["~IC~","~IC~","applet-inset-check",""],["~ST~","~ST~","effect-shimmer-title",""],["~RS~","~RS~","av-chip-radar-sweep",""],["~HD~","~HD~","av-chip-heading",""],["~AL~","~AL~","av-chip-altimeter",""],["~SG~","~SG~","av-chip-signal",""],["~DR~","~DR~","jr-chip-date-plate",""],["~MD~","~MD~","jr-chip-mood",""],["~VO~","~VO~","jr-chip-voice-tag",""],["~WX~","~WX~","jr-chip-weather",""],["~WS~","~WS~","jr-chip-wax-stamp",""],["~TL~","~TL~","effect-tinted-lens",""],["~NO~","~NO~","applet-neon-node node-cyan",""],["~SL~","~SL~","effect-audio-stream-loop",""],["~BG~","~BG~","effect-biogel-capsule",""],["~LS~","~LS~","applet-latch-toggle",""],["~FT~","~FT~","jr-folder-tab",""],["~PT~","~PT~","jr-progress-capsule",""],["~MC~","~MC~","jr-digital-counter",""],["~RD~","~RD~","jr-dot-matrix",""],["~LL~","~ST~","jr-latch-lock",""],["~WR~","~WR~","effect-neon-ribbon",""],["~NE~","~NE~","mkt-neon-ribbon",""],["~OL~","~OL~","mkt-outline-glow",""],["~UV~","~UV~","mkt-kp-uv",""],["=Y=","=Y=","gel-orb gel-y",""],["=R=","=R=","gel-orb gel-r",""],["=G=","=G=","gel-orb gel-g",""],["=C=","=C=","gel-orb gel-c",""],["=B=","=B=","gel-orb gel-b",""],["=V=","=V=","gel-orb gel-v",""],["=P=","=P=","gel-orb gel-p",""],["=O=","=O=","gel-orb gel-o",""],["~G~","~G~","gel-green-flash",""],["~U~","~U~","liquid-underline",""],["~B~","~B~","glossy-border-badge",""],["~S~","~S~","cyber-glow-spark",""],["~L~","~L~","liquid-text-glow",""],["~M~","~M~","reflected-text-block",""],["~E~","~E~","embossed-glass-text",""],["~W~","~W~","kinetic-wave-text",""],["#C#","#","gel-bubble-chip gel-chip-cyan",""],["#O#","#","gel-bubble-chip gel-chip-orange",""],["#G#","#","gel-bubble-chip gel-chip-green",""],["#R#","#","gel-bubble-chip gel-chip-red",""],["#Y#","#","gel-bubble-chip gel-chip-yellow",""],["#B#","#","gel-bubble-chip gel-chip-blue",""],["#L#","#","gel-bubble-chip gel-chip-lime",""],["#T#","#","gel-bubble-chip gel-chip-teal",""],["#W#","#","gel-bubble-chip gel-chip-white",""],["&&","&&","spark-text",""],["**","**","","strong"],["`","`","","code"],["*","*","","em"]];
    const KD_BY = {};
    KD_MACROS.forEach(function (d) { (KD_BY[d[0].charAt(0)] = KD_BY[d[0].charAt(0)] || []).push(d); });
    let kdCssAsked = false;
    function kdNeedCss() {
        if (kdCssAsked) return;
        kdCssAsked = true;
        if ([].some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { return /keydown\.css/.test(l.href); })) return;
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = '/keydown.css';
        document.head.appendChild(l);
    }
    function kdRender(text) {
        const s = String(text == null ? '' : text);
        let out = '', i = 0, used = false;
        while (i < s.length) {
            const cand = KD_BY[s.charAt(i)];
            let hit = null;
            if (cand) {
                for (let k = 0; k < cand.length; k++) {
                    const d = cand[k];
                    if (!s.startsWith(d[0], i)) continue;
                    const from = i + d[0].length;
                    const j = s.indexOf(d[1], from);
                    if (j <= from) continue;
                    const inner = s.slice(from, j);
                    // Plain * and ` need hugging text ("2 * 3 * 4" stays as typed)!
                    if (/^[*`]/.test(d[0]) && /^\s|\s$/.test(inner)) continue;
                    hit = { d: d, inner: inner, end: j + d[1].length };
                    break;
                }
            }
            if (hit) {
                const tag = hit.d[3] || 'span';
                out += '<' + tag + (hit.d[2] ? ' class="' + esc(hit.d[2]) + '"' : '') + '>' + esc(hit.inner.trim()) + '</' + tag + '>';
                i = hit.end;
                used = true;
            } else { out += esc(s.charAt(i)); i++; }
        }
        if (used) kdNeedCss();
        return out;
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function rid(n) { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; const b = crypto.getRandomValues(new Uint8Array(n)); let s = ''; b.forEach(function (x) { s += a[x % a.length]; }); return s; }
    function colorOf(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }
    function identity() {
        let me = lsGet('radii_collab_identity', null);
        const ph = lsGet('phosphor_identity', null);
        if (!me || !me.id) me = { id: (ph && ph.clientId) || ('rc_' + rid(12)), name: (ph && ph.name) || '' };
        if (!me.name && ph && ph.name) me.name = ph.name;
        return me;
    }
    let me = identity();
    function saveMe() { lsSet('radii_collab_identity', me); }

    /* ---------- Room state ---------- */
    let cfg = null;
    const room = {
        id: null, key: null, keyStr: null, role: null, on: false,
        units: new Map(),   // key -> {v: json string | null, c: clock, w: writer}
        clock: 0,
        peers: new Map(),   // id -> {name, color, cur, at}
        chat: [],
        hellos: new Map(),  // hello id -> timer (one peer answers each newcomer!)
        chunks: new Map(),
        synced: false
    };
    function topic(ch) { return ROOT + '/' + room.id + '/' + ch; }
    function newer(a, b) { return !b || a.c > b.c || (a.c === b.c && a.w > b.w); }

    async function send(ch, obj, retain) {
        if (!room.on) return;
        const sealed = await seal(obj);
        if (sealed.length <= CHUNK_CHARS || retain) { relay.pub(topic(ch), sealed, retain); return; }
        // Big envelopes travel in numbered pieces and rejoin on the other side!
        const id = rid(8), n = Math.ceil(sealed.length / CHUNK_CHARS);
        for (let i = 0; i < n; i++) {
            relay.pub(topic(ch), JSON.stringify({ k: 'ch', id: id, i: i, n: n, d: sealed.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS) }), false);
            if (i % 6 === 5) await new Promise(function (r) { setTimeout(r, 40); });
        }
    }

    async function receive(t, payload) {
        if (!room.on) return;
        const ch = t.slice((ROOT + '/' + room.id + '/').length);
        let sealed = payload;
        if (payload.charAt(0) === '{') {
            let piece;
            try { piece = JSON.parse(payload); } catch (e) { return; }
            if (piece.k !== 'ch') return;
            if (!firstCopy('ch' + piece.id + '.' + piece.i)) return;
            let got = room.chunks.get(piece.id);
            if (!got) { got = { parts: [], n: piece.n, at: Date.now() }; room.chunks.set(piece.id, got); }
            got.parts[piece.i] = piece.d;
            if (got.parts.filter(Boolean).length < got.n) return;
            room.chunks.delete(piece.id);
            sealed = got.parts.join('');
        }
        if (sealed.length < 30 || !firstCopy(t.slice(-2) + sealed.slice(0, 40))) return;
        let m;
        try { m = await unseal(sealed); } catch (e) { return; } // wrong key = not our room!
        if (!m || m.from === me.id) return;
        if (ch === 'd') onDoc(m);
        else if (ch === 's') onSnapshot(m);
        else if (ch === 'a') onAware(m);
        else if (ch === 'c') onChat(m);
    }

    /* ---------- Document sync ---------- */
    let applying = false;
    function readSnapshot() {
        try { return cfg.adapter.snapshot() || {}; } catch (e) { console.error(e); return {}; }
    }
    // Local edits -> changed units get a fresh clock and go out!
    let diffTimer = null;
    // Throttled (not debounced), so a long drag streams live instead of waiting!
    function localChanged() {
        if (!room.on || applying || !room.synced || diffTimer) return;
        diffTimer = setTimeout(function () { diffTimer = null; diffAndSend(); }, 120);
    }
    function diffAndSend() {
        if (!room.on || applying) return;
        const snap = readSnapshot();
        const out = {};
        let any = false;
        Object.keys(snap).forEach(function (k) {
            const v = snap[k] == null ? null : JSON.stringify(snap[k]);
            const cur = room.units.get(k);
            if (!cur || cur.v !== v) {
                const u = { v: v, c: ++room.clock, w: me.id };
                room.units.set(k, u);
                out[k] = u;
                any = true;
            }
        });
        room.units.forEach(function (u, k) {
            if (u.v !== null && !(k in snap)) {
                const d = { v: null, c: ++room.clock, w: me.id };
                room.units.set(k, d);
                out[k] = d;
                any = true;
            }
        });
        if (any) {
            send('d', { t: 'ops', from: me.id, units: out });
            snapshotSoon();
        }
    }
    function merge(units, full) {
        // Send our own pending edits FIRST, so a remote update never eats them!
        if (!full && room.synced && !applying) { clearTimeout(diffTimer); diffTimer = null; diffAndSend(); }
        const changed = {};
        const lost = {};
        let any = false;
        Object.keys(units || {}).forEach(function (k) {
            const u = units[k];
            if (!u || typeof u.c !== 'number') return;
            room.clock = Math.max(room.clock, u.c);
            const cur = room.units.get(k);
            if (newer(u, cur)) {
                room.units.set(k, { v: u.v, c: u.c, w: u.w });
                changed[k] = u.v === null ? null : JSON.parse(u.v);
                any = true;
            } else if (u.v !== null && cur && cur.v !== u.v && cfg.adapter.mergeable && cfg.adapter.mergeable(k)) {
                // Lists (like paragraph order) that lost the race still get MERGED in,
                // so a line someone added at the same instant never disappears!
                lost[k] = JSON.parse(u.v);
                any = true;
            }
        });
        if (!any && !full) return;
        applying = true;
        let rebroadcast = [];
        try { rebroadcast = cfg.adapter.apply(changed, !!full, lost) || []; } catch (e) { console.error(e); }
        // Re-read what the app actually holds so tiny normalizations never echo!
        // (Keys the adapter MERGED, like paragraph order, go back out instead!)
        try {
            const snap = readSnapshot();
            Object.keys(changed).forEach(function (k) {
                const u = room.units.get(k);
                if (rebroadcast.indexOf(k) === -1 && u && u.v !== null && k in snap) u.v = JSON.stringify(snap[k]);
            });
        } catch (e) {}
        applying = false;
        if (rebroadcast.length) localChanged();
        ui.renderPeople();
        ui.renderComments();
    }
    function allUnits() {
        const o = {};
        room.units.forEach(function (u, k) { o[k] = u; });
        return o;
    }
    function onDoc(m) {
        if (m.t === 'ops') merge(m.units);
        else if (m.t === 'hello') {
            // Someone new! ONE peer answers with the whole document (first one wins)!
            if (!room.synced) return;
            const t = setTimeout(function () {
                room.hellos.delete(m.hid);
                send('d', { t: 'state', from: me.id, to: m.from, hid: m.hid, units: allUnits() });
            }, 80 + Math.random() * 520);
            room.hellos.set(m.hid, t);
        } else if (m.t === 'state') {
            const t = room.hellos.get(m.hid);
            if (t) { clearTimeout(t); room.hellos.delete(m.hid); }
            if (m.to === me.id) gotState(m.units);
        }
    }
    function onSnapshot(m) {
        if (m.t === 'state' && !room.synced) gotState(m.units);
    }
    function gotState(units) {
        if (room.synced) { merge(units); return; }
        room.synced = true;
        clearTimeout(room.waitTimer);
        // First sync REPLACES what's here, so nothing stale leaks into the room!
        merge(units, true);
        ui.toast('Synced with the room! Edit away!');
        ui.status();
        setTimeout(localChanged, 300);
    }
    let snapTimer = null;
    function snapshotSoon(ms) {
        clearTimeout(snapTimer);
        snapTimer = setTimeout(async function () {
            if (!room.on || !room.synced) return;
            const sealed = await seal({ t: 'state', from: me.id, units: allUnits() });
            if (sealed.length <= SNAPSHOT_MAX) relay.pub(topic('s'), sealed, true);
        }, ms || 4000);
    }

    /* ---------- Presence + cursors ---------- */
    let awTimer = null, lastCur = '';
    function cursorNow() { try { return cfg.adapter.cursor ? cfg.adapter.cursor() : null; } catch (e) { return null; } }
    function beat(force) {
        if (!room.on) return;
        const cur = cursorNow();
        const s = JSON.stringify(cur);
        if (!force && s === lastCur && Date.now() - (beat.at || 0) < AW_MS) return;
        lastCur = s;
        beat.at = Date.now();
        send('a', { t: 'aw', from: me.id, name: me.name, color: colorOf(me.id), cur: cur, at: Date.now() });
    }
    let curTimer = null;
    function cursorMoved() {
        if (!room.on || curTimer) return;
        curTimer = setTimeout(function () { curTimer = null; beat(false); }, 120);
    }
    function onAware(m) {
        if (m.t === 'bye') { room.peers.delete(m.from); drawPeers(); return; }
        if (m.t !== 'aw') return;
        const isNew = !room.peers.has(m.from);
        room.peers.set(m.from, { id: m.from, name: String(m.name || 'Guest').slice(0, 24), color: m.color || colorOf(m.from), cur: m.cur, at: Date.now() });
        if (isNew) { ui.toast(String(m.name || 'Someone') + ' joined!'); beat(true); }
        drawPeers();
    }
    function sweepPeers() {
        let gone = false;
        room.peers.forEach(function (p, id) { if (Date.now() - p.at > PEER_TTL) { room.peers.delete(id); gone = true; } });
        if (gone) drawPeers();
    }
    function drawPeers() {
        try { if (cfg.adapter.drawCursors) cfg.adapter.drawCursors([...room.peers.values()]); } catch (e) { console.error(e); }
        ui.renderPeople();
        ui.renderAvatars();
    }

    /* ---------- Chat (room + linked Phosphor / Antimony Spaces) ---------- */
    const LINK_KEY = 'radii_collab_links';
    let links = lsGet(LINK_KEY, []); // [{kind:'phosphor'|'antimony', code, name}]
    if (!Array.isArray(links)) links = [];
    const linkMsgs = new Map(); // code -> [msgs]
    let channel = 'room';        // 'room' or a linked Space code!
    function saveLinks() { lsSet(LINK_KEY, links); }
    function linkRoot(l) { return l.kind === 'antimony' ? ANTIMONY_ROOT : PHOSPHOR_ROOT; }
    function linkTopics(l) { const r = linkRoot(l); return [r + '/msg/' + l.code, r + '/dir/' + l.code]; }
    function onChat(m) {
        if (m.t !== 'msg') return;
        room.chat.push({ id: m.id, from: m.from, name: String(m.name || 'Guest').slice(0, 24), text: String(m.text || '').slice(0, 2000), at: m.at || Date.now(), color: colorOf(m.from) });
        if (room.chat.length > 200) room.chat.shift();
        ui.renderChat();
        ui.bumpUnread('room');
    }
    function onLinkMsg(t, payload) {
        const l = links.find(function (x) { return t === linkRoot(x) + '/msg/' + x.code || t === linkRoot(x) + '/dir/' + x.code; });
        if (!l) return;
        let m;
        try { m = JSON.parse(payload); } catch (e) { return; }
        if (!m) return;
        if (t.indexOf('/dir/') !== -1) {
            if (m.name && m.name !== l.name) { l.name = String(m.name).slice(0, 40); l.owner = m.owner; saveLinks(); ui.renderChannels(); }
            return;
        }
        if (m.v !== 1 || !m.id || !m.body || m.kind === 'mod' || String(m.kind || '').indexOf('file') === 0) return;
        const list = linkMsgs.get(l.code) || [];
        if (list.some(function (x) { return x.id === m.id; })) return;
        list.push({ id: m.id, from: m.from, name: String(m.name || 'Someone').slice(0, 24), text: String(m.body).slice(0, 2000), subject: m.subject ? String(m.subject).slice(0, 120) : '', at: m.at || Date.now(), color: colorOf(String(m.from || '')) });
        if (list.length > 150) list.shift();
        linkMsgs.set(l.code, list);
        if (channel === l.code) ui.renderChat();
        ui.bumpUnread(l.code);
    }
    let phosphorBeat = null;
    function linkPresence(online) {
        links.filter(function (l) { return l.kind === 'phosphor'; }).forEach(function (l) {
            relay.pub(PHOSPHOR_ROOT + '/presence/' + l.code + '/' + me.id, JSON.stringify({ v: 1, id: rid(10), name: me.name + ' (' + cfg.appName + ')', at: Date.now(), online: online, relays: relay.hosts() }), true);
        });
    }
    function startLinks() {
        if (!links.length) return;
        relay.start();
        links.forEach(function (l) { relay.sub(linkTopics(l)); });
        clearInterval(phosphorBeat);
        phosphorBeat = setInterval(function () { if (me.name) linkPresence(true); }, 20000);
        setTimeout(function () { if (me.name) linkPresence(true); }, 1500);
    }
    function addLink(kind, rawCode) {
        const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code.length < 4) { ui.toast('That Space code looks too short!'); return false; }
        if (links.some(function (l) { return l.code === code; })) { channel = code; ui.renderChannels(); ui.renderChat(); return true; }
        const l = { kind: kind === 'antimony' ? 'antimony' : 'phosphor', code: code, name: code };
        links.push(l);
        saveLinks();
        channel = code;
        startLinks();
        ui.renderChannels();
        ui.renderChat();
        ui.toast((l.kind === 'antimony' ? 'Antimony board' : 'Phosphor Space') + ' linked! New messages show up here live!');
        return true;
    }
    function removeLink(code) {
        const l = links.find(function (x) { return x.code === code; });
        if (!l) return;
        if (l.kind === 'phosphor') relay.pub(PHOSPHOR_ROOT + '/presence/' + l.code + '/' + me.id, JSON.stringify({ online: false }), true);
        relay.unsub(linkTopics(l));
        links = links.filter(function (x) { return x.code !== code; });
        saveLinks();
        if (channel === code) channel = 'room';
        ui.renderChannels();
        ui.renderChat();
    }
    function sendChat(text) {
        text = String(text || '').trim().slice(0, 2000);
        if (!text) return;
        if (!me.name) { ui.askName(); return; }
        if (channel === 'room') {
            if (!room.on) { ui.toast('Start or join a session to chat with collaborators!'); return; }
            const m = { t: 'msg', id: rid(10), from: me.id, name: me.name, text: text, at: Date.now() };
            send('c', m);
            room.chat.push({ id: m.id, from: me.id, name: me.name, text: text, at: m.at, color: colorOf(me.id) });
        } else {
            const l = links.find(function (x) { return x.code === channel; });
            if (!l) return;
            if (l.kind === 'antimony' && l.owner !== me.id) { ui.toast('Antimony boards are read-only unless you own them!'); return; }
            relay.start();
            const m = { v: 1, id: Date.now().toString(36) + rid(8), from: me.id, name: me.name, body: text, mentions: [], at: Date.now() };
            relay.pub(linkRoot(l) + '/msg/' + l.code, JSON.stringify(m), false);
            const list = linkMsgs.get(l.code) || [];
            list.push({ id: m.id, from: me.id, name: me.name, text: text, at: m.at, color: colorOf(me.id) });
            linkMsgs.set(l.code, list);
        }
        ui.renderChat();
    }

    /* ---------- Sessions: start, join, leave ---------- */
    function linkFor(id, keyStr) {
        const u = new URL(location.href);
        u.search = '';
        u.hash = 'collab=' + id + '.' + keyStr;
        return u.toString();
    }
    function parseHash() {
        const m = String(location.hash || '').match(/collab=([a-z0-9]{8,32})\.([A-Za-z0-9_-]{20,64})/);
        return m ? { id: m[1], key: m[2] } : null;
    }
    // mode: 'host' (fresh session), 'guest' (first join), 'rejoin' (after a reload)!
    async function openRoom(id, keyStr, role, mode) {
        mode = mode || role;
        room.id = id;
        room.keyStr = keyStr;
        room.key = await importKey(b64u.dec(keyStr));
        room.role = role;
        room.on = true;
        room.units = new Map();
        room.clock = 0;
        room.peers = new Map();
        room.chat = [];
        room.synced = mode === 'host';
        try { sessionStorage.setItem(cfg.app + '_collab_session', JSON.stringify({ id: id, key: keyStr, role: role })); } catch (e) {}
        try { cfg.adapter.begin && cfg.adapter.begin(mode); } catch (e) { console.error(e); }
        document.body.classList.add('rc-live');
        relay.start();
        relay.sub([topic('d'), topic('a'), topic('c'), topic('s')]);
        if (mode === 'host') {
            setTimeout(function () { diffAndSend(); snapshotSoon(); }, 50);
        } else {
            // Nobody answered and no sealed copy on the relay? You're the first one here!
            room.waitTimer = setTimeout(function () {
                if (!room.on || room.synced) return;
                room.synced = true;
                ui.toast(mode === 'rejoin' ? 'Back in the session! Nobody else is online right now!' : 'Nobody is in this room yet! Your edits sync as people arrive!');
                diffAndSend();
                snapshotSoon();
                ui.render();
            }, 8000);
        }
        clearInterval(room.awInterval);
        room.awInterval = setInterval(function () { beat(true); sweepPeers(); }, AW_MS);
        ui.status();
        ui.render();
    }
    function hello() {
        if (!room.on) return;
        if (!room.synced) send('d', { t: 'hello', from: me.id, hid: rid(8) });
        beat(true);
    }
    relay.handlers.push({
        open: function () {
            // A relay came up: say hello (once), and re-seal the room copy if we're in it!
            if (Date.now() - (hello.at || 0) > 2500) { hello.at = Date.now(); hello(); }
            if (room.on && room.synced) snapshotSoon(600);
            if (links.length && me.name) linkPresence(true);
        },
        msg: function (t, p) {
            if (room.on && t.indexOf(ROOT + '/' + room.id + '/') === 0) receive(t, p);
            else if (t.indexOf(PHOSPHOR_ROOT) === 0 || t.indexOf(ANTIMONY_ROOT) === 0) onLinkMsg(t, p);
        }
    });

    async function start() {
        if (!me.name) { ui.askName(start); return; }
        if (room.on) return;
        const keyStr = b64u.enc(crypto.getRandomValues(new Uint8Array(32)));
        await openRoom(rid(16), keyStr, 'host');
        copyLink();
        ui.toast('Live session started! The invite link is copied: send it to your collaborators!');
    }
    async function join(id, keyStr, quiet) {
        if (!me.name) { ui.askName(function () { join(id, keyStr, quiet); }); return; }
        if (room.on && room.id === id) return;
        if (room.on) leave(true);
        if (!quiet) {
            // Joining replaces what's open here, so a backup is kept first!
            let ok = true;
            try { if (cfg.adapter.backup) ok = cfg.adapter.backup() !== false; } catch (e) { console.error(e); }
            if (!ok) return;
        }
        await openRoom(id, keyStr, 'guest', quiet ? 'rejoin' : 'guest');
        clearHash();
        ui.toast('Joining the session... syncing the document!');
    }
    function clearHash() {
        try { const u = new URL(location.href); if (/collab=/.test(u.hash)) { u.hash = ''; history.replaceState(null, '', u.toString()); } } catch (e) {}
    }
    function leave(silent) {
        if (!room.on) return;
        send('a', { t: 'bye', from: me.id });
        relay.unsub([topic('d'), topic('a'), topic('c'), topic('s')]);
        clearInterval(room.awInterval);
        clearTimeout(room.waitTimer);
        room.on = false;
        room.peers = new Map();
        try { sessionStorage.removeItem(cfg.app + '_collab_session'); } catch (e) {}
        try { cfg.adapter.end && cfg.adapter.end(); } catch (e) {}
        try { if (cfg.adapter.drawCursors) cfg.adapter.drawCursors([]); } catch (e) {}
        document.body.classList.remove('rc-live');
        if (!links.length) setTimeout(function () { if (!room.on && !links.length) relay.stop(); }, 300);
        ui.status();
        ui.render();
        if (!silent) ui.toast('You left the session! Your copy of the document stays here!');
    }
    function copyLink() {
        if (!room.on) return;
        const link = linkFor(room.id, room.keyStr);
        try { navigator.clipboard.writeText(link).catch(function () {}); } catch (e) {}
        ui.flashCopied();
    }
    function joinFromText(text) {
        const m = String(text || '').match(/collab=([a-z0-9]{8,32})\.([A-Za-z0-9_-]{20,64})/);
        if (!m) { ui.toast('Paste a full invite link (it ends with #collab=...)!'); return; }
        join(m[1], m[2]);
    }

    /* ---------- Keyed rendering: animate ONLY real joins + leaves! ----------
       Elements are kept and updated in place (keyed by person/message id),
       so redraws never replay animations: new keys pop in, gone keys fade out! */
    function keyed(layer, items) {
        const have = {};
        [].forEach.call(layer.children, function (el) { if (el.dataset.key && !el.classList.contains('rc-exit')) have[el.dataset.key] = el; });
        const want = {};
        items.forEach(function (it) {
            want[it.key] = true;
            let el = have[it.key];
            if (!el) {
                el = document.createElement(it.tag || 'div');
                el.dataset.key = it.key;
                el.classList.add('rc-enter');
                el.addEventListener('animationend', function () { el.classList.remove('rc-enter'); }, { once: true });
                layer.appendChild(el);
            }
            const cls = (it.cls || '') + (el.classList.contains('rc-enter') ? ' rc-enter' : '');
            if (el.className !== cls) el.className = cls;
            if (it.style !== undefined && el.getAttribute('style') !== it.style) el.setAttribute('style', it.style);
            if (it.title && el.title !== it.title) el.title = it.title;
            if (el._html !== it.html) { el._html = it.html; el.innerHTML = it.html; }
        });
        Object.keys(have).forEach(function (k) {
            if (want[k]) return;
            const el = have[k];
            el.classList.add('rc-exit');
            setTimeout(function () { el.remove(); }, 220);
        });
    }

    /* ---------- The panel ---------- */
    const ui = {
        el: null, tab: 'people', unread: {},
        toast: function (msg) {
            if (window.OfficeShell && window.OfficeShell.isOffice && window.OfficeShell.isOffice()) { window.OfficeShell.toast(msg); return; }
            if (cfg && cfg.toast) { cfg.toast(msg); return; }
            let t = document.getElementById('rc-toast');
            if (!t) { t = document.createElement('div'); t.id = 'rc-toast'; document.body.appendChild(t); }
            t.textContent = msg;
            t.classList.add('show');
            clearTimeout(t._h);
            t._h = setTimeout(function () { t.classList.remove('show'); }, 2600);
        },
        build: function () {
            const p = document.createElement('aside');
            p.id = 'rc-panel';
            p.setAttribute('aria-label', 'Collaborate');
            p.hidden = true;
            p.innerHTML =
                '<div class="rc-head"><b>Collaborate</b><span id="rc-dot" class="rc-dot" title="Relay status"></span><button type="button" class="rc-x" title="Close">✕</button></div>' +
                '<div class="rc-tabs"><button type="button" data-tab="people" class="on">People</button><button type="button" data-tab="chat">Chat<i class="rc-badge" data-for="chat"></i></button><button type="button" data-tab="comments">Comments</button></div>' +
                '<div class="rc-body" data-body="people"></div>' +
                '<div class="rc-body" data-body="chat" hidden><div class="rc-channels"></div><div class="rc-msgs"></div><form class="rc-send"><input class="rc-input" placeholder="Message…" maxlength="2000" autocomplete="off"><button type="submit" class="rc-btn rc-gel">Send</button></form></div>' +
                '<div class="rc-body" data-body="comments" hidden></div>';
            document.body.appendChild(p);
            this.el = p;
            const self = this;
            p.querySelector('.rc-x').addEventListener('click', function () { self.close(); });
            p.querySelector('.rc-tabs').addEventListener('click', function (e) {
                const b = e.target.closest('[data-tab]');
                if (b) self.show(b.dataset.tab);
            });
            p.querySelector('.rc-send').addEventListener('submit', function (e) {
                e.preventDefault();
                const inp = p.querySelector('.rc-send .rc-input');
                sendChat(inp.value);
                inp.value = '';
            });
            p.addEventListener('keydown', function (e) { if (e.key === 'Escape') self.close(); e.stopPropagation(); });
            p.addEventListener('mousedown', function (e) { e.stopPropagation(); });
            p.addEventListener('click', function (e) { e.stopPropagation(); });
        },
        open: function (tab) {
            if (!this.el) this.build();
            const wasHidden = this.el.hidden;
            this.el.hidden = false;
            if (wasHidden) { this.el.classList.remove('rc-out'); void this.el.offsetWidth; this.el.classList.add('rc-in'); }
            document.body.classList.add('rc-open');
            this.show(tab || this.tab);
            startLinks();
            window.dispatchEvent(new Event('resize'));
        },
        close: function () {
            if (!this.el) return;
            const el = this.el;
            el.classList.remove('rc-in');
            el.classList.add('rc-out');
            document.body.classList.remove('rc-open');
            setTimeout(function () { el.hidden = true; el.classList.remove('rc-out'); window.dispatchEvent(new Event('resize')); }, 200);
        },
        toggle: function (tab) { if (this.el && !this.el.hidden && (!tab || tab === this.tab)) this.close(); else this.open(tab); },
        show: function (tab) {
            this.tab = tab;
            this.el.querySelectorAll('.rc-tabs [data-tab]').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
            const self = this;
            this.el.querySelectorAll('[data-body]').forEach(function (b) {
                const show = b.dataset.body === tab;
                if (show && b.hidden) { b.classList.remove('rc-tabin'); void b.offsetWidth; b.classList.add('rc-tabin'); }
                b.hidden = !show;
            });
            if (tab === 'chat') { this.unread = {}; this.renderBadges(); }
            this.render();
        },
        render: function () {
            if (!this.el || this.el.hidden) { this.renderAvatars(); return; }
            if (this.tab === 'people') this.renderPeople();
            else if (this.tab === 'chat') { this.renderChannels(); this.renderChat(); }
            else this.renderComments();
            this.status();
            this.renderAvatars();
        },
        status: function () {
            const dot = document.getElementById('rc-dot');
            if (dot) {
                dot.className = 'rc-dot' + (relay.live() ? ' live' : relay.want ? ' wait' : '');
                dot.title = relay.live() ? 'Connected via ' + relay.hosts().join(', ') + '!' : relay.want ? 'Connecting to a relay…' : 'Offline';
            }
            document.querySelectorAll('.rc-share').forEach(function (b) { b.classList.toggle('rc-on', room.on); });
        },
        askName: function (then) {
            this.open('people');
            const inp = this.el.querySelector('.rc-name');
            if (inp) { inp.focus(); inp.classList.add('rc-shake'); setTimeout(function () { inp.classList.remove('rc-shake'); }, 500); }
            this.afterName = then || null;
            this.toast('Pick a display name first!');
        },
        renderPeople: function () {
            if (!this.el || this.tab !== 'people' || this.el.hidden) return;
            const b = this.el.querySelector('[data-body="people"]');
            const self = this;
            const self0 = this;
            let html = '<label class="rc-label">Your name<input class="rc-input rc-name" maxlength="24" placeholder="Pick a display name" value="' + esc(me.name) + '"></label>';
            if (window.RadiiFile) {
                const RF = window.RadiiFile;
                html += '<div class="rc-card rc-filecard"><b>This file</b><div class="rc-row"><input class="rc-input rc-fileid" readonly value="' + esc(RF.id || 'main file (no ID)') + '"><button type="button" class="rc-btn rc-copyfile">Copy link</button></div>' +
                    '<div class="rc-row"><button type="button" class="rc-btn rc-newfile">New file</button><input class="rc-input rc-openid" placeholder="Open an ID…" maxlength="64"><button type="button" class="rc-btn rc-openfile">Open</button></div>' +
                    '<p class="rc-fine">Every file has its own ID in the link, like <code>?file=' + esc(RF.id || 'k7q2mz9p4x') + '</code>! Open it anywhere to reach the same file in this browser!</p></div>';
            }
            if (!room.on) {
                html += '<div class="rc-card"><b>Work together, live!</b><p>Start a session and send the link: everyone edits this ' + esc(cfg.docName) + ' at once, with live cursors, comments and chat!</p><button type="button" class="rc-btn rc-gel rc-start">Start live session</button></div>' +
                    '<div class="rc-card"><b>Got an invite link?</b><div class="rc-row"><input class="rc-input rc-paste" placeholder="Paste the link here"><button type="button" class="rc-btn rc-join">Join</button></div><p class="rc-fine">Joining swaps in the shared ' + esc(cfg.docName) + '! Yours is backed up first, and you can restore it any time below!</p></div>';
                if (cfg.adapter.hasBackup && cfg.adapter.hasBackup()) html += '<button type="button" class="rc-btn rc-restore">Restore my own ' + esc(cfg.docName) + '</button>';
                html += '<p class="rc-fine">🔒 Private by design: there\'s no database! Browsers meet on free public relays and everything is end-to-end encrypted with a key that only lives in the invite link. The relay keeps a sealed copy so the room can reopen later!</p>';
            } else {
                html += '<div class="rc-card"><b>' + (room.synced ? '🟢 Live session' : '⏳ Syncing…') + '</b><div class="rc-row"><input class="rc-input rc-link" readonly value="' + esc(linkFor(room.id, room.keyStr)) + '"><button type="button" class="rc-btn rc-gel rc-copy">Copy</button></div><p class="rc-fine">Anyone with this link can join and edit! Send it privately!</p></div>';
                html += '<div class="rc-label">In this ' + esc(cfg.docName) + ' (' + (room.peers.size + 1) + ')</div><div class="rc-people">';
                html += '<div class="rc-person"><i style="background:' + colorOf(me.id) + '">' + esc((me.name || '?').charAt(0).toUpperCase()) + '</i><span><b>' + esc(me.name) + ' (you)</b><small>' + esc(cfg.adapter.where ? cfg.adapter.where(cursorNow()) : '') + '</small></span></div>';
                room.peers.forEach(function (p) {
                    html += '<button type="button" class="rc-person" data-follow="' + esc(p.id) + '" title="Jump to ' + esc(p.name) + '"><i style="background:' + p.color + '">' + esc(p.name.charAt(0).toUpperCase()) + '</i><span><b>' + esc(p.name) + '</b><small>' + esc(cfg.adapter.where ? cfg.adapter.where(p.cur) : '') + '</small></span></button>';
                });
                if (!room.peers.size) html += '<p class="rc-fine">Nobody else yet! Share the link above!</p>';
                html += '</div><button type="button" class="rc-btn rc-leave">Leave session</button>';
                if (cfg.adapter.hasBackup && cfg.adapter.hasBackup()) html += '<button type="button" class="rc-btn rc-restore">Restore my own ' + esc(cfg.docName) + '</button>';
            }
            const focused = document.activeElement && document.activeElement.classList.contains('rc-name');
            if (focused) return;
            if (b._html === html) return; // nothing changed: no redraw, no replayed animation!
            b._html = html;
            const before = this.peopleSeen || {};
            b.innerHTML = html;
            const now = {};
            b.querySelectorAll('[data-follow]').forEach(function (row) {
                now[row.dataset.follow] = true;
                if (self0.peopleShown && !before[row.dataset.follow]) row.classList.add('rc-enter');
            });
            this.peopleSeen = now;
            this.peopleShown = true;
            const nm = b.querySelector('.rc-name');
            nm.addEventListener('change', function () {
                me.name = nm.value.trim().slice(0, 24);
                saveMe();
                beat(true);
                if (me.name && self.afterName) { const f = self.afterName; self.afterName = null; f(); }
            });
            nm.addEventListener('keydown', function (e) { if (e.key === 'Enter') nm.blur(); });
            const on = function (sel, fn) { const x = b.querySelector(sel); if (x) x.addEventListener('click', fn); };
            on('.rc-start', function () { nm.dispatchEvent(new Event('change')); start(); });
            on('.rc-join', function () { nm.dispatchEvent(new Event('change')); joinFromText(b.querySelector('.rc-paste').value); });
            on('.rc-copy', function () { copyLink(); });
            on('.rc-copyfile', function () {
                const url = RadiiFile.id ? RadiiFile.link() : RadiiFile.link(RadiiFile.newId());
                try { navigator.clipboard.writeText(url); } catch (e) {}
                self.toast(RadiiFile.id ? 'File link copied!' : 'This is the main file, so I copied a link to a NEW file!');
            });
            on('.rc-newfile', function () { RadiiFile.open(); });
            on('.rc-openfile', function () { const v = (b.querySelector('.rc-openid').value || '').trim().replace(/[^A-Za-z0-9_-]/g, ''); if (v) RadiiFile.open(v); else self.toast('Type a file ID first!'); });
            on('.rc-leave', function () { leave(false); });
            on('.rc-restore', function () {
                if (room.on) leave(true);
                try { cfg.adapter.restore(); self.toast('Your own ' + cfg.docName + ' is back!'); } catch (e) { console.error(e); }
                self.render();
            });
            b.querySelectorAll('[data-follow]').forEach(function (x) {
                x.addEventListener('click', function () {
                    const p = room.peers.get(x.dataset.follow);
                    if (p && cfg.adapter.follow) cfg.adapter.follow(p.cur);
                });
            });
        },
        flashCopied: function () {
            const b = this.el && this.el.querySelector('.rc-copy');
            if (b) { b.textContent = 'Copied!'; setTimeout(function () { b.textContent = 'Copy'; }, 1300); }
        },
        renderChannels: function () {
            if (!this.el) return;
            const box = this.el.querySelector('.rc-channels');
            const self = this;
            let html = '<button type="button" data-ch="room" class="' + (channel === 'room' ? 'on' : '') + '">🔒 Session<i class="rc-badge" data-for="room"></i></button>';
            links.forEach(function (l) {
                html += '<button type="button" data-ch="' + esc(l.code) + '" class="' + (channel === l.code ? 'on' : '') + ' rc-' + l.kind + '">' + (l.kind === 'antimony' ? '📝 ' : '💬 ') + esc(l.name) + '<i class="rc-badge" data-for="' + esc(l.code) + '"></i><b class="rc-unlink" data-unlink="' + esc(l.code) + '" title="Unlink">×</b></button>';
            });
            html += '<button type="button" class="rc-addlink" title="Link a Phosphor or Antimony Space">+ Link a Space</button>';
            box.innerHTML = html;
            box.onclick = function (e) {
                const u = e.target.closest('[data-unlink]');
                if (u) { e.stopPropagation(); removeLink(u.dataset.unlink); return; }
                const c = e.target.closest('[data-ch]');
                if (c) { channel = c.dataset.ch; delete self.unread[channel]; self.renderChannels(); self.renderChat(); return; }
                if (e.target.closest('.rc-addlink')) self.linkForm();
            };
            this.renderBadges();
        },
        linkForm: function () {
            const box = this.el.querySelector('.rc-msgs');
            box.innerHTML = '<div class="rc-card rc-linkform"><b>Link a Space</b><p>Bring a Phosphor chat or an Antimony board right into this panel!</p>' +
                '<div class="rc-seg"><button type="button" data-kind="phosphor" class="on">💬 Phosphor</button><button type="button" data-kind="antimony">📝 Antimony</button></div>' +
                '<div class="rc-row"><input class="rc-input rc-code" placeholder="Space code (like K7Q2MZ9P)" maxlength="40"><button type="button" class="rc-btn rc-gel rc-dolink">Link</button></div>' +
                '<p class="rc-fine">Phosphor Spaces are public parks, not vaults: anyone with the code can read them (unlike your encrypted session chat)! Antimony boards are read-only unless you own them!</p></div>';
            let kind = 'phosphor';
            box.querySelectorAll('[data-kind]').forEach(function (b) {
                b.addEventListener('click', function () { kind = b.dataset.kind; box.querySelectorAll('[data-kind]').forEach(function (x) { x.classList.toggle('on', x === b); }); });
            });
            const go = function () { if (!me.name) { ui.askName(); return; } addLink(kind, box.querySelector('.rc-code').value); };
            box.querySelector('.rc-dolink').addEventListener('click', go);
            box.querySelector('.rc-code').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
            box.querySelector('.rc-code').focus();
        },
        renderChat: function () {
            if (!this.el || this.el.hidden || this.tab !== 'chat') return;
            const box = this.el.querySelector('.rc-msgs');
            let list, empty, readOnly = false;
            if (channel === 'room') {
                list = room.chat;
                empty = room.on ? 'No messages yet! Say hi to your collaborators!' : 'Start or join a live session to chat, or link a Phosphor Space with + Link a Space!';
            } else {
                const l = links.find(function (x) { return x.code === channel; });
                list = linkMsgs.get(channel) || [];
                readOnly = !!(l && l.kind === 'antimony' && l.owner !== me.id);
                empty = 'Linked! New ' + (l && l.kind === 'antimony' ? 'posts' : 'messages') + ' appear here live (relays keep no history)!';
            }
            const seen = this.msgSeen || (this.msgSeen = {});
            const fresh = this.chatShown === channel;
            this.chatShown = channel;
            box.innerHTML = list.length ? list.map(function (m) {
                const mine = m.from === me.id;
                const isNew = fresh && !seen[m.id];
                seen[m.id] = true;
                return '<div class="rc-msg' + (mine ? ' mine' : '') + (isNew ? ' rc-enter' : '') + '"><i style="background:' + m.color + '">' + esc((m.name || '?').charAt(0).toUpperCase()) + '</i><div><b>' + esc(m.name) + ' <small>' + new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '</small></b>' + (m.subject ? '<u>' + esc(m.subject) + '</u>' : '') + '<p>' + kdRender(m.text) + '</p></div></div>';
            }).join('') : '<p class="rc-fine rc-empty">' + empty + '</p>';
            box.scrollTop = box.scrollHeight;
            const form = this.el.querySelector('.rc-send');
            form.classList.toggle('rc-ro', readOnly);
            form.querySelector('input').placeholder = readOnly ? 'Read-only board!' : channel === 'room' ? 'Message your collaborators…' : 'Message the Space…';
            form.querySelector('input').disabled = readOnly;
        },
        bumpUnread: function (ch) {
            if (this.el && !this.el.hidden && this.tab === 'chat' && channel === ch) return;
            this.unread[ch] = (this.unread[ch] || 0) + 1;
            this.renderBadges();
            this.renderAvatars();
        },
        renderBadges: function () {
            if (!this.el) return;
            const total = Object.keys(this.unread).reduce(function (n, k) { return n + this.unread[k]; }.bind(this), 0);
            const self = this;
            this.el.querySelectorAll('.rc-badge').forEach(function (b) {
                const n = b.dataset.for === 'chat' ? total : (self.unread[b.dataset.for] || 0);
                b.textContent = n ? String(n) : '';
                b.hidden = !n;
            });
        },
        renderComments: function () {
            if (!this.el || this.el.hidden || this.tab !== 'comments') return;
            const box = this.el.querySelector('[data-body="comments"]');
            const A = cfg.adapter.comments;
            if (!A) { box.innerHTML = '<p class="rc-fine">Comments are not available here yet!</p>'; return; }
            if (box.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA' && document.activeElement.value) return;
            let list = [];
            try { list = A.list() || []; } catch (e) { console.error(e); }
            let html = '<div class="rc-card"><b>' + esc(A.hint || 'New comment') + '</b><textarea class="rc-input rc-newc" rows="2" placeholder="Write a comment…"></textarea><button type="button" class="rc-btn rc-gel rc-addc">Comment</button></div>';
            html += list.length ? list.map(function (c) {
                return '<div class="rc-com' + (c.resolved ? ' resolved' : '') + '" data-cid="' + esc(c.id) + '"><button type="button" class="rc-com-where" data-jump="' + esc(c.id) + '">' + esc(c.where || '') + '</button>' +
                    (c.items || []).map(function (it) { return '<div class="rc-com-item"><i style="background:' + colorOf(it.by || it.name || '') + '">' + esc((it.name || '?').charAt(0).toUpperCase()) + '</i><div><b>' + esc(it.name) + ' <small>' + (it.at ? new Date(it.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '') + '</small></b><p>' + esc(it.text) + '</p></div></div>'; }).join('') +
                    '<div class="rc-row rc-com-tools"><input class="rc-input rc-reply" placeholder="Reply…"><button type="button" class="rc-btn rc-doreply">Reply</button><button type="button" class="rc-btn rc-resolve" title="Resolve and remove">✓</button></div></div>';
            }).join('') : '<p class="rc-fine">No comments yet! Comments ride inside the ' + esc(cfg.docName) + ', so they sync live and save with it!</p>';
            box.innerHTML = html;
            const self = this;
            box.querySelector('.rc-addc').addEventListener('click', function () {
                const t = box.querySelector('.rc-newc').value.trim();
                if (!t) return;
                if (!me.name) { self.askName(); return; }
                try { if (A.add(t, me) === false) return; } catch (e) { console.error(e); return; }
                localChanged();
                self.renderComments();
            });
            box.querySelectorAll('.rc-com').forEach(function (el) {
                const id = el.dataset.cid;
                el.querySelector('[data-jump]').addEventListener('click', function () { try { A.jump(id); } catch (e) {} });
                const reply = function () {
                    const t = el.querySelector('.rc-reply').value.trim();
                    if (!t) return;
                    if (!me.name) { self.askName(); return; }
                    A.reply(id, t, me);
                    localChanged();
                    self.renderComments();
                };
                el.querySelector('.rc-doreply').addEventListener('click', reply);
                el.querySelector('.rc-reply').addEventListener('keydown', function (e) { if (e.key === 'Enter') reply(); });
                el.querySelector('.rc-resolve').addEventListener('click', function () { A.resolve(id); localChanged(); self.renderComments(); });
            });
        },
        renderAvatars: function () {
            document.querySelectorAll('.rc-share').forEach(function (btn) {
                const stack = btn.querySelector('.rc-av');
                if (!stack) return;
                const ps = [...room.peers.values()].slice(0, 4);
                keyed(stack, ps.map(function (p) { return { key: p.id, tag: 'i', cls: '', style: 'background:' + p.color, title: p.name, html: esc(p.name.charAt(0).toUpperCase()) }; }));
                const unread = Object.keys(ui.unread).reduce(function (n, k) { return n + ui.unread[k]; }, 0);
                btn.classList.toggle('rc-has-unread', unread > 0);
            });
        }
    };

    // A Share button with live avatars, for any toolbar!
    function shareButton(opts) {
        opts = opts || {};
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rc-share' + (opts.cls ? ' ' + opts.cls : '');
        b.title = 'Share, comments and chat';
        b.innerHTML = '<span class="rc-av"></span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M17 8v6M14 11h6"/></svg><span class="rc-share-lab">' + (opts.label || 'Share') + '</span>';
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function (e) { e.stopPropagation(); ui.toggle(); });
        setTimeout(function () { ui.status(); ui.renderAvatars(); }, 0);
        return b;
    }

    function init(config) {
        cfg = config;
        ui.build();
        // Rejoin after a reload, or join from an invite link!
        const fromLink = parseHash();
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem(cfg.app + '_collab_session') || 'null'); } catch (e) {}
        if (fromLink) {
            setTimeout(function () {
                if (saved && saved.id === fromLink.id) { join(fromLink.id, fromLink.key, true); return; }
                ui.open('people');
                if (!me.name) ui.askName(function () { join(fromLink.id, fromLink.key); });
                else join(fromLink.id, fromLink.key);
            }, 400);
        } else if (saved && saved.id) {
            setTimeout(function () {
                openRoom(saved.id, saved.key, saved.role || 'guest', 'rejoin');
            }, 400);
        }
        if (links.length) setTimeout(startLinks, 600);
        document.addEventListener('selectionchange', cursorMoved);
        window.addEventListener('beforeunload', function () { if (room.on) send('a', { t: 'bye', from: me.id }); });
        window.addEventListener('hashchange', function () { const h = parseHash(); if (h) join(h.id, h.key); });
    }

    window.RadiiCollab = {
        init: init,
        changed: localChanged,
        cursorMoved: cursorMoved,
        shareButton: shareButton,
        open: function (tab) { ui.open(tab); },
        toggle: function (tab) { ui.toggle(tab); },
        start: start,
        leave: leave,
        isLive: function () { return room.on; },
        isSynced: function () { return room.on && room.synced; },
        isApplying: function () { return applying; },
        me: function () { return me; },
        peers: function () { return [...room.peers.values()]; },
        colorOf: colorOf,
        esc: esc,
        uid: rid,
        refreshComments: function () { ui.renderComments(); },
        // The room's current value for a unit (adapters rebuild from these!)
        unit: function (k) { const u = room.units.get(k); return u && u.v !== null ? JSON.parse(u.v) : null; },
        unitKeys: function (prefix) { const o = []; room.units.forEach(function (u, k) { if (u.v !== null && k.indexOf(prefix) === 0) o.push(k); }); return o; },
        toast: function (m) { ui.toast(m); },
        keyed: keyed,
        kdRender: kdRender,
        _debug: { room: room, relay: relay }
    };
})();
