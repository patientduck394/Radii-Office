// Builds every app's phone page (run: node scripts/build_mobile.mjs)!
// Each phone page is made from the app's own index.html, so it runs exactly the same code:
//   * <base> points every file back at the app's folder,
//   * <html data-os-phone> turns on the shared shell's phone mode (touch-size ribbon and menus),
//   * links like href="#/..." still change the page's own address instead of jumping to the desktop page.
// Writeout and Bitbook already have a separate mobile app at /mobile/ (their Classic mobile style), so their
// New-style phone page goes to /mobile/new/, and its Classic switch leads back to that mobile app.
// Never edit a generated page by hand: edit the app's index.html and run this again (build_source.mjs does).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// [app folder, where its phone page goes, the Classic mobile app's address (if it has one)]
const PAGES = [
    ['writeout', 'mobile/new', '/writeout/mobile/'],
    ['bitbook', 'mobile/new', '/bitbook/mobile/'],
    ...['amber', 'imbuer', 'omicron', 'cabinet', 'mainkey', 'inkpath', 'peeker', 'phosphor', 'antimony', 'formly', 'hexa', 'taskra', 'waterflow', 'opendb']
        .map((a) => [a, 'mobile', null]),
];

export function build() {
    const made = [];
    for (const [app, sub, classicUrl] of PAGES) {
        const src = path.join(ROOT, app, 'index.html');
        if (!fs.existsSync(src)) continue;
        let html = fs.readFileSync(src, 'utf8');
        const base = '../'.repeat(sub.split('/').length);
        const head = `
    <!-- Made by scripts/build_mobile.mjs from /${app}/index.html: edit that page, not this one! -->
    <base href="${base}">
    <script>
    (function () {
        // remember that this phone uses the New style for ${app}
        try { localStorage.setItem('radii-mobile-style-${app}', 'new'); } catch (e) {}
        // with <base>, a link like href="#/e/qubit" would jump to the desktop page: keep it on this page
        document.addEventListener('click', function (e) {
            var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
            if (!a || e.defaultPrevented || a.target) return;
            var h = a.getAttribute('href');
            if (!h || h.length < 2) return;
            e.preventDefault();
            location.hash = h.slice(1);
        });
    })();
    </script>`;
        html = html.replace(/<head([^>]*)>/i, (m) => m + head);
        if (!/name=["']viewport["']/i.test(html)) html = html.replace('</head>', '    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>');
        html = html.replace(/<html([^>]*)>/i, (m, attrs) => '<html' + attrs + ' data-os-phone' + (classicUrl ? ' data-os-classic-url="' + classicUrl + '"' : '') + '>');
        const out = path.join(ROOT, app, sub, 'index.html');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, html);
        made.push(app + '/' + sub + '/');
    }
    return made;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const made = build();
    console.log('Phone pages built! ' + made.length + ': ' + made.join(', ') + '!');
}
