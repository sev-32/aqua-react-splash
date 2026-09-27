export class HullController {
    settings;
    id = 'materials.hull-gelcoat';
    phase = 'postPhysics';
    enabled = true;
    materials = [];
    last = Number.NaN;
    constructor(settings) {
        this.settings = settings;
    }
    init(context) {
        const seen = new Set();
        context.legacy.scene.traverse((object) => {
            if (!object.isMesh || !object.material)
                return;
            const text = `${object.name ?? ''} ${object.material?.name ?? ''}`.toLowerCase();
            if (!/(hull|deck|cockpit|gelcoat)/.test(text))
                return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (!material || seen.has(material.id) || (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial))
                    continue;
                seen.add(material.id);
                this.materials.push(material);
            }
        });
        this.apply(context);
        this.settings.subscribe(() => {
            this.apply(context);
            context.requestRender('hull setting changed');
        });
    }
    apply(_context) {
        const roughness = this.settings.get().hullGelcoatRoughness;
        if (roughness === this.last)
            return;
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
    telemetry() {
        return { materials: this.materials.length, roughness: this.last, model: 'layered gelcoat compatibility calibration' };
    }
}
//# sourceMappingURL=HullController.js.map