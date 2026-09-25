// Analytic Laser 2 hull (ported from the legacy runtime's `Ie` hull functions)
// and the closed physics mesh of its sealed buoyant volume.
//
// Design frame (the visible boat group): +Z bow, +Y up, X across the beam,
// z ∈ [-2.2, 2.2]. The sealed volume is bounded by the hull shell, the deck and
// the cockpit sole: the cockpit well above the sole is open to the sea, so it is
// excluded and floods naturally when the boat is on its side or inverted.

export const HULL_HALF_LENGTH = 2.2;
export const COCKPIT_SOLE_Y = 0.155;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth01 = (v: number): number => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

export function halfWidth(u: number): number {
  const t = u < 0.45
    ? lerp(0.775, 1, Math.pow(smooth01(u / 0.45), 0.9))
    : Math.pow(Math.cos(((u - 0.45) / 0.55) * Math.PI / 2), 1.18);
  return Math.max(0.016, 0.71 * t);
}

export function keelY(u: number): number {
  return u < 0.42
    ? lerp(-0.052, -0.165, Math.pow(smooth01(u / 0.42), 0.8))
    : lerp(-0.165, 0.155, Math.pow((u - 0.42) / 0.58, 2.15));
}

export function sheerY(u: number): number {
  return 0.365 + 0.045 * u + 0.14 * u * u * u;
}

export function sectionPower(u: number): number {
  return u < 0.45 ? lerp(3.4, 2.5, u / 0.45) : lerp(2.5, 1.5, smooth01((u - 0.45) / 0.55));
}

export const zOfU = (u: number): number => -HULL_HALF_LENGTH + 2 * HULL_HALF_LENGTH * u;
export const uOfZ = (z: number): number => clamp01((z + HULL_HALF_LENGTH) / (2 * HULL_HALF_LENGTH));

/** Hull shell point for station u and girth parameter t ∈ [-1, 1] (t = ±1 at the sheer). */
export function shellPoint(u: number, t: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const hw = halfWidth(u), keel = keelY(u), sheer = sheerY(u), p = sectionPower(u);
  const s = Math.abs(t);
  out.x = t * hw * (1 + 0.05 * Math.pow(s, 6));
  out.y = keel + (sheer - keel) * Math.pow(s, p);
  out.z = zOfU(u);
  return out;
}

export function cockpitBlend(x: number, z: number): number {
  const inner = halfWidth(uOfZ(z)) - 0.175;
  const across = 1 - smooth01((Math.abs(x) - (inner - 0.07)) / 0.09);
  const aft = smooth01((z + 1.78) / 0.1);
  const fore = 1 - smooth01((z - 0.3) / 0.1);
  return across * aft * fore;
}

export function deckY(x: number, z: number): number {
  const u = uOfZ(z);
  const r = halfWidth(u);
  const crown = 0.045 * (1 - Math.pow(Math.min(Math.abs(x) / Math.max(r, 0.01), 1), 2));
  return lerp(sheerY(u) + crown, COCKPIT_SOLE_Y, cockpitBlend(x, z));
}

/** Deck height with the cockpit closed over at deck level. */
export function sealedDeckY(x: number, z: number): number {
  const u = uOfZ(z);
  const r = halfWidth(u);
  return sheerY(u) + 0.045 * (1 - Math.pow(Math.min(Math.abs(x) / Math.max(r, 0.01), 1), 2));
}

/** Sheer (gunwale) half-breadth including the shell flare term at t = 1. */
export const sheerHalfBreadth = (u: number): number => halfWidth(u) * 1.05;

export interface HullMesh {
  /** Vertex positions, xyz interleaved. */
  positions: Float64Array;
  /** Triangle vertex indices (outward winding). */
  triangles: Uint32Array;
  volume: number;
  centroid: [number, number, number];
  area: number;
  stations: number;
  verticesPerStation: number;
}

export interface HullMeshOptions {
  stations?: number;
  shellSegments?: number;
  deckSegmentsPerSide?: number;
  /**
   * Close the cockpit at deck level (the hull's outer envelope). Used where
   * the water is displaced by the whole hull (wake/obstacle rendering), not
   * for hydrostatics, where the open cockpit floods.
   */
  sealedCockpit?: boolean;
}

/**
 * Deck girth samples (x values) from the port sheer to the starboard sheer,
 * excluding both sheer points (shared with the shell). Samples are placed in
 * wall-relative positions so every station resolves the cockpit coaming.
 */
function deckSamples(u: number, perSide: number): number[] {
  const edge = sheerHalfBreadth(u);
  const hw = halfWidth(u);
  const outerWall = hw - 0.155; // deck level
  const innerWall = hw - 0.245; // sole level
  const side: number[] = [];
  if (innerWall > 0.06 && perSide >= 6) {
    // edge → outer wall (deck), wall (steep), inner wall → centre (sole)
    const deckPts = Math.max(1, perSide - 5);
    for (let i = 1; i <= deckPts; i++) side.push(lerp(edge, outerWall + 0.01, i / (deckPts + 0.5)));
    side.push(outerWall - 0.005, lerp(outerWall, innerWall, 0.5), innerWall + 0.005);
    side.push(innerWall * 0.55, innerWall * 0.2);
  } else {
    for (let i = 1; i <= perSide; i++) side.push(edge * (1 - i / (perSide + 0.35)));
  }
  while (side.length < perSide) side.push(side[side.length - 1]! * 0.5);
  side.length = perSide;
  const out: number[] = [];
  // starboard (+x) half going inward, centre, then port half going outward
  for (const x of side) out.push(x);
  out.push(0);
  for (let i = side.length - 1; i >= 0; i--) out.push(-side[i]!);
  return out;
}

export function buildHullMesh(options: HullMeshOptions = {}): HullMesh {
  const stations = Math.max(6, options.stations ?? 22);
  const shellSegments = Math.max(6, options.shellSegments ?? 14);
  const perSide = Math.max(3, options.deckSegmentsPerSide ?? 7);
  const shellCount = shellSegments + 1; // t = -1 .. +1 inclusive
  const deckCount = 2 * perSide + 1; // excluding the sheer points
  const ring = shellCount + deckCount;
  const positions: number[] = [];
  const p = { x: 0, y: 0, z: 0 };
  for (let k = 0; k <= stations; k++) {
    // Denser stations towards the bow, where the sections change quickly.
    const u = Math.min(1, Math.pow(k / stations, 0.92));
    for (let i = 0; i < shellCount; i++) {
      // Cosine spacing concentrates girth samples at the turn of the bilge.
      const s = -1 + 2 * (i / shellSegments);
      const t = Math.sign(s) * (1 - Math.cos(Math.abs(s) * Math.PI * 0.5)) * 0.35 + s * 0.65;
      shellPoint(u, Math.max(-1, Math.min(1, t)), p);
      positions.push(p.x, p.y, p.z);
    }
    const z = zOfU(u);
    for (const x of deckSamples(u, perSide)) positions.push(x, options.sealedCockpit ? sealedDeckY(x, z) : deckY(x, z), z);
  }
  const triangles: number[] = [];
  const idx = (k: number, i: number): number => k * ring + ((i + ring) % ring);
  for (let k = 0; k < stations; k++) {
    for (let i = 0; i < ring; i++) {
      const a = idx(k, i), b = idx(k, i + 1), c = idx(k + 1, i), d = idx(k + 1, i + 1);
      triangles.push(a, c, b, b, c, d);
    }
  }
  // End caps: fan from the section centroid (sections are star-shaped from it).
  for (const k of [0, stations]) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < ring; i++) {
      const o = idx(k, i) * 3;
      cx += positions[o]!; cy += positions[o + 1]!; cz += positions[o + 2]!;
    }
    const center = positions.length / 3;
    positions.push(cx / ring, cy / ring, cz / ring);
    for (let i = 0; i < ring; i++) {
      if (k === 0) triangles.push(center, idx(k, i), idx(k, i + 1));
      else triangles.push(center, idx(k, i + 1), idx(k, i));
    }
  }
  const pos = new Float64Array(positions);
  const tri = new Uint32Array(triangles);
  let volume = signedVolume(pos, tri);
  if (volume < 0) {
    for (let i = 0; i < tri.length; i += 3) {
      const t = tri[i + 1]!;
      tri[i + 1] = tri[i + 2]!;
      tri[i + 2] = t;
    }
    volume = -volume;
  }
  return {
    positions: pos,
    triangles: tri,
    volume,
    centroid: volumeCentroid(pos, tri, volume),
    area: surfaceArea(pos, tri),
    stations,
    verticesPerStation: ring,
  };
}

export function signedVolume(pos: Float64Array, tri: Uint32Array): number {
  let v = 0;
  for (let i = 0; i < tri.length; i += 3) {
    const a = tri[i]! * 3, b = tri[i + 1]! * 3, c = tri[i + 2]! * 3;
    const ax = pos[a]!, ay = pos[a + 1]!, az = pos[a + 2]!;
    const bx = pos[b]!, by = pos[b + 1]!, bz = pos[b + 2]!;
    const cx = pos[c]!, cy = pos[c + 1]!, cz = pos[c + 2]!;
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v / 6;
}

function volumeCentroid(pos: Float64Array, tri: Uint32Array, volume: number): [number, number, number] {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < tri.length; i += 3) {
    const a = tri[i]! * 3, b = tri[i + 1]! * 3, c = tri[i + 2]! * 3;
    const ax = pos[a]!, ay = pos[a + 1]!, az = pos[a + 2]!;
    const bx = pos[b]!, by = pos[b + 1]!, bz = pos[b + 2]!;
    const cx = pos[c]!, cy = pos[c + 1]!, cz = pos[c + 2]!;
    const det = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    x += det * (ax + bx + cx);
    y += det * (ay + by + cy);
    z += det * (az + bz + cz);
  }
  const s = 1 / (24 * Math.max(1e-12, volume));
  return [x * s, y * s, z * s];
}

function surfaceArea(pos: Float64Array, tri: Uint32Array): number {
  let area = 0;
  for (let i = 0; i < tri.length; i += 3) {
    const a = tri[i]! * 3, b = tri[i + 1]! * 3, c = tri[i + 2]! * 3;
    const ux = pos[b]! - pos[a]!, uy = pos[b + 1]! - pos[a + 1]!, uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!, vy = pos[c + 1]! - pos[a + 1]!, vz = pos[c + 2]! - pos[a + 2]!;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    area += 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
  }
  return area;
}

/**
 * Approximate signed distance (m) from a design-frame point to the hull's
 * sealed surface: negative inside. Uses the analytic section at the point's
 * station (a 2D polygon distance) combined with the end planes. Intended for
 * crew/body collision, not hydrostatics.
 */
export function hullSignedDistance(x: number, y: number, z: number): number {
  const zc = Math.max(-HULL_HALF_LENGTH, Math.min(HULL_HALF_LENGTH, z));
  const u = uOfZ(zc);
  const section = sectionPolygon(u);
  const d2 = polygonSignedDistance(section, x, y);
  const beyond = Math.abs(z) - HULL_HALF_LENGTH;
  if (beyond > 0) return Math.hypot(Math.max(0, d2), beyond);
  // Inside the length: combine with the end-plane distance for points near the ends.
  return d2 < 0 ? Math.max(d2, beyond) : d2;
}

const sectionCache = new Map<number, Float64Array>();

/** Closed 2D section polygon (x, y pairs) at station u, quantised for caching. */
export function sectionPolygon(u: number): Float64Array {
  const key = Math.round(clamp01(u) * 200);
  const cached = sectionCache.get(key);
  if (cached) return cached;
  const uq = key / 200;
  const pts: number[] = [];
  const p = { x: 0, y: 0, z: 0 };
  const shell = 16;
  for (let i = 0; i <= shell; i++) {
    shellPoint(uq, -1 + 2 * (i / shell), p);
    pts.push(p.x, p.y);
  }
  const z = zOfU(uq);
  for (const x of deckSamples(uq, 7)) pts.push(x, deckY(x, z));
  const poly = new Float64Array(pts);
  sectionCache.set(key, poly);
  return poly;
}

function polygonSignedDistance(poly: Float64Array, x: number, y: number): number {
  const n = poly.length / 2;
  let inside = false;
  let best = Infinity;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = poly[j * 2]!, ay = poly[j * 2 + 1]!, bx = poly[i * 2]!, by = poly[i * 2 + 1]!;
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay + 1e-12) + ax) inside = !inside;
    const ex = bx - ax, ey = by - ay;
    const len2 = ex * ex + ey * ey;
    const t = len2 > 1e-12 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len2)) : 0;
    const dx = x - (ax + ex * t), dy = y - (ay + ey * t);
    best = Math.min(best, dx * dx + dy * dy);
  }
  const d = Math.sqrt(best);
  return inside ? -d : d;
}

/** Key crew contact points in the design frame (metres). */
export const HULL_POINTS = Object.freeze({
  /** Centreboard: case at z = 0.25, root at the keel, tip ~0.95 m below. */
  boardZ: 0.25,
  boardRootY: keelY(uOfZ(0.25)) - 0.02,
  boardTipY: keelY(uOfZ(0.25)) - 0.93,
  boardChord: 0.55,
  /** Hiking/toe straps run fore-aft along the cockpit sole at x = ±0.22. */
  toeStrapX: 0.22,
  toeStrapY: 0.2,
  toeStrapZ: -0.7,
  /** Transom (stern) plane. */
  transomZ: -HULL_HALF_LENGTH,
  rudderZ: -2.18,
});
