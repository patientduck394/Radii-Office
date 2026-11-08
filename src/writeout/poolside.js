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
     /~ rope | Title | blue          ::divider{poolside|Title|blue}        (a divider: 24 styles)
     <* <+ <- <= <~ <$ <# <^ <@ <&   *> +> -> => ~> $> #> ^> @> &>          (ten more note styles: marker, tip, stop, lane, whisper, sticky, console, ribbon, bubble, card)
     <cover x>                       *sp(x)                                (a pool cover over a spoiler)
     <link url words>  <pic url alt> [words](url)   ![alt](url)            (links and pictures)
     [= Lane | Time =]  [ 1 | 52 ]   | Lane | Time |  | --- | --- |  | 1 | 52 |   (a table: a header row and plain rows)
     ```js{deep|Title}               ```js{blueprint|Title}                (code styles: deep, foam, buoy, lane, tile, night, glow, drop, diff)
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
        ['cover', '*sp(', ')', /\*sp\(([^()<>\n]+)\)/g],
        ['i', '*', '*', /(?<![*\w])\*([^*\s<>][^*<>\n]*?)\*(?![*\w(])/g]
    ];
    const NAMES = INLINE.map((r) => r[0]).concat(['blank', 'box', 'link', 'pic']);
    const FORWARD = new RegExp('<(' + NAMES.join('|') + ')\\s([^<>\\n]+)>(?=(<)?)', 'g');
    const ZW = '\u200b';   // (an invisible separator, so two chips written side by side do not run their # marks together)
    const DIVIDERS = { rope: 'poolside', lane: 'dual', tile: 'notched', wave: 'swallow', reef: 'triple', step: 'stepped', crest: 'crest', ticket: 'ticket', buoy: 'gel', glass: 'glass', ring: 'rim', water: 'aqua',
        ripple: 'wavy', dots: 'dotted', dash: 'dashed', zigzag: 'zigzag', glow: 'glow', ruler: 'ruler', stitch: 'stitched', bubbles: 'bubbles', scallop: 'scallop', beacon: 'neon', arrows: 'arrows', fade: 'fade' };
    // code block styles: Poolside names for Keydown's nine (```js{deep|Title} is ```js{blueprint|Title})
    const FENCES = { deep: 'blueprint', foam: 'paper', buoy: 'ember', lane: 'terminal', tile: 'mac', night: 'dark', glow: 'neon', drop: 'gel', diff: 'diff' };
    const FENCE_BACK = {}; Object.keys(FENCES).forEach((k) => { FENCE_BACK[FENCES[k]] = k; });
    const DIV_BACK = {}; Object.keys(DIVIDERS).forEach((k) => { DIV_BACK[DIVIDERS[k]] = k; });
    const QUOTE_MARKS = '!?*+\\-=~$#^@&';   // (a quote written < plus one of these; <: has its own line below)

    // text outside of code fences, inline code and math is where translating happens
    const SKIP = /(`[^`\n]+`(?:\{[^}\n]*\})?|\$\$[\s\S]*?\$\$|\$[^$\s][^$\n]*\$)/g;
    function lines(text, f, g) {
        let fence = false;
        return String(text).split('\n').map((l) => {
            if (/^\s*```/.test(l)) { fence = !fence; return fence && g ? g(l) : l; }
            return fence ? l : f(l);
        }).join('\n');
    }
    const fenceStyle = (map) => (l) => l.replace(/^(\s*```[\w+#.-]*)\{([^}|]*)((?:\|[^}]*)?)\}/, (all, head, st, rest) => head + '{' + (map[st.trim()] || st) + rest + '}');
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
            s = s.replace(FORWARD, (all, name, body, next) => {
                if (name === 'link') { const m = /^(\S+)\s+(.+)$/.exec(body); return m ? '[' + m[2] + '](' + m[1] + ')' + (next ? ZW : '') : all; }
                if (name === 'pic') { const m = /^(\S+)(?:\s+(.*))?$/.exec(body); return m ? '![' + (m[2] || '') + '](' + m[1] + ')' : all; }
                if (name === 'blank') { const m = /^(\d+)(?:\|(.*))?$/.exec(body); return m ? '[__' + m[1] + (m[2] ? '|' + m[2] : '') + ']' : all; }
                if (name === 'box') { const m = /^(\d+)(?:\|(.*))?$/.exec(body); return m ? '[##' + m[1] + (m[2] ? '|' + m[2] : '') + ']' : all; }
                const r = INLINE.find((x) => x[0] === name);
                return r[1] + body + r[2] + (next ? ZW : '');
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
        if ((m = /^(\s*)<pic\s+(\S+)(?:\s+(.*))?>\s*$/.exec(l))) return m[1] + '![' + (m[3] || '') + '](' + m[2] + ')';
        // a table: [= Lane | Time =] is the header row (a separator line follows it), [ 1 | 52 ] is a row
        if ((m = /^(\s*)\[=\s(.*)\s=\]\s*$/.exec(l))) { const cells = m[2].split('|'); return m[1] + '| ' + cells.map((c) => c.trim()).join(' | ') + ' |\n' + m[1] + '|' + cells.map(() => ' --- |').join(''); }
        if ((m = /^(\s*)\[\s(.*\|.*)\s\]\s*$/.exec(l))) return m[1] + '| ' + m[2].split('|').map((c) => c.trim()).join(' | ') + ' |';
        return l;
    }
    function toKD(text) {
        return lines(text, (l) => outside(blockToKD(l), inlineToKD), fenceStyle(FENCES));
    }

    /* ---------- Keydown  ->  Poolside Keydown ---------- */
    function inlineToPK(s) {
        INLINE.forEach((r) => { s = s.replace(r[3], (all, body) => '<' + r[0] + ' ' + body + '>'); });
        s = s.replace(/(?<!!)\[([^\]<>\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (a, w, u) => '<link ' + u + ' ' + w + '>');
        s = s.replace(/\u200b(?=<)/g, '');
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
        if ((m = /^(\s*)!\[([^\]\n]*)\]\((https:\/\/[^)\s]+)\)\s*$/.exec(l))) return m[1] + '<pic ' + m[3] + (m[2] ? ' ' + m[2] : '') + '>';
        return l;
    }
    // a Keydown table (a header row, a line of ---, then rows) is written [= header =] and [ row ] in Poolside Keydown
    function tablesToPK(text) {
        const L = String(text).split('\n'), out = [];
        let fence = false;
        for (let i = 0; i < L.length; i++) {
            const l = L[i];
            if (/^\s*```/.test(l)) { fence = !fence; out.push(l); continue; }
            const row = !fence && /^(\s*)\|(.*)\|\s*$/.exec(l);
            if (row && !/^\s*\|[\s:|-]+\|\s*$/.test(l)) {
                const cells = row[2].split('|').map((c) => c.trim());
                const next = L[i + 1];
                if (next && /^\s*\|[\s:|-]+\|\s*$/.test(next) && /---/.test(next)) { out.push(row[1] + '[= ' + cells.join(' | ') + ' =]'); i++; continue; }
                out.push(row[1] + '[ ' + cells.join(' | ') + ' ]'); continue;
            }
            out.push(l);
        }
        return out.join('\n');
    }
    function toPK(text) {
        return lines(tablesToPK(text), (l) => inlineToPK0(blockToPK(l)), fenceStyle(FENCE_BACK));
    }
    function inlineToPK0(l) { return outside(l, inlineToPK); }

    /* ---------- the reference, drawn live from the same translator ---------- */
    const GUIDE = [
        ['Headings', [['/ A big title', ''], ['// A section', ''], ['/// A small heading', '']]],
        ['Quotes and callouts', [['<< A quiet quote', ''], ['<! Heads up, a callout', ''], ['<? A question to think about', ''], ['<: A note in blue', ''], ['<> A pulled quote', '']]],
        ['More notes', [['<* A marker note, highlighted', ''], ['<+ A tip', ''], ['<- A stop note', ''], ['<= A lane box', ''], ['<~ A whisper', ''], ['<$ A sticky note', ''], ['<# A console note', ''], ['<^ A ribbon note', ''], ['<@ A speech bubble', ''], ['<& A tile card', '']]],
        ['Lists', [['() First lane', ''], ['() Second lane', ''], ['(+) A plus item', '']]],
        ['Bold, italic and drops', [['Some <b bold> and <i italic> and a <drop water drop>', '']]],
        ['Chips', [['<ring orange ring> <lap cyan ring> <reef blue ring>', ''], ['<buoy buoy> <foam foam> <deep deep>', ''], ['<sun sun> <lagoon lagoon> <tile tile>', '']]],
        ['More chips: signs and flags', [['<bubble bubble> <pennant pennant> <sign sign> <banner banner> <tab tab> <pass pass>', '']]],
        ['More chips: water and light', [['<pearl pearl> <hoop hoop> <beam beam> <mist mist> <lens lens> <splash splash> <say say>', '']]],
        ['More chips: badges and frames', [['<badge badge> <capsule capsule> <split split> <dots dots> <cone cone> <frost frost> <neon neon> <shimmer shimmer>', '']]],
        ['Underline, strike and frame', [['<under underlined> <strike struck> <frame framed>', '']]],
        ['Marks and inks', [['<halo halo> <sunhalo sunhalo> <mark marker> <flag flag> <ink ink> <fire fire>', '']]],
        ['Blanks to write in', [['Water is <blank 8|wet> and a box is <box 6>', ''], ['(_ box|2|Write here _)', '']]],
        ['Dividers', [['/~ rope | Lane one | blue', ''], ['/~ ring | Lane two | orange', ''], ['/~ glass | Lane three | cyan', ''], ['/~ ripple | Ripple | blue', ''], ['/~ dots | Dots | cyan', ''], ['/~ dash | Dash | orange', ''], ['/~ zigzag | Zigzag | blue', ''], ['/~ glow | Glow | cyan', ''], ['/~ ruler | Ruler | blue', ''], ['/~ stitch | Stitch | orange', ''], ['/~ bubbles | Bubbles | cyan', ''], ['/~ scallop | Scallop | blue', ''], ['/~ beacon | Beacon | orange', ''], ['/~ arrows | Arrows | blue', ''], ['/~ fade | Fade | cyan', ''], ['/~ crest | Crest | orange', ''], ['/~ ticket | Ticket | blue', '']]],
        ['Code styles', [['```js{deep|Deep}\nlet a = 1;\n```', ''], ['```js{foam|Foam}\nlet a = 1;\n```', ''], ['```js{buoy|Buoy}\nlet a = 1;\n```', ''], ['```js{lane|Lane}\nls -la\n```', ''], ['```js{tile|Tile}\nlet a = 1;\n```', ''], ['```js{night|Night}\nlet a = 1;\n```', ''], ['```js{glow|Glow}\nlet a = 1;\n```', ''], ['```js{drop|Drop}\nlet a = 1;\n```', '']]],
        ['Covers, links and pictures', [['A <cover pool cover> hides a secret until you click it', ''], ['Visit <link https://radii-office.com the Radii Office site>', ''], ['<pic https://radii-office.com/logo.png the logo>', '']]],
        ['Tables', [['[= Lane | Swimmer | Time =]\n[ 1 | Ada | 52.3 ]\n[ 2 | Bo | 53.0 ]', '']]]
    ];
    const ESC = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function guide(render) {
        return '<div class="pk-guide"><p class="pk-lead">Poolside Keydown has its own marks. Anything it has no mark for (tables, equations, code fences) is written the Keydown way inside it.</p>' + GUIDE.map((g) => '<h4>' + g[0] + '</h4>' + g[1].map((r) => '<div class="pk-row"><code>' + ESC(r[0]) + '</code><div class="pk-draw keydown-doc">' + render(toKD(r[0])) + '</div></div>').join('')).join('') + '</div>';
    }

    // what the toolbar menus list
    const NOTES = [['Quiet quote', '<<'], ['Alert', '<!'], ['Question', '<?'], ['Blue note', '<:'], ['Pulled quote', '<>'], ['Marker note', '<*'], ['Tip', '<+'], ['Stop note', '<-'], ['Lane box', '<='], ['Whisper', '<~'], ['Sticky note', '<$'], ['Console note', '<#'], ['Ribbon note', '<^'], ['Speech bubble', '<@'], ['Tile card', '<&']];
    window.PK = { toKD: toKD, toPK: toPK, guide: guide, NAMES: NAMES, DIVIDERS: DIVIDERS, FENCES: FENCES, NOTES: NOTES, QUOTE_MARKS: QUOTE_MARKS };
})();
