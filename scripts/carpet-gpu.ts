/**
 * GPU parity check for the carpet kernel: runs heightfieldBEST's tow (S1 geometry) in the
 * real engine through window.__THALASSA__ (lab scene, uniform 1 m carpet depth), reads the
 * tile back, and runs the CPU mirror (sim/carpetCpu.ts) with the same numerics, following
 * rule and limiter. Reports both fields' extremes and their correlation in the body frame,
 * and writes body-frame field maps laid out like the BEST captures (12 m window, body at
 * x = 1.2 m after a 5.7 m tow).
 *
 *   npx vite --port 8080 &
 *   npx esbuild scripts/carpet-gpu.ts --bundle --platform=node --format=esm --external:playwright --outfile=/tmp/cg.mjs
 *   node /tmp/cg.mjs [outDir] [speeds…]
 */
import { CarpetCpu, carpetSubsteps, stableKappa, carpetDx, CARPET_SMOOTH, type CarpetSphere } from '../src/ocean/sim/carpetCpu';
import { sampleField, type FieldView } from '../src/ocean/sim/wakeMetrics';
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

const outDir = process.argv[2] ?? 'captures/carpet-gpu';
const speeds = process.argv.slice(3).map(Number);
const U_LIST = speeds.length ? speeds : [1.0, 2.0, 4.5];
const LIMITER = process.env.LIMITER !== '0';
const url = process.env.THALASSA_URL ?? 'http://127.0.0.1:8080/ocean?capture=1&quality=high';
mkdirSync(outDir, { recursive: true });

function crc32(buf: Buffer) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(file: string, w: number, h: number, rgb: Buffer) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const chunk = (t: string, d: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

/** η in the body frame: a = along the track (body at a = aBody), b = lateral. */
function bodyFrame(v: FieldView, body: { x: number; z: number }, dir: [number, number], aBody: number, L: number, h: number) {
  const m = Math.round(L / h), f = new Float64Array(m * m);
  const lat = [-dir[1], dir[0]];
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
    const a = -L / 2 + (i + 0.5) * h - aBody, b = -L / 2 + (j + 0.5) * h;
    f[j * m + i] = sampleField(v, body.x + dir[0] * a + lat[0] * b, body.z + dir[1] * a + lat[1] * b);
  }
  return { m, f };
}
function mapPng(file: string, m: number, f: Float64Array, mark: [number, number, number], scale = 4) {
  const range = f.reduce((m, x) => Math.max(m, Math.abs(x)), 1e-9);
  const W = m * scale, rgb = Buffer.alloc(W * W * 3);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const val = Math.max(-1, Math.min(1, f[Math.floor(y / scale) * m + Math.floor(x / scale)] / range));
    const a = Math.pow(Math.abs(val), 0.6), o = (y * W + x) * 3;
    if (val >= 0) { rgb[o] = 255; rgb[o + 1] = rgb[o + 2] = Math.round(255 * (1 - a)); }
    else { rgb[o] = rgb[o + 1] = Math.round(255 * (1 - a)); rgb[o + 2] = 255; }
  }
  for (let k = 0; k < 720; k++) {
    const t = (k / 720) * 2 * Math.PI, px = Math.round((mark[0] + mark[2] * Math.cos(t)) * scale), py = Math.round((mark[1] + mark[2] * Math.sin(t)) * scale);
    if (px >= 0 && py >= 0 && px < W && py < W) { const o = (py * W + px) * 3; rgb[o] = rgb[o + 1] = rgb[o + 2] = 0; }
  }
  png(file, W, W, rgb);
  return range;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- page-side handles to the engine's globals */
// Playwright from the project, or a global install (as scripts/ocean-capture.mjs).
let chromium: typeof import('playwright').chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const { execSync } = await import('node:child_process');
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(path.join(globalRoot, 'playwright', 'index.mjs')));
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => (window as any).__THALASSA__?.ready === true, null, { timeout: 180000 });

const R = 0.68, YC = 0.12, TRAVEL = 5.7, DT = 1 / 60;
const report: Record<string, unknown>[] = [];
for (const U of U_LIST) {
  const t0 = Date.now();
  const g = await page.evaluate(({ U, R, YC, TRAVEL, DT, LIMITER }) => {
    const api = (window as any).__THALASSA__, M = (window as any).__THALASSA_MODULES__;
    api.set('interaction.limiterEnabled', LIMITER);
    api.action('lab', { scene: 'tow', radius: R, y: YC, speed: U, tileDepth: 1 });
    const b = M.bodies.bodies[0];
    const start = [b.pos[0], b.pos[2]];
    const frames = Math.round(TRAVEL / U / DT);
    api.step(frames, DT);
    const tiles = M.interaction.tiles;
    const t = tiles.tiles.find((x: any) => !x.retiring && x.followIds.includes(b.id));
    const f = tiles.readField(t);
    const cfg = tiles.cfg;
    return {
      n: f.n, dx: f.dx, origin: f.origin, depth: f.depth, substeps: f.substeps, kappa: f.kappa, eta: Array.from(f.eta as Float32Array),
      body: { x: b.pos[0], y: b.pos[1], z: b.pos[2], vx: b.vel[0], vz: b.vel[2] }, start, frames, glError: api.glError(),
      damping: cfg.damping, viscosity: cfg.viscosity, hyper: cfg.hyper, maxSlope: cfg.maxSlope, relax: cfg.relax, released: tiles.releasedVolume,
    };
  }, { U, R, YC, TRAVEL, DT, LIMITER });
  const gpuMs = Date.now() - t0;
  const dir: [number, number] = [g.body.vx / Math.hypot(g.body.vx, g.body.vz), g.body.vz / Math.hypot(g.body.vx, g.body.vz)];
  const vg: FieldView = { field: g.eta, n: g.n, dx: g.dx, origin: g.origin as [number, number] };

  // CPU mirror with the engine's numerics, following rule and limiter, in the tow frame.
  const n = g.n, dx = g.dx;
  const cpu = new CarpetCpu({ n, dx, depth: 1, damping: g.damping, viscosity: g.viscosity, hyper: g.hyper, smooth: CARPET_SMOOTH, limiter: LIMITER, maxSlope: g.maxSlope, relax: g.relax },
    [Math.round((-9 + 9 - (n * dx) / 2) / dx) * dx, Math.round(-(n * dx) / 2 / dx) * dx]);
  const body: CarpetSphere = { x: -9, y: YC, z: 0, r: R };
  cpu.occupancy([body], () => 0, cpu.occ, cpu.chi);
  const sub = carpetSubsteps(dx, DT, U);
  for (let fr = 0; fr < g.frames; fr++) {
    const size = n * dx, cx = cpu.origin[0] + size / 2, want = body.x - size * 0.2;
    const dd = want - cx;
    if (Math.abs(dd) >= size * 0.16) { const sx = Math.round(dd / dx / 16) * 16; if (sx) cpu.shift(sx, 0); }
    for (let k = 1; k <= sub; k++) { body.x = -9 + U * DT * (fr + k / sub); cpu.p.kappa = stableKappa(dx, DT / sub); cpu.step([body], DT / sub); }
  }
  const vc: FieldView = { field: cpu.eta, n, dx, origin: cpu.origin };
  // Body-frame windows (BEST layout) and their agreement near the body.
  const aBody = 1.2;
  const G1 = bodyFrame(vg, g.body, dir, aBody, 12, dx), C1 = bodyFrame(vc, body, [1, 0], aBody, 12, dx);
  let sgc = 0, sgg = 0, scc = 0, gMax = 0, gMin = 0, cMax = 0, cMin = 0;
  for (let i = 0; i < G1.f.length; i++) {
    const a = G1.f[i], c = C1.f[i];
    sgc += a * c; sgg += a * a; scc += c * c;
    gMax = Math.max(gMax, a); gMin = Math.min(gMin, a); cMax = Math.max(cMax, c); cMin = Math.min(cMin, c);
  }
  const tag = `U${U.toFixed(1).replace('.', 'p')}${LIMITER ? '' : '_nolim'}`;
  const mark: [number, number, number] = [(6 + aBody) / dx, 6 / dx, R / dx];
  const gr = mapPng(path.join(outDir, `carpet_gpu_${tag}.png`), G1.m, G1.f, mark);
  const cr = mapPng(path.join(outDir, `carpet_cpu_${tag}.png`), C1.m, C1.f, mark);
  const row = {
    U, limiter: LIMITER, substeps: g.substeps, kappa: +g.kappa.toFixed(1), dx, n, depth: g.depth, frames: g.frames, gpuMs, glError: g.glError,
    gpu: { max: +gMax.toFixed(3), min: +gMin.toFixed(3), range: +gr.toFixed(3), released: g.released },
    cpu: { max: +cMax.toFixed(3), min: +cMin.toFixed(3), range: +cr.toFixed(3), released: cpu.ledger.released },
    correlation: +(sgc / Math.sqrt(sgg * scc)).toFixed(3),
  };
  console.log(JSON.stringify(row));
  report.push(row);
}
report.push({ errors });
writeFileSync(path.join(outDir, 'carpet-gpu.json'), JSON.stringify(report, null, 1));
await browser.close();
