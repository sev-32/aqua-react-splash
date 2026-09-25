/**
 * Cascade layout, deterministic noise, and spectral statistics.
 *
 * Cascades PARTITION wavenumber space: cascade c owns |k| ∈ [kLo_c, kHi_c).
 * Boundaries sit at `boundaryFactor` fundamentals of the next (finer) cascade,
 * so each band is represented by the cascade that samples it best and no
 * energy is counted twice (a defect of the R9 layout).
 */
import { hashSeed, mulberry32, gaussianPair } from '../math/rng';
import { lgamma } from '../math/scalar';
import {
  prepareSystem, systemSpectrum, dispersion, groupVelocity, coxMunk, kFromOmega,
  type SystemEval, type WaveSystem,
} from './physics';

export interface CascadeLayout {
  n: number;
  sizes: number[];
  kLo: number[];
  kHi: number[];
}

export const DEFAULT_CASCADE_SIZES = [1379, 263, 17.9];

export function makeLayout(n: number, sizes: number[] = DEFAULT_CASCADE_SIZES, boundaryFactor = 6): CascadeLayout {
  const kLo: number[] = [], kHi: number[] = [];
  for (let c = 0; c < sizes.length; c++) {
    kLo.push(c === 0 ? 0 : kHi[c - 1]);
    if (c === sizes.length - 1) kHi.push(Infinity);
    else {
      const b = (boundaryFactor * 2 * Math.PI) / sizes[c + 1];
      const nyq = (Math.PI * n) / sizes[c];
      kHi.push(Math.min(b, nyq * 0.9));
    }
  }
  return { n, sizes: [...sizes], kLo, kHi };
}

/** Highest wavenumber any cascade resolves (Nyquist of the finest). */
export const layoutKMax = (l: CascadeLayout) => (Math.PI * l.n) / l.sizes[l.sizes.length - 1];
export const layoutKMin = (l: CascadeLayout) => (2 * Math.PI) / l.sizes[0];

/**
 * Per-mode complex Gaussian ξ = (g1 + i g2)/√2 for every (cascade, ix, iz),
 * packed as an RG atlas of width C·N. Order-independent: each mode hashes its
 * own seed, so any subset (the CPU mirror) reproduces the same values.
 */
export function modeNoise(seed: number, c: number, ix: number, iz: number): [number, number] {
  const r = mulberry32(hashSeed(seed, c, ix, iz));
  const [g1, g2] = gaussianPair(r);
  return [g1 * Math.SQRT1_2, g2 * Math.SQRT1_2];
}

export function generateNoiseAtlas(seed: number, layout: CascadeLayout): Float32Array {
  const { n } = layout;
  const C = layout.sizes.length;
  const w = n * C;
  const out = new Float32Array(w * n * 2);
  for (let c = 0; c < C; c++)
    for (let iz = 0; iz < n; iz++)
      for (let ix = 0; ix < n; ix++) {
        const [a, b] = modeNoise(seed, c, ix, iz);
        const o = (iz * w + c * n + ix) * 2;
        out[o] = a;
        out[o + 1] = b;
      }
  return out;
}

/** 1D LUT of the spreading normalisation N(s), s = 128·u², u ∈ [0,1]. Sampled by the GPU h0 pass. */
export const SPREAD_LUT_SIZE = 256;
export const SPREAD_LUT_MAX_S = 128;
export function spreadingNormLUT(): Float32Array {
  const out = new Float32Array(SPREAD_LUT_SIZE);
  for (let i = 0; i < SPREAD_LUT_SIZE; i++) {
    const u = i / (SPREAD_LUT_SIZE - 1);
    const s = SPREAD_LUT_MAX_S * u * u;
    out[i] = Math.exp((2 * s - 1) * Math.LN2 + 2 * lgamma(s + 1) - lgamma(2 * s + 1)) / Math.PI;
  }
  return out;
}

/* ─────────────────────────── spectral model ─────────────────────────── */

/** A (possibly morphing) spectrum: E = (1-t)·E_A + t·E_B. */
export interface SpectrumModel {
  a: SystemEval[];
  b: SystemEval[];
  t: number;
  depth: number;
}

export function makeSpectrumModel(a: WaveSystem[], b: WaveSystem[], t: number, depth: number): SpectrumModel {
  return { a: a.map(prepareSystem), b: b.map(prepareSystem), t, depth };
}

/** Directional frequency spectrum of the model at (ω, θ). */
function modelSpectrum(m: SpectrumModel, w: number, theta: number): number {
  let ea = 0, eb = 0;
  if (m.t < 1) for (const s of m.a) ea += systemSpectrum(s, w, theta, m.depth);
  if (m.t > 0) for (const s of m.b) eb += systemSpectrum(s, w, theta, m.depth);
  return ea * (1 - m.t) + eb * m.t;
}

/** E(kx,kz): ∫∫ E dkx dkz = m0. Mirrors the GPU h0 shader. */
export function modelWavenumberSpectrum(m: SpectrumModel, kx: number, kz: number): number {
  const k = Math.hypot(kx, kz);
  if (k < 1e-9) return 0;
  const w = dispersion(k, m.depth);
  const cg = groupVelocity(k, m.depth);
  return (modelSpectrum(m, w, Math.atan2(kz, kx)) * cg) / k;
}

/* ─────────────────────── slope statistics / LUT ─────────────────────── */

export const SLOPE_LUT_SIZE = 256;

export interface SpectralStats {
  /** RGBA per entry: slope covariance (xx, zz, xz, trace) of all waves with |k| > kcut, + unresolved tail. */
  slopeLut: Float32Array;
  logKMin: number;
  logKMax: number;
  /** Resolved height variance and significant wave height. */
  m0: number;
  hs: number;
  /** Peak period of the summed spectrum (s) and its wavelength at depth (m). */
  tp: number;
  peakWavelength: number;
  /** Unresolved (sub-cascade) slope covariance added everywhere — Cox–Munk calibrated. */
  tail: { xx: number; zz: number; xz: number };
  /** Energy fraction per cascade (diagnostics). */
  cascadeEnergy: number[];
}

/**
 * Integrate the model in polar coordinates to build the slope-variance LUT.
 * The integral is taken over the band the cascades actually resolve; the
 * remainder up to the Cox–Munk total is the sub-grid "tail" that roughness
 * must carry even at point-blank range (the sea is never a perfect mirror).
 */
export function computeSpectralStats(
  m: SpectrumModel,
  layout: CascadeLayout,
  wind: { speed: number; directionDeg: number },
  kSamples = 384,
  thetaSamples = 64,
): SpectralStats {
  const kMin = layoutKMin(layout);
  const kMax = layoutKMax(layout);
  const logMin = Math.log(kMin), logMax = Math.log(kMax);
  const dlog = (logMax - logMin) / kSamples;
  const dth = (2 * Math.PI) / thetaSamples;
  const binXX = new Float64Array(kSamples), binZZ = new Float64Array(kSamples), binXZ = new Float64Array(kSamples);
  const cascadeEnergy = layout.sizes.map(() => 0);
  const cosT = new Float64Array(thetaSamples), sinT = new Float64Array(thetaSamples);
  for (let j = 0; j < thetaSamples; j++) { cosT[j] = Math.cos((j + 0.5) * dth); sinT[j] = Math.sin((j + 0.5) * dth); }
  let m0 = 0;
  let bestW = 0, bestS = 0;
  for (let i = 0; i < kSamples; i++) {
    const k = Math.exp(logMin + (i + 0.5) * dlog);
    const dk = k * dlog;
    const w = dispersion(k, m.depth);
    const cg = groupVelocity(k, m.depth);
    let sxx = 0, szz = 0, sxz = 0, sOmni = 0;
    for (let j = 0; j < thetaSamples; j++) {
      // E(k,θ)·k dk dθ  with  E(k,θ) = S(ω,θ)·cg/k
      const e = modelSpectrum(m, w, (j + 0.5) * dth) * cg * dth * dk;
      sOmni += e;
      sxx += e * k * k * cosT[j] * cosT[j];
      szz += e * k * k * sinT[j] * sinT[j];
      sxz += e * k * k * cosT[j] * sinT[j];
    }
    binXX[i] = sxx; binZZ[i] = szz; binXZ[i] = sxz;
    m0 += sOmni;
    const c = layout.kHi.findIndex((hi) => k < hi);
    if (c >= 0) cascadeEnergy[c] += sOmni;
    // S(ω) = E_omni / (dω) — find spectral peak in frequency.
    const sw = sOmni / Math.max(cg * dk, 1e-12);
    if (sw > bestS) { bestS = sw; bestW = w; }
  }
  // Cumulative from the top: covariance of all waves above cutoff.
  const cumXX = new Float64Array(kSamples + 1), cumZZ = new Float64Array(kSamples + 1), cumXZ = new Float64Array(kSamples + 1);
  for (let i = kSamples - 1; i >= 0; i--) {
    cumXX[i] = cumXX[i + 1] + binXX[i];
    cumZZ[i] = cumZZ[i + 1] + binZZ[i];
    cumXZ[i] = cumXZ[i + 1] + binXZ[i];
  }
  // Cox–Munk calibrated tail in the wind frame.
  const cm = coxMunk(wind.speed);
  const wd = (wind.directionDeg * Math.PI) / 180;
  const cw = Math.cos(wd), sw2 = Math.sin(wd);
  const resUU = cw * cw * cumXX[0] + 2 * cw * sw2 * cumXZ[0] + sw2 * sw2 * cumZZ[0];
  const resCC = sw2 * sw2 * cumXX[0] - 2 * cw * sw2 * cumXZ[0] + cw * cw * cumZZ[0];
  const tailU = Math.max(cm.upwind - resUU, 0.12 * cm.upwind + 0.0004);
  const tailC = Math.max(cm.crosswind - resCC, 0.12 * cm.crosswind + 0.0004);
  const tail = {
    xx: cw * cw * tailU + sw2 * sw2 * tailC,
    zz: sw2 * sw2 * tailU + cw * cw * tailC,
    xz: cw * sw2 * (tailU - tailC),
  };
  const lut = new Float32Array(SLOPE_LUT_SIZE * 4);
  for (let i = 0; i < SLOPE_LUT_SIZE; i++) {
    const f = (i / (SLOPE_LUT_SIZE - 1)) * kSamples;
    const i0 = Math.min(Math.floor(f), kSamples), i1 = Math.min(i0 + 1, kSamples), t = f - i0;
    const xx = cumXX[i0] * (1 - t) + cumXX[i1] * t + tail.xx;
    const zz = cumZZ[i0] * (1 - t) + cumZZ[i1] * t + tail.zz;
    const xz = cumXZ[i0] * (1 - t) + cumXZ[i1] * t + tail.xz;
    lut.set([xx, zz, xz, xx + zz], i * 4);
  }
  const tp = bestW > 0 ? (2 * Math.PI) / bestW : 0;
  return {
    slopeLut: lut,
    logKMin: logMin,
    logKMax: logMax,
    m0,
    hs: 4 * Math.sqrt(Math.max(m0, 0)),
    tp,
    peakWavelength: bestW > 0 ? (2 * Math.PI) / kFromOmega(bestW, m.depth) : 0,
    tail,
    cascadeEnergy,
  };
}

/* ───────────────────────────── mode access ───────────────────────────── */

/** Wavenumber of texel (ix, iz) in cascade c (FFT order). */
export function modeK(layout: CascadeLayout, c: number, ix: number, iz: number): [number, number] {
  const n = layout.n;
  const fx = ix < n / 2 ? ix : ix - n;
  const fz = iz < n / 2 ? iz : iz - n;
  const s = (2 * Math.PI) / layout.sizes[c];
  return [fx * s, fz * s];
}

/** True if the mode is inside cascade c's band (and not the Nyquist row/column). */
export function modeInBand(layout: CascadeLayout, c: number, ix: number, iz: number): boolean {
  const n = layout.n;
  if (ix === n / 2 || iz === n / 2) return false;
  if (ix === 0 && iz === 0) return false;
  const [kx, kz] = modeK(layout, c, ix, iz);
  const k = Math.hypot(kx, kz);
  return k >= layout.kLo[c] && k < layout.kHi[c];
}

/**
 * Initial amplitude h0(k) = ξ(k)·sqrt(E(k)·Δk²/2) for one mode — the CPU twin
 * of the GPU h0 pass (used by the spectral mirror and by tests).
 */
export function modeH0(m: SpectrumModel, layout: CascadeLayout, seed: number, c: number, ix: number, iz: number): [number, number] {
  if (!modeInBand(layout, c, ix, iz)) return [0, 0];
  const [kx, kz] = modeK(layout, c, ix, iz);
  const dk = (2 * Math.PI) / layout.sizes[c];
  const amp = Math.sqrt((modelWavenumberSpectrum(m, kx, kz) * dk * dk) / 2);
  const [a, b] = modeNoise(seed, c, ix, iz);
  return [a * amp, b * amp];
}
