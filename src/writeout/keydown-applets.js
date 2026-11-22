/* =====================================================================
   Keydown Applets! The little working chips of Keydown (~VD~volume~VD~ is a dial you click, ~BC~power~BC~ a battery
   that drains, ~SR~rate~SR~ stars that light up, clocks, switches, progress bars...).

   Keydown turns ~VD~volume~VD~ into a plain styled word, so this file finishes the job in Writeout and Bitbook:
   every applet chip that appears in the page (typed, loaded from a file, switched from Source to View...) gets its
   real insides (the knob, the battery cells, the stars...) and a click that works, with the same sounds and steps
   as the Keydown engine in Phosphor. The words stay the source: an applet saves back as ~VD~volume~VD~.

   window.KdApplets.hydrate(root)   makes every applet inside root (or root itself) work
   ===================================================================== */
(function () {
    'use strict';

    // the first class of each applet chip says what it is
    const KIND = {
        'applet-foldout-tab': 'foldout', 'applet-aqua-switch': 'toggle', 'applet-state-button': 'state', 'applet-volume-dial': 'volume',
        'applet-battery-cell': 'battery', 'applet-calendar-desk': 'calendar', 'applet-star-rating': 'stars', 'applet-counter-badge': 'counter',
        'applet-security-latch': 'latch', 'applet-playback-ribbon': 'playback', 'applet-cpu-gauge': 'cpu', 'applet-stepper-mesh': 'stepper',
        'applet-hydro-orb': 'hydro', 'applet-lock-slider': 'lockslider', 'applet-gadget-clock': 'gadclock', 'applet-metal-trigger': 'metal',
        'applet-inset-check': 'inset', 'dev-chip-hex': 'hex', 'av-chip-signal': 'signal', 'megachip-circuit-node': 'circuit',
        'jr-chip-voice-tag': 'voice', 'jr-chip-wax-stamp': 'wax', 'applet-neon-node': 'neon', 'applet-latch-toggle': 'latchtoggle',
        'applet-gadget-system-clock': 'sysclock', 'jr-progress-capsule': 'prog', 'jr-dot-matrix': 'dots', 'jr-latch-lock': 'latchlock'
    };
    const SEL = Object.keys(KIND).map(function (c) { return '.' + c; }).join(',');
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    const blip = function (f, d) { try { if (typeof window.playAeroClickSound === 'function') window.playAeroClickSound(f, d); } catch (e) {} };
    const timers = new Set();

    // what is inside each kind of applet (the label is the words you wrote)
    function inner(kind, label, st) {
        const L = esc(label);
        switch (kind) {
            case 'toggle': return '<span>' + L + '</span><div class="switch-pill"></div>';
            case 'state': return L;
            case 'volume': return '<span>' + L + ': ' + (st.kdLevel || '0') + '%</span><div class="dial-knob"' + (st.kdLevel ? ' style="transform:rotate(' + (parseInt(st.kdLevel, 10) / 100 * 270) + 'deg)"' : '') + '></div>';
            case 'battery': {
                const cap = parseInt(st.kdCap || '3', 10);
                let cells = '';
                for (let i = 0; i < 3; i++) cells += '<div class="juice-block' + (i < cap ? '' : ' drain') + '"></div>';
                return '<span>' + L + '</span><div class="battery-juice-grid">' + cells + '</div>';
            }
            case 'calendar': { const now = new Date(); return '<div class="cal-deck-top">' + MONTHS[now.getMonth()] + '</div><div class="cal-deck-body">' + now.getDate() + '</div>'; }
            case 'stars': {
                const r = parseInt(st.kdRating || '0', 10);
                let out = '<span style="margin-right:6px;">' + L + '</span>';
                for (let i = 0; i < 3; i++) out += '<span class="rating-star-node' + (i < r ? ' star-glow' : '') + '">★</span>';
                return out;
            }
            case 'counter': return '<span>' + L + '</span><div class="badge-count-orb">' + (st.kdCount || '0') + '</div>';
            case 'latch': { const locked = st.kdLocked !== '0'; return '<span class="latch-icon-frame">' + (locked ? '🔒' : '🔓') + '</span> <span>' + L + ': ' + (locked ? 'LOCKED' : 'OPEN') + '</span>'; }
            case 'playback': return '<span>' + L + '</span><div class="playback-track-bar"><div class="playback-fill-fluid" style="width:' + (st.kdPct || '0') + '%"></div></div>';
            case 'cpu': return '<div class="gauge-needle-vector"></div>';
            case 'stepper': return '<span>' + L + ': ' + (st.kdVal || '1') + '</span><div class="stepper-arrow-box">▲<br>▼</div>';
            case 'hydro': return '<div class="hydro-sphere"></div> <span>' + L + ': ' + (st.kdHydro || 'SAFE') + '</span>';
            case 'lockslider': return '<span>' + L + '</span><div class="slider-chassis"><div class="slider-handle-metal"></div></div>';
            case 'gadclock': return '<div class="clock-hand-vector"></div>';
            case 'sysclock': return '<div class="gadget-clock-hand"></div>';
            case 'metal': return '<span>' + (st.kdPlaying === '1' ? '■ ' : '▶ ') + L + '</span>';
            case 'inset': return '<div class="check-cavity-box"></div> <span>' + L + '</span>';
            case 'hex': return '<div class="hex-color-orb" style="background-color: ' + L + ';"></div> <span>' + L + '</span>';
            case 'signal': return '<div class="signal-ping-orb"></div> <span>' + L + ': ' + (st.kdOn !== '0' ? 'CONNECTED' : 'DISCONNECT') + '</span>';
            case 'circuit': return '<div class="node-dot"></div> <span>' + L + '</span>';
            case 'voice': return '<span>' + (st.kdPlaying === '1' ? '⏳ PLAYING: ' : '🔊 PLAY DICTATION: ') + L + '</span>';
            case 'neon': return '<div class="neon-node-sphere"></div> <span>' + L + ': ' + (st.kdNeon || 'INFO') + '</span>';
            case 'latchtoggle': return '<span>' + L + '</span><div class="latch-track-chassis"><div class="latch-slider-handle"></div></div>';
            case 'prog': return '<span>' + L + '</span><div class="capsule-fluid-bar"><div class="capsule-fluid-fill" style="width:' + (st.kdFill || '35') + '%"></div></div>';
            case 'dots': {
                const r = parseInt(st.kdRating || '0', 10);
                let out = '<span style="margin-right:6px;">' + L + '</span>';
                for (let i = 0; i < 3; i++) out += '<div class="matrix-bead' + (i < r ? ' bead-glow' : '') + '"></div>';
                return out;
            }
            case 'latchlock': return '<div class="latch-bolt"></div> <span>' + L + '</span>';
            default: return L;
        }
    }

    function kindOf(el) {
        for (const c of el.classList) if (KIND[c]) return KIND[c];
        return '';
    }

    // one applet chip: its kind, its words, its insides. A chip that already has them is left alone
    function make(el) {
        if (el.getAttribute('data-kd') || !el.isConnected) return;
        const kind = kindOf(el);
        if (!kind) return;
        // chips the old typing path built have their own click code: a fresh copy of the chip starts clean, so it never counts twice
        if (el.children.length) { const fresh = el.cloneNode(false); fresh.textContent = el.textContent; el.replaceWith(fresh); el = fresh; }
        const label = el.textContent.replace(/[​]/g, '').trim();
        el.setAttribute('data-kd', kind);
        el.setAttribute('data-label', label);
        el.setAttribute('data-kd-cls', el.className);   // what it was made as (clicks change its classes, but it must still save as the same tag)
        el.setAttribute('contenteditable', 'false');
        el.innerHTML = inner(kind, label, el.dataset);
    }
    function hydrate(root) {
        root = root || document.body;
        if (!root || root.nodeType !== 1) return;
        if (root.matches && root.matches(SEL)) make(root);
        root.querySelectorAll(SEL).forEach(make);
    }

    // a click, the same steps as the engine in Phosphor
    function click(el) {
        const kind = el.getAttribute('data-kd'), label = el.getAttribute('data-label') || '', st = el.dataset;
        switch (kind) {
            case 'toggle': el.classList.toggle('turned-on'); blip(650, 0.08); break;
            case 'foldout': blip(500, 0.15); break;
            case 'state':
                if (el.classList.contains('state-green')) { blip(400, 0.12); el.classList.remove('state-green'); el.classList.add('state-red'); }
                else { blip(650, 0.08); el.classList.remove('state-red'); el.classList.add('state-green'); }
                break;
            case 'volume': {
                const lv = (parseInt(st.kdLevel || '0', 10) + 25) % 125;
                st.kdLevel = String(lv);
                const knob = el.querySelector('.dial-knob'); if (knob) knob.style.transform = 'rotate(' + (lv / 100 * 270) + 'deg)';
                const sp = el.querySelector('span'); if (sp) sp.textContent = label + ': ' + lv + '%';
                blip(400 + lv * 2, 0.08); break;
            }
            case 'battery': {
                let cap = parseInt(st.kdCap || '3', 10);
                cap = cap === 0 ? 3 : cap - 1;
                st.kdCap = String(cap); blip(300 + cap * 100, 0.1);
                el.querySelectorAll('.juice-block').forEach(function (b, i) { b.classList.toggle('drain', i >= cap); });
                break;
            }
            case 'calendar': blip(700, 0.05); break;
            case 'stars': {
                const r = (parseInt(st.kdRating || '0', 10) + 1) % 4;
                st.kdRating = String(r); blip(600 + r * 50, 0.06);
                el.querySelectorAll('.rating-star-node').forEach(function (s, i) { s.classList.toggle('star-glow', i < r); });
                break;
            }
            case 'counter': {
                const n = parseInt(st.kdCount || '0', 10) + 1;
                st.kdCount = String(n); blip(800, 0.05);
                const orb = el.querySelector('.badge-count-orb'); if (orb) orb.textContent = String(n);
                break;
            }
            case 'latch': {
                const locked = st.kdLocked !== '0';
                st.kdLocked = locked ? '0' : '1'; blip(locked ? 900 : 350, locked ? 0.15 : 0.12);
                el.classList.toggle('latch-unlocked', locked);
                el.innerHTML = inner('latch', label, st);
                break;
            }
            case 'playback': {
                if (st.kdPlaying === '1') {
                    st.kdPlaying = '0'; blip(400, 0.05);
                    if (st.kdTimer) { clearInterval(parseInt(st.kdTimer, 10)); timers.delete(parseInt(st.kdTimer, 10)); delete st.kdTimer; }
                } else {
                    st.kdPlaying = '1'; blip(600, 0.05);
                    const id = setInterval(function () {
                        let p = parseInt(st.kdPct || '0', 10);
                        p = p >= 100 ? 0 : p + 2;
                        st.kdPct = String(p);
                        const fill = el.querySelector('.playback-fill-fluid');
                        if (fill && el.isConnected) fill.style.width = p + '%'; else { clearInterval(id); timers.delete(id); }
                    }, 100);
                    st.kdTimer = String(id); timers.add(id);
                }
                break;
            }
            case 'cpu': {
                const angles = [-90, -45, 0, 45, 90];
                const step = (parseInt(st.kdStep || '0', 10) + 1) % angles.length;
                st.kdStep = String(step); blip(500 + step * 80, 0.06);
                const n = el.querySelector('.gauge-needle-vector'); if (n) n.style.transform = 'rotate(' + angles[step] + 'deg)';
                break;
            }
            case 'stepper': {
                const v = parseInt(st.kdVal || '1', 10) + 1;
                st.kdVal = String(v); blip(750, 0.04);
                const sp = el.querySelector('span'); if (sp) sp.textContent = label + ': ' + v;
                break;
            }
            case 'hydro': {
                const order = ['SAFE', 'WARN', 'CRIT'];
                const i = (order.indexOf(st.kdHydro || 'SAFE') + 1) % 3;
                st.kdHydro = order[i]; blip([700, 550, 350][i], i === 2 ? 0.12 : 0.07);
                el.classList.remove('orb-blue', 'orb-yellow', 'orb-red'); el.classList.add(['orb-blue', 'orb-yellow', 'orb-red'][i]);
                const sp = el.querySelector('span'); if (sp) sp.textContent = label + ': ' + order[i];
                break;
            }
            case 'lockslider': {
                const open = st.kdOpen === '1';
                st.kdOpen = open ? '0' : '1'; blip(open ? 400 : 850, open ? 0.08 : 0.1);
                el.classList.toggle('unlocked-state', !open);
                break;
            }
            case 'gadclock': case 'sysclock': blip(700, 0.05); break;
            case 'metal': {
                const playing = st.kdPlaying !== '1';
                st.kdPlaying = playing ? '1' : '0'; blip(playing ? 650 : 450, 0.08);
                el.classList.toggle('trigger-playing', playing);
                el.innerHTML = inner('metal', label, st);
                break;
            }
            case 'inset': el.classList.toggle('box-checked'); blip(600, 0.05); break;
            case 'hex': el.classList.toggle('swatch-active'); blip(750, 0.05); break;
            case 'signal': {
                const on = st.kdOn !== '0';
                st.kdOn = on ? '0' : '1'; blip(on ? 300 : 800, on ? 0.12 : 0.05);
                el.classList.toggle('sig-disconnect', on);
                el.innerHTML = inner('signal', label, st);
                break;
            }
            case 'circuit': blip(750, 0.05); break;
            case 'voice': {
                const playing = st.kdPlaying !== '1';
                st.kdPlaying = playing ? '1' : '0'; blip(playing ? 500 : 350, 0.2);
                el.innerHTML = inner('voice', label, st);
                break;
            }
            case 'wax': blip(250, 0.15); break;
            case 'neon': {
                const order = ['INFO', 'WARN', 'ALERT'];
                const i = (order.indexOf(st.kdNeon || 'INFO') + 1) % 3;
                st.kdNeon = order[i]; blip([750, 550, 350][i], i === 2 ? 0.12 : 0.07);
                el.classList.remove('node-cyan', 'node-yellow', 'node-pink'); el.classList.add(['node-cyan', 'node-yellow', 'node-pink'][i]);
                const sp = el.querySelector('span'); if (sp) sp.textContent = label + ': ' + order[i];
                break;
            }
            case 'latchtoggle': {
                const active = st.kdActive === '1';
                st.kdActive = active ? '0' : '1'; blip(active ? 400 : 800, 0.08);
                el.classList.toggle('latch-active-state', !active);
                break;
            }
            case 'prog': {
                let f = parseInt(st.kdFill || '35', 10);
                f = f >= 95 ? 15 : f + 20;
                st.kdFill = String(f); blip(550 + f, 0.05);
                const fill = el.querySelector('.capsule-fluid-fill'); if (fill) fill.style.width = f + '%';
                break;
            }
            case 'dots': {
                const r = (parseInt(st.kdRating || '0', 10) + 1) % 4;
                st.kdRating = String(r); blip(600, 0.05);
                el.querySelectorAll('.matrix-bead').forEach(function (b, i) { b.classList.toggle('bead-glow', i < r); });
                break;
            }
            case 'latchlock': {
                const secure = st.kdSecure === '1';
                st.kdSecure = secure ? '0' : '1'; blip(secure ? 350 : 850, 0.1);
                el.classList.toggle('latch-secure', !secure);
                break;
            }
            default: blip(700, 0.05);
        }
    }

    document.addEventListener('click', function (e) {
        const el = e.target && e.target.closest ? e.target.closest('[data-kd][data-kd-cls]') : null;
        if (el) click(el);
    });
    // the clocks tell the time (their hands turn once a minute)
    setInterval(function () {
        const a = new Date().getSeconds() * 6;
        document.querySelectorAll('.clock-hand-vector, .gadget-clock-hand').forEach(function (h) { h.style.transform = 'rotate(' + a + 'deg)'; });
    }, 1000);

    // every applet that shows up later (typing, opening a file, View / Visual / Source) gets set up as it arrives
    function watch() {
        hydrate(document.body);
        new MutationObserver(function (list) {
            list.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.nodeType === 1) hydrate(n); }); });
        }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);

    window.KdApplets = { hydrate: hydrate };
})();
