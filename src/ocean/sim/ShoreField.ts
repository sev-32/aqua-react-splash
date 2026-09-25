/**
 * ShoreField — tier T2 (wet/dry, run-up, breaking, overturning lips).
 *
 * A well-balanced, positivity-preserving shallow-water tile over the real
 * bathymetry, driven at its seaward edges by the spectral ocean (wave-maker +
 * absorbing relaxation band). Spin-up happens before the tile is shown
 * (Fable §5.3: ready before time-to-truth-failure), then it cross-fades in.
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, PingPong, type GL } from '../gl/context';
import { AsyncReader } from '../gl/asyncReader';
import { SHORE_INIT_FS, SHORE_STEP_FS, SHORE_BREAK_FS, SHORE_OUTPUT_FS, SHORE_REDUCE_FS, SHORE_DEPOSIT_FS } from './shoreShaders';
import type { World } from '../world/World';
import type { SpectralOcean } from '../ocean/SpectralOcean';
import type { ReleasePatch } from './InteractionTiles';
import { pmod } from '../math/scalar';
import { terrainHeight } from '../world/terrain';

export interface ShoreParams {
  manning: number;
  gammaT: number;       // crest/depth ratio at breaking (WaveLab γ-threshold)
  slopeT: number;       // critical front slope
  curl: number;         // lip strength
  curlThrow: number;
  peakQ: number;
  foamLife: number;
  wetMemory: number;
  relaxWidth: number;
  relaxRate: number;
}

export const DEFAULT_SHORE: ShoreParams = {
  manning: 0.022, gammaT: 0.42, slopeT: Math.tan((26 * Math.PI) / 180), curl: 0.85, curlThrow: 1.15,
  peakQ: 0.22, foamLife: 9, wetMemory: 45, relaxWidth: 36, relaxRate: 2.5,
};

const ETA_GRID = 64;
const REL_GRID = 16;

export class ShoreField {
  readonly n: number;
  readonly dx: number;
  readonly size: number;
  readonly origin: [number, number];
  private quad: Quad;
  private pInit: Program; private pStep: Program; private pBreak: Program; private pOut: Program; private pReduce: Program;
  private pDeposit: Program;
  private deposits: [number, number, number, number][] = [];
  /** Volume returned by the splash ledger (m³). */
  depositedVolume = 0;
  private state: PingPong;
  private stage: Target;      // SSP-RK2 intermediate U¹
  private fields: PingPong;   // MRT 4: brk, lip, foam, rel
  readonly out: Target;       // MRT 3: surf, aux, extra
  private etaTarget: Target; private relTarget: Target;
  private readEta: AsyncReader; private readRel: AsyncReader;
  readonly etaGrid: Float32Array;
  private bedTex: WebGLTexture;
  private openMask = 0;
  private cMax: number;
  fade = 0;
  warm = 0;              // simulated seconds since spawn
  simTime = 0;
  /** The tile's own clock. It starts behind the engine and catches up faster than real time (spin-up). */
  clock: number | null = null;
  retiring = false;
  params: ShoreParams = { ...DEFAULT_SHORE };
  pendingReleases: ReleasePatch[] = [];
  releasedVolume = 0;
  /** Volume ledger (m³) from the η grid: wet volume above the bed. */
  volume = 0;
  boundaryFlux = 0;

  constructor(private gl: GL, world: World, origin: [number, number], size: number, n: number) {
    this.n = n;
    this.size = size;
    this.dx = size / n;
    this.origin = origin;
    this.quad = new Quad(gl);
    this.pInit = new Program(gl, 'shore.init', FULLSCREEN_VS, SHORE_INIT_FS);
    this.pStep = new Program(gl, 'shore.step', FULLSCREEN_VS, SHORE_STEP_FS);
    this.pBreak = new Program(gl, 'shore.break', FULLSCREEN_VS, SHORE_BREAK_FS);
    this.pOut = new Program(gl, 'shore.output', FULLSCREEN_VS, SHORE_OUTPUT_FS);
    this.pReduce = new Program(gl, 'shore.reduce', FULLSCREEN_VS, SHORE_REDUCE_FS);
    this.pDeposit = new Program(gl, 'shore.deposit', FULLSCREEN_VS, SHORE_DEPOSIT_FS);
    const f32 = FMT.rgba32f(gl);
    // Filtered fields in half float (linear filtering is universal); the release accumulator needs full float.
    const lin = { ...FMT.rgba16f(gl), filter: gl.LINEAR };
    this.state = new PingPong(() => new Target(gl, n, n, [createTexture(gl, n, n, f32)]));
    this.stage = new Target(gl, n, n, [createTexture(gl, n, n, f32)]);
    this.fields = new PingPong(() => new Target(gl, n, n, [createTexture(gl, n, n, lin), createTexture(gl, n, n, lin), createTexture(gl, n, n, lin), createTexture(gl, n, n, f32)]));
    const o16 = { ...FMT.rgba16f(gl), filter: gl.LINEAR };
    this.out = new Target(gl, n, n, [createTexture(gl, n, n, o16), createTexture(gl, n, n, o16), createTexture(gl, n, n, o16)]);
    this.etaTarget = new Target(gl, ETA_GRID, ETA_GRID, [createTexture(gl, ETA_GRID, ETA_GRID, f32)]);
    this.relTarget = new Target(gl, REL_GRID, REL_GRID, [createTexture(gl, REL_GRID, REL_GRID, f32)]);
    this.readEta = new AsyncReader(gl, ETA_GRID, ETA_GRID, 1);
    this.readRel = new AsyncReader(gl, REL_GRID, REL_GRID, 1);
    this.etaGrid = new Float32Array(ETA_GRID * ETA_GRID * 4);

    // Bed straight from the terrain function at this tile's resolution.
    const bed = world.bake(origin, size, n);
    this.bedTex = bed.texture;
    for (const t of [this.fields.read, this.fields.write]) { t.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    this.pInit.use().tex('uBed', this.bedTex).set('uLevel', 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    this.state.read.bind();
    this.quad.draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Open (seaward) edges: mean bed below −1 m along the edge.
    const edgeDepth = (pts: [number, number][]) => pts.reduce((a, p) => a + terrainHeight(p[0], p[1], world.params), 0) / pts.length;
    const along = (fn: (t: number) => [number, number]) => Array.from({ length: 24 }, (_, i) => fn((i + 0.5) / 24));
    const [x0, z0] = origin;
    const edges = [
      along((t) => [x0, z0 + t * size]),            // W
      along((t) => [x0 + size, z0 + t * size]),     // E
      along((t) => [x0 + t * size, z0]),            // S
      along((t) => [x0 + t * size, z0 + size]),     // N
    ];
    let bedMin = 0;
    edges.forEach((e, i) => {
      const d = edgeDepth(e);
      if (d < -1) this.openMask |= 1 << i;
      bedMin = Math.min(bedMin, ...e.map((p) => terrainHeight(p[0], p[1], world.params)));
    });
    this.cMax = Math.sqrt(9.81 * (Math.max(-bedMin, 1) + 3)) + 5;
  }

  get openEdges() {
    return this.openMask;
  }

  private cascadeUniforms(p: Program, ocean: SpectralOcean, disp: WebGLTexture) {
    const sizes = new Float32Array(4), offs = new Float32Array(8);
    for (let c = 0; c < ocean.cascades; c++) {
      const L = ocean.layout.sizes[c];
      sizes[c] = L;
      offs[c * 2] = pmod(this.origin[0], L);
      offs[c * 2 + 1] = pmod(this.origin[1], L);
    }
    p.set('uCascadeCount', ocean.cascades).set('uSizes', sizes).set('uCascOffset', offs).tex('uDispArr', disp);
  }

  /** Queue landing splash water (world x, z; footprint r; volume V). Applied on the next step. */
  deposit(x: number, z: number, r: number, V: number) {
    const lx = x - this.origin[0], lz = z - this.origin[1];
    if (lx < 0 || lz < 0 || lx > this.size || lz > this.size) return false;
    this.deposits.push([lx, lz, r, V / (Math.PI * r * r)]);
    this.depositedVolume += V;
    return true;
  }

  private applyDeposits() {
    const gl = this.gl;
    while (this.deposits.length) {
      const batch = this.deposits.splice(0, 16);
      const data = new Float32Array(64);
      batch.forEach((d, i) => data.set(d, i * 4));
      this.pDeposit.use().set('uCount', batch.length).set('uDeposits', data).set('uDx', this.dx).tex('uState', this.state.read.texture);
      this.state.write.bind();
      this.quad.draw();
      this.state.swap();
    }
  }

  /**
   * Advance by dt with CFL substepping. `disp` is the spectral displacement at
   * the END of the step (the live array, or a probe while catching up);
   * `incoming` ramps the wave-maker during spin-up.
   */
  step(ocean: SpectralOcean, dt: number, waveDirDeg: number, incoming = 1, disp: WebGLTexture = ocean.dispArray, release = true) {
    const gl = this.gl;
    if (dt <= 0) return;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    if (this.deposits.length) this.applyDeposits();
    const dtMax = (0.3 * this.dx) / this.cMax;   // CFL 0.3: positivity of the 2-D MUSCL-HR scheme
    const sub = Math.min(Math.ceil(dt / dtMax), 24);
    const h = dt / sub;
    const wd = (waveDirDeg * Math.PI) / 180;
    const p = this.pStep.use();
    p.set('uNx', this.n).set('uNz', this.n).set('uDx', this.dx).set('uDt', h).set('uManning', this.params.manning)
      .set('uOrigin', this.origin).set('uLevel', 0).set('uOpenMask', this.openMask).set('uRelaxWidth', this.params.relaxWidth)
      .set('uRelaxRate', this.params.relaxRate).set('uWaveDir', [Math.cos(wd), Math.sin(wd)]).set('uIncoming', incoming);
    this.cascadeUniforms(p, ocean, disp);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    p.tex('uFoamF', this.fields.read.textures[2]);
    for (let i = 0; i < sub; i++) {
      // SSP-RK2: U¹ = U + dt·L(U), then U² = ½U + ½(U¹ + dt·L(U¹)).
      p.set('uStage', 0).tex('uState', this.state.read.texture).tex('uState0', this.state.read.texture);
      this.stage.bind();
      this.quad.draw();
      p.set('uStage', 1).set('uSink', i === 0 ? 1 : 0).tex('uState', this.stage.texture).tex('uState0', this.state.read.texture);
      this.state.write.bind();
      this.quad.draw();
      this.state.swap();
    }
    this.simTime += dt;
    // Per-frame breaking / lip / foam / release.
    const f = this.fields;
    const P = this.params;
    this.pBreak.use().set('uNx', this.n).set('uNz', this.n).set('uDx', this.dx).set('uDt', dt).set('uLevel', 0)
      .set('uSlopeT', P.slopeT).set('uGammaT', P.gammaT).set('uGrow', 4.2).set('uDecay', 1.4).set('uPlungeT', 1.15)
      .set('uPropK', 0.99).set('uPeel', 0.96).set('uFoamLife', P.foamLife).set('uWetMemory', P.wetMemory)
      .set('uBubSrc', 2.2).set('uBubRise', 0.22).set('uReleaseGain', release ? 1 : 0).set('uWaveDir', [Math.cos(wd), Math.sin(wd)])
      .tex('uState', this.state.read.texture).tex('uBrk', f.read.textures[0]).tex('uLip', f.read.textures[1])
      .tex('uFoam', f.read.textures[2]).tex('uRel', f.read.textures[3]);
    f.write.bind();
    this.quad.draw();
    f.swap();
  }

  /** Output textures + async reductions (call once per frame after step). */
  output() {
    const gl = this.gl;
    const P = this.params;
    this.pOut.use().set('uNx', this.n).set('uNz', this.n).set('uDx', this.dx).set('uLevel', 0).set('uGammaT', P.gammaT)
      .set('uCurl', P.curl).set('uCurlThrow', P.curlThrow).set('uFade', 1).set('uPeakQ', P.peakQ)
      .tex('uState', this.state.read.texture).tex('uBrk', this.fields.read.textures[0]).tex('uLip', this.fields.read.textures[1])
      .tex('uFoam', this.fields.read.textures[2]);
    this.out.bind();
    this.quad.draw();
    this.consume();
    const pr = this.pReduce.use();
    if (!this.readEta.busy) {
      pr.set('uMode', 0).set('uBlock', this.n / ETA_GRID).tex('uState', this.state.read.texture).tex('uRel', this.fields.read.textures[3]);
      this.etaTarget.bind();
      this.quad.draw();
      this.readEta.request(this.etaTarget.fbo);
    }
    if (!this.readRel.busy) {
      pr.set('uMode', 1).set('uBlock', this.n / REL_GRID).tex('uState', this.state.read.texture).tex('uRel', this.fields.read.textures[3]);
      this.relTarget.bind();
      this.quad.draw();
      this.readRel.request(this.relTarget.fbo);
      // Drain the release accumulator (attachment 3 of the current fields).
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fields.read.fbo);
      gl.clearBufferfv(gl.COLOR, 3, [0, 0, 0, 0]);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private consume() {
    if (this.readEta.poll()) {
      this.etaGrid.set(this.readEta.data);
      let v = 0;
      for (let i = 0; i < ETA_GRID * ETA_GRID; i++) v += this.etaGrid[i * 4 + 1];
      this.volume = v * (this.size / ETA_GRID) ** 2;
    }
    if (this.readRel.poll()) {
      const d = this.readRel.data;
      const cell = this.size / REL_GRID;
      for (let j = 0; j < REL_GRID; j++)
        for (let i = 0; i < REL_GRID; i++) {
          const k = (j * REL_GRID + i) * 4;
          const V = d[k];
          if (V <= 1e-5) continue;
          this.releasedVolume += V;
          this.pendingReleases.push({
            volume: V, vx: d[k + 1] / V, vy: d[k + 2] / V, vz: d[k + 3] / V,
            x: this.origin[0] + (i + 0.5) * cell, z: this.origin[1] + (j + 0.5) * cell, y: 0.5, events: 1,
          });
        }
    }
  }

  /** Water surface elevation from the async grid, or null outside / on dry land. */
  sampleEta(x: number, z: number): number | null {
    const u = ((x - this.origin[0]) / this.size) * ETA_GRID - 0.5, v = ((z - this.origin[1]) / this.size) * ETA_GRID - 0.5;
    if (u < 0 || v < 0 || u >= ETA_GRID - 1 || v >= ETA_GRID - 1) return null;
    const i = Math.floor(u), j = Math.floor(v), fx = u - i, fz = v - j;
    const g = this.etaGrid;
    const at = (a: number, b: number, c: number) => g[(b * ETA_GRID + a) * 4 + c];
    const h = (at(i, j, 1) * (1 - fx) + at(i + 1, j, 1) * fx) * (1 - fz) + (at(i, j + 1, 1) * (1 - fx) + at(i + 1, j + 1, 1) * fx) * fz;
    if (h < 0.02) return null;
    return (at(i, j, 0) * (1 - fx) + at(i + 1, j, 0) * fx) * (1 - fz) + (at(i, j + 1, 0) * (1 - fx) + at(i + 1, j + 1, 0) * fx) * fz;
  }

  binding() {
    return {
      rect: [this.origin[0], this.origin[1], this.size] as [number, number, number],
      surf: this.out.textures[0], aux: this.out.textures[1], bed: this.bedTex, extra: this.out.textures[2], fade: this.fade,
    };
  }

  dispose() {
    [this.pInit, this.pStep, this.pBreak, this.pOut, this.pReduce, this.pDeposit].forEach((p) => p.dispose());
    this.state.dispose();
    this.stage.dispose();
    this.fields.dispose();
    this.out.dispose();
    this.etaTarget.dispose();
    this.relTarget.dispose();
    this.readEta.dispose();
    this.readRel.dispose();
    this.gl.deleteTexture(this.bedTex);
  }
}
