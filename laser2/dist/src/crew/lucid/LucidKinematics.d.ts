import type { LucidAsset, SemanticDof, HandDof } from './LucidAsset.js';
export type M3 = Float64Array;
export declare const m3: () => M3;
export declare function m3Identity(o: M3): M3;
export declare function m3Mul(a: M3, b: M3, o: M3): M3;
/** o = aᵀ·b */
export declare function m3MulTN(a: M3, b: M3, o: M3): M3;
export declare function m3Copy(a: M3, o: M3): M3;
export declare function m3AxisAngle(ax: number, ay: number, az: number, rad: number, o: M3): M3;
export declare function m3ApplyVec(m: M3, x: number, y: number, z: number, out: Float64Array, o?: number): void;
/** Rotation vector (axis × angle) of R. */
export declare function m3Log(R: M3, out: Float64Array): void;
/** Frame (columns: d, h⊥d, d×h) mapped: returns R with R·d0 = d and R·h0 ≈ h. */
export declare function m3FromTwoFrames(d0: ArrayLike<number>, h0: ArrayLike<number>, d: ArrayLike<number>, h: ArrayLike<number>, o: M3): M3;
interface JointDof {
    kind: 'semantic' | 'hand';
    index: number;
    axis: [number, number, number];
    min: number;
    max: number;
    sign: number;
}
/** Semantic51 body: DOF table, local rotations, forward kinematics. */
export declare class Semantic51Body {
    readonly asset: LucidAsset;
    readonly n: number;
    readonly parents: Int32Array;
    readonly B: Float64Array;
    readonly dofs: SemanticDof[];
    readonly hand: HandDof[];
    /** Per joint: ordered DOFs applied as Rl = R1·R2·… (compiler order). */
    readonly jointDofs: JointDof[][];
    readonly order: Int32Array;
    readonly joint: Map<string, number>;
    constructor(asset: LucidAsset);
    /** Composes the local rotation of joint j from its DOF angles (degrees). */
    composeLocal(j: number, sem: Float64Array, hand: Float64Array, out: M3): M3;
    /**
     * Chooses the DOF angles of joint j whose composed rotation is closest to
     * `target` (Gauss–Newton on the rotation-vector residual), clamped to the
     * hard ranges. `sem`/`hand` hold the previous angles (warm start) and
     * receive the result.
     */
    solveLocal(j: number, target: M3, sem: Float64Array, hand: Float64Array, iterations?: number): void;
    /** Forward kinematics in H-space from local rotations; then world placement. */
    forward(Rl: Float64Array, Rw: M3, root: ArrayLike<number>, P: Float64Array, G: Float64Array): void;
}
/**
 * Canonical female-skin-v4.2 helper rules: joint pose (P, G) → 78 rigid
 * cluster transforms x' = D·x + T (drivers.py `_canonical`).
 */
export declare class CanonicalClusterDrivers {
    readonly body: Semantic51Body;
    readonly nc: number;
    /** Output: D (nc×9, row-major) and T (nc×3). */
    readonly D: Float64Array;
    readonly T: Float64Array;
    private readonly rules;
    private P;
    private G;
    private twist;
    private readonly piv;
    private readonly Brest;
    private readonly tmp;
    private readonly tmp2;
    private readonly tmpV;
    constructor(body: Semantic51Body);
    /**
     * D = R; pivot image p = P[anchor] (+ M·(bp − B[anchor]) with M = G[anchor]
     * or M = R); T = p − D·bp.
     */
    private set;
    /** slerpM(G[a], G[b], t): D = G[a]·exp(t·log(G[a]ᵀG[b])); pivot from joint `anchor`. */
    private setSlerp;
    /** Evaluates all 78 cluster transforms for a world pose. twistDeg: physical forearm twist [L, R]. */
    evaluate(P: Float64Array, G: Float64Array, twistDeg: [number, number]): void;
}
export {};
//# sourceMappingURL=LucidKinematics.d.ts.map