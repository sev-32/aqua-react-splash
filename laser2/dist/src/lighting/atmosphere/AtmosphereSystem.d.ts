import type { AppContext, AppSystem } from '../../core/System.js';
import type { LightingState } from '../LightingState.js';
import type { RadiometricCouplingSystem } from '../RadiometricCouplingSystem.js';
/**
 * The sky shader tone-maps itself with the Narkowicz ACES fit, which renders
 * a given radiance brighter than the renderer's r160 ACES transform. When the
 * HDR pipeline tone-maps the sky through the renderer instead, scaling the
 * scene-linear sky radiance by 1.2 reproduces the legacy sky within ~3/255
 * (measured on the default sky). The water reflects the sky with the same
 * scale so the horizon stays seamless.
 */
export declare const SKY_LINEAR_DISPLAY_SCALE = 1.2;
export declare class AtmosphereSystem implements AppSystem {
    readonly settings: LightingState;
    readonly coupling: RadiometricCouplingSystem;
    readonly id = "lighting.atmosphere";
    readonly phase: "preRender";
    enabled: boolean;
    private context;
    private mesh;
    private material;
    private geometry;
    private sourceSky;
    private lutCanvas;
    private lutTexture;
    private lutData;
    private hdrEnvironment;
    private dirty;
    private updateAccumulatorSeconds;
    private deferredDynamicUpdates;
    private lastShaderKey;
    private lutUpdates;
    private shaderRebuilds;
    private cameraRecenters;
    private lastLutMs;
    private meanLutMs;
    private lastApplyMs;
    private meanApplyMs;
    private lastUpdateMs;
    private lutPixels;
    private textureSourceName;
    private worker;
    private workerSupported;
    private workerActive;
    private workerJobs;
    private workerFallbacks;
    private workerRestarts;
    private bootstrapFallbacks;
    private pendingGeneration;
    private appliedGeneration;
    private cancelledGenerations;
    private workerErrors;
    private initialJob;
    private initialResolve;
    private lastFirstOrderEnergy;
    private lastFinalEnergy;
    constructor(settings: LightingState, coupling: RadiometricCouplingSystem);
    init(context: AppContext): Promise<void>;
    update(dtSeconds: number, context: AppContext): void;
    private ensureWorker;
    private requestLut;
    private applyResult;
    private resolveInitial;
    private updateSunUniforms;
    private findTexturePrototype;
    private createSky;
    private rebuildShader;
    get environmentTexture(): any;
    get lutRadianceRange(): number;
    /** Multiplier that turns LUT texels into radiance for the texture currently bound. */
    get currentLutRadianceRange(): number;
    /** The HDR scene pipeline renders the sky scene-linear into its target. */
    setLinearOutput(enabled: boolean): void;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=AtmosphereSystem.d.ts.map