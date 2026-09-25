/**
 * One water, one optics: the sea surface and the splash sheet both call this,
 * so a splash cannot look like a different material pasted onto the sea.
 *
 * The water column along a refracted view ray (POSEIDON R9 integrateVolume,
 * solved in closed form for homogeneous water instead of marched):
 *   - single scattering of the refracted sun, Beer loss on the sun leg (to the
 *     scatterer's depth) and on the view leg; HG phase (g = 0.74) broadened
 *     toward isotropic for the unresolved higher orders;
 *   - sky light entering as diffuse downwelling;
 *   - Gordon's diffuse reflectance for the multiply-scattered remainder,
 *     saturating with the column's depth;
 *   - T: the view-leg transmittance applied to whatever lies behind (seabed,
 *     hull, the sea behind a splash sheet).
 * Requires uniforms uAbsorb (σa), uScatter (σs), uBackscatter (b_b), uIor, uSunDir.
 */
export const WATER_OPTICS_GLSL = /* glsl */ `
#ifndef PI
#define PI 3.14159265358979
#endif
float waterHG(float mu, float g){
  float g2 = g*g;
  return (1.0 - g2)/(4.0*PI*pow(max(1.0 + g2 - 2.0*g*mu, 1e-4), 1.5));
}
/** Radiance scattered toward the eye by L metres of water along refracted ray trd (into the water). */
vec3 waterColumn(vec3 trd, float L, vec3 sunE, vec3 skyE, float Fsun, out vec3 T){
  vec3 sigT = uAbsorb + uScatter;
  float dv = max(-trd.y, 0.02);                       // depth gained per metre of view ray
  vec3 Ts = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0/uIor);
  float mus = max(-Ts.y, 0.06);
  float sunUp = smoothstep(-0.02, 0.08, uSunDir.y);
  // Sun leg: the scatterer at path t sits at depth t·dv, reached by sunlight through depth/μs.
  vec3 kS = sigT*(1.0 + dv/mus);
  float mu = dot(Ts, -trd);
  float ph = mix(waterHG(mu, 0.74), 1.0/(4.0*PI), 0.55);
  vec3 single = uScatter*ph*sunE*(1.0 - Fsun)*sunUp*(1.0 - exp(-kS*L))/kS;
  // Sky leg: diffuse downwelling (mean cosine ≈ 0.78), isotropic single scattering.
  vec3 kD = sigT*(1.0 + dv/0.78);
  vec3 sky = uScatter*(0.93/(4.0*PI))*skyE*(1.0 - exp(-kD*L))/kD;
  // Multiple scattering: Gordon et al. R = 0.0949u + 0.0794u², u = b_b/(a + b_b).
  vec3 u = uBackscatter/(uAbsorb + uBackscatter);
  vec3 R = 0.0949*u + 0.0794*u*u;
  vec3 Kd = uAbsorb + uBackscatter;
  vec3 ms = R*(sunE*max(uSunDir.y, 0.0)*(1.0 - Fsun) + skyE*0.93)/PI*(1.0 - exp(-2.0*Kd*dv*L));
  T = exp(-sigT*L);
  return single + sky + ms;
}
`;
