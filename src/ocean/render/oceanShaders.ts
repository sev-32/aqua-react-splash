/**
 * Ocean surface shaders.
 *
 * Geometry: CDLOD patch → morph → Σ cascade displacement (mip chosen from
 * vertex spacing = geometric low-pass) → + JIT interaction tiles (T3)
 * → + shore field (T2) → earth curvature.
 *
 * Shading (one continuous model from 0.2 m to the horizon — R9's LOD lanes,
 * generalised): filtered cascade normals + slope variance of everything the
 * pixel cannot resolve (spectral LUT, Cox–Munk tail) → Fresnel sky reflection
 * at a roughness-matched env mip, anisotropic-Gaussian sun glitter,
 * Gordon-model upwelling body colour, crest transmission, whitecap foam with
 * R9's polarity-correct aging micro-structure, and aerial perspective.
 */
import { SKY_COMMON_GLSL } from './sky';

export const MAX_TILES = 4;
export const MAX_LEVELS = 16;
// Sampler budget: the fragment stage binds 14 units (cascade arrays ×3, tile array,
// shore ×2, terrain ×2, env, slope LUT, tier map, scene colour/depth, cloud shadow) — inside the 16-unit floor.

export const OCEAN_COMMON_GLSL = /* glsl */ `
#define PI 3.14159265358979
${SKY_COMMON_GLSL}
precision highp sampler2DArray;
uniform int uCascadeCount;
uniform float uSizes[4];
uniform vec2 uCamOffset[4];      // fract(camXZ/L)·L, computed in double on the CPU
uniform sampler2DArray uDispArr;   // layer = cascade: (λDx, h, λDz, λDxz)
uniform sampler2DArray uDerivArr;  // layer = cascade: (Sx, Sz, λDxx, λDzz)
uniform float uTexN;              // cascade texture resolution

// ── T3 interaction tiles (eWave): rect = (relMinX, relMinZ, size, layer)
uniform int uTileCount;
uniform vec4 uTileRect[${MAX_TILES}];
uniform sampler2DArray uTileArr;  // (η, ∂η/∂x, ∂η/∂z, foam) — fade pre-applied

// ── T2 shore field (shallow water): rect = (relMinX, relMinZ, size, fade)
uniform vec4 uShoreRect;
uniform sampler2D uShoreSurf;    // (η + lip lift, slopeX, slopeZ, water depth h)
uniform sampler2D uShoreAux;     // (foam cover, breaking E, lip+chop dx, dz)

// ── T1 depth-limited shoaling outside the solver tile (terrain heights)
uniform int uTerrainOn;
uniform sampler2D uTFine;  uniform vec3 uTFineRect;    // camera-relative min, size
uniform sampler2D uTCoarse; uniform vec3 uTCoarseRect;
float bedAt(vec2 rel){
  if (uTerrainOn == 0) return -1e4;
  vec2 uf = (rel - uTFineRect.xy)/uTFineRect.z;
  if (all(greaterThan(uf, vec2(0.0))) && all(lessThan(uf, vec2(1.0)))) return textureLod(uTFine, uf, 0.0).r;
  vec2 uc = (rel - uTCoarseRect.xy)/uTCoarseRect.z;
  if (all(greaterThan(uc, vec2(0.0))) && all(lessThan(uc, vec2(1.0)))) return textureLod(uTCoarse, uc, 0.0).r;
  return -1e4;
}

vec2 cascadeUv(vec2 rel, int c){ return (rel + uCamOffset[c])/uSizes[c]; }

float tileWeight(vec2 rel, vec4 r, out vec2 uv){
  uv = (rel - r.xy)/r.z;
  vec2 e = min(uv, 1.0 - uv);
  float w = smoothstep(0.0, 0.12, min(e.x, e.y));
  return w*step(0.0, min(e.x, e.y));
}

/** How much of the open-ocean spectrum survives at this point of the shore field (0 on the beach). */
float shoreOpenOcean(vec2 rel, out vec2 suv, out float inside){
  inside = 0.0; suv = vec2(0.0);
  if (uShoreRect.w <= 0.0) return 1.0;
  suv = (rel - uShoreRect.xy)/uShoreRect.z;
  vec2 e = min(suv, 1.0 - suv);
  inside = smoothstep(0.0, 0.08, min(e.x, e.y))*step(0.0, min(e.x, e.y))*uShoreRect.w;
  return 1.0 - inside;
}
`;

export const OCEAN_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${OCEAN_COMMON_GLSL}
layout(location=0) in vec2 aGrid;
layout(location=1) in vec4 aNode;   // relX, relZ, size, level
uniform mat4 uViewProj;
uniform float uCamHeight;
uniform float uP;
uniform vec2 uMorph[${MAX_LEVELS}];
uniform float uEarthRadius;
uniform float uGeoLodBias;
uniform float uSigHeightV;
out vec3 vRel;       // camera-relative displaced position
out vec2 vParam;     // camera-relative undisplaced (parameter) position
out float vSpacing;
out float vLevel;
out float vMorph;
out float vHeight;   // η (m) for crest effects
out vec4 vShore;     // x: shore weight, y: water depth, z: foam, w: breaking
out float vOpen;     // open-ocean spectrum weight after shore blending and T1 shoaling
void main(){
  int level = int(aNode.w);
  float spacing = aNode.z/uP;
  vec2 rel = aNode.xy + aGrid*spacing;
  float dist = length(vec3(rel.x, -uCamHeight, rel.y));
  vec2 m = uMorph[level];
  float k = clamp((dist - m.x)/max(m.y - m.x, 1e-3), 0.0, 1.0);
  vec2 g = aGrid - fract(aGrid*0.5)*2.0*k;
  rel = aNode.xy + g*spacing;
  float effSpacing = spacing*(1.0 + k);

  vec2 suv; float inside;
  float open = shoreOpenOcean(rel, suv, inside);
  // T1: outside the solver tile, depth-limited breaking caps the open-ocean spectrum
  // (H ≤ γ·d). A shader-level approximation by design; wet/dry truth lives in T2.
  float bedV = bedAt(rel);
  float depthV = max(-bedV, 0.0);
  float shoal = clamp(depthV/(1.3*uSigHeightV + 0.4), 0.0, 1.0);
  shoal = mix(0.12, 1.0, shoal*shoal*(3.0 - 2.0*shoal));
  open *= mix(1.0, shoal, 1.0 - inside);
  vOpen = open;
  vec3 d = vec3(0.0);
  // Inside the shore field, only the chop the shallow solver cannot carry survives.
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount) break;
    float lod = max(log2(effSpacing/(uSizes[c]/uTexN)) + uGeoLodBias, 0.0);
    vec4 s = textureLod(uDispArr, vec3(cascadeUv(rel, c), float(c)), lod);
    float keep = c == uCascadeCount - 1 ? mix(1.0, 0.35, inside)*mix(1.0, shoal, 0.6) : open;
    d += s.xyz*keep;
  }
  // T3 interaction tiles (linear superposition of dispersive local fields).
  for (int t = 0; t < ${MAX_TILES}; t++){
    if (t >= uTileCount) break;
    vec2 tuv; float w = tileWeight(rel, uTileRect[t], tuv);
    if (w > 0.0) d.y += w*textureLod(uTileArr, vec3(tuv, uTileRect[t].w), 0.0).x;
  }
  vShore = vec4(0.0);
  if (inside > 0.0){
    vec4 s = textureLod(uShoreSurf, suv, 0.0);
    vec4 a = textureLod(uShoreAux, suv, 0.0);
    // Shallow-water surface replaces the open-ocean mean surface; the overturning lip
    // (WaveLab ballistic sheet) arrives pre-computed as a horizontal offset + lift in η.
    d.y += s.x*inside;
    d.xz += a.zw*inside;                 // overturning lip + crest sharpening
    vShore = vec4(inside, s.w, a.x, a.y);
  }
  vec3 p = vec3(rel.x + d.x, d.y - uCamHeight, rel.y + d.z);
  if (uEarthRadius > 0.0) p.y -= dot(p.xz, p.xz)/(2.0*uEarthRadius);
  vRel = p;
  vParam = rel;
  vSpacing = effSpacing;
  vLevel = float(level);
  vMorph = k;
  vHeight = d.y;
  gl_Position = uViewProj*vec4(p, 1.0);
}
`;

export const OCEAN_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${OCEAN_COMMON_GLSL}
in vec3 vRel;
in vec2 vParam;
in float vSpacing;
in float vLevel;
in float vMorph;
in float vHeight;
in vec4 vShore;
in float vOpen;
out vec4 outColor;

uniform float uCamHeight;
uniform sampler2D uEnv;
uniform float uEnvLevels;
uniform vec3 uSunDir;
uniform vec3 uSunE;            // direct sun irradiance (perpendicular), HDR
uniform vec3 uSkyE;            // diffuse sky irradiance on a horizontal plane
uniform sampler2D uSlopeLut;
uniform float uLogKMin, uLogKMax;
uniform float uRoughnessGain;
uniform float uIor;
uniform vec3 uAbsorb;          // a (1/m)
uniform vec3 uBackscatter;     // b_b (1/m)
uniform vec3 uScatter;         // b (1/m) — total scattering for transmittance
uniform float uSss;            // crest transmission strength
uniform float uSigHeight;      // Hs (m) for crest normalisation
uniform float uGlitter;
uniform float uFogDensity;
uniform float uTime;
uniform int uDebug;
uniform float uFoamGain;
uniform float uFoamLife;
uniform sampler2DArray uFoamArr;  // layer = cascade: (mass, mass·age, air, coverage)
uniform sampler2D uShoreExtra;  // (wetness, bubbles, foam-on-sand, age)
uniform sampler2D uTierMap;     // scheduler tier overlay (debug)
// Weather (Nimbus lighting authority): cloud-shadow map + rain
uniform sampler2D uCloudShadow;  // sun transmittance through the deck (R)
uniform vec4 uCloudRect;         // rel minX, minZ, size, strength
uniform float uRain;             // 0..1
vec3 gSunE;                      // sun irradiance after cloud shadowing (set in main)
uniform vec4 uTierRect;         // rel minX, minZ, size, 1
// Screen-space refraction (scene behind the water: terrain, hulls)
uniform sampler2D uSceneColor;
uniform sampler2D uSceneDepth;
uniform int uHasScene;
uniform vec2 uViewport;
uniform float uNear, uFar;

float sat(float x){ return clamp(x, 0.0, 1.0); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz)*p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.61, 1.18, -1.18, 1.61);
  for (int i = 0; i < 4; i++){ v += a*vnoise(p); p = m*p + vec2(7.1, -3.4); a *= 0.5; } return v; }

float fresnelDielectric(float ci, float n1, float n2){
  float c = clamp(ci, 0.0, 1.0);
  float st = n1/n2*sqrt(max(0.0, 1.0 - c*c));
  if (st >= 1.0) return 1.0;
  float ct = sqrt(max(0.0, 1.0 - st*st));
  float rs = (n1*c - n2*ct)/(n1*c + n2*ct);
  float rp = (n2*c - n1*ct)/(n2*c + n1*ct);
  return 0.5*(rs*rs + rp*rp);
}
vec3 envLod(vec3 d, float lod){ return textureLod(uEnv, dirToEquirect(d), clamp(lod, 0.0, uEnvLevels - 1.0)).rgb; }

vec4 slopeMoments(float footprint){
  float kc = PI/max(footprint, 1e-4);
  float u = clamp((log(kc) - uLogKMin)/max(uLogKMax - uLogKMin, 1e-6), 0.0, 1.0)*255.0;
  int i0 = int(floor(u)); int i1 = min(i0 + 1, 255);
  return mix(texelFetch(uSlopeLut, ivec2(i0, 0), 0), texelFetch(uSlopeLut, ivec2(i1, 0), 0), fract(u))*uRoughnessGain;
}
float smithG1(float NoX, float a){ float a2 = a*a, b = NoX*NoX; return 2.0*NoX/(NoX + sqrt(max(a2 + (1.0 - a2)*b, 1e-8))); }

/** R9 glitter: anisotropic Gaussian slope NDF around the filtered mean slope. */
vec3 sunGlitter(vec3 n, vec3 V, vec4 mom){
  vec3 L = uSunDir;
  float NoV = max(dot(n, V), 1e-4), NoL = max(dot(n, L), 0.0);
  if (NoL <= 0.0 || L.y <= 0.0) return vec3(0.0);
  vec3 H = normalize(V + L);
  if (H.y <= 0.02) return vec3(0.0);
  vec2 mean = -n.xz/max(n.y, 0.04), req = -H.xz/max(H.y, 0.04), d = req - mean;
  float a = mom.x + 2e-5, b = mom.z, c = mom.y + 2e-5;
  float det = max(a*c - b*b, 1e-10);
  float q = (c*d.x*d.x - 2.0*b*d.x*d.y + a*d.y*d.y)/det;
  float P = exp(-0.5*q)/(2.0*PI*sqrt(det));
  float D = P/pow(max(H.y, 0.06), 4.0);
  float al = sqrt(max(0.5*(a + c), 1e-6));
  float Gm = smithG1(NoV, al)*smithG1(NoL, al);
  float F = fresnelDielectric(max(dot(V, H), 0.0), 1.0, uIor);
  return gSunE*uGlitter*min(F*D*Gm/(4.0*NoV), 400.0);
}

/** Gordon et al. irradiance reflectance: R = 0.0949u + 0.0794u², u = b_b/(a + b_b). */
vec3 upwelling(float Fsun){
  vec3 u = uBackscatter/(uAbsorb + uBackscatter);
  vec3 R = 0.0949*u + 0.0794*u*u;
  float mu = max(uSunDir.y, 0.0);
  vec3 Ed = (gSunE*mu*(1.0 - Fsun) + uSkyE*0.93);
  return R*Ed/PI;
}

/**
 * Rain on the sea: every drop launches a capillary ring (radius grows ~0.35 m/s,
 * ~4 cm wavelength, e-folding in ~0.3 s). Two cell layers, cadence set by the
 * rain rate. Returns the slope (∂η/∂x, ∂η/∂z); beyond what pixels can resolve
 * the caller turns rain into roughness instead.
 */
vec2 rainRipples(vec2 p, float t, float rain){
  vec2 g = vec2(0.0);
  float period = 1.6/(0.25 + 1.75*rain);
  for (int layer = 0; layer < 2; layer++){
    float sc = layer == 0 ? 0.5 : 0.31;
    vec2 q = p/sc + float(layer)*vec2(17.3, 9.1);
    vec2 cell = floor(q);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
      vec2 c = cell + vec2(float(i), float(j));
      vec2 hc = h22(c + float(layer)*31.7);
      if (hc.x > 0.35 + 0.65*rain) continue;          // sparse drops in light rain
      float age = fract(t/period + hc.y)*period;
      vec2 d = (q - c - h22(c + 5.3))*sc;
      float r = length(d);
      float x = r - 0.35*age;
      float env = exp(-age*3.4)*smoothstep(0.0, 0.03, age)*exp(-x*x/0.0012);
      float dh = -0.012*157.0*sin(157.0*x)*env;         // k = 2π/4 cm
      g += dh*d/max(r, 1e-3);
    }
  }
  return g;
}

// ── foam micro-structure (POSEIDON R6.4.5 polarity-correct aging, compacted) ──
vec2 voronoiF12(vec2 x){
  vec2 n = floor(x), f = fract(x); float f1 = 8.0, f2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j)), r = g + h22(n + g) - f; float d = dot(r, r);
    if (d < f1){ f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return sqrt(vec2(f1, f2));
}
float aaStep(float e0, float e1, float x){ float w = fwidth(x); return smoothstep(e0 - w, e1 + w, x); }
float foamTopology(vec2 q, float mass, float age01, float footprint){
  // Fresh: packed bubble cells. Developing: lace. Aged: rims + tendrils on DARK water
  // (POSEIDON R6.4.5 polarity: holes are open water, rims/tendrils are the surviving foam).
  float cover = smoothstep(0.02, 0.42, mass);
  // Pixel-footprint LOD: cells ~1 m wide cannot be drawn when a pixel spans ≳0.35 m.
  float detail = 1.0 - smoothstep(0.08, 0.35, footprint);
  if (detail <= 0.0) return cover*mix(0.8, 0.55, age01);
  vec2 v1 = voronoiF12(q*0.9);
  vec2 v2 = voronoiF12(q*2.7 + 11.3);
  float sep1 = v1.y - v1.x, sep2 = v2.y - v2.x;
  float cells = aaStep(0.05, 0.2, sep1)*0.5 + aaStep(0.04, 0.16, sep2)*0.5;
  float rims = 1.0 - aaStep(0.015, 0.08, min(sep1, sep2));
  float holeSig = fbm(q*vec2(0.38, 0.95) + 3.1)*0.62 + fbm(q*1.3 - 7.7)*0.38;
  float thr = mix(0.74, 0.46, smoothstep(0.08, 0.85, age01));
  float holeCore = aaStep(thr, thr + 0.07, holeSig);
  float holeRim = (1.0 - aaStep(0.004, 0.03, abs(holeSig - thr)))*(1.0 - holeCore);
  float t = fbm(q*vec2(1.6, 0.14) + 5.0);
  float tendril = (1.0 - aaStep(0.004, 0.02, abs(t - 0.5)))*smoothstep(0.45, 0.7, fbm(q*0.7 + 2.0));
  float fresh = 1.0 - smoothstep(0.05, 0.25, age01);
  float dev = smoothstep(0.08, 0.3, age01)*(1.0 - smoothstep(0.5, 0.75, age01));
  float old = smoothstep(0.35, 0.65, age01);
  float dense = sat(0.55 + cells*0.45 - rims*0.15)*(1.0 - holeCore*0.8);
  float lace = sat(holeRim*1.3 + tendril*0.9 + rims*0.25);
  float residue = sat(tendril + holeRim*0.8);
  float topo = sat(fresh*dense + dev*lace + old*residue);
  return mix(cover*mix(0.8, 0.55, age01), topo*cover, detail);
}

vec3 tierColor(float t){
  if (t < 0.5) return vec3(0.1, 0.35, 0.9);
  if (t < 1.5) return vec3(0.1, 0.8, 0.8);
  if (t < 2.5) return vec3(0.2, 0.9, 0.3);
  if (t < 3.5) return vec3(1.0, 0.75, 0.1);
  return vec3(1.0, 0.25, 0.1);
}

void main(){
  float cloudVis = 1.0;
  if (uCloudRect.w > 0.0){
    vec2 cuv = (vParam - uCloudRect.xy)/uCloudRect.z;
    if (all(greaterThan(cuv, vec2(0.0))) && all(lessThan(cuv, vec2(1.0)))) cloudVis = mix(1.0, texture(uCloudShadow, cuv).r, uCloudRect.w);
  }
  gSunE = uSunE*cloudVis;
  // Wet/dry is decided by the solver (W4): dry cells of the shore field are not water.
  // Per-fragment from the filtered depth (the mesh is far coarser than the solver grid).
  if (vShore.x > 0.5 && texture(uShoreSurf, (vParam - uShoreRect.xy)/uShoreRect.z).w < 0.003) discard;
  vec3 rel = vRel;
  float dist = length(rel);
  vec3 V = -rel/dist;
  bool below = uCamHeight < vHeight - 0.02;   // camera under this surface point

  // ── normal from summed cascades (exact choppy-surface cross product) ──
  float Sx = 0.0, Sz = 0.0, Dxx = 0.0, Dzz = 0.0, Dxz = 0.0;
  float foamMass = 0.0, foamAge = 0.0, foamAir = 0.0;
  float open = vOpen;
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount) break;
    vec3 uv = vec3(cascadeUv(vParam, c), float(c));
    float keep = c == uCascadeCount - 1 ? mix(1.0, 0.35, vShore.x) : open;
    vec4 dv = texture(uDerivArr, uv);
    vec4 ds = texture(uDispArr, uv);
    Sx += dv.x*keep; Sz += dv.y*keep; Dxx += dv.z*keep; Dzz += dv.w*keep; Dxz += ds.w*keep;
    vec4 f = texture(uFoamArr, uv);
    foamMass += f.r*keep; foamAge += f.g*keep; foamAir += f.b*keep;
  }
  float localFoam = 0.0;
  for (int t = 0; t < ${MAX_TILES}; t++){
    if (t >= uTileCount) break;
    vec2 tuv; float w = tileWeight(vParam, uTileRect[t], tuv);
    if (w > 0.0){ vec4 s = texture(uTileArr, vec3(tuv, uTileRect[t].w)); Sx += w*s.y; Sz += w*s.z; localFoam = max(localFoam, w*s.w); }
  }
  float shoreMass = 0.0, shoreAge01 = 0.0;
  if (vShore.x > 0.0){
    vec2 suv = (vParam - uShoreRect.xy)/uShoreRect.z;
    vec4 s = texture(uShoreSurf, suv);
    Sx += s.y*vShore.x; Sz += s.z*vShore.x;
    // Surf foam is extensive (mass, age) like whitecap foam, so it ages into lace the same way.
    shoreMass = vShore.z*vShore.x*0.55;
    shoreAge01 = sat(texture(uShoreExtra, suv).w/9.0);
  }
  // Rain rings where the pixel can hold a 4 cm ripple; farther out rain is roughness.
  float fpRain = max(max(length(dFdx(vParam)), length(dFdy(vParam))), 1e-3);
  float rainVis = uRain > 0.001 ? 1.0 - smoothstep(0.008, 0.03, fpRain) : 0.0;
  if (rainVis > 0.0){ vec2 rr = rainRipples(vParam + uCamOffset[0], uTime, uRain)*rainVis; Sx += rr.x; Sz += rr.y; }
  float J = (1.0 + Dxx)*(1.0 + Dzz) - Dxz*Dxz;
  vec3 n = vec3(Sz*Dxz - (1.0 + Dzz)*Sx, max(J, 0.08), Dxz*Sx - Sz*(1.0 + Dxx));
  n = normalize(n);
  if (below) n = -n;

  // ── roughness from everything the pixel cannot resolve ──
  float footprint = max(max(length(dFdx(vParam)), length(dFdy(vParam))), 1e-3);
  vec4 mom = slopeMoments(footprint);
  // Unresolved rain rings add isotropic slope variance (≈0.004 at 25 mm/h).
  float rainVar = uRain*0.004*(1.0 - rainVis);
  mom += vec4(rainVar, rainVar, 0.0, 2.0*rainVar);
  float rough = sqrt(max(mom.w, 1e-6));

  vec3 col;
  float Fv;
  if (!below){
    vec3 R = reflect(-V, n);
    // Rays reflected below the horizon would hit the sea again: fold them up (sea sees sky).
    R.y = abs(R.y);
    float lod = log2(max(2.0*rough*512.0/PI, 1.0));
    vec3 refl = envLod(R, lod);
    Fv = fresnelDielectric(max(dot(n, V), 0.0), 1.0, uIor);
    // Rough-surface Fresnel: average over the slope distribution flattens the grazing peak.
    Fv = mix(Fv, min(Fv, 0.5 + 0.5*Fv), sat(rough*3.0));
    float Fsun = fresnelDielectric(max(uSunDir.y, 0.0), 1.0, uIor);
    vec3 body = upwelling(Fsun);

    // Crest transmission: thin backlit crests glow sea-green (light through ~metres of water).
    float crest = sat((vHeight - 0.15*uSigHeight)/(0.45*uSigHeight + 0.2));
    vec3 Lh = normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + vec3(1e-4));
    float back = pow(sat(dot(-V, Lh)*0.5 + 0.5), 5.0)*sat(1.0 - abs(V.y)*1.6);
    vec3 thin = exp(-uAbsorb*3.5)*uBackscatter/(uAbsorb + uBackscatter + 1e-4);
    body += uSss*crest*back*gSunE*thin*0.9;

    // Screen-space refraction for shallow water over terrain / hulls.
    vec3 transmitted = body;
    if (uHasScene == 1){
      vec2 suvS = gl_FragCoord.xy/uViewport;
      vec2 off = n.xz*0.06*min(1.0, 8.0/dist);
      float zS = texture(uSceneDepth, suvS + off).r;
      if (zS < 1.0){
        float zlin = uNear*uFar/(uFar - zS*(uFar - uNear));
        float dzW = gl_FragCoord.z;
        float zlinW = uNear*uFar/(uFar - dzW*(uFar - uNear));
        float thick = zlin - zlinW;
        if (thick < 0.0){ off = vec2(0.0); zS = texture(uSceneDepth, suvS).r; zlin = uNear*uFar/(uFar - zS*(uFar - uNear)); thick = max(zlin - zlinW, 0.0); }
        vec3 behind = texture(uSceneColor, suvS + off).rgb;
        vec3 T = exp(-(uAbsorb + uScatter*0.35)*thick*1.15);
        transmitted = behind*T*(1.0 - Fsun*0.5) + body*(1.0 - T);
      }
    }
    // Aeration glow under fresh foam (Foam Foundry): bubbles scatter strongly, milky turquoise.
    float shoreBubbles = 0.0;
    if (vShore.x > 0.0) shoreBubbles = texture(uShoreExtra, (vParam - uShoreRect.xy)/uShoreRect.z).y*vShore.x;
    float air = sat(foamAir*0.45 + localFoam*0.3 + shoreBubbles*0.8);
    transmitted += air*(uSkyE + gSunE*max(uSunDir.y, 0.0))*vec3(0.035, 0.085, 0.085);

    col = mix(transmitted, refl, Fv) + sunGlitter(n, V, mom)*(1.0 - sat(foamMass));

    // ── whitecap + interaction foam ──
    // T1 parametric surf outside the solver tile: depth-limited breaking statistics
    // (Battjes–Janssen: the share of waves higher than γ·d breaks). Whitewater rides the
    // resolved crests; a residual band of old lace stays behind; run-up stays foamy.
    // Matches the T2 surf-zone statistics at the tile edge, so the seam carries no step.
    float t1Mass = 0.0, t1Age = 0.0;
    if (uTerrainOn == 1 && vShore.x < 0.999){
      float dB = -bedAt(vParam);
      if (dB > -0.6 && dB < 4.0*uSigHeight + 2.0){
        float Hmax = 0.73*max(dB, 0.0) + 0.08;
        float Qb = smoothstep(0.3, 1.25, 0.707*uSigHeight/Hmax);
        float crestT1 = smoothstep(0.15, 0.5, vHeight/Hmax);
        float runup = smoothstep(0.6, 0.0, dB);
        t1Mass = (Qb*(0.16 + 0.85*crestT1) + runup*0.3)*(1.0 - vShore.x)*0.8;
        t1Age = mix(0.62, 0.06, crestT1);
      }
    }
    float mW = foamMass*uFoamGain;
    float mass = mW + localFoam + shoreMass + t1Mass;
    if (mass > 0.004){
      float ageW = sat((foamAge/max(foamMass, 1e-3))/max(uFoamLife, 0.1));
      // Interaction foam carries no age channel: thinning mass reads as ageing lace.
      float ageL = 1.0 - smoothstep(0.08, 0.7, localFoam);
      float age01 = (ageW*mW + ageL*localFoam + shoreAge01*shoreMass + t1Age*t1Mass)/max(mass, 1e-4);
      vec2 q = (vParam + uCamOffset[0])*1.1;
      float cover = foamTopology(q, mass, age01, footprint);
      float ndl = max(dot(n, uSunDir), 0.0);
      vec3 foamCol = 0.82*(gSunE*(0.25 + 0.75*ndl) + uSkyE)/PI;
      foamCol *= mix(1.0, 0.86, age01);
      col = mix(col, foamCol, cover*0.92);
    }
  } else {
    // Seen from below: Snell's window, total internal reflection, attenuation to the eye.
    float cosI = max(dot(n, V), 0.0);
    vec3 Tdir = refract(-V, n, uIor);
    float F = dot(Tdir, Tdir) < 1e-6 ? 1.0 : fresnelDielectric(cosI, uIor, 1.0);
    vec3 sky = dot(Tdir, Tdir) < 1e-6 ? vec3(0.0) : envLod(normalize(Tdir), 1.0);
    vec3 body = upwelling(0.1)*1.4;
    col = mix(sky, body, F);
    vec3 Tr = exp(-(uAbsorb + uScatter)*dist);
    col = col*Tr + body*(1.0 - Tr);
    Fv = F;
  }

  // ── aerial perspective (sky map haze at the horizon) ──
  if (!below){
    float fogT = exp(-dist*uFogDensity);
    vec3 haze = envLod(normalize(vec3(-V.x, 0.035, -V.z)), 3.0);
    col = col*fogT + haze*(1.0 - fogT);
  }

  if (uDebug == 1) col = n*0.5 + 0.5;
  else if (uDebug == 2){
    float l = vLevel;
    col = vec3(fract(l*0.37 + 0.1), fract(l*0.61 + 0.5), fract(l*0.83 + 0.3))*(0.55 + 0.45*(1.0 - vMorph));
  }
  else if (uDebug == 3) col = vec3(rough*4.0, rough*2.2, 0.15);
  else if (uDebug == 4) col = vec3(foamMass*uFoamGain + localFoam, foamAir*0.5, sat(foamAge/(max(foamMass,1e-3)*uFoamLife)));
  else if (uDebug == 5) col = J < 0.0 ? vec3(1.0, 0.1, 0.05) : vec3(sat(1.0 - J));
  else if (uDebug == 6){
    vec2 tuv = (vParam - uTierRect.xy)/uTierRect.z;
    vec4 tm = texture(uTierMap, tuv);
    float inside = step(0.0, min(min(tuv.x, tuv.y), min(1.0 - tuv.x, 1.0 - tuv.y)));
    col = mix(col*0.35, tierColor(tm.r*4.0 + 0.001)*(0.4 + 0.6*tm.g), inside*0.85);
  }
  else if (uDebug == 7) col = vec3(vShore.x, vShore.y*0.2, vShore.w);
  outColor = vec4(col, 1.0);
}
`;
