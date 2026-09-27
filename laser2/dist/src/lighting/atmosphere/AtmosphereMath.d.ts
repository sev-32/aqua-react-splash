import { type Rgb, type Vec3Like } from '../../reference/lightingMath.js';
import type { LightingSettings } from '../LightingSettings.js';
export declare const EARTH_RADIUS_M = 6371000;
export declare const ATMOSPHERE_RADIUS_M = 6471000;
export declare const RAYLEIGH_SCALE_HEIGHT_M = 8500;
export declare const MIE_SCALE_HEIGHT_M = 1200;
export declare const RAYLEIGH_SCATTERING_M_INV: readonly [number, number, number];
export declare const MIE_EXTINCTION_M_INV = 0.000021;
export declare const MIE_SINGLE_SCATTERING_ALBEDO = 0.9;
export declare const OZONE_PEAK_ALTITUDE_M = 25000;
export declare const OZONE_HALF_WIDTH_M = 15000;
export declare const OZONE_ABSORPTION_M_INV: readonly [number, number, number];
export interface AtmosphereIntegrationOptions {
    viewSamples: number;
    sunSamples: number;
    cameraAltitudeM?: number;
}
export declare function atmosphereTransmittanceFromOpticalDepth(rayleighOpticalDepthM: number, mieOpticalDepthM: number, ozoneOpticalDepthM?: number): Rgb;
export declare function atmosphericSunTransmittance(sunDirection: Vec3Like, settings: LightingSettings, sunSamples?: number, cameraAltitudeM?: number): Rgb;
export declare function integrateAtmosphereRadiance(viewDirection: Vec3Like, sunDirection: Vec3Like, settings: LightingSettings, options: AtmosphereIntegrationOptions): Rgb;
export interface ShProjection {
    coefficients: Array<{
        r: number;
        g: number;
        b: number;
    }>;
    samples: number;
    elapsedMs: number;
}
export declare function projectAtmosphereToSh(sunDirection: Vec3Like, settings: LightingSettings, sampleCount: number, viewSamples: number, sunSamples: number): ShProjection;
export declare function colorTemperatureWhiteBalance(kelvin: number): Rgb;
//# sourceMappingURL=AtmosphereMath.d.ts.map