import type { AppContext, AppSystem } from '../core/System.js';

export class WaterLightingSystem implements AppSystem {
  readonly id = 'lighting.water';
  readonly phase = 'preRender' as const;
  enabled = false;
  private backend: 'disabled' | 'native-ocean-v8' = 'disabled';

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
    // The legacy ocean meshes are retired: WaterSurfaceSystem renders the
    // native surface (same wave components as the physics) when water is on.
    for (const object of [water.meshNear, water.meshFar]) if (object) object.visible = false;
    this.backend = active ? 'native-ocean-v8' : 'disabled';
    context.requestRender('water visibility changed');
  }

  telemetry(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      backend: this.backend,
      contract: ['sun reflection', 'environment reflection', 'refraction', 'absorption', 'boat shadow', 'water bounce'],
      note: 'inspection keeps water off; sailing renders the native ocean surface (WaterSurfaceSystem + ScenePipeline)',
    };
  }
}
