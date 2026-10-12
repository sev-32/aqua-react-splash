/**
 * Ligaments between splash particles — the pool's MpmConnectivityGraph
 * (src/lib/mpmConnectivity.ts) in metres with a numeric spatial hash.
 * Neighbours closer than `form` bond; bonds stretch, thin (waist) and snap past
 * `break` (with memory), so sheets tear into ligaments and ligaments pinch into
 * drops instead of a cloud of independent spheres.
 */
import type { MpmParticles } from './oceanMpm';
import { FLAG_ALIVE } from './oceanMpm';

export interface LigamentParams {
  form: number;      // m
  break: number;     // m
  memory: number;    // 0..1
  samples: number;   // tendril samples per bond
  thinPower: number;
  maxBonds: number;
}

export interface Bond { a: number; b: number; strength: number; distance: number; age: number }

export class SplashConnectivity {
  readonly bonds = new Map<number, Bond>();
  private buckets = new Map<number, number[]>();
  /** Optional render-only per-particle degree bound. Default Infinity preserves
   * the historical R1/V2 connectivity graph unchanged. V3 uses a finite
   * bound so early dense particle clusters cannot consume all 4,000 bonds. */
  maxDegree = Infinity;

  constructor(public p: LigamentParams) {}

  private static key(a: number, b: number) { return a < b ? a * 1048576 + b : b * 1048576 + a; }
  private static cell(x: number, y: number, z: number, s: number) {
    return ((Math.floor(x / s) + 4096) * 8192 + (Math.floor(y / s) + 4096)) * 8192 + (Math.floor(z / s) + 4096);
  }

  update(P: MpmParticles, dt: number) {
    const { form, memory, maxBonds } = this.p;
    const brk = Math.max(this.p.break, form + 1e-3);
    this.buckets.clear();
    for (let i = 0; i < P.count; i++) {
      if (!(P.flags[i] & FLAG_ALIVE)) continue;
      const k = SplashConnectivity.cell(P.px[i], P.py[i], P.pz[i], form);
      const b = this.buckets.get(k);
      if (b) b.push(i); else this.buckets.set(k, [i]);
    }
    for (const [key, c] of this.bonds) {
      if (!(P.flags[c.a] & FLAG_ALIVE) || !(P.flags[c.b] & FLAG_ALIVE)) { this.bonds.delete(key); continue; }
      const d = Math.hypot(P.px[c.a] - P.px[c.b], P.py[c.a] - P.py[c.b], P.pz[c.a] - P.pz[c.b]);
      c.distance = d; c.age += dt;
      if (d > brk * (1 + memory) || c.strength < 0.025) { this.bonds.delete(key); continue; }
      const stretch = Math.max(0, (d - form) / (brk - form));
      const target = Math.pow(Math.max(0, 1 - stretch), 0.65);
      const rate = d > brk ? 2.4 / Math.max(0.08, memory) : 14;
      c.strength += (target - c.strength) * Math.min(1, dt * rate);
    }
    const cap = Number.isFinite(this.maxDegree) ? Math.max(1, Math.floor(this.maxDegree)) : Infinity;
    const degree = new Uint16Array(P.count);
    if (Number.isFinite(cap)) {
      // Prefer persistent strong, short connections. The original
      // global-budget algorithm filled all bonds among earliest particles,
      // leaving most of a large crown visually unconnected.
      const order = [...this.bonds.entries()].sort((a,b)=>
        (b[1].strength-a[1].strength) ||
        (a[1].distance-b[1].distance));
      for (const [key,e] of order) {
        if (degree[e.a]>=cap || degree[e.b]>=cap) {
          this.bonds.delete(key);
          continue;
        }
        degree[e.a]++;degree[e.b]++;
      }
    } else {
      for (const e of this.bonds.values()) {
        degree[e.a]++;degree[e.b]++;
      }
    }
    if (this.bonds.size >= maxBonds) return;
    for (const [, ids] of this.buckets) {
      for (const a of ids) {
        if (degree[a]>=cap)continue;
        const hx = Math.floor(P.px[a] / form), hy = Math.floor(P.py[a] / form), hz = Math.floor(P.pz[a] / form);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
          const nb = this.buckets.get(((hx + ox + 4096) * 8192 + (hy + oy + 4096)) * 8192 + (hz + oz + 4096));
          if (!nb) continue;
          for (const b of nb) {
            if (b <= a || degree[a]>=cap || degree[b]>=cap) continue;
            const key = SplashConnectivity.key(a, b);
            if (this.bonds.has(key)) continue;
            const d = Math.hypot(P.px[a] - P.px[b], P.py[a] - P.py[b], P.pz[a] - P.pz[b]);
            if (d > form) continue;
            this.bonds.set(key, { a, b, strength: 1, distance: d, age: 0 });
            degree[a]++;degree[b]++;
            if (this.bonds.size >= maxBonds) return;
          }
        }
      }
    }
  }
}
