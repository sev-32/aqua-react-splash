import type { AppContext, AppSystem } from '../core/System.js';
export interface MaterialRecord {
    id: number;
    name: string;
    type: string;
    meshNames: string[];
    category: 'sailcloth' | 'vinyl' | 'aluminum' | 'gelcoat' | 'deck' | 'rope' | 'water' | 'crew' | 'other';
    roughness: number | null;
    metalness: number | null;
    transmission: number | null;
}
export declare class MaterialRegistrySystem implements AppSystem {
    readonly id = "lighting.material-registry";
    readonly phase: "postPhysics";
    enabled: boolean;
    readonly records: MaterialRecord[];
    init(context: AppContext): void;
    rebuild(context: AppContext): void;
    private classify;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=MaterialRegistrySystem.d.ts.map