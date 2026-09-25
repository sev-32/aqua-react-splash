// Physical body of a crew member who is off the boat (falling, swimming,
// hanging on the centreboard, holding a strap to be scooped).
//
// The swimmer is a point mass integrated inside the legacy XPBD sub-steps:
//   force hook  → buoyancy, drag, swim thrust (explicit; m = 75 kg is stiff-safe)
//   pre-solve   → symplectic prediction x += v·dt with gravity
//   constraints → tension-only grip ropes and hull/mast contact, solved with
//                 the XPBD body–particle formulation so reaction impulses act
//                 on the hull (a swimmer hanging on the board pulls it down;
//                 a scooped crew is dragged by the strap)
//   post-solve  → v = (x − x_prev)/dt
//
// Buoyancy uses a human volume distribution along the body axis: a
// cumulative-volume table from the crown to the feet, plus the buoyancy aid
// (ISO 12402-5, ~65 N) concentrated on the chest. The submerged fraction for
// the current COM depth is integrated over the vertical extent implied by the
// body orientation (upright treading ↔ prone swimming).

export interface Vec3 { x: number; y: number; z: number }

export interface WaterQuery {
  sample(x: number, y: number, z: number, out: { height: number; vx: number; vy: number; vz: number }): { height: number; vx: number; vy: number; vz: number };
}

const G = 9.81;
const RHO_WATER = 1025;
const RHO_AIR = 1.225;

// Cumulative body volume fraction measured from the crown (0) to the soles (1),
// normalised stature; a 50th-percentile adult mass distribution.
const VOLUME_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.0], [0.13, 0.055], [0.19, 0.085], [0.3, 0.29], [0.46, 0.55], [0.57, 0.71], [0.77, 0.87], [1.0, 1.0],
];
// COM position from the crown as a fraction of stature.
const COM_FROM_CROWN = 0.45;

function cumulativeVolume(s: number): number {
  if (s <= 0) return 0;
  if (s >= 1) return 1;
  for (let i = 1; i < VOLUME_PROFILE.length; i++) {
    const [s1, v1] = VOLUME_PROFILE[i]!;
    if (s <= s1) {
      const [s0, v0] = VOLUME_PROFILE[i - 1]!;
      return v0 + ((v1 - v0) * (s - s0)) / (s1 - s0);
    }
  }
  return 1;
}

export interface SwimmerSpec {
  massKg: number;
  statureM: number;
  bodyDensity: number;
  /** Buoyancy-aid buoyancy (N). */
  aidBuoyancyN: number;
  /** Mean swim thrust (N) and stroke frequency (Hz). */
  swimThrustN: number;
  strokeHz: number;
  /** Collision radius around the COM (m). */
  radiusM: number;
}

export const DEFAULT_SWIMMER: SwimmerSpec = {
  massKg: 75,
  statureM: 1.78,
  bodyDensity: 1012,
  aidBuoyancyN: 65,
  swimThrustN: 78,
  strokeHz: 1.05,
  radiusM: 0.2,
};

export class SwimmerBody {
  readonly x: Vec3 = { x: 0, y: 0, z: 0 };
  readonly p: Vec3 = { x: 0, y: 0, z: 0 };
  readonly v: Vec3 = { x: 0, y: 0, z: 0 };
  readonly f: Vec3 = { x: 0, y: 0, z: 0 };
  readonly spec: SwimmerSpec;
  /** 0 = prone (horizontal swimming), 1 = upright (treading / hanging). */
  verticality = 1;
  /** Unit horizontal swim direction and throttle 0..1. */
  readonly swimDir: Vec3 = { x: 0, y: 0, z: 1 };
  swimThrottle = 0;
  /** Extra upward treading support 0..1 (sculling + eggbeater kick). */
  treading = 0.5;
  strokePhase = 0;
  submerged01 = 0;
  depthM = 0;
  buoyancyN = 0;
  dragN = 0;
  /** Water surface height at the body, last sample. */
  surfaceY = 0;
  inWater = false;
  active = true;
  /**
   * Hand-over-hand hold on the hull (0..1): the swimmer's velocity is driven
   * towards the hull surface velocity plus `holdRelative`, i.e. they move
   * along the drifting boat instead of chasing it.
   */
  hold = 0;
  readonly holdAnchorVel: Vec3 = { x: 0, y: 0, z: 0 };
  readonly holdRelative: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly sample = { height: 0, vx: 0, vy: 0, vz: 0 };
  readonly waterVel: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(spec: Partial<SwimmerSpec> = {}) {
    this.spec = { ...DEFAULT_SWIMMER, ...spec };
  }

  get invMass(): number { return 1 / this.spec.massKg; }
  get volumeM3(): number { return this.spec.massKg / this.spec.bodyDensity + this.spec.aidBuoyancyN / (RHO_WATER * G); }

  place(position: Vec3, velocity: Vec3): void {
    this.x.x = position.x; this.x.y = position.y; this.x.z = position.z;
    this.p.x = position.x; this.p.y = position.y; this.p.z = position.z;
    this.v.x = velocity.x; this.v.y = velocity.y; this.v.z = velocity.z;
  }

  /**
   * Submerged volume fraction for a COM `depth` (m, positive below the
   * surface) and the current verticality.
   */
  submergedFraction(depth: number): number {
    const H = this.spec.statureM;
    // Vertical extent of the body: full stature upright, ~0.3 m prone.
    const extent = 0.3 + (H - 0.3) * this.verticality;
    const comFromTop = COM_FROM_CROWN * extent;
    // Fraction of the extent (from the top) that is above the water surface.
    const above = Math.max(0, Math.min(1, (comFromTop - depth) / extent));
    if (this.verticality > 0.35) return 1 - cumulativeVolume(above);
    const t = 1 - above;
    return t * t * (3 - 2 * t);
  }

  /** Force hook: buoyancy, drag and thrust for this sub-step. */
  computeForces(water: WaterQuery, dt: number): void {
    const s = water.sample(this.x.x, this.x.y, this.x.z, this.sample);
    this.surfaceY = s.height;
    this.waterVel.x = s.vx; this.waterVel.y = s.vy; this.waterVel.z = s.vz;
    this.depthM = s.height - this.x.y;
    const spec = this.spec;
    // Buoyancy aid volume is on the chest (above the COM when upright).
    const bodyVolume = spec.massKg / spec.bodyDensity;
    const aidVolume = spec.aidBuoyancyN / (RHO_WATER * G);
    const chestOffset = 0.22 * this.verticality;
    const bodyFrac = this.submergedFraction(this.depthM);
    const aidFrac = smoothstep(-0.12, 0.12, this.depthM - chestOffset);
    this.submerged01 = bodyFrac;
    this.inWater = bodyFrac > 0.02;
    this.buoyancyN = RHO_WATER * G * (bodyVolume * bodyFrac + aidVolume * aidFrac);
    let fx = 0, fy = this.buoyancyN, fz = 0;
    // Relative velocity through water/air.
    const rx = this.v.x - (this.inWater ? s.vx : 0);
    const ry = this.v.y - (this.inWater ? s.vy : 0);
    const rz = this.v.z - (this.inWater ? s.vz : 0);
    const horiz = Math.hypot(rx, rz);
    if (this.inWater) {
      // Frontal area: prone swimmer is streamlined horizontally; an upright
      // (treading) body presents its full height to horizontal flow.
      const aH = 0.14 + 0.36 * this.verticality;
      const aV = 0.42 - 0.18 * this.verticality;
      const cH = 0.5 * RHO_WATER * 1.0 * aH * bodyFrac;
      const cV = 0.5 * RHO_WATER * 1.1 * aV * bodyFrac;
      const lin = 28 * bodyFrac;
      // Implicit-equivalent clamp: never reverse the relative velocity in one sub-step.
      const m = spec.massKg;
      const kH = Math.min((lin + cH * horiz) , 0.9 * m / Math.max(dt, 1e-6));
      const kV = Math.min((lin + cV * Math.abs(ry)), 0.9 * m / Math.max(dt, 1e-6));
      fx -= kH * rx; fz -= kH * rz; fy -= kV * ry;
      this.dragN = Math.hypot(kH * horiz, kV * ry);
      // Swim thrust with stroke modulation (breaststroke pulses).
      if (this.swimThrottle > 0) {
        this.strokePhase += dt * spec.strokeHz * (0.6 + 0.4 * this.swimThrottle);
        const pulse = 1 + 0.75 * Math.sin(this.strokePhase * Math.PI * 2);
        const thrust = spec.swimThrustN * this.swimThrottle * pulse * Math.min(1, bodyFrac * 1.4);
        fx += this.swimDir.x * thrust;
        fz += this.swimDir.z * thrust;
      }
      if (this.hold > 0) {
        // Holding the hull: hands transmit up to ~350 N to track the boat.
        const k = 5 * this.hold * spec.massKg;
        const ex = this.holdAnchorVel.x + this.holdRelative.x - this.v.x;
        const ez = this.holdAnchorVel.z + this.holdRelative.z - this.v.z;
        const hx = Math.max(-350, Math.min(350, k * ex));
        const hz = Math.max(-350, Math.min(350, k * ez));
        fx += hx; fz += hz;
      }
      // Treading: sculling/eggbeater support keeps the head up and damps bobbing.
      if (this.treading > 0) {
        this.strokePhase += dt * 0.9 * (1 - this.swimThrottle);
        const support = this.treading * 38 * smoothstep(-0.25, 0.25, this.depthM + 0.15);
        fy += support - this.treading * 60 * ry * bodyFrac;
      }
    } else {
      const cA = 0.5 * RHO_AIR * 1.0 * 0.6;
      const speed = Math.hypot(rx, ry, rz);
      fx -= cA * speed * rx; fy -= cA * speed * ry; fz -= cA * speed * rz;
      this.dragN = cA * speed * speed;
    }
    this.f.x = fx; this.f.y = fy; this.f.z = fz;
  }

  /** Pre-solve: symplectic prediction. */
  predict(dt: number): void {
    const w = this.invMass;
    this.v.x += this.f.x * w * dt;
    this.v.y += (this.f.y * w - G) * dt;
    this.v.z += this.f.z * w * dt;
    const sp = Math.hypot(this.v.x, this.v.y, this.v.z);
    if (sp > 14) { const k = 14 / sp; this.v.x *= k; this.v.y *= k; this.v.z *= k; }
    this.p.x = this.x.x; this.p.y = this.x.y; this.p.z = this.x.z;
    this.x.x += this.v.x * dt; this.x.y += this.v.y * dt; this.x.z += this.v.z * dt;
  }

  /** Post-solve: velocity from the constrained displacement. */
  finish(dt: number): void {
    this.v.x = (this.x.x - this.p.x) / dt;
    this.v.y = (this.x.y - this.p.y) / dt;
    this.v.z = (this.x.z - this.p.z) / dt;
  }
}

/** Minimal shape of the legacy rigid body used by the constraints below. */
export interface XpbdBody {
  pos: Vec3;
  kinematic: boolean;
  localToWorld(local: Vec3, out: any): any;
  genInvMass(r: any, n: any): number;
  applyCorrection(correction: any, r: any): void;
}

/**
 * Tension-only rope from a swimmer to a hull point (body frame). Solved in the
 * legacy XPBD constraint loop; reaction corrections act on the hull.
 */
export class HullGripConstraint {
  enabled = true;
  lambda = 0;
  tension = 0;
  length: number;
  compliance: number;
  readonly local: Vec3;
  private readonly anchor: any;
  private readonly lever: any;
  private readonly normal: any;
  private readonly correction: any;

  constructor(readonly body: XpbdBody, readonly swimmer: SwimmerBody, local: Vec3, length: number, compliance: number, Vec3Ctor: any) {
    this.local = new Vec3Ctor(local.x, local.y, local.z);
    this.length = length;
    this.compliance = compliance;
    this.anchor = new Vec3Ctor();
    this.lever = new Vec3Ctor();
    this.normal = new Vec3Ctor();
    this.correction = new Vec3Ctor();
  }

  setLocal(local: Vec3): void { this.local.x = local.x; this.local.y = local.y; this.local.z = local.z; }

  solve(dt: number): void {
    if (!this.enabled || !this.swimmer.active) return;
    const body = this.body, s = this.swimmer;
    body.localToWorld(this.local, this.anchor);
    let dx = s.x.x - this.anchor.x, dy = s.x.y - this.anchor.y, dz = s.x.z - this.anchor.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1e-9) return;
    const C = dist - this.length;
    if (C <= 0) { this.tension = 0; return; }
    dx /= dist; dy /= dist; dz /= dist;
    this.normal.set(dx, dy, dz);
    this.lever.copy(this.anchor).sub(body.pos);
    const wb = body.kinematic ? 0 : body.genInvMass(this.lever, this.normal);
    const ws = s.invMass;
    const alpha = this.compliance / (dt * dt);
    let dLambda = (-C - alpha * this.lambda) / (ws + wb + alpha);
    const next = Math.min(0, this.lambda + dLambda);
    dLambda = next - this.lambda;
    this.lambda = next;
    this.tension = -this.lambda / (dt * dt);
    s.x.x += dx * dLambda * ws; s.x.y += dy * dLambda * ws; s.x.z += dz * dLambda * ws;
    if (!body.kinematic) {
      this.correction.set(-dx * dLambda, -dy * dLambda, -dz * dLambda);
      body.applyCorrection(this.correction, this.lever);
    }
  }
}

/**
 * Unilateral contact between the swimmer (sphere) and the hull, using the
 * analytic hull signed distance in the design frame.
 */
export class HullContactConstraint {
  enabled = true;
  lambda = 0;
  contactDepth = 0;
  /** Largest separation per sub-step (m): ≈ 5.8 m/s at 720 Hz. */
  maxPushPerSubstepM = 0.008;
  private readonly world: any;
  private readonly lever: any;
  private readonly normal: any;
  private readonly correction: any;

  constructor(
    readonly body: XpbdBody & { quat: any },
    readonly swimmer: SwimmerBody,
    readonly toDesign: (world: Vec3, out: Vec3) => Vec3,
    readonly designNormalToWorld: (n: Vec3, out: Vec3) => Vec3,
    readonly signedDistance: (x: number, y: number, z: number) => number,
    Vec3Ctor: any,
  ) {
    this.world = new Vec3Ctor();
    this.lever = new Vec3Ctor();
    this.normal = new Vec3Ctor();
    this.correction = new Vec3Ctor();
  }

  private readonly d: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly n: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly nw: Vec3 = { x: 0, y: 0, z: 0 };

  solve(): void {
    if (!this.enabled || !this.swimmer.active) return;
    const s = this.swimmer;
    const d = this.toDesign(s.x, this.d);
    const r = s.spec.radiusM;
    const sd = this.signedDistance(d.x, d.y, d.z);
    this.contactDepth = 0;
    if (sd >= r) return;
    // Numerical gradient of the SDF (design frame).
    const h = 0.012;
    const gx = this.signedDistance(d.x + h, d.y, d.z) - this.signedDistance(d.x - h, d.y, d.z);
    const gy = this.signedDistance(d.x, d.y + h, d.z) - this.signedDistance(d.x, d.y - h, d.z);
    const gz = this.signedDistance(d.x, d.y, d.z + h) - this.signedDistance(d.x, d.y, d.z - h);
    const gl = Math.hypot(gx, gy, gz);
    if (gl < 1e-9) return;
    this.n.x = gx / gl; this.n.y = gy / gl; this.n.z = gz / gl;
    const nw = this.designNormalToWorld(this.n, this.nw);
    // The world zeroes lambda every sub-step; it accumulates the correction so
    // a deep overlap (e.g. a crew member released inside the cockpit well)
    // resolves over several sub-steps instead of launching swimmer and hull.
    const penetration = Math.min(0.06, r - sd, Math.max(0, this.maxPushPerSubstepM - this.lambda));
    this.contactDepth = r - sd;
    if (penetration <= 0) return;
    this.lambda += penetration;
    this.normal.set(nw.x, nw.y, nw.z);
    this.world.set(s.x.x - nw.x * r, s.x.y - nw.y * r, s.x.z - nw.z * r);
    this.lever.copy(this.world).sub(this.body.pos);
    const wb = this.body.kinematic ? 0 : this.body.genInvMass(this.lever, this.normal);
    const ws = s.invMass;
    const dl = penetration / (ws + wb);
    s.x.x += nw.x * dl * ws; s.x.y += nw.y * dl * ws; s.x.z += nw.z * dl * ws;
    if (!this.body.kinematic) {
      this.correction.set(-nw.x * dl, -nw.y * dl, -nw.z * dl);
      this.body.applyCorrection(this.correction, this.lever);
    }
    // Contact friction: remove part of the tangential motion this sub-step.
    const vx = s.x.x - s.p.x, vy = s.x.y - s.p.y, vz = s.x.z - s.p.z;
    const vn = vx * nw.x + vy * nw.y + vz * nw.z;
    const tx = vx - vn * nw.x, ty = vy - vn * nw.y, tz = vz - vn * nw.z;
    const mu = 0.35;
    s.x.x -= tx * mu; s.x.y -= ty * mu; s.x.z -= tz * mu;
  }
}

/** Swimmer vs. spar (mast/boom) capsule contact on legacy XPBD particles. */
export class SparContactConstraint {
  enabled = true;
  lambda = 0;
  constructor(readonly swimmer: SwimmerBody, readonly nodes: Array<{ x: Vec3; w: number }>, readonly radiusM: number) {}

  solve(): void {
    if (!this.enabled || !this.swimmer.active) return;
    const s = this.swimmer;
    const reach = this.radiusM + s.spec.radiusM;
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i]!.x, b = this.nodes[i + 1]!.x;
      const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z;
      const len2 = ex * ex + ey * ey + ez * ez;
      if (len2 < 1e-10) continue;
      const t = Math.max(0, Math.min(1, ((s.x.x - a.x) * ex + (s.x.y - a.y) * ey + (s.x.z - a.z) * ez) / len2));
      const cx = a.x + ex * t, cy = a.y + ey * t, cz = a.z + ez * t;
      let nx = s.x.x - cx, ny = s.x.y - cy, nz = s.x.z - cz;
      const dist = Math.hypot(nx, ny, nz);
      if (dist >= reach || dist < 1e-9) continue;
      nx /= dist; ny /= dist; nz /= dist;
      const wa = this.nodes[i]!.w * (1 - t) * (1 - t), wb = this.nodes[i + 1]!.w * t * t;
      const ws = s.invMass;
      const denom = ws + wa + wb;
      if (denom <= 0) continue;
      const room = Math.max(0, 0.008 - this.lambda);
      if (room <= 0) return;
      const push = Math.min(0.05, reach - dist, room);
      this.lambda += push;
      const dl = push / denom;
      s.x.x += nx * dl * ws; s.x.y += ny * dl * ws; s.x.z += nz * dl * ws;
      a.x -= nx * dl * this.nodes[i]!.w * (1 - t); a.y -= ny * dl * this.nodes[i]!.w * (1 - t); a.z -= nz * dl * this.nodes[i]!.w * (1 - t);
      b.x -= nx * dl * this.nodes[i + 1]!.w * t; b.y -= ny * dl * this.nodes[i + 1]!.w * t; b.z -= nz * dl * this.nodes[i + 1]!.w * t;
    }
  }
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-9, b - a)));
  return t * t * (3 - 2 * t);
}
