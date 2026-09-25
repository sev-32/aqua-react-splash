import type { AppContext, AppSystem } from '../core/System.js';
import type { ObjectCatalogSystem, CatalogItem } from './ObjectCatalogSystem.js';
import type { CameraControllerSystem } from './CameraControllerSystem.js';

interface MaterialSwap {
  original: any;
  highlighted: any;
  wasVisible: boolean;
}

export class SelectionSystem implements AppSystem {
  readonly id = 'inspection.selection';
  readonly phase = 'ui' as const;
  enabled = true;
  private selected: CatalogItem | null = null;
  private context: AppContext | null = null;
  private readonly materialSwaps = new Map<any, MaterialSwap>();
  private visibilitySnapshot = new Map<any, boolean>();
  private highlightClones = 0;

  constructor(readonly catalog: ObjectCatalogSystem, readonly camera: CameraControllerSystem) {}

  init(context: AppContext): void {
    this.context = context;
  }

  select(id: string | null, focus = true): void {
    this.restoreHighlight();
    this.selected = id ? this.catalog.byId.get(id) ?? null : null;
    if (this.selected) {
      for (const object of this.selected.objects) this.applyHighlight(object);
      if (focus) this.camera.focus(this.selected);
    }
    this.context?.state.update({ selectedObjectId: this.selected?.id ?? null });
    this.context?.events.emit('selection:change', { id: this.selected?.id ?? null });
    this.context?.requestRender('selection changed');
  }

  get current(): CatalogItem | null { return this.selected; }

  isolate(enabled: boolean): void {
    if (!this.selected) return;
    if (!enabled) {
      for (const [object, visible] of this.visibilitySnapshot) object.visible = visible;
      this.visibilitySnapshot.clear();
      this.context?.requestRender('isolation disabled');
      return;
    }
    const selectedObjects = new Set<any>();
    for (const root of this.selected.objects) root?.traverse?.((object: any) => selectedObjects.add(object));
    for (const item of this.catalog.items) {
      for (const root of item.objects) {
        root?.traverse?.((object: any) => {
          if (!object?.isMesh || this.visibilitySnapshot.has(object)) return;
          this.visibilitySnapshot.set(object, object.visible !== false);
          object.visible = selectedObjects.has(object);
        });
      }
    }
    this.context?.requestRender('isolation enabled');
  }

  private cloneAndTint(material: any): any {
    const clone = material?.clone?.() ?? material;
    if (clone?.emissive?.setRGB) {
      clone.emissive.setRGB(0.18, 0.07, 0.01);
      clone.emissiveIntensity = 0.55;
    }
    clone.userData = clone.userData ?? {};
    clone.userData.foundrySelectionClone = true;
    this.highlightClones++;
    return clone;
  }

  private applyHighlight(root: any): void {
    root?.traverse?.((object: any) => {
      if (!object?.isMesh || this.materialSwaps.has(object) || !object.material) return;
      const original = object.material;
      const highlighted = Array.isArray(original)
        ? original.map((material: any) => this.cloneAndTint(material))
        : this.cloneAndTint(original);
      const wasVisible = object.visible !== false;
      if (object.userData?.foundryBatchedSource) object.visible = true;
      object.material = highlighted;
      this.materialSwaps.set(object, { original, highlighted, wasVisible });
    });
  }

  private restoreHighlight(): void {
    for (const [object, swap] of this.materialSwaps) {
      object.material = swap.original;
      object.visible = swap.wasVisible;
      const clones = Array.isArray(swap.highlighted) ? swap.highlighted : [swap.highlighted];
      for (const clone of clones) if (clone !== swap.original) clone?.dispose?.();
    }
    this.materialSwaps.clear();
  }

  telemetry(): Record<string, unknown> {
    return {
      selected: this.selected ? { id: this.selected.id, name: this.selected.name, group: this.selected.group, objectCount: this.selected.objects.length } : null,
      isolationSnapshotObjects: this.visibilitySnapshot.size,
      highlightedMeshes: this.materialSwaps.size,
      highlightMaterialClonesCreated: this.highlightClones,
      authority: 'selection highlight uses temporary per-object material clones, preserving pooled production materials',
    };
  }
}
