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
import { OceanMpm, DEFAULT_MPM, type SphereCollider } from '../sim/oceanMpm';
import { SplashConnectivity } from '../sim/splashConnectivity';
import { splatHeightForVolume } from '../sim/InteractionTiles';
import { QUALITY } from '../engine/settings';
import { RHO_WATER, bodyHeading } from '../physics/bodies';
import type { InteractionModule } from './interactionModule';
import type { ShoreModule } from './shoreModule';
import type { BodiesModule } from './bodiesModule';

export class SplashModule implements EngineModule {
  name = 'splash';
  readonly mpm: OceanMpm;
  readonly ligaments: SplashConnectivity;
  readonly renderer: SplashSystem;
  /** Volume that settled where no finite tier exists (the unbounded T0 sea absorbs it). */
  toOcean = 0;
  toTiles = 0;
  toShore = 0;

  constructor(private engine: OceanEngine, private interaction: InteractionModule, private shore: ShoreModule, private bodies: BodiesModule) {
    const cap = QUALITY[engine.quality].sprayCapacity;
    const fine = engine.quality === 'high' || engine.quality === 'ultra';
    this.mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: cap, dx: fine ? 0.24 : 0.32, maxVolumes: fine ? 4 : 3 });
    const dx = this.mpm.cfg.dx;
    this.ligaments = new SplashConnectivity({ form: dx * 1.1, break: dx * 2.4, memory: 0.5, samples: 2, thinPower: 1.3, maxBonds: Math.min(4000, cap) });
    this.renderer = new SplashSystem(engine.gl, cap * 2);
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

  update(engine: OceanEngine, time: number, dt: number) {
    const tiles = this.interaction.tiles;
    const shoreField = this.shore.field;
    // 1. Heightfield releases become fluid (the pool's spawners shape them).
    const budget = Math.max(64, Math.floor(this.mpm.cfg.capacity / 6));
    const rel = [
      ...this.interaction.releases.map((r) => ({ r, kind: 'impact' as const, spread: Math.min(3, Math.max(0.6, Math.sqrt(r.volume) * 1.3)) })),
      ...(shoreField ? this.shore.releases.map((r) => ({ r, kind: 'sheet' as const, spread: 4 })) : []),
    ];
    this.interaction.releases = [];
    this.shore.releases = [];
    const totalV = rel.reduce((a, x) => a + x.r.volume, 0);
    for (const { r, kind, spread } of rel) {
      const share = Math.max(6, Math.round((budget * r.volume) / Math.max(totalV, 1e-9)));
      this.mpm.emitRelease(r, kind, spread, time, share);
    }

    // 2. Advance the fluid against the composite sea surface, bodies colliding two-way.
    const colliders = this.colliders();
    this.mpm.step(dt, { heightAt: (x, z) => engine.sampleWater(x, z).height }, colliders, time);
    this.applyReactions(colliders, dt);
    this.mpm.retireIdle(time);

    // 3. Settled water goes home: binned so each tier receives few, volume-exact splats.
    const bins = new Map<number, { x: number; z: number; V: number; vy: number }>();
    for (const e of this.mpm.settleEvents) {
      const key = Math.floor(e.x) * 65536 + Math.floor(e.z);
      const b = bins.get(key);
      if (b) { b.x += e.x * e.volume; b.z += e.z * e.volume; b.V += e.volume; b.vy = Math.min(b.vy, e.vy); }
      else bins.set(key, { x: e.x * e.volume, z: e.z * e.volume, V: e.volume, vy: e.vy });
    }
    for (const b of bins.values()) {
      if (b.V <= 0) continue;
      const x = b.x / b.V, z = b.z / b.V;
      const r = 0.9;
      const t = tiles.tileAt(x, z);
      if (t && !t.retiring) {
        tiles.addImpact(x, z, r, splatHeightForVolume(b.V, r), Math.min(1, b.V * 2 + Math.abs(b.vy) * 0.02), 0, time);
        this.toTiles += b.V;
      } else if (shoreField && shoreField.deposit(x, z, r, b.V)) {
        this.toShore += b.V;
      } else {
        this.toOcean += b.V;
      }
    }

    // 4. Ligaments + upload for drawing.
    this.ligaments.update(this.mpm.particles, dt);
    this.renderer.upload(this.mpm.particles, engine.settings.spray.render === 'fluid' ? this.ligaments : null, this.mpm.cfg.restDensity);
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

  drawTransparent(engine: OceanEngine) {
    const s = engine.settings;
    if (!s.spray.enabled) return;
    const cam = engine.camera;
    const L = engine.skyE;
    const o = s.optics;
    const u = o.backscatter.map((b, i) => b / (o.absorb[i] + b));
    const body = u.map((x) => 0.0949 * x + 0.0794 * x * x) as [number, number, number];
    this.renderer.draw({
      viewProj: cam.viewProj, invViewProj: cam.invViewProj, cam: cam.position,
      viewportH: engine.post.height, projY: cam.proj[5],
      sunDir: engine.sky.sunDir, sunE: engine.sky.sunRadiance, skyE: L,
      env: engine.sky.texture, envLevels: engine.sky.levels, absorb: s.optics.absorb,
      fogDensity: s.optics.fogDensity * (1 + 5 * s.weather.precipitation),
      haze: [L[0] * 0.3, L[1] * 0.32, L[2] * 0.36], body,
      hdr: engine.post.hdr, mode: s.spray.render,
    });
  }

  telemetry(t: EngineTelemetry) {
    const st = this.mpm.stats;
    t.sprayLive = st.alive;
    Object.assign(t, {
      splashEmitted: st.emitted, splashAirborne: st.airborne, splashSettled: st.settled, splashLost: st.lost,
      splashToTiles: this.toTiles, splashToShore: this.toShore, splashToOcean: this.toOcean, splashVolumes: this.mpm.volumes.length,
    });
  }

  dispose() {
    this.renderer.dispose();
  }
}
