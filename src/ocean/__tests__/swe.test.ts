import { describe, it, expect } from 'vitest';
import { makeGrid, stepSwe, cflDt, volume, H_DRY } from '../sim/sweCpu';
import { terrainHeight } from '../world/terrain';

const G = 9.81;

describe('T2 shallow water (well-balanced, positivity-preserving HR + HLL)', () => {
  it('A3 lake at rest over irregular, partly dry bathymetry stays at rest', () => {
    const g = makeGrid(40, 40, 1);
    for (let j = 0; j < 40; j++)
      for (let i = 0; i < 40; i++) {
        const k = j * 40 + i;
        g.b[k] = -1.5 + 1.2 * Math.sin(i * 0.37) * Math.cos(j * 0.29) + (i > 30 ? 2 : 0); // island on the right
        g.h[k] = Math.max(0, 0 - g.b[k]);
      }
    for (let s = 0; s < 400; s++) stepSwe(g, 0.02, { boundary: 'wall' });
    let maxQ = 0, maxEta = 0;
    for (let k = 0; k < g.h.length; k++) {
      maxQ = Math.max(maxQ, Math.abs(g.hu[k]), Math.abs(g.hv[k]));
      if (g.h[k] > H_DRY) maxEta = Math.max(maxEta, Math.abs(g.h[k] + g.b[k]));
    }
    expect(maxQ).toBeLessThan(1e-10);
    expect(maxEta).toBeLessThan(1e-10);
  });

  it('A2 conserves volume in a closed basin with sloshing and wet/dry fronts', () => {
    const g = makeGrid(48, 32, 0.5);
    for (let j = 0; j < 32; j++)
      for (let i = 0; i < 48; i++) {
        const k = j * 48 + i;
        g.b[k] = -1 + i * 0.05;                          // beach rising to the right
        g.h[k] = Math.max(0, (i < 10 ? 0.4 : 0) - g.b[k]);
      }
    const v0 = volume(g);
    for (let s = 0; s < 1500; s++) stepSwe(g, Math.min(cflDt(g), 0.02), { boundary: 'wall', manning: 0.02 });
    expect(Math.abs(volume(g) - v0) / v0).toBeLessThan(1e-12);
  });

  it('positivity: dry-bed dam break never produces negative depth', () => {
    const g = makeGrid(200, 1, 0.1);
    for (let i = 0; i < 200; i++) g.h[i] = i < 100 ? 1 : 0;
    let minH = 0;
    for (let s = 0; s < 400; s++) {
      stepSwe(g, cflDt(g, 0.45), { boundary: 'wall' });
      for (const h of g.h) minH = Math.min(minH, h);
    }
    expect(minH).toBeGreaterThanOrEqual(0);
  });

  it('A6 dam break over a wet bed matches the Stoker middle state', () => {
    const hl = 2, hr = 0.5;
    const g = makeGrid(800, 1, 0.05);
    for (let i = 0; i < 800; i++) g.h[i] = i < 400 ? hl : hr;
    let t = 0;
    while (t < 2) { const dt = Math.min(cflDt(g, 0.45), 2 - t); stepSwe(g, dt, { boundary: 'wall' }); t += dt; }
    // Stoker: solve for middle depth hm from the shock/rarefaction relations.
    const cl = Math.sqrt(G * hl), cr = Math.sqrt(G * hr);
    let cm = 0.5 * (cl + cr);
    for (let it = 0; it < 200; it++) {
      const hm = (cm * cm) / G;
      const um = 2 * (cl - cm);
      // Shock speed from mass jump: s = hm·um / (hm − hr); momentum jump must also hold.
      const s = (hm * um) / (hm - hr);
      const f = hm * um * um + 0.5 * G * hm * hm - s * hm * um - 0.5 * G * hr * hr;
      cm -= f * 1e-3;
    }
    const hm = (cm * cm) / G;
    // Sample the plateau between the rarefaction tail and the shock.
    const xm = 400 + Math.round((0.5 * (2 * (cl - cm) - cm + (hm * 2 * (cl - cm)) / (hm - hr)) * 2) / 0.05 / 2);
    expect(Math.abs(g.h[xm] - hm) / hm).toBeLessThan(0.05);
  });

  it('A6 dry-bed dam break front advances near the Ritter speed 2√(gh₀)', () => {
    const h0 = 1;
    const g = makeGrid(1600, 1, 0.05);
    for (let i = 0; i < 1600; i++) g.h[i] = i < 400 ? h0 : 0;
    let t = 0;
    const T = 3;
    while (t < T) { const dt = Math.min(cflDt(g, 0.45), T - t); stepSwe(g, dt, { boundary: 'wall' }); t += dt; }
    let front = 400;
    for (let i = 400; i < 1600; i++) if (g.h[i] > 1e-3) front = i;
    const x = (front - 400) * 0.05;
    const ritter = 2 * Math.sqrt(G * h0) * T;
    // First-order schemes smear the tip; the 1 mm contour trails the exact tip a little.
    expect(x / ritter).toBeGreaterThan(0.7);
    expect(x / ritter).toBeLessThan(1.05);
  });

  describe('second order (MUSCL + SSP-RK2)', () => {
    const o2 = { order: 2 as const };

    it('A3 lake at rest with emerged topography stays at rest', () => {
      const g = makeGrid(40, 40, 1);
      for (let j = 0; j < 40; j++)
        for (let i = 0; i < 40; i++) {
          const k = j * 40 + i;
          g.b[k] = -1.5 + 1.2 * Math.sin(i * 0.37) * Math.cos(j * 0.29) + (i > 30 ? 2 : 0);
          g.h[k] = Math.max(0, 0 - g.b[k]);
        }
      for (let s = 0; s < 300; s++) stepSwe(g, 0.02, { boundary: 'wall', ...o2 });
      let maxQ = 0, maxEta = 0;
      for (let k = 0; k < g.h.length; k++) {
        maxQ = Math.max(maxQ, Math.abs(g.hu[k]), Math.abs(g.hv[k]));
        if (g.h[k] > H_DRY) maxEta = Math.max(maxEta, Math.abs(g.h[k] + g.b[k]));
      }
      expect(maxQ).toBeLessThan(1e-10);
      expect(maxEta).toBeLessThan(1e-10);
    });

    it('A2 conserves volume with run-up on a beach', () => {
      const g = makeGrid(48, 24, 0.5);
      for (let j = 0; j < 24; j++)
        for (let i = 0; i < 48; i++) {
          const k = j * 48 + i;
          g.b[k] = -1 + i * 0.05;
          g.h[k] = Math.max(0, (i < 10 ? 0.4 : 0) - g.b[k]);
        }
      const v0 = volume(g);
      for (let s = 0; s < 800; s++) stepSwe(g, Math.min(cflDt(g, 0.25), 0.02), { boundary: 'wall', manning: 0.02, ...o2 });
      expect(Math.abs(volume(g) - v0) / v0).toBeLessThan(1e-12);
    });

    it('positivity on a dry-bed dam break', () => {
      const g = makeGrid(200, 1, 0.1);
      for (let i = 0; i < 200; i++) g.h[i] = i < 100 ? 1 : 0;
      let minH = 0;
      for (let s = 0; s < 400; s++) {
        stepSwe(g, cflDt(g, 0.25), { boundary: 'wall', ...o2 });
        for (const h of g.h) minH = Math.min(minH, h);
      }
      expect(minH).toBeGreaterThanOrEqual(0);
    });

    it('A6 Stoker middle state within 2 %', () => {
      const hl = 2, hr = 0.5;
      const g = makeGrid(800, 1, 0.05);
      for (let i = 0; i < 800; i++) g.h[i] = i < 400 ? hl : hr;
      let t = 0;
      while (t < 2) { const dt = Math.min(cflDt(g, 0.3), 2 - t); stepSwe(g, dt, { boundary: 'wall', ...o2 }); t += dt; }
      // Middle depth from the exact Riemann solution (bisection on the Stoker relation).
      const cl = Math.sqrt(G * hl);
      const f = (hm: number) => 2 * (cl - Math.sqrt(G * hm)) - (hm - hr) * Math.sqrt((0.5 * G * (hm + hr)) / (hm * hr));
      let lo = hr, hi = hl;
      for (let it = 0; it < 100; it++) { const m = 0.5 * (lo + hi); if (f(m) > 0) lo = m; else hi = m; }
      const hm = 0.5 * (lo + hi);
      const um = 2 * (cl - Math.sqrt(G * hm));
      const shock = (hm * um) / (hm - hr);
      const tail = um - Math.sqrt(G * hm);
      const xm = 400 + Math.round(((0.5 * (tail + shock)) * 2) / 0.05);
      expect(Math.abs(g.h[xm] - hm) / hm).toBeLessThan(0.02);
    });

    it('carries a long wave with far less numerical damping than first order', () => {
      // A 40-cell-long small-amplitude wave travels 5 wavelengths over a flat bed.
      const run = (order: 1 | 2) => {
        const n = 400, dx = 1, d = 5, a = 0.05, L = 40;
        const g = makeGrid(n, 1, dx);
        const c = Math.sqrt(G * d);
        for (let i = 0; i < n; i++) {
          g.b[i] = -d;
          const x = (i + 0.5) * dx;
          const eta = x < 2 * L ? a * Math.sin((2 * Math.PI * x) / L) * Math.sin((Math.PI * x) / (2 * L)) ** 2 : 0;
          g.h[i] = d + eta;
          g.hu[i] = g.h[i] * eta * Math.sqrt(G / d);   // right-going
        }
        let m0 = 0;
        for (let i = 0; i < n; i++) m0 = Math.max(m0, g.h[i] - d);
        const T = (5 * L) / c;
        let t = 0;
        while (t < T) { const dt = Math.min(cflDt(g, 0.3), T - t); stepSwe(g, dt, { boundary: 'wall', order }); t += dt; }
        let mx = 0;
        for (let i = 0; i < n; i++) mx = Math.max(mx, g.h[i] - d);
        return mx / m0;
      };
      const r1 = run(1), r2 = run(2);
      console.log(`long-wave amplitude retained after 5 wavelengths: order 1 ${r1.toFixed(3)}, order 2 ${r2.toFixed(3)}`);
      expect(r2).toBeGreaterThan(0.88);
      expect(r2).toBeGreaterThan(r1 + 0.4);
    });
  });

  it('the island bathymetry is deterministic and has a wet shelf and a dry peak', () => {
    const a = terrainHeight(1900, 700), b = terrainHeight(1900, 700);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(20);
    expect(terrainHeight(0, 0)).toBeLessThan(-100);
  });
});
