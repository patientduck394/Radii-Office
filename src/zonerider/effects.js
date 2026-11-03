/* =====================================================================
   Zonerider effect presets: 10 collections of 5 looks each!
   A preset sets the selected objects' MATERIAL and the scene's LOOK (sky, mist, reflections, light color)
   and its screen EFFECTS (glow, exposure, color grading, vignette), all in one click.

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
    ] },
    { id: 'metal', name: 'Chrome & Metal', presets: [
        { name: 'Mirror Chrome', mat: M({ color: '#f1f5f9', metalness: 1, roughness: 0.03 }), world: W({ bg: '#1e293b', bg2: '#94a3b8', envStrength: 1.4, ambient: 0.2 }), light: '#ffffff', fx: FX({ bloom: true, bloomStrength: 0.3, bloomThreshold: 0.9, contrast: 1.1 }) },
        { name: 'Brushed Steel', mat: M({ color: '#cbd5e1', metalness: 1, roughness: 0.35 }), world: W({ bg: '#334155', bg2: '#64748b', ambient: 0.25 }), light: '#e2e8f0', fx: FX({ contrast: 1.05, saturation: 0.9 }) },
        { name: 'Gold', mat: M({ color: '#ffcf5a', metalness: 1, roughness: 0.18 }), world: W({ bg: '#1c1917', bg2: '#57534e', envStrength: 1.3, ambient: 0.2 }), light: '#fff1d6', fx: FX({ bloom: true, bloomStrength: 0.35, bloomThreshold: 0.85, saturation: 1.1, vignette: 0.25 }) },
        { name: 'Copper', mat: M({ color: '#e8885a', metalness: 1, roughness: 0.25 }), world: W({ bg: '#292524', bg2: '#78716c', ambient: 0.2 }), light: '#ffe4d1', fx: FX({ saturation: 1.1, tint: '#f97316', tintAmount: 0.05 }) },
        { name: 'Gunmetal', mat: M({ color: '#4b5563', metalness: 1, roughness: 0.3, clearcoat: 0.6 }), world: W({ bg: '#0f172a', bg2: '#1f2937', ambient: 0.2 }), light: '#cbd5e1', fx: FX({ contrast: 1.15, saturation: 0.85, vignette: 0.35 }) }
    ] },
    { id: 'neon', name: 'Neon Night', presets: [
        { name: 'Pink Neon', mat: M({ color: '#2a0a1f', roughness: 0.3, emissive: '#ff2d95', emissiveIntensity: 1.6 }), world: W({ bg: '#07020d', bg2: '#1e0b2e', env: false, ambient: 0.05 }), light: '#ff5fb0', fx: FX({ bloom: true, bloomStrength: 1.6, bloomThreshold: 0.3, saturation: 1.25, vignette: 0.45 }) },
        { name: 'Cyan Neon', mat: M({ color: '#031c24', roughness: 0.3, emissive: '#00e5ff', emissiveIntensity: 1.6 }), world: W({ bg: '#02060d', bg2: '#082032', env: false, ambient: 0.05 }), light: '#5ff6ff', fx: FX({ bloom: true, bloomStrength: 1.6, bloomThreshold: 0.3, saturation: 1.25, vignette: 0.45 }) },
        { name: 'Purple Haze', mat: M({ color: '#3b0764', roughness: 0.2, clearcoat: 1, emissive: '#a855f7', emissiveIntensity: 1.2 }), world: W({ bg: '#12001f', bg2: '#4c1d95', env: false, ambient: 0.1, fog: true, fogColor: '#2e1065', fogDensity: 0.05 }), light: '#c084fc', fx: FX({ bloom: true, bloomStrength: 1.2, bloomThreshold: 0.45, saturation: 1.2, vignette: 0.4 }) },
        { name: 'Laser Lime', mat: M({ color: '#0b1400', roughness: 0.25, emissive: '#c5ff11', emissiveIntensity: 1.5 }), world: W({ bg: '#030502', bg2: '#11200a', env: false, ambient: 0.05 }), light: '#d9ff6b', fx: FX({ bloom: true, bloomStrength: 1.5, bloomThreshold: 0.35, saturation: 1.2, vignette: 0.45 }) },
        { name: 'Arcade', mat: M({ color: '#1e1b4b', roughness: 0.15, clearcoat: 1, iridescence: 1 }), world: W({ bg: '#0b0820', bg2: '#312e81', envStrength: 0.9, ambient: 0.1 }), light: '#f472b6', fx: FX({ bloom: true, bloomStrength: 0.9, bloomThreshold: 0.5, saturation: 1.3, contrast: 1.1, vignette: 0.35 }) }
    ] },
    { id: 'glass', name: 'Glass & Crystal', presets: [
        { name: 'Clear Glass', mat: M({ color: '#ffffff', roughness: 0, transmission: 1, thickness: 1, ior: 1.5, clearcoat: 1 }), world: W({ bg: '#e2e8f0', bg2: '#ffffff', envStrength: 1.4, ambient: 0.4 }), light: '#ffffff', fx: FX({ exposure: 1.1 }) },
        { name: 'Frosted Glass', mat: M({ color: '#f1f5f9', roughness: 0.45, transmission: 1, thickness: 1.2 }), world: W({ bg: '#cbd5e1', bg2: '#f8fafc', ambient: 0.4 }), light: '#ffffff', fx: FX({ exposure: 1.05, saturation: 0.95 }) },
        { name: 'Ruby', mat: M({ color: '#e11d48', roughness: 0.02, transmission: 0.9, thickness: 1.5, ior: 1.77, clearcoat: 1 }), world: W({ bg: '#1c0a10', bg2: '#4c0519', envStrength: 1.3, ambient: 0.15 }), light: '#ffe4e6', fx: FX({ bloom: true, bloomStrength: 0.5, bloomThreshold: 0.75, saturation: 1.2, vignette: 0.3 }) },
        { name: 'Sapphire', mat: M({ color: '#2563eb', roughness: 0.02, transmission: 0.9, thickness: 1.5, ior: 1.77, clearcoat: 1 }), world: W({ bg: '#0a1128', bg2: '#1e3a8a', envStrength: 1.3, ambient: 0.15 }), light: '#dbeafe', fx: FX({ bloom: true, bloomStrength: 0.5, bloomThreshold: 0.75, saturation: 1.2, vignette: 0.3 }) },
        { name: 'Emerald', mat: M({ color: '#10b981', roughness: 0.02, transmission: 0.9, thickness: 1.5, ior: 1.58, clearcoat: 1 }), world: W({ bg: '#03140d', bg2: '#065f46', envStrength: 1.3, ambient: 0.15 }), light: '#d1fae5', fx: FX({ bloom: true, bloomStrength: 0.5, bloomThreshold: 0.75, saturation: 1.2, vignette: 0.3 }) }
    ] },
    { id: 'pastel', name: 'Pastel Toy', presets: [
        { name: 'Bubblegum', mat: M({ color: '#f9a8d4', roughness: 0.35, clearcoat: 0.6 }), world: W({ bg: '#fce7f3', bg2: '#fff7fb', ambient: 0.55 }), light: '#fff1f7', fx: FX({ exposure: 1.1, saturation: 1.05 }) },
        { name: 'Mint', mat: M({ color: '#99f6e4', roughness: 0.35, clearcoat: 0.6 }), world: W({ bg: '#ccfbf1', bg2: '#f0fdfa', ambient: 0.55 }), light: '#f0fdfa', fx: FX({ exposure: 1.1 }) },
        { name: 'Lavender', mat: M({ color: '#c4b5fd', roughness: 0.35, clearcoat: 0.6 }), world: W({ bg: '#ede9fe', bg2: '#faf5ff', ambient: 0.55 }), light: '#f5f3ff', fx: FX({ exposure: 1.1 }) },
        { name: 'Peach', mat: M({ color: '#fdba74', roughness: 0.4, sheen: 1 }), world: W({ bg: '#ffedd5', bg2: '#fff7ed', ambient: 0.55 }), light: '#fff7ed', fx: FX({ exposure: 1.1 }) },
        { name: 'Butter', mat: M({ color: '#fde68a', roughness: 0.4, clearcoat: 0.4 }), world: W({ bg: '#fef9c3', bg2: '#fffbeb', ambient: 0.55 }), light: '#fffbeb', fx: FX({ exposure: 1.1 }) }
    ] },
    { id: 'nature', name: 'Nature', presets: [
        { name: 'Moss', mat: M({ color: '#4d7c0f', roughness: 0.95, sheen: 1 }), world: W({ bg: '#bef264', bg2: '#ecfccb', ambient: 0.35, fog: true, fogColor: '#d9f99d', fogDensity: 0.02 }), light: '#fefce8', fx: FX({ saturation: 1.05, tint: '#65a30d', tintAmount: 0.05 }) },
        { name: 'Stone', mat: M({ color: '#a8a29e', roughness: 0.9 }), world: W({ bg: '#d6d3d1', bg2: '#f5f5f4', ambient: 0.4 }), light: '#fafaf9', fx: FX({ saturation: 0.85, contrast: 1.05 }) },
        { name: 'Sand Dune', mat: M({ color: '#e7c38a', roughness: 0.95 }), world: W({ bg: '#fbbf24', bg2: '#fef3c7', ambient: 0.4, fog: true, fogColor: '#fde68a', fogDensity: 0.03 }), light: '#fff3d6', fx: FX({ exposure: 1.1, tint: '#f59e0b', tintAmount: 0.08 }) },
        { name: 'Ocean', mat: M({ color: '#0e7490', roughness: 0.05, clearcoat: 1, transmission: 0.3, thickness: 2 }), world: W({ bg: '#0284c7', bg2: '#bae6fd', ambient: 0.35 }), light: '#e0f2fe', fx: FX({ saturation: 1.1 }) },
        { name: 'Autumn Leaf', mat: M({ color: '#c2410c', roughness: 0.7, sheen: 0.6 }), world: W({ bg: '#fdba74', bg2: '#fff7ed', ambient: 0.35 }), light: '#ffedd5', fx: FX({ saturation: 1.15, tint: '#ea580c', tintAmount: 0.08, vignette: 0.2 }) }
    ] },
    { id: 'studio', name: 'Studio Product', presets: [
        { name: 'White Studio', mat: M({ color: '#f8fafc', roughness: 0.35, clearcoat: 0.5 }), world: W({ bg: '#ffffff', bg2: '#e2e8f0', envStrength: 1.2, ambient: 0.5 }), light: '#ffffff', fx: FX({ exposure: 1.15, contrast: 1.05 }) },
        { name: 'Black Studio', mat: M({ color: '#111827', roughness: 0.2, clearcoat: 1 }), world: W({ bg: '#0b0b0d', bg2: '#27272a', envStrength: 1.1, ambient: 0.1 }), light: '#ffffff', fx: FX({ contrast: 1.15, vignette: 0.4 }) },
        { name: 'Clay Render', mat: M({ color: '#d6c7b8', roughness: 1 }), world: W({ bg: '#e7e5e4', bg2: '#fafaf9', env: false, ambient: 0.6 }), light: '#ffffff', fx: FX({ saturation: 0.8 }) },
        { name: 'Matte Plastic', mat: M({ color: '#ef4444', roughness: 0.7 }), world: W({ bg: '#f1f5f9', bg2: '#ffffff', ambient: 0.45 }), light: '#ffffff', fx: FX({ exposure: 1.05 }) },
        { name: 'Glossy Plastic', mat: M({ color: '#3b82f6', roughness: 0.12, clearcoat: 1 }), world: W({ bg: '#e0f2fe', bg2: '#ffffff', envStrength: 1.3, ambient: 0.4 }), light: '#ffffff', fx: FX({ bloom: true, bloomStrength: 0.25, bloomThreshold: 0.9, exposure: 1.05, saturation: 1.1 }) }
    ] },
    { id: 'vapor', name: 'Vaporwave', presets: [
        { name: 'Vapor Sunset', mat: M({ color: '#f472b6', roughness: 0.2, clearcoat: 1, iridescence: 0.6 }), world: W({ bg: '#3b0764', bg2: '#fb7185', ambient: 0.3 }), light: '#fbcfe8', fx: FX({ bloom: true, bloomStrength: 0.7, bloomThreshold: 0.6, saturation: 1.25, tint: '#c026d3', tintAmount: 0.1, vignette: 0.3 }) },
        { name: 'Marble Bust', mat: M({ color: '#f5f5f4', roughness: 0.25, clearcoat: 0.8, transmission: 0.12, thickness: 1 }), world: W({ bg: '#67e8f9', bg2: '#f0abfc', ambient: 0.4 }), light: '#fdf4ff', fx: FX({ saturation: 1.15, exposure: 1.05 }) },
        { name: 'Grid Glow', mat: M({ color: '#1e1b4b', roughness: 0.3, emissive: '#e879f9', emissiveIntensity: 1.6 }), world: W({ bg: '#0f0326', bg2: '#581c87', env: false, ambient: 0.1 }), light: '#22d3ee', fx: FX({ bloom: true, bloomStrength: 1.3, bloomThreshold: 0.4, saturation: 1.3, vignette: 0.4 }) },
        { name: 'Teal & Pink', mat: M({ color: '#2dd4bf', roughness: 0.2, clearcoat: 1 }), world: W({ bg: '#f9a8d4', bg2: '#99f6e4', ambient: 0.4 }), light: '#fdf2f8', fx: FX({ saturation: 1.2 }) },
        { name: 'CRT Green', mat: M({ color: '#022c22', roughness: 0.4, emissive: '#4ade80', emissiveIntensity: 1.4 }), world: W({ bg: '#020a05', bg2: '#052e16', env: false, ambient: 0.08 }), light: '#86efac', fx: FX({ bloom: true, bloomStrength: 1.1, bloomThreshold: 0.45, saturation: 0.9, tint: '#22c55e', tintAmount: 0.2, vignette: 0.55, contrast: 1.15 }) }
    ] },
    { id: 'space', name: 'Cosmic', presets: [
        { name: 'Nebula', mat: M({ color: '#7c3aed', roughness: 0.25, clearcoat: 1, iridescence: 1, emissive: '#db2777', emissiveIntensity: 0.6 }), world: W({ bg: '#020014', bg2: '#3b0764', envStrength: 0.7, ambient: 0.08 }), light: '#c4b5fd', fx: FX({ bloom: true, bloomStrength: 1, bloomThreshold: 0.5, saturation: 1.3, vignette: 0.5 }) },
        { name: 'Moon Rock', mat: M({ color: '#9ca3af', roughness: 1 }), world: W({ bg: '#000000', bg2: '#111827', env: false, ambient: 0.05 }), light: '#ffffff', fx: FX({ contrast: 1.25, saturation: 0.6, vignette: 0.4 }) },
        { name: 'Sun Plasma', mat: M({ color: '#7c2d12', roughness: 0.6, emissive: '#fb923c', emissiveIntensity: 1.8 }), world: W({ bg: '#0c0400', bg2: '#431407', env: false, ambient: 0.05 }), light: '#fdba74', fx: FX({ bloom: true, bloomStrength: 1.8, bloomThreshold: 0.25, saturation: 1.2, vignette: 0.45 }) },
        { name: 'Ice Planet', mat: M({ color: '#cffafe', roughness: 0.1, clearcoat: 1, transmission: 0.6, thickness: 2, ior: 1.31 }), world: W({ bg: '#020617', bg2: '#0c4a6e', envStrength: 1.2, ambient: 0.1 }), light: '#e0f2fe', fx: FX({ bloom: true, bloomStrength: 0.6, bloomThreshold: 0.7, saturation: 1.1, vignette: 0.4 }) },
        { name: 'Black Hole', mat: M({ color: '#000000', metalness: 1, roughness: 0.02, iridescence: 1 }), world: W({ bg: '#000000', bg2: '#1e1b4b', envStrength: 1.5, ambient: 0 }), light: '#a78bfa', fx: FX({ bloom: true, bloomStrength: 0.9, bloomThreshold: 0.5, contrast: 1.2, vignette: 0.6 }) }
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
