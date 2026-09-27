import type { LightingSettings } from '../LightingSettings.js';
export interface AtmosphereLutJobRequest {
    generation: number;
    width: number;
    height: number;
    viewSamples: number;
    sunSamples: number;
    scatteringOrders: number;
    settings: LightingSettings;
}
export interface AtmosphereLutJobResult {
    generation: number;
    width: number;
    height: number;
    scatteringOrders: number;
    data: ArrayBuffer;
    computeMs: number;
    firstOrderEnergy: number;
    finalEnergy: number;
}
/**
 * Computes the atmosphere radiance atlas without DOM or WebGL. Higher orders
 * are a bounded angular redistribution of first-order radiance. This is not a
 * full Bruneton spectral precomputation; the approximation is explicit in
 * telemetry and can be replaced without changing the worker protocol.
 */
export declare function computeAtmosphereLut(request: AtmosphereLutJobRequest): AtmosphereLutJobResult;
//# sourceMappingURL=AtmosphereLutJob.d.ts.map