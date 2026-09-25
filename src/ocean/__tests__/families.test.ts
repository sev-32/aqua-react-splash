import { describe, it, expect } from 'vitest';
import { FAMILY_LIBRARY, FAMILY_SIZES, makeFamilyModel, familyEnergy, familyStats } from '../spectrum/families';
import { makeLayout } from '../spectrum/cascades';
import { SpectralMirror } from '../spectrum/mirror';
import { SEA_STATES } from '../spectrum/seaStates';

const ONE = { energy: 1, swell: 1, windSea: 1, chop: 1, windSpeed: 1, directionOffsetDeg: 0, spread: 1, crossSea: 1 };

describe('cascade families (POSEIDON spectral authority)', () => {
  const layout = makeLayout(64, FAMILY_SIZES);
  const lib = FAMILY_LIBRARY;

  it('library is index-aligned with the sea-state list', () => {
    expect(lib.length).toBe(SEA_STATES.length);
    lib.forEach((s) => expect(s.map((f) => f.size)).toEqual(FAMILY_SIZES));
  });

  it('shader-unit strength and crop follow POSEIDON setCascadeUniforms/applySeaStateSpectrum', () => {
    const m = makeFamilyModel(lib[3], lib[3], 0, ONE, 1500);
    const f = m.cascades[1];
    expect(f.A).toBeCloseTo((0.45 * 0.081) / (280 * 280), 12);
    expect(f.chop).toBeCloseTo(1.08, 9);           // λ = −crop
    expect(f.kMin).toBeCloseTo((2 * Math.PI) / 150, 9);
    const half = makeFamilyModel(lib[3], lib[3], 0, { ...ONE, energy: 0.25 }, 1500);
    expect(half.cascades[1].chop).toBeCloseTo(1.08 * 0.5, 9); // crop·√scale
  });

  it('energy is zero outside a family band and peaks near its peak wave along its direction', () => {
    const f = makeFamilyModel(lib[3], lib[3], 0, ONE, 1500).cascades[1];
    expect(familyEnergy(f, (2 * Math.PI) / 200, 0)).toBe(0);
    const kp = (2 * Math.PI) / 31;
    const along = familyEnergy(f, kp * f.dir[0], kp * f.dir[1]);
    const against = familyEnergy(f, -kp * f.dir[0], -kp * f.dir[1]);
    expect(along).toBeGreaterThan(20 * against);
  });

  it('sea states grow monotonically from glassy calm to heavy storm', () => {
    let prev = 0;
    for (let i = 0; i < lib.length; i++) {
      const st = familyStats(makeFamilyModel(lib[i], lib[i], 0, ONE, 1500), layout);
      expect(st.hs).toBeGreaterThan(prev);
      prev = st.hs;
    }
    const calm = familyStats(makeFamilyModel(lib[0], lib[0], 0, ONE, 1500), layout);
    expect(calm.hs).toBeLessThan(0.5);
  });

  it('CPU mirror equals direct modal summation of the family model', () => {
    const model = makeFamilyModel(lib[3], lib[3], 0, ONE, 1500);
    const mirror = new SpectralMirror(32);
    mirror.rebuildFamilies({ ...model, cascades: model.cascades.map((f) => ({ ...f, chop: 0 })) }, layout, 42);
    mirror.evaluate(7.25);
    const L0 = layout.sizes[0];
    const x0 = (3 * L0) / 32, z0 = (5 * L0) / 32;
    const grid = mirror.sample(x0, z0, 1).height;
    const direct = mirror.directHeight(x0, z0, 7.25);
    expect(Math.abs(grid - direct)).toBeLessThan(0.15 * Math.max(1, Math.abs(direct)) + 0.05);
  });
});
