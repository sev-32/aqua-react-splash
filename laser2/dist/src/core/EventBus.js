export class EventBus {
    handlers = new Map();
    on(key, handler) {
        let set = this.handlers.get(key);
        if (!set) {
            set = new Set();
            this.handlers.set(key, set);
        }
        set.add(handler);
        return () => set?.delete(handler);
    }
    emit(key, payload) {
        for (const handler of this.handlers.get(key) ?? []) {
            try {
                handler(payload);
            }
            catch (error) {
                console.error(`Event handler failed for ${String(key)}`, error);
            }
        }
    }
    clear() {
        this.handlers.clear();
    }
}
//# sourceMappingURL=EventBus.js.map