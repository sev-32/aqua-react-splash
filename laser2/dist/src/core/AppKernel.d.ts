import { EventBus } from './EventBus.js';
import { FixedStepClock } from './FixedStepClock.js';
import { FrameGraph } from './FrameGraph.js';
import { StateStore } from './StateStore.js';
import type { AppContext, AppSystem, FoundryEvents, FoundryMode, FoundryState } from './System.js';
import type { LegacyRuntimeAdapter } from '../legacy/LegacyRuntimeAdapter.js';
import type { TelemetryHub } from '../telemetry/TelemetryHub.js';
import type { QualityManager } from '../quality/QualityManager.js';
export declare class AppKernel {
    readonly legacy: LegacyRuntimeAdapter;
    readonly telemetry: TelemetryHub;
    readonly quality: QualityManager;
    readonly events: EventBus<FoundryEvents>;
    readonly state: StateStore<FoundryState>;
    readonly frameGraph: FrameGraph;
    readonly fixedClock: FixedStepClock;
    readonly context: AppContext;
    private readonly simulationState;
    private lastTimeMs;
    private initialized;
    private scheduled;
    private dirty;
    private nativeRaf;
    private nativeCaf;
    private rafHandle;
    private renderedFrames;
    private requestedFrames;
    private dynamicFrames;
    private manualStepRequests;
    private readonly renderReasons;
    private readonly renderReasonHistory;
    constructor(legacy: LegacyRuntimeAdapter, telemetry: TelemetryHub, quality: QualityManager);
    add(system: AppSystem): this;
    init(): Promise<void>;
    private queueFrame;
    private tick;
    frame(dtSeconds: number): void;
    requestRender(reason: string): void;
    setDynamic(enabled: boolean): void;
    setMode(mode: FoundryMode): void;
    stepSimulation(steps?: number): void;
    schedulerTelemetry(): Record<string, unknown>;
    snapshot(options?: {
        deep?: boolean;
    }): Record<string, unknown>;
    dispose(): void;
}
//# sourceMappingURL=AppKernel.d.ts.map