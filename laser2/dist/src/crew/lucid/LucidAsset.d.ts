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
    provenance: {
        canonicalSkinSha256: string;
        statement: string;
    };
    vertexCount: number;
    triangleCount: number;
    maxInfluences: number;
    sections: Array<{
        name: string;
        offset: number;
        bytes: number;
        dtype: string;
        shape: number[];
    }>;
    joints: string[];
    parents: number[];
    restJoints: Array<[number, number, number]>;
    clusters: string[];
    clusterPivots: Array<[number, number, number]>;
    frame: {
        left: number[];
        up: number[];
        forward: number[];
    };
    semantic51: SemanticDof[];
    handDofs: HandDof[];
    gripProfiles: Record<string, GripProfile>;
    body: {
        massKg: number;
        segments: Array<{
            body: string;
            joint: string;
            massKg: number;
            centerWorldRestM: number[];
        }>;
        centerOfMassRestM: number[];
    };
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
export declare function loadLucidAsset(base?: string): Promise<LucidAsset>;
//# sourceMappingURL=LucidAsset.d.ts.map