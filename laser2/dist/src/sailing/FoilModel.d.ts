import type { WaterSampler, AirSampler } from './HullHydrostatics.js';
export interface FoilSpec {
    name: 'board' | 'rudder';
    /** Design-frame root (top) and tip (bottom) of the quarter-chord line. */
    rootY: number;
    tipY: number;
    z: number;
    chord: number;
    stallDeg: number;
    cd0: number;
    oswald: number;
    /** Chordwise offset of the centre of pressure aft of the reference line (m). */
    cpAftM: number;
    strips: number;
}
export interface FoilState {
    liftN: number;
    dragN: number;
    crossflowN: number;
    maxAlphaDeg: number;
    immersed01: number;
    stalled: boolean;
    hingeMomentNm: number;
}
export declare const emptyFoilState: () => FoilState;
export interface BodyForceSink {
    /** Adds a world force at a world point to the hull body. */
    addForceAt(fx: number, fy: number, fz: number, px: number, py: number, pz: number): void;
}
export interface FoilPose {
    px: number;
    py: number;
    pz: number;
    /** Rotation matrix rows (body → world). */
    r: Float64Array;
    vx: number;
    vy: number;
    vz: number;
    wx: number;
    wy: number;
    wz: number;
    /** Body reference offset subtracted from design coordinates. */
    refY: number;
    refZ: number;
}
export declare class FoilModel {
    readonly spec: FoilSpec;
    readonly state: FoilState;
    /** Deployment 0..1 (fraction of span lowered). */
    deployment: number;
    private readonly sample;
    private readonly air;
    constructor(spec: FoilSpec);
    get area(): number;
    /** Design-frame point on the foil at span fraction s (0 root, 1 tip). */
    pointDesign(s: number): {
        x: number;
        y: number;
        z: number;
    };
    apply(pose: FoilPose, angleRad: number, water: WaterSampler, air: AirSampler | null, sink: BodyForceSink): FoilState;
}
//# sourceMappingURL=FoilModel.d.ts.map