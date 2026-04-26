import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useWaterStore, waterStore, waterCommands } from '../lib/waterStore';

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-bone/10 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-bone tabular-nums">
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function Dial({
  label, value, min, max, onChange, suffix,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
        <span className="font-mono text-xs text-primary tabular-nums">
          {value.toFixed(0)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[2px] bg-bone/15 appearance-none cursor-pointer accent-primary
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none
                   [&::-webkit-slider-thumb]:shadow-[0_0_10px_hsl(var(--primary)/0.6)]
                   [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0"
      />
    </div>
  );
}

function ActionBtn({ children, onClick, variant = 'ghost' }: { children: React.ReactNode; onClick: () => void; variant?: 'ghost' | 'primary' }) {
  return (
    <button
      onClick={onClick}
      className={`pointer-events-auto group relative px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all
        ${variant === 'primary'
          ? 'text-ink bg-primary hover:bg-primary-glow shadow-[0_0_20px_hsl(var(--primary)/0.4)]'
          : 'text-bone bg-bone/[0.03] hover:bg-bone/[0.08] border border-bone/15 hover:border-primary/40'}`}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function WaterUI() {
  const [time, setTime] = useState(() => new Date());
  const sphere = useWaterStore((s) => s.spherePos);
  const fps = useWaterStore((s) => s.fps);
  const ripples = useWaterStore((s) => s.rippleCount);
  const angle = useWaterStore((s) => s.lightAngle);
  const elev = useWaterStore((s) => s.lightElevation);
  const particleCount = useWaterStore((s) => s.particleCount);
  const splashEvents = useWaterStore((s) => s.splashEvents);
  const splashIntensity = useWaterStore((s) => s.splashIntensity);

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const ts = time.toISOString().replace('T', ' ').slice(0, 19) + 'Z';

  return (
    <>
      {/* Vignette + grain overlays */}
      <div className="fixed inset-0 vignette pointer-events-none z-[5]" />
      <div className="fixed inset-0 grain pointer-events-none z-[5]" />

      {/* Top bar — editorial header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-20 pointer-events-none"
      >
        <div className="flex items-start justify-between px-8 pt-6">
          <div className="flex items-baseline gap-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="text-primary animate-blink">●</span> LIVE · SPECIMEN-09
            </div>
            <div className="hidden md:block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              N 38°25′ · W 122°15′
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
            {ts}
          </div>
        </div>

        {/* Hero title block */}
        <div className="px-8 pt-12 max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-copper mb-3">
            Vol. 09 — Fluid Dynamics
          </div>
          <h1 className="font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.92] tracking-[-0.03em] text-bone font-light text-balance">
            The shape<br />
            of <em className="italic font-normal text-primary">water</em>,
            <br />observed.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground text-balance">
            A real-time hydrodynamic simulation. GPU ping-pong fields resolve surface
            displacement at 60 Hz, refracting light through a tiled basin of unknown depth.
          </p>
        </div>
      </motion.div>

      {/* Right instrument panel */}
      <motion.aside
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-24 right-6 z-20 w-[280px] pointer-events-none max-h-[calc(100vh-8rem)]"
      >
        <div className="relative panel p-5 corner-bracket pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Instrument</div>
              <div className="font-display text-lg text-bone leading-tight">Telemetry</div>
            </div>
            <div className="font-mono text-[9px] text-primary animate-blink">REC</div>
          </div>

          <div className="space-y-0">
            <Stat label="Frame Rate" value={fps.toFixed(0)} unit="fps" />
            <Stat label="Disturbances" value={ripples.toString()} />
            <Stat label="Probe · X" value={sphere[0].toFixed(3)} />
            <Stat label="Probe · Y" value={sphere[1].toFixed(3)} />
            <Stat label="Probe · Z" value={sphere[2].toFixed(3)} />
          </div>

          <div className="my-5 h-px bg-bone/10" />

          <div className="space-y-4">
            <Dial
              label="Sun · Azimuth"
              value={angle}
              min={0}
              max={360}
              suffix="°"
              onChange={(v) => waterStore.set({ lightAngle: v })}
            />
            <Dial
              label="Sun · Elevation"
              value={elev}
              min={5}
              max={85}
              suffix="°"
              onChange={(v) => waterStore.set({ lightElevation: v })}
            />
          </div>

          <div className="my-5 h-px bg-bone/10" />

          <div className="grid grid-cols-2 gap-2">
            <ActionBtn onClick={() => waterCommands.emit('single-drop')}>Drop</ActionBtn>
            <ActionBtn onClick={() => waterCommands.emit('storm')} variant="primary">Storm</ActionBtn>
            <ActionBtn onClick={() => waterCommands.emit('reset')}>Reset</ActionBtn>
            <ActionBtn onClick={() => waterStore.set({ paused: !waterStore.get().paused })}>
              {useWaterStore((s) => s.paused) ? 'Resume' : 'Pause'}
            </ActionBtn>
          </div>
        </div>

        {/* Floating classification chip */}
        <motion.div
          animate={{ rotate: [0, 1, -1, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-3 -left-3 px-2 py-1 bg-copper text-ink font-mono text-[9px] uppercase tracking-[0.2em] shadow-lg"
        >
          Classified · 09
        </motion.div>
      </motion.aside>

      {/* Bottom-left: instructions / interaction hint */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-6 left-8 z-20 max-w-xs pointer-events-none"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px w-8 bg-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Interact</span>
        </div>
        <ul className="space-y-1.5 font-mono text-[11px] text-muted-foreground">
          <li className="flex justify-between"><span>Tap surface</span><span className="text-bone">add ripple</span></li>
          <li className="flex justify-between"><span>Drag sphere</span><span className="text-bone">displace fluid</span></li>
          <li className="flex justify-between"><span>Right-drag</span><span className="text-bone">orbit camera</span></li>
        </ul>
      </motion.div>

      {/* Bottom-right: editorial credits / spine */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.7 }}
        className="fixed bottom-6 right-6 z-20 pointer-events-none flex items-end gap-4"
      >
        <div className="text-right">
          <div className="font-display italic text-bone text-sm">Aqua Quarterly</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
            after E. Wallace ·{' '}
            <a
              href="http://madebyevan.com/webgl-water/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-copper hover:text-primary transition-colors pointer-events-auto underline-offset-2 hover:underline"
            >
              source
            </a>
          </div>
        </div>
        <div className="font-display text-5xl text-bone/20 leading-none font-light">09</div>
      </motion.div>

      {/* Subtle horizon gradient */}
      <div className="fixed inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/60 to-transparent pointer-events-none z-[6]" />
    </>
  );
}
