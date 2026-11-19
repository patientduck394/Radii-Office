/* =====================================================================
   Keydown Next: three new things Keydown can do, on top of every Keydown engine (Writeout, Bitbook, Amber, OpenDB,
   Keydown.js and the Svelte components). It runs after Keydown has drawn a page: KeydownNext.apply(root).

   1. CUSTOM TAGS: invent your own tags inside the document, with CSS:
        @style ~~sale~~ { background: linear-gradient(#ff8a00, #e52e71); color: #fff; border-radius: 999px; padding: 0 10px; }
        Everything is ~~sale~~50% off~~sale~~ today!
      (a different closing tag: @style <<star <<end { … }; pseudo parts: &::before { … } and &::after { … } inside)
   2. LIVE VALUES: documents that calculate:
        {{price = 4.50}} {{qty = 3}}           set values (hidden when reading, little chips while editing)
        {{price * qty}}  {{money(price*qty)}}  show results; {{today}}, {{days_until("2026-12-25")}}...
        {{check paid}} {{counter tickets = 2}} {{slider temp = 27 from 20 to 34}}   things to click that change the totals
   3. INTERACTIVE BLOCKS: lines from ::name to ::end become something you can use:
        ::chart bar|line|pie|donut Title   (a | table | of | rows |)       ::poll Question (* options)
        ::quiz Question (* [x] right answer, * wrong ones)                   ::scene (a .zr/.glb/.gltf link, or .zr text)
        ::timer 5:00 Label   and   ::map 38.72, -9.14 13 Label   (one line each)
        ::progress 70% Label   ::countdown 2026-12-25 Label   ::rating 4/5 Label   (one line each)
        ::steps (* [x] done step, * next step)   ::stats (| Label | 1,204 | +12% |)   ::fold Title (hidden text)   ::timeline (* 2020 - Started)
      CHIPS: {chip red tag}Sale{/chip}   (14 looks: pill soft outline dot tag ticket arrow ribbon stamp sticker marker neon led chamfer; any color name or #hex)
      And built-in text effects: {caps} {wide} {glow} {shadow} {outline} {rainbow} {redact} {blink} {flip} (each closes with {/name}).

   Everything it makes keeps its Keydown text in data-kd-src, so Un-format and saving give the text back:
   KeydownNext.restore(root). KeydownNext.recalc(root) recomputes the live values.
   ===================================================================== */
(function (root) {
    'use strict';
    if (root.KeydownNext) return;
    const doc = root.document;
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
    const SKIP = 'pre, code, textarea, script, style, .kd-math, .katex, .kdx-block, .kdx-pk-inline, .kdx-def, .kdx-val, .kdx-set, .kdx-input, .kd-tpl-keep, [data-kdx-skip]';
    const BLOCK = /^(DIV|P|LI|H[1-6]|BLOCKQUOTE|PRE|UL|OL|TABLE|SECTION|ARTICLE|FIGURE|HEADER|FOOTER|DL|DT|DD|FIGCAPTION|HR)$/;
    const changed = (el) => { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {} };
    const isEditing = (el) => !!(el && (el.isContentEditable || (el.closest && el.closest('[contenteditable="true"]')) || (el.querySelector && el.querySelector('[contenteditable="true"]'))));

    /* ---------- the look of everything it makes ---------- */
    function injectCss() {
        if (doc.getElementById('kdx-base-css')) return;
        const st = doc.createElement('style');
        st.id = 'kdx-base-css';
        st.textContent = [
            // definitions (@style tags, footnote and abbreviation notes, and {{x = 3}} settings) never show anything, reading or editing: they live in the text (Source view); a line with nothing but definitions is hidden too
            '.kdx-def,.kdx-set,.kdx-line-hidden{display:none}',
            '.kdx-def-sample{font:inherit}',
            // a value is just its text: no chip, no underline, no bold
            '.kdx-val{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;font-variant-numeric:tabular-nums}',
            '.kdx-input{display:inline-flex;align-items:center;gap:4px;vertical-align:middle;font:600 13px system-ui,sans-serif;color:#075985}',
            '.kdx-input input[type=checkbox]{width:16px;height:16px;accent-color:#0284c7;margin:0}',
            '.kdx-input input[type=range]{width:110px;accent-color:#0284c7}',
            '.kdx-input button{width:22px;height:22px;border-radius:50%;border:1px solid #0369a1;background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;font:700 14px/1 system-ui;cursor:pointer;padding:0}',
            '.kdx-input b{min-width:1.6em;text-align:center;font-variant-numeric:tabular-nums}',
            '.kdx-block{display:block;margin:10px 0;padding:12px 14px;border-radius:14px;border:1px solid rgba(2,132,199,.35);background:linear-gradient(180deg,#fff,#f0f9ff);color:#0c4a6e;font:14px/1.45 system-ui,sans-serif;box-shadow:0 4px 14px rgba(3,105,161,.12);user-select:none;max-width:640px}',
            '.kdx-block :is(button,input,select){user-select:none}',
            '.kdx-block.kdx-pk{padding:8px 16px;background:#f4fcff;border-color:#bfeaf9}.kdx-pk-inline{white-space:normal}',
            '.kdx-title{font-weight:800;color:#075985;margin:0 0 8px;font-size:15px}',
            '.kdx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
            '.kdx-chart svg{display:block;width:100%;height:auto}.kdx-legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:12.5px}.kdx-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}',
            '.kdx-opt{display:block;position:relative;width:100%;text-align:left;margin:5px 0;padding:7px 12px;border-radius:10px;border:1px solid rgba(2,132,199,.35);background:#fff;color:#0c4a6e;font:600 14px system-ui,sans-serif;cursor:pointer;overflow:hidden}',
            '.kdx-opt:hover{border-color:#0284c7}.kdx-opt:focus-visible{outline:3px solid #f97316;outline-offset:2px}',
            '.kdx-opt .kdx-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#bae6fd,#7dd3fc);transition:width .3s;z-index:0}',
            '.kdx-opt span{position:relative;z-index:1}.kdx-opt .kdx-n{float:right;font-variant-numeric:tabular-nums}',
            '.kdx-opt.kdx-mine{border-color:#0284c7;box-shadow:inset 3px 0 0 #0284c7}',
            '.kdx-opt.kdx-right{border-color:#16a34a;background:#f0fdf4}.kdx-opt.kdx-wrong{border-color:#dc2626;background:#fef2f2}',
            '.kdx-note{font-size:12.5px;color:#4b7a94;margin-top:6px}',
            '.kdx-timer{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.kdx-clock{font:800 30px ui-monospace,Menlo,monospace;color:#075985;font-variant-numeric:tabular-nums;min-width:4.5ch}',
            '.kdx-timer.kdx-done .kdx-clock{color:#dc2626;animation:kdx-blink 1s steps(2) 3}',
            '@keyframes kdx-blink{50%{opacity:.25}}',
            '.kdx-bar{flex-basis:100%;height:6px;border-radius:999px;background:#e0f2fe;overflow:hidden}.kdx-bar i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#0284c7);transition:width .25s linear}',
            '.kdx-btn{padding:5px 14px;border-radius:999px;border:1px solid #0369a1;background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;font:700 13px system-ui,sans-serif;cursor:pointer}',
            '.kdx-btn.kdx-ghost{background:#fff;color:#0369a1;border-color:rgba(2,132,199,.4)}',
            '.kdx-btn:focus-visible,.kdx-input button:focus-visible{outline:3px solid #f97316;outline-offset:2px}',
            '.kdx-frame{display:block;width:100%;height:280px;border:0;border-radius:10px;background:#2b2f35}',
            '.kdx-map .kdx-frame{background:#e5e7eb}',
            '.kdx-block a{color:#0369a1}',
            // Tooltip Underline: {tip red dashed|text}words{/tip}
            '.kdx-tipu{position:relative;cursor:help;--tc:#3b82f6;--tt:#fff;padding-bottom:.08em}.kdx-tipu:focus-visible{outline:2px solid var(--tc);outline-offset:3px;border-radius:3px}',
            '.kdx-tipu::after{content:"";position:absolute;left:0;right:0;bottom:-.12em;height:.17em;min-height:2px;background:var(--tc);pointer-events:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            '.kdx-tipu[data-tipu-style="rounded"]::after{height:.26em;border-radius:999px}',
            '.kdx-tipu[data-tipu-style="dashed"]::after{-webkit-mask:repeating-linear-gradient(90deg,#000 0 .62em,transparent .62em .95em);mask:repeating-linear-gradient(90deg,#000 0 .62em,transparent .62em .95em)}',
            '.kdx-tipu[data-tipu-style="dotted"]::after{height:4px;bottom:-.2em;-webkit-mask:radial-gradient(circle at 50% 50%,#000 0 1.4px,transparent 1.8px) 0 0/5px 100% repeat-x;mask:radial-gradient(circle at 50% 50%,#000 0 1.4px,transparent 1.8px) 0 0/5px 100% repeat-x}',
            '.kdx-tipu[data-tipu-style="rounddash"]::after{height:4px;bottom:-.2em;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'4\'%3E%3Cline x1=\'2\' y1=\'2\' x2=\'7\' y2=\'2\' stroke=\'%23000\' stroke-width=\'4\' stroke-linecap=\'round\'/%3E%3C/svg%3E") 0 0/10px 4px repeat-x;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'4\'%3E%3Cline x1=\'2\' y1=\'2\' x2=\'7\' y2=\'2\' stroke=\'%23000\' stroke-width=\'4\' stroke-linecap=\'round\'/%3E%3C/svg%3E") 0 0/10px 4px repeat-x}',
            '.kdx-tipu::before{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + .5em);transform:translateX(-50%) translateY(4px);width:max-content;max-width:18em;padding:4px 10px;border-radius:9px;background:var(--tc);color:var(--tt);font:600 12px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;text-decoration:none;white-space:normal;box-shadow:0 4px 12px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .15s,transform .15s;z-index:20}',
            '.kdx-tipu:hover::before,.kdx-tipu:focus::before{opacity:1;transform:translateX(-50%)}',
            '@media print{.kdx-tipu::before{display:none}}',
            // margin marks: bars ({bar red dashed gel left thick}) and badges ({mark star red gel left large top|label})
            '.kdx-hasbar,.kdx-hasmk{position:relative}.kdx-barmark,.kdx-mkmark{display:none !important}',
            '.kdx-hasbar::before{content:"";position:absolute;top:2px;bottom:2px;left:-14px;width:var(--kb-w,var(--kb-dw,3px));border-radius:2px;background:var(--kdx-bar-c,#ef4444);--kb-l:color-mix(in srgb,var(--kdx-bar-c,#ef4444) 45%,#fff);--kb-e:color-mix(in srgb,var(--kdx-bar-c,#ef4444) 72%,#000);-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            '.kdx-hasbar[data-kdx-bar-side="right"]::before{left:auto;right:-14px}',
            '.kdx-hasbar[data-kdx-bar-size="thin"]::before{--kb-w:2px}.kdx-hasbar[data-kdx-bar-size="thick"]::before{--kb-w:7px}',
            // the LOOKS: gel (a glossy tube like the Gel Underline), aero (the notched divider's glass), neon, candy and double
            '.kdx-hasbar[data-kdx-bar-look="gel"]::before{--kb-dw:6px;border-radius:999px;background:linear-gradient(90deg,rgba(255,255,255,.6) 0 28%,rgba(255,255,255,0) 52%),linear-gradient(90deg,var(--kb-e) 0 18%,var(--kb-l) 18% 38%,var(--kdx-bar-c) 38% 82%,var(--kb-e) 82%)}',
            '.kdx-hasbar[data-kdx-bar-look="aero"]::before{--kb-dw:5px;border-radius:3px;background:linear-gradient(90deg,rgba(255,255,255,.55),rgba(255,255,255,0) 55%),linear-gradient(180deg,var(--kdx-bar-c),var(--kb-l) 50%,var(--kdx-bar-c));filter:drop-shadow(0 0 3px color-mix(in srgb,var(--kdx-bar-c) 55%,transparent))}',
            '.kdx-hasbar[data-kdx-bar-look="neon"]::before{--kb-dw:4px;border-radius:999px;background:linear-gradient(90deg,var(--kdx-bar-c),#fff 50%,var(--kdx-bar-c));box-shadow:0 0 3px var(--kdx-bar-c),0 0 9px var(--kdx-bar-c)}',
            '.kdx-hasbar[data-kdx-bar-look="candy"]::before{--kb-dw:6px;border-radius:3px;box-shadow:inset 0 0 0 1px var(--kb-e);background:repeating-linear-gradient(135deg,var(--kdx-bar-c) 0 4px,var(--kb-l) 4px 8px)}',
            '.kdx-hasbar[data-kdx-bar-look="double"]::before{--kb-dw:8px;border-radius:1px;background:linear-gradient(90deg,var(--kdx-bar-c) 0 28%,transparent 28% 56%,var(--kdx-bar-c) 56% 84%,transparent 84%)}',
            // the SHAPES (they cut the bar: dashes, dots, round ends)
            '.kdx-hasbar[data-kdx-bar-style="dashed"]::before{border-radius:0;-webkit-mask:repeating-linear-gradient(180deg,#000 0 9px,transparent 9px 14px);mask:repeating-linear-gradient(180deg,#000 0 9px,transparent 9px 14px)}',
            '.kdx-hasbar[data-kdx-bar-style="dotted"]::before{min-width:4px;border-radius:0;-webkit-mask:radial-gradient(circle at 50% 50%,#000 0 1.7px,transparent 2.1px) 0 0/100% 7px repeat-y;mask:radial-gradient(circle at 50% 50%,#000 0 1.7px,transparent 2.1px) 0 0/100% 7px repeat-y}',
            '.kdx-hasbar[data-kdx-bar-style="rounded"]::before{min-width:5px;border-radius:999px}',
            '.kdx-hasbar[data-kdx-bar-style="rounddash"]::before{min-width:5px;border-radius:0;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'5\' height=\'15\' preserveAspectRatio=\'none\'%3E%3Cline x1=\'2.5\' y1=\'2.5\' x2=\'2.5\' y2=\'9.5\' stroke=\'%23000\' stroke-width=\'5\' stroke-linecap=\'round\'/%3E%3C/svg%3E") 0 0/100% 15px repeat-y;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'5\' height=\'15\' preserveAspectRatio=\'none\'%3E%3Cline x1=\'2.5\' y1=\'2.5\' x2=\'2.5\' y2=\'9.5\' stroke=\'%23000\' stroke-width=\'5\' stroke-linecap=\'round\'/%3E%3C/svg%3E") 0 0/100% 15px repeat-y}',
            // the badges and labels
            '.kdx-hasmk::after{content:attr(data-kdx-mk-g);position:absolute;right:calc(100% + 22px);top:2px;box-sizing:border-box;min-width:var(--md,20px);height:var(--md,20px);padding:0 4px;display:flex;align-items:center;justify-content:center;border-radius:999px;font:700 calc(var(--md,20px) * .55)/1 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--kdx-mk-t,#fff);background:var(--kdx-mk-c,#ef4444);white-space:nowrap;--ml:color-mix(in srgb,var(--kdx-mk-c,#ef4444) 45%,#fff);--me:color-mix(in srgb,var(--kdx-mk-c,#ef4444) 72%,#000);-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            '.kdx-hasmk[data-kdx-mk-side="right"]::after{right:auto;left:calc(100% + 22px)}',
            '.kdx-hasmk[data-kdx-mk-size="small"]::after{--md:16px}.kdx-hasmk[data-kdx-mk-size="large"]::after{--md:28px}',
            '.kdx-hasmk[data-kdx-mk-pos="middle"]::after{top:50%;transform:translateY(-50%)}.kdx-hasmk[data-kdx-mk-pos="bottom"]::after{top:auto;bottom:2px}',
            '.kdx-hasmk[data-kdx-mk-kind="text"]::after,.kdx-hasmk[data-kdx-mk-g*=" "]::after{padding:0 10px;font-size:calc(var(--md,20px) * .5)}',
            '.kdx-hasmk[data-kdx-mk-look="gel"]::after{background:linear-gradient(180deg,rgba(255,255,255,.42) 0 46%,rgba(255,255,255,0) 52%),linear-gradient(180deg,var(--ml),var(--kdx-mk-c) 62%);box-shadow:0 0 0 1.5px var(--me),inset 0 -2px 3px rgba(0,0,0,.18)}',
            '.kdx-hasmk[data-kdx-mk-look="aero"]::after{background:linear-gradient(180deg,rgba(255,255,255,.7) 0 46%,rgba(255,255,255,.05) 52%),linear-gradient(180deg,var(--kdx-mk-c),var(--ml));box-shadow:0 0 0 1px var(--me),0 0 8px color-mix(in srgb,var(--kdx-mk-c) 55%,transparent)}',
            '.kdx-hasmk[data-kdx-mk-look="outline"]::after{background:#fff;color:var(--kdx-mk-c);box-shadow:inset 0 0 0 2px var(--kdx-mk-c)}',
            '.kdx-hasmk[data-kdx-mk-look="plain"]::after{background:none;color:var(--kdx-mk-c);font-size:calc(var(--md,20px) * .95)}',
            // chips: {chip red tag}words{/chip}
            '.kdx-chip{--cc:#3b82f6;--ct:#fff;--ci:color-mix(in srgb,var(--cc) 62%,#000);position:relative;display:inline-block;padding:.04em .7em;line-height:1.4;border-radius:999px;font-weight:700;font-size:.92em;background:var(--cc);color:var(--ct);white-space:nowrap;vertical-align:baseline;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            '.kdx-chip[data-chip-look="soft"]{background:color-mix(in srgb,var(--cc) 18%,#fff);color:var(--ci);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cc) 38%,#fff)}',
            '.kdx-chip[data-chip-look="outline"]{background:transparent;color:color-mix(in srgb,var(--cc) 72%,currentColor);box-shadow:inset 0 0 0 1.5px var(--cc)}',
            '.kdx-chip[data-chip-look="dot"]{background:color-mix(in srgb,var(--cc) 14%,#fff);color:var(--ci);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cc) 30%,#fff);padding-left:1.45em}.kdx-chip[data-chip-look="dot"]::before{content:"";position:absolute;left:.65em;top:50%;width:.56em;height:.56em;margin-top:-.28em;border-radius:50%;background:var(--cc);box-shadow:0 0 0 .14em color-mix(in srgb,var(--cc) 25%,transparent)}',
            '.kdx-chip[data-chip-look="tag"]{border-radius:0;padding:.04em .8em .04em 1.6em;clip-path:polygon(.85em 0,100% 0,100% 100%,.85em 100%,0 50%)}.kdx-chip[data-chip-look="tag"]::before{content:"";position:absolute;left:.62em;top:50%;width:.4em;height:.4em;margin-top:-.2em;border-radius:50%;background:#fff;box-shadow:inset 0 1px 1px rgba(0,0,0,.35)}',
            '.kdx-chip[data-chip-look="ticket"]{border-radius:.25em;padding:.04em 1em;-webkit-mask:radial-gradient(circle .34em at left center,transparent 97%,#000) left/51% 100% no-repeat,radial-gradient(circle .34em at right center,transparent 97%,#000) right/51% 100% no-repeat;mask:radial-gradient(circle .34em at left center,transparent 97%,#000) left/51% 100% no-repeat,radial-gradient(circle .34em at right center,transparent 97%,#000) right/51% 100% no-repeat}',
            '.kdx-chip[data-chip-look="arrow"]{border-radius:0;padding:.04em 1.25em .04em .8em;clip-path:polygon(0 0,calc(100% - .7em) 0,100% 50%,calc(100% - .7em) 100%,0 100%)}',
            '.kdx-chip[data-chip-look="ribbon"]{border-radius:.2em 0 0 .2em;padding:.04em 1.2em .04em .8em;clip-path:polygon(0 0,100% 0,calc(100% - .6em) 50%,100% 100%,0 100%)}',
            '.kdx-chip[data-chip-look="stamp"]{display:inline-block;background:transparent;color:color-mix(in srgb,var(--cc) 72%,currentColor);border-radius:.3em;text-transform:uppercase;letter-spacing:.1em;font-weight:800;font-size:.85em;transform:rotate(-3deg);box-shadow:inset 0 0 0 2px var(--cc),inset 0 0 0 4px transparent,0 0 0 .13em transparent;outline:1.5px solid var(--cc);outline-offset:2px;opacity:.92}',
            '.kdx-chip[data-chip-look="sticker"]{border:.2em solid #fff;border-radius:.8em;padding:0 .55em;transform:rotate(-2deg);box-shadow:0 1px 3px rgba(0,0,0,.4),0 0 0 1px rgba(0,0,0,.07)}',
            '.kdx-chip[data-chip-look="marker"]{background:linear-gradient(104deg,transparent .9%,color-mix(in srgb,var(--cc) 60%,transparent) 2.4%,color-mix(in srgb,var(--cc) 42%,transparent) 96%,transparent 98%);color:inherit;border-radius:.15em .55em .2em .5em;padding:.04em .5em;font-weight:inherit}',
            '.kdx-chip[data-chip-look="neon"]{background:#0b0f1a;color:var(--cc);text-shadow:0 0 .35em var(--cc);box-shadow:0 0 0 1.5px var(--cc),0 0 .55em var(--cc),inset 0 0 .45em color-mix(in srgb,var(--cc) 35%,transparent)}',
            '.kdx-chip[data-chip-look="led"]{background:#10151c;color:var(--cc);font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;border-radius:.3em;box-shadow:inset 0 0 0 1px #2a3340,inset 0 1px 3px #000;text-shadow:0 0 .4em color-mix(in srgb,var(--cc) 70%,transparent)}',
            '.kdx-chip[data-chip-look="chamfer"]{border-radius:0;padding:.04em .95em;clip-path:polygon(.45em 0,calc(100% - .45em) 0,100% .45em,100% calc(100% - .45em),calc(100% - .45em) 100%,.45em 100%,0 calc(100% - .45em),0 .45em)}',
            // progress, countdown, rating, steps, stats, fold and timeline blocks
            '.kdx-prog-head{display:flex;justify-content:space-between;gap:10px;font-weight:700;margin-bottom:6px}.kdx-prog-head b{font-variant-numeric:tabular-nums;color:#075985}',
            '.kdx-prog{height:12px;border-radius:999px;background:#e0f2fe;overflow:hidden;box-shadow:inset 0 1px 2px rgba(3,105,161,.25)}.kdx-prog i{display:block;height:100%;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.45),rgba(255,255,255,0) 55%),linear-gradient(90deg,#38bdf8,#0284c7)}',
            '.kdx-cd{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}.kdx-cd-cell{min-width:64px;text-align:center;padding:8px 10px;border-radius:12px;background:#fff;border:1px solid rgba(2,132,199,.3)}.kdx-cd-cell b{display:block;font:800 26px ui-monospace,Menlo,monospace;color:#075985;font-variant-numeric:tabular-nums}.kdx-cd-cell span{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:#4b7a94}',
            '.kdx-cd-done{font-weight:800;font-size:18px;color:#16a34a}',
            '.kdx-rate{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.kdx-stars{position:relative;display:inline-block;font-size:24px;line-height:1;letter-spacing:3px;color:#cbd5e1;white-space:nowrap}.kdx-stars i{position:absolute;left:0;top:0;overflow:hidden;color:#f59e0b;font-style:normal}',
            '.kdx-steplist{list-style:none;margin:0;padding:0}.kdx-steplist li{position:relative;display:flex;gap:12px;align-items:flex-start;padding:0 0 14px}.kdx-steplist li:last-child{padding-bottom:0}',
            '.kdx-steplist li::before{content:"";position:absolute;left:13px;top:28px;bottom:0;width:2px;background:#bae6fd}.kdx-steplist li:last-child::before{display:none}.kdx-steplist li.kdx-done::before{background:#22c55e}',
            '.kdx-step-dot{flex:none;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 13px system-ui;background:#fff;border:2px solid #7dd3fc;color:#0369a1}',
            '.kdx-steplist li.kdx-done .kdx-step-dot{background:#22c55e;border-color:#16a34a;color:#fff}.kdx-steplist li.kdx-now .kdx-step-dot{background:#0284c7;border-color:#0369a1;color:#fff;box-shadow:0 0 0 4px rgba(14,165,233,.25)}',
            '.kdx-steplist li span.kdx-step-t{padding-top:3px}.kdx-steplist li.kdx-done .kdx-step-t{color:#4b7a94;text-decoration:line-through}.kdx-steplist li.kdx-now .kdx-step-t{font-weight:700}',
            '.kdx-statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.kdx-stat{padding:10px 12px;border-radius:12px;background:#fff;border:1px solid rgba(2,132,199,.3)}.kdx-stat b{display:block;font-size:26px;line-height:1.15;color:#075985;font-variant-numeric:tabular-nums}.kdx-stat span{font-size:12.5px;color:#4b7a94}.kdx-stat em{font-style:normal;font-weight:700;font-size:12.5px;margin-left:6px}.kdx-up{color:#16a34a}.kdx-down{color:#dc2626}',
            '.kdx-foldbox summary{cursor:pointer;font-weight:800;color:#075985;list-style:none;display:flex;align-items:center;gap:8px}.kdx-foldbox summary::-webkit-details-marker{display:none}.kdx-foldbox summary::before{content:"\\25B8";transition:transform .15s;display:inline-block}.kdx-foldbox[open] summary::before{transform:rotate(90deg)}.kdx-fold-body{margin-top:8px}',
            '.kdx-tl{list-style:none;margin:0;padding:0 0 0 18px;border-left:2px solid #7dd3fc}.kdx-tl li{position:relative;padding:0 0 14px 6px}.kdx-tl li:last-child{padding-bottom:0}.kdx-tl li::before{content:"";position:absolute;left:-26px;top:3px;width:12px;height:12px;border-radius:50%;background:#0284c7;border:2px solid #fff;box-shadow:0 0 0 2px #7dd3fc}.kdx-tl b{display:block;color:#075985;font-size:13px}',
            '@media (prefers-reduced-motion:reduce){.kdx-opt .kdx-fill,.kdx-bar i{transition:none}.kdx-timer.kdx-done .kdx-clock{animation:none}}'
        ].join('\n');
        (doc.head || doc.documentElement).appendChild(st);
    }

    /* ==================================================================
       LINES: a page, read as the lines a person typed (Keydown engines draw a line as a <div>, a <p>, a <li>,
       or a run of words ended by <br> or a newline)
       ================================================================== */
    function splitNewlines(rootEl) {
        const w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        const hits = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) {
            if (!t.nodeValue.includes('\n') || (t.parentElement && t.parentElement.closest('pre, code, textarea, script, style, .kdx-block'))) continue;
            // only spaces and newlines between two blocks (or at the start or end of one) is just how the HTML was written, not a line break somebody typed
            if (!t.nodeValue.trim()) {
                const a = t.previousSibling, b = t.nextSibling;
                const block = (n) => n && n.nodeType === 1 && (BLOCK.test(n.tagName) || n.classList.contains('kdx-block'));
                if (block(a) || block(b) || (!a && !b)) continue;
            }
            hits.push(t);
        }
        hits.forEach((t) => {
            const parts = t.nodeValue.split('\n');
            const frag = doc.createDocumentFragment();
            parts.forEach((p, i) => { if (i) frag.appendChild(doc.createElement('br')); if (p) frag.appendChild(doc.createTextNode(p)); });
            t.parentNode.replaceChild(frag, t);
        });
    }
    function lines(rootEl) {
        const out = [];
        let cur = null;
        const walk = (el) => {
            for (const n of Array.from(el.childNodes)) {
                if (n.nodeType === 1 && n.classList.contains('kdx-block')) { out.push({ nodes: [n], block: n, text: '', widget: true }); cur = null; continue; }
                if (n.nodeType === 1 && BLOCK.test(n.tagName)) {
                    cur = null;
                    if (n.tagName === 'UL' || n.tagName === 'OL' || n.tagName === 'TABLE' && false) { walk(n); cur = null; continue; }
                    const hasBlocks = Array.from(n.children).some((c) => BLOCK.test(c.tagName) || c.classList.contains('kdx-block'));
                    const hasBr = Array.from(n.children).some((c) => c.tagName === 'BR' && c !== n.lastChild);
                    if ((hasBlocks || hasBr) && !/^(PRE|TABLE|HR)$/.test(n.tagName)) { walk(n); cur = null; continue; }
                    out.push({ nodes: [n], block: n, text: n.tagName === 'TABLE' ? '' : n.textContent, li: n.tagName === 'LI', table: n.tagName === 'TABLE' ? n : null });
                    continue;
                }
                if (n.nodeType === 1 && n.tagName === 'BR') { if (!cur) { cur = { nodes: [], text: '' }; out.push(cur); } cur.nodes.push(n); cur = null; continue; }
                if (n.nodeType === 8) continue;
                if (!cur) { cur = { nodes: [], text: '' }; out.push(cur); }
                cur.nodes.push(n);
                cur.text += n.textContent;
            }
        };
        walk(rootEl);
        out.forEach((L) => {
            L.text = L.text.replace(/​/g, '').replace(/ /g, ' ');
            // a list item drawn as a span (Phosphor) or kept as "* " text: an item too
            if (!L.li && L.nodes[0] && L.nodes[0].nodeType === 1 && L.nodes[0].classList && L.nodes[0].classList.contains('bulleted-list')) L.li = true;
        });
        return out;
    }
    // the typed text of a line (list items get their "* " back)
    const typed = (L) => (L.li && !/^\s*\*\s/.test(L.text) ? '* ' + L.text.trim() : L.text.trim());
    function removeLine(L) {
        L.nodes.forEach((n) => {
            const p = n.parentNode;
            if (!p) return;
            p.removeChild(n);
            // an emptied list or paragraph goes too
            let q = p;
            while (q && q !== doc.body && q.childNodes.length === 0 && /^(UL|OL|P|LI|DIV)$/.test(q.tagName) && !q.hasAttribute('contenteditable') && !q.id) { const up = q.parentNode; up.removeChild(q); q = up; }
        });
    }
    function insertBefore(L, el) {
        const first = L.nodes[0];
        if (first && first.parentNode) first.parentNode.insertBefore(el, first);
    }
    // lines -> the text a person typed (for data-kd-src)
    const srcOf = (ls) => ls.map(typed).join('\n');

    /* ==================================================================
       1. CUSTOM TAGS
       ================================================================== */
    const tagRules = new Map(); // class -> css text
    function tagCssEl() {
        let st = doc.getElementById('kdx-tags-css');
        if (!st) { st = doc.createElement('style'); st.id = 'kdx-tags-css'; (doc.head || doc.documentElement).appendChild(st); }
        return st;
    }
    // only declarations survive: no rules breaking out, no outside requests, nothing pinned over the page
    function cleanDecls(s) {
        return String(s).replace(/[{}<>]/g, ' ').replace(/@import[^;]*;?/gi, '').replace(/expression\s*\(/gi, '(')
            .replace(/url\(\s*(['"]?)(?!data:image\/)[^)]*\)/gi, 'none')
            .replace(/position\s*:\s*(fixed|sticky)/gi, 'position: relative')
            .replace(/z-index\s*:\s*-?\d{3,}/gi, 'z-index: 2');
    }
    // "@style OPEN [CLOSE] { decls &::before { … } &::after { … } }" -> { open, close, cls, css }
    function parseDef(text) {
        const m = /^\s*@style\s+(\S+)(?:\s+(\S+))?\s*\{([\s\S]*)\}\s*$/.exec(text);
        if (!m) return null;
        const open = m[1], close = m[2] && m[2] !== '{' ? m[2] : m[1];
        let body = m[3];
        const parts = {};
        body = body.replace(/&\s*(::?(?:before|after)|:hover)\s*\{([^{}]*)\}/gi, (x, which, decls) => { parts[which.replace(/^:+/, '').toLowerCase()] = cleanDecls(decls); return ''; });
        const cls = 'kdx-t-' + hash(open + '|' + close + '|' + m[3]);
        let css = '.' + cls + '{' + cleanDecls(body) + '}';
        if (parts.before !== undefined) css += '.' + cls + '::before{content:"";' + parts.before + '}';
        if (parts.after !== undefined) css += '.' + cls + '::after{content:"";' + parts.after + '}';
        if (parts.hover !== undefined) css += '.' + cls + ':hover{' + parts.hover + '}';
        if ((parts.before !== undefined || parts.after !== undefined) && !/position\s*:/.test(body)) css += '.' + cls + '{position:relative}';
        return { open, close, cls, css };
    }
    // built-in tags that every document knows, no @style line needed:  {sc}Small Caps{/sc}  {dots}emphasis dots{/dots}  {dim}dimmed like a terminal's \033[2m{/dim}
    const BUILTINS = [
        { open: '{sc}', close: '{/sc}', cls: 'kdx-t-sc', css: '.kdx-t-sc{font-variant-caps:small-caps;font-variant:small-caps;letter-spacing:.04em}' },
        { open: '{dots}', close: '{/dots}', cls: 'kdx-t-dots', css: '.kdx-t-dots{-webkit-text-emphasis:filled dot;text-emphasis:filled dot;-webkit-text-emphasis-position:over right;text-emphasis-position:over right}' },
        { open: '{dim}', close: '{/dim}', cls: 'kdx-t-dim', css: '.kdx-t-dim{opacity:.5}' },
        { open: '{caps}', close: '{/caps}', cls: 'kdx-t-caps', css: '.kdx-t-caps{text-transform:uppercase;letter-spacing:.03em}' },
        { open: '{wide}', close: '{/wide}', cls: 'kdx-t-wide', css: '.kdx-t-wide{letter-spacing:.18em}' },
        { open: '{glow}', close: '{/glow}', cls: 'kdx-t-glow', css: '.kdx-t-glow{text-shadow:0 0 .3em #7dd3fc,0 0 .75em #38bdf8,0 0 1.2em #0ea5e9}' },
        { open: '{shadow}', close: '{/shadow}', cls: 'kdx-t-shadow', css: '.kdx-t-shadow{text-shadow:.06em .08em 0 rgba(0,0,0,.35)}' },
        { open: '{outline}', close: '{/outline}', cls: 'kdx-t-outline', css: '.kdx-t-outline{-webkit-text-stroke:.035em currentColor;-webkit-text-fill-color:transparent;paint-order:stroke fill}' },
        { open: '{rainbow}', close: '{/rainbow}', cls: 'kdx-t-rainbow', css: '.kdx-t-rainbow{background:linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#0ea5e9,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;-webkit-print-color-adjust:exact;print-color-adjust:exact}' },
        { open: '{redact}', close: '{/redact}', cls: 'kdx-t-redact', css: '.kdx-t-redact{background:#111;color:#111;border-radius:.2em;padding:0 .25em;cursor:pointer;transition:color .15s;-webkit-print-color-adjust:exact;print-color-adjust:exact}.kdx-t-redact:hover{color:#fff}@media print{.kdx-t-redact:hover{color:#111}}' },
        { open: '{blink}', close: '{/blink}', cls: 'kdx-t-blink', css: '.kdx-t-blink{animation:kdx-blinkt 1.2s steps(2,start) infinite}@keyframes kdx-blinkt{to{visibility:hidden}}@media (prefers-reduced-motion:reduce){.kdx-t-blink{animation:none}}' },
        { open: '{flip}', close: '{/flip}', cls: 'kdx-t-flip', css: '.kdx-t-flip{display:inline-block;transform:scaleX(-1)}' },
        { open: '{sub}', close: '{/sub}', cls: 'kdx-t-sub', css: '.kdx-t-sub{vertical-align:sub;font-size:.75em;line-height:0}' },
        { open: '{sup}', close: '{/sup}', cls: 'kdx-t-sup', css: '.kdx-t-sup{vertical-align:super;font-size:.75em;line-height:0}' },
        { open: '{mark}', close: '{/mark}', cls: 'kdx-t-mark', css: '.kdx-t-mark{background:#fde68a;border-radius:.2em;padding:0 .15em;-webkit-print-color-adjust:exact;print-color-adjust:exact}' },
        { open: '{ins}', close: '{/ins}', cls: 'kdx-t-ins', css: '.kdx-t-ins{color:#15803d;text-decoration:underline;text-decoration-color:#16a34a}' },
        { open: '{del}', close: '{/del}', cls: 'kdx-t-del', css: '.kdx-t-del{color:#b91c1c;text-decoration:line-through;text-decoration-color:#dc2626}' },
        { open: '{kbd}', close: '{/kbd}', cls: 'kdx-t-kbd', css: '.kdx-t-kbd{display:inline-block;padding:0 .45em;font:600 .86em/1.5 ui-monospace,Menlo,Consolas,monospace;color:#1e293b;background:linear-gradient(#fff,#e2e8f0);border:1px solid #94a3b8;border-bottom-width:2.5px;border-radius:.35em}' },
        { open: '{mono}', close: '{/mono}', cls: 'kdx-t-mono', css: '.kdx-t-mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92em}' },
        { open: '{overline}', close: '{/overline}', cls: 'kdx-t-overline', css: '.kdx-t-overline{text-decoration:overline}' },
        { open: '{dunder}', close: '{/dunder}', cls: 'kdx-t-dunder', css: '.kdx-t-dunder{text-decoration:underline double}' },
        { open: '{boxed}', close: '{/boxed}', cls: 'kdx-t-boxed', css: '.kdx-t-boxed{border:1.5px solid currentColor;border-radius:.2em;padding:0 .3em}' },
        { open: '{spaced}', close: '{/spaced}', cls: 'kdx-t-spaced', css: '.kdx-t-spaced{letter-spacing:.3em}' },
        { open: '{upper}', close: '{/upper}', cls: 'kdx-t-upper', css: '.kdx-t-upper{text-transform:uppercase}' },
        { open: '{lower}', close: '{/lower}', cls: 'kdx-t-lower', css: '.kdx-t-lower{text-transform:lowercase}' },
        { open: '{title}', close: '{/title}', cls: 'kdx-t-title', css: '.kdx-t-title{text-transform:capitalize}' },
        { open: '{drop}', close: '{/drop}', cls: 'kdx-t-drop', css: '.kdx-t-drop{float:left;font-size:3.2em;line-height:.85;font-weight:800;padding:.05em .1em 0 0}' }
    ];
    function useDef(d) {
        if (!tagRules.has(d.cls)) { tagRules.set(d.cls, d.css); tagCssEl().textContent = Array.from(tagRules.values()).join('\n'); }
    }
    // the definitions on the page: whole lines starting with @style (a long one can run over several lines)
    function collectDefs(rootEl, editing) {
        const defs = [];
        // already made: just read them back
        rootEl.querySelectorAll('.kdx-def[data-kd-src]').forEach((el) => { const d = parseDef(el.getAttribute('data-kd-src')); if (d) { defs.push(d); useDef(d); } });
        const ls = lines(rootEl);
        for (let i = 0; i < ls.length; i++) {
            const t = ls[i].text.trim();
            if (!/^@style\s/.test(t)) continue;
            let j = i, text = t, depth = (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
            while (depth > 0 && j + 1 < ls.length && j - i < 40) { j++; const u = ls[j].text.trim(); text += '\n' + u; depth += (u.match(/\{/g) || []).length - (u.match(/\}/g) || []).length; }
            const d = parseDef(text);
            if (!d) continue;
            useDef(d);
            defs.push(d);
            const block = !!ls[i].block;
            const el = doc.createElement(block ? 'div' : 'span');
            el.className = 'kdx kdx-def';
            el.setAttribute('contenteditable', 'false');
            el.setAttribute('data-kd-src', text);
            el.innerHTML = '@style <span class="kdx-def-sample ' + d.cls + '">' + esc(d.open) + '</span>';
            el.title = 'A custom Keydown tag: ' + d.open + 'text' + d.close;
            insertBefore(ls[i], el);
            for (let k = i; k <= j; k++) removeLine(ls[k]);
            i = j;
        }
        return defs;
    }
    /* ---------- margin marks: {bar red dashed gel left thick} and {mark star red gel left large top|note} at the start of a line ---------- */
    const BAR_COLORS = { red: '#ef4444', orange: '#f97316', gold: '#ea9f08', yellow: '#ead708', lime: '#84cc16', green: '#10b981', turquoise: '#30e5cd', teal: '#06b6d4', cyan: '#30d3e5', blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899', slate: '#b4b4b4', black: '#111111' };
    const BAR_STYLES = ['solid', 'dashed', 'dotted', 'rounded', 'rounddash'];                // the SHAPE of a bar
    const BAR_LOOKS = ['flat', 'gel', 'aero', 'neon', 'candy', 'double'];                   // the LOOK of a bar (and of a mark's badge)
    const MARK_LOOKS = ['flat', 'gel', 'aero', 'outline', 'plain'];
    const MARK_KINDS = { star: '★', bang: '!', ask: '?', check: '✓', cross: '✕', flag: '⚑', arrow: '➜', heart: '♥', idea: '✦', note: '✎', warn: '⚠', dot: '●', plus: '+', text: '' };
    const MARK_SIZES = ['small', 'medium', 'large'], MARK_POS = ['top', 'middle', 'bottom'];
    const hexOf = (c) => BAR_COLORS[c] || c;
    const lumOf = (hex) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); return m ? (parseInt(m[1].slice(0, 2), 16) * 0.299 + parseInt(m[1].slice(2, 4), 16) * 0.587 + parseInt(m[1].slice(4, 6), 16) * 0.114) / 255 : 0.3; };
    const isColor = (w) => !!BAR_COLORS[w] || /^#[0-9a-f]{3,8}$/.test(w);
    function parseBar(args) {
        const o = { color: 'red', style: 'solid', look: 'flat', side: 'left', size: 'medium' };
        String(args || '').trim().split(/\s+/).filter(Boolean).forEach((w) => {
            w = w.toLowerCase();
            if (BAR_STYLES.indexOf(w) >= 0) o.style = w; else if (BAR_LOOKS.indexOf(w) >= 0) o.look = w; else if (w === 'left' || w === 'right') o.side = w;
            else if (w === 'thin' || w === 'thick') o.size = w; else if (isColor(w)) o.color = w;
        });
        return o;
    }
    const barText = (o) => '{bar ' + o.color + (o.style !== 'solid' ? ' ' + o.style : '') + (o.look !== 'flat' ? ' ' + o.look : '') + (o.side === 'right' ? ' right' : '') + (o.size !== 'medium' ? ' ' + o.size : '') + '}';
    function parseMark(args, text) {
        const o = { kind: 'star', color: 'red', look: 'flat', side: 'left', size: 'medium', pos: 'top', text: String(text || '').trim() };
        String(args || '').trim().split(/\s+/).filter(Boolean).forEach((w) => {
            w = w.toLowerCase();
            if (MARK_KINDS[w] !== undefined) o.kind = w; else if (MARK_LOOKS.indexOf(w) >= 0) o.look = w; else if (w === 'left' || w === 'right') o.side = w;
            else if (MARK_SIZES.indexOf(w) >= 0) o.size = w; else if (MARK_POS.indexOf(w) >= 0) o.pos = w; else if (isColor(w)) o.color = w;
        });
        if (o.kind === 'text' && !o.text) o.text = 'Note';
        return o;
    }
    const markText = (o) => '{mark ' + o.kind + ' ' + o.color + (o.look !== 'flat' ? ' ' + o.look : '') + (o.side === 'right' ? ' right' : '') + (o.size !== 'medium' ? ' ' + o.size : '') + (o.pos !== 'top' ? ' ' + o.pos : '') + (o.text ? '|' + o.text.replace(/[{}\n]+/g, ' ') : '') + '}';
    function paintBar(box, o) {
        if (!o) { ['kdx-hasbar'].forEach((c) => box.classList.remove(c)); ['style', 'look', 'side', 'size'].forEach((k) => box.removeAttribute('data-kdx-bar-' + k)); box.style.removeProperty('--kdx-bar-c'); if (!box.getAttribute('style')) box.removeAttribute('style'); return; }
        box.classList.add('kdx-hasbar');
        box.style.setProperty('--kdx-bar-c', hexOf(o.color));
        box.setAttribute('data-kdx-bar-style', o.style); box.setAttribute('data-kdx-bar-look', o.look); box.setAttribute('data-kdx-bar-side', o.side); box.setAttribute('data-kdx-bar-size', o.size);
    }
    function paintMark(box, o) {
        if (!o) { box.classList.remove('kdx-hasmk'); ['kind', 'look', 'side', 'size', 'pos', 'g'].forEach((k) => box.removeAttribute('data-kdx-mk-' + k)); box.style.removeProperty('--kdx-mk-c'); box.style.removeProperty('--kdx-mk-t'); if (!box.getAttribute('style')) box.removeAttribute('style'); return; }
        box.classList.add('kdx-hasmk');
        const hex = hexOf(o.color);
        box.style.setProperty('--kdx-mk-c', hex); box.style.setProperty('--kdx-mk-t', lumOf(hex) > 0.62 ? '#1a1a1a' : '#ffffff');
        box.setAttribute('data-kdx-mk-kind', o.kind); box.setAttribute('data-kdx-mk-look', o.look); box.setAttribute('data-kdx-mk-side', o.side); box.setAttribute('data-kdx-mk-size', o.size); box.setAttribute('data-kdx-mk-pos', o.pos);
        box.setAttribute('data-kdx-mk-g', (MARK_KINDS[o.kind] || '') + (MARK_KINDS[o.kind] && o.text ? ' ' : '') + o.text);
    }
    // one line's box (the thing that holds the margin marks), with hidden markers inside (what Source and saving read)
    function setBar(box, o) {
        if (!box) return;
        box.querySelectorAll(':scope > .kdx-barmark').forEach((m) => m.remove());
        if (!o) { paintBar(box, null); return; }
        const mk = doc.createElement('span');
        mk.className = 'kdx kdx-barmark'; mk.setAttribute('contenteditable', 'false'); mk.setAttribute('data-kd-src', barText(o));
        box.insertBefore(mk, box.firstChild);
        paintBar(box, o);
    }
    function setMark(box, o) {
        if (!box) return;
        box.querySelectorAll(':scope > .kdx-mkmark').forEach((m) => m.remove());
        if (!o) { paintMark(box, null); return; }
        const mk = doc.createElement('span');
        mk.className = 'kdx kdx-mkmark'; mk.setAttribute('contenteditable', 'false'); mk.setAttribute('data-kd-src', markText(o));
        box.insertBefore(mk, box.firstChild);
        paintMark(box, o);
    }
    const MARK_HEAD = /^\s*\{(bar|mark)((?:\s+[#\w-]+)*)(?:\|([^{}\n]*))?\}/;
    function makeBars(rootEl) {
        let n = 0;
        lines(rootEl).forEach((L) => {
            if (L.widget || !L.block) return;
            for (let guard = 0; guard < 4; guard++) {
                const map = textMap(L, L.block);
                const m = MARK_HEAD.exec(map.text);
                if (!m) break;
                const r0 = map.at(0), r1 = map.at(m[0].length);
                if (!r0 || !r1) break;
                const cut = doc.createRange(); cut.setStart(r0.node, r0.offset); cut.setEnd(r1.node, r1.offset); cut.deleteContents();
                if (m[1] === 'bar') setBar(L.block, parseBar(m[2])); else setMark(L.block, parseMark(m[2], m[3]));
                n++;
            }
        });
        // a box whose marker is gone loses its bar or mark; a marker (loaded from a saved page) paints its box
        rootEl.querySelectorAll('.kdx-hasbar').forEach((b) => { if (!b.querySelector(':scope > .kdx-barmark')) paintBar(b, null); });
        rootEl.querySelectorAll('.kdx-hasmk').forEach((b) => { if (!b.querySelector(':scope > .kdx-mkmark')) paintMark(b, null); });
        rootEl.querySelectorAll('.kdx-barmark').forEach((mk) => { const b = mk.parentElement; if (b && !b.classList.contains('kdx-hasbar')) paintBar(b, parseBar(String(mk.getAttribute('data-kd-src') || '').replace(/^\{bar|\}$/g, ''))); });
        rootEl.querySelectorAll('.kdx-mkmark').forEach((mk) => { const b = mk.parentElement; if (b && !b.classList.contains('kdx-hasmk')) { const t = /^\{mark((?:\s+[#\w-]+)*)(?:\|([^{}\n]*))?\}$/.exec(String(mk.getAttribute('data-kd-src') || '')); if (t) paintMark(b, parseMark(t[1], t[2])); } });
        return n;
    }
    /* ---------- Tooltip Underline: {tip red dashed|Tooltip text}words{/tip} ---------- */
    const TIP_STYLES = ['straight', 'rounded', 'dashed', 'rounddash', 'dotted'];
    const TIP_RE = /\{tip((?:\s+[#\w-]+)*)\|([^{}\n]*)\}/g;
    function parseTip(args) {
        const o = { color: 'blue', style: 'straight' };
        String(args || '').trim().split(/\s+/).filter(Boolean).forEach((w) => {
            w = w.toLowerCase();
            if (w === 'solid') w = 'straight';
            if (TIP_STYLES.indexOf(w) >= 0) o.style = w; else if (BAR_COLORS[w] || /^#[0-9a-f]{3,8}$/.test(w)) o.color = w;
        });
        return o;
    }
    const tipOpen = (o, text) => '{tip ' + o.color + (o.style !== 'straight' ? ' ' + o.style : '') + '|' + String(text || '').replace(/[{}\n]+/g, ' ').trim() + '}';
    function styleTip(span, o, text) {
        const hex = BAR_COLORS[o.color] || o.color;
        const m = /^#([0-9a-f]{6})$/i.exec(hex);
        const lum = m ? (parseInt(m[1].slice(0, 2), 16) * 0.299 + parseInt(m[1].slice(2, 4), 16) * 0.587 + parseInt(m[1].slice(4, 6), 16) * 0.114) / 255 : 0.3;
        span.classList.add('kdx-tipu');
        span.style.setProperty('--tc', hex); span.style.setProperty('--tt', lum > 0.62 ? '#1a1a1a' : '#ffffff');
        span.setAttribute('data-tipu-style', o.style); span.setAttribute('data-tip', text);
        span.setAttribute('tabindex', '0');
    }
    /* ---------- chips: {chip COLOR LOOK}words{/chip} ---------- */
    const CHIP_LOOKS = ['pill', 'soft', 'outline', 'dot', 'tag', 'ticket', 'arrow', 'ribbon', 'stamp', 'sticker', 'marker', 'neon', 'led', 'chamfer'];
    const CHIP_RE = /\{chip((?:\s+[#\w-]+)*)\}/g;
    function parseChip(args) {
        const o = { color: 'blue', look: 'pill' };
        String(args || '').trim().split(/\s+/).filter(Boolean).forEach((w) => {
            w = w.toLowerCase();
            if (CHIP_LOOKS.indexOf(w) >= 0) o.look = w; else if (BAR_COLORS[w] || /^#[0-9a-f]{3,8}$/.test(w)) o.color = w;
        });
        return o;
    }
    const chipOpen = (o) => '{chip ' + o.color + (o.look !== 'pill' ? ' ' + o.look : '') + '}';
    function styleChip(span, o) {
        const hex = BAR_COLORS[o.color] || o.color;
        const m = /^#([0-9a-f]{6})$/i.exec(hex);
        const lum = m ? (parseInt(m[1].slice(0, 2), 16) * 0.299 + parseInt(m[1].slice(2, 4), 16) * 0.587 + parseInt(m[1].slice(4, 6), 16) * 0.114) / 255 : 0.3;
        span.classList.add('kdx-chip');
        span.style.setProperty('--cc', hex); span.style.setProperty('--ct', lum > 0.62 ? '#1a1a1a' : '#ffffff');
        span.setAttribute('data-chip-look', o.look);
    }
    function chipDefs(rootEl) {
        const seen = new Map();
        lines(rootEl).forEach((L) => {
            if (L.widget) return;
            let m; CHIP_RE.lastIndex = 0;
            while ((m = CHIP_RE.exec(L.text))) if (!seen.has(m[0])) { const o = parseChip(m[1]); seen.set(m[0], { open: m[0], close: '{/chip}', cls: 'kdx-chipwrap', css: '', after: (span) => styleChip(span, o) }); }
        });
        return Array.from(seen.values());
    }
    // a span for the ribbon: KeydownNext.chipSpan({ color, look })
    function chipSpan(o) {
        o = Object.assign({ color: 'blue', look: 'pill' }, o || {});
        const span = doc.createElement('span');
        span.className = 'kdx-tag';
        span.setAttribute('data-kd-open', chipOpen(o)); span.setAttribute('data-kd-close', '{/chip}');
        styleChip(span, o);
        return span;
    }
    // change the color or look of a chip that is already there
    function retagChip(span, o) {
        const cur = parseChip((span.getAttribute('data-kd-open') || '').replace(/^\{chip|\}$/g, ''));
        o = Object.assign(cur, o || {});
        span.setAttribute('data-kd-open', chipOpen(o));
        styleChip(span, o);
        return o;
    }
    // one definition per distinct opener on the page, so the ordinary tag pass wraps them
    function tipDefs(rootEl) {
        const seen = new Map();
        lines(rootEl).forEach((L) => {
            if (L.widget) return;
            let m; TIP_RE.lastIndex = 0;
            while ((m = TIP_RE.exec(L.text))) if (!seen.has(m[0])) { const o = parseTip(m[1]), text = m[2].trim(), open = m[0]; seen.set(open, { open, close: '{/tip}', cls: 'kdx-tip', css: '', after: (span) => styleTip(span, o, text) }); }
        });
        return Array.from(seen.values());
    }
    // a span for the ribbon: KeydownNext.tipSpan({ color, style, text })
    function tipSpan(o) {
        o = Object.assign({ color: 'blue', style: 'straight', text: '' }, o || {});
        const span = doc.createElement('span');
        span.className = 'kdx-tag';
        span.setAttribute('data-kd-open', tipOpen(o, o.text)); span.setAttribute('data-kd-close', '{/tip}');
        styleTip(span, o, String(o.text).replace(/[{}\n]+/g, ' ').trim());
        return span;
    }
    // wrap OPEN…CLOSE runs inside one line (they may hold other formatting, like **bold**)
    function applyTags(rootEl, defs) {
        if (!defs.length) return 0;
        let n = 0;
        lines(rootEl).forEach((L) => {
            if (L.widget) return;
            const container = L.block || null;
            for (const d of defs) {
                let guard = 0;
                while (guard++ < 50) {
                    const map = textMap(L, container);
                    const s = map.text;
                    const a = s.indexOf(d.open);
                    if (a < 0) break;
                    const b = s.indexOf(d.close, a + d.open.length);
                    if (b < 0) break;
                    const r0 = map.at(a), r1 = map.at(a + d.open.length), r2 = map.at(b), r3 = map.at(b + d.close.length);
                    if (!r0 || !r3) break;
                    // take the closing tag out first (so the earlier positions stay right), then the inside, then the opening tag
                    const cut = (p, q) => { const r = doc.createRange(); r.setStart(p.node, p.offset); r.setEnd(q.node, q.offset); r.deleteContents(); };
                    const inner = doc.createRange(); inner.setStart(r1.node, r1.offset); inner.setEnd(r2.node, r2.offset);
                    const span = doc.createElement('span');
                    span.className = 'kdx-tag ' + d.cls;
                    span.setAttribute('data-kd-open', d.open);
                    span.setAttribute('data-kd-close', d.close);
                    if (d.after) d.after(span);
                    span.appendChild(inner.extractContents());
                    inner.insertNode(span);
                    // the markers: the text right after the span begins with CLOSE, right before it ends with OPEN
                    const after = span.nextSibling, before = span.previousSibling;
                    if (after && after.nodeType === 3 && after.nodeValue.startsWith(d.close)) after.nodeValue = after.nodeValue.slice(d.close.length);
                    if (before && before.nodeType === 3 && before.nodeValue.endsWith(d.open)) before.nodeValue = before.nodeValue.slice(0, -d.open.length);
                    n++;
                    if (container == null) L.nodes = Array.from(new Set(L.nodes.filter((x) => x.parentNode).concat([span])));
                }
            }
        });
        return n;
    }
    // a line's text and where each character lives (text nodes only, outside things that must not change)
    function textMap(L, container) {
        const texts = [];
        const pushText = (node) => {
            if (node.nodeType === 3) { if (!(node.parentElement && node.parentElement.closest(SKIP))) texts.push(node); return; }
            if (node.nodeType !== 1 || node.matches(SKIP)) return;
            const w = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let t = w.nextNode(); t; t = w.nextNode()) if (!(t.parentElement && t.parentElement.closest(SKIP))) texts.push(t);
        };
        if (container) pushText(container); else L.nodes.forEach((n) => { if (n.parentNode) pushText(n); });
        let text = '';
        const starts = texts.map((t) => { const s = text.length; text += t.nodeValue; return s; });
        return {
            text,
            at(pos) {
                for (let i = texts.length - 1; i >= 0; i--) if (pos >= starts[i]) return { node: texts[i], offset: Math.min(pos - starts[i], texts[i].nodeValue.length) };
                return texts[0] ? { node: texts[0], offset: 0 } : null;
            }
        };
    }

    /* ==================================================================
       2. LIVE VALUES: a small, safe expression language (no eval)
       ================================================================== */
    function tokenize(s) {
        const out = [];
        const re = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_][\w]*)|(==|!=|<=|>=|&&|\|\||[-+*/%^(),<>!?:×÷]))/gy;
        let m, i = 0;
        s = String(s);
        while (i < s.length) {
            re.lastIndex = i;
            m = re.exec(s);
            if (!m || m.index !== i) { if (/^\s*$/.test(s.slice(i))) break; throw new Error('I could not read "' + s.slice(i).trim().slice(0, 12) + '"'); }
            i = re.lastIndex;
            if (m[1]) out.push({ t: 'num', v: parseFloat(m[1]) });
            else if (m[2]) out.push({ t: 'str', v: m[2].slice(1, -1).replace(/\\(.)/g, '$1') });
            else if (m[3]) out.push({ t: 'id', v: m[3] });
            else if (m[4]) out.push({ t: 'op', v: m[4] === '×' ? '*' : m[4] === '÷' ? '/' : m[4] });
        }
        return out;
    }
    const pad2 = (n) => String(n).padStart(2, '0');
    const dayMs = 86400000;
    const dateOf = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s).trim()); if (!m) throw new Error('Dates look like "2026-12-25"'); return new Date(+m[1], +m[2] - 1, +m[3]); };
    const midnight = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
    const num = (v) => { const pc = typeof v === 'string' ? /^\s*(-?\d+(?:\.\d+)?)\s*%\s*$/.exec(v) : null; const n = pc ? parseFloat(pc[1]) / 100 : typeof v === 'boolean' ? (v ? 1 : 0) : Number(v); if (isNaN(n)) throw new Error('"' + v + '" is not a number'); return n; };
    const FUNCS = {
        round: (x, d) => { const k = Math.pow(10, d ? num(d) : 0); return Math.round(num(x) * k) / k; },
        floor: (x) => Math.floor(num(x)), ceil: (x) => Math.ceil(num(x)), abs: (x) => Math.abs(num(x)), sqrt: (x) => Math.sqrt(num(x)),
        pow: (a, b) => Math.pow(num(a), num(b)), min: (...a) => Math.min(...a.map(num)), max: (...a) => Math.max(...a.map(num)),
        sum: (...a) => a.reduce((s, x) => s + num(x), 0), avg: (...a) => (a.length ? a.reduce((s, x) => s + num(x), 0) / a.length : 0),
        money: (x, sym) => (sym === undefined ? '' : String(sym)) + num(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        fixed: (x, d) => num(x).toFixed(d === undefined ? 2 : num(d)),
        percent: (x, d) => (num(x) * 100).toFixed(d === undefined ? 0 : num(d)) + '%',
        if: (c, a, b) => (c && c !== '0' ? a : b),
        upper: (s) => String(s).toUpperCase(), lower: (s) => String(s).toLowerCase(),
        today: () => new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        now: () => { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); },
        year: () => new Date().getFullYear(),
        weekday: () => new Date().toLocaleDateString(undefined, { weekday: 'long' }),
        days_until: (s) => Math.round((dateOf(s) - midnight()) / dayMs),
        days_since: (s) => Math.round((midnight() - dateOf(s)) / dayMs),
        pi: () => Math.PI
    };
    const BARE = new Set(['today', 'now', 'year', 'weekday', 'pi']);
    function parseExpr(src) {
        const T = tokenize(src);
        let i = 0;
        const peek = () => T[i], take = () => T[i++];
        const isOp = (v) => T[i] && T[i].t === 'op' && T[i].v === v;
        const expect = (v) => { if (!isOp(v)) throw new Error('A "' + v + '" is missing'); i++; };
        function ternary() { const c = or(); if (isOp('?')) { i++; const a = ternary(); expect(':'); const b = ternary(); return { k: '?', c, a, b }; } return c; }
        function bin(next, ops) { return function () { let l = next(); while (T[i] && T[i].t === 'op' && ops.includes(T[i].v)) { const op = take().v; l = { k: 'bin', op, l, r: next() }; } return l; }; }
        function power() { const b = unary(); if (isOp('^')) { i++; return { k: 'bin', op: '^', l: b, r: power() }; } return b; }
        function unary() { if (isOp('-')) { i++; return { k: 'neg', e: unary() }; } if (isOp('+')) { i++; return unary(); } if (isOp('!')) { i++; return { k: 'not', e: unary() }; } return primary(); }
        function primary() {
            const t = take();
            if (!t) throw new Error('Something is missing at the end');
            if (t.t === 'num') {
                // 3.01% on its own is a percentage (5 % 3 is still a remainder)
                if (isOp('%')) { const nx = T[i + 1]; if (!nx || !(nx.t === 'num' || nx.t === 'id' || nx.t === 'str' || (nx.t === 'op' && (nx.v === '(' || nx.v === '-' || nx.v === '!')))) { i++; return { k: 'str', v: String(t.v) + '%' }; } }
                return { k: 'num', v: t.v };
            }
            if (t.t === 'str') return { k: 'str', v: t.v };
            if (t.t === 'op' && t.v === '(') { const e = ternary(); expect(')'); return e; }
            if (t.t === 'id') {
                if (t.v === 'true' || t.v === 'false') return { k: 'num', v: t.v === 'true' ? 1 : 0 };
                if (isOp('(')) { i++; const args = []; if (!isOp(')')) { do { args.push(ternary()); } while (isOp(',') && ++i); } expect(')'); return { k: 'call', f: t.v, args }; }
                return { k: 'var', v: t.v };
            }
            throw new Error('"' + t.v + '" is out of place');
        }
        const mul = bin(power, ['*', '/', '%']), add = bin(mul, ['+', '-']), cmp = bin(add, ['<', '>', '<=', '>=']), eq = bin(cmp, ['==', '!=']), and = bin(eq, ['&&']);
        const or = bin(and, ['||']);
        const e = ternary();
        if (i < T.length) throw new Error('"' + T[i].v + '" is out of place');
        return e;
    }
    function evaluate(e, vars) {
        switch (e.k) {
            case 'num': case 'str': return e.v;
            case 'var':
                if (Object.prototype.hasOwnProperty.call(vars, e.v)) return vars[e.v];
                if (BARE.has(e.v)) return FUNCS[e.v]();
                throw new Error('"' + e.v + '" has no value yet');
            case 'neg': return -num(evaluate(e.e, vars));
            case 'not': { const v = evaluate(e.e, vars); return v && v !== '0' ? 0 : 1; }
            case '?': { const c = evaluate(e.c, vars); return c && c !== '0' ? evaluate(e.a, vars) : evaluate(e.b, vars); }
            case 'call': {
                const f = FUNCS[e.f];
                if (!f || !Object.prototype.hasOwnProperty.call(FUNCS, e.f)) throw new Error('There is no "' + e.f + '()"');
                return f(...e.args.map((a) => evaluate(a, vars)));
            }
            case 'bin': {
                const l = evaluate(e.l, vars), r = evaluate(e.r, vars);
                switch (e.op) {
                    case '+': return typeof l === 'string' || typeof r === 'string' ? String(l) + String(r) : num(l) + num(r);
                    case '-': return num(l) - num(r); case '*': return num(l) * num(r);
                    case '/': { if (num(r) === 0) throw new Error('Dividing by zero'); return num(l) / num(r); }
                    case '%': return num(l) % num(r); case '^': return Math.pow(num(l), num(r));
                    case '<': return num(l) < num(r) ? 1 : 0; case '>': return num(l) > num(r) ? 1 : 0;
                    case '<=': return num(l) <= num(r) ? 1 : 0; case '>=': return num(l) >= num(r) ? 1 : 0;
                    case '==': return l == r ? 1 : 0; case '!=': return l != r ? 1 : 0; // eslint-disable-line eqeqeq
                    case '&&': return l && l !== '0' ? r : l; case '||': return l && l !== '0' ? l : r;
                }
            }
        }
        throw new Error('I could not work that out');
    }
    const show = (v) => (typeof v === 'number' ? (isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }) : '∞') : String(v));
    // what is inside {{ }}: a setting, a display, or something to click
    function readLive(inner) {
        const s = inner.trim();
        let m;
        if ((m = /^check\s+([A-Za-z_]\w*)(?:\s*=\s*(true|false|1|0))?(?:\s+(.+))?$/.exec(s))) return { kind: 'check', name: m[1], value: m[2] === 'true' || m[2] === '1' ? 1 : 0, label: m[3] || '' };
        if ((m = /^counter\s+([A-Za-z_]\w*)(?:\s*=\s*(-?\d+(?:\.\d+)?))?(?:\s+step\s+(\d+(?:\.\d+)?))?$/.exec(s))) return { kind: 'counter', name: m[1], value: m[2] ? parseFloat(m[2]) : 0, step: m[3] ? parseFloat(m[3]) : 1 };
        if ((m = /^slider\s+([A-Za-z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?)\s+from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)(?:\s+step\s+(\d+(?:\.\d+)?))?$/.exec(s))) return { kind: 'slider', name: m[1], value: parseFloat(m[2]), min: parseFloat(m[3]), max: parseFloat(m[4]), step: m[5] ? parseFloat(m[5]) : 1 };
        if ((m = /^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/.exec(s))) { let e; try { e = parseExpr(m[2]); } catch (er) { e = { k: 'str', v: m[2].trim() }; } return { kind: 'set', name: m[1], expr: e, src: m[2].trim() }; }
        return { kind: 'show', expr: parseExpr(s) };
    }
    // is this {{…}} a live value (and not one of OpenDB's {{templates}})?
    function looksLive(inner, names) {
        const s = inner.trim();
        if (/^(check|counter|slider)\s/.test(s)) return true;
        if (/^[a-z][a-z ]*(\|.*)?$/i.test(s) && !/^[A-Za-z_]\w*$/.test(s)) return false; // "citation needed", "main|x": templates
        if (/^[A-Za-z_]\w*$/.test(s)) return names.has(s) || BARE.has(s);
        try { readLive(s); return true; } catch (e) { return /[=+\-*/()\d"]/.test(s); }
    }
    function liveSpan(inner, editing) {
        const src = '{{' + inner.trim() + '}}';
        let L = null, err = '';
        try { L = readLive(inner); } catch (e) { err = e.message; }
        const el = doc.createElement('span');
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-kd-src', src);
        if (!L) { el.className = 'kdx kdx-val kdx-err'; el.textContent = src; el.title = err; return el; }
        if (L.kind === 'show') { el.className = 'kdx kdx-val'; el.textContent = '…'; return el; }
        if (L.kind === 'set') { el.className = 'kdx kdx-set'; el.textContent = '…'; return el; }
        el.className = 'kdx kdx-input kdx-' + L.kind;
        el.setAttribute('data-kdx-name', L.name);
        const id = 'kdx-' + L.name + '-' + Math.random().toString(36).slice(2, 7);
        if (L.kind === 'check') el.innerHTML = '<input type="checkbox" id="' + id + '"' + (L.value ? ' checked' : '') + '>' + (L.label ? '<label for="' + id + '">' + esc(L.label) + '</label>' : '');
        else if (L.kind === 'counter') el.innerHTML = '<button type="button" aria-label="Less ' + esc(L.name) + '">−</button><b aria-live="polite">' + show(L.value) + '</b><button type="button" aria-label="More ' + esc(L.name) + '">+</button>';
        else el.innerHTML = '<input type="range" min="' + L.min + '" max="' + L.max + '" step="' + L.step + '" value="' + L.value + '" aria-label="' + esc(L.name) + '"><b aria-live="polite">' + show(L.value) + '</b>';
        return el;
    }
    // {{…}} written as plain text, or drawn by Keydown as a template chip (span.kd-tpl / OpenDB's tpl-unknown)
    function makeLive(rootEl, editing) {
        // the names that get values, so a bare {{price}} is known to be live
        const names = new Set();
        const scan = (s) => { for (const m of String(s).matchAll(/\{\{\s*(?:check\s+|counter\s+|slider\s+)?([A-Za-z_]\w*)\s*=/g)) names.add(m[1]); for (const m of String(s).matchAll(/\{\{\s*(?:check|counter|slider)\s+([A-Za-z_]\w*)/g)) names.add(m[1]); };
        scan(rootEl.textContent);
        rootEl.querySelectorAll('[data-kd-tpl]').forEach((el) => scan('{{' + el.getAttribute('data-kd-tpl') + '}}'));
        rootEl.querySelectorAll('.kdx-set[data-kd-src], .kdx-input[data-kd-src]').forEach((el) => scan(el.getAttribute('data-kd-src')));
        let n = 0;
        // (a line that is only {{x = 3}} comes out of Keydown as an orange notice block with a flag: it becomes a plain line with the value instead)
        rootEl.querySelectorAll('span.kd-tpl[data-kd-tpl], div.kd-tpl[data-kd-tpl], .tpl-unknown').forEach((el) => {
            const inner = el.hasAttribute('data-kd-tpl') ? el.getAttribute('data-kd-tpl') : el.textContent.replace(/^[^{]*\{\{|\}\}$/g, '');
            if (!looksLive(inner, names)) return;
            const live = liveSpan(inner, editing);
            if (el.tagName === 'DIV') { const line = doc.createElement('div'); line.appendChild(live); el.replaceWith(line); } else el.replaceWith(live);
            n++;
        });
        const w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        const hits = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) if (t.nodeValue.includes('{{') && !(t.parentElement && t.parentElement.closest(SKIP))) hits.push(t);
        hits.forEach((t) => {
            const s = t.nodeValue, re = /\{\{([^{}]+)\}\}/g;
            let m, last = 0, any = false;
            const frag = doc.createDocumentFragment();
            while ((m = re.exec(s))) {
                if (!looksLive(m[1], names)) continue;
                any = true;
                frag.appendChild(doc.createTextNode(s.slice(last, m.index)));
                frag.appendChild(liveSpan(m[1], editing));
                last = re.lastIndex; n++;
            }
            if (!any) return;
            frag.appendChild(doc.createTextNode(s.slice(last)));
            t.parentNode.replaceChild(frag, t);
        });
        return n;
    }
    // a line that is only {{x = 3}} settings shows nothing at all, not even an empty line
    function hideSetLines(rootEl) {
        rootEl.querySelectorAll('.kdx-line-hidden').forEach((l) => l.classList.remove('kdx-line-hidden'));
        rootEl.querySelectorAll('.kdx-set').forEach((el) => {
            const p = el.parentElement;
            if (!p || p === rootEl || !/^(DIV|P|LI)$/.test(p.tagName) || p.classList.contains('kdx-line-hidden')) return;
            const only = Array.from(p.childNodes).every((c) => c === el || (c.nodeType === 3 && !c.nodeValue.replace(/[\u200b\u00a0\s]/g, '')) || (c.nodeType === 1 && (c.classList.contains('kdx-set') || c.tagName === 'BR')));
            if (only) p.classList.add('kdx-line-hidden');
        });
    }
    // work every value out again: settings in page order (a few passes, so order does not matter), then the displays
    function recalc(rootEl) {
        const vars = {};
        rootEl.querySelectorAll('.kdx-input[data-kdx-name]').forEach((el) => {
            const name = el.getAttribute('data-kdx-name');
            if (el.classList.contains('kdx-check')) vars[name] = el.querySelector('input').checked ? 1 : 0;
            else if (el.classList.contains('kdx-slider')) vars[name] = parseFloat(el.querySelector('input').value);
            else vars[name] = parseFloat(el.getAttribute('data-kdx-value') || readLive(el.getAttribute('data-kd-src').slice(2, -2)).value);
        });
        const sets = Array.from(rootEl.querySelectorAll('.kdx-set[data-kd-src]')).map((el) => { try { return { el, L: readLive(el.getAttribute('data-kd-src').slice(2, -2)) }; } catch (e) { return { el, err: e.message }; } });
        for (let pass = 0; pass < 6; pass++) {
            let progress = false;
            sets.forEach((s) => {
                if (!s.L || s.done) return;
                try { vars[s.L.name] = evaluate(s.L.expr, vars); s.done = true; s.err = ''; progress = true; } catch (e) { s.err = e.message; }
            });
            if (!progress) break;
        }
        sets.forEach((s) => {
            const name = s.L ? s.L.name : '?';
            s.el.textContent = s.done ? show(vars[name]) : s.el.getAttribute('data-kd-src'); // (hidden: it only holds the value for readers of the markup)
            s.el.title = s.err || '';
        });
        rootEl.querySelectorAll('.kdx-val[data-kd-src]').forEach((el) => {
            try { const L = readLive(el.getAttribute('data-kd-src').slice(2, -2)); el.textContent = show(evaluate(L.expr, vars)); el.classList.remove('kdx-err'); el.title = el.getAttribute('data-kd-src'); }
            catch (e) { el.textContent = el.getAttribute('data-kd-src'); el.classList.add('kdx-err'); el.title = e.message; }
        });
        return vars;
    }
    // the things to click: they change their own Keydown text too, so the page saves what was clicked
    function wireInputs(rootEl, editing) {
        rootEl.querySelectorAll('.kdx-input[data-kdx-name]').forEach((el) => {
            if (el._kdx) return;
            el._kdx = true;
            const L = readLive(el.getAttribute('data-kd-src').slice(2, -2));
            const write = (v) => {
                let src;
                if (L.kind === 'check') src = '{{check ' + L.name + (v ? ' = true' : '') + (L.label ? ' ' + L.label : '') + '}}';
                else if (L.kind === 'counter') src = '{{counter ' + L.name + ' = ' + v + (L.step !== 1 ? ' step ' + L.step : '') + '}}';
                else src = '{{slider ' + L.name + ' = ' + v + ' from ' + L.min + ' to ' + L.max + (L.step !== 1 ? ' step ' + L.step : '') + '}}';
                el.setAttribute('data-kd-src', src);
                recalc(rootEl);
                if (editing) changed(el);
            };
            if (L.kind === 'check') el.querySelector('input').addEventListener('change', (e) => write(e.target.checked ? 1 : 0));
            else if (L.kind === 'slider') el.querySelector('input').addEventListener('input', (e) => { el.querySelector('b').textContent = show(parseFloat(e.target.value)); write(parseFloat(e.target.value)); });
            else {
                let v = L.value;
                el.setAttribute('data-kdx-value', v);
                const [less, more] = el.querySelectorAll('button');
                const step = (d) => { v = Math.round((v + d) * 1e6) / 1e6; el.setAttribute('data-kdx-value', v); el.querySelector('b').textContent = show(v); write(v); };
                less.addEventListener('click', (e) => { e.preventDefault(); step(-L.step); });
                more.addEventListener('click', (e) => { e.preventDefault(); step(L.step); });
            }
            // a click in an editor must not move the caret into the page or start a drag
            el.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
        });
    }

    /* ==================================================================
       3. INTERACTIVE BLOCKS
       ================================================================== */
    const NS = 'http://www.w3.org/2000/svg';
    const PALETTE = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#64748b'];
    function rowsOf(ls) {
        const rows = [];
        ls.forEach((L) => {
            if (L.table) { L.table.querySelectorAll('tr').forEach((tr) => rows.push(Array.from(tr.children).map((c) => c.textContent.trim()))); return; }
            const t = L.text.trim();
            if (!t || /^\|?\s*:?-{2,}/.test(t)) return;
            rows.push(t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        });
        return rows;
    }
    const numOf = (s) => { const v = parseFloat(String(s).replace(/[^\d.\-]/g, '')); return isNaN(v) ? 0 : v; };
    function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
    function chartHtml(kind, title, rows) {
        if (rows.length < 2) return '<div class="kdx-note">A chart needs a | table | of | rows |: the first row names the columns, the others hold the numbers!</div>';
        const head = rows[0], data = rows.slice(1);
        const series = head.slice(1).length ? head.slice(1) : ['Value'];
        const labels = data.map((r) => r[0]);
        const vals = data.map((r) => series.map((_, j) => numOf(r[j + 1])));
        const W = 480, H = 260, L = 44, B = 34, T = 12, R = 12;
        let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc((title ? title + ': ' : '') + kind + ' chart') + '">';
        if (kind === 'pie' || kind === 'donut') {
            const v = vals.map((r) => Math.max(0, r[0])), total = v.reduce((a, b) => a + b, 0) || 1;
            let a0 = -Math.PI / 2;
            const cx = W / 2, cy = H / 2, r = 108, ir = kind === 'donut' ? 58 : 0;
            v.forEach((x, i) => {
                const a1 = a0 + (x / total) * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0;
                const p = (a, rr) => (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
                const d = x >= total ? 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0' :
                    'M' + p(a0, r) + 'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + p(a1, r) + (ir ? 'L' + p(a1, ir) + 'A' + ir + ' ' + ir + ' 0 ' + big + ' 0 ' + p(a0, ir) : 'L' + cx + ' ' + cy) + 'Z';
                svg += '<path d="' + d + '" fill="' + PALETTE[i % PALETTE.length] + '" stroke="#fff" stroke-width="2"' + (ir && x >= total ? ' fill-rule="evenodd"' : '') + '><title>' + esc(labels[i] + ': ' + show(x) + ' (' + Math.round((x / total) * 100) + '%)') + '</title></path>';
                a0 = a1;
            });
            if (ir) svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ir + '" fill="#fff"/><text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-size="18" font-weight="800" fill="#075985">' + esc(show(total)) + '</text>';
            svg += '</svg><div class="kdx-legend">' + labels.map((l, i) => '<span><i style="background:' + PALETTE[i % PALETTE.length] + '"></i>' + esc(l) + '</span>').join('') + '</div>';
        } else {
            const all = vals.flat(), max = niceMax(Math.max(0, ...all)), min = Math.min(0, ...all);
            const y = (v) => T + (H - T - B) * (1 - (v - min) / ((max - min) || 1));
            for (let k = 0; k <= 4; k++) { const v = min + ((max - min) * k) / 4, yy = y(v); svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="#e0f2fe"/><text x="' + (L - 6) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#4b7a94">' + esc(show(v)) + '</text>'; }
            const slot = (W - L - R) / Math.max(1, labels.length);
            labels.forEach((l, i) => { svg += '<text x="' + (L + slot * i + slot / 2).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="11.5" fill="#0c4a6e">' + esc(String(l).slice(0, 14)) + '</text>'; });
            if (kind === 'line' || kind === 'area') {
                series.forEach((sName, j) => {
                    const pts = vals.map((r, i) => [L + slot * i + slot / 2, y(r[j])]);
                    const col = PALETTE[j % PALETTE.length];
                    if (kind === 'area') svg += '<path d="M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'L' + pts[pts.length - 1][0].toFixed(1) + ' ' + y(Math.max(0, min)).toFixed(1) + 'L' + pts[0][0].toFixed(1) + ' ' + y(Math.max(0, min)).toFixed(1) + 'Z" fill="' + col + '" fill-opacity=".18"/>';
                    svg += '<polyline points="' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
                    pts.forEach((p, i) => { svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" fill="#fff" stroke="' + col + '" stroke-width="2.5"><title>' + esc(labels[i] + ', ' + sName + ': ' + show(vals[i][j])) + '</title></circle>'; });
                });
            } else {
                const gw = slot * 0.72, bw = gw / series.length;
                vals.forEach((r, i) => r.forEach((v, j) => {
                    const x = L + slot * i + (slot - gw) / 2 + bw * j, y0 = y(Math.max(0, min)), y1 = y(v);
                    svg += '<rect x="' + x.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + Math.max(1, bw - 3).toFixed(1) + '" height="' + Math.abs(y0 - y1).toFixed(1) + '" rx="4" fill="' + PALETTE[j % PALETTE.length] + '"><title>' + esc(labels[i] + ', ' + series[j] + ': ' + show(v)) + '</title></rect>';
                }));
            }
            svg += '</svg>' + (series.length > 1 ? '<div class="kdx-legend">' + series.map((s, j) => '<span><i style="background:' + PALETTE[j % PALETTE.length] + '"></i>' + esc(s) + '</span>').join('') + '</div>' : '');
        }
        // the same numbers as a table, for screen readers
        const table = '<table class="kdx-sr"><caption>' + esc(title || 'Chart') + '</caption><tr>' + head.map((h) => '<th>' + esc(h) + '</th>').join('') + '</tr>' + data.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</table>';
        return svg + table;
    }
    // poll and quiz options: "* text", "* [x] text" (the right answer), "* text [3]" (votes so far)
    function optionsOf(ls) {
        return ls.map(typed).filter((t) => /^\*\s+/.test(t)).map((t) => {
            let s = t.replace(/^\*\s+/, '');
            let right = false, votes = 0, m;
            if ((m = /^\[(x|X| )\]\s*/.exec(s))) { right = m[1] !== ' '; s = s.slice(m[0].length); }
            if ((m = /\s*\[(\d+)\]\s*$/.exec(s))) { votes = parseInt(m[1], 10); s = s.slice(0, m.index); }
            return { text: s, right, votes };
        });
    }
    function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) {} return null; }
    function buildPoll(el, head, opts, editing) {
        const key = 'kdx-poll-' + hash(head + '|' + opts.map((o) => o.text).join('|'));
        const draw = () => {
            const mine = store(key);
            const total = opts.reduce((s, o) => s + o.votes, 0);
            el.innerHTML = '<div class="kdx-title">' + esc(head || 'Poll') + '</div>' + opts.map((o, i) => {
                const pct = total ? Math.round((o.votes / total) * 100) : 0;
                return '<button type="button" class="kdx-opt' + (String(i) === mine ? ' kdx-mine' : '') + '" data-i="' + i + '" aria-pressed="' + (String(i) === mine) + '"><span class="kdx-fill" style="width:' + (mine !== null ? pct : 0) + '%"></span><span>' + esc(o.text) + '</span>' + (mine !== null ? '<span class="kdx-n">' + o.votes + ' · ' + pct + '%</span>' : '') + '</button>';
            }).join('') + '<div class="kdx-note" role="status">' + (mine !== null ? total + ' vote' + (total === 1 ? '' : 's') + '! Click another answer to change yours!' : 'Pick an answer to vote and see the results!') + (editing ? '' : ' (Votes made here are kept in this browser.)') + '</div>';
        };
        el.addEventListener('click', (e) => {
            const b = e.target.closest('.kdx-opt');
            if (!b) return;
            e.preventDefault();
            const i = +b.dataset.i, mine = store(key);
            if (String(i) === mine) return;
            if (mine !== null && opts[+mine]) opts[+mine].votes = Math.max(0, opts[+mine].votes - 1);
            opts[i].votes++;
            store(key, String(i));
            // in an editor the votes are written into the poll's own text, so they are saved with the document
            if (editing) { el.setAttribute('data-kd-src', '::poll ' + head + '\n' + opts.map((o) => '* ' + o.text + (o.votes ? ' [' + o.votes + ']' : '')).join('\n') + '\n::end'); changed(el); }
            draw();
            const again = el.querySelector('.kdx-opt[data-i="' + i + '"]'); if (again) again.focus();
        });
        draw();
    }
    function buildQuiz(el, head, opts) {
        let picked = -1;
        const draw = () => {
            const right = opts.findIndex((o) => o.right);
            el.innerHTML = '<div class="kdx-title">' + esc(head || 'Quiz') + '</div>' + opts.map((o, i) => {
                const cls = picked < 0 ? '' : o.right ? ' kdx-right' : i === picked ? ' kdx-wrong' : '';
                return '<button type="button" class="kdx-opt' + cls + '" data-i="' + i + '"' + (picked >= 0 ? ' aria-disabled="true"' : '') + '><span>' + esc(o.text) + '</span>' + (picked >= 0 && o.right ? '<span class="kdx-n">✓</span>' : picked === i && !o.right ? '<span class="kdx-n">✗</span>' : '') + '</button>';
            }).join('') + '<div class="kdx-note" role="status">' + (picked < 0 ? (right < 0 ? 'Mark the right answer with [x], like "* [x] Lisbon"!' : 'Pick an answer!') : opts[picked].right ? 'Right!' : 'Not quite! The right answer is “' + esc(opts[right] ? opts[right].text : '?') + '”!') + '</div>' +
                (picked >= 0 ? '<button type="button" class="kdx-btn kdx-ghost" data-act="again">Try again</button>' : '');
        };
        el.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            e.preventDefault();
            if (b.dataset.act === 'again') { picked = -1; draw(); el.querySelector('.kdx-opt')?.focus(); return; }
            if (picked >= 0) return;
            picked = +b.dataset.i; draw();
            el.querySelector('[data-act="again"]')?.focus();
        });
        draw();
    }
    function parseTime(s) {
        s = String(s || '').trim();
        let m;
        if ((m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s))) return m[3] !== undefined ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
        if ((m = /^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h)?$/i.exec(s))) { const v = parseFloat(m[1]), u = (m[2] || 'm').toLowerCase(); return Math.round(u[0] === 's' ? v : u[0] === 'h' ? v * 3600 : v * 60); }
        return 300;
    }
    const clock = (t) => { t = Math.max(0, Math.ceil(t)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s); };
    function buildTimer(el, arg) {
        const parts = String(arg || '').trim().split(/\s+/);
        const total = parseTime(parts[0]), label = parts.slice(1).join(' ');
        let left = total, run = null, last = 0;
        el.classList.add('kdx-timer-block');
        el.innerHTML = '<div class="kdx-timer">' + (label ? '<div class="kdx-title" style="flex-basis:100%;margin:0">' + esc(label) + '</div>' : '') + '<span class="kdx-clock" role="timer" aria-live="off">' + clock(total) + '</span><button type="button" class="kdx-btn" data-act="go">Start</button><button type="button" class="kdx-btn kdx-ghost" data-act="reset">Reset</button><div class="kdx-bar" aria-hidden="true"><i style="width:100%"></i></div><span class="kdx-sr" role="status"></span></div>';
        const face = el.querySelector('.kdx-clock'), go = el.querySelector('[data-act="go"]'), bar = el.querySelector('.kdx-bar i'), say = el.querySelector('[role="status"]'), box = el.querySelector('.kdx-timer');
        const paint = () => { face.textContent = clock(left); bar.style.width = (left / total) * 100 + '%'; };
        const stop = () => { cancelAnimationFrame(run); run = null; go.textContent = left > 0 ? 'Start' : 'Start'; };
        const tick = (t) => {
            if (!el.isConnected) { stop(); return; }
            left -= (t - last) / 1000; last = t;
            if (left <= 0) { left = 0; paint(); stop(); box.classList.add('kdx-done'); say.textContent = (label || 'Timer') + ' is done!'; beep(); return; }
            paint(); run = requestAnimationFrame(tick);
        };
        el.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            e.preventDefault();
            if (b.dataset.act === 'reset') { stop(); left = total; box.classList.remove('kdx-done'); paint(); go.textContent = 'Start'; return; }
            if (run) { stop(); go.textContent = 'Start'; return; }
            if (left <= 0) { left = total; box.classList.remove('kdx-done'); }
            last = performance.now(); run = requestAnimationFrame(tick); go.textContent = 'Pause';
        });
    }
    function beep() {
        try {
            const A = new (root.AudioContext || root.webkitAudioContext)();
            [0, 0.28, 0.56].forEach((d) => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, A.currentTime + d); g.gain.exponentialRampToValueAtTime(0.2, A.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + d + 0.2); o.connect(g).connect(A.destination); o.start(A.currentTime + d); o.stop(A.currentTime + d + 0.22); });
        } catch (e) {}
    }
    function buildMap(el, arg) {
        const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s+(\d{1,2}))?(?:\s+(.*))?$/.exec(arg || '');
        if (!m) { el.innerHTML = '<div class="kdx-note">Write ::map with a place\'s latitude and longitude, like <code>::map 38.72, -9.14 13 Lisbon</code>!</div>'; return; }
        const lat = Math.max(-85, Math.min(85, +m[1])), lon = Math.max(-180, Math.min(180, +m[2])), z = Math.max(1, Math.min(19, +(m[3] || 13))), label = m[4] || '';
        const dx = 360 / Math.pow(2, z) * 0.9, dy = dx * 0.55;
        const src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + [lon - dx, lat - dy, lon + dx, lat + dy].map((v) => v.toFixed(5)).join('%2C') + '&layer=mapnik&marker=' + lat + '%2C' + lon;
        el.innerHTML = (label ? '<div class="kdx-title">' + esc(label) + '</div>' : '') + '<iframe class="kdx-frame" title="' + esc('Map' + (label ? ' of ' + label : '')) + '" loading="lazy" referrerpolicy="no-referrer" src="' + src + '"></iframe>' +
            '<div class="kdx-note"><a href="https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=' + z + '/' + lat + '/' + lon + '" target="_blank" rel="noopener noreferrer">Open the bigger map</a> · map data © OpenStreetMap contributors</div>';
    }
    // a 3D view in a sandboxed frame (three.js from a CDN, like ZoneriderView): the scene text, or a link to one
    function buildScene(el, head, body) {
        const src = body.trim();
        const link = /^https?:\/\/\S+$/.test(src) ? src : '';
        let data = null;
        if (!link) { try { data = JSON.parse(src); } catch (e) { el.innerHTML = '<div class="kdx-title">' + esc(head || '3D scene') + '</div><div class="kdx-note">Put a Zonerider scene (.zr text) or a link to a .zr, .glb or .gltf file between ::scene and ::end!</div>'; return; } }
        const T = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
        const payload = JSON.stringify({ link, data }).replace(/</g, '\\u003c');
        const page = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:#2b2f35}canvas{display:block;width:100%;height:100%;touch-action:none}#m{position:absolute;left:8px;bottom:6px;font:12px system-ui;color:#c5ff11}</style>' +
            '<script type="importmap">' + JSON.stringify({ imports: { three: T + '/build/three.module.min.js', 'three/addons/': T + '/examples/jsm/' } }) + '<\/script></head><body><canvas id="c"></canvas><div id="m">Loading…</div><script type="application/json" id="d">' + payload + '<\/script><script type="module">' +
            'import*as THREE from"three";import{OrbitControls}from"three/addons/controls/OrbitControls.js";import{RoomEnvironment}from"three/addons/environments/RoomEnvironment.js";import{GLTFLoader}from"three/addons/loaders/GLTFLoader.js";' +
            'const D=JSON.parse(document.getElementById("d").textContent),M=document.getElementById("m"),c=document.getElementById("c");' +
            'const P={cube:p=>new THREE.BoxGeometry(p.width??2,p.height??2,p.depth??2),sphere:p=>new THREE.SphereGeometry(p.radius??1,p.widthSegments??32,p.heightSegments??16),icosphere:p=>new THREE.IcosahedronGeometry(p.radius??1,p.detail??2),cylinder:p=>new THREE.CylinderGeometry(p.radiusTop??1,p.radiusBottom??1,p.height??2,p.radialSegments??32),cone:p=>new THREE.ConeGeometry(p.radius??1,p.height??2,p.radialSegments??32),torus:p=>new THREE.TorusGeometry(p.radius??1,p.tube??.3,p.radialSegments??16,p.tubularSegments??48),torusknot:p=>new THREE.TorusKnotGeometry(p.radius??1,p.tube??.3,p.tubularSegments??128,p.radialSegments??16,p.p??2,p.q??3),plane:p=>new THREE.PlaneGeometry(p.width??2,p.depth??2).rotateX(-Math.PI/2),capsule:p=>new THREE.CapsuleGeometry(p.radius??.6,p.length??1.2,8,24)};' +
            'const r=new THREE.WebGLRenderer({canvas:c,antialias:true});r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;' +
            'const s=new THREE.Scene();s.background=new THREE.Color("#2b2f35");s.environment=new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(),.04).texture;s.add(new THREE.HemisphereLight(16777215,4473924,.6));s.add(new THREE.GridHelper(20,20,0x5a6270,0x40454d));' +
            'const cam=new THREE.PerspectiveCamera(45,1,.05,2000);cam.position.set(7,5,8);const ctl=new OrbitControls(cam,c);ctl.enableDamping=true;ctl.autoRotate=true;ctl.autoRotateSpeed=.8;c.addEventListener("pointerdown",()=>{ctl.autoRotate=false});' +
            'const g=new THREE.Group();s.add(g);' +
            'function frame(){const b=new THREE.Box3().setFromObject(g);if(b.isEmpty())return;const m=b.getCenter(new THREE.Vector3()),rr=Math.max(.5,b.getSize(new THREE.Vector3()).length()/2);ctl.target.copy(m);cam.position.copy(m).add(new THREE.Vector3(1,.7,1.15).normalize().multiplyScalar(rr/Math.sin(cam.fov*Math.PI/360)*.85));ctl.update();}' +
            'function zr(d){if(d.format!=="zonerider"||!d.scene)throw new Error("not a Zonerider scene");const o=new THREE.ObjectLoader().parse(d.scene);o.traverse(x=>{const z=x.userData.zr;if(x.isMesh&&z&&z.prim&&P[z.prim]){x.geometry.dispose();x.geometry=P[z.prim](z.params||{})}if(x.isLight)x.intensity=(x.userData.zrIntensity??x.intensity)*.35;if(x.userData.zrHidden)x.visible=false});const bg=d.settings&&d.settings.world&&d.settings.world.bg;if(bg)s.background=new THREE.Color(bg);g.add(o)}' +
            'try{if(D.link){if(/\\.(glb|gltf)(\\?|$)/i.test(D.link)){const gl=await new GLTFLoader().loadAsync(D.link);g.add(gl.scene)}else{zr(await(await fetch(D.link)).json())}}else zr(D.data);frame();M.textContent="Drag to turn, scroll to zoom!"}catch(e){M.textContent="Could not show the scene: "+e.message}' +
            'const sz=()=>{r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/Math.max(1,innerHeight);cam.updateProjectionMatrix()};addEventListener("resize",sz);sz();r.setAnimationLoop(()=>{ctl.update();r.render(s,cam)});' +
            '<\/script></body></html>';
        el.innerHTML = '<div class="kdx-title">' + esc(head || '3D scene') + '</div>';
        const f = doc.createElement('iframe');
        f.className = 'kdx-frame';
        f.title = head || '3D scene';
        f.setAttribute('sandbox', 'allow-scripts');
        f.srcdoc = page;
        el.appendChild(f);
    }
    /* ==================================================================
       POOLSIDE KEYDOWN:  ;;pk{ Poolside text }  draws Waterflow's own marks with their original Poolside styles
       (a whole line or several lines make a block, words inside a sentence make an inline piece). The translator is
       poolside.js (window.PK); without it the text just stays as it was typed.
       ================================================================== */
    const PKOPEN = ';;pk{';
    const pkReady = () => !!(root.PK && root.kdDoc && typeof root.PK.toKD === 'function');
    // where the braces of the ;;pk{ at `from` close in `text` (-1 while it is still open)
    function pkClose(text, from) {
        let depth = 0;
        for (let k = from + 4; k < text.length; k++) {
            const c = text[k];
            if (c === '{') depth++;
            else if (c === '}') { depth--; if (!depth) return k; }
        }
        return -1;
    }
    const pkInner = (src) => src.slice(src.indexOf('{') + 1, src.lastIndexOf('}')).replace(/^\n/, '').replace(/\n$/, '');
    function buildPkBlock(src) {
        const el = doc.createElement('div');
        el.className = 'kdx kdx-block kdx-pk kd-pk';
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-kd-src', src);
        if (pkReady()) {
            try { el.innerHTML = root.kdDoc.textToHtml(root.PK.toKD(pkInner(src))); } catch (e) { el.textContent = src; }
        } else el.textContent = src;
        return el;
    }
    function buildPkInline(src) {
        const el = doc.createElement('span');
        el.className = 'kdx kdx-pk-inline kd-pk';
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-kd-src', src);
        if (pkReady()) {
            try { el.innerHTML = root.kdDoc.inlineHtml(root.PK.toKD(pkInner(src))); } catch (e) { el.textContent = src; }
        } else el.textContent = src;
        return el;
    }
    // ;;pk{ words } inside a sentence
    function makePkInline(rootEl) {
        if (!pkReady()) return 0;
        const w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        const hits = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) {
            if (t.nodeValue.includes(PKOPEN) && !(t.parentElement && t.parentElement.closest(SKIP))) hits.push(t);
        }
        let n = 0;
        hits.forEach((t) => {
            let text = t.nodeValue, at = text.indexOf(PKOPEN);
            const frag = doc.createDocumentFragment();
            let done = 0;
            while (at >= 0) {
                const end = pkClose(text, at);
                if (end < 0) break;
                if (at > done) frag.appendChild(doc.createTextNode(text.slice(done, at)));
                const el = buildPkInline(text.slice(at, end + 1)); el._kdx = true;
                frag.appendChild(el); n++;
                done = end + 1;
                at = text.indexOf(PKOPEN, done);
            }
            if (!done) return;
            if (done < text.length) frag.appendChild(doc.createTextNode(text.slice(done)));
            t.parentNode.replaceChild(frag, t);
        });
        return n;
    }
    // a block, from its Keydown text
    function buildBlock(src, editing) {
        if (src.startsWith(PKOPEN)) return buildPkBlock(src);
        const L = src.split('\n');
        const m = /^::(\w+)\s*(.*)$/.exec(L[0].trim());
        const kind = m[1].toLowerCase(), arg = m[2] || '';
        const bodyLines = L.slice(1, L[L.length - 1].trim() === '::end' ? -1 : undefined);
        const el = doc.createElement('div');
        el.className = 'kdx kdx-block kdx-' + kind;
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-kd-src', src);
        const fakeLines = bodyLines.map((t) => ({ text: t, li: false }));
        if (kind === 'chart') {
            const am = /^(bar|line|area|pie|donut)?\s*(.*)$/i.exec(arg.trim());
            const type = (am[1] || 'bar').toLowerCase();
            el.innerHTML = (am[2] ? '<div class="kdx-title">' + esc(am[2]) + '</div>' : '') + chartHtml(type, am[2], rowsOf(fakeLines));
        } else if (kind === 'poll') buildPoll(el, arg.trim(), optionsOf(fakeLines), editing);
        else if (kind === 'quiz') buildQuiz(el, arg.trim(), optionsOf(fakeLines));
        else if (kind === 'timer') buildTimer(el, arg);
        else if (kind === 'map') buildMap(el, arg);
        else if (kind === 'scene') buildScene(el, arg.trim(), bodyLines.join('\n'));
        else if (kind === 'progress') buildProgress(el, arg);
        else if (kind === 'countdown') buildCountdown(el, arg);
        else if (kind === 'rating') buildRating(el, arg);
        else if (kind === 'steps') buildSteps(el, arg.trim(), bodyLines);
        else if (kind === 'stats') buildStats(el, arg.trim(), bodyLines);
        else if (kind === 'fold') buildFold(el, arg.trim(), bodyLines);
        else if (kind === 'timeline') buildTimeline(el, arg.trim(), bodyLines);
        else if (DOC_SINGLE.indexOf(kind) >= 0 || DOC_MULTI[kind]) {
            el.className = 'kdx kdx-block kdx-d-' + kind;
            try { buildDocBlock(el, kind, arg, bodyLines, editing); } catch (e) { console.warn('[KeydownNext]', e); }
        }
        return el;
    }
    /* ---------- progress, countdown, rating, steps, stats, fold, timeline ---------- */
    function buildProgress(el, arg) {
        const m = /^(-?\d+(?:\.\d+)?)\s*(%|\/\s*(\d+(?:\.\d+)?))?\s*(.*)$/.exec(String(arg || '').trim());
        if (!m) { el.innerHTML = '<div class="kdx-note">Write ::progress with a number, like <code>::progress 70% Launch</code> or <code>::progress 3/5 Chapters</code>!</div>'; return; }
        const v = parseFloat(m[1]), total = m[3] ? parseFloat(m[3]) : 100;
        const pct = Math.max(0, Math.min(100, total ? (v / total) * 100 : 0));
        const label = m[4] || '';
        el.innerHTML = '<div class="kdx-prog-head"><span>' + esc(label) + '</span><b>' + (m[3] ? esc(m[1] + ' / ' + m[3]) : Math.round(pct) + '%') + '</b></div><div class="kdx-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><i style="width:' + pct.toFixed(1) + '%"></i></div>';
    }
    function buildCountdown(el, arg) {
        const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?\s*(.*)$/.exec(String(arg || '').trim());
        if (!m) { el.innerHTML = '<div class="kdx-note">Write ::countdown with a date, like <code>::countdown 2026-12-25 Christmas</code> (add a time like 18:00 if you want)!</div>'; return; }
        const at = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, 0).getTime(), label = m[6] || '';
        el.innerHTML = (label ? '<div class="kdx-title">' + esc(label) + '</div>' : '') + '<div class="kdx-cd" role="timer" aria-live="off"></div>';
        const box = el.querySelector('.kdx-cd');
        let t = 0;
        const paint = (first) => {
            if (first !== true && !el.isConnected) { clearInterval(t); return; }
            let s = Math.floor((at - Date.now()) / 1000);
            if (s <= 0) { box.innerHTML = '<span class="kdx-cd-done">' + esc(label ? label + ' is here!' : 'It is time!') + '</span>'; clearInterval(t); return; }
            const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const mi = Math.floor(s / 60); s -= mi * 60;
            box.innerHTML = [[d, 'days'], [h, 'hours'], [mi, 'minutes'], [s, 'seconds']].map((c) => '<div class="kdx-cd-cell"><b>' + String(c[0]).padStart(2, '0') + '</b><span>' + c[1] + '</span></div>').join('');
        };
        paint(true);
        t = setInterval(paint, 1000);
    }
    function buildRating(el, arg) {
        const m = /^(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?\s*(.*)$/.exec(String(arg || '').trim());
        if (!m) { el.innerHTML = '<div class="kdx-note">Write ::rating with a number, like <code>::rating 4/5 Great food</code>!</div>'; return; }
        const max = Math.max(1, Math.min(10, m[2] ? parseInt(m[2], 10) : 5)), v = Math.max(0, Math.min(max, parseFloat(m[1])));
        const row = '\u2605'.repeat(max);
        el.innerHTML = '<div class="kdx-rate"><span class="kdx-stars" role="img" aria-label="' + v + ' out of ' + max + ' stars">' + row + '<i style="width:' + ((v / max) * 100).toFixed(1) + '%">' + row + '</i></span>' + (m[3] ? '<span>' + esc(m[3]) + '</span>' : '') + '</div>';
    }
    function buildSteps(el, arg, bodyLines) {
        const items = bodyLines.map((t) => t.trim()).filter((t) => /^[*-]\s+/.test(t)).map((t) => {
            let s = t.replace(/^[*-]\s+/, ''), done = false, m;
            if ((m = /^\[(x|X| )\]\s*/.exec(s))) { done = m[1] !== ' '; s = s.slice(m[0].length); }
            return { text: s, done };
        });
        let now = items.findIndex((i) => !i.done);
        el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + '<ol class="kdx-steplist">' + items.map((i, k) => '<li class="' + (i.done ? 'kdx-done' : k === now ? 'kdx-now' : '') + '"><span class="kdx-step-dot">' + (i.done ? '\u2713' : k + 1) + '</span><span class="kdx-step-t">' + esc(i.text) + '</span></li>').join('') + '</ol>';
    }
    function buildStats(el, arg, bodyLines) {
        const rows = rowsOf(bodyLines.map((t) => ({ text: t, li: false })));
        el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + '<div class="kdx-statgrid">' + rows.filter((r) => r.length >= 2).map((r) => {
            const d = r[2] || '';
            return '<div class="kdx-stat"><b>' + esc(r[1]) + '</b><span>' + esc(r[0]) + '</span>' + (d ? '<em class="' + (/^\s*[-\u2212\u2193]/.test(d) ? 'kdx-down' : /^\s*[+\u2191]/.test(d) ? 'kdx-up' : '') + '">' + esc(d) + '</em>' : '') + '</div>';
        }).join('') + '</div>';
    }
    function buildFold(el, arg, bodyLines) {
        const open = /^open\s+/i.test(arg);
        const title = open ? arg.replace(/^open\s+/i, '') : arg;
        el.innerHTML = '<details class="kdx-foldbox"' + (open ? ' open' : '') + '><summary>' + esc(title || 'More') + '</summary><div class="kdx-fold-body">' + bodyLines.map((t) => esc(t)).join('<br>') + '</div></details>';
    }
    function buildTimeline(el, arg, bodyLines) {
        const items = bodyLines.map((t) => t.trim()).filter((t) => /^[*-]\s+/.test(t)).map((t) => {
            const s = t.replace(/^[*-]\s+/, ''), m = /^(.{1,24}?)\s+[\u2014\u2013-]\s+(.*)$/.exec(s) || /^([^:]{1,24}):\s+(.*)$/.exec(s);
            return m ? { when: m[1], text: m[2] } : { when: '', text: s };
        });
        el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + '<ul class="kdx-tl">' + items.map((i) => '<li>' + (i.when ? '<b>' + esc(i.when) + '</b>' : '') + esc(i.text) + '</li>').join('') + '</ul>';
    }

    /* ==================================================================
       KEYDOWN FOR DOCUMENTS: blocks and marks for reports, papers, letters, manuals and covers
         single line:  ::toc  ::wordcount  ::date  ::lorem  ::space  ::stamp  ::watermark  ::footnotes  ::lof  ::lot  ::sign  ::signatures
                       ::banner  ::cover  ::keywords
         from ::name to ::end:  ::columns  ::note ::tip ::info ::warning ::danger ::success ::important ::callout  ::tabs  ::accordion  ::faq
                       ::cards  ::quote  ::pullquote  ::aside  ::figure ::tablecap ::listing  ::theorem ::lemma ::corollary ::proposition
                       ::definition ::proof ::remark ::example ::exercise  ::abstract  ::glossary  ::bibliography  ::checklist  ::agenda
                       ::proscons  ::contact  ::address
         inside a line:  [^1] with  [^1]: the note   {fn a note}   {key Ctrl+S}   {cite Smith 2020}   {todo fix this}   *[HTML]: HyperText Markup Language
         text tags:  {sub} {sup} {mark} {ins} {del} {kbd} {mono} {overline} {dunder} {boxed} {spaced} {upper} {lower} {title} {drop}
       ================================================================== */
    // a little inline markup that works inside the new blocks: **bold** *italic* `code` ==mark== [link](https://…)
    function miniInline(s) {
        let t = esc(s);
        t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
            .replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?![*\w])/g, '$1<i>$2</i>')
            .replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
            .replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:|#)[^)\s]+)\)/g, (m, a, u) => '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + a + '</a>');
        return t;
    }
    // lines of text -> paragraphs, lists, tables, pictures and code (what most of the new blocks hold)
    function renderBody(ls) {
        const out = [];
        let para = [], list = null;
        const flush = () => { if (para.length) { out.push('<p>' + para.map(miniInline).join('<br>') + '</p>'); para = []; } };
        const endList = () => { if (list) { out.push('<' + list.tag + '>' + list.items.map((i) => '<li>' + miniInline(i) + '</li>').join('') + '</' + list.tag + '>'); list = null; } };
        for (let i = 0; i < ls.length; i++) {
            const raw = ls[i], t = raw.trim();
            let m;
            if (/^```/.test(t)) {
                flush(); endList();
                const code = [];
                for (i++; i < ls.length && !/^```/.test(ls[i].trim()); i++) code.push(ls[i]);
                out.push('<pre class="kdx-code"><code>' + esc(code.join('\n')) + '</code></pre>');
                continue;
            }
            if (!t) { flush(); endList(); continue; }
            if ((m = /^!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^)\s]+)\)(?:\{width=(\d{2,4})(px|%)?\})?$/.exec(t))) {
                flush(); endList();
                out.push('<img src="' + esc(m[2]) + '" alt="' + esc(m[1]) + '"' + (m[3] ? ' style="width:' + (m[3] + (m[4] || 'px')) + '"' : '') + '>');
                continue;
            }
            if (/^\|.*\|$/.test(t)) {
                flush(); endList();
                const rows = [];
                for (; i < ls.length && /^\|.*\|$/.test(ls[i].trim()); i++) rows.push(ls[i].trim());
                i--;
                const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
                const sep = rows.length > 1 && /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(rows[1]);
                const body = rows.filter((r, k) => !(sep && k === 1));
                out.push('<table class="kdx-tbl">' + body.map((r, k) => '<tr>' + cells(r).map((c) => (sep && k === 0 ? '<th>' : '<td>') + miniInline(c) + (sep && k === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>');
                continue;
            }
            if ((m = /^(?:[*-]|\d+[.)])\s+(.*)$/.exec(t))) {
                flush();
                const tag = /^\d/.test(t) ? 'ol' : 'ul';
                if (list && list.tag !== tag) endList();
                (list || (list = { tag, items: [] })).items.push(m[1]);
                continue;
            }
            if ((m = /^>\s?(.*)$/.exec(t))) { flush(); endList(); out.push('<blockquote>' + miniInline(m[1]) + '</blockquote>'); continue; }
            endList();
            para.push(t);
        }
        flush(); endList();
        return out.join('');
    }
    // body lines split at separator lines (a line that starts with the marker), into [{title, lines}]
    function splitAt(ls, marker) {
        const parts = [];
        let cur = null;
        ls.forEach((t) => {
            const m = marker.exec(t.trim());
            if (m) { cur = { title: m[1].trim(), lines: [] }; parts.push(cur); }
            else if (cur) cur.lines.push(t);
            else if (t.trim()) { cur = { title: '', lines: [t] }; parts.push(cur); }
        });
        return parts;
    }
    const slugOf = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const DOC_COLORS = { note: '#0284c7', tip: '#16a34a', info: '#0ea5e9', warning: '#d97706', danger: '#dc2626', success: '#16a34a', important: '#7c3aed' };
    const CALLOUTS = { note: ['\u270e', 'Note'], tip: ['\u2726', 'Tip'], info: ['i', 'Info'], warning: ['!', 'Warning'], danger: ['\u2715', 'Danger'], success: ['\u2713', 'Success'], important: ['\u2605', 'Important'] };
    const THEOREMS = { theorem: ['Theorem', 'thm'], lemma: ['Lemma', 'thm'], corollary: ['Corollary', 'thm'], proposition: ['Proposition', 'thm'], definition: ['Definition', 'thm'], remark: ['Remark', 'rem'], example: ['Example', 'ex'], exercise: ['Exercise', 'exe'], proof: ['Proof', ''] };
    const LOREM = ['Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.', 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos.'];
    const badUse = (el, kind, example) => { el.innerHTML = '<div class="kdx-note">Write it like <code>' + esc(example) + '</code>!</div>'; };
    const parts3 = (arg) => String(arg || '').split('|').map((x) => x.trim());
    function colorOf(name, dflt) { const c = String(name || '').trim().toLowerCase(); return BAR_COLORS[c] || (/^#[0-9a-f]{3,8}$/i.test(c) ? c : dflt); }

    const DOC_BUILD = {
        // ----- single line -----
        toc(el, arg) {
            const m = /^(?:(\d)\s*)?(numbered\s+)?(.*)$/i.exec(arg);
            el.setAttribute('data-toc-depth', m[1] || '3'); if (m[2]) el.setAttribute('data-toc-num', '1');
            el.innerHTML = '<div class="kdx-title">' + esc(m[3] || 'Contents') + '</div><nav class="kdx-toc-list" aria-label="Contents"></nav>';
        },
        wordcount(el, arg) { el.innerHTML = '<span class="kdx-wc" data-label="' + esc(arg) + '"></span>'; },
        date(el, arg) {
            const d = new Date(), f = (arg || 'long').toLowerCase();
            const text = f === 'iso' ? d.toISOString().slice(0, 10) : f === 'short' ? d.toLocaleDateString() : f === 'time' ? d.toLocaleString() : f === 'year' ? String(d.getFullYear()) : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            el.innerHTML = '<span class="kdx-date">' + esc(text) + '</span>';
        },
        lorem(el, arg) { const n = Math.max(1, Math.min(12, parseInt(arg, 10) || 1)); el.innerHTML = Array.from({ length: n }, (_, i) => '<p>' + LOREM[i % LOREM.length] + (i >= LOREM.length ? ' ' + LOREM[(i + 2) % LOREM.length] : '') + '</p>').join(''); },
        space(el, arg) { const n = Math.max(1, Math.min(20, parseInt(arg, 10) || 1)); el.style.height = (n * 1.5) + 'em'; el.innerHTML = '<span class="kdx-spacehint">' + n + (n === 1 ? ' line' : ' lines') + ' of space</span>'; },
        stamp(el, arg) {
            const m = /^(.*?)(?:\s+(\w+|#[0-9a-f]{3,8}))?$/i.exec(arg.trim());
            const c = colorOf(m[2], '#dc2626');
            el.innerHTML = '<span class="kdx-stampbox" style="--kc:' + c + '">' + esc(m[1] || 'DRAFT') + '</span>';
        },
        watermark(el, arg) { el.setAttribute('data-wm', arg.trim() || 'DRAFT'); el.innerHTML = '<span class="kdx-spacehint">Watermark: ' + esc(arg.trim() || 'DRAFT') + '</span>'; },
        footnotes(el, arg) { el.innerHTML = '<div class="kdx-title">' + esc(arg || 'Notes') + '</div><ol class="kdx-fnlist"></ol>'; },
        lof(el, arg) { el.setAttribute('data-listof', 'fig'); el.innerHTML = '<div class="kdx-title">' + esc(arg || 'List of figures') + '</div><div class="kdx-lof"></div>'; },
        lot(el, arg) { el.setAttribute('data-listof', 'tab'); el.innerHTML = '<div class="kdx-title">' + esc(arg || 'List of tables') + '</div><div class="kdx-lof"></div>'; },
        sign(el, arg) { const p = parts3(arg.replace(/,/, '|')); el.innerHTML = '<div class="kdx-sign"><i></i><b>' + esc(p[0] || 'Name') + '</b>' + (p[1] ? '<span>' + esc(p[1]) + '</span>' : '') + '</div>'; },
        signatures(el, arg) {
            const names = parts3(arg).filter(Boolean);
            el.innerHTML = '<div class="kdx-signs">' + (names.length ? names : ['Name']).map((n) => '<div class="kdx-sign"><i></i><b>' + esc(n) + '</b><span>Date: ____ / ____ / ________</span></div>').join('') + '</div>';
        },
        banner(el, arg) {
            const p = parts3(arg), c = colorOf(p[2], '#0284c7');
            el.style.setProperty('--kc', c);
            el.innerHTML = '<div class="kdx-banner-t">' + esc(p[0] || 'Title') + '</div>' + (p[1] ? '<div class="kdx-banner-s">' + esc(p[1]) + '</div>' : '');
        },
        cover(el, arg) {
            const p = parts3(arg);
            el.innerHTML = '<div class="kdx-cover-t">' + esc(p[0] || 'Title') + '</div>' + (p[1] ? '<div class="kdx-cover-s">' + esc(p[1]) + '</div>' : '') + '<div class="kdx-cover-rule"></div>' + (p[2] ? '<div class="kdx-cover-a">' + esc(p[2]) + '</div>' : '') + (p[3] ? '<div class="kdx-cover-d">' + esc(p[3]) + '</div>' : '');
        },
        keywords(el, arg) { el.innerHTML = '<b class="kdx-kw-h">Keywords</b> ' + arg.split(/[,;]/).map((k) => k.trim()).filter(Boolean).map((k) => '<span class="kdx-kw">' + esc(k) + '</span>').join(''); },
        // ----- blocks with a body -----
        columns(el, arg, body) {
            const m = /^(\d)?\s*(.*)$/.exec(arg), n = Math.max(1, Math.min(4, parseInt(m[1], 10) || 2));
            const cols = [[]];
            body.forEach((t) => { if (t.trim() === '|||') cols.push([]); else cols[cols.length - 1].push(t); });
            el.style.setProperty('--kn', n);
            if (cols.length > 1) { el.classList.add('kdx-cols-grid'); el.innerHTML = cols.map((c) => '<div class="kdx-col">' + renderBody(c) + '</div>').join(''); }
            else { el.classList.add('kdx-cols-flow'); el.innerHTML = renderBody(body); }
        },
        callout(el, arg, body, kindName) {
            let kind = kindName, title = arg;
            if (kind === 'callout') { const m = /^(\w+)\s*(.*)$/.exec(arg); kind = m && CALLOUTS[m[1].toLowerCase()] ? m[1].toLowerCase() : 'note'; title = m && CALLOUTS[m[1].toLowerCase()] ? m[2] : arg; }
            const c = CALLOUTS[kind];
            el.classList.add('kdx-call-' + kind);
            el.style.setProperty('--kc', DOC_COLORS[kind]);
            el.innerHTML = '<div class="kdx-call-h"><span class="kdx-call-i" aria-hidden="true">' + c[0] + '</span>' + esc(title || c[1]) + '</div><div class="kdx-call-b">' + renderBody(body) + '</div>';
        },
        tabs(el, arg, body) {
            const tabs = splitAt(body, /^@tab\s+(.*)$/i);
            if (!tabs.length) return badUse(el, 'tabs', '::tabs\n@tab First\ntext\n@tab Second\nmore text\n::end');
            const id = 'kt' + Math.random().toString(36).slice(2, 7);
            el.innerHTML = '<div class="kdx-tabbar" role="tablist">' + tabs.map((t, i) => '<button type="button" role="tab" class="kdx-tabbtn' + (i ? '' : ' kdx-on') + '" data-i="' + i + '" id="' + id + 'b' + i + '" aria-selected="' + (i ? 'false' : 'true') + '">' + esc(t.title || 'Tab ' + (i + 1)) + '</button>').join('') + '</div>' + tabs.map((t, i) => '<div role="tabpanel" class="kdx-tabpanel' + (i ? '' : ' kdx-on') + '" data-i="' + i + '" aria-labelledby="' + id + 'b' + i + '"><div class="kdx-tabprint">' + esc(t.title) + '</div>' + renderBody(t.lines) + '</div>').join('');
            el.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('.kdx-tabbtn');
                if (!b) return;
                el.querySelectorAll('.kdx-tabbtn').forEach((x) => { x.classList.toggle('kdx-on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
                el.querySelectorAll('.kdx-tabpanel').forEach((x) => x.classList.toggle('kdx-on', x.getAttribute('data-i') === b.getAttribute('data-i')));
            });
        },
        accordion(el, arg, body, kind) {
            let items;
            if (kind === 'faq') { items = []; body.forEach((t) => { let m; if ((m = /^Q:\s*(.*)$/i.exec(t.trim()))) items.push({ title: m[1], lines: [] }); else if (items.length) items[items.length - 1].lines.push(t.replace(/^A:\s*/i, '')); }); }
            else items = splitAt(body, /^@item\s+(.*)$/i);
            if (!items.length) return badUse(el, kind, kind === 'faq' ? '::faq\nQ: A question?\nA: The answer.\n::end' : '::accordion\n@item Title\ntext\n::end');
            el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + items.map((it, i) => '<details class="kdx-acc"' + (i === 0 && /open/i.test(arg) ? ' open' : '') + '><summary>' + miniInline(it.title) + '</summary><div>' + renderBody(it.lines) + '</div></details>').join('');
            // opening one closes the others
            el.addEventListener('toggle', (e) => { if (e.target.open) el.querySelectorAll('details.kdx-acc').forEach((d) => { if (d !== e.target) d.open = false; }); }, true);
        },
        cards(el, arg, body) {
            const m = /^(\d)?\s*(.*)$/.exec(arg), n = Math.max(1, Math.min(5, parseInt(m[1], 10) || 3));
            const items = body.map((t) => t.trim()).filter((t) => /^[*-]\s+/.test(t)).map((t) => { const s = t.replace(/^[*-]\s+/, ''), p = /^(.{1,60}?)\s+[\u2014\u2013-]\s+(.*)$/.exec(s) || /^([^:]{1,60}):\s+(.*)$/.exec(s); return p ? { h: p[1], t: p[2] } : { h: '', t: s }; });
            el.style.setProperty('--kn', n);
            el.innerHTML = (m[2] ? '<div class="kdx-title">' + esc(m[2]) + '</div>' : '') + '<div class="kdx-cardgrid">' + items.map((c) => '<div class="kdx-card">' + (c.h ? '<b>' + miniInline(c.h) + '</b>' : '') + '<span>' + miniInline(c.t) + '</span></div>').join('') + '</div>';
        },
        quote(el, arg, body, kind) {
            el.classList.add(kind === 'pullquote' ? 'kdx-pull' : 'kdx-bq');
            el.innerHTML = '<blockquote>' + renderBody(body) + '</blockquote>' + (arg ? '<cite>\u2014 ' + miniInline(arg) + '</cite>' : '');
        },
        aside(el, arg, body) { el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + renderBody(body); },
        figure(el, arg, body, kind) {
            const word = kind === 'tablecap' ? 'Table' : kind === 'listing' ? 'Listing' : 'Figure';
            el.setAttribute('data-kdx-count', kind === 'tablecap' ? 'tab' : kind === 'listing' ? 'lst' : 'fig');
            el.setAttribute('data-kdx-word', word);
            el.innerHTML = '<div class="kdx-fig-body">' + renderBody(body) + '</div><div class="kdx-fig-cap"><b class="kdx-num"></b> ' + miniInline(arg) + '</div>';
        },
        theorem(el, arg, body, kind) {
            const T = THEOREMS[kind];
            el.classList.add('kdx-th-' + kind);
            if (T[1]) { el.setAttribute('data-kdx-count', T[1]); el.setAttribute('data-kdx-word', T[0]); }
            el.innerHTML = '<div class="kdx-th-h">' + (T[1] ? '<b class="kdx-num"></b>' : '<b>' + T[0] + '.</b>') + (arg ? ' <span class="kdx-th-t">(' + miniInline(arg) + ')</span>' : '') + '</div><div class="kdx-th-b">' + renderBody(body) + (kind === 'proof' ? '<span class="kdx-qed" aria-hidden="true">\u25a1</span>' : '') + '</div>';
        },
        abstract(el, arg, body) { el.innerHTML = '<div class="kdx-abs-h">' + esc(arg || 'Abstract') + '</div>' + renderBody(body); },
        glossary(el, arg, body) {
            const items = body.map((t) => t.trim()).filter(Boolean).map((t) => { const m = /^(.{1,60}?)\s*(?::|\u2014|\u2013| - )\s+(.*)$/.exec(t.replace(/^[*-]\s+/, '')); return m ? { t: m[1], d: m[2] } : null; }).filter(Boolean);
            items.sort((a, b) => a.t.toLowerCase().localeCompare(b.t.toLowerCase()));
            el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + '<dl class="kdx-gloss">' + items.map((i) => '<dt>' + miniInline(i.t) + '</dt><dd>' + miniInline(i.d) + '</dd>').join('') + '</dl>';
        },
        bibliography(el, arg, body) {
            let items = body.map((t) => t.trim().replace(/^[*-]\s+/, '')).filter(Boolean);
            const sorted = /^sorted\b/i.test(arg), title = arg.replace(/^sorted\s*/i, '');
            if (sorted) items.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            el.innerHTML = '<div class="kdx-title">' + esc(title || 'References') + '</div><ol class="kdx-bib">' + items.map((i) => '<li>' + miniInline(i) + '</li>').join('') + '</ol>';
        },
        checklist(el, arg, body, kind, editing, src) {
            const items = body.map((t, i) => ({ t: t.trim(), i })).filter((o) => /^[*-]\s+\[[ xX]\]/.test(o.t) || /^\[[ xX]\]/.test(o.t)).map((o) => ({ done: /\[[xX]\]/.test(o.t), text: o.t.replace(/^[*-]?\s*\[[ xX]\]\s*/, ''), line: o.i }));
            const paint = () => {
                const d = items.filter((x) => x.done).length;
                el.querySelector('.kdx-cl-n').textContent = d + ' of ' + items.length;
                el.querySelector('.kdx-cl-bar i').style.width = (items.length ? (d / items.length) * 100 : 0) + '%';
            };
            el.innerHTML = '<div class="kdx-cl-h"><b>' + esc(arg || 'Checklist') + '</b><span class="kdx-cl-n"></span></div><div class="kdx-cl-bar"><i></i></div>' + items.map((x, k) => '<label class="kdx-cl-i' + (x.done ? ' kdx-done' : '') + '"><input type="checkbox" data-k="' + k + '"' + (x.done ? ' checked' : '') + '><span>' + miniInline(x.text) + '</span></label>').join('');
            paint();
            el.addEventListener('change', (e) => {
                const cb = e.target; if (!cb || cb.tagName !== 'INPUT') return;
                const it = items[+cb.getAttribute('data-k')]; it.done = cb.checked;
                cb.parentNode.classList.toggle('kdx-done', cb.checked);
                const lines = el.getAttribute('data-kd-src').split('\n');
                const at = 1 + it.line;
                lines[at] = lines[at].replace(/\[[ xX]\]/, cb.checked ? '[x]' : '[ ]');
                el.setAttribute('data-kd-src', lines.join('\n'));
                paint(); changed(el);
            });
        },
        agenda(el, arg, body) {
            let mins = 0;
            const rows = body.map((t) => t.trim().replace(/^[*-]\s+/, '')).filter(Boolean).map((t) => {
                const m = /^(\d{1,2}[:.]\d{2}(?:\s*[ap]m)?)\s+(.*?)(?:\s*\((\d+)\s*m(?:in)?\))?$/i.exec(t);
                if (m && m[3]) mins += +m[3];
                return m ? { when: m[1], what: m[2], len: m[3] ? m[3] + ' min' : '' } : { when: '', what: t, len: '' };
            });
            el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + '<table class="kdx-tbl kdx-agenda">' + rows.map((r) => '<tr><td class="kdx-ag-t">' + esc(r.when) + '</td><td>' + miniInline(r.what) + '</td><td class="kdx-ag-l">' + esc(r.len) + '</td></tr>').join('') + '</table>' + (mins ? '<div class="kdx-note">Total planned time: ' + (mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60 ? mins % 60 + ' min' : '') : mins + ' min') + '</div>' : '');
        },
        proscons(el, arg, body) {
            const pros = [], cons = [];
            body.forEach((t) => { const s = t.trim(); if (/^\+\s+/.test(s)) pros.push(s.replace(/^\+\s+/, '')); else if (/^[-\u2212]\s+/.test(s)) cons.push(s.replace(/^[-\u2212]\s+/, '')); });
            el.innerHTML = (arg ? '<div class="kdx-title">' + esc(arg) + '</div>' : '') + '<div class="kdx-pc"><div class="kdx-pro"><b>Pros</b><ul>' + pros.map((p) => '<li>' + miniInline(p) + '</li>').join('') + '</ul></div><div class="kdx-con"><b>Cons</b><ul>' + cons.map((p) => '<li>' + miniInline(p) + '</li>').join('') + '</ul></div></div>';
        },
        contact(el, arg, body) {
            const ls = body.map((t) => t.trim()).filter(Boolean);
            const name = arg || ls.shift() || 'Contact';
            const init = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
            el.innerHTML = '<div class="kdx-ct"><div class="kdx-ct-av" aria-hidden="true">' + esc(init) + '</div><div><b>' + esc(name) + '</b>' + ls.map((l) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l) ? '<a href="mailto:' + esc(l) + '">' + esc(l) + '</a>' : /^\+?[\d][\d\s().-]{5,}$/.test(l) ? '<a href="tel:' + esc(l.replace(/[^\d+]/g, '')) + '">' + esc(l) + '</a>' : /^https?:\/\/\S+$/.test(l) ? '<a href="' + esc(l) + '" target="_blank" rel="noopener noreferrer">' + esc(l.replace(/^https?:\/\//, '')) + '</a>' : '<span>' + esc(l) + '</span>').join('') + '</div></div>';
        },
        address(el, arg, body) { el.innerHTML = '<address>' + body.filter((t) => t.trim()).map((t) => esc(t.trim())).join('<br>') + '</address>'; }
    };
    // which words open which builder
    const DOC_SINGLE = ['toc', 'wordcount', 'date', 'lorem', 'space', 'stamp', 'watermark', 'footnotes', 'lof', 'lot', 'sign', 'signatures', 'banner', 'cover', 'keywords'];
    const DOC_MULTI = { columns: 'columns', note: 'callout', tip: 'callout', info: 'callout', warning: 'callout', danger: 'callout', success: 'callout', important: 'callout', callout: 'callout', tabs: 'tabs', accordion: 'accordion', faq: 'accordion', cards: 'cards', quote: 'quote', pullquote: 'quote', aside: 'aside', figure: 'figure', tablecap: 'figure', listing: 'figure', abstract: 'abstract', glossary: 'glossary', bibliography: 'bibliography', checklist: 'checklist', agenda: 'agenda', proscons: 'proscons', contact: 'contact', address: 'address' };
    Object.keys(THEOREMS).forEach((k) => { DOC_MULTI[k] = 'theorem'; });
    function buildDocBlock(el, kind, arg, bodyLines, editing) {
        if (DOC_SINGLE.indexOf(kind) >= 0) { DOC_BUILD[kind](el, arg); }
        else { const fn = DOC_MULTI[kind]; DOC_BUILD[fn](el, arg, bodyLines, kind, editing); }
        el.classList.add('kdx-doc');
    }

    /* ---------- passes over the whole page: numbers, contents, footnotes, word count, watermark ---------- */
    const FN_DEF = /^\[\^([^\]\s]+)\]:\s*(.+)$/, ABBR_DEF = /^\*\[([^\]]+)\]:\s*(.+)$/;
    function defLine(src, kind) {
        const d = doc.createElement('div');
        d.className = 'kdx kdx-fndef kdx-' + kind;
        d.setAttribute('contenteditable', 'false'); d.setAttribute('data-kd-src', src);
        d.textContent = (kind === 'abbrdef' ? 'Abbreviation: ' : 'Footnote: ') + src;
        return d;
    }
    function makeDocLines(rootEl) {
        let n = 0;
        lines(rootEl).forEach((L) => {
            if (L.widget || L.table) return;
            const t = L.text.trim();
            let kind = null;
            if (FN_DEF.test(t)) kind = 'fndef'; else if (ABBR_DEF.test(t)) kind = 'abbrdef';
            if (!kind || (L.nodes[0] && L.nodes[0].nodeType === 1 && L.nodes[0].closest && L.nodes[0].closest('pre, code, .kdx-block'))) return;
            insertBefore(L, defLine(t, kind)); removeLine(L); n++;
        });
        return n;
    }
    // text nodes outside code, blocks and other new things
    function proseNodes(rootEl) {
        const w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        const out = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) {
            const p = t.parentElement;
            if (!p || !t.nodeValue.trim() || p.closest('pre, code, textarea, script, style, .kd-math, .katex, .kdx, .kdx-block, a, [data-kdx-skip]')) continue;
            out.push(t);
        }
        return out;
    }
    function replaceMatches(t, re, build) {
        const s = t.nodeValue;
        re.lastIndex = 0;
        let m, last = 0, frag = null;
        while ((m = re.exec(s))) {
            const el = build(m);
            if (!el) continue;
            frag = frag || doc.createDocumentFragment();
            if (m.index > last) frag.appendChild(doc.createTextNode(s.slice(last, m.index)));
            frag.appendChild(el);
            last = m.index + m[0].length;
        }
        if (!frag) return 0;
        if (last < s.length) frag.appendChild(doc.createTextNode(s.slice(last)));
        t.parentNode.replaceChild(frag, t);
        return 1;
    }
    function inlineEl(tag, cls, src, html) {
        const el = doc.createElement(tag);
        el.className = 'kdx ' + cls; el.setAttribute('data-kd-src', src); el.setAttribute('contenteditable', 'false');
        el.innerHTML = html;
        return el;
    }

    // Badges: little chips with an icon.  {badge Text | color | style | icon}  (everything after the text is optional and can come in any order)
    const BADGE_COLORS = { blue: ['#2563eb', '#fff'], sky: ['#0ea5e9', '#fff'], teal: ['#0d9488', '#fff'], green: ['#16a34a', '#fff'], lime: ['#84cc16', '#1a2e05'], yellow: ['#eab308', '#3b2f00'], orange: ['#f97316', '#fff'], red: ['#dc2626', '#fff'], pink: ['#ec4899', '#fff'], purple: ['#9333ea', '#fff'], indigo: ['#4f46e5', '#fff'], gray: ['#64748b', '#fff'] };
    const BADGE_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const BADGE_STYLES = ['soft', 'solid', 'outline', 'dashed', 'pill', 'square', 'tag', 'glow', 'gradient', 'glass', 'dot'];
    // Icons from Vadivam (https://github.com/praveenjuge/vadivam), MIT License, Copyright (c) Praveen Juge
    const BADGE_ICONS = {
        'check': '<path d="M21 6c-5.097 2.22-9.297 6.137-11.907 11.108L8.625 18l-.485-.862A9.35 9.35 0 0 0 3 12.858"/>',
        'plus': '<path d="M19.5 12h-15m7.5 7.5v-15"/>',
        'minus': '<path d="M19.5 12h-15"/>',
        'x': '<path d="m18.5 5.5-13 13m13 0-13-13"/>',
        'star': '<path d="M8.765 7.836a1.22 1.22 0 0 1-1.136.826c-1.59.042-3.175.2-4.741.473-.86.15-1.184 1.132-.573 1.73a34.5 34.5 0 0 0 3.79 3.216c.407.299.575.811.42 1.28a30 30 0 0 0-1.267 5.48c-.112.839.786 1.431 1.566 1.031a32 32 0 0 0 4.422-2.749c.438-.32 1.07-.32 1.507 0a31.7 31.7 0 0 0 4.422 2.749c.78.4 1.678-.192 1.567-1.032a30.3 30.3 0 0 0-1.267-5.478 1.14 1.14 0 0 1 .42-1.281 35 35 0 0 0 3.79-3.216c.61-.598.288-1.58-.573-1.73a32 32 0 0 0-4.741-.473 1.25 1.25 0 0 1-1.137-.826A30 30 0 0 0 12.95 2.54c-.4-.712-1.49-.73-1.898 0a30.3 30.3 0 0 0-2.286 5.295"/>',
        'bolt': '<path d="M12.842 3.382c.066-.56-.599-.864-.94-.431l-.157.304a35.3 35.3 0 0 1-8.62 10.821c-.29.367-.043.924.41.924h7.86c.322 0 .57.297.53.634l-.765 4.985c-.068.558.596.863.938.43l.157-.304a35.3 35.3 0 0 1 8.62-10.821c.29-.367.043-.924-.41-.924h-7.86c-.322 0-.57-.297-.53-.634Z"/>',
        'heart': '<path d="M2 8c0 6.067 10 13 10 13s10-6.933 10-13c0-5.6-7.507-6.931-10-1.752C9.552 1.163 2 2.483 2 8"/>',
        'flag': '<path d="M4 22v-5.903m0 0c5.818-5.056 10.182 5.055 16 0V3.459c-5.818 5.056-10.182-5.055-16 0z"/>',
        'info': '<path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12m10 5.25v-5.893m0-3.607v-1"/>',
        'warning': '<path d="M12 7.5v5.893M12 17v1m-6.682-7.39C8.233 4.87 9.69 2 11.999 2c2.311 0 3.77 2.874 6.688 8.622l.369.726c2.421 4.772 3.633 7.16 2.537 8.905C20.497 22 17.786 22 12.363 22h-.727c-5.422 0-8.134 0-9.23-1.747-1.095-1.746.117-4.135 2.541-8.913z"/>',
        'alert': '<path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12m10 1V7m0 10v-.556"/>',
        'bell': '<path d="M15.34 17.726H8.659c-1.804 0-8.053.262-4.673-3.15C8.681 10.986 2.998 2 11.999 2s3.321 8.986 8.017 12.576c3.379 3.413-2.873 3.15-4.676 3.15.002 5.699-6.681 5.699-6.681 0"/>',
        'fire': '<path d="M12 22a8 8 0 0 0 8-8c0-.5.133-2.5-2-5 0 0-1.894 2.412-4 2-3.406-.668 1.646-6.497-4.6-9C9.4 6.5 4 8 4 14c0 4.142 3.582 8 8 8"/>',
        'lock': '<path d="M16 9H8c-3.314 0-6 2.94-6 5.333v2.334C2 19.06 4.686 22 8 22h8c3.314 0 6-2.94 6-5.333v-2.334C22 11.94 19.314 9 16 9V6a4 4 0 0 0-8 0v3"/>',
        'unlock': '<path d="M16 9c3.314 0 6 2.94 6 5.333v2.334C22 19.06 19.314 22 16 22H8c-3.314 0-6-2.94-6-5.333v-2.334C2 11.94 4.686 9 8 9zm0 0V6a4 4 0 1 0-8 0"/>',
        'user': '<path d="M15.5 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0M20 21c-.507-10.667-15.493-10.667-16 0"/>',
        'users': '<path d="M16 22c-.444-7.333-13.556-7.333-14 0M12.787 4.113a3.5 3.5 0 1 1 3.141 4.886M22 18c-.197-4.135-3.294-6.133-6.294-5.993M5.5 10a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>',
        'tag': '<path d="m3.928 17.915 9.3.077c.93.008 1.395.012 1.84-.078a4.4 4.4 0 0 0 1.133-.396c.404-.208.765-.5 1.488-1.087l3.571-2.895c.986-.8.987-2.245.002-3.046l-3.596-2.923c-.714-.58-1.071-.871-1.47-1.078a4.4 4.4 0 0 0-1.12-.398C14.635 6 14.175 6 13.255 6H4.03c-1.074-.01-1.952.878-1.962 1.983L2 15.896c-.01 1.105.854 2.009 1.928 2.018M6 14v-4"/>',
        'clock': '<path d="M12 6.75v6l4 2"/><path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12"/>',
        'code': '<path d="M16 18c1.167-2.1 3.9-4.833 6-6-2.1-1.167-4.833-3.9-6-6M8 18c-1.167-2.1-3.9-4.833-6-6 2.1-1.167 4.833-3.9 6-6"/>',
        'bug': '<path d="M6.902 8.25c.628-1.9 1.964-2.912 3.227-3.389l3.784-.048c1.696.614 2.644 2.03 3.126 3.437.553 1.613.43 3.32.43 5s.123 3.387-.43 5C16.4 20.118 14.94 22 12 22s-4.399-1.883-5.039-3.75c-.556-1.614-.43-3.318-.43-5 0-1.658-.157-3.403.37-5-1.764 0-3.651-2.5-3.651-2.5m14.219 7.5h3.281m-3.711-5c1.777 0 3.711-2.5 3.711-2.5m-6.837-.937A5.97 5.97 0 0 0 16.375 2m-6.246 2.861A6.12 6.12 0 0 1 7.625 2M6.531 13.25H3.25m3.711 5c-1.777 0-3.711 2.5-3.711 2.5m13.789-2.5c1.777 0 3.711 2.5 3.711 2.5"/>',
        'rocket': '<path d="m6 18-3 3m0-5-1 1zm5 5-1 1m4.228-15.473c-4.984 0-10.88 5.904-4.318 7.545l3.019 3.018c1.641 6.56 7.545.666 7.545-4.319M6.91 14.072s1.782-4.454 4.318-7.545C13.794 3.4 18.023 2 22 2c0 3.977-1.4 8.205-4.527 10.771-3.091 2.537-7.545 4.319-7.545 4.319m6.408-9.542.889-.89"/>',
        'gift': '<path d="M12 22V11m8 0h1V8.286a2.46 2.46 0 0 0-.586-1.617C20.04 6.241 19.53 6 19 6H5c-.53 0-1.04.24-1.414.67A2.46 2.46 0 0 0 3 8.285V11Zm0 0v8.714C20 20.932 19.113 22 18 22H6c-1.113 0-2-1.068-2-2.286V11m7.985-5H8.07c-2.677 0-2.842-4 0-4 3.045 0 3.915 4 3.915 4s.87-4 3.915-4c2.8 0 2.8 4 0 4Z"/>',
        'pin': '<path d="M12.597 21.8a.995.995 0 0 1-1.194 0C6.253 17.976.785 10.109 6.31 4.425A8 8 0 0 1 12 2c2.134 0 4.18.872 5.69 2.424 5.525 5.684.058 13.55-5.093 17.377"/><path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>',
        'eye': '<path d="M2.55 13.406c-.272-.373-.408-.56-.502-.92a2.5 2.5 0 0 1 0-.971c.094-.361.23-.548.502-.92C4.04 8.55 7.303 5 12 5s7.961 3.55 9.45 5.594c.272.373.408.56.502.92.063.32.063.65 0 .971-.094.361-.23.548-.502.92C19.961 15.45 16.697 19 12 19s-7.96-3.55-9.45-5.594"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>',
        'shield': '<path d="M20 7.351v-1.88a.57.57 0 0 0-.148-.388.6.6 0 0 0-.374-.19 13.9 13.9 0 0 1-6.38-2.302l-.455-.306c-.232-.156-.348-.235-.474-.265a.7.7 0 0 0-.338 0c-.126.03-.242.109-.475.266l-.454.306a13.9 13.9 0 0 1-6.38 2.3.6.6 0 0 0-.374.191.57.57 0 0 0-.148.389v1.88c0 6.013 3.213 10.511 7.538 14.47.26.238.664.238.924 0C16.752 17.894 20 13.408 20 7.351"/>',
        'shield-check': '<path d="M20 7.351v-1.88a.57.57 0 0 0-.148-.388.6.6 0 0 0-.374-.19 13.9 13.9 0 0 1-6.38-2.302l-.455-.306c-.232-.156-.348-.235-.474-.265a.7.7 0 0 0-.338 0c-.126.03-.242.109-.475.266l-.454.306a13.9 13.9 0 0 1-6.38 2.3.6.6 0 0 0-.374.191.57.57 0 0 0-.148.389v1.88c0 6.013 3.213 10.511 7.538 14.47.26.238.664.238.924 0C16.752 17.894 20 13.408 20 7.351"/><path d="m9 11.786 1.875 1.714s2.289-3.2 4.125-4"/>',
        'sparkle': '<path d="M15.078 22c1.248-5.166 2.762-6.777 6.922-8.182-4.371-1.476-5.733-3.267-6.922-8.181-1.25 5.165-2.765 6.775-6.925 8.18 4.367 1.475 5.737 3.279 6.924 8.183M5.846 11.091C6.414 8.402 7.514 7.19 9.69 6.546 7.514 5.902 6.414 4.689 5.847 2 5.302 4.572 4.274 5.872 2 6.544c2.177.645 3.277 1.858 3.846 4.547"/>',
        'sparkles': '<path d="M15.078 22c1.248-5.166 2.762-6.777 6.922-8.182-4.371-1.476-5.733-3.267-6.922-8.181-1.25 5.165-2.765 6.775-6.925 8.18 4.367 1.475 5.737 3.279 6.924 8.183M5.846 11.091C6.414 8.402 7.514 7.19 9.69 6.546 7.514 5.902 6.414 4.689 5.847 2 5.302 4.572 4.274 5.872 2 6.544c2.177.645 3.277 1.858 3.846 4.547"/>',
        'download': '<path d="M3 17.005C3 19.203 4.58 22 7.375 22h9.25C19.422 22 21 19.2 21 17M12 2v15m6.5-6.094a12.56 12.56 0 0 0-5.276 4.334L12 17l-1.224-1.76A12.56 12.56 0 0 0 5.5 10.906"/>',
        'upload': '<path d="M3 17.005C3 19.203 4.58 22 7.375 22h9.25C19.422 22 21 19.2 21 17m-9 0V2m6.5 6.094a12.56 12.56 0 0 1-5.276-4.334L12 2l-1.224 1.76A12.56 12.56 0 0 1 5.5 8.094"/>',
        'link': '<path d="M13.073 14.248c-2.021 1.889-4.017.085-5.532-1.332-1.284-1.199-2.21-2.946-.629-4.425l6.16-5.756c2.978-2.782 9.07 3.04 6.162 5.756l-2.775 2.593m-5.532-1.332c2.021-1.889 4.017-.085 5.532 1.332 1.284 1.199 2.211 2.946.628 4.424l-6.16 5.757c-2.977 2.783-9.068-3.04-6.16-5.757l2.774-2.592"/>',
        'mail': '<path d="m2.216 7.142 7.034 4.661c.99.655 1.488.984 2.025 1.112.477.113.974.113 1.45 0 .537-.128 1.034-.457 2.025-1.112l6.97-4.618A6 6 0 0 0 16 3h-5.2c-3.08 0-4.62 0-5.798.6A5.5 5.5 0 0 0 2.6 6.003C2 7.18 2 8.72 2 11.8v.4c0 3.08 0 4.62.6 5.798A5.5 5.5 0 0 0 5.003 20.4c1.177.6 2.717.6 5.797.6h1.6c3.36 0 5.04 0 6.324-.654a6 6 0 0 0 2.622-2.622C22 16.44 22 14.76 22 11.4V9c0-.633-.098-1.242-.28-1.815"/>',
        'crown': '<path d="M17.66 16.99a34.7 34.7 0 0 0-11.32 0 .73.73 0 0 1-.805-.467l-3.233-8.86c-.223-.61-.334-.915-.265-1.097a.52.52 0 0 1 .355-.318c.188-.048.479.096 1.06.384L7.17 8.474c.233.116.35.174.465.177a.5.5 0 0 0 .287-.076c.098-.06.171-.168.316-.385l3.067-4.57c.233-.347.35-.52.496-.58a.52.52 0 0 1 .4 0c.147.06.263.233.496.58l3.07 4.574c.144.215.216.322.313.382a.5.5 0 0 0 .285.075c.114-.003.23-.06.462-.175l3.721-1.845c.582-.288.873-.432 1.061-.384a.52.52 0 0 1 .355.318c.07.182-.042.487-.265 1.097l-3.233 8.861a.73.73 0 0 1-.805.467M6 21a36.5 36.5 0 0 1 12 0"/>',
        'leaf': '<path d="M11 20.5A7 7 0 0 1 9.8 6.6C15.5 5.5 17 5 19 2.5c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10"/><path d="M2 21.5c0-3 1.9-5.4 5.1-6 2.4-.5 4.9-2 5.9-3"/>',
        'flask': '<path d="M9 2v9.412C7.372 13.14.559 19.096 3.943 21.514 4.626 22 5.883 22 8.396 22h7.21c2.514 0 3.77 0 4.451-.486 3.385-2.418-3.429-8.373-5.057-10.102V2m.789 0H8.208"/>',
        'cube': '<path d="M12 22V11.93M2 7.036C5.644 5.944 8.844 4.07 12 2c0 0 3.555 1.7 5 2.447l5 2.59c0 3.062-.06 9.467-.06 9.467C18.887 18.807 15.625 20.726 12 22l-9.94-5.497S2 10.1 2 7.036l10 4.894c3.62-1.047 6.91-2.764 10-4.894"/>',
        'package': '<path d="M12 22V11.93M2 7.036C5.644 5.944 8.844 4.07 12 2c0 0 3.555 1.7 5 2.447l5 2.59c0 3.062-.06 9.467-.06 9.467C18.887 18.807 15.625 20.726 12 22l-9.94-5.497S2 10.1 2 7.036l10 4.894c3.62-1.047 6.91-2.764 10-4.894M7 11.93V9.484c3.625-1.101 6.914-2.865 10-5.037"/>',
        'chat': '<path d="M2 11.521c.05 1.974.228 3.305 1.623 5.324.468.816.16 1.833-.327 2.723-.352.64-.437 1.217-.296 1.448.571.938 2.893.299 3.5-.133 1.627-1.155 3.397-.81 5.5-.883h2c2.8 0 4.2 0 5.27-.545a5 5 0 0 0 2.185-2.185C22 16.2 22 14.3 22 11.5V11c0-2.8 0-4.2-.545-5.27a5 5 0 0 0-2.185-2.185C18.2 3 16.8 3 14 3h-3.6c-2.94 0-4.41 0-5.533.572a5.25 5.25 0 0 0-2.295 2.295C2 6.99 2 8.46 2 11.4Z"/>',
        'book': '<path d="M18 18c0 2.4.352 4-1.598 4H5.75c-.413 0-.75-.373-.75-.833V5.556C5 3 5.7 2 8.2 2h9.2c1.236 0 1.6.486 1.6 1.778V16.3c0 1.106-.282 1.584-1 1.7H7.25C5.925 18 5 19.25 5 20.5"/>',
        'dollar': '<path d="M17.833 4h-8.75a4.2 4.2 0 0 0-2.887 1.362A3.8 3.8 0 0 0 5 8.111c0 1.03.43 2.02 1.196 2.749A4.2 4.2 0 0 0 9.083 12h5.834c.536 0 1.067.1 1.562.296s.946.482 1.325.843c.38.361.68.79.885 1.262a3.73 3.73 0 0 1 0 2.976 3.9 3.9 0 0 1-.885 1.262c-.38.36-.83.647-1.325.843a4.3 4.3 0 0 1-1.562.518H5m7 2V2"/>',
        'play': '<path d="M15.026 8.128c2.017 1.645 3.023 2.466 3.023 3.872s-1.007 2.229-3.023 3.872q-.785.648-1.615 1.238c-.445.312-.948.635-1.47.952-2.012 1.223-3.016 1.834-3.917 1.158s-.984-2.092-1.147-4.923A41 41 0 0 1 6.8 12c0-.704.029-1.49.075-2.291.165-2.838.248-4.253 1.149-4.929.9-.676 1.905-.065 3.915 1.156.523.319 1.027.642 1.472.954q.83.59 1.615 1.238"/>',
        'verified': '<path d="m8.5 12.571 2.188 1.929s2.67-3.6 4.812-4.5"/><path d="M9.59 3.2c1.8-1.6 3.02-1.6 4.82 0 .63.54 1.27.81 2.11.87 2.68.21 3.2.73 3.41 3.41.06.84.33 1.48.87 2.11 1.6 1.8 1.6 3.02 0 4.82-.54.63-.81 1.27-.87 2.11-.21 2.68-.73 3.2-3.41 3.41-.84.06-1.48.33-2.11.87-1.8 1.6-3.02 1.6-4.82 0-.63-.54-1.27-.81-2.11-.87-2.68-.21-3.2-.73-3.41-3.41-.06-.84-.33-1.48-.87-2.11-1.6-1.8-1.6-3.02 0-4.82.54-.63.81-1.27.87-2.11.21-2.68.73-3.2 3.41-3.41.84-.06 1.48-.33 2.11-.87"/>',
        'award': '<path d="M18.666 9A6.666 6.666 0 1 1 5.334 9a6.666 6.666 0 0 1 13.332 0"/><path d="M7.2 14 6 20.8c0 2.867 4.664-.303 6-.303s6 3.17 6 .302L16.8 14"/>',
        'trophy': '<path d="M7 3h10v6A5 5 0 1 1 7 9z"/><path d="M7 5H5.5A2.5 2.5 0 0 0 3 7.5 3.5 3.5 0 0 0 6.5 11h.7M17 5h1.5A2.5 2.5 0 0 1 21 7.5a3.5 3.5 0 0 1-3.5 3.5h-.7M12 14v4m-4 3a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3z"/>',
        'thumbs-up': '<path d="M14.27 10h5.917c2.723 0-2.107 12-4.057 12H5.525C4.13 22 3 20.88 3 19.5v-8.98c0-.386.206-.74.537-.924 2.205-1.23 4.791-2.236 6.071-4.588l1.37-2.518a.94.94 0 0 1 .814-.49c3.4 0 2.392 5.144 1.93 7.189-.074.342.188.816.549.811"/>',
        'thumbs-down': '<path d="M9.73 14H3.812C1.09 14 5.92 2 7.87 2h10.604C19.87 2 21 3.12 21 4.5v8.98c0 .386-.206.74-.537.924-2.205 1.23-4.792 2.236-6.071 4.588l-1.37 2.518a.94.94 0 0 1-.814.49c-3.4 0-2.392-5.145-1.93-7.189.074-.342-.188-.816-.549-.812"/>',
        'globe': '<path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12"/><path d="M8.5 2.67c0 2.24 2 2.027 2 4.202S7 7.96 7 10.135s4 1.087 4 3.806c0 2.176-2.343 3.402-1.343 7.741M21.47 8.91c-2.042 0-3.025-1.617-4.565-.54-2.31 1.618-2.566 4.313-.513 5.39 2.053 1.079 3.079 1.079 2.422 5.24"/>',
        'home': '<path d="M5.4 22C4.074 22 3 20.911 3 19.567v-9.78c0-.739.332-1.439.9-1.9l5.711-4.632c.852-.69 1.278-1.036 1.751-1.169a2.37 2.37 0 0 1 1.276 0c.473.133.9.478 1.75 1.169L20.1 7.887c.57.461.9 1.161.9 1.9v9.78C21 20.91 19.926 22 18.6 22Z"/><path d="M9 22v-6c0-.558 0-.836.046-1.068a2.4 2.4 0 0 1 1.886-1.886C11.164 13 11.442 13 12 13s.836 0 1.068.046a2.4 2.4 0 0 1 1.886 1.886c.046.232.046.51.046 1.068v6"/>',
        'settings': '<path d="M14.75 12a2.75 2.75 0 1 0-5.5 0 2.75 2.75 0 0 0 5.5 0"/><path d="M9.75 4.1c0 1.595-2.027 2.816-3.458 1.991-2.555-1.359-4.496 2.384-2.239 3.885 1.377.793 1.378 3.2 0 3.994-2.433 1.457-.212 5.178 2.239 3.873 1.551-.893 3.46.57 3.46 2.174 0 2.678 4.477 2.61 4.477 0 0-1.635 1.879-3.084 3.458-2.174 2.52 1.341 4.69-2.569 2.239-3.873-1.38-.794-1.378-3.211 0-4.004 2.433-1.457.214-5.178-2.239-3.875-1.398.807-3.457-.403-3.458-1.99 0-2.845-4.478-2.756-4.478 0"/>',
        'search': '<path d="M18.144 18.15 22 22m-1.218-10.625c0 2.486-.99 4.871-2.75 6.63a9.4 9.4 0 0 1-13.281 0 9.367 9.367 0 0 1 0-13.26 9.4 9.4 0 0 1 13.28 0 9.37 9.37 0 0 1 2.75 6.63"/>',
        'camera': '<path d="M16.222 2h3.167M22 18.5v-10c0-1.934-1.489-3.501-3.326-3.501h-8.38C8.464 4.999 7.122 3 5.19 3c-1.006 0-1.509 0-1.904.177C2 3.752 2 5.08 2 6.342V18.5C2 20.433 3.489 22 5.326 22h13.348C20.511 22 22 20.433 22 18.5"/><path d="M14 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>',
        'image': '<path d="M11.6 22h.8c3.36 0 5.04 0 6.324-.654a6 6 0 0 0 2.622-2.622C22 17.44 22 15.76 22 12.4v-.8c0-3.36 0-5.04-.654-6.324a6 6 0 0 0-2.622-2.622C17.44 2 15.76 2 12.4 2h-.8c-3.36 0-5.04 0-6.324.654a6 6 0 0 0-2.622 2.622C2 6.56 2 8.24 2 11.6v.8c0 3.36 0 5.04.654 6.324a6 6 0 0 0 2.622 2.622C6.56 22 8.24 22 11.6 22"/><path d="M22 9.99C15.39 9.082 8.617 15.49 9 22"/><path d="M2 13.066c2.78-.385 6.832 1.463 8.181 3.605M10.5 8c0-1.09-.91-2-2-2s-2 .91-2 2 .91 2 2 2 2-.91 2-2"/>',
        'video': '<path d="M2 16.283V7.967C2 6.757 3.014 6 4.222 6c3.114.66 6.331.66 9.445 0C14.935 6 16 6.758 16 7.967v8.316C16 17.493 14.935 18 13.667 18a22.8 22.8 0 0 0-9.445 0C3.014 18 2 17.492 2 16.283m19.076-9.711-4.89 3.95a.56.56 0 0 0-.186.413v1.972c0 .156.07.31.187.413l4.889 3.95c.341.303.924.057.924-.414v-9.87c0-.471-.583-.717-.924-.414"/>',
        'file': '<path d="M20 12c0-4.2-5.8-10-10-10H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 4.28 4 5.12 4 6.8v10.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C6.28 22 7.12 22 8.8 22h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C20 19.72 20 18.88 20 17.2Zm0 0a3 3 0 0 0-3-3c-1.4 0-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.092-1.092C13 7.1 13 6.4 13 5a3 3 0 0 0-3-3"/>',
        'folder': '<path d="M2 5.25v13.5C2 19.976 3.012 21 4.222 21h15.556C20.988 21 22 19.976 22 18.75V8.25C22 7.024 20.988 6 19.778 6h-8.155c-2.405-.001-3.152-2.999-5.462-3H4.222C3.012 3 2 4.024 2 5.25"/>',
        'calendar': '<path d="M10.8 4h2.4c3.08 0 4.62 0 5.797.6A5.5 5.5 0 0 1 21.4 7.002C22 8.18 22 9.72 22 12.8v.4c0 3.08 0 4.62-.6 5.797a5.5 5.5 0 0 1-2.403 2.404C17.82 22 16.28 22 13.2 22h-2.4c-3.08 0-4.62 0-5.797-.6A5.5 5.5 0 0 1 2.6 18.998C2 17.82 2 16.28 2 13.2v-.4c0-3.08 0-4.62.6-5.797A5.5 5.5 0 0 1 5.002 4.6C6.18 4 7.72 4 10.8 4M8 5 7 2m9 3 1-3M2.083 9h19.834"/>',
        'cloud': '<path d="M20.51 17.724c3.724-3.211-.217-7.518-4.31-7.518C13.317-1.077-3.596 8.256 3.899 16.76 5.237 18.177 6.298 19 8.215 19h8.469c1.519 0 2.73-.189 3.825-1.276"/>',
        'sun': '<path d="M12 2.002v2.222m0 15.556v2.222M4.224 12H2.002m19.996 0h-2.222m0-7.776-2.222 2.221M4.224 4.224l2.222 2.221m0 11.11-2.222 2.22m15.552 0-2.222-2.22M16.444 12a4.443 4.443 0 1 1-8.887 0 4.443 4.443 0 0 1 8.887 0"/>',
        'moon': '<path d="M22 13.883c-.778 8.469-12.08 10.775-17.436 4.702C-.186 13.201 1.642 2.797 10.22 2c-2.42 3.29-1.716 8.027.433 10.538 2.42 2.827 7.658 4.084 11.346 1.345"/>',
        'coffee': '<path d="M3 10h14v4.2c0 2.38 0 3.57-.463 4.48a4.25 4.25 0 0 1-1.857 1.857c-.91.463-2.1.463-4.48.463h-.4c-2.38 0-3.57 0-4.48-.463a4.25 4.25 0 0 1-1.857-1.857C3 17.77 3 16.58 3 14.2Z"/><path d="M17 12h1a3 3 0 0 1 0 6h-1.212M5.5 3c-.9.7-.9 1.05 0 1.75s.9 1.05 0 1.75M10 3c-.9.7-.9 1.05 0 1.75s.9 1.05 0 1.75M14.5 3c-.9.7-.9 1.05 0 1.75s.9 1.05 0 1.75"/>',
        'key': '<path d="m8.502 15.498 1.704 1.704c1.105 1.106-.934 1.495-1.19 3.038-.086.518-.262.974-.835 1.17-.507.173-.983-.023-1.598-.638l-1.677-1.678M2 22l11.464-11.464a5 5 0 1 0 7.073-7.073 5 5 0 0 0-7.072 7.073"/>',
        'wrench': '<path d="M11.464 9.707A5.5 5.5 0 0 1 16.374 2l-1.753 4.814a2 2 0 1 0 3.759 1.369l1.752-4.815a5.5 5.5 0 0 1-5.84 9.168l-8.879 8.878a2 2 0 0 1-2.828-2.828z"/>',
        'hammer': '<path d="M10 9v11a2 2 0 0 0 4 0V9h2.5c.93 0 1.396 0 1.773-.122a2.5 2.5 0 0 0 1.605-1.606C20 6.897 20 6.432 20 5.5c0-.93 0-1.396-.122-1.772a2.5 2.5 0 0 0-1.605-1.606C17.896 2 17.43 2 16.5 2h-7C6.5 2 4 4.2 3 8.5c2.2-1.7 5-1.4 7 .5"/>',
        'cpu': '<path d="M9 4h3c2.8 0 4.2 0 5.27.545a5 5 0 0 1 2.185 2.185C20 7.8 20 9.2 20 12s0 4.2-.545 5.27a5 5 0 0 1-2.185 2.185C16.2 20 14.8 20 12 20s-4.2 0-5.27-.545a5 5 0 0 1-2.185-2.185C4 16.2 4 14.8 4 12V9a5 5 0 0 1 5-5V2m6 2.048V2m4.952 7H22m-2.048 6H22m-7 4.952V22m-6-2.048V22m-4.952-7H2m2-6H2m10 0c.932 0 1.398 0 1.765.152a2 2 0 0 1 1.083 1.083C15 10.602 15 11.068 15 12s0 1.398-.152 1.765a2 2 0 0 1-1.083 1.083C13.398 15 12.932 15 12 15s-1.398 0-1.765-.152a2 2 0 0 1-1.083-1.083C9 13.398 9 12.932 9 12s0-1.398.152-1.765a2 2 0 0 1 1.083-1.083C10.602 9 11.068 9 12 9"/>',
        'database': '<path d="M21 11.722c0 5.186-18 5.186-18 0m0-6.389V18.85c0 4.2 18 4.2 18 0V5.333M12 2C7.03 2 3 3.433 3 5.2c0 4.622 18 4.622 18 0C21 3.433 16.97 2 12 2"/><path d="M15.037 11.801c.936-.128 1.824-.32 2.615-.572M15 18.573A15.7 15.7 0 0 0 17.615 18"/>',
        'terminal': '<path d="M4 18c1.167-2.1 3.9-4.833 6-6-2.1-1.167-4.833-3.9-6-6m16 12h-9"/>',
        'branch': '<path d="M5 2v14c0-5.719 5.553-11 11-11"/><path d="M8 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>',
        'merge': '<path d="M2 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0m14 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/><path d="M5 22V8c0 5.719 5.553 11 11 11"/>',
        'pull-request': '<path d="M5 22V8a3 3 0 1 1 0-6 3 3 0 0 1 0 6m6.5-3h2.7c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C19 7.28 19 8.12 19 9.8V16a3 3 0 1 1 0 6 3 3 0 0 1 0-6"/>',
        'pencil': '<path d="M3.344 15.404a10.97 10.97 0 0 1 5.278 5.25 2.88 2.88 0 0 1-2.038.846H2.5v-4.058c0-.764.304-1.497.844-2.038l11.45-11.462c.553-.554.829-.83 1.111-1.006a2.89 2.89 0 0 1 3.05 0c.281.176.558.452 1.111 1.006.552.552.828.828 1.003 1.11a2.89 2.89 0 0 1-.001 3.048c-.175.282-.452.558-1.005 1.11L8.622 20.655M19.15 10.122a10.98 10.98 0 0 0-5.267-5.268"/>',
        'trash': '<path d="M4 6h16M8.923 6c0-5.313 6.154-5.313 6.154 0M13.6 10.367a26.8 26.8 0 0 1 0 6.537m-3.2-6.536a26.8 26.8 0 0 0 0 6.536M5.6 8.706s-.252 6.219.445 9.227C6.73 20.89 7.8 22 10.741 22h2.518c2.941 0 4.012-1.11 4.697-4.067.697-3.008.444-9.227.444-9.227"/>',
        'share': '<path d="M18 11c.932 0 1.398 0 1.765.152a2 2 0 0 1 1.083 1.083C21 12.602 21 13.068 21 14v3c0 2.2-1.578 5-4.375 5h-9.25C4.58 22 3 19.203 3 17.005V14c0-.932 0-1.398.152-1.765a2 2 0 0 1 1.083-1.083C4.602 11 5.068 11 6 11m6 6V2m5 4.875a9.75 9.75 0 0 1-4.058-3.467L12 2l-.942 1.408A9.75 9.75 0 0 1 7 6.875"/>',
        'bookmark': '<path d="M6 20.835V5.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C7.52 2 8.08 2 9.2 2h5.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C18 3.52 18 4.08 18 5.2v15.635c0 3-4.73-1.321-5.473-1.858a.9.9 0 0 0-1.054 0C10.729 19.514 6 23.834 6 20.835"/>',
        'target': '<path d="m12 12 9-9m1 2h-3V2m2.367 6.5A10 10 0 1 1 15.5 2.633m1.975 8.842a5.5 5.5 0 1 1-4.95-4.95"/>',
        'medal': '<path d="M10.433 9.78c1.17-1.04 1.963-1.04 3.133 0 .41.351.826.527 1.372.566 1.742.137 2.08.474 2.216 2.216.039.546.215.962.566 1.371 1.04 1.17 1.04 1.963 0 3.134-.351.41-.527.826-.566 1.371-.137 1.742-.474 2.08-2.216 2.217a2.23 2.23 0 0 0-1.372.565c-1.17 1.04-1.963 1.04-3.133 0a2.2 2.2 0 0 0-1.371-.565c-1.742-.137-2.08-.474-2.217-2.217a2.22 2.22 0 0 0-.565-1.371c-1.04-1.17-1.04-1.963 0-3.133.351-.41.527-.826.565-1.372.137-1.742.474-2.08 2.217-2.216a2.2 2.2 0 0 0 1.371-.566M7 2l2.995 8.086M17 2l-2.995 8.086"/>',
        'gem': '<path d="M8.124 3h7.752c.413 0 .62 0 .811.051a1.5 1.5 0 0 1 .474.222c.162.114.294.273.559.59l3.427 4.113c.303.364.455.546.513.75a1 1 0 0 1 0 .548c-.058.204-.21.386-.513.75l-7.303 8.763c-.633.76-.95 1.14-1.33 1.278a1.5 1.5 0 0 1-1.029 0c-.379-.138-.695-.518-1.329-1.278l-7.303-8.763c-.303-.364-.455-.546-.513-.75a1 1 0 0 1 0-.548c.058-.204.21-.386.513-.75L6.28 3.864c.265-.318.397-.477.56-.59a1.5 1.5 0 0 1 .473-.223C7.504 3 7.71 3 8.124 3"/><path d="M2.301 9h19.398M14 3l2 6-4 11.156L8 9l2-6"/>',
        'lightbulb': '<path d="M6.012 8C5.794 4.693 8.692 2 12 2c3.307 0 6.206 2.693 5.988 6-.115 1.754-1.415 2.72-2.058 4a198 198 0 0 0-1.663 3.429 1 1 0 0 1-.903.571h-2.728a1 1 0 0 1-.903-.571A197 197 0 0 0 8.07 12c-.643-1.28-1.943-2.246-2.058-4M14 19h-4m3 3h-2"/>',
        'megaphone': '<path d="M20.01 17.333A22.95 22.95 0 0 0 20.01 4L9.485 7.575C8.014 8.075 6.492 8 4.963 8 3.878 8 3 8.927 3 10v1.333c0 1.074.878 2 1.963 2 1.53 0 3.05-.074 4.522.425zM20.01 4c-2.982 3.925-2.982 9.408 0 13.333m-14.393-4L7.253 20a5.72 5.72 0 0 1 4.58 0l-1.636-6"/>',
        'paperclip': '<path d="m3 10.027 6.394-6.144c6.05-5.82 15.873 3.158 9.578 9.215l-7.924 7.624c-4.105 3.95-10.771-2.143-6.5-6.253l7.811-7.514c2.16-2.078 5.668 1.127 3.42 3.29l-6.487 6.2"/>',
        'percent': '<path d="M4 6a3 3 0 1 1 6 0 3 3 0 0 1-6 0m10 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-15L7 21"/>',
        'hash': '<path d="M22 8c-6.65.333-13.415-.012-20-1"/><path d="m17 2-.039.194A101 101 0 0 0 15 22M9 2l-.039.194A101 101 0 0 0 7 22"/><path d="M22 16c-6.65.332-13.415-.012-20-1"/>',
        'at': '<path d="M16.555 7.504c-.657 1.418-.5 2.5-.555 4.496 0 5.678-8.889 5.741-8.889 0C7.111 6.27 16 6.27 16 12c0 5.556 6 5.551 6-.004C22 6.474 17.522 2 12 2S2 6.474 2 11.996c0 5.52 4.478 9.994 10 9.994 1.861.093 4.376-.468 6.418-2.034"/>',
        'wifi': '<path d="M2 9.483c5.603-5.31 14.397-5.31 20 0"/><path d="M19 12.9c-3.866-3.867-10.134-3.867-14 0m11 3.257a5.657 5.657 0 0 0-8 0m4 3.093v-.5"/>',
        'battery': '<path d="M22 10v4M6 9.5v5m4-5v5m4-5v5M8 6h4c2.1 0 3.15 0 3.953.409a3.75 3.75 0 0 1 1.638 1.638C18 8.85 18 9.9 18 12s0 3.15-.409 3.953a3.75 3.75 0 0 1-1.639 1.638C15.15 18 14.1 18 12 18H8c-2.1 0-3.15 0-3.952-.409a3.75 3.75 0 0 1-1.64-1.639C2 15.15 2 14.1 2 12s0-3.15.409-3.953A3.75 3.75 0 0 1 4.048 6.41C4.85 6 5.9 6 8 6"/>',
        'alarm': '<path d="M2.5 4.348 5.825 2M21.5 4.348 18.175 2M12 8.316V11.4c0 .704.353 1.36.94 1.751l2.227 1.48m5.277-2.131a8.4 8.4 0 0 1-2.473 5.955A8.46 8.46 0 0 1 12 20.921a8.46 8.46 0 0 1-5.971-2.466A8.4 8.4 0 0 1 3.556 12.5a8.4 8.4 0 0 1 2.473-5.954A8.46 8.46 0 0 1 12 4.079c2.24 0 4.387.887 5.971 2.467a8.4 8.4 0 0 1 2.473 5.954m-2.213 5.731L22 22M5.769 18.231 2 22"/>',
        'hourglass': '<path d="M5 2h14M5 22h14M6 2v2.5c0 2.6 1.7 4.6 3.9 6l4.2 3c2.2 1.4 3.9 3.4 3.9 6V22M6 22v-2.5c0-2.6 1.7-4.6 3.9-6l4.2-3c2.2-1.4 3.9-3.4 3.9-6V2"/>',
        'cart': '<path d="m5.142 7-.667-3.044C4.225 2.815 3.194 2 2 2m3.142 5 1.626 7.42c.1.454.359.861.732 1.15s.838.44 1.314.43H18.82a2.08 2.08 0 0 0 1.28-.443 2 2 0 0 0 .715-1.127l1.136-4.997C22.234 8.183 21.26 7 19.949 7zM19.5 20.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-9.5 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>',
        'card': '<path d="M2 8.667c0-1.085 0-1.629.12-2.074A3.5 3.5 0 0 1 4.592 4.12C5.04 4 5.582 4 6.668 4h10.665c1.085 0 1.628 0 2.073.12a3.5 3.5 0 0 1 2.475 2.474c.119.445.119.988.119 2.074v5.738c0 1.958 0 2.937-.381 3.685a3.5 3.5 0 0 1-1.528 1.528c-.748.381-1.727.381-3.685.381H7.6c-1.96 0-2.94 0-3.689-.381a3.5 3.5 0 0 1-1.53-1.53C2 17.34 2 16.36 2 14.4zm0 0h20M5.333 15.333h4.445"/>',
        'truck': '<path d="M14 18V8.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C11.72 4 10.88 4 9.2 4H6.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C2 6.28 2 7.12 2 8.8V15c0 .932 0 1.398.152 1.765a2 2 0 0 0 1.083 1.083C3.602 18 4.068 18 5 18m4 0h6m-1-9h3c.7 0 1.4.35 1.8.95l2.7 3.6c.3.4.5.95.5 1.45v1.4c0 .56 0 .84-.109 1.054a1 1 0 0 1-.437.437C21.24 18 20.96 18 20.4 18H19"/><path d="M5 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0m10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/>',
        'plane': '<path d="m21.117 5.995-2.62 2.62c-.18.18-.27.271-.328.378a.8.8 0 0 0-.095.305c-.013.121.01.247.057.498l1.671 9.02c.042.225.063.337.061.446a1.1 1.1 0 0 1-.184.595c-.06.09-.141.171-.303.333-.355.356-.533.535-.713.612a1.01 1.01 0 0 1-1.06-.162c-.148-.127-.265-.35-.498-.796l-2.548-4.865c-.282-.538-.423-.808-.629-.927a.83.83 0 0 0-.597-.091c-.233.052-.447.268-.877.698l-1.066 1.066c-.143.144-.215.216-.266.3a.8.8 0 0 0-.1.24c-.022.095-.022.196-.022.399v3.39c0 .269 0 .404-.03.53a1.1 1.1 0 0 1-.132.318c-.068.111-.163.206-.353.396l-.107.108c-.328.327-.491.49-.68.551a.83.83 0 0 1-.51 0c-.189-.06-.352-.224-.68-.552l-5.913-5.914c-.328-.327-.491-.49-.552-.679a.83.83 0 0 1 0-.51c.06-.189.224-.352.551-.68l.107-.107c.19-.19.286-.285.397-.353a1.1 1.1 0 0 1 .318-.132c.126-.03.261-.03.53-.03h3.39c.203 0 .304 0 .4-.023a.8.8 0 0 0 .24-.099c.083-.051.155-.123.298-.266l1.065-1.063c.431-.43.647-.645.7-.878a.83.83 0 0 0-.091-.598c-.12-.207-.39-.348-.93-.63L4.154 6.894c-.446-.234-.669-.35-.796-.499a1.01 1.01 0 0 1-.16-1.056c.076-.18.255-.358.611-.714.164-.163.245-.244.335-.304a1.1 1.1 0 0 1 .595-.184c.109-.002.221.019.447.06l9.019 1.672c.251.046.377.07.498.057a.8.8 0 0 0 .305-.095c.107-.058.197-.148.378-.329l2.62-2.619a2.2 2.2 0 1 1 3.112 3.112"/>',
        'heart-pulse': '<path d="M2 8c0 6.067 10 13 10 13s10-6.933 10-13c0-5.6-7.507-6.931-10-1.752C9.552 1.163 2 2.483 2 8"/><path d="M8 12h1.5l1.5-2 2.5 5 1.5-3h1"/>',
        'ghost': '<path d="M9 9v2m6-2v2M4 20V10a8 8 0 1 1 16 0v10q-2 2-4 0c-2-2-2.667-1.333-4 0q-2 2-4 0t-4 0"/>',
        'skull': '<path d="M7 19.4c-3-1.5-5-4.1-5-7.4a10 10 0 0 1 20 0c0 3.3-2 5.9-5 7.4 0 .558 0 .837-.055 1.067a2 2 0 0 1-1.478 1.478c-.23.055-.51.055-1.067.055H9.6c-.558 0-.837 0-1.067-.055a2 2 0 0 1-1.478-1.478C7 20.237 7 19.957 7 19.4"/><path d="M12 18.5V22M6 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m8 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/>',
        'party': '<path d="M5.834 9.444 2 22l12.493-3.854m-9.016-7.534c-.027-.5.092-.902.357-1.168.236-.238.583-.362 1.02-.363.436-.002.953.119 1.523.355 1.15.476 2.441 1.391 3.59 2.545 1.148 1.154 2.06 2.452 2.533 3.608.474 1.156.471 2.076-.007 2.557-.237.238-.583.361-1.02.363q-.071 0-.144-.004c-.405-.022-.871-.141-1.379-.351a9.4 9.4 0 0 1-1.796-1.019 14 14 0 0 1-1.794-1.527c-1.148-1.153-2.06-2.451-2.533-3.607-.212-.516-.328-.985-.35-1.389M15.643 2c.518 2.051 1.15 2.693 2.875 3.25-1.725.557-2.357 1.199-2.874 3.25-.518-2.051-1.15-2.693-2.875-3.25 1.725-.557 2.357-1.199 2.875-3.25m4.724 9.435c.294 1.166.653 1.532 1.633 1.848-.98.315-1.339.68-1.633 1.846-.294-1.165-.653-1.53-1.632-1.846.98-.316 1.338-.681 1.632-1.848"/>',
        'handshake': '<path d="M12 4H2v8.5L9.5 20c.6.6 1.4 1 2.25 1h.5c.85 0 1.65-.4 2.25-1l7.5-7.5V4h-5"/><path d="M12 4 9.25 6.75a1.768 1.768 0 0 0 2.5 2.5L13.5 7.5a2.475 2.475 0 0 1 3.5 0l4.872 5.122m-4.596.354 2.121 2.121m-4.596.354 2.121 2.121"/>',
        'puzzle': '<path d="M22 10.222V7.778C22 6.405 21.515 6 20.222 6c-.854 0-2.722.338-2.722-1 0-1.634-1.366-3-3-3s-3 1.366-3 3c0 1.338-1.868 1-2.722 1C7.405 6 7 6.485 7 7.778v2.444C7 11.658 6.45 12 5 12c-1.631 0-3 1.384-3 3 0 1.631 1.385 3 3 3 1.45 0 2 .342 2 1.778v.444c0 .631-.04 1.327.607 1.657.237.121.549.121 1.17.121h11.445C21.595 22 22 21.515 22 20.222v-.444c0-.622 0-.934-.121-1.171-.357-.7-1.213-.607-1.879-.607-1.634 0-3-1.366-3-3s1.366-3 3-3c1.45 0 2-.342 2-1.778"/>',
        'palette': '<path d="M12 22c1.076 0 2.805-.5 1.993-1.907S11.5 17 14.75 16c3.215-.99 7.25-.85 7.25-5 0-5.305-4.994-9-10-9C6.553 2 2 6.553 2 12s4.553 10 10 10"/><path d="M6 14c0 .5.5 1.5 1 1.802M12.783 6s-1.283 0-2.033.345M7.06 8C6.5 8.5 6 9.768 6 9.768m11.6-.143S17 8.5 16.167 8.143"/>',
        'brush': '<path d="m5.684 21.38 4.1-4.084s5.843 2.366 6.123 0c.033-.279.191-.528 0-.719L7.441 8.143a.526.526 0 0 0-.72 0c-2.033 2.025 0 6.102 0 6.102l-4.1 4.085c-.824.821-.832 2.221 0 3.05.825.822 2.23.83 3.063 0M7.553 8.214 8 7.99a13.43 13.43 0 0 0 5.988-5.976.025.025 0 0 1 .039-.007l3.089 3.091c1.044 1.046-.648 4.55-.947 5.734-.05.194.186.332.331.195.732-.693 2.861-3.681 4.049-2.493l1.443 1.445q.013.013.005.031c-1.48 2.633-3.768 4.706-6.493 5.99"/>',
        'scale': '<path d="M18.678 22A43 43 0 0 0 12 21.475c-2.233 0-4.467.175-6.678.525M12 21.475V2M5.322 5.085s4.118 7.677 3.185 10.528c-.903 2.751-5.467 2.751-6.37 0-.933-2.85 3.185-10.529 3.185-10.529L12 4.104l6.678.98c0-.001 4.118 7.678 3.185 10.528-.903 2.751-5.467 2.751-6.37 0-.933-2.851 3.185-10.528 3.185-10.528"/>',
        'landmark': '<path d="M2.5 9C6.1 7.7 9.3 5.6 12 2.5c2.7 3.1 5.9 5.2 9.5 6.5zM6 12v6m4-6v6m4-6v6m4-6v6M3 21h18"/>',
        'store': '<path d="M3.951 6q.675-2 2.686-2h10.726q2.011 0 2.686 2c.66 1.53 1.7 3.46.122 4.766-1.182.979-3.087.979-4.269 0-.566-.469-.884-1.104-.884-1.767 0 .663-.318 1.298-.884 1.767-1.181.979-3.087.979-4.268 0C9.3 10.297 8.982 9.662 8.982 9c0 .663-.318 1.298-.884 1.767-1.182.979-3.087.979-4.269 0C2.252 9.46 3.292 7.531 3.951 6"/><path d="M4.5 11.17v7.33Q4.5 21 7 21h10q2.5 0 2.5-2.5v-7.33"/><path d="M9.5 21v-3.5a2.5 2.5 0 0 1 5 0V21"/>',
        'school': '<path d="M2 19.4v-3.6c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C4.28 11 5.12 11 6.8 11H7V7.968c0-.538 0-.806.066-1.056a2 2 0 0 1 .283-.62c.146-.214.349-.39.755-.742l1.8-1.56c.743-.644 1.115-.966 1.533-1.089a2 2 0 0 1 1.127 0c.417.123.789.445 1.532 1.089l1.8 1.56c.406.352.61.528.755.741a2 2 0 0 1 .283.62c.066.25.066.52.066 1.057V11h.2c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C22 13.28 22 14.12 22 15.8v3.6c0 .56 0 .84-.109 1.054a1 1 0 0 1-.437.437C21.24 21 20.96 21 20.4 21H3.6c-.56 0-.84 0-1.054-.109a1 1 0 0 1-.437-.437C2 20.24 2 19.96 2 19.4"/><path d="M10 21v-3a2 2 0 0 1 4 0v3M10 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/>',
        'graduation': '<path d="M3 17V8.5l9-4 9 4-9 4-9-4m15 1.333V16c0 2-2.5 3.5-6 3.5S6 18 6 16V9.833"/>',
        'stethoscope': '<path d="M4.5 2c-.466 0-.699 0-.883.076a1 1 0 0 0-.54.541C3 2.801 3 3.034 3 3.5v2c0 3.5 2.5 6 5 6.5 2.5-.5 5-3 5-6.5v-2c0-.466 0-.699-.077-.883a1 1 0 0 0-.54-.541C12.199 2 11.966 2 11.5 2M8 12v3.5a5.5 5.5 0 0 0 11 0v-2"/><path d="M16.5 11a2.5 2.5 0 1 1 5.001 0 2.5 2.5 0 0 1-5.001 0"/>',
        'pill': '<path d="M15.536 15.536 19.07 12A5 5 0 1 0 12 4.929L4.929 12A5 5 0 1 0 12 19.072zm0 0L8.465 8.465"/>',
        'dna': '<path d="M7 2c.01.083.021.333.062.5q.06.25.183.5.122.25.3.5.179.25.41.5t.509.5.597.5c.211.167.437.333.669.5s.477.333.725.5.505.333.763.5c.257.167.521.333.782.5s.525.333.782.5a40 40 0 0 1 1.488 1c.232.167.458.333.669.5q.318.25.597.5t.509.5.41.5q.178.25.3.5t.183.5a2.1 2.1 0 0 1 0 1 2.5 2.5 0 0 1-.183.5q-.121.25-.3.5a5 5 0 0 1-.41.5 8 8 0 0 1-.509.5 10 10 0 0 1-.409.349m-6.254 4.302q-.215.174-.409.349a8 8 0 0 0-.509.5 5 5 0 0 0-.41.5q-.178.25-.3.5a2.5 2.5 0 0 0-.183.5c-.041.167-.052.417-.062.5M17 2c-.01.083-.021.333-.062.5a2.5 2.5 0 0 1-.183.5q-.121.25-.3.5a5 5 0 0 1-.41.5 8 8 0 0 1-.509.5 10 10 0 0 1-.409.349M8.873 9.151q-.215.174-.409.349a8 8 0 0 0-.509.5 5 5 0 0 0-.41.5q-.178.25-.3.5a2.5 2.5 0 0 0-.183.5 2.1 2.1 0 0 0 0 1q.06.25.183.5.122.25.3.5.179.25.41.5t.509.5.597.5c.211.167.437.333.669.5s.477.333.725.5q.356.238.725.475c.295.192.559.358.82.525s.525.333.782.5a40 40 0 0 1 1.488 1c.232.167.458.333.669.5q.318.25.597.5t.509.5.41.5q.178.25.3.5t.183.5c.041.167.052.417.062.5"/>',
        'microscope': '<path d="M13 9V5c0-.932 0-1.398-.152-1.765a2 2 0 0 0-1.083-1.083C11.398 2 10.932 2 10 2s-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083C7 3.602 7 4.068 7 5v4c0 .932 0 1.398.152 1.765a2 2 0 0 0 1.083 1.083C8.602 12 9.068 12 10 12s1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083C13 10.398 13 9.932 13 9m0-1a6.5 6.5 0 0 1 6.325 8A6.5 6.5 0 0 1 13 21m6.325-5H6m14 5H4"/>',
        'telescope': '<path d="M12.365 5.98C10.518 7.045 8.661 8.056 7.11 9.548l-3.81 2.2c-2.75 1.553-.7 5.197 2.119 3.604L9.18 13.18a13.4 13.4 0 0 0 3.633-1.403L15 10.539M7.111 9.55l2.07 3.631M16.965 22l-4.531-10-4.531 10M21.456 5.094l-1.063-1.8c-.884-1.498-1.388-1.616-2.902-.761L13.759 4.64c-.843.476-1.263.714-1.373 1.122-.251.93 1.759 4.6 2.878 4.897.4.107.808-.124 1.624-.584l3.79-2.141c1.515-.855 1.661-1.341.778-2.84"/>',
        'satellite': '<path d="m17.075 12.217 3.435 3.436c.594.594.89.89 1.002 1.233a1.5 1.5 0 0 1 0 .927c-.111.343-.409.64-1.003 1.234l-.14.14c-.594.595-.892.891-1.234 1.003a1.5 1.5 0 0 1-.927 0c-.342-.111-.64-.408-1.233-1.002l-3.436-3.435m-1.756-8.828L8.347 3.49c-.594-.594-.89-.89-1.233-1.002a1.5 1.5 0 0 0-.927 0c-.343.111-.64.409-1.234 1.003l-.14.14c-.594.595-.891.892-1.003 1.234a1.5 1.5 0 0 0 0 .927c.111.342.408.64 1.002 1.233l3.435 3.436m1.289 8.242a8 8 0 0 1-4.239-4.239m2.143 7.122a11.5 11.5 0 0 1-5.026-5.026m7.065-8.403a4.5 4.5 0 1 0 6.364 6.364A4.5 4.5 0 0 0 9.48 8.157"/>',
        'mountain': '<path d="M8.339 6.342Q9.01 5 9.771 6.293l3.732 6.345q.507.863 1.037.014l1.175-1.88q.795-1.273 1.547.026l4.347 7.51q.4.692-.399.692H2.81q-.8 0-.442-.716z"/>',
        'tree': '<path d="M12 17h6.8q1.2 0 .52-.989l-4.48-6.517Q14.5 9 15.1 9h1.1q.8 0 .335-.651l-3.838-5.373q-.698-.975-1.394 0L7.465 8.349Q7 9 7.8 9h1.1q.6 0 .26.494l-4.48 6.517q-.68.99.52.989zm0 0v5"/>',
        'flower': '<path d="M15.527 7.678a3.6 3.6 0 1 1 2.179 6.708A3.6 3.6 0 1 1 12 18.532a3.602 3.602 0 0 1-6.439.235 3.6 3.6 0 0 1 .733-4.381 3.6 3.6 0 1 1 2.179-6.708 3.6 3.6 0 1 1 7.054 0"/><path d="M9.5 12.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"/>',
        'sprout': '<path d="M12 10.759a7.5 7.5 0 0 1 8-7 7.5 7.5 0 0 1-8 7 7.5 7.5 0 0 1-8-7 7.5 7.5 0 0 1 8 7v8m7 1.5c-1.5-1-4.25-1.5-7-1.5s-5.5.5-7 1.5"/>',
        'snowflake': '<path d="M14.1 21.637 12 18V6L9.9 2.363M4.704 18.637 6.804 15l10.392-6 2.1-3.637m-14.592 0L6.804 9l10.392 6 2.1 3.637M12 6l2.1-3.637M17.196 9h4.2m-4.2 6h4.2M12 18l-2.1 3.637M6.804 15h-4.2m4.2-6h-4.2"/>',
        'umbrella': '<path d="M8 20a2 2 0 0 0 4 0v-8a2.833 2.833 0 0 1 5 0 2.833 2.833 0 0 1 5 0 10 10 0 0 0-20 0 2.833 2.833 0 0 1 5 0 2.833 2.833 0 0 1 5 0"/>',
        'wind': '<path d="M3 7h12a2.5 2.5 0 1 0-1.768-4.268M3 12h18M3 17h14a2.5 2.5 0 1 1-1.768 4.268"/>',
        'droplet': '<path d="M12 2c-3 4-7 8-7 13a7 7 0 1 0 14 0c0-5-4-9-7-13"/><path d="M8.5 15a3.5 3.5 0 0 0 3.5 3.5"/>',
        'lamp': '<path d="M12 10h5.5q1.5 0 .973-1.404l-1.946-5.192Q16 2 14.5 2h-5Q8 2 7.473 3.404L5.527 8.596Q5 10 6.5 10zm0 0v8m0 0H9a2 2 0 1 0 0 4h6a2 2 0 1 0 0-4z"/>',
        'vote': '<path d="M5 14h13.8c.186 0 .279 0 .357.004a3 3 0 0 1 2.839 2.839c.004.078.004.171.004.357 0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C19.72 22 18.88 22 17.2 22H6.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C2 19.72 2 18.88 2 17.2V17a3 3 0 0 1 3-3V6.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C7.28 2 8.12 2 9.8 2h4.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C19 4.28 19 5.12 19 6.8V14"/><path d="m8.5 8 2.5 2.5S13.5 7 15.5 6"/>',
        'chart-line': '<path d="M22 22H11.6c-3.36 0-5.04 0-6.324-.654a6 6 0 0 1-2.622-2.622C2 17.44 2 15.76 2 12.4V2"/><path d="m2.055 15.957 4.016-3.17c1.725-1.362 2.859-1.222 4.348.189 1.63 1.544 2.793 1.48 4.41.139L21 8"/>',
        'chart-pie': '<path d="M12 22a10.05 10.05 0 0 0 9.985-8.547C22.11 12.63 21.423 12 20.591 12h-6.13c-.845 0-1.267 0-1.59-.213a1.5 1.5 0 0 1-.658-.659C12 10.806 12 10.384 12 9.54V3.41c0-.832-.629-1.519-1.453-1.394A10.05 10.05 0 0 0 12 22"/>',
        'chart-bar': '<path d="M22 22H11.6c-3.36 0-5.04 0-6.324-.654a6 6 0 0 1-2.622-2.622C2 17.44 2 15.76 2 12.4V2m5 15h6m-6-5h12M7 7h8.4"/>',
        'trend-up': '<path d="m2 19 3.001-4.688c2.559-3.006 8.237.777 10.692-1.999L20.5 6.5 22 5m0 10c-1.31-3.146-1.26-6.852 0-10-3.207 1.466-6.784 1.197-10 0"/>',
        'trend-down': '<path d="m2 5 3.001 4.688c2.559 3.006 8.237-.777 10.692 1.999L20.5 17.5 22 19m0-10c-1.31 3.146-1.26 6.852 0 10-3.207-1.466-6.784-1.197-10 0"/>',
        'clipboard': '<path d="M8 4c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 0 0-1.093 1.093C4 5.9 4 6.6 4 8v8.4c0 1.96 0 2.94.381 3.689a3.5 3.5 0 0 0 1.53 1.53C6.66 22 7.64 22 9.6 22h4.8c1.96 0 2.94 0 3.689-.381a3.5 3.5 0 0 0 1.53-1.53C20 19.34 20 18.36 20 16.4V8c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.093C18.1 4 17.4 4 16 4m-6-2h4c2.64 0 2.65 4 0 4h-4c-2.65 0-2.64-4 0-4"/><path d="m8.25 14.357 2.344 2.143s2.86-4 5.156-5"/>',
        'checklist': '<path d="M13 5h9m-9 7h9m-9 7h9M2 7.286 3.875 9S6.164 5.8 8 5M2 17.286 3.875 19S6.164 15.8 8 15"/>',
        'notebook': '<path d="M10.8 22h4.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C20 19.72 20 18.88 20 17.2V6.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C17.72 2 16.88 2 15.2 2h-4.4c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C6 4.28 6 5.12 6 6.8v10.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C8.28 22 9.12 22 10.8 22"/><path d="M4 7a4.47 4.47 0 0 1 4 0m-4 5a4.47 4.47 0 0 1 4 0m-4 5a4.47 4.47 0 0 1 4 0m4-15v6.5L14 7l2 1.5V2"/>',
        'note': '<path d="M3 11c0-2.8 0-4.2.545-5.27A5 5 0 0 1 5.73 3.545C6.8 3 8.2 3 11 3h2c2.8 0 4.2 0 5.27.545a5 5 0 0 1 2.185 2.185C21 6.8 21 8.2 21 11v2c0 5-4 9-9 9h-1.8c-2.52 0-3.78 0-4.743-.49a4.5 4.5 0 0 1-1.966-1.967C3 18.58 3 17.32 3 14.8Zm4-2h10M7 13h6"/>',
        'scroll': '<path d="M19 17V8.6c0-1.96 0-2.94-.381-3.689a3.5 3.5 0 0 0-1.53-1.53C16.34 3 15.36 3 13.4 3H4M2.604 7C1.368 5.735 2.107 3 4.13 3A1.87 1.87 0 0 1 6 4.87V17.4c0 1.26 0 1.89.245 2.372a2.25 2.25 0 0 0 .984.983C7.709 21 8.339 21 9.6 21h10.376c1.851 0 2.952-4 .978-4h-9.772c-1.773 0-.441 4-2.932 4m1-8.5h6.5M9.25 9h4.333"/>',
        'newspaper': '<path d="M6 10h-.8c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 11.52 2 12.08 2 13.2v5.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 22 4.08 22 5.2 22h10.4c2.24 0 3.36 0 4.216-.436a4 4 0 0 0 1.748-1.748C22 18.96 22 17.84 22 15.6V8.4c0-2.24 0-3.36-.436-4.216a4 4 0 0 0-1.748-1.748C18.96 2 17.84 2 15.6 2h-3.2c-2.24 0-3.36 0-4.216.436a4 4 0 0 0-1.748 1.748C6 5.04 6 6.16 6 8.4V20a2 2 0 0 1-2 2"/><path d="M12 6h4a2 2 0 0 1 0 4h-4a2 2 0 0 1 0-4m-2 8h8m-8 4h5"/>',
        'presentation': '<path d="M2 3h20M4 3v11a2 2 0 0 0 .586 1.414A2 2 0 0 0 6 16h10.8c1.12 0 1.68 0 2.108-.219a2 2 0 0 0 .874-.874c.218-.428.218-.988.218-2.108V3M7 21l5-5 5 5"/>',
        'film': '<path d="M10 2h4c2.8 0 4.2 0 5.27.545a5 5 0 0 1 2.185 2.185C22 5.8 22 7.2 22 10v4c0 2.8 0 4.2-.545 5.27a5 5 0 0 1-2.185 2.185C18.2 22 16.8 22 14 22h-4c-2.8 0-4.2 0-5.27-.545a5 5 0 0 1-2.185-2.185C2 18.2 2 16.8 2 14v-4c0-2.8 0-4.2.545-5.27A5 5 0 0 1 4.73 2.545C5.8 2 7.2 2 10 2m-3 .048v19.904M17 2.048v19.904M2 8h5m-5 8h5m10-8h5m-5 8h5"/>',
        'gamepad': '<path d="M12 5H7.5c-2.9 0-4.4 2.2-4.9 5.5L2.1 15c-.3 2.9.9 4.8 2.9 4.8 1.4 0 2.3-.9 3.2-2.1l.6-.9c.5-.6 1.1-.8 1.8-.8h2.8c.7 0 1.3.2 1.8.8l.6.9c.9 1.2 1.8 2.1 3.2 2.1 2 0 3.2-1.9 2.9-4.8l-.5-4.5c-.5-3.3-2-5.5-4.9-5.5Zm-5.5 6h3M8 12.5v-3m7 2.5h.01m2.49-2.5h.01"/>',
        'dice': '<path d="M5.5 14.572a4 4 0 0 1-2.562-3.06l-.694-3.94a4 4 0 0 1 .662-2.989 4 4 0 0 1 2.582-1.645l3.94-.694a4 4 0 0 1 2.989.662 4 4 0 0 1 1.645 2.582M15.4 9h.2c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C22 12.04 22 13.16 22 15.4v.2c0 2.24 0 3.36-.436 4.216a4 4 0 0 1-1.748 1.748C18.96 22 17.84 22 15.6 22h-.2c-2.24 0-3.36 0-4.216-.436a4 4 0 0 1-1.748-1.748C9 18.96 9 17.84 9 15.6v-.2c0-2.24 0-3.36.436-4.216a4 4 0 0 1 1.748-1.748C12.04 9 13.16 9 15.4 9M13 18h.01M18 13h.01M6 6.5h.01"/>',
        'headphones': '<path d="M3 15v-3a9 9 0 1 1 18 0v3"/><path d="M5.5 13A2.5 2.5 0 0 1 8 15.5v3a2.5 2.5 0 0 1-5 0v-3A2.5 2.5 0 0 1 5.5 13m13 0a2.5 2.5 0 0 1 2.5 2.5v3a2.5 2.5 0 0 1-5 0v-3a2.5 2.5 0 0 1 2.5-2.5"/>',
        'mic': '<path d="M16 5.692v5.616c0 4.923-8 4.923-8 0V5.692c0-4.923 8-4.923 8 0m-4 12.975V22m7-8c-1.186 2.863-3.89 4.667-7 4.667S6.186 16.863 5 14m10 8H9"/>',
        'speaker': '<path d="M18.778 19.778c4.295-4.296 4.295-11.26 0-15.556m-2.333 12.222c2.42-2.42 2.42-6.468 0-8.888M13 2v20c-3.889 0-3.6-3.843-6.667-5.089C4.715 16.253 2 16.333 2 16.333V7.667s2.713-.007 4.333-.661C9.384 5.773 9.112 2 13 2"/>',
        'inbox': '<path d="M2.278 13h4.089c2.203 0 2.353 3.001 4.6 3h2.066c2.255 0 2.378-3 4.6-3h4.09m-17-9.767-2.403 8.72a9 9 0 0 0-.32 2.36v4.097c0 1.256 0 1.885.245 2.365a2.24 2.24 0 0 0 .98.98C3.705 22 4.334 22 5.59 22h12.82c1.256 0 1.885 0 2.365-.245a2.24 2.24 0 0 0 .98-.98c.245-.48.245-1.109.245-2.365v-4.097a9 9 0 0 0-.32-2.36l-2.402-8.72A2.26 2.26 0 0 0 17.288 2 25.7 25.7 0 0 1 6.711 2a2.26 2.26 0 0 0-1.989 1.233"/>',
        'send': '<path d="M10.578 13.422a.6.6 0 0 1 .123.178c.99 2.78 2.068 5.496 3.577 8.047a.594.594 0 0 0 1.104-.044 73.6 73.6 0 0 0 6.322-17.624l.261-1.189a.594.594 0 0 0-.755-.757A73.6 73.6 0 0 1 3.586 8.356l-1.19.261a.595.595 0 0 0-.044 1.104c2.458 1.703 5.092 2.998 8.048 3.578a.6.6 0 0 1 .178.123C12.101 12.528 13.812 11.287 15 10"/>',
        'reply': '<path d="M22 19.368v-2.3c0-1.345-.624-2.634-1.736-3.584-1.111-.95-2.618-1.484-4.19-1.484H2"/><path d="M9.5 5.368c-1.144 2.168-2.99 4.031-5.334 5.383L2 12l2.166 1.249c2.343 1.351 4.19 3.214 5.334 5.382"/>',
        'server': '<path d="M11.4 2h1.2c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C19 5.04 19 6.16 19 8.4v7.2c0 2.24 0 3.36-.436 4.216a4 4 0 0 1-1.748 1.748C15.96 22 14.84 22 12.6 22h-1.2c-2.24 0-3.36 0-4.216-.436a4 4 0 0 1-1.748-1.748C5 18.96 5 17.84 5 15.6V8.4c0-2.24 0-3.36.436-4.216a4 4 0 0 1 1.748-1.748C8.04 2 9.16 2 11.4 2M9 6h6m-6 4h6m-3 7h.01"/>',
        'webhook': '<path d="m6.024 17 3.001-5.197c.55-.953.166-2.1-.417-3.033a4 4 0 1 1 6.856-4.12M12 6.65l3.001 5.197c.55.953 1.736 1.194 2.835 1.155a4 4 0 1 1 .14 7.998m0-4h-6.002c-1.1 0-1.901.907-2.418 1.878A4 4 0 1 1 2.56 15"/>',
        'workflow': '<path d="M6 2c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093C10 3.9 10 4.6 10 6s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C8.1 10 7.4 10 6 10s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092C2 8.1 2 7.4 2 6s0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.093C3.9 2 4.6 2 6 2m12 12c1.4 0 2.1 0 2.635.273a2.5 2.5 0 0 1 1.092 1.092C22 15.9 22 16.6 22 18s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C20.1 22 19.4 22 18 22s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.092-1.092C14 20.1 14 19.4 14 18s0-2.1.273-2.635a2.5 2.5 0 0 1 1.092-1.092C15.9 14 16.6 14 18 14M6 10c0 5.5 2.5 8 8 8"/>',
        'network': '<path d="M9 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0M2 19a3 3 0 1 0 6 0 3 3 0 0 0-6 0m14 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/><path d="M5 16c0-4 7-4 7-8 0 4 7 4 7 8"/>',
        'fingerprint': '<path d="M10 12a2 2 0 1 1 4 0v7.5M6 21v-9a6 6 0 0 1 9-5.196m2.481 2.756c.342.768.519 1.599.519 2.44v3M2 18v-6a10 10 0 0 1 6.58-9.397m3.769-.597A10 10 0 0 1 22 12v6.75"/>',
        'qr': '<path d="M6 2c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093C10 3.9 10 4.6 10 6s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C8.1 10 7.4 10 6 10s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092C2 8.1 2 7.4 2 6s0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.093C3.9 2 4.6 2 6 2m12 0c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093C22 3.9 22 4.6 22 6s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C20.1 10 19.4 10 18 10s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.092-1.092C14 8.1 14 7.4 14 6s0-2.1.273-2.635a2.5 2.5 0 0 1 1.092-1.093C15.9 2 16.6 2 18 2M6 14c1.4 0 2.1 0 2.635.273a2.5 2.5 0 0 1 1.092 1.092C10 15.9 10 16.6 10 18s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C8.1 22 7.4 22 6 22s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092C2 20.1 2 19.4 2 18s0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.092C3.9 14 4.6 14 6 14m8 0h4v4m4-4h.01M14 18h.01M22 22h-4"/>',
        'barcode': '<path d="M2 4v16M6 4v14m4-14v16m4-16v14m4-14v16m4-16v16"/>',
        'id': '<path d="M7.6 4h8.8c1.96 0 2.94 0 3.689.381a3.5 3.5 0 0 1 1.53 1.53C22 6.66 22 7.64 22 9.6v4.8c0 1.96 0 2.94-.381 3.689a3.5 3.5 0 0 1-1.53 1.53C19.34 20 18.36 20 16.4 20H7.6c-1.96 0-2.94 0-3.689-.381a3.5 3.5 0 0 1-1.53-1.53C2 17.34 2 16.36 2 14.4V9.6c0-1.96 0-2.94.381-3.689a3.5 3.5 0 0 1 1.53-1.53C4.66 4 5.64 4 7.6 4"/><path d="M7.25 9a1.75 1.75 0 1 0 3.5 0 1.75 1.75 0 0 0-3.5 0M5.5 17c.25-4.5 6.75-4.5 7 0M15 8h3m-3 4h2"/>',
        'infinity': '<path d="M12 12C9.6 9.21 8.525 7.5 6.5 7.5a4.5 4.5 0 0 0 0 9c2.025 0 3.1-1.71 5.5-4.5s3.475-4.5 5.5-4.5a4.5 4.5 0 1 1 0 9c-2.025 0-3.1-1.71-5.5-4.5"/>',
        'recycle': '<path d="m18.377 12.16 2.718 4.756c.715 1.25.231 2.084-1.209 2.084h-5.4m2.475 2.75s-.762-1.558-2.475-2.75c1.713-1.192 2.475-2.75 2.475-2.75M10.086 19h-5.4c-1.44 0-1.924-.834-1.209-2.084l2.718-4.756m-3.616.785s1.731.111 3.616-.785c.185 2.079 1.16 3.513 1.16 3.513M8.377 8.34l2.718-4.756c.715-1.25 1.667-1.25 2.382 0l2.718 4.756m1.16-3.513s-.975 1.434-1.16 3.513c-1.885-.897-3.616-.785-3.616-.785"/>',
        'power': '<path d="M18.615 4.5a10 10 0 1 1-13.23 0M12 2v10"/>',
        'plug': '<path d="M12 22v-5m3-10V2m5 5H4m15 0c0 3.416-.266 10-5 10h-4c-4.734 0-5-6.584-5-10m4 0V2"/>',
        'radio': '<path d="M15.858 8.01c2.282 2.167 2.272 5.83 0 7.98M19.023 5c3.99 3.796 3.95 10.243-.001 14M8.376 15.99c-2.255-2.14-2.283-5.82 0-7.98M4.977 19C1.024 15.24.991 8.8 4.978 5m8.934 7c0-.88-.764-1.615-1.678-1.615s-1.678.735-1.678 1.615.764 1.615 1.678 1.615 1.678-.735 1.678-1.615"/>',
        'signal': '<path d="M4 20h.01M8 20v-4m4 4v-8m4 8V8m4 12V4"/>',
        'swords': '<path d="M3 21 21 3M4.061 16.404l3.535 3.535M21 21l-6.525-6.525m-4.95-4.95L3 3m13.404 16.94 3.535-3.536"/>',
        'hand': '<path d="M8 11V4a2 2 0 1 1 4 0v7M8 6a2 2 0 1 0-4 0v10c0 3.3 2.7 6 7 6h.2c3.08 0 4.62 0 5.797-.6a5.5 5.5 0 0 0 2.404-2.403C20 17.82 20 16.28 20 13.2V8a2 2 0 1 0-4 0m-4-3a2 2 0 1 1 4 0v6"/>',
        'coin': '<path d="M2 15h4.5l2.2-1.6c.5-.3 1-.4 1.5-.4H14a2 2 0 0 1 0 4h-3.5"/><path d="M2 21h10.6c.9 0 1.8-.3 2.5-.9l5.3-4.2a1.9 1.9 0 0 0-2.3-3l-2.15 1.7M11.5 6a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0M4 7.5a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/>',
        'bot': '<path d="M12 6h6c2.21 0 4 2.159 4 4.743v6.579C22 19.905 20.21 22 18 22H6c-2.21 0-4-2.095-4-4.678v-6.58C2 8.16 3.79 6 6 6Zm0 0V2.4m3.333-.4a14.1 14.1 0 0 1-6.666 0M8 12v-1.5m8 1.5v-1.5"/><path d="M15.75 16.5A6.27 6.27 0 0 1 12 17.75a6.27 6.27 0 0 1-3.75-1.25"/>',
        'brain': '<path d="M12 18.11V5.991c-.015-6.212-8.953-4.739-8.498 1.416-2.219 2.631-2.076 8.359 1.081 10.257-.51 5.445 7.416 5.944 7.417.446l-.001-12.119c.015-6.207 8.953-4.744 8.498 1.416 2.219 2.631 2.079 8.361-1.081 10.257.539 5.45-7.416 5.942-7.416.446m5.451-3.233c.546.138 1.782 1.032 1.968 2.775M16.171 7.259c-2.231.275-4.114 2.82-4.172 3.876-.057-1.056-1.94-3.6-4.171-3.876m11.53 2.608c.556-.482 1-1.58 1.142-2.458M6.548 14.88c-.547.137-1.782 1.03-1.968 2.774m.06-7.786c-.556-.482-1-1.58-1.141-2.458"/>',
        'atom': '<path d="M15.785 8.215c5.111 5.11 7.558 10.947 5.467 13.038-2.089 2.09-7.928-.358-13.037-5.468S.657 4.838 2.748 2.747c2.089-2.09 7.927.358 13.037 5.468"/><path d="M8.216 8.215C3.105 13.325.657 19.162 2.748 21.253c2.091 2.09 7.928-.358 13.037-5.468s7.559-10.947 5.468-13.038c-2.091-2.09-7.928.358-13.037 5.468"/><path d="M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>',
        'anchor': '<path d="M12 22V6.444a2.244 2.244 0 0 0 2.222-2.222A2.244 2.244 0 0 0 12 2a2.244 2.244 0 0 0-2.222 2.222A2.244 2.244 0 0 0 12 6.444M18 12c1.01.673 2.99.673 4 0 0 5.447-4.553 10-10 10S2 17.447 2 12c1.01.673 2.99.673 4 0"/>',
        'compass': '<path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12"/><path d="m9 15 1.5-4.5L15 9l-1.5 4.5z"/>',
        'map': '<path d="M8.667 5.934v15.84M15.333 2.2v15.84M2 8.213c0-1.696 0-2.544.436-3.039 1.505-1.72 4.115.774 5.853.713 2.856-.106 4.315-3.475 7.094-3.858 1.43-.2 3 .664 4.338 1.126C21.649 3.821 22 4.401 22 6.432v9.358c0 1.696 0 2.545-.436 3.04-1.687 1.917-4.436-1.12-6.505-.623-2.427.594-3.947 3.422-6.442 3.768-1.424.198-5.386-.834-6.303-2.15C2 19.373 2 18.773 2 17.57Z"/>',
        'layers': '<path d="M2 11v1c3.601.9 6.9 2.485 10 4.5 3.1-2.015 6.399-3.6 10-4.5v-1M2 15.5v1c3.601.9 6.9 2.485 10 4.5 3.1-2.015 6.399-3.6 10-4.5v-1M12 12C8.9 9.985 5.601 8.4 2 7.5 5.1 5.485 8.399 3.9 12 3c3.601.9 6.9 2.485 10 4.5-3.601.9-6.9 2.485-10 4.5"/>',
        'grid': '<path d="M6 2c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093C10 3.9 10 4.6 10 6s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C8.1 10 7.4 10 6 10s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092C2 8.1 2 7.4 2 6s0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.093C3.9 2 4.6 2 6 2m12 0c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093C22 3.9 22 4.6 22 6s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C20.1 10 19.4 10 18 10s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.092-1.092C14 8.1 14 7.4 14 6s0-2.1.273-2.635a2.5 2.5 0 0 1 1.092-1.093C15.9 2 16.6 2 18 2M6 14c1.4 0 2.1 0 2.635.273a2.5 2.5 0 0 1 1.092 1.092C10 15.9 10 16.6 10 18s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C8.1 22 7.4 22 6 22s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092C2 20.1 2 19.4 2 18s0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.092C3.9 14 4.6 14 6 14m12 0c1.4 0 2.1 0 2.635.273a2.5 2.5 0 0 1 1.092 1.092C22 15.9 22 16.6 22 18s0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C20.1 22 19.4 22 18 22s-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.092-1.092C14 20.1 14 19.4 14 18s0-2.1.273-2.635a2.5 2.5 0 0 1 1.092-1.092C15.9 14 16.6 14 18 14"/>',
        'list': '<path d="M9 6h12M9 12h12M9 18h12M3 6h2m-2 6h2m-2 6h2"/>',
        'refresh': '<path d="M20.75 7.5C19.203 3.968 16.086 2 11.976 2 6.776 2 2.502 5.947 2 11m20-8a6.73 6.73 0 0 0 0 5 6.76 6.76 0 0 0-5.012 0M2.75 16.5c1.547 3.532 5.164 5.5 9.274 5.5 5.2 0 9.473-3.947 9.976-9M2 21a6.73 6.73 0 0 0 0-5 6.76 6.76 0 0 0 5.012 0"/>',
        'arrow-up': '<path d="M12 21V5m-7 6.563a13.53 13.53 0 0 0 5.681-4.668L12 5l1.319 1.895A13.53 13.53 0 0 0 19 11.562"/>',
        'arrow-down': '<path d="M12 3v16m7-6.562a13.53 13.53 0 0 0-5.681 4.667L12 19l-1.319-1.895A13.53 13.53 0 0 0 5 12.438"/>',
        'arrow-left': '<path d="M21 12H5m6.563 7a13.53 13.53 0 0 0-4.668-5.681L5 12l1.895-1.319A13.53 13.53 0 0 0 11.563 5"/>',
        'arrow-right': '<path d="M3 12h16m-6.562-7a13.53 13.53 0 0 0 4.667 5.681L19 12l-1.895 1.319A13.53 13.53 0 0 0 12.438 19"/>',
        'ban': '<path d="M19.07 4.93 4.93 19.07A10 10 0 0 0 19.07 4.93 10 10 0 0 0 4.929 19.071"/>',
        'circle-check': '<path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12"/><path d="m8.25 12.357 2.344 2.143s2.86-4 5.156-5"/>',
        'circle-x': '<path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12m13-3-6 6m6 0L9 9"/>',
        'question': '<path d="M2 12a10 10 0 0 1 20 0c0 2.626-1.072 5.214-2.929 7.071A10.1 10.1 0 0 1 12 22a10.1 10.1 0 0 1-7.071-2.929A10.1 10.1 0 0 1 2 12"/><path d="M12 13.833c0-2.503 2.75-2.337 2.75-4.84 0-3.324-5.5-3.324-5.5 0M12 17.5v-.625"/>',
        'pause': '<path d="M5 5.497v13.037c0 2.016 4 1.892 4 0V5.497c0-1.949-4-1.836-4 0m10 0v13.037c0 2.016 4 1.892 4 0V5.497c0-2.015-4-1.977-4 0"/>'
    };
    function badgeInk(hex) {
        const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
        if (!m) return '#fff';
        let h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&');
        const v = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
        return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) > 160 ? '#111827' : '#fff';
    }
    function parseBadge(arg) {
        const parts = arg.split('|').map((x) => x.trim());
        const out = { text: parts[0], color: 'blue', style: 'soft', icon: '', radius: '', size: '' };
        parts.slice(1).forEach((w) => {
            const l = w.toLowerCase();
            if (!l) return;
            let m;
            if (BADGE_COLORS[l] || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(l)) out.color = l;
            else if (BADGE_STYLES.indexOf(l) >= 0) out.style = l;
            else if (BADGE_ICONS[l]) out.icon = l;
            else if (BADGE_SIZES.indexOf(l) >= 0) out.size = l;
            else if (l === 'sharp') out.radius = '0';
            else if (l === 'round') out.radius = '99px';
            else if ((m = /^(?:r|radius)\s*[=:]?\s*(\d+(?:\.\d+)?)(px|em|%)?$/.exec(l) || /^(\d+(?:\.\d+)?)(px|em|%)$/.exec(l))) out.radius = m[1] + (m[2] || 'px');
            else if (l === 'none' || l === 'no-icon') out.icon = '';
            else if ([...w].length <= 2) out.icon = w;
        });
        if (!out.text && !out.icon) out.text = 'Badge';
        return out;
    }
    function badgeEl(arg, src) {
        const b = parseBadge(arg);
        const c = BADGE_COLORS[b.color] || [b.color, badgeInk(b.color)];
        const icon = BADGE_ICONS[b.icon] ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + BADGE_ICONS[b.icon] + '</svg>' : b.icon ? '<i class="kdx-badge-ch">' + esc(b.icon) + '</i>' : '';
        const el = inlineEl('span', 'kdx-badge kdx-badge-' + b.style + (b.text ? '' : ' kdx-badge-iconly') + (b.size && b.size !== 'md' ? ' kdx-badge-' + b.size : ''), src || '{badge ' + arg + '}', icon + (b.text ? '<span>' + esc(b.text) + '</span>' : ''));
        el.style.setProperty('--b', c[0]); el.style.setProperty('--bi', c[1]);
        if (b.radius) el.style.borderRadius = b.radius;
        return el;
    }
    function makeDocInline(rootEl) {
        const fnDefs = new Map(), abbrs = [];
        rootEl.querySelectorAll('.kdx-fndef').forEach((d) => {
            const s = d.getAttribute('data-kd-src');
            let m;
            if ((m = FN_DEF.exec(s))) fnDefs.set(m[1], m[2]);
            else if ((m = ABBR_DEF.exec(s))) abbrs.push([m[1], m[2]]);
        });
        let n = 0;
        const RE = /\[\^([^\]\s]+)\]|\{(fn|key|cite|todo|badge)\s+([^{}\n]+)\}/g;
        proseNodes(rootEl).forEach((t) => {
            n += replaceMatches(t, RE, (m) => {
                if (m[1]) return fnDefs.has(m[1]) ? inlineEl('sup', 'kdx-fnref', m[0], '<a href="#" data-fn="' + esc(m[1]) + '"></a>') : null;
                if (m[2] === 'fn') return inlineEl('sup', 'kdx-fnref kdx-fninline', m[0], '<a href="#" data-note="' + esc(m[3].trim()) + '"></a>');
                if (m[2] === 'key') return inlineEl('span', 'kdx-keys', m[0], m[3].trim().split(/\s*\+\s*/).map((k) => '<kbd>' + esc(k) + '</kbd>').join('<i>+</i>'));
                if (m[2] === 'cite') return inlineEl('span', 'kdx-cite', m[0], '(' + esc(m[3].trim()) + ')');
                if (m[2] === 'badge') return badgeEl(m[3], m[0]);
                return inlineEl('span', 'kdx-todo', m[0], '<b>TODO</b> ' + esc(m[3].trim()));
            });
        });
        abbrs.forEach(([ab, full]) => {
            const re = new RegExp('\\b' + ab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
            proseNodes(rootEl).forEach((t) => { n += replaceMatches(t, re, (m) => { const a = inlineEl('abbr', 'kdx-abbr', m[0], esc(m[0])); a.title = full; a.removeAttribute('contenteditable'); return a; }); });
        });
        return n;
    }
    function numberThings(rootEl) {
        const counts = {}, listed = { fig: [], tab: [] };
        rootEl.querySelectorAll('.kdx-doc[data-kdx-count]').forEach((el) => {
            const k = el.getAttribute('data-kdx-count');
            counts[k] = (counts[k] || 0) + 1;
            const label = el.getAttribute('data-kdx-word') + ' ' + counts[k] + (k === 'thm' || k === 'rem' || k === 'ex' || k === 'exe' ? '.' : ':');
            const slot = el.querySelector('.kdx-num');
            if (slot) slot.textContent = label;
            if (listed[k]) { const cap = el.querySelector('.kdx-fig-cap'); listed[k].push({ label: label.replace(/:$/, ''), text: cap ? cap.textContent.replace(/^[^:]*:?\s*/, '') : '', el }); }
        });
        return listed;
    }
    function fillFootnotes(rootEl) {
        const notes = [], seen = new Map();
        const defs = new Map();
        rootEl.querySelectorAll('.kdx-fndef').forEach((d) => { const m = FN_DEF.exec(d.getAttribute('data-kd-src')); if (m) defs.set(m[1], m[2]); });
        rootEl.querySelectorAll('.kdx-fnref a').forEach((a) => {
            let text, key = a.getAttribute('data-fn');
            if (key) { text = defs.get(key); if (!seen.has(key)) { seen.set(key, notes.length + 1); notes.push({ n: notes.length + 1, text, id: key }); } a.textContent = seen.get(key); a.title = text || ''; }
            else { text = a.getAttribute('data-note'); notes.push({ n: notes.length + 1, text }); a.textContent = notes.length; a.title = text; }
        });
        rootEl.querySelectorAll('.kdx-d-footnotes .kdx-fnlist').forEach((ol) => { ol.innerHTML = notes.map((n) => '<li value="' + n.n + '">' + miniInline(n.text || '') + '</li>').join(''); });
    }
    function fillToc(rootEl, listed) {
        const heads = Array.from(rootEl.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter((h) => !h.closest('.kdx-block') && h.textContent.trim());
        heads.forEach((h, i) => { if (!h.id) h.id = 'kdx-h' + i + '-' + slugOf(h.textContent).slice(0, 24); });
        rootEl.querySelectorAll('.kdx-d-toc').forEach((box) => {
            const depth = +box.getAttribute('data-toc-depth') || 3, numbered = box.hasAttribute('data-toc-num');
            const nav = box.querySelector('.kdx-toc-list');
            const c = [0, 0, 0, 0, 0, 0];
            nav.innerHTML = heads.filter((h) => +h.tagName[1] <= depth).map((h) => {
                const lvl = +h.tagName[1];
                c[lvl - 1]++; for (let j = lvl; j < 6; j++) c[j] = 0;
                const num = numbered ? c.slice(0, lvl).filter((x) => x).join('.') + ' ' : '';
                return '<a href="#' + esc(h.id) + '" data-t="' + esc(h.id) + '" class="kdx-toc-l' + lvl + '">' + (num ? '<i>' + num + '</i>' : '') + esc(h.textContent.trim()) + '</a>';
            }).join('') || '<span class="kdx-note">Add headings (# Title) and they show up here!</span>';
        });
        rootEl.querySelectorAll('[data-listof]').forEach((box) => {
            const items = (listed && listed[box.getAttribute('data-listof')]) || [];
            box.querySelector('.kdx-lof').innerHTML = items.map((i) => '<a href="#" class="kdx-lof-i" data-fig="' + esc(String(items.indexOf(i))) + '"><b>' + esc(i.label) + '</b> ' + esc(i.text) + '</a>').join('') || '<span class="kdx-note">Nothing to list yet: add ::figure or ::tablecap blocks!</span>';
            box._items = items;
        });
        if (!rootEl._kdxNav) {
            rootEl._kdxNav = true;
            rootEl.addEventListener('click', (e) => {
                const a = e.target.closest && e.target.closest('.kdx-toc-list a, .kdx-lof-i');
                if (!a) return;
                e.preventDefault();
                let target = null;
                if (a.hasAttribute('data-t')) target = doc.getElementById(a.getAttribute('data-t'));
                else { const box = a.closest('[data-listof]'); const it = box && box._items && box._items[+a.getAttribute('data-fig')]; target = it && it.el; }
                if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }
    function fillWordcount(rootEl) {
        const boxes = rootEl.querySelectorAll('.kdx-wc');
        if (!boxes.length) return;
        const clone = rootEl.cloneNode(true);
        clone.querySelectorAll('.kdx-wc, .kdx-fndef, .kdx-def, .kdx-set, script, style').forEach((x) => x.remove());
        const text = clone.textContent.replace(/\u200b/g, ' '), words = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'\u2019-]*/gu) || []).length;
        const mins = Math.max(1, Math.round(words / 230));
        boxes.forEach((b) => { const label = b.getAttribute('data-label'); b.textContent = (label ? label + ' ' : '') + words.toLocaleString() + ' words \u00b7 ' + mins + ' min read \u00b7 ' + text.replace(/\s/g, '').length.toLocaleString() + ' characters'; });
    }
    function watermark(rootEl) {
        const wm = rootEl.querySelector('.kdx-d-watermark');
        if (wm) { rootEl.style.setProperty('--kdx-wm', JSON.stringify(wm.getAttribute('data-wm'))); rootEl.classList.add('kdx-wm'); }
        else if (rootEl.classList.contains('kdx-wm')) { rootEl.classList.remove('kdx-wm'); rootEl.style.removeProperty('--kdx-wm'); }
    }
    function docPasses(rootEl) {
        makeDocLines(rootEl);
        makeDocInline(rootEl);
        const listed = numberThings(rootEl);
        fillFootnotes(rootEl);
        fillToc(rootEl, listed);
        fillWordcount(rootEl);
        watermark(rootEl);
    }
    // the sheet for everything above (print-friendly: nothing needs a screen)
    function injectDocsCss() {
        if (doc.getElementById('kdx-docs-css')) return;
        const st = doc.createElement('style');
        st.id = 'kdx-docs-css';
        st.textContent = [
            '.kdx-block.kdx-doc{max-width:none;background:none;border:0;box-shadow:none;border-radius:0;padding:0;margin:14px 0;color:inherit;font:inherit;line-height:1.55;break-inside:avoid-page;user-select:text}',
            '.kdx-doc p{margin:.4em 0}.kdx-doc ul,.kdx-doc ol{margin:.4em 0;padding-left:1.4em}.kdx-doc img{max-width:100%;height:auto;border-radius:4px}',
            '.kdx-doc .kdx-code{margin:.5em 0;padding:10px 12px;border-radius:8px;background:#f1f5f9;border:1px solid #e2e8f0;font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;overflow:auto;white-space:pre}',
            '.kdx-doc code{font:.92em ui-monospace,Menlo,Consolas,monospace;background:#f1f5f9;border-radius:4px;padding:0 .3em}.kdx-doc mark{background:#fde68a;color:inherit;padding:0 .15em;border-radius:3px}',
            '.kdx-tbl{border-collapse:collapse;width:100%;margin:.5em 0;font-size:.95em}.kdx-tbl th,.kdx-tbl td{border:1px solid #cbd5e1;padding:5px 9px;text-align:left;vertical-align:top}.kdx-tbl th{background:#f1f5f9;font-weight:700}',
            '.kdx-doc blockquote{margin:.5em 0;padding:.1em 0 .1em 1em;border-left:3px solid #94a3b8;color:#475569}',
            // contents, lists of figures
            '.kdx-d-toc{padding:10px 0}.kdx-d-toc .kdx-title,.kdx-d-footnotes .kdx-title,.kdx-doc[data-listof] .kdx-title,.kdx-d-bibliography .kdx-title{font:800 1.15em/1.3 inherit;color:inherit;border-bottom:2px solid #94a3b8;padding-bottom:4px;margin-bottom:8px}',
            '.kdx-toc-list a,.kdx-lof a{display:block;color:inherit;text-decoration:none;padding:2px 0;cursor:pointer}.kdx-toc-list a:hover,.kdx-lof a:hover{color:#0284c7;text-decoration:underline}',
            '.kdx-toc-l2{padding-left:1.2em!important}.kdx-toc-l3{padding-left:2.4em!important;font-size:.95em}.kdx-toc-l4,.kdx-toc-l5,.kdx-toc-l6{padding-left:3.6em!important;font-size:.9em}.kdx-toc-list i{font-style:normal;color:#64748b;margin-right:.4em;font-variant-numeric:tabular-nums}',
            '.kdx-lof b{margin-right:.5em;color:#475569}',
            // small things
            '.kdx-wc{font:600 .88em/1.4 system-ui,sans-serif;color:#64748b;letter-spacing:.01em}.kdx-date{font-weight:600}',
            '.kdx-spacehint{display:none}.kdx-editing .kdx-spacehint{display:inline-block;font:600 11px system-ui;color:#94a3b8;border:1px dashed #cbd5e1;border-radius:6px;padding:0 8px}.kdx-d-space{min-height:1em}',
            '.kdx-stampbox{display:inline-block;transform:rotate(-8deg);border:.18em solid var(--kc);color:var(--kc);border-radius:.3em;padding:.1em .6em;font:900 1.7em/1.1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.85;mix-blend-mode:multiply;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            '.kdx-wm{position:relative}.kdx-wm::before{content:var(--kdx-wm);position:absolute;left:0;right:0;top:35%;text-align:center;font:900 min(14vw,140px)/1 system-ui,sans-serif;color:rgba(100,116,139,.12);transform:rotate(-28deg);pointer-events:none;z-index:0;letter-spacing:.08em;white-space:nowrap;overflow:hidden}',
            '.kdx-sign{display:flex;flex-direction:column;gap:2px;min-width:220px;max-width:300px;margin-top:2.2em}.kdx-sign i{display:block;border-top:1.5px solid currentColor;height:0}.kdx-sign b{font-size:.95em}.kdx-sign span{font-size:.82em;color:#64748b}.kdx-signs{display:flex;flex-wrap:wrap;gap:0 40px}',
            '.kdx-d-banner{padding:26px 28px;border-radius:12px;color:#fff;background:linear-gradient(135deg,var(--kc),color-mix(in srgb,var(--kc) 55%,#000));-webkit-print-color-adjust:exact;print-color-adjust:exact}.kdx-banner-t{font:800 1.9em/1.15 system-ui,sans-serif}.kdx-banner-s{margin-top:6px;opacity:.9;font-size:1.05em}',
            '.kdx-d-cover{min-height:70vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px 20px;break-after:page;page-break-after:always}.kdx-cover-t{font:800 2.8em/1.15 system-ui,sans-serif}.kdx-cover-s{font-size:1.35em;color:#475569;margin-top:10px}.kdx-cover-rule{width:90px;height:4px;background:#0284c7;border-radius:4px;margin:26px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.kdx-cover-a{font-size:1.2em;font-weight:600}.kdx-cover-d{color:#64748b;margin-top:6px}',
            '.kdx-kw-h{margin-right:.4em}.kdx-kw{display:inline-block;margin:2px 4px 2px 0;padding:1px 10px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:.88em;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            // columns, callouts, tabs, accordions, cards, quotes
            '.kdx-cols-grid{display:grid;grid-template-columns:repeat(var(--kn,2),minmax(0,1fr));gap:0 28px}.kdx-cols-flow{column-count:var(--kn,2);column-gap:28px}@media (max-width:640px){.kdx-cols-grid{grid-template-columns:1fr}.kdx-cols-flow{column-count:1}}',
            '.kdx-col>:first-child{margin-top:0}',
            '.kdx-block.kdx-doc[class*="kdx-call-"]{padding:10px 14px 10px 16px;border-left:5px solid var(--kc);border-radius:0 10px 10px 0;background:color-mix(in srgb,var(--kc) 9%,#fff);-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            '.kdx-call-h{display:flex;align-items:center;gap:8px;font-weight:800;color:color-mix(in srgb,var(--kc) 80%,#000)}.kdx-call-i{flex:none;width:1.45em;height:1.45em;border-radius:50%;background:var(--kc);color:#fff;display:inline-flex;align-items:center;justify-content:center;font:800 .85em system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.kdx-call-b>:first-child{margin-top:.3em}.kdx-call-b>:last-child{margin-bottom:0}',
            '.kdx-tabbar{display:flex;gap:2px;border-bottom:2px solid #cbd5e1;flex-wrap:wrap}.kdx-tabbtn{font:700 .92em system-ui,sans-serif;padding:7px 16px;border:0;border-bottom:3px solid transparent;margin-bottom:-2px;background:none;color:#475569;cursor:pointer;border-radius:8px 8px 0 0}.kdx-tabbtn:hover{background:#f1f5f9}.kdx-tabbtn.kdx-on{color:#0369a1;border-bottom-color:#0284c7;background:#f0f9ff}',
            '.kdx-tabpanel{display:none;padding:10px 4px}.kdx-tabpanel.kdx-on{display:block}.kdx-tabprint{display:none}@media print{.kdx-tabbar{display:none}.kdx-tabpanel{display:block!important}.kdx-tabprint{display:block;font-weight:800;border-bottom:1px solid #94a3b8;margin-top:.6em}}',
            '.kdx-acc{border:1px solid #cbd5e1;border-radius:10px;margin:6px 0;background:#fff}.kdx-acc summary{cursor:pointer;font-weight:700;padding:9px 14px;list-style:none;display:flex;justify-content:space-between;gap:10px}.kdx-acc summary::-webkit-details-marker{display:none}.kdx-acc summary::after{content:"+";font-weight:800;color:#0284c7}.kdx-acc[open] summary::after{content:"\\2212"}.kdx-acc>div{padding:0 14px 10px}@media print{.kdx-acc>div{display:block}}',
            '.kdx-cardgrid{display:grid;grid-template-columns:repeat(var(--kn,3),minmax(0,1fr));gap:12px}@media (max-width:700px){.kdx-cardgrid{grid-template-columns:1fr 1fr}}.kdx-card{padding:12px 14px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;display:flex;flex-direction:column;gap:4px;box-shadow:0 1px 3px rgba(15,23,42,.08)}.kdx-card b{color:#0c4a6e}.kdx-card span{color:#475569;font-size:.94em}',
            '.kdx-bq blockquote{border-left:4px solid #0284c7;padding:.2em 1em;font-size:1.08em;font-style:italic;color:#334155;background:#f8fafc}.kdx-bq cite,.kdx-pull cite{display:block;margin-top:4px;font-style:normal;font-size:.9em;color:#64748b}',
            '.kdx-pull{text-align:center;padding:14px 8%!important;border-top:3px solid #0284c7;border-bottom:3px solid #0284c7}.kdx-pull blockquote{border:0;font:italic 600 1.55em/1.35 Georgia,serif;color:#0c4a6e;padding:0}',
            '.kdx-block.kdx-doc.kdx-d-aside{float:right;width:38%;min-width:180px;margin:4px 0 12px 18px;padding:10px 14px;border-radius:10px;background:#f8fafc;border-left:3px solid #94a3b8;font-size:.92em;color:#475569}@media (max-width:640px){.kdx-d-aside{float:none;width:auto;margin:10px 0}}',
            // figures, theorems, abstract, glossary, bibliography
            '.kdx-fig-body{text-align:center}.kdx-fig-body img{max-width:100%}.kdx-fig-cap{text-align:center;font-size:.9em;color:#475569;margin-top:6px}.kdx-fig-cap b{color:#0f172a}.kdx-d-figure,.kdx-d-tablecap,.kdx-d-listing{break-inside:avoid}',
            '.kdx-th-h{font-weight:800}.kdx-th-t{font-weight:600}.kdx-th-b{margin-top:.1em}.kdx-block.kdx-doc[class*="kdx-th-"]{padding:6px 0 6px 14px;border-left:3px solid #cbd5e1}.kdx-th-theorem,.kdx-th-lemma,.kdx-th-corollary,.kdx-th-proposition{border-left-color:#0284c7!important}.kdx-th-theorem .kdx-th-b,.kdx-th-lemma .kdx-th-b,.kdx-th-corollary .kdx-th-b,.kdx-th-proposition .kdx-th-b{font-style:italic}.kdx-th-definition{border-left-color:#16a34a!important}.kdx-th-proof .kdx-th-h{font-style:italic;font-weight:700}.kdx-qed{float:right;font-size:.9em}',
            '.kdx-d-abstract{margin:14px 6%!important;font-size:.95em}.kdx-abs-h{text-align:center;font-weight:800;text-transform:uppercase;letter-spacing:.1em;font-size:.82em;margin-bottom:4px}.kdx-d-abstract p{text-align:justify}',
            '.kdx-gloss dt{font-weight:800;margin-top:.5em}.kdx-gloss dd{margin:0 0 0 1.4em;color:#475569}',
            '.kdx-bib{list-style:none;padding:0!important;counter-reset:bib}.kdx-bib li{counter-increment:bib;padding-left:2.4em;text-indent:-2.4em;margin:.35em 0}.kdx-bib li::before{content:"[" counter(bib) "]";display:inline-block;width:2.4em;text-indent:0;color:#64748b;font-variant-numeric:tabular-nums}',
            '.kdx-fnlist{padding-left:1.8em;font-size:.92em;color:#334155}.kdx-fnlist li{margin:.25em 0}',
            // checklist, agenda, pros and cons, contact, address
            '.kdx-block.kdx-doc.kdx-d-checklist{border:1px solid #cbd5e1;border-radius:12px;padding:10px 14px;background:#fff}.kdx-cl-h{display:flex;justify-content:space-between;gap:10px;font-weight:800}.kdx-cl-n{font:600 .85em system-ui;color:#64748b}.kdx-cl-bar{height:6px;border-radius:999px;background:#e2e8f0;margin:6px 0 8px;overflow:hidden}.kdx-cl-bar i{display:block;height:100%;background:#16a34a;transition:width .2s}.kdx-cl-i{display:flex;gap:9px;align-items:flex-start;padding:3px 0;cursor:pointer}.kdx-cl-i input{margin-top:.3em;accent-color:#16a34a;width:16px;height:16px}.kdx-cl-i.kdx-done span{color:#64748b;text-decoration:line-through}',
            '.kdx-agenda .kdx-ag-t{white-space:nowrap;font-weight:700;width:1%;font-variant-numeric:tabular-nums}.kdx-agenda .kdx-ag-l{white-space:nowrap;color:#64748b;width:1%;text-align:right}',
            '.kdx-pc{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:560px){.kdx-pc{grid-template-columns:1fr}}.kdx-pro,.kdx-con{padding:10px 14px;border-radius:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.kdx-pro{background:#f0fdf4;border:1px solid #86efac}.kdx-con{background:#fef2f2;border:1px solid #fca5a5}.kdx-pro b{color:#15803d}.kdx-con b{color:#b91c1c}.kdx-pro ul,.kdx-con ul{margin:.3em 0 0;padding-left:1.2em}',
            '.kdx-ct{display:flex;gap:14px;align-items:center;padding:10px 14px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;max-width:420px}.kdx-ct-av{flex:none;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 18px system-ui;color:#fff;background:linear-gradient(135deg,#38bdf8,#0284c7);-webkit-print-color-adjust:exact;print-color-adjust:exact}.kdx-ct b{display:block;font-size:1.05em}.kdx-ct a,.kdx-ct span{display:block;font-size:.92em;color:#475569}.kdx-ct a{color:#0369a1}',
            '.kdx-doc address{font-style:normal;line-height:1.5;padding:4px 0 4px 12px;border-left:3px solid #cbd5e1}',
            // inline marks
            '.kdx-fnref a{color:#0369a1;text-decoration:none;font-weight:700;padding:0 1px;cursor:pointer}.kdx-fnref a:hover{text-decoration:underline}',
            '.kdx-keys kbd{display:inline-block;min-width:1.5em;padding:0 .45em;margin:0 .1em;text-align:center;font:600 .86em/1.5 ui-monospace,Menlo,Consolas,monospace;color:#1e293b;background:linear-gradient(#fff,#e2e8f0);border:1px solid #94a3b8;border-bottom-width:2.5px;border-radius:.35em;box-shadow:0 1px 0 rgba(15,23,42,.15);-webkit-print-color-adjust:exact;print-color-adjust:exact}.kdx-keys i{font-style:normal;color:#94a3b8;font-size:.8em}',
            '.kdx-badge{--b:#2563eb;--bi:#fff;display:inline-flex;align-items:center;gap:.32em;padding:.05em .62em;border-radius:.5em;font-weight:600;font-size:.82em;font-family:inherit;white-space:nowrap;vertical-align:middle;line-height:1.55;color:color-mix(in srgb,var(--b) 72%,#000);background:color-mix(in srgb,var(--b) 14%,#fff);border:1px solid color-mix(in srgb,var(--b) 38%,#fff);-webkit-print-color-adjust:exact;print-color-adjust:exact}',
            '.kdx-badge svg{width:1.05em;height:1.05em;flex:none;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.kdx-badge-ch{font-style:normal;line-height:1}',
            '.kdx-badge-solid{background:var(--b);color:var(--bi);border-color:var(--b)}',
            '.kdx-badge-outline{background:transparent;border:1.5px solid var(--b);color:color-mix(in srgb,var(--b) 80%,#000)}',
            '.kdx-badge-dashed{background:transparent;border:1.5px dashed var(--b);color:color-mix(in srgb,var(--b) 80%,#000)}',
            '.kdx-badge-pill{border-radius:99px;padding:.05em .75em}',
            '.kdx-badge-square{border-radius:.15em}',
            '.kdx-badge-tag{border-radius:.2em;border-left:.3em solid var(--b)}',
            '.kdx-badge-glow{background:var(--b);color:var(--bi);border-color:var(--b);border-radius:99px;box-shadow:0 0 .55em color-mix(in srgb,var(--b) 70%,transparent),0 0 1.1em color-mix(in srgb,var(--b) 40%,transparent)}',
            '.kdx-badge-gradient{background:linear-gradient(135deg,color-mix(in srgb,var(--b) 62%,#fff),var(--b));color:var(--bi);border-color:var(--b);border-radius:99px}',
            '.kdx-badge-glass{background:linear-gradient(180deg,rgba(255,255,255,.55),color-mix(in srgb,var(--b) 22%,transparent));border:1px solid color-mix(in srgb,var(--b) 55%,#fff);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 1px 3px color-mix(in srgb,var(--b) 30%,transparent);border-radius:99px}',
            '.kdx-badge-dot{border-radius:99px;padding-left:.5em}.kdx-badge-dot::before{content:"";width:.5em;height:.5em;border-radius:50%;background:var(--b);flex:none;box-shadow:0 0 0 .14em color-mix(in srgb,var(--b) 25%,transparent)}',
            '.kdx-badge-xs{font-size:.6em}.kdx-badge-sm{font-size:.72em}.kdx-badge-lg{font-size:1em}.kdx-badge-xl{font-size:1.3em}.kdx-badge-xxl{font-size:1.75em}',
            '.kdx-badge-iconly{padding:.2em;aspect-ratio:1;justify-content:center;line-height:1}.kdx-badge-iconly.kdx-badge-dot{padding:.38em}.kdx-badge-iconly svg{width:1em;height:1em}',
            '.kdx-cite{color:#475569}.kdx-todo{background:#fef9c3;border:1px dashed #eab308;border-radius:6px;padding:0 6px;font-size:.92em}.kdx-todo b{color:#a16207;font-size:.78em;letter-spacing:.08em;margin-right:.3em}@media print{.kdx-todo{background:none;border:0}}',
            'abbr.kdx-abbr{text-decoration:underline dotted;text-underline-offset:2px;cursor:help}',
            '.kdx-fndef{display:none}',
            '@media print{.kdx-block.kdx-doc{break-inside:avoid-page}.kdx-cols-grid,.kdx-cols-flow{break-inside:auto}.kdx-spacehint{display:none!important}}'
        ].join('\n');
        (doc.head || doc.documentElement).appendChild(st);
    }

    const MULTI = new RegExp('^::(chart|poll|quiz|scene|steps|stats|fold|timeline|' + Object.keys(DOC_MULTI).join('|') + ')\\b', 'i'), SINGLE = new RegExp('^::(timer|map|progress|countdown|rating|' + DOC_SINGLE.join('|') + ')\\b', 'i');
    function makeBlocks(rootEl, editing) {
        let n = 0;
        // blocks made before (a saved page, or a second pass): drawn again from their text, so they work
        rootEl.querySelectorAll('.kdx-block[data-kd-src]').forEach((old) => {
            if (old._kdx) return;
            const fresh = buildBlock(old.getAttribute('data-kd-src'), editing);
            fresh._kdx = true;
            old.replaceWith(fresh);
        });
        const ls = lines(rootEl);
        for (let i = 0; i < ls.length; i++) {
            const t = ls[i].text.trim();
            if (!ls[i].widget && t.startsWith(PKOPEN) && pkReady()) {
                // the braces may close on this line or on a later one; a closing brace that has more text after it makes it an inline piece instead
                let acc = '', end = -1, j = i;
                for (; j < ls.length && j - i < 150; j++) {
                    acc += (j > i ? '\n' : '') + (j === i ? ls[j].text.trim() : ls[j].text);
                    end = pkClose(acc, 0);
                    if (end >= 0) break;
                }
                if (end >= 0 && !acc.slice(end + 1).trim()) {
                    const el = buildPkBlock(acc.slice(0, end + 1)); el._kdx = true;
                    insertBefore(ls[i], el);
                    for (let k = i; k <= j; k++) removeLine(ls[k]);
                    n++; i = j;
                }
                continue;
            }
            if (ls[i].widget || !t.startsWith('::')) continue;
            if (SINGLE.test(t)) {
                const el = buildBlock(t, editing); el._kdx = true;
                insertBefore(ls[i], el); removeLine(ls[i]); n++;
                continue;
            }
            if (!MULTI.test(t)) continue;
            let j = i + 1;
            while (j < ls.length && ls[j].text.trim() !== '::end' && j - i < 400) j++;
            if (j >= ls.length) continue; // not closed yet (still being typed)
            const src = [t].concat(ls.slice(i + 1, j).map((L) => (L.table ? Array.from(L.table.querySelectorAll('tr')).map((tr) => '| ' + Array.from(tr.children).map((c) => c.textContent.trim()).join(' | ') + ' |').join('\n') : typed(L)))).concat(['::end']).join('\n');
            const el = buildBlock(src, editing); el._kdx = true;
            insertBefore(ls[i], el);
            for (let k = i; k <= j; k++) removeLine(ls[k]);
            n++;
            i = j;
        }
        return n;
    }

    /* ==================================================================
       apply / restore
       ================================================================== */
    function apply(rootEl, opts) {
        if (!rootEl || !rootEl.nodeType) return { tags: 0, values: 0, blocks: 0 };
        opts = opts || {};
        injectCss();
        const editing = opts.editing !== undefined ? !!opts.editing : isEditing(rootEl);
        rootEl.classList.toggle('kdx-editing', editing);
        if (!editing) splitNewlines(rootEl);
        const blocks = makeBlocks(rootEl, editing) + makePkInline(rootEl);
        BUILTINS.forEach(useDef);
        makeBars(rootEl);
        injectDocsCss();
        try { docPasses(rootEl); } catch (e) { console.warn('[KeydownNext docs]', e); }
        const defs = BUILTINS.concat(tipDefs(rootEl), chipDefs(rootEl), collectDefs(rootEl, editing));
        const tags = applyTags(rootEl, defs);
        const values = makeLive(rootEl, editing);
        wireInputs(rootEl, editing);
        if (rootEl.querySelector('.kdx-val, .kdx-set')) { recalc(rootEl); hideSetLines(rootEl); }
        return { tags, values, blocks };
    }
    // everything back to its Keydown text (for Un-format, saving and Source view); returns how many were turned back
    function restoreTags(rootEl) {
        let n = 0;
        rootEl.querySelectorAll('.kdx-tag[data-kd-open]').forEach((el) => {
            // (a mark made at the caret and never typed into holds only a zero-width character: it writes nothing)
            Array.from(el.childNodes).forEach((c) => { if (c.nodeType === 3 && c.nodeValue.includes('\u200b')) c.nodeValue = c.nodeValue.replace(/\u200b/g, ''); });
            if (!el.textContent) { el.remove(); return; }
            el.insertBefore(doc.createTextNode(el.getAttribute('data-kd-open')), el.firstChild);
            el.appendChild(doc.createTextNode(el.getAttribute('data-kd-close')));
            el.replaceWith(...Array.from(el.childNodes));
            n++;
        });
        return n;
    }
    function restore(rootEl) {
        if (!rootEl || !rootEl.querySelectorAll) return 0;
        rootEl.querySelectorAll('.kdx-line-hidden').forEach((l) => l.classList.remove('kdx-line-hidden'));
        let n = restoreTags(rootEl);
        rootEl.querySelectorAll('[data-kd-src].kdx').forEach((el) => {
            const src = el.getAttribute('data-kd-src');
            if (el.tagName === 'DIV' && src.includes('\n')) {
                // one line each, the way the page around it keeps its lines
                const frag = doc.createDocumentFragment();
                src.split('\n').forEach((t) => { const d = doc.createElement('div'); d.textContent = t; frag.appendChild(d); });
                el.replaceWith(frag);
            } else if (el.tagName === 'DIV') { const d = doc.createElement('div'); d.textContent = src; el.replaceWith(d); }
            else el.replaceWith(doc.createTextNode(src));
            n++;
        });
        if (rootEl.normalize) rootEl.normalize();
        return n;
    }

    root.KeydownNext = { apply, restore, recalc, builtins: BUILTINS, useDef, chipSpan, retagChip, parseChip, CHIP_LOOKS, tipSpan, parseTip, tipOpen, TIP_STYLES, BADGE_COLORS, BADGE_STYLES, BADGE_SIZES, BADGE_ICONS, parseBadge, setBar, parseBar, barText, BAR_COLORS, BAR_STYLES, BAR_LOOKS, setMark, parseMark, markText, MARK_KINDS, MARK_LOOKS, MARK_SIZES, MARK_POS, evaluate: (s, vars) => evaluate(parseExpr(s), vars || {}), parseDef, docs: DOC_BUILD, renderBody, version: '1.1.0', FUNCS: Object.keys(FUNCS) };

    // Writeout, Bitbook and Amber: the new things are made after Enter, after Re-format and when a page opens,
    // and Un-format / saving as text give their Keydown back
    function hookDocEngine() {
        const kd = root.kdDoc;
        if (!kd || kd.__kdxHooked) return;
        kd.__kdxHooked = true;
        const origFormat = kd.formatLine, origRe = kd.reformat, origUn = kd.unformat, origToText = kd.htmlToText, origSourceOf = kd.sourceOf;
        // Source view and saving read an element through sourceOf: custom tags (and the built-in {sc} {dots} {dim}) must give their marks back there too
        if (origSourceOf) kd.sourceOf = function (el) {
            if (el && el.querySelector && el.querySelector('[data-kd-open]')) { const copy = el.cloneNode(true); restoreTags(copy); return origSourceOf.call(this, copy); }
            return origSourceOf.apply(this, arguments);
        };
        if (origFormat) kd.formatLine = function (canvas) { const r = origFormat.apply(this, arguments); setTimeout(() => { try { apply(canvas, { editing: true }); } catch (e) { console.warn('[KeydownNext]', e); } }, 0); return r; };
        if (origRe) kd.reformat = function (box) { const r = origRe.apply(this, arguments); try { const a = apply(box, { editing: isEditing(box) || box.id === 'wysiwyg-canvas' }); if (r && typeof r === 'object') r.formatted = (r.formatted || 0) + a.tags + a.values + a.blocks; } catch (e) { console.warn('[KeydownNext]', e); } return r; };
        if (origUn) kd.unformat = function (box) { const n = restore(box); const r = origUn.apply(this, arguments); return (typeof r === 'number' ? r : 0) + n; };
        // (keydown-doc saves every .kdx[data-kd-src] as its own text; only custom-tag spans need their tags put back first)
        if (origToText) kd.htmlToText = function (html) {
            if (typeof html === 'string' && html.includes('data-kd-open')) { const box = doc.createElement('div'); box.innerHTML = html; restoreTags(box); html = box.innerHTML; }
            return origToText.call(this, html);
        };
    }
    hookDocEngine();
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', hookDocEngine); else setTimeout(hookDocEngine, 0);
    // a Writeout or Bitbook page: its saved blocks and values come back to life when it opens
    function wakeEditors() {
        const c = doc.getElementById('wysiwyg-canvas');
        if (c && c.querySelector('.kdx, [data-kd-tpl]')) apply(c, { editing: true });
    }
    if (doc.readyState === 'complete') setTimeout(wakeEditors, 600); else root.addEventListener('load', () => setTimeout(wakeEditors, 600));
})(typeof window !== 'undefined' ? window : this);
