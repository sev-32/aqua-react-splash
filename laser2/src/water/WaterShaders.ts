// GLSL for the native ocean surface and the HDR scene composite.
//
// The surface evaluates exactly the Gerstner components used by the CPU physics
// field (plus short-wavelength detail components that only affect shading),
// so the rendered waterline is the one the hull floats in.

export const MAX_WAVES = 128;

export const WATER_VERTEX_SHADER = /* glsl */ `
precision highp float;
#define MAX_WAVES ${MAX_WAVES}
// Row 0: dirX, dirZ, k, omega. Row 1: amplitude, steepness, phase, unused.
uniform highp sampler2D uWaves;
uniform int uWaveCount;
uniform float uTime;
uniform float uSeaLevel;
uniform vec3 uGridCenter;
uniform float uFarFade;
attribute float spacing;
varying vec3 vWorld;
varying vec2 vBase;
varying float vSpacing;
varying float vViewDepth;

void main() {
  vec2 base = uGridCenter.xz + position.xz;
  float dist = length(position.xz);
  vec3 p = vec3(base.x, uSeaLevel, base.y);
  // Distance fade of all displacement towards the horizon skirt.
  float farFade = 1.0 - smoothstep(uFarFade * 0.55, uFarFade, dist);
  for (int i = 0; i < MAX_WAVES; i++) {
    if (i >= uWaveCount) break;
    vec4 a = texelFetch(uWaves, ivec2(i, 0), 0);
    vec4 b = texelFetch(uWaves, ivec2(i, 1), 0);
    float lambda = 6.28318530718 / a.z;
    // A component needs ~4 vertices per wavelength; fade it on coarser rings.
    float lod = smoothstep(2.6 * spacing, 5.2 * spacing, lambda) * farFade;
    if (lod <= 0.0) continue;
    float th = a.z * dot(a.xy, base) - a.w * uTime + b.z;
    float s = sin(th);
    float c = cos(th);
    float qa = b.y * b.x * lod;
    p.x += qa * a.x * c;
    p.z += qa * a.y * c;
    p.y += b.x * s * lod;
  }
  vWorld = p;
  vBase = base;
  vSpacing = spacing;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const WATER_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
#define MAX_WAVES ${MAX_WAVES}
#include <common>
#include <packing>
uniform highp sampler2D uWaves;
uniform int uWaveCount;
uniform float uTime;
uniform float uSeaLevel;
uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec3 uSunIrradiance;     // renderer units (directional light colour × intensity)
uniform vec3 uSkyIrradiance;     // renderer units, horizontal receiver
uniform sampler2D uSkyLut;
uniform float uSkyLutRange;
uniform float uSkyEnabled;
uniform sampler2D uSceneColor;
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec3 uAbsorption;        // 1/m
uniform vec3 uScattering;        // 1/m (total)
uniform vec3 uBackscatter;       // backscattering coefficient b_b, 1/m
uniform float uRefractionStrength;
uniform float uMicroRoughness;
uniform float uWindSpeed;
uniform float uFoamAmount;
uniform sampler2D uFoamMap;
uniform vec4 uFoamRegion;        // originX, originZ, size, enabled
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform vec2 uShadowMapSize;
uniform float uShadowBias;
uniform float uShadowEnabled;
uniform vec3 uAerialColor;
uniform float uAerialDensity;
uniform float uAerialEnabled;
uniform float uFarFade;
varying vec3 vWorld;
varying vec2 vBase;
varying float vSpacing;
varying float vViewDepth;

vec2 dirToEquirect(vec3 d) {
  d = normalize(d);
  return vec2(atan(d.x, d.z) / 6.28318530718 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
}

vec3 skyRadiance(vec3 d) {
  vec3 dir = d;
  dir.y = max(dir.y, 0.012);
  vec3 c = texture2D(uSkyLut, dirToEquirect(dir)).rgb * uSkyLutRange;
  if (uSkyEnabled < 0.5) c = mix(vec3(0.04, 0.08, 0.16), vec3(0.32, 0.48, 0.72), smoothstep(-0.1, 0.7, dir.y));
  return c;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

float shadowAt(vec3 world) {
  if (uShadowEnabled < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(world, 1.0);
  sc.xyz /= sc.w;
  if (sc.x <= 0.0 || sc.x >= 1.0 || sc.y <= 0.0 || sc.y >= 1.0 || sc.z >= 1.0) return 1.0;
  vec2 texel = 1.0 / uShadowMapSize;
  float lit = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      float d = unpackRGBAToDepth(texture2D(uShadowMap, sc.xy + vec2(float(x), float(y)) * texel * 1.5));
      lit += step(sc.z - uShadowBias, d);
    }
  }
  return lit / 9.0;
}

float linearViewDepth(float depth) {
  return -perspectiveDepthToViewZ(depth, uCameraNear, uCameraFar);
}

void main() {
  vec3 V = normalize(uCameraPos - vWorld);
  float dist = length(uCameraPos - vWorld);
  // Pixel footprint in world units (for per-component filtering).
  float footprint = max(length(fwidth(vWorld.xz)), 1e-4);
  float farFade = 1.0 - smoothstep(uFarFade * 0.55, uFarFade, length(vWorld.xz - uCameraPos.xz));

  // Analytic Gerstner derivatives at the rest position.
  float dxa = 0.0, dxb = 0.0, dza = 0.0, dzb = 0.0, dha = 0.0, dhb = 0.0;
  float unresolved = 0.0;
  float crestHeight = 0.0;
  for (int i = 0; i < MAX_WAVES; i++) {
    if (i >= uWaveCount) break;
    vec4 a = texelFetch(uWaves, ivec2(i, 0), 0);
    vec4 b = texelFetch(uWaves, ivec2(i, 1), 0);
    float lambda = 6.28318530718 / a.z;
    float w = smoothstep(1.5 * footprint, 4.0 * footprint, lambda) * farFade;
    float ka = a.z * b.x;
    unresolved += 0.5 * ka * ka * (1.0 - w);
    if (w <= 0.0) continue;
    float th = a.z * dot(a.xy, vBase) - a.w * uTime + b.z;
    float s = sin(th), c = cos(th);
    float qka = b.y * ka * w;
    dxa -= qka * a.x * a.x * s;
    dxb -= qka * a.x * a.y * s;
    dza -= qka * a.x * a.y * s;
    dzb -= qka * a.y * a.y * s;
    dha += ka * a.x * c * w;
    dhb += ka * a.y * c * w;
    crestHeight += b.x * s * w;
  }
  vec3 Ta = vec3(1.0 + dxa, dha, dza);
  vec3 Tb = vec3(dxb, dhb, 1.0 + dzb);
  vec3 N = normalize(cross(Tb, Ta));
  if (N.y < 0.0) N = -N;
  float jacobian = (1.0 + dxa) * (1.0 + dzb) - dxb * dza;

  // Capillary detail normal (fades with distance).
  float detailFade = exp(-dist * 0.045);
  vec2 wind = vec2(0.7, 0.4) * uTime * (0.2 + 0.03 * uWindSpeed);
  float e = 0.08;
  vec2 q = vWorld.xz * 2.3 + wind;
  float n0 = valueNoise(q), nx = valueNoise(q + vec2(e, 0.0)), nz = valueNoise(q + vec2(0.0, e));
  vec2 q2 = vWorld.xz * 6.1 - wind * 1.7;
  float m0 = valueNoise(q2), mx = valueNoise(q2 + vec2(e, 0.0)), mz = valueNoise(q2 + vec2(0.0, e));
  vec2 slope = vec2(nx - n0, nz - n0) / e * 0.018 + vec2(mx - m0, mz - m0) / e * 0.008;
  N = normalize(N + vec3(-slope.x, 0.0, -slope.y) * detailFade * (0.5 + 0.06 * uWindSpeed));

  float NdotV = max(dot(N, V), 1e-4);
  // Exact dielectric Fresnel (air → water, n = 1.333).
  float cosi = NdotV;
  float eta = 1.0 / 1.333;
  float sint2 = eta * eta * (1.0 - cosi * cosi);
  float fresnel = 1.0;
  if (sint2 < 1.0) {
    float cost = sqrt(1.0 - sint2);
    float rs = (cosi - 1.333 * cost) / (cosi + 1.333 * cost);
    float rp = (1.333 * cosi - cost) / (1.333 * cosi + cost);
    fresnel = 0.5 * (rs * rs + rp * rp);
  }

  // Reflection of the atmosphere.
  vec3 R = reflect(-V, N);
  vec3 reflected = skyRadiance(R);

  // Sun glitter: GGX with roughness from unresolved wave slope + wind chop.
  float alpha = clamp(sqrt(unresolved + uMicroRoughness * uMicroRoughness), 0.015, 0.6);
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float a2 = alpha * alpha;
  float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159265359 * denom * denom);
  float k = alpha * 0.5;
  float G = (NdotL / (NdotL * (1.0 - k) + k)) * (NdotV / (NdotV * (1.0 - k) + k));
  float VdotH = max(dot(V, H), 0.0);
  float Fsun = 0.0204 + (1.0 - 0.0204) * pow(1.0 - VdotH, 5.0);
  float shadow = shadowAt(vWorld);
  vec3 glitter = uSunIrradiance * (D * G * Fsun / max(4.0 * NdotV, 1e-3)) * shadow * step(0.0, L.y);

  // Refraction: sample the opaque scene through the surface.
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec2 offset = N.xz * uRefractionStrength / max(1.0, vViewDepth * 0.25);
  vec2 refrUv = clamp(screenUv + offset, vec2(0.001), vec2(0.999));
  float sceneDepth = linearViewDepth(texture2D(uSceneDepth, refrUv).x);
  if (sceneDepth < vViewDepth) {
    // Refracted sample lies in front of the water: use the undistorted pixel.
    refrUv = screenUv;
    sceneDepth = linearViewDepth(texture2D(uSceneDepth, refrUv).x);
  }
  float rawDepth = texture2D(uSceneDepth, refrUv).x;
  float waterPath = rawDepth >= 0.99999 ? 1e4 : max(0.0, sceneDepth - vViewDepth);
  vec3 sigmaT = uAbsorption + uScattering;
  vec3 transmittance = exp(-sigmaT * waterPath);
  vec3 behind = texture2D(uSceneColor, refrUv).rgb;

  // Water-leaving radiance of an optically deep column: remote-sensing
  // reflectance from the inherent optical properties (Lee et al. 1999)
  // times the downwelling irradiance on the surface. A shallow column in front
  // of submerged geometry contributes in proportion to its opacity.
  float sunBelow = max(uSunDir.y, 0.0);
  vec3 downwelling = uSunIrradiance * sunBelow * shadow + uSkyIrradiance;
  vec3 u = uBackscatter / max(uAbsorption + uBackscatter, vec3(1e-5));
  vec3 rrsBelow = (0.084 + 0.17 * u) * u;
  vec3 rrs = 0.52 * rrsBelow / (1.0 - 1.7 * rrsBelow);
  vec3 inScatter = downwelling * rrs;
  // Sunlit crests are thin: forward-scattered light glows through them.
  float thin = clamp(crestHeight * 1.8 + 0.25, 0.0, 1.0);
  // Looking towards the sun through a crest (viewer on the far side).
  vec3 Lh = normalize(vec3(L.x, 0.0, L.z) + vec3(1e-5));
  vec3 Vh = normalize(vec3(V.x, 0.0, V.z) + vec3(1e-5));
  float forward = pow(max(dot(Vh, -Lh), 0.0), 3.0) * smoothstep(0.0, 0.35, L.y);
  vec3 crestGlow = uSunIrradiance * shadow * forward * thin * vec3(0.05, 0.28, 0.24) * 0.08;
  vec3 underwater = behind * transmittance + inScatter * (1.0 - transmittance) + crestGlow;

  vec3 color = mix(underwater, reflected, fresnel) + glitter;

  // Whitecaps (compressed crests) and interaction foam.
  float foam = smoothstep(0.62, 0.22, jacobian) * uFoamAmount;
  if (uFoamRegion.w > 0.5) {
    vec2 fuv = (vWorld.xz - uFoamRegion.xy) / uFoamRegion.z;
    foam += texture2D(uFoamMap, fuv).r;
  }
  float breakup = valueNoise(vWorld.xz * 3.7 + wind * 0.3) * 0.6 + valueNoise(vWorld.xz * 11.0) * 0.4;
  foam = clamp(foam * smoothstep(0.25, 0.75, breakup + foam * 0.35), 0.0, 1.0) * detailFade * 1.2;
  vec3 foamColor = (uSunIrradiance * max(dot(N, L), 0.0) * shadow + uSkyIrradiance) * 0.8 / 3.14159265359;
  color = mix(color, foamColor, clamp(foam, 0.0, 0.95));

  // Aerial perspective (same law as the Foundry material patch).
  float aerial = exp(-max(0.0, uAerialDensity) * dist);
  color = mix(uAerialColor, color, mix(1.0, aerial, uAerialEnabled));

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const COMPOSITE_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform sampler2D uColor;
uniform sampler2D uDepth;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uColor, vUv);
  gl_FragDepth = texture2D(uDepth, vUv).x;
  gl_FragColor = vec4(min(c.rgb, vec3(60000.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
