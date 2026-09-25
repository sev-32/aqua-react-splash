/**
 * SpectralMirror — a deterministic, band-limited CPU copy of the rendered ocean.
 *
 * The GPU renders Σ over all N² modes; the mirror evaluates exactly the same
 * modes (same seed, same h0, same ω, same choppiness) restricted to the
 * central M×M block of each cascade. That is a clean low-pass of the rendered
 * surface: everything a hull, a buoy or a gameplay rule can physically feel,
 * with zero GPU readback and zero latency. A server can run the identical code
 * for authoritative buoyancy (law W7).
 */
import { fft2d } from './cpuFft';
import { modeH0, type CascadeLayout, type SpectrumModel } from './cascades';
import { dispersion } from './physics';

export interface SurfaceSample {
  height: number;
  /** ∂η/∂t (m/s) — vertical surface velocity. */
  vy: number;
  /** Horizontal orbital velocity at the surface (m/s). */
  vx: number;
  vz: number;
  /** Surface normal (unit). */
  normal: [number, number, number];
  /** Undisplaced parameter position that maps to the query point. */
  x0: number;
  z0: number;
}

interface CascadeMirror {
  L: number;
  h0re: Float64Array; h0im: Float64Array; hmre: Float64Array; hmim: Float64Array;
  kx: Float64Array; kz: Float64Array; omega: Float64Array;
  // spatial grids (M×M, row-major z*M + x)
  dx: Float32Array; h: Float32Array; dz: Float32Array; ht: Float32Array; ux: Float32Array; uz: Float32Array;
}

export class SpectralMirror {
  readonly m: number;
  private cascades: CascadeMirror[] = [];
  private chop: number[] = [];
  private depth = 1500;
  private loopPeriod = 0;
  private reA: Float64Array; private imA: Float64Array;
  private reB: Float64Array; private imB: Float64Array;
  private reC: Float64Array; private imC: Float64Array;
  time = 0;

  constructor(m = 64) {
    this.m = m;
    const n2 = m * m;
    this.reA = new Float64Array(n2); this.imA = new Float64Array(n2);
    this.reB = new Float64Array(n2); this.imB = new Float64Array(n2);
    this.reC = new Float64Array(n2); this.imC = new Float64Array(n2);
  }

  /** Rebuild mode amplitudes for a new spectrum (same cost profile as a sea-state change). */
  rebuild(model: SpectrumModel, layout: CascadeLayout, seed: number, choppiness: number[], loopPeriod = 0) {
    const M = this.m, N = layout.n;
    this.chop = choppiness.slice();
    this.depth = model.depth;
    this.loopPeriod = loopPeriod;
    this.cascades = layout.sizes.map((L, c) => {
      const n2 = M * M;
      const cm: CascadeMirror = {
        L,
        h0re: new Float64Array(n2), h0im: new Float64Array(n2), hmre: new Float64Array(n2), hmim: new Float64Array(n2),
        kx: new Float64Array(n2), kz: new Float64Array(n2), omega: new Float64Array(n2),
        dx: new Float32Array(n2), h: new Float32Array(n2), dz: new Float32Array(n2),
        ht: new Float32Array(n2), ux: new Float32Array(n2), uz: new Float32Array(n2),
      };
      const dk = (2 * Math.PI) / L;
      for (let jz = 0; jz < M; jz++)
        for (let jx = 0; jx < M; jx++) {
          const fx = jx < M / 2 ? jx : jx - M;
          const fz = jz < M / 2 ? jz : jz - M;
          if (fx === -M / 2 || fz === -M / 2) continue; // mirror Nyquist: keep Hermitian
          const ix = (fx + N) % N, iz = (fz + N) % N;
          const mx = (N - ix) % N, mz = (N - iz) % N;
          const [ar, ai] = modeH0(model, layout, seed, c, ix, iz);
          const [br, bi] = modeH0(model, layout, seed, c, mx, mz);
          const o = jz * M + jx;
          cm.h0re[o] = ar; cm.h0im[o] = ai;
          cm.hmre[o] = br; cm.hmim[o] = -bi; // conj(h0(-k))
          cm.kx[o] = fx * dk; cm.kz[o] = fz * dk;
          let w = dispersion(Math.hypot(fx * dk, fz * dk), model.depth);
          if (loopPeriod > 0) { const w0 = (2 * Math.PI) / loopPeriod; w = Math.max(Math.round(w / w0), 1) * w0; }
          cm.omega[o] = w;
        }
      return cm;
    });
  }

  get ready() {
    return this.cascades.length > 0;
  }

  /** Evaluate all spatial grids at time t (inverse FFTs of M×M per cascade). */
  evaluate(t: number) {
    this.time = t;
    const M = this.m, n2 = M * M;
    const { reA, imA, reB, imB, reC, imC } = this;
    this.cascades.forEach((cm, c) => {
      const lam = this.chop[c] ?? 1;
      for (let o = 0; o < n2; o++) {
        const kx = cm.kx[o], kz = cm.kz[o];
        const k = Math.hypot(kx, kz);
        if (k < 1e-9) { reA[o] = imA[o] = reB[o] = imB[o] = reC[o] = imC[o] = 0; continue; }
        const w = cm.omega[o];
        const cs = Math.cos(w * t), sn = Math.sin(w * t);
        // ĥ = h0 e^{-iωt} + hm e^{iωt}
        const hr = cm.h0re[o] * cs + cm.h0im[o] * sn + cm.hmre[o] * cs - cm.hmim[o] * sn;
        const hi = cm.h0im[o] * cs - cm.h0re[o] * sn + cm.hmim[o] * cs + cm.hmre[o] * sn;
        // ∂ĥ/∂t = -iω h0 e^{-iωt} + iω hm e^{iωt}
        const ar = cm.h0re[o] * cs + cm.h0im[o] * sn, ai = cm.h0im[o] * cs - cm.h0re[o] * sn;
        const br = cm.hmre[o] * cs - cm.hmim[o] * sn, bi = cm.hmim[o] * cs + cm.hmre[o] * sn;
        const htr = w * (ai - bi), hti = w * (br - ar);
        const ux = kx / k, uz = kz / k;
        // Dx = i ux ĥ ;  slot A = Dx + i h
        const dxr = -ux * hi, dxi = ux * hr;
        reA[o] = dxr - hi; imA[o] = dxi + hr;
        // Dz = i uz ĥ ; slot B = Dz + i ht
        const dzr = -uz * hi, dzi = uz * hr;
        reB[o] = dzr - hti; imB[o] = dzi + htr;
        // horizontal velocity ∂D/∂t = i k̂ ∂ĥ/∂t ; slot C = u + i v
        const uxr = -ux * hti, uxi = ux * htr, uzr = -uz * hti, uzi = uz * htr;
        reC[o] = uxr - uzi; imC[o] = uxi + uzr;
      }
      fft2d(reA, imA, M, true);
      fft2d(reB, imB, M, true);
      fft2d(reC, imC, M, true);
      for (let o = 0; o < n2; o++) {
        cm.dx[o] = reA[o] * lam; cm.h[o] = imA[o];
        cm.dz[o] = reB[o] * lam; cm.ht[o] = imB[o];
        cm.ux[o] = reC[o]; cm.uz[o] = imC[o];
      }
    });
  }

  private bilerp(grid: Float32Array, u: number, v: number): number {
    const M = this.m;
    const x = (u - Math.floor(u)) * M, z = (v - Math.floor(v)) * M;
    const x0 = Math.floor(x), z0 = Math.floor(z);
    const fx = x - x0, fz = z - z0;
    const x1 = (x0 + 1) % M, z1 = (z0 + 1) % M;
    const a = grid[z0 * M + x0], b = grid[z0 * M + x1], c = grid[z1 * M + x0], d = grid[z1 * M + x1];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  }

  /** Displacement at an undisplaced parameter point. */
  private displacementAt(x0: number, z0: number): [number, number, number] {
    let dx = 0, dy = 0, dz = 0;
    for (const cm of this.cascades) {
      const u = x0 / cm.L, v = z0 / cm.L;
      dx += this.bilerp(cm.dx, u, v);
      dy += this.bilerp(cm.h, u, v);
      dz += this.bilerp(cm.dz, u, v);
    }
    return [dx, dy, dz];
  }

  /** Height/velocity/normal of the (displaced) surface above world point (x, z). */
  sample(x: number, z: number, iterations = 4): SurfaceSample {
    let x0 = x, z0 = z;
    for (let i = 0; i < iterations; i++) {
      const d = this.displacementAt(x0, z0);
      x0 = x - d[0];
      z0 = z - d[2];
    }
    let h = 0, vy = 0, vx = 0, vz = 0;
    for (const cm of this.cascades) {
      const u = x0 / cm.L, v = z0 / cm.L;
      h += this.bilerp(cm.h, u, v);
      vy += this.bilerp(cm.ht, u, v);
      vx += this.bilerp(cm.ux, u, v);
      vz += this.bilerp(cm.uz, u, v);
    }
    // Normal from central differences of the displaced surface.
    const e = 0.35;
    const px = this.displacementAt(x0 + e, z0), mx = this.displacementAt(x0 - e, z0);
    const pz = this.displacementAt(x0, z0 + e), mz = this.displacementAt(x0, z0 - e);
    const tx: [number, number, number] = [2 * e + px[0] - mx[0], px[1] - mx[1], px[2] - mx[2]];
    const tz: [number, number, number] = [pz[0] - mz[0], pz[1] - mz[1], 2 * e + pz[2] - mz[2]];
    const n: [number, number, number] = [
      tz[1] * tx[2] - tz[2] * tx[1],
      tz[2] * tx[0] - tz[0] * tx[2],
      tz[0] * tx[1] - tz[1] * tx[0],
    ];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return { height: h, vy, vx, vz, normal: [n[0] / l, n[1] / l, n[2] / l], x0, z0 };
  }

  /** Jacobian of the displaced map at a parameter point (folding ⇒ J < 0). */
  jacobian(x0: number, z0: number): number {
    const e = 0.5;
    const px = this.displacementAt(x0 + e, z0), mx = this.displacementAt(x0 - e, z0);
    const pz = this.displacementAt(x0, z0 + e), mz = this.displacementAt(x0, z0 - e);
    const jxx = 1 + (px[0] - mx[0]) / (2 * e), jzz = 1 + (pz[2] - mz[2]) / (2 * e);
    const jxz = (pz[0] - mz[0]) / (2 * e), jzx = (px[2] - mx[2]) / (2 * e);
    return jxx * jzz - jxz * jzx;
  }

  /** Direct (slow) evaluation of the height at a parameter point by summing modes — test oracle. */
  directHeight(x0: number, z0: number, t: number): number {
    let h = 0;
    for (const cm of this.cascades) {
      for (let o = 0; o < cm.kx.length; o++) {
        const w = cm.omega[o];
        const cs = Math.cos(w * t), sn = Math.sin(w * t);
        const hr = cm.h0re[o] * cs + cm.h0im[o] * sn + cm.hmre[o] * cs - cm.hmim[o] * sn;
        const hi = cm.h0im[o] * cs - cm.h0re[o] * sn + cm.hmim[o] * cs + cm.hmre[o] * sn;
        const ph = cm.kx[o] * x0 + cm.kz[o] * z0;
        h += hr * Math.cos(ph) - hi * Math.sin(ph);
      }
    }
    return h;
  }

  get depthM() {
    return this.depth;
  }
  get loop() {
    return this.loopPeriod;
  }
}
