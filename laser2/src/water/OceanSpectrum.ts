// Directional wind-sea spectrum discretised into Gerstner components.
//
// The same component list drives the CPU physics field and the GPU surface so
// the rendered waterline is the one the hull floats in. Components are split
// into a physics set (energetic wavelengths >= ~1.6 m, evaluated on the CPU)
// and a detail set (short capillary-gravity chop, GPU only) whose amplitudes are
// centimetres and do not change hull loads measurably.

export interface WaveComponent {
  /** Unit propagation direction (world XZ). */
  dirX: number;
  dirZ: number;
  /** Wavenumber (rad/m). */
  k: number;
  /** Angular frequency (rad/s), deep-water dispersion. */
  omega: number;
  /** Amplitude (m). */
  amplitude: number;
  /** Gerstner steepness factor Q (dimensionless, 0..1). */
  steepness: number;
  /** Phase offset (rad). */
  phase: number;
}

export interface SeaStateInput {
  /** Mean wind speed at 10 m (m/s). */
  windSpeed10: number;
  /** Wind "from" direction in the legacy convention: vector (-sin θ, 0, cos θ) points upwind. */
  windFromDeg: number;
  /** Fetch length (m); governs wave height/period of the wind sea. */
  fetchM: number;
  /** User scale on wave height (legacy sea slider, 1 = physical). */
  heightScale: number;
  /** Optional long-period swell. */
  swellHeightM: number;
  swellPeriodS: number;
  swellFromDeg: number;
  /** Deterministic seed for phases and directions. */
  seed: number;
  /** Maximum summed Gerstner steepness (<1 avoids crest loops). */
  choppiness: number;
}

export interface SeaState {
  input: SeaStateInput;
  significantHeightM: number;
  peakPeriodS: number;
  peakWavelengthM: number;
  peakWavenumber: number;
  physics: WaveComponent[];
  detail: WaveComponent[];
}

export const DEFAULT_SEA_STATE: SeaStateInput = {
  windSpeed10: 7.2,
  windFromDeg: 0,
  fetchM: 6000,
  heightScale: 1,
  swellHeightM: 0.12,
  swellPeriodS: 6.5,
  swellFromDeg: 35,
  seed: 1729,
  choppiness: 0.72,
};

const G = 9.81;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** JONSWAP spectral density S(ω) (m²·s) for fetch-limited wind sea. */
export function jonswap(omega: number, windSpeed: number, fetchM: number): number {
  const U = Math.max(0.5, windSpeed);
  const F = Math.max(50, fetchM);
  const fetchNd = (G * F) / (U * U);
  const alpha = 0.076 * Math.pow(fetchNd, -0.22);
  const omegaP = 22 * (G / U) * Math.pow(fetchNd, -0.33);
  const sigma = omega <= omegaP ? 0.07 : 0.09;
  const r = Math.exp(-((omega - omegaP) ** 2) / (2 * sigma * sigma * omegaP * omegaP));
  const gamma = 3.3;
  return (alpha * G * G) / Math.pow(omega, 5) * Math.exp(-1.25 * Math.pow(omegaP / omega, 4)) * Math.pow(gamma, r);
}

export function peakOmega(windSpeed: number, fetchM: number): number {
  const U = Math.max(0.5, windSpeed);
  const fetchNd = (G * Math.max(50, fetchM)) / (U * U);
  return 22 * (G / U) * Math.pow(fetchNd, -0.33);
}

function propagationFrom(fromDeg: number): { x: number; z: number } {
  // Legacy wind helper: upwind unit vector is (-sin θ, 0, cos θ); waves travel downwind.
  const r = (fromDeg * Math.PI) / 180;
  return { x: Math.sin(r), z: -Math.cos(r) };
}

function rotate(dir: { x: number; z: number }, angle: number): { x: number; z: number } {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: dir.x * c - dir.z * s, z: dir.x * s + dir.z * c };
}

/** Samples a spreading angle from D(θ) ∝ cos^(2s)(θ/2) by rejection. */
function spreadAngle(random: () => number, s: number): number {
  for (let attempt = 0; attempt < 64; attempt++) {
    const theta = (random() * 2 - 1) * Math.PI * 0.75;
    if (random() <= Math.pow(Math.cos(theta * 0.5), 2 * s)) return theta;
  }
  return 0;
}

export function buildSeaState(partial: Partial<SeaStateInput> = {}): SeaState {
  const input: SeaStateInput = { ...DEFAULT_SEA_STATE, ...partial };
  const random = mulberry32(input.seed);
  const U = Math.max(0.5, input.windSpeed10);
  const omegaP = peakOmega(U, input.fetchM);
  const kP = (omegaP * omegaP) / G;
  const windDir = propagationFrom(input.windFromDeg);

  // Frequency bins span 0.62ωp..6.5ωp logarithmically. Low bins carry the energy
  // the hull responds to; the upper bins are the visible chop.
  const physicsBins = 14;
  const detailBins = 22;
  const omegaMin = 0.62 * omegaP;
  const omegaSplit = Math.max(1.9 * omegaP, Math.sqrt(G * (2 * Math.PI / 1.6)));
  const omegaMax = Math.max(omegaSplit * 1.5, Math.sqrt(G * (2 * Math.PI / 0.28)));

  const components: Array<WaveComponent & { physics: boolean }> = [];
  const addBand = (lo: number, hi: number, count: number, physics: boolean): void => {
    const ratio = Math.pow(hi / lo, 1 / count);
    for (let i = 0; i < count; i++) {
      const w0 = lo * Math.pow(ratio, i);
      const w1 = w0 * ratio;
      const omega = w0 * Math.pow(ratio, 0.25 + 0.5 * random());
      const energy = jonswap(omega, U, input.fetchM) * (w1 - w0);
      // Short waves spread more widely around the wind direction.
      const spreadExp = Math.max(1.5, 11 * Math.pow(Math.min(1, omegaP / omega), 2.5));
      const dir = rotate(windDir, spreadAngle(random, spreadExp));
      const k = (omega * omega) / G;
      components.push({
        dirX: dir.x,
        dirZ: dir.z,
        k,
        omega,
        amplitude: Math.sqrt(2 * Math.max(0, energy)),
        steepness: 0,
        phase: random() * Math.PI * 2,
        physics,
      });
    }
  };
  addBand(omegaMin, omegaSplit, physicsBins, true);
  addBand(omegaSplit, omegaMax, detailBins, false);

  if (input.swellHeightM > 0.005) {
    const omega = (2 * Math.PI) / Math.max(2, input.swellPeriodS);
    const dir = propagationFrom(input.swellFromDeg);
    for (let i = 0; i < 2; i++) {
      const spread = rotate(dir, (i === 0 ? -1 : 1) * 0.12);
      components.push({
        dirX: spread.x,
        dirZ: spread.z,
        k: (omega * omega) / G,
        omega: omega * (i === 0 ? 1 : 1.07),
        amplitude: input.swellHeightM / 4, // two components: Hs = 4·sqrt(Σ A²/2)
        steepness: 0,
        phase: random() * Math.PI * 2,
        physics: true,
      });
    }
  }

  for (const c of components) c.amplitude *= Math.max(0, input.heightScale);

  // Gerstner steepness: distribute the choppiness budget so the summed
  // horizontal compression Σ Q k A stays below `choppiness` (no crest loops).
  const sumKA = components.reduce((sum, c) => sum + c.k * c.amplitude, 0);
  const budget = Math.max(0, Math.min(0.95, input.choppiness));
  for (const c of components) c.steepness = sumKA > 1e-9 ? Math.min(1, budget / sumKA) : 0;

  const m0 = components.reduce((sum, c) => sum + 0.5 * c.amplitude * c.amplitude, 0);
  const strip = (c: WaveComponent & { physics: boolean }): WaveComponent => ({
    dirX: c.dirX, dirZ: c.dirZ, k: c.k, omega: c.omega, amplitude: c.amplitude, steepness: c.steepness, phase: c.phase,
  });
  return {
    input,
    significantHeightM: 4 * Math.sqrt(m0),
    peakPeriodS: (2 * Math.PI) / omegaP,
    peakWavelengthM: (2 * Math.PI) / kP,
    peakWavenumber: kP,
    physics: components.filter((c) => c.physics).map(strip),
    detail: components.filter((c) => !c.physics).map(strip),
  };
}
