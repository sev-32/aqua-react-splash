import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';

export class HullController implements AppSystem {
  readonly id = 'materials.hull-gelcoat';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  private readonly materials: any[] = [];
  private last = Number.NaN;

  constructor(readonly settings: LightingState) {}

  init(context: AppContext): void {
    const seen = new Set<number>();
    context.legacy.scene.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const text = `${object.name ?? ''} ${object.material?.name ?? ''}`.toLowerCase();
      if (!/(hull|deck|cockpit|gelcoat)/.test(text)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || seen.has(material.id) || (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial)) continue;
        seen.add(material.id); this.materials.push(material);
      }
    });
    this.apply(context);
    this.settings.subscribe(() => {
      this.apply(context);
      context.requestRender('hull setting changed');
    });
  }

  private apply(_context: AppContext): void {
    const roughness = this.settings.get().hullGelcoatRoughness;
    if (roughness === this.last) return;
    this.last = roughness;
    for (const material of this.materials) {
      material.metalness = 0;
      material.roughness = Math.max(0.12, roughness);
      if ('clearcoat' in material) {
        material.clearcoat = 0.65;
        material.clearcoatRoughness = roughness;
      }
      material.needsUpdate = true;
    }
  }

  telemetry(): Record<string, unknown> {
    return { materials: this.materials.length, roughness: this.last, model: 'layered gelcoat compatibility calibration' };
  }
}
