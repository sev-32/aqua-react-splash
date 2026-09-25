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
  /** Sea upwelling reflectance (Gordon R, per channel) so the sheet is the same water. */
  body: Vec3;
  hdr: Target;                 // frame colour + depth texture
  mode: 'fluid' | 'points';
}

const W = 256;

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
    this.vao = gl.createVertexArray()!;
  }

  get live() {
    return this.count;
  }

  /**
   * Pack live particles (+ ligament samples, as in the pool's tendrils) for the GPU.
   * P: position, 1 · V: velocity, droplet radius (spray < 1.2 mm) · M: volume, age, kind, seed.
   */
  upload(Pp: MpmParticles, bonds: SplashConnectivity | null, restDensity = 3) {
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
      // kind > 0: local fluid density / rest (sheets stay thick, isolated drops shrink); kind < 0: ligament.
      put(Pp.px[i], Pp.py[i], Pp.pz[i], Pp.vx[i], Pp.vy[i], Pp.vz[i], rd, Pp.vol[i], Pp.life[i], Math.max(0.05, Pp.density[i] / restDensity), Pp.seed[i]);
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
    if (!n) return;
    const gl = this.gl;
    const rows = Math.ceil(n / W);
    P.fill(0, n * 4, rows * W * 4);   // the tail of the last row never draws (P.w = 0)
    for (const [t, src] of [[this.tex[0], P], [this.tex[1], V], [this.tex[2], M]] as const) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, rows, gl.RGBA, gl.FLOAT, src.subarray(0, rows * W * 4));
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private setPointUniforms(p: Program, f: SplashDrawFrame, sizeGain: number) {
    p.set('uW', W).set('uViewProj', f.viewProj).set('uCam', f.cam).set('uViewportH', f.viewportH).set('uProjY', f.projY)
      .set('uSizeGain', sizeGain).tex('uP', this.tex[0]).tex('uV', this.tex[1]).tex('uM', this.tex[2]);
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
    if (f.mode === 'fluid' && f.hdr.depth) {
      // Half resolution (standard for screen-space fluids); occlusion by hand against scene depth.
      const W2 = f.hdr.width, H2 = f.hdr.height;
      const w = Math.max(1, W2 >> 1), h = Math.max(1, H2 >> 1);
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
      this.setPointUniforms(pd, { ...f, viewportH: h }, 1.6);
      pd.set('uSprayOnly', 0);
      occ(pd);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.blendEquation(gl.FUNC_ADD);
      fl.thick.bind();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE);
      const pt = this.pThick.use();
      this.setPointUniforms(pt, { ...f, viewportH: h }, 1.6);
      pt.set('uSprayOnly', 0).set('uThickGain', 0.35);
      occ(pt);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disable(gl.BLEND);
      // Bilateral depth smoothing (separable) → sheet surface; thickness smoothed too.
      const pb = this.pBlur.use();
      pb.set('uDir', [1 / w, 0]).tex('uSrc', fl.depth.texture);
      fl.blur.bind(); this.quad.draw();
      pb.set('uDir', [0, 1 / h]).tex('uSrc', fl.blur.texture);
      fl.depth.bind(); this.quad.draw();
      const pg = this.pGBlur.use();
      pg.set('uDir', [1 / w, 0]).tex('uSrc', fl.thick.texture);
      fl.blur.bind(); this.quad.draw();
      pg.set('uDir', [0, 1 / h]).tex('uSrc', fl.blur.texture);
      fl.thick.bind(); this.quad.draw();
      // Shade and composite over the frame (full resolution, depth-tested against the sea).
      f.hdr.bind();
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.pShade.use().tex('uDepth', fl.depth.texture).tex('uThick', fl.thick.texture).tex('uScene', fl.scene.texture)
        .tex('uEnv', f.env).set('uEnvLevels', f.envLevels).set('uInvViewProj', f.invViewProj).set('uTexel', [1 / w, 1 / h])
        .set('uSunDir', f.sunDir).set('uSunE', f.sunE).set('uSkyE', f.skyE).set('uAbsorb', f.absorb).set('uBody', f.body);
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
    [this.pPoints, this.pDepth, this.pThick, this.pBlur, this.pShade, this.pGBlur].forEach((p) => p.dispose());
    gl.deleteVertexArray(this.vao);
  }
}
