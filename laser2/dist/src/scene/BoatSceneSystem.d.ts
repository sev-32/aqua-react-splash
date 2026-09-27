import type { AppContext, AppSystem } from '../core/System.js';
import type { SceneEntity } from './SceneEntity.js';
import { NativeHullAssetSystem } from './NativeHullAssetSystem.js';
export declare class BoatSceneSystem implements AppSystem {
    private readonly nativeHull;
    readonly id = "scene.boat-semantic-root";
    readonly phase: "postPhysics";
    enabled: boolean;
    readonly entities: SceneEntity[];
    readonly byId: Map<string, SceneEntity>;
    root: any;
    private groups;
    private assignedMeshes;
    private unassignedMeshes;
    private bindingErrors;
    private ownedTopLevelRoots;
    private nativeOwnedRoots;
    constructor(nativeHull: NativeHullAssetSystem);
    init(context: AppContext): void;
    private createNativeRoot;
    private register;
    private bindIndexedChildren;
    private buildSemanticEntities;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=BoatSceneSystem.d.ts.map