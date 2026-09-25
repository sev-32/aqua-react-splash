// Strip-theory lifting-surface model for the centreboard and rudder, valid at
// any hull attitude.
//
// Each foil is a flat planform divided into spanwise strips. Per strip the
// relative flow (hull point velocity minus orbital water velocity) is split
// into chordwise/normal components; lift follows the finite-wing slope up to
// stall and blends to flat-plate normal force after it, drag is profile +
// induced + separated. A normal cross-flow damping term acts even at zero
// forward speed (roll/yaw damping of a becalmed or capsized hull). Strips near
// the surface ventilate; strips in air receive aerodynamic drag only, which is
// what the upturned board of a capsized boat experiences.

import type { WaterSampler, AirSampler } from './HullHydrostatics.js';

export interface FoilSpec {
  name: 'board' | 'rudder';
  /** Design-frame root (top) and tip (bottom) of the quarter-chord line. */
  rootY: number;
  tipY: number;
  z: number;
  chord: number;
  stallDeg: number;
  cd0: number;
  oswald: number;
  /** Chordwise offset of the centre of pressure aft of the reference line (m). */
  cpAftM: number;
  strips: number;
}

export interface FoilState {
  liftN: number;
  dragN: number;
  crossflowN: number;
  maxAlphaDeg: number;
  immersed01: number;
  stalled: boolean;
  hingeMomentNm: number;
}

export const emptyFoilState = (): FoilState => ({ liftN: 0, dragN: 0, crossflowN: 0, maxAlphaDeg: 0, immersed01: 0, stalled: false, hingeMomentNm: 0 });

export interface BodyForceSink {
  /** Adds a world force at a world point to the hull body. */
  addForceAt(fx: number, fy: number, fz: number, px: number, py: number, pz: number): void;
}

export interface FoilPose {
  px: number; py: number; pz: number;
  /** Rotation matrix rows (body → world). */
  r: Float64Array;
  vx: number; vy: number; vz: number;
  wx: number; wy: number; wz: number;
  /** Body reference offset subtracted from design coordinates. */
  refY: number; refZ: number;
}

const RHO_WATER = 1025;
const RHO_AIR = 1.225;

export class FoilModel {
  readonly spec: FoilSpec;
  readonly state: FoilState = emptyFoilState();
  /** Deployment 0..1 (fraction of span lowered). */
  deployment = 1;
  private readonly sample = { height: 0, vx: 0, vy: 0, vz: 0 };
  private readonly air = { x: 0, y: 0, z: 0 };

  constructor(spec: FoilSpec) {
    this.spec = spec;
  }

  get area(): number { return Math.abs(this.spec.rootY - this.spec.tipY) * this.spec.chord; }

  /** Design-frame point on the foil at span fraction s (0 root, 1 tip). */
  pointDesign(s: number): { x: number; y: number; z: number } {
    const span = (this.spec.rootY - this.spec.tipY) * this.deployment;
    return { x: 0, y: this.spec.rootY - span * s, z: this.spec.z };
  }

  apply(pose: FoilPose, angleRad: number, water: WaterSampler, air: AirSampler | null, sink: BodyForceSink): FoilState {
    const spec = this.spec;
    const st = this.state;
    st.liftN = st.dragN = st.crossflowN = st.maxAlphaDeg = st.immersed01 = st.hingeMomentNm = 0;
    st.stalled = false;
    const dep = Math.max(0, Math.min(1, this.deployment));
    if (dep <= 1e-3) return st;
    const r = pose.r;
    // Body axes in world space.
    const upx = r[1]!, upy = r[4]!, upz = r[7]!;
    const spanx = -upx, spany = -upy, spanz = -upz;
    let chx = r[2]!, chy = r[5]!, chz = r[8]!; // body +Z (forward)
    if (angleRad !== 0) {
      // Rotate the chord about the (body) up axis by -angle (legacy convention).
      const c = Math.cos(-angleRad), s = Math.sin(-angleRad);
      const kx = upx, ky = upy, kz = upz;
      const dot = kx * chx + ky * chy + kz * chz;
      const cx = ky * chz - kz * chy, cy = kz * chx - kx * chz, cz = kx * chy - ky * chx;
      const nx = chx * c + cx * s + kx * dot * (1 - c);
      const ny = chy * c + cy * s + ky * dot * (1 - c);
      const nz = chz * c + cz * s + kz * dot * (1 - c);
      chx = nx; chy = ny; chz = nz;
    }
    // Foil normal = chord × span.
    let nrx = chy * spanz - chz * spany, nry = chz * spanx - chx * spanz, nrz = chx * spany - chy * spanx;
    const nl = Math.hypot(nrx, nry, nrz) || 1;
    nrx /= nl; nry /= nl; nrz /= nl;

    const fullSpan = (spec.rootY - spec.tipY);
    const span = fullSpan * dep;
    const n = Math.max(3, spec.strips | 0);
    const ds = span / n;
    const stripArea = spec.chord * ds;
    const aspect = (span * span) / Math.max(1e-6, span * spec.chord);
    const liftSlope = (2 * Math.PI) / (1 + (2 * Math.PI) / (Math.PI * spec.oswald * Math.max(0.35, aspect)));
    const stall = (spec.stallDeg * Math.PI) / 180;
    let immersed = 0;
    for (let k = 0; k < n; k++) {
      const yDesign = spec.rootY - (k + 0.5) * ds;
      // Design → body → world (design x = 0).
      const lx = 0, ly = yDesign - pose.refY, lz = spec.z - pose.refZ - spec.cpAftM;
      const wx = pose.px + r[0]! * lx + r[1]! * ly + r[2]! * lz;
      const wy = pose.py + r[3]! * lx + r[4]! * ly + r[5]! * lz;
      const wz = pose.pz + r[6]! * lx + r[7]! * ly + r[8]! * lz;
      const rx = wx - pose.px, ry = wy - pose.py, rz = wz - pose.pz;
      const vbx = pose.vx + pose.wy * rz - pose.wz * ry;
      const vby = pose.vy + pose.wz * rx - pose.wx * rz;
      const vbz = pose.vz + pose.wx * ry - pose.wy * rx;
      const s = water.sample(wx, wy, wz, this.sample);
      const depth = s.height - wy;
      const wet = smoothstep(-0.02, Math.max(0.05, ds * 0.8), depth);
      if (wet < 0.999 && air) {
        // Aerodynamic drag on the dry part of the strip.
        const a = air.velocity(wx, wy, wz, this.air);
        let fx = a.x - vbx, fy = a.y - vby, fz = a.z - vbz;
        const fn = fx * nrx + fy * nry + fz * nrz;
        const q = 0.5 * RHO_AIR * 1.2 * stripArea * (1 - wet) * fn * Math.abs(fn);
        fx = nrx * q; fy = nry * q; fz = nrz * q;
        sink.addForceAt(fx, fy, fz, wx, wy, wz);
      }
      if (wet <= 1e-4) continue;
      immersed += wet;
      let fx = vbx - s.vx, fy = vby - s.vy, fz = vbz - s.vz;
      // Normal cross-flow damping (radiation + separated normal drag).
      const vn = fx * nrx + fy * nry + fz * nrz;
      const cross = -(90 * stripArea * wet * vn + 0.5 * RHO_WATER * 1.15 * stripArea * wet * vn * Math.abs(vn));
      const crossClamped = Math.max(-1600, Math.min(1600, cross));
      st.crossflowN += Math.abs(crossClamped);
      let tfx = nrx * crossClamped, tfy = nry * crossClamped, tfz = nrz * crossClamped;
      // Lift/drag from the chord-plane flow.
      const vsp = fx * spanx + fy * spany + fz * spanz;
      fx -= vsp * spanx; fy -= vsp * spany; fz -= vsp * spanz;
      const speed = Math.hypot(fx, fy, fz);
      if (speed > 0.03) {
        const ux = fx / speed, uy = fy / speed, uz = fz / speed; // body motion direction through water
        const alpha = Math.atan2(ux * nrx + uy * nry + uz * nrz, ux * chx + uy * chy + uz * chz);
        const aa = Math.abs(alpha);
        st.maxAlphaDeg = Math.max(st.maxAlphaDeg, (aa * 180) / Math.PI);
        if (aa >= stall) st.stalled = true;
        let cl: number;
        if (aa <= stall) cl = liftSlope * alpha;
        else {
          const blend = Math.min(1, (aa - stall) / 0.3);
          const clStall = liftSlope * stall * Math.sign(alpha);
          cl = clStall + (1.05 * Math.sin(2 * alpha) - clStall) * blend;
        }
        cl = Math.max(-1.45, Math.min(1.45, cl));
        const cd = spec.cd0 + (cl * cl) / (Math.PI * spec.oswald * Math.max(0.35, aspect)) + (aa > stall ? 0.55 * (aa - stall) : 0);
        const vent = smoothstep(0, 0.2, depth);
        const q = 0.5 * RHO_WATER * speed * speed * stripArea * wet * vent;
        // Lift ⟂ motion within the chord plane: L̂ = span × û. With the normal
        // n = chord × span, positive alpha (motion towards +n) gives L̂·n < 0,
        // so +L̂·C_L opposes the leeway (checked against the V14 authority).
        let lx2 = spany * uz - spanz * uy, ly2 = spanz * ux - spanx * uz, lz2 = spanx * uy - spany * ux;
        const ll = Math.hypot(lx2, ly2, lz2) || 1;
        lx2 /= ll; ly2 /= ll; lz2 /= ll;
        const liftN = q * cl, dragN = q * cd;
        tfx += lx2 * liftN - ux * dragN;
        tfy += ly2 * liftN - uy * dragN;
        tfz += lz2 * liftN - uz * dragN;
        st.liftN += Math.abs(liftN);
        st.dragN += Math.abs(dragN);
      }
      sink.addForceAt(tfx, tfy, tfz, wx, wy, wz);
      if (spec.name === 'rudder') st.hingeMomentNm += (tfx * nrx + tfy * nry + tfz * nrz) * spec.cpAftM;
    }
    st.immersed01 = immersed / n;
    return st;
  }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-9, b - a)));
  return t * t * (3 - 2 * t);
}
