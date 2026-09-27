/**
 * CPU reference of the carpet kernel: the T3 tile upgraded per CORE_LAW §1
 * (heightfieldBEST's occupancy coupling carried onto eWave dispersion). The
 * GLSL passes in interactionShaders.ts mirror this code; the tests and
 * scripts/carpet-validate.ts measure it (Mach and Kelvin angles, volume).
 *
 * Variables (source form, as BEST): η is the height of water + solid in a column
 * above the undisturbed ocean surface, φ the surface velocity potential. A body
 * adds its wet occupancy σ to the columns it enters (η += Δσ, exact volume) and
 * leaves a void of the same volume where it withdraws.
 *
 * Blocking. Under a surface-piercing hull the water cannot rise or fall on its
 * own: the hull holds it, so the true surface η − σ sits on the hull bottom, i.e.
 * η = 0 there. Linear flat-ship theory imposes that with the hull's pressure; here
 * it is a stiff penalty pressure p/ρ = g·κ·χ·η on the piercing fraction χ of the
 * column, plus a damper that smooths φ inside the footprint. Without it the body
 * is transparent (waves and its own displaced water pass under it, and bow and
 * stern sources cancel beneath the hull). With it the displaced water has to go
 * around: bow pile-up ahead, a hollow behind that the surrounding water falls
 * into. That is BEST's m = H + η − σ flux blocking, without its tuned push ring.
 *
 * Note the equivalence that makes the source form safe: with η_s = η − σ the same
 * equations read ∂η_s/∂t = Kφ, ∂φ/∂t = −gη_s − gσ, a moving hydrostatic pressure
 * patch (Havelock). Source and pressure forms are one model; the constraint is
 * what BEST adds.
 */
import { EwaveCpu, limitRepresentability, type EwaveParams } from './ewaveCpu';
import { G, clamp } from '../math/scalar';
import { stableKappa, RING_OCC } from './carpetParams';

export { RING_OCC, KAPPA_TARGET, CARPET_SMOOTH, CARPET_DAMPING, CARPET_VISCOSITY, CARPET_HYPER, CARPET_MAX_SLOPE, CARPET_RELAX, stableKappa, carpetSubsteps, carpetDx } from './carpetParams';

export interface CarpetSphere { x: number; y: number; z: number; r: number }

export interface CarpetParams extends EwaveParams {
  /** Penalty stiffness (×g) on piercing columns. Default: the largest stable value for dx and dt. */
  kappa?: number;
  /** φ smoothing inside the footprint, as a fraction of the explicit diffusion limit (0 = off). */
  smooth?: number;
  /** Absorbing sponge width (cells). */
  sponge?: number;
  limiter?: boolean;
  maxSlope?: number;
  relax?: number;
}

const W5 = [1, 4, 6, 4, 1];

export class CarpetCpu {
  readonly wave: EwaveCpu;
  readonly n: number;
  readonly dx: number;
  /** World position of cell (0, 0)'s corner; integer multiples of dx. */
  origin: [number, number];
  /** σ applied so far (GPU aux.x). */
  occ: Float64Array;
  /** Piercing fraction χ of the last source pass. */
  chi: Float64Array;
  private etaPrev: Float64Array;
  private wPrev: Float64Array;
  private scratch: Float64Array;
  /**
   * The hold's pressure head on the hull, κ·χ·η (m of water), from the last source pass: the
   * dynamic part of the pressure the water exerts on the body (the hydrostatic part is the
   * occupancy σ itself). GPU twin: the hold texture written by TILE_SOURCE_FS.
   */
  hold: Float64Array;
  /** Ledger (m³): volume added by bodies, removed by the sponge and by the limiter. */
  ledger = { source: 0, sponge: 0, released: 0, shifted: 0 };

  constructor(readonly p: CarpetParams, origin: [number, number] = [0, 0]) {
    this.wave = new EwaveCpu(p);
    this.n = p.n;
    this.dx = p.dx;
    this.origin = [origin[0], origin[1]];
    const n2 = p.n * p.n;
    this.occ = new Float64Array(n2);
    this.chi = new Float64Array(n2);
    this.etaPrev = new Float64Array(n2);
    this.wPrev = new Float64Array(n2);
    this.scratch = new Float64Array(n2);
    this.hold = new Float64Array(n2);
  }

  get eta() { return this.wave.eta; }
  get phi() { return this.wave.phi; }

  /**
   * Band-limited occupancy (5×5 binomial, σ ≈ dx) of wet solid below the ocean surface
   * `ref`, and the piercing fraction χ (the body crosses the surface in that column).
   */
  occupancy(bodies: CarpetSphere[], ref: (x: number, z: number) => number, outOcc: Float64Array, outChi: Float64Array) {
    const { n, dx } = this;
    outOcc.fill(0);
    outChi.fill(0);
    for (const b of bodies) {
      const i0 = Math.max(0, Math.floor((b.x - b.r - this.origin[0]) / dx) - 3), i1 = Math.min(n - 1, Math.ceil((b.x + b.r - this.origin[0]) / dx) + 3);
      const j0 = Math.max(0, Math.floor((b.z - b.r - this.origin[1]) / dx) - 3), j1 = Math.min(n - 1, Math.ceil((b.z + b.r - this.origin[1]) / dx) + 3);
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const x = this.origin[0] + (i + 0.5) * dx, z = this.origin[1] + (j + 0.5) * dx;
          let s = 0, c = 0;
          for (let a = -2; a <= 2; a++)
            for (let q = -2; q <= 2; q++) {
              const qx = x + q * dx, qz = z + a * dx;
              const d2 = (qx - b.x) ** 2 + (qz - b.z) ** 2;
              const h2 = b.r * b.r - d2;
              if (h2 <= 0) continue;
              const h = Math.sqrt(h2), lo = b.y - h, hi = b.y + h;
              const r = ref(qx, qz);
              const wgt = (W5[a + 2] * W5[q + 2]) / 256;
              s += clamp(r - lo, 0, hi - lo) * wgt;
              if (lo < r && r < hi) c += wgt;
            }
          outOcc[j * n + i] += s;
          outChi[j * n + i] = Math.min(1, outChi[j * n + i] + c);
        }
    }
  }

  /** One step with the bodies at their end-of-step pose (callers substep fast bodies). */
  step(bodies: CarpetSphere[], dt: number, ref: (x: number, z: number) => number = () => 0) {
    const { n, dx } = this;
    const eta = this.wave.eta, phi = this.wave.phi;
    const occ = this.scratch;
    this.occupancy(bodies, ref, occ, this.chi);
    // 1. Source: exact displaced volume, and the hull's hold on the column. One pass, in
    //    the order the GPU does it: the damper smooths the incoming φ (4-neighbour
    //    Laplacian, only where the hull holds the water: it damps the stiffened
    //    footprint's own ringing and leaves uniform flow alone), then the hold kicks φ.
    const kappa = this.p.kappa ?? stableKappa(dx, dt);
    const sm = this.p.smooth ?? 0;
    const old = sm > 0 ? phi.slice() : phi;
    let src = 0;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const o = j * n + i;
        const d = occ[o] - this.occ[o];
        eta[o] += d;
        src += d;
        this.occ[o] = occ[o];
        const c = this.chi[o];
        this.hold[o] = kappa * c * eta[o];
        if (c <= 0) continue;
        if (sm > 0 && i > 0 && j > 0 && i < n - 1 && j < n - 1)
          phi[o] = old[o] + 0.25 * sm * c * (old[o - 1] + old[o + 1] + old[o - n] + old[o + n] - 4 * old[o]);
        phi[o] -= dt * G * kappa * c * eta[o];
      }
    this.ledger.source += src * dx * dx;
    // 2. Exact dispersion.
    this.wave.step(dt);
    // 3. Representability limiter (never under a body) → release ledger.
    if (this.p.limiter) {
      const r = limitRepresentability(eta, phi, this.etaPrev, n, dx, dt, this.p.maxSlope ?? 0.62, this.p.relax ?? 0.5, undefined, this.wPrev, this.occ);
      this.ledger.released += r.volume;
    } else {
      for (let i = 0; i < n * n; i++) this.wPrev[i] = (eta[i] - this.etaPrev[i]) / Math.max(dt, 1e-6);
    }
    // 4. Absorbing sponge (FFT periodicity): the same profile as TILE_LIMIT_FS.
    const W = this.p.sponge ?? n * 0.1;
    let lost = 0;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const edge = Math.min(i, n - 1 - i, j, n - 1 - j);
        const t = clamp(edge / W, 0, 1);
        const sp = 1 - t * t * (3 - 2 * t);
        if (sp <= 0) continue;
        const k = Math.exp(-sp * sp * 6 * dt);
        const o = j * n + i;
        lost += eta[o] * (1 - k);
        eta[o] *= k;
        phi[o] *= k;
      }
    this.ledger.sponge += lost * dx * dx;
    this.etaPrev.set(eta);
  }

  /** Integer-cell recentring (TILE_SHIFT_FS): content moves by −(sx, sz) cells, new cells at rest. */
  shift(sx: number, sz: number) {
    const { n } = this;
    const before = this.wave.volume();
    for (const a of [this.wave.eta, this.wave.phi, this.occ, this.chi, this.etaPrev, this.wPrev]) {
      const src = a.slice();
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const si = i + sx, sj = j + sz;
          a[j * n + i] = si < 0 || sj < 0 || si >= n || sj >= n ? 0 : src[sj * n + si];
        }
    }
    this.origin = [this.origin[0] + sx * this.dx, this.origin[1] + sz * this.dx];
    this.ledger.shifted += before - this.wave.volume();
  }

  /**
   * Force and torque (about `center`) of the water's dynamic pressure on the bodies: the
   * hold head H = κχη acting on the hull bottom, F = ρg·Σ H·(∂σ/∂x, 1, ∂σ/∂z)·Δx². Over a
   * pierced column −∇y_bottom = ∇σ, so a higher pressure on a bottom rising toward the bow
   * pushes back (wave resistance) and a bow-high / stern-low pressure pitches the hull
   * (trim). The hydrostatic head σ adds no horizontal force (Σσ∇σ is a boundary term).
   * Lever arm at the wet column's centroid, ref − σ/2 (ref = 0 here: calm ocean).
   */
  holdForce(center: [number, number, number], rho = 1025): { F: [number, number, number]; T: [number, number, number] } {
    const { n, dx } = this;
    const F: [number, number, number] = [0, 0, 0], T: [number, number, number] = [0, 0, 0];
    const k = rho * G * dx * dx;
    for (let j = 1; j < n - 1; j++)
      for (let i = 1; i < n - 1; i++) {
        const o = j * n + i, H = this.hold[o];
        if (H === 0) continue;
        const gx = (this.occ[o + 1] - this.occ[o - 1]) / (2 * dx), gz = (this.occ[o + n] - this.occ[o - n]) / (2 * dx);
        const f: [number, number, number] = [k * H * gx, k * H, k * H * gz];
        const r: [number, number, number] = [this.origin[0] + (i + 0.5) * dx - center[0], -0.5 * this.occ[o] - center[1], this.origin[1] + (j + 0.5) * dx - center[2]];
        F[0] += f[0]; F[1] += f[1]; F[2] += f[2];
        T[0] += r[1] * f[2] - r[2] * f[1]; T[1] += r[2] * f[0] - r[0] * f[2]; T[2] += r[0] * f[1] - r[1] * f[0];
      }
    return { F, T };
  }

  /**
   * The free surface around a body: a least-squares plane η ≈ a + b·(x − cx) + c·(z − cz)
   * fitted to the open cells at its waterline (no occupancy, with an occupied neighbour,
   * within `reach` of the centre; occupancy rather than χ, as the GPU pass reads aux.x). The body feels this plane: its buoyancy is measured against it
   * and its slope pushes it downhill. Its own bow wave, stern trough and radiated rings are
   * in it, delayed by the water's own dynamics rather than by a stiff penalty.
   */
  ringPlane(cx: number, cz: number, reach: number): { a: number; b: number; c: number; count: number } {
    const { n, dx } = this;
    let s1 = 0, sx = 0, sz = 0, sxx = 0, sxz = 0, szz = 0, se = 0, sxe = 0, sze = 0;
    const i0 = Math.max(1, Math.floor((cx - reach - this.origin[0]) / dx)), i1 = Math.min(n - 2, Math.ceil((cx + reach - this.origin[0]) / dx));
    const j0 = Math.max(1, Math.floor((cz - reach - this.origin[1]) / dx)), j1 = Math.min(n - 2, Math.ceil((cz + reach - this.origin[1]) / dx));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const o = j * n + i;
        const held = (q: number) => this.occ[q] > RING_OCC;
        if (held(o)) continue;
        if (!(held(o - 1) || held(o + 1) || held(o - n) || held(o + n))) continue;
        const x = this.origin[0] + (i + 0.5) * dx - cx, z = this.origin[1] + (j + 0.5) * dx - cz;
        if (x * x + z * z > reach * reach) continue;
        const e = this.eta[o];
        s1++; sx += x; sz += z; sxx += x * x; sxz += x * z; szz += z * z; se += e; sxe += x * e; sze += z * e;
      }
    if (s1 < 3) return { a: 0, b: 0, c: 0, count: s1 };
    // Solve the 3×3 normal equations [[s1,sx,sz],[sx,sxx,sxz],[sz,sxz,szz]]·(a,b,c) = (se,sxe,sze).
    const M = [[s1, sx, sz], [sx, sxx, sxz], [sz, sxz, szz]], r = [se, sxe, sze];
    const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M);
    if (Math.abs(D) < 1e-12) return { a: se / s1, b: 0, c: 0, count: s1 };
    const col = (k: number) => M.map((row, i) => row.map((v, j) => (j === k ? r[i] : v)));
    return { a: det(col(0)) / D, b: det(col(1)) / D, c: det(col(2)) / D, count: s1 };
  }

  /** Volume now in the field (m³). Ledger closure: volume = source − sponge − released − shifted. */
  volume() { return this.wave.volume(); }
}
