// Luffing flutter of the main and jib.
//
// The V16 strip aerodynamics gives each sail row one force from the row's
// chord angle of attack. When a sail luffs (sheet eased, head to wind, after
// righting) that force goes to zero and the cloth hangs quietly, while a real
// luffing sail flogs: with the flow along the membrane the pressure over it
// is set by the membrane's own waviness and by the vortices shed from the
// luff, and a slack sheet of cloth is aeroelastically unstable — ripples run
// from luff to leech at a fraction of the flow speed and the leech snaps.
//
// Here that loading is represented per row by a travelling chordwise pressure
// wave whose amplitude is a fraction of the dynamic pressure, gated by how
// close the row is to zero angle of attack (a drawing sail does not flog):
//
//   Δp = q · Cf · L(α) · env(u) · sin(ω t − k u c + φ_row),
//   ω = 2π · St · U / c,  k = ω / (0.6 U),
//
// with St ≈ 0.5 (shedding from the rounded luff at a chord Reynolds number of
// ~10⁶), env(u) growing towards the free leech. The cloth's own dynamics
// (XPBD stretch/shear/bend, battens) turn this into flogging. Cloth under the
// water is left to SailWaterSystem.
export class SailFlutterSystem {
    ocean;
    id = 'sailing.sail-flutter';
    phase = 'postPhysics';
    enabled = true;
    /** Peak pressure coefficient of the flutter wave (fraction of q). */
    amplitude = 0.6;
    /** Chord Strouhal number of the shedding that drives the ripples. */
    strouhal = 0.5;
    context = null;
    installed = false;
    hookFn = null;
    time = 0;
    stats = { luffingRows: 0, peakForceN: 0 };
    n = { x: 0, y: 0, z: 0 };
    constructor(ocean) {
        this.ocean = ocean;
    }
    init(context) { this.context = context; }
    install(context) {
        if (this.installed)
            return;
        const world = context.legacy.master.physics;
        this.hookFn = (dt) => this.hook(dt);
        world.forceHooks.push(this.hookFn);
        this.installed = true;
    }
    uninstall(context) {
        if (!this.installed)
            return;
        const world = context.legacy.master.physics;
        const i = world?.forceHooks?.indexOf(this.hookFn) ?? -1;
        if (i >= 0)
            world.forceHooks.splice(i, 1);
        this.installed = false;
    }
    hook(dt) {
        if (!this.enabled || !this.context)
            return;
        this.time += dt;
        const v16 = window.LASER2_RIGGING_V16;
        const layout = v16?.layout;
        const master = this.context.legacy.master;
        const wind = master.wind;
        if (!layout || !wind?.velocityAt)
            return;
        this.stats.luffingRows = 0;
        this.stats.peakForceN = 0;
        this.applySail(layout.main, master, 8.64, 0);
        this.applySail(layout.jib, master, 2.88, 1.7);
    }
    applySail(rows, master, area, seed) {
        if (!rows || rows.length < 3)
            return;
        const T = master.body.pos.constructor;
        const windOut = this.windOut ??= new T();
        const center = this.center ??= new T();
        const nRows = rows.length;
        const rowArea = area / nRows;
        for (let r = 1; r < nRows; r++) {
            const row = rows[r];
            const cols = row.length;
            const luff = row[0].x, leech = row[cols - 1].x;
            let cx = leech.x - luff.x, cy = leech.y - luff.y, cz = leech.z - luff.z;
            const chord = Math.hypot(cx, cy, cz);
            if (chord < 0.08)
                continue;
            cx /= chord;
            cy /= chord;
            cz /= chord;
            const prev = rows[r - 1], next = rows[Math.min(nRows - 1, r + 1)];
            let sx = next[0].x.x + next[next.length - 1].x.x - prev[0].x.x - prev[prev.length - 1].x.x;
            let sy = next[0].x.y + next[next.length - 1].x.y - prev[0].x.y - prev[prev.length - 1].x.y;
            let sz = next[0].x.z + next[next.length - 1].x.z - prev[0].x.z - prev[prev.length - 1].x.z;
            const sl = Math.hypot(sx, sy, sz);
            if (sl < 1e-4)
                continue;
            sx /= sl;
            sy /= sl;
            sz /= sl;
            let nx = sy * cz - sz * cy, ny = sz * cx - sx * cz, nz = sx * cy - sy * cx;
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl;
            ny /= nl;
            nz /= nl;
            center.set((luff.x + leech.x) / 2, (luff.y + leech.y) / 2, (luff.z + leech.z) / 2);
            // Under water: SailWaterSystem owns it.
            if (center.y < this.ocean.height(center.x, center.z) + 0.1)
                continue;
            const wv = master.wind.velocityAt(center, windOut);
            const mid = row[Math.floor(cols * 0.42)].v;
            let fx = wv.x - mid.x, fy = wv.y - mid.y, fz = wv.z - mid.z;
            const along = fx * sx + fy * sy + fz * sz;
            fx -= along * sx;
            fy -= along * sy;
            fz -= along * sz;
            const U = Math.hypot(fx, fy, fz);
            if (U < 1.2)
                continue;
            const sinA = Math.abs((fx * nx + fy * ny + fz * nz) / U);
            // Luffing gate: strongest with the flow along the chord.
            const luffing = 1 - smooth(0.07, 0.22, sinA);
            if (luffing <= 0.01)
                continue;
            const gate = luffing;
            this.stats.luffingRows++;
            const q = 0.6125 * U * U;
            const omega = (2 * Math.PI * this.strouhal * U) / chord;
            const k = omega / (0.6 * U);
            const phase = seed + r * 0.9;
            const perParticle = (q * this.amplitude * gate * rowArea) / cols;
            for (let c = 1; c < cols; c++) {
                const u = c / (cols - 1);
                const env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), 0.6) * (0.45 + 0.9 * u);
                const s = Math.sin(omega * this.time - k * u * chord + phase);
                const F = perParticle * env * s;
                const p = row[c];
                p.f.x += nx * F;
                p.f.y += ny * F;
                p.f.z += nz * F;
                if (Math.abs(F) > this.stats.peakForceN)
                    this.stats.peakForceN = Math.abs(F);
            }
        }
    }
    windOut = null;
    center = null;
    telemetry() {
        return { installed: this.installed, amplitude: this.amplitude, strouhal: this.strouhal, ...this.stats };
    }
}
function smooth(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}
//# sourceMappingURL=SailFlutterSystem.js.map