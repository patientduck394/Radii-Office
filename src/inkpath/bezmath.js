// bezmath.js — loads the Rust Bezier math module (bezmath.wasm) with a JS fallback!
// window.BezMath.cubicLen(x0,y0,c1x,c1y,c2x,c2y,x1,y1) works either way!
// window.BezMath.ready resolves true when WASM wins, false on fallback!
// Zero behavior change: nothing calls it yet — it is ready for a live readout!

(function () {
    function jsCubicLen(x0, y0, c1x, c1y, c2x, c2y, x1, y1) {
        const n = 32;
        let total = 0.0, px = x0, py = y0;
        for (let i = 1; i <= n; i++) {
            const t = i / n, u = 1.0 - t;
            const x = u ** 3 * x0 + 3 * u ** 2 * t * c1x + 3 * u * t ** 2 * c2x + t ** 3 * x1;
            const y = u ** 3 * y0 + 3 * u ** 2 * t * c1y + 3 * u * t ** 2 * c2y + t ** 3 * y1;
            total += Math.hypot(x - px, y - py);
            px = x; py = y;
        }
        return total;
    }

    const api = { cubicLen: jsCubicLen, engine: "js-fallback", ready: Promise.resolve(false) };

    if (typeof fetch !== "undefined" && typeof WebAssembly !== "undefined") {
        api.ready = fetch("bezmath.wasm")
            .then((res) => {
                if (!res.ok) throw new Error("http " + res.status);
                return res.arrayBuffer();
            })
            .then((bytes) => WebAssembly.instantiate(bytes, {}))
            .then(({ instance }) => {
                if (typeof instance.exports.cubic_len !== "function") throw new Error("no export");
                api.cubicLen = instance.exports.cubic_len;
                api.engine = "rust-wasm";
                return true;
            })
            .catch(() => false);
    }

    window.BezMath = api;
})();
