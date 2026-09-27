import type { WaterSurfaceSystem } from '../water/WaterSurfaceSystem.js';
import type { AtmosphereSystem } from '../lighting/atmosphere/AtmosphereSystem.js';
import type { WaterInteractionSystem } from '../water/WaterInteractionSystem.js';
type DrawFn = (scene: any, camera: any) => void;
export declare class ScenePipeline {
    readonly water: WaterSurfaceSystem;
    readonly atmosphere: AtmosphereSystem;
    readonly interaction: WaterInteractionSystem | null;
    samples: number;
    private target;
    private width;
    private height;
    private compositeScene;
    private compositeCamera;
    private compositeMaterial;
    private sizeScratch;
    private frames;
    private targetRebuilds;
    private lastCalls;
    private lastTriangles;
    private lastError;
    constructor(water: WaterSurfaceSystem, atmosphere: AtmosphereSystem, interaction?: WaterInteractionSystem | null);
    get active(): boolean;
    private ensureResources;
    render(renderer: any, scene: any, camera: any, draw: DrawFn): void;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
export {};
//# sourceMappingURL=ScenePipeline.d.ts.map