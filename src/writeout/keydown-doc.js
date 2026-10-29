/* keydown-doc.js — one .kd family for Writeout, Bitbook and OpenDB!
   Writeout documents (.kd) and Bitbook notes (.kn) hold the editor's HTML after their header;
   OpenDB entries (.kd) hold Keydown text. This file reads all of them:
   - kdDoc.parse(fileText) splits any of them into { meta, kind: 'html' | 'keydown', body, tabs }!
   - kdDoc.textToHtml(keydown) draws Keydown text as editor HTML (headings, bullets, chips,
     highlights, math, footnotes, [[links]], images and {{templates}})!
   - kdDoc.htmlToText(html) turns editor HTML back into Keydown text, so nothing is lost!
   - kdDoc.toEditorHtml(fileText) opens an OpenDB entry in Writeout or Bitbook (title, summary and all)!
   One identical copy lives in writeout/ and bitbook/, and OpenDB loads the Writeout one! */
(function (root) {
    'use strict';

    // Where OpenDB lives, worked out from this script's own address (works from every app and page)
    const SCRIPT = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
    const OPENDB = SCRIPT ? new URL('../opendb/', SCRIPT).href : '../opendb/';

    // Gel highlights, the Annotator's first three tools: #R#text## #R#text#_ #R#text#~ in its 13 colors!
    const HL_COLORS = [['R', 'red'], ['O', 'orange'], ['GL', 'gold'], ['Y', 'yellow'], ['L', 'lime'], ['G', 'green'], ['TU', 'turquoise'],
        ['T', 'teal'], ['C', 'cyan'], ['B', 'blue'], ['PR', 'purple'], ['PK', 'pink'], ['SL', 'slate']];
    const HL_STYLES = [['##', ''], ['#_', ' an-s-ul'], ['#~', ' an-s-st']];
    const HIGHLIGHTS = [];
    HL_COLORS.forEach(([k, c]) => HL_STYLES.forEach(([close, s]) => HIGHLIGHTS.push(['#' + k + '#', close, 'mark', 'an-hl an-hl-' + c + s])));

    // Writeout's own trigger table: [open, close, tag, classes]
    const TRIGGERS = [
        ['=Y=','=Y=','span','gel-orb gel-y'], ['=R=','=R=','span','gel-orb gel-r'], ['=G=','=G=','span','gel-orb gel-g'], ['=C=','=C=','span','gel-orb gel-c'], ['=B=','=B=','span','gel-orb gel-b'], ['=V=','=V=','span','gel-orb gel-v'],
        ['=P=','=P=','span','gel-orb gel-p'], ['=O=','=O=','span','gel-orb gel-o'], ['=MG=','=MG=','span','gel-orb gel-mg'], ['=LM=','=LM=','span','gel-orb gel-lm'], ['=AQ=','=AQ=','span','gel-orb gel-aq'], ['=SL=','=SL=','span','gel-orb gel-sl'],
        ['&&','&&','span','spark-text'], ['~G~','~G~','span','gel-green-flash'], ['~U~','~U~','span','liquid-underline'], ['~B~','~B~','span','glossy-border-badge'], ['~S~','~S~','span','cyber-glow-spark'], ['~L~','~L~','span','liquid-text-glow'],
        ['~M~','~M~','span','reflected-text-block'], ['~E~','~E~','span','embossed-glass-text'], ['~W~','~W~','span','kinetic-wave-text'], ['`','`','code',''], ['**','**','strong',''], ['*','*','em',''],
        
        ['!#R#','#','span','aero-tag-chip tag-chip-r'], ['!#O#','#','span','aero-tag-chip tag-chip-o'], ['!#GL#','#','span','aero-tag-chip tag-chip-gl'], ['!#Y#','#','span','aero-tag-chip tag-chip-y'], ['!#L#','#','span','aero-tag-chip tag-chip-l'], ['!#G#','#','span','aero-tag-chip tag-chip-g'], ['!#TU#','#','span','aero-tag-chip tag-chip-tu'], ['!#T#','#','span','aero-tag-chip tag-chip-t'], ['!#C#','#','span','aero-tag-chip tag-chip-c'], ['!#B#','#','span','aero-tag-chip tag-chip-b'], ['!#PR#','#','span','aero-tag-chip tag-chip-pr'], ['!#PK#','#','span','aero-tag-chip tag-chip-pk'], ['!#W#','#','span','aero-tag-chip tag-chip-w'], ['!#FG#','#','span','aero-tag-chip tag-chip-fg'], ['!#SL#','#','span','aero-tag-chip tag-chip-sl'], ['!#BK#','#','span','aero-tag-chip tag-chip-bk'], ['!#A#','#','span','aero-tag-chip tag-chip-a'], ['#C#','#','span','gel-bubble-chip gel-chip-cyan'], ['#O#','#','span','gel-bubble-chip gel-chip-orange'], ['#G#','#','span','gel-bubble-chip gel-chip-green'], ['#R#','#','span','gel-bubble-chip gel-chip-red'],
        ['#PR#','#','span','gel-bubble-chip gel-chip-purple'], ['#PK#','#','span','gel-bubble-chip gel-chip-pink'], ['#Y#','#','span','gel-bubble-chip gel-chip-yellow'], ['#B#','#','span','gel-bubble-chip gel-chip-blue'], ['#L#','#','span','gel-bubble-chip gel-chip-lime'], ['#T#','#','span','gel-bubble-chip gel-chip-teal'],
        ['#GL#','#','span','gel-bubble-chip gel-chip-gold'], ['#SL#','#','span','gel-bubble-chip gel-chip-slate'], ['#W#','#','span','gel-bubble-chip gel-chip-white'], ['#BK#','#','span','gel-bubble-chip gel-chip-black'], ['#FG#','#','span','gel-bubble-chip gel-chip-fog'], ['#TU#','#','span','gel-bubble-chip gel-chip-turquoise'], ['#%R%','%','span','gel-flag-chip gel-flag-red'], ['#%O%','%','span','gel-flag-chip gel-flag-orange'], ['#%GL%','%','span','gel-flag-chip gel-flag-gold'], ['#%Y%','%','span','gel-flag-chip gel-flag-yellow'], ['#%L%','%','span','gel-flag-chip gel-flag-lime'], ['#%G%','%','span','gel-flag-chip gel-flag-green'], ['#%TU%','%','span','gel-flag-chip gel-flag-turquoise'], ['#%T%','%','span','gel-flag-chip gel-flag-teal'], ['#%C%','%','span','gel-flag-chip gel-flag-cyan'], ['#%B%','%','span','gel-flag-chip gel-flag-blue'], ['#%PR%','%','span','gel-flag-chip gel-flag-purple'], ['#%PK%','%','span','gel-flag-chip gel-flag-pink'], ['#%W%','%','span','gel-flag-chip gel-flag-white'], ['#%FG%','%','span','gel-flag-chip gel-flag-fog'], ['#%SL%','%','span','gel-flag-chip gel-flag-slate'], ['#%BK%','%','span','gel-flag-chip gel-flag-black'], ['%C%','%','span','gel-pill-chip gel-pill-cyan'], ['%O%','%','span','gel-pill-chip gel-pill-orange'], ['%G%','%','span','gel-pill-chip gel-pill-green'], ['%R%','%','span','gel-pill-chip gel-pill-red'], ['%PR%','%','span','gel-pill-chip gel-pill-purple'], ['%PK%','%','span','gel-pill-chip gel-pill-pink'], ['%Y%','%','span','gel-pill-chip gel-pill-yellow'], ['%B%','%','span','gel-pill-chip gel-pill-blue'], ['%L%','%','span','gel-pill-chip gel-pill-lime'], ['%T%','%','span','gel-pill-chip gel-pill-teal'], ['%GL%','%','span','gel-pill-chip gel-pill-gold'], ['%SL%','%','span','gel-pill-chip gel-pill-slate'], ['%W%','%','span','gel-pill-chip gel-pill-white'], ['%BK%','%','span','gel-pill-chip gel-pill-black'], ['%FG%','%','span','gel-pill-chip gel-pill-fog'], ['%TU%','%','span','gel-pill-chip gel-pill-turquoise'],
        ['~WD~','~WD~','span','gel-chip-waterdrop'], ['~SF~','~SF~','span','gel-chip-solarflare'], ['~AW~','~AW~','span','gel-chip-aurorawave'], ['~FN~','~FN~','span','applet-foldout-tab'], ['~TS~','~TS~','span','applet-aqua-switch'], ['~SM~','~SM~','span','applet-glass-stamp'],
        ['~TB~','~TB~','span','applet-state-button state-green'], ['~VD~','~VD~','span','applet-volume-dial'], ['~BC~','~BC~','span','applet-battery-cell'], ['~CD~','~CD~','span','applet-calendar-desk'], ['~SR~','~SR~','span','applet-star-rating'], ['~CC~','~CC~','span','applet-counter-badge'],
        ['~LK~','~LK~','span','applet-security-latch'], ['~PR~','~PR~','span','applet-playback-ribbon'], ['~CR~','~CR~','span','applet-cpu-gauge'], ['~SI~','~SI~','span','applet-stepper-mesh'], ['~MP~','~MP~','span','effect-mercury-pearl'], ['~PG~','~PG~','span','effect-prism-refract'],
        ['~CB~','~CB~','span','effect-screen-cavity'], ['~SR~','~SR~','span','effect-sunlight-ray'], ['~OA~','~OA~','span','effect-abyssal-plate'], ['~MM~','~MM~','span','effect-metallic-mesh'], ['~FE~','~FE~','span','effect-fluid-expand'], ['~MR~','~MR~','span','effect-metric-cavity'],
        ['~PO~','~PO~','span','effect-pearl-orb'], ['~LF~','~LF~','span','effect-lens-flare'], ['~DS~','~DS~','span','effect-drop-shadow-window'], ['~GL~','~GL~','span','effect-glow-tube'], ['~HB~','~HB~','span','effect-hardware-bevel'], ['~IS~','~IS~','span','effect-screen-segment'],
        ['~GC~','~GC~','span','effect-gel-capsule'], ['~KO~','~KO~','span','effect-fluid-orbit'], ['~XG~','~XG~','span','effect-xray-glass'], ['~ORB~','~ORB~','span','applet-hydro-orb orb-blue'], ['~WL~','~WL~','span','effect-waveform-line'], ['~PM~','~PM~','span','effect-plasma-gel'],
        ['~SLS~','~SLS~','span','applet-lock-slider'], ['~VM~','~VM~','span','applet-gadget-clock'], ['~WB~','~WB~','span','effect-water-bubble'], ['~GLO~','~GLO~','span','effect-glow-tracer'], ['~MT~','~MT~','span','applet-metal-trigger'], ['~IC~','~IC~','span','applet-inset-check'],
        ['~ST~','~ST~','span','effect-shimmer-title'], ['~WD-Y~','~','span','droplet-amber'], ['~WD-R~','~','span','droplet-crimson'], ['~WD-PK~','~','span','droplet-fuchsia'], ['~WD-PR~','~','span','droplet-amethyst'], ['~WD-O~','~','span','droplet-tangerine'],
        ['~WD-SL~','~','span','droplet-slate'], ['~FUNC~','~FUNC~','span','dev-chip-function'], ['~VAR~','~VAR~','span','dev-chip-variable'], ['~HEX~','~HEX~','span','dev-chip-hex'], ['~STR~','~STR~','span','dev-chip-string'], ['~RS~','~RS~','span','av-chip-radar-sweep'],
        ['~HD~','~HD~','span','av-chip-heading'], ['~AL~','~AL~','span','av-chip-altimeter'], ['~SG~','~SG~','span','av-chip-signal'], ['~PP-C~','~','span','megachip-plasma plasma-cyan'], ['~PP-O~','~','span','megachip-plasma plasma-orange'], ['~PP-R~','~','span','megachip-plasma plasma-crimson'],
        ['~PP-L~','~','span','megachip-plasma plasma-lime'], ['~GB-B~','~','span','megachip-glass-bracket bracket-blue'], ['~GB-PR~','~','span','megachip-glass-bracket bracket-amethyst'], ['~GB-PK~','~','span','megachip-glass-bracket bracket-fuchsia'], ['~GB-Y~','~','span','megachip-glass-bracket bracket-amber'], ['~CN-SL~','~','span','megachip-circuit-node circuit-slate'],
        ['~CN-T~','~','span','megachip-circuit-node circuit-teal'], ['~CN-GL~','~','span','megachip-circuit-node circuit-gold'], ['~CN-R~','~','span','megachip-circuit-node circuit-ruby'], ['~DR~','~DR~','span','jr-chip-date-plate'], ['~MD~','~MD~','span','jr-chip-mood'], ['~VO~','~VO~','span','jr-chip-voice-tag'],
        ['~WX~','~WX~','span','jr-chip-weather'], ['~WS~','~WS~','span','jr-chip-wax-stamp'], ['~B-B~','~','span','aero-glass-badge-chip badge-frame-sky'], ['~B-G~','~','span','aero-glass-badge-chip badge-frame-emerald'], ['~B-O~','~','span','aero-glass-badge-chip badge-frame-orange'], ['~B-R~','~','span','aero-glass-badge-chip badge-frame-crimson'],
        ['~B-PR~','~','span','aero-glass-badge-chip badge-frame-amethyst'], ['~B-Y~','~','span','aero-glass-badge-chip badge-frame-gold'], ['~TL~','~TL~','span','effect-tinted-lens'], ['~NO~','~NO~','span','applet-neon-node node-cyan'], ['~SL~','~SL~','span','effect-audio-stream-loop'], ['~BG~','~BG~','span','effect-biogel-capsule'],
        ['~LS~','~LS~','span','applet-latch-toggle'], ['~TIM~','~TIM~','span','applet-gadget-system-clock'], ['~FT~','~FT~','span','jr-folder-tab'], ['~PT~','~PT~','span','jr-progress-capsule'], ['~MC~','~MC~','span','jr-digital-counter'], ['~RD~','~RD~','span','jr-dot-matrix'],
        ['~LL~','~ST~','span','jr-latch-lock'], ['~WR~','~WR~','span','effect-neon-ribbon'], ['~DH-B~','~','span','aero-duplex-input-chassis duplex-chassis-sky'], ['~DH-G~','~','span','aero-duplex-input-chassis duplex-chassis-emerald'], ['~DH-O~','~','span','aero-duplex-input-chassis duplex-chassis-orange'], ['~DH-PR~','~','span','aero-duplex-input-chassis duplex-chassis-amethyst'],
        ['~SH-B~','~','span','gel-chip-swayed swayed-sky'], ['~SH-G~','~','span','gel-chip-swayed swayed-emerald'], ['~SH-O~','~','span','gel-chip-swayed swayed-orange'], ['~SH-PR~','~','span','gel-chip-swayed swayed-amethyst'], ['~PH-B~','~','span','gel-chip-pill-variant pill-sky'], ['~PH-G~','~','span','gel-chip-pill-variant pill-emerald'],
        ['~PH-O~','~','span','gel-chip-pill-variant pill-orange'], ['~PH-PR~','~','span','gel-chip-pill-variant pill-amethyst'], ['~PC-Y~','~','span','gel-chip-pastel pastel-yellow'], ['~PC-B~','~','span','gel-chip-pastel pastel-blue'], ['~PC-G~','~','span','gel-chip-pastel pastel-green'], ['~PC-PK~','~','span','gel-chip-pastel pastel-pink'],
        ['~PC-PR~','~','span','gel-chip-pastel pastel-purple'], ['~PC-O~','~','span','gel-chip-pastel pastel-orange'], ['~DR-O~','~','span','gel-chip-droplet-ribbon droplet-ribbon-tangerine'], ['~DR-Y~','~','span','gel-chip-droplet-ribbon droplet-ribbon-citrus'], ['~DR-G~','~','span','gel-chip-droplet-ribbon droplet-ribbon-emerald'], ['~DR-B~','~','span','gel-chip-droplet-ribbon droplet-ribbon-sapphire'],
        ['~DR-PR~','~','span','gel-chip-droplet-ribbon droplet-ribbon-amethyst'], ['~DR-PK~','~','span','gel-chip-droplet-ribbon droplet-ribbon-fuchsia'], ['~DR-R~','~','span','gel-chip-droplet-ribbon droplet-ribbon-crimson'], ['~DR-SL~','~','span','gel-chip-droplet-ribbon droplet-ribbon-slate'], ['~H1~','~H1~','span','header-1'], ['~H2~','~H2~','span','header-2'],
        ['~H3~','~H3~','span','header-3'], ['~BQ~','~BQ~','span','blockquote-list'], ['~BUL~','~BUL~','span','bulleted-list'], ['~MH~','~MH~','span','mega-header'],
    ];
    // longest openers first (so ** beats * and !#R# beats #R#); highlights go before all of them, each with its NEAREST ending
    const ORDER = TRIGGERS.slice().sort((a, b) => b[0].length - a[0].length);
    const HL_RE = new RegExp('#(' + HL_COLORS.map((x) => x[0]).sort((a, b) => b.length - a.length).join('|') + ')#([^#]+?)#([#_~])', 'g');
    // Unique Styles Gallery as Keydown: @family-N@text@ (N is the colorway, 1 to 5; @family@text@ is colorway 1)!
    const US_FAMS = new Set('neontube lava holo retrosun vapor sprinkles jelly puffy comic graffiti circuit blueprint led crt pixel aurora galaxy gem foil marble wood washi postit dymo enamel neumorph glassblob ring element origami bubblewrap denim leather chrome window receipt brick scales plaid gingham chevron cyber camo barber sunburst topo glitch hud hazard typewriter crayon brickneon marquee polaroid film brush watercolor stained tiedye popart riso scroll wax banner notebook capsule battery loading cloud glowtext patch softinset clay layers longshadow engraved webtwo retrodesk coderain bokeh ombre mesh swoosh circled spoiler gradtext shimmer extruded diecut letterpress faaqua fabubble faglass fameadow fawater faleaf faflare faswoosh facrystal faunderwater faorb fafrost fadew faeco fasunrise fapinstripe faclouds fataskbar faaquarium faribbon faluna fataskband fagadget fachannel famediawave fablade fapocket fablackglass fatoolbar faprogress fasearch fagltab faballoon fagrass fahorizon farainbow fasunbeam fapetals fawavecrest faripples farainglass faicecube fasnowglobe fashafts faglobe faveins fabamboo faskytext faliquidchrome faliquid faprism fasmoked faneonedge fahologlass fagelring fajellybean facandygloss famarble fawaterdrop fareflect faorbs fabrightribbon faswirl fabanner fabadge fatoggle faicontile fadunes fasunsetsea fatropical fawaterfall facluster fawaveline faecoleaf farecycle fasolar faenergy fapebble fashard faripplering falightleak faicetext fawatertext faglosstext fachrometext faleaftext faskypill famusicnote faflowcard faslider fbcapsule fbwand fbtitlebar fbvalley fbcaustic fbpetal fbstreak fbtwinswoosh fbfacet fbsoda fbpearl fbstacked fbdewbeads fbstatus fbsundisc fbbrushed fbcloudbank fbdockitem fbtank fbsash fbtaskpane fbtray fbgauge fbmenububble fbvisualizer fbhubtile fbclickwheel fbpiano fbribbongroup fbmarquee fbaddress fbdocktab fbtooltip fbflowers fbisland fbrainstreak fbskybeams fbdaisy fbsurf fbpuddle fbmisted fbfrostcorner fbsnowcap fbdappled fbplanet fbfern fbmat fbcloudtext fbchromerim fbleveltube fbprismedge fbgrille fbneonring fbiridescent fbtwinring fbgummy fbpeppermint fbsuperball fbwaterbead fbmirrorpill fbbokeh fbsilk fbflourish fbweb2 fbstarburst fbradio fbrunapp fbpastellayers fbmoonpath fbpalmshade fbrainshower fbfizztrail fbsignalwave fbdropbadge fbcycle fbbattery fbsignalbars fbfroststone fbbevel fbbreathe fbbloom fbfroststroke fbbubbletext fbstickertext fbglasstext fbmeadowtext fbskywindow fbpeel fbsideflow fbcheckbox fckeycap fctwinbubble fcthumb fchillsil fcbelow fcwillow fcsparkle fcvistaglow fccolumn fccurtain fcjewel fcfrostheader fcdewcorner fcecocap fcdawnbands fcgraph fccotton fcstartbar fcfishbowl fccornerribbon fclunawindow fcquicklaunch fcweather fcconsolecard fclightbars fcarrow fcminiscreen fcblackpearl fcsplit fcblocks fclens fcfoldertab fcchat fclawn fcsail fcrainbowrim fcsunburst fcblossomrow fcoceanbands fclilypad fcdrips fcicicle fcsnowflake fcpines fcmoon fcleaffan fcgrove fchorizontext fcsilver fcwavefill fcprismfan fcvisor fcunderglow fcfoil fcbrackets fcjellycube fcwrapper fcgumball fcsplash fcshelf fcspheres fctwist fcrings fcpricetag fcaward fcstepper fcnotify fcwindripple fcretrosun fcvines fccurrent fcfoam fcarc fcsprout fcloop fcplug fcbarchart fcstonestack fcbrick fccorona fcstreak fcglaciertext fcrippletext fccandytext fcmetaltext fcspringtext fccontrail fcpatch fcheadercard fcrange plripple plcaustic plsurface plscallop plsplash plbubbles pldeep plshimmer plclear plrays pldrop plshore plwake plmist plsunref pltiles plmosaic pllane plrope plbuoy pldepth plnodive plcoping plgutter pldrain plladder plboard plblock pllight plskimmer pldeck plterrazzo plwaterline plnighttile plpenny plring plbeachball plnoodle pltube plkick plgoggles plcap plfloatie plraft plwhistle plrescue pltower plflags plumbrella plcabana pltowel plweave plflipflop plsunscreen plshades plicepop plsoda plslush plcitrus plcocktail plmotel plneon plpalms platomic plpostcard plsunset plmorning plheat plchlorine plscore plpace plcaution plslide plcannon plpass plband plsticker plpatch plpin plvarsity plstencil plinflate plgel plfade plsplashtext plripplet plpolaroid pltape plradio plwaveedge pwcrest pwrefract pwshallows pwringlet pwdroptrail pwfoam pwwhirl pwjets pwburst pwglass pwwetglass pwshine pwundertow pwmistglow pwtidegrad pwbigtile pwsubway pwhexpenny pwbullnose pwlanenum pwdraincover pwsteps pwhandrail pwchevron pwdashrope pwplanks pwconcrete pwgate pwlattice pwgauge pwpleats pwthermo pwcover pwinfinity pwarc pwdivering pwdivestick pwsquirt pwballoon pwsnorkel pwflippers pwdonut pwmattress pwducky pwbuckethat pwvisor pwtowelroll pwbagweave pwcooler pwstraw pwsmoothie pwfreezepop pwsnowcone pwtwistrim pwsunhat pwsandal pwroundshades pwdrip pwwatch pwmegaphone pwneontube pwarrowsign pwmarquee pwsnackbar pwpolka pwstripesuit pwgingham pwhalfsun pwriso pwbadge pwribbon pwpennant pwstamp pwmedal pwtrophy pwlcd pwlapcount pwpixelwave pwglitch pwholo pwjelly pwmarble pwbubble pwlongshadow pwoutline pwdotted pwwavyline pwhighlight pwduo pwsunsetmono ptglitter ptdapple ptcrown ptcolumn pttarget ptwaveunder ptombre ptrain ptnightglow ptsunbeam pthorizon pticecube ptsteam ptfizz ptwavegloss ptkidney ptlapfloats ptdivewell ptspajets ptchecker ptorangegrout ptmosaicstrip ptdepthtile ptstones ptswag ptdeckdiag ptpickets ptwaterfall ptguardseat ptbeacon ptpipes ptporthole ptshower ptrules ptstripering ptwings ptvolley ptpolocap ptpaddles pttorpedo pthoop ptlounge ptbucket ptmask ptstrap ptvtowel ptaviator ptsqueeze ptorangeade ptlolly ptfloat ptshaved ptjuicebox ptbitten ptlanyard ptziplock ptbagtag ptcap ptrescueboard ptnoodles ptfirstaid ptscript ptinvite ptneonwave ptboomerang ptgoogie ptboomprint pttileletters ptsleeve ptjersey ptsplitflap ptadmit ptbooth ptslide ptwavestamp ptcalendar ptmixtape ptspeakers ptsurf ptgumbubble ptpopdots ptcomicburst ptextrude ptoutlineduo ptvgrad ptchrome ptfrosted ptcapsule pttoggle ptsunring'.split(' '));
    const US_RE = /@([a-z0-9]+)(?:-([1-5]))?@([^@\n]+?)@/g;
    const classKey = (cls) => String(cls || '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
    const BY_CLASS = new Map();
    TRIGGERS.concat(HIGHLIGHTS).forEach((d) => { if (d[3] && !BY_CLASS.has(classKey(d[3]))) BY_CLASS.set(classKey(d[3]), d); });

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'note';

    // Short notices for OpenDB's {{templates}}, so Writeout and Bitbook show what they mean!
    const NOTICES = {
        'stub': '🌱 This is a stub: it could be expanded!', 'more citations': '📚 This needs more sources!', 'unreferenced': '❓ This does not cite any sources yet!',
        'file improvement': '🖼️ This file could be improved!', 'images needed': '📷 This needs images!', 'image needed': '📷 This needs images!', 'cleanup': '🧹 This may need cleanup!', 'copy edit': '✏️ This may need copy editing!',
        'too technical': '🔬 This may be too technical for most readers!', 'outdated': '⏳ Parts of this may be out of date!', 'disputed': '⚠️ The accuracy of this is disputed!',
        'expand': '➕ This section needs more detail!', 'orphan': '🔗 No other entries link here yet!', 'in use': '🚧 This is being written right now!',
        'merge': '🔀 It has been suggested that this be merged with another entry!',
    };
    const INLINE_TAGS = { 'citation needed': 'citation needed', 'cn': 'citation needed', 'fact': 'citation needed', 'clarify': 'clarification needed', 'dubious': 'dubious',
        'vague': 'vague', 'when': 'when?', 'who': 'who?', 'which': 'which?', 'page needed': 'page needed' };
    const tplName = (raw) => String(raw).split('|')[0].trim().toLowerCase().replace(/[\s_-]+/g, ' ');
    function tplHtml(raw, block) {
        const name = tplName(raw);
        const args = String(raw).split('|').slice(1).map((s) => s.trim()).filter(Boolean);
        let text = INLINE_TAGS[name] ? '[' + INLINE_TAGS[name] + ']' : NOTICES[name];
        if (!text && /^(main|see also|further|distinguish|about)$/.test(name)) text = '↪ ' + name.replace(/^./, (c) => c.toUpperCase()) + ': ' + args.join(', ');
        if (!text) text = '⚑ {{' + raw + '}}';
        else if (args.length && NOTICES[name]) text += ' (' + args.join(', ') + ')';
        const tag = block ? 'div' : 'span';
        return '<' + tag + ' class="kd-tpl' + (block ? ' kd-tpl-block' : '') + '" data-kd-tpl="' + esc(raw) + '" contenteditable="false">' + esc(text) + '</' + tag + '>';
    }

    function mathHtml(tex, display) {
        const inner = typeof root.kdMathHTML === 'function' ? root.kdMathHTML(tex, display) : '<code class="kd-math-src">' + esc((display ? '$$' : '$') + tex + (display ? '$$' : '$')) + '</code>';
        const tag = display ? 'div' : 'span';
        return '<' + tag + ' class="kd-math' + (display ? ' kd-math-display' : '') + '" contenteditable="false" data-tex="' + esc(tex) + '" data-display="' + (display ? '1' : '0') + '" title="Double-click to edit this equation!">' + inner + '</' + tag + '>';
    }

    /* ---------- Keydown text -> editor HTML ---------- */
    // opts: { title(id) -> a title for [[id]] links, media(id) -> an image address or null, notes: { count } }
    function inline(text, opts) {
        const store = [];
        const stash = (html) => { store.push(html); return '\u0001' + (store.length - 1) + '\u0001'; };
        let s = String(text);
        // `code` is taken literally, so nothing inside it turns into links, math or chips
        s = s.replace(/`([^`\n]+)`/g, (_, t) => stash('<code>' + esc(t) + '</code>'));
        s = s.replace(/\\\$/g, () => stash('$'));
        s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash(mathHtml(t.trim(), true)));
        s = s.replace(/(^|[^\w$])\$(?=\S)([^$\n]*?\S)\$(?![\w$])/g, (_, pre, t) => pre + stash(mathHtml(t, false)));
        s = s.replace(new RegExp(SKILL_RE), (m, name, raw) => { if (!SKILL_NAMES.test(name)) return m; const h = skillHtml(name, parseParams(raw.replace(/\\"/g, '"'))); return h ? stash(h) : m; });
        s = s.replace(/\{\{([^{}]+)\}\}/g, (_, raw) => stash(tplHtml(raw, false)));
        // [[id]] shows the entry's title; data-kd-auto remembers that, so it saves back as [[id]] (unless you change the words)
        s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
            const text = label || (opts.title && opts.title(id)) || id;
            return stash('<a class="kd-link" data-kd-link="' + id + '"' + (label ? '' : ' data-kd-auto="' + esc(text) + '"') + ' href="' + OPENDB + '#/e/' + id + '" target="_blank" rel="noopener">' + esc(text) + '</a>');
        });
        s = s.replace(/\[\^([^\]\s][^\]]*)\]/g, (_, label) => {
            const n = (opts.notes[slug(label)] = (opts.notes[slug(label)] || 0) + 1);
            return stash('<a class="kd-footnote-ref" id="fnref-' + slug(label) + '-' + n + '" href="#fn-' + slug(label) + '" spellcheck="false">' + esc(label) + '</a>');
        });
        s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|#)[^)\s]+)\)/g, (_, t, u) => stash('<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>'));
        // Keydown triggers: the inside of each goes through the triggers too, so a highlight can hold bold or a chip!
        const triggers = (str) => {
            str = str.replace(new RegExp(US_RE), (m, fam, n, body) => (US_FAMS.has(fam) ? stash('<span class="us-chip us-' + fam + ' us-' + fam + '-' + (n || 1) + '" spellcheck="false">\u0002' + triggers(body.trim()) + '\u0003</span>') : m));
            // (a fresh copy each time: the same /g pattern used again inside its own replace would loop forever)
            str = str.replace(new RegExp(HL_RE), (m, k, body, end) => stash('<mark class="an-hl an-hl-' + HL_COLORS.find((x) => x[0] === k)[1] +
                (end === '_' ? ' an-s-ul' : end === '~' ? ' an-s-st' : '') + '" spellcheck="false">\u0002' + triggers(body.trim()) + '\u0003</mark>'));
            ORDER.forEach(([open, close, tag, cls]) => {
                let at = str.indexOf(open);
                while (at !== -1) {
                    const end = str.indexOf(close, at + open.length);
                    if (end === -1) break;
                    const body = str.slice(at + open.length, end).trim();
                    if (!body) { at = str.indexOf(open, at + open.length); continue; }
                    const html = /aero-duplex-input-chassis/.test(cls)
                        // duplex chips: every | starts another box
                        ? '<span class="' + cls + '" spellcheck="false">' + (body.split('|').length < 2 ? body.split('|').concat(['']) : body.split('|')).map((t, i, all) =>
                            '<span class="' + (i < all.length - 1 ? 'input-left' : 'input-right') + '">\u0002' + (triggers(t.trim()) || '\u200B') + '\u0003</span>').join('') + '</span>'
                        : '<' + tag + (cls ? ' class="' + cls + '" spellcheck="false"' : '') + '>\u0002' + triggers(body) + '\u0003</' + tag + '>';
                    str = str.slice(0, at) + stash(html) + str.slice(end + close.length);
                    at = str.indexOf(open);
                }
            });
            return str;
        };
        s = triggers(s);
        // escape what is left as plain text, then put the stashed pieces back (a trigger's inside is drawn the same way, so they can nest)
        const render = (raw) => esc(raw).replace(/\u0001(\d+)\u0001/g, (_, i) => store[+i].replace(/\u0002([\s\S]*?)\u0003/g, (__, inner) => render(inner)));
        return render(s);
    }

    function textToHtml(src, opts) {
        opts = Object.assign({ notes: {} }, opts || {});
        const lines = String(src || '').replace(/\r/g, '').split('\n');
        const out = [];
        let list = null;
        const endList = () => { if (list) { out.push('<ul class="bulleted-list">' + list.join('') + '</ul>'); list = null; } };
        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();
            let m;
            if ((m = /^@@program(?:="((?:[^"\\]|\\.)*)")?=```$/.exec(t))) {
                endList();
                const body = [];
                for (i++; i < lines.length && !/^```$/.test(lines[i].trim()); i++) body.push(lines[i]);
                const h = skillHtml('program', parseParams((m[1] || '').replace(/\\"/g, '"')), body.join('\n'));
                out.push(h ? '<p>' + h + '</p>' : '<pre><code>' + esc(['@@program=```'].concat(body, ['```']).join('\n')) + '</code></pre>');
                continue;
            }
            if (/^```/.test(t)) {
                endList();
                const body = [];
                for (i++; i < lines.length && !/^```/.test(lines[i].trim()); i++) body.push(lines[i]);
                out.push('<pre><code>' + esc(body.join('\n')) + '</code></pre>');
                continue;
            }
            if ((m = /^\*\s+(\S.*)$/.exec(t))) { (list = list || []).push('<li>' + inline(m[1], opts) + '</li>'); continue; }
            endList();
            if (!t) { out.push('<div><br></div>'); continue; }
            if ((m = /^\{\{([^{}]+)\}\}$/.exec(t)) && !INLINE_TAGS[tplName(m[1])]) { out.push(tplHtml(m[1], true)); continue; }
            if ((m = /^(#{1,4})\s+(\S.*)$/.exec(t))) {
                const n = m[1].length;
                out.push(n === 4 ? '<h1 class="mega-header">' + inline(m[2], opts) + '</h1>' : '<h' + n + ' class="header-' + n + '">' + inline(m[2], opts) + '</h' + n + '>');
                continue;
            }
            if ((m = /^>\s+(\S.*)$/.exec(t))) { out.push('<blockquote class="blockquote-list">' + inline(m[1], opts) + '</blockquote>'); continue; }
            if ((m = /^\[\^([^\]\s][^\]]*)\]:\s*(.*)$/.exec(t))) {
                out.push('<div class="kd-footnote-def" id="fn-' + slug(m[1]) + '"><span class="kd-footnote-tag">' + esc(m[1]) + '</span> <span class="kd-footnote-text">' + inline(m[2], opts) + '</span></div>');
                continue;
            }
            if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
                const target = m[2];
                const src2 = target.startsWith('media:') ? (opts.media && opts.media(target.slice(6))) : (/^https:\/\//.test(target) ? target : null);
                // pictures, music (MP3, OGG, WAV) and videos (MP4, MOV, MKV) each get the right player
                const player = !src2 ? '' : /\.(mp3|ogg|oga|wav)(\?|#|$)/i.test(src2) ? '<audio controls preload="metadata" src="' + esc(src2) + '"></audio>'
                    : /\.(mp4|m4v|mov|mkv)(\?|#|$)/i.test(src2) ? '<video controls playsinline preload="metadata" src="' + esc(src2) + '"></video>' : '<img src="' + esc(src2) + '" alt="' + esc(m[1]) + '">';
                out.push('<figure class="kd-figure" data-kd-media="' + esc(target) + '" contenteditable="false">' + player +
                    '<figcaption>' + esc(m[1] || target) + '</figcaption></figure>');
                continue;
            }
            if (/^\$\$[\s\S]*\$\$$/.test(t)) { out.push(mathHtml(t.slice(2, -2).trim(), true)); continue; }
            if (/^::[a-z]+(\{[^}]*\})?$/.test(t) && blockFromLine(t)) { out.push(blockFromLine(t)); continue; }
            out.push('<div>' + inline(t, opts) + '</div>');
        }
        endList();
        return out.join('');
    }

    /* ---------- editor HTML -> Keydown text ---------- */
    const BLOCK = /^(P|DIV|H1|H2|H3|H4|H5|H6|UL|OL|LI|BLOCKQUOTE|PRE|FIGURE|TABLE|SECTION|ARTICLE|HR)$/;
    function inlineText(node) {
        if (node.nodeType === 3) return node.nodeValue.replace(/​/g, '').replace(/\$/g, '\\$').replace(/ /g, ' ');
        if (node.nodeType !== 1) return '';
        const el = node;
        const kids = () => Array.from(el.childNodes).map(inlineText).join('');
        const tag = el.tagName;
        if (el.hasAttribute('data-kd-tpl')) return '{{' + el.getAttribute('data-kd-tpl') + '}}';
        if (el.matches(SKILL_SEL) && !el.classList.contains('bl-prog')) return skillToText(el);
        if (el.classList.contains('kd-math')) {
            const tex = el.getAttribute('data-tex') || '';
            return el.getAttribute('data-display') === '1' ? '$$' + tex + '$$' : '$' + tex + '$';
        }
        if (tag === 'BR') return '\n';
        if (tag === 'IMG') {
            const src = el.getAttribute('src') || '';
            return /^https:\/\//.test(src) ? '![' + (el.getAttribute('alt') || '') + '](' + src + ')' : '';
        }
        if (tag === 'A') {
            if (el.classList.contains('kd-footnote-ref')) return '[^' + el.textContent.trim() + ']';
            if (el.classList.contains('kd-footnote-back')) return '';
            const id = el.getAttribute('data-kd-link');
            if (id) { const t = el.textContent.trim(); return '[[' + id + (t && t !== id && t !== el.getAttribute('data-kd-auto') ? '|' + t : '') + ']]'; }
            const href = el.getAttribute('href') || '';
            return /^(https?:|mailto:)/.test(href) ? '[' + kids() + '](' + href + ')' : kids();
        }
        if (tag === 'STRONG' || tag === 'B') return wrap('**', kids());
        if (tag === 'EM' || tag === 'I') return wrap('*', kids());
        if (tag === 'CODE') return wrap('`', el.textContent);
        if (tag === 'MARK' && el.classList.contains('an-hl')) {
            const color = (Array.from(el.classList).find((c) => /^an-hl-/.test(c)) || 'an-hl-yellow').slice(6);
            const code = (HL_COLORS.find((x) => x[1] === color) || [])[0];
            const style = el.classList.contains('an-s-ul') ? '#_' : el.classList.contains('an-s-st') ? '#~' : (Array.from(el.classList).some((c) => /^an-s-/.test(c)) ? null : '##');
            return code && style ? '#' + code + '#' + kids() + style : kids();
        }
        // the editor's own line styles (a bullet's or heading's inner span) are part of the line, not a tag
        if (/^(header-[123]|mega-header|bulleted-list|blockquote-list)$/.test(String(el.className).trim())) return kids();
        if (tag === 'SPAN' && el.classList.contains('us-chip')) {
            const c = Array.from(el.classList).find((k) => /^us-[a-z0-9]+-[1-5]$/.test(k));
            if (c) { const m = /^us-([a-z0-9]+)-([1-5])$/.exec(c); return '@' + m[1] + (m[2] === '1' ? '' : '-' + m[2]) + '@' + kids() + '@'; }
        }
        const d = el.className ? BY_CLASS.get(classKey(el.className)) : null;
        // duplex chips come back as ~DH-B~one|two|three~
        if (d && el.classList.contains('aero-duplex-input-chassis')) return d[0] + Array.from(el.children).map((b) => b.textContent.replace(/\u200B/g, '').trim()).join('|') + d[1];
        if (d && d[2] === 'span') {
            const label = el.getAttribute('data-label') || (el.querySelector('span') && !/^(gel-|aero-tag|spark|liquid|glossy|cyber|embossed)/.test(d[3]) ? el.querySelector('span').textContent : el.textContent);
            return d[0] + String(label).replace(/​/g, '').trim() + d[1];
        }
        return kids();
    }
    // **x** keeps its spaces outside the markers, so "a **b** c" stays readable
    function wrap(mark, t) {
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t);
        return m[2] ? m[1] + mark + m[2] + mark + m[3] : t;
    }

    // a block's contents (its own classes are the block, like header-2, so they never become triggers)
    const kidsText = (el) => Array.from(el.childNodes).map(inlineText).join('');

    function htmlToText(html) {
        const box = document.createElement('div');
        box.innerHTML = String(html || '');
        const lines = [];
        let cur = '';
        const flush = () => { if (cur.trim() !== '') cur.split('\n').forEach((l) => lines.push(l.trim())); cur = ''; };
        const push = (line) => { flush(); lines.push(line); };
        function walk(node) {
            if (node.nodeType === 3) { cur += inlineText(node); return; }
            if (node.nodeType !== 1) return;
            const el = node, tag = el.tagName;
            if (el.classList.contains('kd-meta') || /^(SCRIPT|STYLE|TEMPLATE)$/.test(tag)) return;
            if (el.classList.contains('bl-prog')) { push(''); skillToText(el).split('\n').forEach((l) => lines.push(l)); return; }
            if (el.matches(BLOCK_SEL) && !el.parentElement.closest(BLOCK_SEL)) { const bk = blockOf(el); if (bk) { push(blockLine(bk)); return; } }
            if (el.hasAttribute('data-kd-tpl') && el.classList.contains('kd-tpl-block')) { push('{{' + el.getAttribute('data-kd-tpl') + '}}'); return; }
            if (el.classList.contains('kd-math') && el.getAttribute('data-display') === '1') { push('$$' + (el.getAttribute('data-tex') || '') + '$$'); return; }
            if (el.hasAttribute('data-kd-media')) {
                const cap = el.querySelector('figcaption');
                const target = el.getAttribute('data-kd-media');
                push('![' + (cap && cap.textContent !== target ? cap.textContent.trim() : '') + '](' + target + ')');
                return;
            }
            if (el.classList.contains('kd-footnote-def')) {
                const tagEl = el.querySelector('.kd-footnote-tag'), textEl = el.querySelector('.kd-footnote-text');
                push('[^' + (tagEl ? tagEl.textContent.trim() : slug(el.id.replace(/^fn-/, ''))) + ']: ' + (textEl ? inlineText(textEl).trim() : ''));
                return;
            }
            if (/^H[1-6]$/.test(tag)) {
                const n = el.classList.contains('mega-header') ? 4 : Math.min(3, +tag[1]);
                push('#'.repeat(n) + ' ' + kidsText(el).replace(/\n+/g, ' ').trim());
                return;
            }
            if (tag === 'UL' || tag === 'OL') {
                Array.from(el.querySelectorAll('li')).forEach((li) => {
                    const t = Array.from(li.childNodes).filter((c) => !(c.nodeType === 1 && /^(UL|OL)$/.test(c.tagName))).map(inlineText).join('').replace(/\n+/g, ' ').trim();
                    if (t) push('* ' + t);
                });
                return;
            }
            if (tag === 'BLOCKQUOTE') { push('> ' + kidsText(el).replace(/\n+/g, ' ').trim()); return; }
            if (tag === 'PRE') { flush(); lines.push('```'); el.textContent.replace(/\n$/, '').split('\n').forEach((l) => lines.push(l)); lines.push('```'); return; }
            if (tag === 'HR') { push(''); return; }
            if (BLOCK.test(tag)) {
                flush();
                const hasBlocks = Array.from(el.children).some((c) => BLOCK.test(c.tagName) || c.classList.contains('kd-math-display') || c.hasAttribute('data-kd-media'));
                if (hasBlocks) { Array.from(el.childNodes).forEach(walk); flush(); return; }
                const t = kidsText(el).replace(/\s+$/, '');
                if (t.trim() === '') lines.push('');
                else t.split('\n').forEach((l) => lines.push(l.trim()));
                return;
            }
            cur += inlineText(el);
        }
        Array.from(box.childNodes).forEach(walk);
        flush();
        return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    /* ---------- Files ---------- */
    function parseValue(v) {
        v = String(v).trim();
        if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch (e) { return v.slice(1, -1).replace(/\\"/g, '"'); } }
        if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
        return v;
    }
    function parseTabs(text) {
        const marker = '\n---tabs---\n';
        const idx = text.indexOf(marker);
        if (idx === -1) return { html: text, tabs: null };
        const tabs = [];
        let cur = null;
        text.substring(idx + marker.length).split('\n').forEach((ln) => {
            let m = /^\s*-\s*name:\s*(.*)\s*$/.exec(ln);
            if (m) { cur = { name: '', html: '' }; tabs.push(cur); try { cur.name = JSON.parse(m[1]); } catch (e) { cur.name = m[1]; } return; }
            m = /^\s*html:\s*(.*)\s*$/.exec(ln);
            if (m && cur) { try { cur.html = JSON.parse(m[1]); } catch (e) { cur.html = m[1]; } }
        });
        return { html: text.substring(0, idx), tabs: tabs.length ? tabs : null };
    }
    // Any .kd or .kn file: { meta, kind, body, tabs }
    function parse(fileText) {
        const text = String(fileText || '').replace(/^﻿/, '').replace(/\r\n/g, '\n');
        const meta = { infobox: {} };
        let body = text;
        const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
        if (m) {
            m[1].split('\n').forEach((line) => {
                const kv = /^([A-Za-z][\w .-]*?):\s?(.*)$/.exec(line);
                if (!kv) return;
                const key = kv[1].trim();
                if (key.startsWith('infobox.')) meta.infobox[key.slice(8)] = String(parseValue(kv[2]));
                else meta[key] = parseValue(kv[2]);
            });
            body = m[2];
        }
        const keydown = meta.format === 'keydown-text' || (!!meta.id && !!meta.type && !meta.page_size) || (!m && !/<[a-z][\s\S]*>/i.test(text));
        if (keydown) return { meta, kind: 'keydown', body: body.trim(), tabs: null };
        const t = parseTabs(body.trim());
        return { meta, kind: 'html', body: t.html.trim(), tabs: t.tabs };
    }
    const isKeydownText = (fileText) => parse(fileText).kind === 'keydown';

    // OpenDB's index, for entry titles and media files (loaded once, only when needed)
    let indexP = null;
    function opendbIndex() {
        if (!indexP) indexP = fetch(OPENDB + 'data/index.json').then((r) => (r.ok ? r.json() : { entries: [] })).catch(() => ({ entries: [] }));
        return indexP;
    }
    // An OpenDB entry, ready for Writeout's or Bitbook's editor: title, summary, then the text!
    function toEditorHtml(fileText) {
        const doc = parse(fileText);
        const needIndex = /\[\[|media:/.test(doc.body);
        return (needIndex ? opendbIndex() : Promise.resolve({ entries: [] })).then((index) => {
            const byId = new Map((index.entries || []).map((e) => [e.id, e]));
            const opts = {
                title: (id) => (byId.get(id) || {}).title,
                media: (id) => { const e = byId.get(id); return e && e.file ? OPENDB + 'data/' + e.file : null; },
            };
            const meta = doc.meta;
            const keep = {};
            Object.keys(meta).forEach((k) => { if (!/^(format|app|exported_at)$/.test(k)) keep[k] = meta[k]; });
            return (Object.keys(keep).length > 1 || Object.keys(meta.infobox || {}).length ? '<div class="kd-meta" hidden data-kd-meta="' + esc(JSON.stringify(keep)) + '"></div>' : '') +
                (meta.title ? '<h1 class="header-1" data-kd-title="1">' + esc(meta.title) + '</h1>' : '') +
                (meta.summary ? '<div data-kd-summary="1"><em>' + esc(meta.summary) + '</em></div><div><br></div>' : '') +
                (meta.abstract ? '<blockquote class="blockquote-list" data-kd-abstract="1">' + esc(meta.abstract) + '</blockquote>' : '') +
                textToHtml(doc.body, opts);
        });
    }
    // The other way: any .kd/.kn file as an OpenDB entry draft { title, summary, body, ...meta }
    const clean = (t) => String(t || '').replace(/[\u200B\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
    function toEntry(fileText) {
        const doc = parse(fileText);
        if (doc.kind === 'keydown') return Object.assign({}, doc.meta, { body: doc.body });
        const parts = doc.tabs && doc.tabs.length > 1 ? doc.tabs : [{ name: '', html: doc.tabs ? doc.tabs[0].html : doc.body }];
        const box = document.createElement('div');
        box.innerHTML = parts.map((p) => (p.name && parts.length > 1 ? '<h2>' + esc(p.name) + '</h2>' : '') + p.html).join('');
        let entry = {};
        const metaEl = box.querySelector('.kd-meta[data-kd-meta]');
        if (metaEl) { try { entry = JSON.parse(metaEl.getAttribute('data-kd-meta')) || {}; } catch (e) { entry = {}; } metaEl.remove(); }
        const titleEl = box.querySelector('[data-kd-title]') || (box.firstElementChild && /^H1$/.test(box.firstElementChild.tagName) ? box.firstElementChild : null);
        if (titleEl) { entry.title = clean(titleEl.textContent); titleEl.remove(); }
        const sumEl = box.querySelector('[data-kd-summary]');
        if (sumEl) { entry.summary = clean(sumEl.textContent); const gap = sumEl.nextElementSibling; sumEl.remove(); if (gap && gap.tagName === 'DIV' && !gap.textContent.trim() && !gap.querySelector('img')) gap.remove(); }
        const absEl = box.querySelector('[data-kd-abstract]');
        if (absEl) { entry.abstract = clean(absEl.textContent); absEl.remove(); }
        if (!entry.summary && doc.meta.note_info) entry.summary = String(doc.meta.note_info).split('\n')[0].slice(0, 300);
        entry.body = htmlToText(box.innerHTML);
        return entry;
    }

    /* ---------- Enter at the end of a line: every Keydown tag on it becomes its formatting, in place ---------- */
    const LINE_BLOCK = /^(DIV|P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|UL|OL|TABLE|FIGURE)$/;
    const SKIP = 'code, pre, a, .kd-math, .kd-tpl, [contenteditable="false"]';
    function formatLine(canvas) {
        const sel = window.getSelection();
        if (!canvas || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
        const r = sel.getRangeAt(0);
        if (!canvas.contains(r.startContainer)) return false;
        // the line: the block around the caret, or (text sitting right in the canvas) the run of inline nodes around it
        let block = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
        while (block && block !== canvas && !LINE_BLOCK.test(block.tagName)) block = block.parentElement;
        if (!block) return false;
        let nodes;
        if (block === canvas) {
            let top = r.startContainer;
            while (top.parentNode !== canvas) top = top.parentNode;
            const inline = (n) => n && !(n.nodeType === 1 && (n.tagName === 'BR' || LINE_BLOCK.test(n.tagName))) && !(n.nodeType === 3 && /\n/.test(n.nodeValue));
            let first = top, last = top;
            while (inline(first.previousSibling)) first = first.previousSibling;
            while (inline(last.nextSibling)) last = last.nextSibling;
            nodes = [];
            for (let n = first; n; n = n.nextSibling) { nodes.push(n); if (n === last) break; }
        } else {
            nodes = Array.from(block.childNodes);
        }
        if (!nodes.length) return false;
        // only at the END of the line (an Enter in the middle just splits it, like always)
        const rest = document.createRange();
        rest.setStart(r.startContainer, r.startOffset);
        rest.setEndAfter(nodes[nodes.length - 1]);
        if (rest.toString().replace(/[\s\u200B\u00A0]/g, '') !== '') return false;
        // the line itself first: "# Title", "* item", "> quote", ::block{...}, $$math$$... becomes what it says
        let lineEl2 = null;
        const runText = nodes.map((n) => n.textContent).join('').replace(/\u200B/g, '');
        if (/^\s*(#{1,4}\s+\S|\*\s+\S|>\s+\S|::[a-z]+|\$\$|\[\^[^\]]+\]:|\{\{|!\[)/.test(runText) && !isProtected(block, canvas)) {
            if (block === canvas) {
                // text sitting right in the canvas gets a line of its own first
                const d = document.createElement('div');
                nodes[0].before(d);
                nodes.forEach((n) => d.appendChild(n));
                block = d;
            }
            if (/^(DIV|P)$/.test(block.tagName)) {
                lineEl2 = lineToBlock(block);
                if (lineEl2) { block = lineEl2; nodes = Array.from(lineEl2.childNodes); }
            }
        }
        const texts = [];
        nodes.forEach((n) => {
            if (n.nodeType === 3) texts.push(n);
            else if (n.nodeType === 1 && !n.matches(SKIP)) {
                const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
                for (let t = w.nextNode(); t; t = w.nextNode()) if (!(t.parentElement && t.parentElement.closest(SKIP))) texts.push(t);
            }
        });
        let changed = false;
        texts.forEach((t) => {
            const text = t.nodeValue;
            if (!/[#*=~`&$[{!@%]/.test(text)) return;
            const html = inline(text, { notes: {} });
            if (html === esc(text)) return;
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            t.parentNode.replaceChild(tpl.content, t);
            changed = true;
        });
        if (!changed && !lineEl2) return false;
        // the caret goes after the line's last piece (outside any new chip), ready for the new line;
        // a whole block (a panel, a picture, centered math) gets the caret right after it
        const whole = lineEl2 && (lineEl2.matches(BLOCK_SEL) || lineEl2.matches('.kd-math, figure, .kd-tpl') || lineEl2.querySelector('.kd-footnote-def'));
        if (whole) {
            // a whole block gets a fresh line right below it, with the caret in it (the Enter is already done)
            const next = document.createElement('div');
            if (canvas.getAttribute('contenteditable') === 'false') next.setAttribute('contenteditable', 'true');
            next.appendChild(document.createTextNode('\u200B'));
            lineEl2.after(next);
            const c2 = document.createRange();
            c2.setStart(next.firstChild, 1); c2.collapse(true);
            sel.removeAllRanges(); sel.addRange(c2);
            try { next.focus({ preventScroll: true }); sel.removeAllRanges(); sel.addRange(c2); } catch (e) {}
            return 'line';
        }
        const lastNode = whole ? lineEl2 : block === canvas ? nodes.filter((n) => n.isConnected).pop() || null : block.lastChild;
        const holder = document.createTextNode(lastNode && lastNode.nodeType === 1 ? '\u200B' : '');
        if (lastNode && lastNode.parentNode) lastNode.parentNode.insertBefore(holder, lastNode.nextSibling);
        else block.appendChild(holder);
        const caret = document.createRange();
        caret.setStart(holder, holder.nodeValue.length);
        caret.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caret);
        return true;
    }

    // ::name{your text}: every block takes your own text (| splits a title from its text, or one line from the next)!
    const KD_BLOCK_BOXES = { aqua: ['', '🌊 Aqua notes...'], emerald: ['aqua-emerald-box', '🌿 Eco logs...'], amber: ['aqua-amber-box', '☀️ Highlights...'], crimson: ['aqua-crimson-box', '🚨 Urgent tasks...'], amethyst: ['aqua-amethyst-box', '🔮 Creative drafts...'] };
    const KD_BLOCK_PANELS = { gsky: ['panel-sky', '🔹 SKY COMPONENT', 'Sky log notes...'], gemerald: ['panel-emerald', '🌿 ECO COMPONENT', 'Organic project logs...'], gamber: ['panel-amber', '☀️ AMBER MATRIX', 'Highlights...'], gcrimson: ['panel-crimson', '🚨 ALERT MANIFEST', 'Urgent warnings...'] };
    function kdBlockMarkup(name, data, fmt) {
        const parts = data === undefined || data === null ? [] : String(data).split('|');
        const f = (i, dflt) => fmt(parts[i] !== undefined && parts[i].trim() !== '' ? parts[i].trim() : dflt);
        const lines = (dflt) => (parts.length ? parts : dflt).map((t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n');
        if (KD_BLOCK_BOXES[name]) return '<div class="aqua-aero-box' + (KD_BLOCK_BOXES[name][0] ? ' ' + KD_BLOCK_BOXES[name][0] : '') + '"><div class="aqua-box-content">' + f(0, KD_BLOCK_BOXES[name][1]) + '</div></div>';
        if (KD_BLOCK_PANELS[name]) return '<div class="aero-glass-panel ' + KD_BLOCK_PANELS[name][0] + '"><div class="glass-panel-header"><span>' + f(0, KD_BLOCK_PANELS[name][1]) + '</span></div><p class="glass-panel-content">' + f(1, KD_BLOCK_PANELS[name][2]) + '</p></div>';
        switch (name) {
            case 'glass': return '<div class="aero-glass-block">' + f(0, 'Glass Header') + '</div>';
            case 'bubble': return '<span class="aqua-bubble-text">' + f(0, 'Liquid Stream') + '</span>';
            case 'alert': return '<div class="tactile-alert-plate"><div class="alert-icon-orb">!</div> ' + f(0, '⚠️ CRITICAL WARNING SYSTEM INITIALIZED') + '</div>';
            case 'media': return '<div class="media-track-wrap"><span class="media-track-text">' + f(0, 'NOW PLAYING: Track_Audio_Stream.wav') + '</span><div class="media-control-orb"></div></div>';
            case 'foldout': return '<div class="aero-foldout-panel"><div class="foldout-panel-header"><div class="foldout-arrow-orb">▲</div><div class="foldout-panel-title-input">' + f(0, 'TITLE') + '</div></div><div class="foldout-panel-content"><p>' + f(1, 'TEXT') + '</p></div></div>';
            case 'divider': return '<div class="aero-liquid-divider"></div>';
            case 'code': return '<div class="writedown-code-block"><div class="code-block-header"><span>CODE SPEC</span></div><pre class="code-block-content">' + lines(['// Write text lines here...']) + '</pre></div>';
            case 'console': return '<div class="writedown-console-block"><div class="console-block-header"><span>⚠️ SYSTEM DEBUG CONSOLE</span></div><pre class="console-block-content">' + lines(['error: Undefined reference tracking index bounds fault.']) + '</pre></div>';
            case 'diff': return '<div class="writedown-diff-block"><div class="diff-row-content">' + (parts.length ? parts : ['+ function initializeWorkspace() {', '- function setupOldEngine() {']).map((t) => { t = t.trim(); return '<p' + (t[0] === '+' ? ' class="diff-add"' : t[0] === '-' ? ' class="diff-del"' : '') + '>' + fmt(t) + '</p>'; }).join('') + '</div></div>';
            case 'horizon': return '<div class="writedown-horizon-block"><div class="horizon-pitch-line"></div></div>';
            case 'waypoint': return '<div class="writedown-waypoint-block"><div class="waypoint-block-header"><span>🛰️ FLIGHT WAYPOINT MONITOR</span></div><div class="waypoint-block-content">' + f(0, 'NAV: WP_01 // COORD: 34.1803° N, 118.3090° W // ALT: ~2,400 FT') + '</div></div>';
            case 'entry': return '<div class="writedown-journal-entry"><div class="journal-entry-content"><p>' + f(0, 'Ring binder entry...') + '</p></div></div>';
            case 'draw': return '<div class="writedown-code-block"><div class="code-block-header"><span>SKETCHPAD</span></div><pre class="code-block-content">🎨 Sketchpad lives in Writeout!</pre></div>';
            default: return null;
        }
    }
    // The other way: a block on the page -> ['glass', ['My heading']] (null when it is not a block)
    function blockOf(el) {
        if (!el || el.nodeType !== 1) return null;
        const c = el.classList;
        const txt = (sel) => { const x = el.querySelector(sel); return x ? kidsText(x).replace(/\s+/g, ' ').trim() : ''; };
        const raw = (sel) => { const x = el.querySelector(sel); return x ? x.textContent.replace(/\n$/, '').split('\n') : []; };
        if (c.contains('aero-glass-block')) return ['glass', [kidsText(el).replace(/[\s\u200B]+/g, ' ').trim()]];
        if (c.contains('aqua-bubble-text')) return ['bubble', [kidsText(el).trim()]];
        if (c.contains('tactile-alert-plate')) { const k = el.cloneNode(true); k.querySelectorAll('.alert-icon-orb').forEach((o) => o.remove()); return ['alert', [kidsText(k).replace(/\s+/g, ' ').trim()]]; }
        if (c.contains('media-track-wrap')) return ['media', [txt('.media-track-text')]];
        if (c.contains('aqua-aero-box')) return [Object.keys(KD_BLOCK_BOXES).find((k) => KD_BLOCK_BOXES[k][0] && c.contains(KD_BLOCK_BOXES[k][0])) || 'aqua', [txt('.aqua-box-content')]];
        if (c.contains('aero-glass-panel')) return [Object.keys(KD_BLOCK_PANELS).find((k) => c.contains(KD_BLOCK_PANELS[k][0])) || 'gsky', [txt('.glass-panel-header'), txt('.glass-panel-content')]];
        if (c.contains('aero-foldout-panel')) return ['foldout', [txt('.foldout-panel-title-input'), txt('.foldout-panel-content')]];
        if (c.contains('aero-liquid-divider')) return ['divider', []];
        if (c.contains('writedown-code-block')) return /SKETCH/i.test(txt('.code-block-header')) ? ['draw', []] : ['code', raw('.code-block-content')];
        if (c.contains('writedown-console-block')) return ['console', raw('.console-block-content')];
        if (c.contains('writedown-diff-block')) return ['diff', Array.from(el.querySelectorAll('.diff-row-content p')).map((p) => kidsText(p).trim())];
        if (c.contains('writedown-horizon-block')) return ['horizon', []];
        if (c.contains('writedown-waypoint-block')) return ['waypoint', [txt('.waypoint-block-content')]];
        if (c.contains('writedown-journal-entry')) return ['entry', [txt('.journal-entry-content')]];
        return null;
    }
    const BLOCK_SEL = '.aero-glass-block, .aqua-bubble-text, .tactile-alert-plate, .media-track-wrap, .aqua-aero-box, .aero-glass-panel, .aero-foldout-panel, .aero-liquid-divider, .writedown-code-block, .writedown-console-block, .writedown-diff-block, .writedown-horizon-block, .writedown-waypoint-block, .writedown-journal-entry';
    const blockLine = (b) => '::' + b[0] + (b[1].length && b[0] !== 'draw' ? '{' + b[1].map((t) => String(t).replace(/[{}|]/g, ' ')).join('|') + '}' : '');
    const blockFromLine = (line) => { const m = /^\s*::([a-z]+)(?:\{([^}]*)\})?\s*$/.exec(line); return m ? kdBlockMarkup(m[1], m[2], (t) => inline(t, { notes: {} })) : null; };

    /* ---------- Un-format and Re-format a whole document ---------- */
    // Un-format turns every piece of Keydown formatting back into the tags that make it, so mistakes are easy to see.
    // Anything that isn't Keydown (pictures, tables, colors from the toolbar) stays exactly as it is!
    const INLINE_KD = 'mark.an-hl, strong, b, em, i, code, .kd-math, a.kd-footnote-ref, a.kd-link, .kd-tpl, span[class]';
    // Skills and other app pieces are never touched: BeepBox chips, Bitbook tags, dice, file chips... Anything locked
    // against editing (except plain lists, tables and Keydown's own blocks), or carrying its own data, is left alone!
    const KD_DATA = /^data-(kd|tex|display|label|text)/;
    function isProtected(el, root) {
        for (let n = el; n && n !== root && n.nodeType === 1; n = n.parentElement) {
            if (Array.from(n.attributes).some((a) => a.name.startsWith('data-') && !KD_DATA.test(a.name))) return true;
            if (n.getAttribute('contenteditable') === 'false' && !/^(UL|OL|TABLE|TBODY|THEAD|TR)$/.test(n.tagName) &&
                !n.classList.contains('kd-math') && !n.classList.contains('kd-tpl') && !n.matches(BLOCK_SEL) && !n.hasAttribute('data-kd-media')) return true;
        }
        return false;
    }
    function isKeydownInline(el, root) {
        if (el.closest('pre') || isProtected(el, root)) return false;
        if (/^(STRONG|B|EM|I|CODE)$/.test(el.tagName) || el.classList.contains('kd-math') || el.classList.contains('kd-tpl')) return true;
        if (el.tagName === 'MARK') return el.classList.contains('an-hl');
        if (el.tagName === 'A') return el.classList.contains('kd-footnote-ref') || el.hasAttribute('data-kd-link');
        if (el.tagName === 'SPAN' && el.classList.contains('us-chip')) return true;
        return el.tagName === 'SPAN' && BY_CLASS.has(classKey(el.className)) && !/^(header-|mega-header|bulleted-list|blockquote-list)/.test(el.className);
    }
    function lineEl(text, like) {
        const d = document.createElement('div');
        if (like && like.hasAttribute('contenteditable')) d.setAttribute('contenteditable', 'true');
        d.textContent = text;
        if (!text) d.appendChild(document.createElement('br'));
        return d;
    }
    function unformat(root) {
        let n = 0;
        root.querySelectorAll('a.kd-footnote-back').forEach((a) => a.remove());
        // blocks become ::name{their text} lines (a live sketchpad stays as it is)
        Array.from(root.querySelectorAll(BLOCK_SEL)).forEach((el) => {
            if (!root.contains(el) || (el.parentElement && el.parentElement.closest(BLOCK_SEL)) || el.querySelector('canvas') || isProtected(el.parentElement, root)) return;
            const bk = blockOf(el);
            if (bk) { el.replaceWith(lineEl(blockLine(bk), el.closest('[contenteditable]') || el)); n++; }
        });
        // whole lines first: headings, bullets, quotes, footnote texts, centered math, notices and media
        root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
            if (!root.contains(h) || h.closest('pre') || isProtected(h, root)) return;
            const level = h.classList.contains('mega-header') ? 4 : Math.min(3, +h.tagName[1]);
            h.replaceWith(lineEl('#'.repeat(level) + ' ' + kidsText(h).replace(/\n+/g, ' ').trim(), h)); n++;
        });
        // (a bullet typed inside a list makes a list inside the item: every item becomes its own "* " line)
        const listLines = (ul) => {
            const out = [];
            Array.from(ul.children).filter((li) => li.tagName === 'LI').forEach((li) => {
                const own = Array.from(li.childNodes).filter((c) => !(c.nodeType === 1 && /^(UL|OL)$/.test(c.tagName))).map(inlineText).join('').replace(/[\n\u200B]+/g, ' ').trim();
                if (own) out.push(lineEl('* ' + own, li));
                Array.from(li.children).filter((c) => /^(UL|OL)$/.test(c.tagName)).forEach((sub) => out.push(...listLines(sub)));
            });
            return out;
        };
        root.querySelectorAll('ul.bulleted-list').forEach((ul) => {
            if (!root.contains(ul) || isProtected(ul.parentElement, root)) return;
            const lines = listLines(ul);
            ul.replaceWith(...lines); n += lines.length;
        });
        root.querySelectorAll('blockquote.blockquote-list').forEach((q) => { if (root.contains(q) && !isProtected(q, root)) { q.replaceWith(lineEl('> ' + kidsText(q).replace(/[\n​]+/g, ' ').trim(), q)); n++; } });
        root.querySelectorAll('.kd-footnote-def').forEach((d) => {
            if (!root.contains(d)) return;
            const tag = d.querySelector('.kd-footnote-tag'), text = d.querySelector('.kd-footnote-text');
            d.replaceWith(lineEl('[^' + (tag ? tag.textContent.trim() : d.id.replace(/^fn-/, '')) + ']: ' + (text ? kidsText(text).trim() : ''), d.parentElement === root ? d : d.parentElement)); n++;
        });
        root.querySelectorAll('.kd-math-display, [data-kd-tpl].kd-tpl-block, figure[data-kd-media]').forEach((el) => {
            if (!root.contains(el)) return;
            let t;
            if (el.classList.contains('kd-math')) t = '$$' + (el.getAttribute('data-tex') || '') + '$$';
            else if (el.hasAttribute('data-kd-tpl')) t = '{{' + el.getAttribute('data-kd-tpl') + '}}';
            else { const cap = el.querySelector('figcaption'); const target = el.getAttribute('data-kd-media'); t = '![' + (cap && cap.textContent !== target ? cap.textContent.trim() : '') + '](' + target + ')'; }
            el.replaceWith(lineEl(t, el)); n++;
        });
        // then everything inside the lines: chips, highlights, bold, math, links...
        let again = true;
        while (again) {
            again = false;
            Array.from(root.querySelectorAll(INLINE_KD)).forEach((el) => {
                if (!root.contains(el) || !isKeydownInline(el, root)) return;
                el.replaceWith(document.createTextNode(inlineText(el)));
                n++; again = true;
            });
        }
        root.normalize();
        return n;
    }

    // One line becomes what it says: "# " a heading, "* " a bullet, "> " a quote, ::block{...}, $$math$$, a footnote,
    // a {{notice}} or a picture. Returns the new element (null when it is plain text). Enter and Re-format both use it!
    function lineToBlock(b) {
        const text = b.textContent.replace(/​/g, '');
        let m;
        const make = (tag, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; if (b.hasAttribute('contenteditable')) el.setAttribute('contenteditable', 'true'); return el; };
        // move the line's own nodes in, dropping the "# " / "* " / "> " in front
        const takeRest = (el, prefixLen) => {
            let skip = prefixLen;
            Array.from(b.childNodes).forEach((c) => {
                if (skip > 0 && c.nodeType === 3) {
                    const v = c.nodeValue.replace(/\u200B/g, '');
                    if (v.length <= skip) { skip -= v.length; return; }
                    c.nodeValue = v.slice(skip); skip = 0;
                }
                el.appendChild(c);
            });
            return el;
        };
        const lead = text.length - text.replace(/^\s+/, '').length;
        if ((m = /^\s*(#{1,4})\s+\S/.exec(text))) {
            const lvl = m[1].length;
            const h = takeRest(make(lvl === 4 ? 'h1' : 'h' + lvl, lvl === 4 ? 'mega-header' : 'header-' + lvl), lead + lvl + 1);
            b.replaceWith(h);
            return h;
        }
        if (/^\s*\*\s+\S/.test(text)) {
            const li = takeRest(make('li'), lead + 2);
            const prev = b.previousElementSibling;
            if (prev && prev.tagName === 'UL' && prev.classList.contains('bulleted-list')) { prev.appendChild(li); b.remove(); }
            else { const ul = document.createElement('ul'); ul.className = 'bulleted-list'; ul.appendChild(li); b.replaceWith(ul); }
            return li;
        }
        if (/^\s*>\s+\S/.test(text)) { const q = takeRest(make('blockquote', 'blockquote-list'), lead + 2); b.replaceWith(q); return q; }
        if ((m = /^\s*\[\^([^\]\s][^\]]*)\]:\s*(.*)$/.exec(text)) && !b.children.length) {
            const d = document.createElement('div');
            d.innerHTML = '<div class="kd-footnote-def" id="fn-' + slug(m[1]) + '"><span class="kd-footnote-tag">' + esc(m[1]) + '</span> <span class="kd-footnote-text">' + inline(m[2], { notes: {} }) + '</span></div>';
            if (b.hasAttribute('contenteditable')) d.setAttribute('contenteditable', 'true');
            b.replaceWith(d);
            return d;
        }
        let html = null;
        if (!b.children.length && /^\s*::[a-z]+(\{[^}]*\})?\s*$/.test(text)) html = blockFromLine(text);
        else if (!b.children.length && (/^\s*\$\$([\s\S]+)\$\$\s*$/.test(text) || ((m = /^\s*\{\{([^{}]+)\}\}\s*$/.exec(text)) && !INLINE_TAGS[tplName(m[1])]) || /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.test(text))) html = textToHtml(text.trim(), { notes: {} });
        if (html) {
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            const first = tpl.content.firstElementChild;
            b.replaceWith(tpl.content);
            return first;
        }
        return null;
    }

    // Re-format: format the whole document again, then check it for tags that could not be formatted
    const LEFTOVER = /@(?:[a-z0-9]+)(?:-[1-5])?@(?=\S)|!?#(?:GL|TU|PR|PK|SL|BK|FG|[ROYLGTCBWA])#|=(?:MG|LM|AQ|SL|[YRGCBVPO])=|~[A-Z0-9]{1,5}(?:-[A-Z]{1,2})?~|\*\*|\{\{|\}\}|\[\[|\]\]|\$\$/g;
    function reformat(root) {
        let n = 0;
        const blocks = Array.from(root.querySelectorAll('div, p')).filter((b) => !b.closest('pre, code, figure, [contenteditable="false"] [contenteditable="false"], .kd-math, .kd-tpl') && !isProtected(b, root) && !b.closest(BLOCK_SEL) &&
            !Array.from(b.children).some((c) => LINE_BLOCK.test(c.tagName) || c.tagName === 'BR' && b.childNodes.length > 1 && c !== b.lastChild));
        blocks.forEach((b) => { if (lineToBlock(b)) n++; });
        // every text piece left: chips, highlights, bold, math, footnotes...
        const SKIP_RE = 'code, pre, a, .kd-math, .kd-tpl, figure, [contenteditable="false"] [contenteditable="false"]';
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const texts = [];
        for (let t = walker.nextNode(); t; t = walker.nextNode()) if (!(t.parentElement && (t.parentElement.closest(SKIP_RE) || isProtected(t.parentElement, root)))) texts.push(t);
        texts.forEach((t) => {
            const text = t.nodeValue;
            if (!/[#*=~`&$[{!@%]/.test(text)) return;
            const html = inline(text, { notes: {} });
            if (html === esc(text)) return;
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            n += tpl.content.querySelectorAll('*').length ? 1 : 0;
            t.parentNode.replaceChild(tpl.content, t);
        });
        return { formatted: n, problems: checkKeydown(root) };
    }
    // The check: tags still sitting in the text after formatting are mistakes (a missing closing tag, a typo...)
    function checkKeydown(root) {
        const problems = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
            if (t.parentElement && (t.parentElement.closest('code, pre, .kd-math') || isProtected(t.parentElement, root))) continue;
            const re = new RegExp(LEFTOVER);
            let m;
            while ((m = re.exec(t.nodeValue))) {
                const line = (t.parentElement && t.parentElement.closest('div, p, li, h1, h2, h3, blockquote') || t.parentElement || t).textContent.replace(/\s+/g, ' ').trim();
                problems.push({ tag: m[0], line: line.slice(0, 90), node: t, start: m.index, end: m.index + m[0].length });
            }
        }
        // underline them in place (without changing the document), until the next edit
        try {
            if (window.CSS && CSS.highlights && window.Highlight) {
                const ranges = problems.map((p) => { const r = document.createRange(); r.setStart(p.node, p.start); r.setEnd(p.node, p.end); return r; });
                CSS.highlights.set('kd-problem', new Highlight(...ranges));
                const clear = () => { CSS.highlights.delete('kd-problem'); root.removeEventListener('input', clear); };
                root.addEventListener('input', clear);
            }
        } catch (e) { /* older browsers just get the list */ }
        return problems.map((p) => ({ tag: p.tag, line: p.line }));
    }

    /* ---------- Skills as Keydown (Bitbook): @@name="key='value',..." and @@program=``` code ``` ---------- */
    // BeepBox chips, programs, dice, timers, flashcards, time capsules, sprites, Uni-Chips, Custom Chips, Custom CSS
    // chips and jumpers all have a Keydown form, so they travel as text and come back as the real, working skill!
    const SKILL_SEL = '.bb-chip, .bl-prog, .dc-chip, .tc-chip, .pm-chip, .fl-chip, .px-chip, .uni-chip, .cc-chip, .bbcss-chip, .jumper-anchor';
    const SKILL_RE = /@@([a-z]+)="((?:[^"\\]|\\.)*)"/g;
    const qv = (v) => String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const params = (obj) => Object.keys(obj).filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '').map((k) => k + "='" + qv(obj[k]) + "'").join(',');
    function parseParams(str) {
        const out = {};
        const re = /([a-z]+)\s*=\s*'((?:[^'\\]|\\.)*)'/gi;
        let m;
        while ((m = re.exec(str))) out[m[1].toLowerCase()] = m[2].replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1');
        return out;
    }
    const cssVar = (el, name) => (el.style && el.style.getPropertyValue(name) || '').trim();
    // a skill on the page -> its Keydown text (null when it is not a skill)
    function skillToText(el) {
        if (!el || el.nodeType !== 1 || !el.matches(SKILL_SEL)) return null;
        const c = el.classList;
        const txt = (sel) => { const x = el.querySelector(sel); return x ? x.textContent : ''; };
        if (c.contains('bl-prog')) {
            const code = (el.querySelector('.bl-code') || {}).value || txt('.bl-code');
            const bbml = (el.querySelector('.bl-bbml') || {}).value || txt('.bl-bbml');
            const title = el.getAttribute('data-bl-title') || 'Program';
            const p = params({ title: title === 'Program' ? '' : title, bbml: bbml.replace(/^\n/, '') });
            return '@@program' + (p ? '="' + p + '"' : '') + '=```\n' + code.replace(/^\n/, '').replace(/\n+$/, '') + '\n```';
        }
        if (c.contains('bb-chip')) {
            const z = el.getAttribute('data-bb-z');
            const style = (Array.from(c).find((k) => /^bb-st-/.test(k)) || 'bb-st-cartridge').slice(6);
            return '@@beepbox="' + params({ link: z ? 'z:' + z : el.getAttribute('data-bb-song'), style: style, label: txt('.bb-chip-text') }) + '"';
        }
        if (c.contains('dc-chip')) return '@@dice="' + params({ dice: el.getAttribute('data-dc') }) + '"';
        if (c.contains('tc-chip')) return '@@capsule="' + params({ label: txt('.tc-chip-name'), open: el.getAttribute('data-tc-open'), message: el.getAttribute('data-tc-msg') }) + '"';
        if (c.contains('pm-chip')) return '@@timer="' + params({ label: txt('.pm-chip-name'), minutes: el.getAttribute('data-pm-min') }) + '"';
        if (c.contains('fl-chip')) return '@@flashcard="' + params({ front: txt('.fl-front'), back: txt('.fl-back') }) + '"';
        if (c.contains('px-chip')) return '@@sprite="' + params({ pixels: el.getAttribute('data-px'), size: el.getAttribute('data-px-size') }) + '"';
        if (c.contains('uni-chip')) return '@@unichip="' + params({ color: el.getAttribute('data-uni-color'), accent: cssVar(el, '--uni-accent'), text: kidsText(el) }) + '"';
        if (c.contains('cc-chip')) return '@@customchip="' + params({ style: (Array.from(c).find((k) => /^cc-s\d+$/.test(k)) || 'cc-s1').slice(4), color: cssVar(el, '--cc'), ink: cssVar(el, '--cc-ink'), text: kidsText(el) }) + '"';
        if (c.contains('bbcss-chip')) return '@@customcss="' + params({ id: (Array.from(c).find((k) => /^bbcss-(?!chip)/.test(k)) || '').slice(6), name: el.getAttribute('data-bbcss-name'), css: el.getAttribute('style'), text: kidsText(el) }) + '"';
        if (c.contains('jumper-anchor')) return '@@jumper="' + params({ id: el.getAttribute('data-jumper-id'), label: el.getAttribute('data-jumper-label') }) + '"';
        return null;
    }
    // Keydown text -> the skill's HTML (built by Bitbook's own builders when they are here; null elsewhere)
    function skillHtml(name, p, body) {
        const W = root;
        const span = (cls, attrs, text) => { const e = document.createElement('span'); e.className = cls; Object.keys(attrs || {}).forEach((k) => { if (attrs[k] !== undefined && attrs[k] !== '') e.setAttribute(k, attrs[k]); }); if (text !== undefined) e.innerHTML = text; return e; };
        let el = null;
        try {
            if (name === 'program' && W.BitLang && W.BitLang.blockHTML) return W.BitLang.blockHTML(body, null, p.title || 'Program', p.bbml || '');
            if (name === 'beepbox' && typeof W.bbBuildChip === 'function') {
                let link = p.link || '';
                const z = /^z:/.test(link);
                if (!z && /#/.test(link)) link = link.slice(link.indexOf('#') + 1);
                el = W.bbBuildChip({ attr: z ? 'data-bb-z' : 'data-bb-song', value: z ? link.slice(2) : link }, p.label || 'BeepBox Song', p.style || 'cartridge');
            } else if (name === 'dice' && typeof W.dcBuildChip === 'function') {
                const m = /^(\d+)d(\d+)$/i.exec(p.dice || '1d6') || [0, 1, 6];
                el = W.dcBuildChip(parseInt(m[1], 10), parseInt(m[2], 10));
            } else if (name === 'capsule' && typeof W.tcBuildChip === 'function') {
                el = W.tcBuildChip(p.label || 'Time capsule', '', parseInt(p.open, 10) || Date.now());
                if (p.message) el.setAttribute('data-tc-msg', p.message);
            } else if (name === 'timer' && typeof W.pmBuildChip === 'function') {
                el = W.pmBuildChip(p.label || 'Focus', parseFloat(p.minutes) || 25);
            } else if (name === 'flashcard' && typeof W.flBuildChip === 'function') {
                el = W.flBuildChip(p.front || '', p.back || '');
            } else if (name === 'sprite' && typeof W.pxDecode === 'function' && typeof W.pxToDataUrl === 'function') {
                el = span('px-chip px-' + (p.size || 'md'), { contenteditable: 'false', 'data-px': p.pixels, 'data-px-size': p.size || 'md', title: 'Pixel sprite: click to edit!' });
                const img = document.createElement('img');
                img.src = W.pxToDataUrl(W.pxDecode(p.pixels || ''));
                img.alt = 'Pixel sprite'; img.setAttribute('draggable', 'false');
                el.appendChild(img);
            } else if (name === 'unichip' && typeof W.uniApplyStyle === 'function') {
                el = span('uni-chip', { spellcheck: 'false', 'data-uni-color': p.color }, inline(p.text || 'Text', { notes: {} }));
                if (p.accent) el.style.setProperty('--uni-accent', p.accent);
            } else if (name === 'customchip' && typeof W.ccApplyStyle === 'function') {
                el = span('cc-chip cc-s' + (parseInt(p.style, 10) || 1), { spellcheck: 'false' }, inline(p.text || 'Text', { notes: {} }));
                if (p.color) el.style.setProperty('--cc', p.color);
                if (p.ink) el.style.setProperty('--cc-ink', p.ink);
            } else if (name === 'customcss' && typeof W.cscPaintChip === 'function') {
                el = span('bbcss-chip' + (p.id ? ' bbcss-' + p.id : ''), { spellcheck: 'false', 'data-bbcss-name': p.name, style: p.css }, inline(p.text || 'Text', { notes: {} }));
            } else if (name === 'jumper' && typeof W.jumperJumpToId === 'function') {
                el = span('jumper-anchor', { contenteditable: 'false', 'data-jumper-id': p.id || ('j' + Date.now().toString(36)), 'data-jumper-label': p.label || 'Jump', 'aria-hidden': 'true' }, '\u200B');
            }
        } catch (e) { el = null; }
        return el ? el.outerHTML : null;
    }
    const SKILL_NAMES = /^(beepbox|dice|capsule|timer|flashcard|sprite|unichip|customchip|customcss|jumper)$/;

    /* ---------- Exit Formatting: only the selected text (or the caret's spot) leaves its formatting ---------- */
    // The chip is split there, so the parts before and after keep their style, and you keep typing in plain text!
    const FMT_SEL = 'mark, span[class], span[style], b, strong, i, em, u, s, strike, code, font';
    function exitFormatting(canvas) {
        const sel = window.getSelection();
        if (!canvas || !sel || !sel.rangeCount) return false;
        const range = sel.getRangeAt(0);
        if (!canvas.contains(range.commonAncestorContainer)) return false;
        const lineOf = (n) => { let b = n.nodeType === 1 ? n : n.parentElement; while (b && b !== canvas && !LINE_BLOCK.test(b.tagName)) b = b.parentElement; return b || canvas; };
        const fmt = (el) => el && el.nodeType === 1 && el.matches(FMT_SEL) && !isProtected(el, canvas) && !el.classList.contains('kd-math') && !el.classList.contains('kd-tpl');
        const outermost = (node) => {
            const stop = lineOf(node);
            let top = null;
            for (let n = node.parentElement; n && n !== stop && n !== canvas; n = n.parentElement) if (fmt(n)) top = n;
            return top;
        };
        // split the formatting around a marker: everything after it moves into a copy of the chip, and the marker steps out between them
        const splitAt = (marker) => {
            const top = outermost(marker);
            if (!top) return false;
            const rest = document.createRange();
            rest.setStartAfter(marker);
            rest.setEnd(top, top.childNodes.length);
            const copy = top.cloneNode(false);
            copy.appendChild(rest.extractContents());
            top.after(copy);
            top.after(marker);
            [top, copy].forEach((el) => { if (!el.textContent.replace(/​/g, '') && !el.querySelector('img, br, [contenteditable="false"]')) el.remove(); });
            return true;
        };
        const mStart = document.createTextNode(''), mEnd = document.createTextNode('');
        const collapsed = range.collapsed;
        if (!collapsed) { const e = range.cloneRange(); e.collapse(false); e.insertNode(mEnd); }
        const st = range.cloneRange(); st.collapse(true); st.insertNode(mStart);
        let changed = false;
        if (collapsed) {
            changed = splitAt(mStart);
            if (!changed) { mStart.remove(); return false; }
            // a zero-width space holds the caret outside both halves, so typing is plain
            const hold = document.createTextNode('​');
            mStart.replaceWith(hold);
            const r = document.createRange();
            r.setStart(hold, 1); r.collapse(true);
            sel.removeAllRanges(); sel.addRange(r);
            return true;
        }
        changed = splitAt(mEnd) | splitAt(mStart);
        // now every formatting piece between the markers is fully selected: unwrap them (innermost first)
        const between = document.createRange();
        between.setStartAfter(mStart); between.setEndBefore(mEnd);
        const host = between.commonAncestorContainer.nodeType === 1 ? between.commonAncestorContainer : between.commonAncestorContainer.parentElement;
        Array.from(host.querySelectorAll(FMT_SEL)).filter((el) => fmt(el) && between.comparePoint(el, 0) === 0 && between.comparePoint(el, el.childNodes.length) === 0)
            .reverse().forEach((el) => { el.replaceWith(...el.childNodes); changed = true; });
        const r = document.createRange();
        r.setStartAfter(mStart); r.setEndBefore(mEnd);
        sel.removeAllRanges(); sel.addRange(r);
        const p1 = mStart.parentNode, p2 = mEnd.parentNode;
        mStart.remove(); mEnd.remove();
        if (p1) p1.normalize(); if (p2 && p2 !== p1) p2.normalize();
        return !!changed;
    }

    /* ---------- The Keydown Styles menu (Writeout and Bitbook's ribbon): every style, by category ---------- */
    const COLOR_WORD = { r: 'Red', o: 'Orange', gl: 'Gold', y: 'Yellow', l: 'Lime', g: 'Green', tu: 'Turquoise', t: 'Teal', c: 'Cyan', b: 'Blue', pr: 'Purple', pk: 'Pink',
        w: 'White', fg: 'Fog', sl: 'Slate', bk: 'Black', v: 'Violet', p: 'Pink', mg: 'Magenta', lm: 'Lime', aq: 'Aqua' };
    const NEEDS_TYPING = /^(applet-|aero-duplex|megachip-circuit-node|dev-chip-hex|av-chip-signal|jr-chip-voice-tag|jr-chip-wax-stamp|jr-progress-capsule|jr-dot-matrix|jr-latch-lock|reflected-text-block|kinetic-wave-text|header-|mega-header|bulleted-list|blockquote-list)/;
    function styleName(d) {
        const cls = d[3];
        const last = cls.split(/\s+/).pop();
        const color = (m) => m.charAt(0).toUpperCase() + m.slice(1);
        if (/^an-hl/.test(cls)) return color(cls.split(/\s+/)[1].slice(6));
        if (/^(gel-bubble-chip|gel-pill-chip|gel-flag-chip)/.test(cls)) return color(last.split('-').pop());
        if (/^aero-tag-chip/.test(cls)) return COLOR_WORD[last.replace('tag-chip-', '')] || last;
        if (/^gel-orb/.test(cls)) return COLOR_WORD[last.replace('gel-', '')] || last;
        const main = cls.split(/\s+/)[0].replace(/^(effect-|megachip-|gel-chip-|jr-chip-|jr-|dev-chip-|av-chip-|aero-)/, '').replace(/-/g, ' ');
        const variant = cls.split(/\s+/)[1];
        return color(main) + (variant && variant.split('-').pop() !== main.split(' ').pop() ? ' (' + variant.split('-').pop() + ')' : '');
    }
    function styleCategories() {
        const all = HIGHLIGHTS.concat(TRIGGERS).filter((d) => d[3] && !NEEDS_TYPING.test(d[3]) && d[0] !== '!#A#');
        const pick = (re) => all.filter((d) => re.test(d[3]));
        const cats = [
            ['Highlights', pick(/^an-hl an-hl-\w+$/)], ['Gel Underlines', pick(/an-s-ul$/)], ['Gel Strikes', pick(/an-s-st$/)],
            ['Bubble Chips', pick(/^gel-bubble-chip/)], ['Gloss Pills', pick(/^gel-pill-chip/)], ['Gel Flags', pick(/^gel-flag-chip/)], ['Tag Chips', pick(/^aero-tag-chip/)],
            ['Gel Orbs', pick(/^gel-orb/)], ['Text Effects', pick(/^(spark-text|gel-green-flash|liquid-underline|glossy-border-badge|cyber-glow-spark|liquid-text-glow|embossed-glass-text)$/)],
            ['Effects', pick(/^effect-/)], ['Megachips & Badges', pick(/^(megachip-|aero-glass-badge|gel-chip-|droplet-)/)], ['Dev & Journal', pick(/^(dev-|av-|jr-)/)],
        ];
        const ORDER = ['red', 'orange', 'gold', 'yellow', 'lime', 'green', 'turquoise', 'teal', 'cyan', 'blue', 'purple', 'pink', 'white', 'fog', 'slate', 'black'];
        return cats.filter((c) => c[1].length).map(([name, list]) => ({ name, styles: list.map((d) => ({ tag: d[2], cls: d[3], open: d[0], close: d[1], label: styleName(d) }))
            .sort((x, y) => { const a = ORDER.indexOf(x.label.toLowerCase()), b = ORDER.indexOf(y.label.toLowerCase()); return a >= 0 && b >= 0 ? a - b : 0; }) }));
    }
    // Wrap the selection (or drop a "Text" placeholder at the caret) in a style
    function applyStyle(range, tag, cls) {
        const sel = window.getSelection();
        const el = document.createElement(tag === 'span' || tag === 'mark' ? tag : tag || 'span');
        if (cls) el.className = cls;
        el.setAttribute('spellcheck', 'false');
        if (range.collapsed) el.textContent = 'Text'; else el.appendChild(range.extractContents());
        range.insertNode(el);
        const r = document.createRange();
        r.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(r);
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    }
    // The ribbon menu: categories first, then that category's styles drawn as live previews
    function styleMenu(OS, anchor, openPane) {
        const cv = document.getElementById('wysiwyg-canvas');
        const sel = window.getSelection();
        const saved = sel.rangeCount && cv && cv.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
        const showCat = (cat) => {
            const items = [{ header: cat.name + ' (' + cat.styles.length + ')' }];
            cat.styles.forEach((st) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'os-mitem kd-style-pick';
                b.title = st.open + 'text' + st.close;
                b.innerHTML = '<span class="os-mlabel"><' + (st.tag === 'mark' ? 'mark' : st.tag) + (st.cls ? ' class="' + st.cls + '"' : '') + '>' + esc(st.label) + '</' + (st.tag === 'mark' ? 'mark' : st.tag) + '></span><span class="os-mkbd">' + esc(st.open + '…' + st.close) + '</span>';
                b.addEventListener('mousedown', (e) => e.preventDefault());
                b.addEventListener('click', () => {
                    OS.closeMenu();
                    if (!saved) { OS.toast('Click in the page (or select some text) first, then pick a style!'); return; }
                    applyStyle(saved, st.tag, st.cls);
                });
                items.push({ node: b });
            });
            items.push({ sep: true }, { label: '← All categories', icon: 'chevLeft', run: () => setTimeout(() => OS.openMenu(anchor, cats(), { cls: 'kd-style-menu' }), 0) });
            setTimeout(() => OS.openMenu(anchor, items, { cls: 'kd-style-menu' }), 0);
        };
        const cats = () => styleCategories().map((c) => ({ label: c.name, hint: c.styles.length + ' styles', icon: 'sparkle', run: () => showCat(c) }))
            .concat(openPane ? [{ sep: true }, { label: 'Open the Format pane', icon: 'layout', run: () => openPane() }] : []);
        return cats();
    }

    // How OpenDB's pieces look inside Writeout and Bitbook's editor
    if (typeof document !== 'undefined' && document.head && !document.getElementById('kd-doc-style')) {
        const st = document.createElement('style');
        st.id = 'kd-doc-style';
        st.textContent = '.kd-tpl{display:inline-block;padding:0 6px;border-radius:999px;font-size:.8em;font-style:italic;background:rgba(56,189,248,.14);color:#0369a1;user-select:none}' +
            '.kd-tpl-block{display:block;margin:6px 0;padding:8px 12px;border-radius:10px;border-left:6px solid #f28500;background:#fff9f2;color:#5b3a00;font-style:normal;font-size:.95em}' +
            '.kd-figure{margin:10px 0;text-align:center}.kd-figure img,.kd-figure video{max-width:100%;border-radius:10px}.kd-figure audio{width:min(480px,100%)}.kd-style-menu{max-height:min(70vh,560px);overflow:auto}.kd-style-pick .os-mlabel{line-height:2}::highlight(kd-problem){background-color:rgba(239,68,68,.25);text-decoration:wavy underline #dc2626}.kd-figure figcaption{font-size:.85em;opacity:.75;margin-top:4px}';
        document.head.appendChild(st);
    }

    root.kdDoc = { parse, isKeydownText, formatLine, skillToText, skillHtml, exitFormatting, styleCategories, styleMenu, applyStyle, unformat, reformat, checkKeydown, blockFromLine, blockOf, textToHtml, htmlToText, toEditorHtml, toEntry, HL_COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
