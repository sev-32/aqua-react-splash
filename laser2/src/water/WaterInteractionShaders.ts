// GLSL for the local water-interaction solver (wakes, bow waves, ripples from
// swimmers and a rig in the water) and its foam field.
//
// State texture (RGBA32F, N×N): r = surface displacement h (m), g = velocity
// potential φ at the surface. Each step:
//   1. forward 2D FFT of h + iφ (Stockham radix-2, log2N passes per axis),
//   2. exact deep-water propagation of every mode (ω² = g|k|) with light
//      viscous/numerical damping,
//   3. inverse FFT,
//   4. real-space pass: grid recentring shift, absorbing sponge border and
//      the moving obstacles (hull, swimmers, spars) that pierce the surface,
//      which press on it with the hydrostatic pressure of their immersion D.
// Exact dispersion means the Kelvin wake angle, transverse and divergent
// wave systems and the ripples' group velocity come out right at any speed.

export const FULLSCREEN_VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** One radix-2 Stockham butterfly stage along one axis on a complex RG field. */
export const FFT_FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
uniform highp sampler2D uInput;
uniform int uN;
uniform int uNs;          // butterfly span of this stage (1, 2, 4, ... N/2)
uniform int uHorizontal;  // 1: transform along x, 0: along y
uniform float uSign;      // -1 forward, +1 inverse
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  int i = uHorizontal == 1 ? p.x : p.y;
  int half_ = uN / 2;
  int ns2 = uNs * 2;
  int r = (i % ns2) / uNs;
  int j = (i / ns2) * uNs + (i % uNs);
  ivec2 a = uHorizontal == 1 ? ivec2(j, p.y) : ivec2(p.x, j);
  ivec2 b = uHorizontal == 1 ? ivec2(j + half_, p.y) : ivec2(p.x, j + half_);
  vec2 v0 = texelFetch(uInput, a, 0).rg;
  vec2 v1 = texelFetch(uInput, b, 0).rg;
  float angle = uSign * 6.28318530718 * float(j % uNs) / float(ns2);
  vec2 w = vec2(cos(angle), sin(angle));
  vec2 t = vec2(v1.x * w.x - v1.y * w.y, v1.x * w.y + v1.y * w.x);
  vec2 outv = r == 0 ? v0 + t : v0 - t;
  gl_FragColor = vec4(outv, 0.0, 1.0);
}
`;

/** Exact propagation of the packed spectrum F = FFT(h + iφ) over uDt. */
export const PROPAGATE_FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
uniform highp sampler2D uSpectrum;
uniform int uN;
uniform float uCell;      // m per texel
uniform float uDt;
uniform float uG;
uniform float uDamping;   // 1/s, all modes
uniform float uHighDamping; // 1/s at the grid Nyquist (∝ (k/kmax)^4)
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 m = ivec2((uN - p.x) % uN, (uN - p.y) % uN);
  vec2 F = texelFetch(uSpectrum, p, 0).rg;
  vec2 Fm = texelFetch(uSpectrum, m, 0).rg;
  // Split the packed transform of two real fields.
  vec2 H = 0.5 * vec2(F.x + Fm.x, F.y - Fm.y);
  vec2 P = 0.5 * vec2(F.y + Fm.y, -(F.x - Fm.x));
  float fx = float(p.x < uN / 2 ? p.x : p.x - uN);
  float fy = float(p.y < uN / 2 ? p.y : p.y - uN);
  float scale = 6.28318530718 / (float(uN) * uCell);
  float k = length(vec2(fx, fy)) * scale;
  float norm = 1.0 / float(uN * uN);
  if (k < 1e-6) {
    // Mean level carries no waves; remove it.
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float omega = sqrt(uG * k);
  float c = cos(omega * uDt), s = sin(omega * uDt);
  float kmax = 3.14159265359 / uCell;
  float kr = k / kmax;
  float decay = exp(-(uDamping + uHighDamping * kr * kr * kr * kr) * uDt) * norm;
  vec2 H2 = (H * c + P * (k / omega) * s) * decay;
  vec2 P2 = (P * c - H * (uG / omega) * s) * decay;
  // Repack F' = H' + i P'.
  gl_FragColor = vec4(H2.x - P2.y, H2.y + P2.x, 0.0, 1.0);
}
`;

const ETA_LOOKUP = /* glsl */ `
uniform highp sampler2D uEta;   // CPU Eulerian wave heights (R)
uniform vec4 uEtaGrid;          // originX, originZ, spacing, n
float etaAt(vec2 world) {
  vec2 f = (world - uEtaGrid.xy) / uEtaGrid.z;
  float n = uEtaGrid.w;
  if (f.x < 0.0 || f.y < 0.0 || f.x > n - 1.001 || f.y > n - 1.001) return 0.0;
  ivec2 i = ivec2(floor(f));
  vec2 t = f - vec2(i);
  float a = texelFetch(uEta, i, 0).r, b = texelFetch(uEta, i + ivec2(1, 0), 0).r;
  float c = texelFetch(uEta, i + ivec2(0, 1), 0).r, d = texelFetch(uEta, i + ivec2(1, 1), 0).r;
  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}
`;

const OBSTACLE_DEPTH = /* glsl */ `
uniform highp sampler2D uObstacle; // r = lowest y, g = -highest y of surface-piercing bodies
// Depth of solid below the local wave surface where a body pierces it.
float obstacleDepth(ivec2 p, vec2 world) {
  vec2 ob = texelFetch(uObstacle, p, 0).rg;
  float minY = ob.r;
  if (minY > 1000.0) return 0.0;
  float maxY = -ob.g;
  float eta = etaAt(world);
  if (maxY < eta - 0.02) return 0.0;   // fully submerged here: no free-surface displacement
  return max(0.0, eta - minY);
}
`;

/** Real-space step: recentring shift, sponge, obstacles and splash impulses. */
export const REALSPACE_FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
uniform highp sampler2D uState;
uniform int uN;
uniform ivec2 uShift;
uniform vec2 uOrigin;        // world xz of texel (0,0) centre
uniform float uCell;
uniform float uSponge;       // cells
uniform float uDisplace;     // 0..1 obstacle coupling
uniform float uDt;
uniform float uG;
uniform vec4 uSplash[8];     // x, z, radius, height impulse (m)
uniform int uSplashCount;
${ETA_LOOKUP}
${OBSTACLE_DEPTH}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 q = p + uShift;
  vec2 s = vec2(0.0);
  if (q.x >= 0 && q.y >= 0 && q.x < uN && q.y < uN) s = texelFetch(uState, q, 0).rg;
  float edge = float(min(min(p.x, p.y), min(uN - 1 - p.x, uN - 1 - p.y)));
  s *= mix(0.9, 1.0, smoothstep(0.0, uSponge, edge));
  vec2 world = uOrigin + vec2(p) * uCell;
  float D = obstacleDepth(p, world);
  // A floating body acts on the free surface as the pressure of its
  // immersion, p = ρ·g·D (the Havelock moving-pressure model of ship waves):
  // ∂φ/∂t = −g·h − p/ρ. At rest this settles to h = −D under the hull; in
  // motion it radiates the Kelvin wake with the linear-theory amplitude.
  s.y -= uG * D * uDisplace * uDt;
  // Waves are not free under a hull bottom: relax them towards the displaced shape.
  float mask = smoothstep(0.0, 0.035, D);
  s.x = mix(s.x, -D * uDisplace, mask * (1.0 - exp(-uDt * 6.0)));
  for (int i = 0; i < 8; i++) {
    if (i >= uSplashCount) break;
    vec4 sp = uSplash[i];
    float r2 = dot(world - sp.xy, world - sp.xy) / max(1e-4, sp.z * sp.z);
    s.x += sp.w * exp(-r2);
  }
  gl_FragColor = vec4(s, 0.0, 1.0);
}
`;

/**
 * Foam: carried with the grid (it stays where it was made in the world),
 * decays and spreads slightly. Generated where a body drives into the surface
 * faster than the water can move aside (bow at speed, a hull or rig slamming
 * down), where a body lifts out and leaves aerated water behind (the transom
 * wake, a sail peeling out), where interaction waves steepen beyond breaking,
 * and at swimmers' strokes.
 */
export const FOAM_FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
uniform highp sampler2D uFoam;     // r = foam, g = obstacle depth last step
uniform highp sampler2D uState;    // current h
uniform int uN;
uniform ivec2 uShift;
uniform vec2 uOrigin;
uniform float uCell;
uniform float uDt;
uniform float uHalfLife;
uniform float uEntryGain;
uniform float uExitGain;
uniform float uBreakGain;
uniform vec4 uSplash[8];
uniform int uSplashCount;
${ETA_LOOKUP}
${OBSTACLE_DEPTH}
vec2 prevAt(ivec2 q) {
  if (q.x < 0 || q.y < 0 || q.x >= uN || q.y >= uN) return vec2(0.0);
  return texelFetch(uFoam, q, 0).rg;
}
// Free-surface height (bodies' own waterplane excluded).
float freeH(ivec2 q) {
  q = clamp(q, ivec2(0), ivec2(uN - 1));
  float D = obstacleDepth(q, uOrigin + vec2(q) * uCell);
  return D > 0.002 ? 1e9 : texelFetch(uState, q, 0).r;
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 q = p + uShift;
  vec2 c = prevAt(q);
  float blur = 0.25 * (prevAt(q + ivec2(1, 0)).r + prevAt(q - ivec2(1, 0)).r + prevAt(q + ivec2(0, 1)).r + prevAt(q - ivec2(0, 1)).r);
  float foam = mix(c.r, blur, 0.05) * exp2(-uDt / max(0.05, uHalfLife));
  vec2 world = uOrigin + vec2(p) * uCell;
  float D = obstacleDepth(p, world);
  float dD = (D - c.g) / max(uDt, 1e-4);
  // Thresholds: a hull or rig rocking in the swell (≲0.4 m/s relative)
  // does not aerate the water; a bow at speed or a slam does.
  float entry = max(0.0, dD - 0.45);
  float lift = max(0.0, -dD - 0.5);
  // Breaking: slope of the free surface between cells that are all open water.
  float h0 = freeH(p);
  float breaking = 0.0;
  if (h0 < 1e8) {
    float hx1 = freeH(p + ivec2(1, 0)), hx0 = freeH(p - ivec2(1, 0));
    float hz1 = freeH(p + ivec2(0, 1)), hz0 = freeH(p - ivec2(0, 1));
    if (max(max(hx1, hx0), max(hz1, hz0)) < 1e8) {
      float steep = length(vec2(hx1 - hx0, hz1 - hz0)) / (2.0 * uCell);
      breaking = smoothstep(0.24, 0.55, steep);
    }
  }
  foam += (uEntryGain * entry + uExitGain * lift + uBreakGain * breaking) * uDt;
  for (int i = 0; i < 8; i++) {
    if (i >= uSplashCount) break;
    vec4 sp = uSplash[i];
    float r2 = dot(world - sp.xy, world - sp.xy) / max(1e-4, sp.z * sp.z);
    foam += abs(sp.w) * 6.0 * exp(-r2);
  }
  gl_FragColor = vec4(clamp(foam, 0.0, 1.4), D, 0.0, 1.0);
}
`;

/**
 * Rendering texture: h, ∂h/∂x, ∂h/∂z, foam with a faded border. Inside a
 * body's waterplane the solver's clamped −D is replaced by the undisturbed
 * surface, so decks dipping under and cockpits filling show real water.
 */
export const COMPOSE_FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
uniform highp sampler2D uState;
uniform highp sampler2D uFoam;
uniform int uN;
uniform float uCell;
uniform float uFade;       // cells
float hAt(ivec2 q) {
  q = clamp(q, ivec2(0), ivec2(uN - 1));
  float h = texelFetch(uState, q, 0).r;
  float D = texelFetch(uFoam, q, 0).g;
  return mix(h, 0.0, smoothstep(0.0, 0.035, D));
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float h = hAt(p);
  float gx = (hAt(p + ivec2(1, 0)) - hAt(p - ivec2(1, 0))) / (2.0 * uCell);
  float gz = (hAt(p + ivec2(0, 1)) - hAt(p - ivec2(0, 1))) / (2.0 * uCell);
  float edge = float(min(min(p.x, p.y), min(uN - 1 - p.x, uN - 1 - p.y)));
  float fade = smoothstep(0.0, uFade, edge);
  float foam = texelFetch(uFoam, p, 0).r;
  gl_FragColor = vec4(h * fade, gx * fade, gz * fade, foam * fade);
}
`;

/** Surface-piercing bodies seen from below: min(y), min(−y) via MIN blending. */
export const OBSTACLE_VERTEX = /* glsl */ `
varying float vWorldY;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldY = world.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const OBSTACLE_FRAGMENT = /* glsl */ `
precision highp float;
varying float vWorldY;
void main() {
  gl_FragColor = vec4(vWorldY, -vWorldY, 0.0, 1.0);
}
`;
