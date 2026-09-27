export interface FixedStepClockConfig {
    fixedHz: number;
    maxCatchUpSteps: number;
    maxFrameDeltaSeconds: number;
}
export interface FixedStepAdvance {
    inputDeltaSeconds: number;
    clampedDeltaSeconds: number;
    fixedDtSeconds: number;
    steps: number;
    droppedSteps: number;
    droppedSeconds: number;
    accumulatorSeconds: number;
    interpolationAlpha: number;
    totalSteps: number;
    totalDroppedSteps: number;
    totalDroppedSeconds: number;
}
export declare class FixedStepClock {
    readonly config: FixedStepClockConfig;
    private accumulatorSeconds;
    private totalSteps;
    private totalDroppedSteps;
    private totalDroppedSeconds;
    private last;
    constructor(config?: Partial<FixedStepClockConfig>);
    get fixedDtSeconds(): number;
    advance(inputDeltaSeconds: number, running: boolean): FixedStepAdvance;
    recordManualSteps(steps: number): void;
    reset(): void;
    snapshot(): FixedStepAdvance & {
        config: FixedStepClockConfig;
    };
    private makeAdvance;
}
//# sourceMappingURL=FixedStepClock.d.ts.map