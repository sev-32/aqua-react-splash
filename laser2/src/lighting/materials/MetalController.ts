import type { AppContext, AppSystem } from '../../core/System.js';
import { LightingState } from '../LightingState.js';

interface Target { mesh: any; material: any }

export class MetalController implements AppSystem {
  readonly id = 'materials.aluminum';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  private readonly targets: Target[] = [];
  private lastRoughness = Number.NaN;

  constructor(readonly settings: LightingState) {}

  init(context: AppContext): void {
    context.legacy.scene.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const text = `${object.name ?? ''} ${object.material?.name ?? ''}`.toLowerCase();
      if (!/(mast|boom|spreader|alum)/.test(text)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) if (material?.isMeshStandardMaterial || material?.isMeshPhysicalMaterial) this.targets.push({ mesh: object, material });
    });
    this.apply(context);
    this.settings.subscribe(() => {
      this.apply(context);
      context.requestRender('aluminum setting changed');
    });
  }

  private apply(_context: AppContext): void {
    const roughness = this.settings.get().aluminumRoughness;
    if (roughness === this.lastRoughness) return;
    this.lastRoughness = roughness;
    for (const { material } of this.targets) {
      material.metalness = 0.88;
      material.roughness = roughness;
      if ('clearcoat' in material) {
        material.clearcoat = 0.08;
        material.clearcoatRoughness = Math.min(0.6, roughness + 0.12);
      }
      material.needsUpdate = true;
    }
  }

  telemetry(): Record<string, unknown> {
    return { targets: this.targets.length, roughness: this.lastRoughness, model: 'PBR aluminum compatibility calibration; anisotropic conductor BRDF is a later backend' };
  }
}
