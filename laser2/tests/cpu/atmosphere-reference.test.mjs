import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import {
  atmosphericSunTransmittance,
  integrateAtmosphereRadiance,
  projectAtmosphereToSh,
} from '../../dist/src/lighting/atmosphere/AtmosphereMath.js';
import { DEFAULT_LIGHTING_SETTINGS } from '../../dist/src/lighting/LightingSettings.js';
import { luminance, sunDirectionFromAngles } from '../../dist/src/reference/lightingMath.js';

const outDir = new URL('../../evidence/cpu/', import.meta.url);
await mkdir(outDir, { recursive: true });
const settings = { ...DEFAULT_LIGHTING_SETTINGS };
const sunHigh = sunDirectionFromAngles(70, 145);
const sunLow = sunDirectionFromAngles(4, 260);
const highTrans = atmosphericSunTransmittance(sunHigh, settings, 16);
const lowTrans = atmosphericSunTransmittance(sunLow, settings, 16);
const zenith = integrateAtmosphereRadiance({ x: 0, y: 1, z: 0 }, sunHigh, settings, { viewSamples: 12, sunSamples: 4 });
const horizon = integrateAtmosphereRadiance({ x: 1, y: 0.01, z: 0 }, sunLow, settings, { viewSamples: 12, sunSamples: 4 });
const below = integrateAtmosphereRadiance({ x: 0, y: -0.2, z: 1 }, sunHigh, settings, { viewSamples: 12, sunSamples: 4 });
const sh = projectAtmosphereToSh(sunHigh, settings, 32, 6, 3);

let sink = 0;
const iterations = 20_000;
const started = performance.now();
for (let i = 0; i < iterations; i++) {
  const elevation = -4 + (i % 94);
  const azimuth = (i * 17) % 360;
  const sun = sunDirectionFromAngles(elevation, azimuth);
  const view = { x: Math.sin(i * 0.013) * 0.7, y: 0.2 + (i % 80) / 100, z: Math.cos(i * 0.013) * 0.7 };
  const radiance = integrateAtmosphereRadiance(view, sun, settings, { viewSamples: 4, sunSamples: 2 });
  sink += radiance.r + radiance.g + radiance.b;
}
const elapsedMs = performance.now() - started;
const finiteRgb = (rgb) => Object.values(rgb).every(Number.isFinite) && Object.values(rgb).every((v) => v >= 0);
const checks = {
  highSunTransmittanceFinite: finiteRgb(highTrans),
  lowSunTransmittanceFinite: finiteRgb(lowTrans),
  lowSunWarmerThanHigh: (lowTrans.r / Math.max(lowTrans.b, 1e-9)) > (highTrans.r / Math.max(highTrans.b, 1e-9)),
  zenithFinite: finiteRgb(zenith) && luminance(zenith) > 0,
  horizonFinite: finiteRgb(horizon) && luminance(horizon) > 0,
  groundFinite: finiteRgb(below),
  shFinite: sh.coefficients.length === 9 && sh.coefficients.every((rgb) => Object.values(rgb).every(Number.isFinite)),
  sinkFinite: Number.isFinite(sink) && sink > 0,
};
const report = {
  test: 'atmosphere-reference-cpu',
  runtime: process.version,
  iterations,
  elapsedMs,
  evaluationsPerSecond: iterations / (elapsedMs / 1000),
  highTrans,
  lowTrans,
  zenith,
  horizon,
  below,
  sh,
  sink,
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
};
await writeFile(new URL('atmosphere-reference.json', outDir), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.allChecksPassed) process.exitCode = 1;
