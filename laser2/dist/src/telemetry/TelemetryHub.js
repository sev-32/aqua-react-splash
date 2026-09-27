import { RingBuffer } from './RingBuffer.js';
import { GpuTimer } from './GpuTimer.js';
function stats(values) {
    if (!values.length)
        return { samples: 0, last: 0, mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0;
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
    runtime = null;
    gpuTimer = null;
    webglStatic = null;
    scopes = new Map();
    allFrameTimes = new RingBuffer(360);
    staticFrameTimes = new RingBuffer(180);
    dynamicFrameTimes = new RingBuffer(360);
    dynamicIntervals = new RingBuffer(360);
    errors = [];
    glErrors = [];
    cachedSystems = new Map();
    frame = 0;
    dt = 0;
    startedAt = performance.now();
    lastFrameStart = performance.now();
    frameMode = 'static';
    frameReason = 'initialization';
    lastGlError = 0;
    /**
     * gl.getError() is a synchronous round trip to the GPU process (it flushes
     * and waits), so checking after every frame-graph phase serialised CPU and
     * GPU several times a frame. GL errors are sticky until read, so sampling
     * at frame boundaries loses none of them, only per-phase attribution:
     *   'sampled' (default) every 30th frame end, 'frame' every frame end,
     *   'phase' after every phase as before (URL ?glcheck=phase for debugging).
     * Runtime/init boundaries and explicit verification checks always read.
     */
    glErrorPolicy = (() => {
        try {
            const v = new URLSearchParams(globalThis.location?.search ?? '').get('glcheck');
            return v === 'phase' || v === 'frame' ? v : 'sampled';
        }
        catch {
            return 'sampled';
        }
    })();
    glChecksSkipped = 0;
    telemetrySamples = 0;
    telemetrySampleLastMs = 0;
    telemetrySampleMeanMs = 0;
    telemetrySampleMaxMs = 0;
    attachRuntime(runtime) {
        this.runtime = runtime;
        this.gpuTimer = new GpuTimer(runtime.gl);
        const gl = runtime.gl;
        if (gl) {
            let debugInfo = null;
            try {
                debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            }
            catch {
                debugInfo = null;
            }
            this.webglStatic = {
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            };
        }
        this.checkGlError('runtime:attached');
    }
    beginFrame(dt, mode = 'static', reason = 'unspecified') {
        this.dt = dt;
        this.frameMode = mode;
        this.frameReason = reason;
        this.lastFrameStart = performance.now();
        if (mode === 'dynamic')
            this.dynamicIntervals.push(dt * 1000);
        this.gpuTimer?.begin('frame');
    }
    endFrame(systems) {
        this.gpuTimer?.end();
        this.gpuTimer?.poll();
        if ((this.frame + 1) % 30 === 0)
            this.sampleSystems(systems, 'periodic');
        if (this.glErrorPolicy !== 'sampled' || (this.frame + 1) % 30 === 0)
            this.checkGlError('frame:end');
        else
            this.glChecksSkipped++;
        const elapsed = performance.now() - this.lastFrameStart;
        this.allFrameTimes.push(elapsed);
        (this.frameMode === 'dynamic' ? this.dynamicFrameTimes : this.staticFrameTimes).push(elapsed);
        this.frame++;
    }
    beginCpuScope(label) {
        const start = performance.now();
        return () => this.recordScope(label, performance.now() - start);
    }
    recordScope(label, elapsed) {
        const current = this.scopes.get(label) ?? {
            lastMs: 0,
            meanMs: 0,
            maxMs: 0,
            samples: 0,
            recent: new RingBuffer(180),
        };
        current.lastMs = elapsed;
        current.samples++;
        current.meanMs += (elapsed - current.meanMs) / current.samples;
        current.maxMs = Math.max(current.maxMs, elapsed);
        current.recent.push(elapsed);
        this.scopes.set(label, current);
    }
    recordError(system, error) {
        this.errors.push({ system, message: error instanceof Error ? error.stack ?? error.message : String(error), at: new Date().toISOString() });
        if (this.errors.length > 100)
            this.errors.shift();
    }
    /** Per-phase check: only under the 'phase' policy (see glErrorPolicy). */
    checkGlErrorAtPhase(label) {
        if (this.glErrorPolicy !== 'phase') {
            this.glChecksSkipped++;
            return 0;
        }
        return this.checkGlError(label);
    }
    checkGlError(label) {
        const gl = this.runtime?.gl;
        if (!gl)
            return 0;
        let code = 0;
        try {
            code = gl.getError();
        }
        catch {
            code = -1;
        }
        this.lastGlError = code;
        if (code !== 0) {
            this.glErrors.push({ code, label, frame: this.frame, at: new Date().toISOString() });
            if (this.glErrors.length > 100)
                this.glErrors.shift();
        }
        return code;
    }
    sampleSystems(systems, reason) {
        const start = performance.now();
        for (const system of systems) {
            let data = {};
            if (system.telemetry) {
                try {
                    data = system.telemetry();
                }
                catch (error) {
                    this.recordError(`telemetry:${system.id}`, error);
                }
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
    systemSnapshot(systems) {
        return systems.map((system) => this.cachedSystems.get(system.id) ?? {
            id: system.id,
            phase: system.phase,
            enabled: system.enabled,
            telemetryPending: true,
        });
    }
    performanceSummary() {
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
    snapshot() {
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
                errorPolicy: this.glErrorPolicy,
                errorChecksSkipped: this.glChecksSkipped,
            } : null,
            gpuTimer: this.gpuTimer?.snapshot() ?? { supported: false, reason: 'runtime not attached' },
            browser: {
                userAgent: navigator.userAgent,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemoryGiB: navigator.deviceMemory ?? null,
            },
            errors: [...this.errors],
        };
    }
}
//# sourceMappingURL=TelemetryHub.js.map