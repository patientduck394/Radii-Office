// OpenDB! A free, open-access database of articles, media and papers, all public domain (CC0).
// The site is static: data/index.json is built from data/entries/*.md (scripts/build_opendb.mjs),
// and new entries are saved on your device right away, then proposed to the public repository.
(function () {
    'use strict';

    const REPO = 'patientduck394/Radii-Office';
    const BRANCH = 'main';
    const REPO_DIR = 'src/opendb/data';
    const TYPES = { article: 'Article', media: 'Media', paper: 'Paper', lite: 'Lite' };
    const PLURAL = { article: 'Articles', media: 'Media', paper: 'Papers', lite: 'Lites' };
    const ADD_ONE = { article: 'an article', media: 'a file', paper: 'a paper', lite: 'a lite' };

    const $ = (id) => document.getElementById(id);
    const view = $('view');
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    /* ---------- Data: the shared index + entries kept on this device ---------- */
    let shared = [];
    let local = [];
    let byId = new Map();
    let backlinks = new Map();
    let loadError = null;

    const LOCAL_KEY = 'opendb_local_v1';
    function loadLocal() {
        try { const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); local = Array.isArray(v) ? v : []; } catch (e) { local = []; }
    }
    function saveLocal() {
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); return true; }
        catch (e) { toast('Your browser storage is full! Remove some device entries first!'); return false; }
    }
    function reindex() {
        byId = new Map();
        shared.forEach((e) => byId.set(e.id, e));
        local.forEach((e) => byId.set(e.id, Object.assign({}, e, { local: true })));
        backlinks = new Map();
        byId.forEach((e) => {
            linksIn(e).forEach((to) => {
                if (to === e.id) return;
                if (!backlinks.has(to)) backlinks.set(to, new Set());
                backlinks.get(to).add(e.id);
            });
        });
    }
    function all() { return Array.from(byId.values()); }
    function linksIn(e) {
        const out = new Set();
        const text = (e.type === 'lite' ? liteSplit(e.body).desc : (e.body || '')) + '\n' + (e.abstract || '');
        let m;
        const re = /\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]|\]\(media:([a-z0-9-]+)\)/g;
        while ((m = re.exec(text))) out.add(m[1] || m[2]);
        return out;
    }
    function mediaSrc(e) {
        if (!e) return '';
        if (e.dataUrl) return e.dataUrl;
        return 'data/' + e.file;
    }
    // Media can be pictures, music (MP3, OGG, WAV) or videos (MP4, MOV, MKV)!
    const MEDIA_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/svg+xml': '.svg', 'image/webp': '.webp', 'image/gif': '.gif',
        'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/wave': '.wav',
        'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/x-matroska': '.mkv', 'video/matroska': '.mkv', 'video/mkv': '.mkv', 'audio/x-matroska': '.mkv' };
    const EXT_MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska' };
    function mediaKind(e) {
        const m = String((e && e.mime) || ''), f = String((e && e.file) || '');
        if (/^audio\//.test(m) || /\.(mp3|ogg|oga|wav)$/i.test(f)) return 'audio';
        if (/^video\//.test(m) || /\.(mp4|m4v|mov|mkv)$/i.test(f)) return 'video';
        return 'image';
    }
    const clock = (sec) => { sec = Math.round(Number(sec) || 0); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
    // The right player for a media entry: a picture, an audio player or a video player
    function mediaTag(e, src, alt, lazy) {
        const k = mediaKind(e);
        if (k === 'audio' || k === 'video') return playerTag(k, e, src, alt);
        return '<img src="' + esc(src) + '" alt="' + esc(alt) + '"' + (lazy ? ' loading="lazy"' : '') + '>';
    }
    // OpenDB's own music and video player: play, seek, time, volume, speed, download (and fullscreen for videos)
    const RP_ICON = {
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
        vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        dl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    function playerTag(kind, e, src, alt) {
        // the entry's own name, or (for a file linked from elsewhere) the file's name
        const fromUrl = /^https?:/.test(src) ? decodeURIComponent(String(src).split(/[?#]/)[0].split('/').pop() || '') : '';
        const name = e.id ? e.id + extOf(e) : (fromUrl || 'media' + extOf(e));
        const media = kind === 'video'
            ? '<video class="rp-media" playsinline preload="metadata" src="' + esc(src) + '" aria-label="' + esc(alt) + '"></video>'
            : '<audio class="rp-media" preload="metadata" src="' + esc(src) + '" aria-label="' + esc(alt) + '"></audio>';
        return '<div class="rp rp-' + kind + '" data-rp>' + media +
            '<div class="rp-bar">' +
            '<button type="button" class="rp-play" aria-label="Play" title="Play (Space)">' + RP_ICON.play + '</button>' +
            '<span class="rp-time">0:00</span>' +
            '<input type="range" class="rp-seek" min="0" max="1000" step="1" value="0" aria-label="Seek">' +
            '<span class="rp-dur">' + (e.duration ? clock(e.duration) : '0:00') + '</span>' +
            '<button type="button" class="rp-mute" aria-label="Mute" title="Mute">' + RP_ICON.vol + '</button>' +
            '<input type="range" class="rp-vol" min="0" max="1" step="0.05" value="1" aria-label="Volume">' +
            '<button type="button" class="rp-speed" aria-label="Playback speed" title="Playback speed">1×</button>' +
            (kind === 'video' ? '<button type="button" class="rp-full" aria-label="Fullscreen" title="Fullscreen">' + RP_ICON.full + '</button>' : '') +
            '<a class="rp-dl" href="' + esc(src) + '" download="' + esc(name) + '" aria-label="Download ' + esc(name) + '" title="Download ' + esc(name) + '">' + RP_ICON.dl + '<span>Download</span></a>' +
            '</div></div>';
    }
    // one set of listeners runs every player on the page (players come and go with each page drawn)
    (function wirePlayers() {
        const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
        const parts = (el) => { const box = el.closest && el.closest('[data-rp]'); return box && { box, m: box.querySelector('.rp-media') }; };
        const paint = (box, m) => {
            const play = box.querySelector('.rp-play');
            play.innerHTML = m.paused ? RP_ICON.play : RP_ICON.pause;
            play.setAttribute('aria-label', m.paused ? 'Play' : 'Pause');
            box.classList.toggle('rp-on', !m.paused);
            const d = isFinite(m.duration) ? m.duration : 0;
            box.querySelector('.rp-time').textContent = clock(m.currentTime);
            if (d) box.querySelector('.rp-dur').textContent = clock(d);
            const seek = box.querySelector('.rp-seek');
            if (!box.dragging) seek.value = d ? Math.round(m.currentTime / d * 1000) : 0;
            seek.style.setProperty('--rp-p', (d ? m.currentTime / d * 100 : 0) + '%');
            const vol = box.querySelector('.rp-vol');
            vol.value = m.muted ? 0 : m.volume;
            vol.style.setProperty('--rp-p', (m.muted ? 0 : m.volume * 100) + '%');
            box.querySelector('.rp-mute').innerHTML = m.muted || !m.volume ? RP_ICON.mute : RP_ICON.vol;
        };
        const toggle = (m) => { if (m.paused) { document.querySelectorAll('[data-rp] .rp-media').forEach((o) => { if (o !== m) o.pause(); }); m.play().catch(() => {}); } else m.pause(); };
        document.addEventListener('click', (ev) => {
            const t = ev.target.closest && ev.target.closest('.rp-play, .rp-mute, .rp-speed, .rp-full, video.rp-media');
            const p = t && parts(t);
            if (!p) return;
            const { box, m } = p;
            if (t.matches('.rp-play, video.rp-media')) toggle(m);
            else if (t.matches('.rp-mute')) { m.muted = !m.muted; if (!m.muted && !m.volume) m.volume = 1; }
            else if (t.matches('.rp-speed')) { const n = SPEEDS[(SPEEDS.indexOf(m.playbackRate) + 1) % SPEEDS.length] || 1; m.playbackRate = n; t.textContent = n + '×'; }
            else if (t.matches('.rp-full')) { const f = box.requestFullscreen || box.webkitRequestFullscreen; if (document.fullscreenElement) document.exitFullscreen(); else if (f) f.call(box); }
            paint(box, m);
        });
        // Some hosts send a file only whole (no byte ranges), so the browser cannot jump past what has downloaded:
        // then the whole file is fetched once and played from memory, where every spot can be reached
        const reachable = (m, at) => { const r = m.seekable; for (let i = 0; i < r.length; i++) if (at >= r.start(i) && at <= r.end(i)) return true; return false; };
        function seekTo(box, m, at) {
            if (reachable(m, at) || m.src.startsWith('blob:') || m.src.startsWith('data:')) { m.currentTime = at; return; }
            box.pendingSeek = at;
            if (box.loadingWhole) return;
            box.loadingWhole = true;
            box.querySelector('.rp-time').textContent = '…';
            const wasPlaying = !m.paused;
            fetch(m.currentSrc || m.src).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then((blob) => {
                m.addEventListener('loadedmetadata', () => { m.currentTime = box.pendingSeek; if (wasPlaying) m.play().catch(() => {}); box.loadingWhole = false; }, { once: true });
                m.src = URL.createObjectURL(blob);
            }).catch(() => { box.loadingWhole = false; m.currentTime = at; });
        }
        document.addEventListener('input', (ev) => {
            const t = ev.target, p = t.classList && (t.classList.contains('rp-seek') || t.classList.contains('rp-vol')) && parts(t);
            if (!p) return;
            if (t.classList.contains('rp-seek')) { if (isFinite(p.m.duration)) seekTo(p.box, p.m, t.value / 1000 * p.m.duration); }
            else { p.m.volume = +t.value; p.m.muted = +t.value === 0; }
            paint(p.box, p.m);
        });
        // media events do not bubble, so they are caught on the way down
        ['timeupdate', 'loadedmetadata', 'play', 'pause', 'ended', 'volumechange', 'durationchange'].forEach((type) =>
            document.addEventListener(type, (ev) => { const m = ev.target; if (m.classList && m.classList.contains('rp-media')) paint(m.closest('[data-rp]'), m); }, true));
        // Space plays or pauses the player you last used (unless you are typing)
        document.addEventListener('keydown', (ev) => {
            if (ev.key !== ' ' || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable) return;
            const p = ev.target.closest && ev.target.closest('[data-rp]');
            if (!p || ev.target.matches('a, input')) return;
            ev.preventDefault();
            toggle(p.querySelector('.rp-media'));
        });
    })();
    // Small previews for lists and the media grid: a still from a video, a note for music
    function mediaThumb(e, cls) {
        const k = mediaKind(e);
        if (k === 'audio') return '<span class="' + cls + ' audio-thumb" aria-hidden="true">🎵' + (e.duration ? '<small>' + clock(e.duration) + '</small>' : '') + '</span>';
        if (k === 'video') return '<span class="' + cls + ' video-thumb"><video muted preload="metadata" src="' + esc(mediaSrc(e)) + '#t=0.5" aria-hidden="true"></video><span class="play">▶</span>' + (e.duration ? '<small>' + clock(e.duration) + '</small>' : '') + '</span>';
        return '<img class="' + cls + '" src="' + esc(mediaSrc(e)) + '" alt="' + esc(cls === 'thumb' ? '' : e.title) + '" loading="lazy">';
    }

    /* ---------- Lites: code and files to share, like Gists! ---------- */
    // A lite is an entry whose body is a Keydown description followed by its files, each one fenced like this
    // (the fence is always longer than any run of ~ that starts a line inside the file):
    //   ~~~ file: hello.js
    //   console.log('Hi!');
    //   ~~~
    const LITE_RE = /^(~{3,})[ \t]*file:[ \t]*([^\n]+?)[ \t]*\n([\s\S]*?)\n\1[ \t]*$/gm;
    function liteSplit(body) {
        const files = [];
        const desc = String(body || '').replace(/\r/g, '').replace(LITE_RE, (_, f, name, code) => { files.push({ name: name.trim(), code }); return ''; }).trim();
        return { desc, files };
    }
    function liteJoin(desc, files) {
        return [String(desc || '').trim()].concat((files || []).map((f) => {
            const code = String(f.code || '').replace(/\r/g, '').replace(/\n+$/, '');
            const runs = (code.match(/^~+/gm) || []).map((x) => x.length + 1);
            const fence = '~'.repeat(Math.max(3, ...runs));
            return fence + ' file: ' + String(f.name).trim() + '\n' + code + '\n' + fence;
        })).filter(Boolean).join('\n\n');
    }
    const liteExt = (name) => ((/\.([a-z0-9]+)$/i.exec(name || '') || [])[1] || '').toLowerCase();
    const LITE_LANGS = { js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', py: 'Python', jl: 'Julia', html: 'HTML', htm: 'HTML', css: 'CSS',
        json: 'JSON', kd: 'Keydown', kn: 'Keydown', md: 'Markdown', gdshader: 'Godot Shader', gd: 'GDScript', glsl: 'GLSL', frag: 'GLSL', vert: 'GLSL', rs: 'Rust', go: 'Go', c: 'C', h: 'C', cpp: 'C++', cs: 'C#',
        java: 'Java', kt: 'Kotlin', swift: 'Swift', rb: 'Ruby', lua: 'Lua', php: 'PHP', sh: 'Shell', bash: 'Shell', zsh: 'Shell', sql: 'SQL', svelte: 'Svelte', vue: 'Vue', elm: 'Elm', toml: 'TOML',
        yaml: 'YAML', yml: 'YAML', xml: 'XML', svg: 'SVG', zr: 'Zonerider scene', kv: 'Inkpath drawing', csv: 'CSV', txt: 'Text', bl: 'BitLang', r: 'R', pas: 'Pascal' };
    const liteLang = (name) => LITE_LANGS[liteExt(name)] || (liteExt(name) ? liteExt(name).toUpperCase() : 'Text');
    // A small highlighter for any language: comments, strings, numbers, keywords and (in markup) tags
    const LITE_KW = new Set(('and as async await bool break case catch class const continue def default defer del do elif else elseif end enum export extends false final finally float fn for from func function '
        + 'global if impl import in int interface is lambda let local match mut new nil none None not null or package pass pub raise return self shader_type render_mode static struct super switch then this '
        + 'throw true True False try type uniform use var varying vec2 vec3 vec4 mat4 sampler2D void where while with yield').split(' '));
    function liteHighlight(code, name) {
        const ext = liteExt(name);
        if (/^(txt|md|kd|kn|csv)$/.test(ext) || !ext) return esc(code);
        const hash = /^(py|sh|bash|zsh|rb|jl|yaml|yml|toml|r|pl|conf|ini|gd)$/.test(ext);
        const markup = /^(html|htm|xml|svg|svelte|vue)$/.test(ext);
        const comments = [markup ? '<!--[\\s\\S]*?-->' : '', hash ? '#[^\\n]*' : '/\\*[\\s\\S]*?\\*/|//[^\\n]*', /^(sql|lua|elm)$/.test(ext) ? '--[^\\n]*' : ''].filter(Boolean).join('|');
        const re = new RegExp([
            '(' + comments + ')',
            '("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)',
            '(' + (markup ? '</?[A-Za-z][\\w:-]*|/?>' : '(?!)') + ')',
            '(\\b(?:0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b)',
            '([A-Za-z_$][\\w$]*)',
        ].join('|'), 'g');
        let out = '', last = 0, m;
        while ((m = re.exec(code))) {
            if (!m[0]) { re.lastIndex++; continue; }
            out += esc(code.slice(last, m.index));
            const t = esc(m[0]);
            if (m[1]) out += '<span class="lt-c">' + t + '</span>';
            else if (m[2]) out += '<span class="lt-s">' + t + '</span>';
            else if (m[3]) out += '<span class="lt-t">' + t + '</span>';
            else if (m[4]) out += '<span class="lt-n">' + t + '</span>';
            else if (m[5] && LITE_KW.has(m[5])) out += '<span class="lt-k">' + t + '</span>';
            else out += t;
            last = re.lastIndex;
        }
        return out + esc(code.slice(last));
    }
    const liteSize = (code) => { const b = new Blob([code]).size; return b > 1024 ? (b / 1024).toFixed(1) + ' KB' : b + ' bytes'; };
    const LITE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4.5 4.5v12.5H6z" fill="#fff" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V8h4.5M9.5 13l-2 2 2 2M14.5 13l2 2-2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function liteFilesHtml(files, editable) {
        if (!files.length) return '<div class="empty">No files yet!</div>';
        return '<div class="lite-files">' + files.map((f, i) => {
            const n = f.code.split('\n').length;
            return '<section class="lite-file" id="lite-file-' + i + '"><header class="lite-head"><span class="lite-name">' + LITE_ICON + esc(f.name) + '</span><span class="lite-lang">' + esc(liteLang(f.name)) + '</span><span class="lite-size">' + n + ' line' + (n === 1 ? '' : 's') + ' · ' + liteSize(f.code) + '</span>' +
                (editable ? '' : '<span class="lite-btns"><button type="button" class="gel small plain" data-lite="copy" data-i="' + i + '">Copy</button><button type="button" class="gel small plain" data-lite="raw" data-i="' + i + '">Raw</button><button type="button" class="gel small plain" data-lite="dl" data-i="' + i + '">Download</button></span>') +
                '</header><div class="lite-code"><pre class="lite-nums" aria-hidden="true">' + Array.from({ length: n }, (_, k) => k + 1).join('\n') + '</pre><pre class="lite-src"><code>' + liteHighlight(f.code, f.name) + '</code></pre></div></section>';
        }).join('') + '</div>';
    }
    // A .zip of every file (stored as they are: small code files gain little from squeezing)
    const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
    function zipFiles(files) {
        const enc = new TextEncoder(), parts = [], dir = [];
        const put = (dv, list) => list.forEach(([o, v, w]) => (w === 4 ? dv.setUint32(o, v >>> 0, true) : dv.setUint16(o, v, true)));
        let off = 0, dirSize = 0;
        files.forEach((f) => {
            const name = enc.encode(f.name), data = enc.encode(f.code), crc = crc32(data);
            const head = new DataView(new ArrayBuffer(30));
            put(head, [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2], [28, 0, 2]]);
            const cen = new DataView(new ArrayBuffer(46));
            put(cen, [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, off, 4]]);
            parts.push(head.buffer, name, data);
            dir.push(cen.buffer, name);
            off += 30 + name.length + data.length;
            dirSize += 46 + name.length;
        });
        const end = new DataView(new ArrayBuffer(22));
        put(end, [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, dirSize, 4], [16, off, 4]]);
        return new Blob(parts.concat(dir, [end.buffer]), { type: 'application/zip' });
    }
    // the preview panel (opendb/lite-preview.js): the lite's choice (preview: header), or the best one its files allow
    const PREVIEW_CHOICES = [['auto', 'Automatic (the best one the files allow)'], ['html', 'Web page (.html, with its .css and .js)'], ['css', 'CSS on a sample page'], ['svelte', 'Svelte components (App.svelte)'], ['python', 'Python terminal (main.py)'], ['zonerider', 'Zonerider scene (.zr or .gltf)'], ['godot', 'Godot shader on a 3D shape (.gdshader)'], ['keydown', 'Keydown (.kd, .kn or .md)'], ['none', 'No preview']];
    function litePreview(box, files, chosen) {
        if (!box) return;
        const k = window.LitePreview ? window.LitePreview.auto(files, chosen) : null;
        if (!k) { box.remove(); return; }
        window.LitePreview.mount(box, files, k);
    }
    function wireLiteButtons(root, files) {
        root.querySelectorAll('[data-lite]').forEach((b) => {
            b.onclick = () => {
                const f = files[+b.dataset.i];
                if (!f) return;
                if (b.dataset.lite === 'copy') copy(f.code);
                else if (b.dataset.lite === 'dl') download(f.name, f.code, 'text/plain');
                else window.open(URL.createObjectURL(new Blob([f.code], { type: 'text/plain;charset=utf-8' })), '_blank', 'noopener');
            };
        });
    }

    /* ---------- Keydown (the Radii Office formatting language) + LaTeX + OpenDB links ---------- */
    // LaTeX: $inline$ and $$display$$ math, drawn by KaTeX (or shown as source until it loads)
    function tex(src, display) {
        if (window.katex) {
            try { return window.katex.renderToString(src, { displayMode: display, throwOnError: false, output: 'htmlAndMathml' }); }
            catch (e) { /* fall through to the source */ }
        }
        return '<code class="tex-raw">' + esc(display ? '$$' + src + '$$' : '$' + src + '$') + '</code>';
    }
    // One line of Keydown: OpenDB's extras are set aside first, so Keydown never touches them
    function inline(text, notes) {
        const store = [];
        const stash = (html) => { store.push(html); return '\u0001' + (store.length - 1) + '\u0001'; };
        let s = String(text);
        s = s.replace(/`([^`\n]+)`/g, (_, t) => stash('<code class="kd-code">' + esc(t) + '</code>'));
        // {{templates}} and {{live values}} first, so a "$" inside them is never read as math
        s = s.replace(/\{\{([^{}]+)\}\}/g, (_, raw) => stash(tplInline(raw)));
        s = s.replace(/\\\$/g, () => stash('$'));
        s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash(tex(t.trim(), true)));
        s = s.replace(/(^|[^\w$])\$(?=\S)([^$\n]*?\S)\$(?![\w$])/g, (_, pre, t) => pre + stash(tex(t, false)));
        s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
            const e = byId.get(id);
            const text = esc(label || (e ? e.title : id));
            return stash(e ? '<a href="#/e/' + id + '">' + text + '</a>' : '<a class="missing" href="#/new/article?id=' + id + '" title="No entry yet: write it!">' + text + '</a>');
        });
        s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|#)[^)\s]+)\)/g, (_, t, u) => stash('<a href="' + esc(u) + '"' + (u[0] === '#' ? '' : ' target="_blank" rel="noopener noreferrer"') + '>' + esc(t) + '</a>'));
        s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)\u0001]+)/g, (_, pre, u) => pre + stash('<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>'));
        s = s.replace(/\[\^([\w-]+)\]/g, (_, n) => {
            if (!notes.order.includes(n)) notes.order.push(n);
            const k = notes.order.indexOf(n) + 1;
            return stash('<sup id="ref-' + esc(n) + '"><a href="#fn-' + esc(n) + '" data-scroll>[' + k + ']</a></sup>');
        });
        // Writeout's toolbar formatting as Keydown: [words]{color=#dc2626 bg=#fde047 font="Georgia" size=24px weight=600}
        if (window.kdDoc && kdDoc.styleCss) s = s.replace(/\[([^[\]\n]+)\]\{((?:\s*(?:color|bg|font|size|weight)=(?:"[^"\n]*"|[^\s}"]+))+\s*)\}/g, (m, body, attrs) => {
            const css = kdDoc.styleCss(attrs);
            return css ? stash('<span style="' + css + '">' + inline(body, notes) + '</span>') : m;
        });
        const html = typeof window.kdRender === 'function' ? window.kdRender(s) : esc(s);
        return html.replace(/\u0001(\d+)\u0001/g, (_, i) => store[+i]);
    }
    // "> " lines: a quote (a last "— Name" line says who said it), or a callout box when the first line is [!NOTE], [!TIP],
    // [!IMPORTANT], [!WARNING], [!CAUTION] or OpenDB's own [!FACT] ("Did you know?")
    // (an icon written as a name, like 'info', is a glossy picture from icons/)
    const CALLOUTS = { NOTE: ['info', 'Note'], TIP: ['tip', 'Tip'], IMPORTANT: ['❗', 'Important'], WARNING: ['⚠️', 'Warning'], CAUTION: ['🛑', 'Caution'], FACT: ['✨', 'Did you know?'] };
    function quoteBlock(body, notes) {
        const m = /^\[!([A-Za-z]+)\]\s*(.*)$/.exec(body[0] || '');
        const kind = m && CALLOUTS[m[1].toUpperCase()] ? m[1].toUpperCase() : null;
        if (!kind) {
            let by = '';
            if (body.length > 1 && /^(—|--)\s*\S/.test(body[body.length - 1])) by = body.pop().replace(/^(—|--)\s*/, '');
            const text = body.filter((l) => l.trim() !== '');
            return '<blockquote class="odb-quote">' + text.map((l) => inline(l, notes)).join('<br>') + (by ? '<cite>— ' + inline(by, notes) + '</cite>' : '') + '</blockquote>';
        }
        const text = [m[2]].concat(body.slice(1)).filter((l) => l.trim() !== '');
        return '<div class="odb-callout odb-callout-' + kind.toLowerCase() + '" role="note"><div class="odb-callout-title">' + (/^[a-z]+$/.test(CALLOUTS[kind][0]) ? tplIcon(CALLOUTS[kind][0], 'odb-callout-icon') : '<span aria-hidden="true">' + CALLOUTS[kind][0] + '</span>') + ' ' + CALLOUTS[kind][1] + '</div>'
            + (text.length ? '<div class="odb-callout-body">' + text.map((l) => inline(l, notes)).join('<br>') + '</div>' : '') + '</div>';
    }
    function renderKd(src, entry) {
        tplCtx = entry || null;
        const lines = String(src || '').replace(/\r/g, '').split('\n');
        const notes = { order: [], defs: {} };
        const out = [];
        const para = [];
        const flush = () => { if (para.length) { out.push('<p>' + para.map((l) => inline(l, notes)).join('<br>') + '</p>'); para.length = 0; } };
        for (let i = 0; i < lines.length; i++) {
            let t = lines[i].trim();
            let m;
            if (/^```/.test(t)) {
                flush();
                const body = [];
                for (i++; i < lines.length && !/^```/.test(lines[i].trim()); i++) body.push(lines[i]);
                out.push('<pre><code>' + esc(body.join('\n')) + '</code></pre>');
                continue;
            }
            if (!t) { flush(); continue; }
            // @@table=[a1h:'Name',b1:'Score',a2:'Ann'...]{style}: a table, cell by cell (drawn by keydown-doc.js)
            if (t.startsWith('@@table=[') && window.kdDoc && kdDoc.atTableHtml) {
                const h = kdDoc.atTableHtml(t);
                if (h) { flush(); try { if (window.RadiiTable) window.RadiiTable.injectCss(); } catch (e) {} out.push('<div class="odb-table">' + h + '</div>'); continue; }
            }
            // {align=center} at the start of a line (Writeout's align buttons, saved as Keydown)
            if ((m = /^\{align=(left|center|right|justify)\}\s*(.*)$/.exec(t))) { flush(); out.push('<p style="text-align: ' + m[1] + '">' + inline(m[2], notes) + '</p>'); continue; }
            if (/^>/.test(t)) {
                flush();
                const body = [];
                for (; i < lines.length && /^>/.test(lines[i].trim()); i++) body.push(lines[i].trim().replace(/^>\s?/, ''));
                i--;
                out.push(quoteBlock(body, notes));
                continue;
            }
            // a line indented with tabs (Writeout and Bitbook's Indent saves it that way) stays indented
            const tabs = (/^\t+/.exec(lines[i]) || [''])[0].length;
            if (tabs && !/^(#{1,4}|\*)\s/.test(t)) { flush(); out.push('<p class="odb-indent" style="margin-left: ' + Math.min(8, tabs) * 2.5 + 'rem">' + inline(t, notes) + '</p>'); continue; }
            // a template alone on its line: a notice box, a hatnote or the stub note
            if ((m = /^\{\{([^{}]+)\}\}$/.exec(t)) && findTpl(m[1]) && findTpl(m[1]).kind !== 'inline') { flush(); out.push(tplBlock(m[1])); continue; }
            // Line shortcuts: "# " "## " "### " headings, "#### " the mega header, "* " a bullet!
            // (the text inside is drawn like any other line, so **bold**, links and math work in it too)
            const ls = /^(#{1,4}|\*)\s+(\S.*)$/.exec(t);
            if (ls) {
                flush();
                const cls = ls[1] === '*' ? 'bulleted-list' : ['header-1', 'header-2', 'header-3', 'mega-header'][ls[1].length - 1];
                const anchor = ls[1] === '*' ? '' : ' id="s-' + ls[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '"';
                out.push('<div class="kd-line"' + anchor + '><span class="' + cls + '">' + inline(ls[2], notes) + '</span></div>');
                continue;
            }
            if ((m = /^\[\^([\w-]+)\]:\s*(.*)$/.exec(t))) { flush(); notes.defs[m[1]] = m[2]; continue; }
            if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
                flush();
                const alt = m[1], target = m[2];
                let src = null, link = null, ent = { file: target };
                if (target.startsWith('media:')) { const e = byId.get(target.slice(6)); if (e && e.type === 'media') { src = mediaSrc(e); link = '#/e/' + e.id; ent = e; } }
                else if (/^https:\/\//.test(target)) src = target;
                // pictures link to their page; players stay clickable, so the caption links instead
                const still = mediaKind(ent) === 'image';
                const cap = alt ? inline(alt, notes) : '';
                out.push(src ? '<figure>' + (link && still ? '<a href="' + link + '">' : '') + mediaTag(ent, src, alt, true) + (link && still ? '</a>' : '') +
                    (cap || (link && !still) ? '<figcaption>' + (link && !still ? '<a href="' + link + '">' + (cap || 'About this file') + '</a>' : cap) + '</figcaption>' : '') + '</figure>' : '<p class="muted">[missing media: ' + esc(target) + ']</p>');
                continue;
            }
            if (/^\$\$[\s\S]*\$\$$/.test(t)) { flush(); out.push('<div class="tex-block">' + inline(t, notes) + '</div>'); continue; }
            // whole-line Keydown pieces stand on their own: ::blocks, headings and list items
            const hm = /^~(MH|H1|H2|H3)~(.*)~\1~$/.exec(t);
            if (/^::[a-z]+(\{[^}]*\})?$/.test(t) || hm || /^~(BUL|BQ)~.*~\1~$/.test(t)) {
                flush();
                const anchor = hm ? ' id="s-' + hm[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '"' : '';
                out.push('<div class="kd-line"' + anchor + '>' + inline(t, notes) + '</div>');
                continue;
            }
            para.push(t);
        }
        flush();
        // footnotes become a numbered list where they were cited from
        const used = notes.order.filter((n) => notes.defs[n] !== undefined);
        if (used.length) out.push('<ol class="refs">' + used.map((n) => '<li id="fn-' + esc(n) + '">' + inline(notes.defs[n], { order: [] }) + ' <a href="#ref-' + esc(n) + '" data-scroll title="Back to the text">↩</a></li>').join('') + '</ol>');
        return out.join('');
    }
    // The editor's Keydown guide starts with OpenDB's own extras: quotes, callout boxes and indents, each with a live preview
    function EXTRAS_GUIDE() {
        const rows = [['> A quote\n> — Who said it', 'A quote'], ['> [!NOTE] Something worth knowing', 'Note'], ['> [!TIP] A helpful hint', 'Tip'],
            ['> [!IMPORTANT] Do not miss this', 'Important'], ['> [!WARNING] Be careful here', 'Warning'], ['> [!CAUTION] This can go wrong', 'Caution'],
            ['> [!FACT] A fun fact', 'Did you know?'], ['\tA line indented with a tab', 'Indented line']];
        return '<div class="kd-guide-group"><div class="kd-guide-title">OpenDB extras: quotes, callout boxes and indents (' + rows.length + ')</div>'
            + rows.map((r) => '<div class="kd-guide-row"><code>' + esc(r[0]).replace(/\n/g, '<br>').replace(/\t/g, '⇥ ') + '</code><span>' + renderKd(r[0]) + '</span></div>').join('')
            + '<div class="kd-guide-row"><span>Several "&gt; " lines in a row make one box; "&gt; [!FACT]" is OpenDB\'s own!</span></div></div>';
    }
    // The Highlight button's styles, straight from Keydown's own lists (so new styles show up by themselves)
    const HL_COLOR_NAMES = { R: 'Red', O: 'Orange', GL: 'Gold', Y: 'Yellow', L: 'Lime', G: 'Green', TU: 'Turquoise', T: 'Teal', C: 'Cyan', B: 'Blue', PR: 'Purple', PK: 'Pink', W: 'White', FG: 'Fog', SL: 'Slate', BK: 'Black' };
    const hlColor = (d) => { const m = /([A-Z]{1,2})[#%^+:;]$/.exec(d.o); return (m && HL_COLOR_NAMES[m[1]]) || d.o; };
    const hlPreview = (d) => (typeof window.kdRender === 'function' ? window.kdRender(d.o + hlColor(d) + d.c) : esc(d.o + hlColor(d) + d.c));
    const SERIES_NAMES = ['Bevels', 'Stripes', 'Halos', 'Dots', 'Shelves', 'Corners', 'Rings', 'Frames', 'Bands', 'Stitches', 'Pebbles', 'Rulers', 'Waves', 'Checks', 'Bookends', 'Sparkles', 'Grids', 'Insets', 'Glows', 'Beads'];
    function hlGroups() {
        /* global KD_HL, KD_CORE */
        const hl = typeof KD_HL !== 'undefined' ? KD_HL : [];
        const core = typeof KD_CORE !== 'undefined' ? KD_CORE : [];
        const ends = (c) => hl.filter((d) => d.c === c);
        const cls = (re) => core.filter((d) => re.test(d.cls || '') && d.o !== '!#A#');
        const cats = (list) => list.map(([name, items]) => ({ name, items })).filter((c) => c.items.length);
        return [
            { name: 'Annotate styles', cats: cats([['Gel Highlights  #color#text##', ends('##')], ['Gel Underlines  #color#text#_', ends('#_')], ['Gel Strikes  #color#text#~', ends('#~')],
                ['Gel Boxes  #color#text#=', ends('#=')], ['Corner Brackets  #color#text#]', ends('#]')], ['Gel Selects  #color#text#-', ends('#-')], ['Color Inks  #color(text)', hl.filter((d) => /^#[A-Z]+\($/.test(d.o))]]) },
            { name: 'Annotate styles by name', cats: cats([['#color.name(text)', typeof KD_AN_GUIDE !== 'undefined' ? KD_AN_GUIDE : []]]) },
            { name: 'Gel Orb cousins', cats: cats([['Gel Beacons  =+color+=text=+color+=', cls(/^gel-beacon-chip /)]]) },
            { name: 'Bubble Chip cousins', cats: cats([['Bubble Chips  #color#text#', cls(/^gel-bubble-chip /)], ['Gloss Pills  %color%text%', cls(/^gel-pill-chip /)], ['Gel Flags  #%color%text%', cls(/^gel-flag-chip /)],
                ['Gel Tabs  #^color^text^', cls(/^gel-tab-chip /)], ['Gel Drops  #+color+text+', cls(/^gel-drop-chip /)], ['Gel Splits  #:color:text:', cls(/^gel-split-chip /)],
                ['Gel Lenses  #;color;text;', cls(/^gel-lens-chip /)], ['Gel Speech  ^^color^text^^', cls(/^gel-speech-chip /)], ['Gel Tickets  !!color!text!!', cls(/^gel-ticket-chip /)], ['Gel Arrows  ??color?text??', cls(/^gel-arrow-chip /)], ['Gel Dogears  ,,color,text,,', cls(/^gel-dogear-chip /)], ['Gel Keycaps  __color_text__', cls(/^gel-keycap-chip /)], ['Aero Chips  ++color+text++', cls(/^gel-aero-chip /)], ['Aero Glass Chips  ++color=text++', cls(/^gel-aeroglass-chip /)], ['Aero Orb Chips  ++color*text++', cls(/^gel-aeroorb-chip /)], ['Aero Glow Chips  ++color^text++', cls(/^gel-aeroglow-chip /)], ['Aero Ring Chips  ++color:text++', cls(/^gel-aeroring-chip /)], ['Aero Bubble Chips  ++color!text++', cls(/^gel-aerobubble-chip /)], ['Aero Toast Chips  ++color~text++', cls(/^gel-aerotoast-chip /)], ['Aero Notice Chips  ++color%text++', cls(/^gel-aeronotice-chip /)], ['Rim Chips  !!#color#text#', cls(/^gel-rim-chip /)], ['Rim Liquid Chips  !!^color#text#', cls(/^gel-rimliquid-chip /)], ['Rim Stripe Chips  !!~color#text#', cls(/^gel-rimstripe-chip /)], ['Accent Rim Chips  !!=color#text#', cls(/^gel-rimaccent-chip /)], ['Rim Neon Chips  !!+color#text#', cls(/^gel-rimneon-chip /)], ['Rim Frost Chips  !!%color#text#', cls(/^gel-rimfrost-chip /)], ['Rim Double Chips  !!:color#text#', cls(/^gel-rimdouble-chip /)], ['Rim Dots Chips  !!;color#text#', cls(/^gel-rimdots-chip /)], ['Rim Pearl Chips  !!-color#text#', cls(/^gel-rimpearl-chip /)], ['Rim Steel Chips  !!?color#text#', cls(/^gel-rimsteel-chip /)], ['Rim Aurora Chips  !!/color#text#', cls(/^gel-rimaurora-chip /)], ['Logo Chips  ;;color;text;;', cls(/^gel-logo-chip /)], ['Tag Chips  !#color#text#', cls(/^aero-tag-chip /)]]) },
            { name: 'Gel Series  %number%color%text%##', cats: cats(SERIES_NAMES.map((n, i) => [(i + 1) + '. Gel ' + n, cls(new RegExp('^gel-sx-chip gel-sx-' + (i + 1) + ' '))])) },
        ];
    }
    // Plain text for search: Keydown triggers, math markers and link syntax are dropped
    function plain(src) {
        return String(src || '')
            .replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([a-z0-9-]+)\]\]/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\[\^[\w-]+\]:?/g, '')
            .replace(/\{\{[^{}]*\}\}/g, ' ')
            .replace(/^\s*>\s*(\[![A-Za-z]+\])?/gm, ' ').replace(/::[a-z]+/g, ' ').replace(/@[a-z0-9]+(?:-[1-5])?@/g, ' ')
            .replace(/~[A-Z0-9-]+~|=[A-Z]+=|!?#[A-Z]+#|#[%^+:;][A-Z]+[%^+:;]|%\d{1,2}%[A-Z]+%|%[A-Z]+%|\^\^[A-Z]+\^|\^\^|%##|##|#_|#~|&&/g, ' ')
            .replace(/[*`$\\]/g, '').replace(/\s+/g, ' ');
    }

    /* ---------- Templates: little Wikipedia-style notices, written {{name}} or {{name|detail}} ---------- */
    // Boxes and hatnotes go on a line of their own; tags like {{citation needed}} sit inside a sentence.
    // c is what a template knows: the entry's noun ("article", "file", "paper"), its edit link and the details.
    const TEMPLATES = [
        // maintenance boxes
        { name: 'stub', kind: 'stub', group: 'Maintenance', icon: 'stub', where: 'end', hint: 'A short entry that should grow. Put it at the very bottom!',
            text: (c) => 'This ' + c.noun + ' is a <b>stub</b>. You can help OpenDB by ' + c.edit('expanding it') + '!' },
        { name: 'more citations', aliases: ['citations needed', 'refimprove', 'more sources'], kind: 'content', group: 'Maintenance', icon: 'question', hint: 'Some claims have no source yet.',
            text: (c) => 'This ' + c.noun + ' <b>needs more sources</b>. Please help by ' + c.edit('adding footnotes') + ' that point to reliable sources! Claims without a source may be challenged and removed.' + c.reason() },
        { name: 'unreferenced', aliases: ['no sources'], kind: 'content', group: 'Maintenance', icon: 'question', hint: 'Nothing in the entry has a source.',
            text: (c) => 'This ' + c.noun + ' <b>does not cite any sources</b>. Please help by ' + c.edit('adding footnotes') + ' that point to reliable sources!' },
        { name: 'file improvement', aliases: ['image improvement', 'improve file'], kind: 'file', group: 'Maintenance', icon: 'image', example: '{{file improvement|the text is blurry}}', hint: 'A media file that someone could redraw, sharpen or replace. Add what is wrong after a |!',
            text: (c) => 'This ' + (c.type === 'media' ? 'file' : c.noun + '’s image') + ' <b>could be improved</b>' + (c.arg ? ': ' + c.argHtml : '') + '! If you can make a better version (sharper, larger, cleaner, or as an SVG), please ' + c.edit('upload it') + '!' },
        { name: 'images needed', aliases: ['image needed', 'image requested', 'needs images', 'needs image'], kind: 'file', group: 'Maintenance', icon: 'photo', example: '{{images needed|a photo of a leaf}}', hint: 'An entry that would be clearer with a picture. Say what would help after a |!',
            text: (c) => 'This ' + c.noun + ' <b>needs images</b>' + (c.arg ? ': ' + c.argHtml : '') + '! If you can draw, photograph or find a public domain picture, please <a href="#/new/media">upload it</a> and ' + c.edit('add it here') + '!' },
        { name: 'cleanup', kind: 'style', group: 'Maintenance', icon: 'tip', example: '{{cleanup|the sections repeat each other}}', hint: 'The entry needs tidying. Add the reason after a |!',
            text: (c) => 'This ' + c.noun + ' <b>may need cleanup</b> to meet OpenDB’s standards.' + c.reason() + ' You can help by ' + c.edit('improving it') + '!' },
        { name: 'copy edit', aliases: ['copyedit'], kind: 'style', group: 'Maintenance', icon: 'tip', hint: 'Grammar, spelling or wording need a pass.',
            text: (c) => 'This ' + c.noun + ' <b>may need copy editing</b> for grammar, style, clarity or spelling. You can help by ' + c.edit('editing it') + '!' },
        { name: 'too technical', aliases: ['technical'], kind: 'style', group: 'Maintenance', icon: 'tip', hint: 'Hard to follow for someone new to the topic.',
            text: (c) => 'This ' + c.noun + ' <b>may be too technical</b> for most readers. Please help ' + c.edit('make it easier to understand') + ', without removing the details!' },
        { name: 'outdated', aliases: ['update'], kind: 'content', group: 'Maintenance', icon: 'exclamation', example: '{{outdated|date=2026}}', hint: 'Facts that may have changed. Add date=… for when it was last right!',
            text: (c) => 'Parts of this ' + c.noun + ' <b>may be out of date</b>' + (c.named.date ? ' (as of ' + esc(c.named.date) + ')' : '') + '. Please help ' + c.edit('update it') + ' with newer information!' },
        { name: 'disputed', aliases: ['dubious entry'], kind: 'content', group: 'Maintenance', icon: 'exclamation', hint: 'Someone thinks a fact here is wrong.',
            text: (c) => 'The <b>accuracy of this ' + c.noun + ' is disputed</b>.' + c.reason() + ' Check its sources, and ' + c.edit('fix any mistakes') + ' you can prove!' },
        { name: 'expand', aliases: ['expand section'], kind: 'notice', group: 'Maintenance', icon: 'stub', hint: 'Put it under a heading that is empty or too thin.',
            text: (c) => 'This section <b>needs more detail</b>. You can help by ' + c.edit('adding to it') + '!' },
        { name: 'orphan', kind: 'notice', group: 'Maintenance', icon: 'info', hint: 'No other entry links here yet.',
            text: (c) => '<b>No other entries link to this ' + c.noun + '</b>. Please add [[links]] to it from related entries!' + (c.linkedFrom ? ' <i>(' + c.linkedFrom + ' now link here, so this notice can be removed!)</i>' : '') },
        { name: 'in use', aliases: ['under construction', 'in progress'], kind: 'notice', group: 'Maintenance', icon: 'info', hint: 'Someone is writing it right now.',
            text: (c) => 'This ' + c.noun + ' is <b>being written right now</b>, so it may change a lot soon. Please be patient!' },
        { name: 'merge', aliases: ['merge with'], kind: 'move', group: 'Maintenance', icon: 'info', example: '{{merge|other-entry}}', hint: 'Two entries cover the same thing. Name the other one after a |!',
            text: (c) => 'It has been suggested that this ' + c.noun + ' be <b>merged</b> with ' + (c.args.length ? c.links() : 'another entry') + '.' },
        // hatnotes: one italic line at the top that points somewhere else
        { name: 'main', aliases: ['main article'], kind: 'hatnote', group: 'Hatnotes', example: '{{main|public-domain}}', hint: 'Put it under a heading that summarizes a bigger entry.',
            text: (c) => 'Main ' + (c.args.length > 1 ? 'entries' : 'entry') + ': ' + c.links() },
        { name: 'see also', kind: 'hatnote', group: 'Hatnotes', example: '{{see also|cc0|public-domain}}', hint: 'Related entries, separated by |.',
            text: (c) => 'See also: ' + c.links() },
        { name: 'further', aliases: ['further information'], kind: 'hatnote', group: 'Hatnotes', example: '{{further|opendb}}', hint: 'Where to read more.',
            text: (c) => 'Further information: ' + c.links() },
        { name: 'distinguish', kind: 'hatnote', group: 'Hatnotes', example: '{{distinguish|creative-commons}}', hint: 'An entry people often mix this one up with.',
            text: (c) => 'Not to be confused with ' + c.links() + '.' },
        { name: 'about', kind: 'hatnote', group: 'Hatnotes', example: '{{about|the license|the idea|public-domain}}', hint: 'What this entry is about, then another use and where to find it.',
            text: (c) => 'This ' + c.noun + ' is about ' + (c.args[0] ? esc(c.args[0]) : 'its title') + '.' + (c.args[2] ? ' For ' + esc(c.args[1] || 'other uses') + ', see ' + c.links(c.args.slice(2)) + '.' : '') },
        // tags inside a sentence
        { name: 'citation needed', aliases: ['cn', 'fact'], kind: 'inline', group: 'Inline tags', tag: 'citation needed', hint: 'Right after a claim that needs a source.' },
        { name: 'clarify', kind: 'inline', group: 'Inline tags', tag: 'clarification needed', hint: 'After a sentence that is hard to understand.' },
        { name: 'dubious', kind: 'inline', group: 'Inline tags', tag: 'dubious', hint: 'After a claim that looks wrong.' },
        { name: 'vague', kind: 'inline', group: 'Inline tags', tag: 'vague', hint: 'After wording that is too fuzzy to check.' },
        { name: 'when', kind: 'inline', group: 'Inline tags', tag: 'when?', hint: 'A time is missing.' },
        { name: 'who', kind: 'inline', group: 'Inline tags', tag: 'who?', hint: 'A person or group is missing.' },
        { name: 'which', kind: 'inline', group: 'Inline tags', tag: 'which?', hint: 'Something is too unspecific.' },
        { name: 'page needed', kind: 'inline', group: 'Inline tags', tag: 'page needed', hint: 'A source is cited without a page number.' },
    ];
    const tplSlug = (name) => name.replace(/\s+/g, '-');
    // a template's icon is a glossy picture from icons/ (question, exclamation, photo, image, info, tip or stub)
    const tplIcon = (name, cls) => '<img class="' + (cls || 'tpl-icon') + '" src="icons/' + name + '.png" alt="" aria-hidden="true">';
    const tplKey = (s) => String(s).trim().toLowerCase().replace(/[\s_-]+/g, ' ');
    const TPL_BY = new Map();
    TEMPLATES.forEach((t) => [t.name].concat(t.aliases || []).forEach((n) => TPL_BY.set(tplKey(n), t)));
    const findTpl = (raw) => TPL_BY.get(tplKey(String(raw).split('|')[0])) || null;
    let tplCtx = null; // the entry being drawn, so notices can say "file" or "paper" and link to its editor

    function tplContext(raw) {
        const parts = String(raw).split('|').slice(1).map((s) => s.trim());
        const named = {};
        const args = [];
        parts.forEach((p) => { const m = /^([a-z]+)\s*=\s*(.*)$/i.exec(p); if (m) named[m[1].toLowerCase()] = m[2]; else if (p) args.push(p); });
        const e = tplCtx || {};
        const n = e.id ? (backlinks.get(e.id) || new Set()).size : 0;
        const arg = named.reason || args[0] || '';
        return {
            type: e.type, noun: { article: 'article', media: 'file', paper: 'paper', lite: 'lite' }[e.type] || 'entry',
            args, named, arg, argHtml: esc(arg),
            edit: (text) => (e.id ? '<a href="#/edit/' + esc(e.id) + '">' + text + '</a>' : text),
            reason: () => (arg ? ' <i>Reason: ' + esc(arg) + '</i>' : ''),
            links: (list) => (list || args).map((a) => { const id = byId.has(a) ? a : slug(a); return inline('[[' + id + (byId.has(id) || id === a ? '' : '|' + a) + ']]', { order: [] }); }).join(', '),
            linkedFrom: n ? n + ' entr' + (n === 1 ? 'y' : 'ies') : '',
        };
    }
    // A template on its own line: a message box, a hatnote or the stub note
    function tplBlock(raw) {
        const t = findTpl(raw);
        const c = tplContext(raw);
        const more = ' <a class="tpl-more" href="#/template/' + tplSlug(t.name) + '" title="About this notice, and every entry that has it" aria-label="About this notice">' + tplIcon('info', 'tpl-more-icon') + '</a>';
        if (t.kind === 'hatnote') return '<div class="tpl-hatnote" role="note">' + t.text(c) + '</div>';
        if (t.kind === 'stub') return '<p class="tpl-stub" role="note">' + tplIcon(t.icon) + ' <i>' + t.text(c) + '</i>' + more + '</p>';
        return '<div class="tpl tpl-' + t.kind + '" role="note">' + tplIcon(t.icon) + '<div>' + t.text(c) + more + '</div></div>';
    }
    // A template inside a sentence: a [tag], or a little chip for a box that was put mid-line
    function tplInline(raw) {
        const t = findTpl(raw);
        if (!t) return '<span class="tpl-unknown" title="There is no template with this name!">{{' + esc(raw) + '}}</span>';
        if (t.kind === 'inline') return '<sup class="tpl-tag">[<a href="#/template/' + tplSlug(t.name) + '">' + esc(t.tag) + '</a>]</sup>';
        return '<a class="tpl-chip" href="#/template/' + tplSlug(t.name) + '">' + (t.icon ? tplIcon(t.icon, 'tpl-chip-icon') : '↪') + ' ' + esc(t.name) + '</a>';
    }
    // Which templates an entry uses (aliases count as their template)
    function templatesIn(e) {
        const out = new Set();
        const re = /\{\{([^{}]+)\}\}/g;
        let m;
        while ((m = re.exec(e.body || ''))) { const t = findTpl(m[1]); if (t) out.add(t); }
        return out;
    }

    /* ---------- Search ---------- */
    function search(q) {
        const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
        if (!words.length) return [];
        return all().map((e) => {
            const title = e.title.toLowerCase(), tags = (e.tags || []).join(' ').toLowerCase(), sum = (e.summary || '').toLowerCase();
            const body = (e.type === 'lite' ? (() => { const L = liteSplit(e.body); return plain(L.desc) + ' ' + L.files.map((f) => f.name + ' ' + f.code.slice(0, 4000)).join(' '); })() : plain(e.body) + ' ' + (e.abstract || '')).toLowerCase();
            let score = 0;
            for (const w of words) {
                let hit = false;
                if (title === w) { score += 30; hit = true; }
                if (title.includes(w)) { score += 12; hit = true; }
                if (tags.includes(w)) { score += 6; hit = true; }
                if (sum.includes(w)) { score += 4; hit = true; }
                const n = body.split(w).length - 1;
                if (n) { score += Math.min(6, n); hit = true; }
                if (!hit) return null; // every word must appear somewhere
            }
            return { e, score };
        }).filter(Boolean).sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title));
    }
    function snippet(e, q) {
        const text = plain(e.type === 'lite' ? liteSplit(e.body).desc : e.body) || e.summary || '';
        const w = q.toLowerCase().split(/\s+/).find((x) => x.length > 1 && text.toLowerCase().includes(x));
        if (!w) return esc(e.summary || text.slice(0, 180));
        const at = text.toLowerCase().indexOf(w);
        const a = Math.max(0, at - 70), b = Math.min(text.length, at + w.length + 110);
        const piece = text.slice(a, b);
        const re = new RegExp('(' + q.split(/\s+/).filter((x) => x.length > 1).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
        return (a ? '…' : '') + esc(piece).replace(re, '<mark>$1</mark>') + (b < text.length ? '…' : '');
    }

    /* ---------- Little pieces ---------- */
    const badge = (e) => '<span class="badge ' + e.type + '">' + TYPES[e.type] + '</span>' + (e.local ? '<span class="badge local" title="Saved on this device only, not published yet">On this device</span>' : '');
    const tagLinks = (tags) => '<div class="tags">' + (tags || []).map((t) => '<a class="tag" href="#/tag/' + encodeURIComponent(t) + '">' + esc(t) + '</a>').join('') + '</div>';
    function itemRow(e, q) {
        const thumb = e.type === 'media' ? mediaThumb(e, 'thumb') : '';
        return '<a class="item" href="#/e/' + e.id + '">' + thumb + '<div><span class="item-title">' + esc(e.title) + '</span>' + badge(e) +
            '<p>' + (q ? snippet(e, q) : esc(e.summary)) + '</p><div class="meta">' + (e.type === 'lite' ? (() => { const fl = liteSplit(e.body).files; return fl.length + ' file' + (fl.length === 1 ? '' : 's') + ': ' + esc(fl.slice(0, 4).map((f) => f.name).join(', ') + (fl.length > 4 ? '…' : '')) + ' · '; })() : '') + (e.type === 'paper' ? esc((e.authors || []).join(', ')) + ' · ' + esc((e.categories || []).join(', ')) + ' · ' : '') + 'Updated ' + esc(e.updated || e.created) + '</div></div></a>';
    }
    function tile(e) { return '<a class="tile" href="#/e/' + e.id + '">' + mediaThumb(e, 'tile-media') + '<b>' + esc(e.title) + '</b>' + (e.local ? badge(e) : '') + '</a>'; }
    const byUpdated = (a, b) => String(b.updated || b.created).localeCompare(String(a.updated || a.created)) || a.title.localeCompare(b.title);

    /* ---------- Pages ---------- */
    function pageHome() {
        const list = all();
        const counts = { article: 0, media: 0, paper: 0, lite: 0 };
        list.forEach((e) => { counts[e.type]++; });
        const articles = list.filter((e) => e.type === 'article');
        const day = Math.floor(Date.now() / 86400000);
        const featured = articles.length ? articles.slice().sort((a, b) => a.id.localeCompare(b.id))[day % articles.length] : null;
        const tagCount = new Map();
        list.forEach((e) => (e.tags || []).forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
        const topTags = Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 24).map((x) => x[0]);
        const section = (type, icon) => {
            const items = list.filter((e) => e.type === type).sort(byUpdated).slice(0, 4);
            return '<div class="card collection"><h2>' + icon + ' <a href="#/browse/' + type + '">' + PLURAL[type] + '</a></h2><p class="muted">' +
                { article: 'Encyclopedia entries that explain a topic!', media: 'Pictures, music and videos that are free to reuse!', paper: 'Research papers and preprints, ready to cite!', lite: 'Code and files to share, like Gists!' }[type] +
                '</p><div class="list">' + (items.length ? items.map((e) => itemRow(e)).join('') : '<div class="empty">Nothing here yet!</div>') + '</div><a href="#/browse/' + type + '">See all ' + counts[type] + ' →</a></div>';
        };
        view.innerHTML =
            '<section class="hero"><h1>Knowledge with no strings attached!</h1><p>OpenDB is a free database of articles, media, papers and lites (shared code). Every entry is in the public domain under CC0, so you can copy, change and reuse anything, for anything!</p>' +
            '<div class="stats"><span class="stat">' + counts.article + ' articles</span><span class="stat">' + counts.media + ' media files</span><span class="stat">' + counts.paper + ' papers</span><span class="stat">' + counts.lite + ' lites</span><span class="stat">100% CC0</span></div></section>' +
            '<div class="grid3">' + section('article', '📖') + section('media', '🖼️') + section('paper', '📄') + section('lite', '🧩') + '</div>' +
            '<div class="home-row"><div class="card featured"><h2>Featured article</h2>' + (featured ? '<h3><a href="#/e/' + featured.id + '">' + esc(featured.title) + '</a></h3><p class="lead">' + esc(featured.summary) + '</p><a class="gel small" href="#/e/' + featured.id + '">Read it!</a>' : '<p>No articles yet!</p>') + '</div>' +
            '<div class="card side-box"><h2>Explore by topic</h2>' + tagLinks(topTags) + '<p class="hint" style="margin-top:12px">Know something worth sharing? <a href="#/new/article">Write an entry</a> and give it to everyone!</p></div></div>';
    }

    function pageBrowse(type, params) {
        const sort = params.get('sort') || (type === 'media' ? 'title' : 'title');
        let list = all().filter((e) => e.type === type);
        list.sort(sort === 'updated' ? byUpdated : (a, b) => a.title.localeCompare(b.title));
        const head = '<h1 class="page">' + PLURAL[type] + '</h1><p class="muted">' + list.length + ' ' + (type === 'media' ? 'files' : PLURAL[type].toLowerCase()) + ', all public domain!' + (type === 'lite' ? ' A lite is code or text files shared together, like a Gist: copy them, download them, or fork one to make it your own!' : '') + '</p>' +
            '<div class="filters"><label>Sort by <select id="sort"><option value="title"' + (sort === 'title' ? ' selected' : '') + '>Title</option><option value="updated"' + (sort === 'updated' ? ' selected' : '') + '>Recently updated</option></select></label><a class="gel small green" href="#/new/' + type + '">＋ Add ' + ADD_ONE[type] + '</a></div>';
        const body = type === 'media' ? '<div class="media-grid">' + list.map(tile).join('') + '</div>' : '<div class="list">' + list.map((e) => itemRow(e)).join('') + '</div>';
        view.innerHTML = '<div class="card">' + head + (list.length ? body : '<div class="empty">Nothing here yet! Be the first to add one!</div>') + '</div>';
        $('sort').onchange = (ev) => { location.hash = '#/browse/' + type + '?sort=' + ev.target.value; };
    }

    function pageTag(tag) {
        const list = all().filter((e) => (e.tags || []).includes(tag)).sort((a, b) => a.title.localeCompare(b.title));
        view.innerHTML = '<div class="card"><h1 class="page">Tagged “' + esc(tag) + '”</h1><p class="muted">' + list.length + ' entr' + (list.length === 1 ? 'y' : 'ies') + '!</p><div class="list">' + list.map((e) => itemRow(e)).join('') + '</div></div>';
    }

    function pageSearch(q) {
        $('q').value = q;
        const results = search(q);
        const exact = byId.get(q.toLowerCase().trim().replace(/\s+/g, '-'));
        view.innerHTML = '<div class="card"><h1 class="page">Search</h1><p class="muted">' + (results.length ? results.length + ' result' + (results.length === 1 ? '' : 's') + ' for “' + esc(q) + '”!' : 'No results for “' + esc(q) + '”!') +
            (!exact && q.trim() ? ' You could <a href="#/new/article?title=' + encodeURIComponent(q.trim()) + '">write an article about it</a>!' : '') + '</p><div class="list">' + results.map((r) => itemRow(r.e, q)).join('') + '</div></div>';
    }

    function pageEntry(id) {
        const e = byId.get(id);
        if (!e) {
            view.innerHTML = '<div class="card empty"><h1 class="page">No entry called “' + esc(id) + '” yet!</h1><p>Would you like to <a href="#/new/article?id=' + encodeURIComponent(id) + '">write it</a>?</p></div>';
            return;
        }
        document.title = e.title + ' - OpenDB';
        const lite = e.type === 'lite' ? liteSplit(e.body) : null;
        const top = '<div class="crumbs"><a href="#/browse/' + e.type + '">' + PLURAL[e.type] + '</a> › ' + esc(e.title) + '</div>' +
            '<h1 class="page">' + esc(e.title) + badge(e) + '</h1>';
        let head = '';
        if (e.type === 'paper') {
            head = '<p class="authors">' + esc((e.authors || []).join(', ')) + ' · <span class="muted">' + esc((e.categories || []).join(', ')) + ' · ' + esc(e.created) + '</span></p>' +
                '<div class="abstract"><b>Abstract</b>' + esc(e.abstract) + '</div>';
        } else {
            head = '<p class="lead">' + esc(e.summary) + '</p>' + (e.fork ? '<p class="hint lite-forked">Forked from ' + inline('[[' + e.fork + ']]', { order: [] }) + '!</p>' : '');
            if (e.type === 'media') {
                const still = mediaKind(e) === 'image';
                head += '<figure class="figure">' + (still ? '<a href="' + esc(mediaSrc(e)) + '" target="_blank" rel="noopener">' : '') + mediaTag(e, mediaSrc(e), e.title) + (still ? '</a>' : '') +
                    '<figcaption>' + esc(e.mime || '') + (e.width ? ' · ' + e.width + ' × ' + e.height : '') + (e.duration ? ' · ' + clock(e.duration) : '') + (still ? ' · click to open full size' : '') + '</figcaption></figure>';
            }
        }
        const info = e.infobox && Object.keys(e.infobox).length ? '<div class="side-box infobox"><h2>' + esc(e.title) + '</h2><table>' + Object.entries(e.infobox).map(([k, v]) => '<tr><th>' + esc(k) + '</th><td>' + inline(v, { order: [] }) + '</td></tr>').join('') + '</table></div>' : '';
        const links = Array.from(backlinks.get(id) || []).map((x) => byId.get(x)).filter(Boolean);
        const side =
            info +
            '<div class="side-box cc0-box"><p><a class="cc0" href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0</a><b>No rights reserved!</b> Copy, change, translate and use this for anything, even commercially, with no credit needed!</p></div>' +
            '<div class="side-box"><div class="actions">' +
            (e.type === 'media' ? '<a class="gel small" href="' + esc(mediaSrc(e)) + '" download="' + esc(e.id + extOf(e)) + '">⬇ Download file</a>' : '') +
            (lite ? '<button class="gel small" id="lite-zip">⬇ Download ZIP</button><a class="gel small green" href="#/new/lite?fork=' + e.id + '" title="Make your own copy to change!">⑂ Fork</a><button class="gel small plain" id="lite-embed">&lt;/&gt; Embed</button>' : '') +
            '<button class="gel small plain" id="cite">❝ Cite</button><button class="gel small plain" id="dl-md">⬇ .kd</button><button class="gel small plain" id="dl-json">⬇ JSON</button><a class="gel small plain" href="#/edit/' + e.id + '">✎ Edit</a>' +
            (e.local ? '<button class="gel small plain" id="del-local">🗑 Remove</button>' : '<a class="gel small plain" href="https://github.com/' + REPO + '/commits/' + BRANCH + '/' + REPO_DIR + '/entries/' + e.id + '.kd" target="_blank" rel="noopener noreferrer">🕘 History</a>') +
            '</div></div>' +
            (lite && lite.files.length > 1 ? '<div class="side-box"><h2>Files</h2><ul class="lite-toc">' + lite.files.map((f, i) => '<li><a href="#lite-file-' + i + '" data-scroll>' + esc(f.name) + '</a></li>').join('') + '</ul></div>' : '') +
            '<div class="side-box"><h2>Tags</h2>' + tagLinks(e.tags) + '<p class="hint" style="margin-top:10px">Created ' + esc(e.created) + (e.updated && e.updated !== e.created ? ' · updated ' + esc(e.updated) : '') + (e.authors && e.type !== 'paper' ? '<br>By ' + esc(e.authors.join(', ')) : '') + '</p></div>' +
            (links.length ? '<div class="side-box"><h2>What links here</h2><ul>' + links.map((l) => '<li><a href="#/e/' + l.id + '">' + esc(l.title) + '</a></li>').join('') + '</ul></div>' : '');
        view.innerHTML = '<div class="entry"><article class="card entry-main">' + top + head + '<div class="kd-doc">' + renderKd(lite ? lite.desc : e.body, e) + '</div>' + (lite ? '<div id="lite-preview" class="lite-preview"></div>' + liteFilesHtml(lite.files) : '') + '</article><aside class="side">' + side + '</aside></div>';
        next(view.querySelector('.entry-main .kd-doc'));
        if (lite) {
            wireLiteButtons(view, lite.files);
            litePreview($('lite-preview'), lite.files, e.preview);
            $('lite-zip').onclick = () => downloadUrl(e.id + '.zip', URL.createObjectURL(zipFiles(lite.files)), true);
            $('lite-embed').onclick = () => {
                const url = location.href.split('#')[0] + '#/embed/' + e.id;
                const code = '<iframe src="' + url + '" title="' + esc(e.title) + '" width="100%" height="420" style="border:0;border-radius:12px"></iframe>';
                modal('Embed “' + e.title + '”', '<p class="hint">Paste this into any web page to show the files there!</p><pre id="embed-code">' + esc(code) + '</pre><button class="gel small plain" data-copy="embed-code">Copy code</button><p class="hint">Or share the link: <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a></p>');
            };
        }
        $('cite').onclick = () => showCite(e);
        $('dl-md').onclick = () => download(e.id + '.kd', toKdFile(e), 'text/plain');
        $('dl-json').onclick = () => download(e.id + '.json', JSON.stringify(clean(e), null, 2), 'application/json');
        if ($('del-local')) $('del-local').onclick = () => {
            if (!confirm('Remove "' + e.title + '" from this device?')) return;
            local = local.filter((x) => x.id !== e.id);
            saveLocal(); reindex();
            toast('Removed from this device!');
            location.hash = '#/mine';
        };
    }
    // #/embed/<id>: just a lite's files (or an entry's text), for an <iframe> on another site
    function pageEmbed(id) {
        const e = byId.get(id);
        document.body.classList.add('odb-embed');
        if (!e) { view.innerHTML = '<div class="card empty">No entry called “' + esc(id) + '”!</div>'; return; }
        const lite = e.type === 'lite' ? liteSplit(e.body) : null;
        const full = location.href.split('#')[0] + '#/e/' + e.id;
        view.innerHTML = '<div class="card lite-embed"><div class="lite-embed-top"><b>' + esc(e.title) + '</b><a href="' + esc(full) + '" target="_blank" rel="noopener">Open in OpenDB ↗</a></div>' +
            (lite ? '<div id="lite-preview" class="lite-preview"></div>' + liteFilesHtml(lite.files) : '<div class="kd-doc">' + renderKd(e.body, e) + '</div>') + '<p class="hint">Public domain (CC0) on OpenDB!</p></div>';
        if (lite) { wireLiteButtons(view, lite.files); litePreview($('lite-preview'), lite.files, e.preview); }
    }
    // Keydown Next (writeout/keydown-next.js): custom @style tags, {{live values}} and ::chart / ::poll / ::quiz / ::timer / ::map / ::scene blocks
    function next(el) { try { if (el && window.KeydownNext) window.KeydownNext.apply(el, { editing: false }); } catch (e) { console.warn('[KeydownNext]', e); } }
    function extOf(e) { const m = /\.([a-z0-9]+)$/i.exec(e.file || ''); return m ? '.' + m[1] : e.ext ? '.' + e.ext : MEDIA_EXT[e.mime] || ''; }
    function clean(e) { const o = Object.assign({}, e); delete o.local; delete o.dataUrl; return o; }

    function showCite(e) {
        const year = String(e.created || today()).slice(0, 4);
        const url = location.href.split('#')[0] + '#/e/' + e.id;
        const authors = (e.authors && e.authors.length ? e.authors : ['OpenDB contributors']);
        const bib = '@' + (e.type === 'paper' ? 'misc' : 'misc') + '{opendb_' + e.id.replace(/-/g, '_') + ',\n  title = {' + e.title + '},\n  author = {' + authors.join(' and ') + '},\n  year = {' + year + '},\n  howpublished = {OpenDB},\n  url = {' + url + '},\n  note = {Public domain (CC0 1.0)' + (e.type === 'paper' ? ', ' + (e.categories || []).join(', ') : '') + '}\n}';
        const apa = authors.join(', ') + ' (' + year + '). ' + e.title + (e.type === 'paper' ? ' [Preprint]' : e.type === 'media' ? ' [' + (e.mime || 'File') + ']' : '') + '. OpenDB. ' + url;
        modal('Cite “' + e.title + '”', '<p class="hint">Citing is a kindness, not a rule: CC0 means no credit is required!</p><b>BibTeX</b><pre id="bib">' + esc(bib) + '</pre><button class="gel small plain" data-copy="bib">Copy BibTeX</button><b>APA style</b><pre id="apa">' + esc(apa) + '</pre><button class="gel small plain" data-copy="apa">Copy APA</button>');
    }

    // Every template, like Wikipedia's template pages, with how many entries use each one
    const TPL_GROUPS = ['Maintenance', 'Hatnotes', 'Inline tags'];
    const tplUsers = (t) => all().filter((e) => templatesIn(e).has(t)).sort((a, b) => a.title.localeCompare(b.title));
    const tplUsage = (t) => t.example || '{{' + t.name + '}}';
    function pageTemplates() {
        document.title = 'Templates - OpenDB';
        view.innerHTML = '<div class="card"><h1 class="page">Templates</h1><p class="muted">Little notices you can add to any entry, like on Wikipedia! Write the name in double curly braces on a line of its own, like <code>{{stub}}</code>, or right after a sentence for the inline tags! Click one to see every entry that has it!</p>' +
            TPL_GROUPS.map((g) => '<h2 class="tpl-group">' + g + '</h2><div class="tpl-list">' + TEMPLATES.filter((t) => t.group === g).map((t) => {
                const n = tplUsers(t).length;
                return '<a class="tpl-row" href="#/template/' + tplSlug(t.name) + '"><code>' + esc(tplUsage(t)) + '</code><span>' + esc(t.hint) + '</span><small>' + n + ' entr' + (n === 1 ? 'y' : 'ies') + '</small></a>';
            }).join('') + '</div>').join('') + '</div>';
    }
    function pageTemplate(name) {
        const t = findTpl(name);
        if (!t) {
            view.innerHTML = '<div class="card empty"><h1 class="page">No template called “' + esc(name) + '”!</h1><p><a href="#/templates">See every template</a>!</p></div>';
            return;
        }
        document.title = '{{' + t.name + '}} - OpenDB';
        const users = tplUsers(t);
        const demo = t.kind === 'inline' ? 'The library holds over a million books.' + tplUsage(t) : tplUsage(t);
        view.innerHTML = '<div class="card"><div class="crumbs"><a href="#/templates">Templates</a> › ' + esc(t.name) + '</div>' +
            '<h1 class="page">{{' + esc(t.name) + '}}</h1><p class="lead">' + esc(t.hint) + '</p>' +
            '<h2 class="tpl-group">How to use it</h2><pre class="tpl-code"><code>' + esc(tplUsage(t)) + '</code></pre>' +
            (t.aliases ? '<p class="hint">These names work too: ' + t.aliases.map((a) => '<code>{{' + esc(a) + '}}</code>').join(' ') + '</p>' : '') +
            '<h2 class="tpl-group">What it looks like</h2><div class="kd-doc tpl-demo">' + renderKd(demo, { type: 'article' }) + '</div>' +
            '<h2 class="tpl-group">Entries with this template (' + users.length + ')</h2>' +
            (users.length ? '<div class="list">' + users.map((e) => itemRow(e)).join('') + '</div>' : '<div class="empty">No entries have it right now!</div>') + '</div>';
    }

    function pageMine() {
        const list = local.slice().sort(byUpdated);
        view.innerHTML = '<div class="card"><h1 class="page">On this device</h1><p class="muted">Entries you saved here but have not published yet! They show up in OpenDB for you right away, and nobody else can see them until they are published!</p>' +
            (list.length ? '<div class="filters"><button class="gel small plain" id="del-all">🗑 Delete All</button></div><div class="list">' + list.map((e) => itemRow(Object.assign({}, e, { local: true }))).join('') + '</div>' : '<div class="empty">Nothing saved on this device! <a href="#/new/article">Write something</a>!</div>') + '</div>';
        if ($('del-all')) $('del-all').onclick = () => {
            if (!confirm('Delete all ' + list.length + ' entr' + (list.length === 1 ? 'y' : 'ies') + ' saved on this device? Published entries are not affected, but this cannot be undone!')) return;
            local = [];
            saveLocal(); reindex();
            toast('Everything on this device was deleted!');
            pageMine();
        };
    }

    /* ---------- Contributing ---------- */
    function slug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
    function yamlStr(v) { const s = String(v); return /^[\[\]"#]|:\s|^\s|\s$/.test(s) || s === '' ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
    function yamlList(a) { return '[' + (a || []).map((x) => String(x).replace(/[,\[\]]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean).join(', ') + ']'; }
    function toKdFile(e) {
        // format: keydown-text tells Writeout and Bitbook this body is Keydown text (their own files hold HTML)!
        const h = ['---', 'format: keydown-text', 'id: ' + e.id, 'type: ' + e.type, 'title: ' + yamlStr(e.title), 'summary: ' + yamlStr(e.summary)];
        if (e.type === 'paper') h.push('abstract: ' + yamlStr(String(e.abstract || '').replace(/\s*\n\s*/g, ' ')));
        h.push('tags: ' + yamlList(e.tags));
        if (e.type === 'paper') h.push('categories: ' + yamlList(e.categories));
        if (e.fork) h.push('fork: ' + e.fork);
        if (e.preview && e.preview !== 'auto') h.push('preview: ' + e.preview);
        h.push('created: ' + e.created, 'updated: ' + (e.updated || e.created), 'authors: ' + yamlList(e.authors), 'license: CC0-1.0');
        if (e.type === 'media') { h.push('file: media/' + e.id + extOf(e), 'mime: ' + (e.mime || '')); if (e.width) h.push('width: ' + e.width, 'height: ' + e.height); if (e.duration) h.push('duration: ' + Math.round(e.duration * 10) / 10); }
        Object.entries(e.infobox || {}).forEach(([k, v]) => h.push('infobox.' + String(k).replace(/[:\n]/g, ' ').trim() + ': ' + yamlStr(String(v).replace(/\n/g, ' '))));
        h.push('---');
        return h.join('\n') + '\n' + String(e.body || '').trim() + '\n';
    }

    function pageEditor(type, params, editId) {
        const base = editId ? byId.get(editId) : null;
        if (editId && !base) { location.hash = '#/new/article?id=' + editId; return; }
        type = base ? base.type : (TYPES[type] ? type : 'article');
        const d = base ? JSON.parse(JSON.stringify(base)) : {
            id: params.get('id') || slug(params.get('title') || ''), type, title: params.get('title') || (params.get('id') ? params.get('id').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) : ''),
            summary: '', body: '', tags: [], authors: [], categories: [], abstract: '', infobox: {}, created: today(),
        };
        // ⑂ Fork: a copy of someone's lite to change and share again (it remembers where it came from)
        const forkOf = !base && params.get('fork') ? byId.get(params.get('fork')) : null;
        if (forkOf && forkOf.type === 'lite') {
            type = 'lite';
            let n = forkOf.id + '-fork', k = 2;
            while (byId.has(n)) n = forkOf.id + '-fork-' + k++;
            Object.assign(d, { id: n, type: 'lite', title: forkOf.title + ' (fork)', summary: forkOf.summary || '', body: forkOf.body || '', tags: (forkOf.tags || []).slice(), fork: forkOf.id });
        }
        let liteFiles = [];
        if (type === 'lite') { const sp = liteSplit(d.body); d.body = sp.desc; liteFiles = sp.files; }
        if (!liteFiles.length) liteFiles = [{ name: '', code: '' }];
        let idTouched = !!(base || params.get('id') || forkOf);
        const infoboxText = Object.entries(d.infobox || {}).map(([k, v]) => k + ': ' + v).join('\n');
        view.innerHTML = '<div class="editor"><div class="card form" id="form">' +
            '<h1 class="page">' + (base ? 'Edit “' + esc(base.title) + '”' : 'Contribute') + '</h1>' +
            (forkOf ? '<p class="hint lite-forked">You are forking <a href="#/e/' + forkOf.id + '">' + esc(forkOf.title) + '</a>: change anything, then save or publish it as your own lite!</p>' : '') +
            (base ? '' : '<div class="seg" id="types">' + Object.keys(TYPES).map((t) => '<button type="button" data-type="' + t + '" class="' + (t === type ? 'on' : '') + '">' + TYPES[t] + '</button>').join('') + '</div>') +
            '<label class="field">Title<input id="f-title" maxlength="140" value="' + esc(d.title) + '"></label>' +
            '<label class="field">Address <small>(lowercase letters, numbers and dashes; this becomes the link #/e/…)</small><input id="f-id" maxlength="60" value="' + esc(d.id) + '"' + (base ? ' disabled' : '') + '></label>' +
            '<label class="field">One-sentence summary<input id="f-summary" maxlength="300" value="' + esc(d.summary) + '"></label>' +
            '<div id="media-fields" hidden><label class="field">File <small>(pictures: PNG, JPEG, SVG, WebP or GIF up to 2 MB; music: MP3, OGG or WAV; videos: MP4, MOV or MKV, up to 20 MB)</small><input id="f-file" type="file" accept="image/*,audio/*,video/*,.mp3,.ogg,.wav,.mp4,.mov,.mkv"></label><p class="hint" id="file-info"></p></div>' +
            '<div id="paper-fields" hidden><label class="field">Abstract<textarea id="f-abstract">' + esc(d.abstract) + '</textarea></label>' +
            '<label class="field">Categories <small>(comma separated, arXiv style like cs.PL, math.NT, q-bio.PE)</small><input id="f-categories" value="' + esc((d.categories || []).join(', ')) + '"></label></div>' +
            '<label class="field">' + (type === 'paper' ? 'Full text' : type === 'media' || type === 'lite' ? 'Description' : 'Article') + ' <small>(<a href="#" id="kd-guide">Keydown</a>: # Heading, ## Subheading, **bold**, *italic*, * list item, #G#chip#, =B=orb=B=, $math$, $$display math$$, [[other-entry]] links, [text](https://example.com) web links, ![caption](media:file-id), footnotes [^1], <a href="#/templates" target="_blank">templates</a> like {{stub}})</small><textarea id="f-body" class="body">' + esc(d.body) + '</textarea></label>' +
            '<div class="actions"><button type="button" class="gel small plain" id="add-math" title="Build an equation with buttons, no LaTeX needed!">Σ Insert math</button><span class="hl-wrap"><button type="button" class="gel small plain" id="add-hl" aria-haspopup="true" aria-expanded="false" title="Highlights and the Bubble Chip cousins, with a preview of every color!">🖍 Highlight</button></span><button type="button" class="gel small plain" id="add-tpl" title="Stub notices, citation needed, file improvement and more!">⚑ Add a template</button><button type="button" class="gel small plain" id="open-file" title="An OpenDB entry, a Writeout document or a Bitbook note!">📂 Open .kd / .kn</button><input type="file" id="f-open" accept=".kd,.kn,.md,.txt" hidden></div>' +
            '<div id="lite-fields" hidden><p class="field-title">Files <small>(code or any text: give each one a name with its ending, like hello.js, style.css or water.gdshader)</small></p><div id="lite-list" class="lite-edit-list"></div>' +
            '<label class="field">Preview <small>(what runs on the lite’s page: a web page, CSS, Svelte, a Python terminal, a Zonerider scene, a Godot shader or Keydown)</small><select id="f-preview">' + PREVIEW_CHOICES.map((c) => '<option value="' + c[0] + '"' + ((d.preview || 'auto') === c[0] ? ' selected' : '') + '>' + c[1] + '</option>').join('') + '</select></label>' +
            '<div class="actions"><button type="button" class="gel small plain" id="lite-add">＋ Add a file</button><button type="button" class="gel small plain" id="lite-open">📂 Add files from this device</button><input type="file" id="lite-pick" multiple hidden></div></div>' +
            '<label class="field">Tags <small>(comma separated)</small><input id="f-tags" value="' + esc((d.tags || []).join(', ')) + '"></label>' +
            '<label class="field">Authors <small>(comma separated; any name you like, or leave it empty)</small><input id="f-authors" value="' + esc((d.authors || []).join(', ')) + '"></label>' +
            '<label class="field">Infobox <small>(optional, one “Label: value” per line)</small><textarea id="f-infobox" style="min-height:70px">' + esc(infoboxText) + '</textarea></label>' +
            '<label class="check"><input type="checkbox" id="f-cc0"><span>I dedicate this ' + (base ? 'change' : 'entry') + ' to the public domain under <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0 1.0</a>, and I made it myself or it is already in the public domain!</span></label>' +
            '<ul class="problems" id="problems"></ul>' +
            '<div class="actions"><button class="gel green" id="save-local">💾 Save on this device</button><button class="gel" id="publish">🌐 Publish for everyone</button><button class="gel plain" id="dl-file">⬇ Download file</button></div>' +
            '<p class="hint">Saving keeps it on this device and shows it in OpenDB for you right away! Publishing proposes it to the public repository, where a maintainer reviews it before everyone can see it!</p>' +
            '</div><div class="card preview-card"><p class="muted" style="margin-bottom:8px">Live preview</p><div id="preview"></div><div id="lite-live" class="lite-preview"></div></div></div>';

        const get = (id) => $(id).value;
        const list = (id) => get(id).split(',').map((s) => s.trim()).filter(Boolean);
        let file = base && base.type === 'media' ? { dataUrl: base.dataUrl || null, mime: base.mime, width: base.width, height: base.height, duration: base.duration, ext: base.ext, file: base.file } : null;
        function current() {
            const info = {};
            get('f-infobox').split('\n').forEach((l) => { const m = /^\s*([^:]+):\s*(.+)$/.exec(l); if (m) info[m[1].trim()] = m[2].trim(); });
            const e = {
                id: get('f-id').trim(), type, title: get('f-title').trim(), summary: get('f-summary').trim(), body: get('f-body'),
                tags: list('f-tags'), authors: list('f-authors'), infobox: info,
                created: d.created || today(), updated: today(), license: 'CC0-1.0',
            };
            if (type === 'paper') { e.abstract = get('f-abstract').trim(); e.categories = list('f-categories'); }
            if (type === 'lite') { e.body = liteJoin(get('f-body'), liteUsed()); if (d.fork) e.fork = d.fork; if (get('f-preview') !== 'auto') e.preview = get('f-preview'); }
            if (type === 'media' && file) Object.assign(e, { mime: file.mime, width: file.width, height: file.height }, file.duration ? { duration: file.duration } : {}, file.ext ? { ext: file.ext } : {}, file.dataUrl ? { dataUrl: file.dataUrl } : {}, file.file ? { file: file.file } : {});
            return e;
        }
        function problems(e, publishing) {
            const p = [];
            if (!e.title) p.push('Add a title!');
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) p.push('The address can only use lowercase letters, numbers and single dashes!');
            else if (!base && byId.has(e.id)) p.push('Another entry already uses the address “' + e.id + '”!');
            if (!e.summary) p.push('Add a one-sentence summary!');
            if (type === 'paper' && !e.abstract) p.push('Papers need an abstract!');
            if (type === 'media' && !(e.dataUrl || e.file)) p.push('Choose a file to share!');
            if (type === 'article' && e.body.trim().length < 40) p.push('Write a little more of the article (at least a couple of sentences)!');
            if (type === 'lite') {
                const fl = liteUsed(), names = new Set();
                if (!fl.length) p.push('Add at least one file!');
                fl.forEach((f) => {
                    const n = f.name.trim();
                    if (!n) p.push('Every file needs a name, like hello.js!');
                    else if (!/^[^\/\\:*?"<>|]+$/.test(n)) p.push('The file name “' + n + '” has a character that file names cannot use!');
                    else if (names.has(n.toLowerCase())) p.push('Two files are called “' + n + '”!');
                    names.add(n.toLowerCase());
                    if (!f.code.trim()) p.push('“' + (n || 'A file') + '” is empty!');
                });
            }
            if (!$('f-cc0').checked) p.push('Tick the public domain (CC0) box: everything in OpenDB is free for everyone!');
            if (publishing && type === 'media' && !e.dataUrl) p.push('Choose the file again so it can be included!');
            return p;
        }
        function preview() {
            const e = current();
            const fake = Object.assign({}, e, { local: true });
            const img = type === 'media' && (e.dataUrl || e.file) ? '<figure class="figure">' + mediaTag(e, e.dataUrl || mediaSrc(e), e.title || '') + '</figure>' : '';
            const head = type === 'paper' ? '<p class="authors">' + esc(e.authors.join(', ')) + '</p>' + (e.abstract ? '<div class="abstract"><b>Abstract</b>' + esc(e.abstract) + '</div>' : '') : '<p class="lead">' + esc(e.summary) + '</p>';
            $('preview').innerHTML = '<h1 class="page">' + esc(e.title || 'Untitled') + badge(fake) + '</h1>' + head + img + '<div class="kd-doc">' + renderKd(type === 'lite' ? get('f-body') : e.body, e) + '</div>' + (type === 'lite' ? liteFilesHtml(liteUsed(), true) : '');
            next($('preview').querySelector('.kd-doc'));
            livePreview();
        }
        function syncType() {
            $('media-fields').hidden = type !== 'media';
            $('paper-fields').hidden = type !== 'paper';
            $('lite-fields').hidden = type !== 'lite';
            if (type === 'lite') drawLite();
            preview();
        }
        // the lite's preview, rebuilt a moment after the files (or the Preview choice) stop changing
        let liveT = 0, liveKey = '';
        function livePreview() {
            clearTimeout(liveT);
            liveT = setTimeout(() => {
                const box = $('lite-live');
                if (!box) return;
                const files = type === 'lite' ? liteUsed().filter((f) => f.name) : [];
                const choice = $('f-preview') ? get('f-preview') : 'auto';
                const key = JSON.stringify([files, choice]);
                if (key === liveKey) return;
                liveKey = key;
                const k = window.LitePreview && files.length ? window.LitePreview.auto(files, choice) : null;
                if (!k) { box.innerHTML = ''; return; }
                window.LitePreview.mount(box, files, k);
            }, 700);
        }
        // Lite files: a name and a box of text each, as many as you like
        function liteUsed() { return liteFiles.filter((f) => f.name.trim() || f.code.trim()).map((f) => ({ name: f.name.trim(), code: f.code })); }
        function drawLite() {
            $('lite-list').innerHTML = liteFiles.map((f, i) => '<div class="lite-edit" data-i="' + i + '"><div class="lite-edit-head"><input class="lite-fname" placeholder="name.ext (like hello.js)" maxlength="80" value="' + esc(f.name) + '" aria-label="File ' + (i + 1) + ' name">' +
                '<span class="lite-lang">' + esc(liteLang(f.name)) + '</span><button type="button" class="gel small plain lite-del"' + (liteFiles.length < 2 ? ' disabled' : '') + ' aria-label="Remove file ' + (i + 1) + '">Remove</button></div>' +
                '<textarea class="lite-fcode" spellcheck="false" aria-label="File ' + (i + 1) + ' contents" placeholder="Paste or type the file here!">' + esc(f.code) + '</textarea></div>').join('');
        }
        $('lite-list').addEventListener('input', (ev) => {
            const row = ev.target.closest('.lite-edit');
            if (!row) return;
            const f = liteFiles[+row.dataset.i];
            if (ev.target.classList.contains('lite-fname')) { f.name = ev.target.value; row.querySelector('.lite-lang').textContent = liteLang(f.name); }
            else if (ev.target.classList.contains('lite-fcode')) f.code = ev.target.value;
        });
        // Tab types a tab in a file (Escape first, then Tab, moves on like everywhere else)
        let liteEsc = false;
        $('lite-list').addEventListener('keydown', (ev) => {
            if (!ev.target.classList.contains('lite-fcode')) return;
            if (ev.key === 'Escape') { liteEsc = true; return; }
            if (ev.key === 'Tab' && !ev.shiftKey && !liteEsc) { ev.preventDefault(); ev.target.setRangeText('\t', ev.target.selectionStart, ev.target.selectionEnd, 'end'); ev.target.dispatchEvent(new Event('input', { bubbles: true })); }
            liteEsc = false;
        });
        $('lite-list').addEventListener('click', (ev) => {
            const b = ev.target.closest('.lite-del');
            if (!b || liteFiles.length < 2) return;
            liteFiles.splice(+b.closest('.lite-edit').dataset.i, 1);
            drawLite(); preview();
        });
        $('lite-add').onclick = () => { liteFiles.push({ name: '', code: '' }); drawLite(); const all = $('lite-list').querySelectorAll('.lite-fname'); all[all.length - 1].focus(); };
        $('lite-open').onclick = () => $('lite-pick').click();
        $('lite-pick').onchange = (ev) => {
            const picked = Array.from(ev.target.files || []);
            ev.target.value = '';
            const big = picked.filter((f) => f.size > 512 * 1024);
            if (big.length) toast(big.map((f) => f.name).join(', ') + ' is over 512 KB, so it was left out!');
            Promise.all(picked.filter((f) => f.size <= 512 * 1024).map((f) => f.text().then((code) => ({ name: f.name, code })))).then((got) => {
                if (!got.length) return;
                if (liteFiles.length === 1 && !liteFiles[0].name && !liteFiles[0].code) liteFiles = [];
                liteFiles = liteFiles.concat(got);
                if (!get('f-title')) { $('f-title').value = got[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '); if (!idTouched) $('f-id').value = slug(get('f-title')); }
                drawLite(); preview();
                toast('Added ' + got.length + ' file' + (got.length === 1 ? '' : 's') + '!');
            });
        };
        $('form').addEventListener('input', (ev) => {
            if (ev.target.id === 'f-title' && !idTouched) $('f-id').value = slug(get('f-title'));
            if (ev.target.id === 'f-id') idTouched = true;
            $('problems').innerHTML = '';
            preview();
        });
        if ($('types')) $('types').onclick = (ev) => {
            const b = ev.target.closest('[data-type]');
            if (!b) return;
            type = b.dataset.type;
            history.replaceState(null, '', '#/new/' + type);
            $('types').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
            $('form').querySelector('#f-body').closest('label').firstChild.textContent = (type === 'paper' ? 'Full text' : type === 'media' || type === 'lite' ? 'Description' : 'Article') + ' ';
            syncType();
        };
        $('f-file').onchange = (ev) => {
            const f = ev.target.files[0];
            if (!f) return;
            const ext = (/\.([a-z0-9]+)$/i.exec(f.name) || [])[1] || '';
            const mime = f.type || EXT_MIME[ext.toLowerCase()] || 'application/octet-stream';
            const kind = mediaKind({ mime: mime, file: f.name });
            if (kind === 'image' && !/^image\//.test(mime)) { toast('Pick a picture, a song (MP3, OGG, WAV) or a video (MP4, MOV, MKV)!'); ev.target.value = ''; return; }
            const limit = kind === 'image' ? 2 : 20;
            if (f.size > limit * 1024 * 1024) { toast('That file is over ' + limit + ' MB! Try a smaller one!'); ev.target.value = ''; return; }
            const done = (extra, info) => {
                file = Object.assign({ dataUrl: playable(r.result), mime: mime, ext: ext.toLowerCase() || undefined }, extra);
                $('file-info').textContent = f.name + ' · ' + (f.size > 1024 * 1024 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB') + (info ? ' · ' + info : '');
                if (!get('f-title')) { $('f-title').value = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '); if (!idTouched) $('f-id').value = slug(get('f-title')); }
                preview();
            };
            // a .mov is usually MP4 inside: Chrome only plays it when it is called MP4 (the file keeps its .mov name)
            const playable = (url) => (mime === 'video/quicktime' ? url.replace(/^data:video\/quicktime/, 'data:video/mp4') : url);
            const r = new FileReader();
            r.onload = () => {
                if (kind === 'image') {
                    const img = new Image();
                    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight }, img.naturalWidth + ' × ' + img.naturalHeight);
                    img.onerror = () => { toast('That file could not be read as an image!'); };
                    img.src = r.result;
                    return;
                }
                // music and videos: read the length (and a video's size) from the file itself
                const el = document.createElement(kind);
                el.preload = 'metadata';
                el.onloadedmetadata = () => {
                    const extra = { duration: isFinite(el.duration) ? Math.round(el.duration * 10) / 10 : undefined };
                    if (kind === 'video' && el.videoWidth) { extra.width = el.videoWidth; extra.height = el.videoHeight; }
                    done(extra, (extra.duration ? clock(extra.duration) : '') + (extra.width ? ' · ' + extra.width + ' × ' + extra.height : ''));
                };
                // some browsers cannot play every format (Safari and MKV, for example): it is still shared, just without its length
                el.onerror = () => { done({}, 'this browser cannot play it, but it can still be shared'); };
                el.src = playable(r.result);
            };
            r.readAsDataURL(f);
        };
        function showProblems(p) { $('problems').innerHTML = p.map((x) => '<li>' + esc(x) + '</li>').join(''); if (p.length) $('problems').scrollIntoView({ block: 'center', behavior: 'smooth' }); return !p.length; }
        $('add-math').onclick = () => {
            if (typeof window.kdMathBox !== 'function') { toast('The equation box could not load!'); return; }
            const box = $('f-body');
            const s0 = box.selectionStart, s1 = box.selectionEnd;
            window.kdMathBox({ display: false, onDone: (tex, display) => {
                const piece = display ? '\n$$' + tex + '$$\n' : '$' + tex + '$';
                box.setRangeText(piece, s0, s1, 'end');
                box.focus();
                preview();
            } });
        };
        // Open any .kd or .kn file: OpenDB entries, Writeout documents and Bitbook notes all fill the form!
        $('open-file').onclick = () => $('f-open').click();
        $('f-open').onchange = (ev) => {
            const f = ev.target.files[0];
            ev.target.value = '';
            if (!f) return;
            if (!window.kdDoc) { toast('The file reader could not load!'); return; }
            f.text().then((text) => {
                const x = window.kdDoc.toEntry(text);
                if (!base && TYPES[x.type] && x.type !== type && $('types')) $('types').querySelector('[data-type="' + x.type + '"]').click();
                const set = (id, v) => { if (v !== undefined && v !== null && v !== '') $(id).value = Array.isArray(v) ? v.join(', ') : String(v); };
                set('f-title', x.title);
                if (!base && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(x.id || ''))) { $('f-id').value = x.id; idTouched = true; }
                else if (!base && !idTouched && x.title) $('f-id').value = slug(x.title);
                set('f-summary', x.summary);
                set('f-body', x.body);
                set('f-tags', x.tags);
                set('f-authors', x.authors);
                if (type === 'paper') { set('f-abstract', x.abstract); set('f-categories', x.categories); }
                if (x.infobox && Object.keys(x.infobox).length) $('f-infobox').value = Object.entries(x.infobox).map(([k, v]) => k + ': ' + v).join('\n');
                $('problems').innerHTML = '';
                preview();
                toast('Opened ' + f.name + '!');
            }, () => toast('That file could not be read!'));
        };
        // Highlight: every Annotate style that Keydown can write, and the Bubble Chip cousins, each in a dropdown of its colors
        $('add-hl').onclick = (ev) => {
            ev.stopPropagation();
            const old = document.getElementById('hl-pop');
            if (old) { closeHl(); return; }
            const box = $('f-body');
            const s0 = box.selectionStart, s1 = box.selectionEnd;
            const pop = document.createElement('div');
            pop.id = 'hl-pop';
            pop.className = 'hl-pop';
            pop.setAttribute('role', 'dialog');
            pop.setAttribute('aria-label', 'Highlights and chips');
            const groups = hlGroups();
            pop.innerHTML = '<p class="hint">Pick a style, then a color! It wraps the text you selected (or adds a sample to change)!</p>' + groups.map((g) =>
                '<div class="hl-group"><b>' + esc(g.name) + '</b>' + g.cats.map((c, ci) =>
                    '<details class="hl-cat"><summary><span class="hl-cat-name">' + esc(c.name) + '</span><span class="hl-cat-peek" aria-hidden="true">' + hlPreview(c.items[Math.min(c.items.length - 1, 9)]) + '</span></summary>'
                    + '<div class="hl-colors">' + c.items.map((d) => '<button type="button" class="hl-color" data-o="' + esc(d.o) + '" data-c="' + esc(d.c) + '" title="' + esc(c.name + ': ' + hlColor(d)) + '">' + hlPreview(d) + '</button>').join('') + '</div></details>').join('') + '</div>').join('');
            $('add-hl').parentElement.appendChild(pop);
            $('add-hl').setAttribute('aria-expanded', 'true');
            pop.onclick = (e) => {
                e.stopPropagation();
                const b = e.target.closest('.hl-color');
                if (!b) return;
                const picked = box.value.slice(s0, s1);
                const inner = picked || hlColor({ o: b.dataset.o });
                box.setRangeText(b.dataset.o + inner + b.dataset.c, s0, s1, 'end');
                box.focus();
                box.setSelectionRange(s0 + b.dataset.o.length, s0 + b.dataset.o.length + inner.length);
                closeHl();
                preview();
            };
        };
        function closeHl() {
            const pop = document.getElementById('hl-pop');
            if (pop) pop.remove();
            if ($('add-hl')) $('add-hl').setAttribute('aria-expanded', 'false');
        }
        document.addEventListener('click', (e) => { if (!e.target.closest || !e.target.closest('#hl-pop')) closeHl(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('hl-pop')) { closeHl(); $('add-hl').focus(); } });
        // Templates: maintenance boxes go at the top, the stub note at the bottom, the rest where the cursor is
        $('add-tpl').onclick = () => {
            const box = $('f-body');
            const s0 = box.selectionStart, s1 = box.selectionEnd;
            modal('Add a template', '<p class="hint">Pick a notice to add to this ' + ({ article: 'article', media: 'file', paper: 'paper', lite: 'lite' }[type]) + '! Things after a <code>|</code> are details you can change!</p>' +
                TPL_GROUPS.map((g) => '<b class="tpl-pick-group">' + g + '</b><div class="tpl-picks">' + TEMPLATES.filter((t) => t.group === g).map((t) =>
                    '<button type="button" class="tpl-pick" data-tpl="' + esc(t.name) + '"><code>' + esc(tplUsage(t)) + '</code><span>' + esc(t.hint) + '</span></button>').join('') + '</div>').join(''));
            $('modal-body').onclick = (ev) => {
                const b = ev.target.closest('[data-tpl]');
                if (!b) return;
                const t = findTpl(b.dataset.tpl);
                const text = tplUsage(t);
                const v = box.value;
                if (t.kind === 'inline') {
                    box.setRangeText(text, s0, s1, 'end');
                } else if (t.where === 'end') {
                    box.value = v.replace(/\s+$/, '') + (v.trim() ? '\n\n' : '') + text + '\n';
                } else if (t.kind === 'hatnote' || t.name === 'expand') {
                    const before = v.slice(0, s0), after = v.slice(s1);
                    box.setRangeText((before && !before.endsWith('\n') ? '\n' : '') + text + (after.startsWith('\n') ? '' : '\n'), s0, s1, 'end');
                } else {
                    box.value = text + '\n' + (v && !/^\{\{/.test(v) ? '\n' : '') + v;
                }
                $('modal').hidden = true;
                box.focus();
                preview();
            };
        };
        $('kd-guide').onclick = (ev) => {
            ev.preventDefault();
            modal('Keydown guide', typeof window.kdBuildGuideHTML === 'function' ? '<p class="hint">Keydown is the formatting language of Radii Office! Wrap text in a trigger to style it! OpenDB adds $LaTeX$ math, [[wiki links]], media and footnotes on top!</p><div class="kd-doc">' + EXTRAS_GUIDE() + window.kdBuildGuideHTML() + '</div>' : 'The Keydown guide could not load!');
        };
        $('save-local').onclick = () => {
            const e = current();
            if (!showProblems(problems(e, false))) return;
            if (e.dataUrl && e.dataUrl.length > 3500000) { toast('That file is too big to keep on this device! Publish it or download it instead!'); return; }
            local = local.filter((x) => x.id !== e.id).concat([e]);
            if (!saveLocal()) return;
            reindex();
            toast('Saved on this device!');
            location.hash = '#/e/' + e.id;
        };
        $('dl-file').onclick = () => {
            const e = current();
            if (!showProblems(problems(e, false))) return;
            download(e.id + '.kd', toKdFile(e), 'text/plain');
            if (e.dataUrl) downloadUrl(e.id + extOf(e), e.dataUrl);
        };
        $('publish').onclick = () => {
            const e = current();
            if (!showProblems(problems(e, true))) return;
            publish(e, !!base && !base.local);
        };
        syncType();
    }

    // Publishing: GitHub opens with the new file filled in, ready to propose as a change!
    function publish(e, existing) {
        const md = toKdFile(e);
        const entriesUrl = 'https://github.com/' + REPO + '/new/' + BRANCH + '/' + REPO_DIR + '/entries?filename=' + encodeURIComponent(e.id + '.kd') + '&value=' + encodeURIComponent(md);
        const editUrl = 'https://github.com/' + REPO + '/edit/' + BRANCH + '/' + REPO_DIR + '/entries/' + e.id + '.kd';
        const uploadMedia = 'https://github.com/' + REPO + '/upload/' + BRANCH + '/' + REPO_DIR + '/media';
        const uploadEntries = 'https://github.com/' + REPO + '/upload/' + BRANCH + '/' + REPO_DIR + '/entries';
        const short = entriesUrl.length < 7500;
        let steps;
        if (existing) {
            steps = '<ol><li>Your new version is copied below (and to your clipboard)!</li><li><a href="' + editUrl + '" target="_blank" rel="noopener noreferrer">Open the entry on GitHub</a>, select everything in the editor and paste!</li><li>Choose “Propose changes”. A maintainer reviews it, and then it is live for everyone!</li></ol>';
            copy(md);
        } else if (e.type === 'media') {
            download(e.id + '.kd', md, 'text/plain');
            downloadUrl(e.id + extOf(e), e.dataUrl);
            steps = '<ol><li>Two files were downloaded: <b>' + esc(e.id + extOf(e)) + '</b> (the file) and <b>' + esc(e.id) + '.kd</b> (its description)!</li><li><a href="' + uploadMedia + '" target="_blank" rel="noopener noreferrer">Upload ' + esc(e.id + extOf(e)) + ' to the media folder</a> and choose “Propose changes”!</li><li>Then <a href="' + uploadEntries + '" target="_blank" rel="noopener noreferrer">upload ' + esc(e.id) + '.kd to the entries folder</a> the same way!</li></ol>';
        } else if (short) {
            window.open(entriesUrl, '_blank', 'noopener');
            steps = '<ol><li>GitHub opened in a new tab with your entry already filled in! (<a href="' + entriesUrl + '" target="_blank" rel="noopener noreferrer">Open it again</a>)</li><li>Sign in if asked, then choose “Propose changes”!</li><li>A maintainer reviews it, and then it is live for everyone!</li></ol>';
        } else {
            download(e.id + '.kd', md, 'text/plain');
            steps = '<ol><li>Your entry is long, so it was downloaded as <b>' + esc(e.id) + '.kd</b>!</li><li><a href="' + uploadEntries + '" target="_blank" rel="noopener noreferrer">Upload it to the entries folder on GitHub</a> and choose “Propose changes”!</li></ol>';
        }
        local = local.filter((x) => x.id !== e.id).concat([e]);
        saveLocal();
        reindex();
        modal('Publish “' + e.title + '”', '<p>Thank you for giving this to everyone!</p>' + steps + '<p class="hint">It is also saved on this device, so you can see it right away! You need a free GitHub account to propose changes!</p><b>The entry file</b><pre id="md-out">' + esc(md) + '</pre><button class="gel small plain" data-copy="md-out">Copy file</button>');
    }

    /* ---------- Helpers ---------- */
    function download(name, text, type) { downloadUrl(name, URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })), true); }
    function downloadUrl(name, url, revoke) {
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    function copy(text) { try { navigator.clipboard.writeText(text).then(() => toast('Copied!'), () => {}); } catch (e) { /* the text is shown to copy by hand */ } }
    function modal(title, html) {
        $('modal-title').textContent = title;
        $('modal-body').innerHTML = html;
        $('modal').hidden = false;
    }
    $('modal-x').onclick = () => { $('modal').hidden = true; };
    $('modal').onclick = (ev) => {
        if (ev.target.id === 'modal') $('modal').hidden = true;
        const c = ev.target.closest('[data-copy]');
        if (c) copy($(c.dataset.copy).textContent);
    };
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') $('modal').hidden = true; });
    let toastT = null;
    function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

    /* ---------- Router ---------- */
    function route() {
        const raw = location.hash.replace(/^#\/?/, '');
        const [pathPart, query] = raw.split('?');
        const parts = pathPart.split('/').map(decodeURIComponent);
        const params = new URLSearchParams(query || '');
        document.title = 'OpenDB - Radii Office';
        document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#/' + parts.slice(0, 2).join('/')));
        if (loadError && !all().length) {
            view.innerHTML = '<div class="card empty"><h1 class="page">OpenDB could not load its data!</h1><p>' + esc(loadError) + '</p></div>';
            return;
        }
        if (parts[0] !== 'embed') document.body.classList.remove('odb-embed');
        switch (parts[0]) {
            case '': pageHome(); break;
            case 'embed': pageEmbed(parts[1] || ''); return;
            case 'browse': TYPES[parts[1]] ? pageBrowse(parts[1], params) : pageHome(); break;
            case 'e': pageEntry(parts[1] || ''); break;
            case 'tag': pageTag(parts[1] || ''); break;
            case 'search': pageSearch(parts.slice(1).join('/')); break;
            case 'new': pageEditor(parts[1], params, null); break;
            case 'edit': pageEditor(null, params, parts[1]); break;
            case 'mine': pageMine(); break;
            case 'templates': pageTemplates(); break;
            case 'template': pageTemplate(parts[1] || ''); break;
            case 'random': {
                const list = all();
                if (list.length) location.replace('#/e/' + list[Math.floor(Math.random() * list.length)].id);
                return;
            }
            default: pageEntry(parts[0]);
        }
        if (parts[0] !== 'search') $('q').value = '';
        window.scrollTo(0, 0);
    }
    // footnote links jump inside the page without changing the route
    view.addEventListener('click', (ev) => {
        const a = ev.target.closest('a[data-scroll]');
        if (!a) return;
        ev.preventDefault();
        const t = document.getElementById(a.getAttribute('href').slice(1));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('search-form').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const q = $('q').value.trim();
        if (q) location.hash = '#/search/' + encodeURIComponent(q);
    });
    let liveT = null;
    $('q').addEventListener('input', () => {
        clearTimeout(liveT);
        liveT = setTimeout(() => { const q = $('q').value.trim(); if (q.length > 1) history.replaceState(null, '', '#/search/' + encodeURIComponent(q)), pageSearch(q); }, 180);
    });
    window.addEventListener('hashchange', route);

    /* ---------- Start ---------- */
    loadLocal();
    fetch('data/index.json', { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error('data/index.json answered ' + r.status); return r.json(); })
        .then((data) => { shared = Array.isArray(data.entries) ? data.entries : []; })
        .catch((e) => { loadError = (location.protocol === 'file:' ? 'Browsers block reading files on file:// pages, so open OpenDB through a web server! ' : '') + e.message; })
        .then(() => { reindex(); route(); });

    window.OpenDB = { search: (q) => search(q).map((r) => r.e.id), entries: () => all(), toKdFile, renderKd };
})();
