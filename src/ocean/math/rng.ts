/**
 * Deterministic randomness and hashing.
 *
 * Every stochastic quantity in the engine (spectrum phases, spray jitter,
 * scheduler tie-breaks) derives from these functions so that client, server
 * and replay produce identical results from the same seed (law W7).
 */

/** mulberry32 — tiny, fast, well-distributed 32-bit PRNG. Returns [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash (lowbias32). Stable across platforms. */
export function hashU32(x: number): number {
  x = x >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/** Combine integers into one well-mixed seed, e.g. hashSeed(seed, tileX, tileZ, tick). */
export function hashSeed(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) h = hashU32(h ^ hashU32((p | 0) + 0x632be5ab));
  return h >>> 0;
}

/** FNV-1a over a string → 8 hex chars. Used for policy/product hashes in receipts. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Hash of arbitrary JSON-serialisable data with stable key order. */
export function hashJson(value: unknown): string {
  return fnv1a(stableStringify(value));
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** Hash of a Float32Array's bit pattern (for field hashes in receipts and parity tests). */
export function hashFloat32(data: Float32Array): string {
  const u = new Uint32Array(data.buffer, data.byteOffset, data.length);
  let h = 0x811c9dc5;
  for (let i = 0; i < u.length; i++) {
    h ^= u[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Standard normal pair via Box–Muller from a uniform source. */
export function gaussianPair(rand: () => number): [number, number] {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  const r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
}
