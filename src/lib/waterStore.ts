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
}

const state: WaterState = {
  fps: 0,
  rippleCount: 0,
  spherePos: [-0.4, -0.75, 0.2],
  lightAngle: 45,
  lightElevation: 50,
  intensity: 0.6,
  paused: false,
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
    return () => listeners.delete(l);
  },
};

// Command bus for one-shot actions
type Command = 'reset' | 'storm' | 'single-drop';
const commandListeners = new Set<(cmd: Command) => void>();
export const waterCommands = {
  emit: (cmd: Command) => commandListeners.forEach((l) => l(cmd)),
  on: (l: (cmd: Command) => void) => {
    commandListeners.add(l);
    return () => commandListeners.delete(l);
  },
};

export function useWaterStore<T>(selector: (s: WaterState) => T): T {
  return useSyncExternalStore(
    waterStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
