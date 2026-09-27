export type EventMap = Record<string, unknown>;
type Handler<T> = (payload: T) => void;
export declare class EventBus<TEvents extends EventMap> {
    private readonly handlers;
    on<TKey extends keyof TEvents>(key: TKey, handler: Handler<TEvents[TKey]>): () => void;
    emit<TKey extends keyof TEvents>(key: TKey, payload: TEvents[TKey]): void;
    clear(): void;
}
export {};
//# sourceMappingURL=EventBus.d.ts.map