/**
 * Reference-style MLS-MPM splash solver for the pool hybrid.
 *
 * This follows the provided WebGPU MLS-MPM blueprint much more closely than
 * the failed shortcut version:
 *   1. clear sparse grid
 *   2. P2G mass + APIC momentum
 *   3. density gather + pressure/viscosity stress P2G
 *   4. grid forces/boundaries/sphere collider
 *   5. G2P APIC transfer + particle advection
 *
 * Particles are stored in pool/world coordinates, while the MLS-MPM kernel
 * evaluates the same quadratic 3x3x3 stencil in grid-cell coordinates used by
 * the reference. The grid remains sparse: only nodes touched by particles are
 * processed or cleared, so MLS-MPM stays event-local around splashes/breaches.
 */

import * as THREE from 'three';
import { waterStore } from './waterStore';

export const MPM_GRID_RES = 36;
export const MPM_GRID_X = 36;
export const MPM_GRID_Y = 44;
export const MPM_GRID_Z = 36;

export const MPM_DOMAIN_XZ_MIN = -1.2;
export const MPM_DOMAIN_XZ_MAX = 1.2;
export const MPM_DOMAIN_Y_MIN = -1.05;
export const MPM_DX = (MPM_DOMAIN_XZ_MAX - MPM_DOMAIN_XZ_MIN) / MPM_GRID_X;
export const MPM_INV_DX = 1.0 / MPM_DX;
export const MPM_DOMAIN_Y_MAX = MPM_DOMAIN_Y_MIN + MPM_GRID_Y * MPM_DX;

export const POOL_FLOOR_Y = -1.0;
export const POOL_RIM_Y = 2.0 / 12.0;
export const POOL_HALF_EXTENT = 1.0;

const PARTICLE_MASS = 1.0;
const REST_DENSITY = 3.0;
const STIFFNESS = 50.0;
const DYNAMIC_VISCOSITY = 0.1;
const GRAVITY = -0.4;
const WALL_STIFFNESS = 18.0;
const WALL_DAMPING = 0.42;
const PARTICLE_LIFETIME = 3.2;
const MAX_VELOCITY = 13.0;
const SURFACE_Y = 0.0;
const GOLDEN_ANGLE = Math.PI * (3.0 - Math.sqrt(5.0));

export const FLAG_ALIVE = 1 << 0;
export const FLAG_AIRBORNE = 1 << 1;
export const FLAG_FOAM = 1 << 2;

export class MpmParticles {
  capacity: number;
  count = 0;
  next = 0;

  px: Float32Array; py: Float32Array; pz: Float32Array;
  vx: Float32Array; vy: Float32Array; vz: Float32Array;
  cxx: Float32Array; cxy: Float32Array; cxz: Float32Array;
  cyx: Float32Array; cyy: Float32Array; cyz: Float32Array;
  czx: Float32Array; czy: Float32Array; czz: Float32Array;
  density: Float32Array;
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
    this.density = f();
    this.life = f();
    this.flags = new Uint8Array(capacity);
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, foam = false): number {
    let i: number;
    if (this.count < this.capacity) {
      i = this.count++;
    } else {
      i = this.next;
      this.next = (this.next + 1) % this.capacity;
    }

    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.cxx[i] = 0; this.cxy[i] = 0; this.cxz[i] = 0;
    this.cyx[i] = 0; this.cyy[i] = 0; this.cyz[i] = 0;
    this.czx[i] = 0; this.czy[i] = 0; this.czz[i] = 0;
    this.density[i] = REST_DENSITY;
    this.life[i] = 0;
    this.flags[i] = FLAG_ALIVE | (y >= SURFACE_Y ? FLAG_AIRBORNE : 0) | (foam ? FLAG_FOAM : 0);
    return i;
  }

  kill(i: number) {
    this.flags[i] = 0;
  }
}

class MpmGrid {
  mx: Float32Array; my: Float32Array; mz: Float32Array; mass: Float32Array;
  active: Int32Array;
  touched: Uint8Array;
  activeCount = 0;

  constructor() {
    const n = MPM_GRID_X * MPM_GRID_Y * MPM_GRID_Z;
    this.mx = new Float32Array(n);
    this.my = new Float32Array(n);
    this.mz = new Float32Array(n);
    this.mass = new Float32Array(n);
    this.active = new Int32Array(n);
    this.touched = new Uint8Array(n);
  }

  idx(i: number, j: number, k: number) {
    return (i * MPM_GRID_Y + j) * MPM_GRID_Z + k;
  }

  mark(idx: number) {
    if (!this.touched[idx]) {
      this.touched[idx] = 1;
      this.active[this.activeCount++] = idx;
    }
  }

  clear() {
    for (let n = 0; n < this.activeCount; n++) {
      const idx = this.active[n];
      this.mx[idx] = 0;
      this.my[idx] = 0;
      this.mz[idx] = 0;
      this.mass[idx] = 0;
      this.touched[idx] = 0;
    }
    this.activeCount = 0;
  }
}

export interface SphereProbe {
  cx: number; cy: number; cz: number;
  vx: number; vy: number; vz: number;
  radius: number;
  fx: number; fy: number; fz: number;
}

export interface MpmSurfaceSampler {
  heightAt: (x: number, z: number) => number;
}

export interface MpmSettleEvent {
  x: number;
  z: number;
  vy: number;
  weight: number;
}

export class MlsMpmSolver {
  particles: MpmParticles;
  grid: MpmGrid;
  settleEvents: MpmSettleEvent[] = [];
  private rng = 0x6d2b79f5;

  constructor(maxParticles = 9000) {
    this.particles = new MpmParticles(maxParticles);
    this.grid = new MpmGrid();
  }

  private rand() {
    this.rng |= 0;
    this.rng = (this.rng + 0x6d2b79f5) | 0;
    let t = Math.imul(this.rng ^ (this.rng >>> 15), 1 | this.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private worldToGridX(x: number) { return (x - MPM_DOMAIN_XZ_MIN) * MPM_INV_DX; }
  private worldToGridY(y: number) { return (y - MPM_DOMAIN_Y_MIN) * MPM_INV_DX; }
  private worldToGridZ(z: number) { return (z - MPM_DOMAIN_XZ_MIN) * MPM_INV_DX; }
  private gridToWorldX(i: number) { return MPM_DOMAIN_XZ_MIN + (i + 0.5) * MPM_DX; }
  private gridToWorldY(j: number) { return MPM_DOMAIN_Y_MIN + (j + 0.5) * MPM_DX; }
  private gridToWorldZ(k: number) { return MPM_DOMAIN_XZ_MIN + (k + 0.5) * MPM_DX; }

  step(dt: number, sphere?: SphereProbe, surface?: MpmSurfaceSampler) {
    const safeDt = Math.min(Math.max(dt, 0), 1 / 30);
    if (safeDt <= 0) return;

    const substeps = Math.min(5, Math.max(1, Math.ceil(safeDt / 0.0075)));
    const h = safeDt / substeps;
    this.settleEvents.length = 0;
    for (let s = 0; s < substeps; s++) this.substep(h, sphere, surface);
  }

  private inStencil(gx: number, gy: number, gz: number) {
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const iz = Math.floor(gz);
    return ix >= 1 && ix < MPM_GRID_X - 1 &&
           iy >= 1 && iy < MPM_GRID_Y - 1 &&
           iz >= 1 && iz < MPM_GRID_Z - 1;
  }

  private weights(d: number) {
    return [
      0.5 * (0.5 - d) * (0.5 - d),
      0.75 - d * d,
      0.5 * (0.5 + d) * (0.5 + d),
    ] as const;
  }

  private substep(dt: number, sphere?: SphereProbe, surface?: MpmSurfaceSampler) {
    const P = this.particles;
    const G = this.grid;
    G.clear();
    if (sphere) { sphere.fx = 0; sphere.fy = 0; sphere.fz = 0; }

    this.p2gMassMomentum(P, G);
    this.p2gStress(P, G, dt);
    this.updateGrid(G, dt, sphere, surface);
    this.g2p(P, G, dt, surface);
  }

  private p2gMassMomentum(P: MpmParticles, G: MpmGrid) {
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE)) continue;
      const gx = this.worldToGridX(P.px[p]);
      const gy = this.worldToGridY(P.py[p]);
      const gz = this.worldToGridZ(P.pz[p]);
      if (!this.inStencil(gx, gy, gz)) continue;

      const ci = Math.floor(gx), cj = Math.floor(gy), ck = Math.floor(gz);
      const dx = gx - (ci + 0.5), dy = gy - (cj + 0.5), dz = gz - (ck + 0.5);
      const wx = this.weights(dx), wy = this.weights(dy), wz = this.weights(dz);

      const pvx = P.vx[p] * MPM_INV_DX;
      const pvy = P.vy[p] * MPM_INV_DX;
      const pvz = P.vz[p] * MPM_INV_DX;
      const cxx = P.cxx[p], cxy = P.cxy[p], cxz = P.cxz[p];
      const cyx = P.cyx[p], cyy = P.cyy[p], cyz = P.cyz[p];
      const czx = P.czx[p], czy = P.czy[p], czz = P.czz[p];

      for (let ox = 0; ox < 3; ox++) {
        const i = ci + ox - 1;
        const wxv = wx[ox];
        const cellDx = i + 0.5 - gx;
        for (let oy = 0; oy < 3; oy++) {
          const j = cj + oy - 1;
          const wxy = wxv * wy[oy];
          const cellDy = j + 0.5 - gy;
          for (let oz = 0; oz < 3; oz++) {
            const k = ck + oz - 1;
            const w = wxy * wz[oz];
            const cellDz = k + 0.5 - gz;
            const idx = G.idx(i, j, k);
            const qx = cxx * cellDx + cxy * cellDy + cxz * cellDz;
            const qy = cyx * cellDx + cyy * cellDy + cyz * cellDz;
            const qz = czx * cellDx + czy * cellDy + czz * cellDz;
            const m = w * PARTICLE_MASS;
            G.mass[idx] += m;
            G.mx[idx] += m * (pvx + qx);
            G.my[idx] += m * (pvy + qy);
            G.mz[idx] += m * (pvz + qz);
            G.mark(idx);
          }
        }
      }
    }
  }

  private p2gStress(P: MpmParticles, G: MpmGrid, dt: number) {
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE)) continue;
      const gx = this.worldToGridX(P.px[p]);
      const gy = this.worldToGridY(P.py[p]);
      const gz = this.worldToGridZ(P.pz[p]);
      if (!this.inStencil(gx, gy, gz)) continue;

      const ci = Math.floor(gx), cj = Math.floor(gy), ck = Math.floor(gz);
      const dx = gx - (ci + 0.5), dy = gy - (cj + 0.5), dz = gz - (ck + 0.5);
      const wx = this.weights(dx), wy = this.weights(dy), wz = this.weights(dz);

      let density = 0;
      for (let ox = 0; ox < 3; ox++) {
        const i = ci + ox - 1;
        const wxv = wx[ox];
        for (let oy = 0; oy < 3; oy++) {
          const j = cj + oy - 1;
          const wxy = wxv * wy[oy];
          for (let oz = 0; oz < 3; oz++) {
            const k = ck + oz - 1;
            density += G.mass[G.idx(i, j, k)] * wxy * wz[oz];
          }
        }
      }

      if (density <= 1e-6) continue;
      P.density[p] = density;
      const volume = PARTICLE_MASS / density;
      const pressure = Math.max(0, STIFFNESS * (density / REST_DENSITY - 1.0));
      const cxx = P.cxx[p], cxy = P.cxy[p], cxz = P.cxz[p];
      const cyx = P.cyx[p], cyy = P.cyy[p], cyz = P.cyz[p];
      const czx = P.czx[p], czy = P.czy[p], czz = P.czz[p];

      const sxx = -pressure + DYNAMIC_VISCOSITY * (cxx + cxx);
      const syy = -pressure + DYNAMIC_VISCOSITY * (cyy + cyy);
      const szz = -pressure + DYNAMIC_VISCOSITY * (czz + czz);
      const sxy = DYNAMIC_VISCOSITY * (cxy + cyx);
      const sxz = DYNAMIC_VISCOSITY * (cxz + czx);
      const syz = DYNAMIC_VISCOSITY * (cyz + czy);
      const coeff = -volume * 4.0 * dt;

      for (let ox = 0; ox < 3; ox++) {
        const i = ci + ox - 1;
        const wxv = wx[ox];
        const cellDx = i + 0.5 - gx;
        for (let oy = 0; oy < 3; oy++) {
          const j = cj + oy - 1;
          const wxy = wxv * wy[oy];
          const cellDy = j + 0.5 - gy;
          for (let oz = 0; oz < 3; oz++) {
            const k = ck + oz - 1;
            const w = wxy * wz[oz];
            const cellDz = k + 0.5 - gz;
            const idx = G.idx(i, j, k);
            G.mx[idx] += coeff * w * (sxx * cellDx + sxy * cellDy + sxz * cellDz);
            G.my[idx] += coeff * w * (sxy * cellDx + syy * cellDy + syz * cellDz);
            G.mz[idx] += coeff * w * (sxz * cellDx + syz * cellDy + szz * cellDz);
          }
        }
      }
    }
  }

  private updateGrid(G: MpmGrid, dt: number, sphere?: SphereProbe, surface?: MpmSurfaceSampler) {
    const sphereR2 = sphere ? sphere.radius * sphere.radius : 0;
    for (let a = 0; a < G.activeCount; a++) {
      const idx = G.active[a];
      const mass = G.mass[idx];
      if (mass <= 0) continue;

      const i = Math.floor(idx / (MPM_GRID_Y * MPM_GRID_Z));
      const rem = idx - i * MPM_GRID_Y * MPM_GRID_Z;
      const j = Math.floor(rem / MPM_GRID_Z);
      const k = rem - j * MPM_GRID_Z;
      const wx = this.gridToWorldX(i);
      const wy = this.gridToWorldY(j);
      const wz = this.gridToWorldZ(k);

      let vx = G.mx[idx] / mass;
      let vy = G.my[idx] / mass + GRAVITY * MPM_INV_DX * dt;
      let vz = G.mz[idx] / mass;

      if (surface && Math.abs(wx) <= POOL_HALF_EXTENT && Math.abs(wz) <= POOL_HALF_EXTENT) {
        const surfaceY = surface.heightAt(wx, wz);
        const eta = surfaceY - SURFACE_Y;
        const band = 3.0 * MPM_DX;
        if (Math.abs(wy - surfaceY) < band) {
          // Matches the reference updateGrid heightfield coupling: near the
          // MLS-MPM/wave interface, heightfield elevation injects vertical grid
          // velocity instead of treating the free surface like a hard floor.
          vy += 0.03 * eta;
        }
      }

      if (wy < POOL_RIM_Y) {
        const pad = 0.018;
        if (wx < -POOL_HALF_EXTENT + pad && vx < 0) vx *= -WALL_DAMPING;
        if (wx >  POOL_HALF_EXTENT - pad && vx > 0) vx *= -WALL_DAMPING;
        if (wz < -POOL_HALF_EXTENT + pad && vz < 0) vz *= -WALL_DAMPING;
        if (wz >  POOL_HALF_EXTENT - pad && vz > 0) vz *= -WALL_DAMPING;
      }
      if (wy < POOL_FLOOR_Y + 0.025 && vy < 0) vy *= -WALL_DAMPING;

      if (sphere) {
        const dx = wx - sphere.cx;
        const dy = wy - sphere.cy;
        const dz = wz - sphere.cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < sphereR2 && d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d, nz = dz / d;
          const svx = sphere.vx * MPM_INV_DX;
          const svy = sphere.vy * MPM_INV_DX;
          const svz = sphere.vz * MPM_INV_DX;
          const rel = (vx - svx) * nx + (vy - svy) * ny + (vz - svz) * nz;
          if (rel < 0) {
            const push = -rel + (sphere.radius - d) * WALL_STIFFNESS * dt;
            const dvx = push * nx;
            const dvy = push * ny;
            const dvz = push * nz;
            vx += dvx; vy += dvy; vz += dvz;
            sphere.fx -= mass * dvx / Math.max(dt, 1e-5);
            sphere.fy -= mass * dvy / Math.max(dt, 1e-5);
            sphere.fz -= mass * dvz / Math.max(dt, 1e-5);
          }
        }
      }

      const sp2 = vx * vx + vy * vy + vz * vz;
      const maxGridVelocity = MAX_VELOCITY * MPM_INV_DX;
      if (sp2 > maxGridVelocity * maxGridVelocity) {
        const s = maxGridVelocity / Math.sqrt(sp2);
        vx *= s; vy *= s; vz *= s;
      }
      G.mx[idx] = vx;
      G.my[idx] = vy;
      G.mz[idx] = vz;
    }
  }

  private g2p(P: MpmParticles, G: MpmGrid, dt: number, surface?: MpmSurfaceSampler) {
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE)) continue;

      const prevY = P.py[p];
      const gx = this.worldToGridX(P.px[p]);
      const gy = this.worldToGridY(P.py[p]);
      const gz = this.worldToGridZ(P.pz[p]);

      if (!this.inStencil(gx, gy, gz)) {
        this.integrateBallistic(P, p, dt, prevY, surface);
        continue;
      }

      const ci = Math.floor(gx), cj = Math.floor(gy), ck = Math.floor(gz);
      const dx = gx - (ci + 0.5), dy = gy - (cj + 0.5), dz = gz - (ck + 0.5);
      const wx = this.weights(dx), wy = this.weights(dy), wz = this.weights(dz);

      let nvx = 0, nvy = 0, nvz = 0;
      let cxx = 0, cxy = 0, cxz = 0;
      let cyx = 0, cyy = 0, cyz = 0;
      let czx = 0, czy = 0, czz = 0;

      for (let ox = 0; ox < 3; ox++) {
        const i = ci + ox - 1;
        const wxv = wx[ox];
        const cellDx = i + 0.5 - gx;
        for (let oy = 0; oy < 3; oy++) {
          const j = cj + oy - 1;
          const wxy = wxv * wy[oy];
          const cellDy = j + 0.5 - gy;
          for (let oz = 0; oz < 3; oz++) {
            const k = ck + oz - 1;
            const w = wxy * wz[oz];
            const cellDz = k + 0.5 - gz;
            const idx = G.idx(i, j, k);
            if (G.mass[idx] <= 0) continue;
            const vx = G.mx[idx];
            const vy = G.my[idx];
            const vz = G.mz[idx];
            const wvx = vx * w;
            const wvy = vy * w;
            const wvz = vz * w;
            nvx += wvx; nvy += wvy; nvz += wvz;
            cxx += wvx * cellDx; cxy += wvx * cellDy; cxz += wvx * cellDz;
            cyx += wvy * cellDx; cyy += wvy * cellDy; cyz += wvy * cellDz;
            czx += wvz * cellDx; czy += wvz * cellDy; czz += wvz * cellDz;
          }
        }
      }

      P.vx[p] = nvx * MPM_DX; P.vy[p] = nvy * MPM_DX; P.vz[p] = nvz * MPM_DX;
      P.cxx[p] = cxx * 4; P.cxy[p] = cxy * 4; P.cxz[p] = cxz * 4;
      P.cyx[p] = cyx * 4; P.cyy[p] = cyy * 4; P.cyz[p] = cyz * 4;
      P.czx[p] = czx * 4; P.czy[p] = czy * 4; P.czz[p] = czz * 4;

      P.px[p] += P.vx[p] * dt;
      P.py[p] += P.vy[p] * dt;
      P.pz[p] += P.vz[p] * dt;
      this.applyParticleWalls(P, p, dt);
      this.finishParticle(P, p, dt, prevY, surface);
    }
  }

  private integrateBallistic(P: MpmParticles, p: number, dt: number, prevY: number, surface?: MpmSurfaceSampler) {
    P.vy[p] += GRAVITY * dt;
    P.px[p] += P.vx[p] * dt;
    P.py[p] += P.vy[p] * dt;
    P.pz[p] += P.vz[p] * dt;
    P.cxx[p] *= 0.9; P.cxy[p] *= 0.9; P.cxz[p] *= 0.9;
    P.cyx[p] *= 0.9; P.cyy[p] *= 0.9; P.cyz[p] *= 0.9;
    P.czx[p] *= 0.9; P.czy[p] *= 0.9; P.czz[p] *= 0.9;
    this.applyParticleWalls(P, p, dt);
    this.finishParticle(P, p, dt, prevY, surface);
  }

  private applyParticleWalls(P: MpmParticles, p: number, dt: number) {
    const belowRim = P.py[p] < POOL_RIM_Y;
    const predictedX = P.px[p] + P.vx[p] * dt * 2;
    const predictedY = P.py[p] + P.vy[p] * dt * 2;
    const predictedZ = P.pz[p] + P.vz[p] * dt * 2;

    if (belowRim) {
      if (predictedX < -POOL_HALF_EXTENT) P.vx[p] += WALL_STIFFNESS * (-POOL_HALF_EXTENT - predictedX) * dt;
      if (predictedX >  POOL_HALF_EXTENT) P.vx[p] += WALL_STIFFNESS * ( POOL_HALF_EXTENT - predictedX) * dt;
      if (predictedZ < -POOL_HALF_EXTENT) P.vz[p] += WALL_STIFFNESS * (-POOL_HALF_EXTENT - predictedZ) * dt;
      if (predictedZ >  POOL_HALF_EXTENT) P.vz[p] += WALL_STIFFNESS * ( POOL_HALF_EXTENT - predictedZ) * dt;
      P.px[p] = Math.max(-POOL_HALF_EXTENT, Math.min(POOL_HALF_EXTENT, P.px[p]));
      P.pz[p] = Math.max(-POOL_HALF_EXTENT, Math.min(POOL_HALF_EXTENT, P.pz[p]));
    }
    if (predictedY < POOL_FLOOR_Y) {
      P.vy[p] += WALL_STIFFNESS * (POOL_FLOOR_Y - predictedY) * dt;
      P.py[p] = Math.max(POOL_FLOOR_Y, P.py[p]);
    }
  }

  private finishParticle(P: MpmParticles, p: number, dt: number, prevY: number, surface?: MpmSurfaceSampler) {
    P.life[p] += dt;
    const surfaceY = surface ? surface.heightAt(P.px[p], P.pz[p]) : SURFACE_Y;
    if (P.py[p] >= surfaceY) P.flags[p] |= FLAG_AIRBORNE;
    else P.flags[p] &= ~FLAG_AIRBORNE;

    const crossedSurface = prevY > surfaceY + 0.002 && P.py[p] <= surfaceY && P.vy[p] < -0.03;
    if (crossedSurface) {
      this.recordSettle(P, p);
      P.py[p] = surfaceY + 0.003;
      P.vy[p] = Math.max(-P.vy[p] * 0.16, 0.012);
      P.vx[p] *= 0.72;
      P.vz[p] *= 0.72;
    }

    const outside = P.px[p] < MPM_DOMAIN_XZ_MIN - 0.2 || P.px[p] > MPM_DOMAIN_XZ_MAX + 0.2 ||
                    P.pz[p] < MPM_DOMAIN_XZ_MIN - 0.2 || P.pz[p] > MPM_DOMAIN_XZ_MAX + 0.2 ||
                    P.py[p] < POOL_FLOOR_Y - 0.08 || P.py[p] > MPM_DOMAIN_Y_MAX + 0.3;
    const slow = P.vx[p] * P.vx[p] + P.vy[p] * P.vy[p] + P.vz[p] * P.vz[p] < 0.025;
    const lifetime = PARTICLE_LIFETIME * Math.max(0.25, waterStore.get().mpmParams.lifetimeMultiplier);
    if (outside || P.life[p] > lifetime || (P.py[p] < surfaceY - 0.1 && slow && P.life[p] > 0.35)) {
      if (P.py[p] <= surfaceY && Math.abs(P.px[p]) <= 1 && Math.abs(P.pz[p]) <= 1) this.recordSettle(P, p);
      P.kill(p);
    }
  }

  private recordSettle(P: MpmParticles, p: number) {
    this.settleEvents.push({ x: P.px[p], z: P.pz[p], vy: P.vy[p], weight: Math.max(0.35, P.density[p] / REST_DENSITY) });
  }

  spawnCrown(cx: number, cz: number, impactSpeed: number, count = 72, radius = 0.23) {
    const energy = Math.max(0.15, impactSpeed);
    const particles = Math.min(120, Math.max(24, Math.floor(count * Math.min(1.55, 0.45 + energy * 0.18))));
    for (let i = 0; i < particles; i++) {
      const a = i * GOLDEN_ANGLE + (this.rand() - 0.5) * 0.22;
      const ring = radius * (0.72 + this.rand() * 0.5);
      const nx = Math.cos(a), nz = Math.sin(a);
      const sheetBias = 0.45 + 0.45 * this.rand();
      const speed = 0.8 + energy * (0.42 + 0.45 * this.rand());
      const x = cx + nx * ring;
      const z = cz + nz * ring;
      const y = SURFACE_Y + 0.006 + this.rand() * 0.018;
      const vx = nx * speed * (0.78 + sheetBias) + (this.rand() - 0.5) * 0.22;
      const vz = nz * speed * (0.78 + sheetBias) + (this.rand() - 0.5) * 0.22;
      const vy = 0.95 + energy * (0.52 + 0.35 * this.rand());
      this.particles.spawn(x, y, z, vx, vy, vz, this.rand() < 0.42);
    }
  }

  spawnSheet(cx: number, cz: number, yStart: number, upSpeed: number, count = 54) {
    const energy = Math.max(0.1, upSpeed);
    const particles = Math.min(96, Math.max(20, Math.floor(count * Math.min(1.35, 0.65 + energy * 0.15))));
    for (let i = 0; i < particles; i++) {
      const a = i * GOLDEN_ANGLE + this.rand() * 0.35;
      const r = 0.04 + this.rand() * 0.17;
      const nx = Math.cos(a), nz = Math.sin(a);
      const vx = nx * (0.34 + this.rand() * 0.62) + (this.rand() - 0.5) * 0.22;
      const vz = nz * (0.34 + this.rand() * 0.62) + (this.rand() - 0.5) * 0.22;
      const vy = energy * (0.68 + this.rand() * 0.62) + 0.25;
      this.particles.spawn(cx + nx * r, yStart + this.rand() * 0.08, cz + nz * r, vx, vy, vz, this.rand() < 0.55);
    }
  }

  spawnImpact(cx: number, cz: number, energy = 1.0, count = 28) {
    const particles = Math.min(80, Math.max(10, Math.floor(count * Math.min(1.6, 0.7 + energy * 0.35))));
    for (let i = 0; i < particles; i++) {
      const a = i * GOLDEN_ANGLE + this.rand() * 0.5;
      const r = this.rand() * 0.055;
      const nx = Math.cos(a), nz = Math.sin(a);
      const speed = (0.9 + this.rand() * 1.35) * energy;
      const tilt = 0.42 + this.rand() * 0.45;
      this.particles.spawn(
        cx + nx * r,
        SURFACE_Y + 0.004 + this.rand() * 0.018,
        cz + nz * r,
        nx * speed * tilt,
        0.55 + speed * (0.7 - tilt * 0.24),
        nz * speed * tilt,
        this.rand() < 0.38,
      );
    }
  }

  spawnSphereBreach(cx: number, cy: number, cz: number, radius: number, vx: number, vy: number, vz: number, intensity = 1.0) {
    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);
    const verticalEnergy = Math.abs(vy);
    if (Math.abs(cy) > radius * 1.05 || horizontalSpeed + verticalEnergy < 0.12) return;

    const ringRadius = Math.sqrt(Math.max(0.0025, radius * radius - cy * cy));
    const hx = horizontalSpeed > 1e-4 ? vx / horizontalSpeed : 0;
    const hz = horizontalSpeed > 1e-4 ? vz / horizontalSpeed : 1;
    const count = Math.min(46, Math.max(10, Math.floor((12 + horizontalSpeed * 12 + verticalEnergy * 8) * intensity)));
    for (let i = 0; i < count; i++) {
      const a = i * GOLDEN_ANGLE + this.rand() * 0.4;
      const nx = Math.cos(a), nz = Math.sin(a);
      const front = Math.max(0, nx * hx + nz * hz);
      const side = 0.35 + 0.65 * front;
      const x = cx + nx * ringRadius * (0.86 + this.rand() * 0.22);
      const z = cz + nz * ringRadius * (0.86 + this.rand() * 0.22);
      const skim = 0.28 + horizontalSpeed * (0.28 + 0.35 * front);
      const lift = 0.22 + verticalEnergy * 0.18 + horizontalSpeed * 0.12 * side;
      this.particles.spawn(
        x,
        SURFACE_Y + 0.004 + this.rand() * 0.025,
        z,
        nx * skim * side + vx * 0.18 + (this.rand() - 0.5) * 0.08,
        lift + this.rand() * 0.24,
        nz * skim * side + vz * 0.18 + (this.rand() - 0.5) * 0.08,
        this.rand() < 0.68,
      );
    }
  }
}

export function vec3ToProbe(pos: THREE.Vector3, vel: THREE.Vector3, radius: number): SphereProbe {
  return {
    cx: pos.x, cy: pos.y, cz: pos.z,
    vx: vel.x, vy: vel.y, vz: vel.z,
    radius,
    fx: 0, fy: 0, fz: 0,
  };
}
