import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';
export declare class MetalController implements AppSystem {
    readonly settings: LightingState;
    readonly id = "materials.aluminum";
    readonly phase: "postPhysics";
    enabled: boolean;
    private readonly targets;
    private lastRoughness;
    constructor(settings: LightingState);
    init(context: AppContext): void;
    private apply;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=MetalController.d.ts.map