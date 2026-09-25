#!/usr/bin/env node
/**
 * THALASSA proof capture: renders named shots headlessly through the
 * deterministic window.__THALASSA__ API and writes PNGs + a JSON receipt.
 *
 *   node scripts/ocean-capture.mjs --url http://localhost:8080/ocean --out captures \
 *     --quality capture --shots shots.json
 *
 * A shot: { name, pose|preset, settings: {path: value}, steps, dt, actions: [...] }
 */
import fs from 'node:fs';
import path from 'node:path';

// Resolve playwright from the project, or fall back to a global install.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const { execSync } = await import('node:child_process');
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(path.join(globalRoot, 'playwright', 'index.mjs')));
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const url = args.url ?? 'http://localhost:8080/ocean';
const out = args.out ?? 'captures';
const quality = args.quality ?? 'capture';
const width = Number(args.width ?? 1280), height = Number(args.height ?? 720);
const defaultShots = [
  { name: 'wide_moderate', preset: 'wide', settings: { 'sea.morph': 3 }, steps: 90 },
  { name: 'deck_fresh', preset: 'deck', settings: { 'sea.morph': 4 }, steps: 90 },
  { name: 'glitter_moderate', preset: 'glitter', settings: { 'sea.morph': 3 }, steps: 30 },
  { name: 'aerial_storm', preset: 'aerial', settings: { 'sea.morph': 6.5 }, steps: 90 },
];
const shots = args.shots ? JSON.parse(fs.readFileSync(args.shots, 'utf8')) : defaultShots;
fs.mkdirSync(out, { recursive: true });

const launchArgs = ['--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ args: launchArgs });
const page = await browser.newPage({ viewport: { width, height } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

const target = `${url}${url.includes('?') ? '&' : '?'}capture=1&quality=${quality}`;
await page.goto(target, { waitUntil: 'load' });
await page.waitForFunction(() => window.__THALASSA__?.ready === true, null, { timeout: 120000 });
const bootError = await page.evaluate(() => window.__THALASSA__.error);
if (bootError) {
  console.error('BOOT ERROR', bootError);
  await page.screenshot({ path: path.join(out, 'boot_error.png') });
  await browser.close();
  process.exit(1);
}

const receipt = { url: target, quality, viewport: [width, height], shots: [], consoleErrors };
for (const shot of shots) {
  const t0 = Date.now();
  const result = await page.evaluate(async (shot) => {
    const api = window.__THALASSA__;
    if (shot.preset) api.setPose(shot.preset);
    if (shot.pose) api.setPose(shot.pose);
    for (const [k, v] of Object.entries(shot.settings ?? {})) api.set(k, v);
    api.applySea();
    for (const a of shot.actions ?? []) api.action?.(a.name, a.arg);
    api.step(shot.steps ?? 20, shot.dt ?? 1 / 30);
    for (const a of shot.after ?? []) { api.action?.(a.name, a.arg); api.step(a.steps ?? 10, shot.dt ?? 1 / 30); }
    api.step(2, shot.dt ?? 1 / 30); // telemetry flush
    return { gl: api.glError(), telemetry: api.telemetry() };
  }, shot);
  const file = path.join(out, `${shot.name}.png`);
  await page.screenshot({ path: file });
  receipt.shots.push({ name: shot.name, file, ms: Date.now() - t0, ...result });
  console.log(`${shot.name}: gl=${result.gl} ${Date.now() - t0}ms Hs=${result.telemetry?.hs?.toFixed?.(2)} tris=${result.telemetry?.triangles}`);
}
fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
if (consoleErrors.length) console.log('console errors:', consoleErrors.slice(0, 10));
await browser.close();
