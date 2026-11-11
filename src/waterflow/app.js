/* Waterflow! A clear, glassy notebook. Notes live in this browser (IndexedDB), are written in Keydown,
   and are edited live with Keydown.js (keydown-engine.js), the same engine as Writeout and Bitbook. */
(function () {
    'use strict';
    const KD = window.Keydown;
    const $ = (id) => document.getElementById(id);
    const body = document.body;
    if (!KD) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:30px">Waterflow could not load its Keydown engine. Reload the page!</p>'); return; }

    /* ---------- small helpers ---------- */
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const LS = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)); } catch (e) { return null; } };
    const ICON = {
        pin: '<svg viewBox="0 0 24 24"><path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/></svg>',
        all: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
        star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
        day: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
        scratch: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg>',
        trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
        book: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
        plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
        more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>'
    };
    // Poolside colors: foam, cyan, blue, deep blue, sun and orange (nothing else)
    const COLORS = ['', '#5fd8f7', '#18bfe8', '#1b7fe0', '#0b3f9a', '#ffb35c', '#ff8a1b'];
    const OLD_COLOR = { '#36cdee': '#1b7fe0', '#2fc26a': '#18bfe8', '#e5484d': '#ffb35c', '#a855f7': '#0b3f9a', '#ec4899': '#5fd8f7', '#14b8a6': '#5fd8f7' };
    let toastT = 0;
    function toast(msg) {
        const t = $('wf-toast'); t.textContent = msg; t.hidden = false;
        clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
    }
    const when = (ts) => {
        const d = new Date(ts), n = new Date();
        const same = d.toDateString() === n.toDateString();
        if (same) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const days = Math.floor((n - d) / 864e5);
        if (days < 7 && days >= 0) return d.toLocaleDateString([], { weekday: 'short' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' });
    };
    const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    /* ---------- Poolside Keydown (PK): a note is written in PK or in Classic Keydown ('kd') ---------- */
    const PKX = window.PK;
    const isPK = (n) => !!n && n.lang === 'pk' && !!PKX;
    const BL = () => window.BitLang;
    const playing = () => !!document.querySelector('#wf-stage .bl-view');   // a BitLang program has taken over the note: nothing of it is saved
    const kdOf = (n) => (isPK(n) ? PKX.toKD(n.text || '') : (n.text || ''));        // the Keydown the engine draws
    const keep = (n, kd) => (isPK(n) ? PKX.toPK(kd) : kd);                             // what a note stores, from drawn Keydown
    const newLang = () => (S.kd === 'classic' || !PKX ? 'kd' : 'pk');

    /* ---------- settings ---------- */
    const DEF = { theme: 'day', kd: 'poolside', width: 780, bubbles: true, sound: false, spell: true, outline: true, mode: 'visual' };
    let S = Object.assign({}, DEF);
    try { Object.assign(S, JSON.parse(LS('waterflow2_settings') || '{}')); } catch (e) {}
    function skin() { body.dataset.kd = cur ? (isPK(cur) ? 'poolside' : 'classic') : (S.kd === 'classic' ? 'classic' : 'poolside'); }
    function applySettings() {
        body.dataset.theme = S.theme;
        skin();
        document.documentElement.style.setProperty('--doc-w', S.width + 'px');
        body.classList.toggle('wf-nobubbles', !S.bubbles);
        body.classList.toggle('wf-noside', !S.outline);
        $('wf-visual').setAttribute('spellcheck', S.spell ? 'true' : 'false');
        const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = S.theme === 'night' ? '#0a2540' : S.theme === 'sand' ? '#ff9f43' : '#36cdee';
        LS('waterflow2_settings', JSON.stringify(S));
    }
    // a soft water-drop blip on gel buttons (off unless you turn sounds on)
    let actx = null;
    function blip() {
        if (!S.sound) return;
        try {
            actx = actx || new (window.AudioContext || window.webkitAudioContext)();
            const o = actx.createOscillator(), g = actx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(880, actx.currentTime); o.frequency.exponentialRampToValueAtTime(520, actx.currentTime + 0.09);
            g.gain.setValueAtTime(0.05, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.12);
            o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.13);
        } catch (e) {}
    }
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.wf-gel, .wf-st, .wf-modes button')) blip(); });

    /* ---------- storage: IndexedDB, with localStorage as the fallback ---------- */
    const store = (function () {
        let db = null;
        const open = () => new Promise((res) => {
            try {
                const r = indexedDB.open('waterflow2', 1);
                r.onupgradeneeded = () => { r.result.createObjectStore('notes', { keyPath: 'id' }); };
                r.onsuccess = () => { db = r.result; res(true); };
                r.onerror = () => res(false);
            } catch (e) { res(false); }
        });
        const lsAll = () => { try { return JSON.parse(LS('waterflow2_notes_ls') || '[]'); } catch (e) { return []; } };
        let ready = null, usingLS = false, mem = null;
        const init = () => ready || (ready = open().then((ok) => { usingLS = !ok; }));
        return {
            async all() {
                await init();
                if (usingLS) { mem = lsAll(); return mem.slice(); }
                return new Promise((res) => { const q = db.transaction('notes').objectStore('notes').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); });
            },
            async put(n) {
                await init();
                if (usingLS) { mem = mem || lsAll(); const i = mem.findIndex((x) => x.id === n.id); if (i < 0) mem.push(n); else mem[i] = n; LS('waterflow2_notes_ls', JSON.stringify(mem)); return; }
                return new Promise((res) => { const t = db.transaction('notes', 'readwrite'); t.objectStore('notes').put(n); t.oncomplete = () => res(); t.onerror = () => res(); });
            },
            async del(id) {
                await init();
                if (usingLS) { mem = (mem || lsAll()).filter((x) => x.id !== id); LS('waterflow2_notes_ls', JSON.stringify(mem)); return; }
                return new Promise((res) => { const t = db.transaction('notes', 'readwrite'); t.objectStore('notes').delete(id); t.oncomplete = () => res(); t.onerror = () => res(); });
            }
        };
    })();

    /* ---------- state ---------- */
    let notes = [], nbs = [], cur = null;
    let stream = { kind: 'all' };
    let mode = 'visual';
    let ed = null;
    let scratch = null;
    try { nbs = JSON.parse(LS('waterflow2_nbs') || '[]'); } catch (e) { nbs = []; }
    const saveNbs = () => LS('waterflow2_nbs', JSON.stringify(nbs));
    function loadScratch() {
        let t = ''; try { t = sessionStorage.getItem('waterflow2_scratch'); } catch (e) {}
        scratch = { id: 'scratch', scratch: true, title: 'Scratch', text: t === null || t === undefined ? '# Scratch\nA one-time table: everything here is wiped when you close Waterflow. Use it for quick thoughts that do not need a home!' : t, nb: '', tags: [], pinned: false, color: '', created: Date.now(), updated: Date.now(), trashed: 0 };
    }
    function blank(extra) { return Object.assign({ id: uid(), lang: newLang(), title: '', text: '', nb: '', tags: [], pinned: false, color: '', created: Date.now(), updated: Date.now(), trashed: 0 }, extra || {}); }

    /* ---------- saving ---------- */
    const dirty = new Set();
    let saveT = 0;
    function touch(n) {
        n.updated = Date.now();
        if (n.scratch) { try { sessionStorage.setItem('waterflow2_scratch', n.text); } catch (e) {} setSaved(); return; }
        dirty.add(n.id);
        $('wf-saved').textContent = 'Saving'; $('wf-saved').classList.add('busy');
        clearTimeout(saveT);
        saveT = setTimeout(flush, 450);
    }
    async function flush() {
        const ids = Array.from(dirty); dirty.clear();
        for (const id of ids) { const n = notes.find((x) => x.id === id); if (n) await store.put(n); }
        setSaved(); meter();
    }
    function setSaved() { $('wf-saved').textContent = 'Saved'; $('wf-saved').classList.remove('busy'); }
    window.addEventListener('pagehide', () => { if (dirty.size) { const ids = Array.from(dirty); dirty.clear(); ids.forEach((id) => { const n = notes.find((x) => x.id === id); if (n) store.put(n); }); } });

    /* ---------- the Keydown highlighter (Monokai), the same one the Source mode of Writeout and Bitbook uses ---------- */
    const escH = function (t) { return String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
    const sp = function (cls, t) { return '<span class="' + cls + '">' + escH(t) + '</span>'; };
    // chip and tag marks: ++R+ ++ ;;R; !!#R# #R# ##  ~X~ =R= ^^R^ %R% &&  *sp(  @family-1@  and friends
    const MARKS = '\\{(?:bar|mark|tip)(?:\\s+[#\\w-]+)*(?:\\|[^{}\\n]*)?\\}|\\{/?(?:sc|dots|dim|tip)\\}|\\+\\+[A-Z]{1,2}[+~!%?*:^=/\\-@;#&.,_]|;;[A-Z]{1,2}[;:~]|!!?[#^~=+%:;\\-?/*@!][A-Z]{1,2}[#!]?|[!?]{2}[A-Z]{1,2}[!?]|#[A-Z]{1,2}#(?:[_~=.][a-z]*)?|~[A-Z][A-Z0-9-]*~|=[A-Z]{1,2}=|\\^\\^[A-Z]{1,2}\\^|%[A-Z]{1,2}%|%\\d{1,2}%[A-Z]{1,2}%|&&|@[a-z0-9]+(?:-[1-5])?@|##|#_|#~|#=|#\\]|#-|#\\[\\[|#\\[|#>|\\+\\+|;;|\\^\\^|!!|\\?\\?|\\*>|\\+>';
    const INLINE = new RegExp('(`[^`\\n]+`(?:\\{[A-Za-z0-9|-]+\\})?)|(\\$\\$[^$\\n]+\\$\\$|\\$[^$\\n]+\\$)|(\\[\\[[^\\]\\n]+\\]\\]|\\[[^\\]\\n]+\\]\\([^)\\n]+\\))|(\\*\\*[^*\\n]+\\*\\*)|(\\{\\{[^{}\\n]*\\}\\}|\\[\\^[^\\]\\n]+\\]|\\{align=[a-z]+\\})|(#[A-Z]{1,2}(?:\\.[a-z]+)?\\(|\\*sp\\(|#[%^+:;][A-Z]{1,2}[%^+:;]|!!?[#^~=+%:;\\-?/*@!][A-Z]{1,2}#)|(' + MARKS + ')|(\\*[^*\\s][^*\\n]*\\*)|(⟪…[^⟫\\n]*⟫)|(\\[(?:__|##)\\d+(?:\\|[^\\]\\n]*)?\\])', 'g');
    // (bold, italic and the (...) forms hold more Keydown inside them, so their insides are colored too)
    function hlInline(t) {
        let out = '', last = 0, m;
        const re = new RegExp(INLINE.source, 'g');   // (its own copy: the insides are colored by calling this again)
        while ((m = re.exec(t))) {
            if (m.index > last) out += escH(t.slice(last, m.index));
            let end = m.index + m[0].length;
            if (m[4]) out += '<span class="m-b">**' + hlInline(m[0].slice(2, -2)) + '**</span>';
            else if (m[8]) out += '<span class="m-i">*' + hlInline(m[0].slice(1, -1)) + '*</span>';
            else if (m[6]) {
                // a name( ... ): the closing ) is the one that matches, counting any ( ) inside
                let depth = 1, i = end;
                const paren = m[0].charAt(m[0].length - 1) === '(';
                const closer = paren ? ')' : m[0].charAt(m[0].length - 1);   // (#:G:text: and its cousins end with the same mark that opened them)
                if (paren) { while (i < t.length && depth > 0) { if (t.charAt(i) === '(') depth++; else if (t.charAt(i) === ')') depth--; i++; } }
                else {
                    depth = 1;
                    while (i < t.length) {
                        const ch = t.charAt(i);
                        if (ch === '$') { const z = t.indexOf('$', i + 1); if (z > 0) { i = z + 1; continue; } }   // (math inside can hold the mark)
                        if (ch === closer) { depth = 0; i++; break; }
                        i++;
                    }
                }
                if (depth === 0) { out += sp('m-n', m[0]) + hlInline(t.slice(end, i - 1)) + sp('m-n', closer); end = i; re.lastIndex = i; }
                else out += sp('m-n', m[0]);
            } else out += sp(m[10] ? 'm-p' : m[9] ? 'm-f' : m[1] ? 'm-s' : m[2] ? 'm-t' : m[3] ? 'm-l' : m[5] ? 'm-p' : 'm-n', m[0]);
            last = end;
            if (m[0].length === 0) re.lastIndex++;
            else if (end !== m.index + m[0].length) re.lastIndex = end;
        }
        return out + escH(t.slice(last));
    }
    const CODE_RE = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b(fn|var|temp|if|elif|else|while|for|in|return|break|continue|and|or|not|true|false|null)\b|\b([A-Za-z_]\w*)(?=\()/g;
    function hlCode(t) {
        let out = '', last = 0, m;
        CODE_RE.lastIndex = 0;
        while ((m = CODE_RE.exec(t))) {
            if (m.index > last) out += escH(t.slice(last, m.index));
            out += sp(m[1] ? 'm-c' : m[2] ? 'm-s' : m[3] ? 'm-n' : m[4] ? 'm-k' : 'm-h', m[0]);
            last = m.index + m[0].length;
        }
        return out + escH(t.slice(last));
    }
    const PH = /⟪…[^⟫\n]*⟫/;
    function hlLines(text) {
        let fence = false;
        return String(text).split('\n').map(function (line) {
            let m;
            if (/^\s*⟪…[^⟫\n]*⟫\s*$/.test(line)) return sp('m-f', line);
            if (!fence && (m = /^(@@[a-z]+)(=?)("[^"]*")?(```)\s*$/.exec(line.trim()))) { fence = true; return sp('m-k', m[1]) + escH(m[2]) + (m[3] ? sp('m-s', m[3]) : '') + sp('m-p', m[4]); }
            if ((m = /^(\s*```)([A-Za-z0-9_+#.-]*)(\{[^}]*\})?\s*$/.exec(line)) && !fence && (m[2] || m[3])) { fence = true; return sp('m-p', m[1]) + (m[2] ? sp('m-k', m[2]) : '') + (m[3] ? sp('m-s', m[3]) : ''); }
            if (/^\s*```/.test(line)) { fence = !fence; return sp('m-p', line); }
            if (fence) return hlCode(line);
            if ((m = /^(\|+)(.*)$/.exec(line)) && !/^\|.*\|(\{[a-z]+\})?\s*$/.test(line)) return sp('m-d', m[1]) + highlight(m[2]);
            if (/^\s*([-*_=])\1{2,}\s*$/.test(line)) return sp('m-d', line);
            if ((m = /^(\s*)(#{1,4})(\s+)(.*)$/.exec(line))) return escH(m[1]) + sp('m-h', m[2] + m[3]) + '<span class="m-h">' + hlInline(m[4]) + '</span>';
            if ((m = /^(\s*)(!>|\?>|>>|%>|\*>|\+>|->|=>|~>|\$>|#>|\^>|@>|&>|>)(\s+)(.*)$/.exec(line))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + hlInline(m[4]);
            if ((m = /^(\s*)([*+\-.~=])(\s+)(.*)$/.exec(line))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + hlInline(m[4]);
            if ((m = /^(::[a-z]+)(\{[^}]*\})?(.*)$/.exec(line))) return sp('m-k', m[1]) + (m[2] ? sp('m-p', m[2]) : '') + hlInline(m[3]);
            if ((m = /^(@@[a-z]+)(=")(.*)(")\s*$/.exec(line))) return sp('m-k', m[1]) + escH(m[2]) + sp('m-s', m[3]) + escH(m[4]);
            if (/^\|.*\|(\{[a-z]+\})?\s*$/.test(line)) return line.split('|').map(function (c, i, a) { return hlInline(c); }).join(sp('m-k', '|'));
            return hlInline(line);
        });
    }
    function highlight(text) { return hlLines(text).join('\n'); }

    /* ---------- Poolside Keydown in the Source box ---------- */
    const PK_IN = window.PK ? new RegExp('<(' + window.PK.NAMES.join('|') + (window.PK.PSL_SET && window.PK.PSL_SET.size ? '|(?:' + Array.from(window.PK.PSL_SET).join('|') + ')-[1-5]' : '') + ')\\s([^<>\\n]+)>', 'g') : /$^/g;
    // Poolside chips are set aside as markers, the rest is colored as Keydown, then the chips are colored and put back
    function withHold(t, color) {
        const hold = []; let s = t, prev;
        do { prev = s; s = s.replace(PK_IN, (all, name, body) => { hold.push([name, body]); return '\uE100' + (hold.length - 1) + '\uE101'; }); } while (s !== prev);
        const fill = (str) => str.replace(/\uE100(\d+)\uE101/g, (m, i) => sp('m-p', '<' + hold[i][0] + ' ') + fill(hlInline(hold[i][1])) + sp('m-p', '>'));
        return fill(color(s));
    }
    function highlightPK(text) {
        let fence = false;
        return String(text).split('\n').map((l) => {
            let m;
            if (/^\s*```/.test(l)) { fence = !fence; return hlLines(l)[0]; }
            if (fence) return hlCode(l);
            if ((m = /^(\s*)(\/{1,4})(\s+)(.*)$/.exec(l))) return escH(m[1]) + sp('m-h', m[2] + m[3]) + '<span class="m-h">' + withHold(m[4], hlInline) + '</span>';
            if ((m = /^(\s*)(<[<>:!?%*+\-=~$#^@&])(\s)(.*)$/.exec(l))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + withHold(m[4], hlInline);
            if ((m = /^(\s*)(\([+.~=*]?\))(\s)(.*)$/.exec(l))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + withHold(m[4], hlInline);
            if ((m = /^(\s*)(\/~)(\s+)(.*)$/.exec(l))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + sp('m-p', m[4]);
            if ((m = /^(\s*)(\(_)(\s+)(.*?)(\s+)(_\))\s*$/.exec(l))) return escH(m[1]) + sp('m-k', m[2]) + escH(m[3]) + sp('m-p', m[4]) + escH(m[5]) + sp('m-k', m[6]);
            return withHold(l, (x) => hlLines(x)[0]);
        }).join('\n');
    }
    // typing in Visual: a line written with Poolside marks becomes Keydown the moment Enter or Space is pressed, so the editor formats it
    function pkLive(onlyIfChanged) {
        if (!isPK(cur) || mode !== 'visual') return false;
        const sel = window.getSelection(); if (!sel.rangeCount || !sel.isCollapsed) return false;
        const root = $('wf-visual'); let b = sel.anchorNode;
        while (b && b.parentNode !== root) b = b.parentNode;
        if (!b || b.nodeType !== 1 || /^(H[1-6]|UL|OL|TABLE|PRE|BLOCKQUOTE)$/.test(b.tagName)) return false;
        if (b.children.length && Array.from(b.children).some((c) => c.tagName !== 'BR')) {
            // a line that already holds a chip or a bold word: only the plain text just typed after it is translated
            const n = sel.anchorNode;
            if (!n || n.nodeType !== 3 || n.parentNode !== b || sel.anchorOffset !== n.nodeValue.length) return false;
            const t = n.nodeValue.replace(/\u00a0/g, ' ');
            const k = PKX.toKD('x' + t).slice(1);
            if (k === t) return false;
            n.nodeValue = k.replace(/ $/, '\u00a0');
            const r2 = document.createRange(); r2.setStart(n, n.nodeValue.length); r2.collapse(true); sel.removeAllRanges(); sel.addRange(r2);
            return true;
        }
        const txt = b.textContent.replace(/\u00a0/g, ' ');
        const kd = PKX.toKD(txt);
        if (kd === txt) return false;
        b.textContent = kd.replace(/ $/, '\u00a0');   // (a plain space at the end would collapse, and the next letter would stick to the mark)
        const r = document.createRange(); r.selectNodeContents(b); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
        return true;
    }

    /* ---------- text helpers ---------- */
    const plain = (t) => String(t || '').replace(/^\s*(\/{1,4}|<[<>:!?%*+\-=~$#^@&]|\([+.~=*]?\)|\/~)\s/gm, ' ').replace(/<[a-z]+\s/g, ' ').replace(/^::[a-z]+.*$/gm, ' ').replace(/```[^\n]*/g, ' ').replace(/[#*~=`>|_^%&+;!@$\[\]{}\\]/g, ' ').replace(/\s+/g, ' ').trim();
    const titleOf = (n) => (n.title || '').trim() || (plain(n.text).slice(0, 48)) || 'Untitled note';
    const words = (t) => { const p = plain(t); return p ? p.split(' ').length : 0; };
    const preview = (n) => { const lines = String(n.text || '').replace(/@@program[^\n]*```[\s\S]*?```/g, '').split('\n').filter((l) => l.trim() && !/^\s*(#{1,4}|\/{1,4})\s/.test(l)); return plain(lines.join(' ')).slice(0, 170); };
    const nbName = (id) => { const b = nbs.find((x) => x.id === id); return b ? b.name : ''; };

    /* ---------- the rail ---------- */
    const live = () => notes.filter((n) => !n.trashed);
    function inStream(n) {
        if (stream.kind === 'trash') return !!n.trashed;
        if (n.trashed) return false;
        if (stream.kind === 'all') return true;
        if (stream.kind === 'pinned') return n.pinned;
        if (stream.kind === 'nb') return n.nb === stream.id;
        if (stream.kind === 'tag') return (n.tags || []).includes(stream.name);
        if (stream.kind === 'today') return ymd(new Date(n.created)) === ymd(new Date()) || ymd(new Date(n.updated)) === ymd(new Date());
        return true;
    }
    function streamRow(kind, label, icon, count, extra) {
        const on = stream.kind === kind && (!extra || (stream.id === extra.id));
        return '<button type="button" class="wf-st' + (on ? ' on' : '') + '" data-kind="' + kind + '"' + (extra ? ' data-id="' + esc(extra.id) + '"' : '') + '>' + (extra && extra.color ? '<i class="wf-dot" style="background:' + extra.color + '"></i>' : icon) + '<span>' + esc(label) + '</span><em>' + (count == null ? '' : count) + '</em>' + (kind === 'nb' ? '<i class="wf-st-more" role="button" tabindex="0" data-id="' + esc(extra.id) + '" title="Notebook options: rename, color or delete">' + ICON.more + '</i>' : '') + '</button>';
    }
    function renderRail() {
        const l = live();
        $('wf-streams').innerHTML = streamRow('all', 'All notes', ICON.all, l.length) + streamRow('pinned', 'Pinned', ICON.star, l.filter((n) => n.pinned).length) + streamRow('today', 'Today', ICON.day, l.filter((n) => inStreamToday(n)).length) + streamRow('scratch', 'Scratch', ICON.scratch, '') + streamRow('trash', 'Trash', ICON.trash, notes.filter((n) => n.trashed).length || '');
        $('wf-nbs').innerHTML = nbs.map((b) => streamRow('nb', b.name, ICON.book, l.filter((n) => n.nb === b.id).length, { id: b.id, color: b.color })).join('') || '<p class="wf-none" style="padding:4px 8px;text-align:left;font-size:12px">Notebooks group your notes. Press + to make one!</p>';
        const tc = {}; l.forEach((n) => (n.tags || []).forEach((t) => { tc[t] = (tc[t] || 0) + 1; }));
        const tags = Object.keys(tc).sort((a, b) => tc[b] - tc[a] || a.localeCompare(b)).slice(0, 30);
        $('wf-tagcloud').innerHTML = tags.map((t) => '<button type="button" class="wf-tag' + (stream.kind === 'tag' && stream.name === t ? ' on' : '') + '" data-tag="' + esc(t) + '">#' + esc(t) + '</button>').join('') || '<span class="wf-none" style="padding:0 6px;font-size:12px">Tags you add show up here!</span>';
    }
    const inStreamToday = (n) => ymd(new Date(n.updated)) === ymd(new Date());
    $('wf-rail').addEventListener('click', (e) => {
        const mo = e.target.closest('.wf-st-more');
        if (mo) { e.stopPropagation(); notebookDialog(mo.dataset.id); return; }
        const st = e.target.closest('.wf-st'); const tg = e.target.closest('.wf-tag');
        if (st) { stream = st.dataset.kind === 'nb' ? { kind: 'nb', id: st.dataset.id } : { kind: st.dataset.kind }; body.dataset.rail = ''; if (stream.kind === 'scratch') { openNote(scratch); } renderAll(); }
        if (tg) { stream = { kind: 'tag', name: tg.dataset.tag }; body.dataset.rail = ''; renderAll(); }
    });

    $('wf-rail').addEventListener('contextmenu', (e) => { const st = e.target.closest('.wf-st[data-kind="nb"]'); if (st) { e.preventDefault(); notebookDialog(st.dataset.id); } });
    $('wf-rail').addEventListener('keydown', (e) => { const mo = e.target.closest && e.target.closest('.wf-st-more'); if (mo && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); notebookDialog(mo.dataset.id); } });

    /* ---------- the list ---------- */
    function listTitle() {
        if (stream.kind === 'nb') return nbName(stream.id) || 'Notebook';
        if (stream.kind === 'tag') return '#' + stream.name;
        return { all: 'All notes', pinned: 'Pinned', today: 'Today', trash: 'Trash', scratch: 'Scratch' }[stream.kind];
    }
    function renderList() {
        $('wf-listtitle').textContent = listTitle();
        $('wf-nbopts').hidden = stream.kind !== 'nb';
        const q = $('wf-q').value.trim().toLowerCase();
        let arr = stream.kind === 'scratch' ? [scratch] : notes.filter(inStream);
        if (q) arr = arr.filter((n) => (n.title + ' ' + n.text + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q));
        const by = $('wf-sort').value;
        arr.sort((a, b) => (b.pinned - a.pinned) || (by === 'title' ? titleOf(a).localeCompare(titleOf(b)) : by === 'created' ? b.created - a.created : b.updated - a.updated));
        $('wf-listcount').textContent = arr.length + (arr.length === 1 ? ' note' : ' notes');
        $('wf-cards').innerHTML = arr.map((n) => '<button type="button" class="wf-cardn' + (cur && cur.id === n.id ? ' on' : '') + '" data-id="' + esc(n.id) + '" role="listitem" style="--c:' + (n.color || (n.nb && (nbs.find((b) => b.id === n.nb) || {}).color) || 'transparent') + '"><b><span>' + esc(titleOf(n)) + '</span>' + (n.pinned ? ICON.pin : '') + '</b><p>' + esc(preview(n) || 'Empty note') + '</p><small>' + esc(when(n.updated)) + (n.nb ? '<i>' + esc(nbName(n.nb)) + '</i>' : '') + (n.tags || []).slice(0, 2).map((t) => '<i>#' + esc(t) + '</i>').join('') + '</small></button>').join('') || '<div class="wf-none">' + (q ? 'Nothing matches that search!' : stream.kind === 'trash' ? 'The trash is empty!' : 'No notes here yet. Press New note!') + '</div>';
    }
    $('wf-cards').addEventListener('click', (e) => { const c = e.target.closest('.wf-cardn'); if (c) { const n = c.dataset.id === 'scratch' ? scratch : notes.find((x) => x.id === c.dataset.id); if (n) openNote(n); } });
    $('wf-nbopts').addEventListener('click', () => { if (stream.kind === 'nb') notebookDialog(stream.id); });
    $('wf-q').addEventListener('input', renderList);
    $('wf-sort').addEventListener('change', renderList);
    const renderAll = () => { renderRail(); renderList(); };

    /* ---------- the note ---------- */
    function showMode(m) {
        mode = m; S.mode = m; LS('waterflow2_settings', JSON.stringify(S));
        document.querySelectorAll('.wf-modes button').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === m ? 'true' : 'false'));
        $('wf-visual').hidden = m !== 'visual'; $('wf-view').hidden = m !== 'view'; $('wf-srcwrap').hidden = m !== 'source';
        $('wf-tools').hidden = m === 'view';
    }
    function loadMode() {
        if (!cur) return;
        if (mode === 'visual') { ed.setText(kdOf(cur)); }
        else if (mode === 'view') { const v = $('wf-view'); v.innerHTML = KD.render(kdOf(cur)); try { KD.upgrade(v); } catch (e) {} }
        else { $('wf-source').value = cur.text; paintSource(); }
        const s = $('wf-stage'); s.querySelectorAll('.wf-pane').forEach((p) => { p.scrollTop = 0; });
    }
    function readMode() {   // the text as the visible editor has it
        if (!cur) return;
        if (playing()) return;
        if (mode === 'visual' && ed) cur.text = keep(cur, ed.getText());
        else if (mode === 'source') cur.text = $('wf-source').value;
    }
    function switchMode(m) {
        if (m === mode) return;
        readMode(); showMode(m); loadMode(); afterTextChange(false);
    }
    document.querySelectorAll('.wf-modes button').forEach((b) => b.addEventListener('click', () => switchMode(b.dataset.mode)));

    function paintSource() { const t = $('wf-source').value; $('wf-hl').innerHTML = (isPK(cur) ? highlightPK(t) : highlight(t)) + '\n'; }
    $('wf-source').addEventListener('input', () => { cur.text = $('wf-source').value; paintSource(); afterTextChange(true); });
    $('wf-source').addEventListener('scroll', (e) => { $('wf-hl').scrollTop = e.target.scrollTop; $('wf-hl').scrollLeft = e.target.scrollLeft; });
    $('wf-source').addEventListener('keydown', (e) => {
        if (e.key === 'Tab') { e.preventDefault(); const t = e.target, a = t.selectionStart; t.setRangeText('    ', a, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input')); }
    });

    function afterTextChange(save) {
        if (!cur) return;
        if (save) touch(cur);
        $('wf-stats').textContent = words(cur.text).toLocaleString() + ' words, ' + Math.max(1, Math.round(words(cur.text) / 220)) + ' min read';
        outline(); info();
        const c = document.querySelector('.wf-cardn.on'); if (c && save) { clearTimeout(afterTextChange.t); afterTextChange.t = setTimeout(renderList, 600); }
    }
    function outline() {
        const hs = []; String(cur.text || '').split('\n').forEach((l) => { const m = (isPK(cur) ? /^(\/{1,4})\s+(.+)$/ : /^(#{1,4})\s+(.+)$/).exec(l); if (m) hs.push([m[1].length, plain(m[2]) || m[2], hs.length]); });
        $('wf-outline').innerHTML = hs.length ? hs.map((h) => '<button type="button" class="l' + h[0] + '" data-i="' + h[2] + '">' + esc(h[1]) + '</button>').join('') : '<p>Headings (start a line with #) show up here!</p>';
    }
    $('wf-outline').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const i = Number(b.dataset.i);
        if (mode === 'source') {
            const ta = $('wf-source'); let pos = 0, k = -1; const lines = ta.value.split('\n');
            for (let j = 0; j < lines.length; j++) { if ((isPK(cur) ? /^\/{1,4}\s+/ : /^#{1,4}\s+/).test(lines[j])) { k++; if (k === i) break; } pos += lines[j].length + 1; }
            ta.focus(); ta.setSelectionRange(pos, pos);
            const ratio = pos / Math.max(1, ta.value.length); ta.scrollTop = Math.max(0, ratio * ta.scrollHeight - 80); $('wf-hl').scrollTop = ta.scrollTop;
        } else {
            const root = mode === 'view' ? $('wf-view') : $('wf-visual');
            const h = Array.from(root.querySelectorAll('h1,h2,h3,h4'))[i];
            if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    function info() {
        if (!cur) return;
        $('wf-info').innerHTML = '<dt>Created</dt><dd>' + esc(new Date(cur.created).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) + '</dd><dt>Edited</dt><dd>' + esc(new Date(cur.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) + '</dd><dt>Words</dt><dd>' + words(cur.text).toLocaleString() + '</dd><dt>Characters</dt><dd>' + String(cur.text || '').length.toLocaleString() + '</dd>' + (cur.nb ? '<dt>Notebook</dt><dd>' + esc(nbName(cur.nb)) + '</dd>' : '');
        $('wf-when').textContent = 'Edited ' + when(cur.updated);
    }
    function renderMeta() {
        $('wf-title').value = cur.title || '';
        $('wf-title').readOnly = !!cur.scratch;
        $('wf-pin').classList.toggle('on', !!cur.pinned);
        $('wf-nbselect').innerHTML = '<option value="">No notebook</option>' + nbs.map((b) => '<option value="' + esc(b.id) + '"' + (cur.nb === b.id ? ' selected' : '') + '>' + esc(b.name) + '</option>').join('');
        $('wf-chips').innerHTML = (cur.tags || []).map((t) => '<span class="wf-chip">#' + esc(t) + '<button type="button" data-rm="' + esc(t) + '" aria-label="Remove tag ' + esc(t) + '">×</button></span>').join('');
        $('wf-colors').innerHTML = COLORS.map((c) => '<button type="button" data-c="' + c + '" class="' + ((cur.color || '') === c ? 'on' : '') + '" style="background:' + (c || 'linear-gradient(135deg,#fff 45%,#e5484d 46%,#e5484d 54%,#fff 55%)') + '" aria-label="Color ' + (c || 'none') + '"></button>').join('');
        $('wf-nbselect').disabled = !!cur.scratch; $('wf-taginput').disabled = !!cur.scratch;
    }
    function openNote(n) {
        if (cur && cur !== n) { readMode(); if (!cur.scratch && dirty.has(cur.id) === false && false) {} }
        cur = n;
        $('wf-empty').hidden = true; $('wf-note').hidden = false;
        skin(); buildTools(); $('wf-source').placeholder = isPK(n) ? 'Write Poolside Keydown here' : 'Write Keydown here';
        renderMeta(); showMode(mode); loadMode(); afterTextChange(false);
        body.dataset.view = 'edit';
        try { history.replaceState(null, '', n.scratch ? location.pathname : '#n=' + n.id); } catch (e) {}
        renderList();
        if (!n.text && !n.title && !n.scratch) setTimeout(() => $('wf-title').focus(), 50);
    }
    function closeNote() {
        cur = null; skin(); $('wf-note').hidden = true; $('wf-empty').hidden = false; body.dataset.view = 'list';
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
        legacyOffer(); renderList();
    }
    $('wf-back').addEventListener('click', () => { readMode(); if (cur) touch(cur); closeNote(); renderAll(); });

    $('wf-title').addEventListener('input', () => { cur.title = $('wf-title').value; touch(cur); clearTimeout(openNote.t); openNote.t = setTimeout(renderList, 500); });
    $('wf-title').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (mode === 'source') $('wf-source').focus(); else if (mode === 'visual') $('wf-visual').focus(); } });
    $('wf-pin').addEventListener('click', () => { if (cur.scratch) return; cur.pinned = !cur.pinned; touch(cur); $('wf-pin').classList.toggle('on', cur.pinned); renderAll(); });
    $('wf-nbselect').addEventListener('change', () => { cur.nb = $('wf-nbselect').value; touch(cur); info(); renderAll(); });
    $('wf-colors').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; cur.color = b.dataset.c; touch(cur); renderMeta(); renderList(); });
    $('wf-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; cur.tags = cur.tags.filter((t) => t !== b.dataset.rm); touch(cur); renderMeta(); renderRail(); renderList(); });
    $('wf-taginput').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();
        const t = e.target.value.trim().replace(/^#+/, '').replace(/[\s,#]+/g, '-').toLowerCase().slice(0, 30);
        if (t && !(cur.tags || []).includes(t)) { cur.tags = (cur.tags || []).concat(t); touch(cur); renderMeta(); renderRail(); renderList(); }
        e.target.value = '';
    });

    /* ---------- creating, daily notes, notebooks, trash ---------- */
    function newNote(extra, open) {
        const n = blank(Object.assign({ nb: stream.kind === 'nb' ? stream.id : '' }, extra || {}));
        notes.push(n); touch(n); renderAll();
        if (open !== false) { if (stream.kind === 'scratch' || stream.kind === 'trash') { stream = { kind: 'all' }; renderAll(); } mode = mode === 'view' ? 'visual' : mode; openNote(n); }
        return n;
    }
    function today() {
        const key = ymd(new Date());
        let n = notes.find((x) => !x.trashed && x.title === key);
        if (!n) {
            let jb = nbs.find((b) => b.name === 'Journal');
            if (!jb) { jb = { id: uid(), name: 'Journal', color: COLORS[6] }; nbs.push(jb); saveNbs(); }
            n = blank({ title: key, nb: jb.id, tags: ['journal'], text: (newLang() === 'pk' ? '/ ' : '# ') + new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + '\n' });
            notes.push(n); touch(n);
        }
        stream = { kind: 'today' }; renderAll(); openNote(n);
    }
    // a notebook's name, color and removal
    function notebookDialog(id) {
        const nb = nbs.find((b) => b.id === id); if (!nb) return;
        const count = notes.filter((n) => n.nb === id && !n.trashed).length;
        dialog('Notebook', '<div class="wf-row"><span>Name</span><input type="text" id="nb-name" maxlength="40" value="' + esc(nb.name) + '"></div>' +
            '<div class="wf-row"><span>Color<small>The color on its notes in the list</small></span><span class="wf-colors wf-nbcolors" id="nb-colors">' + COLORS.map((c) => '<button type="button" data-c="' + c + '" class="' + ((nb.color || '') === c ? 'on' : '') + '" style="background:' + (c || 'linear-gradient(135deg,#fff 45%,#ff8a1b 46%,#ff8a1b 54%,#fff 55%)') + '" aria-label="Color ' + (c || 'none') + '"></button>').join('') + '</span></div>' +
            '<div class="wf-row"><span>Save this notebook<small>A .kw file with its ' + count + (count === 1 ? ' note' : ' notes') + ', which Waterflow can open again</small></span><button type="button" class="wf-btn" id="nb-kw">Export .kw</button></div>' +
            '<div class="wf-row"><span>Delete this notebook<small>' + (count ? 'Its ' + count + (count === 1 ? ' note stays' : ' notes stay') + ' in All notes, just without a notebook.' : 'It has no notes in it.') + '</small></span><button type="button" class="wf-btn danger" id="nb-del">Delete notebook</button></div>', (b) => {
            const name = b.querySelector('#nb-name');
            const save = () => { const v = name.value.trim().slice(0, 40); if (v && v !== nb.name) { nb.name = v; saveNbs(); renderAll(); if (cur) renderMeta(); } };
            name.addEventListener('change', save); name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { save(); closeDialog(); } });
            b.querySelector('#nb-colors').addEventListener('click', (e) => { const c = e.target.closest('button'); if (!c) return; nb.color = c.dataset.c; saveNbs(); b.querySelectorAll('#nb-colors button').forEach((x) => x.classList.toggle('on', x === c)); renderAll(); });
            b.querySelector('#nb-kw').addEventListener('click', () => exportNotebook(id));
            b.querySelector('#nb-del').addEventListener('click', () => {
                if (!confirm('Delete the notebook "' + nb.name + '"?' + (count ? ' Its notes will stay in All notes.' : ''))) return;
                notes.forEach((n) => { if (n.nb === id) { n.nb = ''; touch(n); } });
                nbs = nbs.filter((x) => x.id !== id); saveNbs();
                if (stream.kind === 'nb' && stream.id === id) stream = { kind: 'all' };
                closeDialog(); if (cur) renderMeta(); renderAll(); toast('Notebook deleted!');
            });
            setTimeout(() => name.focus(), 30);
        });
    }
    function addNotebook() {
        const name = (prompt('Name the new notebook') || '').trim();
        if (!name) return;
        const b = { id: uid(), name: name.slice(0, 40), color: COLORS[1 + (nbs.length % (COLORS.length - 1))] };
        nbs.push(b); saveNbs(); stream = { kind: 'nb', id: b.id }; renderAll();
    }
    function trash(n) { n.trashed = Date.now(); touch(n); if (cur === n) closeNote(); renderAll(); toast('Moved to the trash. Open Trash to bring it back!'); }
    function restore(n) { n.trashed = 0; touch(n); renderAll(); toast('Restored!'); }
    async function wipe(n) { notes = notes.filter((x) => x !== n); await store.del(n.id); if (cur === n) closeNote(); renderAll(); meter(); }
    $('wf-new').addEventListener('click', () => newNote());
    $('wf-empty-new').addEventListener('click', () => newNote());
    $('wf-addnb').addEventListener('click', addNotebook);
    $('wf-railopen').addEventListener('click', () => { body.dataset.rail = body.dataset.rail === 'open' ? '' : 'open'; });
    document.addEventListener('click', (e) => { if (body.dataset.rail === 'open' && !e.target.closest('#wf-rail') && !e.target.closest('#wf-railopen')) body.dataset.rail = ''; });

    /* ---------- inserting (the toolbar) ---------- */
    const TOOLS_KD = [
        ['B', 'Bold', 'wf-b', (s) => '**' + (s || 'bold') + '**'], ['I', 'Italic', 'wf-i', (s) => '*' + (s || 'italic') + '*'],
        ['Code', 'Inline code', '', (s) => '`' + (s || 'code') + '`'], ['Highlight', 'Highlight with a color chip', '', (s) => '#Y#' + (s || 'highlight') + '#'],
        ['Blank', 'A blank to fill in', '', () => '[__8|answer]'],
        ['Divider', 'A divider line', '', null, '::divider{aqua|Section|blue}'],
        ['Heading', 'A heading', '', null, '# Heading'], ['List', 'A bulleted list', '', null, '- First\n- Second\n- Third'],
        ['Quote', 'A quote', '', null, '> A thought worth keeping'],
        ['Code block', 'A styled code block', '', null, '```js{terminal|Code}\nconsole.log("flow!");\n```'],
        ['Table', 'A table', '', null, '| Name | Note |\n| --- | --- |\n| One | First |'],
        ['Math', 'An equation', '', null, '$$e^{i\\pi} + 1 = 0$$'],
        ['Practice box', 'Room to write', '', null, '::blank{box|3|Write here}']
    ];
    // the same tools in Poolside Keydown's own marks (in Visual they are turned into Keydown as they go in)
    const TOOLS_PK = [
        ['B', 'Bold', 'wf-b', (s) => '<b ' + (s || 'bold') + '>'], ['I', 'Italic', 'wf-i', (s) => '<i ' + (s || 'italic') + '>'],
        ['Ring', 'An orange ring chip', '', (s) => '<ring ' + (s || 'ring') + '>'], ['Buoy', 'An orange bubble chip', '', (s) => '<buoy ' + (s || 'buoy') + '>'],
        ['Foam', 'A cyan bubble chip', '', (s) => '<foam ' + (s || 'foam') + '>'], ['Deep', 'A blue bubble chip', '', (s) => '<deep ' + (s || 'deep') + '>'],
        ['Tile', 'A blue toast chip', '', (s) => '<tile ' + (s || 'tile') + '>'], ['Drop', 'A water drop', '', (s) => '<drop ' + (s || 'drop') + '>'],
        ['Halo', 'A halo mark', '', (s) => '<halo ' + (s || 'halo') + '>'], ['Blank', 'A blank to fill in', '', () => '<blank 8|answer>'],
        ['Divider', 'A divider line', '', null, '/~ rope | Section | blue'],
        ['Heading', 'A heading', '', null, '/ Heading'], ['List', 'A ring list', '', null, '() First\n() Second\n() Third'],
        ['Quote', 'A quiet quote', '', null, '<< A thought worth keeping'], ['Callout', 'A callout', '', null, '<! Heads up'],
        ['Code block', 'A styled code block', '', null, '```js{terminal|Code}\nconsole.log("flow!");\n```'],
        ['Table', 'A table', '', null, '[= Name | Note =]\n[ One | First ]\n[ Two | Second ]'],
        ['Cover', 'A pool cover over a secret', '', (s) => '<cover ' + (s || 'secret') + '>'], ['Link', 'A link', '', (s) => '<link https://example.com ' + (s || 'link') + '>'],
        ['Math', 'An equation', '', null, '$$e^{i\\pi} + 1 = 0$$'],
        ['Practice box', 'Room to write', '', null, '(_ box|3|Write here _)']
    ];
    let TOOLS = TOOLS_PK;
    function buildTools() {
        TOOLS = isPK(cur) ? TOOLS_PK : TOOLS_KD;
        $('wf-tools').innerHTML = TOOLS.map((t, i) => '<button type="button" class="' + t[2] + '" data-t="' + i + '" title="' + esc(t[1]) + '">' + esc(t[0]) + '</button>').join('') + (isPK(cur) ? '<button type="button" data-t="chips" title="Every Poolside chip">Chips</button><button type="button" data-t="notes" title="Quotes, callouts and notes">Notes</button><button type="button" data-t="dividers" title="All the lane dividers">Dividers</button><button type="button" data-t="codes" title="Code block styles">Code</button>' : '') + '<button type="button" data-t="psl" title="Poolside Style Lookup: search 4,500 Poolside styles">Styles</button><button type="button" data-t="skills" title="Dice, timers, flashcards and more">Skills</button>';
    }
    function insertText(snippet, wrapFn) {
        if (!cur) return;
        if (mode === 'source') {
            const ta = $('wf-source'), a = ta.selectionStart, b = ta.selectionEnd, sel = ta.value.slice(a, b);
            const text = wrapFn ? wrapFn(sel) : snippet;
            const pre = !wrapFn && a > 0 && ta.value[a - 1] !== '\n' ? '\n' : '';
            ta.focus(); ta.setRangeText(pre + text, a, b, 'end'); ta.dispatchEvent(new Event('input'));
            return;
        }
        // Visual: a word-sized mark is typed at the caret and formatted at once; whole blocks are added at the end of the note
        if (wrapFn) {
            const sel = String(window.getSelection && window.getSelection() || '');
            let text = wrapFn ? wrapFn(sel) : snippet;
            if (isPK(cur)) text = PKX.toKD(text);
            const v = $('wf-visual'); v.focus();
            document.execCommand('insertText', false, text);
            try { ed.format(); } catch (e) {}
            cur.text = keep(cur, ed.getText()); touch(cur); afterTextChange(false);
        } else {
            ed.setText(ed.getText().replace(/\s+$/, '') + '\n\n' + (isPK(cur) ? PKX.toKD(snippet) : snippet) + '\n');
            cur.text = keep(cur, ed.getText()); touch(cur); afterTextChange(false);
            const v = $('wf-visual'); v.scrollTop = v.scrollHeight;
        }
    }
    $('wf-tools').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    $('wf-tools').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.t === 'skills') { skillsMenu(b); return; }
        if (b.dataset.t === 'chips') { chipsMenu(b); return; }
        if (b.dataset.t === 'psl') { pslOpen(); return; }
        if (b.dataset.t === 'notes') { notesMenu(b); return; }
        if (b.dataset.t === 'dividers') { dividersMenu(b); return; }
        if (b.dataset.t === 'codes') { codesMenu(b); return; }
        const t = TOOLS[Number(b.dataset.t)];
        if (!t) return;
        if (t[3]) insertText(null, t[3]); else insertText(t[4]);
    });
    // Poolside Style Lookup: any of the 5,850 Poolside styles, put on the selected words (or a sample word)
    function pslOpen() {
        if (!window.PSL) { toast('Poolside Style Lookup did not load!'); return; }
        window.PSL.open({ verb: 'put it on your words', insert: (st) => {
            const pk = cur && isPK(cur);
            insertText(null, (sel) => pk ? '<' + st.id + ' ' + (sel || 'Text') + '>' : '@' + st.id + '@' + (sel || 'Text') + '@');
        } });
    }
    // every Poolside chip, to put on the selected words (or on a sample word)
    function chipsMenu(btn) {
        const names = PKX.NAMES.filter((n) => n !== 'blank' && n !== 'box' && n !== 'b' && n !== 'i');
        menu(btn, names.map((n) => [n, () => insertText(null, (sel) => '<' + n + ' ' + (sel || n) + '>')]));
    }
    function notesMenu(btn) { menu(btn, PKX.NOTES.map((n) => [n[0] + '   ' + n[1], () => insertText(n[1] + ' A thought worth keeping')])); }
    function dividersMenu(btn) { menu(btn, Object.keys(PKX.DIVIDERS).map((d) => [d, () => insertText('/~ ' + d + ' | Section | blue')])); }
    function codesMenu(btn) { menu(btn, Object.keys(PKX.FENCES).map((f) => [f, () => insertText('```js{' + f + '|Code}\nconsole.log("flow!");\n```')])); }
    function skillsMenu(btn) {
        if (mode !== 'visual') { toast('Skills live in Visual mode: switch to Visual to add one!'); return; }
        const list = KD.skills || [];
        menu(btn, list.map((s) => [s.label || s.name, () => { try { ed.insertSkill(s.name); cur.text = keep(cur, ed.getText()); touch(cur); afterTextChange(false); } catch (e) { toast('That skill did not open!'); } }]));
    }

    /* ---------- menus and dialogs ---------- */
    function menu(anchor, items) {
        const m = $('wf-menu');
        m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : '<button type="button" data-i="' + i + '" class="' + (it[2] || '') + '">' + esc(it[0]) + '</button>').join('');
        m.hidden = false;
        const r = anchor.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(innerWidth - 210, r.right - 190)) + 'px';
        m.style.top = Math.min(innerHeight - m.offsetHeight - 8, r.bottom + 6) + 'px';
        m.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; m.hidden = true; items[Number(b.dataset.i)][1](); };
    }
    document.addEventListener('mousedown', (e) => { const m = $('wf-menu'); if (!m.hidden && !m.contains(e.target)) m.hidden = true; });
    function dialog(title, html, after) {
        $('wf-dlg-title').textContent = title; $('wf-dlg-body').innerHTML = html; $('wf-dialog').hidden = false;
        if (after) after($('wf-dlg-body'));
    }
    const closeDialog = () => { $('wf-dialog').hidden = true; };
    $('wf-dlg-x').addEventListener('click', closeDialog);
    $('wf-dialog').addEventListener('mousedown', (e) => { if (e.target === $('wf-dialog')) closeDialog(); });

    $('wf-more').addEventListener('click', (e) => {
        if (!cur) return;
        const items = [];
        if (cur.trashed) items.push(['Restore', () => { restore(cur); closeNote(); }], ['Delete forever', () => { if (confirm('Delete this note forever?')) wipe(cur); }, 'danger']);
        else {
            items.push(['Duplicate', duplicate], PKX ? [isPK(cur) ? 'Switch to Classic Keydown' : 'Switch to Poolside Keydown', convertLang] : '-', [isPK(cur) ? 'Export as .kdp' : 'Export as .kd', () => exportNote(cur)], isPK(cur) ? ['Export as .kd (plain Keydown)', () => exportNote(cur, true)] : '-', ['Copy as Keydown', () => { readMode(); try { navigator.clipboard.writeText(cur.text); toast('Copied the Keydown text!'); } catch (x) { toast('Could not copy here!'); } }], ['Print or save as PDF', printNote]);
            if (!cur.scratch) items.push('-', ['Move to trash', () => trash(cur), 'danger']);
            else items.push('-', ['Clear the scratch note', () => { cur.text = ''; loadMode(); touch(cur); afterTextChange(false); }, 'danger']);
        }
        menu($('wf-more'), items);
    });
    function convertLang() {
        if (!cur || !PKX) return;
        readMode();
        const kd = kdOf(cur), to = isPK(cur) ? 'kd' : 'pk';
        cur.lang = to; cur.text = to === 'pk' ? PKX.toPK(kd) : kd;
        touch(cur); skin(); buildTools(); $('wf-source').placeholder = to === 'pk' ? 'Write Poolside Keydown here' : 'Write Keydown here';
        loadMode(); afterTextChange(false); renderList();
        toast(to === 'pk' ? 'This note is written in Poolside Keydown now!' : 'This note is written in Classic Keydown now!');
    }
    function duplicate() { readMode(); const n = blank({ lang: cur.lang, title: (cur.title || titleOf(cur)) + ' copy', text: cur.text, nb: cur.nb, tags: (cur.tags || []).slice(), color: cur.color }); notes.push(n); touch(n); renderAll(); openNote(n); }
    function printNote() {
        readMode(); const v = $('wf-view'); const was = mode;
        v.innerHTML = KD.render(kdOf(cur)); try { KD.upgrade(v); } catch (e) {}
        v.hidden = false; body.dataset.printing = '1';
        const done = () => { body.dataset.printing = ''; v.hidden = was !== 'view'; window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done); setTimeout(() => window.print(), 80);
    }

    /* ---------- files: .kd, backups, and the old Waterflow ---------- */
    const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
    const fileName = (n) => (titleOf(n).replace(/[^\w\- ]+/g, '').trim() || 'note').slice(0, 60);
    function kdFile(n) {
        const head = ['---', 'format: "keydown-text"', 'app: "Waterflow"', 'title: ' + JSON.stringify(titleOf(n)), 'created: ' + new Date(n.created).toISOString()];
        if ((n.tags || []).length) head.push('tags: [' + n.tags.join(', ') + ']');
        return head.concat(['---', '', kdOf(n), '']).join('\n');
    }
    // Poolside Keydown notes are saved as .kdp: the same header, then the note exactly as it is written in Poolside Keydown
    function kdpFile(n) {
        const head = ['---', 'format: "poolside-keydown-text"', 'app: "Waterflow"', 'title: ' + JSON.stringify(titleOf(n)), 'created: ' + new Date(n.created).toISOString()];
        if ((n.tags || []).length) head.push('tags: [' + n.tags.join(', ') + ']');
        return head.concat(['---', '', String(n.text || '').replace(/\s+$/, ''), '']).join('\n');
    }
    function exportNote(n, plain) {
        readMode();
        if (isPK(n) && !plain) { download(fileName(n) + '.kdp', kdpFile(n)); toast('Exported ' + fileName(n) + '.kdp!'); }
        else { download(fileName(n) + '.kd', kdFile(n)); toast('Exported ' + fileName(n) + '.kd!'); }
    }
    // a whole notebook is a .kw file: its name and color, and every note in it (each keeps its own language)
    function exportNotebook(id) {
        const nb = nbs.find((b) => b.id === id); if (!nb) return;
        readMode();
        const list = notes.filter((n) => n.nb === id && !n.trashed && !n.scratch);
        const out = { format: 'waterflow-notebook', version: 1, app: 'Waterflow', exported: new Date().toISOString(), notebook: { name: nb.name, color: nb.color || '' },
            notes: list.map((n) => ({ title: n.title || '', text: n.text || '', lang: n.lang === 'pk' ? 'pk' : 'kd', tags: n.tags || [], pinned: !!n.pinned, color: n.color || '', created: n.created, updated: n.updated })) };
        const name = (nb.name.replace(/[^\w\- ]+/g, '').trim() || 'notebook').slice(0, 60);
        download(name + '.kw', JSON.stringify(out, null, 1), 'application/json');
        toast('Exported ' + name + '.kw with ' + list.length + (list.length === 1 ? ' note!' : ' notes!'));
    }
    function importNotebook(o) {
        const src = o.notebook || {};
        const name = String(src.name || 'Notebook').slice(0, 40);
        let nb = nbs.find((b) => b.name === name);
        if (!nb) { nb = { id: uid(), name: name, color: src.color || '' }; nbs.push(nb); saveNbs(); }
        let made = 0;
        (o.notes || []).forEach((n) => {
            const dup = notes.find((x) => x.nb === nb.id && !x.trashed && x.title === (n.title || '') && x.created === n.created && x.text === (n.text || ''));
            if (dup) return;
            const nn = blank({ lang: n.lang === 'pk' ? 'pk' : 'kd', title: n.title || '', text: n.text || '', nb: nb.id, tags: Array.isArray(n.tags) ? n.tags : [], pinned: !!n.pinned, color: n.color || '', created: n.created || Date.now() });
            notes.push(nn); touch(nn); made++;
        });
        return made;
    }
    function fromKd(text, name) {
        let meta = {}, bodyText = String(text).replace(/\r/g, '');
        const m = /^---\n([\s\S]*?)\n---\n?/.exec(bodyText);
        if (m) {
            bodyText = bodyText.slice(m[0].length).replace(/^\n/, '');
            m[1].split('\n').forEach((l) => { const k = /^([a-z_]+):\s*(.*)$/.exec(l); if (k) meta[k[1]] = k[2]; });
        }
        let title = name.replace(/\.[^.]+$/, ''); try { if (meta.title) title = JSON.parse(meta.title); } catch (e) { title = meta.title || title; }
        const tags = meta.tags ? meta.tags.replace(/[\[\]]/g, '').split(',').map((t) => t.trim()).filter(Boolean) : [];
        // an old export keeps the page as HTML after the header: it becomes Keydown text
        if (/^\s*<(div|h[1-6]|p|span|ul|ol|table)\b/i.test(bodyText)) { const d = document.createElement('div'); d.innerHTML = bodyText; try { bodyText = KD.toText(d); } catch (e) {} }
        return blank({ lang: 'kd', title: title, text: bodyText.replace(/\s+$/, '') + '\n', tags: tags, created: meta.created && !isNaN(Date.parse(meta.created)) ? Date.parse(meta.created) : Date.now() });
    }
    function fromKdp(text, name) { const n = fromKd(text, name); n.lang = 'pk'; return n; }
    async function importFiles(files) {
        let made = 0, lastNb = null;
        for (const f of files) {
            const text = await f.text();
            if (/\.kw$/i.test(f.name)) {
                try {
                    const o = JSON.parse(text);
                    if (!o || o.format !== 'waterflow-notebook' || !Array.isArray(o.notes)) throw 0;
                    made += importNotebook(o); lastNb = nbs.find((b) => b.name === String((o.notebook || {}).name || 'Notebook').slice(0, 40)) || lastNb;
                } catch (e) { toast(f.name + ' is not a Waterflow notebook!'); }
            } else if (/\.kdp$/i.test(f.name)) { const n = fromKdp(text, f.name); notes.push(n); touch(n); made++; }
            else if (/\.(json|waterflow)$/i.test(f.name)) {
                try {
                    const o = JSON.parse(text);
                    if (!o || !Array.isArray(o.notes)) throw 0;
                    (o.notebooks || []).forEach((b) => { if (!nbs.find((x) => x.id === b.id)) nbs.push(b); }); saveNbs();
                    o.notes.forEach((n) => { const ex = notes.find((x) => x.id === n.id); if (ex) { if ((n.updated || 0) > ex.updated) { Object.assign(ex, n); touch(ex); } } else { const nn = Object.assign(blank(), n); notes.push(nn); touch(nn); made++; } });
                } catch (e) { toast(f.name + ' is not a Waterflow backup!'); }
            } else { const n = fromKd(text, f.name); notes.push(n); touch(n); made++; }
        }
        if (lastNb && files.length === 1) stream = { kind: 'nb', id: lastNb.id };
        renderAll(); toast(made ? 'Brought in ' + made + (made === 1 ? ' note!' : ' notes!') : 'Nothing new to bring in!');
        if (made === 1 && files.length === 1 && !lastNb) openNote(notes[notes.length - 1]);
    }
    $('wf-file').addEventListener('change', (e) => { importFiles(Array.from(e.target.files)); e.target.value = ''; });
    window.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
    window.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); importFiles(Array.from(e.dataTransfer.files)); } });
    function dataDialog() {
        dialog('Your notes, your files', '<h4>Export</h4>' +
            '<div class="wf-row"><span>All notes<small>One backup file with every note and notebook</small></span><button type="button" class="wf-btn" id="d-all">Export backup</button></div>' +
            '<div class="wf-row"><span>This note<small>' + (cur && isPK(cur) ? 'A .kdp file (Poolside Keydown), or plain Keydown as .kd' : 'A .kd file other Radii apps can open') + '</small></span><button type="button" class="wf-btn" id="d-one"' + (cur ? '' : ' disabled') + '>Export ' + (cur && isPK(cur) ? '.kdp' : '.kd') + '</button>' + (cur && isPK(cur) ? '<button type="button" class="wf-btn" id="d-onekd">Export .kd</button>' : '') + '</div>' +
            '<div class="wf-row"><span>A notebook<small>' + (stream.kind === 'nb' ? 'A .kw file with every note in the open notebook' : 'Open a notebook first, then export it as a .kw file') + '</small></span><button type="button" class="wf-btn" id="d-nb"' + (stream.kind === 'nb' ? '' : ' disabled') + '>Export .kw</button></div>' +
            '<h4>Import</h4><div class="wf-row"><span>.kd, .kdp, .kw, .txt, .md or a Waterflow backup<small>You can also drop files anywhere in the window</small></span><button type="button" class="wf-btn" id="d-imp">Choose files</button></div>' +
            '<h4>Clean up</h4><div class="wf-row"><span>Trash<small>' + notes.filter((n) => n.trashed).length + ' notes waiting (they are removed for good after 30 days)</small></span><button type="button" class="wf-btn danger" id="d-trash">Empty the trash</button></div>' +
            '<h4>The old Waterflow</h4><div class="wf-row"><span>Waterflow Legacy<small>Still available in The Archives</small></span><a class="wf-btn" href="/waterflow-legacy/">Open Legacy</a><button type="button" class="wf-btn" id="d-leg">Bring its notes in</button></div>', (b) => {
            b.querySelector('#d-all').onclick = () => { readMode(); download('waterflow-backup-' + ymd(new Date()) + '.waterflow', JSON.stringify({ app: 'Waterflow', version: 2, exported: new Date().toISOString(), notebooks: nbs, notes: notes }, null, 1), 'application/json'); toast('Backup saved!'); };
            b.querySelector('#d-one').onclick = () => cur && exportNote(cur);
            const dk = b.querySelector('#d-onekd'); if (dk) dk.onclick = () => cur && exportNote(cur, true);
            b.querySelector('#d-nb').onclick = () => { if (stream.kind === 'nb') exportNotebook(stream.id); };
            b.querySelector('#d-imp').onclick = () => $('wf-file').click();
            b.querySelector('#d-trash').onclick = async () => { const t = notes.filter((n) => n.trashed); if (!t.length) return; if (!confirm('Delete ' + t.length + ' notes forever?')) return; for (const n of t) await wipe(n); closeDialog(); toast('Trash emptied!'); };
            b.querySelector('#d-leg').onclick = () => { closeDialog(); importLegacy(true); };
        });
    }
    $('wf-open-data').addEventListener('click', dataDialog);

    function legacySlots() {
        const out = [];
        [['1', 'Legacy: Primary Pad'], ['2', 'Legacy: Secondary Pad']].forEach((p) => { const v = LS('waterflow_save_slot_' + p[0]); if (v && v.replace(/<[^>]*>/g, '').trim().length > 24) out.push([p[1], v]); });
        return out;
    }
    function legacyOffer() {
        const box = $('wf-legacy'); const s = legacySlots();
        if (!s.length || LS('waterflow2_legacy_done') === '1') { box.hidden = true; return; }
        box.hidden = false;
        box.innerHTML = '<b>Found notes from Waterflow Legacy!</b><br>Bring ' + (s.length === 1 ? 'your pad' : 'your ' + s.length + ' pads') + ' into this Waterflow. The old app keeps its copy!<br><button type="button" class="wf-gel" id="wf-legacy-go">Bring them in</button>';
        box.querySelector('#wf-legacy-go').onclick = () => importLegacy(false);
    }
    function importLegacy(manual) {
        const s = legacySlots(); if (!s.length) { toast('There are no Waterflow Legacy notes in this browser!'); return; }
        let nb = nbs.find((b) => b.name === 'From Legacy');
        if (!nb) { nb = { id: uid(), name: 'From Legacy', color: COLORS[2] }; nbs.push(nb); saveNbs(); }
        s.forEach((p) => { const d = document.createElement('div'); d.innerHTML = p[1]; let t = ''; try { t = KD.toText(d); } catch (e) { t = d.textContent; } const n = blank({ title: p[0].replace('Legacy: ', ''), text: (PKX && newLang() === 'pk' ? PKX.toPK(t.replace(/\s+$/, '') + '\n') : t.replace(/\s+$/, '') + '\n'), nb: nb.id }); notes.push(n); touch(n); });
        LS('waterflow2_legacy_done', '1'); stream = { kind: 'nb', id: nb.id }; renderAll(); legacyOffer(); toast('Brought in ' + s.length + (s.length === 1 ? ' pad!' : ' pads!'));
    }

    /* ---------- settings and the guide ---------- */
    function settingsDialog() {
        const sw = (id, on) => '<input type="checkbox" class="wf-switch" id="' + id + '"' + (on ? ' checked' : '') + '>';
        dialog('Settings', '<div class="wf-row"><span>Look<small>Day water, night water or warm sand</small></span><select id="s-theme"><option value="day">Aero day</option><option value="night">Lagoon night</option><option value="sand">Warm sand</option></select></div>' +
            '<div class="wf-row"><span>Keydown for new notes<small>Poolside Keydown has its own marks (/ Title, &lt;ring text&gt;, () lists) and styles. Classic Keydown is the one Writeout uses. You can switch any note from its ... menu</small></span><select id="s-kd"><option value="poolside">Poolside Keydown</option><option value="classic">Classic Keydown</option></select></div>' +
            '<div class="wf-row"><span>Page width<small>How wide the note paper is</small></span><select id="s-width"><option value="640">Narrow</option><option value="780">Comfortable</option><option value="960">Wide</option></select></div>' +
            '<div class="wf-row"><span>Drifting bubbles</span>' + sw('s-bub', S.bubbles) + '</div>' +
            '<div class="wf-row"><span>Water-drop sounds<small>A soft blip on the gel buttons</small></span>' + sw('s-snd', S.sound) + '</div>' +
            '<div class="wf-row"><span>Spell checking</span>' + sw('s-spl', S.spell) + '</div>' +
            '<div class="wf-row"><span>Outline panel</span>' + sw('s-out', S.outline) + '</div>' +
            '<h4>Shortcuts</h4><div class="wf-row"><span><kbd>Ctrl</kbd> <kbd>K</kbd> quick switcher<br><kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>N</kbd> new note<br><kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>F</kbd> focus mode<br><kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>M</kbd> switch View, Visual and Source</span></div>', (b) => {
            b.querySelector('#s-theme').value = S.theme; b.querySelector('#s-kd').value = S.kd === 'classic' ? 'classic' : 'poolside'; b.querySelector('#s-width').value = String(S.width);
            const bind = (id, key, fn) => { const el = b.querySelector(id); el.onchange = () => { S[key] = el.type === 'checkbox' ? el.checked : (key === 'width' ? Number(el.value) : el.value); applySettings(); if (fn) fn(); }; };
            bind('#s-theme', 'theme'); bind('#s-kd', 'kd'); bind('#s-width', 'width'); bind('#s-bub', 'bubbles'); bind('#s-snd', 'sound', blip); bind('#s-spl', 'spell'); bind('#s-out', 'outline');
        });
    }
    $('wf-open-settings').addEventListener('click', settingsDialog);
    $('wf-open-guide').addEventListener('click', () => {
        const pk = PKX && (cur ? isPK(cur) : S.kd !== 'classic');
        dialog(pk ? 'Poolside Keydown' : 'Every Keydown tag', (pk ? PKX.guide((t) => KD.render(t)) + '<h4>Everything else is Keydown</h4>' : '') + '<div class="keydown-doc" style="padding:4px 0">' + KD.guide() + '</div>', (b) => { try { KD.upgrade(b); } catch (e) {} });
    });

    /* ---------- the quick switcher ---------- */
    let palSel = 0, palItems = [];
    function commands() {
        return [
            ['New note', 'Ctrl+Alt+N', () => newNote()], ['Open today\'s note', '', today], ['New notebook', '', addNotebook],
            ['Switch mode: View, Visual, Source', 'Ctrl+Alt+M', cycleMode], ['Focus mode', 'Ctrl+Alt+F', toggleFocus],
            ['Theme: next look', '', () => { const o = ['day', 'night', 'sand']; S.theme = o[(o.indexOf(S.theme) + 1) % 3]; applySettings(); }],
            ['Settings', '', settingsDialog], ['Import, export and backups', '', dataDialog], ['Keydown guide', '', () => $('wf-open-guide').click()], ['BitLang guide (programs)', '', () => { try { BL().openDocs(); } catch (e) { toast('The BitLang guide did not open!'); } }],
            ['Print or save as PDF', '', () => cur && printNote()], ['Switch this note between Poolside and Classic Keydown', '', convertLang]
        ].concat(cur ? [['Delete this note', cur.trashed ? 'forever' : 'to the trash', deleteCurrent], ['Recolor this note', '', recolorCurrent]] : []);
    }
    function deleteCurrent() {
        if (!cur) return;
        if (cur.trashed) { if (confirm('Delete this note forever?')) wipe(cur); return; }
        trash(cur);
    }
    function recolorCurrent() {
        if (!cur) return;
        dialog('Recolor this note', '<div class="wf-colors" id="rc-colors">' + COLORS.map((c) => '<button type="button" data-c="' + c + '" class="' + ((cur.color || '') === c ? 'on' : '') + '" title="' + (c ? 'Use this color' : 'No color') + '" style="background:' + (c || 'linear-gradient(135deg,#fff 46%,#e5484d 47% 53%,#fff 54%)') + '"></button>').join('') + '</div>', (b) => {
            b.querySelector('#rc-colors').addEventListener('click', (e) => { const x = e.target.closest('button'); if (!x || !cur) return; cur.color = x.dataset.c; touch(cur); renderMeta(); renderList(); closeDialog(); toast(cur.color ? 'Recolored!' : 'Color removed!'); });
        });
    }
    function palRender() {
        const q = $('wf-palq').value.trim().toLowerCase();
        const cmds = commands().filter((c) => !q || c[0].toLowerCase().includes(q)).map((c) => ({ label: c[0], hint: c[1], run: c[2], cmd: true }));
        const ns = (q ? notes.filter((n) => !n.trashed && (titleOf(n) + ' ' + (n.tags || []).join(' ') + ' ' + n.text).toLowerCase().includes(q)) : live().slice().sort((a, b) => b.updated - a.updated).slice(0, 8))
            .slice(0, 30).map((n) => ({ label: titleOf(n), hint: nbName(n.nb) || when(n.updated), run: () => { stream = { kind: 'all' }; renderAll(); openNote(n); } }));
        palItems = ns.concat(q ? cmds : cmds.slice(0, 4));
        palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
        $('wf-pallist').innerHTML = palItems.map((it, i) => '<button type="button" class="wf-palrow' + (i === palSel ? ' on' : '') + '" data-i="' + i + '" role="option">' + (it.cmd ? ICON.plus : ICON.all) + '<span>' + esc(it.label) + '</span><small>' + esc(it.hint || '') + '</small></button>').join('') || '<div class="wf-none">Nothing found!</div>';
    }
    function palOpen() { $('wf-palette').hidden = false; $('wf-palq').value = ''; palSel = 0; palRender(); setTimeout(() => $('wf-palq').focus(), 20); }
    const palClose = () => { $('wf-palette').hidden = true; };
    function palGo(i) { const it = palItems[i]; if (!it) return; palClose(); it.run(); }
    $('wf-palq').addEventListener('input', () => { palSel = 0; palRender(); });
    $('wf-palq').addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); palRender(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); palRender(); }
        else if (e.key === 'Enter') { e.preventDefault(); palGo(palSel); }
        else if (e.key === 'Escape') palClose();
        const on = $('wf-pallist').querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    });
    $('wf-pallist').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) palGo(Number(b.dataset.i)); });
    $('wf-palette').addEventListener('mousedown', (e) => { if (e.target === $('wf-palette')) palClose(); });
    $('wf-open-palette').addEventListener('click', palOpen);

    function cycleMode() { if (!cur) return; switchMode(mode === 'visual' ? 'source' : mode === 'source' ? 'view' : 'visual'); }
    function toggleFocus() { body.classList.toggle('wf-focus'); toast(body.classList.contains('wf-focus') ? 'Focus mode on. Press Ctrl+Alt+F to leave!' : 'Focus mode off!'); }
    document.addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); palOpen(); }
        else if (mod && e.altKey && e.code === 'KeyN') { e.preventDefault(); newNote(); }
        else if (mod && e.altKey && e.code === 'KeyF') { e.preventDefault(); toggleFocus(); }
        else if (mod && e.altKey && e.code === 'KeyM') { e.preventDefault(); cycleMode(); }
        else if (mod && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); readMode(); if (cur) { touch(cur); flush(); } toast('Waterflow saves as you type, and just saved again!'); }
        else if (e.key === 'Escape') { if (!$('wf-palette').hidden) palClose(); else if (!$('wf-dialog').hidden) closeDialog(); else if (!$('wf-menu').hidden) $('wf-menu').hidden = true; }
    });

    /* ---------- storage meter ---------- */
    async function meter() {
        let used = notes.reduce((a, n) => a + (n.text || '').length + (n.title || '').length + 200, 0), quota = 0;
        try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); quota = e.quota || 0; } } catch (e) {}
        const fmt = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
        $('wf-meter-n').textContent = fmt(used);
        $('wf-meter-fill').style.width = Math.max(3, Math.min(100, quota ? used / quota * 100 : used / 52428800 * 100)) + '%';
    }

    /* ---------- start ---------- */
    async function boot() {
        applySettings(); loadScratch(); buildTools();
        mode = ['view', 'visual', 'source'].includes(S.mode) ? S.mode : 'visual';
        ed = KD.editor($('wf-visual'), {
            value: '', delay: 300, spellcheck: S.spell,
            onChange: (t) => { if (cur && mode === 'visual' && !playing()) { cur.text = keep(cur, t); afterTextChange(true); } }
        });
        $('wf-visual').addEventListener('input', () => { if (cur && mode === 'visual' && !playing()) { cur.text = keep(cur, ed.getText()); afterTextChange(true); } });
        // BitLang programs (@@program) come alive in Visual and View, and play over the note
        ['wf-visual', 'wf-view'].forEach((id) => {
            const el = $(id); el.setAttribute('data-bl-host', '');
            let q = 0; const wake = () => { clearTimeout(q); q = setTimeout(() => { try { if (BL() && !playing()) BL().hydrate(el); } catch (e) {} }, 60); };
            new MutationObserver(wake).observe(el, { childList: true, subtree: true }); wake();
        });
        $('wf-stage').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) pkLive(); }, true);
        $('wf-visual').addEventListener('keyup', (e) => { if (e.key === ' ' && !e.isComposing && pkLive()) { try { ed.format(); } catch (x) {} cur.text = keep(cur, ed.getText()); afterTextChange(true); } });
        notes = await store.all();
        // the trash empties itself after 30 days
        const old = notes.filter((n) => n.trashed && Date.now() - n.trashed > 30 * 864e5);
        for (const n of old) { await store.del(n.id); }
        notes = notes.filter((n) => !old.includes(n));
        // notes and notebooks colored before Waterflow went Poolside move to the nearest pool color
        let moved = false;
        notes.forEach((n) => { if (OLD_COLOR[n.color]) { n.color = OLD_COLOR[n.color]; dirty.add(n.id); moved = true; } });
        nbs.forEach((b) => { if (OLD_COLOR[b.color]) { b.color = OLD_COLOR[b.color]; moved = true; } });
        if (moved) { saveNbs(); flush(); }
        showMode(mode);
        renderAll(); meter(); legacyOffer();
        const m = /#n=([\w-]+)/.exec(location.hash);
        const first = m && notes.find((n) => n.id === m[1]);
        if (first) openNote(first);
        else if (!notes.length) {
            const pkOn = newLang() === 'pk';
            const hello = blank({ title: 'Welcome to Waterflow', tags: ['welcome'], pinned: true, color: COLORS[3], text: pkOn
                ? '/ Welcome to Waterflow!\nThis note is written in <b Poolside Keydown>: Waterflow\'s own marks, symbols and styles. Type a mark, press Space or Enter, and it turns into formatting!\n\n// Try these\n() A heading starts with a slash: / Title, // Section\n() A quiet quote: << a thought\n() A callout: <! heads up\n() A <ring ring chip>, a <foam foam chip>, a <tile tile chip> and a <drop water drop>\n() A blank to fill in: <blank 8|answer>\n\n/~ rope | Lanes | blue\n\n// Find your way\n(+) Press Ctrl+K to find anything, or Ctrl+Alt+N for a new note\n(+) Switch between View, Visual and Source at the top\n(+) Open the Guide (bottom left) for every Poolside mark\n<< Prefer plain Keydown? Switch any note from its ... menu!\n'
                : '# Welcome to Waterflow!\nThis is a note, and it is written in **Keydown**: type a tag, press Space or Enter, and it turns into formatting right away!\n\n## Try these\n- Type `#G#a green highlight#` and press Space\n- Write `**bold**` or `*italic*`, then press Enter\n- Add a divider: `::divider{aqua|Section|blue}`\n- A blank to fill in: [__8|answer]\n\n## Find your way\n- Press Ctrl+K to find anything, or Ctrl+Alt+N for a new note\n- Switch between View, Visual and Source at the top\n- Make notebooks on the left, and add #tags to any note!\n' });
            notes.push(hello); await store.put(hello); renderAll(); openNote(hello); body.dataset.view = 'list';
        }
    }
    window.addEventListener('hashchange', () => { const m = /#n=([\w-]+)/.exec(location.hash); const n = m && notes.find((x) => x.id === m[1]); if (n && n !== cur) openNote(n); });
    window.Waterflow = { notes: () => notes, open: (id) => openNote(notes.find((n) => n.id === id)), newNote: newNote, highlight: highlight };
    boot();
})();
