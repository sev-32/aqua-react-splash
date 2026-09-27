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
  volume: number;   // m³ removed from the heightfield this step (ballistic separation: spray)
  momentumX: number; momentumY: number; momentumZ: number; // m³·m/s (volume-weighted velocity)
  cells: number;
  /** m³ moved by spilling this step (breaking: redistributed, not removed). */
  spilled: number;
}

/**
 * The 2.5D envelope and what happens at it. Two different physical events:
 *
 * Breaking (the slope envelope). A crest may not stand higher above a neighbour than
 * maxSlope·dx (steepness beyond ~Stokes-limit geometry cannot be a single-valued
 * surface). The excess spills to that neighbour (a fraction `relax`/4 per edge per step,
 * volume exact), and the surface flow across the breaking edge is mixed (eddy viscosity
 * on φ). Breaking is mainly dissipation: removing the crest's water while leaving its
 * momentum would let the linear field rebuild the crest every step and drain the sea
 * through it (a hose). Launching water from a breaking crest is a finite event with a
 * budget frozen at birth (CORE_LAW §2), not this per-step envelope.
 *
 * Ballistic separation. A rising surface can decelerate no faster than gravity pulls
 * its water back; where the heightfield turns faster than that, the excess leaves as a
 * jet at the speed it had. That volume is removed and returned (with momentum) as
 * spray. Volume is conserved exactly: η_removed = released.
 *
 * Neither happens under a body, and slopes are measured on the free surface only: a
 * neighbour under a hull holds water + solid (the hull wall), so a crest against it is
 * run-up on the body, not an overturning slope.
 */
export function limitRepresentability(
  eta: Float64Array, phi: Float64Array, etaPrev: Float64Array | null,
  n: number, dx: number, dt: number, maxSlope: number, relax: number,
  releaseMap?: Float64Array,
  /**
   * Surface velocity ∂η/∂t of the previous step (GPU aux.z), updated in place: enables the
   * ballistic-separation criterion (the surface may not decelerate faster than g).
   */
  wPrev?: Float64Array,
  /** Body displacement per column (m, GPU aux.x): occupied columns neither break nor release. */
  occupied?: Float64Array,
): Release {
  const out: Release = { volume: 0, momentumX: 0, momentumY: 0, momentumZ: 0, cells: 0, spilled: 0 };
  const limit = maxSlope * dx;
  const e0 = eta.slice(), p0 = phi.slice();
  const free = (i: number) => !occupied || occupied[i] <= 0.02;
  const k = relax * 0.25;
  // Every cell, with neighbours clamped at the border as the GPU pass does (a clamped
  // neighbour is the cell itself: no exchange), so each edge's exchange is seen from both sides.
  const at = (x: number, z: number) => Math.min(n - 1, Math.max(0, z)) * n + Math.min(n - 1, Math.max(0, x));
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const i = z * n + x;
      if (!free(i)) continue;
      let lo = e0[i], spill = 0, mix = 0;
      for (const j of [at(x + 1, z), at(x - 1, z), at(x, z + 1), at(x, z - 1)]) {
        if (!free(j)) continue;
        lo = Math.min(lo, e0[j]);
        // Antisymmetric per edge, so what one cell sheds its neighbour gains exactly.
        const d = e0[j] - e0[i];
        const ex = Math.abs(d) - limit;
        if (ex > 0) {
          spill += k * Math.sign(d) * ex;
          mix += k * (p0[j] - p0[i]);
        }
      }
      eta[i] = e0[i] + spill;
      phi[i] = p0[i] + mix;
      if (spill < 0) out.spilled -= spill * dx * dx;
      // Ballistic separation.
      const w = etaPrev ? (e0[i] - etaPrev[i]) / Math.max(dt, 1e-6) : 0;
      const wp = wPrev ? wPrev[i] : 0;
      const acc = (w - wp) / Math.max(dt, 1e-6);
      let r = 0;
      if (wPrev && acc < -G && wp > 0 && e0[i] > 0) r = Math.min((-acc - G) * dt * dt * relax, e0[i]);
      r = Math.min(r, Math.max(e0[i] - lo, 0) + Math.max(e0[i], 0));
      if (r <= 0) continue;
      const v = r * dx * dx;
      const ux = (p0[at(x + 1, z)] - p0[at(x - 1, z)]) / (2 * dx);
      const uz = (p0[at(x, z + 1)] - p0[at(x, z - 1)]) / (2 * dx);
      eta[i] -= r;
      out.volume += v;
      out.momentumX += v * ux; out.momentumY += v * Math.max(wp, 0); out.momentumZ += v * uz;
      out.cells++;
      if (releaseMap) releaseMap[i] += v;
    }
  // Next step's wPrev: the surface velocity after limiting.
  if (wPrev && etaPrev) for (let i = 0; i < n * n; i++) wPrev[i] = (eta[i] - etaPrev[i]) / Math.max(dt, 1e-6);
  return out;
}
