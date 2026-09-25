import { describe, it, expect } from 'vitest';
import { createBody, stepBody, displacedBelow, entryJetFlux, RHO_WATER, type WaterQuery } from '../physics/bodies';
import { quatRotate } from '../math/mat4';

const flat: WaterQuery = { sample: () => ({ height: 0, vx: 0, vy: 0, vz: 0, normal: [0, 1, 0] }) };

describe('rigid bodies on water', () => {
  it('a box at half the density of water floats half-submerged (Archimedes)', () => {
    const b = createBody({ label: 'box', shape: { kind: 'box', half: [1, 0.5, 1] }, density: RHO_WATER * 0.5, pos: [0, 1, 0] });
    for (let i = 0; i < 120 * 30; i++) stepBody(b, flat, 1 / 120);
    // Centre sits at the waterline: bottom at -0.5, top at +0.5.
    expect(b.pos[1]).toBeCloseTo(0, 1);
    expect(Math.abs(b.vel[1])).toBeLessThan(0.02);
  });

  it('a rock sinks', () => {
    const b = createBody({ label: 'rock', shape: { kind: 'sphere', radius: 0.6 }, density: 2600, pos: [0, 2, 0] });
    for (let i = 0; i < 120 * 4; i++) stepBody(b, flat, 1 / 120);
    expect(b.pos[1]).toBeLessThan(-1);
  });

  it('a hull floats upright at a draft below its keel depth', () => {
    const b = createBody({ label: 'boat', shape: { kind: 'hull', length: 8, beam: 2.6, draft: 0.9, freeboard: 0.9 }, density: 340, pos: [0, 0.5, 0] });
    for (let i = 0; i < 120 * 40; i++) stepBody(b, flat, 1 / 120);
    const up = quatRotate(b.rot, [0, 1, 0]);
    expect(up[1]).toBeGreaterThan(0.98);
    expect(b.pos[1]).toBeGreaterThan(-0.9);
    expect(b.pos[1]).toBeLessThan(0.9);
    expect(b.immersion).toBeGreaterThan(0.2);
  });

  it('a floating body follows a heaving sea surface', () => {
    let t = 0;
    const heave: WaterQuery = { sample: () => ({ height: 0.8 * Math.sin(0.5 * t), vx: 0, vy: 0.4 * Math.cos(0.5 * t), vz: 0, normal: [0, 1, 0] }) };
    const b = createBody({ label: 'buoy', shape: { kind: 'sphere', radius: 0.7 }, density: 300, pos: [0, 0, 0] });
    let maxY = -1e9, minY = 1e9;
    for (let i = 0; i < 120 * 40; i++) {
      t += 1 / 120;
      stepBody(b, heave, 1 / 120);
      if (t > 10) { maxY = Math.max(maxY, b.pos[1]); minY = Math.min(minY, b.pos[1]); }
    }
    expect(maxY - minY).toBeGreaterThan(1.2); // rides most of the 1.6 m heave
  });

  it('measures displacement below a reference level (sphere exact, columns integrated)', () => {
    const s = createBody({ label: 'ball', shape: { kind: 'sphere', radius: 0.6 }, density: 700, pos: [0, 0, 0] });
    const half = displacedBelow(s, () => 0);
    expect(half.volume).toBeCloseTo((2 / 3) * Math.PI * 0.6 ** 3, 6);
    expect(half.a).toBeCloseTo(0.6, 6);
    s.pos[1] = -1;
    expect(displacedBelow(s, () => 0).volume).toBeCloseTo((4 / 3) * Math.PI * 0.6 ** 3, 6);
    const box = createBody({ label: 'box', shape: { kind: 'box', half: [1, 0.5, 1] }, density: 500, pos: [0, 0, 0] });
    const d = displacedBelow(box, () => 0);
    expect(d.volume).toBeCloseTo(2, 6);
    expect(d.a).toBeCloseTo(Math.sqrt(4 / Math.PI), 6);
  });

  it('throws the Froude excess of an entry, and nothing from a slow one', () => {
    // A 0.6 m ball entering at constant U: integrate the jet over the whole immersion.
    const thrown = (U: number) => {
      const b = createBody({ label: 'ball', shape: { kind: 'sphere', radius: 0.6 }, density: 700, pos: [0, 0.6, 0] });
      const dt = 1 / 2000;
      let prev = displacedBelow(b, () => 0).volume, sum = 0;
      while (b.pos[1] > -0.6) {
        b.pos[1] -= U * dt;
        const g = displacedBelow(b, () => 0);
        sum += entryJetFlux((g.volume - prev) / dt, U, g.a) * dt;
        prev = g.volume;
      }
      return sum / ((4 / 3) * Math.PI * 0.6 ** 3);
    };
    const fast = thrown(7), slow = thrown(1);
    expect(fast).toBeGreaterThan(0.5);
    expect(fast).toBeLessThan(0.8);
    expect(slow).toBeLessThan(1e-3); // only the first touch (a → 0) outruns its waves
    expect(thrown(12)).toBeGreaterThan(fast); // harder entries throw more of their displacement
  });
});
