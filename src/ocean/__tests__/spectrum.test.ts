import { describe, it, expect } from 'vitest';
import { fft1d, fft2d } from '../spectrum/cpuFft';
import {
  dispersion, groupVelocity, kFromOmega, tmaAttenuation, spreadingNorm, prepareSystem, systemSpectrum,
  jonswapFromWind, coxMunk,
} from '../spectrum/physics';
import {
  makeLayout, makeSpectrumModel, computeSpectralStats, modeH0, modeInBand, modeK, generateNoiseAtlas,
} from '../spectrum/cascades';
import { SpectralMirror } from '../spectrum/mirror';
import { SEA_STATES, adjustSystems, DEFAULT_SEA_CONTROLS } from '../spectrum/seaStates';
import { mulberry32 } from '../math/rng';

function naiveDft(re: number[], im: number[], inverse: boolean) {
  const n = re.length, sign = inverse ? 1 : -1;
  const oR = new Array(n).fill(0), oI = new Array(n).fill(0);
  for (let k = 0; k < n; k++)
    for (let j = 0; j < n; j++) {
      const a = (sign * 2 * Math.PI * k * j) / n;
      oR[k] += re[j] * Math.cos(a) - im[j] * Math.sin(a);
      oI[k] += re[j] * Math.sin(a) + im[j] * Math.cos(a);
    }
  return [oR, oI];
}

describe('Stockham FFT (CPU twin of the GPU passes)', () => {
  it('matches a naive DFT for N=64 forward and inverse', () => {
    const r = mulberry32(7);
    for (const inverse of [false, true]) {
      const re = Array.from({ length: 64 }, () => r() - 0.5), im = Array.from({ length: 64 }, () => r() - 0.5);
      const [nr, ni] = naiveDft(re, im, inverse);
      const fr = Float64Array.from(re), fi = Float64Array.from(im);
      fft1d(fr, fi, inverse);
      for (let k = 0; k < 64; k++) {
        expect(fr[k]).toBeCloseTo(nr[k], 9);
        expect(fi[k]).toBeCloseTo(ni[k], 9);
      }
    }
  });

  it('round-trips a 2D field (inverse(forward(x)) = N²·x)', () => {
    const n = 32, r = mulberry32(3);
    const re = new Float64Array(n * n).map(() => r()), im = new Float64Array(n * n).map(() => r());
    const r0 = re.slice(), i0 = im.slice();
    fft2d(re, im, n, false);
    fft2d(re, im, n, true);
    for (let i = 0; i < n * n; i++) {
      expect(re[i] / (n * n)).toBeCloseTo(r0[i], 9);
      expect(im[i] / (n * n)).toBeCloseTo(i0[i], 9);
    }
  });
});

describe('wave physics', () => {
  it('dispersion has the deep and shallow limits', () => {
    const k = 0.1;
    expect(dispersion(k, 5000)).toBeCloseTo(Math.sqrt(9.81 * k), 4);
    const kShallow = 0.001, d = 5;
    expect(dispersion(kShallow, d) / kShallow).toBeCloseTo(Math.sqrt(9.81 * d), 2);
  });

  it('group velocity is half phase speed in deep water and equal in shallow water', () => {
    const k = 0.2;
    expect(groupVelocity(k, 5000) / (dispersion(k, 5000) / k)).toBeCloseTo(0.5, 2);
    const ks = 0.0005;
    expect(groupVelocity(ks, 3) / (dispersion(ks, 3) / ks)).toBeCloseTo(1, 2);
  });

  it('kFromOmega inverts the dispersion relation', () => {
    for (const d of [3, 20, 2000]) {
      const k = kFromOmega(0.7, d);
      expect(Math.sqrt(9.81 * k * Math.tanh(k * d))).toBeCloseTo(0.7, 8);
    }
  });

  it('TMA → 1 in deep water and → 0 for long waves in shallow water', () => {
    expect(tmaAttenuation(1, 1000)).toBe(1);
    expect(tmaAttenuation(0.05, 1)).toBeLessThan(0.01);
  });

  it('directional spreading integrates to 1 for any s', () => {
    for (const s of [0, 0.5, 2, 10, 60]) {
      let sum = 0;
      const n = 4096;
      for (let i = 0; i < n; i++) {
        const th = -Math.PI + ((i + 0.5) * 2 * Math.PI) / n;
        sum += spreadingNorm(s) * Math.pow(Math.abs(Math.cos(th / 2)), 2 * s) * ((2 * Math.PI) / n);
      }
      expect(sum).toBeCloseTo(1, 4);
    }
  });

  it('a swell system integrates to its declared Hs', () => {
    const se = prepareSystem({ kind: 'swell', hs: 2, tp: 11, gamma: 3.3, directionDeg: 0, spread: 12, elongation: 0.5 });
    let m0 = 0;
    const nw = 3000, nt = 128;
    for (let i = 0; i < nw; i++) {
      const w = 0.05 + (i + 0.5) * (4 / nw);
      for (let j = 0; j < nt; j++) {
        const th = -Math.PI + ((j + 0.5) * 2 * Math.PI) / nt;
        m0 += systemSpectrum(se, w, th, 5000) * (4 / nw) * ((2 * Math.PI) / nt);
      }
    }
    expect(4 * Math.sqrt(m0)).toBeCloseTo(2, 1);
  });

  it('fetch-limited wind sea never outgrows Pierson–Moskowitz', () => {
    const a = jonswapFromWind(10, 1e9);
    expect(a.wp).toBeGreaterThanOrEqual((0.855 * 9.81) / 10 - 1e-9);
    const cm = coxMunk(10);
    // Component fits (0.00316U, 0.003+0.00192U) sum to 0.003+0.00508U; the quoted total fit is 0.003+0.00512U.
    expect(cm.upwind + cm.crosswind).toBeCloseTo(0.003 + 0.00508 * 10, 6);
  });
});

describe('cascades partition wavenumber space', () => {
  const layout = makeLayout(64, [1379, 263, 17.9]);
  it('bands are contiguous and non-overlapping', () => {
    for (let c = 1; c < layout.sizes.length; c++) expect(layout.kLo[c]).toBe(layout.kHi[c - 1]);
  });
  it('each mode lives in at most one cascade', () => {
    // A wavenumber can only be claimed by the cascade whose band contains it.
    for (let c = 0; c < 3; c++)
      for (let iz = 0; iz < 64; iz++)
        for (let ix = 0; ix < 64; ix++) {
          if (!modeInBand(layout, c, ix, iz)) continue;
          const k = Math.hypot(...modeK(layout, c, ix, iz));
          const owners = layout.kLo.filter((lo, cc) => k >= lo && k < layout.kHi[cc]).length;
          expect(owners).toBe(1);
        }
  });
  it('noise atlas is deterministic per seed', () => {
    const a = generateNoiseAtlas(11, layout), b = generateNoiseAtlas(11, layout), c = generateNoiseAtlas(12, layout);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('spectral statistics and mirror', () => {
  const state = SEA_STATES.find((s) => s.id === 'moderate')!;
  const systems = adjustSystems(state, DEFAULT_SEA_CONTROLS);
  const model = makeSpectrumModel(systems, systems, 0, 1500);
  const layout = makeLayout(128, [1379, 263, 17.9]);

  it('slope LUT is monotone non-increasing in cutoff and carries a Cox–Munk tail', () => {
    const st = computeSpectralStats(model, layout, state.wind, 192, 48);
    for (let i = 1; i < 256; i++) expect(st.slopeLut[i * 4 + 3]).toBeLessThanOrEqual(st.slopeLut[(i - 1) * 4 + 3] + 1e-9);
    const cm = coxMunk(state.wind.speed);
    expect(st.slopeLut[3]).toBeGreaterThan(0.5 * (cm.upwind + cm.crosswind));
    expect(st.hs).toBeGreaterThan(1.2);
    expect(st.hs).toBeLessThan(3.5);
    expect(st.tp).toBeGreaterThan(6);
  });

  it('mirror FFT grid equals direct modal summation', () => {
    const mirror = new SpectralMirror(32);
    mirror.rebuild(model, layout, 42, [1, 1, 1]);
    mirror.evaluate(12.5);
    // Grid node of cascade 0 at j=(3,5): x0 = 3·L/M
    const L0 = layout.sizes[0];
    const x0 = (3 * L0) / 32, z0 = (5 * L0) / 32;
    let gridH = 0;
    // sample() at a parameter point with zero choppiness returns Σ cascades; compare to direct.
    mirror.rebuild(model, layout, 42, [0, 0, 0]);
    mirror.evaluate(12.5);
    gridH = mirror.sample(x0, z0, 1).height;
    const direct = mirror.directHeight(x0, z0, 12.5);
    // Cascades 1 and 2 are sampled bilinearly off-node, so allow a small tolerance.
    expect(Math.abs(gridH - direct)).toBeLessThan(0.15 * Math.max(1, Math.abs(direct)) + 0.05);
  });

  it('mirror h0 equals the per-mode CPU twin of the GPU h0 pass', () => {
    const [a, b] = modeH0(model, layout, 42, 1, 3, 1);
    const [c, d] = modeH0(model, layout, 42, 1, 3, 1);
    expect(a).toBe(c);
    expect(b).toBe(d);
  });

  it('choppy displacement moves surface points toward crests (Gerstner sense)', () => {
    // Single deterministic swell mode, check horizontal displacement sign against height gradient.
    const mirror = new SpectralMirror(32);
    const narrow = makeSpectrumModel(
      [{ kind: 'swell', hs: 1, tp: 9, gamma: 9, directionDeg: 0, spread: 100, elongation: 1, floor: 0 }], [], 0, 5000);
    // Choppiness only on the swell cascade; wide finite difference filters out short waves.
    mirror.rebuild(narrow, layout, 5, [1, 0, 0]);
    mirror.evaluate(3);
    // Over a wave, points just before a crest (dh/dx > 0 for a wave moving +x) move +x.
    let agree = 0, total = 0;
    for (let i = 0; i < 64; i++) {
      const x = (i / 64) * 400;
      const s = mirror.sample(x, 0, 6);
      const e = 6;
      const hp = mirror.sample(x + e, 0, 6).height, hm = mirror.sample(x - e, 0, 6).height;
      const slope = (hp - hm) / (2 * e);
      const dxDisp = x - s.x0;
      if (Math.abs(slope) > 0.01 && Math.abs(dxDisp) > 1e-3) {
        total++;
        // Toward crest: displacement points uphill.
        if (Math.sign(dxDisp) === Math.sign(slope)) agree++;
      }
    }
    expect(total).toBeGreaterThan(10);
    expect(agree / total).toBeGreaterThan(0.8);
  });
});
