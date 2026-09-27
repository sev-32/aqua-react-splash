export class RingBuffer {
    capacity;
    values = [];
    constructor(capacity) {
        this.capacity = capacity;
    }
    push(value) {
        this.values.push(value);
        if (this.values.length > this.capacity)
            this.values.shift();
    }
    toArray() { return this.values; }
    get length() { return this.values.length; }
    last() { return this.values.at(-1); }
}
//# sourceMappingURL=RingBuffer.js.map