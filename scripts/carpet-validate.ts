/**
 * P1 acceptance runs for the carpet kernel, on the CPU mirror (sim/carpetCpu.ts):
 *
 *   S1  heightfieldBEST's tow, same geometry: H = 1 m, sphere r = 0.68 m with its centre
 *       0.12 m above the still surface, constant tows at 1.0 / 2.0 / 4.5 m/s from x = −4.5 m,
 *       snapshot when x > 1.2 m (the frames compared with BEST's).
 *   S1m the supercritical tows (3.5 / 4.5 / 6 m/s) run long enough (carpet following) for the
 *       start-up transient to fall behind. Measured: the angle holding 99 % of the wake
 *       energy 5–9 m from the body, past its non-radiating near field (causality:
 *       ≤ asin(√(gH)/U)), and the dominant arm.
 *   S2  the same sphere in deep water at 1.5 m/s (Fr_L = 0.41) for 26 s on a 512² carpet
 *       following the body. Measured: the Kelvin arm angle in distance bands behind the body
 *       (the envelope maximum approaches the 19.47° caustic from inside, as the Airy scaling
 *       of the cusp predicts), and the transverse wavelength on the track (2πU²/g).
 * All runs use the engine's numerics: carpetDx for the sphere, carpetSubsteps, stableKappa,
 * CARPET_SMOOTH, the default damping and the limiter (breaking + ballistic release).
 *   Ledger: field volume = source − sponge − released − shifted, every run.
 *
 * Usage:
 *   npx esbuild scripts/carpet-validate.ts --bundle --platform=node --format=esm --outfile=/tmp/cv.mjs
 *   node /tmp/cv.mjs [outDir] [variant…]      variants: blocked (default), transparent
 * Writes <outDir>/carpet_<scene>_<variant>.png (blue down, white 0, red up; ±max|η|) and
 * <outDir>/carpet-validate.json.
 */
import {
  CarpetCpu, stableKappa, carpetSubsteps, carpetDx, CARPET_SMOOTH, CARPET_DAMPING, CARPET_VISCOSITY, CARPET_MAX_SLOPE, CARPET_RELAX, type CarpetSphere,
} from '../src/ocean/sim/carpetCpu';
import { armAngle, trackWavelength, sampleField, angularEnergy, type FieldView } from '../src/ocean/sim/wakeMetrics';
// (field maps: blue = down, white = 0, red = up; each map scaled to its own ±max|η|)
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

const G = 9.81;
const outDir = process.argv[2] ?? 'captures/carpet';
const variants = process.argv.slice(3).length ? process.argv.slice(3) : ['blocked', 'transparent'];
mkdirSync(outDir, { recursive: true });

/* ── PNG (the same map as scripts/reference-capture.mjs) ── */
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
/** A world window [x0, x0+L]² resampled at dx and written at `scale` px per cell. */
function fieldPng(file: string, v: FieldView, x0: number, z0: number, L: number, marks: [number, number, number][], scale = 4) {
  const m = Math.round(L / v.dx);
  const f = new Float64Array(m * m);
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) f[j * m + i] = sampleField(v, x0 + (i + 0.5) * v.dx, z0 + (j + 0.5) * v.dx);
  const range = f.reduce((m, x) => Math.max(m, Math.abs(x)), 1e-9);
  const W = m * scale, rgb = Buffer.alloc(W * W * 3);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const val = Math.max(-1, Math.min(1, f[Math.floor(y / scale) * m + Math.floor(x / scale)] / range));
    const a = Math.pow(Math.abs(val), 0.6), o = (y * W + x) * 3;
    if (val >= 0) { rgb[o] = 255; rgb[o + 1] = rgb[o + 2] = Math.round(255 * (1 - a)); }
    else { rgb[o] = rgb[o + 1] = Math.round(255 * (1 - a)); rgb[o + 2] = 255; }
  }
  for (const [mx, mz, mr] of marks)
    for (let k = 0; k < 720; k++) {
      const t = (k / 720) * 2 * Math.PI;
      const px = Math.round(((mx - x0) / v.dx + (mr / v.dx) * Math.cos(t)) * scale), py = Math.round(((mz - z0) / v.dx + (mr / v.dx) * Math.sin(t)) * scale);
      if (px >= 0 && py >= 0 && px < W && py < W) { const o = (py * W + px) * 3; rgb[o] = rgb[o + 1] = rgb[o + 2] = 0; }
    }
  png(file, W, W, rgb);
  return range;
}

interface Run {
  scene: string; variant: string; U: number; depth: number; dx: number; n: number; t: number; kappa: number; substeps: number;
  maxEta: number; minEta: number; ledgerResidual: number; ledger: Record<string, number>; volume: number;
  mach?: unknown; kelvin?: unknown; lambda?: unknown; png: string; range: number; wallMs: number;
}
const results: Run[] = [];

function tow(scene: 'S1' | 'S1m' | 'S2', U: number, variant: string) {
  const r = 0.68, yc = 0.12;
  const depth = scene === 'S2' ? 60 : 1;
  const n = scene === 'S2' ? 512 : 256, dx = carpetDx(2 * r), dt = 1 / 60;
  const blocked = variant !== 'transparent';
  // Production rule (InteractionTiles): substeps for the target stiffness and the body's speed.
  const sub = carpetSubsteps(dx, dt, U);
  const kappa = blocked ? stableKappa(dx, dt / sub) : 0;
  const c = new CarpetCpu({
    n, dx, depth, damping: CARPET_DAMPING, viscosity: CARPET_VISCOSITY, kappa, smooth: blocked ? CARPET_SMOOTH : 0,
    limiter: true, maxSlope: CARPET_MAX_SLOPE, relax: CARPET_RELAX,
  }, [-(n / 2) * dx, -(n / 2) * dx]);
  const start = scene === 'S2' ? -20 : -4.5;
  const body: CarpetSphere = { x: start, y: yc, z: 0, r };
  // A body resting in the water at t = 0 has already displaced its volume (η = 0, σ applied).
  c.occupancy([body], () => 0, c.occ, c.chi);
  const T = scene === 'S1' ? (1.2 - start) / U + 1e-6 : scene === 'S1m' ? 11 / (U - Math.sqrt(G * depth)) + 0.5 : 26;
  const t0 = Date.now();
  let t = 0;
  while (t < T) {
    for (let k = 0; k < sub; k++) {
      t += dt / sub;
      body.x = start + U * t;
      c.step([body], dt / sub);
    }
    if (scene !== 'S1') {
      // Carpet following: keep the body ahead of the tile centre (the wake is behind it).
      const size = n * dx, cx = c.origin[0] + size / 2;
      const want = body.x - size * 0.2;
      if (Math.abs(want - cx) > size * 0.16) c.shift(Math.round((want - cx) / dx / 16) * 16, 0);
    }
  }
  const v: FieldView = { field: c.eta, n, dx, origin: c.origin };
  let maxEta = -Infinity, minEta = Infinity;
  for (const e of c.eta) { if (e > maxEta) maxEta = e; if (e < minEta) minEta = e; }
  const L = c.ledger;
  const resid = c.volume() - (L.source - L.sponge - L.released - L.shifted);
  const run: Run = {
    scene, variant, U, depth, dx, n, t: +t.toFixed(3), kappa: +kappa.toFixed(2), substeps: sub,
    maxEta, minEta, ledgerResidual: resid, ledger: { ...L }, volume: c.volume(),
    png: '', range: 0, wallMs: Date.now() - t0,
  };
  const name = `carpet_${scene}_U${U.toFixed(1).replace('.', 'p')}_${variant}.png`;
  if (scene === 'S1') {
    run.range = fieldPng(path.join(outDir, name), v, -6, -6, 12, [[body.x, body.z, r]]);
  } else if (scene === 'S1m') {
    run.range = fieldPng(path.join(outDir, name), v, body.x - 10, -6, 12, [[body.x, body.z, r]]);
    // From the centre, and from the shoulders (waterline half-width), where a finite body's wedge begins.
    const a = angularEnergy(v, body, [1, 0], 5, 9);
    const sh = Math.sqrt(r * r - yc * yc);
    const b = angularEnergy(v, body, [1, 0], 5, 9, sh);
    run.mach = {
      th99: a.th99, th95: a.th95, peakDeg: a.peakDeg, shoulderTh99: b.th99, shoulderTh95: b.th95, shoulder: +sh.toFixed(3),
      machDeg: +((Math.asin(Math.sqrt(G * depth) / U) * 180) / Math.PI).toFixed(2),
    };
  } else {
    run.range = fieldPng(path.join(outDir, name), v, body.x - 22, -12, 24, [[body.x, body.z, r]], 2);
    const lam = (2 * Math.PI * U * U) / G;
    const bands: Record<string, { fitDeg: number; sides: number[] }> = {};
    for (const [s0, s1] of [[4, 8], [8, 14], [14, 20]]) {
      const k = armAngle(v, body, [1, 0], { s0, s1, mode: 'envelope', win: lam / 2, yMin: (s) => s * Math.tan((8 * Math.PI) / 180), yMax: (s) => s * Math.tan((35 * Math.PI) / 180) });
      bands[`${s0}-${s1} m`] = { fitDeg: +k.angleDeg.toFixed(2), sides: k.sides.map((x) => +x.toFixed(2)) };
    }
    run.kelvin = { bands, expectedDeg: 19.47 };
    const tw = trackWavelength(v, body, [1, 0], 2, 16);
    run.lambda = { measured: tw.lambda, expected: lam, crests: tw.crests.map((x) => +x.toFixed(2)) };
  }
  run.png = name;
  results.push(run);
  console.log(JSON.stringify(run));
}

// SCENES=S1,S1m,S2 (default all) runs a subset.
const scenes = (process.env.SCENES ?? 'S1,S1m,S2').split(',');
for (const variant of variants) {
  if (scenes.includes('S1')) for (const U of [1.0, 2.0, 4.5]) tow('S1', U, variant);
  if (scenes.includes('S1m')) for (const U of [3.5, 4.5, 6.0]) tow('S1m', U, variant);
  if (scenes.includes('S2')) tow('S2', 1.5, variant);
}
writeFileSync(path.join(outDir, 'carpet-validate.json'), JSON.stringify(results, null, 1));
