// stats.js — the little statistics helper shared by Imbuer and Mainkey (one copy, no drift)!
// Plain JavaScript: summary() returns count, sum, mean, median, min, max, stdev, slope and intercept!

(function (root) {
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

    // count, sum, mean, median, min, max, sample stdev and the least-squares trend line!
    function summary(values) {
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

    const RadiiStats = { summary };
    if (typeof module !== "undefined" && module.exports) module.exports = RadiiStats;
    root.RadiiStats = RadiiStats;
})(typeof window !== "undefined" ? window : globalThis);
