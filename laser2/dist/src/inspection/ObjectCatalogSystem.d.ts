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
export declare class ObjectCatalogSystem implements AppSystem {
    readonly sceneSystem: BoatSceneSystem;
    readonly id = "inspection.catalog";
    readonly phase: "postPhysics";
    enabled: boolean;
    readonly items: CatalogItem[];
    readonly byId: Map<string, CatalogItem>;
    constructor(sceneSystem: BoatSceneSystem);
    init(_context: AppContext): void;
    rebuild(): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=ObjectCatalogSystem.d.ts.map