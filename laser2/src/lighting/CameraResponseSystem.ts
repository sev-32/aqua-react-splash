import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';

/** Global renderer/camera response authority. */
export class CameraResponseSystem implements AppSystem {
  readonly id = 'lighting.camera-response';
  readonly phase = 'preRender' as const;
  enabled = true;
  private context: AppContext | null = null;
  private lastRevision = -1;
  private updates = 0;
  private lastCpuMs = 0;
  private originalToneMapping: unknown = null;
  private originalExposure = 1;
  private originalOutputColorSpace: unknown = null;

  constructor(
    readonly settings: LightingState,
    readonly coupling: RadiometricCouplingSystem,
  ) {}

  init(context: AppContext): void {
    this.context = context;
    const renderer = context.legacy.renderer;
    this.originalToneMapping = renderer.toneMapping;
    this.originalExposure = renderer.toneMappingExposure ?? 1;
    this.originalOutputColorSpace = renderer.outputColorSpace ?? renderer.outputEncoding ?? null;
    this.apply(context, true);
    this.settings.subscribe(() => {
      this.apply(context, true);
      context.requestRender('camera response changed');
    });
  }

  update(_dtSeconds: number, context: AppContext): void {
    this.apply(context, false);
  }

  private apply(context: AppContext, force: boolean): void {
    const budget = this.coupling.current;
    if (!force && budget.revision === this.lastRevision) return;
    const started = performance.now();
    const renderer = context.legacy.renderer;
    this.lastRevision = budget.revision;
    // THREE.ACESFilmicToneMapping in r160. Keeping this single renderer-level
    // transform prevents material-specific tone-map divergence.
    renderer.toneMapping = 4;
    renderer.toneMappingExposure = budget.rendererExposure;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = 'srgb';
    else if ('outputEncoding' in renderer) renderer.outputEncoding = 3001;
    this.lastCpuMs = performance.now() - started;
    this.updates++;
  }

  telemetry(): Record<string, unknown> {
    const settings = this.settings.get();
    return {
      updates: this.updates,
      cpuMs: this.lastCpuMs,
      rendererToneMapping: this.context?.legacy.renderer?.toneMapping ?? null,
      rendererExposure: this.context?.legacy.renderer?.toneMappingExposure ?? null,
      outputColorSpace: this.context?.legacy.renderer?.outputColorSpace ?? this.context?.legacy.renderer?.outputEncoding ?? null,
      whiteBalanceKelvin: settings.whiteBalanceKelvin,
      whiteBalanceRgb: this.coupling.current.whiteBalanceRgb,
      highlightHeadroom: settings.toneMappingShoulder,
      authority: 'global ACES-filmic renderer response with one atmosphere-coupled exposure and chromatic-adaptation state',
      truthBoundary: 'white balance is applied consistently to sun, sky LUT, SH diffuse and ground bounce; a measured camera spectral sensitivity curve remains future work',
    };
  }

  dispose(): void {
    if (!this.context) return;
    const renderer = this.context.legacy.renderer;
    renderer.toneMapping = this.originalToneMapping;
    renderer.toneMappingExposure = this.originalExposure;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = this.originalOutputColorSpace;
  }
}
