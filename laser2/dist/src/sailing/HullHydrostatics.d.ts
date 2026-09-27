import type { HullMesh } from './HullGeometry.js';
export interface WaterSampler {
    height(x: number, z: number): number;
    sample(x: number, y: number, z: number, out: {
        height: number;
        vx: number;
        vy: number;
        vz: number;
    }): {
        height: number;
        vx: number;
        vy: number;
        vz: number;
    };
}
export interface AirSampler {
    /** Air velocity (m/s) at world point; writes into out. */
    velocity(x: number, y: number, z: number, out: {
        x: number;
        y: number;
        z: number;
    }): {
        x: number;
        y: number;
        z: number;
    };
}
export interface RigidPose {
    px: number;
    py: number;
    pz: number;
    qx: number;
    qy: number;
    qz: number;
    qw: number;
    vx: number;
    vy: number;
    vz: number;
    wx: number;
    wy: number;
    wz: number;
}
export interface HydroCoefficients {
    rhoWater: number;
    rhoAir: number;
    g: number;
    /** Linear pressure-drag coefficient (Pa per m/s of normal advance). */
    pressureLinear: number;
    /** Quadratic pressure-drag coefficient (Pa per (m/s)²). */
    pressureQuadratic: number;
    /** Suction coefficients for retreating faces. */
    suctionLinear: number;
    suctionQuadratic: number;
    /** Exponent on |cos θ| between face normal and relative flow. */
    pressureFalloff: number;
    suctionFalloff: number;
    /** Multiplier on ITTC-57 skin friction. */
    frictionScale: number;
    /** Reference length for the Reynolds number (m). */
    frictionLength: number;
    kinematicViscosity: number;
    /** Aerodynamic normal-force coefficient for dry faces. */
    airPressureCoefficient: number;
    /** Clamp on the per-face dynamic pressure contribution (Pa) for robustness. */
    maxFacePressure: number;
    /**
     * Fraction of the along-hull (surge) relative velocity that produces face
     * pressure drag. A fair hull is streamlined longitudinally (d'Alembert: the
     * bow stagnation pressure is recovered aft); its surge resistance is skin
     * friction plus wave-making, modelled separately. Heave, roll and sideslip
     * remain fully bluff.
     */
    longitudinalPressureFactor: number;
    /**
     * ITTC form factor k: the viscous pressure (form) drag of a fair hull in
     * surge, as a fraction of its flat-plate friction (applied as (1+k)·Cf).
     */
    formFactor: number;
}
export declare const DEFAULT_HYDRO_COEFFICIENTS: HydroCoefficients;
export interface HydroResult {
    fx: number;
    fy: number;
    fz: number;
    /** Torque about the rigid-body position. */
    tx: number;
    ty: number;
    tz: number;
    buoyancyN: number;
    submergedVolume: number;
    /** Centre of buoyancy (world). */
    cobX: number;
    cobY: number;
    cobZ: number;
    wettedArea: number;
    dryArea: number;
    pressureDragN: number;
    frictionN: number;
    windageN: number;
    wetTriangles: number;
    clippedTriangles: number;
    /** Mean water elevation over the wetted faces' waterline samples. */
    meanWaterline: number;
}
export declare function emptyHydroResult(): HydroResult;
/**
 * Integrates hydrostatic + hydrodynamic loads on the hull mesh. The mesh is
 * given in the rigid-body frame (design frame minus the body reference).
 */
export declare class HullHydrostatics {
    readonly mesh: HullMesh;
    readonly vertexCount: number;
    private readonly wx;
    private readonly wy;
    private readonly wz;
    private readonly depth;
    private readonly waterVx;
    private readonly waterVy;
    private readonly waterVz;
    private readonly sampleOut;
    private readonly airOut;
    private readonly poly;
    coefficients: HydroCoefficients;
    constructor(mesh: HullMesh, coefficients?: Partial<HydroCoefficients>);
    /** World-space vertex positions of the last evaluation (for debugging/visuals). */
    get worldX(): Float64Array;
    get worldY(): Float64Array;
    get worldZ(): Float64Array;
    get vertexDepth(): Float64Array;
    compute(pose: RigidPose, water: WaterSampler, air: AirSampler | null, out: HydroResult, options?: {
        dynamics?: boolean;
    }): HydroResult;
    private applyWindage;
}
//# sourceMappingURL=HullHydrostatics.d.ts.map