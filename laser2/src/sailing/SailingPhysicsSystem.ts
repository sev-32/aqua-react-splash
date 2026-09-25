// Native hull dynamics authority for sailing mode.
//
// Replaces the legacy point-buoyancy hydro hook (master.hydro.hook, which the
// legacy force-hook arrow resolves at call time) with:
// - surface-integrated hydrostatics + pressure/suction drag, skin friction and
//   windage over the closed sealed-volume mesh (HullHydrostatics),
// - strip-theory centreboard and rudder (FoilModel),
// - empirical wave-making/residuary resistance for the upright hull,
// - a composite mass model: hull laminate (distributed over the real surface),
//   foils and whichever crew are currently carried by the hull. Gravity is
//   integrated at the body origin by the legacy integrator, so the torque of
//   every mass about that origin is added here (exact moment of gravity).
//
// Everything is attitude independent: the same code floats the boat upright,
// on its side with the rig in the water, and inverted.

import type { AppContext, AppSystem } from '../core/System.js';
import type { OceanSystem } from '../water/OceanSystem.js';
import { buildHullMesh, HULL_POINTS, type HullMesh } from './HullGeometry.js';
import { HullHydrostatics, emptyHydroResult, type HydroResult, type RigidPose, type AirSampler } from './HullHydrostatics.js';
import { FoilModel, type FoilPose, type BodyForceSink } from './FoilModel.js';

export interface Vec3Like { x: number; y: number; z: number }

export interface CrewMassEntry {
  id: string;
  massKg: number;
  /** Centre of mass in the design (boat group) frame. */
  comDesign: Vec3Like;
  /** Optional additional world force on the hull (e.g. crew buoyancy while partly immersed). */
  forceWorld?: Vec3Like;
  forcePointWorld?: Vec3Like;
}

export interface CrewMassProvider {
  /** Crew whose weight is currently carried by the hull (seated, hiking, on the board...). */
  hullCarriedCrew(): readonly CrewMassEntry[];
}

export type CapsizeState = 'upright' | 'knockdown' | 'capsized' | 'turtled';

export interface HullKinematics {
  heelDeg: number;
  /** Signed heel about the longitudinal axis, (-180, 180]. */
  heelSignedDeg: number;
  trimDeg: number;
  mastTipBelowWaterM: number;
  speedThroughWaterMs: number;
  leewayDeg: number;
}

export class SailingPhysicsSystem implements AppSystem {
  readonly id = 'sailing.physics';
  readonly phase = 'prePhysics' as const;
  enabled = true;
  readonly hullMassKg = 79;
  readonly boardMassKg = 4;
  readonly rudderMassKg = 2;
  mesh: HullMesh | null = null;
  hydro: HullHydrostatics | null = null;
  readonly board: FoilModel;
  readonly rudder: FoilModel;
  crewProvider: CrewMassProvider | null = null;
  /** Residuary resistance scale (legacy empirical hump model). */
  residuaryScale = 1;
  readonly last: HydroResult = emptyHydroResult();
  capsizeState: CapsizeState = 'upright';
  capsizeStateAgeS = 0;
  readonly kinematics: HullKinematics = { heelDeg: 0, heelSignedDeg: 0, trimDeg: 0, mastTipBelowWaterM: 0, speedThroughWaterMs: 0, leewayDeg: 0 };
  private context: AppContext | null = null;
  private installed = false;
  private originalHook: unknown = undefined;
  private originalInvMass = 1 / 235;
  private readonly originalInvI = { x: 0, y: 0, z: 0 };
  private refY = 0.3;
  private refZ = -0.15;
  private hullComBody = { x: 0, y: 0, z: 0 };
  private hullInertiaBody = { x: 0, y: 0, z: 0 };
  private readonly pose: RigidPose = { px: 0, py: 0, pz: 0, qx: 0, qy: 0, qz: 0, qw: 1, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 };
  private readonly foilPose: FoilPose = { px: 0, py: 0, pz: 0, r: new Float64Array(9), vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0, refY: 0.3, refZ: -0.15 };
  private readonly sampleOut = { height: 0, vx: 0, vy: 0, vz: 0 };
  private air: AirSampler | null = null;
  private sink: BodyForceSink | null = null;
  private tmpForce: any = null;
  private tmpPoint: any = null;
  private substeps = 0;
  private lastHookMs = 0;
  private meanHookMs = 0;
  private massKg = 235;
  private readonly cog = { x: 0, y: 0, z: 0 };
  private rightingMomentNm = 0;
  private rightingArmM = 0;

  constructor(readonly ocean: OceanSystem) {
    this.board = new FoilModel({ name: 'board', rootY: HULL_POINTS.boardRootY + 0.02, tipY: HULL_POINTS.boardTipY, z: HULL_POINTS.boardZ, chord: HULL_POINTS.boardChord, stallDeg: 14, cd0: 0.008, oswald: 0.82, cpAftM: 0, strips: 8 });
    this.rudder = new FoilModel({ name: 'rudder', rootY: -0.06, tipY: -0.79, z: HULL_POINTS.rudderZ, chord: 0.42, stallDeg: 16, cd0: 0.009, oswald: 0.8, cpAftM: 0.1, strips: 7 });
  }

  init(context: AppContext): void {
    this.context = context;
    const master = context.legacy.master;
    const reference = master.bodyReference;
    this.refY = reference?.y ?? 0.3;
    this.refZ = reference?.z ?? -0.15;
    this.foilPose.refY = this.refY;
    this.foilPose.refZ = this.refZ;
    const design = buildHullMesh();
    // Physics mesh in the rigid-body frame (design minus the body reference).
    const positions = new Float64Array(design.positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = design.positions[i]!;
      positions[i + 1] = design.positions[i + 1]! - this.refY;
      positions[i + 2] = design.positions[i + 2]! - this.refZ;
    }
    this.mesh = { ...design, positions };
    this.hydro = new HullHydrostatics(this.mesh);
    this.computeHullMassProperties();
    const Vec3 = master.body.pos.constructor;
    this.tmpForce = new Vec3();
    this.tmpPoint = new Vec3();
    const wind = master.wind;
    this.air = {
      velocity: (x: number, y: number, z: number, out: Vec3Like): Vec3Like => {
        this.tmpPoint.set(x, y, z);
        wind.velocityAt(this.tmpPoint, this.tmpForce);
        out.x = this.tmpForce.x; out.y = this.tmpForce.y; out.z = this.tmpForce.z;
        return out;
      },
    };
    const body = master.body;
    this.sink = {
      addForceAt: (fx, fy, fz, px, py, pz) => {
        this.tmpForce.set(fx, fy, fz);
        this.tmpPoint.set(px, py, pz);
        body.addForceAt(this.tmpForce, this.tmpPoint);
      },
    };
  }

  /** Distributes the hull laminate mass over the sealed-surface triangles. */
  private computeHullMassProperties(): void {
    const mesh = this.mesh!;
    const pos = mesh.positions, tri = mesh.triangles;
    let totalArea = 0, cx = 0, cy = 0, cz = 0;
    const areas: number[] = [];
    const centroids: number[] = [];
    for (let i = 0; i < tri.length; i += 3) {
      const a = tri[i]! * 3, b = tri[i + 1]! * 3, c = tri[i + 2]! * 3;
      const ux = pos[b]! - pos[a]!, uy = pos[b + 1]! - pos[a + 1]!, uz = pos[b + 2]! - pos[a + 2]!;
      const vx = pos[c]! - pos[a]!, vy = pos[c + 1]! - pos[a + 1]!, vz = pos[c + 2]! - pos[a + 2]!;
      const area = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      const gx = (pos[a]! + pos[b]! + pos[c]!) / 3, gy = (pos[a + 1]! + pos[b + 1]! + pos[c + 1]!) / 3, gz = (pos[a + 2]! + pos[b + 2]! + pos[c + 2]!) / 3;
      areas.push(area);
      centroids.push(gx, gy, gz);
      totalArea += area;
      cx += gx * area; cy += gy * area; cz += gz * area;
    }
    this.hullComBody = { x: cx / totalArea, y: cy / totalArea, z: cz / totalArea };
    let ixx = 0, iyy = 0, izz = 0;
    for (let k = 0; k < areas.length; k++) {
      const m = (this.hullMassKg * areas[k]!) / totalArea;
      const x = centroids[k * 3]!, y = centroids[k * 3 + 1]!, z = centroids[k * 3 + 2]!;
      ixx += m * (y * y + z * z);
      iyy += m * (x * x + z * z);
      izz += m * (x * x + y * y);
    }
    this.hullInertiaBody = { x: ixx, y: iyy, z: izz };
  }

  install(context: AppContext): void {
    if (this.installed) return;
    const master = context.legacy.master;
    const hydro = master.hydro;
    this.originalHook = Object.prototype.hasOwnProperty.call(hydro, 'hook') ? hydro.hook : undefined;
    this.originalInvMass = master.body.invMass;
    this.originalInvI.x = master.body.invI.x;
    this.originalInvI.y = master.body.invI.y;
    this.originalInvI.z = master.body.invI.z;
    hydro.hook = (dtSub: number): void => this.hook(dtSub);
    this.installed = true;
  }

  uninstall(context: AppContext): void {
    if (!this.installed) return;
    const master = context.legacy.master;
    if (this.originalHook === undefined) delete master.hydro.hook;
    else master.hydro.hook = this.originalHook;
    master.body.invMass = this.originalInvMass;
    master.body.invI.set(this.originalInvI.x, this.originalInvI.y, this.originalInvI.z);
    this.installed = false;
  }

  get isInstalled(): boolean { return this.installed; }

  /** Current composite mass (kg) carried by the rigid body. */
  get compositeMassKg(): number { return this.massKg; }

  private readPose(body: any): void {
    const p = this.pose;
    p.px = body.pos.x; p.py = body.pos.y; p.pz = body.pos.z;
    p.qx = body.quat.x; p.qy = body.quat.y; p.qz = body.quat.z; p.qw = body.quat.w;
    p.vx = body.vel.x; p.vy = body.vel.y; p.vz = body.vel.z;
    p.wx = body.omega.x; p.wy = body.omega.y; p.wz = body.omega.z;
    const { qx, qy, qz, qw } = p;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
    const r = this.foilPose.r;
    r[0] = 1 - 2 * (yy + zz); r[1] = 2 * (xy - wz); r[2] = 2 * (xz + wy);
    r[3] = 2 * (xy + wz); r[4] = 1 - 2 * (xx + zz); r[5] = 2 * (yz - wx);
    r[6] = 2 * (xz - wy); r[7] = 2 * (yz + wx); r[8] = 1 - 2 * (xx + yy);
    const f = this.foilPose;
    f.px = p.px; f.py = p.py; f.pz = p.pz; f.vx = p.vx; f.vy = p.vy; f.vz = p.vz; f.wx = p.wx; f.wy = p.wy; f.wz = p.wz;
  }

  /** Body-frame vector → world (rotation only). */
  private rotate(lx: number, ly: number, lz: number, out: Vec3Like): Vec3Like {
    const r = this.foilPose.r;
    out.x = r[0]! * lx + r[1]! * ly + r[2]! * lz;
    out.y = r[3]! * lx + r[4]! * ly + r[5]! * lz;
    out.z = r[6]! * lx + r[7]! * ly + r[8]! * lz;
    return out;
  }

  private readonly lever = { x: 0, y: 0, z: 0 };

  private hook(dtSub: number): void {
    if (!this.enabled || !this.hydro || !this.context) return;
    const started = performance.now();
    const master = this.context.legacy.master;
    const body = master.body;
    if (body.kinematic) return;
    this.readPose(body);
    const g = master.config?.env?.g ?? 9.81;

    // 1. Composite mass, inertia and the moment of gravity about the body origin.
    const crew = this.crewProvider?.hullCarriedCrew() ?? this.legacyCrew(master);
    let mass = this.hullMassKg + this.boardMassKg + this.rudderMassKg;
    let ixx = this.hullInertiaBody.x, iyy = this.hullInertiaBody.y, izz = this.hullInertiaBody.z;
    let mcx = this.hullMassKg * this.hullComBody.x, mcy = this.hullMassKg * this.hullComBody.y, mcz = this.hullMassKg * this.hullComBody.z;
    const addPoint = (m: number, x: number, y: number, z: number): void => {
      mass += 0; // (mass accumulated by caller)
      ixx += m * (y * y + z * z);
      iyy += m * (x * x + z * z);
      izz += m * (x * x + y * y);
      mcx += m * x; mcy += m * y; mcz += m * z;
    };
    const boardY = (HULL_POINTS.boardRootY + HULL_POINTS.boardTipY) * 0.5 - this.refY;
    addPoint(this.boardMassKg, 0, boardY, HULL_POINTS.boardZ - this.refZ);
    addPoint(this.rudderMassKg, 0, -0.35 - this.refY, HULL_POINTS.rudderZ - this.refZ);
    for (const entry of crew) {
      if (!(entry.massKg > 0) || !Number.isFinite(entry.comDesign.x + entry.comDesign.y + entry.comDesign.z)) continue;
      mass += entry.massKg;
      addPoint(entry.massKg, entry.comDesign.x, entry.comDesign.y - this.refY, entry.comDesign.z - this.refZ);
      if (entry.forceWorld && entry.forcePointWorld) {
        this.sink!.addForceAt(entry.forceWorld.x, entry.forceWorld.y, entry.forceWorld.z, entry.forcePointWorld.x, entry.forcePointWorld.y, entry.forcePointWorld.z);
      }
    }
    this.massKg = mass;
    body.invMass = 1 / mass;
    body.invI.set(1 / Math.max(40, ixx), 1 / Math.max(40, iyy), 1 / Math.max(15, izz));
    // Weight of every mass acts at its own position; the integrator applies the
    // total weight at the origin, so add r × W for the composite CoG.
    const cogBody = { x: mcx / mass, y: mcy / mass, z: mcz / mass };
    this.cog.x = cogBody.x; this.cog.y = cogBody.y; this.cog.z = cogBody.z;
    const lever = this.rotate(cogBody.x, cogBody.y, cogBody.z, this.lever);
    const W = mass * g;
    // τ = r × (0, -W, 0) = (r.z·W, 0, -r.x·W)
    body.torque.x += lever.z * W;
    body.torque.z += -lever.x * W;

    // 2. Hull surface loads.
    const hydro = this.hydro.compute(this.pose, this.ocean, this.air, this.last);
    this.tmpForce.set(hydro.fx, hydro.fy, hydro.fz);
    body.force.add(this.tmpForce);
    body.torque.x += hydro.tx; body.torque.y += hydro.ty; body.torque.z += hydro.tz;

    // 3. Foils.
    this.board.apply(this.foilPose, 0, this.ocean, this.air, this.sink!);
    this.rudder.apply(this.foilPose, master.hydro.rudderAngle || 0, this.ocean, this.air, this.sink!);

    // 4. Wave-making (residuary) resistance for a normally floating hull.
    const r = this.foilPose.r;
    const fwdX = r[2]!, fwdY = r[5]!, fwdZ = r[8]!;
    const upY = r[4]!;
    const s = this.ocean.sample(this.pose.px, this.pose.py - 0.25, this.pose.pz, this.sampleOut);
    const vrx = this.pose.vx - s.vx, vry = this.pose.vy - s.vy, vrz = this.pose.vz - s.vz;
    const u = vrx * fwdX + vry * fwdY + vrz * fwdZ;
    const cfg = master.config?.hydro;
    const upright = smoothstep(0.35, 0.8, upY);
    const immersion = Math.min(1.3, hydro.submergedVolume / Math.max(0.05, mass / 1025));
    if (Math.abs(u) > 0.05 && upright > 0 && cfg) {
      const c = Math.abs(u);
      const hump = Math.exp(-Math.pow((c - cfg.humpSpeed) / 0.55, 2));
      const plane = 1 / (1 + Math.exp(-(c - cfg.humpSpeed * 1.08) * 2.6));
      const residuary = cfg.residuaryK * c * c * (0.1 + hump * 0.55) * (1 - cfg.planingRelief * plane) * immersion * upright * this.residuaryScale;
      const sign = -Math.sign(u);
      this.sink!.addForceAt(fwdX * residuary * sign, fwdY * residuary * sign, fwdZ * residuary * sign, this.pose.px, this.pose.py - 0.12, this.pose.pz);
    }
    this.kinematics.speedThroughWaterMs = Math.abs(u);
    const rightX = r[0]!, rightY = r[3]!, rightZ = r[6]!;
    const side = vrx * rightX + vry * rightY + vrz * rightZ;
    this.kinematics.leewayDeg = (Math.atan2(side, Math.max(0.05, Math.abs(u))) * 180) / Math.PI;

    // Righting moment about the longitudinal axis (buoyancy vs weight), for telemetry.
    const cobRelX = hydro.cobX - this.pose.px, cobRelY = hydro.cobY - this.pose.py, cobRelZ = hydro.cobZ - this.pose.pz;
    const B = hydro.buoyancyN;
    const tbx = -cobRelZ * B, tbz = cobRelX * B; // r × (0,B,0)
    const twx = lever.z * W, twz = -lever.x * W;
    this.rightingMomentNm = (tbx + twx) * fwdX + (tbz + twz) * fwdZ;
    this.rightingArmM = this.rightingMomentNm / Math.max(1, W);
    void cobRelY;

    this.substeps++;
    this.lastHookMs = performance.now() - started;
    this.meanHookMs += (this.lastHookMs - this.meanHookMs) / Math.min(this.substeps, 240);
    void dtSub;
  }

  private legacyCrewEntries: CrewMassEntry[] = [
    { id: 'helm', massKg: 75, comDesign: { x: 0, y: 0.74, z: -1.05 } },
    { id: 'crew', massKg: 75, comDesign: { x: 0, y: 0.74, z: -0.15 } },
  ];

  /** Fallback when no crew system is attached: legacy articulated crew COMs. */
  private legacyCrew(master: any): readonly CrewMassEntry[] {
    const helm = master.helm?.articulatedComLocal, crew = master.crew?.articulatedComLocal;
    const [h, c] = this.legacyCrewEntries;
    if (helm && master.helm.comValid) { h!.comDesign.x = helm.x; h!.comDesign.y = helm.y; h!.comDesign.z = helm.z; }
    if (crew && master.crew.comValid) { c!.comDesign.x = crew.x; c!.comDesign.y = crew.y; c!.comDesign.z = crew.z; }
    return this.legacyCrewEntries;
  }

  update(dtSeconds: number, context: AppContext): void {
    const master = context.legacy.master;
    const body = master.body;
    const q = body.quat;
    // Body axes (world) from the quaternion.
    const upX = 2 * (q.x * q.y - q.w * q.z), upY = 1 - 2 * (q.x * q.x + q.z * q.z), upZ = 2 * (q.y * q.z + q.w * q.x);
    const rightY = 2 * (q.x * q.y + q.w * q.z);
    const fwdY = 2 * (q.y * q.z - q.w * q.x);
    void upX; void upZ;
    const heel = (Math.acos(Math.max(-1, Math.min(1, upY))) * 180) / Math.PI;
    this.kinematics.heelDeg = heel;
    this.kinematics.heelSignedDeg = (Math.atan2(-rightY, upY) * 180) / Math.PI;
    this.kinematics.trimDeg = (Math.asin(Math.max(-1, Math.min(1, fwdY))) * 180) / Math.PI;
    const tip = master.rig?.mast?.[master.rig.mast.length - 1]?.x;
    this.kinematics.mastTipBelowWaterM = tip ? this.ocean.height(tip.x, tip.z) - tip.y : 0;
    const previous = this.capsizeState;
    let next: CapsizeState = previous;
    // Hysteresis: escalate at higher heel than de-escalate.
    switch (previous) {
      case 'upright':
        if (heel > 145) next = 'turtled'; else if (heel > 80) next = 'capsized'; else if (heel > 55) next = 'knockdown';
        break;
      case 'knockdown':
        if (heel > 145) next = 'turtled'; else if (heel > 80) next = 'capsized'; else if (heel < 45) next = 'upright';
        break;
      case 'capsized':
        if (heel > 145) next = 'turtled'; else if (heel < 45) next = 'upright'; else if (heel < 65) next = 'knockdown';
        break;
      case 'turtled':
        if (heel < 45) next = 'upright'; else if (heel < 130) next = 'capsized';
        break;
    }
    this.capsizeState = next;
    this.capsizeStateAgeS = next === previous ? this.capsizeStateAgeS + dtSeconds : 0;
  }

  telemetry(): Record<string, unknown> {
    const h = this.last;
    return {
      installed: this.installed,
      capsizeState: this.capsizeState,
      capsizeStateAgeS: this.capsizeStateAgeS,
      kinematics: { ...this.kinematics },
      compositeMassKg: this.massKg,
      compositeCogBody: { ...this.cog },
      hullComBody: this.hullComBody,
      hullInertiaBody: this.hullInertiaBody,
      mesh: this.mesh ? { vertices: this.mesh.positions.length / 3, triangles: this.mesh.triangles.length / 3, sealedVolumeM3: this.mesh.volume } : null,
      hydro: {
        buoyancyN: h.buoyancyN, submergedVolumeM3: h.submergedVolume, cob: [h.cobX, h.cobY, h.cobZ],
        wettedAreaM2: h.wettedArea, pressureDragN: h.pressureDragN, frictionN: h.frictionN, windageN: h.windageN,
        wetTriangles: h.wetTriangles, clippedTriangles: h.clippedTriangles,
      },
      rightingMomentNm: this.rightingMomentNm,
      rightingArmM: this.rightingArmM,
      board: { ...this.board.state, deployment: this.board.deployment },
      rudder: { ...this.rudder.state },
      hookCpuMs: { last: this.lastHookMs, mean: this.meanHookMs },
      substeps: this.substeps,
      authority: 'closed-mesh surface integration (hydrostatics, pressure/suction drag, ITTC friction, windage) + strip foils + empirical residuary; composite hull/foil/crew mass',
    };
  }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-9, b - a)));
  return t * t * (3 - 2 * t);
}
