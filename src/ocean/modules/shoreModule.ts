/**
 * Shore module: runs the T2 shallow-water field where the scheduler promotes it
 * (default: the west beach), spins it up before showing it, cross-fades it in,
 * and feeds its surface into the composite water query.
 */
import type { EngineModule, OceanEngine, EngineTelemetry } from '../engine/OceanEngine';
import { ShoreField } from '../sim/ShoreField';
import { QUALITY } from '../engine/settings';
import { beachPose } from '../world/terrain';
import type { WorldModule } from './worldModule';
import type { ReleasePatch } from '../sim/InteractionTiles';

export const SHORE_TILE_SIZE = 320;
export const SPIN_UP_SECONDS = 45;
/** Simulated seconds of catch-up per rendered frame (spin-up cost is spread over frames), and the probe interval. */
const CATCH_UP_PER_FRAME: Record<string, number> = { capture: 1.5, low: 0.6, medium: 0.8, high: 0.8, ultra: 1.0 };
const CATCH_UP_STEP = 0.1;

export class ShoreModule implements EngineModule {
  name = 'shore';
  field: ShoreField | null = null;
  releases: ReleasePatch[] = [];
  /** Receipt-style log of lifecycle transitions (consumed by the scheduler). */
  events: { t: number; kind: 'spawn' | 'ready' | 'retire' | 'freed'; note: string }[] = [];
  private readyLogged = false;

  constructor(private engine: OceanEngine, private worldModule: WorldModule) {
    worldModule.shore = this;
    // Inside the tile the solver's surface replaces the spectral one (T2 owns wet/dry truth).
    engine.heightProviders.unshift((x, z, h) => {
      const f = this.field;
      if (!f || f.fade < 0.5) return h;
      const e = f.sampleEta(x, z);
      return e === null ? h : e;
    });
  }

  /** Default placement: straddling the west beach, 72 % of the tile seaward. */
  defaultOrigin(): [number, number] {
    const w = this.worldModule.world;
    const { shore } = beachPose(w.params);
    return [shore[0] - SHORE_TILE_SIZE * 0.72, w.params.center[1] - SHORE_TILE_SIZE / 2];
  }

  /** JIT promotion to T2 (called by the scheduler, or directly by the policy below). */
  promote(origin: [number, number] = this.defaultOrigin(), reason = 'shoreline') {
    if (this.field && !this.field.retiring) return this.field;
    this.field?.dispose();
    const q = QUALITY[this.engine.quality];
    this.field = new ShoreField(this.engine.gl, this.worldModule.world, origin, SHORE_TILE_SIZE, q.shoreN);
    this.readyLogged = false;
    this.events.push({ t: this.engine.time, kind: 'spawn', note: reason });
    return this.field;
  }

  demote(reason = 'quiet') {
    if (this.field && !this.field.retiring) {
      this.field.retiring = true;
      this.events.push({ t: this.engine.time, kind: 'retire', note: reason });
    }
  }

  get active() {
    return !!this.field && this.field.fade > 0;
  }

  update(engine: OceanEngine, _time: number, dt: number) {
    const f = this.field;
    if (!f) return;
    const s = engine.settings.shore;
    f.params.manning = s.friction;
    f.params.gammaT = s.breakGamma * 0.62;
    f.params.curl = s.lip;
    const dir = engine.ocean.meanWaveDirDeg;
    // Spin-up (Fable §5.3: ready before time-to-truth-failure): the tile starts
    // SPIN_UP_SECONDS behind the engine on its own clock and runs faster than
    // real time, forced by the spectrum evaluated at the tile's time, until it
    // has caught up. Only then does it cross-fade in.
    if (f.clock === null) f.clock = engine.time - SPIN_UP_SECONDS;
    const lag = engine.time - f.clock;
    const ramp = () => Math.min(1, f.warm / 8);
    if (lag > dt + 1e-6) {
      const budget = Math.min(CATCH_UP_PER_FRAME[engine.quality] ?? 0.8, lag);
      const steps = Math.max(1, Math.ceil(budget / CATCH_UP_STEP));
      for (let i = 0; i < steps && f.clock < engine.time; i++) {
        const h = Math.min(CATCH_UP_STEP, engine.time - f.clock);
        f.step(engine.ocean, h, dir, ramp(), engine.ocean.evaluateAt(f.clock + h), false);
        f.clock += h;
        f.warm += h;
      }
    } else if (lag > 0) {
      f.step(engine.ocean, lag, dir, ramp());
      f.clock = engine.time;
      f.warm += lag;
    }
    const caughtUp = engine.time - f.clock < 1e-3;
    if (caughtUp && !this.readyLogged) {
      this.readyLogged = true;
      this.events.push({ t: engine.time, kind: 'ready', note: `spun up ${f.warm.toFixed(1)}s` });
    }
    const target = f.retiring ? 0 : caughtUp ? 1 : 0;
    f.fade = Math.max(0, Math.min(1, f.fade + (target > f.fade ? dt / 2.5 : -dt / 2.5)));
    if (engine.fixedDt > 0 && target === 1 && f.fade < 1) f.fade = Math.min(1, f.fade + 0.05);
    f.output();
    this.releases = f.pendingReleases;
    f.pendingReleases = [];
    if (f.retiring && f.fade <= 0) {
      f.dispose();
      this.field = null;
      this.events.push({ t: engine.time, kind: 'freed', note: 'faded out' });
    }
  }

  surfaceBindings() {
    const f = this.field;
    if (!f || f.fade <= 0) return {};
    return { shore: f.binding() };
  }

  telemetry(t: EngineTelemetry) {
    t.shoreActive = this.active;
    const f = this.field;
    if (f) Object.assign(t, { shoreWarm: f.warm, shoreFade: f.fade, shoreVolume: f.volume, shoreReleased: f.releasedVolume });
  }

  dispose() {
    this.field?.dispose();
  }
}
