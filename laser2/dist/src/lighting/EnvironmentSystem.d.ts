import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
import type { AtmosphereSystem } from './atmosphere/AtmosphereSystem.js';
export declare class EnvironmentSystem implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly atmosphere: AtmosphereSystem;
    readonly id = "lighting.environment";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private readonly secondaryHemisphereLights;
    private readonly ambientLights;
    private readonly pbrMaterials;
    private lastBudgetRevision;
    private updates;
    private environmentAssignments;
    private materialBindings;
    private lastCpuMs;
    private meanCpuMs;
    private textureVersion;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem, atmosphere: AtmosphereSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    private bindEnvironment;
    private applyBudget;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=EnvironmentSystem.d.ts.map