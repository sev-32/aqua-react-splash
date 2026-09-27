import type { AppContext, AppSystem } from '../core/System.js';
export declare class SailRenderSystem implements AppSystem {
    readonly id = "scene.sail-surfaces";
    readonly phase: "postPhysics";
    enabled: boolean;
    subdivisions: number;
    /** Fraction of sunlight the Dacron lets through into its shadow. */
    shadowTransmission: number;
    castShadows: boolean;
    private records;
    private updates;
    private lastUpdateMs;
    init(context: AppContext): void;
    update(): void;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=SailRenderSystem.d.ts.map