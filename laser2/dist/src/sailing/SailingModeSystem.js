// Sailing mode orchestration: installs the native ocean and hull authorities
// (and anything registered with `addAuthority`) when the Foundry enters
// 'sailing', and removes them again for inspection/anchored lab work.
export class SailingModeSystem {
    id = 'sailing.mode';
    phase = 'prePhysics';
    enabled = true;
    authorities = [];
    context = null;
    active = false;
    transitions = 0;
    resets = 0;
    lastError = null;
    /** Wind applied when sailing starts (knots, degrees "from"). */
    startWindKnots = 12;
    startWindFromDeg = 0;
    addAuthority(authority) {
        this.authorities.push(authority);
        return this;
    }
    init(context) {
        this.context = context;
        context.events.on('mode:change', ({ mode }) => this.apply(mode));
        context.events.on('sailing:reset', () => {
            if (!this.active)
                return;
            this.resets++;
            for (const authority of this.authorities) {
                try {
                    authority.onSailingReset?.(context);
                }
                catch (error) {
                    this.recordError(authority.id, error);
                }
            }
        });
        this.apply(context.state.get().mode);
    }
    apply(mode) {
        const context = this.context;
        if (!context)
            return;
        const want = mode === 'sailing';
        if (want === this.active)
            return;
        this.transitions++;
        if (want) {
            const sim = context.legacy.simulation;
            sim.setWind?.(this.startWindKnots, this.startWindFromDeg);
            for (const authority of this.authorities) {
                try {
                    authority.install(context);
                }
                catch (error) {
                    this.recordError(authority.id, error);
                }
            }
        }
        else {
            for (const authority of [...this.authorities].reverse()) {
                try {
                    authority.uninstall(context);
                }
                catch (error) {
                    this.recordError(authority.id, error);
                }
            }
        }
        this.active = want;
        context.requestRender(want ? 'sailing authorities installed' : 'sailing authorities removed');
    }
    recordError(id, error) {
        this.lastError = `${id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error('Sailing authority failed', id, error);
        this.context?.telemetry.recordError(`sailing:${id}`, error);
    }
    get isActive() { return this.active; }
    telemetry() {
        return {
            active: this.active,
            authorities: this.authorities.map((authority) => authority.id),
            transitions: this.transitions,
            resets: this.resets,
            lastError: this.lastError,
            startWind: { knots: this.startWindKnots, fromDeg: this.startWindFromDeg },
        };
    }
}
//# sourceMappingURL=SailingModeSystem.js.map