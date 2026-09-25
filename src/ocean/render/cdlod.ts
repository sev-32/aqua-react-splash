/**
 * CDLOD quadtree selection (Strugar 2010), camera-relative.
 *
 * - One instanced patch mesh (P×P quads) for full nodes and one (P/2×P/2) for
 *   parent quadrants drawn at the parent's resolution.
 * - Ranges double per level; each level morphs odd vertices onto the next
 *   coarser grid over the last part of its range → no cracks, no pops.
 * - Vertices live at fixed world positions (no projected-grid swimming).
 *
 * Distance selects GEOMETRY resolution only. It never selects a physical tier
 * (law W1 — the scheduler owns tiers).
 */
import { aabbInFrustum, type Vec3 } from '../math/mat4';

export interface CdlodConfig {
  leafSize: number;   // world size of a level-0 node (m)
  levels: number;
  rangeK: number;     // range of level l = leafSize·2^l·rangeK
  patchQuads: number; // P (even)
  coverage: number;   // half-extent of the covered square (m)
  morphFraction: number;
}

export interface CdlodSelection {
  full: Float32Array; // (x, z, size, level) camera-relative origins
  fullCount: number;
  half: Float32Array;
  halfCount: number;
  morph: Float32Array; // per level (start, end)
  ranges: number[];
  maxLevelUsed: number;
}

export function cdlodRanges(cfg: CdlodConfig): number[] {
  return Array.from({ length: cfg.levels }, (_, l) => cfg.leafSize * Math.pow(2, l) * cfg.rangeK);
}

export function morphTable(cfg: CdlodConfig): Float32Array {
  const r = cdlodRanges(cfg);
  const out = new Float32Array(cfg.levels * 2);
  for (let l = 0; l < cfg.levels; l++) {
    const prev = l === 0 ? 0 : r[l - 1];
    const end = l === cfg.levels - 1 ? 1e12 : r[l];
    const start = l === cfg.levels - 1 ? 1e12 - 1 : end - (end - prev) * cfg.morphFraction;
    out[l * 2] = start;
    out[l * 2 + 1] = end;
  }
  return out;
}

function sphereBox(r: number, min: Vec3, max: Vec3): boolean {
  // Camera at origin (camera-relative space).
  let d2 = 0;
  for (let i = 0; i < 3; i++) {
    const v = min[i] > 0 ? min[i] : max[i] < 0 ? max[i] : 0;
    d2 += v * v;
  }
  return d2 < r * r;
}

export class CdlodSelector {
  private full: Float32Array;
  private half: Float32Array;
  private fullCount = 0;
  private halfCount = 0;
  private ranges: number[];
  private morph: Float32Array;
  private maxLevelUsed = 0;

  constructor(public cfg: CdlodConfig, capacity = 4096) {
    this.full = new Float32Array(capacity * 4);
    this.half = new Float32Array(capacity * 4);
    this.ranges = cdlodRanges(cfg);
    this.morph = morphTable(cfg);
  }

  setConfig(cfg: CdlodConfig) {
    this.cfg = cfg;
    this.ranges = cdlodRanges(cfg);
    this.morph = morphTable(cfg);
  }

  /**
   * @param cam  camera world position (double precision JS numbers)
   * @param planes frustum planes of the camera-relative view-projection
   * @param vertical max |η| (m) for bounding boxes; horizontal max |D| (m)
   */
  /** Earth radius for the curvature drop in bounding boxes (0 = flat). */
  earthRadius = 0;
  /** Optional world-space XZ bounds (terrain): nodes outside are skipped. */
  bounds: { min: [number, number]; max: [number, number] } | null = null;
  /** Optional absolute world Y range for boxes (terrain); default is mean sea level ± vertical. */
  yRange: [number, number] | null = null;
  private cam: Vec3 = [0, 0, 0];

  select(cam: Vec3, planes: Float64Array | null, vertical: number, horizontal: number): CdlodSelection {
    this.fullCount = 0;
    this.halfCount = 0;
    this.maxLevelUsed = 0;
    this.cam = cam;
    const { levels, leafSize, coverage } = this.cfg;
    const top = levels - 1;
    const topSize = leafSize * Math.pow(2, top);
    const i0 = Math.floor((cam[0] - coverage) / topSize), i1 = Math.floor((cam[0] + coverage) / topSize);
    const k0 = Math.floor((cam[2] - coverage) / topSize), k1 = Math.floor((cam[2] + coverage) / topSize);
    for (let i = i0; i <= i1; i++)
      for (let k = k0; k <= k1; k++) {
        // Double-precision subtraction first, then float: precision stays at the camera.
        this.node(i * topSize - cam[0], k * topSize - cam[2], topSize, top, -cam[1], planes, vertical, horizontal);
      }
    return {
      full: this.full, fullCount: this.fullCount,
      half: this.half, halfCount: this.halfCount,
      morph: this.morph, ranges: this.ranges, maxLevelUsed: this.maxLevelUsed,
    };
  }

  private box(x: number, z: number, size: number, y0: number, vert: number, hor: number): [Vec3, Vec3] {
    // The curved sea drops by d²/2R; the box must contain the dropped surface or
    // distant nodes are culled and the horizon shows a gap.
    let drop = 0;
    if (this.earthRadius > 0) {
      const fx = Math.max(Math.abs(x - hor), Math.abs(x + size + hor));
      const fz = Math.max(Math.abs(z - hor), Math.abs(z + size + hor));
      drop = (fx * fx + fz * fz) / (2 * this.earthRadius);
    }
    if (this.yRange) {
      return [
        [x - hor, this.yRange[0] - this.cam[1] - drop, z - hor],
        [x + size + hor, this.yRange[1] - this.cam[1], z + size + hor],
      ];
    }
    return [
      [x - hor, y0 - vert - drop, z - hor],
      [x + size + hor, y0 + vert, z + size + hor],
    ];
  }

  private outOfBounds(x: number, z: number, size: number) {
    const b = this.bounds;
    if (!b) return false;
    const wx = x + this.cam[0], wz = z + this.cam[2];
    return wx > b.max[0] || wz > b.max[1] || wx + size < b.min[0] || wz + size < b.min[1];
  }

  private push(arr: 'full' | 'half', x: number, z: number, size: number, level: number) {
    const buf = arr === 'full' ? this.full : this.half;
    const count = arr === 'full' ? this.fullCount : this.halfCount;
    if ((count + 1) * 4 > buf.length) return;
    buf[count * 4] = x;
    buf[count * 4 + 1] = z;
    buf[count * 4 + 2] = size;
    buf[count * 4 + 3] = level;
    if (arr === 'full') this.fullCount++;
    else this.halfCount++;
    this.maxLevelUsed = Math.max(this.maxLevelUsed, level);
  }

  private node(x: number, z: number, size: number, level: number, y0: number, planes: Float64Array | null, vert: number, hor: number) {
    if (this.outOfBounds(x, z, size)) return;
    const [mn, mx] = this.box(x, z, size, y0, vert, hor);
    if (planes && !aabbInFrustum(planes, mn, mx)) return;
    if (level === 0 || !sphereBox(this.ranges[level - 1], mn, mx)) {
      this.push('full', x, z, size, level);
      return;
    }
    const h = size / 2;
    for (let q = 0; q < 4; q++) {
      const cx = x + (q & 1) * h, cz = z + (q >> 1) * h;
      const [cmn, cmx] = this.box(cx, cz, h, y0, vert, hor);
      if (sphereBox(this.ranges[level - 1], cmn, cmx)) {
        this.node(cx, cz, h, level - 1, y0, planes, vert, hor);
      } else if (!planes || aabbInFrustum(planes, cmn, cmx)) {
        this.push('half', cx, cz, h, level);
      }
    }
  }
}

/** Grid mesh of q×q quads: vertices are integer grid coords (0..q). */
export function patchMesh(q: number): { grid: Float32Array; index: Uint32Array } {
  const n = q + 1;
  const grid = new Float32Array(n * n * 2);
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) { grid[(z * n + x) * 2] = x; grid[(z * n + x) * 2 + 1] = z; }
  const index = new Uint32Array(q * q * 6);
  let o = 0;
  for (let z = 0; z < q; z++)
    for (let x = 0; x < q; x++) {
      const a = z * n + x, b = a + 1, c = a + n, d = c + 1;
      // Alternate diagonals for isotropic tessellation.
      if ((x + z) & 1) { index.set([a, c, b, b, c, d], o); } else { index.set([a, c, d, a, d, b], o); }
      o += 6;
    }
  return { grid, index };
}
