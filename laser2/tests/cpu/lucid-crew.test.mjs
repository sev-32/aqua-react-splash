// LUCID crew parity: the TypeScript Semantic51 kinematics + canonical cluster
// drivers + LBS against poses compiled by the LUCID package itself
// (tools/lucid_parity_reference.py). The body asset is built locally from the
// owner's package and is not in the repository; the test skips without it.
import { readFileSync, existsSync } from 'node:fs';
import { Semantic51Body, CanonicalClusterDrivers, m3 } from '../../dist/src/crew/lucid/LucidKinematics.js';

const root = new URL('../../public/assets/lucid/', import.meta.url).pathname;
if (!existsSync(`${root}lucid_female_v4_2.bin`) || !existsSync(`${root}parity_reference.json`)) {
  console.log('lucid-crew: SKIPPED (LUCID asset not built locally; see tools/build_lucid_crew_asset.py)');
  process.exit(0);
}
const header = JSON.parse(readFileSync(`${root}lucid_female_v4_2.json`, 'utf8'));
const bin = readFileSync(`${root}lucid_female_v4_2.bin`);
const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const sec = (n) => header.sections.find((s) => s.name === n);
const asset = {
  header,
  position: new Float32Array(buffer, sec('position').offset, sec('position').bytes / 4),
  skinIndex: new Uint8Array(buffer, sec('skinIndex').offset, sec('skinIndex').bytes),
  skinWeight: new Float32Array(buffer, sec('skinWeight').offset, sec('skinWeight').bytes / 4),
  jointIndex: new Map(header.joints.map((n, i) => [n, i])),
};
const ref = JSON.parse(readFileSync(`${root}parity_reference.json`, 'utf8'));
const body = new Semantic51Body(asset);
const drivers = new CanonicalClusterDrivers(body);
const failures = [];
let worstJoint = 0, worstVertex = 0;
for (const pose of ref.poses) {
  const sem = new Float64Array(header.semantic51.length);
  header.semantic51.forEach((d, i) => { sem[i] = pose.semantic[d.id] ?? 0; });
  const hand = new Float64Array(header.handDofs.length);
  header.handDofs.forEach((d, i) => { hand[i] = pose.hand[d.id] ?? 0; });
  const Rl = new Float64Array(body.n * 9);
  for (let j = 0; j < body.n; j++) body.composeLocal(j, sem, hand, Rl.subarray(j * 9, j * 9 + 9));
  const P = new Float64Array(body.n * 3), G = new Float64Array(body.n * 9);
  const Rw = m3();
  body.forward(Rl, Rw, header.restJoints[0], P, G);
  for (let j = 0; j < body.n; j++) {
    const e = Math.hypot(P[j * 3] - pose.P[j][0], P[j * 3 + 1] - pose.P[j][1], P[j * 3 + 2] - pose.P[j][2]);
    worstJoint = Math.max(worstJoint, e);
  }
  const twist = [pose.twist.L ?? 0, pose.twist.R ?? 0];
  drivers.evaluate(P, G, twist);
  const D = drivers.D, T = drivers.T;
  pose.sample.forEach((v, k) => {
    const x = asset.position[v * 3], y = asset.position[v * 3 + 1], z = asset.position[v * 3 + 2];
    let ox = 0, oy = 0, oz = 0;
    for (let s = 0; s < 8; s++) {
      const w = asset.skinWeight[v * 8 + s];
      if (!w) continue;
      const c = asset.skinIndex[v * 8 + s];
      ox += w * (D[c * 9] * x + D[c * 9 + 1] * y + D[c * 9 + 2] * z + T[c * 3]);
      oy += w * (D[c * 9 + 3] * x + D[c * 9 + 4] * y + D[c * 9 + 5] * z + T[c * 3 + 1]);
      oz += w * (D[c * 9 + 6] * x + D[c * 9 + 7] * y + D[c * 9 + 8] * z + T[c * 3 + 2]);
    }
    const r = pose.V[k];
    worstVertex = Math.max(worstVertex, Math.hypot(ox - r[0], oy - r[1], oz - r[2]));
  });
}
if (worstJoint > 1e-6) failures.push(`joint positions differ from the LUCID compiler by ${worstJoint} m`);
// float32 rest positions/weights on the GPU path: parity to 10 µm
if (worstVertex > 1e-5) failures.push(`skinned vertices differ from canonical LBS by ${worstVertex} m`);
if (failures.length) { console.error('lucid-crew FAILED\n' + failures.join('\n')); process.exit(1); }
console.log(`lucid-crew: Semantic51 FK within ${worstJoint.toExponential(1)} m, canonical drivers + LBS within ${worstVertex.toExponential(1)} m of the LUCID reference (${ref.poses.length} poses)`);
