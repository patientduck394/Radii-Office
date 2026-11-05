/* keydown-rust.js: loads keydown-core.wasm, Keydown's text engine written in Rust (rust/keydown-core)!
   window.KeydownRust = { ready, textToHtml(text), inlineHtml(text) }
   Both return the HTML, or null when the Rust engine does not handle that text yet (the JavaScript engine in keydown-doc.js then does).
   It is only used when it is switched on: KeydownRust.enable() (or localStorage kd_rust = "1"), so nothing changes until then. */
(function (root) {
    'use strict';
    const SCRIPT = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
    const enc = new TextEncoder(), dec = new TextDecoder();
    let wasm = null;
    const api = {
        ready: false,
        enabled: false,
        enable() { api.enabled = true; try { localStorage.setItem('kd_rust', '1'); } catch (e) {} },
        disable() { api.enabled = false; try { localStorage.removeItem('kd_rust'); } catch (e) {} },
        textToHtml(text) { return call('kd_text_to_html', text); },
        inlineHtml(text) { return call('kd_inline_html', text); },
        // called once with the wasm bytes (Node tests do this) or by load()
        init(bytes) {
            return WebAssembly.instantiate(bytes, {}).then((r) => { wasm = r.instance.exports; api.ready = true; return api; });
        },
        load(url) {
            const u = url || new URL('keydown-core.wasm', SCRIPT || location.href).href;
            return fetch(u).then((r) => r.arrayBuffer()).then(api.init).catch((e) => { console.warn('Keydown Rust engine not loaded:', e); return api; });
        },
    };
    function call(name, text) {
        if (!wasm) return null;
        const bytes = enc.encode(String(text == null ? '' : text));
        const ptr = wasm.kd_alloc(bytes.length);
        new Uint8Array(wasm.memory.buffer, ptr, bytes.length).set(bytes);
        const n = wasm[name](ptr, bytes.length) >>> 0; // (u32 comes back signed)
        wasm.kd_free(ptr, bytes.length);
        if (n === 0xffffffff) return null;
        const out = dec.decode(new Uint8Array(wasm.memory.buffer, wasm.kd_result_ptr(), n));
        return out;
    }
    try { api.enabled = localStorage.getItem('kd_rust') === '1'; } catch (e) { /* no storage */ }
    root.KeydownRust = api;
    if (api.enabled && typeof fetch === 'function' && typeof document !== 'undefined') api.load();
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
