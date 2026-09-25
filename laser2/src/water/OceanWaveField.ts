// CPU wave field shared by every physics consumer (hull pressure, foils, spars,
// sailcloth, swimmers).
//
// Gerstner waves are Lagrangian: a surface particle with rest coordinates
// (a, b) is displaced to (a + Dx, H, b + Dz), so a height query at a fixed
// world point needs the inverse map. Each time slice is produced in two passes:
//
// 1. Lagrangian pass on a regular rest-coordinate grid using the separable
//    phase identity sin(α_i + β_j) = sin α_i cos β_j + cos α_i sin β_j, which
//    costs O(components · (nx + nz)) trig calls plus O(components · nx · nz)
//    multiply-adds instead of O(components · nx · nz) trig calls.
// 2. Eulerian pass: every world-space node solves the fixed-point inverse
//    (three bilinear iterations on the Lagrangian grid) and stores elevation
//    and water velocity.
//
// Physics queries are then one bilinear lookup blended between two time
// slices (t0, t1 = t0 + dt), keeping the forcing continuous across the XPBD
// sub-steps. Queries outside the window fall back to the exact analytic sum.

import type { WaveComponent } from './OceanSpectrum.js';

const LAG_CHANNELS = 6; // dx, dz, height, vx, vy, vz (rest coordinates)
const EUL_CHANNELS = 4; // height, vx, vy, vz (world coordinates)

export interface WaveSample {
  height: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface OceanFieldStats {
  sliceBuilds: number;
  gridQueries: number;
  analyticQueries: number;
  recenters: number;
  lastSliceMs: number;
  meanSliceMs: number;
}

interface TimeSlice {
  time: number;
  eulerian: Float32Array;
}

export class OceanWaveField {
  components: WaveComponent[] = [];
  /** Wavenumber of the spectral peak, used for depth attenuation of orbital velocity. */
  peakK = 0.8;
  readonly nx: number;
  readonly nz: number;
  readonly spacing: number;
  /** Lagrangian grid border (cells) so the inverse never leaves the rest grid. */
  private readonly border = 3;
  private originX = 0;
  private originZ = 0;
  private readonly lagrangian: Float32Array;
  private sliceA: TimeSlice;
  private sliceB: TimeSlice;
  private blend = 0;
  private valid = false;
  private readonly sinA: Float64Array;
  private readonly cosA: Float64Array;
  private readonly sinB: Float64Array;
  private readonly cosB: Float64Array;
  private readonly scratch = new Float64Array(LAG_CHANNELS);
  readonly stats: OceanFieldStats = { sliceBuilds: 0, gridQueries: 0, analyticQueries: 0, recenters: 0, lastSliceMs: 0, meanSliceMs: 0 };
  /** Uniform vertical offset (m); still-water level. */
  seaLevel = 0;

  constructor(options: { nx?: number; nz?: number; spacing?: number } = {}) {
    this.nx = options.nx ?? 80;
    this.nz = options.nz ?? 80;
    this.spacing = options.spacing ?? 0.28;
    const lx = this.nx + 2 * this.border, lz = this.nz + 2 * this.border;
    this.lagrangian = new Float32Array(lx * lz * LAG_CHANNELS);
    this.sliceA = { time: 0, eulerian: new Float32Array(this.nx * this.nz * EUL_CHANNELS) };
    this.sliceB = { time: -1, eulerian: new Float32Array(this.nx * this.nz * EUL_CHANNELS) };
    this.sinA = new Float64Array(lx);
    this.cosA = new Float64Array(lx);
    this.sinB = new Float64Array(lz);
    this.cosB = new Float64Array(lz);
  }

  /**
   * Replaces the component set. `rebuild` invalidates both time slices (new sea
   * state); cross-fade weight updates pass false so only the next slice picks
   * up the new amplitudes and the grid is not rebuilt every step.
   */
  setComponents(components: WaveComponent[], peakK: number, rebuild = true): void {
    this.components = components.map((c) => ({ ...c }));
    this.peakK = peakK;
    if (rebuild) this.valid = false;
  }

  get extentM(): number { return (this.nx - 1) * this.spacing; }
  get centerX(): number { return this.originX + 0.5 * this.extentM; }
  get centerZ(): number { return this.originZ + 0.5 * this.extentM; }
  get isValid(): boolean { return this.valid; }

  /**
   * Ensures the two time slices cover [t0, t1]. `focusX/Z` recentres the grid
   * (snapped to the spacing) when the region of interest nears an edge.
   */
  advance(t0: number, t1: number, focusX: number, focusZ: number): void {
    const half = 0.5 * this.extentM;
    const margin = 0.3 * this.extentM;
    const recenter = !this.valid ||
      Math.abs(focusX - this.centerX) > half - margin ||
      Math.abs(focusZ - this.centerZ) > half - margin;
    if (recenter) {
      this.originX = Math.round((focusX - half) / this.spacing) * this.spacing;
      this.originZ = Math.round((focusZ - half) / this.spacing) * this.spacing;
      this.buildSlice(this.sliceA, t0);
      this.buildSlice(this.sliceB, t1);
      this.stats.recenters++;
      this.valid = true;
    } else if (Math.abs(t0 - this.sliceB.time) < 1e-9) {
      const swap = this.sliceA;
      this.sliceA = this.sliceB;
      this.sliceB = swap;
      this.buildSlice(this.sliceB, t1);
    } else if (Math.abs(t0 - this.sliceA.time) > 1e-9 || Math.abs(t1 - this.sliceB.time) > 1e-9) {
      this.buildSlice(this.sliceA, t0);
      this.buildSlice(this.sliceB, t1);
    }
    this.blend = 0;
  }

  /** Selects the time inside the current [t0, t1] window used by queries. */
  setQueryTime(t: number): void {
    const span = this.sliceB.time - this.sliceA.time;
    this.blend = span > 1e-9 ? Math.min(1, Math.max(0, (t - this.sliceA.time) / span)) : 0;
  }

  get queryTime(): number { return this.sliceA.time + (this.sliceB.time - this.sliceA.time) * this.blend; }

  private buildSlice(slice: TimeSlice, time: number): void {
    const started = performance.now();
    this.buildLagrangian(time);
    const out = slice.eulerian;
    const s = this.scratch;
    const nx = this.nx;
    for (let j = 0; j < this.nz; j++) {
      const z = this.originZ + j * this.spacing;
      for (let i = 0; i < nx; i++) {
        const x = this.originX + i * this.spacing;
        let a = x, b = z;
        let ok = true;
        for (let iteration = 0; iteration < 3 && ok; iteration++) {
          ok = this.lagrangianLookup(a, b, s, 2);
          if (ok) { a = x - s[0]!; b = z - s[1]!; }
        }
        if (ok) ok = this.lagrangianLookup(a, b, s, LAG_CHANNELS);
        if (!ok) this.analyticSample(x, z, time, s);
        const o = (j * nx + i) * EUL_CHANNELS;
        out[o] = s[2]!;
        out[o + 1] = s[3]!;
        out[o + 2] = s[4]!;
        out[o + 3] = s[5]!;
      }
    }
    slice.time = time;
    this.stats.sliceBuilds++;
    this.stats.lastSliceMs = performance.now() - started;
    this.stats.meanSliceMs += (this.stats.lastSliceMs - this.stats.meanSliceMs) / Math.min(this.stats.sliceBuilds, 120);
  }

  private buildLagrangian(time: number): void {
    const target = this.lagrangian;
    target.fill(0);
    const lx = this.nx + 2 * this.border, lz = this.nz + 2 * this.border;
    const h = this.spacing;
    const x0 = this.originX - this.border * h, z0 = this.originZ - this.border * h;
    const sinA = this.sinA, cosA = this.cosA, sinB = this.sinB, cosB = this.cosB;
    for (const c of this.components) {
      const kx = c.k * c.dirX, kz = c.k * c.dirZ;
      const base = c.phase - c.omega * time;
      for (let i = 0; i < lx; i++) {
        const alpha = kx * (x0 + i * h) + base;
        sinA[i] = Math.sin(alpha);
        cosA[i] = Math.cos(alpha);
      }
      for (let j = 0; j < lz; j++) {
        const beta = kz * (z0 + j * h);
        sinB[j] = Math.sin(beta);
        cosB[j] = Math.cos(beta);
      }
      const A = c.amplitude, QA = c.steepness * c.amplitude;
      const qx = QA * c.dirX, qz = QA * c.dirZ, w = c.omega;
      for (let j = 0; j < lz; j++) {
        const sb = sinB[j]!, cb = cosB[j]!;
        let o = j * lx * LAG_CHANNELS;
        for (let i = 0; i < lx; i++, o += LAG_CHANNELS) {
          const sa = sinA[i]!, ca = cosA[i]!;
          const sn = sa * cb + ca * sb; // sin(θ)
          const cs = ca * cb - sa * sb; // cos(θ)
          target[o] = target[o]! + qx * cs;
          target[o + 1] = target[o + 1]! + qz * cs;
          target[o + 2] = target[o + 2]! + A * sn;
          target[o + 3] = target[o + 3]! + qx * w * sn;
          target[o + 4] = target[o + 4]! - A * w * cs;
          target[o + 5] = target[o + 5]! + qz * w * sn;
        }
      }
    }
  }

  private lagrangianLookup(a: number, b: number, out: Float64Array, channels: number): boolean {
    const lx = this.nx + 2 * this.border, lz = this.nz + 2 * this.border;
    const fx = (a - this.originX) / this.spacing + this.border;
    const fz = (b - this.originZ) / this.spacing + this.border;
    if (!(fx >= 0 && fz >= 0 && fx < lx - 1 && fz < lz - 1)) return false;
    const ix = fx | 0, iz = fz | 0;
    const tx = fx - ix, tz = fz - iz;
    const w00 = (1 - tx) * (1 - tz), w10 = tx * (1 - tz), w01 = (1 - tx) * tz, w11 = tx * tz;
    const o00 = (iz * lx + ix) * LAG_CHANNELS;
    const o10 = o00 + LAG_CHANNELS;
    const o01 = o00 + lx * LAG_CHANNELS;
    const o11 = o01 + LAG_CHANNELS;
    const L = this.lagrangian;
    for (let c = 0; c < channels; c++) out[c] = w00 * L[o00 + c]! + w10 * L[o10 + c]! + w01 * L[o01 + c]! + w11 * L[o11 + c]!;
    return true;
  }

  private eulerianLookup(x: number, z: number, out: Float64Array, channels: number): boolean {
    const fx = (x - this.originX) / this.spacing;
    const fz = (z - this.originZ) / this.spacing;
    if (!(fx >= 0 && fz >= 0 && fx < this.nx - 1 && fz < this.nz - 1)) return false;
    const ix = fx | 0, iz = fz | 0;
    const tx = fx - ix, tz = fz - iz;
    const w00 = (1 - tx) * (1 - tz), w10 = tx * (1 - tz), w01 = (1 - tx) * tz, w11 = tx * tz;
    const o00 = (iz * this.nx + ix) * EUL_CHANNELS;
    const o10 = o00 + EUL_CHANNELS;
    const o01 = o00 + this.nx * EUL_CHANNELS;
    const o11 = o01 + EUL_CHANNELS;
    const A = this.sliceA.eulerian, B = this.sliceB.eulerian, s = this.blend, r = 1 - s;
    for (let c = 0; c < channels; c++) {
      const va = w00 * A[o00 + c]! + w10 * A[o10 + c]! + w01 * A[o01 + c]! + w11 * A[o11 + c]!;
      const vb = w00 * B[o00 + c]! + w10 * B[o10 + c]! + w01 * B[o01 + c]! + w11 * B[o11 + c]!;
      out[c] = va * r + vb * s;
    }
    return true;
  }

  /**
   * Copies the grid elevations (still-water level included) at the end of the
   * current step window into `out` (nx·nz floats, row-major in z). Used by
   * the GPU interaction solver to measure hull immersion against the exact
   * physics surface. Returns false before the first slice exists.
   */
  copyEndHeights(out: Float32Array): boolean {
    if (!this.valid || out.length < this.nx * this.nz) return false;
    const src = this.sliceB.eulerian;
    for (let i = 0, n = this.nx * this.nz; i < n; i++) out[i] = this.seaLevel + src[i * EUL_CHANNELS]!;
    return true;
  }

  get gridOriginX(): number { return this.originX; }
  get gridOriginZ(): number { return this.originZ; }

  /** Surface elevation at world (x, z). */
  height(x: number, z: number): number {
    const s = this.scratch;
    if (this.valid && this.eulerianLookup(x, z, s, 1)) {
      this.stats.gridQueries++;
      return this.seaLevel + s[0]!;
    }
    this.stats.analyticQueries++;
    return this.seaLevel + this.analyticHeight(x, z, this.queryTime);
  }

  /**
   * Elevation and water velocity at (x, y, z). Orbital velocity decays below
   * the local surface with the spectral peak wavenumber (e^{k·(y-η)}).
   */
  sample(x: number, y: number, z: number, out: WaveSample): WaveSample {
    const s = this.scratch;
    let eta: number, vx: number, vy: number, vz: number;
    if (this.valid && this.eulerianLookup(x, z, s, EUL_CHANNELS)) {
      this.stats.gridQueries++;
      eta = s[0]!; vx = s[1]!; vy = s[2]!; vz = s[3]!;
    } else {
      this.stats.analyticQueries++;
      this.analyticSample(x, z, this.queryTime, s);
      eta = s[2]!; vx = s[3]!; vy = s[4]!; vz = s[5]!;
    }
    eta += this.seaLevel;
    const decay = Math.exp(this.peakK * Math.min(0, y - eta));
    out.height = eta;
    out.vx = vx * decay;
    out.vy = vy * decay;
    out.vz = vz * decay;
    return out;
  }

  /** Exact analytic elevation (fixed-point inverse of the Gerstner map). */
  analyticHeight(x: number, z: number, time: number): number {
    let a = x, b = z;
    for (let iteration = 0; iteration < 4; iteration++) {
      let dx = 0, dz = 0;
      for (const c of this.components) {
        const th = c.k * (c.dirX * a + c.dirZ * b) - c.omega * time + c.phase;
        const co = Math.cos(th) * c.steepness * c.amplitude;
        dx += co * c.dirX;
        dz += co * c.dirZ;
      }
      a = x - dx;
      b = z - dz;
    }
    let height = 0;
    for (const c of this.components) height += c.amplitude * Math.sin(c.k * (c.dirX * a + c.dirZ * b) - c.omega * time + c.phase);
    return height;
  }

  /** Analytic channels in Lagrangian layout (dx, dz, h, vx, vy, vz) at world (x, z). */
  analyticSample(x: number, z: number, time: number, out: Float64Array): void {
    let a = x, b = z;
    for (let iteration = 0; iteration < 4; iteration++) {
      let dx = 0, dz = 0;
      for (const c of this.components) {
        const th = c.k * (c.dirX * a + c.dirZ * b) - c.omega * time + c.phase;
        const co = Math.cos(th) * c.steepness * c.amplitude;
        dx += co * c.dirX;
        dz += co * c.dirZ;
      }
      a = x - dx;
      b = z - dz;
    }
    let o0 = 0, o1 = 0, o2 = 0, o3 = 0, o4 = 0, o5 = 0;
    for (const c of this.components) {
      const th = c.k * (c.dirX * a + c.dirZ * b) - c.omega * time + c.phase;
      const s = Math.sin(th), co = Math.cos(th);
      const QA = c.steepness * c.amplitude;
      o0 += QA * c.dirX * co;
      o1 += QA * c.dirZ * co;
      o2 += c.amplitude * s;
      o3 += QA * c.dirX * c.omega * s;
      o4 -= c.amplitude * c.omega * co;
      o5 += QA * c.dirZ * c.omega * s;
    }
    out[0] = o0; out[1] = o1; out[2] = o2; out[3] = o3; out[4] = o4; out[5] = o5;
  }
}
