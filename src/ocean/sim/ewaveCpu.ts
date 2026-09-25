/**
 * CPU reference of the T3 interaction field: eWave (Tessendorf 2014) plus the
 * Representability Limiter. The GLSL passes in interactionShaders.ts mirror
 * this code; tests pin its conservation and dispersion properties.
 *
 * Linearised free surface over depth d, in Fourier space:
 *   ∂η̃/∂t = K φ̃,   ∂φ̃/∂t = −(g + σk²/ρ) η̃,   K = k·tanh(kd)
 *   ω² = K (g + σk²/ρ)
 * Exact solution over dt (a rotation — unconditionally stable, exact dispersion):
 *   η' = η cos ωdt + (K/ω) φ sin ωdt
 *   φ' = φ cos ωdt − (ω/K) η sin ωdt
 */
import { fft2d } from '../spectrum/cpuFft';
import { G } from '../math/scalar';
import { SIGMA_OVER_RHO } from '../spectrum/physics';

export interface EwaveParams {
  n: number;
  dx: number;
  depth: number;
  /** Uniform damping rate (1/s) and viscous-like k² damping (m²/s). */
  damping: number;
  viscosity: number;
}

export class EwaveCpu {
  eta: Float64Array;
  phi: Float64Array;
  private re: Float64Array;
  private im: Float64Array;
  constructor(readonly p: EwaveParams) {
    const n2 = p.n * p.n;
    this.eta = new Float64Array(n2);
    this.phi = new Float64Array(n2);
    this.re = new Float64Array(n2);
    this.im = new Float64Array(n2);
  }

  /** Spectral step (the same algebra as EWAVE_EVOLVE_FS). */
  step(dt: number) {
    const { n, dx, depth, damping, viscosity } = this.p;
    const { re, im } = this;
    for (let i = 0; i < n * n; i++) { re[i] = this.eta[i]; im[i] = this.phi[i]; }
    fft2d(re, im, n, false);
    const outR = new Float64Array(n * n), outI = new Float64Array(n * n);
    const dk = (2 * Math.PI) / (n * dx);
    for (let iz = 0; iz < n; iz++)
      for (let ix = 0; ix < n; ix++) {
        const o = iz * n + ix;
        const m = ((n - iz) % n) * n + ((n - ix) % n);
        // Separate the two real fields packed as Z = η + iφ.
        const zr = re[o], zi = im[o], mr = re[m], mi = -im[m]; // conj(Z(-k))
        const er = 0.5 * (zr + mr), ei = 0.5 * (zi + mi);           // η̃
        const pr = 0.5 * (zi - mi), pi = -0.5 * (zr - mr);          // φ̃ = (Z - conj Z(-k)) / 2i
        const fx = ix < n / 2 ? ix : ix - n, fz = iz < n / 2 ? iz : iz - n;
        const k = Math.hypot(fx, fz) * dk;
        let nr: number, ni: number, qr: number, qi: number;
        if (k < 1e-9) {
          nr = er; ni = ei; qr = pr; qi = pi; // mean level and potential are conserved
        } else {
          const K = k * Math.tanh(Math.min(k * depth, 20));
          const gk = G + SIGMA_OVER_RHO * k * k;
          const w = Math.sqrt(K * gk);
          const c = Math.cos(w * dt), s = Math.sin(w * dt);
          const damp = Math.exp(-(damping + viscosity * k * k) * dt);
          nr = (er * c + (K / w) * pr * s) * damp;
          ni = (ei * c + (K / w) * pi * s) * damp;
          qr = (pr * c - (w / K) * er * s) * damp;
          qi = (pi * c - (w / K) * ei * s) * damp;
        }
        // Z' = η̃' + i φ̃'
        outR[o] = nr - qi;
        outI[o] = ni + qr;
      }
    fft2d(outR, outI, n, true);
    const inv = 1 / (n * n);
    for (let i = 0; i < n * n; i++) { this.eta[i] = outR[i] * inv; this.phi[i] = outI[i] * inv; }
  }

  /** Total volume (m³) relative to the rest level. */
  volume(): number {
    let v = 0;
    for (let i = 0; i < this.eta.length; i++) v += this.eta[i];
    return v * this.p.dx * this.p.dx;
  }

  /** Linear wave energy E = ½ρg∫η² + ½ρ∫φ Kφ (the potential part only is cheap; kinetic via spectrum). */
  potentialEnergy(): number {
    let e = 0;
    for (let i = 0; i < this.eta.length; i++) e += this.eta[i] * this.eta[i];
    return 0.5 * 1000 * G * e * this.p.dx * this.p.dx;
  }
}

/* ─────────────────────── Representability Limiter ─────────────────────── */

export interface Release {
  volume: number;   // m³ removed from the heightfield this step
  momentumX: number; momentumY: number; momentumZ: number; // m³·m/s (volume-weighted velocity)
  cells: number;
}

/**
 * The 2.5D envelope: a crest may not stand higher above its lowest neighbour
 * than maxSlope·dx (steepness beyond ~Stokes-limit geometry cannot be a
 * single-valued surface). The excess is removed — a fraction `relax` per step
 * to stay grid-smooth — and returned as released volume + momentum, to become
 * splash (T4). Volume is conserved exactly: η_removed = released.
 */
export function limitRepresentability(
  eta: Float64Array, phi: Float64Array, etaPrev: Float64Array | null,
  n: number, dx: number, dt: number, maxSlope: number, relax: number,
  releaseMap?: Float64Array,
  /** Fastest coherent surface rise (m/s); faster-rising water detaches (GPU: uWCrit). */
  wCrit = Infinity,
): Release {
  const out: Release = { volume: 0, momentumX: 0, momentumY: 0, momentumZ: 0, cells: 0 };
  const limit = maxSlope * dx;
  const removed = new Float64Array(n * n);
  for (let z = 1; z < n - 1; z++)
    for (let x = 1; x < n - 1; x++) {
      const i = z * n + x;
      const lo = Math.min(eta[i - 1], eta[i + 1], eta[i - n], eta[i + n]);
      const e = eta[i] - lo - limit;
      let r = e > 0 ? e * relax : 0;
      const w = etaPrev ? (eta[i] - etaPrev[i]) / Math.max(dt, 1e-6) : 0;
      if (w > wCrit && eta[i] > 0) r += Math.min((w - wCrit) * dt * relax * 0.6, eta[i]);
      removed[i] = Math.min(r, Math.max(eta[i] - lo, 0) + Math.max(eta[i], 0));
    }
  for (let z = 1; z < n - 1; z++)
    for (let x = 1; x < n - 1; x++) {
      const i = z * n + x;
      const r = removed[i];
      if (r <= 0) continue;
      const v = r * dx * dx;
      const w = etaPrev ? (eta[i] - etaPrev[i]) / Math.max(dt, 1e-6) : 0;
      const ux = (phi[i + 1] - phi[i - 1]) / (2 * dx);
      const uz = (phi[i + n] - phi[i - n]) / (2 * dx);
      eta[i] -= r;
      out.volume += v;
      out.momentumX += v * ux; out.momentumY += v * Math.max(w, 0); out.momentumZ += v * uz;
      out.cells++;
      if (releaseMap) releaseMap[i] += v;
    }
  return out;
}
