import type { AppContext, AppSystem } from '../core/System.js';

export class RigRuntimeSystem implements AppSystem {
  readonly id = 'legacy.rig-runtime';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  private frames = 0;
  private context: AppContext | null = null;

  init(context: AppContext): void {
    this.context = context;
    context.legacy.enforceAnchor();
  }

  update(_dtSeconds: number, context: AppContext): void {
    context.legacy.enforceAnchor();
    this.frames++;
  }

  telemetry(): Record<string, unknown> {
    const legacy = this.context?.legacy;
    const rig = legacy?.rigV16?.metrics?.() ?? null;
    const rope = legacy?.ropeV16?.metrics?.() ?? null;
    const spreader = legacy?.spreaderV17?.metrics?.() ?? null;
    const collision = legacy?.standingRigCollisionV17?.metrics?.() ?? null;
    return { frames: this.frames, rig, rope, spreader, collision };
  }
}
