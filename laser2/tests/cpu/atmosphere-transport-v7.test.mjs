import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_LIGHTING_SETTINGS } from '../../dist/src/lighting/LightingSettings.js';
import {
  integrateAtmosphereRadiance,
  projectAtmosphereToSh,
  colorTemperatureWhiteBalance,
} from '../../dist/src/lighting/atmosphere/AtmosphereMath.js';
import { computeSpectralSolar } from '../../dist/src/lighting/atmosphere/SpectralSolar.js';
import { computeRadiometricBudget } from '../../dist/src/lighting/RadiometricCouplingSystem.js';
import { QUALITY_PROFILES } from '../../dist/src/quality/QualityProfiles.js';
import { luminance, sunDirectionFromAngles } from '../../dist/src/reference/lightingMath.js';

const root = '/mnt/data/LASER2_LIGHTING_FOUNDRY_V7';
const out = path.join(root, 'evidence/cpu/atmosphere-transport-v7.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
const profile = QUALITY_PROFILES.find((candidate) => candidate.id === 'balanced');
if (!profile) throw new Error('balanced quality profile missing');

const base = {
  ...DEFAULT_LIGHTING_SETTINGS,
  spectralSolarEnabled: true,
  sunIlluminanceLux: 100_000,
  skyIntensity: 0.92,
  rayleighDensity: 1,
  aerosolDensity: 0.28,
  turbidity: 3.2,
  ozoneDensity: 1,
  multipleScatteringFactor: 0.42,
  autoExposureEnabled: false,
};
const noonSolar = computeSpectralSolar(60, base);
const sunsetSolar = computeSpectralSolar(2, base);
const sunsetWithoutOzone = computeSpectralSolar(2, { ...base, ozoneDensity: 0 });
const sunsetWithDenseOzone = computeSpectralSolar(2, { ...base, ozoneDensity: 1.8 });

const lowSun = sunDirectionFromAngles(4, 270);
const horizonDirection = { x: 0.92, y: 0.025, z: 0.39 };
const singleScatter = integrateAtmosphereRadiance(
  horizonDirection,
  lowSun,
  { ...base, multipleScatteringFactor: 0 },
  { viewSamples: 12, sunSamples: 4 },
);
const higherOrder = integrateAtmosphereRadiance(
  horizonDirection,
  lowSun,
  { ...base, multipleScatteringFactor: 0.65 },
  { viewSamples: 12, sunSamples: 4 },
);

const sh = projectAtmosphereToSh(lowSun, base, 48, 8, 4);
const wbWarm = colorTemperatureWhiteBalance(4200);
const wbNeutral = colorTemperatureWhiteBalance(6500);
const wbCool = colorTemperatureWhiteBalance(9000);
const noonBudget = computeRadiometricBudget({ ...base, sunElevationDeg: 60, whiteBalanceKelvin: 6500 }, profile);
const sunsetBudget = computeRadiometricBudget({ ...base, sunElevationDeg: 2, whiteBalanceKelvin: 6500 }, profile);
const warmBudget = computeRadiometricBudget({ ...base, sunElevationDeg: 12, whiteBalanceKelvin: 4200 }, profile);
const coolBudget = computeRadiometricBudget({ ...base, sunElevationDeg: 12, whiteBalanceKelvin: 9000 }, profile);

const finiteRgb = (value) => Object.values(value).every(Number.isFinite) && Object.values(value).every((entry) => entry >= 0);
const finiteCoefficient = (value) => Object.values(value).every(Number.isFinite);
const ozoneDifference = Math.abs(sunsetWithoutOzone.normalizedRgb.r - sunsetWithDenseOzone.normalizedRgb.r)
  + Math.abs(sunsetWithoutOzone.normalizedRgb.g - sunsetWithDenseOzone.normalizedRgb.g)
  + Math.abs(sunsetWithoutOzone.normalizedRgb.b - sunsetWithDenseOzone.normalizedRgb.b);
const checks = {
  spectral_sample_count_15: noonSolar.samples === 15 && sunsetSolar.samples === 15,
  spectral_values_finite: finiteRgb(noonSolar.normalizedRgb) && finiteRgb(sunsetSolar.normalizedRgb),
  low_sun_warmer_than_noon: sunsetSolar.normalizedRgb.r / Math.max(1e-9, sunsetSolar.normalizedRgb.b) > noonSolar.normalizedRgb.r / Math.max(1e-9, noonSolar.normalizedRgb.b),
  low_sun_less_photopic_energy: sunsetSolar.photopicTransmission < noonSolar.photopicTransmission * 0.35,
  ozone_changes_solar_spectrum: ozoneDifference > 0.015,
  higher_order_restores_horizon_energy: luminance(higherOrder) > luminance(singleScatter) * 1.01,
  higher_order_remains_finite: finiteRgb(singleScatter) && finiteRgb(higherOrder),
  sh_has_nine_finite_coefficients: sh.coefficients.length === 9 && sh.coefficients.every(finiteCoefficient),
  sh_sample_count_exact: sh.samples === 48,
  white_balance_monotonic: wbWarm.b > wbNeutral.b && wbCool.r > wbNeutral.r,
  white_balance_changes_budget: Math.abs(warmBudget.whiteBalanceRgb.r - coolBudget.whiteBalanceRgb.r) > 0.1 && Math.abs(warmBudget.whiteBalanceRgb.b - coolBudget.whiteBalanceRgb.b) > 0.1,
  noon_energy_exceeds_sunset: noonBudget.directNormalLux > sunsetBudget.directNormalLux * 8 && noonBudget.skyIrradianceLux > sunsetBudget.skyIrradianceLux * 1.5,
  radiometric_budget_reports_spectrum: noonBudget.spectralSolarEnabled && noonBudget.spectralSamples === 15,
};

const report = {
  project: 'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL',
  lane: 'pure Node CPU; no WebGL or GPU',
  spectral: { noonSolar, sunsetSolar, sunsetWithoutOzone, sunsetWithDenseOzone, ozoneDifference },
  scattering: { singleScatter, higherOrder, singleLuminance: luminance(singleScatter), higherOrderLuminance: luminance(higherOrder) },
  sphericalHarmonics: sh,
  whiteBalance: { wbWarm, wbNeutral, wbCool, warmBudget: warmBudget.whiteBalanceRgb, coolBudget: coolBudget.whiteBalanceRgb },
  radiometric: { noon: noonBudget, sunset: sunsetBudget },
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
};
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ allChecksPassed: report.allChecksPassed, failed: Object.entries(checks).filter(([, value]) => !value).map(([key]) => key), spectral: report.spectral, scattering: report.scattering, whiteBalance: report.whiteBalance }, null, 2));
if (!report.allChecksPassed) process.exitCode = 1;
