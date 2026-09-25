import { mkdir, writeFile } from 'node:fs/promises';
import { computeAtmosphereLut } from '../../dist/src/lighting/atmosphere/AtmosphereLutJob.js';
import { DEFAULT_LIGHTING_SETTINGS } from '../../dist/src/lighting/LightingSettings.js';

const root = new URL('../../', import.meta.url);
const out = new URL('evidence/cpu/atmosphere-worker-v7.json', root);
await mkdir(new URL('evidence/cpu/', root), { recursive: true });
const common = {
  generation: 1,
  width: 48,
  height: 24,
  viewSamples: 6,
  sunSamples: 3,
  settings: { ...DEFAULT_LIGHTING_SETTINGS, sunElevationDeg: 12, turbidity: 3.2, multipleScatteringFactor: 0.42 },
};
const first = computeAtmosphereLut({ ...common, scatteringOrders: 1 });
const higher = computeAtmosphereLut({ ...common, generation: 2, scatteringOrders: 4 });
const a = new Float32Array(first.data);
const b = new Float32Array(higher.data);
let changedChannels = 0;
let maxValue = 0;
let minValue = Infinity;
let maxDifference = 0;
for (let i = 0; i < b.length; i++) {
  const value = b[i];
  if (!Number.isFinite(value)) throw new Error(`non-finite LUT value at ${i}`);
  if ((i & 3) !== 3) {
    maxValue = Math.max(maxValue, value);
    minValue = Math.min(minValue, value);
    const difference = Math.abs(value - a[i]);
    maxDifference = Math.max(maxDifference, difference);
    if (difference > 1e-7) changedChannels++;
  }
}
const energyRatio = higher.finalEnergy / Math.max(first.finalEnergy, 1e-12);
const checks = {
  dimensions: a.length === 48 * 24 * 4 && b.length === a.length,
  finite: Number.isFinite(maxValue) && Number.isFinite(minValue),
  positive: maxValue > 0 && minValue >= 0,
  higherOrdersIncreaseEnergy: energyRatio > 1.02,
  higherOrdersChangeAngularField: changedChannels > 48 * 24,
  bounded: maxValue < 10,
};
const report = {
  project: 'LASER2_LIGHTING_FOUNDRY_V7',
  test: 'pure CPU worker-job atmosphere LUT',
  firstOrder: { computeMs: first.computeMs, finalEnergy: first.finalEnergy },
  fourthOrder: { computeMs: higher.computeMs, firstOrderEnergy: higher.firstOrderEnergy, finalEnergy: higher.finalEnergy },
  energyRatio,
  changedChannels,
  maxDifference,
  minValue,
  maxValue,
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
  truthBoundary: 'Orders 2–4 are a bounded angular redistribution approximation, not a full spectral multiple-scattering precomputation.',
};
await writeFile(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.allChecksPassed) process.exit(1);
