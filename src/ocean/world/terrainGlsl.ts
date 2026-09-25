/**
 * GLSL port of world/terrain.ts — identical integer-hash lattice (uint wraps
 * like Math.imul), identical profile. Used to bake terrain textures and the
 * shallow-water bed on the GPU in milliseconds instead of seconds on the CPU.
 */
import { DEFAULT_TERRAIN, type TerrainParams } from './terrain';

export const TERRAIN_GLSL = /* glsl */ `
uniform float uTSeed;
uniform vec2 uTCenter;
uniform float uTRadius, uTPeak, uTShelf, uTOcean, uTBeachSlope;
uint lowbias32(uint x){
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x;
}
float lattice(uint seed, int ix, int iz){
  uint h = lowbias32(seed ^ (uint(ix)*0x27d4eb2du) ^ (uint(iz)*0x165667b1u));
  return float(h)/4294967296.0;
}
float tvnoise(uint seed, vec2 p){
  vec2 i = floor(p), f = p - i;
  vec2 u = f*f*(3.0 - 2.0*f);
  int ix = int(i.x), iz = int(i.y);
  float a = lattice(seed, ix, iz), b = lattice(seed, ix + 1, iz);
  float c = lattice(seed, ix, iz + 1), d = lattice(seed, ix + 1, iz + 1);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float tfbm(uint seed, vec2 p, int oct){
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 6; i++){ if (i >= oct) break; v += a*tvnoise(seed + uint(i*101), p*f); f *= 2.03; a *= 0.5; }
  return v;
}
float tridged(uint seed, vec2 p, int oct){
  float v = 0.0, a = 0.5, f = 1.0, w = 1.0;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    float t = 2.0*tvnoise(seed + uint(i*57), p*f) - 1.0;
    float n = 1.0 - sqrt(t*t + 0.0009);
    float s = n*n*w; v += a*s; w = clamp(s*1.8, 0.0, 1.0); f *= 2.1; a *= 0.5;
  }
  return v;
}
float tsmooth(float e0, float e1, float x){ float t = clamp((x - e0)/(e1 - e0), 0.0, 1.0); return t*t*(3.0 - 2.0*t); }
float terrainHeight(vec2 p){
  uint seed = uint(uTSeed);
  vec2 d = p - uTCenter;
  float dist = length(d);
  float ang = atan(d.y, d.x);
  float coastNoise = tfbm(seed, vec2(cos(ang)*2.2 + 11.0, sin(ang)*2.2 - 7.0), 4) - 0.5;
  float west = max(0.0, -cos(ang)), east = max(0.0, cos(ang));
  float R = uTRadius*(1.0 + 0.42*coastNoise)*(1.0 + 0.12*west);
  float r = dist/R;
  float s = dist - R;
  float bed;
  float slope = uTBeachSlope*(1.0 + 3.5*east*east);
  if (s > 0.0){
    float nearshore = -s*slope;
    float shelfT = tsmooth(0.0, 420.0 + 380.0*west, s);
    float shelf = -uTShelf - (s - 300.0)*0.012;
    bed = nearshore*(1.0 - shelfT) + min(shelf, nearshore)*shelfT;
    bed += exp(-pow((s - 150.0)/38.0, 2.0))*1.7*west;
    float drop = tsmooth(900.0, 2600.0, s);
    bed = bed*(1.0 - drop) - uTOcean*drop;
    vec2 rp = p - (uTCenter - vec2(980.0, 520.0));
    float reef = exp(-dot(rp, rp)/(2.0*110.0*110.0));
    bed = max(bed, bed*(1.0 - reef) + (-2.2 + 1.8*tfbm(seed + 9u, p/25.0, 5))*reef);
  } else {
    float inland = -s;
    float beach = inland*uTBeachSlope*1.6*(1.0 + 3.0*east*east);
    float hills = tsmooth(40.0, 380.0, inland);
    float mount = tridged(seed + 3u, p/420.0, 5)*uTPeak*pow(clamp(1.0 - r*0.92, 0.0, 1.0), 1.35);
    float rolling = (tfbm(seed + 5u, p/160.0, 5) - 0.35)*26.0;
    bed = beach + hills*(rolling + mount);
    bed += east*east*tsmooth(0.0, 18.0, inland)*22.0;
    bed = max(bed, beach*0.5);
  }
  float ripple = 0.12*sin((p.x*0.83 + p.y*0.56)*1.2 + 3.0*tfbm(seed + 7u, p/30.0, 5));
  bed += ripple*tsmooth(-14.0, -2.5, bed)*(1.0 - tsmooth(-1.6, -0.4, bed));
  return bed;
}
`;

export function terrainUniforms(p: TerrainParams = DEFAULT_TERRAIN): Record<string, number | number[]> {
  return {
    uTSeed: p.seed, uTCenter: p.center, uTRadius: p.radius, uTPeak: p.peak,
    uTShelf: p.shelfDepth, uTOcean: p.oceanDepth, uTBeachSlope: p.beachSlope,
  };
}
