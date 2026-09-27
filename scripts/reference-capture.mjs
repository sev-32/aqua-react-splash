#!/usr/bin/env node
/**
 * Reference capture: renders a scene of an UNMODIFIED reference build (served over HTTP)
 * and writes PNG frames, optional top-view field maps, and a JSON receipt.
 *
 *   node scripts/reference-capture.mjs docs/consolidation/scenes/best-tows.json
 *
 * Scene file:
 *   {
 *     "url": "http://127.0.0.1:8095/originals/heightfieldBEST.html",
 *     "out": "captures/best-tows",
 *     "webgpu": false,          // add the SwiftShader WebGPU flags
 *     "headed": false,          // run under a display (e.g. xvfb-run) instead of headless
 *     "setup": "js run once after load",
 *     "shots": [{
 *       "name": "tow_U4.5",
 *       "js": "js run before waiting",
 *       "waitMs": 0, "until": "js predicate", "timeoutMs": 600000,
 *       "probe": "js expression saved into the receipt",
 *       "field": "js expression returning {n, field:[n*n values], marks?:[[cx,cz,r]...]}"
 *     }]
 *   }
 *
 * Field maps are written as <name>_field.png (blue = down, white = 0, red = up, symmetric
 * range = max |value|, marks drawn as black circles in cell units).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const root = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(path.join(root, 'playwright', 'index.mjs')));
}

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
if (cfg.webgpu) args.push('--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan');

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function writePng(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]));
}
function fieldPng(file, { n, field, marks = [] }, scale = 4) {
  const range = Math.max(1e-9, ...field.map(Math.abs));
  const W = n * scale, rgb = Buffer.alloc(W * W * 3);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const v = Math.max(-1, Math.min(1, field[Math.floor(y / scale) * n + Math.floor(x / scale)] / range));
    const a = Math.abs(v) ** 0.6, o = (y * W + x) * 3, dim = Math.round(255 * (1 - a));
    if (v >= 0) { rgb[o] = 255; rgb[o + 1] = dim; rgb[o + 2] = dim; } else { rgb[o] = dim; rgb[o + 1] = dim; rgb[o + 2] = 255; }
  }
  for (const [mx, my, mr] of marks) for (let k = 0; k < 720; k++) {
    const t = (k / 720) * 2 * Math.PI, px = Math.round((mx + mr * Math.cos(t)) * scale), py = Math.round((my + mr * Math.sin(t)) * scale);
    if (px >= 0 && py >= 0 && px < W && py < W) rgb.fill(0, (py * W + px) * 3, (py * W + px) * 3 + 3);
  }
  writePng(file, W, W, rgb);
  return range;
}

const browser = await chromium.launch({ args, headless: !cfg.headed });
const page = await browser.newPage({ viewport: cfg.viewport || { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => { if (logs.length < 300) logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
fs.mkdirSync(cfg.out, { recursive: true });
const t0 = Date.now();
await page.goto(cfg.url, { waitUntil: 'load', timeout: 120000 });
if (cfg.setup) await page.evaluate(cfg.setup);
const receipt = { url: cfg.url, scene: path.basename(process.argv[2]), started: new Date().toISOString(), shots: [] };
for (const s of cfg.shots) {
  if (s.js) await page.evaluate(s.js);
  if (s.waitMs) await page.waitForTimeout(s.waitMs);
  if (s.until) await page.waitForFunction(s.until, null, { timeout: s.timeoutMs || 600000, polling: 500 });
  const probe = s.probe ? await page.evaluate(s.probe).catch((e) => `probe error: ${e.message}`) : null;
  const shot = { name: s.name, wallSeconds: (Date.now() - t0) / 1000, probe };
  if (s.field) {
    const f = await page.evaluate(s.field);
    shot.fieldRange = fieldPng(path.join(cfg.out, `${s.name}_field.png`), f, s.fieldScale || 4);
  }
  await page.screenshot({ path: path.join(cfg.out, `${s.name}.png`), timeout: 300000 });
  receipt.shots.push(shot);
  console.log(s.name, `${shot.wallSeconds.toFixed(1)}s`, probe ? JSON.stringify(probe).slice(0, 300) : '');
}
receipt.logs = logs;
fs.writeFileSync(path.join(cfg.out, 'receipt.json'), JSON.stringify(receipt, null, 1));
await browser.close();
