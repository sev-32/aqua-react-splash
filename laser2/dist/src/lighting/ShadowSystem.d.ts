import type { AppContext, AppSystem } from '../core/System.js';
import { LightingState } from './LightingState.js';
export declare class ShadowSystem implements AppSystem {
    readonly settings: LightingState;
    readonly id = "lighting.shadows";
    readonly phase: "preRender";
    enabled: boolean;
    private light;
    private sailMeshes;
    private lastConfiguration;
    private dirty;
    private invalidations;
    private updatesRequested;
    private readonly reasons;
    constructor(settings: LightingState);
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    invalidate(reason: string): void;
    private configurationKey;
    private apply;
    requestUpdate(context: AppContext, reason?: string): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=ShadowSystem.d.ts.map