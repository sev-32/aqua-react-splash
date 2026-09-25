import type { AppContext, AppSystem, FramePhase } from './System.js';

const PHASES: readonly FramePhase[] = ['prePhysics', 'physics', 'postPhysics', 'preRender', 'postRender', 'ui'];

export class FrameGraph {
  private readonly systems = new Map<string, AppSystem>();
  private readonly byPhase = new Map<FramePhase, AppSystem[]>();

  constructor() {
    for (const phase of PHASES) this.byPhase.set(phase, []);
  }

  add(system: AppSystem): void {
    if (this.systems.has(system.id)) throw new Error(`Duplicate system: ${system.id}`);
    this.systems.set(system.id, system);
    this.byPhase.get(system.phase)?.push(system);
  }

  async init(context: AppContext): Promise<void> {
    for (const phase of PHASES) {
      const endPhase = context.telemetry.beginCpuScope(`init-phase:${phase}`);
      for (const system of this.byPhase.get(phase) ?? []) {
        const end = context.telemetry.beginCpuScope(`init:${system.id}`);
        try {
          await system.init(context);
        } finally {
          end();
        }
      }
      endPhase();
      context.telemetry.checkGlError(`init-phase:${phase}`);
    }
  }

  update(dtSeconds: number, context: AppContext): void {
    for (const phase of PHASES) {
      const endPhase = context.telemetry.beginCpuScope(`phase:${phase}`);
      for (const system of this.byPhase.get(phase) ?? []) {
        if (!system.enabled || !system.update) continue;
        const end = context.telemetry.beginCpuScope(`${phase}:${system.id}`);
        try {
          system.update(dtSeconds, context);
        } catch (error) {
          context.telemetry.recordError(system.id, error);
          console.error(`System ${system.id} failed`, error);
        } finally {
          end();
        }
      }
      endPhase();
      context.telemetry.checkGlError(`phase:${phase}`);
    }
  }

  get(id: string): AppSystem | undefined {
    return this.systems.get(id);
  }

  list(): readonly AppSystem[] {
    return [...this.systems.values()];
  }

  dispose(): void {
    for (const system of [...this.systems.values()].reverse()) system.dispose?.();
  }
}
