/**
 * OceanSurface — draws the CDLOD-tessellated, displaced sea surface.
 * Two instanced draws: full patches (P quads) and parent quadrants (P/2).
 */
import { Program, type GL } from '../gl/context';
import { CdlodSelector, patchMesh, type CdlodConfig, type CdlodSelection } from './cdlod';
import { OCEAN_VS, OCEAN_FS, MAX_TILES, MAX_LEVELS } from './oceanShaders';
import type { SpectralOcean } from '../ocean/SpectralOcean';
import { pmod } from '../math/scalar';
import type { Vec3 } from '../math/mat4';

interface InstancedMesh {
  vao: WebGLVertexArrayObject;
  instanceBuf: WebGLBuffer;
  indexCount: number;
  quads: number;
}

export interface TileBinding {
  rect: [number, number, number, number]; // world minX, minZ, size, weight
  texture: WebGLTexture;
}

export interface ShoreBinding {
  rect: [number, number, number]; // world minX, minZ, size
  surf: WebGLTexture;
  aux: WebGLTexture;
  bed: WebGLTexture;
}

export interface WaterOptics {
  absorb: Vec3;
  backscatter: Vec3;
  scatter: Vec3;
  ior: number;
  sss: number;
  glitter: number;
  roughnessGain: number;
  fogDensity: number;
  foamGain: number;
  foamDetailDist: number;
}

export interface SurfaceFrame {
  viewProj: Float32Array;
  planes: Float64Array;
  cam: Vec3;
  time: number;
  env: WebGLTexture;
  envLevels: number;
  sunDir: Vec3;
  sunE: Vec3;
  skyE: Vec3;
  optics: WaterOptics;
  debug: number;
  earthRadius: number;
  tiles: TileBinding[];
  shore: ShoreBinding | null;
  tierMap: { texture: WebGLTexture; rect: [number, number, number] } | null;
  scene: { color: WebGLTexture; depth: WebGLTexture; viewport: [number, number]; near: number; far: number } | null;
  geoLodBias: number;
}

export class OceanSurface {
  private prog: Program;
  readonly selector: CdlodSelector;
  private full: InstancedMesh;
  private half: InstancedMesh;
  lastSelection: CdlodSelection | null = null;
  private baseCoverage: number | null = null;
  private dummy: WebGLTexture;

  constructor(private gl: GL, cfg: CdlodConfig) {
    this.prog = new Program(gl, 'ocean.surface', OCEAN_VS, OCEAN_FS);
    this.selector = new CdlodSelector(cfg);
    this.full = this.makeMesh(cfg.patchQuads);
    this.half = this.makeMesh(cfg.patchQuads / 2);
    this.dummy = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.dummy);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.HALF_FLOAT, new Uint16Array(4));
  }

  setConfig(cfg: CdlodConfig) {
    const gl = this.gl;
    if (cfg.patchQuads !== this.selector.cfg.patchQuads) {
      for (const m of [this.full, this.half]) { gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.instanceBuf); }
      this.full = this.makeMesh(cfg.patchQuads);
      this.half = this.makeMesh(cfg.patchQuads / 2);
    }
    this.selector.setConfig(cfg);
  }

  private makeMesh(q: number): InstancedMesh {
    const gl = this.gl;
    const { grid, index } = patchMesh(q);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * 4 * 4096, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    const eb = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, instanceBuf: ib, indexCount: index.length, quads: q };
  }

  /** Triangle count of the last draw (telemetry). */
  get triangles() {
    const s = this.lastSelection;
    if (!s) return 0;
    const q = this.selector.cfg.patchQuads;
    return s.fullCount * q * q * 2 + s.halfCount * (q / 2) * (q / 2) * 2;
  }

  draw(ocean: SpectralOcean, f: SurfaceFrame) {
    const gl = this.gl;
    const stats = ocean.stats;
    const hs = stats?.hs ?? 1;
    const vertical = 1.8 * hs + 1.5;
    const horizontal = ocean.choppiness * hs + 1;
    // Cover out to the curved-earth horizon (+ margin) so the sea never ends in mid-air.
    const horizon = f.earthRadius > 0 ? Math.sqrt(2 * f.earthRadius * Math.max(f.cam[1], 1)) : 0;
    const baseCoverage = this.baseCoverage ?? this.selector.cfg.coverage;
    this.baseCoverage = baseCoverage;
    this.selector.cfg.coverage = Math.min(Math.max(baseCoverage, horizon * 1.25 + 2000), 400000);
    this.selector.earthRadius = f.earthRadius;
    const sel = this.selector.select(f.cam, f.planes, vertical, horizontal);
    this.lastSelection = sel;

    const p = this.prog.use();
    const C = ocean.cascades;
    const sizes = new Float32Array(4), offsets = new Float32Array(8);
    for (let c = 0; c < C; c++) {
      const L = ocean.layout.sizes[c];
      sizes[c] = L;
      offsets[c * 2] = pmod(f.cam[0], L);
      offsets[c * 2 + 1] = pmod(f.cam[2], L);
    }
    const morph = new Float32Array(MAX_LEVELS * 2);
    morph.set(sel.morph.subarray(0, Math.min(sel.morph.length, MAX_LEVELS * 2)));
    p.set('uViewProj', f.viewProj).set('uCamHeight', f.cam[1]).set('uMorph', morph)
      .set('uEarthRadius', f.earthRadius).set('uGeoLodBias', f.geoLodBias)
      .set('uCascadeCount', C).set('uSizes', sizes).set('uCamOffset', offsets).set('uTexN', ocean.n);
    for (let c = 0; c < 4; c++) {
      const cc = Math.min(c, C - 1);
      p.tex(`uDisp${c}`, ocean.disp[cc]).tex(`uDeriv${c}`, ocean.deriv[cc]).tex(`uFoam${c}`, ocean.foamTexture(cc));
    }
    // Interaction tiles (camera-relative rects).
    const rects = new Float32Array(MAX_TILES * 4);
    const nTiles = Math.min(f.tiles.length, MAX_TILES);
    for (let t = 0; t < MAX_TILES; t++) {
      const tb = f.tiles[t];
      if (t < nTiles) {
        rects.set([tb.rect[0] - f.cam[0], tb.rect[1] - f.cam[2], tb.rect[2], tb.rect[3]], t * 4);
        p.tex(`uTileTex${t}`, tb.texture);
      } else p.tex(`uTileTex${t}`, this.dummy);
    }
    p.set('uTileCount', nTiles).set('uTileRect', rects);
    if (f.shore) {
      p.set('uShoreRect', [f.shore.rect[0] - f.cam[0], f.shore.rect[1] - f.cam[2], f.shore.rect[2], 1])
        .tex('uShoreSurf', f.shore.surf).tex('uShoreAux', f.shore.aux).tex('uShoreBed', f.shore.bed);
    } else {
      p.set('uShoreRect', [0, 0, 1, 0]).tex('uShoreSurf', this.dummy).tex('uShoreAux', this.dummy).tex('uShoreBed', this.dummy);
    }
    const o = f.optics;
    p.tex('uEnv', f.env).set('uEnvLevels', f.envLevels).set('uSunDir', f.sunDir).set('uSunE', f.sunE).set('uSkyE', f.skyE)
      .tex('uSlopeLut', ocean.slopeLutTex).set('uLogKMin', stats?.logKMin ?? 0).set('uLogKMax', stats?.logKMax ?? 1)
      .set('uRoughnessGain', o.roughnessGain).set('uIor', o.ior)
      .set('uAbsorb', o.absorb).set('uBackscatter', o.backscatter).set('uScatter', o.scatter)
      .set('uSss', o.sss).set('uSigHeight', hs).set('uGlitter', o.glitter).set('uFogDensity', o.fogDensity)
      .set('uTime', f.time).set('uDebug', f.debug).set('uFoamGain', o.foamGain)
      .set('uFoamLife', ocean.foam.life);
    if (f.tierMap) {
      p.tex('uTierMap', f.tierMap.texture).set('uTierRect', [f.tierMap.rect[0] - f.cam[0], f.tierMap.rect[1] - f.cam[2], f.tierMap.rect[2], 1]);
    } else p.tex('uTierMap', this.dummy).set('uTierRect', [0, 0, 1, 0]);
    if (f.scene) {
      p.set('uHasScene', 1).tex('uSceneColor', f.scene.color).tex('uSceneDepth', f.scene.depth)
        .set('uViewport', f.scene.viewport).set('uNear', f.scene.near).set('uFar', f.scene.far);
    } else p.set('uHasScene', 0).tex('uSceneColor', this.dummy).tex('uSceneDepth', this.dummy);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    for (const [mesh, data, count] of [
      [this.full, sel.full, sel.fullCount],
      [this.half, sel.half, sel.halfCount],
    ] as const) {
      if (!count) continue;
      p.set('uP', mesh.quads);
      gl.bindVertexArray(mesh.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instanceBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * 4));
      gl.drawElementsInstanced(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT, 0, count);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    this.prog.dispose();
    for (const m of [this.full, this.half]) { gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.instanceBuf); }
    gl.deleteTexture(this.dummy);
  }
}
