// Sailing mode orchestration: installs the native ocean and hull authorities
// (and anything registered with `addAuthority`) when the Foundry enters
// 'sailing', and removes them again for inspection/anchored lab work.

import type { AppContext, AppSystem, FoundryMode } from '../core/System.js';

export interface SailingAuthority {
  readonly id: string;
  install(context: AppContext): void;
  uninstall(context: AppContext): void;
  /** Optional hook when the legacy simulation is reset while sailing. */
  onSailingReset?(context: AppContext): void;
}

export class SailingModeSystem implements AppSystem {
  readonly id = 'sailing.mode';
  readonly phase = 'prePhysics' as const;
  enabled = true;
  private readonly authorities: SailingAuthority[] = [];
  private context: AppContext | null = null;
  private active = false;
  private transitions = 0;
  private resets = 0;
  private lastError: string | null = null;
  /** Wind applied when sailing starts (knots, degrees "from"). */
  startWindKnots = 12;
  startWindFromDeg = 0;

  addAuthority(authority: SailingAuthority): this {
    this.authorities.push(authority);
    return this;
  }

  init(context: AppContext): void {
    this.context = context;
    context.events.on('mode:change', ({ mode }) => this.apply(mode as FoundryMode));
    context.events.on('sailing:reset', () => {
      if (!this.active) return;
      this.resets++;
      for (const authority of this.authorities) {
        try { authority.onSailingReset?.(context); } catch (error) { this.recordError(authority.id, error); }
      }
    });
    this.apply(context.state.get().mode);
  }

  private apply(mode: FoundryMode): void {
    const context = this.context;
    if (!context) return;
    const want = mode === 'sailing';
    if (want === this.active) return;
    this.transitions++;
    if (want) {
      const sim = context.legacy.simulation;
      sim.setWind?.(this.startWindKnots, this.startWindFromDeg);
      for (const authority of this.authorities) {
        try { authority.install(context); } catch (error) { this.recordError(authority.id, error); }
      }
    } else {
      for (const authority of [...this.authorities].reverse()) {
        try { authority.uninstall(context); } catch (error) { this.recordError(authority.id, error); }
      }
    }
    this.active = want;
    context.requestRender(want ? 'sailing authorities installed' : 'sailing authorities removed');
  }

  private recordError(id: string, error: unknown): void {
    this.lastError = `${id}: ${error instanceof Error ? error.message : String(error)}`;
    console.error('Sailing authority failed', id, error);
    this.context?.telemetry.recordError(`sailing:${id}`, error);
  }

  get isActive(): boolean { return this.active; }

  telemetry(): Record<string, unknown> {
    return {
      active: this.active,
      authorities: this.authorities.map((authority) => authority.id),
      transitions: this.transitions,
      resets: this.resets,
      lastError: this.lastError,
      startWind: { knots: this.startWindKnots, fromDeg: this.startWindFromDeg },
    };
  }
}
