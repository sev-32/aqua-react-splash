/**
 * OceanSurface — POSEIDON's two-pass sea (projected-grid G-buffer + full-screen
 * water shading), carried into THALASSA's tiers, Nimbus sky and the planet.
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, type GL } from '../gl/context';
import { GBUF_VS, GBUF_FS, SHADE_FS, MAX_TILES } from './oceanShaders';
import type { SpectralOcean } from '../ocean/SpectralOcean';
import type { WindWaves } from '../ocean/windWaves';
import { pmod } from '../math/scalar';
import type { Vec3 } from '../math/mat4';

export interface TileBinding {
  rect: [number, number, number, number]; // world minX, minZ, size, array layer
}

export interface ShoreBinding {
  rect: [number, number, number]; // world minX, minZ, size
  surf: WebGLTexture;
  aux: WebGLTexture;
  bed: WebGLTexture;
  extra: WebGLTexture;
  fade: number;
}

export interface HeightBinding {
  fine: WebGLTexture; fineRect: [number, number, number];
  coarse: WebGLTexture; coarseRect: [number, number, number];
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

/** POSEIDON R7 "current best" surface parameters (volume, receivers, LOD lanes, glitter). */
export interface SurfaceParams {
  volumeSteps: number;
  turbidity: number; surfaceHaze: number; sedimentHaze: number; anisotropy: number; godray: number;
  bottomThreshold: number; maxFloorTrace: number;
  causticStrength: number; causticMax: number; causticDistance: number;
  aerialStrength: number;
  lodNear: [number, number, number]; lodMid: [number, number, number]; lodFar: [number, number, number]; lodHorizon: [number, number, number];
  laneMid: [number, number, number]; laneFar: [number, number, number]; laneHorizon: [number, number, number];
  farHorizon: number;
  glitterStrength: number; glitterNearDensity: number; glitterFarDensity: number; glitterFarBroadening: number;
  glitterClamp: number; glitterFade: [number, number, number];
  surfaceFarDistance: number;
  geoLodBias: number;
  /** Normal-filter footprint scale (1 = standard mips; POSEIDON sampled unfiltered). */
  normalSharpen: number;
}

export const DEFAULT_SURFACE: SurfaceParams = {
  volumeSteps: 14,
  turbidity: 0.72, surfaceHaze: 0.32, sedimentHaze: 0.75, anisotropy: 0.74, godray: 1.25,
  bottomThreshold: 0.018, maxFloorTrace: 8000,
  causticStrength: 1.15, causticMax: 4.8, causticDistance: 90,
  aerialStrength: 0.36,
  lodNear: [0, 1100, 260], lodMid: [700, 3600, 650], lodFar: [2800, 15000, 2600], lodHorizon: [11000, 60000, 6500],
  laneMid: [0.66, 0.92, 0.20], laneFar: [0.28, 1.85, 0.58], laneHorizon: [0.035, 3.2, 1.15],
  farHorizon: 5e6,
  glitterStrength: 0.62, glitterNearDensity: 1.0, glitterFarDensity: 0.18, glitterFarBroadening: 4.5,
  glitterClamp: 2.2, glitterFade: [700, 5000, 900],
  surfaceFarDistance: 20000,
  geoLodBias: -0.5,
  normalSharpen: 0.35,
};

export interface SurfaceFrame {
  viewProj: Float32Array;
  invViewProj: Float32Array;
  cam: Vec3;
  time: number;
  env: WebGLTexture;
  envLevels: number;
  envWidth: number;
  sunDir: Vec3;
  sunE: Vec3;
  skyE: Vec3;
  optics: WaterOptics;
  surface: SurfaceParams;
  debug: number;
  earthRadius: number;
  tiles: TileBinding[];
  tileArray: WebGLTexture | null;
  shore: ShoreBinding | null;
  tierMap: { texture: WebGLTexture; rect: [number, number, number] } | null;
  terrain: HeightBinding | null;
  scene: { color: WebGLTexture; depth: WebGLTexture; viewport: [number, number]; near: number; far: number } | null;
  near: number;
  far: number;
  cloud: { texture: WebGLTexture; rect: [number, number, number]; strength: number } | null;
  rain: number;
  haze: number;
  wind: WindWaves | null;
  /** HDR target the sea is shaded into (depth-tested against the opaque scene). */
  hdr: Target;
  /** Nimbus aerial perspective for this view (in-scatter, transmittance). */
  aerial: { inscatter: WebGLTexture; transmittance: WebGLTexture } | null;
}

const GRID_MARGIN = 1.25;

export class OceanSurface {
  private gbufProg: Program;
  private shadeProg: Program;
  private quad: Quad;
  private gridVao: WebGLVertexArrayObject;
  private gridIndexCount = 0;
  private gridN: [number, number] = [0, 0];
  private gbuf: Target | null = null;
  private dummy: WebGLTexture;
  private dummyArray: WebGLTexture;
  private dummyF32: WebGLTexture;
  /** For telemetry. */
  lastRows: [number, number] = [0, 0];

  constructor(private gl: GL, grid: [number, number]) {
    this.gbufProg = new Program(gl, 'ocean.gbuffer', GBUF_VS, GBUF_FS);
    this.shadeProg = new Program(gl, 'ocean.shade', FULLSCREEN_VS, SHADE_FS);
    this.quad = new Quad(gl);
    this.gridVao = gl.createVertexArray()!;
    this.setGrid(grid);
    this.dummy = createTexture(gl, 1, 1, { ...FMT.rgba16f(gl), data: new Uint16Array(4) });
    this.dummyF32 = createTexture(gl, 1, 1, { ...FMT.rgba32f(gl), data: new Float32Array(4) });
    this.dummyArray = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.dummyArray);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA16F, 1, 1, 1, 0, gl.RGBA, gl.HALF_FLOAT, new Uint16Array(4));
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  }

  /** Projected grid: x spans the screen with a margin (horizontal displacement), y ∈ [0,1] rows. */
  setGrid([nx, ny]: [number, number]) {
    if (nx === this.gridN[0] && ny === this.gridN[1]) return;
    const gl = this.gl;
    this.gridN = [nx, ny];
    const v = new Float32Array(nx * ny * 2);
    let p = 0;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { v[p++] = (-1 + (2 * x) / (nx - 1)) * GRID_MARGIN; v[p++] = y / (ny - 1); }
    const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
    p = 0;
    for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
      const a = y * nx + x, b = a + 1, c = a + nx, d = c + 1;
      idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d;
    }
    gl.bindVertexArray(this.gridVao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.gridIndexCount = idx.length;
  }

  get triangles() {
    return (this.gridN[0] - 1) * (this.gridN[1] - 1) * 2;
  }

  private ensureTargets(w: number, h: number) {
    if (this.gbuf && this.gbuf.width === w && this.gbuf.height === h) return;
    const gl = this.gl;
    this.gbuf?.dispose();
    const f32 = FMT.rgba32f(gl), f16 = FMT.rgba16f(gl);
    this.gbuf = new Target(gl, w, h, [
      createTexture(gl, w, h, f32), createTexture(gl, w, h, f16), createTexture(gl, w, h, f32), createTexture(gl, w, h, f16),
    ], 'renderbuffer');
  }

  /**
   * NDC rows the grid spends its vertices on: from just below the screen up to
   * where the sea is `maxDist` away (or the horizon), along the centre column.
   */
  private rowRange(inv: Float32Array, camY: number, R: number, maxDist: number): [number, number] {
    const ray = (y: number): Vec3 => {
      const x = inv[4] * y + inv[8] + inv[12], yy = inv[5] * y + inv[9] + inv[13], z = inv[6] * y + inv[10] + inv[14], w = inv[7] * y + inv[11] + inv[15];
      const d: Vec3 = [x / w, yy / w, z / w];
      const l = Math.hypot(d[0], d[1], d[2]);
      return [d[0] / l, d[1] / l, d[2] / l];
    };
    const tAt = (y: number) => {
      const rd = ray(y);
      if (R <= 0) return rd[1] < -1e-7 ? camY / -rd[1] : Infinity;
      const oc = camY + R, b = oc * rd[1], c = oc * oc - R * R, disc = b * b - c;
      if (disc < 0 || b > 0) return Infinity;
      const t = -b - Math.sqrt(disc);
      return t > 0 ? t : Infinity;
    };
    const lo = -1.06;
    let hi = 1.06;
    if (tAt(lo) === Infinity) return [lo, lo];        // looking at the sky only
    if (tAt(hi) > maxDist) {
      let a = lo, b = hi;
      for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if (tAt(m) <= maxDist) a = m; else b = m; }
      hi = a;
    }
    return [lo, hi];
  }

  draw(ocean: SpectralOcean, f: SurfaceFrame) {
    const gl = this.gl;
    const hdr = f.hdr;
    this.ensureTargets(hdr.width, hdr.height);
    const gbuf = this.gbuf!;
    const stats = ocean.stats;
    const hs = stats?.hs ?? 1;
    const S = f.surface;
    const camY = f.cam[1];
    const below = camY < 0;
    const rows = below ? ([-1.06, 1.06] as [number, number]) : this.rowRange(f.invViewProj, camY, f.earthRadius, S.surfaceFarDistance);
    this.lastRows = rows;

    // Shared uniforms (cascades, tiers, terrain).
    const C = ocean.cascades;
    const sizes = new Float32Array(4), offsets = new Float32Array(8);
    for (let c = 0; c < C; c++) {
      const L = ocean.layout.sizes[c];
      sizes[c] = L;
      offsets[c * 2] = pmod(f.cam[0], L);
      offsets[c * 2 + 1] = pmod(f.cam[2], L);
    }
    const common = (p: Program) => {
      p.set('uCamHeight', camY).set('uEarthRadius', f.earthRadius).set('uCascadeCount', C).set('uSizes', sizes)
        .set('uCamOffset', offsets).set('uTexN', ocean.n).set('uOpenDepth', 1500)
        .tex('uDispArr', ocean.dispArray).tex('uDerivArr', ocean.derivArray);
      if (f.terrain) {
        const t = f.terrain;
        p.set('uTerrainOn', 1).tex('uTFine', t.fine).tex('uTCoarse', t.coarse)
          .set('uTFineRect', [t.fineRect[0] - f.cam[0], t.fineRect[1] - f.cam[2], t.fineRect[2]])
          .set('uTCoarseRect', [t.coarseRect[0] - f.cam[0], t.coarseRect[1] - f.cam[2], t.coarseRect[2]]);
      } else p.set('uTerrainOn', 0).tex('uTFine', this.dummy).tex('uTCoarse', this.dummy);
    };

    // ── pass 1: surface G-buffer ──
    gbuf.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (rows[1] > rows[0]) {
      const g = this.gbufProg.use();
      common(g);
      const [nx, ny] = this.gridN;
      g.set('uViewProj', f.viewProj).set('uInvViewProj', f.invViewProj).set('uRowNdc', rows)
        .set('uGridStep', [(2 * GRID_MARGIN) / (nx - 1), (rows[1] - rows[0]) / (ny - 1)])
        .set('uFarDist', S.surfaceFarDistance).set('uGeoLodBias', S.geoLodBias).set('uSigHeightV', hs).set('uSigHeight', hs)
        .set('uBelow', below ? 1 : 0).set('uTime', f.time).set('uRain', f.rain).set('uNormalSharpen', S.normalSharpen)
        .set('uFoamGain', f.optics.foamGain).set('uFoamLife', ocean.foam.life).tex('uFoamArr', ocean.foamArray);
      const rects = new Float32Array(MAX_TILES * 4);
      const nTiles = Math.min(f.tiles.length, MAX_TILES);
      for (let t = 0; t < nTiles; t++) {
        const tb = f.tiles[t];
        rects.set([tb.rect[0] - f.cam[0], tb.rect[1] - f.cam[2], tb.rect[2], tb.rect[3]], t * 4);
      }
      g.set('uTileCount', nTiles).set('uTileRect', rects).tex('uTileArr', f.tileArray ?? this.dummyArray);
      if (f.shore) {
        g.set('uShoreRect', [f.shore.rect[0] - f.cam[0], f.shore.rect[1] - f.cam[2], f.shore.rect[2], f.shore.fade])
          .tex('uShoreSurf', f.shore.surf).tex('uShoreAux', f.shore.aux).tex('uShoreExtra', f.shore.extra);
      } else {
        g.set('uShoreRect', [0, 0, 1, 0]).tex('uShoreSurf', this.dummy).tex('uShoreAux', this.dummy).tex('uShoreExtra', this.dummy);
      }
      const w = f.wind;
      if (w?.params) {
        const MD = (w.constructor as typeof WindWaves).MICRO_DOMAIN;
        g.tex('uMicro', w.microTex).set('uMicroOff', [pmod(f.cam[0], MD), pmod(f.cam[2], MD)]).set('uMicroDomain', MD)
          .set('uMicroGain', w.params.microGeometryGain).set('uMicroNormalGain', w.params.microNormalGain).set('uMicroRange', w.params.microGeometryRange);
      } else g.tex('uMicro', this.dummyF32).set('uMicroOff', [0, 0]).set('uMicroDomain', 256).set('uMicroGain', 0).set('uMicroNormalGain', 0).set('uMicroRange', 1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(this.gridVao);
      gl.drawElements(gl.TRIANGLES, this.gridIndexCount, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
    }

    // ── pass 2: water shading into the HDR frame ──
    hdr.bind();
    const p = this.shadeProg.use();
    common(p);
    const o = f.optics;
    p.set('uViewProj', f.viewProj).set('uInvViewProj', f.invViewProj)
      .tex('uGPos', gbuf.textures[0]).tex('uGNrm', gbuf.textures[1]).tex('uGBase', gbuf.textures[2]).tex('uGFoam', gbuf.textures[3])
      .tex('uEnv', f.env).set('uEnvLevels', f.envLevels).set('uEnvWidth', f.envWidth)
      .set('uSunDir', f.sunDir).set('uSunE', f.sunE).set('uSkyE', f.skyE)
      .tex('uSlopeLut', ocean.slopeLutTex).set('uLogKMin', stats?.logKMin ?? 0).set('uLogKMax', stats?.logKMax ?? 1)
      .set('uRoughnessGain', o.roughnessGain).set('uIor', o.ior).set('uAbsorb', o.absorb).set('uScatter', o.scatter).set('uBackscatter', o.backscatter)
      .set('uFoamLife', ocean.foam.life).set('uTime', f.time).set('uDebug', f.debug).set('uRain', f.rain)
      .set('uTurbidity', S.turbidity).set('uSurfaceHaze', S.surfaceHaze).set('uSedimentHaze', S.sedimentHaze)
      .set('uAnisotropy', S.anisotropy).set('uGodray', S.godray).set('uVolumeSteps', S.volumeSteps)
      .set('uBottomThreshold', S.bottomThreshold).set('uMaxFloorTrace', S.maxFloorTrace)
      .set('uCausticStrength', S.causticStrength).set('uCausticMax', S.causticMax).set('uCausticDistance', S.causticDistance)
      .set('uAerialStrength', S.aerialStrength)
      .set('uLodNear', [...S.lodNear, 0]).set('uLodMid', [...S.lodMid, 0]).set('uLodFar', [...S.lodFar, 0]).set('uLodHorizon', [...S.lodHorizon, 0])
      .set('uLaneMid', S.laneMid).set('uLaneFar', S.laneFar).set('uLaneHorizon', S.laneHorizon).set('uFarHorizon', S.farHorizon)
      .set('uGlitter', [S.glitterStrength * o.glitter, S.glitterNearDensity, S.glitterFarDensity, S.glitterFarBroadening])
      .set('uGlitterFade', [S.glitterClamp, ...S.glitterFade])
      .set('uFogDensity', o.fogDensity * (5 * f.rain + Math.max(f.haze - 1, 0)))
      .set('uNear', f.near).set('uFar', f.far);
    if (f.cloud) {
      p.tex('uCloudShadow', f.cloud.texture).set('uCloudRect', [f.cloud.rect[0] - f.cam[0], f.cloud.rect[1] - f.cam[2], f.cloud.rect[2], f.cloud.strength]);
    } else p.tex('uCloudShadow', this.dummy).set('uCloudRect', [0, 0, 1, 0]);
    const w = f.wind;
    if (w?.params) {
      const WD = (w.constructor as typeof WindWaves).WIND_DOMAIN;
      p.tex('uWind', w.windTex.texture).set('uWindOff', [pmod(f.cam[0], WD), pmod(f.cam[2], WD)]).set('uWindDomain', WD).set('uWindRough', w.params.opticalRoughness);
    } else p.tex('uWind', this.dummyF32).set('uWindOff', [0, 0]).set('uWindDomain', 512).set('uWindRough', 0);
    if (f.tierMap) {
      p.tex('uTierMap', f.tierMap.texture).set('uTierRect', [f.tierMap.rect[0] - f.cam[0], f.tierMap.rect[1] - f.cam[2], f.tierMap.rect[2], 1]);
    } else p.tex('uTierMap', this.dummy).set('uTierRect', [0, 0, 1, 0]);
    if (f.aerial) p.set('uHasAerial', 1).tex('uAerialIn', f.aerial.inscatter).tex('uAerialT', f.aerial.transmittance);
    else p.set('uHasAerial', 0).tex('uAerialIn', this.dummy).tex('uAerialT', this.dummy);
    if (f.scene) p.set('uHasScene', 1).tex('uSceneColor', f.scene.color).tex('uSceneDepth', f.scene.depth);
    else p.set('uHasScene', 0).tex('uSceneColor', this.dummy).tex('uSceneDepth', this.dummy);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    this.quad.draw();
  }

  dispose() {
    const gl = this.gl;
    this.gbufProg.dispose();
    this.shadeProg.dispose();
    this.gbuf?.dispose();
    gl.deleteVertexArray(this.gridVao);
    gl.deleteTexture(this.dummy);
    gl.deleteTexture(this.dummyF32);
    gl.deleteTexture(this.dummyArray);
  }
}
