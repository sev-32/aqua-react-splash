export type EventMap = Record<string, unknown>;

type Handler<T> = (payload: T) => void;

export class EventBus<TEvents extends EventMap> {
  private readonly handlers = new Map<keyof TEvents, Set<Handler<any>>>();

  on<TKey extends keyof TEvents>(key: TKey, handler: Handler<TEvents[TKey]>): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(handler);
    return () => set?.delete(handler);
  }

  emit<TKey extends keyof TEvents>(key: TKey, payload: TEvents[TKey]): void {
    for (const handler of this.handlers.get(key) ?? []) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Event handler failed for ${String(key)}`, error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
