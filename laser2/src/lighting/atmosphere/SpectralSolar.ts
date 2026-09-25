import { clamp, luminance, type Rgb } from '../../reference/lightingMath.js';
import type { LightingSettings } from '../LightingSettings.js';

export interface SpectralSolarSample {
  rgb: Rgb;
  normalizedRgb: Rgb;
  photopicTransmission: number;
  colorTemperatureApproxK: number;
  samples: number;
}

const WAVELENGTHS_NM = [360, 390, 420, 450, 480, 510, 540, 570, 600, 630, 660, 690, 720, 750, 780] as const;

function gaussian(wavelengthNm: number, mean: number, sigmaLeft: number, sigmaRight: number): number {
  const sigma = wavelengthNm < mean ? sigmaLeft : sigmaRight;
  const x = (wavelengthNm - mean) / sigma;
  return Math.exp(-0.5 * x * x);
}

// Analytic approximation of the CIE 1931 2° color matching functions.
function cieX(wavelengthNm: number): number {
  return 1.056 * gaussian(wavelengthNm, 599.8, 37.9, 31.0)
    + 0.362 * gaussian(wavelengthNm, 442.0, 16.0, 26.7)
    - 0.065 * gaussian(wavelengthNm, 501.1, 20.4, 26.2);
}
function cieY(wavelengthNm: number): number {
  return 0.821 * gaussian(wavelengthNm, 568.8, 46.9, 40.5)
    + 0.286 * gaussian(wavelengthNm, 530.9, 16.3, 31.1);
}
function cieZ(wavelengthNm: number): number {
  return 1.217 * gaussian(wavelengthNm, 437.0, 11.8, 36.0)
    + 0.681 * gaussian(wavelengthNm, 459.0, 26.0, 13.8);
}

function planckRelative(wavelengthNm: number, temperatureK = 5778): number {
  const wavelengthM = wavelengthNm * 1e-9;
  const c2 = 1.438776877e-2;
  const exponent = c2 / (wavelengthM * temperatureK);
  return 1 / (Math.pow(wavelengthM, 5) * Math.max(1e-30, Math.exp(exponent) - 1));
}

function kastenYoungAirMass(elevationDeg: number): number {
  if (elevationDeg <= -5) return 40;
  const zenithDeg = 90 - clamp(elevationDeg, -4.9, 90);
  const cosine = Math.cos(zenithDeg * Math.PI / 180);
  return 1 / Math.max(0.025, cosine + 0.50572 * Math.pow(96.07995 - zenithDeg, -1.6364));
}

function ozoneAbsorptionRelative(wavelengthNm: number): number {
  // Chappuis band approximation, with a weak blue-side shoulder. This is a
  // compact RGB-era spectral model, not a line-by-line ozone database.
  return 0.95 * gaussian(wavelengthNm, 602, 78, 96)
    + 0.18 * gaussian(wavelengthNm, 475, 45, 72)
    + 0.06 * gaussian(wavelengthNm, 760, 55, 45);
}

function xyzToLinearSrgb(x: number, y: number, z: number): Rgb {
  return {
    r: Math.max(0, 3.2406 * x - 1.5372 * y - 0.4986 * z),
    g: Math.max(0, -0.9689 * x + 1.8758 * y + 0.0415 * z),
    b: Math.max(0, 0.0557 * x - 0.2040 * y + 1.0570 * z),
  };
}

function estimateCct(rgb: Rgb): number {
  const sum = rgb.r + rgb.g + rgb.b;
  if (sum <= 1e-12) return 1800;
  // Compact monotonic display estimate. It is telemetry, not the rendering
  // authority, and intentionally avoids pretending to be a full Robertson CCT.
  const warmth = rgb.r / Math.max(1e-9, rgb.b);
  return clamp(7200 / Math.pow(Math.max(0.25, warmth), 0.72), 1700, 12000);
}

export function computeSpectralSolar(
  elevationDeg: number,
  settings: Readonly<LightingSettings>,
): SpectralSolarSample {
  const airMass = kastenYoungAirMass(elevationDeg);
  let x = 0, y = 0, z = 0;
  let x0 = 0, y0 = 0, z0 = 0;
  for (const wavelengthNm of WAVELENGTHS_NM) {
    const wavelengthUm = wavelengthNm / 1000;
    const source = planckRelative(wavelengthNm);
    const rayleighTau = 0.008735 * Math.pow(wavelengthUm, -4.08)
      * Math.max(0, settings.rayleighDensity) * airMass;
    const angstrom = 1.25;
    const aerosolBeta = 0.018 * Math.max(0, settings.aerosolDensity)
      * Math.max(0.2, settings.turbidity / 2.8);
    const mieTau = aerosolBeta * Math.pow(wavelengthUm, -angstrom) * airMass;
    const ozoneTau = 0.065 * ozoneAbsorptionRelative(wavelengthNm)
      * Math.max(0, settings.ozoneDensity) * airMass;
    const transmittance = Math.exp(-(rayleighTau + mieTau + ozoneTau));
    const transmitted = source * transmittance;
    const cx = cieX(wavelengthNm), cy = cieY(wavelengthNm), cz = cieZ(wavelengthNm);
    x += transmitted * cx; y += transmitted * cy; z += transmitted * cz;
    x0 += source * cx; y0 += source * cy; z0 += source * cz;
  }
  const rgb = xyzToLinearSrgb(x, y, z);
  const rgb0 = xyzToLinearSrgb(x0, y0, z0);
  const peak = Math.max(rgb.r, rgb.g, rgb.b, 1e-12);
  const normalizedRgb = { r: rgb.r / peak, g: rgb.g / peak, b: rgb.b / peak };
  const photopicTransmission = clamp(y / Math.max(1e-20, y0), 0, 1);
  const calibration = luminance(rgb0) > 0 ? luminance(rgb) / luminance(rgb0) : photopicTransmission;
  return {
    rgb,
    normalizedRgb,
    photopicTransmission: clamp((photopicTransmission + calibration) * 0.5, 0, 1),
    colorTemperatureApproxK: estimateCct(normalizedRgb),
    samples: WAVELENGTHS_NM.length,
  };
}
