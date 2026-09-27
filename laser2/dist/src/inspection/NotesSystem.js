export class NotesSystem {
    id = 'inspection.notes';
    phase = 'ui';
    enabled = true;
    key = 'laser2-lighting-foundry-v1-notes';
    notes = new Map();
    init(_context) {
        try {
            const parsed = JSON.parse(localStorage.getItem(this.key) ?? '{}');
            for (const [id, note] of Object.entries(parsed))
                this.notes.set(id, note);
        }
        catch (error) {
            console.warn('Unable to load notes', error);
        }
    }
    get(id) {
        return this.notes.get(id) ?? { status: 'unreviewed', text: '', tags: [], updatedAt: '' };
    }
    set(id, patch) {
        const next = { ...this.get(id), ...patch, updatedAt: new Date().toISOString() };
        this.notes.set(id, next);
        this.persist();
        return next;
    }
    export() {
        return Object.fromEntries(this.notes);
    }
    persist() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.export()));
        }
        catch (error) {
            console.warn('Unable to persist notes', error);
        }
    }
    telemetry() {
        const statuses = {};
        for (const note of this.notes.values())
            statuses[note.status] = (statuses[note.status] ?? 0) + 1;
        return { notes: this.notes.size, statuses };
    }
}
//# sourceMappingURL=NotesSystem.js.map