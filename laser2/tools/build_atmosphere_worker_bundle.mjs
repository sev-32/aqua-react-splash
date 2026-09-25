import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = [
  'dist/src/reference/lightingMath.js',
  'dist/src/lighting/atmosphere/AtmosphereMath.js',
  'dist/src/lighting/atmosphere/AtmosphereLutJob.js',
  'dist/src/lighting/atmosphere/AtmosphereLutWorker.js',
];
let output = `'use strict';\n`;
for (const relative of files) {
  let source = await readFile(`${root}/${relative}`, 'utf8');
  source = source
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    .replace(/^export\s+\{[^}]+\};?\s*$/gm, '')
    .replace(/\bexport\s+(?=(?:const|let|var|function|class)\b)/g, '')
    .replace(/^\/\/# sourceMappingURL=.*$/gm, '');
  output += `\n// ${relative}\n${source}\n`;
}
await mkdir(`${root}/dist/workers`, { recursive: true });
await writeFile(`${root}/dist/workers/atmosphere-lut-worker-v7.bundle.js`, output);
console.log(JSON.stringify({ output: 'dist/workers/atmosphere-lut-worker-v7.bundle.js', bytes: output.length }, null, 2));
