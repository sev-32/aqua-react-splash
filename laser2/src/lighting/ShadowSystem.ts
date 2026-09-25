import type { AppContext, AppSystem } from '../core/System.js';
import { RingBuffer } from '../telemetry/RingBuffer.js';
import { LightingState } from './LightingState.js';

export class ShadowSystem implements AppSystem {
  readonly id = 'lighting.shadows';
  readonly phase = 'preRender' as const;
  enabled = true;
  private light: any = null;
  private sailMeshes: any[] = [];
  private lastConfiguration = '';
  private dirty = true;
  private invalidations = 0;
  private updatesRequested = 0;
  private readonly reasons = new RingBuffer<string>(32);

  constructor(readonly settings: LightingState) {}

  init(context: AppContext): void {
    context.legacy.scene.traverse((object: any) => {
      if (!this.light && object.isDirectionalLight) this.light = object;
    });
    const optics = context.legacy.sailOpticsV17;
    this.sailMeshes = (optics?.sails ?? []).map((entry: any) => entry.mesh).filter(Boolean);
    this.invalidate('initial shadow configuration');
    this.apply(context);
    context.quality.subscribe(() => {
      this.invalidate('quality profile changed');
      this.apply(context);
      context.requestRender('shadow quality changed');
    });
    this.settings.subscribe((next, previous) => {
      const sunMoved = next.sunElevationDeg !== previous.sunElevationDeg || next.sunAzimuthDeg !== previous.sunAzimuthDeg;
      const enabledChanged = next.shadowsEnabled !== previous.shadowsEnabled;
      if (sunMoved) this.invalidate('sun transform changed');
      if (enabledChanged) this.invalidate('shadow enable state changed');
      const atmosphereChanged =
        next.turbidity !== previous.turbidity ||
        next.skyIntensity !== previous.skyIntensity ||
        next.rayleighDensity !== previous.rayleighDensity ||
        next.aerosolDensity !== previous.aerosolDensity ||
        next.mieAnisotropy !== previous.mieAnisotropy ||
        next.groundAlbedo !== previous.groundAlbedo ||
        next.groundBounce !== previous.groundBounce ||
        next.sunIlluminanceLux !== previous.sunIlluminanceLux ||
        next.atmosphereEnabled !== previous.atmosphereEnabled;
      context.events.emit('lighting:changed', {
        reason: sunMoved ? 'sun transform changed' : atmosphereChanged ? 'atmosphere changed' : 'lighting material/exposure changed',
        shadowDirty: sunMoved || enabledChanged,
        environmentDirty: sunMoved || atmosphereChanged,
      });
      this.apply(context);
      context.requestRender('shadow settings changed');
    });
    context.events.on('shadow:invalidate', ({ reason }) => {
      this.invalidate(reason);
      context.requestRender(`shadow invalidated: ${reason}`);
    });
  }

  update(_dtSeconds: number, context: AppContext): void {
    if (context.state.get().dynamic && context.simulation.steps > 0) this.invalidate(`dynamic casters advanced ${context.simulation.steps} step(s)`);
    this.apply(context);
  }

  invalidate(reason: string): void {
    this.dirty = true;
    this.invalidations++;
    this.reasons.push(reason);
  }

  private configurationKey(context: AppContext): string {
    const profile = context.quality.current;
    const settings = this.settings.get();
    return JSON.stringify([
      profile.id,
      profile.shadowEnabled,
      profile.shadowMapSize,
      profile.shadowRadius,
      settings.shadowsEnabled,
      settings.sunElevationDeg,
      settings.sunAzimuthDeg,
      context.state.get().mode === 'sailing',
    ]);
  }

  private apply(context: AppContext): void {
    const profile = context.quality.current;
    const settings = this.settings.get();
    const key = this.configurationKey(context);
    const configurationChanged = key !== this.lastConfiguration;
    if (!configurationChanged && !this.dirty) return;
    this.lastConfiguration = key;
    const enabled = settings.shadowsEnabled && profile.shadowEnabled;
    const renderer = context.legacy.renderer;
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = enabled;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = enabled && (configurationChanged || this.dirty);
      if (renderer.shadowMap.needsUpdate) this.updatesRequested++;
    }
    if (this.light) {
      this.light.castShadow = enabled;
      if (this.light.shadow) {
        this.light.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
        this.light.shadow.bias = -0.00018;
        this.light.shadow.normalBias = 0.004;
        this.light.shadow.radius = profile.shadowRadius;
        // Sailing: the boat heels, capsizes and turtles, and its sail shadow
        // falls on the water, so the frustum is symmetric around the hull.
        const sailing = context.state.get().mode === 'sailing';
        this.light.shadow.camera.near = 0.5;
        this.light.shadow.camera.far = sailing ? 70 : 60;
        this.light.shadow.camera.left = sailing ? -9.5 : -8;
        this.light.shadow.camera.right = sailing ? 9.5 : 8;
        this.light.shadow.camera.top = sailing ? 10 : 9;
        this.light.shadow.camera.bottom = sailing ? -9.5 : -3;
        this.light.shadow.camera.updateProjectionMatrix?.();
        this.light.shadow.needsUpdate = enabled;
      }
    }
    for (const sail of this.sailMeshes) sail.receiveShadow = enabled;
    this.dirty = false;
  }

  requestUpdate(context: AppContext, reason = 'external request'): void {
    this.invalidate(reason);
    this.apply(context);
  }

  telemetry(): Record<string, unknown> {
    return {
      directionalLightFound: !!this.light,
      sailReceivers: this.sailMeshes.length,
      mutualSailCasting: false,
      invalidations: this.invalidations,
      updatesRequested: this.updatesRequested,
      dirty: this.dirty,
      recentInvalidationReasons: this.reasons.toArray(),
      configurationIncludesSunTransform: true,
      status: 'legacy-compatible shadow receiver baseline with dependency-driven invalidation; thin-sheet mutual casting remains a separate future authority',
    };
  }
}
