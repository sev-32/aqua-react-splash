import type { AppContext, AppSystem } from '../core/System.js';
import type { OceanSystem } from './OceanSystem.js';
import type { RadiometricCouplingSystem } from '../lighting/RadiometricCouplingSystem.js';
import type { AtmosphereSystem } from '../lighting/atmosphere/AtmosphereSystem.js';
import type { LightingState } from '../lighting/LightingState.js';
import type { WaterInteractionSystem } from './WaterInteractionSystem.js';
export interface WaterOptics {
    /** Absorption coefficient a (1/m) at ~650/550/450 nm. */
    absorption: [number, number, number];
    /** Total scattering coefficient b (1/m); with a it sets beam attenuation. */
    scattering: [number, number, number];
    /** Backscattering coefficient b_b (1/m); sets the water-leaving colour. */
    backscatter: [number, number, number];
    refractionStrength: number;
    foamAmount: number;
}
export declare const DEFAULT_WATER_OPTICS: WaterOptics;
export declare class WaterSurfaceSystem implements AppSystem {
    readonly ocean: OceanSystem;
    readonly coupling: RadiometricCouplingSystem;
    readonly atmosphere: AtmosphereSystem;
    readonly lighting: LightingState;
    readonly id = "water.surface";
    readonly phase: "preRender";
    enabled: boolean;
    active: boolean;
    readonly scene: any;
    mesh: any;
    material: any;
    optics: WaterOptics;
    private geometry;
    private waveTexture;
    private waveData;
    private waveRevision;
    private waveCount;
    private context;
    private light;
    private dummyDepth;
    private dummyShadow;
    private readonly gridSnap;
    readonly farRadius = 3400;
    foamMap: any;
    foamRegion: {
        x: number;
        z: number;
        size: number;
        enabled: boolean;
    };
    private vertexCount;
    interaction: WaterInteractionSystem | null;
    private triangleCount;
    private updates;
    constructor(ocean: OceanSystem, coupling: RadiometricCouplingSystem, atmosphere: AtmosphereSystem, lighting: LightingState);
    init(context: AppContext): void;
    setActive(active: boolean): void;
    /** Radial grid: geometric ring spacing, per-vertex `spacing` for LOD filtering. */
    private buildGeometry;
    private uploadWaves;
    update(_dt: number, context: AppContext): void;
    /** Called by ScenePipeline before the water pass. */
    bindScene(color: any, depth: any, width: number, height: number): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=WaterSurfaceSystem.d.ts.map