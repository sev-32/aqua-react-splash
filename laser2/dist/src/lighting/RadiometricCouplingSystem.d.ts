import type { AppContext, AppSystem } from '../core/System.js';
import { type Rgb, type Vec3Like } from '../reference/lightingMath.js';
import type { QualityProfile } from '../quality/QualityProfiles.js';
import type { LightingSettings } from './LightingSettings.js';
import type { LightingState } from './LightingState.js';
export declare const SKY_RELATIVE_TO_LUX = 22000;
export declare const REFERENCE_DIRECT_LUX = 100000;
export declare const REFERENCE_SKY_LUX = 18000;
export interface RadiometricBudgetSnapshot {
    revision: number;
    sunDirection: Vec3Like;
    sunTransmittance: Rgb;
    spectralSolarEnabled: boolean;
    spectralSamples: number;
    spectralPhotopicTransmission: number;
    spectralColorTemperatureApproxK: number;
    whiteBalanceRgb: Rgb;
    directNormalRgbLux: Rgb;
    directNormalLux: number;
    directHorizontalRgbLux: Rgb;
    directHorizontalLux: number;
    skyIrradianceRgbLux: Rgb;
    skyIrradianceLux: number;
    groundBounceRgbLux: Rgb;
    groundBounceLux: number;
    totalHorizontalLux: number;
    rendererExposure: number;
    autoExposureEv: number;
    sunRendererColor: Rgb;
    sunRendererIntensity: number;
    hemisphereSkyColor: Rgb;
    hemisphereGroundColor: Rgb;
    hemisphereIntensity: number;
    specularEnvironmentIntensity: number;
    atmosphereSamples: number;
    cpuMs: number;
}
export declare function computeRadiometricBudget(settings: Readonly<LightingSettings>, profile: Pick<QualityProfile, 'atmosphereSunSamples' | 'atmosphereShSamples' | 'atmosphereViewSamples'>, revision?: number): RadiometricBudgetSnapshot;
/** One atmosphere-derived energy budget shared by every lighting consumer. */
export declare class RadiometricCouplingSystem implements AppSystem {
    readonly settings: LightingState;
    readonly id = "lighting.radiometric-coupling";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private dirty;
    private snapshotValue;
    private recomputes;
    private meanCpuMs;
    constructor(settings: LightingState);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    get current(): Readonly<RadiometricBudgetSnapshot>;
    forceRecompute(): void;
    private recompute;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=RadiometricCouplingSystem.d.ts.map