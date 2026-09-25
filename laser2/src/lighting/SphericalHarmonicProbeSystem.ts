import type { AppContext, AppSystem } from '../core/System.js';
import { luminance, sunDirectionFromAngles } from '../reference/lightingMath.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
import { projectAtmosphereToSh } from './atmosphere/AtmosphereMath.js';

const SH_RENDER_CALIBRATION = 22_000 / 18_000;

export class SphericalHarmonicProbeSystem implements AppSystem {
  readonly id = 'lighting.sh-diffuse-probe';
  readonly phase = 'preRender' as const;
  enabled = true;
  private context: AppContext | null = null;
  private probe: any = null;
  private sourceTemplate: any = null;
  private dirty = true;
  private lastRevision = -1;
  private updates = 0;
  private lastCpuMs = 0;
  private meanCpuMs = 0;
  private samples = 0;
  private coefficientLuminance: number[] = [];

  constructor(
    readonly settings: LightingState,
    readonly coupling: RadiometricCouplingSystem,
  ) {}

  init(context: AppContext): void {
    this.context = context;
    context.legacy.scene.traverse((object: any) => {
      if (!this.sourceTemplate && (object.isHemisphereLight || object.isAmbientLight)) this.sourceTemplate = object;
    });
    if (!this.sourceTemplate?.clone) throw new Error('No compatible Object3D light template is available for the SH probe');
    const vectorCtor = context.legacy.body.pos.constructor;
    this.probe = this.sourceTemplate.clone();
    this.probe.name = 'foundry.sh-diffuse-probe.v6';
    this.probe.type = 'LightProbe';
    this.probe.isAmbientLight = false;
    this.probe.isHemisphereLight = false;
    this.probe.isDirectionalLight = false;
    this.probe.isLightProbe = true;
    this.probe.isLight = true;
    this.probe.intensity = 1;
    this.probe.sh = {
      coefficients: Array.from({ length: 9 }, () => new vectorCtor(0, 0, 0)),
    };
    this.probe.userData = this.probe.userData ?? {};
    this.probe.userData.foundryAuthority = 'second-order-spherical-harmonic-atmosphere-probe';
    context.legacy.scene.add(this.probe);

    // Retire constant ambient/hemisphere fill. The SH probe is now the diffuse
    // environment authority; direct sunlight remains a separate light.
    context.legacy.scene.traverse((object: any) => {
      if (object === this.probe) return;
      if (object.isAmbientLight || object.isHemisphereLight) object.intensity = 0;
    });

    this.settings.subscribe(() => {
      this.dirty = true;
      context.requestRender('SH diffuse probe changed');
    });
    context.quality.subscribe(() => {
      this.dirty = true;
      context.requestRender('SH diffuse probe quality changed');
    });
    this.rebuild(context);
  }

  update(_dtSeconds: number, context: AppContext): void {
    if (this.coupling.current.revision !== this.lastRevision) this.dirty = true;
    if (this.dirty) this.rebuild(context);
  }

  private rebuild(context: AppContext): void {
    if (!this.probe) return;
    const started = performance.now();
    const settings = this.settings.get();
    const profile = context.quality.current;
    const direction = sunDirectionFromAngles(settings.sunElevationDeg, settings.sunAzimuthDeg);
    const projection = projectAtmosphereToSh(
      direction,
      settings,
      profile.atmosphereShSamples,
      Math.max(4, Math.floor(profile.atmosphereViewSamples / 2)),
      Math.max(2, Math.floor(profile.atmosphereSunSamples / 2)),
    );
    const whiteBalance = this.coupling.current.whiteBalanceRgb;
    const intensity = Math.max(0, settings.diffuseEnvironmentIntensity) * SH_RENDER_CALIBRATION;
    this.probe.intensity = intensity;
    this.coefficientLuminance = [];
    for (let i = 0; i < 9; i++) {
      const source = projection.coefficients[i]!;
      const r = source.r * whiteBalance.r;
      const g = source.g * whiteBalance.g;
      const b = source.b * whiteBalance.b;
      this.probe.sh.coefficients[i].set(r, g, b);
      this.coefficientLuminance.push(luminance({ r, g, b }));
    }
    this.samples = projection.samples;
    this.lastRevision = this.coupling.current.revision;
    this.lastCpuMs = performance.now() - started;
    this.meanCpuMs += (this.lastCpuMs - this.meanCpuMs) / (this.updates + 1);
    this.updates++;
    this.dirty = false;
  }

  telemetry(): Record<string, unknown> {
    return {
      created: !!this.probe,
      active: this.probe?.parent != null && this.probe?.intensity > 0,
      objectType: this.probe?.type ?? null,
      intensity: this.probe?.intensity ?? 0,
      samples: this.samples,
      coefficients: this.probe?.sh?.coefficients?.map?.((value: any) => value.toArray?.() ?? [value.x, value.y, value.z]) ?? [],
      coefficientLuminance: this.coefficientLuminance,
      updates: this.updates,
      cpuMs: { last: this.lastCpuMs, mean: this.meanCpuMs },
      authority: 'order-2 atmosphere SH light probe replaces constant hemisphere/ambient fill',
      truthBoundary: 'global diffuse probe only; local visibility, probe grids and near-field object bounce remain separate future authorities',
    };
  }

  dispose(): void {
    this.probe?.parent?.remove?.(this.probe);
    this.probe = null;
  }
}
