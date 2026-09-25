import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { FixedStepClock } from '../../dist/src/core/FixedStepClock.js';

const outDir = new URL('../../evidence/cpu/', import.meta.url);
await mkdir(outDir, { recursive: true });
const cadences = [30, 60, 90, 120, 144, 240];
const seconds = 10;
const expectedSteps = seconds * 60;
const cadenceResults = [];
const start = performance.now();
for (const renderHz of cadences) {
  const clock = new FixedStepClock({ fixedHz: 60, maxCatchUpSteps: 4, maxFrameDeltaSeconds: 0.25 });
  let executedSteps = 0;
  for (let frame = 0; frame < renderHz * seconds; frame++) {
    executedSteps += clock.advance(1 / renderHz, true).steps;
  }
  cadenceResults.push({ renderHz, executedSteps, expectedSteps, snapshot: clock.snapshot() });
}
const stallClock = new FixedStepClock({ fixedHz: 60, maxCatchUpSteps: 4, maxFrameDeltaSeconds: 0.25 });
const stall = stallClock.advance(1, true);
const elapsedMs = performance.now() - start;
const checks = {
  cadenceIndependent: cadenceResults.every((entry) => entry.executedSteps === expectedSteps),
  noCadenceDrops: cadenceResults.every((entry) => entry.snapshot.totalDroppedSteps === 0),
  interpolationFinite: cadenceResults.every((entry) => Number.isFinite(entry.snapshot.interpolationAlpha) && entry.snapshot.interpolationAlpha >= 0 && entry.snapshot.interpolationAlpha <= 1),
  stallClamped: Math.abs(stall.clampedDeltaSeconds - 0.25) < 1e-12,
  stallCatchupBounded: stall.steps === 4,
  stallDropsBacklog: stall.droppedSteps === 11 && Math.abs(stall.totalDroppedSeconds - 11 / 60) < 1e-12,
};
const report = {
  project: 'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL',
  lane: 'Node CPU-only deterministic fixed-step scheduling validation',
  elapsedMs,
  fixedHz: 60,
  maxCatchUpSteps: 4,
  seconds,
  cadenceResults,
  stall,
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
};
await writeFile(new URL('fixed-step-clock.json', outDir), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ allChecksPassed: report.allChecksPassed, failed: Object.entries(checks).filter(([, value]) => !value).map(([key]) => key), cadenceResults, stall }, null, 2));
if (!report.allChecksPassed) process.exitCode = 1;
