import { FoilModel } from '/home/user/aqua-react-splash/laser2/dist/src/sailing/FoilModel.js';
const board = new FoilModel({ name: 'board', rootY: -0.15, tipY: -1.08, z: 0.25, chord: 0.55, stallDeg: 14, cd0: 0.008, oswald: 0.82, cpAftM: 0, strips: 8 });
const water = { height: () => 0, sample: (x, y, z, o) => { o.height = 0; o.vx = o.vy = o.vz = 0; return o; } };
const r = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
let F = [0, 0, 0], M = [0, 0, 0];
const sink = { addForceAt(fx, fy, fz, px, py, pz) { F[0] += fx; F[1] += fy; F[2] += fz; M[0] += py * fz - pz * fy; M[2] += px * fy - py * fx; } };
for (const [vx, vz] of [[0.3, 3], [-0.3, 3], [0, 3], [0.3, 0]]) {
  F = [0, 0, 0]; M = [0, 0, 0];
  const st = board.apply({ px: 0, py: 0.3, pz: -0.15, r, vx, vy: 0, vz, wx: 0, wy: 0, wz: 0, refY: 0.3, refZ: -0.15 }, 0, water, null, sink);
  console.log('vel', vx, vz, 'force', F.map(v => v.toFixed(1)), 'lift', st.liftN.toFixed(1), 'alpha', st.maxAlphaDeg.toFixed(1), 'Mz(roll about z at origin)', M[2].toFixed(1));
}
