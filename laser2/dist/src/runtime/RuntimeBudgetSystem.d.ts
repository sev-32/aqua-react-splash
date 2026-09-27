import type { AppContext, AppSystem } from '../core/System.js';
import type { AnchoredPhysicsSystem } from '../physics/AnchoredPhysicsSystem.js';
import type { RenderSystem } from '../render/RenderSystem.js';
export declare class RuntimeBudgetSystem implements AppSystem {
    readonly physics: AnchoredPhysicsSystem;
    readonly render: RenderSystem;
    readonly id = "runtime.budget-auditor";
    readonly phase: "ui";
    enabled: boolean;
    private context;
    private frames;
    private audits;
    private lastAuditMs;
    private alerts;
    private lastMetrics;
    constructor(physics: AnchoredPhysicsSystem, render: RenderSystem);
    init(context: AppContext): void;
    update(_dtSeconds: number): void;
    runAudit(): void;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=RuntimeBudgetSystem.d.ts.map