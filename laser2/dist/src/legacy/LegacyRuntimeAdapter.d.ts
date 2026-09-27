export interface LegacyRuntimeHandles {
    master: any;
    renderer: any;
    scene: any;
    camera: any;
    body: any;
    simulation: any;
    rigV16: any;
    ropeV16: any;
    sailOpticsV17: any;
    spreaderV17: any;
    standingRigCollisionV17: any;
}
export declare class LegacyRuntimeAdapter {
    private handles;
    private initialized;
    private anchorPosition;
    private anchorQuaternion;
    private dynamicRequested;
    private sailing;
    private simulationSteps;
    private legacyFrameAuthorityFrozen;
    private compatibilityBootstrapFrames;
    init(timeoutMs?: number): Promise<void>;
    private configureCompatibilityBoundary;
    private bootstrapCompatibilityGeometry;
    get master(): any;
    get renderer(): any;
    get scene(): any;
    get camera(): any;
    get body(): any;
    get simulation(): any;
    get rigV16(): any;
    get ropeV16(): any;
    get sailOpticsV17(): any;
    get spreaderV17(): any;
    get standingRigCollisionV17(): any;
    get gl(): WebGLRenderingContext | WebGL2RenderingContext | null;
    freezeLegacyFrameAuthority(): void;
    setDynamic(enabled: boolean): void;
    /**
     * Sailing releases the kinematic anchor: the hull becomes a free rigid body
     * driven by the native ocean/hydrodynamics authorities. Leaving sailing
     * restores the legacy start snapshot before re-anchoring, so the rig never
     * snaps across the distance the boat has sailed.
     */
    setSailing(enabled: boolean): void;
    get isSailing(): boolean;
    step(steps?: number): void;
    stepDynamicFrame(): void;
    enforceAnchor(): void;
    setLegacyHudVisible(visible: boolean): void;
    frameAuthorityTelemetry(): Record<string, unknown>;
    inventory(): Record<string, unknown>;
    private requireHandles;
}
//# sourceMappingURL=LegacyRuntimeAdapter.d.ts.map