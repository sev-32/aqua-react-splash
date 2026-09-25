import type { AppContext, AppSystem } from '../../core/System.js';
import type { LightingState } from '../LightingState.js';
import {
  ATMOSPHERE_RADIUS_M,
  EARTH_RADIUS_M,
  MIE_EXTINCTION_M_INV,
  MIE_SCALE_HEIGHT_M,
  OZONE_ABSORPTION_M_INV,
  OZONE_HALF_WIDTH_M,
  OZONE_PEAK_ALTITUDE_M,
  RAYLEIGH_SCALE_HEIGHT_M,
  RAYLEIGH_SCATTERING_M_INV,
  atmosphericSunTransmittance,
} from './AtmosphereMath.js';
import { ATMOSPHERE_VERTEX_SHADER, atmosphereFragmentShader } from './AtmosphereShader.js';
import { clamp, sunDirectionFromAngles } from '../../reference/lightingMath.js';
import type { RadiometricCouplingSystem } from '../RadiometricCouplingSystem.js';
import { computeAtmosphereLut, type AtmosphereLutJobRequest, type AtmosphereLutJobResult } from './AtmosphereLutJob.js';
import type { LightingSettings } from '../LightingSettings.js';

const LUT_RADIANCE_RANGE = 4;
/**
 * The sky shader tone-maps itself with the Narkowicz ACES fit, which renders
 * a given radiance brighter than the renderer's r160 ACES transform. When the
 * HDR pipeline tone-maps the sky through the renderer instead, scaling the
 * scene-linear sky radiance by 1.2 reproduces the legacy sky within ~3/255
 * (measured on the default sky). The water reflects the sky with the same
 * scale so the horizon stays seamless.
 */
export const SKY_LINEAR_DISPLAY_SCALE = 1.2;

function atmosphereSignature(settings: Readonly<LightingSettings>): string {
  return [
    settings.atmosphereEnabled, settings.sunElevationDeg, settings.sunAzimuthDeg,
    settings.sunIlluminanceLux, settings.sunIntensity, settings.sunAngularRadiusDeg,
    settings.skyIntensity, settings.rayleighDensity, settings.aerosolDensity,
    settings.mieAnisotropy, settings.turbidity, settings.ozoneDensity,
    settings.multipleScatteringFactor, settings.groundAlbedo,
    settings.cameraAltitudeM, settings.whiteBalanceKelvin,
  ].join(':');
}

export class AtmosphereSystem implements AppSystem {
  readonly id = 'lighting.atmosphere';
  readonly phase = 'preRender' as const;
  enabled = true;
  private context: AppContext | null = null;
  private mesh: any = null;
  private material: any = null;
  private geometry: any = null;
  private sourceSky: any = null;
  private lutCanvas: HTMLCanvasElement | null = null;
  private lutTexture: any = null;
  private lutData: Float32Array | null = null;
  private hdrEnvironment = false;
  private dirty = true;
  private updateAccumulatorSeconds = 0;
  private deferredDynamicUpdates = 0;
  private lastShaderKey = '';
  private lutUpdates = 0;
  private shaderRebuilds = 0;
  private cameraRecenters = 0;
  private lastLutMs = 0;
  private meanLutMs = 0;
  private lastApplyMs = 0;
  private meanApplyMs = 0;
  private lastUpdateMs = 0;
  private lutPixels = 0;
  private textureSourceName: string | null = null;
  private worker: Worker | null = null;
  private workerSupported = typeof Worker !== 'undefined';
  private workerActive = false;
  private workerJobs = 0;
  private workerFallbacks = 0;
  private workerRestarts = 0;
  private bootstrapFallbacks = 0;
  private pendingGeneration = 0;
  private appliedGeneration = 0;
  private cancelledGenerations = 0;
  private workerErrors: string[] = [];
  private initialJob: Promise<void> | null = null;
  private initialResolve: (() => void) | null = null;
  private lastFirstOrderEnergy = 0;
  private lastFinalEnergy = 0;

  constructor(
    readonly settings: LightingState,
    readonly coupling: RadiometricCouplingSystem,
  ) {}

  async init(context: AppContext): Promise<void> {
    this.context = context;
    this.createSky(context);
    this.rebuildShader(context);
    await this.ensureWorker();
    this.initialJob = new Promise<void>((resolve) => { this.initialResolve = resolve; });
    this.requestLut(context);
    await Promise.race([
      this.initialJob,
      new Promise<void>((resolve) => setTimeout(resolve, 30_000)),
    ]);
    this.settings.subscribe((next, previous) => {
      if (atmosphereSignature(next) !== atmosphereSignature(previous)) {
        this.dirty = true;
        context.events.emit('lighting:changed', {
          reason: 'atmosphere transport settings changed',
          shadowDirty: false,
          environmentDirty: true,
        });
        context.requestRender('atmosphere settings changed');
      } else {
        // Exposure, local probes and material controls do not invalidate the LUT.
        if (this.material?.uniforms?.uExposure) this.material.uniforms.uExposure.value = this.coupling.current.rendererExposure;
      }
    });
    context.quality.subscribe(() => {
      this.rebuildShader(context);
      this.dirty = true;
      context.requestRender('atmosphere quality changed');
    });
  }

  update(dtSeconds: number, context: AppContext): void {
    const started = performance.now();
    this.updateAccumulatorSeconds += Math.max(0, dtSeconds);
    if (this.dirty && this.pendingGeneration === this.appliedGeneration) {
      const dynamic = context.state.get().dynamic;
      const hz = context.quality.current.environmentUpdateHz;
      const due = !dynamic || hz <= 0 || this.updateAccumulatorSeconds >= 1 / hz;
      if (due) {
        this.requestLut(context);
        this.updateAccumulatorSeconds = 0;
      } else {
        this.deferredDynamicUpdates++;
      }
    }
    if (this.material?.uniforms?.uExposure) this.material.uniforms.uExposure.value = this.coupling.current.rendererExposure;
    if (this.mesh) {
      this.mesh.position.copy(context.legacy.camera.position);
      this.mesh.updateMatrixWorld?.(true);
      this.cameraRecenters++;
    }
    this.lastUpdateMs = performance.now() - started;
  }

  private async ensureWorker(): Promise<void> {
    if (!this.workerSupported || this.worker) return;
    try {
      const url = new URL('./AtmosphereLutWorker.js', import.meta.url);
      if (location.origin !== 'null') {
        this.worker = new Worker(url, { type: 'module', name: 'laser2-atmosphere-lut-v7' });
      } else {
        const response = await fetch(new URL('../../../workers/atmosphere-lut-worker-v7.bundle.js', import.meta.url), { cache: 'no-store' });
        if (!response.ok) throw new Error(`worker bundle ${response.status}`);
        const source = await response.text();
        const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        this.worker = new Worker(blobUrl, { name: 'laser2-atmosphere-lut-v7-bundle' });
        this.bootstrapFallbacks++;
      }
      this.worker.onmessage = (event: MessageEvent<AtmosphereLutJobResult & { error?: string }>) => {
        const result = event.data;
        if (result.error) {
          this.workerErrors.push(result.error);
          this.workerFallbacks++;
          this.workerActive = false;
          this.resolveInitial();
          return;
        }
        if (result.generation !== this.pendingGeneration) {
          this.cancelledGenerations++;
          return;
        }
        this.workerActive = true;
        this.applyResult(result);
      };
      this.worker.onerror = (event: ErrorEvent) => {
        this.workerErrors.push(event.message || 'worker error');
        this.workerFallbacks++;
        this.workerActive = false;
        this.worker?.terminate();
        this.worker = null;
        this.resolveInitial();
      };
      this.workerRestarts++;
    } catch (error) {
      this.workerErrors.push(error instanceof Error ? error.message : String(error));
      this.workerFallbacks++;
      this.worker = null;
    }
  }

  private requestLut(context: AppContext): void {
    const profile = context.quality.current;
    const generation = ++this.pendingGeneration;
    const request: AtmosphereLutJobRequest = {
      generation,
      width: profile.atmosphereLutWidth,
      height: profile.atmosphereLutHeight,
      viewSamples: profile.atmosphereViewSamples,
      sunSamples: profile.atmosphereSunSamples,
      scatteringOrders: profile.atmosphereScatteringOrders,
      settings: structuredClone(this.settings.get()) as LightingSettings,
    };
    this.workerJobs++;
    if (this.worker) {
      this.worker.postMessage(request);
      return;
    }
    this.workerFallbacks++;
    setTimeout(() => {
      try {
        if (generation !== this.pendingGeneration) return;
        this.applyResult(computeAtmosphereLut(request));
      } catch (error) {
        this.workerErrors.push(error instanceof Error ? error.message : String(error));
        this.resolveInitial();
      }
    }, 0);
  }

  private applyResult(result: AtmosphereLutJobResult): void {
    if (!this.context || !this.lutTexture || !this.material) return;
    if (result.generation !== this.pendingGeneration) {
      this.cancelledGenerations++;
      return;
    }
    const started = performance.now();
    const source = new Float32Array(result.data);
    const whiteBalance = this.coupling.current.whiteBalanceRgb;
    const length = result.width * result.height * 4;
    if (this.hdrEnvironment) {
      this.lutData = new Float32Array(length);
      for (let index = 0; index < length; index += 4) {
        this.lutData[index] = Math.max(0, source[index]! * whiteBalance.r);
        this.lutData[index + 1] = Math.max(0, source[index + 1]! * whiteBalance.g);
        this.lutData[index + 2] = Math.max(0, source[index + 2]! * whiteBalance.b);
        this.lutData[index + 3] = 1;
      }
      this.lutTexture.image = { data: this.lutData, width: result.width, height: result.height };
      this.lutTexture.type = 1015;
      this.lutTexture.format = 1023;
      this.lutTexture.internalFormat = 'RGBA32F';
      this.material.uniforms.uLutRadianceRange.value = 1;
    } else {
      if (!this.lutCanvas) this.lutCanvas = document.createElement('canvas');
      this.lutCanvas.width = result.width;
      this.lutCanvas.height = result.height;
      const canvasContext = this.lutCanvas.getContext('2d', { alpha: false });
      if (!canvasContext) throw new Error('Atmosphere LUT 2D context unavailable');
      const image = canvasContext.createImageData(result.width, result.height);
      for (let index = 0; index < length; index += 4) {
        image.data[index] = Math.round(clamp(source[index]! * whiteBalance.r / LUT_RADIANCE_RANGE, 0, 1) * 255);
        image.data[index + 1] = Math.round(clamp(source[index + 1]! * whiteBalance.g / LUT_RADIANCE_RANGE, 0, 1) * 255);
        image.data[index + 2] = Math.round(clamp(source[index + 2]! * whiteBalance.b / LUT_RADIANCE_RANGE, 0, 1) * 255);
        image.data[index + 3] = 255;
      }
      canvasContext.putImageData(image, 0, 0);
      this.lutTexture.image = this.lutCanvas;
      this.material.uniforms.uLutRadianceRange.value = LUT_RADIANCE_RANGE;
    }
    this.lutTexture.needsUpdate = true;
    this.updateSunUniforms(this.context);
    this.mesh.visible = true;
    this.lutPixels = result.width * result.height;
    this.lastLutMs = result.computeMs;
    this.meanLutMs += (result.computeMs - this.meanLutMs) / (this.lutUpdates + 1);
    this.lastApplyMs = performance.now() - started;
    this.meanApplyMs += (this.lastApplyMs - this.meanApplyMs) / (this.lutUpdates + 1);
    this.lastFirstOrderEnergy = result.firstOrderEnergy;
    this.lastFinalEnergy = result.finalEnergy;
    this.lutUpdates++;
    this.appliedGeneration = result.generation;
    this.dirty = false;
    this.context.events.emit('lighting:changed', {
      reason: 'atmosphere LUT worker result applied',
      shadowDirty: false,
      environmentDirty: true,
    });
    this.context.requestRender('atmosphere LUT applied');
    this.resolveInitial();
  }

  private resolveInitial(): void {
    this.initialResolve?.();
    this.initialResolve = null;
  }

  private updateSunUniforms(context: AppContext): void {
    const settings = this.settings.get();
    const profile = context.quality.current;
    const sunDirection = sunDirectionFromAngles(settings.sunElevationDeg, settings.sunAzimuthDeg);
    atmosphericSunTransmittance(sunDirection, settings, Math.max(4, profile.atmosphereSunSamples * 2), settings.cameraAltitudeM);
    const budget = this.coupling.current;
    const solarScale = Math.max(0, budget.sunRendererIntensity);
    const uniforms = this.material.uniforms;
    uniforms.uSunDirection.value.set(sunDirection.x, sunDirection.y, sunDirection.z).normalize?.();
    uniforms.uSunDisplayColor.value.set(
      budget.sunRendererColor.r * solarScale * 1.5,
      budget.sunRendererColor.g * solarScale * 1.5,
      budget.sunRendererColor.b * solarScale * 1.5,
    );
    uniforms.uSunAngularRadiusRad.value = Math.max(0.01, settings.sunAngularRadiusDeg) * Math.PI / 180;
    uniforms.uEnabled.value = settings.atmosphereEnabled ? 1 : 0;
    uniforms.uExposure.value = budget.rendererExposure;
  }

  private findTexturePrototype(context: AppContext): any {
    let texture: any = null;
    context.legacy.scene.traverse((object: any) => {
      if (texture || !object?.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const key of ['map', 'normalMap', 'roughnessMap', 'alphaMap']) {
          const candidate = material?.[key];
          if (candidate?.isTexture && candidate.constructor) {
            texture = candidate;
            this.textureSourceName = candidate.name || `${object.name || object.type}.${key}`;
            return;
          }
        }
      }
    });
    return texture;
  }

  private createSky(context: AppContext): void {
    const master = context.legacy.master;
    this.sourceSky = master.water?.skyMesh ?? null;
    const fallbackMesh = this.sourceSky ?? master.boat?.children?.find?.((object: any) => object?.isMesh);
    const MeshCtor = fallbackMesh?.constructor;
    const GeometryCtor = this.sourceSky?.geometry?.constructor;
    const MaterialCtor = this.sourceSky?.material?.constructor;
    const texturePrototype = this.findTexturePrototype(context);
    const TextureCtor = texturePrototype?.constructor;
    if (!MeshCtor || !GeometryCtor || !MaterialCtor || !TextureCtor) throw new Error('Atmosphere sky constructors unavailable');

    this.hdrEnvironment = typeof WebGL2RenderingContext !== 'undefined' && context.legacy.gl instanceof WebGL2RenderingContext;
    if (this.hdrEnvironment) {
      this.lutData = new Float32Array(2 * 2 * 4);
      this.lutTexture = new TextureCtor({ data: this.lutData, width: 2, height: 2 });
      this.lutTexture.isCanvasTexture = false;
      this.lutTexture.isDataTexture = true;
      this.lutTexture.type = 1015;
      this.lutTexture.format = 1023;
      this.lutTexture.internalFormat = 'RGBA32F';
      this.lutTexture.unpackAlignment = 1;
      this.lutTexture.minFilter = 1006;
      this.lutTexture.magFilter = 1006;
    } else {
      this.lutCanvas = document.createElement('canvas');
      this.lutCanvas.width = 2;
      this.lutCanvas.height = 2;
      this.lutTexture = new TextureCtor(this.lutCanvas);
      this.lutTexture.minFilter = texturePrototype.magFilter;
      this.lutTexture.magFilter = texturePrototype.magFilter;
    }
    this.lutTexture.name = 'foundry.atmosphere.sky-lut.v7';
    this.lutTexture.mapping = 303;
    this.lutTexture.generateMipmaps = false;
    this.lutTexture.flipY = false;
    if ('colorSpace' in this.lutTexture) this.lutTexture.colorSpace = '';
    else if ('encoding' in this.lutTexture) this.lutTexture.encoding = 3000;
    this.lutTexture.needsUpdate = true;

    this.geometry = new GeometryCtor(1, 32, 16);
    this.geometry.name = 'foundry.atmosphere.sky-geometry.v7';
    const vectorCtor = context.legacy.body.pos.constructor;
    const settings = this.settings.get();
    const direction = sunDirectionFromAngles(settings.sunElevationDeg, settings.sunAzimuthDeg);
    this.material = new MaterialCtor({
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: atmosphereFragmentShader({
        viewSamples: context.quality.current.atmosphereViewSamples,
        sunSamples: context.quality.current.atmosphereSunSamples,
      }),
      uniforms: {
        uSkyLut: { value: this.lutTexture },
        uSunDirection: { value: new vectorCtor(direction.x, direction.y, direction.z) },
        uSunDisplayColor: { value: new vectorCtor(1, 1, 1) },
        uSunAngularRadiusRad: { value: settings.sunAngularRadiusDeg * Math.PI / 180 },
        uLutRadianceRange: { value: this.hdrEnvironment ? 1 : LUT_RADIANCE_RANGE },
        uEnabled: { value: settings.atmosphereEnabled ? 1 : 0 },
        uExposure: { value: this.coupling.current.rendererExposure },
        uOutputLinear: { value: 0 },
        uLinearScale: { value: SKY_LINEAR_DISPLAY_SCALE },
      },
      side: this.sourceSky?.material?.side ?? 1,
      depthWrite: false,
      depthTest: false,
      fog: false,
      transparent: false,
      toneMapped: false,
    });
    this.material.name = 'foundry.atmosphere.material.v7';
    this.mesh = new MeshCtor(this.geometry, this.material);
    this.mesh.name = 'foundry.atmosphere.sky.v7';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100000;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.userData = this.mesh.userData ?? {};
    this.mesh.userData.foundryAuthority = 'worker-multi-order-atmosphere-lut';
    context.legacy.scene.add(this.mesh);
    if (this.sourceSky) this.sourceSky.visible = false;
  }

  private rebuildShader(context: AppContext): void {
    if (!this.material) return;
    const profile = context.quality.current;
    const key = `${profile.id}:${profile.atmosphereViewSamples}:${profile.atmosphereSunSamples}`;
    if (key === this.lastShaderKey) return;
    this.lastShaderKey = key;
    this.material.vertexShader = ATMOSPHERE_VERTEX_SHADER;
    this.material.fragmentShader = atmosphereFragmentShader({
      viewSamples: profile.atmosphereViewSamples,
      sunSamples: profile.atmosphereSunSamples,
    });
    this.material.needsUpdate = true;
    this.shaderRebuilds++;
  }

  get environmentTexture(): any { return this.lutTexture; }
  get lutRadianceRange(): number { return LUT_RADIANCE_RANGE; }
  /** Multiplier that turns LUT texels into radiance for the texture currently bound. */
  get currentLutRadianceRange(): number { return this.material?.uniforms?.uLutRadianceRange?.value ?? LUT_RADIANCE_RANGE; }

  /** The HDR scene pipeline renders the sky scene-linear into its target. */
  setLinearOutput(enabled: boolean): void {
    const uniforms = this.material?.uniforms;
    if (uniforms?.uOutputLinear) uniforms.uOutputLinear.value = enabled ? 1 : 0;
  }

  telemetry(): Record<string, unknown> {
    const profile = this.context?.quality.current;
    return {
      created: !!this.mesh,
      visible: this.mesh?.visible === true,
      sourceSkyDisabled: this.sourceSky ? this.sourceSky.visible === false : null,
      backend: 'cancellable worker-generated Rayleigh/Mie/ozone LUT with bounded multi-order angular redistribution',
      texturePrototype: this.textureSourceName,
      hdrEnvironment: this.hdrEnvironment,
      textureStorage: this.hdrEnvironment ? 'RGBA32F DataTexture-compatible payload' : '8-bit canvas fallback',
      physicalDomain: {
        planetRadiusM: EARTH_RADIUS_M,
        atmosphereRadiusM: ATMOSPHERE_RADIUS_M,
        rayleighScaleHeightM: RAYLEIGH_SCALE_HEIGHT_M,
        mieScaleHeightM: MIE_SCALE_HEIGHT_M,
        rayleighScatteringMInv: [...RAYLEIGH_SCATTERING_M_INV],
        mieExtinctionMInv: MIE_EXTINCTION_M_INV,
        ozonePeakAltitudeM: OZONE_PEAK_ALTITUDE_M,
        ozoneHalfWidthM: OZONE_HALF_WIDTH_M,
        ozoneAbsorptionMInv: [...OZONE_ABSORPTION_M_INV],
      },
      quality: profile ? {
        id: profile.id,
        viewSamples: profile.atmosphereViewSamples,
        sunSamples: profile.atmosphereSunSamples,
        scatteringOrders: profile.atmosphereScatteringOrders,
        lutWidth: profile.atmosphereLutWidth,
        lutHeight: profile.atmosphereLutHeight,
      } : null,
      worker: {
        supported: this.workerSupported,
        active: this.workerActive,
        jobs: this.workerJobs,
        fallbacks: this.workerFallbacks,
        restarts: this.workerRestarts,
        bootstrapFallbacks: this.bootstrapFallbacks,
        pendingGeneration: this.pendingGeneration,
        appliedGeneration: this.appliedGeneration,
        cancelledGenerations: this.cancelledGenerations,
        errors: [...this.workerErrors],
      },
      energy: {
        firstOrder: this.lastFirstOrderEnergy,
        final: this.lastFinalEnergy,
        multiOrderRatio: this.lastFinalEnergy / Math.max(1e-9, this.lastFirstOrderEnergy),
      },
      shaderRebuilds: this.shaderRebuilds,
      lutUpdates: this.lutUpdates,
      lutPixels: this.lutPixels,
      lutWorkerCpuMs: { last: this.lastLutMs, mean: this.meanLutMs },
      lutMainThreadApplyMs: { last: this.lastApplyMs, mean: this.meanApplyMs },
      frameCpuMs: this.lastUpdateMs,
      cameraRecenters: this.cameraRecenters,
      deferredDynamicUpdates: this.deferredDynamicUpdates,
      updateAccumulatorSeconds: this.updateAccumulatorSeconds,
      updateCadenceHz: profile?.environmentUpdateHz ?? null,
      truthBoundary: 'Orders above one use a bounded angular redistribution approximation. Full multi-dimensional spectral multiple-scattering precomputation remains a later authority.',
    };
  }

  dispose(): void {
    this.worker?.terminate();
    this.mesh?.parent?.remove?.(this.mesh);
    this.geometry?.dispose?.();
    this.material?.dispose?.();
    this.lutTexture?.dispose?.();
  }
}
