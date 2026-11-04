/* =====================================================================
   Godot shaders (.gdshader) in Zonerider!
     shader_type spatial;      an object's material: vertex() moves vertices, fragment() sets ALBEDO, ALPHA,
                               ROUGHNESS, METALLIC, EMISSION and NORMAL, and Zonerider's lights still light it
                               (render_mode unshaded skips the lighting; cull_disabled, blend_add also work)
     shader_type canvas_item;  a SCREEN effect: fragment() reads the picture (screen_texture with
                               hint_screen_texture, or TEXTURE) at SCREEN_UV and writes COLOR
   Godot's shading language is close to GLSL, so the code is translated, not rewritten: uniforms (with their
   hints and defaults) become controls, TIME / UV / VERTEX / NORMAL / VIEW / SCREEN_UV / ... are provided,
   varyings, constants and your own functions come along. sky, particles and fog shaders aren't supported.
   ===================================================================== */
import * as THREE from 'three';

// the live uniforms of each material / screen pass (kept out of userData, so saving never touches them)
export const LIVE = new WeakMap();
// shared by every shader: the clock and the screen size (Zonerider updates them every frame)
export const gdTime = { value: 0 };
export const gdRes = { value: new THREE.Vector2(1, 1) };
const WHITE = (() => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })();

/* ---------- reading a .gdshader ---------- */
function stripComments(src) { return String(src || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ''); }
export function parseGd(src) {
    const s = stripComments(src);
    const out = { type: '', modes: [], uniforms: [], globals: [], funcs: [], vertex: '', fragment: '', light: '' };
    let i = 0;
    while (i < s.length) {
        // one top-level piece: a statement (up to ;) or a function (up to its matching })
        let j = i, depth = 0, piece = '';
        for (; j < s.length; j++) {
            const ch = s[j];
            if (ch === '{') depth++;
            else if (ch === '}') { depth--; if (depth === 0) { j++; break; } }
            else if (ch === ';' && depth === 0) { j++; break; }
        }
        piece = s.slice(i, j).trim();
        i = j;
        if (!piece) continue;
        let m;
        if ((m = /^shader_type\s+(\w+)\s*;$/.exec(piece))) { out.type = m[1]; continue; }
        if ((m = /^render_mode\s+([\s\S]+);$/.exec(piece))) { out.modes = m[1].split(',').map((x) => x.trim()).filter(Boolean); continue; }
        if (/^group_uniforms\b/.test(piece) || /^#/.test(piece)) continue;
        if ((m = /^(?:global\s+|instance\s+)?uniform\s+(?:(?:lowp|mediump|highp)\s+)?(\w+)\s+(\w+)\s*(?::\s*([\s\S]+?))?\s*(?:=\s*([\s\S]+?))?\s*;$/.exec(piece))) {
            out.uniforms.push(uniformInfo(m[1], m[2], m[3] || '', m[4]));
            continue;
        }
        if ((m = /^(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*)\}$/.exec(piece))) {
            const name = m[2], body = m[4];
            if (m[1] === 'void' && (name === 'vertex' || name === 'fragment' || name === 'light') && !m[3].trim()) { out[name] = body; continue; }
            out.funcs.push(piece);
            continue;
        }
        out.globals.push(piece);   // varyings, constants, structs...
    }
    if (!out.type) throw new Error('A .gdshader starts with "shader_type spatial;" (an object) or "shader_type canvas_item;" (the screen)!');
    if (out.type !== 'spatial' && out.type !== 'canvas_item') throw new Error('Zonerider runs spatial and canvas_item shaders (not ' + out.type + ' yet)!');
    return out;
}
// the numbers in a value, with type names (vec4, ivec2...) taken out first so their digits never count
function nums(t) { return (String(t || '').replace(/(?<![\d.])[A-Za-z_]\w*/g, ' ').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number); }
function uniformInfo(type, name, hints, def) {
    const u = { type, name, hints, color: /source_color|hint_color/.test(hints), screen: /hint_screen_texture/.test(hints) };
    const r = /hint_range\s*\(([^)]*)\)/.exec(hints);
    if (r) { const n = nums(r[1]); u.min = n[0]; u.max = n[1]; u.step = n[2]; }
    const size = { vec2: 2, vec3: 3, vec4: 4, ivec2: 2, ivec3: 3, ivec4: 4 }[type];
    if (type === 'bool') u.def = /true/.test(def || '');
    else if (size) { let n = nums(def); if (n.length === 1) n = Array(size).fill(n[0]); while (n.length < size) n.push(size === 4 && n.length === 3 ? 1 : 0); u.def = n.slice(0, size); }
    else if (type === 'float' || type === 'int' || type === 'uint') u.def = def != null ? (nums(def)[0] || 0) : (u.min != null ? u.min : 0);
    else u.def = null;
    return u;
}

/* ---------- uniform values: what the panel edits (plain JSON) -> what the GPU gets ---------- */
const lin = (v) => new THREE.Color(v[0], v[1], v[2]).convertSRGBToLinear();
export function uniformValue(u, saved) {
    const v = saved !== undefined ? saved : u.def;
    if (u.type === 'sampler2D') {
        if (typeof v === 'string' && v.startsWith('data:')) { const t = new THREE.TextureLoader().load(v); t.colorSpace = u.color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
        return WHITE;
    }
    if (u.type === 'bool') return !!v;
    if (Array.isArray(v)) {
        if (u.color) { const c = lin(v); return v.length === 4 ? new THREE.Vector4(c.r, c.g, c.b, v[3]) : new THREE.Vector3(c.r, c.g, c.b); }
        return v.length === 2 ? new THREE.Vector2(v[0], v[1]) : v.length === 3 ? new THREE.Vector3(v[0], v[1], v[2]) : new THREE.Vector4(v[0], v[1], v[2], v[3]);
    }
    return typeof v === 'number' ? v : 0;
}

/* ---------- the GLSL pieces ---------- */
const COMMON = [
    '#ifndef PI', '#define PI 3.141592653589793', '#endif', '#ifndef TAU', '#define TAU 6.283185307179586', '#endif', '#ifndef E', '#define E 2.718281828459045', '#endif',
    '#define TIME zrTime', '#define VIEW_MATRIX viewMatrix', '#define INV_VIEW_MATRIX inverse(viewMatrix)', '#define CAMERA_POSITION_WORLD cameraPosition',
    'uniform float zrTime;', 'uniform vec2 zrRes;'
].join('\n');
function decls(p, skip) {
    return p.uniforms.filter((u) => !(skip && skip(u))).map((u) => 'uniform ' + u.type + ' ' + u.g + ';').join('\n');
}
// Godot names can clash with names three.js already uses (roughness, color, rand...): every uniform becomes gdu_<name>
// and every helper function gdf_<name> in the translated code (a screen texture simply becomes the picture, tDiffuse)
function prepare(p) {
    const q = Object.assign({}, p);
    const ren = [];
    q.uniforms = p.uniforms.map((u) => { const g = u.screen ? 'tDiffuse' : 'gdu_' + u.name; ren.push([u.name, g, false]); return Object.assign({}, u, { g }); });
    p.funcs.forEach((f) => { const m = /^\w+\s+(\w+)\s*\(/.exec(f); if (m) ren.push([m[1], 'gdf_' + m[1], true]); });
    const fix = (t) => ren.reduce((acc, [from, to, fn]) => acc.replace(new RegExp('(?<![.\\w])' + from + (fn ? '(?=\\s*\\()' : '\\b'), 'g'), to), t);
    q.vertex = fix(p.vertex); q.fragment = fix(p.fragment); q.funcs = p.funcs.map(fix); q.globals = p.globals.map(fix);
    return q;
}

/* ---------- spatial: Godot code inside one of Zonerider's own materials ---------- */
// mat: a MeshPhysicalMaterial (lit) or MeshBasicMaterial (unshaded). values: saved uniform values by name.
export function applySpatial(mat, src, values) {
    const p = prepare(src);
    const uniforms = { zrTime: gdTime, zrRes: gdRes };
    p.uniforms.forEach((u) => { uniforms[u.g] = { value: uniformValue(u, values && values[u.name]) }; });
    const unshaded = p.modes.includes('unshaded');
    mat.side = p.modes.includes('cull_disabled') ? THREE.DoubleSide : p.modes.includes('cull_front') ? THREE.BackSide : THREE.FrontSide;
    mat.blending = p.modes.includes('blend_add') ? THREE.AdditiveBlending : p.modes.includes('blend_mul') ? THREE.MultiplyBlending : THREE.NormalBlending;
    mat.transparent = /\bALPHA\s*=/.test(p.fragment) || p.modes.includes('blend_add');
    mat.depthWrite = !p.modes.includes('depth_draw_never') && !p.modes.includes('blend_add');
    const top = [COMMON, decls(p), 'varying vec2 zrUv;', 'varying vec3 zrViewPos;', 'varying vec3 zrViewNormal;', p.globals.join('\n'), p.funcs.join('\n')].join('\n');
    const vertexBlock = [
        'vec3 transformed = vec3(position);',
        'vec3 zr_n = normal;',
        '{', '#define MODEL_MATRIX modelMatrix', '#define PROJECTION_MATRIX projectionMatrix',
        '  vec3 VERTEX = transformed; vec3 NORMAL = normal; vec2 UV = uv; vec4 COLOR = vec4(1.0);',
        p.vertex,
        '  transformed = VERTEX; zr_n = NORMAL;',
        '#undef MODEL_MATRIX', '#undef PROJECTION_MATRIX', '}'
    ].join('\n');
    const fragOpen = [
        '{',
        '  vec3 ALBEDO = diffuseColor.rgb; float ALPHA = diffuseColor.a; vec3 EMISSION = vec3(0.0);',
        '  float SPECULAR = 0.5; float RIM = 0.0; float RIM_TINT = 0.5; float CLEARCOAT = 0.0; float AO = 1.0;',
        '  vec2 UV = zrUv; vec3 VERTEX = zrViewPos; vec3 VIEW = normalize(-zrViewPos); vec4 FRAGCOORD = gl_FragCoord;',
        '  vec2 SCREEN_UV = gl_FragCoord.xy / zrRes; bool FRONT_FACING = gl_FrontFacing;'
    ].join('\n');
    mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uniforms);
        sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\n' + top)
            .replace('#include <begin_vertex>', vertexBlock)
            .replace('#include <project_vertex>', '#include <project_vertex>\nzrUv = uv; zrViewPos = mvPosition.xyz; zrViewNormal = normalize(normalMatrix * zr_n);');
        if (unshaded) {
            sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + top).replace('#include <alphahash_fragment>', '#include <alphahash_fragment>\n' + fragOpen +
                '\n  float ROUGHNESS = 1.0; float METALLIC = 0.0; vec3 NORMAL = normalize(zrViewNormal) * (gl_FrontFacing ? 1.0 : -1.0);\n' + p.fragment +
                '\n  diffuseColor = vec4(ALBEDO + EMISSION, ALPHA);\n}');
        } else {
            sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + top).replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + fragOpen +
                '\n  float ROUGHNESS = roughnessFactor; float METALLIC = metalnessFactor; vec3 NORMAL = normal;\n' + p.fragment +
                '\n  diffuseColor = vec4(ALBEDO, ALPHA); roughnessFactor = clamp(ROUGHNESS, 0.04, 1.0); metalnessFactor = clamp(METALLIC, 0.0, 1.0);' +
                '\n  normal = normalize(NORMAL); totalEmissiveRadiance += EMISSION;\n}');
        }
        LIVE.set(mat, uniforms);
    };
    const key = hash(JSON.stringify([p.modes, p.uniforms.map((u) => u.type + u.name), p.globals, p.funcs, p.vertex, p.fragment]));
    mat.customProgramCacheKey = () => 'gd' + key;
    LIVE.set(mat, uniforms);
    mat.needsUpdate = true;
    return uniforms;
}

/* ---------- canvas_item: a full-screen effect (a ShaderPass material) ---------- */
export function screenMaterial(src, values) {
    const p = prepare(src);
    const uniforms = { tDiffuse: { value: null }, zrTime: gdTime, zrRes: gdRes };
    p.uniforms.forEach((u) => { if (!u.screen) uniforms[u.g] = { value: uniformValue(u, values && values[u.name]) }; });
    const screenNames = '';
    const frag = [
        'uniform sampler2D tDiffuse;', COMMON, 'varying vec2 vUv;',
        '#define SCREEN_UV vUv', '#define SCREEN_PIXEL_SIZE (1.0 / zrRes)', '#define TEXTURE_PIXEL_SIZE (1.0 / zrRes)', '#define TEXTURE tDiffuse', '#define SCREEN_TEXTURE tDiffuse',
        screenNames, decls(p, (u) => u.screen), p.globals.join('\n'), p.funcs.join('\n'),
        'void main() {', '  vec2 UV = vUv; vec4 FRAGCOORD = gl_FragCoord; vec4 COLOR = texture(tDiffuse, vUv);', '  {', p.fragment, '  }', '  gl_FragColor = COLOR;', '}'
    ].join('\n');
    const m = new THREE.ShaderMaterial({
        uniforms,
        name: 'gdshader-screen',
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: frag,
        depthTest: false, depthWrite: false
    });
    LIVE.set(m, uniforms);
    return m;
}
// a uniform's GPU name (for live updates from the panel)
export const gpuName = (u) => (u.screen ? 'tDiffuse' : 'gdu_' + u.name);

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

/* ---------- examples to start from (Godot 4 syntax, so they work in Godot too) ---------- */
const NOISE = `float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
\tvec2 i = floor(p), f = fract(p);
\tf = f * f * (3.0 - 2.0 * f);
\treturn mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}`;
export const EXAMPLES = {
    spatial: [
        ['Hologram', `shader_type spatial;
render_mode unshaded, cull_disabled, blend_add;

uniform vec4 tint : source_color = vec4(0.2, 0.9, 1.0, 1.0);
uniform float lines : hint_range(10.0, 200.0) = 80.0;
uniform float speed : hint_range(0.0, 5.0) = 1.5;

void fragment() {
\tfloat scan = 0.5 + 0.5 * sin((UV.y + TIME * speed * 0.05) * lines);
\tfloat edge = pow(1.0 - abs(dot(NORMAL, VIEW)), 2.0);
\tALBEDO = tint.rgb * (0.25 + scan * 0.5) + tint.rgb * edge;
\tALPHA = 0.3 + edge * 0.7;
}
`],
        ['Lava', `shader_type spatial;

uniform vec4 hot : source_color = vec4(1.0, 0.85, 0.2, 1.0);
uniform vec4 cool : source_color = vec4(0.45, 0.04, 0.0, 1.0);
uniform float speed : hint_range(0.0, 3.0) = 0.6;

${NOISE}

void fragment() {
\tvec2 p = UV * 6.0 + vec2(TIME * speed, TIME * speed * 0.7);
\tfloat n = noise(p) * 0.6 + noise(p * 2.3) * 0.3 + noise(p * 5.1) * 0.1;
\tvec3 c = mix(cool.rgb, hot.rgb, smoothstep(0.35, 0.75, n));
\tALBEDO = c * 0.4;
\tEMISSION = c * smoothstep(0.45, 0.8, n) * 2.5;
\tROUGHNESS = 0.8;
}
`],
        ['Wobble', `shader_type spatial;

uniform float amount : hint_range(0.0, 0.5) = 0.12;
uniform float speed : hint_range(0.0, 10.0) = 3.0;
uniform vec4 color : source_color = vec4(0.77, 1.0, 0.07, 1.0);

void vertex() {
\tVERTEX += NORMAL * sin(VERTEX.y * 6.0 + TIME * speed) * amount;
}

void fragment() {
\tALBEDO = color.rgb;
\tROUGHNESS = 0.2;
}
`],
        ['Toon', `shader_type spatial;
render_mode unshaded;

uniform vec4 color : source_color = vec4(0.2, 0.6, 1.0, 1.0);
uniform int steps : hint_range(2, 8) = 3;
uniform vec3 light_direction = vec3(0.5, 0.8, 0.4);

void fragment() {
\tvec3 l = normalize((VIEW_MATRIX * vec4(normalize(light_direction), 0.0)).xyz);
\tfloat d = max(dot(NORMAL, l), 0.0);
\tfloat t = floor(d * float(steps)) / float(steps);
\tfloat edge = step(0.25, abs(dot(NORMAL, VIEW)));
\tALBEDO = color.rgb * (0.35 + 0.65 * t) * edge;
}
`],
        ['Rainbow', `shader_type spatial;

uniform float speed : hint_range(0.0, 3.0) = 0.5;
uniform float roughness : hint_range(0.0, 1.0) = 0.15;

void fragment() {
\tfloat h = fract(UV.x + UV.y * 0.5 + TIME * speed);
\tALBEDO = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
\tROUGHNESS = roughness;
}
`],
        ['Dissolve', `shader_type spatial;
render_mode cull_disabled;

uniform float progress : hint_range(0.0, 1.0) = 0.4;
uniform vec4 color : source_color = vec4(0.8, 0.8, 0.85, 1.0);
uniform vec4 edge : source_color = vec4(1.0, 0.5, 0.1, 1.0);

${NOISE}

void fragment() {
\tfloat n = noise(UV * 12.0);
\tif (n < progress) {
\t\tdiscard;
\t}
\tALBEDO = color.rgb;
\tEMISSION = edge.rgb * smoothstep(progress + 0.06, progress, n) * 4.0;
}
`]
    ],
    canvas_item: [
        ['CRT', `shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;
uniform float lines : hint_range(100.0, 1200.0) = 480.0;
uniform float curve : hint_range(0.0, 0.3) = 0.08;

void fragment() {
\tvec2 uv = SCREEN_UV * 2.0 - 1.0;
\tuv *= 1.0 + curve * dot(uv, uv);
\tuv = uv * 0.5 + 0.5;
\tvec3 c = texture(screen_texture, uv).rgb;
\tc *= 0.85 + 0.15 * sin(uv.y * lines * PI);
\tif (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
\t\tc = vec3(0.0);
\t}
\tCOLOR = vec4(c, 1.0);
}
`],
        ['Pixelate', `shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_nearest;
uniform float size : hint_range(1.0, 32.0) = 6.0;

void fragment() {
\tvec2 px = size * SCREEN_PIXEL_SIZE;
\tvec2 uv = floor(SCREEN_UV / px) * px + px * 0.5;
\tCOLOR = texture(screen_texture, uv);
}
`],
        ['Chromatic', `shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture;
uniform float amount : hint_range(0.0, 0.02) = 0.004;

void fragment() {
\tvec2 d = (SCREEN_UV - 0.5) * amount;
\tCOLOR = vec4(texture(screen_texture, SCREEN_UV + d).r, texture(screen_texture, SCREEN_UV).g, texture(screen_texture, SCREEN_UV - d).b, 1.0);
}
`],
        ['Sepia', `shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture;
uniform float amount : hint_range(0.0, 1.0) = 0.8;

void fragment() {
\tvec3 c = texture(screen_texture, SCREEN_UV).rgb;
\tfloat g = dot(c, vec3(0.299, 0.587, 0.114));
\tCOLOR = vec4(mix(c, vec3(g) * vec3(1.07, 0.74, 0.43) * 1.2, amount), 1.0);
}
`],
        ['Underwater', `shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture;
uniform float strength : hint_range(0.0, 0.03) = 0.008;
uniform vec4 water : source_color = vec4(0.7, 0.95, 1.0, 1.0);

void fragment() {
\tvec2 uv = SCREEN_UV + vec2(sin(SCREEN_UV.y * 30.0 + TIME * 2.0), cos(SCREEN_UV.x * 30.0 + TIME * 1.7)) * strength;
\tCOLOR = vec4(texture(screen_texture, uv).rgb * water.rgb, 1.0);
}
`]
    ]
};
