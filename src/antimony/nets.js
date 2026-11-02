// WebRTC only! Every Space's messages, presence, files and moderation travel straight between
// browsers over DataChannels! The shared relay only carries the "how do I reach you" notes
// (offers, answers, network hints), the Space's directory card and call setup, never a message!
// Peers may only speak for themselves: a message whose `from` is not the browser that sent it
// is dropped, so moderation (owner + admins) can actually be trusted!
// (Shared by Phosphor and Antimony: antimony/nets.js is a copy!)

export const NETS = {
    webrtc: { label: 'WebRTC', icon: '⇄', blurb: 'Browser to browser! Messages skip the servers!' },
};

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const FRAG = 48000;        // DataChannel messages stay well under the 256 KB browser limit!
const P2P_PING_MS = 10000;
const P2P_GONE_MS = 32000;

export function createNets(h) {
    // h: { root, label, me(), spaceOf(code), deliver(topic, payload), sig: {publish, subscribe, unsubscribe},
    //      history(code), onSync(code, items), staff(code), onStaff(code, fromId, state), onChange(), toast(msg) }
    const R = h.root;

    // Which Space a topic belongs to!
    function parse(topic) {
        const rest = topic.startsWith(R + '/') ? topic.slice(R.length + 1) : '';
        const [kind, code, extra] = rest.split('/');
        return { kind, code, extra };
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
    function staffFrame(code) {
        try { const s = h.staff && h.staff(code); return s ? { t: 'staff', s } : null; } catch (e) { return null; }
    }
    function wireChannel(r, peer, dc) {
        peer.dc = dc;
        dc.onopen = () => {
            peer.open = true;
            // Late joiners get the Space's admins + blocked words, my presence and the recent history right away!
            const st = staffFrame(r.code);
            if (st) sendTo(peer, st);
            r.retained.forEach((payload, topic) => sendTo(peer, { t: 'pub', topic, p: payload }));
            // (never system notes or private warnings: those belong to this browser alone!)
            const items = (h.history(r.code) || []).filter((m) => m && m.kind !== 'sys' && m.kind !== 'warn' && !(m.file && m.file.chunked)).slice(-60);
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
            // Peers may only speak for THIS Space, only post their own presence, and only send their own messages!
            const t = parse(m.topic);
            if (t.code !== r.code) return;
            if (t.kind === 'presence' && t.extra !== peer.id) return;
            if (t.kind !== 'msg' && t.kind !== 'presence') return;
            if (t.kind === 'msg') {
                let body;
                try { body = JSON.parse(m.p); } catch (e) { return; }
                if (!body || body.from !== peer.id) return;
            }
            h.deliver(m.topic, m.p);
        } else if (m.t === 'sync' && Array.isArray(m.items)) {
            h.onSync(r.code, m.items.slice(-60));
        } else if (m.t === 'staff' && m.s && typeof m.s === 'object') {
            try { if (h.onStaff) h.onStaff(r.code, peer.id, m.s); } catch (e) {}
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
                wireChannel(r, peer, peer.pc.createDataChannel(h.label || 'radii', { ordered: true }));
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
    // Admins or blocked words changed: tell everyone linked right now!
    function pushStaff(code) {
        const r = p2p.get(code);
        const st = staffFrame(code);
        if (r && st) r.peers.forEach((p) => sendTo(p, st));
    }

    /* ---------- The router the app's mesh object asks ---------- */
    // Returns null for the topics the relay still carries: handshakes, directory cards and call setup!
    function route(topic) {
        const t = parse(topic);
        if (!t.code || !h.spaceOf(t.code)) return null;
        if (t.kind !== 'msg' && t.kind !== 'presence') return null;
        return {
            publish: (tp, p, r) => p2pPublish(t.code, tp, p, r),
            subscribe: () => { room(t.code); },
            unsubscribe: () => {},
        };
    }

    // Keep rooms matching the Space list (call after spaces change)!
    function sync(spaces) {
        const want = new Set(spaces.map((s) => s.code));
        p2p.forEach((_, code) => { if (!want.has(code)) closeRoom(code); });
        if (h.me()) want.forEach((code) => room(code));
    }
    // The relay came back: say hello again so rooms re-form!
    function rehello() { p2p.forEach((_, code) => signal(code, { t: 'hello' })); }

    function status(code) {
        const n = NETS.webrtc;
        const r = p2p.get(code);
        const open = r ? [...r.peers.values()].filter((p) => p.open).length : 0;
        return { net: 'webrtc', label: n.label, ok: true, peers: open, detail: open ? open + ' direct ' + (open === 1 ? 'link' : 'links') + '!' : 'Waiting for someone to link with!' };
    }
    function peers(code) {
        const r = p2p.get(code);
        return r ? [...r.peers.values()].filter((p) => p.open).map((p) => p.id) : [];
    }

    return { route, onSignal, sync, rehello, status, peers, pushStaff, closeAll: () => { [...p2p.keys()].forEach(closeRoom); } };
}
