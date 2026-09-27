export declare class SparseLDL {
    readonly n: number;
    /** perm[k] = original index eliminated k-th; iperm is its inverse. */
    readonly perm: Int32Array;
    readonly iperm: Int32Array;
    /** Row-compressed strictly-lower pattern of L (permuted indices). */
    private readonly rowStart;
    private readonly rowCol;
    private readonly L;
    private readonly D;
    /** Update schedule: for L entry q, triples (qIm, qJm, m) in [schedStart[q], schedStart[q+1]). */
    private readonly schedStart;
    private readonly sched;
    /** For every entry of A given to the constructor: target slot. */
    private readonly entrySlot;
    /** Dense-in-pattern values of A: diagonal in adiag, off-diagonal aligned with L. */
    private readonly adiag;
    private readonly aoff;
    private readonly work;
    /** Number of non-positive pivots clamped in the last factorisation. */
    clampedPivots: number;
    /**
     * @param n system size
     * @param entries flat list of (i, j) index pairs of the non-zeros of A,
     *   i ≥ j (diagonal entries included). `factor(values)` takes the values in
     *   this order.
     */
    constructor(n: number, entries: ArrayLike<number>);
    get nonZeros(): number;
    get scheduleLength(): number;
    /** Numeric factorisation of A given its entry values (constructor order). */
    factor(values: ArrayLike<number>): void;
    /** Solves A·x = b (original indexing). b and x may alias. */
    solve(b: ArrayLike<number>, x: Float64Array): void;
}
//# sourceMappingURL=SparseLDL.d.ts.map