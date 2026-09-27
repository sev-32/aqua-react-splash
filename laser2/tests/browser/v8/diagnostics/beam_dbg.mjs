import { RigStructureSolver, RigRowType } from '/home/user/aqua-react-splash/laser2/dist/src/sailing/RigStructureSolver.js';
class V { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } }
const body = { pos: new V(), quat: { x: 0, y: 0, z: 0, w: 1 }, kinematic: true, localToWorld(l, out) { out.x = l.x; out.y = l.y; out.z = l.z; return out; }, genInvMass() { return 0; }, applyCorrection() {} };
for (const N of [10, 20, 40]) {
  const L = 4, EI = 5000, F = 10, l = L / N;
  const solver = new RigStructureSolver(body, V);
  const parts = [];
  for (let i = 0; i <= N + 1; i++) { const p = { x: new V(0, (i - 1) * l, 0), v: new V(), f: new V(), w: 1 / 0.3 }; parts.push(p); solver.addNode(p); }
  solver.mastCount = parts.length;
  const S = RigStructureSolver;
  for (const k of [0, 1]) for (let a = 0; a < 3; a++) solver.addRow({ label: `pin${k}${a}`, group: 'pin', type: RigRowType.AXIS, axis: a, a: S.bodyPoint(new V(0, (k - 1) * l, 0)), b: S.node(k), alpha: 0 });
  for (let i = 0; i <= N; i++) solver.addRow({ label: `s${i}`, group: 'stretch', type: RigRowType.DIST, a: S.node(i), b: S.node(i + 1), rest: l, alpha: 1e-10 });
  const bends = [];
  for (let i = 1; i <= N; i++) bends.push(solver.addRow({ label: `b${i}`, group: 'bend', type: RigRowType.BEND, n: [i - 1, i, i + 1], l1: l, l2: l, plane: 0, ref: 0, alpha: l / EI }));
  solver.finalize();
  const dt = 1 / 240;
  for (let step = 0; step < 3000; step++) {
    for (const p of parts) { p.p = new V(p.x.x, p.x.y, p.x.z); if (p === parts[N + 1]) p.v.x += F * p.w * dt; p.v.x *= 0.97; p.v.y *= 0.97; p.v.z *= 0.97; p.x.x += p.v.x * dt; p.x.y += p.v.y * dt; p.x.z += p.v.z * dt; }
    solver.lambda = 0;
    for (let it = 0; it < 4; it++) solver.solve(dt);
    for (const p of parts) { p.v.x = (p.x.x - p.p.x) / dt; p.v.y = (p.x.y - p.p.y) / dt; p.v.z = (p.x.z - p.p.z) / dt; }
  }
  const analytic = F * L ** 3 / (3 * EI);
  const lumped = F * l ** 3 / EI * (N * (N + 1) * (2 * N + 1) / 6);
  const M = bends.map((b, k) => (-b.lambda / dt / dt).toFixed(2));
  const Mexp = bends.map((b, k) => (F * (N - k) * l).toFixed(2));
  console.log(N, 'tip', parts[N + 1].x.x.toFixed(5), 'analytic', analytic.toFixed(5), 'lumped', lumped.toFixed(5));
  console.log(' M', M.slice(0, 5).join(' '), '... expected', Mexp.slice(0, 5).join(' '));
}
