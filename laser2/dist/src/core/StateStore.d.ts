export type StateListener<T> = (state: Readonly<T>, previous: Readonly<T>) => void;
export declare class StateStore<T extends object> {
    private current;
    private readonly listeners;
    constructor(initial: T);
    get(): Readonly<T>;
    update(patch: Partial<T> | ((draft: T) => void)): Readonly<T>;
    subscribe(listener: StateListener<T>): () => void;
}
//# sourceMappingURL=StateStore.d.ts.map