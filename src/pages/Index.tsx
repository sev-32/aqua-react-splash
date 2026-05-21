import { useEffect, useState } from 'react';

const Index = () => {
  const [webGpuState, setWebGpuState] = useState<'checking' | 'available' | 'missing'>('checking');

  useEffect(() => {
    if (!('gpu' in navigator)) {
      setWebGpuState('missing');
      return;
    }

    let cancelled = false;
    navigator.gpu.requestAdapter().then((adapter) => {
      if (!cancelled) setWebGpuState(adapter ? 'available' : 'missing');
    }).catch(() => {
      if (!cancelled) setWebGpuState('missing');
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-screen w-screen bg-ink overflow-hidden relative">
      <iframe
        title="WebGPU MLS-MPM Water"
        src="/mlsmpm-webgpu.html"
        className="absolute inset-0 h-full w-full border-0"
        allow="fullscreen"
      />

      {webGpuState === 'missing' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-background/95 px-6 text-center text-foreground">
          <div className="max-w-xl space-y-4">
            <h1 className="text-2xl font-semibold">WebGPU is required for the provided MLS-MPM solver.</h1>
            <p className="text-sm text-muted-foreground">
              This page now loads the actual WebGPU MLS-MPM reference app from your provided code. The Lovable preview browser may not expose a GPU adapter, so run it in a WebGPU-capable Chrome/Edge browser on real hardware.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
