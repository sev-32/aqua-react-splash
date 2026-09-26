// Installs the direct rig-structure solver (RigStructureSolver) into the
// legacy XPBD world: gathers the mast, spreaders, standing rig, jib luff and
// boom members, removes their Gauss–Seidel constraints from the world list
// and inserts one block constraint in their place. Uninstalling restores the
// original constraint list exactly.

import type { AppContext, AppSystem } from '../core/System.js';
import { RigStructureSolver, RigRowType, type RigRow } from './RigStructureSolver.js';

interface Removed { constraint: any; index: number }
interface Patched { constraint: any; rest: number; uni: any }

export class RigStructureSystem implements AppSystem {
  readonly id = 'sailing.rig-structure';
  readonly phase = 'prePhysics' as const;
  enabled = true;
  solver: RigStructureSolver | null = null;
  private context: AppContext | null = null;
  private removed: Removed[] = [];
  private patched: Patched[] = [];
  /** Gooseneck pin aft of the mast axis (m): the boom hangs on a fitting on the mast's aft face. */
  gooseneckAftOffsetM = 0.045;
  private installed = false;
  private lastError: string | null = null;
  private groups: Record<string, number> = {};

  init(context: AppContext): void {
    this.context = context;
    try {
      this.install();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('Rig structure solver install failed', error);
      context.telemetry.recordError('sailing:rig-structure', error);
      this.uninstall();
    }
    (window as any).LASER2_RIG_STRUCTURE = this;
  }

  update(): void {
    const want = this.enabled;
    if (want && !this.installed && !this.lastError) this.install();
    else if (!want && this.installed) this.uninstall();
  }

  install(): void {
    if (this.installed || !this.context) return;
    const master = this.context.legacy.master;
    const world = master?.physics;
    const rig = master?.rig;
    const body = master?.body;
    const jib = master?.sails?.jib?.cloth;
    const v16 = (window as any).LASER2_RIGGING_V16;
    const r172 = (window as any).LASER2_SPREADER_RIG_V17_2;
    if (!world || !rig?.mast || !body || !jib || !v16?.params || !r172?.routedShrouds) {
      throw new Error('legacy rig runtime (V16 + V17.2) unavailable');
    }
    const Vec3 = body.pos.constructor;
    const solver = new RigStructureSolver(body, Vec3);
    const S = RigStructureSolver;
    const constraints: any[] = world.constraints;
    const toRemove = new Set<any>();
    const groups: Record<string, number> = {};
    const count = (g: string): void => { groups[g] = (groups[g] ?? 0) + 1; };

    // ---- nodes
    const mast: any[] = rig.mast;
    const n = mast.length;
    mast.forEach((p) => solver.addNode(p));
    solver.mastCount = n;
    const tips: any[] = rig.spreaderTips;
    tips.forEach((p) => solver.addNode(p));
    const boom: any[] = rig.boom;
    boom.forEach((p) => solver.addNode(p));
    const luff: any[] = jib.parts.map((row: any[]) => row[0]);
    luff.forEach((p) => solver.addNode(p));
    const mastIndex = new Map<any, number>(mast.map((p, i) => [p, i]));
    const boomIndex = new Map<any, number>(boom.map((p, i) => [p, i]));

    const ep = (legacyEndpoint: any) => {
      if (legacyEndpoint.type === 'particle') return S.node(solver.indexOf(legacyEndpoint.p));
      if (legacyEndpoint.type === 'body') return S.bodyPoint(legacyEndpoint.local);
      return S.seg(solver.indexOf(legacyEndpoint.a), solver.indexOf(legacyEndpoint.b), legacyEndpoint.t);
    };
    const fromSource = (row: RigRow): void => {
      row.rest = row.source.rest;
      row.alpha = Math.max(0, row.source.alpha ?? 0);
    };

    // ---- mast foot pin (legacy Gt, rest 0) → three axis rows
    const pin = constraints.find((c) => c?.body === body && c.p === mast[0] && c.rest === 0);
    if (!pin) throw new Error('mast foot pin not found');
    for (let k = 0; k < 3; k++) {
      solver.addRow({
        label: `mast-pin-${'xyz'[k]}`, group: 'pin', type: RigRowType.AXIS, axis: k,
        a: S.bodyPoint(pin.local), b: S.node(0), alpha: pin.alpha ?? 0,
        refresh: (row) => { row.alpha = Math.max(0, pin.alpha ?? 0); },
      });
      count('pin');
    }
    toRemove.add(pin);

    // ---- mast stretch (legacy distance constraints between neighbours)
    for (const c of constraints) {
      if (!c?.a || !c?.b || c.body || c.c || typeof c.rest !== 'number' || c.enabled === false) continue;
      const ia = mastIndex.get(c.a), ib = mastIndex.get(c.b);
      if (ia === undefined || ib === undefined || Math.abs(ia - ib) !== 1) continue;
      solver.addRow({
        label: `mast-stretch-${Math.min(ia, ib)}`, group: 'mast-stretch', type: RigRowType.DIST,
        a: S.node(ia), b: S.node(ib), source: c, rest: c.rest, alpha: c.alpha, refresh: fromSource,
      });
      toRemove.add(c);
      count('mast-stretch');
    }
    if (groups['mast-stretch'] !== n - 1) throw new Error(`expected ${n - 1} mast stretch links, found ${groups['mast-stretch'] ?? 0}`);

    // ---- mast bending (replaces V16 DirectionalRodBendConstraint, same EI)
    const segLen = rig.segLen;
    const height = master.config?.mast?.height ?? segLen * (n - 1);
    const p16 = v16.params;
    const mastEiAt = (f: number, foreAft: boolean): number => {
      const z = Math.max(0, Math.min(1, f)) * height;
      const jointZ = 4.21;
      let ei: number;
      if (z < jointZ) ei = p16.mastEiLowerSideNm2 * (1 + (0.86 - 1) * (z / jointZ));
      else {
        const upperF = (z - jointZ) / Math.max(0.1, height - jointZ);
        ei = p16.mastEiUpperSideNm2 * (1 + (0.82 - 1) * upperF);
        if (z < jointZ + 0.26) ei *= 0.82;
      }
      if (foreAft) ei *= p16.mastForeAftFactor;
      return Math.max(120, ei * p16.mastEiScale);
    };
    for (let i = 1; i < n - 1; i++) {
      for (const plane of [0, 1]) {
        const f = i / (n - 1);
        solver.addRow({
          label: `mast-bend-${plane ? 'fore' : 'side'}-${i}`, group: 'mast-bend', type: RigRowType.BEND,
          n: [i - 1, i, i + 1], l1: segLen, l2: segLen, plane, ref: 0,
          alpha: (2 * segLen) / (2 * mastEiAt(f, plane === 1)),
          refresh: (row) => { row.alpha = (row.l1! + row.l2!) / (2 * mastEiAt(f, plane === 1)); },
        });
        count('mast-bend');
      }
    }
    for (const c of v16.rodConstraints ?? []) toRemove.add(c);

    // ---- spreader sockets (V17.2 SpreaderBracketConstraint, three axes)
    const p172 = r172.params;
    (r172.bracketConstraints as any[]).forEach((bracket, side) => {
      const station = bracket.station;
      const tip = solver.indexOf(bracket.tip);
      const ia = solver.indexOf(station.a), ib = solver.indexOf(station.b);
      const axes: Array<[number, () => number, () => number]> = [
        [0, () => Math.max(0.05, p172.spreaderLengthM), () => p172.bracketSideComplianceMPerN],
        [1, () => p172.spreaderSweepM, () => p172.bracketForeComplianceMPerN],
        [2, () => p172.spreaderAxialOffsetM, () => p172.bracketAxialComplianceMPerN],
      ];
      for (const [axis, target, alpha] of axes) {
        solver.addRow({
          label: `spreader-${side ? 'stb' : 'port'}-${['side', 'fore', 'axial'][axis]}`, group: 'spreader',
          type: RigRowType.BRACKET, axis, side, a: S.node(tip), station: S.seg(ia, ib, station.t), mastIndex: ia,
          target: target(), alpha: alpha(),
          refresh: (row) => { row.target = target(); row.alpha = Math.max(0, alpha()); },
        });
        count('spreader');
      }
      toRemove.add(bracket);
    });

    // ---- routed shrouds (V17.2): chainplate → spreader tip → hounds, tension only
    (r172.routedShrouds as any[]).forEach((cable) => {
      solver.addRow({
        label: cable.label, group: 'shroud', type: RigRowType.PULLEY, uni: -1,
        a: ep(cable.endpointA), s: ep(cable.sheaveEndpoint), b: ep(cable.endpointB),
        source: cable, rest: cable.rest, alpha: cable.alpha, refresh: fromSource,
      });
      toRemove.add(cable);
      count('shroud');
    });

    // ---- V16 standing cables: diamonds, safety forestay, jib halyard
    for (const cable of v16.standingRigConstraints as any[]) {
      const label: string = cable.label ?? '';
      if (label === 'port-shroud' || label === 'starboard-shroud') continue; // superseded by V17.2
      const isPulley = !!cable.sheaveEndpoint;
      solver.addRow({
        label, group: label.includes('diamond') ? 'diamond' : label.includes('halyard') ? 'halyard' : 'forestay',
        type: isPulley ? RigRowType.PULLEY : RigRowType.DIST, uni: -1,
        a: ep(cable.endpointA), ...(isPulley ? { s: ep(cable.sheaveEndpoint) } : {}), b: ep(cable.endpointB),
        source: cable, rest: cable.rest, alpha: cable.alpha, refresh: fromSource,
      });
      toRemove.add(cable);
      count('standing');
    }

    // ---- jib luff wire and tack shackle
    const luffCons: any[] = jib.vertCons?.[0] ?? [];
    for (const c of luffCons) {
      solver.addRow({
        label: `jib-luff-${luff.indexOf(c.a)}`, group: 'jib-luff', type: RigRowType.DIST,
        a: S.node(solver.indexOf(c.a)), b: S.node(solver.indexOf(c.b)),
        source: c, rest: c.rest, alpha: c.alpha, refresh: fromSource,
      });
      toRemove.add(c);
      count('jib-luff');
    }
    const tack = constraints.find((c) => c?.body === body && c.p === luff[0]);
    if (tack) {
      solver.addRow({
        label: 'jib-tack', group: 'jib-luff', type: RigRowType.DIST,
        a: S.bodyPoint(tack.local), b: S.node(solver.indexOf(luff[0])),
        source: tack, rest: tack.rest, alpha: tack.alpha, refresh: fromSource,
      });
      toRemove.add(tack);
      count('jib-tack');
    }

    // ---- gooseneck (point on mast segment ↔ boom inboard end)
    const goose = constraints.find((c) => c?.pA && c?.pB && c.p === boom[0] && mastIndex.has(c.pA) && mastIndex.has(c.pB));
    if (!goose) throw new Error('gooseneck not found');
    const gooseAft = this.gooseneckAftOffsetM;
    for (let k = 0; k < 3; k++) {
      solver.addRow({
        label: `gooseneck-${'xyz'[k]}`, group: 'gooseneck', type: RigRowType.AXIS, axis: k,
        a: S.seg(mastIndex.get(goose.pA)!, mastIndex.get(goose.pB)!, goose.t, gooseAft), b: S.node(solver.indexOf(boom[0])),
        alpha: goose.alpha ?? 0, refresh: (row) => { row.alpha = Math.max(0, goose.alpha ?? 0); },
      });
      count('gooseneck');
    }
    toRemove.add(goose);
    // The main tack rides the luff track just aft of the mast; its lashing to
    // the gooseneck is a short tension-only link (legacy: a 60 mm rigid bar
    // that fought the track by ~3 kN once the gooseneck was solved exactly).
    const mainTack = master.sails?.main?.cloth?.parts?.[0]?.[0];
    const tackLink = constraints.find((c) => c && !c.body && typeof c.rest === 'number'
      && ((c.a === mainTack && c.b === boom[0]) || (c.b === mainTack && c.a === boom[0])));
    if (tackLink) {
      const trackAft = (v16.helpers?.mastRadiusAt?.(0) ?? 0.032) + (p16.mastTrackClearanceM ?? 0.004) + 0.5 * (p16.clothThicknessM ?? 0.007);
      this.patched.push({ constraint: tackLink, rest: tackLink.rest, uni: tackLink.uni });
      tackLink.rest = Math.max(0.012, Math.abs(gooseAft - trackAft) + 0.006);
      tackLink.uni = 'tension';
      count('main-tack-link-patched');
    }

    // ---- boom: stretch, bending (replaces the legacy long distance links), vang
    const boomRest: number[] = [];
    for (const c of constraints) {
      if (!c?.a || !c?.b || c.body || c.c || typeof c.rest !== 'number' || c.enabled === false) continue;
      const ia = boomIndex.get(c.a), ib = boomIndex.get(c.b);
      if (ia === undefined || ib === undefined) continue;
      if (Math.abs(ia - ib) === 1) {
        boomRest[Math.min(ia, ib)] = c.rest;
        solver.addRow({
          label: `boom-stretch-${Math.min(ia, ib)}`, group: 'boom', type: RigRowType.DIST,
          a: S.node(solver.indexOf(c.a)), b: S.node(solver.indexOf(c.b)),
          source: c, rest: c.rest, alpha: c.alpha, refresh: fromSource,
        });
        count('boom-stretch');
      } else {
        count('boom-legacy-long-removed');
      }
      toRemove.add(c);
    }
    for (let i = 1; i < boom.length - 1; i++) {
      const l1 = boomRest[i - 1] ?? boom[i].x.distanceTo(boom[i - 1].x);
      const l2 = boomRest[i] ?? boom[i + 1].x.distanceTo(boom[i].x);
      for (const plane of [0, 1]) {
        const ei = (): number => (plane === 0 ? this.solver!.params.boomEiVerticalNm2 : this.solver!.params.boomEiLateralNm2);
        solver.addRow({
          label: `boom-bend-${plane ? 'lateral' : 'vertical'}-${i}`, group: 'boom-bend', type: RigRowType.BEND,
          n: [solver.indexOf(boom[i - 1]), solver.indexOf(boom[i]), solver.indexOf(boom[i + 1])],
          l1, l2, plane, ref: 1, alpha: (l1 + l2) / (2 * 9000),
          refresh: (row) => { row.alpha = (row.l1! + row.l2!) / (2 * Math.max(100, ei())); },
        });
        count('boom-bend');
      }
    }
    const vang = rig.vangC;
    if (vang?.a && vang?.b) {
      solver.addRow({
        label: 'vang', group: 'vang', type: RigRowType.DIST, uni: vang.uni === 'tension' ? -1 : 0,
        a: S.node(solver.indexOf(vang.a)), b: S.node(solver.indexOf(vang.b)),
        source: vang, rest: vang.rest, alpha: vang.alpha, refresh: fromSource,
      });
      toRemove.add(vang);
      count('vang');
    }

    this.solver = solver;
    solver.finalize();

    // ---- swap the constraints out of the world list
    const removed: Removed[] = [];
    constraints.forEach((c, index) => { if (toRemove.has(c)) removed.push({ constraint: c, index }); });
    const firstIndex = removed.length ? removed[0]!.index : constraints.length;
    for (let k = removed.length - 1; k >= 0; k--) constraints.splice(removed[k]!.index, 1);
    constraints.splice(Math.min(firstIndex, constraints.length), 0, solver);
    this.removed = removed;
    this.groups = groups;
    this.installed = true;
    this.lastError = null;
    this.tuneRig();
  }

  /** Result of the last dock tune (N, m). */
  tune: Record<string, number> | null = null;

  /**
   * Dock tune: make the as-designed rig (straight mast on its step) the
   * equilibrium of the pre-stressed structure. The shrouds carry the V16
   * standing pretension; the jib halyard is taken up until the luff tension
   * balances their fore-and-aft moment about the mast step; the diamonds keep
   * their V16 pretension. Rest lengths are re-derived from the design geometry
   * so that stale lengths measured after the legacy rig had moved cannot leave
   * the rig slack.
   */
  tuneRig(): void {
    const master = this.context?.legacy.master;
    const v16 = (window as any).LASER2_RIGGING_V16;
    const r172 = (window as any).LASER2_SPREADER_RIG_V17_2;
    if (!master || !v16?.helpers?.designToWorld || !r172) return;
    const rig = master.rig;
    const body = master.body;
    const Vec3 = body.pos.constructor;
    const d2w = (d: any): any => v16.helpers.designToWorld(d, new Vec3());
    const step = rig.stepD;
    const station = (z: number): any => d2w(new Vec3(step.x, step.y + z, step.z));
    const foot = station(0);
    const bodyX = new Vec3(1, 0, 0).applyQuaternion(body.quat);
    const moment = (at: any, force: any): number => at.clone().sub(foot).cross(force).dot(bodyX);
    const unit = (from: any, to: any): any => to.clone().sub(from).normalize();
    const p172 = r172.params;
    // Shrouds (unit tension): hounds pull toward the tip; the socket carries the tip's net load.
    let shroudMoment = 0;
    r172.routedShrouds.forEach((cable: any, side: number) => {
      const sign = side === 0 ? -1 : 1;
      const st = new Vec3(step.x, step.y + p172.mastSpreaderStationM, step.z);
      const tipD = st.clone().add(new Vec3(sign * p172.spreaderLengthM, p172.spreaderAxialOffsetM, p172.spreaderSweepM));
      const tip = d2w(tipD);
      const stW = d2w(st);
      const hounds = station(p172.mastHoundsStationM);
      const chain = body.localToWorld(cable.endpointA.local, new Vec3());
      const fH = unit(hounds, tip);
      const fS = unit(tip, chain).add(unit(tip, hounds));
      shroudMoment += moment(hounds, fH) + moment(stW, fS);
      cable.untunedLength = chain.distanceTo(tip) + tip.distanceTo(hounds);
      cable.configure?.();
    });
    // Diamonds at their design lengths (V16 keeps its 310 N pretension).
    for (const cable of v16.standingRigConstraints as any[]) {
      if (!String(cable.label).includes('diamond')) continue;
      const side = String(cable.label).startsWith('port') ? 0 : 1;
      const sign = side === 0 ? -1 : 1;
      const st = new Vec3(step.x, step.y + p172.mastSpreaderStationM, step.z);
      const tip = d2w(st.clone().add(new Vec3(sign * p172.spreaderLengthM, p172.spreaderAxialOffsetM, p172.spreaderSweepM)));
      const other = String(cable.label).includes('upper') ? station(cable.endpointA.zM ?? 4.21) : station(cable.endpointB.zM ?? 0.36);
      cable.v16UntunedLength = tip.distanceTo(other);
    }
    // Jib halyard: tack → luff (straight under tension) → sheave → rack.
    const halyard = (v16.standingRigConstraints as any[]).find((c) => String(c.label).includes('halyard'));
    const tackC = this.solver?.rows.find((r) => r.label === 'jib-tack')?.source;
    const luffRows = this.solver?.rows.filter((r) => r.group === 'jib-luff' && r.label !== 'jib-tack') ?? [];
    if (!halyard || !tackC || !luffRows.length) return;
    const sheave = station(halyard.sheaveEndpoint.zM ?? 3.75);
    const rack = station(halyard.endpointB.zM ?? 0.38);
    const tackPoint = body.localToWorld(tackC.local, new Vec3());
    const luffRest = luffRows.reduce((a, r) => a + r.source.rest, 0) + tackC.rest;
    const luffAlpha = luffRows.reduce((a, r) => a + Math.max(0, r.source.alpha), 0) + Math.max(0, tackC.alpha);
    const Ts = Math.max(0, v16.params.standingRigPretensionN * v16.params.standingRigTensionScale);
    // Moment of unit halyard/luff tension (head on the straight luff line).
    const toSheave = unit(tackPoint, sheave);
    let Tl = 0;
    for (let it = 0; it < 3; it++) {
      const head = tackPoint.clone().addScaledVector(toSheave, luffRest + Tl * luffAlpha);
      const fSheave = unit(sheave, head).add(unit(sheave, rack));
      const fRack = unit(rack, sheave);
      const halyardMoment = moment(sheave, fSheave) + moment(rack, fRack);
      Tl = Math.abs(halyardMoment) > 1e-6 ? Math.max(0, (-2 * Ts * shroudMoment) / halyardMoment) : 0;
    }
    const head = tackPoint.clone().addScaledVector(toSheave, luffRest + Tl * luffAlpha);
    const pathDesign = head.distanceTo(sheave) + sheave.distanceTo(rack);
    const restTarget = pathDesign - Tl * Math.max(0, halyard.alpha);
    const scale = Math.max(1e-6, v16.params.standingRigTensionScale);
    halyard.v16UntunedLength = pathDesign;
    v16.params.jibHalyardTakeupM = (pathDesign - restTarget) / scale;
    this.tune = {
      shroudPretensionN: Ts,
      luffTensionN: +Tl.toFixed(1),
      halyardTakeupM: +v16.params.jibHalyardTakeupM.toFixed(5),
      headToSheaveM: +head.distanceTo(sheave).toFixed(4),
      shroudMomentPerN: +shroudMoment.toFixed(4),
    };
  }

  uninstall(): void {
    const world = this.context?.legacy.master?.physics;
    if (!world) return;
    const constraints: any[] = world.constraints;
    if (this.solver) {
      const i = constraints.indexOf(this.solver);
      if (i >= 0) constraints.splice(i, 1);
    }
    for (const { constraint, index } of this.removed) constraints.splice(Math.min(index, constraints.length), 0, constraint);
    this.removed = [];
    for (const { constraint, rest, uni } of this.patched) { constraint.rest = rest; constraint.uni = uni; }
    this.patched = [];
    this.installed = false;
  }

  /** Masthead offset from the extension of the foot→hounds line, body frame (m). */
  mastheadOffset(): { sideM: number; foreM: number } {
    const master = this.context?.legacy.master;
    const mast = master?.rig?.mast;
    const body = master?.body;
    if (!mast || !body) return { sideM: 0, foreM: 0 };
    const inv = body.quat.clone().invert();
    const n = mast.length;
    const houndsI = Math.min(n - 1, Math.round(3.74 / master.rig.segLen));
    const base = mast[0].x;
    const d1 = mast[houndsI].x.clone().sub(base).applyQuaternion(inv);
    const d2 = mast[n - 1].x.clone().sub(base).applyQuaternion(inv);
    const s = d2.y / Math.max(1e-6, d1.y);
    return { sideM: +(d2.x - d1.x * s).toFixed(4), foreM: +(d2.z - d1.z * s).toFixed(4) };
  }

  telemetry(): Record<string, unknown> {
    const solver = this.solver;
    if (!solver) return { installed: this.installed, lastError: this.lastError };
    const byGroup = (g: string) => solver.rows.filter((r) => r.group === g);
    const tensions = (g: string) => byGroup(g).map((r) => +Math.max(0, r.tensionN).toFixed(0));
    const luffT = byGroup('jib-luff').map((r) => r.tensionN);
    const stretch = byGroup('mast-stretch');
    return {
      installed: this.installed,
      lastError: this.lastError,
      groups: this.groups,
      matrix: solver.matrixStats,
      stats: { ...solver.stats },
      shroudsN: tensions('shroud'),
      diamondsN: tensions('diamond'),
      halyardN: tensions('halyard'),
      forestayN: tensions('forestay'),
      vangN: tensions('vang'),
      jibLuffMeanN: luffT.length ? +(luffT.reduce((a, b) => a + b, 0) / luffT.length).toFixed(0) : 0,
      mastFootCompressionN: stretch.length ? +(-stretch[0]!.tensionN).toFixed(0) : 0,
      tune: this.tune,
      masthead: this.mastheadOffset(),
    };
  }
}
