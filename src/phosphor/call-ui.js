// The call stage: video tiles, talking rings and the call buttons! Drawn from calls.state().
export function mountCallUI(calls, h) {
    // h: { me(), activeCode(), esc(s) }
    const head = document.querySelector('.chat-head-right');
    const chat = document.getElementById('chat-view');
    if (!head || !chat) return () => {};

    const btns = document.createElement('div');
    btns.className = 'call-btns';
    btns.innerHTML = '<button type="button" class="call-btn" data-call="voice" title="Start or join a voice call in this Space!">🎙<span>Voice</span></button>' +
        '<button type="button" class="call-btn" data-call="video" title="Start or join a video call in this Space!">🎥<span>Video</span></button>';
    head.insertBefore(btns, head.firstChild);

    const banner = document.createElement('div');
    banner.id = 'call-banner';
    banner.className = 'call-banner';
    banner.hidden = true;
    const stage = document.createElement('section');
    stage.id = 'call-stage';
    stage.className = 'call-stage';
    stage.hidden = true;
    stage.innerHTML = '<div class="call-grid"></div><div class="call-controls">' +
        '<button type="button" class="ctl" data-ctl="mute" title="Mute or unmute your microphone">🎙<span>Mute</span></button>' +
        '<button type="button" class="ctl" data-ctl="cam" title="Turn your camera on or off">🎥<span>Camera</span></button>' +
        '<button type="button" class="ctl" data-ctl="screen" title="Share your screen">🖥<span>Share screen</span></button>' +
        '<button type="button" class="ctl leave" data-ctl="leave" title="Leave the call">✆<span>Leave</span></button></div>';
    const anchor = document.getElementById('members-bar') || document.getElementById('messages');
    chat.insertBefore(banner, anchor);
    chat.insertBefore(stage, anchor);

    btns.addEventListener('click', (e) => {
        const b = e.target.closest('[data-call]');
        if (b) calls.join(h.activeCode(), b.getAttribute('data-call') === 'video');
    });
    banner.addEventListener('click', (e) => {
        const b = e.target.closest('[data-join]');
        if (b) calls.join(h.activeCode(), b.getAttribute('data-join') === 'video');
    });
    stage.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ctl]');
        if (!b) return;
        const c = calls.state();
        const act = b.getAttribute('data-ctl');
        if (act === 'mute') calls.toggleMute();
        else if (act === 'cam') calls.setCamera(!(c && c.video && !c.camOff));
        else if (act === 'screen') calls.toggleScreen();
        else if (act === 'leave') calls.leave();
    });

    const tiles = new Map(); // id -> {el, video}
    const initial = (n) => (String(n || '?').trim().charAt(0) || '?').toUpperCase();
    const hue = (s) => { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.charCodeAt(0)) % 360; return x; };
    function tile(id, name, stream, isMe) {
        let t = tiles.get(id);
        if (!t) {
            const el = document.createElement('div');
            el.className = 'call-tile' + (isMe ? ' me' : '');
            el.innerHTML = '<video playsinline autoplay' + (isMe ? ' muted' : '') + '></video><div class="call-avatar"></div><div class="call-name"></div>';
            t = { el, video: el.querySelector('video') };
            tiles.set(id, t);
        }
        if (t.video.srcObject !== stream) { t.video.srcObject = stream; t.video.play().catch(() => {}); }
        const av = t.el.querySelector('.call-avatar');
        av.textContent = initial(name);
        av.style.background = 'hsl(' + hue(id) + ' 70% 45%)';
        return t;
    }

    function render() {
        const code = h.activeCode();
        const c = calls.state();
        const here = code ? calls.inCallHere(code).filter((p) => p.id !== h.me().clientId) : [];
        const inThis = !!c && c.code === code;
        btns.hidden = !code;
        btns.querySelectorAll('[data-call]').forEach((b) => b.classList.toggle('on', inThis && (b.getAttribute('data-call') === 'video' ? !!c.video : true)));
        // somebody is talking in this Space and I am not in it: a banner to jump in
        if (!inThis && here.length) {
            banner.hidden = false;
            banner.innerHTML = '<span class="pulse"></span><b>' + here.length + (here.length === 1 ? ' person is' : ' people are') + ' in a call</b> <span class="who">' + h.esc(here.map((p) => p.name).join(', ')) + '</span><button type="button" data-join="voice">Join voice</button><button type="button" data-join="video">Join video</button>';
        } else banner.hidden = true;
        stage.hidden = !inThis;
        document.body.classList.toggle('in-call', inThis);
        const grid = stage.querySelector('.call-grid');
        if (!inThis) { tiles.forEach((t) => { t.video.srcObject = null; }); tiles.clear(); grid.innerHTML = ''; return; }
        const want = new Set(['me']);
        const meTile = tile('me', h.me().name + ' (you)', c.screen || c.stream, true);
        const meHasVideo = !!(c.screen || (c.video && !c.camOff && c.stream.getVideoTracks().some((t) => t.enabled)));
        meTile.el.classList.toggle('has-video', meHasVideo);
        meTile.el.classList.toggle('talking', !!c.me.talking && !c.muted);
        meTile.el.classList.toggle('muted', !!c.muted);
        meTile.el.querySelector('.call-name').textContent = h.me().name + ' (you)' + (c.muted ? ' · muted' : '') + (c.screen ? ' · sharing' : '');
        if (meTile.el.parentNode !== grid) grid.appendChild(meTile.el);
        c.peers.forEach((p) => {
            want.add(p.id);
            const t = tile(p.id, p.name, p.stream, false);
            const vt = p.stream.getVideoTracks();
            t.el.classList.toggle('has-video', vt.length > 0 && vt.some((x) => x.readyState === 'live' && !x.muted));
            t.el.classList.toggle('talking', !!p.talking);
            t.el.classList.toggle('connecting', p.state !== 'connected');
            t.el.querySelector('.call-name').textContent = p.name + (p.state === 'connected' ? '' : ' · ' + (p.state === 'failed' ? 'could not connect' : 'connecting…'));
            if (t.el.parentNode !== grid) grid.appendChild(t.el);
            vt.forEach((x) => { if (!x._watched) { x._watched = true; x.onmute = x.onunmute = render; } });
        });
        tiles.forEach((t, id) => { if (!want.has(id)) { t.video.srcObject = null; t.el.remove(); tiles.delete(id); } });
        grid.dataset.count = String(want.size);
        const set = (sel, on, label) => { const b = stage.querySelector(sel); b.classList.toggle('off', !on); b.querySelector('span').textContent = label; };
        set('[data-ctl="mute"]', !c.muted, c.muted ? 'Unmute' : 'Mute');
        set('[data-ctl="cam"]', c.video && !c.camOff, c.video && !c.camOff ? 'Camera off' : 'Camera on');
        set('[data-ctl="screen"]', !!c.screen, c.screen ? 'Stop sharing' : 'Share screen');
    }
    return render;
}
