import type { AppContext, AppSystem } from '../core/System.js';
import type { OceanSystem } from './OceanSystem.js';
import type { SailingPhysicsSystem } from '../sailing/SailingPhysicsSystem.js';
import type { CrewRecoverySystem } from '../crew/CrewRecoverySystem.js';
type DrawFn = (scene: any, camera: any) => void;
export declare class WaterInteractionSystem implements AppSystem {
    readonly ocean: OceanSystem;
    readonly physics: SailingPhysicsSystem;
    readonly crew: CrewRecoverySystem;
    readonly id = "water.interaction";
    readonly phase: "preRender";
    enabled: boolean;
    active: boolean;
    supported: boolean;
    /** Obstacle coupling (0 disables wakes, 1 = full displacement). */
    displacement: number;
    foamHalfLifeS: number;
    private context;
    private N;
    private extent;
    private cell;
    private stateRT;
    private foamRT;
    private foamIndex;
    private stateIndex;
    private composeRT;
    private obstacleRT;
    private etaTexture;
    private etaData;
    private etaN;
    private quadScene;
    private quadMesh;
    private quadCamera;
    private fftMaterial;
    private propagateMaterial;
    private realspaceMaterial;
    private foamMaterial;
    private composeMaterial;
    private obstacleScene;
    private obstacleCamera;
    private obstacleMaterial;
    private hullMesh;
    private swimmerMeshes;
    private tubes;
    private tubeMeshes;
    private centerX;
    private centerZ;
    private shiftX;
    private shiftZ;
    private pendingDt;
    private lastRenderTime;
    private splashes;
    private readonly clearColor;
    private readonly obstacleClear;
    private steps;
    private lastPassMs;
    private strokeMemory;
    private readonly matrix;
    private readonly offset;
    constructor(ocean: OceanSystem, physics: SailingPhysicsSystem, crew: CrewRecoverySystem);
    init(context: AppContext): void;
    private disposeTargets;
    private allocate;
    private needsClear;
    private buildMaterials;
    private updateMaterialConstants;
    /** Builds the obstacle meshes once the legacy rig and physics hull exist. */
    private ensureObstacles;
    update(_dt: number, context: AppContext): void;
    /** Swimmer strokes: hands entering the water and kicking feet. */
    private collectSplashes;
    /** GPU passes; called by ScenePipeline inside the authorised render. */
    renderPasses(renderer: any, draw: DrawFn): void;
    private renderObstacles;
    private uploadEta;
    private heights;
    private renderQuad;
    private simulate;
    get cellM(): number;
    /** Binding consumed by the ocean surface shader. */
    get binding(): {
        texture: any;
        originX: number;
        originZ: number;
        size: number;
        enabled: boolean;
    };
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
export {};
//# sourceMappingURL=WaterInteractionSystem.d.ts.map