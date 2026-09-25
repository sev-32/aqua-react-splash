/**
 * Settings: one plain object the UI binds to directly (WaveLab's "single source
 * of truth" lesson), plus quality tiers and water-type optics presets.
 */
import { DEFAULT_SEA_CONTROLS, type SeaStateControls } from '../spectrum/seaStates';
import { DEFAULT_SKY, type SkyParams, type SkyQuality } from '../render/sky';
import { DEFAULT_WEATHER, type WeatherParams } from '../atmos/weather';
import { DEFAULT_POST, type PostParams } from '../render/post';
import type { WaterOptics } from '../render/OceanSurface';
import type { CdlodConfig } from '../render/cdlod';
import type { FoamParams } from '../ocean/SpectralOcean';

export type QualityName = 'capture' | 'low' | 'medium' | 'high' | 'ultra';

export interface QualityTier {
  fftN: number;
  cascadeSizes: number[];
  mirrorN: number;
  skyWidth: number;
  cdlod: CdlodConfig;
  renderScale: number;
  maxDpr: number;
  tileN: number;
  shoreN: number;
  sprayCapacity: number;
  sky: SkyQuality;
}

const cd = (leafSize: number, patchQuads: number, levels: number, coverage = 42000): CdlodConfig => ({
  leafSize, patchQuads, levels, rangeK: 2.4, coverage, morphFraction: 0.32,
});

const sky = (envWidth: number, cloudScale: number, cloudSteps: number, lightSteps: number, envSteps: number, envSlices: number, shadowN: number, noiseN: number): SkyQuality => ({
  envWidth, cloudScale, cloudSteps, lightSteps, envSteps, envSlices, shadowN, shadowSize: 24000, noiseN,
});

export const QUALITY: Record<QualityName, QualityTier> = {
  capture: { fftN: 128, cascadeSizes: [1379, 263, 17.9], mirrorN: 32, skyWidth: 512, cdlod: cd(8, 16, 13), renderScale: 1, maxDpr: 1, tileN: 128, shoreN: 256, sprayCapacity: 4096, sky: sky(512, 0.3, 48, 4, 28, 4, 128, 64) },
  low: { fftN: 128, cascadeSizes: [1379, 263, 17.9], mirrorN: 32, skyWidth: 512, cdlod: cd(8, 16, 13), renderScale: 0.75, maxDpr: 1, tileN: 128, shoreN: 256, sprayCapacity: 8192, sky: sky(512, 0.25, 36, 4, 20, 8, 128, 64) },
  medium: { fftN: 256, cascadeSizes: [1379, 263, 17.9], mirrorN: 64, skyWidth: 1024, cdlod: cd(8, 32, 13), renderScale: 1, maxDpr: 1.25, tileN: 256, shoreN: 384, sprayCapacity: 16384, sky: sky(1024, 0.33, 56, 5, 28, 8, 256, 128) },
  high: { fftN: 256, cascadeSizes: [1379, 263, 41.3, 6.1], mirrorN: 64, skyWidth: 1024, cdlod: cd(6, 48, 14), renderScale: 1, maxDpr: 1.5, tileN: 256, shoreN: 512, sprayCapacity: 32768, sky: sky(1024, 0.5, 72, 6, 32, 8, 256, 128) },
  ultra: { fftN: 512, cascadeSizes: [1379, 263, 41.3, 6.1], mirrorN: 64, skyWidth: 2048, cdlod: cd(4, 64, 15), renderScale: 1, maxDpr: 2, tileN: 512, shoreN: 512, sprayCapacity: 65536, sky: sky(2048, 0.5, 112, 6, 40, 8, 512, 128) },
};

export interface WaterType {
  id: string;
  label: string;
  note: string;
  absorb: [number, number, number];
  backscatter: [number, number, number];
  scatter: [number, number, number];
}

/**
 * Inherent optical properties at ~(620, 550, 460) nm. Absorption is pure water
 * (Pope & Fry) plus chlorophyll/CDOM; backscatter is molecular water + particles.
 * Colour then emerges from Gordon's reflectance model — nothing is painted.
 */
export const WATER_TYPES: WaterType[] = [
  { id: 'oceanic', label: 'Open ocean (Jerlov I)', note: 'Oligotrophic blue water: almost no particles, deep navy body, violet-blue glow.',
    absorb: [0.34, 0.058, 0.018], backscatter: [0.0010, 0.0017, 0.0030], scatter: [0.03, 0.035, 0.045] },
  { id: 'tropical', label: 'Tropical lagoon', note: 'Carbonate sand particles backscatter strongly over clear water: electric cyan.',
    absorb: [0.34, 0.052, 0.017], backscatter: [0.0045, 0.0072, 0.0082], scatter: [0.10, 0.11, 0.12] },
  { id: 'atlantic', label: 'North Atlantic (Jerlov II)', note: 'Moderate plankton: slate blue with a green cast.',
    absorb: [0.36, 0.078, 0.048], backscatter: [0.0022, 0.0030, 0.0034], scatter: [0.15, 0.16, 0.17] },
  { id: 'coastal', label: 'Coastal green (Jerlov 3C)', note: 'CDOM absorbs the blue; sediment scatters: bottle green.',
    absorb: [0.42, 0.12, 0.20], backscatter: [0.0060, 0.0085, 0.0070], scatter: [0.55, 0.58, 0.58] },
  { id: 'murky', label: 'Harbour / estuary', note: 'Heavy sediment and humics: opaque olive-brown.',
    absorb: [0.58, 0.30, 0.55], backscatter: [0.016, 0.018, 0.014], scatter: [1.6, 1.65, 1.6] },
];

export interface EngineSettings {
  quality: QualityName;
  paused: boolean;
  timeScale: number;
  loopPeriod: number;       // >0: seamlessly looping ocean (s)
  sea: SeaStateControls;
  sky: SkyParams;
  weather: WeatherParams;
  post: PostParams;
  waterType: string;
  optics: WaterOptics;
  foam: FoamParams;
  earthCurvature: boolean;
  geoLodBias: number;
  debug: number;            // 0 = beauty; see DEBUG_VIEWS
  interaction: {
    tilesEnabled: boolean;
    dispersionDamping: number;
    sourceGain: number;
    limiterEnabled: boolean;
    maxSlope: number;       // representability envelope: max |∇η|
    maxGamma: number;       // depth-limited H/h
  };
  shore: { enabled: boolean; friction: number; breakGamma: number; lip: number };
  spray: { enabled: boolean; gain: number; render: 'fluid' | 'points' };
  scheduler: { overlay: boolean };
}

export const DEBUG_VIEWS: { id: number; label: string }[] = [
  { id: 0, label: 'Beauty' },
  { id: 1, label: 'Normals' },
  { id: 2, label: 'CDLOD levels' },
  { id: 3, label: 'Roughness (unresolved slope σ)' },
  { id: 4, label: 'Foam mass / air / age' },
  { id: 5, label: 'Jacobian (folds)' },
  { id: 6, label: 'Scheduler tiers' },
  { id: 7, label: 'Shore field' },
];

export function opticsFor(type: WaterType, base?: Partial<WaterOptics>): WaterOptics {
  return {
    absorb: [...type.absorb],
    backscatter: [...type.backscatter],
    scatter: [...type.scatter],
    ior: 1.333,
    sss: 0.9,
    glitter: 1.0,
    roughnessGain: 1.0,
    fogDensity: 1 / 26000,
    foamGain: 1.0,
    foamDetailDist: 900,
    ...base,
  };
}

export function defaultSettings(quality: QualityName = 'high'): EngineSettings {
  return {
    quality,
    paused: false,
    timeScale: 1,
    loopPeriod: 0,
    sea: { ...DEFAULT_SEA_CONTROLS },
    sky: { ...DEFAULT_SKY },
    weather: { ...DEFAULT_WEATHER },
    post: { ...DEFAULT_POST },
    waterType: 'oceanic',
    optics: opticsFor(WATER_TYPES[0]),
    foam: { foldStart: 0.5, foldFull: 1.0, birth: 3, life: 7, airLife: 1.4, spread: 0.6, coverage: 1, calibrate: true },
    earthCurvature: true,
    geoLodBias: 0.35,
    debug: 0,
    interaction: { tilesEnabled: true, dispersionDamping: 0.06, sourceGain: 1, limiterEnabled: true, maxSlope: 0.62, maxGamma: 0.78 },
    shore: { enabled: true, friction: 0.022, breakGamma: 0.62, lip: 0.85 },
    spray: { enabled: true, gain: 1, render: 'fluid' },
    scheduler: { overlay: false },
  };
}
