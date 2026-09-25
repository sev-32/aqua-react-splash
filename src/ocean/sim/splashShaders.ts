/**
 * GLSL for drawing the T4 MLS-MPM splash (particles are simulated on the CPU in
 * sim/oceanMpm.ts and uploaded each frame into three RGBA32F textures):
 *   P: world position (m), 1 = live
 *   V: velocity (m/s), droplet radius (m): < 1.2 mm = fine spray
 *   M: water volume the sample carries (m³), age (s), kind (0 particle, 1 ligament), seed
 */

/** Whitewater points: soft, lit parcels of spray. */
export const SPLASH_POINT_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uP, uV, uM;
uniform int uW;
uniform mat4 uViewProj;
uniform vec3 uCam;               // camera position relative to the splash origin
uniform float uViewportH, uProjY;
uniform float uSizeGain;
uniform float uSprayOnly;        // 1: only fine spray (droplets < 1.2 mm) — the sheet goes to the fluid pass
out vec4 vData;                  // x: alpha, y: speed, z: age01, w: droplet radius
out vec3 vRel;
void main(){
  ivec2 c = ivec2(gl_VertexID % uW, gl_VertexID / uW);
  vec4 P = texelFetch(uP, c, 0);
  if (P.w <= 0.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vData = vec4(0.0); vRel = vec3(0.0); return; }
  vec4 V = texelFetch(uV, c, 0), M = texelFetch(uM, c, 0);
  if (uSprayOnly > 0.5 && V.w > 0.0012){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vData = vec4(0.0); vRel = vec3(0.0); return; }
  vec3 rel = P.xyz - uCam;
  vec4 clip = uViewProj*vec4(rel, 1.0);
  // A parcel spreads as it flies: its radius grows from the droplet cloud's initial size.
  // Coherent water (dense) renders at its sheet thickness; water that has broken up into
  // isolated drops (low MPM density) shrinks toward droplet size — the pool's metaball
  // strength followed density the same way.
  float coh = M.z < 0.0 ? 1.0 : smoothstep(0.15, 0.9, M.z);
  float r = uSizeGain*pow(max(M.x, 1e-7), 1.0/3.0)*mix(0.35, 1.05, coh);
  gl_Position = clip;
  gl_PointSize = clamp(r*uViewportH*uProjY/max(clip.w, 0.05), 1.0, 96.0);
  float fadeIn = smoothstep(0.0, 0.06, M.y), fadeOut = smoothstep(0.0, 0.25, P.w);
  vData = vec4(fadeIn*fadeOut, length(V.xyz), clamp(M.y/1.5, 0.0, 1.0), V.w);
  vRel = rel;
}`;

export const SPLASH_POINT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vData;
in vec3 vRel;
out vec4 o;
uniform vec3 uSunDir, uSunE, uSkyE;
uniform float uFogDensity;
uniform vec3 uHaze;
uniform float uOpacity;
void main(){
  vec2 d = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  // Parcel of droplets: dense core, feathered edge; normals of a soft sphere.
  float dens = (1.0 - r2)*(1.0 - r2);
  vec3 n = normalize(vec3(d.x, -d.y, sqrt(max(1.0 - r2, 0.0))));
  vec3 V = normalize(-vRel);
  // Orient the sprite normal to face the camera.
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), V) + 1e-5);
  vec3 up = cross(V, right);
  vec3 N = normalize(right*n.x + up*n.y + V*n.z);
  float ndl = max(dot(N, uSunDir), 0.0)*0.7 + 0.3;
  // Forward scattering through droplets brightens spray against the sun.
  float fwd = pow(max(dot(-V, uSunDir), 0.0), 6.0);
  vec3 col = 0.9*(uSunE*(ndl + 1.8*fwd) + uSkyE*1.1)/3.14159;
  float a = clamp(dens*vData.x*uOpacity*(0.35 + 0.65*(1.0 - vData.z)), 0.0, 1.0);
  float fog = exp(-length(vRel)*uFogDensity);
  col = mix(uHaze, col, fog);
  o = vec4(col*a, a);
}`;

/**
 * Screen-space fluid (dense splashes: crowns, sheets). Pass 1 renders sphere
 * depth (min) and thickness (additive) of every parcel; pass 2 smooths the
 * depth bilaterally; pass 3 reconstructs normals and shades the sheet as
 * water: Fresnel reflection of the sky, refraction of the scene behind through
 * Beer-attenuated thickness, whitening where the sheet is aerated (fast, young).
 */
/** Half-resolution passes test visibility against the full-resolution scene depth by hand. */
const OCCLUDE_GLSL = /* glsl */ `
uniform sampler2D uSceneDepth;
uniform mat4 uInvViewProj;
uniform vec2 uHalfSize;
bool occluded(float dist){
  vec2 uv = gl_FragCoord.xy/uHalfSize;
  float z = texture(uSceneDepth, uv).r;
  if (z >= 1.0) return false;
  vec4 p = uInvViewProj*vec4(uv*2.0 - 1.0, z*2.0 - 1.0, 1.0);
  return dist > length(p.xyz/p.w) + 0.05;
}
`;

export const FLUID_DEPTH_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vData;
in vec3 vRel;
layout(location=0) out vec4 oDepth;   // x: view distance (min via blending MIN), y: -, z: aeration
uniform float uThickGain;
${OCCLUDE_GLSL}
void main(){
  vec2 d = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float dist = length(vRel);
  if (occluded(dist)) discard;
  oDepth = vec4(dist - sqrt(1.0 - r2)*0.3, 0.0, 0.0, 1.0);
}`;

export const FLUID_THICK_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vData;
in vec3 vRel;
out vec4 o;                            // r: thickness (m), g: aeration·thickness, b: count
uniform float uThickGain;
${OCCLUDE_GLSL}
void main(){
  vec2 d = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  if (occluded(length(vRel))) discard;
  float t = sqrt(1.0 - r2)*uThickGain*vData.x;
  // Splash water is aerated: jets glassy only at their fastest core, sheets whitening with
  // speed and shear, everything still carrying entrained air.
  float aer = 0.45 + 0.5*smoothstep(3.0, 10.0, vData.y)*(1.0 - 0.6*vData.z);
  o = vec4(t, t*aer, 1.0, 1.0);
}`;

export const FLUID_BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uDir;
void main(){
  vec4 c = texture(uSrc, vUv);
  if (c.x > 5e4){ o = c; return; }
  float sum = 0.0, wsum = 0.0;
  for (int i = -10; i <= 10; i++){
    float z = texture(uSrc, vUv + uDir*float(i)*1.5).x;
    if (z > 5e4) continue;
    float w = exp(-float(i*i)/40.0)*exp(-pow((z - c.x)/(0.05*c.x + 0.3), 2.0));
    sum += z*w; wsum += w;
  }
  o = vec4(sum/max(wsum, 1e-5), c.yzw);
}`;

/** Plain separable Gaussian (thickness / aeration are extensive: smooth, don't clip). */
export const FLUID_GBLUR_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uDir;
void main(){
  vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = -8; i <= 8; i++){
    float w = exp(-float(i*i)/24.0);
    acc += texture(uSrc, vUv + uDir*float(i)*1.5)*w; ws += w;
  }
  o = acc/ws;
}`;

export const FLUID_SHADE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uDepth, uThick, uScene, uEnv;
uniform mat4 uInvViewProj;
uniform vec2 uTexel;
uniform vec3 uSunDir, uSunE, uSkyE, uAbsorb, uBody;
uniform float uEnvLevels;
#ifndef PI
#define PI 3.14159265358979
#endif
vec2 dirToEquirect(vec3 d){ return vec2(atan(d.z, d.x)/(2.0*PI) + 0.5, 1.0 - acos(clamp(d.y, -1.0, 1.0))/PI); }
vec3 viewPos(vec2 uv, float dist){
  vec4 p = uInvViewProj*vec4(uv*2.0 - 1.0, 1.0, 1.0);
  return normalize(p.xyz/p.w)*dist;
}
void main(){
  float z = texture(uDepth, vUv).x;
  vec3 th = texture(uThick, vUv).rgb;
  if (z > 5e4 || th.b < 0.05) discard;
  vec3 P = viewPos(vUv, z);
  float zx1 = texture(uDepth, vUv + vec2(uTexel.x, 0.0)).x, zx0 = texture(uDepth, vUv - vec2(uTexel.x, 0.0)).x;
  float zy1 = texture(uDepth, vUv + vec2(0.0, uTexel.y)).x, zy0 = texture(uDepth, vUv - vec2(0.0, uTexel.y)).x;
  vec3 dx = abs(zx1 - z) < abs(z - zx0) && zx1 < 5e4 ? viewPos(vUv + vec2(uTexel.x, 0.0), zx1) - P : P - viewPos(vUv - vec2(uTexel.x, 0.0), zx0);
  vec3 dy = abs(zy1 - z) < abs(z - zy0) && zy1 < 5e4 ? viewPos(vUv + vec2(0.0, uTexel.y), zy1) - P : P - viewPos(vUv - vec2(0.0, uTexel.y), zy0);
  vec3 N = normalize(cross(dy, dx));
  vec3 V = normalize(-P);
  if (dot(N, V) < 0.0) N = -N;
  float cosI = max(dot(N, V), 0.0);
  float F = 0.02 + 0.6*pow(1.0 - cosI, 5.0);   // soft rims: the smoothed sheet is not a clean interface
  vec3 R = reflect(-V, N);
  vec3 refl = textureLod(uEnv, dirToEquirect(normalize(vec3(R.x, abs(R.y), R.z))), 1.0).rgb;
  float thick = th.r;
  vec2 off = N.xy*0.03*clamp(thick, 0.0, 1.0);
  vec3 behind = texture(uScene, vUv + off).rgb;
  vec3 T = exp(-uAbsorb*thick*2.0);
  vec3 body = (uSkyE*0.93 + uSunE*max(uSunDir.y, 0.0))*uBody/PI;   // the sea's own upwelling colour
  vec3 water = mix(behind*T + body*(1.0 - T), refl, F);
  water += uSunE*pow(max(dot(R, uSunDir), 0.0), 400.0)*2.0;
  // Aerated sheet → white water.
  float aer = clamp(th.g/max(thick, 1e-4), 0.0, 1.0);
  vec3 white = 0.85*(uSunE*(0.4 + 0.6*max(dot(N, uSunDir), 0.0)) + uSkyE)/PI;
  vec3 col = mix(water, white, smoothstep(0.3, 0.85, aer));
  float alpha = smoothstep(0.01, 0.09, thick);
  o = vec4(col, alpha);
}`;
