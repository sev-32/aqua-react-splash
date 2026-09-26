/**
 * Splash renderer for the T4 MLS-MPM splash (sim/oceanMpm.ts, evolved from the
 * pool's solver). The pool drew its splash as a metaball surface with the same
 * water shader as the pool plus connectivity tendrils; here the same idea runs
 * on the GPU: every particle and ligament sample is splatted as a sphere into a
 * screen-space depth + thickness buffer, smoothed bilaterally into one water
 * surface and shaded with the sea's optics (Fresnel sky reflection, refraction
 * of what lies behind, Beer absorption through the sheet, aeration to white).
 * Fine spray (foam-flagged, fast) additionally renders as soft lit points.
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, type GL } from '../gl/context';
import type { Vec3 } from '../math/mat4';
import { FLAG_ALIVE, FLAG_FOAM, type MpmParticles } from './oceanMpm';
import type { SplashConnectivity } from './splashConnectivity';
import {
  SPLASH_POINT_VS, SPLASH_POINT_FS, FLUID_DEPTH_FS, FLUID_THICK_FS, FLUID_BLUR_FS, FLUID_SHADE_FS, FLUID_GBLUR_FS,
  SPLASH_OSM_VS, SPLASH_OSM_FS,
} from './splashShaders';

export interface SplashDrawFrame {
  viewProj: Float32Array;
  invViewProj: Float32Array;
  cam: Vec3;
  viewportH: number;
  projY: number;
  sunDir: Vec3; sunE: Vec3; skyE: Vec3;
  env: WebGLTexture; envLevels: number;
  absorb: Vec3;
  fogDensity: number;
  haze: Vec3;
  /** The sea's inherent optical properties, so the sheet is the same water. */
  scatter: Vec3;
  backscatter: Vec3;
  ior: number;
  hdr: Target;
  /** Sea G-buffer positions (camera-relative) for soft contact, if the sea was drawn. */
  seaPos?: WebGLTexture | null;                 // frame colour + depth texture
  mode: 'fluid' | 'points';
}

const W = 256;
/** Self-shadow map resolution (texels across the splash's extent seen from the sun). */
const OSM_N = 128;

export class SplashSystem {
  readonly capacity: number;
  readonly H: number;
  private tex: WebGLTexture[];
  private count = 0;
  private quad: Quad;
  private pPoints: Program; private pDepth: Program; private pThick: Program;
  private pBlur: Program; private pShade: Program; private pGBlur: Program;
  private vao: WebGLVertexArrayObject;
  private fluid: { w: number; h: number; depth: Target; thick: Target; blur: Target; scene: Target } | null = null;
  private P: Float32Array; private V: Float32Array; private M: Float32Array;
  private pOsm: Program;
  private osm: Target;
  /** World bounds of the live splash (for the sun's view of it). */
  private bounds: { min: Vec3; max: Vec3 } | null = null;

  constructor(private gl: GL, capacity: number) {
    this.H = Math.max(1, Math.ceil(capacity / W));
    this.capacity = W * this.H;
    this.tex = [0, 1, 2].map(() => createTexture(gl, W, this.H, FMT.rgba32f(gl)));
    this.P = new Float32Array(this.capacity * 4);
    this.V = new Float32Array(this.capacity * 4);
    this.M = new Float32Array(this.capacity * 4);
    this.quad = new Quad(gl);
    this.pPoints = new Program(gl, 'splash.points', SPLASH_POINT_VS, SPLASH_POINT_FS);
    this.pDepth = new Program(gl, 'splash.fluidDepth', SPLASH_POINT_VS, FLUID_DEPTH_FS);
    this.pThick = new Program(gl, 'splash.fluidThick', SPLASH_POINT_VS, FLUID_THICK_FS);
    this.pBlur = new Program(gl, 'splash.fluidBlur', FULLSCREEN_VS, FLUID_BLUR_FS);
    this.pShade = new Program(gl, 'splash.fluidShade', FULLSCREEN_VS, FLUID_SHADE_FS);
    this.pGBlur = new Program(gl, 'splash.fluidGBlur', FULLSCREEN_VS, FLUID_GBLUR_FS);
    this.pOsm = new Program(gl, 'splash.osm', SPLASH_OSM_VS, SPLASH_OSM_FS);
    this.osm = new Target(gl, OSM_N, OSM_N, [createTexture(gl, OSM_N, OSM_N, { ...FMT.rgba16f(gl), filter: gl.LINEAR })]);
    this.vao = gl.createVertexArray()!;
  }

  get live() {
    return this.count;
  }

  /**
   * Pack live particles (+ ligament samples, as in the pool's tendrils) for the GPU.
   * P: position, 1 · V: velocity, droplet radius (spray < 1.2 mm) · M: volume, age, kind, seed.
   */
  upload(Pp: MpmParticles, bonds: SplashConnectivity | null) {
    const { P, V, M } = this;
    let n = 0;
    const put = (x: number, y: number, z: number, vx: number, vy: number, vz: number, rd: number, vol: number, age: number, kind: number, seed: number) => {
      if (n >= this.capacity) return;
      const o = n * 4;
      P[o] = x; P[o + 1] = y; P[o + 2] = z; P[o + 3] = 1;
      V[o] = vx; V[o + 1] = vy; V[o + 2] = vz; V[o + 3] = rd;
      M[o] = vol; M[o + 1] = age; M[o + 2] = kind; M[o + 3] = seed;
      n++;
    };
    for (let i = 0; i < Pp.count; i++) {
      const f = Pp.flags[i];
      if (!(f & FLAG_ALIVE)) continue;
      const fast = Math.hypot(Pp.vx[i], Pp.vy[i], Pp.vz[i]) > 6;
      const rd = f & FLAG_FOAM ? (fast ? 6e-4 : 9e-4) : 3e-3;
      // kind > 0: connectivity, half the neighbour count (sheets and jets stay whole, isolated
      // drops shrink); kind < 0: ligament.
      put(Pp.px[i], Pp.py[i], Pp.pz[i], Pp.vx[i], Pp.vy[i], Pp.vz[i], rd, Pp.vol[i], Pp.life[i], Math.max(0.05, Pp.neighbors[i] / 2), Pp.seed[i]);
    }
    if (bonds) {
      const { samples, thinPower } = bonds.p;
      for (const c of bonds.bonds.values()) {
        const stretch = Math.max(0, Math.min(1, (c.distance - bonds.p.form) / Math.max(1e-5, bonds.p.break - bonds.p.form)));
        const m = Math.max(1, Math.round(samples * (1 + stretch)));
        const va = Pp.vol[c.a], vb = Pp.vol[c.b];
        for (let s = 1; s <= m; s++) {
          const t = s / (m + 1);
          const waist = Math.pow(Math.sin(Math.PI * t), thinPower) * (0.25 + 0.55 * c.strength);
          const lerp = (a: number, b: number) => a + (b - a) * t;
          put(lerp(Pp.px[c.a], Pp.px[c.b]), lerp(Pp.py[c.a], Pp.py[c.b]), lerp(Pp.pz[c.a], Pp.pz[c.b]),
            lerp(Pp.vx[c.a], Pp.vx[c.b]), lerp(Pp.vy[c.a], Pp.vy[c.b]), lerp(Pp.vz[c.a], Pp.vz[c.b]),
            3e-3, Math.min(va, vb) * waist * waist * waist, Math.min(Pp.life[c.a], Pp.life[c.b]), -1, 0.5);
        }
      }
    }
    this.count = n;
    this.bounds = null;
    if (!n) return;
    const mn: Vec3 = [Infinity, Infinity, Infinity], mx: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) {
      const v = P[i * 4 + c];
      if (v < mn[c]) mn[c] = v;
      if (v > mx[c]) mx[c] = v;
    }
    this.bounds = { min: mn, max: mx };
    const gl = this.gl;
    const rows = Math.ceil(n / W);
    P.fill(0, n * 4, rows * W * 4);   // the tail of the last row never draws (P.w = 0)
    for (const [t, src] of [[this.tex[0], P], [this.tex[1], V], [this.tex[2], M]] as const) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, rows, gl.RGBA, gl.FLOAT, src.subarray(0, rows * W * 4));
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * The splash seen from the sun: an orthographic frame around its bounds (+ a parcel's reach)
   * into which every scattering parcel splats its optical depth, four cumulative slices deep.
   */
  private drawOsm(f: SplashDrawFrame) {
    const b = this.bounds;
    if (!b) return null;
    const gl = this.gl;
    const d = f.sunDir;
    const up: Vec3 = Math.abs(d[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    const cross = (a: Vec3, c: Vec3): Vec3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
    const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const u = norm(cross(up, d)), v = cross(d, u);
    const c: Vec3 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
    let h = 0, d0 = Infinity, d1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      const q: Vec3 = [(k & 1 ? b.max[0] : b.min[0]) - c[0], (k & 2 ? b.max[1] : b.min[1]) - c[1], (k & 4 ? b.max[2] : b.min[2]) - c[2]];
      const dot = (a: Vec3) => a[0] * q[0] + a[1] * q[1] + a[2] * q[2];
      h = Math.max(h, Math.abs(dot(u)), Math.abs(dot(v)));
      d0 = Math.min(d0, dot(d)); d1 = Math.max(d1, dot(d));
    }
    const ext = [h + 1.5, 0, d0 - 1, d1 + 1];
    this.osm.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.pOsm.use().set('uW', W).tex('uP', this.tex[0]).tex('uV', this.tex[1]).tex('uM', this.tex[2])
      .set('uOsmC', c).set('uOsmU', u).set('uOsmV', v).set('uOsmD', d).set('uOsmExt', ext).set('uOsmSize', OSM_N);
    gl.drawArrays(gl.POINTS, 0, this.count);
    gl.disable(gl.BLEND);
    return { c, u, v, d, ext };
  }

  private setOsm(p: Program, o: ReturnType<SplashSystem['drawOsm']>) {
    if (o) p.tex('uOsm', this.osm.texture).set('uHasOsm', 1).set('uOsmC', o.c).set('uOsmU', o.u).set('uOsmV', o.v).set('uOsmD', o.d).set('uOsmExt', o.ext);
    else p.tex('uOsm', this.osm.texture).set('uHasOsm', 0);
  }

  private setPointUniforms(p: Program, f: SplashDrawFrame, sizeGain: number, sheetOnly = 0) {
    p.set('uW', W).set('uViewProj', f.viewProj).set('uCam', f.cam).set('uViewportH', f.viewportH).set('uProjY', f.projY)
      .set('uSizeGain', sizeGain).set('uSheetOnly', sheetOnly).tex('uP', this.tex[0]).tex('uV', this.tex[1]).tex('uM', this.tex[2]);
  }

  private ensureFluid(w: number, h: number) {
    if (this.fluid && this.fluid.w === w && this.fluid.h === h) return this.fluid;
    const gl = this.gl;
    if (this.fluid) for (const t of [this.fluid.depth, this.fluid.thick, this.fluid.blur, this.fluid.scene]) t.dispose();
    const t16 = () => createTexture(gl, w, h, { ...FMT.rgba16f(gl), filter: gl.LINEAR });
    this.fluid = { w, h, depth: new Target(gl, w, h, [t16()]), thick: new Target(gl, w, h, [t16()]), blur: new Target(gl, w, h, [t16()]), scene: new Target(gl, w, h, [t16()]) };
    return this.fluid;
  }

  /** Draw the airborne water into the HDR frame (after the sea). */
  draw(f: SplashDrawFrame) {
    if (!this.count) return;
    const gl = this.gl;
    const count = this.count;
    gl.bindVertexArray(this.vao);
    const osm = this.drawOsm(f);
    if (f.mode === 'fluid' && f.hdr.depth) {
      // Full resolution: a crown is thin sheets and droplets, and half-res blocks read as
      // pixel art at splash scale. Occlusion by hand against the scene depth.
      const W2 = f.hdr.width, H2 = f.hdr.height;
      const w = W2, h = H2;
      // Blur σ ≈ 7 px: about a parcel's screen radius at splash distances. Wider flattened the
      // curvature of crown walls, turning their normals to face the camera (no Fresnel sheen).
      const bs = 1;
      const fl = this.ensureFluid(w, h);
      // Scene behind the splash (sea included) for refraction.
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, f.hdr.fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fl.scene.fbo);
      gl.blitFramebuffer(0, 0, W2, H2, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.LINEAR);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      const occ = (p: Program) => p.tex('uSceneDepth', f.hdr.depth as WebGLTexture).set('uInvViewProj', f.invViewProj).set('uHalfSize', [w, h]);
      fl.depth.bind();
      gl.clearColor(6e4, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendEquation(gl.MIN);
      const pd = this.pDepth.use();
      this.setPointUniforms(pd, { ...f, viewportH: h }, 1.6, 1);
      this.setOsm(pd, null);
      pd.set('uSprayOnly', 0);
      occ(pd);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.blendEquation(gl.FUNC_ADD);
      fl.thick.bind();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE);
      const pt = this.pThick.use();
      this.setPointUniforms(pt, { ...f, viewportH: h }, 1.6, 1);
      this.setOsm(pt, null);
      pt.set('uSprayOnly', 0).set('uThickGain', 1);
      occ(pt);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disable(gl.BLEND);
      // Bilateral depth smoothing (separable) → sheet surface; thickness smoothed too.
      const pb = this.pBlur.use();
      pb.set('uDir', [bs / w, 0]).tex('uSrc', fl.depth.texture);
      fl.blur.bind(); this.quad.draw();
      pb.set('uDir', [0, bs / h]).tex('uSrc', fl.blur.texture);
      fl.depth.bind(); this.quad.draw();
      const pg = this.pGBlur.use();
      pg.set('uDir', [bs / w, 0]).tex('uSrc', fl.thick.texture);
      fl.blur.bind(); this.quad.draw();
      pg.set('uDir', [0, bs / h]).tex('uSrc', fl.blur.texture);
      fl.thick.bind(); this.quad.draw();
      // Shade and composite over the frame (full resolution, depth-tested against the sea).
      f.hdr.bind();
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.pShade.use().tex('uDepth', fl.depth.texture).tex('uThick', fl.thick.texture).tex('uScene', fl.scene.texture)
        .tex('uEnv', f.env).set('uEnvLevels', f.envLevels).set('uInvViewProj', f.invViewProj).set('uTexel', [1 / w, 1 / h])
        .set('uSunDir', f.sunDir).set('uSunE', f.sunE).set('uSkyE', f.skyE).set('uAbsorb', f.absorb)
        .set('uScatter', f.scatter).set('uBackscatter', f.backscatter).set('uIor', f.ior)
        .set('uHasSea', f.seaPos ? 1 : 0).tex('uSeaPos', f.seaPos ?? fl.depth.texture).set('uCamW', f.cam);
      this.setOsm(this.pShade, osm);
      this.quad.draw();
    }
    // Fine spray and mist as soft lit parcels (also the whole splash in points mode).
    f.hdr.bind();
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const pp = this.pPoints.use();
    const fluid = f.mode === 'fluid';
    this.setPointUniforms(pp, f, fluid ? 0.32 : 0.9);
    this.setOsm(pp, osm);
    pp.set('uSunDir', f.sunDir).set('uSunE', f.sunE).set('uSkyE', f.skyE).set('uFogDensity', f.fogDensity)
      .set('uHaze', f.haze).set('uOpacity', fluid ? 0.3 : 0.75).set('uSprayOnly', fluid ? 1 : 0);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    this.tex.forEach((t) => gl.deleteTexture(t));
    if (this.fluid) for (const t of [this.fluid.depth, this.fluid.thick, this.fluid.blur, this.fluid.scene]) t.dispose();
    [this.pPoints, this.pDepth, this.pThick, this.pBlur, this.pShade, this.pGBlur, this.pOsm].forEach((p) => p.dispose());
    this.osm.dispose();
    gl.deleteVertexArray(this.vao);
  }
}
