// Rig structure solver: sparse LDLᵀ exactness and beam statics.
import { SparseLDL } from '../../dist/src/sailing/SparseLDL.js';
import { RigStructureSolver, RigRowType } from '../../dist/src/sailing/RigStructureSolver.js';

const failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${JSON.stringify(detail)}`); return ok; };

// ---------------------------------------------------------------- SparseLDL
{
  // Chain of 60 with two long-range loops (like shroud/halyard members).
  const n = 60;
  const edges = [];
  for (let i = 1; i < n; i++) edges.push([i, i - 1]);
  for (let i = 2; i < n; i++) edges.push([i, i - 2]);
  edges.push([45, 12], [50, 3], [59, 30]);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const dense = Array.from({ length: n }, () => new Float64Array(n));
  const entries = [];
  const values = [];
  for (const [i, j] of edges) {
    const v = rnd() - 0.5;
    dense[i][j] = dense[j][i] = v;
    entries.push(i, j); values.push(v);
  }
  for (let i = 0; i < n; i++) {
    let s = 0.5 + rnd();
    for (let j = 0; j < n; j++) if (j !== i) s += Math.abs(dense[i][j]);
    dense[i][i] = s;
    entries.push(i, i); values.push(s);
  }
  const ldl = new SparseLDL(n, entries);
  ldl.factor(values);
  const b = Float64Array.from({ length: n }, () => rnd() - 0.5);
  const x = new Float64Array(n);
  ldl.solve(b, x);
  let maxRes = 0;
  for (let i = 0; i < n; i++) {
    let s = -b[i];
    for (let j = 0; j < n; j++) s += dense[i][j] * x[j];
    maxRes = Math.max(maxRes, Math.abs(s));
  }
  check('sparse LDL residual', maxRes < 1e-10, { maxRes, nnz: ldl.nonZeros });
  check('sparse LDL fill bounded', ldl.nonZeros < 6 * n, { nnz: ldl.nonZeros });
}

// ---------------------------------------------------------------- beam statics
class V { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } }
const body = {
  pos: new V(), quat: { x: 0, y: 0, z: 0, w: 1 }, kinematic: true,
  localToWorld(l, out) { out.x = l.x; out.y = l.y; out.z = l.z; return out; },
  genInvMass() { return 0; }, applyCorrection() {},
};

function cantilever(N, L, EI, F, plane) {
  const solver = new RigStructureSolver(body, V);
  const l = L / N;
  const mass = 0.3;
  const parts = [];
  // node 0 is a ghost below the root: nodes 0 and 1 pinned → clamped root at y = 0
  for (let i = 0; i <= N + 1; i++) {
    const p = { x: new V(0, (i - 1) * l, 0), v: new V(), f: new V(), w: 1 / mass };
    parts.push(p);
    solver.addNode(p);
  }
  solver.mastCount = parts.length;
  const S = RigStructureSolver;
  for (const k of [0, 1]) for (let a = 0; a < 3; a++) {
    solver.addRow({ label: `pin${k}${a}`, group: 'pin', type: RigRowType.AXIS, axis: a, a: S.bodyPoint(new V(0, (k - 1) * l, 0)), b: S.node(k), alpha: 0 });
  }
  for (let i = 0; i <= N; i++) solver.addRow({ label: `s${i}`, group: 'stretch', type: RigRowType.DIST, a: S.node(i), b: S.node(i + 1), rest: l, alpha: 1e-10 });
  // Bending rows carry the curvature of their Voronoi length; the clamped root
  // node only owns the half segment inside the beam.
  for (let i = 1; i <= N; i++) for (const pl of [0, 1]) {
    const voronoi = i === 1 ? l / 2 : l;
    solver.addRow({ label: `b${i}${pl}`, group: 'bend', type: RigRowType.BEND, n: [i - 1, i, i + 1], l1: l, l2: l, plane: pl, ref: 0, alpha: voronoi / EI });
  }
  solver.finalize();
  const dt = 1 / 240;
  const dir = plane === 0 ? new V(1, 0, 0) : new V(0, 0, 1);
  for (let step = 0; step < 1500; step++) {
    for (const p of parts) {
      p.p = new V(p.x.x, p.x.y, p.x.z);
      const fx = p === parts[N + 1] ? F * dir.x : 0, fz = p === parts[N + 1] ? F * dir.z : 0;
      p.v.x *= 0.97; p.v.y *= 0.97; p.v.z *= 0.97;
      p.v.x += fx * p.w * dt; p.v.z += fz * p.w * dt;
      p.x.x += p.v.x * dt; p.x.y += p.v.y * dt; p.x.z += p.v.z * dt;
    }
    solver.lambda = 0;
    for (let it = 0; it < 2; it++) solver.solve(dt);
    for (const p of parts) { p.v.x = (p.x.x - p.p.x) / dt; p.v.y = (p.x.y - p.p.y) / dt; p.v.z = (p.x.z - p.p.z) / dt; }
  }
  const tip = parts[N + 1].x;
  return { deflection: plane === 0 ? tip.x : tip.z, stats: solver.stats, matrix: solver.matrixStats };
}

{
  const N = 20, L = 4, EI = 5000, F = 10;
  const analytic = (F * L ** 3) / (3 * EI);
  for (const plane of [0, 1]) {
    const r = cantilever(N, L, EI, F, plane);
    const err = Math.abs(Math.abs(r.deflection) - analytic) / analytic;
    check(`cantilever plane ${plane} tip deflection`, err < 0.01, { deflection: r.deflection, analytic, err, matrix: r.matrix, clamped: r.stats.clampedPivots });
  }
}

if (failures.length) {
  console.error('rig-structure FAILED\n' + failures.join('\n'));
  process.exit(1);
}
console.log('rig-structure: sparse LDL exact, cantilever statics within 1% of Euler–Bernoulli');
