export class AnchoredPhysicsSystem {
    id = 'physics.anchored-bridge';
    phase = 'physics';
    enabled = true;
    frames = 0;
    activeFrames = 0;
    zeroStepFrames = 0;
    steps = 0;
    catchUpFrames = 0;
    lastBatchMs = 0;
    maxBatchMs = 0;
    meanBatchMs = 0;
    lastPerStepMs = 0;
    meanPerStepMs = 0;
    init(context) {
        context.legacy.freezeLegacyFrameAuthority();
        context.legacy.enforceAnchor();
    }
    update(_dtSeconds, context) {
        this.frames++;
        if (!context.state.get().dynamic)
            return;
        this.activeFrames++;
        const requested = Math.max(0, Math.floor(context.simulation.steps));
        if (requested === 0) {
            this.zeroStepFrames++;
            context.legacy.enforceAnchor();
            return;
        }
        if (requested > 1)
            this.catchUpFrames++;
        const start = performance.now();
        context.legacy.step(requested);
        this.lastBatchMs = performance.now() - start;
        this.steps += requested;
        this.meanBatchMs += (this.lastBatchMs - this.meanBatchMs) / Math.max(1, this.activeFrames - this.zeroStepFrames);
        this.maxBatchMs = Math.max(this.maxBatchMs, this.lastBatchMs);
        this.lastPerStepMs = this.lastBatchMs / requested;
        this.meanPerStepMs += (this.lastPerStepMs - this.meanPerStepMs) / Math.max(1, this.activeFrames - this.zeroStepFrames);
    }
    telemetry() {
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
//# sourceMappingURL=AnchoredPhysicsSystem.js.map