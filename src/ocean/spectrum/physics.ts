/**
 * Ocean wave physics — pure functions, unit-tested.
 *
 * References (re-verify by name):
 *  - Hasselmann et al. 1973 (JONSWAP); Bouws et al. 1985 (TMA depth attenuation)
 *  - Mitsuyasu 1975 / Hasselmann 1980 directional spreading cos^{2s}(θ/2)
 *  - Horvath 2015, "Empirical directional wave spectra for computer graphics"
 *    (swell elongation term, JONSWAP-from-fetch parameterisation)
 *  - Cox & Munk 1954 mean-square slope vs wind speed
 */
import { G, lgamma, clamp } from '../math/scalar';

/** Surface tension over density for clean sea water (m³/s²). */
export const SIGMA_OVER_RHO = 7.28e-5;

/** Gravity–capillary dispersion over finite depth: ω² = (gk + σ/ρ k³) tanh(kd). */
export function dispersion(k: number, depth: number): number {
  if (k <= 0) return 0;
  const kd = Math.min(k * depth, 20);
  return Math.sqrt((G * k + SIGMA_OVER_RHO * k * k * k) * Math.tanh(kd));
}

/** Group velocity dω/dk (analytic derivative of the dispersion above). */
export function groupVelocity(k: number, depth: number): number {
  if (k <= 0) return Math.sqrt(G * depth);
  const kd = Math.min(k * depth, 20);
  const th = Math.tanh(kd);
  const sech2 = 1 - th * th;
  const a = G * k + SIGMA_OVER_RHO * k * k * k;
  const da = G + 3 * SIGMA_OVER_RHO * k * k;
  const w = Math.sqrt(a * th);
  if (w < 1e-9) return Math.sqrt(G * depth);
  return (da * th + a * depth * sech2) / (2 * w);
}

/** Invert deep-water gravity dispersion: k from ω (used for peak wavelengths). */
export const kFromOmegaDeep = (w: number) => (w * w) / G;

/** Solve ω(k, d) = w for k by Newton iteration (finite depth, gravity only). */
export function kFromOmega(w: number, depth: number): number {
  let k = Math.max((w * w) / G, 1e-6);
  for (let i = 0; i < 30; i++) {
    const kd = Math.min(k * depth, 20);
    const th = Math.tanh(kd);
    const f = G * k * th - w * w;
    const df = G * th + G * k * depth * (1 - th * th);
    const nk = k - f / Math.max(df, 1e-12);
    if (Math.abs(nk - k) < 1e-12 * Math.max(1, k)) { k = nk; break; }
    k = Math.max(nk, 1e-9);
  }
  return k;
}

/** TMA depth attenuation Φ(ω, d) (Kitaigorodskii approximation). */
export function tmaAttenuation(w: number, depth: number): number {
  const wh = w * Math.sqrt(depth / G);
  if (wh <= 1) return 0.5 * wh * wh;
  if (wh < 2) return 1 - 0.5 * (2 - wh) * (2 - wh);
  return 1;
}

/** JONSWAP shape (without α·g²): ω^-5 exp(-5/4 (ωp/ω)^4) γ^r. */
export function jonswapShape(w: number, wp: number, gamma: number): number {
  if (w <= 1e-6) return 0;
  const sigma = w <= wp ? 0.07 : 0.09;
  const r = Math.exp(-((w - wp) * (w - wp)) / (2 * sigma * sigma * wp * wp));
  return Math.pow(w, -5) * Math.exp(-1.25 * Math.pow(wp / w, 4)) * Math.pow(gamma, r);
}

/** ∫ jonswapShape dω, numerically (log-spaced trapezoid). */
export function jonswapShapeIntegral(wp: number, gamma: number): number {
  const n = 2048;
  const lo = Math.log(wp * 0.2), hi = Math.log(wp * 12);
  let sum = 0, prevW = Math.exp(lo), prevF = jonswapShape(prevW, wp, gamma);
  for (let i = 1; i <= n; i++) {
    const w = Math.exp(lo + ((hi - lo) * i) / n);
    const f = jonswapShape(w, wp, gamma);
    sum += 0.5 * (f + prevF) * (w - prevW);
    prevW = w; prevF = f;
  }
  return sum;
}

/** Fetch-limited JONSWAP parameters from wind speed U10 (m/s) and fetch (m). */
export function jonswapFromWind(u10: number, fetch: number): { alpha: number; wp: number } {
  const U = Math.max(u10, 0.5);
  const F = Math.max(fetch, 100);
  let alpha = 0.076 * Math.pow((U * U) / (F * G), 0.22);
  let wp = 22 * Math.pow((G * G) / (U * F), 1 / 3);
  // Fully developed limit (Pierson–Moskowitz): the sea cannot outgrow its wind.
  const wpPM = 0.855 * G / U;
  if (wp < wpPM) { wp = wpPM; alpha = Math.max(alpha, 0.0081); }
  alpha = Math.max(alpha, 0.0081);
  return { alpha, wp };
}

/** Normalisation of ∫_{-π}^{π} |cos(θ/2)|^{2s} dθ = 1. */
export function spreadingNorm(s: number): number {
  return Math.exp((2 * s - 1) * Math.LN2 + 2 * lgamma(s + 1) - lgamma(2 * s + 1)) / Math.PI;
}

/** Mitsuyasu frequency-dependent spreading exponent for a wind sea. */
export function mitsuyasuS(w: number, wp: number, u10: number): number {
  const sp = 11.5 * Math.pow(G / Math.max(wp * Math.max(u10, 0.5), 1e-6), 2.5);
  const r = w / wp;
  return r <= 1 ? sp * Math.pow(r, 5) : sp * Math.pow(r, -2.5);
}

/** Horvath swell elongation: s += 16 tanh(ωp/ω) ξ². */
export const swellElongation = (w: number, wp: number, xi: number) => 16 * Math.tanh(wp / Math.max(w, 1e-6)) * xi * xi;

/** Cox–Munk mean-square slopes (clean surface), upwind and crosswind, for U (m/s). */
export function coxMunk(u: number): { upwind: number; crosswind: number } {
  const U = Math.max(u, 0);
  return { upwind: 0.00316 * U, crosswind: 0.003 + 0.00192 * U };
}

/* ───────────────────────── wave systems ───────────────────────── */

export interface WaveSystem {
  /** 'wind' = fetch-limited JONSWAP from U10/fetch; 'swell' = JONSWAP normalised to Hs/Tp. */
  kind: 'wind' | 'swell';
  directionDeg: number;
  /** Peak enhancement γ (1 = Pierson–Moskowitz, 3.3 = JONSWAP mean, 5–10 = narrow swell). */
  gamma: number;
  /** Wind sea: 10 m wind speed (m/s) and fetch (km). */
  windSpeed?: number;
  fetchKm?: number;
  /** Swell: significant wave height (m) and peak period (s). */
  hs?: number;
  tp?: number;
  /** Wind sea: multiplier on Mitsuyasu s. Swell: base spreading exponent s. */
  spread: number;
  /** Horvath swell elongation ξ ∈ [0,1]: long-crestedness. */
  elongation: number;
  /** Isotropic floor fraction (keeps a little energy in every direction). */
  floor?: number;
  /** Multiplier on the system's energy. */
  energy?: number;
}

/** Precomputed per-system constants so spectral evaluation stays cheap. */
export interface SystemEval {
  alphaG2: number; // α g² (already folded with energy scale)
  wp: number;
  gamma: number;
  dirRad: number;
  spread: number;
  elongation: number;
  floor: number;
  kind: 'wind' | 'swell';
  u10: number;
}

export function prepareSystem(sys: WaveSystem): SystemEval {
  const energy = sys.energy ?? 1;
  let alpha: number, wp: number;
  if (sys.kind === 'wind') {
    const p = jonswapFromWind(sys.windSpeed ?? 8, (sys.fetchKm ?? 100) * 1000);
    alpha = p.alpha; wp = p.wp;
  } else {
    wp = (2 * Math.PI) / Math.max(sys.tp ?? 10, 0.5);
    const hs = Math.max(sys.hs ?? 1, 0);
    const m0 = (hs * hs) / 16;
    alpha = m0 / (G * G * jonswapShapeIntegral(wp, sys.gamma));
  }
  return {
    alphaG2: alpha * G * G * energy,
    wp,
    gamma: sys.gamma,
    dirRad: (sys.directionDeg * Math.PI) / 180,
    spread: sys.spread,
    elongation: sys.elongation,
    floor: clamp(sys.floor ?? 0.02, 0, 0.5),
    kind: sys.kind,
    u10: sys.windSpeed ?? 8,
  };
}

/** Directional frequency spectrum S(ω)·D(θ,ω) of one system (m² s rad⁻¹ rad⁻¹). */
export function systemSpectrum(se: SystemEval, w: number, theta: number, depth: number): number {
  if (w <= 1e-6) return 0;
  const S = se.alphaG2 * jonswapShape(w, se.wp, se.gamma) * tmaAttenuation(w, depth);
  if (S <= 0) return 0;
  let s = se.kind === 'wind' ? mitsuyasuS(w, se.wp, se.u10) * se.spread : se.spread;
  s = Math.min(Math.max(s + swellElongation(w, se.wp, se.elongation), 0.05), 120);
  let d = theta - se.dirRad;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const D = spreadingNorm(s) * Math.pow(Math.abs(Math.cos(d / 2)), 2 * s);
  return S * ((1 - se.floor) * D + se.floor / (2 * Math.PI));
}

/**
 * Wavenumber-space energy density E(kx,kz) such that ∫∫E dkx dkz = m0.
 * E(k,θ) = Σ S(ω(k))D(θ) · (dω/dk) / k.
 */
export function wavenumberSpectrum(systems: SystemEval[], kx: number, kz: number, depth: number): number {
  const k = Math.hypot(kx, kz);
  if (k < 1e-9) return 0;
  const w = dispersion(k, depth);
  const cg = groupVelocity(k, depth);
  const theta = Math.atan2(kz, kx);
  let e = 0;
  for (const se of systems) e += systemSpectrum(se, w, theta, depth);
  return (e * cg) / k;
}

/** Deep-water peak wavelength of a system (m). */
export function systemPeakWavelength(se: SystemEval, depth: number): number {
  return (2 * Math.PI) / kFromOmega(se.wp, depth);
}
