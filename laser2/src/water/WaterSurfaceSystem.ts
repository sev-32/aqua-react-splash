// Native ocean surface renderer.
//
// A camera-centred radial grid (≈45k vertices, spacing growing geometrically
// from 0.1 m to kilometres) carries the same Gerstner components as the CPU
// physics field. The shader filters components by vertex spacing (geometry)
// and pixel footprint (shading), consumes the atmosphere LUT, spectral sun,
// sky irradiance, sun shadow map and aerial-perspective law of the Foundry
// lighting authorities, and refracts the opaque HDR scene with depth-based
// Beer–Lambert absorption supplied by ScenePipeline.

import type { AppContext, AppSystem, FoundryMode } from '../core/System.js';
import type { OceanSystem } from './OceanSystem.js';
import type { RadiometricCouplingSystem } from '../lighting/RadiometricCouplingSystem.js';
import type { AtmosphereSystem } from '../lighting/atmosphere/AtmosphereSystem.js';
import type { LightingState } from '../lighting/LightingState.js';
import { SKY_RELATIVE_TO_LUX } from '../lighting/RadiometricCouplingSystem.js';
import { SKY_LINEAR_DISPLAY_SCALE } from '../lighting/atmosphere/AtmosphereSystem.js';
import { three, GL } from '../three/ThreeRuntime.js';
import { MAX_WAVES, WATER_VERTEX_SHADER, WATER_FRAGMENT_SHADER } from './WaterShaders.js';
import type { WaterInteractionSystem } from './WaterInteractionSystem.js';

export interface WaterOptics {
  /** Absorption coefficient a (1/m) at ~650/550/450 nm. */
  absorption: [number, number, number];
  /** Total scattering coefficient b (1/m); with a it sets beam attenuation. */
  scattering: [number, number, number];
  /** Backscattering coefficient b_b (1/m); sets the water-leaving colour. */
  backscatter: [number, number, number];
  refractionStrength: number;
  foamAmount: number;
}

export const DEFAULT_WATER_OPTICS: WaterOptics = {
  // Clear coastal sea: pure-water absorption (Pope & Fry) plus a little CDOM
  // in the blue; particulate scattering ~0.1/m with a 1.5 % backscatter ratio
  // on top of molecular backscatter. Remote-sensing reflectance from these
  // (Lee et al. 1999) peaks in the blue at ~0.006/sr: a deep blue-teal sea.
  absorption: [0.40, 0.075, 0.04],
  scattering: [0.10, 0.12, 0.14],
  backscatter: [0.0022, 0.0040, 0.0050],
  refractionStrength: 0.045,
  foamAmount: 0.85,
};

export class WaterSurfaceSystem implements AppSystem {
  readonly id = 'water.surface';
  readonly phase = 'preRender' as const;
  enabled = true;
  active = false;
  readonly scene: any;
  mesh: any = null;
  material: any = null;
  optics: WaterOptics = { ...DEFAULT_WATER_OPTICS, absorption: [...DEFAULT_WATER_OPTICS.absorption], scattering: [...DEFAULT_WATER_OPTICS.scattering], backscatter: [...DEFAULT_WATER_OPTICS.backscatter] };
  private geometry: any = null;
  private waveTexture: any = null;
  private waveData = new Float32Array(MAX_WAVES * 2 * 4);
  private waveRevision = -1;
  private waveCount = 0;
  private context: AppContext | null = null;
  private light: any = null;
  private dummyDepth: any = null;
  private dummyShadow: any = null;
  private readonly gridSnap = 0.25;
  readonly farRadius = 3400;
  foamMap: any = null;
  foamRegion = { x: 0, z: 0, size: 64, enabled: false };
  private vertexCount = 0;
  interaction: WaterInteractionSystem | null = null;
  private triangleCount = 0;
  private updates = 0;

  constructor(
    readonly ocean: OceanSystem,
    readonly coupling: RadiometricCouplingSystem,
    readonly atmosphere: AtmosphereSystem,
    readonly lighting: LightingState,
  ) {
    const T = three();
    this.scene = new T.Scene();
    this.scene.name = 'foundry.water.pass-scene';
  }

  init(context: AppContext): void {
    this.context = context;
    const T = three();
    context.legacy.scene.traverse((object: any) => { if (!this.light && object.isDirectionalLight) this.light = object; });
    this.buildGeometry();
    this.waveTexture = new T.DataTexture(this.waveData, MAX_WAVES, 2, GL.RGBAFormat, GL.FloatType);
    this.waveTexture.minFilter = GL.NearestFilter;
    this.waveTexture.magFilter = GL.NearestFilter;
    this.waveTexture.generateMipmaps = false;
    this.waveTexture.needsUpdate = true;
    this.dummyDepth = new T.DataTexture(new Float32Array([1, 1, 1, 1]), 1, 1, GL.RGBAFormat, GL.FloatType);
    this.dummyDepth.needsUpdate = true;
    this.dummyShadow = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, GL.RGBAFormat, GL.UnsignedByteType);
    this.dummyShadow.needsUpdate = true;
    this.foamMap = this.dummyShadow;
    const Vec3 = T.Vector3, Vec2 = T.Vector2, Mat4 = T.Matrix4;
    this.material = new T.ShaderMaterial({
      name: 'foundry.water.ocean-surface.v8',
      vertexShader: WATER_VERTEX_SHADER,
      fragmentShader: WATER_FRAGMENT_SHADER,
      uniforms: {
        uWaves: { value: this.waveTexture },
        uWaveCount: { value: 0 },
        uTime: { value: 0 },
        uSeaLevel: { value: 0 },
        uGridCenter: { value: new Vec3() },
        uFarFade: { value: this.farRadius },
        uCameraPos: { value: new Vec3() },
        uSunDir: { value: new Vec3(0, 1, 0) },
        uSunIrradiance: { value: new Vec3(3, 3, 3) },
        uSkyIrradiance: { value: new Vec3(0.8, 0.9, 1.0) },
        uSkyLut: { value: this.atmosphere.environmentTexture ?? this.dummyShadow },
        uSkyLutRange: { value: 1 },
        uSkyEnabled: { value: 1 },
        uSceneColor: { value: this.dummyShadow },
        uSceneDepth: { value: this.dummyDepth },
        uResolution: { value: new Vec2(1, 1) },
        uCameraNear: { value: 0.08 },
        uCameraFar: { value: 20000 },
        uAbsorption: { value: new Vec3(...this.optics.absorption) },
        uScattering: { value: new Vec3(...this.optics.scattering) },
        uBackscatter: { value: new Vec3(...this.optics.backscatter) },
        uRefractionStrength: { value: this.optics.refractionStrength },
        uMicroRoughness: { value: 0.03 },
        uWindSpeed: { value: 6 },
        uFoamAmount: { value: this.optics.foamAmount },
        uFoamMap: { value: this.foamMap },
        uFoamRegion: { value: new T.Vector4(0, 0, 64, 0) },
        uShadowMap: { value: this.dummyShadow },
        uShadowMatrix: { value: new Mat4() },
        uShadowMapSize: { value: new Vec2(1024, 1024) },
        uShadowBias: { value: 0.0006 },
        uShadowEnabled: { value: 0 },
        uAerialColor: { value: new Vec3(0.7, 0.8, 0.9) },
        uAerialDensity: { value: 0 },
        uAerialEnabled: { value: 0 },
        uInteraction: { value: this.dummyShadow },
        uInteractionRegion: { value: new T.Vector4(0, 0, 1, 0) },
        uInteractionCell: { value: 0.2 },
      },
      depthWrite: true,
      depthTest: true,
      side: GL.FrontSide,
    });
    this.material.extensions = { derivatives: true };
    this.mesh = new T.Mesh(this.geometry, this.material);
    this.mesh.name = 'foundry.water.ocean-surface';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.mesh.userData.foundryAuthority = 'native-ocean-surface-v8';
    this.scene.add(this.mesh);
    context.events.on('mode:change', ({ mode }) => this.setActive((mode as FoundryMode) === 'sailing'));
    this.setActive(context.state.get().mode === 'sailing');
  }

  setActive(active: boolean): void {
    this.active = active;
    this.context?.state.update({ waterEnabled: active });
  }

  /** Radial grid: geometric ring spacing, per-vertex `spacing` for LOD filtering. */
  private buildGeometry(): void {
    const T = three();
    const rings = 210;
    const segments = 256;
    const B = 0.0345;
    const A = 0.075 / (Math.exp(B) - 1);
    const radius = (i: number): number => A * (Math.exp(B * i) - 1);
    const positions: number[] = [0, 0, 0];
    const spacing: number[] = [0.075];
    for (let i = 1; i <= rings; i++) {
      const r = Math.min(this.farRadius, radius(i));
      const radial = Math.max(0.05, radius(i) - radius(i - 1));
      const angular = (2 * Math.PI * r) / segments;
      for (let j = 0; j < segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
        spacing.push(Math.max(radial, angular));
      }
    }
    // Horizon skirt out to the camera far plane (flat, waves faded out).
    const skirt = [this.farRadius * 1.6, 9000, 19000];
    for (const r of skirt) {
      for (let j = 0; j < segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
        spacing.push(r * 0.2);
      }
    }
    const totalRings = rings + skirt.length;
    const indices: number[] = [];
    // Centre fan.
    for (let j = 0; j < segments; j++) indices.push(0, 1 + ((j + 1) % segments), 1 + j);
    for (let i = 1; i < totalRings; i++) {
      const a0 = 1 + (i - 1) * segments;
      const b0 = 1 + i * segments;
      for (let j = 0; j < segments; j++) {
        const j1 = (j + 1) % segments;
        indices.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
      }
    }
    this.geometry = new T.BufferGeometry();
    this.geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('spacing', new T.Float32BufferAttribute(spacing, 1));
    this.geometry.setIndex(new T.Uint32BufferAttribute(indices, 1));
    this.geometry.name = 'foundry.water.radial-grid';
    this.vertexCount = positions.length / 3;
    this.triangleCount = indices.length / 3;
  }

  private uploadWaves(): void {
    const { components, revision } = this.ocean.renderComponents;
    if (revision === this.waveRevision) return;
    this.waveRevision = revision;
    const count = Math.min(MAX_WAVES, components.length);
    const data = this.waveData;
    data.fill(0);
    for (let i = 0; i < count; i++) {
      const c = components[i]!;
      const o0 = i * 4, o1 = (MAX_WAVES + i) * 4;
      data[o0] = c.dirX; data[o0 + 1] = c.dirZ; data[o0 + 2] = c.k; data[o0 + 3] = c.omega;
      data[o1] = c.amplitude; data[o1 + 1] = c.steepness; data[o1 + 2] = c.phase; data[o1 + 3] = 0;
    }
    this.waveCount = count;
    this.waveTexture.needsUpdate = true;
  }

  update(_dt: number, context: AppContext): void {
    if (!this.active || !this.material) return;
    this.uploadWaves();
    const u = this.material.uniforms;
    const camera = context.legacy.camera;
    u.uWaveCount.value = this.waveCount;
    u.uTime.value = this.ocean.renderTime;
    u.uSeaLevel.value = this.ocean.field.seaLevel;
    const cx = Math.round(camera.position.x / this.gridSnap) * this.gridSnap;
    const cz = Math.round(camera.position.z / this.gridSnap) * this.gridSnap;
    u.uGridCenter.value.set(cx, 0, cz);
    u.uCameraPos.value.copy(camera.position);
    u.uCameraNear.value = camera.near;
    u.uCameraFar.value = camera.far;
    const budget = this.coupling.current;
    const settings = this.lighting.get();
    u.uSunDir.value.set(budget.sunDirection.x, budget.sunDirection.y, budget.sunDirection.z).normalize();
    const sun = budget.sunRendererIntensity;
    u.uSunIrradiance.value.set(budget.sunRendererColor.r * sun, budget.sunRendererColor.g * sun, budget.sunRendererColor.b * sun);
    const toRenderer = 1 / SKY_RELATIVE_TO_LUX;
    const skyScale = Math.max(0, settings.diffuseEnvironmentIntensity);
    u.uSkyIrradiance.value.set(
      budget.skyIrradianceRgbLux.r * toRenderer * skyScale,
      budget.skyIrradianceRgbLux.g * toRenderer * skyScale,
      budget.skyIrradianceRgbLux.b * toRenderer * skyScale,
    );
    const lut = this.atmosphere.environmentTexture;
    if (lut) u.uSkyLut.value = lut;
    u.uSkyLutRange.value = this.atmosphere.currentLutRadianceRange * SKY_LINEAR_DISPLAY_SCALE;
    u.uSkyEnabled.value = settings.atmosphereEnabled ? 1 : 0;
    const wind = this.ocean.windSpeed10;
    u.uWindSpeed.value = wind;
    u.uMicroRoughness.value = 0.018 + 0.0045 * wind;
    u.uAbsorption.value.set(...this.optics.absorption);
    u.uScattering.value.set(...this.optics.scattering);
    u.uBackscatter.value.set(...this.optics.backscatter);
    u.uRefractionStrength.value = this.optics.refractionStrength;
    u.uFoamAmount.value = this.optics.foamAmount * Math.min(1, Math.max(0, (wind - 3.2) / 6));
    u.uFoamMap.value = this.foamMap ?? this.dummyShadow;
    u.uFoamRegion.value.set(this.foamRegion.x, this.foamRegion.z, this.foamRegion.size, this.foamRegion.enabled ? 1 : 0);
    // Sun shadow map (packed RGBA depth in r160).
    const shadow = this.light?.shadow;
    const map = shadow?.map?.texture;
    const shadowsOn = !!(map && this.light.castShadow && context.legacy.renderer.shadowMap?.enabled);
    u.uShadowEnabled.value = shadowsOn ? 1 : 0;
    if (shadowsOn) {
      u.uShadowMap.value = map;
      u.uShadowMatrix.value.copy(shadow.matrix);
      u.uShadowMapSize.value.set(shadow.mapSize.x, shadow.mapSize.y);
    }
    // Local interaction solver (wake, ripples, foam).
    const binding = this.interaction?.binding;
    if (binding?.enabled && binding.texture) {
      u.uInteraction.value = binding.texture;
      u.uInteractionRegion.value.set(binding.originX, binding.originZ, binding.size, 1);
      u.uInteractionCell.value = this.interaction?.cellM ?? 0.2;
    } else {
      u.uInteraction.value = this.dummyShadow;
      u.uInteractionRegion.value.w = 0;
    }
    // Aerial perspective: identical law and colour to AerialPerspectiveSystem.
    const maxDistance = Math.max(1, settings.aerialPerspectiveMaxDistanceM);
    u.uAerialDensity.value = (-Math.log(0.02) / maxDistance) * Math.max(0, settings.aerialPerspectiveStrength);
    u.uAerialEnabled.value = settings.aerialPerspectiveEnabled ? 1 : 0;
    u.uAerialColor.value.set(budget.hemisphereSkyColor.r, budget.hemisphereSkyColor.g, budget.hemisphereSkyColor.b);
    this.updates++;
  }

  /** Called by ScenePipeline before the water pass. */
  bindScene(color: any, depth: any, width: number, height: number): void {
    if (!this.material) return;
    const u = this.material.uniforms;
    u.uSceneColor.value = color;
    u.uSceneDepth.value = depth;
    u.uResolution.value.set(width, height);
  }

  telemetry(): Record<string, unknown> {
    return {
      active: this.active,
      vertices: this.vertexCount,
      triangles: this.triangleCount,
      waveComponents: this.waveCount,
      farRadiusM: this.farRadius,
      optics: this.optics,
      shadowSampling: this.material?.uniforms?.uShadowEnabled?.value === 1,
      foamRegion: this.foamRegion,
      updates: this.updates,
      authority: 'Gerstner surface identical to the physics field; exact Fresnel, atmosphere-LUT reflection, GGX sun glitter with sun shadow, depth-aware refraction with Beer–Lambert absorption and single scattering, Jacobian whitecaps, aerial perspective',
    };
  }
}
