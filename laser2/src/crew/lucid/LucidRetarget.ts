// Retargets a legacy crew pose (21 joint positions in the boat design frame,
// produced by the legacy biomechanics and CrewRecoverySystem) onto the LUCID
// female-skin-v4.2 skeleton as lawful Semantic51 + hand-layer angles.
//
//   1. pelvis frame from the hip line and the lumbar direction → world
//      placement (the pelvis carries whole-body orientation: swimming,
//      hanging on the board, lying in the flooded cockpit);
//   2. spine, neck, head: segment directions with the shoulder line (or
//      look direction) as twist reference;
//   3. arms and legs: two-bone IK from HER shoulder/hip to the legacy
//      wrist/ankle targets with the legacy elbow/knee as pole, so hands stay on
//      the tiller extension, sheets and board and feet stay in the straps even
//      where her proportions differ; the upper-limb twist is taken from the
//      elbow/knee plane so the hinge joints can realise the bend;
//   4. every joint's local rotation is solved into its DOF angles and clamped
//      to the causal body graph's hard ranges before forward kinematics.

import type { LucidAsset } from './LucidAsset.js';
import {
  Semantic51Body, m3, m3Mul, m3MulTN, m3FromTwoFrames, m3Identity, type M3,
} from './LucidKinematics.js';

export interface LegacyJoints { [name: string]: { x: number; y: number; z: number } | undefined }

export interface GripState { curl: number; spread: number; thumb: number }

type V = Float64Array;
const v3 = (x = 0, y = 0, z = 0): V => Float64Array.of(x, y, z);
const sub = (a: ArrayLike<number>, b: ArrayLike<number>, o: V = v3()): V => { o[0] = a[0]! - b[0]!; o[1] = a[1]! - b[1]!; o[2] = a[2]! - b[2]!; return o; };
const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const len = (a: ArrayLike<number>): number => Math.sqrt(dot(a, a));
const norm = (a: V): V => { const l = len(a) || 1; a[0] = a[0]! / l; a[1] = a[1]! / l; a[2] = a[2]! / l; return a; };
const cross = (a: ArrayLike<number>, b: ArrayLike<number>, o: V = v3()): V => {
  const x = a[1]! * b[2]! - a[2]! * b[1]!, y = a[2]! * b[0]! - a[0]! * b[2]!, z = a[0]! * b[1]! - a[1]! * b[0]!;
  o[0] = x; o[1] = y; o[2] = z; return o;
};
const perp = (a: ArrayLike<number>, axis: ArrayLike<number>, o: V = v3()): V => {
  const k = dot(a, axis); o[0] = a[0]! - k * axis[0]!; o[1] = a[1]! - k * axis[1]!; o[2] = a[2]! - k * axis[2]!; return o;
};
const lerpV = (a: ArrayLike<number>, b: ArrayLike<number>, t: number, o: V = v3()): V => {
  o[0] = a[0]! + (b[0]! - a[0]!) * t; o[1] = a[1]! + (b[1]! - a[1]!) * t; o[2] = a[2]! + (b[2]! - a[2]!) * t; return o;
};
const fromJ = (p: { x: number; y: number; z: number }, o: V = v3()): V => { o[0] = p.x; o[1] = p.y; o[2] = p.z; return o; };
const smooth = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Rotation of the H-space rest (her rest faces −Z) into the design rest (faces +Z). */
const Y180: M3 = Float64Array.of(-1, 0, 0, 0, 1, 0, 0, 0, -1);

export class LucidRetarget {
  readonly body: Semantic51Body;
  /** Lawful angles (degrees), warm-started frame to frame. */
  readonly sem: Float64Array;
  readonly hand: Float64Array;
  readonly Rl: Float64Array;
  /** Output world (design-frame) pose. */
  readonly P: Float64Array;
  readonly G: Float64Array;
  readonly twist: [number, number] = [0, 0];
  private readonly Rw: M3 = m3();
  private readonly root = v3();
  /** Rest data in the design-rest orientation (Y180 applied). */
  private readonly Bd: Float64Array;
  private readonly J: (name: string) => number;
  private readonly GH: Float64Array;
  private readonly PH: Float64Array;
  private readonly elbowFlex: [V, V];
  private readonly kneeFlex: [V, V];
  readonly segLen: Record<string, number> = {};
  readonly clampEvents = { count: 0 };

  constructor(readonly asset: LucidAsset) {
    this.body = new Semantic51Body(asset);
    const n = this.body.n;
    this.sem = new Float64Array(asset.header.semantic51.length);
    this.hand = new Float64Array(asset.header.handDofs.length);
    this.Rl = new Float64Array(n * 9);
    for (let j = 0; j < n; j++) m3Identity(this.Rl.subarray(j * 9, j * 9 + 9));
    this.P = new Float64Array(n * 3);
    this.G = new Float64Array(n * 9);
    this.GH = new Float64Array(n * 9);
    this.PH = new Float64Array(n * 3);
    this.J = (name) => { const i = asset.jointIndex.get(name); if (i === undefined) throw new Error(`LUCID joint ${name}`); return i; };
    const B = this.body.B;
    this.Bd = new Float64Array(B.length);
    for (let j = 0; j < n; j++) { this.Bd[j * 3] = -B[j * 3]!; this.Bd[j * 3 + 1] = B[j * 3 + 1]!; this.Bd[j * 3 + 2] = -B[j * 3 + 2]!; }
    const dist = (a: string, b: string) => len(sub(this.rest(b), this.rest(a)));
    for (const s of ['L', 'R']) {
      this.segLen[`${s}uarm`] = dist(`${s}_Upperarm`, `${s}_Forearm`);
      this.segLen[`${s}farm`] = dist(`${s}_Forearm`, `${s}_Hand`);
      this.segLen[`${s}thigh`] = dist(`${s}_Thigh`, `${s}_Calf`);
      this.segLen[`${s}shin`] = dist(`${s}_Calf`, `${s}_Foot`);
    }
    // Directions the forearm / shin take when the hinge flexes from rest
    // (design-rest frame), used as twist references for the upper limbs.
    const hinge = (dofId: string, a: string, b: string): V => {
      const d = asset.header.semantic51.find((x) => x.id === dofId)!;
      const ax = Float64Array.of(-d.axis[0], d.axis[1], -d.axis[2]); // Y180 of the H-space axis
      const seg = norm(sub(this.rest(b), this.rest(a)));
      return norm(cross(ax, seg)); // +flexion moves the distal segment this way
    };
    this.elbowFlex = [hinge('leftElbow.flexionExtension', 'L_Forearm', 'L_Hand'), hinge('rightElbow.flexionExtension', 'R_Forearm', 'R_Hand')];
    this.kneeFlex = [hinge('leftKnee.flexionExtension', 'L_Calf', 'L_Foot'), hinge('rightKnee.flexionExtension', 'R_Calf', 'R_Foot')];
  }

  /** Rest joint position in the design-rest orientation. */
  rest(name: string, o: V = v3()): V { const j = this.J(name); o[0] = this.Bd[j * 3]!; o[1] = this.Bd[j * 3 + 1]!; o[2] = this.Bd[j * 3 + 2]!; return o; }

  /** Legacy body dimensions matching her skeleton (for the legacy crew IK). */
  legacyDims(): Record<string, number> {
    const y = (n: string) => this.rest(n)[1]!;
    const hipX = Math.abs(this.rest('L_Thigh')[0]!);
    const hand = len(sub(this.rest('L_Mid3'), this.rest('L_Hand'))) + 0.02;
    return {
      uarm: this.segLen.Luarm!, farm: this.segLen.Lfarm!, hand,
      thigh: this.segLen.Lthigh!, shin: this.segLen.Lshin!, ankleH: y('L_Foot'),
      torso: y('Spine02') - y('Hip'), neck: y('NeckTwist01') - y('Spine02'),
      shX: Math.abs(this.rest('L_Upperarm')[0]!), hipX, shY: y('L_Upperarm') - y('Spine02'),
      hipsY: y('Hip'), spineY: y('Spine01'), chestY: y('Spine02'), neckY: y('NeckTwist01'), headY: y('Head'),
      shoulderY: y('L_Upperarm'), headTop: 1.629,
    };
  }

  // ------------------------------------------------------------------ solve

  private readonly t0 = v3(); private readonly t1 = v3(); private readonly t2 = v3(); private readonly t3 = v3();
  private readonly t4 = v3(); private readonly t5 = v3(); private readonly t6 = v3(); private readonly t7 = v3();
  private readonly Mt = m3(); private readonly Mg = m3(); private readonly Ml = m3();

  /** Target design-frame rotation of a segment: rest (d0, h0) → current (d, h). */
  private target(d0: ArrayLike<number>, h0: ArrayLike<number>, d: ArrayLike<number>, h: ArrayLike<number>, out: M3): M3 {
    return m3FromTwoFrames(d0, h0, d, h, out);
  }

  /** Solves joint j to world target Gd (design frame, relative to design rest). */
  private solveJoint(j: number, Gd: M3): void {
    const body = this.body;
    const p = body.parents[j]!;
    // H-space world target: Rwᵀ·Gd·Y180
    m3MulTN(this.Rw, Gd, this.Mt);
    m3Mul(this.Mt, Y180, this.Mg);
    // local target = GH[parent]ᵀ·target
    m3MulTN(this.GH.subarray(p * 9, p * 9 + 9), this.Mg, this.Ml);
    body.solveLocal(j, this.Ml, this.sem, this.hand, 5);
    const rl = this.Rl.subarray(j * 9, j * 9 + 9);
    body.composeLocal(j, this.sem, this.hand, rl);
    this.propagate(j);
  }

  /** Updates GH/PH of joint j from its parent (H-space FK, pelvis at rest). */
  private propagate(j: number): void {
    const p = this.body.parents[j]!;
    const B = this.body.B;
    const rl = this.Rl.subarray(j * 9, j * 9 + 9);
    if (p < 0) {
      this.GH.set(rl, j * 9);
      this.PH[j * 3] = B[j * 3]!; this.PH[j * 3 + 1] = B[j * 3 + 1]!; this.PH[j * 3 + 2] = B[j * 3 + 2]!;
      return;
    }
    const pg = this.GH.subarray(p * 9, p * 9 + 9);
    const bx = B[j * 3]! - B[p * 3]!, by = B[j * 3 + 1]! - B[p * 3 + 1]!, bz = B[j * 3 + 2]! - B[p * 3 + 2]!;
    this.PH[j * 3] = this.PH[p * 3]! + pg[0]! * bx + pg[1]! * by + pg[2]! * bz;
    this.PH[j * 3 + 1] = this.PH[p * 3 + 1]! + pg[3]! * bx + pg[4]! * by + pg[5]! * bz;
    this.PH[j * 3 + 2] = this.PH[p * 3 + 2]! + pg[6]! * bx + pg[7]! * by + pg[8]! * bz;
    m3Mul(pg, rl, this.Mt);
    this.GH.set(this.Mt, j * 9);
  }

  /** Design-frame position of joint j under the current partial solve. */
  private world(j: number, o: V): V {
    const B = this.body.B;
    const x = this.PH[j * 3]! - B[0]!, y = this.PH[j * 3 + 1]! - B[1]!, z = this.PH[j * 3 + 2]! - B[2]!;
    const R = this.Rw;
    o[0] = R[0]! * x + R[1]! * y + R[2]! * z + this.root[0]!;
    o[1] = R[3]! * x + R[4]! * y + R[5]! * z + this.root[1]!;
    o[2] = R[6]! * x + R[7]! * y + R[8]! * z + this.root[2]!;
    return o;
  }

  private readonly angleIndex = new Map<string, number>();
  private setAngle(id: string, deg: number): void {
    let i = this.angleIndex.get(id);
    if (i === undefined) { i = this.asset.header.semantic51.findIndex((d) => d.id === id); this.angleIndex.set(id, i); }
    if (i < 0) return;
    const d = this.asset.header.semantic51[i]!;
    const c = Math.max(d.min, Math.min(d.max, deg));
    if (c !== deg) this.clampEvents.count++;
    this.sem[i] = c;
  }

  /** Delta of a legacy segment from its own rest, applied to her rest (neutral in → neutral out). */
  private delta(restA: V, restB: V, restHint: ArrayLike<number>, curA: V, curB: V, curHint: ArrayLike<number>, out: M3): M3 {
    const d0 = norm(sub(restB, restA, this.t6));
    const d1 = norm(sub(curB, curA, this.t7));
    return m3FromTwoFrames(d0, restHint, d1, curHint, out);
  }

  /**
   * The legacy crew skeleton at rest, built with her dimensions through the
   * legacy pose formulas (pelvis, spine at 0.42·torso, chest, neck at
   * 0.9·neck leaning 0.04 back, head 0.115 beyond, shoulders at half shY,
   * hips 2 cm below the pelvis), in the design frame. Deltas are taken
   * against this so a legacy rest pose maps to her rest pose.
   */
  private legacyRestCache: Record<string, V> | null = null;
  legacyRest(): Record<string, V> {
    if (this.legacyRestCache) return this.legacyRestCache;
    const d = this.legacyDims();
    const S = norm(v3(0, 1, -0.04));
    const pelvis = v3(0, d.hipsY!, 0);
    const chest = v3(0, d.hipsY! + d.torso!, 0);
    const neck = v3(chest[0]! + S[0]! * 0.9 * d.neck!, chest[1]! + S[1]! * 0.9 * d.neck!, chest[2]! + S[2]! * 0.9 * d.neck!);
    const head = v3(neck[0]! + S[0]! * 0.115, neck[1]! + S[1]! * 0.115, neck[2]! + S[2]! * 0.115);
    this.legacyRestCache = {
      pelvis, spine: v3(0, d.hipsY! + 0.42 * d.torso!, 0), chest, neck, head,
      shoulderL: v3(d.shX!, chest[1]! + 0.5 * d.shY!, 0), shoulderR: v3(-d.shX!, chest[1]! + 0.5 * d.shY!, 0),
      hipL: v3(d.hipX!, d.hipsY! - 0.02, 0), hipR: v3(-d.hipX!, d.hipsY! - 0.02, 0),
    };
    return this.legacyRestCache;
  }

  // ---- upper-body IK (joint-limited, Levenberg–Marquardt over lawful DOFs)
  private ikDofs: Int32Array | null = null;
  private ikJoints: Int32Array | null = null;
  private readonly ikRef = new Float64Array(24);
  private readonly ikW = new Float64Array(24);
  private readonly ikJ = new Float64Array(48 * 24);
  private readonly ikR = new Float64Array(48);
  private readonly ikA = new Float64Array(24 * 24);
  private readonly ikG = new Float64Array(24);
  private readonly ikTarget = new Float64Array(12);

  private setupIk(): void {
    const ids = [
      'spine01.flexionExtension', 'spine01.lateralBend', 'spine01.axialRotation',
      'spine02.flexionExtension', 'spine02.lateralBend', 'spine02.axialRotation',
      'leftClavicle.protractionRetraction', 'leftClavicle.elevationDepression',
      'rightClavicle.protractionRetraction', 'rightClavicle.elevationDepression',
      'leftShoulder.flexionExtension', 'leftShoulder.abductionAdduction', 'leftShoulder.axialRotation',
      'rightShoulder.flexionExtension', 'rightShoulder.abductionAdduction', 'rightShoulder.axialRotation',
      'leftElbow.flexionExtension', 'rightElbow.flexionExtension',
    ];
    const defs = this.asset.header.semantic51;
    this.ikDofs = Int32Array.from(ids.map((id) => defs.findIndex((d) => d.id === id)));
    const J = this.J;
    this.ikJoints = Int32Array.from(['Spine01', 'Spine02', 'NeckTwist01', 'L_Clavicle', 'R_Clavicle', 'L_Upperarm', 'R_Upperarm', 'L_Forearm', 'R_Forearm', 'L_Hand', 'R_Hand'].map(J));
    // Regularisation weights per DOF (1/deg²): trunk and girdle prefer the
    // legacy posture; shoulders/elbows are free to reach.
    const w = [0.02, 0.02, 0.01, 0.02, 0.02, 0.01, 0.01, 0.02, 0.01, 0.02, 0.0004, 0.0004, 0.0008, 0.0004, 0.0004, 0.0008, 0.0002, 0.0002];
    w.forEach((x, i) => { this.ikW[i] = x; });
  }

  private fkUpper(): void {
    const js = this.ikJoints!;
    for (let k = 0; k < js.length; k++) {
      const j = js[k]!;
      this.body.composeLocal(j, this.sem, this.hand, this.Rl.subarray(j * 9, j * 9 + 9));
      this.propagate(j);
    }
  }

  /** Residual: wrist and elbow targets (m) and DOF regularisation (sqrt-weighted, deg). */
  private ikResidual(out: Float64Array): number {
    this.fkUpper();
    const J = this.J;
    const w = this.t0;
    let e = 0;
    const put = (k: number, v: number) => { out[k] = v; e += v * v; };
    const t = this.ikTarget;
    this.world(J('L_Hand'), w); put(0, w[0]! - t[0]!); put(1, w[1]! - t[1]!); put(2, w[2]! - t[2]!);
    this.world(J('R_Hand'), w); put(3, w[0]! - t[3]!); put(4, w[1]! - t[4]!); put(5, w[2]! - t[5]!);
    const pole = 0.35;
    this.world(J('L_Forearm'), w); put(6, pole * (w[0]! - t[6]!)); put(7, pole * (w[1]! - t[7]!)); put(8, pole * (w[2]! - t[8]!));
    this.world(J('R_Forearm'), w); put(9, pole * (w[0]! - t[9]!)); put(10, pole * (w[1]! - t[10]!)); put(11, pole * (w[2]! - t[11]!));
    const dofs = this.ikDofs!;
    for (let i = 0; i < dofs.length; i++) put(12 + i, Math.sqrt(this.ikW[i]!) * 0.01 * (this.sem[dofs[i]!]! - this.ikRef[i]!));
    return e;
  }

  private solveUpperIk(iterations: number): void {
    if (!this.ikDofs) this.setupIk();
    const dofs = this.ikDofs!;
    const n = dofs.length, m = 12 + n;
    const defs = this.asset.header.semantic51;
    for (let i = 0; i < n; i++) this.ikRef[i] = this.sem[dofs[i]!]!;
    const r = this.ikR, Jm = this.ikJ, A = this.ikA, g = this.ikG;
    const r2 = new Float64Array(m);
    let lambda = 1e-3;
    let err = this.ikResidual(r);
    let gain = Infinity;
    for (let it = 0; it < iterations; it++) {
      // numeric Jacobian (per degree)
      for (let c = 0; c < n; c++) {
        const d = dofs[c]!;
        const v = this.sem[d]!;
        this.sem[d] = v + 0.5;
        this.ikResidual(r2);
        for (let k = 0; k < m; k++) Jm[k * n + c] = (r2[k]! - r[k]!) / 0.5;
        this.sem[d] = v;
      }
      for (let a = 0; a < n; a++) {
        let s = 0;
        for (let k = 0; k < m; k++) s += Jm[k * n + a]! * r[k]!;
        g[a] = -s;
        for (let b = 0; b <= a; b++) {
          let q = 0;
          for (let k = 0; k < m; k++) q += Jm[k * n + a]! * Jm[k * n + b]!;
          A[a * n + b] = q; A[b * n + a] = q;
        }
      }
      const old = Float64Array.from(dofs, (d) => this.sem[d]!);
      let improved = false;
      for (let tries = 0; tries < 5 && !improved; tries++) {
        // Projected LM: DOFs resting on a hard limit whose step points outward are held.
        const held = new Uint8Array(n);
        let step = new Float64Array(n);
        for (let pass = 0; pass < 3; pass++) {
          const M = Float64Array.from(A.subarray(0, n * n));
          const rhs = Float64Array.from(g.subarray(0, n));
          for (let a = 0; a < n; a++) {
            if (held[a]) {
              for (let b = 0; b < n; b++) { M[a * n + b] = 0; M[b * n + a] = 0; }
              M[a * n + a] = 1; rhs[a] = 0;
            } else M[a * n + a] = M[a * n + a]! * (1 + lambda) + 1e-9;
          }
          step = choleskySolve(M, rhs, n);
          let changed = false;
          for (let c = 0; c < n; c++) {
            if (held[c]) continue;
            const def = defs[dofs[c]!]!;
            const v = old[c]!;
            if ((v <= def.min + 1e-6 && step[c]! < 0) || (v >= def.max - 1e-6 && step[c]! > 0)) { held[c] = 1; changed = true; }
          }
          if (!changed) break;
        }
        for (let c = 0; c < n; c++) {
          const def = defs[dofs[c]!]!;
          this.sem[dofs[c]!] = Math.max(def.min, Math.min(def.max, old[c]! + (held[c] ? 0 : Math.max(-40, Math.min(40, step[c]!)))));
        }
        const e2 = this.ikResidual(r2);
        if (e2 < err) { gain = err - e2; err = e2; r.set(r2); lambda = Math.max(1e-6, lambda * 0.3); improved = true; }
        else { for (let c = 0; c < n; c++) this.sem[dofs[c]!] = old[c]!; lambda *= 8; }
      }
      if (!improved || gain < 2e-7) break;
    }
    this.fkUpper();
  }

  /**
   * Solves the full pose from the legacy joint set `L` (design frame), the
   * head's forward direction and the grip per hand.
   */
  solve(L: LegacyJoints, look: ArrayLike<number> | null, grip: [GripState, GripState]): void {
    const need = (n: string) => { const p = L[n]; if (!p) throw new Error(`legacy joint ${n} missing`); return p; };
    const R = this.legacyRest();
    const J = this.J;
    const { t0, t1, t2, t3, t4, t5 } = this;
    const lat0 = v3(1, 0, 0), fwd0 = v3(0, 0, 1);
    const cur = (n: string) => fromJ(need(n), v3());
    const rst = (n: string) => R[n]!;
    const pelvis = cur('pelvis'), spine = cur('spine'), chest = cur('chest'), neck = cur('neck'), head = cur('head');
    const hipLat = norm(sub(cur('hipL'), cur('hipR'), v3()));
    const shLat = norm(sub(cur('shoulderL'), cur('shoulderR'), v3()));
    const Gd = m3();
    // ---- pelvis → world placement (delta from the legacy rest pelvis)
    this.delta(rst('pelvis'), rst('spine'), lat0, pelvis, spine, hipLat, Gd);
    m3Mul(Gd, Y180, this.Rw);
    this.root.set(pelvis);
    m3Identity(this.Rl.subarray(0, 9));
    this.propagate(J('Hip'));
    // ---- trunk (deltas; twist from the hip and shoulder lines)
    const midLat = norm(lerpV(hipLat, shLat, 0.5, v3()));
    this.delta(rst('spine'), rst('chest'), lat0, spine, chest, midLat, Gd);
    this.solveJoint(J('Spine01'), Gd);
    this.delta(rst('chest'), rst('neck'), lat0, chest, neck, shLat, Gd);
    this.solveJoint(J('Spine02'), Gd);
    const trunkFwd = norm(cross(shLat, norm(sub(neck, chest, t0)), v3()));
    // ---- arms: reference from two-bone IK on her shoulders, then joint-limited upper-body IK
    const elbowT: V[] = [], wristT: V[] = [];
    for (const [s, k] of [['L', 0], ['R', 1]] as const) {
      const side = s === 'L' ? 'left' : 'right';
      this.setAngle(`${side}Clavicle.protractionRetraction`, 0);
      this.setAngle(`${side}Clavicle.elevationDepression`, 0);
      const jc = J(`${s}_Clavicle`);
      this.body.composeLocal(jc, this.sem, this.hand, this.Rl.subarray(jc * 9, jc * 9 + 9));
      this.propagate(jc);
      this.propagate(J(`${s}_Upperarm`));
      const sh = this.world(J(`${s}_Upperarm`), v3());
      const wrist = cur(`wrist${s}`);
      const { mid: elbow, end: wristReach } = twoBone(sh, wrist, this.segLen[`${s}uarm`]!, this.segLen[`${s}farm`]!, sub(cur(`elbow${s}`), lerpV(sh, wrist, 0.5, t2), v3()));
      elbowT.push(cur(`elbow${s}`));
      wristT.push(wrist);
      const dUa = norm(sub(elbow, sh, v3()));
      const dFa = norm(sub(wristReach, elbow, v3()));
      const bendA = len(perp(dFa, dUa, t3));
      const armFallback = norm(perp(trunkFwd, dUa, v3()));
      const planeA = bendA > 1e-4 ? norm(perp(dFa, dUa, v3())) : armFallback;
      const hintUa = norm(lerpV(armFallback, planeA, smooth(0.08, 0.3, bendA), v3()));
      this.target(norm(sub(this.rest(`${s}_Forearm`), this.rest(`${s}_Upperarm`), t4)), this.elbowFlex[k], dUa, hintUa, Gd);
      this.solveJoint(J(`${s}_Upperarm`), Gd);
      this.setAngle(`${side}Elbow.flexionExtension`, (Math.acos(Math.max(-1, Math.min(1, dot(dUa, dFa)))) * 180) / Math.PI);
    }
    const t = this.ikTarget;
    t.set(wristT[0]!, 0); t.set(wristT[1]!, 3); t.set(elbowT[0]!, 6); t.set(elbowT[1]!, 9);
    this.solveUpperIk(5);
    // ---- neck and head on the final trunk
    const neckUp = norm(sub(head, neck, v3()));
    const lookDir = look ? norm(perp(Float64Array.from(look), neckUp, v3())) : norm(perp(trunkFwd, neckUp, v3()));
    const headLat = norm(cross(neckUp, lookDir, v3()));
    this.delta(rst('neck'), rst('head'), lat0, neck, head, lerpV(shLat, headLat, 0.4, t1), Gd);
    this.solveJoint(J('NeckTwist01'), Gd);
    this.delta(rst('neck'), rst('head'), fwd0, neck, head, lookDir, Gd);
    this.solveJoint(J('Head'), Gd);
    // ---- hands, legs, feet, fingers
    for (const [s, k] of [['L', 0], ['R', 1]] as const) {
      const side = s === 'L' ? 'left' : 'right';
      const elbowNow = this.world(J(`${s}_Forearm`), v3());
      const wristNow = this.world(J(`${s}_Hand`), v3());
      const shNow = this.world(J(`${s}_Upperarm`), v3());
      const dUa = norm(sub(elbowNow, shNow, v3()));
      const wrist = cur(`wrist${s}`);
      const dHand = norm(sub(cur(`hand${s}`), wrist, v3()));
      void wristNow;
      const restHand = norm(sub(this.rest(`${s}_Mid1`), this.rest(`${s}_Hand`), t4));
      const restThumb = norm(perp(sub(this.rest(`${s}_Thumb1`), this.rest(`${s}_Hand`), t5), restHand, v3()));
      const thumbUp = perp(Float64Array.of(-dUa[0]!, -dUa[1]!, -dUa[2]!), dHand, v3());
      const thumbFallback = norm(perp(trunkFwd, dHand, v3()));
      const tu = len(thumbUp);
      const thumbHint = norm(lerpV(thumbFallback, tu > 1e-6 ? norm(thumbUp) : thumbFallback, smooth(0.15, 0.45, tu), v3()));
      this.target(restHand, restThumb, dHand, thumbHint, Gd);
      this.solveJoint(J(`${s}_Hand`), Gd);
      // Leg: two-bone IK from her hip to the legacy ankle, pole at the legacy knee.
      this.propagate(J(`${s}_Thigh`));
      const hip = this.world(J(`${s}_Thigh`), v3());
      const ankle = cur(`ankle${s}`);
      const { mid: knee, end: ankleReach } = twoBone(hip, ankle, this.segLen[`${s}thigh`]!, this.segLen[`${s}shin`]!, sub(cur(`knee${s}`), lerpV(hip, ankle, 0.5, t2), v3()));
      const dTh = norm(sub(knee, hip, v3()));
      const dSh = norm(sub(ankleReach, knee, v3()));
      const bendL = len(perp(dSh, dTh, t3));
      const pelvisFwd = norm(cross(hipLat, norm(sub(spine, pelvis, t4)), v3()));
      const legFallback = norm(perp(Float64Array.of(-pelvisFwd[0]!, -pelvisFwd[1]!, -pelvisFwd[2]!), dTh, v3()));
      const planeL = bendL > 1e-4 ? norm(perp(dSh, dTh, v3())) : legFallback;
      const hintTh = norm(lerpV(legFallback, planeL, smooth(0.08, 0.3, bendL), v3()));
      this.target(norm(sub(this.rest(`${s}_Calf`), this.rest(`${s}_Thigh`), t4)), this.kneeFlex[k], dTh, hintTh, Gd);
      this.solveJoint(J(`${s}_Thigh`), Gd);
      this.setAngle(`${side}Knee.flexionExtension`, (Math.acos(Math.max(-1, Math.min(1, dot(dTh, dSh)))) * 180) / Math.PI);
      this.setAngle(`${side}Knee.axialRotation`, 0);
      const jcf = J(`${s}_Calf`);
      this.body.composeLocal(jcf, this.sem, this.hand, this.Rl.subarray(jcf * 9, jcf * 9 + 9));
      this.propagate(jcf);
      const dFoot = norm(sub(cur(`toe${s}`), ankle, v3()));
      const restFoot = norm(sub(this.rest(`${s}_ToeBase`), this.rest(`${s}_Foot`), t4));
      const restShin = norm(sub(this.rest(`${s}_Calf`), this.rest(`${s}_Foot`), t5));
      this.target(restFoot, restShin, dFoot, Float64Array.of(-dSh[0]!, -dSh[1]!, -dSh[2]!), Gd);
      this.solveJoint(J(`${s}_Foot`), Gd);
      this.applyGrip(s, grip[k]);
    }
    for (const j of this.body.order) {
      const name = this.asset.header.joints[j]!;
      if (/Index|Mid|Ring|Pinky|Thumb|ToeBase/.test(name)) {
        this.body.composeLocal(j, this.sem, this.hand, this.Rl.subarray(j * 9, j * 9 + 9));
      }
    }
    // World pose and physical forearm twist for the canonical drivers.
    this.body.forward(this.Rl, this.Rw, this.root, this.P, this.G);
    const pron = (id: string) => { const i = this.asset.header.semantic51.findIndex((d) => d.id === id); return i >= 0 ? this.sem[i]! : 0; };
    this.twist[0] = -pron('leftForearm.pronationSupination');
    this.twist[1] = pron('rightForearm.pronationSupination');
  }

  private gripIndex: Map<string, number> | null = null;

  private applyGrip(S: 'L' | 'R', g: GripState): void {
    const dofs = this.asset.header.handDofs;
    if (!this.gripIndex) this.gripIndex = new Map(dofs.map((d, i) => [d.id, i]));
    const idx = this.gripIndex;
    const set = (id: string, v: number) => {
      const i = idx.get(id); if (i === undefined) return;
      const d = dofs[i]!;
      this.hand[i] = Math.max(d.min, Math.min(d.max, v));
    };
    const c = Math.max(0, Math.min(1, g.curl));
    for (const F of ['Index', 'Mid', 'Ring', 'Pinky']) {
      const mcp = dofs[idx.get(`${S}_${F}1.flexionExtension`)!]!;
      const pip = dofs[idx.get(`${S}_${F}2.flexionExtension`)!]!;
      const dip = dofs[idx.get(`${S}_${F}3.flexionExtension`)!]!;
      const pipAngle = c * pip.comfortMax;
      set(`${S}_${F}1.flexionExtension`, c * mcp.comfortMax * 0.95);
      set(`${S}_${F}2.flexionExtension`, pipAngle);
      set(`${S}_${F}3.flexionExtension`, Math.min(dip.max, 0.67 * pipAngle));
      const w = ({ Index: 0.7, Mid: 0.05, Ring: 0.35, Pinky: 0.75 } as Record<string, number>)[F]!;
      const sp = dofs[idx.get(`${S}_${F}1.spread`)!];
      if (sp) set(`${S}_${F}1.spread`, (g.spread * w * sp.comfortMax) / 0.75);
    }
    const t = Math.max(0, Math.min(1, g.thumb));
    const opp = dofs[idx.get(`${S}_Thumb1.opposition`)!];
    const abd = dofs[idx.get(`${S}_Thumb1.abductionAdduction`)!];
    const f1 = dofs[idx.get(`${S}_Thumb1.flexionExtension`)!];
    const f2 = dofs[idx.get(`${S}_Thumb2.flexionExtension`)!];
    const f3 = dofs[idx.get(`${S}_Thumb3.flexionExtension`)!];
    if (opp) set(`${S}_Thumb1.opposition`, t * opp.comfortMax);
    if (abd) set(`${S}_Thumb1.abductionAdduction`, t * 0.5 * abd.comfortMax);
    if (f1) set(`${S}_Thumb1.flexionExtension`, c * 0.5 * f1.comfortMax);
    if (f2) set(`${S}_Thumb2.flexionExtension`, c * f2.comfortMax);
    if (f3) set(`${S}_Thumb3.flexionExtension`, c * f3.comfortMax);
  }
}

/** Cholesky solve of a small SPD system (row-major n×n). */
function choleskySolve(A: Float64Array, b: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * n + j]!;
      for (let k = 0; k < j; k++) s -= L[i * n + k]! * L[j * n + k]!;
      if (i === j) L[i * n + i] = Math.sqrt(Math.max(s, 1e-12));
      else L[i * n + j] = s / L[j * n + j]!;
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]!; for (let k = 0; k < i; k++) s -= L[i * n + k]! * y[k]!; y[i] = s / L[i * n + i]!; }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]!; for (let k = i + 1; k < n; k++) s -= L[k * n + i]! * x[k]!; x[i] = s / L[i * n + i]!; }
  return x;
}

function twoBone(root: V, target: V, l1: number, l2: number, pole: V): { mid: V; end: V } {
  const d = sub(target, root, v3());
  let dist = len(d);
  if (dist < 1e-6) { d[0] = 0; d[1] = -1; d[2] = 0; dist = 1e-6; }
  const dir = Float64Array.of(d[0]! / dist, d[1]! / dist, d[2]! / dist);
  const reach = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min((l1 + l2) * 0.9995, dist));
  const end = Float64Array.of(root[0]! + dir[0]! * reach, root[1]! + dir[1]! * reach, root[2]! + dir[2]! * reach);
  const a = (l1 * l1 + reach * reach - l2 * l2) / (2 * reach);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = perp(pole, dir, v3());
  if (len(p) < 1e-6) { p[0] = 0; p[1] = 0; p[2] = 1; perp(p, dir, p); }
  norm(p);
  const mid = Float64Array.of(root[0]! + dir[0]! * a + p[0]! * h, root[1]! + dir[1]! * a + p[1]! * h, root[2]! + dir[2]! * a + p[2]! * h);
  return { mid, end };
}
