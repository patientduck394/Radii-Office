/* =====================================================================
   POOLSIDE KEYDOWN! Waterflow's own way of writing Keydown, with different symbols, formatting and styles.
   Poolside Keydown (PK) is written with lane marks and angle chips, and it is translated to and from
   ordinary Keydown, so the Keydown engine still draws everything (and anything PK has no word for,
   like a table or an equation, is just written the Keydown way inside a PK note).

     PK                              Keydown
     / Title   // Sub   /// Small    # Title   ## Sub   ### Small          (lane marks make headings)
     << a quiet quote                > a quiet quote
     <! a callout   <? a question    !> a callout   ?> a question          (<  plus the Keydown quote mark)
     <: a blue note                  %> a blue note                         (a blue question-style note)
     () dash   (+) plus   (.) dot    - dash   + plus   . dot               (rings make bullets)
     <b bold>   <i italic>           **bold**   *italic*
     <ring x> <lap x> <reef x>       !!:O#x#  !!:C#x#  !!:B#x#             (rim chips: orange, cyan, blue)
     <buoy x> <foam x> <deep x>      #O#x#  #C#x#  #B#x#                   (bubble chips)
     <sun x> <lagoon x> <tile x>     ++O~x++  ++C~x++  ++B~x++             (toast chips)
     <drop x>                        ~WD~x~WD~                             (a water drop)
     <halo x> <sunhalo x>            #C.halo(x)  #O.halo(x)                (halo marks)
     <mark x> <flag x>               #C.marker(x)  #O.marker(x)            (highlighter marks)
     <ink x> <fire x>                #B(x)  #O(x)                          (inks)
     <bubble pennant sign hoop beam mist pearl badge pass say capsule banner tab splash split lens
      dots cone frost neon shimmer under strike frame x>   more chips, each on its own Keydown mark
     <blank 8|answer> <box 6>        [__8|answer]  [##6]                   (blanks to write in)
     /~ rope | Title | blue          ::divider{poolside|Title|blue}        (a divider)
     (_ box|3|Write here _)          ::blank{box|3|Write here}             (room to write)
   ===================================================================== */
(function () {
    'use strict';

    // name, Keydown open, Keydown close, then the Keydown form read back: [regex, which group is the text]
    const INLINE = [
        ['b', '**', '**', /\*\*([^*<>\n]+)\*\*/g],
        ['ring', '!!:O#', '#', /!!:O#([^#<>\n]+)#(?![_~=.])/g],
        ['lap', '!!:C#', '#', /!!:C#([^#<>\n]+)#(?![_~=.])/g],
        ['reef', '!!:B#', '#', /!!:B#([^#<>\n]+)#(?![_~=.])/g],
        ['buoy', '#O#', '#', /(?<![#:!\w])#O#([^#<>\n]+)#(?![_~=.])/g],
        ['foam', '#C#', '#', /(?<![#:!\w])#C#([^#<>\n]+)#(?![_~=.])/g],
        ['deep', '#B#', '#', /(?<![#:!\w])#B#([^#<>\n]+)#(?![_~=.])/g],
        ['sun', '++O~', '++', /\+\+O~([^+<>\n]+)\+\+/g],
        ['lagoon', '++C~', '++', /\+\+C~([^+<>\n]+)\+\+/g],
        ['tile', '++B~', '++', /\+\+B~([^+<>\n]+)\+\+/g],
        ['drop', '~WD~', '~WD~', /~WD~([^~<>\n]+)~WD~/g],
        ['halo', '#C.halo(', ')', /#C\.halo\(([^()<>\n]+)\)/g],
        ['sunhalo', '#O.halo(', ')', /#O\.halo\(([^()<>\n]+)\)/g],
        ['mark', '#C.marker(', ')', /#C\.marker\(([^()<>\n]+)\)/g],
        ['flag', '#O.marker(', ')', /#O\.marker\(([^()<>\n]+)\)/g],
        ['ink', '#B(', ')', /(?<![.\w])#B\(([^()<>\n]+)\)/g],
        ['fire', '#O(', ')', /(?<![.\w])#O\(([^()<>\n]+)\)/g],
        ['bubble', '++C!', '++', /\+\+C!([^+<>\n]+)\+\+/g],
        ['pennant', '++O?', '++', /\+\+O\?([^+<>\n]+)\+\+/g],
        ['sign', '++B%', '++', /\+\+B%([^+<>\n]+)\+\+/g],
        ['hoop', '++O:', '++', /\+\+O:([^+<>\n]+)\+\+/g],
        ['beam', '++B^', '++', /\+\+B\^([^+<>\n]+)\+\+/g],
        ['mist', '++C+', '++', /\+\+C\+([^+<>\n]+)\+\+/g],
        ['pearl', '=C=', '=C=', /(?<![=\w])=C=([^=<>\n]+)=C=/g],
        ['badge', ';;O;', ';;', /;;O;([^;<>\n]+);;/g],
        ['pass', '!!B!', '!!', /!!B!([^!<>\n]+)!!/g],
        ['say', '^^C^', '^^', /\^\^C\^([^^<>\n]+)\^\^/g],
        ['capsule', '%C%', '%', /(?<![%\w#])%C%([^%<>\n]+)%(?![\w])/g],
        ['banner', '#%O%', '%', /#%O%([^%<>\n]+)%(?![\w])/g],
        ['tab', '#^B^', '^', /#\^B\^([^^<>\n]+)\^/g],
        ['splash', '#+C+', '+', /#\+C\+([^+<>\n]+)\+/g],
        ['split', '#:O:', ':', /#:O:([^:<>\n]+):/g],
        ['lens', '#;C;', ';', /#;C;([^;<>\n]+);/g],
        ['dots', '!!;C#', '#', /!!;C#([^#<>\n]+)#(?![_~=.])/g],
        ['cone', '!!~O#', '#', /!!~O#([^#<>\n]+)#(?![_~=.])/g],
        ['frost', '!!%C#', '#', /!!%C#([^#<>\n]+)#(?![_~=.])/g],
        ['neon', '!!+B#', '#', /!!\+B#([^#<>\n]+)#(?![_~=.])/g],
        ['shimmer', '!!/C#', '#', /!!\/C#([^#<>\n]+)#(?![_~=.])/g],
        ['under', '#C#', '#_', /(?<![#:!\w])#C#([^#<>\n]+)#_/g],
        ['strike', '#O#', '#~', /(?<![#:!\w])#O#([^#<>\n]+)#~/g],
        ['frame', '#B#', '#=', /(?<![#:!\w])#B#([^#<>\n]+)#=/g],
        ['i', '*', '*', /(?<![*\w])\*([^*\s<>][^*<>\n]*?)\*(?![*\w(])/g]
    ];
    const NAMES = INLINE.map((r) => r[0]).concat(['blank', 'box']);
    const FORWARD = new RegExp('<(' + NAMES.join('|') + ')\\s([^<>\\n]+)>', 'g');
    const DIVIDERS = { rope: 'poolside', lane: 'dual', tile: 'notched', wave: 'swallow', reef: 'triple', step: 'stepped', crest: 'crest', ticket: 'ticket', buoy: 'gel', glass: 'glass', ring: 'rim', water: 'aqua' };
    const DIV_BACK = {}; Object.keys(DIVIDERS).forEach((k) => { DIV_BACK[DIVIDERS[k]] = k; });
    const QUOTE_MARKS = '!?*+\\-=~$#^@&';   // (a quote written < plus one of these; <: has its own line below)

    // text outside of code fences, inline code and math is where translating happens
    const SKIP = /(`[^`\n]+`(?:\{[^}\n]*\})?|\$\$[\s\S]*?\$\$|\$[^$\s][^$\n]*\$)/g;
    function lines(text, f) {
        let fence = false;
        return String(text).split('\n').map((l) => {
            if (/^\s*```/.test(l)) { fence = !fence; return l; }
            return fence ? l : f(l);
        }).join('\n');
    }
    function outside(line, fn) {
        let out = '', last = 0, m;
        SKIP.lastIndex = 0;
        while ((m = SKIP.exec(line))) { out += fn(line.slice(last, m.index)) + m[0]; last = m.index + m[0].length; }
        return out + fn(line.slice(last));
    }

    /* ---------- Poolside Keydown  ->  Keydown ---------- */
    function inlineToKD(s) {
        let prev;
        do {
            prev = s;
            s = s.replace(FORWARD, (all, name, body) => {
                if (name === 'blank') { const m = /^(\d+)(?:\|(.*))?$/.exec(body); return m ? '[__' + m[1] + (m[2] ? '|' + m[2] : '') + ']' : all; }
                if (name === 'box') { const m = /^(\d+)(?:\|(.*))?$/.exec(body); return m ? '[##' + m[1] + (m[2] ? '|' + m[2] : '') + ']' : all; }
                const r = INLINE.find((x) => x[0] === name);
                return r[1] + body + r[2];
            });
        } while (s !== prev);
        return s;
    }
    function blockToKD(l) {
        let m;
        if ((m = /^(\s*)(\/{1,4})\s+(.*)$/.exec(l))) return m[1] + '#'.repeat(m[2].length) + ' ' + m[3];
        if ((m = /^(\s*)<<\s(.*)$/.exec(l))) return m[1] + '> ' + m[2];
        if ((m = /^(\s*)<:\s(.*)$/.exec(l))) return m[1] + '%> ' + m[2];
        if ((m = new RegExp('^(\\s*)<([' + QUOTE_MARKS + '>])\\s(.*)$').exec(l))) return m[1] + m[2] + '> ' + m[3];
        if ((m = /^(\s*)\(([+.~=*]?)\)\s(.*)$/.exec(l))) return m[1] + (m[2] || '-') + ' ' + m[3];
        if ((m = /^(\s*)\/~\s+(.*)$/.exec(l))) {
            const p = m[2].split('|').map((x) => x.trim());
            p[0] = DIVIDERS[p[0]] || p[0];
            return m[1] + '::divider{' + p.join('|') + '}';
        }
        if ((m = /^(\s*)\(_\s+(.*?)\s+_\)\s*$/.exec(l))) return m[1] + '::blank{' + m[2] + '}';
        return l;
    }
    function toKD(text) {
        return lines(text, (l) => outside(blockToKD(l), inlineToKD));
    }

    /* ---------- Keydown  ->  Poolside Keydown ---------- */
    function inlineToPK(s) {
        INLINE.forEach((r) => { s = s.replace(r[3], (all, body) => '<' + r[0] + ' ' + body + '>'); });
        return s.replace(/\[__(\d+)(?:\|([^\]<>\n]*))?\]/g, (a, n, ans) => '<blank ' + n + (ans ? '|' + ans : '') + '>')
            .replace(/\[##(\d+)(?:\|([^\]<>\n]*))?\]/g, (a, n, ans) => '<box ' + n + (ans ? '|' + ans : '') + '>');
    }
    function blockToPK(l) {
        let m;
        if ((m = /^(\s*)(#{1,4})\s+(.*)$/.exec(l))) return m[1] + '/'.repeat(m[2].length) + ' ' + m[3];
        if ((m = /^(\s*)>>\s(.*)$/.exec(l))) return m[1] + '<> ' + m[2];
        if ((m = /^(\s*)>\s(.*)$/.exec(l))) return m[1] + '<< ' + m[2];
        if ((m = /^(\s*)%>\s(.*)$/.exec(l))) return m[1] + '<: ' + m[2];
        if ((m = new RegExp('^(\\s*)([' + QUOTE_MARKS + '])>\\s(.*)$').exec(l))) return m[1] + '<' + m[2] + ' ' + m[3];
        if ((m = /^(\s*)([-+.~=*])\s(.*)$/.exec(l))) return m[1] + '(' + (m[2] === '-' ? '' : m[2]) + ') ' + m[3];
        if ((m = /^(\s*)::divider\{([^}|]*)((?:\|[^}|]*){0,2})\}\s*$/.exec(l)) && DIV_BACK[m[2].trim()]) return m[1] + '/~ ' + DIV_BACK[m[2].trim()] + m[3].split('|').slice(1).map((x) => ' | ' + x.trim()).join('');
        if ((m = /^(\s*)::blank\{([^}]*)\}\s*$/.exec(l))) return m[1] + '(_ ' + m[2] + ' _)';
        return l;
    }
    function toPK(text) {
        return lines(text, (l) => inlineToPK0(blockToPK(l)));
    }
    function inlineToPK0(l) { return outside(l, inlineToPK); }

    /* ---------- the reference, drawn live from the same translator ---------- */
    const GUIDE = [
        ['Headings', [['/ A big title', ''], ['// A section', ''], ['/// A small heading', '']]],
        ['Quotes and callouts', [['<< A quiet quote', ''], ['<! Heads up, a callout', ''], ['<? A question to think about', ''], ['<: A note in blue', ''], ['<> A pulled quote', '']]],
        ['Lists', [['() First lane', ''], ['() Second lane', ''], ['(+) A plus item', '']]],
        ['Bold, italic and drops', [['Some <b bold> and <i italic> and a <drop water drop>', '']]],
        ['Chips', [['<ring orange ring> <lap cyan ring> <reef blue ring>', ''], ['<buoy buoy> <foam foam> <deep deep>', ''], ['<sun sun> <lagoon lagoon> <tile tile>', '']]],
        ['More chips: signs and flags', [['<bubble bubble> <pennant pennant> <sign sign> <banner banner> <tab tab> <pass pass>', '']]],
        ['More chips: water and light', [['<pearl pearl> <hoop hoop> <beam beam> <mist mist> <lens lens> <splash splash> <say say>', '']]],
        ['More chips: badges and frames', [['<badge badge> <capsule capsule> <split split> <dots dots> <cone cone> <frost frost> <neon neon> <shimmer shimmer>', '']]],
        ['Underline, strike and frame', [['<under underlined> <strike struck> <frame framed>', '']]],
        ['Marks and inks', [['<halo halo> <sunhalo sunhalo> <mark marker> <flag flag> <ink ink> <fire fire>', '']]],
        ['Blanks to write in', [['Water is <blank 8|wet> and a box is <box 6>', ''], ['(_ box|2|Write here _)', '']]],
        ['Dividers', [['/~ rope | Lane one | blue', ''], ['/~ ring | Lane two | orange', ''], ['/~ glass | Lane three | cyan', '']]]
    ];
    const ESC = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function guide(render) {
        return '<div class="pk-guide"><p class="pk-lead">Poolside Keydown has its own marks. Anything it has no mark for (tables, equations, code fences) is written the Keydown way inside it.</p>' + GUIDE.map((g) => '<h4>' + g[0] + '</h4>' + g[1].map((r) => '<div class="pk-row"><code>' + ESC(r[0]) + '</code><div class="pk-draw keydown-doc">' + render(toKD(r[0])) + '</div></div>').join('')).join('') + '</div>';
    }

    window.PK = { toKD: toKD, toPK: toPK, guide: guide, NAMES: NAMES, DIVIDERS: DIVIDERS, QUOTE_MARKS: QUOTE_MARKS };
})();
