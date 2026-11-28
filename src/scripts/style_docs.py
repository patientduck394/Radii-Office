#!/usr/bin/env python3
"""Styles the hand-written docs pages with Keydown highlight pens, on purpose and not at random.

Sources live in scripts/docs-src/*.kd (plain **bold** words); the styled pages are written to docs/pages/*.kd, so the pass can be rerun any time.
Only highlight-like looks are used (the Annotator's highlight, gel box and named pens like marker, bubble, bucket and flag): no Unique Styles and no Aero chips.
The pen repeats where things belong together, and the COLOR changes from item to item:
  * every bulleted or numbered list gets ONE pen, and its items take the colors in turn;
  * every table gets ONE pen for its first column (bold words, or code-only file extensions), the colors changing row by row;
  * every page gets ONE pen for the short bold words inside its sentences, and the color changes with each section (## heading);
  * the label at the top of an app page, like !!#B#Documents#, becomes a gel box in the same color (all app labels match)."""
import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAD = re.compile(r'[&()#<>|$`\\{}\[\]@]')
# pens that stay readable on the dark page (checked on a contact sheet); each one is a highlight-like look
PENS = ['highlight', 'box', 'marker', 'halo', 'gem', 'spotlight', 'accent', 'bubble', 'dusk', 'aurora', 'belt', 'bucket', 'torpedo', 'bottle', 'pixel', 'flag', 'packet']
COLORS = ['R', 'O', 'GL', 'Y', 'L', 'G', 'TU', 'T', 'C', 'B', 'PR', 'PK']

# each app's own color: the frames on the Products page, and the colors of the newer apps (Phosphor emerald, Beta lime, Mintcode mint, Overshare purple)
APP_COLORS = {'Writeout': 'C', 'Bitbook': 'PR', 'Amber': 'GL', 'Imbuer': 'G', 'Inkpath': 'PK', 'Peeker': 'O', 'Omicron': 'O', 'Mainkey': 'PR', 'Formly': 'PR',
              'Hexa': 'G', 'Taskra': 'C', 'Cabinet': 'R', 'Zonerider': 'L', 'Delta': 'PK', 'Waterflow': 'C', 'Yuzu': 'B', 'Phosphor': 'G', 'Antimony': 'C',
              'Beta': 'L', 'Mintcode': 'TU', 'Overshare': 'PR', 'Trigger': 'O', 'OpenDB': 'C'}

def pen(name, color, word):
    if name == 'highlight': return f"#{color}#{word}##"
    if name == 'box': return f"#{color}#{word}#="
    return f"#{color}.{name}({word})"

def pick_pen(h, used):
    """A pen that has not been used yet on this page (when there are still some left)."""
    for k in range(len(PENS)):
        name = PENS[(h + k * 7) % len(PENS)]
        if name not in used:
            used.add(name); return name
    return PENS[h % len(PENS)]

def seed_of(s): return sum(ord(ch) * (i + 1) for i, ch in enumerate(s))

def style_page(text, seed):
    h = seed_of(seed); used = set()
    page_pen = pick_pen(h, used); base = h // 3
    section = [0]
    def term(w): return pen(page_pen, COLORS[(base + section[0] * 5) % len(COLORS)], w)
    # the label chip at the start of a line or list item (a Rim chip like !!#B#Nova#) becomes a gel box in the same color
    lines = [re.sub(r'^((?:\* |\d+\. )?)!!#([A-Z]+)#([^#]+)#', lambda m: f"{m.group(1)}#{m.group(2)}#{m.group(3)}#=", l) for l in text.split('\n')]
    out, fence, i = [], False, 0
    def inline(line):
        """Short bold words outside `code` become the page's pen, in the current section's color."""
        segs = re.split(r'(`[^`]*`)', line)
        for k, seg in enumerate(segs):
            if seg.startswith('`'): continue
            segs[k] = re.sub(r'\*\*([^*]{1,22})\*\*', lambda m: m.group(0) if BAD.search(m.group(1)) else term(m.group(1)), seg)
        return ''.join(segs)
    while i < len(lines):
        line = lines[i]
        if line.startswith('```'): fence = not fence; out.append(line); i += 1; continue
        if fence: out.append(line); i += 1; continue
        if line.startswith('## '): section[0] += 1
        # the label chip at the start of an app page: a gel box in the same color
        is_item = re.match(r'^(\* |\d+\. )', line)
        is_row = line.startswith('| ') and not line.startswith('| ---')
        if is_item or is_row:
            j = i
            test = (lambda l: re.match(r'^(\* |\d+\. )', l)) if is_item else (lambda l: l.startswith('|'))
            while j < len(lines) and test(lines[j]): j += 1
            block = lines[i:j]; bpen = pick_pen(h + i * 3, used); n = [0]
            def nxt(w):
                c = COLORS[(base + 4 + section[0] * 3 + n[0]) % len(COLORS)]; n[0] += 1
                return pen(bpen, c, w)
            for bl in block:
                if is_item:
                    mm = re.match(r'^((?:\* |\d+\. ))\*\*([^*]{1,80})\*\*(.*)$', bl)
                    if mm and not BAD.search(mm.group(2)): bl = mm.group(1) + nxt(mm.group(2)) + inline(mm.group(3))
                    else: bl = inline(bl)
                else:
                    cells = bl.split('|')
                    if len(cells) >= 4:
                        mm = re.match(r'^\s*\*\*([^*]{1,30})\*\*\s*$', cells[1])
                        if mm and not BAD.search(mm.group(1)): cells[1] = ' ' + nxt(mm.group(1)) + ' '
                        elif re.match(r'^\s*(`[^`]+`\s*)+$', cells[1]):
                            c = COLORS[(base + 4 + section[0] * 3 + n[0]) % len(COLORS)]; n[0] += 1
                            cells[1] = ' ' + ' '.join(pen(bpen, c, w) for w in re.findall(r'`([^`]+)`', cells[1]) if not BAD.search(w)) + ' '
                        for c in range(2, len(cells) - 1): cells[c] = inline(cells[c])
                        bl = '|'.join(cells)
                out.append(bl)
            i = j; continue
        if not line.startswith('#') or line.startswith('#='): line = inline(line)
        out.append(line); i += 1
    return '\n'.join(out)

def style_start_apps(text, seed):
    """The start page's table lists app names in its second column: one pen for the whole column, the colors changing row by row."""
    p = pick_pen(seed_of(seed) + 11, set()); out, intab, n = [], False, 0
    for l in text.split('\n'):
        if l.startswith('| Need |'): intab = True
        cells = l.split('|')
        if intab and l.startswith('| ') and len(cells) >= 5 and not l.startswith('| Need') and not l.startswith('| ---'):
            names = [x.strip() for x in cells[2].split(',')]
            cells[2] = ' ' + ', '.join(pen(p, APP_COLORS.get(w, 'Y'), w) for w in names) + ' '; n += 1
            l = '|'.join(cells)
        out.append(l)
    return '\n'.join(out)

count = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'scripts/docs-src/*.kd'))):
    base = os.path.basename(f)[:-3]
    t = style_page(open(f).read(), base)
    if base == 'start': t = style_start_apps(t, base)
    open(os.path.join(ROOT, 'docs/pages', base + '.kd'), 'w').write(t); count += 1
print(count, 'pages styled from scripts/docs-src')
