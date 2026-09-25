export class RingBuffer<T> {
  private readonly values: T[] = [];
  constructor(readonly capacity: number) {}
  push(value: T): void {
    this.values.push(value);
    if (this.values.length > this.capacity) this.values.shift();
  }
  toArray(): readonly T[] { return this.values; }
  get length(): number { return this.values.length; }
  last(): T | undefined { return this.values.at(-1); }
}
