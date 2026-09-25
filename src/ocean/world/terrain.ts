/**
 * Procedural world: deterministic terrain/bathymetry b(x, z) (metres, sea level 0).
 *
 * One analytic function is the single source of truth for: terrain rendering,
 * bathymetry products (depth, shoreline distance, slope, uncertainty) used by
 * the scheduler, and the bed of the shallow-water tile (sampled at its own
 * resolution, so the surf zone gets full detail).
 *
 * Layout: an island east of the origin. Its broad west beach faces the
 * prevailing swell (which travels toward +x); a sandbar, a reef, a lee-side
 * cliff coast and ridged mountains inland. The origin stays deep water.
 */
import { hashU32 } from '../math/rng';
import { clamp, smoothstep } from '../math/scalar';

export interface TerrainParams {
  seed: number;
  center: [number, number];
  radius: number;       // island radius (m)
  peak: number;         // mountain height (m)
  shelfDepth: number;   // depth at the edge of the surf shelf (m)
  oceanDepth: number;   // abyssal depth (m)
  beachSlope: number;   // rise per metre on the west beach face
}

export const DEFAULT_TERRAIN: TerrainParams = {
  seed: 1337,
  center: [1900, 700],
  radius: 620,
  peak: 360,
  shelfDepth: 11,
  oceanDepth: 900,
  beachSlope: 1 / 32,
};

/* ── deterministic value noise (integer-hashed lattice, identical everywhere) ── */
function lattice(seed: number, ix: number, iz: number): number {
  return hashU32(seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1)) / 4294967296;
}
function vnoise(seed: number, x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = lattice(seed, ix, iz), b = lattice(seed, ix + 1, iz);
  const c = lattice(seed, ix, iz + 1), d = lattice(seed, ix + 1, iz + 1);
  return (a + (b - a) * ux) * (1 - uz) + (c + (d - c) * ux) * uz;
}
export function fbm(seed: number, x: number, z: number, octaves = 5): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * vnoise(seed + i * 101, x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}
function ridged(seed: number, x: number, z: number, octaves = 5): number {
  let v = 0, a = 0.5, f = 1, w = 1;
  for (let i = 0; i < octaves; i++) {
    // Smooth |·| (ε = 0.03): rounded crests instead of razor creases a heightfield mesh cannot carry.
    const t = 2 * vnoise(seed + i * 57, x * f, z * f) - 1;
    const n = 1 - Math.sqrt(t * t + 0.0009);
    const s = n * n * w;
    v += a * s;
    w = clamp(s * 1.8, 0, 1);
    f *= 2.1;
    a *= 0.5;
  }
  return v;
}

/**
 * Terrain elevation at (x, z). Units: metres; negative = seabed.
 */
export function terrainHeight(x: number, z: number, p: TerrainParams = DEFAULT_TERRAIN): number {
  const dx = x - p.center[0], dz = z - p.center[1];
  const dist = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx);
  // Irregular coastline: radius modulated by low-frequency noise around the island.
  const coastNoise = fbm(p.seed, Math.cos(ang) * 2.2 + 11, Math.sin(ang) * 2.2 - 7, 4) - 0.5;
  const west = Math.max(0, -Math.cos(ang));             // 1 on the west (beach) side
  const east = Math.max(0, Math.cos(ang));
  const R = p.radius * (1 + 0.42 * coastNoise) * (1 + 0.12 * west);
  const r = dist / R;                                   // 1 at the coastline
  const s = (dist - R);                                 // signed distance to coast (m), + offshore

  // Offshore profile: beach face → shelf (with sandbar) → continental slope → abyss.
  let bed: number;
  const slope = p.beachSlope * (1 + 3.5 * east * east);  // lee side much steeper (cliffs)
  if (s > 0) {
    const nearshore = -s * slope;
    const shelfT = smoothstep(0, 420 + 380 * west, s);
    const shelf = -p.shelfDepth - (s - 300) * 0.012;
    bed = nearshore * (1 - shelfT) + Math.min(shelf, nearshore) * shelfT;
    // Longshore sandbar on the west beach (where waves break twice).
    const bar = Math.exp(-Math.pow((s - 150) / 38, 2)) * 1.7 * west;
    bed += bar;
    // Continental slope to the abyss.
    const drop = smoothstep(900, 2600, s);
    bed = bed * (1 - drop) + -p.oceanDepth * drop;
    // Offshore reef patch north-west of the island.
    const rx = x - (p.center[0] - 980), rz = z - (p.center[1] - 520);
    const reef = Math.exp(-(rx * rx + rz * rz) / (2 * 110 * 110));
    bed = Math.max(bed, bed * (1 - reef) + (-2.2 + 1.8 * fbm(p.seed + 9, x / 25, z / 25)) * reef);
  } else {
    // Land: beach berm → dunes → foothills → ridged mountains.
    const inland = -s;
    const beach = inland * p.beachSlope * 1.6 * (1 + 3 * east * east);
    const hills = smoothstep(40, 380, inland);
    const mount = ridged(p.seed + 3, x / 420, z / 420) * p.peak * Math.pow(clamp(1 - r * 0.92, 0, 1), 1.35);
    const rolling = (fbm(p.seed + 5, x / 160, z / 160) - 0.35) * 26;
    bed = beach + hills * (rolling + mount);
    // Lee-side cliffs: a sharp step just inland from the east coast.
    bed += east * east * smoothstep(0, 18, inland) * 22;
    bed = Math.max(bed, beach * 0.5);
  }
  // Surf-zone megaripples (submerged only; the swash zone and dry beach stay smooth).
  const ripple = 0.12 * Math.sin((x * 0.83 + z * 0.56) * 1.2 + 3 * fbm(p.seed + 7, x / 30, z / 30));
  bed += ripple * smoothstep(-14, -2.5, bed) * (1 - smoothstep(-1.6, -0.4, bed));
  return bed;
}

/** Bathymetric uncertainty (m, 1σ): larger over bars, reefs and steep slopes (Fable W6). */
export function bathymetryUncertainty(x: number, z: number, p: TerrainParams = DEFAULT_TERRAIN): number {
  const e = 3;
  const gx = (terrainHeight(x + e, z, p) - terrainHeight(x - e, z, p)) / (2 * e);
  const gz = (terrainHeight(x, z + e, p) - terrainHeight(x, z - e, p)) / (2 * e);
  const h = terrainHeight(x, z, p);
  const shallow = smoothstep(-25, -1, h) * (1 - smoothstep(0, 2, h));
  return 0.15 + 2.5 * Math.min(Math.hypot(gx, gz), 0.5) * shallow + 0.8 * shallow;
}

/** Bounds of the terrain region worth rendering/simulating (outside: open ocean). */
export function terrainBounds(p: TerrainParams = DEFAULT_TERRAIN): { min: [number, number]; max: [number, number] } {
  const r = p.radius * 1.6 + 2800;
  return { min: [p.center[0] - r, p.center[1] - r], max: [p.center[0] + r, p.center[1] + r] };
}

/**
 * Bake an elevation grid (row-major z·n + x) over a square region.
 * Used for the terrain/heightmap texture and the scheduler's products.
 */
export function bakeHeights(min: [number, number], size: number, n: number, p: TerrainParams = DEFAULT_TERRAIN): Float32Array {
  const out = new Float32Array(n * n);
  const d = size / n;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) out[j * n + i] = terrainHeight(min[0] + (i + 0.5) * d, min[1] + (j + 0.5) * d, p);
  return out;
}

/** West-beach viewpoint (for the "fly to the beach" action and proof captures). */
export function beachPose(p: TerrainParams = DEFAULT_TERRAIN) {
  // Find the coastline along the west ray from the island centre.
  let s = p.radius * 0.3;
  while (s < p.radius * 3 && terrainHeight(p.center[0] - s, p.center[1], p) > 0) s += 2;
  const shoreX = p.center[0] - s;
  return { shore: [shoreX, p.center[1]] as [number, number] };
}
