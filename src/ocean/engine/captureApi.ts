/**
 * Deterministic capture/test API on window.__THALASSA__ (the POSEIDON
 * __POSEIDON_*__ hooks, consolidated). Used by the Playwright proof script.
 */
import type { OceanEngine } from './OceanEngine';
import type { CameraPose } from './camera';
import { CAMERA_PRESETS } from './cameraPresets';
import { oceanActions } from './actions';
import { applyWeatherMorph } from '../atmos/weather';

export interface ThalassaApi {
  ready: boolean;
  error: string | null;
  engine: OceanEngine;
  /** Render n frames at a fixed dt (seconds). */
  step(n?: number, dt?: number): void;
  setPose(p: Partial<CameraPose> | string): void;
  set(path: string, value: unknown): void;
  get(path: string): unknown;
  applySea(): void;
  telemetry(): unknown;
  glError(): number;
  /** Invoke a UI action (spawnBoat, dropRock, spawnBuoys, ripple, …) with an optional world position. */
  action(name: string, arg?: unknown): void;
}

type Bag = Record<string, unknown>;
function setPath(obj: unknown, path: string, value: unknown) {
  const keys = path.split('.');
  let o = obj as Bag;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]] as Bag;
  o[keys[keys.length - 1]] = value;
}
function getPath(obj: unknown, path: string) {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as Bag)[k]), obj);
}

export function installCaptureApi(engine: OceanEngine) {
  const api: ThalassaApi = {
    ready: false,
    error: null,
    engine,
    step(n = 1, dt = 1 / 30) {
      engine.fixedDt = dt;
      for (let i = 0; i < n; i++) engine.frame(performance.now() + i * dt * 1000);
      engine.fixedDt = 0;
      engine.gl.finish();
    },
    setPose(p) {
      if (typeof p === 'string') {
        const pr = CAMERA_PRESETS.find((c) => c.id === p);
        if (pr) engine.camera.setPose(pr.pose);
      } else engine.camera.setPose(p);
    },
    set(path, value) {
      if (path === 'waterType') engine.setWaterType(String(value));
      else if (path === 'weather.morph') Object.assign(engine.settings.weather, applyWeatherMorph(engine.settings.weather, Number(value)));
      else setPath(engine.settings, path, value);
      if (path === 'sea.morph' || path === 'sea.directionOffsetDeg') engine.settings.weather.coupleSea = false;
      if (path.startsWith('sea.') || path === 'loopPeriod' || path.startsWith('foam.')) engine.markSeaDirty();
    },
    get: (path) => getPath(engine.settings, path),
    applySea() {
      engine.ocean.foam = engine.settings.foam;
      engine.ocean.setSea(engine.settings.sea, { loopPeriod: engine.settings.loopPeriod, rebuildStats: true });
    },
    telemetry: () => ({ ...engine.telemetry, gpuRenderer: engine.gl.getParameter(engine.gl.RENDERER) }),
    glError: () => engine.gl.getError(),
    action(name, arg) {
      const fn = (oceanActions as unknown as Record<string, (e: OceanEngine, a?: unknown) => void>)[name];
      if (typeof fn === 'function') fn.call(oceanActions, engine, arg);
    },
  };
  const w = window as unknown as Bag;
  w.__THALASSA__ = api;
  w.__THALASSA_ENGINE__ = engine;   // diagnostics / probes
  w.__THALASSA_PRESETS__ = CAMERA_PRESETS.map((p) => p.id);
  api.ready = true;
  return api;
}
