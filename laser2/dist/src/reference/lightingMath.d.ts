export interface Vec3Like {
    x: number;
    y: number;
    z: number;
}
export interface Rgb {
    r: number;
    g: number;
    b: number;
}
export declare function clamp(value: number, minimum: number, maximum: number): number;
export declare function sunDirectionFromAngles(elevationDeg: number, azimuthDeg: number): Vec3Like;
export declare function airMass(elevationDeg: number): number;
export declare function approximateSunRgb(elevationDeg: number, turbidity: number): Rgb;
export declare function thinSheetTransmission(incident: Rgb, baseColor: Rgb, transmittance: number, absorption: number, shadowVisibility: number, cosIncidence: number): Rgb;
export declare function exposureMultiplier(ev100: number): number;
export declare function luminance(rgb: Rgb): number;
//# sourceMappingURL=lightingMath.d.ts.map