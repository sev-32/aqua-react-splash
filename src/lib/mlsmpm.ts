/**
 * MLS-MPM (Moving Least Squares Material Point Method) — 3D, CPU
 *
 * Compact APIC (Affine Particle-In-Cell) implementation tuned for
 * short-lived splash bursts. Pool space is the unit cube
 * [-1, 1] × [-1, ymax] × [-1, 1] where the water rest level is y = 0
 * (matches the height-field surface), the floor is y = -1, and walls
 * extend up to y = poolTop ≈ 2/12 ≈ 0.167. Above the wall rim, particles
 * travel ballistically until they fall back below the rim.
 *
 * References:
 * - Hu et al. 2018, "A Moving Least Squares Material Point Method
 *   with Displacement Discontinuity and Two-Way Rigid Body Coupling"
 * - Jiang et al. 2015, "The Affine Particle-In-Cell Method"
 *
 * Quadratic B-spline kernel:
 *   N(d) = 0.75 - d²              for |d| < 0.5
 *        = 0.5 * (1.5 - |d|)²     for 0.5 ≤ |d| < 1.5
 *        = 0                       otherwise
 * Each particle contributes to a 3×3×3 grid stencil centered on the
 * nearest grid node (rounded), giving 27 weights per particle.
 */

import * as THREE from 'three';

// ─── Constants ───────────────────────────────────────────────────────────────

export const MPM_GRID_RES = 32;            // grid nodes per axis on the splash region
export const MPM_DOMAIN_MIN = -1.05;       // a touch beyond pool edge to allow over-rim splashes
export const MPM_DOMAIN_MAX =  1.05;
export const MPM_DOMAIN_SIZE = MPM_DOMAIN_MAX - MPM_DOMAIN_MIN;
export const MPM_DX = MPM_DOMAIN_SIZE / MPM_GRID_RES;     // grid spacing in world units
export const MPM_INV_DX = 1.0 / MPM_DX;
export const MPM_CELL_VOL = MPM_DX * MPM_DX * MPM_DX;

export const POOL_FLOOR_Y = -1.0;
export const POOL_RIM_Y = 2.0 / 12.0;       // matches shader threshold; above this, walls open
export const POOL_HALF_EXTENT = 1.0;        // pool is |x|,|z| ≤ 1

// Water material parameters (weakly compressible, Tait EOS)
const REST_DENSITY = 4.0;          // tuned for stability with chosen particle mass
const EOS_STIFFNESS = 10.0;        // bulk modulus surrogate
const EOS_POWER = 7.0;             // Tait exponent γ
const DYNAMIC_VISCOSITY = 0.04;    // damps shear
const PARTICLE_VOLUME = MPM_CELL_VOL * 0.25;   // 4 particles per cell at rest
const PARTICLE_MASS = REST_DENSITY * PARTICLE_VOLUME;

const GRAVITY = -3.0;              // pool-space gravity, scaled to feel snappy
const FRICTION = 0.92;             // tangential damping at wall contact
const PARTICLE_LIFETIME = 4.5;     // seconds before forced recycle
const MAX_VELOCITY = 18.0;         // safety clamp

// Particle flags
export const FLAG_ALIVE  = 1 << 0;
export const FLAG_AIRBORNE = 1 << 1;   // currently above water surface
export const FLAG_FOAM = 1 << 2;       // marked as foam (high curvature / aerated)

// ─── Particle storage (Structure of Arrays for cache friendliness) ──────────

export class MpmParticles {
  capacity: number;
  count = 0;
  next = 0; // round-robin pointer for recycling

  // Position
  px: Float32Array; py: Float32Array; pz: Float32Array;
  // Velocity
  vx: Float32Array; vy: Float32Array; vz: Float32Array;
  // Affine velocity matrix C (3×3 row-major)
  cxx: Float32Array; cxy: Float32Array; cxz: Float32Array;
  cyx: Float32Array; cyy: Float32Array; cyz: Float32Array;
  czx: Float32Array; czy: Float32Array; czz: Float32Array;
  // Determinant of deformation gradient (volume change). Kept compact (1D).
  J: Float32Array;
  // Lifetime + flags
  life: Float32Array;
  flags: Uint8Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    const f = () => new Float32Array(capacity);
    this.px = f(); this.py = f(); this.pz = f();
    this.vx = f(); this.vy = f(); this.vz = f();
    this.cxx = f(); this.cxy = f(); this.cxz = f();
    this.cyx = f(); this.cyy = f(); this.cyz = f();
    this.czx = f(); this.czy = f(); this.czz = f();
    this.J = f();
    this.life = f();
    this.flags = new Uint8Array(capacity);
  }

  /** Spawn a single particle. Returns its index, or -1 if full and recycle disabled. */
  spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    foam = false,
  ): number {
    let i: number;
    if (this.count < this.capacity) {
      i = this.count++;
    } else {
      // Recycle round-robin — splashes naturally die out, oldest wins.
      i = this.next;
      this.next = (this.next + 1) % this.capacity;
    }
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.cxx[i] = 0; this.cxy[i] = 0; this.cxz[i] = 0;
    this.cyx[i] = 0; this.cyy[i] = 0; this.cyz[i] = 0;
    this.czx[i] = 0; this.czy[i] = 0; this.czz[i] = 0;
    this.J[i] = 1.0;
    this.life[i] = 0.0;
    this.flags[i] = FLAG_ALIVE | FLAG_AIRBORNE | (foam ? FLAG_FOAM : 0);
    return i;
  }

  /** Mark a slot as dead (will be skipped + reused). */
  kill(i: number) {
    this.flags[i] = 0;
  }
}

// ─── Grid storage ────────────────────────────────────────────────────────────

class MpmGrid {
  res: number;
  // Momentum (will become velocity after divide by mass)
  mx: Float32Array; my: Float32Array; mz: Float32Array;
  mass: Float32Array;

  constructor(res: number) {
    this.res = res;
    const n = res * res * res;
    this.mx = new Float32Array(n);
    this.my = new Float32Array(n);
    this.mz = new Float32Array(n);
    this.mass = new Float32Array(n);
  }

  clear() {
    this.mx.fill(0); this.my.fill(0); this.mz.fill(0);
    this.mass.fill(0);
  }

  idx(i: number, j: number, k: number) {
    return (i * this.res + j) * this.res + k;
  }
}

// ─── Solver ──────────────────────────────────────────────────────────────────

export interface SphereProbe {
  cx: number; cy: number; cz: number;
  vx: number; vy: number; vz: number;
  radius: number;
  /** Output: net force fluid applies to sphere this step. */
  fx: number; fy: number; fz: number;
}

export interface MpmSettleEvent {
  /** Pool-space x ∈ [-1,1]. */
  x: number;
  /** Pool-space z ∈ [-1,1]. */
  z: number;
  /** Vertical velocity at impact (negative = downward). */
  vy: number;
  /** Mass-weighted contribution. */
  weight: number;
}

export class MlsMpmSolver {
  particles: MpmParticles;
  grid: MpmGrid;
  /** Fired on this step's impacts so the height-field can re-couple. */
  settleEvents: MpmSettleEvent[] = [];

  constructor(maxParticles = 6000) {
    this.particles = new MpmParticles(maxParticles);
    this.grid = new MpmGrid(MPM_GRID_RES);
  }

  /** World position → continuous grid coordinate. */
  private worldToGrid(p: number) {
    return (p - MPM_DOMAIN_MIN) * MPM_INV_DX;
  }

  /**
   * Advance the simulation by `dt`. Substeps internally for stability.
   * `sphere` (optional) participates in two-way coupling.
   */
  step(dt: number, sphere?: SphereProbe) {
    // CFL: cap step so a particle moves at most ~0.4 cells/substep.
    const maxSub = Math.max(1, Math.ceil(dt / (0.4 * MPM_DX / Math.max(1, MAX_VELOCITY * 0.25))));
    const sub = Math.min(maxSub, 4);
    const h = dt / sub;
    this.settleEvents.length = 0;
    for (let s = 0; s < sub; s++) this.substep(h, sphere);
  }

  private substep(dt: number, sphere?: SphereProbe) {
    const P = this.particles;
    const G = this.grid;
    G.clear();

    if (sphere) { sphere.fx = 0; sphere.fy = 0; sphere.fz = 0; }

    // ── P2G ────────────────────────────────────────────────────────────────
    // Transfer mass + momentum + APIC affine term to grid.
    // For each particle, compute 27 weights on the surrounding 3×3×3 stencil.
    const res = G.res;
    const fourDx = 4.0 * MPM_INV_DX * MPM_INV_DX; // (1/Δx)² * 4 — factor for APIC mom.
    const dxLocal = MPM_DX;

    for (let i = 0; i < P.count; i++) {
      if (!(P.flags[i] & FLAG_ALIVE)) continue;

      const gx = this.worldToGrid(P.px[i]);
      const gy = this.worldToGrid(P.py[i]);
      const gz = this.worldToGrid(P.pz[i]);
      const baseI = Math.floor(gx - 0.5);
      const baseJ = Math.floor(gy - 0.5);
      const baseK = Math.floor(gz - 0.5);
      // Skip particles that landed outside the grid completely
      if (baseI < 0 || baseI + 2 >= res ||
          baseJ < 0 || baseJ + 2 >= res ||
          baseK < 0 || baseK + 2 >= res) continue;

      // Fractional offsets from the three stencil nodes, in grid units
      const fx0 = gx - (baseI + 0.5);
      const fy0 = gy - (baseJ + 0.5);
      const fz0 = gz - (baseK + 0.5);

      // Quadratic B-spline weights (3 per axis): w0=0.5(1.5-x)², w1=0.75-(x-1)², w2=0.5(x-0.5)²
      const wx0 = 0.5 * (1.5 - fx0) ** 2;
      const wx1 = 0.75 - (fx0 - 1.0) ** 2;
      const wx2 = 0.5 * (fx0 - 0.5) ** 2;
      const wy0 = 0.5 * (1.5 - fy0) ** 2;
      const wy1 = 0.75 - (fy0 - 1.0) ** 2;
      const wy2 = 0.5 * (fy0 - 0.5) ** 2;
      const wz0 = 0.5 * (1.5 - fz0) ** 2;
      const wz1 = 0.75 - (fz0 - 1.0) ** 2;
      const wz2 = 0.5 * (fz0 - 0.5) ** 2;
      const wxs = [wx0, wx1, wx2];
      const wys = [wy0, wy1, wy2];
      const wzs = [wz0, wz1, wz2];

      // MLS-MPM stress: Tait EOS for pressure + small viscous contribution from C
      const J = P.J[i];
      // Pressure: p = κ*( (1/J)^γ − 1 )  — clamped to repel only (no negative pressure cohesion)
      let pressure = EOS_STIFFNESS * (Math.pow(1.0 / Math.max(J, 0.1), EOS_POWER) - 1.0);
      if (pressure < -EOS_STIFFNESS * 0.5) pressure = -EOS_STIFFNESS * 0.5;
      // Affine force coefficient: −Δt * volume * (4/Δx²) * (pressureI + viscosity*(C+Cᵀ))
      // Pre-multiply the constant scalar.
      const stressScalar = -dt * PARTICLE_VOLUME * fourDx;

      // Symmetric viscous part: μ*(C + Cᵀ)
      const cxx = P.cxx[i], cxy = P.cxy[i], cxz = P.cxz[i];
      const cyx = P.cyx[i], cyy = P.cyy[i], cyz = P.cyz[i];
      const czx = P.czx[i], czy = P.czy[i], czz = P.czz[i];
      const vxx = DYNAMIC_VISCOSITY * (cxx + cxx);
      const vyy = DYNAMIC_VISCOSITY * (cyy + cyy);
      const vzz = DYNAMIC_VISCOSITY * (czz + czz);
      const vxy = DYNAMIC_VISCOSITY * (cxy + cyx);
      const vxz = DYNAMIC_VISCOSITY * (cxz + czx);
      const vyz = DYNAMIC_VISCOSITY * (cyz + czy);

      // Total stress matrix S = pressure*I + viscousSym
      const sxx = stressScalar * (pressure + vxx);
      const syy = stressScalar * (pressure + vyy);
      const szz = stressScalar * (pressure + vzz);
      const sxy = stressScalar * vxy;
      const sxz = stressScalar * vxz;
      const syz = stressScalar * vyz;

      // APIC affine momentum coefficient: mass * C  (we'll multiply by node offset)
      const mC_xx = PARTICLE_MASS * cxx;
      const mC_xy = PARTICLE_MASS * cxy;
      const mC_xz = PARTICLE_MASS * cxz;
      const mC_yx = PARTICLE_MASS * cyx;
      const mC_yy = PARTICLE_MASS * cyy;
      const mC_yz = PARTICLE_MASS * cyz;
      const mC_zx = PARTICLE_MASS * czx;
      const mC_zy = PARTICLE_MASS * czy;
      const mC_zz = PARTICLE_MASS * czz;

      const mvx = PARTICLE_MASS * P.vx[i];
      const mvy = PARTICLE_MASS * P.vy[i];
      const mvz = PARTICLE_MASS * P.vz[i];

      for (let a = 0; a < 3; a++) {
        const wxw = wxs[a];
        const ni = baseI + a;
        // Offset from particle to node center, in WORLD units
        const ox = ((a + 0.5) - fx0) * dxLocal;
        for (let b = 0; b < 3; b++) {
          const wxy = wxw * wys[b];
          const nj = baseJ + b;
          const oy = ((b + 0.5) - fy0) * dxLocal;
          for (let c = 0; c < 3; c++) {
            const w = wxy * wzs[c];
            const nk = baseK + c;
            const oz = ((c + 0.5) - fz0) * dxLocal;
            const idx = G.idx(ni, nj, nk);

            // APIC affine momentum contribution: m * (v + C·offset)
            const apicX = mC_xx * ox + mC_xy * oy + mC_xz * oz;
            const apicY = mC_yx * ox + mC_yy * oy + mC_yz * oz;
            const apicZ = mC_zx * ox + mC_zy * oy + mC_zz * oz;

            // Stress contribution: S · offset (symmetric)
            const stressX = sxx * ox + sxy * oy + sxz * oz;
            const stressY = sxy * ox + syy * oy + syz * oz;
            const stressZ = sxz * ox + syz * oy + szz * oz;

            G.mass[idx] += w * PARTICLE_MASS;
            G.mx[idx] += w * (mvx + apicX) + w * stressX;
            G.my[idx] += w * (mvy + apicY) + w * stressY;
            G.mz[idx] += w * (mvz + apicZ) + w * stressZ;
          }
        }
      }
    }

    // ── Grid update ────────────────────────────────────────────────────────
    // Convert momentum → velocity, apply gravity, enforce boundary conditions.
    const r = res;
    const sphereR2 = sphere ? sphere.radius * sphere.radius : 0;
    for (let i = 0; i < r; i++) {
      const wx = MPM_DOMAIN_MIN + (i + 0.5) * MPM_DX;
      for (let j = 0; j < r; j++) {
        const wy = MPM_DOMAIN_MIN + (j + 0.5) * MPM_DX;
        for (let k = 0; k < r; k++) {
          const idx = G.idx(i, j, k);
          const m = G.mass[idx];
          if (m <= 0) continue;
          const wz = MPM_DOMAIN_MIN + (k + 0.5) * MPM_DX;
          const invM = 1.0 / m;
          let vx = G.mx[idx] * invM;
          let vy = G.my[idx] * invM + GRAVITY * dt;
          let vz = G.mz[idx] * invM;

          // Pool walls: only enforce while inside the pool box (below the rim)
          if (wy < POOL_RIM_Y) {
            // X walls
            if (wx < -POOL_HALF_EXTENT && vx < 0) { vx = 0; vy *= FRICTION; vz *= FRICTION; }
            if (wx >  POOL_HALF_EXTENT && vx > 0) { vx = 0; vy *= FRICTION; vz *= FRICTION; }
            // Z walls
            if (wz < -POOL_HALF_EXTENT && vz < 0) { vz = 0; vx *= FRICTION; vy *= FRICTION; }
            if (wz >  POOL_HALF_EXTENT && vz > 0) { vz = 0; vx *= FRICTION; vy *= FRICTION; }
          }
          // Floor
          if (wy < POOL_FLOOR_Y && vy < 0) { vy = 0; vx *= FRICTION; vz *= FRICTION; }

          // Sphere (rigid) one-way push on grid velocities; impulse accumulated for two-way
          if (sphere) {
            const dx = wx - sphere.cx;
            const dy = wy - sphere.cy;
            const dz = wz - sphere.cz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < sphereR2 && d2 > 1e-8) {
              const d = Math.sqrt(d2);
              const nx = dx / d, ny = dy / d, nz = dz / d;
              // Relative velocity onto normal
              const relVN = (vx - sphere.vx) * nx + (vy - sphere.vy) * ny + (vz - sphere.vz) * nz;
              if (relVN < 0) {
                // Reflect grid velocity to sphere surface velocity along normal
                const dvx = -relVN * nx;
                const dvy = -relVN * ny;
                const dvz = -relVN * nz;
                vx += dvx; vy += dvy; vz += dvz;
                // Newton's 3rd law: apply opposite momentum impulse to sphere
                sphere.fx -= m * dvx / dt;
                sphere.fy -= m * dvy / dt;
                sphere.fz -= m * dvz / dt;
              }
            }
          }

          // Velocity clamp
          const sp2 = vx * vx + vy * vy + vz * vz;
          if (sp2 > MAX_VELOCITY * MAX_VELOCITY) {
            const s = MAX_VELOCITY / Math.sqrt(sp2);
            vx *= s; vy *= s; vz *= s;
          }
          G.mx[idx] = vx; G.my[idx] = vy; G.mz[idx] = vz;
        }
      }
    }

    // ── G2P ────────────────────────────────────────────────────────────────
    for (let i = 0; i < P.count; i++) {
      if (!(P.flags[i] & FLAG_ALIVE)) continue;

      const gx = this.worldToGrid(P.px[i]);
      const gy = this.worldToGrid(P.py[i]);
      const gz = this.worldToGrid(P.pz[i]);
      const baseI = Math.floor(gx - 0.5);
      const baseJ = Math.floor(gy - 0.5);
      const baseK = Math.floor(gz - 0.5);
      if (baseI < 0 || baseI + 2 >= res ||
          baseJ < 0 || baseJ + 2 >= res ||
          baseK < 0 || baseK + 2 >= res) {
        // Out of grid → ballistic free fall
        P.vy[i] += GRAVITY * dt;
        P.px[i] += P.vx[i] * dt;
        P.py[i] += P.vy[i] * dt;
        P.pz[i] += P.vz[i] * dt;
        // Settle if fell to surface
        if (P.py[i] < 0) this.recordSettle(P, i);
        continue;
      }

      const fx0 = gx - (baseI + 0.5);
      const fy0 = gy - (baseJ + 0.5);
      const fz0 = gz - (baseK + 0.5);
      const wxs = [
        0.5 * (1.5 - fx0) ** 2,
        0.75 - (fx0 - 1.0) ** 2,
        0.5 * (fx0 - 0.5) ** 2,
      ];
      const wys = [
        0.5 * (1.5 - fy0) ** 2,
        0.75 - (fy0 - 1.0) ** 2,
        0.5 * (fy0 - 0.5) ** 2,
      ];
      const wzs = [
        0.5 * (1.5 - fz0) ** 2,
        0.75 - (fz0 - 1.0) ** 2,
        0.5 * (fz0 - 0.5) ** 2,
      ];

      let nvx = 0, nvy = 0, nvz = 0;
      let cxx = 0, cxy = 0, cxz = 0;
      let cyx = 0, cyy = 0, cyz = 0;
      let czx = 0, czy = 0, czz = 0;

      for (let a = 0; a < 3; a++) {
        const wxw = wxs[a];
        const ni = baseI + a;
        const ox = ((a + 0.5) - fx0) * MPM_DX;
        for (let b = 0; b < 3; b++) {
          const wxy = wxw * wys[b];
          const nj = baseJ + b;
          const oy = ((b + 0.5) - fy0) * MPM_DX;
          for (let c = 0; c < 3; c++) {
            const w = wxy * wzs[c];
            const nk = baseK + c;
            const oz = ((c + 0.5) - fz0) * MPM_DX;
            const idx = G.idx(ni, nj, nk);

            const m = G.mass[idx];
            if (m <= 0) continue;
            const vxg = G.mx[idx];
            const vyg = G.my[idx];
            const vzg = G.mz[idx];

            nvx += w * vxg; nvy += w * vyg; nvz += w * vzg;

            // APIC: C = Σ w * 4/Δx² * v ⊗ offset
            const k4 = w * fourDx;
            cxx += k4 * vxg * ox; cxy += k4 * vxg * oy; cxz += k4 * vxg * oz;
            cyx += k4 * vyg * ox; cyy += k4 * vyg * oy; cyz += k4 * vyg * oz;
            czx += k4 * vzg * ox; czy += k4 * vzg * oy; czz += k4 * vzg * oz;
          }
        }
      }

      // Update velocity + advect
      P.vx[i] = nvx; P.vy[i] = nvy; P.vz[i] = nvz;
      P.cxx[i] = cxx; P.cxy[i] = cxy; P.cxz[i] = cxz;
      P.cyx[i] = cyx; P.cyy[i] = cyy; P.cyz[i] = cyz;
      P.czx[i] = czx; P.czy[i] = czy; P.czz[i] = czz;

      // J update via trace of velocity gradient (∇·v)
      const trC = cxx + cyy + czz;
      P.J[i] *= Math.max(0.1, 1.0 + dt * trC);

      P.px[i] += nvx * dt;
      P.py[i] += nvy * dt;
      P.pz[i] += nvz * dt;

      // Track airborne flag
      if (P.py[i] >= 0) P.flags[i] |= FLAG_AIRBORNE;
      else P.flags[i] &= ~FLAG_AIRBORNE;

      // Lifetime + recycle
      P.life[i] += dt;
      const speed2 = nvx * nvx + nvy * nvy + nvz * nvz;
      const settled =
        P.py[i] < 0.005 &&
        speed2 < 0.04 &&
        P.life[i] > 0.25;
      if (settled || P.life[i] > PARTICLE_LIFETIME) {
        if (settled) this.recordSettle(P, i);
        P.kill(i);
      }
    }
  }

  /** Record a re-coupling event so the height-field can absorb the splash. */
  private recordSettle(P: MpmParticles, i: number) {
    this.settleEvents.push({
      x: P.px[i],
      z: P.pz[i],
      vy: P.vy[i],
      weight: PARTICLE_MASS,
    });
  }

  /** Spawn a crown-shaped ring of droplets — used for sphere breach FX. */
  spawnCrown(
    cx: number, cz: number,
    impactSpeed: number,
    count = 36,
    radius = 0.08,
  ) {
    const upBase = Math.min(6.5, 1.8 + impactSpeed * 0.9);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.15;
      const r = radius * (0.85 + Math.random() * 0.4);
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      const py = 0.005 + Math.random() * 0.02;
      const tilt = 0.55 + Math.random() * 0.35;
      const speed = upBase * (0.55 + Math.random() * 0.6);
      const vx = Math.cos(a) * speed * tilt;
      const vz = Math.sin(a) * speed * tilt;
      const vy = speed * (1.0 - tilt * 0.4) + Math.random() * 0.6;
      this.particles.spawn(px, py, pz, vx, vy, vz, Math.random() < 0.35);
    }
  }

  /** Spawn a column of upward-trailing droplets (water following the sphere out). */
  spawnSheet(
    cx: number, cz: number,
    yStart: number,
    upSpeed: number,
    count = 18,
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.06;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      const py = yStart + Math.random() * 0.03;
      const vx = Math.cos(a) * 0.6 + (Math.random() - 0.5) * 0.4;
      const vz = Math.sin(a) * 0.6 + (Math.random() - 0.5) * 0.4;
      const vy = upSpeed * (0.6 + Math.random() * 0.5);
      this.particles.spawn(px, py, pz, vx, vy, vz, Math.random() < 0.5);
    }
  }

  /** Splash from a point impact (raindrop, finger tap). */
  spawnImpact(cx: number, cz: number, energy = 1.0, count = 20) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.04;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      const py = 0.005 + Math.random() * 0.015;
      const tilt = 0.4 + Math.random() * 0.4;
      const speed = (1.5 + Math.random() * 1.5) * energy;
      const vx = Math.cos(a) * speed * tilt;
      const vz = Math.sin(a) * speed * tilt;
      const vy = speed * (1.0 - tilt * 0.4);
      this.particles.spawn(px, py, pz, vx, vy, vz, Math.random() < 0.4);
    }
  }
}

// ─── Three.js convenience ────────────────────────────────────────────────────

export function vec3ToProbe(
  pos: THREE.Vector3,
  vel: THREE.Vector3,
  radius: number,
): SphereProbe {
  return {
    cx: pos.x, cy: pos.y, cz: pos.z,
    vx: vel.x, vy: vel.y, vz: vel.z,
    radius,
    fx: 0, fy: 0, fz: 0,
  };
}
