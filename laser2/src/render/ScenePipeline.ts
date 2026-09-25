// HDR scene pipeline used whenever the native ocean surface is visible.
//
//   1. The legacy scene (sky, boat, rig, crew) renders scene-linear into a
//      4× MSAA half-float target with a float depth texture.
//   2. A full-screen composite writes that colour (tone mapped once by the
//      renderer's ACES transform) and its resolved depth to the canvas.
//   3. The ocean surface renders on top, depth-tested against the composite,
//      refracting the HDR colour and measuring the water column from the depth.
//
// Transparent legacy objects stay in pass 1: they are thin rig/sail details
// that are never seen through the water surface from above.

import { three, GL } from '../three/ThreeRuntime.js';
import { COMPOSITE_FRAGMENT_SHADER, COMPOSITE_VERTEX_SHADER } from '../water/WaterShaders.js';
import type { WaterSurfaceSystem } from '../water/WaterSurfaceSystem.js';
import type { AtmosphereSystem } from '../lighting/atmosphere/AtmosphereSystem.js';
import type { WaterInteractionSystem } from '../water/WaterInteractionSystem.js';

type DrawFn = (scene: any, camera: any) => void;

export class ScenePipeline {
  samples = 4;
  private target: any = null;
  private width = 0;
  private height = 0;
  private compositeScene: any = null;
  private compositeCamera: any = null;
  private compositeMaterial: any = null;
  private sizeScratch: any = null;
  private frames = 0;
  private targetRebuilds = 0;
  private lastCalls = 0;
  private lastTriangles = 0;
  private lastError: string | null = null;

  constructor(
    readonly water: WaterSurfaceSystem,
    readonly atmosphere: AtmosphereSystem,
    readonly interaction: WaterInteractionSystem | null = null,
  ) {}

  get active(): boolean { return this.water.active && !!this.water.material; }

  private ensureResources(renderer: any): void {
    const T = three();
    if (!this.sizeScratch) this.sizeScratch = new T.Vector2();
    const size = renderer.getDrawingBufferSize(this.sizeScratch);
    const width = Math.max(1, Math.floor(size.x));
    const height = Math.max(1, Math.floor(size.y));
    if (!this.compositeScene) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
      this.compositeMaterial = new T.ShaderMaterial({
        name: 'foundry.render.hdr-composite.v8',
        vertexShader: COMPOSITE_VERTEX_SHADER,
        fragmentShader: COMPOSITE_FRAGMENT_SHADER,
        uniforms: { uColor: { value: null }, uDepth: { value: null } },
        depthTest: true,
        depthWrite: true,
        depthFunc: GL.AlwaysDepth,
      });
      const quad = new T.Mesh(geometry, this.compositeMaterial);
      quad.frustumCulled = false;
      quad.name = 'foundry.render.hdr-composite';
      this.compositeScene = new T.Scene();
      this.compositeScene.add(quad);
      this.compositeCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    if (this.target && width === this.width && height === this.height) return;
    this.target?.depthTexture?.dispose?.();
    this.target?.dispose?.();
    const depthTexture = new T.DepthTexture(width, height);
    depthTexture.type = GL.FloatType;
    depthTexture.format = GL.DepthFormat;
    depthTexture.minFilter = GL.NearestFilter;
    depthTexture.magFilter = GL.NearestFilter;
    this.target = new T.WebGLRenderTarget(width, height, {
      type: GL.HalfFloatType,
      format: GL.RGBAFormat,
      minFilter: GL.LinearFilter,
      magFilter: GL.LinearFilter,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false,
      samples: this.samples,
      depthTexture,
    });
    this.target.texture.name = 'foundry.render.hdr-scene-color';
    this.width = width;
    this.height = height;
    this.targetRebuilds++;
  }

  render(renderer: any, scene: any, camera: any, draw: DrawFn): void {
    this.ensureResources(renderer);
    const info = renderer.info;
    const autoClear = renderer.autoClear;
    const autoReset = info?.autoReset;
    const previousTarget = renderer.getRenderTarget?.() ?? null;
    if (info) { info.autoReset = false; info.reset(); }
    try {
      // Pass 0: local water-interaction solver (wake, ripples, foam).
      this.interaction?.renderPasses(renderer, draw);
      // Pass 1: scene-linear HDR scene.
      this.atmosphere.setLinearOutput(true);
      renderer.setRenderTarget(this.target);
      renderer.autoClear = true;
      draw(scene, camera);
      this.atmosphere.setLinearOutput(false);
      // Pass 2: composite colour + depth to the canvas.
      renderer.setRenderTarget(previousTarget);
      renderer.autoClear = false;
      renderer.clear(true, true, true);
      this.compositeMaterial.uniforms.uColor.value = this.target.texture;
      this.compositeMaterial.uniforms.uDepth.value = this.target.depthTexture;
      draw(this.compositeScene, this.compositeCamera);
      // Pass 3: ocean surface over the composite.
      this.water.bindScene(this.target.texture, this.target.depthTexture, this.width, this.height);
      draw(this.water.scene, camera);
      this.frames++;
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.atmosphere.setLinearOutput(false);
      renderer.autoClear = autoClear;
      if (info) {
        this.lastCalls = info.render?.calls ?? 0;
        this.lastTriangles = info.render?.triangles ?? 0;
        info.autoReset = autoReset;
      }
    }
  }

  telemetry(): Record<string, unknown> {
    return {
      active: this.active,
      frames: this.frames,
      target: this.target ? { width: this.width, height: this.height, samples: this.samples, color: 'RGBA16F', depth: 'DEPTH_COMPONENT32F texture' } : null,
      targetRebuilds: this.targetRebuilds,
      calls: this.lastCalls,
      triangles: this.lastTriangles,
      lastError: this.lastError,
      passes: ['scene-linear HDR MSAA scene', 'ACES composite with depth', 'ocean surface with refraction'],
    };
  }

  dispose(): void {
    this.target?.depthTexture?.dispose?.();
    this.target?.dispose?.();
    this.compositeMaterial?.dispose?.();
    this.target = null;
  }
}
