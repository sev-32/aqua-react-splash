import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';

export class VinylController implements AppSystem {
  readonly id = 'materials.vinyl';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  private optics: any = null;
  private last = Number.NaN;

  constructor(readonly settings: LightingState) {}

  init(context: AppContext): void {
    this.optics = context.legacy.sailOpticsV17;
    this.apply(context);
    this.settings.subscribe(() => {
      this.apply(context);
      context.requestRender('vinyl setting changed');
    });
  }

  private apply(_context: AppContext): void {
    const value = this.settings.get().vinylTransmission;
    if (value === this.last) return;
    this.last = value;
    if (this.optics?.setParam) this.optics.setParam('vinylTransmission', value);
    else if (this.optics?.params) this.optics.params.vinylTransmission = value;
  }

  telemetry(): Record<string, unknown> {
    return { vinylMeshes: this.optics?.vinylMeshes?.length ?? 0, transmission: this.last };
  }
}
