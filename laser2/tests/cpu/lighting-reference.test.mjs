import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import {
  approximateSunRgb,
  sunDirectionFromAngles,
  thinSheetTransmission,
  luminance,
} from '../../dist/src/reference/lightingMath.js';

const outDir = new URL('../../evidence/cpu/', import.meta.url);
await mkdir(outDir, { recursive: true });
const cases = [
  { elevation: 65, azimuth: 140, shadow: 1 },
  { elevation: 12, azimuth: 240, shadow: 0.55 },
  { elevation: -2, azimuth: 300, shadow: 0.2 },
];
const evaluations = cases.map((c) => {
  const direction = sunDirectionFromAngles(c.elevation, c.azimuth);
  const sun = approximateSunRgb(c.elevation, 3.0);
  const transmitted = thinSheetTransmission(sun, { r: 0.92, g: 0.89, b: 0.78 }, 0.27, 0.42, c.shadow, 0.55);
  return { ...c, direction, sun, transmitted, luminance: luminance(transmitted) };
});
let sink = 0;
const iterations = 1_000_000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  const sun = approximateSunRgb((i % 96) - 6, 2.5 + (i % 20) * 0.1);
  const t = thinSheetTransmission(sun, { r: 0.92, g: 0.89, b: 0.78 }, 0.27, 0.42, (i % 100) / 100, 0.2 + (i % 70) / 100);
  sink += t.r + t.g + t.b;
}
const elapsedMs = performance.now() - start;
const checks = {
  directionsNormalized: evaluations.every((e) => Math.abs(Math.hypot(e.direction.x, e.direction.y, e.direction.z) - 1) < 1e-12),
  shadowReducesTransmission: evaluations[0].luminance > evaluations[1].luminance && evaluations[1].luminance > evaluations[2].luminance,
  finite: evaluations.every((e) => Object.values(e.transmitted).every(Number.isFinite)),
  sinkFinite: Number.isFinite(sink),
};
const report = {
  test: 'lighting-reference-cpu',
  runtime: process.version,
  iterations,
  elapsedMs,
  evaluationsPerSecond: iterations / (elapsedMs / 1000),
  sink,
  evaluations,
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
};
await writeFile(new URL('lighting-reference.json', outDir), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.allChecksPassed) process.exitCode = 1;
