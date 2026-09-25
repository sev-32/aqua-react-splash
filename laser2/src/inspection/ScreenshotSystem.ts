import type { AppContext, AppSystem } from '../core/System.js';
import type { RenderSystem } from '../render/RenderSystem.js';
import type { MarkupSystem } from './MarkupSystem.js';
import type { SelectionSystem } from './SelectionSystem.js';
import type { NotesSystem } from './NotesSystem.js';

export class ScreenshotSystem implements AppSystem {
  readonly id = 'inspection.screenshot';
  readonly phase = 'ui' as const;
  enabled = true;
  private context: AppContext | null = null;
  private captures = 0;

  constructor(
    readonly markup: MarkupSystem,
    readonly selection: SelectionSystem,
    readonly notes: NotesSystem,
    readonly renderSystem: RenderSystem,
  ) {}

  init(context: AppContext): void { this.context = context; }

  async capture(download = true): Promise<string> {
    if (!this.context) throw new Error('Screenshot system not initialized');
    this.renderSystem.renderNow('capture:screenshot');
    const renderer = this.context.legacy.renderer;
    const source = renderer.domElement as HTMLCanvasElement;
    const out = document.createElement('canvas');
    out.width = source.width; out.height = source.height;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('2D capture context unavailable');
    ctx.drawImage(source, 0, 0);
    ctx.drawImage(this.markup.canvas, 0, 0, out.width, out.height);
    const selected = this.selection.current;
    const scale = out.width / innerWidth;
    ctx.save(); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(5,10,16,.88)'; ctx.fillRect(16, 16, Math.min(innerWidth - 32, 660), 58);
    ctx.strokeStyle = '#e5a43a'; ctx.strokeRect(16.5, 16.5, Math.min(innerWidth - 32, 660) - 1, 57);
    ctx.fillStyle = '#eef5fb'; ctx.font = '700 15px Segoe UI, sans-serif'; ctx.fillText(selected?.name ?? 'Complete Laser 2', 28, 40);
    ctx.fillStyle = '#95a5b5'; ctx.font = '10px ui-monospace, monospace'; ctx.fillText(`LIGHTING FOUNDRY V5 · ${new Date().toISOString()}`, 28, 58);
    ctx.restore();
    const dataUrl = out.toDataURL('image/png');
    if (download) {
      const anchor = document.createElement('a'); anchor.href = dataUrl; anchor.download = `LASER2_FOUNDRY_${Date.now()}.png`; anchor.click();
    }
    this.captures++;
    return dataUrl;
  }

  telemetry(): Record<string, unknown> { return { captures: this.captures, renderAuthority: this.renderSystem.id }; }
}
