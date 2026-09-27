export class ScreenshotSystem {
    markup;
    selection;
    notes;
    renderSystem;
    id = 'inspection.screenshot';
    phase = 'ui';
    enabled = true;
    context = null;
    captures = 0;
    constructor(markup, selection, notes, renderSystem) {
        this.markup = markup;
        this.selection = selection;
        this.notes = notes;
        this.renderSystem = renderSystem;
    }
    init(context) { this.context = context; }
    async capture(download = true) {
        if (!this.context)
            throw new Error('Screenshot system not initialized');
        this.renderSystem.renderNow('capture:screenshot');
        const renderer = this.context.legacy.renderer;
        const source = renderer.domElement;
        const out = document.createElement('canvas');
        out.width = source.width;
        out.height = source.height;
        const ctx = out.getContext('2d');
        if (!ctx)
            throw new Error('2D capture context unavailable');
        ctx.drawImage(source, 0, 0);
        ctx.drawImage(this.markup.canvas, 0, 0, out.width, out.height);
        const selected = this.selection.current;
        const scale = out.width / innerWidth;
        ctx.save();
        ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(5,10,16,.88)';
        ctx.fillRect(16, 16, Math.min(innerWidth - 32, 660), 58);
        ctx.strokeStyle = '#e5a43a';
        ctx.strokeRect(16.5, 16.5, Math.min(innerWidth - 32, 660) - 1, 57);
        ctx.fillStyle = '#eef5fb';
        ctx.font = '700 15px Segoe UI, sans-serif';
        ctx.fillText(selected?.name ?? 'Complete Laser 2', 28, 40);
        ctx.fillStyle = '#95a5b5';
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(`LIGHTING FOUNDRY V5 · ${new Date().toISOString()}`, 28, 58);
        ctx.restore();
        const dataUrl = out.toDataURL('image/png');
        if (download) {
            const anchor = document.createElement('a');
            anchor.href = dataUrl;
            anchor.download = `LASER2_FOUNDRY_${Date.now()}.png`;
            anchor.click();
        }
        this.captures++;
        return dataUrl;
    }
    telemetry() { return { captures: this.captures, renderAuthority: this.renderSystem.id }; }
}
//# sourceMappingURL=ScreenshotSystem.js.map