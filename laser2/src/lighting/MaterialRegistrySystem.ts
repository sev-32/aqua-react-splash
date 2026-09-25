import type { AppContext, AppSystem } from '../core/System.js';

export interface MaterialRecord {
  id: number;
  name: string;
  type: string;
  meshNames: string[];
  category: 'sailcloth' | 'vinyl' | 'aluminum' | 'gelcoat' | 'deck' | 'rope' | 'water' | 'crew' | 'other';
  roughness: number | null;
  metalness: number | null;
  transmission: number | null;
}

export class MaterialRegistrySystem implements AppSystem {
  readonly id = 'lighting.material-registry';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  readonly records: MaterialRecord[] = [];

  init(context: AppContext): void {
    this.rebuild(context);
  }

  rebuild(context: AppContext): void {
    const records = new Map<number, MaterialRecord>();
    context.legacy.scene.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || typeof material.id !== 'number') continue;
        const existing: MaterialRecord = records.get(material.id) ?? {
          id: material.id,
          name: material.name || `material-${material.id}`,
          type: material.type || 'Unknown',
          meshNames: [] as string[],
          category: this.classify(object, material),
          roughness: Number.isFinite(material.roughness) ? material.roughness : null,
          metalness: Number.isFinite(material.metalness) ? material.metalness : null,
          transmission: Number.isFinite(material.transmission) ? material.transmission : null,
        };
        existing.meshNames.push(object.name || `mesh-${object.id}`);
        records.set(material.id, existing);
      }
    });
    this.records.splice(0, this.records.length, ...records.values());
  }

  private classify(object: any, material: any): MaterialRecord['category'] {
    const text = `${object.name ?? ''} ${material.name ?? ''}`.toLowerCase();
    if (text.includes('vinyl') || material.transmission > 0.5) return 'vinyl';
    if (text.includes('sail') || text.includes('cloth')) return 'sailcloth';
    if (text.includes('mast') || text.includes('boom') || text.includes('spreader') || text.includes('alum')) return 'aluminum';
    if (text.includes('deck') || text.includes('nonskid')) return 'deck';
    if (text.includes('hull') || text.includes('gelcoat')) return 'gelcoat';
    if (text.includes('rope') || text.includes('sheet') || text.includes('line')) return 'rope';
    if (text.includes('water') || text.includes('ocean')) return 'water';
    if (text.includes('crew') || text.includes('body') || text.includes('skin')) return 'crew';
    return 'other';
  }

  telemetry(): Record<string, unknown> {
    const categories: Record<string, number> = {};
    for (const record of this.records) categories[record.category] = (categories[record.category] ?? 0) + 1;
    return { count: this.records.length, categories, records: this.records.slice(0, 80) };
  }
}
