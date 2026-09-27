import { readFileSync } from 'node:fs';
const body = readFileSync(new URL('./polar_test.js', import.meta.url), 'utf8');
const twas = (process.env.TWAS ?? '45,60,90').split(',').map(Number);
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__POLAR_TWS = ${process.env.TWS ?? 12}; window.__POLAR_TWAS = ${JSON.stringify(twas)}; return 'ok'; })()` },
  { name: 'polar', shot: false, code: body },
];
