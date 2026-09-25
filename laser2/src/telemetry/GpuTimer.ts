interface PendingQuery {
  label: string;
  query: WebGLQuery;
  startedFrame: number;
}

export interface GpuTimerSample {
  label: string;
  milliseconds: number;
  frame: number;
}

export class GpuTimer {
  readonly supported: boolean;
  readonly reason: string | null;
  private readonly gl: WebGL2RenderingContext | null;
  private readonly ext: any;
  private readonly pending: PendingQuery[] = [];
  private active: PendingQuery | null = null;
  private frame = 0;
  private readonly samples: GpuTimerSample[] = [];

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext | null) {
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

  begin(label: string): boolean {
    if (!this.supported || !this.gl || this.active) return false;
    const query = this.gl.createQuery();
    if (!query) return false;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.active = { label, query, startedFrame: this.frame };
    return true;
  }

  end(): void {
    if (!this.active || !this.gl) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  poll(): readonly GpuTimerSample[] {
    this.frame++;
    if (!this.supported || !this.gl) return [];
    const newSamples: GpuTimerSample[] = [];
    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT) as boolean;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const pending = this.pending[i];
      if (!pending) continue;
      const available = this.gl.getQueryParameter(pending.query, this.gl.QUERY_RESULT_AVAILABLE) as boolean;
      if (!available) continue;
      this.pending.splice(i, 1);
      const nanoseconds = this.gl.getQueryParameter(pending.query, this.gl.QUERY_RESULT) as number;
      this.gl.deleteQuery(pending.query);
      if (!disjoint && Number.isFinite(nanoseconds)) {
        const sample = { label: pending.label, milliseconds: nanoseconds / 1e6, frame: this.frame };
        this.samples.push(sample);
        if (this.samples.length > 120) this.samples.shift();
        newSamples.push(sample);
      }
    }
    return newSamples;
  }

  snapshot(): Record<string, unknown> {
    return {
      supported: this.supported,
      reason: this.reason,
      pending: this.pending.length,
      samples: this.samples.slice(-30),
    };
  }
}
