export class GpuTimer {
    supported;
    reason;
    gl;
    ext;
    pending = [];
    active = null;
    frame = 0;
    samples = [];
    constructor(gl) {
        if (!(gl instanceof WebGL2RenderingContext)) {
            this.gl = null;
            this.ext = null;
            this.supported = false;
            this.reason = 'WebGL2 timer queries unavailable';
            return;
        }
        this.gl = gl;
        this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
        this.supported = !!this.ext;
        this.reason = this.ext ? null : 'EXT_disjoint_timer_query_webgl2 unavailable';
    }
    begin(label) {
        if (!this.supported || !this.gl || this.active)
            return false;
        const query = this.gl.createQuery();
        if (!query)
            return false;
        this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
        this.active = { label, query, startedFrame: this.frame };
        return true;
    }
    end() {
        if (!this.active || !this.gl)
            return;
        this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
        this.pending.push(this.active);
        this.active = null;
    }
    poll() {
        this.frame++;
        if (!this.supported || !this.gl)
            return [];
        const newSamples = [];
        const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
        for (let i = this.pending.length - 1; i >= 0; i--) {
            const pending = this.pending[i];
            if (!pending)
                continue;
            const available = this.gl.getQueryParameter(pending.query, this.gl.QUERY_RESULT_AVAILABLE);
            if (!available)
                continue;
            this.pending.splice(i, 1);
            const nanoseconds = this.gl.getQueryParameter(pending.query, this.gl.QUERY_RESULT);
            this.gl.deleteQuery(pending.query);
            if (!disjoint && Number.isFinite(nanoseconds)) {
                const sample = { label: pending.label, milliseconds: nanoseconds / 1e6, frame: this.frame };
                this.samples.push(sample);
                if (this.samples.length > 120)
                    this.samples.shift();
                newSamples.push(sample);
            }
        }
        return newSamples;
    }
    snapshot() {
        return {
            supported: this.supported,
            reason: this.reason,
            pending: this.pending.length,
            samples: this.samples.slice(-30),
        };
    }
}
//# sourceMappingURL=GpuTimer.js.map