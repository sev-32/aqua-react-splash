import type { AppContext, AppSystem } from '../core/System.js';
import { RigStructureSolver } from './RigStructureSolver.js';
export declare class RigStructureSystem implements AppSystem {
    readonly id = "sailing.rig-structure";
    readonly phase: "prePhysics";
    enabled: boolean;
    solver: RigStructureSolver | null;
    private context;
    private removed;
    private patched;
    /** Gooseneck pin aft of the mast axis (m): the boom hangs on a fitting on the mast's aft face. */
    gooseneckAftOffsetM: number;
    private installed;
    private lastError;
    private groups;
    init(context: AppContext): void;
    update(): void;
    install(): void;
    /** Result of the last dock tune (N, m). */
    tune: Record<string, number> | null;
    /**
     * Dock tune: make the as-designed rig (straight mast on its step) the
     * equilibrium of the pre-stressed structure. The shrouds carry the V16
     * standing pretension; the jib halyard is taken up until the luff tension
     * balances their fore-and-aft moment about the mast step; the diamonds keep
     * their V16 pretension. Rest lengths are re-derived from the design geometry
     * so that stale lengths measured after the legacy rig had moved cannot leave
     * the rig slack.
     */
    tuneRig(): void;
    uninstall(): void;
    /** Masthead offset from the extension of the foot→hounds line, body frame (m). */
    mastheadOffset(): {
        sideM: number;
        foreM: number;
    };
    telemetry(): Record<string, unknown>;
}
//# sourceMappingURL=RigStructureSystem.d.ts.map