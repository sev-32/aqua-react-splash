import type { LucidAsset } from './LucidAsset.js';
import { Semantic51Body } from './LucidKinematics.js';
export interface LegacyJoints {
    [name: string]: {
        x: number;
        y: number;
        z: number;
    } | undefined;
}
export interface GripState {
    curl: number;
    spread: number;
    thumb: number;
}
type V = Float64Array;
export declare class LucidRetarget {
    readonly asset: LucidAsset;
    readonly body: Semantic51Body;
    /** Lawful angles (degrees), warm-started frame to frame. */
    readonly sem: Float64Array;
    readonly hand: Float64Array;
    readonly Rl: Float64Array;
    /** Output world (design-frame) pose. */
    readonly P: Float64Array;
    readonly G: Float64Array;
    readonly twist: [number, number];
    private readonly Rw;
    private readonly root;
    /** Rest data in the design-rest orientation (Y180 applied). */
    private readonly Bd;
    private readonly J;
    private readonly GH;
    private readonly PH;
    private readonly elbowFlex;
    private readonly kneeFlex;
    readonly segLen: Record<string, number>;
    readonly clampEvents: {
        count: number;
    };
    constructor(asset: LucidAsset);
    /** Rest joint position in the design-rest orientation. */
    rest(name: string, o?: V): V;
    /** Legacy body dimensions matching her skeleton (for the legacy crew IK). */
    legacyDims(): Record<string, number>;
    private readonly t0;
    private readonly t1;
    private readonly t2;
    private readonly t3;
    private readonly t4;
    private readonly t5;
    private readonly t6;
    private readonly t7;
    private readonly Mt;
    private readonly Mg;
    private readonly Ml;
    /** Target design-frame rotation of a segment: rest (d0, h0) → current (d, h). */
    private target;
    /** Solves joint j to world target Gd (design frame, relative to design rest). */
    private solveJoint;
    /** Updates GH/PH of joint j from its parent (H-space FK, pelvis at rest). */
    private propagate;
    /** Design-frame position of joint j under the current partial solve. */
    private world;
    private readonly angleIndex;
    private setAngle;
    /** Delta of a legacy segment from its own rest, applied to her rest (neutral in → neutral out). */
    private delta;
    /**
     * The legacy crew skeleton at rest, built with her dimensions through the
     * legacy pose formulas (pelvis, spine at 0.42·torso, chest, neck at
     * 0.9·neck leaning 0.04 back, head 0.115 beyond, shoulders at half shY,
     * hips 2 cm below the pelvis), in the design frame. Deltas are taken
     * against this so a legacy rest pose maps to her rest pose.
     */
    private legacyRestCache;
    legacyRest(): Record<string, V>;
    private ikDofs;
    private ikJoints;
    private readonly ikRef;
    private readonly ikW;
    private readonly ikJ;
    private readonly ikR;
    private readonly ikA;
    private readonly ikG;
    private readonly ikTarget;
    private setupIk;
    private fkUpper;
    /** Residual: wrist and elbow targets (m) and DOF regularisation (sqrt-weighted, deg). */
    private ikResidual;
    private solveUpperIk;
    /**
     * Solves the full pose from the legacy joint set `L` (design frame), the
     * head's forward direction and the grip per hand.
     */
    solve(L: LegacyJoints, look: ArrayLike<number> | null, grip: [GripState, GripState]): void;
    private gripIndex;
    private applyGrip;
}
export {};
//# sourceMappingURL=LucidRetarget.d.ts.map