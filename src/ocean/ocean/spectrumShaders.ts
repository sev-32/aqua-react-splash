/**
 * GLSL for the spectral (T0) ocean: h0 generation, time evolution, Stockham
 * FFT over a cascade atlas, resolve into per-cascade mipmapped textures, and
 * cascade-space whitecap foam.
 *
 * Atlas layout: width = C·N, height = N. Texel (c·N + ix, iz) is mode (ix, iz)
 * of cascade c in FFT order (no centring, no (-1)^(x+y) sign fix needed).
 */

export const MAX_SYSTEMS = 8;
export const MAX_CASCADES = 4;

export const SPECTRUM_PHYSICS_GLSL = /* glsl */ `
#define G 9.81
#define PI 3.14159265358979
#define SIGMA_RHO 7.28e-5
uniform float uDepth;
uniform sampler2D uSpreadLut;      // N(s), s = 128·u²
uniform vec4 uSys0[${MAX_SYSTEMS}];  // alphaG2·weight, wp, gamma, dirRad
uniform vec4 uSys1[${MAX_SYSTEMS}];  // spread, elongation, floor, isWind
uniform vec4 uSys2[${MAX_SYSTEMS}];  // u10
uniform int uSysCount;

float dispersionW(float k){
  float kd = min(k*uDepth, 20.0);
  return sqrt((G*k + SIGMA_RHO*k*k*k)*tanh(kd));
}
float groupV(float k){
  float kd = min(k*uDepth, 20.0);
  float th = tanh(kd);
  float a = G*k + SIGMA_RHO*k*k*k;
  float da = G + 3.0*SIGMA_RHO*k*k;
  float w = sqrt(max(a*th, 1e-12));
  return (da*th + a*uDepth*(1.0 - th*th)) / (2.0*w);
}
float tma(float w){
  float wh = w*sqrt(uDepth/G);
  if (wh <= 1.0) return 0.5*wh*wh;
  if (wh < 2.0) return 1.0 - 0.5*(2.0 - wh)*(2.0 - wh);
  return 1.0;
}
float jonswapShape(float w, float wp, float gam){
  if (w <= 1e-4) return 0.0;
  float sig = w <= wp ? 0.07 : 0.09;
  float r = exp(-((w - wp)*(w - wp))/(2.0*sig*sig*wp*wp));
  float q = wp/w; q = q*q; q = q*q;
  return pow(w, -5.0)*exp(-1.25*q)*pow(gam, r);
}
float spreadNorm(float s){
  float u = sqrt(clamp(s/128.0, 0.0, 1.0))*255.0;
  int i0 = int(floor(u)); int i1 = min(i0 + 1, 255);
  return mix(texelFetch(uSpreadLut, ivec2(i0,0), 0).r, texelFetch(uSpreadLut, ivec2(i1,0), 0).r, fract(u));
}
float systemE(int i, float w, float theta){
  vec4 a = uSys0[i], b = uSys1[i];
  float S = a.x*jonswapShape(w, a.y, a.z)*tma(w);
  if (S <= 0.0) return 0.0;
  float s;
  if (b.w > 0.5){
    float sp = 11.5*pow(G/max(a.y*max(uSys2[i].x, 0.5), 1e-6), 2.5);
    float r = w/a.y;
    s = (r <= 1.0 ? sp*pow(r, 5.0) : sp*pow(r, -2.5))*b.x;
  } else s = b.x;
  s += 16.0*tanh(a.y/max(w, 1e-6))*b.y*b.y;
  s = clamp(s, 0.05, 120.0);
  float d = theta - a.w;
  d = atan(sin(d), cos(d));
  float D = spreadNorm(s)*pow(abs(cos(0.5*d)), 2.0*s);
  return S*((1.0 - b.z)*D + b.z/(2.0*PI));
}
float spectrumE(vec2 k){
  float kl = length(k);
  if (kl < 1e-6) return 0.0;
  float w = dispersionW(kl);
  float cg = groupV(kl);
  float th = atan(k.y, k.x);
  float e = 0.0;
  for (int i = 0; i < ${MAX_SYSTEMS}; i++){ if (i >= uSysCount) break; e += systemE(i, w, th); }
  return e*cg/kl;
}
`;

const ATLAS_COMMON = /* glsl */ `
uniform int uN;
uniform float uSizes[${MAX_CASCADES}];
uniform float uKLo[${MAX_CASCADES}];
uniform float uKHi[${MAX_CASCADES}];
int freq(int i){ return i < uN/2 ? i : i - uN; }
vec2 modeK(int c, int ix, int iz){ return vec2(float(freq(ix)), float(freq(iz)))*(2.0*PI/uSizes[c]); }
bool inBand(int c, int ix, int iz){
  if (ix == uN/2 || iz == uN/2 || (ix == 0 && iz == 0)) return false;
  float k = length(modeK(c, ix, iz));
  return k >= uKLo[c] && k < uKHi[c];
}
`;

export const H0_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${SPECTRUM_PHYSICS_GLSL}
${ATLAS_COMMON}
uniform sampler2D uNoise;   // RG32F atlas: ξ(k) = (g1 + i g2)/√2
out vec4 outH0;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  int c = p.x / uN, ix = p.x - c*uN, iz = p.y;
  if (!inBand(c, ix, iz)){ outH0 = vec4(0.0); return; }
  float dk = 2.0*PI/uSizes[c];
  vec2 k = modeK(c, ix, iz);
  float ap = sqrt(max(spectrumE(k), 0.0)*dk*dk*0.5);
  float am = sqrt(max(spectrumE(-k), 0.0)*dk*dk*0.5);
  int mx = (uN - ix) % uN, mz = (uN - iz) % uN;
  vec2 np = texelFetch(uNoise, ivec2(c*uN + ix, iz), 0).rg;
  vec2 nm = texelFetch(uNoise, ivec2(c*uN + mx, mz), 0).rg;
  // (h0(k), conj(h0(-k)))
  outH0 = vec4(np*ap, nm.x*am, -nm.y*am);
}
`;

/**
 * Cascade-family spectrum (POSEIDON R6.4/R7 look authority). One lobe per
 * primary/secondary system; cascade c's family lives in uFam*[c]. CPU twin:
 * spectrum/families.ts familyEnergy().
 */
export const FAMILY_GLSL = /* glsl */ `
uniform vec4 uFam0[${MAX_CASCADES}];  // A, windSpeed, dir.x, dir.z
uniform vec4 uFam1[${MAX_CASCADES}];  // alignment, kp, peakEnhancement, bandwidth
uniform vec4 uFam2[${MAX_CASCADES}];  // floor, secondary A, secondary dir.x, dir.z
uniform vec4 uFam3[${MAX_CASCADES}];  // secondary alignment, kp, bandwidth, -
float famPeak(float k, float kp, float bw){ float x = log(max(k, 1e-6)/max(kp, 1e-6)); return exp(-0.5*x*x/max(bw*bw, 0.0025)); }
float famDir(vec2 kh, vec2 d, float a, float f){ return max(f, pow(max(dot(kh, d), 0.0), max(a, 0.01))); }
float famLobe(vec2 k, float A, float ws, vec2 d, float al, float kp, float pe, float bw, float fl){
  float k2 = dot(k, k);
  if (k2 < 1e-12 || A <= 0.0) return 0.0;
  float kl = sqrt(k2), L = max(ws*ws/G, 0.1);
  float base = (A/(k2*k2))*exp(-1.0/max(k2*L*L, 1e-8))*0.5;
  return max(base*exp(-k2*0.00016)*(1.0 + pe*famPeak(kl, kp, bw))*famDir(k/kl, d, al, fl), 0.0);
}
float familyEnergy(int c, vec2 k){
  vec4 a = uFam0[c], b = uFam1[c], s = uFam2[c], t = uFam3[c];
  float e = famLobe(k, a.x, a.y, a.zw, b.x, b.y, b.z, b.w, s.x);
  if (s.y > 0.0) e += famLobe(k, s.y, a.y, s.zw, t.x, t.y, b.z*0.75, t.z, s.x*0.7);
  return e;
}
`;

/** h0 for the family spectrum: amplitude √(2·energy) on unit-variance complex noise (POSEIDON's draw variance). */
export const H0_FAMILY_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
#define G 9.81
#define PI 3.14159265358979
${FAMILY_GLSL}
${ATLAS_COMMON}
uniform sampler2D uNoise;
out vec4 outH0;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  int c = p.x / uN, ix = p.x - c*uN, iz = p.y;
  if (!inBand(c, ix, iz)){ outH0 = vec4(0.0); return; }
  vec2 k = modeK(c, ix, iz);
  float ap = sqrt(2.0*familyEnergy(c, k));
  // conj(h0(−k)): the −k mode's own band test (bands are radial, so it shares ours)
  float am = sqrt(2.0*familyEnergy(c, -k));
  int mx = (uN - ix) % uN, mz = (uN - iz) % uN;
  vec2 np = texelFetch(uNoise, ivec2(c*uN + ix, iz), 0).rg;
  vec2 nm = texelFetch(uNoise, ivec2(c*uN + mx, mz), 0).rg;
  outH0 = vec4(np*ap, nm.x*am, -nm.y*am);
}
`;

/** Time evolution + packing of 8 real fields into 4 complex slots (2 MRT). */
export const EVOLVE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
#define PI 3.14159265358979
#define G 9.81
#define SIGMA_RHO 7.28e-5
${ATLAS_COMMON}
uniform sampler2D uH0;
uniform float uTime;
uniform float uDepth;
uniform float uLoopPeriod;   // >0 quantises ω so the ocean loops seamlessly (film plates)
layout(location=0) out vec4 outA;  // (Dx + i h, Dz + i Dxz)
layout(location=1) out vec4 outB;  // (Sx + i Sz, Dxx + i Dzz)
vec2 cmul(vec2 a, vec2 b){ return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 mulI(vec2 a){ return vec2(-a.y, a.x); }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  int c = p.x / uN, ix = p.x - c*uN, iz = p.y;
  vec4 h0 = texelFetch(uH0, p, 0);
  vec2 k = modeK(c, ix, iz);
  float kl = length(k);
  if (kl < 1e-6 || dot(h0, h0) == 0.0){ outA = vec4(0.0); outB = vec4(0.0); return; }
  float w = sqrt((G*kl + SIGMA_RHO*kl*kl*kl)*tanh(min(kl*uDepth, 20.0)));
  if (uLoopPeriod > 0.0){ float w0 = 2.0*PI/uLoopPeriod; w = max(floor(w/w0 + 0.5), 1.0)*w0; }
  float ph = w*uTime;
  vec2 e = vec2(cos(ph), sin(ph));
  // ĥ = h0 e^{-iωt} + conj(h0(-k)) e^{+iωt}
  vec2 h = cmul(h0.xy, vec2(e.x, -e.y)) + cmul(h0.zw, e);
  vec2 ih = mulI(h);
  vec2 Dx = ih*(k.x/kl), Dz = ih*(k.y/kl);
  vec2 Sx = ih*k.x, Sz = ih*k.y;
  vec2 Dxx = -h*(k.x*k.x/kl), Dzz = -h*(k.y*k.y/kl), Dxz = -h*(k.x*k.y/kl);
  outA = vec4(Dx + mulI(h), Dz + mulI(Dxz));
  outB = vec4(Sx + mulI(Sz), Dxx + mulI(Dzz));
}
`;

/** One Stockham stage over the atlas. Horizontal passes stay within a cascade's N columns. */
export const FFT_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrcA;
uniform sampler2D uSrcB;
uniform int uN;
uniform int uStage;       // sub-transform size S = 2,4,…,N
uniform int uHorizontal;
uniform float uSign;      // -1 forward, +1 inverse
layout(location=0) out vec4 outA;
layout(location=1) out vec4 outB;
vec2 cmul(vec2 a, vec2 b){ return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  int i = uHorizontal == 1 ? p.x % uN : p.y;
  int base = uHorizontal == 1 ? p.x - i : 0;
  int hs = uStage/2;
  int e = (i/uStage)*hs + (i % hs);
  int o = e + uN/2;
  ivec2 pe = uHorizontal == 1 ? ivec2(base + e, p.y) : ivec2(p.x, e);
  ivec2 po = uHorizontal == 1 ? ivec2(base + o, p.y) : ivec2(p.x, o);
  float ang = uSign*6.283185307179586*float(i)/float(uStage);
  vec2 w = vec2(cos(ang), sin(ang));
  vec4 ea = texelFetch(uSrcA, pe, 0), oa = texelFetch(uSrcA, po, 0);
  vec4 eb = texelFetch(uSrcB, pe, 0), ob = texelFetch(uSrcB, po, 0);
  outA = vec4(ea.xy + cmul(w, oa.xy), ea.zw + cmul(w, oa.zw));
  outB = vec4(eb.xy + cmul(w, ob.xy), eb.zw + cmul(w, ob.zw));
}
`;

/** Extract cascade c from the atlas into its own (mipmappable, REPEAT) textures, applying choppiness λ. */
export const RESOLVE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrcA;
uniform sampler2D uSrcB;
uniform int uN;
uniform int uCascade;
uniform float uChopC[${MAX_CASCADES}];   // λ per cascade (family crop)
layout(location=0) out vec4 outDisp;   // λDx, h, λDz, λDxz
layout(location=1) out vec4 outDeriv;  // Sx, Sz, λDxx, λDzz
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 q = ivec2(uCascade*uN + p.x, p.y);
  vec4 a = texelFetch(uSrcA, q, 0), b = texelFetch(uSrcB, q, 0);
  float uChop = uChopC[uCascade];
  outDisp = vec4(a.x*uChop, a.y, a.z*uChop, a.w*uChop);
  outDeriv = vec4(b.x, b.y, b.z*uChop, b.w*uChop);
}
`;

/**
 * Cascade-space whitecap foam with extensive storage (Foam Foundry lesson):
 *   r = mass m, g = m·age, b = entrained air (fresh bubbles), a = coverage proxy.
 * Foam is stationary in world space while crests move on — a breaking crest
 * leaves its patch behind, exactly like the real sea.
 */
export const FOAM_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uPrev;
uniform sampler2DArray uDeriv;
uniform sampler2DArray uDisp;
uniform float uLayer;
uniform float uDt;
uniform float uFoldStart;   // J below this starts to foam
uniform float uFoldFull;    // J at which birth saturates
uniform float uBirth;       // birth rate (whitecap coverage gain)
uniform float uLife;        // e-folding lifetime of foam mass (s)
uniform float uAirLife;     // bubble lifetime (s)
uniform float uSpread;      // lateral diffusion
uniform float uTexel;
uniform vec2 uDrift;        // wind + Stokes drift in uv/s (foam moves slower than the crests)
uniform vec2 uWindDir;      // unit, uv space
uniform float uStreak;      // along-wind stretching (Bft 7+ foam streaks)
out vec4 outFoam;
void main(){
  vec2 uv = gl_FragCoord.xy*uTexel;
  vec2 src = uv - uDrift*uDt;                      // semi-Lagrangian drift (periodic tile)
  #define P(q) textureLod(uPrev, vec3(q, uLayer), 0.0)
  vec4 f = P(src);
  vec2 a = uWindDir*uTexel*(1.0 + 2.5*uStreak), b = vec2(-uWindDir.y, uWindDir.x)*uTexel;
  vec4 along = P(src + a) + P(src - a);
  vec4 across = P(src + b) + P(src - b);
  // Anisotropic diffusion: extensive quantities blur as a whole, so age/mass stay consistent.
  vec4 n = mix(0.5*(along + across), along, clamp(uStreak, 0.0, 0.85));
  f.rgb = mix(f.rgb, n.rgb*0.5, clamp(uSpread*uDt, 0.0, 0.25));
  vec4 d = textureLod(uDeriv, vec3(uv, uLayer), 0.0);
  float dxz = textureLod(uDisp, vec3(uv, uLayer), 0.0).w;
  float J = (1.0 + d.z)*(1.0 + d.w) - dxz*dxz;
  float fold = smoothstep(uFoldStart, uFoldFull, 1.0 - J);
  float m = max(f.r, 0.0), A = max(f.g, 0.0), air = max(f.b, 0.0);
  // older foam erodes faster (drainage + coarsening)
  float age = A/max(m, 1e-4);
  float decay = exp(-uDt/uLife*(0.6 + 0.8*smoothstep(0.3*uLife, 1.5*uLife, age)));
  float birth = uBirth*fold*uDt;
  m = m*decay + birth;
  A = A*decay + m*uDt;
  air = air*exp(-uDt/uAirLife) + birth*1.6;
  if (m < 1e-4){ m = 0.0; A = 0.0; }
  // alpha = rendered-coverage proxy; its 1×1 mip is the whitecap fraction the
  // Monahan controller calibrates against.
  outFoam = vec4(min(m, 2.0), min(A, 120.0), min(air, 2.0), smoothstep(0.03, 0.4, m));
}
`;
