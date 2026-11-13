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

    // Gel highlights, the Annotator's tools: #R#text## #R#text#_ #R#text#~, plus its Gel Box #R#text#=, Corner Brackets #R#text#] Gel Select #R#text#- and Color Ink #R(text), in its 13 colors!
    const HL_COLORS = [['R', 'red'], ['O', 'orange'], ['GL', 'gold'], ['Y', 'yellow'], ['L', 'lime'], ['G', 'green'], ['TU', 'turquoise'],
        ['T', 'teal'], ['C', 'cyan'], ['B', 'blue'], ['PR', 'purple'], ['PK', 'pink'], ['SL', 'slate']];
    const HL_STYLES = [['##', ''], ['#_', ' an-s-ul'], ['#~', ' an-s-st'], ['#=', ' an-s-bx'], ['#]', ' an-s-cb'], ['#-', ' an-s-sl'], ['#[', ' an-s-br'], ['#>', ' an-s-gu'], ['#[[', ' an-s-db']];
    const HIGHLIGHTS = [];
    HL_COLORS.forEach(([k, c]) => HL_STYLES.forEach(([close, s]) => HIGHLIGHTS.push(['#' + k + '#', close, 'mark', 'an-hl an-hl-' + c + s])));
    // Color Ink, the Annotator's Color Ink pen: #R(text) writes the words in the color (its text has no parentheses)!
    HL_COLORS.forEach(([k, c]) => HIGHLIGHTS.push(['#' + k + '(', ')', 'mark', 'an-hl an-hl-' + c + ' an-s-ink']));
    // every other Annotate style, by name: #R.halo(text)

    // Writeout's own trigger table: [open, close, tag, classes]
    const TRIGGERS = [
        ['=Y=','=Y=','span','gel-orb gel-y'], ['=R=','=R=','span','gel-orb gel-r'], ['=G=','=G=','span','gel-orb gel-g'], ['=C=','=C=','span','gel-orb gel-c'], ['=B=','=B=','span','gel-orb gel-b'], ['=V=','=V=','span','gel-orb gel-v'],
        ['=P=','=P=','span','gel-orb gel-p'], ['=O=','=O=','span','gel-orb gel-o'], ['=MG=','=MG=','span','gel-orb gel-mg'], ['=LM=','=LM=','span','gel-orb gel-lm'], ['=AQ=','=AQ=','span','gel-orb gel-aq'], ['=SL=','=SL=','span','gel-orb gel-sl'],
        ['&&','&&','span','spark-text'], ['&','&','span','sparklet-text'], ['*sp(',')','span','kd-spoiler'], ['~G~','~G~','span','gel-green-flash'], ['~U~','~U~','span','liquid-underline'], ['~B~','~B~','span','glossy-border-badge'], ['~S~','~S~','span','cyber-glow-spark'], ['~L~','~L~','span','liquid-text-glow'],
        ['~M~','~M~','span','reflected-text-block'], ['~E~','~E~','span','embossed-glass-text'], ['~W~','~W~','span','kinetic-wave-text'], ['`','`','code',''], ['**','**','strong',''], ['*','*','em',''],
        
        ['!#R#','#','span','aero-tag-chip tag-chip-r'], ['!#O#','#','span','aero-tag-chip tag-chip-o'], ['!#GL#','#','span','aero-tag-chip tag-chip-gl'], ['!#Y#','#','span','aero-tag-chip tag-chip-y'], ['!#L#','#','span','aero-tag-chip tag-chip-l'], ['!#G#','#','span','aero-tag-chip tag-chip-g'], ['!#TU#','#','span','aero-tag-chip tag-chip-tu'], ['!#T#','#','span','aero-tag-chip tag-chip-t'], ['!#C#','#','span','aero-tag-chip tag-chip-c'], ['!#B#','#','span','aero-tag-chip tag-chip-b'], ['!#PR#','#','span','aero-tag-chip tag-chip-pr'], ['!#PK#','#','span','aero-tag-chip tag-chip-pk'], ['!#W#','#','span','aero-tag-chip tag-chip-w'], ['!#FG#','#','span','aero-tag-chip tag-chip-fg'], ['!#SL#','#','span','aero-tag-chip tag-chip-sl'], ['!#BK#','#','span','aero-tag-chip tag-chip-bk'], ['!#A#','#','span','aero-tag-chip tag-chip-a'], ['#C#','#','span','gel-bubble-chip gel-chip-cyan'], ['#O#','#','span','gel-bubble-chip gel-chip-orange'], ['#G#','#','span','gel-bubble-chip gel-chip-green'], ['#R#','#','span','gel-bubble-chip gel-chip-red'],
        ['#PR#','#','span','gel-bubble-chip gel-chip-purple'], ['#PK#','#','span','gel-bubble-chip gel-chip-pink'], ['#Y#','#','span','gel-bubble-chip gel-chip-yellow'], ['#B#','#','span','gel-bubble-chip gel-chip-blue'], ['#L#','#','span','gel-bubble-chip gel-chip-lime'], ['#T#','#','span','gel-bubble-chip gel-chip-teal'],
        ['#GL#','#','span','gel-bubble-chip gel-chip-gold'], ['#SL#','#','span','gel-bubble-chip gel-chip-slate'], ['#W#','#','span','gel-bubble-chip gel-chip-white'], ['#BK#','#','span','gel-bubble-chip gel-chip-black'], ['#FG#','#','span','gel-bubble-chip gel-chip-fog'], ['#TU#','#','span','gel-bubble-chip gel-chip-turquoise'], ['#^R^','^','span','gel-tab-chip gel-tab-red'], ['#^O^','^','span','gel-tab-chip gel-tab-orange'], ['#^GL^','^','span','gel-tab-chip gel-tab-gold'], ['#^Y^','^','span','gel-tab-chip gel-tab-yellow'], ['#^L^','^','span','gel-tab-chip gel-tab-lime'], ['#^G^','^','span','gel-tab-chip gel-tab-green'], ['#^TU^','^','span','gel-tab-chip gel-tab-turquoise'], ['#^T^','^','span','gel-tab-chip gel-tab-teal'], ['#^C^','^','span','gel-tab-chip gel-tab-cyan'], ['#^B^','^','span','gel-tab-chip gel-tab-blue'], ['#^PR^','^','span','gel-tab-chip gel-tab-purple'], ['#^PK^','^','span','gel-tab-chip gel-tab-pink'], ['#^W^','^','span','gel-tab-chip gel-tab-white'], ['#^FG^','^','span','gel-tab-chip gel-tab-fog'], ['#^SL^','^','span','gel-tab-chip gel-tab-slate'], ['#^BK^','^','span','gel-tab-chip gel-tab-black'], ['#+R+','+','span','gel-drop-chip gel-drop-red'], ['#+O+','+','span','gel-drop-chip gel-drop-orange'], ['#+GL+','+','span','gel-drop-chip gel-drop-gold'], ['#+Y+','+','span','gel-drop-chip gel-drop-yellow'], ['#+L+','+','span','gel-drop-chip gel-drop-lime'], ['#+G+','+','span','gel-drop-chip gel-drop-green'], ['#+TU+','+','span','gel-drop-chip gel-drop-turquoise'], ['#+T+','+','span','gel-drop-chip gel-drop-teal'], ['#+C+','+','span','gel-drop-chip gel-drop-cyan'], ['#+B+','+','span','gel-drop-chip gel-drop-blue'], ['#+PR+','+','span','gel-drop-chip gel-drop-purple'], ['#+PK+','+','span','gel-drop-chip gel-drop-pink'], ['#+W+','+','span','gel-drop-chip gel-drop-white'], ['#+FG+','+','span','gel-drop-chip gel-drop-fog'], ['#+SL+','+','span','gel-drop-chip gel-drop-slate'], ['#+BK+','+','span','gel-drop-chip gel-drop-black'], ['#:R:',':','span','gel-split-chip gel-split-red'], ['#:O:',':','span','gel-split-chip gel-split-orange'], ['#:GL:',':','span','gel-split-chip gel-split-gold'], ['#:Y:',':','span','gel-split-chip gel-split-yellow'], ['#:L:',':','span','gel-split-chip gel-split-lime'], ['#:G:',':','span','gel-split-chip gel-split-green'], ['#:TU:',':','span','gel-split-chip gel-split-turquoise'], ['#:T:',':','span','gel-split-chip gel-split-teal'], ['#:C:',':','span','gel-split-chip gel-split-cyan'], ['#:B:',':','span','gel-split-chip gel-split-blue'], ['#:PR:',':','span','gel-split-chip gel-split-purple'], ['#:PK:',':','span','gel-split-chip gel-split-pink'], ['#:W:',':','span','gel-split-chip gel-split-white'], ['#:FG:',':','span','gel-split-chip gel-split-fog'], ['#:SL:',':','span','gel-split-chip gel-split-slate'], ['#:BK:',':','span','gel-split-chip gel-split-black'], ['#;R;',';','span','gel-lens-chip gel-lens-red'], ['#;O;',';','span','gel-lens-chip gel-lens-orange'], ['#;GL;',';','span','gel-lens-chip gel-lens-gold'], ['#;Y;',';','span','gel-lens-chip gel-lens-yellow'], ['#;L;',';','span','gel-lens-chip gel-lens-lime'], ['#;G;',';','span','gel-lens-chip gel-lens-green'], ['#;TU;',';','span','gel-lens-chip gel-lens-turquoise'], ['#;T;',';','span','gel-lens-chip gel-lens-teal'], ['#;C;',';','span','gel-lens-chip gel-lens-cyan'], ['#;B;',';','span','gel-lens-chip gel-lens-blue'], ['#;PR;',';','span','gel-lens-chip gel-lens-purple'], ['#;PK;',';','span','gel-lens-chip gel-lens-pink'], ['#;W;',';','span','gel-lens-chip gel-lens-white'], ['#;FG;',';','span','gel-lens-chip gel-lens-fog'], ['#;SL;',';','span','gel-lens-chip gel-lens-slate'], ['#;BK;',';','span','gel-lens-chip gel-lens-black'] ,['#/R/','/','span','jelly-chip jelly-red'] ,['#/O/','/','span','jelly-chip jelly-orange'] ,['#/GL/','/','span','jelly-chip jelly-gold'] ,['#/Y/','/','span','jelly-chip jelly-yellow'] ,['#/L/','/','span','jelly-chip jelly-lime'] ,['#/G/','/','span','jelly-chip jelly-green'] ,['#/TU/','/','span','jelly-chip jelly-turquoise'] ,['#/T/','/','span','jelly-chip jelly-teal'] ,['#/C/','/','span','jelly-chip jelly-cyan'] ,['#/B/','/','span','jelly-chip jelly-blue'] ,['#/PR/','/','span','jelly-chip jelly-purple'] ,['#/PK/','/','span','jelly-chip jelly-pink'] ,['#/W/','/','span','jelly-chip jelly-white'] ,['#/FG/','/','span','jelly-chip jelly-fog'] ,['#/SL/','/','span','jelly-chip jelly-slate'] ,['#/BK/','/','span','jelly-chip jelly-black'] ,['#&R&','&','span','gel-label-chip gel-label-red'] ,['#&O&','&','span','gel-label-chip gel-label-orange'] ,['#&GL&','&','span','gel-label-chip gel-label-gold'] ,['#&Y&','&','span','gel-label-chip gel-label-yellow'] ,['#&L&','&','span','gel-label-chip gel-label-lime'] ,['#&G&','&','span','gel-label-chip gel-label-green'] ,['#&TU&','&','span','gel-label-chip gel-label-turquoise'] ,['#&T&','&','span','gel-label-chip gel-label-teal'] ,['#&C&','&','span','gel-label-chip gel-label-cyan'] ,['#&B&','&','span','gel-label-chip gel-label-blue'] ,['#&PR&','&','span','gel-label-chip gel-label-purple'] ,['#&PK&','&','span','gel-label-chip gel-label-pink'] ,['#&W&','&','span','gel-label-chip gel-label-white'] ,['#&FG&','&','span','gel-label-chip gel-label-fog'] ,['#&SL&','&','span','gel-label-chip gel-label-slate'] ,['#&BK&','&','span','gel-label-chip gel-label-black'] ,['#@R@','@','span','gel-aqua-chip gel-aqua-red'] ,['#@O@','@','span','gel-aqua-chip gel-aqua-orange'] ,['#@GL@','@','span','gel-aqua-chip gel-aqua-gold'] ,['#@Y@','@','span','gel-aqua-chip gel-aqua-yellow'] ,['#@L@','@','span','gel-aqua-chip gel-aqua-lime'] ,['#@G@','@','span','gel-aqua-chip gel-aqua-green'] ,['#@TU@','@','span','gel-aqua-chip gel-aqua-turquoise'] ,['#@T@','@','span','gel-aqua-chip gel-aqua-teal'] ,['#@C@','@','span','gel-aqua-chip gel-aqua-cyan'] ,['#@B@','@','span','gel-aqua-chip gel-aqua-blue'] ,['#@PR@','@','span','gel-aqua-chip gel-aqua-purple'] ,['#@PK@','@','span','gel-aqua-chip gel-aqua-pink'] ,['#@W@','@','span','gel-aqua-chip gel-aqua-white'] ,['#@FG@','@','span','gel-aqua-chip gel-aqua-fog'] ,['#@SL@','@','span','gel-aqua-chip gel-aqua-slate'] ,['#@BK@','@','span','gel-aqua-chip gel-aqua-black'] ,['#?R?','?','span','gel-glaze-chip gel-glaze-red'] ,['#?O?','?','span','gel-glaze-chip gel-glaze-orange'] ,['#?GL?','?','span','gel-glaze-chip gel-glaze-gold'] ,['#?Y?','?','span','gel-glaze-chip gel-glaze-yellow'] ,['#?L?','?','span','gel-glaze-chip gel-glaze-lime'] ,['#?G?','?','span','gel-glaze-chip gel-glaze-green'] ,['#?TU?','?','span','gel-glaze-chip gel-glaze-turquoise'] ,['#?T?','?','span','gel-glaze-chip gel-glaze-teal'] ,['#?C?','?','span','gel-glaze-chip gel-glaze-cyan'] ,['#?B?','?','span','gel-glaze-chip gel-glaze-blue'] ,['#?PR?','?','span','gel-glaze-chip gel-glaze-purple'] ,['#?PK?','?','span','gel-glaze-chip gel-glaze-pink'] ,['#?W?','?','span','gel-glaze-chip gel-glaze-white'] ,['#?FG?','?','span','gel-glaze-chip gel-glaze-fog'] ,['#?SL?','?','span','gel-glaze-chip gel-glaze-slate'] ,['#?BK?','?','span','gel-glaze-chip gel-glaze-black'], ['%1%R%','%##','span','gel-sx-chip gel-sx-1 gel-sx-red'], ['%1%O%','%##','span','gel-sx-chip gel-sx-1 gel-sx-orange'], ['%1%GL%','%##','span','gel-sx-chip gel-sx-1 gel-sx-gold'], ['%1%Y%','%##','span','gel-sx-chip gel-sx-1 gel-sx-yellow'], ['%1%L%','%##','span','gel-sx-chip gel-sx-1 gel-sx-lime'], ['%1%G%','%##','span','gel-sx-chip gel-sx-1 gel-sx-green'], ['%1%TU%','%##','span','gel-sx-chip gel-sx-1 gel-sx-turquoise'], ['%1%T%','%##','span','gel-sx-chip gel-sx-1 gel-sx-teal'], ['%1%C%','%##','span','gel-sx-chip gel-sx-1 gel-sx-cyan'], ['%1%B%','%##','span','gel-sx-chip gel-sx-1 gel-sx-blue'], ['%1%PR%','%##','span','gel-sx-chip gel-sx-1 gel-sx-purple'], ['%1%PK%','%##','span','gel-sx-chip gel-sx-1 gel-sx-pink'], ['%1%W%','%##','span','gel-sx-chip gel-sx-1 gel-sx-white'], ['%1%FG%','%##','span','gel-sx-chip gel-sx-1 gel-sx-fog'], ['%1%SL%','%##','span','gel-sx-chip gel-sx-1 gel-sx-slate'], ['%1%BK%','%##','span','gel-sx-chip gel-sx-1 gel-sx-black'], ['%2%R%','%##','span','gel-sx-chip gel-sx-2 gel-sx-red'], ['%2%O%','%##','span','gel-sx-chip gel-sx-2 gel-sx-orange'], ['%2%GL%','%##','span','gel-sx-chip gel-sx-2 gel-sx-gold'], ['%2%Y%','%##','span','gel-sx-chip gel-sx-2 gel-sx-yellow'], ['%2%L%','%##','span','gel-sx-chip gel-sx-2 gel-sx-lime'], ['%2%G%','%##','span','gel-sx-chip gel-sx-2 gel-sx-green'], ['%2%TU%','%##','span','gel-sx-chip gel-sx-2 gel-sx-turquoise'], ['%2%T%','%##','span','gel-sx-chip gel-sx-2 gel-sx-teal'], ['%2%C%','%##','span','gel-sx-chip gel-sx-2 gel-sx-cyan'], ['%2%B%','%##','span','gel-sx-chip gel-sx-2 gel-sx-blue'], ['%2%PR%','%##','span','gel-sx-chip gel-sx-2 gel-sx-purple'], ['%2%PK%','%##','span','gel-sx-chip gel-sx-2 gel-sx-pink'], ['%2%W%','%##','span','gel-sx-chip gel-sx-2 gel-sx-white'], ['%2%FG%','%##','span','gel-sx-chip gel-sx-2 gel-sx-fog'], ['%2%SL%','%##','span','gel-sx-chip gel-sx-2 gel-sx-slate'], ['%2%BK%','%##','span','gel-sx-chip gel-sx-2 gel-sx-black'], ['%3%R%','%##','span','gel-sx-chip gel-sx-3 gel-sx-red'], ['%3%O%','%##','span','gel-sx-chip gel-sx-3 gel-sx-orange'], ['%3%GL%','%##','span','gel-sx-chip gel-sx-3 gel-sx-gold'], ['%3%Y%','%##','span','gel-sx-chip gel-sx-3 gel-sx-yellow'], ['%3%L%','%##','span','gel-sx-chip gel-sx-3 gel-sx-lime'], ['%3%G%','%##','span','gel-sx-chip gel-sx-3 gel-sx-green'], ['%3%TU%','%##','span','gel-sx-chip gel-sx-3 gel-sx-turquoise'], ['%3%T%','%##','span','gel-sx-chip gel-sx-3 gel-sx-teal'], ['%3%C%','%##','span','gel-sx-chip gel-sx-3 gel-sx-cyan'], ['%3%B%','%##','span','gel-sx-chip gel-sx-3 gel-sx-blue'], ['%3%PR%','%##','span','gel-sx-chip gel-sx-3 gel-sx-purple'], ['%3%PK%','%##','span','gel-sx-chip gel-sx-3 gel-sx-pink'], ['%3%W%','%##','span','gel-sx-chip gel-sx-3 gel-sx-white'], ['%3%FG%','%##','span','gel-sx-chip gel-sx-3 gel-sx-fog'], ['%3%SL%','%##','span','gel-sx-chip gel-sx-3 gel-sx-slate'], ['%3%BK%','%##','span','gel-sx-chip gel-sx-3 gel-sx-black'], ['%4%R%','%##','span','gel-sx-chip gel-sx-4 gel-sx-red'], ['%4%O%','%##','span','gel-sx-chip gel-sx-4 gel-sx-orange'], ['%4%GL%','%##','span','gel-sx-chip gel-sx-4 gel-sx-gold'], ['%4%Y%','%##','span','gel-sx-chip gel-sx-4 gel-sx-yellow'], ['%4%L%','%##','span','gel-sx-chip gel-sx-4 gel-sx-lime'], ['%4%G%','%##','span','gel-sx-chip gel-sx-4 gel-sx-green'], ['%4%TU%','%##','span','gel-sx-chip gel-sx-4 gel-sx-turquoise'], ['%4%T%','%##','span','gel-sx-chip gel-sx-4 gel-sx-teal'], ['%4%C%','%##','span','gel-sx-chip gel-sx-4 gel-sx-cyan'], ['%4%B%','%##','span','gel-sx-chip gel-sx-4 gel-sx-blue'], ['%4%PR%','%##','span','gel-sx-chip gel-sx-4 gel-sx-purple'], ['%4%PK%','%##','span','gel-sx-chip gel-sx-4 gel-sx-pink'], ['%4%W%','%##','span','gel-sx-chip gel-sx-4 gel-sx-white'], ['%4%FG%','%##','span','gel-sx-chip gel-sx-4 gel-sx-fog'], ['%4%SL%','%##','span','gel-sx-chip gel-sx-4 gel-sx-slate'], ['%4%BK%','%##','span','gel-sx-chip gel-sx-4 gel-sx-black'], ['%5%R%','%##','span','gel-sx-chip gel-sx-5 gel-sx-red'], ['%5%O%','%##','span','gel-sx-chip gel-sx-5 gel-sx-orange'], ['%5%GL%','%##','span','gel-sx-chip gel-sx-5 gel-sx-gold'], ['%5%Y%','%##','span','gel-sx-chip gel-sx-5 gel-sx-yellow'], ['%5%L%','%##','span','gel-sx-chip gel-sx-5 gel-sx-lime'], ['%5%G%','%##','span','gel-sx-chip gel-sx-5 gel-sx-green'], ['%5%TU%','%##','span','gel-sx-chip gel-sx-5 gel-sx-turquoise'], ['%5%T%','%##','span','gel-sx-chip gel-sx-5 gel-sx-teal'], ['%5%C%','%##','span','gel-sx-chip gel-sx-5 gel-sx-cyan'], ['%5%B%','%##','span','gel-sx-chip gel-sx-5 gel-sx-blue'], ['%5%PR%','%##','span','gel-sx-chip gel-sx-5 gel-sx-purple'], ['%5%PK%','%##','span','gel-sx-chip gel-sx-5 gel-sx-pink'], ['%5%W%','%##','span','gel-sx-chip gel-sx-5 gel-sx-white'], ['%5%FG%','%##','span','gel-sx-chip gel-sx-5 gel-sx-fog'], ['%5%SL%','%##','span','gel-sx-chip gel-sx-5 gel-sx-slate'], ['%5%BK%','%##','span','gel-sx-chip gel-sx-5 gel-sx-black'], ['%6%R%','%##','span','gel-sx-chip gel-sx-6 gel-sx-red'], ['%6%O%','%##','span','gel-sx-chip gel-sx-6 gel-sx-orange'], ['%6%GL%','%##','span','gel-sx-chip gel-sx-6 gel-sx-gold'], ['%6%Y%','%##','span','gel-sx-chip gel-sx-6 gel-sx-yellow'], ['%6%L%','%##','span','gel-sx-chip gel-sx-6 gel-sx-lime'], ['%6%G%','%##','span','gel-sx-chip gel-sx-6 gel-sx-green'], ['%6%TU%','%##','span','gel-sx-chip gel-sx-6 gel-sx-turquoise'], ['%6%T%','%##','span','gel-sx-chip gel-sx-6 gel-sx-teal'], ['%6%C%','%##','span','gel-sx-chip gel-sx-6 gel-sx-cyan'], ['%6%B%','%##','span','gel-sx-chip gel-sx-6 gel-sx-blue'], ['%6%PR%','%##','span','gel-sx-chip gel-sx-6 gel-sx-purple'], ['%6%PK%','%##','span','gel-sx-chip gel-sx-6 gel-sx-pink'], ['%6%W%','%##','span','gel-sx-chip gel-sx-6 gel-sx-white'], ['%6%FG%','%##','span','gel-sx-chip gel-sx-6 gel-sx-fog'], ['%6%SL%','%##','span','gel-sx-chip gel-sx-6 gel-sx-slate'], ['%6%BK%','%##','span','gel-sx-chip gel-sx-6 gel-sx-black'], ['%7%R%','%##','span','gel-sx-chip gel-sx-7 gel-sx-red'], ['%7%O%','%##','span','gel-sx-chip gel-sx-7 gel-sx-orange'], ['%7%GL%','%##','span','gel-sx-chip gel-sx-7 gel-sx-gold'], ['%7%Y%','%##','span','gel-sx-chip gel-sx-7 gel-sx-yellow'], ['%7%L%','%##','span','gel-sx-chip gel-sx-7 gel-sx-lime'], ['%7%G%','%##','span','gel-sx-chip gel-sx-7 gel-sx-green'], ['%7%TU%','%##','span','gel-sx-chip gel-sx-7 gel-sx-turquoise'], ['%7%T%','%##','span','gel-sx-chip gel-sx-7 gel-sx-teal'], ['%7%C%','%##','span','gel-sx-chip gel-sx-7 gel-sx-cyan'], ['%7%B%','%##','span','gel-sx-chip gel-sx-7 gel-sx-blue'], ['%7%PR%','%##','span','gel-sx-chip gel-sx-7 gel-sx-purple'], ['%7%PK%','%##','span','gel-sx-chip gel-sx-7 gel-sx-pink'], ['%7%W%','%##','span','gel-sx-chip gel-sx-7 gel-sx-white'], ['%7%FG%','%##','span','gel-sx-chip gel-sx-7 gel-sx-fog'], ['%7%SL%','%##','span','gel-sx-chip gel-sx-7 gel-sx-slate'], ['%7%BK%','%##','span','gel-sx-chip gel-sx-7 gel-sx-black'], ['%8%R%','%##','span','gel-sx-chip gel-sx-8 gel-sx-red'], ['%8%O%','%##','span','gel-sx-chip gel-sx-8 gel-sx-orange'], ['%8%GL%','%##','span','gel-sx-chip gel-sx-8 gel-sx-gold'], ['%8%Y%','%##','span','gel-sx-chip gel-sx-8 gel-sx-yellow'], ['%8%L%','%##','span','gel-sx-chip gel-sx-8 gel-sx-lime'], ['%8%G%','%##','span','gel-sx-chip gel-sx-8 gel-sx-green'], ['%8%TU%','%##','span','gel-sx-chip gel-sx-8 gel-sx-turquoise'], ['%8%T%','%##','span','gel-sx-chip gel-sx-8 gel-sx-teal'], ['%8%C%','%##','span','gel-sx-chip gel-sx-8 gel-sx-cyan'], ['%8%B%','%##','span','gel-sx-chip gel-sx-8 gel-sx-blue'], ['%8%PR%','%##','span','gel-sx-chip gel-sx-8 gel-sx-purple'], ['%8%PK%','%##','span','gel-sx-chip gel-sx-8 gel-sx-pink'], ['%8%W%','%##','span','gel-sx-chip gel-sx-8 gel-sx-white'], ['%8%FG%','%##','span','gel-sx-chip gel-sx-8 gel-sx-fog'], ['%8%SL%','%##','span','gel-sx-chip gel-sx-8 gel-sx-slate'], ['%8%BK%','%##','span','gel-sx-chip gel-sx-8 gel-sx-black'], ['%9%R%','%##','span','gel-sx-chip gel-sx-9 gel-sx-red'], ['%9%O%','%##','span','gel-sx-chip gel-sx-9 gel-sx-orange'], ['%9%GL%','%##','span','gel-sx-chip gel-sx-9 gel-sx-gold'], ['%9%Y%','%##','span','gel-sx-chip gel-sx-9 gel-sx-yellow'], ['%9%L%','%##','span','gel-sx-chip gel-sx-9 gel-sx-lime'], ['%9%G%','%##','span','gel-sx-chip gel-sx-9 gel-sx-green'], ['%9%TU%','%##','span','gel-sx-chip gel-sx-9 gel-sx-turquoise'], ['%9%T%','%##','span','gel-sx-chip gel-sx-9 gel-sx-teal'], ['%9%C%','%##','span','gel-sx-chip gel-sx-9 gel-sx-cyan'], ['%9%B%','%##','span','gel-sx-chip gel-sx-9 gel-sx-blue'], ['%9%PR%','%##','span','gel-sx-chip gel-sx-9 gel-sx-purple'], ['%9%PK%','%##','span','gel-sx-chip gel-sx-9 gel-sx-pink'], ['%9%W%','%##','span','gel-sx-chip gel-sx-9 gel-sx-white'], ['%9%FG%','%##','span','gel-sx-chip gel-sx-9 gel-sx-fog'], ['%9%SL%','%##','span','gel-sx-chip gel-sx-9 gel-sx-slate'], ['%9%BK%','%##','span','gel-sx-chip gel-sx-9 gel-sx-black'], ['%10%R%','%##','span','gel-sx-chip gel-sx-10 gel-sx-red'], ['%10%O%','%##','span','gel-sx-chip gel-sx-10 gel-sx-orange'], ['%10%GL%','%##','span','gel-sx-chip gel-sx-10 gel-sx-gold'], ['%10%Y%','%##','span','gel-sx-chip gel-sx-10 gel-sx-yellow'], ['%10%L%','%##','span','gel-sx-chip gel-sx-10 gel-sx-lime'], ['%10%G%','%##','span','gel-sx-chip gel-sx-10 gel-sx-green'], ['%10%TU%','%##','span','gel-sx-chip gel-sx-10 gel-sx-turquoise'], ['%10%T%','%##','span','gel-sx-chip gel-sx-10 gel-sx-teal'], ['%10%C%','%##','span','gel-sx-chip gel-sx-10 gel-sx-cyan'], ['%10%B%','%##','span','gel-sx-chip gel-sx-10 gel-sx-blue'], ['%10%PR%','%##','span','gel-sx-chip gel-sx-10 gel-sx-purple'], ['%10%PK%','%##','span','gel-sx-chip gel-sx-10 gel-sx-pink'], ['%10%W%','%##','span','gel-sx-chip gel-sx-10 gel-sx-white'], ['%10%FG%','%##','span','gel-sx-chip gel-sx-10 gel-sx-fog'], ['%10%SL%','%##','span','gel-sx-chip gel-sx-10 gel-sx-slate'], ['%10%BK%','%##','span','gel-sx-chip gel-sx-10 gel-sx-black'], ['%11%R%','%##','span','gel-sx-chip gel-sx-11 gel-sx-red'], ['%11%O%','%##','span','gel-sx-chip gel-sx-11 gel-sx-orange'], ['%11%GL%','%##','span','gel-sx-chip gel-sx-11 gel-sx-gold'], ['%11%Y%','%##','span','gel-sx-chip gel-sx-11 gel-sx-yellow'], ['%11%L%','%##','span','gel-sx-chip gel-sx-11 gel-sx-lime'], ['%11%G%','%##','span','gel-sx-chip gel-sx-11 gel-sx-green'], ['%11%TU%','%##','span','gel-sx-chip gel-sx-11 gel-sx-turquoise'], ['%11%T%','%##','span','gel-sx-chip gel-sx-11 gel-sx-teal'], ['%11%C%','%##','span','gel-sx-chip gel-sx-11 gel-sx-cyan'], ['%11%B%','%##','span','gel-sx-chip gel-sx-11 gel-sx-blue'], ['%11%PR%','%##','span','gel-sx-chip gel-sx-11 gel-sx-purple'], ['%11%PK%','%##','span','gel-sx-chip gel-sx-11 gel-sx-pink'], ['%11%W%','%##','span','gel-sx-chip gel-sx-11 gel-sx-white'], ['%11%FG%','%##','span','gel-sx-chip gel-sx-11 gel-sx-fog'], ['%11%SL%','%##','span','gel-sx-chip gel-sx-11 gel-sx-slate'], ['%11%BK%','%##','span','gel-sx-chip gel-sx-11 gel-sx-black'], ['%12%R%','%##','span','gel-sx-chip gel-sx-12 gel-sx-red'], ['%12%O%','%##','span','gel-sx-chip gel-sx-12 gel-sx-orange'], ['%12%GL%','%##','span','gel-sx-chip gel-sx-12 gel-sx-gold'], ['%12%Y%','%##','span','gel-sx-chip gel-sx-12 gel-sx-yellow'], ['%12%L%','%##','span','gel-sx-chip gel-sx-12 gel-sx-lime'], ['%12%G%','%##','span','gel-sx-chip gel-sx-12 gel-sx-green'], ['%12%TU%','%##','span','gel-sx-chip gel-sx-12 gel-sx-turquoise'], ['%12%T%','%##','span','gel-sx-chip gel-sx-12 gel-sx-teal'], ['%12%C%','%##','span','gel-sx-chip gel-sx-12 gel-sx-cyan'], ['%12%B%','%##','span','gel-sx-chip gel-sx-12 gel-sx-blue'], ['%12%PR%','%##','span','gel-sx-chip gel-sx-12 gel-sx-purple'], ['%12%PK%','%##','span','gel-sx-chip gel-sx-12 gel-sx-pink'], ['%12%W%','%##','span','gel-sx-chip gel-sx-12 gel-sx-white'], ['%12%FG%','%##','span','gel-sx-chip gel-sx-12 gel-sx-fog'], ['%12%SL%','%##','span','gel-sx-chip gel-sx-12 gel-sx-slate'], ['%12%BK%','%##','span','gel-sx-chip gel-sx-12 gel-sx-black'], ['%13%R%','%##','span','gel-sx-chip gel-sx-13 gel-sx-red'], ['%13%O%','%##','span','gel-sx-chip gel-sx-13 gel-sx-orange'], ['%13%GL%','%##','span','gel-sx-chip gel-sx-13 gel-sx-gold'], ['%13%Y%','%##','span','gel-sx-chip gel-sx-13 gel-sx-yellow'], ['%13%L%','%##','span','gel-sx-chip gel-sx-13 gel-sx-lime'], ['%13%G%','%##','span','gel-sx-chip gel-sx-13 gel-sx-green'], ['%13%TU%','%##','span','gel-sx-chip gel-sx-13 gel-sx-turquoise'], ['%13%T%','%##','span','gel-sx-chip gel-sx-13 gel-sx-teal'], ['%13%C%','%##','span','gel-sx-chip gel-sx-13 gel-sx-cyan'], ['%13%B%','%##','span','gel-sx-chip gel-sx-13 gel-sx-blue'], ['%13%PR%','%##','span','gel-sx-chip gel-sx-13 gel-sx-purple'], ['%13%PK%','%##','span','gel-sx-chip gel-sx-13 gel-sx-pink'], ['%13%W%','%##','span','gel-sx-chip gel-sx-13 gel-sx-white'], ['%13%FG%','%##','span','gel-sx-chip gel-sx-13 gel-sx-fog'], ['%13%SL%','%##','span','gel-sx-chip gel-sx-13 gel-sx-slate'], ['%13%BK%','%##','span','gel-sx-chip gel-sx-13 gel-sx-black'], ['%14%R%','%##','span','gel-sx-chip gel-sx-14 gel-sx-red'], ['%14%O%','%##','span','gel-sx-chip gel-sx-14 gel-sx-orange'], ['%14%GL%','%##','span','gel-sx-chip gel-sx-14 gel-sx-gold'], ['%14%Y%','%##','span','gel-sx-chip gel-sx-14 gel-sx-yellow'], ['%14%L%','%##','span','gel-sx-chip gel-sx-14 gel-sx-lime'], ['%14%G%','%##','span','gel-sx-chip gel-sx-14 gel-sx-green'], ['%14%TU%','%##','span','gel-sx-chip gel-sx-14 gel-sx-turquoise'], ['%14%T%','%##','span','gel-sx-chip gel-sx-14 gel-sx-teal'], ['%14%C%','%##','span','gel-sx-chip gel-sx-14 gel-sx-cyan'], ['%14%B%','%##','span','gel-sx-chip gel-sx-14 gel-sx-blue'], ['%14%PR%','%##','span','gel-sx-chip gel-sx-14 gel-sx-purple'], ['%14%PK%','%##','span','gel-sx-chip gel-sx-14 gel-sx-pink'], ['%14%W%','%##','span','gel-sx-chip gel-sx-14 gel-sx-white'], ['%14%FG%','%##','span','gel-sx-chip gel-sx-14 gel-sx-fog'], ['%14%SL%','%##','span','gel-sx-chip gel-sx-14 gel-sx-slate'], ['%14%BK%','%##','span','gel-sx-chip gel-sx-14 gel-sx-black'], ['%15%R%','%##','span','gel-sx-chip gel-sx-15 gel-sx-red'], ['%15%O%','%##','span','gel-sx-chip gel-sx-15 gel-sx-orange'], ['%15%GL%','%##','span','gel-sx-chip gel-sx-15 gel-sx-gold'], ['%15%Y%','%##','span','gel-sx-chip gel-sx-15 gel-sx-yellow'], ['%15%L%','%##','span','gel-sx-chip gel-sx-15 gel-sx-lime'], ['%15%G%','%##','span','gel-sx-chip gel-sx-15 gel-sx-green'], ['%15%TU%','%##','span','gel-sx-chip gel-sx-15 gel-sx-turquoise'], ['%15%T%','%##','span','gel-sx-chip gel-sx-15 gel-sx-teal'], ['%15%C%','%##','span','gel-sx-chip gel-sx-15 gel-sx-cyan'], ['%15%B%','%##','span','gel-sx-chip gel-sx-15 gel-sx-blue'], ['%15%PR%','%##','span','gel-sx-chip gel-sx-15 gel-sx-purple'], ['%15%PK%','%##','span','gel-sx-chip gel-sx-15 gel-sx-pink'], ['%15%W%','%##','span','gel-sx-chip gel-sx-15 gel-sx-white'], ['%15%FG%','%##','span','gel-sx-chip gel-sx-15 gel-sx-fog'], ['%15%SL%','%##','span','gel-sx-chip gel-sx-15 gel-sx-slate'], ['%15%BK%','%##','span','gel-sx-chip gel-sx-15 gel-sx-black'], ['%16%R%','%##','span','gel-sx-chip gel-sx-16 gel-sx-red'], ['%16%O%','%##','span','gel-sx-chip gel-sx-16 gel-sx-orange'], ['%16%GL%','%##','span','gel-sx-chip gel-sx-16 gel-sx-gold'], ['%16%Y%','%##','span','gel-sx-chip gel-sx-16 gel-sx-yellow'], ['%16%L%','%##','span','gel-sx-chip gel-sx-16 gel-sx-lime'], ['%16%G%','%##','span','gel-sx-chip gel-sx-16 gel-sx-green'], ['%16%TU%','%##','span','gel-sx-chip gel-sx-16 gel-sx-turquoise'], ['%16%T%','%##','span','gel-sx-chip gel-sx-16 gel-sx-teal'], ['%16%C%','%##','span','gel-sx-chip gel-sx-16 gel-sx-cyan'], ['%16%B%','%##','span','gel-sx-chip gel-sx-16 gel-sx-blue'], ['%16%PR%','%##','span','gel-sx-chip gel-sx-16 gel-sx-purple'], ['%16%PK%','%##','span','gel-sx-chip gel-sx-16 gel-sx-pink'], ['%16%W%','%##','span','gel-sx-chip gel-sx-16 gel-sx-white'], ['%16%FG%','%##','span','gel-sx-chip gel-sx-16 gel-sx-fog'], ['%16%SL%','%##','span','gel-sx-chip gel-sx-16 gel-sx-slate'], ['%16%BK%','%##','span','gel-sx-chip gel-sx-16 gel-sx-black'], ['%17%R%','%##','span','gel-sx-chip gel-sx-17 gel-sx-red'], ['%17%O%','%##','span','gel-sx-chip gel-sx-17 gel-sx-orange'], ['%17%GL%','%##','span','gel-sx-chip gel-sx-17 gel-sx-gold'], ['%17%Y%','%##','span','gel-sx-chip gel-sx-17 gel-sx-yellow'], ['%17%L%','%##','span','gel-sx-chip gel-sx-17 gel-sx-lime'], ['%17%G%','%##','span','gel-sx-chip gel-sx-17 gel-sx-green'], ['%17%TU%','%##','span','gel-sx-chip gel-sx-17 gel-sx-turquoise'], ['%17%T%','%##','span','gel-sx-chip gel-sx-17 gel-sx-teal'], ['%17%C%','%##','span','gel-sx-chip gel-sx-17 gel-sx-cyan'], ['%17%B%','%##','span','gel-sx-chip gel-sx-17 gel-sx-blue'], ['%17%PR%','%##','span','gel-sx-chip gel-sx-17 gel-sx-purple'], ['%17%PK%','%##','span','gel-sx-chip gel-sx-17 gel-sx-pink'], ['%17%W%','%##','span','gel-sx-chip gel-sx-17 gel-sx-white'], ['%17%FG%','%##','span','gel-sx-chip gel-sx-17 gel-sx-fog'], ['%17%SL%','%##','span','gel-sx-chip gel-sx-17 gel-sx-slate'], ['%17%BK%','%##','span','gel-sx-chip gel-sx-17 gel-sx-black'], ['%18%R%','%##','span','gel-sx-chip gel-sx-18 gel-sx-red'], ['%18%O%','%##','span','gel-sx-chip gel-sx-18 gel-sx-orange'], ['%18%GL%','%##','span','gel-sx-chip gel-sx-18 gel-sx-gold'], ['%18%Y%','%##','span','gel-sx-chip gel-sx-18 gel-sx-yellow'], ['%18%L%','%##','span','gel-sx-chip gel-sx-18 gel-sx-lime'], ['%18%G%','%##','span','gel-sx-chip gel-sx-18 gel-sx-green'], ['%18%TU%','%##','span','gel-sx-chip gel-sx-18 gel-sx-turquoise'], ['%18%T%','%##','span','gel-sx-chip gel-sx-18 gel-sx-teal'], ['%18%C%','%##','span','gel-sx-chip gel-sx-18 gel-sx-cyan'], ['%18%B%','%##','span','gel-sx-chip gel-sx-18 gel-sx-blue'], ['%18%PR%','%##','span','gel-sx-chip gel-sx-18 gel-sx-purple'], ['%18%PK%','%##','span','gel-sx-chip gel-sx-18 gel-sx-pink'], ['%18%W%','%##','span','gel-sx-chip gel-sx-18 gel-sx-white'], ['%18%FG%','%##','span','gel-sx-chip gel-sx-18 gel-sx-fog'], ['%18%SL%','%##','span','gel-sx-chip gel-sx-18 gel-sx-slate'], ['%18%BK%','%##','span','gel-sx-chip gel-sx-18 gel-sx-black'], ['%19%R%','%##','span','gel-sx-chip gel-sx-19 gel-sx-red'], ['%19%O%','%##','span','gel-sx-chip gel-sx-19 gel-sx-orange'], ['%19%GL%','%##','span','gel-sx-chip gel-sx-19 gel-sx-gold'], ['%19%Y%','%##','span','gel-sx-chip gel-sx-19 gel-sx-yellow'], ['%19%L%','%##','span','gel-sx-chip gel-sx-19 gel-sx-lime'], ['%19%G%','%##','span','gel-sx-chip gel-sx-19 gel-sx-green'], ['%19%TU%','%##','span','gel-sx-chip gel-sx-19 gel-sx-turquoise'], ['%19%T%','%##','span','gel-sx-chip gel-sx-19 gel-sx-teal'], ['%19%C%','%##','span','gel-sx-chip gel-sx-19 gel-sx-cyan'], ['%19%B%','%##','span','gel-sx-chip gel-sx-19 gel-sx-blue'], ['%19%PR%','%##','span','gel-sx-chip gel-sx-19 gel-sx-purple'], ['%19%PK%','%##','span','gel-sx-chip gel-sx-19 gel-sx-pink'], ['%19%W%','%##','span','gel-sx-chip gel-sx-19 gel-sx-white'], ['%19%FG%','%##','span','gel-sx-chip gel-sx-19 gel-sx-fog'], ['%19%SL%','%##','span','gel-sx-chip gel-sx-19 gel-sx-slate'], ['%19%BK%','%##','span','gel-sx-chip gel-sx-19 gel-sx-black'], ['%20%R%','%##','span','gel-sx-chip gel-sx-20 gel-sx-red'], ['%20%O%','%##','span','gel-sx-chip gel-sx-20 gel-sx-orange'], ['%20%GL%','%##','span','gel-sx-chip gel-sx-20 gel-sx-gold'], ['%20%Y%','%##','span','gel-sx-chip gel-sx-20 gel-sx-yellow'], ['%20%L%','%##','span','gel-sx-chip gel-sx-20 gel-sx-lime'], ['%20%G%','%##','span','gel-sx-chip gel-sx-20 gel-sx-green'], ['%20%TU%','%##','span','gel-sx-chip gel-sx-20 gel-sx-turquoise'], ['%20%T%','%##','span','gel-sx-chip gel-sx-20 gel-sx-teal'], ['%20%C%','%##','span','gel-sx-chip gel-sx-20 gel-sx-cyan'], ['%20%B%','%##','span','gel-sx-chip gel-sx-20 gel-sx-blue'], ['%20%PR%','%##','span','gel-sx-chip gel-sx-20 gel-sx-purple'], ['%20%PK%','%##','span','gel-sx-chip gel-sx-20 gel-sx-pink'], ['%20%W%','%##','span','gel-sx-chip gel-sx-20 gel-sx-white'], ['%20%FG%','%##','span','gel-sx-chip gel-sx-20 gel-sx-fog'], ['%20%SL%','%##','span','gel-sx-chip gel-sx-20 gel-sx-slate'], ['%20%BK%','%##','span','gel-sx-chip gel-sx-20 gel-sx-black'], ['^^R^','^^','span','gel-speech-chip gel-speech-red'], ['^^O^','^^','span','gel-speech-chip gel-speech-orange'], ['^^GL^','^^','span','gel-speech-chip gel-speech-gold'], ['^^Y^','^^','span','gel-speech-chip gel-speech-yellow'], ['^^L^','^^','span','gel-speech-chip gel-speech-lime'], ['^^G^','^^','span','gel-speech-chip gel-speech-green'], ['^^TU^','^^','span','gel-speech-chip gel-speech-turquoise'], ['^^T^','^^','span','gel-speech-chip gel-speech-teal'], ['^^C^','^^','span','gel-speech-chip gel-speech-cyan'], ['^^B^','^^','span','gel-speech-chip gel-speech-blue'], ['^^PR^','^^','span','gel-speech-chip gel-speech-purple'], ['^^PK^','^^','span','gel-speech-chip gel-speech-pink'], ['^^W^','^^','span','gel-speech-chip gel-speech-white'], ['^^FG^','^^','span','gel-speech-chip gel-speech-fog'], ['^^SL^','^^','span','gel-speech-chip gel-speech-slate'], ['^^BK^','^^','span','gel-speech-chip gel-speech-black'], ['=+Y+=','=+Y+=','span','gel-beacon-chip gel-beacon-y'], ['=+R+=','=+R+=','span','gel-beacon-chip gel-beacon-r'], ['=+G+=','=+G+=','span','gel-beacon-chip gel-beacon-g'], ['=+C+=','=+C+=','span','gel-beacon-chip gel-beacon-c'], ['=+B+=','=+B+=','span','gel-beacon-chip gel-beacon-b'], ['=+V+=','=+V+=','span','gel-beacon-chip gel-beacon-v'], ['=+P+=','=+P+=','span','gel-beacon-chip gel-beacon-p'], ['=+O+=','=+O+=','span','gel-beacon-chip gel-beacon-o'], ['=+MG+=','=+MG+=','span','gel-beacon-chip gel-beacon-mg'], ['=+LM+=','=+LM+=','span','gel-beacon-chip gel-beacon-lm'], ['=+AQ+=','=+AQ+=','span','gel-beacon-chip gel-beacon-aq'], ['=+SL+=','=+SL+=','span','gel-beacon-chip gel-beacon-sl'], ['!!R!','!!','span','gel-ticket-chip gel-ticket-red'], ['!!O!','!!','span','gel-ticket-chip gel-ticket-orange'], ['!!GL!','!!','span','gel-ticket-chip gel-ticket-gold'], ['!!Y!','!!','span','gel-ticket-chip gel-ticket-yellow'], ['!!L!','!!','span','gel-ticket-chip gel-ticket-lime'], ['!!G!','!!','span','gel-ticket-chip gel-ticket-green'], ['!!TU!','!!','span','gel-ticket-chip gel-ticket-turquoise'], ['!!T!','!!','span','gel-ticket-chip gel-ticket-teal'], ['!!C!','!!','span','gel-ticket-chip gel-ticket-cyan'], ['!!B!','!!','span','gel-ticket-chip gel-ticket-blue'], ['!!PR!','!!','span','gel-ticket-chip gel-ticket-purple'], ['!!PK!','!!','span','gel-ticket-chip gel-ticket-pink'], ['!!W!','!!','span','gel-ticket-chip gel-ticket-white'], ['!!FG!','!!','span','gel-ticket-chip gel-ticket-fog'], ['!!SL!','!!','span','gel-ticket-chip gel-ticket-slate'], ['!!BK!','!!','span','gel-ticket-chip gel-ticket-black'], ['??R?','??','span','gel-arrow-chip gel-arrow-red'], ['??O?','??','span','gel-arrow-chip gel-arrow-orange'], ['??GL?','??','span','gel-arrow-chip gel-arrow-gold'], ['??Y?','??','span','gel-arrow-chip gel-arrow-yellow'], ['??L?','??','span','gel-arrow-chip gel-arrow-lime'], ['??G?','??','span','gel-arrow-chip gel-arrow-green'], ['??TU?','??','span','gel-arrow-chip gel-arrow-turquoise'], ['??T?','??','span','gel-arrow-chip gel-arrow-teal'], ['??C?','??','span','gel-arrow-chip gel-arrow-cyan'], ['??B?','??','span','gel-arrow-chip gel-arrow-blue'], ['??PR?','??','span','gel-arrow-chip gel-arrow-purple'], ['??PK?','??','span','gel-arrow-chip gel-arrow-pink'], ['??W?','??','span','gel-arrow-chip gel-arrow-white'], ['??FG?','??','span','gel-arrow-chip gel-arrow-fog'], ['??SL?','??','span','gel-arrow-chip gel-arrow-slate'], ['??BK?','??','span','gel-arrow-chip gel-arrow-black'], [',,R,',',,','span','gel-dogear-chip gel-dogear-red'], [',,O,',',,','span','gel-dogear-chip gel-dogear-orange'], [',,GL,',',,','span','gel-dogear-chip gel-dogear-gold'], [',,Y,',',,','span','gel-dogear-chip gel-dogear-yellow'], [',,L,',',,','span','gel-dogear-chip gel-dogear-lime'], [',,G,',',,','span','gel-dogear-chip gel-dogear-green'], [',,TU,',',,','span','gel-dogear-chip gel-dogear-turquoise'], [',,T,',',,','span','gel-dogear-chip gel-dogear-teal'], [',,C,',',,','span','gel-dogear-chip gel-dogear-cyan'], [',,B,',',,','span','gel-dogear-chip gel-dogear-blue'], [',,PR,',',,','span','gel-dogear-chip gel-dogear-purple'], [',,PK,',',,','span','gel-dogear-chip gel-dogear-pink'], [',,W,',',,','span','gel-dogear-chip gel-dogear-white'], [',,FG,',',,','span','gel-dogear-chip gel-dogear-fog'], [',,SL,',',,','span','gel-dogear-chip gel-dogear-slate'], [',,BK,',',,','span','gel-dogear-chip gel-dogear-black'], ['__R_','__','span','gel-keycap-chip gel-keycap-red'], ['__O_','__','span','gel-keycap-chip gel-keycap-orange'], ['__GL_','__','span','gel-keycap-chip gel-keycap-gold'], ['__Y_','__','span','gel-keycap-chip gel-keycap-yellow'], ['__L_','__','span','gel-keycap-chip gel-keycap-lime'], ['__G_','__','span','gel-keycap-chip gel-keycap-green'], ['__TU_','__','span','gel-keycap-chip gel-keycap-turquoise'], ['__T_','__','span','gel-keycap-chip gel-keycap-teal'], ['__C_','__','span','gel-keycap-chip gel-keycap-cyan'], ['__B_','__','span','gel-keycap-chip gel-keycap-blue'], ['__PR_','__','span','gel-keycap-chip gel-keycap-purple'], ['__PK_','__','span','gel-keycap-chip gel-keycap-pink'], ['__W_','__','span','gel-keycap-chip gel-keycap-white'], ['__FG_','__','span','gel-keycap-chip gel-keycap-fog'], ['__SL_','__','span','gel-keycap-chip gel-keycap-slate'], ['__BK_','__','span','gel-keycap-chip gel-keycap-black'], ['#%R%','%','span','gel-flag-chip gel-flag-red'], ['#%O%','%','span','gel-flag-chip gel-flag-orange'], ['#%GL%','%','span','gel-flag-chip gel-flag-gold'], ['#%Y%','%','span','gel-flag-chip gel-flag-yellow'], ['#%L%','%','span','gel-flag-chip gel-flag-lime'], ['#%G%','%','span','gel-flag-chip gel-flag-green'], ['#%TU%','%','span','gel-flag-chip gel-flag-turquoise'], ['#%T%','%','span','gel-flag-chip gel-flag-teal'], ['#%C%','%','span','gel-flag-chip gel-flag-cyan'], ['#%B%','%','span','gel-flag-chip gel-flag-blue'], ['#%PR%','%','span','gel-flag-chip gel-flag-purple'], ['#%PK%','%','span','gel-flag-chip gel-flag-pink'], ['#%W%','%','span','gel-flag-chip gel-flag-white'], ['#%FG%','%','span','gel-flag-chip gel-flag-fog'], ['#%SL%','%','span','gel-flag-chip gel-flag-slate'], ['#%BK%','%','span','gel-flag-chip gel-flag-black'], ['%C%','%','span','gel-pill-chip gel-pill-cyan'], ['%O%','%','span','gel-pill-chip gel-pill-orange'], ['%G%','%','span','gel-pill-chip gel-pill-green'], ['%R%','%','span','gel-pill-chip gel-pill-red'], ['%PR%','%','span','gel-pill-chip gel-pill-purple'], ['%PK%','%','span','gel-pill-chip gel-pill-pink'], ['%Y%','%','span','gel-pill-chip gel-pill-yellow'], ['%B%','%','span','gel-pill-chip gel-pill-blue'], ['%L%','%','span','gel-pill-chip gel-pill-lime'], ['%T%','%','span','gel-pill-chip gel-pill-teal'], ['%GL%','%','span','gel-pill-chip gel-pill-gold'], ['%SL%','%','span','gel-pill-chip gel-pill-slate'], ['%W%','%','span','gel-pill-chip gel-pill-white'], ['%BK%','%','span','gel-pill-chip gel-pill-black'], ['%FG%','%','span','gel-pill-chip gel-pill-fog'], ['%TU%','%','span','gel-pill-chip gel-pill-turquoise'],
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
        // Dark Gel Chips ~CPR~text~CPR~ (16 midnight neon pills, once a Marketplace pack)
        ['~CPR~','~CPR~','span','mkt-cp-red'], ['~CPO~','~CPO~','span','mkt-cp-orange'], ['~CPA~','~CPA~','span','mkt-cp-amber'], ['~CPY~','~CPY~','span','mkt-cp-yellow'], ['~CPL~','~CPL~','span','mkt-cp-lime'], ['~CPG~','~CPG~','span','mkt-cp-green'], ['~CPE~','~CPE~','span','mkt-cp-emerald'], ['~CPT~','~CPT~','span','mkt-cp-teal'], ['~CPC~','~CPC~','span','mkt-cp-cyan'], ['~CPS~','~CPS~','span','mkt-cp-sky'], ['~CPB~','~CPB~','span','mkt-cp-blue'], ['~CPI~','~CPI~','span','mkt-cp-indigo'], ['~CPV~','~CPV~','span','mkt-cp-violet'], ['~CPF~','~CPF~','span','mkt-cp-fuchsia'], ['~CPP~','~CPP~','span','mkt-cp-pink'], ['~CPQ~','~CPQ~','span','mkt-cp-slate'],
        // Aero Chips ++R+text++ and Logo Chips ;;B;text;; (16 colors each, the 13 Annotate colors plus White, Fog and Black)
        ['++R+','++','span','gel-aero-chip gel-aero-red'], ['++O+','++','span','gel-aero-chip gel-aero-orange'], ['++GL+','++','span','gel-aero-chip gel-aero-gold'], ['++Y+','++','span','gel-aero-chip gel-aero-yellow'], ['++L+','++','span','gel-aero-chip gel-aero-lime'], ['++G+','++','span','gel-aero-chip gel-aero-green'], ['++TU+','++','span','gel-aero-chip gel-aero-turquoise'], ['++T+','++','span','gel-aero-chip gel-aero-teal'], ['++C+','++','span','gel-aero-chip gel-aero-cyan'], ['++B+','++','span','gel-aero-chip gel-aero-blue'], ['++PR+','++','span','gel-aero-chip gel-aero-purple'], ['++PK+','++','span','gel-aero-chip gel-aero-pink'], ['++SL+','++','span','gel-aero-chip gel-aero-slate'], ['++W+','++','span','gel-aero-chip gel-aero-white'], ['++FG+','++','span','gel-aero-chip gel-aero-fog'], ['++BK+','++','span','gel-aero-chip gel-aero-black'], ['++R:','++','span','gel-aeroring-chip gel-aero-red'], ['++O:','++','span','gel-aeroring-chip gel-aero-orange'], ['++GL:','++','span','gel-aeroring-chip gel-aero-gold'], ['++Y:','++','span','gel-aeroring-chip gel-aero-yellow'], ['++L:','++','span','gel-aeroring-chip gel-aero-lime'], ['++G:','++','span','gel-aeroring-chip gel-aero-green'], ['++TU:','++','span','gel-aeroring-chip gel-aero-turquoise'], ['++T:','++','span','gel-aeroring-chip gel-aero-teal'], ['++C:','++','span','gel-aeroring-chip gel-aero-cyan'], ['++B:','++','span','gel-aeroring-chip gel-aero-blue'], ['++PR:','++','span','gel-aeroring-chip gel-aero-purple'], ['++PK:','++','span','gel-aeroring-chip gel-aero-pink'], ['++SL:','++','span','gel-aeroring-chip gel-aero-slate'], ['++W:','++','span','gel-aeroring-chip gel-aero-white'], ['++FG:','++','span','gel-aeroring-chip gel-aero-fog'], ['++BK:','++','span','gel-aeroring-chip gel-aero-black'], ['++R!','++','span','gel-aerobubble-chip gel-aero-red'], ['++O!','++','span','gel-aerobubble-chip gel-aero-orange'], ['++GL!','++','span','gel-aerobubble-chip gel-aero-gold'], ['++Y!','++','span','gel-aerobubble-chip gel-aero-yellow'], ['++L!','++','span','gel-aerobubble-chip gel-aero-lime'], ['++G!','++','span','gel-aerobubble-chip gel-aero-green'], ['++TU!','++','span','gel-aerobubble-chip gel-aero-turquoise'], ['++T!','++','span','gel-aerobubble-chip gel-aero-teal'], ['++C!','++','span','gel-aerobubble-chip gel-aero-cyan'], ['++B!','++','span','gel-aerobubble-chip gel-aero-blue'], ['++PR!','++','span','gel-aerobubble-chip gel-aero-purple'], ['++PK!','++','span','gel-aerobubble-chip gel-aero-pink'], ['++SL!','++','span','gel-aerobubble-chip gel-aero-slate'], ['++W!','++','span','gel-aerobubble-chip gel-aero-white'], ['++FG!','++','span','gel-aerobubble-chip gel-aero-fog'], ['++BK!','++','span','gel-aerobubble-chip gel-aero-black'], ['++R~','++','span','gel-aerotoast-chip gel-aero-red'], ['++R%','++','span','gel-aeronotice-chip gel-aero-red'], ['++R?','++','span','gel-aeromark-chip gel-aero-red'], ['++O~','++','span','gel-aerotoast-chip gel-aero-orange'], ['++O%','++','span','gel-aeronotice-chip gel-aero-orange'], ['++O?','++','span','gel-aeromark-chip gel-aero-orange'], ['++GL~','++','span','gel-aerotoast-chip gel-aero-gold'], ['++GL%','++','span','gel-aeronotice-chip gel-aero-gold'], ['++GL?','++','span','gel-aeromark-chip gel-aero-gold'], ['++Y~','++','span','gel-aerotoast-chip gel-aero-yellow'], ['++Y%','++','span','gel-aeronotice-chip gel-aero-yellow'], ['++Y?','++','span','gel-aeromark-chip gel-aero-yellow'], ['++L~','++','span','gel-aerotoast-chip gel-aero-lime'], ['++L%','++','span','gel-aeronotice-chip gel-aero-lime'], ['++L?','++','span','gel-aeromark-chip gel-aero-lime'], ['++G~','++','span','gel-aerotoast-chip gel-aero-green'], ['++G%','++','span','gel-aeronotice-chip gel-aero-green'], ['++G?','++','span','gel-aeromark-chip gel-aero-green'], ['++TU~','++','span','gel-aerotoast-chip gel-aero-turquoise'], ['++TU%','++','span','gel-aeronotice-chip gel-aero-turquoise'], ['++TU?','++','span','gel-aeromark-chip gel-aero-turquoise'], ['++T~','++','span','gel-aerotoast-chip gel-aero-teal'], ['++T%','++','span','gel-aeronotice-chip gel-aero-teal'], ['++T?','++','span','gel-aeromark-chip gel-aero-teal'], ['++C~','++','span','gel-aerotoast-chip gel-aero-cyan'], ['++C%','++','span','gel-aeronotice-chip gel-aero-cyan'], ['++C?','++','span','gel-aeromark-chip gel-aero-cyan'], ['++B~','++','span','gel-aerotoast-chip gel-aero-blue'], ['++B%','++','span','gel-aeronotice-chip gel-aero-blue'], ['++B?','++','span','gel-aeromark-chip gel-aero-blue'], ['++PR~','++','span','gel-aerotoast-chip gel-aero-purple'], ['++PR%','++','span','gel-aeronotice-chip gel-aero-purple'], ['++PR?','++','span','gel-aeromark-chip gel-aero-purple'], ['++PK~','++','span','gel-aerotoast-chip gel-aero-pink'], ['++PK%','++','span','gel-aeronotice-chip gel-aero-pink'], ['++PK?','++','span','gel-aeromark-chip gel-aero-pink'], ['++SL~','++','span','gel-aerotoast-chip gel-aero-slate'], ['++SL%','++','span','gel-aeronotice-chip gel-aero-slate'], ['++SL?','++','span','gel-aeromark-chip gel-aero-slate'], ['++W~','++','span','gel-aerotoast-chip gel-aero-white'], ['++W%','++','span','gel-aeronotice-chip gel-aero-white'], ['++W?','++','span','gel-aeromark-chip gel-aero-white'], ['++FG~','++','span','gel-aerotoast-chip gel-aero-fog'], ['++FG%','++','span','gel-aeronotice-chip gel-aero-fog'], ['++FG?','++','span','gel-aeromark-chip gel-aero-fog'], ['++BK~','++','span','gel-aerotoast-chip gel-aero-black'], ['++BK%','++','span','gel-aeronotice-chip gel-aero-black'], ['++BK?','++','span','gel-aeromark-chip gel-aero-black'] ,['%%R%','%%','span','gel-gloss-chip gel-aero-red'] ,['%%O%','%%','span','gel-gloss-chip gel-aero-orange'] ,['%%GL%','%%','span','gel-gloss-chip gel-aero-gold'] ,['%%Y%','%%','span','gel-gloss-chip gel-aero-yellow'] ,['%%L%','%%','span','gel-gloss-chip gel-aero-lime'] ,['%%G%','%%','span','gel-gloss-chip gel-aero-green'] ,['%%TU%','%%','span','gel-gloss-chip gel-aero-turquoise'] ,['%%T%','%%','span','gel-gloss-chip gel-aero-teal'] ,['%%C%','%%','span','gel-gloss-chip gel-aero-cyan'] ,['%%B%','%%','span','gel-gloss-chip gel-aero-blue'] ,['%%PR%','%%','span','gel-gloss-chip gel-aero-purple'] ,['%%PK%','%%','span','gel-gloss-chip gel-aero-pink'] ,['%%SL%','%%','span','gel-gloss-chip gel-aero-slate'] ,['%%W%','%%','span','gel-gloss-chip gel-aero-white'] ,['%%FG%','%%','span','gel-gloss-chip gel-aero-fog'] ,['%%BK%','%%','span','gel-gloss-chip gel-aero-black'] ,['%%R+','%%','span','gel-glosstube-chip gel-aero-red'] ,['%%O+','%%','span','gel-glosstube-chip gel-aero-orange'] ,['%%GL+','%%','span','gel-glosstube-chip gel-aero-gold'] ,['%%Y+','%%','span','gel-glosstube-chip gel-aero-yellow'] ,['%%L+','%%','span','gel-glosstube-chip gel-aero-lime'] ,['%%G+','%%','span','gel-glosstube-chip gel-aero-green'] ,['%%TU+','%%','span','gel-glosstube-chip gel-aero-turquoise'] ,['%%T+','%%','span','gel-glosstube-chip gel-aero-teal'] ,['%%C+','%%','span','gel-glosstube-chip gel-aero-cyan'] ,['%%B+','%%','span','gel-glosstube-chip gel-aero-blue'] ,['%%PR+','%%','span','gel-glosstube-chip gel-aero-purple'] ,['%%PK+','%%','span','gel-glosstube-chip gel-aero-pink'] ,['%%SL+','%%','span','gel-glosstube-chip gel-aero-slate'] ,['%%W+','%%','span','gel-glosstube-chip gel-aero-white'] ,['%%FG+','%%','span','gel-glosstube-chip gel-aero-fog'] ,['%%BK+','%%','span','gel-glosstube-chip gel-aero-black'] ,['%%R=','%%','span','gel-glossdew-chip gel-aero-red'] ,['%%O=','%%','span','gel-glossdew-chip gel-aero-orange'] ,['%%GL=','%%','span','gel-glossdew-chip gel-aero-gold'] ,['%%Y=','%%','span','gel-glossdew-chip gel-aero-yellow'] ,['%%L=','%%','span','gel-glossdew-chip gel-aero-lime'] ,['%%G=','%%','span','gel-glossdew-chip gel-aero-green'] ,['%%TU=','%%','span','gel-glossdew-chip gel-aero-turquoise'] ,['%%T=','%%','span','gel-glossdew-chip gel-aero-teal'] ,['%%C=','%%','span','gel-glossdew-chip gel-aero-cyan'] ,['%%B=','%%','span','gel-glossdew-chip gel-aero-blue'] ,['%%PR=','%%','span','gel-glossdew-chip gel-aero-purple'] ,['%%PK=','%%','span','gel-glossdew-chip gel-aero-pink'] ,['%%SL=','%%','span','gel-glossdew-chip gel-aero-slate'] ,['%%W=','%%','span','gel-glossdew-chip gel-aero-white'] ,['%%FG=','%%','span','gel-glossdew-chip gel-aero-fog'] ,['%%BK=','%%','span','gel-glossdew-chip gel-aero-black'] ,['++R#','++','span','gel-aeropane-chip gel-aero-red'] ,['++O#','++','span','gel-aeropane-chip gel-aero-orange'] ,['++GL#','++','span','gel-aeropane-chip gel-aero-gold'] ,['++Y#','++','span','gel-aeropane-chip gel-aero-yellow'] ,['++L#','++','span','gel-aeropane-chip gel-aero-lime'] ,['++G#','++','span','gel-aeropane-chip gel-aero-green'] ,['++TU#','++','span','gel-aeropane-chip gel-aero-turquoise'] ,['++T#','++','span','gel-aeropane-chip gel-aero-teal'] ,['++C#','++','span','gel-aeropane-chip gel-aero-cyan'] ,['++B#','++','span','gel-aeropane-chip gel-aero-blue'] ,['++PR#','++','span','gel-aeropane-chip gel-aero-purple'] ,['++PK#','++','span','gel-aeropane-chip gel-aero-pink'] ,['++SL#','++','span','gel-aeropane-chip gel-aero-slate'] ,['++W#','++','span','gel-aeropane-chip gel-aero-white'] ,['++FG#','++','span','gel-aeropane-chip gel-aero-fog'] ,['++BK#','++','span','gel-aeropane-chip gel-aero-black'] ,['++R&','++','span','gel-aerowindow-chip gel-aero-red'] ,['++O&','++','span','gel-aerowindow-chip gel-aero-orange'] ,['++GL&','++','span','gel-aerowindow-chip gel-aero-gold'] ,['++Y&','++','span','gel-aerowindow-chip gel-aero-yellow'] ,['++L&','++','span','gel-aerowindow-chip gel-aero-lime'] ,['++G&','++','span','gel-aerowindow-chip gel-aero-green'] ,['++TU&','++','span','gel-aerowindow-chip gel-aero-turquoise'] ,['++T&','++','span','gel-aerowindow-chip gel-aero-teal'] ,['++C&','++','span','gel-aerowindow-chip gel-aero-cyan'] ,['++B&','++','span','gel-aerowindow-chip gel-aero-blue'] ,['++PR&','++','span','gel-aerowindow-chip gel-aero-purple'] ,['++PK&','++','span','gel-aerowindow-chip gel-aero-pink'] ,['++SL&','++','span','gel-aerowindow-chip gel-aero-slate'] ,['++W&','++','span','gel-aerowindow-chip gel-aero-white'] ,['++FG&','++','span','gel-aerowindow-chip gel-aero-fog'] ,['++BK&','++','span','gel-aerowindow-chip gel-aero-black'] ,['++R.','++','span','gel-aerotab-chip gel-aero-red'] ,['++O.','++','span','gel-aerotab-chip gel-aero-orange'] ,['++GL.','++','span','gel-aerotab-chip gel-aero-gold'] ,['++Y.','++','span','gel-aerotab-chip gel-aero-yellow'] ,['++L.','++','span','gel-aerotab-chip gel-aero-lime'] ,['++G.','++','span','gel-aerotab-chip gel-aero-green'] ,['++TU.','++','span','gel-aerotab-chip gel-aero-turquoise'] ,['++T.','++','span','gel-aerotab-chip gel-aero-teal'] ,['++C.','++','span','gel-aerotab-chip gel-aero-cyan'] ,['++B.','++','span','gel-aerotab-chip gel-aero-blue'] ,['++PR.','++','span','gel-aerotab-chip gel-aero-purple'] ,['++PK.','++','span','gel-aerotab-chip gel-aero-pink'] ,['++SL.','++','span','gel-aerotab-chip gel-aero-slate'] ,['++W.','++','span','gel-aerotab-chip gel-aero-white'] ,['++FG.','++','span','gel-aerotab-chip gel-aero-fog'] ,['++BK.','++','span','gel-aerotab-chip gel-aero-black'] ,['++R,','++','span','gel-aerometer-chip gel-aero-red'] ,['++O,','++','span','gel-aerometer-chip gel-aero-orange'] ,['++GL,','++','span','gel-aerometer-chip gel-aero-gold'] ,['++Y,','++','span','gel-aerometer-chip gel-aero-yellow'] ,['++L,','++','span','gel-aerometer-chip gel-aero-lime'] ,['++G,','++','span','gel-aerometer-chip gel-aero-green'] ,['++TU,','++','span','gel-aerometer-chip gel-aero-turquoise'] ,['++T,','++','span','gel-aerometer-chip gel-aero-teal'] ,['++C,','++','span','gel-aerometer-chip gel-aero-cyan'] ,['++B,','++','span','gel-aerometer-chip gel-aero-blue'] ,['++PR,','++','span','gel-aerometer-chip gel-aero-purple'] ,['++PK,','++','span','gel-aerometer-chip gel-aero-pink'] ,['++SL,','++','span','gel-aerometer-chip gel-aero-slate'] ,['++W,','++','span','gel-aerometer-chip gel-aero-white'] ,['++FG,','++','span','gel-aerometer-chip gel-aero-fog'] ,['++BK,','++','span','gel-aerometer-chip gel-aero-black'] ,['++R_','++','span','gel-aerobevel-chip gel-aero-red'] ,['++O_','++','span','gel-aerobevel-chip gel-aero-orange'] ,['++GL_','++','span','gel-aerobevel-chip gel-aero-gold'] ,['++Y_','++','span','gel-aerobevel-chip gel-aero-yellow'] ,['++L_','++','span','gel-aerobevel-chip gel-aero-lime'] ,['++G_','++','span','gel-aerobevel-chip gel-aero-green'] ,['++TU_','++','span','gel-aerobevel-chip gel-aero-turquoise'] ,['++T_','++','span','gel-aerobevel-chip gel-aero-teal'] ,['++C_','++','span','gel-aerobevel-chip gel-aero-cyan'] ,['++B_','++','span','gel-aerobevel-chip gel-aero-blue'] ,['++PR_','++','span','gel-aerobevel-chip gel-aero-purple'] ,['++PK_','++','span','gel-aerobevel-chip gel-aero-pink'] ,['++SL_','++','span','gel-aerobevel-chip gel-aero-slate'] ,['++W_','++','span','gel-aerobevel-chip gel-aero-white'] ,['++FG_','++','span','gel-aerobevel-chip gel-aero-fog'] ,['++BK_','++','span','gel-aerobevel-chip gel-aero-black'] ,['++R/','++','span','gel-aeroswipe-chip gel-aero-red'] ,['++O/','++','span','gel-aeroswipe-chip gel-aero-orange'] ,['++GL/','++','span','gel-aeroswipe-chip gel-aero-gold'] ,['++Y/','++','span','gel-aeroswipe-chip gel-aero-yellow'] ,['++L/','++','span','gel-aeroswipe-chip gel-aero-lime'] ,['++G/','++','span','gel-aeroswipe-chip gel-aero-green'] ,['++TU/','++','span','gel-aeroswipe-chip gel-aero-turquoise'] ,['++T/','++','span','gel-aeroswipe-chip gel-aero-teal'] ,['++C/','++','span','gel-aeroswipe-chip gel-aero-cyan'] ,['++B/','++','span','gel-aeroswipe-chip gel-aero-blue'] ,['++PR/','++','span','gel-aeroswipe-chip gel-aero-purple'] ,['++PK/','++','span','gel-aeroswipe-chip gel-aero-pink'] ,['++SL/','++','span','gel-aeroswipe-chip gel-aero-slate'] ,['++W/','++','span','gel-aeroswipe-chip gel-aero-white'] ,['++FG/','++','span','gel-aeroswipe-chip gel-aero-fog'] ,['++BK/','++','span','gel-aeroswipe-chip gel-aero-black'] ,['++R-','++','span','gel-aerotape-chip gel-aero-red'] ,['++O-','++','span','gel-aerotape-chip gel-aero-orange'] ,['++GL-','++','span','gel-aerotape-chip gel-aero-gold'] ,['++Y-','++','span','gel-aerotape-chip gel-aero-yellow'] ,['++L-','++','span','gel-aerotape-chip gel-aero-lime'] ,['++G-','++','span','gel-aerotape-chip gel-aero-green'] ,['++TU-','++','span','gel-aerotape-chip gel-aero-turquoise'] ,['++T-','++','span','gel-aerotape-chip gel-aero-teal'] ,['++C-','++','span','gel-aerotape-chip gel-aero-cyan'] ,['++B-','++','span','gel-aerotape-chip gel-aero-blue'] ,['++PR-','++','span','gel-aerotape-chip gel-aero-purple'] ,['++PK-','++','span','gel-aerotape-chip gel-aero-pink'] ,['++SL-','++','span','gel-aerotape-chip gel-aero-slate'] ,['++W-','++','span','gel-aerotape-chip gel-aero-white'] ,['++FG-','++','span','gel-aerotape-chip gel-aero-fog'] ,['++BK-','++','span','gel-aerotape-chip gel-aero-black'] ,['++R@','++','span','gel-aerotail-chip gel-aero-red'] ,['++O@','++','span','gel-aerotail-chip gel-aero-orange'] ,['++GL@','++','span','gel-aerotail-chip gel-aero-gold'] ,['++Y@','++','span','gel-aerotail-chip gel-aero-yellow'] ,['++L@','++','span','gel-aerotail-chip gel-aero-lime'] ,['++G@','++','span','gel-aerotail-chip gel-aero-green'] ,['++TU@','++','span','gel-aerotail-chip gel-aero-turquoise'] ,['++T@','++','span','gel-aerotail-chip gel-aero-teal'] ,['++C@','++','span','gel-aerotail-chip gel-aero-cyan'] ,['++B@','++','span','gel-aerotail-chip gel-aero-blue'] ,['++PR@','++','span','gel-aerotail-chip gel-aero-purple'] ,['++PK@','++','span','gel-aerotail-chip gel-aero-pink'] ,['++SL@','++','span','gel-aerotail-chip gel-aero-slate'] ,['++W@','++','span','gel-aerotail-chip gel-aero-white'] ,['++FG@','++','span','gel-aerotail-chip gel-aero-fog'] ,['++BK@','++','span','gel-aerotail-chip gel-aero-black'] ,['++R;','++','span','gel-aerostack-chip gel-aero-red'] ,['++O;','++','span','gel-aerostack-chip gel-aero-orange'] ,['++GL;','++','span','gel-aerostack-chip gel-aero-gold'] ,['++Y;','++','span','gel-aerostack-chip gel-aero-yellow'] ,['++L;','++','span','gel-aerostack-chip gel-aero-lime'] ,['++G;','++','span','gel-aerostack-chip gel-aero-green'] ,['++TU;','++','span','gel-aerostack-chip gel-aero-turquoise'] ,['++T;','++','span','gel-aerostack-chip gel-aero-teal'] ,['++C;','++','span','gel-aerostack-chip gel-aero-cyan'] ,['++B;','++','span','gel-aerostack-chip gel-aero-blue'] ,['++PR;','++','span','gel-aerostack-chip gel-aero-purple'] ,['++PK;','++','span','gel-aerostack-chip gel-aero-pink'] ,['++SL;','++','span','gel-aerostack-chip gel-aero-slate'] ,['++W;','++','span','gel-aerostack-chip gel-aero-white'] ,['++FG;','++','span','gel-aerostack-chip gel-aero-fog'] ,['++BK;','++','span','gel-aerostack-chip gel-aero-black'], ['!!#R#','#','span','gel-rim-chip gel-rim-red'], ['!!#O#','#','span','gel-rim-chip gel-rim-orange'], ['!!#GL#','#','span','gel-rim-chip gel-rim-gold'], ['!!#Y#','#','span','gel-rim-chip gel-rim-yellow'], ['!!#L#','#','span','gel-rim-chip gel-rim-lime'], ['!!#G#','#','span','gel-rim-chip gel-rim-green'], ['!!#TU#','#','span','gel-rim-chip gel-rim-turquoise'], ['!!#T#','#','span','gel-rim-chip gel-rim-teal'], ['!!#C#','#','span','gel-rim-chip gel-rim-cyan'], ['!!#B#','#','span','gel-rim-chip gel-rim-blue'], ['!!#PR#','#','span','gel-rim-chip gel-rim-purple'], ['!!#PK#','#','span','gel-rim-chip gel-rim-pink'], ['!!#SL#','#','span','gel-rim-chip gel-rim-slate'], ['!!#W#','#','span','gel-rim-chip gel-rim-white'], ['!!#FG#','#','span','gel-rim-chip gel-rim-fog'], ['!!#BK#','#','span','gel-rim-chip gel-rim-black'], ['!!^R#','#','span','gel-rimliquid-chip gel-rim-red'], ['!!^O#','#','span','gel-rimliquid-chip gel-rim-orange'], ['!!^GL#','#','span','gel-rimliquid-chip gel-rim-gold'], ['!!^Y#','#','span','gel-rimliquid-chip gel-rim-yellow'], ['!!^L#','#','span','gel-rimliquid-chip gel-rim-lime'], ['!!^G#','#','span','gel-rimliquid-chip gel-rim-green'], ['!!^TU#','#','span','gel-rimliquid-chip gel-rim-turquoise'], ['!!^T#','#','span','gel-rimliquid-chip gel-rim-teal'], ['!!^C#','#','span','gel-rimliquid-chip gel-rim-cyan'], ['!!^B#','#','span','gel-rimliquid-chip gel-rim-blue'], ['!!^PR#','#','span','gel-rimliquid-chip gel-rim-purple'], ['!!^PK#','#','span','gel-rimliquid-chip gel-rim-pink'], ['!!^SL#','#','span','gel-rimliquid-chip gel-rim-slate'], ['!!^W#','#','span','gel-rimliquid-chip gel-rim-white'], ['!!^FG#','#','span','gel-rimliquid-chip gel-rim-fog'], ['!!^BK#','#','span','gel-rimliquid-chip gel-rim-black'], ['!!~R#','#','span','gel-rimstripe-chip gel-rim-red'], ['!!~O#','#','span','gel-rimstripe-chip gel-rim-orange'], ['!!~GL#','#','span','gel-rimstripe-chip gel-rim-gold'], ['!!~Y#','#','span','gel-rimstripe-chip gel-rim-yellow'], ['!!~L#','#','span','gel-rimstripe-chip gel-rim-lime'], ['!!~G#','#','span','gel-rimstripe-chip gel-rim-green'], ['!!~TU#','#','span','gel-rimstripe-chip gel-rim-turquoise'], ['!!~T#','#','span','gel-rimstripe-chip gel-rim-teal'], ['!!~C#','#','span','gel-rimstripe-chip gel-rim-cyan'], ['!!~B#','#','span','gel-rimstripe-chip gel-rim-blue'], ['!!~PR#','#','span','gel-rimstripe-chip gel-rim-purple'], ['!!~PK#','#','span','gel-rimstripe-chip gel-rim-pink'], ['!!~SL#','#','span','gel-rimstripe-chip gel-rim-slate'], ['!!~W#','#','span','gel-rimstripe-chip gel-rim-white'], ['!!~FG#','#','span','gel-rimstripe-chip gel-rim-fog'], ['!!~BK#','#','span','gel-rimstripe-chip gel-rim-black'], ['!!=R#','#','span','gel-rimaccent-chip gel-rim-red'], ['!!=O#','#','span','gel-rimaccent-chip gel-rim-orange'], ['!!=GL#','#','span','gel-rimaccent-chip gel-rim-gold'], ['!!=Y#','#','span','gel-rimaccent-chip gel-rim-yellow'], ['!!=L#','#','span','gel-rimaccent-chip gel-rim-lime'], ['!!=G#','#','span','gel-rimaccent-chip gel-rim-green'], ['!!=TU#','#','span','gel-rimaccent-chip gel-rim-turquoise'], ['!!=T#','#','span','gel-rimaccent-chip gel-rim-teal'], ['!!=C#','#','span','gel-rimaccent-chip gel-rim-cyan'], ['!!=B#','#','span','gel-rimaccent-chip gel-rim-blue'], ['!!=PR#','#','span','gel-rimaccent-chip gel-rim-purple'], ['!!=PK#','#','span','gel-rimaccent-chip gel-rim-pink'], ['!!=SL#','#','span','gel-rimaccent-chip gel-rim-slate'], ['!!=W#','#','span','gel-rimaccent-chip gel-rim-white'], ['!!=FG#','#','span','gel-rimaccent-chip gel-rim-fog'], ['!!=BK#','#','span','gel-rimaccent-chip gel-rim-black'], ['!!+R#','#','span','gel-rimneon-chip gel-rim-red'], ['!!+O#','#','span','gel-rimneon-chip gel-rim-orange'], ['!!+GL#','#','span','gel-rimneon-chip gel-rim-gold'], ['!!+Y#','#','span','gel-rimneon-chip gel-rim-yellow'], ['!!+L#','#','span','gel-rimneon-chip gel-rim-lime'], ['!!+G#','#','span','gel-rimneon-chip gel-rim-green'], ['!!+TU#','#','span','gel-rimneon-chip gel-rim-turquoise'], ['!!+T#','#','span','gel-rimneon-chip gel-rim-teal'], ['!!+C#','#','span','gel-rimneon-chip gel-rim-cyan'], ['!!+B#','#','span','gel-rimneon-chip gel-rim-blue'], ['!!+PR#','#','span','gel-rimneon-chip gel-rim-purple'], ['!!+PK#','#','span','gel-rimneon-chip gel-rim-pink'], ['!!+SL#','#','span','gel-rimneon-chip gel-rim-slate'], ['!!+W#','#','span','gel-rimneon-chip gel-rim-white'], ['!!+FG#','#','span','gel-rimneon-chip gel-rim-fog'], ['!!+BK#','#','span','gel-rimneon-chip gel-rim-black'], ['!!%R#','#','span','gel-rimfrost-chip gel-rim-red'], ['!!%O#','#','span','gel-rimfrost-chip gel-rim-orange'], ['!!%GL#','#','span','gel-rimfrost-chip gel-rim-gold'], ['!!%Y#','#','span','gel-rimfrost-chip gel-rim-yellow'], ['!!%L#','#','span','gel-rimfrost-chip gel-rim-lime'], ['!!%G#','#','span','gel-rimfrost-chip gel-rim-green'], ['!!%TU#','#','span','gel-rimfrost-chip gel-rim-turquoise'], ['!!%T#','#','span','gel-rimfrost-chip gel-rim-teal'], ['!!%C#','#','span','gel-rimfrost-chip gel-rim-cyan'], ['!!%B#','#','span','gel-rimfrost-chip gel-rim-blue'], ['!!%PR#','#','span','gel-rimfrost-chip gel-rim-purple'], ['!!%PK#','#','span','gel-rimfrost-chip gel-rim-pink'], ['!!%SL#','#','span','gel-rimfrost-chip gel-rim-slate'], ['!!%W#','#','span','gel-rimfrost-chip gel-rim-white'], ['!!%FG#','#','span','gel-rimfrost-chip gel-rim-fog'], ['!!%BK#','#','span','gel-rimfrost-chip gel-rim-black'], ['!!:R#','#','span','gel-rimdouble-chip gel-rim-red'], ['!!:O#','#','span','gel-rimdouble-chip gel-rim-orange'], ['!!:GL#','#','span','gel-rimdouble-chip gel-rim-gold'], ['!!:Y#','#','span','gel-rimdouble-chip gel-rim-yellow'], ['!!:L#','#','span','gel-rimdouble-chip gel-rim-lime'], ['!!:G#','#','span','gel-rimdouble-chip gel-rim-green'], ['!!:TU#','#','span','gel-rimdouble-chip gel-rim-turquoise'], ['!!:T#','#','span','gel-rimdouble-chip gel-rim-teal'], ['!!:C#','#','span','gel-rimdouble-chip gel-rim-cyan'], ['!!:B#','#','span','gel-rimdouble-chip gel-rim-blue'], ['!!:PR#','#','span','gel-rimdouble-chip gel-rim-purple'], ['!!:PK#','#','span','gel-rimdouble-chip gel-rim-pink'], ['!!:SL#','#','span','gel-rimdouble-chip gel-rim-slate'], ['!!:W#','#','span','gel-rimdouble-chip gel-rim-white'], ['!!:FG#','#','span','gel-rimdouble-chip gel-rim-fog'], ['!!:BK#','#','span','gel-rimdouble-chip gel-rim-black'], ['!!;R#','#','span','gel-rimdots-chip gel-rim-red'], ['!!;O#','#','span','gel-rimdots-chip gel-rim-orange'], ['!!;GL#','#','span','gel-rimdots-chip gel-rim-gold'], ['!!;Y#','#','span','gel-rimdots-chip gel-rim-yellow'], ['!!;L#','#','span','gel-rimdots-chip gel-rim-lime'], ['!!;G#','#','span','gel-rimdots-chip gel-rim-green'], ['!!;TU#','#','span','gel-rimdots-chip gel-rim-turquoise'], ['!!;T#','#','span','gel-rimdots-chip gel-rim-teal'], ['!!;C#','#','span','gel-rimdots-chip gel-rim-cyan'], ['!!;B#','#','span','gel-rimdots-chip gel-rim-blue'], ['!!;PR#','#','span','gel-rimdots-chip gel-rim-purple'], ['!!;PK#','#','span','gel-rimdots-chip gel-rim-pink'], ['!!;SL#','#','span','gel-rimdots-chip gel-rim-slate'], ['!!;W#','#','span','gel-rimdots-chip gel-rim-white'], ['!!;FG#','#','span','gel-rimdots-chip gel-rim-fog'], ['!!;BK#','#','span','gel-rimdots-chip gel-rim-black'], ['!!-R#','#','span','gel-rimpearl-chip gel-rim-red'], ['!!-O#','#','span','gel-rimpearl-chip gel-rim-orange'], ['!!-GL#','#','span','gel-rimpearl-chip gel-rim-gold'], ['!!-Y#','#','span','gel-rimpearl-chip gel-rim-yellow'], ['!!-L#','#','span','gel-rimpearl-chip gel-rim-lime'], ['!!-G#','#','span','gel-rimpearl-chip gel-rim-green'], ['!!-TU#','#','span','gel-rimpearl-chip gel-rim-turquoise'], ['!!-T#','#','span','gel-rimpearl-chip gel-rim-teal'], ['!!-C#','#','span','gel-rimpearl-chip gel-rim-cyan'], ['!!-B#','#','span','gel-rimpearl-chip gel-rim-blue'], ['!!-PR#','#','span','gel-rimpearl-chip gel-rim-purple'], ['!!-PK#','#','span','gel-rimpearl-chip gel-rim-pink'], ['!!-SL#','#','span','gel-rimpearl-chip gel-rim-slate'], ['!!-W#','#','span','gel-rimpearl-chip gel-rim-white'], ['!!-FG#','#','span','gel-rimpearl-chip gel-rim-fog'], ['!!-BK#','#','span','gel-rimpearl-chip gel-rim-black'], ['!!?R#','#','span','gel-rimsteel-chip gel-rim-red'], ['!!?O#','#','span','gel-rimsteel-chip gel-rim-orange'], ['!!?GL#','#','span','gel-rimsteel-chip gel-rim-gold'], ['!!?Y#','#','span','gel-rimsteel-chip gel-rim-yellow'], ['!!?L#','#','span','gel-rimsteel-chip gel-rim-lime'], ['!!?G#','#','span','gel-rimsteel-chip gel-rim-green'], ['!!?TU#','#','span','gel-rimsteel-chip gel-rim-turquoise'], ['!!?T#','#','span','gel-rimsteel-chip gel-rim-teal'], ['!!?C#','#','span','gel-rimsteel-chip gel-rim-cyan'], ['!!?B#','#','span','gel-rimsteel-chip gel-rim-blue'], ['!!?PR#','#','span','gel-rimsteel-chip gel-rim-purple'], ['!!?PK#','#','span','gel-rimsteel-chip gel-rim-pink'], ['!!?SL#','#','span','gel-rimsteel-chip gel-rim-slate'], ['!!?W#','#','span','gel-rimsteel-chip gel-rim-white'], ['!!?FG#','#','span','gel-rimsteel-chip gel-rim-fog'], ['!!?BK#','#','span','gel-rimsteel-chip gel-rim-black'], ['!!/R#','#','span','gel-rimaurora-chip gel-rim-red'], ['!!/O#','#','span','gel-rimaurora-chip gel-rim-orange'], ['!!/GL#','#','span','gel-rimaurora-chip gel-rim-gold'], ['!!/Y#','#','span','gel-rimaurora-chip gel-rim-yellow'], ['!!/L#','#','span','gel-rimaurora-chip gel-rim-lime'], ['!!/G#','#','span','gel-rimaurora-chip gel-rim-green'], ['!!/TU#','#','span','gel-rimaurora-chip gel-rim-turquoise'], ['!!/T#','#','span','gel-rimaurora-chip gel-rim-teal'], ['!!/C#','#','span','gel-rimaurora-chip gel-rim-cyan'], ['!!/B#','#','span','gel-rimaurora-chip gel-rim-blue'], ['!!/PR#','#','span','gel-rimaurora-chip gel-rim-purple'], ['!!/PK#','#','span','gel-rimaurora-chip gel-rim-pink'], ['!!/SL#','#','span','gel-rimaurora-chip gel-rim-slate'], ['!!/W#','#','span','gel-rimaurora-chip gel-rim-white'], ['!!/FG#','#','span','gel-rimaurora-chip gel-rim-fog'], ['!!/BK#','#','span','gel-rimaurora-chip gel-rim-black'] ,['!!*R#','#','span','gel-rimjelly-chip gel-rim-red'] ,['!!*O#','#','span','gel-rimjelly-chip gel-rim-orange'] ,['!!*GL#','#','span','gel-rimjelly-chip gel-rim-gold'] ,['!!*Y#','#','span','gel-rimjelly-chip gel-rim-yellow'] ,['!!*L#','#','span','gel-rimjelly-chip gel-rim-lime'] ,['!!*G#','#','span','gel-rimjelly-chip gel-rim-green'] ,['!!*TU#','#','span','gel-rimjelly-chip gel-rim-turquoise'] ,['!!*T#','#','span','gel-rimjelly-chip gel-rim-teal'] ,['!!*C#','#','span','gel-rimjelly-chip gel-rim-cyan'] ,['!!*B#','#','span','gel-rimjelly-chip gel-rim-blue'] ,['!!*PR#','#','span','gel-rimjelly-chip gel-rim-purple'] ,['!!*PK#','#','span','gel-rimjelly-chip gel-rim-pink'] ,['!!*SL#','#','span','gel-rimjelly-chip gel-rim-slate'] ,['!!*W#','#','span','gel-rimjelly-chip gel-rim-white'] ,['!!*FG#','#','span','gel-rimjelly-chip gel-rim-fog'] ,['!!*BK#','#','span','gel-rimjelly-chip gel-rim-black'] ,['!!@R#','#','span','gel-rimhail-chip gel-rim-red'] ,['!!@O#','#','span','gel-rimhail-chip gel-rim-orange'] ,['!!@GL#','#','span','gel-rimhail-chip gel-rim-gold'] ,['!!@Y#','#','span','gel-rimhail-chip gel-rim-yellow'] ,['!!@L#','#','span','gel-rimhail-chip gel-rim-lime'] ,['!!@G#','#','span','gel-rimhail-chip gel-rim-green'] ,['!!@TU#','#','span','gel-rimhail-chip gel-rim-turquoise'] ,['!!@T#','#','span','gel-rimhail-chip gel-rim-teal'] ,['!!@C#','#','span','gel-rimhail-chip gel-rim-cyan'] ,['!!@B#','#','span','gel-rimhail-chip gel-rim-blue'] ,['!!@PR#','#','span','gel-rimhail-chip gel-rim-purple'] ,['!!@PK#','#','span','gel-rimhail-chip gel-rim-pink'] ,['!!@SL#','#','span','gel-rimhail-chip gel-rim-slate'] ,['!!@W#','#','span','gel-rimhail-chip gel-rim-white'] ,['!!@FG#','#','span','gel-rimhail-chip gel-rim-fog'] ,['!!@BK#','#','span','gel-rimhail-chip gel-rim-black'] ,['!!!R#','#','span','gel-rimbadge-chip gel-rim-red'] ,['!!!O#','#','span','gel-rimbadge-chip gel-rim-orange'] ,['!!!GL#','#','span','gel-rimbadge-chip gel-rim-gold'] ,['!!!Y#','#','span','gel-rimbadge-chip gel-rim-yellow'] ,['!!!L#','#','span','gel-rimbadge-chip gel-rim-lime'] ,['!!!G#','#','span','gel-rimbadge-chip gel-rim-green'] ,['!!!TU#','#','span','gel-rimbadge-chip gel-rim-turquoise'] ,['!!!T#','#','span','gel-rimbadge-chip gel-rim-teal'] ,['!!!C#','#','span','gel-rimbadge-chip gel-rim-cyan'] ,['!!!B#','#','span','gel-rimbadge-chip gel-rim-blue'] ,['!!!PR#','#','span','gel-rimbadge-chip gel-rim-purple'] ,['!!!PK#','#','span','gel-rimbadge-chip gel-rim-pink'] ,['!!!SL#','#','span','gel-rimbadge-chip gel-rim-slate'] ,['!!!W#','#','span','gel-rimbadge-chip gel-rim-white'] ,['!!!FG#','#','span','gel-rimbadge-chip gel-rim-fog'] ,['!!!BK#','#','span','gel-rimbadge-chip gel-rim-black'], ['++R=','++','span','gel-aeroglass-chip gel-aero-red'], ['++O=','++','span','gel-aeroglass-chip gel-aero-orange'], ['++GL=','++','span','gel-aeroglass-chip gel-aero-gold'], ['++Y=','++','span','gel-aeroglass-chip gel-aero-yellow'], ['++L=','++','span','gel-aeroglass-chip gel-aero-lime'], ['++G=','++','span','gel-aeroglass-chip gel-aero-green'], ['++TU=','++','span','gel-aeroglass-chip gel-aero-turquoise'], ['++T=','++','span','gel-aeroglass-chip gel-aero-teal'], ['++C=','++','span','gel-aeroglass-chip gel-aero-cyan'], ['++B=','++','span','gel-aeroglass-chip gel-aero-blue'], ['++PR=','++','span','gel-aeroglass-chip gel-aero-purple'], ['++PK=','++','span','gel-aeroglass-chip gel-aero-pink'], ['++SL=','++','span','gel-aeroglass-chip gel-aero-slate'], ['++W=','++','span','gel-aeroglass-chip gel-aero-white'], ['++FG=','++','span','gel-aeroglass-chip gel-aero-fog'], ['++BK=','++','span','gel-aeroglass-chip gel-aero-black'], ['++R*','++','span','gel-aeroorb-chip gel-aero-red'], ['++O*','++','span','gel-aeroorb-chip gel-aero-orange'], ['++GL*','++','span','gel-aeroorb-chip gel-aero-gold'], ['++Y*','++','span','gel-aeroorb-chip gel-aero-yellow'], ['++L*','++','span','gel-aeroorb-chip gel-aero-lime'], ['++G*','++','span','gel-aeroorb-chip gel-aero-green'], ['++TU*','++','span','gel-aeroorb-chip gel-aero-turquoise'], ['++T*','++','span','gel-aeroorb-chip gel-aero-teal'], ['++C*','++','span','gel-aeroorb-chip gel-aero-cyan'], ['++B*','++','span','gel-aeroorb-chip gel-aero-blue'], ['++PR*','++','span','gel-aeroorb-chip gel-aero-purple'], ['++PK*','++','span','gel-aeroorb-chip gel-aero-pink'], ['++SL*','++','span','gel-aeroorb-chip gel-aero-slate'], ['++W*','++','span','gel-aeroorb-chip gel-aero-white'], ['++FG*','++','span','gel-aeroorb-chip gel-aero-fog'], ['++BK*','++','span','gel-aeroorb-chip gel-aero-black'], ['++R^','++','span','gel-aeroglow-chip gel-aero-red'], ['++O^','++','span','gel-aeroglow-chip gel-aero-orange'], ['++GL^','++','span','gel-aeroglow-chip gel-aero-gold'], ['++Y^','++','span','gel-aeroglow-chip gel-aero-yellow'], ['++L^','++','span','gel-aeroglow-chip gel-aero-lime'], ['++G^','++','span','gel-aeroglow-chip gel-aero-green'], ['++TU^','++','span','gel-aeroglow-chip gel-aero-turquoise'], ['++T^','++','span','gel-aeroglow-chip gel-aero-teal'], ['++C^','++','span','gel-aeroglow-chip gel-aero-cyan'], ['++B^','++','span','gel-aeroglow-chip gel-aero-blue'], ['++PR^','++','span','gel-aeroglow-chip gel-aero-purple'], ['++PK^','++','span','gel-aeroglow-chip gel-aero-pink'], ['++SL^','++','span','gel-aeroglow-chip gel-aero-slate'], ['++W^','++','span','gel-aeroglow-chip gel-aero-white'], ['++FG^','++','span','gel-aeroglow-chip gel-aero-fog'], ['++BK^','++','span','gel-aeroglow-chip gel-aero-black'],
        // New chip families (12 designs x 16 colors): ~~C~ wax, ~~C= pixel, ~~C. candy, ==C= tube, ==C~ marquee, ==C. crystal, //C/ washi, //C~ sticker, //C. foil, ((C( blueprint, ((C= pebble, ((C. stub)
        ['~~R~','~~','span','gel-wax-chip cx-red'], ['~~O~','~~','span','gel-wax-chip cx-orange'], ['~~GL~','~~','span','gel-wax-chip cx-gold'], ['~~Y~','~~','span','gel-wax-chip cx-yellow'], ['~~L~','~~','span','gel-wax-chip cx-lime'], ['~~G~','~~','span','gel-wax-chip cx-green'], ['~~TU~','~~','span','gel-wax-chip cx-turquoise'], ['~~T~','~~','span','gel-wax-chip cx-teal'], ['~~C~','~~','span','gel-wax-chip cx-cyan'], ['~~B~','~~','span','gel-wax-chip cx-blue'], ['~~PR~','~~','span','gel-wax-chip cx-purple'], ['~~PK~','~~','span','gel-wax-chip cx-pink'], ['~~SL~','~~','span','gel-wax-chip cx-slate'], ['~~W~','~~','span','gel-wax-chip cx-white'], ['~~FG~','~~','span','gel-wax-chip cx-fog'], ['~~BK~','~~','span','gel-wax-chip cx-black'], ['~~R=','~~','span','gel-pixel-chip cx-red'], ['~~O=','~~','span','gel-pixel-chip cx-orange'], ['~~GL=','~~','span','gel-pixel-chip cx-gold'], ['~~Y=','~~','span','gel-pixel-chip cx-yellow'], ['~~L=','~~','span','gel-pixel-chip cx-lime'], ['~~G=','~~','span','gel-pixel-chip cx-green'], ['~~TU=','~~','span','gel-pixel-chip cx-turquoise'], ['~~T=','~~','span','gel-pixel-chip cx-teal'], ['~~C=','~~','span','gel-pixel-chip cx-cyan'], ['~~B=','~~','span','gel-pixel-chip cx-blue'], ['~~PR=','~~','span','gel-pixel-chip cx-purple'], ['~~PK=','~~','span','gel-pixel-chip cx-pink'], ['~~SL=','~~','span','gel-pixel-chip cx-slate'], ['~~W=','~~','span','gel-pixel-chip cx-white'], ['~~FG=','~~','span','gel-pixel-chip cx-fog'], ['~~BK=','~~','span','gel-pixel-chip cx-black'], ['~~R.','~~','span','gel-candy-chip cx-red'], ['~~O.','~~','span','gel-candy-chip cx-orange'], ['~~GL.','~~','span','gel-candy-chip cx-gold'], ['~~Y.','~~','span','gel-candy-chip cx-yellow'], ['~~L.','~~','span','gel-candy-chip cx-lime'], ['~~G.','~~','span','gel-candy-chip cx-green'], ['~~TU.','~~','span','gel-candy-chip cx-turquoise'], ['~~T.','~~','span','gel-candy-chip cx-teal'], ['~~C.','~~','span','gel-candy-chip cx-cyan'], ['~~B.','~~','span','gel-candy-chip cx-blue'], ['~~PR.','~~','span','gel-candy-chip cx-purple'], ['~~PK.','~~','span','gel-candy-chip cx-pink'], ['~~SL.','~~','span','gel-candy-chip cx-slate'], ['~~W.','~~','span','gel-candy-chip cx-white'], ['~~FG.','~~','span','gel-candy-chip cx-fog'], ['~~BK.','~~','span','gel-candy-chip cx-black'], ['==R=','==','span','gel-tube-chip cx-red'], ['==O=','==','span','gel-tube-chip cx-orange'], ['==GL=','==','span','gel-tube-chip cx-gold'], ['==Y=','==','span','gel-tube-chip cx-yellow'], ['==L=','==','span','gel-tube-chip cx-lime'], ['==G=','==','span','gel-tube-chip cx-green'], ['==TU=','==','span','gel-tube-chip cx-turquoise'], ['==T=','==','span','gel-tube-chip cx-teal'], ['==C=','==','span','gel-tube-chip cx-cyan'], ['==B=','==','span','gel-tube-chip cx-blue'], ['==PR=','==','span','gel-tube-chip cx-purple'], ['==PK=','==','span','gel-tube-chip cx-pink'], ['==SL=','==','span','gel-tube-chip cx-slate'], ['==W=','==','span','gel-tube-chip cx-white'], ['==FG=','==','span','gel-tube-chip cx-fog'], ['==BK=','==','span','gel-tube-chip cx-black'], ['==R~','==','span','gel-marquee-chip cx-red'], ['==O~','==','span','gel-marquee-chip cx-orange'], ['==GL~','==','span','gel-marquee-chip cx-gold'], ['==Y~','==','span','gel-marquee-chip cx-yellow'], ['==L~','==','span','gel-marquee-chip cx-lime'], ['==G~','==','span','gel-marquee-chip cx-green'], ['==TU~','==','span','gel-marquee-chip cx-turquoise'], ['==T~','==','span','gel-marquee-chip cx-teal'], ['==C~','==','span','gel-marquee-chip cx-cyan'], ['==B~','==','span','gel-marquee-chip cx-blue'], ['==PR~','==','span','gel-marquee-chip cx-purple'], ['==PK~','==','span','gel-marquee-chip cx-pink'], ['==SL~','==','span','gel-marquee-chip cx-slate'], ['==W~','==','span','gel-marquee-chip cx-white'], ['==FG~','==','span','gel-marquee-chip cx-fog'], ['==BK~','==','span','gel-marquee-chip cx-black'], ['==R.','==','span','gel-crystal-chip cx-red'], ['==O.','==','span','gel-crystal-chip cx-orange'], ['==GL.','==','span','gel-crystal-chip cx-gold'], ['==Y.','==','span','gel-crystal-chip cx-yellow'], ['==L.','==','span','gel-crystal-chip cx-lime'], ['==G.','==','span','gel-crystal-chip cx-green'], ['==TU.','==','span','gel-crystal-chip cx-turquoise'], ['==T.','==','span','gel-crystal-chip cx-teal'], ['==C.','==','span','gel-crystal-chip cx-cyan'], ['==B.','==','span','gel-crystal-chip cx-blue'], ['==PR.','==','span','gel-crystal-chip cx-purple'], ['==PK.','==','span','gel-crystal-chip cx-pink'], ['==SL.','==','span','gel-crystal-chip cx-slate'], ['==W.','==','span','gel-crystal-chip cx-white'], ['==FG.','==','span','gel-crystal-chip cx-fog'], ['==BK.','==','span','gel-crystal-chip cx-black'], ['//R/','//','span','gel-washi-chip cx-red'], ['//O/','//','span','gel-washi-chip cx-orange'], ['//GL/','//','span','gel-washi-chip cx-gold'], ['//Y/','//','span','gel-washi-chip cx-yellow'], ['//L/','//','span','gel-washi-chip cx-lime'], ['//G/','//','span','gel-washi-chip cx-green'], ['//TU/','//','span','gel-washi-chip cx-turquoise'], ['//T/','//','span','gel-washi-chip cx-teal'], ['//C/','//','span','gel-washi-chip cx-cyan'], ['//B/','//','span','gel-washi-chip cx-blue'], ['//PR/','//','span','gel-washi-chip cx-purple'], ['//PK/','//','span','gel-washi-chip cx-pink'], ['//SL/','//','span','gel-washi-chip cx-slate'], ['//W/','//','span','gel-washi-chip cx-white'], ['//FG/','//','span','gel-washi-chip cx-fog'], ['//BK/','//','span','gel-washi-chip cx-black'], ['//R~','//','span','gel-sticker-chip cx-red'], ['//O~','//','span','gel-sticker-chip cx-orange'], ['//GL~','//','span','gel-sticker-chip cx-gold'], ['//Y~','//','span','gel-sticker-chip cx-yellow'], ['//L~','//','span','gel-sticker-chip cx-lime'], ['//G~','//','span','gel-sticker-chip cx-green'], ['//TU~','//','span','gel-sticker-chip cx-turquoise'], ['//T~','//','span','gel-sticker-chip cx-teal'], ['//C~','//','span','gel-sticker-chip cx-cyan'], ['//B~','//','span','gel-sticker-chip cx-blue'], ['//PR~','//','span','gel-sticker-chip cx-purple'], ['//PK~','//','span','gel-sticker-chip cx-pink'], ['//SL~','//','span','gel-sticker-chip cx-slate'], ['//W~','//','span','gel-sticker-chip cx-white'], ['//FG~','//','span','gel-sticker-chip cx-fog'], ['//BK~','//','span','gel-sticker-chip cx-black'], ['//R.','//','span','gel-foil-chip cx-red'], ['//O.','//','span','gel-foil-chip cx-orange'], ['//GL.','//','span','gel-foil-chip cx-gold'], ['//Y.','//','span','gel-foil-chip cx-yellow'], ['//L.','//','span','gel-foil-chip cx-lime'], ['//G.','//','span','gel-foil-chip cx-green'], ['//TU.','//','span','gel-foil-chip cx-turquoise'], ['//T.','//','span','gel-foil-chip cx-teal'], ['//C.','//','span','gel-foil-chip cx-cyan'], ['//B.','//','span','gel-foil-chip cx-blue'], ['//PR.','//','span','gel-foil-chip cx-purple'], ['//PK.','//','span','gel-foil-chip cx-pink'], ['//SL.','//','span','gel-foil-chip cx-slate'], ['//W.','//','span','gel-foil-chip cx-white'], ['//FG.','//','span','gel-foil-chip cx-fog'], ['//BK.','//','span','gel-foil-chip cx-black'], ['((R(','))','span','gel-blueprint-chip cx-red'], ['((O(','))','span','gel-blueprint-chip cx-orange'], ['((GL(','))','span','gel-blueprint-chip cx-gold'], ['((Y(','))','span','gel-blueprint-chip cx-yellow'], ['((L(','))','span','gel-blueprint-chip cx-lime'], ['((G(','))','span','gel-blueprint-chip cx-green'], ['((TU(','))','span','gel-blueprint-chip cx-turquoise'], ['((T(','))','span','gel-blueprint-chip cx-teal'], ['((C(','))','span','gel-blueprint-chip cx-cyan'], ['((B(','))','span','gel-blueprint-chip cx-blue'], ['((PR(','))','span','gel-blueprint-chip cx-purple'], ['((PK(','))','span','gel-blueprint-chip cx-pink'], ['((SL(','))','span','gel-blueprint-chip cx-slate'], ['((W(','))','span','gel-blueprint-chip cx-white'], ['((FG(','))','span','gel-blueprint-chip cx-fog'], ['((BK(','))','span','gel-blueprint-chip cx-black'], ['((R=','))','span','gel-pebble-chip cx-red'], ['((O=','))','span','gel-pebble-chip cx-orange'], ['((GL=','))','span','gel-pebble-chip cx-gold'], ['((Y=','))','span','gel-pebble-chip cx-yellow'], ['((L=','))','span','gel-pebble-chip cx-lime'], ['((G=','))','span','gel-pebble-chip cx-green'], ['((TU=','))','span','gel-pebble-chip cx-turquoise'], ['((T=','))','span','gel-pebble-chip cx-teal'], ['((C=','))','span','gel-pebble-chip cx-cyan'], ['((B=','))','span','gel-pebble-chip cx-blue'], ['((PR=','))','span','gel-pebble-chip cx-purple'], ['((PK=','))','span','gel-pebble-chip cx-pink'], ['((SL=','))','span','gel-pebble-chip cx-slate'], ['((W=','))','span','gel-pebble-chip cx-white'], ['((FG=','))','span','gel-pebble-chip cx-fog'], ['((BK=','))','span','gel-pebble-chip cx-black'], ['((R.','))','span','gel-stub-chip cx-red'], ['((O.','))','span','gel-stub-chip cx-orange'], ['((GL.','))','span','gel-stub-chip cx-gold'], ['((Y.','))','span','gel-stub-chip cx-yellow'], ['((L.','))','span','gel-stub-chip cx-lime'], ['((G.','))','span','gel-stub-chip cx-green'], ['((TU.','))','span','gel-stub-chip cx-turquoise'], ['((T.','))','span','gel-stub-chip cx-teal'], ['((C.','))','span','gel-stub-chip cx-cyan'], ['((B.','))','span','gel-stub-chip cx-blue'], ['((PR.','))','span','gel-stub-chip cx-purple'], ['((PK.','))','span','gel-stub-chip cx-pink'], ['((SL.','))','span','gel-stub-chip cx-slate'], ['((W.','))','span','gel-stub-chip cx-white'], ['((FG.','))','span','gel-stub-chip cx-fog'], ['((BK.','))','span','gel-stub-chip cx-black'],
        [';;R;',';;','span','gel-logo-chip gel-logo-red'], [';;O;',';;','span','gel-logo-chip gel-logo-orange'], [';;GL;',';;','span','gel-logo-chip gel-logo-gold'], [';;Y;',';;','span','gel-logo-chip gel-logo-yellow'], [';;L;',';;','span','gel-logo-chip gel-logo-lime'], [';;G;',';;','span','gel-logo-chip gel-logo-green'], [';;TU;',';;','span','gel-logo-chip gel-logo-turquoise'], [';;T;',';;','span','gel-logo-chip gel-logo-teal'], [';;C;',';;','span','gel-logo-chip gel-logo-cyan'], [';;B;',';;','span','gel-logo-chip gel-logo-blue'], [';;PR;',';;','span','gel-logo-chip gel-logo-purple'], [';;PK;',';;','span','gel-logo-chip gel-logo-pink'], [';;SL;',';;','span','gel-logo-chip gel-logo-slate'], [';;W;',';;','span','gel-logo-chip gel-logo-white'], [';;FG;',';;','span','gel-logo-chip gel-logo-fog'], [';;BK;',';;','span','gel-logo-chip gel-logo-black'] ,[';;R:',';;','span','gel-logoglass-chip gel-logo-red'] ,[';;O:',';;','span','gel-logoglass-chip gel-logo-orange'] ,[';;GL:',';;','span','gel-logoglass-chip gel-logo-gold'] ,[';;Y:',';;','span','gel-logoglass-chip gel-logo-yellow'] ,[';;L:',';;','span','gel-logoglass-chip gel-logo-lime'] ,[';;G:',';;','span','gel-logoglass-chip gel-logo-green'] ,[';;TU:',';;','span','gel-logoglass-chip gel-logo-turquoise'] ,[';;T:',';;','span','gel-logoglass-chip gel-logo-teal'] ,[';;C:',';;','span','gel-logoglass-chip gel-logo-cyan'] ,[';;B:',';;','span','gel-logoglass-chip gel-logo-blue'] ,[';;PR:',';;','span','gel-logoglass-chip gel-logo-purple'] ,[';;PK:',';;','span','gel-logoglass-chip gel-logo-pink'] ,[';;SL:',';;','span','gel-logoglass-chip gel-logo-slate'] ,[';;W:',';;','span','gel-logoglass-chip gel-logo-white'] ,[';;FG:',';;','span','gel-logoglass-chip gel-logo-fog'] ,[';;BK:',';;','span','gel-logoglass-chip gel-logo-black'] ,[';;R~',';;','span','gel-logoribbon-chip gel-logo-red'] ,[';;O~',';;','span','gel-logoribbon-chip gel-logo-orange'] ,[';;GL~',';;','span','gel-logoribbon-chip gel-logo-gold'] ,[';;Y~',';;','span','gel-logoribbon-chip gel-logo-yellow'] ,[';;L~',';;','span','gel-logoribbon-chip gel-logo-lime'] ,[';;G~',';;','span','gel-logoribbon-chip gel-logo-green'] ,[';;TU~',';;','span','gel-logoribbon-chip gel-logo-turquoise'] ,[';;T~',';;','span','gel-logoribbon-chip gel-logo-teal'] ,[';;C~',';;','span','gel-logoribbon-chip gel-logo-cyan'] ,[';;B~',';;','span','gel-logoribbon-chip gel-logo-blue'] ,[';;PR~',';;','span','gel-logoribbon-chip gel-logo-purple'] ,[';;PK~',';;','span','gel-logoribbon-chip gel-logo-pink'] ,[';;SL~',';;','span','gel-logoribbon-chip gel-logo-slate'] ,[';;W~',';;','span','gel-logoribbon-chip gel-logo-white'] ,[';;FG~',';;','span','gel-logoribbon-chip gel-logo-fog'] ,[';;BK~',';;','span','gel-logoribbon-chip gel-logo-black'],
    ];
    // longest openers first (so ** beats * and !#R# beats #R#); highlights go before all of them, each with its NEAREST ending
    // (a lone & is matched by its own rule below, so "AT&T and R&D" stays as typed)
    const ORDER = TRIGGERS.slice().filter((d) => d[0] !== '&').sort((a, b) => b[0].length - a[0].length);
    const HL_RE = new RegExp('#(' + HL_COLORS.map((x) => x[0]).sort((a, b) => b.length - a.length).join('|') + ')#([^#]+?)#(\\[\\[|[#_~=\\]\\[>-])', 'g');
    const INK_RE = new RegExp('#(' + HL_COLORS.map((x) => x[0]).sort((a, b) => b.length - a.length).join('|') + ')\\(([^()]+?)\\)', 'g');
    // Every Annotate style by name: #R.halo(text), #B.neon(text), #Y.marker(text)... ([name, class, label])
    const AN_STYLES = [["highlight","","Highlight"],["underline"," an-s-ul","Gel Underline"],["strike"," an-s-st","Gel Strike"],["box"," an-s-bx","Gel Box"],["brackets"," an-s-cb","Corner Brackets"],["select"," an-s-sl","Gel Select"],["ink"," an-s-ink","Color Ink"],["marker"," an-s-mk","Marker"],["glow"," an-s-gl","Glow Pen"],["lasso"," an-s-ls","Lasso"],["halo"," an-s-ha","Halo"],["spotlight"," an-s-gf","Spotlight"],["accent"," an-s-ga","Gel Accent"],["bubble"," an-s-gb","Gel Bubble"],["dusk"," an-s-dk","Dusk"],["prism"," an-s-pr","Prism"],["complement"," an-s-cm","Complement"],["ticket"," an-s-tk","Ticket"],["neon"," an-s-nn","Neon"],["stamp"," an-s-sm","Stamp"],["washi"," an-s-tp","Washi Tape"],["checker"," an-s-ck","Checker"],["halftone"," an-s-ht","Halftone"],["aurora"," an-s-au","Aurora"],["mild"," an-s-ml","Mild"],["wrap"," an-s-gw","Gel Wrap"],["belt"," an-s-bt","Highlight Belt"],["bucket"," an-s-bk","Gel Bucket"],["torpedo"," an-s-tr","Gel Torpedo"],["bottle"," an-s-bo","Gel Bottle"],["packet"," an-s-pk","Gel Packet"],["capsule"," an-s-cs","Gel Capsule"],["frost"," an-s-fr","Frost"],["pixel"," an-s-px","Pixel"],["flag"," an-s-fl","Gel Flag"],["gem"," an-s-gm","Gel Gem"],["bracket"," an-s-br","Gel Bracket"],["guillemets"," an-s-gu","Gel Guillemets"],["dbracket"," an-s-db","Gel Double Brackets"],["half"," an-s-hf","Half"],["sweep"," an-s-sw","Sweep"],["pop"," an-s-po","Pop"],["tick"," an-s-tc","Tick"],["hatch"," an-s-hc","Hatch"],["grid"," an-s-gr","Grid"],["dashbox"," an-s-dx","Dashbox"],["stitch"," an-s-sh","Stitch"],["squiggle"," an-s-sq","Squiggle"],["double"," an-s-dl","Double Underline"],["spot"," an-s-sp","Spot"],["leaf"," an-s-lf","Leaf"],["underbar"," an-s-ub","Underbar"],["overbar"," an-s-ob","Overbar"],["zigzag"," an-s-zz","Zigzag"],["dotted"," an-s-dt","Dotted"],["sunken"," an-s-sk","Sunken"],["glass"," an-s-gs","Glass"],["pinstripe"," an-s-pn","Pinstripe"],["band"," an-s-bn","Band"],["misprint"," an-s-mp","Misprint"],["ring"," an-s-rg","Ring"],["dashline"," an-s-dn","Dashline"],["weave"," an-s-wv","Weave"]];
    const AN_BY = Object.fromEntries(AN_STYLES.map((x) => [x[0], x[1]]));
    AN_STYLES.slice(7).forEach(([name, cls]) => HL_COLORS.forEach(([k, c]) => HIGHLIGHTS.push(['#' + k + '.' + name + '(', ')', 'mark', 'an-hl an-hl-' + c + cls])));
    const AN_RE = new RegExp('#(' + HL_COLORS.map((x) => x[0]).sort((a, b) => b.length - a.length).join('|') + ')\\.([a-z]+)\\(([^()]+?)\\)', 'g');
    // Unique Styles Gallery as Keydown: @family-N@text@ (N is the colorway, 1 to 5; @family@text@ is colorway 1)!
    const US_FAMS = new Set('neontube lava holo retrosun vapor sprinkles jelly puffy comic graffiti circuit blueprint led crt pixel aurora galaxy gem foil marble wood washi postit dymo enamel neumorph glassblob ring element origami bubblewrap denim leather chrome window receipt brick scales plaid gingham chevron cyber camo barber sunburst topo glitch hud hazard typewriter crayon brickneon marquee polaroid film brush watercolor stained tiedye popart riso scroll wax banner notebook capsule battery loading cloud glowtext patch softinset clay layers longshadow engraved webtwo retrodesk coderain bokeh ombre mesh swoosh circled spoiler gradtext shimmer extruded diecut letterpress faaqua fabubble faglass fameadow fawater faleaf faflare faswoosh facrystal faunderwater faorb fafrost fadew faeco fasunrise fapinstripe faclouds fataskbar faaquarium faribbon faluna fataskband fagadget fachannel famediawave fablade fapocket fablackglass fatoolbar faprogress fasearch fagltab faballoon fagrass fahorizon farainbow fasunbeam fapetals fawavecrest faripples farainglass faicecube fasnowglobe fashafts faglobe faveins fabamboo faskytext faliquidchrome faliquid faprism fasmoked faneonedge fahologlass fagelring fajellybean facandygloss famarble fawaterdrop fareflect faorbs fabrightribbon faswirl fabanner fabadge fatoggle faicontile fadunes fasunsetsea fatropical fawaterfall facluster fawaveline faecoleaf farecycle fasolar faenergy fapebble fashard faripplering falightleak faicetext fawatertext faglosstext fachrometext faleaftext faskypill famusicnote faflowcard faslider fbcapsule fbwand fbtitlebar fbvalley fbcaustic fbpetal fbstreak fbtwinswoosh fbfacet fbsoda fbpearl fbstacked fbdewbeads fbstatus fbsundisc fbbrushed fbcloudbank fbdockitem fbtank fbsash fbtaskpane fbtray fbgauge fbmenububble fbvisualizer fbhubtile fbclickwheel fbpiano fbribbongroup fbmarquee fbaddress fbdocktab fbtooltip fbflowers fbisland fbrainstreak fbskybeams fbdaisy fbsurf fbpuddle fbmisted fbfrostcorner fbsnowcap fbdappled fbplanet fbfern fbmat fbcloudtext fbchromerim fbleveltube fbprismedge fbgrille fbneonring fbiridescent fbtwinring fbgummy fbpeppermint fbsuperball fbwaterbead fbmirrorpill fbbokeh fbsilk fbflourish fbweb2 fbstarburst fbradio fbrunapp fbpastellayers fbmoonpath fbpalmshade fbrainshower fbfizztrail fbsignalwave fbdropbadge fbcycle fbbattery fbsignalbars fbfroststone fbbevel fbbreathe fbbloom fbfroststroke fbbubbletext fbstickertext fbglasstext fbmeadowtext fbskywindow fbpeel fbsideflow fbcheckbox fckeycap fctwinbubble fcthumb fchillsil fcbelow fcwillow fcsparkle fcvistaglow fccolumn fccurtain fcjewel fcfrostheader fcdewcorner fcecocap fcdawnbands fcgraph fccotton fcstartbar fcfishbowl fccornerribbon fclunawindow fcquicklaunch fcweather fcconsolecard fclightbars fcarrow fcminiscreen fcblackpearl fcsplit fcblocks fclens fcfoldertab fcchat fclawn fcsail fcrainbowrim fcsunburst fcblossomrow fcoceanbands fclilypad fcdrips fcicicle fcsnowflake fcpines fcmoon fcleaffan fcgrove fchorizontext fcsilver fcwavefill fcprismfan fcvisor fcunderglow fcfoil fcbrackets fcjellycube fcwrapper fcgumball fcsplash fcshelf fcspheres fctwist fcrings fcpricetag fcaward fcstepper fcnotify fcwindripple fcretrosun fcvines fccurrent fcfoam fcarc fcsprout fcloop fcplug fcbarchart fcstonestack fcbrick fccorona fcstreak fcglaciertext fcrippletext fccandytext fcmetaltext fcspringtext fccontrail fcpatch fcheadercard fcrange plripple plcaustic plsurface plscallop plsplash plbubbles pldeep plshimmer plclear plrays pldrop plshore plwake plmist plsunref pltiles plmosaic pllane plrope plbuoy pldepth plnodive plcoping plgutter pldrain plladder plboard plblock pllight plskimmer pldeck plterrazzo plwaterline plnighttile plpenny plring plbeachball plnoodle pltube plkick plgoggles plcap plfloatie plraft plwhistle plrescue pltower plflags plumbrella plcabana pltowel plweave plflipflop plsunscreen plshades plicepop plsoda plslush plcitrus plcocktail plmotel plneon plpalms platomic plpostcard plsunset plmorning plheat plchlorine plscore plpace plcaution plslide plcannon plpass plband plsticker plpatch plpin plvarsity plstencil plinflate plgel plfade plsplashtext plripplet plpolaroid pltape plradio plwaveedge pwcrest pwrefract pwshallows pwringlet pwdroptrail pwfoam pwwhirl pwjets pwburst pwglass pwwetglass pwshine pwundertow pwmistglow pwtidegrad pwbigtile pwsubway pwhexpenny pwbullnose pwlanenum pwdraincover pwsteps pwhandrail pwchevron pwdashrope pwplanks pwconcrete pwgate pwlattice pwgauge pwpleats pwthermo pwcover pwinfinity pwarc pwdivering pwdivestick pwsquirt pwballoon pwsnorkel pwflippers pwdonut pwmattress pwducky pwbuckethat pwvisor pwtowelroll pwbagweave pwcooler pwstraw pwsmoothie pwfreezepop pwsnowcone pwtwistrim pwsunhat pwsandal pwroundshades pwdrip pwwatch pwmegaphone pwneontube pwarrowsign pwmarquee pwsnackbar pwpolka pwstripesuit pwgingham pwhalfsun pwriso pwbadge pwribbon pwpennant pwstamp pwmedal pwtrophy pwlcd pwlapcount pwpixelwave pwglitch pwholo pwjelly pwmarble pwbubble pwlongshadow pwoutline pwdotted pwwavyline pwhighlight pwduo pwsunsetmono ptglitter ptdapple ptcrown ptcolumn pttarget ptwaveunder ptombre ptrain ptnightglow ptsunbeam pthorizon pticecube ptsteam ptfizz ptwavegloss ptkidney ptlapfloats ptdivewell ptspajets ptchecker ptorangegrout ptmosaicstrip ptdepthtile ptstones ptswag ptdeckdiag ptpickets ptwaterfall ptguardseat ptbeacon ptpipes ptporthole ptshower ptrules ptstripering ptwings ptvolley ptpolocap ptpaddles pttorpedo pthoop ptlounge ptbucket ptmask ptstrap ptvtowel ptaviator ptsqueeze ptorangeade ptlolly ptfloat ptshaved ptjuicebox ptbitten ptlanyard ptziplock ptbagtag ptcap ptrescueboard ptnoodles ptfirstaid ptscript ptinvite ptneonwave ptboomerang ptgoogie ptboomprint pttileletters ptsleeve ptjersey ptsplitflap ptadmit ptbooth ptslide ptwavestamp ptcalendar ptmixtape ptspeakers ptsurf ptgumbubble ptpopdots ptcomicburst ptextrude ptoutlineduo ptvgrad ptchrome ptfrosted ptcapsule pttoggle ptsunring pfcaustics pfwhitecap pfeddy pfrippleedge pftidepool pfseafoam pfmisting pfwakewash pfsurfline pfdewdrop pfglassy pfmoonbeam pfcurrentarrow pfbubbletrail pfdepthfade pfsparkleswim pfmosaicfade pfzigtile pfhexpave pfbrickborder pfcolumns pfarchway pfbalcony pfcabanastripe pfpergola pfstairrail pfdrain pfskimmer pflightbulb pfwallart pfterrazzo pfgateway pffountain pfflippers pfsnorkelset pfswimcap pfgoggles pfkickboard pfpullbuoy pfwhistle pfrescuetube pfpoolnet pfhose pfchlorine pftestkit pfthermo pftimer pflemonade pfpunch pfpopsicle pficecream pfwatermelon pfcoconut pfsmoothie pfchips pfseasonpass pfwristtag pflessoncard pflockerkey pfcheckin pfnametag pfmembercard pfstamp pfretrosun pfpostcard pfdinerstripe pfatomic pfpalmprint pfsunsetband pfmotelsign pfpennant pfbadge pfpatch pflongshadow pfstacktext pfgloweredge pfsplashtext pfwettext pfdashoutline pfinline pfglasstext pfcutpaper pfdoublewave pfpillswitch pfcornerdot pfpoolcard pfticker pfdivewave pfsplitgrad pfhalo fewindowrim fedialog fewizard fedesktopicon fetray fejump fetile fegadgetframe fethumbnail fealttab feribbontab fequickbar feprogressring fenotice fehelp fetoolkit fecontext feexplorer fesearchglass felock fespringrain fesummerglare feautumnleaf fewinterfrost fesnowdrift fethunder fefog fesunshower fehailglass fedewdawn feharvest feaurora fetwilight fesandstorm fetide fecherry felemon felime fegrape fekiwi fepeach feberry fejellybean fesprinkle fecaramel fesoda fegummy fecandycane fetaffy femarsh fecircuit fechip fedrive feusb fesd feled feantenna fewifi fefiber fecable fekeys fetouch feplay feeq fescanner feframeglass feticketaero felabelgel fecorners fenotch fecapsulebar fedoublebar fearcade fesheen fehalfmoon feaquatext fechromeink feglowink fegelink fewetink fefoilink feneoninkaero fedripink fefrostink feshineink fesplitink feoutlineink feblurink fehaloink feglassink pvlane pvdive pvsurge pvbrine pvriptide pvspray pvflow pvglint pvtrickle pvpuddle pvdew pvwaterline pvbubbly pvkelp pvtidal pvvortex pvtilemix pvharlequin pvstripetile pvcheckerlane pvbalustrade pvawning pvshutters pvlattice pvbeam pvstep pvgutter pvplank pvgravel pvmarble pvgrout pvarchrow pvpillar pvmaskstrap pvfinset pvfloatvest pvtubeinfl pvboardrail pvbuoyline pvanchor pvoar pvsup pvsail pvlifering pvflagbuoy pvdrybag pvcoolbox pvlollyswirl pvshavedcone pvmango pvlimeade pvcherrysoda pvpineslice pvwaffle pvsundae pvwristband pvtokens pvvoucher pvlogbook pvbadgepin pvclipboard pvlabeltape pvsignpost pvsunsetgrid pvpalmstripe pvdeco pvpoolparty pvbeachtowel pvsurfboard pvtikipattern pvpostage pvmatchbook pvbingo pvfloattext pvripplefill pvduotone pvlineart pvshadowstep pvbeadtext pvstamptext pvcutout pvhaloedge pvsplashbar pvdashrule pvtwocap pvtagline pvflagtext pvribbonrule pvbracketpool pvdotlead pxvolleyballnetmesh pxwaterpologoal pxrelaybaton pxdivingplatformedge pxsurfwaxbar pxpaddleboardrail pxkayakhullstripe pxcanoepaddleblade pxjetskihandle pxsailbatten pxsnorkeltubebend pxboogieboarddeck pxwakeboardbinding pxoarlockring pxlifejacketbuckle pxrashguardseam pxwetsuitzipper pxdivefinrubber pxtowropehandle pxwaterskitip pxtagbeltflag pxpaddleballface pxpoolfrisbeerim pxdartboardrings pxringtosspost pxsinkinggemtoy pxwaterpistolnozzle pxpoolbasketballnet pxkickballseams pxsandbaganchor pxbuoyancybelt pxfoambarbell pxaquajoggerbelt pxstepplatform pxwaterbikepedal pxpaceboardmarker pxaquaaerobicspole pxteamcapnumber pxscorenetcorner pxspikesplash pxdiveentryrip pxlapwakefan pxwaveballbounce pxtagtidering pxracelaneshimmer pxpoolpartybubbles pxkickturnfoam pxunderwatercheer pxgoalsplashcrest pxmatchpointglint pxscoreflipcard pxmatchclockbezel pxteamrosterstrip pxgamedaypass pxcaptainarmband pxrefereewhistletag pxwinnerbannerfold pxscoreboarddigits pxroundrobinchart pxpoolgametab pxmedalcountpill pxsportstenciltext pxteamslidetext pxgoallinetext pxscorechalktext pxbounceechotext pxrallyoutlinetext pxcourtmarkpill pxtimeouttoggle pxlevelupbadge pxmatchnotetag pxlaneracestrip pxdeckgamechalk pxsplashdodgeball pxtreasuredivechest pxpoolobstaclearch pxswimthroughhoop pxtugropeknot pxsprintstartmark pxpoolconestack pxdunktankseat pxraftracenumber pxpennantrelay pxsplashzonerope pxfairplayseal pxunderwaterhockeypu pxkidsrelaybib pxnetpostcap pxwavemachinepanel pxbeachcourtline pyterracottapot pyplanterbox pyhangingbasket pyfernfrondedge pysucculentrosette pyseedpacket pyplantmarkerstake pytrowelblade pywateringcanspout pygardenhosecoil pywheelbarrowtray pycompostbinslats pyflowerbededge pywindowbox pybirdbathripple pyraingaugetube pywindchimebars pysunstakelight pydewdropleaf pysteppingstonepath pygravelborder pyhedgetrim pytrellisdiamonds pypergolashade pymosaictabletop pypatioumbrellapole pycafechairback pyironscrollrail pybrickedging pyfountaintier pyrainchaincups pygardengatebars pypicketrow pydeckboardrun pylawnstripe pypoolfencepost pylatticescreen pyarborarch pygardenbenchslats pypaversbasketweave pytiledbacksplash pyoutdoorshowerpipe pypoolhouseroof pygardenlanterncage pystringlightbulbs pyhammockstand pydripline pysprinklerrow pyrainshowerstreaks pypuddlereflection pymorningmist pypondlilyring pywaterfallwallii pygardenpondedge pysundapplegrass pybreezesway pyeveningglowfade pygardenwelcomesign pyplantlabeltab pygardenjournalline pybrasshosetap pypotstandtag pybloomschedule pypationumberplate pyterracetab pyseedlingslidetext pyclayglazetext pygardenscript pystakeunderline pyleafshadowtext pychalkgardenboard pydewdroppill pyterracetoggle pyplantedstripecap pybirdhouseroof pyherbspiral pyraisedbedcorner pygardensundial pygazingball pypottingbenchtop pytwinespool pyprunerhandle pymulchchips pyvinetendril pymossstone pyfencerailcap pyclaysaucer pydownspoutrun pypondfountainspray pyhoneypotlid pzhotdogbun pzsoftpretzeltwist pznachochip pzfrybasketcone pzcorncobrows pzburgerstack pzpizzaslicewedge pzcorndogstick pzpopcornboxstripes pztacoshellfold pzgrilledskewer pzsandwichwedge pzchipbagcrimp pzwafflefrygrid pzeggrollcut pzbreadbasketcloth pzsnowconepaper pzmilkshakeglass pzsodafloatfoam pzsundaeboat pzpopsiclebite pzicecreamscoopdrip pzfrozenyogurtswirl pzicepopduo pzslushmachinewindow pzfrostedcuprim pzshavedicemound pzcandyappleglaze pzcottoncandycloud pzfunnelcakeswirl pzchurroridges pzwaffleconelattice pzlemonwheel pzorangeslicefan pzcherrystempair pzbendystrawbend pzcupliddome pzcocktailpickflag pzsodafountainnozzle pzfizzytonic pzsparklingsodapop pzlayeredpunch pzbluecuracaorim pzicedteaglass pzjuiceboxstraw pzsmoothiecupstripe pzwaterpitcherhandle pzcoconutwaterstraw pzicecubetray pzmenuboardchalk pzpricetagtie pzorderticketperf pzservingtrayrim pznapkindispenser pzcounterstoolseat pzorderwindowawning pzspecialboardbanner pzreceipttape pzloyaltypunchcard pzdailyspecialtab pzcombomealbadge pzcashdrawerslot pztipjarlid pzsundaescript pzsodapoptext pzfrostingtext pzsyrupdriptext pzorderuppill pzmenuitemrow pzkitchentimerdial pzallergydotbadge pzsnackcountdigits pzchefhatband pzpantrylabel pzdessertforktine pztraynumbertent pzfreshsqueezedseal pzcoldtab pzhottab pzberryskewer pzwatermelonrind pzpineapplecrown pzbananasplitdish pzlollipopspiral pzgummyring pzpoprockspack pzsprinkledust pzchocolatedipedge pzwhippedcreampeak pzpuddingcupfoil pqadmitticketperf pqrafflestub pqcoatchecktag pqlanyardbadge pqlostandfoundtag pqsigninsheet pqpunchcardholes pqstampcardgrid pqgiftcardstripe pqdaypassstrap pqfamilypassfold pqguestpasscorner pqseasonpassseal pqlockercombodial pqvaultkeytag pqziptietag pqluggagestraptag pqbookmarkribbon pqstickyflag pqindextab pqfoldertabedge pqlabelmakerstrip pqbarcodestrip pqcornermarkframe pqledgerline pqinvoiceheader pqtimesheetrow pqshiftcardslot pqrosterclip pqcalendarpagetop pqpartyinvitefold pqthankyounote pqenvelopeflap pqpostageperfedge pqhandstampsmudge pqcertificateborder pqawardrosettetail pqreportcardgrid pqswimtestcard pqlevelbadgepatch pqlessonschedulechar pqpoolrulescard pqclassrollcheck pqparentpickupsign pqwaiverline pqtearawaywristband pqwaterparkband pqeventbandwave pqvipbandfoil pqkidsbanddots pqdivestickerround pqsplashstickerburst pqhellonamelabel pqteachergoldstar pqhonorrollribbon pqminipennanttag pqeventwavebanner pqraffledrumnumber pqprizeticketstrip pqpassportpagemark pqclubcardcorner pqticketnumbertext pqstampedsealtext pqhandwrittenfill pqtypedformtext pqblackoutstrip pqhighlightpasstext pqdatestamprow pqpassslidetext pqlabelshadowtext pqclipframetext pqpinnotetext pqmemotab pqcheckedpill pquncheckedpill pqpriorityflagtext pqarchivefoldertab pqringbinderedge pqspiralnotebookedge pqgraphpapercell pqblueprintsheettick pqtornpageedge pqstickersheetrow pqwashitapedots pqwashitapestripe pqpapercliploop pqrubberbandloop pqstapleline pqholepunchstrip pqdesknameplate pjseigaihawavesprint pjginghamtowel pjhoundstoothdeck pjtropicalleafprint pjsunsetstripes pjshellprintfan pjfishscaleprint pjlatticediamondprin pjargylebeach pjterrazzochips pjmoirewaves pjopartrings pjmemphissquiggle pjconfettiburst pjpinstripecabana pjbuntingtriangles pjatomicstarburstpop pjboomerangwave pjbeachsidechecker pjpoolhalldiamonds pjrainbowarcprint pjretrosunrise pjwavepennantprint pjtickerstripe pjsailboatrow pjpostcardstamprow pjtoggleswitchon pjtoggleswitchoff pjslidertrack pjstepperdots pjsegmentedleft pjsegmentedright pjtooltipbubble pjnotificationtoast pjsearchfieldrim pjinputfocusglow pjcheckboxtile pjradiofloat pjtabpillactive pjtabpillidle pjbreadcrumbchevron pjpaginationdot pjcountbadge pjavatarring pjprogressringchip pjskeletonloader pjratingstars pjribbonbannerfold pjaccordionheader pjmenuitemhover pjdropdownchip pjdatechip pjtaginputpill pjcommandkeycap pjloadingbar pjdialogtitlebar pjstatusdotonline pjstatusdotbusy pjretromarqueetext pjsunsetgradienttext pjwavefilltext pjblockprintshadow pjoffsetprinttext pjinktraptext pjhairlinecaps pjpostercapstext pjneonprinttext pjlinocuttext pjgoogieboomerangbar pjmotelarrowsign pjdinercounterchrome pjjukeboxglowstripe pjsurfrockheader pjtikitotemband pjpolkadotsuit pjsunglasseslensrow pjparlourstripeawnin pjrollerrinkcarpet pjdriveinscreenframe pjbowlingpanelchevro pjhotrodflameedge pjscooterracingstrip pjseasidecarouselpol pjferriswheelspokes pjcottonstripecloud pjlidodeckrail pjcarnivalticketroll pjpoolhallsigntube pjpastelpapercut pjlinenweaveprint qacannonballcrown qatidalstripes qaskippingstone qaraindroprows qasprinklerfan qalapwake qafogbank qapondrings qawaterlinescallop qapuddleedge qadockreflection qaaquaprism qaladderrungs qadivingboardgrip qalanehook qaskimmerbasket qapoolwallclock qaconcretesteppingst qapoolumbrellastand qaslattedfence qapoolfloordots qadraincross qatileborderstrip qahottubcover qapoolgatelatch qalifeguardchairleg qapoolnoodleends qabeachballwedges qapoolloungerback qatubevalve qawatergunbarrel qasandpailhandle qashovelblade qakitetailbows qapoolraftseams qagogglestrapclip qabathtoyboat qadivebrick qawaterbombknot qaflipflopthong qaswimtrunkswaistban qarashvestpanels qawidebrimhat qasunblockbottle qatanlineband qazincnosestripe qaseashellridges qaanchortattoopatch qasandcastlecrenels qapalmfrondfan qacoconutshellhalves qaicedteacubes qalimewheel qapretzelsalt qacorndogskewer qanachocheesedrizzle qapizzasliceedge qafrankbunsplit qaicepopstick qasundaecherry qaslushielayers qahoneydipper qawaterbottlecap qaswimtestsign qabewaretriangle qahoursboard qaarrowpost qashowerheadplate qanumberdisc qawaxsealstamp qafoldedcornertag qaluggagestrap qaropeframe qaseigaihawaves qalifebuoybands qasunburstpanel qafishscaletiles qatropicalleafrows qacrosshatchtowel qadotmatrixsun qaargylefloat qaaquabead qafrostedlens qawaterlevelgauge qadigitaldepthsign qapagerdisplay qawetglasspane qadashunderglow qadoubleunderlinewav qacornerbrackets qbcafelightstrand qbpaperlanternribs qbglowsticksnap qbdiscoballfacets qbspotlightbeam qbneontubearc qbledstripsegments qbsparklerrays qbfireworkburst qbfloatingcandle qblaserfan qblavadotgrid qbballoonarchbubbles qbconfettipop qbstreamercurl qbpartyhorncone qbpinatafringe qbcupcakelinerpleats qbbirthdaycandlestri qbgiftribboncross qbpennantbunting qbcakelayers qbnapkintrianglefold qbphotopropmustache qbvinylgrooves qbequalizerbars qbspeakerconerings qbcassettewindow qbheadphoneband qbmicwindscreen qbpianokeyrow qbtapereelspokes qbpineapplerindscale qbmangoslicehatch qbcottoncandyfluff qbgummybearring qbjellybeanspeckle qbmarshmallowpillow qbcandiedpeeltwist qbbobapearls qbswirlpopcandy qbwafflebowlgrid qbwristbandloop qbticketstubperforat qbrafflerolledge qbboardingpassstrip qblanyardclip qbstickersheetpeel qbembossedlabeltape qbindexcardruling qbmaskingtapestrip qbstickynotecurl qbreceiptzigzag qbpostmarkcircles qbrescuebinocularlen qbraftvalvecap qbdrybagrolltop qbseascootergrip qbkelpribbon qbchannelmarkerbuoy qbfishingbobber qbnetfloatbeads qbanchorchainlinks qbhullwaterline qbshipwheelspokes qbmemphissquiggles qbatomicorbitrings qbcheckerflag qbzigzagchevronroll qbbauhausshapes qbstarburstbadge qbpolkaringdots qbsunrayposter qbplaidblanket qbquiltsquares qbdoilylace qbrickracktrim qbneonscriptunderlin qbblockshadowstack qbstencilcut qbwobbleoutline qbmarkerscribbleunde qbstickerhalotext qbchalkboardtext qbembossedlettering qbombresplitletters qbtickerhighlightbar qbunderconstructiont qbcloudbubble qbconfetticannonstre qcwrenchjaw qctapemeasureticks qchexbolthead qcscrewslot qcpaintchipstrip qcsawtoothedge qcpegboardholes qctoolboxlatch qclevelbubble qcclampjaw qcrivetplate qcworkbenchgrain qctentpeak qcsleepingbagquilt qccampfirelogs qccompassrose qctrailmarkerblaze qclanternmesh qccanteenstrap qcropecoil qcbinocularcord qcpinetreerow qcmarshmallowskewer qccampmugenamel qcfishbonespine qcsunriseoverhills qcwhittlestick qcboardwalkplanks qcobservationwheelsp qcskeeballrings qcarcadetoken qcclawmachineglass qcpinballbumper qcredemptionticketst qccarouselstripe qccottoncandycone qcrollercoastertrack qcbumpercarrail qcdunktanktarget qcsouvenirpennypress qcpipingedge qcribbontails qcscallopvalance qcfringetassels qcbindingtapeedge qcbuttonrow qczipteeth qcgrommetedge qcbasketweaveband qcherringbonestrip qcstitchedpatch qcwovenlabeledge qcriverbendlines qclakeglasssheen qccreekstonepath qcreedbed qcdragonflywing qclilypadnotch qctidechartwave qcpebblebeachdots qcwaterfallstreaks qcmoonlitwater qcdewonglass qcsaltsprayfleck qcthermosband qccoolerlidridge qciceblockchill qclemonwedge qcjuicepouchstraw qcpicniccheckcloth qcbasketlidhandle qccoffeesteam qcfieldguidetab qcmapfoldcrease qcmeritbadgeedge qcluggagetaghole qcpassportstampring qcseedpacketfold qctrailsigncarve qcreflectiontext qcneonoutlinesign qcpennantbannertext qcstrikeinkpen qcboldunderlinebar qcrubberstampslant qcgradientruletext qcledgerlinepaper qcfishingnetmesh qcweathervanearrow qcbarndoorbrace fdglassbtn fdtaskbar fdtitlebar fdaddress fdtab fdtooltip fdmenuitem fdscroll fdslider fdswitch fdcheck fdradio fdprogress fdspinner fdbadge fdsearchbox fdcombo fdtoolbar fdstatus fdsidebar fdmeadow fdrainbow fdcloudbank fddaisy fdsunrise fdreeds fdpebble fddewleaf fdseedling fdbutterfly fdladybug fdfireflies fdstarfield fdwaves fdcanyon fdtulips fdbirch fdmoss fdskyline fdrss fdcalendar fdclock fdbattery fdsignal fdvolume fddial fdtoggle fdnotepad fdcpu fddisk fdmail fdraindrop fdthermo fdcompass fdradar fdcamera fdmic fdspeaker fdremote fdpillduo fdhexgel fdoval fdtabletop fdgelstripe fdmirror fdbevel fdsoftbox fdemboss fdchrome fdpearlstrip fdruby fdcrystal fdlamp fdglasstxt fdreflect fdglowtxt fdgeltxt fdshadowtxt fdoutlinetxt fdgradtxt fdembosstxt fdneontxt fdwatertxt fdstripetxt fdbubbletxt fdfrosttxt fdmarkertxt fdcaps fdbreadcrumb fdlinkhover'.split(' '));
    const US_RE = /@([a-z0-9]+)(?:-([1-5]))?@([^@\n]+?)@/g;
    const classKey = (cls) => String(cls || '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
    const BY_CLASS = new Map();
    TRIGGERS.concat(HIGHLIGHTS).forEach((d) => { if (d[3] && !BY_CLASS.has(classKey(d[3]))) BY_CLASS.set(classKey(d[3]), d); });

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'note';

    // Short notices for OpenDB's {{templates}}, so Writeout and Bitbook show what they mean, with OpenDB's own glossy icons!
    const NOTICES = {
        'stub': ['stub', 'This is a stub: it could be expanded!'], 'more citations': ['question', 'This needs more sources!'], 'unreferenced': ['question', 'This does not cite any sources yet!'],
        'file improvement': ['image', 'This file could be improved!'], 'images needed': ['photo', 'This needs images!'], 'image needed': ['photo', 'This needs images!'], 'cleanup': ['tip', 'This may need cleanup!'], 'copy edit': ['tip', 'This may need copy editing!'],
        'too technical': ['tip', 'This may be too technical for most readers!'], 'outdated': ['exclamation', 'Parts of this may be out of date!'], 'disputed': ['exclamation', 'The accuracy of this is disputed!'],
        'expand': ['stub', 'This section needs more detail!'], 'orphan': ['info', 'No other entries link here yet!'], 'in use': ['info', 'This is being written right now!'],
        'merge': ['info', 'It has been suggested that this be merged with another entry!'],
    };
    const noticeIcon = (name) => '<img src="' + OPENDB + 'icons/' + name + '.png" alt="" aria-hidden="true" style="width:1.25em;height:1.25em;vertical-align:-0.25em;margin-right:0.3em">';
    const INLINE_TAGS = { 'citation needed': 'citation needed', 'cn': 'citation needed', 'fact': 'citation needed', 'clarify': 'clarification needed', 'dubious': 'dubious',
        'vague': 'vague', 'when': 'when?', 'who': 'who?', 'which': 'which?', 'page needed': 'page needed' };
    const tplName = (raw) => String(raw).split('|')[0].trim().toLowerCase().replace(/[\s_-]+/g, ' ');
    function tplHtml(raw, block) {
        const name = tplName(raw);
        const args = String(raw).split('|').slice(1).map((s) => s.trim()).filter(Boolean);
        let text = INLINE_TAGS[name] ? '[' + INLINE_TAGS[name] + ']' : NOTICES[name] && NOTICES[name][1];
        if (!text && /^(main|see also|further|distinguish|about)$/.test(name)) text = '↪ ' + name.replace(/^./, (c) => c.toUpperCase()) + ': ' + args.join(', ');
        if (!text) text = '⚑ {{' + raw + '}}';
        else if (args.length && NOTICES[name]) text += ' (' + args.join(', ') + ')';
        const tag = block ? 'div' : 'span';
        return '<' + tag + ' class="kd-tpl' + (block ? ' kd-tpl-block' : '') + '" data-kd-tpl="' + esc(raw) + '" contenteditable="false">' + (NOTICES[name] ? noticeIcon(NOTICES[name][0]) : '') + esc(text) + '</' + tag + '>';
    }

    function mathHtml(tex, display) {
        tex = String(tex).replace(/\u00A0/g, ' ');
        const inner = typeof root.kdMathHTML === 'function' ? root.kdMathHTML(tex, display) : '<code class="kd-math-src">' + esc((display ? '$$' : '$') + tex + (display ? '$$' : '$')) + '</code>';
        const tag = display ? 'div' : 'span';
        return '<' + tag + ' class="kd-math' + (display ? ' kd-math-display' : '') + '" contenteditable="false" data-tex="' + esc(tex) + '" data-display="' + (display ? '1' : '0') + '" title="Double-click to edit this equation!">' + inner + '</' + tag + '>';
    }

    /* ---------- The toolbar's formatting, pictures and files, as Keydown ---------- */
    // [words]{color=#dc2626 bg=#fde047 font="Georgia" size=24px weight=600}: any of them, in any order
    const STYLED_RE = /\[([^[\]\n]+)\]\{((?:\s*(?:color|bg|font|size|weight)=(?:"[^"\n]*"|[^\s}"]+))+\s*)\}/g;
    const STYLE_PROPS = { color: 'color', bg: 'background-color', font: 'font-family', size: 'font-size', weight: 'font-weight' };
    const COLOR_OK = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\))$/i;
    function styleCss(attrs) {
        const css = [];
        String(attrs).replace(/(color|bg|font|size|weight)=("([^"\n]*)"|[^\s}"]+)/g, (_, k, raw, quoted) => {
            const v = (quoted !== undefined ? quoted : raw).trim();
            const ok = k === 'color' || k === 'bg' ? COLOR_OK.test(v)
                : k === 'size' ? /^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(v)
                : k === 'weight' ? /^([1-9]00|bold|normal)$/.test(v)
                : /^[^;:<>"{}]{1,80}$/.test(v);
            if (ok) css.push(STYLE_PROPS[k] + ': ' + (k === 'font' ? "'" + v.replace(/'/g, '') + "'" : v));
            return '';
        });
        return esc(css.join('; '));
    }
    const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    // rgb(220, 38, 38) -> #dc2626 (and rgba with its alpha), so saved colors stay short and readable
    function cssColor(v) {
        const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(String(v).trim());
        if (!m) return String(v).trim().replace(/\s+/g, '');
        return '#' + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]) + (m[4] !== undefined && +m[4] < 1 ? hex2(+m[4] * 255) : '');
    }
    const DECO_PAL = {R:'#ef4444',O:'#f97316',GL:'#ea9f08',Y:'#ead708',L:'#84cc16',G:'#10b981',TU:'#30e5cd',T:'#06b6d4',C:'#30d3e5',B:'#3b82f6',PR:'#a855f7',PK:'#ec4899',SL:'#b4b4b4'};  // the Annotate / Draw ink colors
    // an underline/strike's own color as the [color] that goes before its markers: a code (R) for the palette colors, else #hex, else nothing
    function decoPrefix(el) {
        const c = el.style && el.style.textDecorationColor; if (!c) return '';
        const h = cssColor(c).toLowerCase(); if (!/^#[0-9a-f]{3,8}$/.test(h)) return '';
        const code = Object.keys(DECO_PAL).find((k) => DECO_PAL[k] === h);
        return '[' + (code || h) + ']';
    }
    function decoMarks(el) {
        const t = el.tagName, pre = decoPrefix(el);
        if (t === 'U') return el.classList.contains('kd-wavy') ? [pre + '~_', '_~'] : [pre + '__', '__'];
        return [pre + '-_', '_-'];
    }
    const quoteIf = (v) => (/[\s}"]/.test(v) ? '"' + v.replace(/"/g, '') + '"' : v);
    // an element's own toolbar styles as {color=... bg=...}, or '' when it has none
    const FONT_SIZES = { 1: '10px', 2: '13px', 3: '16px', 4: '18px', 5: '24px', 6: '32px', 7: '48px' };
    function styleAttrs(el) {
        const out = [];
        const st = el.style || {};
        const color = st.color || (el.tagName === 'FONT' && el.getAttribute('color')) || '';
        const bg = st.backgroundColor || '';
        const font = (st.fontFamily || (el.tagName === 'FONT' && el.getAttribute('face')) || '').replace(/["']/g, '').trim();
        const size = st.fontSize || (el.tagName === 'FONT' && FONT_SIZES[el.getAttribute('size')]) || '';
        const weight = st.fontWeight || '';
        if (color) out.push('color=' + quoteIf(cssColor(color)));
        if (bg && !/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test(bg)) out.push('bg=' + quoteIf(cssColor(bg)));
        if (font) out.push('font=' + quoteIf(font));
        if (/^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(size)) out.push('size=' + size);
        if (/^([1-9]00|bold|normal)$/.test(weight)) out.push('weight=' + weight);
        return out.length ? '{' + out.join(' ') + '}' : '';
    }
    const FILE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>';
    // the same pill Writeout and Bitbook make when you attach a file (its bytes ride along in the attributes)
    function fileChipHtml(name, type, src, b64) {
        const size = Math.max(0, Math.floor(String(b64 || '').length * 3 / 4) - (/==$/.test(b64) ? 2 : /=$/.test(b64) ? 1 : 0));
        const stem = String(name).replace(/\.[a-z0-9]{1,8}$/i, '') || name;
        return '<span class="file-chip" spellcheck="false" contenteditable="false" data-filename="' + esc(name) + '" data-filetype="' + esc(type) + '" data-filesize="' + size +
            '" data-filedata="' + esc(src) + '"><span>' + FILE_ICON + '</span><span class="file-chip-name">' + esc(stem) + '</span></span>';
    }

    /* ---------- @@table=[a1h:'Name',b1:'Score',a2:'Ann',b2:'#O#9#']{green}: a table, cell by cell ---------- */
    // a1, b2, c3... name the cells (columns a to o, rows 1 and up), and an h after the name (a1h) makes it a header.
    // A row is a header row when its first cell is a header (aNh), and then its whole row is headers! An h cell on
    // another row moves up to the nearest header row above it (or the first one, when none is above). Each header row
    // after the first starts a new part of the table. Cell text is Keydown (chips, bold...), and \' writes a quote.
    const AT_TABLE = '@@table=[';
    function readAtTable(s, at) {
        let i = at + AT_TABLE.length;
        const cells = [];
        let closed = false;
        while (i < s.length) {
            while (s[i] === ' ' || s[i] === ',') i++;
            if (s[i] === ']') { i++; closed = true; break; }
            const m = /^([a-oA-O])(\d{1,3})([hH]?)\s*:\s*'/.exec(s.slice(i, i + 12));
            if (!m || +m[2] < 1) return null;
            i += m[0].length;
            let text = '';
            while (i < s.length && s[i] !== "'") {
                if (s[i] === '\\' && s[i + 1] === "'") { text += "'"; i += 2; } else text += s[i++];
            }
            if (s[i] !== "'") return null;
            i++;
            cells.push({ col: m[1].toLowerCase().charCodeAt(0) - 97, row: +m[2], h: !!m[3], text: text });
            if (cells.length > 3000) return null;
        }
        if (!closed) return null;
        const sm = /^\{([a-z]+)\}/.exec(s.slice(i));
        if (sm) i += sm[0].length;
        return { cells: cells, end: i, style: sm ? sm[1] : 'blue' };
    }
    function atTableHtml(t, opts) {
        const cells = t.cells;
        let heads = [...new Set(cells.filter((c) => c.h && c.col === 0).map((c) => c.row))].sort((a, b) => a - b);
        if (!heads.length && cells.some((c) => c.h)) heads = [Math.min(...cells.filter((c) => c.h).map((c) => c.row))];
        const grid = new Map();
        const key = (r, c) => r + ':' + c;
        // the cells as written first, then the header cells moved up to their header row (never over a written cell)
        cells.forEach((c) => { if (!c.h || heads.includes(c.row)) grid.set(key(c.row, c.col), c.text); });
        cells.filter((c) => c.h && !heads.includes(c.row)).forEach((c) => {
            const above = heads.filter((h) => h <= c.row);
            const r = above.length ? above[above.length - 1] : heads[0];
            if (!grid.get(key(r, c.col))) grid.set(key(r, c.col), c.text);
            else if (!grid.has(key(c.row, c.col))) grid.set(key(c.row, c.col), c.text);
        });
        const rows = Math.max(1, ...[...grid.keys()].map((k) => +k.split(':')[0]));
        const cols = Math.max(1, ...cells.map((c) => c.col + 1));
        const rowHtml = (r) => {
            const head = heads.includes(r);
            let h = '<tr' + (head && r !== 1 ? ' class="rt-head-row"' : '') + '>';
            for (let c = 0; c < cols; c++) {
                const v = grid.get(key(r, c));
                const tag = head ? 'th' : 'td';
                h += '<' + tag + '>' + (v ? inline(v, opts) : '<br>') + '</' + tag + '>';
            }
            return h + '</tr>';
        };
        let html = '<table class="rt-table rt-' + esc(t.style) + '" data-kd-at="1">';
        let r = 1;
        if (heads.includes(1)) { html += '<thead>' + rowHtml(1) + '</thead>'; r = 2; }
        html += '<tbody>';
        for (; r <= rows; r++) html += rowHtml(r);
        return html + '</tbody></table>';
    }
    // every @@table=[...] in a piece of text, drawn as a table
    function atTables(s, opts, stash) {
        let at = s.indexOf(AT_TABLE);
        while (at !== -1) {
            const t = readAtTable(s, at);
            if (!t) { at = s.indexOf(AT_TABLE, at + AT_TABLE.length); continue; }
            const ph = stash(atTableHtml(t, Object.assign({}, opts, { notes: opts.notes || {} })));
            s = s.slice(0, at) + ph + s.slice(t.end);
            at = s.indexOf(AT_TABLE, at + ph.length);
        }
        return s;
    }
    // a table back as @@table=[...]: header rows say so with their first cell (a1h), every other cell as written
    function atTableText(el) {
        const parts = [];
        const rows = Array.from(el.rows);
        let lastRow = 0, lastCol = 0;
        rows.forEach((tr, ri) => {
            const cells = Array.from(tr.cells).slice(0, 15);
            const head = cells.length > 0 && cells.every((c) => c.tagName === 'TH');
            cells.forEach((c, ci) => {
                lastRow = Math.max(lastRow, ri + 1); lastCol = Math.max(lastCol, ci);
                const text = Array.from(c.childNodes).map(inlineText).join('').replace(/\s*\n\s*/g, ' ').trim();
                if (!text && !(head && ci === 0)) return;
                parts.push(String.fromCharCode(97 + ci) + (ri + 1) + (head && ci === 0 ? 'h' : '') + ":'" + text.replace(/'/g, "\\'") + "'");
            });
        });
        // the bottom-right cell is always written, so empty rows and columns at the end come back too
        const corner = String.fromCharCode(97 + lastCol) + lastRow;
        if (lastRow && !parts.some((p) => p.startsWith(corner + ':') || p.startsWith(corner + 'h:'))) parts.push(corner + ":''");
        const style = (/(?:^|\s)rt-(?!table)([a-z]+)/.exec(el.className) || [])[1];
        return '@@table=[' + parts.join(',') + ']' + (style && style !== 'blue' ? '{' + style + '}' : '');
    }

    /* ---------- Keydown text -> editor HTML ---------- */
    // opts: { title(id) -> a title for [[id]] links, media(id) -> an image address or null, notes: { count } }
    function inline(text, opts) {
        const store = [];
        const stash = (html) => { store.push(html); return '\u0001' + (store.length - 1) + '\u0001'; };
        let s = String(text);
        // ``` fences are taken literally too (up to the closing ```, or the end if it never comes)
        s = s.replace(/```[\s\S]*?(?:```|$)/g, (m) => stash(esc(m)));
        // @@table=[a1h:'Name',b1:'Score'...] tables, before anything else can touch the text in their cells
        s = atTables(s, opts, stash);
        // `code` is taken literally, so nothing inside it turns into links, math or chips
        s = s.replace(/`([^`\n]+)`(?:\{(terminal|dark|paper|blueprint|neon|ember|gel|key)\})?/g, (_, t, st) => stash(st ? '<code class="kd-ic kd-ic-' + st + '">' + esc(t) + '</code>' : '<code>' + esc(t) + '</code>'));
        // [__8] is a blank to write in ([##8] is an empty box instead) (8 characters wide); [__8|answer] hides the answer until it is clicked (width and answer are optional)
        s = s.replace(/\[(__|##)(\d{1,2})?(?:\|([^\]\n]*))?\]/g, (_, kind, w, ans) => stash('<span class="kd-fill' + (kind === '##' ? ' kd-fill-box' : '') + '" data-w="' + (w || 6) + '"' + (ans ? ' data-answer="' + esc(ans) + '"' : '') + ' style="--w:' + (w || 6) + '" contenteditable="false"></span>'));
        // {{templates}} and Keydown Next's {{live values}} before math, so a "$" inside them stays a "$"
        s = s.replace(/\{\{([^{}]+)\}\}/g, (_, raw) => stash(tplHtml(raw, false)));
        s = s.replace(/\\\$/g, () => stash('<span class="kd-esc">$</span>'));
        s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash(mathHtml(t.trim(), true)));
        s = s.replace(/(^|[^\w$])\$(?=\S)([^$\n]*?\S)\$(?![\w$])/g, (_, pre, t) => pre + stash(mathHtml(t, false)));
        // a backslash keeps the next symbol as itself (\#R#x# stays "#R#x#"), and \\ is one backslash; letters and digits are never touched
        s = s.replace(/\\([^A-Za-z0-9\s])/g, (_, c) => stash('<span class="kd-esc">' + esc(c) + '</span>'));
        s = s.replace(new RegExp(SKILL_RE), (m, name, raw) => { if (!SKILL_NAMES.test(name)) return m; const h = skillHtml(name, parseParams(raw.replace(/\\"/g, '"'))); return h ? stash(h) : m; });
        // [[id]] shows the entry's title; data-kd-auto remembers that, so it saves back as [[id]] (unless you change the words)
        s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
            const text = label || (opts.title && opts.title(id)) || id;
            return stash('<a class="kd-link" data-kd-link="' + id + '"' + (label ? '' : ' data-kd-auto="' + esc(text) + '"') + ' href="' + OPENDB + '#/e/' + id + '" target="_blank" rel="noopener">' + esc(text) + '</a>');
        });
        s = s.replace(/\[\^([^\]\s][^\]]*)\]/g, (_, label) => {
            const n = (opts.notes[slug(label)] = (opts.notes[slug(label)] || 0) + 1);
            return stash('<a class="kd-footnote-ref" id="fnref-' + slug(label) + '-' + n + '" href="#fn-' + slug(label) + '" spellcheck="false">' + esc(label) + '</a>');
        });
        // pictures and attached files that travel inside the file itself:
        // ![alt](data:image/png;base64,...){width=240px} and [report.pdf](data:application/pdf;base64,...){file}
        // (an image on top of the document: ![alt](data:...){overlay x=120 y=60 w=240 h=180 r=30})
        s = s.replace(/!\[([^\]\n]*)\]\((data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\)(?:\{width=(\d+(?:\.\d+)?)px\}|\{overlay ([^}\n]*)\})?/gi, (_, alt, src, w, ov) => {
            if (ov !== undefined) {
                const g = (k) => { const m = new RegExp('(?:^|\\s)' + k + '=(-?\\d+(?:\\.\\d+)?)').exec(ov); return m ? +m[1] : 0; };
                const ow = Math.max(24, g('w') || 240), oh = Math.max(24, g('h') || ow);
                return stash('<div class="kd-overlay" contenteditable="false" data-kd-overlay="1" style="position:absolute;z-index:40;left:' + g('x') + 'px;top:' + g('y') + 'px;width:' + ow + 'px;height:' + oh + 'px;' + (g('r') ? 'transform:rotate(' + g('r') + 'deg);' : '') + '"><img src="' + src + '" alt="' + esc(alt) + '" draggable="false"></div>');
            }
            return stash('<span class="img-resize"' + (w ? ' style="width: ' + w + 'px;"' : '') + '><img src="' + src + '" alt="' + esc(alt) + '"></span>');
        });
        s = s.replace(/\[([^\]\n]+)\]\((data:([a-z0-9.+-]+\/[a-z0-9.+-]+)?;base64,([A-Za-z0-9+/=]*))\)\{file\}/gi, (_, name, src, type, b64) => stash(fileChipHtml(name, type || '', src, b64)));
        s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|#)[^)\s]+)\)/g, (_, t, u) => stash('<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>'));
        // Keydown triggers: the inside of each goes through the triggers too, so a highlight can hold bold or a chip!
        const triggers = (str) => {
            // the toolbar's own formatting: [words]{color=#dc2626 bg=#fde047 font="Georgia" size=24px weight=600}
            str = str.replace(new RegExp(STYLED_RE), (m, body, attrs) => {
                const css = styleCss(attrs);
                return css ? stash('<span style="' + css + '">\u0002' + triggers(body) + '\u0003</span>') : m;
            });
            str = str.replace(new RegExp(US_RE), (m, fam, n, body) => (US_FAMS.has(fam) ? stash('<span class="us-chip us-' + fam + ' us-' + fam + '-' + (n || 1) + '" spellcheck="false">\u0002' + triggers(body.trim()) + '\u0003</span>') : m));
            // (a fresh copy each time: the same /g pattern used again inside its own replace would loop forever)
            str = str.replace(new RegExp(HL_RE), (m, k, body, end) => stash('<mark class="an-hl an-hl-' + HL_COLORS.find((x) => x[0] === k)[1] +
                HL_STYLES.find((x) => x[0] === '#' + end)[1] + '" spellcheck="false">\u0002' + triggers(body.trim()) + '\u0003</mark>'));
            str = str.replace(new RegExp(AN_RE), (m, k, name, body) => (name in AN_BY ? stash('<mark class="an-hl an-hl-' + HL_COLORS.find((x) => x[0] === k)[1] + AN_BY[name] + '" spellcheck="false">\u0002' + triggers(body.trim()) + '\u0003</mark>') : m));
            str = str.replace(new RegExp(INK_RE), (m, k, body) => stash('<mark class="an-hl an-hl-' + HL_COLORS.find((x) => x[0] === k)[1] + ' an-s-ink" spellcheck="false">\u0002' + triggers(body.trim()) + '\u0003</mark>'));
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
            // &sparklet&: a lone & on each side, hugging the words (not inside a word like AT&T, and never part of &&)
            str = str.replace(/(^|[^\w&])&(?=[^\s&])([^\s&](?:[^&\n]*[^\s&])?)&(?![\w&])/g, (m, pre, body) => pre + stash('<span class="sparklet-text" spellcheck="false">\u0002' + triggers(body) + '\u0003</span>'));
            // [color]__underline__, [color]~_wavy underline_~ and [color]-_strike_-, hugging the words (the [color] is optional: a code like R or a #hex)
            // (the old single _underline_ still reads as an underline too; never inside snake_case words, and not a [__ fill-in blank)
            const decoTag = (kind, c, body, pre) => {
                const col = c ? (DECO_PAL[c] || (/^#/.test(c) ? c : '')) : '';
                if (c && !col) return null;
                const st = col ? ' style="text-decoration-color:' + col + '"' : '';
                const open = kind === 's' ? '<s' + st + '>' : kind === 'w' ? '<u class="kd-wavy"' + st + '>' : '<u' + st + '>';
                return pre + stash(open + '\u0002' + triggers(body) + '\u0003</' + (kind === 's' ? 's' : 'u') + '>');
            };
            str = str.replace(/(^|[^\w\[])(?:\[(#[0-9a-fA-F]{3,8}|[A-Z]{1,2})\])?~_(?=[^\s_])([^\n]*?[^\s_])_~(?!\w)/g, (m, pre, c, body) => decoTag('w', c, body, pre) || m);
            str = str.replace(/(^|[^\w\[-])(?:\[(#[0-9a-fA-F]{3,8}|[A-Z]{1,2})\])?-_(?=[^\s_])([^\n]*?[^\s_])_-(?!\w)/g, (m, pre, c, body) => decoTag('s', c, body, pre) || m);
            str = str.replace(/(^|[^\w_\[])(?:\[(#[0-9a-fA-F]{3,8}|[A-Z]{1,2})\])?__(?=[^\s_])([^\n]*?[^\s_])__(?![\w_\]])/g, (m, pre, c, body) => decoTag('u', c, body, pre) || m);
            str = str.replace(/(^|[^\w_\[])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\w_\]])/g, (m, pre, body) => pre + stash('<u>\u0002' + triggers(body) + '\u0003</u>'));
            return str;
        };
        s = triggers(s);
        // escape what is left as plain text, then put the stashed pieces back (a trigger's inside is drawn the same way, so they can nest)
        const render = (raw) => esc(raw).replace(/\u0001(\d+)\u0001/g, (_, i) => (store[+i] || '').replace(/\u0002([\s\S]*?)\u0003/g, (__, inner) => render(inner)));
        return render(s);
    }

    // Tables are pipe tables: | a | b | rows, a | --- | --- | line under the header row (or first, for no header),
    // and an optional {style} after it (| --- | --- |{green}). A | inside a cell is written \|.
    const TABLE_SEP = /^\|(\s*:?-{3,}:?\s*\|)+(\{([a-z]+)\})?$/;
    function tableHtml(block, opts) {
        const sep = block.findIndex((l) => TABLE_SEP.test(l));
        if (sep !== 0 && sep !== 1) return null;
        const style = (TABLE_SEP.exec(block[sep])[3]) || 'blue';
        const cells = (line) => line.replace(/^\|/, '').replace(/(^|[^\\])\|$/, '$1').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
        const row = (line, tag) => '<tr>' + cells(line).map((c) => '<' + tag + '>' + (c ? inline(c, opts) : '<br>') + '</' + tag + '>').join('') + '</tr>';
        const body = block.filter((l, k) => k !== sep && !(sep === 1 && k === 0));
        return '<table class="rt-table rt-' + esc(style) + '">' + (sep === 1 ? '<thead>' + row(block[0], 'th') + '</thead>' : '') +
            '<tbody>' + (body.length ? body.map((l) => row(l, 'td')).join('') : '') + '</tbody></table>';
    }

    // Bullet styles! "* " is the round bullet; "- " a dash, "+ " a plus, ". " a ring, "~ " a diamond and "= " an arrow.
    const BL_CLS = { '*': '', '-': 'kd-bl-dash', '+': 'kd-bl-plus', '.': 'kd-bl-ring', '~': 'kd-bl-diamond', '=': 'kd-bl-arrow' };
    const BL_MARK = (el) => { for (const k in BL_CLS) if (BL_CLS[k] && el.classList && el.classList.contains(BL_CLS[k])) return k; return '*'; };
        /* ``` code blocks: ```lang{style lines|Title} ... ``` (style = terminal mac dark paper blueprint neon ember gel diff) */
    const CODE_STYLES = ['terminal', 'mac', 'dark', 'paper', 'blueprint', 'neon', 'ember', 'gel', 'diff'];
    function codeFence(info, body) {
        const m = /^\s*([A-Za-z0-9_+#.-]*)\s*(?:\{([^{}]*)\})?\s*$/.exec(info || '');
        const raw = body.join('\n');
        if (!m || (!m[1] && !m[2])) return '<pre><code>' + esc(raw) + '</code></pre>';
        const parts = (m[2] || '').split('|');
        const words = parts[0].split(/\s+/).filter(Boolean);
        const style = words.filter((w) => CODE_STYLES.indexOf(w) !== -1)[0] || '';
        const lines = words.indexOf('lines') !== -1, title = parts.slice(1).join('|').trim();
        const diff = style === 'diff';
        const rows = body.map((l) => '<span class="kd-ln' + (diff ? (/^\+/.test(l) ? ' kd-ln-add' : /^-/.test(l) ? ' kd-ln-del' : '') : '') + '">' + esc(l) + '</span>').join('\n');
        return '<pre class="kd-cb' + (style ? ' kd-cb-' + style : '') + (lines ? ' kd-cb-lines' : '') + '" data-kd-info="' + esc(info.trim()) + '"' + (title ? ' data-title="' + esc(title) + '"' : '') + (m[1] ? ' data-lang="' + esc(m[1]) + '"' : '') + '><code>' + rows + '</code></pre>';
    }

    function textToHtml(src, opts) {
        opts = Object.assign({ notes: {} }, opts || {});
        const lines = String(src || '').replace(/\r/g, '').split('\n');
        const out = [];
        let list = null, listCls = '';
        const endList = () => { if (list) { out.push('<ul class="bulleted-list' + (listCls ? ' ' + listCls : '') + '">' + list.join('') + '</ul>'); list = null; } };
        for (let i = 0; i < lines.length; i++) {
            let t = lines[i].trim();
            let m;
            // ;;pk{ Poolside Keydown } is read as ONE block (its lines are not Keydown, so none of them is formatted here)
            if (t.startsWith(';;pk{')) {
                let acc = '', end = -1, j = i;
                for (; j < lines.length && j - i < 150; j++) {
                    acc += (j > i ? '\n' : '') + (j === i ? lines[j].replace(/^\s+/, '') : lines[j]);
                    let depth = 0;
                    for (let k = 4; k < acc.length; k++) { const c = acc[k]; if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) { end = k; break; } } }
                    if (end >= 0) break;
                }
                if (end >= 0 && !acc.slice(end + 1).trim()) {
                    endList();
                    const srcText = acc.slice(0, end + 1), inner = srcText.slice(srcText.indexOf('{') + 1, srcText.lastIndexOf('}')).replace(/^\n/, '').replace(/\n$/, '');
                    let body;
                    try { body = root.PK && root.PK.toKD ? textToHtml(root.PK.toKD(inner), opts) : esc(srcText); } catch (e) { body = esc(srcText); }
                    out.push('<div class="kdx kdx-block kdx-pk kd-pk" contenteditable="false" data-kd-src="' + esc(srcText) + '">' + body + '</div>');
                    i = j;
                    continue;
                }
            }
            // a pipe table is checked first (| a | b | rows with a | --- | line), so a leading | on any other line can be an indent
            if (/^\|.*\|(\{[a-z]+\})?$/.test(t)) {
                const block = [];
                let j = i;
                while (j < lines.length && /^\|.*\|(\{[a-z]+\})?$/.test(lines[j].trim())) block.push(lines[j++].trim());
                const html = tableHtml(block, opts);
                if (html) { endList(); out.push(html); i = j - 1; continue; }
            }
            // each | (or old-style tab) at the start of a line is one indent step
            const lead = (/^[\t|]*/.exec(t) || [''])[0].length;
            const tabs = Math.min(8, lead);
            if (lead) t = t.slice(lead).trim();
            // {align=center} at the start of a line lines it up like the toolbar's align buttons
            const am = /^\{align=(left|center|right|justify)\}\s*/.exec(t);
            const align = am ? am[1] : '';
            if (am) t = t.slice(am[0].length);
            const ind = (h) => {
                const st = (tabs ? 'text-indent: ' + tabs * 2.5 + 'rem;' : '') + (align ? ' text-align: ' + align + ';' : '');
                return st ? h.replace(/^<(\w+)/, '<$1 style="' + st.trim() + '"') : h;
            };
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
                out.push(codeFence(t.slice(3), body));
                continue;
            }
            if (t.startsWith(AT_TABLE)) {
                const at = readAtTable(t, 0);
                if (at && at.end === t.length) { endList(); out.push(ind(atTableHtml(at, opts))); continue; }
            }
            if ((m = /^([*+\-.~=])\s+(\S.*)$/.exec(t))) { if (list && listCls !== BL_CLS[m[1]]) endList(); listCls = BL_CLS[m[1]]; (list = list || []).push('<li>' + inline(m[2], opts) + '</li>'); continue; }
            endList();
            if (!t) { out.push('<div><br></div>'); continue; }
            if ((m = /^\{\{([^{}]+)\}\}$/.exec(t)) && !INLINE_TAGS[tplName(m[1])]) { out.push(tplHtml(m[1], true)); continue; }
            if ((m = /^(#{1,4})\s+(\S.*)$/.exec(t))) {
                const n = m[1].length;
                out.push(ind(n === 4 ? '<h1 class="mega-header">' + inline(m[2], opts) + '</h1>' : '<h' + n + ' class="header-' + n + '">' + inline(m[2], opts) + '</h' + n + '>'));
                continue;
            }
            // !> ?> >> %> *> +> -> => ~> $> #> ^> @> &> start a styled quote (a warning, a question, a pull quote...)
            // (quote lines that follow with the SAME symbol join the quote as its next lines; a line with only the symbol is a blank line inside it)
            const quoteMore = (sym) => {
                const parts = []; let n = 0;
                for (let j = i + 1; j < lines.length; j++) {
                    const q = BQ_LINE.exec(lines[j].trim());
                    if (!q || q[1] !== sym) break;
                    parts.push(q[2] || ''); if (q[2]) n = parts.length;
                }
                parts.length = n; i += n;
                return parts.map((x) => '<br>' + (x ? inline(x, opts) : '<br>')).join('').replace(/<br><br><br>/g, '<br><br>');
            };
            if ((m = /^(!>|\?>|>>|%>|\*>|\+>|->|=>|~>|\$>|#>|\^>|@>|&>)\s+(\S.*)$/.exec(t))) { const first = inline(m[2], opts); out.push(ind('<blockquote class="blockquote-list kd-bq kd-bq-' + BQ_BY_SYM[m[1]] + '">' + first + quoteMore(m[1]) + '</blockquote>')); continue; }
            if ((m = /^>\s+(\S.*)$/.exec(t))) { const first = inline(m[1], opts); out.push(ind('<blockquote class="blockquote-list">' + first + quoteMore('>') + '</blockquote>')); continue; }
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
            if (/^\$\$/.test(t) && (t.match(/\$\$/g) || []).length === 1) {
                // $$ ... (more lines) ... $$: one centered equation
                let j = i + 1;
                while (j < lines.length && j - i <= 400 && (lines[j].match(/\$\$/g) || []).length === 0) j++;
                if (j < lines.length && (lines[j].match(/\$\$/g) || []).length === 1 && /\$\$\s*$/.test(lines[j])) {
                    const tex = [t].concat(lines.slice(i + 1, j + 1)).join('\n').replace(/^\$\$/, '').replace(/\$\$\s*$/, '').trim();
                    if (tex) { out.push(mathHtml(tex, true)); i = j; continue; }
                }
            }
            if (/^\$\$[\s\S]*\$\$$/.test(t)) { out.push(mathHtml(t.slice(2, -2).trim(), true)); continue; }
            if (/^::[a-z]+(\{[^}]*\})?$/.test(t) && blockFromLine(t)) { out.push(blockFromLine(t)); continue; }
            out.push(ind('<div>' + inline(t, opts) + '</div>'));
        }
        endList();
        return out.join('');
    }

    /* ---------- editor HTML -> Keydown text ---------- */
    const BLOCK = /^(P|DIV|H1|H2|H3|H4|H5|H6|UL|OL|LI|BLOCKQUOTE|PRE|FIGURE|TABLE|SECTION|ARTICLE|HR)$/;
    // Plain words that only look like Keydown (#R#x##, **y**) keep their symbols as themselves when the file opens: \#R\#x\#\#
    const MAYBE_TAG = /[#*~=%!@^_+;[\]{}$`|\\<>&]/;
    const unEsc = (h) => h.replace(/<span class="kd-esc">([^<]*)<\/span>/g, '$1');
    let RAW_TEXT = false;
    function asPlain(raw) {
        if (RAW_TEXT) return raw;
        const t = raw.replace(/\$/g, '\\$');
        if (!MAYBE_TAG.test(raw) || unEsc(inline(t, { notes: {} })) === esc(raw)) return t;
        return raw.replace(/[#*~=%!@^_+;[\]{}$`|\\<>&]/g, '\\$&');
    }
    function inlineText(node) {
        if (node.nodeType === 3) return asPlain(node.nodeValue.replace(/​/g, '').replace(/ /g, ' '));
        if (node.nodeType !== 1) return '';
        const el = node;
        const kids = () => Array.from(el.childNodes).map(inlineText).join('');
        const tag = el.tagName;
        if (el.hasAttribute('data-kd-tpl')) return '{{' + el.getAttribute('data-kd-tpl') + '}}';
        // Keydown Next (keydown-next.js): blocks, live values and @style lines save as the text they were made from
        if (el.classList.contains('kdx') && el.hasAttribute('data-kd-src')) return el.getAttribute('data-kd-src');
        // an escaped symbol saves with its backslash, so it stays plain next time too
        if (el.classList.contains('kd-fill')) return (el.classList.contains('kd-fill-box') ? '[##' : '[__') + (el.getAttribute('data-w') && el.getAttribute('data-w') !== '6' ? el.getAttribute('data-w') : '') + (el.getAttribute('data-answer') ? '|' + el.getAttribute('data-answer') : '') + ']';
        if (el.classList.contains('kd-esc')) return '\\' + el.textContent;
        if (el.matches(SKILL_SEL) && !el.classList.contains('bl-prog')) return skillToText(el);
        if (el.classList.contains('kd-math')) {
            const tex = el.getAttribute('data-tex') || '';
            return el.getAttribute('data-display') === '1' ? '$$' + tex + '$$' : '$' + tex + '$';
        }
        if (tag === 'BR') return '\n';
        if (tag === 'IMG') {
            const src = el.getAttribute('src') || '';
            return /^(https:\/\/|data:image\/[a-z0-9.+-]+;base64,)/i.test(src) ? '![' + (el.getAttribute('alt') || '').replace(/[\]\n]/g, '') + '](' + src + ')' : '';
        }
        // an image on top of the document: ![alt](data:...){overlay x=120 y=60 w=240 h=180}
        if (el.classList.contains('kd-overlay')) {
            const img = el.querySelector('img');
            const pic = img ? inlineText(img) : '';
            const n = (p) => Math.round((parseFloat(el.style[p]) || 0) * 10) / 10;
            const tr = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform || '');
            return pic ? pic + '{overlay x=' + n('left') + ' y=' + n('top') + ' w=' + n('width') + ' h=' + n('height') + (tr && parseFloat(tr[1]) ? ' r=' + Math.round(parseFloat(tr[1]) * 10) / 10 : '') + '}' : '';
        }
        // a picture you inserted (in its resizable frame): ![alt](data:...){width=240px}
        if (el.classList.contains('img-resize')) {
            const img = el.querySelector('img');
            const pic = img ? inlineText(img) : '';
            const w = /^(\d+(?:\.\d+)?)px$/.exec((el.style && el.style.width) || '');
            return pic ? pic + (w ? '{width=' + w[1] + 'px}' : '') : kids();
        }
        // an attached file: [report.pdf](data:application/pdf;base64,...){file}
        if (el.classList.contains('file-chip') && /^data:/.test(el.getAttribute('data-filedata') || '')) {
            return '[' + (el.getAttribute('data-filename') || 'file').replace(/[\]\n]/g, '') + '](' + el.getAttribute('data-filedata') + '){file}';
        }
        if (tag === 'A') {
            if (el.classList.contains('kd-footnote-ref')) return '[^' + el.textContent.trim() + ']';
            if (el.classList.contains('kd-footnote-back')) return '';
            const id = el.getAttribute('data-kd-link');
            if (id) { const t = el.textContent.trim(); return '[[' + id + (t && t !== id && t !== el.getAttribute('data-kd-auto') ? '|' + t : '') + ']]'; }
            const href = el.getAttribute('href') || '';
            return /^(https?:|mailto:|#)/.test(href) && !/[\s)]/.test(href) ? '[' + kids() + '](' + href + ')' : kids();
        }
        if (tag === 'STRONG' || tag === 'B') return wrap('**', kids());
        if (tag === 'EM' || tag === 'I') return wrap('*', kids());
        if (tag === 'U' || tag === 'S' || tag === 'STRIKE' || tag === 'DEL') { const mk = decoMarks(el); const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(kids()); return m[2] ? m[1] + mk[0] + m[2] + mk[1] + m[3] : kids(); }
        if (tag === 'CODE') { const ic = /kd-ic-(\w+)/.exec(el.className || ''); return wrap('`', el.textContent) + (ic ? '{' + ic[1] + '}' : ''); }
        if (tag === 'MARK' && (el.classList.contains('an-hl') || el.classList.contains('wa-hl'))) {
            const color = (Array.from(el.classList).find((c) => /^an-hl-/.test(c)) || 'an-hl-yellow').slice(6);
            const code = (HL_COLORS.find((x) => x[1] === color) || [])[0];
            // (marks the Writeout Annotator made before its pens were Keydown: wa-marker, wa-glow, wa-lasso, wa-ink)
            const wa = el.classList.contains('wa-hl') ? ({ marker: 'marker', glow: 'glow', lasso: 'lasso', ink: 'ink' })[(Array.from(el.classList).find((c) => /^wa-(marker|glow|lasso|ink)$/.test(c)) || '').slice(3)] : null;
            if (code && wa === 'ink') return '#' + code + '(' + kids() + ')';
            if (code && wa) return '#' + code + '.' + wa + '(' + kids() + ')';
            if (code && el.classList.contains('an-s-ink')) return '#' + code + '(' + kids() + ')';
            const named = AN_STYLES.slice(7).find((x) => el.classList.contains(x[1].trim()) && !HL_STYLES.some((h) => h[1] === x[1]));
            if (code && named) return '#' + code + '.' + named[0] + '(' + kids() + ')';
            const kdStyle = HL_STYLES.find((x) => x[1] && el.classList.contains(x[1].trim()));
            const style = kdStyle ? kdStyle[0] : (Array.from(el.classList).some((c) => /^an-s-/.test(c)) ? null : '##');
            return code && style ? '#' + code + '#' + kids() + style : kids();
        }
        // the editor's own line styles (a bullet's or heading's inner span): a whole line saves as "# ..." (see htmlToText),
        // one in the middle of a line keeps its tag (~MH~Sample~MH~)
        if (/^(header-[123]|mega-header|bulleted-list|blockquote-list)$/.test(String(el.className).trim())) {
            const lt = tag === 'SPAN' ? BY_CLASS.get(classKey(el.className)) : null;
            return lt ? lt[0] + kids().trim() + lt[1] : kids();
        }
        if (tag === 'SPAN' && el.classList.contains('us-chip')) {
            const c = Array.from(el.classList).find((k) => /^us-[a-z0-9]+-[1-5]$/.test(k));
            if (c) { const m = /^us-([a-z0-9]+)-([1-5])$/.exec(c); return '@' + m[1] + (m[2] === '1' ? '' : '-' + m[2]) + '@' + kids() + '@'; }
        }
        const d = el.className ? BY_CLASS.get(classKey(el.className)) : null;
        // duplex chips come back as ~DH-B~one|two|three~
        if (d && el.classList.contains('aero-duplex-input-chassis')) return d[0] + Array.from(el.children).map((b) => b.textContent.replace(/\u200B/g, '').trim()).join('|') + d[1];
        if (d && d[2] === 'span') {
            // (math, bold, highlights... inside a chip keep their own tags, so un-formatting never loses an equation)
            const rich = !el.getAttribute('data-label') && el.querySelector('.kd-math, mark.an-hl, strong, b, em, i, code, .kd-esc');
            const label = rich ? Array.from(el.childNodes).map(inlineText).join('') : el.getAttribute('data-label') || (el.querySelector('span') && !/^(gel-|aero-tag|spark|liquid|glossy|cyber|embossed)/.test(d[3]) ? el.querySelector('span').textContent : el.textContent);
            return d[0] + String(label).replace(/​/g, '').trim() + d[1];
        }
        // the toolbar's colors, fonts, sizes and weights: [words]{color=#dc2626 font="Georgia"} (line by line, since a style never spans lines)
        const sa = tag === 'SPAN' || tag === 'FONT' ? styleAttrs(el) : '';
        if (sa) return kids().split('\n').map((part) => (/[^\s]/.test(part) && !/[[\]]/.test(part) ? part.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, a, b, c) => a + '[' + b + ']' + sa + c) : part)).join('\n');
        return kids();
    }
    // **x** keeps its spaces outside the markers, so "a **b** c" stays readable
    function wrap(mark, t) {
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t);
        return m[2] ? m[1] + mark + m[2] + mark + m[3] : t;
    }

    // a block's contents (its own classes are the block, like header-2, so they never become triggers)
    const kidsText = (el) => Array.from(el.childNodes).map(inlineText).join('');

    // a block's indent step (Writeout and Bitbook indent with a 2.5rem left margin a step)
    // {align=center} for a line the toolbar centered (or aligned right, or justified)
    const alignOf = (el) => { const a = (el.style && el.style.textAlign) || el.getAttribute('align') || ''; return /^(center|right|justify)$/.test(a) ? '{align=' + a + '} ' : ''; };
    // a line the editor styled as a whole (~H1~ makes <div><span class="header-1">...</span></div>)
    const LINE_SPANS = { 'header-1': '# ', 'header-2': '## ', 'header-3': '### ', 'mega-header': '#### ', 'blockquote-list': '> ', 'bulleted-list': '* ', 'bulleted-list kd-bl-dash': '- ', 'bulleted-list kd-bl-plus': '+ ', 'bulleted-list kd-bl-ring': '. ', 'bulleted-list kd-bl-diamond': '~ ', 'bulleted-list kd-bl-arrow': '= ' };
    function lineSpanOf(el) {
        const parts = Array.from(el.childNodes).filter((n) => !(n.nodeType === 3 && !n.nodeValue.replace(/\u200B/g, '').trim()) && !(n.nodeType === 1 && n.tagName === 'BR'));
        const only = parts.length === 1 && parts[0].nodeType === 1 ? parts[0] : null;
        return only && LINE_SPANS[String(only.className).trim()] ? only : null;
    }
    // a plain line that starts like a heading, bullet, quote, block, table, fence or footnote keeps that start as itself
    const LINE_MARK = /^(\||#{1,4}\s|[*+\-.~=]\s|>\s|::[a-z]|\{align=|\{\{[^{}]+\}\}$|```|\[\^[^\]\s][^\]]*\]:|\|.*\|(\{[a-z]+\})?$|@@program)/;
    const plainLine = (l) => (LINE_MARK.test(l) ? '\\' + l : l);
    const indentOf = (el) => { const m = /^([\d.]+)r?em$/.exec((el.style && (el.style.textIndent || el.style.marginLeft)) || ''); return m ? Math.min(8, Math.round(parseFloat(m[1]) / 2.5)) : 0; };
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
            // an image on top of the document gets a line of its own
            if (el.classList.contains('kd-overlay')) { const t = inlineText(el); if (t) push(t); return; }
            if (el.matches(BLOCK_SEL) && !el.parentElement.closest(BLOCK_SEL)) { const bk = blockOf(el); if (bk) { push(blockLine(bk)); return; } }
            if (el.hasAttribute('data-kd-tpl') && el.classList.contains('kd-tpl-block')) { push('{{' + el.getAttribute('data-kd-tpl') + '}}'); return; }
            if (el.classList.contains('kdx') && el.hasAttribute('data-kd-src') && /^(DIV|P)$/.test(tag)) { flush(); el.getAttribute('data-kd-src').split('\n').forEach((l) => lines.push(l)); return; }
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
                push('|'.repeat(indentOf(el)) + alignOf(el) + '#'.repeat(n) + ' ' + kidsText(el).replace(/\n+/g, ' ').trim());
                return;
            }
            if (tag === 'UL' || tag === 'OL') {
                Array.from(el.querySelectorAll('li')).forEach((li) => {
                    const t = Array.from(li.childNodes).filter((c) => !(c.nodeType === 1 && /^(UL|OL)$/.test(c.tagName))).map(inlineText).join('').replace(/\n+/g, ' ').trim();
                    if (t) push((el.tagName === 'UL' ? BL_MARK(el) : '*') + ' ' + t);
                });
                return;
            }
            if (tag === 'BLOCKQUOTE') {
                const sym = bqSym(el), rows = kidsText(el).replace(/\u200b/g, '').split('\n').map((x) => x.trim());
                while (rows.length && !rows[0]) rows.shift();
                while (rows.length && !rows[rows.length - 1]) rows.pop();
                if (!rows.length) rows.push('');
                rows.forEach((row, k) => push((k ? '' : '|'.repeat(indentOf(el)) + alignOf(el)) + sym + (row ? ' ' + row : '')));
                return;
            }
            if (tag === 'TABLE') {
                flush();
                const rows = Array.from(el.rows);
                if (!rows.length) return;
                // a table written as @@table, or one with header rows further down (pipe tables can't say that), saves as @@table
                const headRows = rows.filter((r) => r.cells.length && Array.from(r.cells).every((c) => c.tagName === 'TH'));
                if (el.hasAttribute('data-kd-at') || headRows.some((r) => r !== rows[0])) { lines.push(atTableText(el)); return; }
                const width = Math.max(...rows.map((r) => r.cells.length));
                const cellText = (c) => (c ? Array.from(c.childNodes).map(inlineText).join('').replace(/\s*\n\s*/g, ' ').trim().replace(/\|/g, '\\|') : '');
                const line = (r) => '| ' + Array.from({ length: width }, (_, k) => cellText(r.cells[k])).join(' | ') + ' |';
                const style = (/(?:^|\s)rt-(?!table)([a-z]+)/.exec(el.className) || [])[1];
                const sepLine = '|' + ' --- |'.repeat(width) + (style && style !== 'blue' ? '{' + style + '}' : '');
                const head = el.tHead && el.tHead.rows.length ? el.tHead.rows[0] : (Array.from(rows[0].cells).every((c) => c.tagName === 'TH') ? rows[0] : null);
                if (head) lines.push(line(head));
                lines.push(sepLine);
                rows.filter((r) => r !== head).forEach((r) => lines.push(line(r)));
                return;
            }
            if (tag === 'PRE') { flush(); lines.push('```' + (el.getAttribute('data-kd-info') || '')); el.textContent.replace(/\n$/, '').split('\n').forEach((l) => lines.push(l)); lines.push('```'); return; }
            if (tag === 'HR') { push(''); return; }
            if (BLOCK.test(tag)) {
                flush();
                const hasBlocks = Array.from(el.children).some((c) => BLOCK.test(c.tagName) || c.classList.contains('kd-math-display') || c.hasAttribute('data-kd-media') || c.classList.contains('bl-prog'));
                if (hasBlocks) { Array.from(el.childNodes).forEach(walk); flush(); return; }
                const ls = lineSpanOf(el);
                if (ls) { lines.push((/^[*+\-.~=] $/.test(LINE_SPANS[String(ls.className).trim()]) ? '' : '|'.repeat(indentOf(el)) + alignOf(el)) + LINE_SPANS[String(ls.className).trim()] + kidsText(ls).replace(/\n+/g, ' ').trim()); return; }
                const t = kidsText(el).replace(/\s+$/, '');
                if (t.trim() === '') lines.push('');
                else {
                    // (only a line that starts with typed words: a template or chip at the start is real Keydown)
                    const first = Array.from(el.childNodes).find((n) => !(n.nodeType === 3 && !n.nodeValue.trim()));
                    const typed = !!first && first.nodeType === 3;
                    t.split('\n').forEach((l, k) => lines.push(l.trim() ? '|'.repeat(indentOf(el)) + alignOf(el) + (typed || k > 0 ? plainLine(l.trim()) : l.trim()) : ''));
                }
                return;
            }
            cur += inlineText(el);
        }
        Array.from(box.childNodes).forEach(walk);
        flush();
        // Source mode shows every blank line the page has (two empty lines stay two); saved text keeps at most one
        if (RAW_TEXT) return lines.join('\n').replace(/[ \t]+$/, '');
        return lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\s+$/g, '');
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
    // Source mode: the whole page as Keydown text, exactly as typed (tags that never got formatted stay tags)
    function sourceOf(el) {
        RAW_TEXT = true;
        try { return htmlToText(el.innerHTML); } finally { RAW_TEXT = false; }
    }
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

    /* ---------- Writeout + Bitbook files, written as Keydown text ---------- */
    // A file is a short front matter (format: "keydown-text", page size, ...) and then the document as Keydown text!
    // Each extra tab starts with a ::tab{name="Notes"} line. Loading turns the text back into formatting.
    const TAB_LINE = /^::tab\{name="((?:[^"\\]|\\.)*)"\}$/;
    // the app's own settings (everything else in a front matter is an OpenDB entry's details)
    const OWN_KEYS = /^(format|app|exported_at|page_size|page_orientation|doc_password|note_info|infobox)$/;
    // An OpenDB entry opened in the editor keeps its title, summary, abstract and details (infobox, tags...) in hidden
    // markers: they go back into the front matter, so the entry saves and opens as itself!
    function entryHead(html, meta) {
        if (!/data-kd-(meta|title|summary|abstract)/.test(html)) return html;
        const box = document.createElement('div');
        box.innerHTML = html;
        const metaEl = box.querySelector('.kd-meta[data-kd-meta]');
        if (metaEl) {
            try {
                const m = JSON.parse(metaEl.getAttribute('data-kd-meta')) || {};
                Object.keys(m).forEach((k) => { if ((!OWN_KEYS.test(k) || k === 'infobox') && !(k in meta)) meta[k] = m[k]; });
            } catch (e) {}
            metaEl.remove();
        }
        const t = box.querySelector('[data-kd-title]');
        if (t) { meta.title = clean(t.textContent); t.remove(); }
        const su = box.querySelector('[data-kd-summary]');
        if (su) { meta.summary = clean(su.textContent); const gap = su.nextElementSibling; su.remove(); if (gap && gap.tagName === 'DIV' && !gap.textContent.trim() && !gap.querySelector('img')) gap.remove(); }
        const ab = box.querySelector('[data-kd-abstract]');
        if (ab) { meta.abstract = clean(ab.textContent); ab.remove(); }
        return box.innerHTML;
    }
    // the front matter's lines: "quoted" text, [lists] and infobox.Name lines
    function metaLines(meta) {
        let out = '';
        Object.keys(meta || {}).forEach((k) => {
            const v = meta[k];
            if (v === undefined || v === null || v === '' || !/^[A-Za-z][\w .-]*$/.test(k) || k === 'format') return;
            if (k === 'infobox' && typeof v === 'object') { Object.keys(v).forEach((n) => { if (/^[^:\n]+$/.test(n) && v[n] !== '') out += 'infobox.' + n + ': ' + JSON.stringify(String(v[n])) + '\n'; }); return; }
            if (Array.isArray(v)) { out += k + ': [' + v.map((x) => String(x).replace(/[,[\]\n]/g, ' ').trim()).join(', ') + ']\n'; return; }
            if (typeof v === 'object') return;
            out += k + ': ' + JSON.stringify(String(v)) + '\n';
        });
        return out;
    }
    function toFileText(meta, tabs) {
        meta = Object.assign({}, meta || {});
        const list = (tabs || []).filter(Boolean).map((t, i) => (i === 0 ? Object.assign({}, t, { html: entryHead(t.html || '', meta) }) : t));
        const head = '---\nformat: "keydown-text"\n' + metaLines(meta) + '---\n\n';
        if (list.length <= 1) return head + htmlToText(list[0] ? list[0].html : '') + '\n';
        return head + list.map((t) => '::tab{name=' + JSON.stringify(String(t.name || 'Tab')) + '}\n' + htmlToText(t.html || '')).join('\n\n') + '\n';
    }
    // The other way: { meta, tabs: [{ name, html }] }, ready for the editor (firstName names a file without tabs)
    function fromFileText(fileText, firstName) {
        const doc = parse(fileText);
        const parts = [];
        let cur = null;
        doc.body.split('\n').forEach((ln) => {
            const m = TAB_LINE.exec(ln.trim());
            if (m) {
                let name = m[1];
                try { name = JSON.parse('"' + m[1] + '"'); } catch (e) {}
                cur = { name: name, lines: [] };
                parts.push(cur);
                return;
            }
            if (!cur) { cur = { name: firstName || 'Main', lines: [] }; parts.push(cur); }
            cur.lines.push(ln);
        });
        // (text before the first ::tab line is only kept when there is some)
        if (parts.length > 1 && parts[0].name === (firstName || 'Main') && !TAB_LINE.test(doc.body.split('\n')[0].trim()) && !parts[0].lines.join('').trim()) parts.shift();
        if (!parts.length) parts.push({ name: firstName || 'Main', lines: [] });
        const needIndex = /\[\[|media:/.test(doc.body);
        return (needIndex ? opendbIndex() : Promise.resolve({ entries: [] })).then((index) => {
            const byId = new Map((index.entries || []).map((e) => [e.id, e]));
            const opts = {
                title: (id) => (byId.get(id) || {}).title,
                media: (id) => { const e = byId.get(id); return e && e.file ? OPENDB + 'data/' + e.file : null; },
            };
            // an OpenDB entry's title, summary and details come back at the top, like when it was first opened
            const meta = doc.meta;
            const keep = {};
            Object.keys(meta).forEach((k) => { if (!OWN_KEYS.test(k)) keep[k] = meta[k]; });
            if (Object.keys(meta.infobox || {}).length) keep.infobox = meta.infobox;
            const top = (Object.keys(keep).length ? '<div class="kd-meta" hidden data-kd-meta="' + esc(JSON.stringify(keep)) + '"></div>' : '') +
                (meta.title ? '<h1 class="header-1" data-kd-title="1">' + esc(meta.title) + '</h1>' : '') +
                (meta.summary ? '<div data-kd-summary="1"><em>' + esc(meta.summary) + '</em></div><div><br></div>' : '') +
                (meta.abstract ? '<blockquote class="blockquote-list" data-kd-abstract="1">' + esc(meta.abstract) + '</blockquote>' : '');
            return { meta: meta, tabs: parts.map((p, i) => ({ name: p.name, html: (i === 0 ? top : '') + textToHtml(p.lines.join('\n').replace(/^\n+|\n+$/g, ''), opts) })) };
        });
    }

    /* ---------- Enter at the end of a line: every Keydown tag on it becomes its formatting, in place ---------- */
    const LINE_BLOCK = /^(DIV|P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|UL|OL|TABLE|FIGURE)$/;
    const SKIP = 'code, pre, a, .kd-math, .kd-tpl, [contenteditable="false"]';
    // ``` fences: a line that starts with ``` opens one and the next such line closes it; nothing on those lines
    // or between them is ever formatted, even many lines apart! (```like this``` on one line just covers itself)
    // the document's lines, in order: { nodes (its text pieces), text, key (the block it sits in) }
    function docLines(root) {
        const lines = [];
        let line = null, key = null, broke = true;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (n.nodeType === 1) { if (n.tagName === 'BR' || /^(TD|TH)$/.test(n.tagName)) broke = true; continue; }
            let b = n.parentElement;
            while (b && b !== root && !LINE_BLOCK.test(b.tagName) && !/^(TD|TH)$/.test(b.tagName)) b = b.parentElement;
            if (broke || b !== key || !line) { line = { nodes: [], text: '', key: b }; lines.push(line); }
            key = b; broke = false;
            line.nodes.push(n);
        }
        lines.forEach((ln) => { ln.text = ln.nodes.map((n) => n.nodeValue).join('').replace(/\u200B/g, '').replace(/\u00A0/g, ' '); });
        return lines;
    }
    // A line with an odd number of ``` opens (or closes) a fence: a lone ```, or one that ends in it like @@program=```
    function fencedTexts(root) {
        const out = new Set();
        let open = false;
        docLines(root).forEach((ln) => {
            const t = ln.text.trim();
            const odd = (t.split('```').length - 1) % 2 === 1;
            if (open || odd || /^```/.test(t)) ln.nodes.forEach((n) => out.add(n));
            if (odd) open = !open;
        });
        return out;
    }
    // Enter on the closing ``` of a typed-out program (@@program="..."=``` ... ```) turns it into the Program block!
    const PROGRAM_OPEN = /^@@program(?:="((?:[^"\\]|\\.)*)")?=```$/;
    function programAt(canvas, nodes) {
        const lines = docLines(canvas);
        const at = lines.findIndex((ln) => ln.nodes.some((n) => nodes.some((x) => x === n || (x.nodeType === 1 && x.contains(n)))));
        if (at < 1 || lines[at].text.trim() !== '```') return false;
        let start = -1;
        for (let k = at - 1; k >= 0; k--) {
            const t = lines[k].text.trim();
            if (PROGRAM_OPEN.test(t)) { start = k; break; }
            if (/```/.test(t)) return false;
        }
        if (start < 0) return false;
        // the code, with each line's indent (spaces, or the editor's own indent steps) kept
        const body = lines.slice(start + 1, at).map((ln) => {
            const blk = ln.key && ln.key !== canvas ? ln.key : null;
            const steps = blk ? Math.round((parseFloat(blk.style.textIndent || blk.style.marginLeft) || 0) / 2.5) : 0;
            return '    '.repeat(steps) + ln.text.replace(/\s+$/, '');
        });
        const m = PROGRAM_OPEN.exec(lines[start].text.trim());
        const html = skillHtml('program', parseParams((m[1] || '').replace(/\\"/g, '"')), body.join('\n'));
        if (!html) return false;
        const topOf = (n) => { while (n && n.parentNode !== canvas) n = n.parentNode; return n; };
        const first = topOf(lines[start].nodes[0]), last = topOf(lines[at].nodes[lines[at].nodes.length - 1]);
        const r = document.createRange();
        const whole = first && last && first.nodeType === 1 && last.nodeType === 1 && LINE_BLOCK.test(first.tagName) && LINE_BLOCK.test(last.tagName) &&
            !first.contains(lines[at].nodes[0]) && !last.contains(lines[start].nodes[0]);
        const editable = canvas.getAttribute('contenteditable') === 'false' || !!canvas.querySelector(':scope > [contenteditable="true"]');
        const holder = document.createElement('div');
        if (editable) holder.setAttribute('contenteditable', 'true');
        holder.innerHTML = html;
        if (whole) { r.setStartBefore(first); r.setEndAfter(last); }
        else { r.setStart(lines[start].nodes[0], 0); const z = lines[at].nodes[lines[at].nodes.length - 1]; r.setEnd(z, z.nodeValue.length); }
        r.deleteContents();
        r.insertNode(holder);
        const next = document.createElement('div');
        if (editable) next.setAttribute('contenteditable', 'true');
        next.appendChild(document.createTextNode('\u200B'));
        holder.after(next);
        const sel = window.getSelection();
        const c2 = document.createRange();
        c2.setStart(next.firstChild, 1); c2.collapse(true);
        sel.removeAllRanges(); sel.addRange(c2);
        try { next.focus({ preventScroll: true }); sel.removeAllRanges(); sel.addRange(c2); } catch (e) {}
        try { if (window.BitLang && window.BitLang.hydrate) window.BitLang.hydrate(holder); } catch (e) {}
        return 'line';
    }
    /* ---------- A display equation typed over several lines ----------
       "$$a = b \\" Enter "c = d$$": Enter on the line that closes it (or Re-format) turns the whole run into one centered
       equation, with the lines between kept as typed (LaTeX line breaks and all)! */
    const dollars = (t) => (String(t).match(/\$\$/g) || []).length;
    const MATH_MAX = 400;
    // the line (index) where the equation closed by line "at" was opened, or -1
    function mathStart(lines, at) {
        const t = lines[at].text.trim();
        if (!/\$\$$/.test(t) || dollars(t) !== 1) return -1;
        for (let k = at - 1; k >= 0 && at - k <= MATH_MAX; k--) {
            const s = lines[k].text.trim(), c = dollars(s);
            if (c === 1 && /^\$\$/.test(s)) return k;
            if (c > 0) return -1;
        }
        return -1;
    }
    const mathTex = (lines, start, at) => lines.slice(start, at + 1).map((ln) => ln.text.replace(/\s+$/, '')).join('\n').trim().replace(/^\$\$/, '').replace(/\$\$$/, '').trim();
    // swaps lines start..at for some html (the same swap the typed-out Program block uses)
    function replaceLineRange(canvas, lines, start, at, html) {
        const topOf = (n) => { while (n && n.parentNode !== canvas) n = n.parentNode; return n; };
        const first = topOf(lines[start].nodes[0]), last = topOf(lines[at].nodes[lines[at].nodes.length - 1]);
        const whole = first && last && first.nodeType === 1 && last.nodeType === 1 && LINE_BLOCK.test(first.tagName) && LINE_BLOCK.test(last.tagName) &&
            !first.contains(lines[at].nodes[0]) && !last.contains(lines[start].nodes[0]);
        const editable = canvas.getAttribute('contenteditable') === 'false' || !!canvas.querySelector(':scope > [contenteditable="true"]');
        const holder = document.createElement('div');
        if (editable) holder.setAttribute('contenteditable', 'true');
        holder.innerHTML = html;
        const r = document.createRange();
        if (whole) { r.setStartBefore(first); r.setEndAfter(last); }
        else { r.setStart(lines[start].nodes[0], 0); const z = lines[at].nodes[lines[at].nodes.length - 1]; r.setEnd(z, z.nodeValue.length); }
        r.deleteContents();
        r.insertNode(holder);
        return { holder: holder, editable: editable };
    }
    const lineIdx = (lines, nodes) => lines.findIndex((ln) => ln.nodes.some((n) => nodes.some((x) => x === n || (x.nodeType === 1 && x.contains(n)))));
    // is line "at" in the middle of (or the start of) an equation that is still open? Then Enter must not format it
    function inOpenMath(lines, at) {
        let open = false;
        for (let k = 0; k < at; k++) if (dollars(lines[k].text) % 2 === 1) open = !open;
        const c = dollars(lines[at].text);
        return open ? c % 2 === 0 : c % 2 === 1;
    }
    function mathAt(canvas, nodes) {
        const lines = docLines(canvas);
        const at = lineIdx(lines, nodes);
        if (at < 1) return false;
        const start = mathStart(lines, at);
        if (start < 0) return false;
        const tex = mathTex(lines, start, at);
        if (!tex) return false;
        const put = replaceLineRange(canvas, lines, start, at, mathHtml(tex, true));
        const next = document.createElement('div');
        if (put.editable) next.setAttribute('contenteditable', 'true');
        next.appendChild(document.createTextNode('\u200B'));
        put.holder.after(next);
        const sel = window.getSelection();
        const c2 = document.createRange();
        c2.setStart(next.firstChild, 1); c2.collapse(true);
        sel.removeAllRanges(); sel.addRange(c2);
        try { next.focus({ preventScroll: true }); sel.removeAllRanges(); sel.addRange(c2); } catch (e) {}
        return 'line';
    }
    // Re-format: every multi-line equation on the page
    function mergeMathLines(root) {
        let n = 0;
        // the shape Un-format leaves: one block holding "$ ... (newline) ... $" in a single piece of text
        {
            const fenced0 = fencedTexts(root);
            Array.from(root.querySelectorAll('div, p')).forEach((b) => {
                if (!b.isConnected || b.children.length || b.closest('pre, code, .kd-math, .kd-tpl, figure')) return;
                const t = b.textContent.replace(/\u200B/g, '');
                const m = /^\s*\$\$([\s\S]+)\$\$\s*$/.exec(t);
                if (!m || dollars(t) !== 2 || !/\n/.test(m[1]) || !m[1].trim()) return;
                if (Array.from(b.childNodes).some((x) => fenced0.has(x))) return;
                const tpl = document.createElement('template');
                tpl.innerHTML = mathHtml(m[1].trim(), true);
                b.replaceWith(tpl.content);
                n++;
            });
        }
        for (let guard = 0; guard < 300; guard++) {
            const lines = docLines(root), fenced = fencedTexts(root);
            const skip = (ln) => ln.nodes.some((x) => fenced.has(x) || (x.parentElement && x.parentElement.closest('pre, code, .kd-math, .kd-tpl, figure')));
            let found = null;
            for (let k = 1; k < lines.length && !found; k++) {
                if (skip(lines[k])) continue;
                const s = mathStart(lines, k);
                if (s >= 0 && !lines.slice(s, k + 1).some(skip)) found = [s, k];
            }
            if (!found) break;
            const tex = mathTex(lines, found[0], found[1]);
            if (!tex) break;
            replaceLineRange(root, lines, found[0], found[1], mathHtml(tex, true));
            n++;
        }
        return n;
    }
    function inFence(node, root) {
        const set = fencedTexts(root);
        if (node.nodeType === 3) return set.has(node);
        const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) if (set.has(t)) return true;
        return false;
    }
    function formatLine(canvas) {
        const sel = window.getSelection();
        if (!canvas || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
        const r = sel.getRangeAt(0);
        if (!canvas.contains(r.startContainer)) return false;
        // the line: the block around the caret, or (text sitting right in the canvas) the run of inline nodes around it
        let block = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
        // (a table cell is a line of its own: its tags format on their own, and never the whole table at once)
        while (block && block !== canvas && !LINE_BLOCK.test(block.tagName) && !/^(TD|TH)$/.test(block.tagName)) block = block.parentElement;
        if (!block) return false;
        const cell = /^(TD|TH)$/.test(block.tagName);
        let nodes;
        if (block === canvas) {
            // (the caret can sit right in the canvas, between its lines: then the line is the node just before it)
            let top = r.startContainer === canvas ? (canvas.childNodes[r.startOffset - 1] || canvas.childNodes[r.startOffset]) : r.startContainer;
            while (top && top.parentNode !== canvas) top = top.parentNode;
            if (!top) return false;
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
        // the closing ``` of a typed-out program: it becomes the Program block
        { const prog = programAt(canvas, nodes); if (prog) return prog; }
        // inside a ``` fence (or on its ``` lines): Enter is just Enter, nothing gets formatted
        {
            const fenced = fencedTexts(canvas);
            const inside = (n) => (n.nodeType === 3 ? fenced.has(n) : Array.from(n.childNodes).some(inside));
            if (nodes.some(inside)) return false;
        }
        // only at the END of the line (an Enter in the middle just splits it, like always); a table cell is small,
        // so Enter anywhere in it formats the whole cell
        const rest = document.createRange();
        rest.setStart(r.startContainer, r.startOffset);
        rest.setEndAfter(nodes[nodes.length - 1]);
        if (!cell && rest.toString().replace(/[\s\u200B\u00A0]/g, '') !== '') return false;
        // a display equation typed over several lines: the closing $$ turns them all into one; lines in the middle stay as typed
        {
            const mLines = docLines(canvas), mAt = lineIdx(mLines, nodes);
            if (mAt >= 0 && mLines[mAt].text.indexOf('$$') >= 0 || (mAt > 0 && inOpenMath(mLines, mAt))) {
                const done = mathAt(canvas, nodes);
                if (done) return done;
                if (inOpenMath(mLines, mAt)) return false;
            }
        }
        // the line itself first: "# Title", "* item", "> quote", ::block{...}, $math$... becomes what it says
        let lineEl2 = null;
        const runText = nodes.map((n) => n.textContent).join('').replace(/\u200B/g, '');
        if (/^\s*(#{1,4}\s+\S|[*+\-.~=]\s+\S|>\s+\S|(?:!>|\?>|>>|%>|\*>|\+>|->|=>|~>|\$>|#>|\^>|@>|&>)\s+\S|::[a-z]+|\$\$|\[\^[^\]]+\]:|\{\{|!\[)/.test(runText) && !isProtected(block, canvas)) {
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
                // (look for code, links and widgets only up to the line: the page itself is contenteditable=false too)
                const skipped = (t) => { for (let e = t.parentElement; e && e !== block && e !== canvas; e = e.parentElement) if (e.matches(SKIP)) return true; return false; };
                for (let t = w.nextNode(); t; t = w.nextNode()) if (!skipped(t)) texts.push(t);
            }
        });
        let changed = false;
        texts.forEach((t) => {
            const text = t.nodeValue;
            if (!/[#*=~`&$[{!@%^+:;\\]/.test(text)) return;
            const html = inline(text, { notes: {} });
            if (html === esc(text)) return;
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            t.parentNode.replaceChild(tpl.content, t);
            changed = true;
        });
        // tags cut apart by spans ("*#TU(" in one piece, "tensor product)*" in another): the whole line, in one go
        if (!lineEl2 && block !== canvas && !cell && /^(DIV|P|LI|H[1-6]|BLOCKQUOTE)$/.test(block.tagName) && rebuildLine(block, canvas, fencedTexts(canvas))) changed = true;
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
        // (in a cell the Enter is used up by formatting: no new line inside the cell)
        return cell ? 'line' : true;
    }

    // ::name{your text}: every block takes your own text (| splits a title from its text, or one line from the next)!
    const KD_BLOCK_BOXES = { aqua: ['', '🌊 Aqua notes...'], emerald: ['aqua-emerald-box', '🌿 Eco logs...'], amber: ['aqua-amber-box', '☀️ Highlights...'], crimson: ['aqua-crimson-box', '🚨 Urgent tasks...'], amethyst: ['aqua-amethyst-box', '🔮 Creative drafts...'] };
    const KD_BLOCK_PANELS = { gsky: ['panel-sky', '🔹 SKY COMPONENT', 'Sky log notes...'], gemerald: ['panel-emerald', '🌿 ECO COMPONENT', 'Organic project logs...'], gamber: ['panel-amber', '☀️ AMBER MATRIX', 'Highlights...'], gcrimson: ['panel-crimson', '🚨 ALERT MANIFEST', 'Urgent warnings...'] };
    // ::divider{style} or ::divider{style|Title}: the original aqua strip and twelve more styles, each can carry a title
    const BQ_STYLES = [['!>','neon'],['?>','glass'],['>>','pull'],['%>','gradient'],['*>','marker'],['+>','green'],['->','red'],['=>','dashed'],['~>','whisper'],['$>','paper'],['#>','terminal'],['^>','ribbon'],['@>','bubble'],['&>','card']];
    // a line of a quote: its symbol, then (usually) its words (a symbol alone is a blank line inside the quote)
    const BQ_LINE = /^(!>|\?>|>>|%>|\*>|\+>|->|=>|~>|\$>|#>|\^>|@>|&>|>)(?:\s+(.*))?$/;
    const BQ_BY_SYM = {}, BQ_BY_NAME = {};
    BQ_STYLES.forEach((q) => { BQ_BY_SYM[q[0]] = q[1]; BQ_BY_NAME[q[1]] = q[0]; });
    const bqSym = (el) => { const c = Array.from(el.classList || []).find((k) => /^kd-bq-/.test(k)); return (c && BQ_BY_NAME[c.slice(6)]) || '>'; };
    const KD_DIVIDERS = ['aqua', 'poolside', 'dual', 'notched', 'wavy', 'dotted', 'dashed', 'zigzag', 'glow', 'ruler', 'stitched', 'bubbles', 'scallop', 'neon', 'arrows', 'fade', 'swallow', 'triple', 'stepped', 'crest', 'ticket', 'gel', 'glass', 'rim'];
    // *sp(text) spoilers: a click shows or hides the words (the state is a data attribute, so saved text stays *sp(text))
    if (typeof document !== 'undefined' && !window.__kdSpoilerClick) {
        window.__kdSpoilerClick = true;
        document.addEventListener('click', (e) => { const fl = e.target && e.target.closest && e.target.closest('.kd-fill[data-answer]'); if (fl) { if (fl.hasAttribute('data-open')) fl.removeAttribute('data-open'); else fl.setAttribute('data-open', '1'); } const sp = e.target && e.target.closest && e.target.closest('.kd-spoiler'); if (sp) { if (sp.hasAttribute('data-open')) sp.removeAttribute('data-open'); else sp.setAttribute('data-open', '1'); } });
    }
    const KD_DIVIDER_COLORS = ['red', 'orange', 'gold', 'yellow', 'lime', 'green', 'turquoise', 'teal', 'cyan', 'blue', 'purple', 'pink', 'slate', 'white', 'fog', 'black'];
    function kdDividerHtml(style, label, fmt, color) {
        style = String(style || '').trim().toLowerCase();
        const named = KD_DIVIDERS.includes(style);
        label = String(label || '').trim();
        color = String(color || '').trim().toLowerCase();
        if (!named) style = 'aqua';
        // a color only goes with a style that was named (::divider{wavy||red}, ::divider{poolside|Title|blue})
        const cc = named && KD_DIVIDER_COLORS.includes(color) ? ' kd-div-c-' + color : '';
        if (style === 'aqua' && !label && !cc) return '<div class="aero-liquid-divider"></div>';
        const line = '<i class="kd-div-line"></i>';
        return '<div class="kd-div kd-div-' + style + cc + (label ? ' kd-div-labeled' : '') + '" contenteditable="false">' + (label ? line + '<span class="kd-div-label">' + fmt(label) + '</span>' + line : line) + '</div>';
    }
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
            case 'divider': return kdDividerHtml(parts[0], parts[1], fmt, parts[2]);
            case 'blank': {
                let st = (parts[0] || '').trim().toLowerCase(), rows = parts[1];
                if (/^\d+$/.test(st)) { rows = st; st = 'box'; }
                if (['box', 'dashed', 'lines', 'grid', 'dots'].indexOf(st) === -1) st = 'box';
                const n = Math.max(1, Math.min(40, parseInt(rows, 10) || 4)), lab = (parts[2] || '').trim();
                return '<div class="kd-blank kd-blank-' + st + '" style="--kd-rows:' + n + '" data-rows="' + n + '" contenteditable="false">' + (lab ? '<span class="kd-blank-label">' + fmt(lab) + '</span>' : '') + '</div>';
            }
            case 'pagenumbers': {
                const FM = { none: 'No page numbers (front matter)', arabic: 'Numbers (1, 2, 3)', roman: 'Roman numerals (i, ii, iii)', 'upper-roman': 'Roman numerals (I, II, III)', alpha: 'Latin letters (a, b, c)', 'upper-alpha': 'Latin letters (A, B, C)', greek: 'Greek letters (α, β, γ)', 'upper-greek': 'Greek letters (Α, Β, Γ)' };
                let fm = (parts[0] || '').trim().toLowerCase();
                if (!FM[fm]) fm = 'arabic';
                const n = Math.max(1, Math.min(9999, parseInt(parts[1], 10) || 1));
                return '<div class="kd-pagenums" contenteditable="false" data-fmt="' + fm + '" data-start="' + n + '" title="Page numbers change from the page this sits on (it does not print)"><span>Page numbers: ' + FM[fm] + (fm !== 'none' ? ', starting at ' + n : '') + '</span></div>';
            }
            case 'pagebreak': return '<div class="kd-pagebreak" contenteditable="false" title="Page break: what comes after it starts on a new page!"><span>Page break</span></div>';
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
        if (c.contains('kd-pagebreak')) return ['pagebreak', []];
        if (c.contains('kd-pagenums')) return ['pagenumbers', [el.getAttribute('data-fmt') || 'arabic', el.getAttribute('data-start') || '1']];
        if (c.contains('kd-blank')) { const st = (Array.from(c).find((k) => /^kd-blank-/.test(k)) || 'kd-blank-box').slice(9); const lab = txt('.kd-blank-label'); const n = el.getAttribute('data-rows') || '4'; return ['blank', lab ? [st, n, lab] : [st, n]]; }
        if (c.contains('kd-div')) { const st = (Array.from(c).find((k) => /^kd-div-(?!labeled|c-)/.test(k)) || 'kd-div-aqua').slice(7); const lab = txt('.kd-div-label'); const cm = Array.from(c).find((k) => /^kd-div-c-/.test(k)); const col = cm ? cm.slice(9) : ''; return ['divider', col ? [st, lab || '', col] : (lab ? [st, lab] : [st])]; }
        if (c.contains('aero-liquid-divider')) return ['divider', []];
        if (c.contains('writedown-code-block')) return /SKETCH/i.test(txt('.code-block-header')) ? ['draw', []] : ['code', raw('.code-block-content')];
        if (c.contains('writedown-console-block')) return ['console', raw('.console-block-content')];
        if (c.contains('writedown-diff-block')) return ['diff', Array.from(el.querySelectorAll('.diff-row-content p')).map((p) => kidsText(p).trim())];
        if (c.contains('writedown-horizon-block')) return ['horizon', []];
        if (c.contains('writedown-waypoint-block')) return ['waypoint', [txt('.waypoint-block-content')]];
        if (c.contains('writedown-journal-entry')) return ['entry', [txt('.journal-entry-content')]];
        return null;
    }
    const BLOCK_SEL = '.aero-glass-block, .aqua-bubble-text, .tactile-alert-plate, .media-track-wrap, .aqua-aero-box, .aero-glass-panel, .aero-foldout-panel, .aero-liquid-divider, .kd-div, .kd-blank, .kd-pagenums, .kd-pagebreak, .writedown-code-block, .writedown-console-block, .writedown-diff-block, .writedown-horizon-block, .writedown-waypoint-block, .writedown-journal-entry';
    const blockLine = (b) => '::' + b[0] + (b[1].length && b[0] !== 'draw' ? '{' + b[1].map((t) => String(t).replace(/[{}|]/g, ' ')).join('|') + '}' : '');
    const blockFromLine = (line) => { const m = /^\s*::([a-z]+)(?:\{([^}]*)\})?\s*$/.exec(line); return m ? kdBlockMarkup(m[1], m[2], (t) => inline(t, { notes: {} })) : null; };

    /* ---------- Un-format and Re-format a whole document ---------- */
    // Un-format turns every piece of Keydown formatting back into the tags that make it, so mistakes are easy to see.
    // Anything that isn't Keydown (pictures, tables, colors from the toolbar) stays exactly as it is!
    const INLINE_KD = 'mark.an-hl, mark.wa-hl, strong, b, em, i, code, .kd-math, a.kd-footnote-ref, a.kd-link, .kd-tpl, span[class]';
    // Skills and other app pieces are never touched: BeepBox chips, Bitbook tags, dice, file chips... Anything locked
    // against editing (except plain lists, tables and Keydown's own blocks), or carrying its own data, is left alone!
    const KD_DATA = /^data-(kd|tex|display|label|text)/;
    function isProtected(el, root) {
        for (let n = el; n && n !== root && n.nodeType === 1; n = n.parentElement) {
            // (Writeout's own wrappers carry data- labels but are no widget: a tracked insertion, a comment, a bookmark)
            if (n.matches && n.matches('ins.wo-ins, span.wo-cmt, span.wo-bm')) continue;
            if (Array.from(n.attributes).some((a) => a.name.startsWith('data-') && !KD_DATA.test(a.name))) return true;
            if (n.getAttribute('contenteditable') === 'false' && !/^(UL|OL|TABLE|TBODY|THEAD|TR)$/.test(n.tagName) &&
                !n.classList.contains('kd-math') && !n.classList.contains('kd-tpl') && !n.matches(BLOCK_SEL) && !n.hasAttribute('data-kd-media')) return true;
        }
        return false;
    }
    // Why Re-format leaves this text alone (null: it doesn't): the reason, in words, naming what is in the way
    function skipReason(t, root, fenced) {
        if (fenced.has(t)) return 'it is inside a ``` code fence (an earlier line opens one and nothing closes it)';
        for (let n = t.parentElement; n && n !== root && n.nodeType === 1; n = n.parentElement) {
            if (/^(CODE|PRE)$/.test(n.tagName)) return 'it is inside code (<' + n.tagName.toLowerCase() + '>)';
            if (n.classList.contains('kd-math')) return null;
            if (n.matches && n.matches('ins.wo-ins, span.wo-cmt, span.wo-bm')) continue;
            const d = Array.from(n.attributes).find((a) => a.name.startsWith('data-') && !KD_DATA.test(a.name));
            if (d) return 'it is inside <' + n.tagName.toLowerCase() + (n.className ? ' class="' + String(n.className).slice(0, 60) + '"' : '') + '> which has ' + d.name;
            if (n.getAttribute('contenteditable') === 'false' && !/^(UL|OL|TABLE|TBODY|THEAD|TR)$/.test(n.tagName) && !n.classList.contains('kd-tpl') && !n.matches(BLOCK_SEL) && !n.hasAttribute('data-kd-media'))
                return 'it is inside a locked <' + n.tagName.toLowerCase() + (n.className ? ' class="' + String(n.className).slice(0, 60) + '"' : '') + '> (contenteditable=false)';
        }
        return null;
    }
    function skippedTags(root) {
        const out = [], fenced = fencedTexts(root);
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) {
            if (!/\$\$|\*[^\s*][^*]*\*|#[A-Z]{1,2}[#(.]/.test(t.nodeValue)) continue;
            const why = skipReason(t, root, fenced);
            if (why) out.push({ text: t.nodeValue.replace(/\s+/g, ' ').trim().slice(0, 80), why: why });
            if (out.length >= 30) break;
        }
        return out;
    }
    function isKeydownInline(el, root) {
        if (el.closest('pre') || isProtected(el, root)) return false;
        if (/^(STRONG|B|EM|I|CODE)$/.test(el.tagName) || el.classList.contains('kd-math') || el.classList.contains('kd-tpl')) return true;
        if (el.tagName === 'MARK') return el.classList.contains('an-hl') || el.classList.contains('wa-hl');
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
        // escaped symbols go back to their backslash form
        root.querySelectorAll('span.kd-esc').forEach((sp) => { sp.replaceWith(document.createTextNode('\\' + sp.textContent)); n++; });
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
                if (own) out.push(lineEl(BL_MARK(ul) + ' ' + own, li));
                Array.from(li.children).filter((c) => /^(UL|OL)$/.test(c.tagName)).forEach((sub) => out.push(...listLines(sub)));
            });
            return out;
        };
        root.querySelectorAll('ul.bulleted-list').forEach((ul) => {
            if (!root.contains(ul) || isProtected(ul.parentElement, root)) return;
            const lines = listLines(ul);
            ul.replaceWith(...lines); n += lines.length;
        });
        root.querySelectorAll('blockquote.blockquote-list').forEach((q) => { if (root.contains(q) && !isProtected(q, root)) { const sym = bqSym(q), rows = kidsText(q).replace(/\u200b/g, '').split('\n').map((x) => x.trim()); while (rows.length && !rows[rows.length - 1]) rows.pop(); q.replaceWith(...(rows.length ? rows : ['']).map((row, k) => lineEl(sym + (row ? ' ' + row : ''), k ? null : q))); n++; } });
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
    // A line's text as it was typed, with the bits a half-finished format pass may have changed put back
    // (an escaped \ shows one backslash, *italics* and **bold** lost their stars); plain spans just give their text
    function lineSource(el) {
        let out = '';
        el.childNodes.forEach((n) => {
            if (n.nodeType === 3) { out += n.nodeValue; return; }
            if (n.nodeType !== 1) return;
            const t = n.tagName;
            if (t === 'BR') { out += '\n'; return; }
            if (n.classList.contains('kd-fill')) { out += (n.classList.contains('kd-fill-box') ? '[##' : '[__') + (n.getAttribute('data-w') && n.getAttribute('data-w') !== '6' ? n.getAttribute('data-w') : '') + (n.getAttribute('data-answer') ? '|' + n.getAttribute('data-answer') : '') + ']'; return; }
            if (n.classList.contains('kd-esc')) { out += '\\' + n.textContent; return; }
            if (t === 'EM' || t === 'I') { out += '*' + lineSource(n) + '*'; return; }
            if (t === 'STRONG' || t === 'B') { out += '**' + lineSource(n) + '**'; return; }
            if (t === 'U' || t === 'S' || t === 'STRIKE' || t === 'DEL') { const mk = decoMarks(n); out += mk[0] + lineSource(n) + mk[1]; return; }
            if (t === 'CODE') { const ic = /kd-ic-(\w+)/.exec(n.className || ''); out += '`' + n.textContent + '`' + (ic ? '{' + ic[1] + '}' : ''); return; }
            out += lineSource(n);
        });
        return out;
    }
    // The line as Keydown text: its own text as typed, plain spans read through, formatted pieces (bold, chips, math,
    // links, colors...) written back as their tags. null when the line holds something that has no Keydown form.
    function lineKeydown(el, root, noStyles) {
        let out = '';
        for (const n of Array.from(el.childNodes)) {
            if (n.nodeType === 3) { out += n.nodeValue; continue; }
            if (n.nodeType !== 1) continue;
            const t = n.tagName;
            if (t === 'BR') { out += '\n'; continue; }
            if (n.classList.contains('kd-fill')) { out += (n.classList.contains('kd-fill-box') ? '[##' : '[__') + (n.getAttribute('data-w') && n.getAttribute('data-w') !== '6' ? n.getAttribute('data-w') : '') + (n.getAttribute('data-answer') ? '|' + n.getAttribute('data-answer') : '') + ']'; continue; }
            if (n.classList.contains('kd-esc')) { out += '\\' + n.textContent; continue; }
            // (a span with no class and no Keydown-able style, like the leftovers of a paste, is just its text)
            const plain = (t === 'SPAN' || t === 'FONT') && !n.className && !styleAttrs(n) && Array.from(n.attributes).every((x) => /^(style|dir|lang|class)$/.test(x.name));
            if (plain) { const inner = lineKeydown(n, root, noStyles); if (inner === null) return null; out += inner; continue; }
            if (t === 'SPAN' || t === 'FONT') {
                if (styleAttrs(n) && !n.className) { const inner = lineKeydown(n, root, noStyles); if (inner === null) return null; if (noStyles) { out += inner; continue; } out += inner.split('\n').map((p) => (/[^\s]/.test(p) ? '[' + p + ']' + styleAttrs(n) : p)).join('\n'); continue; }
            }
            if (isKeydownInline(n, root)) { out += inlineText(n); continue; }
            return null;
        }
        return out;
    }
    function rebuildCutLines(root) {
        let n = 0;
        const fenced = fencedTexts(root);
        Array.from(root.querySelectorAll('div, p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th')).forEach((b) => { try { if (rebuildLine(b, root, fenced)) n++; } catch (e) { try { console.error('[Keydown] could not rebuild a line', e); } catch (x) {} } });
        return n;
    }
    function rebuildLine(b, root, fenced) {
        {
            if (!root.contains(b) || !b.children.length || b.querySelector('div, p, li, ul, ol, table, h1, h2, h3, h4, h5, h6, blockquote, pre')) return;
            if (b.closest('pre, code, .kd-math, .kd-tpl, figure') || isProtected(b, root)) return;
            if (Array.from(b.querySelectorAll('*')).some((x) => x.tagName !== 'BR' && !x.closest('.kd-math') && isProtected(x, root))) return;
            const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
            for (let t = w.nextNode(); t; t = w.nextNode()) if (fenced.has(t)) return;
            const before = b.textContent.replace(/[\u200B\s]/g, '').length;
            // (first keeping the toolbar's colors; when a colored piece cuts a tag in two, once more without them)
            let tpl = null;
            for (const noStyles of [false, true]) {
                const src = lineKeydown(b, root, noStyles);
                if (src === null || !/[#*=~`&$@%^+:;!\[{]/.test(src)) return;
                const t2 = document.createElement('template');
                t2.innerHTML = inline(src, { notes: {} });
                // only when the rebuild actually turned some tags into formatting (tag characters were used up)
                if (t2.content.textContent.replace(/[\u200B\s]/g, '').length < before) { tpl = t2; break; }
            }
            if (!tpl) return;
            while (b.firstChild) b.firstChild.remove();
            b.appendChild(tpl.content);
            return true;
        }
    }
    function lineToBlock(b) {
        const text = b.textContent.replace(/​/g, '');
        let m;
        // (the new heading / item / quote keeps the line's indent)
        const make = (tag, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; if (b.hasAttribute('contenteditable')) el.setAttribute('contenteditable', 'true'); if (b.style && b.style.textIndent) el.style.textIndent = b.style.textIndent; else if (b.style && b.style.marginLeft) el.style.marginLeft = b.style.marginLeft; return el; };
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
        if ((m = /^\s*([*+\-.~=])\s+\S/.exec(text))) {
            const li = takeRest(make('li'), lead + 2);
            const prev = b.previousElementSibling;
            const bcls = 'bulleted-list' + (BL_CLS[m[1]] ? ' ' + BL_CLS[m[1]] : '');
            if (prev && prev.tagName === 'UL' && prev.classList.contains('bulleted-list') && BL_MARK(prev) === m[1]) { prev.appendChild(li); b.remove(); }
            else { const ul = document.createElement('ul'); ul.className = bcls; ul.appendChild(li); b.replaceWith(ul); }
            return li;
        }
        if ((m = /^\s*(!>|\?>|>>|%>|\*>|\+>|->|=>|~>|\$>|#>|\^>|@>|&>)\s+\S/.exec(text))) { const q = takeRest(make('blockquote', 'blockquote-list kd-bq kd-bq-' + BQ_BY_SYM[m[1]]), lead + 3); b.replaceWith(q); return q; }
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
        // a $...$ line that is in pieces (split text, spans, a <br> at the end): read the line's own Keydown source
        if (!html && b.children.length && /^\s*\$\$[\s\S]+\$\$\s*$/.test(text) && dollars(text) === 2 &&
            !b.querySelector('img, video, audio, iframe, table, figure, .kd-math, .kd-tpl, [contenteditable="false"]') && !Array.from(b.children).some((c) => LINE_BLOCK.test(c.tagName))) {
            const src = lineSource(b).replace(/\u200B/g, '').trim();
            const mm = /^\$\$([\s\S]+)\$\$$/.exec(src);
            if (mm && mm[1].trim() && dollars(src) === 2) html = mathHtml(mm[1].trim(), true);
        }
        if (html) {
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            const first = tpl.content.firstElementChild;
            b.replaceWith(tpl.content);
            return first;
        }
        return null;
    }

    /* ---------- Backspace on formatting with no text in it removes that formatting ----------
       (instead of the character, or the whole line break, before it!) */
    const FMT_INLINE = /^(SPAN|B|STRONG|I|EM|U|S|STRIKE|DEL|INS|CODE|MARK|FONT|SUB|SUP|SMALL|A)$/;
    const FMT_BLOCK = /^(H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE)$/;
    const blankFmt = (el) => el && el.nodeType === 1 && el.getAttribute('contenteditable') !== 'false' &&
        !(el.textContent || '').replace(/[​﻿\s]/g, '') &&
        !el.querySelector('img, video, audio, svg, canvas, input, select, textarea, iframe, table, [contenteditable="false"]');
    const isInlineFmt = (el) => el && el.nodeType === 1 && FMT_INLINE.test(el.tagName) && (el.tagName !== 'SPAN' || !!el.className) && blankFmt(el);
    function emptyFormatAt(canvas, range) {
        const n = range.startContainer;
        let hit = null;
        // the caret is inside it (the outermost empty one wins: an empty bold inside an empty chip takes both)
        for (let x = n.nodeType === 1 ? n : n.parentElement; x && x !== canvas && canvas.contains(x); x = x.parentElement) {
            if (isInlineFmt(x)) hit = x; else break;
        }
        if (hit) return { el: hit };
        // ...or right after it, with nothing but zero-width spaces in between
        let prev = null;
        if (n.nodeType === 3) { if (!n.nodeValue.slice(0, range.startOffset).replace(/[​﻿]/g, '')) prev = n.previousSibling; }
        else prev = n.childNodes[range.startOffset - 1] || null;
        while (prev && prev.nodeType === 3 && !prev.nodeValue.replace(/[​﻿]/g, '')) prev = prev.previousSibling;
        if (isInlineFmt(prev)) return { el: prev };
        // an empty heading, quote or code line becomes a plain empty line (it doesn't join the line above)
        for (let x = n.nodeType === 1 ? n : n.parentElement; x && x !== canvas && canvas.contains(x); x = x.parentElement) {
            if (FMT_BLOCK.test(x.tagName)) return blankFmt(x) ? { el: x, block: true } : null;
            if (LINE_BLOCK.test(x.tagName)) break;
        }
        return null;
    }
    function removeEmptyFormat(canvas, hit) {
        const sel = window.getSelection();
        const r = document.createRange();
        if (hit.block) {
            const d = document.createElement('div');
            if (hit.el.hasAttribute('contenteditable')) d.setAttribute('contenteditable', hit.el.getAttribute('contenteditable'));
            if (hit.el.style.textIndent) d.style.textIndent = hit.el.style.textIndent; else if (hit.el.style.marginLeft) d.style.marginLeft = hit.el.style.marginLeft;
            d.appendChild(document.createElement('br'));
            hit.el.replaceWith(d);
            r.setStart(d, 0);
            try { if (d.getAttribute('contenteditable') === 'true') d.focus({ preventScroll: true }); } catch (e) {}
        } else {
            const parent = hit.el.parentNode;
            const holder = document.createTextNode('');
            parent.insertBefore(holder, hit.el);
            hit.el.remove();
            // a line left with nothing in it keeps its height
            let line = parent;
            while (line && line !== canvas && !LINE_BLOCK.test(line.tagName)) line = line.parentNode;
            if (line && line !== canvas && !(line.textContent || '').replace(/[​﻿]/g, '') && !line.querySelector('br, img, [contenteditable="false"]')) line.appendChild(document.createElement('br'));
            r.setStart(holder, 0);
        }
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        canvas.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Backspace' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.isComposing) return;
            const canvas = document.getElementById('wysiwyg-canvas');
            const sel = window.getSelection();
            if (!canvas || !sel || !sel.rangeCount || !sel.isCollapsed || !canvas.contains(sel.anchorNode)) return;
            const hit = emptyFormatAt(canvas, sel.getRangeAt(0));
            if (!hit) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            removeEmptyFormat(canvas, hit);
        }, true);
    }

    // Re-format: format the whole document again, then check it for tags that could not be formatted
    const LEFTOVER = /@(?:[a-z0-9]+)(?:-[1-5])?@(?=\S)|!?#(?:GL|TU|PR|PK|SL|BK|FG|[ROYLGTCBWA])#|#([\^+:;])(?:GL|TU|PR|PK|SL|BK|FG|[ROYLGTCBW])\1|%(?:1\d|20|[1-9])%(?:GL|TU|PR|PK|SL|BK|FG|[ROYLGTCBW])%|\^\^(?:GL|TU|PR|PK|SL|BK|FG|[ROYLGTCBW])\^(?!\^)|=(?:MG|LM|AQ|SL|[YRGCBVPO])=|~[A-Z0-9]{1,5}(?:-[A-Z]{1,2})?~|#(?:GL|TU|PR|PK|SL|[ROYLGTCB])\.?[a-z]*\(|\*\*|\{\{|\}\}|\[\[|\]\]|\$\$/g;
    function reformat(root) {
        let n = 0;
        const errors = [];
        root.normalize();
        try { n += mergeMathLines(root); } catch (e) { errors.push(e); }
        const fenced = fencedTexts(root);
        const hasFenced = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let t = w.nextNode(); t; t = w.nextNode()) if (fenced.has(t)) return true; return false; };
        const blocks = Array.from(root.querySelectorAll('div, p')).filter((b) => !hasFenced(b)).filter((b) => !b.closest('pre, code, figure, [contenteditable="false"] [contenteditable="false"], .kd-math, .kd-tpl') && !isProtected(b, root) && !b.closest(BLOCK_SEL) &&
            !Array.from(b.children).some((c) => LINE_BLOCK.test(c.tagName) || c.tagName === 'BR' && b.childNodes.length > 1 && c !== b.lastChild));
        blocks.forEach((b) => { try { if (lineToBlock(b)) n++; } catch (e) { errors.push(e); } });
        // every text piece left: chips, highlights, bold, math, footnotes...
        const SKIP_RE = 'code, pre, a, .kd-math, .kd-tpl, figure, [contenteditable="false"] [contenteditable="false"]';
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const texts = [];
        for (let t = walker.nextNode(); t; t = walker.nextNode()) if (!fenced.has(t) && !(t.parentElement && (t.parentElement.closest(SKIP_RE) || isProtected(t.parentElement, root)))) texts.push(t);
        texts.forEach((t) => { try {
            const text = t.nodeValue;
            if (!/[#*=~`&$[{!@%^+:;\\]/.test(text)) return;
            const html = inline(text, { notes: {} });
            if (html === esc(text)) return;
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            n += tpl.content.querySelectorAll('*').length ? 1 : 0;
            t.parentNode.replaceChild(tpl.content, t);
        } catch (e) { errors.push(e); } });
        // a line whose tags are cut apart by spans (pasted or recolored text: "*#TU(" in one piece, "tensor product)*" in
        // another) never formats piece by piece: read the whole line back as Keydown and format it in one go
        try { n += rebuildCutLines(root); } catch (e) { errors.push(e); }
        let problems = [];
        try { problems = checkKeydown(root); } catch (e) { errors.push(e); }
        if (errors.length) { try { console.error('[Keydown] Re-format hit ' + errors.length + ' error(s):', errors); } catch (e) {} }
        let skipped = [];
        try { skipped = skippedTags(root); } catch (e) {}
        return { formatted: n, problems: problems, errors: errors.map((e) => String(e && e.message || e)), skipped: skipped };
    }
    // The check: tags still sitting in the text after formatting are mistakes (a missing closing tag, a typo...)
    function checkKeydown(root) {
        const problems = [];
        const fenced = fencedTexts(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
            if (fenced.has(t) || (t.parentElement && (t.parentElement.closest('code, pre, .kd-math') || isProtected(t.parentElement, root)))) continue;
            const re = new RegExp(LEFTOVER);
            // (```inline fences``` are blanked out first: tags inside them are meant to stay as typed)
            const val = t.nodeValue.replace(/```[\s\S]*?(?:```|$)/g, (x) => ' '.repeat(x.length));
            let m;
            while ((m = re.exec(val))) {
                const line = (t.parentElement && t.parentElement.closest('td, th, div, p, li, h1, h2, h3, blockquote') || t.parentElement || t).textContent.replace(/\s+/g, ' ').trim();
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
    const SKILL_SEL = '.an-ink-layer, .bb-chip, .bl-prog, .dc-chip, .tc-chip, .pm-chip, .fl-chip, .px-chip, .kd-emoji, .uni-chip, .cc-chip, .bbcss-chip, .jumper-anchor';
    const SKILL_RE = /@@([a-z]+)="((?:[^"\\]|\\.)*)"/g;
    const qv = (v) => String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    // Custom Emoji / Symbol: a little drawing (strokes in a 100 x 100 square) shown as an inline picture, written @@emoji="d='...',size='md'"
    // a stroke is ink:color:width:x,y;x,y;... (inks: p pen, g gel, m marker, n neon, d dashed), strokes are joined with |
    // Custom emoji are drawn with the Annotator's inks (bitbook/annotate-ink.js): each stroke is  ink:color:width:path  (an ink like gel, pen,
    // marker, neon, crayon or a theme pack style, a color name like red, a width in the 100x100 square, an SVG path), strokes joined with |.
    // Older emoji (p/g/m/n/d inks, hex colors, x,y;x,y points) still open and are drawn with the nearest Annotator ink and color.
    const EMOJI_HEX = [['red', '#ef4444'], ['orange', '#f97316'], ['gold', '#ea9f08'], ['yellow', '#ead708'], ['lime', '#84cc16'], ['green', '#10b981'], ['turquoise', '#30e5cd'], ['teal', '#06b6d4'], ['cyan', '#30d3e5'], ['blue', '#3b82f6'], ['purple', '#a855f7'], ['pink', '#ec4899'], ['slate', '#b4b4b4']];
    function emojiPath(pts) {
        const r = (n) => Math.round(n * 10) / 10;
        if (!pts.length) return '';
        if (pts.length === 1) return 'M' + r(pts[0][0]) + ' ' + r(pts[0][1]) + 'l0.1 0';
        let out = 'M' + r(pts[0][0]) + ' ' + r(pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) out += 'Q' + r(pts[i][0]) + ' ' + r(pts[i][1]) + ' ' + r((pts[i][0] + pts[i + 1][0]) / 2) + ' ' + r((pts[i][1] + pts[i + 1][1]) / 2);
        const l = pts[pts.length - 1];
        return out + 'L' + r(l[0]) + ' ' + r(l[1]);
    }
    function emojiStrokes(d) {
        const AI = root.AnnotateInk;
        const cols = (AI && AI.COLORS ? AI.COLORS.map((c) => [c[0], c[1]]) : EMOJI_HEX);
        const near = (hex) => {
            const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
            let best = cols[0][0], bd = 1e9;
            cols.forEach((c) => { const dd = [1, 3, 5].reduce((a, i, k) => a + Math.pow(parseInt(c[1].slice(i, i + 2), 16) - v[k], 2), 0); if (dd < bd) { bd = dd; best = c[0]; } });
            return best;
        };
        const LEG = { p: 'pen', g: 'gel', m: 'marker', n: 'neon', d: 'pen' };
        return String(d || '').split('|').filter(Boolean).map((s) => {
            const a = s.split(':'), rest = a.slice(3).join(':');
            if (/^M/.test(rest)) return /^[A-Za-z0-9_-]+$/.test(a[0]) && /^[a-z]+$/.test(a[1] || '') && /^[MLQl0-9 .\-]+$/.test(rest) ? { t: a[0], c: a[1], w: Math.max(0.5, Math.min(40, +a[2] || 4)), d: rest } : null;
            const pts = rest.split(';').map((p) => p.split(',').map(Number)).filter((p) => p.length === 2 && isFinite(p[0]) && isFinite(p[1]));
            if (!pts.length) return null;
            const hex = '#' + String(a[1] || '000000').replace(/[^0-9a-fA-F]/g, '').padEnd(6, '0').slice(0, 6);
            return { t: LEG[a[0]] || 'pen', c: near(hex), w: Math.max(1, Math.min(24, +a[2] || 4)) * (a[0] === 'm' ? 1.7 : 1), d: emojiPath(pts) };
        }).filter(Boolean);
    }
    const emojiSer = (strokes) => strokes.map((s) => s.t + ':' + s.c + ':' + s.w + ':' + s.d).join('|');
    function emojiSvg(d) {
        const AI = root.AnnotateInk;
        const strokes = emojiStrokes(d);
        let out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">';
        if (AI && AI.strokeSvg) {
            out += AI.DEFS;
            strokes.forEach((s) => { try { out += '<g>' + AI.strokeSvg(s) + '</g>'; } catch (e) {} });
        } else {
            strokes.forEach((s) => { const hex = (EMOJI_HEX.find((c) => c[0] === s.c) || EMOJI_HEX[0])[1]; out += '<path d="' + s.d + '" fill="none" stroke="' + hex + '" stroke-width="' + s.w + '" stroke-linecap="round" stroke-linejoin="round"' + (s.t === 'marker' ? ' opacity="0.4"' : '') + '/>'; });
        }
        return out + '</svg>';
    }
    function emojiChip(d, size) {
        size = /^(sm|md|lg)$/.test(size) ? size : 'md';
        const el = document.createElement('span');
        el.className = 'kd-emoji kd-emoji-' + size;
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-emoji', d || '');
        el.setAttribute('data-emoji-size', size);
        el.setAttribute('title', 'Custom emoji: double-click to edit it!');
        el.innerHTML = emojiSvg(d);
        return el;
    }
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
        // Annotate drawings: every stroke, as JSON
        if (c.contains('an-ink-layer')) {
            // ink:color:width:path for each stroke, | between them (no quotes, so nothing needs escaping)
            let list = [];
            try { list = JSON.parse(el.getAttribute('data-ink') || '[]'); } catch (e) {}
            return '@@ink="' + params({ strokes: list.map((s) => [s.t, s.c, s.w, s.d].join(':')).join('|') }) + '"';
        }
        if (c.contains('dc-chip')) return '@@dice="' + params({ dice: el.getAttribute('data-dc') }) + '"';
        if (c.contains('tc-chip')) return '@@capsule="' + params({ label: txt('.tc-chip-name'), open: el.getAttribute('data-tc-open'), message: el.getAttribute('data-tc-msg') }) + '"';
        if (c.contains('pm-chip')) return '@@timer="' + params({ label: txt('.pm-chip-name'), minutes: el.getAttribute('data-pm-min') }) + '"';
        if (c.contains('fl-chip')) return '@@flashcard="' + params({ front: txt('.fl-front'), back: txt('.fl-back') }) + '"';
        if (c.contains('kd-emoji')) return '@@emoji="' + params({ d: el.getAttribute('data-emoji'), size: el.getAttribute('data-emoji-size') }) + '"';
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
            if (name === 'ink' && W.AnnotateInk) {
                const list = String(p.strokes || '').split('|').filter(Boolean).map((x) => { const q = x.split(':'); return { t: q[0], c: q[1], w: parseFloat(q[2]) || 6, d: q.slice(3).join(':') }; });
                return W.AnnotateInk.layerHtml(list);
            }
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
            } else if (name === 'emoji') {
                el = emojiChip(p.d || '', p.size);
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
    const SKILL_NAMES = /^(ink|beepbox|dice|capsule|timer|flashcard|sprite|emoji|unichip|customchip|customcss|jumper)$/;

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
        if (/^(gel-wax-chip|gel-pixel-chip|gel-candy-chip|gel-tube-chip|gel-marquee-chip|gel-crystal-chip|gel-washi-chip|gel-sticker-chip|gel-foil-chip|gel-blueprint-chip|gel-pebble-chip|gel-stub-chip|gel-bubble-chip|gel-pill-chip|gel-flag-chip|gel-tab-chip|gel-drop-chip|gel-split-chip|gel-lens-chip|jelly-chip|gel-label-chip|gel-aqua-chip|gel-glaze-chip|gel-sx-chip|gel-speech-chip|gel-aero-chip|gel-aeroglass-chip|gel-aeroorb-chip|gel-aeroglow-chip|gel-aeroring-chip|gel-aerobubble-chip|gel-aerotoast-chip|gel-aeronotice-chip|gel-aeromark-chip|gel-gloss-chip|gel-glosstube-chip|gel-glossdew-chip|gel-aeropane-chip|gel-aerowindow-chip|gel-aerotab-chip|gel-aerometer-chip|gel-aerobevel-chip|gel-aeroswipe-chip|gel-aerotape-chip|gel-aerotail-chip|gel-aerostack-chip|gel-rim-chip|gel-rimliquid-chip|gel-rimstripe-chip|gel-rimaccent-chip|gel-rimneon-chip|gel-rimfrost-chip|gel-rimdouble-chip|gel-rimdots-chip|gel-rimpearl-chip|gel-rimsteel-chip|gel-rimaurora-chip|gel-rimjelly-chip|gel-rimhail-chip|gel-rimbadge-chip|gel-logo-chip|gel-logoglass-chip|gel-logoribbon-chip|mkt-cp)/.test(cls)) return color(last.split('-').pop());
        if (/^gel-beacon-chip/.test(cls)) return COLOR_WORD[last.split('-').pop()] || color(last.split('-').pop());
        if (/^gel-(ticket|arrow|dogear|keycap)-chip/.test(cls)) return color(last.split('-').pop());
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
            ['Highlights', pick(/^an-hl an-hl-\w+$/)], ['Gel Underlines', pick(/an-s-ul$/)], ['Gel Strikes', pick(/an-s-st$/)], ['Gel Boxes', pick(/an-s-bx$/)], ['Corner Brackets', pick(/an-s-cb$/)], ['Gel Selects', pick(/an-s-sl$/)], ['Color Inks', pick(/an-s-ink$/)], ...AN_STYLES.slice(7).map((x) => [x[2], pick(new RegExp(x[1].trim() + '$'))]),
            ['Dark Gel Chips', pick(/^mkt-cp-/)], ['Bubble Chips', pick(/^gel-bubble-chip/)], ['Gloss Pills', pick(/^gel-pill-chip/)], ['Gel Flags', pick(/^gel-flag-chip/)], ['Gel Tabs', pick(/^gel-tab-chip/)], ['Gel Drops', pick(/^gel-drop-chip/)], ['Gel Splits', pick(/^gel-split-chip/)], ['Gel Lenses', pick(/^gel-lens-chip/)], ['Jelly Chips', pick(/^jelly-chip/)], ['Gel Label Chips', pick(/^gel-label-chip/)], ['Gel Aqua Chips', pick(/^gel-aqua-chip/)], ['Gel Glaze Chips', pick(/^gel-glaze-chip/)], ['Gel Speech', pick(/^gel-speech-chip/)], ['Gel Speech', pick(/^gel-speech-chip/)], ['Gel Tickets', pick(/^gel-ticket-chip/)], ['Gel Arrows', pick(/^gel-arrow-chip/)], ['Gel Dogears', pick(/^gel-dogear-chip/)], ['Gel Keycaps', pick(/^gel-keycap-chip/)], ['Aero Chips', pick(/^gel-aero-chip/)], ['Aero Glass Chips', pick(/^gel-aeroglass-chip/)], ['Aero Orb Chips', pick(/^gel-aeroorb-chip/)], ['Aero Glow Chips', pick(/^gel-aeroglow-chip/)], ['Aero Ring Chips', pick(/^gel-aeroring-chip/)], ['Aero Bubble Chips', pick(/^gel-aerobubble-chip/)], ['Aero Toast Chips', pick(/^gel-aerotoast-chip/)], ['Aero Notice Chips', pick(/^gel-aeronotice-chip/)], ['Aero Mark Chips', pick(/^gel-aeromark-chip/)], ['Gloss Chips', pick(/^gel-gloss-chip/)], ['Gloss Tube Chips', pick(/^gel-glosstube-chip/)], ['Gloss Dew Chips', pick(/^gel-glossdew-chip/)], ['Aero Pane Chips', pick(/^gel-aeropane-chip/)], ['Aero Window Chips', pick(/^gel-aerowindow-chip/)], ['Aero Tab Chips', pick(/^gel-aerotab-chip/)], ['Aero Meter Chips', pick(/^gel-aerometer-chip/)], ['Aero Bevel Chips', pick(/^gel-aerobevel-chip/)], ['Aero Swipe Chips', pick(/^gel-aeroswipe-chip/)], ['Aero Tape Chips', pick(/^gel-aerotape-chip/)], ['Aero Tail Chips', pick(/^gel-aerotail-chip/)], ['Aero Stack Chips', pick(/^gel-aerostack-chip/)], ['Rim Chips', pick(/^gel-rim-chip/)], ['Rim Liquid Chips', pick(/^gel-rimliquid-chip/)], ['Rim Stripe Chips', pick(/^gel-rimstripe-chip/)], ['Accent Rim Chips', pick(/^gel-rimaccent-chip/)], ['Rim Neon Chips', pick(/^gel-rimneon-chip/)], ['Rim Frost Chips', pick(/^gel-rimfrost-chip/)], ['Rim Double Chips', pick(/^gel-rimdouble-chip/)], ['Rim Dots Chips', pick(/^gel-rimdots-chip/)], ['Rim Pearl Chips', pick(/^gel-rimpearl-chip/)], ['Rim Steel Chips', pick(/^gel-rimsteel-chip/)], ['Rim Aurora Chips', pick(/^gel-rimaurora-chip/)], ['Rim Jelly Chips', pick(/^gel-rimjelly-chip/)], ['Rim Hail Chips', pick(/^gel-rimhail-chip/)], ['Rim Badge Chips', pick(/^gel-rimbadge-chip/)], ['Wax Seal Chips', pick(/^gel-wax-chip/)], ['Pixel Chips', pick(/^gel-pixel-chip/)], ['Candy Cane Chips', pick(/^gel-candy-chip/)], ['Neon Tube Chips', pick(/^gel-tube-chip/)], ['Marquee Chips', pick(/^gel-marquee-chip/)], ['Crystal Chips', pick(/^gel-crystal-chip/)], ['Washi Tape Chips', pick(/^gel-washi-chip/)], ['Sticker Chips', pick(/^gel-sticker-chip/)], ['Holo Foil Chips', pick(/^gel-foil-chip/)], ['Blueprint Chips', pick(/^gel-blueprint-chip/)], ['Pebble Chips', pick(/^gel-pebble-chip/)], ['Ticket Stub Chips', pick(/^gel-stub-chip/)], ['Logo Chips', pick(/^gel-logo-chip/)], ['Logo Glass Chips', pick(/^gel-logoglass-chip/)], ['Logo Ribbon Chips', pick(/^gel-logoribbon-chip/)], ['Gel Bevels', pick(/^gel-sx-chip gel-sx-1 /)], ['Gel Stripes', pick(/^gel-sx-chip gel-sx-2 /)], ['Gel Halos', pick(/^gel-sx-chip gel-sx-3 /)], ['Gel Dots', pick(/^gel-sx-chip gel-sx-4 /)], ['Gel Shelves', pick(/^gel-sx-chip gel-sx-5 /)], ['Gel Corners', pick(/^gel-sx-chip gel-sx-6 /)], ['Gel Rings', pick(/^gel-sx-chip gel-sx-7 /)], ['Gel Frames', pick(/^gel-sx-chip gel-sx-8 /)], ['Gel Bands', pick(/^gel-sx-chip gel-sx-9 /)], ['Gel Stitches', pick(/^gel-sx-chip gel-sx-10 /)], ['Gel Pebbles', pick(/^gel-sx-chip gel-sx-11 /)], ['Gel Rulers', pick(/^gel-sx-chip gel-sx-12 /)], ['Gel Waves', pick(/^gel-sx-chip gel-sx-13 /)], ['Gel Checks', pick(/^gel-sx-chip gel-sx-14 /)], ['Gel Bookends', pick(/^gel-sx-chip gel-sx-15 /)], ['Gel Sparkles', pick(/^gel-sx-chip gel-sx-16 /)], ['Gel Grids', pick(/^gel-sx-chip gel-sx-17 /)], ['Gel Insets', pick(/^gel-sx-chip gel-sx-18 /)], ['Gel Glows', pick(/^gel-sx-chip gel-sx-19 /)], ['Gel Beads', pick(/^gel-sx-chip gel-sx-20 /)], ['Tag Chips', pick(/^aero-tag-chip/)],
            ['Gel Orbs', pick(/^gel-orb/)], ['Gel Orbs', pick(/^gel-orb/)], ['Gel Beacons', pick(/^gel-beacon-chip/)], ['Text Effects', pick(/^(spark-text|gel-green-flash|liquid-underline|glossy-border-badge|cyber-glow-spark|liquid-text-glow|embossed-glass-text)$/)],
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

    root.kdEmojiSvg = emojiSvg;
    root.kdEmojiStrokes = emojiStrokes;
    root.kdEmojiSer = emojiSer;
    root.kdEmojiChip = emojiChip;
    root.kdDoc = { inlineHtml: (t) => inline(t, { notes: {} }), sourceOf, parse, isKeydownText, formatLine: (c) => { try { return formatLine(c); } catch (e) { try { console.error('[Keydown] Enter formatting failed', e); root.kdLastError = e; } catch (x) {} return false; } }, inFence, skillToText, skillHtml, exitFormatting, styleCategories, styleMenu, applyStyle, unformat, reformat, checkKeydown, blockFromLine, blockOf, textToHtml, htmlToText, toEditorHtml, toEntry, toFileText, fromFileText, styleCss, atTableHtml: (spec, opts) => { const t = readAtTable(String(spec), 0); return t ? atTableHtml(t, Object.assign({ notes: {} }, opts)) : null; }, HL_COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
