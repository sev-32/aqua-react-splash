import type { AppContext, AppSystem } from './System.js';
export declare class FrameGraph {
    private readonly systems;
    private readonly byPhase;
    constructor();
    add(system: AppSystem): void;
    init(context: AppContext): Promise<void>;
    update(dtSeconds: number, context: AppContext): void;
    get(id: string): AppSystem | undefined;
    list(): readonly AppSystem[];
    dispose(): void;
}
//# sourceMappingURL=FrameGraph.d.ts.map