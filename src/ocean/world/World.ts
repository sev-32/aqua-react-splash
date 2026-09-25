/**
 * World: GPU-baked terrain height textures (coarse + fine) and CPU bathymetry
 * products (depth, shoreline distance, slope, uncertainty) for the scheduler.
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, type GL } from '../gl/context';
import { TERRAIN_GLSL, terrainUniforms } from './terrainGlsl';
import { DEFAULT_TERRAIN, terrainHeight, terrainBounds, bathymetryUncertainty, type TerrainParams } from './terrain';
import { smoothstep } from '../math/scalar';

const BAKE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${TERRAIN_GLSL}
uniform vec2 uMin;
uniform float uSize;
uniform float uN;
out vec4 o;
void main(){
  vec2 p = uMin + gl_FragCoord.xy/uN*uSize;
  o = vec4(terrainHeight(p), 0.0, 0.0, 1.0);
}`;

export interface HeightLayer {
  texture: WebGLTexture;
  min: [number, number];
  size: number;
  n: number;
}

export interface BathyProducts {
  n: number;
  min: [number, number];
  size: number;
  height: Float32Array;          // m
  shoreDistance: Float32Array;   // m, + offshore, − inland (approximate)
  slope: Float32Array;           // |∇b|
  uncertainty: Float32Array;     // m (1σ)
}

export class World {
  readonly params: TerrainParams;
  readonly bounds: { min: [number, number]; max: [number, number] };
  coarse: HeightLayer;
  fine: HeightLayer;
  products: BathyProducts;
  private bakeProg: Program;
  private quad: Quad;

  constructor(private gl: GL, params: TerrainParams = DEFAULT_TERRAIN, quality: { coarseN: number; fineN: number } = { coarseN: 1024, fineN: 2048 }) {
    this.params = params;
    this.bounds = terrainBounds(params);
    this.bakeProg = new Program(gl, 'world.bake', FULLSCREEN_VS, BAKE_FS);
    this.quad = new Quad(gl);
    const bsize = this.bounds.max[0] - this.bounds.min[0];
    this.coarse = this.bake(this.bounds.min, bsize, quality.coarseN);
    const fsize = params.radius * 2 + 1400;
    this.fine = this.bake([params.center[0] - fsize / 2, params.center[1] - fsize / 2], fsize, quality.fineN);
    this.products = this.computeProducts(128);
  }

  /** Bake an R32F height texture of a square region (also used for the SWE bed). */
  bake(min: [number, number], size: number, n: number): HeightLayer {
    const gl = this.gl;
    const tex = createTexture(gl, n, n, { ...FMT.r32f(gl), filter: gl.LINEAR });
    const t = new Target(gl, n, n, [tex]);
    const p = this.bakeProg.use();
    for (const [k, v] of Object.entries(terrainUniforms(this.params))) p.set(k, v as number);
    p.set('uMin', min).set('uSize', size).set('uN', n);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    t.bind();
    this.quad.draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(t.fbo);
    return { texture: tex, min, size, n };
  }

  /** Coarse CPU products for tier decisions (scheduler reads these, never the GPU). */
  private computeProducts(n: number): BathyProducts {
    const size = this.bounds.max[0] - this.bounds.min[0];
    const d = size / n;
    const height = new Float32Array(n * n), slope = new Float32Array(n * n), unc = new Float32Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const x = this.bounds.min[0] + (i + 0.5) * d, z = this.bounds.min[1] + (j + 0.5) * d;
        height[j * n + i] = terrainHeight(x, z, this.params);
      }
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const hx = (height[j * n + Math.min(i + 1, n - 1)] - height[j * n + Math.max(i - 1, 0)]) / (2 * d);
        const hz = (height[Math.min(j + 1, n - 1) * n + i] - height[Math.max(j - 1, 0) * n + i]) / (2 * d);
        slope[k] = Math.hypot(hx, hz);
        const shallow = smoothstep(-40, -2, height[k]) * (1 - smoothstep(0, 3, height[k]));
        unc[k] = shallow > 0.05 ? bathymetryUncertainty(this.bounds.min[0] + (i + 0.5) * d, this.bounds.min[1] + (j + 0.5) * d, this.params) : 0.15;
      }
    // Shoreline distance: two-pass chamfer distance transform to the sign change.
    const INF = 1e9;
    const dist = new Float32Array(n * n).fill(INF);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i, wet = height[k] < 0;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [a, b] of nb) {
          const ii = i + a, jj = j + b;
          if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
          if ((height[jj * n + ii] < 0) !== wet) { dist[k] = d * 0.5; break; }
        }
      }
    const D1 = d, D2 = d * Math.SQRT2;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        if (i > 0) dist[k] = Math.min(dist[k], dist[k - 1] + D1);
        if (j > 0) dist[k] = Math.min(dist[k], dist[k - n] + D1);
        if (i > 0 && j > 0) dist[k] = Math.min(dist[k], dist[k - n - 1] + D2);
        if (i < n - 1 && j > 0) dist[k] = Math.min(dist[k], dist[k - n + 1] + D2);
      }
    for (let j = n - 1; j >= 0; j--)
      for (let i = n - 1; i >= 0; i--) {
        const k = j * n + i;
        if (i < n - 1) dist[k] = Math.min(dist[k], dist[k + 1] + D1);
        if (j < n - 1) dist[k] = Math.min(dist[k], dist[k + n] + D1);
        if (i < n - 1 && j < n - 1) dist[k] = Math.min(dist[k], dist[k + n + 1] + D2);
        if (i > 0 && j < n - 1) dist[k] = Math.min(dist[k], dist[k + n - 1] + D2);
      }
    const shoreDistance = new Float32Array(n * n);
    for (let k = 0; k < n * n; k++) shoreDistance[k] = (height[k] < 0 ? 1 : -1) * Math.min(dist[k], 1e6);
    return { n, min: this.bounds.min, size, height, shoreDistance, slope, uncertainty: unc };
  }

  /** Bilinear lookup in the CPU products (outside: open ocean). */
  sampleProduct(field: keyof Pick<BathyProducts, 'height' | 'shoreDistance' | 'slope' | 'uncertainty'>, x: number, z: number): number {
    const p = this.products;
    const u = ((x - p.min[0]) / p.size) * p.n - 0.5, v = ((z - p.min[1]) / p.size) * p.n - 0.5;
    if (u < 0 || v < 0 || u >= p.n - 1 || v >= p.n - 1) {
      return field === 'height' ? -this.params.oceanDepth : field === 'shoreDistance' ? 1e6 : field === 'uncertainty' ? 0.15 : 0;
    }
    const i = Math.floor(u), j = Math.floor(v), fx = u - i, fz = v - j;
    const a = p[field];
    const n = p.n;
    return (a[j * n + i] * (1 - fx) + a[j * n + i + 1] * fx) * (1 - fz) + (a[(j + 1) * n + i] * (1 - fx) + a[(j + 1) * n + i + 1] * fx) * fz;
  }

  dispose() {
    this.gl.deleteTexture(this.coarse.texture);
    this.gl.deleteTexture(this.fine.texture);
    this.bakeProg.dispose();
  }
}
