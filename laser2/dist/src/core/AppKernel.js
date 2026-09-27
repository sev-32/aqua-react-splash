import { EventBus } from './EventBus.js';
import { FixedStepClock } from './FixedStepClock.js';
import { FrameGraph } from './FrameGraph.js';
import { StateStore } from './StateStore.js';
export class AppKernel {
    legacy;
    telemetry;
    quality;
    events = new EventBus();
    state = new StateStore({
        mode: 'inspect',
        dynamic: false,
        waterEnabled: false,
        selectedObjectId: null,
        leftPanel: 'parts',
        rightPanel: 'sun',
        leftOpen: true,
        rightOpen: true,
        showLegacyHud: false,
    });
    frameGraph = new FrameGraph();
    fixedClock = new FixedStepClock({ fixedHz: 60, maxCatchUpSteps: 4, maxFrameDeltaSeconds: 0.25 });
    context;
    simulationState;
    lastTimeMs = performance.now();
    initialized = false;
    scheduled = false;
    dirty = true;
    nativeRaf = requestAnimationFrame.bind(window);
    nativeCaf = cancelAnimationFrame.bind(window);
    rafHandle = null;
    renderedFrames = 0;
    requestedFrames = 0;
    dynamicFrames = 0;
    manualStepRequests = 0;
    renderReasons = [];
    renderReasonHistory = [];
    constructor(legacy, telemetry, quality) {
        this.legacy = legacy;
        this.telemetry = telemetry;
        this.quality = quality;
        this.simulationState = { ...this.fixedClock.snapshot(), manualSteps: 0 };
        this.context = {
            legacy,
            telemetry,
            quality,
            events: this.events,
            state: this.state,
            simulation: this.simulationState,
            requestRender: (reason) => this.requestRender(reason),
            setDynamic: (enabled) => this.setDynamic(enabled),
            setMode: (mode) => this.setMode(mode),
            stepSimulation: (steps) => this.stepSimulation(steps),
        };
    }
    add(system) {
        this.frameGraph.add(system);
        return this;
    }
    async init() {
        if (this.initialized)
            return;
        await this.legacy.init();
        this.nativeRaf = window.__LASER2_NATIVE_RAF ?? requestAnimationFrame.bind(window);
        this.nativeCaf = window.__LASER2_NATIVE_CAF ?? cancelAnimationFrame.bind(window);
        this.legacy.freezeLegacyFrameAuthority();
        this.telemetry.attachRuntime(this.legacy);
        await this.frameGraph.init(this.context);
        this.events.on('render:request', ({ reason }) => this.queueFrame(reason));
        this.state.subscribe((next, previous) => {
            if (next.dynamic !== previous.dynamic)
                this.queueFrame(`dynamic=${next.dynamic}`);
        });
        this.initialized = true;
        this.lastTimeMs = performance.now();
        this.requestRender('kernel initialized');
    }
    queueFrame(reason) {
        this.dirty = true;
        this.requestedFrames++;
        this.renderReasons.push(reason);
        this.renderReasonHistory.push(reason);
        if (this.renderReasonHistory.length > 48)
            this.renderReasonHistory.shift();
        if (this.scheduled)
            return;
        this.scheduled = true;
        this.rafHandle = this.nativeRaf((timestamp) => this.tick(timestamp));
    }
    tick(timestampMs) {
        this.scheduled = false;
        this.rafHandle = null;
        if (!this.initialized)
            return;
        const dynamic = this.state.get().dynamic;
        if (this.dirty || dynamic) {
            const measuredDt = Math.max(0, (timestampMs - this.lastTimeMs) / 1000);
            this.lastTimeMs = timestampMs;
            this.dirty = false;
            this.frame(measuredDt > 0 ? measuredDt : 1 / 60);
        }
        if (this.state.get().dynamic)
            this.queueFrame(`${this.state.get().mode} continuous`);
    }
    frame(dtSeconds) {
        const dynamic = this.state.get().dynamic;
        const dt = Number.isFinite(dtSeconds) && dtSeconds >= 0 ? Math.min(0.25, dtSeconds) : 1 / 60;
        const advance = this.fixedClock.advance(dt, dynamic);
        Object.assign(this.simulationState, advance, { manualSteps: 0 });
        const reasons = this.renderReasons.splice(0, this.renderReasons.length);
        const reason = reasons.length ? reasons.join(' | ') : dynamic ? `${this.state.get().mode} continuous` : 'direct frame';
        this.telemetry.beginFrame(dt, dynamic ? 'dynamic' : 'static', reason);
        this.frameGraph.update(dt, this.context);
        this.telemetry.endFrame(this.frameGraph.list());
        this.renderedFrames++;
        if (dynamic)
            this.dynamicFrames++;
    }
    requestRender(reason) {
        this.events.emit('render:request', { reason });
    }
    setDynamic(enabled) {
        this.setMode(enabled ? 'anchored' : 'inspect');
    }
    setMode(mode) {
        const previous = this.state.get().mode;
        const dynamic = mode !== 'inspect';
        // The legacy adapter must leave (or enter) sailing before listeners run so
        // systems installing native authorities see a consistent body state.
        this.legacy.setSailing(mode === 'sailing');
        this.legacy.setDynamic(dynamic);
        this.state.update({ dynamic, mode });
        this.fixedClock.advance(0, false);
        this.lastTimeMs = performance.now();
        this.events.emit('mode:change', { mode });
        this.requestRender(`${mode} mode enabled${previous !== mode ? ` (from ${previous})` : ''}`);
    }
    stepSimulation(steps = 1) {
        const count = Math.max(1, Math.floor(steps));
        const end = this.telemetry.beginCpuScope('manual:simulation-step');
        try {
            this.legacy.step(count);
        }
        finally {
            end();
        }
        this.fixedClock.recordManualSteps(count);
        this.manualStepRequests++;
        Object.assign(this.simulationState, this.fixedClock.snapshot(), { manualSteps: count, steps: 0 });
        this.requestRender(`manual simulation step ${count}`);
    }
    schedulerTelemetry() {
        return {
            authority: 'foundry-native-requestAnimationFrame + fixed-step simulation clock',
            legacyGate: this.legacy.frameAuthorityTelemetry(),
            scheduled: this.scheduled,
            dirty: this.dirty,
            requestedFrames: this.requestedFrames,
            renderedFrames: this.renderedFrames,
            dynamicFrames: this.dynamicFrames,
            manualStepRequests: this.manualStepRequests,
            fixedStep: this.fixedClock.snapshot(),
            recentReasons: [...this.renderReasonHistory],
        };
    }
    snapshot(options = {}) {
        if (options.deep)
            this.telemetry.sampleSystems(this.frameGraph.list(), 'deep-snapshot');
        return {
            version: 'LASER2_SAILING_FOUNDRY_V8',
            depth: options.deep ? 'deep' : 'cached',
            state: this.state.get(),
            quality: this.quality.current,
            scheduler: this.schedulerTelemetry(),
            telemetry: this.telemetry.snapshot(),
            systems: this.telemetry.systemSnapshot(this.frameGraph.list()),
        };
    }
    dispose() {
        if (this.rafHandle !== null)
            this.nativeCaf(this.rafHandle);
        this.frameGraph.dispose();
        this.events.clear();
    }
}
//# sourceMappingURL=AppKernel.js.map