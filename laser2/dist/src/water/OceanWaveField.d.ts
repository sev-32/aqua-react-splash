import type { WaveComponent } from './OceanSpectrum.js';
export interface WaveSample {
    height: number;
    vx: number;
    vy: number;
    vz: number;
}
export interface OceanFieldStats {
    sliceBuilds: number;
    gridQueries: number;
    analyticQueries: number;
    recenters: number;
    lastSliceMs: number;
    meanSliceMs: number;
}
export declare class OceanWaveField {
    components: WaveComponent[];
    /** Wavenumber of the spectral peak, used for depth attenuation of orbital velocity. */
    peakK: number;
    readonly nx: number;
    readonly nz: number;
    readonly spacing: number;
    /** Lagrangian grid border (cells) so the inverse never leaves the rest grid. */
    private readonly border;
    private originX;
    private originZ;
    private readonly lagrangian;
    private sliceA;
    private sliceB;
    private blend;
    private valid;
    private readonly sinA;
    private readonly cosA;
    private readonly sinB;
    private readonly cosB;
    private readonly scratch;
    readonly stats: OceanFieldStats;
    /** Uniform vertical offset (m); still-water level. */
    seaLevel: number;
    constructor(options?: {
        nx?: number;
        nz?: number;
        spacing?: number;
    });
    /**
     * Replaces the component set. `rebuild` invalidates both time slices (new sea
     * state); cross-fade weight updates pass false so only the next slice picks
     * up the new amplitudes and the grid is not rebuilt every step.
     */
    setComponents(components: WaveComponent[], peakK: number, rebuild?: boolean): void;
    get extentM(): number;
    get centerX(): number;
    get centerZ(): number;
    get isValid(): boolean;
    /**
     * Ensures the two time slices cover [t0, t1]. `focusX/Z` recentres the grid
     * (snapped to the spacing) when the region of interest nears an edge.
     */
    advance(t0: number, t1: number, focusX: number, focusZ: number): void;
    /** True when the current slices span [t0, t1] around a still-centred focus. */
    covers(t0: number, t1: number, focusX: number, focusZ: number): boolean;
    /** Selects the time inside the current [t0, t1] window used by queries. */
    setQueryTime(t: number): void;
    get queryTime(): number;
    private buildSlice;
    private buildLagrangian;
    private lagrangianLookup;
    private eulerianLookup;
    /**
     * Copies the grid elevations (still-water level included) at the end of the
     * current step window into `out` (nx·nz floats, row-major in z). Used by
     * the GPU interaction solver to measure hull immersion against the exact
     * physics surface. Returns false before the first slice exists.
     */
    copyEndHeights(out: Float32Array): boolean;
    get gridOriginX(): number;
    get gridOriginZ(): number;
    /** Surface elevation at world (x, z). */
    height(x: number, z: number): number;
    /**
     * Elevation and water velocity at (x, y, z). Orbital velocity decays below
     * the local surface with the spectral peak wavenumber (e^{k·(y-η)}).
     */
    sample(x: number, y: number, z: number, out: WaveSample): WaveSample;
    /** Exact analytic elevation (fixed-point inverse of the Gerstner map). */
    analyticHeight(x: number, z: number, time: number): number;
    /** Analytic channels in Lagrangian layout (dx, dz, h, vx, vy, vz) at world (x, z). */
    analyticSample(x: number, z: number, time: number, out: Float64Array): void;
}
//# sourceMappingURL=OceanWaveField.d.ts.map