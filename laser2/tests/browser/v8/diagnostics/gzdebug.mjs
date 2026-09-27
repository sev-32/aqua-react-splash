import { buildHullMesh, halfWidth, uOfZ, keelY, sheerY } from '/home/user/aqua-react-splash/laser2/dist/src/sailing/HullGeometry.js';
import { HullHydrostatics, emptyHydroResult } from '/home/user/aqua-react-splash/laser2/dist/src/sailing/HullHydrostatics.js';
const mesh = buildHullMesh();
const hydro = new HullHydrostatics(mesh); const res = emptyHydroResult();
const flat = { height: () => 0, sample: (x, y, z, o) => { o.height = 0; o.vx = o.vy = o.vz = 0; return o; } };
function pose(phi, h) { const a = phi * Math.PI / 180; return { px: 0, py: h, pz: 0, qx: 0, qy: 0, qz: Math.sin(a / 2), qw: Math.cos(a / 2), vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 }; }
function eq(m, phi) { let lo = -2, hi = 2; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; hydro.compute(pose(phi, mid), flat, null, res, { dynamics: false }); if (res.buoyancyN > m * 9.81) lo = mid; else hi = mid; } hydro.compute(pose((phi), (lo + hi) / 2), flat, null, res, { dynamics: false }); return { h: (lo + hi) / 2, ...res }; }
for (const phi of [0, 5, 10, 20]) {
  const e = eq(85, phi);
  console.log(phi, 'heave', e.h.toFixed(4), 'B', e.buoyancyN.toFixed(1), 'V', e.submergedVolume.toFixed(4), 'cob', e.cobX.toFixed(4), e.cobY.toFixed(4), e.cobZ.toFixed(4), 'torque tz', e.tz.toFixed(2), 'tz/B', (e.tz / e.buoyancyN).toFixed(4), 'fx', e.fx.toFixed(2), 'fz', e.fz.toFixed(2));
}
// waterplane estimate at 85kg upright: sample halfwidth at waterline y=-0.066
let I = 0, A = 0; const N = 400;
for (let i = 0; i < N; i++) { const z = -2.2 + 4.4 * (i + 0.5) / N; const u = uOfZ(z); const hw = halfWidth(u), keel = keelY(u), sheer = sheerY(u);
  // find t where y = WL
  const WL = -0.0657; if (keel >= WL) continue; const p = u < 0.45 ? 3.4 + (2.5 - 3.4) * u / 0.45 : 2.5; // approx power
  const s = Math.pow((WL - keel) / (sheer - keel), 1 / p); const b = s * hw; A += 2 * b * 4.4 / N; I += (2 * b ** 3 / 3) * 4.4 / N; }
console.log('waterplane area', A.toFixed(3), 'I', I.toFixed(4), 'BM (V=0.0829)', (I / 0.0829).toFixed(3));
