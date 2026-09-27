export interface WaveComponent {
    /** Unit propagation direction (world XZ). */
    dirX: number;
    dirZ: number;
    /** Wavenumber (rad/m). */
    k: number;
    /** Angular frequency (rad/s), deep-water dispersion. */
    omega: number;
    /** Amplitude (m). */
    amplitude: number;
    /** Gerstner steepness factor Q (dimensionless, 0..1). */
    steepness: number;
    /** Phase offset (rad). */
    phase: number;
}
export interface SeaStateInput {
    /** Mean wind speed at 10 m (m/s). */
    windSpeed10: number;
    /** Wind "from" direction in the legacy convention: vector (-sin θ, 0, cos θ) points upwind. */
    windFromDeg: number;
    /** Fetch length (m); governs wave height/period of the wind sea. */
    fetchM: number;
    /** User scale on wave height (legacy sea slider, 1 = physical). */
    heightScale: number;
    /** Optional long-period swell. */
    swellHeightM: number;
    swellPeriodS: number;
    swellFromDeg: number;
    /** Deterministic seed for phases and directions. */
    seed: number;
    /** Maximum summed Gerstner steepness (<1 avoids crest loops). */
    choppiness: number;
}
export interface SeaState {
    input: SeaStateInput;
    significantHeightM: number;
    peakPeriodS: number;
    peakWavelengthM: number;
    peakWavenumber: number;
    physics: WaveComponent[];
    detail: WaveComponent[];
}
export declare const DEFAULT_SEA_STATE: SeaStateInput;
/** JONSWAP spectral density S(ω) (m²·s) for fetch-limited wind sea. */
export declare function jonswap(omega: number, windSpeed: number, fetchM: number): number;
export declare function peakOmega(windSpeed: number, fetchM: number): number;
export declare function buildSeaState(partial?: Partial<SeaStateInput>): SeaState;
//# sourceMappingURL=OceanSpectrum.d.ts.map