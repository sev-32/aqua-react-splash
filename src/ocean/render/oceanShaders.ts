/**
 * Sea surface shaders — POSEIDON R7's renderer, evolved into THALASSA.
 *
 * Two passes, as in POSEIDON:
 *   1. SURFACE G-BUFFER — a screen-projected grid intersected with the mean sea
 *      (now the planet's sphere, so the sea curves to its true horizon),
 *      displaced by the cascade families + the JIT tiers (T3 tiles, T2 shore,
 *      T1 shoaling) + wind micro-waves. Writes position, normal, footprint,
 *      and the combined foam state per pixel.
 *   2. WATER SHADING — full screen: slope-moment roughness of everything the
 *      pixel cannot resolve, filtered Nimbus sky reflection, anisotropic sun
 *      glitter, refraction into the water with a traced seabed (the island's
 *      terrain), phase-correct single scattering with god-ray beams, caustics,
 *      POSEIDON's mid/far/horizon lanes for the analytic far field, foam, and
 *      aerial perspective toward the Nimbus horizon.
 *
 * All positions are camera-relative (camera at the origin, sea level at
 * y = −uCamHeight); `param` is the tangent-plane coordinate the cascades are
 * sampled at.
 */
import { SKY_COMMON_GLSL } from './sky';

export const MAX_TILES = 4;

export const OCEAN_COMMON_GLSL = /* glsl */ `
#define PI 3.14159265358979
${SKY_COMMON_GLSL}
precision highp sampler2DArray;
uniform float uCamHeight;
uniform float uEarthRadius;        // 0 = flat sea
uniform int uCascadeCount;
uniform float uSizes[4];
uniform vec2 uCamOffset[4];        // pmod(camXZ, L), double precision on the CPU
uniform sampler2DArray uDispArr;   // layer = cascade: (λDx, h, λDz, λDxz)
uniform sampler2DArray uDerivArr;  // layer = cascade: (Sx, Sz, λDxx, λDzz)
uniform float uTexN;

vec2 cascadeUv(vec2 rel, int c){ return (rel + uCamOffset[c])/uSizes[c]; }

// ── T3 interaction tiles (eWave): rect = (relMinX, relMinZ, size, layer)
uniform int uTileCount;
uniform vec4 uTileRect[${MAX_TILES}];
uniform sampler2DArray uTileArr;   // (η, ∂η/∂x, ∂η/∂z, foam) — fade pre-applied
float tileWeight(vec2 rel, vec4 r, out vec2 uv){
  uv = (rel - r.xy)/r.z;
  vec2 e = min(uv, 1.0 - uv);
  return smoothstep(0.0, 0.12, min(e.x, e.y))*step(0.0, min(e.x, e.y));
}
/** Local interaction field at q: (η, ∂η/∂x, ∂η/∂z). */
vec3 tileField(vec2 q){
  vec3 f = vec3(0.0);
  for (int t = 0; t < ${MAX_TILES}; t++){
    if (t >= uTileCount) break;
    vec2 tuv; float w = tileWeight(q, uTileRect[t], tuv);
    if (w > 0.0) f += w*textureLod(uTileArr, vec3(tuv, uTileRect[t].w), 0.0).xyz;
  }
  return f;
}

// ── T1 depth-limited shoaling + seabed (terrain heights) ──
uniform int uTerrainOn;
uniform sampler2D uTFine;  uniform vec3 uTFineRect;    // camera-relative min, size
uniform sampler2D uTCoarse; uniform vec3 uTCoarseRect;
uniform float uOpenDepth;          // open-ocean floor where no terrain is baked (m, positive)
float bedAt(vec2 rel){
  if (uTerrainOn == 1){
    vec2 uf = (rel - uTFineRect.xy)/uTFineRect.z;
    if (all(greaterThan(uf, vec2(0.002))) && all(lessThan(uf, vec2(0.998)))) return textureLod(uTFine, uf, 0.0).r;
    vec2 uc = (rel - uTCoarseRect.xy)/uTCoarseRect.z;
    if (all(greaterThan(uc, vec2(0.0))) && all(lessThan(uc, vec2(1.0)))) return textureLod(uTCoarse, uc, 0.0).r;
  }
  return -uOpenDepth;
}

// ── mean-sea intersection: plane, or the planet (centre R below sea level under the camera) ──
float seaT(vec3 rd){
  if (uEarthRadius <= 0.0) return rd.y < -1e-7 ? uCamHeight/(-rd.y) : -1.0;
  vec3 oc = vec3(0.0, uCamHeight + uEarthRadius, 0.0);
  float b = dot(oc, rd);
  float c = dot(oc, oc) - uEarthRadius*uEarthRadius;
  float disc = b*b - c;
  if (disc < 0.0 || c < 0.0 && b > 0.0) return -1.0;
  float t = -b - sqrt(disc);
  return t > 0.0 ? t : -1.0;
}
/** Tangent-plane (geodesic) coordinate of a camera-relative point on the sphere. */
vec2 paramOf(vec3 p){
  if (uEarthRadius <= 0.0) return p.xz;
  float r = length(p.xz);
  if (r < 1e-3) return p.xz;
  float ang = atan(r, p.y + uCamHeight + uEarthRadius);
  return p.xz*(uEarthRadius*ang/r);
}
/** Mean-sea height (camera-relative y) at tangent coordinate q: curvature drop. */
float seaLevelAt(vec2 q){
  if (uEarthRadius <= 0.0) return -uCamHeight;
  float s = length(q)/uEarthRadius;
  // −2R·sin²(s/2) = R(cos s − 1), without the cancellation of the naive form.
  float h = sin(0.5*s);
  return -2.0*uEarthRadius*h*h - uCamHeight;
}
`;

/** Manual bilinear with wrap for float textures (POSEIDON bilinear) — no float-linear dependency. */
const BILERP_GLSL = /* glsl */ `
vec4 bilerpWrap(sampler2D t, vec2 uv){
  ivec2 sz = textureSize(t, 0);
  vec2 p = fract(uv)*vec2(sz) - 0.5;
  ivec2 i = ivec2(floor(p)); vec2 f = fract(p);
  ivec2 a = ivec2((i.x % sz.x + sz.x) % sz.x, (i.y % sz.y + sz.y) % sz.y);
  ivec2 b = ivec2((a.x + 1) % sz.x, a.y), c = ivec2(a.x, (a.y + 1) % sz.y), d = ivec2(b.x, c.y);
  return mix(mix(texelFetch(t, a, 0), texelFetch(t, b, 0), f.x), mix(texelFetch(t, c, 0), texelFetch(t, d, 0), f.x), f.y);
}
`;

/* ────────────────────────────── pass 1: G-buffer ────────────────────────────── */

const GBUF_COMMON = /* glsl */ `
${OCEAN_COMMON_GLSL}
${BILERP_GLSL}
// ── T2 shore field: rect = (relMinX, relMinZ, size, fade)
uniform vec4 uShoreRect;
uniform sampler2D uShoreSurf;     // (η + lip lift, slopeX, slopeZ, water depth h)
uniform sampler2D uShoreAux;      // (foam cover, breaking E, lip+chop dx, dz)
// ── wind micro-waves (POSEIDON)
uniform sampler2D uMicro; uniform vec2 uMicroOff; uniform float uMicroDomain;
uniform float uMicroGain, uMicroNormalGain, uMicroRange;
float shoreOpenOcean(vec2 rel, out vec2 suv, out float inside){
  inside = 0.0; suv = vec2(0.0);
  if (uShoreRect.w <= 0.0) return 1.0;
  suv = (rel - uShoreRect.xy)/uShoreRect.z;
  vec2 e = min(suv, 1.0 - suv);
  inside = smoothstep(0.0, 0.08, min(e.x, e.y))*step(0.0, min(e.x, e.y))*uShoreRect.w;
  return 1.0 - inside;
}
float microHeight(vec2 rel){ return bilerpWrap(uMicro, (rel + uMicroOff)/uMicroDomain + 0.5).r; }
vec2 microSlope(vec2 rel){
  float e = uMicroDomain/float(textureSize(uMicro, 0).x);
  return vec2(microHeight(rel + vec2(e, 0.0)) - microHeight(rel - vec2(e, 0.0)),
              microHeight(rel + vec2(0.0, e)) - microHeight(rel - vec2(0.0, e)))/(2.0*e);
}
`;

export const GBUF_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${GBUF_COMMON}
layout(location=0) in vec2 aGrid;      // x: NDC (with margin), y: 0..1 row
uniform mat4 uViewProj;
uniform mat4 uInvViewProj;
uniform vec2 uRowNdc;                  // NDC y of the first/last row (horizon- and range-limited)
uniform vec2 uGridStep;                // NDC spacing between neighbouring vertices
uniform float uFarDist;
uniform float uGeoLodBias;
uniform float uSigHeightV;
uniform float uBelow;                  // camera below the mean sea
out vec3 vRel;
out vec2 vParam;
out float vHeight;
out vec4 vShore;       // inside, water depth, foam, breaking
out float vOpen;
out float vValid;
out float vShoal;
vec3 rayAt(vec2 ndc){ vec4 f = uInvViewProj*vec4(ndc, 1.0, 1.0); return normalize(f.xyz/f.w); }
vec3 baseAt(vec2 ndc, out bool ok){
  vec3 rd = rayAt(ndc);
  float t = uBelow > 0.5 ? (rd.y > 1e-6 ? -uCamHeight/rd.y : -1.0) : seaT(rd);
  ok = t > 0.0;
  return rd*min(max(t, 0.0), uFarDist);
}
void main(){
  vec2 ndc = vec2(aGrid.x, mix(uRowNdc.x, uRowNdc.y, aGrid.y));
  bool ok;
  vec3 b = baseAt(ndc, ok);
  if (!ok){ vValid = 0.0; vRel = vec3(0.0); vParam = vec2(0.0); vHeight = 0.0; vShore = vec4(0.0); vOpen = 1.0; vShoal = 1.0;
    gl_Position = vec4(ndc, 2.0, 1.0); return; }
  vValid = 1.0;
  bool o1, o2;
  vec3 bx = baseAt(ndc + vec2(uGridStep.x, 0.0), o1), bz = baseAt(ndc + vec2(0.0, uGridStep.y), o2);
  float spacing = max(length(bx - b), length(bz - b));
  vec2 rel = paramOf(b);

  vec2 suv; float inside;
  float open = shoreOpenOcean(rel, suv, inside);
  float bedV = bedAt(rel);
  float depthV = max(-bedV, 0.0);
  float shoal = clamp(depthV/(1.3*uSigHeightV + 0.4), 0.0, 1.0);
  shoal = mix(0.12, 1.0, shoal*shoal*(3.0 - 2.0*shoal));
  open *= mix(1.0, shoal, 1.0 - inside);
  vOpen = open; vShoal = shoal;
  vec3 d = vec3(0.0);
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount) break;
    // Geometric low-pass: the grid cannot hold waves shorter than its spacing.
    float lod = max(log2(spacing/(uSizes[c]/uTexN)) + uGeoLodBias, 0.0);
    vec4 s = textureLod(uDispArr, vec3(cascadeUv(rel, c), float(c)), lod);
    float keep = c == uCascadeCount - 1 ? mix(1.0, 0.35, inside)*mix(1.0, shoal, 0.6) : open;
    d += s.xyz*keep;
  }
  for (int t = 0; t < ${MAX_TILES}; t++){
    if (t >= uTileCount) break;
    vec2 tuv; float w = tileWeight(rel, uTileRect[t], tuv);
    if (w > 0.0) d.y += w*textureLod(uTileArr, vec3(tuv, uTileRect[t].w), 0.0).x;
  }
  vShore = vec4(0.0);
  if (inside > 0.0){
    vec4 s = textureLod(uShoreSurf, suv, 0.0);
    vec4 a = textureLod(uShoreAux, suv, 0.0);
    d.y += s.x*inside;
    d.xz += a.zw*inside;
    vShore = vec4(inside, s.w, a.x, a.y);
  }
  // Wind micro-geometry (cat's paws, gust patches) within its range.
  float dist = length(b);
  float mw = 1.0 - smoothstep(uMicroRange*0.55, uMicroRange, dist);
  if (mw > 0.0) d.y += microHeight(rel)*uMicroGain*mw*open;
  vec3 p = vec3(b.x + d.x, b.y + d.y, b.z + d.z);
  vRel = p;
  vParam = rel;
  vHeight = d.y;
  gl_Position = uViewProj*vec4(p, 1.0);
}
`;

export const GBUF_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${GBUF_COMMON}
in vec3 vRel;
in vec2 vParam;
in float vHeight;
in vec4 vShore;
in float vOpen;
in float vValid;
in float vShoal;
layout(location=0) out vec4 oPos;     // rel xyz, 1
layout(location=1) out vec4 oNrm;     // normal, footprint (m)
layout(location=2) out vec4 oBase;    // param xz, η, shore weight
layout(location=3) out vec4 oFoam;    // foam mass, age01, air, fold (1 − J)
uniform sampler2DArray uFoamArr;      // (mass, mass·age, air, coverage)
uniform float uFoamGain, uFoamLife;
uniform sampler2D uShoreExtra;        // (wetness, bubbles, foam-on-sand, age)
uniform float uSigHeight;
uniform float uTime, uRain;
uniform float uNormalSharpen;         // < 1 sharpens normal filtering (POSEIDON: unfiltered)
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz)*p3.zy); }
/** Rain rings (capillary, ~4 cm) where the pixel can hold them. */
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
      if (hc.x > 0.35 + 0.65*rain) continue;
      float age = fract(t/period + hc.y)*period;
      vec2 dd = (q - c - h22(c + 5.3))*sc;
      float r = length(dd);
      float x = r - 0.35*age;
      float env = exp(-age*3.4)*smoothstep(0.0, 0.03, age)*exp(-x*x/0.0012);
      g += -0.012*157.0*sin(157.0*x)*env*dd/max(r, 1e-3);
    }
  }
  return g;
}
void main(){
  if (vValid < 0.5) discard;
  vec2 suvW = (vParam - uShoreRect.xy)/uShoreRect.z;
  // Wet/dry is the solver's decision (dry cells of the shore field are not water).
  if (vShore.x > 0.5 && texture(uShoreSurf, suvW).w < 0.003) discard;
  float footprint = max(max(length(dFdx(vParam)), length(dFdy(vParam))), 1e-3);

  // ── normal: summed cascades, exact choppy-surface cross product (POSEIDON normalFFT) ──
  float Sx = 0.0, Sz = 0.0, Dxx = 0.0, Dzz = 0.0, Dxz = 0.0;
  float fMass = 0.0, fAgeM = 0.0, fAir = 0.0;
  vec2 gx = dFdx(vParam)*uNormalSharpen, gy = dFdy(vParam)*uNormalSharpen;
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount) break;
    vec3 uv = vec3(cascadeUv(vParam, c), float(c));
    float keep = c == uCascadeCount - 1 ? mix(1.0, 0.35, vShore.x)*mix(1.0, vShoal, 0.6) : vOpen;
    // POSEIDON sampled normals unfiltered (crisp glints to the horizon); a sharpened
    // gradient keeps that sparkle while the mips still stop outright aliasing.
    vec4 dv = textureGrad(uDerivArr, uv, gx/uSizes[c], gy/uSizes[c]);
    vec4 ds = textureGrad(uDispArr, uv, gx/uSizes[c], gy/uSizes[c]);
    Sx += dv.x*keep; Sz += dv.y*keep; Dxx += dv.z*keep; Dzz += dv.w*keep; Dxz += ds.w*keep;
    vec4 f = texture(uFoamArr, uv);
    fMass += f.r*keep; fAgeM += f.g*keep; fAir += f.b*keep;
  }
  float localFoam = 0.0;
  for (int t = 0; t < ${MAX_TILES}; t++){
    if (t >= uTileCount) break;
    vec2 tuv; float w = tileWeight(vParam, uTileRect[t], tuv);
    if (w > 0.0){ vec4 s = texture(uTileArr, vec3(tuv, uTileRect[t].w)); Sx += w*s.y; Sz += w*s.z; localFoam = max(localFoam, w*s.w); }
  }
  float shoreMass = 0.0, shoreAge01 = 0.0, shoreBubbles = 0.0;
  if (vShore.x > 0.0){
    vec4 s = texture(uShoreSurf, suvW);
    Sx += s.y*vShore.x; Sz += s.z*vShore.x;
    vec4 ex = texture(uShoreExtra, suvW);
    shoreMass = vShore.z*vShore.x*0.55;
    shoreAge01 = clamp(ex.w/9.0, 0.0, 1.0);
    shoreBubbles = ex.y*vShore.x;
  }
  float dist = length(vRel);
  float mw = 1.0 - smoothstep(uMicroRange*0.45, uMicroRange, dist);
  if (mw > 0.0){ vec2 ms = microSlope(vParam)*uMicroNormalGain*mw*vOpen; Sx += ms.x; Sz += ms.y; }
  float rainVis = uRain > 0.001 ? 1.0 - smoothstep(0.008, 0.03, footprint) : 0.0;
  if (rainVis > 0.0){ vec2 rr = rainRipples(vParam + uCamOffset[0], uTime, uRain)*rainVis; Sx += rr.x; Sz += rr.y; }
  float J = (1.0 + Dxx)*(1.0 + Dzz) - Dxz*Dxz;
  vec3 n = normalize(vec3(Sz*Dxz - (1.0 + Dzz)*Sx, max(J, 0.08), Dxz*Sx - Sz*(1.0 + Dxx)));

  // ── T1 parametric surf outside the solver tile (Battjes–Janssen breaking fraction) ──
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
  float mW = fMass*uFoamGain;
  float mass = mW + localFoam + shoreMass + t1Mass;
  float ageW = clamp((fAgeM/max(fMass, 1e-3))/max(uFoamLife, 0.1), 0.0, 1.0);
  float ageL = 1.0 - smoothstep(0.08, 0.7, localFoam);
  float age01 = (ageW*mW + ageL*localFoam + shoreAge01*shoreMass + t1Age*t1Mass)/max(mass, 1e-4);
  float air = clamp(fAir*0.45 + localFoam*0.3 + shoreBubbles*0.8, 0.0, 1.0);

  oPos = vec4(vRel, 1.0);
  oNrm = vec4(n, footprint);
  oBase = vec4(vParam, vHeight, vShore.x);
  oFoam = vec4(mass, age01, air, 1.0 - J);
}
`;

/* ─────────────────────────── pass 2: water shading ─────────────────────────── */

export const SHADE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${OCEAN_COMMON_GLSL}
${BILERP_GLSL}
in vec2 vUv;
out vec4 outColor;
uniform mat4 uViewProj;
uniform mat4 uInvViewProj;
uniform sampler2D uGPos, uGNrm, uGBase, uGFoam;
uniform sampler2D uEnv; uniform float uEnvLevels; uniform float uEnvWidth;
uniform vec3 uSunDir;
uniform vec3 uSunE;            // sun radiance at sea level (Nimbus, clear air)
uniform vec3 uSkyE;            // sky irradiance on a horizontal plane
uniform sampler2D uSlopeLut; uniform float uLogKMin, uLogKMax; uniform float uRoughnessGain;
uniform float uIor;
uniform vec3 uAbsorb, uScatter, uBackscatter;
uniform float uFoamLife;
uniform float uTime;
uniform int uDebug;
uniform float uRain;
// Weather
uniform sampler2D uCloudShadow; uniform vec4 uCloudRect;
uniform sampler2D uWind; uniform vec2 uWindOff; uniform float uWindDomain; uniform float uWindRough;
// Scene behind the water (terrain, hulls) — receiver colour and occluders
uniform sampler2D uSceneColor; uniform sampler2D uSceneDepth; uniform int uHasScene;
uniform float uNear, uFar;
// POSEIDON volume + lanes + glitter (current-best defaults)
uniform float uTurbidity, uSurfaceHaze, uSedimentHaze, uAnisotropy, uGodray;
uniform int uVolumeSteps;
uniform float uBottomThreshold, uMaxFloorTrace;
uniform float uCausticStrength, uCausticMax, uCausticDistance;
uniform float uAerialStrength;
uniform vec4 uLodNear, uLodMid, uLodFar, uLodHorizon;     // start, end, softness, -
uniform vec3 uLaneMid, uLaneFar, uLaneHorizon;            // windSea, roughness, aerial
uniform float uFarHorizon;
uniform vec4 uGlitter;        // strength, near density, far density, far broadening
uniform vec4 uGlitterFade;    // clamp, fade start, fade end, softness
uniform float uFogDensity;
// Nimbus aerial perspective of the planet surface along each view ray (low-res, screen space)
uniform sampler2D uAerial;        // rgb in-scatter, a green transmittance
uniform vec3 uAerialK;             // τ_c/τ_g
uniform int uHasAerial;

#define MAX_VOLUME_STEPS 16
float sat(float x){ return clamp(x, 0.0, 1.0); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz)*p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.62, 1.18, -1.18, 1.62);
  for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = m*p + vec2(3.1, -1.7); a *= 0.5; } return v; }

vec3 gSunE;          // after cloud shadowing
float gLight;        // POSEIDON light scale: its unit-less constants were authored under a ~5.2-luminance sun

float fresnelDielectric(float ci, float ei, float et){
  float c = clamp(ci, -1.0, 1.0);
  if (c <= 0.0){ float q = ei; ei = et; et = q; c = abs(c); }
  float st = ei/et*sqrt(max(0.0, 1.0 - c*c)); if (st >= 1.0) return 1.0;
  float ct = sqrt(max(0.0, 1.0 - st*st));
  float rs = (et*c - ei*ct)/max(et*c + ei*ct, 1e-6);
  float rp = (ei*c - et*ct)/max(ei*c + et*ct, 1e-6);
  return 0.5*(rs*rs + rp*rp);
}
vec3 envLod(vec3 d, float lod){ return textureLod(uEnv, dirToEquirect(d), clamp(lod, 0.0, uEnvLevels - 1.0)).rgb; }
vec3 gSeaBody;       // radiance of the open sea seen from above (second-bounce reflections)
/**
 * What a reflected ray sees. Upward: the Nimbus sky. Downward: the sea itself — its body,
 * plus the sky mirrored once more off the far surface at that grazing angle (Fresnel).
 */
vec3 skyOrSea(vec3 r, float lod, vec3 sea){
  if (r.y >= 0.0) return envLod(r, lod);
  float F2 = fresnelDielectric(-r.y, 1.0, uIor);
  return mix(sea, envLod(vec3(r.x, -r.y, r.z), lod), F2);
}
/** Reflection of a rough surface: the env pre-filtered to the reflected lobe's width. sea:
 *  the water a downward reflection lands on (the pixel's own water nearby; open-sea body far). */
vec3 filteredSky(vec3 r, float rough, vec3 sea){ return skyOrSea(r, log2(max(2.2*rough*uEnvWidth/(2.0*PI), 1.0)), sea); }
/** Horizon sky in the view azimuth — what distance fades the sea toward. */
vec3 hazeColor(vec3 rd){ return envLod(normalize(vec3(rd.x, 0.012, rd.z)), 2.0); }

vec4 momentAt(float kCut){
  float u = clamp((log(max(kCut, 1e-6)) - uLogKMin)/max(uLogKMax - uLogKMin, 1e-6), 0.0, 1.0)*255.0;
  int i0 = int(floor(u)), i1 = min(i0 + 1, 255);
  return mix(texelFetch(uSlopeLut, ivec2(i0, 0), 0), texelFetch(uSlopeLut, ivec2(i1, 0), 0), fract(u))*uRoughnessGain;
}
vec4 windAt(vec2 rel){ return bilerpWrap(uWind, (rel + uWindOff)/uWindDomain + 0.5); }
/** Gusts roughen the sheen (POSEIDON wind optical roughness). */
vec4 windMoments(vec2 rel){
  vec4 wf = windAt(rel);
  float m = uWindRough*(0.00003*length(wf.xy) + 0.00018*wf.w + 0.00012*abs(wf.z));
  return vec4(m, m*0.72, 0.0, m*1.72);
}
float smithG1(float NoX, float a){ float a2 = a*a, b = NoX*NoX; return 2.0*NoX/(NoX + sqrt(max(a2 + (1.0 - a2)*b, 1e-8))); }
float glitterDetail(float d){ float s = max(uGlitterFade.w, 1.0); return 1.0 - smoothstep(max(uGlitterFade.y - s, 0.0), uGlitterFade.z + s, d); }
/** POSEIDON glitter: anisotropic Gaussian slope NDF around the filtered mean slope. */
vec3 sunGlitter(vec3 n, vec3 V, vec4 mom, float d){
  vec3 L = uSunDir;
  float NoV = max(dot(n, V), 1e-4), NoL = max(dot(n, L), 0.0);
  if (NoL <= 0.0 || L.y <= 0.0) return vec3(0.0);
  vec3 H = normalize(V + L);
  if (H.y <= 0.02) return vec3(0.0);
  float detail = glitterDetail(d);
  float broad = mix(max(uGlitter.w, 1.0), 1.0, detail);
  float density = mix(uGlitter.z, uGlitter.y, detail);
  vec2 mean = -n.xz/max(n.y, 0.04), req = -H.xz/max(H.y, 0.04), dd = req - mean;
  float a = (mom.x + 2.2e-5)*broad, b = mom.z*broad, c = (mom.y + 2.2e-5)*broad;
  float det = max(a*c - b*b, 1e-10), q = (c*dd.x*dd.x - 2.0*b*dd.x*dd.y + a*dd.y*dd.y)/det;
  float P = exp(-0.5*q)/(2.0*PI*sqrt(det)), D = P/pow(max(H.y, 0.06), 4.0);
  float al = sqrt(max(0.5*(a + c), 1e-6)), Gm = smithG1(NoV, al)*smithG1(NoL, al);
  float F = fresnelDielectric(max(dot(V, H), 0.0), 1.0, uIor);
  float peak = clamp(F*D*Gm/(4.0*NoV), 0.0, uGlitterFade.x);
  return gSunE*uGlitter.x*density*peak;
}

// ── the water column (POSEIDON integrateVolume / traceFloor / caustics) ──
float surfaceHeightRel(vec2 q){
  float h = tileField(q).x;
  for (int c = 0; c < 4; c++){ if (c >= uCascadeCount) break; h += textureLod(uDispArr, vec3(cascadeUv(q, c), float(c)), 0.0).y; }
  return seaLevelAt(q) + h;
}
vec3 normalAt(vec2 q){
  float Sx = 0.0, Sz = 0.0, Dxx = 0.0, Dzz = 0.0;
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount) break;
    vec4 dv = textureLod(uDerivArr, vec3(cascadeUv(q, c), float(c)), 0.0);
    Sx += dv.x; Sz += dv.y; Dxx += dv.z; Dzz += dv.w;
  }
  // The interaction field focuses light too (the pool's caustic rings).
  vec3 tf = tileField(q);
  Sx += tf.y; Sz += tf.z;
  vec2 sl = vec2(Sx/max(1.0 + Dxx, 0.16), Sz/max(1.0 + Dzz, 0.16));
  return normalize(vec3(-sl.x, 1.0, -sl.y));
}
float floorRel(vec2 q){ return bedAt(q) - uCamHeight; }   // camera-relative bed height
vec3 floorNormal(vec2 q){
  float e = 0.6;
  float hx = bedAt(q + vec2(e, 0.0)) - bedAt(q - vec2(e, 0.0));
  float hz = bedAt(q + vec2(0.0, e)) - bedAt(q - vec2(0.0, e));
  return normalize(vec3(-hx/(2.0*e), 1.0, -hz/(2.0*e)));
}
bool traceFloor(vec3 ro, vec3 rd, float maxD, out float tHit, out vec3 hit){
  if (rd.y >= -0.00005) return false;
  if (ro.y - floorRel(ro.xz) <= 0.0) return false;
  float hi = min(maxD, (-uOpenDepth - uCamHeight - 40.0 - ro.y)/rd.y);
  float fHi = (ro.y + rd.y*hi) - floorRel(ro.xz + rd.xz*hi);
  if (fHi > 0.0) return false;
  float lo = 0.0;
  // Coarse march first (the island's slopes can be crossed between bisection brackets).
  for (int i = 1; i <= 12; i++){
    float t = hi*float(i)/12.0;
    if ((ro.y + rd.y*t) - floorRel(ro.xz + rd.xz*t) <= 0.0){ hi = t; break; }
    lo = t;
  }
  for (int i = 0; i < 8; i++){
    float mid = 0.5*(lo + hi);
    if ((ro.y + rd.y*mid) - floorRel(ro.xz + rd.xz*mid) > 0.0) lo = mid; else hi = mid;
  }
  tHit = 0.5*(lo + hi);
  hit = ro + rd*tHit;
  return tHit > 0.0 && tHit < maxD;
}
/**
 * Multiply-scattered upwelling of an optically deep column (Gordon et al.:
 * R = 0.0949u + 0.0794u², u = b_b/(a + b_b)) less its first order, which the
 * single-scattering march already carries — the diffuse blue that is still there
 * when the sun is behind the viewer.
 */
vec3 msUpwelling(){
  vec3 u = uBackscatter/(uAbsorb + uBackscatter);   // water type's b_b (particles + molecular)
  vec3 R = 0.0949*u + 0.0794*u*u;
  vec3 Ed = gSunE*max(uSunDir.y, 0.0)*0.97 + uSkyE*0.93;
  return R*Ed/PI*0.55;
}
float hgPhaseW(float mu, float g){ float g2 = g*g; return (1.0 - g2)/(4.0*PI*pow(max(1.0 + g2 - 2.0*g*mu, 1e-4), 1.5)); }
/** Focusing of the refracted sun by the surface above a point (god-ray beams). */
float beamAt(vec3 p){
  vec3 flatT = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0/uIor);
  vec2 src = p.xz - flatT.xz*((p.y - seaLevelAt(p.xz))/flatT.y);
  float xx = 0.0, zz = 0.0;
  for (int c = 0; c < 4; c++){ if (c >= uCascadeCount) break; vec4 dv = textureLod(uDerivArr, vec3(cascadeUv(src, c), float(c)), 0.0); xx += dv.z; zz += dv.w; }
  return smoothstep(1.05, 2.8, 1.0/max(abs((1.0 + xx)*(1.0 + zz)), 0.18));
}
vec3 integrateVolume(vec3 ro, vec3 rd, float dist, out vec3 trans, out float beamAccum){
  trans = vec3(1.0); beamAccum = 0.0; vec3 L = vec3(0.0);
  if (dist <= 0.001 || uVolumeSteps <= 0) return L;
  // Integrate only where light can still come back (≈6 attenuation lengths of the clearest
  // band); beyond that the column is optically deep and only its transmittance matters.
  // (POSEIDON's floor was ~110 m down; the open ocean here is kilometres deep.)
  vec3 sigT0 = uAbsorb*(0.75 + 0.25*uTurbidity) + uScatter;
  float Lv = min(dist, 6.0/max(min(sigT0.r, min(sigT0.g, sigT0.b)), 1e-3));
  int steps = uVolumeSteps; float ds = Lv/float(steps);
  float beam = 0.0;
  vec3 sunV = gSunE*1.265;
  // Scalar irradiance of the diffuse downwelling light (E0 ≈ Ed/μ̄, μ̄ ≈ 0.8) scattered back
  // up toward the eye: HG backscatter fraction B(g) spread over the upward hemisphere.
  float gA = clamp(uAnisotropy, 0.01, 0.99);
  float Bg = (1.0 - gA)/(2.0*gA)*((1.0 + gA)/sqrt(1.0 + gA*gA) - 1.0);
  vec3 skyIn = uSkyE*0.934/0.8*Bg/(2.0*PI);
  for (int i = 0; i < MAX_VOLUME_STEPS; i++){
    if (i >= steps) break;
    vec3 p = ro + rd*(ds*(float(i) + 0.5));
    float sy = surfaceHeightRel(p.xz), fy = floorRel(p.xz);
    float depth = max(sy - p.y, 0.0), gap = max(p.y - fy, 0.0);
    float haze = 1.0 + uSurfaceHaze*exp(-depth*1.25) + uSedimentHaze*exp(-gap*0.58);
    vec3 sigA = uAbsorb*(0.75 + 0.25*uTurbidity*haze), sigS = uScatter*haze, sigT = sigA + sigS;
    if ((i % 3) == 0) beam = beamAt(p);
    vec3 sunT = exp(-sigT*depth/max(uSunDir.y, 0.08));
    vec3 src = sigS*hgPhaseW(dot(rd, uSunDir), uAnisotropy)*sunV*sunT*(1.0 + uGodray*beam);
    // Diffuse skylight entering the water (overcast light, the blue fill under a clear sky):
    // downwelling irradiance with mean cosine ≈ 0.8, scattered ~isotropically toward the eye.
    src += sigS*skyIn*exp(-sigT*depth*1.25);
    L += trans*src*ds; trans *= exp(-sigT*ds); beamAccum += beam*ds/max(dist, 0.001);
  }
  trans *= exp(-sigT0*(dist - Lv));
  return L;
}
vec2 projectSunTo(vec2 src, float y){
  float sy = surfaceHeightRel(src); vec3 T = refract(-uSunDir, normalAt(src), 1.0/uIor);
  if (T.y >= -0.015) return vec2(1e6);
  return src + T.xz*((y - sy)/T.y);
}
float causticAt(vec3 rcv){
  if (uCausticStrength <= 0.0) return 0.0;
  float d = length(rcv); if (d > uCausticDistance) return 0.0;
  vec3 flatT = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0/uIor);
  vec2 src = rcv.xz - flatT.xz*((rcv.y - seaLevelAt(rcv.xz))/flatT.y);
  for (int i = 0; i < 2; i++){ vec2 m = projectSunTo(src, rcv.y); src += clamp(rcv.xz - m, vec2(-2.0), vec2(2.0))*0.72; }
  float e = 0.46;
  vec2 p0 = projectSunTo(src, rcv.y), px = projectSunTo(src + vec2(e, 0.0), rcv.y), pz = projectSunTo(src + vec2(0.0, e), rcv.y);
  vec2 ax = (px - p0)/e, az = (pz - p0)/e;
  float focus = clamp(1.0/max(abs(ax.x*az.y - ax.y*az.x), 0.04), 0.0, uCausticMax);
  float Fs = fresnelDielectric(max(dot(normalAt(src), uSunDir), 0.0), 1.0, uIor);
  vec3 tr = exp(-(uAbsorb + uScatter)*(surfaceHeightRel(src) - rcv.y)/max(-flatT.y, 0.1));
  return uCausticStrength*focus*(1.0 - Fs)*luma(tr)*smoothstep(uCausticDistance, uCausticDistance*0.55, d);
}
vec3 sandAlbedo(vec2 p){
  vec2 q = p*0.12;
  float macro = fbm(q*0.32 + vec2(7.2, -3.4));
  vec2 dir = normalize(vec2(0.83, 0.56)); float along = dot(p, dir), across = dot(p, vec2(-dir.y, dir.x));
  float ripple = 0.5 + 0.5*sin(across*1.86 + 0.34*sin(along*0.21));
  vec3 warm = mix(vec3(0.20, 0.145, 0.085), vec3(0.56, 0.43, 0.25), macro);
  return warm*(0.82 + 0.22*ripple);
}
/** POSEIDON receiver (sand on the shelf, rock on slopes and in the deep) — used where the scene cannot answer. */
vec3 shadeReceiver(vec3 p, vec3 n, out float caustic){
  caustic = causticAt(p);
  vec3 TS = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0/uIor);
  float diff = max(dot(n, -TS), 0.0);
  vec2 w = p.xz + uCamOffset[0];
  float depth = -(p.y + uCamHeight);
  float shelf = 1.0 - smoothstep(12.0, 60.0, depth);
  vec3 deep = mix(mix(vec3(0.012, 0.021, 0.024), vec3(0.055, 0.071, 0.067), fbm(w*0.018)),
                  mix(vec3(0.036, 0.044, 0.040), vec3(0.095, 0.105, 0.086), fbm(w*0.006)), smoothstep(0.45, 0.92, 1.0 - n.y));
  vec3 base = mix(deep, sandAlbedo(w), shelf*smoothstep(0.25, 0.82, n.y));
  float ao = mix(0.50, 0.88, smoothstep(-0.15, 1.0, n.y));
  return (base*(0.12 + 0.76*diff)*ao + base*caustic*0.70)*gLight;
}
float linDepth(float z){ return uNear*uFar/(uFar - z*(uFar - uNear)); }
vec3 viewOf(vec3 rel){ vec4 c = uViewProj*vec4(rel, 1.0); return c.xyz/c.w; }

// ── far field: POSEIDON lanes on the analytic sea (plane → sphere) ──
float laneBand(float d, vec4 b){
  float s = max(b.z, 0.0);
  float enter = b.x <= 0.0 ? 1.0 : smoothstep(max(b.x - s, 0.0), b.x + s, d);
  float exit = b.y <= b.x ? 1.0 : 1.0 - smoothstep(max(b.y - s, b.x), b.y + s, d);
  return max(enter*exit, 0.0);
}
vec4 laneWeights(float d){
  vec4 w = vec4(laneBand(d, uLodNear), laneBand(d, uLodMid), laneBand(d, uLodFar), laneBand(d, uLodHorizon));
  float s = dot(w, vec4(1.0));
  if (s < 1e-6){ w = d < uLodMid.x ? vec4(1,0,0,0) : d < uLodFar.x ? vec4(0,1,0,0) : d < uLodHorizon.x ? vec4(0,0,1,0) : vec4(0,0,0,1); s = 1.0; }
  return w/s;
}
/** Prefiltered normal of cascades 0–1 at a footprint (mips replace POSEIDON's box filter). */
vec3 laneNormal(vec2 q, float footprint, float windSea){
  float Sx = 0.0, Sz = 0.0, Dxx = 0.0, Dzz = 0.0;
  for (int c = 0; c < 2; c++){
    if (c >= uCascadeCount) break;
    float lod = max(log2(footprint/(uSizes[c]/uTexN)), 0.0);
    float w = c == 0 ? 1.0 : windSea*(1.0 - smoothstep(18.0, 180.0, footprint));
    vec4 dv = textureLod(uDerivArr, vec3(cascadeUv(q, c), float(c)), lod);
    Sx += dv.x*w; Sz += dv.y*w; Dxx += dv.z*w; Dzz += dv.w*w;
  }
  vec2 sl = vec2(Sx/max(1.0 + Dxx, 0.28), Sz/max(1.0 + Dzz, 0.28));
  return normalize(vec3(-sl.x, 1.0, -sl.y));
}
vec3 laneColor(vec3 rd, vec2 q, float d, float footprint, vec3 lane, out vec3 glit){
  vec3 n = laneNormal(q, footprint, lane.x);
  vec3 V = -rd, R = reflect(rd, n);
  vec4 mom = momentAt(PI/max(footprint, 0.05))*lane.y + windMoments(q);
  float rough = sqrt(max(mom.w, 2e-5));
  glit = sunGlitter(n, V, mom, d);
  vec3 refl = filteredSky(R, rough, gSeaBody) + glit;
  float F = fresnelDielectric(max(dot(n, V), 0.0), 1.0, uIor);
  vec3 body = mix(vec3(0.008, 0.035, 0.052), vec3(0.018, 0.075, 0.095), sat(n.y*0.7 + 0.2))*gLight;
  vec3 c = mix(body, refl, sat(F + 0.18));
  if (uHasAerial == 1) return c;      // the atmosphere is applied once, physically, after the lanes
  float aerial = 1.0 - exp(-d*0.00022*lane.z);
  return mix(c, hazeColor(rd), clamp(aerial, 0.0, 0.97));
}

// ── foam micro-structure (POSEIDON R6.4.5 polarity-correct aging) ──
vec2 voronoiF12(vec2 x){
  vec2 n = floor(x), f = fract(x); float f1 = 8.0, f2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j)), r = g + h22(n + g) - f; float dd = dot(r, r);
    if (dd < f1){ f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
  }
  return sqrt(vec2(f1, f2));
}
float aaStep(float e0, float e1, float x, float w){ return smoothstep(e0 - w, e1 + w, x); }
float foamTopology(vec2 q, float mass, float age01, float footprint){
  // Ragged, streaky edges: the coverage threshold is modulated by noise at several scales
  // (a whitecap is a torn sheet of bubbles, never a smooth disc).
  float rag = fbm(q*vec2(0.55, 0.22) + 1.7)*0.6 + fbm(q*1.9 - 4.2)*0.4;
  float cover = smoothstep(0.02, 0.42, mass*(0.35 + 1.3*rag));
  float detail = 1.0 - smoothstep(0.08, 0.35, footprint);
  if (detail <= 0.0) return cover*mix(0.8, 0.55, age01);
  float aw = footprint*0.6;
  vec2 v1 = voronoiF12(q*0.9), v2 = voronoiF12(q*2.7 + 11.3);
  float sep1 = v1.y - v1.x, sep2 = v2.y - v2.x;
  float cells = aaStep(0.05, 0.2, sep1, aw)*0.5 + aaStep(0.04, 0.16, sep2, aw)*0.5;
  float rims = 1.0 - aaStep(0.015, 0.08, min(sep1, sep2), aw);
  float holeSig = fbm(q*vec2(0.38, 0.95) + 3.1)*0.62 + fbm(q*1.3 - 7.7)*0.38;
  float thr = mix(0.74, 0.46, smoothstep(0.08, 0.85, age01));
  float holeCore = aaStep(thr, thr + 0.07, holeSig, aw*0.2);
  float holeRim = (1.0 - aaStep(0.004, 0.03, abs(holeSig - thr), aw*0.2))*(1.0 - holeCore);
  float t = fbm(q*vec2(1.6, 0.14) + 5.0);
  float tendril = (1.0 - aaStep(0.004, 0.02, abs(t - 0.5), aw*0.2))*smoothstep(0.45, 0.7, fbm(q*0.7 + 2.0));
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
  vec2 ndc = vUv*2.0 - 1.0;
  vec4 far4 = uInvViewProj*vec4(ndc, 1.0, 1.0);
  vec3 rd = normalize(far4.xyz/far4.w);
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec4 gp = texelFetch(uGPos, px, 0);
  bool hitS = gp.a > 0.5;
  float tSea = seaT(rd);
  // Far-field footprint from the analytic sea, in uniform control flow (before any discard).
  vec2 qSea = paramOf(rd*min(max(tSea, 0.0), uFarHorizon));
  float fpSea = max(max(length(dFdx(qSea)), length(dFdy(qSea))), 0.05);
  if (!hitS && tSea <= 0.0) discard;
  bool below = hitS && gp.y > 0.02;

  vec3 sp; vec3 n; vec2 q; float footprint, eta, shoreW; vec4 foam;
  if (hitS){
    vec4 gn = texelFetch(uGNrm, px, 0), gb = texelFetch(uGBase, px, 0);
    sp = gp.xyz; n = normalize(gn.xyz); footprint = gn.w; q = gb.xy; eta = gb.z; shoreW = gb.w;
    foam = texelFetch(uGFoam, px, 0);
  } else {
    // Guard band / far field outside the projected mesh (POSEIDON's bounded surface solve):
    // the analytic sea with the cascade normal at that point.
    sp = rd*min(tSea, uFarHorizon); q = qSea; eta = 0.0; shoreW = 0.0; foam = vec4(0.0);
    footprint = fpSea;
    n = normalAt(q);
    sp.y = min(surfaceHeightRel(q), -0.05);
  }
  float dist = length(sp);
  float cloudVis = 1.0;
  if (uCloudRect.w > 0.0){
    vec2 cuv = (q - uCloudRect.xy)/uCloudRect.z;
    if (all(greaterThan(cuv, vec2(0.0))) && all(lessThan(cuv, vec2(1.0)))) cloudVis = mix(1.0, texture(uCloudShadow, cuv).r, uCloudRect.w);
  }
  gSunE = uSunE*cloudVis;
  // Downwelling light relative to POSEIDON's reference (sun 5.24 at 51°, plus its sky fill):
  // its unit-less water constants were authored under that light.
  gLight = (luma(gSunE)*max(uSunDir.y, 0.0) + luma(uSkyE))/(5.24*0.78 + 0.3);
  gSeaBody = vec3(0.015, 0.063, 0.081)*gLight;   // POSEIDON far-lane body at its reference light

  vec3 col = vec3(0.0);
  vec3 dbgRefl = vec3(0.0), dbgTrans = vec3(0.0), dbgScene = vec3(0.0); float dbgF = 0.0;
  float pathLen = 0.0, caustic = 0.0; vec3 inscatter = vec3(0.0), trans = vec3(1.0); bool floorHit = false;
  vec4 mom = vec4(0.0);
  if (!below){
    vec3 V = -rd;
    bool nearWater = hitS || tSea < uLodNear.y + uLodNear.z;
    if (nearWater){
      // ── near: POSEIDON water ──
      mom = momentAt(PI/max(footprint, 0.012)) + windMoments(q);
      float rainVar = uRain*0.004*smoothstep(0.008, 0.03, footprint);
      mom += vec4(rainVar, rainVar, 0.0, 2.0*rainVar);
      float rough = sqrt(max(mom.w, 0.0));
      vec3 R = reflect(rd, n);
      vec3 glint = sunGlitter(n, V, mom, dist)*(1.0 - sat(foam.x));
      float F = fresnelDielectric(max(dot(n, V), 0.0), 1.0, uIor);
      vec3 trd = refract(rd, n, 1.0/uIor);
      if (dot(trd, trd) < 1e-4){ col = filteredSky(R, rough, gSeaBody) + glint; }
      else {
        vec3 ro = sp + trd*0.04;
        float tF; vec3 fp;
        float gap = max(sp.y - floorRel(q), 0.01);
        floorHit = traceFloor(ro, trd, uMaxFloorTrace, tF, fp);
        pathLen = floorHit ? tF : min(uMaxFloorTrace, gap/max(-trd.y, 0.025));
        // What the refracted ray meets in the scene (seabed terrain, submerged hulls, a sunk
        // ball): march it through the scene depth — the first surface it passes behind is what
        // this pixel sees through the water, refined by bisection.
        vec3 sceneRcv = vec3(-1.0);
        if (uHasScene == 1){
          vec3 cs = viewOf(sp);
          float surfLin = linDepth(cs.z*0.5 + 0.5);
          vec2 uv0 = cs.xy*0.5 + 0.5;
          const int NS = 16;
          float tPrev = 0.0;
          bool hit = false, hidden = false;
          for (int k = 1; k <= NS; k++){
            float t = pathLen*float(k)/float(NS);
            vec3 ck = viewOf(ro + trd*t);
            vec2 uk = ck.xy*0.5 + 0.5;
            if (any(lessThan(uk, vec2(0.0))) || any(greaterThan(uk, vec2(1.0)))) break;
            float zS = texture(uSceneDepth, uk).r;
            float sLin = linDepth(zS), rLin = linDepth(ck.z*0.5 + 0.5);
            float slack = 0.02*rLin + 0.3;
            // A body in front of this water pixel hides the sample: it is not what we see.
            if (zS < 1.0 && sLin <= surfLin + 0.05){ hidden = true; tPrev = t; continue; }
            if (zS < 1.0 && hidden && sLin < rLin + slack){
              // The crossing happened behind the foreground body: take the first visible
              // sample past it (the same seabed, a step further on; nearest texel, no rim).
              sceneRcv = texelFetch(uSceneColor, ivec2(uk*vec2(textureSize(uSceneColor, 0))), 0).rgb;
              floorHit = true; hit = true;
              break;
            }
            // Passed behind a scene surface that is itself under the water.
            // (Behind by less than a step plus a body's thickness: a ray that grazes a ball's cap
            // between two samples still finds it.)
            if (zS < 1.0 && sLin < rLin + slack && rLin - sLin < pathLen/float(NS) + slack + 0.6){
              float t0 = tPrev, t1 = t;
              for (int b = 0; b < 4; b++){
                float tm = 0.5*(t0 + t1);
                vec3 cm = viewOf(ro + trd*tm);
                float zm = texture(uSceneDepth, cm.xy*0.5 + 0.5).r;
                float sm = linDepth(zm), rm = linDepth(cm.z*0.5 + 0.5);
                if (zm < 1.0 && sm > surfLin + 0.05 && sm < rm + 0.02*rm + 0.05) t1 = tm; else t0 = tm;
              }
              vec3 ch = viewOf(ro + trd*t1);
              vec2 uh = ch.xy*0.5 + 0.5;
              float rh = linDepth(ch.z*0.5 + 0.5), sh = linDepth(texture(uSceneDepth, uh).r);
              // A true crossing converges onto the surface; a ray that passed over a body's
              // top converges onto its silhouette, still well behind it — keep marching.
              if (rh - sh < 0.12 + 0.01*rh){
                sceneRcv = texture(uSceneColor, uh).rgb;
                pathLen = t1;
                floorHit = true; hit = true;
                break;
              }
            }
            tPrev = t;
          }
          // The path's end hidden by a body in front of this water: step back toward the
          // unrefracted view for an unoccluded sample of the same seabed (no body-shaped
          // ghost stamped on the floor).
          if (!hit){
            // (A colour proxy only: the traced path still sets the attenuation.)
            vec3 cv = viewOf(ro + trd*pathLen);
            vec2 suv = cv.xy*0.5 + 0.5;
            float z0 = texture(uSceneDepth, clamp(suv, vec2(0.0), vec2(1.0))).r;
            if (hidden || (z0 < 1.0 && linDepth(z0) <= surfLin + 0.05)){
              for (int k = 1; k <= 4; k++){
                vec2 u = mix(suv, uv0, float(k)/4.0);
                float zS = texture(uSceneDepth, u).r;
                if (zS >= 1.0) break;
                if (linDepth(zS) <= surfLin + 0.05) continue;
                // Nearest texel, one further from the body's silhouette: bilinear filtering
                // there would blend the body's own colour back in as a rim.
                vec2 sz = vec2(textureSize(uSceneColor, 0));
                vec2 away = normalize(uv0 - suv + 1e-6)/sz;
                sceneRcv = texelFetch(uSceneColor, ivec2(clamp((u + 1.5*away)*sz, vec2(0.0), sz - 1.0)), 0).rgb;
                floorHit = true;
                break;
              }
            }
          }
          dbgScene = vec3(hit ? 1.0 : 0.0, sceneRcv.x >= 0.0 ? 1.0 : 0.0, surfLin/30.0);
        }
        float beam;
        inscatter = integrateVolume(ro, trd, pathLen, trans, beam);
        vec3 transmitted;
        if (floorHit && luma(trans) > uBottomThreshold){
          vec3 rcv = sceneRcv.x >= 0.0 ? sceneRcv : shadeReceiver(fp, floorNormal(fp.xz), caustic);
          transmitted = inscatter + trans*rcv;
        } else transmitted = inscatter + trans*vec3(0.0025, 0.010, 0.016)*gLight + msUpwelling();
        vec3 refl = filteredSky(R, rough, transmitted) + glint;
        col = mix(transmitted, refl, F);
        dbgRefl = refl; dbgTrans = transmitted; dbgF = F;
        // Aerated water under fresh foam glows milky turquoise (Foam Foundry).
        col += foam.z*(uSkyE + gSunE*max(uSunDir.y, 0.0))*vec3(0.035, 0.085, 0.085)*(1.0 - F);
      }
      if (uHasAerial == 0) col = mix(col, hazeColor(rd), (1.0 - exp(-dist*0.00028))*uAerialStrength);
    }
    // ── mid / far / horizon lanes ──
    if (rd.y < 0.0 && tSea > 0.0){
      float d = hitS ? dist : min(tSea, uFarHorizon);
      vec2 lq = hitS ? q : qSea;
      float lfp = hitS ? max(footprint, fpSea) : fpSea;
      vec4 w = laneWeights(d);
      if (!nearWater){ w.x = 0.0; float s = w.y + w.z + w.w; w.yzw = s > 1e-4 ? w.yzw/s : vec3(1.0, 0.0, 0.0); }
      float lw = 1.0 - w.x;
      if (lw > 1e-4){
        vec3 g1, g2, g3;
        vec3 c1 = laneColor(rd, lq, d, lfp, uLaneMid, g1);
        vec3 c2 = laneColor(rd, lq, d, lfp, uLaneFar, g2);
        vec3 c3 = laneColor(rd, lq, d, lfp, uLaneHorizon, g3);
        float s = max(w.y + w.z + w.w, 1e-6);
        vec3 lc = (c1*w.y + c2*w.z + c3*w.w)/s;
        col = col*w.x + lc*lw;
      }
      if (!hitS){ sp = rd*d; dist = d; }
    }
    // ── foam (whitecaps, interaction, surf) ──
    if (foam.x > 0.004){
      vec2 fq = (q + uCamOffset[0])*1.1;
      float cover = foamTopology(fq, foam.x, foam.y, footprint);
      float ndl = max(dot(n, uSunDir), 0.0);
      vec3 foamCol = 0.82*(gSunE*(0.25 + 0.75*ndl) + uSkyE)/PI*mix(1.0, 0.86, foam.y);
      col = mix(col, foamCol, cover*0.92*(1.0 - smoothstep(4000.0, 12000.0, dist)));
    }
    // Aerial perspective: the Nimbus atmosphere between the eye and the sea (any altitude).
    if (uHasAerial == 1){
      vec4 ap = texture(uAerial, vUv);
      col = col*pow(vec3(max(ap.a, 0.0)), uAerialK) + ap.rgb;
    }
    // Weather haze (rain curtains, overcast murk) beyond the clear-air atmosphere.
    col = mix(hazeColor(rd), col, exp(-dist*uFogDensity));
  } else {
    // ── seen from below: Snell's window, total internal reflection, attenuation ──
    vec3 V = -rd; vec3 nd = -n;
    float cosI = max(dot(nd, V), 0.0);
    vec3 Tdir = refract(rd, nd, uIor);
    float F = dot(Tdir, Tdir) < 1e-6 ? 1.0 : fresnelDielectric(cosI, uIor, 1.0);
    vec3 skyT = dot(Tdir, Tdir) < 1e-6 ? vec3(0.0) : filteredSky(normalize(Tdir), 0.085, gSeaBody)*vec3(0.8, 1.0, 1.1);
    vec3 body = vec3(0.004, 0.018, 0.032)*gLight;
    float bm;
    vec3 L = integrateVolume(vec3(0.0), rd, dist, trans, bm);
    col = L + trans*mix(skyT, body, F);
  }

  if (uDebug == 1) col = n*0.5 + 0.5;
  else if (uDebug == 2){ vec4 w = laneWeights(dist); col = w.x*vec3(0.05, 0.72, 1.0) + w.y*vec3(0.12, 0.92, 0.42) + w.z*vec3(1.0, 0.52, 0.08) + w.w*vec3(0.64, 0.24, 1.0); }
  else if (uDebug == 3) col = vec3(sqrt(max(mom.w, 0.0))*4.0, sqrt(max(mom.w, 0.0))*2.2, 0.15);
  else if (uDebug == 4) col = vec3(foam.x, foam.z*0.5, foam.y);
  else if (uDebug == 5) col = foam.w > 1.0 ? vec3(1.0, 0.1, 0.05) : vec3(sat(foam.w));
  else if (uDebug == 6){
    // Tier view: interaction tiles (T3) over the spectral sea (T0); the scheduler adds its map here.
    vec3 tf = tileField(q);
    col = mix(col*0.35, tierColor(3.0), sat(abs(tf.x)*6.0 + length(tf.yz)*4.0));
  }
  else if (uDebug == 7) col = vec3(shoreW, floorHit ? 0.6 : 0.0, luma(trans));
  else if (uDebug == 8) col = dbgRefl;
  else if (uDebug == 9) col = dbgTrans*10.0;
  else if (uDebug == 10) col = vec3(dbgF);
  else if (uDebug == 11) col = dbgScene;
  vec4 clip = uViewProj*vec4(sp, 1.0);
  gl_FragDepth = clamp(clip.z/clip.w*0.5 + 0.5, 0.0, 0.999999);
  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;
