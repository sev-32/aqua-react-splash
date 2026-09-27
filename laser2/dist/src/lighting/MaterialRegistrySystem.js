export class MaterialRegistrySystem {
    id = 'lighting.material-registry';
    phase = 'postPhysics';
    enabled = true;
    records = [];
    init(context) {
        this.rebuild(context);
    }
    rebuild(context) {
        const records = new Map();
        context.legacy.scene.traverse((object) => {
            if (!object.isMesh || !object.material)
                return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (!material || typeof material.id !== 'number')
                    continue;
                const existing = records.get(material.id) ?? {
                    id: material.id,
                    name: material.name || `material-${material.id}`,
                    type: material.type || 'Unknown',
                    meshNames: [],
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
    classify(object, material) {
        const text = `${object.name ?? ''} ${material.name ?? ''}`.toLowerCase();
        if (text.includes('vinyl') || material.transmission > 0.5)
            return 'vinyl';
        if (text.includes('sail') || text.includes('cloth'))
            return 'sailcloth';
        if (text.includes('mast') || text.includes('boom') || text.includes('spreader') || text.includes('alum'))
            return 'aluminum';
        if (text.includes('deck') || text.includes('nonskid'))
            return 'deck';
        if (text.includes('hull') || text.includes('gelcoat'))
            return 'gelcoat';
        if (text.includes('rope') || text.includes('sheet') || text.includes('line'))
            return 'rope';
        if (text.includes('water') || text.includes('ocean'))
            return 'water';
        if (text.includes('crew') || text.includes('body') || text.includes('skin'))
            return 'crew';
        return 'other';
    }
    telemetry() {
        const categories = {};
        for (const record of this.records)
            categories[record.category] = (categories[record.category] ?? 0) + 1;
        return { count: this.records.length, categories, records: this.records.slice(0, 80) };
    }
}
//# sourceMappingURL=MaterialRegistrySystem.js.map