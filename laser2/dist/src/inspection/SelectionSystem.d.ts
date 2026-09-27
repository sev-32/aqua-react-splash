import type { AppContext, AppSystem } from '../core/System.js';
import type { ObjectCatalogSystem, CatalogItem } from './ObjectCatalogSystem.js';
import type { CameraControllerSystem } from './CameraControllerSystem.js';
export declare class SelectionSystem implements AppSystem {
    readonly catalog: ObjectCatalogSystem;
    readonly camera: CameraControllerSystem;
    readonly id = "inspection.selection";
    readonly phase: "ui";
    enabled: boolean;
    private selected;
    private context;
    private readonly materialSwaps;
    private visibilitySnapshot;
    private highlightClones;
    constructor(catalog: ObjectCatalogSystem, camera: CameraControllerSystem);
    init(context: AppContext): void;
    select(id: string | null, focus?: boolean): void;
    get current(): CatalogItem | null;
    isolate(enabled: boolean): void;
    private cloneAndTint;
    private applyHighlight;
    private restoreHighlight;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SelectionSystem.d.ts.map