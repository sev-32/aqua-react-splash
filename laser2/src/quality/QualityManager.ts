import { QUALITY_PROFILES, type QualityProfile } from './QualityProfiles.js';

export class QualityManager {
  private profile: QualityProfile;
  private readonly listeners = new Set<(profile: QualityProfile) => void>();

  constructor(id: QualityProfile['id'] = 'balanced') {
    this.profile = QUALITY_PROFILES.find((candidate) => candidate.id === id) ?? QUALITY_PROFILES[2]!;
  }

  get current(): QualityProfile { return this.profile; }
  list(): readonly QualityProfile[] { return QUALITY_PROFILES; }

  set(id: QualityProfile['id']): QualityProfile {
    const next = QUALITY_PROFILES.find((candidate) => candidate.id === id);
    if (!next) throw new Error(`Unknown quality profile: ${id}`);
    this.profile = next;
    for (const listener of this.listeners) listener(next);
    return next;
  }

  subscribe(listener: (profile: QualityProfile) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
