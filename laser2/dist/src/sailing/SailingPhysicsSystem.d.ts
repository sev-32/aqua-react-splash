import type { AppContext, AppSystem } from '../core/System.js';
import type { OceanSystem } from '../water/OceanSystem.js';
import { type HullMesh } from './HullGeometry.js';
import { HullHydrostatics, type HydroResult } from './HullHydrostatics.js';
import { FoilModel } from './FoilModel.js';
export interface Vec3Like {
    x: number;
    y: number;
    z: number;
}
export interface CrewMassEntry {
    id: string;
    massKg: number;
    /** Centre of mass in the design (boat group) frame. */
    comDesign: Vec3Like;
    /** Optional additional world force on the hull (e.g. crew buoyancy while partly immersed). */
    forceWorld?: Vec3Like;
    forcePointWorld?: Vec3Like;
}
export interface CrewMassProvider {
    /** Crew whose weight is currently carried by the hull (seated, hiking, on the board...). */
    hullCarriedCrew(): readonly CrewMassEntry[];
}
export type CapsizeState = 'upright' | 'knockdown' | 'capsized' | 'turtled';
export interface HullKinematics {
    heelDeg: number;
    /** Signed heel about the longitudinal axis, (-180, 180]. */
    heelSignedDeg: number;
    trimDeg: number;
    mastTipBelowWaterM: number;
    speedThroughWaterMs: number;
    leewayDeg: number;
}
export declare class SailingPhysicsSystem implements AppSystem {
    readonly ocean: OceanSystem;
    readonly id = "sailing.physics";
    readonly phase: "prePhysics";
    enabled: boolean;
    readonly hullMassKg = 79;
    readonly boardMassKg = 4;
    readonly rudderMassKg = 2;
    mesh: HullMesh | null;
    hydro: HullHydrostatics | null;
    readonly board: FoilModel;
    readonly rudder: FoilModel;
    crewProvider: CrewMassProvider | null;
    /** Residuary resistance scale (legacy empirical hump model). */
    residuaryScale: number;
    readonly last: HydroResult;
    capsizeState: CapsizeState;
    capsizeStateAgeS: number;
    readonly kinematics: HullKinematics;
    private context;
    private installed;
    private originalHook;
    private originalInvMass;
    private readonly originalInvI;
    private refY;
    private refZ;
    private hullComBody;
    private hullInertiaBody;
    private readonly pose;
    private readonly foilPose;
    private readonly sampleOut;
    private air;
    private sink;
    private tmpForce;
    private tmpPoint;
    private substeps;
    private lastHookMs;
    private meanHookMs;
    private massKg;
    private readonly cog;
    private rightingMomentNm;
    private rightingArmM;
    constructor(ocean: OceanSystem);
    init(context: AppContext): void;
    /** Distributes the hull laminate mass over the sealed-surface triangles. */
    private computeHullMassProperties;
    install(context: AppContext): void;
    /**
     * Jib sheeting. The legacy fairleads sat 0.95 m aft of the jib clew and the
     * trim law stopped the working sheet at 0.98 m, so the clew could not come
     * inside ~30° of the centreline and the low, aft sheet lead left the leech
     * open: the jib luffed at any apparent wind under ~40° and the boat could
     * not point. The fairleads are placed where the V16 rope hardware draws
     * them (side-deck tracks just forward of the clew, ±0.42 m, 2.65 m from the
     * transom), so the sheet pulls the low clew down and in and holds the leech,
     * and full scope brings the clew onto the fairlead line (~15° sheeting
     * angle). The trim law between is the legacy one, rescaled to the new lead.
     */
    jibFairleadDesignZ: number;
    jibFairleadHalfBeam: number;
    private jibTrimOriginal;
    private jibSheetSaved;
    private installJibSheetRange;
    jibSheetMinM: number;
    private uninstallJibSheetRange;
    uninstall(context: AppContext): void;
    get isInstalled(): boolean;
    /** Current composite mass (kg) carried by the rigid body. */
    get compositeMassKg(): number;
    private readPose;
    /** Body-frame vector → world (rotation only). */
    private rotate;
    private readonly lever;
    /** Resistance components along the hull axis at the last sub-step (N). */
    private readonly surge;
    /** Share of the weight carried dynamically when fully planing. */
    planingLiftMax: number;
    /** V16 sail aerodynamic efficiency used while sailing. */
    sailAeroScale: number;
    private savedAeroScale;
    private lastPlaningShare;
    private readonly air10;
    /** 10 m wind for this sub-step (see the air sampler). */
    private refreshAir;
    private hook;
    private legacyCrewEntries;
    /** Fallback when no crew system is attached: legacy articulated crew COMs. */
    private legacyCrew;
    update(dtSeconds: number, context: AppContext): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SailingPhysicsSystem.d.ts.map