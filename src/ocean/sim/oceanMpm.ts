/**
 * Tier T4 — MLS-MPM splash volumes, evolved from the pool's splash solver
 * (src/lib/mlsmpm.ts): the same sparse-grid MLS-MPM (quadratic B-spline
 * stencil, APIC transfers, EOS pressure + viscous stress, heightfield coupling
 * in the grid update, two-way sphere colliders, ballistic flight outside the
 * stencil, settle events on re-entry) and the same event spawners (crown,
 * sheet, impact jet, breach), re-cast for the ocean:
 *
 *   - physical units (m, s, g = 9.81) — the solver runs in grid-cell units
 *     internally exactly like the pool (velocities × 1/dx);
 *   - volumes are JIT: a splash volume is allocated where the heightfield
 *     releases water (T3 limiter, T2 breaking jets) and retired when empty;
 *   - particles carry volume: a release of V m³ spawns particles whose volumes
 *     sum to V, and a particle that settles hands its volume back to whichever
 *     tier covers the landing point — the representability loop is closed
 *     with exact mass bookkeeping (the pool's settle ripples, made conservative);
 *   - the surface the grid couples to is the composite ocean surface (T0
 *     spectrum + T3 tiles + T2 shore), sampled once per volume per frame.
 */

export const FLAG_ALIVE = 1 << 0;
export const FLAG_AIRBORNE = 1 << 1;
export const FLAG_FOAM = 1 << 2;

const GOLDEN_ANGLE = Math.PI * (3.0 - Math.sqrt(5.0));

export interface MpmConfig {
  /** Grid spacing (m). */
  dx: number;
  /** Grid resolution per volume (cells). */
  nx: number; ny: number; nz: number;
  /** Depth of the volume below the mean surface (m). */
  below: number;
  capacity: number;
  maxVolumes: number;
  /** EOS stiffness and rest density (grid units, as the pool). */
  stiffness: number;
  restDensity: number;
  viscosity: number;
  lifetime: number;
  maxVelocity: number;   // m/s
}

export const DEFAULT_MPM: MpmConfig = {
  dx: 0.32, nx: 48, ny: 44, nz: 48, below: 2.5, capacity: 6000, maxVolumes: 3,
  stiffness: 220, restDensity: 3, viscosity: 0.1, lifetime: 4.5, maxVelocity: 26,
};

export interface SphereCollider {
  cx: number; cy: number; cz: number;
  vx: number; vy: number; vz: number;
  radius: number;
  /** Accumulated reaction force on the body (N-equivalent in solver units). */
  fx: number; fy: number; fz: number;
}

export interface WaterSampler {
  heightAt(x: number, z: number): number;
}

export interface SettleEvent {
  x: number; z: number;
  vy: number;
  volume: number;  // m³ returned to the heightfield
}

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
  vol: Float64Array;       // m³ of water this particle carries (ledger unit)
  flags: Uint8Array;
  seed: Float32Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    const f = () => new Float32Array(capacity);
    this.px = f(); this.py = f(); this.pz = f();
    this.vx = f(); this.vy = f(); this.vz = f();
    this.cxx = f(); this.cxy = f(); this.cxz = f();
    this.cyx = f(); this.cyy = f(); this.cyz = f();
    this.czx = f(); this.czy = f(); this.czz = f();
    this.density = f(); this.life = f(); this.seed = f();
    this.vol = new Float64Array(capacity);
    this.flags = new Uint8Array(capacity);
  }
}

/** A dense grid with a touched list (the pool's sparse-activity trick), positioned in the world. */
class SplashVolume {
  readonly n: number;
  mx: Float32Array; my: Float32Array; mz: Float32Array; mass: Float32Array;
  active: Int32Array; touched: Uint8Array;
  activeCount = 0;
  /** World position of grid cell (0,0,0)'s corner. */
  ox = 0; oy = 0; oz = 0;
  /** Surface heights at node columns, refreshed per frame. */
  surf: Float32Array;
  lastUsed = 0;
  born = 0;
  constructor(readonly cfg: MpmConfig) {
    this.n = cfg.nx * cfg.ny * cfg.nz;
    this.mx = new Float32Array(this.n); this.my = new Float32Array(this.n);
    this.mz = new Float32Array(this.n); this.mass = new Float32Array(this.n);
    this.active = new Int32Array(this.n); this.touched = new Uint8Array(this.n);
    this.surf = new Float32Array(cfg.nx * cfg.nz);
  }
  place(cx: number, cz: number) {
    const { dx, nx, nz, below } = this.cfg;
    this.ox = Math.round((cx - (nx * dx) / 2) / dx) * dx;
    this.oz = Math.round((cz - (nz * dx) / 2) / dx) * dx;
    this.oy = -below;
  }
  contains(x: number, y: number, z: number, margin = 0) {
    const { dx, nx, ny, nz } = this.cfg;
    return x >= this.ox + margin && x < this.ox + nx * dx - margin && z >= this.oz + margin && z < this.oz + nz * dx - margin
      && y >= this.oy && y < this.oy + ny * dx;
  }
  idx(i: number, j: number, k: number) { return (i * this.cfg.ny + j) * this.cfg.nz + k; }
  mark(idx: number) { if (!this.touched[idx]) { this.touched[idx] = 1; this.active[this.activeCount++] = idx; } }
  clear() {
    for (let a = 0; a < this.activeCount; a++) {
      const i = this.active[a];
      this.mx[i] = 0; this.my[i] = 0; this.mz[i] = 0; this.mass[i] = 0; this.touched[i] = 0;
    }
    this.activeCount = 0;
  }
  /** Sample the composite surface on node columns (cheap: one query per column). */
  sampleSurface(water: WaterSampler) {
    const { dx, nx, nz } = this.cfg;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) this.surf[i * nz + k] = water.heightAt(this.ox + (i + 0.5) * dx, this.oz + (k + 0.5) * dx);
  }
  surfaceAt(x: number, z: number) {
    const { dx, nx, nz } = this.cfg;
    const u = Math.min(Math.max((x - this.ox) / dx - 0.5, 0), nx - 1.001), v = Math.min(Math.max((z - this.oz) / dx - 0.5, 0), nz - 1.001);
    const i = Math.floor(u), k = Math.floor(v), fu = u - i, fv = v - k;
    const s = this.surf;
    return (s[i * nz + k] * (1 - fu) + s[(i + 1) * nz + k] * fu) * (1 - fv) + (s[i * nz + k + 1] * (1 - fu) + s[(i + 1) * nz + k + 1] * fu) * fv;
  }
}

const weights = (d: number): [number, number, number] => [0.5 * (0.5 - d) * (0.5 - d), 0.75 - d * d, 0.5 * (0.5 + d) * (0.5 + d)];

export class OceanMpm {
  readonly particles: MpmParticles;
  readonly volumes: SplashVolume[] = [];
  settleEvents: SettleEvent[] = [];
  /** Ledger (m³). */
  readonly stats = { emitted: 0, settled: 0, lost: 0, alive: 0, airborne: 0 };
  private rng = 0x6d2b79f5;
  private owner: Int16Array;   // volume index per particle (−1 = ballistic)

  constructor(readonly cfg: MpmConfig = DEFAULT_MPM) {
    this.particles = new MpmParticles(cfg.capacity);
    this.owner = new Int16Array(cfg.capacity).fill(-1);
  }

  private rand() {
    this.rng |= 0;
    this.rng = (this.rng + 0x6d2b79f5) | 0;
    let t = Math.imul(this.rng ^ (this.rng >>> 15), 1 | this.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** The volume covering (x, z), allocating one JIT if the budget allows. */
  volumeFor(x: number, z: number, now: number): SplashVolume | null {
    const margin = this.cfg.dx * 4;
    for (const v of this.volumes) if (v.contains(x, 0, z, margin)) { v.lastUsed = now; return v; }
    if (this.volumes.length >= this.cfg.maxVolumes) {
      // Recycle the stalest volume that no longer holds particles.
      const idle = this.volumes.filter((v) => !this.occupied(v)).sort((a, b) => a.lastUsed - b.lastUsed)[0];
      if (!idle) return null;
      idle.place(x, z); idle.lastUsed = now; idle.born = now;
      return idle;
    }
    const v = new SplashVolume(this.cfg);
    v.place(x, z); v.lastUsed = now; v.born = now;
    this.volumes.push(v);
    return v;
  }

  private occupied(v: SplashVolume) {
    const vi = this.volumes.indexOf(v);
    const P = this.particles;
    for (let p = 0; p < P.count; p++) if ((P.flags[p] & FLAG_ALIVE) && this.owner[p] === vi) return true;
    return false;
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, vol: number, foam = false): number {
    const P = this.particles;
    let i: number;
    if (P.count < P.capacity) i = P.count++;
    else {
      i = P.next;
      P.next = (P.next + 1) % P.capacity;
      // Overwriting a live particle: its water must still go home.
      if (P.flags[i] & FLAG_ALIVE) this.settle(i, P.px[i], P.pz[i], P.vy[i]);
    }
    P.px[i] = x; P.py[i] = y; P.pz[i] = z;
    P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz;
    P.cxx[i] = 0; P.cxy[i] = 0; P.cxz[i] = 0; P.cyx[i] = 0; P.cyy[i] = 0; P.cyz[i] = 0; P.czx[i] = 0; P.czy[i] = 0; P.czz[i] = 0;
    P.density[i] = this.cfg.restDensity;
    P.life[i] = 0;
    P.vol[i] = vol;
    P.seed[i] = this.rand();
    P.flags[i] = FLAG_ALIVE | FLAG_AIRBORNE | (foam ? FLAG_FOAM : 0);
    this.owner[i] = -1;
    return i;
  }

  /** Hand a particle's water back to the heightfield and retire it (exactly once). */
  private settle(p: number, x: number, z: number, vy: number) {
    const P = this.particles;
    if (!(P.flags[p] & FLAG_ALIVE)) return;
    this.settleEvents.push({ x, z, vy, volume: P.vol[p] });
    this.stats.settled += P.vol[p];
    P.flags[p] = 0;
    P.vol[p] = 0;
  }

  // ─────────────────────────── spawners (pool lineage) ───────────────────────────

  /**
   * Heightfield release → fluid. V m³ leaves the surface at (x, z) with the mean
   * velocity of the released water; `kind` picks the pool spawner the shape
   * follows: 'impact' = crown ring + central Worthington jet (limiter jets from
   * impacts), 'sheet' = forward-thrown sheet (breaking lips, bow sheets).
   */
  emitRelease(r: { x: number; z: number; y: number; volume: number; vx: number; vy: number; vz: number }, kind: 'impact' | 'sheet', spread: number, now: number, maxCount = 400) {
    const V = r.volume;
    if (!(V > 0)) return;
    this.stats.emitted += V;
    this.volumeFor(r.x, r.z, now);
    const dx = this.cfg.dx;
    // Particle count from the volume at ~8 particles per cell of water, capped by budget.
    const n = Math.max(4, Math.min(maxCount, Math.round(V / (dx * dx * dx / 8))));
    const vp = V / n;
    const y0 = Math.max(r.y * 0.35, 0) + 0.02;
    // Jet speed: impact limiter releases over-state the surface rise (the capacity source
    // injects a body's displacement within a frame), so the sheet leaves at a fraction of it.
    const w = kind === 'impact' ? Math.min(Math.max(r.vy, 0), 14) * 0.6 : Math.max(r.vy, 0);
    const hs = Math.hypot(r.vx, r.vz);
    const hx = hs > 1e-4 ? r.vx / hs : 0, hz = hs > 1e-4 ? r.vz / hs : 0;
    for (let i = 0; i < n; i++) {
      const a = i * GOLDEN_ANGLE + (this.rand() - 0.5) * 0.3;
      const nx = Math.cos(a), nz = Math.sin(a);
      const foam = this.rand() < 0.4;
      const j = 0.8 + 0.4 * this.rand();
      if (kind === 'impact') {
        if (i % 4 === 0) {
          // Central Worthington jet (pool spawnImpact): narrow, fast, near-vertical.
          const rr = this.rand() * spread * 0.2;
          this.spawn(r.x + nx * rr, y0, r.z + nz * rr, nx * 0.4 * j + r.vx * 0.2, (w * 1.05 + 0.6) * j, nz * 0.4 * j + r.vz * 0.2, vp, foam);
        } else {
          // Crown wall (pool spawnCrown): a ring rising out of the surface, flaring outward.
          const ring = spread * (0.6 + this.rand() * 0.4);
          const out = (0.25 * w + 0.6) * j;
          this.spawn(r.x + nx * ring, y0 + this.rand() * 0.1, r.z + nz * ring,
            nx * out + (this.rand() - 0.5) * 0.3 + r.vx * 0.2, (0.6 * w + 0.6) * (0.75 + 0.5 * this.rand()),
            nz * out + (this.rand() - 0.5) * 0.3 + r.vz * 0.2, vp, foam);
        }
      } else {
        // Sheet (pool spawnSheet/spawnSphereBreach): thrown along the release direction.
        const rr = Math.sqrt(this.rand()) * spread;
        const front = Math.max(0, nx * hx + nz * hz);
        const side = 0.35 + 0.65 * front;
        this.spawn(r.x + nx * rr, y0 + this.rand() * 0.15, r.z + nz * rr,
          r.vx * (0.7 + 0.4 * this.rand()) + nx * 0.8 * side,
          w * (0.6 + 0.6 * this.rand()) + 0.5,
          r.vz * (0.7 + 0.4 * this.rand()) + nz * 0.8 * side, vp, foam);
      }
    }
  }

  // ─────────────────────────────── the solver ───────────────────────────────

  /** One frame: substeps of P2G → stress → grid → G2P per volume, ballistic elsewhere. */
  step(dt: number, water: WaterSampler, colliders: SphereCollider[], now: number) {
    const safeDt = Math.min(Math.max(dt, 0), 1 / 20);
    this.settleEvents = [];
    if (safeDt <= 0) return;
    for (const v of this.volumes) v.sampleSurface(water);
    // Assign particles to volumes (first containing volume wins).
    const P = this.particles;
    let alive = 0;
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE)) continue;
      alive++;
      let o = -1;
      for (let vi = 0; vi < this.volumes.length; vi++) if (this.volumes[vi].contains(P.px[p], P.py[p], P.pz[p], this.cfg.dx * 1.5)) { o = vi; break; }
      this.owner[p] = o;
    }
    if (!alive) { this.stats.alive = 0; this.stats.airborne = 0; return; }
    const cellV = this.cfg.maxVelocity / this.cfg.dx;
    const sub = Math.min(8, Math.max(1, Math.ceil(safeDt / 0.0045), Math.ceil((safeDt * cellV) / 1.2)));
    const h = safeDt / sub;
    for (const c of colliders) { c.fx = 0; c.fy = 0; c.fz = 0; }
    for (let s = 0; s < sub; s++) {
      for (let vi = 0; vi < this.volumes.length; vi++) {
        const v = this.volumes[vi];
        v.clear();
        this.p2gMassMomentum(v, vi);
        this.p2gStress(v, vi, h);
        this.updateGrid(v, h, colliders);
      }
      this.g2p(h, water);
    }
    // Ledger view.
    let vol = 0, n = 0;
    for (let p = 0; p < P.count; p++) if (P.flags[p] & FLAG_ALIVE) { vol += P.vol[p]; n++; }
    this.stats.alive = n;
    this.stats.airborne = vol;
    for (const v of this.volumes) if (this.occupied(v)) v.lastUsed = now;
  }

  private grid(v: SplashVolume, x: number, y: number, z: number): [number, number, number] {
    const inv = 1 / this.cfg.dx;
    return [(x - v.ox) * inv, (y - v.oy) * inv, (z - v.oz) * inv];
  }

  private inStencil(gx: number, gy: number, gz: number) {
    const { nx, ny, nz } = this.cfg;
    const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
    return ix >= 1 && ix < nx - 1 && iy >= 1 && iy < ny - 1 && iz >= 1 && iz < nz - 1;
  }

  private p2gMassMomentum(v: SplashVolume, vi: number) {
    const P = this.particles, inv = 1 / this.cfg.dx;
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE) || this.owner[p] !== vi) continue;
      const [gx, gy, gz] = this.grid(v, P.px[p], P.py[p], P.pz[p]);
      if (!this.inStencil(gx, gy, gz)) continue;
      const ci = Math.floor(gx), cj = Math.floor(gy), ck = Math.floor(gz);
      const wx = weights(gx - (ci + 0.5)), wy = weights(gy - (cj + 0.5)), wz = weights(gz - (ck + 0.5));
      const pvx = P.vx[p] * inv, pvy = P.vy[p] * inv, pvz = P.vz[p] * inv;
      const cxx = P.cxx[p], cxy = P.cxy[p], cxz = P.cxz[p], cyx = P.cyx[p], cyy = P.cyy[p], cyz = P.cyz[p], czx = P.czx[p], czy = P.czy[p], czz = P.czz[p];
      for (let ox = 0; ox < 3; ox++) {
        const i = ci + ox - 1, cdx = i + 0.5 - gx;
        for (let oy = 0; oy < 3; oy++) {
          const j = cj + oy - 1, cdy = j + 0.5 - gy, wxy = wx[ox] * wy[oy];
          for (let oz = 0; oz < 3; oz++) {
            const k = ck + oz - 1, cdz = k + 0.5 - gz;
            const m = wxy * wz[oz];
            const idx = v.idx(i, j, k);
            v.mass[idx] += m;
            v.mx[idx] += m * (pvx + cxx * cdx + cxy * cdy + cxz * cdz);
            v.my[idx] += m * (pvy + cyx * cdx + cyy * cdy + cyz * cdz);
            v.mz[idx] += m * (pvz + czx * cdx + czy * cdy + czz * cdz);
            v.mark(idx);
          }
        }
      }
    }
  }

  private p2gStress(v: SplashVolume, vi: number, dt: number) {
    const P = this.particles;
    const { stiffness, restDensity, viscosity: mu } = this.cfg;
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE) || this.owner[p] !== vi) continue;
      const [gx, gy, gz] = this.grid(v, P.px[p], P.py[p], P.pz[p]);
      if (!this.inStencil(gx, gy, gz)) continue;
      const ci = Math.floor(gx), cj = Math.floor(gy), ck = Math.floor(gz);
      const wx = weights(gx - (ci + 0.5)), wy = weights(gy - (cj + 0.5)), wz = weights(gz - (ck + 0.5));
      let density = 0;
      for (let ox = 0; ox < 3; ox++) for (let oy = 0; oy < 3; oy++) {
        const wxy = wx[ox] * wy[oy];
        for (let oz = 0; oz < 3; oz++) density += v.mass[v.idx(ci + ox - 1, cj + oy - 1, ck + oz - 1)] * wxy * wz[oz];
      }
      if (density <= 1e-6) continue;
      P.density[p] = density;
      const volume = 1 / density;
      const pressure = Math.max(0, stiffness * (density / restDensity - 1));
      const cxx = P.cxx[p], cxy = P.cxy[p], cxz = P.cxz[p], cyx = P.cyx[p], cyy = P.cyy[p], cyz = P.cyz[p], czx = P.czx[p], czy = P.czy[p], czz = P.czz[p];
      const sxx = -pressure + mu * 2 * cxx, syy = -pressure + mu * 2 * cyy, szz = -pressure + mu * 2 * czz;
      const sxy = mu * (cxy + cyx), sxz = mu * (cxz + czx), syz = mu * (cyz + czy);
      const coeff = -volume * 4 * dt;
      for (let ox = 0; ox < 3; ox++) {
        const i = ci + ox - 1, cdx = i + 0.5 - gx;
        for (let oy = 0; oy < 3; oy++) {
          const j = cj + oy - 1, cdy = j + 0.5 - gy, wxy = wx[ox] * wy[oy];
          for (let oz = 0; oz < 3; oz++) {
            const k = ck + oz - 1, cdz = k + 0.5 - gz;
            const w = coeff * wxy * wz[oz];
            const idx = v.idx(i, j, k);
            v.mx[idx] += w * (sxx * cdx + sxy * cdy + sxz * cdz);
            v.my[idx] += w * (sxy * cdx + syy * cdy + syz * cdz);
            v.mz[idx] += w * (sxz * cdx + syz * cdy + szz * cdz);
          }
        }
      }
    }
  }

  private updateGrid(v: SplashVolume, dt: number, colliders: SphereCollider[]) {
    const { dx, ny, nz, maxVelocity } = this.cfg;
    const inv = 1 / dx;
    const gCells = -9.81 * inv * dt;
    const maxV = maxVelocity * inv;
    for (let a = 0; a < v.activeCount; a++) {
      const idx = v.active[a];
      const mass = v.mass[idx];
      if (mass <= 0) continue;
      const i = Math.floor(idx / (ny * nz));
      const rem = idx - i * ny * nz;
      const j = Math.floor(rem / nz), k = rem - j * nz;
      const wx = v.ox + (i + 0.5) * dx, wy = v.oy + (j + 0.5) * dx, wz = v.oz + (k + 0.5) * dx;
      let vx = v.mx[idx] / mass, vy = v.my[idx] / mass + gCells, vz = v.mz[idx] / mass;
      // Heightfield coupling (pool updateGrid): near the interface the moving sea surface
      // drives the fluid; below it the sea supports it (no free fall through the ocean).
      const s = v.surf[i * nz + k];
      const band = 2.5 * dx;
      if (wy < s + band) {
        const depthIn = s - wy;
        if (depthIn > 0) {
          const support = Math.min(1, depthIn / band);
          if (vy < 0) vy *= 1 - 0.85 * support;
          vx *= 1 - 0.25 * support; vz *= 1 - 0.25 * support;
        }
      }
      for (const c of colliders) {
        const ddx = wx - c.cx, ddy = wy - c.cy, ddz = wz - c.cz;
        const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
        if (d2 >= c.radius * c.radius || d2 < 1e-10) continue;
        const d = Math.sqrt(d2);
        const nx = ddx / d, nyy = ddy / d, nzz = ddz / d;
        const rel = (vx - c.vx * inv) * nx + (vy - c.vy * inv) * nyy + (vz - c.vz * inv) * nzz;
        if (rel < 0) {
          const push = -rel + ((c.radius - d) * inv) * 18 * dt;
          vx += push * nx; vy += push * nyy; vz += push * nzz;
          c.fx -= (mass * push * nx) / Math.max(dt, 1e-5);
          c.fy -= (mass * push * nyy) / Math.max(dt, 1e-5);
          c.fz -= (mass * push * nzz) / Math.max(dt, 1e-5);
        }
      }
      const sp2 = vx * vx + vy * vy + vz * vz;
      if (sp2 > maxV * maxV) { const f = maxV / Math.sqrt(sp2); vx *= f; vy *= f; vz *= f; }
      v.mx[idx] = vx; v.my[idx] = vy; v.mz[idx] = vz;
    }
  }

  private g2p(dt: number, water: WaterSampler) {
    const P = this.particles, dx = this.cfg.dx;
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE)) continue;
      const vi = this.owner[p];
      const v = vi >= 0 ? this.volumes[vi] : null;
      const prevY = P.py[p];
      const g = v ? this.grid(v, P.px[p], P.py[p], P.pz[p]) : null;
      if (!v || !g || !this.inStencil(g[0], g[1], g[2])) {
        this.ballistic(p, dt, prevY, water, v);
        continue;
      }
      const [gx, gy, gz] = g;
      const ci = Math.floor(gx), cj = Math.floor(gy), ck = Math.floor(gz);
      const wx = weights(gx - (ci + 0.5)), wy = weights(gy - (cj + 0.5)), wz = weights(gz - (ck + 0.5));
      let nvx = 0, nvy = 0, nvz = 0, cxx = 0, cxy = 0, cxz = 0, cyx = 0, cyy = 0, cyz = 0, czx = 0, czy = 0, czz = 0;
      for (let ox = 0; ox < 3; ox++) {
        const i = ci + ox - 1, cdx = i + 0.5 - gx;
        for (let oy = 0; oy < 3; oy++) {
          const j = cj + oy - 1, cdy = j + 0.5 - gy, wxy = wx[ox] * wy[oy];
          for (let oz = 0; oz < 3; oz++) {
            const k = ck + oz - 1, cdz = k + 0.5 - gz;
            const idx = v.idx(i, j, k);
            if (v.mass[idx] <= 0) continue;
            const w = wxy * wz[oz];
            const a = v.mx[idx] * w, b = v.my[idx] * w, c = v.mz[idx] * w;
            nvx += a; nvy += b; nvz += c;
            cxx += a * cdx; cxy += a * cdy; cxz += a * cdz;
            cyx += b * cdx; cyy += b * cdy; cyz += b * cdz;
            czx += c * cdx; czy += c * cdy; czz += c * cdz;
          }
        }
      }
      P.vx[p] = nvx * dx; P.vy[p] = nvy * dx; P.vz[p] = nvz * dx;
      P.cxx[p] = cxx * 4; P.cxy[p] = cxy * 4; P.cxz[p] = cxz * 4;
      P.cyx[p] = cyx * 4; P.cyy[p] = cyy * 4; P.cyz[p] = cyz * 4;
      P.czx[p] = czx * 4; P.czy[p] = czy * 4; P.czz[p] = czz * 4;
      P.px[p] += P.vx[p] * dt; P.py[p] += P.vy[p] * dt; P.pz[p] += P.vz[p] * dt;
      this.finish(p, dt, prevY, water, v);
    }
  }

  /** Outside every volume: droplet flight with quadratic air drag (pool integrateBallistic + drag). */
  private ballistic(p: number, dt: number, prevY: number, water: WaterSampler, v: SplashVolume | null) {
    const P = this.particles;
    const sp = Math.hypot(P.vx[p], P.vy[p], P.vz[p]);
    const k = 0.06 * sp * dt;
    P.vx[p] /= 1 + k; P.vz[p] /= 1 + k;
    P.vy[p] = (P.vy[p] - 9.81 * dt) / (1 + k);
    P.px[p] += P.vx[p] * dt; P.py[p] += P.vy[p] * dt; P.pz[p] += P.vz[p] * dt;
    P.cxx[p] *= 0.9; P.cxy[p] *= 0.9; P.cxz[p] *= 0.9; P.cyx[p] *= 0.9; P.cyy[p] *= 0.9; P.cyz[p] *= 0.9; P.czx[p] *= 0.9; P.czy[p] *= 0.9; P.czz[p] *= 0.9;
    this.finish(p, dt, prevY, water, v);
  }

  /** Re-entry settles the particle into the heightfield (pool finishParticle, conservative). */
  private finish(p: number, dt: number, prevY: number, water: WaterSampler, v: SplashVolume | null) {
    const P = this.particles;
    P.life[p] += dt;
    const x = P.px[p], z = P.pz[p];
    const s = v && v.contains(x, 0, z) ? v.surfaceAt(x, z) : water.heightAt(x, z);
    if (P.py[p] >= s) P.flags[p] |= FLAG_AIRBORNE; else P.flags[p] &= ~FLAG_AIRBORNE;
    const crossed = prevY > s - 0.02 && P.py[p] <= s && P.vy[p] < -0.05;
    const sunk = P.py[p] < s - 0.3 && P.life[p] > 0.2;
    if (crossed || sunk || P.life[p] > this.cfg.lifetime || !Number.isFinite(P.py[p])) {
      if (!Number.isFinite(P.px[p]) || !Number.isFinite(P.pz[p])) { this.stats.lost += P.vol[p]; P.flags[p] = 0; P.vol[p] = 0; return; }
      this.settle(p, x, z, P.vy[p]);
    }
  }

  /** Retire volumes idle for `idle` seconds. */
  retireIdle(now: number, idle = 3) {
    for (let i = this.volumes.length - 1; i >= 0; i--) {
      const v = this.volumes[i];
      if (now - v.lastUsed > idle && !this.occupied(v)) {
        this.volumes.splice(i, 1);
        // Owner indices shift: recomputed at the next step.
      }
    }
  }
}
