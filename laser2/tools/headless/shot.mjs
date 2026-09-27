// Generic headless harness: serve a directory, open a page, run an optional script, screenshot.
// usage: node shot.mjs <distDir> <out.png> [evalScriptFile] [waitMs] [width] [height]
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

// Chromium: CHROMIUM_PATH, else the sandbox's preinstalled build, else
// playwright's own download (npx playwright install chromium).
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env.CHROMIUM_PATH || (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

const [distDir, outPng, evalFile, waitMsArg, wArg, hArg] = process.argv.slice(2);
const waitMs = Number(waitMsArg ?? 1500);
const width = Number(wArg ?? 1200), height = Number(hArg ?? 800);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.map': 'application/json', '.vrm': 'application/octet-stream', '.glb': 'model/gltf-binary' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let p = path.join(distDir, decodeURIComponent(url.pathname));
    const s = await stat(p).catch(() => null);
    if (s?.isDirectory()) p = path.join(p, 'index.html');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  headless: true,
  args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 600)}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/index.html${process.env.QS ?? ''}`, { waitUntil: 'domcontentloaded' });
try {
  await page.waitForFunction(() => document.documentElement.dataset.foundryReady === 'true' || document.documentElement.dataset.foundryError, null, { timeout: 180000, polling: 200 });
} catch (e) { logs.push('[harness] ready timeout ' + e.message); }
const ready = await page.evaluate(() => ({ ready: document.documentElement.dataset.foundryReady ?? null, error: document.documentElement.dataset.foundryError ?? null }));
logs.push(`[harness] ready after ${Date.now() - t0} ms: ${JSON.stringify(ready)}`);
let result = null;
if (evalFile) {
  const src = await readFile(evalFile, 'utf8');
  try {
    result = await page.evaluate(src);
  } catch (e) { logs.push('[harness] eval error ' + e.message); }
}
await page.waitForTimeout(waitMs);
await page.screenshot({ path: outPng });
console.log(logs.join('\n'));
if (result !== null) console.log('RESULT ' + JSON.stringify(result, null, 1).slice(0, 20000));
await browser.close();
server.close();
