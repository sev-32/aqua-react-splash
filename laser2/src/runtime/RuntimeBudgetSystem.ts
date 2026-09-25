import type { AppContext, AppSystem } from '../core/System.js';
import type { AnchoredPhysicsSystem } from '../physics/AnchoredPhysicsSystem.js';
import type { RenderSystem } from '../render/RenderSystem.js';

interface BudgetAlert {
  key: string;
  severity: 'info' | 'warning' | 'critical';
  measured: number;
  budget: number;
  unit: string;
  recommendation: string;
}

export class RuntimeBudgetSystem implements AppSystem {
  readonly id = 'runtime.budget-auditor';
  readonly phase = 'ui' as const;
  enabled = true;
  private context: AppContext | null = null;
  private frames = 0;
  private audits = 0;
  private lastAuditMs = 0;
  private alerts: BudgetAlert[] = [];
  private lastMetrics: Record<string, unknown> = {};

  constructor(
    readonly physics: AnchoredPhysicsSystem,
    readonly render: RenderSystem,
  ) {}

  init(context: AppContext): void {
    this.context = context;
    this.runAudit();
  }

  update(_dtSeconds: number): void {
    this.frames++;
    if (this.frames % 30 === 0) this.runAudit();
  }

  runAudit(): void {
    if (!this.context) return;
    const start = performance.now();
    const telemetry: any = this.context.telemetry.performanceSummary();
    const physics: any = this.physics.telemetry();
    const render: any = this.render.telemetry();
    const profile = this.context.quality.current;
    const drawCallBudget = profile.id === 'fast' ? 120 : profile.id === 'balanced' ? 160 : profile.id === 'high' ? 220 : 300;
    const cpuFrameBudgetMs = 1000 / 60;
    const physicsStepBudgetMs = profile.id === 'fast' ? 5 : profile.id === 'balanced' ? 8 : 12;
    const alerts: BudgetAlert[] = [];
    const push = (key: string, measured: number, budget: number, unit: string, recommendation: string): void => {
      if (!Number.isFinite(measured) || measured <= budget) return;
      alerts.push({
        key,
        severity: measured > budget * 2 ? 'critical' : measured > budget * 1.25 ? 'warning' : 'info',
        measured,
        budget,
        unit,
        recommendation,
      });
    };
    push('draw-calls', Number(telemetry.renderer?.calls ?? 0), drawCallBudget, 'calls', 'Batch static parts by material, instance repeated hardware, and consolidate rope buffers.');
    push('dynamic-frame-cpu-p95', Number(telemetry.dynamicFrameCpuMs?.p95 ?? 0), cpuFrameBudgetMs, 'ms', 'Separate simulation from GPU buffer synchronization and render interpolation; skip inactive subsystem updates.');
    push('physics-step-mean', Number(physics.perStepCpuMs?.mean ?? 0), physicsStepBudgetMs, 'ms', 'Migrate mast, sail, rope, and collision solvers behind independently timed native systems.');
    push('static-render-submission-p95', Number(render.renderCpuSubmissionMs?.steadyState?.p95 ?? 0), cpuFrameBudgetMs, 'ms', 'Reduce program/material switches and avoid synchronous shader compilation in interactive frames.');
    this.alerts = alerts;
    this.audits++;
    this.lastAuditMs = performance.now() - start;
    this.lastMetrics = {
      quality: profile.id,
      drawCalls: telemetry.renderer?.calls ?? null,
      triangles: telemetry.renderer?.triangles ?? null,
      dynamicFrameCpuP95Ms: telemetry.dynamicFrameCpuMs?.p95 ?? null,
      physicsPerStepMeanMs: physics.perStepCpuMs?.mean ?? null,
      renderSubmissionP95Ms: render.renderCpuSubmissionMs?.steadyState?.p95 ?? null,
    };
  }

  telemetry(): Record<string, unknown> {
    return {
      audits: this.audits,
      lastAuditMs: this.lastAuditMs,
      metrics: this.lastMetrics,
      alerts: this.alerts,
      policy: 'diagnostic only; V5 never changes material semantics or quality automatically',
    };
  }
}
