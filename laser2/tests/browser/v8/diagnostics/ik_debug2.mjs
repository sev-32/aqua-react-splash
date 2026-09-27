import { readFileSync } from 'node:fs';
const root = '/home/user/aqua-react-splash/laser2/';
const { LucidRetarget } = await import(root + 'dist/src/crew/lucid/LucidRetarget.js');
const header = JSON.parse(readFileSync(root + 'public/assets/lucid/lucid_female_v4_2.json', 'utf8'));
const asset = { header, jointIndex: new Map(header.joints.map((n, i) => [n, i])) };
const rt = new LucidRetarget(asset);
const R = rt.legacyRest();
const d = rt.legacyDims();
// build a full legacy rest pose incl. limbs hanging (arms in her A-pose so the arm solution is exact)
const L = {};
for (const [k, v] of Object.entries(R)) L[k] = { x: v[0], y: v[1], z: v[2] };
const rest = (n) => rt.rest(n);
for (const s of ['L', 'R']) {
  const sh = L[`shoulder${s}`];
  const dirA = (a, b) => { const p = rest(a), q = rest(b); return [q[0] - p[0], q[1] - p[1], q[2] - p[2]]; };
  const ua = dirA(`${s}_Upperarm`, `${s}_Forearm`), fa = dirA(`${s}_Forearm`, `${s}_Hand`), hd = dirA(`${s}_Hand`, `${s}_Mid1`);
  L[`elbow${s}`] = { x: sh.x + ua[0], y: sh.y + ua[1], z: sh.z + ua[2] };
  L[`wrist${s}`] = { x: L[`elbow${s}`].x + fa[0], y: L[`elbow${s}`].y + fa[1], z: L[`elbow${s}`].z + fa[2] };
  L[`hand${s}`] = { x: L[`wrist${s}`].x + hd[0], y: L[`wrist${s}`].y + hd[1], z: L[`wrist${s}`].z + hd[2] };
  const hip = L[`hip${s}`];
  const th = dirA(`${s}_Thigh`, `${s}_Calf`), sn = dirA(`${s}_Calf`, `${s}_Foot`), ft = dirA(`${s}_Foot`, `${s}_ToeBase`);
  L[`knee${s}`] = { x: hip.x + th[0], y: hip.y + th[1], z: hip.z + th[2] };
  L[`ankle${s}`] = { x: L[`knee${s}`].x + sn[0], y: L[`knee${s}`].y + sn[1], z: L[`knee${s}`].z + sn[2] };
  L[`toe${s}`] = { x: L[`ankle${s}`].x + ft[0], y: L[`ankle${s}`].y + ft[1], z: L[`ankle${s}`].z + ft[2] };
}
const grip = { curl: 0, spread: 0, thumb: 0 };
rt.solve(L, [0, 0, 1], [grip, grip]);
const P = (n) => { const j = asset.jointIndex.get(n); return [rt.P[j * 3], rt.P[j * 3 + 1], rt.P[j * 3 + 2]].map((v) => +v.toFixed(3)); };
console.log('her shoulder L', P('L_Upperarm'), 'legacy shL', [L.shoulderL.x, L.shoulderL.y, L.shoulderL.z].map((v) => +v.toFixed(3)), 'rest(L_Upperarm)', Array.from(rest('L_Upperarm')).map((v) => +v.toFixed(3)));
console.log('her wrist L', P('L_Hand'), 'target', [L.wristL.x, L.wristL.y, L.wristL.z].map((v) => +v.toFixed(3)));
console.log('her hip', P('Hip'), 'pelvis', [L.pelvis.x, L.pelvis.y, L.pelvis.z].map((v) => +v.toFixed(3)), 'neck', P('NeckTwist01'), 'legacy neck', R.neck);
const nz = header.semantic51.map((x, i) => [x.id, +rt.sem[i].toFixed(2)]).filter(([, v]) => Math.abs(v) > 0.05);
console.log('nonzero DOFs', JSON.stringify(nz));
