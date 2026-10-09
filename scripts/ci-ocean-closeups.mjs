/**
 * THALASSA genuine renderer proof suite.
 * Runs from the COMPILED /ocean route in Chromium/SwiftShader. Screenshots
 * are unmodified Playwright screenshots of actual WebGL2 frames. Every
 * image is paired with a telemetry JSON receipt and scene parameters.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.env.PROOF_OUT ?? 'captures/closeup-proofs';
const url = process.env.PROOF_URL ?? 'http://127.0.0.1:4173/ocean?capture=1&quality=capture&seed=20260925';
const dt = 1 / 30;
fs.mkdirSync(out, { recursive: true });
const errors = [], receipt = { sourceCommit: process.env.GITHUB_SHA ?? null, url, browser: null, shots: [], errors };
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(180000);
page.on('pageerror', e => errors.push('page: ' + String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

async function boot() {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__THALASSA__?.ready === true, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__THALASSA__.error);
  if (err) throw Error('engine boot: ' + err);
  // Hide only React's settings overlay; don't change the actual WebGL canvas.
  await page.addStyleTag({ content: 'main > :not(canvas){display:none!important}' });
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
    if (config.focus) await focus(config.focus);
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

async function focus(mode = 'trail') {
  await page.evaluate(mode => {
    const e = window.__THALASSA__.engine, b = window.__THALASSA_MODULES__.bodies.bodies[0];
    if (!b) return;
    const sp = Math.hypot(b.vel[0], b.vel[2]);
    const ux = sp > 0.15 ? b.vel[0]/sp : 1;
    const uz = sp > 0.15 ? b.vel[2]/sp : 0;
    const sx = -uz, sz = ux;
    const target = mode === 'pre' ? [b.pos[0], b.pos[1], b.pos[2]] :
      [b.pos[0]-ux*0.7, 0.35, b.pos[2]-uz*0.7];
    const pos = mode === 'overhead' ? [b.pos[0]-ux*1.5, 7, b.pos[2]-uz*1.5] :
      [b.pos[0]-ux*3.4+sx*1.7, mode==='pre'?2.4:1.65, b.pos[2]-uz*3.4+sz*1.7];
    const dx=target[0]-pos[0], dz=target[2]-pos[2], dy=target[1]-pos[1];
    e.camera.setPose({position:pos, yawDeg:Math.atan2(dz,dx)*180/Math.PI,
      pitchDeg:Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI,
      fovDeg:mode==='overhead'?58:62});
  },mode);
}

try {
  await boot();
  await lab('drop');
  await capture('HERO_01_SPHERE_DESCENT',{scene:'drop',focus:'pre'},4,1/60);
  await capture('HERO_02_IMPACT_CONTACT',{scene:'drop',focus:'trail'},35,1/60);
  await capture('HERO_03_EJECTED_SHEET',{scene:'drop',focus:'trail'},22,1/60);
  await capture('HERO_04_SPLASH_RETURN',{scene:'drop',focus:'trail'},38,1/60);
  await lab('tow',{speed:2.2,y:0.12});
  await capture('HERO_05_TOW_2P2',{scene:'tow',speed:2.2,focus:'trail'},32,1/30);
  await lab('tow',{speed:4.5,y:0.12});
  await capture('HERO_06_TOW_4P5',{scene:'tow',speed:4.5,focus:'trail'},29,1/30);
  await capture('HERO_07_WAKE_OVERHEAD',{scene:'tow',speed:4.5,focus:'overhead'},2,1/30);
  await page.evaluate(() => window.__THALASSA__.set('debug',6));
  await capture('HERO_08_TILE_DIAGNOSTIC',{scene:'tow',debug:6,focus:'overhead'},2,1/30);
  await page.evaluate(() => { window.__THALASSA__.set('debug',0); window.__THALASSA__.set('spray.render','points'); });
  await capture('HERO_09_SPRAY_POINTS',{scene:'tow',spray:'points',focus:'trail'},1,1/30);
  await page.evaluate(() => window.__THALASSA__.set('spray.render','fluid'));
  await capture('HERO_10_SPRAY_FLUID',{scene:'tow',spray:'fluid',focus:'trail'},1,1/30);
  await lab('plunge');
  await capture('HERO_11_PLUNGE_TURBULENCE',{scene:'plunge',focus:'trail'},42,1/30);
} catch(e) {
  errors.push('fatal: ' + String(e));
  console.error('FATAL',e);
} finally {
  fs.writeFileSync(path.join(out,'receipts.json'),JSON.stringify(receipt,null,2));
  await browser.close();
}
if (!receipt.shots.length) process.exitCode=1;
