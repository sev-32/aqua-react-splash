// Attitude-independent hull loads from surface integration over the closed
// sealed-volume mesh (HullGeometry.buildHullMesh).
//
// Hydrostatics: gauge pressure p = ρ g d (d = local wave elevation − point
// height) is integrated over the wetted part of every triangle. Partially wet
// triangles are clipped at the waterline using the linear depth field, and each
// wet sub-triangle contributes F = −ρ g d̄ A n at its centre of pressure
//   x_cp = Σ x_i (d_i + D) / (4 D), D = Σ d_i,
// which is exact for linear pressure. On a closed surface the sum is the
// Archimedes buoyancy and its moment for any heel, trim or inversion, so the
// righting-arm curve, capsized equilibrium and turtling emerge without
// attitude-specific terms.
//
// Hydrodynamics (per wet triangle, relative to the orbital water velocity):
// - pressure drag when the face advances into the water and weaker suction
//   when it retreats (Kerner-style), linear + quadratic in normal speed;
// - tangential skin friction with the ITTC-57 line at the hull Reynolds number;
// - dry faces receive aerodynamic pressure drag from the apparent wind, which
//   drives the drift and weather-cocking of a capsized hull.
// Wave-making resistance is not resolvable by a surface-pressure model and is
// supplied separately by the empirical hump model (SailingHydrodynamics).

import type { HullMesh } from './HullGeometry.js';

export interface WaterSampler {
  height(x: number, z: number): number;
  sample(x: number, y: number, z: number, out: { height: number; vx: number; vy: number; vz: number }): { height: number; vx: number; vy: number; vz: number };
}

export interface AirSampler {
  /** Air velocity (m/s) at world point; writes into out. */
  velocity(x: number, y: number, z: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number };
}

export interface RigidPose {
  px: number; py: number; pz: number;
  qx: number; qy: number; qz: number; qw: number;
  vx: number; vy: number; vz: number;
  wx: number; wy: number; wz: number;
}

export interface HydroCoefficients {
  rhoWater: number;
  rhoAir: number;
  g: number;
  /** Linear pressure-drag coefficient (Pa per m/s of normal advance). */
  pressureLinear: number;
  /** Quadratic pressure-drag coefficient (Pa per (m/s)²). */
  pressureQuadratic: number;
  /** Suction coefficients for retreating faces. */
  suctionLinear: number;
  suctionQuadratic: number;
  /** Exponent on |cos θ| between face normal and relative flow. */
  pressureFalloff: number;
  suctionFalloff: number;
  /** Multiplier on ITTC-57 skin friction. */
  frictionScale: number;
  /** Reference length for the Reynolds number (m). */
  frictionLength: number;
  kinematicViscosity: number;
  /** Aerodynamic normal-force coefficient for dry faces. */
  airPressureCoefficient: number;
  /** Clamp on the per-face dynamic pressure contribution (Pa) for robustness. */
  maxFacePressure: number;
  /**
   * Fraction of the along-hull (surge) relative velocity that produces face
   * pressure drag. A fair hull is streamlined longitudinally (d'Alembert: the
   * bow stagnation pressure is recovered aft); its surge resistance is skin
   * friction plus wave-making, modelled separately. Heave, roll and sideslip
   * remain fully bluff.
   */
  longitudinalPressureFactor: number;
}

export const DEFAULT_HYDRO_COEFFICIENTS: HydroCoefficients = {
  rhoWater: 1025,
  rhoAir: 1.225,
  g: 9.81,
  pressureLinear: 420,
  pressureQuadratic: 560,
  suctionLinear: 210,
  suctionQuadratic: 260,
  pressureFalloff: 0.7,
  suctionFalloff: 0.7,
  frictionScale: 1,
  frictionLength: 4.2,
  kinematicViscosity: 1.19e-6,
  airPressureCoefficient: 0.9,
  maxFacePressure: 26000,
  longitudinalPressureFactor: 0.07,
};

export interface HydroResult {
  fx: number; fy: number; fz: number;
  /** Torque about the rigid-body position. */
  tx: number; ty: number; tz: number;
  buoyancyN: number;
  submergedVolume: number;
  /** Centre of buoyancy (world). */
  cobX: number; cobY: number; cobZ: number;
  wettedArea: number;
  dryArea: number;
  pressureDragN: number;
  frictionN: number;
  windageN: number;
  wetTriangles: number;
  clippedTriangles: number;
  /** Mean water elevation over the wetted faces' waterline samples. */
  meanWaterline: number;
}

export function emptyHydroResult(): HydroResult {
  return {
    fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0,
    buoyancyN: 0, submergedVolume: 0, cobX: 0, cobY: 0, cobZ: 0,
    wettedArea: 0, dryArea: 0, pressureDragN: 0, frictionN: 0, windageN: 0,
    wetTriangles: 0, clippedTriangles: 0, meanWaterline: 0,
  };
}

/**
 * Integrates hydrostatic + hydrodynamic loads on the hull mesh. The mesh is
 * given in the rigid-body frame (design frame minus the body reference).
 */
export class HullHydrostatics {
  readonly mesh: HullMesh;
  readonly vertexCount: number;
  private readonly wx: Float64Array;
  private readonly wy: Float64Array;
  private readonly wz: Float64Array;
  private readonly depth: Float64Array;
  private readonly waterVx: Float64Array;
  private readonly waterVy: Float64Array;
  private readonly waterVz: Float64Array;
  private readonly sampleOut = { height: 0, vx: 0, vy: 0, vz: 0 };
  private readonly airOut = { x: 0, y: 0, z: 0 };
  // Clipped polygon scratch (max 4 vertices after one plane clip).
  private readonly poly = new Float64Array(4 * 7); // x,y,z,d,wvx,wvy,wvz
  coefficients: HydroCoefficients;

  constructor(mesh: HullMesh, coefficients: Partial<HydroCoefficients> = {}) {
    this.mesh = mesh;
    this.vertexCount = mesh.positions.length / 3;
    this.wx = new Float64Array(this.vertexCount);
    this.wy = new Float64Array(this.vertexCount);
    this.wz = new Float64Array(this.vertexCount);
    this.depth = new Float64Array(this.vertexCount);
    this.waterVx = new Float64Array(this.vertexCount);
    this.waterVy = new Float64Array(this.vertexCount);
    this.waterVz = new Float64Array(this.vertexCount);
    this.coefficients = { ...DEFAULT_HYDRO_COEFFICIENTS, ...coefficients };
  }

  /** World-space vertex positions of the last evaluation (for debugging/visuals). */
  get worldX(): Float64Array { return this.wx; }
  get worldY(): Float64Array { return this.wy; }
  get worldZ(): Float64Array { return this.wz; }
  get vertexDepth(): Float64Array { return this.depth; }

  compute(pose: RigidPose, water: WaterSampler, air: AirSampler | null, out: HydroResult, options: { dynamics?: boolean } = {}): HydroResult {
    const c = this.coefficients;
    const dynamics = options.dynamics !== false;
    const pos = this.mesh.positions;
    const n = this.vertexCount;
    // Rotation matrix from the quaternion.
    const { qx, qy, qz, qw } = pose;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
    const r00 = 1 - 2 * (yy + zz), r01 = 2 * (xy - wz), r02 = 2 * (xz + wy);
    const r10 = 2 * (xy + wz), r11 = 1 - 2 * (xx + zz), r12 = 2 * (yz - wx);
    const r20 = 2 * (xz - wy), r21 = 2 * (yz + wx), r22 = 1 - 2 * (xx + yy);
    // Longitudinal (body +Z) axis in world space.
    const lonX = r02, lonY = r12, lonZ = r22;
    const lonKeep = c.longitudinalPressureFactor;
    let anyWet = false;
    let waterlineSum = 0, waterlineCount = 0;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const lx = pos[o]!, ly = pos[o + 1]!, lz = pos[o + 2]!;
      const x = pose.px + r00 * lx + r01 * ly + r02 * lz;
      const y = pose.py + r10 * lx + r11 * ly + r12 * lz;
      const z = pose.pz + r20 * lx + r21 * ly + r22 * lz;
      this.wx[i] = x; this.wy[i] = y; this.wz[i] = z;
      let eta: number;
      if (dynamics) {
        const s = water.sample(x, y, z, this.sampleOut);
        eta = s.height;
        this.waterVx[i] = s.vx; this.waterVy[i] = s.vy; this.waterVz[i] = s.vz;
      } else {
        eta = water.height(x, z);
        this.waterVx[i] = 0; this.waterVy[i] = 0; this.waterVz[i] = 0;
      }
      const d = eta - y;
      this.depth[i] = d;
      if (d > 0) anyWet = true;
      if (Math.abs(d) < 0.08) { waterlineSum += eta; waterlineCount++; }
    }

    out.fx = out.fy = out.fz = 0;
    out.tx = out.ty = out.tz = 0;
    out.buoyancyN = 0;
    out.submergedVolume = 0;
    out.wettedArea = out.dryArea = 0;
    out.pressureDragN = out.frictionN = out.windageN = 0;
    out.wetTriangles = out.clippedTriangles = 0;
    out.meanWaterline = waterlineCount ? waterlineSum / waterlineCount : pose.py;
    let cobX = 0, cobY = 0, cobZ = 0, cobW = 0;

    const tri = this.mesh.triangles;
    const rhoG = c.rhoWater * c.g;
    // ITTC-57 skin friction at the current hull speed through the water.
    const speed = Math.hypot(pose.vx, pose.vy, pose.vz);
    const reynolds = Math.max(2e5, (speed * c.frictionLength) / c.kinematicViscosity);
    const cf = (0.075 / Math.pow(Math.log10(reynolds) - 2, 2)) * c.frictionScale;
    const poly = this.poly;

    for (let t = 0; t < tri.length; t += 3) {
      const ia = tri[t]!, ib = tri[t + 1]!, ic = tri[t + 2]!;
      const da = this.depth[ia]!, db = this.depth[ib]!, dc = this.depth[ic]!;
      // Face normal (world) and area.
      const ax = this.wx[ia]!, ay = this.wy[ia]!, az = this.wz[ia]!;
      const bx = this.wx[ib]!, by = this.wy[ib]!, bz = this.wz[ib]!;
      const cx = this.wx[ic]!, cy = this.wy[ic]!, cz = this.wz[ic]!;
      let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
      let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const twiceArea = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (twiceArea < 1e-12) continue;
      nx /= twiceArea; ny /= twiceArea; nz /= twiceArea;
      const fullArea = 0.5 * twiceArea;

      const wetCount = (da > 0 ? 1 : 0) + (db > 0 ? 1 : 0) + (dc > 0 ? 1 : 0);
      if (wetCount === 0) {
        out.dryArea += fullArea;
        if (air && dynamics) this.applyWindage(pose, ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, fullArea, air, out);
        continue;
      }
      out.wetTriangles++;
      // Build the wet polygon (Sutherland–Hodgman against d = 0).
      let count = 0;
      const verts = [ia, ib, ic];
      for (let e = 0; e < 3; e++) {
        const i0 = verts[e]!, i1 = verts[(e + 1) % 3]!;
        const d0 = this.depth[i0]!, d1 = this.depth[i1]!;
        if (d0 > 0) {
          const o = count * 7;
          poly[o] = this.wx[i0]!; poly[o + 1] = this.wy[i0]!; poly[o + 2] = this.wz[i0]!; poly[o + 3] = d0;
          poly[o + 4] = this.waterVx[i0]!; poly[o + 5] = this.waterVy[i0]!; poly[o + 6] = this.waterVz[i0]!;
          count++;
        }
        if ((d0 > 0) !== (d1 > 0)) {
          const s = d0 / (d0 - d1);
          const o = count * 7;
          poly[o] = this.wx[i0]! + (this.wx[i1]! - this.wx[i0]!) * s;
          poly[o + 1] = this.wy[i0]! + (this.wy[i1]! - this.wy[i0]!) * s;
          poly[o + 2] = this.wz[i0]! + (this.wz[i1]! - this.wz[i0]!) * s;
          poly[o + 3] = 0;
          poly[o + 4] = this.waterVx[i0]! + (this.waterVx[i1]! - this.waterVx[i0]!) * s;
          poly[o + 5] = this.waterVy[i0]! + (this.waterVy[i1]! - this.waterVy[i0]!) * s;
          poly[o + 6] = this.waterVz[i0]! + (this.waterVz[i1]! - this.waterVz[i0]!) * s;
          count++;
        }
      }
      if (wetCount < 3) {
        out.clippedTriangles++;
        if (air && dynamics) {
          // Dry remainder receives windage in proportion to its share of the face.
          const wetShare = wetCount === 1 ? 0.25 : 0.75;
          this.applyWindage(pose, ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, fullArea * (1 - wetShare), air, out);
        }
      }
      // Fan-triangulate the wet polygon (3 or 4 vertices).
      for (let k = 1; k + 1 < count; k++) {
        const o0 = 0, o1 = k * 7, o2 = (k + 1) * 7;
        const px0 = poly[o0]!, py0 = poly[o0 + 1]!, pz0 = poly[o0 + 2]!, d0 = poly[o0 + 3]!;
        const px1 = poly[o1]!, py1 = poly[o1 + 1]!, pz1 = poly[o1 + 2]!, d1 = poly[o1 + 3]!;
        const px2 = poly[o2]!, py2 = poly[o2 + 1]!, pz2 = poly[o2 + 2]!, d2 = poly[o2 + 3]!;
        const ex = px1 - px0, ey = py1 - py0, ez = pz1 - pz0;
        const fx2 = px2 - px0, fy2 = py2 - py0, fz2 = pz2 - pz0;
        const cxn = ey * fz2 - ez * fy2, cyn = ez * fx2 - ex * fz2, czn = ex * fy2 - ey * fx2;
        const area = 0.5 * Math.sqrt(cxn * cxn + cyn * cyn + czn * czn);
        if (area < 1e-10) continue;
        out.wettedArea += area;
        const dSum = d0 + d1 + d2;
        // Hydrostatic pressure force (acts against the outward normal).
        const pMean = rhoG * (dSum / 3);
        const fh = -pMean * area;
        let fxT = fh * nx, fyT = fh * ny, fzT = fh * nz;
        let cpx: number, cpy: number, cpz: number;
        if (dSum > 1e-9) {
          const inv = 1 / (4 * dSum);
          cpx = (px0 * (d0 + dSum) + px1 * (d1 + dSum) + px2 * (d2 + dSum)) * inv;
          cpy = (py0 * (d0 + dSum) + py1 * (d1 + dSum) + py2 * (d2 + dSum)) * inv;
          cpz = (pz0 * (d0 + dSum) + pz1 * (d1 + dSum) + pz2 * (d2 + dSum)) * inv;
        } else {
          cpx = (px0 + px1 + px2) / 3; cpy = (py0 + py1 + py2) / 3; cpz = (pz0 + pz1 + pz2) / 3;
        }
        // Submerged volume and centre of buoyancy from the divergence theorem
        // with fields that vanish on the waterplane: V = −∫ d n_y dA,
        // ∫x dV = −∫ x d n_y dA (= x_cp · dV), ∫y dV = η V + ½ ∫ d² n_y dA.
        const dv = -(dSum / 3) * ny * area;
        const etaTri = (py0 + d0 + py1 + d1 + py2 + d2) / 3;
        const d2Integral = (area / 6) * (d0 * d0 + d1 * d1 + d2 * d2 + d0 * d1 + d1 * d2 + d2 * d0);
        out.submergedVolume += dv;
        cobX += cpx * dv;
        cobY += etaTri * dv + 0.5 * d2Integral * ny;
        cobZ += cpz * dv;
        cobW += dv;
        out.buoyancyN += fyT;

        if (dynamics) {
          // Relative velocity of the face centroid through the water.
          const gx = (px0 + px1 + px2) / 3, gy = (py0 + py1 + py2) / 3, gz = (pz0 + pz1 + pz2) / 3;
          const rx = gx - pose.px, ry = gy - pose.py, rz = gz - pose.pz;
          const vbx = pose.vx + pose.wy * rz - pose.wz * ry;
          const vby = pose.vy + pose.wz * rx - pose.wx * rz;
          const vbz = pose.vz + pose.wx * ry - pose.wy * rx;
          const uwx = (poly[o0 + 4]! + poly[o1 + 4]! + poly[o2 + 4]!) / 3;
          const uwy = (poly[o0 + 5]! + poly[o1 + 5]! + poly[o2 + 5]!) / 3;
          const uwz = (poly[o0 + 6]! + poly[o1 + 6]! + poly[o2 + 6]!) / 3;
          const vrx = vbx - uwx, vry = vby - uwy, vrz = vbz - uwz;
          // Pressure drag sees the surge component attenuated (streamlined hull).
          const vl = (vrx * lonX + vry * lonY + vrz * lonZ) * (1 - lonKeep);
          const vpx = vrx - vl * lonX, vpy = vry - vl * lonY, vpz = vrz - vl * lonZ;
          const vp = Math.sqrt(vpx * vpx + vpy * vpy + vpz * vpz);
          const vr = Math.sqrt(vrx * vrx + vry * vry + vrz * vrz);
          if (vr > 1e-5) {
            const vn = vp > 1e-6 ? vpx * nx + vpy * ny + vpz * nz : 0;
            const cosTheta = vp > 1e-6 ? vn / vp : 0;
            let pressure: number;
            if (cosTheta > 0) {
              pressure = (c.pressureLinear * vp + c.pressureQuadratic * vp * vp) * Math.pow(cosTheta, c.pressureFalloff);
              pressure = Math.min(pressure, c.maxFacePressure);
              fxT -= pressure * area * nx; fyT -= pressure * area * ny; fzT -= pressure * area * nz;
            } else {
              pressure = (c.suctionLinear * vp + c.suctionQuadratic * vp * vp) * Math.pow(-cosTheta, c.suctionFalloff);
              pressure = Math.min(pressure, c.maxFacePressure);
              fxT += pressure * area * nx; fyT += pressure * area * ny; fzT += pressure * area * nz;
            }
            out.pressureDragN += pressure * area;
            // Tangential skin friction (full relative velocity).
            const vnFull = vrx * nx + vry * ny + vrz * nz;
            const vtx = vrx - vnFull * nx, vty = vry - vnFull * ny, vtz = vrz - vnFull * nz;
            const vt = Math.sqrt(vtx * vtx + vty * vty + vtz * vtz);
            if (vt > 1e-6) {
              const ff = 0.5 * c.rhoWater * cf * vt * area;
              fxT -= ff * vtx; fyT -= ff * vty; fzT -= ff * vtz;
              out.frictionN += ff * vt;
            }
          }
        }
        out.fx += fxT; out.fy += fyT; out.fz += fzT;
        const rx = cpx - pose.px, ry = cpy - pose.py, rz = cpz - pose.pz;
        out.tx += ry * fzT - rz * fyT;
        out.ty += rz * fxT - rx * fzT;
        out.tz += rx * fyT - ry * fxT;
      }
    }
    if (cobW > 1e-9) {
      out.cobX = cobX / cobW; out.cobY = cobY / cobW; out.cobZ = cobZ / cobW;
    } else {
      out.cobX = pose.px; out.cobY = pose.py; out.cobZ = pose.pz;
    }
    if (!anyWet) out.meanWaterline = pose.py;
    return out;
  }

  private applyWindage(
    pose: RigidPose,
    ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number,
    nx: number, ny: number, nz: number, area: number, air: AirSampler, out: HydroResult,
  ): void {
    const gx = (ax + bx + cx) / 3, gy = (ay + by + cy) / 3, gz = (az + bz + cz) / 3;
    const wind = air.velocity(gx, gy, gz, this.airOut);
    const rx = gx - pose.px, ry = gy - pose.py, rz = gz - pose.pz;
    const vbx = pose.vx + pose.wy * rz - pose.wz * ry;
    const vby = pose.vy + pose.wz * rx - pose.wx * rz;
    const vbz = pose.vz + pose.wx * ry - pose.wy * rx;
    // Apparent flow over the face (air relative to the face).
    const fx = wind.x - vbx, fy = wind.y - vby, fz = wind.z - vbz;
    const vn = -(fx * nx + fy * ny + fz * nz); // positive when air hits the face
    if (vn <= 0) return;
    const pressure = 0.5 * this.coefficients.rhoAir * this.coefficients.airPressureCoefficient * vn * vn;
    const f = -pressure * area;
    const fxT = f * nx, fyT = f * ny, fzT = f * nz;
    out.fx += fxT; out.fy += fyT; out.fz += fzT;
    out.tx += ry * fzT - rz * fyT;
    out.ty += rz * fxT - rx * fzT;
    out.tz += rx * fyT - ry * fxT;
    out.windageN += pressure * area;
  }
}
