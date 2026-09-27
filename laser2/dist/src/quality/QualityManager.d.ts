import { type QualityProfile } from './QualityProfiles.js';
export declare class QualityManager {
    private profile;
    private readonly listeners;
    constructor(id?: QualityProfile['id']);
    get current(): QualityProfile;
    list(): readonly QualityProfile[];
    set(id: QualityProfile['id']): QualityProfile;
    subscribe(listener: (profile: QualityProfile) => void): () => void;
}
//# sourceMappingURL=QualityManager.d.ts.map