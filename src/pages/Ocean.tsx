import { useEffect, useRef, useState } from 'react';
import { OceanEngine, type EngineTelemetry, type QualityName } from '../ocean';
import { CAMERA_PRESETS } from '../ocean/engine/cameraPresets';
import { OceanPanel } from '../components/ocean/OceanPanel';
import { installCaptureApi } from '../ocean/engine/captureApi';
import { installStandardModules } from '../ocean/engine/modules';

/**
 * THALASSA ocean engine host page (/ocean).
 * Query params: ?quality=capture|low|medium|high|ultra&preset=<camera>&capture=1
 */
const Ocean = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<OceanEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<EngineTelemetry | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quality = (params.get('quality') as QualityName) || (params.get('capture') ? 'capture' : 'high');
    const canvas = canvasRef.current!;
    let eng: OceanEngine | null = null;
    try {
      eng = new OceanEngine(canvas, { quality, seed: Number(params.get('seed')) || undefined });
      installStandardModules(eng);
      const preset = CAMERA_PRESETS.find((p) => p.id === params.get('preset')) ?? CAMERA_PRESETS[0];
      eng.camera.setPose(preset.pose);
      eng.attachControls();
      installCaptureApi(eng);
      if (!params.get('capture')) eng.start();
      setEngine(eng);
    } catch (e) {
      console.error(e);
      setError(String((e as Error)?.message ?? e));
      (window as any).__THALASSA__ = { ready: true, error: String((e as Error)?.message ?? e) };
    }
    const off = eng?.onTelemetry(setTelemetry);
    return () => {
      off?.();
      eng?.dispose();
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <pre className="max-w-3xl whitespace-pre-wrap rounded border border-destructive/40 bg-black/70 p-4 font-mono text-xs text-destructive">
            {error}
          </pre>
        </div>
      )}
      {engine && <OceanPanel engine={engine} telemetry={telemetry} />}
    </main>
  );
};

export default Ocean;
