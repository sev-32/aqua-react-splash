import type { AppContext, AppSystem } from '../core/System.js';
export interface PartNote {
    status: 'unreviewed' | 'correct' | 'incorrect' | 'question';
    text: string;
    tags: string[];
    updatedAt: string;
}
export declare class NotesSystem implements AppSystem {
    readonly id = "inspection.notes";
    readonly phase: "ui";
    enabled: boolean;
    private readonly key;
    private readonly notes;
    init(_context: AppContext): void;
    get(id: string): PartNote;
    set(id: string, patch: Partial<PartNote>): PartNote;
    export(): Record<string, PartNote>;
    private persist;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=NotesSystem.d.ts.map