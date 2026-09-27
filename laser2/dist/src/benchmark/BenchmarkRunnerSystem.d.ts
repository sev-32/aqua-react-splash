import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from '../lighting/LightingState.js';
import type { RenderSystem } from '../render/RenderSystem.js';
export type BenchmarkId = 'render-static' | 'atmosphere-sweep' | 'lighting-sweep' | 'rig-step' | 'fixed-step-cadence' | 'cpu-reference';
export interface BenchmarkResult {
    id: BenchmarkId;
    startedAt: string;
    elapsedMs: number;
    iterations: number;
    warmupIterations: number;
    perIterationMs: number;
    measurementBoundary: string;
    scenario: Record<string, unknown>;
    telemetry: Record<string, unknown>;
}
export declare class BenchmarkRunnerSystem implements AppSystem {
    readonly lighting: LightingState;
    readonly renderSystem: RenderSystem;
    readonly id = "benchmark.runner";
    readonly phase: "ui";
    enabled: boolean;
    private context;
    private readonly results;
    running: boolean;
    constructor(lighting: LightingState, renderSystem: RenderSystem);
    init(context: AppContext): void;
    run(id: BenchmarkId): Promise<BenchmarkResult>;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=BenchmarkRunnerSystem.d.ts.map