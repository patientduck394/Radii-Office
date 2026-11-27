// Dark Keydown for the documentation: this is KdLite (the same loader Beta and Mintcode use). It loads the full Keydown engine, rewrites its styles so every
// fade to "transparent" becomes a fade to white (so chips and gels look right on a dark page), draws Keydown text as safe, inert DOM, and fixes text colors that
// would be hard to read on what is behind them.
// Keydown's own output already escapes raw HTML; this strips anything risky from it again, just in case.
(() => {
  'use strict';
  let loading = null;

  // ---------- see-through gradient stops turn white ----------
  // Keydown's styles fade to "transparent", which reads as black on a dark page. Beta and Mintcode want those fades white, so every style
  // sheet Keydown puts on the page is rewritten once: see-through gradient stops become white (the same rule the old local copy of Keydown had).
  // Left alone: mask gradients, hard-edged px/em stops (dots, stripes, hatches) and glints that are already white.
  const CLEAR = [/\btransparent\b/g, /rgba?\(\s*[\d.]+[ ,]+[\d.]+[ ,]+[\d.]+[ ,/]+0(?:\.0+)?%?\s*\)/g, /#(?:[0-9a-fA-F]{3}0|[0-9a-fA-F]{6}00)(?![0-9a-fA-F])/g, /color\(srgb\s+[\d.]+\s+[\d.]+\s+[\d.]+\s*\/\s*0(?:\.0+)?%?\s*\)/g];
  const UNIT = /\d(?:px|em|rem|vw|vh|ch|pt)\b/;
  const COLOR_AT = /^\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|black)/;
  const parseColor = (c) => {
    let m = /^#([0-9a-fA-F]{3,8})$/.exec(c);
    if (m) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.replace(/./g, (x) => x + x);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(c);
    if (m) return [+m[1], +m[2], +m[3]];
    return c === 'black' ? [0, 0, 0] : null;
  };
  const splitTop = (body) => {
    const parts = [];
    let d = 0, cur = '';
    for (const ch of body) {
      d += (ch === '(') - (ch === ')');
      if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    return parts;
  };
  const colorEnd = (t) => {
    const m = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/.exec(t);
    if (!m) return 0;
    let i = m[0].length;
    if (t[i] === '(') {
      let d = 0;
      while (i < t.length) { d += (t[i] === '(') - (t[i] === ')'); i++; if (d === 0) break; }
    }
    return i;
  };
  const isClear = (x) => { const w = x.trim().split(' ')[0]; return CLEAR.some((rx) => { rx.lastIndex = 0; const m = rx.exec(w); return m && m[0] === w; }); };
  function whiten(css) {
    const GRAD = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/g;
    let out = '', last = 0, m;
    while ((m = GRAD.exec(css))) {
      const a = m.index;
      let i = GRAD.lastIndex, d = 1;
      while (i < css.length && d) { d += (css[i] === '(') - (css[i] === ')'); i++; }
      const open = GRAD.lastIndex, body = css.slice(open, i - 1);
      GRAD.lastIndex = i;
      if (css.slice(Math.max(css.lastIndexOf(';', a), css.lastIndexOf('{', a)), a).includes('mask')) continue;
      const parts = splitTop(body);
      const solid = parts.slice(1).filter((x) => COLOR_AT.test(x) && !isClear(x)).map((x) => parseColor(x.trim().slice(0, colorEnd(x.trim())))).filter(Boolean);
      if (solid.length && solid.every((c) => c[0] >= 240 && c[1] >= 240 && c[2] >= 240)) continue;
      let changed = false;
      const next = parts.map((part) => {
        if (UNIT.test(part)) return part;
        let r = part;
        for (const rx of CLEAR) r = r.replace(rx, () => { changed = true; return '#ffffff'; });
        return r;
      });
      if (!changed) continue;
      out += css.slice(last, open) + next.join(',') + ')';
      last = i;
    }
    return out + css.slice(last);
  }
  const whitened = new WeakSet();
  function whitenSheet(el) {
    if (!el || el.localName !== 'style' || whitened.has(el)) return;
    whitened.add(el);
    const t = el.textContent;
    if (t && t.indexOf('gradient') >= 0 && t.length > 2000) { const w = whiten(t); if (w !== t) el.textContent = w; }
  }
  try {
    new MutationObserver((list) => list.forEach((r) => r.addedNodes.forEach(whitenSheet))).observe(document.head, { childList: true });
    document.head.querySelectorAll('style').forEach(whitenSheet);
  } catch (e) {}

  const load = () => {
    if (window.Keydown) return Promise.resolve(window.Keydown);
    if (loading) return loading;
    loading = new Promise((ok, no) => {
      window.__KeydownNoAuto = true; // we draw things ourselves; do not let it scan the whole page
      const s = document.createElement('script');
      s.src = '/Keydown.js?v=' + (window.DOCS_KD_V || '1'); // the site's own copy of the full engine
      s.onload = () => (window.Keydown ? ok(window.Keydown) : no(new Error('Keydown did not start!')));
      s.onerror = () => {
        loading = null;
        no(new Error('Could not load Keydown. Check your connection and try again!'));
      };
      document.head.append(s);
    });
    return loading;
  };

  const BAD = new Set(['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'link', 'meta', 'style', 'base', 'form', 'template', 'noscript', 'applet', 'portal', 'foreignobject', 'audio', 'video', 'source', 'track']);
  const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'data', 'srcset']);
  const okUrl = (v) => {
    const t = String(v).replace(/[\u0000- ]+/g, '');
    return !/^[a-z][a-z0-9+.-]*:/i.test(t) || /^(https?:|mailto:|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(t);
  };
  function clean(node) {
    for (const el of [...node.children]) {
      const tag = el.localName.toLowerCase();
      if (BAD.has(tag) || (tag === 'input' && el.getAttribute('type') !== 'checkbox')) {
        el.remove();
        continue;
      }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction' || n === 'contenteditable') el.removeAttribute(a.name);
        else if (URL_ATTRS.has(n) && !okUrl(a.value)) el.removeAttribute(a.name);
        else if (n === 'style' && /expression\s*\(|javascript:|@import|url\s*\(\s*["']?\s*(?!data:)/i.test(a.value)) el.removeAttribute(a.name);
      }
      if (tag === 'a' && el.hasAttribute('href')) {
        el.setAttribute('rel', 'noopener noreferrer nofollow');
        if (/^https?:/i.test(el.getAttribute('href'))) el.setAttribute('target', '_blank');
      }
      if (tag === 'input') el.setAttribute('disabled', '');
      clean(el);
    }
  }


  // ---------- adaptive text colors ----------
  // Keydown chips and highlights have bright or dark backgrounds, but plain text inherits the page's text color (light on a dark page,
  // dark on a light one). Wherever that makes the text hard to read, this picks dark or light text from what is behind it.
  const NUM = '([\\d.]+)';
  const RGB = new RegExp('rgba?\\(\\s*' + NUM + '[ ,]+' + NUM + '[ ,]+' + NUM + '(?:[ ,/]+' + NUM + '(%?))?\\s*\\)', 'g');
  const SRGB = new RegExp('color\\(srgb\\s+' + NUM + '\\s+' + NUM + '\\s+' + NUM + '(?:\\s*/\\s*' + NUM + '(%?))?\\)', 'g');
  const colorsIn = (str) => {
    const out = [];
    for (const m of str.matchAll(RGB)) out.push([+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[5] ? +m[4] / 100 : +m[4]]);
    for (const m of str.matchAll(SRGB)) out.push([+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : m[5] ? +m[4] / 100 : +m[4]]);
    return out;
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const over = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  // what an element paints behind its own text: its background color, with the average of its gradients on top
  const layerOf = (cs) => {
    const bc = colorsIn(cs.backgroundColor)[0];
    // sparkles, dots and stripes are made with radial gradients on top of a main linear one, so the linear one says what the color is
    const gradients = (str) => {
      const found = [];
      const re = /(?:repeating-)?(linear|radial|conic)-gradient\(/g;
      let m;
      while ((m = re.exec(str))) {
        let d = 1, i = re.lastIndex;
        while (i < str.length && d) { d += (str[i] === '(') - (str[i] === ')'); i++; }
        found.push([m[1], str.slice(m.index, i)]);
        re.lastIndex = i;
      }
      return found;
    };
    const layers = cs.backgroundImage && cs.backgroundImage !== 'none' ? gradients(cs.backgroundImage) : [];
    const mainLayers = layers.some((g) => g[0] === 'linear') ? layers.filter((g) => g[0] === 'linear') : layers;
    const gs = colorsIn(mainLayers.map((g) => g[1]).join(',')).filter((c) => c[3] > 0.02);
    let layer = bc && bc[3] > 0 ? bc : null;
    if (gs.length) {
      // the average of the gradient's colors, each counted by how solid it is
      const w = gs.reduce((t, c) => t + c[3], 0);
      const avg = [0, 1, 2].map((i) => gs.reduce((t, c) => t + c[i] * c[3], 0) / w);
      avg.push(gs.some((c) => c[3] >= 0.95) ? 1 : Math.min(1, w / gs.length));
      layer = layer ? over(avg, over(layer, [255, 255, 255, 1])) : avg;
    }
    return layer;
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const DARK = [15, 23, 42, 1];
  const LIGHT = [248, 250, 252, 1];
  function adapt(root) {
    root.querySelectorAll('[data-kd-fix]').forEach((e) => { e.style.removeProperty('color'); e.removeAttribute('data-kd-fix'); });
    const page = colorsIn(getComputedStyle(document.body).backgroundColor)[0] || [255, 255, 255, 1];
    const base = page[3] ? [page[0], page[1], page[2], 1] : [255, 255, 255, 1];
    const backdrop = (el) => {
      const chain = [];
      for (let n = el; n && n !== root.parentNode && n !== document.body; n = n.parentElement) chain.unshift(n);
      let c = base;
      for (const n of chain) { const l = layerOf(getComputedStyle(n)); if (l) c = over(l, c); }
      return c;
    };
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('.kdx-block, .kdx-chip, .kdx-t-rainbow, .kdx-t-outline, .kdx-t-redact')) continue; // Keydown Next blocks and effects pick their own colors
      let hasText = false;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.data.trim()) { hasText = true; break; }
      if (!hasText) continue;
      const fg = colorsIn(getComputedStyle(el).color)[0];
      if (!fg) continue;
      const bg = backdrop(el);
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize) || 16;
      const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
      if (contrast(fg, bg) >= (large ? 3 : 4.5)) continue;
      const best = contrast(DARK, bg) >= contrast(LIGHT, bg) ? DARK : LIGHT;
      el.style.setProperty('color', 'rgb(' + best[0] + ',' + best[1] + ',' + best[2] + ')', 'important');
      el.setAttribute('data-kd-fix', '');
    }
  }
  // fix the colors again when the page changes between light and dark
  const rescan = () => document.querySelectorAll('.kd-out, .kdvisual').forEach((e) => { try { adapt(e); } catch (err) {} });
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(rescan, 60)); } catch (e) {}
  window.addEventListener('kd-recolor', () => setTimeout(rescan, 60));
  // for the live editor: look again a moment after the text changes
  function watch(el) {
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => adapt(el), 250); }).observe(el, { childList: true, subtree: true, characterData: true });
  }

  // Keydown text in, a safe <div class="kd-out"> out. Waits for the engine to load first.
  async function render(text) {
    const K = await load();
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + K.render(String(text)), 'text/html');
    clean(doc.body);
    const out = document.createElement('div');
    out.className = 'kd-out';
    out.append(...doc.body.childNodes);
    // Keydown Next: text effects like {rainbow}, and blocks like ::progress. It runs before the safety pass, which then strips anything risky it made (frames, sliders)
    try { if (window.KeydownNext) { window.KeydownNext.apply(out, { editing: false }); clean(out); } } catch (e) {}
    // colors need a real page to be worked out, so it is set up out of sight for a moment
    const stage = document.createElement('div');
    stage.style.cssText = 'position:absolute;left:-99999px;top:0;width:720px;visibility:hidden';
    document.body.append(stage);
    stage.append(out);
    try { adapt(out); } catch (e) {}
    out.remove();
    stage.remove();
    return out;
  }
  window.KdLite = { load, render, clean, adapt, watch };
})();
