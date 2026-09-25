import type { LegacyRuntimeAdapter } from '../legacy/LegacyRuntimeAdapter.js';
import type { TelemetryHub } from '../telemetry/TelemetryHub.js';
import type { QualityManager } from '../quality/QualityManager.js';
import type { EventBus } from './EventBus.js';
import type { StateStore } from './StateStore.js';
import type { FixedStepAdvance } from './FixedStepClock.js';

export type FramePhase = 'prePhysics' | 'physics' | 'postPhysics' | 'preRender' | 'postRender' | 'ui';

export type FoundryMode = 'inspect' | 'anchored' | 'sailing';

export interface FoundryState {
  mode: FoundryMode;
  dynamic: boolean;
  waterEnabled: boolean;
  selectedObjectId: string | null;
  leftPanel: string;
  rightPanel: string;
  leftOpen: boolean;
  rightOpen: boolean;
  showLegacyHud: boolean;
}

export interface FoundryEvents extends Record<string, unknown> {
  'render:request': { reason: string };
  'mode:change': { mode: FoundryState['mode'] };
  'selection:change': { id: string | null };
  'quality:change': { id: string };
  'telemetry:snapshot': { snapshot: unknown };
  'scene:ready': { entities: number; unassignedMeshes: number };
  'lighting:changed': { reason: string; shadowDirty: boolean; environmentDirty: boolean };
  'shadow:invalidate': { reason: string };
  'sailing:reset': { reason: string };
  'sailing:capsize': { state: string; heelDeg: number };
}

export interface SimulationFrameState extends FixedStepAdvance {
  manualSteps: number;
}

export interface AppContext {
  readonly legacy: LegacyRuntimeAdapter;
  readonly telemetry: TelemetryHub;
  readonly quality: QualityManager;
  readonly events: EventBus<FoundryEvents>;
  readonly state: StateStore<FoundryState>;
  readonly simulation: SimulationFrameState;
  requestRender(reason: string): void;
  setDynamic(enabled: boolean): void;
  /** Switches between static inspection, the anchored rig lab and free sailing. */
  setMode(mode: FoundryMode): void;
  stepSimulation(steps: number): void;
}

export interface AppSystem {
  readonly id: string;
  readonly phase: FramePhase;
  enabled: boolean;
  init(context: AppContext): void | Promise<void>;
  update?(dtSeconds: number, context: AppContext): void;
  dispose?(): void;
  telemetry?(): Record<string, unknown>;
}
