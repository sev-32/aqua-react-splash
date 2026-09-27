import type { AppContext, AppSystem } from '../core/System.js';
export interface SailingAuthority {
    readonly id: string;
    install(context: AppContext): void;
    uninstall(context: AppContext): void;
    /** Optional hook when the legacy simulation is reset while sailing. */
    onSailingReset?(context: AppContext): void;
}
export declare class SailingModeSystem implements AppSystem {
    readonly id = "sailing.mode";
    readonly phase: "prePhysics";
    enabled: boolean;
    private readonly authorities;
    private context;
    private active;
    private transitions;
    private resets;
    private lastError;
    /** Wind applied when sailing starts (knots, degrees "from"). */
    startWindKnots: number;
    startWindFromDeg: number;
    addAuthority(authority: SailingAuthority): this;
    init(context: AppContext): void;
    private apply;
    private recordError;
    get isActive(): boolean;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SailingModeSystem.d.ts.map