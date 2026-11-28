#!/usr/bin/env python3
"""One-off styling pass for the hand-written docs pages: turns lead-in bold words and page labels into real Keydown chips,
rotating through every family in docs/generated/style-pool.json (made by scripts/build_docs.mjs). Safe to run again: it only
touches **bold** lead-ins and the first-line label, and chips are not bold, so a second run changes the labels only."""
import json, os, random, re, glob, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pool = json.load(open(os.path.join(ROOT, 'docs/generated/style-pool.json')))
FAMS, UNIQ = pool['pool'], pool['unique']
SKIP = re.compile(r'^(suave|keydown-gallery|keydown-reference|keydown-blocks|keydown-next|keydown-looks|keydown-files|bitlang|plume|faq)')
BAD = re.compile(r'[&()#<>|$`\\{}\[\]@]')

def chip(rng, state, term):
    """A random real Keydown style around the term."""
    while True:
        if rng.random() < 0.22:                      # a Unique Style now and then
            u = rng.choice(UNIQUE_OK)
            tag = f"@{u['id']}-{rng.randint(1,5)}@{term}@"; name = 'u:' + u['id']
        else:
            f = rng.choice(FAMS)
            tag = f['tags'][rng.randint(0, 11)]
            i = tag.rindex('text'); tag = tag[:i] + term + tag[i + 4:]; name = f['name']
        if name != state['last']:
            state['last'] = name
            return tag

# Unique Styles that are short enough to read as a label (pick the plain families)
# the Unique Styles that stay readable as short labels on a dark page (checked on a contact sheet of the first 100 families)
_SAFE = [0,2,3,4,5,6,7,8,12,13,14,15,16,17,18,19,20,21,22,23,24,25,27,28,29,30,31,32,33,34,35,37,38,39,40,41,42,43,44,45,46,48,49,50,56,57,58,59,61,62,63,64,65,66,68,70,71,72,73,74,75,76,77,86,90]
UNIQUE_OK = [UNIQ[i] for i in _SAFE if i < len(UNIQ)]

def style(text, seed):
    rng = random.Random(seed); state = {'last': ''}
    out, fence, first_para_done = [], False, False
    for line in text.split('\n'):
        if line.startswith('```'): fence = not fence; out.append(line); continue
        if fence: out.append(line); continue
        # the label chip at the start of an intro line, like !!#B#Documents# **Writeout** is ...
        m = re.match(r'^(!!#[A-Z]+#)([^#]+)#(.*)$', line)
        if m and not BAD.search(m.group(2)):
            line = chip(rng, state, m.group(2)) + m.group(3)
        def conv(mm):
            term = mm.group(1)
            if len(term) > 30 or BAD.search(term): return mm.group(0)
            return chip(rng, state, term)
        if re.match(r'^(\* |\d+\. )\*\*', line):
            line = re.sub(r'^((?:\* |\d+\. ))\*\*([^*]+)\*\*', lambda mm: mm.group(1) + conv(type('M', (), {'group': lambda self, i: mm.group(2), })()) if True else '', line, count=1)
        elif re.match(r'^\| \*\*[^*]+\*\* \|', line):
            line = re.sub(r'^\| \*\*([^*]+)\*\* \|', lambda mm: '| ' + conv(type('M', (), {'group': lambda self, i: mm.group(1)})()) + ' |', line, count=1)
        elif not first_para_done and re.match(r'^(![^ ]+ |[#@%=^+].* )?\*\*[^*]+\*\* ', line) and '**' in line and not line.startswith('#'):
            line = re.sub(r'\*\*([^*]+)\*\*', lambda mm: conv(type('M', (), {'group': lambda self, i: mm.group(1)})()), line, count=1)
            first_para_done = True
        # every other short bold word in the line (outside `code`) becomes a chip most of the time
        if not line.startswith('#') and not line.startswith('|  ') and '**' in line:
            segs = re.split(r'(`[^`]*`)', line)
            for k, seg in enumerate(segs):
                if seg.startswith('`'): continue
                segs[k] = re.sub(r'\*\*([^*]{1,22})\*\*', lambda mm: (chip(rng, state, mm.group(1)) if (not BAD.search(mm.group(1)) and rng.random() < 0.75) else mm.group(0)), seg)
            line = ''.join(segs)
        out.append(line)
    return '\n'.join(out)

n = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'docs/pages/*.kd'))):
    base = os.path.basename(f)[:-3]
    if SKIP.match(base): continue
    s = open(f).read(); t = style(s, base)
    if t != s: open(f, 'w').write(t); n += 1; print('styled', base)
print(n, 'pages styled')
