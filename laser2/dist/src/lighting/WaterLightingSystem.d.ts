import type { AppContext, AppSystem } from '../core/System.js';
export declare class WaterLightingSystem implements AppSystem {
    readonly id = "lighting.water";
    readonly phase: "preRender";
    enabled: boolean;
    private backend;
    init(context: AppContext): void;
    private apply;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=WaterLightingSystem.d.ts.map