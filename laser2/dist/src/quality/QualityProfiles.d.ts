export interface QualityProfile {
    id: 'reference' | 'high' | 'balanced' | 'fast' | 'cpu-reference';
    label: string;
    pixelRatioCap: number;
    shadowMapSize: number;
    shadowEnabled: boolean;
    shadowRadius: number;
    environmentUpdateHz: number;
    dynamicLightingHz: number;
    telemetryHz: number;
    waterSamples: number;
    enableGpuTimers: boolean;
    atmosphereViewSamples: number;
    atmosphereSunSamples: number;
    atmosphereShSamples: number;
    atmosphereLutWidth: number;
    atmosphereLutHeight: number;
    atmosphereScatteringOrders: number;
    /** Interaction (wake) solver grid resolution (power of two) and extent (m). */
    wakeResolution: number;
    wakeExtentM: number;
}
export declare const QUALITY_PROFILES: readonly QualityProfile[];
//# sourceMappingURL=QualityProfiles.d.ts.map