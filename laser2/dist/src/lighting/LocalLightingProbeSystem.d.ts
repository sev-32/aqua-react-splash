import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
export declare class LocalLightingProbeSystem implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly id = "lighting.local-probes";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private uniforms;
    private patchedMaterials;
    private shaderCompiles;
    private outputInjections;
    private worldPositionInjections;
    private frames;
    private updates;
    private lastCpuMs;
    private meanCpuMs;
    private frameStride;
    private worldPositions;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    private patchMaterials;
    private updateProbes;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=LocalLightingProbeSystem.d.ts.map