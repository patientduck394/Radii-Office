/* Bitbook Custom CSS chip presets: 110 chip styles in 11 categories (Highlights: 10 favorites from 25 styles x 4 colors)!
   Each preset's css is plain declarations, so it can live in the chip's own style=""
   and travel with the note! Animated ones use the bbcss-* keyframes in style.css! */
var CSS_CHIP_CATEGORIES = [
    ['gel', 'Gel & Aero'],
    ['neon', 'Neon'],
    ['pastel', 'Pastel'],
    ['retro', 'Retro'],
    ['metal', 'Metal & Gems'],
    ['paper', 'Paper & Craft'],
    ['minimal', 'Minimal'],
    ['nature', 'Nature'],
    ['text', 'Text Effects'],
    ['highlight', 'Highlights'],
    ['anim', 'Animated']
];

var CSS_CHIP_PRESETS = (function () {
    var list = [];
    function p(cat, id, name, tags, css) {
        list.push({ id: id, name: name, cat: cat, tags: tags, css: css });
    }
    // Glossy gel pill: light top half, rich bottom half, white shine on top!
    function gel(light, mid, deep, edge, glow) {
        return 'background: linear-gradient(180deg, ' + light + ' 0%, ' + mid + ' 50%, ' + deep + ' 51%, ' + deep + ' 100%); color: #ffffff; ' +
            'border: 1px solid ' + edge + '; border-radius: 999px; font-weight: 800; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35); ' +
            'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -3px 5px rgba(255, 255, 255, 0.25), 0 2px 6px ' + glow + ';';
    }
    function neon(c, ink) {
        return 'background: #0b0b14; color: ' + (ink || '#ffffff') + '; border: 1px solid ' + c + '; border-radius: 6px; font-weight: 800; ' +
            'text-shadow: 0 0 4px ' + c + ', 0 0 10px ' + c + '; box-shadow: 0 0 6px ' + c + ', inset 0 0 6px ' + c + ';';
    }
    function pastel(bg, ink, edge) {
        return 'background: ' + bg + '; color: ' + ink + '; border: 1px solid ' + edge + '; border-radius: 999px; font-weight: 700;';
    }
    function metal(stops, ink, edge, glow) {
        return 'background: linear-gradient(180deg, ' + stops + '); color: ' + ink + '; border: 1px solid ' + edge + '; border-radius: 6px; font-weight: 800; ' +
            'text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 2px 5px ' + glow + ';';
    }
    function gem(light, mid, deep, glow) {
        return 'background: radial-gradient(circle at 30% 25%, ' + light + ' 0%, ' + mid + ' 45%, ' + deep + ' 100%); color: #ffffff; border: 1px solid ' + deep + '; ' +
            'border-radius: 8px; font-weight: 800; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 8px ' + glow + ';';
    }
    function nature(grad, ink, edge, glow) {
        return 'background: ' + grad + '; color: ' + ink + '; border: 1px solid ' + edge + '; border-radius: 10px; font-weight: 800; ' +
            'text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 2px 6px ' + glow + ';';
    }

    // ---------- Gel & Aero ----------
    p('gel', 'aquagel', 'Aqua Gel', 'blue frutiger aero glossy', gel('#bae6fd', '#38bdf8', '#0284c7', '#0369a1', 'rgba(2, 132, 199, 0.4)'));
    p('gel', 'limegel', 'Lime Gel', 'green frutiger aero glossy', gel('#d9f99d', '#84cc16', '#4d7c0f', '#3f6212', 'rgba(77, 124, 15, 0.4)'));
    p('gel', 'orangegel', 'Orange Gel', 'orange frutiger aero glossy', gel('#fed7aa', '#fb923c', '#ea580c', '#c2410c', 'rgba(234, 88, 12, 0.4)'));
    p('gel', 'cherrygel', 'Cherry Gel', 'red frutiger aero glossy', gel('#fecaca', '#f87171', '#dc2626', '#b91c1c', 'rgba(220, 38, 38, 0.4)'));
    p('gel', 'grapegel', 'Grape Gel', 'purple frutiger aero glossy', gel('#e9d5ff', '#c084fc', '#9333ea', '#7e22ce', 'rgba(147, 51, 234, 0.4)'));
    p('gel', 'bubblegumgel', 'Bubblegum Gel', 'pink frutiger aero glossy', gel('#fbcfe8', '#f472b6', '#db2777', '#be185d', 'rgba(219, 39, 119, 0.4)'));
    p('gel', 'glassbubble', 'Glass Bubble', 'clear glass bubble frutiger aero translucent', 'background: radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.35) 55%, rgba(186, 230, 253, 0.45) 100%); color: #075985; border: 1px solid rgba(125, 211, 252, 0.9); border-radius: 999px; font-weight: 800; box-shadow: inset 0 -2px 6px rgba(56, 189, 248, 0.35), inset 0 1px 0 #ffffff, 0 2px 6px rgba(14, 165, 233, 0.25);');
    p('gel', 'aerosky', 'Aero Sky', 'sky grass blue green frutiger aero', 'background: linear-gradient(180deg, #e0f2fe 0%, #7dd3fc 48%, #4ade80 52%, #16a34a 100%); color: #ffffff; border: 1px solid #0e7490; border-radius: 999px; font-weight: 800; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 2px 6px rgba(14, 116, 144, 0.35);');
    p('gel', 'frosted', 'Frosted Glass', 'frosted glass white aero soft', 'background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.8) 100%); color: #334155; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 700; box-shadow: inset 0 1px 0 #ffffff, inset 0 -1px 2px rgba(148, 163, 184, 0.3), 0 2px 8px rgba(15, 23, 42, 0.12);');
    p('gel', 'waterdrop', 'Water Drop', 'water droplet blue aero wet', 'background: radial-gradient(circle at 35% 30%, #ffffff 0%, #bae6fd 25%, #0ea5e9 75%, #0369a1 100%); color: #ffffff; border: 1px solid #0369a1; border-radius: 999px; font-weight: 800; text-shadow: 0 1px 2px rgba(3, 105, 161, 0.7); box-shadow: inset 0 -2px 4px rgba(255, 255, 255, 0.4), 0 3px 8px rgba(3, 105, 161, 0.35);');

    // ---------- Neon ----------
    p('neon', 'neonpink', 'Neon Pink', 'pink glow night', neon('#ff2fa0'));
    p('neon', 'neonblue', 'Neon Blue', 'blue cyan glow night', neon('#00b7ff'));
    p('neon', 'neongreen', 'Neon Green', 'green glow night', neon('#39ff14'));
    p('neon', 'neonorange', 'Neon Orange', 'orange glow night', neon('#ff7a00'));
    p('neon', 'neonpurple', 'Neon Purple', 'purple violet glow night', neon('#b026ff'));
    p('neon', 'neonyellow', 'Neon Yellow', 'yellow glow night', neon('#ffe600', '#fffbe0'));
    p('neon', 'neonsign', 'Neon Sign', 'neon sign tube glow outline', 'background: transparent; color: #fff0f8; border: 2px solid #ff2fa0; border-radius: 999px; font-weight: 800; text-shadow: 0 0 2px #fff, 0 0 8px #ff2fa0, 0 0 16px #ff2fa0; box-shadow: 0 0 8px #ff2fa0, inset 0 0 8px #ff2fa0;');
    p('neon', 'cyberpunk', 'Cyberpunk', 'cyberpunk yellow black future', 'background: #fcee0a; color: #000000; border: none; border-radius: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; box-shadow: 3px 3px 0 #00f0ff, -3px -3px 0 #ff003c;');
    p('neon', 'laserred', 'Laser Red', 'red laser glow danger', neon('#ff1e1e', '#ffe4e4'));
    p('neon', 'ultraviolet', 'Ultraviolet', 'uv blacklight purple glow', 'background: linear-gradient(90deg, #2e0854, #5b21b6); color: #f5d0fe; border: 1px solid #e879f9; border-radius: 6px; font-weight: 800; text-shadow: 0 0 6px #e879f9; box-shadow: 0 0 10px rgba(232, 121, 249, 0.7);');

    // ---------- Pastel ----------
    p('pastel', 'peach', 'Peach', 'peach orange soft', pastel('#ffe4d6', '#9a3412', '#fdba9a'));
    p('pastel', 'mint', 'Mint', 'mint green soft', pastel('#d1fae5', '#065f46', '#a7f3d0'));
    p('pastel', 'lavender', 'Lavender', 'lavender purple soft', pastel('#ede9fe', '#5b21b6', '#ddd6fe'));
    p('pastel', 'babyblue', 'Baby Blue', 'baby blue soft', pastel('#dbeafe', '#1e40af', '#bfdbfe'));
    p('pastel', 'lemon', 'Lemon', 'lemon yellow soft', pastel('#fef9c3', '#854d0e', '#fde68a'));
    p('pastel', 'rose', 'Rose', 'rose pink soft', pastel('#ffe4e6', '#9f1239', '#fecdd3'));
    p('pastel', 'sage', 'Sage', 'sage green muted soft', pastel('#e3ebde', '#3f5a36', '#c8d7bf'));
    p('pastel', 'lilacoutline', 'Lilac Outline', 'lilac outline soft', 'background: #faf5ff; color: #7e22ce; border: 2px dashed #d8b4fe; border-radius: 999px; font-weight: 700;');
    p('pastel', 'cottoncandy', 'Cotton Candy', 'pink blue gradient sweet', 'background: linear-gradient(90deg, #fbcfe8, #bfdbfe); color: #6b21a8; border: 1px solid #f5d0fe; border-radius: 999px; font-weight: 800;');
    p('pastel', 'pastelrainbow', 'Pastel Rainbow', 'rainbow pastel colorful', 'background: linear-gradient(90deg, #fecaca, #fde68a, #bbf7d0, #bfdbfe, #e9d5ff); color: #4c1d95; border: 1px solid #e9d5ff; border-radius: 999px; font-weight: 800;');

    // ---------- Retro ----------
    p('retro', 'win95', 'Windows 95', 'windows 95 button gray classic', "background: #c0c0c0; color: #000000; border: 2px solid; border-color: #ffffff #808080 #808080 #ffffff; border-radius: 0; font-family: 'MS Sans Serif', Tahoma, Geneva, sans-serif; font-weight: 400; box-shadow: 1px 1px 0 #000000;");
    p('retro', 'terminal', 'Terminal', 'hacker terminal green black console', "background: #0a0f0a; color: #33ff66; border: 1px solid #1f7a38; border-radius: 3px; font-family: 'JetBrains Mono', 'Courier New', monospace; text-shadow: 0 0 5px rgba(51, 255, 102, 0.7);");
    p('retro', 'amber', 'Amber CRT', 'amber monitor orange retro screen', "background: #140c02; color: #ffb000; border: 1px solid #7a5200; border-radius: 3px; font-family: 'JetBrains Mono', 'Courier New', monospace; text-shadow: 0 0 5px rgba(255, 176, 0, 0.7);");
    p('retro', 'vaporwave', 'Vaporwave', 'vaporwave aesthetic pink cyan 80s 90s', 'background: linear-gradient(90deg, #ff71ce, #b967ff, #01cdfe); color: #ffffff; border: none; border-radius: 4px; font-weight: 800; font-style: italic; letter-spacing: 0.1em; text-shadow: 2px 2px 0 #5b1a6e;');
    p('retro', 'y2kchrome', 'Y2K Chrome', 'y2k chrome silver metallic 2000s', 'background: linear-gradient(180deg, #ffffff 0%, #c7d2e2 45%, #6b7a90 50%, #dbe3ee 100%); color: #1f2a3a; border: 1px solid #8a9ab3; border-radius: 999px; font-weight: 800; font-style: italic; text-shadow: 0 1px 0 #ffffff;');
    p('retro', 'gameboy', 'Game Boy', 'game boy green pixel handheld', "background: #9bbc0f; color: #0f380f; border: 2px solid #306230; border-radius: 2px; font-family: 'JetBrains Mono', monospace; font-weight: 800; text-transform: uppercase;");
    p('retro', 'pixelbox', 'Pixel Box', 'pixel 8bit hard shadow', "background: #ffffff; color: #111827; border: 2px solid #111827; border-radius: 0; font-family: 'JetBrains Mono', monospace; font-weight: 800; box-shadow: 3px 3px 0 #111827;");
    p('retro', 'arcade', 'Arcade', 'arcade game yellow red 80s', "background: #ef4444; color: #fde047; border: 2px solid #fde047; border-radius: 4px; font-family: Impact, 'Arial Black', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; text-shadow: 2px 2px 0 #7f1d1d;");
    p('retro', 'seventies', 'Groovy 70s', '70s seventies orange brown stripes groovy', 'background: linear-gradient(180deg, #f59e0b 0 33%, #ea580c 33% 66%, #9a3412 66% 100%); color: #fff7ed; border: 1px solid #7c2d12; border-radius: 999px; font-weight: 900; text-shadow: 0 1px 0 #7c2d12;');
    p('retro', 'typewriterkey', 'Typewriter Key', 'typewriter key round vintage', "background: radial-gradient(circle at 50% 35%, #3f3f46, #18181b); color: #f4f4f5; border: 2px solid #a1a1aa; border-radius: 999px; font-family: 'American Typewriter', 'Courier New', monospace; font-weight: 700; box-shadow: 0 2px 0 #52525b;");

    // ---------- Metal & Gems ----------
    p('metal', 'gold', 'Gold', 'gold metallic shiny rich', metal('#fff7c2 0%, #fcd34d 40%, #b8860b 60%, #fde68a 100%', '#5c3d00', '#a16207', 'rgba(161, 98, 7, 0.4)'));
    p('metal', 'silver', 'Silver', 'silver metallic shiny', metal('#ffffff 0%, #e5e7eb 40%, #9ca3af 60%, #f3f4f6 100%', '#1f2937', '#9ca3af', 'rgba(75, 85, 99, 0.35)'));
    p('metal', 'bronze', 'Bronze', 'bronze copper metallic', metal('#fde3c4 0%, #d6955b 40%, #8a4b1f 60%, #e3a86f 100%', '#3b1d07', '#8a4b1f', 'rgba(138, 75, 31, 0.4)'));
    p('metal', 'rosegold', 'Rose Gold', 'rose gold pink metallic', metal('#fff1ee 0%, #f4b5a8 40%, #b76e79 60%, #f8cfc6 100%', '#5a2430', '#b76e79', 'rgba(183, 110, 121, 0.4)'));
    p('metal', 'chrome', 'Chrome', 'chrome mirror metallic', metal('#f8fafc 0%, #94a3b8 48%, #334155 50%, #cbd5e1 100%', '#0f172a', '#475569', 'rgba(15, 23, 42, 0.35)'));
    p('metal', 'ruby', 'Ruby', 'ruby red gem jewel', gem('#fecaca', '#e11d48', '#7f1d1d', 'rgba(225, 29, 72, 0.5)'));
    p('metal', 'emerald', 'Emerald', 'emerald green gem jewel', gem('#bbf7d0', '#10b981', '#064e3b', 'rgba(16, 185, 129, 0.5)'));
    p('metal', 'sapphire', 'Sapphire', 'sapphire blue gem jewel', gem('#bfdbfe', '#2563eb', '#1e3a8a', 'rgba(37, 99, 235, 0.5)'));
    p('metal', 'amethyst', 'Amethyst', 'amethyst purple gem jewel', gem('#f5d0fe', '#a855f7', '#4c1d95', 'rgba(168, 85, 247, 0.5)'));
    p('metal', 'diamond', 'Diamond', 'diamond sparkle white gem', 'background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 25%, #ffffff 45%, #ede9fe 70%, #ffffff 100%); color: #0f172a; border: 1px solid #bae6fd; border-radius: 8px; font-weight: 800; box-shadow: 0 0 8px rgba(186, 230, 253, 0.9), inset 0 0 6px rgba(255, 255, 255, 1);');

    // ---------- Paper & Craft ----------
    p('paper', 'sticker', 'Sticker', 'sticker die cut white border', 'background: #fde047; color: #713f12; border: 3px solid #ffffff; border-radius: 999px; font-weight: 900; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);');
    p('paper', 'washi', 'Washi Tape', 'washi tape stripes craft', 'background: repeating-linear-gradient(45deg, rgba(244, 114, 182, 0.55) 0 6px, rgba(251, 207, 232, 0.55) 6px 12px); color: #831843; border: none; border-radius: 0; font-weight: 700; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);');
    p('paper', 'stamp', 'Rubber Stamp', 'stamp red ink approved', "background: transparent; color: #dc2626; border: 3px double #dc2626; border-radius: 4px; font-family: Impact, 'Arial Black', sans-serif; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.85;");
    p('paper', 'labelmaker', 'Label Maker', 'label maker embossed tape black', "background: #111827; color: #f9fafb; border: none; border-radius: 3px; font-family: 'Arial Black', Helvetica, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; text-shadow: 0 -1px 0 #000000, 0 1px 0 #6b7280;");
    p('paper', 'stickynote', 'Sticky Note', 'sticky note post it yellow', "background: linear-gradient(180deg, #fff9a8, #fde68a); color: #713f12; border: none; border-radius: 2px; font-family: 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive; font-weight: 700; box-shadow: 0 3px 5px -2px rgba(0, 0, 0, 0.35);");
    p('paper', 'krafttag', 'Kraft Tag', 'kraft brown tag cardboard', 'background: #c8a476; color: #3b2a1a; border: 1px dashed #7a5a36; border-radius: 4px; font-weight: 700;');
    p('paper', 'receipt', 'Receipt', 'receipt paper mono store', "background: #fafaf7; color: #3f3f46; border-top: 1px dashed #a1a1aa; border-bottom: 1px dashed #a1a1aa; border-left: none; border-right: none; border-radius: 0; font-family: 'Courier New', monospace; letter-spacing: 0.05em;");
    p('paper', 'notebooktab', 'Notebook Tab', 'tab divider folder index', 'background: #93c5fd; color: #1e3a8a; border: 1px solid #60a5fa; border-bottom: none; border-radius: 8px 8px 0 0; font-weight: 800;');
    p('paper', 'postage', 'Postage Stamp', 'postage stamp mail dashed', "background: #fef2f2; color: #991b1b; border: 2px dashed #f87171; border-radius: 2px; font-family: Georgia, serif; font-weight: 700; box-shadow: 0 0 0 3px #fef2f2;");
    p('paper', 'chalk', 'Chalk', 'chalkboard chalk green school', "background: #2b4234; color: #f1f5f0; border: 2px solid #8b5a2b; border-radius: 4px; font-family: 'Chalkboard SE', 'Chalkduster', 'Comic Sans MS', cursive; text-shadow: 0 0 1px rgba(255, 255, 255, 0.7);");

    // ---------- Minimal ----------
    p('minimal', 'outline', 'Outline', 'outline simple border clean', 'background: transparent; color: #334155; border: 1.5px solid #334155; border-radius: 6px; font-weight: 700;');
    p('minimal', 'dashedoutline', 'Dashed Outline', 'dashed outline simple', 'background: transparent; color: #475569; border: 1.5px dashed #94a3b8; border-radius: 6px; font-weight: 700;');
    p('minimal', 'softtint', 'Soft Tint', 'soft tint blue light subtle', 'background: rgba(59, 130, 246, 0.12); color: #1d4ed8; border: none; border-radius: 6px; font-weight: 700;');
    p('minimal', 'underlinebar', 'Underline Bar', 'underline bar thick line', 'background: transparent; color: #0f172a; border: none; border-bottom: 3px solid #6366f1; border-radius: 0; padding: 0 2px; font-weight: 700;');
    p('minimal', 'leftaccent', 'Left Accent', 'left accent bar callout', 'background: #f8fafc; color: #0f172a; border: none; border-left: 4px solid #10b981; border-radius: 0 6px 6px 0; font-weight: 700;');
    p('minimal', 'ghost', 'Ghost Gray', 'ghost gray quiet muted', 'background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; font-weight: 600;');
    p('minimal', 'monocode', 'Mono Code', 'code monospace inline dev', "background: #f1f5f9; color: #be185d; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0 6px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-weight: 600;");
    p('minimal', 'kbd', 'Keyboard Key', 'keyboard key kbd shortcut', "background: linear-gradient(180deg, #ffffff, #f1f5f9); color: #334155; border: 1px solid #cbd5e1; border-bottom-width: 3px; border-radius: 6px; padding: 0 7px; font-family: 'JetBrains Mono', monospace; font-weight: 700;");
    p('minimal', 'tagpill', 'Tag Pill', 'tag label hashtag pill', 'background: #e0e7ff; color: #3730a3; border: none; border-radius: 999px; font-weight: 800; font-size: 0.85em; letter-spacing: 0.04em; text-transform: uppercase;');
    p('minimal', 'darkpill', 'Dark Pill', 'dark black pill bold', 'background: #0f172a; color: #f8fafc; border: none; border-radius: 999px; font-weight: 800;');

    // ---------- Nature ----------
    p('nature', 'leaf', 'Leaf', 'leaf green plant spring', nature('linear-gradient(135deg, #86efac, #16a34a)', '#ffffff', '#15803d', 'rgba(22, 163, 74, 0.35)') + ' border-radius: 999px 4px 999px 4px;');
    p('nature', 'ocean', 'Ocean', 'ocean waves sea blue', nature('linear-gradient(180deg, #67e8f9, #0e7490)', '#ffffff', '#155e75', 'rgba(14, 116, 144, 0.35)'));
    p('nature', 'sunset', 'Sunset', 'sunset orange pink evening', nature('linear-gradient(90deg, #f97316, #ec4899, #8b5cf6)', '#ffffff', '#be185d', 'rgba(236, 72, 153, 0.35)'));
    p('nature', 'lava', 'Lava', 'lava fire volcano hot', nature('radial-gradient(circle at 50% 120%, #fde047 0%, #f97316 40%, #7f1d1d 100%)', '#fff7ed', '#7f1d1d', 'rgba(249, 115, 22, 0.5)'));
    p('nature', 'ice', 'Ice', 'ice frost cold winter', 'background: linear-gradient(180deg, #f0f9ff, #bae6fd); color: #0c4a6e; border: 1px solid #7dd3fc; border-radius: 6px; font-weight: 800; text-shadow: 0 1px 0 #ffffff; box-shadow: inset 0 1px 0 #ffffff, 0 0 6px rgba(125, 211, 252, 0.6);');
    p('nature', 'sky', 'Sky', 'sky clouds day blue', nature('linear-gradient(180deg, #7dd3fc, #e0f2fe)', '#075985', '#7dd3fc', 'rgba(56, 189, 248, 0.3)') + ' text-shadow: 0 1px 0 #ffffff;');
    p('nature', 'forest', 'Forest', 'forest trees dark green woods', nature('linear-gradient(180deg, #166534, #052e16)', '#dcfce7', '#052e16', 'rgba(5, 46, 22, 0.4)'));
    p('nature', 'desert', 'Desert', 'desert sand dune terracotta', nature('linear-gradient(180deg, #fcd9a8, #d97706)', '#451a03', '#b45309', 'rgba(180, 83, 9, 0.35)') + ' text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);');
    p('nature', 'cherryblossom', 'Cherry Blossom', 'cherry blossom sakura pink spring', 'background: radial-gradient(circle at 20% 30%, #ffffff 0 2px, transparent 3px), radial-gradient(circle at 75% 65%, #ffffff 0 2px, transparent 3px), linear-gradient(180deg, #fce7f3, #f9a8d4); color: #9d174d; border: 1px solid #f9a8d4; border-radius: 999px; font-weight: 800;');
    p('nature', 'nightsky', 'Night Sky', 'night stars space dark', 'background: radial-gradient(circle at 15% 30%, #ffffff 0 1px, transparent 1.5px), radial-gradient(circle at 60% 70%, #ffffff 0 1px, transparent 1.5px), radial-gradient(circle at 85% 25%, #fde68a 0 1px, transparent 1.5px), linear-gradient(180deg, #1e1b4b, #0b1026); color: #e0e7ff; border: 1px solid #312e81; border-radius: 8px; font-weight: 800;');

    // ---------- Text Effects ----------
    p('text', 'rainbowtext', 'Rainbow Text', 'rainbow gradient text colorful', 'background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7); -webkit-background-clip: text; background-clip: text; color: transparent; border: none; border-radius: 0; padding: 0 1px; font-weight: 900;');
    p('text', 'glowtext', 'Glow Text', 'glow text shine light', 'background: transparent; color: #0ea5e9; border: none; padding: 0 1px; font-weight: 800; text-shadow: 0 0 6px rgba(14, 165, 233, 0.8), 0 0 14px rgba(14, 165, 233, 0.5);');
    p('text', 'pop3d', '3D Pop', '3d pop shadow retro bold', 'background: transparent; color: #fde047; border: none; padding: 0 3px; font-weight: 900; text-shadow: 1px 1px 0 #ef4444, 2px 2px 0 #ef4444, 3px 3px 0 #1e3a8a;');
    p('text', 'outlinetext', 'Outline Text', 'outline stroke hollow letters', 'background: transparent; color: transparent; -webkit-text-stroke: 1px #7c3aed; border: none; padding: 0 1px; font-weight: 900;');
    p('text', 'emboss', 'Emboss', 'emboss pressed letterpress', 'background: #e5e7eb; color: #9ca3af; border: none; border-radius: 4px; font-weight: 900; text-shadow: 1px 1px 0 #ffffff, -1px -1px 0 rgba(0, 0, 0, 0.25);');
    p('text', 'longshadow', 'Long Shadow', 'long shadow flat design', 'background: #0ea5e9; color: #ffffff; border: none; border-radius: 6px; font-weight: 900; text-shadow: 1px 1px 0 #0369a1, 2px 2px 0 #0369a1, 3px 3px 0 #0369a1, 4px 4px 0 #0369a1;');
    p('text', 'marker', 'Marker Highlight', 'highlighter marker yellow pen', 'background: linear-gradient(transparent 45%, #fde047 45%, #fde047 90%, transparent 90%); color: inherit; border: none; border-radius: 0; padding: 0 2px; font-weight: 700;');
    p('text', 'wavy', 'Wavy Underline', 'wavy squiggle underline', 'background: transparent; color: inherit; border: none; padding: 0 1px; font-weight: 700; text-decoration: underline wavy #ec4899 2px; text-underline-offset: 4px;');
    p('text', 'gradientunderline', 'Gradient Underline', 'gradient underline colorful line', 'background: linear-gradient(90deg, #06b6d4, #8b5cf6) left bottom / 100% 3px no-repeat; color: inherit; border: none; border-radius: 0; padding: 0 1px 2px; font-weight: 800;');
    p('text', 'smallcaps', 'Small Caps', 'small caps classy elegant serif', "background: transparent; color: #7c2d12; border: none; padding: 0 1px; font-family: Georgia, 'Times New Roman', serif; font-variant: small-caps; letter-spacing: 0.08em; font-weight: 700;");

    // ---------- Animated ----------
    p('anim', 'shimmer', 'Shimmer', 'shimmer shine sweep animated', 'background: linear-gradient(110deg, #7c3aed 0%, #7c3aed 40%, #c4b5fd 50%, #7c3aed 60%, #7c3aed 100%); background-size: 250% 100%; color: #ffffff; border: none; border-radius: 999px; font-weight: 800; animation: bbcss-shimmer 2.2s linear infinite;');
    p('anim', 'pulse', 'Pulse', 'pulse ring animated attention', 'background: #ef4444; color: #ffffff; border: none; border-radius: 999px; font-weight: 800; animation: bbcss-pulse 1.6s ease-out infinite;');
    p('anim', 'rainbowflow', 'Rainbow Flow', 'rainbow moving animated colorful', 'background: linear-gradient(90deg, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444); background-size: 300% 100%; color: #ffffff; border: none; border-radius: 999px; font-weight: 900; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); animation: bbcss-flow 4s linear infinite;');
    p('anim', 'breathe', 'Breathing Glow', 'breathing glow soft animated calm', 'background: #10b981; color: #ffffff; border: none; border-radius: 999px; font-weight: 800; animation: bbcss-breathe 3s ease-in-out infinite;');
    p('anim', 'gradientwave', 'Gradient Wave', 'gradient wave ocean animated', 'background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #3b82f6, #06b6d4); background-size: 300% 100%; color: #ffffff; border: none; border-radius: 8px; font-weight: 800; animation: bbcss-flow 6s ease-in-out infinite alternate;');
    p('anim', 'cursor', 'Blinking Cursor', 'blinking cursor typing terminal animated', "background: #0a0f0a; color: #33ff66; border: none; border-right: 0.5em solid #33ff66; border-radius: 2px; font-family: 'JetBrains Mono', monospace; animation: bbcss-cursor 1s steps(1) infinite;");
    p('anim', 'sparkle', 'Sparkle', 'sparkle twinkle stars animated', 'background: linear-gradient(135deg, #fde68a, #f59e0b); color: #78350f; border: 1px solid #f59e0b; border-radius: 999px; font-weight: 900; animation: bbcss-twinkle 1.8s ease-in-out infinite;');
    p('anim', 'bounce', 'Bounce', 'bounce jump hop animated fun', 'background: #3b82f6; color: #ffffff; border: none; border-radius: 999px; font-weight: 800; animation: bbcss-bounce 1.2s ease-in-out infinite;');
    p('anim', 'colorcycle', 'Color Cycle', 'color cycle hue rainbow animated', 'background: linear-gradient(180deg, #f9a8d4, #ec4899); color: #ffffff; border: none; border-radius: 999px; font-weight: 800; animation: bbcss-hue 5s linear infinite;');
    p('anim', 'flicker', 'Neon Flicker', 'neon flicker sign broken animated', 'background: #0b0b14; color: #fff0f8; border: 1px solid #ff2fa0; border-radius: 6px; font-weight: 800; text-shadow: 0 0 4px #ff2fa0, 0 0 10px #ff2fa0; box-shadow: 0 0 6px #ff2fa0; animation: bbcss-flicker 3s linear infinite;');

    // ---------- Highlights: 10 picks from 25 highlighter styles x 4 colors! ----------
    // They sit inline in your text (wrapping cleanly across lines) and keep your text color!
    var HL_COLORS = [
        { id: 'yellow', name: 'Yellow', hl: 'rgba(253, 224, 71, 0.8)', soft: '#fef9c3', deep: '#ca8a04', neon: '#f5ff3b' },
        { id: 'pink', name: 'Pink', hl: 'rgba(249, 168, 212, 0.75)', soft: '#fce7f3', deep: '#db2777', neon: '#ff5ec4' },
        { id: 'green', name: 'Green', hl: 'rgba(134, 239, 172, 0.8)', soft: '#dcfce7', deep: '#16a34a', neon: '#5dff6b' },
        { id: 'blue', name: 'Blue', hl: 'rgba(147, 197, 253, 0.8)', soft: '#dbeafe', deep: '#2563eb', neon: '#4dc3ff' }
    ];
    var HL_BASE = 'display: inline; margin: 0; color: inherit; -webkit-box-decoration-break: clone; box-decoration-break: clone; ';
    var HL_STYLES = [
        ['marker', 'Marker', 'marker classic flat', function (c) { return 'background: ' + c.hl + '; padding: 0 2px; border-radius: 2px;'; }],
        ['halfmarker', 'Half Marker', 'half lower marker', function (c) { return 'background: linear-gradient(transparent 52%, ' + c.hl + ' 52%); padding: 0 2px; border-radius: 0;'; }],
        ['lowswipe', 'Low Swipe', 'low swipe band underline', function (c) { return 'background: linear-gradient(transparent 66%, ' + c.hl + ' 66%, ' + c.hl + ' 92%, transparent 92%); padding: 0 2px; border-radius: 0;'; }],
        ['thickline', 'Thick Underline', 'thick underline bar', function (c) { return 'background: linear-gradient(' + c.deep + ', ' + c.deep + ') left bottom / 100% 0.16em no-repeat; padding: 0 1px 2px; border-radius: 0;'; }],
        ['pill', 'Round Pill', 'round pill soft', function (c) { return 'background: ' + c.soft + '; border: 1px solid ' + c.hl + '; padding: 0 6px; border-radius: 999px;'; }],
        ['brush', 'Brush Stroke', 'brush stroke painted hand', function (c) { return 'background: linear-gradient(100deg, transparent 0.5%, ' + c.hl + ' 3%, ' + c.hl + ' 96%, transparent 99.5%); padding: 0 6px; border-radius: 8px 3px 10px 4px;'; }],
        ['slanted', 'Slanted', 'slanted skewed angled', function (c) { return 'background: linear-gradient(104deg, transparent 6%, ' + c.hl + ' 6%, ' + c.hl + ' 94%, transparent 94%); padding: 0 6px; border-radius: 0;'; }],
        ['fadededges', 'Faded Edges', 'faded soft edges', function (c) { return 'background: linear-gradient(90deg, transparent, ' + c.hl + ' 14%, ' + c.hl + ' 86%, transparent); padding: 0 8px; border-radius: 0;'; }],
        ['fadeout', 'Fade Out', 'fade gradient trailing', function (c) { return 'background: linear-gradient(90deg, ' + c.hl + ' 0%, transparent 100%); padding: 0 4px; border-radius: 2px;'; }],
        ['glow', 'Soft Glow', 'glow soft halo', function (c) { return 'background: ' + c.soft + '; box-shadow: 0 0 8px ' + c.hl + '; padding: 0 3px; border-radius: 4px;'; }],
        ['outline', 'Outline Box', 'outline box border', function (c) { return 'background: transparent; border: 1.5px solid ' + c.deep + '; padding: 0 3px; border-radius: 4px;'; }],
        ['dashed', 'Dashed Box', 'dashed box border', function (c) { return 'background: transparent; border: 1.5px dashed ' + c.deep + '; padding: 0 3px; border-radius: 4px;'; }],
        ['double', 'Double Underline', 'double underline lines', function (c) { return 'background: transparent; border-bottom: 3px double ' + c.deep + '; padding: 0 1px; border-radius: 0;'; }],
        ['wavy', 'Wavy Underline', 'wavy squiggle underline', function (c) { return 'background: transparent; text-decoration: underline wavy ' + c.deep + ' 2px; text-underline-offset: 3px; text-decoration-skip-ink: none; padding: 0 1px; border-radius: 0;'; }],
        ['dotted', 'Dotted Underline', 'dotted underline dots', function (c) { return 'background: transparent; border-bottom: 2px dotted ' + c.deep + '; padding: 0 1px; border-radius: 0;'; }],
        ['midline', 'Midline Swipe', 'midline middle strike swipe', function (c) { return 'background: linear-gradient(transparent 44%, ' + c.hl + ' 44%, ' + c.hl + ' 66%, transparent 66%); padding: 0 2px; border-radius: 0;'; }],
        ['bars', 'Top & Bottom', 'top bottom bars lines', function (c) { return 'background: ' + c.soft + '; border-top: 2px solid ' + c.deep + '; border-bottom: 2px solid ' + c.deep + '; padding: 0 3px; border-radius: 0;'; }],
        ['leftbar', 'Left Bar', 'left bar callout quote', function (c) { return 'background: ' + c.soft + '; border-left: 3px solid ' + c.deep + '; padding: 0 4px; border-radius: 0 4px 4px 0;'; }],
        ['gel', 'Gel Marker', 'gel glossy aero shine', function (c) { return 'background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 55%), linear-gradient(180deg, ' + c.soft + ', ' + c.hl + '); border: 1px solid ' + c.deep + '; box-shadow: inset 0 1px 0 #ffffff; padding: 0 3px; border-radius: 4px;'; }],
        ['neon', 'Neon Marker', 'neon fluorescent bright glow', function (c) { return 'background: ' + c.neon + '; box-shadow: 0 0 6px ' + c.neon + '; padding: 0 3px; border-radius: 3px;'; }],
        ['striped', 'Striped', 'striped stripes diagonal', function (c) { return 'background: repeating-linear-gradient(-45deg, ' + c.hl + ' 0 5px, ' + c.soft + ' 5px 10px); padding: 0 3px; border-radius: 3px;'; }],
        ['dots', 'Polka Dots', 'polka dots dotted fill', function (c) { return 'background: radial-gradient(circle, ' + c.hl + ' 1.5px, transparent 2px) 0 0 / 6px 6px, ' + c.soft + '; padding: 0 3px; border-radius: 3px;'; }],
        ['tape', 'Washi Tape', 'washi tape craft tilted', function (c) { return 'display: inline-block; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0 2px, transparent 2px 6px), ' + c.hl + '; transform: rotate(-1.5deg); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15); padding: 0 6px; border-radius: 1px;'; }],
        ['block', 'Bold Block', 'bold block solid inverse', function (c) { return 'background: ' + c.deep + '; color: #ffffff; font-weight: 700; padding: 0 4px; border-radius: 3px;'; }],
        ['pulse', 'Pulse Marker', 'pulse breathing glow animated', function (c) { return 'background: ' + c.hl + '; --bbcss-glow: ' + c.deep + '; animation: bbcss-breathe 3s ease-in-out infinite; padding: 0 2px; border-radius: 3px;'; }]
    ];
    // Ten different looks, with the colors spread around (add a pair here to bring one back)!
    var HL_PICKS = [
        ['marker', 'yellow'], ['halfmarker', 'pink'], ['brush', 'green'], ['lowswipe', 'blue'], ['wavy', 'pink'],
        ['pill', 'blue'], ['gel', 'yellow'], ['neon', 'green'], ['tape', 'pink'], ['slanted', 'yellow']
    ];
    HL_PICKS.forEach(function (pick) {
        const st = HL_STYLES.filter(function (x) { return x[0] === pick[0]; })[0];
        const c = HL_COLORS.filter(function (x) { return x.id === pick[1]; })[0];
        p('highlight', 'hl-' + st[0] + '-' + c.id, c.name + ' ' + st[1], st[2] + ' ' + c.id + ' highlight highlighter', HL_BASE + st[3](c));
    });

    return list;
})();
