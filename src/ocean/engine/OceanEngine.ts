/**
 * THALASSA — ocean engine orchestrator.
 *
 * Pass graph per frame:
 *   sky bake (throttled) → spectral T0 (evolve, FFT, resolve, foam)
 *   → [T3 interaction tiles] → [T2 shore field] → [spray]
 *   → opaque (sky, terrain, hulls) → water surface → [spray composite]
 *   → bloom + tonemap
 *
 * The HydroEscalationScheduler (lod/) decides which optional tiers run where;
 * this class only executes what it is told and reports receipts/telemetry.
 */
import { createGL, GpuTimers, type GL, type GLCaps } from '../gl/context';
import { SpectralOcean } from '../ocean/SpectralOcean';
import { Sky } from '../render/sky';
import { seaMorphForWind, seaWindDirAt, relaxSeaMorph, weatherLabel } from '../atmos/weather';
import { OceanSurface, type SurfaceFrame, type TileBinding, type ShoreBinding } from '../render/OceanSurface';
import { WindWaves } from '../ocean/windWaves';
import { Post } from '../render/post';
import { Camera, FlyController, type CameraPose } from './camera';
import { defaultSettings, QUALITY, WATER_TYPES, opticsFor, type EngineSettings, type QualityName } from './settings';
import { SEA_STATES } from '../spectrum/seaStates';
import type { Vec3 } from '../math/mat4';
import type { WaterQuery, WaterSample } from '../physics/bodies';
import { Target, createTexture, FMT } from '../gl/context';

export interface EngineTelemetry {
  fps: number;
  frameMs: number;
  cpuMs: number;
  triangles: number;
  nodes: number;
  gpu: Record<string, number>;
  hs: number;
  tp: number;
  peakWavelength: number;
  seaLabel: string;
  weatherLabel: string;
  windSpeed: number;
  seaCoupled: boolean;
  time: number;
  camera: CameraPose;
  tiles: number;
  sprayLive: number;
  shoreActive: boolean;
  receipts: number;
}

/** Hook points for optional subsystems (interaction tiles, shore, bodies, spray, scheduler). */
export interface EngineModule {
  name: string;
  /** Simulation step (before rendering). */
  update?(engine: OceanEngine, time: number, dt: number): void;
  /** Contribute T3 tiles / T2 shore bindings to the surface draw. */
  surfaceBindings?(engine: OceanEngine): { tiles?: TileBinding[]; tileArray?: WebGLTexture; shore?: ShoreBinding | null };
  /** Draw opaque geometry into the HDR target (after sky, before water). Return true if anything was drawn. */
  drawOpaque?(engine: OceanEngine): boolean | void;
  /** Draw transparent effects after the water surface. */
  drawTransparent?(engine: OceanEngine): void;
  /** Telemetry contributions. */
  telemetry?(t: EngineTelemetry): void;
  dispose?(): void;
}

export class OceanEngine {
  readonly gl: GL;
  readonly caps: GLCaps;
  readonly settings: EngineSettings;
  readonly camera = new Camera();
  readonly timers: GpuTimers;
  ocean: SpectralOcean;
  sky: Sky;
  surface: OceanSurface;
  /** POSEIDON wind field + micro waves, driven by the weather. */
  wind: WindWaves;
  post: Post;
  controller: FlyController | null = null;
  modules: EngineModule[] = [];

  time = 0;
  frameIndex = 0;
  skyE: Vec3 = [1, 1, 1];
  private raf = 0;
  private lastNow = 0;
  private seaDirty = false;
  private seaChangedAt = 0;
  private cpuProductsPending = false;
  private fpsAcc = { frames: 0, t0: 0, fps: 0 };
  private listeners = new Set<(t: EngineTelemetry) => void>();
  telemetry: EngineTelemetry;
  /** When true (captures/tests), time advances by exactly fixedDt per frame. */
  fixedDt = 0;
  onPick: ((world: Vec3 | null, e: MouseEvent) => void) | null = null;
  readonly quality: QualityName;
  /**
   * Height providers layered over the spectral mirror (interaction tiles add,
   * the shore field may replace). Order = tier order.
   */
  heightProviders: ((x: number, z: number, h: number) => number)[] = [];
  /** Composite water query for physics and gameplay (deterministic T0 + async T2/T3). */
  readonly water: WaterQuery = { sample: (x, z) => this.sampleWater(x, z) };
  private sceneTarget: Target | null = null;

  constructor(readonly canvas: HTMLCanvasElement, opts: { quality?: QualityName; seed?: number; settings?: Partial<EngineSettings> } = {}) {
    const { gl, caps } = createGL(canvas);
    this.gl = gl;
    this.caps = caps;
    this.quality = opts.quality ?? 'high';
    this.settings = { ...defaultSettings(this.quality), ...(opts.settings ?? {}) };
    const q = QUALITY[this.quality];
    this.timers = new GpuTimers(gl, caps.timer);
    this.ocean = new SpectralOcean(gl, caps, { n: q.fftN, sizes: q.cascadeSizes, seed: opts.seed ?? 20260925, mirrorSize: q.mirrorN });
    this.sky = new Sky(gl, q.sky);
    this.surface = new OceanSurface(gl, q.grid);
    this.wind = new WindWaves(gl, q.windN, q.windN);
    this.post = new Post(gl);
    this.camera.setPose({ position: [0, 7, 0], yawDeg: 40, pitchDeg: -7, fovDeg: 55 });
    this.applySea(true);
    this.telemetry = this.emptyTelemetry();
  }

  private emptyTelemetry(): EngineTelemetry {
    return {
      fps: 0, frameMs: 0, cpuMs: 0, triangles: 0, nodes: 0, gpu: {}, hs: 0, tp: 0, peakWavelength: 0, seaLabel: '', weatherLabel: '', windSpeed: 0, seaCoupled: false,
      time: 0, camera: this.camera.pose(), tiles: 0, sprayLive: 0, shoreActive: false, receipts: 0,
    };
  }

  attachControls() {
    this.controller = new FlyController(this.canvas, this.camera, (x, y, e) => this.onPick?.(this.pickWater(x, y), e));
  }

  addModule(m: EngineModule) {
    this.modules.push(m);
    return m;
  }

  onTelemetry(fn: (t: EngineTelemetry) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Mark the sea state changed: GPU h0 regenerates immediately, CPU products are debounced. */
  markSeaDirty() {
    this.seaDirty = true;
    this.seaChangedAt = performance.now();
  }

  setWaterType(id: string) {
    const t = WATER_TYPES.find((w) => w.id === id) ?? WATER_TYPES[0];
    this.settings.waterType = t.id;
    const o = this.settings.optics;
    Object.assign(o, opticsFor(t, { ior: o.ior, sss: o.sss, glitter: o.glitter, roughnessGain: o.roughnessGain, fogDensity: o.fogDensity, foamGain: o.foamGain, foamDetailDist: o.foamDetailDist }));
  }

  private applySea(full: boolean) {
    this.ocean.foam = this.settings.foam;
    this.ocean.setSea(this.settings.sea, { loopPeriod: this.settings.loopPeriod, rebuildStats: full });
    if (!full) this.cpuProductsPending = true;
  }

  sampleWater(x: number, z: number): WaterSample {
    const s = this.ocean.mirror.sample(x, z);
    let h = s.height;
    for (const p of this.heightProviders) h = p(x, z, h);
    return { height: h, vx: s.vx, vy: s.vy, vz: s.vz, normal: s.normal };
  }

  /** Copy the opaque frame (colour + depth) so the water can refract what lies beneath it. */
  private captureScene() {
    const gl = this.gl;
    const w = this.post.width, h = this.post.height;
    if (!this.sceneTarget || this.sceneTarget.width !== w || this.sceneTarget.height !== h) {
      this.sceneTarget?.dispose();
      this.sceneTarget = new Target(gl, w, h, [createTexture(gl, w, h, { ...FMT.rgba16f(gl), filter: gl.LINEAR })], 'texture');
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.post.hdr.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.sceneTarget.fbo);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    this.sceneBinding = {
      color: this.sceneTarget.texture,
      depth: this.sceneTarget.depth as WebGLTexture,
      viewport: [w, h],
      near: this.camera.near,
      far: this.camera.far,
    };
  }

  private coupledMorph = -1;
  private coupledDir = 0;
  /**
   * The sea listens to the weather: the wind-sea relaxes toward the state the
   * current U10 sustains (duration-limited growth) and turns with the wind.
   * The spectrum is re-synthesised only when the state has moved perceptibly.
   */
  private coupleWeather(dt: number) {
    const w = this.settings.weather;
    if (!w.coupleSea || dt <= 0) { this.coupledMorph = -1; return; }
    const sea = this.settings.sea;
    const next = relaxSeaMorph(sea.morph, seaMorphForWind(w.windSpeed), dt, w.seaResponse);
    const dir = ((w.windDirDeg - seaWindDirAt(next)) % 360 + 540) % 360 - 180;
    sea.morph = next;
    if (this.coupledMorph < 0 || Math.abs(next - this.coupledMorph) > 0.02 || Math.abs(dir - this.coupledDir) > 2) {
      this.coupledMorph = next;
      this.coupledDir = dir;
      sea.directionOffsetDeg = dir;
      this.markSeaDirty();
    }
  }

  /** Ray from NDC through the mean sea plane (y=0) → world point. */
  pickWater(ndcX: number, ndcY: number): Vec3 | null {
    const m = this.camera.invViewProj;
    if (!m) return null;
    const p = (z: number) => {
      const x = m[0] * ndcX + m[4] * ndcY + m[8] * z + m[12];
      const y = m[1] * ndcX + m[5] * ndcY + m[9] * z + m[13];
      const zz = m[2] * ndcX + m[6] * ndcY + m[10] * z + m[14];
      const w = m[3] * ndcX + m[7] * ndcY + m[11] * z + m[15];
      return [x / w, y / w, zz / w];
    };
    const a = p(-1), b = p(1);
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const cam = this.camera.position;
    // camera-relative: plane y = -cam.y
    if (Math.abs(d[1]) < 1e-9) return null;
    const t = (-cam[1] - a[1]) / d[1];
    if (t < 0) return null;
    return [cam[0] + a[0] + d[0] * t, 0, cam[2] + a[2] + d[2] * t];
  }

  start() {
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  /** Resize the drawing buffer to CSS size × dpr × renderScale. */
  private resize() {
    const q = QUALITY[this.quality];
    const dpr = Math.min(window.devicePixelRatio || 1, q.maxDpr) * q.renderScale;
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.post.resize(w, h);
  }

  frame(now: number = performance.now()) {
    const t0 = performance.now();
    const gl = this.gl;
    const s = this.settings;
    const realDt = this.lastNow ? Math.min((now - this.lastNow) / 1000, 0.1) : 1 / 60;
    this.lastNow = now;
    const dt = this.fixedDt > 0 ? this.fixedDt : s.paused ? 0 : realDt * s.timeScale;
    this.time += dt;
    this.frameIndex++;

    if (this.seaDirty) {
      this.seaDirty = false;
      this.applySea(false);
    }
    if (this.cpuProductsPending && performance.now() - this.seaChangedAt > 160) {
      this.cpuProductsPending = false;
      this.ocean.rebuildCpuProducts();
    }

    this.controller?.update(realDt);
    this.resize();
    this.camera.update(this.canvas.width / this.canvas.height);

    this.timers.poll();
    this.timers.begin('sky');
    this.coupleWeather(dt);
    const baked = this.sky.update(s.sky, s.weather, this.time, dt, this.camera.position);
    this.timers.end();
    if (baked) this.skyE = this.sky.irradiance();
    this.cloudShadow = this.sky.shadow;

    this.timers.begin('spectral');
    this.ocean.update(this.time, dt);
    this.wind.update(s.weather, this.time, dt);
    this.timers.end();
    if (this.ocean.mirror.ready) this.ocean.mirror.evaluate(this.time);

    for (const m of this.modules) m.update?.(this, this.time, dt);

    // ── render ──
    const post = this.post;
    this.timers.begin('clouds');
    this.sky.renderView({
      pixelAngle: (2 * Math.tan((this.camera.fov * Math.PI) / 360)) / post.height,
      invViewProj: this.camera.invViewProj, viewProj: this.camera.viewProj, width: post.width, height: post.height,
      camPos: this.camera.position, frameIndex: this.frameIndex,
    });
    this.timers.end();
    post.hdr.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.sky.drawBackground(this.camera.invViewProj);
    let opaque = false;
    for (const m of this.modules) opaque = (m.drawOpaque?.(this) === true) || opaque;
    if (opaque) this.captureScene();
    else this.sceneBinding = null;

    let tiles: TileBinding[] = [];
    let tileArray: WebGLTexture | null = null;
    let shore: ShoreBinding | null = null;
    for (const m of this.modules) {
      const b = m.surfaceBindings?.(this);
      if (b?.tiles) tiles = tiles.concat(b.tiles);
      if (b?.tileArray) tileArray = b.tileArray;
      if (b?.shore) shore = b.shore;
    }
    const frame: SurfaceFrame = {
      viewProj: this.camera.viewProj,
      invViewProj: this.camera.invViewProj,
      cam: this.camera.position,
      time: this.time,
      env: this.sky.texture,
      envLevels: this.sky.levels,
      envWidth: this.sky.size[0],
      sunDir: this.sky.sunDir,
      sunE: this.sky.sunRadiance,
      skyE: this.skyE,
      optics: s.optics,
      surface: s.surface,
      debug: s.debug,
      earthRadius: s.earthCurvature ? 6.36e6 : 0,
      tiles,
      tileArray,
      shore,
      tierMap: this.tierMap,
      terrain: this.terrainBinding,
      scene: this.sceneBinding,
      near: this.camera.near,
      far: this.camera.far,
      cloud: this.cloudShadow,
      rain: s.weather.precipitation,
      haze: s.weather.haze,
      wind: this.wind,
      hdr: post.hdr,
      aerial: this.sky.aerial ? { inscatter: this.sky.aerial.textures[0], transmittance: this.sky.aerial.textures[1] } : null,
    };
    post.hdr.bind();
    this.timers.begin('surface');
    this.surface.draw(this.ocean, frame);
    this.timers.end();
    for (const m of this.modules) m.drawTransparent?.(this);
    // Clouds between the camera and the surfaces (camera in/above the deck, peaks in cloud).
    post.hdr.bind();
    this.sky.drawOverlay(this.camera.invViewProj, this.sceneBinding?.depth ?? null);

    this.timers.begin('post');
    post.present(s.post, this.time);
    this.timers.end();

    // ── telemetry ──
    const cpuMs = performance.now() - t0;
    const a = this.fpsAcc;
    a.frames++;
    if (!a.t0) a.t0 = now;
    if (now - a.t0 > 500) {
      a.fps = (a.frames * 1000) / (now - a.t0);
      a.frames = 0;
      a.t0 = now;
      const st = this.ocean.stats;
      const t: EngineTelemetry = {
        ...this.emptyTelemetry(),
        fps: a.fps,
        frameMs: 1000 / Math.max(a.fps, 1e-3),
        cpuMs,
        triangles: this.surface.triangles,
        nodes: 0,
        gpu: Object.fromEntries(this.timers.ms),
        hs: st?.hs ?? 0,
        tp: st?.tp ?? 0,
        peakWavelength: st?.peakWavelength ?? 0,
        seaLabel: this.ocean.label(s.sea.morph),
        weatherLabel: weatherLabel(s.weather.morph),
        windSpeed: s.weather.windSpeed,
        seaCoupled: s.weather.coupleSea,
        time: this.time,
        camera: this.camera.pose(),
      };
      for (const m of this.modules) m.telemetry?.(t);
      this.telemetry = t;
      this.listeners.forEach((fn) => fn(t));
    }
  }

  /** Optional overlays other modules provide. */
  tierMap: SurfaceFrame['tierMap'] = null;
  sceneBinding: SurfaceFrame['scene'] = null;
  terrainBinding: SurfaceFrame['terrain'] = null;
  /** Cloud-shadow map provided by the weather module (lighting authority). */
  cloudShadow: { texture: WebGLTexture; rect: [number, number, number]; strength: number } | null = null;

  static get seaStates() {
    return SEA_STATES;
  }

  dispose() {
    this.stop();
    this.controller?.dispose();
    this.modules.forEach((m) => m.dispose?.());
    this.ocean.dispose();
    this.sky.dispose();
    this.surface.dispose();
    this.wind.dispose();
    this.post.dispose();
    this.sceneTarget?.dispose();
  }
}
