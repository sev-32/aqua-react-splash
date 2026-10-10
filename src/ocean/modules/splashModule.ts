/**
 * Splash module (tier T4): closes the representability loop with the pool's
 * MLS-MPM splash solver evolved to ocean scale (sim/oceanMpm.ts).
 *
 *   T3 limiter / T2 breaking jets ──release V──▶ MLS-MPM fluid (crown, jet, sheet)
 *        ▲                                                │ bodies collide two-way
 *        └──────── settle: each particle's volume ◀───────┘ (tile splat / shore / T0)
 *
 * The pool drove its solver from sphere water-line crossings; here the
 * heightfield itself says what it cannot represent, and the fluid takes it.
 */
import type { EngineModule, OceanEngine, EngineTelemetry } from '../engine/OceanEngine';
import { SplashSystem } from '../sim/SplashSystem';
import { CausalTransferLedger } from '../sim/causalLedger';
import { OceanMpm, DEFAULT_MPM, type SphereCollider } from '../sim/oceanMpm';
import { SplashConnectivity } from '../sim/splashConnectivity';
import { splatHeightForVolume, type ReleasePatch } from '../sim/InteractionTiles';
import { QUALITY } from '../engine/settings';
import { RHO_WATER, bodyHeading, displacedBelow, entryJetFlux, type Body } from '../physics/bodies';
import type { InteractionModule } from './interactionModule';
import type { ShoreModule } from './shoreModule';
import type { BodiesModule } from './bodiesModule';

export class SplashModule implements EngineModule {
  name = 'splash';
  readonly mpm: OceanMpm;
  readonly ligaments: SplashConnectivity;
  readonly renderer: SplashSystem;
  /** Audited water transfers. The 'ocean' destination is an open boundary,
   * not an injection into the spectral surface solver. */
  readonly ledger = new CausalTransferLedger();
  /** Independent launch provenance (m³) for timestep-identifiability tests. */
  readonly launchVolumes = { entry: 0, interaction: 0, shore: 0 };
  /** Experimental launch threshold multiplier (default 1, physically unchanged).
   * Distinct from particle sampling density so threshold sensitivity is isolated. */
  entryPacketScale = 1;
  get toOcean() { return this.ledger.audit(this.mpm.stats).oceanBoundary; }
  get toTiles() { return this.ledger.audit(this.mpm.stats).tiles; }
  get toShore() { return this.ledger.audit(this.mpm.stats).shore; }

  constructor(private engine: OceanEngine, private interaction: InteractionModule, private shore: ShoreModule, private bodies: BodiesModule) {
    const cap = QUALITY[engine.quality].sprayCapacity;
    const fine = engine.quality === 'high' || engine.quality === 'ultra';
    this.mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: cap, dx: fine ? 0.24 : 0.32, maxVolumes: fine ? 4 : 3 });
    const dx = this.mpm.cfg.dx;
    this.ligaments = new SplashConnectivity({ form: dx * 1.1, break: dx * 2.4, memory: 0.5, samples: 2, thinPower: 1.3, maxBonds: Math.min(4000, cap) });
    this.renderer = new SplashSystem(engine.gl, cap * 2);
  }

  /**
   * The pool's event spawners, driven by the heightfield: a release next to a body moving
   * through the surface is its bow wave, thrown ahead of it. Volume, position and the
   * vertical launch come from the limiter (the heightfield's own motion); the body's
   * entry/exit water is thrown by the Froude model (entrySplash), so it is not re-launched
   * here at the body's speed.
   */
  private shapeByBody(r: ReleasePatch): { r: ReleasePatch; kind: 'impact' | 'crown' | 'sheet'; spread: number } {
    const free = { r, kind: 'impact' as const, spread: Math.min(3, Math.max(0.6, Math.sqrt(r.volume) * 1.3)) };
    let best: Body | null = null, bestD = Infinity, bestR = 0;
    for (const b of this.bodies.bodies) {
      if (!b.alive) continue;
      const R = b.shape.kind === 'sphere' ? b.shape.radius ?? 1 : b.shape.kind === 'hull' ? (b.shape.beam ?? 2.4) * 0.5 : Math.max(...(b.shape.half ?? [1, 1, 1]));
      const d = Math.hypot(r.x - b.pos[0], r.z - b.pos[2]) - R;
      if (d < 1.5 + R * 0.5 && d < bestD) { best = b; bestD = d; bestR = R; }
    }
    if (!best) return free;
    const [vx, vz] = [best.vel[0], best.vel[2]];
    const vh = Math.hypot(vx, vz);
    if (vh > 0.6) {
      // Towed: the bow wave travels with the hull, so its released crest leaves forward-and-
      // aside at about the hull speed, climbing its bow.
      return { r: { ...r, vx: vx * 1.05, vz: vz * 1.05, vy: Math.max(r.vy, 0) + 0.45 * vh }, kind: 'sheet', spread: Math.min(bestR, 1.2) };
    }
    // Around a body in the surface (plunging, rising, bobbing) the heightfield's own release
    // is the physics — e.g. the jet of a collapsing entry cavity — and leaves as it would anywhere.
    return free;
  }

  /** Bodies as colliders (spheres; hulls as three spheres along the keel). */
  private colliders(): SphereCollider[] {
    const out: SphereCollider[] = [];
    for (const b of this.bodies.bodies) {
      if (!b.alive || Math.abs(b.pos[1]) > 20) continue;
      const add = (x: number, y: number, z: number, r: number) =>
        out.push({ cx: x, cy: y, cz: z, vx: b.vel[0], vy: b.vel[1], vz: b.vel[2], radius: r, fx: 0, fy: 0, fz: 0 });
      const s = b.shape;
      if (s.kind === 'sphere') add(b.pos[0], b.pos[1], b.pos[2], s.radius ?? 1);
      else if (s.kind === 'hull') {
        const L = s.length ?? 8, beam = s.beam ?? 2.4;
        const h = bodyHeading(b);
        const fx = Math.cos(h), fz = Math.sin(h);
        for (const t of [-0.3, 0, 0.3]) add(b.pos[0] + fx * L * t, b.pos[1], b.pos[2] + fz * L * t, beam * 0.55);
      } else add(b.pos[0], b.pos[1], b.pos[2], Math.max(...(s.half ?? [1, 1, 1])));
    }
    return out;
  }

  /** Per body: volume below the undisturbed sea last frame, and jet volume not yet emitted. */
  private displaced = new Map<number, { V: number; pending: number; mouth: [number, number] | null; last: [number, number, number] | null }>();

  /**
   * Froude-limited entry and exit: the crown is the displacement that waves cannot carry.
   * A body going in at relative speed U displaces Q = dV/dt through its waterplane of
   * radius a; gravity waves of that scale leave at c = √(g·a). Where U > c the water
   * arrives faster than it can leave as waves, and the excess Q·(1 − c/U) is thrown off
   * along the body's surface — Wagner's jet, which starts fast and nearly flat while the
   * waterline races outward (ȧ = hU/a) and turns upright as the equator passes. A 7 m/s
   * plunge of the 0.6 m ball throws about two thirds of its displacement; a bob at 1 m/s
   * throws none; a floating hull only slams spray when it falls faster than √(g·a).
   * The thrown volume leaves the interaction tile as an exact Gaussian, so heightfield
   * and fluid together conserve the water.
   */
  private entrySplash(time: number, dt: number) {
    const tiles = this.interaction.tiles;
    const mirror = this.engine.ocean.mirror;
    const level = (x: number, z: number) => mirror.sample(x, z).height;
    const dx = this.mpm.cfg.dx;
    const minV = (8 * dx * dx * dx) / 27;
    const alive = new Set<number>();
    for (const b of this.bodies.bodies) {
      if (!b.alive) continue;
      alive.add(b.id);
      const geo = displacedBelow(b, level);
      const st = this.displaced.get(b.id);
      if (!st) { this.displaced.set(b.id, { V: geo.volume, pending: 0, mouth: null, last: null }); continue; }
      let Q = dt > 0 ? (geo.volume - st.V) / dt : 0;
      st.V = geo.volume;
      const sea = mirror.sample(b.pos[0], b.pos[2]);
      const U = sea.vy - b.vel[1];              // downward speed relative to the sea surface
      // Open cavity: a body that goes in faster than its waves (U > √(gR)) drags an air cavity
      // behind it, and the cavity's expanding mouth keeps displacing water, πR²·U, while the
      // body travels its first 2R below the surface — about 1.5 body volumes more, pushed up
      // from the mouth ring. This keeps the curtain fed and rooted in the water after the body
      // itself is under (a splash dwarfs the body that made it).
      const Rb = b.shape.kind === 'sphere' ? b.shape.radius ?? 1 : Math.max(geo.a, 0.3);
      const top = sea.height - (b.pos[1] + (b.shape.kind === 'sphere' ? Rb : 0));
      let cavity = false;
      if (st.mouth && top > 0 && top < 2 * Rb && U > Math.sqrt(9.81 * Rb) && Q < 0.05 * Math.PI * Rb * Rb * U) {
        Q = Math.PI * Rb * Rb * U; cavity = true;
      }
      if (Q > 0 && U > Math.sqrt(9.81 * Rb) && !st.mouth) st.mouth = [b.pos[0], b.pos[2]];
      if (top >= 2 * Rb || U <= 0) st.mouth = null;
      const geoA = cavity ? Rb : geo.a;
      // Leaving is the mirror image: the water moving with the body (a sphere's added mass,
      // half its displacement) follows it up where the hole it leaves fills slower than it
      // rises — the mantle that clings, converges beneath it into a column, and drains.
      const exit = Q < 0;
      const jet = exit ? 0.5 * entryJetFlux(-Q, -U, geoA) : entryJetFlux(Q, U, geoA);
      if (!(jet > 0)) { st.pending = 0; continue; }
      st.pending += jet * dt;
      if (st.pending < minV * Math.max(0.01, this.entryPacketScale)) continue;
      // Launch velocity (radial vr, vertical vy). Entry: the curtain leaves along the waterline
      // tangent, elevation atan(a/h) — flat at first touch, upright at the equator — at the
      // contact line's pace, 2ȧ = 2hU/a (Wagner): the thin early tip fast, the bulk (thrown
      // near the equator, where a ≈ R and most of the flux passes) slow, so the curtain is one
      // sheet stretched from the waterline up rather than a ring flung off whole. Floors: the
      // flatter early skirt is a film holding almost no volume (≥45°); past the equator the
      // flow has separated (≤80°) and the cavity wall still pushes out at ~0.3U.
      // Exit: the mantle rises with the body and converges beneath it.
      let vr = -0.1 * -U, vy = 0.85 * -U, ring = geoA + 0.5 * dx;
      if (cavity) {
        // The mouth wall pushes the surface layer up and out: steep and slow, the curtain's root.
        const th = (75 * Math.PI) / 180, v = 0.35 * U;
        vr = v * Math.cos(th); vy = v * Math.sin(th);
      } else if (!exit) {
        const R = b.shape.kind === 'sphere' ? b.shape.radius ?? 1 : geo.a;
        const h = Math.max(-R, Math.min(R, b.pos[1] - sea.height));
        const th = Math.min(Math.max(Math.atan2(geo.a, h), Math.PI / 4), (80 * Math.PI) / 180);
        const v = U * Math.min(Math.max((2 * h) / Math.max(geo.a, 1e-3), 0.3), 2);
        vr = v * Math.cos(th); vy = v * Math.sin(th);
      }
      if (b.shape.kind === 'sphere' && !cavity) {
        // Just outside the collider at the launch height, so the solver sees water leaving it.
        const R = b.shape.radius ?? 1, dy = sea.height + 0.04 - b.pos[1];
        ring = Math.max(ring, Math.sqrt(Math.max((R + 0.5 * dx) ** 2 - dy * dy, 0)));
      }
      const V = st.pending;
      const [ex, ez] = cavity && st.mouth ? st.mouth : [b.pos[0], b.pos[2]];
      const t = tiles.tileAt(ex, ez);
      const rr = Math.max(geoA, 2 * (t?.dx ?? dx));
      if (!tiles.addImpact(ex, ez, rr, -splatHeightForVolume(V, rr), 0, 0, time, true)) { st.pending = 0; continue; }
      const share = Math.max(8, Math.min(Math.floor(this.mpm.cfg.capacity / 6), Math.round(V / minV) * 8));
      // The sheet is born at the contact line in air shear ~U: past the Weber break-up speed of
      // a centimetre sheet (~10 m/s) the whole curtain leaves atomized — a rock's white wall —
      // below it clear, the ball's glassy crown.
      // Continuous emission across the frame from the previous frame's launch (if it emitted).
      const prev = st.last && time - st.last[2] < 1.5 * dt ? st.last : null;
      this.mpm.emitRelease({ x: ex, z: ez, y: sea.height, volume: V, vx: cavity ? 0 : b.vel[0], vz: cavity ? 0 : b.vel[2], vy, vr,
        vr0: prev?.[0], vy0: prev?.[1], span: dt, aerated: Math.abs(U) > 10,
        materialSource: b.id }, 'crown', ring, time, share);
      this.launchVolumes.entry += V;
      st.last = [vr, vy, time];
      st.pending = 0;
    }
    for (const id of this.displaced.keys()) if (!alive.has(id)) this.displaced.delete(id);
  }

  update(engine: OceanEngine, time: number, dt: number) {
    // Wind at spray height (log profile, z₀ ≈ 0.2 mm: U(2 m) ≈ 0.85·U10), toward windDirDeg.
    const w = engine.settings.weather, wd = (w.windDirDeg * Math.PI) / 180;
    this.mpm.wind = [Math.cos(wd) * 0.85 * w.windSpeed, Math.sin(wd) * 0.85 * w.windSpeed];
    this.entrySplash(time, dt);
    const tiles = this.interaction.tiles;
    const shoreField = this.shore.field;
    // 1. Heightfield releases become fluid (the pool's spawners shape them).
    const budget = Math.max(64, Math.floor(this.mpm.cfg.capacity / 6));
    const rel = [
      ...this.interaction.releases.map((r) => ({ ...this.shapeByBody(r), origin: 'interaction' as const })),
      ...(shoreField ? this.shore.releases.map((r) => ({ r, kind: 'sheet' as const, spread: 4, origin: 'shore' as const })) : []),
    ];
    this.interaction.releases = [];
    this.shore.releases = [];
    const totalV = rel.reduce((a, x) => a + x.r.volume, 0);
    for (const { r, kind, spread, origin } of rel) {
      if (!(r.volume > 0)) continue;
      const share = Math.max(6, Math.round((budget * r.volume) / Math.max(totalV, 1e-9)));
      this.mpm.emitRelease(r, kind, spread, time, share);
      this.launchVolumes[origin] += r.volume;
    }

    // 2. Advance the fluid against the composite sea surface, bodies colliding two-way.
    const colliders = this.colliders();
    this.mpm.step(dt, { heightAt: (x, z) => engine.sampleWater(x, z).height }, colliders, time);
    this.applyReactions(colliders, dt);
    this.mpm.retireIdle(time);

    // 3. Settled water goes home: binned so each tier receives few, volume-exact splats.
    const bins = new Map<number, {
      x: number; z: number; V: number; vyMin: number;
      vxVolume: number; vyVolume: number; vzVolume: number; v2Volume: number;
    }>();
    for (const e of this.mpm.settleEvents) {
      // Preserve the actual sum of momentum and kinetic energy, not the
      // energy of an averaged velocity (which discards the fluctuations).
      const key = Math.floor(e.x) * 65536 + Math.floor(e.z);
      const mx = e.volume * e.vx, my = e.volume * e.vy, mz = e.volume * e.vz;
      const e2 = e.volume * (e.vx * e.vx + e.vy * e.vy + e.vz * e.vz);
      const b = bins.get(key);
      if (b) {
        b.x += e.x * e.volume; b.z += e.z * e.volume; b.V += e.volume;
        b.vyMin = Math.min(b.vyMin, e.vy);
        b.vxVolume += mx; b.vyVolume += my; b.vzVolume += mz; b.v2Volume += e2;
      } else bins.set(key, {
        x: e.x * e.volume, z: e.z * e.volume, V: e.volume,
        vyMin: e.vy, vxVolume: mx, vyVolume: my, vzVolume: mz, v2Volume: e2,
      });
    }
    for (const b of bins.values()) {
      if (!(b.V > 0)) continue;
      const x = b.x / b.V, z = b.z / b.V;
      const r = 0.9;
      const t = tiles.tileAt(x, z);
      // Re-entry foam follows the energetic vertical impact, as before.
      const foam = Math.min(0.6, 0.012 * b.V * b.vyMin * b.vyMin / Math.max(r * r, 0.05));
      const target = t && !t.retiring &&
        tiles.addImpact(x, z, r, splatHeightForVolume(b.V, r), foam, 0, time)
        ? 'tiles' as const
        : shoreField && shoreField.deposit(x, z, r, b.V)
          ? 'shore' as const : 'ocean' as const;
      this.ledger.route(target, {
        volume: b.V,
        volumeVelocity: [b.vxVolume, b.vyVolume, b.vzVolume],
        volumeSpeedSquared: b.v2Volume,
      }, RHO_WATER);
    }

    // 4. Ligaments + upload for drawing.
    // V3-only: share its fixed bond budget across the crown instead of
    // spending it on a few early dense particle neighborhoods.
    // R1 and V2 preserve their original graph behavior and MPM is untouched.
    this.ligaments.maxDegree = this.renderer.surfaceMeshV3 ? 5 : Infinity;
    this.ligaments.update(this.mpm.particles, dt);
    this.renderer.upload(this.mpm.particles, engine.settings.spray.render === 'fluid' ? this.ligaments : null);
  }

  /** Reaction of the splash on bodies (grid units → N), as the pool's sphere feedback. */
  private applyReactions(colliders: SphereCollider[], dt: number) {
    if (!colliders.length || dt <= 0) return;
    const dx = this.mpm.cfg.dx;
    // One grid mass unit ≈ the water of one particle's share of a cell.
    const unitMass = (RHO_WATER * dx * dx * dx) / this.mpm.cfg.restDensity;
    let ci = 0;
    for (const b of this.bodies.bodies) {
      if (!b.alive || Math.abs(b.pos[1]) > 20) continue;
      const n = b.shape.kind === 'hull' ? 3 : 1;
      for (let k = 0; k < n; k++, ci++) {
        const c = colliders[ci];
        if (!c) continue;
        const f = unitMass * dx;
        b.vel[0] += (c.fx * f * dt) / b.mass;
        b.vel[1] += (c.fy * f * dt) / b.mass;
        b.vel[2] += (c.fz * f * dt) / b.mass;
      }
    }
  }

  /** Scene reset: no splash carried over from the previous experiment. */
  reset() {
    this.mpm.reset();
    this.ledger.reset(this.mpm.stats);
    this.launchVolumes.entry = this.launchVolumes.interaction = this.launchVolumes.shore = 0;
    this.displaced.clear();
  }

  drawTransparent(engine: OceanEngine) {
    const s = engine.settings;
    if (!s.spray.enabled) return;
    const cam = engine.camera;
    const L = engine.skyE;
    const o = s.optics;
    this.renderer.draw({
      viewProj: cam.viewProj, invViewProj: cam.invViewProj, cam: cam.position,
      viewportH: engine.post.height, projY: cam.proj[5],
      sunDir: engine.sky.sunDir, sunE: engine.sky.sunRadiance, skyE: L,
      env: engine.sky.texture, envLevels: engine.sky.levels, absorb: s.optics.absorb,
      fogDensity: s.optics.fogDensity * (1 + 5 * s.weather.precipitation),
      haze: [L[0] * 0.3, L[1] * 0.32, L[2] * 0.36], scatter: o.scatter, backscatter: o.backscatter, ior: o.ior,
      hdr: engine.post.hdr, mode: s.spray.render, seaPos: engine.surface.positions,
    });
  }

  telemetry(t: EngineTelemetry) {
    const st = this.mpm.stats;
    const audit = this.ledger.audit(st);
    t.sprayLive = st.alive;
    Object.assign(t, {
      splashEmitted: audit.emitted, splashAirborne: audit.live, splashSettled: audit.settled, splashLost: audit.lost,
      splashToTiles: audit.tiles, splashToShore: audit.shore, splashToOcean: audit.oceanBoundary,
      splashVolumes: this.mpm.volumes.length,
      // Actual stock/flow residuals, in m³. These must be measured, never silently zeroed.
      splashSolverVolumeResidual: audit.solverVolumeResidual,
      splashUnroutedVolume: audit.unroutedVolume,
      splashOpenBoundaryVolume: audit.oceanBoundary,
      splashEntryPacketScale: this.entryPacketScale,
      splashLaunchEntry: this.launchVolumes.entry,
      splashLaunchInteraction: this.launchVolumes.interaction,
      splashLaunchShore: this.launchVolumes.shore,
      splashLaunchResidual: audit.emitted - this.launchVolumes.entry - this.launchVolumes.interaction - this.launchVolumes.shore,
      // Diagnostics ONLY until a receiver supports vector-momentum transfer.
      splashReturnedImpulse: audit.returnedImpulse,
      splashReturnedKineticEnergy: audit.returnedKineticEnergy,
      splashInvalidTransfers: audit.invalidTransfers,
    });
  }

  dispose() {
    this.renderer.dispose();
  }
}
