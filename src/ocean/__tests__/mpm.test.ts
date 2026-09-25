import { describe, it, expect } from 'vitest';
import { OceanMpm, DEFAULT_MPM, FLAG_ALIVE, type SphereCollider } from '../sim/oceanMpm';

const flat = { heightAt: () => 0 };

function run(mpm: OceanMpm, seconds: number, colliders: SphereCollider[] = [], dt = 1 / 30) {
  let t = 0, maxH = -1e9, maxSpeed = 0, settledEvents = 0;
  while (t < seconds) {
    mpm.step(dt, flat, colliders, t);
    settledEvents += mpm.settleEvents.length;
    const P = mpm.particles;
    for (let p = 0; p < P.count; p++) {
      if (!(P.flags[p] & FLAG_ALIVE)) continue;
      maxH = Math.max(maxH, P.py[p]);
      maxSpeed = Math.max(maxSpeed, Math.hypot(P.vx[p], P.vy[p], P.vz[p]));
      expect(Number.isFinite(P.px[p] + P.py[p] + P.pz[p])).toBe(true);
    }
    t += dt;
  }
  return { maxH, maxSpeed, settledEvents };
}

describe('T4 MLS-MPM splash (evolved from the pool solver)', () => {
  it('an impact release becomes a crown + jet that rises, falls back and settles: water is conserved exactly', () => {
    const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 3000 });
    const V = 3.4;
    mpm.emitRelease({ x: 0, z: 0, y: 0.7, volume: V, vx: 0, vy: 12, vz: 0 }, 'impact', 2.8, 0);
    expect(mpm.stats.emitted).toBeCloseTo(V, 12);
    const r1 = run(mpm, 0.6);
    // Mid-flight: water is in the air and accounted for.
    expect(r1.maxH).toBeGreaterThan(1.0);
    expect(r1.maxH).toBeLessThan(15);
    expect(mpm.stats.airborne + mpm.stats.settled).toBeCloseTo(V, 9);
    run(mpm, 5);
    // Everything has come home.
    expect(mpm.stats.alive).toBe(0);
    expect(mpm.stats.settled).toBeCloseTo(V, 9);
    expect(mpm.stats.lost).toBe(0);
  });

  it('stays stable: bounded speeds, no NaN, sheets thrown along the release direction', () => {
    const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 2000 });
    mpm.emitRelease({ x: 5, z: -3, y: 0.4, volume: 1.2, vx: 6, vy: 3, vz: 0 }, 'sheet', 1.5, 0);
    const P = mpm.particles;
    let meanVx = 0, n = 0;
    run(mpm, 0.2);
    for (let p = 0; p < P.count; p++) if (P.flags[p] & FLAG_ALIVE) { meanVx += P.vx[p]; n++; }
    expect(meanVx / Math.max(n, 1)).toBeGreaterThan(2);
    const r = run(mpm, 1.5);
    expect(r.maxSpeed).toBeLessThanOrEqual(DEFAULT_MPM.maxVelocity + 1e-3);
  });

  it('the physics does not depend on how finely the water is sampled (mass ∝ volume)', () => {
    // The same crown sampled by 60 or by ~400 particles must fly the same way: pressure
    // reads water mass per cell, not particles per cell.
    const spread = (count: number) => {
      const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 2000 });
      mpm.emitRelease({ x: 0, z: 0, y: 0, volume: 0.5, vx: 0, vy: 4, vz: 0, vr: 2 }, 'crown', 0.7, 0, count);
      run(mpm, 0.4);
      const P = mpm.particles;
      let r = 0, y = 0, n = 0;
      for (let p = 0; p < P.count; p++) if (P.flags[p] & FLAG_ALIVE) { r += Math.hypot(P.px[p], P.pz[p]); y += P.py[p]; n++; }
      return { r: r / n, y: y / n };
    };
    const coarse = spread(60), fine = spread(2000);
    expect(Math.abs(fine.r - coarse.r) / coarse.r).toBeLessThan(0.15);
    expect(Math.abs(fine.y - coarse.y)).toBeLessThan(0.15);
  });

  it('a moving sphere pushes the fluid and feels the reaction (two-way, pool collider)', () => {
    const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 2000 });
    mpm.emitRelease({ x: 0, z: 0, y: 0.3, volume: 1.5, vx: 0, vy: 5, vz: 0 }, 'impact', 1.2, 0);
    const ball: SphereCollider = { cx: 0, cy: 1.2, cz: 0, vx: 0, vy: -6, vz: 0, radius: 1.0, fx: 0, fy: 0, fz: 0 };
    let fyMax = 0;
    for (let i = 0; i < 12; i++) {
      mpm.step(1 / 30, flat, [ball], i / 30);
      fyMax = Math.max(fyMax, Math.abs(ball.fy));
    }
    expect(fyMax).toBeGreaterThan(0);
  });

  it('allocates volumes JIT and recycles idle ones within the budget', () => {
    const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 500, maxVolumes: 2 });
    mpm.volumeFor(0, 0, 0);
    mpm.volumeFor(100, 0, 0);
    expect(mpm.volumes.length).toBe(2);
    expect(mpm.volumeFor(300, 300, 1)).not.toBeNull();   // idle volume recycled
    expect(mpm.volumes.length).toBe(2);
  });
});
