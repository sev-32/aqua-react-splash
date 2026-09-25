// Sailing HUD: boat speed, heel, wind, the capsize/recovery story as it
// happens, crew tasks in plain words, and the controls needed to sail,
// capsize on purpose and watch the crew recover the boat.

import type { AppContext, AppSystem } from '../core/System.js';
import type { CrewRecoverySystem } from '../crew/CrewRecoverySystem.js';
import type { CameraControllerSystem } from '../inspection/CameraControllerSystem.js';
import type { OceanSystem } from '../water/OceanSystem.js';

const TASK_LABELS: Record<string, string> = {
  sailing: 'sailing',
  bracing: 'bracing against the heel',
  dryCapsize: 'stepping over onto the centreboard',
  falling: 'falling in',
  treading: 'treading water',
  swimToBoard: 'swimming round to the centreboard',
  hangBoard: 'hanging on the centreboard',
  climbBoard: 'climbing onto the centreboard',
  standBoard: 'righting: leaning back on the board',
  swimToHull: 'swimming to the upturned hull',
  climbHull: 'climbing onto the upturned hull',
  standHull: 'turtle: pulling on the board',
  swimToCockpit: 'swimming into the scoop position',
  holdStrap: 'in the scoop, holding the toe strap',
  scooped: 'scooped aboard',
  swimToGunwale: 'swimming to the gunwale',
  holdGunwale: 'holding the gunwale',
  climbIn: 'climbing back in',
};

function label(task: string): string { return TASK_LABELS[task] ?? task; }

export class SailingHudSystem implements AppSystem {
  readonly id = 'ui.sailing-hud';
  readonly phase = 'ui' as const;
  enabled = true;
  private context: AppContext | null = null;
  private root: HTMLElement | null = null;
  private body: HTMLElement | null = null;
  private timer = 0;
  private windKnots = 12;
  private lastStatus = '';
  private statusSince = 0;
  private clock = 0;

  constructor(
    readonly crew: CrewRecoverySystem,
    readonly camera: CameraControllerSystem,
    readonly ocean: OceanSystem,
  ) {}

  init(context: AppContext): void {
    this.context = context;
    const root = document.createElement('section');
    root.className = 'sailing-hud';
    root.id = 'sailing-hud';
    root.innerHTML = `
      <header><b>SAILING</b><span data-role="status">—</span></header>
      <div class="sailing-hud-body" data-role="body"></div>
      <div class="sailing-hud-actions" data-role="actions"></div>
      <footer>A/D ←/→ tiller · W/S main · Q/E jib · X/Z hike · C trapeze · O capsize · U heave · V camera · N reset</footer>`;
    const host = document.getElementById('foundry-ui') ?? document.body;
    host.appendChild(root);
    this.root = root;
    this.body = root.querySelector('[data-role="body"]');
    this.buildActions(root.querySelector<HTMLElement>('[data-role="actions"]')!);
    context.events.on('mode:change', () => this.render());
    this.render();
  }

  private buildActions(host: HTMLElement): void {
    const make = (text: string, title: string, action: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = text; b.title = title;
      b.onclick = () => { action(); this.render(); };
      host.appendChild(b);
      return b;
    };
    make('CAPSIZE', 'Knockdown gust that capsizes the boat to leeward (O)', () => this.crew.forceCapsize());
    make('AUTO', 'Crew recover the boat by themselves (I)', () => { this.crew.autoRecovery = !this.crew.autoRecovery; }).dataset.toggle = 'auto';
    make('DRY', 'Expert helm steps over onto the board in a leeward capsize (dry capsize); off = falls in and swims', () => { this.crew.dryCapsize = !this.crew.dryCapsize; }).dataset.toggle = 'dry';
    make('TRIM', 'Crew trim the sheets to the apparent wind and ease in gusts (manual W/S Q/E override)', () => { this.crew.trimAssist = !this.crew.trimAssist; }).dataset.toggle = 'trim';
    make('CAMERA', 'Cycle follow / chase / crew camera (V)', () => {
      const state = this.context?.legacy.master.input?.state;
      if (state) state.camMode = ((state.camMode ?? 0) + 1) % 3;
    });
    make('WIND −', 'Less wind', () => this.setWind(-2));
    make('WIND +', 'More wind', () => this.setWind(2));
    make('RESET', 'Reset the boat (N)', () => window.__sim?.reset?.());
  }

  private setWind(delta: number): void {
    const master = this.context?.legacy.master;
    const current = (master?.wind?.speed10 ?? 6.2) / 0.5144;
    this.windKnots = Math.max(2, Math.min(30, Math.round(current + delta)));
    window.__sim?.setWind?.(this.windKnots, master?.wind?.fromDeg ?? 0);
  }

  update(dtSeconds: number): void {
    this.clock += dtSeconds;
    this.timer += dtSeconds;
    if (this.timer < 0.25) return;
    this.timer = 0;
    this.render();
  }

  private status(heel: number, crew: any): string {
    const agents: any[] = crew.agents ?? [];
    const anyOff = agents.some((a) => a.mode !== 'aboard' || a.task !== 'sailing');
    if (heel > 140) return 'TURTLED';
    if (heel > 80) return anyOff ? 'CAPSIZED — RECOVERING' : 'CAPSIZED';
    if (agents.some((a) => a.task === 'standBoard' || a.task === 'standHull') && heel > 30) return 'RIGHTING';
    if (anyOff) return heel > 45 ? 'KNOCKDOWN' : 'RE-BOARDING';
    if (heel > 45) return 'KNOCKDOWN';
    return 'UNDER WAY';
  }

  private render(): void {
    if (!this.root || !this.context) return;
    const sailing = this.context.state.get().mode === 'sailing';
    this.root.classList.toggle('visible', sailing);
    if (!sailing || !this.body) return;
    const sim = window.__sim?.get?.() ?? {};
    const master = this.context.legacy.master;
    const crew = this.crew.telemetry() as any;
    const heel = Number(crew.heelDeg ?? 0);
    const windKn = (master.wind?.speed10 ?? 0) / 0.5144;
    const status = this.status(heel, crew);
    if (status !== this.lastStatus) { this.lastStatus = status; this.statusSince = this.clock; }
    const statusEl = this.root.querySelector<HTMLElement>('[data-role="status"]');
    if (statusEl) {
      statusEl.textContent = `${status} · ${(this.clock - this.statusSince).toFixed(0)} s`;
      statusEl.dataset.level = status.startsWith('UNDER') ? 'ok' : status.startsWith('RIGHT') || status.startsWith('RE-') ? 'warn' : 'alert';
    }
    const agents: any[] = crew.agents ?? [];
    const crewRows = agents.map((a) => `<span>${a.id === 'helm' ? 'Helm' : 'Crew'}</span><b>${label(a.task)}</b>`).join('');
    const sea = this.ocean.telemetry() as any;
    this.body.innerHTML = `
      <div class="sailing-hud-stats">
        <div><small>SPEED</small><b>${Number(sim.sog ?? 0).toFixed(1)}<i>kn</i></b></div>
        <div><small>HEEL</small><b>${heel.toFixed(0)}<i>°</i></b></div>
        <div><small>HDG</small><b>${Number(sim.hdg ?? 0).toFixed(0)}<i>°</i></b></div>
        <div><small>WIND</small><b>${windKn.toFixed(0)}<i>kn</i></b></div>
        <div><small>AWA</small><b>${Number(crew.apparentWindAngleDeg ?? 0).toFixed(0)}<i>°</i></b></div>
        <div><small>SEA Hs</small><b>${Number(sea.significantHeightM ?? 0).toFixed(2)}<i>m</i></b></div>
      </div>
      <div class="kv">${crewRows}<span>Capsizes / recoveries</span><b>${crew.capsizes ?? 0} / ${crew.recoveries ?? 0}${crew.lastRecoveryDurationS ? ` · last ${Number(crew.lastRecoveryDurationS).toFixed(0)} s` : ''}</b><span>Camera</span><b>${this.camera.sailingMode}</b></div>`;
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-toggle]')) {
      const on = b.dataset.toggle === 'auto' ? this.crew.autoRecovery : b.dataset.toggle === 'trim' ? this.crew.trimAssist : this.crew.dryCapsize;
      b.classList.toggle('active', on);
    }
  }

  telemetry(): Record<string, unknown> {
    return { visible: this.root?.classList.contains('visible') ?? false, status: this.lastStatus };
  }
}
