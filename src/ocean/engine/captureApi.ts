/**
 * Deterministic capture/test API on window.__THALASSA__ (the POSEIDON
 * __POSEIDON_*__ hooks, consolidated). Used by the Playwright proof script.
 */
import type { OceanEngine } from './OceanEngine';
import type { CameraPose } from './camera';
import { CAMERA_PRESETS } from './cameraPresets';

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
}

function setPath(obj: any, path: string, value: unknown) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = value;
}
function getPath(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
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
      else setPath(engine.settings, path, value);
      if (path.startsWith('sea.') || path === 'loopPeriod' || path.startsWith('foam.')) engine.markSeaDirty();
    },
    get: (path) => getPath(engine.settings, path),
    applySea() {
      engine.ocean.foam = engine.settings.foam;
      engine.ocean.setSea(engine.settings.sea, { loopPeriod: engine.settings.loopPeriod, rebuildStats: true });
    },
    telemetry: () => ({ ...engine.telemetry, gpuRenderer: engine.gl.getParameter(engine.gl.RENDERER) }),
    glError: () => engine.gl.getError(),
  };
  (window as any).__THALASSA__ = api;
  (window as any).__THALASSA_PRESETS__ = CAMERA_PRESETS.map((p) => p.id);
  api.ready = true;
  return api;
}
