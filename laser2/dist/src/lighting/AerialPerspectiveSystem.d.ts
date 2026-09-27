import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
export declare class AerialPerspectiveSystem implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly id = "lighting.aerial-perspective";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private readonly patched;
    private lastRevision;
    private patches;
    private updates;
    private shaderCompiles;
    private lastDensity;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number): void;
    private patch;
    private writeUniforms;
    private apply;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=AerialPerspectiveSystem.d.ts.map