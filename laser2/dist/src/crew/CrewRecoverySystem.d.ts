import type { AppContext, AppSystem } from '../core/System.js';
import type { SailingAuthority } from '../sailing/SailingModeSystem.js';
import type { CrewMassEntry, CrewMassProvider, SailingPhysicsSystem } from '../sailing/SailingPhysicsSystem.js';
import type { OceanSystem } from '../water/OceanSystem.js';
import type { PhysicsStepBus } from '../sailing/PhysicsStepBus.js';
import { SwimmerBody, HullGripConstraint, HullContactConstraint, SparContactConstraint } from './SwimmerBody.js';
import * as P from './CrewPoseSynth.js';
type V3 = P.V3;
export type CrewMode = 'aboard' | 'overboard' | 'attached';
export type CrewTask = 'sailing' | 'bracing' | 'dryCapsize' | 'falling' | 'treading' | 'swimToBoard' | 'hangBoard' | 'climbBoard' | 'standBoard' | 'swimToHull' | 'climbHull' | 'standHull' | 'swimToCockpit' | 'holdStrap' | 'scooped' | 'swimToGunwale' | 'holdGunwale' | 'climbIn';
export type CrewRole = 'righter' | 'scoop';
declare class CrewAgent {
    readonly id: 'helm' | 'crew';
    readonly actor: any;
    mode: CrewMode;
    task: CrewTask;
    taskTime: number;
    role: CrewRole;
    readonly swimmer: SwimmerBody;
    grip: HullGripConstraint;
    contact: HullContactConstraint;
    mastContact: SparContactConstraint;
    boomContact: SparContactConstraint;
    readonly comDesign: V3;
    hikeCommand: number;
    hikeSaturatedS: number;
    hikeSlackS: number;
    lastPhiAway: number;
    lean: number;
    progress: number;
    attachStartDesign: V3;
    /** Feet (design frame) when a dry capsize started. */
    dryStartFeet: V3;
    /** Rope length the current grip is drawn in to (m). */
    gripTarget: number;
    /** Lowest recent heel (deg) while waiting for the scoop; detects the boat rising. */
    scoopHeelMark: number;
    /** Time the righting has made no progress while this sailor waits (s), from heel stallRef. */
    stallS: number;
    stallRef: number;
    /** Scooped crew's seat, design-x sign blended between the sides, and its target. */
    seatBlend: number;
    seatWant: number;
    holdSide: number;
    heading: V3;
    waypoint: number;
    wetness: number;
    poseTime: number;
    blendFrom: P.Skeleton | null;
    blendT: number;
    lastSkeleton: P.Skeleton | null;
    readonly dims: P.BodyDims;
    forceWorld: V3;
    forcePoint: V3;
    carriedBuoyancyN: number;
    events: string[];
    constructor(id: 'helm' | 'crew', actor: any, role: CrewRole);
    setTask(task: CrewTask, note?: string): void;
}
export declare class CrewRecoverySystem implements AppSystem, SailingAuthority, CrewMassProvider {
    readonly ocean: OceanSystem;
    readonly physics: SailingPhysicsSystem;
    readonly bus: PhysicsStepBus;
    readonly id = "crew.recovery";
    readonly phase: "postPhysics";
    enabled: boolean;
    /** Crew perform the full capsize recovery automatically. */
    autoRecovery: boolean;
    /** Crew actively balance the boat (hiking, inboard/leeward seating). */
    balanceAssist: boolean;
    /** Crew uses the trapeze when fully hiked in a breeze. */
    trapezeAssist: boolean;
    /** Ease sheets while capsized so the boat does not sail off on righting. */
    releaseSheetsWhenCapsized: boolean;
    /** Crew trim main and jib to the apparent wind (and ease in gusts) unless keys are held. */
    trimAssist: boolean;
    private lastAwaDeg;
    /** Helm steps over the high side onto the board in a leeward capsize. */
    dryCapsize: boolean;
    /** Maximum lean-back angle on the board (rad); U key raises it. */
    maxLeanRad: number;
    /** How far past the legacy seat a fully hiked sailor's pelvis goes (m). */
    hikeOverGunwaleM: number;
    heaveBoost: number;
    /**
     * Knockdown gust (O key / API): a real gust — the wind speed ramps to
     * `gustPeak` × for a few seconds — that catches the crew out: sheets held,
     * no extra hiking, and on a broad course the helm luffs into it. Whether the
     * boat goes over is decided by the sail forces and the righting moment.
     */
    gustPeak: number;
    private readonly gust;
    private gustFactor;
    /**
     * After a recovery the crew bring the sheets in slowly before normal
     * trimming resumes (seconds left). Any sheet key ends it.
     */
    private settleS;
    /** Heel-limited ceiling on the mainsheet (gust relief) and the heel it last saw. */
    private mainCeiling;
    private trimLastHeel;
    /** Remaining seconds the crew is caught out by the gust. */
    private knockdownS;
    private knockdownElapsed;
    private luffSign;
    readonly agents: CrewAgent[];
    private context;
    private installed;
    private readonly removers;
    private readonly originals;
    private tmp;
    private savedTrim;
    private restoreTrimS;
    private recoveryCount;
    private capsizeCount;
    private capsizeActive;
    private capsizeStartTime;
    private lastRecoveryDurationS;
    private simTime;
    private readonly frame;
    private readonly carried;
    constructor(ocean: OceanSystem, physics: SailingPhysicsSystem, bus: PhysicsStepBus);
    init(context: AppContext): void;
    install(context: AppContext): void;
    uninstall(context: AppContext): void;
    onSailingReset(context: AppContext): void;
    private resetAgents;
    hullCarriedCrew(): readonly CrewMassEntry[];
    private wrapActor;
    private unwrapActor;
    private updateFrame;
    designToWorld(d: V3, out: V3): V3;
    worldToDesign(w: V3, out: V3): V3;
    private rotateToWorld;
    private rotateToDesign;
    private pointVelocity;
    /** Body-frame (rigid body local) point from a design point. */
    private designToBody;
    private surfaceAt;
    private boardTipDesign;
    private boardRootDesign;
    private gunwaleDesign;
    private strapDesign;
    private beforeStep;
    private phiAway;
    private stepAgent;
    /** Aboard balance: hike command from heel away from the crew side. */
    private balance;
    /**
     * Post-recovery settle: righted beam-on with the sheets free, the crew bring
     * the sheets in slowly (0.12/s) against a low heel limit (10°) before normal
     * trimming resumes; sheeted straight in beam-on to a breeze the boat went
     * back over (18 kn: capsize loop). The helm is left alone: luffing her up
     * with the sheets free overshot and rolled her over to windward.
     */
    private settle;
    private manageSheets;
    /**
     * Sheet trim by the crew: sails set for the apparent wind angle (sheeted
     * hard on the wind, eased progressively towards a run) and the main eased
     * when a gust heels the boat beyond what full hiking can hold.
     */
    private autoTrim;
    private readonly lastAlpha;
    /**
     * Signed angle of attack (deg) of the apparent flow on the chord of the
     * sail row at `frac` of the height, positive when the wind loads the
     * windward face (negative: backwinded / luffing). Mirrors the V16 strip
     * aerodynamics' chord/normal construction.
     */
    private sailAlpha;
    private fall;
    private tread;
    private chooseRecoveryTask;
    private hullPlane;
    private steer;
    private followPath;
    private waterPoint;
    private swimToBoard;
    private swimmerPos;
    private engageGrip;
    private releaseGrip;
    /** Swimmer → hull-carried transition (momentum of the swimmer goes to the hull). */
    private attach;
    /** Hull-carried → swimmer transition at the current COM. */
    private detach;
    /** Righter on the centreboard: climb from the tip onto the root, then lean back. */
    private onBoard;
    /** Which design-x side the righter's hands hold (the high gunwale). */
    private boardStandSide;
    private boardPose;
    /** Leeward capsize: helm climbs over the high gunwale onto the centreboard. */
    private beginDryCapsize;
    private stepDryCapsize;
    private dryCapsizeSkeleton;
    /** Moves a design-frame point outside the hull surface by at least `margin`. */
    private pushOutOfHull;
    private swimToHull;
    private nearestGunwaleSide;
    /** Turtle recovery: climb onto the upturned hull, stand on the gunwale lip, pull the board. */
    private onUpturnedHull;
    /** Design-x sign of the side the wind comes from. */
    private windwardSide;
    private lowerStrapSide;
    private swimToCockpit;
    private holdStrap;
    private scoopedFrom;
    private scooped;
    private swimToGunwale;
    private holdGunwale;
    private climbIn;
    /** Returns control to the legacy seated biomechanics on design-x side `side`. */
    private handBackToLegacy;
    private afterStep;
    private synthesize;
    private translateSkeleton;
    private blendSkeleton;
    /** Current legacy skeleton (human.cur, design frame) in world space. */
    private currentSkeletonWorld;
    private writeSkeleton;
    private stowExtension;
    private applyWetness;
    update(): void;
    /** Overboard crew as seen by the water-interaction solver. */
    swimmerStates(): Array<{
        id: string;
        active: boolean;
        inWater: boolean;
        x: number;
        y: number;
        z: number;
        heading: V3;
        verticality: number;
        throttle: number;
        strokePhase: number;
        treading: number;
    }>;
    /** World position of the crew member most worth watching (camera 'crew' mode). */
    cameraFocus(): V3 | null;
    /**
     * Knockdown gust (demo/test/O key): the wind builds to `gustPeak` × for a few
     * seconds while the crew is caught out. Returns the gust duration (s).
     */
    forceCapsize(): number;
    private advanceGust;
    telemetry(): Record<string, unknown>;
}
export {};
//# sourceMappingURL=CrewRecoverySystem.d.ts.map