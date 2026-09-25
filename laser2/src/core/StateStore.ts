export type StateListener<T> = (state: Readonly<T>, previous: Readonly<T>) => void;

export class StateStore<T extends object> {
  private current: T;
  private readonly listeners = new Set<StateListener<T>>();

  constructor(initial: T) {
    this.current = structuredClone(initial);
  }

  get(): Readonly<T> {
    return this.current;
  }

  update(patch: Partial<T> | ((draft: T) => void)): Readonly<T> {
    const previous = this.current;
    const next = structuredClone(this.current);
    if (typeof patch === 'function') patch(next);
    else Object.assign(next, patch);
    this.current = next;
    for (const listener of this.listeners) listener(this.current, previous);
    return this.current;
  }

  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
