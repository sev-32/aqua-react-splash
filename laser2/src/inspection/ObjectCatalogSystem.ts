import type { AppContext, AppSystem } from '../core/System.js';
import type { BoatSceneSystem } from '../scene/BoatSceneSystem.js';

export interface CatalogItem {
  id: string;
  name: string;
  group: string;
  object: any;
  objects: any[];
  visible: boolean;
  triangleCount: number;
  description: string;
  sourceBinding: string;
  verified: boolean;
}

export class ObjectCatalogSystem implements AppSystem {
  readonly id = 'inspection.catalog';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  readonly items: CatalogItem[] = [];
  readonly byId = new Map<string, CatalogItem>();

  constructor(readonly sceneSystem: BoatSceneSystem) {}

  init(_context: AppContext): void {
    this.rebuild();
  }

  rebuild(): void {
    this.items.length = 0;
    this.byId.clear();
    for (const entity of this.sceneSystem.entities) {
      const item: CatalogItem = {
        id: entity.id,
        name: entity.name,
        group: entity.group,
        object: entity.objects[0],
        objects: [...entity.objects],
        visible: entity.objects.some((object) => object?.visible !== false),
        triangleCount: entity.triangleCount,
        description: entity.description,
        sourceBinding: entity.sourceBinding,
        verified: entity.verified,
      };
      this.items.push(item);
      this.byId.set(item.id, item);
    }
    this.items.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  }

  telemetry(): Record<string, unknown> {
    const groups: Record<string, number> = {};
    let triangles = 0;
    let verified = 0;
    for (const item of this.items) {
      groups[item.group] = (groups[item.group] ?? 0) + 1;
      triangles += item.triangleCount;
      if (item.verified) verified++;
    }
    return {
      source: 'BoatSceneSystem semantic entities; no scene-wide naming heuristic',
      items: this.items.length,
      verified,
      triangles,
      groups,
    };
  }
}
