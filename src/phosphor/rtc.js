// Phosphor calls! Voice, video and screen sharing inside a Space, straight between browsers (WebRTC).
// The relays only carry the little "how do I reach you" notes (offers, answers, network hints);
// the sound and pictures go directly from browser to browser, encrypted by WebRTC itself (DTLS-SRTP).
// Everyone connects to everyone (a mesh), which works well for small calls (about 6 people).

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const PING_MS = 8000;
const GONE_MS = 26000;

export function createCalls(h) {
    // h: { root, publish(topic, payload), subscribe(topics), unsubscribe(topics), me(), activeCode(), spaceName(code), toast(msg), sound(name), onChange() }
    const topicOf = (code) => `${h.root}/rtc/${code}`;
    let call = null;            // { code, stream, peers: Map(id -> peer), video, screen, muted, camOff }
    const seen = new Map();     // code -> Map(id -> {name, at, video}) people in a call (also when I am not in it)
    let pingTimer = null;

    const send = (code, obj) => {
        try { h.publish(topicOf(code), JSON.stringify(Object.assign({ v: 1, from: h.me().clientId, name: h.me().name, at: Date.now() }, obj))); } catch (e) {}
    };
    const roster = (code) => { if (!seen.has(code)) seen.set(code, new Map()); return seen.get(code); };
    const sweep = () => {
        const now = Date.now();
        seen.forEach((m) => m.forEach((p, id) => { if (now - p.at > GONE_MS) m.delete(id); }));
        if (call) call.peers.forEach((p, id) => { if (now - p.at > GONE_MS) dropPeer(id); });
        h.onChange();
    };

    /* ---------- Watching a Space for calls (to show "call in progress") ---------- */
    let watching = null;
    function watch(code) {
        if (watching === code) return;
        if (watching && (!call || call.code !== watching)) h.unsubscribe(topicOf(watching));
        watching = code;
        if (code) h.subscribe(topicOf(code));
        if (code) send(code, { t: 'who' }); // anyone in a call here answers with a ping
    }

    /* ---------- Peers ---------- */
    function makePeer(id, name) {
        if (call.peers.has(id)) return call.peers.get(id);
        const pc = new RTCPeerConnection({ iceServers: ICE });
        const peer = { id, name: name || 'Someone', pc, stream: new MediaStream(), at: Date.now(), state: 'connecting', talking: false };
        call.peers.set(id, peer);
        call.stream.getTracks().forEach((t) => pc.addTrack(t, call.stream));
        pc.onicecandidate = (e) => { if (e.candidate) send(call.code, { t: 'ice', to: id, c: e.candidate.toJSON() }); };
        pc.ontrack = (e) => {
            e.streams[0] ? e.streams[0].getTracks().forEach((t) => { if (!peer.stream.getTracks().includes(t)) peer.stream.addTrack(t); }) : peer.stream.addTrack(e.track);
            watchLevel(peer, peer.stream);
            h.onChange();
        };
        pc.onconnectionstatechange = () => {
            peer.state = pc.connectionState;
            if (pc.connectionState === 'failed') { h.toast('Could not reach ' + peer.name + ' directly (some networks block calls)!'); }
            h.onChange();
        };
        return peer;
    }
    async function offerTo(peer) {
        try {
            const o = await peer.pc.createOffer();
            await peer.pc.setLocalDescription(o);
            send(call.code, { t: 'offer', to: peer.id, sdp: peer.pc.localDescription.sdp });
        } catch (e) { console.error(e); }
    }
    function dropPeer(id) {
        const p = call && call.peers.get(id);
        if (!p) return;
        try { p.pc.close(); } catch (e) {}
        if (p.meter) p.meter.stop();
        call.peers.delete(id);
        h.sound && h.sound('leave');
        h.onChange();
    }
    // the one with the smaller id makes the offer, so two people never offer to each other at once
    const iOffer = (id) => h.me().clientId < id;

    /* ---------- Signals from the relay ---------- */
    async function onSignal(code, payload) {
        let m;
        try { m = JSON.parse(payload); } catch (e) { return; }
        if (!m || !m.from || m.from === h.me().clientId) return;
        if (m.t === 'bye') { roster(code).delete(m.from); if (call && call.code === code) dropPeer(m.from); h.onChange(); return; }
        if (m.t === 'who') { if (call && call.code === code) send(code, { t: 'ping', video: !!call.video }); return; }
        if (m.t === 'hello' || m.t === 'ping' || m.t === 'here') {
            const r = roster(code);
            const isNew = !r.has(m.from);
            r.set(m.from, { name: String(m.name || 'Someone').slice(0, 24), at: Date.now(), video: !!m.video });
            if (call && call.code === code) {
                const known = call.peers.get(m.from);
                if (known) known.at = Date.now();
                if (m.t === 'hello') send(code, { t: 'here', to: m.from, video: !!call.video });
                if (!known && (m.t !== 'here' || m.to === h.me().clientId || isNew)) {
                    const peer = makePeer(m.from, m.name);
                    if (iOffer(m.from)) offerTo(peer);
                    h.sound && h.sound('join');
                }
            }
            h.onChange();
            return;
        }
        if (!call || call.code !== code || m.to !== h.me().clientId) return;
        if (m.t === 'offer') {
            const peer = makePeer(m.from, m.name);
            peer.at = Date.now();
            try {
                await peer.pc.setRemoteDescription({ type: 'offer', sdp: String(m.sdp) });
                const a = await peer.pc.createAnswer();
                await peer.pc.setLocalDescription(a);
                send(code, { t: 'answer', to: m.from, sdp: peer.pc.localDescription.sdp });
                (peer.pending || []).forEach((c) => peer.pc.addIceCandidate(c).catch(() => {}));
                peer.pending = [];
            } catch (e) { console.error(e); }
        } else if (m.t === 'answer') {
            const peer = call.peers.get(m.from);
            if (!peer) return;
            try {
                await peer.pc.setRemoteDescription({ type: 'answer', sdp: String(m.sdp) });
                (peer.pending || []).forEach((c) => peer.pc.addIceCandidate(c).catch(() => {}));
                peer.pending = [];
            } catch (e) { console.error(e); }
        } else if (m.t === 'ice' && m.c) {
            const peer = call.peers.get(m.from) || makePeer(m.from, m.name);
            if (peer.pc.remoteDescription) peer.pc.addIceCandidate(m.c).catch(() => {});
            else (peer.pending = peer.pending || []).push(m.c);
        }
    }

    /* ---------- Who is talking (a little level meter per person) ---------- */
    let actx = null;
    function watchLevel(who, stream) {
        if (who.meter || !stream.getAudioTracks().length) return;
        try {
            actx = actx || new (window.AudioContext || window.webkitAudioContext)();
            const src = actx.createMediaStreamSource(stream);
            const an = actx.createAnalyser();
            an.fftSize = 512;
            src.connect(an);
            const buf = new Uint8Array(an.fftSize);
            const t = setInterval(() => {
                an.getByteTimeDomainData(buf);
                let peak = 0;
                for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
                const talking = peak > 12;
                if (talking !== who.talking) { who.talking = talking; h.onChange(); }
            }, 160);
            who.meter = { stop: () => { clearInterval(t); try { src.disconnect(); } catch (e) {} } };
        } catch (e) {}
    }

    /* ---------- Joining, leaving and the buttons ---------- */
    async function join(code, withVideo) {
        if (!code) return;
        if (call && call.code === code) { if (withVideo && !call.video) await setCamera(true); return; }
        if (call) leave(true);
        if (!navigator.mediaDevices || !window.RTCPeerConnection) { h.toast('This browser cannot make calls!'); return; }
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: withVideo ? { width: { ideal: 640 }, height: { ideal: 360 } } : false });
        } catch (e) {
            if (withVideo) {
                try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); h.toast('No camera allowed, so you joined with voice only!'); withVideo = false; }
                catch (e2) { h.toast('Phosphor needs your microphone for calls (allow it in the address bar)!'); return; }
            } else { h.toast('Phosphor needs your microphone for calls (allow it in the address bar)!'); return; }
        }
        call = { code, stream, peers: new Map(), video: !!withVideo, screen: null, muted: false, camOff: false, me: { talking: false } };
        watchLevel(call.me, stream);
        h.subscribe(topicOf(code));
        watching = code;
        send(code, { t: 'hello', video: call.video });
        clearInterval(pingTimer);
        pingTimer = setInterval(() => { if (call) send(call.code, { t: 'ping', video: !!call.video }); sweep(); }, PING_MS);
        h.sound && h.sound('join');
        h.toast((withVideo ? 'Video' : 'Voice') + ' call joined in ' + h.spaceName(code) + '!');
        h.onChange();
    }
    function leave(quiet) {
        if (!call) return;
        send(call.code, { t: 'bye' });
        call.peers.forEach((p) => { try { p.pc.close(); } catch (e) {} if (p.meter) p.meter.stop(); });
        call.stream.getTracks().forEach((t) => t.stop());
        if (call.screen) call.screen.getTracks().forEach((t) => t.stop());
        if (call.me.meter) call.me.meter.stop();
        const code = call.code;
        call = null;
        clearInterval(pingTimer);
        roster(code).delete(h.me().clientId);
        if (!quiet) { h.sound && h.sound('leave'); h.toast('You left the call!'); }
        h.onChange();
    }
    function toggleMute() {
        if (!call) return;
        call.muted = !call.muted;
        call.stream.getAudioTracks().forEach((t) => { t.enabled = !call.muted; });
        h.onChange();
    }
    const senders = (kind) => {
        const out = [];
        call.peers.forEach((p) => p.pc.getSenders().forEach((s) => { if (s.track && s.track.kind === kind) out.push(s); }));
        return out;
    };
    async function setCamera(on) {
        if (!call) return;
        const cam = call.stream.getVideoTracks()[0];
        if (!on) { if (cam) { cam.enabled = false; } call.camOff = true; h.onChange(); return; }
        if (cam) { cam.enabled = true; call.camOff = false; call.video = true; h.onChange(); return; }
        // turning a camera on in a voice call: add the track, then everyone renegotiates
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 } } });
            const t = s.getVideoTracks()[0];
            call.stream.addTrack(t);
            call.video = true; call.camOff = false;
            call.peers.forEach((p) => { p.pc.addTrack(t, call.stream); offerTo(p); });
            h.onChange();
        } catch (e) { h.toast('No camera allowed!'); }
    }
    async function toggleScreen() {
        if (!call) return;
        if (call.screen) { stopScreen(); return; }
        try {
            const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const t = s.getVideoTracks()[0];
            call.screen = s;
            const cams = senders('video');
            if (cams.length) cams.forEach((snd) => snd.replaceTrack(t));
            else call.peers.forEach((p) => { p.pc.addTrack(t, s); offerTo(p); });
            t.onended = stopScreen;
            h.toast('Sharing your screen!');
            h.onChange();
        } catch (e) { /* (they cancelled the picker) */ }
    }
    function stopScreen() {
        if (!call || !call.screen) return;
        const cam = call.stream.getVideoTracks()[0] || null;
        senders('video').forEach((snd) => { if (call.screen.getTracks().includes(snd.track)) snd.replaceTrack(cam); });
        call.screen.getTracks().forEach((t) => t.stop());
        call.screen = null;
        h.onChange();
    }

    setInterval(sweep, 5000);
    window.addEventListener('beforeunload', () => { if (call) send(call.code, { t: 'bye' }); });

    return {
        watch, onSignal, join, leave, toggleMute, setCamera, toggleScreen,
        state: () => call,
        inCallHere: (code) => [...roster(code).entries()].map(([id, p]) => Object.assign({ id }, p)),
        isIn: (code) => !!call && call.code === code,
    };
}
