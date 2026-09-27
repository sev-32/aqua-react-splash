export interface GpuTimerSample {
    label: string;
    milliseconds: number;
    frame: number;
}
export declare class GpuTimer {
    readonly supported: boolean;
    readonly reason: string | null;
    private readonly gl;
    private readonly ext;
    private readonly pending;
    private active;
    private frame;
    private readonly samples;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext | null);
    begin(label: string): boolean;
    end(): void;
    poll(): readonly GpuTimerSample[];
    snapshot(): Record<string, unknown>;
}
//# sourceMappingURL=GpuTimer.d.ts.map