// Native ocean authority.
//
// Owns the sea state and the CPU wave field, and exposes the one water model
// every physics consumer uses: the native hull/foil/crew systems query it
// directly, and the quarantined legacy rig (sailcloth water contact, spar
// buoyancy/drag, wet-rig mass) is redirected to it by replacing the legacy
// ocean object's height/velocity/setSea methods. The legacy ocean meshes stay
// hidden; rendering is owned by WaterSurfaceSystem using the same components.
//
// Timing: the physics step wrapper advances the field to cover [t, t + dt]
// before the XPBD solve and a first force hook selects the sub-step time, so
// sub-steps see a continuously moving surface.

import type { AppContext, AppSystem } from '../core/System.js';
import { OceanWaveField, type WaveSample } from './OceanWaveField.js';
import { buildSeaState, type SeaState, type SeaStateInput, type WaveComponent } from './OceanSpectrum.js';
import type { PhysicsStepBus } from '../sailing/PhysicsStepBus.js';

interface OceanLayer {
  sea: SeaState;
  /** Current blend weight 0..1 (smoothstepped when applied). */
  weight: number;
  /** Weight the layer is moving towards (1 for the newest sea state). */
  target: number;
}

export class OceanSystem implements AppSystem {
  readonly id = 'water.ocean';
  readonly phase = 'prePhysics' as const;
  enabled = true;
  readonly field = new OceanWaveField();
  sea: SeaState = buildSeaState();
  /** Sea states being cross-faded; the newest has target weight 1. */
  private layers: OceanLayer[] = [];
  fadeDurationS = 9;
  private context: AppContext | null = null;
  private installed = false;
  private stepStartTime = 0;
  private stepDt = 1 / 60;
  private substepIndex = 0;
  private substeps = 12;
  private lastFocus = { x: 0, z: 0 };
  private seaInputs: SeaStateInput = { ...this.sea.input };
  private revision = 1;
  private readonly sampleScratch: WaveSample = { height: 0, vx: 0, vy: 0, vz: 0 };
  private legacyOriginal: Record<string, unknown> = {};
  private removeStepListener: (() => void) | null = null;

  constructor(private readonly bus: PhysicsStepBus) {}
  /** Simulation time at the start of the last physics step. */
  time = 0;
  /**
   * Time the rendered surface must show: the end of the last physics step,
   * which is the state the legacy visual sync posed the boat and crew in.
   */
  renderTime = 0;
  fetchM = 6000;
  swellHeightM = 0.12;

  get renderComponents(): { components: WaveComponent[]; revision: number } {
    return { components: this.combinedComponents(true), revision: this.revision };
  }

  get fadeProgress(): number | null {
    return this.layers.length > 1 ? this.layers[this.layers.length - 1]!.weight : null;
  }

  init(context: AppContext): void {
    this.context = context;
    const master = context.legacy.master;
    this.setSea(master.wind?.speed10 ?? 7.2, master.wind?.fromDeg ?? 0, master.config?.sea?.userScale ?? 1, true);
  }

  /**
   * Redirects the legacy ocean object and the physics world to this authority.
   * Idempotent; `uninstall` restores the adapter-stubbed behaviour.
   */
  install(context: AppContext): void {
    if (this.installed) return;
    const master = context.legacy.master;
    const water = master.water;
    const world = master.physics;
    if (!water || !world) throw new Error('legacy water/physics unavailable');
    this.legacyOriginal = {
      height: Object.prototype.hasOwnProperty.call(water, 'height') ? water.height : undefined,
      velocity: Object.prototype.hasOwnProperty.call(water, 'velocity') ? water.velocity : undefined,
      setSea: Object.prototype.hasOwnProperty.call(water, 'setSea') ? water.setSea : undefined,
      update: Object.prototype.hasOwnProperty.call(water, 'update') ? water.update : undefined,
    };
    const field = this.field;
    const sample = this.sampleScratch;
    water.height = (x: number, z: number): number => field.height(x, z);
    water.velocity = (x: number, z: number, out: any): any => {
      field.sample(x, field.height(x, z) - 0.02, z, sample);
      return out?.set ? out.set(sample.vx, sample.vy, sample.vz) : out;
    };
    water.setSea = (windSpeed: number, fromDeg: number): void => {
      this.setSea(windSpeed, fromDeg, master.config?.sea?.userScale ?? 1, false);
    };
    water.update = (): void => {};
    for (const mesh of [water.meshNear, water.meshFar]) if (mesh) mesh.visible = false;

    this.bus.install(world);
    this.removeStepListener = this.bus.onBefore((dt, substeps) => {
      this.beginStep(Number.isFinite(water.time) ? water.time : this.time, dt, substeps, context);
    });
    // Every sub-step starts with force hook 0; wrap it (rather than inserting a
    // hook) so legacy code that addresses forceHooks by index stays valid.
    const firstHook = world.forceHooks[0];
    this.legacyOriginal.firstHook = firstHook;
    world.forceHooks[0] = (dtSub: number): void => {
      this.substepHook(dtSub);
      firstHook?.(dtSub);
    };
    this.installed = true;
  }

  uninstall(context: AppContext): void {
    if (!this.installed) return;
    const master = context.legacy.master;
    const water = master.water;
    const world = master.physics;
    for (const key of ['height', 'velocity', 'setSea', 'update'] as const) {
      const original = this.legacyOriginal[key];
      if (original === undefined) delete water[key];
      else water[key] = original;
    }
    this.removeStepListener?.();
    this.removeStepListener = null;
    if (this.legacyOriginal.firstHook) world.forceHooks[0] = this.legacyOriginal.firstHook;
    this.installed = false;
  }

  get isInstalled(): boolean { return this.installed; }

  private readonly substepHook = (dtSub: number): void => {
    const t = this.stepStartTime + this.substepIndex * dtSub;
    this.field.setQueryTime(t);
    this.substepIndex = Math.min(this.substeps, this.substepIndex + 1);
  };

  /** Called by the physics step wrapper before the XPBD sub-steps. */
  private beginStep(time: number, dt: number, substeps: number, context: AppContext): void {
    // The legacy reset (N key / __sim.reset) rewinds simulation time to zero.
    if (time + 1e-6 < this.stepStartTime) context.events.emit('sailing:reset', { reason: 'legacy simulation time rewound' });
    this.stepStartTime = time;
    this.stepDt = dt;
    this.substeps = Math.max(1, substeps | 0);
    this.substepIndex = 0;
    this.time = time;
    this.renderTime = time + dt;
    this.advanceFade(dt);
    const body = context.legacy.master.body;
    const focusX = Number.isFinite(body?.pos?.x) ? body.pos.x : 0;
    const focusZ = Number.isFinite(body?.pos?.z) ? body.pos.z : 0;
    this.lastFocus.x = focusX;
    this.lastFocus.z = focusZ;
    this.field.advance(time, time + dt, focusX, focusZ);
    this.field.setQueryTime(time);
  }

  /** Prepares the field for queries outside a physics step (e.g. static inspection). */
  prepareStatic(time: number, focusX: number, focusZ: number): void {
    this.field.advance(time, time + this.stepDt, focusX, focusZ);
    this.field.setQueryTime(time);
    this.time = time;
    this.renderTime = time;
  }

  setSea(windSpeed10: number, windFromDeg: number, heightScale: number, immediate: boolean): void {
    const input: SeaStateInput = {
      ...this.seaInputs,
      windSpeed10: Math.max(0.5, windSpeed10),
      windFromDeg,
      heightScale: Math.max(0, heightScale),
      fetchM: this.fetchM,
      swellHeightM: this.swellHeightM,
    };
    const same = Math.abs(input.windSpeed10 - this.seaInputs.windSpeed10) < 1e-3 &&
      Math.abs(input.windFromDeg - this.seaInputs.windFromDeg) < 1e-3 &&
      Math.abs(input.heightScale - this.seaInputs.heightScale) < 1e-4 &&
      Math.abs(input.fetchM - this.seaInputs.fetchM) < 1e-3 &&
      Math.abs(input.swellHeightM - this.seaInputs.swellHeightM) < 1e-4;
    if (same && !immediate) return;
    this.seaInputs = input;
    const next = buildSeaState(input);
    this.sea = next;
    if (immediate || this.layers.length === 0) {
      this.layers = [{ sea: next, weight: 1, target: 1 }];
    } else {
      // Cross-fade: every existing layer fades out while the new one fades in,
      // so overlapping changes never make the surface jump.
      for (const layer of this.layers) layer.target = 0;
      this.layers.push({ sea: next, weight: 0, target: 1 });
      this.applyComponents(false);
      return;
    }
    this.applyComponents();
  }

  private advanceFade(dt: number): void {
    if (this.layers.length <= 1) return;
    const rate = dt / Math.max(0.1, this.fadeDurationS);
    for (const layer of this.layers) {
      layer.weight = layer.target > layer.weight ? Math.min(layer.target, layer.weight + rate) : Math.max(layer.target, layer.weight - rate);
    }
    this.layers = this.layers.filter((layer) => layer.weight > 0 || layer.target > 0);
    this.applyComponents(false);
  }

  private applyComponents(rebuild = true): void {
    this.field.setComponents(this.combinedComponents(false), this.sea.peakWavenumber, rebuild);
    this.revision++;
  }

  /** Physics (and optionally detail) components of every active layer, weighted. */
  private combinedComponents(includeDetail: boolean): WaveComponent[] {
    const out: WaveComponent[] = [];
    for (const layer of this.layers) {
      const w = layer.weight * layer.weight * (3 - 2 * layer.weight);
      if (w <= 0) continue;
      const list = includeDetail ? [...layer.sea.physics, ...layer.sea.detail] : layer.sea.physics;
      for (const c of list) out.push(w === 1 ? c : { ...c, amplitude: c.amplitude * w });
    }
    return out;
  }

  /** 10 m wind speed (m/s) of the sea state being built towards. */
  get windSpeed10(): number { return this.seaInputs.windSpeed10; }

  height(x: number, z: number): number { return this.field.height(x, z); }
  sample(x: number, y: number, z: number, out: WaveSample): WaveSample { return this.field.sample(x, y, z, out); }

  telemetry(): Record<string, unknown> {
    const target = this.sea;
    return {
      installed: this.installed,
      windSpeed10: this.seaInputs.windSpeed10,
      windFromDeg: this.seaInputs.windFromDeg,
      fetchM: this.seaInputs.fetchM,
      heightScale: this.seaInputs.heightScale,
      significantHeightM: target.significantHeightM,
      peakPeriodS: target.peakPeriodS,
      peakWavelengthM: target.peakWavelengthM,
      physicsComponents: this.field.components.length,
      renderComponents: this.combinedComponents(true).length,
      fadeLayers: this.layers.map((layer) => ({ weight: layer.weight, target: layer.target, hs: layer.sea.significantHeightM })),
      field: { ...this.field.stats, extentM: this.field.extentM, spacingM: this.field.spacing, center: [this.field.centerX, this.field.centerZ] },
      time: this.time,
      authority: 'JONSWAP directional Gerstner field; CPU two-slice Eulerian grid for all physics, identical components on the GPU surface',
    };
  }
}
