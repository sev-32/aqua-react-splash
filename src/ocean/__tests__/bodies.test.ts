import { describe, it, expect } from 'vitest';
import { createBody, stepBody, RHO_WATER, type WaterQuery } from '../physics/bodies';
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
});
