import type { AppContext, AppSystem } from '../core/System.js';
import { luminance, sunDirectionFromAngles, type Rgb, type Vec3Like } from '../reference/lightingMath.js';
import type { QualityProfile } from '../quality/QualityProfiles.js';
import { atmosphericSunTransmittance, colorTemperatureWhiteBalance, integrateAtmosphereRadiance } from './atmosphere/AtmosphereMath.js';
import { computeSpectralSolar } from './atmosphere/SpectralSolar.js';
import type { LightingSettings } from './LightingSettings.js';
import type { LightingState } from './LightingState.js';

export const SKY_RELATIVE_TO_LUX = 22_000;
export const REFERENCE_DIRECT_LUX = 100_000;
export const REFERENCE_SKY_LUX = 18_000;

export interface RadiometricBudgetSnapshot {
  revision: number;
  sunDirection: Vec3Like;
  sunTransmittance: Rgb;
  spectralSolarEnabled: boolean;
  spectralSamples: number;
  spectralPhotopicTransmission: number;
  spectralColorTemperatureApproxK: number;
  whiteBalanceRgb: Rgb;
  directNormalRgbLux: Rgb;
  directNormalLux: number;
  directHorizontalRgbLux: Rgb;
  directHorizontalLux: number;
  skyIrradianceRgbLux: Rgb;
  skyIrradianceLux: number;
  groundBounceRgbLux: Rgb;
  groundBounceLux: number;
  totalHorizontalLux: number;
  rendererExposure: number;
  autoExposureEv: number;
  sunRendererColor: Rgb;
  sunRendererIntensity: number;
  hemisphereSkyColor: Rgb;
  hemisphereGroundColor: Rgb;
  hemisphereIntensity: number;
  specularEnvironmentIntensity: number;
  atmosphereSamples: number;
  cpuMs: number;
}

function rgbScale(value: Rgb, scalar: number): Rgb {
  return { r: value.r * scalar, g: value.g * scalar, b: value.b * scalar };
}

function rgbAdd(a: Rgb, b: Rgb): Rgb {
  return { r: a.r + b.r, g: a.g + b.g, b: a.b + b.b };
}

function normalizedColor(value: Rgb): { color: Rgb; scale: number } {
  const scale = Math.max(value.r, value.g, value.b, 1e-9);
  return {
    color: { r: value.r / scale, g: value.g / scale, b: value.b / scale },
    scale,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const EMPTY: RadiometricBudgetSnapshot = {
  revision: 0,
  sunDirection: { x: 0, y: 1, z: 0 },
  sunTransmittance: { r: 1, g: 1, b: 1 },
  spectralSolarEnabled: false,
  spectralSamples: 0,
  spectralPhotopicTransmission: 1,
  spectralColorTemperatureApproxK: 6500,
  whiteBalanceRgb: { r: 1, g: 1, b: 1 },
  directNormalRgbLux: { r: 0, g: 0, b: 0 },
  directNormalLux: 0,
  directHorizontalRgbLux: { r: 0, g: 0, b: 0 },
  directHorizontalLux: 0,
  skyIrradianceRgbLux: { r: 0, g: 0, b: 0 },
  skyIrradianceLux: 0,
  groundBounceRgbLux: { r: 0, g: 0, b: 0 },
  groundBounceLux: 0,
  totalHorizontalLux: 0,
  rendererExposure: 1,
  autoExposureEv: 0,
  sunRendererColor: { r: 1, g: 1, b: 1 },
  sunRendererIntensity: 0,
  hemisphereSkyColor: { r: 1, g: 1, b: 1 },
  hemisphereGroundColor: { r: 0.1, g: 0.1, b: 0.1 },
  hemisphereIntensity: 0,
  specularEnvironmentIntensity: 0,
  atmosphereSamples: 0,
  cpuMs: 0,
};

export function computeRadiometricBudget(
  settings: Readonly<LightingSettings>,
  profile: Pick<QualityProfile, 'atmosphereSunSamples' | 'atmosphereShSamples' | 'atmosphereViewSamples'>,
  revision = 1,
): RadiometricBudgetSnapshot {
  const started = performance.now();
  const sunDirection = sunDirectionFromAngles(settings.sunElevationDeg, settings.sunAzimuthDeg);
  const geometricSunTransmittance = atmosphericSunTransmittance(
    sunDirection,
    settings,
    Math.max(4, profile.atmosphereSunSamples * 2),
    settings.cameraAltitudeM,
  );
  const spectral = computeSpectralSolar(settings.sunElevationDeg, settings);
  const whiteBalanceRgb = colorTemperatureWhiteBalance(settings.whiteBalanceKelvin);
  let sunTransmittance = geometricSunTransmittance;
  let directNormalRgbLux: Rgb;
  let directNormalLux: number;
  if (settings.spectralSolarEnabled && sunDirection.y > -0.035) {
    directNormalLux = Math.max(0, settings.sunIlluminanceLux) * spectral.photopicTransmission;
    const spectralLuminance = Math.max(1e-9, luminance(spectral.normalizedRgb));
    directNormalRgbLux = rgbScale(spectral.normalizedRgb, directNormalLux / spectralLuminance);
    sunTransmittance = rgbScale(directNormalRgbLux, 1 / Math.max(1, settings.sunIlluminanceLux));
  } else {
    directNormalRgbLux = rgbScale(sunTransmittance, Math.max(0, settings.sunIlluminanceLux));
    directNormalLux = luminance(directNormalRgbLux);
  }
  directNormalRgbLux = {
    r: directNormalRgbLux.r * whiteBalanceRgb.r,
    g: directNormalRgbLux.g * whiteBalanceRgb.g,
    b: directNormalRgbLux.b * whiteBalanceRgb.b,
  };
  directNormalLux = luminance(directNormalRgbLux);
  const horizontalCosine = Math.max(0, sunDirection.y);
  const directHorizontalRgbLux = rgbScale(directNormalRgbLux, horizontalCosine);
  const directHorizontalLux = luminance(directHorizontalRgbLux);

  // Uniform upper-hemisphere integration. The cosine term converts radiance to
  // irradiance on a horizontal receiver. The atmosphere backend is RGB single
  // scattering, so SKY_RELATIVE_TO_LUX is explicit calibration—not hidden
  // renormalization that makes noon and sunset equally bright.
  const count = Math.max(8, profile.atmosphereShSamples);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  let skyR = 0;
  let skyG = 0;
  let skyB = 0;
  const solidAnglePerSample = 2 * Math.PI / count;
  for (let i = 0; i < count; i++) {
    const y = (i + 0.5) / count;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = i * goldenAngle;
    const direction = { x: Math.cos(angle) * radial, y, z: Math.sin(angle) * radial };
    const radiance = integrateAtmosphereRadiance(direction, sunDirection, settings, {
      viewSamples: Math.max(4, Math.floor(profile.atmosphereViewSamples / 2)),
      sunSamples: Math.max(2, Math.floor(profile.atmosphereSunSamples / 2)),
      cameraAltitudeM: settings.cameraAltitudeM,
    });
    const weight = y * solidAnglePerSample * SKY_RELATIVE_TO_LUX;
    skyR += radiance.r * weight;
    skyG += radiance.g * weight;
    skyB += radiance.b * weight;
  }
  const skyIrradianceRgbLux = {
    r: skyR * whiteBalanceRgb.r,
    g: skyG * whiteBalanceRgb.g,
    b: skyB * whiteBalanceRgb.b,
  };
  const skyIrradianceLux = luminance(skyIrradianceRgbLux);

  const incidentGroundRgbLux = rgbAdd(directHorizontalRgbLux, skyIrradianceRgbLux);
  const bounceScalar = Math.max(0, settings.groundAlbedo) * Math.max(0, settings.groundBounce);
  const groundBounceRgbLux = rgbScale(incidentGroundRgbLux, bounceScalar);
  const groundBounceLux = luminance(groundBounceRgbLux);
  const totalHorizontalLux = directHorizontalLux + skyIrradianceLux;

  let autoExposureEv = 0;
  if (settings.autoExposureEnabled) {
    const referenceLux = Math.max(1, settings.autoExposureReferenceLux);
    const desiredMultiplier = referenceLux / Math.max(1, totalHorizontalLux);
    autoExposureEv = clamp(
      Math.log2(desiredMultiplier) * clamp(settings.autoExposureStrength, 0, 1),
      settings.autoExposureMinEv,
      settings.autoExposureMaxEv,
    );
  }
  const rendererExposure = Math.pow(2, settings.exposureEv + autoExposureEv) / Math.max(0.25, settings.toneMappingShoulder);

  const sunLinearRgb = rgbScale(directNormalRgbLux, Math.max(0, settings.sunIntensity) / REFERENCE_DIRECT_LUX);
  const normalizedSun = normalizedColor(sunLinearRgb);

  const normalizedSky = normalizedColor(skyIrradianceRgbLux);
  const normalizedGround = normalizedColor(groundBounceRgbLux);
  const commonHemisphereScale = Math.max(normalizedSky.scale, normalizedGround.scale, 1e-9);
  const hemisphereSkyColor = rgbScale(skyIrradianceRgbLux, 1 / commonHemisphereScale);
  const hemisphereGroundColor = rgbScale(groundBounceRgbLux, 1 / commonHemisphereScale);
  const hemisphereIntensity = Math.max(0, settings.diffuseEnvironmentIntensity)
    * commonHemisphereScale / REFERENCE_SKY_LUX;

  // V6 stores atmosphere radiance directly in a floating-point equirectangular
  // texture. PMREM therefore receives the same unnormalized radiance budget as
  // the visible sky and no compensating factor is permitted here.
  const specularEnvironmentIntensity = Math.max(0, settings.specularEnvironmentIntensity);

  return {
    revision,
    sunDirection,
    sunTransmittance,
    spectralSolarEnabled: settings.spectralSolarEnabled,
    spectralSamples: spectral.samples,
    spectralPhotopicTransmission: spectral.photopicTransmission,
    spectralColorTemperatureApproxK: spectral.colorTemperatureApproxK,
    whiteBalanceRgb,
    directNormalRgbLux,
    directNormalLux,
    directHorizontalRgbLux,
    directHorizontalLux,
    skyIrradianceRgbLux,
    skyIrradianceLux,
    groundBounceRgbLux,
    groundBounceLux,
    totalHorizontalLux,
    rendererExposure,
    autoExposureEv,
    sunRendererColor: normalizedSun.color,
    sunRendererIntensity: normalizedSun.scale,
    hemisphereSkyColor,
    hemisphereGroundColor,
    hemisphereIntensity,
    specularEnvironmentIntensity,
    atmosphereSamples: count,
    cpuMs: performance.now() - started,
  };
}

/** One atmosphere-derived energy budget shared by every lighting consumer. */
export class RadiometricCouplingSystem implements AppSystem {
  readonly id = 'lighting.radiometric-coupling';
  readonly phase = 'preRender' as const;
  enabled = true;
  private context: AppContext | null = null;
  private dirty = true;
  private snapshotValue: RadiometricBudgetSnapshot = structuredClone(EMPTY);
  private recomputes = 0;
  private meanCpuMs = 0;

  constructor(readonly settings: LightingState) {}

  init(context: AppContext): void {
    this.context = context;
    this.settings.subscribe(() => {
      this.dirty = true;
      context.events.emit('lighting:changed', {
        reason: 'radiometric settings changed',
        shadowDirty: true,
        environmentDirty: true,
      });
      context.requestRender('radiometric settings changed');
    });
    context.quality.subscribe(() => {
      this.dirty = true;
      context.requestRender('radiometric quality changed');
    });
    this.recompute(context);
  }

  update(_dtSeconds: number, context: AppContext): void {
    if (this.dirty) this.recompute(context);
  }

  get current(): Readonly<RadiometricBudgetSnapshot> {
    return this.snapshotValue;
  }

  forceRecompute(): void {
    if (this.context) this.recompute(this.context);
  }

  private recompute(context: AppContext): void {
    const next = computeRadiometricBudget(
      this.settings.get(),
      context.quality.current,
      this.snapshotValue.revision + 1,
    );
    this.recomputes++;
    this.meanCpuMs += (next.cpuMs - this.meanCpuMs) / this.recomputes;
    this.snapshotValue = next;
    this.dirty = false;
  }

  telemetry(): Record<string, unknown> {
    return {
      ...this.snapshotValue,
      recomputes: this.recomputes,
      meanCpuMs: this.meanCpuMs,
      calibration: {
        skyRelativeToLux: SKY_RELATIVE_TO_LUX,
        referenceDirectLux: REFERENCE_DIRECT_LUX,
        referenceSkyLux: REFERENCE_SKY_LUX,
      },
      authority: 'single shared atmosphere → spectral sun/sky/ground/exposure/PBR-environment energy budget',
      truthBoundary: '15-band solar spectrum with RGB atmospheric sky transport, ozone absorption and dual-scattering approximation; full line-by-line spectral atmosphere and measured camera response remain later authorities',
    };
  }
}
