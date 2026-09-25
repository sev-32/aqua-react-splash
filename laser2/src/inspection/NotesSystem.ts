import type { AppContext, AppSystem } from '../core/System.js';

export interface PartNote {
  status: 'unreviewed' | 'correct' | 'incorrect' | 'question';
  text: string;
  tags: string[];
  updatedAt: string;
}

export class NotesSystem implements AppSystem {
  readonly id = 'inspection.notes';
  readonly phase = 'ui' as const;
  enabled = true;
  private readonly key = 'laser2-lighting-foundry-v1-notes';
  private readonly notes = new Map<string, PartNote>();

  init(_context: AppContext): void {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.key) ?? '{}') as Record<string, PartNote>;
      for (const [id, note] of Object.entries(parsed)) this.notes.set(id, note);
    } catch (error) {
      console.warn('Unable to load notes', error);
    }
  }

  get(id: string): PartNote {
    return this.notes.get(id) ?? { status: 'unreviewed', text: '', tags: [], updatedAt: '' };
  }

  set(id: string, patch: Partial<PartNote>): PartNote {
    const next: PartNote = { ...this.get(id), ...patch, updatedAt: new Date().toISOString() };
    this.notes.set(id, next);
    this.persist();
    return next;
  }

  export(): Record<string, PartNote> {
    return Object.fromEntries(this.notes);
  }

  private persist(): void {
    try { localStorage.setItem(this.key, JSON.stringify(this.export())); }
    catch (error) { console.warn('Unable to persist notes', error); }
  }

  telemetry(): Record<string, unknown> {
    const statuses: Record<string, number> = {};
    for (const note of this.notes.values()) statuses[note.status] = (statuses[note.status] ?? 0) + 1;
    return { notes: this.notes.size, statuses };
  }
}
