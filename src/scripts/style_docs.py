#!/usr/bin/env python3
"""Styles the hand-written docs pages with real Keydown chips, on purpose and not at random.

Sources live in scripts/docs-src/*.kd (plain **bold** words); the styled pages are written to docs/pages/*.kd, so the pass can be rerun any time.
The rules:
  * every bulleted or numbered list gets ONE style, repeated on the bold lead-in of every item in it;
  * every table gets ONE style, repeated on every bold word in its first column (the start page's app column gets its own);
  * every page gets ONE "term" style for the short bold words inside its sentences, so the same kind of word always looks the same;
  * the label chip at the top of an app page (a Rim chip, like !!#B#Documents#) is left as written, so all the app labels match.
Styles come from docs/generated/style-pool.json (made by scripts/build_docs.mjs): 295 families with 16 colors each, plus Unique Styles."""
import json, os, random, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pool = json.load(open(os.path.join(ROOT, 'docs/generated/style-pool.json')))
FAMS, UNIQ = pool['pool'], pool['unique']
BAD = re.compile(r'[&()#<>|$`\\{}\[\]@]')
# the Unique Styles that stay readable as short labels on a dark page (checked on a contact sheet of the first 100 families)
_SAFE = [0,2,3,4,5,6,7,8,12,13,14,15,16,17,18,19,20,21,22,23,24,25,27,28,29,30,31,32,33,34,35,37,38,39,40,41,42,43,44,45,46,48,49,50,56,57,58,59,61,62,63,64,65,66,68,70,71,72,73,74,75,76,77,86,90]
# Unique Styles that only change the look of the letters (no box of their own) read as plain bold on a label, so they are left out
_TEXT_ONLY = {'graffiti', 'element', 'glowtext', 'gradtext', 'shimmer', 'extruded', 'diecut'}
UNIQUE_OK = [UNIQ[i] for i in _SAFE if i < len(UNIQ) and UNIQ[i]['id'] not in _TEXT_ONLY]

def pick_style(rng, avoid):
    """One style (a function word -> Keydown tag) that is not in the avoid set."""
    while True:
        if rng.random() < 0.2:
            u = rng.choice(UNIQUE_OK); n = rng.randint(1, 5); key = 'u:' + u['id']
            make = lambda w, u=u, n=n: f"@{u['id']}-{n}@{w}@"
        else:
            f = rng.choice(FAMS); tag = f['tags'][rng.randint(0, 11)]; key = f['name']
            make = lambda w, tag=tag: tag[:tag.rindex('text')] + w + tag[tag.rindex('text') + 4:]
        if key not in avoid:
            avoid.add(key)
            return make

# looks that sit nicely inside a sentence: gel chip, Aero chip, glass chip, toast chip, gloss pill, highlight, Rim chip, Aero mark
INLINE = [lambda c, w: f"#{c}#{w}#", lambda c, w: f"++{c}+{w}++", lambda c, w: f"++{c}={w}++", lambda c, w: f"++{c}~{w}++",
          lambda c, w: f"%{c}%{w}%", lambda c, w: f"#{c}#{w}##", lambda c, w: f"!!#{c}#{w}#", lambda c, w: f"++{c}!){w}++"]
TERM_COLORS = ['B', 'G', 'O', 'T', 'PR', 'PK', 'C', 'R', 'L', 'GL', 'TU', 'Y']
def pick_term(seed):
    h = sum(ord(ch) * (i + 1) for i, ch in enumerate(seed))
    look = INLINE[h % len(INLINE)]; color = TERM_COLORS[(h // 7) % len(TERM_COLORS)]
    return lambda w: look(color, w)

def style_page(text, seed):
    rng = random.Random(seed)
    used = set()
    term = pick_term(seed)                            # the page's one style for bold words inside sentences
    lines = text.split('\n')
    out, fence, i = [], False, 0
    def inline(line, make):
        """Short bold words outside `code` become chips in the given style."""
        segs = re.split(r'(`[^`]*`)', line)
        for k, seg in enumerate(segs):
            if seg.startswith('`'): continue
            segs[k] = re.sub(r'\*\*([^*]{1,22})\*\*', lambda m: m.group(0) if BAD.search(m.group(1)) else make(m.group(1)), seg)
        return ''.join(segs)
    while i < len(lines):
        line = lines[i]
        if line.startswith('```'): fence = not fence; out.append(line); i += 1; continue
        if fence: out.append(line); i += 1; continue
        is_item = re.match(r'^(\* |\d+\. )', line)
        is_row = line.startswith('| ') and not line.startswith('| ---')
        if is_item or is_row:
            # a whole list or table: one style for all of it
            j = i
            pat = (lambda l: re.match(r'^(\* |\d+\. )', l)) if is_item else (lambda l: l.startswith('|'))
            while j < len(lines) and pat(lines[j]): j += 1
            block = lines[i:j]
            make = pick_style(rng, used)
            for bl in block:
                if is_item:
                    m = re.match(r'^((?:\* |\d+\. ))\*\*([^*]{1,80})\*\*(.*)$', bl)
                    if m and not BAD.search(m.group(2)):
                        bl = m.group(1) + make(m.group(2)) + inline(m.group(3), term)
                    else:
                        bl = inline(bl, term)
                else:
                    cells = bl.split('|')
                    if len(cells) >= 4:
                        m = re.match(r'^\s*\*\*([^*]{1,30})\*\*\s*$', cells[1])
                        if m and not BAD.search(m.group(1)): cells[1] = ' ' + make(m.group(1)) + ' '
                        # a first column that is only `code` (file extensions) gets the table's style too
                        elif re.match(r'^\s*(`[^`]+`\s*)+$', cells[1]):
                            cells[1] = ' ' + ' '.join(make(w) for w in re.findall(r'`([^`]+)`', cells[1]) if not BAD.search(w)) + ' '
                        for c in range(2, len(cells) - 1): cells[c] = inline(cells[c], term)
                        bl = '|'.join(cells)
                out.append(bl)
            i = j
            continue
        if not line.startswith('#'): line = inline(line, term)
        out.append(line); i += 1
    return '\n'.join(out)

def style_start_apps(text, seed):
    """The start page's table lists app names in its second column: one style for the whole column."""
    rng = random.Random(seed + '-apps'); make = pick_style(rng, set())
    out, intab = [], False
    for l in text.split('\n'):
        if l.startswith('| Need |'): intab = True
        cells = l.split('|')
        if intab and l.startswith('| ') and len(cells) >= 5 and not l.startswith('| Need') and not l.startswith('| ---'):
            cells[2] = ' ' + ', '.join(make(n.strip()) for n in cells[2].split(',')) + ' '
            l = '|'.join(cells)
        out.append(l)
    return '\n'.join(out)

n = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'scripts/docs-src/*.kd'))):
    base = os.path.basename(f)[:-3]
    t = style_page(open(f).read(), base)
    if base == 'start': t = style_start_apps(t, base)
    open(os.path.join(ROOT, 'docs/pages', base + '.kd'), 'w').write(t); n += 1
print(n, 'pages styled from scripts/docs-src')
