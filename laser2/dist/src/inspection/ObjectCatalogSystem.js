export class ObjectCatalogSystem {
    sceneSystem;
    id = 'inspection.catalog';
    phase = 'postPhysics';
    enabled = true;
    items = [];
    byId = new Map();
    constructor(sceneSystem) {
        this.sceneSystem = sceneSystem;
    }
    init(_context) {
        this.rebuild();
    }
    rebuild() {
        this.items.length = 0;
        this.byId.clear();
        for (const entity of this.sceneSystem.entities) {
            const item = {
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
    telemetry() {
        const groups = {};
        let triangles = 0;
        let verified = 0;
        for (const item of this.items) {
            groups[item.group] = (groups[item.group] ?? 0) + 1;
            triangles += item.triangleCount;
            if (item.verified)
                verified++;
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
//# sourceMappingURL=ObjectCatalogSystem.js.map