import { buildHullMesh, sheerY, keelY, halfWidth, uOfZ, hullSignedDistance, HULL_POINTS } from '../../dist/src/sailing/HullGeometry.js';
import { HullHydrostatics, emptyHydroResult } from '../../dist/src/sailing/HullHydrostatics.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${JSON.stringify(detail)}`); return ok; };
const mesh = buildHullMesh();
// 1. closed + consistently oriented: every directed edge appears once and its reverse once
const edges = new Map();
for (let i = 0; i < mesh.triangles.length; i += 3) {
  const t = [mesh.triangles[i], mesh.triangles[i + 1], mesh.triangles[i + 2]];
  for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3]; const k = `${a}>${b}`; edges.set(k, (edges.get(k) ?? 0) + 1); }
}
let bad = 0;
for (const [k, count] of edges) { const [a, b] = k.split('>'); if (count !== 1 || edges.get(`${b}>${a}`) !== 1) bad++; }
check('mesh closed & oriented', bad === 0, { bad });
const flat = { height: () => 0, sample: (x, y, z, out) => { out.height = 0; out.vx = out.vy = out.vz = 0; return out; } };
const hydro = new HullHydrostatics(mesh);
const res = emptyHydroResult();
// pose helper: design-frame mesh, rotate about design origin (0,0,0) with heel phi about z then place at height h
function pose(phiDeg, heave, trimDeg = 0) {
  const phi = phiDeg * Math.PI / 180, th = trimDeg * Math.PI / 180;
  // q = qz(phi) * qx(-trim)
  const qz = { x: 0, y: 0, z: Math.sin(phi / 2), w: Math.cos(phi / 2) };
  const qx = { x: Math.sin(-th / 2), y: 0, z: 0, w: Math.cos(-th / 2) };
  const q = { w: qz.w * qx.w - qz.x * qx.x - qz.y * qx.y - qz.z * qx.z, x: qz.w * qx.x + qz.x * qx.w + qz.y * qx.z - qz.z * qx.y, y: qz.w * qx.y - qz.x * qx.z + qz.y * qx.w + qz.z * qx.x, z: qz.w * qx.z + qz.x * qx.y - qz.y * qx.x + qz.z * qx.w };
  return { px: 0, py: heave, pz: 0, qx: q.x, qy: q.y, qz: q.z, qw: q.w, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 };
}
function rot(p, v) { // rotate vector v (design) by pose quaternion
  const { qx: x, qy: y, qz: z, qw: w } = p; const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
function equilibrium(massKg, phiDeg, trimDeg = 0) {
  let lo = -2.0, hi = 2.0;
  for (let it = 0; it < 60; it++) {
    const mid = 0.5 * (lo + hi);
    hydro.compute(pose(phiDeg, mid, trimDeg), flat, null, res, { dynamics: false });
    if (res.buoyancyN > massKg * 9.81) lo = mid; else hi = mid;
  }
  const h = 0.5 * (lo + hi);
  hydro.compute(pose(phiDeg, h, trimDeg), flat, null, res, { dynamics: false });
  return { heave: h, ...res };
}
const report = { mesh: { vertices: mesh.positions.length / 3, triangles: mesh.triangles.length / 3, volumeM3: mesh.volume, centroid: mesh.centroid, areaM2: mesh.area } };
check('sealed volume plausible (0.6..1.6 m3)', mesh.volume > 0.6 && mesh.volume < 1.6, mesh.volume);
// upright drafts
const cases = { hullFoils_85kg: 85, withCrew_235kg: 235, overloaded_320kg: 320 };
report.upright = {};
for (const [name, m] of Object.entries(cases)) {
  const e = equilibrium(m, 0);
  // design waterline height = -heave (design point at world y = design y + heave)
  report.upright[name] = { designWaterlineY: -e.heave, keelDraftM: -e.heave - (-0.165), volumeM3: e.submergedVolume, cob: [e.cobX, e.cobY + 0, e.cobZ], buoyancyN: e.buoyancyN, pitchMomentNm: e.tx };
}
check('upright 235 kg waterline between keel and sole', report.upright.withCrew_235kg.designWaterlineY > -0.16 && report.upright.withCrew_235kg.designWaterlineY < 0.155, report.upright.withCrew_235kg);
// GZ curve for 235 kg with CoG at design (0, cogY, cogZ)
function gzCurve(massKg, cog) {
  const rows = [];
  for (let phi = 0; phi <= 180; phi += 10) {
    const e = equilibrium(massKg, phi);
    const p = pose(phi, e.heave);
    const g = rot(p, cog); g[1] += e.heave;
    // righting moment about the longitudinal axis (z): buoyancy torque about CoG
    const mz = (e.cobX - g[0]) * e.buoyancyN; // Fy * dx -> torque about z is -dx*Fy? sign: r x F, F=(0,B,0): tz = rx*B
    const gz = (e.cobX - g[0]); // lever of buoyancy relative to CoG (positive = restores toward upright for phi>0?)
    rows.push({ heelDeg: phi, waterlineDesignY: -e.heave, gzM: +gz.toFixed(4), torqueZNm: +(mz).toFixed(1), submergedM3: +e.submergedVolume.toFixed(4), cobX: +e.cobX.toFixed(3), cogX: +g[0].toFixed(3) });
  }
  return rows;
}
report.gzHullOnly85kg = gzCurve(85, [0, 0.12, -0.25]);
report.gzCrewAboard235kg = gzCurve(235, [0, 0.42, -0.45]);
// signs: heel +phi about +z rotates +y toward -x. A restoring moment is negative tz for positive phi.
const g30 = report.gzHullOnly85kg.find(r => r.heelDeg === 30);
check('hull-only is stable at 30 deg (restoring torque opposes heel)', g30.torqueZNm < 0, g30);
// SDF sanity
const sdfInside = hullSignedDistance(0, 0.0, 0);
const sdfOutside = hullSignedDistance(0, -0.6, 0);
report.sdf = { inside: sdfInside, below: sdfOutside, boardTip: HULL_POINTS.boardTipY };
check('sdf inside negative', sdfInside < 0, sdfInside);
check('sdf below positive', sdfOutside > 0.3, sdfOutside);
// timing: dynamic evaluation cost
const wave = { height: (x, z) => 0.1 * Math.sin(0.9 * x + 0.3 * z), sample: (x, y, z, out) => { out.height = 0.1 * Math.sin(0.9 * x + 0.3 * z); out.vx = 0.1; out.vy = 0; out.vz = 0; return out; } };
const air = { velocity: (x, y, z, out) => { out.x = 6; out.y = 0; out.z = 0; return out; } };
let t = performance.now();
for (let i = 0; i < 600; i++) hydro.compute({ ...pose(12, -0.05), vx: 2, vz: 0.3, wx: 0.1 }, wave, air, res);
report.computeMsPerCall = (performance.now() - t) / 600;
console.log(JSON.stringify(report, null, 1));
mkdirSync(new URL('../../evidence/cpu/', import.meta.url), { recursive: true });
writeFileSync(new URL('../../evidence/cpu/hull-hydrostatics-v8.json', import.meta.url), JSON.stringify({ report, failures }, null, 1));
if (failures.length) { console.error('FAIL', failures); process.exit(1); }
console.log('hull-hydrostatics: PASS');
