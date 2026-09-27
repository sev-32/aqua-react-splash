import type { AppContext, AppSystem } from '../core/System.js';
import type { CrewRecoverySystem } from '../crew/CrewRecoverySystem.js';
import type { CameraControllerSystem } from '../inspection/CameraControllerSystem.js';
import type { OceanSystem } from '../water/OceanSystem.js';
export declare class SailingHudSystem implements AppSystem {
    readonly crew: CrewRecoverySystem;
    readonly camera: CameraControllerSystem;
    readonly ocean: OceanSystem;
    readonly id = "ui.sailing-hud";
    readonly phase: "ui";
    enabled: boolean;
    private context;
    private root;
    private body;
    private timer;
    private windKnots;
    private lastStatus;
    private statusSince;
    private clock;
    constructor(crew: CrewRecoverySystem, camera: CameraControllerSystem, ocean: OceanSystem);
    init(context: AppContext): void;
    private buildActions;
    private setWind;
    update(dtSeconds: number): void;
    private status;
    private render;
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=SailingHudSystem.d.ts.map