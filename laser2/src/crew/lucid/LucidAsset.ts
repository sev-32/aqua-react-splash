// Loader for the exported LUCID female-skin-v4.2 crew asset
// (tools/build_lucid_crew_asset.py): canonical mesh, Skin78 influences,
// Semantic51 skeleton and DOF table, declared hand layer, body profile.

export interface SemanticDof {
  id: string;
  joint: number;
  family: string;
  axis: [number, number, number];
  min: number;
  max: number;
}

export interface HandDof {
  id: string;
  joint: number;
  dof: string;
  axis: [number, number, number];
  min: number;
  max: number;
  comfortMin: number;
  comfortMax: number;
}

export interface GripProfile {
  sourceActivity01: Record<string, number>;
  multipliers: Record<string, number>;
  mode: string;
}

export interface LucidHeader {
  schema: string;
  character: string;
  status: string;
  provenance: { canonicalSkinSha256: string; statement: string };
  vertexCount: number;
  triangleCount: number;
  maxInfluences: number;
  sections: Array<{ name: string; offset: number; bytes: number; dtype: string; shape: number[] }>;
  joints: string[];
  parents: number[];
  restJoints: Array<[number, number, number]>;
  clusters: string[];
  clusterPivots: Array<[number, number, number]>;
  frame: { left: number[]; up: number[]; forward: number[] };
  semantic51: SemanticDof[];
  handDofs: HandDof[];
  gripProfiles: Record<string, GripProfile>;
  body: { massKg: number; segments: Array<{ body: string; joint: string; massKg: number; centerWorldRestM: number[] }>; centerOfMassRestM: number[] };
}

export interface LucidAsset {
  header: LucidHeader;
  position: Float32Array;
  normal: Float32Array;
  skinIndex: Uint8Array;
  skinWeight: Float32Array;
  region: Uint8Array;
  index: Uint16Array;
  jointIndex: Map<string, number>;
}

let pending: Promise<LucidAsset> | null = null;

export function loadLucidAsset(base = 'assets/lucid/lucid_female_v4_2'): Promise<LucidAsset> {
  if (pending) return pending;
  pending = (async () => {
    const [headerRes, binRes] = await Promise.all([fetch(`${base}.json`), fetch(`${base}.bin`)]);
    if (!headerRes.ok || !binRes.ok) throw new Error(`LUCID crew asset unavailable (${headerRes.status}/${binRes.status})`);
    const header = (await headerRes.json()) as LucidHeader;
    const buffer = await binRes.arrayBuffer();
    const section = (name: string) => {
      const s = header.sections.find((x) => x.name === name);
      if (!s) throw new Error(`LUCID asset section missing: ${name}`);
      return s;
    };
    const f32 = (name: string) => { const s = section(name); return new Float32Array(buffer, s.offset, s.bytes / 4); };
    const u8 = (name: string) => { const s = section(name); return new Uint8Array(buffer, s.offset, s.bytes); };
    const u16 = (name: string) => { const s = section(name); return new Uint16Array(buffer, s.offset, s.bytes / 2); };
    return {
      header,
      position: f32('position'),
      normal: f32('normal'),
      skinIndex: u8('skinIndex'),
      skinWeight: f32('skinWeight'),
      region: u8('region'),
      index: u16('index'),
      jointIndex: new Map(header.joints.map((n, i) => [n, i])),
    };
  })();
  pending.catch(() => { pending = null; });
  return pending;
}
