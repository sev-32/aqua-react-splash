import type { MpmParams } from './waterStore';

export interface MpmConnection {
  a: number;
  b: number;
  age: number;
  strength: number;
  distance: number;
}

const keyFor = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export class MpmConnectivityGraph {
  readonly connections = new Map<string, MpmConnection>();
  private readonly active = new Set<number>();
  private readonly buckets = new Map<string, number[]>();

  update(
    ids: Int32Array,
    count: number,
    px: Float32Array,
    py: Float32Array,
    pz: Float32Array,
    params: MpmParams,
    dt: number,
  ) {
    const formRadius = Math.max(0.025, params.formRadius);
    const breakRadius = Math.max(formRadius + 0.005, params.breakRadius);
    const cellSize = formRadius;
    const maxConnections = 1800;

    this.active.clear();
    this.buckets.clear();

    for (let i = 0; i < count; i++) {
      const id = ids[i];
      this.active.add(id);
      const key = `${Math.floor(px[id] / cellSize)},${Math.floor(py[id] / cellSize)},${Math.floor(pz[id] / cellSize)}`;
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(id);
      else this.buckets.set(key, [id]);
    }

    for (const [key, c] of this.connections) {
      if (!this.active.has(c.a) || !this.active.has(c.b)) {
        this.connections.delete(key);
        continue;
      }
      const dx = px[c.a] - px[c.b];
      const dy = py[c.a] - py[c.b];
      const dz = pz[c.a] - pz[c.b];
      const d = Math.hypot(dx, dy, dz);
      c.distance = d;
      c.age += dt;
      if (d > breakRadius * (1 + params.connectionMemory) || c.strength < 0.025) {
        this.connections.delete(key);
        continue;
      }
      const stretch = Math.max(0, (d - formRadius) / Math.max(1e-5, breakRadius - formRadius));
      const target = Math.pow(Math.max(0, 1 - stretch), 0.65);
      const rate = d > breakRadius ? 2.4 / Math.max(0.08, params.connectionMemory) : 14;
      c.strength += (target - c.strength) * Math.min(1, dt * rate);
    }

    if (this.connections.size >= maxConnections) return;

    for (let i = 0; i < count && this.connections.size < maxConnections; i++) {
      const a = ids[i];
      const hx = Math.floor(px[a] / cellSize);
      const hy = Math.floor(py[a] / cellSize);
      const hz = Math.floor(pz[a] / cellSize);

      for (let ox = -1; ox <= 1 && this.connections.size < maxConnections; ox++) {
        for (let oy = -1; oy <= 1 && this.connections.size < maxConnections; oy++) {
          for (let oz = -1; oz <= 1 && this.connections.size < maxConnections; oz++) {
            const bucket = this.buckets.get(`${hx + ox},${hy + oy},${hz + oz}`);
            if (!bucket) continue;
            for (let k = 0; k < bucket.length && this.connections.size < maxConnections; k++) {
              const b = bucket[k];
              if (b <= a) continue;
              const key = keyFor(a, b);
              if (this.connections.has(key)) continue;
              const dx = px[a] - px[b];
              const dy = py[a] - py[b];
              const dz = pz[a] - pz[b];
              const d = Math.hypot(dx, dy, dz);
              if (d > formRadius) continue;
              this.connections.set(key, { a, b, age: 0, strength: 1, distance: d });
            }
          }
        }
      }
    }
  }

  clear() {
    this.connections.clear();
    this.active.clear();
    this.buckets.clear();
  }
}