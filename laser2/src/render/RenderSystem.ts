import type { AppContext, AppSystem } from '../core/System.js';
import { RingBuffer } from '../telemetry/RingBuffer.js';
import type { ScenePipeline } from './ScenePipeline.js';

interface Stats {
  samples: number;
  mean: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface RenderBatchResult {
  iterations: number;
  elapsedMs: number;
  perIterationMs: number;
  finishAtEnd: boolean;
  reason: string;
}

function stats(values: readonly number[]): Stats {
  if (!values.length) return { samples: 0, mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0;
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

export class RenderSystem implements AppSystem {
  readonly id = 'render.main';
  readonly phase = 'postRender' as const;
  enabled = true;
  private readonly warmupRenders = 2;
  private readonly submissionSamplesMs = new RingBuffer<number>(360);
  private readonly completedBatchSamplesMs = new RingBuffer<number>(120);
  private readonly reasons = new RingBuffer<string>(48);
  private context: AppContext | null = null;
  private originalRender: ((scene: any, camera: any) => void) | null = null;
  private renders = 0;
  private benchmarkRenders = 0;
  private captureRenders = 0;
  private lastSubmissionMs = 0;
  private lastCalls = 0;
  private lastTriangles = 0;
  private unauthorizedRenderCalls = 0;
  private authorityActive = false;
  private pipeline: ScenePipeline | null = null;
  private pipelineRenders = 0;

  /** Multi-pass HDR pipeline used while the native ocean surface is visible. */
  attachPipeline(pipeline: ScenePipeline): this {
    this.pipeline = pipeline;
    return this;
  }

  init(context: AppContext): void {
    this.context = context;
    const renderer = context.legacy.renderer;
    renderer.setAnimationLoop?.(null);
    context.legacy.freezeLegacyFrameAuthority();
    this.originalRender = renderer.render.bind(renderer);
    const authority = this;
    renderer.render = function (scene: any, camera: any): void {
      if (!authority.authorityActive) authority.unauthorizedRenderCalls++;
      authority.originalRender?.(scene, camera);
    };
  }

  update(_dtSeconds: number, context: AppContext): void {
    if (context.state.get().dynamic && context.simulation.steps > 0 && context.legacy.renderer.shadowMap?.enabled) {
      context.legacy.renderer.shadowMap.needsUpdate = true;
    }
    this.renderNow('frame-graph');
  }

  renderNow(reason: string): number {
    if (!this.context || !this.originalRender) throw new Error('RenderSystem not initialized');
    const { renderer, scene, camera } = this.context.legacy;
    const start = performance.now();
    this.authorityActive = true;
    try {
      if (this.pipeline?.active) {
        this.pipeline.render(renderer, scene, camera, this.originalRender);
        this.pipelineRenders++;
      } else {
        this.originalRender(scene, camera);
      }
    } finally {
      this.authorityActive = false;
    }
    this.lastSubmissionMs = performance.now() - start;
    this.submissionSamplesMs.push(this.lastSubmissionMs);
    this.reasons.push(reason);
    this.renders++;
    if (reason.startsWith('benchmark:')) this.benchmarkRenders++;
    if (reason.startsWith('capture:')) this.captureRenders++;
    this.lastCalls = renderer.info?.render?.calls ?? 0;
    this.lastTriangles = renderer.info?.render?.triangles ?? 0;
    return this.lastSubmissionMs;
  }

  renderBatch(iterations: number, reason: string, finishAtEnd = true): RenderBatchResult {
    if (!this.context) throw new Error('RenderSystem not initialized');
    const count = Math.max(1, Math.floor(iterations));
    const start = performance.now();
    for (let i = 0; i < count; i++) this.renderNow(`${reason}:${i + 1}/${count}`);
    if (finishAtEnd) this.context.legacy.gl?.finish?.();
    const elapsedMs = performance.now() - start;
    this.completedBatchSamplesMs.push(elapsedMs);
    this.context.telemetry.checkGlError(`${reason}:complete`);
    return { iterations: count, elapsedMs, perIterationMs: elapsedMs / count, finishAtEnd, reason };
  }

  finish(reason: string): number {
    if (!this.context) throw new Error('RenderSystem not initialized');
    const start = performance.now();
    this.context.legacy.gl?.finish?.();
    const elapsed = performance.now() - start;
    this.completedBatchSamplesMs.push(elapsed);
    this.context.telemetry.checkGlError(`${reason}:finish`);
    return elapsed;
  }

  telemetry(): Record<string, unknown> {
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

  dispose(): void {
    this.pipeline?.dispose();
    if (this.context && this.originalRender) this.context.legacy.renderer.render = this.originalRender;
    this.context = null;
    this.originalRender = null;
  }
}
