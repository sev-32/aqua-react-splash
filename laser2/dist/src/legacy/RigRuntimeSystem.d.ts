import type { AppContext, AppSystem } from '../core/System.js';
export declare class RigRuntimeSystem implements AppSystem {
    readonly id = "legacy.rig-runtime";
    readonly phase: "postPhysics";
    enabled: boolean;
    private frames;
    private context;
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=RigRuntimeSystem.d.ts.map