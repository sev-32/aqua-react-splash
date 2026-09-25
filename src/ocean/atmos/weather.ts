/**
 * Weather state: the one authority for clouds, precipitation, wind and the
 * light they let through (Nimbus lesson: lighting is EARNED by the medium).
 *
 * A weather state is a small set of physical quantities; presets are points in
 * that space and a continuous `morph` moves between them. The sea listens: the
 * wind-sea is driven by the weather's U10 with duration-limited growth, and the
 * wind direction steers it.
 */
import { SEA_STATES } from '../spectrum/seaStates';
import { clamp, lerpAngleDeg } from '../math/scalar';

export interface WeatherParams {
  /** Continuous position in WEATHER_PRESETS (0 = clear … n-1 = storm). */
  morph: number;
  coverage: number;       // 0..1 cloud fraction control
  cloudType: number;      // 0 stratus · 0.5 cumulus · 1 cumulonimbus (Nimbus genus)
  cloudBase: number;      // m (lifting condensation level)
  cloudThick: number;     // m
  density: number;        // extinction multiplier (Nimbus "density", σ = 0.045·density per m of unit density)
  precipitation: number;  // 0..1 (rain rate proxy: 1 ≈ 25 mm/h)
  windSpeed: number;      // U10, m/s
  windDirDeg: number;     // direction the wind blows TOWARD (same convention as the sea)
  haze: number;           // Mie multiplier
  droplet: number;        // effective droplet diameter (µm) for the cloud phase
  /** The sea follows the weather's wind (duration-limited growth). */
  coupleSea: boolean;
  /** Seconds for the wind-sea to adjust to a new wind (accelerated; reality is hours). */
  seaResponse: number;
  /** Cloud drift speed multiplier (1 = advected with a 1.6×U10 steering wind aloft). */
  drift: number;
  /** Overrides from the preset morph are applied unless the user has taken a control. */
  auto: boolean;
}

export interface WeatherPreset extends Omit<WeatherParams, 'morph' | 'coupleSea' | 'seaResponse' | 'drift' | 'auto'> {
  id: string;
  label: string;
}

/** Ordered roughly by wind: clear → fair → trades → broken → overcast → squall → storm. */
export const WEATHER_PRESETS: WeatherPreset[] = [
  { id: 'clear', label: 'Clear', coverage: 0.08, cloudType: 0.5, cloudBase: 1500, cloudThick: 1600, density: 0.9, precipitation: 0, windSpeed: 3, windDirDeg: 38, haze: 0.8, droplet: 12 },
  { id: 'fair', label: 'Fair cumulus', coverage: 0.36, cloudType: 0.56, cloudBase: 1200, cloudThick: 2600, density: 1.18, precipitation: 0, windSpeed: 7, windDirDeg: 38, haze: 1, droplet: 12 },
  { id: 'trades', label: 'Trade-wind cumulus', coverage: 0.46, cloudType: 0.6, cloudBase: 900, cloudThick: 2400, density: 1.2, precipitation: 0, windSpeed: 10, windDirDeg: 40, haze: 1.1, droplet: 12 },
  { id: 'broken', label: 'Broken stratocumulus', coverage: 0.66, cloudType: 0.34, cloudBase: 800, cloudThick: 1400, density: 1.25, precipitation: 0.05, windSpeed: 12, windDirDeg: 42, haze: 1.3, droplet: 10 },
  { id: 'overcast', label: 'Overcast', coverage: 0.92, cloudType: 0.16, cloudBase: 700, cloudThick: 1600, density: 1.28, precipitation: 0.25, windSpeed: 14, windDirDeg: 44, haze: 1.8, droplet: 9 },
  { id: 'squall', label: 'Squall line', coverage: 0.62, cloudType: 0.9, cloudBase: 900, cloudThick: 6200, density: 1.55, precipitation: 0.7, windSpeed: 19, windDirDeg: 47, haze: 2.2, droplet: 20 },
  { id: 'storm', label: 'Storm', coverage: 0.86, cloudType: 0.82, cloudBase: 600, cloudThick: 5200, density: 1.6, precipitation: 1, windSpeed: 26, windDirDeg: 53, haze: 3, droplet: 20 },
];

/** Default: fair → trade-wind cumulus at U10 = 9 m/s, the wind that sustains the default (moderate) sea. */
export const DEFAULT_WEATHER: WeatherParams = {
  ...pickPreset(5 / 3),
  morph: 5 / 3,
  coupleSea: true,
  seaResponse: 45,
  drift: 1,
  auto: true,
};

/** Blend the two presets around a morph position. */
export function pickPreset(morph: number): Omit<WeatherPreset, 'id' | 'label'> {
  const m = clamp(morph, 0, WEATHER_PRESETS.length - 1);
  const i = Math.min(Math.floor(m), WEATHER_PRESETS.length - 2);
  const t = m - i;
  const a = WEATHER_PRESETS[i], b = WEATHER_PRESETS[i + 1];
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    coverage: mix(a.coverage, b.coverage), cloudType: mix(a.cloudType, b.cloudType),
    cloudBase: mix(a.cloudBase, b.cloudBase), cloudThick: mix(a.cloudThick, b.cloudThick),
    density: mix(a.density, b.density), precipitation: mix(a.precipitation, b.precipitation),
    windSpeed: mix(a.windSpeed, b.windSpeed), windDirDeg: lerpAngleDeg(a.windDirDeg, b.windDirDeg, t),
    haze: mix(a.haze, b.haze), droplet: mix(a.droplet, b.droplet),
  };
}

export function weatherLabel(morph: number) {
  const m = clamp(morph, 0, WEATHER_PRESETS.length - 1);
  const i = Math.min(Math.floor(m), WEATHER_PRESETS.length - 2);
  const t = m - i;
  if (t < 0.02) return WEATHER_PRESETS[i].label;
  if (t > 0.98) return WEATHER_PRESETS[i + 1].label;
  return `${WEATHER_PRESETS[i].label} → ${WEATHER_PRESETS[i + 1].label}`;
}

/** Apply the preset blend at `morph` onto the params (keeps the non-preset fields). */
export function applyWeatherMorph(w: WeatherParams, morph: number): WeatherParams {
  return { ...w, ...pickPreset(morph), morph };
}

/** Wind speed of the library's wind-sea at each sea morph index (monotone). */
const SEA_U10 = SEA_STATES.map((s) => s.systems.find((x) => x.kind === 'wind')?.windSpeed ?? 0);
const SEA_WIND_DIR = SEA_STATES.map((s) => s.systems.find((x) => x.kind === 'wind')?.directionDeg ?? 0);

/** Sea-library morph whose wind-sea U10 equals `u10` (piecewise-linear inverse). */
export function seaMorphForWind(u10: number): number {
  if (u10 <= SEA_U10[0]) return 0;
  for (let i = 0; i < SEA_U10.length - 1; i++) {
    if (u10 <= SEA_U10[i + 1]) return i + (u10 - SEA_U10[i]) / (SEA_U10[i + 1] - SEA_U10[i]);
  }
  return SEA_U10.length - 1;
}

/** Library wind-sea direction at a sea morph (to align it with the weather wind). */
export function seaWindDirAt(morph: number): number {
  const m = clamp(morph, 0, SEA_WIND_DIR.length - 1);
  const i = Math.min(Math.floor(m), SEA_WIND_DIR.length - 2);
  return lerpAngleDeg(SEA_WIND_DIR[i], SEA_WIND_DIR[i + 1], m - i);
}

/**
 * Duration-limited growth, in the sea-morph coordinate: the sea relaxes toward
 * the wind's equilibrium state. Rising seas build with the response time;
 * decaying seas lose the wind-sea faster than swell (swell persists in the
 * library states themselves), so decay is 1.6× quicker.
 */
export function relaxSeaMorph(current: number, target: number, dt: number, response: number): number {
  if (response <= 0) return target;
  const tau = target > current ? response : response / 1.6;
  return target + (current - target) * Math.exp(-dt / tau);
}
