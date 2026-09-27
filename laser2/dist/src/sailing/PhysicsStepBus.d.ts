export type StepListener = (dt: number, substeps: number, simTime: number) => void;
export declare class PhysicsStepBus {
    private readonly timeSource;
    private readonly before;
    private readonly after;
    private world;
    private originalStep;
    private hadOwnStep;
    steps: number;
    constructor(timeSource: () => number);
    install(world: any): void;
    uninstall(): void;
    get installed(): boolean;
    onBefore(listener: StepListener): () => void;
    onAfter(listener: StepListener): () => void;
}
//# sourceMappingURL=PhysicsStepBus.d.ts.map