import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';

export class SunSkySystem implements AppSystem {
  readonly id = 'lighting.sun';
  readonly phase = 'preRender' as const;
  enabled = true;
  private sun: any = null;
  private hemisphere: any = null;
  private ambient: any = null;
  private lastRevision = -1;
  private applyCount = 0;
  private lastApplyMs = 0;

  constructor(
    readonly settings: LightingState,
    readonly coupling: RadiometricCouplingSystem,
  ) {}

  init(context: AppContext): void {
    context.legacy.scene.traverse((object: any) => {
      if (!this.sun && object.isDirectionalLight) this.sun = object;
      if (!this.hemisphere && object.isHemisphereLight) this.hemisphere = object;
      if (!this.ambient && object.isAmbientLight) this.ambient = object;
    });
    this.apply(context, true);
    this.settings.subscribe(() => {
      this.apply(context, true);
      context.requestRender('sun settings changed');
    });
    context.quality.subscribe(() => {
      this.apply(context, true);
      context.requestRender('sun quality changed');
    });
  }

  update(_dtSeconds: number, context: AppContext): void {
    this.apply(context, false);
  }

  private apply(context: AppContext, force: boolean): void {
    const started = performance.now();
    const budget = this.coupling.current;
    if (!force && budget.revision === this.lastRevision) return;
    this.lastRevision = budget.revision;

    if (this.sun) {
      const distance = 24;
      this.sun.position.set(
        budget.sunDirection.x * distance,
        budget.sunDirection.y * distance,
        budget.sunDirection.z * distance,
      );
      this.sun.target?.position?.set?.(0, 2.1, 0);
      this.sun.color?.setRGB?.(
        budget.sunRendererColor.r,
        budget.sunRendererColor.g,
        budget.sunRendererColor.b,
      );
      this.sun.intensity = budget.sunRendererIntensity;
      this.sun.updateMatrixWorld?.(true);
      this.sun.target?.updateMatrixWorld?.(true);
    }

    // Diffuse atmosphere illumination is exclusively owned by EnvironmentSystem.
    if (this.hemisphere) this.hemisphere.intensity = 0;
    if (this.ambient) this.ambient.intensity = 0;

    const renderer = context.legacy.renderer;
    if ('toneMappingExposure' in renderer) renderer.toneMappingExposure = budget.rendererExposure;
    this.applyCount++;
    this.lastApplyMs = performance.now() - started;
  }

  telemetry(): Record<string, unknown> {
    const budget = this.coupling.current;
    return {
      sunFound: !!this.sun,
      legacyHemisphereDelegatedToEnvironment: !!this.hemisphere,
      legacyAmbientDisabled: this.ambient ? this.ambient.intensity === 0 : null,
      sunDirection: budget.sunDirection,
      sunTransmittance: budget.sunTransmittance,
      directNormalLux: budget.directNormalLux,
      directHorizontalLux: budget.directHorizontalLux,
      rendererColor: budget.sunRendererColor,
      rendererIntensity: budget.sunRendererIntensity,
      rendererExposure: budget.rendererExposure,
      autoExposureEv: budget.autoExposureEv,
      applyCount: this.applyCount,
      lastApplyMs: this.lastApplyMs,
      model: 'directional sun magnitude and chromaticity are consumed from the shared radiometric budget',
    };
  }
}
