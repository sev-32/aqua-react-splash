/**
 * Cascade families — the spectral authority of the open sea, carried over from
 * POSEIDON R6.4/R7 (the accepted look): each cascade holds one authored wave
 * family (remote swell, wind sea, close chop) with its own band, peak, spread,
 * crossing secondary system and horizontal crop. Bands overlap on purpose —
 * that overlap is part of the R7 character (swell groups carrying a live wind
 * sea carrying dense chop), so it is kept, not "corrected".
 *
 * One energy function, three consumers kept exactly in step:
 *   GPU h0 pass (spectrumShaders FAMILY_GLSL) · CPU spectral mirror (buoyancy)
 *   · statistics + slope-moment LUT (roughness of what a pixel cannot resolve).
 */
import { G } from '../math/scalar';
import type { CascadeLayout } from './cascades';

export interface FamilyCascade {
  name: string;
  size: number;
  strength: number;
  crop: number;             // POSEIDON sign: negative = crests sharpen (λ = −crop)
  minWave: number; maxWave: number;
  directionDeg: number;
  windSpeed: number;        // spectral shape parameter (low-k cutoff L = U²/g), not U10
  alignment: number;
  peakWave: number;
  peakEnhancement: number;
  bandwidth: number;
  floor: number;
  secondaryDirectionDeg: number;
  secondaryStrength: number;
  secondaryAlignment: number;
  secondaryPeakWave: number;
  secondaryBandwidth: number;
}

type F = Omit<FamilyCascade, 'name'>;
const swell = (f: F): FamilyCascade => ({ name: 'remote swell', ...f });
const windSea = (f: F): FamilyCascade => ({ name: 'wind sea', ...f });
const chop = (f: F): FamilyCascade => ({ name: 'close chop', ...f });

/** POSEIDON SEA_STATE_LIBRARY (glassy calm → heavy storm), index-aligned with SEA_STATES. */
export const FAMILY_LIBRARY: FamilyCascade[][] = [
  [ // glassy calm
    swell({ size: 1400, strength: .008, crop: -.18, minWave: 45, maxWave: 1000, directionDeg: 20, windSpeed: 8, alignment: 42, peakWave: 300, peakEnhancement: 10, bandwidth: .18, floor: .003, secondaryDirectionDeg: 82, secondaryStrength: .05, secondaryAlignment: 48, secondaryPeakWave: 130, secondaryBandwidth: .18 }),
    windSea({ size: 280, strength: .012, crop: -.14, minWave: 4, maxWave: 170, directionDeg: 28, windSpeed: 3.5, alignment: 12, peakWave: 44, peakEnhancement: 2.2, bandwidth: .34, floor: .006, secondaryDirectionDeg: 105, secondaryStrength: .02, secondaryAlignment: 18, secondaryPeakWave: 18, secondaryBandwidth: .30 }),
    chop({ size: 18, strength: .010, crop: -.08, minWave: .28, maxWave: 12, directionDeg: 30, windSpeed: 2.5, alignment: 7, peakWave: 3.8, peakEnhancement: .8, bandwidth: .58, floor: .015, secondaryDirectionDeg: 112, secondaryStrength: .02, secondaryAlignment: 9, secondaryPeakWave: 1.0, secondaryBandwidth: .46 }),
  ],
  [ // light breeze
    swell({ size: 1400, strength: .015, crop: -.25, minWave: 42, maxWave: 950, directionDeg: 22, windSpeed: 10, alignment: 34, peakWave: 240, peakEnhancement: 8.5, bandwidth: .21, floor: .005, secondaryDirectionDeg: 86, secondaryStrength: .08, secondaryAlignment: 40, secondaryPeakWave: 110, secondaryBandwidth: .20 }),
    windSea({ size: 280, strength: .055, crop: -.34, minWave: 3.8, maxWave: 160, directionDeg: 31, windSpeed: 6.5, alignment: 9, peakWave: 34, peakEnhancement: 2.8, bandwidth: .40, floor: .012, secondaryDirectionDeg: 108, secondaryStrength: .04, secondaryAlignment: 14, secondaryPeakWave: 15, secondaryBandwidth: .34 }),
    chop({ size: 18, strength: .115, crop: -.30, minWave: .25, maxWave: 11, directionDeg: 34, windSpeed: 5.5, alignment: 5.5, peakWave: 2.7, peakEnhancement: 1.0, bandwidth: .65, floor: .03, secondaryDirectionDeg: 118, secondaryStrength: .05, secondaryAlignment: 7, secondaryPeakWave: .82, secondaryBandwidth: .50 }),
  ],
  [ // gentle swell
    swell({ size: 1400, strength: .042, crop: -.52, minWave: 38, maxWave: 900, directionDeg: 23, windSpeed: 16, alignment: 25, peakWave: 190, peakEnhancement: 9.5, bandwidth: .23, floor: .008, secondaryDirectionDeg: 77, secondaryStrength: .18, secondaryAlignment: 31, secondaryPeakWave: 96, secondaryBandwidth: .22 }),
    windSea({ size: 280, strength: .14, crop: -.58, minWave: 3.5, maxWave: 155, directionDeg: 34, windSpeed: 9, alignment: 7.2, peakWave: 36, peakEnhancement: 3.4, bandwidth: .43, floor: .022, secondaryDirectionDeg: 104, secondaryStrength: .07, secondaryAlignment: 10, secondaryPeakWave: 14, secondaryBandwidth: .38 }),
    chop({ size: 18, strength: .30, crop: -.52, minWave: .23, maxWave: 11, directionDeg: 38, windSpeed: 7.2, alignment: 4.2, peakWave: 2.8, peakEnhancement: 1.25, bandwidth: .68, floor: .055, secondaryDirectionDeg: 123, secondaryStrength: .10, secondaryAlignment: 5.5, secondaryPeakWave: .80, secondaryBandwidth: .53 }),
  ],
  [ // moderate (POSEIDON "current best medium")
    swell({ size: 1400, strength: .065, crop: -.72, minWave: 34, maxWave: 850, directionDeg: 24.25, windSpeed: 24, alignment: 18, peakWave: 210, peakEnhancement: 9, bandwidth: .27, floor: .012, secondaryDirectionDeg: 76.1, secondaryStrength: .32, secondaryAlignment: 28, secondaryPeakWave: 92, secondaryBandwidth: .23 }),
    windSea({ size: 280, strength: .45, crop: -1.08, minWave: 3.2, maxWave: 150, directionDeg: 34.8, windSpeed: 13.5, alignment: 5.2, peakWave: 31, peakEnhancement: 4.2, bandwidth: .48, floor: .035, secondaryDirectionDeg: 98.6, secondaryStrength: .12, secondaryAlignment: 8, secondaryPeakWave: 12, secondaryBandwidth: .42 }),
    chop({ size: 18, strength: .90, crop: -.92, minWave: .22, maxWave: 11, directionDeg: 41.3, windSpeed: 10.5, alignment: 2.8, peakWave: 2.6, peakEnhancement: 1.6, bandwidth: .72, floor: .09, secondaryDirectionDeg: 114.8, secondaryStrength: .18, secondaryAlignment: 3.8, secondaryPeakWave: .74, secondaryBandwidth: .58 }),
  ],
  [ // fresh sea
    swell({ size: 1400, strength: .082, crop: -.80, minWave: 32, maxWave: 950, directionDeg: 20, windSpeed: 27, alignment: 16, peakWave: 240, peakEnhancement: 8.5, bandwidth: .29, floor: .015, secondaryDirectionDeg: 82, secondaryStrength: .38, secondaryAlignment: 21, secondaryPeakWave: 104, secondaryBandwidth: .27 }),
    windSea({ size: 280, strength: .68, crop: -1.18, minWave: 2.8, maxWave: 150, directionDeg: 39, windSpeed: 16, alignment: 4.2, peakWave: 25, peakEnhancement: 4.8, bandwidth: .52, floor: .045, secondaryDirectionDeg: 111, secondaryStrength: .18, secondaryAlignment: 6.5, secondaryPeakWave: 10, secondaryBandwidth: .47 }),
    chop({ size: 18, strength: 1.10, crop: -1.02, minWave: .20, maxWave: 10, directionDeg: 44, windSpeed: 13, alignment: 2.3, peakWave: 2.15, peakEnhancement: 1.9, bandwidth: .77, floor: .11, secondaryDirectionDeg: 126, secondaryStrength: .24, secondaryAlignment: 3.2, secondaryPeakWave: .64, secondaryBandwidth: .63 }),
  ],
  [ // rough sea
    swell({ size: 1400, strength: .125, crop: -.92, minWave: 28, maxWave: 1100, directionDeg: 18, windSpeed: 31, alignment: 13, peakWave: 285, peakEnhancement: 8.0, bandwidth: .34, floor: .019, secondaryDirectionDeg: 88, secondaryStrength: .48, secondaryAlignment: 16, secondaryPeakWave: 126, secondaryBandwidth: .31 }),
    windSea({ size: 280, strength: .92, crop: -1.30, minWave: 2.5, maxWave: 145, directionDeg: 43, windSpeed: 19, alignment: 3.4, peakWave: 20, peakEnhancement: 5.2, bandwidth: .58, floor: .060, secondaryDirectionDeg: 122, secondaryStrength: .25, secondaryAlignment: 5.0, secondaryPeakWave: 8.5, secondaryBandwidth: .54 }),
    chop({ size: 18, strength: 1.28, crop: -1.10, minWave: .18, maxWave: 9.5, directionDeg: 48, windSpeed: 16, alignment: 1.9, peakWave: 1.75, peakEnhancement: 2.1, bandwidth: .82, floor: .14, secondaryDirectionDeg: 136, secondaryStrength: .32, secondaryAlignment: 2.7, secondaryPeakWave: .56, secondaryBandwidth: .70 }),
  ],
  [ // storm swell
    swell({ size: 1400, strength: .19, crop: -1.04, minWave: 25, maxWave: 1250, directionDeg: 15, windSpeed: 36, alignment: 10, peakWave: 340, peakEnhancement: 7.2, bandwidth: .39, floor: .024, secondaryDirectionDeg: 94, secondaryStrength: .62, secondaryAlignment: 12, secondaryPeakWave: 152, secondaryBandwidth: .36 }),
    windSea({ size: 280, strength: 1.20, crop: -1.42, minWave: 2.2, maxWave: 140, directionDeg: 47, windSpeed: 23, alignment: 2.8, peakWave: 16, peakEnhancement: 5.7, bandwidth: .64, floor: .080, secondaryDirectionDeg: 132, secondaryStrength: .34, secondaryAlignment: 4.0, secondaryPeakWave: 7.0, secondaryBandwidth: .61 }),
    chop({ size: 18, strength: 1.42, crop: -1.16, minWave: .16, maxWave: 9, directionDeg: 52, windSpeed: 19, alignment: 1.55, peakWave: 1.42, peakEnhancement: 2.35, bandwidth: .88, floor: .18, secondaryDirectionDeg: 144, secondaryStrength: .40, secondaryAlignment: 2.15, secondaryPeakWave: .49, secondaryBandwidth: .78 }),
  ],
  [ // heavy storm
    swell({ size: 1400, strength: .28, crop: -1.16, minWave: 22, maxWave: 1350, directionDeg: 12, windSpeed: 42, alignment: 7.5, peakWave: 430, peakEnhancement: 6.5, bandwidth: .46, floor: .032, secondaryDirectionDeg: 101, secondaryStrength: .78, secondaryAlignment: 8.5, secondaryPeakWave: 190, secondaryBandwidth: .42 }),
    windSea({ size: 280, strength: 1.50, crop: -1.55, minWave: 1.9, maxWave: 135, directionDeg: 53, windSpeed: 29, alignment: 2.15, peakWave: 12, peakEnhancement: 6.0, bandwidth: .72, floor: .105, secondaryDirectionDeg: 141, secondaryStrength: .46, secondaryAlignment: 3.0, secondaryPeakWave: 5.5, secondaryBandwidth: .68 }),
    chop({ size: 18, strength: 1.62, crop: -1.24, minWave: .14, maxWave: 8.5, directionDeg: 59, windSpeed: 24, alignment: 1.25, peakWave: 1.05, peakEnhancement: 2.6, bandwidth: .96, floor: .22, secondaryDirectionDeg: 151, secondaryStrength: .52, secondaryAlignment: 1.75, secondaryPeakWave: .40, secondaryBandwidth: .86 }),
  ],
];

/** Cascade sizes every family state uses (POSEIDON: remote swell / wind sea / close chop). */
export const FAMILY_SIZES = [1400, 280, 18];

export interface FamilyControls {
  energy: number; swell: number; windSea: number; chop: number;
  windSpeed: number; directionOffsetDeg: number; spread: number; crossSea: number;
}

/** Resolved per-cascade parameters in shader units (k-space, radians, strength·0.081/L²). */
export interface FamilyEval {
  size: number;
  A: number; ws: number; dir: [number, number]; alignment: number; kp: number; pe: number; bw: number; floor: number;
  secA: number; secDir: [number, number]; secAlignment: number; secKp: number; secBw: number;
  kMin: number; kMax: number;
  /** λ = −crop: horizontal displacement gain (Tessendorf convention). */
  chop: number;
  dirDeg: number;
}

export interface FamilyModel {
  cascades: FamilyEval[];
  depth: number;
}

const wrapDeg = (v: number) => ((v % 360) + 360) % 360;
const lerpAngle = (a: number, b: number, t: number) => wrapDeg(a + ((((b - a + 540) % 360) - 180) * t));
const unit = (deg: number): [number, number] => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

/** Interpolate two library states parameter-wise (POSEIDON interpolateCascade) and apply the controls. */
export function makeFamilyModel(a: FamilyCascade[], b: FamilyCascade[], t: number, c: FamilyControls, depth: number, choppiness = 1): FamilyModel {
  const cascades = a.map((fa, i) => {
    const fb = b[i];
    const L = (x: number, y: number) => x + (y - x) * t;
    const familyScale = i === 0 ? c.swell : i === 1 ? c.windSea : c.chop;
    const scale = Math.max(c.energy * familyScale, 0);
    const size = L(fa.size, fb.size);
    const strength = L(fa.strength, fb.strength) * scale;
    const crop = L(fa.crop, fb.crop) * Math.sqrt(Math.max(0.05, scale)) * choppiness;
    const sp = Math.max(0.2, c.spread);
    const dirDeg = lerpAngle(fa.directionDeg, fb.directionDeg, t) + c.directionOffsetDeg;
    return {
      size,
      A: (strength * 0.081) / (size * size),
      ws: L(fa.windSpeed, fb.windSpeed) * c.windSpeed,
      dir: unit(dirDeg),
      alignment: Math.max(0.45, L(fa.alignment, fb.alignment) / sp),
      kp: (2 * Math.PI) / L(fa.peakWave, fb.peakWave),
      pe: L(fa.peakEnhancement, fb.peakEnhancement),
      bw: Math.min(1.5, L(fa.bandwidth, fb.bandwidth) * c.spread),
      floor: Math.min(0.45, L(fa.floor, fb.floor) * c.spread),
      secA: (strength * 0.081 * L(fa.secondaryStrength, fb.secondaryStrength) * c.crossSea) / (size * size),
      secDir: unit(lerpAngle(fa.secondaryDirectionDeg, fb.secondaryDirectionDeg, t) + c.directionOffsetDeg),
      secAlignment: Math.max(0.4, L(fa.secondaryAlignment, fb.secondaryAlignment) / sp),
      secKp: (2 * Math.PI) / L(fa.secondaryPeakWave, fb.secondaryPeakWave),
      secBw: Math.min(1.5, L(fa.secondaryBandwidth, fb.secondaryBandwidth) * c.spread),
      kMin: (2 * Math.PI) / L(fa.maxWave, fb.maxWave),
      kMax: (2 * Math.PI) / L(fa.minWave, fb.minWave),
      chop: -crop,
      dirDeg,
    } satisfies FamilyEval;
  });
  return { cascades, depth };
}

/* ── the one energy function (GLSL twin: FAMILY_GLSL in ocean/spectrumShaders.ts) ── */

function peakShape(k: number, kp: number, bw: number) {
  const x = Math.log(Math.max(k, 1e-6) / Math.max(kp, 1e-6));
  return Math.exp((-0.5 * x * x) / Math.max(bw * bw, 0.0025));
}
function dirWeight(kx: number, kz: number, k: number, d: [number, number], a: number, floor: number) {
  const c = Math.max((kx * d[0] + kz * d[1]) / k, 0);
  return Math.max(floor, Math.pow(c, Math.max(a, 0.01)));
}
function lobe(kx: number, kz: number, A: number, ws: number, d: [number, number], al: number, kp: number, pe: number, bw: number, floor: number) {
  const k2 = kx * kx + kz * kz;
  if (k2 < 1e-12 || A <= 0) return 0;
  const k = Math.sqrt(k2), L = Math.max((ws * ws) / G, 0.1);
  const base = (A / (k2 * k2)) * Math.exp(-1 / Math.max(k2 * L * L, 1e-8)) * 0.5;
  return Math.max(base * Math.exp(-k2 * 0.00016) * (1 + pe * peakShape(k, kp, bw)) * dirWeight(kx, kz, k, d, al, floor), 0);
}

/** POSEIDON family energy of cascade `f` at wavevector k (per-mode, before the Gaussian draw). */
export function familyEnergy(f: FamilyEval, kx: number, kz: number): number {
  const k = Math.hypot(kx, kz);
  if (k < f.kMin || k >= f.kMax) return 0; // same band test as the GPU inBand()
  let e = lobe(kx, kz, f.A, f.ws, f.dir, f.alignment, f.kp, f.pe, f.bw, f.floor);
  if (f.secA > 0) e += lobe(kx, kz, f.secA, f.ws, f.secDir, f.secAlignment, f.secKp, f.pe * 0.75, f.secBw, f.floor * 0.7);
  return e;
}

/**
 * Mode amplitude with unit-variance complex noise ξ (E|ξ|² = 1): POSEIDON draws
 * two unit normals per mode (E|g|² = 2), so its h0 has variance 2·energy.
 */
export const familyAmplitude = (f: FamilyEval, kx: number, kz: number) => Math.sqrt(2 * familyEnergy(f, kx, kz));

/** Wavenumber of texel (ix, iz) (FFT order) for cascade size L. */
const freq = (i: number, n: number) => (i < n / 2 ? i : i - n);

export interface FamilyStats {
  slopeLut: Float32Array;
  logKMin: number; logKMax: number;
  m0: number; hs: number; tp: number; peakWavelength: number;
  cascadeEnergy: number[];
  meanDirDeg: number;
}

/**
 * Height variance, peak and the slope-moment LUT, summed over the actual grid
 * modes (POSEIDON buildSlopeMomentLUT, on expected rather than drawn energies
 * so it does not flicker with the seed). LUT entry i: covariance of all modes
 * with |k| above the i-th log-spaced cutoff.
 */
export function familyStats(model: FamilyModel, layout: CascadeLayout, lutSize = 256): FamilyStats {
  const n = layout.n;
  const modes: { k: number; kx: number; kz: number; v: number }[] = [];
  const cascadeEnergy: number[] = [];
  let m0 = 0, dx = 0, dz = 0;
  const bins = new Map<number, number>();
  model.cascades.forEach((f, c) => {
    const dk = (2 * Math.PI) / layout.sizes[c];
    let ec = 0;
    for (let iz = 0; iz < n; iz++)
      for (let ix = 0; ix < n; ix++) {
        if (ix === n / 2 || iz === n / 2 || (ix === 0 && iz === 0)) continue;
        const kx = freq(ix, n) * dk, kz = freq(iz, n) * dk;
        const e = familyEnergy(f, kx, kz);
        if (e <= 0) continue;
        // Mode variance: E|ĥ(k)|² gets 2e from h0(k) and 2e(−k) from h0(−k); summed over ±k → 4·Σe.
        const v = 4 * e;
        const k = Math.hypot(kx, kz);
        modes.push({ k, kx, kz, v });
        ec += v;
        dx += (kx / k) * v; dz += (kz / k) * v;
        const b = Math.round(Math.log(k) * 24);
        bins.set(b, (bins.get(b) ?? 0) + v / k);
      }
    cascadeEnergy.push(ec);
    m0 += ec;
  });
  let kMin = Infinity, kMax = 0;
  for (const m of modes) { kMin = Math.min(kMin, m.k); kMax = Math.max(kMax, m.k); }
  if (!modes.length) { kMin = 1e-3; kMax = 1; }
  const logKMin = Math.log(Math.max(kMin, 1e-5)), logKMax = Math.log(Math.max(kMax, kMin * 1.0001));
  // Cumulative moments from the top via sorted modes.
  modes.sort((a, b) => b.k - a.k);
  const lut = new Float32Array(lutSize * 4);
  let j = 0, xx = 0, zz = 0, xz = 0;
  for (let i = lutSize - 1; i >= 0; i--) {
    const cut = Math.exp(logKMin + ((logKMax - logKMin) * i) / (lutSize - 1));
    while (j < modes.length && modes[j].k > cut) {
      const m = modes[j++];
      xx += m.kx * m.kx * m.v; zz += m.kz * m.kz * m.v; xz += m.kx * m.kz * m.v;
    }
    lut.set([xx, zz, xz, xx + zz], i * 4);
  }
  // Peak of the omnidirectional spectrum per unit k (log bins).
  let best = 0, bestK = 0;
  for (const [b, s] of bins) if (s > best) { best = s; bestK = Math.exp(b / 24); }
  const tp = bestK > 0 ? (2 * Math.PI) / Math.sqrt(G * bestK * Math.tanh(Math.min(bestK * model.depth, 20))) : 0;
  return {
    slopeLut: lut, logKMin, logKMax, m0, hs: 4 * Math.sqrt(Math.max(m0, 0)), tp,
    peakWavelength: bestK > 0 ? (2 * Math.PI) / bestK : 0, cascadeEnergy,
    meanDirDeg: (Math.atan2(dz, dx) * 180) / Math.PI,
  };
}
