// Direct solver for the rig's load-bearing structure.
//
// The legacy rig solves every constraint with Gauss–Seidel XPBD (12 sub-steps ×
// 6 iterations). That converges well for sailcloth and ropes but not for the
// mast: a 24-node beam hanging between a hull pin, two routed shrouds over
// spreaders, diamonds and the jib halyard/luff wire. Stiffness propagates one
// node per iteration, so the solved mast is several times softer than its EI
// (a 100 N masthead load bent it 0.73 m instead of about 0.1 m), the
// pretension never builds (shrouds read 0–75 N instead of 450 N) and the jib
// luff sags. Sail twist, pointing and rig feel all follow from that.
//
// Here the structural members are gathered into one XPBD block and solved
// exactly each iteration with a sparse LDLᵀ factorisation of J·W·Jᵀ + α̃:
//
//   mast      24 nodes: foot pin, axial stretch, two-plane Euler–Bernoulli
//             bending (V16 EI profile, sleeve joint included);
//   spreaders two tips held by V17.2's three-axis sockets;
//   shrouds   V17.2 routed chainplate → spreader tip → hounds cables
//             (tension-only, pretension from the V16/V17.2 tune);
//   diamonds, safety forestay, jib halyard over its sheave (tension-only);
//   jib luff  the wire along the jib's luff and its tack shackle;
//   boom      5 nodes: gooseneck, stretch, bending; the vang (tension-only).
//
// Everything else (sails, sheets, contacts, crew) stays in the Gauss–Seidel
// loop, which now sees a structure that behaves like the real one.
// Tension-only members use a lagged active set; the factorisation is reused
// for all iterations of a sub-step and refreshed when the set changes.
// The hull is an external rigid body: its generalised inverse mass enters the
// diagonal and its share of every correction is applied as an impulse.
import { SparseLDL } from './SparseLDL.js';
const EP_NODE = 0, EP_SEG = 1, EP_BODY = 2;
const RT_DIST = 0, RT_PULLEY = 1, RT_AXIS = 2, RT_BEND = 3, RT_BRACKET = 4;
const MAX_ENTRIES = 6;
export class RigStructureSolver {
    body;
    params = {
        enabled: true,
        boomEiVerticalNm2: 9000,
        boomEiLateralNm2: 9000,
        solveEvery: 2,
        lateActivationM: 1e-4,
    };
    nodes = [];
    rows = [];
    /** Constraint-object interface for the legacy world. */
    lambda = 0;
    enabled = true;
    label = 'rig-structure-direct';
    nodeIndex = new Map();
    ldl = null;
    terms = [];
    termEntry = new Int32Array(0);
    termR1 = new Int32Array(0);
    termS1 = new Int32Array(0);
    termR2 = new Int32Array(0);
    termS2 = new Int32Array(0);
    termNode = new Int32Array(0);
    diagEntry = new Int32Array(0);
    values = new Float64Array(0);
    rhs = new Float64Array(0);
    dl = new Float64Array(0);
    needFactor = true;
    iteration = 0;
    solvedThisSubstep = 0;
    dt = 1 / 720;
    tmpA;
    tmpB;
    tmpDir;
    tmpLever;
    tmpCorr;
    stats = {
        factorizations: 0,
        solves: 0,
        activeSetChanges: 0,
        slackClamps: 0,
        clampedPivots: 0,
        lastSolveUs: 0,
        lastFactorUs: 0,
        maxResidualM: 0,
    };
    constructor(body, Vec3) {
        this.body = body;
        this.tmpA = new Vec3();
        this.tmpB = new Vec3();
        this.tmpDir = new Vec3();
        this.tmpLever = new Vec3();
        this.tmpCorr = new Vec3();
    }
    // ------------------------------------------------------------------ build
    addNode(p) {
        const known = this.nodeIndex.get(p);
        if (known !== undefined)
            return known;
        const i = this.nodes.length;
        this.nodes.push(p);
        this.nodeIndex.set(p, i);
        return i;
    }
    indexOf(p) {
        const i = this.nodeIndex.get(p);
        if (i === undefined)
            throw new Error('rig structure: particle is not a block node');
        return i;
    }
    static node(i) { return { kind: EP_NODE, a: i, b: i, t: 0, off: 0, local: null, sa: -1, sb: -1 }; }
    static seg(a, b, t, aftOffset = 0) { return { kind: EP_SEG, a, b, t, off: aftOffset, local: null, sa: -1, sb: -1 }; }
    static bodyPoint(local) { return { kind: EP_BODY, a: -1, b: -1, t: 0, off: 0, local, sa: -1, sb: -1 }; }
    addRow(spec) {
        const row = {
            ...spec,
            rest: spec.rest ?? 0,
            alpha: spec.alpha ?? 0,
            target: spec.target ?? 0,
            uni: spec.uni ?? 0,
            lambda: 0,
            C: 0,
            active: true,
            ne: 0,
            node: new Int32Array(MAX_ENTRIES).fill(-1),
            g: new Float64Array(MAX_ENTRIES * 3),
            hasBody: false,
            gB: new Float64Array(3),
            lever: new Float64Array(3),
            bodyW: 0,
            tensionN: 0,
            prevTensionN: 0,
        };
        const slot = (node) => {
            for (let k = 0; k < row.ne; k++)
                if (row.node[k] === node)
                    return k;
            if (row.ne >= MAX_ENTRIES)
                throw new Error(`rig structure: row ${row.label} has too many entries`);
            row.node[row.ne] = node;
            return row.ne++;
        };
        const bind = (ep) => {
            if (!ep)
                return;
            if (ep.kind === EP_BODY) {
                row.hasBody = true;
                return;
            }
            ep.sa = slot(ep.a);
            ep.sb = ep.kind === EP_SEG ? slot(ep.b) : ep.sa;
        };
        if (row.type === RT_BEND) {
            for (const n of row.n)
                slot(n);
        }
        else if (row.type === RT_BRACKET) {
            bind(row.a);
            bind(row.station);
        }
        else {
            bind(row.a);
            bind(row.s);
            bind(row.b);
        }
        this.rows.push(row);
        return row;
    }
    /** Symbolic analysis; call after all rows are added. */
    finalize() {
        const nr = this.rows.length;
        const byNode = this.nodes.map(() => []);
        this.rows.forEach((row, r) => {
            for (let k = 0; k < row.ne; k++)
                byNode[row.node[k]].push([r, k]);
        });
        const entryOf = new Map();
        const pairs = [];
        const entry = (i, j) => {
            const hi = Math.max(i, j), lo = Math.min(i, j);
            const key = hi * nr + lo;
            let e = entryOf.get(key);
            if (e === undefined) {
                e = pairs.length / 2;
                entryOf.set(key, e);
                pairs.push(hi, lo);
            }
            return e;
        };
        const diag = new Int32Array(nr);
        for (let r = 0; r < nr; r++)
            diag[r] = entry(r, r);
        const terms = [];
        byNode.forEach((list, node) => {
            for (let x = 0; x < list.length; x++) {
                for (let y = 0; y <= x; y++) {
                    const [r1, s1] = list[x];
                    const [r2, s2] = list[y];
                    terms.push({ entry: entry(r1, r2), r1, s1, r2, s2, node });
                }
            }
        });
        this.terms = terms;
        this.termEntry = Int32Array.from(terms.map((t) => t.entry));
        this.termR1 = Int32Array.from(terms.map((t) => t.r1));
        this.termS1 = Int32Array.from(terms.map((t) => t.s1));
        this.termR2 = Int32Array.from(terms.map((t) => t.r2));
        this.termS2 = Int32Array.from(terms.map((t) => t.s2));
        this.termNode = Int32Array.from(terms.map((t) => t.node));
        this.diagEntry = diag;
        this.values = new Float64Array(pairs.length / 2);
        this.rhs = new Float64Array(nr);
        this.dl = new Float64Array(nr);
        this.ldl = new SparseLDL(nr, pairs);
        this.needFactor = true;
    }
    get matrixStats() {
        return {
            rows: this.rows.length,
            nodes: this.nodes.length,
            entries: this.values.length,
            lNonZeros: this.ldl?.nonZeros ?? 0,
            schedule: this.ldl?.scheduleLength ?? 0,
            terms: this.terms.length,
        };
    }
    // --------------------------------------------------------------- evaluate
    /** Frame for bends/brackets: body side and fore axes made normal to the tangent. */
    sideFore(tx, ty, tz, out, ref = 0) {
        const q = this.body.quat;
        // Reference body axis (x for the mast, y for the boom) and body z in world space.
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
        let sx, sy, sz;
        if (ref === 1) {
            sx = 2 * (qx * qy - qw * qz);
            sy = 1 - 2 * (qx * qx + qz * qz);
            sz = 2 * (qy * qz + qw * qx);
        }
        else {
            sx = 1 - 2 * (qy * qy + qz * qz);
            sy = 2 * (qx * qy + qw * qz);
            sz = 2 * (qx * qz - qw * qy);
        }
        let fx = 2 * (qx * qz + qw * qy), fy = 2 * (qy * qz - qw * qx), fz = 1 - 2 * (qx * qx + qy * qy);
        let d = sx * tx + sy * ty + sz * tz;
        sx -= d * tx;
        sy -= d * ty;
        sz -= d * tz;
        let l = Math.hypot(sx, sy, sz);
        if (l < 1e-6) {
            sx = fx;
            sy = fy;
            sz = fz;
            d = sx * tx + sy * ty + sz * tz;
            sx -= d * tx;
            sy -= d * ty;
            sz -= d * tz;
            l = Math.hypot(sx, sy, sz);
        }
        sx /= l;
        sy /= l;
        sz /= l;
        // fore = tangent × side (right-handed, matches V16's DirectionalRodBendConstraint)
        fx = ty * sz - tz * sy;
        fy = tz * sx - tx * sz;
        fz = tx * sy - ty * sx;
        l = Math.hypot(fx, fy, fz) || 1;
        out[0] = sx;
        out[1] = sy;
        out[2] = sz;
        out[3] = fx / l;
        out[4] = fy / l;
        out[5] = fz / l;
    }
    frame = new Float64Array(6);
    pA = new Float64Array(3);
    pB = new Float64Array(3);
    pS = new Float64Array(3);
    position(ep, out, row) {
        if (ep.kind === EP_NODE) {
            const x = this.nodes[ep.a].x;
            out[0] = x.x;
            out[1] = x.y;
            out[2] = x.z;
        }
        else if (ep.kind === EP_SEG) {
            const a = this.nodes[ep.a].x, b = this.nodes[ep.b].x, t = ep.t;
            out[0] = a.x + (b.x - a.x) * t;
            out[1] = a.y + (b.y - a.y) * t;
            out[2] = a.z + (b.z - a.z) * t;
            if (ep.off !== 0) {
                // Aft of the spar axis: −(body z made normal to the segment tangent).
                let tx = b.x - a.x, ty = b.y - a.y, tz = b.z - a.z;
                const tl = Math.hypot(tx, ty, tz) || 1;
                tx /= tl;
                ty /= tl;
                tz /= tl;
                const q = this.body.quat;
                let fx = 2 * (q.x * q.z + q.w * q.y), fy = 2 * (q.y * q.z - q.w * q.x), fz = 1 - 2 * (q.x * q.x + q.y * q.y);
                const d = fx * tx + fy * ty + fz * tz;
                fx -= d * tx;
                fy -= d * ty;
                fz -= d * tz;
                const fl = Math.hypot(fx, fy, fz) || 1;
                const k = -ep.off / fl;
                out[0] += fx * k;
                out[1] += fy * k;
                out[2] += fz * k;
            }
        }
        else {
            const w = this.body.localToWorld(ep.local, this.tmpA);
            out[0] = w.x;
            out[1] = w.y;
            out[2] = w.z;
            if (row) {
                row.lever[0] = w.x - this.body.pos.x;
                row.lever[1] = w.y - this.body.pos.y;
                row.lever[2] = w.z - this.body.pos.z;
            }
        }
    }
    grad(row, ep, gx, gy, gz) {
        if (ep.kind === EP_BODY) {
            const b = row.gB;
            b[0] = b[0] + gx;
            b[1] = b[1] + gy;
            b[2] = b[2] + gz;
            return;
        }
        const g = row.g;
        if (ep.kind === EP_NODE) {
            const o = 3 * ep.sa;
            g[o] = g[o] + gx;
            g[o + 1] = g[o + 1] + gy;
            g[o + 2] = g[o + 2] + gz;
            return;
        }
        const wa = 1 - ep.t, wb = ep.t;
        let o = 3 * ep.sa;
        g[o] = g[o] + gx * wa;
        g[o + 1] = g[o + 1] + gy * wa;
        g[o + 2] = g[o + 2] + gz * wa;
        o = 3 * ep.sb;
        g[o] = g[o] + gx * wb;
        g[o + 1] = g[o + 1] + gy * wb;
        g[o + 2] = g[o + 2] + gz * wb;
    }
    evaluate(row) {
        row.g.fill(0);
        row.gB[0] = row.gB[1] = row.gB[2] = 0;
        const pA = this.pA, pB = this.pB, pS = this.pS;
        switch (row.type) {
            case RT_DIST: {
                this.position(row.a, pA, row);
                this.position(row.b, pB, row);
                let dx = pB[0] - pA[0], dy = pB[1] - pA[1], dz = pB[2] - pA[2];
                const len = Math.hypot(dx, dy, dz);
                if (len < 1e-9) {
                    row.C = 0;
                    return;
                }
                dx /= len;
                dy /= len;
                dz /= len;
                row.C = len - row.rest;
                this.grad(row, row.b, dx, dy, dz);
                this.grad(row, row.a, -dx, -dy, -dz);
                return;
            }
            case RT_PULLEY: {
                this.position(row.a, pA, row);
                this.position(row.s, pS, row);
                this.position(row.b, pB, row);
                let ax = pA[0] - pS[0], ay = pA[1] - pS[1], az = pA[2] - pS[2];
                let bx = pB[0] - pS[0], by = pB[1] - pS[1], bz = pB[2] - pS[2];
                const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz);
                if (la < 1e-9 || lb < 1e-9) {
                    row.C = 0;
                    return;
                }
                ax /= la;
                ay /= la;
                az /= la;
                bx /= lb;
                by /= lb;
                bz /= lb;
                row.C = la + lb - row.rest;
                this.grad(row, row.a, ax, ay, az);
                this.grad(row, row.b, bx, by, bz);
                this.grad(row, row.s, -(ax + bx), -(ay + by), -(az + bz));
                if (row.source) {
                    row.source.lowerSegmentM = la;
                    row.source.upperSegmentM = lb;
                }
                return;
            }
            case RT_AXIS: {
                this.position(row.a, pA, row);
                this.position(row.b, pB, row);
                const k = row.axis;
                row.C = pB[k] - pA[k] - row.target;
                const gx = k === 0 ? 1 : 0, gy = k === 1 ? 1 : 0, gz = k === 2 ? 1 : 0;
                this.grad(row, row.b, gx, gy, gz);
                this.grad(row, row.a, -gx, -gy, -gz);
                return;
            }
            case RT_BEND: {
                const [i0, i1, i2] = row.n;
                const a = this.nodes[i0].x, b = this.nodes[i1].x, c = this.nodes[i2].x;
                let tx = c.x - a.x, ty = c.y - a.y, tz = c.z - a.z;
                const tl = Math.hypot(tx, ty, tz);
                if (tl < 1e-9) {
                    row.C = 0;
                    return;
                }
                tx /= tl;
                ty /= tl;
                tz /= tl;
                this.sideFore(tx, ty, tz, this.frame, row.ref ?? 0);
                const o = row.plane === 0 ? 0 : 3;
                const ux = this.frame[o], uy = this.frame[o + 1], uz = this.frame[o + 2];
                const l1 = row.l1, l2 = row.l2;
                // Change of slope across the node (small-angle curvature × Voronoi length).
                row.C = ((c.x - b.x) * ux + (c.y - b.y) * uy + (c.z - b.z) * uz) / l2
                    - ((b.x - a.x) * ux + (b.y - a.y) * uy + (b.z - a.z) * uz) / l1 - row.target;
                const g = row.g;
                const ka = 1 / l1, kc = 1 / l2, kb = -(ka + kc);
                g[0] = ux * ka;
                g[1] = uy * ka;
                g[2] = uz * ka;
                g[3] = ux * kb;
                g[4] = uy * kb;
                g[5] = uz * kb;
                g[6] = ux * kc;
                g[7] = uy * kc;
                g[8] = uz * kc;
                return;
            }
            case RT_BRACKET: {
                const st = row.station;
                this.position(st, pS, null);
                const i = row.mastIndex;
                const lo = this.nodes[Math.max(0, i - 1)].x;
                const hi = this.nodes[Math.min(this.mastCount - 1, i + 2)].x;
                let tx = hi.x - lo.x, ty = hi.y - lo.y, tz = hi.z - lo.z;
                const tl = Math.hypot(tx, ty, tz) || 1;
                tx /= tl;
                ty /= tl;
                tz /= tl;
                this.sideFore(tx, ty, tz, this.frame);
                const f = this.frame;
                const sign = row.side === 0 ? -1 : 1;
                let ux, uy, uz;
                if (row.axis === 0) {
                    ux = f[0] * sign;
                    uy = f[1] * sign;
                    uz = f[2] * sign;
                }
                else if (row.axis === 1) {
                    // V17.2: fore = body z made normal to tangent and side.
                    const q = this.body.quat;
                    let fx = 2 * (q.x * q.z + q.w * q.y), fy = 2 * (q.y * q.z - q.w * q.x), fz = 1 - 2 * (q.x * q.x + q.y * q.y);
                    let d = fx * tx + fy * ty + fz * tz;
                    fx -= d * tx;
                    fy -= d * ty;
                    fz -= d * tz;
                    d = fx * f[0] + fy * f[1] + fz * f[2];
                    fx -= d * f[0];
                    fy -= d * f[1];
                    fz -= d * f[2];
                    const fl = Math.hypot(fx, fy, fz) || 1;
                    ux = fx / fl;
                    uy = fy / fl;
                    uz = fz / fl;
                }
                else {
                    ux = tx;
                    uy = ty;
                    uz = tz;
                }
                const tip = this.nodes[row.a.a].x;
                row.C = (tip.x - pS[0]) * ux + (tip.y - pS[1]) * uy + (tip.z - pS[2]) * uz - row.target;
                this.grad(row, row.a, ux, uy, uz);
                this.grad(row, st, -ux, -uy, -uz);
                return;
            }
        }
    }
    mastCount = 0;
    // ------------------------------------------------------------------ solve
    beginSubstep() {
        const invDt2 = 1 / (this.dt * this.dt);
        for (const row of this.rows) {
            row.refresh?.(row);
            row.prevTensionN = -row.lambda * invDt2;
            row.lambda = 0;
        }
        this.iteration = 0;
        this.solvedThisSubstep = 0;
        this.needFactor = true;
    }
    factor() {
        const t0 = performance.now();
        const ldl = this.ldl;
        const values = this.values;
        values.fill(0);
        const rows = this.rows;
        const nodes = this.nodes;
        const invDt2 = 1 / (this.dt * this.dt);
        const te = this.termEntry, r1a = this.termR1, s1a = this.termS1, r2a = this.termR2, s2a = this.termS2, tn = this.termNode;
        for (let k = 0; k < te.length; k++) {
            const r1 = r1a[k], r2 = r2a[k];
            const row1 = rows[r1], row2 = rows[r2];
            if (!row1.active || !row2.active)
                continue;
            const w = nodes[tn[k]].w;
            if (w === 0)
                continue;
            const g1 = row1.g, g2 = row2.g, o1 = 3 * s1a[k], o2 = 3 * s2a[k];
            const e = te[k];
            values[e] = values[e] + w * (g1[o1] * g2[o2] + g1[o1 + 1] * g2[o2 + 1] + g1[o1 + 2] * g2[o2 + 2]);
        }
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const e = this.diagEntry[r];
            if (!row.active) {
                values[e] = 1;
                continue;
            }
            row.bodyW = 0;
            if (row.hasBody && !this.body.kinematic) {
                const gx = row.gB[0], gy = row.gB[1], gz = row.gB[2];
                const m2 = gx * gx + gy * gy + gz * gz;
                if (m2 > 1e-14) {
                    const m = Math.sqrt(m2);
                    this.tmpDir.x = gx / m;
                    this.tmpDir.y = gy / m;
                    this.tmpDir.z = gz / m;
                    this.tmpLever.x = row.lever[0];
                    this.tmpLever.y = row.lever[1];
                    this.tmpLever.z = row.lever[2];
                    row.bodyW = this.body.genInvMass(this.tmpLever, this.tmpDir) * m2;
                }
            }
            values[e] = values[e] + row.bodyW + row.alpha * invDt2;
        }
        ldl.factor(values);
        this.stats.factorizations++;
        this.stats.clampedPivots = ldl.clampedPivots;
        this.stats.lastFactorUs = (performance.now() - t0) * 1000;
        this.needFactor = false;
    }
    /** XPBD constraint entry point (called once per Gauss–Seidel iteration). */
    solve(dt) {
        if (!this.enabled || !this.params.enabled || !this.ldl)
            return;
        const t0 = performance.now();
        if (this.lambda === 0) {
            this.dt = dt;
            this.beginSubstep();
            this.lambda = 1;
        }
        const every = Math.max(1, this.params.solveEvery);
        if ((++this.iteration) % every !== 0)
            return;
        const first = this.solvedThisSubstep++ === 0;
        const rows = this.rows;
        const n = rows.length;
        const invDt2 = 1 / (dt * dt);
        let maxRes = 0;
        for (let r = 0; r < n; r++) {
            const row = rows[r];
            this.evaluate(row);
            if (row.uni < 0) {
                // Tension-only member: taut when stretched past its rest length, or
                // still loaded from the last sub-step (after the prediction a loaded
                // member can sit a hair under its rest length; dropping it refactorised
                // the block again a solve later).
                const taut = row.C > -1e-7 || row.lambda < 0 || row.prevTensionN > 0.5;
                if (first) {
                    if (row.active !== taut) {
                        row.active = taut;
                        this.needFactor = true;
                    }
                }
                else if (!row.active && row.C > this.params.lateActivationM) {
                    row.active = true;
                    this.needFactor = true;
                    this.stats.activeSetChanges++;
                }
            }
            if (row.active && Math.abs(row.C) > maxRes && row.type !== RT_BEND)
                maxRes = Math.abs(row.C);
        }
        this.stats.maxResidualM = maxRes;
        if (this.needFactor)
            this.factor();
        const rhs = this.rhs;
        for (let r = 0; r < n; r++) {
            const row = rows[r];
            rhs[r] = row.active ? -row.C - row.alpha * invDt2 * row.lambda : 0;
        }
        const dl = this.dl;
        this.ldl.solve(rhs, dl);
        const nodes = this.nodes;
        for (let r = 0; r < n; r++) {
            const row = rows[r];
            let d = row.active ? dl[r] : 0;
            if (row.uni < 0 && row.lambda + d > 0) {
                // Would push: release the member for the rest of this sub-step (the
                // other members' corrections assumed it held, so the block must be
                // refactorised without it; clamping it in place blew the rig up).
                d = -row.lambda;
                if (row.active) {
                    row.active = false;
                    this.needFactor = true;
                    this.stats.activeSetChanges++;
                    this.stats.slackClamps++;
                }
            }
            if (d === 0)
                continue;
            row.lambda += d;
            const g = row.g;
            for (let k = 0; k < row.ne; k++) {
                const p = nodes[row.node[k]];
                const s = d * p.w;
                if (s === 0)
                    continue;
                const o = 3 * k;
                p.x.x += g[o] * s;
                p.x.y += g[o + 1] * s;
                p.x.z += g[o + 2] * s;
            }
            if (row.hasBody && !this.body.kinematic) {
                this.tmpCorr.x = row.gB[0] * d;
                this.tmpCorr.y = row.gB[1] * d;
                this.tmpCorr.z = row.gB[2] * d;
                this.tmpLever.x = row.lever[0];
                this.tmpLever.y = row.lever[1];
                this.tmpLever.z = row.lever[2];
                this.body.applyCorrection(this.tmpCorr, this.tmpLever);
            }
        }
        for (let r = 0; r < n; r++) {
            const row = rows[r];
            row.tensionN = -row.lambda * invDt2;
            if (row.source && row.group !== 'bend') {
                row.source.lambda = row.lambda;
                row.source.tension = row.uni < 0 ? Math.max(0, row.tensionN) : row.tensionN;
            }
        }
        this.stats.solves++;
        this.stats.lastSolveUs = (performance.now() - t0) * 1000;
    }
}
export const RigRowType = { DIST: RT_DIST, PULLEY: RT_PULLEY, AXIS: RT_AXIS, BEND: RT_BEND, BRACKET: RT_BRACKET };
//# sourceMappingURL=RigStructureSolver.js.map