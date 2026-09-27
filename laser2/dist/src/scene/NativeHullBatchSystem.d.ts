import type { AppContext, AppSystem } from '../core/System.js';
import type { NativeHullAssetSystem } from './NativeHullAssetSystem.js';
export declare class NativeHullBatchSystem implements AppSystem {
    readonly nativeHull: NativeHullAssetSystem;
    readonly id = "scene.native-hull-batches";
    readonly phase: "postPhysics";
    enabled: boolean;
    root: any;
    private sourceMeshes;
    private batchMeshes;
    private sourceTriangles;
    private batchTriangles;
    private sourceVertices;
    private batchVertices;
    private buildMs;
    private materialGroups;
    private errors;
    constructor(nativeHull: NativeHullAssetSystem);
    init(context: AppContext): void;
    private mergeGroup;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=NativeHullBatchSystem.d.ts.map