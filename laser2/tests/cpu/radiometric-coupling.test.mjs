import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { DEFAULT_LIGHTING_SETTINGS } from '../../dist/src/lighting/LightingSettings.js';
import { computeRadiometricBudget } from '../../dist/src/lighting/RadiometricCouplingSystem.js';
import { QUALITY_PROFILES } from '../../dist/src/quality/QualityProfiles.js';

const root = '/mnt/data/LASER2_LIGHTING_FOUNDRY_V7';
const out = path.join(root, 'evidence/cpu/radiometric-coupling.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
const profile = QUALITY_PROFILES.find((p) => p.id === 'balanced');
if (!profile) throw new Error('balanced profile missing');

const common = {
  ...DEFAULT_LIGHTING_SETTINGS,
  sunIlluminanceLux: 100_000,
  sunIntensity: 3.2,
  skyIntensity: 0.92,
  exposureEv: -0.25,
  autoExposureEnabled: false,
};
const cases = {
  noon: { ...common, sunElevationDeg: 60, sunAzimuthDeg: 165, aerosolDensity: 0.16, turbidity: 2.4 },
  golden: { ...common, sunElevationDeg: 12, sunAzimuthDeg: 235, aerosolDensity: 0.25, turbidity: 3.2 },
  sunset: { ...common, sunElevationDeg: 2, sunAzimuthDeg: 270, aerosolDensity: 0.34, turbidity: 4.0 },
};
const budgets = {};
for (const [name, settings] of Object.entries(cases)) budgets[name] = computeRadiometricBudget(settings, profile);

const autoNoon = computeRadiometricBudget({ ...cases.noon, autoExposureEnabled: true }, profile);
const autoSunset = computeRadiometricBudget({ ...cases.sunset, autoExposureEnabled: true }, profile);

const start = performance.now();
let checksum = 0;
for (let i = 0; i < 250; i++) {
  const elevation = 2 + (58 * i) / 249;
  const budget = computeRadiometricBudget({ ...common, sunElevationDeg: elevation }, profile, i + 1);
  checksum += budget.directNormalLux + budget.skyIrradianceLux + budget.rendererExposure;
}
const elapsedMs = performance.now() - start;

const checks = {
  noon_direct_brighter_than_golden: budgets.noon.directNormalLux > budgets.golden.directNormalLux,
  golden_direct_brighter_than_sunset: budgets.golden.directNormalLux > budgets.sunset.directNormalLux * 2,
  noon_sky_brighter_than_sunset: budgets.noon.skyIrradianceLux > budgets.sunset.skyIrradianceLux * 1.5,
  sunset_sun_is_warmer: budgets.sunset.sunRendererColor.r / Math.max(1e-9, budgets.sunset.sunRendererColor.b) > budgets.noon.sunRendererColor.r / Math.max(1e-9, budgets.noon.sunRendererColor.b),
  manual_exposure_is_locked: Math.abs(budgets.noon.rendererExposure - budgets.sunset.rendererExposure) < 1e-12,
  auto_exposure_compensates_sunset: autoSunset.rendererExposure > autoNoon.rendererExposure,
  ground_bounce_follows_incident_energy: budgets.noon.groundBounceLux > budgets.sunset.groundBounceLux * 5,
  finite_checksum: Number.isFinite(checksum) && checksum > 0,
};
const report = {
  project: 'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL',
  lane: 'pure Node CPU; no WebGL or GPU',
  profile: profile.id,
  budgets,
  autoExposure: { noon: autoNoon, sunset: autoSunset },
  sweep: { iterations: 250, elapsedMs, perIterationMs: elapsedMs / 250, checksum },
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
};
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ allChecksPassed: report.allChecksPassed, failed: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k), sweep: report.sweep, key: { noon: budgets.noon, sunset: budgets.sunset } }, null, 2));
if (!report.allChecksPassed) process.exitCode = 1;
