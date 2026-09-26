// Semantic51 kinematics of the LUCID female-skin-v4.2 body, and the canonical
// Skin78 cluster driver rules (TypeScript re-implementation of
// lucid_bcr.semantic.Semantic51.local_rotations/forward and
// lucid_bcr.drivers.ClusterDrivers._canonical).
//
// Poses enter as lawful Semantic51 DOF angles (hard ranges from the causal
// body graph) plus the declared hand layer; the solver below turns target
// segment frames into those angles joint by joint, clamping to the ranges, so
// nothing outside the body's articulation envelope reaches the skin.

import type { LucidAsset, SemanticDof, HandDof } from './LucidAsset.js';

export type M3 = Float64Array; // row-major 3×3

export const m3 = (): M3 => { const m = new Float64Array(9); m[0] = m[4] = m[8] = 1; return m; };
export function m3Identity(o: M3): M3 { o.fill(0); o[0] = o[4] = o[8] = 1; return o; }
export function m3Mul(a: M3, b: M3, o: M3): M3 {
  const a0 = a[0]!, a1 = a[1]!, a2 = a[2]!, a3 = a[3]!, a4 = a[4]!, a5 = a[5]!, a6 = a[6]!, a7 = a[7]!, a8 = a[8]!;
  const b0 = b[0]!, b1 = b[1]!, b2 = b[2]!, b3 = b[3]!, b4 = b[4]!, b5 = b[5]!, b6 = b[6]!, b7 = b[7]!, b8 = b[8]!;
  o[0] = a0 * b0 + a1 * b3 + a2 * b6; o[1] = a0 * b1 + a1 * b4 + a2 * b7; o[2] = a0 * b2 + a1 * b5 + a2 * b8;
  o[3] = a3 * b0 + a4 * b3 + a5 * b6; o[4] = a3 * b1 + a4 * b4 + a5 * b7; o[5] = a3 * b2 + a4 * b5 + a5 * b8;
  o[6] = a6 * b0 + a7 * b3 + a8 * b6; o[7] = a6 * b1 + a7 * b4 + a8 * b7; o[8] = a6 * b2 + a7 * b5 + a8 * b8;
  return o;
}
/** o = aᵀ·b */
export function m3MulTN(a: M3, b: M3, o: M3): M3 {
  const t = TMP_T;
  t[0] = a[0]!; t[1] = a[3]!; t[2] = a[6]!; t[3] = a[1]!; t[4] = a[4]!; t[5] = a[7]!; t[6] = a[2]!; t[7] = a[5]!; t[8] = a[8]!;
  return m3Mul(t, b, o);
}
const TMP_T = new Float64Array(9);
export function m3Copy(a: M3, o: M3): M3 { o.set(a); return o; }
export function m3AxisAngle(ax: number, ay: number, az: number, rad: number, o: M3): M3 {
  const l = Math.hypot(ax, ay, az) || 1;
  const x = ax / l, y = ay / l, z = az / l;
  const c = Math.cos(rad), s = Math.sin(rad), t = 1 - c;
  o[0] = t * x * x + c; o[1] = t * x * y - s * z; o[2] = t * x * z + s * y;
  o[3] = t * x * y + s * z; o[4] = t * y * y + c; o[5] = t * y * z - s * x;
  o[6] = t * x * z - s * y; o[7] = t * y * z + s * x; o[8] = t * z * z + c;
  return o;
}
export function m3ApplyVec(m: M3, x: number, y: number, z: number, out: Float64Array, o = 0): void {
  out[o] = m[0]! * x + m[1]! * y + m[2]! * z;
  out[o + 1] = m[3]! * x + m[4]! * y + m[5]! * z;
  out[o + 2] = m[6]! * x + m[7]! * y + m[8]! * z;
}
/** Rotation vector (axis × angle) of R. */
export function m3Log(R: M3, out: Float64Array): void {
  const tr = R[0]! + R[4]! + R[8]!;
  const c = Math.max(-1, Math.min(1, (tr - 1) / 2));
  const angle = Math.acos(c);
  let x = R[7]! - R[5]!, y = R[2]! - R[6]!, z = R[3]! - R[1]!;
  const s = Math.hypot(x, y, z);
  if (s < 1e-9) {
    if (angle < 1e-6) { out[0] = out[1] = out[2] = 0; return; }
    // 180°: axis from the diagonal.
    x = Math.sqrt(Math.max(0, (R[0]! + 1) / 2)); y = Math.sqrt(Math.max(0, (R[4]! + 1) / 2)); z = Math.sqrt(Math.max(0, (R[8]! + 1) / 2));
    if (R[1]! < 0) y = -y; if (R[2]! < 0) z = -z;
    const l = Math.hypot(x, y, z) || 1;
    out[0] = (x / l) * angle; out[1] = (y / l) * angle; out[2] = (z / l) * angle;
    return;
  }
  out[0] = (x / s) * angle; out[1] = (y / s) * angle; out[2] = (z / s) * angle;
}
/** Frame (columns: d, h⊥d, d×h) mapped: returns R with R·d0 = d and R·h0 ≈ h. */
export function m3FromTwoFrames(d0: ArrayLike<number>, h0: ArrayLike<number>, d: ArrayLike<number>, h: ArrayLike<number>, o: M3): M3 {
  const f0 = basis(d0, h0, BA), f1 = basis(d, h, BB);
  // o = F1 · F0ᵀ
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    o[r * 3 + c] = f1[r]! * f0[c]! + f1[3 + r]! * f0[3 + c]! + f1[6 + r]! * f0[6 + c]!;
  }
  return o;
}
const BA = new Float64Array(9), BB = new Float64Array(9);
function basis(d: ArrayLike<number>, h: ArrayLike<number>, o: Float64Array): Float64Array {
  let dx = d[0]!, dy = d[1]!, dz = d[2]!;
  const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
  let hx = h[0]!, hy = h[1]!, hz = h[2]!;
  const k = hx * dx + hy * dy + hz * dz;
  hx -= k * dx; hy -= k * dy; hz -= k * dz;
  let hl = Math.hypot(hx, hy, hz);
  if (hl < 1e-6) {
    // Any perpendicular.
    if (Math.abs(dx) < 0.9) { hx = 0; hy = -dz; hz = dy; } else { hx = dz; hy = 0; hz = -dx; }
    hl = Math.hypot(hx, hy, hz);
  }
  hx /= hl; hy /= hl; hz /= hl;
  // columns stored as rows of o: o[0..2] = d, o[3..5] = h, o[6..8] = d×h
  o[0] = dx; o[1] = dy; o[2] = dz; o[3] = hx; o[4] = hy; o[5] = hz;
  o[6] = dy * hz - dz * hy; o[7] = dz * hx - dx * hz; o[8] = dx * hy - dy * hx;
  return o;
}

interface JointDof { kind: 'semantic' | 'hand'; index: number; axis: [number, number, number]; min: number; max: number; sign: number }

/** Semantic51 body: DOF table, local rotations, forward kinematics. */
export class Semantic51Body {
  readonly n: number;
  readonly parents: Int32Array;
  readonly B: Float64Array; // rest joints (n×3), H-space
  readonly dofs: SemanticDof[];
  readonly hand: HandDof[];
  /** Per joint: ordered DOFs applied as Rl = R1·R2·… (compiler order). */
  readonly jointDofs: JointDof[][];
  readonly order: Int32Array; // topological order
  readonly joint: Map<string, number>;

  constructor(readonly asset: LucidAsset) {
    const h = asset.header;
    this.n = h.joints.length;
    this.parents = Int32Array.from(h.parents);
    this.B = Float64Array.from(h.restJoints.flat());
    this.dofs = h.semantic51;
    this.hand = h.handDofs;
    this.joint = asset.jointIndex;
    this.jointDofs = Array.from({ length: this.n }, () => []);
    this.dofs.forEach((d, i) => {
      if (d.family === 'root_orientation') return; // the world placement carries the pelvis
      if (d.family === 'distributed_twist') {
        const side = d.id.startsWith('left') ? 'L' : 'R';
        const handJoint = this.joint.get(`${side}_Hand`)!;
        this.jointDofs[handJoint]!.push({ kind: 'semantic', index: i, axis: d.axis, min: d.min, max: d.max, sign: side === 'L' ? -1 : 1 });
        return;
      }
      this.jointDofs[d.joint]!.push({ kind: 'semantic', index: i, axis: d.axis, min: d.min, max: d.max, sign: 1 });
    });
    // Hand layer: Thumb1 opposition → abduction → flexion; fingers flexion → spread.
    const handOrder = (dof: string, thumb: boolean) => thumb
      ? ({ opposition: 0, abductionAdduction: 1, flexionExtension: 2 } as Record<string, number>)[dof] ?? 3
      : ({ flexionExtension: 0, spread: 1 } as Record<string, number>)[dof] ?? 2;
    const byJoint = new Map<number, Array<{ d: HandDof; i: number }>>();
    this.hand.forEach((d, i) => { const list = byJoint.get(d.joint) ?? []; list.push({ d, i }); byJoint.set(d.joint, list); });
    for (const [j, list] of byJoint) {
      const thumb = h.joints[j]!.includes('Thumb1');
      list.sort((a, b) => handOrder(a.d.dof, thumb) - handOrder(b.d.dof, thumb));
      for (const { d, i } of list) this.jointDofs[j]!.push({ kind: 'hand', index: i, axis: d.axis, min: d.min, max: d.max, sign: 1 });
    }
    const order: number[] = [];
    const seen = new Uint8Array(this.n);
    const visit = (j: number): void => { if (seen[j]) return; const p = this.parents[j]!; if (p >= 0) visit(p); seen[j] = 1; order.push(j); };
    for (let j = 0; j < this.n; j++) visit(j);
    this.order = Int32Array.from(order);
  }

  /** Composes the local rotation of joint j from its DOF angles (degrees). */
  composeLocal(j: number, sem: Float64Array, hand: Float64Array, out: M3): M3 {
    m3Identity(out);
    const r = TMP_R;
    for (const d of this.jointDofs[j]!) {
      const v = d.kind === 'semantic' ? sem[d.index]! : hand[d.index]!;
      if (v === 0) continue;
      m3AxisAngle(d.axis[0], d.axis[1], d.axis[2], (v * d.sign * Math.PI) / 180, r);
      m3Mul(out, r, TMP_S);
      out.set(TMP_S);
    }
    return out;
  }

  /**
   * Chooses the DOF angles of joint j whose composed rotation is closest to
   * `target` (Gauss–Newton on the rotation-vector residual), clamped to the
   * hard ranges. `sem`/`hand` hold the previous angles (warm start) and
   * receive the result.
   */
  solveLocal(j: number, target: M3, sem: Float64Array, hand: Float64Array, iterations = 4): void {
    const dofs = this.jointDofs[j]!;
    const k = dofs.length;
    if (k === 0) return;
    const get = (d: JointDof) => (d.kind === 'semantic' ? sem[d.index]! : hand[d.index]!);
    const set = (d: JointDof, v: number) => { const c = Math.max(d.min, Math.min(d.max, v)); if (d.kind === 'semantic') sem[d.index] = c; else hand[d.index] = c; };
    const R = TMP_A, E = TMP_B, res = TMP_V, jac = TMP_J;
    for (let it = 0; it < iterations; it++) {
      this.composeLocal(j, sem, hand, R);
      m3MulTN(target, R, E); // residual rotation targetᵀ·R
      m3Log(E, res);
      const r0 = res[0]!, r1 = res[1]!, r2 = res[2]!;
      if (r0 * r0 + r1 * r1 + r2 * r2 < 1e-10) break;
      // Numerical Jacobian (degrees).
      for (let c = 0; c < k; c++) {
        const d = dofs[c]!;
        const v = get(d);
        const h = 0.5;
        if (d.kind === 'semantic') sem[d.index] = v + h; else hand[d.index] = v + h;
        this.composeLocal(j, sem, hand, R);
        m3MulTN(target, R, E);
        m3Log(E, TMP_V2);
        jac[c * 3] = (TMP_V2[0]! - r0) / h; jac[c * 3 + 1] = (TMP_V2[1]! - r1) / h; jac[c * 3 + 2] = (TMP_V2[2]! - r2) / h;
        if (d.kind === 'semantic') sem[d.index] = v; else hand[d.index] = v;
      }
      // Solve (JᵀJ + λI) δ = -Jᵀr (k ≤ 3).
      const A = TMP_AA, g = TMP_G;
      for (let a = 0; a < k; a++) {
        g[a] = -(jac[a * 3]! * r0 + jac[a * 3 + 1]! * r1 + jac[a * 3 + 2]! * r2);
        for (let b = 0; b < k; b++) A[a * 3 + b] = jac[a * 3]! * jac[b * 3]! + jac[a * 3 + 1]! * jac[b * 3 + 1]! + jac[a * 3 + 2]! * jac[b * 3 + 2]! + (a === b ? 1e-6 : 0);
      }
      const delta = solveSmall(A, g, k);
      for (let c = 0; c < k; c++) set(dofs[c]!, get(dofs[c]!) + Math.max(-60, Math.min(60, delta[c]!)));
    }
  }

  /** Forward kinematics in H-space from local rotations; then world placement. */
  forward(Rl: Float64Array, Rw: M3, root: ArrayLike<number>, P: Float64Array, G: Float64Array): void {
    const B = this.B;
    const g = TMP_A, pg = TMP_B;
    const PH = TMP_PH.length >= this.n * 3 ? TMP_PH : (TMP_PH = new Float64Array(this.n * 3));
    const GH = TMP_GH.length >= this.n * 9 ? TMP_GH : (TMP_GH = new Float64Array(this.n * 9));
    for (const j of this.order) {
      const p = this.parents[j]!;
      const rl = Rl.subarray(j * 9, j * 9 + 9);
      if (p < 0) {
        PH[j * 3] = B[j * 3]!; PH[j * 3 + 1] = B[j * 3 + 1]!; PH[j * 3 + 2] = B[j * 3 + 2]!;
        GH.set(rl, j * 9);
      } else {
        pg.set(GH.subarray(p * 9, p * 9 + 9));
        const bx = B[j * 3]! - B[p * 3]!, by = B[j * 3 + 1]! - B[p * 3 + 1]!, bz = B[j * 3 + 2]! - B[p * 3 + 2]!;
        PH[j * 3] = PH[p * 3]! + pg[0]! * bx + pg[1]! * by + pg[2]! * bz;
        PH[j * 3 + 1] = PH[p * 3 + 1]! + pg[3]! * bx + pg[4]! * by + pg[5]! * bz;
        PH[j * 3 + 2] = PH[p * 3 + 2]! + pg[6]! * bx + pg[7]! * by + pg[8]! * bz;
        m3Mul(pg, rl, g);
        GH.set(g, j * 9);
      }
    }
    // World placement: rigid transform about the rest root.
    const b0x = B[0]!, b0y = B[1]!, b0z = B[2]!;
    for (let j = 0; j < this.n; j++) {
      const x = PH[j * 3]! - b0x, y = PH[j * 3 + 1]! - b0y, z = PH[j * 3 + 2]! - b0z;
      P[j * 3] = Rw[0]! * x + Rw[1]! * y + Rw[2]! * z + root[0]!;
      P[j * 3 + 1] = Rw[3]! * x + Rw[4]! * y + Rw[5]! * z + root[1]!;
      P[j * 3 + 2] = Rw[6]! * x + Rw[7]! * y + Rw[8]! * z + root[2]!;
      m3Mul(Rw, GH.subarray(j * 9, j * 9 + 9), g);
      G.set(g, j * 9);
    }
  }
}

let TMP_PH = new Float64Array(0);
let TMP_GH = new Float64Array(0);
const TMP_R = new Float64Array(9), TMP_S = new Float64Array(9), TMP_A = new Float64Array(9), TMP_B = new Float64Array(9);
const TMP_V = new Float64Array(3), TMP_V2 = new Float64Array(3), TMP_J = new Float64Array(9), TMP_AA = new Float64Array(9), TMP_G = new Float64Array(3);
const TMP_X = new Float64Array(3);

function solveSmall(A: Float64Array, g: Float64Array, k: number): Float64Array {
  const x = TMP_X;
  if (k === 1) { x[0] = g[0]! / A[0]!; return x; }
  if (k === 2) {
    const det = A[0]! * A[4]! - A[1]! * A[3]!;
    x[0] = (g[0]! * A[4]! - A[1]! * g[1]!) / det;
    x[1] = (A[0]! * g[1]! - A[3]! * g[0]!) / det;
    return x;
  }
  const a = A[0]!, b = A[1]!, c = A[2]!, d = A[3]!, e = A[4]!, f = A[5]!, gg = A[6]!, h = A[7]!, i = A[8]!;
  const det = a * (e * i - f * h) - b * (d * i - f * gg) + c * (d * h - e * gg);
  const r0 = g[0]!, r1 = g[1]!, r2 = g[2]!;
  x[0] = (r0 * (e * i - f * h) - b * (r1 * i - f * r2) + c * (r1 * h - e * r2)) / det;
  x[1] = (a * (r1 * i - f * r2) - r0 * (d * i - f * gg) + c * (d * r2 - r1 * gg)) / det;
  x[2] = (a * (e * r2 - r1 * h) - b * (d * r2 - r1 * gg) + r0 * (d * h - e * gg)) / det;
  return x;
}

// ------------------------------------------------------------ cluster drivers

type Rule = (c: number) => void;
const FOLLOW_NONE = 0, FOLLOW_ANCHOR = 1, FOLLOW_SELF = 2;

/**
 * Canonical female-skin-v4.2 helper rules: joint pose (P, G) → 78 rigid
 * cluster transforms x' = D·x + T (drivers.py `_canonical`).
 */
export class CanonicalClusterDrivers {
  readonly nc: number;
  /** Output: D (nc×9, row-major) and T (nc×3). */
  readonly D: Float64Array;
  readonly T: Float64Array;
  private readonly rules: Rule[] = [];
  private P: Float64Array = new Float64Array(0);
  private G: Float64Array = new Float64Array(0);
  private twist: [number, number] = [0, 0];
  private readonly piv: Float64Array;
  private readonly Brest: Float64Array;
  private readonly tmp = new Float64Array(9);
  private readonly tmp2 = new Float64Array(9);
  private readonly tmpV = new Float64Array(3);

  constructor(readonly body: Semantic51Body) {
    const h = body.asset.header;
    this.nc = h.clusters.length;
    this.D = new Float64Array(this.nc * 9);
    this.T = new Float64Array(this.nc * 3);
    this.piv = Float64Array.from(h.clusterPivots.flat());
    this.Brest = body.B;
    const J = (name: string) => { const i = body.joint.get(name); if (i === undefined) throw new Error(`joint ${name}`); return i; };
    h.clusters.forEach((name, c) => {
      const s = name.length > 2 && name[1] === '_' ? name[0]! : null;
      const own = (j: number): Rule => () => this.set(c, this.G.subarray(j * 9, j * 9 + 9), j, FOLLOW_NONE);
      const follow = (j: number): Rule => () => this.set(c, this.G.subarray(j * 9, j * 9 + 9), j, FOLLOW_ANCHOR);
      if (name === 'Pelvis') { this.rules.push(own(J('Hip'))); return; }
      if (name === 'Waist') { const a = J('Hip'), b = J('Spine01'); this.rules.push(() => this.setSlerp(c, a, b, 0.5, a, true)); return; }
      if (name === 'Spine01' || name === 'Spine02' || name === 'NeckTwist01' || name === 'Head') { this.rules.push(own(J(name))); return; }
      if (name === 'NeckTwist02') { const a = J('NeckTwist01'), b = J('Head'); this.rules.push(() => this.setSlerp(c, a, b, 0.55, a, true)); return; }
      if (name === 'JawRoot') { this.rules.push(follow(J('Head'))); return; }
      if (name.includes('Breast') || name.includes('RibsTwist')) {
        const a = J('Spine02'), b = J(`${name[0]}_Clavicle`);
        this.rules.push(() => this.setSlerp(c, a, b, 0.25, a, true));
        return;
      }
      if (s === 'L' || s === 'R') {
        if (name === `${s}_Clavicle` || name === `${s}_Hand` || name === `${s}_Foot`) { this.rules.push(own(J(name))); return; }
        if (name.includes('UpperarmTwist')) { this.rules.push(follow(J(`${s}_Upperarm`))); return; }
        if (name === `${s}_ElbowShareBone`) {
          const a = J(`${s}_Upperarm`), b = J(`${s}_Forearm`);
          this.rules.push(() => this.setSlerp(c, a, b, 0.35, b, false));
          return;
        }
        if (name.includes('ForearmTwist')) {
          const j = J(`${s}_Forearm`), hand = J(`${s}_Hand`);
          const frac = name.endsWith('01') ? 0.34 : 0.72;
          const side = s === 'L' ? 0 : 1;
          this.rules.push(() => {
            const P = this.P;
            const ax = P[hand * 3]! - P[j * 3]!, ay = P[hand * 3 + 1]! - P[j * 3 + 1]!, az = P[hand * 3 + 2]! - P[j * 3 + 2]!;
            m3AxisAngle(ax, ay, az, (this.twist[side] * frac * Math.PI) / 180, this.tmp);
            m3Mul(this.tmp, this.G.subarray(j * 9, j * 9 + 9), this.tmp2);
            // Pivot follows the twisted frame itself (drivers.py: P[j] + D·(bp − B[j])).
            this.set(c, this.tmp2, j, FOLLOW_SELF);
          });
          return;
        }
        if (['Index', 'Mid', 'Pinky', 'Ring', 'Thumb'].some((f) => name.startsWith(`${s}_${f}`)) && body.joint.has(name)) {
          this.rules.push(own(J(name)));
          return;
        }
        if (name.includes('ThighTwist')) { this.rules.push(follow(J(`${s}_Thigh`))); return; }
        if (name === `${s}_KneeShareBone`) {
          const a = J(`${s}_Thigh`), b = J(`${s}_Calf`);
          this.rules.push(() => this.setSlerp(c, a, b, 0.45, b, false));
          return;
        }
        if (name.includes('CalfTwist')) { this.rules.push(follow(J(`${s}_Calf`))); return; }
        if (name.includes('Toe1')) {
          const foot = J(`${s}_Foot`), toe = J(`${s}_ToeBase`);
          this.rules.push(() => this.set(c, this.G.subarray(toe * 9, toe * 9 + 9), foot, FOLLOW_ANCHOR));
          return;
        }
      }
      throw new Error(`no canonical driver rule for cluster ${name}`);
    });
  }

  /**
   * D = R; pivot image p = P[anchor] (+ M·(bp − B[anchor]) with M = G[anchor]
   * or M = R); T = p − D·bp.
   */
  private set(c: number, R: ArrayLike<number>, anchor: number, follow: number): void {
    const D = this.D, T = this.T, piv = this.piv, P = this.P, B = this.Brest;
    for (let k = 0; k < 9; k++) D[c * 9 + k] = R[k]!;
    const bx = piv[c * 3]!, by = piv[c * 3 + 1]!, bz = piv[c * 3 + 2]!;
    let px = P[anchor * 3]!, py = P[anchor * 3 + 1]!, pz = P[anchor * 3 + 2]!;
    if (follow !== FOLLOW_NONE) {
      const g = follow === FOLLOW_SELF ? R : this.G, o = follow === FOLLOW_SELF ? 0 : anchor * 9;
      const dx = bx - B[anchor * 3]!, dy = by - B[anchor * 3 + 1]!, dz = bz - B[anchor * 3 + 2]!;
      px += g[o]! * dx + g[o + 1]! * dy + g[o + 2]! * dz;
      py += g[o + 3]! * dx + g[o + 4]! * dy + g[o + 5]! * dz;
      pz += g[o + 6]! * dx + g[o + 7]! * dy + g[o + 8]! * dz;
    }
    T[c * 3] = px - (R[0]! * bx + R[1]! * by + R[2]! * bz);
    T[c * 3 + 1] = py - (R[3]! * bx + R[4]! * by + R[5]! * bz);
    T[c * 3 + 2] = pz - (R[6]! * bx + R[7]! * by + R[8]! * bz);
  }

  /** slerpM(G[a], G[b], t): D = G[a]·exp(t·log(G[a]ᵀG[b])); pivot from joint `anchor`. */
  private setSlerp(c: number, a: number, b: number, t: number, anchor: number, follow: boolean): void {
    const G = this.G;
    const ga = G.subarray(a * 9, a * 9 + 9), gb = G.subarray(b * 9, b * 9 + 9);
    m3MulTN(ga, gb, this.tmp);
    m3Log(this.tmp, this.tmpV);
    const ang = Math.hypot(this.tmpV[0]!, this.tmpV[1]!, this.tmpV[2]!);
    if (ang < 1e-12) m3Identity(this.tmp);
    else m3AxisAngle(this.tmpV[0]!, this.tmpV[1]!, this.tmpV[2]!, ang * t, this.tmp);
    m3Mul(ga, this.tmp, this.tmp2);
    this.set(c, this.tmp2, anchor, follow ? FOLLOW_ANCHOR : FOLLOW_NONE);
  }

  /** Evaluates all 78 cluster transforms for a world pose. twistDeg: physical forearm twist [L, R]. */
  evaluate(P: Float64Array, G: Float64Array, twistDeg: [number, number]): void {
    this.P = P;
    this.G = G;
    this.twist = twistDeg;
    for (let c = 0; c < this.rules.length; c++) this.rules[c]!(c);
  }
}
