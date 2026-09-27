import type { AppContext, AppSystem } from '../core/System.js';
import type { CatalogItem } from './ObjectCatalogSystem.js';
export type SailingCameraMode = 'follow' | 'chase' | 'crew';
/** Optional sailing bindings supplied by main (kept free of system imports). */
export interface SailingCameraBindings {
    /** Water surface height at (x, z) (m). */
    waterHeight(x: number, z: number): number;
    /** Crew member worth watching (a swimmer, or the helm), world position. */
    crewFocus(): {
        x: number;
        y: number;
        z: number;
    } | null;
}
export declare class CameraControllerSystem implements AppSystem {
    readonly id = "inspection.camera";
    readonly phase: "preRender";
    enabled: boolean;
    yaw: number;
    pitch: number;
    distance: number;
    target: any;
    private dragging;
    private button;
    private lastX;
    private lastY;
    private canvas;
    private context;
    private sailingBindings;
    private sailingActive;
    /** Chase mode: user orbit offset relative to the boat's stern (rad). */
    private chaseYawOffset;
    private lastCamMode;
    private smoothedHeading;
    private waterClamps;
    bindSailing(bindings: SailingCameraBindings): this;
    get sailingMode(): SailingCameraMode;
    init(context: AppContext): void;
    update(dtSeconds: number, context: AppContext): void;
    /** Sailing: keep the boat (or a swimmer) framed while it travels. */
    private follow;
    focus(item: CatalogItem): void;
    setView(view: 'port' | 'starboard' | 'bow' | 'stern' | 'top' | 'rig'): void;
    private installInput;
    private apply;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=CameraControllerSystem.d.ts.map