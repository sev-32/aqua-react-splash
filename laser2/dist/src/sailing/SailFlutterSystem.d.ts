import type { AppContext, AppSystem } from '../core/System.js';
import type { SailingAuthority } from './SailingModeSystem.js';
import type { OceanSystem } from '../water/OceanSystem.js';
export declare class SailFlutterSystem implements AppSystem, SailingAuthority {
    readonly ocean: OceanSystem;
    readonly id = "sailing.sail-flutter";
    readonly phase: "postPhysics";
    enabled: boolean;
    /** Peak pressure coefficient of the flutter wave (fraction of q). */
    amplitude: number;
    /** Chord Strouhal number of the shedding that drives the ripples. */
    strouhal: number;
    private context;
    private installed;
    private hookFn;
    private time;
    private readonly stats;
    private readonly n;
    constructor(ocean: OceanSystem);
    init(context: AppContext): void;
    install(context: AppContext): void;
    uninstall(context: AppContext): void;
    private hook;
    private applySail;
    private windOut;
    private center;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SailFlutterSystem.d.ts.map