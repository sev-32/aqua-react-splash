// Single wrapper around the legacy XPBD world's step(dt, substeps) that lets
// native authorities run logic immediately before and after each 1/60 s
// physics step (after the legacy input/crew/wind updates of that step, and
// before its visual sync), independent of display frame cadence.

export type StepListener = (dt: number, substeps: number, simTime: number) => void;

export class PhysicsStepBus {
  private readonly before: StepListener[] = [];
  private readonly after: StepListener[] = [];
  private world: any = null;
  private originalStep: ((dt: number, substeps: number) => void) | null = null;
  private hadOwnStep = false;
  steps = 0;

  constructor(private readonly timeSource: () => number) {}

  install(world: any): void {
    if (this.world) return;
    this.world = world;
    this.hadOwnStep = Object.prototype.hasOwnProperty.call(world, 'step');
    const original = (world.step as (dt: number, substeps: number) => void).bind(world);
    this.originalStep = original;
    world.step = (dt: number, substeps: number): void => {
      const t = this.timeSource();
      for (const listener of this.before) listener(dt, substeps, t);
      original(dt, substeps);
      this.steps++;
      for (const listener of this.after) listener(dt, substeps, t);
    };
  }

  uninstall(): void {
    if (!this.world) return;
    if (this.hadOwnStep) this.world.step = this.originalStep;
    else delete this.world.step;
    this.world = null;
    this.originalStep = null;
  }

  get installed(): boolean { return this.world !== null; }

  onBefore(listener: StepListener): () => void {
    this.before.push(listener);
    return () => { const i = this.before.indexOf(listener); if (i >= 0) this.before.splice(i, 1); };
  }

  onAfter(listener: StepListener): () => void {
    this.after.push(listener);
    return () => { const i = this.after.indexOf(listener); if (i >= 0) this.after.splice(i, 1); };
  }
}
