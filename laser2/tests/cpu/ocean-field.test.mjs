import { buildSeaState } from '../../dist/src/water/OceanSpectrum.js';
import { OceanWaveField } from '../../dist/src/water/OceanWaveField.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${JSON.stringify(detail)}`); return ok; };
const results = {};
for (const wind of [3, 7.2, 11]) {
  const sea = buildSeaState({ windSpeed10: wind, fetchM: 6000 });
  const field = new OceanWaveField();
  field.setComponents(sea.physics, sea.peakWavenumber);
  const t0 = 12.3;
  field.advance(t0, t0 + 1 / 60, 0.4, -0.7);
  field.setQueryTime(t0);
  // accuracy of inverse grid queries vs exact analytic inverse
  let maxErr = 0, sumErr = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    if (i === 0) {}
    const x = -9 + 18 * ((i * 0.61803) % 1), z = -9 + 18 * ((i * 0.41421) % 1);
    for (const s of [0, 0.5, 1]) {
      const t = t0 + s / 60;
      field.setQueryTime(t);
      const g = field.height(x, z);
      const a = field.analyticHeight(x, z, t);
      const e = Math.abs(g - a); maxErr = Math.max(maxErr, e); sumErr += e; n++;
    }
  }
  // Hs of physics set + full set
  const hsPhysics = 4 * Math.sqrt(sea.physics.reduce((s, c) => s + 0.5 * c.amplitude ** 2, 0));
  // timing: one grid build + 10k queries
  let t = performance.now();
  for (let k = 0; k < 20; k++) field.advance(t0 + (k + 1) / 60, t0 + (k + 2) / 60, 0, 0);
  const buildMs = (performance.now() - t) / 20; // one new slice per advance
  t = performance.now();
  let acc = 0; const out = { height: 0, vx: 0, vy: 0, vz: 0 };
  for (let k = 0; k < 10000; k++) { field.setQueryTime(t0 + 21 / 60 + (k % 12) / 720); acc += field.sample((k % 97) * 0.13 - 6, (k % 89) * 0.11 - 5, -0.2, out).height; }
  const queryUs = (performance.now() - t) * 1000 / 10000;
  results[`wind_${wind}`] = { hsTotal: sea.significantHeightM, hsPhysics, peakPeriodS: sea.peakPeriodS, peakWavelengthM: sea.peakWavelengthM, physicsComponents: sea.physics.length, detailComponents: sea.detail.length, maxInverseErrorM: maxErr, meanInverseErrorM: sumErr / n, gridBuildMs: buildMs, sampleQueryUs: queryUs, finite: Number.isFinite(acc) };
  check(`inverse accuracy wind ${wind}`, maxErr < 0.015 && sumErr / n < 0.004, { maxErr, mean: sumErr / n });
  check(`finite wind ${wind}`, Number.isFinite(acc), acc);
}
check('Hs grows with wind', results.wind_11.hsTotal > results['wind_7.2'].hsTotal && results['wind_7.2'].hsTotal > results.wind_3.hsTotal, results);
console.log(JSON.stringify(results, null, 1));
mkdirSync(new URL('../../evidence/cpu/', import.meta.url), { recursive: true });
writeFileSync(new URL('../../evidence/cpu/ocean-field-v8.json', import.meta.url), JSON.stringify({ results, failures }, null, 1));
if (failures.length) { console.error('FAIL', failures); process.exit(1); }
console.log('ocean-field: PASS');
