export class SelectionSystem {
    catalog;
    camera;
    id = 'inspection.selection';
    phase = 'ui';
    enabled = true;
    selected = null;
    context = null;
    materialSwaps = new Map();
    visibilitySnapshot = new Map();
    highlightClones = 0;
    constructor(catalog, camera) {
        this.catalog = catalog;
        this.camera = camera;
    }
    init(context) {
        this.context = context;
    }
    select(id, focus = true) {
        this.restoreHighlight();
        this.selected = id ? this.catalog.byId.get(id) ?? null : null;
        if (this.selected) {
            for (const object of this.selected.objects)
                this.applyHighlight(object);
            if (focus)
                this.camera.focus(this.selected);
        }
        this.context?.state.update({ selectedObjectId: this.selected?.id ?? null });
        this.context?.events.emit('selection:change', { id: this.selected?.id ?? null });
        this.context?.requestRender('selection changed');
    }
    get current() { return this.selected; }
    isolate(enabled) {
        if (!this.selected)
            return;
        if (!enabled) {
            for (const [object, visible] of this.visibilitySnapshot)
                object.visible = visible;
            this.visibilitySnapshot.clear();
            this.context?.requestRender('isolation disabled');
            return;
        }
        const selectedObjects = new Set();
        for (const root of this.selected.objects)
            root?.traverse?.((object) => selectedObjects.add(object));
        for (const item of this.catalog.items) {
            for (const root of item.objects) {
                root?.traverse?.((object) => {
                    if (!object?.isMesh || this.visibilitySnapshot.has(object))
                        return;
                    this.visibilitySnapshot.set(object, object.visible !== false);
                    object.visible = selectedObjects.has(object);
                });
            }
        }
        this.context?.requestRender('isolation enabled');
    }
    cloneAndTint(material) {
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
    applyHighlight(root) {
        root?.traverse?.((object) => {
            if (!object?.isMesh || this.materialSwaps.has(object) || !object.material)
                return;
            const original = object.material;
            const highlighted = Array.isArray(original)
                ? original.map((material) => this.cloneAndTint(material))
                : this.cloneAndTint(original);
            const wasVisible = object.visible !== false;
            if (object.userData?.foundryBatchedSource)
                object.visible = true;
            object.material = highlighted;
            this.materialSwaps.set(object, { original, highlighted, wasVisible });
        });
    }
    restoreHighlight() {
        for (const [object, swap] of this.materialSwaps) {
            object.material = swap.original;
            object.visible = swap.wasVisible;
            const clones = Array.isArray(swap.highlighted) ? swap.highlighted : [swap.highlighted];
            for (const clone of clones)
                if (clone !== swap.original)
                    clone?.dispose?.();
        }
        this.materialSwaps.clear();
    }
    telemetry() {
        return {
            selected: this.selected ? { id: this.selected.id, name: this.selected.name, group: this.selected.group, objectCount: this.selected.objects.length } : null,
            isolationSnapshotObjects: this.visibilitySnapshot.size,
            highlightedMeshes: this.materialSwaps.size,
            highlightMaterialClonesCreated: this.highlightClones,
            authority: 'selection highlight uses temporary per-object material clones, preserving pooled production materials',
        };
    }
}
//# sourceMappingURL=SelectionSystem.js.map