// Phosphor UI sounds! Tiny dependency-free Web Audio synthesizer, no audio files!
(function () {
    var ctx = null;
    var master = null;
    var muted = false;
    try { muted = localStorage.getItem('phosphor_muted') === '1'; } catch (e) {}

    function ensureCtx() {
        try {
            if (ctx) {
                if (ctx.state === 'suspended') ctx.resume().catch(function () {});
                return ctx;
            }
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.5;
            master.connect(ctx.destination);
            if (ctx.state === 'suspended') ctx.resume().catch(function () {});
            return ctx;
        } catch (e) { return null; }
    }

    function blip(freq, dur, type, vol, delay) {
        if (muted) return;
        var ac = ensureCtx();
        if (!ac || !master) return;
        try {
            var t0 = ac.currentTime + (delay || 0);
            var osc = ac.createOscillator();
            var g = ac.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(Math.max(30, freq || 600), t0);
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol || 0.15), t0 + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.08));
            osc.connect(g);
            g.connect(master);
            osc.start(t0);
            osc.stop(t0 + (dur || 0.08) + 0.05);
        } catch (e) {}
    }

    function sweep(from, to, dur, type, vol, delay) {
        if (muted) return;
        var ac = ensureCtx();
        if (!ac || !master) return;
        try {
            var t0 = ac.currentTime + (delay || 0);
            var osc = ac.createOscillator();
            var g = ac.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(Math.max(30, from), t0);
            osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol || 0.15), t0 + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(g);
            g.connect(master);
            osc.start(t0);
            osc.stop(t0 + dur + 0.05);
        } catch (e) {}
    }

    // Compatibility hook for keydown.js applets! They call playAeroClickSound(freq, dur)!
    function playAeroClickSound(freq, dur) {
        blip(freq || 700, dur || 0.06, 'triangle', 0.12, 0);
    }

    var SOUND_ON_SVG = '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.778 19.778c4.295-4.296 4.295-11.26 0-15.556m-2.333 12.222c2.42-2.42 2.42-6.468 0-8.888M13.111 22V2C9.222 2 9.384 5.773 6.333 7.006C4.713 7.66 2 7.666 2 7.666v8.667s2.715-.08 4.333.578C9.4 18.157 9.223 22 13.111 22" /></svg>';
    var SOUND_OFF_SVG = '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.111 22V2C9.222 2 9.384 5.773 6.333 7.006C4.713 7.66 2 7.666 2 7.666v8.667s2.715-.08 4.333.578C9.4 18.157 9.223 22 13.111 22M17 9.5l2.5 2.5m0 0l2.5 2.5M19.5 12L22 9.5M19.5 12L17 14.5" /></svg>';

    var PRESETS = {
        click: function () { blip(700, 0.05, 'triangle', 0.12, 0); },
        open: function () { sweep(500, 750, 0.09, 'sine', 0.14, 0); },
        close: function () { sweep(650, 420, 0.09, 'sine', 0.12, 0); },
        send: function () { blip(520, 0.07, 'sine', 0.16, 0); blip(780, 0.09, 'sine', 0.16, 0.07); },
        receive: function () { blip(880, 0.07, 'triangle', 0.12, 0); blip(660, 0.09, 'triangle', 0.12, 0.07); },
        join: function () { blip(523, 0.08, 'sine', 0.14, 0); blip(659, 0.08, 'sine', 0.14, 0.08); blip(784, 0.1, 'sine', 0.14, 0.16); },
        leave: function () { sweep(420, 240, 0.14, 'sine', 0.12, 0); },
        success: function () { blip(660, 0.08, 'sine', 0.15, 0); blip(880, 0.12, 'sine', 0.15, 0.08); },
        error: function () { blip(200, 0.18, 'sawtooth', 0.1, 0); },
        toggle: function () { sweep(500, 800, 0.08, 'triangle', 0.12, 0); },
        theme: function () { sweep(600, 950, 0.12, 'sine', 0.13, 0); },
        mention: function () { blip(988, 0.09, 'sine', 0.16, 0); blip(1319, 0.12, 'sine', 0.16, 0.09); },
        connect: function () { blip(740, 0.08, 'sine', 0.13, 0); blip(988, 0.1, 'sine', 0.13, 0.08); }
    };

    function playUiSound(name) {
        try {
            var fn = PRESETS[String(name || 'click')];
            if (fn) fn();
            else blip(700, 0.05, 'triangle', 0.12, 0);
        } catch (e) {}
    }

    function updateSoundButtons() {
        try {
            document.querySelectorAll('.sound-toggle').forEach(function (btn) {
                btn.innerHTML = muted ? SOUND_OFF_SVG : SOUND_ON_SVG;
                btn.title = muted ? 'Unmute sounds!' : 'Mute sounds!';
                btn.setAttribute('aria-label', muted ? 'Unmute sounds!' : 'Mute sounds!');
                btn.classList.toggle('muted', muted);
            });
        } catch (e) {}
    }

    function toggleSound() {
        muted = !muted;
        try { localStorage.setItem('phosphor_muted', muted ? '1' : '0'); } catch (e) {}
        updateSoundButtons();
        if (!muted) playUiSound('toggle');
        return false;
    }

    function unlock() {
        ensureCtx();
        updateSoundButtons();
    }

    // Unlock audio on the first user gesture (browsers require it)!
    try {
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateSoundButtons);
        } else {
            updateSoundButtons();
        }
    } catch (e) {}

    window.playAeroClickSound = playAeroClickSound;
    window.playUiSound = playUiSound;
    window.toggleSound = toggleSound;
    window.isMuted = function () { return muted; };
})();
