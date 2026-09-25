// Procedural full-body poses for crew states the legacy biomechanics layer
// never had: falling, swimming, treading water, hanging on the centreboard,
// standing on the board and leaning back, climbing over the gunwale and
// floating in the cockpit to be scooped.
//
// Poses are built in world space from a torso frame plus limb end-effector
// targets (two-bone IK with pole vectors), then converted into the boat-group
// (design) frame and written through the legacy ProceduralHuman.applyPose, so
// the skinned mesh, VRM retargeting and shadows keep working unchanged.

export interface V3 { x: number; y: number; z: number }

export const JOINTS = ['pelvis', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'wristL', 'handL', 'shoulderR', 'elbowR', 'wristR', 'handR', 'hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR'] as const;
export type JointName = typeof JOINTS[number];
export type Skeleton = Record<JointName, V3>;

export interface BodyDims {
  torso: number;
  neck: number;
  shoulderX: number;
  shoulderY: number;
  hipX: number;
  upperArm: number;
  foreArm: number;
  hand: number;
  thigh: number;
  shin: number;
  ankleH: number;
  footLen: number;
  headR: number;
}

export interface TorsoFrame {
  pelvis: V3;
  /** Unit axis from pelvis to chest. */
  up: V3;
  /** Unit direction the chest faces (orthogonalised against up). */
  forward: V3;
  /** Unit direction the head looks. */
  look: V3;
}

export interface LimbTargets {
  handL: V3;
  handR: V3;
  footL: V3;
  footR: V3;
  /** Pole directions (where elbows/knees point). */
  elbowPoleL: V3;
  elbowPoleR: V3;
  kneePoleL: V3;
  kneePoleR: V3;
  /** Foot pointing direction (toe). */
  toeDirL: V3;
  toeDirR: V3;
}

export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z });
export const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const madd = (a: V3, b: V3, s: number): V3 => ({ x: a.x + b.x * s, y: a.y + b.y * s, z: a.z + b.z * s });
export const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export const length = (a: V3): number => Math.sqrt(dot(a, a));
export const normalize = (a: V3, fallback: V3 = { x: 0, y: 1, z: 0 }): V3 => {
  const l = length(a);
  return l > 1e-9 ? scale(a, 1 / l) : { ...fallback };
};
export const lerp3 = (a: V3, b: V3, t: number): V3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
export const rotateAbout = (v: V3, axis: V3, angle: number): V3 => {
  const k = normalize(axis);
  const c = Math.cos(angle), s = Math.sin(angle);
  const kv = cross(k, v);
  const kd = dot(k, v);
  return { x: v.x * c + kv.x * s + k.x * kd * (1 - c), y: v.y * c + kv.y * s + k.y * kd * (1 - c), z: v.z * c + kv.z * s + k.z * kd * (1 - c) };
};
export const smooth = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

export function dimsFromLegacy(actor: any): BodyDims {
  const L = actor.L ?? {};
  const P = actor.human?.P ?? {};
  const H = actor.human?.H ?? 1.76;
  return {
    torso: L.torso ?? 0.19 * H,
    neck: L.neck ?? 0.108 * H,
    shoulderX: L.shX ?? 0.1 * H,
    shoulderY: L.shY ?? 0.09 * H,
    hipX: L.hipX ?? 0.064 * H,
    upperArm: L.uarm ?? 0.172 * H,
    foreArm: L.farm ?? 0.152 * H,
    hand: L.hand ?? 0.098 * H,
    thigh: L.thigh ?? 0.238 * H,
    shin: L.shin ?? 0.24 * H,
    ankleH: L.ankleH ?? 0.036 * H,
    footLen: P.footLen ?? 0.14 * H,
    headR: P.headR ?? 0.052 * H,
  };
}

/** Two-bone IK: returns the middle joint; `end` is clamped to reachable range. */
export function solveTwoBone(root: V3, target: V3, l1: number, l2: number, pole: V3): { mid: V3; end: V3 } {
  let d = sub(target, root);
  let dist = length(d);
  const maxReach = (l1 + l2) * 0.999;
  const minReach = Math.abs(l1 - l2) + 1e-3;
  if (dist < 1e-6) { d = { x: 0, y: -1, z: 0 }; dist = 1e-6; }
  const dir = scale(d, 1 / dist);
  const reach = Math.max(minReach, Math.min(maxReach, dist));
  const end = madd(root, dir, reach);
  const a = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
  const along = l1 * Math.max(-1, Math.min(1, a));
  const perp = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  let bend = sub(pole, scale(dir, dot(pole, dir)));
  if (length(bend) < 1e-6) bend = cross(dir, Math.abs(dir.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 });
  bend = normalize(bend);
  return { mid: add(madd(root, dir, along), scale(bend, perp)), end };
}

export function buildSkeleton(frame: TorsoFrame, limbs: LimbTargets, dims: BodyDims): Skeleton {
  const up = normalize(frame.up);
  const forward = normalize(sub(frame.forward, scale(up, dot(frame.forward, up))), { x: 0, y: 0, z: 1 });
  // Character left = up × forward (legacy rest frame: +X left, +Y up, +Z forward).
  const left = normalize(cross(up, forward));
  const pelvis = frame.pelvis;
  const spine = madd(pelvis, up, dims.torso * 0.42);
  const chest = madd(pelvis, up, dims.torso);
  const lookDir = normalize(frame.look, forward);
  const neckDir = normalize(add(scale(up, 0.85), scale(lookDir, 0.25)));
  const neck = madd(chest, neckDir, dims.neck * 0.9);
  const head = madd(neck, normalize(add(scale(neckDir, 0.8), scale(lookDir, 0.2))), 0.115 * (dims.torso / 0.334));
  const shoulderL = madd(madd(chest, left, dims.shoulderX), up, dims.shoulderY * 0.5);
  const shoulderR = madd(madd(chest, left, -dims.shoulderX), up, dims.shoulderY * 0.5);
  const hipL = madd(madd(pelvis, left, dims.hipX), up, -0.02);
  const hipR = madd(madd(pelvis, left, -dims.hipX), up, -0.02);
  const armL = solveTwoBone(shoulderL, limbs.handL, dims.upperArm, dims.foreArm + dims.hand * 0.45, limbs.elbowPoleL);
  const armR = solveTwoBone(shoulderR, limbs.handR, dims.upperArm, dims.foreArm + dims.hand * 0.45, limbs.elbowPoleR);
  const wristL = madd(armL.end, normalize(sub(armL.end, armL.mid)), -dims.hand * 0.5);
  const wristR = madd(armR.end, normalize(sub(armR.end, armR.mid)), -dims.hand * 0.5);
  const handL = madd(wristL, normalize(sub(armL.end, armL.mid)), dims.hand * 0.55);
  const handR = madd(wristR, normalize(sub(armR.end, armR.mid)), dims.hand * 0.55);
  const ankleTargetL = madd(limbs.footL, up, dims.ankleH);
  const ankleTargetR = madd(limbs.footR, up, dims.ankleH);
  const legL = solveTwoBone(hipL, ankleTargetL, dims.thigh, dims.shin, limbs.kneePoleL);
  const legR = solveTwoBone(hipR, ankleTargetR, dims.thigh, dims.shin, limbs.kneePoleR);
  const toeL = madd(legL.end, normalize(limbs.toeDirL), dims.footLen * 0.95);
  const toeR = madd(legR.end, normalize(limbs.toeDirR), dims.footLen * 0.95);
  return {
    pelvis, spine, chest, neck, head,
    shoulderL, elbowL: armL.mid, wristL, handL,
    shoulderR, elbowR: armR.mid, wristR, handR,
    hipL, kneeL: legL.mid, ankleL: legL.end, toeL,
    hipR, kneeR: legR.mid, ankleR: legR.end, toeR,
  };
}

/** Mass-weighted COM of a skeleton (segment fractions from the legacy biomech model). */
export function skeletonCom(s: Skeleton): V3 {
  let x = 0, y = 0, z = 0, w = 0;
  const point = (p: V3, m: number): void => { x += p.x * m; y += p.y * m; z += p.z * m; w += m; };
  const seg = (a: V3, b: V3, m: number): void => point(lerp3(a, b, 0.5), m);
  point(s.pelvis, 0.16); point(s.spine, 0.08); point(s.chest, 0.18); point(s.head, 0.08);
  seg(s.hipL, s.kneeL, 0.1); seg(s.hipR, s.kneeR, 0.1); seg(s.kneeL, s.ankleL, 0.06); seg(s.kneeR, s.ankleR, 0.06);
  seg(s.shoulderL, s.elbowL, 0.035); seg(s.shoulderR, s.elbowR, 0.035); seg(s.elbowL, s.wristL, 0.025); seg(s.elbowR, s.wristR, 0.025);
  point(s.handL, 0.01); point(s.handR, 0.01); seg(s.ankleL, s.toeL, 0.02); seg(s.ankleR, s.toeR, 0.02);
  return { x: x / w, y: y / w, z: z / w };
}

// ---------------------------------------------------------------------------
// Pose library. All inputs/outputs in world space; `t` is time (s).
// ---------------------------------------------------------------------------

export interface SwimPoseInput {
  com: V3;
  heading: V3; // horizontal swim direction
  surfaceY: number;
  t: number;
  /** 0 prone breaststroke … 1 upright treading. */
  verticality: number;
  /** Stroke phase (cycles). */
  phase: number;
  dims: BodyDims;
}

/** Breaststroke blended with treading water by verticality. */
export function swimPose(input: SwimPoseInput): { frame: TorsoFrame; limbs: LimbTargets } {
  const d = input.dims;
  const worldUp = v3(0, 1, 0);
  const heading = normalize(v3(input.heading.x, 0, input.heading.z), v3(0, 0, 1));
  const side = normalize(cross(worldUp, heading)); // character left when facing heading
  const vert = Math.max(0, Math.min(1, input.verticality));
  const ph = input.phase * Math.PI * 2;
  // Torso axis: prone (along heading, slightly raised) ↔ upright.
  const proneAxis = normalize(add(heading, v3(0, 0.32, 0)));
  const up = normalize(lerp3(proneAxis, worldUp, vert));
  const forward = normalize(lerp3(v3(0, -1, 0.001), heading, vert));
  const pelvis = madd(input.com, up, -d.torso * 0.35);
  const look = normalize(add(heading, v3(0, 0.15 - 0.1 * vert, 0)));
  const chest = madd(pelvis, up, d.torso);
  // Arms: breaststroke sweep (prone) / sculling (upright).
  const sweep = 0.5 + 0.5 * Math.sin(ph);
  const reachFwd = (d.upperArm + d.foreArm) * (0.25 + 0.6 * sweep);
  const spread = (d.upperArm + d.foreArm) * (0.2 + 0.55 * (1 - sweep));
  const armBase = madd(chest, heading, 0.05);
  const proneHandL = madd(madd(madd(armBase, heading, reachFwd), side, spread), worldUp, -0.12);
  const proneHandR = madd(madd(madd(armBase, heading, reachFwd), side, -spread), worldUp, -0.12);
  const scull = Math.sin(ph * 1.6) * 0.18;
  const treadHandL = madd(madd(madd(chest, side, 0.42), heading, 0.18 + scull), worldUp, -0.28);
  const treadHandR = madd(madd(madd(chest, side, -0.42), heading, 0.18 - scull), worldUp, -0.28);
  const handL = lerp3(proneHandL, treadHandL, vert);
  const handR = lerp3(proneHandR, treadHandR, vert);
  // Legs: frog kick (prone) / eggbeater (upright).
  const kick = 0.5 + 0.5 * Math.sin(ph + Math.PI * 0.6);
  const legLen = d.thigh + d.shin;
  const hipBack = madd(pelvis, heading, -legLen * (0.55 + 0.4 * kick) * (1 - vert));
  const proneFootL = madd(madd(hipBack, side, 0.12 + 0.28 * (1 - kick)), worldUp, -0.12);
  const proneFootR = madd(madd(hipBack, side, -0.12 - 0.28 * (1 - kick)), worldUp, -0.12);
  const egg = Math.sin(ph * 1.4);
  const treadFootL = madd(madd(madd(pelvis, worldUp, -legLen * 0.78), side, 0.22), heading, 0.12 * egg);
  const treadFootR = madd(madd(madd(pelvis, worldUp, -legLen * 0.8), side, -0.22), heading, -0.12 * egg);
  return {
    frame: { pelvis, up, forward, look },
    limbs: {
      handL, handR,
      footL: lerp3(proneFootL, treadFootL, vert),
      footR: lerp3(proneFootR, treadFootR, vert),
      elbowPoleL: normalize(add(scale(side, 1), scale(worldUp, -0.6))),
      elbowPoleR: normalize(add(scale(side, -1), scale(worldUp, -0.6))),
      kneePoleL: normalize(lerp3(add(scale(side, 0.8), scale(worldUp, -0.5)), heading, vert)),
      kneePoleR: normalize(lerp3(add(scale(side, -0.8), scale(worldUp, -0.5)), heading, vert)),
      toeDirL: normalize(lerp3(scale(heading, -1), heading, vert)),
      toeDirR: normalize(lerp3(scale(heading, -1), heading, vert)),
    },
  };
}

export interface FallPoseInput {
  com: V3;
  velocity: V3;
  /** Horizontal direction away from the boat. */
  away: V3;
  t: number;
  dims: BodyDims;
}

/** Tumbling fall: body tilting backwards away from the boat, arms reaching. */
export function fallPose(input: FallPoseInput): { frame: TorsoFrame; limbs: LimbTargets } {
  const d = input.dims;
  const worldUp = v3(0, 1, 0);
  const away = normalize(v3(input.away.x, 0, input.away.z), v3(1, 0, 0));
  const tilt = Math.min(1.1, input.t * 1.6);
  const up = normalize(add(scale(worldUp, Math.cos(tilt)), scale(away, Math.sin(tilt))));
  const forward = normalize(scale(away, -1));
  const side = normalize(cross(up, forward));
  const pelvis = madd(input.com, up, -d.torso * 0.35);
  const chest = madd(pelvis, up, d.torso);
  const flail = Math.sin(input.t * 9) * 0.12;
  return {
    frame: { pelvis, up, forward, look: normalize(add(forward, v3(0, 0.4, 0))) },
    limbs: {
      handL: madd(madd(madd(chest, side, 0.45), up, 0.35 + flail), forward, 0.25),
      handR: madd(madd(madd(chest, side, -0.45), up, 0.35 - flail), forward, 0.25),
      footL: madd(madd(madd(pelvis, up, -(d.thigh + d.shin) * 0.85), side, 0.15), forward, 0.3),
      footR: madd(madd(madd(pelvis, up, -(d.thigh + d.shin) * 0.7), side, -0.18), forward, 0.45),
      elbowPoleL: normalize(add(side, scale(up, -0.3))), elbowPoleR: normalize(add(scale(side, -1), scale(up, -0.3))),
      kneePoleL: forward, kneePoleR: forward, toeDirL: forward, toeDirR: forward,
    },
  };
}

export interface HangPoseInput {
  /** Grip point (world) — both hands. */
  grip: V3;
  com: V3;
  /** Horizontal direction from the swimmer towards the hull. */
  towardHull: V3;
  t: number;
  /** 0 hanging at arm's length … 1 chest pulled up to the grip. */
  pull: number;
  dims: BodyDims;
}

/** Hanging from the centreboard tip (or gunwale), body in the water. */
export function hangPose(input: HangPoseInput): { frame: TorsoFrame; limbs: LimbTargets } {
  const d = input.dims;
  const worldUp = v3(0, 1, 0);
  const toward = normalize(v3(input.towardHull.x, 0, input.towardHull.z), v3(0, 0, 1));
  const side = normalize(cross(worldUp, toward));
  const up = normalize(add(worldUp, scale(toward, 0.25 + 0.25 * input.pull)));
  const pelvis = madd(input.com, up, -d.torso * 0.35);
  const bob = Math.sin(input.t * 2.1) * 0.03;
  return {
    frame: { pelvis, up, forward: toward, look: normalize(add(toward, v3(0, 0.35, 0))) },
    limbs: {
      handL: madd(madd(input.grip, side, 0.09), worldUp, bob),
      handR: madd(madd(input.grip, side, -0.09), worldUp, bob),
      footL: madd(madd(madd(pelvis, worldUp, -(d.thigh + d.shin) * 0.92), side, 0.14), toward, 0.1 + 0.2 * input.pull),
      footR: madd(madd(madd(pelvis, worldUp, -(d.thigh + d.shin) * 0.88), side, -0.14), toward, -0.05 + 0.25 * input.pull),
      elbowPoleL: normalize(add(scale(toward, -1), side)), elbowPoleR: normalize(add(scale(toward, -1), scale(side, -1))),
      kneePoleL: toward, kneePoleR: toward, toeDirL: scale(toward, -1), toeDirR: scale(toward, -1),
    },
  };
}

export interface BoardStandPoseInput {
  /** Feet placement on the board near the hull (world). */
  feet: V3;
  /** Hand grip (gunwale lip / jib sheet) (world). */
  grip: V3;
  /** Unit vector along the board, pointing away from the hull. */
  boardOut: V3;
  /** Lean-back angle (rad) from vertical, away from the hull. */
  lean: number;
  /** 0 kneeling on the board → 1 standing. */
  stand: number;
  /** Horizontal-ish axis along the hull (character stands side-on to it). */
  hullAxis: V3;
  t: number;
  dims: BodyDims;
}

/**
 * Standing (or kneeling) on the centreboard, facing the hull, leaning back on
 * straight arms. Returns the pose; the COM follows from the skeleton.
 */
export function boardStandPose(input: BoardStandPoseInput): { frame: TorsoFrame; limbs: LimbTargets } {
  const d = input.dims;
  const worldUp = v3(0, 1, 0);
  // Facing the hull: opposite to the board-out direction, projected horizontal-ish.
  const out = normalize(input.boardOut);
  const towardHull = normalize(scale(out, -1));
  const axis = normalize(input.hullAxis);
  // Body axis leans back (away from the hull) about the hull axis.
  const baseUp = normalize(sub(worldUp, scale(axis, dot(worldUp, axis))), worldUp);
  // Lean back in the section plane: tilt the body axis from vertical towards
  // the board-out direction (away from the hull).
  const outInPlane = normalize(sub(out, scale(axis, dot(out, axis))), out);
  const up = normalize(add(scale(baseUp, Math.cos(input.lean)), scale(outInPlane, Math.sin(input.lean))));
  const legLen = (d.thigh + d.shin) * (0.55 + 0.4 * input.stand);
  const pelvis = madd(madd(input.feet, up, legLen), towardHull, -0.05 * input.stand);
  const side = normalize(cross(up, towardHull));
  const forward = towardHull;
  return {
    frame: { pelvis, up, forward, look: normalize(add(towardHull, v3(0, 0.25, 0))) },
    limbs: {
      handL: madd(input.grip, axis, 0.12),
      handR: madd(input.grip, axis, -0.12),
      footL: madd(input.feet, side, 0.13),
      footR: madd(input.feet, side, -0.13),
      elbowPoleL: normalize(add(scale(worldUp, -1), side)), elbowPoleR: normalize(add(scale(worldUp, -1), scale(side, -1))),
      kneePoleL: normalize(add(towardHull, scale(worldUp, 0.3))), kneePoleR: normalize(add(towardHull, scale(worldUp, 0.3))),
      toeDirL: towardHull, toeDirR: towardHull,
    },
  };
}

export interface ClimbInPoseInput {
  /** Gunwale grip (world). */
  gunwale: V3;
  /** Target seated point inside the cockpit (world). */
  seat: V3;
  /** Horizontal direction from outside the hull towards the cockpit. */
  inward: V3;
  /** 0 hanging outside … 1 inside. */
  progress: number;
  surfaceY: number;
  t: number;
  dims: BodyDims;
}

/** Hauling over the gunwale: chest over the side deck, leg swung in, roll in. */
export function climbInPose(input: ClimbInPoseInput): { frame: TorsoFrame; limbs: LimbTargets; com: V3 } {
  const d = input.dims;
  const worldUp = v3(0, 1, 0);
  const inward = normalize(v3(input.inward.x, 0, input.inward.z), v3(1, 0, 0));
  const side = normalize(cross(worldUp, inward));
  const p = smooth(input.progress);
  // COM path: below/outside the gunwale → over the deck edge → seat.
  const outside = madd(madd(input.gunwale, inward, -0.35), worldUp, -0.55);
  const over = madd(madd(input.gunwale, inward, 0.1), worldUp, 0.12);
  const com = p < 0.55 ? lerp3(outside, over, smooth(p / 0.55)) : lerp3(over, madd(input.seat, worldUp, 0.1), smooth((p - 0.55) / 0.45));
  // Torso: vertical outside, draped over the deck mid-way, sitting at the end.
  const drape = Math.sin(Math.PI * Math.min(1, p * 1.2));
  const up = normalize(add(scale(worldUp, 1 - 0.8 * drape), scale(inward, 0.9 * drape)));
  const forward = normalize(add(inward, scale(worldUp, -0.5 * drape)));
  const pelvis = madd(com, up, -d.torso * 0.35);
  const legSwing = smooth((p - 0.35) / 0.4);
  return {
    com,
    frame: { pelvis, up, forward, look: normalize(add(inward, v3(0, -0.1, 0))) },
    limbs: {
      handL: lerp3(madd(input.gunwale, side, 0.25), madd(input.seat, side, 0.3), smooth((p - 0.6) / 0.4)),
      handR: lerp3(madd(input.gunwale, side, -0.25), madd(madd(input.seat, side, -0.1), inward, 0.3), smooth((p - 0.5) / 0.5)),
      footL: lerp3(madd(pelvis, worldUp, -(d.thigh + d.shin) * 0.9), madd(madd(input.gunwale, inward, 0.25), worldUp, 0.05), legSwing),
      footR: lerp3(madd(madd(pelvis, worldUp, -(d.thigh + d.shin) * 0.85), inward, -0.1), madd(madd(input.seat, inward, 0.3), worldUp, -0.2), smooth((p - 0.6) / 0.4)),
      elbowPoleL: normalize(add(scale(inward, -1), side)), elbowPoleR: normalize(add(scale(inward, -1), scale(side, -1))),
      kneePoleL: normalize(add(inward, worldUp)), kneePoleR: normalize(add(inward, worldUp)),
      toeDirL: inward, toeDirR: inward,
    },
  };
}

export interface ScoopPoseInput {
  strap: V3;
  com: V3;
  /** Direction along the hull towards the bow (crew floats facing forward). */
  bow: V3;
  t: number;
  dims: BodyDims;
}

/** Floating on the back/side inside the flooded cockpit, one hand on the toe strap. */
export function scoopFloatPose(input: ScoopPoseInput): { frame: TorsoFrame; limbs: LimbTargets } {
  const d = input.dims;
  const worldUp = v3(0, 1, 0);
  const bow = normalize(v3(input.bow.x, 0, input.bow.z), v3(0, 0, 1));
  const side = normalize(cross(worldUp, bow));
  const up = normalize(add(scale(bow, 0.75), scale(worldUp, 0.65)));
  const forward = normalize(add(worldUp, scale(bow, -0.3)));
  const pelvis = madd(input.com, up, -d.torso * 0.35);
  const bob = Math.sin(input.t * 1.7) * 0.05;
  return {
    frame: { pelvis, up, forward, look: normalize(add(bow, v3(0, 0.25, 0))) },
    limbs: {
      handL: madd(input.strap, worldUp, bob),
      handR: madd(madd(madd(pelvis, side, -0.35), worldUp, -0.05), bow, 0.2 + bob),
      footL: madd(madd(pelvis, bow, -(d.thigh + d.shin) * 0.9), side, 0.15),
      footR: madd(madd(pelvis, bow, -(d.thigh + d.shin) * 0.85), side, -0.15),
      elbowPoleL: normalize(add(side, scale(worldUp, -0.5))), elbowPoleR: normalize(add(scale(side, -1), scale(worldUp, -0.5))),
      kneePoleL: worldUp, kneePoleR: worldUp, toeDirL: scale(bow, -1), toeDirR: scale(bow, -1),
    },
  };
}
