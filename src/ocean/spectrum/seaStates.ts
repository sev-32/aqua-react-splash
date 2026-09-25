/**
 * Sea-state library — physical successor of POSEIDON R9's SEA_STATE_LIBRARY.
 *
 * R9 defined each sea state as three hand-tuned "cascade families" whose
 * wavenumber bands overlapped (double-counting energy between 34 m and 150 m).
 * Here a sea state is a sum of physical wave systems (swell trains + local wind
 * sea) expressed in quantities an oceanographer would recognise (Hs, Tp, U10,
 * fetch). The cascades then *partition* wavenumber space and each samples the
 * summed spectrum, so no band is counted twice.
 *
 * Morphing between states blends the spectra (energy), not the parameters,
 * with fixed per-mode phases — so the sea changes character without popping.
 *
 * Fetches are duration-realistic rather than "unlimited": the JONSWAP α/ωp
 * fetch laws overshoot the JONSWAP energy relation (ε = 1.6e-7 χ) by ~2× at
 * long fetch, so each state is calibrated to land in its WMO Hs band.
 */
import type { WaveSystem } from './physics';

export interface SeaState {
  id: string;
  label: string;
  beaufort: string;
  description: string;
  /** Surface wind (drives Cox–Munk roughness, whitecap foam, spray throw). */
  wind: { speed: number; directionDeg: number };
  systems: WaveSystem[];
  /** Horizontal choppiness λ (Tessendorf) applied to all cascades. */
  choppiness: number;
  /** Whitecap coverage gain (multiplies Jacobian-fold foam birth). */
  whitecaps: number;
}

export const SEA_STATES: SeaState[] = [
  {
    id: 'glassy_calm', label: 'Glassy calm', beaufort: 'Bft 0–1',
    description: 'Residual long undulation under a mirror surface. A trace of distant swell, almost no local wind sea.',
    wind: { speed: 1.2, directionDeg: 30 },
    systems: [
      { kind: 'swell', hs: 0.25, tp: 14, gamma: 7, directionDeg: 20, spread: 40, elongation: 0.9 },
      { kind: 'wind', windSpeed: 1.5, fetchKm: 4, gamma: 2.0, directionDeg: 30, spread: 1, elongation: 0 },
    ],
    choppiness: 0.6, whitecaps: 0,
  },
  {
    id: 'light_breeze', label: 'Light breeze', beaufort: 'Bft 2',
    description: 'Cat’s-paw wind ripples ride a quiet inherited swell. Calm patches persist between gust lanes.',
    wind: { speed: 4.5, directionDeg: 32 },
    systems: [
      { kind: 'swell', hs: 0.45, tp: 12, gamma: 6, directionDeg: 22, spread: 30, elongation: 0.8 },
      { kind: 'wind', windSpeed: 4.5, fetchKm: 25, gamma: 2.6, directionDeg: 32, spread: 1, elongation: 0 },
    ],
    choppiness: 0.8, whitecaps: 0.05,
  },
  {
    id: 'gentle_swell', label: 'Gentle swell', beaufort: 'Bft 3',
    description: 'A coherent long swell carries the surface; a modest wind sea and short chop ride over it.',
    wind: { speed: 6.5, directionDeg: 36 },
    systems: [
      { kind: 'swell', hs: 1.0, tp: 12.5, gamma: 5.5, directionDeg: 22, spread: 24, elongation: 0.85 },
      { kind: 'swell', hs: 0.35, tp: 8, gamma: 3, directionDeg: 78, spread: 14, elongation: 0.5 },
      { kind: 'wind', windSpeed: 6.5, fetchKm: 20, gamma: 3.0, directionDeg: 36, spread: 1, elongation: 0 },
    ],
    choppiness: 0.95, whitecaps: 0.15,
  },
  {
    id: 'moderate', label: 'Moderate sea', beaufort: 'Bft 4',
    description: 'The balanced baseline: dominant remote swell, crossing secondary swell, an active wind sea with first whitecaps.',
    wind: { speed: 9, directionDeg: 38 },
    systems: [
      { kind: 'swell', hs: 1.1, tp: 12, gamma: 5, directionDeg: 24, spread: 20, elongation: 0.8 },
      { kind: 'swell', hs: 0.55, tp: 8.5, gamma: 3, directionDeg: 76, spread: 12, elongation: 0.45 },
      { kind: 'wind', windSpeed: 9, fetchKm: 40, gamma: 3.3, directionDeg: 38, spread: 1, elongation: 0 },
    ],
    choppiness: 1.05, whitecaps: 0.45,
  },
  {
    id: 'fresh_sea', label: 'Fresh sea', beaufort: 'Bft 5',
    description: 'A stronger, shorter wind sea with broad directional energy over a persistent swell. Whitecap-ready.',
    wind: { speed: 11.5, directionDeg: 40 },
    systems: [
      { kind: 'swell', hs: 1.8, tp: 13, gamma: 4.5, directionDeg: 20, spread: 18, elongation: 0.75 },
      { kind: 'swell', hs: 0.8, tp: 9, gamma: 3, directionDeg: 82, spread: 10, elongation: 0.4 },
      { kind: 'wind', windSpeed: 11.5, fetchKm: 60, gamma: 3.3, directionDeg: 40, spread: 1, elongation: 0 },
    ],
    choppiness: 1.15, whitecaps: 0.8,
  },
  {
    id: 'rough_sea', label: 'Rough sea', beaufort: 'Bft 6–7',
    description: 'Broad energetic wind sea, crossing swell, large wave groups with short steep chop and frequent breaking.',
    wind: { speed: 15, directionDeg: 43 },
    systems: [
      { kind: 'swell', hs: 2.4, tp: 13.5, gamma: 4, directionDeg: 18, spread: 14, elongation: 0.7 },
      { kind: 'swell', hs: 1.1, tp: 9.5, gamma: 2.8, directionDeg: 88, spread: 9, elongation: 0.35 },
      { kind: 'wind', windSpeed: 15, fetchKm: 150, gamma: 3.3, directionDeg: 43, spread: 1, elongation: 0 },
    ],
    choppiness: 1.25, whitecaps: 1.2,
  },
  {
    id: 'storm_swell', label: 'Storm swell', beaufort: 'Bft 8–9',
    description: 'Long storm swell with a strong cross-swell shoulder and an energetic broad wind sea. Longer, not merely taller.',
    wind: { speed: 20, directionDeg: 47 },
    systems: [
      { kind: 'swell', hs: 4.0, tp: 15, gamma: 3.6, directionDeg: 15, spread: 12, elongation: 0.65 },
      { kind: 'swell', hs: 1.8, tp: 11, gamma: 2.5, directionDeg: 94, spread: 8, elongation: 0.3 },
      { kind: 'wind', windSpeed: 20, fetchKm: 250, gamma: 3.3, directionDeg: 47, spread: 0.9, elongation: 0 },
    ],
    choppiness: 1.3, whitecaps: 1.6,
  },
  {
    id: 'heavy_storm', label: 'Heavy storm', beaufort: 'Bft 10+',
    description: 'Very long primary swell, powerful oblique secondary swell, short-period wind sea, dense streaked foam.',
    wind: { speed: 27, directionDeg: 53 },
    systems: [
      { kind: 'swell', hs: 6.5, tp: 17, gamma: 3.2, directionDeg: 12, spread: 10, elongation: 0.6 },
      { kind: 'swell', hs: 2.8, tp: 12, gamma: 2.4, directionDeg: 101, spread: 7, elongation: 0.3 },
      { kind: 'wind', windSpeed: 27, fetchKm: 300, gamma: 3.3, directionDeg: 53, spread: 0.8, elongation: 0 },
    ],
    choppiness: 1.35, whitecaps: 2.2,
  },
];

export interface SeaStateControls {
  /** Continuous position in the library, 0..SEA_STATES.length-1. */
  morph: number;
  energy: number;       // global energy multiplier
  swell: number;        // multiplier on swell systems
  windSea: number;      // multiplier on wind systems
  directionOffsetDeg: number;
  spread: number;       // >1 = broader (short-crested), <1 = long-crested
  choppiness: number;   // multiplier on the state's λ
  depth: number;        // global dispersion/TMA depth (m)
  /** Close-chop family gain (POSEIDON seaChopScale). */
  chop?: number;
  /** Crossing secondary-system gain (POSEIDON seaCrossSeaScale). */
  crossSea?: number;
}

export const DEFAULT_SEA_CONTROLS: SeaStateControls = {
  morph: 3, energy: 1, swell: 1, windSea: 1, directionOffsetDeg: 0, spread: 1, choppiness: 1, depth: 1500, chop: 1, crossSea: 1,
};

/** Resolve the two neighbouring library states and blend weight for a morph position. */
export function seaStateBracket(morph: number): { a: SeaState; b: SeaState; t: number } {
  const x = Math.max(0, Math.min(SEA_STATES.length - 1, morph));
  const lo = Math.floor(x), hi = Math.min(SEA_STATES.length - 1, lo + 1);
  return { a: SEA_STATES[lo], b: SEA_STATES[hi], t: x - lo };
}

/** Apply user controls to a state's systems (direction offset, energy splits, spread). */
export function adjustSystems(state: SeaState, c: SeaStateControls): WaveSystem[] {
  return state.systems.map((s) => ({
    ...s,
    directionDeg: s.directionDeg + c.directionOffsetDeg,
    energy: (s.energy ?? 1) * c.energy * (s.kind === 'swell' ? c.swell : c.windSea),
    // Broader spread → smaller exponent s (and less elongation).
    spread: s.spread / Math.max(c.spread, 0.2),
    elongation: s.elongation / Math.max(c.spread, 0.5),
  }));
}

export function blendNumber(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
