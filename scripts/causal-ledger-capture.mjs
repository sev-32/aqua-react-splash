/**
 * Reproducible T0/T3/T4 boundary audit: sphere entry at 30 / 60 / 120 Hz.
 * This is a REAL WebGL2 browser run, not a synthetic plot or proof of
 * momentum conservation. Report machine, GL error and all mass residuals.
 *
 * Usage:
 *   npm run dev -- --host 127.0.0.1 --port 8080
 *   node scripts/causal-ledger-capture.mjs [out.json]
 *
 * Install Playwright (local or global) and Chromium first. Defaults to the
 * SwiftShader path for CPU-compatible browser verification.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(globalRoot + '/playwright/index.mjs'));
}

const OUT = process.argv[2] || 'captures/causal/ledger.json';
const URL = process.env.THALASSA_URL || 'http://127.0.0.1:8080/ocean?capture=1&quality=capture&seed=20260925';
const RATES = [30, 60, 120];
const SECONDS = Number(process.env.CAUSAL_SECONDS || 2);
const PACKET_SCALE = Number(process.env.ENTRY_PACKET_SCALE || 1);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
const runs = [];

try {
  for (const rate of RATES) {
    // Reload to avoid contaminating the next test with previous GPU field and
    // ocean spectrum state. Same seed, sphere geometry and 2-second trajectory.
    await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__THALASSA__?.ready === true, null, { timeout: 180000 });
    const setup = await page.evaluate((packetScale) => {
      const api = window.__THALASSA__;
      if (api.error) throw Error(api.error);
      api.action('lab', { scene: 'drop', radius: 0.6, depth: 5, tileDepth: 5 });
      window.__THALASSA_MODULES__.splash.entryPacketScale = packetScale;
      return {
        renderer: api.telemetry().gpuRenderer,
        bodyStart: [...window.__THALASSA_MODULES__.bodies.bodies[0].pos],
      };
    }, PACKET_SCALE);

    const dt = 1 / rate, samples = [];
    const frames = Math.round(SECONDS * rate);
    const stride = Math.max(1, Math.round(rate / 10));
    for (let i = 0; i < frames; i += stride) {
      const data = await page.evaluate(({ n, dt }) => {
        const api = window.__THALASSA__;
        api.simulate(n, dt);
        const m = window.__THALASSA_MODULES__;
        const a = m.splash.ledger.audit(m.splash.mpm.stats);
        const b = m.bodies.bodies[0];
        return {
          t: api.engine.time,
          emitted: a.emitted, settled: a.settled, lost: a.lost,
          launchEntry: m.splash.launchVolumes.entry,
          launchInteraction: m.splash.launchVolumes.interaction,
          launchShore: m.splash.launchVolumes.shore,
          launchProvenanceResidual: a.emitted - m.splash.launchVolumes.entry - m.splash.launchVolumes.interaction - m.splash.launchVolumes.shore,
          live: a.live, tiles: a.tiles, shore: a.shore,
          openBoundary: a.oceanBoundary,
          solverResidual: a.solverVolumeResidual,
          unrouted: a.unroutedVolume,
          returnedImpulse: a.returnedImpulse,
          returnedEnergy: a.returnedKineticEnergy,
          invalidTransfers: a.invalidTransfers,
          body: b ? { pos: [...b.pos], vel: [...b.vel] } : null,
          tileCount: m.interaction.tiles.tiles.length,
          glError: api.glError(),
        };
      }, { n: Math.min(stride, frames - i), dt });
      samples.push(data);
    }
    // Matched real renderer evidence at the same final simulated time.
    // A 1e-7 s render step avoids mutating the measurement trajectory.
    await page.evaluate(() => {
      const api = window.__THALASSA__, m = window.__THALASSA_MODULES__;
      const b = m.bodies.bodies[0];
      if (b) {
        const at = b.pos;
        const eye = [at[0] - 5, 2.4, at[2] - 4.0];
        const dx = at[0] - eye[0], dz = at[2] - eye[2], dy = at[1] - eye[1];
        api.engine.camera.setPose({
          position: eye, yawDeg: Math.atan2(dz, dx) * 180 / Math.PI,
          pitchDeg: Math.atan2(dy, Math.hypot(dx,dz)) * 180 / Math.PI, fovDeg: 54,
        });
      }
      api.step(1, 1e-7);
    });
    const shotFile = dirname(OUT) + '/ENTRY_' + rate + 'HZ.png';
    await page.addStyleTag({ content: 'main > :not(canvas){display:none!important}' });
    await page.screenshot({ path: shotFile, timeout: 180000 });
    const peak = (name) => Math.max(...samples.map(s => Math.abs(s[name])));
    const final = samples[samples.length - 1];
    runs.push({
      rate, dt, seconds: SECONDS, renderer: setup.renderer, bodyStart: setup.bodyStart,
      maxAbsSolverResidual: peak('solverResidual'),
      maxAbsUnrouted: peak('unrouted'),
      maxInvalidTransfers: peak('invalidTransfers'),
      final, samples, screenshot: shotFile,
    });
    console.log(JSON.stringify({
      rate, maxAbsSolverResidual: runs.at(-1).maxAbsSolverResidual,
      maxAbsUnrouted: runs.at(-1).maxAbsUnrouted, final,
    }));
  }
} finally {
  await browser.close();
}

const summary = {
  url: URL, seconds: SECONDS, rates: RATES, entryPacketScale: PACKET_SCALE, pageErrors,
  // These are empirical comparisons; no pass/fail tolerances are imposed
  // until a hardware baseline has been reviewed.
  runSummary: runs.map(({ rate, maxAbsSolverResidual, maxAbsUnrouted, maxInvalidTransfers, final }) => ({
    rate, maxAbsSolverResidual, maxAbsUnrouted, maxInvalidTransfers,
    finalWater: { emitted: final.emitted, settled: final.settled, live: final.live, lost: final.lost },
    finalBody: final.body,
  })),
  runs,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2));
if (pageErrors.length) {
  console.error(pageErrors.join('\n'));
  process.exitCode = 1;
}
