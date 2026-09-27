import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
export declare class SunSkySystem implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly id = "lighting.sun";
    readonly phase: "preRender";
    enabled: boolean;
    private sun;
    private hemisphere;
    private ambient;
    private lastRevision;
    private applyCount;
    private lastApplyMs;
    /** Horizontal point the sun (and its shadow frustum) is centred on. */
    private readonly focus;
    private focusMoves;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    private apply;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SunSkySystem.d.ts.map