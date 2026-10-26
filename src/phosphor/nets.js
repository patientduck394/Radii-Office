// Space networks! Every Space picks how its messages travel:
//   emqx     - its own link to the public EMQX broker (broker.emqx.io)!
//   rabbitmq - a RabbitMQ server with the Web MQTT plugin (wss://host:15676/ws), with an optional login!
//   webrtc   - straight between browsers over DataChannels! The shared relay only carries the
//              "how do I reach you" notes, the messages themselves never touch a server!
// Spaces made before networks existed (no `net`) keep the shared relay network!
import { MiniMqtt } from './mqtt.js';

export const NETS = {
    emqx: { label: 'EMQX', icon: '☁', blurb: 'Public EMQX broker! Fast and always on!' },
    rabbitmq: { label: 'RabbitMQ', icon: '🐇', blurb: 'Your own RabbitMQ server (Web MQTT plugin)!' },
    webrtc: { label: 'WebRTC', icon: '⇄', blurb: 'Browser to browser! Messages skip the servers!' },
};
export const EMQX_URL = 'wss://broker.emqx.io:8084/mqtt';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const FRAG = 48000;        // DataChannel messages stay well under the 256 KB browser limit!
const P2P_PING_MS = 10000;
const P2P_GONE_MS = 32000;
const QUEUE_MAX = 300;

export function createNets(h) {
    // h: { root, me(), spaceOf(code), deliver(topic, payload), sig: {publish, subscribe, unsubscribe},
    //      history(code), onSync(code, items), onChange(), toast(msg) }
    const R = h.root;

    // Which Space a topic belongs to, and whether it is the shared directory!
    function parse(topic) {
        const rest = topic.startsWith(R + '/') ? topic.slice(R.length + 1) : '';
        const [kind, code, extra] = rest.split('/');
        return { kind, code, extra };
    }
    function netOf(code) { const s = h.spaceOf(code); return s && NETS[s.net] ? s.net : ''; }

    /* ---------- MQTT links (EMQX + RabbitMQ) ---------- */
    const links = new Map(); // key -> link
    function linkKey(s) { return s.net === 'emqx' ? 'emqx' : 'rmq|' + ((s.rmq && s.rmq.url) || '') + '|' + ((s.rmq && s.rmq.user) || ''); }
    function makeLink(key, url, user, pass, label) {
        const link = { key, url, user, pass, label, mqtt: null, subs: new Set(), queue: [], tries: 0, timer: null, error: '', closed: false };
        link.dial = () => {
            clearTimeout(link.timer);
            if (link.closed || !h.me()) return;
            let m;
            try { m = new MiniMqtt(url, { clientId: h.me().clientId + '_' + Date.now().toString(36), keepalive: 60, username: user || undefined, password: pass || undefined }); }
            catch (e) { link.error = 'Bad server address!'; h.onChange(); return; }
            link.mqtt = m;
            const fail = setTimeout(() => { if (!m.connected) { try { m.close(); } catch (e) {} } }, 8000);
            m.onopen = () => {
                clearTimeout(fail);
                link.tries = 0; link.error = '';
                if (link.subs.size) try { m.subscribe([...link.subs]); } catch (e) {}
                const q = link.queue.splice(0);
                q.forEach(([t, p, r]) => { try { m.publish(t, p, r); } catch (e) {} });
                h.onChange();
            };
            m.onmessage = (t, p) => h.deliver(t, p);
            m.onerror = (e) => { if (e && /refused/i.test(String(e.message))) link.error = 'The server refused the login!'; };
            m.onclose = () => {
                clearTimeout(fail);
                if (link.mqtt !== m) return;
                link.mqtt = null;
                if (!link.error) link.error = 'Reconnecting…';
                h.onChange();
                if (link.closed) return;
                link.tries++;
                link.timer = setTimeout(link.dial, Math.min(30000, 1000 * Math.pow(2, Math.min(link.tries, 5))));
            };
            try { m.connect(); } catch (e) { link.error = 'Bad server address!'; link.mqtt = null; h.onChange(); }
        };
        link.connected = () => !!(link.mqtt && link.mqtt.connected);
        link.publish = (t, p, r) => {
            if (link.connected()) { try { link.mqtt.publish(t, p, r); return; } catch (e) {} }
            link.queue.push([t, p, r]);
            if (link.queue.length > QUEUE_MAX) link.queue.shift();
        };
        link.subscribe = (list) => { list.forEach((t) => link.subs.add(t)); if (link.connected()) try { link.mqtt.subscribe(list); } catch (e) {} };
        link.unsubscribe = (list) => { list.forEach((t) => link.subs.delete(t)); if (link.connected()) try { link.mqtt.unsubscribe(list); } catch (e) {} };
        link.close = () => { link.closed = true; clearTimeout(link.timer); try { if (link.mqtt) link.mqtt.close(); } catch (e) {} link.mqtt = null; };
        links.set(key, link);
        link.dial();
        return link;
    }
    function linkFor(code) {
        const s = h.spaceOf(code);
        if (!s) return null;
        if (s.net === 'rabbitmq' && !(s.rmq && /^wss?:\/\//i.test(s.rmq.url || ''))) return null;
        const key = linkKey(s);
        if (links.has(key)) return links.get(key);
        if (s.net === 'emqx') return makeLink(key, EMQX_URL, '', '', 'EMQX');
        let host = s.rmq.url;
        try { host = new URL(s.rmq.url).host; } catch (e) {}
        return makeLink(key, s.rmq.url, s.rmq.user || '', s.rmq.pass || '', host);
    }

    /* ---------- WebRTC DataChannel mesh ---------- */
    const p2p = new Map(); // code -> { peers: Map(id -> peer), retained: Map(topic -> payload), timer }
    const sigTopic = (code) => `${R}/p2p/${code}`;
    function room(code) {
        let r = p2p.get(code);
        if (r) return r;
        r = { code, peers: new Map(), retained: new Map(), timer: null };
        p2p.set(code, r);
        h.sig.subscribe([sigTopic(code)]);
        const ping = () => { signal(code, { t: 'ping' }); sweep(r); };
        r.timer = setInterval(ping, P2P_PING_MS);
        signal(code, { t: 'hello' });
        return r;
    }
    function closeRoom(code) {
        const r = p2p.get(code);
        if (!r) return;
        signal(code, { t: 'bye' });
        clearInterval(r.timer);
        r.peers.forEach((p) => dropPeer(r, p.id, true));
        h.sig.unsubscribe([sigTopic(code)]);
        p2p.delete(code);
    }
    function signal(code, obj) {
        const me = h.me();
        if (!me) return;
        try { h.sig.publish(sigTopic(code), JSON.stringify(Object.assign({ v: 1, from: me.clientId, name: me.name, at: Date.now() }, obj))); } catch (e) {}
    }
    function sweep(r) {
        const now = Date.now();
        r.peers.forEach((p) => { if (now - p.at > P2P_GONE_MS) dropPeer(r, p.id); });
    }
    function dropPeer(r, id, quiet) {
        const p = r.peers.get(id);
        if (!p) return;
        r.peers.delete(id);
        try { p.pc.close(); } catch (e) {}
        if (!quiet && p.open) h.deliver(`${R}/presence/${r.code}/${id}`, JSON.stringify({ online: false }));
        h.onChange();
    }
    function makePeer(r, id, name) {
        if (r.peers.has(id)) return r.peers.get(id);
        const pc = new RTCPeerConnection({ iceServers: ICE });
        const peer = { id, name: name || 'Someone', pc, dc: null, open: false, at: Date.now(), parts: new Map(), pending: [] };
        r.peers.set(id, peer);
        pc.onicecandidate = (e) => { if (e.candidate) signal(r.code, { t: 'ice', to: id, c: e.candidate.toJSON() }); };
        pc.ondatachannel = (e) => wireChannel(r, peer, e.channel);
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') { h.toast('Could not reach ' + peer.name + ' directly (some networks block WebRTC)!'); dropPeer(r, id); }
            else if (pc.connectionState === 'closed') dropPeer(r, id);
        };
        return peer;
    }
    function wireChannel(r, peer, dc) {
        peer.dc = dc;
        dc.onopen = () => {
            peer.open = true;
            // Late joiners get my presence and the recent history right away!
            r.retained.forEach((payload, topic) => sendTo(peer, { t: 'pub', topic, p: payload }));
            const items = (h.history(r.code) || []).slice(-60).filter((m) => !(m.file && m.file.chunked));
            if (items.length) sendTo(peer, { t: 'sync', items });
            h.onChange();
        };
        dc.onclose = () => dropPeer(r, peer.id);
        dc.onmessage = (e) => onFrame(r, peer, e.data);
    }
    function sendTo(peer, obj) {
        if (!peer.dc || peer.dc.readyState !== 'open') return;
        const s = JSON.stringify(obj);
        try {
            if (s.length <= FRAG) { peer.dc.send(s); return; }
            const id = Math.random().toString(36).slice(2, 10);
            const n = Math.ceil(s.length / FRAG);
            for (let i = 0; i < n; i++) peer.dc.send(JSON.stringify({ t: 'frag', id, i, n, d: s.slice(i * FRAG, (i + 1) * FRAG) }));
        } catch (e) { /* buffer full: the next ping or retry fixes it */ }
    }
    function onFrame(r, peer, raw) {
        let m;
        try { m = JSON.parse(raw); } catch (e) { return; }
        if (!m) return;
        peer.at = Date.now();
        if (m.t === 'frag') {
            let f = peer.parts.get(m.id);
            if (!f) { f = { n: m.n, got: 0, d: [] }; peer.parts.set(m.id, f); }
            if (f.d[m.i] === undefined) { f.d[m.i] = String(m.d); f.got++; }
            if (f.got === f.n) { peer.parts.delete(m.id); onFrame(r, peer, f.d.join('')); }
            if (peer.parts.size > 20) peer.parts.delete(peer.parts.keys().next().value);
            return;
        }
        if (m.t === 'pub' && typeof m.topic === 'string' && typeof m.p === 'string') {
            // Peers may only speak for THIS Space, and only post their own presence!
            const t = parse(m.topic);
            if (t.code !== r.code) return;
            if (t.kind === 'presence' && t.extra !== peer.id) return;
            if (t.kind !== 'msg' && t.kind !== 'presence') return;
            h.deliver(m.topic, m.p);
        } else if (m.t === 'sync' && Array.isArray(m.items)) {
            h.onSync(r.code, m.items.slice(-60));
        }
    }
    async function onSignal(code, payload) {
        const r = p2p.get(code);
        const me = h.me();
        if (!r || !me) return;
        let m;
        try { m = JSON.parse(payload); } catch (e) { return; }
        if (!m || !m.from || m.from === me.clientId) return;
        if (m.to && m.to !== me.clientId) return;
        const known = r.peers.get(m.from);
        if (known) known.at = Date.now();
        if (m.t === 'bye') { dropPeer(r, m.from); return; }
        if (m.t === 'hello' || m.t === 'ping') {
            if (m.t === 'hello') signal(code, { t: 'ping', to: m.from });
            const stale = known && !known.open && Date.now() - (known.born || 0) > 15000;
            if (stale) dropPeer(r, m.from, true);
            if ((!known || stale) && me.clientId < m.from) {
                const peer = makePeer(r, m.from, m.name);
                peer.born = Date.now();
                wireChannel(r, peer, peer.pc.createDataChannel('phosphor', { ordered: true }));
                try {
                    await peer.pc.setLocalDescription(await peer.pc.createOffer());
                    signal(code, { t: 'offer', to: m.from, sdp: peer.pc.localDescription.sdp });
                } catch (e) { console.error(e); }
            }
            return;
        }
        if (m.t === 'offer') {
            if (known) dropPeer(r, m.from, true);
            const peer = makePeer(r, m.from, m.name);
            peer.born = Date.now();
            try {
                await peer.pc.setRemoteDescription({ type: 'offer', sdp: String(m.sdp) });
                await peer.pc.setLocalDescription(await peer.pc.createAnswer());
                signal(code, { t: 'answer', to: m.from, sdp: peer.pc.localDescription.sdp });
                peer.pending.splice(0).forEach((c) => peer.pc.addIceCandidate(c).catch(() => {}));
            } catch (e) { console.error(e); }
        } else if (m.t === 'answer' && known) {
            try {
                await known.pc.setRemoteDescription({ type: 'answer', sdp: String(m.sdp) });
                known.pending.splice(0).forEach((c) => known.pc.addIceCandidate(c).catch(() => {}));
            } catch (e) { console.error(e); }
        } else if (m.t === 'ice' && m.c && known) {
            if (known.pc.remoteDescription) known.pc.addIceCandidate(m.c).catch(() => {});
            else known.pending.push(m.c);
        }
    }
    function p2pPublish(code, topic, payload, retain) {
        const r = room(code);
        if (retain) r.retained.set(topic, payload);
        r.peers.forEach((p) => sendTo(p, { t: 'pub', topic, p: payload }));
    }

    /* ---------- The router the app's mesh object asks ---------- */
    // Returns null when a topic should use the shared relay network!
    function route(topic) {
        const t = parse(topic);
        if (!t.code || t.kind === 'dir' || t.kind === 'p2p') return null;
        const net = netOf(t.code);
        if (!net) return null;
        if (net === 'webrtc') {
            if (t.kind === 'rtc') return null; // call signaling rides the shared relay too!
            return {
                publish: (tp, p, r) => p2pPublish(t.code, tp, p, r),
                subscribe: () => { room(t.code); },
                unsubscribe: () => {},
            };
        }
        return linkFor(t.code) || { publish() {}, subscribe() {}, unsubscribe() {} };
    }

    // Keep rooms + links matching the Space list (call after spaces change)!
    function sync(spaces) {
        const wantRooms = new Set(spaces.filter((s) => s.net === 'webrtc').map((s) => s.code));
        p2p.forEach((_, code) => { if (!wantRooms.has(code)) closeRoom(code); });
        if (h.me()) wantRooms.forEach((code) => room(code));
        const wantLinks = new Set(spaces.filter((s) => s.net === 'emqx' || s.net === 'rabbitmq').map(linkKey));
        links.forEach((l, key) => { if (!wantLinks.has(key)) { l.close(); links.delete(key); } });
    }
    // The shared relay came back: say hello again so rooms re-form!
    function rehello() { p2p.forEach((_, code) => signal(code, { t: 'hello' })); }

    function status(code) {
        const s = h.spaceOf(code);
        if (!s || !NETS[s.net]) return { net: '', label: 'Relay network', ok: true, detail: 'Shared Phosphor relays!' };
        const n = NETS[s.net];
        if (s.net === 'webrtc') {
            const r = p2p.get(code);
            const open = r ? [...r.peers.values()].filter((p) => p.open).length : 0;
            return { net: s.net, label: n.label, ok: true, peers: open, detail: open ? open + ' direct ' + (open === 1 ? 'link' : 'links') + '!' : 'Waiting for someone to link with!' };
        }
        if (s.net === 'rabbitmq' && !(s.rmq && s.rmq.url)) return { net: s.net, label: n.label, ok: false, detail: 'Needs a server address! Click to set it!' };
        const l = linkFor(code);
        const ok = !!(l && l.connected());
        return { net: s.net, label: n.label, ok, detail: ok ? 'Live via ' + l.label + '!' : ((l && l.error) || 'Connecting…') };
    }

    // Forget a link so new login details take effect!
    function resetLink(code) {
        const s = h.spaceOf(code);
        if (!s) return;
        links.forEach((l, key) => { if (key.startsWith('rmq|')) { l.close(); links.delete(key); } });
    }

    return { route, onSignal, sync, rehello, status, resetLink, closeAll: () => { [...p2p.keys()].forEach(closeRoom); links.forEach((l) => l.close()); links.clear(); } };
}
