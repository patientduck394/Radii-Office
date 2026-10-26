/* =====================================================================
   BeepBox songs outside Bitbook (Omicron pages + exports)! The same chips
   Bitbook makes (data-bb-song / data-bb-z) play and stop when clicked,
   and BitLang's skill(skill="beepbox", ...) can build new ones!
   Bitbook has its own player, so this file steps aside there.
   ===================================================================== */
(function () {
    'use strict';
    if (typeof window.bbToggleChip === 'function') return;
    const SRC = window.BB_SYNTH_URL || 'abyssbox_synth.min.js?v=20261118';
    let lib = null, loading = null, synth = null, owner = null, token = 0;

    function loadSynth() {
        if (lib) return Promise.resolve(lib);
        if (loading) return loading;
        loading = new Promise(function (resolve, reject) {
            const s = document.createElement('script');
            s.src = SRC;
            s.onload = function () { if (window.beepbox && window.beepbox.Synth) { lib = window.beepbox; resolve(lib); } else { loading = null; reject(new Error('synth missing')); } };
            s.onerror = function () { loading = null; s.remove(); reject(new Error('synth load failed')); };
            document.head.appendChild(s);
        });
        return loading;
    }
    // link / player link / bare data -> song data candidates (same rules as Bitbook)
    function candidates(raw) {
        let s = String(raw || '').trim();
        if (s.indexOf('#') === -1 && /%23/i.test(s)) { try { s = decodeURIComponent(s); } catch (e) {} }
        const h = s.indexOf('#');
        if (h !== -1) s = s.slice(h + 1); else if (/^<?https?:\/\//i.test(s)) return [];
        s = s.replace(/[\r\n\t]+/g, '');
        if (/^[a-z]+=/.test(s)) { let song = ''; s.split(/&(?=[a-z]+=)/g).forEach(function (p) { if (p.indexOf('song=') === 0) song = p.slice(5); }); s = song; }
        const trimmed = s.replace(/[\s>)\]"'`]+$/, '');
        const out = [];
        [s, trimmed].forEach(function (c) { c = c.trim(); [c.replace(/ /g, '%20'), c.replace(/ /g, '')].forEach(function (v) { if (v && out.indexOf(v) === -1) out.push(v); }); });
        return out;
    }
    function bytesToB64(bytes) { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
    function b64ToBytes(b64) { const bin = atob(b64); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
    function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (buf) { return new Uint8Array(buf); }); }
    function packSong(data) {
        if (typeof CompressionStream !== 'function') return Promise.resolve({ attr: 'data-bb-song', value: data });
        return pipe(new TextEncoder().encode(data), new CompressionStream('deflate-raw')).then(function (z) {
            const b64 = bytesToB64(z);
            return b64.length < data.length ? { attr: 'data-bb-z', value: b64 } : { attr: 'data-bb-song', value: data };
        }).catch(function () { return { attr: 'data-bb-song', value: data }; });
    }
    function chipData(chip) {
        const z = chip.getAttribute('data-bb-z');
        if (!z) return Promise.resolve(chip.getAttribute('data-bb-song') || '');
        if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('no DecompressionStream'));
        return pipe(b64ToBytes(z), new DecompressionStream('deflate-raw')).then(function (b) { return new TextDecoder().decode(b); });
    }
    function buildChip(packed, label) {
        const chip = document.createElement('span');
        chip.className = 'bb-chip';
        chip.setAttribute('contenteditable', 'false');
        chip.setAttribute(packed.attr, packed.value);
        chip.setAttribute('data-bb-id', 'bb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        chip.title = 'Click to play / stop';
        const icon = document.createElement('span'); icon.className = 'bb-chip-icon'; icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span'); text.className = 'bb-chip-text'; text.textContent = label || 'BeepBox Song';
        chip.appendChild(icon); chip.appendChild(text);
        return chip;
    }
    function setState(chip, on) { try { if (chip && chip.classList) chip.classList.toggle('bb-playing', on); } catch (e) {} }
    function stop() {
        token++;
        try { if (synth) { synth.pause(); synth.snapToStart(); } } catch (e) {}
        const was = owner;
        owner = null; window.bbOwner = null;
        setState(was, false);
    }
    function play(dataP, chip) {
        stop();
        const my = ++token;
        owner = chip; window.bbOwner = chip;
        setState(chip, true);
        return Promise.resolve(dataP).then(function (d) {
            if (String(d).charAt(0) === 'J') throw new Error('JukeBox songs only play in Bitbook');
            return loadSynth().then(function (bb) { return [bb, d]; });
        }).then(function (both) {
            if (my !== token) return;
            const bb = both[0], d = both[1];
            const song = new bb.Song(d);
            if (!song.channels || !song.channels.length) throw new Error('unreadable');
            if (!synth) synth = new bb.Synth(d); else synth.setSong(d);
            synth.snapToStart();
            synth.play();
        }).catch(function (err) { if (my === token) stop(); throw err; });
    }
    function toggle(chip) {
        if (owner === chip) { stop(); return; }
        play(chipData(chip), chip).catch(function () { try { chip.classList.add('bb-error'); setTimeout(function () { chip.classList.remove('bb-error'); }, 1200); } catch (e) {} });
    }
    window.bbSongCandidates = candidates;
    window.bbPackSong = packSong;
    window.bbBuildChip = buildChip;
    window.bbToggleChip = toggle;
    window.bbStop = stop;
    window.bbOwner = null;
    if (window.BitLang && !window.BitLang.host) {
        window.BitLang.host = {
            skill: function (name, sk) {
                const c = candidates(sk.get);
                if (!c.length) return Promise.reject(new Error('No song data in that link (copy the full link with the # part)'));
                return packSong(c[0]).then(function (packed) { return buildChip(packed, sk.label || 'BeepBox Song').outerHTML; });
            }
        };
    }
    document.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('.bb-chip')) e.preventDefault(); });
    document.addEventListener('click', function (e) {
        const chip = e.target.closest && e.target.closest('.bb-chip');
        if (!chip) return;
        e.preventDefault();
        toggle(chip);
    });
})();
