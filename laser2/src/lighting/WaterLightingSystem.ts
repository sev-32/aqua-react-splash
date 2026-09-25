import type { AppContext, AppSystem } from '../core/System.js';

export class WaterLightingSystem implements AppSystem {
  readonly id = 'lighting.water';
  readonly phase = 'preRender' as const;
  enabled = false;
  private backend: 'disabled' | 'legacy' = 'disabled';

  init(context: AppContext): void {
    this.enabled = context.state.get().waterEnabled;
    context.state.subscribe((state) => {
      this.enabled = state.waterEnabled;
      this.apply(context);
    });
    this.apply(context);
  }

  private apply(context: AppContext): void {
    const water = context.legacy.master.water;
    if (!water) return;
    const active = context.state.get().waterEnabled;
    for (const object of [water.meshNear, water.meshFar]) if (object) object.visible = active;
    this.backend = active ? 'legacy' : 'disabled';
    context.requestRender('water visibility changed');
  }

  telemetry(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      backend: this.backend,
      contract: ['sun reflection', 'environment reflection', 'refraction', 'absorption', 'boat shadow', 'water bounce'],
      note: 'water is disabled in the static inspection milestone; the system boundary is explicit and independently benchmarkable',
    };
  }
}
