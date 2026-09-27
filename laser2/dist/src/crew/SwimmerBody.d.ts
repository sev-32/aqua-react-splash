export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface WaterQuery {
    sample(x: number, y: number, z: number, out: {
        height: number;
        vx: number;
        vy: number;
        vz: number;
    }): {
        height: number;
        vx: number;
        vy: number;
        vz: number;
    };
}
export interface SwimmerSpec {
    massKg: number;
    statureM: number;
    bodyDensity: number;
    /** Buoyancy-aid buoyancy (N). */
    aidBuoyancyN: number;
    /** Mean swim thrust (N) and stroke frequency (Hz). */
    swimThrustN: number;
    strokeHz: number;
    /** Collision radius around the COM (m). */
    radiusM: number;
}
export declare const DEFAULT_SWIMMER: SwimmerSpec;
export declare class SwimmerBody {
    readonly x: Vec3;
    readonly p: Vec3;
    readonly v: Vec3;
    readonly f: Vec3;
    readonly spec: SwimmerSpec;
    /** 0 = prone (horizontal swimming), 1 = upright (treading / hanging). */
    verticality: number;
    /** Unit horizontal swim direction and throttle 0..1. */
    readonly swimDir: Vec3;
    swimThrottle: number;
    /** Extra upward treading support 0..1 (sculling + eggbeater kick). */
    treading: number;
    strokePhase: number;
    submerged01: number;
    depthM: number;
    buoyancyN: number;
    dragN: number;
    /** Water surface height at the body, last sample. */
    surfaceY: number;
    inWater: boolean;
    active: boolean;
    /**
     * Hand-over-hand hold on the hull (0..1): the swimmer's velocity is driven
     * towards the hull surface velocity plus `holdRelative`, i.e. they move
     * along the drifting boat instead of chasing it.
     */
    hold: number;
    readonly holdAnchorVel: Vec3;
    readonly holdRelative: Vec3;
    private readonly sample;
    readonly waterVel: Vec3;
    constructor(spec?: Partial<SwimmerSpec>);
    get invMass(): number;
    get volumeM3(): number;
    place(position: Vec3, velocity: Vec3): void;
    /**
     * Submerged volume fraction for a COM `depth` (m, positive below the
     * surface) and the current verticality.
     */
    submergedFraction(depth: number): number;
    /** Force hook: buoyancy, drag and thrust for this sub-step. */
    computeForces(water: WaterQuery, dt: number): void;
    /** Pre-solve: symplectic prediction. */
    predict(dt: number): void;
    /** Post-solve: velocity from the constrained displacement. */
    finish(dt: number): void;
}
/** Minimal shape of the legacy rigid body used by the constraints below. */
export interface XpbdBody {
    pos: Vec3;
    kinematic: boolean;
    localToWorld(local: Vec3, out: any): any;
    genInvMass(r: any, n: any): number;
    applyCorrection(correction: any, r: any): void;
}
/**
 * Tension-only rope from a swimmer to a hull point (body frame). Solved in the
 * legacy XPBD constraint loop; reaction corrections act on the hull.
 */
export declare class HullGripConstraint {
    readonly body: XpbdBody;
    readonly swimmer: SwimmerBody;
    enabled: boolean;
    lambda: number;
    tension: number;
    length: number;
    compliance: number;
    readonly local: Vec3;
    private readonly anchor;
    private readonly lever;
    private readonly normal;
    private readonly correction;
    constructor(body: XpbdBody, swimmer: SwimmerBody, local: Vec3, length: number, compliance: number, Vec3Ctor: any);
    setLocal(local: Vec3): void;
    solve(dt: number): void;
}
/**
 * Unilateral contact between the swimmer (sphere) and the hull, using the
 * analytic hull signed distance in the design frame.
 */
export declare class HullContactConstraint {
    readonly body: XpbdBody & {
        quat: any;
    };
    readonly swimmer: SwimmerBody;
    readonly toDesign: (world: Vec3, out: Vec3) => Vec3;
    readonly designNormalToWorld: (n: Vec3, out: Vec3) => Vec3;
    readonly signedDistance: (x: number, y: number, z: number) => number;
    enabled: boolean;
    lambda: number;
    contactDepth: number;
    /** Largest separation per sub-step (m): ≈ 5.8 m/s at 720 Hz. */
    maxPushPerSubstepM: number;
    private readonly world;
    private readonly lever;
    private readonly normal;
    private readonly correction;
    constructor(body: XpbdBody & {
        quat: any;
    }, swimmer: SwimmerBody, toDesign: (world: Vec3, out: Vec3) => Vec3, designNormalToWorld: (n: Vec3, out: Vec3) => Vec3, signedDistance: (x: number, y: number, z: number) => number, Vec3Ctor: any);
    private readonly d;
    private readonly n;
    private readonly nw;
    solve(): void;
}
/** Swimmer vs. spar (mast/boom) capsule contact on legacy XPBD particles. */
export declare class SparContactConstraint {
    readonly swimmer: SwimmerBody;
    readonly nodes: Array<{
        x: Vec3;
        w: number;
    }>;
    readonly radiusM: number;
    enabled: boolean;
    lambda: number;
    constructor(swimmer: SwimmerBody, nodes: Array<{
        x: Vec3;
        w: number;
    }>, radiusM: number);
    solve(): void;
}
export declare function smoothstep(a: number, b: number, x: number): number;
//# sourceMappingURL=SwimmerBody.d.ts.map