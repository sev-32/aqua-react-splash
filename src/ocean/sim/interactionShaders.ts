/**
 * GLSL for T3 interaction tiles, the carpet kernel: eWave dispersion + occupancy
 * coupling with the hull's hold on the water (heightfieldBEST's blocking) + the
 * Representability Limiter. Mirrors sim/carpetCpu.ts and sim/ewaveCpu.ts.
 *
 * Textures (N×N, real space unless noted):
 *   state   RG32F    (η, φ)                         ← FFT'd each step
 *   aux     RGBA32F  (hullDisp, foam, ∂η/∂t of the last step, ηprev)
 *   release RGBA32F×2 (V, V·w, V·ux, V·uz) + (V·x, V·z, V·η, events)  — extensive sums
 *   impacts RGBA16F  (Δη, Δfoam, Δφ, -) additive splats (clicks, spray re-entry)
 */
import { HULL_GLSL } from '../physics/hull';

export const MAX_BODIES = 8;

export const TILE_COMMON = /* glsl */ `
uniform int uN;
uniform float uDx;           // cell size (m)
float tileSize(){ return float(uN)*uDx; }
`;

/**
 * 1. Carpet source + hold + impacts. MRT: state, aux. Mirrors CarpetCpu.step (sim/carpetCpu.ts).
 *
 * η is water + solid above the open-ocean surface (BEST's source form): a body entering a
 * column adds its wet occupancy σ there, leaving withdraws it (exact volume, escrowed in
 * aux.x). Where the body pierces the surface (fraction χ) the hull holds the column: a stiff
 * penalty pressure g·κ·χ·η keeps the water from rising or sinking under the hull, so the
 * displaced water must go around it (bow pile-up, a hollow behind that the sea falls into)
 * and waves do not pass through the body. A smoothing of φ under the hull damps the
 * stiffened footprint's own grid-scale ringing.
 */
export const TILE_SOURCE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${TILE_COMMON}
${HULL_GLSL}
uniform sampler2D uState;
uniform sampler2D uAux;
uniform sampler2D uImpacts;
precision highp sampler2DArray;
uniform int uCascadeCount;
uniform float uSizes[4];
uniform vec2 uCascOffset[4];   // pmod(tileOrigin, L)
uniform sampler2DArray uDispArr;
uniform int uBodyCount;
uniform vec4 uBodyPos[${MAX_BODIES}];     // tile-local xyz, kind
uniform vec3 uBodyAx[${MAX_BODIES * 3}];  // rotation columns
uniform vec4 uBodyDims[${MAX_BODIES}];
uniform float uSourceGain;
uniform float uDt;
uniform float uKappa;          // hold stiffness (×g), stable for this substep
uniform float uSmooth;         // φ smoothing under the hull (fraction of the explicit limit)
uniform int uApplyImpacts;     // impacts land once per frame (first substep)
uniform int uPrime;            // new tile: bodies already in the water have displaced it already
layout(location=0) out vec4 outState;
layout(location=1) out vec4 outAux;
float oceanHeight(vec2 p){
  float h = 0.0;
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount) break;
    h += textureLod(uDispArr, vec3((p + uCascOffset[c])/uSizes[c], float(c)), 0.0).y;
  }
  return h;
}
float phiAt(ivec2 c){ return texelFetch(uState, clamp(c, ivec2(0), ivec2(uN - 1)), 0).y; }
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 st = texelFetch(uState, c, 0).xy;
  vec4 aux = texelFetch(uAux, c, 0);
  vec2 xz = (vec2(c) + 0.5)*uDx;
  // Occupancy: wet solid below the open-ocean surface (never this field itself — no
  // feedback loop), and the piercing fraction χ (the body crosses that surface).
  float ref = oceanHeight(xz);
  // Band-limited (5×5 binomial, σ ≈ dx): a hull pushes water with a smooth pressure field.
  // A hard-edged footprint puts energy at the grid Nyquist, where centimetre ripples would
  // already exceed the ballistic-separation limit (A·k > 1) — numerical spray, not physics.
  float disp = 0.0, chi = 0.0;
  if (uBodyCount > 0){
    const float W[5] = float[5](1.0, 4.0, 6.0, 4.0, 1.0);
    for (int j = -2; j <= 2; j++) for (int k = -2; k <= 2; k++){
      vec2 q = xz + vec2(float(k), float(j))*uDx;
      float dq = 0.0, pq = 0.0;
      for (int i = 0; i < ${MAX_BODIES}; i++){
        if (i >= uBodyCount) break;
        mat3 R = mat3(uBodyAx[i*3], uBodyAx[i*3 + 1], uBodyAx[i*3 + 2]);
        vec2 span = bodyVerticalSpan(int(uBodyPos[i].w), uBodyPos[i].xyz, R, uBodyDims[i], q);
        if (span.x < span.y){
          dq += clamp(ref - span.x, 0.0, span.y - span.x);
          if (span.x < ref && ref < span.y) pq = 1.0;
        }
      }
      float wq = W[j + 2]*W[k + 2]/256.0;
      disp += dq*wq;
      chi += pq*wq;
    }
  }
  chi = min(chi, 1.0);
  // Continuity: the column gains exactly the solid that entered it (and loses what left).
  float d = uPrime == 1 ? 0.0 : (disp - aux.x)*uSourceGain;
  st.x += d;
  if (uApplyImpacts == 1){
    vec4 imp = texelFetch(uImpacts, c, 0);
    st.x += imp.x;
    st.y += imp.z;
    aux.y += imp.y;
  }
  // The hull's hold on the water under it.
  if (chi > 0.0){
    if (uSmooth > 0.0){
      float lap = phiAt(c + ivec2(1,0)) + phiAt(c - ivec2(1,0)) + phiAt(c + ivec2(0,1)) + phiAt(c - ivec2(0,1)) - 4.0*phiAt(c);
      st.y += 0.25*uSmooth*chi*lap;
    }
    st.y -= uDt*9.81*uKappa*chi*st.x;
  }
  aux.x = disp;
  outState = vec4(st, 0.0, 0.0);
  outAux = aux;
}
`;

/** Stockham stage on a single complex field (RG). */
export const TILE_FFT_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrc;
uniform int uN;
uniform int uStage;
uniform int uHorizontal;
uniform float uSign;
out vec4 outZ;
vec2 cmul(vec2 a, vec2 b){ return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  int i = uHorizontal == 1 ? p.x : p.y;
  int hs = uStage/2;
  int e = (i/uStage)*hs + (i % hs);
  int o = e + uN/2;
  ivec2 pe = uHorizontal == 1 ? ivec2(e, p.y) : ivec2(p.x, e);
  ivec2 po = uHorizontal == 1 ? ivec2(o, p.y) : ivec2(p.x, o);
  float ang = uSign*6.283185307179586*float(i)/float(uStage);
  vec2 w = vec2(cos(ang), sin(ang));
  vec2 a = texelFetch(uSrc, pe, 0).xy, b = texelFetch(uSrc, po, 0).xy;
  outZ = vec4(a + cmul(w, b), 0.0, 0.0);
}
`;

/** 2. Exact eWave rotation in k-space (Z = η + iφ packed). */
export const TILE_EVOLVE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${TILE_COMMON}
uniform sampler2D uSpec;
uniform float uDt;
uniform float uDepth;
uniform float uDamping;
uniform float uViscosity;
uniform float uHyper;          // spectral filter: damping rate at the grid Nyquist, ∝ (k/k_N)⁶
out vec4 outZ;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 m = ivec2((uN - p.x) % uN, (uN - p.y) % uN);
  vec2 z = texelFetch(uSpec, p, 0).xy;
  vec2 zm = texelFetch(uSpec, m, 0).xy;
  zm.y = -zm.y;                                   // conj(Z(-k))
  vec2 e = 0.5*(z + zm);                          // η̃
  vec2 f = vec2(0.5*(z.y - zm.y), -0.5*(z.x - zm.x)); // φ̃ = (Z − conj Z(−k))/2i
  float fx = float(p.x < uN/2 ? p.x : p.x - uN), fz = float(p.y < uN/2 ? p.y : p.y - uN);
  float dk = 6.283185307179586/tileSize();
  float k = length(vec2(fx, fz))*dk;
  vec2 ne = e, nf = f;
  if (k > 1e-6){
    float K = k*tanh(min(k*uDepth, 20.0));
    float gk = 9.81 + 7.28e-5*k*k;
    float w = sqrt(K*gk);
    float c = cos(w*uDt), s = sin(w*uDt);
    float kn = k*uDx/3.141592653589793;
    float kn2 = kn*kn;
    float damp = exp(-(uDamping + uViscosity*k*k + uHyper*kn2*kn2*kn2)*uDt);
    ne = (e*c + (K/w)*f*s)*damp;
    nf = (f*c - (w/K)*e*s)*damp;
  }
  // Z' = η̃' + iφ̃', with the inverse-FFT 1/N² folded in here.
  vec2 zz = vec2(ne.x - nf.y, ne.y + nf.x)/float(uN*uN);
  outZ = vec4(zz, 0.0, 0.0);
}
`;

/**
 * 3. Representability Limiter + sponge + foam. MRT: state, aux, releaseA, releaseB.
 * Mirrors limitRepresentability (sim/ewaveCpu.ts). Two events at the envelope:
 *   breaking  a crest may not stand above a neighbour by more than maxSlope·dx; the excess
 *             spills to it (volume exact) and the surface flow across the breaking edge is
 *             mixed — dissipation, not a hose (the per-step removal of a crest whose
 *             momentum stays would drain the sea through it);
 *   ballistic a surface decelerating faster than g throws its water off: that volume
 *             leaves as spray (release maps), at the speed it had.
 */
export const TILE_LIMIT_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${TILE_COMMON}
uniform sampler2D uState;
uniform sampler2D uAux;
uniform sampler2D uRelA;
uniform sampler2D uRelB;
uniform float uDt;
uniform float uMaxSlope;
uniform float uRelax;
uniform int uLimiter;
uniform float uSponge;       // width in cells
uniform float uFoamLife;
uniform vec2 uOrigin;        // tile origin (m), for release centroids in world space (low precision ok)
layout(location=0) out vec4 outState;
layout(location=1) out vec4 outAux;
layout(location=2) out vec4 outRelA;
layout(location=3) out vec4 outRelB;
float eta(ivec2 c){ c = clamp(c, ivec2(0), ivec2(uN - 1)); return texelFetch(uState, c, 0).x; }
float phi(ivec2 c){ c = clamp(c, ivec2(0), ivec2(uN - 1)); return texelFetch(uState, c, 0).y; }
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 st = texelFetch(uState, c, 0).xy;
  vec4 aux = texelFetch(uAux, c, 0);
  vec4 ra = texelFetch(uRelA, c, 0), rb = texelFetch(uRelB, c, 0);
  float e0 = st.x, p0 = st.y;
  float released = 0.0, shed = 0.0;
  float w = (e0 - aux.w)/max(uDt, 1e-4);                 // vertical surface velocity (this step)
  float wPrev = aux.z;                                    // … and the step before
  float acc = (w - wPrev)/max(uDt, 1e-4);
  // Columns a body occupies are not a free surface: the water there is flowing around the
  // hull (the bow wave outside it carries the excess), so nothing breaks or detaches there.
  bool underBody = aux.x > 0.02;
  if (uLimiter == 1 && !underBody){
    // Slopes of the free surface only: a neighbour under a hull holds water + solid (the
    // hull wall), so a crest against it is run-up on the body, not an overturning slope.
    float lo = e0, spill = 0.0, mixPhi = 0.0;
    float k = 0.25*uRelax;
    for (int q = 0; q < 4; q++){
      ivec2 o = q == 0 ? ivec2(1,0) : q == 1 ? ivec2(-1,0) : q == 2 ? ivec2(0,1) : ivec2(0,-1);
      ivec2 cn = clamp(c + o, ivec2(0), ivec2(uN - 1));
      if (texelFetch(uAux, cn, 0).x > 0.02) continue;
      vec2 sn = texelFetch(uState, cn, 0).xy;
      lo = min(lo, sn.x);
      // (1) Breaking: antisymmetric per edge, so what one cell sheds its neighbour gains.
      float d = sn.x - e0;
      float ex = abs(d) - uMaxSlope*uDx;
      if (ex > 0.0){
        spill += k*sign(d)*ex;
        mixPhi += k*(sn.y - p0);
      }
    }
    st.x = e0 + spill;
    st.y = p0 + mixPhi;
    shed = max(-spill, 0.0);
    // (2) Ballistic separation: a rising surface can decelerate no faster than gravity
    //     pulls its water back. Where the heightfield turns faster than that (a < −g:
    //     a wave steeper than A·k = 1, a column stopping under an impact jet), the water
    //     keeps going on its own — that excess leaves as a jet at the speed it had.
    //     No resolution- or artist-dependent threshold: g is the only scale.
    if (acc < -9.81 && wPrev > 0.0 && e0 > 0.0){
      float dv = (-acc - 9.81)*uDt;
      released = min(dv*uDt*uRelax, e0);
    }
    released = min(released, max(e0 - lo, 0.0) + max(e0, 0.0));
    st.x -= released;
  }
  vec2 u = vec2(phi(c + ivec2(1,0)) - phi(c - ivec2(1,0)), phi(c + ivec2(0,1)) - phi(c - ivec2(0,1)))/(2.0*uDx);
  if (released > 0.0){
    float V = released*uDx*uDx;
    vec2 xz = uOrigin + (vec2(c) + 0.5)*uDx;
    ra += vec4(V, V*max(wPrev, 0.0), V*u.x, V*u.y);
    rb += vec4(V*xz.x, V*xz.y, V*e0, 1.0);
  }
  // Foam: born where the surface was forced past its envelope and where hulls churn it.
  // Hull churn: turbulent wake entrains bubbles in proportion to how fast the water is shed.
  float churn = smoothstep(0.02, 0.2, aux.x)*smoothstep(1.5, 5.0, length(u))*0.3;
  // Bounded birth: a release whitens toward saturation instead of stacking to solid white.
  // Released water is airborne: the surface keeps only the bubbles it entrained on leaving
  // (a patchy trace), the bulk of the foam comes back with the re-entry splats.
  aux.y = aux.y*exp(-uDt/max(uFoamLife, 0.1)) + (1.0 - aux.y)*(1.0 - exp(-(released + shed)*0.5)) + churn*uDt*0.35;
  aux.y = clamp(aux.y, 0.0, 1.0);
  // Absorbing sponge: waves leave the tile instead of wrapping (FFT periodicity).
  float edge = float(min(min(c.x, uN - 1 - c.x), min(c.y, uN - 1 - c.y)));
  float sp = 1.0 - smoothstep(0.0, uSponge, edge);
  float k = exp(-sp*sp*6.0*uDt);
  st *= k;
  aux.y *= mix(1.0, k, 0.5);
  aux.z = (st.x - aux.w)/max(uDt, 1e-4);   // surface velocity after limiting → next step's wPrev
  aux.w = st.x;
  outState = vec4(st, 0.0, 0.0);
  outAux = aux;
  outRelA = ra;
  outRelB = rb;
}
`;

/**
 * 4. Render-facing output: (η, ∂η/∂x, ∂η/∂z, foam) with linear filtering. Under a body the
 * surface is held at or below the undisturbed level: the displaced water that the capacity
 * source put in those columns is on its way outward and must not cover the hull's dry side,
 * but dropping it further would bare the submerged part of the body as a dark band.
 */
export const TILE_OUTPUT_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${TILE_COMMON}
uniform sampler2D uState;
uniform sampler2D uAux;
uniform float uFade;
out vec4 outField;
float eta(ivec2 c){
  c = clamp(c, ivec2(0), ivec2(uN - 1));
  float occ = texelFetch(uAux, c, 0).x;
  float e = texelFetch(uState, c, 0).x;
  return occ > 0.02 ? min(e, 0.0) : e;
}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  float e = eta(c);
  vec2 g = vec2(eta(c + ivec2(1,0)) - eta(c - ivec2(1,0)), eta(c + ivec2(0,1)) - eta(c - ivec2(0,1)))/(2.0*uDx);
  vec4 aux = texelFetch(uAux, c, 0);
  outField = vec4(e, g, clamp(aux.y*0.75, 0.0, 1.5))*uFade;
}
`;

/** Recentre: copy with an integer cell offset (new cells start at rest). */
export const TILE_SHIFT_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrc;
uniform ivec2 uShift;
uniform int uN;
out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy) + uShift;
  if (c.x < 0 || c.y < 0 || c.x >= uN || c.y >= uN){ o = vec4(0.0); return; }
  o = texelFetch(uSrc, c, 0);
}
`;

/** Reduction of the (extensive) release maps: each output texel sums a block → exact totals. */
export const TILE_REDUCE_REL_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uRelA;
uniform sampler2D uRelB;
uniform int uBlock;
layout(location=0) out vec4 outA;
layout(location=1) out vec4 outB;
void main(){
  ivec2 o = ivec2(gl_FragCoord.xy)*uBlock;
  vec4 a = vec4(0.0), b = vec4(0.0);
  for (int j = 0; j < 32; j++){
    if (j >= uBlock) break;
    for (int i = 0; i < 32; i++){
      if (i >= uBlock) break;
      ivec2 p = o + ivec2(i, j);
      a += texelFetch(uRelA, p, 0);
      b += texelFetch(uRelB, p, 0);
    }
  }
  outA = a; outB = b;
}
`;

/** Block-mean surface for the CPU buoyancy query grid: (η, φ, foam, -). */
export const TILE_REDUCE_ETA_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uState;
uniform sampler2D uAux;
uniform int uBlock;
out vec4 outEta;
void main(){
  ivec2 o = ivec2(gl_FragCoord.xy)*uBlock;
  vec4 e = vec4(0.0);
  for (int j = 0; j < 16; j++){
    if (j >= uBlock) break;
    for (int i = 0; i < 16; i++){
      if (i >= uBlock) break;
      ivec2 p = o + ivec2(i, j);
      e += vec4(texelFetch(uState, p, 0).xy, texelFetch(uAux, p, 0).y, 0.0);
    }
  }
  outEta = e/float(uBlock*uBlock);
}
`;

/** Gaussian splats for impacts (clicks, spray re-entry): additive point sprites. */
export const SPLAT_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec4 aSplat;   // tile-local x, z (m), radius (m), dEta
layout(location=1) in vec4 aExtra;   // dFoam, dPhi, exact, -
uniform float uTileSize;
uniform float uN;
out vec4 vData;
void main(){
  vec2 ndc = aSplat.xy/uTileSize*2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = max(2.0, aSplat.z/uTileSize*uN*4.0);
  // Normalise so the splat deposits exactly dEta·(πr²) of volume regardless of size.
  vData = vec4(aSplat.w, aExtra.x, aExtra.y, aExtra.z);
}
`;
export const SPLAT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vData;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float g = exp(-4.0*r2);
  // A crater-and-rim profile for negative dEta impacts (drop pushes water out to a ring);
  // exact splats (water handed to the fluid) stay Gaussian so the volume removed is dEta·πr².
  float shape = vData.x < 0.0 && vData.w < 0.5 ? g - 0.55*exp(-4.0*(sqrt(r2) - 0.6)*(sqrt(r2) - 0.6)*8.0) : g;
  o = vec4(vData.x*shape, vData.y*g, vData.z*g, 0.0);
}
`;

/**
 * 6. The free surface around each followed body (two-way coupling): least-squares sums for
 * the plane η ≈ a + b·x + c·z over the open cells at its waterline (no occupancy, with an
 * occupied neighbour, within uReach[i] of the body centre). One fragment per body; MRT of
 * three RGBA sums: (n, Σx, Σz, Σx²), (Σxz, Σz², Ση, Σxη), (Σzη, -, -, -). Mirrors
 * CarpetCpu.ringPlane (sim/carpetCpu.ts).
 */
export const TILE_RING_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${TILE_COMMON}
uniform sampler2D uState;
uniform sampler2D uAux;
uniform int uBodyCount;
uniform vec3 uCenter[${MAX_BODIES}];   // tile-local x, z (m), reach (m)
uniform float uRingOcc;
layout(location=0) out vec4 outA;
layout(location=1) out vec4 outB;
layout(location=2) out vec4 outC;
bool held(ivec2 c){ return texelFetch(uAux, clamp(c, ivec2(0), ivec2(uN - 1)), 0).x > uRingOcc; }
void main(){
  int i = int(gl_FragCoord.x);
  outA = vec4(0.0); outB = vec4(0.0); outC = vec4(0.0);
  if (i >= uBodyCount) return;
  vec3 b = uCenter[i];
  ivec2 lo = clamp(ivec2(floor((b.xy - b.z)/uDx)), ivec2(1), ivec2(uN - 2));
  ivec2 hi = clamp(ivec2(ceil((b.xy + b.z)/uDx)), ivec2(1), ivec2(uN - 2));
  float s1 = 0.0, sx = 0.0, sz = 0.0, sxx = 0.0, sxz = 0.0, szz = 0.0, se = 0.0, sxe = 0.0, sze = 0.0;
  for (int j = 0; j < 128; j++){
    int cy = lo.y + j;
    if (cy > hi.y) break;
    for (int k = 0; k < 128; k++){
      int cx = lo.x + k;
      if (cx > hi.x) break;
      ivec2 c = ivec2(cx, cy);
      if (held(c)) continue;
      if (!(held(c + ivec2(1,0)) || held(c - ivec2(1,0)) || held(c + ivec2(0,1)) || held(c - ivec2(0,1)))) continue;
      vec2 d = (vec2(c) + 0.5)*uDx - b.xy;
      if (dot(d, d) > b.z*b.z) continue;
      float e = texelFetch(uState, c, 0).x;
      s1 += 1.0; sx += d.x; sz += d.y; sxx += d.x*d.x; sxz += d.x*d.y; szz += d.y*d.y;
      se += e; sxe += d.x*e; sze += d.y*e;
    }
  }
  outA = vec4(s1, sx, sz, sxx);
  outB = vec4(sxz, szz, se, sxe);
  outC = vec4(sze, 0.0, 0.0, 0.0);
}
`;
