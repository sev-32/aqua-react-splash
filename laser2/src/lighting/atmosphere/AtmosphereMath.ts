import { clamp, type Rgb, type Vec3Like } from '../../reference/lightingMath.js';
import type { LightingSettings } from '../LightingSettings.js';

export const EARTH_RADIUS_M = 6_371_000;
export const ATMOSPHERE_RADIUS_M = 6_471_000;
export const RAYLEIGH_SCALE_HEIGHT_M = 8_500;
export const MIE_SCALE_HEIGHT_M = 1_200;
export const RAYLEIGH_SCATTERING_M_INV: readonly [number, number, number] = [5.802e-6, 13.558e-6, 33.1e-6];
export const MIE_EXTINCTION_M_INV = 21e-6;
export const MIE_SINGLE_SCATTERING_ALBEDO = 0.9;
export const OZONE_PEAK_ALTITUDE_M = 25_000;
export const OZONE_HALF_WIDTH_M = 15_000;
export const OZONE_ABSORPTION_M_INV: readonly [number, number, number] = [0.650e-6, 1.881e-6, 0.085e-6];

export interface AtmosphereIntegrationOptions {
  viewSamples: number;
  sunSamples: number;
  cameraAltitudeM?: number;
}

interface Vec3 extends Vec3Like {}

function add(a: Vec3, b: Vec3): Vec3 { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function scale(a: Vec3, s: number): Vec3 { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
function dot(a: Vec3, b: Vec3): number { return a.x * b.x + a.y * b.y + a.z * b.z; }
function length(a: Vec3): number { return Math.sqrt(dot(a, a)); }
function normalize(a: Vec3): Vec3 { const l = Math.max(1e-12, length(a)); return scale(a, 1 / l); }

function raySphere(origin: Vec3, direction: Vec3, radius: number): [number, number] | null {
  const b = dot(origin, direction);
  const c = dot(origin, origin) - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  return [-b - root, -b + root];
}

function densities(altitudeM: number, settings: LightingSettings): { rayleigh: number; mie: number; ozone: number } {
  const h = Math.max(0, altitudeM);
  const rayleigh = Math.exp(-h / RAYLEIGH_SCALE_HEIGHT_M) * Math.max(0, settings.rayleighDensity);
  const hazeScale = Math.max(0, settings.aerosolDensity) * Math.max(0.2, settings.turbidity / 2.8);
  const mie = Math.exp(-h / MIE_SCALE_HEIGHT_M) * hazeScale;
  const ozoneProfile = Math.max(0, 1 - Math.abs(h - OZONE_PEAK_ALTITUDE_M) / OZONE_HALF_WIDTH_M);
  const ozone = ozoneProfile * Math.max(0, settings.ozoneDensity);
  return { rayleigh, mie, ozone };
}

function opticalDepthToAtmosphere(
  point: Vec3,
  direction: Vec3,
  settings: LightingSettings,
  samples: number,
): { rayleigh: number; mie: number; ozone: number; blocked: boolean } {
  const atmosphereHit = raySphere(point, direction, ATMOSPHERE_RADIUS_M);
  if (!atmosphereHit) return { rayleigh: 0, mie: 0, ozone: 0, blocked: true };
  const groundHit = raySphere(point, direction, EARTH_RADIUS_M);
  if (groundHit && groundHit[0] > 1e-4 && groundHit[0] < atmosphereHit[1]) {
    return { rayleigh: 1e12, mie: 1e12, ozone: 1e12, blocked: true };
  }
  const segment = Math.max(0, atmosphereHit[1]) / Math.max(1, samples);
  let rayleigh = 0;
  let mie = 0;
  let ozone = 0;
  for (let i = 0; i < Math.max(1, samples); i++) {
    const distanceM = (i + 0.5) * segment;
    const samplePoint = add(point, scale(direction, distanceM));
    const altitudeM = length(samplePoint) - EARTH_RADIUS_M;
    const density = densities(altitudeM, settings);
    rayleigh += density.rayleigh * segment;
    mie += density.mie * segment;
    ozone += density.ozone * segment;
  }
  return { rayleigh, mie, ozone, blocked: false };
}

export function atmosphereTransmittanceFromOpticalDepth(
  rayleighOpticalDepthM: number,
  mieOpticalDepthM: number,
  ozoneOpticalDepthM = 0,
): Rgb {
  const mieExtinction = MIE_EXTINCTION_M_INV * mieOpticalDepthM;
  return {
    r: Math.exp(-(RAYLEIGH_SCATTERING_M_INV[0] * rayleighOpticalDepthM + mieExtinction + OZONE_ABSORPTION_M_INV[0] * ozoneOpticalDepthM)),
    g: Math.exp(-(RAYLEIGH_SCATTERING_M_INV[1] * rayleighOpticalDepthM + mieExtinction + OZONE_ABSORPTION_M_INV[1] * ozoneOpticalDepthM)),
    b: Math.exp(-(RAYLEIGH_SCATTERING_M_INV[2] * rayleighOpticalDepthM + mieExtinction + OZONE_ABSORPTION_M_INV[2] * ozoneOpticalDepthM)),
  };
}

export function atmosphericSunTransmittance(
  sunDirection: Vec3Like,
  settings: LightingSettings,
  sunSamples = 16,
  cameraAltitudeM = settings.cameraAltitudeM,
): Rgb {
  if (sunDirection.y <= -0.035) return { r: 0, g: 0, b: 0 };
  const origin = { x: 0, y: EARTH_RADIUS_M + Math.max(2, cameraAltitudeM), z: 0 };
  const direction = normalize(sunDirection);
  const depth = opticalDepthToAtmosphere(origin, direction, settings, Math.max(2, sunSamples));
  if (depth.blocked) return { r: 0, g: 0, b: 0 };
  return atmosphereTransmittanceFromOpticalDepth(depth.rayleigh, depth.mie, depth.ozone);
}

function rayleighPhase(cosTheta: number): number {
  return 3 / (16 * Math.PI) * (1 + cosTheta * cosTheta);
}

function miePhase(cosTheta: number, g: number): number {
  const gg = clamp(g, 0, 0.96);
  const denominator = Math.pow(Math.max(1e-4, 1 + gg * gg - 2 * gg * cosTheta), 1.5);
  return 3 / (8 * Math.PI) * ((1 - gg * gg) * (1 + cosTheta * cosTheta)) / ((2 + gg * gg) * denominator);
}

export function integrateAtmosphereRadiance(
  viewDirection: Vec3Like,
  sunDirection: Vec3Like,
  settings: LightingSettings,
  options: AtmosphereIntegrationOptions,
): Rgb {
  if (!settings.atmosphereEnabled) return { r: 0.32, g: 0.43, b: 0.62 };
  const view = normalize(viewDirection);
  const sun = normalize(sunDirection);
  const cameraAltitudeM = Math.max(2, options.cameraAltitudeM ?? settings.cameraAltitudeM);
  const origin = { x: 0, y: EARTH_RADIUS_M + cameraAltitudeM, z: 0 };
  const atmosphereHit = raySphere(origin, view, ATMOSPHERE_RADIUS_M);
  if (!atmosphereHit) return { r: 0, g: 0, b: 0 };
  let start = Math.max(0, atmosphereHit[0]);
  let end = atmosphereHit[1];
  const groundHit = raySphere(origin, view, EARTH_RADIUS_M);
  if (groundHit && groundHit[0] > 0 && groundHit[0] < end) end = groundHit[0];
  if (end <= start) return { r: 0, g: 0, b: 0 };

  const viewSamples = Math.max(2, Math.floor(options.viewSamples));
  const sunSamples = Math.max(2, Math.floor(options.sunSamples));
  const stepM = (end - start) / viewSamples;
  let viewRayleigh = 0;
  let viewMie = 0;
  let viewOzone = 0;
  let scatterR = 0;
  let scatterG = 0;
  let scatterB = 0;
  const mu = clamp(dot(view, sun), -1, 1);
  const phaseR = rayleighPhase(mu);
  const phaseM = miePhase(mu, settings.mieAnisotropy);

  for (let i = 0; i < viewSamples; i++) {
    const distanceM = start + (i + 0.5) * stepM;
    const point = add(origin, scale(view, distanceM));
    const altitudeM = length(point) - EARTH_RADIUS_M;
    const density = densities(altitudeM, settings);
    const sampleRayleigh = density.rayleigh * stepM;
    const sampleMie = density.mie * stepM;
    viewRayleigh += sampleRayleigh;
    viewMie += sampleMie;
    viewOzone += density.ozone * stepM;
    const sunDepth = opticalDepthToAtmosphere(point, sun, settings, sunSamples);
    if (sunDepth.blocked) continue;
    const transmittance = atmosphereTransmittanceFromOpticalDepth(
      viewRayleigh + sunDepth.rayleigh,
      viewMie + sunDepth.mie,
      viewOzone + sunDepth.ozone,
    );
    const mieScatter = MIE_EXTINCTION_M_INV * MIE_SINGLE_SCATTERING_ALBEDO * sampleMie * phaseM;
    scatterR += transmittance.r * (RAYLEIGH_SCATTERING_M_INV[0] * sampleRayleigh * phaseR + mieScatter);
    scatterG += transmittance.g * (RAYLEIGH_SCATTERING_M_INV[1] * sampleRayleigh * phaseR + mieScatter);
    scatterB += transmittance.b * (RAYLEIGH_SCATTERING_M_INV[2] * sampleRayleigh * phaseR + mieScatter);
  }

  const physicalScale = Math.max(0, settings.skyIntensity) * Math.max(0, settings.sunIlluminanceLux) / 100_000;
  let result: Rgb = {
    r: scatterR * physicalScale * 18,
    g: scatterG * physicalScale * 18,
    b: scatterB * physicalScale * 18,
  };

  // Energy-conserving dual-scattering approximation. This is deliberately
  // separated from the direct single-scattering integral: it restores a
  // low-frequency isotropic component from light that scattered at least once
  // before reaching the current path. It is not claimed to be a full Bruneton
  // multiple-scattering LUT, but it preserves the missing horizon/ground energy
  // without flattening time-of-day contrast.
  const opticalThickness =
    viewRayleigh * (RAYLEIGH_SCATTERING_M_INV[0] + RAYLEIGH_SCATTERING_M_INV[1] + RAYLEIGH_SCATTERING_M_INV[2]) / 3
    + viewMie * MIE_EXTINCTION_M_INV;
  const escapedFraction = 1 - Math.exp(-Math.max(0, opticalThickness));
  const ms = clamp(settings.multipleScatteringFactor, 0, 1.5) * escapedFraction;
  const sunHeight = clamp(sun.y * 0.5 + 0.5, 0, 1);
  const isotropicScale = physicalScale * ms * (0.18 + 0.34 * sunHeight);
  result = {
    r: result.r + isotropicScale * (0.55 + 0.45 * scatterR),
    g: result.g + isotropicScale * (0.62 + 0.38 * scatterG),
    b: result.b + isotropicScale * (0.72 + 0.28 * scatterB),
  };

  if (groundHit && groundHit[0] > 0 && groundHit[0] <= atmosphereHit[1]) {
    const sunTransmittance = atmosphericSunTransmittance(sun, settings, sunSamples, 2);
    const direct = Math.max(0, sun.y);
    const ground = Math.max(0, settings.groundAlbedo) * direct * 0.45;
    result = {
      r: result.r + sunTransmittance.r * ground,
      g: result.g + sunTransmittance.g * ground,
      b: result.b + sunTransmittance.b * ground,
    };
  }
  return result;
}

export interface ShProjection {
  coefficients: Array<{ r: number; g: number; b: number }>;
  samples: number;
  elapsedMs: number;
}

function shBasis(direction: Vec3Like): readonly number[] {
  const { x, y, z } = direction;
  return [
    0.282095,
    0.488603 * y,
    0.488603 * z,
    0.488603 * x,
    1.092548 * x * y,
    1.092548 * y * z,
    0.315392 * (3 * z * z - 1),
    1.092548 * x * z,
    0.546274 * (x * x - y * y),
  ];
}

export function projectAtmosphereToSh(
  sunDirection: Vec3Like,
  settings: LightingSettings,
  sampleCount: number,
  viewSamples: number,
  sunSamples: number,
): ShProjection {
  const started = performance.now();
  const count = Math.max(8, Math.floor(sampleCount));
  const coefficients = Array.from({ length: 9 }, () => ({ r: 0, g: 0, b: 0 }));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + 0.5) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = i * goldenAngle;
    const direction = { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    const radiance = integrateAtmosphereRadiance(direction, sunDirection, settings, {
      viewSamples,
      sunSamples,
      cameraAltitudeM: settings.cameraAltitudeM,
    });
    const basis = shBasis(direction);
    const weight = 4 * Math.PI / count;
    for (let band = 0; band < 9; band++) {
      const scalar = basis[band]! * weight;
      coefficients[band]!.r += radiance.r * scalar;
      coefficients[band]!.g += radiance.g * scalar;
      coefficients[band]!.b += radiance.b * scalar;
    }
  }
  return { coefficients, samples: count, elapsedMs: performance.now() - started };
}

export function colorTemperatureWhiteBalance(kelvin: number): Rgb {
  const temperature = clamp(kelvin, 2500, 12000) / 100;
  let r: number, g: number, b: number;
  if (temperature <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(Math.max(1, temperature)) - 161.1195681661;
    b = temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
    b = 255;
  }
  const normalized = { r: clamp(r / 255, 0.01, 1), g: clamp(g / 255, 0.01, 1), b: clamp(b / 255, 0.01, 1) };
  return { r: normalized.g / normalized.r, g: 1, b: normalized.g / normalized.b };
}
