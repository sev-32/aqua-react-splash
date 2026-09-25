import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';
import type { RadiometricCouplingSystem } from '../RadiometricCouplingSystem.js';

export class SailClothController implements AppSystem {
  readonly id = 'materials.sailcloth';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  private optics: any = null;
  private lastKey = '';
  private sunlightScale = 0;
  private shadowBlurM = 0;

  constructor(readonly settings: LightingState, readonly coupling: RadiometricCouplingSystem) {}

  init(context: AppContext): void {
    this.optics = context.legacy.sailOpticsV17;
    this.apply(context);
    this.settings.subscribe(() => {
      this.apply(context);
      context.requestRender('sail cloth setting changed');
    });
  }

  update(_dtSeconds: number, context: AppContext): void {
    this.apply(context);
  }

  private setParam(name: string, value: number): void {
    if (this.optics?.setParam) this.optics.setParam(name, value);
    else if (this.optics?.params) this.optics.params[name] = value;
  }

  private apply(context: AppContext): void {
    const settings = this.settings.get();
    const budget = this.coupling.current;
    const incidentScale = Math.max(0.02, Math.min(2.0, (0.74 * budget.directNormalLux + 0.34 * budget.skyIrradianceLux) / 100_000));
    const key = `${settings.sailTransmission}:${settings.sailAbsorption}:${settings.sailShadowSoftnessMm}:${budget.revision}:${incidentScale}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    // The retained V17 backend exposes transmission and sunlightScale rather
    // than a direct absorption coefficient. Beer-Lambert attenuation is applied
    // here so the UI retains physically monotonic absorption semantics.
    this.sunlightScale = Math.exp(-Math.max(0, settings.sailAbsorption)) * 0.82 * incidentScale;
    this.shadowBlurM = Math.max(0, settings.sailShadowSoftnessMm) / 1000;
    this.setParam('clothDiffuseTransmission', settings.sailTransmission);
    this.setParam('sunlightScale', this.sunlightScale);
    this.setParam('transmittedShadowBlurM', this.shadowBlurM);
    context.legacy.renderer.shadowMap && (context.legacy.renderer.shadowMap.needsUpdate = true);
  }

  telemetry(): Record<string, unknown> {
    const settings = this.settings.get();
    return {
      authority: this.optics?.VERSION ?? null,
      clothMeshes: this.optics?.sails?.length ?? 0,
      transmission: settings.sailTransmission,
      absorption: settings.sailAbsorption,
      sunlightScale: this.sunlightScale,
      transmittedShadowBlurM: this.shadowBlurM,
      incidentRadiometricRevision: this.coupling.current.revision,
      incidentDirectNormalLux: this.coupling.current.directNormalLux,
      incidentSkyIrradianceLux: this.coupling.current.skyIrradianceLux,
      model: 'retained V17 thin-sheet shader driven by the shared atmosphere radiometric budget, with Beer-Lambert absorption and millimetre shadow diffusion',
    };
  }
}
