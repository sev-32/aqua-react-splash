/**
 * Atmosphere: Rayleigh + Mie single scattering (Nishita-style) with a lit
 * procedural cloud deck, baked to a mipmapped HDR equirectangular map.
 *
 * The SAME map is used for the visible sky, water reflections (mip chosen by
 * slope variance), ambient irradiance and aerial perspective — one source of
 * sky truth, the lesson of R9's Nimbus pass (no post-composited sky).
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, type GL } from '../gl/context';
import type { Vec3 } from '../math/mat4';

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

const ATMOSPHERE_FS = /* glsl */ `#version 300 es
precision highp float;
${SKY_COMMON_GLSL}
in vec2 vUv;
out vec4 outColor;
uniform vec3 uSunDir;
uniform float uSunIntensity;
uniform float uTurbidity;      // scales Mie density (haze)
uniform float uCloudCover;     // 0..1
uniform float uCloudDensity;
uniform float uCloudScale;     // m
uniform vec2 uCloudOffset;     // wind drift (m)
uniform float uCloudHeight;    // m
uniform float uGroundAlbedo;
uniform vec3 uCloudAmbient;

const float R_E = 6371e3;
const float R_A = 6471e3;
const vec3 BETA_R = vec3(5.5e-6, 13.0e-6, 22.4e-6);
const float BETA_M = 21e-6;
const float H_R = 8000.0;
const float H_M = 1200.0;
const float G_M = 0.76;

vec2 raySphere(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd), c = dot(ro, ro) - r*r;
  float d = b*b - c;
  if (d < 0.0) return vec2(1e9, -1e9);
  d = sqrt(d);
  return vec2(-b - d, -b + d);
}
vec3 atmosphere(vec3 rd, out vec3 transmittance){
  vec3 ro = vec3(0.0, R_E + 2.0, 0.0);
  vec2 ta = raySphere(ro, rd, R_A);
  vec2 tg = raySphere(ro, rd, R_E);
  float tMax = ta.y;
  bool ground = tg.x > 0.0;
  if (ground) tMax = tg.x;
  const int IS = 16, JS = 6;
  float ds = tMax/float(IS);
  float odR = 0.0, odM = 0.0;
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  float mieScale = uTurbidity;
  for (int i = 0; i < IS; i++){
    vec3 p = ro + rd*(ds*(float(i) + 0.5));
    float h = length(p) - R_E;
    float hr = exp(-h/H_R)*ds, hm = exp(-h/H_M)*ds*mieScale;
    odR += hr; odM += hm;
    vec2 tl = raySphere(p, uSunDir, R_A);
    float dsl = tl.y/float(JS);
    float odRl = 0.0, odMl = 0.0;
    bool shadow = false;
    for (int j = 0; j < JS; j++){
      vec3 q = p + uSunDir*(dsl*(float(j) + 0.5));
      float hl = length(q) - R_E;
      if (hl < 0.0){ shadow = true; break; }
      odRl += exp(-hl/H_R)*dsl;
      odMl += exp(-hl/H_M)*dsl*mieScale;
    }
    if (shadow) continue;
    vec3 att = exp(-(BETA_R*(odR + odRl) + BETA_M*1.1*(odM + odMl)));
    sumR += hr*att;
    sumM += hm*att;
  }
  float mu = dot(rd, uSunDir);
  float pR = 3.0/(16.0*PI)*(1.0 + mu*mu);
  float g2 = G_M*G_M;
  float pM = 3.0/(8.0*PI)*((1.0 - g2)*(1.0 + mu*mu))/((2.0 + g2)*pow(max(1.0 + g2 - 2.0*mu*G_M, 1e-4), 1.5));
  transmittance = exp(-(BETA_R*odR + BETA_M*1.1*odM));
  vec3 col = uSunIntensity*(pR*BETA_R*sumR + pM*BETA_M*sumM);
  if (ground){
    // Hazy far ground/sea below the horizon: lit albedo seen through the air column.
    float sunUp = max(uSunDir.y, 0.0);
    col += transmittance*uGroundAlbedo*uSunIntensity*0.02*sunUp;
  }
  return col;
}

float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++){ v += a*vnoise(p); p = m*p + vec2(3.1, 1.7); a *= 0.5; } return v; }

void main(){
  vec3 rd = equirectToDir(vUv);
  vec3 T;
  vec3 col = atmosphere(rd, T);
  // Cloud deck: a lit, self-shadowed 2.5D layer. Coverage fades toward the horizon
  // (distance + airmass) so the far field turns hazy instead of tiling.
  if (uCloudCover > 0.001 && rd.y > 0.0){
    float t = uCloudHeight/max(rd.y, 0.015);
    vec2 p = (rd.xz*t + uCloudOffset)/uCloudScale;
    float base = fbm(p);
    float detail = fbm(p*3.1 + 7.3);
    float d = base*0.78 + detail*0.22;
    float cov = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.28, d);
    float dist = t;
    float fade = exp(-dist/45000.0);
    float alpha = clamp(cov*uCloudDensity, 0.0, 1.0)*fade;
    if (alpha > 0.002){
      // Light: thickness toward the sun darkens the base; forward scattering brightens rims.
      vec2 ps = p + uSunDir.xz*0.08;
      float toward = fbm(ps)*0.78 + fbm(ps*3.1 + 7.3)*0.22;
      float selfShadow = exp(-3.2*max(toward - d + 0.05, 0.0)*uCloudDensity);
      float mu = dot(rd, uSunDir);
      float silver = 0.35 + 1.25*pow(max(mu, 0.0), 8.0);
      vec3 sunLight = uSunIntensity*0.075*exp(-(BETA_R*6.0e3 + BETA_M*1.2e3)/max(uSunDir.y, 0.03))*vec3(1.0, 0.97, 0.92);
      vec3 ambient = uCloudAmbient;
      vec3 cloud = ambient*(0.55 + 0.35*(1.0 - cov)) + sunLight*selfShadow*silver*max(uSunDir.y + 0.15, 0.0);
      col = mix(col, cloud, alpha*mix(1.0, 0.55, 1.0 - T.g));
    }
  }
  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

/** Fullscreen sky background: env map + analytic sun disk. Writes max depth. */
const BACKGROUND_FS = /* glsl */ `#version 300 es
precision highp float;
${SKY_COMMON_GLSL}
in vec2 vUv;
out vec4 outColor;
uniform mat4 uInvViewProj;
uniform sampler2D uEnv;
uniform vec3 uSunDir;
uniform vec3 uSunRadiance;
uniform float uSunAngularRadius;
void main(){
  vec4 p = uInvViewProj*vec4(vUv*2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(p.xyz/p.w);
  // Below the horizon the (curved) sea has faded into haze: use the same haze the
  // water shader fogs toward, so the horizon line is seamless at any altitude.
  vec3 col = rd.y >= 0.0 ? textureLod(uEnv, dirToEquirect(rd), 0.0).rgb
                         : textureLod(uEnv, dirToEquirect(normalize(vec3(rd.x, 0.035, rd.z))), 3.0).rgb;
  float c = dot(rd, uSunDir);
  float cosR = cos(uSunAngularRadius);
  float disk = smoothstep(cosR - 0.00002, cosR + 0.00002, c);
  // limb darkening
  float r = clamp(acos(clamp(c, -1.0, 1.0))/uSunAngularRadius, 0.0, 1.0);
  col += disk*uSunRadiance*(1.0 - 0.6*(1.0 - sqrt(1.0 - r*r)));
  outColor = vec4(col, 1.0);
}
`;

export interface SkyParams {
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  sunIntensity: number;
  turbidity: number;
  cloudCover: number;
  cloudDensity: number;
  cloudScale: number;
  cloudHeight: number;
  cloudSpeed: number;
}

export const DEFAULT_SKY: SkyParams = {
  sunAzimuthDeg: 208,
  sunElevationDeg: 24,
  sunIntensity: 22,
  turbidity: 1.0,
  cloudCover: 0.42,
  cloudDensity: 0.85,
  cloudScale: 5200,
  cloudHeight: 1800,
  cloudSpeed: 6,
};

export function sunDirection(azDeg: number, elDeg: number): Vec3 {
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  return [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
}

/** CPU estimate of direct sun transmittance (same constants as the shader) for lighting. */
export function sunTransmittance(sun: Vec3, turbidity: number): Vec3 {
  const RE = 6371e3, RA = 6471e3;
  const bR = [5.5e-6, 13.0e-6, 22.4e-6], bM = 21e-6 * 1.1;
  const ro = [0, RE + 2, 0];
  const b = ro[1] * sun[1];
  const c = ro[1] * ro[1] - RA * RA;
  const t = -b + Math.sqrt(b * b - c);
  const n = 64, ds = t / n;
  let odR = 0, odM = 0;
  for (let i = 0; i < n; i++) {
    const s = ds * (i + 0.5);
    const p = [sun[0] * s, ro[1] + sun[1] * s, sun[2] * s];
    const h = Math.hypot(p[0], p[1], p[2]) - RE;
    if (h < 0) return [0, 0, 0];
    odR += Math.exp(-h / 8000) * ds;
    odM += Math.exp(-h / 1200) * ds * turbidity;
  }
  return bR.map((br) => Math.exp(-(br * odR + bM * odM))) as Vec3;
}

/** Cheap diffuse sky light on the cloud base (grey-blue, dims as the sun sets). */
function cloudAmbient(p: SkyParams): Vec3 {
  const day = Math.min(Math.max((p.sunElevationDeg + 4) / 34, 0), 1);
  const k = (p.sunIntensity / 22) * (0.08 + 0.92 * day);
  return [0.30 * k + 0.02, 0.36 * k + 0.025, 0.44 * k + 0.035];
}

export class Sky {
  readonly size: [number, number];
  env: Target;
  private progAtmos: Program;
  private progBg: Program;
  private quad: Quad;
  private lastKey = '';
  private cloudDrift = [0, 0];
  private lastCloudBake = -1e9;
  sunDir: Vec3 = [0, 1, 0];
  /** Sun radiance at the surface (HDR), used by all direct lighting. */
  sunRadiance: Vec3 = [1, 1, 1];
  readonly levels: number;

  constructor(private gl: GL, width = 1024) {
    this.size = [width, width / 2];
    const tex = createTexture(gl, this.size[0], this.size[1], {
      ...FMT.rgba16f(gl), filter: gl.LINEAR, mips: true, wrap: gl.CLAMP_TO_EDGE,
    });
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    this.env = new Target(gl, this.size[0], this.size[1], [tex]);
    this.levels = Math.floor(Math.log2(this.size[1])) + 1;
    this.progAtmos = new Program(gl, 'sky.atmosphere', FULLSCREEN_VS, ATMOSPHERE_FS);
    this.progBg = new Program(gl, 'sky.background', FULLSCREEN_VS, BACKGROUND_FS);
    this.quad = new Quad(gl);
  }

  get texture() {
    return this.env.texture;
  }

  /**
   * Re-bake when the sun/sky parameters change, and at a throttled cadence while
   * clouds drift (the bake is cheap on GPUs but never needs 60 Hz).
   */
  update(p: SkyParams, time: number, windDirDeg: number, dt: number): boolean {
    const wd = (windDirDeg * Math.PI) / 180;
    this.cloudDrift[0] += Math.cos(wd) * p.cloudSpeed * dt;
    this.cloudDrift[1] += Math.sin(wd) * p.cloudSpeed * dt;
    this.sunDir = sunDirection(p.sunAzimuthDeg, p.sunElevationDeg);
    const T = sunTransmittance(this.sunDir, p.turbidity);
    // Solid-angle normalised disk radiance; glitter & specular use this.
    const k = p.sunIntensity * 0.55;
    this.sunRadiance = [T[0] * k, T[1] * k * 0.98, T[2] * k * 0.94];
    const key = JSON.stringify([p.sunAzimuthDeg, p.sunElevationDeg, p.sunIntensity, p.turbidity, p.cloudCover, p.cloudDensity, p.cloudScale, p.cloudHeight]);
    const drifting = p.cloudCover > 0 && p.cloudSpeed > 0 && time - this.lastCloudBake > 0.5;
    if (key === this.lastKey && !drifting) return false;
    this.lastKey = key;
    this.lastCloudBake = time;
    const gl = this.gl;
    const pr = this.progAtmos.use();
    pr.set('uSunDir', this.sunDir).set('uSunIntensity', p.sunIntensity).set('uTurbidity', p.turbidity)
      .set('uCloudCover', p.cloudCover).set('uCloudDensity', p.cloudDensity).set('uCloudScale', p.cloudScale)
      .set('uCloudOffset', this.cloudDrift).set('uCloudHeight', p.cloudHeight).set('uGroundAlbedo', 0.12)
      .set('uCloudAmbient', cloudAmbient(p));
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    this.env.bind();
    this.quad.draw();
    gl.bindTexture(gl.TEXTURE_2D, this.env.texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  private readFbo: WebGLFramebuffer | null = null;
  /**
   * Diffuse sky irradiance on a horizontal plane: π × the upper-hemisphere mean
   * radiance, read from the 4×2 mip (one tiny synchronous read per bake).
   */
  irradiance(): Vec3 {
    const gl = this.gl;
    const level = Math.max(0, this.levels - 2);
    const w = Math.max(1, this.size[0] >> level), h = Math.max(1, this.size[1] >> level);
    if (!this.readFbo) this.readFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.env.texture, level);
    const px = new Float32Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // Rows are bottom→top: the top row (v≈1) is the upper hemisphere.
    const row = h - 1;
    const e: Vec3 = [0, 0, 0];
    for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) e[c] += px[(row * w + x) * 4 + c] / w;
    return [e[0] * Math.PI, e[1] * Math.PI, e[2] * Math.PI];
  }

  /** Draw the sky into the currently bound framebuffer. */
  drawBackground(invViewProj: Float32Array) {
    const gl = this.gl;
    const pb = this.progBg.use();
    pb.set('uInvViewProj', invViewProj).set('uSunDir', this.sunDir).set('uSunRadiance', this.sunRadiance.map((v) => v * 900))
      .set('uSunAngularRadius', 0.0046).tex('uEnv', this.env.texture);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    this.quad.draw();
    gl.depthMask(true);
  }

  dispose() {
    this.env.dispose();
    this.progAtmos.dispose();
    this.progBg.dispose();
  }
}
