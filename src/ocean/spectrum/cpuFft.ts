/**
 * Stockham autosort radix-2 FFT — the exact index scheme used by the GPU FFT
 * passes (fft.glsl.ts). Keeping CPU and GPU on the same algorithm lets the
 * CPU spectral mirror, the tests and the renderer agree bit-for-bit in
 * structure (law W7: same math for preview, authority and replay).
 *
 * Convention:
 *   forward:  X[k] = Σ x[n] e^{-2πi kn/N}
 *   inverse:  x[n] = Σ X[k] e^{+2πi kn/N}      (no 1/N; callers scale)
 *
 * Stage with sub-transform size S (2,4,…,N), output index i:
 *   e = floor(i/S)·(S/2) + (i mod S/2)
 *   out[i] = in[e] + w·in[e + N/2],  w = e^{∓2πi·i/S}
 */

export function isPow2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

const twiddleCache = new Map<number, { c: Float64Array; s: Float64Array }>();
/** cos/sin of 2π j/n, j = 0..n-1 (angle sign applied by the caller). */
function twiddles(n: number) {
  let t = twiddleCache.get(n);
  if (!t) {
    const c = new Float64Array(n), s = new Float64Array(n);
    for (let j = 0; j < n; j++) { c[j] = Math.cos((2 * Math.PI * j) / n); s[j] = Math.sin((2 * Math.PI * j) / n); }
    t = { c, s };
    twiddleCache.set(n, t);
  }
  return t;
}

/** In-place-ish 1D complex FFT on (re, im). Returns the arrays holding the result. */
export function fft1d(
  re: Float64Array,
  im: Float64Array,
  inverse: boolean,
  scratchRe: Float64Array = new Float64Array(re.length),
  scratchIm: Float64Array = new Float64Array(re.length),
): [Float64Array, Float64Array] {
  const n = re.length;
  if (!isPow2(n)) throw new Error(`fft1d: length ${n} is not a power of two`);
  const half = n >> 1;
  const sign = inverse ? 1 : -1;
  const tw = twiddles(n);
  let srcR = re, srcI = im, dstR = scratchRe, dstI = scratchIm;
  for (let s = 2; s <= n; s <<= 1) {
    const hs = s >> 1;
    const step = n / s; // i/s = (i·step)/n
    for (let i = 0; i < n; i++) {
      const e = ((i / s) | 0) * hs + (i % hs);
      const o = e + half;
      const j = (i * step) % n;
      const wr = tw.c[j], wi = sign * tw.s[j];
      const orr = srcR[o], oi = srcI[o];
      dstR[i] = srcR[e] + wr * orr - wi * oi;
      dstI[i] = srcI[e] + wr * oi + wi * orr;
    }
    [srcR, dstR] = [dstR, srcR];
    [srcI, dstI] = [dstI, srcI];
  }
  if (srcR !== re) {
    re.set(srcR);
    im.set(srcI);
  }
  return [re, im];
}

/**
 * 2D complex FFT over an n×n row-major grid (index = z*n + x).
 * Rows (x direction) first, then columns — same order as the GPU (H then V).
 */
export function fft2d(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
  const rowR = new Float64Array(n), rowI = new Float64Array(n);
  const sR = new Float64Array(n), sI = new Float64Array(n);
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) { rowR[x] = re[z * n + x]; rowI[x] = im[z * n + x]; }
    fft1d(rowR, rowI, inverse, sR, sI);
    for (let x = 0; x < n; x++) { re[z * n + x] = rowR[x]; im[z * n + x] = rowI[x]; }
  }
  for (let x = 0; x < n; x++) {
    for (let z = 0; z < n; z++) { rowR[z] = re[z * n + x]; rowI[z] = im[z * n + x]; }
    fft1d(rowR, rowI, inverse, sR, sI);
    for (let z = 0; z < n; z++) { re[z * n + x] = rowR[z]; im[z * n + x] = rowI[z]; }
  }
}

/** Signed frequency index for FFT order: 0..n/2-1 → same, n/2..n-1 → negative. */
export const fftFreq = (i: number, n: number) => (i < n / 2 ? i : i - n);
