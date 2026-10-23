/* =====================================================================
   Amber Slide Show engine! Real PowerPoint-style transitions (Fade, Push,
   Wipe, Split, Reveal, Cover, Zoom, Flip, Cube, Gallery, Vortex, Morph)
   and element animations (entrance, emphasis, exit) that start On Click,
   With Previous or After Previous! Works in both layouts (PowerPoint and
   Amber Classic). Slides are rendered at their real 720x405 size and
   scaled to fit, so everything lands exactly where you placed it!
   ===================================================================== */
(function () {
    'use strict';
    const V_W = 720, V_H = 405;
    const SPRING = 'cubic-bezier(0.2, 0.9, 0.25, 1.08)';
    const EASE = 'cubic-bezier(0.3, 0.7, 0.2, 1)';

    /* ---------- Effect catalogue ---------- */
    const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

    // Entrance "from" offsets: Fly In from the left starts beyond the left edge!
    function offscreen(el, dir) {
        const w = el.width || 120, h = el.height || 60;
        if (dir === 'left') return [-(el.left + w + 30), 0];
        if (dir === 'right') return [V_W - el.left + 30, 0];
        if (dir === 'up') return [0, -(el.top + h + 30)];
        return [0, V_H - el.top + 30];
    }
    function wipeFrom(dir) {
        return { left: 'inset(0 0 0 100%)', right: 'inset(0 100% 0 0)', up: 'inset(100% 0 0 0)', down: 'inset(0 0 100% 0)' }[dir] || 'inset(0 100% 0 0)';
    }

    const EFFECTS = {
        appear: { label: 'Appear', kind: 'entrance', icon: '✦', frames: function () { return [{ opacity: 0 }, { opacity: 1 }]; }, dur: 0.01 },
        fade: { label: 'Fade', kind: 'entrance', icon: '◐', frames: function () { return [{ opacity: 0 }, { opacity: 1 }]; } },
        fly: { label: 'Fly In', kind: 'entrance', icon: '➜', dirs: true, ease: SPRING, frames: function (el, a) { const o = offscreen(el, a.dir === 'up' ? 'down' : a.dir === 'down' ? 'up' : a.dir === 'left' ? 'left' : 'right'); return [{ transform: 'translate(' + o[0] + 'px,' + o[1] + 'px)' }, { transform: 'translate(0,0)' }]; } },
        float: { label: 'Float In', kind: 'entrance', icon: '⇡', ease: EASE, frames: function () { return [{ opacity: 0, transform: 'translateY(46px)' }, { opacity: 1, transform: 'translateY(0)' }]; } },
        zoom: { label: 'Zoom', kind: 'entrance', icon: '⊕', ease: SPRING, frames: function () { return [{ opacity: 0, transform: 'scale(0.2)' }, { opacity: 1, transform: 'scale(1)' }]; } },
        wipe: { label: 'Wipe', kind: 'entrance', icon: '▤', dirs: true, frames: function (el, a) { return [{ clipPath: wipeFrom(a.dir) }, { clipPath: 'inset(0 0 0 0)' }]; } },
        bounce: { label: 'Bounce', kind: 'entrance', icon: '⤓', ease: 'linear', frames: function () {
            return [
                { opacity: 0, transform: 'translateY(-260px)', offset: 0, easing: 'cubic-bezier(0.5,0,1,1)' },
                { opacity: 1, transform: 'translateY(0)', offset: 0.5, easing: 'cubic-bezier(0,0,0.5,1)' },
                { transform: 'translateY(-46px)', offset: 0.68, easing: 'cubic-bezier(0.5,0,1,1)' },
                { transform: 'translateY(0)', offset: 0.82, easing: 'cubic-bezier(0,0,0.5,1)' },
                { transform: 'translateY(-12px)', offset: 0.91, easing: 'cubic-bezier(0.5,0,1,1)' },
                { opacity: 1, transform: 'translateY(0)', offset: 1 }
            ];
        }, dur: 1.1 },
        spin: { label: 'Spin In', kind: 'entrance', icon: '↻', ease: SPRING, frames: function () { return [{ opacity: 0, transform: 'rotate(-360deg) scale(0.3)' }, { opacity: 1, transform: 'rotate(0) scale(1)' }]; }, dur: 0.9 },
        grow: { label: 'Grow & Turn', kind: 'entrance', icon: '✺', ease: SPRING, frames: function () { return [{ opacity: 0, transform: 'scale(0.1) rotate(-90deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)' }]; } },
        pulse: { label: 'Pulse', kind: 'emphasis', icon: '◎', ease: 'ease-in-out', frames: function () { return [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.5 }, { transform: 'scale(1)' }]; } },
        teeter: { label: 'Teeter', kind: 'emphasis', icon: '⟲', ease: 'ease-in-out', frames: function () { return [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }]; }, dur: 0.9 },
        emSpin: { label: 'Spin', kind: 'emphasis', icon: '⟳', ease: EASE, frames: function () { return [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }]; }, dur: 1 },
        flash: { label: 'Flash', kind: 'emphasis', icon: 'ϟ', ease: 'linear', frames: function () { return [{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }]; }, dur: 0.9 },
        fadeOut: { label: 'Fade Out', kind: 'exit', icon: '◑', frames: function () { return [{ opacity: 1 }, { opacity: 0 }]; } },
        flyOut: { label: 'Fly Out', kind: 'exit', icon: '⇢', dirs: true, ease: 'cubic-bezier(0.6,0,0.9,0.5)', frames: function (el, a) { const o = offscreen(el, a.dir || 'right'); return [{ transform: 'translate(0,0)' }, { transform: 'translate(' + o[0] + 'px,' + o[1] + 'px)' }]; } },
        zoomOut: { label: 'Zoom Out', kind: 'exit', icon: '⊖', ease: 'cubic-bezier(0.6,0,0.9,0.5)', frames: function () { return [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.2)' }]; } },
        wipeOut: { label: 'Wipe Out', kind: 'exit', icon: '▥', dirs: true, frames: function (el, a) { return [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: wipeFrom(a.dir) }]; } },
        shrinkOut: { label: 'Shrink & Turn', kind: 'exit', icon: '✷', ease: 'cubic-bezier(0.6,0,0.9,0.5)', frames: function () { return [{ opacity: 1, transform: 'scale(1) rotate(0)' }, { opacity: 0, transform: 'scale(0.1) rotate(90deg)' }]; } }
    };

    const TRANSITIONS = {
        none: { label: 'None' },
        fade: { label: 'Fade' },
        push: { label: 'Push', dirs: true },
        wipe: { label: 'Wipe', dirs: true },
        split: { label: 'Split', dirs: true },
        reveal: { label: 'Reveal', dirs: true },
        cover: { label: 'Cover', dirs: true },
        zoom: { label: 'Zoom' },
        flip: { label: 'Flip', dirs: true },
        cube: { label: 'Cube', dirs: true },
        gallery: { label: 'Gallery', dirs: true },
        vortex: { label: 'Vortex' },
        morph: { label: 'Morph' }
    };

    /* ---------- Rendering a slide (same look as the editor!) ---------- */
    function renderSlide(slide) {
        const root = document.createElement('div');
        root.className = 'as-slide';
        const bg = document.createElement('div');
        bg.className = 'as-bg';
        bg.style.background = slide.background;
        root.appendChild(bg);
        const map = {};
        [...slide.elements].sort(function (a, b) { return (a.zIndex || 0) - (b.zIndex || 0); }).forEach(function (el) {
            const div = document.createElement('div');
            div.className = 'slide-element as-el';
            div.style.top = el.top + 'px';
            div.style.left = el.left + 'px';
            if (el.width) div.style.width = el.width + 'px';
            if (el.height) div.style.height = el.height + 'px';
            div.style.zIndex = el.zIndex || 1;
            div.style.fontSize = el.fontSize || '18px';
            div.style.color = el.color || '#ffffff';
            if (el.fontFamily) div.style.fontFamily = el.fontFamily;
            if (el.type === 'shape' && typeof getSvgShapeMarkup === 'function') {
                const svg = document.createElement('div');
                svg.className = 'slide-svg-container';
                if (el.shapeType === 'chip') {
                    svg.classList.add('chip-glass');
                    const r = cornerRadiiFor(el);
                    svg.style.borderRadius = r.rx + '% / ' + r.ry + '%';
                }
                const st = computeStrokeFor(el);
                svg.innerHTML = getSvgShapeMarkup(el.shapeType, el.fillColor || '#38bdf8', st.css, st.width, cornerRadiiFor(el), computeInnerFor(el));
                try { applyBgBlur(svg, el); } catch (e) {}
                div.appendChild(svg);
            }
            const span = document.createElement('span');
            span.className = 'slide-text-content';
            span.innerHTML = el.content || '';
            if (el.textAlign) span.style.textAlign = el.textAlign;
            div.appendChild(span);
            root.appendChild(div);
            map[el.id] = div;
        });
        return { root: root, bg: bg, map: map, slide: slide };
    }

    /* ---------- Build the click steps for a slide ---------- */
    // Every animation on the slide, in play order (objects can have several!)
    function entries(slide) {
        const out = [];
        slide.elements.forEach(function (el) {
            (el.anims || []).forEach(function (a) { if (a && EFFECTS[a.effect]) out.push({ el: el, a: a }); });
        });
        return out.sort(function (x, y) { return (x.a.order || 0) - (y.a.order || 0); });
    }

    function buildSteps(slide) {
        const steps = [];
        let cur = null, lastStart = 0, lastEnd = 0;
        entries(slide).forEach(function (en) {
            const el = en.el, a = en.a;
            if (!cur || a.start === 'click') {
                cur = { auto: !steps.length && a.start !== 'click', items: [], total: 0 };
                steps.push(cur);
                lastStart = 0;
                lastEnd = 0;
            }
            // With Previous = same start time, After Previous = when the last one ends!
            const base = a.start === 'after' ? lastEnd : a.start === 'with' ? lastStart : 0;
            const dur = a.effect === 'appear' ? 0.01 : a.duration;
            const at = base + (a.delay || 0);
            cur.items.push({ el: el, a: a, at: at, dur: dur });
            lastStart = at;
            lastEnd = at + dur;
            cur.total = Math.max(cur.total, lastEnd);
        });
        return steps;
    }

    // Before anything plays: objects whose FIRST animation is an entrance hide!
    function initialState(r, steps) {
        const seen = {};
        steps.forEach(function (st) {
            st.items.forEach(function (it) {
                if (seen[it.el.id]) return;
                seen[it.el.id] = true;
                if (EFFECTS[it.a.effect].kind === 'entrance' && r.map[it.el.id]) r.map[it.el.id].style.visibility = 'hidden';
            });
        });
    }

    // "Everything played": an object whose LAST animation is an exit stays gone!
    function finalState(r, steps) {
        const last = {};
        steps.forEach(function (st) { st.items.forEach(function (it) { last[it.el.id] = it; }); });
        Object.keys(last).forEach(function (id) {
            const n = r.map[id];
            if (n) n.style.visibility = EFFECTS[last[id].a.effect].kind === 'exit' ? 'hidden' : '';
        });
    }

    function playStep(r, step, running) {
        const promises = [];
        step.items.forEach(function (it) {
            const n = r.map[it.el.id];
            if (!n) return;
            const fx = EFFECTS[it.a.effect];
            n.style.visibility = '';
            const anim = n.animate(fx.frames(it.el, it.a), {
                duration: Math.max(10, it.dur * 1000),
                delay: it.at * 1000,
                easing: fx.ease || EASE,
                fill: fx.kind === 'exit' ? 'forwards' : 'backwards'
            });
            running.push(anim);
            if (fx.kind === 'exit') anim.finished.then(function () { n.style.visibility = 'hidden'; anim.cancel(); }).catch(function () {});
            promises.push(anim.finished.catch(function () {}));
        });
        return Promise.all(promises);
    }

    /* ---------- Transitions ---------- */
    function morphKey(el) {
        return el.morphId || el.id;
    }

    function runTransition(stage, from, to, tr, running) {
        const type = tr && tr.type ? tr.type : 'none';
        const dur = Math.max(100, (tr && tr.duration ? tr.duration : 0.8) * 1000);
        const d = DIRS[(tr && tr.dir) || 'left'] || DIRS.left;
        const anims = [];
        const A = function (node, frames, opts) {
            const a = node.animate(frames, Object.assign({ duration: dur, easing: EASE, fill: 'both' }, opts || {}));
            anims.push(a);
            running.push(a);
            return a;
        };
        const pct = function (x, y) { return 'translate(' + (x * 100) + '%,' + (y * 100) + '%)'; };
        to.root.style.zIndex = 2;
        if (from) from.root.style.zIndex = 1;
        if (!from || type === 'none') {
            // No transition: just appear!
        } else if (type === 'fade') {
            A(to.root, [{ opacity: 0 }, { opacity: 1 }], { easing: 'ease-in-out' });
        } else if (type === 'push') {
            A(from.root, [{ transform: 'none' }, { transform: pct(d[0], d[1]) }]);
            A(to.root, [{ transform: pct(-d[0], -d[1]) }, { transform: 'none' }]);
        } else if (type === 'cover') {
            A(to.root, [{ transform: pct(-d[0], -d[1]), boxShadow: '0 0 0 rgba(0,0,0,0)' }, { transform: 'none', boxShadow: '0 0 60px rgba(0,0,0,0.5)' }]);
        } else if (type === 'reveal') {
            from.root.style.zIndex = 3;
            A(from.root, [{ transform: 'none', opacity: 1 }, { transform: pct(d[0], d[1]), opacity: 0.6 }]);
        } else if (type === 'wipe') {
            const start = { '-1,0': 'inset(0 0 0 100%)', '1,0': 'inset(0 100% 0 0)', '0,-1': 'inset(100% 0 0 0)', '0,1': 'inset(0 0 100% 0)' }[d.join(',')];
            A(to.root, [{ clipPath: start }, { clipPath: 'inset(0 0 0 0)' }]);
        } else if (type === 'split') {
            const start = d[0] !== 0 ? 'inset(0 50% 0 50%)' : 'inset(50% 0 50% 0)';
            A(to.root, [{ clipPath: start }, { clipPath: 'inset(0 0 0 0)' }]);
        } else if (type === 'zoom') {
            A(from.root, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.35)', opacity: 0 }]);
            A(to.root, [{ transform: 'scale(0.35)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { easing: SPRING });
        } else if (type === 'flip') {
            const ax = d[0] !== 0 ? 'rotateY' : 'rotateX';
            const sgn = d[0] + d[1] < 0 ? 1 : -1;
            A(from.root, [{ transform: 'perspective(1400px) ' + ax + '(0)' }, { transform: 'perspective(1400px) ' + ax + '(' + (90 * sgn) + 'deg)' }], { duration: dur / 2, easing: 'ease-in' });
            A(to.root, [{ transform: 'perspective(1400px) ' + ax + '(' + (-90 * sgn) + 'deg)' }, { transform: 'perspective(1400px) ' + ax + '(0)' }], { duration: dur / 2, delay: dur / 2, easing: 'ease-out' });
        } else if (type === 'cube') {
            const horiz = d[0] !== 0;
            const ax = horiz ? 'rotateY' : 'rotateX';
            const s = (d[0] + d[1]) < 0 ? 1 : -1;
            from.root.style.transformOrigin = horiz ? (s > 0 ? '0% 50%' : '100% 50%') : (s > 0 ? '50% 0%' : '50% 100%');
            to.root.style.transformOrigin = horiz ? (s > 0 ? '100% 50%' : '0% 50%') : (s > 0 ? '50% 100%' : '50% 0%');
            const mv = function (k) { return horiz ? 'translateX(' + (k * 100) + '%)' : 'translateY(' + (k * 100) + '%)'; };
            A(from.root, [{ transform: 'perspective(1600px) ' + mv(0) + ' ' + ax + '(0)' }, { transform: 'perspective(1600px) ' + mv(-s * (horiz ? 1 : 1)) + ' ' + ax + '(' + (horiz ? -90 * s : 90 * s) + 'deg)' }], { easing: 'ease-in-out' });
            A(to.root, [{ transform: 'perspective(1600px) ' + mv(s) + ' ' + ax + '(' + (horiz ? 90 * s : -90 * s) + 'deg)' }, { transform: 'perspective(1600px) ' + mv(0) + ' ' + ax + '(0)' }], { easing: 'ease-in-out' });
        } else if (type === 'gallery') {
            A(from.root, [{ transform: 'none' }, { transform: pct(d[0] * 1.1, d[1] * 1.1) + ' scale(0.78)', offset: 1 }]);
            A(to.root, [{ transform: pct(-d[0] * 1.1, -d[1] * 1.1) + ' scale(0.78)' }, { transform: 'scale(0.78)', offset: 0.55 }, { transform: 'none' }]);
        } else if (type === 'vortex') {
            A(from.root, [{ transform: 'rotate(0) scale(1)', opacity: 1, filter: 'blur(0)' }, { transform: 'rotate(200deg) scale(0)', opacity: 0, filter: 'blur(6px)' }], { easing: 'ease-in' });
            A(to.root, [{ transform: 'rotate(-200deg) scale(0)', opacity: 0 }, { transform: 'rotate(0) scale(1)', opacity: 1 }], { delay: dur * 0.35, easing: SPRING });
        } else if (type === 'morph') {
            // Morph: matching objects glide from their old spot to the new one!
            const fromEls = {};
            from.slide.elements.forEach(function (e) { fromEls[morphKey(e)] = e; });
            const matched = {};
            to.slide.elements.forEach(function (e) {
                const n = to.map[e.id];
                const old = fromEls[morphKey(e)];
                if (!n) return;
                if (old) {
                    matched[old.id] = true;
                    const sx = (old.width || 1) / (e.width || 1), sy = (old.height || 1) / (e.height || 1);
                    n.style.transformOrigin = '0 0';
                    A(n, [{ transform: 'translate(' + (old.left - e.left) + 'px,' + (old.top - e.top) + 'px) scale(' + sx + ',' + sy + ')', color: old.color || '#fff' }, { transform: 'none', color: e.color || '#fff' }], { easing: 'cubic-bezier(0.45,0,0.2,1)' });
                } else {
                    A(n, [{ opacity: 0 }, { opacity: 1 }], { delay: dur * 0.35, duration: dur * 0.65 });
                }
            });
            from.slide.elements.forEach(function (e) {
                const n = from.map[e.id];
                if (!n) return;
                if (matched[e.id]) n.style.visibility = 'hidden';
                else A(n, [{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.5 });
            });
            A(to.bg, [{ opacity: 0 }, { opacity: 1 }], { easing: 'ease-in-out' });
        }
        return Promise.all(anims.map(function (a) { return a.finished.catch(function () {}); })).then(function () {
            anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
            to.root.style.transformOrigin = '';
        });
    }

    /* ---------- Preferences ---------- */
    const PREF_KEY = 'amber_show_prefs';
    const prefs = Object.assign({ loop: false, fullscreen: true, hud: true }, (function () { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; } })());
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

    /* ---------- The full-screen show ---------- */
    let show = null;

    function deck() { return (window.Amber && window.Amber.getSlides) ? window.Amber.getSlides() : []; }
    function visibleIndex(i, dir) {
        const s = deck();
        while (i >= 0 && i < s.length && s[i].hidden) i += dir;
        return (i >= 0 && i < s.length) ? i : -1;
    }

    function fit(stage, box) {
        const w = box ? box.width : window.innerWidth;
        const h = box ? box.height : window.innerHeight;
        const sc = Math.min(w / V_W, h / V_H);
        stage.style.transform = 'translate(-50%, -50%) scale(' + sc + ')';
    }

    function enterSlide(i, withTransition) {
        const s = deck();
        const slide = s[i];
        if (!slide) return;
        clearTimeout(show.timer);
        finishRunning();
        const r = renderSlide(slide);
        const steps = buildSteps(slide);
        initialState(r, steps);
        show.stage.appendChild(r.root);
        const from = show.cur;
        show.cur = r;
        show.index = i;
        show.steps = steps;
        show.step = 0;
        show.counter.textContent = (i + 1) + ' / ' + s.length;
        const tr = withTransition ? slide.transition : null;
        show.busy = true;
        runTransition(show.stage, from, r, tr, show.running).then(function () {
            if (from && from.root.parentNode) from.root.remove();
            show.busy = false;
            if (show.cur !== r) return;
            if (steps[0] && steps[0].auto) { show.step = 1; playStep(r, steps[0], show.running).then(scheduleAdvance); }
            else scheduleAdvance();
        });
    }

    function scheduleAdvance() {
        if (!show) return;
        clearTimeout(show.timer);
        const slide = deck()[show.index];
        const t = slide && slide.transition && slide.transition.advanceAfter;
        if (t != null) show.timer = setTimeout(function () { next(); }, t * 1000);
    }

    function finishRunning() {
        if (!show) return;
        show.running.forEach(function (a) { try { a.finish(); } catch (e) {} });
        show.running = [];
    }

    function next() {
        if (!show) return;
        if (show.ended) { exit(); return; }
        if (show.busy || show.running.some(function (a) { return a.playState === 'running'; })) {
            // Clicking mid-animation jumps it to the end, like PowerPoint!
            finishRunning();
            return;
        }
        if (show.step < show.steps.length) {
            const st = show.steps[show.step++];
            playStep(show.cur, st, show.running).then(scheduleAdvance);
            return;
        }
        let ni = visibleIndex(show.index + 1, 1);
        if (ni === -1 && prefs.loop) ni = visibleIndex(0, 1);
        if (ni === -1) { endScreen(); return; }
        enterSlide(ni, true);
    }

    function prev() {
        if (!show) return;
        if (show.ended) { show.ended = false; show.endEl.hidden = true; return; }
        const pi = visibleIndex(show.index - 1, -1);
        if (pi === -1) return;
        goTo(pi, true);
    }

    function goTo(i, built) {
        enterSlide(i, false);
        if (built) { finishRunning(); finalState(show.cur, show.steps); show.step = show.steps.length; }
    }

    function endScreen() {
        clearTimeout(show.timer);
        show.ended = true;
        show.endEl.hidden = false;
        show.endEl.classList.remove('in');
        void show.endEl.offsetWidth;
        show.endEl.classList.add('in');
    }

    function onKey(e) {
        if (!show) return;
        const k = e.key;
        const stop = function () { e.preventDefault(); e.stopImmediatePropagation(); };
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'Enter' || k === 'PageDown' || k === 'n' || k === 'N') { stop(); next(); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'Backspace' || k === 'PageUp' || k === 'p' || k === 'P') { stop(); prev(); }
        else if (k === 'Escape') { stop(); exit(); }
        else if (k === 'Home') { stop(); const f = visibleIndex(0, 1); if (f !== -1) goTo(f, false); }
        else if (k === 'End') { stop(); const l = visibleIndex(deck().length - 1, -1); if (l !== -1) goTo(l, true); }
        else if (k === 'b' || k === 'B' || k === '.') { stop(); show.el.classList.toggle('as-black'); show.el.classList.remove('as-white'); }
        else if (k === 'w' || k === 'W' || k === ',') { stop(); show.el.classList.toggle('as-white'); show.el.classList.remove('as-black'); }
        else if (k === 'F5' || (e.metaKey || e.ctrlKey)) { stop(); }
        else stop();
    }

    function start(index) {
        if (show) return;
        const s = deck();
        if (!s.length) return;
        let i = visibleIndex(Math.max(0, Math.min(s.length - 1, index | 0)), 1);
        if (i === -1) i = visibleIndex(0, 1);
        if (i === -1) { if (window.OfficeShell) window.OfficeShell.toast('Every slide is hidden! Unhide one to present!'); return; }
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(850, 0.12); } catch (e) {}
        const el = document.createElement('div');
        el.className = 'amber-show';
        el.innerHTML = '<div class="as-stage"></div><div class="as-end" hidden><b>End of slide show</b><span>Click or press any key to exit!</span></div>' +
            '<div class="as-hud"><button type="button" data-as="prev" title="Previous (←)">‹</button><span class="as-count"></span><button type="button" data-as="next" title="Next (→ or Space)">›</button><button type="button" data-as="black" title="Black screen (B)">●</button><button type="button" data-as="exit" class="as-exit" title="End show (Esc)">✕ End</button></div>';
        document.body.appendChild(el);
        show = { el: el, stage: el.querySelector('.as-stage'), counter: el.querySelector('.as-count'), endEl: el.querySelector('.as-end'), running: [], cur: null, index: i, steps: [], step: 0, timer: null, ended: false, busy: false };
        fit(show.stage);
        el.addEventListener('click', function (e) {
            const b = e.target.closest('[data-as]');
            if (b) {
                e.stopPropagation();
                const a = b.dataset.as;
                if (a === 'prev') prev();
                else if (a === 'next') next();
                else if (a === 'black') el.classList.toggle('as-black');
                else exit();
                return;
            }
            next();
        });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); prev(); });
        let idle = null;
        el.addEventListener('mousemove', function () {
            el.classList.add('as-hud-on');
            clearTimeout(idle);
            idle = setTimeout(function () { el.classList.remove('as-hud-on'); }, 2200);
        });
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', onResize);
        if (prefs.fullscreen && el.requestFullscreen) {
            el.requestFullscreen().then(function () { show && (show.fs = true); }).catch(function () {});
        }
        document.addEventListener('fullscreenchange', onFs);
        requestAnimationFrame(function () { el.classList.add('in'); });
        enterSlide(i, false);
    }

    function onResize() { if (show) fit(show.stage); }
    function onFs() { if (show && show.fs && !document.fullscreenElement) exit(); }

    function exit() {
        if (!show) return;
        const s = show;
        show = null;
        clearTimeout(s.timer);
        s.running.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('fullscreenchange', onFs);
        if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
        s.el.classList.add('out');
        setTimeout(function () { s.el.remove(); }, 260);
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(450, 0.08); } catch (e) {}
        // Land the editor on the slide you ended on, like PowerPoint!
        try {
            if (typeof activeSlideIndex !== 'undefined' && s.index !== activeSlideIndex && window.Amber && window.Amber.goToSlide) window.Amber.goToSlide(s.index);
        } catch (e) {}
    }

    /* ---------- Previews on the editing canvas ---------- */
    let preview = null;
    function stopPreview() {
        if (!preview) return;
        const p = preview;
        preview = null;
        p.running.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        p.el.classList.add('out');
        setTimeout(function () { p.el.remove(); }, 220);
    }

    // Plays a slide's transition and/or animations right over the editor canvas!
    function previewSlide(i, opts) {
        opts = opts || {};
        stopPreview();
        const canvas = document.getElementById('slide-canvas');
        const s = deck();
        if (!canvas || !s[i]) return;
        const box = canvas.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = 'as-preview';
        el.style.left = box.left + 'px';
        el.style.top = box.top + 'px';
        el.style.width = box.width + 'px';
        el.style.height = box.height + 'px';
        el.innerHTML = '<div class="as-stage"></div><span class="as-prev-tag">Preview</span>';
        document.body.appendChild(el);
        const stage = el.querySelector('.as-stage');
        fit(stage, box);
        const p = preview = { el: el, running: [] };
        el.addEventListener('click', stopPreview);
        const slide = s[i];
        const r = renderSlide(slide);
        const steps = opts.animations === false ? [] : buildSteps(slide);
        initialState(r, steps);
        let from = null;
        if (opts.transition !== false && slide.transition) {
            const pi = i > 0 ? i - 1 : -1;
            from = pi >= 0 ? renderSlide(s[pi]) : renderSlide({ background: '#000', elements: [] });
            stage.appendChild(from.root);
        }
        stage.appendChild(r.root);
        const go = from ? runTransition(stage, from, r, slide.transition, p.running).then(function () { from.root.remove(); }) : Promise.resolve();
        go.then(function () {
            let chain = Promise.resolve();
            steps.forEach(function (st, k) {
                chain = chain.then(function () {
                    if (preview !== p) return;
                    return new Promise(function (res) { setTimeout(res, k === 0 && st.auto ? 0 : 280); }).then(function () { if (preview === p) return playStep(r, st, p.running); });
                });
            });
            return chain;
        }).then(function () { setTimeout(function () { if (preview === p) stopPreview(); }, 650); });
    }

    // Plays one of an object's animations right on the canvas!
    function previewElement(elData, a) {
        const canvas = document.getElementById('slide-canvas');
        a = a || (elData && elData.anims && elData.anims[0]);
        if (!canvas || !elData || !a) return;
        const node = canvas.querySelector('.slide-element[data-el-id="' + elData.id + '"]');
        const fx = EFFECTS[a.effect];
        if (!node || !fx) return;
        node.animate(fx.frames(elData, a), { duration: Math.max(10, (a.effect === 'appear' ? 0.25 : a.duration) * 1000), easing: fx.ease || EASE });
    }

    // Hook Amber's own Present buttons into the new show!
    window.startPresentation = function () { start(typeof activeSlideIndex !== 'undefined' ? activeSlideIndex : 0); };
    window.exitPresentation = function () { exit(); };
    window.nextSlide = function () { next(); };
    window.prevSlide = function () { prev(); };

    window.AmberShow = {
        start: start, exit: exit, next: next, prev: prev,
        preview: previewSlide, stopPreview: stopPreview, previewElement: previewElement,
        EFFECTS: EFFECTS, TRANSITIONS: TRANSITIONS, buildSteps: buildSteps, entries: entries,
        prefs: prefs, savePrefs: savePrefs, isShowing: function () { return !!show; }
    };
})();
