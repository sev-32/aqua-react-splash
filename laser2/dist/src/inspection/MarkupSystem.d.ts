import type { AppContext, AppSystem } from '../core/System.js';
export type MarkupTool = 'none' | 'pen' | 'arrow' | 'rect' | 'erase';
export declare class MarkupSystem implements AppSystem {
    readonly id = "inspection.markup";
    readonly phase: "ui";
    enabled: boolean;
    readonly canvas: HTMLCanvasElement;
    private readonly ctx;
    private context;
    private strokes;
    private current;
    tool: MarkupTool;
    color: string;
    width: number;
    constructor();
    init(context: AppContext): void;
    setTool(tool: MarkupTool): void;
    undo(): void;
    clear(): void;
    private updatePointerMode;
    private resize;
    private point;
    private begin;
    private move;
    private end;
    private drawStroke;
    private draw;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=MarkupSystem.d.ts.map