// LUCID female-skin-v4.2 as the Laser 2 crew.
//
// The legacy biomechanics (hiking, trapeze, tiller and sheet hands) and the
// CrewRecoverySystem (swimming, board, climbing, scooping) keep producing the
// crew's joint targets; the legacy procedural bodies are hidden and each crew
// member is drawn as the canonical LUCID body:
//
//   legacy joint targets → LucidRetarget (lawful Semantic51 + hand layer)
//   → canonical Skin78 cluster drivers → GPU linear blend skinning with the
//   canonical weights (≤ 8 influences, weight-sum division).
//
// The legacy crew IK is given her segment lengths so hands and feet land on
// the tiller, sheets, straps and board. Clothing is sailing kit painted onto
// the unchanged skin (wetsuit, boots, gloves, neoprene cap) plus a buoyancy
// aid shell built from her own torso surface and skinned with the same
// weights. Nothing edits the canonical weights, helper rules or mesh.

import type { AppContext, AppSystem } from '../../core/System.js';
import { three, GL } from '../../three/ThreeRuntime.js';
import { loadLucidAsset, type LucidAsset } from './LucidAsset.js';
import { CanonicalClusterDrivers } from './LucidKinematics.js';
import { LucidRetarget, type GripState } from './LucidRetarget.js';
import type { CrewRecoverySystem } from '../CrewRecoverySystem.js';

interface Outfit { suit: number; accent: number; vest: number; vestTrim: number; hair: number }
const OUTFITS: Record<string, Outfit> = {
  helm: { suit: 0x16181c, accent: 0x1d5fa8, vest: 0xd8412b, vestTrim: 0x202329, hair: 0x3a2618 },
  crew: { suit: 0x17191d, accent: 0xc9a227, vest: 0x1f6fb3, vestTrim: 0x202329, hair: 0x8a6a3e },
};

interface Instance {
  id: 'helm' | 'crew';
  actor: any;
  retarget: LucidRetarget;
  drivers: CanonicalClusterDrivers;
  texture: any;
  texData: Float32Array;
  mesh: any;
  vest: any;
  hair: any;
  materials: any[];
  uniforms: Record<string, { value: any }>;
  grip: [GripState, GripState];
  lastError: string | null;
}

/** Hairline height (H-space, m) around the head: forehead, temples, over the ears, nape. */
const HAIRLINE: Array<[number, number]> = [[0, 1.576], [0.9, 1.55], [1.35, 1.541], [1.9, 1.547], [Math.PI, 1.47]];
function lucidHairline(x: number, z: number): number {
  const phi = Math.atan2(Math.abs(x), -(z - 0.005));
  for (let i = 1; i < HAIRLINE.length; i++) {
    const [p1, h1] = HAIRLINE[i]!, [p0, h0] = HAIRLINE[i - 1]!;
    if (phi <= p1) return h0 + ((h1 - h0) * (phi - p0)) / (p1 - p0);
  }
  return HAIRLINE[HAIRLINE.length - 1]![1];
}

const TORSO_CLUSTERS = new Set(['Spine01', 'Spine02', 'Waist', 'L_RibsTwist', 'R_RibsTwist', 'L_Breast', 'R_Breast', 'L_Clavicle', 'R_Clavicle']);

export class LucidCrewSystem implements AppSystem {
  readonly id = 'crew.lucid-body';
  readonly phase = 'preRender' as const;
  enabled = true;
  private context: AppContext | null = null;
  private asset: LucidAsset | null = null;
  private instances: Instance[] = [];
  private status = 'not-loaded';
  private frames = 0;
  private solveMs = 0;
  private geometry: any = null;
  private vestGeometry: any = null;
  private hairGeometry: any = null;

  constructor(readonly crewRecovery: CrewRecoverySystem | null = null) {}

  async init(context: AppContext): Promise<void> {
    this.context = context;
    try {
      this.asset = await loadLucidAsset();
    } catch (error) {
      this.status = `asset unavailable: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }
    const master = context.legacy.master;
    const actors: Array<['helm' | 'crew', any]> = [];
    if (master?.helm?.human) actors.push(['helm', master.helm]);
    if (master?.crew?.human) actors.push(['crew', master.crew]);
    if (!actors.length) { this.status = 'no legacy crew actors'; return; }
    this.geometry = this.buildGeometry(this.asset);
    this.vestGeometry = this.buildVestGeometry(this.asset);
    this.hairGeometry = this.buildHairGeometry(this.asset);
    for (const [id, actor] of actors) {
      try { this.instances.push(this.createInstance(id, actor)); }
      catch (error) {
        this.status = `instance ${id} failed: ${error instanceof Error ? error.message : String(error)}`;
        context.telemetry.recordError('crew:lucid', error);
      }
    }
    if (this.instances.length) this.status = 'active';
    for (const inst of this.instances) this.pose(inst);
  }

  // ------------------------------------------------------------ geometry

  private buildGeometry(a: LucidAsset): any {
    const T = three();
    const g = new T.BufferGeometry();
    const nv = a.header.vertexCount;
    g.setAttribute('position', new T.BufferAttribute(a.position, 3));
    g.setAttribute('normal', new T.BufferAttribute(a.normal, 3));
    const idx0 = new Float32Array(nv * 4), idx1 = new Float32Array(nv * 4), w0 = new Float32Array(nv * 4), w1 = new Float32Array(nv * 4);
    for (let v = 0; v < nv; v++) {
      for (let k = 0; k < 4; k++) {
        idx0[v * 4 + k] = a.skinIndex[v * 8 + k]!; w0[v * 4 + k] = a.skinWeight[v * 8 + k]!;
        idx1[v * 4 + k] = a.skinIndex[v * 8 + 4 + k]!; w1[v * 4 + k] = a.skinWeight[v * 8 + 4 + k]!;
      }
    }
    g.setAttribute('lucidIndex0', new T.BufferAttribute(idx0, 4));
    g.setAttribute('lucidIndex1', new T.BufferAttribute(idx1, 4));
    g.setAttribute('lucidWeight0', new T.BufferAttribute(w0, 4));
    g.setAttribute('lucidWeight1', new T.BufferAttribute(w1, 4));
    g.setAttribute('lucidRegion', new T.BufferAttribute(Float32Array.from(a.region), 1));
    g.setIndex(new T.BufferAttribute(a.index, 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(0, 0.85, 0), 1.2);
    return g;
  }

  /**
   * Buoyancy aid: the torso surface between waist and shoulders, offset along
   * the rest normals by the foam thickness, relaxed (Laplacian) into stiff
   * panels, and skinned with the same canonical weights as the vertices it
   * was built from.
   */
  private buildVestGeometry(a: LucidAsset): any {
    const T = three();
    const nv = a.header.vertexCount;
    const clusters = a.header.clusters;
    const dominant = (v: number) => clusters[a.skinIndex[v * 8]!]!;
    const P = a.position, N = a.normal;
    const inVest = new Uint8Array(nv);
    for (let v = 0; v < nv; v++) {
      const y = P[v * 3 + 1]!, x = P[v * 3]!;
      const name = dominant(v);
      if (!TORSO_CLUSTERS.has(name)) continue;
      if (name.endsWith('Clavicle') && Math.abs(x) > 0.125) continue;
      if (y < 1.0 || y > 1.395) continue;
      if (a.region[v] !== 0) continue;
      inVest[v] = 1;
    }
    const tris: number[] = [];
    const idx = a.index;
    for (let t = 0; t < idx.length; t += 3) {
      const i = idx[t]!, j = idx[t + 1]!, k = idx[t + 2]!;
      if (inVest[i] && inVest[j] && inVest[k]) tris.push(i, j, k);
    }
    const remap = new Map<number, number>();
    const src: number[] = [];
    for (const v of tris) if (!remap.has(v)) { remap.set(v, src.length); src.push(v); }
    const m = src.length;
    const pos = new Float32Array(m * 3);
    const i0 = new Float32Array(m * 4), i1 = new Float32Array(m * 4), w0 = new Float32Array(m * 4), w1 = new Float32Array(m * 4);
    // Offset (thicker on front and back panels, thinner under the arms).
    for (let k = 0; k < m; k++) {
      const v = src[k]!;
      const nx = N[v * 3]!, ny = N[v * 3 + 1]!, nz = N[v * 3 + 2]!;
      const lateral = Math.abs(nx);
      const thick = 0.034 - 0.018 * lateral * lateral;
      pos[k * 3] = P[v * 3]! + nx * thick; pos[k * 3 + 1] = P[v * 3 + 1]! + ny * thick * 0.6; pos[k * 3 + 2] = P[v * 3 + 2]! + nz * thick;
      for (let c = 0; c < 4; c++) {
        i0[k * 4 + c] = a.skinIndex[v * 8 + c]!; w0[k * 4 + c] = a.skinWeight[v * 8 + c]!;
        i1[k * 4 + c] = a.skinIndex[v * 8 + 4 + c]!; w1[k * 4 + c] = a.skinWeight[v * 8 + 4 + c]!;
      }
    }
    // Laplacian relaxation of interior vertices: foam panels, not anatomy.
    const nbr: Array<Set<number>> = Array.from({ length: m }, () => new Set<number>());
    const edgeCount = new Map<string, number>();
    for (let t = 0; t < tris.length; t += 3) {
      const a0 = remap.get(tris[t]!)!, a1 = remap.get(tris[t + 1]!)!, a2 = remap.get(tris[t + 2]!)!;
      for (const [p, q] of [[a0, a1], [a1, a2], [a2, a0]] as const) {
        nbr[p]!.add(q); nbr[q]!.add(p);
        const key = p < q ? `${p}_${q}` : `${q}_${p}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }
    const boundary = new Uint8Array(m);
    for (const [key, c] of edgeCount) if (c === 1) { const [p, q] = key.split('_').map(Number); boundary[p!] = 1; boundary[q!] = 1; }
    // Taubin (λ|μ) smoothing: removes anatomical relief (a foam vest is a
    // stiff panel over the chest) without shrinking the shell.
    const tmp = new Float32Array(m * 3);
    const pass = (factor: number): void => {
      tmp.set(pos);
      for (let k = 0; k < m; k++) {
        if (boundary[k]) continue;
        let sx = 0, sy = 0, sz = 0, c = 0;
        for (const q of nbr[k]!) { sx += tmp[q * 3]!; sy += tmp[q * 3 + 1]!; sz += tmp[q * 3 + 2]!; c++; }
        if (!c) continue;
        pos[k * 3] = tmp[k * 3]! + factor * (sx / c - tmp[k * 3]!);
        pos[k * 3 + 1] = tmp[k * 3 + 1]! + factor * (sy / c - tmp[k * 3 + 1]!);
        pos[k * 3 + 2] = tmp[k * 3 + 2]! + factor * (sz / c - tmp[k * 3 + 2]!);
      }
    };
    for (let it = 0; it < 45; it++) { pass(0.62); pass(-0.64); }
    // Foam panels are flat across the chest: front-facing shell vertices are
    // pulled forward to the most forward point of their horizontal band.
    const band = 0.03;
    const front = new Float32Array(m).fill(0);
    for (let k = 0; k < m; k++) {
      const v = src[k]!;
      if (N[v * 3 + 2]! > -0.35) continue; // H-space forward is −z
      let zMin = pos[k * 3 + 2]!;
      const y = pos[k * 3 + 1]!;
      for (let q = 0; q < m; q++) {
        if (Math.abs(pos[q * 3 + 1]! - y) > band || Math.abs(pos[q * 3]!) > 0.1) continue;
        if (N[src[q]! * 3 + 2]! > -0.35) continue;
        if (pos[q * 3 + 2]! < zMin) zMin = pos[q * 3 + 2]!;
      }
      const w = Math.min(1, (-N[v * 3 + 2]! - 0.35) / 0.4);
      front[k] = (zMin - pos[k * 3 + 2]!) * w;
    }
    for (let k = 0; k < m; k++) pos[k * 3 + 2] = pos[k * 3 + 2]! + front[k]!;
    for (let it = 0; it < 8; it++) { pass(0.5); pass(-0.52); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setIndex(new T.BufferAttribute(Uint32Array.from(tris.map((v) => remap.get(v)!)), 1));
    g.computeVertexNormals();
    g.setAttribute('lucidIndex0', new T.BufferAttribute(i0, 4));
    g.setAttribute('lucidIndex1', new T.BufferAttribute(i1, 4));
    g.setAttribute('lucidWeight0', new T.BufferAttribute(w0, 4));
    g.setAttribute('lucidWeight1', new T.BufferAttribute(w1, 4));
    g.setAttribute('lucidRegion', new T.BufferAttribute(new Float32Array(m).fill(5), 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(0, 1.2, 0), 0.6);
    return g;
  }

  /**
   * Hair: a thin shell over the scalp (offset along the rest normals) and a
   * bun at the back of the head, both carried by the canonical head clusters.
   */
  private buildHairGeometry(a: LucidAsset): any {
    const T = three();
    const nv = a.header.vertexCount;
    const P = a.position, N = a.normal;
    const hairline = (x: number, z: number) => lucidHairline(x, z);
    const inHair = new Uint8Array(nv);
    let backZ = -1, topY = 0;
    for (let v = 0; v < nv; v++) {
      if (a.region[v] !== 1) continue;
      const x = P[v * 3]!, y = P[v * 3 + 1]!, z = P[v * 3 + 2]!;
      if (y > topY) topY = y;
      if (y > 1.55 && y < 1.6 && z > backZ) backZ = z;
      if (y < hairline(x, z)) continue;
      inHair[v] = 1;
    }
    const tris: number[] = [];
    for (let t = 0; t < a.index.length; t += 3) {
      const i = a.index[t]!, j = a.index[t + 1]!, k = a.index[t + 2]!;
      if (inHair[i] && inHair[j] && inHair[k]) tris.push(i, j, k);
    }
    const remap = new Map<number, number>();
    const src: number[] = [];
    for (const v of tris) if (!remap.has(v)) { remap.set(v, src.length); src.push(v); }
    // Bun: ellipsoid behind the crown, rigid on the Head cluster.
    const headCluster = a.header.clusters.indexOf('Head');
    const bunC = [0, Math.min(topY - 0.04, 1.59), backZ + 0.012];
    const bunR = [0.042, 0.036, 0.034];
    const seg = 14, rings = 10;
    const m0 = src.length;
    const bunCount = (rings + 1) * (seg + 1);
    const total = m0 + bunCount;
    const pos = new Float32Array(total * 3);
    const i0 = new Float32Array(total * 4), i1 = new Float32Array(total * 4), w0 = new Float32Array(total * 4), w1 = new Float32Array(total * 4);
    for (let k = 0; k < m0; k++) {
      const v = src[k]!;
      const y = P[v * 3 + 1]!;
      const thick = 0.006 + 0.006 * Math.max(0, Math.min(1, (y - 1.53) / 0.09));
      pos[k * 3] = P[v * 3]! + N[v * 3]! * thick;
      pos[k * 3 + 1] = P[v * 3 + 1]! + N[v * 3 + 1]! * thick;
      pos[k * 3 + 2] = P[v * 3 + 2]! + N[v * 3 + 2]! * thick;
      for (let c = 0; c < 4; c++) {
        i0[k * 4 + c] = a.skinIndex[v * 8 + c]!; w0[k * 4 + c] = a.skinWeight[v * 8 + c]!;
        i1[k * 4 + c] = a.skinIndex[v * 8 + 4 + c]!; w1[k * 4 + c] = a.skinWeight[v * 8 + 4 + c]!;
      }
    }
    const index: number[] = tris.map((v) => remap.get(v)!);
    for (let r = 0; r <= rings; r++) {
      const th = (r / rings) * Math.PI;
      for (let q = 0; q <= seg; q++) {
        const ph = (q / seg) * Math.PI * 2;
        const k = m0 + r * (seg + 1) + q;
        pos[k * 3] = bunC[0]! + bunR[0]! * Math.sin(th) * Math.cos(ph);
        pos[k * 3 + 1] = bunC[1]! + bunR[1]! * Math.cos(th);
        pos[k * 3 + 2] = bunC[2]! + bunR[2]! * Math.sin(th) * Math.sin(ph);
        i0[k * 4] = headCluster; w0[k * 4] = 1;
      }
    }
    for (let r = 0; r < rings; r++) for (let q = 0; q < seg; q++) {
      const a0 = m0 + r * (seg + 1) + q, b0 = a0 + seg + 1;
      index.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setIndex(new T.BufferAttribute(Uint32Array.from(index), 1));
    g.computeVertexNormals();
    g.setAttribute('lucidIndex0', new T.BufferAttribute(i0, 4));
    g.setAttribute('lucidIndex1', new T.BufferAttribute(i1, 4));
    g.setAttribute('lucidWeight0', new T.BufferAttribute(w0, 4));
    g.setAttribute('lucidWeight1', new T.BufferAttribute(w1, 4));
    g.setAttribute('lucidRegion', new T.BufferAttribute(new Float32Array(total).fill(6), 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(0, 1.55, 0), 0.3);
    return g;
  }

  // ------------------------------------------------------------ materials

  private skinningChunks(): { pars: string; begin: string; normal: string } {
    const fetch = (i: string) => `lucidCluster(${i})`;
    return {
      pars: /* glsl */ `
uniform highp sampler2D lucidClusters;
attribute vec4 lucidIndex0;
attribute vec4 lucidIndex1;
attribute vec4 lucidWeight0;
attribute vec4 lucidWeight1;
attribute float lucidRegion;
varying vec3 vLucidRest;
varying vec4 vLucidRegion;
varying float vLucidHair;
mat4 lucidCluster(float i) {
  int y = int(i + 0.5);
  return mat4(texelFetch(lucidClusters, ivec2(0, y), 0), texelFetch(lucidClusters, ivec2(1, y), 0),
              texelFetch(lucidClusters, ivec2(2, y), 0), texelFetch(lucidClusters, ivec2(3, y), 0));
}
mat4 lucidSkin() {
  mat4 m = lucidWeight0.x * ${fetch('lucidIndex0.x')};
  if (lucidWeight0.y > 0.0) m += lucidWeight0.y * ${fetch('lucidIndex0.y')};
  if (lucidWeight0.z > 0.0) m += lucidWeight0.z * ${fetch('lucidIndex0.z')};
  if (lucidWeight0.w > 0.0) m += lucidWeight0.w * ${fetch('lucidIndex0.w')};
  if (lucidWeight1.x > 0.0) m += lucidWeight1.x * ${fetch('lucidIndex1.x')};
  if (lucidWeight1.y > 0.0) m += lucidWeight1.y * ${fetch('lucidIndex1.y')};
  if (lucidWeight1.z > 0.0) m += lucidWeight1.z * ${fetch('lucidIndex1.z')};
  if (lucidWeight1.w > 0.0) m += lucidWeight1.w * ${fetch('lucidIndex1.w')};
  return m;
}
`,
      begin: /* glsl */ `
mat4 lucidM = lucidSkin();
vec3 transformed = (lucidM * vec4(position, 1.0)).xyz;
vLucidRest = position;
float lr = floor(lucidRegion + 0.5);
vLucidRegion = vec4(lr == 1.0 ? 1.0 : 0.0, lr == 2.0 ? 1.0 : 0.0, lr == 3.0 ? 1.0 : 0.0, lr == 5.0 ? 1.0 : 0.0);
vLucidHair = lr == 6.0 ? 1.0 : 0.0;
`,
      normal: /* glsl */ `
vec3 objectNormal = normalize(mat3(lucidSkin()) * normal);
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif
`,
    };
  }

  private makeMaterial(uniforms: Record<string, { value: any }>, vest: boolean): any {
    const T = three();
    const material = new T.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.55, metalness: 0, sheen: vest ? 0.25 : 0.4, sheenRoughness: 0.6,
      clearcoat: 0.04, clearcoatRoughness: 0.18, side: vest ? GL.DoubleSide : GL.FrontSide,
    });
    const chunks = this.skinningChunks();
    material.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${chunks.pars}`)
        .replace('#include <beginnormal_vertex>', chunks.normal)
        .replace('#include <begin_vertex>', chunks.begin);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', /* glsl */ `#include <common>
uniform vec3 lucidSuit; uniform vec3 lucidAccent; uniform vec3 lucidSkinTone; uniform vec3 lucidBoot;
uniform vec3 lucidGlove; uniform vec3 lucidHair; uniform vec3 lucidVest; uniform vec3 lucidVestTrim;
uniform float lucidWet;
varying vec3 vLucidRest;
varying vec4 vLucidRegion;
varying float vLucidHair;
float lucidHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lucidRough;
float lucidSheenMask;
vec3 lucidAlbedo() {
  vec3 p = vLucidRest;
  float head = vLucidRegion.x, hand = vLucidRegion.y, foot = vLucidRegion.z, vestR = vLucidRegion.w;
  float suitW = clamp(1.0 - head - hand - foot - vestR, 0.0, 1.0);
  // Wetsuit: black neoprene, accent yoke across the shoulders and side stripes on the legs.
  float yoke = smoothstep(1.26, 1.29, p.y) * (1.0 - smoothstep(1.40, 1.42, p.y));
  // Side stripe on the outer leg: angle around the leg's rest axis.
  float legT = clamp((p.y - 0.4636) / (0.877 - 0.4636), 0.0, 1.0);
  float shinT = clamp((p.y - 0.052) / (0.4636 - 0.052), 0.0, 1.0);
  float legCx = p.y > 0.4636 ? mix(0.0799, 0.0886, legT) : mix(0.0724, 0.0799, shinT);
  float legCz = p.y > 0.4636 ? mix(0.004, 0.0015, legT) : mix(0.0168, 0.004, shinT);
  float legAng = abs(atan(p.z - legCz, abs(p.x) - legCx));
  float legStripe = (1.0 - smoothstep(0.16, 0.22, legAng)) * (1.0 - smoothstep(0.80, 0.84, p.y)) * smoothstep(0.08, 0.12, p.y);
  float cuff = smoothstep(0.55, 0.6, abs(p.x)) * (1.0 - smoothstep(0.6, 0.605, abs(p.x)));
  vec3 suit = mix(lucidSuit, lucidAccent, clamp(yoke + legStripe + cuff, 0.0, 1.0));
  // Head: skin face; hair above the hairline (forehead → temples → over the
  // ears → down to the nape), the hair shell covering the same region.
  float hairPhi = atan(abs(p.x), -(p.z - 0.005));
  float hairLine = hairPhi < 0.9 ? mix(1.576, 1.55, hairPhi / 0.9)
                 : hairPhi < 1.35 ? mix(1.55, 1.541, (hairPhi - 0.9) / 0.45)
                 : hairPhi < 1.9 ? mix(1.541, 1.547, (hairPhi - 1.35) / 0.55)
                 : mix(1.547, 1.47, (hairPhi - 1.9) / (3.14159 - 1.9));
  float cap = smoothstep(hairLine - 0.003, hairLine + 0.003, p.y);
  // Strands combed back from the hairline toward the bun.
  float strand = lucidHash(vec2(floor(atan(p.x, p.z + 0.02) * 90.0), 0.0));
  vec3 hairCol = lucidHair * (0.72 + 0.4 * strand);
  vec3 headCol = mix(lucidSkinTone, hairCol, cap);
  float hairShell = vLucidHair;
  // Hands: short-finger gloves over the palm and first phalanx.
  float glove = 1.0 - smoothstep(0.645, 0.655, abs(p.x));
  vec3 handCol = mix(lucidSkinTone, lucidGlove, glove);
  vec3 col = suit * suitW * (1.0 - hairShell) + headCol * head + handCol * hand + lucidBoot * foot + hairCol * hairShell;
  // Buoyancy aid shell: foam panel colour with a dark side panel and zip.
  float zip = 1.0 - smoothstep(0.004, 0.009, abs(p.x));
  float side = smoothstep(0.11, 0.14, abs(p.x));
  vec3 vestCol = mix(lucidVest, lucidVestTrim, clamp(side + zip * step(p.z, 0.0), 0.0, 1.0));
  col += vestCol * vestR;
  suitW *= 1.0 - hairShell;
  float skinW = head * (1.0 - cap) + hand * (1.0 - glove);
  lucidRough = mix(mix(0.62, 0.34, lucidWet), mix(0.5, 0.3, lucidWet), skinW);
  lucidRough = mix(lucidRough, 0.72, foot);
  lucidRough = mix(lucidRough, mix(0.6, 0.4, lucidWet), vestR);
  lucidRough = mix(lucidRough, mix(0.5, 0.32, lucidWet), max(hairShell, head * cap));
  lucidSheenMask = suitW * (1.0 - lucidWet);
  return col * mix(1.0, 0.82, lucidWet * (1.0 - skinW));
}
`)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * lucidAlbedo(), opacity );')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = lucidRough;')
        .replace('#include <clearcoat_normal_fragment_begin>', '#include <clearcoat_normal_fragment_begin>');
    };
    material.customProgramCacheKey = () => `lucid-crew-v2:${vest ? 'vest' : 'body'}`;
    // Wet neoprene carries a clear water film.
    material.userData.lucidUniforms = uniforms;
    return material;
  }

  private makeDepthMaterial(uniforms: Record<string, { value: any }>): any {
    const T = three() as any;
    if (!T.MeshDepthMaterial) return null;
    const depth = new T.MeshDepthMaterial({ depthPacking: 3201 });
    const chunks = this.skinningChunks();
    depth.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${chunks.pars}`)
        .replace('#include <begin_vertex>', chunks.begin);
    };
    depth.customProgramCacheKey = () => 'lucid-crew-depth-v1';
    return depth;
  }

  // ------------------------------------------------------------ instances

  private createInstance(id: 'helm' | 'crew', actor: any): Instance {
    const T = three();
    const asset = this.asset!;
    const retarget = new LucidRetarget(asset);
    const drivers = new CanonicalClusterDrivers(retarget.body);
    // Her proportions drive the legacy crew IK (hands on tiller/sheets, feet in straps).
    const dims = retarget.legacyDims();
    actor.L = { ...actor.L, uarm: dims.uarm, farm: dims.farm, hand: dims.hand, thigh: dims.thigh, shin: dims.shin, ankleH: dims.ankleH, torso: dims.torso, neck: dims.neck, shX: dims.shX, hipX: dims.hipX, shY: dims.shY };
    if (actor.human?.P) {
      Object.assign(actor.human.P, {
        hipsY: dims.hipsY, spineY: dims.spineY, chestY: dims.chestY, neckY: dims.neckY, headY: dims.headY, headTop: dims.headTop,
        shoulderY: dims.shoulderY, shoulderX: dims.shX, upperArm: dims.uarm, foreArm: dims.farm, handLen: dims.hand,
        hipX: dims.hipX, thigh: dims.thigh, shin: dims.shin, ankleH: dims.ankleH,
      });
    }
    const nc = asset.header.clusters.length;
    const texData = new Float32Array(4 * nc * 4);
    const texture = new T.DataTexture(texData, 4, nc, GL.RGBAFormat, GL.FloatType);
    texture.magFilter = texture.minFilter = GL.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    const o = OUTFITS[id]!;
    const color = (hex: number) => new T.Color(hex);
    const uniforms: Record<string, { value: any }> = {
      lucidClusters: { value: texture },
      lucidSuit: { value: color(o.suit) }, lucidAccent: { value: color(o.accent) },
      lucidSkinTone: { value: color(0xc68e6e) }, lucidBoot: { value: color(0x17181b) },
      lucidGlove: { value: color(0x2b2e33) }, lucidHair: { value: color(o.hair) },
      lucidVest: { value: color(o.vest) }, lucidVestTrim: { value: color(o.vestTrim) },
      lucidWet: { value: 0 },
    };
    const bodyMat = this.makeMaterial(uniforms, false);
    const vestMat = this.makeMaterial(uniforms, true);
    const mesh = new T.Mesh(this.geometry, bodyMat);
    mesh.name = `lucid-female-v4_2-${id}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const vest = new T.Mesh(this.vestGeometry, vestMat);
    vest.name = `lucid-buoyancy-aid-${id}`;
    vest.castShadow = true;
    vest.receiveShadow = true;
    vest.frustumCulled = false;
    const depth = this.makeDepthMaterial(uniforms);
    if (depth) { mesh.customDepthMaterial = depth; vest.customDepthMaterial = depth; }
    const hairMat = this.makeMaterial(uniforms, false);
    const hair = new T.Mesh(this.hairGeometry, hairMat);
    hair.name = `lucid-hair-${id}`;
    hair.castShadow = true;
    hair.receiveShadow = true;
    hair.frustumCulled = false;
    if (depth) hair.customDepthMaterial = depth;
    mesh.userData.foundryLucidCrew = id;
    vest.userData.foundryLucidCrew = id;
    hair.userData.foundryLucidCrew = id;
    // Same frame as the legacy body (boat design frame); legacy visuals hidden.
    const human = actor.human;
    human.group.add(mesh);
    human.group.add(vest);
    human.group.add(hair);
    if (human.mesh) human.mesh.visible = false;
    return {
      id, actor, retarget, drivers, texture, texData, mesh, vest, hair, materials: [bodyMat, vestMat, hairMat], uniforms,
      grip: [{ curl: 0.7, spread: 0, thumb: 0.6 }, { curl: 0.7, spread: 0, thumb: 0.6 }],
      lastError: null,
    };
  }

  private gripFor(inst: Instance): [GripState, GripState] {
    const agent = this.crewRecovery?.agents.find((a) => a.id === inst.id);
    const task = agent?.task ?? 'sailing';
    const g = (curl: number, spread = 0, thumb = curl * 0.85): GripState => ({ curl, spread, thumb });
    switch (task) {
      case 'hangBoard': case 'climbBoard': case 'climbHull': case 'holdStrap': case 'holdGunwale': case 'climbIn': case 'bracing':
        return [g(0.92), g(0.92)];
      case 'swimToBoard': case 'swimToHull': case 'swimToCockpit': case 'swimToGunwale':
        return [g(0.22, 0.05, 0.1), g(0.22, 0.05, 0.1)];
      case 'treading': case 'falling': return [g(0.3, 0.3, 0.2), g(0.3, 0.3, 0.2)];
      case 'standBoard': case 'standHull': return [g(0.85), g(0.85)];
      default: return [g(0.78), g(0.78)];
    }
  }

  private pose(inst: Instance): void {
    const human = inst.actor.human;
    try {
      const look = this.lookDirection(human);
      inst.retarget.solve(human.cur, look, this.gripFor(inst));
      inst.drivers.evaluate(inst.retarget.P, inst.retarget.G, inst.retarget.twist);
      const D = inst.drivers.D, Tt = inst.drivers.T, data = inst.texData;
      const nc = inst.drivers.nc;
      for (let c = 0; c < nc; c++) {
        const b = c * 16;
        // columns of the affine map x' = D·x + T (row-major D)
        data[b] = D[c * 9]!; data[b + 1] = D[c * 9 + 3]!; data[b + 2] = D[c * 9 + 6]!; data[b + 3] = 0;
        data[b + 4] = D[c * 9 + 1]!; data[b + 5] = D[c * 9 + 4]!; data[b + 6] = D[c * 9 + 7]!; data[b + 7] = 0;
        data[b + 8] = D[c * 9 + 2]!; data[b + 9] = D[c * 9 + 5]!; data[b + 10] = D[c * 9 + 8]!; data[b + 11] = 0;
        data[b + 12] = Tt[c * 3]!; data[b + 13] = Tt[c * 3 + 1]!; data[b + 14] = Tt[c * 3 + 2]!; data[b + 15] = 1;
      }
      inst.texture.needsUpdate = true;
      const agent = this.crewRecovery?.agents.find((a) => a.id === inst.id);
      inst.uniforms.lucidWet!.value = agent ? Math.max(0, Math.min(1, agent.wetness)) : 0;
      // clearcoat stays > 0 so the program never switches (wet film on neoprene/skin).
      for (const m of inst.materials) m.clearcoat = 0.04 + 0.7 * inst.uniforms.lucidWet!.value;
      inst.lastError = null;
    } catch (error) {
      inst.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  /** Head forward from the legacy head bone (legacy rest look is +z). */
  private lookDirection(human: any): number[] | null {
    const bone = human.bones?.head;
    if (!bone) return null;
    const q = bone.quaternion;
    // Compose the bone chain's local rotations up to the human root.
    let x = 0, y = 0, z = 1;
    let b = bone;
    while (b && b !== human.mesh && b.isBone) {
      const r = b.quaternion;
      const ix = r.w * x + r.y * z - r.z * y, iy = r.w * y + r.z * x - r.x * z, iz = r.w * z + r.x * y - r.y * x, iw = -r.x * x - r.y * y - r.z * z;
      x = ix * r.w + iw * -r.x + iy * -r.z - iz * -r.y;
      y = iy * r.w + iw * -r.y + iz * -r.x - ix * -r.z;
      z = iz * r.w + iw * -r.z + ix * -r.y - iy * -r.x;
      b = b.parent;
    }
    void q;
    return [x, y, z];
  }

  update(_dt: number): void {
    if (!this.enabled || !this.instances.length) return;
    const t0 = performance.now();
    for (const inst of this.instances) this.pose(inst);
    this.solveMs = performance.now() - t0;
    this.frames++;
  }

  telemetry(): Record<string, unknown> {
    return {
      status: this.status,
      character: this.asset?.header.character ?? null,
      canonicalSkinSha256: this.asset?.header.provenance.canonicalSkinSha256 ?? null,
      instances: this.instances.map((i) => ({ id: i.id, lastError: i.lastError, clampEvents: i.retarget.clampEvents.count })),
      solveMs: +this.solveMs.toFixed(3),
      frames: this.frames,
      vestTriangles: this.vestGeometry ? this.vestGeometry.index.count / 3 : 0,
    };
  }
}
