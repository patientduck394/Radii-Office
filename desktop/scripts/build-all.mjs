// Builds the desktop apps! For each Radii Office app:
//   1. stage/<id>/ gets the app's folder plus every shared file its code points to (/offline.js,
//      ../writeout/keydown-doc.js, /imbuer/formula_engine.js...), laid out like the website, so every path still works;
//   2. src-tauri/icons/<id>/ gets the app's icon in every size (from its favicon design, see apps.json);
//   3. src-tauri/conf/<id>.json names the app and points its window at <id>/index.html;
//   4. tauri build makes the installer, copied to the out folder as <Name>-<label>.<ext>.
// Run: node scripts/build-all.mjs [--site <folder>] [--target <rust triple>] [--label <name>] [--out <folder>] [--apps writeout,bitbook] [--stage-only]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i === -1 ? d : process.argv[i + 1]; };
const SITE = path.resolve(arg('site', path.join(HERE, '..', 'radii-office deployment')));
const TARGET = arg('target', '');
const OUT = path.resolve(arg('out', path.join(HERE, 'dist')));
const ONLY = arg('apps', '') ? arg('apps', '').split(',') : null;
const PLATFORM = TARGET ? (TARGET.includes('apple') ? 'mac' : TARGET.includes('windows') ? 'windows' : 'linux')
    : (process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows' : 'linux');
const LABEL = arg('label', PLATFORM);
const KIND = { mac: ['dmg', '.dmg'], windows: ['nsis', '.exe'], linux: ['appimage', '.AppImage'] }[PLATFORM];
const TAURI = path.join(HERE, 'node_modules', '.bin', process.platform === 'win32' ? 'tauri.cmd' : 'tauri');
const APPS = JSON.parse(fs.readFileSync(path.join(HERE, 'apps.json'), 'utf8')).filter((a) => !ONLY || ONLY.includes(a.id));

/* ---------- 1. staging: the app's folder + the shared files it uses ---------- */
const TEXT = /\.(html|js|mjs|css|svg)$/i;
// never carried: the website's own offline worker and its download files
const SKIP = (rel) => /^(sw\.js|downloads\/)/.test(rel) || /(^|\/)\.DS_Store$/.test(rel);
function walk(dir, rel = '') {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel + e.name + '/'));
        else if (e.isFile()) out.push(rel + e.name);
    }
    return out;
}
// every string in a file that looks like a path to another file of the site
function refsIn(rel, text) {
    const found = new Set();
    const base = path.posix.dirname(rel);
    const re = /["'(`]((?:\/|\.\.?\/)?[A-Za-z0-9_\-./%]+\.(?:js|mjs|css|png|svg|jpg|jpeg|gif|webp|ico|json|woff2?|ttf|otf|mp3|ogg|wav|kd|kb|ks|html|txt|md))(?:[?#][^"'`)]*)?["'`)]/g;
    let m;
    while ((m = re.exec(text))) {
        let ref = m[1];
        if (/^(https?:|data:|blob:)/.test(ref)) continue;
        try { ref = decodeURIComponent(ref); } catch (e) {}
        const p = ref.startsWith('/') ? ref.slice(1) : path.posix.normalize(path.posix.join(base, ref));
        if (!p.startsWith('..')) found.add(p);
    }
    return found;
}
function stage(app) {
    const dest = path.join(HERE, 'stage', app.id);
    fs.rmSync(dest, { recursive: true, force: true });
    const files = new Set(walk(path.join(SITE, app.id), app.id + '/').filter((f) => !SKIP(f)));
    const queue = [...files];
    while (queue.length) {
        const f = queue.pop();
        if (!TEXT.test(f)) continue;
        let text;
        try { text = fs.readFileSync(path.join(SITE, f), 'utf8'); } catch (e) { continue; }
        for (const r of refsIn(f, text)) {
            if (files.has(r) || SKIP(r)) continue;
            const abs = path.join(SITE, r);
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
            files.add(r);
            queue.push(r);
        }
    }
    let bytes = 0;
    for (const f of files) {
        const to = path.join(dest, f);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(path.join(SITE, f), to);
        bytes += fs.statSync(to).size;
    }
    return { count: files.size, mb: (bytes / 1048576).toFixed(1) };
}

/* ---------- 2. icons ---------- */
function icons(app) {
    const src = app.icon.startsWith('icon-src/') ? path.join(HERE, app.icon) : path.join(SITE, app.icon);
    const dir = path.join(HERE, 'src-tauri', 'icons', app.id);
    fs.rmSync(dir, { recursive: true, force: true });
    execFileSync(TAURI, ['icon', src, '-o', dir], { cwd: HERE, stdio: 'ignore', shell: process.platform === 'win32' });
}

/* ---------- 3. the app's config (merged over src-tauri/tauri.conf.json) ---------- */
function config(app) {
    const conf = {
        productName: app.name,
        mainBinaryName: app.name,
        identifier: 'com.radiioffice.' + app.id,
        build: { frontendDist: '../stage/' + app.id },
        app: {
            windows: [{ label: 'main', title: app.name, url: app.id + '/index.html', width: 1280, height: 860, minWidth: 480, minHeight: 400, resizable: true, create: false }],
            security: { csp: null }
        },
        bundle: {
            icon: ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.icns', 'icon.ico', 'icon.png'].map((f) => 'icons/' + app.id + '/' + f)
        }
    };
    // Code signing switches on by itself when the release workflow has the certificates (see .github/workflows/desktop.yml):
    // macOS: APPLE_SIGNING_IDENTITY (plus APPLE_CERTIFICATE, APPLE_ID... which the Tauri CLI reads itself to sign and notarize)
    // Windows: WINDOWS_CERTIFICATE_THUMBPRINT (the workflow imports the certificate and sets it)
    if (process.env.APPLE_SIGNING_IDENTITY) conf.bundle.macOS = { signingIdentity: process.env.APPLE_SIGNING_IDENTITY };
    if (process.env.WINDOWS_CERTIFICATE_THUMBPRINT) conf.bundle.windows = { certificateThumbprint: process.env.WINDOWS_CERTIFICATE_THUMBPRINT, digestAlgorithm: 'sha256', timestampUrl: process.env.WINDOWS_TIMESTAMP_URL || 'http://timestamp.digicert.com', nsis: { installMode: 'currentUser' } };
    const file = path.join(HERE, 'src-tauri', 'conf', app.id + '.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(conf, null, 2));
    return file;
}

/* ---------- 4. build + collect ---------- */
function newest(dir, ext) {
    if (!fs.existsSync(dir)) return null;
    return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}
fs.mkdirSync(OUT, { recursive: true });
const done = [], failed = [];
for (const app of APPS) {
    const t0 = Date.now();
    try {
        const st = stage(app);
        if (process.argv.includes('--stage-only')) { done.push(`${app.id}: ${st.count} files (${st.mb} MB)`); continue; }
        icons(app);
        const conf = config(app);
        console.log(`\n=== ${app.name}: ${st.count} files (${st.mb} MB), building ${KIND[0]}${TARGET ? ' for ' + TARGET : ''}...`);
        const args = ['build', '--config', conf, '--bundles', KIND[0]];
        if (TARGET) args.push('--target', TARGET);
        execFileSync(TAURI, args, { cwd: HERE, stdio: 'inherit', shell: process.platform === 'win32' });
        const bundleDir = path.join(HERE, 'src-tauri', 'target', TARGET || '', 'release', 'bundle', KIND[0]);
        const file = newest(bundleDir, KIND[1]);
        if (!file) throw new Error('no ' + KIND[1] + ' in ' + bundleDir);
        const name = `${app.name}-${LABEL}${KIND[1]}`;
        fs.copyFileSync(file, path.join(OUT, name));
        done.push(`${name} (${(fs.statSync(path.join(OUT, name)).size / 1048576).toFixed(1)} MB, ${Math.round((Date.now() - t0) / 1000)}s)`);
    } catch (e) {
        console.error(`!!! ${app.name} failed: ${e.message}`);
        failed.push(app.name);
    }
}
console.log('\nBuilt:\n  ' + done.join('\n  '));
if (failed.length) { console.error('Failed: ' + failed.join(', ')); process.exit(1); }
