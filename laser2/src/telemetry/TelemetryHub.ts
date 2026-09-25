import type { AppSystem } from '../core/System.js';
import type { LegacyRuntimeAdapter } from '../legacy/LegacyRuntimeAdapter.js';
import { RingBuffer } from './RingBuffer.js';
import { GpuTimer } from './GpuTimer.js';

interface ScopeRecord {
  lastMs: number;
  meanMs: number;
  maxMs: number;
  samples: number;
  recent: RingBuffer<number>;
}

interface Stats {
  samples: number;
  last: number;
  mean: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

type FrameMode = 'static' | 'dynamic';

function stats(values: readonly number[]): Stats {
  if (!values.length) return { samples: 0, last: 0, mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0;
  return {
    samples: values.length,
    last: values.at(-1) ?? 0,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    min: sorted[0] ?? 0,
    max: sorted.at(-1) ?? 0,
    p50: percentile(0.50),
    p95: percentile(0.95),
    p99: percentile(0.99),
  };
}

export class TelemetryHub {
  private runtime: LegacyRuntimeAdapter | null = null;
  private gpuTimer: GpuTimer | null = null;
  private webglStatic: Record<string, unknown> | null = null;
  private readonly scopes = new Map<string, ScopeRecord>();
  private readonly allFrameTimes = new RingBuffer<number>(360);
  private readonly staticFrameTimes = new RingBuffer<number>(180);
  private readonly dynamicFrameTimes = new RingBuffer<number>(360);
  private readonly dynamicIntervals = new RingBuffer<number>(360);
  private readonly errors: Array<{ system: string; message: string; at: string }> = [];
  private readonly glErrors: Array<{ code: number; label: string; frame: number; at: string }> = [];
  private readonly cachedSystems = new Map<string, Record<string, unknown>>();
  private frame = 0;
  private dt = 0;
  private startedAt = performance.now();
  private lastFrameStart = performance.now();
  private frameMode: FrameMode = 'static';
  private frameReason = 'initialization';
  private lastGlError = 0;
  private telemetrySamples = 0;
  private telemetrySampleLastMs = 0;
  private telemetrySampleMeanMs = 0;
  private telemetrySampleMaxMs = 0;

  attachRuntime(runtime: LegacyRuntimeAdapter): void {
    this.runtime = runtime;
    this.gpuTimer = new GpuTimer(runtime.gl);
    const gl = runtime.gl;
    if (gl) {
      let debugInfo: any = null;
      try { debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); } catch { debugInfo = null; }
      this.webglStatic = {
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    }
    this.checkGlError('runtime:attached');
  }

  beginFrame(dt: number, mode: FrameMode = 'static', reason = 'unspecified'): void {
    this.dt = dt;
    this.frameMode = mode;
    this.frameReason = reason;
    this.lastFrameStart = performance.now();
    if (mode === 'dynamic') this.dynamicIntervals.push(dt * 1000);
    this.gpuTimer?.begin('frame');
  }

  endFrame(systems: readonly AppSystem[]): void {
    this.gpuTimer?.end();
    this.gpuTimer?.poll();
    if ((this.frame + 1) % 30 === 0) this.sampleSystems(systems, 'periodic');
    this.checkGlError('frame:end');
    const elapsed = performance.now() - this.lastFrameStart;
    this.allFrameTimes.push(elapsed);
    (this.frameMode === 'dynamic' ? this.dynamicFrameTimes : this.staticFrameTimes).push(elapsed);
    this.frame++;
  }

  beginCpuScope(label: string): () => void {
    const start = performance.now();
    return () => this.recordScope(label, performance.now() - start);
  }

  private recordScope(label: string, elapsed: number): void {
    const current = this.scopes.get(label) ?? {
      lastMs: 0,
      meanMs: 0,
      maxMs: 0,
      samples: 0,
      recent: new RingBuffer<number>(180),
    };
    current.lastMs = elapsed;
    current.samples++;
    current.meanMs += (elapsed - current.meanMs) / current.samples;
    current.maxMs = Math.max(current.maxMs, elapsed);
    current.recent.push(elapsed);
    this.scopes.set(label, current);
  }

  recordError(system: string, error: unknown): void {
    this.errors.push({ system, message: error instanceof Error ? error.stack ?? error.message : String(error), at: new Date().toISOString() });
    if (this.errors.length > 100) this.errors.shift();
  }

  checkGlError(label: string): number {
    const gl = this.runtime?.gl;
    if (!gl) return 0;
    let code = 0;
    try { code = gl.getError(); } catch { code = -1; }
    this.lastGlError = code;
    if (code !== 0) {
      this.glErrors.push({ code, label, frame: this.frame, at: new Date().toISOString() });
      if (this.glErrors.length > 100) this.glErrors.shift();
    }
    return code;
  }

  sampleSystems(systems: readonly AppSystem[], reason: string): void {
    const start = performance.now();
    for (const system of systems) {
      let data: Record<string, unknown> = {};
      if (system.telemetry) {
        try { data = system.telemetry(); }
        catch (error) { this.recordError(`telemetry:${system.id}`, error); }
      }
      this.cachedSystems.set(system.id, {
        id: system.id,
        phase: system.phase,
        enabled: system.enabled,
        ...data,
      });
    }
    const elapsed = performance.now() - start;
    this.telemetrySamples++;
    this.telemetrySampleLastMs = elapsed;
    this.telemetrySampleMeanMs += (elapsed - this.telemetrySampleMeanMs) / this.telemetrySamples;
    this.telemetrySampleMaxMs = Math.max(this.telemetrySampleMaxMs, elapsed);
    this.recordScope(`telemetry:sample:${reason}`, elapsed);
  }

  systemSnapshot(systems: readonly AppSystem[]): Array<Record<string, unknown>> {
    return systems.map((system) => this.cachedSystems.get(system.id) ?? {
      id: system.id,
      phase: system.phase,
      enabled: system.enabled,
      telemetryPending: true,
    });
  }


  performanceSummary(): Record<string, any> {
    const renderer = this.runtime?.renderer;
    return {
      allFrameCpuMs: stats(this.allFrameTimes.toArray()),
      staticRenderCpuMs: stats(this.staticFrameTimes.toArray()),
      dynamicFrameCpuMs: stats(this.dynamicFrameTimes.toArray()),
      dynamicIntervalMs: stats(this.dynamicIntervals.toArray()),
      renderer: renderer ? {
        calls: renderer.info?.render?.calls ?? null,
        triangles: renderer.info?.render?.triangles ?? null,
        programs: renderer.info?.programs?.length ?? null,
        geometries: renderer.info?.memory?.geometries ?? null,
        textures: renderer.info?.memory?.textures ?? null,
      } : null,
    };
  }

  snapshot(): Record<string, any> {
    const renderer = this.runtime?.renderer;
    const gl = this.runtime?.gl;
    const all = stats(this.allFrameTimes.toArray());
    const staticStats = stats(this.staticFrameTimes.toArray());
    const dynamicStats = stats(this.dynamicFrameTimes.toArray());
    const intervals = stats(this.dynamicIntervals.toArray());
    const scopeSnapshot = Object.fromEntries([...this.scopes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, record]) => [label, {
      lastMs: record.lastMs,
      meanMs: record.meanMs,
      maxMs: record.maxMs,
      samples: record.samples,
      recent: stats(record.recent.toArray()),
    }]));
    return {
      frame: this.frame,
      uptimeSeconds: (performance.now() - this.startedAt) / 1000,
      dtSeconds: this.dt,
      currentMode: this.frameMode,
      lastRenderReason: this.frameReason,
      frameCpuMs: {
        ...all,
        estimatedFps: this.frameMode === 'dynamic' && intervals.mean > 0 ? 1000 / intervals.mean : null,
        semantics: 'CPU frame-graph wall time. Static render-on-demand frames are not converted into FPS.',
      },
      staticRenderCpuMs: staticStats,
      dynamicFrameCpuMs: dynamicStats,
      dynamicCadence: {
        intervalMs: intervals,
        actualFps: intervals.mean > 0 ? 1000 / intervals.mean : 0,
        source: 'requestAnimationFrame interval, independent from CPU submission duration',
      },
      cpuScopes: scopeSnapshot,
      telemetrySampling: {
        samples: this.telemetrySamples,
        lastMs: this.telemetrySampleLastMs,
        meanMs: this.telemetrySampleMeanMs,
        maxMs: this.telemetrySampleMaxMs,
        cachedSystems: this.cachedSystems.size,
      },
      renderer: renderer ? {
        calls: renderer.info?.render?.calls ?? null,
        triangles: renderer.info?.render?.triangles ?? null,
        points: renderer.info?.render?.points ?? null,
        lines: renderer.info?.render?.lines ?? null,
        programs: renderer.info?.programs?.length ?? null,
        geometries: renderer.info?.memory?.geometries ?? null,
        textures: renderer.info?.memory?.textures ?? null,
        pixelRatio: renderer.getPixelRatio?.() ?? null,
        shadowMapEnabled: renderer.shadowMap?.enabled ?? null,
      } : null,
      webgl: gl ? {
        ...(this.webglStatic ?? {}),
        contextLost: gl.isContextLost(),
        error: this.lastGlError,
        errorEvents: [...this.glErrors],
        errorSemantics: 'GL errors are sampled at defined frame/runtime boundaries and retained; snapshot does not drain gl.getError().',
      } : null,
      gpuTimer: this.gpuTimer?.snapshot() ?? { supported: false, reason: 'runtime not attached' },
      browser: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      },
      errors: [...this.errors],
    };
  }
}
