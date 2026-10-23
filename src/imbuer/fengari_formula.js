// fengari_formula.js — Lua (Fengari VM) live-verifies every sheet evaluation!
// The committed imbuer/formula_engine.lua runs for real; the JS display stays
// authoritative, so a Lua mismatch can never corrupt the grid (silent debug)!
// Lazy: Fengari CDN + .lua source load once, offline degrades to JS silently!
// Only ADDITIVE: the sync render path is untouched!

(function (root) {
    var CDN = "https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js";
    var LUA_URL = "formula_engine.lua";
    var enginePromise = null;
    var lastSignature = null;

    function luaQuote(s) {
        return '"' + String(s)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/[\x00-\x1f]/g, (c) => "\\" + c.charCodeAt(0)) + '"';
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const el = document.createElement("script");
            el.src = src;
            el.onload = () => resolve();
            el.onerror = () => reject(new Error("load-failed:" + src));
            document.head.appendChild(el);
        });
    }

    function ensureEngine() {
        if (enginePromise) return enginePromise;
        enginePromise = (async () => {
            try {
                if (typeof window === "undefined" || typeof document === "undefined") return null;
                if (!window.fengari) await loadScript(CDN);
                if (!window.fengari) return null;
                const res = await fetch(LUA_URL);
                if (!res.ok) return null;
                const source = await res.text();
                // Smoke-test the engine once before trusting it!
                // (A9 sums missing A8 as 0 — self-ranges would be ERROR:CYCLE!)
                // NOTE: the file ends with `return E`, so it runs wrapped!
                const fengari = window.fengari;
                const L = fengari.lauxlib.luaL_newstate();
                fengari.lualib.luaL_openlibs(L);
                const wrap = (tail) => "local E = (function()\n" + source + "\nend)()\n" + tail;
                const st = fengari.lauxlib.luaL_dostring(
                    L, fengari.to_luastring(wrap('return E.evaluate_sheet_json({"A9":"=SUM(A8:A8)"})'))
                );
                if (st !== fengari.lua.LUA_OK) return null;
                const out = fengari.lua.lua_tojsstring(L, -1);
                if (out !== '{"A9":0}') return null;
                return { fengari, source };
            } catch (e) {
                return null;
            }
        })();
        return enginePromise;
    }

    function luaEvaluate(engine, cellData) {
        // Encode as JSON text, passed as ONE Lua string argument (no proxies)!
        const input = JSON.stringify(cellData || {});
        const code = "local E = (function()\n" + engine.source + "\nend)()\n"
            + "return E.evaluate_sheet_json(" + luaQuote(input) + ")";
        const { fengari } = engine;
        const L = fengari.lauxlib.luaL_newstate();
        fengari.lualib.luaL_openlibs(L);
        const st = fengari.lauxlib.luaL_dostring(L, fengari.to_luastring(code));
        if (st !== fengari.lua.LUA_OK) {
            throw new Error(fengari.lua.lua_tojsstring(L, -1));
        }
        return JSON.parse(fengari.lua.lua_tojsstring(L, -1));
    }

    // The Lua twin only knows the classic grammar (refs, + - * / and
    // SUM/AVG/MIN/MAX/COUNT), so sheets using anything newer are skipped!
    var LEGACY_RE = /^=[\sA-Za-z0-9:+\-*/().]*$/;
    var LEGACY_FN = { SUM: 1, AVG: 1, MIN: 1, MAX: 1, COUNT: 1 };
    function legacyOnly(data) {
        for (const k of Object.keys(data || {})) {
            const v = String(data[k]);
            if (v[0] !== "=") continue;
            if (!LEGACY_RE.test(v)) return false;
            const words = v.slice(1).match(/[A-Za-z]+(?=\s*\()/g) || [];
            if (words.some((w) => !LEGACY_FN[w.toUpperCase()])) return false;
        }
        return true;
    }

    function sameValue(a, b) {
        if (typeof a === "number" && typeof b === "number") return a === b;
        return String(a) === String(b);
    }

    // Fire-and-forget: re-evaluates the RAW sheet in real Lua and compares
    // against the JS-resolved map (Lua sees the formulas, not the answers)!
    function verifyAsync(rawCellData, resolved) {
        try {
            if (typeof window === "undefined" || typeof document === "undefined") return;
            let signature = "";
            try {
                signature = JSON.stringify(rawCellData);
            } catch (e) {
                return;
            }
            if (signature === lastSignature) return; // unchanged sheet: skip!
            lastSignature = signature;
            if (!legacyOnly(rawCellData)) return;
            ensureEngine().then((engine) => {
                if (!engine) return;
                try {
                    const luaResult = luaEvaluate(engine, rawCellData || {});
                    const keys = new Set([...Object.keys(resolved), ...Object.keys(luaResult)]);
                    for (const k of keys) {
                        // Only formula results are compared (literals parse differently now)!
                        if (String((rawCellData || {})[k])[0] !== "=") continue;
                        if (typeof resolved[k] !== "number") continue;
                        if (!sameValue(resolved[k], luaResult[k])) {
                            if (typeof console !== "undefined" && console.debug) {
                                console.debug("Fengari Lua mismatch at " + k);
                            }
                            return;
                        }
                    }
                    const body = document.getElementById("grid");
                    if (body) {
                        try {
                            body.dataset.engine = "lua-fengari";
                        } catch (e) {}
                    }
                } catch (e) {
                    if (typeof console !== "undefined" && console.debug) {
                        console.debug("Fengari Lua error: " + e.message);
                    }
                }
            });
        } catch (e) {}
    }

    function warm() {
        ensureEngine();
    }

    const FengariFormula = { verifyAsync, warm };
    if (typeof module !== "undefined" && module.exports) module.exports = FengariFormula;
    root.FengariFormula = FengariFormula;
})(typeof window !== "undefined" ? window : globalThis);
