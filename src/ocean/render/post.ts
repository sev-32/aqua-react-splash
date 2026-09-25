/**
 * HDR frame, bloom (glitter sparkle and sun bloom), ACES tonemap, dither.
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, type GL } from '../gl/context';

const BRIGHT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform float uThreshold; uniform vec2 uTexel;
void main(){
  vec3 c = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) c += texture(uSrc, vUv + vec2(i, j)*uTexel).rgb;
  c /= 9.0;
  float l = max(max(c.r, c.g), c.b);
  o = vec4(c*max(l - uThreshold, 0.0)/max(l, 1e-4), 1.0);
}`;

const BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uDir;
void main(){
  const float w0 = 0.2270270270, w1 = 0.3162162162, w2 = 0.0702702703;
  vec3 c = texture(uSrc, vUv).rgb*w0;
  c += (texture(uSrc, vUv + uDir*1.3846153846).rgb + texture(uSrc, vUv - uDir*1.3846153846).rgb)*w1;
  c += (texture(uSrc, vUv + uDir*3.2307692308).rgb + texture(uSrc, vUv - uDir*3.2307692308).rgb)*w2;
  o = vec4(c, 1.0);
}`;

const TONEMAP_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uHdr; uniform sampler2D uBloom0; uniform sampler2D uBloom1; uniform sampler2D uBloom2;
uniform float uExposure; uniform float uBloom; uniform float uSaturation; uniform float uTime;
vec3 aces(vec3 x){ return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
void main(){
  vec3 c = texture(uHdr, vUv).rgb;
  vec3 b = texture(uBloom0, vUv).rgb*0.5 + texture(uBloom1, vUv).rgb*0.3 + texture(uBloom2, vUv).rgb*0.2;
  c = (c + b*uBloom)*uExposure;
  c = aces(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  c = pow(c, vec3(1.0/2.2));
  c += (h(gl_FragCoord.xy + fract(uTime)*37.0) - 0.5)/255.0;
  o = vec4(c, 1.0);
}`;

export interface PostParams {
  exposure: number;
  bloom: number;
  bloomThreshold: number;
  saturation: number;
}

export const DEFAULT_POST: PostParams = { exposure: 0.95, bloom: 0.3, bloomThreshold: 4, saturation: 1.02 };

export class Post {
  hdr!: Target;
  private bloom: [Target, Target][] = [];
  private quad: Quad;
  private pBright: Program; private pBlur: Program; private pTone: Program;
  width = 0;
  height = 0;

  constructor(private gl: GL) {
    this.quad = new Quad(gl);
    this.pBright = new Program(gl, 'post.bright', FULLSCREEN_VS, BRIGHT_FS);
    this.pBlur = new Program(gl, 'post.blur', FULLSCREEN_VS, BLUR_FS);
    this.pTone = new Program(gl, 'post.tonemap', FULLSCREEN_VS, TONEMAP_FS);
  }

  resize(w: number, h: number) {
    if (w === this.width && h === this.height && this.hdr) return;
    const gl = this.gl;
    this.width = w;
    this.height = h;
    this.hdr?.dispose();
    this.bloom.forEach((p) => p.forEach((t) => t.dispose()));
    this.hdr = new Target(gl, w, h, [createTexture(gl, w, h, { ...FMT.rgba16f(gl), filter: gl.LINEAR })], 'texture');
    this.bloom = [];
    let bw = Math.max(1, w >> 1), bh = Math.max(1, h >> 1);
    for (let i = 0; i < 3; i++) {
      const mk = () => new Target(gl, bw, bh, [createTexture(gl, bw, bh, { ...FMT.rgba16f(gl), filter: gl.LINEAR })]);
      this.bloom.push([mk(), mk()]);
      bw = Math.max(1, bw >> 1);
      bh = Math.max(1, bh >> 1);
    }
  }

  /** Tonemap the HDR frame into the default framebuffer. */
  present(p: PostParams, time: number) {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    // bloom chain
    let src = this.hdr.texture;
    let sw = this.width, sh = this.height;
    for (let i = 0; i < this.bloom.length; i++) {
      const [a, b] = this.bloom[i];
      this.pBright.use().set('uThreshold', i === 0 ? p.bloomThreshold : 0).set('uTexel', [1 / sw, 1 / sh]).tex('uSrc', src);
      a.bind(); this.quad.draw();
      this.pBlur.use().set('uDir', [1 / a.width, 0]).tex('uSrc', a.texture);
      b.bind(); this.quad.draw();
      this.pBlur.use().set('uDir', [0, 1 / a.height]).tex('uSrc', b.texture);
      a.bind(); this.quad.draw();
      src = a.texture;
      sw = a.width; sh = a.height;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    this.pTone.use().tex('uHdr', this.hdr.texture)
      .tex('uBloom0', this.bloom[0][0].texture).tex('uBloom1', this.bloom[1][0].texture).tex('uBloom2', this.bloom[2][0].texture)
      .set('uExposure', p.exposure).set('uBloom', p.bloom).set('uSaturation', p.saturation).set('uTime', time);
    this.quad.draw();
  }

  dispose() {
    this.hdr?.dispose();
    this.bloom.forEach((p) => p.forEach((t) => t.dispose()));
    [this.pBright, this.pBlur, this.pTone].forEach((p) => p.dispose());
  }
}
