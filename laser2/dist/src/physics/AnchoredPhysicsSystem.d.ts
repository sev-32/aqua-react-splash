import type { AppContext, AppSystem } from '../core/System.js';
export declare class AnchoredPhysicsSystem implements AppSystem {
    readonly id = "physics.anchored-bridge";
    readonly phase: "physics";
    enabled: boolean;
    private frames;
    private activeFrames;
    private zeroStepFrames;
    private steps;
    private catchUpFrames;
    private lastBatchMs;
    private maxBatchMs;
    private meanBatchMs;
    private lastPerStepMs;
    private meanPerStepMs;
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=AnchoredPhysicsSystem.d.ts.map