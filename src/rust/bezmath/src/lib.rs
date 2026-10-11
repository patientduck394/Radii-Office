//! bezmath — tiny Bezier math module that really executes!
//! Same cubic-length loop as scripts/engines/inkpath.mjs, compiled to WASM!
//! Builds with: cargo build --release --target wasm32-unknown-unknown!

/// Cubic Bezier segment arc length (32-sample polyline, like the JS engine)!
/// Control layout matches buildPathData: (x0,y0) start, (c1x,c1y) previous
/// segment's outgoing handle, (c2x,c2y) incoming handle, (x1,y1) end!
#[no_mangle]
pub extern "C" fn cubic_len(
    x0: f64,
    y0: f64,
    c1x: f64,
    c1y: f64,
    c2x: f64,
    c2y: f64,
    x1: f64,
    y1: f64,
) -> f64 {
    let n: i32 = 32;
    let mut total = 0.0;
    let (mut px, mut py) = (x0, y0);
    for i in 1..=n {
        let t = i as f64 / n as f64;
        let u = 1.0 - t;
        let x = u * u * u * x0 + 3.0 * u * u * t * c1x + 3.0 * u * t * t * c2x + t * t * t * x1;
        let y = u * u * u * y0 + 3.0 * u * u * t * c1y + 3.0 * u * t * t * c2y + t * t * t * y1;
        let dx = x - px;
        let dy = y - py;
        total += (dx * dx + dy * dy).sqrt();
        px = x;
        py = y;
    }
    total
}
