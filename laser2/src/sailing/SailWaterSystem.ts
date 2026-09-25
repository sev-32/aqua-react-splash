// Sailcloth in the water.
//
// The V16 rig treated submerged sail particles with an isotropic, capped drag
// and a depth spring that floated the cloth on the surface. A capsized sail
// behaves very differently: it is a thin sheet slightly denser than water
// that lies just under the surface, strongly resists motion normal to itself
// (it is the capsized boat's sea anchor and the load the righting crew has to
// lift) and slides almost freely in its own plane. When it is pulled out it
// carries a film of water that drains over a second or two.
//
// Per cloth triangle, every XPBD sub-step:
//   - immersion from the centroid depth in the shared ocean field,
//   - normal pressure drag ½ρ·Cn·A·|w_n|w_n (Cn larger when the sheet is
//     being peeled upwards out of the water: suction / slamming),
//   - two-sided skin friction on the tangential relative velocity,
//   - buoyancy of the cloth volume (Dacron ≈ 1380 kg/m³: net sinking),
// with the quadratic drags integrated implicitly so the very light cloth
// particles stay stable. Cloth under the surface receives no wind load (the
// V16 strip aerodynamics is scaled away particle by particle), and retained
// water is added to the particle masses, so the solver (and the rig that
// carries the sail) feels the heavier, wet sail.

import type { AppContext, AppSystem } from '../core/System.js';
import type { SailingAuthority } from './SailingModeSystem.js';
import type { OceanSystem } from '../water/OceanSystem.js';
import type { WaveSample } from '../water/OceanWaveField.js';

interface ClothTri {
  a: any; b: any; c: any;
  /** Mass share of the three particles owned by this triangle (kg). */
  massKg: number;
  /** Retained surface water on the triangle (kg). */
  filmKg: number;
  areaM2: number;
  immersion: number;
}

interface ClothRecord {
  id: 'main' | 'jib' | 'spin';
  cloth: any;
  tris: ClothTri[];
  /** Dry inverse masses of the particles (restored on uninstall). */
  dryW: Float64Array;
  /** Water film mass currently attributed to each particle (kg). */
  particleFilm: Float64Array;
  index: Map<any, number>;
}

export class SailWaterSystem implements AppSystem, SailingAuthority {
  readonly id = 'sailing.sail-water';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  /** Flat-plate normal drag coefficient of submerged sailcloth. */
  normalCd = 1.28;
  /** Normal drag while the sheet is peeled upwards out of the water. */
  exitCd = 2.4;
  /** Skin friction coefficient per face (two faces wetted). */
  frictionCf = 0.011;
  clothDensity = 1380;
  /** Water retained by a sail pulled out of the water (kg/m²). */
  filmKgPerM2 = 0.4;
  filmHalfLifeS = 1.2;
  private context: AppContext | null = null;
  private installed = false;
  private records: ClothRecord[] = [];
  private hookFn: ((dt: number) => void) | null = null;
  private readonly sample: WaveSample = { height: 0, vx: 0, vy: 0, vz: 0 };
  private stats = { immersedAreaM2: 0, normalForceN: 0, frictionForceN: 0, filmKg: 0, aeroRemovedN: 0, hookMs: 0, substeps: 0 };

  constructor(readonly ocean: OceanSystem) {}

  init(context: AppContext): void {
    this.context = context;
  }

  private buildRecords(context: AppContext): void {
    const sails = context.legacy.master.sails ?? {};
    this.records = [];
    for (const id of ['main', 'jib', 'spin'] as const) {
      const cloth = sails[id]?.cloth;
      if (!cloth?.flat?.length || !cloth.tris?.length) continue;
      const flat: any[] = cloth.flat;
      const index = new Map<any, number>();
      flat.forEach((p, i) => index.set(p, i));
      const valence = new Uint16Array(flat.length);
      for (const t of cloth.tris as number[][]) { for (const k of t) valence[k] = valence[k]! + 1; }
      const dryW = new Float64Array(flat.length);
      flat.forEach((p, i) => { dryW[i] = p.w; });
      const massOf = (i: number): number => (dryW[i]! > 0 ? 1 / dryW[i]! : 0) / Math.max(1, valence[i]!);
      const tris: ClothTri[] = cloth.tris.map((t: number[]) => ({
        a: flat[t[0]!], b: flat[t[1]!], c: flat[t[2]!],
        massKg: massOf(t[0]!) + massOf(t[1]!) + massOf(t[2]!),
        filmKg: 0, areaM2: 0, immersion: 0,
      }));
      this.records.push({ id, cloth, tris, dryW, particleFilm: new Float64Array(flat.length), index });
    }
  }

  install(context: AppContext): void {
    if (this.installed) return;
    const world = context.legacy.master.physics;
    if (!world) throw new Error('legacy physics unavailable');
    this.buildRecords(context);
    const v16 = window.LASER2_RIGGING_V16;
    if (v16?.params) v16.params.externalClothWater = true;
    this.hookFn = (dt: number): void => this.hook(dt);
    world.forceHooks.push(this.hookFn);
    this.installed = true;
  }

  uninstall(context: AppContext): void {
    if (!this.installed) return;
    const world = context.legacy.master.physics;
    const i = world?.forceHooks?.indexOf(this.hookFn) ?? -1;
    if (i >= 0) world.forceHooks.splice(i, 1);
    const v16 = window.LASER2_RIGGING_V16;
    if (v16?.params) v16.params.externalClothWater = false;
    for (const record of this.records) {
      record.cloth.flat.forEach((p: any, k: number) => { p.w = record.dryW[k]; });
    }
    this.records = [];
    this.installed = false;
  }

  onSailingReset(context: AppContext): void {
    for (const record of this.records) {
      record.particleFilm.fill(0);
      for (const tri of record.tris) tri.filmKg = 0;
      record.cloth.flat.forEach((p: any, k: number) => { p.w = record.dryW[k]; });
    }
    void context;
  }

  private hook(dt: number): void {
    if (!this.enabled) return;
    const started = performance.now();
    const rho = 1025;
    const g = 9.81;
    const drain = Math.exp((-Math.LN2 * dt) / Math.max(0.05, this.filmHalfLifeS));
    const spinPhysical = window.LASER2_RIGGING_V16?.helpers?.isSpinnakerPhysical?.() ?? false;
    let immersedArea = 0, normalForce = 0, frictionForce = 0, filmTotal = 0;
    for (const record of this.records) {
      if (record.id === 'spin' && !spinPhysical) continue;
      const film = record.particleFilm;
      film.fill(0);
      // The V16 strip aerodynamics knows nothing about the water: remove the
      // air load from cloth that is under the surface (a sail lying in the
      // water must not be lifted by the wind blowing over the sea).
      let aeroRemoved = 0;
      for (const p of record.cloth.flat) {
        const depth = this.ocean.height(p.x.x, p.x.z) - p.x.y;
        const wet = Math.min(1, Math.max(0, (depth + 0.012) / 0.024));
        if (wet <= 0) continue;
        aeroRemoved += wet * Math.hypot(p.f.x, p.f.y, p.f.z);
        const keep = 1 - wet;
        p.f.x *= keep; p.f.y *= keep; p.f.z *= keep;
      }
      this.stats.aeroRemovedN = aeroRemoved;
      for (const tri of record.tris) {
        const a = tri.a.x, b = tri.b.x, c = tri.c.x;
        const e1x = b.x - a.x, e1y = b.y - a.y, e1z = b.z - a.z;
        const e2x = c.x - a.x, e2y = c.y - a.y, e2z = c.z - a.z;
        let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
        const twiceArea = Math.hypot(nx, ny, nz);
        if (twiceArea < 1e-9) continue;
        nx /= twiceArea; ny /= twiceArea; nz /= twiceArea;
        const area = 0.5 * twiceArea;
        tri.areaM2 = area;
        const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
        const h = this.ocean.height(cx, cz);
        const depth = h - cy;
        // The sheet is ~1 mm thick; blend over ±12 mm for the rippled surface.
        const imm = Math.min(1, Math.max(0, (depth + 0.012) / 0.024));
        tri.immersion = imm;
        // Retained water: refilled while wetted, draining once out.
        if (imm > 0.5) tri.filmKg = this.filmKgPerM2 * area;
        else tri.filmKg *= drain;
        const filmOut = tri.filmKg * (1 - imm);
        if (filmOut > 1e-5) {
          const share = filmOut / 3;
          for (const p of [tri.a, tri.b, tri.c]) {
            const k = record.index.get(p)!;
            film[k] = film[k]! + share;
          }
          filmTotal += filmOut;
        }
        if (imm <= 0) continue;
        immersedArea += area * imm;
        const pa = tri.a, pb = tri.b, pc = tri.c;
        const vx = (pa.v.x + pb.v.x + pc.v.x) / 3, vy = (pa.v.y + pb.v.y + pc.v.y) / 3, vz = (pa.v.z + pb.v.z + pc.v.z) / 3;
        this.ocean.sample(cx, Math.min(cy, h), cz, this.sample);
        const wx = vx - this.sample.vx, wy = vy - this.sample.vy, wz = vz - this.sample.vz;
        const wn = wx * nx + wy * ny + wz * nz;
        const tx = wx - wn * nx, ty = wy - wn * ny, tz = wz - wn * nz;
        const wt = Math.hypot(tx, ty, tz);
        const mass = Math.max(1e-4, tri.massKg);
        // Peeling up out of the water (normal velocity with an upward
        // component near the surface) meets suction and slamming.
        const rising = wn * ny > 0 && depth > -0.02 && depth < 0.1;
        const kN = 0.5 * rho * (rising ? this.exitCd : this.normalCd) * area * imm;
        const kT = 0.5 * rho * 2 * this.frictionCf * area * imm;
        // Implicit quadratic drag: F = −k|w|w / (1 + k|w|dt/m).
        const fN = (-kN * Math.abs(wn) * wn) / (1 + (kN * Math.abs(wn) * dt) / mass);
        const fT = wt > 1e-6 ? (-kT * wt * wt) / (1 + (kT * wt * dt) / mass) : 0;
        let fx = fN * nx, fy = fN * ny, fz = fN * nz;
        if (wt > 1e-6) { fx += (fT * tx) / wt; fy += (fT * ty) / wt; fz += (fT * tz) / wt; }
        // Buoyancy of the cloth volume (the solver already applies its weight).
        fy += imm * tri.massKg * g * (rho / this.clothDensity);
        normalForce += Math.abs(fN);
        frictionForce += Math.abs(fT);
        const third = 1 / 3;
        pa.f.x += fx * third; pa.f.y += fy * third; pa.f.z += fz * third;
        pb.f.x += fx * third; pb.f.y += fy * third; pb.f.z += fz * third;
        pc.f.x += fx * third; pc.f.y += fy * third; pc.f.z += fz * third;
      }
      // Wet cloth is heavier: the retained water joins the particle masses.
      const flat = record.cloth.flat;
      for (let k = 0; k < flat.length; k++) {
        const w0 = record.dryW[k]!;
        if (!(w0 > 0)) continue;
        const extra = film[k]!;
        flat[k].w = extra > 1e-6 ? 1 / (1 / w0 + extra) : w0;
      }
    }
    this.stats.immersedAreaM2 = immersedArea;
    this.stats.normalForceN = normalForce;
    this.stats.frictionForceN = frictionForce;
    this.stats.filmKg = filmTotal;
    this.stats.substeps++;
    this.stats.hookMs = performance.now() - started;
  }

  telemetry(): Record<string, unknown> {
    return {
      installed: this.installed,
      cloths: this.records.map((r) => ({ id: r.id, triangles: r.tris.length, particles: r.cloth.flat.length })),
      coefficients: { normalCd: this.normalCd, exitCd: this.exitCd, frictionCf: this.frictionCf, clothDensity: this.clothDensity, filmKgPerM2: this.filmKgPerM2, filmHalfLifeS: this.filmHalfLifeS },
      ...this.stats,
      authority: 'per-triangle sheet hydrodynamics (implicit normal pressure drag, two-sided skin friction, cloth buoyancy) with retained-water mass; replaces the V16 floating-cloth approximation while sailing',
    };
  }
}
