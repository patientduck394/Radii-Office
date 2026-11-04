/* =====================================================================
   Zonerider effect presets: 10 collections of 5 looks each!
   A preset gives the selected objects its MATERIAL. Its world, light and fx below only dress its preview
   thumbnail (the sky, mist, light color and screen effects it was designed with); your scene keeps its own.

   mat:   color, metalness, roughness, clearcoat, opacity, transmission (glass), ior, thickness,
          iridescence (soap-bubble sheen), sheen (velvet), emissive + emissiveIntensity (glow)
   world: bg (top of the sky), bg2 (bottom, '' for one color), env (studio reflections), envStrength, ambient,
          fog, fogColor, fogDensity
   light: the color every light in the scene takes ('' leaves them alone)
   fx:    bloom (glow around bright things), bloomStrength, bloomThreshold, exposure, saturation, contrast,
          tint + tintAmount (a color wash), vignette (dark corners)
   ===================================================================== */
const FX = (o) => Object.assign({ bloom: false, bloomStrength: 0.6, bloomThreshold: 0.8, exposure: 1, saturation: 1, contrast: 1, tint: '#ffffff', tintAmount: 0, vignette: 0 }, o);
const W = (o) => Object.assign({ bg: '#3a3a3a', bg2: '', env: true, envStrength: 1, ambient: 0.25, fog: false, fogColor: '#3a3a3a', fogDensity: 0.02 }, o);
const M = (o) => Object.assign({ color: '#cccccc', metalness: 0, roughness: 0.5, clearcoat: 0, opacity: 1, transmission: 0, ior: 1.5, thickness: 0.5, iridescence: 0, sheen: 0, emissive: '#000000', emissiveIntensity: 1 }, o);

export const COLLECTIONS = [
    { id: 'aero', name: 'Frutiger Aero', presets: [
        { name: 'Aero Glass', mat: M({ color: '#bdf3ff', metalness: 0, roughness: 0.03, clearcoat: 1, transmission: 0.92, thickness: 1, ior: 1.45 }), world: W({ bg: '#7fd3ff', bg2: '#f2fbff', envStrength: 1.3, ambient: 0.4 }), light: '#ffffff', fx: FX({ bloom: true, bloomStrength: 0.45, bloomThreshold: 0.85, saturation: 1.12, exposure: 1.1 }) },
        { name: 'Bubble Sky', mat: M({ color: '#5ec8ff', roughness: 0.05, clearcoat: 1, iridescence: 1, opacity: 0.85 }), world: W({ bg: '#3fb6ff', bg2: '#e8f8ff', envStrength: 1.4, ambient: 0.45 }), light: '#f4fbff', fx: FX({ bloom: true, bloomStrength: 0.55, saturation: 1.15, exposure: 1.1 }) },
        { name: 'Aqua Gel', mat: M({ color: '#2fe0b8', roughness: 0.08, clearcoat: 1, transmission: 0.5, thickness: 1.2 }), world: W({ bg: '#5fe0d0', bg2: '#f0fff8', envStrength: 1.2, ambient: 0.35 }), light: '#eafff7', fx: FX({ bloom: true, bloomStrength: 0.4, saturation: 1.18 }) },
        { name: 'Vista Aurora', mat: M({ color: '#0f766e', roughness: 0.2, clearcoat: 1, emissive: '#22d3ee', emissiveIntensity: 1.6 }), world: W({ bg: '#032b3a', bg2: '#0a6b74', envStrength: 0.8, ambient: 0.15 }), light: '#9ff6ff', fx: FX({ bloom: true, bloomStrength: 1.1, bloomThreshold: 0.55, saturation: 1.2, vignette: 0.35 }) },
        { name: 'Water Drop', mat: M({ color: '#e6fbff', roughness: 0, clearcoat: 1, transmission: 1, thickness: 2, ior: 1.33 }), world: W({ bg: '#a7e8ff', bg2: '#ffffff', envStrength: 1.5, ambient: 0.4 }), light: '#ffffff', fx: FX({ bloom: true, bloomStrength: 0.35, exposure: 1.15 }) }
    ] },
    { id: 'pool', name: 'Poolside', presets: [
        { name: 'Pool Tile', mat: M({ color: '#22d3ee', roughness: 0.15, clearcoat: 1 }), world: W({ bg: '#38bdf8', bg2: '#bff0ff', ambient: 0.4 }), light: '#fff5e6', fx: FX({ saturation: 1.15, exposure: 1.1 }) },
        { name: 'Sunset Float', mat: M({ color: '#fb923c', roughness: 0.2, clearcoat: 1 }), world: W({ bg: '#0ea5e9', bg2: '#fdba74', ambient: 0.35 }), light: '#ffd8a8', fx: FX({ bloom: true, bloomStrength: 0.4, saturation: 1.15, tint: '#fb923c', tintAmount: 0.08 }) },
        { name: 'Chlorine Glow', mat: M({ color: '#0891b2', roughness: 0.1, clearcoat: 1, emissive: '#22d3ee', emissiveIntensity: 1.3 }), world: W({ bg: '#082f49', bg2: '#0e7490', envStrength: 0.8, ambient: 0.2 }), light: '#67e8f9', fx: FX({ bloom: true, bloomStrength: 0.9, bloomThreshold: 0.6, saturation: 1.2, vignette: 0.3 }) },
        { name: 'Lifeguard', mat: M({ color: '#f97316', roughness: 0.6 }), world: W({ bg: '#7dd3fc', bg2: '#f0f9ff', ambient: 0.45 }), light: '#ffffff', fx: FX({ saturation: 1.1, contrast: 1.08 }) },
        { name: 'Deep End', mat: M({ color: '#0369a1', roughness: 0.05, clearcoat: 1, transmission: 0.35, thickness: 1.5 }), world: W({ bg: '#0c4a6e', bg2: '#0284c7', ambient: 0.25, fog: true, fogColor: '#075985', fogDensity: 0.04 }), light: '#7dd3fc', fx: FX({ saturation: 1.1, tint: '#0ea5e9', tintAmount: 0.12, vignette: 0.3 }) }
    ] }
];
export const FX_DEFAULTS = FX({});

// The color-grading pass (after tone mapping): saturation, contrast, a tint wash and dark corners
export const GradeShader = {
    uniforms: { tDiffuse: { value: null }, saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: null }, tintAmount: { value: 0 }, vignette: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float saturation; uniform float contrast; uniform vec3 tint; uniform float tintAmount; uniform float vignette; varying vec2 vUv;',
        'void main() {',
        '  vec4 c = texture2D(tDiffuse, vUv);',
        '  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));',
        '  c.rgb = mix(vec3(l), c.rgb, saturation);',
        '  c.rgb = (c.rgb - 0.5) * contrast + 0.5;',
        '  c.rgb = mix(c.rgb, c.rgb * tint * 1.4, tintAmount);',
        '  vec2 d = vUv - 0.5; c.rgb *= 1.0 - vignette * smoothstep(0.25, 0.75, length(d) * 1.25);',
        '  gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);',
        '}'
    ].join('\n')
};

/* ---------- Looks that are real Godot shaders (.gdshader, spatial): animated, and the same file works in Godot ---------- */
const PROP = 'varying vec3 p3;\n\nvoid vertex() {\n\tp3 = VERTEX;\n}\n';
const FRES = 'float fresnel(vec3 n, vec3 v, float p) {\n\treturn pow(1.0 - clamp(dot(n, v), 0.0, 1.0), p);\n}\n';
const NOISE3 = `float hash3(vec3 p) {
\treturn fract(sin(dot(p, vec3(17.1, 31.7, 47.3))) * 43758.5453);
}
float noise3(vec3 p) {
\tvec3 i = floor(p), f = fract(p);
\tf = f * f * (3.0 - 2.0 * f);
\treturn mix(mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
\t\tmix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
`;
const SHADERS = {
    'Pool Tile': `shader_type spatial;

uniform vec4 water : source_color = vec4(0.13, 0.83, 0.93, 1.0);
uniform vec4 deep : source_color = vec4(0.01, 0.41, 0.63, 1.0);
uniform vec4 grout : source_color = vec4(0.92, 0.97, 1.0, 1.0);
uniform float tiles : hint_range(2.0, 40.0) = 10.0;
uniform float speed : hint_range(0.0, 3.0) = 0.8;

${PROP}
float caustic(vec2 p, float t) {
\tvec2 q = p;
\tfloat c = 0.0;
\tfor (int i = 0; i < 4; i++) {
\t\tq += vec2(sin(q.y * 1.7 + t * (1.0 + float(i) * 0.3)), cos(q.x * 1.3 - t * (0.8 + float(i) * 0.2))) * 0.6;
\t\tc += 1.0 / (1.0 + 18.0 * abs(sin(q.x + q.y)));
\t}
\treturn c / 4.0;
}

void fragment() {
\tvec2 g = abs(fract(UV * tiles) - 0.5);
\tfloat line = smoothstep(0.44, 0.47, max(g.x, g.y));
\tfloat c = caustic((p3.xz + p3.y * 0.5) * 5.0, TIME * speed);
\tvec3 base = mix(deep.rgb, water.rgb, 0.55 + 0.45 * c);
\tALBEDO = mix(base, grout.rgb, line * 0.8);
\tEMISSION = water.rgb * pow(c, 3.0) * 0.6;
\tROUGHNESS = 0.12;
}
`,
    'Sunset Float': `shader_type spatial;

uniform vec4 orange : source_color = vec4(0.98, 0.57, 0.24, 1.0);
uniform vec4 cream : source_color = vec4(1.0, 0.85, 0.65, 1.0);
uniform vec4 sky : source_color = vec4(0.13, 0.74, 0.97, 1.0);
uniform float stripes : hint_range(2.0, 24.0) = 8.0;

${FRES}
void fragment() {
\tfloat s = smoothstep(0.45, 0.55, fract(UV.x * stripes));
\tALBEDO = mix(orange.rgb, cream.rgb, s * 0.55);
\tEMISSION = sky.rgb * fresnel(NORMAL, VIEW, 3.0) * 0.8;
\tROUGHNESS = 0.18;
}
`,
    'Chlorine Glow': `shader_type spatial;

uniform vec4 glow : source_color = vec4(0.13, 0.83, 0.93, 1.0);
uniform vec4 base : source_color = vec4(0.03, 0.57, 0.7, 1.0);
uniform float speed : hint_range(0.0, 4.0) = 1.2;

${PROP}
${FRES}
void fragment() {
\tfloat r = length(p3.xz);
\tfloat w = 0.5 + 0.5 * sin(r * 14.0 - TIME * speed * 3.0) * sin(p3.y * 9.0 + TIME * speed);
\tALBEDO = base.rgb * 0.5;
\tEMISSION = glow.rgb * (0.4 + 1.4 * w * w + fresnel(NORMAL, VIEW, 2.0) * 1.5);
\tROUGHNESS = 0.1;
}
`,
    'Lifeguard': `shader_type spatial;

uniform vec4 orange : source_color = vec4(0.98, 0.45, 0.09, 1.0);
uniform vec4 band : source_color = vec4(0.05, 0.52, 0.78, 1.0);
uniform float bands : hint_range(1.0, 8.0) = 4.0;

${PROP}
void fragment() {
\tfloat a = atan(p3.z, p3.x) / TAU + 0.5;
\tALBEDO = mix(orange.rgb, band.rgb, step(0.5, fract(a * bands)));
\tfloat grain = fract(sin(dot(floor(UV * 300.0), vec2(12.9898, 78.233))) * 43758.5453);
\tROUGHNESS = 0.55 + grain * 0.1;
}
`,
    'Deep End': `shader_type spatial;

uniform vec4 surface : source_color = vec4(0.05, 0.65, 0.91, 1.0);
uniform vec4 depth : source_color = vec4(0.01, 0.13, 0.33, 1.0);
uniform float wave : hint_range(0.0, 0.2) = 0.05;
uniform float speed : hint_range(0.0, 4.0) = 1.0;

varying vec3 p3;

void vertex() {
\tVERTEX += NORMAL * (sin(VERTEX.x * 4.0 + TIME * speed) + cos(VERTEX.z * 5.0 + TIME * speed * 1.3)) * wave;
\tp3 = VERTEX;
}

${FRES}
void fragment() {
\tfloat f = fresnel(NORMAL, VIEW, 2.5);
\tfloat sparkle = pow(max(0.0, sin(p3.x * 18.0 + TIME * 2.0) * sin(p3.z * 16.0 - TIME * 1.6)), 24.0);
\tALBEDO = mix(depth.rgb, surface.rgb, f);
\tEMISSION = vec3(0.9, 0.95, 1.0) * sparkle * 0.8 + surface.rgb * f * 0.3;
\tROUGHNESS = 0.05;
\tMETALLIC = 0.1;
}
`,
    'Bubble Sky': `shader_type spatial;
render_mode cull_disabled;

uniform vec4 tint : source_color = vec4(0.37, 0.78, 1.0, 1.0);
uniform float film : hint_range(0.0, 3.0) = 1.2;
uniform float clarity : hint_range(0.0, 1.0) = 0.75;

void fragment() {
\tfloat f = 1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0);
\tvec3 rainbow = 0.5 + 0.5 * cos(TAU * (fract(f * film + TIME * 0.05) + vec3(0.0, 0.33, 0.67)));
\tALBEDO = mix(tint.rgb, rainbow, f);
\tEMISSION = rainbow * pow(f, 3.0) * 0.6;
\tALPHA = mix(1.0 - clarity, 1.0, pow(f, 1.5));
\tROUGHNESS = 0.02;
}
`,
    'Vista Aurora': `shader_type spatial;

uniform vec4 color_one : source_color = vec4(0.13, 0.83, 0.93, 1.0);
uniform vec4 color_two : source_color = vec4(0.3, 0.9, 0.5, 1.0);
uniform float speed : hint_range(0.0, 2.0) = 0.4;

${PROP}
void fragment() {
\tfloat band = sin(p3.y * 3.0 + sin(p3.x * 2.0 + TIME * speed) * 1.5 + TIME * speed * 1.7);
\tALBEDO = vec3(0.02, 0.15, 0.2);
\tEMISSION = mix(color_one.rgb, color_two.rgb, 0.5 + 0.5 * sin(p3.x + TIME * speed)) * smoothstep(0.2, 1.0, band) * 1.6;
\tROUGHNESS = 0.3;
}
`,
};
// attach each shader to its look
COLLECTIONS.forEach((c) => c.presets.forEach((p) => { if (SHADERS[p.name]) p.shader = SHADERS[p.name]; }));

/* ---------- 17 more styles each for Frutiger Aero and Poolside ----------
   Most are Godot shaders made from the templates below (each template is an ordinary .gdshader with its own
   uniforms, so every style still gets sliders and color pickers, and downloads as a file Godot can use).
   Poolside keeps to cyan / blue and orange. */
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(', '); };
const col = (name, hex) => 'uniform vec4 ' + name + ' : source_color = vec4(' + rgb(hex) + ', 1.0);';
const T = {
    // light ripples dancing over a surface (optionally on tiles)
    caustic: (water, deep, tiles, scale) => `shader_type spatial;

${col('water', water)}
${col('deep', deep)}
uniform float tiles : hint_range(0.0, 40.0) = ${tiles.toFixed(1)};
uniform float scale : hint_range(1.0, 12.0) = ${scale.toFixed(1)};
uniform float speed : hint_range(0.0, 3.0) = 0.8;

${PROP}
float caustic(vec2 p, float t) {
\tvec2 q = p;
\tfloat c = 0.0;
\tfor (int i = 0; i < 4; i++) {
\t\tq += vec2(sin(q.y * 1.7 + t * (1.0 + float(i) * 0.3)), cos(q.x * 1.3 - t * (0.8 + float(i) * 0.2))) * 0.6;
\t\tc += 1.0 / (1.0 + 18.0 * abs(sin(q.x + q.y)));
\t}
\treturn c / 4.0;
}

void fragment() {
\tfloat c = caustic((p3.xz + p3.y * 0.5) * scale, TIME * speed);
\tvec3 base = mix(deep.rgb, water.rgb, 0.5 + 0.5 * c);
\tif (tiles > 0.5) {
\t\tvec2 g = abs(fract(UV * tiles) - 0.5);
\t\tbase = mix(base, vec3(0.93, 0.98, 1.0), smoothstep(0.44, 0.47, max(g.x, g.y)) * 0.7);
\t}
\tALBEDO = base;
\tEMISSION = water.rgb * pow(c, 3.0) * 0.7;
\tROUGHNESS = 0.1;
}
`,
    // two colors in bands (around the object, or along it), glossy, with an optional rim light
    stripes: (one, two, count, around, rim, rough) => `shader_type spatial;

${col('color_one', one)}
${col('color_two', two)}
${col('rim_color', rim)}
uniform float stripes : hint_range(1.0, 30.0) = ${count.toFixed(1)};
uniform float softness : hint_range(0.0, 0.5) = 0.04;
uniform float rim_strength : hint_range(0.0, 2.0) = 0.6;

${PROP}
${FRES}
void fragment() {
\tfloat t = ${around ? 'atan(p3.z, p3.x) / TAU + 0.5' : 'UV.x'};
\tfloat s = smoothstep(0.5 - softness, 0.5 + softness, fract(t * stripes));
\tALBEDO = mix(color_one.rgb, color_two.rgb, s);
\tEMISSION = rim_color.rgb * fresnel(NORMAL, VIEW, 3.0) * rim_strength;
\tROUGHNESS = ${rough.toFixed(2)};
}
`,
    // a surface that moves like water
    waves: (surface, depth, wave) => SHADERS['Deep End'].replace('vec4(0.05, 0.65, 0.91, 1.0)', 'vec4(' + rgb(surface) + ', 1.0)').replace('vec4(0.01, 0.13, 0.33, 1.0)', 'vec4(' + rgb(depth) + ', 1.0)').replace('= 0.05;', '= ' + wave.toFixed(2) + ';'),
    // glossy gel: a bright highlight across the top, a soft inner glow at the edges (Aero buttons)
    gel: (color, glow) => `shader_type spatial;

${col('gel', color)}
${col('glow', glow)}
uniform float shine : hint_range(0.0, 2.0) = 1.0;
uniform float edge_glow : hint_range(0.0, 2.0) = 0.8;

${FRES}
void fragment() {
\tvec3 n = (INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz;
\tfloat top = smoothstep(0.35, 0.75, n.y);
\tALBEDO = mix(gel.rgb, vec3(1.0), top * 0.45 * shine);
\tEMISSION = glow.rgb * fresnel(NORMAL, VIEW, 2.5) * edge_glow;
\tROUGHNESS = 0.06;
\tCLEARCOAT = 1.0;
}
`,
    // a color fade from the top of the object to the bottom
    gradient: (top, bottom, rough, glow) => `shader_type spatial;

${col('top_color', top)}
${col('bottom_color', bottom)}
uniform float height : hint_range(0.5, 6.0) = 2.0;
uniform float glow : hint_range(0.0, 2.0) = ${glow.toFixed(2)};

${PROP}
void fragment() {
\tfloat y = clamp(p3.y / height + 0.5, 0.0, 1.0);
\tvec3 c = mix(bottom_color.rgb, top_color.rgb, smoothstep(0.0, 1.0, y));
\tALBEDO = c;
\tEMISSION = c * glow;
\tROUGHNESS = ${rough.toFixed(2)};
}
`,
    // pie segments around the object (a beach ball)
    segments: (a, b, c, n) => `shader_type spatial;

${col('color_one', a)}
${col('color_two', b)}
${col('color_three', c)}
uniform float segments : hint_range(3.0, 12.0) = ${n.toFixed(1)};

${PROP}
void fragment() {
\tfloat k = floor((atan(p3.z, p3.x) / TAU + 0.5) * segments);
\tfloat m = mod(k, 3.0);
\tvec3 c = m < 0.5 ? color_one.rgb : (m < 1.5 ? color_two.rgb : color_three.rgb);
\tfloat cap = smoothstep(0.82, 0.86, abs(normalize(p3).y));
\tALBEDO = mix(c, vec3(1.0), cap);
\tROUGHNESS = 0.25;
}
`,
    // little square tiles in two colors
    checker: (a, b, cells) => `shader_type spatial;

${col('color_one', a)}
${col('color_two', b)}
uniform float cells : hint_range(2.0, 60.0) = ${cells.toFixed(1)};

void fragment() {
\tvec2 c = floor(UV * cells);
\tfloat k = mod(c.x + c.y, 2.0);
\tfloat jitter = fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453) * 0.15;
\tvec2 g = abs(fract(UV * cells) - 0.5);
\tfloat line = smoothstep(0.42, 0.47, max(g.x, g.y));
\tALBEDO = mix(mix(color_one.rgb, color_two.rgb, k) * (0.92 + jitter), vec3(0.9, 0.96, 1.0), line * 0.6);
\tROUGHNESS = 0.15;
}
`,
    // soft clouds drifting across a sky
    clouds: (sky, cloud, speed) => `shader_type spatial;

${col('sky', sky)}
${col('cloud', cloud)}
uniform float speed : hint_range(0.0, 1.0) = ${speed.toFixed(2)};
uniform float cover : hint_range(0.0, 1.0) = 0.5;

${PROP}
${NOISE3}
void fragment() {
\tvec3 q = p3 * 1.6 + vec3(TIME * speed, 0.0, TIME * speed * 0.4);
\tfloat n = noise3(q) * 0.55 + noise3(q * 2.2) * 0.3 + noise3(q * 4.7) * 0.15;
\tfloat c = smoothstep(1.0 - cover - 0.15, 1.0 - cover + 0.2, n);
\tALBEDO = mix(sky.rgb, cloud.rgb, c);
\tEMISSION = mix(sky.rgb * 0.15, cloud.rgb * 0.35, c);
\tROUGHNESS = 0.6;
}
`,
    // twinkling points of light over a base color
    sparkle: (base, spark, density) => `shader_type spatial;

${col('base', base)}
${col('spark', spark)}
uniform float density : hint_range(10.0, 200.0) = ${density.toFixed(1)};
uniform float twinkle : hint_range(0.0, 6.0) = 2.0;

${PROP}
${NOISE3}
void fragment() {
\tvec3 cell = floor(p3 * density * 0.1);
\tfloat h = hash3(cell);
\tfloat on = step(0.93, h) * (0.5 + 0.5 * sin(TIME * twinkle + h * 40.0));
\tALBEDO = base.rgb;
\tEMISSION = spark.rgb * on * 3.0;
\tROUGHNESS = 0.2;
\tMETALLIC = 0.3;
}
`,
    // swirls of two colors (a Windows wallpaper)
    swirl: (a, b, speed) => `shader_type spatial;

${col('color_one', a)}
${col('color_two', b)}
uniform float twist : hint_range(0.0, 8.0) = 3.0;
uniform float speed : hint_range(0.0, 1.0) = ${speed.toFixed(2)};

${PROP}
void fragment() {
\tfloat r = length(p3.xz);
\tfloat a = atan(p3.z, p3.x) + r * twist - TIME * speed;
\tfloat s = 0.5 + 0.5 * sin(a * 3.0 + p3.y * 2.0);
\tALBEDO = mix(color_one.rgb, color_two.rgb, s);
\tEMISSION = mix(color_one.rgb, color_two.rgb, s) * 0.25;
\tROUGHNESS = 0.1;
}
`,
    // glowing lines like light on a night pool
    glowlines: (base, line, speed) => `shader_type spatial;

${col('base', base)}
${col('line_color', line)}
uniform float speed : hint_range(0.0, 3.0) = ${speed.toFixed(2)};
uniform float width : hint_range(4.0, 60.0) = 22.0;

${PROP}
void fragment() {
\tvec2 q = p3.xz * 3.0 + p3.y;
\tq += vec2(sin(q.y * 1.3 + TIME * speed), cos(q.x * 1.1 - TIME * speed * 0.8)) * 0.7;
\tfloat l = 1.0 / (1.0 + width * abs(sin(q.x + q.y)));
\tALBEDO = base.rgb;
\tEMISSION = line_color.rgb * l * 2.0;
\tROUGHNESS = 0.15;
}
`,
    // rays fanning out from the top (sunbeams)
    rays: (a, b) => `shader_type spatial;
render_mode unshaded;

${col('light_color', a)}
${col('sky', b)}
uniform float rays : hint_range(4.0, 40.0) = 14.0;
uniform float speed : hint_range(0.0, 1.0) = 0.15;

${PROP}
void fragment() {
\tfloat a = atan(p3.x, p3.y - 1.5);
\tfloat r = 0.5 + 0.5 * sin(a * rays + TIME * speed * 6.0);
\tfloat up = clamp(p3.y * 0.4 + 0.5, 0.0, 1.0);
\tALBEDO = mix(sky.rgb, light_color.rgb, r * up) * (0.85 + 0.3 * up);
}
`,
    // a rainbow ring at the edges (a lens flare)
    rim: (base, strength) => `shader_type spatial;

${col('base', base)}
uniform float strength : hint_range(0.0, 3.0) = ${strength.toFixed(2)};
uniform float spread : hint_range(0.5, 6.0) = 2.0;

${FRES}
void fragment() {
\tfloat f = fresnel(NORMAL, VIEW, spread);
\tvec3 rainbow = 0.5 + 0.5 * cos(TAU * (f * 1.5 + vec3(0.0, 0.33, 0.67)));
\tALBEDO = base.rgb;
\tEMISSION = rainbow * f * strength;
\tROUGHNESS = 0.03;
}
`,
    // soft foam ridges along the length (a pool noodle)
    ridges: (color, count) => `shader_type spatial;

${col('foam', color)}
uniform float ridges : hint_range(2.0, 24.0) = ${count.toFixed(1)};

${PROP}
void fragment() {
\tfloat a = atan(p3.z, p3.x) / TAU + 0.5;
\tfloat r = 0.5 + 0.5 * cos(a * ridges * TAU);
\tALBEDO = foam.rgb * (0.78 + 0.22 * r);
\tROUGHNESS = 0.75 - 0.25 * r;
}
`
};
// world / light / fx for a style's preview only (the look of the little ball behind it)
const AW = (bg, bg2) => W({ bg, bg2, envStrength: 1.3, ambient: 0.4 });
const AF = (o) => FX(Object.assign({ bloom: true, bloomStrength: 0.4, saturation: 1.12, exposure: 1.08 }, o || {}));
const ADD = {
    aero: [
        { name: 'Aqua Button', mat: M({ color: '#1e90ff', roughness: 0.05, clearcoat: 1 }), shader: T.gel('#1e90ff', '#9be7ff'), world: AW('#6cc8ff', '#eef9ff'), light: '#ffffff', fx: AF() },
        { name: 'Sky Orb', mat: M({ color: '#7cc8ff', roughness: 0.4 }), shader: T.clouds('#3ea6ff', '#ffffff', 0.08), world: AW('#4fb4ff', '#e6f6ff'), light: '#ffffff', fx: AF() },
        { name: 'Cloud Puff', mat: M({ color: '#ffffff', roughness: 0.8 }), shader: T.clouds('#cfeeff', '#ffffff', 0.04).replace('= 0.5;', '= 0.8;'), world: AW('#8fd3ff', '#ffffff'), light: '#ffffff', fx: AF({ exposure: 1.15 }) },
        { name: 'Leaf Green', mat: M({ color: '#4ade80', roughness: 0.08, clearcoat: 1 }), shader: T.gel('#22c55e', '#d9ffb0'), world: AW('#86efac', '#f0fff4'), light: '#fbfff0', fx: AF() },
        { name: 'Grass Field', mat: M({ color: '#65d26e', roughness: 0.6 }), shader: T.stripes('#3fbf4a', '#8be36f', 24, true, '#e8ffd0', 0.55), world: AW('#7dd3fc', '#d9f99d'), light: '#fffbe6', fx: AF({ bloom: false }) },
        { name: 'Dew Drop', mat: M({ color: '#f0fbff', roughness: 0, clearcoat: 1, transmission: 1, thickness: 1.5, ior: 1.33 }), world: AW('#9fe2ff', '#ffffff'), light: '#ffffff', fx: AF({ exposure: 1.15 }) },
        { name: 'Glass Panel', mat: M({ color: '#e0f4ff', roughness: 0.3, transmission: 0.95, thickness: 0.6 }), world: AW('#a5dcff', '#f5fbff'), light: '#ffffff', fx: AF({ bloom: false }) },
        { name: 'Chrome Orb', mat: M({ color: '#dff3ff', metalness: 1, roughness: 0.04 }), world: AW('#5bbcff', '#ffffff'), light: '#ffffff', fx: AF({ bloomStrength: 0.3 }) },
        { name: 'Sunbeam', mat: M({ color: '#fff7c2', roughness: 0.5 }), shader: T.rays('#fffbe0', '#7cc8ff'), world: AW('#7cc8ff', '#fff8dc'), light: '#fff8e1', fx: AF({ bloomStrength: 0.6 }) },
        { name: 'Lens Flare', mat: M({ color: '#cdeeff', roughness: 0.03, clearcoat: 1 }), shader: T.rim('#2a9df4', 1.6), world: AW('#1e6fd6', '#bfe8ff'), light: '#ffffff', fx: AF({ bloomStrength: 0.7 }) },
        { name: 'Ocean Wave', mat: M({ color: '#14b8c4', roughness: 0.05, clearcoat: 1 }), shader: T.waves('#2ad1d9', '#035e8f', 0.07), world: AW('#38bdf8', '#e0faff'), light: '#ffffff', fx: AF() },
        { name: 'Fish Tank', mat: M({ color: '#2dd4bf', roughness: 0.1 }), shader: T.caustic('#5eead4', '#0f766e', 0, 4), world: AW('#14b8a6', '#ccfbf1'), light: '#f0fffd', fx: AF() },
        { name: 'Vista Glow', mat: M({ color: '#0e7490', roughness: 0.25, clearcoat: 1 }), shader: SHADERS['Vista Aurora'].replace('vec4(0.3, 0.9, 0.5, 1.0)', 'vec4(0.6, 1.0, 0.35, 1.0)'), world: W({ bg: '#021c2b', bg2: '#0b5f74', envStrength: 0.9, ambient: 0.15 }), light: '#a5f3fc', fx: AF({ bloomStrength: 0.9, bloomThreshold: 0.6, vignette: 0.3 }) },
        { name: 'Lime Gel', mat: M({ color: '#c5ff11', roughness: 0.06, clearcoat: 1 }), shader: T.gel('#a3e635', '#f4ffc0'), world: AW('#9be15d', '#f7ffe8'), light: '#fbfff0', fx: AF() },
        { name: 'Wallpaper Swirl', mat: M({ color: '#38bdf8', roughness: 0.1, clearcoat: 1 }), shader: T.swirl('#0ea5e9', '#4ade80', 0.1), world: AW('#0284c7', '#a7f3d0'), light: '#ffffff', fx: AF() },
        { name: 'Bokeh Lights', mat: M({ color: '#0c4a6e', roughness: 0.2 }), shader: T.sparkle('#0b3d63', '#bdf4ff', 120), world: W({ bg: '#082f49', bg2: '#0e7490', envStrength: 0.9, ambient: 0.15 }), light: '#e0f7ff', fx: AF({ bloomStrength: 0.9, bloomThreshold: 0.5 }) },
        { name: 'Pearl', mat: M({ color: '#f8fbff', roughness: 0.15, clearcoat: 1, iridescence: 1, sheen: 0.5 }), world: AW('#c7e9ff', '#ffffff'), light: '#ffffff', fx: AF({ bloomStrength: 0.3 }) }
    ],
    pool: [
        { name: 'Splash', mat: M({ color: '#22d3ee', roughness: 0.05, clearcoat: 1 }), shader: T.waves('#5ee7ff', '#0369a1', 0.1), world: AW('#38bdf8', '#e0f8ff'), light: '#fff3e0', fx: AF() },
        { name: 'Inflatable Ring', mat: M({ color: '#fb923c', roughness: 0.15, clearcoat: 1 }), shader: T.stripes('#f97316', '#22d3ee', 8, true, '#fed7aa', 0.15), world: AW('#0ea5e9', '#bff0ff'), light: '#fff3e0', fx: AF() },
        { name: 'Beach Ball', mat: M({ color: '#f97316', roughness: 0.25 }), shader: T.segments('#f97316', '#06b6d4', '#2563eb', 6), world: AW('#38bdf8', '#fde3c8'), light: '#fff3e0', fx: AF({ bloom: false }) },
        { name: 'Diving Board', mat: M({ color: '#1d4ed8', roughness: 0.65 }), world: AW('#0ea5e9', '#e0f2fe'), light: '#fff7ed', fx: AF({ bloom: false }) },
        { name: 'Pool Noodle', mat: M({ color: '#fb923c', roughness: 0.6 }), shader: T.ridges('#fb923c', 10), world: AW('#22d3ee', '#ecfeff'), light: '#fff7ed', fx: AF({ bloom: false }) },
        { name: 'Sun Lounger', mat: M({ color: '#0ea5e9', roughness: 0.5 }), shader: T.stripes('#0284c7', '#fdba74', 6, false, '#bae6fd', 0.45), world: AW('#7dd3fc', '#ffedd5'), light: '#fff3e0', fx: AF({ bloom: false }) },
        { name: 'Tile Mosaic', mat: M({ color: '#22d3ee', roughness: 0.15 }), shader: T.checker('#06b6d4', '#2563eb', 24), world: AW('#38bdf8', '#e0f8ff'), light: '#ffffff', fx: AF({ bloom: false }) },
        { name: 'Ripple Floor', mat: M({ color: '#0284c7', roughness: 0.1 }), shader: T.caustic('#67e8f9', '#1e3a8a', 0, 3), world: AW('#0369a1', '#7dd3fc'), light: '#e0f7ff', fx: AF() },
        { name: 'Orange Soda', mat: M({ color: '#fb923c', roughness: 0.04, clearcoat: 1, transmission: 0.75, thickness: 1.4 }), world: AW('#38bdf8', '#ffedd5'), light: '#fff7ed', fx: AF() },
        { name: 'Cyan Glass', mat: M({ color: '#67e8f9', roughness: 0.02, clearcoat: 1, transmission: 0.95, thickness: 1.2 }), world: AW('#0ea5e9', '#ecfeff'), light: '#ffffff', fx: AF() },
        { name: 'Lane Rope', mat: M({ color: '#f97316', roughness: 0.35 }), shader: T.stripes('#f97316', '#1d4ed8', 12, false, '#7dd3fc', 0.35), world: AW('#0ea5e9', '#cff6ff'), light: '#fff3e0', fx: AF({ bloom: false }) },
        { name: 'Water Slide', mat: M({ color: '#0ea5e9', roughness: 0.04, clearcoat: 1 }), shader: T.gradient('#22d3ee', '#1d4ed8', 0.05, 0.15), world: AW('#38bdf8', '#fde7cf'), light: '#fff7ed', fx: AF() },
        { name: 'Sunset Water', mat: M({ color: '#38bdf8', roughness: 0.08 }), shader: T.caustic('#fdba74', '#0369a1', 0, 3.5), world: W({ bg: '#0c4a6e', bg2: '#fb923c', envStrength: 1.1, ambient: 0.3 }), light: '#ffd8a8', fx: AF({ tint: '#fb923c', tintAmount: 0.06 }) },
        { name: 'Wet Concrete', mat: M({ color: '#7aa6c2', roughness: 0.3, clearcoat: 0.8 }), world: AW('#7dd3fc', '#e0f2fe'), light: '#fff7ed', fx: AF({ bloom: false, saturation: 1 }) },
        { name: 'Sparkle Surface', mat: M({ color: '#0ea5e9', roughness: 0.15 }), shader: T.sparkle('#0284c7', '#fed7aa', 90), world: AW('#0369a1', '#7dd3fc'), light: '#fff3e0', fx: AF({ bloomStrength: 0.7, bloomThreshold: 0.6 }) },
        { name: 'Popsicle', mat: M({ color: '#fb923c', roughness: 0.12, clearcoat: 1 }), shader: T.gradient('#fb923c', '#06b6d4', 0.12, 0.1), world: AW('#7dd3fc', '#fff1e0'), light: '#fff7ed', fx: AF() },
        { name: 'Night Swim', mat: M({ color: '#0c1e3a', roughness: 0.2 }), shader: T.glowlines('#071a33', '#22d3ee', 0.7), world: W({ bg: '#020617', bg2: '#0c4a6e', envStrength: 0.7, ambient: 0.1 }), light: '#67e8f9', fx: AF({ bloomStrength: 0.9, bloomThreshold: 0.5, vignette: 0.35 }) }
    ]
};
COLLECTIONS.forEach((c) => { (ADD[c.id] || []).forEach((p) => c.presets.push(p)); });
