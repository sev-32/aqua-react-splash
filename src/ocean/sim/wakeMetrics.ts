/**
 * Wake measurements on a heightfield (the acceptance numbers of PLAN.md P1):
 * arm angle (Mach V or Kelvin cusp) and transverse wavelength, taken in the
 * body frame from a snapshot of η. Used by the tests and by
 * scripts/carpet-validate.ts so every number in the docs is reproducible.
 */

export interface FieldView {
  field: ArrayLike<number>;
  n: number;
  dx: number;
  /** World position of cell (0, 0)'s corner. */
  origin: [number, number];
}

/** Bilinear η at a world point (cell-centred samples); 0 outside the field. */
export function sampleField(v: FieldView, x: number, z: number): number {
  const u = (x - v.origin[0]) / v.dx - 0.5, w = (z - v.origin[1]) / v.dx - 0.5;
  const i = Math.floor(u), j = Math.floor(w);
  if (i < 0 || j < 0 || i >= v.n - 1 || j >= v.n - 1) return 0;
  const fx = u - i, fz = w - j, n = v.n, f = v.field;
  return (f[j * n + i] * (1 - fx) + f[j * n + i + 1] * fx) * (1 - fz) + (f[(j + 1) * n + i] * (1 - fx) + f[(j + 1) * n + i + 1] * fx) * fz;
}

export interface ArmFit {
  /** Half-angle of the arm line fitted with an intercept (deg). */
  angleDeg: number;
  /** Half-angle of the arm line through the body centre (deg). */
  angleThroughBodyDeg: number;
  /** Intercept: lateral offset of the arm at the body station (m). */
  y0: number;
  /** Stations used and the arm offsets found (m), both sides averaged. */
  s: number[];
  y: number[];
  /** Per-side angles (deg), port and starboard: their spread is the symmetry check. */
  sides: [number, number];
}

function fit(s: number[], y: number[]) {
  const m = s.length;
  const ms = s.reduce((a, b) => a + b, 0) / m, my = y.reduce((a, b) => a + b, 0) / m;
  let sxy = 0, sxx = 0, s0xy = 0, s0xx = 0;
  for (let i = 0; i < m; i++) {
    sxy += (s[i] - ms) * (y[i] - my); sxx += (s[i] - ms) ** 2;
    s0xy += s[i] * y[i]; s0xx += s[i] * s[i];
  }
  const slope = sxy / Math.max(sxx, 1e-12);
  return { slope, y0: my - slope * ms, slope0: s0xy / Math.max(s0xx, 1e-12) };
}

/**
 * Arm angle. For stations s ∈ [s0, s1] behind the body (along −dir), find on each side
 * the lateral offset y ∈ [yMin(s), yMax(s)] that maximises the arm signal:
 *   'crest'    η itself (the Mach V's leading crest),
 *   'envelope' max |η| over a window of ±win along the station axis (Kelvin cusp: the
 *              caustic where the divergent waves' amplitude peaks).
 */
export function armAngle(
  v: FieldView, body: { x: number; z: number }, dir: [number, number],
  opts: { s0: number; s1: number; ds?: number; dy?: number; mode: 'crest' | 'envelope'; win?: number;
    yMin: (s: number) => number; yMax: (s: number) => number },
): ArmFit {
  const l = Math.hypot(dir[0], dir[1]);
  const ax: [number, number] = [dir[0] / l, dir[1] / l];
  const lat: [number, number] = [-ax[1], ax[0]];
  const ds = opts.ds ?? v.dx, dy = opts.dy ?? v.dx / 2, win = opts.win ?? 0;
  const at = (s: number, y: number) => sampleField(v, body.x - ax[0] * s + lat[0] * y, body.z - ax[1] * s + lat[1] * y);
  const signal = (s: number, y: number) => {
    if (opts.mode === 'crest') return at(s, y);
    let m = 0;
    for (let t = -win; t <= win + 1e-9; t += v.dx / 2) m = Math.max(m, Math.abs(at(s + t, y)));
    return m;
  };
  const S: number[] = [], Y: number[] = [], sideSlopes: [number, number] = [0, 0];
  const per: [number[], number[]] = [[], []];
  for (let s = opts.s0; s <= opts.s1 + 1e-9; s += ds) {
    const found: number[] = [];
    for (const side of [1, -1]) {
      let best = -Infinity, by = 0;
      for (let y = opts.yMin(s); y <= opts.yMax(s); y += dy) {
        const q = signal(s, side * y);
        if (q > best) { best = q; by = y; }
      }
      found.push(by);
    }
    S.push(s);
    Y.push(0.5 * (found[0] + found[1]));
    per[0].push(found[0]);
    per[1].push(found[1]);
  }
  const f = fit(S, Y);
  sideSlopes[0] = (Math.atan(fit(S, per[0]).slope) * 180) / Math.PI;
  sideSlopes[1] = (Math.atan(fit(S, per[1]).slope) * 180) / Math.PI;
  return {
    angleDeg: (Math.atan(f.slope) * 180) / Math.PI,
    angleThroughBodyDeg: (Math.atan(f.slope0) * 180) / Math.PI,
    y0: f.y0, s: S, y: Y, sides: sideSlopes,
  };
}

/**
 * Transverse wavelength along the track behind the body: the mean spacing of successive
 * crests (local maxima above `floor`·max) of η on the centreline, s ∈ [s0, s1].
 */
export function trackWavelength(v: FieldView, body: { x: number; z: number }, dir: [number, number], s0: number, s1: number, floor = 0.15) {
  const l = Math.hypot(dir[0], dir[1]);
  const ax = [dir[0] / l, dir[1] / l];
  const h = v.dx / 4;
  const prof: number[] = [];
  for (let s = s0; s <= s1; s += h) prof.push(sampleField(v, body.x - ax[0] * s, body.z - ax[1] * s));
  const top = prof.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  const crests: number[] = [];
  for (let i = 1; i < prof.length - 1; i++)
    if (prof[i] > prof[i - 1] && prof[i] >= prof[i + 1] && prof[i] > floor * top) crests.push(s0 + i * h);
  if (crests.length < 2) return { lambda: NaN, crests };
  return { lambda: (crests[crests.length - 1] - crests[0]) / (crests.length - 1), crests };
}

/**
 * Angular distribution of wake energy behind the body: mean η² along rays at angle θ from
 * the track (both sides) over radii [r0, r1]. Supercritical flow in finite depth cannot
 * radiate outside the Mach wedge asin(√(gH)/U): `th99` (the angle holding 99 % of the
 * energy in 0–90°) is the causality check; `peakDeg` is where the dominant arm lies.
 * In deep water the same profile shows the Kelvin caustic: energy falls by an order of
 * magnitude across 19.47° (`edge10`: the widest angle still at ≥ 10 % of the peak). That
 * edge is robust where the arm's envelope peak is not (near the body the transverse waves
 * on the track outweigh the cusps).
 * `y0`: rays start at this lateral offset on each side (the body's shoulders, where the
 * wedge begins for a body of finite width) instead of at the centre.
 */
export function angularEnergy(v: FieldView, body: { x: number; z: number }, dir: [number, number], r0: number, r1: number, y0 = 0) {
  const l = Math.hypot(dir[0], dir[1]);
  const ax = [dir[0] / l, dir[1] / l], lat = [-ax[1], ax[0]];
  const E: number[] = [];
  for (let th = 0; th <= 90; th++) {
    const a = (th * Math.PI) / 180;
    let e = 0, m = 0;
    for (let r = r0; r <= r1; r += v.dx / 2)
      for (const sg of [1, -1]) {
        const s = r * Math.cos(a), y = sg * (y0 + r * Math.sin(a));
        const q = sampleField(v, body.x - ax[0] * s + lat[0] * y, body.z - ax[1] * s + lat[1] * y);
        e += q * q; m++;
      }
    E.push(e / m);
  }
  const tot = E.reduce((a, b) => a + b, 0);
  let acc = 0, th95 = 90, th99 = 90;
  for (let i = E.length - 1; i >= 0; i--) { acc += E[i]; if (acc > 0.01 * tot && th99 === 90) th99 = i; if (acc > 0.05 * tot && th95 === 90) th95 = i; }
  const top = E.reduce((m, x) => Math.max(m, x), 0);
  let edge10 = 0;
  for (let i = 0; i < E.length; i++) if (E[i] >= 0.1 * top) edge10 = i;
  return { energy: E, peakDeg: E.indexOf(top), th95, th99, edge10 };
}
