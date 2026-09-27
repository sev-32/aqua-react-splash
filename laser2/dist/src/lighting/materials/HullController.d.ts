import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';
export declare class HullController implements AppSystem {
    readonly settings: LightingState;
    readonly id = "materials.hull-gelcoat";
    readonly phase: "postPhysics";
    enabled: boolean;
    private readonly materials;
    private last;
    constructor(settings: LightingState);
    init(context: AppContext): void;
    private apply;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=HullController.d.ts.map