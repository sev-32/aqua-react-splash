/**
 * Thin WebGL2 layer: programs with reflected uniforms, textures, render
 * targets, ping-pong pairs, fullscreen passes and GPU timers.
 *
 * Deliberately small and explicit — every pass in the engine is visible as a
 * named draw so the pass graph can be profiled and reasoned about.
 */

export type GL = WebGL2RenderingContext;
/** The two enums of EXT_disjoint_timer_query_webgl2 the timers use. */
export interface TimerExt { TIME_ELAPSED_EXT: GLenum; GPU_DISJOINT_EXT: GLenum }

export interface GLCaps {
  floatLinear: boolean;
  anisotropic: EXT_texture_filter_anisotropic | null;
  maxAniso: number;
  timer: TimerExt | null; // EXT_disjoint_timer_query_webgl2
  maxDrawBuffers: number;
  maxSamples: number;
}

export function createGL(canvas: HTMLCanvasElement): { gl: GL; caps: GLCaps } {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: true, // screenshots / capture receipts
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float is required (float render targets).');
  const floatLinear = !!gl.getExtension('OES_texture_float_linear');
  const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
  const caps: GLCaps = {
    floatLinear,
    anisotropic,
    maxAniso: anisotropic ? gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1,
    timer: gl.getExtension('EXT_disjoint_timer_query_webgl2'),
    maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
    maxSamples: gl.getParameter(gl.MAX_SAMPLES),
  };
  return { gl, caps };
}

/* ─────────────────────────────── programs ─────────────────────────────── */

interface UniformInfo {
  loc: WebGLUniformLocation;
  type: number;
  size: number;
  unit: number; // texture unit for samplers, -1 otherwise
}

const SAMPLER_TYPES = new Set<number>([
  0x8b5e, // SAMPLER_2D
  0x8b60, // SAMPLER_CUBE
  0x8dc1, // SAMPLER_2D_ARRAY
  0x8dcf, // INT_SAMPLER_2D_ARRAY
  0x8dd7, // UNSIGNED_INT_SAMPLER_2D_ARRAY
  0x8b5f, // SAMPLER_3D
  0x8dca, // INT_SAMPLER_2D
  0x8dd2, // UNSIGNED_INT_SAMPLER_2D
]);

export class Program {
  readonly handle: WebGLProgram;
  private uniforms = new Map<string, UniformInfo>();
  private warned = new Set<string>();
  samplerUnits = 0;

  constructor(private gl: GL, readonly name: string, vs: string, fs: string) {
    this.handle = linkProgram(gl, name, vs, fs);
    const count = gl.getProgramParameter(this.handle, gl.ACTIVE_UNIFORMS) as number;
    let unit = 0;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(this.handle, i);
      if (!info) continue;
      const base = info.name.replace(/\[0\]$/, '');
      const loc = gl.getUniformLocation(this.handle, info.name);
      if (!loc) continue;
      const isSampler = SAMPLER_TYPES.has(info.type);
      this.uniforms.set(base, { loc, type: info.type, size: info.size, unit: isSampler ? unit : -1 });
      if (isSampler) unit += info.size;
      // Also register individual struct/array elements that GL reports as separate names.
    }
    // WebGL2 only guarantees 16 texture units per stage; flag programs that exceed it
    // (SwiftShader and some desktop drivers allow more, real hardware often does not).
    if (unit > 16) {
      const msg = `[${name}] binds ${unit} sampler units (> 16 portable limit)`;
      console.warn(msg);
      const g = globalThis as unknown as { __THALASSA_SAMPLER_WARNINGS__?: string[] };
      (g.__THALASSA_SAMPLER_WARNINGS__ ??= []).push(msg);
    }
    this.samplerUnits = unit;
    gl.useProgram(this.handle);
    for (const u of this.uniforms.values()) {
      if (u.unit >= 0) {
        if (u.size > 1) gl.uniform1iv(u.loc, Array.from({ length: u.size }, (_, k) => u.unit + k));
        else gl.uniform1i(u.loc, u.unit);
      }
    }
  }

  use(): this {
    this.gl.useProgram(this.handle);
    return this;
  }

  has(name: string) {
    return this.uniforms.has(name);
  }

  /** Bind a texture to a sampler uniform (unit assigned at link time). Array/3D samplers bind to their targets. */
  tex(name: string, texture: WebGLTexture | null, target?: number): this {
    const u = this.uniforms.get(name);
    if (!u) return this;
    const gl = this.gl;
    const t = target ?? (u.type === 0x8dc1 ? gl.TEXTURE_2D_ARRAY : u.type === 0x8b5f ? gl.TEXTURE_3D : gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0 + u.unit);
    gl.bindTexture(t, texture);
    return this;
  }

  /** Bind an array of textures to a sampler array uniform. */
  texArray(name: string, textures: (WebGLTexture | null)[]): this {
    const u = this.uniforms.get(name);
    if (!u) return this;
    const gl = this.gl;
    for (let k = 0; k < Math.min(textures.length, u.size); k++) {
      gl.activeTexture(gl.TEXTURE0 + u.unit + k);
      gl.bindTexture(gl.TEXTURE_2D, textures[k]);
    }
    return this;
  }

  /** Set a uniform; the GL type decides the call. Numbers, arrays and typed arrays accepted. */
  set(name: string, value: number | boolean | ArrayLike<number>): this {
    const u = this.uniforms.get(name);
    if (!u) {
      if (!this.warned.has(name) && (globalThis as unknown as { __THALASSA_DEBUG_UNIFORMS__?: boolean }).__THALASSA_DEBUG_UNIFORMS__) {
        this.warned.add(name);
        console.warn(`[${this.name}] inactive uniform ${name}`);
      }
      return this;
    }
    const gl = this.gl;
    const v = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    switch (u.type) {
      case gl.FLOAT:
        if (typeof v === 'number') gl.uniform1f(u.loc, v);
        else gl.uniform1fv(u.loc, v as Float32List);
        break;
      case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v as Float32List); break;
      case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v as Float32List); break;
      case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v as Float32List); break;
      case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v as Float32List); break;
      case gl.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v as Float32List); break;
      case gl.INT:
      case gl.BOOL:
        if (typeof v === 'number') gl.uniform1i(u.loc, v);
        else gl.uniform1iv(u.loc, v as Int32List);
        break;
      case gl.INT_VEC2: gl.uniform2iv(u.loc, v as Int32List); break;
      case gl.UNSIGNED_INT:
        if (typeof v === 'number') gl.uniform1ui(u.loc, v);
        else gl.uniform1uiv(u.loc, v as Uint32List);
        break;
      default:
        if (typeof v === 'number') gl.uniform1f(u.loc, v);
    }
    return this;
  }

  dispose() {
    this.gl.deleteProgram(this.handle);
  }
}

function compile(gl: GL, type: number, src: string, name: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) || '';
    const numbered = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}: ${l}`).join('\n');
    throw new Error(`[${name}] ${type === gl.VERTEX_SHADER ? 'VS' : 'FS'} compile failed:\n${log}\n${numbered}`);
  }
  return s;
}

function linkProgram(gl: GL, name: string, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  const v = compile(gl, gl.VERTEX_SHADER, vs, name);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs, name);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[${name}] link failed: ${gl.getProgramInfoLog(p)}`);
  gl.deleteShader(v);
  gl.deleteShader(f);
  return p;
}

/* ─────────────────────────────── textures ─────────────────────────────── */

export interface TexOptions {
  internal: number;
  format: number;
  type: number;
  filter?: number;
  minFilter?: number;
  wrap?: number;
  mips?: boolean;
  data?: ArrayBufferView | null;
}

export function createTexture(gl: GL, w: number, h: number, o: TexOptions): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, o.internal, w, h, 0, o.format, o.type, o.data ?? null);
  const mag = o.filter ?? gl.NEAREST;
  const min = o.minFilter ?? (o.mips ? gl.LINEAR_MIPMAP_LINEAR : mag);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, o.wrap ?? gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, o.wrap ?? gl.CLAMP_TO_EDGE);
  if (o.mips) gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}

/** Common formats. */
export const FMT = {
  rgba32f: (gl: GL) => ({ internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT }),
  rgba16f: (gl: GL) => ({ internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT }),
  rg32f: (gl: GL) => ({ internal: gl.RG32F, format: gl.RG, type: gl.FLOAT }),
  rg16f: (gl: GL) => ({ internal: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT }),
  r32f: (gl: GL) => ({ internal: gl.R32F, format: gl.RED, type: gl.FLOAT }),
  r16f: (gl: GL) => ({ internal: gl.R16F, format: gl.RED, type: gl.HALF_FLOAT }),
  rgba8: (gl: GL) => ({ internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE }),
};

/** A framebuffer with one or more colour attachments (MRT) and optional depth. */
export class Target {
  readonly fbo: WebGLFramebuffer;
  readonly textures: WebGLTexture[];
  depth: WebGLTexture | WebGLRenderbuffer | null = null;

  constructor(
    private gl: GL,
    readonly width: number,
    readonly height: number,
    textures: WebGLTexture[],
    depth: 'none' | 'texture' | 'renderbuffer' = 'none',
  ) {
    this.textures = textures;
    this.fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    textures.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    if (textures.length) gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    if (depth === 'texture') {
      const d = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, d);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, width, height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, d, 0);
      this.depth = d;
    } else if (depth === 'renderbuffer') {
      const rb = gl.createRenderbuffer()!;
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, width, height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      this.depth = rb;
    }
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Framebuffer incomplete (0x${status.toString(16)})`);
  }

  get texture() {
    return this.textures[0];
  }

  bind(viewport = true) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    if (viewport) gl.viewport(0, 0, this.width, this.height);
  }

  dispose(deleteTextures = true) {
    const gl = this.gl;
    gl.deleteFramebuffer(this.fbo);
    if (deleteTextures) this.textures.forEach((t) => gl.deleteTexture(t));
    if (this.depth) {
      if (this.depth instanceof WebGLTexture) gl.deleteTexture(this.depth);
      else gl.deleteRenderbuffer(this.depth as WebGLRenderbuffer);
    }
  }
}

/** Two targets with identical layout for iterative passes. */
export class PingPong {
  read: Target;
  write: Target;
  constructor(make: () => Target) {
    this.read = make();
    this.write = make();
  }
  swap() {
    [this.read, this.write] = [this.write, this.read];
  }
  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

/* ─────────────────────────── fullscreen pass ─────────────────────────── */

export const FULLSCREEN_VS = /* glsl */ `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }
`;

export class Quad {
  private vao: WebGLVertexArrayObject;
  constructor(private gl: GL) {
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }
  draw() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}

/* ──────────────────────────────── timers ──────────────────────────────── */

/**
 * Per-pass GPU timing via EXT_disjoint_timer_query_webgl2 (non-nested; each
 * label owns a small ring of queries). Results arrive a few frames late.
 */
export class GpuTimers {
  private pending: { label: string; q: WebGLQuery }[] = [];
  private active: string | null = null;
  readonly ms = new Map<string, number>();
  constructor(private gl: GL, private ext: TimerExt | null) {}

  get enabled() {
    return !!this.ext;
  }

  begin(label: string) {
    if (!this.ext || this.active) return;
    const q = this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.pending.push({ label, q });
    this.active = label;
  }

  end() {
    if (!this.ext || !this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.active = null;
  }

  poll() {
    if (!this.ext) return;
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    const keep: typeof this.pending = [];
    for (const p of this.pending) {
      if (p.label === this.active) { keep.push(p); continue; }
      if (!gl.getQueryParameter(p.q, gl.QUERY_RESULT_AVAILABLE)) { keep.push(p); continue; }
      if (!disjoint) {
        const ns = gl.getQueryParameter(p.q, gl.QUERY_RESULT) as number;
        const prev = this.ms.get(p.label) ?? ns / 1e6;
        this.ms.set(p.label, prev * 0.85 + (ns / 1e6) * 0.15);
      }
      gl.deleteQuery(p.q);
    }
    this.pending = keep.slice(-64);
  }
}

/* ─────────────────────────── texture arrays ─────────────────────────── */

/** 2D texture array (layers share size/format). Used to stay within 16 sampler units. */
export function createTextureArray(gl: GL, w: number, h: number, layers: number, o: TexOptions): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, o.internal, w, h, layers, 0, o.format, o.type, null);
  const mag = o.filter ?? gl.NEAREST;
  const min = o.minFilter ?? (o.mips ? gl.LINEAR_MIPMAP_LINEAR : mag);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, min);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, mag);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, o.wrap ?? gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, o.wrap ?? gl.CLAMP_TO_EDGE);
  if (o.mips) gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  return t;
}

/** Framebuffer whose colour attachments are single layers of texture arrays (MRT allowed). */
export class LayerTarget {
  readonly fbo: WebGLFramebuffer;
  constructor(private gl: GL, readonly width: number, readonly height: number, attachments: { tex: WebGLTexture; layer: number; level?: number }[]) {
    this.fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    attachments.forEach((a, i) => gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, a.tex, a.level ?? 0, a.layer));
    gl.drawBuffers(attachments.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Layer framebuffer incomplete (0x${status.toString(16)})`);
  }
  bind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
  }
  dispose() {
    this.gl.deleteFramebuffer(this.fbo);
  }
}
