/**
 * Sky = Nimbus atmosphere + volumetric weather clouds, as THALASSA's lighting
 * authority. One world-locked cloud field feeds:
 *
 *   1. the environment map (mipmapped HDR equirect): water reflections, ambient
 *      irradiance, haze — re-baked in horizontal slices so the clouds can drift;
 *   2. the visible sky: a low-resolution jittered march, temporally resolved
 *      (direction reprojection + YCoCg variance clip, Nimbus resolve) and
 *      upsampled under a sharp sun disk that the clouds occlude;
 *   3. the cloud-shadow map: sun transmittance through the deck on a
 *      camera-centred ground grid, read by the sea, terrain and hulls.
 *
 * The sun's radiance at the surface keeps the air's transmittance (reddening at
 * low sun) — cloud shadowing is applied per pixel from the shadow map.
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, type GL } from '../gl/context';
import type { Vec3 } from '../math/mat4';
import { NIMBUS_COMMON_GLSL, NIMBUS_CLOUD_GLSL, NOISE_BAKE_FS } from '../atmos/nimbusGlsl';
import type { WeatherParams } from '../atmos/weather';

export const SKY_COMMON_GLSL = /* glsl */ `
#ifndef PI
#define PI 3.14159265358979
#endif
vec2 dirToEquirect(vec3 d){
  float u = atan(d.z, d.x)/(2.0*PI) + 0.5;
  float v = acos(clamp(d.y, -1.0, 1.0))/PI;
  return vec2(u, 1.0 - v);
}
vec3 equirectToDir(vec2 uv){
  float phi = (uv.x - 0.5)*2.0*PI;
  float th = (1.0 - uv.y)*PI;
  return vec3(sin(th)*cos(phi), cos(th), sin(th)*sin(phi));
}
`;

const SKY_UNIFORMS = /* glsl */ `
uniform vec3 uCamWorld;       // absolute camera position (m)
uniform float uCloudsOn;
`;

/**
 * Sky along rd from the camera, split so clouds can also sit IN FRONT of surfaces:
 *   cloudLayer(): (in-scatter, transmittance) of clouds + rain between the camera and
 *                 the sea plane (or space), and the mean cloud distance;
 *   skyAtmos():   clear-air radiance behind everything.
 */
const SKY_RADIANCE_GLSL = /* glsl */ `
vec3 camPlanet(){ return vec3(uCamWorld.x, Rp + max(uCamWorld.y, 1.5), uCamWorld.z); }
/** True when the ray meets the planet (sea/terrain covers it; the sky is only its limb above). */
bool hitsPlanet(vec3 ro, vec3 rd){ vec2 g = raySphere(ro, rd, Rp); return g.x > 0.0; }
vec3 skyAtmos(vec3 rd){
  vec3 ro = camPlanet();
  bool ground = hitsPlanet(ro, rd);
  // Rays into the planet see the haze of the tangent ray (surfaces cover them anyway).
  vec3 dir = ground ? normalize(vec3(rd.x, max(rd.y, 0.0) + 0.0015, rd.z)) : rd;
  vec3 T;
  vec3 col = atmosphere(ro, dir, uSunDir, 1e9, uRayleigh, uMie, uMieG, uSkyBright, T);
  return ground ? col*0.92 : col;
}
vec4 cloudLayer(vec3 rd, float jitter, int steps, int lightSteps, out float cloudDist){
  cloudDist = -1.0;
  if (uCloudsOn < 0.5) return vec4(0.0, 0.0, 0.0, 1.0);
  vec3 ro = camPlanet();
  vec2 g = raySphere(ro, rd, Rp);
  float tGround = g.x > 0.0 ? g.x : 1e9;
  vec4 c = marchClouds(ro, rd, tGround, jitter, steps, lightSteps, cloudDist);
  vec4 r = marchRain(ro, rd, tGround, jitter);
  if (cloudDist < 0.0 && r.a < 0.999) cloudDist = min(tGround, 20000.0)*0.5;
  return vec4(c.rgb*r.a + r.rgb, c.a*r.a);
}
vec4 skyRadiance(vec3 rd, float jitter, int steps, int lightSteps){
  float cd;
  vec3 sky = skyAtmos(rd);
  if (rd.y < 0.0 && hitsPlanet(camPlanet(), rd)) return vec4(sky, 1.0);
  vec4 c = cloudLayer(rd, jitter, steps, lightSteps, cd);
  return vec4(max(sky*c.a + c.rgb, vec3(0.0)), c.a);
}
`;

const ENV_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${SKY_COMMON_GLSL}
${NIMBUS_COMMON_GLSL}
${NIMBUS_CLOUD_GLSL}
${SKY_UNIFORMS}
${SKY_RADIANCE_GLSL}
in vec2 vUv;
out vec4 outColor;
uniform int uSteps;
void main(){
  initClouds();
  vec3 rd = equirectToDir(vUv);
  outColor = vec4(skyRadiance(rd, ign(gl_FragCoord.xy, 0.0), uSteps, 3).rgb, 1.0);
}`;

/** Low-res view march. MRT: 0 = cloud layer (scatter, T), 1 = (clear sky, cloud distance). */
const MARCH_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${SKY_COMMON_GLSL}
${NIMBUS_COMMON_GLSL}
${NIMBUS_CLOUD_GLSL}
${SKY_UNIFORMS}
${SKY_RADIANCE_GLSL}
in vec2 vUv;
layout(location=0) out vec4 oCloud;
layout(location=1) out vec4 oSky;
uniform mat4 uInvViewProj;
uniform float uFrame;
uniform int uSteps, uLightSteps;
void main(){
  initClouds();
  vec4 p = uInvViewProj*vec4(vUv*2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(p.xyz/p.w);
  float cd;
  oCloud = cloudLayer(rd, ign(gl_FragCoord.xy, uFrame), uSteps, uLightSteps, cd);
  oSky = vec4(skyAtmos(rd), cd < 0.0 ? -1.0 : cd*0.001);   // km: half floats overflow past 65 km
}`;

/**
 * Aerial perspective of the planet's surface (Nimbus atmosphere): for each view ray that
 * meets the sphere, in-scattered radiance and transmittance between the camera and the
 * surface. Low resolution — it varies smoothly across the screen — and valid at any
 * altitude, from the deck to orbit. One texture: in-scatter + green transmittance
 * (red/blue follow from the Rayleigh/Mie extinction ratios — see aerialRatios()).
 */
const AERIAL_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${SKY_COMMON_GLSL}
${NIMBUS_COMMON_GLSL}
${SKY_UNIFORMS}
uniform vec3 uSunDir;
uniform float uSkyBright, uRayleigh, uMie, uMieG;
in vec2 vUv;
layout(location=0) out vec4 oAP;       // rgb in-scatter, a transmittance (green; others by extinction ratio)
uniform mat4 uInvViewProj;
void main(){
  vec4 p = uInvViewProj*vec4(vUv*2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(p.xyz/p.w);
  vec3 ro = vec3(uCamWorld.x, Rp + max(uCamWorld.y, 1.5), uCamWorld.z);
  vec2 g = raySphere(ro, rd, Rp);
  // Rays that graze past the limb still get the path to the tangent point (smooth at the edge).
  float tHit = g.x > 0.0 ? g.x : max(-dot(ro, rd), 0.0);
  vec3 T;
  vec3 L = atmosphere(ro, rd, uSunDir, max(tHit, 1.0), uRayleigh, uMie, uMieG, uSkyBright, T);
  oAP = vec4(L, T.g);
}`;

/** Temporal resolve (Nimbus resolve.frag): rotation-exact reprojection + YCoCg variance clip, on both layers. */
const RESOLVE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 oCloud;
layout(location=1) out vec4 oSky;
uniform sampler2D uCurr0, uCurr1, uHist0, uHist1;
uniform mat4 uInvViewProj;      // current (camera-relative)
uniform mat4 uPrevViewProj;     // previous (camera-relative)
uniform vec2 uTexel;
uniform float uBlend;           // 0 = reset
vec3 toY(vec3 c){ return vec3(0.25*c.r + 0.5*c.g + 0.25*c.b, 0.5*c.r - 0.5*c.b, -0.25*c.r + 0.5*c.g - 0.25*c.b); }
vec3 fromY(vec3 c){ float t = c.x - c.z; return vec3(t + c.y, c.x + c.z, t - c.y); }
vec3 comp(vec3 c){ return c/(1.0 + max(c.r, max(c.g, c.b))); }
vec3 uncomp(vec3 c){ c = clamp(c, vec3(0.0), vec3(0.98)); return c/(1.0 - max(c.r, max(c.g, c.b))); }
vec4 clipBlend(sampler2D curT, vec4 cur, vec4 hist, vec2 uv){
  vec3 m1 = vec3(0.0), m2 = vec3(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec3 s = toY(comp(texture(curT, uv + vec2(float(x), float(y))*uTexel).rgb));
    m1 += s; m2 += s*s;
  }
  m1 /= 9.0; m2 /= 9.0;
  vec3 sig = sqrt(max(vec3(0.0), m2 - m1*m1));
  vec3 hc = uncomp(fromY(clamp(toY(comp(hist.rgb)), m1 - 1.25*sig, m1 + 1.25*sig)));
  return vec4(mix(cur.rgb, hc, uBlend), mix(cur.a, hist.a, uBlend));
}
void main(){
  vec4 c0 = texture(uCurr0, vUv), c1 = texture(uCurr1, vUv);
  vec4 p = uInvViewProj*vec4(vUv*2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(p.xyz/p.w);
  vec4 q = uPrevViewProj*vec4(rd, 0.0);            // direction at infinity: translation-free
  vec2 puv = q.w > 1e-5 ? q.xy/q.w*0.5 + 0.5 : vec2(-1.0);
  vec4 o0 = c0, o1 = c1;
  if (uBlend > 0.0 && all(greaterThanEqual(puv, vec2(0.0))) && all(lessThanEqual(puv, vec2(1.0)))){
    o0 = clipBlend(uCurr0, c0, texture(uHist0, puv), vUv);
    vec4 h1 = texture(uHist1, puv);
    o1 = vec4(mix(c1.rgb, h1.rgb, uBlend), c1.a < 0.0 || h1.a < 0.0 ? c1.a : mix(c1.a, h1.a, uBlend));
  }
  if (any(isnan(o0)) || any(isinf(o0))) o0 = c0;
  if (any(isnan(o1)) || any(isinf(o1))) o1 = c1;
  oCloud = o0; oSky = o1;
}`;

const BSPLINE_GLSL = /* glsl */ `
uniform vec2 uSkySize;
/** Cubic B-spline upsample from 4 bilinear taps: no mosaic from a low-res march. */
vec4 textureBSpline(sampler2D t, vec2 uv){
  vec2 st = uv*uSkySize - 0.5;
  vec2 i = floor(st), f = st - i;
  vec2 f2 = f*f, f3 = f2*f;
  vec2 w0 = (1.0 - 3.0*f + 3.0*f2 - f3)/6.0, w1 = (4.0 - 6.0*f2 + 3.0*f3)/6.0;
  vec2 w2 = (1.0 + 3.0*f + 3.0*f2 - 3.0*f3)/6.0, w3 = f3/6.0;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 h0 = (w1/g0 - 1.0 + i + 0.5)/uSkySize, h1 = (w3/g1 + 1.0 + i + 0.5)/uSkySize;
  return g0.y*(g0.x*texture(t, vec2(h0.x, h0.y)) + g1.x*texture(t, vec2(h1.x, h0.y)))
       + g1.y*(g0.x*texture(t, vec2(h0.x, h1.y)) + g1.x*texture(t, vec2(h1.x, h1.y)));
}
`;

/** Full-resolution background: clear sky under the cloud layer + a sharp sun disk the clouds occlude. */
const BACKGROUND_FS = /* glsl */ `#version 300 es
precision highp float;
${SKY_COMMON_GLSL}
in vec2 vUv;
out vec4 outColor;
uniform mat4 uInvViewProj;
uniform sampler2D uCloud, uSkyTex;
uniform sampler2D uEnv;
uniform vec3 uSunDir;
uniform vec3 uSunRadiance;
uniform float uSunAngularRadius;
uniform float uHasView;
uniform float uCamAlt;
${BSPLINE_GLSL}
void main(){
  vec4 p = uInvViewProj*vec4(vUv*2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(p.xyz/p.w);
  // Below the horizon: the same haze the sea and terrain fog toward (clouds below the
  // camera are composited over the surface by the overlay pass).
  vec3 haze = textureLod(uEnv, dirToEquirect(normalize(vec3(rd.x, 0.035, rd.z))), 3.0).rgb;
  // Below the planet's limb (not merely below the local horizontal — from altitude the
  // atmosphere's limb lies below it).
  float alt = max(uCamAlt, 1.5);
  float sinDip = sqrt(max(1.0 - pow(6360000.0/(6360000.0 + alt), 2.0), 0.0));
  bool ground = rd.y < -sinDip;
  if (uHasView < 0.5){ outColor = vec4(ground ? haze : textureLod(uEnv, dirToEquirect(rd), 0.0).rgb, 1.0); return; }
  if (ground){ outColor = vec4(haze, 1.0); return; }
  vec4 cl = textureBSpline(uCloud, vUv);
  vec3 sky = textureBSpline(uSkyTex, vUv).rgb;
  vec3 col = sky*cl.a + cl.rgb;
  float c = dot(rd, uSunDir);
  float cosR = cos(uSunAngularRadius);
  float disk = smoothstep(cosR - 0.00002, cosR + 0.00002, c);
  float r = clamp(acos(clamp(c, -1.0, 1.0))/uSunAngularRadius, 0.0, 1.0);
  col += disk*uSunRadiance*(1.0 - 0.6*(1.0 - sqrt(1.0 - r*r)))*cl.a;
  outColor = vec4(col, 1.0);
}`;

/**
 * Clouds in front of surfaces (camera in or above the deck, or looking at terrain
 * through cloud): composite (scatter, T) where the cloud layer is nearer than the
 * surface. Blend ONE, SRC_ALPHA → dst·T + scatter.
 */
const OVERLAY_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform mat4 uInvViewProj;
uniform sampler2D uCloud, uSkyTex, uDepth;
${BSPLINE_GLSL}
void main(){
  float z = texture(uDepth, vUv).r;
  vec4 p = uInvViewProj*vec4(vUv*2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(p.xyz/p.w);
  vec4 ps = uInvViewProj*vec4(vUv*2.0 - 1.0, z*2.0 - 1.0, 1.0);
  float dS = z >= 1.0 ? 1e30 : length(ps.xyz/ps.w);
  // Nearest cloud distance of the 2×2 low-res neighbourhood (km → m): no filtering across
  // the "no cloud" sentinel, and a surface is only fogged when the deck is surely nearer.
  vec2 px = vUv*uSkySize - 0.5;
  vec2 b = (floor(px) + 0.5)/uSkySize, e = 1.0/uSkySize;
  vec4 cds = vec4(texture(uSkyTex, b).a, texture(uSkyTex, b + vec2(e.x, 0.0)).a,
                  texture(uSkyTex, b + vec2(0.0, e.y)).a, texture(uSkyTex, b + e).a);
  float cd = 1e30;
  for (int i = 0; i < 4; i++) if (cds[i] > 0.0) cd = min(cd, cds[i]*1000.0);
  // Sky pixels already carry their clouds (background pass).
  if (cd >= 1e29 || (z >= 1.0 && rd.y >= 0.0) || !(cd < dS)) discard;
  outColor = textureBSpline(uCloud, vUv);
}`;

/** Sun transmittance through the deck for a camera-centred ground grid. */
const SHADOW_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${NIMBUS_COMMON_GLSL}
${NIMBUS_CLOUD_GLSL}
in vec2 vUv;
out vec4 outColor;
uniform vec3 uRect;   // world min x, min z, size
void main(){
  initClouds();
  vec2 xz = uRect.xy + vUv*uRect.z;
  vec3 p0 = vec3(xz.x, Rp, xz.y);
  if (uSunDir.y <= 0.01){ outColor = vec4(1.0); return; }
  vec2 a = raySphere(p0, uSunDir, cloudBottom), b = raySphere(p0, uSunDir, cloudTop);
  float t0 = max(a.y, 0.0), t1 = b.y;
  const int N = 14;
  float ds = (t1 - t0)/float(N);
  float od = 0.0;
  for (int i = 0; i < N; i++) od += cloudField(p0 + uSunDir*(t0 + ds*(float(i) + 0.5)), true).d*ds;
  // Direct beam only; forward scattering leaks a little light through thin cloud.
  float T = exp(-od*uSigma*0.55);
  outColor = vec4(mix(T, 1.0, 0.06), 0.0, 0.0, 1.0);
}`;

export interface SkyParams {
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  sunIntensity: number;
  turbidity: number;
  /** Volumetric clouds on/off (off = clear Nimbus atmosphere only). */
  clouds: boolean;
}

export const DEFAULT_SKY: SkyParams = {
  // POSEIDON's reference light: sun ahead of the default views, well up.
  sunAzimuthDeg: 62,
  sunElevationDeg: 40,
  // Nimbus "sky energy" (its default): the atmosphere integral, cloud light and exposure are calibrated to it.
  sunIntensity: 4.85,
  turbidity: 1.0,
  clouds: true,
};

export interface SkyQuality {
  envWidth: number;
  cloudScale: number;     // screen march resolution relative to the frame
  cloudSteps: number;
  lightSteps: number;
  envSteps: number;
  envSlices: number;      // env rows re-baked per frame = height / envSlices
  shadowN: number;
  shadowSize: number;     // m
  noiseN: number;         // shape atlas edge (detail = noiseN/4)
}

export function sunDirection(azDeg: number, elDeg: number): Vec3 {
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  return [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
}

const RP = 6360e3, RATM = 6460e3;
/** CPU twin of sunTransmittanceTo (Nimbus constants incl. ozone) at sea level. */
export function sunTransmittance(sun: Vec3, turbidity: number): Vec3 {
  const bR = [5.8e-6, 13.5e-6, 33.1e-6], bM = 21e-6 * 1.1, bO = [0.65e-6, 1.881e-6, 0.085e-6];
  const ro = [0, RP + 2, 0];
  const b = ro[1] * sun[1];
  const c = ro[1] * ro[1] - RATM * RATM;
  const t = -b + Math.sqrt(b * b - c);
  // Soft terminator: closest approach of the sun ray below the surface.
  const tca = -b;
  const graze = tca > 0 ? Math.sqrt(Math.max(ro[1] * ro[1] - tca * tca, 0)) - RP : 1e9;
  const soft = Math.min(Math.max((graze + 14000) / 16000, 0), 1);
  const sm = soft * soft * (3 - 2 * soft);
  if (sm <= 0.001) return [0, 0, 0];
  const n = 64, ds = t / n;
  let odR = 0, odM = 0, odO = 0;
  for (let i = 0; i < n; i++) {
    const s = ds * (i + 0.5);
    const h = Math.max(Math.hypot(sun[0] * s, ro[1] + sun[1] * s, sun[2] * s) - RP, 0);
    odR += Math.exp(-h / 8500) * ds;
    odM += Math.exp(-h / 1200) * ds * turbidity;
    odO += Math.max(0, 1 - Math.abs(h - 25000) / 15000) * ds;
  }
  return bR.map((br, i) => Math.exp(-(br * odR + bM * odM + bO[i] * odO)) * sm) as Vec3;
}

const ss = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const mixv = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t) as Vec3;

/** Nimbus derived lighting products (sky fill, ground bounce, TOA sun for clouds), in THALASSA units. */
export function nimbusLighting(elevDeg: number, energy: number) {
  const K = energy / 4.85;
  const day = ss(-8, 14, elevDeg);
  const dusk = ss(-7, 2, elevDeg) * (1 - ss(6, 20, elevDeg));
  let skyAmb = mixv([6e-3, 9e-3, 0.02], [0.42, 0.53, 0.74], day);
  skyAmb = mixv(skyAmb, [0.46, 0.27, 0.16], 0.55 * dusk);
  const gbGain = ss(-1.5, 12, elevDeg) * (0.22 + 0.78 * ss(4, 32, elevDeg));
  const gbCol = mixv([1, 0.52, 0.26], [1, 0.95, 0.88], ss(1, 26, elevDeg));
  const ground: Vec3 = [0.3 * gbCol[0] * gbGain * K, 0.27 * gbCol[1] * gbGain * K, 0.24 * gbCol[2] * gbGain * K];
  const sunWhite = 5.1 * Math.pow(Math.min(Math.max((elevDeg + 2) / 8, 0), 1), 1.35) * K;
  return { skyAmb: skyAmb.map((v) => v * K) as Vec3, ground, sunWhite };
}

export interface SkyView {
  /** Radians per output pixel (vertical). */
  pixelAngle: number;
  invViewProj: Float32Array;
  viewProj: Float32Array;
  width: number;
  height: number;
  camPos: Vec3;
  frameIndex: number;
}

export class Sky {
  readonly size: [number, number];
  env: Target;
  readonly levels: number;
  sunDir: Vec3 = [0, 1, 0];
  /** Sun radiance at the surface (HDR, clear-air transmittance; clouds via the shadow map). */
  sunRadiance: Vec3 = [1, 1, 1];
  /** Cloud-shadow map for surfaces (absolute world rect). */
  shadow: { texture: WebGLTexture; rect: [number, number, number]; strength: number } | null = null;
  windOffset: [number, number] = [0, 0];
  private progEnv: Program; private progMarch: Program; private progResolve: Program;
  private progBg: Program; private progShadow: Program; private progOverlay: Program; private progAerial: Program;
  /** Aerial perspective of the sea for the current view (in-scatter, transmittance). */
  aerial: Target | null = null;
  private camAlt = 0;
  private quad: Quad;
  private shape: WebGLTexture; private detail: WebGLTexture;
  private march: Target | null = null;
  private hist: [Target, Target] | null = null;
  private histPing = 0;
  private prevViewProj: Float32Array | null = null;
  private shadowTarget: Target;
  private envSlice = 0;
  private envKey = '';
  private readFbo: WebGLFramebuffer | null = null;
  private weather: WeatherParams | null = null;
  private params: SkyParams = DEFAULT_SKY;
  private time = 0;
  private sinceIrradiance = 1e9;
  private irr: Vec3 = [1, 1, 1];
  private farDepth: WebGLTexture | null = null;

  constructor(private gl: GL, readonly q: SkyQuality) {
    this.size = [q.envWidth, q.envWidth / 2];
    const tex = createTexture(gl, this.size[0], this.size[1], { ...FMT.rgba16f(gl), filter: gl.LINEAR, mips: true, wrap: gl.CLAMP_TO_EDGE });
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    this.env = new Target(gl, this.size[0], this.size[1], [tex]);
    this.levels = Math.floor(Math.log2(this.size[1])) + 1;
    this.progEnv = new Program(gl, 'sky.env', FULLSCREEN_VS, ENV_FS);
    this.progMarch = new Program(gl, 'sky.march', FULLSCREEN_VS, MARCH_FS);
    this.progResolve = new Program(gl, 'sky.resolve', FULLSCREEN_VS, RESOLVE_FS);
    this.progBg = new Program(gl, 'sky.background', FULLSCREEN_VS, BACKGROUND_FS);
    this.progOverlay = new Program(gl, 'sky.overlay', FULLSCREEN_VS, OVERLAY_FS);
    this.progShadow = new Program(gl, 'sky.shadow', FULLSCREEN_VS, SHADOW_FS);
    this.progAerial = new Program(gl, 'sky.aerial', FULLSCREEN_VS, AERIAL_FS);
    this.quad = new Quad(gl);
    this.shape = this.bakeNoise(q.noiseN, 0);
    this.detail = this.bakeNoise(Math.max(16, q.noiseN / 4), 1);
    const sn = q.shadowN;
    this.shadowTarget = new Target(gl, sn, sn, [createTexture(gl, sn, sn, { ...FMT.r16f(gl), filter: gl.LINEAR })]);
  }

  get texture() {
    return this.env.texture;
  }

  /** Tileable 3D noise atlas (RGBA8), baked slice by slice on the GPU. */
  private bakeNoise(n: number, mode: number): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_3D, t);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, n, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT], [gl.TEXTURE_WRAP_R, gl.REPEAT]])
      gl.texParameteri(gl.TEXTURE_3D, p, v);
    const prog = new Program(gl, 'sky.noiseBake', FULLSCREEN_VS, NOISE_BAKE_FS);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, n, n);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    const p = prog.use().set('uSize', n).set('uMode', mode);
    for (let z = 0; z < n; z++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, 0, z);
      p.set('uSlice', (z + 0.5) / n);
      this.quad.draw();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    prog.dispose();
    // Mips for the footprint LOD (clouds far away sample prefiltered noise).
    gl.bindTexture(gl.TEXTURE_3D, t);
    gl.generateMipmap(gl.TEXTURE_3D);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.bindTexture(gl.TEXTURE_3D, null);
    return t;
  }

  private setCloudUniforms(p: Program, camPos: Vec3) {
    const w = this.weather!;
    const s = this.params;
    const L = nimbusLighting(s.sunElevationDeg, s.sunIntensity);
    p.set('uSunDir', this.sunDir).set('uSkyBright', s.sunIntensity).set('uSunWhite', L.sunWhite)
      .set('uSkyAmbTop', L.skyAmb).set('uGroundBounce', L.ground)
      .set('uRayleigh', 1).set('uMie', s.turbidity * w.haze).set('uMieG', 1)
      .set('uCoverage', w.coverage).set('uCloudType', w.cloudType).set('uSigma', 0.045 * w.density)
      .set('uCloudBase', w.cloudBase).set('uCloudThick', w.cloudThick).set('uDroplet', w.droplet)
      .set('uPrecip', w.precipitation).set('uWindOffset', this.windOffset).set('uCloudTime', this.time)
      .tex('uShape', this.shape).tex('uDetailTex', this.detail);
    if (p.has('uCamWorld')) p.set('uCamWorld', camPos).set('uCloudsOn', s.clouds ? 1 : 0);
  }

  /**
   * Advance the weather-driven sky: sun, drift, env slices, cloud shadows.
   * Returns true when the env map changed (the caller refreshes ambient).
   */
  update(p: SkyParams, weather: WeatherParams, time: number, dt: number, camPos: Vec3): boolean {
    const gl = this.gl;
    this.params = p;
    this.weather = weather;
    this.time = time;
    const wd = (weather.windDirDeg * Math.PI) / 180;
    const steer = 1.6 * Math.max(weather.windSpeed, 1.5) * weather.drift;
    this.windOffset[0] += Math.cos(wd) * steer * dt;
    this.windOffset[1] += Math.sin(wd) * steer * dt;
    this.sunDir = sunDirection(p.sunAzimuthDeg, p.sunElevationDeg);
    const T = sunTransmittance(this.sunDir, p.turbidity * weather.haze);
    // Surface sun in POSEIDON/Nimbus units: at POSEIDON's reference sun (51° up) the
    // sun's luminance equals the glitter sun it was tuned with (6.2, 5.1, 3.8 → 5.24).
    const k = p.sunIntensity * 1.353;
    this.sunRadiance = [T[0] * k, T[1] * k * 0.98, T[2] * k * 0.94];

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    // Env: a full bake when the look changes, otherwise one horizontal slice per frame.
    const key = JSON.stringify([p, weather.coverage.toFixed(3), weather.cloudType.toFixed(3), weather.cloudBase | 0, weather.cloudThick | 0,
      weather.density.toFixed(3), weather.precipitation.toFixed(3), weather.haze.toFixed(3), Math.round(camPos[0] / 200), Math.round(camPos[2] / 200)]);
    const full = key !== this.envKey;
    this.envKey = key;
    const pe = this.progEnv.use();
    // Reflections, ambient and haze belong to the sea surface: bake the sky as seen from
    // sea level below the camera, whatever the camera's altitude.
    this.setCloudUniforms(pe, [camPos[0], Math.min(camPos[1], 2), camPos[2]]);
    this.camAlt = camPos[1];
    pe.set('uSteps', this.q.envSteps).set('uPixelAngle', (2 * Math.PI) / this.size[0]);
    this.env.bind();
    const H = this.size[1];
    if (!full) {
      const slices = this.q.envSlices;
      // Only the upper hemisphere carries clouds; below-horizon rows are static haze.
      const rows = Math.ceil(H / 2 / slices);
      const y0 = H / 2 + this.envSlice * rows;
      this.envSlice = (this.envSlice + 1) % slices;
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, Math.floor(y0), this.size[0], rows);
      this.quad.draw();
      gl.disable(gl.SCISSOR_TEST);
    } else {
      this.quad.draw();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.env.texture);
    gl.generateMipmap(gl.TEXTURE_2D);

    // Cloud shadows on a camera-centred grid, snapped to texels so they do not swim.
    const size = this.q.shadowSize;
    const texel = size / this.q.shadowN;
    const rect: [number, number, number] = [
      Math.floor((camPos[0] - size / 2) / texel) * texel, Math.floor((camPos[2] - size / 2) / texel) * texel, size,
    ];
    if (p.clouds && p.sunElevationDeg > -2) {
      const ps = this.progShadow.use();
      this.setCloudUniforms(ps, camPos);
      ps.set('uRect', rect);
      this.shadowTarget.bind();
      this.quad.draw();
      this.shadow = { texture: this.shadowTarget.texture, rect, strength: 1 };
    } else this.shadow = null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.sinceIrradiance++;
    return full || this.sinceIrradiance > 24;
  }

  /** τ_c/τ_green of clear air for the current haze: T_c = T_g^ratio_c (ozone neglected). */
  aerialRatios(): Vec3 {
    const bM = 21e-6 * 1.1 * this.params.turbidity * (this.weather?.haze ?? 1);
    const g = 13.5e-6 + bM;
    return [(5.8e-6 + bM) / g, 1, (33.1e-6 + bM) / g];
  }

  private prevCam: Vec3 | null = null;
  /** History is direction-reprojected (rotation-exact); a translation jump invalidates it. */
  private cameraJumped(cam: Vec3): boolean {
    const p = this.prevCam;
    this.prevCam = [cam[0], cam[1], cam[2]];
    if (!p) return true;
    const d = Math.hypot(cam[0] - p[0], cam[1] - p[1], cam[2] - p[2]);
    return d > Math.max(60, 0.02 * Math.max(Math.abs(cam[1]), Math.abs(p[1])));
  }

  /** Low-resolution jittered march of the cloud layer + clear sky, temporally resolved. */
  renderView(v: SkyView) {
    const gl = this.gl;
    const w = Math.max(8, Math.round(v.width * this.q.cloudScale)), h = Math.max(8, Math.round(v.height * this.q.cloudScale));
    if (!this.march || this.march.width !== w || this.march.height !== h) {
      this.march?.dispose();
      this.hist?.forEach((t) => t.dispose());
      const tex = () => createTexture(gl, w, h, { ...FMT.rgba16f(gl), filter: gl.LINEAR });
      const mk = () => new Target(gl, w, h, [tex(), tex()]);
      this.march = mk();
      this.hist = [mk(), mk()];
      this.prevViewProj = null;
    }
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const pm = this.progMarch.use();
    this.setCloudUniforms(pm, v.camPos);
    pm.set('uInvViewProj', v.invViewProj).set('uFrame', v.frameIndex % 64).set('uPixelAngle', v.pixelAngle / this.q.cloudScale)
      .set('uSteps', this.q.cloudSteps).set('uLightSteps', this.q.lightSteps);
    this.march.bind();
    this.quad.draw();
    const src = this.hist![this.histPing], dst = this.hist![1 - this.histPing];
    const pr = this.progResolve.use();
    pr.tex('uCurr0', this.march.textures[0]).tex('uCurr1', this.march.textures[1])
      .tex('uHist0', src.textures[0]).tex('uHist1', src.textures[1])
      .set('uInvViewProj', v.invViewProj).set('uPrevViewProj', this.prevViewProj ?? v.viewProj)
      .set('uTexel', [1 / w, 1 / h]).set('uBlend', this.prevViewProj && !this.cameraJumped(v.camPos) ? 0.88 : 0);
    dst.bind();
    this.quad.draw();
    this.histPing = 1 - this.histPing;
    this.prevViewProj = new Float32Array(v.viewProj);
    // Aerial perspective at the same low resolution as the sky march.
    if (!this.aerial || this.aerial.width !== w || this.aerial.height !== h) {
      this.aerial?.dispose();
      this.aerial = new Target(gl, w, h, [createTexture(gl, w, h, { ...FMT.rgba16f(gl), filter: gl.LINEAR })]);
    }
    const pa = this.progAerial.use();
    this.setCloudUniforms(pa, v.camPos);
    pa.set('uInvViewProj', v.invViewProj);
    this.aerial.bind();
    this.quad.draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Diffuse sky irradiance on a horizontal plane: π × the upper-hemisphere mean
   * radiance, read from the 4×2 mip (tiny synchronous read, throttled).
   */
  irradiance(): Vec3 {
    if (this.sinceIrradiance < 24 && this.irr[0] !== 1) return this.irr;
    this.sinceIrradiance = 0;
    const gl = this.gl;
    const level = Math.max(0, this.levels - 2);
    const w = Math.max(1, this.size[0] >> level), h = Math.max(1, this.size[1] >> level);
    if (!this.readFbo) this.readFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.env.texture, level);
    const px = new Float32Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const row = h - 1;
    const e: Vec3 = [0, 0, 0];
    for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) e[c] += px[(row * w + x) * 4 + c] / w;
    this.irr = [e[0] * Math.PI, e[1] * Math.PI, e[2] * Math.PI];
    return this.irr;
  }

  /** Draw the sky into the currently bound framebuffer (after renderView). */
  drawBackground(invViewProj: Float32Array) {
    const gl = this.gl;
    const view = this.hist?.[this.histPing];
    const pb = this.progBg.use();
    pb.set('uInvViewProj', invViewProj).set('uSunDir', this.sunDir).set('uSunRadiance', this.sunRadiance.map((v) => v * 900))
      .set('uSunAngularRadius', 0.0046).tex('uEnv', this.env.texture).set('uHasView', view ? 1 : 0)
      .tex('uCloud', view?.textures[0] ?? this.env.texture).tex('uSkyTex', view?.textures[1] ?? this.env.texture)
      .set('uSkySize', this.march ? [this.march.width, this.march.height] : [1, 1]).set('uCamAlt', this.camAlt);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    this.quad.draw();
    gl.depthMask(true);
  }

  /** Clouds in front of surfaces, using the opaque scene depth (after the water pass). */
  drawOverlay(invViewProj: Float32Array, sceneDepth: WebGLTexture | null) {
    const view = this.hist?.[this.histPing];
    if (!view || !this.params.clouds) return;
    if (!sceneDepth) {
      // No opaque pass this frame: everything below the horizon is the sea (depth = far).
      this.farDepth ??= createTexture(this.gl, 1, 1, { ...FMT.r32f(this.gl), data: new Float32Array([1]) });
      sceneDepth = this.farDepth;
    }
    const gl = this.gl;
    const po = this.progOverlay.use();
    po.set('uInvViewProj', invViewProj).tex('uCloud', view.textures[0]).tex('uSkyTex', view.textures[1]).tex('uDepth', sceneDepth)
      .set('uSkySize', [this.march!.width, this.march!.height]);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.SRC_ALPHA);
    this.quad.draw();
    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }

  dispose() {
    const gl = this.gl;
    this.env.dispose();
    this.march?.dispose();
    this.hist?.forEach((t) => t.dispose());
    this.shadowTarget.dispose();
    this.aerial?.dispose();
    [this.progEnv, this.progMarch, this.progResolve, this.progBg, this.progShadow, this.progOverlay, this.progAerial].forEach((p) => p.dispose());
    gl.deleteTexture(this.shape);
    gl.deleteTexture(this.detail);
  }
}
