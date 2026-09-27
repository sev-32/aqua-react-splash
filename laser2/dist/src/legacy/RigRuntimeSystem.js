export class RigRuntimeSystem {
    id = 'legacy.rig-runtime';
    phase = 'postPhysics';
    enabled = true;
    frames = 0;
    context = null;
    init(context) {
        this.context = context;
        context.legacy.enforceAnchor();
    }
    update(_dtSeconds, context) {
        context.legacy.enforceAnchor();
        this.frames++;
    }
    telemetry() {
        const legacy = this.context?.legacy;
        const rig = legacy?.rigV16?.metrics?.() ?? null;
        const rope = legacy?.ropeV16?.metrics?.() ?? null;
        const spreader = legacy?.spreaderV17?.metrics?.() ?? null;
        const collision = legacy?.standingRigCollisionV17?.metrics?.() ?? null;
        return { frames: this.frames, rig, rope, spreader, collision };
    }
}
//# sourceMappingURL=RigRuntimeSystem.js.map