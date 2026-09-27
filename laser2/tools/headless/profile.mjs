// Profile legacy sim steps with CDP CPU profiler.
// usage: node profile.mjs <distDir> <setupScript> <stepScript> <outJson>
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

// Chromium: CHROMIUM_PATH, else the sandbox's preinstalled build, else
// playwright's own download (npx playwright install chromium).
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env.CHROMIUM_PATH || (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

const [distDir, setupFile, stepFile, outJson] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.bin': 'application/octet-stream' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let p = path.join(distDir, decodeURIComponent(url.pathname));
    const s = await stat(p).catch(() => null);
    if (s?.isDirectory()) p = path.join(p, 'index.html');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.waitForFunction(() => document.documentElement.dataset.foundryReady === 'true' || document.documentElement.dataset.foundryError, null, { timeout: 180000, polling: 200 });
await page.evaluate(await readFile(setupFile, 'utf8'));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const r = await page.evaluate(await readFile(stepFile, 'utf8'));
const { profile } = await cdp.send('Profiler.stop');
console.log('step result', JSON.stringify(r));
// aggregate self time by function+url+line
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas; const samples = profile.samples;
for (let i = 0; i < samples.length; i++) {
  const n = byId.get(samples[i]);
  const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`;
  self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0));
}
const total = [...self.values()].reduce((a, b) => a + b, 0);
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 45);
for (const [k, v] of top) console.log((v / 1000).toFixed(1).padStart(8), 'ms', ((100 * v) / total).toFixed(1).padStart(5), '%', k);
if (outJson) await writeFile(outJson, JSON.stringify(profile));
await browser.close();
server.close();
