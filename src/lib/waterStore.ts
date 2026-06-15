import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface WaterState {
  fps: number;
  rippleCount: number;
  spherePos: [number, number, number];
  lightAngle: number; // degrees, 0-360 around Y
  lightElevation: number; // degrees, 0-90
  intensity: number; // 0-1
  paused: boolean;
  // Splash physics telemetry
  particleCount: number;
  splashEvents: number;
  // Splash intensity multiplier (0–2)
  splashIntensity: number;
  mpmParams: MpmParams;
}

export interface MpmParams {
  particleSize: number;
  metaballIsolation: number;
  formRadius: number;
  breakRadius: number;
  connectionMemory: number;
  tendrilSamples: number;
  tendrilThinPower: number;
  splashBackGain: number;
  spawnThreshold: number;
  spawnCountMultiplier: number;
  lifetimeMultiplier: number;
  reflectionStrength: number;
  refractionStrength: number;
  colorMix: number;
}

export const defaultMpmParams: MpmParams = {
  particleSize: 0.55,
  metaballIsolation: 96,
  formRadius: 0.08,
  breakRadius: 0.19,
  connectionMemory: 0.28,
  tendrilSamples: 4,
  tendrilThinPower: 1.6,
  splashBackGain: 1.0,
  spawnThreshold: 0.12,
  spawnCountMultiplier: 1.0,
  lifetimeMultiplier: 1.0,
  reflectionStrength: 1.0,
  refractionStrength: 1.0,
  colorMix: 1.0,
};

const state: WaterState = {
  fps: 0,
  rippleCount: 0,
  spherePos: [-0.4, -0.75, 0.2],
  lightAngle: 45,
  lightElevation: 50,
  intensity: 0.6,
  paused: false,
  particleCount: 0,
  splashEvents: 0,
  splashIntensity: 1.0,
  mpmParams: defaultMpmParams,
};

const listeners = new Set<Listener>();

export const waterStore = {
  get: () => state,
  set: (patch: Partial<WaterState>) => {
    Object.assign(state, patch);
    listeners.forEach((l) => l());
  },
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

// Command bus for one-shot actions
export type Command = 'reset' | 'storm' | 'single-drop' | 'splash';
const commandListeners = new Set<(cmd: Command) => void>();
export const waterCommands = {
  emit: (cmd: Command) => commandListeners.forEach((l) => l(cmd)),
  on: (l: (cmd: Command) => void) => {
    commandListeners.add(l);
    return () => { commandListeners.delete(l); };
  },
};

export function useWaterStore<T>(selector: (s: WaterState) => T): T {
  return useSyncExternalStore(
    waterStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
