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

const DEFAULT_CONFIG: FixedStepClockConfig = {
  fixedHz: 60,
  maxCatchUpSteps: 4,
  maxFrameDeltaSeconds: 0.25,
};

export class FixedStepClock {
  readonly config: FixedStepClockConfig;
  private accumulatorSeconds = 0;
  private totalSteps = 0;
  private totalDroppedSteps = 0;
  private totalDroppedSeconds = 0;
  private last: FixedStepAdvance;

  constructor(config: Partial<FixedStepClockConfig> = {}) {
    this.config = {
      fixedHz: Math.max(1, Number(config.fixedHz ?? DEFAULT_CONFIG.fixedHz)),
      maxCatchUpSteps: Math.max(1, Math.floor(config.maxCatchUpSteps ?? DEFAULT_CONFIG.maxCatchUpSteps)),
      maxFrameDeltaSeconds: Math.max(1 / 1000, Number(config.maxFrameDeltaSeconds ?? DEFAULT_CONFIG.maxFrameDeltaSeconds)),
    };
    this.last = this.makeAdvance(0, 0, 0, 0, 0);
  }

  get fixedDtSeconds(): number { return 1 / this.config.fixedHz; }

  advance(inputDeltaSeconds: number, running: boolean): FixedStepAdvance {
    const finiteInput = Number.isFinite(inputDeltaSeconds) ? Math.max(0, inputDeltaSeconds) : 0;
    const clamped = Math.min(this.config.maxFrameDeltaSeconds, finiteInput);
    if (!running) {
      this.accumulatorSeconds = 0;
      this.last = this.makeAdvance(finiteInput, clamped, 0, 0, 0);
      return this.last;
    }

    const dt = this.fixedDtSeconds;
    this.accumulatorSeconds += clamped;
    const available = Math.max(0, Math.floor((this.accumulatorSeconds + 1e-12) / dt));
    const steps = Math.min(available, this.config.maxCatchUpSteps);
    const droppedSteps = Math.max(0, available - steps);
    const droppedSeconds = droppedSteps * dt;
    this.accumulatorSeconds -= (steps + droppedSteps) * dt;
    if (this.accumulatorSeconds < 0 && this.accumulatorSeconds > -1e-9) this.accumulatorSeconds = 0;
    this.accumulatorSeconds = Math.max(0, Math.min(dt, this.accumulatorSeconds));
    this.totalSteps += steps;
    this.totalDroppedSteps += droppedSteps;
    this.totalDroppedSeconds += droppedSeconds;
    this.last = this.makeAdvance(finiteInput, clamped, steps, droppedSteps, droppedSeconds);
    return this.last;
  }

  recordManualSteps(steps: number): void {
    this.totalSteps += Math.max(0, Math.floor(steps));
  }

  reset(): void {
    this.accumulatorSeconds = 0;
    this.totalSteps = 0;
    this.totalDroppedSteps = 0;
    this.totalDroppedSeconds = 0;
    this.last = this.makeAdvance(0, 0, 0, 0, 0);
  }

  snapshot(): FixedStepAdvance & { config: FixedStepClockConfig } {
    return { ...this.last, config: { ...this.config } };
  }

  private makeAdvance(
    inputDeltaSeconds: number,
    clampedDeltaSeconds: number,
    steps: number,
    droppedSteps: number,
    droppedSeconds: number,
  ): FixedStepAdvance {
    return {
      inputDeltaSeconds,
      clampedDeltaSeconds,
      fixedDtSeconds: this.fixedDtSeconds,
      steps,
      droppedSteps,
      droppedSeconds,
      accumulatorSeconds: this.accumulatorSeconds,
      interpolationAlpha: this.fixedDtSeconds > 0 ? this.accumulatorSeconds / this.fixedDtSeconds : 0,
      totalSteps: this.totalSteps,
      totalDroppedSteps: this.totalDroppedSteps,
      totalDroppedSeconds: this.totalDroppedSeconds,
    };
  }
}
