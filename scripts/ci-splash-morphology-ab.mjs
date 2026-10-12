/**
 * Paired original-R1 vs experimental V2 splash render captures.
 * TRUE WebGL2 screenshots, same water state, identical camera and weather.
 * Each scene records the particle mass ledger and live bond count. This is
 * an *optical/morphology* intervention, not a claim to change water physics.
 *
 * npx playwright install chromium
 * npm run preview -- --host 127.0.0.1 --port 4173
 * node scripts/ci-splash-morphology-ab.mjs
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const output = 'captures/splash-morphology-ab';
fs.mkdirSync(output, { recursive: true });
const url = 'http://127.0.0.1:4173/ocean?capture=1&quality=capture&seed=20260925';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(180000);
const errors = [], shots = [];
page.on('pageerror', e => errors.push('page:' + e));
page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });

async function load() {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__THALASSA__?.ready === true, null, { timeout: 180000 });
  const error = await page.evaluate(() => window.__THALASSA__.error);
  if (error) throw Error(error);
  await page.addStyleTag({ content: 'main > :not(canvas){display:none!important}' });
}
async function advance(n, dt) {
  await page.evaluate(({ n, dt }) => window.__THALASSA__.simulate(n, dt), { n, dt });
}
async function camera(mode='oblique') {
  await page.evaluate(mode => {
    const api = window.__THALASSA__, b = window.__THALASSA_MODULES__.bodies.bodies[0];
    if (!b) throw Error('sphere body unavailable');
    const [x, y, z] = b.pos;
    const speed = Math.hypot(b.vel[0],b.vel[2]), ux = speed>0.2 ? b.vel[0]/speed : 1, uz = speed>0.2 ? b.vel[2]/speed : 0;
    const rx=-uz, rz=ux;
    const eye = mode==='overhead' ? [x-ux*2.3, 6.5, z-uz*2.3] : [x-ux*2.9+rx*1.25, 1.55, z-uz*2.9+rz*1.25];
    const target=[x, Math.max(0.30,y*0.3+0.4),z];
    const dx=target[0]-eye[0], dy=target[1]-eye[1], dz=target[2]-eye[2];
    api.engine.camera.setPose({
      position: eye, yawDeg: Math.atan2(dz,dx)*180/Math.PI,
      pitchDeg: Math.atan2(dy, Math.hypot(dx,dz))*180/Math.PI, fovDeg: 58,
    });
  },mode);
}
async function capture(pair, v2) {
  const r = await page.evaluate(v2 => {
    const api=window.__THALASSA__,mod=window.__THALASSA_MODULES__;
    mod.splash.renderer.morphologyV2 = v2;
    api.set('spray.render','fluid');
    api.step(1,1e-7);
    return {
      v2, renderer:api.telemetry().gpuRenderer,simTime:api.engine.time,
      glError:api.glError(),
      particles:mod.splash.mpm.stats.alive,
      bonds:mod.splash.ligaments.bonds.size,
      volume:mod.splash.ledger.audit(mod.splash.mpm.stats),
      body:mod.bodies.bodies[0] ? {
        pos:[...mod.bodies.bodies[0].pos], vel:[...mod.bodies.bodies[0].vel]
      } : null,
    };
  },v2);
  const name=pair + (v2 ? '_V2_MORPHOLOGY' : '_R1_REFERENCE');
  const file=output+'/'+name+'.png';
  await page.screenshot({path:file,timeout:180000});
  shots.push({name,file,bytes:fs.statSync(file).size,...r});
  console.log('CAPTURED',name,'gl',r.glError,'particles',r.particles,'bonds',r.bonds,'bytes',fs.statSync(file).size);
  if(r.glError!==0) errors.push('GL '+name+': '+r.glError);
}
async function paired(name) {
  await camera();
  await capture(name,false);
  await capture(name,true);
}
try {
  await load();
  await page.evaluate(()=>window.__THALASSA__.action('lab',{scene:'drop',radius:0.6,depth:5,tileDepth:5}));
  await advance(35,1/60);
  await paired('DROP_01_CONTACT');
  await advance(26,1/60);
  await paired('DROP_02_CROWN');
  await advance(34,1/60);
  await paired('DROP_03_BREAKUP');
  await page.reload({waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>window.__THALASSA__?.ready===true,null,{timeout:180000});
  await page.addStyleTag({content:'main > :not(canvas){display:none!important}'});
  await page.evaluate(()=>window.__THALASSA__.action('lab',{scene:'tow',speed:4.5,y:0.12,radius:0.6,tileDepth:5}));
  await advance(34,1/30);
  await paired('TOW_04_FAST_WAKE');
} catch(e) { errors.push('fatal: '+e); console.error(e); }
finally {
  fs.writeFileSync(output+'/receipts.json',JSON.stringify({commit:process.env.GITHUB_SHA,url,shots,errors},null,2));
  await browser.close();
}
if(shots.length!==8 || errors.length) process.exitCode=1;
