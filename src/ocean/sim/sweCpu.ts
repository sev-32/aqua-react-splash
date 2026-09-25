/**
 * Tier T2 shallow-water solver — CPU reference (the GLSL in shoreShaders.ts
 * mirrors this line by line).
 *
 * Scheme: finite volume, hydrostatic reconstruction (Audusse et al. 2004) +
 * HLL flux. Order 1 (piecewise constant, forward Euler) or order 2 (MUSCL on
 * (h, η, u, v) with the MC limiter (θ = 2), Audusse's centred bed
 * source, SSP-RK2 in time). Second order is what lets a swell cross a
 * 300 m tile without being diffused flat before it reaches the beach.
 * Properties the Fable doctrine requires (W3/W4):
 *   - well-balanced: lake at rest over any bed is preserved exactly;
 *   - positivity-preserving under CFL ≤ 0.5: depth never goes negative;
 *   - conservative: volume changes only through open boundaries.
 * Wet/dry is a property of the solver, not the shader.
 */
import { G } from '../math/scalar';

export type Boundary = 'wall' | 'open';

export interface SweGrid {
  nx: number;
  nz: number;
  dx: number;
  h: Float64Array;
  hu: Float64Array;
  hv: Float64Array;
  b: Float64Array;
}

export function makeGrid(nx: number, nz: number, dx: number): SweGrid {
  const n = nx * nz;
  return { nx, nz, dx, h: new Float64Array(n), hu: new Float64Array(n), hv: new Float64Array(n), b: new Float64Array(n) };
}

export const H_DRY = 1e-4;

/** Desingularised velocity (Kurganov–Petrova): finite as h → 0. */
export function velocity(h: number, q: number): number {
  const h4 = h * h * h * h;
  const eps = 1e-6;
  return (Math.SQRT2 * h * q) / Math.sqrt(h4 + Math.max(h4, eps));
}

interface Flux { f0: number; f1: number; f2: number }

/**
 * HLL flux for the normal direction: state = (h, un, ut) with starred depths.
 * Returns (mass, normal momentum, tangential momentum) fluxes.
 */
export function hllFlux(hL: number, uL: number, vL: number, hR: number, uR: number, vR: number): Flux {
  if (hL <= H_DRY && hR <= H_DRY) return { f0: 0, f1: 0, f2: 0 };
  const cL = Math.sqrt(G * hL), cR = Math.sqrt(G * hR);
  const sL = Math.min(uL - cL, uR - cR);
  const sR = Math.max(uL + cL, uR + cR);
  const FL0 = hL * uL, FL1 = hL * uL * uL + 0.5 * G * hL * hL, FL2 = hL * uL * vL;
  const FR0 = hR * uR, FR1 = hR * uR * uR + 0.5 * G * hR * hR, FR2 = hR * uR * vR;
  if (sL >= 0) return { f0: FL0, f1: FL1, f2: FL2 };
  if (sR <= 0) return { f0: FR0, f1: FR1, f2: FR2 };
  const inv = 1 / (sR - sL);
  return {
    f0: (sR * FL0 - sL * FR0 + sL * sR * (hR - hL)) * inv,
    f1: (sR * FL1 - sL * FR1 + sL * sR * (hR * uR - hL * uL)) * inv,
    f2: (sR * FL2 - sL * FR2 + sL * sR * (hR * vR - hL * vL)) * inv,
  };
}

/** Max stable dt for CFL number `cfl`. */
export function cflDt(g: SweGrid, cfl = 0.45): number {
  let m = 1e-6;
  for (let i = 0; i < g.h.length; i++) {
    const h = g.h[i];
    if (h <= H_DRY) continue;
    const u = Math.abs(velocity(h, g.hu[i])), v = Math.abs(velocity(h, g.hv[i]));
    m = Math.max(m, Math.max(u, v) + Math.sqrt(G * h));
  }
  return (cfl * g.dx) / m;
}

export interface StepOptions {
  boundary?: Boundary;
  manning?: number;
  /** Ghost state for open boundaries, per edge cell (defaults: transmissive copy). */
  ghost?: (i: number, j: number, side: 'W' | 'E' | 'S' | 'N') => { h: number; hu: number; hv: number } | null;
  /** Spatial/temporal order (default 1). */
  order?: 1 | 2;
}

/** Generalised minmod limiter, θ ∈ [1, 2] (1 = minmod, 2 = MC). Keeps face depths ≥ 0. */
export const LIMITER_THETA = 2.0;
export function limitSlope(a: number, b: number, theta = LIMITER_THETA): number {
  if (a * b <= 0) return 0;
  const m = Math.min(theta * Math.abs(a), 0.5 * Math.abs(a + b), theta * Math.abs(b));
  return a > 0 ? m : -m;
}

interface Prim { h: number; u: number; v: number; b: number }
interface Face { h: number; eta: number; u: number; v: number; b: number }
type Side = 'W' | 'E' | 'S' | 'N';

/**
 * Semi-discrete right-hand side dU/dt for state (h, hu, hv) over bed g.b.
 * Returns the net boundary mass flux (m³/s, + = inflow).
 */
function rhs(g: SweGrid, h: Float64Array, hu: Float64Array, hv: Float64Array, o: StepOptions, order: 1 | 2,
  dh: Float64Array, dhu: Float64Array, dhv: Float64Array): number {
  const { nx, nz, dx } = g;
  const boundary = o.boundary ?? 'wall';
  const idx = (i: number, j: number) => j * nx + i;
  let inflow = 0;

  // Primitive state of any cell, including two layers of ghosts.
  const prim = (i: number, j: number): Prim => {
    if (i >= 0 && j >= 0 && i < nx && j < nz) {
      const k = idx(i, j);
      return { h: h[k], u: velocity(h[k], hu[k]), v: velocity(h[k], hv[k]), b: g.b[k] };
    }
    const side: Side = i < 0 ? 'W' : i >= nx ? 'E' : j < 0 ? 'S' : 'N';
    if (boundary === 'wall') {
      // Mirror image across the wall, normal velocity reversed.
      const mi = i < 0 ? -i - 1 : i >= nx ? 2 * nx - i - 1 : i;
      const mj = j < 0 ? -j - 1 : j >= nz ? 2 * nz - j - 1 : j;
      const k = idx(Math.min(Math.max(mi, 0), nx - 1), Math.min(Math.max(mj, 0), nz - 1));
      const u = velocity(h[k], hu[k]), v = velocity(h[k], hv[k]);
      return side === 'W' || side === 'E' ? { h: h[k], u: -u, v, b: g.b[k] } : { h: h[k], u, v: -v, b: g.b[k] };
    }
    const ci = Math.min(Math.max(i, 0), nx - 1), cj = Math.min(Math.max(j, 0), nz - 1);
    const k = idx(ci, cj);
    const gs = o.ghost?.(ci, cj, side);
    if (gs) return { h: gs.h, u: velocity(gs.h, gs.hu), v: velocity(gs.h, gs.hv), b: g.b[k] };
    return { h: h[k], u: velocity(h[k], hu[k]), v: velocity(h[k], hv[k]), b: g.b[k] };
  };

  // Face values of cell (i, j) on the + and − side along an axis.
  const faces = (i: number, j: number, axis: 0 | 1): [Face, Face] => {
    const c = prim(i, j);
    const flat: Face = { h: c.h, eta: c.h + c.b, u: c.u, v: c.v, b: c.b };
    if (order === 1) return [flat, flat];
    const m = axis === 0 ? prim(i - 1, j) : prim(i, j - 1);
    const p = axis === 0 ? prim(i + 1, j) : prim(i, j + 1);
    const sh = limitSlope(c.h - m.h, p.h - c.h);
    const se = limitSlope(c.h + c.b - (m.h + m.b), p.h + p.b - (c.h + c.b));
    const su = limitSlope(c.u - m.u, p.u - c.u);
    const sv = limitSlope(c.v - m.v, p.v - c.v);
    const mk = (sgn: number): Face => {
      const fh = Math.max(0, c.h + 0.5 * sgn * sh);
      const eta = c.h + c.b + 0.5 * sgn * se;
      const dry = fh <= H_DRY;
      return { h: fh, eta, u: dry ? 0 : c.u + 0.5 * sgn * su, v: dry ? 0 : c.v + 0.5 * sgn * sv, b: eta - fh };
    };
    return [mk(1), mk(-1)];
  };

  // Numerical flux through the face between left state L and right state R (normal along axis).
  const faceFlux = (L: Face, R: Face, axis: 0 | 1) => {
    const bStar = Math.max(L.b, R.b);
    const hL = Math.max(0, L.eta - bStar), hR = Math.max(0, R.eta - bStar);
    const unL = axis === 0 ? L.u : L.v, utL = axis === 0 ? L.v : L.u;
    const unR = axis === 0 ? R.u : R.v, utR = axis === 0 ? R.v : R.u;
    return { f: hllFlux(hL, unL, utL, hR, unR, utR), hL, hR };
  };

  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = idx(i, j);
      let d0 = 0, d1 = 0, d2 = 0;
      for (const axis of [0, 1] as const) {
        const [Cp, Cm] = faces(i, j, axis);
        const [, Nm] = axis === 0 ? faces(i + 1, j, 0) : faces(i, j + 1, 1);   // left face of the + neighbour
        const [Pp] = axis === 0 ? faces(i - 1, j, 0) : faces(i, j - 1, 1);     // right face of the − neighbour
        const plus = faceFlux(Cp, Nm, axis);
        const minus = faceFlux(Pp, Cm, axis);
        // Outflow through + face minus inflow through − face, with HR pressure corrections for this cell.
        const fp1 = plus.f.f1 + 0.5 * G * (Cp.h * Cp.h - plus.hL * plus.hL);
        const fm1 = minus.f.f1 + 0.5 * G * (Cm.h * Cm.h - minus.hR * minus.hR);
        // Centred bed source (second order; zero for piecewise-constant faces).
        const sc = -G * (Cp.b - Cm.b) * 0.5 * (Cp.h + Cm.h);
        const n0 = plus.f.f0 - minus.f.f0;
        const n1 = fp1 - fm1 - sc;
        const n2 = plus.f.f2 - minus.f.f2;
        d0 += n0;
        if (axis === 0) { d1 += n1; d2 += n2; } else { d2 += n1; d1 += n2; }
        if (boundary === 'open') {
          const hi = axis === 0 ? i === nx - 1 : j === nz - 1;
          const lo = axis === 0 ? i === 0 : j === 0;
          if (hi) inflow -= plus.f.f0 * dx;
          if (lo) inflow += minus.f.f0 * dx;
        }
      }
      dh[k] = -d0 / dx;
      dhu[k] = -d1 / dx;
      dhv[k] = -d2 / dx;
    }
  return inflow;
}

function cleanup(h: Float64Array, hu: Float64Array, hv: Float64Array) {
  for (let k = 0; k < h.length; k++) {
    if (h[k] < 0) h[k] = 0; // round-off guard (positivity holds under the CFL limit)
    if (h[k] <= H_DRY) { hu[k] = 0; hv[k] = 0; }
  }
}

/** One explicit step. Returns the volume that crossed open boundaries (m³, + = inflow). */
export function stepSwe(g: SweGrid, dt: number, o: StepOptions = {}): number {
  const n = g.h.length;
  const order = o.order ?? 1;
  const dh = new Float64Array(n), dhu = new Float64Array(n), dhv = new Float64Array(n);
  let inflow = rhs(g, g.h, g.hu, g.hv, o, order, dh, dhu, dhv) * dt;
  const h1 = new Float64Array(n), hu1 = new Float64Array(n), hv1 = new Float64Array(n);
  for (let k = 0; k < n; k++) { h1[k] = g.h[k] + dt * dh[k]; hu1[k] = g.hu[k] + dt * dhu[k]; hv1[k] = g.hv[k] + dt * dhv[k]; }
  cleanup(h1, hu1, hv1);
  if (order === 2) {
    // SSP-RK2 (Heun): U² = ½U + ½(U¹ + dt·L(U¹)).
    inflow = 0.5 * inflow + 0.5 * rhs(g, h1, hu1, hv1, o, order, dh, dhu, dhv) * dt;
    for (let k = 0; k < n; k++) {
      h1[k] = 0.5 * g.h[k] + 0.5 * (h1[k] + dt * dh[k]);
      hu1[k] = 0.5 * g.hu[k] + 0.5 * (hu1[k] + dt * dhu[k]);
      hv1[k] = 0.5 * g.hv[k] + 0.5 * (hv1[k] + dt * dhv[k]);
    }
    cleanup(h1, hu1, hv1);
  }
  // Semi-implicit Manning friction (operator split).
  const n2 = (o.manning ?? 0) ** 2;
  if (n2 > 0)
    for (let k = 0; k < n; k++) {
      const h = h1[k];
      if (h <= H_DRY) continue;
      const u = velocity(h, hu1[k]), v = velocity(h, hv1[k]);
      const s = 1 + (dt * G * n2 * Math.hypot(u, v)) / Math.pow(h, 4 / 3);
      hu1[k] /= s; hv1[k] /= s;
    }
  g.h.set(h1); g.hu.set(hu1); g.hv.set(hv1);
  return inflow;
}

export function volume(g: SweGrid): number {
  let v = 0;
  for (let i = 0; i < g.h.length; i++) v += g.h[i];
  return v * g.dx * g.dx;
}
