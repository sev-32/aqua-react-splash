import type { AppContext, AppSystem } from '../core/System.js';
import type { SailingAuthority } from './SailingModeSystem.js';
import type { OceanSystem } from '../water/OceanSystem.js';
export declare class SailWaterSystem implements AppSystem, SailingAuthority {
    readonly ocean: OceanSystem;
    readonly id = "sailing.sail-water";
    readonly phase: "postPhysics";
    enabled: boolean;
    /** Flat-plate normal drag coefficient of submerged sailcloth. */
    normalCd: number;
    /** Normal drag while the sheet is peeled upwards out of the water. */
    exitCd: number;
    /** Skin friction coefficient per face (two faces wetted). */
    frictionCf: number;
    clothDensity: number;
    /** Water retained by a sail pulled out of the water (kg/m²). */
    filmKgPerM2: number;
    filmHalfLifeS: number;
    private context;
    private installed;
    private records;
    private hookFn;
    private readonly sample;
    private stats;
    constructor(ocean: OceanSystem);
    init(context: AppContext): void;
    private buildRecords;
    install(context: AppContext): void;
    uninstall(context: AppContext): void;
    onSailingReset(context: AppContext): void;
    private hook;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SailWaterSystem.d.ts.map