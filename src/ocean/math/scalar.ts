export const G = 9.81;
export const TAU = Math.PI * 2;

export const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
export const saturate = (x: number) => clamp(x, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = saturate((x - e0) / (e1 - e0 || 1e-12));
  return t * t * (3 - 2 * t);
}

/** norm(x; lo, hi) from the Hybrid Encyclopedia §116.3 — the one normaliser every field uses. */
export const norm = (x: number, lo: number, hi: number) => saturate((x - lo) / Math.max(hi - lo, 1e-12));

/** Frame-rate independent approach of a toward b. */
export const approach = (a: number, b: number, rate: number, dt: number) => b + (a - b) * Math.exp(-rate * dt);

export const wrapDeg = (d: number) => ((d % 360) + 360) % 360;
export function lerpAngleDeg(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return wrapDeg(a + d * t);
}
export const deg2rad = (d: number) => (d * Math.PI) / 180;

/** Positive modulo that works for negatives (used for camera-relative cascade offsets). */
export const pmod = (x: number, m: number) => ((x % m) + m) % m;

/** log-gamma (Lanczos), used for directional spreading normalisation. */
export function lgamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
