/**
 * Body shapes. ONE hull function drives three consumers so they can never
 * disagree: the GPU capacity-field source (how much water the hull displaces
 * per surface cell), the CPU buoyancy columns, and the rendered mesh.
 *
 * Local frame: +x forward (bow), +y up, +z starboard. Origin = centre of mass.
 */
export type BodyKind = 'sphere' | 'hull' | 'box';

export interface BodyShape {
  kind: BodyKind;
  /** sphere */
  radius?: number;
  /** box half extents (x, y, z) */
  half?: [number, number, number];
  /** hull: length, beam, draft (keel depth below origin), freeboard (deck above origin) */
  length?: number;
  beam?: number;
  draft?: number;
  freeboard?: number;
}

/** Hull half-beam at normalised station s ∈ [-1 (transom), 1 (stem)]. */
export function hullHalfBeam(shape: BodyShape, s: number): number {
  const B = shape.beam ?? 2.4;
  if (s > 1 || s < -1) return 0;
  return s > 0 ? (B / 2) * Math.sqrt(Math.max(0, 1 - Math.pow(s, 2.2))) : (B / 2) * (1 - 0.15 * s * s);
}

/** Keel depth (positive, below origin) at station s. The forefoot rises toward the stem. */
export function hullCentreDepth(shape: BodyShape, s: number): number {
  const D = shape.draft ?? 0.9;
  if (s > 0.55) return D * (1 - 0.75 * Math.pow((s - 0.55) / 0.45, 2));
  if (s < -0.85) return D * (1 - 0.25 * (-(s + 0.85) / 0.15));
  return D;
}

/** V-bottom: local y of the hull skin below (u, w), or null outside the footprint. */
export function hullBottomLocal(shape: BodyShape, u: number, w: number): number | null {
  const L = shape.length ?? 8;
  const s = u / (L / 2);
  const hb = hullHalfBeam(shape, s);
  if (hb <= 1e-4 || Math.abs(w) > hb) return null;
  const d = hullCentreDepth(shape, s);
  return -d * (1 - Math.pow(Math.abs(w) / hb, 1.6)) - 0.02;
}

/** Deck (sheer line) local height at station s. */
export function hullDeckLocal(shape: BodyShape, s: number): number {
  const F = shape.freeboard ?? 0.8;
  return F * (1 + 0.35 * Math.max(s, 0) * Math.max(s, 0));
}

/** Approximate displaced volume of the full hull (for mass/inertia estimates). */
export function shapeVolume(shape: BodyShape): number {
  if (shape.kind === 'sphere') return (4 / 3) * Math.PI * Math.pow(shape.radius ?? 1, 3);
  if (shape.kind === 'box') { const h = shape.half ?? [1, 1, 1]; return 8 * h[0] * h[1] * h[2]; }
  const L = shape.length ?? 8;
  let v = 0;
  const nu = 40, nw = 20;
  for (let i = 0; i < nu; i++) {
    const u = -L / 2 + ((i + 0.5) * L) / nu;
    const s = u / (L / 2);
    const hb = hullHalfBeam(shape, s);
    for (let j = 0; j < nw; j++) {
      const w = -hb + ((j + 0.5) * 2 * hb) / nw;
      const yb = hullBottomLocal(shape, u, w);
      if (yb === null) continue;
      v += (hullDeckLocal(shape, s) - yb) * (L / nu) * ((2 * hb) / nw);
    }
  }
  return v;
}

/** Bounding half-extents in the local frame. */
export function shapeHalfExtents(shape: BodyShape): [number, number, number] {
  if (shape.kind === 'sphere') { const r = shape.radius ?? 1; return [r, r, r]; }
  if (shape.kind === 'box') return shape.half ?? [1, 1, 1];
  const L = shape.length ?? 8, B = shape.beam ?? 2.4, D = shape.draft ?? 0.9, F = shape.freeboard ?? 0.8;
  return [L / 2, (D + F * 1.35) / 2, B / 2];
}

/**
 * GLSL twin of the functions above (kept literally parallel) for the GPU source
 * pass: returns vec2(bottomY, topY) of the body along the vertical line at xz,
 * or vec2(1e9, -1e9) when the line misses the body.
 */
export const HULL_GLSL = /* glsl */ `
float hullHalfBeam(vec4 dims, float s){
  float B = dims.y;
  if (s > 1.0 || s < -1.0) return 0.0;
  return s > 0.0 ? 0.5*B*sqrt(max(0.0, 1.0 - pow(s, 2.2))) : 0.5*B*(1.0 - 0.15*s*s);
}
float hullCentreDepth(vec4 dims, float s){
  float D = dims.z;
  if (s > 0.55){ float t = (s - 0.55)/0.45; return D*(1.0 - 0.75*t*t); }
  if (s < -0.85) return D*(1.0 - 0.25*(-(s + 0.85)/0.15));
  return D;
}
// kind: 0 sphere, 1 hull, 2 box. pos = world-ish centre, axes = rotation columns.
vec2 bodyVerticalSpan(int kind, vec3 pos, mat3 R, vec4 dims, vec2 xz){
  if (kind == 0){
    float r = dims.x;
    vec2 d = xz - pos.xz;
    float q = r*r - dot(d, d);
    if (q <= 0.0) return vec2(1e9, -1e9);
    float h = sqrt(q);
    return vec2(pos.y - h, pos.y + h);
  }
  // Transform the vertical line into the body frame (small-angle footprint for hulls).
  vec3 rel = vec3(xz.x - pos.x, 0.0, xz.y - pos.z);
  vec3 ex = R[0], ey = R[1], ez = R[2];
  if (kind == 2){
    // Exact slab test for an oriented box against the line (xz, y).
    vec3 o = transpose(R)*vec3(rel.x, 1000.0, rel.z);
    vec3 d = transpose(R)*vec3(0.0, -1.0, 0.0);
    vec3 h = dims.xyz;
    vec3 inv = 1.0/(d + vec3(1e-9));
    vec3 t0 = (-h - o)*inv, t1 = (h - o)*inv;
    vec3 tmin = min(t0, t1), tmax = max(t0, t1);
    float tn = max(max(tmin.x, tmin.y), tmin.z), tf = min(min(tmax.x, tmax.y), tmax.z);
    if (tn > tf) return vec2(1e9, -1e9);
    return vec2(pos.y + 1000.0 - tf, pos.y + 1000.0 - tn);
  }
  // Hull: project onto the body's horizontal axes, then tilt by pitch/roll.
  vec2 fx = normalize(vec2(ex.x, ex.z) + vec2(1e-6, 0.0));
  vec2 fz = vec2(-fx.y, fx.x);
  float u = dot(rel.xz, fx), w = dot(rel.xz, fz);
  float L = dims.x;
  float s = u/(0.5*L);
  float hb = hullHalfBeam(dims, s);
  if (hb <= 1e-4 || abs(w) > hb) return vec2(1e9, -1e9);
  float yb = -hullCentreDepth(dims, s)*(1.0 - pow(abs(w)/hb, 1.6)) - 0.02;
  float yt = dims.w*(1.0 + 0.35*max(s, 0.0)*max(s, 0.0));
  // Pitch and roll tilt the local vertical offsets.
  float tilt = u*ex.y + w*ez.y;
  return vec2(pos.y + yb*ey.y + tilt, pos.y + yt*ey.y + tilt);
}
`;
