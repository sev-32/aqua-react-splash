import { type Rgb } from '../../reference/lightingMath.js';
import type { LightingSettings } from '../LightingSettings.js';
export interface SpectralSolarSample {
    rgb: Rgb;
    normalizedRgb: Rgb;
    photopicTransmission: number;
    colorTemperatureApproxK: number;
    samples: number;
}
export declare function computeSpectralSolar(elevationDeg: number, settings: Readonly<LightingSettings>): SpectralSolarSample;
//# sourceMappingURL=SpectralSolar.d.ts.map