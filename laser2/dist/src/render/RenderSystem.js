import { RingBuffer } from '../telemetry/RingBuffer.js';
function stats(values) {
    if (!values.length)
        return { samples: 0, mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0;
    return {
        samples: values.length,
        mean: values.reduce((sum, value) => sum + value, 0) / values.length,
        min: sorted[0] ?? 0,
        max: sorted.at(-1) ?? 0,
        p50: percentile(0.50),
        p95: percentile(0.95),
        p99: percentile(0.99),
    };
}
export class RenderSystem {
    id = 'render.main';
    phase = 'postRender';
    enabled = true;
    warmupRenders = 2;
    submissionSamplesMs = new RingBuffer(360);
    completedBatchSamplesMs = new RingBuffer(120);
    reasons = new RingBuffer(48);
    context = null;
    originalRender = null;
    renders = 0;
    benchmarkRenders = 0;
    captureRenders = 0;
    lastSubmissionMs = 0;
    lastCalls = 0;
    lastTriangles = 0;
    unauthorizedRenderCalls = 0;
    authorityActive = false;
    pipeline = null;
    pipelineRenders = 0;
    /** Multi-pass HDR pipeline used while the native ocean surface is visible. */
    attachPipeline(pipeline) {
        this.pipeline = pipeline;
        return this;
    }
    init(context) {
        this.context = context;
        const renderer = context.legacy.renderer;
        renderer.setAnimationLoop?.(null);
        context.legacy.freezeLegacyFrameAuthority();
        this.originalRender = renderer.render.bind(renderer);
        const authority = this;
        renderer.render = function (scene, camera) {
            if (!authority.authorityActive)
                authority.unauthorizedRenderCalls++;
            authority.originalRender?.(scene, camera);
        };
    }
    update(_dtSeconds, context) {
        if (context.state.get().dynamic && context.simulation.steps > 0 && context.legacy.renderer.shadowMap?.enabled) {
            context.legacy.renderer.shadowMap.needsUpdate = true;
        }
        this.renderNow('frame-graph');
    }
    renderNow(reason) {
        if (!this.context || !this.originalRender)
            throw new Error('RenderSystem not initialized');
        const { renderer, scene, camera } = this.context.legacy;
        const start = performance.now();
        this.authorityActive = true;
        try {
            if (this.pipeline?.active) {
                this.pipeline.render(renderer, scene, camera, this.originalRender);
                this.pipelineRenders++;
            }
            else {
                this.originalRender(scene, camera);
            }
        }
        finally {
            this.authorityActive = false;
        }
        this.lastSubmissionMs = performance.now() - start;
        this.submissionSamplesMs.push(this.lastSubmissionMs);
        this.reasons.push(reason);
        this.renders++;
        if (reason.startsWith('benchmark:'))
            this.benchmarkRenders++;
        if (reason.startsWith('capture:'))
            this.captureRenders++;
        this.lastCalls = renderer.info?.render?.calls ?? 0;
        this.lastTriangles = renderer.info?.render?.triangles ?? 0;
        return this.lastSubmissionMs;
    }
    renderBatch(iterations, reason, finishAtEnd = true) {
        if (!this.context)
            throw new Error('RenderSystem not initialized');
        const count = Math.max(1, Math.floor(iterations));
        const start = performance.now();
        for (let i = 0; i < count; i++)
            this.renderNow(`${reason}:${i + 1}/${count}`);
        if (finishAtEnd)
            this.context.legacy.gl?.finish?.();
        const elapsedMs = performance.now() - start;
        this.completedBatchSamplesMs.push(elapsedMs);
        this.context.telemetry.checkGlError(`${reason}:complete`);
        return { iterations: count, elapsedMs, perIterationMs: elapsedMs / count, finishAtEnd, reason };
    }
    finish(reason) {
        if (!this.context)
            throw new Error('RenderSystem not initialized');
        const start = performance.now();
        this.context.legacy.gl?.finish?.();
        const elapsed = performance.now() - start;
        this.completedBatchSamplesMs.push(elapsed);
        this.context.telemetry.checkGlError(`${reason}:finish`);
        return elapsed;
    }
    telemetry() {
        const submissions = this.submissionSamplesMs.toArray();
        const steady = submissions.slice(Math.min(this.warmupRenders, submissions.length));
        return {
            authority: 'RenderSystem is the only authorized renderer.render(scene,camera) boundary, including benchmarks and captures',
            renders: this.renders,
            benchmarkRenders: this.benchmarkRenders,
            captureRenders: this.captureRenders,
            unauthorizedRenderCalls: this.unauthorizedRenderCalls,
            warmupRendersExcludedFromSteadyState: this.warmupRenders,
            renderCpuSubmissionMs: {
                last: this.lastSubmissionMs,
                coldStart: submissions[0] ?? 0,
                all: stats(submissions),
                steadyState: stats(steady),
            },
            completedBatchWallMs: stats(this.completedBatchSamplesMs.toArray()),
            recentReasons: this.reasons.toArray(),
            calls: this.lastCalls,
            triangles: this.lastTriangles,
            pipelineRenders: this.pipelineRenders,
            pipeline: this.pipeline?.telemetry() ?? null,
            measurementBoundary: 'submission timing is separate from explicit gl.finish batch completion timing',
        };
    }
    dispose() {
        this.pipeline?.dispose();
        if (this.context && this.originalRender)
            this.context.legacy.renderer.render = this.originalRender;
        this.context = null;
        this.originalRender = null;
    }
}
//# sourceMappingURL=RenderSystem.js.map