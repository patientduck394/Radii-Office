// py_silent.js — silent Pyodide helper shared by the apps (one copy, no drift)!
// Real Python runs ONLY here: Pyodide loads lazily on first use, cached after!
// run() NEVER throws and NEVER shows anything: callback gets the Python result
// or null (offline/CDN blocked) so the caller falls back to local math!
// No branding anywhere: users just see correct numbers, slightly richer!

(function (root) {
    var CDN = "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js";
    var loading = null;

    function load() {
        if (loading) return loading;
        loading = new Promise(function (resolve) {
            try {
                if (typeof window === "undefined" || typeof document === "undefined") {
                    return resolve(null);
                }
                if (window.loadPyodide) {
                    resolve(window.loadPyodide());
                    return;
                }
                var s = document.createElement("script");
                s.src = CDN;
                s.onload = function () {
                    try {
                        resolve(window.loadPyodide());
                    } catch (e) {
                        resolve(null);
                    }
                };
                s.onerror = function () { resolve(null); };
                document.head.appendChild(s);
            } catch (e) {
                resolve(null);
            }
        }).then(function (py) {
            if (!py) loading = null; // silent retry next time, still invisible!
            return py;
        });
        return loading;
    }

    // Fixed analysis script: statistics stdlib only, fixed shape, data as JSON!
    var CODE = [
        "import json, statistics",
        "YS = __YS__",
        "XS = list(range(len(YS)))",
        "n = len(YS)",
        "out = {'count': n}",
        "if n:",
        "    out['sum'] = sum(YS)",
        "    out['mean'] = statistics.mean(YS)",
        "    out['median'] = statistics.median(YS)",
        "    out['min'] = min(YS)",
        "    out['max'] = max(YS)",
        "    try:",
        "        out['stdev'] = statistics.stdev(YS)",
        "    except statistics.StatisticsError:",
        "        out['stdev'] = None",
        "    if n >= 2:",
        "        try:",
        "            slope, intercept = statistics.linear_regression(XS, YS)",
        "            out['slope'] = slope",
        "            out['intercept'] = intercept",
        "        except statistics.StatisticsError:",
        "            out['slope'] = None",
        "            out['intercept'] = None",
        "    else:",
        "        out['slope'] = None",
        "        out['intercept'] = None",
        "json.dumps(out)",
    ].join("\n");

    function finiteNums(values) {
        var out = [];
        (values || []).forEach(function (v) {
            const n = typeof v === "number" ? v : parseFloat(v);
            if (!isNaN(n) && isFinite(n)) out.push(n);
        });
        return out;
    }

    function medianOf(sorted) {
        const n = sorted.length;
        if (n === 0) return null;
        const mid = Math.floor(n / 2);
        return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Offline twin of the Python script above: identical shape, local math!
    function fallback(values) {
        const nums = finiteNums(values);
        const n = nums.length;
        const out = { count: n };
        if (!n) return out;
        const sum = nums.reduce((a, b) => a + b, 0);
        const sorted = [...nums].sort((a, b) => a - b);
        out.sum = sum;
        out.mean = sum / n;
        out.median = medianOf(sorted);
        out.min = sorted[0];
        out.max = sorted[n - 1];
        if (n >= 2) {
            const mean = sum / n;
            let denom = 0, numer = 0;
            for (let i = 0; i < n; i++) {
                denom += (i - (n - 1) / 2) ** 2;
                numer += (i - (n - 1) / 2) * (nums[i] - mean);
            }
            let variance = 0;
            nums.forEach((v) => { variance += (v - mean) ** 2; });
            out.stdev = Math.sqrt(variance / (n - 1));
            if (denom === 0) {
                out.slope = null;
                out.intercept = null;
            } else {
                out.slope = numer / denom;
                out.intercept = mean - out.slope * ((n - 1) / 2);
            }
        } else {
            out.stdev = null;
            out.slope = null;
            out.intercept = null;
        }
        return out;
    }

    function run(values, cb) {
        const nums = finiteNums(values);
        if (!nums.length) {
            try { cb({ count: 0 }); } catch (e) {}
            return;
        }
        load().then(function (py) {
            if (!py) {
                try { cb(null); } catch (e) {}
                return;
            }
            try {
                const out = JSON.parse(
                    py.runPython(CODE.replace("__YS__", JSON.stringify(nums)))
                );
                cb(out);
            } catch (e) {
                try { cb(null); } catch (ignore) {}
            }
        });
    }

    function warm() {
        load();
    }

    const PySilent = { run, fallback, warm };
    if (typeof module !== "undefined" && module.exports) module.exports = PySilent;
    root.PySilent = PySilent;
})(typeof window !== "undefined" ? window : globalThis);
