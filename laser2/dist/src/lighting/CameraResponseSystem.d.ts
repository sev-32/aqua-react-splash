import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
/** Global renderer/camera response authority. */
export declare class CameraResponseSystem implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly id = "lighting.camera-response";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private lastRevision;
    private updates;
    private lastCpuMs;
    private originalToneMapping;
    private originalExposure;
    private originalOutputColorSpace;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    private apply;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=CameraResponseSystem.d.ts.map