import type { AppContext, AppSystem } from '../../core/System.js';
import type { CrewRecoverySystem } from '../CrewRecoverySystem.js';
export declare class LucidCrewSystem implements AppSystem {
    readonly crewRecovery: CrewRecoverySystem | null;
    readonly id = "crew.lucid-body";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private asset;
    private instances;
    private status;
    private frames;
    private solveMs;
    private geometry;
    private vestGeometry;
    private hairGeometry;
    constructor(crewRecovery?: CrewRecoverySystem | null);
    init(context: AppContext): Promise<void>;
    private buildGeometry;
    /**
     * Buoyancy aid: the torso surface between waist and shoulders, offset along
     * the rest normals by the foam thickness, relaxed (Laplacian) into stiff
     * panels, and skinned with the same canonical weights as the vertices it
     * was built from.
     */
    private buildVestGeometry;
    /**
     * Hair: a thin shell over the scalp (offset along the rest normals) and a
     * bun at the back of the head, both carried by the canonical head clusters.
     */
    private buildHairGeometry;
    private skinningChunks;
    private makeMaterial;
    private makeDepthMaterial;
    private createInstance;
    private gripFor;
    private pose;
    /** Head forward from the legacy head bone (legacy rest look is +z). */
    private lookDirection;
    update(_dt: number): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=LucidCrewSystem.d.ts.map