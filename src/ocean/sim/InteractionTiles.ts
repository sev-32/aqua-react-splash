/**
 * InteractionTiles — tier T3 "just-in-time" dispersive fields.
 *
 * A small pool of eWave tiles is allocated where interaction truth demands it
 * (bodies moving through water, impacts, clicks), follows its bodies by integer
 * cell recentring, and fades out and is released when the scene goes quiet.
 * The HydroEscalationScheduler decides *whether* a tile may exist; this class
 * owns *how* it runs.
 */
import { Program, Target, LayerTarget, Quad, FULLSCREEN_VS, createTexture, createTextureArray, FMT, PingPong, type GL } from '../gl/context';
import { AsyncReader } from '../gl/asyncReader';
import {
  TILE_SOURCE_FS, TILE_FFT_FS, TILE_EVOLVE_FS, TILE_LIMIT_FS, TILE_OUTPUT_FS, TILE_SHIFT_FS,
  TILE_REDUCE_REL_FS, TILE_REDUCE_ETA_FS, SPLAT_VS, SPLAT_FS, MAX_BODIES,
} from './interactionShaders';
import type { SpectralOcean } from '../ocean/SpectralOcean';
import type { Body } from '../physics/bodies';
import { quatToMat3 } from '../math/mat4';
import { pmod } from '../math/scalar';

export interface TileConfig {
  n: number;
  dx: number;
  depth: number;
  damping: number;
  viscosity: number;
  sourceGain: number;
  limiter: boolean;
  maxSlope: number;
  relax: number;
  foamLife: number;
}

export interface ReleasePatch {
  x: number; z: number; y: number;
  volume: number;
  vx: number; vy: number; vz: number;
  events: number;
}

/** `exact`: a pure Gaussian (volume-exact removal); otherwise a negative dEta is a crater with a rim. */
interface Impact { x: number; z: number; r: number; dEta: number; dFoam: number; dPhi: number; exact: boolean }

export interface InteractionTile {
  id: number;
  origin: [number, number];     // world (m), multiple of dx
  size: number;
  /** Cell size (m): fine tiles for small objects (spheres, rocks), coarse for hulls. */
  dx: number;
  /** Still-water depth for the dispersion relation (m), from the seabed under the tile. */
  depth: number;
  state: PingPong;              // RG32F (η, φ)
  aux: PingPong;                // RGBA32F
  release: PingPong;            // MRT 2 × RGBA32F
  spec: [Target, Target];       // RG32F FFT work
  layer: number;                // layer of the shared output array
  output: LayerTarget;          // RGBA16F render field (η, ∂η/∂x, ∂η/∂z, foam)
  reduceRel: Target;
  reduceEta: Target;
  readRel: AsyncReader;
  readEta: AsyncReader;
  etaGrid: Float32Array;        // CPU copy: 64×64 × (η, φ, foam, -)
  etaGridN: number;
  fade: number;
  retiring: boolean;
  lastActive: number;
  followIds: number[];
  impacts: Impact[];
  born: number;
  reason: string;
}

const REL_GRID = 16;
const ETA_GRID = 64;
let tileIds = 1;

/** Splat height that deposits volume V (m³) as a Gaussian of 1/e radius r. */
export const splatHeightForVolume = (V: number, r: number) => V / (Math.PI * r * r);

export class InteractionTiles {
  readonly tiles: InteractionTile[] = [];
  maxTiles = 3;
  /** All tiles render into one texture array → a single sampler unit for the water shader. */
  readonly outputArray: WebGLTexture;
  static readonly LAYERS = 4;
  private quad: Quad;
  private pSource: Program; private pFft: Program; private pEvolve: Program; private pLimit: Program;
  private pOutput: Program; private pShift: Program; private pReduceRel: Program; private pReduceEta: Program;
  private pSplat: Program;
  private splatVao: WebGLVertexArrayObject;
  private splatBuf: WebGLBuffer;
  private impactsTarget: Target;
  private zeroTex: WebGLTexture;
  /** Releases collected from GPU reductions, consumed by the splash system. */
  pendingReleases: ReleasePatch[] = [];
  /** Escrow ledger: volume the limiter removed from heightfields (m³). */
  releasedVolume = 0;

  constructor(private gl: GL, public cfg: TileConfig) {
    this.quad = new Quad(gl);
    this.pSource = new Program(gl, 'tile.source', FULLSCREEN_VS, TILE_SOURCE_FS);
    this.pFft = new Program(gl, 'tile.fft', FULLSCREEN_VS, TILE_FFT_FS);
    this.pEvolve = new Program(gl, 'tile.evolve', FULLSCREEN_VS, TILE_EVOLVE_FS);
    this.pLimit = new Program(gl, 'tile.limit', FULLSCREEN_VS, TILE_LIMIT_FS);
    this.pOutput = new Program(gl, 'tile.output', FULLSCREEN_VS, TILE_OUTPUT_FS);
    this.pShift = new Program(gl, 'tile.shift', FULLSCREEN_VS, TILE_SHIFT_FS);
    this.pReduceRel = new Program(gl, 'tile.reduceRel', FULLSCREEN_VS, TILE_REDUCE_REL_FS);
    this.pReduceEta = new Program(gl, 'tile.reduceEta', FULLSCREEN_VS, TILE_REDUCE_ETA_FS);
    this.pSplat = new Program(gl, 'tile.splat', SPLAT_VS, SPLAT_FS);
    const n = cfg.n;
    this.impactsTarget = new Target(gl, n, n, [createTexture(gl, n, n, FMT.rgba16f(gl))]);
    this.zeroTex = createTexture(gl, 1, 1, { ...FMT.rgba16f(gl), data: new Uint16Array(4) });
    this.outputArray = createTextureArray(gl, n, n, InteractionTiles.LAYERS, { ...FMT.rgba16f(gl), filter: gl.LINEAR });
    this.splatVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.splatVao);
    this.splatBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.splatBuf);
    gl.bufferData(gl.ARRAY_BUFFER, 256 * 8 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    gl.bindVertexArray(null);
  }

  get tileSize() {
    return this.cfg.n * this.cfg.dx;
  }

  /** Seabed depth query (positive down) for per-tile dispersion; defaults to the config depth. */
  depthAt: ((x: number, z: number) => number) | null = null;

  private allocate(center: [number, number], reason: string, now: number, dxOverride?: number): InteractionTile {
    const gl = this.gl;
    const n = this.cfg.n;
    const dx = dxOverride ?? this.cfg.dx;
    const size = n * dx;
    const d = this.depthAt ? this.depthAt(center[0], center[1]) : this.cfg.depth;
    const snap = (v: number) => Math.round((v - size / 2) / dx) * dx;
    const f32 = FMT.rgba32f(gl), rg = FMT.rg32f(gl);
    const used = new Set(this.tiles.map((x) => x.layer));
    let layer = 0;
    while (used.has(layer)) layer++;
    const mk = (fmt: { internal: number; format: number; type: number }, count = 1) => () =>
      new Target(gl, n, n, Array.from({ length: count }, () => createTexture(gl, n, n, fmt)));
    const tile: InteractionTile = {
      id: tileIds++,
      origin: [snap(center[0]), snap(center[1])],
      size,
      dx,
      depth: Math.min(Math.max(d, 0.5), this.cfg.depth),
      state: new PingPong(mk(rg)),
      aux: new PingPong(mk(f32)),
      release: new PingPong(mk(f32, 2)),
      spec: [mk(rg)(), mk(rg)()],
      layer,
      output: new LayerTarget(gl, n, n, [{ tex: this.outputArray, layer }]),
      reduceRel: new Target(gl, REL_GRID, REL_GRID, [createTexture(gl, REL_GRID, REL_GRID, f32), createTexture(gl, REL_GRID, REL_GRID, f32)]),
      reduceEta: new Target(gl, ETA_GRID, ETA_GRID, [createTexture(gl, ETA_GRID, ETA_GRID, f32)]),
      readRel: new AsyncReader(gl, REL_GRID, REL_GRID, 2),
      readEta: new AsyncReader(gl, ETA_GRID, ETA_GRID, 1),
      etaGrid: new Float32Array(ETA_GRID * ETA_GRID * 4),
      etaGridN: ETA_GRID,
      fade: 0,
      retiring: false,
      lastActive: now,
      followIds: [],
      impacts: [],
      born: now,
      reason,
    };
    for (const pp of [tile.state, tile.aux, tile.release]) for (const t of [pp.read, pp.write]) this.clear(t);
    tile.output.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.tiles.push(tile);
    return tile;
  }

  private clear(t: Target | LayerTarget) {
    const gl = this.gl;
    t.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /** Tile covering a world point (with margin), if any. */
  tileAt(x: number, z: number, margin = 0): InteractionTile | undefined {
    return this.tiles.find((t) => !t.retiring && x >= t.origin[0] + margin && z >= t.origin[1] + margin && x < t.origin[0] + t.size - margin && z < t.origin[1] + t.size - margin);
  }

  /** Ensure a tile covers `center` (JIT promotion). Returns null when the budget is exhausted. */
  ensure(center: [number, number], reason: string, now: number, dx?: number): InteractionTile | null {
    const want = dx ?? this.cfg.dx;
    const existing = this.tiles.find((t) => !t.retiring && Math.abs(t.dx - want) < 1e-6
      && center[0] >= t.origin[0] + t.size * 0.18 && center[1] >= t.origin[1] + t.size * 0.18
      && center[0] < t.origin[0] + t.size * 0.82 && center[1] < t.origin[1] + t.size * 0.82)
      ?? this.tileAt(center[0], center[1], this.tileSize * 0.18);
    if (existing) { existing.lastActive = now; return existing; }
    const live = this.tiles.filter((t) => !t.retiring);
    if (live.length >= Math.min(this.maxTiles, InteractionTiles.LAYERS) || this.tiles.length >= InteractionTiles.LAYERS) return null;
    return this.allocate(center, reason, now, want);
  }

  addImpact(x: number, z: number, r: number, dEta: number, dFoam = 0, dPhi = 0, now = 0, exact = false) {
    const t = this.tileAt(x, z) ?? this.ensure([x, z], 'impact', now);
    if (!t) return false;
    t.impacts.push({ x: x - t.origin[0], z: z - t.origin[1], r, dEta, dFoam, dPhi, exact });
    t.lastActive = now;
    return true;
  }

  /** Integer-cell recentring toward a target centre (keeps followed bodies inside). */
  private recenter(t: InteractionTile, target: [number, number]) {
    const n = this.cfg.n;
    const dx = t.dx;
    const cx = t.origin[0] + t.size / 2, cz = t.origin[1] + t.size / 2;
    const ddx = target[0] - cx, ddz = target[1] - cz;
    const thresh = t.size * 0.16;
    if (Math.abs(ddx) < thresh && Math.abs(ddz) < thresh) return;
    const step = 16; // cells: keeps shifts rare and aligned
    const sx = Math.round(ddx / dx / step) * step, sz = Math.round(ddz / dx / step) * step;
    if (!sx && !sz) return;
    const p = this.pShift.use();
    p.set('uShift', [sx, sz]).set('uN', n);
    for (const pp of [t.state, t.aux]) {
      p.tex('uSrc', pp.read.texture);
      pp.write.bind();
      this.quad.draw();
      pp.swap();
    }
    // Release maps are drained every frame; just clear them on shift.
    for (const tg of [t.release.read, t.release.write]) this.clear(tg);
    t.origin = [t.origin[0] + sx * dx, t.origin[1] + sz * dx];
  }

  private drawImpacts(t: InteractionTile) {
    const gl = this.gl;
    this.clear(this.impactsTarget);
    if (!t.impacts.length) return;
    const data = new Float32Array(Math.min(t.impacts.length, 256) * 8);
    t.impacts.slice(0, 256).forEach((im, i) => data.set([im.x, im.z, im.r, im.dEta, im.dFoam, im.dPhi, im.exact ? 1 : 0, 0], i * 8));
    this.impactsTarget.bind();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.pSplat.use().set('uTileSize', t.size).set('uN', this.cfg.n);
    gl.bindVertexArray(this.splatVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.splatBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.drawArrays(gl.POINTS, 0, data.length / 8);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    t.impacts.length = 0;
  }

  /** Advance all tiles one frame. */
  update(ocean: SpectralOcean, bodies: Body[], dt: number, now: number) {
    const gl = this.gl;
    const cfg = this.cfg;
    const n = cfg.n;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    for (const t of [...this.tiles]) {
      // Fade in/out (receipted by the scheduler); free when fully faded.
      t.fade = Math.min(1, Math.max(0, t.fade + (t.retiring ? -dt / 1.5 : dt / 0.6)));
      if (t.retiring && t.fade <= 0) { this.free(t); continue; }
      // Follow bodies.
      const follow = bodies.filter((b) => t.followIds.includes(b.id));
      if (follow.length) {
        const cx = follow.reduce((a, b) => a + b.pos[0], 0) / follow.length;
        const cz = follow.reduce((a, b) => a + b.pos[2], 0) / follow.length;
        this.recenter(t, [cx, cz]);
      }
      this.consumeReadbacks(t);
      if (dt <= 0) continue;
      this.drawImpacts(t);

      // 1. Sources.
      const near = bodies.filter((b) => b.alive && Math.abs(b.pos[0] - (t.origin[0] + t.size / 2)) < t.size / 2 + 10
        && Math.abs(b.pos[2] - (t.origin[1] + t.size / 2)) < t.size / 2 + 10).slice(0, MAX_BODIES);
      const bp = new Float32Array(MAX_BODIES * 4), ba = new Float32Array(MAX_BODIES * 9), bd = new Float32Array(MAX_BODIES * 4);
      near.forEach((b, i) => {
        const kind = b.shape.kind === 'sphere' ? 0 : b.shape.kind === 'hull' ? 1 : 2;
        bp.set([b.pos[0] - t.origin[0], b.pos[1], b.pos[2] - t.origin[1], kind], i * 4);
        ba.set(quatToMat3(b.rot), i * 9);
        const s = b.shape;
        bd.set(kind === 0 ? [s.radius ?? 1, 0, 0, 0] : kind === 1 ? [s.length ?? 8, s.beam ?? 2.4, s.draft ?? 0.9, s.freeboard ?? 0.8] : [...(s.half ?? [1, 1, 1]), 0], i * 4);
      });
      const sizes = new Float32Array(4), offs = new Float32Array(8);
      for (let c = 0; c < ocean.cascades; c++) {
        const L = ocean.layout.sizes[c];
        sizes[c] = L;
        offs[c * 2] = pmod(t.origin[0], L);
        offs[c * 2 + 1] = pmod(t.origin[1], L);
      }
      const ps = this.pSource.use();
      ps.set('uN', n).set('uDx', t.dx).set('uCascadeCount', ocean.cascades).set('uSizes', sizes).set('uCascOffset', offs)
        .set('uBodyCount', near.length).set('uBodyPos', bp).set('uBodyAx', ba).set('uBodyDims', bd).set('uSourceGain', cfg.sourceGain)
        .tex('uState', t.state.read.texture).tex('uAux', t.aux.read.texture).tex('uImpacts', this.impactsTarget.texture);
      ps.tex('uDispArr', ocean.dispArray);
      this.mrt([t.state.write, t.aux.write]);
      t.state.swap();
      t.aux.swap();

      // 2. Forward FFT → exact rotation → inverse FFT.
      let src = t.state.read.texture;
      let w = 0;
      const pf = this.pFft.use();
      pf.set('uN', n).set('uSign', -1);
      for (const h of [1, 0]) {
        pf.set('uHorizontal', h);
        for (let s = 2; s <= n; s <<= 1) {
          pf.set('uStage', s).tex('uSrc', src);
          t.spec[w].bind();
          this.quad.draw();
          src = t.spec[w].texture;
          w = 1 - w;
        }
      }
      this.pEvolve.use().set('uN', n).set('uDx', t.dx).set('uDt', dt).set('uDepth', t.depth)
        .set('uDamping', cfg.damping).set('uViscosity', cfg.viscosity).tex('uSpec', src);
      t.spec[w].bind();
      this.quad.draw();
      src = t.spec[w].texture;
      w = 1 - w;
      pf.use().set('uSign', 1);
      for (const h of [1, 0]) {
        pf.set('uHorizontal', h);
        for (let s = 2; s <= n; s <<= 1) {
          pf.set('uStage', s).tex('uSrc', src);
          const dst = s === n && h === 0 ? t.state.write : t.spec[w];
          dst.bind();
          this.quad.draw();
          src = dst.texture;
          if (dst !== t.state.write) w = 1 - w;
        }
      }
      t.state.swap();

      // 3. Limiter + sponge + foam (+ release accumulation).
      this.pLimit.use().set('uN', n).set('uDx', t.dx).set('uDt', dt).set('uMaxSlope', cfg.maxSlope).set('uRelax', cfg.relax)
        .set('uLimiter', cfg.limiter ? 1 : 0).set('uSponge', n * 0.1).set('uFoamLife', cfg.foamLife).set('uOrigin', t.origin)
        .tex('uState', t.state.read.texture).tex('uAux', t.aux.read.texture)
        .tex('uRelA', t.release.read.textures[0]).tex('uRelB', t.release.read.textures[1]);
      this.mrtMany([t.state.write.fbo, t.aux.write.fbo, t.release.write.fbo], [t.state.write, t.aux.write, t.release.write]);
      t.state.swap();
      t.aux.swap();
      t.release.swap();

      // 4. Output for rendering.
      this.pOutput.use().set('uN', n).set('uDx', t.dx).set('uFade', t.fade)
        .tex('uState', t.state.read.texture).tex('uAux', t.aux.read.texture);
      t.output.bind();
      this.quad.draw();

      // 5. Reductions + async readback (release maps are drained after each read request).
      if (!t.readRel.busy) {
        this.pReduceRel.use().set('uBlock', n / REL_GRID).tex('uRelA', t.release.read.textures[0]).tex('uRelB', t.release.read.textures[1]);
        t.reduceRel.bind();
        this.quad.draw();
        t.readRel.request(t.reduceRel.fbo);
        this.clear(t.release.read);
      }
      if (!t.readEta.busy) {
        this.pReduceEta.use().set('uBlock', n / ETA_GRID).tex('uState', t.state.read.texture).tex('uAux', t.aux.read.texture);
        t.reduceEta.bind();
        this.quad.draw();
        t.readEta.request(t.reduceEta.fbo);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Draw into a single target that may have multiple attachments. */
  private mrt(targets: Target[]) {
    // Source pass writes state + aux: bind a temporary FBO with both attachments.
    this.mrtMany(targets.map((t) => t.fbo), targets);
  }

  private tmpFbo: WebGLFramebuffer | null = null;
  private mrtMany(_fbos: WebGLFramebuffer[], targets: Target[]) {
    const gl = this.gl;
    if (!this.tmpFbo) this.tmpFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tmpFbo);
    const texs: WebGLTexture[] = [];
    for (const t of targets) texs.push(...t.textures);
    const bufs: number[] = [];
    texs.forEach((tex, i) => { gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0); bufs.push(gl.COLOR_ATTACHMENT0 + i); });
    const maxAtt = Math.min(gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) as number, 8);
    for (let i = texs.length; i < maxAtt; i++) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    gl.drawBuffers(bufs);
    gl.viewport(0, 0, targets[0].width, targets[0].height);
    this.quad.draw();
  }

  private consumeReadbacks(t: InteractionTile) {
    if (t.readEta.poll()) t.etaGrid.set(t.readEta.data);
    if (t.readRel.poll()) {
      const d = t.readRel.data;
      const cells = REL_GRID * REL_GRID;
      for (let i = 0; i < cells; i++) {
        const a = i * 4, b = cells * 4 + i * 4;
        const V = d[a];
        if (V <= 1e-6) continue;
        this.releasedVolume += V;
        this.pendingReleases.push({
          volume: V, vy: d[a + 1] / V, vx: d[a + 2] / V, vz: d[a + 3] / V,
          x: d[b] / V, z: d[b + 1] / V, y: d[b + 2] / V, events: d[b + 3],
        });
      }
    }
  }

  /** Local-field height at a world point from the async η grid (bilinear), weighted by tile fade. */
  sampleHeight(x: number, z: number): number {
    let h = 0;
    for (const t of this.tiles) {
      const u = ((x - t.origin[0]) / t.size) * t.etaGridN - 0.5, v = ((z - t.origin[1]) / t.size) * t.etaGridN - 0.5;
      if (u < 0 || v < 0 || u >= t.etaGridN - 1 || v >= t.etaGridN - 1) continue;
      const x0 = Math.floor(u), z0 = Math.floor(v), fx = u - x0, fz = v - z0;
      const N = t.etaGridN, g = t.etaGrid;
      const at = (i: number, j: number) => g[(j * N + i) * 4];
      const e = (at(x0, z0) * (1 - fx) + at(x0 + 1, z0) * fx) * (1 - fz) + (at(x0, z0 + 1) * (1 - fx) + at(x0 + 1, z0 + 1) * fx) * fz;
      // Edge feather matches the render-side tile weight.
      const eu = Math.min(u, N - 1 - u) / N, ev = Math.min(v, N - 1 - v) / N;
      const wgt = Math.min(1, Math.min(eu, ev) / 0.12) * t.fade;
      h += e * wgt;
    }
    return h;
  }

  retire(t: InteractionTile) {
    t.retiring = true;
  }

  private free(t: InteractionTile) {
    for (const pp of [t.state, t.aux, t.release]) pp.dispose();
    t.spec.forEach((s) => s.dispose());
    t.output.dispose();
    t.reduceRel.dispose();
    t.reduceEta.dispose();
    t.readRel.dispose();
    t.readEta.dispose();
    this.tiles.splice(this.tiles.indexOf(t), 1);
  }

  /** Bindings for the surface renderer. */
  bindings() {
    return this.tiles
      .filter((t) => t.fade > 0.001)
      .map((t) => ({ rect: [t.origin[0], t.origin[1], t.size, t.layer] as [number, number, number, number] }));
  }

  dispose() {
    [...this.tiles].forEach((t) => this.free(t));
    this.impactsTarget.dispose();
    this.gl.deleteTexture(this.zeroTex);
    this.gl.deleteTexture(this.outputArray);
  }
}
