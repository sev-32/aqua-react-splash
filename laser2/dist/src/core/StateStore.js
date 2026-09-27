export class StateStore {
    current;
    listeners = new Set();
    constructor(initial) {
        this.current = structuredClone(initial);
    }
    get() {
        return this.current;
    }
    update(patch) {
        const previous = this.current;
        const next = structuredClone(this.current);
        if (typeof patch === 'function')
            patch(next);
        else
            Object.assign(next, patch);
        this.current = next;
        for (const listener of this.listeners)
            listener(this.current, previous);
        return this.current;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}
//# sourceMappingURL=StateStore.js.map