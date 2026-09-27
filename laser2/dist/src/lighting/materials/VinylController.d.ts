import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';
export declare class VinylController implements AppSystem {
    readonly settings: LightingState;
    readonly id = "materials.vinyl";
    readonly phase: "postPhysics";
    enabled: boolean;
    private optics;
    private last;
    constructor(settings: LightingState);
    init(context: AppContext): void;
    private apply;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=VinylController.d.ts.map