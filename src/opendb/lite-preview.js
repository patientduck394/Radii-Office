/* =====================================================================
   Lite previews! A lite's files, running right on its page:
     Web page        the .html file, with the lite's .css, .js and .svg files put in where it links them
     CSS             the .css files on a sample page (headings, text, buttons, a form, a list, a table...)
     Svelte          the .svelte components compiled in the browser (Svelte 5) and App.svelte mounted
     Python          a Python terminal (Pyodide): main.py runs, then type more Python at the >>> prompt
     Zonerider scene a .zr scene (or a .gltf model) in a 3D view you can turn and zoom
   Every preview runs in a sandboxed frame with no access to OpenDB, so a lite can never touch the page.
   window.LitePreview = { KINDS, kinds(files), auto(files, chosen), mount(box, files, kind) }
   ===================================================================== */
(function () {
    'use strict';
    const SVELTE = '5.19.0', PYODIDE = '0.26.4', THREE = '0.170.0';
    const ext = (n) => ((/\.([a-z0-9]+)$/i.exec(n || '') || [])[1] || '').toLowerCase();
    const has = (files, re) => files.some((f) => re.test(ext(f.name)));
    const KINDS = {
        html: { label: 'Web page', test: (f) => has(f, /^html?$/) },
        css: { label: 'CSS', test: (f) => has(f, /^css$/) },
        svelte: { label: 'Svelte', test: (f) => has(f, /^svelte$/) },
        python: { label: 'Python', test: (f) => has(f, /^py$/) },
        zonerider: { label: 'Zonerider scene', test: (f) => has(f, /^(zr|gltf)$/) },
        godot: { label: 'Godot shader', test: (f) => has(f, /^gdshader$/) },
        keydown: { label: 'Keydown', test: (f) => has(f, /^(kd|kn|md)$/) }
    };
    const ORDER = ['html', 'svelte', 'zonerider', 'godot', 'python', 'css', 'keydown'];
    function kinds(files) { return ORDER.filter((k) => KINDS[k].test(files || [])); }
    // the lite's own choice (preview: header) when it fits its files, otherwise the best one it has
    function auto(files, chosen) {
        if (chosen === 'none') return null;
        const list = kinds(files);
        return chosen && list.includes(chosen) ? chosen : list[0] || null;
    }
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // the files travel into the frame as JSON (with < escaped, so no file can close the script tag)
    const filesJson = (files) => '<script type="application/json" id="lite-files">' + JSON.stringify(files.map((f) => ({ name: f.name, code: f.code }))).replace(/</g, '\\u003c') + '</script>';
    const BASE_CSS = 'html,body{margin:0}body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}';

    /* ---------- Web page ---------- */
    function pageDoc(files) {
        const byName = new Map(files.map((f) => [f.name.replace(/^\.\//, ''), f]));
        const page = files.find((f) => /^index\.html?$/i.test(f.name)) || files.find((f) => /\.html?$/i.test(f.name));
        const find = (href) => byName.get(String(href).replace(/^\.\//, '').split(/[?#]/)[0]);
        let html = page.code;
        // <link rel="stylesheet" href="style.css"> and <script src="app.js"> come from the lite itself
        html = html.replace(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, (m, href) => { const f = find(href); return f && /stylesheet/i.test(m) ? '<style data-file="' + esc(f.name) + '">\n' + f.code + '\n</style>' : m; });
        html = html.replace(/<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (m, a, src, b) => { const f = find(src); return f ? '<script' + a + b + ' data-file="' + esc(f.name) + '">\n' + f.code.replace(/<\/script/gi, '<\\/script') + '\n</script>' : m; });
        // pictures that are lite files (SVG is text, so it can be a lite file)
        html = html.replace(/(\bsrc\s*=\s*["'])([^"']+\.svg)(["'])/gi, (m, a, src, b) => { const f = find(src); return f ? a + 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.code) + b : m; });
        if (!/<html[\s>]/i.test(html)) html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + BASE_CSS + 'body{padding:16px}</style>' + html;
        return html;
    }

    /* ---------- CSS on a sample page ---------- */
    function cssDoc(files) {
        const css = files.filter((f) => /\.css$/i.test(f.name)).map((f) => '/* ' + f.name.replace(/\*\//g, '') + ' */\n' + f.code).join('\n\n');
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + BASE_CSS + 'body{padding:18px}</style><style>' + css.replace(/<\/style/gi, '<\\/style') + '</style></head><body>' +
            '<h1>Heading one</h1><h2>Heading two</h2><h3>Heading three</h3>' +
            '<p>A paragraph with <a href="#">a link</a>, <strong>bold</strong>, <em>italic</em>, <code>code</code> and <mark>marked</mark> words. The quick brown fox jumps over the lazy dog!</p>' +
            '<p><button>Button</button> <button class="gel">.gel</button> <button class="gel gel-green">.gel-green</button> <button class="primary">.primary</button> <button disabled>Disabled</button></p>' +
            '<form onsubmit="return false"><p><label>Name <input placeholder="Type here"></label> <label><input type="checkbox" checked> Checkbox</label> <label><input type="radio" name="r" checked> Radio</label></p>' +
            '<p><select><option>Select</option><option>Another</option></select> <input type="range"> <progress value="60" max="100"></progress></p><p><textarea rows="2" cols="40">A text area</textarea></p></form>' +
            '<blockquote>A quote, to see how blockquote looks!</blockquote>' +
            '<ul><li>First item</li><li>Second item</li></ul><ol><li>One</li><li>Two</li></ol>' +
            '<table><thead><tr><th>Name</th><th>Score</th></tr></thead><tbody><tr><td>Ann</td><td>92</td></tr><tr><td>Bo</td><td>87</td></tr></tbody></table>' +
            '<div class="card box panel"><h3>A .card / .box / .panel</h3><p>Some text inside it.</p></div><hr><small>Small print</small></body></html>';
    }

    /* ---------- Svelte ---------- */
    function svelteDoc(files) {
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + BASE_CSS + 'body{padding:16px}#lp-msg{font:13px/1.5 ui-monospace,Menlo,monospace;color:#64748b}#lp-msg.err{color:#b91c1c;white-space:pre-wrap}</style></head><body><div id="lp-msg">Compiling with Svelte ' + SVELTE + '…</div><div id="app"></div>' +
            filesJson(files) + '<script type="module">' +
            'const V = ' + JSON.stringify(SVELTE) + ';' +
            'const msg = document.getElementById("lp-msg");' +
            'const files = JSON.parse(document.getElementById("lite-files").textContent);' +
            'const by = new Map(files.map((f) => [f.name.replace(/^\\.\\//, ""), f]));' +
            // a path relative to the importing file, like ./Button.svelte or ../lib/util.js
            'const resolve = (from, spec) => { const parts = from.split("/").slice(0, -1); for (const p of spec.split("/")) { if (p === "..") parts.pop(); else if (p !== ".") parts.push(p); } return parts.join("/"); };' +
            'const done = new Map(), busy = new Set();' +
            'let compile;' +
            'const fix = (code, from) => code.replace(/(\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\bimport\\s+)(["\'])([^"\'\\n]+)\\2/g, (m, pre, q, spec) => {' +
            '  if (spec === "svelte" || spec.startsWith("svelte/")) return pre + q + "https://esm.sh/svelte@" + V + spec.slice(6) + q;' +
            '  if (spec.startsWith("./") || spec.startsWith("../")) return pre + q + url(resolve(from, spec)) + q;' +
            '  if (/^https?:/.test(spec)) return m;' +
            '  return pre + q + "https://esm.sh/" + spec + "?deps=svelte@" + V + q; });' +
            'function url(name) {' +
            '  if (done.has(name)) return done.get(name);' +
            '  if (busy.has(name)) throw new Error(name + " imports itself in a circle (two files import each other)!");' +
            '  const f = by.get(name);' +
            '  if (!f) throw new Error("A file imports " + name + ", but this lite has no file with that name!");' +
            '  busy.add(name);' +
            '  let code;' +
            '  if (/\\.svelte$/i.test(name)) code = compile(f.code, { filename: name, generate: "client", css: "injected" }).js.code;' +
            '  else if (/\\.css$/i.test(name)) code = "const s = document.createElement(\\"style\\"); s.textContent = " + JSON.stringify(f.code) + "; document.head.appendChild(s); export default \\"\\";";' +
            '  else if (/\\.json$/i.test(name)) code = "export default " + f.code + ";";' +
            '  else code = f.code;' +
            '  const u = "data:text/javascript;charset=utf-8," + encodeURIComponent(fix(code, name)).replace(/\x27/g, "%27");' +
            '  busy.delete(name); done.set(name, u); return u;' +
            '}' +
            'try {' +
            '  ({ compile } = await import("https://esm.sh/svelte@" + V + "/compiler"));' +
            '  const entry = [...by.keys()].find((n) => /(^|\\/)App\\.svelte$/i.test(n)) || [...by.keys()].find((n) => /\\.svelte$/i.test(n));' +
            '  const App = (await import(url(entry))).default;' +
            '  const { mount } = await import("https://esm.sh/svelte@" + V);' +
            '  msg.remove();' +
            '  mount(App, { target: document.getElementById("app") });' +
            '} catch (e) { msg.className = "err"; msg.textContent = "The Svelte preview could not start!\\n" + (e && e.message || e); }' +
            '<\/script></body></html>';
    }

    /* ---------- Python terminal (Pyodide) ---------- */
    function pythonDoc(files) {
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
            'html,body{margin:0;height:100%}body{display:flex;flex-direction:column;background:#0b1622;color:#d7f3ff;font:13px/1.5 "JetBrains Mono",ui-monospace,Menlo,monospace}' +
            '#bar{display:flex;gap:6px;align-items:center;padding:6px 8px;background:linear-gradient(180deg,#123049,#0c2133);border-bottom:1px solid #1d4a6b}' +
            '#bar b{color:#7dd3fc;font-weight:700;margin-right:auto}#bar button{font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid #2b6a94;background:linear-gradient(180deg,#38bdf8,#0369a1);color:#fff;cursor:pointer}#bar button.s{background:#14324a;color:#bae6fd}' +
            '#out{flex:1;overflow:auto;padding:8px 10px;white-space:pre-wrap;word-break:break-word}.sys{color:#7dd3fc}.err{color:#fca5a5}.in{color:#fdba74}' +
            '#f{display:flex;gap:6px;padding:6px 10px;border-top:1px solid #1d4a6b;background:#0e1d2c}#p{color:#fb923c}#in{flex:1;background:none;border:0;outline:none;color:#fff;font:inherit}' +
            '</style></head><body><div id="bar"><b>Python</b><button type="button" id="run">Run again</button><button type="button" class="s" id="clear">Clear</button></div><div id="out" role="log" aria-live="polite"></div>' +
            '<form id="f"><span id="p">&gt;&gt;&gt;</span><input id="in" autocomplete="off" spellcheck="false" aria-label="Python input" disabled></form>' +
            filesJson(files) +
            '<script src="https://cdn.jsdelivr.net/pyodide/v' + PYODIDE + '/full/pyodide.js"><\/script><script>' +
            'const out = document.getElementById("out"), input = document.getElementById("in"), promptEl = document.getElementById("p");' +
            'const files = JSON.parse(document.getElementById("lite-files").textContent);' +
            'function print(t, cls) { const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = t + "\\n"; out.appendChild(s); out.scrollTop = out.scrollHeight; }' +
            'let py = null, buffer = [];' +
            'const main = files.find((f) => /(^|\\/)main\\.py$/i.test(f.name)) || files.find((f) => /\\.py$/i.test(f.name));' +
            'async function run(code, name) { try { await py.loadPackagesFromImports(code); await py.runPythonAsync(code, { filename: name }); } catch (e) { print(String(e.message || e).replace(/^PythonError: /, "").trimEnd(), "err"); } }' +
            'async function start() {' +
            '  print("Loading Python (Pyodide ' + PYODIDE + ')…", "sys");' +
            '  try { py = await loadPyodide({ stdout: (t) => print(t), stderr: (t) => print(t, "err") }); } catch (e) { print("Python could not load! Check your internet connection. " + e, "err"); return; }' +
            '  py.setStdin({ stdin: () => { const v = window.prompt("The program asks for input:"); if (v !== null) print(v, "in"); return v === null ? "" : v; } });' +
            '  for (const f of files) { const parts = f.name.split("/"); for (let i = 1; i < parts.length; i++) { try { py.FS.mkdir(parts.slice(0, i).join("/")); } catch (e) {} } py.FS.writeFile(f.name, f.code); }' +
            '  py.runPython("import ast\\ndef __lite_run(src):\\n    tree = ast.parse(src, \\"<stdin>\\", \\"exec\\")\\n    if tree.body and isinstance(tree.body[-1], ast.Expr):\\n        last = ast.Expression(tree.body.pop().value)\\n        exec(compile(tree, \\"<stdin>\\", \\"exec\\"), globals())\\n        r = eval(compile(last, \\"<stdin>\\", \\"eval\\"), globals())\\n        if r is not None: print(repr(r))\\n    else:\\n        exec(compile(tree, \\"<stdin>\\", \\"exec\\"), globals())\\n");' +
            '  print("Python " + py.runPython("import sys; sys.version.split()[0]") + " is ready!", "sys");' +
            '  if (main) { print("Running " + main.name + "…", "sys"); await run(main.code, main.name); }' +
            '  print("Type Python below and press Enter! (A line ending in : waits for the block, then an empty line runs it)", "sys");' +
            '  input.disabled = false; input.focus();' +
            '}' +
            'document.getElementById("f").addEventListener("submit", async (e) => {' +
            '  e.preventDefault(); if (!py) return;' +
            '  const line = input.value; input.value = "";' +
            '  print((buffer.length ? "... " : ">>> ") + line, "in");' +
            '  if (buffer.length || /:\\s*$/.test(line)) { if (line.trim() !== "" || !buffer.length) { buffer.push(line); promptEl.textContent = "..."; return; } }' +
            '  const src = buffer.length ? buffer.join("\\n") : line; buffer = []; promptEl.textContent = ">>>";' +
            '  if (!src.trim()) return;' +
            '  input.disabled = true;' +
            '  try { await py.loadPackagesFromImports(src); py.globals.get("__lite_run")(src); } catch (err) { print(String(err.message || err).replace(/^PythonError: /, "").trimEnd(), "err"); }' +
            '  input.disabled = false; input.focus();' +
            '});' +
            'document.getElementById("run").onclick = () => { if (py && main) { print("Running " + main.name + " again…", "sys"); run(main.code, main.name); } };' +
            'document.getElementById("clear").onclick = () => { out.textContent = ""; };' +
            'start();' +
            '<\/script></body></html>';
    }

    /* ---------- Zonerider scene (three.js) ---------- */
    function sceneDoc(files) {
        const T = 'https://cdn.jsdelivr.net/npm/three@' + THREE;
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#2b2f35}canvas{display:block;width:100%;height:100%;touch-action:none}' +
            '#msg{position:absolute;left:10px;bottom:8px;font:12px system-ui,sans-serif;color:#c5ff11;text-shadow:0 1px 2px #000}#msg.err{color:#fca5a5}#pick{position:absolute;right:8px;top:8px;font:12px system-ui;padding:3px 6px;border-radius:6px;background:#1b1e22;color:#e6e9ee;border:1px solid #8fc400}</style>' +
            '<script type="importmap">' + JSON.stringify({ imports: { three: T + '/build/three.module.min.js', 'three/addons/': T + '/examples/jsm/' } }) + '<\/script></head><body><canvas id="c"></canvas><div id="msg">Loading the 3D view…</div>' +
            filesJson(files) + '<script type="module">' +
            'import * as THREE from "three"; import { OrbitControls } from "three/addons/controls/OrbitControls.js"; import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"; import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";' +
            'const msg = document.getElementById("msg");' +
            'const files = JSON.parse(document.getElementById("lite-files").textContent).filter((f) => /\\.(zr|gltf)$/i.test(f.name));' +
            // the shapes Zonerider rebuilds from their settings (a .zr file leaves their vertices out)
            'const P = { cube: (p) => new THREE.BoxGeometry(p.width ?? 2, p.height ?? 2, p.depth ?? 2, p.widthSegments ?? 1, p.heightSegments ?? 1, p.depthSegments ?? 1), sphere: (p) => new THREE.SphereGeometry(p.radius ?? 1, p.widthSegments ?? 32, p.heightSegments ?? 16), icosphere: (p) => new THREE.IcosahedronGeometry(p.radius ?? 1, p.detail ?? 2), cylinder: (p) => new THREE.CylinderGeometry(p.radiusTop ?? 1, p.radiusBottom ?? 1, p.height ?? 2, p.radialSegments ?? 32, p.heightSegments ?? 1), cone: (p) => new THREE.ConeGeometry(p.radius ?? 1, p.height ?? 2, p.radialSegments ?? 32), torus: (p) => new THREE.TorusGeometry(p.radius ?? 1, p.tube ?? 0.3, p.radialSegments ?? 16, p.tubularSegments ?? 48), torusknot: (p) => new THREE.TorusKnotGeometry(p.radius ?? 1, p.tube ?? 0.3, p.tubularSegments ?? 128, p.radialSegments ?? 16, p.p ?? 2, p.q ?? 3), plane: (p) => new THREE.PlaneGeometry(p.width ?? 2, p.depth ?? 2, p.widthSegments ?? 1, p.depthSegments ?? 1).rotateX(-Math.PI / 2), capsule: (p) => new THREE.CapsuleGeometry(p.radius ?? 0.6, p.length ?? 1.2, p.capSegments ?? 8, p.radialSegments ?? 24) };' +
            'const canvas = document.getElementById("c");' +
            'const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;' +
            'const scene = new THREE.Scene(); scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)); scene.add(new THREE.GridHelper(20, 20, 0x5a6270, 0x40454d));' +
            'const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000); camera.position.set(7, 5, 8);' +
            'const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.8; canvas.addEventListener("pointerdown", () => { controls.autoRotate = false; });' +
            'const root = new THREE.Group(); scene.add(root);' +
            'function frame() { const box = new THREE.Box3().setFromObject(root); if (box.isEmpty()) return; const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.5, box.getSize(new THREE.Vector3()).length() / 2); controls.target.copy(c); camera.position.copy(c).add(new THREE.Vector3(1, 0.7, 1.15).normalize().multiplyScalar(r / Math.sin(camera.fov * Math.PI / 360) * 0.85)); controls.update(); }' +
            'async function show(f) {' +
            '  while (root.children.length) root.remove(root.children[0]);' +
            '  try {' +
            '    const data = JSON.parse(f.code);' +
            '    if (/\\.zr$/i.test(f.name)) {' +
            '      if (data.format !== "zonerider" || !data.scene) throw new Error(f.name + " is not a Zonerider scene!");' +
            '      const g = new THREE.ObjectLoader().parse(data.scene);' +
            '      g.traverse((o) => { const z = o.userData.zr; if (o.isMesh && z && z.prim && P[z.prim]) { o.geometry.dispose(); o.geometry = P[z.prim](z.params || {}); } if (o.isLight) o.intensity = (o.userData.zrIntensity ?? o.intensity) * 0.35; if (o.userData.zrHidden) o.visible = false; });' +
            '      const bg = data.settings && data.settings.world && data.settings.world.bg; scene.background = new THREE.Color(bg || "#3a3a3a");' +
            '      root.add(g);' +
            '    } else { const gl = await new GLTFLoader().parseAsync(f.code, ""); root.add(gl.scene); scene.background = new THREE.Color("#2b2f35"); }' +
            '    frame(); msg.textContent = f.name + ": drag to turn, scroll to zoom!"; msg.className = "";' +
            '  } catch (e) { msg.className = "err"; msg.textContent = "Could not show " + f.name + ": " + (e && e.message || e); }' +
            '}' +
            'if (files.length > 1) { const s = document.createElement("select"); s.id = "pick"; s.setAttribute("aria-label", "Scene"); files.forEach((f, i) => s.add(new Option(f.name, i))); s.onchange = () => show(files[+s.value]); document.body.appendChild(s); }' +
            'const size = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / Math.max(1, innerHeight); camera.updateProjectionMatrix(); }; addEventListener("resize", size); size();' +
            'show(files[0]);' +
            'renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });' +
            '<\/script></body></html>';
    }

    /* ---------- Godot shader (.gdshader) on a 3D shape, with Zonerider's own translator ---------- */
    function godotDoc(files) {
        const T = 'https://cdn.jsdelivr.net/npm/three@' + THREE;
        // (zonerider/gdshader.js is served to any page, so the sandboxed frame can import it from here)
        const GD = location.origin + '/zonerider/gdshader.js';
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#2b2f35}canvas{display:block;width:100%;height:100%;touch-action:none}' +
            '#msg{position:absolute;left:10px;bottom:8px;right:10px;font:12px system-ui,sans-serif;color:#c5ff11;text-shadow:0 1px 2px #000;white-space:pre-wrap}#msg.err{color:#fecaca;background:rgba(59,13,18,.92);padding:6px 8px;border-radius:8px;font-family:ui-monospace,Menlo,monospace;text-shadow:none}' +
            '#ui{position:absolute;right:8px;top:8px;display:flex;gap:6px}select{font:12px system-ui;padding:3px 6px;border-radius:6px;background:#1b1e22;color:#e6e9ee;border:1px solid #8fc400}</style>' +
            '<script type="importmap">' + JSON.stringify({ imports: { three: T + '/build/three.module.min.js', 'three/addons/': T + '/examples/jsm/', gdshader: GD } }) + '<\/script></head><body><canvas id="c"></canvas><div id="ui"></div><div id="msg">Loading the shader…</div>' +
            filesJson(files) + '<script type="module">' +
            'import * as THREE from "three"; import { OrbitControls } from "three/addons/controls/OrbitControls.js"; import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";' +
            'const msg = document.getElementById("msg"), ui = document.getElementById("ui");' +
            'const files = JSON.parse(document.getElementById("lite-files").textContent).filter((f) => /\\.gdshader$/i.test(f.name));' +
            'let G; try { G = await import("gdshader"); } catch (e) { msg.className = "err"; msg.textContent = "The shader translator could not load! " + e.message; throw e; }' +
            'const canvas = document.getElementById("c");' +
            'const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;' +
            'let shaderError = ""; renderer.debug.onShaderError = (gl, prog, vs, fs) => { shaderError = [gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs)].join("\\n").split("\\n").filter((l) => /error/i.test(l)).map((l) => l.replace(/^ERROR:\\s*\\d+:\\d+:\\s*/i, "")).slice(0, 5).join("\\n") || "The shader could not be compiled!"; };' +
            'const scene = new THREE.Scene(); scene.background = new THREE.Color("#2b2f35"); scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;' +
            'const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 4, 2.5); scene.add(sun, new THREE.AmbientLight(0xffffff, 0.25));' +
            'const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#3b4048", roughness: 0.9 })); floor.position.y = -1.3; scene.add(floor);' +
            'const SHAPES = { sphere: () => new THREE.SphereGeometry(1, 64, 40), cube: () => new THREE.BoxGeometry(1.5, 1.5, 1.5, 24, 24, 24), knot: () => new THREE.TorusKnotGeometry(0.8, 0.28, 200, 32), plane: () => new THREE.PlaneGeometry(2.4, 2.4, 64, 64).rotateX(-Math.PI / 2) };' +
            'const mesh = new THREE.Mesh(SHAPES.sphere(), new THREE.MeshPhysicalMaterial({ color: "#cccccc" })); scene.add(mesh);' +
            'const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100); camera.position.set(2.6, 1.8, 3.6);' +
            'const controls = new OrbitControls(camera, canvas); controls.enableDamping = true;' +
            'const rt = new THREE.WebGLRenderTarget(4, 4); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const quadScene = new THREE.Scene(); quadScene.add(quad); const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);' +
            'let screen = null;' +
            'function draw() { if (screen) { renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); screen.uniforms.tDiffuse.value = rt.texture; quad.material = screen; renderer.render(quadScene, quadCam); } else renderer.render(scene, camera); }' +
            'function show(f) {' +
            '  shaderError = ""; screen = null;' +
            '  try {' +
            '    const p = G.parseGd(f.code);' +
            '    if (p.type === "spatial") { const m = p.modes.includes("unshaded") ? new THREE.MeshBasicMaterial() : new THREE.MeshPhysicalMaterial({ color: "#cccccc", roughness: 0.5 }); G.applySpatial(m, p); mesh.material = m; }' +
            '    else { mesh.material = new THREE.MeshPhysicalMaterial({ color: "#cccccc", roughness: 0.4, clearcoat: 1 }); screen = G.screenMaterial(p); }' +
            '    draw();' +
            '    if (shaderError) throw new Error(shaderError);' +
            '    msg.className = ""; msg.textContent = f.name + " (" + (p.type === "spatial" ? "on the shape" : "on the whole picture") + "): drag to turn, scroll to zoom!";' +
            '  } catch (e) { msg.className = "err"; msg.textContent = f.name + ": " + (e && e.message || e); screen = null; mesh.material = new THREE.MeshPhysicalMaterial({ color: "#cccccc" }); }' +
            '}' +
            'const shape = document.createElement("select"); shape.setAttribute("aria-label", "Shape"); [["sphere", "Sphere"], ["cube", "Cube"], ["knot", "Torus knot"], ["plane", "Plane"]].forEach(([v, t]) => shape.add(new Option(t, v))); shape.onchange = () => { mesh.geometry.dispose(); mesh.geometry = SHAPES[shape.value](); }; ui.appendChild(shape);' +
            'let cur = files[0];' +
            'if (files.length > 1) { const s = document.createElement("select"); s.setAttribute("aria-label", "Shader"); files.forEach((f, i) => s.add(new Option(f.name, i))); s.onchange = () => { cur = files[+s.value]; show(cur); }; ui.appendChild(s); }' +
            'const size = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / Math.max(1, innerHeight); camera.updateProjectionMatrix(); renderer.getDrawingBufferSize(G.gdRes.value); rt.setSize(G.gdRes.value.x, G.gdRes.value.y); }; addEventListener("resize", size); size();' +
            'show(cur);' +
            'renderer.setAnimationLoop((t) => { G.gdTime.value = t / 1000; controls.update(); draw(); });' +
            '<\/script></body></html>';
    }

    /* ---------- Keydown (.kd, .kn, .md) drawn the way OpenDB draws its entries ---------- */
    function keydownDoc(files) {
        const render = window.OpenDB && window.OpenDB.renderKd;
        const list = files.filter((f) => /\.(kd|kn|md)$/i.test(f.name));
        const css = ['/phosphor/keydown.css', '/writeout/annotate-hl.css', '/writeout/unique-styles.css', '/opendb/style.css'].map((u) => '<link rel="stylesheet" href="' + location.origin + u + '">').join('') +
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">';
        // a file's header between --- lines is left out, like OpenDB and Writeout do
        const body = (f) => { const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/.exec(f.code); return m ? m[1] : f.code; };
        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + css +
            '<style>html,body{background:#fff !important}body{margin:0;padding:18px 22px}.lp-file{font:700 11px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#0369a1;margin:18px 0 6px;border-bottom:1px solid #cfe2f3}.lp-file:first-child{margin-top:0}</style></head><body>' +
            list.map((f) => (list.length > 1 ? '<div class="lp-file">' + esc(f.name) + '</div>' : '') + '<div class="kd-doc">' + (render ? render(body(f), { type: 'article' }) : '<pre>' + esc(f.code) + '</pre>') + '</div>').join('') +
            '</body></html>';
    }

    const DOCS = { html: pageDoc, css: cssDoc, svelte: svelteDoc, python: pythonDoc, zonerider: sceneDoc, godot: godotDoc, keydown: keydownDoc };
    // (scripts and pop-up questions only: no same-origin, so the preview cannot reach OpenDB or anything saved there)
    const SANDBOX = 'allow-scripts allow-modals allow-forms allow-popups';

    // The preview panel: a tab for every kind of preview the files allow, the chosen one open
    function mount(box, files, kind, opts) {
        opts = opts || {};
        const list = kinds(files);
        if (!list.length) { box.innerHTML = ''; return null; }
        let cur = list.includes(kind) ? kind : list[0];
        const heavy = (k) => k === 'python' || k === 'svelte';
        box.innerHTML = '<div class="lp"><div class="lp-bar" role="tablist" aria-label="Preview">' + '<b class="lp-title">Preview</b>' +
            list.map((k) => '<button type="button" role="tab" class="lp-tab" data-k="' + k + '">' + KINDS[k].label + '</button>').join('') +
            '<span class="lp-sp"></span><button type="button" class="lp-btn" data-act="reload" title="Start the preview again">Restart</button><button type="button" class="lp-btn" data-act="full" title="Show the preview on the whole screen (Esc to come back)">Full screen</button></div>' +
            '<div class="lp-stage"></div></div>';
        const stage = box.querySelector('.lp-stage');
        const show = (k, start) => {
            cur = k;
            box.querySelectorAll('.lp-tab').forEach((b) => { b.setAttribute('aria-selected', String(b.dataset.k === k)); b.classList.toggle('on', b.dataset.k === k); });
            // Python and Svelte download a lot the first time, so they wait for a click (unless asked to start)
            if (heavy(k) && !start && !opts.autostart) {
                stage.innerHTML = '<div class="lp-start"><p>' + (k === 'python' ? 'A Python terminal runs ' + esc((files.find((f) => /(^|\/)main\.py$/i.test(f.name)) || files.find((f) => /\.py$/i.test(f.name))).name) + ' right here (Python in your browser, about 10 MB the first time)!' : 'The Svelte components are compiled and shown right here (Svelte ' + SVELTE + ' loads the first time)!') + '</p><button type="button" class="gel small">▶ Start the ' + KINDS[k].label + ' preview</button></div>';
                stage.querySelector('button').onclick = () => show(k, true);
                return;
            }
            const f = document.createElement('iframe');
            f.className = 'lp-frame lp-' + k;
            f.title = KINDS[k].label + ' preview';
            f.setAttribute('sandbox', SANDBOX);
            f.srcdoc = DOCS[k](files);
            stage.innerHTML = '';
            stage.appendChild(f);
        };
        box.querySelector('.lp-bar').addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            if (b.dataset.k) show(b.dataset.k);
            else if (b.dataset.act === 'reload') show(cur, true);
            // (never a new tab: a page made here would run as OpenDB itself, outside the sandbox)
            else if (b.dataset.act === 'full') { try { (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); } catch (err) {} }
        });
        show(cur);
        return { show: show, kind: () => cur };
    }

    window.LitePreview = { KINDS: KINDS, kinds: kinds, auto: auto, mount: mount };
})();
