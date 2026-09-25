export {};
declare global {
  interface Window {
    LASER2_CREW_RIGGING_MASTER_V2?: any;
    LASER2_RIGGING_V16?: any;
    LASER2_ROPE_HARDWARE_V16?: any;
    LASER2_SAIL_OPTICS_V17?: any;
    LASER2_SPREADER_RIG_V17_2?: any;
    LASER2_STANDING_RIG_COLLISION_V17_3?: any;
    LASER2_FRAME_HOOKS?: Array<(dt: number) => void>;
    __sim?: any;
    __camLock?: boolean;
    __LASER2_NATIVE_RAF?: (callback: FrameRequestCallback) => number;
    __LASER2_NATIVE_CAF?: (handle: number) => void;
    __LASER2_PULSE_RAF?: (frames?: number) => boolean;
    __LASER2_SET_RAF_DYNAMIC?: (enabled: boolean) => boolean;
    __LASER2_RELEASE_RAF?: () => boolean;
    __LASER2_RAF_GATE?: { readonly mode: string; readonly queued: number; readonly pulseBudget: number };
    LASER2_FOUNDRY?: any;
  }
}
