/**
 * Interaction module: owns the T3 JIT tiles. Tile *existence* is decided by the
 * HydroEscalationScheduler through `requestTile`; this module runs them, feeds
 * body sources, layers their height into the composite water query, and hands
 * limiter releases to the splash system.
 */
import type { EngineModule, OceanEngine, EngineTelemetry } from '../engine/OceanEngine';
import { InteractionTiles, type ReleasePatch } from '../sim/InteractionTiles';
import { QUALITY } from '../engine/settings';
import type { BodiesModule } from './bodiesModule';

export class InteractionModule implements EngineModule {
  name = 'interaction';
  readonly tiles: InteractionTiles;
  /** Releases handed to the splash module each frame. */
  releases: ReleasePatch[] = [];

  constructor(private engine: OceanEngine, private bodies: BodiesModule) {
    const q = QUALITY[engine.quality];
    const s = engine.settings.interaction;
    this.tiles = new InteractionTiles(engine.gl, {
      n: q.tileN,
      dx: q.tileN >= 512 ? 0.25 : 128 / q.tileN,
      depth: 60,
      damping: s.dispersionDamping,
      viscosity: 0.004,
      sourceGain: s.sourceGain,
      limiter: s.limiterEnabled,
      maxSlope: s.maxSlope,
      relax: 0.5,
      foamLife: 6,
    });
    engine.heightProviders.push((x, z, h) => h + this.tiles.sampleHeight(x, z));
    // A sphere of ~1 m needs ~8 cells across it; capture/low: 32 m tiles, medium+: 64 m.
    this.fineDx = 0.25;
  }

  /** Cell size of fine tiles (small bodies: the pool's sphere, rocks, buoys). */
  readonly fineDx: number;

  /** JIT promotion hook (called by the scheduler, or directly when no scheduler is installed). */
  requestTile(center: [number, number], reason: string, followId?: number, fine = false) {
    const t = this.tiles.ensure(center, reason, this.engine.time, fine ? this.fineDx : undefined);
    if (t && followId !== undefined && !t.followIds.includes(followId)) t.followIds.push(followId);
    return t;
  }

  update(engine: OceanEngine, time: number, dt: number) {
    const s = engine.settings.interaction;
    const cfg = this.tiles.cfg;
    cfg.damping = s.dispersionDamping;
    cfg.sourceGain = s.sourceGain;
    cfg.limiter = s.limiterEnabled;
    cfg.maxSlope = s.maxSlope;
    if (!s.tilesEnabled) {
      for (const t of this.tiles.tiles) this.tiles.retire(t);
    }
    // Keep followed bodies' tiles alive; drop ids of bodies that no longer exist.
    const alive = new Set(this.bodies.bodies.map((b) => b.id));
    for (const t of this.tiles.tiles) {
      t.followIds = t.followIds.filter((id) => alive.has(id));
      if (t.followIds.length) t.lastActive = time;
    }
    this.tiles.update(engine.ocean, this.bodies.bodies, dt, time);
    this.releases = this.tiles.pendingReleases;
    this.tiles.pendingReleases = [];
  }

  surfaceBindings() {
    return { tiles: this.tiles.bindings(), tileArray: this.tiles.outputArray };
  }

  telemetry(t: EngineTelemetry) {
    t.tiles = this.tiles.tiles.filter((x) => !x.retiring).length;
  }

  dispose() {
    this.tiles.dispose();
  }
}
