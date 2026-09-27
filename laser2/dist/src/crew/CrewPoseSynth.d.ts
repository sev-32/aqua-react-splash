export interface V3 {
    x: number;
    y: number;
    z: number;
}
export declare const JOINTS: readonly ["pelvis", "spine", "chest", "neck", "head", "shoulderL", "elbowL", "wristL", "handL", "shoulderR", "elbowR", "wristR", "handR", "hipL", "kneeL", "ankleL", "toeL", "hipR", "kneeR", "ankleR", "toeR"];
export type JointName = typeof JOINTS[number];
export type Skeleton = Record<JointName, V3>;
export interface BodyDims {
    torso: number;
    neck: number;
    shoulderX: number;
    shoulderY: number;
    hipX: number;
    upperArm: number;
    foreArm: number;
    hand: number;
    thigh: number;
    shin: number;
    ankleH: number;
    footLen: number;
    headR: number;
}
export interface TorsoFrame {
    pelvis: V3;
    /** Unit axis from pelvis to chest. */
    up: V3;
    /** Unit direction the chest faces (orthogonalised against up). */
    forward: V3;
    /** Unit direction the head looks. */
    look: V3;
}
export interface LimbTargets {
    handL: V3;
    handR: V3;
    footL: V3;
    footR: V3;
    /** Pole directions (where elbows/knees point). */
    elbowPoleL: V3;
    elbowPoleR: V3;
    kneePoleL: V3;
    kneePoleR: V3;
    /** Foot pointing direction (toe). */
    toeDirL: V3;
    toeDirR: V3;
}
export declare const v3: (x?: number, y?: number, z?: number) => V3;
export declare const add: (a: V3, b: V3) => V3;
export declare const sub: (a: V3, b: V3) => V3;
export declare const scale: (a: V3, s: number) => V3;
export declare const madd: (a: V3, b: V3, s: number) => V3;
export declare const dot: (a: V3, b: V3) => number;
export declare const cross: (a: V3, b: V3) => V3;
export declare const length: (a: V3) => number;
export declare const normalize: (a: V3, fallback?: V3) => V3;
export declare const lerp3: (a: V3, b: V3, t: number) => V3;
export declare const rotateAbout: (v: V3, axis: V3, angle: number) => V3;
export declare const smooth: (t: number) => number;
export declare function dimsFromLegacy(actor: any): BodyDims;
/** Two-bone IK: returns the middle joint; `end` is clamped to reachable range. */
export declare function solveTwoBone(root: V3, target: V3, l1: number, l2: number, pole: V3): {
    mid: V3;
    end: V3;
};
export declare function buildSkeleton(frame: TorsoFrame, limbs: LimbTargets, dims: BodyDims): Skeleton;
/** Mass-weighted COM of a skeleton (segment fractions from the legacy biomech model). */
export declare function skeletonCom(s: Skeleton): V3;
export interface SwimPoseInput {
    com: V3;
    heading: V3;
    surfaceY: number;
    t: number;
    /** 0 prone breaststroke … 1 upright treading. */
    verticality: number;
    /** Stroke phase (cycles). */
    phase: number;
    dims: BodyDims;
}
/** Breaststroke blended with treading water by verticality. */
export declare function swimPose(input: SwimPoseInput): {
    frame: TorsoFrame;
    limbs: LimbTargets;
};
export interface FallPoseInput {
    com: V3;
    velocity: V3;
    /** Horizontal direction away from the boat. */
    away: V3;
    t: number;
    dims: BodyDims;
}
/** Tumbling fall: body tilting backwards away from the boat, arms reaching. */
export declare function fallPose(input: FallPoseInput): {
    frame: TorsoFrame;
    limbs: LimbTargets;
};
export interface HangPoseInput {
    /** Grip point (world) — both hands. */
    grip: V3;
    com: V3;
    /** Horizontal direction from the swimmer towards the hull. */
    towardHull: V3;
    t: number;
    /** 0 hanging at arm's length … 1 chest pulled up to the grip. */
    pull: number;
    dims: BodyDims;
}
/** Hanging from the centreboard tip (or gunwale), body in the water. */
export declare function hangPose(input: HangPoseInput): {
    frame: TorsoFrame;
    limbs: LimbTargets;
};
export interface BoardStandPoseInput {
    /** Feet placement on the board near the hull (world). */
    feet: V3;
    /** Hand grip (gunwale lip / jib sheet) (world). */
    grip: V3;
    /** Unit vector along the board, pointing away from the hull. */
    boardOut: V3;
    /** Lean-back angle (rad) from vertical, away from the hull. */
    lean: number;
    /** 0 kneeling on the board → 1 standing. */
    stand: number;
    /** Horizontal-ish axis along the hull (character stands side-on to it). */
    hullAxis: V3;
    t: number;
    dims: BodyDims;
}
/**
 * Standing (or kneeling) on the centreboard, facing the hull, leaning back on
 * straight arms. Returns the pose; the COM follows from the skeleton.
 */
export declare function boardStandPose(input: BoardStandPoseInput): {
    frame: TorsoFrame;
    limbs: LimbTargets;
};
export interface ClimbInPoseInput {
    /** Gunwale grip (world). */
    gunwale: V3;
    /** Target seated point inside the cockpit (world). */
    seat: V3;
    /** Horizontal direction from outside the hull towards the cockpit. */
    inward: V3;
    /** 0 hanging outside … 1 inside. */
    progress: number;
    surfaceY: number;
    t: number;
    dims: BodyDims;
}
/** Hauling over the gunwale: chest over the side deck, leg swung in, roll in. */
export declare function climbInPose(input: ClimbInPoseInput): {
    frame: TorsoFrame;
    limbs: LimbTargets;
    com: V3;
};
export interface ScoopPoseInput {
    strap: V3;
    com: V3;
    /** Direction along the hull towards the bow (crew floats facing forward). */
    bow: V3;
    t: number;
    dims: BodyDims;
}
/** Floating on the back/side inside the flooded cockpit, one hand on the toe strap. */
export declare function scoopFloatPose(input: ScoopPoseInput): {
    frame: TorsoFrame;
    limbs: LimbTargets;
};
//# sourceMappingURL=CrewPoseSynth.d.ts.map