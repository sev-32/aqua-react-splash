import { QUALITY_PROFILES } from './QualityProfiles.js';
export class QualityManager {
    profile;
    listeners = new Set();
    constructor(id = 'balanced') {
        this.profile = QUALITY_PROFILES.find((candidate) => candidate.id === id) ?? QUALITY_PROFILES[2];
    }
    get current() { return this.profile; }
    list() { return QUALITY_PROFILES; }
    set(id) {
        const next = QUALITY_PROFILES.find((candidate) => candidate.id === id);
        if (!next)
            throw new Error(`Unknown quality profile: ${id}`);
        this.profile = next;
        for (const listener of this.listeners)
            listener(next);
        return next;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}
//# sourceMappingURL=QualityManager.js.map