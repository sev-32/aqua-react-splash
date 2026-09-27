import type { AppContext, AppSystem } from '../core/System.js';
import type { ScenePipeline } from './ScenePipeline.js';
export interface RenderBatchResult {
    iterations: number;
    elapsedMs: number;
    perIterationMs: number;
    finishAtEnd: boolean;
    reason: string;
}
export declare class RenderSystem implements AppSystem {
    readonly id = "render.main";
    readonly phase: "postRender";
    enabled: boolean;
    private readonly warmupRenders;
    private readonly submissionSamplesMs;
    private readonly completedBatchSamplesMs;
    private readonly reasons;
    private context;
    private originalRender;
    private renders;
    private benchmarkRenders;
    private captureRenders;
    private lastSubmissionMs;
    private lastCalls;
    private lastTriangles;
    private unauthorizedRenderCalls;
    private authorityActive;
    private pipeline;
    private pipelineRenders;
    /** Multi-pass HDR pipeline used while the native ocean surface is visible. */
    attachPipeline(pipeline: ScenePipeline): this;
    init(context: AppContext): void;
    update(_dtSeconds: number, context: AppContext): void;
    renderNow(reason: string): number;
    renderBatch(iterations: number, reason: string, finishAtEnd?: boolean): RenderBatchResult;
    finish(reason: string): number;
    telemetry(): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=RenderSystem.d.ts.map