/* =====================================================================
   Zonerider: Radii Office's 3D editor, in the browser (and as a desktop app)!
   Kind of like Blender: an outliner, a 3D viewport with a transform gizmo, a properties panel and a timeline.
     Objects   cube, UV sphere, ico sphere, cylinder, cone, torus, torus knot, plane, capsule; point, sun and
               spot lights; cameras; empties; anything imported (glTF / GLB, OBJ, STL)
     Edit Mode Tab: pick vertices (click, Shift+click, A) and move, rotate or scale them, or merge them
     Shading   Wire, Solid, Material Preview and Rendered (your lights, with shadows)
     Animate   keyframes (I) for location, rotation and scale, a timeline and playback
     Render    a still image (F12) or the animation as a video, from the scene camera
     Files     .zr scenes (autosaved in this browser too), export glTF / GLB, OBJ and STL
   Three.js r170 lives in ./vendor (MIT), so everything works offline.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { COLLECTIONS, FX_DEFAULTS, GradeShader } from './effects.js';
import { installCollab } from './collab.js';
import { parseGd, applySpatial, screenMaterial, uniformValue, gdTime, gdRes, EXAMPLES, gpuName, LIVE } from './gdshader.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DEG = Math.PI / 180;
const STORE = 'zonerider_scene_v1';
const PREFS = 'zonerider_prefs_v1';
// ?embed=1 in a frame: Writeout and Bitbook's 3D Scene block (it never touches the scene saved in this browser)
const EMBED = new URLSearchParams(location.search).has('embed') && window.parent !== window;
const LIME = 0xc5ff11, ORANGE = 0xffa63d;
const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
// The icons: small line drawings (SVG paths on a 24 x 24 grid; parts starting with "F:" are filled), the same on every system
const ICONS = {
    "move": "M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5",
    "rotate": "M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5",
    "scale": "M4 14v6h6M4 20l7-7M20 10V4h-6M20 4l-7 7",
    "magnet": "M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4",
    "wire": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9M3 12h18",
    "solid": "F:M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    "material": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|F:M12 3a9 9 0 0 1 0 18z",
    "sun": "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8",
    "object": "M4 4h16v16H4zM9 9h6v6H9z",
    "shape": "M12 3l9 9-9 9-9-9z",
    "ball": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
    "bulb": "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z",
    "globe": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3.5 15 0 18M12 3c-3 3-3.5 15 0 18",
    "camera": "M3 8h4l2-3h6l2 3h4v12H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
    "video": "M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5",
    "film": "M4 4h16v16H4zM4 9h16M4 15h16M8 4v5M16 4v5M8 15v5M16 15v5",
    "first": "M6 5v14|F:M19 5l-10 7 10 7z",
    "last": "M18 5v14|F:M5 5l10 7-10 7z",
    "play": "F:M7 4l13 8-13 8z",
    "pause": "M8 4v16M16 4v16",
    "key": "F:M12 4l8 8-8 8-8-8z",
    "unkey": "M12 4l8 8-8 8-8-8z",
    "chevRight": "M9 6l6 6-6 6",
    "chevDown": "M6 9l6 6 6-6",
    "eye": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    "eyeOff": "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
    "cube": "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
    "sphere": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12c0 2 4 3.5 9 3.5s9-1.5 9-3.5",
    "icosphere": "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3l-4 9h8zM8 12l-4 4.5M16 12l4 4.5M8 12l4 9 4-9",
    "cylinder": "M5 6c0 1.7 3.1 3 7 3s7-1.3 7-3-3.1-3-7-3-7 1.3-7 3v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6",
    "cone": "M12 3L5 18c0 1.7 3.1 3 7 3s7-1.3 7-3z",
    "torus": "M12 4a9 8 0 1 0 0 16 9 8 0 0 0 0-16zM12 9.5a3.5 2.5 0 1 0 0 5 3.5 2.5 0 0 0 0-5z",
    "torusknot": "M4.5 12c0-3 2-5 4-5 4.5 0 2.5 10 7 10 2 0 4-2 4-5s-2-5-4-5c-4.5 0-2.5 10-7 10-2 0-4-2-4-5z",
    "plane": "M3 15l9-5 9 5-9 5z",
    "capsule": "M8 7a4 4 0 0 1 8 0v10a4 4 0 0 1-8 0z",
    "spot": "M8 3h8l3 9H5zM7 16l-2 4M12 16v5M17 16l2 4",
    "empty": "M12 4v16M4 12h16M12 4l-2 2M12 4l2 2",
    "mesh": "M12 4l9 16H3z",
    "group": "M3 7h11v11H3zM10 3h11v11",
    "plus": "M12 5v14M5 12h14",
    "folder": "M3 6h6l2 2h10v11H3z",
    "save": "M5 3h11l3 3v15H5zM8 3v5h8M8 21v-7h8v7",
    "import": "M12 3v12M7 10l5 5 5-5M4 21h16",
    "export": "M12 15V3M7 8l5-5 5 5M4 21h16",
    "newtab": "M3 5h18v14H3zM3 9h18M12 12v5M9.5 14.5h5",
    "undo": "M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3",
    "redo": "M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h3",
    "duplicate": "M8 8h12v12H8zM16 8V4H4v12h4",
    "trash": "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
    "edit": "M12 3l9 9-9 9-9-9zM12 3v18M3 12h18",
    "merge": "M6 4l6 6 6-6M12 10v11",
    "smooth": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    "flat": "M12 3l8 5v8l-8 5-8-5V8z",
    "check": "M5 12l5 5 9-11",
    "origin": "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v4M12 18v4M2 12h4M18 12h4",
    "floor": "M4 21h16M12 3v13M8 12l4 4 4-4",
    "parent": "M6 20v-9a4 4 0 0 1 4-4h9M15 3l4 4-4 4",
    "unparent": "M18 20v-9a4 4 0 0 0-4-4H5M9 3L5 7l4 4",
    "gear": "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
    "keyboard": "M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
    "info": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.01",
    "home": "M3 11l9-8 9 8M5 9.5V21h14V9.5",
    "x": "M6 6l12 12M18 6L6 18",
    "people": "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6",
    "sparkle": "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"
};
function ico(name, cls) {
    const d = ICONS[name];
    if (!d) return '';
    const parts = d.split('|').map((p) => (p.startsWith('F:') ? '<path d="' + p.slice(2) + '" fill="currentColor" stroke="none"/>' : '<path d="' + p + '"/>')).join('');
    return '<svg class="zi' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + parts + '</svg>';
}
// buttons in the page ask for an icon with data-icon="name"
document.querySelectorAll('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', ico(el.dataset.icon)); });

/* ==================================================================
   RENDERER, SCENE, CAMERAS
   ================================================================== */
const canvas = $('zr-canvas'), viewEl = $('zr-view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let gdError = '';
renderer.debug.onShaderError = (gl, program, vs, fs) => {
    const log = [gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(program)].filter(Boolean).join('\n');
    gdError = log.split('\n').filter((l) => /error/i.test(l)).map((l) => l.replace(/^ERROR:\s*\d+:\d+:\s*/i, '')).slice(0, 6).join('\n') || 'The shader could not be compiled!';
};
const scene = new THREE.Scene();
const world = new THREE.Group();           // everything you make (this is what gets saved and exported)
world.name = 'Scene';
scene.add(world);
const helpers = new THREE.Group();         // grid, light and camera icons, selection boxes, vertices
scene.add(helpers);

const persp = new THREE.PerspectiveCamera(50, 1, 0.01, 5000);
persp.position.set(7.5, 5.5, 9);
const ortho = new THREE.OrthographicCamera(-5, 5, 5, -5, -5000, 5000);
let cam = persp;
const orbit = new OrbitControls(cam, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.14;
orbit.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
orbit.screenSpacePanning = true;

// the viewport's own light (Solid and Material Preview modes)
const headlight = new THREE.DirectionalLight(0xffffff, 1.7);
const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.1);
scene.add(headlight, headlight.target, hemi);

const pmrem = new THREE.PMREMGenerator(renderer);
const studioEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// the floor grid and the axis lines (X red, Z blue; Y points up)
const grid = new THREE.GridHelper(40, 40, 0x5d5d5d, 0x4b4b4b);
grid.material.transparent = true; grid.material.opacity = 0.75;
helpers.add(grid);
function axisLine(a, b, color) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
}
helpers.add(axisLine(new THREE.Vector3(-20, 0.001, 0), new THREE.Vector3(20, 0.001, 0), 0xff4d5e));
helpers.add(axisLine(new THREE.Vector3(0, 0.001, -20), new THREE.Vector3(0, 0.001, 20), 0x3f8cff));

/* ==================================================================
   STATE
   ================================================================== */
const state = {
    mode: 'object', tool: 'translate', space: 'world', snap: false, shading: 'solid', tab: 'object',
    selected: [], active: null,
    frame: 1, end: 120, fps: 24, playing: false,
    sceneCamera: null,                          // uuid of the camera used for rendering
    worldSet: { bg: '#3a3a3a', bg2: '', env: true, envStrength: 1, ambient: 0.25, fog: false, fogColor: '#3a3a3a', fogDensity: 0.02 },
    fxSet: Object.assign({}, FX_DEFAULTS),           // screen effects (Rendered view and renders)
    screenShader: null,                                // a Godot canvas_item shader on the whole picture: { src, values }
    fxCollection: 'aero', fxApplyMat: true, fxApplyScene: true,
    renderSet: { w: 1920, h: 1080, shadows: true, transparent: false },
    edit: null                                  // Edit Mode: { mesh, points, picked:Set }
};
const dirty = { outliner: true, props: true };
let lastDrag = 0;

/* ==================================================================
   PRIMITIVES
   ================================================================== */
const PRIMS = {
    cube: { label: 'Cube', icon: 'cube', params: { width: 2, height: 2, depth: 2, widthSegments: 1, heightSegments: 1, depthSegments: 1 },
        make: (p) => new THREE.BoxGeometry(p.width, p.height, p.depth, p.widthSegments, p.heightSegments, p.depthSegments) },
    sphere: { label: 'UV Sphere', icon: 'sphere', params: { radius: 1, widthSegments: 32, heightSegments: 16 },
        make: (p) => new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments) },
    icosphere: { label: 'Ico Sphere', icon: 'icosphere', params: { radius: 1, detail: 2 },
        make: (p) => new THREE.IcosahedronGeometry(p.radius, p.detail) },
    cylinder: { label: 'Cylinder', icon: 'cylinder', params: { radiusTop: 1, radiusBottom: 1, height: 2, radialSegments: 32, heightSegments: 1 },
        make: (p) => new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.heightSegments) },
    cone: { label: 'Cone', icon: 'cone', params: { radius: 1, height: 2, radialSegments: 32 },
        make: (p) => new THREE.ConeGeometry(p.radius, p.height, p.radialSegments) },
    torus: { label: 'Torus', icon: 'torus', params: { radius: 1, tube: 0.3, radialSegments: 16, tubularSegments: 48 },
        make: (p) => new THREE.TorusGeometry(p.radius, p.tube, p.radialSegments, p.tubularSegments) },
    torusknot: { label: 'Torus Knot', icon: 'torusknot', params: { radius: 1, tube: 0.3, tubularSegments: 128, radialSegments: 16, p: 2, q: 3 },
        make: (p) => new THREE.TorusKnotGeometry(p.radius, p.tube, p.tubularSegments, p.radialSegments, p.p, p.q) },
    plane: { label: 'Plane', icon: 'plane', params: { width: 2, depth: 2, widthSegments: 1, depthSegments: 1 },
        make: (p) => new THREE.PlaneGeometry(p.width, p.depth, p.widthSegments, p.depthSegments).rotateX(-Math.PI / 2) },
    capsule: { label: 'Capsule', icon: 'capsule', params: { radius: 0.6, length: 1.2, capSegments: 8, radialSegments: 24 },
        make: (p) => new THREE.CapsuleGeometry(p.radius, p.length, p.capSegments, p.radialSegments) }
};
function cleanParam(k, v) {
    v = Number(v);
    if (!isFinite(v)) return null;
    if (/Segments$/.test(k)) return Math.max(1, Math.min(256, Math.round(v)));
    if (k === 'detail') return Math.max(0, Math.min(6, Math.round(v)));
    if (k === 'p' || k === 'q') return Math.max(1, Math.min(20, Math.round(v)));
    return Math.max(0.001, Math.min(1000, v));
}
// geometry from the parameters (a plain BufferGeometry, so a saved file never depends on three.js's own types)
function primGeometry(type, params) {
    const g = PRIMS[type].make(params);
    const plain = new THREE.BufferGeometry();
    for (const k of Object.keys(g.attributes)) plain.setAttribute(k, g.attributes[k]);
    if (g.index) plain.setIndex(g.index);
    plain.computeBoundingSphere();
    g.dispose();
    return plain;
}
function newMaterial(color) {
    return new THREE.MeshPhysicalMaterial({ color: color || 0xcccccc, metalness: 0, roughness: 0.5, clearcoat: 0, clearcoatRoughness: 0.1 });
}
function uniqueName(base) {
    const names = new Set();
    world.traverse((o) => names.add(o.name));
    if (!names.has(base)) return base;
    for (let i = 1; ; i++) { const n = base + '.' + String(i).padStart(3, '0'); if (!names.has(n)) return n; }
}
function at3D() {
    // new things appear at the orbit target, on the floor grid if it's close to it (like Blender's 3D cursor)
    const t = orbit.target.clone();
    if (state.snap) t.set(Math.round(t.x * 4) / 4, Math.round(t.y * 4) / 4, Math.round(t.z * 4) / 4);
    return t;
}
function addPrim(type, opts = {}) {
    const p = Object.assign({}, PRIMS[type].params, opts.params || {});
    const mesh = new THREE.Mesh(primGeometry(type, p), newMaterial(opts.color));
    mesh.name = uniqueName(PRIMS[type].label.replace(/\s/g, ''));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.zr = { kind: 'mesh', prim: type, params: p };
    mesh.position.copy(opts.at || at3D());
    if (type !== 'plane' && !opts.at) mesh.position.y = Math.max(mesh.position.y, 0);
    return addObject(mesh);
}
function addLight(type) {
    let l;
    if (type === 'point') { l = new THREE.PointLight(0xffffff, 60, 0, 2); l.name = 'Light'; }
    else if (type === 'sun') { l = new THREE.DirectionalLight(0xffffff, 3); l.name = 'Sun'; }
    else { l = new THREE.SpotLight(0xffffff, 120, 0, 30 * DEG, 0.25, 2); l.name = 'Spot'; }
    l.name = uniqueName(l.name);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.bias = -0.0005;
    if (l.isDirectionalLight) { l.shadow.camera.left = l.shadow.camera.bottom = -12; l.shadow.camera.right = l.shadow.camera.top = 12; }
    l.userData.zr = { kind: 'light', light: type };
    l.userData.zrIntensity = l.intensity;
    l.position.set(4, 6, 3).add(type === 'sun' ? new THREE.Vector3() : at3D().setY(0));
    attachTarget(l);
    l.lookAt(type === 'sun' ? new THREE.Vector3() : at3D());
    return addObject(l);
}
// a sun or spot shines along its own -Z axis: its target rides along as a hidden child
function attachTarget(l) {
    if (!(l.isDirectionalLight || l.isSpotLight)) return;
    let t = l.children.find((c) => c.name === '__target');
    if (!t) { t = new THREE.Object3D(); t.name = '__target'; t.position.set(0, 0, -1); l.add(t); }
    l.target = t;
}
function addCamera() {
    const c = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 1000);
    c.name = uniqueName('Camera');
    c.userData.zr = { kind: 'camera' };
    c.position.set(9, 6, 9);
    c.lookAt(0, 0.8, 0);
    addObject(c);
    if (!state.sceneCamera) state.sceneCamera = c.uuid;
    return c;
}
function addEmpty() {
    const e = new THREE.Object3D();
    e.name = uniqueName('Empty');
    e.userData.zr = { kind: 'empty' };
    e.position.copy(at3D());
    return addObject(e);
}
function addObject(o, parent) {
    commit();
    (parent || world).add(o);
    select([o]);
    changed();
    return o;
}

/* ==================================================================
   HELPERS (icons for lights, cameras and empties; selection boxes)
   ================================================================== */
const helperOf = new Map();   // uuid -> { group, proxy, obj, helper }
const pickProxies = [];
function lineIcon(points, color) {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true }));
}
function iconFor(o) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const pts = [];
    const circle = (r, z = 0, n = 20) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; pts.push(V(Math.cos(a) * r, Math.sin(a) * r, z), V(Math.cos(b) * r, Math.sin(b) * r, z)); } };
    const kind = o.userData.zr ? o.userData.zr.kind : '';
    if (o.isPointLight) { circle(0.22); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pts.push(V(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0), V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0)); } }
    else if (o.isDirectionalLight) { circle(0.25); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pts.push(V(Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0), V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0)); } pts.push(V(0, 0, 0), V(0, 0, -3)); }
    else if (o.isSpotLight) { circle(0.18); const r = Math.tan(o.angle) * 1.6; circle(r, -1.6, 28); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([x, y]) => pts.push(V(0, 0, 0), V(x * r, y * r, -1.6))); }
    else if (o.isCamera) { const w = 0.6, h = 0.34, d = -0.9; const c = [V(-w, -h, d), V(w, -h, d), V(w, h, d), V(-w, h, d)]; c.forEach((p, i) => { pts.push(V(0, 0, 0), p, p, c[(i + 1) % 4]); }); pts.push(V(-0.2, h + 0.05, d), V(0, h + 0.3, d), V(0, h + 0.3, d), V(0.2, h + 0.05, d), V(0.2, h + 0.05, d), V(-0.2, h + 0.05, d)); }
    else if (kind === 'empty' || (!o.isMesh && !o.isLight && !o.isCamera)) { pts.push(V(-0.6, 0, 0), V(0.6, 0, 0), V(0, -0.6, 0), V(0, 0.6, 0), V(0, 0, -0.6), V(0, 0, 0.6)); }
    else return null;
    return lineIcon(pts, o.isLight ? 0xffe066 : o.isCamera ? 0xdedede : 0xbbbbbb);
}
function syncHelpers() {
    const alive = new Set();
    world.traverse((o) => {
        if (o === world || o.name === '__target' || o.isMesh) return;
        if (o.isLight || o.isCamera || (o.userData.zr && o.userData.zr.kind === 'empty') || (o.children.length === 0 && !o.isMesh)) {
            alive.add(o.uuid);
            let h = helperOf.get(o.uuid);
            if (h && h.obj !== o) { helpers.remove(h.group); helperOf.delete(o.uuid); h = null; }
            if (!h) {
                const group = new THREE.Group();
                group.matrixAutoUpdate = false;
                const icon = iconFor(o);
                if (icon) group.add(icon);
                const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
                proxy.userData.ref = o;
                group.add(proxy);
                helpers.add(group);
                h = { group, proxy, obj: o, icon };
                helperOf.set(o.uuid, h);
            }
        }
    });
    for (const [id, h] of helperOf) if (!alive.has(id)) { helpers.remove(h.group); helperOf.delete(id); }
    pickProxies.length = 0;
    for (const h of helperOf.values()) pickProxies.push(h.proxy);
}
const boxes = [];
function syncBoxes() {
    boxes.forEach((b) => helpers.remove(b));
    boxes.length = 0;
    state.selected.forEach((o) => {
        if (!o.isMesh && !o.children.some((c) => c.isMesh)) return;
        const b = new THREE.BoxHelper(o, o === state.active ? LIME : ORANGE);
        b.material.depthTest = false; b.material.transparent = true; b.material.opacity = 0.9;
        b.userData.of = o;
        helpers.add(b); boxes.push(b);
    });
}
function tintIcons() {
    for (const h of helperOf.values()) {
        if (!h.icon) continue;
        const sel = state.selected.includes(h.obj);
        h.icon.material.color.set(h.obj === state.active ? LIME : sel ? ORANGE : (h.obj.isLight ? 0xffe066 : h.obj.isCamera ? 0xdedede : 0xbbbbbb));
    }
}

/* ==================================================================
   SELECTION + GIZMO
   ================================================================== */
const gizmo = new TransformControls(cam, canvas);
gizmo.setSize(0.9);
const gizmoHelper = gizmo.getHelper ? gizmo.getHelper() : gizmo;
scene.add(gizmoHelper);
gizmo.addEventListener('dragging-changed', (e) => {
    orbit.enabled = !e.value;
    if (e.value) { commit(); if (state.mode === 'edit') editDragStart(); }
    else { lastDrag = performance.now(); if (state.mode === 'edit') editDragEnd(); changed(); }
});
gizmo.addEventListener('objectChange', () => { if (state.mode === 'edit') editDragMove(); else tellRoom(true); dirty.propValues = true; });
function applySnap() {
    gizmo.setTranslationSnap(state.snap ? 0.25 : null);
    gizmo.setRotationSnap(state.snap ? 15 * DEG : null);
    gizmo.setScaleSnap(state.snap ? 0.1 : null);
}
function select(list, active) {
    state.selected = list.filter(Boolean);
    state.active = active || state.selected[state.selected.length - 1] || null;
    if (state.mode === 'object') {
        if (state.active && !state.active.userData.zrLocked) gizmo.attach(state.active); else gizmo.detach();
    }
    syncBoxes(); tintIcons();
    dirty.outliner = dirty.props = true;
    status();
    drawKeys();
    try { if (window.RadiiCollab && collab) RadiiCollab.cursorMoved(); } catch (e) {}
}
function setTool(t) {
    state.tool = t;
    gizmo.setMode(t);
    document.querySelectorAll('#zr-tools [data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
}
function setSpace(s) {
    state.space = s;
    gizmo.setSpace(s);
    document.querySelectorAll('#zr-space [data-space]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.space === s)));
}

// clicking: a short click picks (Shift adds or removes), a drag orbits the view
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, b: e.button }; canvas.focus(); });
canvas.addEventListener('pointerup', (e) => {
    if (!downAt || e.button !== 0 || downAt.b !== 0) { downAt = null; return; }
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 5 || gizmo.dragging || performance.now() - lastDrag < 150) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    if (state.mode === 'edit') { editPick(e.shiftKey); return; }
    const meshes = [];
    world.traverseVisible((o) => { if (o.isMesh) meshes.push(o); });
    const hits = ray.intersectObjects(meshes.concat(pickProxies.filter((p) => p.userData.ref.visible)), false);
    const hit = hits[0] ? (hits[0].object.userData.ref || hits[0].object) : null;
    if (!hit) { if (!e.shiftKey) select([]); return; }
    if (e.shiftKey) {
        if (state.selected.includes(hit) && state.active === hit) select(state.selected.filter((o) => o !== hit));
        else select(state.selected.filter((o) => o !== hit).concat(hit), hit);
    } else select([hit]);
});
canvas.addEventListener('dblclick', () => { if (state.mode === 'object' && state.active && state.active.isMesh) setMode('edit'); });

/* ==================================================================
   EDIT MODE: vertices
   ================================================================== */
const pivot = new THREE.Object3D();
scene.add(pivot);
function weldedGeometry(g) {
    const pos = new THREE.BufferGeometry();
    pos.setAttribute('position', g.attributes.position.clone());
    if (g.index) pos.setIndex(g.index.clone());
    const merged = mergeVertices(pos, 1e-5);
    const plain = new THREE.BufferGeometry();
    plain.setAttribute('position', merged.attributes.position);
    if (merged.index) plain.setIndex(merged.index);
    plain.computeVertexNormals();
    plain.computeBoundingSphere();
    return plain;
}
function setMode(m) {
    if (m === state.mode) return;
    if (m === 'edit') {
        const mesh = state.active;
        if (!mesh || !mesh.isMesh) { toast('Pick a mesh first, then press Tab!'); return; }
        commit();
        // a shape becomes freely editable vertices (its shape settings no longer apply)
        if (!mesh.userData.zr || mesh.userData.zr.prim !== 'custom' || !mesh.userData.zr.welded) {
            const old = mesh.geometry;
            mesh.geometry = weldedGeometry(old);
            old.dispose();
            mesh.userData.zr = Object.assign({}, mesh.userData.zr || { kind: 'mesh' }, { prim: 'custom', welded: true });
        }
        const pm = new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, color: 0x111111, depthTest: true });
        const points = new THREE.Points(mesh.geometry, pm);
        points.matrixAutoUpdate = false;
        points.renderOrder = 5;
        const picked = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, color: LIME, depthTest: false }));
        picked.matrixAutoUpdate = false;
        picked.renderOrder = 6;
        helpers.add(points, picked);
        state.edit = { mesh, points, pickedPts: picked, picked: new Set(), wire: null };
        const wire = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.45 }));
        wire.matrixAutoUpdate = false;
        helpers.add(wire);
        state.edit.wire = wire;
        gizmo.detach();
        state.mode = 'edit';
        hint('Edit Mode: click vertices (Shift adds), Ctrl+A selects all, then drag the gizmo. M merges them. Tab goes back!');
    } else {
        const ed = state.edit;
        if (ed) {
            helpers.remove(ed.points, ed.pickedPts, ed.wire);
            ed.pickedPts.geometry.dispose(); ed.wire.geometry.dispose();
            ed.mesh.geometry.computeVertexNormals();
            ed.mesh.geometry.computeBoundingSphere();
            ed.mesh.geometry.computeBoundingBox();
        }
        state.edit = null;
        state.mode = 'object';
        hint('');
        select(state.selected, state.active);
        changed();
    }
    document.querySelectorAll('#zr-mode [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    dirty.props = true;
    status();
}
function editPick(add) {
    const ed = state.edit;
    const r = canvas.clientHeight || 600;
    ray.params.Points.threshold = Math.max(0.02, cam.isOrthographicCamera ? (cam.top - cam.bottom) / r * 8 : cam.position.distanceTo(orbit.target) / r * 9);
    ed.points.updateMatrixWorld(true);
    const hits = ray.intersectObject(ed.points, false);
    if (!hits.length) { if (!add) ed.picked.clear(); }
    else {
        // the hit closest to the ray (not just the nearest one along it)
        hits.sort((a, b) => a.distanceToRay - b.distanceToRay);
        const i = hits[0].index;
        if (add) { if (ed.picked.has(i)) ed.picked.delete(i); else ed.picked.add(i); }
        else { ed.picked.clear(); ed.picked.add(i); }
    }
    editRefresh();
}
function editSelectAll(on) {
    const ed = state.edit;
    if (!ed) return;
    ed.picked.clear();
    if (on) for (let i = 0; i < ed.mesh.geometry.attributes.position.count; i++) ed.picked.add(i);
    editRefresh();
}
function editRefresh() {
    const ed = state.edit;
    const pos = ed.mesh.geometry.attributes.position;
    const arr = new Float32Array(ed.picked.size * 3);
    let k = 0;
    const c = new THREE.Vector3(), v = new THREE.Vector3();
    for (const i of ed.picked) { v.fromBufferAttribute(pos, i); arr.set([v.x, v.y, v.z], k * 3); c.add(v); k++; }
    ed.pickedPts.geometry.dispose();
    ed.pickedPts.geometry = new THREE.BufferGeometry();
    ed.pickedPts.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    if (ed.picked.size) {
        c.multiplyScalar(1 / ed.picked.size).applyMatrix4(ed.mesh.matrixWorld);
        pivot.position.copy(c); pivot.quaternion.copy(state.space === 'local' ? ed.mesh.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()); pivot.scale.set(1, 1, 1);
        pivot.updateMatrixWorld(true);
        gizmo.attach(pivot);
    } else gizmo.detach();
    status();
}
let editStart = null;
function editDragStart() {
    const ed = state.edit;
    const pos = ed.mesh.geometry.attributes.position;
    const world0 = new Map();
    for (const i of ed.picked) world0.set(i, new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(ed.mesh.matrixWorld));
    pivot.updateMatrixWorld(true);
    editStart = { world0, inv: pivot.matrixWorld.clone().invert() };
}
function editDragMove() {
    if (!editStart) return;
    const ed = state.edit;
    pivot.updateMatrixWorld(true);
    const m = new THREE.Matrix4().multiplyMatrices(pivot.matrixWorld, editStart.inv);
    const toLocal = ed.mesh.matrixWorld.clone().invert();
    const pos = ed.mesh.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (const [i, w0] of editStart.world0) { v.copy(w0).applyMatrix4(m).applyMatrix4(toLocal); pos.setXYZ(i, v.x, v.y, v.z); }
    pos.needsUpdate = true;
    ed.mesh.geometry.computeVertexNormals();
    ed.mesh.geometry.computeBoundingSphere();
    ed.wire.geometry.dispose();
    ed.wire.geometry = new THREE.WireframeGeometry(ed.mesh.geometry);
    const arr = ed.pickedPts.geometry.attributes.position;
    let k = 0;
    for (const i of ed.picked) { arr.setXYZ(k++, pos.getX(i), pos.getY(i), pos.getZ(i)); }
    arr.needsUpdate = true;
}
function editDragEnd() {
    editStart = null;
    // (a new geometry version, so the room sends the moved vertices)
    const z = state.edit && state.edit.mesh.userData.zr; if (z) z.gv = (z.gv || 0) + 1;
    editRefresh();
}
function editMerge() {
    const ed = state.edit;
    if (!ed || ed.picked.size < 2) { toast('Pick two or more vertices to merge!'); return; }
    commit();
    const pos = ed.mesh.geometry.attributes.position;
    const c = new THREE.Vector3(), v = new THREE.Vector3();
    for (const i of ed.picked) c.add(v.fromBufferAttribute(pos, i));
    c.multiplyScalar(1 / ed.picked.size);
    for (const i of ed.picked) pos.setXYZ(i, c.x, c.y, c.z);
    const mesh = ed.mesh;
    setMode('object');
    const g = weldedGeometry(mesh.geometry);
    mesh.geometry.dispose();
    mesh.geometry = g;
    select([mesh]);
    setMode('edit');
    toast('Merged into one vertex!');
}

/* ==================================================================
   SHADING (Z)
   ================================================================== */
const wireMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, wireframe: true });
const solidMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.75, metalness: 0 });
function setShading(s) {
    state.shading = s;
    document.querySelectorAll('#zr-shading [data-shade]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shade === s)));
    applyWorld();
    savePrefs();
}
function applyWorld(forRender) {
    const W = state.worldSet;
    const s = forRender ? 'rendered' : state.shading;
    scene.overrideMaterial = s === 'wire' ? wireMat : s === 'solid' ? solidMat : null;
    const own = s === 'rendered';
    headlight.visible = hemi.visible = !own;
    hemi.intensity = s === 'material' ? 0.35 : 1.1;
    headlight.intensity = s === 'material' ? 0.6 : 1.7;
    scene.environment = s === 'material' ? studioEnv : (own && W.env ? studioEnv : null);
    scene.environmentIntensity = own ? W.envStrength : 1;
    scene.background = own && W.bg2 ? skyTexture(W.bg, W.bg2) : new THREE.Color(own ? W.bg : (s === 'wire' ? '#2e2e2e' : '#3a3a3a'));
    renderer.toneMappingExposure = own ? (state.fxSet.exposure || 1) : 1;
    scene.fog = own && W.fog ? new THREE.FogExp2(W.fogColor, W.fogDensity) : null;
    renderer.shadowMap.enabled = own && state.renderSet.shadows;
    ambient.intensity = own ? W.ambient : 0;
    renderer.toneMapping = s === 'wire' || s === 'solid' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    // the lights you place only light the Rendered view (Solid and Material use the studio light)
    world.traverse((o) => { if (o.isLight) o.intensity = o.userData.zrIntensity != null ? (own || s === 'material' ? o.userData.zrIntensity : 0) : o.intensity; });
}
const ambient = new THREE.AmbientLight(0xffffff, 0);

/* ---------- screen effects: glow (bloom), then tone mapping, then color grading and vignette ---------- */
function makeComposer(r) {
    const c = new EffectComposer(r);
    const rp = new RenderPass(scene, persp);
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.4, 0.8);
    const grade = new ShaderPass(GradeShader);
    grade.uniforms.tint.value = new THREE.Color('#ffffff');
    c.addPass(rp); c.addPass(bloom); c.addPass(new OutputPass()); c.addPass(grade);
    return { c, rp, bloom, grade };
}
function fxActive() { const F = state.fxSet; return !!(state.screenShader || F.bloom || F.saturation !== 1 || F.contrast !== 1 || F.tintAmount > 0 || F.vignette > 0); }
function syncFx(k, camera) {
    const F = state.fxSet;
    k.rp.camera = camera;
    k.bloom.enabled = !!F.bloom;
    // (the presets' numbers are friendly ones: half strength and a tight radius keep the glow around bright things, not the whole screen)
    k.bloom.strength = F.bloomStrength * 0.5; k.bloom.threshold = Math.max(0.5, F.bloomThreshold); k.bloom.radius = 0.12;
    k.grade.uniforms.saturation.value = F.saturation; k.grade.uniforms.contrast.value = F.contrast;
    k.grade.uniforms.tint.value.set(F.tint || '#ffffff'); k.grade.uniforms.tintAmount.value = F.tintAmount; k.grade.uniforms.vignette.value = F.vignette;
    // the Godot screen shader: rebuilt when its code changes, its values follow the panel
    const S = state.screenShader, key = S ? S.src : '';
    if (k.gdKey !== key) {
        if (k.gd) { k.c.removePass(k.gd); k.gd.material.dispose(); k.gd = null; }
        if (S) { try { k.gd = new ShaderPass(screenMaterial(parseGd(S.src), S.values)); k.c.insertPass(k.gd, 3); } catch (e) { k.gd = null; } }
        k.gdKey = key;
    }
    if (k.gd && S) { try { const p = parseGd(S.src), live = LIVE.get(k.gd.material); p.uniforms.forEach((u) => { if (!u.screen && live[gpuName(u)] && S.values && u.name in S.values) live[gpuName(u)].value = uniformValue(u, S.values[u.name]); }); } catch (e) {} }
}
const viewFx = makeComposer(renderer);
// a two-color sky (top to bottom), drawn once per pair of colors
const skyCache = new Map();
function skyTexture(top, bottom) {
    const key = top + bottom;
    if (skyCache.has(key)) return skyCache.get(key);
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
    const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    if (skyCache.size > 40) skyCache.clear();
    skyCache.set(key, t);
    return t;
}
scene.add(ambient);
function lightPower(l, v) {
    if (v === undefined) return l.userData.zrIntensity != null ? l.userData.zrIntensity : l.intensity;
    l.userData.zrIntensity = v;
    l.intensity = state.shading === 'rendered' || state.shading === 'material' ? v : 0;
}
function rememberLights() {
    world.traverse((o) => { if (o.isLight && o.userData.zrIntensity == null) o.userData.zrIntensity = o.intensity; });
}

/* ==================================================================
   VIEWS
   ================================================================== */
function setCamera(c) {
    if (c === cam) return;
    const t = orbit.target.clone();
    if (c.isOrthographicCamera) {
        const d = cam.position.distanceTo(t);
        const h = d * Math.tan(persp.fov * DEG / 2);
        c.userData.h = h;
    }
    c.position.copy(cam.position);
    c.quaternion.copy(cam.quaternion);
    cam = c;
    orbit.object = c;
    gizmo.camera = c;
    resize();
    orbit.update();
}
function viewFrom(dir) {
    const t = orbit.target.clone();
    const d = Math.max(2, cam.position.distanceTo(t));
    cam.position.copy(t).add(dir.clone().normalize().multiplyScalar(d));
    cam.lookAt(t);
    orbit.update();
    info();
}
const VIEWS = {
    front: [new THREE.Vector3(0, 0, 1)], back: [new THREE.Vector3(0, 0, -1)], right: [new THREE.Vector3(1, 0, 0)], left: [new THREE.Vector3(-1, 0, 0)],
    top: [new THREE.Vector3(0, 1, 0.0001)], bottom: [new THREE.Vector3(0, -1, 0.0001)]
};
let viewName = 'User';
function view(name) {
    viewName = name[0].toUpperCase() + name.slice(1);
    if (name !== 'user' && cam === persp) setCamera(ortho);
    viewFrom(VIEWS[name][0]);
}
function toggleOrtho() { setCamera(cam === persp ? ortho : persp); viewName = 'User'; info(); }
function frameObjects(list) {
    const box = new THREE.Box3();
    (list.length ? list : world.children).forEach((o) => { box.expandByObject(o); o.updateMatrixWorld(true); o.traverse((x) => { if (!x.isMesh && x.name !== '__target') box.expandByPoint(x.getWorldPosition(new THREE.Vector3())); }); });
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.5, box.getSize(new THREE.Vector3()).length() / 2);
    const dir = cam.position.clone().sub(orbit.target).normalize();
    orbit.target.copy(c);
    cam.position.copy(c).add(dir.multiplyScalar(r / Math.sin(persp.fov * DEG / 2) * 1.05));
    if (cam.isOrthographicCamera) cam.userData.h = r * 1.15;
    resize();
    orbit.update();
}
function lookThroughSceneCamera() {
    const c = sceneCameraObj();
    if (!c) { toast('Add a camera first (Add, Camera)!'); return; }
    if (cam !== persp) setCamera(persp);
    c.updateMatrixWorld(true);
    persp.position.setFromMatrixPosition(c.matrixWorld);
    persp.quaternion.setFromRotationMatrix(c.matrixWorld);
    persp.fov = c.fov;
    persp.updateProjectionMatrix();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(persp.quaternion);
    orbit.target.copy(persp.position).add(fwd.multiplyScalar(5));
    viewName = 'Camera';
    info();
}
function sceneCameraObj() {
    let c = null;
    world.traverse((o) => { if (o.isCamera && (!c || o.uuid === state.sceneCamera)) c = o; });
    return c;
}
function info() { $('zr-view-info').textContent = (viewName === 'User' ? 'User ' : viewName + ' ') + (cam.isOrthographicCamera ? 'Orthographic' : 'Perspective') + (state.mode === 'edit' ? '  ·  Edit Mode' : ''); }
orbit.addEventListener('start', () => { if (viewName !== 'User') { viewName = 'User'; info(); } persp.fov = persp.fov === 50 ? 50 : persp.fov; });

/* the little axis gizmo in the corner */
const gz = $('zr-gizmo'), gctx = gz.getContext('2d');
function drawGizmo() {
    const w = gz.width, h = gz.height, c = w / 2, r = w * 0.36;
    gctx.clearRect(0, 0, w, h);
    const q = cam.quaternion.clone().invert();
    const axes = [['X', new THREE.Vector3(1, 0, 0), '#ff4d5e'], ['Y', new THREE.Vector3(0, 1, 0), '#8bdc1a'], ['Z', new THREE.Vector3(0, 0, 1), '#3f8cff']]
        .flatMap(([n, v, col]) => [[n, v.clone().applyQuaternion(q), col, true], ['-' + n, v.clone().negate().applyQuaternion(q), col, false]])
        .sort((a, b) => a[1].z - b[1].z);
    gz._axes = [];
    axes.forEach(([n, v, col, pos]) => {
        const x = c + v.x * r, y = c - v.y * r;
        if (pos) { gctx.strokeStyle = col; gctx.lineWidth = 3; gctx.beginPath(); gctx.moveTo(c, c); gctx.lineTo(x, y); gctx.stroke(); }
        gctx.fillStyle = pos ? col : 'rgba(0,0,0,.35)';
        gctx.strokeStyle = col; gctx.lineWidth = 2;
        gctx.beginPath(); gctx.arc(x, y, pos ? 11 : 8, 0, Math.PI * 2); gctx.fill(); gctx.stroke();
        if (pos) { gctx.fillStyle = '#111'; gctx.font = 'bold 12px system-ui'; gctx.textAlign = 'center'; gctx.textBaseline = 'middle'; gctx.fillText(n, x, y + 0.5); }
        gz._axes.push({ n, x, y });
    });
}
gz.addEventListener('click', (e) => {
    const r = gz.getBoundingClientRect(), sx = gz.width / r.width;
    const x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sx;
    let best = null, bd = 18;
    (gz._axes || []).forEach((a) => { const d = Math.hypot(a.x - x, a.y - y); if (d < bd) { bd = d; best = a; } });
    if (!best) return;
    ({ X: () => view('right'), '-X': () => view('left'), Y: () => view('top'), '-Y': () => view('bottom'), Z: () => view('front'), '-Z': () => view('back') })[best.n]();
});

/* ==================================================================
   UNDO / REDO, SAVE / LOAD
   ================================================================== */
const undoStack = [], redoStack = [];
function snapshot() { return JSON.stringify(serialize()); }
function commit() {
    try {
        undoStack.push(snapshot());
        if (undoStack.length > 60) undoStack.shift();
        redoStack.length = 0;
    } catch (e) {}
}
function undo() {
    if (state.mode === 'edit') setMode('object');
    if (!undoStack.length) { toast('Nothing to undo!'); return; }
    redoStack.push(snapshot());
    restore(JSON.parse(undoStack.pop()), true);
}
function redo() {
    if (state.mode === 'edit') setMode('object');
    if (!redoStack.length) { toast('Nothing to redo!'); return; }
    undoStack.push(snapshot());
    restore(JSON.parse(redoStack.pop()), true);
}
function serialize() {
    rememberLights();
    // lights save at full power whatever the viewport shows
    const saved = [];
    world.traverse((o) => { if (o.isLight && o.userData.zrIntensity != null) { saved.push([o, o.intensity]); o.intensity = o.userData.zrIntensity; } });
    // built-in shapes are rebuilt from their settings when a scene opens, so their vertices stay out of the file
    const swaps = [];
    world.traverse((o) => { const z = o.userData.zr; if (o.isMesh && z && z.prim && PRIMS[z.prim]) { swaps.push([o, o.geometry]); o.geometry = EMPTY_GEOMETRY; } });
    let json;
    try { json = world.toJSON(); } finally { swaps.forEach(([o, g]) => { o.geometry = g; }); }
    saved.forEach(([o, i]) => { o.intensity = i; });
    return {
        format: 'zonerider', version: 1, scene: json,
        settings: { world: state.worldSet, render: state.renderSet, fx: state.fxSet, screenShader: state.screenShader, comments: state.comments || [], frame: state.frame, end: state.end, fps: state.fps, sceneCamera: state.sceneCamera },
        selected: state.selected.map((o) => o.uuid), active: state.active ? state.active.uuid : null
    };
}
const objLoader = new THREE.ObjectLoader();
const EMPTY_GEOMETRY = new THREE.BufferGeometry();
function restore(data, keepView) {
    if (!data || data.format !== 'zonerider' || !data.scene) throw new Error('This is not a Zonerider scene!');
    const loaded = objLoader.parse(data.scene);
    if (state.mode === 'edit') setMode('object');
    gizmo.detach();
    while (world.children.length) world.remove(world.children[0]);
    loaded.children.slice().forEach((c) => world.add(c));
    world.traverse((o) => {
        const z = o.userData.zr;
        if (o.isLight) { attachTarget(o); if (o.userData.zrIntensity != null) o.intensity = o.userData.zrIntensity; if (o.shadow) o.shadow.mapSize.set(2048, 2048); }
        if (o.isMesh && z && z.prim && PRIMS[z.prim]) { o.geometry.dispose(); o.geometry = primGeometry(z.prim, Object.assign({}, PRIMS[z.prim].params, z.params || {})); }
    });
    hydrateAll();
    const s = data.settings || {};
    Object.assign(state.worldSet, s.world || {});
    Object.assign(state.renderSet, s.render || {});
    state.fxSet = Object.assign({}, FX_DEFAULTS, s.fx || {});
    state.comments = s.comments || [];
    state.screenShader = s.screenShader || null;
    if (!s.world || s.world.bg2 === undefined) state.worldSet.bg2 = '';
    state.end = s.end || state.end; state.fps = s.fps || state.fps; state.sceneCamera = s.sceneCamera || null;
    setFrameRange();
    const byId = new Map(); world.traverse((o) => byId.set(o.uuid, o));
    syncHelpers();
    select((data.selected || []).map((u) => byId.get(u)).filter(Boolean), byId.get(data.active));
    applyWorld();
    goFrame(s.frame || state.frame, true);
    changed(true);
    if (!keepView) frameObjects([]);
}
let saveTimer = 0;
function changed(quiet) {
    syncHelpers();
    syncBoxes(); tintIcons();
    dirty.outliner = dirty.props = true;
    status(); drawKeys();
    rememberLights(); applyWorld();
    tellRoom();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autosave, 600);
}
// live collaboration: every local change goes to the room (Radii Collab compares and sends only what changed)
let collab = null, roomT = 0;
function tellRoom(soon) {
    const RC = window.RadiiCollab;
    if (!collab || !RC || !RC.isLive || !RC.isLive() || RC.isApplying()) return;
    if (soon) { const now = performance.now(); if (now - roomT < 90) return; roomT = now; }
    RC.changed();
}
// after someone else's change: redraw everything that depends on the scene (but no undo step, and no echo)
function afterRemote() {
    syncHelpers();
    const inWorld = (o) => { for (let p = o; p; p = p.parent) if (p === world) return true; return false; };
    const keep = state.selected.filter(inWorld);
    select(keep, keep.includes(state.active) ? state.active : keep[keep.length - 1]);
    rememberLights(); applyWorld(); setFrameRange();
    dirty.outliner = dirty.props = true;
    status(); drawKeys();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autosave, 600);
}
function autosave() {
    if (EMBED) return;
    try { localStorage.setItem(STORE, snapshot()); }
    catch (e) { toast('This scene is too big to keep in the browser: use File, Save to keep it!'); }
}
function savePrefs() { try { localStorage.setItem(PREFS, JSON.stringify({ fxCollection: state.fxCollection, fxApplyMat: state.fxApplyMat, fxApplyScene: state.fxApplyScene, shading: state.shading, snap: state.snap, tool: state.tool, space: state.space, left: !$('zr-app').classList.contains('zr-no-left'), right: !$('zr-app').classList.contains('zr-no-right') })); } catch (e) {} }
function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function saveFile() { download('scene.zr', JSON.stringify(serialize()), 'application/json'); toast('Saved scene.zr!'); }
function newScene(ask = true) {
    const go = () => {
        if (window.RadiiDocs) RadiiDocs.archive();
        commit();
        if (state.mode === 'edit') setMode('object');
        while (world.children.length) world.remove(world.children[0]);
        state.sceneCamera = null;
        addPrim('cube', { at: new THREE.Vector3(0, 1, 0) });
        const l = addLight('point'); l.position.set(4, 5, 2);
        addCamera();
        select([world.children[0]]);
        goFrame(1, true);
        orbit.target.set(0, 0.8, 0);
        persp.position.set(7.5, 5.5, 9);
        orbit.update();
        changed();
    };
    if (!ask) { go(); return; }
    confirmDlg('New scene', 'Start a new scene? The one you have now is kept in File > Documents (and you can still Undo)!', 'New Scene').then((ok) => { if (ok) go(); });
}

/* ==================================================================
   IMPORT / EXPORT
   ================================================================== */
function readFile(file) {
    const name = file.name.toLowerCase();
    const reader = new FileReader();
    const asText = /\.(zr|json|obj|gltf|gdshader)$/.test(name);
    reader.onload = () => {
        try {
            if (/\.(zr|json)$/.test(name)) { commit(); restore(JSON.parse(reader.result)); toast('Opened ' + file.name + '!'); return; }
            if (/\.gdshader$/.test(name)) { openGdText(reader.result, file.name); return; }
            if (/\.(glb|gltf)$/.test(name)) {
                new GLTFLoader().parse(reader.result, '', (gltf) => { importGroup(gltf.scene, file.name); }, (err) => toast('Could not read that glTF: ' + (err && err.message || err)));
                return;
            }
            if (/\.obj$/.test(name)) { importGroup(new OBJLoader().parse(reader.result), file.name); return; }
            if (/\.stl$/.test(name)) {
                const g = new STLLoader().parse(reader.result);
                g.computeVertexNormals();
                const m = new THREE.Mesh(g, newMaterial());
                importGroup(m, file.name);
                return;
            }
            toast('Zonerider opens .zr, .glb, .gltf, .obj and .stl files!');
        } catch (e) { toast('Could not open ' + file.name + ': ' + e.message); }
    };
    if (asText) reader.readAsText(file); else reader.readAsArrayBuffer(file);
}
function importGroup(obj, fileName) {
    obj.name = obj.name || fileName.replace(/\.[^.]+$/, '');
    obj.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = o.receiveShadow = true;
            o.userData.zr = { kind: 'mesh', prim: 'custom' };
            if (!o.material || Array.isArray(o.material)) return;
            if (!o.material.isMeshStandardMaterial) { const c = o.material.color ? o.material.color.getHex() : 0xcccccc; o.material = newMaterial(c); }
        } else if (o !== obj && !o.userData.zr) o.userData.zr = { kind: 'empty' };
        if (o.isLight) { o.userData.zr = { kind: 'light', light: o.isSpotLight ? 'spot' : o.isDirectionalLight ? 'sun' : 'point' }; attachTarget(o); }
    });
    if (!obj.userData.zr) obj.userData.zr = { kind: obj.isMesh ? 'mesh' : 'empty', prim: obj.isMesh ? 'custom' : undefined };
    obj.name = uniqueName(obj.name);
    addObject(obj);
    frameObjects([obj]);
    toast('Brought in ' + fileName + '!');
}
function animationClips() {
    const tracks = [];
    world.traverse((o) => {
        const keys = o.userData.zr && o.userData.zr.keys;
        if (!keys || keys.length < 2) return;
        const t = keys.map((k) => (k.f - 1) / state.fps);
        tracks.push(new THREE.VectorKeyframeTrack(o.uuid + '.position', t, keys.flatMap((k) => k.p)));
        tracks.push(new THREE.QuaternionKeyframeTrack(o.uuid + '.quaternion', t, keys.flatMap((k) => k.q)));
        tracks.push(new THREE.VectorKeyframeTrack(o.uuid + '.scale', t, keys.flatMap((k) => k.s)));
    });
    return tracks.length ? [new THREE.AnimationClip('Zonerider', -1, tracks)] : [];
}
// While exporting: lights at their full power (the Solid view dims them) and without their hidden aim helpers
// (a glTF light shines down its own -Z, just like Zonerider's, so Godot, Blender and others aim it the same way)
function exportReady() {
    rememberLights();
    const undoList = [];
    world.traverse((o) => {
        if (!o.isLight) return;
        if (o.userData.zrIntensity != null) { const was = o.intensity; o.intensity = o.userData.zrIntensity; undoList.push(() => { o.intensity = was; }); }
        const t = o.children.find((c) => c.name === '__target');
        if (t) { o.remove(t); undoList.push(() => { o.add(t); o.target = t; }); }
    });
    return () => undoList.reverse().forEach((f) => f());
}
async function exportAs(kind) {
    if (state.mode === 'edit') setMode('object');
    const only = state.selected.length ? state.selected : null;
    const done = exportReady();
    try {
        const target = only ? (() => { const g = new THREE.Group(); g.name = 'Selection'; only.forEach((o) => g.add(o.clone())); return g; })() : world;
        if (kind === 'glb' || kind === 'gltf') {
            const res = await new GLTFExporter().parseAsync(target, { binary: kind === 'glb', animations: only ? [] : animationClips(), onlyVisible: true });
            if (kind === 'glb') download('scene.glb', res, 'model/gltf-binary');
            else download('scene.gltf', JSON.stringify(res, null, 1), 'model/gltf+json');
            toast('Exported scene.' + kind + (only ? ' (just the selection)' : '') + '!');
        } else if (kind === 'obj') { download('scene.obj', new OBJExporter().parse(target), 'text/plain'); toast('Exported scene.obj!'); }
        else if (kind === 'stl') { download('scene.stl', new STLExporter().parse(target, { binary: true }), 'model/stl'); toast('Exported scene.stl!'); }
    } catch (e) { toast('Export failed: ' + (e && e.message || e)); }
    finally { done(); applyWorld(); }
}
$('zr-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) readFile(f); e.target.value = ''; });
function pickFile(accept) { const i = $('zr-file'); i.accept = accept || '.zr,.json,.glb,.gltf,.obj,.stl,.gdshader'; i.click(); }
viewEl.addEventListener('dragover', (e) => { e.preventDefault(); $('zr-drop').classList.add('on'); });
viewEl.addEventListener('dragleave', (e) => { if (!viewEl.contains(e.relatedTarget)) $('zr-drop').classList.remove('on'); });
viewEl.addEventListener('drop', (e) => { e.preventDefault(); $('zr-drop').classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) readFile(f); });

/* ==================================================================
   OBJECT OPERATIONS
   ================================================================== */
function del() {
    if (state.mode === 'edit') { toast('Deleting vertices is not here yet: merge them with M instead!'); return; }
    if (!state.selected.length) return;
    commit();
    state.selected.forEach((o) => { if (o.parent) o.parent.remove(o); if (o.uuid === state.sceneCamera) state.sceneCamera = null; });
    select([]);
    changed();
}
function duplicate() {
    if (!state.selected.length) return;
    commit();
    const copies = state.selected.map((o) => {
        const c = o.clone();
        c.traverse((x) => {
            x.userData = JSON.parse(JSON.stringify(x.userData || {}));
            if (x.isMesh) { x.geometry = x.geometry.clone(); x.material = Array.isArray(x.material) ? x.material.map((m) => m.clone()) : x.material.clone(); }
            if (x.isLight) attachTarget(x);
        });
        c.name = uniqueName(o.name.replace(/\.\d{3}$/, ''));
        c.position.x += 0.5; c.position.z += 0.5;
        hydrateAll(c);
        (o.parent || world).add(c);
        return c;
    });
    select(copies);
    changed();
    setTool('translate');
    toast('Duplicated! Drag the arrows to place the copy!');
}
function hideSel(on) {
    commit();
    if (on === false) world.traverse((o) => { if (o.userData.zrHidden) { o.visible = true; delete o.userData.zrHidden; } });
    else { state.selected.forEach((o) => { o.visible = false; o.userData.zrHidden = true; }); select([]); }
    changed();
}
function parentSel() {
    if (state.selected.length < 2 || !state.active) { toast('Select the children, then the parent last (Shift+click), then Ctrl+P!'); return; }
    commit();
    state.selected.filter((o) => o !== state.active).forEach((o) => state.active.attach(o));
    changed();
    toast('Parented to ' + state.active.name + '!');
}
function clearParent() {
    commit();
    state.selected.forEach((o) => world.attach(o));
    changed();
}
function applyTransform() {
    // bakes position, rotation and scale into the vertices, like Blender's Ctrl+A
    const meshes = state.selected.filter((o) => o.isMesh);
    if (!meshes.length) { toast('Select a mesh first!'); return; }
    commit();
    meshes.forEach((m) => {
        m.updateMatrix();
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrix);
        m.geometry.dispose();
        m.geometry = g;
        m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
        m.userData.zr = Object.assign({}, m.userData.zr, { prim: 'custom', welded: false });
    });
    changed();
    toast('Transforms applied to the vertices!');
}
function originToGeometry() {
    const meshes = state.selected.filter((o) => o.isMesh);
    if (!meshes.length) return;
    commit();
    meshes.forEach((m) => {
        m.geometry.computeBoundingBox();
        const c = m.geometry.boundingBox.getCenter(new THREE.Vector3());
        const g = m.geometry.clone(); g.translate(-c.x, -c.y, -c.z);
        m.geometry.dispose(); m.geometry = g;
        m.position.add(c.applyQuaternion(m.quaternion).multiply(m.scale));
        m.userData.zr = Object.assign({}, m.userData.zr, { prim: 'custom', welded: false });
    });
    changed();
}
function setShade(smooth) {
    commit();
    state.selected.filter((o) => o.isMesh).forEach((m) => { m.material.flatShading = !smooth; m.material.needsUpdate = true; });
    changed();
}
function snapToFloor() {
    commit();
    state.selected.forEach((o) => { const b = new THREE.Box3().setFromObject(o); if (!b.isEmpty()) o.position.y -= b.min.y; });
    changed();
}

/* ==================================================================
   ANIMATION
   ================================================================== */
function setFrameRange() {
    $('zr-frame').max = state.end;
    $('zr-end').value = state.end;
    $('zr-fps').value = state.fps;
}
function insertKey() {
    const list = state.selected.length ? state.selected : [];
    if (!list.length) { toast('Select something to keyframe!'); return; }
    commit();
    list.forEach((o) => {
        const z = o.userData.zr = o.userData.zr || { kind: 'empty' };
        const keys = (z.keys || []).filter((k) => k.f !== state.frame);
        keys.push({ f: state.frame, p: o.position.toArray(), q: o.quaternion.toArray(), s: o.scale.toArray() });
        keys.sort((a, b) => a.f - b.f);
        z.keys = keys;
    });
    changed();
    toast('Keyframe at frame ' + state.frame + '!');
}
function removeKey() {
    let n = 0;
    commit();
    state.selected.forEach((o) => { const z = o.userData.zr; if (z && z.keys) { const b = z.keys.length; z.keys = z.keys.filter((k) => k.f !== state.frame); n += b - z.keys.length; } });
    changed();
    toast(n ? 'Keyframe removed!' : 'No keyframe on this frame!');
}
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
function poseAt(o, f) {
    const keys = o.userData.zr && o.userData.zr.keys;
    if (!keys || !keys.length) return;
    let a = keys[0], b = keys[keys.length - 1];
    if (f <= a.f) b = a; else if (f >= b.f) a = b;
    else for (let i = 0; i < keys.length - 1; i++) if (keys[i].f <= f && keys[i + 1].f >= f) { a = keys[i]; b = keys[i + 1]; break; }
    const t = a === b ? 0 : (f - a.f) / (b.f - a.f);
    o.position.fromArray(a.p).lerp(new THREE.Vector3().fromArray(b.p), t);
    qa.fromArray(a.q); qb.fromArray(b.q);
    o.quaternion.slerpQuaternions(qa, qb, t);
    o.scale.fromArray(a.s).lerp(new THREE.Vector3().fromArray(b.s), t);
}
function goFrame(f, quiet) {
    state.frame = Math.max(1, Math.min(state.end, Math.round(f)));
    $('zr-frame').value = state.frame;
    $('zr-frame-n').value = state.frame;
    world.traverse((o) => poseAt(o, state.frame));
    dirty.propValues = true;
    if (!quiet) status();
}
let playT = 0, playAcc = 0;
function play(on) {
    state.playing = on === undefined ? !state.playing : on;
    $('zr-play').innerHTML = ico(state.playing ? 'pause' : 'play');
    playT = performance.now(); playAcc = 0;
}
function drawKeys() {
    const set = new Set();
    const list = state.selected.length ? state.selected : [];
    const src = list.length ? list : (() => { const a = []; world.traverse((o) => a.push(o)); return a; })();
    src.forEach((o) => { const k = o.userData.zr && o.userData.zr.keys; if (k) k.forEach((x) => set.add(x.f)); });
    $('zr-keys').innerHTML = [...set].map((f) => '<i style="left:' + ((f - 1) / Math.max(1, state.end - 1) * 100) + '%" title="Keyframe ' + f + '"></i>').join('');
}

/* ==================================================================
   RENDER (F12) AND RENDER ANIMATION
   ================================================================== */
function renderCamera(w, h) {
    const c = sceneCameraObj();
    if (c) { const k = c.clone(); c.updateMatrixWorld(true); k.matrixAutoUpdate = false; k.matrix.copy(c.matrixWorld); k.matrixWorld.copy(c.matrixWorld); k.aspect = w / h; k.updateProjectionMatrix(); return k; }
    const k = persp.clone(); k.position.copy(cam.position); k.quaternion.copy(cam.quaternion); k.aspect = w / h; k.updateProjectionMatrix(); return k;
}
function withRenderSetup(fn) {
    const hv = helpers.visible, gv = gizmoHelper.visible, sh = state.shading;
    helpers.visible = false; gizmoHelper.visible = false;
    state.shading = 'rendered'; applyWorld(true);
    world.traverse((o) => { if (o.isLight && o.userData.zrIntensity != null) o.intensity = o.userData.zrIntensity; });
    try { return fn(); }
    finally { helpers.visible = hv; gizmoHelper.visible = gv; state.shading = sh; applyWorld(); }
}
function offRenderer(w, h) {
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: !!state.renderSet.transparent });
    r.setPixelRatio(1); r.setSize(w, h, false);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = state.fxSet.exposure || 1;
    // (screen effects ride along, except on a see-through background)
    if (fxActive() && !state.renderSet.transparent) { r.zrFx = makeComposer(r); r.zrFx.c.setSize(w, h); }
    r.shadowMap.enabled = !!state.renderSet.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
    return r;
}
function renderImage() {
    const w = Math.max(16, Math.min(8192, state.renderSet.w | 0)), h = Math.max(16, Math.min(8192, state.renderSet.h | 0));
    const url = withRenderSetup(() => {
        const r = offRenderer(w, h);
        const bg = scene.background;
        if (state.renderSet.transparent) scene.background = null;
        const rc = renderCamera(w, h);
        if (r.zrFx) { syncFx(r.zrFx, rc); r.zrFx.c.render(); } else r.render(scene, rc);
        scene.background = bg;
        const u = r.domElement.toDataURL('image/png');
        r.dispose();
        return u;
    });
    dialog('Render', '<img src="' + url + '" alt="Rendered image"><p class="zr-note">' + w + ' × ' + h + (sceneCameraObj() ? ', from ' + esc(sceneCameraObj().name) : ', from the viewport (add a camera to frame it yourself)') + '!</p>',
        [{ label: 'Download PNG', primary: true, run: () => download('render.png', dataURLBlob(url)) }, { label: 'Close' }]);
}
function dataURLBlob(u) { const b = atob(u.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: 'image/png' }); }
async function renderAnimation() {
    if (!window.MediaRecorder) { toast('This browser cannot record video!'); return; }
    const w = Math.max(16, Math.min(3840, state.renderSet.w | 0)), h = Math.max(16, Math.min(2160, state.renderSet.h | 0));
    const r = offRenderer(w, h);
    const types = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    const type = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const stream = r.domElement.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 12e6 } : {});
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });
    rec.start();
    const keep = state.frame;
    hint('Rendering the animation… ' + state.end + ' frames!');
    for (let f = 1; f <= state.end; f++) {
        goFrame(f, true);
        withRenderSetup(() => { const rc = renderCamera(w, h); if (r.zrFx) { syncFx(r.zrFx, rc); r.zrFx.c.render(); } else r.render(scene, rc); });
        if (track.requestFrame) track.requestFrame();
        await new Promise((res) => setTimeout(res, 1000 / state.fps));
        if (f % 10 === 0) hint('Rendering the animation… frame ' + f + ' of ' + state.end + '!');
    }
    rec.stop();
    await done;
    r.dispose();
    hint('');
    goFrame(keep);
    const ext = /mp4/.test(rec.mimeType || type) ? 'mp4' : 'webm';
    download('animation.' + ext, new Blob(chunks, { type: rec.mimeType || type || 'video/webm' }));
    toast('Animation rendered: animation.' + ext + '!');
}

/* ==================================================================
   UI: toast, hint, dialogs, menus
   ================================================================== */
let toastT = 0;
function toast(m) { const t = $('zr-toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
function hint(m) { const h = $('zr-view-hint'); h.textContent = m; h.classList.toggle('on', !!m); info(); }
function dialog(title, html, buttons) {
    const back = document.createElement('div');
    back.className = 'zr-dlg-back';
    back.innerHTML = '<div class="zr-dlg" role="dialog" aria-label="' + esc(title) + '"><header><span>' + esc(title) + '</span><button type="button" class="zr-mini" data-x aria-label="Close">' + ico('x') + '</button></header><div class="body">' + html + '</div><div class="foot"></div></div>';
    const foot = back.querySelector('.foot');
    return new Promise((resolve) => {
        const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
        (buttons || [{ label: 'OK', primary: true }]).forEach((b) => {
            const el = document.createElement('button'); el.type = 'button'; el.className = 'zr-btn' + (b.primary ? ' primary' : ''); el.textContent = b.label;
            el.addEventListener('click', () => { const keep = b.run ? b.run(back) : undefined; if (!b.stay) close(b.value !== undefined ? b.value : keep); });
            foot.appendChild(el);
        });
        back.querySelector('[data-x]').addEventListener('click', () => close(null));
        back.addEventListener('mousedown', (e) => { if (e.target === back) close(null); });
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(back);
    });
}
function confirmDlg(title, text, ok) { return dialog(title, '<p>' + esc(text) + '</p>', [{ label: 'Cancel', value: false }, { label: ok || 'OK', primary: true, value: true }]); }

const MENUS = {
    file: () => [
        ['New Scene', 'Ctrl N', () => newScene(), 'plus'], ['Documents…', '', () => { if (window.RadiiDocs) RadiiDocs.openDialog(); }, 'folder'], ['Open…', 'Ctrl O', () => pickFile('.zr,.json'), 'folder'], ['Save (.zr)', 'Ctrl S', saveFile, 'save'], '-',
        ['Import glTF / GLB…', '', () => pickFile('.glb,.gltf'), 'import'], ['Import OBJ…', '', () => pickFile('.obj'), 'import'], ['Import STL…', '', () => pickFile('.stl'), 'import'], ['Open .gdshader (Godot shader)…', '', () => pickFile('.gdshader'), 'sparkle'], '-',
        ['Export GLB', '', () => exportAs('glb'), 'export'], ['Export glTF', '', () => exportAs('gltf'), 'export'], ['Export OBJ', '', () => exportAs('obj'), 'export'], ['Export STL (3D printing)', '', () => exportAs('stl'), 'export'], ['Export shader (.gdshader)', '', () => { const m = selectedMeshes().find((x) => x.material.userData.gdshader); if (m) download((m.name || 'material') + '.gdshader', m.material.userData.gdshader, 'text/plain'); else if (state.screenShader) download('screen.gdshader', state.screenShader.src, 'text/plain'); else toast('Select an object with a shader first!'); }, 'export'], '-',
        ['Share and collaborate…', '', () => { if (window.RadiiCollab) RadiiCollab.toggle('people'); }, 'people'], ['New file in a new tab', '', () => { if (window.RadiiFile) RadiiFile.open(); }, 'newtab']
    ],
    edit: () => [['Undo', 'Ctrl Z', undo, 'undo'], ['Redo', 'Ctrl Shift Z', redo, 'redo'], '-', ['Select All', 'Ctrl A', () => selectAll(true), ''], ['Select None', 'Alt A', () => selectAll(false), ''], '-', ['Duplicate', 'Shift D', duplicate, 'duplicate'], ['Delete', 'X', del, 'trash']],
    add: () => [['#Mesh']].concat(Object.keys(PRIMS).map((k) => [PRIMS[k].label, '', () => addPrim(k), PRIMS[k].icon]))
        .concat(['-', ['#Light'], ['Point Light', '', () => addLight('point'), 'bulb'], ['Sun', '', () => addLight('sun'), 'sun'], ['Spot Light', '', () => addLight('spot'), 'spot'], '-', ['Camera', '', addCamera, 'video'], ['Empty', '', addEmpty, 'empty']]),
    object: () => [
        ['Move', 'G', () => setTool('translate'), 'move'], ['Rotate', 'R', () => setTool('rotate'), 'rotate'], ['Scale', 'Shift S', () => setTool('scale'), 'scale'], '-',
        ['Edit Mode (vertices)', 'Tab', () => setMode(state.mode === 'edit' ? 'object' : 'edit'), 'edit'], ['Merge Vertices', 'M', editMerge, 'merge'], '-',
        ['Shade Smooth', '', () => setShade(true), 'smooth'], ['Shade Flat', '', () => setShade(false), 'flat'],
        ['Apply Transform', 'Ctrl Shift A', applyTransform, 'check'], ['Origin to Geometry', '', originToGeometry, 'origin'], ['Drop to Floor', '', snapToFloor, 'floor'], '-',
        ['Parent (to active)', 'Ctrl P', parentSel, 'parent'], ['Clear Parent', 'Alt P', clearParent, 'unparent'], '-',
        ['Hide', 'H', () => hideSel(true), 'eyeOff'], ['Show Hidden', 'Alt H', () => hideSel(false), 'eye'], '-',
        ['Insert Keyframe', 'I', insertKey, 'key'], ['Delete Keyframe', 'Alt I', removeKey, 'unkey'], '-',
        ['Set as Scene Camera', '', () => { if (state.active && state.active.isCamera) { state.sceneCamera = state.active.uuid; changed(); toast(state.active.name + ' is the scene camera!'); } else toast('Select a camera first!'); }, 'video']
    ],
    view: () => [
        ['Front', '1', () => view('front')], ['Right', '3', () => view('right')], ['Top', '7', () => view('top')], ['Back', 'Ctrl 1', () => view('back')], ['Left', 'Ctrl 3', () => view('left')], ['Bottom', 'Ctrl 7', () => view('bottom')], '-',
        ['Perspective / Orthographic', '5', toggleOrtho], ['Look Through Scene Camera', '0', lookThroughSceneCamera], ['Frame Selected', 'F', () => frameObjects(state.selected)], ['Frame All', 'Home', () => frameObjects([])], '-',
        ['Outliner', 'T', () => togglePanel('left')], ['Properties', 'N', () => togglePanel('right')], '-',
        ['Wireframe', 'Z', () => setShading('wire')], ['Solid', '', () => setShading('solid')], ['Material Preview', '', () => setShading('material')], ['Rendered', '', () => setShading('rendered')]
    ],
    render: () => [['Render Image', 'F12', renderImage, 'camera'], ['Render Animation (video)', 'Ctrl F12', renderAnimation, 'film'], '-', ['Render Settings…', '', () => { setTab('render'); togglePanel('right', true); }, 'gear']],
    help: () => [['Keyboard Shortcuts', '?', shortcuts, 'keyboard'], ['About Zonerider', '', about, 'info'], ['Radii Office Home', '', () => { location.href = '/'; }, 'home']]
};
const menuEl = $('zr-menu');
let menuFor = null;
function openMenu(name, anchor) {
    closeMenu();
    const items = MENUS[name]();
    menuEl.innerHTML = '';
    items.forEach((it) => {
        if (it === '-') { menuEl.appendChild(document.createElement('hr')); return; }
        if (it[0][0] === '#') { const h = document.createElement('div'); h.className = 'h'; h.textContent = it[0].slice(1); menuEl.appendChild(h); return; }
        const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem');
        b.innerHTML = '<span class="i">' + ico(it[3]) + '</span><span>' + esc(it[0]) + '</span>' + (it[1] ? '<span class="k">' + esc(it[1]) + '</span>' : '');
        b.addEventListener('click', () => { closeMenu(); it[2](); });
        menuEl.appendChild(b);
    });
    menuEl.hidden = false;
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, bottom: anchor.y };
    menuEl.style.left = Math.min(r.left, innerWidth - menuEl.offsetWidth - 8) + 'px';
    menuEl.style.top = Math.min(r.bottom + 4, innerHeight - menuEl.offsetHeight - 8) + 'px';
    menuFor = anchor;
    if (anchor.setAttribute) anchor.setAttribute('aria-expanded', 'true');
}
function closeMenu() { menuEl.hidden = true; if (menuFor && menuFor.setAttribute) menuFor.setAttribute('aria-expanded', 'false'); menuFor = null; }
document.addEventListener('mousedown', (e) => { if (!menuEl.hidden && !menuEl.contains(e.target) && !(e.target.closest && e.target.closest('#zr-menus'))) closeMenu(); });
$('zr-menus').addEventListener('click', (e) => { const b = e.target.closest('[data-menu]'); if (!b) return; if (menuFor === b) closeMenu(); else openMenu(b.dataset.menu, b); });
$('zr-menus').addEventListener('mouseover', (e) => { const b = e.target.closest('[data-menu]'); if (b && menuFor && menuFor !== b && menuFor.closest && menuFor.closest('#zr-menus')) openMenu(b.dataset.menu, b); });
let lastMouse = { x: 200, y: 200 };
canvas.addEventListener('pointermove', (e) => { lastMouse = { x: e.clientX, y: e.clientY }; });
function shortcuts() {
    const rows = [['Click / Shift+click', 'Select / add to the selection'], ['Drag (left)', 'Orbit the view'], ['Right or middle drag', 'Pan'], ['Wheel / pinch', 'Zoom'], ['W A S D  (and Q / E)', 'Fly the view: forward, left, back, right (down / up)'], ['G  R  Shift S', 'Move, rotate, scale'], ['Shift A', 'Add menu'], ['X  or  Delete', 'Delete'], ['Shift D', 'Duplicate'], ['Ctrl A  /  Alt A', 'Select all / none'], ['H  /  Alt H', 'Hide / show hidden'], ['Tab', 'Edit Mode (vertices) on and off'], ['M', 'Merge the picked vertices'], ['Z', 'Next viewport shading'], ['1  3  7  (Ctrl for the opposite)', 'Front, right, top view'], ['5', 'Perspective / orthographic'], ['0', 'Look through the scene camera'], ['F  or  .', 'Frame the selection'], ['Home', 'Frame everything'], ['I  /  Alt I', 'Insert / delete a keyframe'], ['Space', 'Play / pause'], ['← →', 'Previous / next frame'], ['Ctrl Shift A', 'Apply transform'], ['Ctrl P  /  Alt P', 'Parent / clear parent'], ['F12', 'Render image'], ['Ctrl Z  /  Ctrl Shift Z', 'Undo / redo'], ['Ctrl S  /  Ctrl O', 'Save / open a .zr scene'], ['T  /  N', 'Outliner / properties'], ['Ctrl (while dragging)', 'Snap once']];
    dialog('Keyboard shortcuts', '<table>' + rows.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>').join('') + '</table>');
}
function about() {
    dialog('About Zonerider', '<p><b>Zonerider</b> is Radii Office\'s 3D editor, a little like Blender, right in your browser (and as a desktop app)! Model with shapes and vertices, light your scene, animate with keyframes, render images and videos, and trade models with other apps as glTF, OBJ and STL!</p><p class="zr-note">Built on three.js (MIT license), included with the app so it works offline. Your scene is kept in this browser automatically; use File, Save to keep a .zr file.</p>');
}
function togglePanel(which, force) {
    const app = $('zr-app'), cls = 'zr-no-' + which;
    const hide = force === undefined ? !app.classList.contains(cls) : !force;
    app.classList.toggle(cls, hide);
    savePrefs();
    setTimeout(resize, 0);
}
function selectAll(on) {
    if (state.mode === 'edit') { editSelectAll(on); return; }
    if (!on) { select([]); return; }
    const all = [];
    world.traverse((o) => { if (o !== world && o.parent === world && o.visible) all.push(o); });
    select(all);
}

/* ==================================================================
   OUTLINER
   ================================================================== */
const collapsed = new Set();
const ICON = (o) => o.isMesh ? 'mesh' : o.isPointLight ? 'bulb' : o.isDirectionalLight ? 'sun' : o.isSpotLight ? 'spot' : o.isCamera ? 'video' : o.isGroup || o.children.length ? 'group' : 'empty';
function renderOutliner() {
    const box = $('zr-outliner');
    const rows = [];
    const walk = (o, depth) => {
        o.children.forEach((c) => {
            if (c.name === '__target') return;
            const kids = c.children.filter((k) => k.name !== '__target');
            const sel = state.selected.includes(c), act = state.active === c;
            const cam = c.isCamera && c.uuid === state.sceneCamera;
            rows.push('<div class="zr-row' + (sel ? ' sel' : '') + (act ? ' active' : '') + '" role="treeitem" data-id="' + c.uuid + '" style="padding-left:' + (6 + depth * 14) + 'px">' +
                '<span class="tw" data-tw>' + (kids.length ? ico(collapsed.has(c.uuid) ? 'chevRight' : 'chevDown') : '') + '</span><span class="ic">' + ico(ICON(c)) + '</span><span class="nm" title="Double-click to rename">' + esc(c.name || '(unnamed)') + (cam ? ' ' + ico('camera', 'zi-cam') : '') + '</span>' +
                '<button type="button" class="eye' + (c.visible ? '' : ' off') + '" data-eye title="Show / hide">' + ico(c.visible ? 'eye' : 'eyeOff') + '</button></div>');
            if (kids.length && !collapsed.has(c.uuid)) walk(c, depth + 1);
        });
    };
    walk(world, 0);
    box.innerHTML = rows.join('') || '<div class="zr-note" style="padding:8px 10px">The scene is empty! Add something with Shift+A or the buttons below!</div>';
}
function byUuid(id) { let f = null; world.traverse((o) => { if (o.uuid === id) f = o; }); return f; }
$('zr-outliner').addEventListener('click', (e) => {
    const row = e.target.closest('.zr-row'); if (!row) return;
    const o = byUuid(row.dataset.id); if (!o) return;
    if (e.target.closest('[data-eye]')) { commit(); o.visible = !o.visible; if (o.visible) delete o.userData.zrHidden; changed(); return; }
    if (e.target.closest('[data-tw]')) { if (collapsed.has(o.uuid)) collapsed.delete(o.uuid); else collapsed.add(o.uuid); dirty.outliner = true; return; }
    if (state.mode === 'edit') setMode('object');
    if (e.shiftKey || e.metaKey || e.ctrlKey) select(state.selected.includes(o) ? state.selected.filter((x) => x !== o) : state.selected.concat(o), o);
    else select([o]);
});
$('zr-outliner').addEventListener('dblclick', (e) => {
    const row = e.target.closest('.zr-row'); if (!row || e.target.closest('[data-eye]')) return;
    const o = byUuid(row.dataset.id); if (!o) return;
    const nm = row.querySelector('.nm');
    nm.innerHTML = '<input type="text" value="' + esc(o.name) + '">';
    const inp = nm.querySelector('input'); inp.focus(); inp.select();
    const done = (ok) => { if (ok && inp.value.trim() && inp.value.trim() !== o.name) { commit(); o.name = inp.value.trim(); changed(); } dirty.outliner = true; };
    inp.addEventListener('keydown', (k) => { if (k.key === 'Enter') done(true); if (k.key === 'Escape') done(false); k.stopPropagation(); });
    inp.addEventListener('blur', () => done(true));
});
$('zr-collapse-all').addEventListener('click', () => { world.traverse((o) => { if (o !== world && o.children.length) collapsed.add(o.uuid); }); dirty.outliner = true; });
$('zr-quick').innerHTML = Object.keys(PRIMS).map((k) => '<button type="button" data-add="' + k + '" title="Add a ' + PRIMS[k].label + '"><span>' + ico(PRIMS[k].icon) + '</span>' + PRIMS[k].label + '</button>').join('') +
    '<button type="button" data-add="point" title="Add a point light"><span>' + ico('bulb') + '</span>Light</button><button type="button" data-add="sun" title="Add a sun"><span>' + ico('sun') + '</span>Sun</button><button type="button" data-add="camera" title="Add a camera"><span>' + ico('video') + '</span>Camera</button>';
$('zr-quick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    if (state.mode === 'edit') setMode('object');
    const k = b.dataset.add;
    if (PRIMS[k]) addPrim(k); else if (k === 'camera') addCamera(); else addLight(k);
});

/* ==================================================================
   PROPERTIES
   ================================================================== */
const SWATCHES = ['#c5ff11', '#ff4d5e', '#ff9f1c', '#ffe066', '#3ddc84', '#22d3ee', '#3f8cff', '#a855f7', '#ff6ec7', '#ffffff', '#cccccc', '#8a8f98', '#4b5059', '#1d1f23', '#8b5a2b', '#e9c46a'];
const PRESETS = {
    'Lime gel': { color: '#c5ff11', metalness: 0.05, roughness: 0.12, clearcoat: 1 }, Chrome: { color: '#e8e8e8', metalness: 1, roughness: 0.05, clearcoat: 0 },
    Gold: { color: '#ffc94d', metalness: 1, roughness: 0.22, clearcoat: 0 }, Plastic: { color: '#3f8cff', metalness: 0, roughness: 0.35, clearcoat: 0.6 },
    Rubber: { color: '#26292e', metalness: 0, roughness: 0.95, clearcoat: 0 }, Clay: { color: '#c9a27e', metalness: 0, roughness: 1, clearcoat: 0 },
    Glass: { color: '#bfefff', metalness: 0, roughness: 0.04, clearcoat: 1, opacity: 0.35 }, Glow: { color: '#ffffff', metalness: 0, roughness: 0.5, clearcoat: 0, emissive: '#c5ff11', emissiveIntensity: 2 }
};
function hex(c) { return '#' + c.getHexString(); }
function num(v, step) { return '<input type="number" step="' + (step || 0.1) + '" value="' + v + '">'; }
function vecRow(label, bind, v, step) {
    return '<div class="zr-field"><span>' + label + '</span><div class="zr-vec" data-vec="' + bind + '">' + v.map((x) => '<input type="number" step="' + (step || 0.1) + '" value="' + round(x) + '">').join('') + '</div></div>';
}
function field(label, inner) { return '<div class="zr-field"><span>' + label + '</span>' + inner + '</div>'; }
function rangeRow(label, bind, v, min, max, step) { return field(label, '<input type="range" data-bind="' + bind + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" title="' + v + '">'); }
function colorRow(label, bind, value) {
    return '<div class="zr-field"><span>' + label + '</span><div class="zr-colorrow"><span class="zr-chip" style="background:' + value + '"></span><input type="text" data-bind="' + bind + '" value="' + value + '" spellcheck="false"></div></div>' +
        '<div class="zr-swatches" data-swatch="' + bind + '">' + SWATCHES.map((s) => '<button type="button" style="background:' + s + '" data-c="' + s + '" class="' + (s === value ? 'on' : '') + '" title="' + s + '"></button>').join('') + '</div>';
}
function setTab(t) {
    state.tab = t;
    document.querySelectorAll('#zr-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    dirty.props = true;
}
function renderProps() {
    const o = state.active, el = $('zr-props');
    const none = '<p class="zr-empty">Select something to see its settings!</p>';
    let h = '';
    if (state.tab === 'object') {
        if (!o) h = none;
        else {
            const r = o.rotation;
            h = '<h3>' + ico(ICON(o)) + ' ' + esc(o.name) + '</h3>' + field('Name', '<input type="text" data-bind="name" value="' + esc(o.name) + '">') +
                vecRow('Location', 'position', o.position.toArray()) + vecRow('Rotation °', 'rotation', [r.x / DEG, r.y / DEG, r.z / DEG], 5) + vecRow('Scale', 'scale', o.scale.toArray()) +
                '<label class="zr-check"><input type="checkbox" data-bind="visible"' + (o.visible ? ' checked' : '') + '> Visible</label>' +
                (o.isMesh ? '<label class="zr-check"><input type="checkbox" data-bind="castShadow"' + (o.castShadow ? ' checked' : '') + '> Casts shadows</label><label class="zr-check"><input type="checkbox" data-bind="receiveShadow"' + (o.receiveShadow ? ' checked' : '') + '> Receives shadows</label>' : '') +
                (o.isCamera ? '<h3>Camera</h3>' + rangeRow('Field of view', 'fov', o.fov, 10, 120, 1) + '<div class="zr-btnrow"><button type="button" class="zr-btn" data-act="scenecam">' + (o.uuid === state.sceneCamera ? ico('check') + ' Scene camera' : 'Make scene camera') + '</button><button type="button" class="zr-btn" data-act="lookthrough">Look through (0)</button></div>' : '') +
                '<h3>Animation</h3><div class="zr-btnrow"><button type="button" class="zr-btn" data-act="key">' + ico('key') + ' Insert keyframe (I)</button><button type="button" class="zr-btn" data-act="clearkeys">Clear all keys</button></div>' +
                '<p class="zr-note">' + ((o.userData.zr && o.userData.zr.keys || []).length) + ' keyframe(s)' + (o.parent && o.parent !== world ? ', parent: ' + esc(o.parent.name) : '') + '!</p>';
        }
    } else if (state.tab === 'shape') {
        const z = o && o.userData.zr;
        if (!o || !o.isMesh) h = none.replace('something', 'a mesh');
        else if (z && z.prim && PRIMS[z.prim]) {
            h = '<h3>' + PRIMS[z.prim].label + '</h3>' + Object.keys(PRIMS[z.prim].params).map((k) => field(k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), '<input type="number" data-param="' + k + '" step="' + (/Segments|detail|^[pq]$/.test(k) ? 1 : 0.1) + '" value="' + (z.params[k] != null ? z.params[k] : PRIMS[z.prim].params[k]) + '">')).join('') +
                '<p class="zr-note">Change the numbers to reshape it, like Blender\'s Adjust Last Operation! Editing its vertices (Tab) turns it into a free mesh!</p>';
        } else {
            const g = o.geometry, v = g.attributes.position ? g.attributes.position.count : 0, f = g.index ? g.index.count / 3 : v / 3;
            h = '<h3>Mesh</h3><p class="zr-note">' + v.toLocaleString() + ' vertices, ' + Math.round(f).toLocaleString() + ' triangles! It\'s a free mesh: edit its vertices with Tab!</p>';
        }
        if (o && o.isMesh) h += '<h3>Tools</h3><div class="zr-btnrow"><button type="button" class="zr-btn" data-act="smooth">Shade smooth</button><button type="button" class="zr-btn" data-act="flat">Shade flat</button><button type="button" class="zr-btn" data-act="apply">Apply transform</button><button type="button" class="zr-btn" data-act="origin">Origin to geometry</button><button type="button" class="zr-btn" data-act="floor">Drop to floor</button></div>';
    } else if (state.tab === 'material') {
        const m = o && o.isMesh && !Array.isArray(o.material) ? o.material : null;
        if (!m) h = none.replace('something', 'a mesh');
        else {
            h = '<h3>Material</h3><div class="zr-btnrow">' + Object.keys(PRESETS).map((p) => '<button type="button" class="zr-btn" data-preset="' + p + '">' + p + '</button>').join('') + '</div>' +
                colorRow('Color', 'm.color', hex(m.color)) + rangeRow('Metallic', 'm.metalness', m.metalness, 0, 1, 0.01) + rangeRow('Roughness', 'm.roughness', m.roughness, 0, 1, 0.01) +
                (m.isMeshPhysicalMaterial ? rangeRow('Clearcoat', 'm.clearcoat', m.clearcoat, 0, 1, 0.01) + rangeRow('Glass (see-through)', 'm.transmission', m.transmission, 0, 1, 0.01) + rangeRow('Glass thickness', 'm.thickness', m.thickness, 0, 4, 0.05) + rangeRow('Bubble shimmer', 'm.iridescence', m.iridescence, 0, 1, 0.01) + rangeRow('Velvet sheen', 'm.sheen', m.sheen, 0, 1, 0.01) : '') +
                rangeRow('Opacity', 'm.opacity', m.opacity, 0, 1, 0.01) + colorRow('Glow color', 'm.emissive', hex(m.emissive)) + rangeRow('Glow strength', 'm.emissiveIntensity', m.emissiveIntensity, 0, 10, 0.1) +
                '<label class="zr-check"><input type="checkbox" data-bind="m.wireframe"' + (m.wireframe ? ' checked' : '') + '> Wireframe</label><label class="zr-check"><input type="checkbox" data-bind="m.flatShading"' + (m.flatShading ? ' checked' : '') + '> Flat shading</label><label class="zr-check"><input type="checkbox" data-bind="m.doubleSide"' + (m.side === THREE.DoubleSide ? ' checked' : '') + '> Both sides</label>' +
                '<p class="zr-note">Materials show in Material Preview and Rendered (Z)!</p>' +
                '<h3>Godot shader (.gdshader)</h3>' + (m.userData.gdshader
                    ? '<p class="zr-note">' + esc((/shader_type\s+\w+;[\s\S]*?(?:render_mode[^;]*;)?/.exec(m.userData.gdshader) || [''])[0].replace(/\s+/g, ' ').slice(0, 90)) + '</p>' + gdControls(m.userData.gdshader, m.userData.gdu, 'obj') +
                      '<div class="zr-btnrow"><button type="button" class="zr-btn" data-act="gdedit">Edit code…</button><button type="button" class="zr-btn" data-act="gdsave">Download .gdshader</button><button type="button" class="zr-btn" data-act="gdremove">Remove shader</button></div>'
                    : '<p class="zr-note">Give it special effects with a Godot spatial shader: write one, open a .gdshader file, or start from an example!</p><div class="zr-btnrow"><button type="button" class="zr-btn primary" data-act="gdnew">Write a shader…</button><button type="button" class="zr-btn" data-act="gdopen">Open .gdshader…</button></div>' +
                      '<div class="zr-btnrow">' + EXAMPLES.spatial.map((e, i) => '<button type="button" class="zr-btn" data-gdquick="obj:' + i + '">' + esc(e[0]) + '</button>').join('') + '</div>');
        }
    } else if (state.tab === 'light') {
        const l = o && o.isLight ? o : null;
        if (!l) h = none.replace('something', 'a light');
        else h = '<h3>' + esc(l.name) + '</h3>' + colorRow('Color', 'l.color', hex(l.color)) + rangeRow('Power', 'l.power', lightPower(l), 0, l.isDirectionalLight ? 20 : 500, l.isDirectionalLight ? 0.1 : 1) +
            (l.isSpotLight ? rangeRow('Cone angle °', 'l.angle', round(l.angle / DEG, 1), 1, 89, 1) + rangeRow('Soft edge', 'l.penumbra', l.penumbra, 0, 1, 0.01) : '') +
            (l.isPointLight || l.isSpotLight ? rangeRow('Range (0 = no limit)', 'l.distance', l.distance, 0, 200, 0.5) : '') +
            '<label class="zr-check"><input type="checkbox" data-bind="l.castShadow"' + (l.castShadow ? ' checked' : '') + '> Casts shadows</label><p class="zr-note">Lights you add light the Rendered view (Z)! Material Preview adds a soft studio light!</p>';
    } else if (state.tab === 'world') {
        const W = state.worldSet;
        const F = state.fxSet;
        h = '<h3>World</h3>' + colorRow('Sky (top)', 'w.bg', W.bg) + colorRow('Sky (bottom)', 'w.bg2', W.bg2 || W.bg) + '<label class="zr-check"><input type="checkbox" data-bind="w.gradient"' + (W.bg2 ? ' checked' : '') + '> Two-color sky</label>' + '<label class="zr-check"><input type="checkbox" data-bind="w.env"' + (W.env ? ' checked' : '') + '> Studio reflections</label>' +
            rangeRow('Reflection strength', 'w.envStrength', W.envStrength, 0, 3, 0.05) + rangeRow('Ambient light', 'w.ambient', W.ambient, 0, 3, 0.05) +
            '<label class="zr-check"><input type="checkbox" data-bind="w.fog"' + (W.fog ? ' checked' : '') + '> Mist (fog)</label>' + colorRow('Mist color', 'w.fogColor', W.fogColor) + rangeRow('Mist density', 'w.fogDensity', W.fogDensity, 0, 0.2, 0.002) +
            '<h3>Screen effects</h3><label class="zr-check"><input type="checkbox" data-bind="f.bloom"' + (F.bloom ? ' checked' : '') + '> Glow (bloom)</label>' +
            rangeRow('Glow strength', 'f.bloomStrength', F.bloomStrength, 0, 3, 0.05) + rangeRow('Glow from brightness', 'f.bloomThreshold', F.bloomThreshold, 0, 1, 0.01) +
            rangeRow('Exposure', 'f.exposure', F.exposure, 0.2, 3, 0.05) + rangeRow('Saturation', 'f.saturation', F.saturation, 0, 2, 0.01) + rangeRow('Contrast', 'f.contrast', F.contrast, 0.5, 1.6, 0.01) +
            colorRow('Tint', 'f.tint', F.tint) + rangeRow('Tint amount', 'f.tintAmount', F.tintAmount, 0, 1, 0.01) + rangeRow('Dark corners', 'f.vignette', F.vignette, 0, 1, 0.01) +
            '<div class="zr-btnrow"><button type="button" class="zr-btn" data-act="fxreset">Reset effects</button></div>' +
            '<h3>Screen shader (.gdshader)</h3>' + (state.screenShader
                ? gdControls(state.screenShader.src, state.screenShader.values, 'screen') + '<div class="zr-btnrow"><button type="button" class="zr-btn" data-act="gdsedit">Edit code…</button><button type="button" class="zr-btn" data-act="gdssave">Download .gdshader</button><button type="button" class="zr-btn" data-act="gdsremove">Remove</button></div>'
                : '<p class="zr-note">A Godot canvas_item shader that changes the whole picture: CRT, pixels, color shifts, water...</p><div class="zr-btnrow"><button type="button" class="zr-btn" data-act="gdsnew">Write one…</button><button type="button" class="zr-btn" data-act="gdopen">Open .gdshader…</button></div>' +
                  '<div class="zr-btnrow">' + EXAMPLES.canvas_item.map((e, i) => '<button type="button" class="zr-btn" data-gdquick="screen:' + i + '">' + esc(e[0]) + '</button>').join('') + '</div>') +
            '<p class="zr-note">The world and screen effects show in the Rendered view (Z) and in renders!</p>';
    } else if (state.tab === 'effects') {
        const col = COLLECTIONS.find((c) => c.id === state.fxCollection) || COLLECTIONS[0];
        h = '<h3>' + ico('sparkle') + ' Effect presets</h3><div class="zr-colls">' + COLLECTIONS.map((c) => '<button type="button" class="zr-coll' + (c === col ? ' on' : '') + '" data-coll="' + c.id + '">' + esc(c.name) + '</button>').join('') + '</div>' +
            '<div class="zr-presets">' + col.presets.map((p, i) => '<button type="button" class="zr-preset" data-preset-fx="' + i + '" title="' + esc(p.name) + '"><img alt="" src="' + presetThumb(col.id, i) + '"><span>' + esc(p.name) + '</span>' + (p.shader ? '<i class="zr-ptag">shader</i>' : '') + '</button>').join('') + '</div>' +
            '<p class="zr-note">' + (state.selected.some((o) => o.isMesh || o.children.length) ? 'Click a look to give the selected objects its material!' : 'Select an object, then click a look to give it that material!') + ' Your sky, lights and screen effects stay as they are (the World tab has those). Ctrl+Z undoes it!</p>';
    } else if (state.tab === 'render') {
        const R = state.renderSet, c = sceneCameraObj();
        h = '<h3>Output</h3>' + field('Width', '<input type="number" data-bind="r.w" min="16" max="8192" value="' + R.w + '">') + field('Height', '<input type="number" data-bind="r.h" min="16" max="8192" value="' + R.h + '">') +
            '<div class="zr-btnrow">' + [['HD', 1280, 720], ['Full HD', 1920, 1080], ['4K', 3840, 2160], ['Square', 1080, 1080], ['Phone', 1080, 1920]].map((p) => '<button type="button" class="zr-btn" data-res="' + p[1] + 'x' + p[2] + '">' + p[0] + '</button>').join('') + '</div>' +
            '<label class="zr-check"><input type="checkbox" data-bind="r.shadows"' + (R.shadows ? ' checked' : '') + '> Shadows</label><label class="zr-check"><input type="checkbox" data-bind="r.transparent"' + (R.transparent ? ' checked' : '') + '> Transparent background (PNG)</label>' +
            '<p class="zr-note">Camera: ' + (c ? esc(c.name) : 'none, so the viewport is used') + '!</p><div class="zr-btnrow"><button type="button" class="zr-btn primary" data-act="render">' + ico('camera') + ' Render Image (F12)</button><button type="button" class="zr-btn" data-act="renderanim">' + ico('film') + ' Render Animation</button></div>';
    }
    el.innerHTML = h;
}
function updatePropValues() {
    const o = state.active;
    if (!o || state.tab !== 'object') return;
    const set = (bind, vals) => {
        const box = document.querySelector('#zr-props [data-vec="' + bind + '"]');
        if (!box) return;
        box.querySelectorAll('input').forEach((inp, i) => { if (document.activeElement !== inp) inp.value = round(vals[i]); });
    };
    set('position', o.position.toArray());
    set('rotation', [o.rotation.x / DEG, o.rotation.y / DEG, o.rotation.z / DEG]);
    set('scale', o.scale.toArray());
}
let propCommitted = false;
function beginPropEdit() { if (!propCommitted) { commit(); propCommitted = true; } }
const props = $('zr-props');
props.addEventListener('focusin', () => { propCommitted = false; });
props.addEventListener('input', (e) => applyProp(e.target, false));
props.addEventListener('change', (e) => { applyProp(e.target, true); propCommitted = false; });
function applyProp(t, final) {
    const o = state.active;
    // a Godot shader's uniform
    const gdb = t.dataset.bind && /^gd[ar]?:/.test(t.dataset.bind) ? t.dataset.bind.split(':') : null;
    if (gdb) {
        const [kind, where, name] = gdb, store = where === 'screen' ? (state.screenShader && state.screenShader.values) : ((selectedMeshes()[0] || {}).material || { userData: {} }).userData.gdu;
        const src = where === 'screen' ? state.screenShader && state.screenShader.src : (selectedMeshes()[0] || { material: { userData: {} } }).material.userData.gdshader;
        let u = null; try { u = parseGd(src).uniforms.find((x) => x.name === name); } catch (e) {}
        if (!u) return;
        const cur = store && name in store ? store[name] : u.def;
        let v;
        if (kind === 'gd') { if (!/^#[0-9a-f]{6}$/i.test(String(t.value).trim())) return; const c = new THREE.Color(String(t.value).trim()); v = [c.r, c.g, c.b].concat(Array.isArray(cur) && cur.length === 4 ? [cur[3]] : []); const chip = t.closest('.zr-field') && t.closest('.zr-field').querySelector('.zr-chip'); if (chip) chip.style.background = t.value; }
        else if (kind === 'gda') { v = (Array.isArray(cur) ? cur.slice() : [1, 1, 1, 1]); v[3] = Number(t.value); t.title = t.value; }
        else { v = Number(t.value); if (u.type === 'int' || u.type === 'uint') v = Math.round(v); t.title = t.value; }
        if (!propCommitted) { commit(); propCommitted = true; }
        setGdValue(where, name, v, final);
        return;
    }
    if (t.dataset.gdu) {
        const where = t.dataset.gdw, name = t.dataset.gdu;
        if (!propCommitted) { commit(); propCommitted = true; }
        if (t.type === 'checkbox') setGdValue(where, name, t.checked, final);
        else if (t.type === 'number') setGdValue(where, name, Number(t.value) || 0, final);
        return;
    }
    const gv = t.closest('[data-gdvec]');
    if (gv) {
        if (!propCommitted) { commit(); propCommitted = true; }
        setGdValue(gv.dataset.gdw, gv.dataset.gdu, Array.from(gv.querySelectorAll('input')).map((i) => Number(i.value) || 0), final);
        return;
    }
    const vec = t.closest('[data-vec]');
    if (vec && o) {
        beginPropEdit();
        const v = Array.from(vec.querySelectorAll('input')).map((i) => Number(i.value) || 0);
        if (vec.dataset.vec === 'rotation') o.rotation.set(v[0] * DEG, v[1] * DEG, v[2] * DEG);
        else o[vec.dataset.vec].set(v[0], v[1], v[2]);
        if (final) changed();
        return;
    }
    if (t.dataset.param && o && o.userData.zr && PRIMS[o.userData.zr.prim]) {
        const v = cleanParam(t.dataset.param, t.value);
        if (v == null) return;
        beginPropEdit();
        o.userData.zr.params = Object.assign({}, PRIMS[o.userData.zr.prim].params, o.userData.zr.params, { [t.dataset.param]: v });
        o.geometry.dispose();
        o.geometry = primGeometry(o.userData.zr.prim, o.userData.zr.params);
        if (final) changed(); else { syncBoxes(); }
        return;
    }
    const b = t.dataset.bind;
    if (!b) return;
    const val = t.type === 'checkbox' ? t.checked : t.type === 'range' || t.type === 'number' ? Number(t.value) : t.value;
    if (t.type === 'range') t.title = t.value;
    const isColor = /^(m\.color|m\.emissive|l\.color|w\.bg|w\.bg2|w\.fogColor|f\.tint)$/.test(b);
    if (isColor && !/^#[0-9a-f]{6}$/i.test(String(val).trim())) return;
    beginPropEdit();
    const [ns, key] = b.indexOf('.') > 0 ? b.split('.') : ['o', b];
    if (ns === 'o' && o) {
        if (key === 'name') { if (final && val.trim()) o.name = val.trim(); }
        else if (key === 'fov') { o.fov = val; o.updateProjectionMatrix(); }
        else o[key] = val;
    } else if (ns === 'm' && o && o.isMesh) {
        const m = o.material;
        if (key === 'color' || key === 'emissive') m[key].set(val.trim());
        else if (key === 'doubleSide') m.side = val ? THREE.DoubleSide : THREE.FrontSide;
        else if (key === 'opacity') { m.opacity = val; m.transparent = val < 1; }
        else m[key] = val;
        if (key === 'flatShading' || key === 'wireframe' || key === 'doubleSide') m.needsUpdate = true;
    } else if (ns === 'l' && o && o.isLight) {
        if (key === 'color') o.color.set(val.trim());
        else if (key === 'power') lightPower(o, val);
        else if (key === 'angle') { o.angle = val * DEG; syncIcon(o); }
        else o[key] = val;
    } else if (ns === 'w') {
        if (key === 'gradient') state.worldSet.bg2 = val ? (state.worldSet.bg2 || '#ffffff') : '';
        else if (key === 'bg2') state.worldSet.bg2 = val.trim();
        else state.worldSet[key] = isColor ? val.trim() : val;
        applyWorld();
        if (key === 'gradient') dirty.props = true;
    } else if (ns === 'f') { state.fxSet[key] = isColor ? val.trim() : val; applyWorld(); }
    else if (ns === 'r') { state.renderSet[key] = val; applyWorld(); }
    else if (ns === 'x') { state[key] = val; savePrefs(); }
    if (isColor) { const row = t.closest('.zr-field'); const chip = row && row.querySelector('.zr-chip'); if (chip) chip.style.background = val; }
    if (final) changed();
}
function syncIcon(o) { const h = helperOf.get(o.uuid); if (h) { helpers.remove(h.group); helperOf.delete(o.uuid); syncHelpers(); tintIcons(); } }
props.addEventListener('click', (e) => {
    const o = state.active;
    const sw = e.target.closest('[data-swatch] [data-c]');
    if (sw) { const inp = props.querySelector('[data-bind="' + sw.closest('[data-swatch]').dataset.swatch + '"]'); if (inp) { inp.value = sw.dataset.c; propCommitted = false; applyProp(inp, true); dirty.props = true; } return; }
    const pr = e.target.closest('[data-preset]');
    if (pr && o && o.isMesh) {
        commit();
        const p = PRESETS[pr.dataset.preset], m = o.material;
        m.color.set(p.color); m.metalness = p.metalness; m.roughness = p.roughness; if (m.isMeshPhysicalMaterial) m.clearcoat = p.clearcoat || 0;
        m.opacity = p.opacity != null ? p.opacity : 1; m.transparent = m.opacity < 1;
        m.emissive.set(p.emissive || '#000000'); m.emissiveIntensity = p.emissiveIntensity || 1;
        if (state.shading === 'solid' || state.shading === 'wire') setShading('material');
        changed(); toast(pr.dataset.preset + '!');
        return;
    }
    const gq = e.target.closest('[data-gdquick]');
    if (gq) {
        const [where, i] = gq.dataset.gdquick.split(':'), ex = EXAMPLES[where === 'screen' ? 'canvas_item' : 'spatial'][+i];
        try {
            if (where === 'screen') applyScreenShader(ex[1]); else { const m = selectedMeshes(); if (!m.length) { toast('Select an object first!'); return; } applyObjectShader(ex[1], m); }
            toast(ex[0] + ' shader on!');
        } catch (err) { shaderEditor(where === 'screen' ? 'canvas_item' : 'spatial', ex[1], err.message); }
        return;
    }
    const gimg = e.target.closest('[data-gdimg]');
    if (gimg) {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { commit(); setGdValue(gimg.dataset.gdw, gimg.dataset.gdu, r.result, true); hydrateAll(); dirty.props = true; }; r.readAsDataURL(f); };
        inp.click();
        return;
    }
    const coll = e.target.closest('[data-coll]');
    if (coll) { state.fxCollection = coll.dataset.coll; dirty.props = true; savePrefs(); return; }
    const pf = e.target.closest('[data-preset-fx]');
    if (pf) { applyPreset(state.fxCollection, Number(pf.dataset.presetFx)); return; }
    const res = e.target.closest('[data-res]');
    if (res) { const [w, h] = res.dataset.res.split('x').map(Number); state.renderSet.w = w; state.renderSet.h = h; changed(); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    ({
        key: insertKey, clearkeys: () => { commit(); state.selected.forEach((x) => { if (x.userData.zr) delete x.userData.zr.keys; }); changed(); },
        scenecam: () => { state.sceneCamera = o.uuid; changed(); }, lookthrough: lookThroughSceneCamera,
        smooth: () => setShade(true), flat: () => setShade(false), apply: applyTransform, origin: originToGeometry, floor: snapToFloor,
        render: renderImage, renderanim: renderAnimation,
        fxreset: () => { commit(); state.fxSet = Object.assign({}, FX_DEFAULTS); applyWorld(); changed(); },
        gdnew: () => shaderEditor('spatial', ''), gdopen: () => pickFile('.gdshader'),
        gdedit: () => shaderEditor('spatial', o.material.userData.gdshader), gdsave: () => download((o.name || 'material') + '.gdshader', o.material.userData.gdshader, 'text/plain'),
        gdremove: () => { selectedMeshes().filter((x) => x.material.userData.gdshader).forEach(removeObjectShader); },
        gdsnew: () => shaderEditor('canvas_item', ''), gdsedit: () => shaderEditor('canvas_item', state.screenShader.src),
        gdssave: () => download('screen.gdshader', state.screenShader.src, 'text/plain'),
        gdsremove: () => { commit(); state.screenShader = null; changed(); }
    })[a.dataset.act]();
});
$('zr-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });

/* ---------- Godot shaders on objects ---------- */
// (re)attaches a material's saved .gdshader (after opening a file, undo, duplicate or a collaborator's change)
function hydrateGd(m) {
    if (!m || !m.userData || !m.userData.gdshader) return;
    try { const p = parseGd(m.userData.gdshader); if (p.type === 'spatial') applySpatial(m, p, m.userData.gdu || {}); } catch (e) { console.warn('[Zonerider] shader', e); }
}
function hydrateAll(root) { (root || world).traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(hydrateGd); }); }
// renders a tiny test so a mistake comes back as a message instead of an invisible object
const gdProbe = { rt: new THREE.WebGLRenderTarget(4, 4), scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera() };
gdProbe.scene.add(new THREE.DirectionalLight(0xffffff, 1));
function gdCheck(material, screen) {
    gdError = '';
    const mesh = new THREE.Mesh(screen ? new THREE.PlaneGeometry(2, 2) : new THREE.SphereGeometry(1, 8, 6), material);
    gdProbe.scene.add(mesh);
    const was = renderer.getRenderTarget();
    try { renderer.setRenderTarget(gdProbe.rt); renderer.render(gdProbe.scene, gdProbe.cam); }
    catch (e) { gdError = gdError || String(e.message || e); }
    finally { renderer.setRenderTarget(was); gdProbe.scene.remove(mesh); mesh.geometry.dispose(); }
    return gdError;
}
// a spatial shader goes on the selected meshes (unshaded ones get a light-free material underneath)
function applyObjectShader(src, targets) {
    const p = parseGd(src);
    if (p.type !== 'spatial') throw new Error('That is a screen shader (canvas_item): it goes in the World tab!');
    const unshaded = p.modes.includes('unshaded');
    const make = (old) => {
        const m = unshaded ? new THREE.MeshBasicMaterial() : (old && old.isMeshPhysicalMaterial ? old.clone() : newMaterial());
        if (old && old.color && m.color) m.color.copy(old.color);
        m.userData = Object.assign({}, old && old.userData ? JSON.parse(JSON.stringify(old.userData)) : {}, { gdshader: src, gdu: (old && old.userData && old.userData.gdshader === src && old.userData.gdu) || {} });
        applySpatial(m, p, m.userData.gdu);
        return m;
    };
    const test = make(targets[0] && targets[0].material);
    const err = gdCheck(test);
    if (err) throw new Error(err);
    commit();
    targets.forEach((o, i) => { o.material = i === 0 ? test : make(o.material); });
    if (state.shading === 'solid' || state.shading === 'wire') setShading('material');
    changed();
}
function removeObjectShader(o) {
    const old = o.material;
    commit();
    const m = newMaterial(old && old.color ? old.color.getHex() : 0xcccccc);
    o.material = m;
    changed();
}
function applyScreenShader(src) {
    const p = parseGd(src);
    if (p.type !== 'canvas_item') throw new Error('That is an object shader (spatial): select objects and use the Material tab!');
    const err = gdCheck(screenMaterial(p, {}), true);
    if (err) throw new Error(err);
    commit();
    const old = state.screenShader;
    state.screenShader = { src, values: old && old.src === src ? old.values : {} };
    if (state.shading !== 'rendered') setShading('rendered');
    changed();
}
// a .gdshader file: objects or the screen, depending on its shader_type
function openGdText(text, name) {
    let p;
    try { p = parseGd(text); } catch (e) { toast(e.message); return; }
    try {
        if (p.type === 'canvas_item') { applyScreenShader(text); toast((name || 'The shader') + ' is on the screen now (Rendered view)!'); return; }
        const meshes = selectedMeshes();
        if (!meshes.length) { toast('Select the objects for ' + (name || 'this shader') + ' first, then open it again!'); return; }
        applyObjectShader(text, meshes);
        toast((name || 'The shader') + ' is on ' + meshes.length + ' object' + (meshes.length === 1 ? '' : 's') + '!');
    } catch (e) { shaderEditor(p.type, text, e.message); }
}
function selectedMeshes() { const out = []; state.selected.forEach((o) => o.traverse((x) => { if (x.isMesh && !Array.isArray(x.material)) out.push(x); })); return out; }
// the code editor: write or fix a .gdshader, with the compiler's message when something is wrong
function shaderEditor(kind, src, error) {
    const isScreen = kind === 'canvas_item';
    const ex = EXAMPLES[isScreen ? 'canvas_item' : 'spatial'];
    const html = '<p class="zr-note">' + (isScreen ? 'A <b>canvas_item</b> shader changes the whole picture (it shows in the Rendered view and in renders)!' : 'A <b>spatial</b> shader goes on the selected objects! Zonerider\'s lights still shine on it unless it says render_mode unshaded!') + ' It is Godot 4\'s shading language, so the same file works in Godot!</p>' +
        '<div class="zr-btnrow">' + ex.map((e, i) => '<button type="button" class="zr-btn" data-gdex="' + i + '">' + esc(e[0]) + '</button>').join('') + '</div>' +
        '<textarea class="zr-code" spellcheck="false" aria-label="Shader code">' + esc(src || ex[0][1]) + '</textarea>' +
        '<pre class="zr-gderr"' + (error ? '' : ' hidden') + '>' + esc(error || '') + '</pre>';
    dialog(isScreen ? 'Screen shader (.gdshader)' : 'Object shader (.gdshader)', html, [
        { label: 'Cancel', value: null },
        { label: 'Download .gdshader', stay: true, run: (b) => download((isScreen ? 'screen' : 'material') + '.gdshader', b.querySelector('.zr-code').value, 'text/plain') },
        { label: 'Apply', primary: true, stay: true, run: (b) => {
            const code = b.querySelector('.zr-code').value, err = b.querySelector('.zr-gderr');
            try {
                if (isScreen) applyScreenShader(code);
                else { const m = selectedMeshes(); if (!m.length) throw new Error('Select an object first!'); applyObjectShader(code, m); }
                err.hidden = true;
                b.remove();
                toast('Shader applied!');
            } catch (e) { err.hidden = false; err.textContent = e.message; }
        } }
    ]);
    setTimeout(() => {
        const back = document.querySelector('.zr-dlg-back:last-of-type');
        if (!back) return;
        back.querySelector('.zr-dlg').classList.add('zr-dlg-wide');
        back.addEventListener('click', (e) => { const b = e.target.closest('[data-gdex]'); if (b) back.querySelector('.zr-code').value = ex[+b.dataset.gdex][1]; });
        back.querySelector('.zr-code').addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Tab') { e.preventDefault(); const t = e.target, a = t.selectionStart; t.setRangeText('\t', a, t.selectionEnd, 'end'); }
        });
    }, 0);
}
// the controls for a shader's uniforms (sliders for hint_range, colors for source_color, numbers, checkboxes, images)
function gdControls(src, values, where) {
    let p;
    try { p = parseGd(src); } catch (e) { return '<p class="zr-note">' + esc(e.message) + '</p>'; }
    const list = p.uniforms.filter((u) => !u.screen);
    if (!list.length) return '<p class="zr-note">This shader has no uniforms to adjust!</p>';
    const val = (u) => (values && u.name in values ? values[u.name] : u.def);
    const attr = 'data-gdw="' + where + '" data-gdu="';
    return list.map((u) => {
        const v = val(u), label = u.name.replace(/_/g, ' ');
        if (u.type === 'bool') return '<label class="zr-check"><input type="checkbox" ' + attr + esc(u.name) + '"' + (v ? ' checked' : '') + '> ' + esc(label) + '</label>';
        if (u.type === 'sampler2D') return field(esc(label), '<button type="button" class="zr-btn" ' + attr + esc(u.name) + '" data-gdimg="1">' + (typeof v === 'string' && v.startsWith('data:') ? 'Change image…' : 'Choose image…') + '</button>');
        if (Array.isArray(v) && u.color) {
            const hexv = '#' + new THREE.Color(v[0], v[1], v[2]).getHexString();
            return colorRow(esc(label), 'gd:' + where + ':' + u.name, hexv) + (v.length === 4 ? rangeRow(esc(label) + ' alpha', 'gda:' + where + ':' + u.name, v[3], 0, 1, 0.01) : '');
        }
        if (Array.isArray(v)) return field(esc(label), '<div class="zr-vec" ' + attr + esc(u.name) + '" data-gdvec="1" style="grid-template-columns:repeat(' + v.length + ',minmax(0,1fr))">' + v.map((x) => '<input type="number" step="0.1" value="' + round(x) + '">').join('') + '</div>');
        const isInt = u.type === 'int' || u.type === 'uint';
        if (u.min != null && u.max != null) return rangeRow(esc(label), 'gdr:' + where + ':' + u.name, v, u.min, u.max, u.step || (isInt ? 1 : (u.max - u.min) / 200));
        return field(esc(label), '<input type="number" ' + attr + esc(u.name) + '" step="' + (isInt ? 1 : 0.1) + '" value="' + v + '">');
    }).join('');
}
// a uniform changed in the panel: saved with the material (or the scene), and sent to the GPU right away
function setGdValue(where, name, value, final) {
    if (where === 'screen') {
        if (!state.screenShader) return;
        state.screenShader.values = Object.assign({}, state.screenShader.values, { [name]: value });
    } else {
        const p0 = selectedMeshes();
        p0.forEach((o) => {
            const m = o.material;
            if (!m.userData.gdshader) return;
            m.userData.gdu = Object.assign({}, m.userData.gdu, { [name]: value });
            try {
                const p = parseGd(m.userData.gdshader), u = p.uniforms.find((x) => x.name === name), live = LIVE.get(m);
                if (u && live && live[gpuName(u)]) live[gpuName(u)].value = uniformValue(u, value);
            } catch (e) {}
        });
    }
    if (final) changed();
}

/* ---------- applying a preset, and its little preview ---------- */
function setMaterial(m, P) {
    m.color.set(P.color); m.metalness = P.metalness; m.roughness = P.roughness;
    m.opacity = P.opacity; m.transparent = P.opacity < 1;
    m.emissive.set(P.emissive); m.emissiveIntensity = P.emissiveIntensity;
    if (m.isMeshPhysicalMaterial) {
        m.clearcoat = P.clearcoat; m.transmission = P.transmission; m.thickness = P.thickness; m.ior = P.ior;
        m.iridescence = P.iridescence; m.sheen = P.sheen; m.sheenColor.set(P.color);
    }
    m.needsUpdate = true;
}
// A preset gives the selected objects its MATERIAL only: your sky, mist, lights and screen effects stay as they are
// (the preview still shows the look in its own little scene)
function applyPreset(colId, i) {
    const col = COLLECTIONS.find((c) => c.id === colId), p = col && col.presets[i];
    if (!p) return;
    const meshes = [];
    state.selected.forEach((o) => o.traverse((x) => { if (x.isMesh && !Array.isArray(x.material)) meshes.push(x); }));
    if (!meshes.length) { toast('Select an object first, then pick a look for it!'); return; }
    commit();
    meshes.forEach((x) => {
        // a look without a shader replaces any shader the object had
        if (!x.material.isMeshPhysicalMaterial || (!p.shader && x.material.userData.gdshader)) x.material = newMaterial();
        setMaterial(x.material, p.mat);
    });
    // a look that is a Godot shader: the material underneath, then the shader on top (its sliders appear in the Material tab)
    if (p.shader) {
        try { applyObjectShader(p.shader, meshes); }
        catch (e) { toast('That look\'s shader could not run here: ' + e.message.split('\n')[0]); }
    }
    // (Solid and Wire hide materials, so the viewport switches to Material Preview to show it)
    if (state.shading === 'solid' || state.shading === 'wire') setShading('material');
    changed();
    toast(p.name + (p.shader ? ' (a Godot shader)' : '') + ' on ' + meshes.length + ' object' + (meshes.length === 1 ? '' : 's') + '!');
}
const thumbCache = new Map();
let thumbKit = null;
function presetThumb(colId, i) {
    const key = colId + ':' + i;
    if (thumbCache.has(key)) return thumbCache.get(key);
    const p = COLLECTIONS.find((c) => c.id === colId).presets[i];
    try {
        if (!thumbKit) {
            const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
            r.setPixelRatio(1); r.setSize(112, 112, false);
            r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
            const sc = new THREE.Scene();
            const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
            const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhysicalMaterial());
            const knot = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 16, 48), ball.material);
            knot.position.set(0, 0, 0.55); knot.rotation.x = 1.1;
            const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 3, 3);
            const amb = new THREE.AmbientLight(0xffffff, 0.3);
            sc.add(ball, sun, amb);
            const c = new THREE.PerspectiveCamera(32, 1, 0.1, 50); c.position.set(0, 0.4, 4.2); c.lookAt(0, 0, 0);
            thumbKit = { r, sc, env, ball, sun, amb, c };
        }
        const k = thumbKit, Wd = p.world;
        if (!k.phys) k.phys = k.ball.material;
        let mat = k.phys;
        if (p.shader) {
            const sp = parseGd(p.shader);
            mat = sp.modes.includes('unshaded') ? new THREE.MeshBasicMaterial() : new THREE.MeshPhysicalMaterial();
            if (mat.isMeshPhysicalMaterial) setMaterial(mat, p.mat);
            applySpatial(mat, sp, {});
        } else setMaterial(mat, p.mat);
        k.ball.material = mat;
        k.sc.environment = Wd.env ? k.env : null;
        k.sc.environmentIntensity = Wd.envStrength;
        k.sc.background = Wd.bg2 ? (() => { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 64; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, Wd.bg); gr.addColorStop(1, Wd.bg2); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })() : new THREE.Color(Wd.bg);
        k.sun.color.set(p.light || '#ffffff'); k.amb.intensity = Wd.ambient + 0.15;
        k.r.toneMappingExposure = p.fx.exposure || 1;
        k.r.render(k.sc, k.c);
        const url = k.r.domElement.toDataURL('image/png');
        thumbCache.set(key, url);
        return url;
    } catch (e) { return ''; }
}

/* ==================================================================
   STATUS BAR
   ================================================================== */
function status() {
    let objs = 0, verts = 0, tris = 0;
    world.traverse((o) => {
        if (o === world || o.name === '__target') return;
        objs++;
        if (o.isMesh && o.geometry.attributes.position) { verts += o.geometry.attributes.position.count; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }
    });
    const a = state.active;
    $('zr-status').innerHTML = '<span><b>' + (state.mode === 'edit' ? 'Edit Mode' : 'Object Mode') + '</b></span><span>Objects <b>' + objs + '</b></span><span>Vertices <b>' + verts.toLocaleString() + '</b></span><span>Triangles <b>' + Math.round(tris).toLocaleString() + '</b></span>' +
        (state.edit ? '<span>Picked vertices <b>' + state.edit.picked.size + '</b></span>' : '') +
        '<span>Selected <b>' + (a ? esc(a.name) : 'nothing') + (state.selected.length > 1 ? ' +' + (state.selected.length - 1) : '') + '</b></span><span>Frame <b>' + state.frame + '</b> / ' + state.end + '</span>';
}

/* ==================================================================
   KEYBOARD (Blender-style)
   ================================================================== */
/* ---------- WASD: fly the view (what you look through, not a camera object) ----------
   W / S forward and back, A / D left and right, Q / E down and up, for as long as the keys are held.
   The speed follows how far you are from what you look at, so it feels the same up close and far away. */
const FLY_KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyQ: 1, KeyE: 1 };
const flying = new Set();
let flyT = 0;
function typingIn(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
document.addEventListener('keydown', (e) => {
    if (!FLY_KEYS[e.code] || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || typingIn(e.target) || document.querySelector('.zr-dlg-back')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!flying.size) flyT = performance.now();
    flying.add(e.code);
    if (viewName !== 'User') { viewName = 'User'; info(); }
}, true);
document.addEventListener('keyup', (e) => { flying.delete(e.code); });
window.addEventListener('blur', () => flying.clear());
const flyV = new THREE.Vector3(), flyF = new THREE.Vector3(), flyR = new THREE.Vector3();
function flyStep(now) {
    if (!flying.size) return;
    const dt = Math.min(0.1, (now - flyT) / 1000); flyT = now;
    const dist = Math.max(0.5, cam.position.distanceTo(orbit.target));
    const speed = dist * 0.9 + 0.5;
    cam.getWorldDirection(flyF);
    flyR.crossVectors(flyF, cam.up).normalize();
    flyV.set(0, 0, 0);
    if (flying.has('KeyW')) flyV.add(flyF);
    if (flying.has('KeyS')) flyV.sub(flyF);
    if (flying.has('KeyD')) flyV.add(flyR);
    if (flying.has('KeyA')) flyV.sub(flyR);
    if (flying.has('KeyE')) flyV.y += 1;
    if (flying.has('KeyQ')) flyV.y -= 1;
    if (!flyV.lengthSq()) return;
    flyV.normalize().multiplyScalar(speed * dt);
    cam.position.add(flyV);
    orbit.target.add(flyV);
}

document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (document.querySelector('.zr-dlg-back')) return;
    const k = e.key, mod = e.metaKey || e.ctrlKey;
    const go = (fn) => { e.preventDefault(); fn(); };
    if (mod && !e.shiftKey && k.toLowerCase() === 'z') return go(undo);
    if (mod && (k.toLowerCase() === 'y' || (e.shiftKey && k.toLowerCase() === 'z'))) return go(redo);
    if (mod && k.toLowerCase() === 's') return go(saveFile);
    if (mod && k.toLowerCase() === 'o') return go(() => pickFile('.zr,.json'));
    if (mod && k.toLowerCase() === 'n') return go(() => newScene());
    if (mod && e.shiftKey && k.toLowerCase() === 'a') return go(applyTransform);
    if (mod && k.toLowerCase() === 'a') return go(() => selectAll(true));
    if (mod && k.toLowerCase() === 'p') return go(parentSel);
    if (k === 'F12') return go(mod ? renderAnimation : renderImage);
    if (mod && k === '1') return go(() => view('back'));
    if (mod && k === '3') return go(() => view('left'));
    if (mod && k === '7') return go(() => view('bottom'));
    if (mod) return;
    if (e.altKey) {
        if (e.code === 'KeyA') return go(() => selectAll(false));
        if (e.code === 'KeyH') return go(() => hideSel(false));
        if (e.code === 'KeyP') return go(clearParent);
        if (e.code === 'KeyI') return go(removeKey);
        return;
    }
    if (e.shiftKey) {
        if (k === 'A' || k === 'a') return go(() => openMenu('add', lastMouse));
        if (k === 'D' || k === 'd') return go(duplicate);
        if (k === 'S' || k === 's') return go(() => setTool('scale'));
        if (k === 'ArrowLeft') return go(() => goFrame(1));
        if (k === 'ArrowRight') return go(() => goFrame(state.end));
        return;
    }
    switch (k) {
        case 'g': case 'G': return go(() => setTool('translate'));
        case 'r': case 'R': return go(() => setTool('rotate'));
        case 'x': case 'X': case 'Delete': case 'Backspace': return go(del);
        case 'h': case 'H': return go(() => hideSel(true));
        case 'Tab': return go(() => setMode(state.mode === 'edit' ? 'object' : 'edit'));
        case 'm': case 'M': return go(editMerge);
        case 'z': case 'Z': return go(() => setShading({ wire: 'solid', solid: 'material', material: 'rendered', rendered: 'wire' }[state.shading]));
        case '1': return go(() => view('front'));
        case '3': return go(() => view('right'));
        case '7': return go(() => view('top'));
        case '5': return go(toggleOrtho);
        case '0': return go(lookThroughSceneCamera);
        case 'f': case 'F': case '.': return go(() => frameObjects(state.selected));
        case 'Home': return go(() => frameObjects([]));
        case 'i': case 'I': return go(insertKey);
        case ' ': return go(() => play());
        case 'ArrowLeft': return go(() => goFrame(state.frame - 1));
        case 'ArrowRight': return go(() => goFrame(state.frame + 1));
        case 't': case 'T': return go(() => togglePanel('left'));
        case 'n': case 'N': return go(() => togglePanel('right'));
        case '?': return go(shortcuts);
        case 'Escape': if (!menuEl.hidden) return go(closeMenu); if (state.mode === 'edit') return go(() => setMode('object')); return;
    }
});
// hold Ctrl (or Cmd) while dragging to snap just this once
document.addEventListener('keydown', (e) => { if ((e.key === 'Control' || e.key === 'Meta') && gizmo.dragging && !state.snap) { state.snap = true; applySnap(); state._tmpSnap = true; } });
document.addEventListener('keyup', (e) => { if ((e.key === 'Control' || e.key === 'Meta') && state._tmpSnap) { state.snap = false; state._tmpSnap = false; applySnap(); } });

/* ==================================================================
   TOOLBAR WIRING
   ================================================================== */
$('zr-tools').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) { setTool(b.dataset.tool); savePrefs(); } });
$('zr-space').addEventListener('click', (e) => { const b = e.target.closest('[data-space]'); if (b) { setSpace(b.dataset.space); savePrefs(); if (state.edit) editRefresh(); } });
$('zr-mode').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
$('zr-shading').addEventListener('click', (e) => { const b = e.target.closest('[data-shade]'); if (b) setShading(b.dataset.shade); });
$('zr-snap').addEventListener('click', () => { state.snap = !state.snap; $('zr-snap').setAttribute('aria-pressed', String(state.snap)); applySnap(); savePrefs(); });
$('zr-frame').addEventListener('input', (e) => goFrame(Number(e.target.value)));
$('zr-frame-n').addEventListener('change', (e) => goFrame(Number(e.target.value)));
$('zr-end').addEventListener('change', (e) => { state.end = Math.max(2, Math.min(100000, Number(e.target.value) || 120)); setFrameRange(); goFrame(state.frame); drawKeys(); changed(); });
$('zr-fps').addEventListener('change', (e) => { state.fps = Math.max(1, Math.min(120, Number(e.target.value) || 24)); changed(); });
$('zr-play').addEventListener('click', () => play());
$('zr-first').addEventListener('click', () => goFrame(1));
$('zr-last').addEventListener('click', () => goFrame(state.end));
$('zr-key').addEventListener('click', insertKey);
$('zr-unkey').addEventListener('click', removeKey);

/* ==================================================================
   LOOP
   ================================================================== */
function resize() {
    const w = viewEl.clientWidth || 1, h = viewEl.clientHeight || 1;
    renderer.setSize(w, h, false);
    viewFx.c.setPixelRatio(renderer.getPixelRatio()); viewFx.c.setSize(w, h);
    renderer.getDrawingBufferSize(gdRes.value);
    persp.aspect = w / h; persp.updateProjectionMatrix();
    const hh = ortho.userData.h || cam.position.distanceTo(orbit.target) * Math.tan(persp.fov * DEG / 2);
    ortho.top = hh; ortho.bottom = -hh; ortho.left = -hh * w / h; ortho.right = hh * w / h; ortho.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewEl);
let lastOrthoDist = 0;
function frame(now) {
    requestAnimationFrame(frame);
    gdTime.value = now / 1000;
    if (state.playing) {
        playAcc += now - playT; playT = now;
        const step = 1000 / state.fps;
        if (playAcc >= step) { const n = Math.floor(playAcc / step); playAcc -= n * step; goFrame(state.frame + n > state.end ? 1 : state.frame + n, true); status(); }
    }
    flyStep(now);
    orbit.update();
    // orthographic zoom follows the wheel (OrbitControls dollies the camera; we turn that distance into a size)
    if (cam.isOrthographicCamera) {
        const d = cam.position.distanceTo(orbit.target);
        if (Math.abs(d - lastOrthoDist) > 1e-4) { lastOrthoDist = d; ortho.userData.h = d * Math.tan(persp.fov * DEG / 2); resize(); }
    }
    headlight.position.copy(cam.position); headlight.target.position.copy(orbit.target);
    world.updateMatrixWorld(true);
    for (const h of helperOf.values()) { h.group.matrix.copy(h.obj.matrixWorld); h.group.visible = h.obj.visible && isShown(h.obj); h.group.matrixWorldNeedsUpdate = true; }
    boxes.forEach((b) => b.update());
    if (state.edit) { const m = state.edit.mesh.matrixWorld; [state.edit.points, state.edit.pickedPts, state.edit.wire].forEach((x) => { x.matrix.copy(m); x.matrixWorldNeedsUpdate = true; }); }
    if (dirty.outliner) { dirty.outliner = false; renderOutliner(); }
    if (dirty.props) { dirty.props = false; renderProps(); }
    if (dirty.propValues) { dirty.propValues = false; updatePropValues(); }
    grid.visible = state.shading !== 'rendered';
    // pass 1: your objects (Solid and Wire swap in their own material); pass 2: grid, icons, boxes and the gizmo,
    // which keep their own look but still hide behind your objects
    renderer.autoClear = false;
    renderer.clear();
    const ov = scene.overrideMaterial, bg = scene.background, hv = helpers.visible, gv = gizmoHelper.visible;
    helpers.visible = false; gizmoHelper.visible = false;
    if (state.shading === 'rendered' && fxActive()) { syncFx(viewFx, cam); viewFx.c.render(); }
    else renderer.render(scene, cam);
    scene.overrideMaterial = null; scene.background = null; world.visible = false; helpers.visible = hv; gizmoHelper.visible = gv;
    renderer.render(scene, cam);
    world.visible = true; scene.background = bg; scene.overrideMaterial = ov;
    if (collab) collab.frame(cam, viewEl.clientWidth, viewEl.clientHeight);
    drawGizmo();
}
function isShown(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

/* ==================================================================
   START
   ================================================================== */
try {
    const p = JSON.parse(localStorage.getItem(PREFS) || '{}');
    if (p.shading) state.shading = p.shading;
    if (p.fxCollection) state.fxCollection = p.fxCollection;
    if (p.fxApplyMat === false) state.fxApplyMat = false;
    if (p.fxApplyScene === false) state.fxApplyScene = false;
    if (p.snap) { state.snap = true; $('zr-snap').setAttribute('aria-pressed', 'true'); }
    if (p.tool) setTool(p.tool);
    if (p.space) setSpace(p.space);
    if (p.left === false) $('zr-app').classList.add('zr-no-left');
    if (p.right === false) $('zr-app').classList.add('zr-no-right');
} catch (e) {}
applySnap();
setShading(state.shading);
resize();
let started = false;
try {
    const saved = EMBED ? null : localStorage.getItem(STORE);
    if (saved) { restore(JSON.parse(saved), false); started = true; }
} catch (e) { console.warn('[Zonerider] could not reopen the saved scene', e); }
if (!started) { newScene(false); undoStack.length = 0; }
setFrameRange();
info();
requestAnimationFrame((t) => { playT = t; frame(t); });
collab = EMBED ? null : installCollab({ hydrateGd, THREE, world, state, helpers, PRIMS, primGeometry, attachTarget, rememberLights, byUuid, select, setMode, frameObjects, serialize, restore, changed, afterRemote, FX_DEFAULTS, gizmoDragging: () => gizmo.dragging });
if (collab) { const b = collab.button({ cls: 'zr-share' }); const shade = $('zr-shading'); shade.parentNode.insertBefore(b, shade); }
/* ==================================================================
   EMBED: Writeout and Bitbook open Zonerider in a frame to make a 3D Scene block!
   The page sends { zr: 'load', scene } (scene null = a fresh one), and Done sends back
   { zr: 'done', scene, png } (the .zr scene and a picture of it), Cancel sends { zr: 'cancel' }.
   ================================================================== */
function embedPicture() {
    const v = $('zr-view').getBoundingClientRect();
    const w = 960, h = Math.max(360, Math.min(720, Math.round(w * (v.height / Math.max(1, v.width)) || 540)));
    return withRenderSetup(() => {
        const r = offRenderer(w, h);
        const rc = renderCamera(w, h);
        if (r.zrFx) { syncFx(r.zrFx, rc); r.zrFx.c.render(); } else r.render(scene, rc);
        const u = r.domElement.toDataURL('image/jpeg', 0.88);
        r.dispose();
        return u;
    });
}
if (EMBED) {
    document.body.classList.add('zr-embedded');
    const brand = document.querySelector('.zr-brand');
    if (brand) { brand.target = '_blank'; brand.rel = 'noopener'; }
    const box = document.createElement('div');
    box.className = 'zr-embed-btns';
    box.innerHTML = '<button type="button" class="zr-btn" id="zr-embed-cancel">Cancel</button><button type="button" class="zr-btn primary" id="zr-embed-done" title="Put this scene in your document!">Done</button>';
    document.querySelector('.zr-top').appendChild(box);
    // (every message carries the page's token from #t=..., so only the page that opened this frame listens)
    const token = (/[#&]t=([\w-]+)/.exec(location.hash) || [])[1] || '';
    const tell = (msg) => window.parent.postMessage(Object.assign({ t: token }, msg), location.origin);
    $('zr-embed-cancel').onclick = () => tell({ zr: 'cancel' });
    $('zr-embed-done').onclick = () => {
        if (state.mode === 'edit') setMode('object');
        let png = '';
        try { png = embedPicture(); } catch (e) { console.warn('[Zonerider] the picture failed', e); }
        tell({ zr: 'done', scene: serialize(), png });
    };
    window.addEventListener('message', (ev) => {
        if (ev.origin !== location.origin || !ev.data || ev.data.zr !== 'load' || ev.data.t !== token) return;
        try { if (ev.data.scene) restore(ev.data.scene, false); else newScene(false); }
        catch (e) { toast('That scene could not be opened: ' + e.message); newScene(false); }
        undoStack.length = 0; redoStack.length = 0;
    });
    tell({ zr: 'ready' });
}
window.Zonerider = { gd: { parseGd, openGdText, applyObjectShader, applyScreenShader, gdCheck, EXAMPLES, error: () => gdError }, collab: () => collab, viewCam: () => cam, viewTarget: () => orbit.target, THREE, scene, world, state, addPrim, addLight, addCamera, addEmpty, select, setMode, setShading, setTool, view, insertKey, goFrame, serialize, restore, exportAs, renderImage, undo, redo, editSelectAll, editMerge, del, duplicate, frameObjects };
