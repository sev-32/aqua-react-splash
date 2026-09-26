// Sail render surfaces.
//
// The V16 cloth solver runs on a coarse particle grid (main 15×9, jib 11×6,
// spinnaker 12×11) and its render meshes were those grids with flat-ish,
// visibly faceted shading. The sails are thin curved membranes, so the render
// surface here is the uniform Catmull–Rom bicubic surface through the
// particles, evaluated at 4× the grid resolution with analytic normals from
// its partial derivatives. The surface passes exactly through every particle
// and reproduces the physics shape; UVs are the original grid UVs
// interpolated bilinearly, so every V17 texture, seam, number and the
// UV-registered clear windows stay where they are.
//
// Sails also cast shadows now (onto deck, crew, the other sail and the
// water). The shadow-depth material lets light through the clear vinyl
// windows and dithers out the Dacron's diffuse transmission, so a sail's
// shadow is lighter than a solid body's once the shadow filter averages it.

import type { AppContext, AppSystem } from '../core/System.js';
import { three, GL } from '../three/ThreeRuntime.js';

const RGBA_DEPTH_PACKING = 3201;

function windowSdGlsl(kind: string): string {
  if (kind === 'main') {
    return `float windowSD(vec2 uv) {
      vec2 lo = vec2(0.18164063, 0.11621094);
      vec2 hi = vec2(0.59570313, 0.19921875);
      vec2 d = min(uv - lo, hi - uv);
      return min(d.x, d.y);
    }`;
  }
  if (kind === 'jib') {
    return `float windowSD(vec2 uv) {
      float row = clamp((uv.y - 0.10) / 0.20, 0.0, 1.0);
      float left = mix(0.20, 0.40, row) + 0.013;
      float right = mix(0.80, 0.60, row) - 0.013;
      float vertical = min(uv.y - 0.113, 0.287 - uv.y);
      return min(vertical, min(uv.x - left, right - uv.x));
    }`;
  }
  return 'float windowSD(vec2 uv) { return -1.0; }';
}

function sailDepthMaterial(kind: string, transmission: number): any {
  const T = three();
  return new T.ShaderMaterial({
    name: `foundry.sail.shadow-depth.${kind}`,
    uniforms: { uTransmission: { value: transmission } },
    vertexShader: /* glsl */ `
      varying vec2 vSailUv;
      varying vec2 vHighPrecisionZW;
      void main() {
        vSailUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vHighPrecisionZW = gl_Position.zw;
      }`,
    fragmentShader: /* glsl */ `
      #include <packing>
      uniform float uTransmission;
      varying vec2 vSailUv;
      varying vec2 vHighPrecisionZW;
      ${windowSdGlsl(kind)}
      void main() {
        if (windowSD(vSailUv) > 0.0) discard;            // clear vinyl
        vec2 cell = floor(gl_FragCoord.xy);
        float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        if (h < uTransmission) discard;                   // Dacron transmission
        float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
        gl_FragColor = packDepthToRGBA(fragCoordZ);
      }`,
    side: GL.DoubleSide,
  });
}

/** Catmull–Rom bicubic surface through a rows × cols particle grid. */
class RefinedClothSurface {
  readonly geometry: any;
  readonly rowsOut: number;
  readonly colsOut: number;
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly ext: Float64Array; // (rows+2) × (cols+2) × 3 with phantom border
  private readonly w: Float64Array;   // per refined step: 4 basis + 4 derivative weights
  private readonly segIndex: Int32Array;

  constructor(readonly cloth: any, readonly subdivisions: number, sourceUv: any) {
    const T = three();
    const R = cloth.rows as number, C = cloth.cols as number, s = subdivisions;
    this.rowsOut = (R - 1) * s + 1;
    this.colsOut = (C - 1) * s + 1;
    const n = this.rowsOut * this.colsOut;
    this.positions = new Float32Array(n * 3);
    this.normals = new Float32Array(n * 3);
    this.ext = new Float64Array((R + 2) * (C + 2) * 3);
    // Basis weights for every refined sample position along one axis.
    const steps = this.rowsOut + this.colsOut;
    this.w = new Float64Array(steps * 8);
    this.segIndex = new Int32Array(steps);
    const uvs = new Float32Array(n * 2);
    // Bilinear UVs from the original per-particle UVs.
    const uvAt = (r: number, c: number, k: number): number => sourceUv ? (k === 0 ? sourceUv.getX(r * C + c) : sourceUv.getY(r * C + c)) : (k === 0 ? c / (C - 1) : r / (R - 1));
    for (let i = 0; i < this.rowsOut; i++) {
      const r = Math.min(R - 2, Math.floor(i / s)), tv = (i - r * s) / s;
      for (let j = 0; j < this.colsOut; j++) {
        const c = Math.min(C - 2, Math.floor(j / s)), tu = (j - c * s) / s;
        const o = (i * this.colsOut + j) * 2;
        for (let k = 0; k < 2; k++) {
          const a = uvAt(r, c, k) * (1 - tu) + uvAt(r, c + 1, k) * tu;
          const b = uvAt(r + 1, c, k) * (1 - tu) + uvAt(r + 1, c + 1, k) * tu;
          uvs[o + k] = a * (1 - tv) + b * tv;
        }
      }
    }
    const index: number[] = [];
    const W = this.colsOut;
    for (let i = 0; i < this.rowsOut - 1; i++) {
      for (let j = 0; j < this.colsOut - 1; j++) {
        const a = i * W + j, b = a + W, c = a + 1, d = b + 1;
        // Same winding as the source grid: (r,c) (r+1,c) (r,c+1).
        index.push(a, b, c, b, d, c);
      }
    }
    this.geometry = new T.BufferGeometry();
    this.geometry.name = `foundry.sail.refined.${R}x${C}.s${s}`;
    this.geometry.setAttribute('position', new T.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('normal', new T.BufferAttribute(this.normals, 3));
    this.geometry.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    this.geometry.setIndex(index.length > 65535 ? new T.Uint32BufferAttribute(index, 1) : new T.Uint16BufferAttribute(index, 1));
    this.weights(this.rowsOut, R - 1, 0);
    this.weights(this.colsOut, C - 1, this.rowsOut);
    this.update();
  }

  private weights(count: number, segments: number, base: number): void {
    const s = this.subdivisions;
    for (let i = 0; i < count; i++) {
      const seg = Math.min(segments - 1, Math.floor(i / s));
      const t = (i - seg * s) / s;
      const t2 = t * t, t3 = t2 * t;
      const o = (base + i) * 8;
      // Uniform Catmull–Rom: P(t) = ½[2p1 + (−p0+p2)t + (2p0−5p1+4p2−p3)t² + (−p0+3p1−3p2+p3)t³]
      this.w[o] = 0.5 * (-t + 2 * t2 - t3);
      this.w[o + 1] = 0.5 * (2 - 5 * t2 + 3 * t3);
      this.w[o + 2] = 0.5 * (t + 4 * t2 - 3 * t3);
      this.w[o + 3] = 0.5 * (-t2 + t3);
      this.w[o + 4] = 0.5 * (-1 + 4 * t - 3 * t2);
      this.w[o + 5] = 0.5 * (-10 * t + 9 * t2);
      this.w[o + 6] = 0.5 * (1 + 8 * t - 9 * t2);
      this.w[o + 7] = 0.5 * (-2 * t + 3 * t2);
      this.segIndex[base + i] = seg;
    }
  }

  update(): void {
    const cloth = this.cloth;
    const R = cloth.rows as number, C = cloth.cols as number;
    const EC = C + 2;
    const ext = this.ext;
    const parts = cloth.parts as Array<Array<{ x: { x: number; y: number; z: number } }>>;
    for (let r = 0; r < R; r++) {
      const row = parts[r]!;
      for (let c = 0; c < C; c++) {
        const p = row[c]!.x;
        const o = ((r + 1) * EC + (c + 1)) * 3;
        ext[o] = p.x; ext[o + 1] = p.y; ext[o + 2] = p.z;
      }
    }
    // Phantom border by linear extrapolation (natural end tangents).
    const at = (r: number, c: number): number => (r * EC + c) * 3;
    for (let r = 1; r <= R; r++) {
      for (let k = 0; k < 3; k++) {
        ext[at(r, 0) + k] = 2 * ext[at(r, 1) + k]! - ext[at(r, 2) + k]!;
        ext[at(r, C + 1) + k] = 2 * ext[at(r, C) + k]! - ext[at(r, C - 1) + k]!;
      }
    }
    for (let c = 0; c < EC; c++) {
      for (let k = 0; k < 3; k++) {
        ext[at(0, c) + k] = 2 * ext[at(1, c) + k]! - ext[at(2, c) + k]!;
        ext[at(R + 1, c) + k] = 2 * ext[at(R, c) + k]! - ext[at(R - 1, c) + k]!;
      }
    }
    const P = this.positions, N = this.normals, w = this.w;
    const rowsOut = this.rowsOut, colsOut = this.colsOut;
    for (let i = 0; i < rowsOut; i++) {
      const rv = this.segIndex[i]!; // rows rv-1..rv+2 → ext rows rv..rv+3
      const ov = i * 8;
      for (let j = 0; j < colsOut; j++) {
        const cu = this.segIndex[rowsOut + j]!;
        const ou = (rowsOut + j) * 8;
        let px = 0, py = 0, pz = 0, ux = 0, uy = 0, uz = 0, vx = 0, vy = 0, vz = 0;
        for (let a = 0; a < 4; a++) {
          const bv = w[ov + a]!, dv = w[ov + 4 + a]!;
          const rowBase = (rv + a) * EC;
          for (let b = 0; b < 4; b++) {
            const bu = w[ou + b]!, du = w[ou + 4 + b]!;
            const o = (rowBase + cu + b) * 3;
            const x = ext[o]!, y = ext[o + 1]!, z = ext[o + 2]!;
            const wb = bv * bu, wu = bv * du, wv = dv * bu;
            px += wb * x; py += wb * y; pz += wb * z;
            ux += wu * x; uy += wu * y; uz += wu * z;
            vx += wv * x; vy += wv * y; vz += wv * z;
          }
        }
        const o = (i * colsOut + j) * 3;
        P[o] = px; P[o + 1] = py; P[o + 2] = pz;
        // n = ∂P/∂v × ∂P/∂u matches the source grid's winding.
        let nx = vy * uz - vz * uy, ny = vz * ux - vx * uz, nz = vx * uy - vy * ux;
        const l = Math.hypot(nx, ny, nz);
        if (l > 1e-12) { nx /= l; ny /= l; nz /= l; } else { nx = 0; ny = 0; nz = 1; }
        N[o] = nx; N[o + 1] = ny; N[o + 2] = nz;
      }
    }
    // Collapsed head corners (zero ∂P/∂u) inherit the neighbouring row's normal.
    for (let j = 0; j < colsOut; j++) {
      for (const i of [0, rowsOut - 1]) {
        const o = (i * colsOut + j) * 3;
        if (N[o] === 0 && N[o + 1] === 0 && N[o + 2] === 1) {
          const q = ((i === 0 ? 1 : rowsOut - 2) * colsOut + j) * 3;
          N[o] = N[q]!; N[o + 1] = N[q + 1]!; N[o + 2] = N[q + 2]!;
        }
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }
}

interface SailRecord {
  kind: string;
  cloth: any;
  mesh: any;
  vinyl: any;
  surface: RefinedClothSurface;
  originalGeometry: any;
  originalSync: any;
  hadOwnSync: boolean;
  originalCastShadow: boolean;
  depthMaterial: any;
}

export class SailRenderSystem implements AppSystem {
  readonly id = 'scene.sail-surfaces';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  subdivisions = 4;
  /** Fraction of sunlight the Dacron lets through into its shadow. */
  shadowTransmission = 0.3;
  castShadows = true;
  private records: SailRecord[] = [];
  private updates = 0;
  private lastUpdateMs = 0;

  init(context: AppContext): void {
    const optics = window.LASER2_SAIL_OPTICS_V17;
    const sails = context.legacy.master.sails ?? {};
    for (const kind of ['main', 'jib', 'spin']) {
      const cloth = sails[kind]?.cloth;
      const entry = optics?.sails?.find?.((e: any) => e.kind === kind);
      const mesh = entry?.mesh ?? cloth?.mesh;
      if (!cloth?.parts || !mesh?.geometry) continue;
      const surface = new RefinedClothSurface(cloth, this.subdivisions, mesh.geometry.attributes.uv);
      const record: SailRecord = {
        kind, cloth, mesh, vinyl: entry?.vinyl ?? null, surface,
        originalGeometry: mesh.geometry,
        originalSync: cloth.syncMesh,
        hadOwnSync: Object.prototype.hasOwnProperty.call(cloth, 'syncMesh'),
        originalCastShadow: !!mesh.castShadow,
        depthMaterial: sailDepthMaterial(kind, this.shadowTransmission),
      };
      mesh.geometry = surface.geometry;
      if (record.vinyl) record.vinyl.geometry = surface.geometry;
      // The legacy visual sync writes particle positions into the render
      // geometry after each step; route it to the refined surface instead.
      const start = performance;
      cloth.syncMesh = (): void => {
        const t0 = start.now();
        surface.update();
        this.updates++;
        this.lastUpdateMs = start.now() - t0;
      };
      mesh.customDepthMaterial = record.depthMaterial;
      mesh.castShadow = this.castShadows;
      this.records.push(record);
    }
  }

  update(): void {
    for (const r of this.records) {
      r.depthMaterial.uniforms.uTransmission.value = this.shadowTransmission;
      r.mesh.castShadow = this.castShadows && r.mesh.visible;
    }
  }

  telemetry(): Record<string, unknown> {
    return {
      sails: this.records.map((r) => ({ kind: r.kind, grid: [r.cloth.rows, r.cloth.cols], render: [r.surface.rowsOut, r.surface.colsOut], castShadow: !!r.mesh.castShadow })),
      subdivisions: this.subdivisions,
      shadowTransmission: this.shadowTransmission,
      surfaceUpdates: this.updates,
      lastUpdateMs: this.lastUpdateMs,
      authority: 'Catmull–Rom bicubic sail surfaces through the cloth particles with analytic normals; window-aware, transmission-dithered shadow casting',
    };
  }

  dispose(): void {
    for (const r of this.records) {
      r.mesh.geometry = r.originalGeometry;
      if (r.vinyl) r.vinyl.geometry = r.originalGeometry;
      if (r.hadOwnSync) r.cloth.syncMesh = r.originalSync; else delete r.cloth.syncMesh;
      r.mesh.customDepthMaterial = undefined;
      r.mesh.castShadow = r.originalCastShadow;
      r.surface.geometry.dispose();
      r.depthMaterial.dispose();
    }
    this.records = [];
  }
}
