/**
 * GLSL for drawing the T4 MLS-MPM splash (particles are simulated on the CPU in
 * sim/oceanMpm.ts and uploaded each frame into three RGBA32F textures):
 *   P: world position (m), 1 = live
 *   V: velocity (m/s), droplet radius (m): < 1.2 mm = fine spray
 *   M: water volume the sample carries (m³), age (s), kind (0 particle, 1 ligament), seed
 */


/**
 * Splash self-shadowing (opacity shadow map): the optical depth of the splash's drops and
 * bubbles accumulated from the sun in four slices; a point reads what lies between it and the
 * sun and receives the diffusion-limited sun, 2/(2 + (1 − g)τ) — soft, as in a cloud.
 */
export const OSM_GLSL = /* glsl */ `
uniform sampler2D uOsm; uniform int uHasOsm;
uniform vec3 uOsmC, uOsmU, uOsmV, uOsmD; uniform vec4 uOsmExt;   // centre, basis, (half-extent, -, d0, d1)
float osmSun(vec3 pw){
  if (uHasOsm == 0) return 1.0;
  vec3 q = pw - uOsmC;
  vec2 uv = vec2(dot(q, uOsmU), dot(q, uOsmV))/uOsmExt.x*0.5 + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 1.0;
  float x = 4.0*clamp((uOsmExt.w - dot(q, uOsmD))/max(uOsmExt.w - uOsmExt.z, 1e-3), 0.0, 1.0);
  vec4 t = textureLod(uOsm, uv, 0.0);
  float tau = x < 1.0 ? t.x*x : x < 2.0 ? mix(t.x, t.y, x - 1.0) : x < 3.0 ? mix(t.y, t.z, x - 2.0) : mix(t.z, t.w, x - 3.0);
  return 2.0/(2.0 + 0.15*tau);
}
`;

/** Opacity shadow map: every scattering parcel splatted from the sun, τ into four cumulative slices. */
export const SPLASH_OSM_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uP, uV, uM;
uniform int uW;
uniform vec3 uOsmC, uOsmU, uOsmV, uOsmD; uniform vec4 uOsmExt; uniform float uOsmSize;
out float vTau; out float vS;
void main(){
  ivec2 c = ivec2(gl_VertexID % uW, gl_VertexID / uW);
  vec4 P = texelFetch(uP, c, 0);
  vTau = 0.0; vS = 0.0;
  if (P.w <= 0.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  vec4 V = texelFetch(uV, c, 0), M = texelFetch(uM, c, 0);
  bool spray = V.w <= 0.0012;
  float coh = M.z < 0.0 ? 1.0 : smoothstep(0.15, 0.9, M.z);
  float aer = spray ? 1.0 : 0.35*(1.0 - coh)*smoothstep(4.0, 10.0, length(V.xyz));
  // Scattering cross-section (m²): drops 1.5V/r_d; aerated water ≈ 300 m⁻¹·V; clear water ~0.
  float sig = spray ? 1.5*M.x/V.w : 300.0*M.x*aer;
  float R = spray && coh < 0.5 ? min(max(1.2*pow(max(M.x, 1e-7), 1.0/3.0), 0.12) + 0.5*M.y, 3.0)
                               : 1.6*pow(max(M.x, 1e-7), 1.0/3.0)*mix(0.35, 1.05, coh);
  vec3 q = P.xyz - uOsmC;
  gl_Position = vec4(dot(q, uOsmU)/uOsmExt.x, dot(q, uOsmV)/uOsmExt.x, 0.0, 1.0);
  gl_PointSize = clamp(R/uOsmExt.x*uOsmSize, 1.0, 64.0);
  vTau = sig/(3.14159*R*R);
  vS = clamp((uOsmExt.w - dot(q, uOsmD))/max(uOsmExt.w - uOsmExt.z, 1e-3), 0.0, 1.0);
}`;
export const SPLASH_OSM_FS = /* glsl */ `#version 300 es
precision highp float;
in float vTau; in float vS;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0 || vTau <= 0.0) discard;
  // Column τ through the parcel here, counted in every slice boundary it lies in front of.
  o = 4.07*vTau*exp(-4.0*r2)*clamp((vec4(0.25, 0.5, 0.75, 1.0) - vS)*8.0 + 0.5, 0.0, 1.0);
}`;

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
uniform float uSprayOnly;        // 1: only atomized spray (droplets < 1.2 mm) — the sheet goes to the fluid pass
uniform float uSheetOnly;        // 1: only coherent water (the fluid passes) — spray is a cloud, not a surface
${OSM_GLSL}
out float vSun;                  // sun reaching this parcel through the rest of the splash
out vec4 vData;                  // x: alpha, y: aeration (1 = spray cloud), z: age01, w: coherence
out vec3 vRel;
out vec2 vSplat;                 // sheet: world radius (m), water volume (m³) · spray: cloud radius (m), mean optical depth
void main(){
  ivec2 c = ivec2(gl_VertexID % uW, gl_VertexID / uW);
  vec4 P = texelFetch(uP, c, 0);
  vSplat = vec2(1.0, 0.0);
  vSun = 1.0;
  if (P.w <= 0.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vData = vec4(0.0); vRel = vec3(0.0); return; }
  vec4 V = texelFetch(uV, c, 0), M = texelFetch(uM, c, 0);
  // Atomized water that still has neighbours is white water — an aerated body with a surface
  // (the fluid passes, opaque white); atomized parcels that have flown apart are a cloud of
  // drops (the spray pass). Clear water is always the sheet.
  bool spray = V.w <= 0.0012;
  float coh = M.z < 0.0 ? 1.0 : smoothstep(0.15, 0.9, M.z);
  bool cloud = spray && coh < 0.5;
  if ((uSprayOnly > 0.5 && !cloud) || (uSheetOnly > 0.5 && cloud)){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vData = vec4(0.0); vRel = vec3(0.0); return; }
  vec3 rel = P.xyz - uCam;
  vec4 clip = uViewProj*vec4(rel, 1.0);
  // A parcel spreads as it flies: its radius grows from the droplet cloud's initial size.
  // Coherent water (dense) renders at its sheet thickness; water that has broken up into
  // isolated drops (low MPM density) shrinks toward droplet size — the pool's metaball
  // strength followed density the same way.
  float r = uSizeGain*pow(max(M.x, 1e-7), 1.0/3.0)*mix(0.35, 1.05, coh);
  float tau = 0.0;
  if (cloud){
    // A parcel of atomized water is a cloud of drops of radius V.w: it disperses as it flies
    // (~0.5 m/s), and its mean optical depth is τ = 1.5·V/(r_d·πR²) (extinction efficiency 2).
    // Dense white at birth, thinning to mist.
    r = min(max(1.2*pow(max(M.x, 1e-7), 1.0/3.0), 0.12) + 0.5*M.y, 3.0);
    tau = 1.5*M.x/(V.w*3.14159*r*r);
  }
  gl_Position = clip;
  gl_PointSize = clamp(r*uViewportH*uProjY/max(clip.w, 0.05), 1.0, 96.0);
  float fadeIn = smoothstep(0.0, 0.06, M.y), fadeOut = smoothstep(0.0, 0.25, P.w);
  // Aeration: atomized parcels (the solver flags them spray once past the Weber break-up
  // speed; droplet radius < 1.2 mm) stay white; a torn-up parcel is partly so.
  float aer = cloud ? 2.0 : spray ? 1.0 : 0.35*(1.0 - coh)*smoothstep(4.0, 10.0, length(V.xyz));
  vData = vec4(fadeIn*fadeOut, aer, clamp(M.y/1.5, 0.0, 1.0), coh);
  vRel = rel;
  vSplat = cloud ? vec2(r, tau) : vec2(max(r, 1e-4), max(M.x, 0.0));
  vSun = cloud ? osmSun(P.xyz) : 1.0;
}`;

export const SPLASH_POINT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vData;
in vec3 vRel;
in vec2 vSplat;
in float vSun;
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
  // Spray cloud: Gaussian column optical depth 4.07τ̄·e^(−4ρ²) (mean τ̄ over its disc; no hard
  // rim), lit by two-stream transfer through a drop cloud (g ≈ 0.85): it reflects R toward the
  // sun's side and diffusely transmits T to the far side — never brighter than E/π.
  bool cloud = vData.y > 1.5;
  if (cloud){
    float tau = 4.07*vSplat.y*exp(-4.0*r2);
    float ts = 0.15*tau, R = ts/(2.0 + ts), Td = max(2.0/(2.0 + ts) - exp(-tau), 0.0);
    float w = 0.5 + 0.5*dot(V, uSunDir);
    vec3 L = (uSunE*vSun*(R*w + Td*(1.0 - w)) + uSkyE*(R + Td)*0.5)/3.14159;
    float a = (1.0 - exp(-tau))*vData.x;
    float fog = exp(-length(vRel)*uFogDensity);
    o = vec4(mix(uHaze*a, L*vData.x, fog), a);
    return;
  }
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
  // The pool's splash was clear water: sheets, jets and the drops they shed stay glassy.
  // Water is white only where air shear has atomized it (Weber, set in the vertex stage).
  float aer = min(vData.y, 1.0);
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
uniform vec3 uCamW;              // camera world position (the self-shadow map is in world space)
${OSM_GLSL}
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
vec3 sheetColumn(vec3 trd, float L, vec3 sunE, out vec3 T){
  vec3 sigT = uAbsorb + uScatter;
  float Bg = (1.0 - 0.74)/(2.0*0.74)*((1.0 + 0.74)/sqrt(1.0 + 0.74*0.74) - 1.0);
  vec3 src = uScatter*(hgW(dot(trd, uSunDir), 0.74)*sunE*1.265 + uSkyE*0.934/0.8*Bg/(2.0*PI));
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
  // At the sheet's silhouette the surface is tangent to the view ray: past the edge, stand
  // in a surface receding ~4 pixel footprints (≈76°), so the rim gets its grazing normal
  // (and Fresnel sheen) instead of copying the inner neighbour's.
  float pix = length(viewPos(vUv + vec2(uTexel.x, 0.0), z) - P);
  bool ex = zx1 > 5e4 || zx0 > 5e4, ey = zy1 > 5e4 || zy0 > 5e4;
  if (zx1 > 5e4) zx1 = z + 4.0*pix;
  if (zx0 > 5e4) zx0 = z + 4.0*pix;
  if (zy1 > 5e4) zy1 = z + 4.0*pix;
  if (zy0 > 5e4) zy0 = z + 4.0*pix;
  vec3 px1 = viewPos(vUv + vec2(uTexel.x, 0.0), zx1), px0 = viewPos(vUv - vec2(uTexel.x, 0.0), zx0);
  vec3 py1 = viewPos(vUv + vec2(0.0, uTexel.y), zy1), py0 = viewPos(vUv - vec2(0.0, uTexel.y), zy0);
  // Inside, the one-sided difference with the smaller step (never across a front/back layer).
  vec3 dx = ex ? 0.5*(px1 - px0) : (abs(zx1 - z) < abs(z - zx0) ? px1 - P : P - px0);
  vec3 dy = ey ? 0.5*(py1 - py0) : (abs(zy1 - z) < abs(z - zy0) ? py1 - P : P - py0);
  vec3 N = normalize(cross(dy, dx));
  vec3 V = normalize(-P);
  if (dot(N, V) < 0.0) N = -N;
  // Sun reaching this point of the sheet through the splash in front of it.
  vec3 sunE = uSunE*osmSun(P + uCamW);
  float F1 = fresnelDielectric(max(dot(N, V), 0.0), 1.0, uIor);
  // A thin sheet reflects at both faces (incoherent film: 2R/(1+R)); a thick jet at one.
  float F = mix(2.0*F1/(1.0 + F1), F1, smoothstep(0.05, 0.25, th.r));
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
  refl += sunE*min(a2/(PI*dd*dd), 60.0)*max(dot(N, uSunDir), 0.0)*0.25;
  vec3 trd = refract(-V, N, 1.0/uIor);
  if (dot(trd, trd) < 1e-6) trd = -N;
  vec3 Tc;
  // The thickness buffer is the water path along the view ray (volume-conserving splats).
  vec3 column = sheetColumn(normalize(trd), min(thick, 3.0), sunE, Tc);
  vec3 water = mix(behind*Tc + column, refl, F);
  // Aerated water → white water: bubbles and drops (σ ≈ 1.5φ/r ≈ 300 m⁻¹) scatter all colours.
  // Two-stream through its path (g ≈ 0.85): the face toward the sun reflects R, the far face
  // glows with the diffuse transmission, thin fringes let the scene through e^(−τ).
  float aer = clamp(th.g/max(thick, 1e-4), 0.0, 1.0);
  float tauW = 300.0*th.g;
  float ts = 0.15*tauW, Rw = ts/(2.0 + ts), Tw = max(2.0/(2.0 + ts) - exp(-tauW), 0.0);
  float ws = 0.5 + 0.5*dot(N, uSunDir);
  vec3 white = (sunE*(Rw*ws + Tw*(1.0 - ws)) + uSkyE*(Rw + Tw)*0.5)/PI + behind*exp(-tauW);
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
