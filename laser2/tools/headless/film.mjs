// Multi-stage headless harness: serve dist, run stages from a JS module, screenshot after each.
// usage: node film.mjs <distDir> <stagesModule.mjs> <outPrefix> [width] [height]
// stagesModule default-exports an array of { name, code (string evaluated in page), shot (bool) }.
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

// Chromium: CHROMIUM_PATH, else the sandbox's preinstalled build, else
// playwright's own download (npx playwright install chromium).
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env.CHROMIUM_PATH || (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

const [distDir, stagesFile, outPrefix, wArg, hArg] = process.argv.slice(2);
const width = Number(wArg ?? 1200), height = Number(hArg ?? 800);
const stages = (await import(pathToFileURL(path.resolve(stagesFile)).href)).default;
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
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 400)}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/index.html${process.env.QS ?? ''}`, { waitUntil: 'domcontentloaded' });
try {
  await page.waitForFunction(() => document.documentElement.dataset.foundryReady === 'true' || document.documentElement.dataset.foundryError, null, { timeout: 180000, polling: 200 });
} catch (e) { logs.push('[harness] ready timeout ' + e.message); }
console.log(`[harness] ready after ${Date.now() - t0} ms`);
for (const [i, stage] of stages.entries()) {
  const ts = Date.now();
  let result = null;
  try { result = await page.evaluate(stage.code); } catch (e) { result = 'EVAL ERROR ' + e.message; }
  if (stage.wait) await page.waitForTimeout(stage.wait);
  if (stage.shot !== false) await page.screenshot({ path: `${outPrefix}_${String(i).padStart(2, "0")}_${stage.name}.png`, timeout: 180000 });
  console.log(`[stage ${i} ${stage.name}] ${Date.now() - ts} ms ${result === null || result === undefined ? '' : JSON.stringify(result).slice(0, Number(process.env.RESULT_MAX ?? 6000))}`);
}
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
server.close();
