import type { AppSystem } from '../core/System.js';
import type { LegacyRuntimeAdapter } from '../legacy/LegacyRuntimeAdapter.js';
type FrameMode = 'static' | 'dynamic';
export declare class TelemetryHub {
    private runtime;
    private gpuTimer;
    private webglStatic;
    private readonly scopes;
    private readonly allFrameTimes;
    private readonly staticFrameTimes;
    private readonly dynamicFrameTimes;
    private readonly dynamicIntervals;
    private readonly errors;
    private readonly glErrors;
    private readonly cachedSystems;
    private frame;
    private dt;
    private startedAt;
    private lastFrameStart;
    private frameMode;
    private frameReason;
    private lastGlError;
    /**
     * gl.getError() is a synchronous round trip to the GPU process (it flushes
     * and waits), so checking after every frame-graph phase serialised CPU and
     * GPU several times a frame. GL errors are sticky until read, so sampling
     * at frame boundaries loses none of them, only per-phase attribution:
     *   'sampled' (default) every 30th frame end, 'frame' every frame end,
     *   'phase' after every phase as before (URL ?glcheck=phase for debugging).
     * Runtime/init boundaries and explicit verification checks always read.
     */
    readonly glErrorPolicy: 'phase' | 'frame' | 'sampled';
    private glChecksSkipped;
    private telemetrySamples;
    private telemetrySampleLastMs;
    private telemetrySampleMeanMs;
    private telemetrySampleMaxMs;
    attachRuntime(runtime: LegacyRuntimeAdapter): void;
    beginFrame(dt: number, mode?: FrameMode, reason?: string): void;
    endFrame(systems: readonly AppSystem[]): void;
    beginCpuScope(label: string): () => void;
    private recordScope;
    recordError(system: string, error: unknown): void;
    /** Per-phase check: only under the 'phase' policy (see glErrorPolicy). */
    checkGlErrorAtPhase(label: string): number;
    checkGlError(label: string): number;
    sampleSystems(systems: readonly AppSystem[], reason: string): void;
    systemSnapshot(systems: readonly AppSystem[]): Array<Record<string, unknown>>;
    performanceSummary(): Record<string, any>;
    snapshot(): Record<string, any>;
}
export {};
//# sourceMappingURL=TelemetryHub.d.ts.map