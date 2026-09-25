/**
 * Nimbus-derived atmosphere + volumetric cloud GLSL (ported from START_NIMBUS
 * R9 lib/sky.glsl, lib/phase.glsl, lib/density.glsl, lib/lighting.glsl and
 * the noise bake), reduced to a real-time budget and re-framed for THALASSA:
 *
 *   - planet frame: P = world + (0, Rp, 0), clouds are world-locked and the
 *     SAME field feeds the visible sky, the environment map (water reflections,
 *     ambient) and the cloud-shadow map (sun on sea, terrain, hulls);
 *   - atmosphere keeps Nimbus's ozone (Chappuis) absorption, soft terminator
 *     and near-weighted (u^1.7, midpoint) view sampling;
 *   - density keeps the genus height profile, per-turret ceilings, coverage
 *     carve on a baked Perlin-Worley base, top billow carve and base undercut;
 *     the runtime fbm3 meso-structure is replaced by atlas lookups at other
 *     scales (same character, a fraction of the ALU);
 *   - lighting keeps the HG+Draine droplet phase, the AETHER multi-scatter
 *     octaves, powder, silver lining, sky/ground ambient and cavity darkening.
 */

export const NIMBUS_COMMON_GLSL = /* glsl */ `
#ifndef PI
#define PI 3.14159265358979
#endif
float sat(float x){ return clamp(x, 0.0, 1.0); }
float remap(float v, float a, float b, float c, float d){ return c + (clamp(v, a, b) - a)*(d - c)/max(1e-5, b - a); }
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float ign(vec2 p, float frame){
  p += 5.588238*fract(frame*0.618033988749895);
  return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715))));
}
float vnoise2(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0 - 2.0*f);
  float a = hash21(i), b = hash21(i + vec2(1, 0)), c = hash21(i + vec2(0, 1)), d = hash21(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm2(vec2 p){
  float s = 0.0, a = 0.55, n = 0.0;
  mat2 m = mat2(1.62, 1.11, -1.11, 1.62);
  for (int i = 0; i < 5; i++){ s += a*vnoise2(p); n += a; p = m*p + vec2(7.1, 13.7); a *= 0.52; }
  return s/max(n, 1e-4);
}

// ── phase (NVIDIA 2023 HG+Draine droplet fit + Nimbus art lobes) ──
float hgPhase(float mu, float g){
  float g2 = g*g;
  return (1.0 - g2)/(4.0*PI*pow(max(1e-4, 1.0 + g2 - 2.0*g*mu), 1.5));
}
float drainePhase(float mu, float g, float a){
  float g2 = g*g;
  float denom = pow(max(1e-3, 1.0 + g2 - 2.0*g*mu), 1.5);
  return ((1.0 - g2)*(1.0 + a*mu*mu))/(4.0*PI*denom*(1.0 + a*(1.0 + 2.0*g2)/3.0));
}
float miePhase(float mu, float d){
  float gHG = exp(-0.0990567/(d - 1.67154));
  float gD = exp(-2.20679/(d + 3.91029) - 0.428934);
  float a = exp(3.62489 - 8.29288/(d + 5.52825));
  float wD = exp(-0.599085/(d - 0.641583) - 0.665888);
  return (1.0 - wD)*hgPhase(mu, gHG) + wD*drainePhase(mu, gD, a);
}
float phaseCloud(float mu, float dropletUm, float breadth, float silver, float lwp){
  float fwd = miePhase(mu, dropletUm)*mix(1.35, 0.98, breadth);
  float back = hgPhase(mu, -mix(0.14, 0.30, breadth))*mix(0.55, 0.95, breadth);
  float broad = pow(sat(mu*0.5 + 0.5), mix(3.2, 1.35, breadth))*0.22*(0.4 + 0.6*breadth);
  float slv = pow(sat(mu), mix(11.5, 5.4, breadth))*(0.5 + 0.7*silver)*(0.85 + 0.4*lwp);
  return fwd + back + broad + slv;
}

// ── planet + atmosphere (metres) ──
const float Rp = 6360000.0;
const float Ratm = 6460000.0;
const float Hr = 8500.0;
const float Hm = 1200.0;
const vec3 betaR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float betaM = 21e-6;
const vec3 betaO = vec3(0.650e-6, 1.881e-6, 0.085e-6);   // Chappuis ozone absorption
float ozoneDens(float h){ return max(0.0, 1.0 - abs(h - 25000.0)/15000.0); }

vec2 raySphere(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r*r;
  float d = b*b - c;
  if (d < 0.0) return vec2(-1.0);
  float s = sqrt(d);
  return vec2(-b - s, -b + s);
}

/** Beer–Lambert sun transmittance from p to space, with Nimbus's soft terminator. */
vec3 sunTransmittanceTo(vec3 p, vec3 sun, float rayleighMul, float mieMul){
  vec2 ls = raySphere(p, sun, Ratm);
  if (ls.y <= 0.0) return vec3(1.0);
  float tca = -dot(p, sun);
  float grazeH = tca > 0.0 ? length(p + sun*tca) - Rp : 1e9;
  float horizonSoft = smoothstep(-14000.0, 2000.0, grazeH);
  if (horizonSoft <= 0.001) return vec3(0.0);
  float lseg = ls.y/6.0;
  float lR = 0.0, lM = 0.0, lO = 0.0;
  for (int j = 0; j < 6; j++){
    vec3 lp = p + sun*(float(j) + 0.5)*lseg;
    float lh = max(0.0, length(lp) - Rp);
    lR += exp(-lh/Hr)*lseg; lM += exp(-lh/Hm)*lseg; lO += ozoneDens(lh)*lseg;
  }
  return exp(-(betaR*rayleighMul*lR + betaM*mieMul*1.1*lM + betaO*lO))*horizonSoft;
}

/** Single-scattering sky radiance over [0, rayLen] with near-weighted midpoint sampling. */
vec3 atmosphere(vec3 ro, vec3 rd, vec3 sun, float rayLen, float rayleighMul, float mieMul, float mieG,
                float sunIntensity, out vec3 transmittance){
  const int VIEW = 24, LIGHT = 6;
  vec2 hit = raySphere(ro, rd, Ratm);
  transmittance = vec3(1.0);
  if (hit.y < 0.0) return vec3(0.0);
  float tStart = max(0.0, hit.x);
  float tEnd = min(rayLen, hit.y);
  vec2 pl = raySphere(ro, rd, Rp);
  if (pl.x > 0.0) tEnd = min(tEnd, pl.x);
  if (tEnd <= tStart) return vec3(0.0);
  float mu = dot(rd, sun);
  float pr = (3.0/(16.0*PI))*(1.0 + mu*mu);
  float pm = hgPhase(mu, 0.76*mieG);
  const float WARP = 1.7;
  float span = tEnd - tStart;
  float odR = 0.0, odM = 0.0, odO = 0.0;
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  float uPrev = 0.0;
  for (int i = 0; i < VIEW; i++){
    float u1 = pow((float(i) + 1.0)/float(VIEW), WARP);
    float seg = (u1 - uPrev)*span;
    vec3 sp = ro + rd*(tStart + 0.5*(uPrev + u1)*span);
    float h = length(sp) - Rp;
    float dR = exp(-h/Hr)*seg, dM = exp(-h/Hm)*seg, dO = ozoneDens(h)*seg;
    odR += dR; odM += dM; odO += dO;
    vec2 ls = raySphere(sp, sun, Ratm);
    float lseg = ls.y/float(LIGHT);
    float lR = 0.0, lM = 0.0, lO = 0.0; bool blocked = false;
    for (int j = 0; j < LIGHT; j++){
      vec3 lp = sp + sun*(float(j) + 0.5)*lseg;
      float lh = length(lp) - Rp;
      if (lh < 0.0){ blocked = true; break; }
      lR += exp(-lh/Hr)*lseg; lM += exp(-lh/Hm)*lseg; lO += ozoneDens(lh)*lseg;
    }
    if (!blocked){
      vec3 tau = betaR*rayleighMul*(odR - 0.5*dR + lR) + betaM*mieMul*1.1*(odM - 0.5*dM + lM) + betaO*(odO - 0.5*dO + lO);
      vec3 att = exp(-tau);
      sumR += att*dR; sumM += att*dM;
    }
    uPrev = u1;
  }
  transmittance = exp(-(betaR*rayleighMul*odR + betaM*mieMul*1.1*odM + betaO*odO));
  return (sumR*betaR*rayleighMul*pr + sumM*betaM*mieMul*pm)*sunIntensity;
}
`;

/**
 * Cloud field + lighting + march. Requires NIMBUS_COMMON_GLSL. Expects the
 * uniforms below; `cloudBottom/cloudTop` are set by initClouds().
 */
export const NIMBUS_CLOUD_GLSL = /* glsl */ `
precision highp sampler3D;
uniform highp sampler3D uShape;      // 4 km Perlin-Worley atlas: R base, GBA Worley FBM
uniform highp sampler3D uDetailTex;  // detail Worley atlas
uniform vec3 uSunDir;
uniform float uSkyBright;            // atmosphere energy
uniform float uSunWhite;             // top-of-atmosphere sun for the cloud direct term
uniform vec3 uSkyAmbTop, uGroundBounce;
uniform float uRayleigh, uMie, uMieG;
uniform float uCoverage, uCloudType, uSigma, uCloudBase, uCloudThick, uDroplet, uPrecip;
uniform vec2 uWindOffset;            // accumulated steering-wind drift (m)
uniform float uCloudTime;            // s (slow internal evolution)

// Nimbus transport dials (reference defaults).
const float SUN_BREADTH = 0.5, SILVER = 0.8, AMBIENT = 1.0, MS = 0.9, CORE_DARK = 0.6;
const float MS_EXT = 0.5, MS_SCAT = 0.42, MS_PHASE = 0.58, POWDER = 1.0, SILVER_SPREAD = 0.667;
const float BOUNDARY = 0.45, UNDERCUT = 0.55, BILLOW = 0.85, DETAIL = 0.45, TURRET = 0.85, TOPBILLOW = 0.8;

float cloudBottom = Rp + 1000.0, cloudTop = Rp + 3000.0;
void initClouds(){ cloudBottom = Rp + uCloudBase; cloudTop = Rp + uCloudBase + uCloudThick; }

struct Dens { float d; float h; float edge; };

/** Weather coverage (Nimbus "classic" field, advected by the steering wind). */
float weatherCoverage(vec2 xz){
  float m = fbm2((xz + uWindOffset*0.8)*0.00004 + 13.0);
  float thr = 0.62 - uCoverage*0.62;
  return sat(remap(m, thr, 1.0, 0.0, 1.0));
}

/** Genus vertical profile: 0 stratus, ~0.5 cumulus, 1 cumulonimbus (tower + anvil). */
float heightProfile(float h, float hn){
  float storm = smoothstep(0.5, 1.0, uCloudType);
  float low = smoothstep(0.0, 0.10, h);
  float topf = 1.0 - smoothstep(mix(0.78 + 0.10*storm, 0.88, sat(TOPBILLOW*0.6)), 1.0, hn);
  float heap = low*topf*mix(1.05, 0.62, smoothstep(0.20, 0.84, hn));
  float tower = low*(1.0 - smoothstep(0.95, 1.0, hn))*storm;
  float anvil = smoothstep(0.62, 0.84, h)*(1.0 - smoothstep(0.98, 1.0, h))*storm*0.70;
  float stratus = smoothstep(0.0, 0.08, h)*(1.0 - smoothstep(0.18, 0.34, h));
  float cumulus = max(heap, tower + anvil);
  return mix(stratus, cumulus, smoothstep(0.05, 0.45, uCloudType));
}

/** Dimensionless density at planet-frame point p. \`cheap\` = light-march variant. */
Dens cloudField(vec3 p, bool cheap){
  Dens o = Dens(0.0, 0.0, 0.0);
  float r = length(p);
  if (r < cloudBottom || r > cloudTop) return o;
  float h = sat((r - cloudBottom)/(cloudTop - cloudBottom));
  o.h = h;
  vec3 cs = p - vec3(0.0, Rp, 0.0);
  float cov = weatherCoverage(cs.xz);
  if (cov <= 0.002) return o;
  vec3 drift = vec3(uWindOffset.x, uCloudTime*0.35, uWindOffset.y);
  // Storm cells are wider than fair-weather cumulus (5–10 km vs 1–2 km).
  float cellM = mix(4096.0, 8192.0, smoothstep(0.6, 1.0, uCloudType));
  vec4 s = textureLod(uShape, (cs + drift)*(1.0/cellM), 0.0);
  float lowFBM = s.g*0.625 + s.b*0.25 + s.a*0.125;
  float base = sat(remap(s.r, lowFBM - 1.0, 1.0, 0.0, 1.0));
  // Per-turret ceilings: each thermal tops out at its own buoyancy limit; the base stays flat.
  float hT = h;
  float turretAmt = smoothstep(0.20, 0.55, uCloudType)*TURRET;
  if (turretAmt > 0.001){
    float tf = fbm2((cs.xz + uWindOffset*0.6)*0.00022 + uCloudTime*0.0006 + 17.3);
    hT = h/mix(1.0, max(0.40, sat(0.34 + 0.58*tf)), turretAmt);
  }
  float d = sat(remap(base, 1.0 - cov, 1.0, 0.0, 1.0))*heightProfile(h, hT);
  if (d <= 0.001) return o;
  // Convective meso-structure from the atlas at 3.3× frequency (billows / cauliflower).
  vec4 b = textureLod(uShape, (cs + drift*1.2)*(1.0/1240.0) + vec3(0.37, h*0.42, 0.11), 0.0);
  float billow = b.g*0.5 + b.b*0.3 + b.a*0.2;
  float nearTop = smoothstep(0.34, 0.98, hT);
  if (!cheap){
    float anatomy = mix(0.55, 1.35, smoothstep(0.30, 0.72, billow));
    d = sat(d*mix(1.0, anatomy, BILLOW*0.9));
    float topSigned = (billow - 0.5)*2.4*nearTop*TOPBILLOW;
    topSigned = min(topSigned, 0.0) + max(topSigned, 0.0)*smoothstep(0.105, 0.40, d);
    d = sat(d + topSigned);
    // Edge erosion by the detail atlas (billowy near the base, wispy near the top).
    vec3 dt = textureLod(uDetailTex, (cs + drift*1.4)*(1.0/340.0), 0.0).rgb;
    float dfbm = dt.r*0.625 + dt.g*0.25 + dt.b*0.125;
    float mod = mix(dfbm, 1.0 - dfbm, sat(h*4.0));
    d = sat(remap(d, mod*DETAIL*0.6, 1.0, 0.0, 1.0));
  } else {
    d = sat(d + (billow - 0.535)*nearTop*TOPBILLOW*1.08);
  }
  d *= 1.0 - UNDERCUT*smoothstep(0.02, 0.18, h)*(1.0 - smoothstep(0.24, 0.44, h))*0.35;
  o.d = d;
  o.edge = smoothstep(0.02, 0.15, d)*(1.0 - smoothstep(0.28, 0.75, d));
  return o;
}

/** Reduced-extinction optical depth toward the sun (similarity theory). */
float lightMarch(vec3 p, int steps){
  float stepL = max(30.0, (cloudTop - cloudBottom)*0.055);
  float od = 0.0;
  vec3 q = p;
  for (int i = 0; i < 8; i++){
    if (i >= steps) break;
    float grow = 1.0 + float(i)*0.55;
    q += uSunDir*stepL*grow;
    if (length(q) > cloudTop + 1.0) break;
    od += cloudField(q, true).d*stepL*grow;
  }
  return od*uSigma*0.16;
}

/** In-scatter radiance at a cloud sample (Nimbus + AETHER transport). */
vec3 cloudLighting(vec3 p, vec3 rd, Dens den, vec3 sunColor, int lightSteps){
  float mu = dot(rd, uSunDir);
  float shadow = exp(-lightMarch(p, lightSteps));
  float deepCore = (1.0 - den.edge*0.65)*den.d;
  shadow = pow(max(1e-3, shadow), 1.0 + CORE_DARK*deepCore*10.6);
  float powderRaw = 1.0 - exp(-den.d*(5.0 + 3.0*SILVER));
  float powder = pow(max(powderRaw, 1e-4), POWDER);
  float lwp = sat(den.d*1.4);
  float ph = phaseCloud(mu, uDroplet, SUN_BREADTH, SILVER, lwp);
  vec3 topAmb = uSkyAmbTop*mix(0.85, 1.55, den.h);
  vec3 botAmb = uGroundBounce*0.35 + uSkyAmbTop*0.06;
  vec3 amb = mix(botAmb, topAmb, smoothstep(0.02, 0.92, den.h))*AMBIENT*(0.25 + 0.75*den.h)*mix(1.0, 0.34, sat(deepCore));
  amb *= 1.0 + 0.18*den.edge*(0.35 + 0.65*den.h);
  vec3 direct = vec3(0.0);
  float ext = 1.0, amp = 1.0;
  for (int n = 0; n < 4; n++){
    float sh = pow(max(1e-4, shadow), ext);
    float fl = 1.0 - pow(MS_PHASE, float(n));
    float phN = mix(ph, 1.0/(4.0*PI), clamp(fl, 0.0, 0.94));
    direct += amp*sh*(phN*(0.6 + 0.4*powder) + 0.008);
    ext *= MS_EXT; amp *= MS_SCAT;
  }
  direct *= sunColor*powder*1.64*mix(1.0, 0.38, sat(deepCore))*(1.0 + 0.32*den.edge*smoothstep(0.05, 0.72, mu));
  float backlit = max(mu, 0.0);
  float slv = pow(backlit, mix(9.0, 1.5, SILVER_SPREAD))*shadow*(0.35 + 1.30*SILVER);
  vec3 silver = vec3(1.0, 0.93, 0.74)*den.edge*slv*sunColor*0.2;
  float skyLum = dot(uSkyAmbTop, vec3(0.2126, 0.7152, 0.0722));
  vec3 ms = mix(vec3(0.62, 0.68, 0.78)*skyLum*2.4, uSkyAmbTop*1.2, 0.55)
           *powder*(0.07 + 0.18*MS)*(0.45 + 0.55*shadow)*mix(1.0, 0.22, sat(deepCore));
  vec3 light = amb + direct + silver + ms;
  float cavity = (1.0 - shadow)*(0.28 + 0.72*den.d)*(1.0 - smoothstep(0.66, 1.0, den.h));
  light *= 1.0 - cavity*CORE_DARK*1.36;
  light *= 1.0 - (1.0 - smoothstep(0.28, 0.58, den.h))*sat(deepCore*1.25)*CORE_DARK*0.25;
  return light;
}

/** [tStart, tEnd] of the view ray inside the curved cloud shell, or (-1) on miss. */
vec2 cloudShell(vec3 ro, vec3 rd){
  float r = length(ro);
  vec2 tb = raySphere(ro, rd, cloudBottom);
  vec2 tt = raySphere(ro, rd, cloudTop);
  float tS, tE;
  if (r < cloudBottom){
    if (tb.y < 0.0) return vec2(-1.0);
    tS = tb.y; tE = tt.y;
  } else if (r < cloudTop){
    tS = 0.0; tE = tb.x > 0.0 ? tb.x : tt.y;
  } else {
    if (tt.x < 0.0) return vec2(-1.0);
    tS = tt.x; tE = tb.x > 0.0 ? tb.x : tt.y;
  }
  if (tE <= tS) return vec2(-1.0);
  return vec2(tS, tE);
}

/**
 * March the cloud shell. Returns (in-scatter with aerial perspective, transmittance)
 * and the transmittance-weighted cloud distance (−1 if none).
 */
vec4 marchClouds(vec3 ro, vec3 rd, float tLimit, float jitter, int steps, int lightSteps, out float cloudDist){
  cloudDist = -1.0;
  vec2 seg = cloudShell(ro, rd);
  if (seg.x < 0.0 || seg.x >= tLimit) return vec4(0.0, 0.0, 0.0, 1.0);
  float tEnd = min(min(seg.y, tLimit), seg.x + 90000.0);
  vec3 pMid = ro + rd*(0.5*(seg.x + tEnd));
  vec3 sunC = vec3(uSunWhite)*sunTransmittanceTo(pMid, uSunDir, uRayleigh, uMie);
  // Geometric stepping: the step is a fixed fraction of the distance (what a pixel
  // subtends grows linearly), so \`steps\` samples always span the shell out to 90 km.
  float span = tEnd - seg.x;
  float k = max(pow(tEnd/max(seg.x, 400.0), 1.0/float(steps)) - 1.0, 0.004);
  float minDs = max(35.0, span/float(steps*4));
  float t = seg.x + max(minDs, seg.x*k)*jitter;
  vec3 scatter = vec3(0.0);
  float T = 1.0, dAcc = 0.0, wAcc = 0.0;
  int empty = 0;
  for (int i = 0; i < 256; i++){
    if (i >= steps*2 || t > tEnd || T < 0.01) break;
    vec3 p = ro + rd*t;
    float ds = max(minDs, t*k);
    Dens d = cloudField(p, false);
    if (d.d > 0.004){
      if (empty > 0){ t -= ds*0.5; empty = 0; p = ro + rd*t; d = cloudField(p, false); }
      float sigmaE = d.d*uSigma*mix(1.0, mix(0.66, 1.5, d.edge), BOUNDARY);
      float stepT = exp(-sigmaE*ds);
      vec3 L = cloudLighting(p, rd, d, sunC, lightSteps);
      float w = T*(1.0 - stepT);
      scatter += w*L;
      dAcc += w*t; wAcc += w;
      T *= stepT;
      t += ds;
    } else {
      // empty space: stride twice as far until something is found
      empty++;
      t += ds*2.0;
    }
  }
  if (wAcc > 1e-4){
    cloudDist = dAcc/wAcc;
    vec3 apT; vec3 apIn = atmosphere(ro, rd, uSunDir, cloudDist, uRayleigh, uMie, uMieG, uSkyBright, apT);
    scatter = scatter*apT + apIn*(1.0 - T);
  }
  return vec4(scatter, T);
}

/**
 * Rain shafts under the deck: precipitation columns where the deck is thick,
 * grey forward-scattering veils with a soft top at the cloud base.
 */
vec4 marchRain(vec3 ro, vec3 rd, float tLimit, float jitter){
  if (uPrecip <= 0.001) return vec4(0.0, 0.0, 0.0, 1.0);
  vec2 hb = raySphere(ro, rd, cloudBottom);
  float tEnd = min(tLimit, hb.y > 0.0 ? hb.y : tLimit);
  tEnd = min(tEnd, 40000.0);
  const int N = 10;
  float ds = tEnd/float(N);
  float T = 1.0; vec3 S = vec3(0.0);
  vec3 lightC = uSkyAmbTop*1.1 + vec3(uSunWhite)*0.02;
  for (int i = 0; i < N; i++){
    vec3 p = ro + rd*(ds*(float(i) + jitter));
    float h = length(p) - Rp;
    vec3 cs = p - vec3(0.0, Rp, 0.0);
    float cov = weatherCoverage(cs.xz);
    float column = smoothstep(0.45, 0.9, cov)*smoothstep(0.4, 0.95, fbm2((cs.xz + uWindOffset)*0.00018 + 3.7));
    float dens = uPrecip*column*(1.0 - smoothstep(uCloudBase*0.85, uCloudBase*1.05, h));
    float sig = dens*2.2e-4;
    float st = exp(-sig*ds);
    S += T*(1.0 - st)*lightC;
    T *= st;
  }
  return vec4(S, T);
}
`;

/** Tileable 3D noise bake (Nimbus noise_bake.frag, verbatim math). */
export const NOISE_BAKE_FS = /* glsl */ `#version 300 es
precision highp float;
uniform float uSlice;
uniform float uSize;
uniform int uMode;
out vec4 outColor;
vec3 hash33(vec3 p, float period){
  p = mod(p, vec3(period));
  p = fract(p*vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yzz)*p.zyx);
}
float pnoise(vec3 x, float period){
  vec3 i = floor(x), f = fract(x);
  vec3 u = f*f*f*(f*(f*6.0 - 15.0) + 10.0);
  vec3 g000 = hash33(i + vec3(0,0,0), period)*2.0 - 1.0;
  vec3 g100 = hash33(i + vec3(1,0,0), period)*2.0 - 1.0;
  vec3 g010 = hash33(i + vec3(0,1,0), period)*2.0 - 1.0;
  vec3 g110 = hash33(i + vec3(1,1,0), period)*2.0 - 1.0;
  vec3 g001 = hash33(i + vec3(0,0,1), period)*2.0 - 1.0;
  vec3 g101 = hash33(i + vec3(1,0,1), period)*2.0 - 1.0;
  vec3 g011 = hash33(i + vec3(0,1,1), period)*2.0 - 1.0;
  vec3 g111 = hash33(i + vec3(1,1,1), period)*2.0 - 1.0;
  float n000 = dot(g000, f - vec3(0,0,0)), n100 = dot(g100, f - vec3(1,0,0));
  float n010 = dot(g010, f - vec3(0,1,0)), n110 = dot(g110, f - vec3(1,1,0));
  float n001 = dot(g001, f - vec3(0,0,1)), n101 = dot(g101, f - vec3(1,0,1));
  float n011 = dot(g011, f - vec3(0,1,1)), n111 = dot(g111, f - vec3(1,1,1));
  float nx00 = mix(n000, n100, u.x), nx10 = mix(n010, n110, u.x);
  float nx01 = mix(n001, n101, u.x), nx11 = mix(n011, n111, u.x);
  return mix(mix(nx00, nx10, u.y), mix(nx01, nx11, u.y), u.z)*0.5 + 0.5;
}
float worley(vec3 p, float cells){
  p *= cells;
  vec3 ip = floor(p), fp = fract(p);
  float d = 1e9;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++){
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(mod(ip + g, vec3(cells)), cells);
    vec3 r = g + o - fp;
    d = min(d, dot(r, r));
  }
  return 1.0 - clamp(sqrt(d), 0.0, 1.0);
}
float worleyFBM(vec3 p, float f){ return worley(p, f)*0.625 + worley(p, f*2.0)*0.25 + worley(p, f*4.0)*0.125; }
float perlinFBM(vec3 p, float cells){
  return pnoise(p*cells, cells)*0.55 + pnoise(p*cells*2.0, cells*2.0)*0.30 + pnoise(p*cells*4.0, cells*4.0)*0.15;
}
float remapB(float v, float a, float b, float c, float d){ return c + (clamp(v, a, b) - a)*(d - c)/max(1e-5, b - a); }
void main(){
  vec3 uvw = vec3(gl_FragCoord.xy/vec2(uSize), uSlice);
  if (uMode == 0){
    float perlin = perlinFBM(uvw, 4.0);
    float wLow = worleyFBM(uvw, 4.0);
    float pw = remapB(perlin, wLow - 1.0, 1.0, 0.0, 1.0);
    outColor = vec4(clamp(pw, 0.0, 1.0), wLow, worleyFBM(uvw, 6.0), worleyFBM(uvw, 9.0));
  } else {
    outColor = vec4(worleyFBM(uvw, 2.0), worley(uvw, 5.0), worley(uvw, 8.0), 1.0);
  }
}`;
