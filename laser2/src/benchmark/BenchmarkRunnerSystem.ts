import type { AppContext, AppSystem } from '../core/System.js';
import { FixedStepClock } from '../core/FixedStepClock.js';
import type { LightingState } from '../lighting/LightingState.js';
import type { RenderSystem } from '../render/RenderSystem.js';
import { approximateSunRgb, sunDirectionFromAngles, thinSheetTransmission } from '../reference/lightingMath.js';
import { integrateAtmosphereRadiance } from '../lighting/atmosphere/AtmosphereMath.js';

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

export class BenchmarkRunnerSystem implements AppSystem {
  readonly id = 'benchmark.runner';
  readonly phase = 'ui' as const;
  enabled = true;
  private context: AppContext | null = null;
  private readonly results: BenchmarkResult[] = [];
  running = false;

  constructor(readonly lighting: LightingState, readonly renderSystem: RenderSystem) {}

  init(context: AppContext): void { this.context = context; }

  async run(id: BenchmarkId): Promise<BenchmarkResult> {
    if (!this.context) throw new Error('Benchmark system not initialized');
    if (this.running) throw new Error('A benchmark is already running');
    this.running = true;
    const startedAt = new Date().toISOString();
    let iterations = 0;
    let warmupIterations = 0;
    let measurementBoundary = 'CPU wall time';
    let elapsedMs = 0;
    let scenario: Record<string, unknown> = {};
    try {
      if (id === 'render-static') {
        iterations = this.context.quality.current.id === 'cpu-reference' ? 2 : this.context.quality.current.id === 'fast' ? 5 : 20;
        warmupIterations = 2;
        this.renderSystem.renderBatch(warmupIterations, 'benchmark:render-static:warmup', true);
        const batch = this.renderSystem.renderBatch(iterations, 'benchmark:render-static:measured', true);
        elapsedMs = batch.elapsedMs;
        measurementBoundary = 'RenderSystem authority; warm shader state; completed WebGL batch with one gl.finish at the end';
      } else if (id === 'atmosphere-sweep') {
        iterations = 8;
        warmupIterations = 1;
        const original = this.lighting.get();
        const atmosphere = (window as any).LASER2_FOUNDRY?.kernel?.frameGraph?.get?.('lighting.atmosphere');
        atmosphere?.update?.(0, this.context);
        this.renderSystem.renderBatch(1, 'benchmark:atmosphere-sweep:warmup', true);
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          this.lighting.update({
            sunElevationDeg: -2 + i * 11,
            sunAzimuthDeg: 25 + i * 37,
            aerosolDensity: 0.08 + i * 0.055,
          });
          atmosphere?.update?.(0, this.context);
          this.renderSystem.renderNow(`benchmark:atmosphere-sweep:${i + 1}`);
        }
        this.renderSystem.finish('benchmark:atmosphere-sweep');
        elapsedMs = performance.now() - start;
        this.lighting.update({ ...original });
        atmosphere?.update?.(0, this.context);
        scenario = { atmosphereTelemetry: atmosphere?.telemetry?.() ?? null };
        measurementBoundary = 'eight atmosphere LUT regenerations, solar updates and authorized renders followed by gl.finish';
      } else if (id === 'lighting-sweep') {
        iterations = 24;
        warmupIterations = 1;
        const original = this.lighting.get();
        this.renderSystem.renderBatch(1, 'benchmark:lighting-sweep:warmup', true);
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          this.lighting.update({ sunElevationDeg: 5 + i * 3.2, sunAzimuthDeg: 35 + i * 11 });
          this.renderSystem.renderNow(`benchmark:lighting-sweep:${i + 1}`);
        }
        this.renderSystem.finish('benchmark:lighting-sweep');
        elapsedMs = performance.now() - start;
        this.lighting.update({ ...original });
        measurementBoundary = '24 synchronous lighting-state invalidations and RenderSystem renders followed by gl.finish';
      } else if (id === 'rig-step') {
        iterations = 30;
        const start = performance.now();
        this.context.stepSimulation(iterations);
        elapsedMs = performance.now() - start;
        measurementBoundary = 'CPU simulation stepping through the compatibility physics boundary; render excluded';
      } else if (id === 'fixed-step-cadence') {
        const cadenceHz = [30, 60, 90, 120, 144, 240];
        const seconds = 5;
        iterations = cadenceHz.length * seconds;
        const results: Record<string, unknown>[] = [];
        const start = performance.now();
        for (const hz of cadenceHz) {
          const clock = new FixedStepClock({ fixedHz: 60, maxCatchUpSteps: 4 });
          let executed = 0;
          const frames = hz * seconds;
          for (let i = 0; i < frames; i++) executed += clock.advance(1 / hz, true).steps;
          results.push({ renderHz: hz, frames, executedSteps: executed, expectedSteps: 60 * seconds, snapshot: clock.snapshot() });
        }
        elapsedMs = performance.now() - start;
        scenario = { cadenceResults: results };
        measurementBoundary = 'pure CPU fixed-step clock fed deterministic render cadences from 30 to 240 Hz';
      } else {
        iterations = 20_000;
        const start = performance.now();
        let sink = 0;
        const settings = this.lighting.get();
        for (let i = 0; i < iterations; i++) {
          const elevation = (i % 96) - 6;
          const azimuth = (i * 13) % 360;
          const sun = approximateSunRgb(elevation, 2.8 + (i % 10) * 0.1);
          const sheet = thinSheetTransmission(sun, { r: 0.92, g: 0.89, b: 0.78 }, 0.27, 0.42, 0.65, 0.3 + (i % 70) / 100);
          const direction = sunDirectionFromAngles(elevation, azimuth);
          const sky = integrateAtmosphereRadiance({ x: 0.3, y: 0.75, z: 0.58 }, direction, settings, { viewSamples: 4, sunSamples: 2 });
          sink += sheet.r + sheet.g + sheet.b + sky.r + sky.g + sky.b;
        }
        elapsedMs = performance.now() - start;
        (window as any).__foundryCpuBenchmarkSink = sink;
        scenario = { sink, atmosphereViewSamples: 4, atmosphereSunSamples: 2 };
        measurementBoundary = 'pure CPU deterministic sail-light and atmosphere reference; no WebGL calls';
      }

      const renderer = this.context.legacy.renderer;
      const canvas = renderer.domElement as HTMLCanvasElement;
      scenario = {
        quality: this.context.quality.current.id,
        width: canvas.width,
        height: canvas.height,
        pixelRatio: renderer.getPixelRatio?.() ?? null,
        shadowsEnabled: renderer.shadowMap?.enabled ?? null,
        renderCalls: renderer.info?.render?.calls ?? null,
        triangles: renderer.info?.render?.triangles ?? null,
        ...scenario,
      };
      const result: BenchmarkResult = {
        id,
        startedAt,
        elapsedMs,
        iterations,
        warmupIterations,
        perIterationMs: elapsedMs / Math.max(1, iterations),
        measurementBoundary,
        scenario,
        telemetry: this.context.telemetry.snapshot(),
      };
      this.results.push(result);
      if (this.results.length > 40) this.results.shift();
      return result;
    } finally {
      this.running = false;
      this.context.requestRender(`benchmark ${id} complete`);
    }
  }

  telemetry(): Record<string, unknown> {
    return {
      running: this.running,
      renderAuthority: this.renderSystem.id,
      scenarios: ['render-static', 'atmosphere-sweep', 'lighting-sweep', 'rig-step', 'fixed-step-cadence', 'cpu-reference'],
      results: this.results,
    };
  }
}
