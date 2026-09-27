import { describe, it, expect } from 'vitest';
import { CarpetCpu, carpetSubsteps, stableKappa, carpetDx, CARPET_SMOOTH, KAPPA_TARGET, type CarpetSphere } from '../sim/carpetCpu';
import { sampleField, armAngle, trackWavelength } from '../sim/wakeMetrics';

/** A carpet with the production numerics (hold stiffness and substeps from carpetParams). */
function carpet(n: number, dx: number, depth: number, blocked = true, origin: [number, number] = [-(n / 2) * dx, -(n / 2) * dx]) {
  return new CarpetCpu({ n, dx, depth, damping: 0.02, viscosity: 0.0005, kappa: blocked ? undefined : 0, smooth: blocked ? CARPET_SMOOTH : 0 }, origin);
}
function runTow(c: CarpetCpu, body: CarpetSphere, U: number, T: number, follow = false, dt = 1 / 60) {
  const sub = carpetSubsteps(c.dx, dt, U);
  const x0 = body.x;
  let t = 0;
  while (t < T - 1e-9) {
    for (let k = 0; k < sub; k++) {
      t += dt / sub;
      body.x = x0 + U * t;
      c.p.kappa = c.p.kappa === 0 ? 0 : stableKappa(c.dx, dt / sub);
      c.step([body], dt / sub);
    }
    if (follow) {
      const size = c.n * c.dx, cx = c.origin[0] + size / 2, want = body.x - size * 0.2;
      if (Math.abs(want - cx) > size * 0.16) c.shift(Math.round((want - cx) / c.dx / 16) * 16, 0);
    }
  }
}
const closure = (c: CarpetCpu) => c.volume() - (c.ledger.source - c.ledger.sponge - c.ledger.released - c.ledger.shifted);

describe('carpet kernel numerics (shared with the GPU tiles)', () => {
  it('substeps reach the target stiffness and keep bodies under half a cell per substep', () => {
    expect(carpetSubsteps(0.107, 1 / 60, 1)).toBe(3);
    expect(stableKappa(0.107, 1 / 180)).toBe(KAPPA_TARGET);
    expect(carpetSubsteps(0.5, 1 / 60, 0)).toBe(2);                 // coarse hull tiles
    expect(carpetSubsteps(0.1, 1 / 60, 12)).toBe(4);                // capped
    expect(carpetDx(1.2)).toBe(0.1);                                  // the lab sphere (r 0.6)
    expect(carpetDx(1.36)).toBe(0.1);
    expect(carpetDx(0.3)).toBe(0.05);
  });
});

describe('carpet kernel (CPU mirror of the GPU tile)', () => {
  it('closes its volume ledger exactly through tows, the sponge and recentring', () => {
    const c = carpet(64, 0.2, 3);
    const b: CarpetSphere = { x: -2, y: 0.1, z: 0.3, r: 0.9 };
    runTow(c, b, 2.5, 4, true);
    expect(c.ledger.shifted).not.toBe(0);
    expect(Math.abs(closure(c))).toBeLessThan(1e-9);
  });

  it('a body resting in calm water leaves it calm (displacement is already done)', () => {
    const c = carpet(64, 0.2, 5);
    const b: CarpetSphere = { x: 0, y: 0.1, z: 0, r: 1 };
    c.occupancy([b], () => 0, c.occ, c.chi);
    for (let i = 0; i < 120; i++) c.step([b], 1 / 60);
    expect(Math.max(...Array.from(c.eta, Math.abs))).toBeLessThan(1e-12);
  });

  it('a body riding a swell does not pump the field (no drift, no growth)', () => {
    const n = 64, dx = 0.25, c = carpet(n, dx, 30);
    const A = 0.4, L = 24, k = (2 * Math.PI) / L, w = Math.sqrt(9.81 * k);
    let time = 0;
    const ref = (x: number) => A * Math.sin(k * x - w * time);
    const b: CarpetSphere = { x: 0.3, y: 0.15, z: 0, r: 1 };
    b.y = ref(b.x) + 0.15;
    c.occupancy([b], (x) => ref(x), c.occ, c.chi);
    const peaks: number[] = [];
    for (let s = 0; s < 40; s++) {
      let m = 0;
      for (let i = 0; i < 60; i++) {
        time += 1 / 60;
        b.y = ref(b.x) + 0.15;                    // floating: heaves with the sea at its centre
        c.step([b], 1 / 60, (x) => ref(x));
        for (const e of c.eta) m = Math.max(m, Math.abs(e));
      }
      peaks.push(m);
    }
    // The curvature of the swell across the hull radiates a small, steady scattered field …
    expect(Math.max(...peaks)).toBeLessThan(0.1 * A);
    // … that settles instead of accumulating.
    const early = Math.max(...peaks.slice(5, 15)), late = Math.max(...peaks.slice(30));
    expect(late).toBeLessThan(1.3 * early);
    expect(Math.abs(closure(c))).toBeLessThan(1e-9);
  });

  it('holds the water under a piercing hull: the tow residual under the body stays small', () => {
    const c = carpet(128, 0.107, 1);
    const b: CarpetSphere = { x: -3, y: 0.12, z: 0, r: 0.68 };
    c.occupancy([b], () => 0, c.occ, c.chi);
    runTow(c, b, 2, 1.5);
    let inside = 0, cnt = 0, occMax = 0;
    for (let i = 0; i < c.eta.length; i++) if (c.chi[i] > 0.5) { inside += Math.abs(c.eta[i]); cnt++; occMax = Math.max(occMax, c.occ[i]); }
    expect(inside / cnt).toBeLessThan(0.03 * occMax);
  });

  it('a fast tow does not drain the sea through its bow wave (breaking dissipates, spray stays bounded)', () => {
    const n = 128, dx = 0.1, U = 4.5;
    const c = new CarpetCpu({ n, dx, depth: 1, damping: 0.06, viscosity: 0.004, smooth: CARPET_SMOOTH, limiter: true, maxSlope: 0.62, relax: 0.5 }, [-(n / 2) * dx, -(n / 2) * dx]);
    const b: CarpetSphere = { x: -4, y: 0.12, z: 0, r: 0.68 };
    c.occupancy([b], () => 0, c.occ, c.chi);
    runTow(c, b, U, 1.2, true);
    // The sphere sweeps ~3 m³/s of water aside; what leaves as spray is a small fraction of it.
    expect(c.ledger.released).toBeGreaterThan(0);
    expect(c.ledger.released).toBeLessThan(0.5);
    expect(Math.min(...Array.from(c.eta))).toBeGreaterThan(-0.6);
    expect(Math.abs(closure(c))).toBeLessThan(1e-9);
  });

  it('blocks: waves do not pass through a held body (transparent source form lets them)', () => {
    const shadow = (blocked: boolean) => {
      const n = 64, dx = 0.2, c = carpet(n, dx, 30, blocked);
      // A row of piercing spheres across the field: a breakwater with narrow gaps.
      const bodies: CarpetSphere[] = [];
      for (let z = -6.4 + 1.07; z < 6.4; z += 2.13) bodies.push({ x: 0, y: 0, z, r: 0.95 });
      c.occupancy(bodies, () => 0, c.occ, c.chi);
      // A wave packet (λ = 2 m) travelling +x toward it, φ from the linear relation.
      const k = Math.PI, w = Math.sqrt(9.81 * k);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = c.origin[0] + (i + 0.5) * dx, env = Math.exp(-(((x + 3.2) / 1.2) ** 2));
        c.eta[j * n + i] = 0.02 * env * Math.cos(k * x);
        c.phi[j * n + i] = ((0.02 * w) / k) * env * Math.sin(k * x);
      }
      let e = 0;
      const dt = 1 / 60, sub = carpetSubsteps(dx, dt, 0);
      for (let s = 0; s < 600; s++) {
        for (let q = 0; q < sub; q++) c.step(bodies, dt / sub);
        if (s > 240) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const x = c.origin[0] + (i + 0.5) * dx;
          if (x > 1.5 && x < 4.5) e += c.eta[j * n + i] ** 2;
        }
      }
      return e;
    };
    expect(shadow(true)).toBeLessThan(0.3 * shadow(false));
  });

  it('recentring is seamless: a following carpet matches a fixed one of the same size near the body', () => {
    const dx = 0.15, U = 1.6;
    const follow = carpet(128, dx, 40);
    const fixed = carpet(128, dx, 40);
    const b1: CarpetSphere = { x: -4, y: 0.1, z: 0, r: 0.6 }, b2 = { ...b1 };
    follow.occupancy([b1], () => 0, follow.occ, follow.chi);
    fixed.occupancy([b2], () => 0, fixed.occ, fixed.chi);
    runTow(follow, b1, U, 5, true);
    runTow(fixed, b2, U, 5, false);
    expect(follow.ledger.shifted).not.toBe(0);
    let d = 0, m = 0;
    for (let s = -1; s <= 3; s += 0.05) for (let y = -2; y <= 2; y += 0.05) {
      const a = sampleField({ field: follow.eta, n: 128, dx, origin: follow.origin }, b1.x - s, y);
      const q = sampleField({ field: fixed.eta, n: 128, dx, origin: fixed.origin }, b2.x - s, y);
      d += (a - q) ** 2; m += q * q;
    }
    expect(Math.sqrt(d / m)).toBeLessThan(0.05);
  });
});

describe('carpet wake physics (short runs; the full S1/S2 numbers come from scripts/carpet-validate.ts)', () => {
  it('deep water: Kelvin cusps near 19.5° and transverse waves at 2πU²/g', () => {
    const U = 1.5, lam = (2 * Math.PI * U * U) / 9.81;
    const c = carpet(128, 0.15, 60);
    const b: CarpetSphere = { x: 0, y: 0.1, z: 0, r: 0.6 };
    c.occupancy([b], () => 0, c.occ, c.chi);
    runTow(c, b, U, 12, true, 1 / 30);
    const v = { field: c.eta, n: c.n, dx: c.dx, origin: c.origin };
    const tw = trackWavelength(v, b, [1, 0], 1.5, 8);
    expect(Math.abs(tw.lambda - lam) / lam).toBeLessThan(0.05);
    const k = armAngle(v, b, [1, 0], { s0: 3 * lam, s1: 8, mode: 'envelope', win: lam / 2, yMin: (s) => s * 0.14, yMax: (s) => s * 0.7 });
    expect(Math.abs(k.angleDeg - 19.47)).toBeLessThan(3);
    expect(Math.abs(k.sides[0] - k.sides[1])).toBeLessThan(1);
  });
});
