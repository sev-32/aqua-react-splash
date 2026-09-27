// Verify the shader's Stockham index math against a naive DFT (1D) and the propagate packing.
function stockham(input, sign) {
  const N = input.length / 2;
  let a = Float64Array.from(input), b = new Float64Array(input.length);
  for (let Ns = 1; Ns < N; Ns *= 2) {
    for (let i = 0; i < N; i++) {
      const ns2 = Ns * 2, r = Math.floor((i % ns2) / Ns), j = Math.floor(i / ns2) * Ns + (i % Ns);
      const v0r = a[2 * j], v0i = a[2 * j + 1], v1r = a[2 * (j + N / 2)], v1i = a[2 * (j + N / 2) + 1];
      const ang = sign * 2 * Math.PI * (j % Ns) / ns2, wr = Math.cos(ang), wi = Math.sin(ang);
      const tr = v1r * wr - v1i * wi, ti = v1r * wi + v1i * wr;
      b[2 * i] = r === 0 ? v0r + tr : v0r - tr; b[2 * i + 1] = r === 0 ? v0i + ti : v0i - ti;
    }
    [a, b] = [b, a];
  }
  return a;
}
function dft(input, sign) {
  const N = input.length / 2, out = new Float64Array(input.length);
  for (let k = 0; k < N; k++) { let sr = 0, si = 0; for (let n = 0; n < N; n++) { const ang = sign * 2 * Math.PI * k * n / N; const xr = input[2 * n], xi = input[2 * n + 1]; sr += xr * Math.cos(ang) - xi * Math.sin(ang); si += xr * Math.sin(ang) + xi * Math.cos(ang); } out[2 * k] = sr; out[2 * k + 1] = si; }
  return out;
}
const N = 16; const x = new Float64Array(2 * N); for (let i = 0; i < 2 * N; i++) x[i] = Math.sin(i * 1.7) + 0.3 * Math.cos(i * 0.4);
const s = stockham(x, -1), d = dft(x, -1);
let err = 0; for (let i = 0; i < 2 * N; i++) err = Math.max(err, Math.abs(s[i] - d[i]));
console.log('forward max err', err);
const back = stockham(s, 1); let err2 = 0; for (let i = 0; i < 2 * N; i++) err2 = Math.max(err2, Math.abs(back[i] / N - x[i]));
console.log('roundtrip max err', err2);
// 1D wave propagation check: packed h + i phi, propagate one full period of mode 3, expect same field.
const L = 16, cell = 1, g = 9.81; const h = new Float64Array(N), ph = new Float64Array(N);
for (let i = 0; i < N; i++) h[i] = Math.cos(2 * Math.PI * 3 * i / N);
const packed = new Float64Array(2 * N); for (let i = 0; i < N; i++) { packed[2 * i] = h[i]; packed[2 * i + 1] = ph[i]; }
const F = stockham(packed, -1);
const k3 = 2 * Math.PI * 3 / (N * cell), w3 = Math.sqrt(g * k3), T = 2 * Math.PI / w3;
function propagate(F, dt) {
  const out = new Float64Array(F.length);
  for (let p = 0; p < N; p++) {
    const m = (N - p) % N; const Fx = F[2 * p], Fy = F[2 * p + 1], Mx = F[2 * m], My = F[2 * m + 1];
    const H = [0.5 * (Fx + Mx), 0.5 * (Fy - My)], P = [0.5 * (Fy + My), -0.5 * (Fx - Mx)];
    const f = p < N / 2 ? p : p - N; const k = Math.abs(f) * 2 * Math.PI / (N * cell);
    if (k < 1e-9) continue;
    const om = Math.sqrt(g * k), c = Math.cos(om * dt), s = Math.sin(om * dt), norm = 1 / N;
    const H2 = [(H[0] * c + P[0] * (k / om) * s) * norm, (H[1] * c + P[1] * (k / om) * s) * norm];
    const P2 = [(P[0] * c - H[0] * (g / om) * s) * norm, (P[1] * c - H[1] * (g / om) * s) * norm];
    out[2 * p] = H2[0] - P2[1]; out[2 * p + 1] = H2[1] + P2[0];
  }
  return out;
}
for (const frac of [0.25, 0.5, 1]) {
  const G = propagate(F, T * frac); const r = stockham(G, 1);
  const hh = []; for (let i = 0; i < 4; i++) hh.push(r[2 * i].toFixed(3));
  console.log(`t=${frac}T h[0..3]=`, hh.join(','), ' expected', [0, 1, 2, 3].map(i => (Math.cos(2 * Math.PI * 3 * i / N) * Math.cos(2 * Math.PI * frac)).toFixed(3)).join(','));
}
