import type { AppContext, AppSystem } from '../core/System.js';
import type { RenderSystem } from '../render/RenderSystem.js';
import type { MarkupSystem } from './MarkupSystem.js';
import type { SelectionSystem } from './SelectionSystem.js';
import type { NotesSystem } from './NotesSystem.js';
export declare class ScreenshotSystem implements AppSystem {
    readonly markup: MarkupSystem;
    readonly selection: SelectionSystem;
    readonly notes: NotesSystem;
    readonly renderSystem: RenderSystem;
    readonly id = "inspection.screenshot";
    readonly phase: "ui";
    enabled: boolean;
    private context;
    private captures;
    constructor(markup: MarkupSystem, selection: SelectionSystem, notes: NotesSystem, renderSystem: RenderSystem);
    init(context: AppContext): void;
    capture(download?: boolean): Promise<string>;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=ScreenshotSystem.d.ts.map