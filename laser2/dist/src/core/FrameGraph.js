const PHASES = ['prePhysics', 'physics', 'postPhysics', 'preRender', 'postRender', 'ui'];
export class FrameGraph {
    systems = new Map();
    byPhase = new Map();
    constructor() {
        for (const phase of PHASES)
            this.byPhase.set(phase, []);
    }
    add(system) {
        if (this.systems.has(system.id))
            throw new Error(`Duplicate system: ${system.id}`);
        this.systems.set(system.id, system);
        this.byPhase.get(system.phase)?.push(system);
    }
    async init(context) {
        for (const phase of PHASES) {
            const endPhase = context.telemetry.beginCpuScope(`init-phase:${phase}`);
            for (const system of this.byPhase.get(phase) ?? []) {
                const end = context.telemetry.beginCpuScope(`init:${system.id}`);
                try {
                    await system.init(context);
                }
                finally {
                    end();
                }
            }
            endPhase();
            context.telemetry.checkGlError(`init-phase:${phase}`);
        }
    }
    update(dtSeconds, context) {
        for (const phase of PHASES) {
            const endPhase = context.telemetry.beginCpuScope(`phase:${phase}`);
            for (const system of this.byPhase.get(phase) ?? []) {
                if (!system.enabled || !system.update)
                    continue;
                const end = context.telemetry.beginCpuScope(`${phase}:${system.id}`);
                try {
                    system.update(dtSeconds, context);
                }
                catch (error) {
                    context.telemetry.recordError(system.id, error);
                    console.error(`System ${system.id} failed`, error);
                }
                finally {
                    end();
                }
            }
            endPhase();
            context.telemetry.checkGlErrorAtPhase(`phase:${phase}`);
        }
    }
    get(id) {
        return this.systems.get(id);
    }
    list() {
        return [...this.systems.values()];
    }
    dispose() {
        for (const system of [...this.systems.values()].reverse())
            system.dispose?.();
    }
}
//# sourceMappingURL=FrameGraph.js.map