// Local water interaction: wakes, bow waves, the splash and ripples of a
// capsizing hull, a rig in the water and swimming crew, plus their foam.
//
// A square grid (quality: 256²–512² over 40–64 m) follows the boat. Every
// simulated step the surface-piercing geometry (the physics hull mesh, the
// swimmers, mast and boom) is rasterised from below into a min/max height map,
// the linear free surface (h, φ) is propagated exactly in the Fourier domain
// (deep-water dispersion, so Kelvin wake angles and wave groups are right at
// any speed) and the bodies clamp the surface to their immersion measured
// against the exact physics wave surface. The result (height, slope, foam) is
// sampled by the ocean surface shader on top of the Gerstner sea.
//
// All GPU work is issued from inside RenderSystem's authorised render
// boundary (ScenePipeline calls renderPasses before the scene pass).

import type { AppContext, AppSystem } from '../core/System.js';
import type { OceanSystem } from './OceanSystem.js';
import type { SailingPhysicsSystem } from '../sailing/SailingPhysicsSystem.js';
import type { CrewRecoverySystem } from '../crew/CrewRecoverySystem.js';
import { three, GL } from '../three/ThreeRuntime.js';
import { buildHullMesh } from '../sailing/HullGeometry.js';
import {
  FULLSCREEN_VERTEX, FFT_FRAGMENT, PROPAGATE_FRAGMENT, REALSPACE_FRAGMENT, FOAM_FRAGMENT, COMPOSE_FRAGMENT,
  OBSTACLE_VERTEX, OBSTACLE_FRAGMENT,
} from './WaterInteractionShaders.js';

type DrawFn = (scene: any, camera: any) => void;

const MAX_SPLASHES = 8;
const MIN_EQUATION = 103;
const CUSTOM_BLENDING = 5;

interface Splash { x: number; z: number; radius: number; impulse: number }

/** Low-poly tube following a particle chain (mast / boom) for the obstacle pass. */
class ChainTube {
  readonly geometry: any;
  private readonly positions: Float32Array;
  constructor(readonly nodes: Array<{ x: { x: number; y: number; z: number } }>, readonly radius: number, readonly sides = 6) {
    const T = three();
    const n = nodes.length;
    this.positions = new Float32Array(n * sides * 3);
    const index: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      for (let s = 0; s < sides; s++) {
        const a = i * sides + s, b = i * sides + ((s + 1) % sides), c = a + sides, d = b + sides;
        index.push(a, c, b, b, c, d);
      }
    }
    this.geometry = new T.BufferGeometry();
    this.geometry.setAttribute('position', new T.BufferAttribute(this.positions, 3));
    this.geometry.setIndex(index);
  }

  update(): void {
    const n = this.nodes.length;
    const pos = this.positions;
    for (let i = 0; i < n; i++) {
      const p = this.nodes[i]!.x;
      const q = this.nodes[Math.min(n - 1, i + 1)]!.x, o = this.nodes[Math.max(0, i - 1)]!.x;
      let tx = q.x - o.x, ty = q.y - o.y, tz = q.z - o.z;
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      // Any vector not parallel to the tangent.
      let ax = 0, ay = 1, az = 0;
      if (Math.abs(ty) > 0.9) { ax = 1; ay = 0; }
      let ux = ty * az - tz * ay, uy = tz * ax - tx * az, uz = tx * ay - ty * ax;
      const ul = Math.hypot(ux, uy, uz) || 1;
      ux /= ul; uy /= ul; uz /= ul;
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      for (let s = 0; s < this.sides; s++) {
        const a = (s / this.sides) * Math.PI * 2;
        const c = Math.cos(a) * this.radius, sn = Math.sin(a) * this.radius;
        const o3 = (i * this.sides + s) * 3;
        pos[o3] = p.x + ux * c + vx * sn;
        pos[o3 + 1] = p.y + uy * c + vy * sn;
        pos[o3 + 2] = p.z + uz * c + vz * sn;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }
}

export class WaterInteractionSystem implements AppSystem {
  readonly id = 'water.interaction';
  readonly phase = 'preRender' as const;
  enabled = true;
  active = false;
  supported = true;
  /** Obstacle coupling (0 disables wakes, 1 = full displacement). */
  displacement = 1;
  foamHalfLifeS = 2.4;
  private context: AppContext | null = null;
  private N = 0;
  private extent = 0;
  private cell = 0;
  private stateRT: any[] = [];
  private foamRT: any[] = [];
  private foamIndex = 0;
  private stateIndex = 0;
  private composeRT: any = null;
  private obstacleRT: any = null;
  private etaTexture: any = null;
  private etaData = new Float32Array(1);
  private etaN = 0;
  private quadScene: any = null;
  private quadMesh: any = null;
  private quadCamera: any = null;
  private fftMaterial: any = null;
  private propagateMaterial: any = null;
  private realspaceMaterial: any = null;
  private foamMaterial: any = null;
  private composeMaterial: any = null;
  private obstacleScene: any = null;
  private obstacleCamera: any = null;
  private obstacleMaterial: any = null;
  private hullMesh: any = null;
  private swimmerMeshes: any[] = [];
  private tubes: ChainTube[] = [];
  private tubeMeshes: any[] = [];
  private centerX = 0;
  private centerZ = 0;
  private shiftX = 0;
  private shiftZ = 0;
  private pendingDt = 0;
  private lastRenderTime = Number.NaN;
  private splashes: Splash[] = [];
  private readonly clearColor: any;
  private readonly obstacleClear: any;
  private steps = 0;
  private lastPassMs = 0;
  private strokeMemory = new Map<string, number>();
  private readonly matrix: any;
  private readonly offset: any;

  constructor(
    readonly ocean: OceanSystem,
    readonly physics: SailingPhysicsSystem,
    readonly crew: CrewRecoverySystem,
  ) {
    const T = three();
    this.matrix = new T.Matrix4();
    this.offset = new T.Matrix4();
    this.clearColor = new T.Color();
    this.obstacleClear = new T.Color(1e4, 1e4, 0);
  }

  init(context: AppContext): void {
    this.context = context;
    const renderer = context.legacy.renderer;
    const ext = renderer.extensions;
    this.supported = !!(renderer.capabilities?.isWebGL2 && (ext?.has?.('EXT_color_buffer_float') || ext?.get?.('EXT_color_buffer_float')));
    if (!this.supported) return;
    this.allocate(context.quality.current.wakeResolution, context.quality.current.wakeExtentM);
    context.quality.subscribe(() => {
      const q = context.quality.current;
      if (q.wakeResolution !== this.N || q.wakeExtentM !== this.extent) this.allocate(q.wakeResolution, q.wakeExtentM);
    });
  }

  private disposeTargets(): void {
    for (const rt of [...this.stateRT, ...this.foamRT, this.composeRT, this.obstacleRT]) rt?.dispose?.();
    this.stateRT = []; this.foamRT = [];
  }

  private allocate(resolution: number, extentM: number): void {
    const T = three();
    this.disposeTargets();
    const N = 1 << Math.round(Math.log2(Math.max(64, Math.min(1024, resolution))));
    this.N = N;
    this.extent = extentM;
    this.cell = extentM / N;
    const floatTarget = (): any => new T.WebGLRenderTarget(N, N, {
      type: GL.FloatType, format: GL.RGBAFormat, minFilter: GL.NearestFilter, magFilter: GL.NearestFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    });
    this.stateRT = [floatTarget(), floatTarget()];
    this.foamRT = [floatTarget(), floatTarget()];
    this.composeRT = new T.WebGLRenderTarget(N, N, {
      type: GL.HalfFloatType, format: GL.RGBAFormat, minFilter: GL.LinearFilter, magFilter: GL.LinearFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    });
    this.composeRT.texture.name = 'foundry.water.interaction';
    this.obstacleRT = new T.WebGLRenderTarget(N, N, {
      type: GL.HalfFloatType, format: GL.RGBAFormat, minFilter: GL.NearestFilter, magFilter: GL.NearestFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    });
    this.stateIndex = 0;
    this.foamIndex = 0;
    this.needsClear = true;
    if (!this.quadScene) this.buildMaterials();
    this.updateMaterialConstants();
  }

  private needsClear = true;

  private buildMaterials(): void {
    const T = three();
    const quad = new T.BufferGeometry();
    quad.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const make = (fragmentShader: string, uniforms: Record<string, any>): any => new T.ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false,
    });
    this.fftMaterial = make(FFT_FRAGMENT, { uInput: { value: null }, uN: { value: 0 }, uNs: { value: 1 }, uHorizontal: { value: 1 }, uSign: { value: -1 } });
    this.propagateMaterial = make(PROPAGATE_FRAGMENT, {
      uSpectrum: { value: null }, uN: { value: 0 }, uCell: { value: 0.1 }, uDt: { value: 1 / 60 }, uG: { value: 9.81 },
      uDamping: { value: 0.035 }, uHighDamping: { value: 2.5 },
    });
    const splashes = Array.from({ length: MAX_SPLASHES }, () => new T.Vector4());
    const common = (): Record<string, any> => ({
      uN: { value: 0 }, uShift: { value: new T.Vector2() }, uOrigin: { value: new T.Vector2() }, uCell: { value: 0.1 },
      uEta: { value: null }, uEtaGrid: { value: new T.Vector4() }, uObstacle: { value: null },
      uSplash: { value: splashes }, uSplashCount: { value: 0 },
    });
    this.realspaceMaterial = make(REALSPACE_FRAGMENT, { ...common(), uState: { value: null }, uSponge: { value: 14 }, uDisplace: { value: 1 }, uDt: { value: 1 / 60 }, uG: { value: 9.81 } });
    this.foamMaterial = make(FOAM_FRAGMENT, {
      ...common(), uFoam: { value: null }, uState: { value: null }, uDt: { value: 1 / 60 }, uHalfLife: { value: 3.2 },
      uEntryGain: { value: 2.2 }, uExitGain: { value: 1.2 }, uBreakGain: { value: 2.0 },
    });
    // Share the splash array between both passes.
    this.foamMaterial.uniforms.uSplash = this.realspaceMaterial.uniforms.uSplash;
    this.foamMaterial.uniforms.uSplashCount = this.realspaceMaterial.uniforms.uSplashCount;
    this.composeMaterial = make(COMPOSE_FRAGMENT, { uState: { value: null }, uFoam: { value: null }, uN: { value: 0 }, uCell: { value: 0.1 }, uFade: { value: 18 } });
    this.quadMesh = new T.Mesh(quad, this.fftMaterial);
    this.quadMesh.frustumCulled = false;
    this.quadScene = new T.Scene();
    this.quadScene.add(this.quadMesh);
    this.quadCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.obstacleMaterial = new T.ShaderMaterial({
      vertexShader: OBSTACLE_VERTEX, fragmentShader: OBSTACLE_FRAGMENT,
      depthTest: false, depthWrite: false, side: GL.DoubleSide,
      blending: CUSTOM_BLENDING, blendEquation: MIN_EQUATION, blendSrc: GL.OneFactor, blendDst: GL.OneFactor,
      blendEquationAlpha: MIN_EQUATION, blendSrcAlpha: GL.OneFactor, blendDstAlpha: GL.OneFactor,
    });
    this.obstacleScene = new T.Scene();
    this.obstacleCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
    this.obstacleCamera.up.set(0, 0, 1);
  }

  private updateMaterialConstants(): void {
    const N = this.N, cell = this.cell;
    for (const m of [this.fftMaterial, this.propagateMaterial, this.realspaceMaterial, this.foamMaterial, this.composeMaterial]) {
      if (m?.uniforms?.uN) m.uniforms.uN.value = N;
      if (m?.uniforms?.uCell) m.uniforms.uCell.value = cell;
    }
    const half = this.extent / 2;
    this.obstacleCamera.left = -half; this.obstacleCamera.right = half;
    this.obstacleCamera.top = half; this.obstacleCamera.bottom = -half;
    this.obstacleCamera.updateProjectionMatrix();
  }

  /** Builds the obstacle meshes once the legacy rig and physics hull exist. */
  private ensureObstacles(context: AppContext): void {
    if (this.hullMesh) return;
    const T = three();
    // The whole hull envelope displaces the surface (cockpit closed at deck
    // level), so a heeled boat with its sole below the waterline still wakes.
    const mesh = buildHullMesh({ sealedCockpit: true });
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(Array.from(mesh.positions), 3));
    geometry.setIndex(Array.from(mesh.triangles));
    this.hullMesh = new T.Mesh(geometry, this.obstacleMaterial);
    this.hullMesh.matrixAutoUpdate = false;
    this.hullMesh.frustumCulled = false;
    this.obstacleScene.add(this.hullMesh);
    const sphere = new T.SphereGeometry(1, 14, 10);
    for (let i = 0; i < 2; i++) {
      const s = new T.Mesh(sphere, this.obstacleMaterial);
      s.frustumCulled = false;
      s.visible = false;
      this.swimmerMeshes.push(s);
      this.obstacleScene.add(s);
    }
    const rig = context.legacy.master.rig;
    for (const [nodes, radius] of [[rig?.mast, 0.034], [rig?.boom, 0.04]] as const) {
      if (!Array.isArray(nodes) || nodes.length < 2) continue;
      const tube = new ChainTube(nodes, radius);
      const m = new T.Mesh(tube.geometry, this.obstacleMaterial);
      m.frustumCulled = false;
      this.tubes.push(tube);
      this.tubeMeshes.push(m);
      this.obstacleScene.add(m);
    }
  }

  update(_dt: number, context: AppContext): void {
    const water = context.state.get().waterEnabled && context.state.get().mode === 'sailing';
    this.active = this.enabled && this.supported && water && this.N > 0;
    if (!this.active) { this.lastRenderTime = Number.NaN; return; }
    this.ensureObstacles(context);
    const time = this.ocean.renderTime;
    if (Number.isFinite(this.lastRenderTime)) {
      const advance = time - this.lastRenderTime;
      if (advance > 0 && advance < 0.5) this.pendingDt += advance;
      else if (advance < 0) this.needsClear = true; // simulation reset
    }
    this.lastRenderTime = time;
    // Follow the boat in whole cells.
    const body = context.legacy.master.body;
    const cx = Math.round(body.pos.x / this.cell) * this.cell;
    const cz = Math.round(body.pos.z / this.cell) * this.cell;
    if (this.needsClear) { this.centerX = cx; this.centerZ = cz; this.shiftX = 0; this.shiftZ = 0; }
    else if (cx !== this.centerX || cz !== this.centerZ) {
      this.shiftX += Math.round((cx - this.centerX) / this.cell);
      this.shiftZ += Math.round((cz - this.centerZ) / this.cell);
      this.centerX = cx; this.centerZ = cz;
    }
    this.collectSplashes(context);
  }

  /** Swimmer strokes: hands entering the water and kicking feet. */
  private collectSplashes(context: AppContext): void {
    void context;
    const out = this.splashes;
    for (const s of this.crew.swimmerStates()) {
      if (!s.active || !s.inWater) continue;
      const throttle = s.throttle;
      const phase = s.strokePhase;
      const last = this.strokeMemory.get(s.id) ?? phase;
      this.strokeMemory.set(s.id, phase);
      const hx = s.heading.x, hz = s.heading.z;
      const sx = -hz, sz = hx;
      const horizontal = 1 - s.verticality;
      // A hand enters at each half cycle.
      if (throttle > 0.15 && Math.floor(phase * 2) !== Math.floor(last * 2) && out.length < MAX_SPLASHES) {
        const side = Math.floor(phase * 2) % 2 === 0 ? 1 : -1;
        out.push({ x: s.x + hx * 0.62 + sx * 0.24 * side, z: s.z + hz * 0.62 + sz * 0.24 * side, radius: 0.14, impulse: -0.035 * throttle * (0.4 + 0.6 * horizontal) });
      }
      // Flutter kick / treading: small continuous disturbance.
      if (out.length < MAX_SPLASHES) {
        const kick = throttle > 0.15 ? 0.012 * throttle * horizontal : 0.004 * s.treading;
        const wobble = Math.sin(phase * Math.PI * 6);
        out.push({ x: s.x - hx * 0.85 * horizontal, z: s.z - hz * 0.85 * horizontal, radius: 0.2, impulse: kick * wobble });
      }
    }
  }

  /** GPU passes; called by ScenePipeline inside the authorised render. */
  renderPasses(renderer: any, draw: DrawFn): void {
    if (!this.active || !this.hullMesh) return;
    const dt = Math.min(this.pendingDt, 0.05);
    const started = performance.now();
    const previousTarget = renderer.getRenderTarget?.() ?? null;
    const autoClear = renderer.autoClear;
    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    try {
      renderer.autoClear = false;
      if (this.needsClear) {
        renderer.setClearColor(0x000000, 0);
        for (const rt of [...this.stateRT, ...this.foamRT, this.composeRT]) { renderer.setRenderTarget(rt); renderer.clear(true, false, false); }
        this.needsClear = false;
      }
      if (dt > 1e-5) {
        this.renderObstacles(renderer, draw);
        this.uploadEta();
        this.simulate(renderer, draw, dt);
        this.pendingDt = 0;
        this.splashes.length = 0;
        this.shiftX = 0; this.shiftZ = 0;
        this.steps++;
      }
      this.renderQuad(renderer, draw, this.composeMaterial, this.composeRT, (u) => {
        u.uState.value = this.stateRT[this.stateIndex].texture;
        u.uFoam.value = this.foamRT[this.foamIndex].texture;
      });
    } finally {
      renderer.setClearColor(this.clearColor, clearAlpha);
      renderer.setRenderTarget(previousTarget);
      renderer.autoClear = autoClear;
    }
    this.lastPassMs = performance.now() - started;
  }

  private renderObstacles(renderer: any, draw: DrawFn): void {
    const master = this.context!.legacy.master;
    const body = master.body;
    const ref = master.bodyReference ?? { y: 0.3, z: -0.15 };
    this.offset.makeTranslation(0, -(ref.y ?? 0.3), -(ref.z ?? -0.15));
    this.matrix.compose(body.pos, body.quat, { x: 1, y: 1, z: 1, isVector3: true });
    this.hullMesh.matrix.multiplyMatrices(this.matrix, this.offset);
    this.hullMesh.matrixWorldNeedsUpdate = true;
    const swimmers = this.crew.swimmerStates();
    this.swimmerMeshes.forEach((mesh, i) => {
      const s = swimmers[i];
      mesh.visible = !!s?.active;
      if (!s?.active) return;
      mesh.position.set(s.x, s.y, s.z);
      mesh.rotation.set(0, Math.atan2(s.heading.x, s.heading.z), 0);
      const along = 0.26 + 0.62 * (1 - s.verticality);
      mesh.scale.set(0.24, 0.24 + 0.18 * s.verticality, along);
    });
    for (const tube of this.tubes) tube.update();
    this.obstacleCamera.position.set(this.centerX, -30, this.centerZ);
    this.obstacleCamera.lookAt(this.centerX, 0, this.centerZ);
    this.obstacleCamera.updateMatrixWorld();
    renderer.setRenderTarget(this.obstacleRT);
    renderer.setClearColor(this.obstacleClear, 1);
    renderer.clear(true, false, false);
    draw(this.obstacleScene, this.obstacleCamera);
  }

  private uploadEta(): void {
    const field = this.ocean.field;
    const n = field.nx;
    if (!this.etaTexture || this.etaN !== n) {
      const T = three();
      this.etaN = n;
      this.etaData = new Float32Array(n * field.nz * 4);
      this.etaTexture?.dispose?.();
      this.etaTexture = new T.DataTexture(this.etaData, n, field.nz, GL.RGBAFormat, GL.FloatType);
      this.etaTexture.minFilter = GL.NearestFilter;
      this.etaTexture.magFilter = GL.NearestFilter;
      this.etaTexture.generateMipmaps = false;
      this.heights = new Float32Array(n * field.nz);
    }
    if (field.copyEndHeights(this.heights)) {
      const h = this.heights, d = this.etaData;
      for (let i = 0; i < h.length; i++) d[i * 4] = h[i]!;
      this.etaTexture.needsUpdate = true;
    }
    for (const m of [this.realspaceMaterial, this.foamMaterial]) {
      m.uniforms.uEta.value = this.etaTexture;
      m.uniforms.uEtaGrid.value.set(field.gridOriginX, field.gridOriginZ, field.spacing, n);
    }
  }

  private heights = new Float32Array(1);

  private renderQuad(renderer: any, draw: DrawFn, material: any, target: any, set: (u: any) => void): void {
    set(material.uniforms);
    this.quadMesh.material = material;
    renderer.setRenderTarget(target);
    draw(this.quadScene, this.quadCamera);
  }

  private simulate(renderer: any, draw: DrawFn, dt: number): void {
    const N = this.N;
    let src = this.stateIndex;
    const pass = (material: any, set: (u: any) => void): void => {
      const dst = 1 - src;
      this.renderQuad(renderer, draw, material, this.stateRT[dst], (u) => { set(u); });
      src = dst;
    };
    const fft = (sign: number): void => {
      for (const horizontal of [1, 0]) {
        for (let ns = 1; ns < N; ns *= 2) {
          const input = this.stateRT[src].texture;
          pass(this.fftMaterial, (u) => { u.uInput.value = input; u.uNs.value = ns; u.uHorizontal.value = horizontal; u.uSign.value = sign; });
        }
      }
    };
    fft(-1);
    const spectrum = this.stateRT[src].texture;
    pass(this.propagateMaterial, (u) => { u.uSpectrum.value = spectrum; u.uDt.value = dt; });
    fft(1);
    // Real space: shift, sponge, obstacles, splashes.
    const half = this.extent / 2;
    const originX = this.centerX - half + 0.5 * this.cell, originZ = this.centerZ - half + 0.5 * this.cell;
    const splashes = this.splashes.slice(0, MAX_SPLASHES);
    const vectors = this.realspaceMaterial.uniforms.uSplash.value as any[];
    splashes.forEach((s, i) => vectors[i].set(s.x, s.z, s.radius, s.impulse));
    this.realspaceMaterial.uniforms.uSplashCount.value = splashes.length;
    const propagated = this.stateRT[src].texture;
    pass(this.realspaceMaterial, (u) => {
      u.uState.value = propagated;
      u.uShift.value.set(this.shiftX, this.shiftZ);
      u.uOrigin.value.set(originX, originZ);
      u.uObstacle.value = this.obstacleRT.texture;
      u.uDisplace.value = this.displacement;
      u.uDt.value = dt;
    });
    this.stateIndex = src;
    // Foam follows the same shift.
    const foamSrc = this.foamIndex, foamDst = 1 - foamSrc;
    this.renderQuad(renderer, draw, this.foamMaterial, this.foamRT[foamDst], (u) => {
      u.uFoam.value = this.foamRT[foamSrc].texture;
      u.uState.value = this.stateRT[this.stateIndex].texture;
      u.uShift.value.set(this.shiftX, this.shiftZ);
      u.uOrigin.value.set(originX, originZ);
      u.uObstacle.value = this.obstacleRT.texture;
      u.uDt.value = dt;
      u.uHalfLife.value = this.foamHalfLifeS;
    });
    this.foamIndex = foamDst;
  }

  get cellM(): number { return this.cell; }

  /** Binding consumed by the ocean surface shader. */
  get binding(): { texture: any; originX: number; originZ: number; size: number; enabled: boolean } {
    const half = this.extent / 2;
    return {
      texture: this.composeRT?.texture ?? null,
      originX: this.centerX - half,
      originZ: this.centerZ - half,
      size: this.extent,
      enabled: this.active && !!this.composeRT && this.steps > 0,
    };
  }

  telemetry(): Record<string, unknown> {
    return {
      supported: this.supported,
      active: this.active,
      resolution: this.N,
      extentM: this.extent,
      cellM: this.cell,
      steps: this.steps,
      passesPerStep: this.N ? 4 * Math.log2(this.N) + 2 : 0,
      lastGpuSubmitMs: this.lastPassMs,
      center: [this.centerX, this.centerZ],
      obstacles: { hull: !!this.hullMesh, swimmers: this.swimmerMeshes.length, spars: this.tubes.length },
      authority: 'spectral (FFT) linear free surface with exact deep-water dispersion; hull/swimmer/spar immersion against the physics sea clamps the surface; foam from entry, breaking and splashes',
    };
  }

  dispose(): void {
    this.disposeTargets();
    this.etaTexture?.dispose?.();
  }
}
