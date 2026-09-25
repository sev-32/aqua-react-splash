// Crew authority for sailing mode: active balance while sailing, falling out
// in a capsize, swimming, righting the boat from the centreboard (including
// turtle recovery from the upturned hull), the scoop method for the second
// crew, and climbing back aboard.
//
// Physics coupling:
// - Aboard / attached crew are carried by the hull: their mass, inertia and
//   weight moment enter the composite rigid body through CrewMassProvider
//   (and their buoyancy when partly immersed, e.g. climbing out of the water).
//   A righter standing on the board and leaning back therefore produces the
//   exact righting moment of their weight at that lever.
// - Overboard crew are SwimmerBody point masses integrated in the XPBD
//   sub-steps with tension-only grip ropes (board tip, toe strap, gunwale)
//   and hull/spar contact, so hanging on the board or being dragged aboard by
//   the strap is resolved by the solver, not scripted.
//
// Legacy integration: each legacy crew actor's update() is wrapped. While a
// crew member is seated/hiking the legacy biomechanics still produce the pose
// (with the balance controller's hike command, including new inboard and
// leeward seating via a wrapped seatAnchor); in every other state the legacy
// update is skipped and CrewPoseSynth drives the same skinned ProceduralHuman.

import type { AppContext, AppSystem } from '../core/System.js';
import type { SailingAuthority } from '../sailing/SailingModeSystem.js';
import type { CrewMassEntry, CrewMassProvider, SailingPhysicsSystem } from '../sailing/SailingPhysicsSystem.js';
import type { OceanSystem } from '../water/OceanSystem.js';
import type { PhysicsStepBus } from '../sailing/PhysicsStepBus.js';
import { SwimmerBody, HullGripConstraint, HullContactConstraint, SparContactConstraint } from './SwimmerBody.js';
import { hullSignedDistance, HULL_POINTS, sheerY, sheerHalfBreadth, uOfZ, COCKPIT_SOLE_Y } from '../sailing/HullGeometry.js';
import * as P from './CrewPoseSynth.js';
import { three } from '../three/ThreeRuntime.js';

type V3 = P.V3;

export type CrewMode = 'aboard' | 'overboard' | 'attached';
export type CrewTask =
  | 'sailing' | 'bracing' | 'falling' | 'treading'
  | 'swimToBoard' | 'hangBoard' | 'climbBoard' | 'standBoard'
  | 'swimToHull' | 'climbHull' | 'standHull'
  | 'swimToCockpit' | 'holdStrap' | 'scooped'
  | 'swimToGunwale' | 'holdGunwale' | 'climbIn';
export type CrewRole = 'righter' | 'scoop';

const OVERBOARD_TASKS: ReadonlySet<CrewTask> = new Set(['falling', 'treading', 'swimToBoard', 'hangBoard', 'swimToHull', 'swimToCockpit', 'holdStrap', 'swimToGunwale', 'holdGunwale']);
const ATTACHED_TASKS: ReadonlySet<CrewTask> = new Set(['climbBoard', 'standBoard', 'climbHull', 'standHull', 'climbIn']);

interface HullFrame {
  r: Float64Array; // body→world rotation (row-major)
  pos: V3;
  refY: number;
  refZ: number;
  up: V3; // design +Y in world (mast direction)
  fwd: V3; // design +Z in world
  right: V3; // design +X in world
  heelDeg: number;
  worldUpInDesign: V3;
  center: V3; // hull centre (world)
  vel: V3;
  omega: V3;
}

class CrewAgent {
  mode: CrewMode = 'aboard';
  task: CrewTask = 'sailing';
  taskTime = 0;
  role: CrewRole;
  readonly swimmer: SwimmerBody;
  grip!: HullGripConstraint;
  contact!: HullContactConstraint;
  mastContact!: SparContactConstraint;
  boomContact!: SparContactConstraint;
  readonly comDesign: V3 = { x: 0, y: 0.74, z: 0 };
  hikeCommand = 0.2;
  hikeSaturatedS = 0;
  hikeSlackS = 0;
  lastPhiAway = 0;
  lean = 0;
  progress = 0;
  attachStartDesign: V3 = { x: 0, y: 0, z: 0 };
  holdSide = 1; // design x sign of the gunwale/strap used
  heading: V3 = { x: 1, y: 0, z: 0 };
  waypoint = 0;
  wetness = 0;
  poseTime = 0;
  blendFrom: P.Skeleton | null = null;
  blendT = 1;
  lastSkeleton: P.Skeleton | null = null;
  readonly dims: P.BodyDims;
  forceWorld: V3 = { x: 0, y: 0, z: 0 };
  forcePoint: V3 = { x: 0, y: 0, z: 0 };
  carriedBuoyancyN = 0;
  events: string[] = [];

  constructor(readonly id: 'helm' | 'crew', readonly actor: any, role: CrewRole) {
    this.role = role;
    const height = actor.human?.H ?? 1.76;
    this.swimmer = new SwimmerBody({ massKg: 75, statureM: height });
    this.swimmer.active = false;
    this.dims = P.dimsFromLegacy(actor);
  }

  setTask(task: CrewTask, note = ''): void {
    if (task === this.task) return;
    this.events.push(`${this.task}→${task}${note ? ` (${note})` : ''}`);
    if (this.events.length > 24) this.events.shift();
    this.task = task;
    this.taskTime = 0;
    this.waypoint = 0;
    this.mode = OVERBOARD_TASKS.has(task) ? 'overboard' : ATTACHED_TASKS.has(task) ? 'attached' : 'aboard';
    this.swimmer.active = this.mode === 'overboard';
  }
}

export class CrewRecoverySystem implements AppSystem, SailingAuthority, CrewMassProvider {
  readonly id = 'crew.recovery';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  /** Crew perform the full capsize recovery automatically. */
  autoRecovery = true;
  /** Crew actively balance the boat (hiking, inboard/leeward seating). */
  balanceAssist = true;
  /** Crew uses the trapeze when fully hiked in a breeze. */
  trapezeAssist = true;
  /** Ease sheets while capsized so the boat does not sail off on righting. */
  releaseSheetsWhenCapsized = true;
  /** Maximum lean-back angle on the board (rad); U key raises it. */
  maxLeanRad = 1.0;
  heaveBoost = 0;
  /** Remaining seconds of a forced knockdown gust (O key / API). */
  private knockdownS = 0;
  private knockdownSide = 1;
  readonly agents: CrewAgent[] = [];
  private context: AppContext | null = null;
  private installed = false;
  private readonly removers: Array<() => void> = [];
  private readonly originals = new Map<any, { update: any; seatAnchor: any; hadUpdate: boolean; hadSeat: boolean }>();
  private tmp: any = {};
  private savedTrim: { mainScope: number; jibScope: number } | null = null;
  private restoreTrimS = 0;
  private recoveryCount = 0;
  private capsizeCount = 0;
  private capsizeActive = false;
  private capsizeStartTime = 0;
  private lastRecoveryDurationS = 0;
  private simTime = 0;
  private readonly frame: HullFrame = {
    r: new Float64Array(9), pos: P.v3(), refY: 0.3, refZ: -0.15, up: P.v3(0, 1, 0), fwd: P.v3(0, 0, 1), right: P.v3(1, 0, 0),
    heelDeg: 0, worldUpInDesign: P.v3(0, 1, 0), center: P.v3(), vel: P.v3(), omega: P.v3(),
  };
  private readonly carried: CrewMassEntry[] = [];

  constructor(readonly ocean: OceanSystem, readonly physics: SailingPhysicsSystem, readonly bus: PhysicsStepBus) {}

  init(context: AppContext): void {
    this.context = context;
    const master = context.legacy.master;
    if (master.helm) this.agents.push(new CrewAgent('helm', master.helm, 'righter'));
    if (master.crew) this.agents.push(new CrewAgent('crew', master.crew, 'scoop'));
    const T = three();
    this.tmp = { a: new T.Vector3(), b: new T.Vector3(), q: new T.Quaternion() };
    for (const agent of this.agents) {
      const body = master.body;
      const toDesign = (w: V3, out: V3): V3 => this.worldToDesign(w, out);
      const nToWorld = (n: V3, out: V3): V3 => this.rotateToWorld(n, out);
      agent.grip = new HullGripConstraint(body, agent.swimmer, { x: 0, y: 0, z: 0 }, 0.8, 2e-6, T.Vector3);
      agent.grip.enabled = false;
      agent.contact = new HullContactConstraint(body, agent.swimmer, toDesign, nToWorld, hullSignedDistance, T.Vector3);
      agent.mastContact = new SparContactConstraint(agent.swimmer, master.rig?.mast ?? [], 0.035);
      agent.boomContact = new SparContactConstraint(agent.swimmer, master.rig?.boom ?? [], 0.045);
    }
  }

  // --------------------------------------------------------------------------
  // SailingAuthority
  // --------------------------------------------------------------------------

  install(context: AppContext): void {
    if (this.installed) return;
    const master = context.legacy.master;
    const world = master.physics;
    this.physics.crewProvider = this;
    for (const agent of this.agents) this.wrapActor(agent);
    const forceHook = (dt: number): void => {
      for (const a of this.agents) if (a.swimmer.active) a.swimmer.computeForces(this.ocean, dt);
      if (this.knockdownS > 0) {
        // Knockdown gust: heeling torque about the hull's longitudinal axis,
        // lifting the crew's side (a classic leeward capsize).
        const f = this.frame;
        // Gust heeling moment falls off as the sail approaches the water.
        const heelRad = Math.acos(Math.max(-1, Math.min(1, f.up.y)));
        const spill = heelRad < 1.3 ? Math.cos(heelRad) ** 2 : 0;
        const torque = 2600 * this.knockdownSide * spill;
        master.body.torque.x += f.fwd.x * torque;
        master.body.torque.y += f.fwd.y * torque;
        master.body.torque.z += f.fwd.z * torque;
      }
    };
    const predict = (dt: number): void => { for (const a of this.agents) if (a.swimmer.active) a.swimmer.predict(dt); };
    const finish = (dt: number): void => { for (const a of this.agents) if (a.swimmer.active) a.swimmer.finish(dt); };
    world.forceHooks.push(forceHook);
    world.preSolveHooks.push(predict);
    world.postHooks.push(finish);
    const constraints: any[] = [];
    for (const agent of this.agents) constraints.push(agent.grip, agent.contact, agent.mastContact, agent.boomContact);
    for (const c of constraints) world.constraints.push(c);
    this.removers.push(() => {
      const remove = (list: any[], item: any): void => { const i = list.indexOf(item); if (i >= 0) list.splice(i, 1); };
      remove(world.forceHooks, forceHook);
      remove(world.preSolveHooks, predict);
      remove(world.postHooks, finish);
      for (const c of constraints) remove(world.constraints, c);
    });
    this.removers.push(this.bus.onBefore((dt, _substeps, time) => this.beforeStep(dt, time)));
    const onKey = (event: KeyboardEvent, down: boolean): void => {
      const target = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (target && ['input', 'select', 'textarea'].includes(target)) return;
      if (event.code === 'KeyU') this.heaveBoost = down ? 1 : 0;
      if (!down || event.repeat) return;
      if (event.code === 'KeyO') this.forceCapsize();
      if (event.code === 'KeyI') this.autoRecovery = !this.autoRecovery;
    };
    const keydown = (event: KeyboardEvent): void => onKey(event, true);
    const keyup = (event: KeyboardEvent): void => onKey(event, false);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    this.removers.push(() => { window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); });
    this.removers.push(this.bus.onAfter((dt) => this.afterStep(dt)));
    this.resetAgents(context);
    this.installed = true;
  }

  uninstall(context: AppContext): void {
    if (!this.installed) return;
    for (const remove of this.removers.splice(0)) remove();
    for (const agent of this.agents) this.unwrapActor(agent);
    this.resetAgents(context);
    if (this.physics.crewProvider === this) this.physics.crewProvider = null;
    this.installed = false;
  }

  onSailingReset(context: AppContext): void {
    this.resetAgents(context);
  }

  private resetAgents(context: AppContext): void {
    for (const agent of this.agents) {
      agent.setTask('sailing', 'reset');
      agent.mode = 'aboard';
      agent.swimmer.active = false;
      agent.grip.enabled = false;
      agent.lean = 0;
      agent.progress = 0;
      agent.blendFrom = null;
      agent.hikeCommand = 0.2;
      agent.wetness = 0;
      this.applyWetness(agent);
    }
    const input = context.legacy.master.input?.state;
    if (this.savedTrim && input) {
      input.mainScope = this.savedTrim.mainScope;
      input.jibScope = this.savedTrim.jibScope;
    }
    this.savedTrim = null;
    this.capsizeActive = false;
  }

  // --------------------------------------------------------------------------
  // CrewMassProvider
  // --------------------------------------------------------------------------

  hullCarriedCrew(): readonly CrewMassEntry[] {
    this.carried.length = 0;
    for (const agent of this.agents) {
      if (agent.mode === 'overboard') continue;
      const entry: CrewMassEntry = { id: agent.id, massKg: agent.swimmer.spec.massKg, comDesign: agent.comDesign };
      if (agent.carriedBuoyancyN > 1) {
        entry.forceWorld = agent.forceWorld;
        entry.forcePointWorld = agent.forcePoint;
      }
      this.carried.push(entry);
    }
    return this.carried;
  }

  // --------------------------------------------------------------------------
  // Legacy actor wrapping
  // --------------------------------------------------------------------------

  private wrapActor(agent: CrewAgent): void {
    const actor = agent.actor;
    if (this.originals.has(actor)) return;
    const record = {
      update: actor.update,
      seatAnchor: actor.seatAnchor,
      hadUpdate: Object.prototype.hasOwnProperty.call(actor, 'update'),
      hadSeat: Object.prototype.hasOwnProperty.call(actor, 'seatAnchor'),
    };
    this.originals.set(actor, record);
    const originalUpdate = record.update.bind(actor);
    const originalSeat = record.seatAnchor.bind(actor);
    actor.update = (e: any): void => {
      if (agent.mode !== 'aboard' || (agent.task !== 'sailing' && agent.task !== 'bracing')) return;
      const hike = this.balanceAssist ? agent.hikeCommand : e.hike;
      originalUpdate({ ...e, hike, capsized: false, trapeze: e.trapeze && agent.task === 'sailing' });
      const com = actor.articulatedComLocal;
      if (actor.comValid && com) { agent.comDesign.x = com.x; agent.comDesign.y = com.y; agent.comDesign.z = com.z; }
    };
    // Negative hike beyond the legacy range moves the sailor inboard onto the
    // centreline and then onto the leeward side deck (light air / runs).
    actor.seatAnchor = (side: number, hike: number, aft: number): any => {
      if (hike >= -0.35) return originalSeat(side, hike, aft);
      const inboard = originalSeat(side, -0.35, aft);
      const contact = actor.seatContactPoint?.clone?.();
      const t = Math.min(1, (-0.35 - hike) / 0.65);
      const centre = inboard.clone();
      centre.x = inboard.x * 0.18;
      centre.y = COCKPIT_SOLE_Y + 0.2;
      let result = inboard.clone().lerp(centre, P.smooth(t));
      if (hike < -1) {
        const leeward = originalSeat(-side, -0.35, aft);
        result = centre.clone().lerp(leeward, P.smooth(Math.min(1, (-1 - hike) / 0.6)));
      }
      if (contact && actor.seatContactPoint) actor.seatContactPoint.set(result.x, result.y - 0.105, result.z);
      return result;
    };
  }

  private unwrapActor(agent: CrewAgent): void {
    const actor = agent.actor;
    const record = this.originals.get(actor);
    if (!record) return;
    if (record.hadUpdate) actor.update = record.update; else delete actor.update;
    if (record.hadSeat) actor.seatAnchor = record.seatAnchor; else delete actor.seatAnchor;
    this.originals.delete(actor);
    actor.human.group.visible = true;
  }

  // --------------------------------------------------------------------------
  // Frames and conversions
  // --------------------------------------------------------------------------

  private updateFrame(): HullFrame {
    const master = this.context!.legacy.master;
    const body = master.body;
    const f = this.frame;
    const q = body.quat;
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const r = f.r;
    r[0] = 1 - 2 * (y * y + z * z); r[1] = 2 * (x * y - w * z); r[2] = 2 * (x * z + w * y);
    r[3] = 2 * (x * y + w * z); r[4] = 1 - 2 * (x * x + z * z); r[5] = 2 * (y * z - w * x);
    r[6] = 2 * (x * z - w * y); r[7] = 2 * (y * z + w * x); r[8] = 1 - 2 * (x * x + y * y);
    f.pos.x = body.pos.x; f.pos.y = body.pos.y; f.pos.z = body.pos.z;
    const ref = master.bodyReference;
    f.refY = ref?.y ?? 0.3; f.refZ = ref?.z ?? -0.15;
    f.right = { x: r[0]!, y: r[3]!, z: r[6]! };
    f.up = { x: r[1]!, y: r[4]!, z: r[7]! };
    f.fwd = { x: r[2]!, y: r[5]!, z: r[8]! };
    f.worldUpInDesign = { x: r[3]!, y: r[4]!, z: r[5]! };
    f.heelDeg = (Math.acos(Math.max(-1, Math.min(1, f.up.y))) * 180) / Math.PI;
    f.center = this.designToWorld({ x: 0, y: 0.12, z: -0.2 }, P.v3());
    f.vel = { x: body.vel.x, y: body.vel.y, z: body.vel.z };
    f.omega = { x: body.omega.x, y: body.omega.y, z: body.omega.z };
    return f;
  }

  designToWorld(d: V3, out: V3): V3 {
    const f = this.frame, r = f.r;
    const lx = d.x, ly = d.y - f.refY, lz = d.z - f.refZ;
    out.x = f.pos.x + r[0]! * lx + r[1]! * ly + r[2]! * lz;
    out.y = f.pos.y + r[3]! * lx + r[4]! * ly + r[5]! * lz;
    out.z = f.pos.z + r[6]! * lx + r[7]! * ly + r[8]! * lz;
    return out;
  }

  worldToDesign(w: V3, out: V3): V3 {
    const f = this.frame, r = f.r;
    const dx = w.x - f.pos.x, dy = w.y - f.pos.y, dz = w.z - f.pos.z;
    out.x = r[0]! * dx + r[3]! * dy + r[6]! * dz;
    out.y = r[1]! * dx + r[4]! * dy + r[7]! * dz + f.refY;
    out.z = r[2]! * dx + r[5]! * dy + r[8]! * dz + f.refZ;
    return out;
  }

  private rotateToWorld(n: V3, out: V3): V3 {
    const r = this.frame.r;
    out.x = r[0]! * n.x + r[1]! * n.y + r[2]! * n.z;
    out.y = r[3]! * n.x + r[4]! * n.y + r[5]! * n.z;
    out.z = r[6]! * n.x + r[7]! * n.y + r[8]! * n.z;
    return out;
  }

  private rotateToDesign(w: V3, out: V3): V3 {
    const r = this.frame.r;
    out.x = r[0]! * w.x + r[3]! * w.y + r[6]! * w.z;
    out.y = r[1]! * w.x + r[4]! * w.y + r[7]! * w.z;
    out.z = r[2]! * w.x + r[5]! * w.y + r[8]! * w.z;
    return out;
  }

  private pointVelocity(world: V3): V3 {
    const f = this.frame;
    const rx = world.x - f.pos.x, ry = world.y - f.pos.y, rz = world.z - f.pos.z;
    return { x: f.vel.x + f.omega.y * rz - f.omega.z * ry, y: f.vel.y + f.omega.z * rx - f.omega.x * rz, z: f.vel.z + f.omega.x * ry - f.omega.y * rx };
  }

  /** Body-frame (rigid body local) point from a design point. */
  private designToBody(d: V3): V3 {
    return { x: d.x, y: d.y - this.frame.refY, z: d.z - this.frame.refZ };
  }

  private surfaceAt(p: V3): number { return this.ocean.height(p.x, p.z); }

  // Key hull points (design frame).
  private boardTipDesign(): V3 { return { x: 0, y: HULL_POINTS.boardTipY + 0.06, z: HULL_POINTS.boardZ }; }
  private boardRootDesign(): V3 { return { x: 0, y: HULL_POINTS.boardRootY - 0.08, z: HULL_POINTS.boardZ }; }
  private gunwaleDesign(side: number, z = -0.75): V3 { return { x: side * sheerHalfBreadth(uOfZ(z)) * 0.98, y: sheerY(uOfZ(z)) + 0.02, z }; }
  private strapDesign(side: number): V3 { return { x: side * HULL_POINTS.toeStrapX, y: HULL_POINTS.toeStrapY, z: -0.62 }; }

  // --------------------------------------------------------------------------
  // Step logic
  // --------------------------------------------------------------------------

  private beforeStep(dt: number, time: number): void {
    if (!this.context || !this.enabled) return;
    this.simTime = time;
    const context = this.context;
    const master = context.legacy.master;
    const frame = this.updateFrame();
    const capsizedNow = frame.heelDeg > 80;
    if (capsizedNow && !this.capsizeActive) {
      this.capsizeActive = true;
      this.capsizeCount++;
      this.capsizeStartTime = time;
      context.events.emit('sailing:capsize', { state: frame.heelDeg > 140 ? 'turtled' : 'capsized', heelDeg: frame.heelDeg });
    }
    this.manageSheets(master, frame, dt);
    if (this.knockdownS > 0) this.knockdownS = Math.max(0, this.knockdownS - dt);
    for (const agent of this.agents) {
      agent.taskTime += dt;
      this.stepAgent(agent, frame, dt);
    }
    if (this.capsizeActive && this.agents.every((a) => a.mode === 'aboard' && a.task === 'sailing') && frame.heelDeg < 30) {
      this.capsizeActive = false;
      this.recoveryCount++;
      this.lastRecoveryDurationS = time - this.capsizeStartTime;
    }
  }

  private phiAway(agent: CrewAgent, frame: HullFrame): number {
    // Positive when the agent's side (design x sign = −side) is up.
    const sigma = -Math.sign(agent.actor.side || -1);
    return (Math.asin(Math.max(-1, Math.min(1, frame.right.y * sigma))) * 180) / Math.PI;
  }

  private stepAgent(agent: CrewAgent, frame: HullFrame, dt: number): void {
    const other = this.agents.find((a) => a !== agent) ?? null;
    const heel = frame.heelDeg;
    const s = agent.swimmer;
    if (!['swimToBoard', 'swimToHull', 'swimToCockpit', 'swimToGunwale', 'treading'].includes(agent.task)) s.hold = 0;
    switch (agent.task) {
      case 'sailing': {
        const phi = this.phiAway(agent, frame);
        if (this.knockdownS > 0) agent.hikeCommand = Math.min(agent.hikeCommand, 0.1); // caught out by the gust
        else this.balance(agent, phi, dt);
        if (phi > 58 || phi < -42 || heel > 70) agent.setTask('bracing', `heel ${heel.toFixed(0)}°`);
        break;
      }
      case 'bracing': {
        const phi = this.phiAway(agent, frame);
        agent.hikeCommand = phi > 0 ? 1 : -1.6;
        const comWorld = this.designToWorld(agent.comDesign, P.v3());
        const dunked = comWorld.y < this.surfaceAt(comWorld) + 0.05;
        if (phi > 82 || phi < -65 || heel > 100 || (dunked && heel > 45)) this.fall(agent, frame, phi);
        else if (heel < 42) agent.setTask('sailing', 'recovered from knockdown');
        break;
      }
      case 'falling':
        s.treading = 0.2;
        s.swimThrottle = 0;
        s.verticality = Math.min(1, s.verticality + dt * 1.5);
        if (s.inWater && agent.taskTime > 0.7) agent.setTask('treading');
        break;
      case 'treading':
        this.tread(agent, dt);
        if (this.autoRecovery && agent.taskTime > (agent.role === 'righter' ? 0.9 : 1.3)) this.chooseRecoveryTask(agent, frame, other);
        break;
      case 'swimToBoard':
        this.swimToBoard(agent, frame, dt);
        break;
      case 'hangBoard': {
        const grip = agent.grip;
        s.verticality = Math.min(1, s.verticality + dt * 2);
        s.swimThrottle = 0;
        s.treading = 0.6;
        grip.length = Math.max(0.72, grip.length - dt * 0.12);
        if (heel < 48) { this.releaseGrip(agent); agent.setTask('swimToGunwale', 'boat came up'); break; }
        if (heel > 140) { this.releaseGrip(agent); agent.setTask('swimToHull', 'turtled'); break; }
        if (agent.taskTime > 1.1) this.attach(agent, 'climbBoard');
        break;
      }
      case 'climbBoard':
      case 'standBoard':
        this.onBoard(agent, frame, dt);
        break;
      case 'swimToHull':
        this.swimToHull(agent, frame, dt);
        break;
      case 'climbHull':
      case 'standHull':
        this.onUpturnedHull(agent, frame, dt);
        break;
      case 'swimToCockpit':
        this.swimToCockpit(agent, frame, dt);
        break;
      case 'holdStrap':
        this.holdStrap(agent, frame, dt);
        break;
      case 'scooped':
        this.scooped(agent, frame, dt, other);
        break;
      case 'swimToGunwale':
        this.swimToGunwale(agent, frame, dt);
        break;
      case 'holdGunwale':
        this.holdGunwale(agent, frame, dt, other);
        break;
      case 'climbIn':
        this.climbIn(agent, frame, dt, other);
        break;
    }
    // Carried crew partly in the water get buoyancy on the hull.
    agent.carriedBuoyancyN = 0;
    if (agent.mode === 'attached') {
      const com = this.designToWorld(agent.comDesign, P.v3());
      const depth = this.surfaceAt(com) - com.y;
      const saved = s.verticality;
      s.verticality = 1;
      const frac = s.submergedFraction(depth);
      s.verticality = saved;
      const buoyancy = 1025 * 9.81 * s.volumeM3 * frac;
      if (buoyancy > 1) {
        agent.carriedBuoyancyN = buoyancy;
        agent.forceWorld.x = 0; agent.forceWorld.y = buoyancy; agent.forceWorld.z = 0;
        agent.forcePoint.x = com.x; agent.forcePoint.y = com.y; agent.forcePoint.z = com.z;
      }
    }
    if (s.active && s.inWater) agent.wetness = 1;
    else agent.wetness *= Math.exp(-dt / 240);
  }

  /** Aboard balance: hike command from heel away from the crew side. */
  private balance(agent: CrewAgent, phi: number, dt: number): void {
    const input = this.context!.legacy.master.input?.state;
    const user = input?.hike ?? 0.2;
    const rate = (phi - agent.lastPhiAway) / Math.max(dt, 1e-3);
    agent.lastPhiAway = phi;
    const gain = agent.id === 'crew' ? 1.15 : 0.95;
    const target = 5;
    let command = 0.25 * (user - 0.2) + gain * ((phi - target) / 10 + rate / 30);
    command = Math.max(-1.6, Math.min(1, command));
    const maxStep = 1.4 * dt;
    agent.hikeCommand += Math.max(-maxStep, Math.min(maxStep, command - agent.hikeCommand));
    if (agent.id === 'crew' && this.trapezeAssist && input) {
      if (agent.hikeCommand > 0.97) { agent.hikeSaturatedS += dt; agent.hikeSlackS = 0; }
      else if (agent.hikeCommand < 0.3) { agent.hikeSlackS += dt; agent.hikeSaturatedS = 0; }
      else { agent.hikeSaturatedS = 0; agent.hikeSlackS = 0; }
      if (!input.trapeze && agent.hikeSaturatedS > 1.2) input.trapeze = true;
      if (input.trapeze && agent.hikeSlackS > 2.2) input.trapeze = false;
    }
  }

  private manageSheets(master: any, frame: HullFrame, dt: number): void {
    const input = master.input?.state;
    if (!input || !this.releaseSheetsWhenCapsized) return;
    const anyoneOff = this.agents.some((a) => a.mode !== 'aboard' || a.task === 'scooped');
    if ((frame.heelDeg > 75 || anyoneOff) && this.autoRecovery) {
      if (!this.savedTrim) this.savedTrim = { mainScope: input.mainScope, jibScope: input.jibScope };
      input.mainScope = Math.max(0, input.mainScope - dt * 1.5);
      input.jibScope = Math.max(0, input.jibScope - dt * 1.5);
      input.trapeze = false;
      input.tiller = 0;
      this.restoreTrimS = 0;
    } else if (this.savedTrim) {
      this.restoreTrimS += dt;
      if (this.restoreTrimS > 1.5) {
        const k = Math.min(1, dt * 0.6);
        input.mainScope += (this.savedTrim.mainScope - input.mainScope) * k;
        input.jibScope += (this.savedTrim.jibScope - input.jibScope) * k;
        if (Math.abs(input.mainScope - this.savedTrim.mainScope) < 0.01) this.savedTrim = null;
      }
    }
  }

  private fall(agent: CrewAgent, frame: HullFrame, phi: number): void {
    const com = this.designToWorld(agent.comDesign, P.v3());
    const v = this.pointVelocity(com);
    // Leeward capsize (own side up): drop across the boat towards the water;
    // windward capsize (own side down): fall backwards off the gunwale.
    const sigma = -Math.sign(agent.actor.side || -1);
    const away = phi > 0 ? P.scale(frame.right, -sigma) : P.scale(frame.right, sigma);
    const pushH = P.normalize({ x: away.x, y: 0, z: away.z }, { x: 1, y: 0, z: 0 });
    agent.lastSkeleton = this.currentSkeletonWorld(agent);
    agent.blendFrom = agent.lastSkeleton;
    agent.blendT = 0;
    agent.swimmer.place(com, { x: v.x + pushH.x * 0.9, y: Math.max(v.y, 0) + 0.8, z: v.z + pushH.z * 0.9 });
    agent.swimmer.verticality = 0.7;
    agent.heading = P.scale(pushH, -1);
    this.releaseGrip(agent);
    agent.setTask('falling', phi > 0 ? 'leeward capsize' : 'windward capsize');
    const input = this.context!.legacy.master.input?.state;
    if (input) input.trapeze = false;
  }

  private tread(agent: CrewAgent, dt: number): void {
    const s = agent.swimmer;
    s.swimThrottle = 0;
    s.treading = 0.85;
    s.verticality += (1 - s.verticality) * Math.min(1, dt * 2);
    // Stay with the boat: grab it if within reach.
    const d = this.worldToDesign(this.swimmerPos(agent), P.v3());
    s.hold = 1 - P.smooth((hullSignedDistance(d.x, d.y, d.z) - 0.55) / 0.5);
    const v = this.pointVelocity(this.swimmerPos(agent));
    s.holdAnchorVel.x = v.x; s.holdAnchorVel.z = v.z;
    s.holdRelative.x = 0; s.holdRelative.z = 0;
  }

  private chooseRecoveryTask(agent: CrewAgent, frame: HullFrame, other: CrewAgent | null): void {
    const heel = frame.heelDeg;
    if (heel < 45) { agent.setTask('swimToGunwale', 'boat upright'); return; }
    const righterBusy = other && other.role === 'righter' && other.mode !== 'aboard';
    let role = agent.role;
    // If the designated righter is back aboard (or missing), this agent rights.
    if (role === 'scoop' && (!other || other.mode === 'aboard')) role = 'righter';
    if (role === 'righter' && agent.role === 'scoop' && righterBusy) role = 'scoop';
    if (role === 'righter') agent.setTask(heel > 140 ? 'swimToHull' : 'swimToBoard', heel > 140 ? 'turtle recovery' : 'to centreboard');
    else if (heel <= 140) agent.setTask('swimToCockpit', 'scoop');
  }

  // Horizontal hull frame: along-hull axis L, board-side axis B (world).
  private hullPlane(frame: HullFrame): { L: V3; B: V3 } {
    const L = P.normalize({ x: frame.fwd.x, y: 0, z: frame.fwd.z }, { x: 0, y: 0, z: 1 });
    let B = { x: -frame.up.x, y: 0, z: -frame.up.z };
    if (P.length(B) < 0.2) B = P.normalize({ x: frame.right.x, y: 0, z: frame.right.z }, { x: 1, y: 0, z: 0 });
    return { L, B: P.normalize(B) };
  }

  private steer(agent: CrewAgent, target: V3, dt: number, arriveM: number): number {
    const s = agent.swimmer;
    const dx = target.x - s.x.x, dz = target.z - s.x.z;
    const dist = Math.hypot(dx, dz);
    const desired = dist > 1e-6 ? { x: dx / dist, y: 0, z: dz / dist } : agent.heading;
    // Turn towards the desired heading at ~1.8 rad/s.
    const cross = agent.heading.x * desired.z - agent.heading.z * desired.x;
    const dotv = agent.heading.x * desired.x + agent.heading.z * desired.z;
    const angle = Math.atan2(cross, dotv);
    const turn = Math.max(-1.8 * dt, Math.min(1.8 * dt, angle));
    const c = Math.cos(turn), sn = Math.sin(turn);
    agent.heading = P.normalize({ x: agent.heading.x * c - agent.heading.z * sn, y: 0, z: agent.heading.x * sn + agent.heading.z * c });
    s.swimDir.x = agent.heading.x; s.swimDir.y = 0; s.swimDir.z = agent.heading.z;
    const align = Math.max(0, dotv);
    // Within arm's reach of the hull the swimmer holds on and works along it
    // (hand-over-hand) at up to 0.55 m/s relative to the drifting boat.
    const d = this.worldToDesign(this.swimmerPos(agent), P.v3());
    const clearance = hullSignedDistance(d.x, d.y, d.z);
    const hold = 1 - P.smooth((clearance - 0.55) / 0.5);
    s.hold = hold;
    const v = this.pointVelocity(this.swimmerPos(agent));
    s.holdAnchorVel.x = v.x; s.holdAnchorVel.y = 0; s.holdAnchorVel.z = v.z;
    const rel = Math.min(0.7, dist * 0.9);
    s.holdRelative.x = desired.x * rel; s.holdRelative.y = 0; s.holdRelative.z = desired.z * rel;
    s.swimThrottle = (1 - 0.7 * hold) * Math.min(1, dist / Math.max(0.3, arriveM * 1.5)) * (0.35 + 0.65 * align);
    s.treading = 0.25 + 0.4 * hold;
    const wantVert = dist < arriveM * 1.3 || hold > 0.5 ? 0.85 : 0.15;
    s.verticality += (wantVert - s.verticality) * Math.min(1, dt * 1.6);
    return dist;
  }

  private followPath(agent: CrewAgent, points: V3[], dt: number, arriveM: number): boolean {
    while (agent.waypoint < points.length - 1) {
      const p = points[agent.waypoint]!;
      if (Math.hypot(p.x - agent.swimmer.x.x, p.z - agent.swimmer.x.z) < 0.55) agent.waypoint++;
      else break;
    }
    const target = points[Math.min(agent.waypoint, points.length - 1)]!;
    const dist = this.steer(agent, target, dt, arriveM);
    return agent.waypoint >= points.length - 1 && dist < arriveM;
  }

  private waterPoint(p: V3): V3 { return { x: p.x, y: this.surfaceAt(p), z: p.z }; }

  private swimToBoard(agent: CrewAgent, frame: HullFrame, dt: number): void {
    if (frame.heelDeg < 45) { agent.setTask('swimToGunwale', 'boat upright'); return; }
    if (frame.heelDeg > 140) { agent.setTask('swimToHull', 'turtled'); return; }
    const { L, B } = this.hullPlane(frame);
    const tip = this.designToWorld(this.boardTipDesign(), P.v3());
    const approach = this.waterPoint(P.madd(P.madd(tip, B, 0.28), L, -0.18));
    const rel = P.sub(this.swimmerPos(agent), frame.center);
    const b = P.dot(rel, B);
    const a = P.dot(rel, L);
    const path: V3[] = [];
    if (b < 0.45) {
      // Work round the transom (or the bow when closer) staying within arm's
      // reach of the hull so the swimmer can hold on and move hand over hand.
      const aroundBow = a > 1.2;
      const endA = aroundBow ? 2.55 : -2.62;
      path.push(this.waterPoint(P.madd(P.madd(frame.center, L, endA * 0.92), B, Math.min(b, -0.7))));
      path.push(this.waterPoint(P.madd(P.madd(frame.center, L, endA), B, -0.1)));
      path.push(this.waterPoint(P.madd(P.madd(frame.center, L, endA * 0.92), B, 0.75)));
    }
    path.push(approach);
    if (this.followPath(agent, path, dt, 0.55)) {
      const heightAbove = tip.y - this.surfaceAt(tip);
      if (heightAbove < 1.3) {
        this.engageGrip(agent, this.boardTipDesign(), 0.95);
        agent.setTask('hangBoard', `tip ${heightAbove.toFixed(2)} m above water`);
      }
    }
  }

  private swimmerPos(agent: CrewAgent): V3 { return { x: agent.swimmer.x.x, y: agent.swimmer.x.y, z: agent.swimmer.x.z }; }

  private engageGrip(agent: CrewAgent, pointDesign: V3, length: number): void {
    const local = this.designToBody(pointDesign);
    agent.grip.setLocal(local);
    const anchor = this.designToWorld(pointDesign, P.v3());
    const current = P.length(P.sub(this.swimmerPos(agent), anchor));
    agent.grip.length = Math.max(length, Math.min(current, length + 0.6));
    agent.grip.lambda = 0;
    agent.grip.enabled = true;
  }

  private releaseGrip(agent: CrewAgent): void {
    agent.grip.enabled = false;
    agent.grip.tension = 0;
  }

  /** Swimmer → hull-carried transition (momentum of the swimmer goes to the hull). */
  private attach(agent: CrewAgent, task: CrewTask): void {
    const master = this.context!.legacy.master;
    const body = master.body;
    const s = agent.swimmer;
    const com = this.swimmerPos(agent);
    const vHull = this.pointVelocity(com);
    const m = s.spec.massKg;
    const mass = this.physics.compositeMassKg + m;
    body.vel.x += (m * (s.v.x - vHull.x)) / mass;
    body.vel.y += (m * (s.v.y - vHull.y)) / mass;
    body.vel.z += (m * (s.v.z - vHull.z)) / mass;
    this.worldToDesign(com, agent.attachStartDesign);
    agent.comDesign.x = agent.attachStartDesign.x; agent.comDesign.y = agent.attachStartDesign.y; agent.comDesign.z = agent.attachStartDesign.z;
    agent.progress = 0;
    this.releaseGrip(agent);
    agent.setTask(task);
  }

  /** Hull-carried → swimmer transition at the current COM. */
  private detach(agent: CrewAgent, task: CrewTask, frame: HullFrame): void {
    const com = this.designToWorld(agent.comDesign, P.v3());
    const v = this.pointVelocity(com);
    agent.swimmer.place(com, v);
    agent.swimmer.verticality = 1;
    agent.setTask(task);
    void frame;
  }

  /** Righter on the centreboard: climb from the tip onto the root, then lean back. */
  private onBoard(agent: CrewAgent, frame: HullFrame, dt: number): void {
    if (frame.heelDeg > 140) { this.detach(agent, 'swimToHull', frame); return; }
    const standSide = this.boardStandSide(frame);
    if (frame.heelDeg < 47) {
      // Boat coming up: slide off the board and grab the gunwale on this side.
      this.detach(agent, 'holdGunwale', frame);
      agent.holdSide = standSide;
      this.engageGrip(agent, this.gunwaleDesign(standSide, -0.55), 0.75);
      return;
    }
    const pose = this.boardPose(agent, frame, standSide);
    if (agent.task === 'climbBoard') {
      agent.progress = Math.min(1, agent.progress + dt / 2.3);
      const p = P.smooth(agent.progress);
      const target = this.worldToDesign(pose.com, P.v3());
      agent.comDesign.x = agent.attachStartDesign.x + (target.x - agent.attachStartDesign.x) * p;
      agent.comDesign.y = agent.attachStartDesign.y + (target.y - agent.attachStartDesign.y) * p;
      agent.comDesign.z = agent.attachStartDesign.z + (target.z - agent.attachStartDesign.z) * p;
      agent.lean = 0.15 * p;
      if (agent.progress >= 1) agent.setTask('standBoard');
    } else {
      const maxLean = Math.min(1.25, this.maxLeanRad + 0.25 * this.heaveBoost);
      agent.lean += Math.max(-dt * 0.6, Math.min(dt * 0.45, maxLean - agent.lean));
      const target = this.worldToDesign(pose.com, P.v3());
      agent.comDesign.x = target.x; agent.comDesign.y = target.y; agent.comDesign.z = target.z;
    }
  }

  /** Which design-x side the righter's hands hold (the high gunwale). */
  private boardStandSide(frame: HullFrame): number {
    // The gunwale that is higher in the world.
    const a = this.designToWorld(this.gunwaleDesign(1), P.v3());
    const b = this.designToWorld(this.gunwaleDesign(-1), P.v3());
    return a.y >= b.y ? 1 : -1;
  }

  private boardPose(agent: CrewAgent, frame: HullFrame, side: number): { skeleton: P.Skeleton; com: V3 } {
    const feet = this.designToWorld({ x: 0, y: this.boardRootDesign().y, z: HULL_POINTS.boardZ - 0.12 }, P.v3());
    const grip = this.designToWorld(this.gunwaleDesign(side, HULL_POINTS.boardZ - 0.1), P.v3());
    const boardOut = P.scale(frame.up, -1);
    const stand = agent.task === 'climbBoard' ? Math.min(1, agent.progress * 1.25) : 1;
    const pose = P.boardStandPose({ feet, grip, boardOut, lean: agent.lean, stand, hullAxis: frame.fwd, t: this.simTime, dims: agent.dims });
    const skeleton = P.buildSkeleton(pose.frame, pose.limbs, agent.dims);
    return { skeleton, com: P.skeletonCom(skeleton) };
  }

  private swimToHull(agent: CrewAgent, frame: HullFrame, dt: number): void {
    if (frame.heelDeg < 125) { agent.setTask('swimToBoard', 'no longer turtled'); return; }
    // Upturned hull: approach the gunwale on the side the swimmer is on.
    const side = this.nearestGunwaleSide(agent);
    const g = this.designToWorld(this.gunwaleDesign(side, HULL_POINTS.boardZ - 0.2), P.v3());
    const out = P.normalize({ x: g.x - frame.center.x, y: 0, z: g.z - frame.center.z });
    const target = this.waterPoint(P.madd(g, out, 0.35));
    if (this.steer(agent, target, dt, 0.5) < 0.5) {
      agent.holdSide = side;
      this.engageGrip(agent, this.gunwaleDesign(side, HULL_POINTS.boardZ - 0.2), 0.7);
      this.attach(agent, 'climbHull');
    }
  }

  private nearestGunwaleSide(agent: CrewAgent): number {
    const p = this.swimmerPos(agent);
    const a = this.designToWorld(this.gunwaleDesign(1), P.v3());
    const b = this.designToWorld(this.gunwaleDesign(-1), P.v3());
    return P.length(P.sub(p, a)) <= P.length(P.sub(p, b)) ? 1 : -1;
  }

  /** Turtle recovery: climb onto the upturned hull, stand on the gunwale lip, pull the board. */
  private onUpturnedHull(agent: CrewAgent, frame: HullFrame, dt: number): void {
    if (frame.heelDeg < 118) {
      // Rolled onto its side: step across onto the board and keep righting.
      agent.progress = 0.4;
      this.worldToDesign(this.designToWorld(agent.comDesign, P.v3()), agent.attachStartDesign);
      agent.setTask('climbBoard', 'hull on its side');
      return;
    }
    const side = agent.holdSide;
    const lip = this.designToWorld(this.gunwaleDesign(side, HULL_POINTS.boardZ - 0.15), P.v3());
    const tip = this.designToWorld(this.boardTipDesign(), P.v3());
    const out = P.normalize({ x: lip.x - frame.center.x, y: 0, z: lip.z - frame.center.z });
    if (agent.task === 'climbHull') agent.progress = Math.min(1, agent.progress + dt / 2.6);
    else agent.lean += Math.max(-dt * 0.5, Math.min(dt * 0.4, Math.min(1.2, this.maxLeanRad + 0.2 * this.heaveBoost) - agent.lean));
    const stand = agent.task === 'climbHull' ? P.smooth(agent.progress) : 1;
    const pose = P.boardStandPose({ feet: P.madd(lip, out, -0.05), grip: P.lerp3(tip, lip, 0.35), boardOut: out, lean: agent.task === 'standHull' ? agent.lean : 0.1, stand, hullAxis: frame.fwd, t: this.simTime, dims: agent.dims });
    const com = P.skeletonCom(P.buildSkeleton(pose.frame, pose.limbs, agent.dims));
    const target = this.worldToDesign(com, P.v3());
    if (agent.task === 'climbHull') {
      const p = P.smooth(agent.progress);
      agent.comDesign.x = agent.attachStartDesign.x + (target.x - agent.attachStartDesign.x) * p;
      agent.comDesign.y = agent.attachStartDesign.y + (target.y - agent.attachStartDesign.y) * p;
      agent.comDesign.z = agent.attachStartDesign.z + (target.z - agent.attachStartDesign.z) * p;
      if (agent.progress >= 1) { agent.lean = 0.1; agent.setTask('standHull'); }
    } else {
      agent.comDesign.x = target.x; agent.comDesign.y = target.y; agent.comDesign.z = target.z;
    }
  }

  private lowerStrapSide(): number {
    const a = this.designToWorld(this.strapDesign(1), P.v3());
    const b = this.designToWorld(this.strapDesign(-1), P.v3());
    return a.y <= b.y ? 1 : -1;
  }

  private swimToCockpit(agent: CrewAgent, frame: HullFrame, dt: number): void {
    if (frame.heelDeg < 45) { agent.setTask('swimToGunwale', 'boat upright'); return; }
    if (frame.heelDeg > 140) { agent.setTask('treading', 'turtled: wait'); return; }
    const side = this.lowerStrapSide();
    const strap = this.designToWorld(this.strapDesign(side), P.v3());
    const { L, B } = this.hullPlane(frame);
    // Float in the cockpit area on the deck side (away from the board).
    const target = this.waterPoint(P.madd(P.madd(strap, B, -0.35), L, 0.1));
    const rel = P.sub(this.swimmerPos(agent), frame.center);
    const path: V3[] = [];
    if (P.dot(rel, B) > 0.35) {
      path.push(this.waterPoint(P.madd(P.madd(frame.center, L, -2.4), B, 0.75)));
      path.push(this.waterPoint(P.madd(P.madd(frame.center, L, -2.62), B, -0.1)));
      path.push(this.waterPoint(P.madd(P.madd(frame.center, L, -2.4), B, -0.7)));
    }
    path.push(target);
    if (this.followPath(agent, path, dt, 0.55)) {
      agent.holdSide = side;
      this.engageGrip(agent, this.strapDesign(side), 0.8);
      agent.setTask('holdStrap', 'scoop position');
    }
  }

  private holdStrap(agent: CrewAgent, frame: HullFrame, dt: number): void {
    const s = agent.swimmer;
    s.swimThrottle = 0;
    s.treading = 0.5;
    s.verticality += (0.55 - s.verticality) * Math.min(1, dt * 1.5);
    if (frame.heelDeg > 145) { this.releaseGrip(agent); agent.setTask('treading', 'turtled'); return; }
    if (frame.heelDeg < 40) {
      const d = this.worldToDesign(this.swimmerPos(agent), P.v3());
      const inCockpit = Math.abs(d.x) < 0.62 && d.y > -0.05 && d.z > -1.95 && d.z < 0.45;
      if (inCockpit) { this.attach(agent, 'climbIn'); agent.progress = 0.62; agent.holdSide = Math.sign(d.x) || agent.holdSide; this.scoopedFrom(agent); return; }
      if (agent.taskTime > 3 || frame.heelDeg < 25) {
        this.releaseGrip(agent);
        agent.holdSide = this.nearestGunwaleSide(agent);
        this.engageGrip(agent, this.gunwaleDesign(agent.holdSide), 0.75);
        agent.setTask('holdGunwale', 'missed the scoop');
      }
    }
  }

  private scoopedFrom(agent: CrewAgent): void {
    agent.setTask('scooped', 'scooped aboard');
    agent.mode = 'attached';
    agent.progress = 0;
  }

  private scooped(agent: CrewAgent, frame: HullFrame, dt: number, other: CrewAgent | null): void {
    agent.progress = Math.min(1, agent.progress + dt / 1.4);
    // Kneel on the cockpit sole on the side opposite the swimmer climbing in.
    const counterSide = other && other.mode !== 'aboard' ? -other.holdSide : agent.holdSide;
    const seat = { x: counterSide * 0.32, y: COCKPIT_SOLE_Y + 0.28, z: -0.55 };
    const p = P.smooth(agent.progress);
    agent.comDesign.x = agent.attachStartDesign.x + (seat.x - agent.attachStartDesign.x) * p;
    agent.comDesign.y = agent.attachStartDesign.y + (seat.y - agent.attachStartDesign.y) * p;
    agent.comDesign.z = agent.attachStartDesign.z + (seat.z - agent.attachStartDesign.z) * p;
    agent.holdSide = counterSide;
    if (agent.progress >= 1 && frame.heelDeg < 35) this.handBackToLegacy(agent, counterSide, 'scooped and seated');
  }

  private swimToGunwale(agent: CrewAgent, frame: HullFrame, dt: number): void {
    if (frame.heelDeg > 80 && this.autoRecovery) { agent.setTask('treading', 'capsized again'); return; }
    const side = this.nearestGunwaleSide(agent);
    const g = this.designToWorld(this.gunwaleDesign(side, -0.75), P.v3());
    const out = P.normalize({ x: g.x - frame.center.x, y: 0, z: g.z - frame.center.z });
    const target = this.waterPoint(P.madd(g, out, 0.4));
    if (this.steer(agent, target, dt, 0.5) < 0.5) {
      agent.holdSide = side;
      this.engageGrip(agent, this.gunwaleDesign(side, -0.75), 0.75);
      agent.setTask('holdGunwale');
    }
  }

  private holdGunwale(agent: CrewAgent, frame: HullFrame, dt: number, other: CrewAgent | null): void {
    const s = agent.swimmer;
    s.swimThrottle = 0;
    s.treading = 0.6;
    s.verticality += (1 - s.verticality) * Math.min(1, dt * 2);
    if (frame.heelDeg > 80 && this.autoRecovery) { this.releaseGrip(agent); agent.setTask('treading', 'capsized again'); return; }
    const otherBusy = other && (other.task === 'climbIn');
    // Only climb when the boat is upright and someone aboard (or nobody else
    // to wait for) can counter-balance.
    const balanced = !other || other.mode !== 'overboard' || other.task === 'holdGunwale';
    if (frame.heelDeg < 28 && !otherBusy && balanced && agent.taskTime > 0.8) {
      this.attach(agent, 'climbIn');
      agent.progress = 0;
    }
  }

  private climbIn(agent: CrewAgent, frame: HullFrame, dt: number, other: CrewAgent | null): void {
    if (frame.heelDeg > 70) { this.detach(agent, 'treading', frame); return; }
    agent.progress = Math.min(1, agent.progress + dt / 2.8);
    const side = agent.holdSide;
    const gunwale = this.designToWorld(this.gunwaleDesign(side, -0.75), P.v3());
    const seatDesign = { x: side * 0.5, y: sheerY(uOfZ(-0.8)) + 0.12, z: -0.8 };
    const seat = this.designToWorld(seatDesign, P.v3());
    const inward = P.normalize({ x: frame.center.x - gunwale.x, y: 0, z: frame.center.z - gunwale.z });
    const pose = P.climbInPose({ gunwale, seat, inward, progress: agent.progress, surfaceY: this.surfaceAt(gunwale), t: this.simTime, dims: agent.dims });
    const target = this.worldToDesign(pose.com, P.v3());
    const blend = Math.min(1, agent.taskTime / 0.4);
    agent.comDesign.x += (target.x - agent.comDesign.x) * blend;
    agent.comDesign.y += (target.y - agent.comDesign.y) * blend;
    agent.comDesign.z += (target.z - agent.comDesign.z) * blend;
    if (agent.progress >= 1) this.handBackToLegacy(agent, side, 'back aboard');
    void other;
  }

  /** Returns control to the legacy seated biomechanics on design-x side `side`. */
  private handBackToLegacy(agent: CrewAgent, side: number, note: string): void {
    const actor = agent.actor;
    const legacySide = -Math.sign(side || 1);
    const skeleton = agent.lastSkeleton;
    if (skeleton) {
      const pelvis = this.worldToDesign(skeleton.pelvis, P.v3());
      actor.pelvis?.set?.(pelvis.x, pelvis.y, pelvis.z);
      actor.pelvisT?.set?.(pelvis.x, pelvis.y, pelvis.z);
    }
    actor.side = legacySide;
    actor.crossing = null;
    actor.trapB = 0;
    agent.hikeCommand = 0.2;
    agent.blendFrom = skeleton;
    agent.blendT = 0;
    agent.setTask('sailing', note);
  }

  // --------------------------------------------------------------------------
  // Poses (after each physics step)
  // --------------------------------------------------------------------------

  private afterStep(dt: number): void {
    if (!this.context || !this.enabled) return;
    this.updateFrame();
    for (const agent of this.agents) {
      agent.poseTime += dt;
      if (agent.mode === 'aboard' && (agent.task === 'sailing' || agent.task === 'bracing')) {
        if (agent.blendFrom && agent.blendT < 1) {
          // Blend from the last synthesized skeleton into the legacy pose.
          agent.blendT = Math.min(1, agent.blendT + dt / 0.45);
          const legacy = this.currentSkeletonWorld(agent);
          this.writeSkeleton(agent, this.blendSkeleton(agent.blendFrom, legacy, P.smooth(agent.blendT)), legacy);
          if (agent.blendT >= 1) agent.blendFrom = null;
        }
        this.stowExtension(agent);
        continue;
      }
      const skeleton = this.synthesize(agent);
      if (!skeleton) continue;
      let final = skeleton;
      if (agent.blendFrom && agent.blendT < 1) {
        agent.blendT = Math.min(1, agent.blendT + dt / 0.35);
        final = this.blendSkeleton(agent.blendFrom, skeleton, P.smooth(agent.blendT));
      }
      agent.lastSkeleton = final;
      this.writeSkeleton(agent, final, skeleton);
      this.stowExtension(agent);
    }
  }

  private synthesize(agent: CrewAgent): P.Skeleton | null {
    const frame = this.frame;
    const s = agent.swimmer;
    const t = this.simTime;
    const com = agent.mode === 'overboard' ? this.swimmerPos(agent) : this.designToWorld(agent.comDesign, P.v3());
    let pose: { frame: P.TorsoFrame; limbs: P.LimbTargets } | null = null;
    switch (agent.task) {
      case 'falling': {
        const away = P.normalize({ x: -agent.heading.x, y: 0, z: -agent.heading.z }, { x: 1, y: 0, z: 0 });
        pose = P.fallPose({ com, velocity: s.v, away, t: agent.taskTime, dims: agent.dims });
        break;
      }
      case 'treading': case 'swimToBoard': case 'swimToHull': case 'swimToCockpit': case 'swimToGunwale':
        pose = P.swimPose({ com, heading: agent.heading, surfaceY: s.surfaceY, t, verticality: s.verticality, phase: s.strokePhase, dims: agent.dims });
        break;
      case 'hangBoard': case 'holdGunwale': {
        const grip = this.designToWorld(agent.task === 'hangBoard' ? this.boardTipDesign() : this.gunwaleDesign(agent.holdSide, agent.task === 'holdGunwale' ? -0.75 : -0.55), P.v3());
        const toward = P.normalize({ x: frame.center.x - com.x, y: 0, z: frame.center.z - com.z });
        pose = P.hangPose({ grip, com, towardHull: toward, t, pull: agent.task === 'hangBoard' ? Math.min(1, agent.taskTime / 1.1) : 0.2, dims: agent.dims });
        break;
      }
      case 'holdStrap': {
        const strap = this.designToWorld(this.strapDesign(agent.holdSide), P.v3());
        pose = P.scoopFloatPose({ strap, com, bow: frame.fwd, t, dims: agent.dims });
        break;
      }
      case 'climbBoard': case 'standBoard': {
        const side = this.boardStandSide(frame);
        const b = this.boardPose(agent, frame, side);
        // Translate so the skeleton COM matches the carried COM (continuity while climbing).
        return this.translateSkeleton(b.skeleton, P.sub(com, b.com));
      }
      case 'climbHull': case 'standHull': {
        const side = agent.holdSide;
        const lip = this.designToWorld(this.gunwaleDesign(side, HULL_POINTS.boardZ - 0.15), P.v3());
        const tip = this.designToWorld(this.boardTipDesign(), P.v3());
        const out = P.normalize({ x: lip.x - frame.center.x, y: 0, z: lip.z - frame.center.z });
        const stand = agent.task === 'climbHull' ? P.smooth(agent.progress) : 1;
        pose = P.boardStandPose({ feet: P.madd(lip, out, -0.05), grip: P.lerp3(tip, lip, 0.35), boardOut: out, lean: agent.task === 'standHull' ? agent.lean : 0.1, stand, hullAxis: frame.fwd, t, dims: agent.dims });
        const skeleton = P.buildSkeleton(pose.frame, pose.limbs, agent.dims);
        return this.translateSkeleton(skeleton, P.sub(com, P.skeletonCom(skeleton)));
      }
      case 'climbIn': {
        const side = agent.holdSide;
        const gunwale = this.designToWorld(this.gunwaleDesign(side, -0.75), P.v3());
        const seat = this.designToWorld({ x: side * 0.5, y: sheerY(uOfZ(-0.8)) + 0.12, z: -0.8 }, P.v3());
        const inward = P.normalize({ x: frame.center.x - gunwale.x, y: 0, z: frame.center.z - gunwale.z });
        const climb = P.climbInPose({ gunwale, seat, inward, progress: agent.progress, surfaceY: this.surfaceAt(gunwale), t, dims: agent.dims });
        const skeleton = P.buildSkeleton(climb.frame, climb.limbs, agent.dims);
        return this.translateSkeleton(skeleton, P.sub(com, P.skeletonCom(skeleton)));
      }
      case 'scooped': {
        const bow = frame.fwd;
        const up = P.v3(0, 1, 0);
        const side = P.normalize(P.cross(up, bow));
        const pelvis = P.madd(com, up, -0.25);
        pose = {
          frame: { pelvis, up: P.normalize(P.add(up, P.scale(bow, 0.35))), forward: bow, look: bow },
          limbs: {
            handL: P.madd(P.madd(pelvis, side, 0.3), bow, 0.35), handR: P.madd(P.madd(pelvis, side, -0.3), bow, 0.35),
            footL: P.madd(P.madd(pelvis, bow, -0.35), up, -0.28), footR: P.madd(P.madd(pelvis, bow, -0.3), side, -0.2),
            elbowPoleL: P.scale(up, -1), elbowPoleR: P.scale(up, -1), kneePoleL: bow, kneePoleR: bow, toeDirL: P.scale(bow, -1), toeDirR: P.scale(bow, -1),
          },
        };
        break;
      }
      default:
        return null;
    }
    if (!pose) return null;
    return P.buildSkeleton(pose.frame, pose.limbs, agent.dims);
  }

  private translateSkeleton(s: P.Skeleton, d: V3): P.Skeleton {
    const out = {} as P.Skeleton;
    for (const j of P.JOINTS) out[j] = P.add(s[j], d);
    return out;
  }

  private blendSkeleton(a: P.Skeleton, b: P.Skeleton, t: number): P.Skeleton {
    const out = {} as P.Skeleton;
    for (const j of P.JOINTS) out[j] = P.lerp3(a[j], b[j], t);
    return out;
  }

  /** Current legacy skeleton (human.cur, design frame) in world space. */
  private currentSkeletonWorld(agent: CrewAgent): P.Skeleton {
    const cur = agent.actor.human.cur;
    const out = {} as P.Skeleton;
    for (const j of P.JOINTS) {
      const p = cur[j];
      out[j] = p ? this.designToWorld({ x: p.x, y: p.y, z: p.z }, P.v3()) : this.designToWorld(agent.comDesign, P.v3());
    }
    return out;
  }

  private writeSkeleton(agent: CrewAgent, world: P.Skeleton, orientationSource: P.Skeleton): void {
    const actor = agent.actor;
    const human = actor.human;
    const T = three();
    const joints: Record<string, any> = {};
    const d = P.v3();
    for (const j of P.JOINTS) {
      this.worldToDesign(world[j], d);
      joints[j] = new T.Vector3(d.x, d.y, d.z);
    }
    // Facing hints (design frame): chest forward from shoulder axis × torso axis.
    const up = P.normalize(P.sub(orientationSource.chest, orientationSource.pelvis));
    const leftAxis = P.normalize(P.sub(orientationSource.shoulderL, orientationSource.shoulderR));
    const fwdWorld = P.normalize(P.cross(leftAxis, up));
    const lookWorld = P.normalize(P.sub(orientationSource.head, orientationSource.neck));
    const fwd = this.rotateToDesign(fwdWorld, P.v3());
    const look = this.rotateToDesign(P.normalize(P.add(fwdWorld, P.scale(lookWorld, 0.2))), P.v3());
    const upD = this.rotateToDesign(up, P.v3());
    const F = new T.Vector3(fwd.x, fwd.y, fwd.z);
    const U = new T.Vector3(upD.x, upD.y, upD.z);
    const hints = {
      pelvis: F, spine: F, chest: F, neck: F, head: new T.Vector3(look.x, look.y, look.z),
      thighL: F, thighR: F, shinL: F, shinR: F, footL: U, footR: U,
      uparmL: F, uparmR: F, forearmL: F, forearmR: F, handL: U, handR: U,
    };
    human.applyPose(joints, hints);
    // Keep legacy fields coherent for the VRM retarget and later hand-back.
    actor.facing?.set?.(fwd.x, 0, fwd.z);
    if (actor.facing?.lengthSq?.() < 1e-6) actor.facing.set(0, 0, 1);
    actor.facing?.normalize?.();
    actor.pelvis?.set?.(joints.pelvis.x, joints.pelvis.y, joints.pelvis.z);
    this.applyWetness(agent);
  }

  private stowExtension(agent: CrewAgent): void {
    if (agent.id !== 'helm') return;
    const actor = agent.actor;
    const holds = this.context!.legacy.master.holds;
    if (agent.mode === 'aboard' && agent.task === 'sailing') return;
    // Helm has let go: the tiller extension lies forward along the tiller.
    if (holds?.tillerTip && actor.extensionEnd) {
      actor.extensionEnd.copy(holds.tillerTip);
      actor.extensionEnd.z += 0.92;
      actor.extensionEnd.y += 0.03;
    }
  }

  private applyWetness(agent: CrewAgent): void {
    const material = agent.actor.human?.mesh?.material;
    if (!material) return;
    if (material.userData.dryRoughness === undefined) material.userData.dryRoughness = material.roughness ?? 0.72;
    const dry = material.userData.dryRoughness;
    const wet = agent.wetness;
    material.roughness = dry + (0.28 - dry) * wet;
    material.color?.setScalar?.(1 - 0.22 * wet);
  }

  // --------------------------------------------------------------------------

  update(): void {
    // All crew logic runs per physics step through the step bus.
  }

  /** Force a capsize (demo/test): a knockdown gust that lifts the crew's side. */
  forceCapsize(durationS = 1.6): void {
    if (!this.context) return;
    this.updateFrame();
    const helm = this.agents.find((a) => a.id === 'helm');
    this.knockdownSide = helm ? -Math.sign(helm.actor.side || -1) : 1;
    this.knockdownS = durationS;
  }

  telemetry(): Record<string, unknown> {
    const frame = this.frame;
    return {
      installed: this.installed,
      autoRecovery: this.autoRecovery,
      balanceAssist: this.balanceAssist,
      trapezeAssist: this.trapezeAssist,
      capsizeActive: this.capsizeActive,
      capsizes: this.capsizeCount,
      recoveries: this.recoveryCount,
      lastRecoveryDurationS: this.lastRecoveryDurationS,
      heelDeg: frame.heelDeg,
      agents: this.agents.map((a) => ({
        id: a.id, role: a.role, mode: a.mode, task: a.task, taskTime: +a.taskTime.toFixed(2),
        hike: +a.hikeCommand.toFixed(2), lean: +a.lean.toFixed(2), wetness: +a.wetness.toFixed(2),
        swimmer: a.swimmer.active ? {
          pos: [a.swimmer.x.x, a.swimmer.x.y, a.swimmer.x.z].map((v) => +v.toFixed(2)),
          speed: +Math.hypot(a.swimmer.v.x, a.swimmer.v.z).toFixed(2),
          submerged: +a.swimmer.submerged01.toFixed(2), depth: +a.swimmer.depthM.toFixed(2),
          grip: a.grip.enabled ? +a.grip.tension.toFixed(0) : null,
        } : null,
        comDesign: [a.comDesign.x, a.comDesign.y, a.comDesign.z].map((v) => +v.toFixed(2)),
        carriedBuoyancyN: +a.carriedBuoyancyN.toFixed(0),
        events: a.events.slice(-8),
      })),
    };
  }
}
