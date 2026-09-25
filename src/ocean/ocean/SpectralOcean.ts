/**
 * SpectralOcean — tier T0 (offshore identity).
 *
 * Per frame: evolve all cascade spectra (1 MRT pass), inverse-FFT them in one
 * atlas (2·log2N MRT passes), resolve each cascade into mipmapped displacement
 * and derivative textures, then advance cascade-space whitecap foam.
 *
 * On sea-state change: regenerate h0 on the GPU, rebuild the slope-variance
 * LUT (CPU polar integral) and the CPU spectral mirror (deterministic twin).
 */
import { Program, Target, LayerTarget, Quad, FULLSCREEN_VS, createTexture, createTextureArray, FMT, type GL, type GLCaps } from '../gl/context';
import { H0_FS, EVOLVE_FS, FFT_FS, RESOLVE_FS, FOAM_FS, MAX_SYSTEMS, MAX_CASCADES } from './spectrumShaders';
import {
  makeLayout, generateNoiseAtlas, spreadingNormLUT, makeSpectrumModel, computeSpectralStats,
  SPREAD_LUT_SIZE, SLOPE_LUT_SIZE, type CascadeLayout, type SpectralStats, type SpectrumModel,
} from '../spectrum/cascades';
import { prepareSystem, type WaveSystem } from '../spectrum/physics';
import { SEA_STATES, adjustSystems, seaStateBracket, type SeaStateControls } from '../spectrum/seaStates';
import { SpectralMirror } from '../spectrum/mirror';

export interface SpectralOceanOptions {
  n: number;
  sizes: number[];
  seed: number;
  mirrorSize: number;
  highPrecision?: boolean;
}

export interface FoamParams {
  foldStart: number;
  foldFull: number;
  birth: number;
  life: number;
  airLife: number;
  spread: number;
  /** Multiplier on the Monahan whitecap-coverage target (1 = observed ocean). */
  coverage: number;
  /** Closed-loop calibration of fold thresholds to the coverage target. */
  calibrate: boolean;
}

/** Monahan & O'Muircheartaigh (1980): whitecap fraction W = 3.84e-6 · U10^3.41. */
export const monahanCoverage = (u10: number) => Math.min(3.84e-6 * Math.pow(Math.max(u10, 0), 3.41), 0.6);

export class SpectralOcean {
  readonly layout: CascadeLayout;
  readonly cascades: number;
  readonly mirror: SpectralMirror;
  readonly seed: number;

  // GPU resources
  private quad: Quad;
  private progH0: Program; private progEvolve: Program; private progFft: Program;
  private progResolve: Program; private progFoam: Program;
  private noiseTex: WebGLTexture; private spreadLutTex: WebGLTexture;
  private h0: Target;
  private work: [Target, Target];
  /** Cascade products as texture arrays (layer = cascade) — 3 sampler units total. */
  readonly dispArray: WebGLTexture;   // (λDx, h, λDz, λDxz)
  readonly derivArray: WebGLTexture;  // (Sx, Sz, λDxx, λDzz)
  private foamArrays: [WebGLTexture, WebGLTexture];
  private resolveTargets: LayerTarget[] = [];
  private foamTargets: [LayerTarget, LayerTarget][] = [];
  private foamPing = 0;
  private probeArray: WebGLTexture | null = null;
  private probeTargets: LayerTarget[] = [];
  slopeLutTex: WebGLTexture;

  // State
  stats: SpectralStats | null = null;
  model: SpectrumModel | null = null;
  choppiness = 1;
  depth = 1500;
  loopPeriod = 0;
  wind = { speed: 9, directionDeg: 38 };
  whitecaps = 0.5;
  /** Energy-weighted mean propagation direction of the sea (drives the shore wave-maker). */
  meanWaveDirDeg = 20;
  foam: FoamParams = { foldStart: 0.5, foldFull: 1.0, birth: 3, life: 7, airLife: 1.4, spread: 0.6, coverage: 1, calibrate: true };
  generation = 0;
  /** Per-cascade fold-threshold offsets driven by the Monahan controller. */
  foldOffset: number[] = [];
  /** Measured whitecap coverage per cascade (from 1×1 foam mips). */
  measuredCoverage: number[] = [];
  targetCoverage = 0;
  private lastCalib = 0;
  private readFbo: WebGLFramebuffer | null = null;

  constructor(private gl: GL, private caps: GLCaps, opts: SpectralOceanOptions) {
    const n = opts.n;
    this.seed = opts.seed;
    this.layout = makeLayout(n, opts.sizes);
    this.cascades = opts.sizes.length;
    if (this.cascades > MAX_CASCADES) throw new Error(`at most ${MAX_CASCADES} cascades`);
    this.mirror = new SpectralMirror(opts.mirrorSize);
    this.quad = new Quad(gl);

    this.progH0 = new Program(gl, 'ocean.h0', FULLSCREEN_VS, H0_FS);
    this.progEvolve = new Program(gl, 'ocean.evolve', FULLSCREEN_VS, EVOLVE_FS);
    this.progFft = new Program(gl, 'ocean.fft', FULLSCREEN_VS, FFT_FS);
    this.progResolve = new Program(gl, 'ocean.resolve', FULLSCREEN_VS, RESOLVE_FS);
    this.progFoam = new Program(gl, 'ocean.foam', FULLSCREEN_VS, FOAM_FS);

    const W = n * this.cascades;
    this.noiseTex = createTexture(gl, W, n, { ...FMT.rg32f(gl), data: generateNoiseAtlas(opts.seed, this.layout) });
    this.spreadLutTex = createTexture(gl, SPREAD_LUT_SIZE, 1, { ...FMT.r32f(gl), data: spreadingNormLUT() });
    this.slopeLutTex = createTexture(gl, SLOPE_LUT_SIZE, 1, { ...FMT.rgba32f(gl), data: new Float32Array(SLOPE_LUT_SIZE * 4) });

    const f32 = FMT.rgba32f(gl);
    this.h0 = new Target(gl, W, n, [createTexture(gl, W, n, f32)]);
    const mkWork = () => new Target(gl, W, n, [createTexture(gl, W, n, f32), createTexture(gl, W, n, f32)]);
    this.work = [mkWork(), mkWork()];

    const outFmt = opts.highPrecision && caps.floatLinear ? FMT.rgba32f(gl) : FMT.rgba16f(gl);
    const C = this.cascades;
    const arr = (fmt: typeof outFmt) => createTextureArray(gl, n, n, C, { ...fmt, filter: gl.LINEAR, wrap: gl.REPEAT, mips: true });
    this.dispArray = arr(outFmt);
    this.derivArray = arr(outFmt);
    this.foamArrays = [arr(FMT.rgba16f(gl)), arr(FMT.rgba16f(gl))];
    const aniso = caps.anisotropic;
    if (aniso) {
      for (const t of [this.dispArray, this.derivArray, ...this.foamArrays]) {
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
        gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, caps.maxAniso));
      }
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    }
    for (let c = 0; c < C; c++) {
      this.resolveTargets.push(new LayerTarget(gl, n, n, [{ tex: this.dispArray, layer: c }, { tex: this.derivArray, layer: c }]));
      this.foamTargets.push([
        new LayerTarget(gl, n, n, [{ tex: this.foamArrays[0], layer: c }]),
        new LayerTarget(gl, n, n, [{ tex: this.foamArrays[1], layer: c }]),
      ]);
    }
    this.clearFoam();
    this.foldOffset = opts.sizes.map(() => 0);
    this.measuredCoverage = opts.sizes.map(() => 0);
  }

  /** Share of the whitecap target each cascade is asked to carry. */
  private coverageShare(c: number) {
    if (this.cascades === 1) return 1;
    if (c === 0) return 0.02;
    if (c === 1) return 0.78;
    return 0.2 / Math.max(this.cascades - 2, 1);
  }

  /**
   * Closed-loop whitecap calibration: read each foam texture's 1×1 mip (mean
   * coverage), compare to Monahan's law for the current wind, and move the fold
   * threshold in log space. Bounded so a cascade that cannot fold (long swell)
   * never foams on mere compression.
   */
  private calibrateFoam(time: number) {
    if (!this.foam.calibrate || time - this.lastCalib < 0.35) return;
    this.lastCalib = time;
    const gl = this.gl;
    const top = Math.log2(this.layout.n);
    if (!this.readFbo) this.readFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFbo);
    const px = new Float32Array(4);
    this.targetCoverage = monahanCoverage(this.wind.speed) * this.foam.coverage;
    for (let c = 0; c < this.cascades; c++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.foamArray, top, c);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, px);
      const measured = px[3];
      this.measuredCoverage[c] = measured;
      const target = this.targetCoverage * this.coverageShare(c);
      const e = Math.log((measured + 2e-4) / (target + 2e-4));
      this.foldOffset[c] = Math.min(Math.max(this.foldOffset[c] + 0.12 * Math.max(-1, Math.min(1, e)), -0.3), 1.6);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  get n() {
    return this.layout.n;
  }

  /** Current whitecap foam array (layer = cascade): (mass, mass·age, air, coverage). */
  get foamArray() {
    return this.foamArrays[this.foamPing];
  }

  /** Apply a sea state (library morph + user controls). Returns true when the spectrum changed. */
  setSea(controls: SeaStateControls, opts: { loopPeriod?: number; rebuildStats?: boolean } = {}) {
    const { a, b, t } = seaStateBracket(controls.morph);
    const sysA = adjustSystems(a, controls);
    const sysB = adjustSystems(b, controls);
    this.depth = controls.depth;
    this.loopPeriod = opts.loopPeriod ?? this.loopPeriod;
    this.choppiness = (a.choppiness + (b.choppiness - a.choppiness) * t) * controls.choppiness;
    const lerpAng = (x: number, y: number) => x + ((((y - x + 540) % 360) - 180) * t);
    this.wind = {
      speed: a.wind.speed + (b.wind.speed - a.wind.speed) * t,
      directionDeg: lerpAng(a.wind.directionDeg, b.wind.directionDeg) + controls.directionOffsetDeg,
    };
    this.wind.speed *= Math.sqrt(Math.max(controls.energy * controls.windSea, 0.01));
    this.whitecaps = (a.whitecaps + (b.whitecaps - a.whitecaps) * t) * Math.max(controls.windSea, 0);
    this.model = makeSpectrumModel(sysA, sysB, t, this.depth);
    // Circular mean of system directions weighted by each system's variance m0 ≈ αg²/(5ωp⁴).
    let sx = 0, sz = 0;
    const acc = (list: typeof this.model.a, w: number) => list.forEach((e) => {
      const m0 = (e.alphaG2 / (5 * Math.pow(e.wp, 4))) * w;
      sx += Math.cos(e.dirRad) * m0; sz += Math.sin(e.dirRad) * m0;
    });
    acc(this.model.a, 1 - t);
    acc(this.model.b, t);
    this.meanWaveDirDeg = (Math.atan2(sz, sx) * 180) / Math.PI;
    this.generateH0(sysA, sysB, t);
    if (opts.rebuildStats !== false) this.rebuildCpuProducts();
    this.generation++;
  }

  /** Slope LUT + mirror. Separated so the UI can debounce the CPU work while dragging sliders. */
  rebuildCpuProducts() {
    if (!this.model) return;
    const gl = this.gl;
    this.stats = computeSpectralStats(this.model, this.layout, this.wind);
    gl.bindTexture(gl.TEXTURE_2D, this.slopeLutTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SLOPE_LUT_SIZE, 1, gl.RGBA, gl.FLOAT, this.stats.slopeLut);
    this.mirror.rebuild(this.model, this.layout, this.seed, this.layout.sizes.map(() => this.choppiness), this.loopPeriod);
  }

  private generateH0(sysA: WaveSystem[], sysB: WaveSystem[], t: number) {
    const gl = this.gl;
    const all: { s: WaveSystem; w: number }[] = [];
    if (t < 1) sysA.forEach((s) => all.push({ s, w: 1 - t }));
    if (t > 0) sysB.forEach((s) => all.push({ s, w: t }));
    const used = all.slice(0, MAX_SYSTEMS);
    const s0 = new Float32Array(MAX_SYSTEMS * 4), s1 = new Float32Array(MAX_SYSTEMS * 4), s2 = new Float32Array(MAX_SYSTEMS * 4);
    used.forEach(({ s, w }, i) => {
      const e = prepareSystem(s);
      s0.set([e.alphaG2 * w, e.wp, e.gamma, e.dirRad], i * 4);
      s1.set([e.spread, e.elongation, e.floor, e.kind === 'wind' ? 1 : 0], i * 4);
      s2.set([e.u10, 0, 0, 0], i * 4);
    });
    const p = this.progH0.use();
    this.setAtlasUniforms(p);
    p.set('uDepth', this.depth).set('uSysCount', used.length).set('uSys0', s0).set('uSys1', s1).set('uSys2', s2);
    p.tex('uNoise', this.noiseTex).tex('uSpreadLut', this.spreadLutTex);
    this.h0.bind();
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    this.quad.draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private setAtlasUniforms(p: Program) {
    const sizes = new Float32Array(MAX_CASCADES), lo = new Float32Array(MAX_CASCADES), hi = new Float32Array(MAX_CASCADES);
    this.layout.sizes.forEach((L, c) => {
      sizes[c] = L;
      lo[c] = this.layout.kLo[c];
      hi[c] = Number.isFinite(this.layout.kHi[c]) ? this.layout.kHi[c] : 1e9;
    });
    p.set('uN', this.layout.n).set('uSizes', sizes).set('uKLo', lo).set('uKHi', hi);
  }

  /** Evolve + inverse-FFT all cascades at absolute time t into the work atlas; returns the index holding the result. */
  private synthesize(time: number): number {
    const gl = this.gl;
    const n = this.layout.n;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    // 1. Evolve spectra into work[0].
    const pe = this.progEvolve.use();
    this.setAtlasUniforms(pe);
    pe.set('uTime', time).set('uDepth', this.depth).set('uLoopPeriod', this.loopPeriod).tex('uH0', this.h0.texture);
    this.work[0].bind();
    this.quad.draw();

    // 2. Inverse FFT, horizontal then vertical.
    const pf = this.progFft.use();
    pf.set('uN', n).set('uSign', 1);
    let src = 0;
    for (const horizontal of [1, 0]) {
      pf.set('uHorizontal', horizontal);
      for (let s = 2; s <= n; s <<= 1) {
        const dst = 1 - src;
        pf.set('uStage', s).tex('uSrcA', this.work[src].textures[0]).tex('uSrcB', this.work[src].textures[1]);
        this.work[dst].bind();
        this.quad.draw();
        src = dst;
      }
    }
    return src;
  }

  /**
   * Displacement at an arbitrary time into a scratch array (no derivatives,
   * foam or mips). JIT tiles spinning up on their own lagging clock read this,
   * so their wave-maker sees a moving sea instead of one frozen frame.
   */
  evaluateAt(time: number): WebGLTexture {
    const gl = this.gl;
    const n = this.layout.n;
    if (!this.probeArray) {
      this.probeArray = createTextureArray(gl, n, n, this.cascades, { ...FMT.rgba32f(gl), filter: this.caps.floatLinear ? gl.LINEAR : gl.NEAREST, wrap: gl.REPEAT });
      for (let c = 0; c < this.cascades; c++) this.probeTargets.push(new LayerTarget(gl, n, n, [{ tex: this.probeArray, layer: c }]));
    }
    const src = this.synthesize(time);
    const pr = this.progResolve.use();
    pr.set('uN', n).set('uChop', this.choppiness)
      .tex('uSrcA', this.work[src].textures[0]).tex('uSrcB', this.work[src].textures[1]);
    for (let c = 0; c < this.cascades; c++) {
      pr.set('uCascade', c);
      this.probeTargets[c].bind();
      this.quad.draw();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this.probeArray;
  }

  /** Advance to absolute time t (seconds). */
  update(time: number, dt: number) {
    const gl = this.gl;
    const n = this.layout.n;
    const src = this.synthesize(time);

    // 3. Resolve each cascade + mips.
    const pr = this.progResolve.use();
    pr.set('uN', n).set('uChop', this.choppiness)
      .tex('uSrcA', this.work[src].textures[0]).tex('uSrcB', this.work[src].textures[1]);
    for (let c = 0; c < this.cascades; c++) {
      pr.set('uCascade', c);
      this.resolveTargets[c].bind();
      this.quad.draw();
    }
    for (const t of [this.dispArray, this.derivArray]) {
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    }

    // 4. Whitecap foam (cascade space).
    const pfm = this.progFoam.use();
    const next = 1 - this.foamPing;
    const f = this.foam;
    const wd = (this.wind.directionDeg * Math.PI) / 180;
    const wdir: [number, number] = [Math.cos(wd), Math.sin(wd)];
    // Surface drift ≈ 3% of U10 (wind drift + Stokes); streaking grows past ~14 m/s (Bft 7).
    const drift = 0.03 * this.wind.speed;
    const streak = Math.min(Math.max((this.wind.speed - 11) / 10, 0), 1);
    for (let c = 0; c < this.cascades; c++) {
      const off = this.foldOffset[c] ?? 0;
      const L = this.layout.sizes[c];
      pfm.set('uDrift', [(wdir[0] * drift) / L, (wdir[1] * drift) / L]).set('uWindDir', wdir).set('uStreak', streak);
      const start = Math.max(f.foldStart + off, 0.25);
      pfm.set('uDt', Math.min(dt, 0.1)).set('uFoldStart', start).set('uFoldFull', start + Math.max(f.foldFull - f.foldStart, 0.05))
        .set('uBirth', f.birth).set('uLife', f.life).set('uAirLife', f.airLife)
        .set('uSpread', f.spread).set('uTexel', 1 / n).set('uLayer', c)
        .tex('uPrev', this.foamArrays[this.foamPing]).tex('uDeriv', this.derivArray).tex('uDisp', this.dispArray);
      this.foamTargets[c][next].bind();
      this.quad.draw();
    }
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.foamArrays[next]);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    this.foamPing = next;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (dt > 0) this.calibrateFoam(time);
  }

  clearFoam() {
    const gl = this.gl;
    for (const pair of this.foamTargets) for (const t of pair) { t.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Current sea-state label for HUDs. */
  label(morph: number) {
    const { a, b, t } = seaStateBracket(morph);
    return t < 0.02 ? a.label : t > 0.98 ? b.label : `${a.label} → ${b.label}`;
  }

  static get library() {
    return SEA_STATES;
  }

  dispose() {
    const gl = this.gl;
    [this.progH0, this.progEvolve, this.progFft, this.progResolve, this.progFoam].forEach((p) => p.dispose());
    this.h0.dispose();
    this.work.forEach((w) => w.dispose());
    this.resolveTargets.forEach((t) => t.dispose());
    this.probeTargets.forEach((t) => t.dispose());
    if (this.probeArray) gl.deleteTexture(this.probeArray);
    this.foamTargets.forEach((p) => p.forEach((t) => t.dispose()));
    [this.dispArray, this.derivArray, ...this.foamArrays].forEach((t) => gl.deleteTexture(t));
    gl.deleteTexture(this.noiseTex);
    gl.deleteTexture(this.spreadLutTex);
    gl.deleteTexture(this.slopeLutTex);
  }
}
