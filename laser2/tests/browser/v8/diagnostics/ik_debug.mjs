import { readFileSync } from 'node:fs';
const root = '/home/user/aqua-react-splash/laser2/';
const { LucidRetarget } = await import(root + 'dist/src/crew/lucid/LucidRetarget.js');
const header = JSON.parse(readFileSync(root + 'public/assets/lucid/lucid_female_v4_2.json', 'utf8'));
const bin = readFileSync(root + 'public/assets/lucid/lucid_female_v4_2.bin');
const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const sec = (n) => header.sections.find((s) => s.name === n);
const asset = { header, position: new Float32Array(buffer, sec('position').offset, sec('position').bytes / 4), jointIndex: new Map(header.joints.map((n, i) => [n, i])) };
const poses = JSON.parse(readFileSync('cur_pose.json', 'utf8'));
for (const id of ['helm', 'crew']) {
  const L = Object.fromEntries(Object.entries(poses[id]).map(([k, v]) => [k, { x: v[0], y: v[1], z: v[2] }]));
  const rt = new LucidRetarget(asset);
  const grip = { curl: 0.7, spread: 0, thumb: 0.6 };
  const t0 = performance.now();
  rt.solve(L, null, [grip, grip]);
  const ms = performance.now() - t0;
  const P = (n) => { const j = asset.jointIndex.get(n); return [rt.P[j * 3], rt.P[j * 3 + 1], rt.P[j * 3 + 2]]; };
  const d = (a, b) => Math.hypot(a[0] - b.x, a[1] - b.y, a[2] - b.z).toFixed(3);
  const sem = Object.fromEntries(header.semantic51.map((x, i) => [x.id, +rt.sem[i].toFixed(1)]).filter(([k]) => /spine|Shoulder|Elbow|Clavicle/.test(k)));
  console.log(id, ms.toFixed(1), 'ms', 'wristL err', d(P('L_Hand'), L.wristL), 'wristR err', d(P('R_Hand'), L.wristR), 'elbowL', d(P('L_Forearm'), L.elbowL), 'elbowR', d(P('R_Forearm'), L.elbowR));
  console.log(JSON.stringify(sem));
}
{
  const L = Object.fromEntries(Object.entries(poses.crew).map(([k, v]) => [k, { x: v[0], y: v[1], z: v[2] }]));
  const rt = new LucidRetarget(asset);
  const grip = { curl: 0.7, spread: 0, thumb: 0.6 };
  for (let i = 0; i < 5; i++) rt.solve(L, null, [grip, grip]);
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) { L.wristL.x += 0.002; rt.solve(L, null, [grip, grip]); }
  console.log('warm solve ms', ((performance.now() - t0) / 20).toFixed(2));
}
