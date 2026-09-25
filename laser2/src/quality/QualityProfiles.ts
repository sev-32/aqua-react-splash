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

export const QUALITY_PROFILES: readonly QualityProfile[] = [
  {
    id: 'reference', label: 'Reference', pixelRatioCap: 2, shadowMapSize: 2048,
    shadowEnabled: true, shadowRadius: 2.5, environmentUpdateHz: 4, dynamicLightingHz: 60,
    telemetryHz: 10, waterSamples: 24, enableGpuTimers: true,
    atmosphereViewSamples: 24, atmosphereSunSamples: 8, atmosphereShSamples: 96, atmosphereLutWidth: 256, atmosphereLutHeight: 128, atmosphereScatteringOrders: 5,
    wakeResolution: 512, wakeExtentM: 64,
  },
  {
    id: 'high', label: 'High', pixelRatioCap: 1.5, shadowMapSize: 1536,
    shadowEnabled: true, shadowRadius: 2, environmentUpdateHz: 2, dynamicLightingHz: 60,
    telemetryHz: 8, waterSamples: 16, enableGpuTimers: true,
    atmosphereViewSamples: 16, atmosphereSunSamples: 6, atmosphereShSamples: 64, atmosphereLutWidth: 192, atmosphereLutHeight: 96, atmosphereScatteringOrders: 4,
    wakeResolution: 512, wakeExtentM: 64,
  },
  {
    id: 'balanced', label: 'Balanced', pixelRatioCap: 1, shadowMapSize: 1024,
    shadowEnabled: true, shadowRadius: 1.5, environmentUpdateHz: 1, dynamicLightingHz: 30,
    telemetryHz: 5, waterSamples: 8, enableGpuTimers: true,
    atmosphereViewSamples: 12, atmosphereSunSamples: 4, atmosphereShSamples: 32, atmosphereLutWidth: 128, atmosphereLutHeight: 64, atmosphereScatteringOrders: 4,
    wakeResolution: 256, wakeExtentM: 48,
  },
  {
    id: 'fast', label: 'Fast', pixelRatioCap: 1, shadowMapSize: 512,
    shadowEnabled: true, shadowRadius: 1, environmentUpdateHz: 0.25, dynamicLightingHz: 20,
    telemetryHz: 2, waterSamples: 4, enableGpuTimers: false,
    atmosphereViewSamples: 8, atmosphereSunSamples: 3, atmosphereShSamples: 16, atmosphereLutWidth: 96, atmosphereLutHeight: 48, atmosphereScatteringOrders: 3,
    wakeResolution: 256, wakeExtentM: 40,
  },
  {
    id: 'cpu-reference', label: 'CPU Reference', pixelRatioCap: 0.75, shadowMapSize: 256,
    shadowEnabled: false, shadowRadius: 0, environmentUpdateHz: 0, dynamicLightingHz: 10,
    telemetryHz: 2, waterSamples: 0, enableGpuTimers: false,
    atmosphereViewSamples: 4, atmosphereSunSamples: 2, atmosphereShSamples: 8, atmosphereLutWidth: 48, atmosphereLutHeight: 24, atmosphereScatteringOrders: 2,
    wakeResolution: 128, wakeExtentM: 32,
  },
] as const;
