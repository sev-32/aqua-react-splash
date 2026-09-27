export declare const HULL_HALF_LENGTH = 2.2;
export declare const COCKPIT_SOLE_Y = 0.155;
export declare function halfWidth(u: number): number;
export declare function keelY(u: number): number;
export declare function sheerY(u: number): number;
export declare function sectionPower(u: number): number;
export declare const zOfU: (u: number) => number;
export declare const uOfZ: (z: number) => number;
/** Hull shell point for station u and girth parameter t ∈ [-1, 1] (t = ±1 at the sheer). */
export declare function shellPoint(u: number, t: number, out: {
    x: number;
    y: number;
    z: number;
}): {
    x: number;
    y: number;
    z: number;
};
export declare function cockpitBlend(x: number, z: number): number;
export declare function deckY(x: number, z: number): number;
/** Deck height with the cockpit closed over at deck level. */
export declare function sealedDeckY(x: number, z: number): number;
/** Sheer (gunwale) half-breadth including the shell flare term at t = 1. */
export declare const sheerHalfBreadth: (u: number) => number;
export interface HullMesh {
    /** Vertex positions, xyz interleaved. */
    positions: Float64Array;
    /** Triangle vertex indices (outward winding). */
    triangles: Uint32Array;
    volume: number;
    centroid: [number, number, number];
    area: number;
    stations: number;
    verticesPerStation: number;
}
export interface HullMeshOptions {
    stations?: number;
    shellSegments?: number;
    deckSegmentsPerSide?: number;
    /**
     * Close the cockpit at deck level (the hull's outer envelope). Used where
     * the water is displaced by the whole hull (wake/obstacle rendering), not
     * for hydrostatics, where the open cockpit floods.
     */
    sealedCockpit?: boolean;
}
export declare function buildHullMesh(options?: HullMeshOptions): HullMesh;
export declare function signedVolume(pos: Float64Array, tri: Uint32Array): number;
/**
 * Approximate signed distance (m) from a design-frame point to the hull's
 * sealed surface: negative inside. Uses the analytic section at the point's
 * station (a 2D polygon distance) combined with the end planes. Intended for
 * crew/body collision, not hydrostatics.
 */
export declare function hullSignedDistance(x: number, y: number, z: number): number;
/** Closed 2D section polygon (x, y pairs) at station u, quantised for caching. */
export declare function sectionPolygon(u: number): Float64Array;
/** Key crew contact points in the design frame (metres). */
export declare const HULL_POINTS: Readonly<{
    /** Centreboard: case at z = 0.25, root at the keel, tip ~0.95 m below. */
    boardZ: 0.25;
    boardRootY: number;
    boardTipY: number;
    boardChord: 0.55;
    /** Hiking/toe straps run fore-aft along the cockpit sole at x = ±0.22. */
    toeStrapX: 0.22;
    toeStrapY: 0.2;
    toeStrapZ: -0.7;
    /** Transom (stern) plane. */
    transomZ: number;
    rudderZ: -2.18;
}>;
//# sourceMappingURL=HullGeometry.d.ts.map