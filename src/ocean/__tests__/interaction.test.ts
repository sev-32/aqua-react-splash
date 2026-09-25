import { describe, it, expect } from 'vitest';
import { EwaveCpu, limitRepresentability } from '../sim/ewaveCpu';
import { dispersion } from '../spectrum/physics';

describe('eWave interaction field (CPU reference of the GPU tile)', () => {
  const p = { n: 64, dx: 0.5, depth: 50, damping: 0, viscosity: 0 };

  it('conserves volume exactly (k=0 mode untouched)', () => {
    const w = new EwaveCpu(p);
    for (let z = 20; z < 30; z++) for (let x = 20; x < 30; x++) w.eta[z * 64 + x] = 0.3;
    const v0 = w.volume();
    for (let i = 0; i < 50; i++) w.step(1 / 30);
    expect(w.volume()).toBeCloseTo(v0, 9);
  });

  it('a single mode oscillates at exactly ω(k) (exact dispersion)', () => {
    const w = new EwaveCpu(p);
    const n = 64, L = n * p.dx, m = 5;
    const k = (2 * Math.PI * m) / L;
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) w.eta[z * n + x] = 0.1 * Math.cos(k * x * p.dx);
    const omega = dispersion(k, p.depth);
    const T = (2 * Math.PI) / omega;
    const steps = 40, dt = T / steps;
    for (let i = 0; i < steps; i++) w.step(dt);
    // After one full period the standing wave returns to its initial shape.
    expect(w.eta[0]).toBeCloseTo(0.1, 6);
    expect(w.eta[Math.round(n / (2 * m))]).toBeCloseTo(-0.1, 2);
  });

  it('is energy-preserving without damping (rotation, no growth)', () => {
    const w = new EwaveCpu(p);
    w.eta[32 * 64 + 32] = 0.5;
    const e0 = w.potentialEnergy();
    let maxE = 0;
    for (let i = 0; i < 200; i++) { w.step(0.05); maxE = Math.max(maxE, w.potentialEnergy()); }
    // Potential energy sloshes into kinetic but never exceeds the initial total.
    expect(maxE).toBeLessThanOrEqual(e0 * 1.0001);
  });

  it('damping only removes energy', () => {
    const w = new EwaveCpu({ ...p, damping: 0.2, viscosity: 0.01 });
    w.eta[32 * 64 + 32] = 0.5;
    const e0 = w.potentialEnergy();
    for (let i = 0; i < 100; i++) w.step(0.05);
    expect(w.potentialEnergy()).toBeLessThan(e0 * 0.5);
  });
});

describe('Representability Limiter (heightfield → splash release)', () => {
  it('removes exactly the released volume and leaves representable shapes untouched', () => {
    const n = 32, dx = 0.5;
    const eta = new Float64Array(n * n), phi = new Float64Array(n * n);
    // Gentle swell (slope 0.1) — must be untouched.
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) eta[z * n + x] = 0.1 * dx * x;
    const before = eta.slice();
    const r0 = limitRepresentability(eta, phi, null, n, dx, 1 / 30, 0.6, 0.5);
    expect(r0.volume).toBe(0);
    expect(eta).toEqual(before);
    // A needle crest 2 m tall on one cell — unrepresentable, must release.
    eta[16 * n + 16] += 2;
    const sum0 = eta.reduce((a, b) => a + b, 0) * dx * dx;
    const r = limitRepresentability(eta, phi, null, n, dx, 1 / 30, 0.6, 0.5);
    const sum1 = eta.reduce((a, b) => a + b, 0) * dx * dx;
    expect(r.volume).toBeGreaterThan(0);
    expect(sum0 - sum1).toBeCloseTo(r.volume, 12); // exact escrow: removed == released
  });

  it('a surface rising faster than it can hold together releases water with its jet speed (volume exact)', () => {
    const n = 32, dx = 1, dt = 1 / 30;
    // A smooth impact mound (slopes below the envelope) that rose 0.7 m in one frame (w = 21 m/s).
    const eta = new Float64Array(n * n), prev = new Float64Array(n * n), phi = new Float64Array(n * n);
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
      const r2 = (x - 16) ** 2 + (z - 16) ** 2;
      eta[z * n + x] = 0.9 * Math.exp(-r2 / 9);
      prev[z * n + x] = 0.2 * Math.exp(-r2 / 9);
    }
    const before = eta.reduce((a, v) => a + v, 0) * dx * dx;
    const slopeOnly = limitRepresentability(new Float64Array(eta), phi, prev, n, dx, dt, 0.62, 0.5);
    expect(slopeOnly.volume).toBe(0);                  // shape alone is representable
    const wCrit = 1.3 * Math.sqrt(9.81 * dx);
    const r = limitRepresentability(eta, phi, prev, n, dx, dt, 0.62, 0.5, undefined, wCrit);
    const after = eta.reduce((a, v) => a + v, 0) * dx * dx;
    expect(r.volume).toBeGreaterThan(0.05);
    expect(after + r.volume).toBeCloseTo(before, 10);  // nothing invented, nothing lost
    expect(r.momentumY / r.volume).toBeGreaterThan(wCrit); // leaves at jet speed
    // A gently heaving swell (w ≈ ωa ≈ 0.5 m/s) never triggers.
    const swell = new Float64Array(n * n).fill(0.5), swellPrev = new Float64Array(n * n).fill(0.48);
    expect(limitRepresentability(swell, phi, swellPrev, n, dx, dt, 0.62, 0.5, undefined, wCrit).volume).toBe(0);
  });

  it('repeated limiting converges to the envelope', () => {
    const n = 32, dx = 0.5, maxSlope = 0.6;
    const eta = new Float64Array(n * n), phi = new Float64Array(n * n);
    eta[16 * n + 16] = 3;
    let total = 0;
    for (let i = 0; i < 60; i++) total += limitRepresentability(eta, phi, null, n, dx, 1 / 30, maxSlope, 0.5).volume;
    const i = 16 * n + 16;
    const lo = Math.min(eta[i - 1], eta[i + 1], eta[i - n], eta[i + n]);
    expect(eta[i] - lo).toBeLessThanOrEqual(maxSlope * dx + 1e-3);
    expect(total).toBeCloseTo((3 - maxSlope * dx) * dx * dx, 2);
  });
});
