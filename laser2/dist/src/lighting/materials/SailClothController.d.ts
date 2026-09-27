import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';
import type { RadiometricCouplingSystem } from '../RadiometricCouplingSystem.js';
export declare class SailClothController implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly id = "materials.sailcloth";
    readonly phase: "postPhysics";
    enabled: boolean;
    private optics;
    private lastKey;
    private sunlightScale;
    private shadowBlurM;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    private setParam;
    private apply;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SailClothController.d.ts.map