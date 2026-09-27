/**
 * Carpet kernel constants and rules shared by the GPU tiles (InteractionTiles) and
 * the CPU mirror (carpetCpu.ts), so the validated numbers are the shipped numbers.
 */
import { G } from '../math/scalar';

/**
 * Hold stiffness the kernel aims for. The constraint converges as κ grows (S1 at
 * 4.5 m/s: peak η 1.17 → 0.85 → 0.71 → 0.67 m for κ = 12, 40, 100, 150; the residual
 * η under the hull falls from 47 % to 3 % of σ), so κ ≈ 100 is within a few percent
 * of a rigid hull.
 */
export const KAPPA_TARGET = 100;

/**
 * φ smoothing under the hull, as a fraction of the explicit diffusion limit per substep.
 * Without it the stiffened footprint rings at the grid scale (4–10× more energy above
 * half-Nyquist in the S1 runs); with it the Nyquist mode is removed in one substep.
 */
export const CARPET_SMOOTH = 0.5;

/**
 * Engine defaults for the carpet's wave damping and limiter (settings.interaction and the
 * interaction module read these), so the validation scripts run the shipped numbers.
 * The damping is numerical, not physical (real gravity-wave damping is ~2νk² with
 * ν = 1e-6 m²/s): a uniform rate plus a k² term that removes grid-scale noise.
 */
export const CARPET_DAMPING = 0.06;
export const CARPET_VISCOSITY = 0.004;
export const CARPET_MAX_SLOPE = 0.62;
export const CARPET_RELAX = 0.5;

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

/**
 * Largest penalty stiffness the explicit kick stays stable with: the stiffened
 * Nyquist mode ω² = g·K_max·(1 + κ) must satisfy ω·dt ≲ 1.2 (margin below 2).
 */
export function stableKappa(dx: number, dt: number): number {
  const Kmax = (Math.PI * Math.SQRT2) / dx;
  return clamp(1.44 / (G * Kmax * dt * dt) - 1, 0, KAPPA_TARGET);
}

/**
 * Substeps for one frame of dt: enough for the target stiffness to be stable, and for
 * no body to move more than half a cell per substep (occupancy sweeps continuously,
 * which is what BEST's transit source approximated).
 */
export function carpetSubsteps(dx: number, dt: number, speed: number, maxSub = 4): number {
  const Kmax = (Math.PI * Math.SQRT2) / dx;
  const dtStable = Math.sqrt(1.44 / (G * Kmax * (1 + KAPPA_TARGET)));
  return clamp(Math.max(Math.ceil(dt / dtStable), Math.ceil((speed * dt) / (0.5 * dx))), 1, maxSub);
}

/** Carpet cell sizes (a small set, so bodies of similar size share tiles). */
const CARPET_DX = [0.05, 0.07, 0.1, 0.14, 0.2, 0.25];

/**
 * Cell size for a small body of waterline width D: about 12 cells across it (BEST ran
 * 12.7 across its sphere), from a fixed ladder.
 */
export function carpetDx(width: number): number {
  const want = width / 12;
  let dx = CARPET_DX[0];
  for (const d of CARPET_DX) if (d <= want + 1e-9) dx = d;
  return dx;
}
