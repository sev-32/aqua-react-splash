import type { AppContext, AppSystem } from '../core/System.js';
import { OceanWaveField, type WaveSample } from './OceanWaveField.js';
import { type SeaState, type WaveComponent } from './OceanSpectrum.js';
import type { PhysicsStepBus } from '../sailing/PhysicsStepBus.js';
export declare class OceanSystem implements AppSystem {
    private readonly bus;
    readonly id = "water.ocean";
    readonly phase: "prePhysics";
    enabled: boolean;
    readonly field: OceanWaveField;
    sea: SeaState;
    /** Sea states being cross-faded; the newest has target weight 1. */
    private layers;
    fadeDurationS: number;
    private context;
    private installed;
    private stepStartTime;
    private stepDt;
    private substepIndex;
    private substeps;
    private lastFocus;
    private seaInputs;
    private revision;
    private readonly sampleScratch;
    private legacyOriginal;
    private removeStepListener;
    constructor(bus: PhysicsStepBus);
    /** Simulation time at the start of the last physics step. */
    time: number;
    /**
     * Time the rendered surface must show: the end of the last physics step,
     * which is the state the legacy visual sync posed the boat and crew in.
     */
    renderTime: number;
    fetchM: number;
    swellHeightM: number;
    get renderComponents(): {
        components: WaveComponent[];
        revision: number;
    };
    get fadeProgress(): number | null;
    init(context: AppContext): void;
    /**
     * Redirects the legacy ocean object and the physics world to this authority.
     * Idempotent; `uninstall` restores the adapter-stubbed behaviour.
     */
    install(context: AppContext): void;
    uninstall(context: AppContext): void;
    get isInstalled(): boolean;
    private readonly substepHook;
    /** Called by the physics step wrapper before the XPBD sub-steps. */
    private beginStep;
    /** Prepares the field for queries outside a physics step (e.g. static inspection). */
    prepareStatic(time: number, focusX: number, focusZ: number): void;
    setSea(windSpeed10: number, windFromDeg: number, heightScale: number, immediate: boolean): void;
    private advanceFade;
    private applyComponents;
    /** Physics (and optionally detail) components of every active layer, weighted. */
    private combinedComponents;
    /** 10 m wind speed (m/s) of the sea state being built towards. */
    get windSpeed10(): number;
    height(x: number, z: number): number;
    sample(x: number, y: number, z: number, out: WaveSample): WaveSample;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=OceanSystem.d.ts.map