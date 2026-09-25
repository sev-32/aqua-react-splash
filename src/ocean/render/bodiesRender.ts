/**
 * Body meshes generated from the shared hull functions + a small PBR-ish shader
 * that uses the same sky environment and sun as the water.
 */
import { Program, type GL } from '../gl/context';
import { SKY_COMMON_GLSL } from './sky';
import { hullBottomLocal, hullDeckLocal, hullHalfBeam, type BodyShape } from '../physics/hull';
import type { Body } from '../physics/bodies';
import { quatToMat3, type Vec3 } from '../math/mat4';

interface Mesh { vao: WebGLVertexArrayObject; count: number }

const VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
uniform mat4 uViewProj;
uniform mat3 uRot;
uniform vec3 uRel;      // body position − camera
uniform vec3 uScale;
out vec3 vRel; out vec3 vN; out vec3 vColor; out vec3 vLocal;
void main(){
  vec3 p = uRot*(aPos*uScale) + uRel;
  vRel = p; vN = normalize(uRot*(aNormal/uScale)); vColor = aColor; vLocal = aPos;
  gl_Position = uViewProj*vec4(p, 1.0);
}`;

const FS = /* glsl */ `#version 300 es
precision highp float;
${SKY_COMMON_GLSL}
in vec3 vRel; in vec3 vN; in vec3 vColor; in vec3 vLocal;
out vec4 o;
uniform sampler2D uEnv;
uniform float uEnvLevels;
uniform vec3 uSunDir; uniform vec3 uSunE; uniform vec3 uSkyE;
uniform float uCamY;
uniform float uWaterline;     // world water height at the body (m)
uniform vec3 uAbsorb;
uniform float uRough;
uniform float uFogDensity;
uniform sampler2D uCloudShadow; uniform vec4 uCloudRect;   // camera-relative xz min, size, strength
void main(){
  vec3 V = normalize(-vRel);
  vec3 sunE = uSunE;
  if (uCloudRect.w > 0.0){
    vec2 cuv = (vRel.xz - uCloudRect.xy)/uCloudRect.z;
    if (all(greaterThan(cuv, vec2(0.0))) && all(lessThan(cuv, vec2(1.0)))) sunE *= mix(1.0, texture(uCloudShadow, cuv).r, uCloudRect.w);
  }
  vec3 n = normalize(vN);
  if (dot(n, V) < 0.0) n = -n;   // generated meshes: light both faces consistently
  float worldY = vRel.y + uCamY;
  float wet = smoothstep(0.08, -0.12, worldY - uWaterline);
  vec3 albedo = vColor*mix(1.0, 0.62, wet);
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 H = normalize(V + uSunDir);
  float spec = pow(max(dot(n, H), 0.0), mix(24.0, 160.0, wet))*mix(0.08, 0.35, wet);
  vec3 amb = textureLod(uEnv, dirToEquirect(normalize(n + vec3(0.0, 0.4, 0.0))), uEnvLevels - 3.0).rgb;
  // Under the waterline only DOWNWELLING light reaches the hull (Beer–Lambert with depth);
  // the view path through the water is the water shader's job (it refracts this frame).
  float depth = max(uWaterline - worldY, 0.0);
  vec3 down = exp(-uAbsorb*depth*1.2);
  vec3 col;
  if (depth > 0.001){
    // Under water: the sun arrives refracted (steeper), and the light field is diffuse —
    // skylight scattered in the column plus what the sea floor and the water send back up.
    vec3 Ts = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0/1.333);
    float ndlW = max(dot(n, -Ts), 0.0);
    vec3 Ed = sunE*max(uSunDir.y, 0.0) + uSkyE;
    vec3 diffuse = Ed*down*(0.22 + 0.33*(n.y*0.5 + 0.5))/3.14159;
    col = albedo*(sunE*ndlW*down/3.14159 + diffuse) + sunE*spec*0.05*down;
  } else col = albedo*(sunE*ndl/3.14159 + amb*0.9) + sunE*spec*0.05;
  float dist = length(vRel);
  vec3 haze = textureLod(uEnv, dirToEquirect(normalize(vec3(-V.x, 0.035, -V.z))), 3.0).rgb;
  col = mix(haze, col, exp(-dist*uFogDensity));
  o = vec4(col, 1.0);
}`;

function upload(gl: GL, pos: number[], nrm: number[], col: number[], idx: number[]): Mesh {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const attr = (loc: number, data: number[]) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
  };
  attr(0, pos); attr(1, nrm); attr(2, col);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: idx.length };
}

/** Recompute smooth vertex normals from triangles. */
function normals(pos: number[], idx: number[]): number[] {
  const n = new Array(pos.length).fill(0);
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]];
    const e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
    const f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, b, c]) { n[v] += f[0]; n[v + 1] += f[1]; n[v + 2] += f[2]; }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

export function sphereMesh(gl: GL, rocky: boolean, bands: boolean): Mesh {
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const nu = 32, nv = 20;
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const th = (j / nv) * Math.PI, ph = (i / nu) * 2 * Math.PI;
      let x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
      if (rocky) {
        const r = 1 + 0.12 * Math.sin(3.1 * x + 1.3) * Math.sin(2.7 * y + 0.4) * Math.sin(3.7 * z + 2.1) + 0.05 * Math.sin(9 * x + 7 * z);
        x *= r; y *= r * 0.85; z *= r;
      }
      pos.push(x, y, z);
      if (bands) {
        const band = Math.floor((y + 1) * 3) % 2 === 0;
        col.push(...(band ? [0.85, 0.12, 0.08] : [0.92, 0.9, 0.86]));
      } else if (rocky) {
        const g = 0.2 + 0.08 * Math.sin(5 * x + 3 * y);
        col.push(g, g * 0.95, g * 0.88);
      } else col.push(0.8, 0.8, 0.8);
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  return upload(gl, pos, normals(pos, idx), col, idx);
}

/** Hull skin, deck and a small wheelhouse — generated from the same functions as the physics. */
export function hullMesh(gl: GL, shape: BodyShape): Mesh {
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const L = shape.length ?? 8;
  const nu = 48, nw = 18;
  const hull: Vec3 = [0.93, 0.93, 0.9], anti: Vec3 = [0.55, 0.1, 0.08], deck: Vec3 = [0.55, 0.4, 0.26], stripe: Vec3 = [0.1, 0.22, 0.4];
  const ring = nw + 3;
  for (let i = 0; i <= nu; i++) {
    const u = -L / 2 + (i / nu) * L * 0.999;
    const s = u / (L / 2);
    const hb = Math.max(hullHalfBeam(shape, s), 0.002);
    const top = hullDeckLocal(shape, s);
    // Cross-section: deck edge (port) → sheer → bottom → sheer → deck edge (starboard)
    const pts: [number, number][] = [[-hb, top]];
    for (let k = 0; k <= nw; k++) {
      const w = -hb + (k / nw) * 2 * hb;
      const yb = hullBottomLocal(shape, u, Math.max(Math.min(w, hb * 0.999), -hb * 0.999)) ?? -0.02;
      pts.push([w, yb]);
    }
    pts.push([hb, top]);
    for (const [w, y] of pts) {
      pos.push(u, y, w);
      const c = y < -0.18 ? anti : y > top - 0.12 ? stripe : hull;
      col.push(...c);
    }
  }
  for (let i = 0; i < nu; i++)
    for (let k = 0; k < ring - 1; k++) {
      const a = i * ring + k, b = a + 1, c = a + ring, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  // Deck: a separate flat strip so its normal points up.
  const base = pos.length / 3;
  for (let i = 0; i <= nu; i++) {
    const u = -L / 2 + (i / nu) * L * 0.999;
    const s = u / (L / 2);
    const hb = Math.max(hullHalfBeam(shape, s), 0.002);
    const top = hullDeckLocal(shape, s);
    pos.push(u, top, -hb, u, top, hb);
    col.push(...deck, ...deck);
  }
  for (let i = 0; i < nu; i++) {
    const a = base + i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  // Transom cap.
  const t0 = pos.length / 3;
  const hbT = hullHalfBeam(shape, -1);
  pos.push(-L / 2, hullDeckLocal(shape, -1), 0);
  col.push(...hull);
  for (let k = 0; k < ring; k++) { pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); col.push(...hull); }
  for (let k = 0; k < ring - 1; k++) idx.push(t0, t0 + 2 + k, t0 + 1 + k);
  void hbT;
  // Wheelhouse box.
  const bx = (cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, c: Vec3) => {
    const b0 = pos.length / 3;
    const corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    for (const [x, y, z] of corners) { pos.push(cx + x * hx, cy + y * hy, cz + z * hz); col.push(...c); }
    const f = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
    for (const [a, b, cc, d] of f) idx.push(b0 + a, b0 + b, b0 + cc, b0 + a, b0 + cc, b0 + d);
  };
  const F = shape.freeboard ?? 0.8, B = shape.beam ?? 2.4;
  bx(-L * 0.05, F + 0.55, 0, L * 0.16, 0.55, B * 0.3, [0.95, 0.95, 0.93]);
  bx(-L * 0.05 + L * 0.155, F + 0.75, 0, 0.02, 0.22, B * 0.26, [0.08, 0.12, 0.16]);
  return upload(gl, pos, normals(pos, idx), col, idx);
}

export class BodiesRenderer {
  private prog: Program;
  private meshes = new Map<string, Mesh>();

  constructor(private gl: GL) {
    this.prog = new Program(gl, 'bodies', VS, FS);
  }

  private meshFor(b: Body): { mesh: Mesh; scale: Vec3 } {
    const s = b.shape;
    if (s.kind === 'sphere') {
      const key = b.label.startsWith('rock') ? 'rock' : b.label.startsWith('buoy') ? 'buoy' : 'sphere';
      if (!this.meshes.has(key)) this.meshes.set(key, sphereMesh(this.gl, key === 'rock', key === 'buoy'));
      const r = s.radius ?? 1;
      return { mesh: this.meshes.get(key)!, scale: [r, r, r] };
    }
    if (s.kind === 'hull') {
      const key = `hull:${s.length}:${s.beam}:${s.draft}:${s.freeboard}`;
      if (!this.meshes.has(key)) this.meshes.set(key, hullMesh(this.gl, s));
      return { mesh: this.meshes.get(key)!, scale: [1, 1, 1] };
    }
    if (!this.meshes.has('box')) this.meshes.set('box', sphereMesh(this.gl, false, false));
    const h = s.half ?? [1, 1, 1];
    return { mesh: this.meshes.get('box')!, scale: h };
  }

  draw(bodies: Body[], f: {
    viewProj: Float32Array; cam: Vec3; env: WebGLTexture; envLevels: number; sunDir: Vec3; sunE: Vec3; skyE: Vec3;
    absorb: Vec3; fogDensity: number; waterAt: (x: number, z: number) => number;
    cloud?: { texture: WebGLTexture; rect: [number, number, number]; strength: number } | null;
  }) {
    const gl = this.gl;
    const p = this.prog.use();
    p.set('uViewProj', f.viewProj).tex('uEnv', f.env).set('uEnvLevels', f.envLevels).set('uSunDir', f.sunDir)
      .set('uSunE', f.sunE).set('uSkyE', f.skyE).set('uCamY', f.cam[1]).set('uAbsorb', f.absorb).set('uFogDensity', f.fogDensity);
    if (f.cloud) p.tex('uCloudShadow', f.cloud.texture).set('uCloudRect', [f.cloud.rect[0] - f.cam[0], f.cloud.rect[1] - f.cam[2], f.cloud.rect[2], f.cloud.strength]);
    else p.tex('uCloudShadow', f.env).set('uCloudRect', [0, 0, 1, 0]);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.disable(gl.CULL_FACE); // generated meshes have mixed winding; depth test resolves visibility
    for (const b of bodies) {
      if (!b.alive) continue;
      const { mesh, scale } = this.meshFor(b);
      p.set('uRot', quatToMat3(b.rot)).set('uRel', [b.pos[0] - f.cam[0], b.pos[1] - f.cam[1], b.pos[2] - f.cam[2]])
        .set('uScale', scale).set('uWaterline', f.waterAt(b.pos[0], b.pos[2]));
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    this.prog.dispose();
  }
}
