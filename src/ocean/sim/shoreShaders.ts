/**
 * GLSL for the T2 shore field.
 *
 * state   RGBA32F (h, hu, hv, b)          — HR+HLL finite volume (mirrors sweCpu.ts)
 * brk     RGBA16F (E, plungeClock, dirX, dirZ)   — WaveLab breaking detection
 * lip     RGBA32F (age, v0, bubble amount, bubble amount·depth) — lip momentum + plume
 * foam    RGBA32F (mass, mass·age, wetness, -)   — extensive storage (Foam Foundry)
 * rel     RGBA32F (V, V·vx, V·vy, V·vz)          — splash release accumulation
 */

const SWE_COMMON = /* glsl */ `
#define G 9.81
#define H_DRY 1e-4
uniform int uNx, uNz;
uniform float uDx;
float desing(float h, float q){ float h4 = h*h*h*h; return 1.41421356*h*q/sqrt(h4 + max(h4, 1e-6)); }
vec3 hll(float hL, float uL, float vL, float hR, float uR, float vR){
  if (hL <= H_DRY && hR <= H_DRY) return vec3(0.0);
  float cL = sqrt(G*hL), cR = sqrt(G*hR);
  float sL = min(uL - cL, uR - cR), sR = max(uL + cL, uR + cR);
  vec3 FL = vec3(hL*uL, hL*uL*uL + 0.5*G*hL*hL, hL*uL*vL);
  vec3 FR = vec3(hR*uR, hR*uR*uR + 0.5*G*hR*hR, hR*uR*vR);
  if (sL >= 0.0) return FL;
  if (sR <= 0.0) return FR;
  vec3 UL = vec3(hL, hL*uL, hL*vL), UR = vec3(hR, hR*uR, hR*vR);
  return (sR*FL - sL*FR + sL*sR*(UR - UL))/(sR - sL);
}
`;

export const SHORE_INIT_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uBed;       // baked terrain (R32F), same grid
uniform float uLevel;
out vec4 o;
void main(){
  float b = texelFetch(uBed, ivec2(gl_FragCoord.xy), 0).r;
  o = vec4(max(0.0, uLevel - b), 0.0, 0.0, b);   // lake at rest
}`;

export const SHORE_STEP_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
${SWE_COMMON}
// Second order: MUSCL on (h, η, u, v) with the MC limiter, hydrostatic
// reconstruction at faces, Audusse's centred bed source, SSP-RK2 (two passes).
// Mirrors sweCpu.ts rhs()/stepSwe(order 2) line by line.
#define THETA 2.0
uniform sampler2D uState;        // stage input U^(s)
uniform sampler2D uState0;       // U^n (stage 1 combination)
uniform int uStage;              // 0: U¹ = U + dt·L(U);  1: U² = ½U⁰ + ½(U¹ + dt·L(U¹))
uniform float uDt;
uniform float uManning;
uniform vec2 uOrigin;
uniform float uLevel;
uniform int uOpenMask;           // bit0 W, bit1 E, bit2 S, bit3 N
uniform float uRelaxWidth;       // m
uniform float uRelaxRate;        // 1/s
uniform vec2 uWaveDir;           // mean propagation direction (unit)
uniform sampler2DArray uDispArr;
uniform int uCascadeCount;
uniform float uSizes[4];
uniform vec2 uCascOffset[4];
uniform float uIncoming;         // 0..1 gain on the wave-maker signal (spin-up ramp)
uniform sampler2D uFoamF;        // .w = depth released to the splash system last break pass
uniform float uSink;             // 1 on the first substep after a break pass
out vec4 o;

float oceanEta(vec2 local){
  float e = 0.0;
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount - 1) break;       // the finest cascade stays a render-only chop layer
    e += textureLod(uDispArr, vec3((local + uCascOffset[c])/uSizes[c], float(c)), 0.0).y;
  }
  return e*uIncoming + uLevel;
}
/** Target state from the open ocean (linear long-wave relation for the velocity). */
vec4 target(ivec2 c, float b){
  vec2 local = (vec2(c) + 0.5)*uDx;
  float eta = oceanEta(local);
  float h = max(0.0, eta - b);
  float h0 = max(uLevel - b, 0.3);
  vec2 u = uWaveDir*(eta - uLevel)*sqrt(G/h0);
  return vec4(h, h*u.x, h*u.y, b);
}
/** (h, u, v, b) of any cell, with two layers of ghosts: wave-maker on open edges, mirror on walls. */
vec4 prim(ivec2 p){
  if (p.x >= 0 && p.y >= 0 && p.x < uNx && p.y < uNz){
    vec4 s = texelFetch(uState, p, 0);
    return vec4(s.x, desing(s.x, s.y), desing(s.x, s.z), s.w);
  }
  int side = p.x < 0 ? 0 : p.x >= uNx ? 1 : p.y < 0 ? 2 : 3;
  ivec2 edge = clamp(p, ivec2(0), ivec2(uNx - 1, uNz - 1));
  vec4 e = texelFetch(uState, edge, 0);
  if (((uOpenMask >> side) & 1) == 1 && e.w < -0.3){
    vec4 t = target(edge, e.w);
    return vec4(t.x, desing(t.x, t.y), desing(t.x, t.z), e.w);
  }
  ivec2 m = p;
  if (p.x < 0) m.x = -p.x - 1; else if (p.x >= uNx) m.x = 2*uNx - p.x - 1;
  if (p.y < 0) m.y = -p.y - 1; else if (p.y >= uNz) m.y = 2*uNz - p.y - 1;
  vec4 q = texelFetch(uState, clamp(m, ivec2(0), ivec2(uNx - 1, uNz - 1)), 0);
  float u = desing(q.x, q.y), v = desing(q.x, q.z);
  return side < 2 ? vec4(q.x, -u, v, q.w) : vec4(q.x, u, -v, q.w);
}
vec4 W(vec4 q){ return vec4(q.x, q.x + q.w, q.y, q.z); }   // (h, η, u, v)
vec4 lim(vec4 a, vec4 b){
  vec4 m = min(min(THETA*abs(a), 0.5*abs(a + b)), THETA*abs(b));
  return sign(a)*m*step(0.0, a*b);
}
/** Face value (h, η, u, v) on side sgn of the middle cell; its bed is η − h. */
vec4 face(vec4 qm, vec4 q0, vec4 qp, float sgn){
  vec4 w0 = W(q0);
  vec4 f = w0 + 0.5*sgn*lim(w0 - W(qm), W(qp) - w0);
  f.x = max(f.x, 0.0);
  if (f.x <= H_DRY) f.zw = vec2(0.0);
  return f;
}
/** HR + HLL flux between face states; returns flux and the two starred depths. */
vec3 faceFlux(vec4 L, vec4 R, int axis, out float hLs, out float hRs){
  float bStar = max(L.y - L.x, R.y - R.x);
  hLs = max(0.0, L.y - bStar); hRs = max(0.0, R.y - bStar);
  float unL = axis == 0 ? L.z : L.w, utL = axis == 0 ? L.w : L.z;
  float unR = axis == 0 ? R.z : R.w, utR = axis == 0 ? R.w : R.z;
  return hll(hLs, unL, utL, hRs, unR, utR);
}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 S = texelFetch(uState, c, 0);
  vec3 dU = vec3(0.0);
  for (int axis = 0; axis < 2; axis++){
    ivec2 e = axis == 0 ? ivec2(1, 0) : ivec2(0, 1);
    vec4 qm2 = prim(c - 2*e), qm1 = prim(c - e), q0 = prim(c), qp1 = prim(c + e), qp2 = prim(c + 2*e);
    vec4 Cp = face(qm1, q0, qp1, 1.0), Cm = face(qm1, q0, qp1, -1.0);
    vec4 Nm = face(q0, qp1, qp2, -1.0);    // left face of the + neighbour
    vec4 Pp = face(qm2, qm1, q0, 1.0);     // right face of the − neighbour
    float a1, a2, b1, b2;
    vec3 Fp = faceFlux(Cp, Nm, axis, a1, a2);
    vec3 Fm = faceFlux(Pp, Cm, axis, b1, b2);
    float fp1 = Fp.y + 0.5*G*(Cp.x*Cp.x - a1*a1);
    float fm1 = Fm.y + 0.5*G*(Cm.x*Cm.x - b2*b2);
    float sc = -G*((Cp.y - Cp.x) - (Cm.y - Cm.x))*0.5*(Cp.x + Cm.x);
    vec3 n = vec3(Fp.x - Fm.x, fp1 - fm1 - sc, Fp.z - Fm.z);
    dU += axis == 0 ? n : n.xzy;
  }
  vec3 U = S.xyz - (uDt/uDx)*dU;
  if (uStage == 1) U = 0.5*texelFetch(uState0, c, 0).xyz + 0.5*U;
  U.x = max(U.x, 0.0);
  if (U.x <= H_DRY){ U.yz = vec2(0.0); }
  else if (uStage == 1 && uManning > 0.0){
    float u = desing(U.x, U.y), v = desing(U.x, U.z);
    float s = 1.0 + uDt*G*uManning*uManning*length(vec2(u, v))/pow(U.x, 4.0/3.0);
    U.yz /= s;
  }
  // Water handed to the splash system leaves with its velocity.
  if (uStage == 1 && uSink > 0.5 && U.x > H_DRY){
    float dh = min(texelFetch(uFoamF, c, 0).w, 0.5*U.x);
    U.yz *= (U.x - dh)/U.x;
    U.x -= dh;
  }
  // Generating/absorbing relaxation band along open (seaward) edges.
  if (uStage == 1){
    float dmin = 1e9;
    if ((uOpenMask & 1) == 1) dmin = min(dmin, (float(c.x) + 0.5)*uDx);
    if ((uOpenMask & 2) == 2) dmin = min(dmin, (float(uNx - c.x) - 0.5)*uDx);
    if ((uOpenMask & 4) == 4) dmin = min(dmin, (float(c.y) + 0.5)*uDx);
    if ((uOpenMask & 8) == 8) dmin = min(dmin, (float(uNz - c.y) - 0.5)*uDx);
    if (dmin < uRelaxWidth && S.w < -0.3){
      float w = 1.0 - dmin/uRelaxWidth;
      float k = clamp(uRelaxRate*w*w*uDt, 0.0, 1.0);
      U = mix(U, target(c, S.w).xyz, k);
    }
  }
  o = vec4(U, S.w);
}`;

/**
 * Breaking, lip momentum, bubble plume, extensive foam, wetness and splash
 * release. MRT: brk, lip, foam, rel.
 */
export const SHORE_BREAK_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${SWE_COMMON}
uniform sampler2D uState;
uniform sampler2D uBrk;
uniform sampler2D uLip;
uniform sampler2D uFoam;
uniform sampler2D uRel;
uniform float uDt;
uniform float uLevel;
uniform float uSlopeT;     // critical front slope (tan)
uniform float uGammaT;     // crest/depth ratio at breaking
uniform float uGrow, uDecay, uPlungeT, uPropK, uPeel;
uniform float uFoamLife;
uniform float uWetMemory;  // s
uniform float uBubSrc, uBubRise;
uniform vec2 uWaveDir;
uniform float uReleaseGain;   // 0 while spinning up (nothing is visible to splash yet)
layout(location=0) out vec4 oBrk;
layout(location=1) out vec4 oLip;
layout(location=2) out vec4 oFoam;
layout(location=3) out vec4 oRel;
vec4 st(ivec2 p){ return texelFetch(uState, clamp(p, ivec2(0), ivec2(uNx - 1, uNz - 1)), 0); }
float etaAt(ivec2 p){ vec4 s = st(p); return s.x > H_DRY ? s.x + s.w : max(s.w, uLevel); }
vec4 bilin(sampler2D t, vec2 cellPos){
  vec2 uv = (cellPos + 0.5)/vec2(float(uNx), float(uNz));
  return texture(t, uv);
}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = st(c);
  float h = s.x, b = s.w;
  float eta = h > H_DRY ? h + b : b;
  vec2 vel = h > 0.01 ? vec2(desing(h, s.y), desing(h, s.z)) : vec2(0.0);
  vec2 grad = vec2(etaAt(c + ivec2(1,0)) - etaAt(c - ivec2(1,0)), etaAt(c + ivec2(0,1)) - etaAt(c - ivec2(0,1)))/(2.0*uDx);
  float spd = length(vel), gl2 = length(grad);
  vec2 dir = spd > 0.12 ? vel/spd : (gl2 > 1e-4 ? -grad/gl2 : uWaveDir);
  float slopeFwd = -dot(grad, dir);
  float crest = max(eta - uLevel, 0.0);
  float ratio = crest/max(h, 0.12);
  float Fr = spd/sqrt(G*max(h, 0.05));
  float wet = smoothstep(0.01, 0.05, h);
  float dSlope = smoothstep(uSlopeT*0.75, uSlopeT*1.15, slopeFwd);
  float dRatio = smoothstep(uGammaT*0.7, uGammaT*1.05, ratio);
  // A captured shock is a bore: the SWE dissipates exactly there. The MC-limited scheme
  // resolves a jump over ~2 cells, so the rise across 2·dx measures the bore strength.
  float jump = slopeFwd*2.0*uDx;
  float dShock = smoothstep(0.08, 0.16, jump/(max(h, 0.05) + 0.1))*smoothstep(0.04, 0.12, jump);
  float dBore = max(smoothstep(1.05, 1.45, Fr)*smoothstep(0.0, 0.15, crest), dShock);
  float detect = clamp(max(dSlope*(0.3 + 0.7*dRatio), dBore), 0.0, 1.0)*wet;

  // Breaking energy travels with the front at c = √(gh) and peels along ripe crests.
  vec4 bk = texelFetch(uBrk, c, 0);
  float cph = sqrt(G*max(h, 0.05));
  vec2 up = vec2(c) - dir*(cph*uDt/uDx);
  vec4 upC = bilin(uBrk, up);
  float E = upC.x*uPropK;                      // breaking energy rides the front (advected, not retained)
  vec2 tang = vec2(-dir.y, dir.x);
  float Elat = max(bilin(uBrk, vec2(c) + tang*1.2).x, bilin(uBrk, vec2(c) - tang*1.2).x);
  // Peeling needs a ripe crest AND a steepening face under it.
  float ripe = smoothstep(uGammaT*0.5, uGammaT*0.95, ratio)*smoothstep(0.03, 0.08, jump/(max(h, 0.05) + 0.1))*wet;
  E = max(E, Elat*uPeel*ripe);
  E += detect*uGrow*uDt;
  E -= uDecay*(1.0 - 0.6*detect)*uDt;
  E = clamp(E, 0.0, 1.0)*wet;
  float pScale = max(1.0, sqrt(crest/0.6));
  float ph = max(bk.y, upC.y*0.998);
  ph = E > 0.22 ? min(1.0, ph + uDt/(uPlungeT*pScale)) : max(0.0, ph - 2.0*uDt/(uPlungeT*pScale));
  vec2 nd = mix(bk.zw, dir, 0.25);
  vec2 sdir = length(nd) > 1e-4 ? normalize(nd) : dir;
  oBrk = vec4(E, ph, sdir);

  // Lip momentum: the crest keeps its speed while the base decelerates (Δc = √(g(h+crest)) − √(gh)).
  vec4 lp = texelFetch(uLip, c, 0);
  vec4 lup = bilin(uLip, up);
  if (lup.x > lp.x){ lp.x = lup.x; lp.y = max(lp.y, lup.y); }
  vec4 l1 = bilin(uLip, vec2(c) + tang*1.5), l2 = bilin(uLip, vec2(c) - tang*1.5);
  float catchG = smoothstep(0.16, 0.45, E);
  lp.x = max(lp.x, max(l1.x, l2.x)*0.96*catchG);
  lp.y = max(lp.y, max(l1.y, l2.y)*0.97*catchG);
  float Eg = smoothstep(0.12, 0.45, E);
  float land = 0.0;
  float ageBefore = lp.x;
  if (Eg > 0.001){
    float dc = sqrt(G*(max(h, 0.1) + crest)) - cph;
    lp.y += (max(dc, 0.0) - lp.y)*min(1.0, 3.5*uDt)*Eg;
    lp.x += uDt*Eg;
  } else {
    land = step(0.35, lp.x)*step(lp.x - 3.0*uDt, 0.35);  // the lip just finished its flight
    lp.x = max(0.0, lp.x - 3.0*uDt);
    if (lp.x < 0.02) lp.y *= exp(-3.0*uDt);
  }
  float maxAge = 10.0*sqrt(max(crest, 0.25)/G);
  // The jet lands once, where its flight time is first reached (a travelling crest
  // carries its age along, so cells it moves into do not re-trigger).
  if (ageBefore < maxAge*0.95 && lp.x >= maxAge*0.95 && Eg > 0.2) land = 1.0;
  lp.x = min(lp.x, maxAge);
  if (h < 0.01) lp.xy = vec2(0.0);
  // Rising bubble plume: extensive (amount, amount·depth) so transport cannot invent shallow bubbles.
  vec2 back = vec2(c) - vel*uDt/uDx;
  vec4 lpb = bilin(uLip, back);
  float amt = lpb.z, ad = lpb.w;
  float inj = uBubSrc*E*E*uDt;
  amt += inj; ad += inj*min(h, 1.5 + crest);
  float dep = ad/max(amt, 1e-5);
  float rise = uBubRise*uDt;
  float surfacing = amt*clamp(rise/max(dep, 0.05), 0.0, 1.0);
  amt -= surfacing; ad = max(ad - surfacing*dep - amt*rise, 0.0);
  amt *= exp(-0.12*uDt);
  oLip = vec4(lp.xy, clamp(amt, 0.0, 2.0), clamp(ad, 0.0, 4.0));

  // Foam: extensive mass & mass·age, advected with the flow; sources from breaking, swash, landing lips and surfacing bubbles.
  vec4 fm = bilin(uFoam, back);
  float m = fm.x, A = fm.y;
  float birth = (0.9*E*E + 0.35*smoothstep(0.35, 0.0, h)*smoothstep(0.5, 1.6, spd)*step(0.005, h) + 0.8*land + 0.6*surfacing)*uDt;
  float age = A/max(m, 1e-4);
  float decay = exp(-uDt/uFoamLife*(0.6 + 0.8*smoothstep(0.4*uFoamLife, 1.5*uFoamLife, age)));
  m = m*decay + birth;
  A = A*decay + m*uDt;
  if (m < 1e-4){ m = 0.0; A = 0.0; }
  float wetMem = texelFetch(uFoam, c, 0).z;
  wetMem = h > 0.02 ? 1.0 : wetMem*exp(-uDt/uWetMemory);
  // Splash release (heightfield → splash): landing jets and vigorous bores exceed what
  // 2.5D can show. The released depth leaves the solver on its next substep (foam.w),
  // so the splash system owns that water until it lands again: mass is escrowed, not invented.
  float dH = (land*crest*0.12 + E*E*smoothstep(1.0, 1.6, Fr)*0.004*uDt)*wet;
  dH = min(dH, 0.5*h)*uReleaseGain;
  oFoam = vec4(min(m, 3.0), min(A, 200.0), wetMem, dH);
  vec4 rel = texelFetch(uRel, c, 0);
  float V = dH*uDx*uDx;
  if (V > 0.0){
    vec2 fwd = sdir*(cph + lp.y);
    float vy = 0.6*sqrt(G*max(crest, 0.1)) + lp.y*0.35;
    rel += vec4(V, V*fwd.x, V*vy, V*fwd.y);
  }
  oRel = rel;
}`;

/**
 * Render-facing output. MRT: surf (η + lip lift, slopeX, slopeZ, h), aux (foam cover,
 * E, lip dx, lip dz), extra (wetness, bubbles, foam on sand, -).
 */
export const SHORE_OUTPUT_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${SWE_COMMON}
uniform sampler2D uState;
uniform sampler2D uBrk;
uniform sampler2D uLip;
uniform sampler2D uFoam;
uniform float uLevel;
uniform float uGammaT;
uniform float uCurl;        // lip strength
uniform float uCurlThrow;
uniform float uFade;
uniform float uPeakQ;       // Lagrangian crest sharpening
layout(location=0) out vec4 oSurf;
layout(location=1) out vec4 oAux;
layout(location=2) out vec4 oExtra;
float sst(float a, float b, float x){ float t = clamp((x - a)/(b - a), 0.0, 1.0); return t*t*t*(t*(t*6.0 - 15.0) + 10.0); }
vec4 st(ivec2 p){ return texelFetch(uState, clamp(p, ivec2(0), ivec2(uNx - 1, uNz - 1)), 0); }
float etaAt(ivec2 p){ vec4 s = st(p); return s.x > H_DRY ? s.x + s.w : s.w; }
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = st(c);
  float h = s.x, b = s.w;
  float eta = h > H_DRY ? h + b : b;
  vec2 grad = vec2(etaAt(c + ivec2(1,0)) - etaAt(c - ivec2(1,0)), etaAt(c + ivec2(0,1)) - etaAt(c - ivec2(0,1)))/(2.0*uDx);
  vec4 bk = texelFetch(uBrk, c, 0);
  vec2 dirS = normalize(bk.zw + vec2(1e-5, 0.0));
  vec2 tang = vec2(-dirS.y, dirS.x);
  // Smooth the break state along the crest so the lip bends as one sheet.
  vec4 lip = texelFetch(uLip, c, 0)*0.4;
  float Es = bk.x*0.4;
  for (int k = -2; k <= 2; k++){
    if (k == 0) continue;
    ivec2 q = c + ivec2(round(tang*float(k)*1.5));
    float w = k == 1 || k == -1 ? 0.19 : 0.11;
    lip += st(q).x > 0.0 ? texelFetch(uLip, clamp(q, ivec2(0), ivec2(uNx-1, uNz-1)), 0)*w : vec4(0.0);
    Es += texelFetch(uBrk, clamp(q, ivec2(0), ivec2(uNx-1, uNz-1)), 0).x*w;
  }
  float crest = max(eta - uLevel, 0.0);
  float C = uGammaT*max(h, 0.15);
  float sRel = crest/C;
  float faceGate = max(sst(0.6, 0.98, sRel), smoothstep(-0.02, 0.25, max(-dot(grad, dirS), 0.0)));
  float featK = smoothstep(1.5, 4.5, crest/uDx);
  float w = faceGate*smoothstep(0.1, 0.5, Es)*featK;
  vec2 lipXZ = vec2(0.0);
  float lift = 0.0;
  if (w > 0.002 && uCurl > 0.002 && lip.x > 0.001 && h > 0.05){
    // Ballistic sheet (WaveLab): each height fraction flies forward at v0 and falls under g.
    float hGrad = sst(0.22, 1.3, sRel);
    float fall = pow(hGrad, 1.15);
    float v0 = lip.y*uCurlThrow*2.0*(0.55 + 0.45*hGrad);
    float tau = lip.x*uCurl*fall;
    float Tst = sqrt(max(crest, 0.25)/G);
    float tauR = 1.5*Tst, tauG = 2.2*Tst, gEff = G*0.75;
    float rampX = tau*tau/(tau + tauR);
    float tEff = tau*tau/(tau + tauG);
    float dFwd = v0*rampX, dUp = v0*0.32*rampX, dDwn = 0.5*gEff*tEff*tEff;
    float maxDrop = crest + 0.35*C;
    float over = (dDwn - dUp)/max(maxDrop, 0.01);
    if (over > 1.0){ float kT = inversesqrt(over); dFwd *= kT; dUp *= kT; dDwn /= over; }
    dFwd = min(dFwd, 2.8*max(crest, 0.3))*w;
    lipXZ = dirS*dFwd;
    lift = (dUp - dDwn)*w;
  }
  // Lagrangian crest sharpening on the resolved band (points converge toward crests).
  vec2 chop = -grad*uPeakQ*uDx*4.0*smoothstep(0.03, 0.3, h)*(1.0 - smoothstep(0.08, 0.45, bk.x)*0.9);
  float cl = length(chop);
  if (cl > uDx*1.05) chop *= uDx*1.05/cl;
  vec4 fm = texelFetch(uFoam, c, 0);
  float age = fm.y/max(fm.x, 1e-4);
  float cover = smoothstep(0.02, 0.5, fm.x);
  vec4 lp = texelFetch(uLip, c, 0);
  float bubbles = clamp(lp.z*(1.0 - smoothstep(0.3, 2.0, lp.w/max(lp.z, 1e-4))), 0.0, 1.0);
  float thin = step(h, 0.08)*step(0.0005, h);
  // Dry cells sit just under the bed so the depth test cuts the waterline per pixel
  // along the true intersection instead of along mesh edges.
  float etaR = h > H_DRY ? eta : b - 0.35;
  oSurf = vec4((etaR - uLevel + lift)*uFade, grad*uFade, h);
  oAux = vec4(fm.x*uFade, bk.x*uFade, (lipXZ + chop)*uFade);   // foam MASS: the water shader's topology turns it into cover
  oExtra = vec4(fm.z, bubbles*uFade, cover*thin + fm.z*0.0, age);
}`;

export const SHORE_REDUCE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uState;
uniform sampler2D uRel;
uniform int uBlock;
uniform int uMode;   // 0: η grid mean, 1: release sums
out vec4 o;
void main(){
  ivec2 base = ivec2(gl_FragCoord.xy)*uBlock;
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 32; j++){
    if (j >= uBlock) break;
    for (int i = 0; i < 32; i++){
      if (i >= uBlock) break;
      ivec2 p = base + ivec2(i, j);
      if (uMode == 0){ vec4 s = texelFetch(uState, p, 0); acc += vec4(s.x > 1e-4 ? s.x + s.w : s.w, s.x, s.y, s.z); }
      else acc += texelFetch(uRel, p, 0);
    }
  }
  o = uMode == 0 ? acc/float(uBlock*uBlock) : acc;
}`;
