import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
export declare class SphericalHarmonicProbeSystem implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly id = "lighting.sh-diffuse-probe";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private probe;
    private sourceTemplate;
    private dirty;
    private lastRevision;
    private updates;
    private lastCpuMs;
    private meanCpuMs;
    private samples;
    private coefficientLuminance;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    private rebuild;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=SphericalHarmonicProbeSystem.d.ts.map