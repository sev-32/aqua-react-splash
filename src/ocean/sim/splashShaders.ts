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
out vec4 vData;                  // x: alpha, y: speed, z: age01, w: coherence
out vec3 vRel;
out vec2 vSplat;                 // world radius of the parcel (m), water volume it carries (m³)
void main(){
  ivec2 c = ivec2(gl_VertexID % uW, gl_VertexID / uW);
  vec4 P = texelFetch(uP, c, 0);
  vSplat = vec2(1.0, 0.0);
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
  vData = vec4(fadeIn*fadeOut, length(V.xyz), clamp(M.y/1.5, 0.0, 1.0), coh);
  vRel = rel;
  vSplat = vec2(max(r, 1e-4), max(M.x, 0.0));
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
in vec2 vSplat;
layout(location=0) out vec4 oDepth;   // x: view distance (min via blending MIN), y: -, z: aeration
uniform float uThickGain;
${OCCLUDE_GLSL}
void main(){
  vec2 d = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float dist = length(vRel);
  if (occluded(dist)) discard;
  // The parcel's own front surface: a sphere of its render radius (a fixed bulge larger than
  // the parcel made every particle a bump, and the sun glinted off each one).
  oDepth = vec4(dist - sqrt(1.0 - r2)*vSplat.x, 0.0, 0.0, 1.0);
}`;

export const FLUID_THICK_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vData;
in vec3 vRel;
in vec2 vSplat;
out vec4 o;                            // r: water path (m), g: aeration·path, b: count
uniform float uThickGain;
${OCCLUDE_GLSL}
void main(){
  vec2 d = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  if (occluded(length(vRel))) discard;
  // Volume-conserving splat: the profile 1.5·√(1−ρ²)·V/(πr²) integrates to the parcel's
  // volume V over its disc, so overlapping splats sum to the water's path along the view
  // ray — a 4 cm crown wall reads 4 cm face-on and more at grazing incidence.
  float t = 1.5*sqrt(1.0 - r2)*vSplat.y/(3.14159265*vSplat.x*vSplat.x)*uThickGain*vData.x;
  // The pool's splash was clear water: coherent sheets and jets stay glassy. Air is only
  // entrained where the fluid is tearing apart (low MPM density) and in violent shear.
  float aer = 0.75*(1.0 - vData.w) + 0.25*smoothstep(8.0, 16.0, vData.y);
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
uniform sampler2D uSeaPos;      // sea G-buffer (camera-relative position, a = valid): soft contact
uniform int uHasSea;
uniform mat4 uInvViewProj;
uniform vec2 uTexel;
uniform vec3 uSunDir, uSunE, uSkyE, uAbsorb, uScatter, uBackscatter;
uniform float uEnvLevels, uIor;
#ifndef PI
#define PI 3.14159265358979
#endif
vec2 dirToEquirect(vec3 d){ return vec2(atan(d.z, d.x)/(2.0*PI) + 0.5, 1.0 - acos(clamp(d.y, -1.0, 1.0))/PI); }
vec3 viewPos(vec2 uv, float dist){
  vec4 p = uInvViewProj*vec4(uv*2.0 - 1.0, 1.0, 1.0);
  return normalize(p.xyz/p.w)*dist;
}
// ── the sea's optics (render/oceanShaders.ts), so a splash is the same water ──
float fresnelDielectric(float ci, float ei, float et){
  float c = clamp(ci, 0.0, 1.0);
  float st = ei/et*sqrt(max(0.0, 1.0 - c*c)); if (st >= 1.0) return 1.0;
  float ct = sqrt(max(0.0, 1.0 - st*st));
  float rs = (et*c - ei*ct)/max(et*c + ei*ct, 1e-6), rp = (ei*c - et*ct)/max(ei*c + et*ct, 1e-6);
  return 0.5*(rs*rs + rp*rp);
}
vec3 envLod(vec3 d, float lod){ return textureLod(uEnv, dirToEquirect(d), clamp(lod, 0.0, uEnvLevels - 1.0)).rgb; }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
/** Upward: the Nimbus sky. Downward: the sea around the splash (its own colour, from the frame) + the sky mirrored at grazing. */
vec3 skyOrSea(vec3 r, float lod, vec3 sea){
  if (r.y >= 0.0) return envLod(r, lod);
  return mix(sea, envLod(vec3(r.x, -r.y, r.z), lod), fresnelDielectric(-r.y, 1.0, uIor));
}
/** Fluid depth at uv from the nearest valid half-res texel (bilinear across the empty sentinel would invent geometry). */
float fluidDepth(vec2 uv){
  vec2 hp = uv/uTexel - 0.5;
  ivec2 c = ivec2(floor(hp));
  vec2 f = fract(hp);
  float z = 6e4, best = 1e9;
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++){
    float zz = texelFetch(uDepth, c + ivec2(i, j), 0).x;
    float w = length(vec2(float(i), float(j)) - f);
    if (zz < 5e4 && w < best){ best = w; z = zz; }
  }
  return z;
}
float hgW(float mu, float g){ float g2 = g*g; return (1.0 - g2)/(4.0*PI*pow(max(1.0 + g2 - 2.0*g*mu, 1e-4), 1.5)); }
/** Single scattering of sun + sky through L metres of the sheet (POSEIDON phase, g = 0.74). */
vec3 sheetColumn(vec3 trd, float L, out vec3 T){
  vec3 sigT = uAbsorb + uScatter;
  float Bg = (1.0 - 0.74)/(2.0*0.74)*((1.0 + 0.74)/sqrt(1.0 + 0.74*0.74) - 1.0);
  vec3 src = uScatter*(hgW(dot(trd, uSunDir), 0.74)*uSunE*1.265 + uSkyE*0.934/0.8*Bg/(2.0*PI));
  T = exp(-sigT*L);
  return src*(1.0 - T)/max(sigT, vec3(1e-5));
}
void main(){
  vec3 th = texture(uThick, vUv).rgb;
  float z = fluidDepth(vUv);
  if (z > 5e4 || th.b < 0.02) discard;
  vec3 P = viewPos(vUv, z);
  float zx1 = fluidDepth(vUv + vec2(uTexel.x, 0.0)), zx0 = fluidDepth(vUv - vec2(uTexel.x, 0.0));
  float zy1 = fluidDepth(vUv + vec2(0.0, uTexel.y)), zy0 = fluidDepth(vUv - vec2(0.0, uTexel.y));
  vec3 dx = abs(zx1 - z) < abs(z - zx0) && zx1 < 5e4 ? viewPos(vUv + vec2(uTexel.x, 0.0), zx1) - P : P - viewPos(vUv - vec2(uTexel.x, 0.0), zx0);
  vec3 dy = abs(zy1 - z) < abs(z - zy0) && zy1 < 5e4 ? viewPos(vUv + vec2(0.0, uTexel.y), zy1) - P : P - viewPos(vUv - vec2(0.0, uTexel.y), zy0);
  vec3 N = normalize(cross(dy, dx));
  vec3 V = normalize(-P);
  if (dot(N, V) < 0.0) N = -N;
  float F = fresnelDielectric(max(dot(N, V), 0.0), 1.0, uIor);
  vec3 R = reflect(-V, N);
  float thick = th.r;
  // What lies behind the sheet (the sea, already shaded) seen through it, refracted: the
  // lateral shift of a ray through a water path L is ~L·(1 − 1/n), projected to the screen.
  vec2 off = N.xy*(1.0 - 1.0/uIor)*min(thick, 1.0)/max(z, 0.5)*0.9;
  vec3 behind = texture(uScene, vUv + off).rgb;
  // A smoothed fluid sheet is a little rough: reflect a slightly blurred sky, or the sea around it.
  vec3 refl = skyOrSea(R, 1.5, texture(uScene, vUv).rgb);
  vec3 H = normalize(V + uSunDir);
  float a2 = 0.012;
  float NoH = max(dot(N, H), 0.0), dd = NoH*NoH*(a2 - 1.0) + 1.0;
  refl += uSunE*min(a2/(PI*dd*dd), 60.0)*max(dot(N, uSunDir), 0.0)*0.25;
  vec3 trd = refract(-V, N, 1.0/uIor);
  if (dot(trd, trd) < 1e-6) trd = -N;
  vec3 Tc;
  // The thickness buffer is the water path along the view ray (volume-conserving splats).
  vec3 column = sheetColumn(normalize(trd), min(thick, 3.0), Tc);
  vec3 water = mix(behind*Tc + column, refl, F);
  // Aerated water → white water (bubbles scatter all colours).
  float aer = clamp(th.g/max(thick, 1e-4), 0.0, 1.0);
  vec3 white = 0.85*(uSunE*(0.4 + 0.6*max(dot(N, uSunDir), 0.0)) + uSkyE)/PI;
  vec3 col = mix(water, white, smoothstep(0.3, 0.85, aer));
  // Coverage: wherever there is a film there is an interface; its see-through-ness is the
  // Fresnel/Beer optics above, not alpha. Only the last millimetres feather the edge.
  float alpha = smoothstep(0.0005, 0.004, thick);
  // Soft contact: where the sheet meets the sea it becomes the sea (no cut line).
  if (uHasSea == 1){
    vec4 sp = texture(uSeaPos, vUv);
    if (sp.a > 0.5) alpha *= smoothstep(0.0, 0.35, length(sp.xyz) - z);
  }
  o = vec4(col, alpha);
}`;
