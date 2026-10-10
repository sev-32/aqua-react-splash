/**
 * THALASSA genuine renderer proof suite.
 * Runs from the COMPILED /ocean route in Chromium/SwiftShader. Screenshots
 * are unmodified Playwright screenshots of actual WebGL2 frames. Every
 * image is paired with a telemetry JSON receipt and scene parameters.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.env.PROOF_OUT ?? 'captures/real-proofs';
const url = process.env.PROOF_URL ?? 'http://127.0.0.1:4173/ocean?capture=1&quality=low&seed=20260925';
const dt = 1 / 30;
fs.mkdirSync(out, { recursive: true });
const errors = [], receipt = { sourceCommit: process.env.GITHUB_SHA ?? null, url, browser: null, shots: [], errors };
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(180000);
page.on('pageerror', e => errors.push('page: ' + String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

async function boot() {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__THALASSA__?.ready === true, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__THALASSA__.error);
  if (err) throw Error('engine boot: ' + err);
  // Hide only React's settings overlay; don't change the actual WebGL canvas.
  await page.addStyleTag({ content: 'aside{display:none!important}' });
  receipt.browser = await page.evaluate(() => ({
    renderer: window.__THALASSA__.telemetry().gpuRenderer,
    webgl2: !!document.querySelector('canvas')?.getContext('webgl2'),
  }));
}

async function advance(n, step = dt) {
  // Render one actual frame at the end of each simulated segment. This
  // avoids drawing redundant intermediate frames during proof captures.
  if (n > 1) await page.evaluate(({ n, step }) => window.__THALASSA__.simulate(n - 1, step), { n, step });
  await page.evaluate(step => window.__THALASSA__.step(1, step), step);
}

async function capture(name, config, advanceFrames = 1, frameDt = dt) {
  const begin = Date.now();
  try {
    await advance(advanceFrames, frameDt);
    const state = await page.evaluate(() => {
      const api = window.__THALASSA__;
      const m = window.__THALASSA_MODULES__;
      const ledger = m.splash.ledger.audit(m.splash.mpm.stats);
      const body = m.bodies.bodies[0];
      return {
        simTime: api.engine.time,
        frameIndex: api.engine.frameIndex,
        glError: api.glError(),
        telemetry: api.telemetry(),
        conservation: ledger,
        tileCount: m.interaction.tiles.tiles.length,
        shoreActive: m.shore.active,
        body: body && { id: body.id, position: [...body.pos], velocity: [...body.vel] },
      };
    });
    const file = path.join(out, name + '.png');
    await page.screenshot({ path: file, timeout: 180000 });
    receipt.shots.push({ name, file, config, frames: advanceFrames, dt: frameDt, wallMs: Date.now() - begin, ...state });
    console.log('CAPTURED', name, fs.statSync(file).size, 'bytes', 'gl', state.glError,
      't', state.simTime.toFixed(3), 'unrouted', state.conservation.unroutedVolume.toExponential(2));
  } catch (e) {
    errors.push(name + ': ' + String(e));
    console.log('FAILED SHOT', name, String(e));
  }
}

async function ocean(preset, morph, debug=0) {
  await page.evaluate(({ preset,morph,debug }) => {
    const a = window.__THALASSA__;
    a.setPose(preset);
    a.set('weather.coupleSea', false);
    a.set('sea.morph', morph);
    a.set('debug', debug);
    a.applySea();
  }, { preset,morph,debug });
}
async function lab(scene, options={}) {
  await page.evaluate(({scene,options}) => {
    const a = window.__THALASSA__;
    a.set('debug', 0);
    a.action('lab', { scene, radius: 0.6, tileDepth: 5, ...options });
  },{scene,options});
}

try {
  await boot();
  await ocean('wide', 1);
  await capture('OCEAN_01_WIDE_GENTLE',{preset:'wide',morph:1},5);
  await ocean('glitter', 3);
  await capture('OCEAN_02_SUN_GLITTER',{preset:'glitter',morph:3},5);
  await ocean('deck', 5.5);
  await capture('OCEAN_03_DECK_ROUGH',{preset:'deck',morph:5.5},5);
  await ocean('aerial', 7);
  await capture('OCEAN_04_STORM_AERIAL',{preset:'aerial',morph:7},5);
  await ocean('wide', 3, 1);
  await capture('DEBUG_01_SURFACE_NORMALS',{preset:'wide',morph:3,debug:1},4);
  await ocean('wide', 3, 4);
  await capture('DEBUG_02_FOAM_FIELD',{preset:'wide',morph:3,debug:4},4);
  await lab('drop');
  await capture('SPHERE_01_ABOVE_WATER',{scene:'drop',stage:'pre-impact'},4,1/60);
  await capture('SPHERE_02_FIRST_CONTACT',{scene:'drop',stage:'impact'},35,1/60);
  await capture('SPHERE_03_CROWN_DEVELOPMENT',{scene:'drop',stage:'post-impact'},23,1/60);
  await capture('SPHERE_04_RETURN_FLOW',{scene:'drop',stage:'return'},45,1/60);
  await lab('tow',{speed:1,y:0.12});
  await capture('TOW_01_SLOW',{scene:'tow',speed:1},40,1/30);
  await lab('tow',{speed:2.2,y:0.12});
  await capture('TOW_02_MID',{scene:'tow',speed:2.2},40,1/30);
  await lab('tow',{speed:4.5,y:0.12});
  await capture('TOW_03_FAST',{scene:'tow',speed:4.5},32,1/30);
  await ocean('wide', 0, 6);
  await capture('DEBUG_03_INTERACTION_TILES',{scene:'tow',speed:4.5,debug:6},2);
  await lab('plunge');
  await capture('PLUNGE_01_DOWN_UP',{scene:'plunge'},44,1/30);
  await page.evaluate(() => window.__THALASSA__.action('goToShore','surf'));
  await capture('SHORE_01_SURF_SCENE',{scene:'shore',note:'may be in 45s spin-up'},10,1/30);
} catch(e) {
  errors.push('fatal: ' + String(e));
  console.error('FATAL', e);
} finally {
  fs.writeFileSync(path.join(out,'receipts.json'),JSON.stringify(receipt,null,2));
  await browser.close();
}
if (!receipt.shots.length) process.exitCode=1;
