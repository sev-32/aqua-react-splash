export declare class RingBuffer<T> {
    readonly capacity: number;
    private readonly values;
    constructor(capacity: number);
    push(value: T): void;
    toArray(): readonly T[];
    get length(): number;
    last(): T | undefined;
}
//# sourceMappingURL=RingBuffer.d.ts.map