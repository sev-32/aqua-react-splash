// Sparse LDLᵀ factorisation for small symmetric positive-definite systems with
// a fixed sparsity pattern (the rig's constraint-space matrix J·W·Jᵀ + α̃).
//
// The pattern is analysed once: a greedy minimum-degree ordering keeps the
// fill low for the chain-with-loops structure of a stayed rig, the fill
// pattern of L is computed symbolically, and every update term of the numeric
// factorisation is precompiled into a flat schedule. Each numeric
// factorisation or solve is then a few tight loops over typed arrays with no
// allocation.

export class SparseLDL {
  readonly n: number;
  /** perm[k] = original index eliminated k-th; iperm is its inverse. */
  readonly perm: Int32Array;
  readonly iperm: Int32Array;
  /** Row-compressed strictly-lower pattern of L (permuted indices). */
  private readonly rowStart: Int32Array;
  private readonly rowCol: Int32Array;
  private readonly L: Float64Array;
  private readonly D: Float64Array;
  /** Update schedule: for L entry q, triples (qIm, qJm, m) in [schedStart[q], schedStart[q+1]). */
  private readonly schedStart: Int32Array;
  private readonly sched: Int32Array;
  /** For every entry of A given to the constructor: target slot. */
  private readonly entrySlot: Int32Array;
  /** Dense-in-pattern values of A: diagonal in adiag, off-diagonal aligned with L. */
  private readonly adiag: Float64Array;
  private readonly aoff: Float64Array;
  private readonly work: Float64Array;
  /** Number of non-positive pivots clamped in the last factorisation. */
  clampedPivots = 0;

  /**
   * @param n system size
   * @param entries flat list of (i, j) index pairs of the non-zeros of A,
   *   i ≥ j (diagonal entries included). `factor(values)` takes the values in
   *   this order.
   */
  constructor(n: number, entries: ArrayLike<number>) {
    this.n = n;
    const pairs = entries.length / 2;
    // Adjacency of A (off-diagonal).
    const adj: Array<Set<number>> = Array.from({ length: n }, () => new Set<number>());
    for (let e = 0; e < pairs; e++) {
      const i = entries[2 * e]!, j = entries[2 * e + 1]!;
      if (i !== j) { adj[i]!.add(j); adj[j]!.add(i); }
    }
    // Greedy minimum-degree ordering on the elimination graph.
    const perm = new Int32Array(n);
    const iperm = new Int32Array(n);
    const alive = new Uint8Array(n).fill(1);
    const g: Array<Set<number>> = adj.map((s) => new Set(s));
    for (let k = 0; k < n; k++) {
      let best = -1, bestDeg = Infinity;
      for (let v = 0; v < n; v++) {
        if (!alive[v]) continue;
        const d = g[v]!.size;
        if (d < bestDeg) { bestDeg = d; best = v; }
      }
      perm[k] = best;
      iperm[best] = k;
      alive[best] = 0;
      const nb = [...g[best]!];
      for (const a of nb) {
        g[a]!.delete(best);
        for (const b of nb) if (a !== b) g[a]!.add(b);
      }
      g[best]!.clear();
    }
    this.perm = perm;
    this.iperm = iperm;
    // Symbolic factorisation in permuted indices.
    const lower: Array<Set<number>> = Array.from({ length: n }, () => new Set<number>());
    for (let v = 0; v < n; v++) {
      for (const u of adj[v]!) {
        const pi = iperm[v]!, pj = iperm[u]!;
        if (pi > pj) lower[pi]!.add(pj);
      }
    }
    // Column lists grow as fill is discovered; process columns in order.
    const colRows: Array<Set<number>> = Array.from({ length: n }, () => new Set<number>());
    for (let i = 0; i < n; i++) for (const j of lower[i]!) colRows[j]!.add(i);
    for (let k = 0; k < n; k++) {
      const rows = [...colRows[k]!].sort((a, b) => a - b);
      for (let x = 0; x < rows.length; x++) {
        for (let y = 0; y < x; y++) {
          const i = rows[x]!, j = rows[y]!; // i > j > k
          if (!lower[i]!.has(j)) { lower[i]!.add(j); colRows[j]!.add(i); }
        }
      }
    }
    const rowStart = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) rowStart[i + 1] = rowStart[i]! + lower[i]!.size;
    const nnz = rowStart[n]!;
    const rowCol = new Int32Array(nnz);
    const slotOf = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const cols = [...lower[i]!].sort((a, b) => a - b);
      cols.forEach((c, k) => { rowCol[rowStart[i]! + k] = c; slotOf.set(i * n + c, rowStart[i]! + k); });
    }
    this.rowStart = rowStart;
    this.rowCol = rowCol;
    this.L = new Float64Array(nnz);
    this.D = new Float64Array(n);
    this.adiag = new Float64Array(n);
    this.aoff = new Float64Array(nnz);
    this.work = new Float64Array(n);
    // Schedule: L[i][j] -= Σ_{m<j} L[i][m]·D[m]·L[j][m] over m in row(i) ∩ row(j).
    const schedStart = new Int32Array(nnz + 1);
    const sched: number[] = [];
    for (let i = 0; i < n; i++) {
      const ri = new Map<number, number>();
      for (let q = rowStart[i]!; q < rowStart[i + 1]!; q++) ri.set(rowCol[q]!, q);
      for (let q = rowStart[i]!; q < rowStart[i + 1]!; q++) {
        const j = rowCol[q]!;
        schedStart[q] = sched.length / 3;
        for (let r = rowStart[j]!; r < rowStart[j + 1]!; r++) {
          const m = rowCol[r]!;
          const qim = ri.get(m);
          if (qim !== undefined) sched.push(qim, r, m);
        }
      }
    }
    schedStart[nnz] = sched.length / 3;
    this.schedStart = schedStart;
    this.sched = Int32Array.from(sched);
    // Map every A entry to its slot (negative = diagonal).
    this.entrySlot = new Int32Array(pairs);
    for (let e = 0; e < pairs; e++) {
      const pi = iperm[entries[2 * e]!]!, pj = iperm[entries[2 * e + 1]!]!;
      if (pi === pj) this.entrySlot[e] = -1 - pi;
      else {
        const hi = Math.max(pi, pj), lo = Math.min(pi, pj);
        const slot = slotOf.get(hi * n + lo);
        if (slot === undefined) throw new Error('SparseLDL: entry outside symbolic pattern');
        this.entrySlot[e] = slot;
      }
    }
  }

  get nonZeros(): number { return this.L.length; }
  get scheduleLength(): number { return this.sched.length / 3; }

  /** Numeric factorisation of A given its entry values (constructor order). */
  factor(values: ArrayLike<number>): void {
    const { n, adiag, aoff, entrySlot, rowStart, rowCol, L, D, schedStart, sched } = this;
    adiag.fill(0);
    aoff.fill(0);
    for (let e = 0; e < entrySlot.length; e++) {
      const s = entrySlot[e]!;
      if (s < 0) adiag[-1 - s] = adiag[-1 - s]! + values[e]!;
      else aoff[s] = aoff[s]! + values[e]!;
    }
    this.clampedPivots = 0;
    for (let i = 0; i < n; i++) {
      let d = adiag[i]!;
      const end = rowStart[i + 1]!;
      for (let q = rowStart[i]!; q < end; q++) {
        const j = rowCol[q]!;
        let s = aoff[q]!;
        const se = schedStart[q + 1]!;
        for (let t = schedStart[q]!; t < se; t++) {
          const b = 3 * t;
          s -= L[sched[b]!]! * L[sched[b + 1]!]! * D[sched[b + 2]!]!;
        }
        const l = s / D[j]!;
        L[q] = l;
        d -= l * l * D[j]!;
      }
      const floor = 1e-12 * Math.max(1e-30, adiag[i]!);
      if (!(d > floor)) { d = Math.max(floor, 1e-30); this.clampedPivots++; }
      D[i] = d;
    }
  }

  /** Solves A·x = b (original indexing). b and x may alias. */
  solve(b: ArrayLike<number>, x: Float64Array): void {
    const { n, perm, rowStart, rowCol, L, D, work: y } = this;
    for (let k = 0; k < n; k++) y[k] = b[perm[k]!]!;
    for (let i = 0; i < n; i++) {
      let s = y[i]!;
      for (let q = rowStart[i]!; q < rowStart[i + 1]!; q++) s -= L[q]! * y[rowCol[q]!]!;
      y[i] = s;
    }
    for (let i = 0; i < n; i++) y[i] = y[i]! / D[i]!;
    for (let i = n - 1; i >= 0; i--) {
      const yi = y[i]!;
      for (let q = rowStart[i]!; q < rowStart[i + 1]!; q++) {
        const j = rowCol[q]!;
        y[j] = y[j]! - L[q]! * yi;
      }
    }
    for (let k = 0; k < n; k++) x[perm[k]!] = y[k]!;
  }
}
