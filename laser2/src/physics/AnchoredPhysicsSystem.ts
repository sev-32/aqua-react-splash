import type { AppContext, AppSystem } from '../core/System.js';

export class AnchoredPhysicsSystem implements AppSystem {
  readonly id = 'physics.anchored-bridge';
  readonly phase = 'physics' as const;
  enabled = true;
  private frames = 0;
  private activeFrames = 0;
  private zeroStepFrames = 0;
  private steps = 0;
  private catchUpFrames = 0;
  private lastBatchMs = 0;
  private maxBatchMs = 0;
  private meanBatchMs = 0;
  private lastPerStepMs = 0;
  private meanPerStepMs = 0;

  init(context: AppContext): void {
    context.legacy.freezeLegacyFrameAuthority();
    context.legacy.enforceAnchor();
  }

  update(_dtSeconds: number, context: AppContext): void {
    this.frames++;
    if (!context.state.get().dynamic) return;
    this.activeFrames++;
    const requested = Math.max(0, Math.floor(context.simulation.steps));
    if (requested === 0) {
      this.zeroStepFrames++;
      context.legacy.enforceAnchor();
      return;
    }
    if (requested > 1) this.catchUpFrames++;
    const start = performance.now();
    context.legacy.step(requested);
    this.lastBatchMs = performance.now() - start;
    this.steps += requested;
    this.meanBatchMs += (this.lastBatchMs - this.meanBatchMs) / Math.max(1, this.activeFrames - this.zeroStepFrames);
    this.maxBatchMs = Math.max(this.maxBatchMs, this.lastBatchMs);
    this.lastPerStepMs = this.lastBatchMs / requested;
    this.meanPerStepMs += (this.lastPerStepMs - this.meanPerStepMs) / Math.max(1, this.activeFrames - this.zeroStepFrames);
  }

  telemetry(): Record<string, unknown> {
    return {
      authority: 'Foundry fixed-step clock determines simulation count; compatibility solver executes bounded batches while legacy RAF remains frozen',
      frames: this.frames,
      activeFrames: this.activeFrames,
      zeroStepFrames: this.zeroStepFrames,
      catchUpFrames: this.catchUpFrames,
      steps: this.steps,
      fixedDtSeconds: 1 / 60,
      batchCpuMs: { last: this.lastBatchMs, mean: this.meanBatchMs, max: this.maxBatchMs },
      perStepCpuMs: { last: this.lastPerStepMs, mean: this.meanPerStepMs },
    };
  }
}
