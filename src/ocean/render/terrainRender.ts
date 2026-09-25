/**
 * Terrain renderer: CDLOD over the GPU-baked height textures, with materials by
 * height/slope, wet-sand memory from the shallow-water field, analytic
 * caustics from the sea surface's slope Hessian, and the shared sky lighting.
 */
import { Program, type GL } from '../gl/context';
import { CdlodSelector, patchMesh, type CdlodConfig } from './cdlod';
import { SKY_COMMON_GLSL } from './sky';
import type { World } from '../world/World';
import type { SpectralOcean } from '../ocean/SpectralOcean';
import { pmod } from '../math/scalar';
import type { Vec3 } from '../math/mat4';

const VS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec2 aGrid;
layout(location=1) in vec4 aNode;
uniform mat4 uViewProj;
uniform vec3 uCam;
uniform float uP;
uniform vec2 uMorph[16];
uniform sampler2D uFine; uniform vec3 uFineRect;      // minX, minZ, size (world)
uniform sampler2D uCoarse; uniform vec3 uCoarseRect;
uniform float uEarthRadius;
out vec3 vRel; out vec2 vWorld; out float vH;
float heightAt(vec2 w){
  vec2 uf = (w - uFineRect.xy)/uFineRect.z;
  if (all(greaterThan(uf, vec2(0.002))) && all(lessThan(uf, vec2(0.998)))) return textureLod(uFine, uf, 0.0).r;
  vec2 uc = (w - uCoarseRect.xy)/uCoarseRect.z;
  return textureLod(uCoarse, clamp(uc, 0.0, 1.0), 0.0).r;
}
void main(){
  int level = int(aNode.w);
  float spacing = aNode.z/uP;
  vec2 rel = aNode.xy + aGrid*spacing;
  float dist = length(vec3(rel.x, -uCam.y, rel.y));
  vec2 m = uMorph[level];
  float k = clamp((dist - m.x)/max(m.y - m.x, 1e-3), 0.0, 1.0);
  vec2 g = aGrid - fract(aGrid*0.5)*2.0*k;
  rel = aNode.xy + g*spacing;
  vec2 w = rel + uCam.xz;
  float h = heightAt(w);
  vec3 p = vec3(rel.x, h - uCam.y, rel.y);
  if (uEarthRadius > 0.0) p.y -= dot(p.xz, p.xz)/(2.0*uEarthRadius);
  vRel = p; vWorld = w; vH = h;
  gl_Position = uViewProj*vec4(p, 1.0);
}`;

const FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
${SKY_COMMON_GLSL}
in vec3 vRel; in vec2 vWorld; in float vH;
out vec4 o;
uniform sampler2D uFine; uniform vec3 uFineRect;
uniform sampler2D uCoarse; uniform vec3 uCoarseRect;
uniform sampler2D uEnv; uniform float uEnvLevels;
uniform vec3 uSunDir; uniform vec3 uSunE; uniform vec3 uSkyE;
uniform float uFogDensity;
uniform vec3 uAbsorb;
// shore field (wetness memory, foam) — optional
uniform vec4 uShoreRect; uniform sampler2D uShoreExtra; uniform sampler2D uShoreSurf;
// caustics from the spectral surface
uniform sampler2DArray uDerivArr; uniform int uCascadeCount; uniform float uSizes[4]; uniform vec2 uCamOffset[4];
uniform vec3 uCam;
uniform float uTime;
uniform sampler2D uCloudShadow; uniform vec4 uCloudRect; // xz min, size, strength
float heightAt(vec2 w){
  vec2 uf = (w - uFineRect.xy)/uFineRect.z;
  if (all(greaterThan(uf, vec2(0.002))) && all(lessThan(uf, vec2(0.998)))) return texture(uFine, uf).r;
  vec2 uc = (w - uCoarseRect.xy)/uCoarseRect.z;
  return texture(uCoarse, clamp(uc, 0.0, 1.0)).r;
}
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*vnoise(p); p = p*2.03 + 17.0; a *= 0.5; } return v; }

/** Caustic focusing from the slope Hessian of the sea surface over a receiver at depth d. */
float caustics(vec2 w, float depth){
  if (depth <= 0.05) return 1.0;
  float k = depth*(1.0 - 1.0/1.333);
  float hxx = 0.0, hzz = 0.0, hxz = 0.0;
  for (int c = 0; c < 4; c++){
    if (c >= uCascadeCount) break;
    if (uSizes[c] > 400.0) continue;     // swell barely focuses; skip the long cascade
    vec2 uv = (w - uCam.xz + uCamOffset[c])/uSizes[c];
    float e = 1.0/256.0;
    vec4 a = texture(uDerivArr, vec3(uv + vec2(e, 0.0), float(c))), b = texture(uDerivArr, vec3(uv - vec2(e, 0.0), float(c)));
    vec4 cc = texture(uDerivArr, vec3(uv + vec2(0.0, e), float(c))), d = texture(uDerivArr, vec3(uv - vec2(0.0, e), float(c)));
    float inv = 1.0/(2.0*e*uSizes[c]);
    hxx += (a.x - b.x)*inv; hzz += (cc.y - d.y)*inv; hxz += (cc.x - d.x)*inv;
  }
  float det = (1.0 + k*hxx)*(1.0 + k*hzz) - k*k*hxz*hxz;
  float focus = clamp(1.0/max(abs(det), 0.18), 0.0, 5.0);
  float fade = exp(-depth*0.12);
  return mix(1.0, focus, fade);
}

void main(){
  vec3 V = normalize(-vRel);
  // Normal from the height texture at no finer than one texel or the pixel footprint.
  float e = max(uFineRect.z/float(textureSize(uFine, 0).x), 0.0015*length(vRel));
  float hx = heightAt(vWorld + vec2(e, 0.0)) - heightAt(vWorld - vec2(e, 0.0));
  float hz = heightAt(vWorld + vec2(0.0, e)) - heightAt(vWorld - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx/(2.0*e), 1.0, -hz/(2.0*e)));
  float slope = 1.0 - n.y;
  float h = vH;
  // Materials.
  float grain = fbm(vWorld*0.9);
  // Albedos in the measured range (sand 0.35–0.55, vegetation 0.08–0.2, basalt/andesite 0.15–0.3).
  vec3 sandDry = mix(vec3(0.58, 0.5, 0.37), vec3(0.68, 0.6, 0.45), grain);
  vec3 grass = mix(vec3(0.08, 0.13, 0.04), vec3(0.17, 0.22, 0.08), fbm(vWorld*0.05));
  vec3 scrub = mix(vec3(0.17, 0.16, 0.1), vec3(0.11, 0.14, 0.07), fbm(vWorld*0.11 + 3.0));
  vec3 rock = mix(vec3(0.18, 0.17, 0.16), vec3(0.3, 0.28, 0.25), fbm(vWorld*0.21 + 9.0));
  vec3 seabed = mix(vec3(0.62, 0.56, 0.42), vec3(0.4, 0.42, 0.36), smoothstep(-6.0, -30.0, h));
  vec3 albedo = seabed;
  if (h > -0.4){
    float dune = smoothstep(2.5, 6.0, h + grain*2.0);
    albedo = mix(sandDry, mix(grass, scrub, smoothstep(40.0, 120.0, h)), dune);
  }
  albedo = mix(albedo, rock, smoothstep(0.32, 0.55, slope + (grain - 0.5)*0.12));
  // Wet sand: explicit memory from the shallow-water solver, plus the permanent wet band.
  float wet = smoothstep(0.6, -0.3, h);
  vec2 suv = (vWorld - uShoreRect.xy)/uShoreRect.z;
  float foamOnSand = 0.0;
  if (uShoreRect.w > 0.5 && all(greaterThan(suv, vec2(0.0))) && all(lessThan(suv, vec2(1.0)))){
    vec4 ex = texture(uShoreExtra, suv);
    wet = max(wet, ex.x);
    foamOnSand = ex.z;
  }
  albedo = mix(albedo, albedo*vec3(0.55, 0.53, 0.5), wet*step(-0.5, h)*(1.0 - smoothstep(0.35, 0.6, slope)));
  albedo = mix(albedo, vec3(0.9), clamp(foamOnSand, 0.0, 0.8)*step(-0.3, h));
  // Lighting.
  float shadow = 1.0;
  if (uCloudRect.w > 0.0){
    vec2 cuv = (vWorld - uCloudRect.xy)/uCloudRect.z;
    shadow = mix(1.0, texture(uCloudShadow, cuv).r, uCloudRect.w);
  }
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 amb = textureLod(uEnv, dirToEquirect(normalize(n + vec3(0.0, 0.6, 0.0))), uEnvLevels - 3.0).rgb;
  float depth = max(-h, 0.0);
  // Caustic networks are centimetre-to-metre patterns: beyond ~150 m they average out (and alias).
  float caustFade = 1.0 - smoothstep(40.0, 160.0, length(vRel));
  float caust = h < 0.0 && caustFade > 0.0 ? mix(1.0, caustics(vWorld + uSunDir.xz*depth*0.3, depth), caustFade) : 1.0;
  // Seabed: only downwelling light arrives (Beer–Lambert over the water column).
  vec3 down = depth > 0.0 ? exp(-uAbsorb*depth*1.15) : vec3(1.0);
  vec3 col = albedo*(uSunE*ndl*shadow*caust/3.14159*down + amb*(0.85 + 0.15*n.y)*mix(vec3(1.0), down*0.7, step(0.001, depth)));
  // Wet sand is glossy: a little sky reflection.
  vec3 R = reflect(-V, n);
  col += wet*0.06*textureLod(uEnv, dirToEquirect(normalize(vec3(R.x, abs(R.y), R.z))), 2.0).rgb;
  float dist = length(vRel);
  vec3 haze = textureLod(uEnv, dirToEquirect(normalize(vec3(-V.x, 0.035, -V.z))), 3.0).rgb;
  col = mix(haze, col, exp(-dist*uFogDensity));
  o = vec4(col, 1.0);
}`;

export interface TerrainFrame {
  viewProj: Float32Array;
  planes: Float64Array;
  cam: Vec3;
  env: WebGLTexture;
  envLevels: number;
  sunDir: Vec3;
  sunE: Vec3;
  skyE: Vec3;
  fogDensity: number;
  absorb: Vec3;
  time: number;
  earthRadius: number;
  shore: { rect: [number, number, number]; extra: WebGLTexture; surf: WebGLTexture } | null;
  cloud: { texture: WebGLTexture; rect: [number, number, number]; strength: number } | null;
}

export class TerrainRenderer {
  private prog: Program;
  readonly selector: CdlodSelector;
  private meshes: { vao: WebGLVertexArrayObject; buf: WebGLBuffer; count: number; quads: number }[] = [];
  private dummy: WebGLTexture;
  triangles = 0;

  constructor(private gl: GL, private world: World, cfg: CdlodConfig) {
    this.prog = new Program(gl, 'terrain', VS, FS);
    this.selector = new CdlodSelector(cfg, 4096);
    this.selector.bounds = world.bounds;
    this.selector.yRange = [-world.params.oceanDepth - 10, world.params.peak + 60];
    for (const q of [cfg.patchQuads, cfg.patchQuads / 2]) {
      const { grid, index } = patchMesh(q);
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const buf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, 4 * 4 * 4096, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(1, 1);
      const eb = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      this.meshes.push({ vao, buf, count: index.length, quads: q });
    }
    this.dummy = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.dummy);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.HALF_FLOAT, new Uint16Array([0, 0, 0, 0x3c00]));
  }

  /** Draw terrain (opaque). Returns false when no terrain is in view. */
  draw(f: TerrainFrame, ocean: SpectralOcean): boolean {
    const gl = this.gl;
    this.selector.earthRadius = f.earthRadius;
    const sel = this.selector.select(f.cam, f.planes, 0, 0);
    if (!sel.fullCount && !sel.halfCount) { this.triangles = 0; return false; }
    const w = this.world;
    const p = this.prog.use();
    const morph = new Float32Array(32);
    morph.set(sel.morph.subarray(0, Math.min(sel.morph.length, 32)));
    const sizes = new Float32Array(4), offs = new Float32Array(8);
    for (let c = 0; c < ocean.cascades; c++) {
      const L = ocean.layout.sizes[c];
      sizes[c] = L;
      offs[c * 2] = pmod(f.cam[0], L);
      offs[c * 2 + 1] = pmod(f.cam[2], L);
    }
    p.set('uViewProj', f.viewProj).set('uCam', f.cam).set('uMorph', morph).set('uEarthRadius', f.earthRadius)
      .tex('uFine', w.fine.texture).set('uFineRect', [w.fine.min[0], w.fine.min[1], w.fine.size])
      .tex('uCoarse', w.coarse.texture).set('uCoarseRect', [w.coarse.min[0], w.coarse.min[1], w.coarse.size])
      .tex('uEnv', f.env).set('uEnvLevels', f.envLevels).set('uSunDir', f.sunDir).set('uSunE', f.sunE).set('uSkyE', f.skyE)
      .set('uFogDensity', f.fogDensity).set('uAbsorb', f.absorb).set('uTime', f.time)
      .tex('uDerivArr', ocean.derivArray).set('uCascadeCount', ocean.cascades).set('uSizes', sizes).set('uCamOffset', offs);
    if (f.shore) p.set('uShoreRect', [...f.shore.rect, 1]).tex('uShoreExtra', f.shore.extra).tex('uShoreSurf', f.shore.surf);
    else p.set('uShoreRect', [0, 0, 1, 0]).tex('uShoreExtra', this.dummy).tex('uShoreSurf', this.dummy);
    if (f.cloud) p.tex('uCloudShadow', f.cloud.texture).set('uCloudRect', [...f.cloud.rect, f.cloud.strength]);
    else p.tex('uCloudShadow', this.dummy).set('uCloudRect', [0, 0, 1, 0]);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    let tris = 0;
    const draws: [typeof this.meshes[0], Float32Array, number][] = [
      [this.meshes[0], sel.full, sel.fullCount],
      [this.meshes[1], sel.half, sel.halfCount],
    ];
    for (const [mesh, data, count] of draws) {
      if (!count) continue;
      p.set('uP', mesh.quads);
      gl.bindVertexArray(mesh.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * 4));
      gl.drawElementsInstanced(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0, count);
      tris += (mesh.count / 3) * count;
    }
    gl.bindVertexArray(null);
    this.triangles = tris;
    return true;
  }

  dispose() {
    this.prog.dispose();
    this.gl.deleteTexture(this.dummy);
  }
}
