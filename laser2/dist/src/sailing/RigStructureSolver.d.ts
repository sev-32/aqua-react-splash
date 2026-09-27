type LegacyVec = {
    x: number;
    y: number;
    z: number;
    [k: string]: any;
};
interface Particle {
    x: LegacyVec;
    v: LegacyVec;
    f: LegacyVec;
    w: number;
}
interface RigidBody {
    pos: LegacyVec;
    quat: any;
    kinematic?: boolean;
    localToWorld(local: LegacyVec, out: LegacyVec): LegacyVec;
    genInvMass(lever: LegacyVec, direction: LegacyVec): number;
    applyCorrection(correction: LegacyVec, lever: LegacyVec): void;
}
interface Endpoint {
    kind: number;
    a: number;
    b: number;
    t: number;
    /** Segment endpoints: offset aft of the spar axis (m), e.g. a gooseneck fitting. */
    off: number;
    local: LegacyVec | null;
    /** Entry slots in the owning row (node a, node b). */
    sa: number;
    sb: number;
}
export interface RigRowSpec {
    label: string;
    group: string;
    type: number;
    a?: Endpoint;
    b?: Endpoint;
    s?: Endpoint;
    axis?: number;
    /** Bend: node indices and rest segment lengths; plane 0 = side, 1 = fore-aft. */
    n?: [number, number, number];
    l1?: number;
    l2?: number;
    plane?: number;
    /** Bend reference: 0 = body x (mast: side/fore planes), 1 = body y (boom: vertical/lateral planes). */
    ref?: number;
    /** Bracket: side index (0 port, 1 starboard) and the mast index below the station. */
    side?: number;
    station?: Endpoint;
    mastIndex?: number;
    uni?: number;
    refresh?: (row: RigRow) => void;
    source?: any;
}
export interface RigRow extends RigRowSpec {
    rest: number;
    alpha: number;
    target: number;
    uni: number;
    lambda: number;
    C: number;
    active: boolean;
    ne: number;
    node: Int32Array;
    g: Float64Array;
    hasBody: boolean;
    gB: Float64Array;
    lever: Float64Array;
    bodyW: number;
    tensionN: number;
    /** Tension it carried at the end of the previous sub-step (N). */
    prevTensionN: number;
}
export interface RigStructureParams {
    enabled: boolean;
    boomEiVerticalNm2: number;
    boomEiLateralNm2: number;
    /**
     * Solve the block on every n-th Gauss–Seidel iteration, aligned so the last
     * iteration of each sub-step always includes it (2: iterations 2, 4, 6 of 6).
     */
    solveEvery: number;
    /**
     * Stretch (m) at which a slack tension-only member is taken into the block
     * in the middle of a sub-step; below it the member waits for the next
     * sub-step's factorisation (the block is refactorised once per sub-step
     * anyway, as its gradients follow the geometry).
     */
    lateActivationM: number;
}
export declare class RigStructureSolver {
    readonly body: RigidBody;
    readonly params: RigStructureParams;
    readonly nodes: Particle[];
    readonly rows: RigRow[];
    /** Constraint-object interface for the legacy world. */
    lambda: number;
    enabled: boolean;
    readonly label = "rig-structure-direct";
    private readonly nodeIndex;
    private ldl;
    private terms;
    private termEntry;
    private termR1;
    private termS1;
    private termR2;
    private termS2;
    private termNode;
    private diagEntry;
    private values;
    private rhs;
    private dl;
    private needFactor;
    private iteration;
    private solvedThisSubstep;
    private dt;
    private readonly tmpA;
    private readonly tmpB;
    private readonly tmpDir;
    private readonly tmpLever;
    private readonly tmpCorr;
    readonly stats: {
        factorizations: number;
        solves: number;
        activeSetChanges: number;
        slackClamps: number;
        clampedPivots: number;
        lastSolveUs: number;
        lastFactorUs: number;
        maxResidualM: number;
    };
    constructor(body: RigidBody, Vec3: new (x?: number, y?: number, z?: number) => LegacyVec);
    addNode(p: Particle): number;
    indexOf(p: Particle): number;
    static node(i: number): Endpoint;
    static seg(a: number, b: number, t: number, aftOffset?: number): Endpoint;
    static bodyPoint(local: LegacyVec): Endpoint;
    addRow(spec: RigRowSpec & {
        rest?: number;
        alpha?: number;
        target?: number;
    }): RigRow;
    /** Symbolic analysis; call after all rows are added. */
    finalize(): void;
    get matrixStats(): {
        rows: number;
        nodes: number;
        entries: number;
        lNonZeros: number;
        schedule: number;
        terms: number;
    };
    /** Frame for bends/brackets: body side and fore axes made normal to the tangent. */
    private sideFore;
    private readonly frame;
    private readonly pA;
    private readonly pB;
    private readonly pS;
    private position;
    private grad;
    private evaluate;
    mastCount: number;
    private beginSubstep;
    private factor;
    /** XPBD constraint entry point (called once per Gauss–Seidel iteration). */
    solve(dt: number): void;
}
export declare const RigRowType: {
    readonly DIST: 0;
    readonly PULLEY: 1;
    readonly AXIS: 2;
    readonly BEND: 3;
    readonly BRACKET: 4;
};
export {};
//# sourceMappingURL=RigStructureSolver.d.ts.map