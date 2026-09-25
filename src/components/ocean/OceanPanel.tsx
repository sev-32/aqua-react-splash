import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { OceanEngine, EngineTelemetry } from '../../ocean';
import { SEA_STATES, WATER_TYPES, DEBUG_VIEWS } from '../../ocean';
import { CAMERA_PRESETS } from '../../ocean/engine/cameraPresets';
import { oceanActions } from '../../ocean/engine/actions';
import { WEATHER_PRESETS, applyWeatherMorph, weatherLabel } from '../../ocean/atmos/weather';

/* ───────────────────────────── primitives ───────────────────────────── */

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group border-t border-bone/10 pt-3 pb-1" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-copper">
        {title}
        <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-3 space-y-3 pb-2">{children}</div>
    </details>
  );
}

function Slider({ label, value, min, max, step = 0.01, digits = 2, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; digits?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-primary">{value.toFixed(digits)}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-[2px] w-full cursor-pointer appearance-none bg-bone/15 accent-primary"
      />
    </label>
  );
}

function Chip({ active, children, onClick, title }: { active?: boolean; children: ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`border px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] transition-colors ${
        active ? 'border-primary/70 bg-primary/10 text-primary' : 'border-bone/15 text-muted-foreground hover:border-bone/40 hover:text-bone'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between py-0.5 text-left">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className={`font-mono text-[10px] ${value ? 'text-primary' : 'text-bone/40'}`}>{value ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-bone/5 py-[3px]">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-bone">{value}</span>
    </div>
  );
}

/* ─────────────────────────────── panel ─────────────────────────────── */

export function OceanPanel({ engine, telemetry }: { engine: OceanEngine; telemetry: EngineTelemetry | null }) {
  const [, force] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const s = engine.settings;
  const rerender = () => force((x) => x + 1);
  const sea = (patch: Partial<typeof s.sea>) => {
    // Taking the sea by hand releases it from the weather's wind.
    if (patch.morph !== undefined || patch.directionOffsetDeg !== undefined) s.weather.coupleSea = false;
    Object.assign(s.sea, patch); engine.markSeaDirty(); rerender();
  };
  const sky = (patch: Partial<typeof s.sky>) => { Object.assign(s.sky, patch); rerender(); };
  const weather = (patch: Partial<typeof s.weather>) => { Object.assign(s.weather, patch); rerender(); };
  const weatherMorph = (m: number) => { Object.assign(s.weather, applyWeatherMorph(s.weather, m)); rerender(); };
  const optics = (patch: Partial<typeof s.optics>) => { Object.assign(s.optics, patch); rerender(); };
  const foam = (patch: Partial<typeof s.foam>) => { Object.assign(s.foam, patch); engine.ocean.foam = s.foam; rerender(); };
  const post = (patch: Partial<typeof s.post>) => { Object.assign(s.post, patch); rerender(); };
  const t = telemetry;
  const morphIndex = Math.round(s.sea.morph);

  return (
    <>
      {/* HUD */}
      <div className="pointer-events-none fixed left-5 top-4 z-20 max-w-[440px]">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="text-primary">●</span> THALASSA · Ocean engine · <Link to="/" className="pointer-events-auto text-copper hover:text-primary">pool lab ↗</Link>
        </div>
        <div className="mt-1 font-display text-3xl font-light leading-none text-bone">{t?.seaLabel ?? '—'}</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-bone/70">
          {t ? `${t.weatherLabel} · U10 ${t.windSpeed.toFixed(1)} m/s${t.seaCoupled ? ' · sea follows wind' : ''}` : ''}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-x-4 font-mono text-[10px] tabular-nums text-bone/80">
          <span>Hs {t ? t.hs.toFixed(2) : '–'} m</span>
          <span>Tp {t ? t.tp.toFixed(1) : '–'} s</span>
          <span>λp {t ? t.peakWavelength.toFixed(0) : '–'} m</span>
          <span>{t ? t.fps.toFixed(0) : '–'} fps</span>
          <span>{t ? (t.triangles / 1e6).toFixed(2) : '–'} M tri</span>
          <span>{t?.nodes ?? '–'} nodes</span>
        </div>
      </div>

      {/* Camera presets */}
      <div className="fixed bottom-4 left-5 z-20 flex max-w-[60vw] flex-wrap gap-1.5">
        {CAMERA_PRESETS.map((p) => (
          <Chip key={p.id} onClick={() => engine.camera.setPose(p.pose)}>{p.label}</Chip>
        ))}
        <span className="ml-2 self-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          drag look · WASD/QE fly · wheel altitude · shift boost · click sea to interact
        </span>
      </div>

      {/* Instrument panel */}
      <aside className="fixed right-4 top-4 z-20 w-[312px]">
        <div className="panel relative max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Instrument</div>
              <div className="font-display text-lg leading-tight text-bone">Ocean controls</div>
            </div>
            <button onClick={() => setCollapsed(!collapsed)} className="font-mono text-[10px] uppercase tracking-[0.2em] text-copper">
              {collapsed ? 'open' : 'hide'}
            </button>
          </div>
          {!collapsed && (
            <div className="space-y-1">
              <Section title="Sea state" open>
                <div className="flex flex-wrap gap-1">
                  {SEA_STATES.map((st, i) => (
                    <Chip key={st.id} active={morphIndex === i} title={`${st.beaufort} — ${st.description}`} onClick={() => sea({ morph: i })}>{st.label}</Chip>
                  ))}
                </div>
                <Slider label="Calm ↔ storm" value={s.sea.morph} min={0} max={SEA_STATES.length - 1} step={0.01} onChange={(v) => sea({ morph: v })} />
                <Slider label="Energy" value={s.sea.energy} min={0} max={3} onChange={(v) => sea({ energy: v })} />
                <Slider label="Swell" value={s.sea.swell} min={0} max={3} onChange={(v) => sea({ swell: v })} />
                <Slider label="Wind sea" value={s.sea.windSea} min={0} max={3} onChange={(v) => sea({ windSea: v })} />
                <Slider label="Direction" value={s.sea.directionOffsetDeg} min={-180} max={180} step={1} digits={0} unit="°" onChange={(v) => sea({ directionOffsetDeg: v })} />
                <Slider label="Spread (short-crested)" value={s.sea.spread} min={0.3} max={3} onChange={(v) => sea({ spread: v })} />
                <Slider label="Choppiness λ" value={s.sea.choppiness} min={0} max={2} onChange={(v) => sea({ choppiness: v })} />
                <Slider label="Depth (dispersion/TMA)" value={s.sea.depth} min={3} max={2000} step={1} digits={0} unit=" m" onChange={(v) => sea({ depth: v })} />
                <Slider label="Loop period (0 = off)" value={s.loopPeriod} min={0} max={120} step={1} digits={0} unit=" s" onChange={(v) => { s.loopPeriod = v; engine.markSeaDirty(); rerender(); }} />
              </Section>

              <Section title="Interaction">
                <div className="grid grid-cols-2 gap-1.5">
                  <Chip onClick={() => oceanActions.spawnBoat(engine)}>+ Boat</Chip>
                  <Chip onClick={() => oceanActions.dropRock(engine)}>Drop rock</Chip>
                  <Chip onClick={() => oceanActions.spawnBuoys(engine)}>+ Buoys</Chip>
                  <Chip onClick={() => oceanActions.clearBodies(engine)}>Clear bodies</Chip>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['rock', 'boat', 'buoy', 'ripple'] as const).map((m) => (
                    <Chip key={m} active={oceanActions.clickMode === m} onClick={() => { oceanActions.clickMode = m; rerender(); }}>click: {m}</Chip>
                  ))}
                </div>
                <Toggle label="JIT interaction tiles" value={s.interaction.tilesEnabled} onChange={(v) => { s.interaction.tilesEnabled = v; rerender(); }} />
                <Toggle label="Representability limiter" value={s.interaction.limiterEnabled} onChange={(v) => { s.interaction.limiterEnabled = v; rerender(); }} />
                <Slider label="Max slope |∇η|" value={s.interaction.maxSlope} min={0.2} max={1.2} onChange={(v) => { s.interaction.maxSlope = v; rerender(); }} />
                <Slider label="Source gain" value={s.interaction.sourceGain} min={0} max={3} onChange={(v) => { s.interaction.sourceGain = v; rerender(); }} />
                <Slider label="Damping" value={s.interaction.dispersionDamping} min={0} max={0.5} step={0.005} digits={3} onChange={(v) => { s.interaction.dispersionDamping = v; rerender(); }} />
                <Toggle label="Splash" value={s.spray.enabled} onChange={(v) => { s.spray.enabled = v; rerender(); }} />
                <Slider label="Splash gain" value={s.spray.gain} min={0} max={3} onChange={(v) => { s.spray.gain = v; rerender(); }} />
              </Section>

              <Section title="Shore / shallow water">
                <Toggle label="Shore field (T2 SWE)" value={s.shore.enabled} onChange={(v) => { s.shore.enabled = v; rerender(); }} />
                <Chip onClick={() => oceanActions.goToShore(engine)}>Fly to the beach</Chip>
                <Slider label="Bed friction (Manning n)" value={s.shore.friction} min={0} max={0.08} step={0.001} digits={3} onChange={(v) => { s.shore.friction = v; rerender(); }} />
                <Slider label="Breaking γ" value={s.shore.breakGamma} min={0.3} max={1.0} onChange={(v) => { s.shore.breakGamma = v; rerender(); }} />
                <Slider label="Overturning lip" value={s.shore.lip} min={0} max={2} onChange={(v) => { s.shore.lip = v; rerender(); }} />
              </Section>

              <Section title="Water optics">
                <div className="flex flex-wrap gap-1">
                  {WATER_TYPES.map((w) => (
                    <Chip key={w.id} active={s.waterType === w.id} title={w.note} onClick={() => { engine.setWaterType(w.id); rerender(); }}>{w.label}</Chip>
                  ))}
                </div>
                <Slider label="Crest transmission" value={s.optics.sss} min={0} max={3} onChange={(v) => optics({ sss: v })} />
                <Slider label="Sun glitter" value={s.optics.glitter} min={0} max={3} onChange={(v) => optics({ glitter: v })} />
                <Slider label="Roughness gain" value={s.optics.roughnessGain} min={0.1} max={4} onChange={(v) => optics({ roughnessGain: v })} />
                <Slider label="Aerial haze" value={s.optics.fogDensity * 1e5} min={0} max={20} step={0.1} digits={1} onChange={(v) => optics({ fogDensity: v / 1e5 })} />
              </Section>

              <Section title="Foam">
                <Slider label="Whitecap gain" value={s.optics.foamGain} min={0} max={4} onChange={(v) => optics({ foamGain: v })} />
                <Slider label="Fold onset (1−J)" value={s.foam.foldStart} min={-0.2} max={0.6} onChange={(v) => foam({ foldStart: v })} />
                <Slider label="Fold full" value={s.foam.foldFull} min={0.1} max={1.2} onChange={(v) => foam({ foldFull: v })} />
                <Slider label="Birth rate" value={s.foam.birth} min={0} max={6} onChange={(v) => foam({ birth: v })} />
                <Slider label="Lifetime" value={s.foam.life} min={0.5} max={30} step={0.1} digits={1} unit=" s" onChange={(v) => foam({ life: v })} />
                <Slider label="Bubble lifetime" value={s.foam.airLife} min={0.2} max={6} step={0.1} digits={1} unit=" s" onChange={(v) => foam({ airLife: v })} />
                <Chip onClick={() => engine.ocean.clearFoam()}>Clear foam</Chip>
              </Section>

              <Section title="Weather (Nimbus)">
                <div className="flex flex-wrap gap-1">
                  {WEATHER_PRESETS.map((w, i) => (
                    <Chip key={w.id} active={Math.abs(s.weather.morph - i) < 0.02} onClick={() => weatherMorph(i)}>{w.label}</Chip>
                  ))}
                </div>
                <Slider label={`Clear → storm · ${weatherLabel(s.weather.morph)}`} value={s.weather.morph} min={0} max={WEATHER_PRESETS.length - 1} onChange={weatherMorph} />
                <Slider label="Cloud cover" value={s.weather.coverage} min={0} max={1} onChange={(v) => weather({ coverage: v })} />
                <Slider label="Genus (stratus → Cb)" value={s.weather.cloudType} min={0} max={1} onChange={(v) => weather({ cloudType: v })} />
                <Slider label="Cloud base" value={s.weather.cloudBase} min={300} max={4000} step={10} digits={0} unit=" m" onChange={(v) => weather({ cloudBase: v })} />
                <Slider label="Deck depth" value={s.weather.cloudThick} min={400} max={8000} step={10} digits={0} unit=" m" onChange={(v) => weather({ cloudThick: v })} />
                <Slider label="Cloud density" value={s.weather.density} min={0.2} max={2.2} onChange={(v) => weather({ density: v })} />
                <Slider label="Precipitation" value={s.weather.precipitation} min={0} max={1} onChange={(v) => weather({ precipitation: v })} />
                <Slider label="Wind U10" value={s.weather.windSpeed} min={0} max={32} step={0.1} digits={1} unit=" m/s" onChange={(v) => weather({ windSpeed: v })} />
                <Slider label="Wind toward" value={s.weather.windDirDeg} min={0} max={360} step={1} digits={0} unit="°" onChange={(v) => weather({ windDirDeg: v })} />
                <Toggle label="Sea follows the wind" value={s.weather.coupleSea} onChange={(v) => weather({ coupleSea: v })} />
                <Slider label="Sea response (duration-limited)" value={s.weather.seaResponse} min={2} max={300} step={1} digits={0} unit=" s" onChange={(v) => weather({ seaResponse: v })} />
                <Toggle label="Volumetric clouds" value={s.sky.clouds} onChange={(v) => sky({ clouds: v })} />
              </Section>

              <Section title="Sky & light">
                <Slider label="Sun azimuth" value={s.sky.sunAzimuthDeg} min={0} max={360} step={1} digits={0} unit="°" onChange={(v) => sky({ sunAzimuthDeg: v })} />
                <Slider label="Sun elevation" value={s.sky.sunElevationDeg} min={-4} max={89} step={0.5} digits={1} unit="°" onChange={(v) => sky({ sunElevationDeg: v })} />
                <Slider label="Haze (Mie)" value={s.sky.turbidity} min={0.2} max={6} onChange={(v) => sky({ turbidity: v })} />
                <Slider label="Exposure" value={s.post.exposure} min={0.2} max={3} onChange={(v) => post({ exposure: v })} />
                <Slider label="Bloom" value={s.post.bloom} min={0} max={1.5} onChange={(v) => post({ bloom: v })} />
              </Section>

              <Section title="LOD / diagnostics">
                <div className="flex flex-wrap gap-1">
                  {DEBUG_VIEWS.map((d) => (
                    <Chip key={d.id} active={s.debug === d.id} onClick={() => { s.debug = d.id; rerender(); }}>{d.label}</Chip>
                  ))}
                </div>
                <Slider label="Geometry LOD bias" value={s.geoLodBias} min={-1} max={2} onChange={(v) => { s.geoLodBias = v; rerender(); }} />
                <Toggle label="Earth curvature" value={s.earthCurvature} onChange={(v) => { s.earthCurvature = v; rerender(); }} />
                <Toggle label="Pause" value={s.paused} onChange={(v) => { s.paused = v; rerender(); }} />
                <Slider label="Time scale" value={s.timeScale} min={0} max={3} onChange={(v) => { s.timeScale = v; rerender(); }} />
              </Section>

              <Section title="Telemetry">
                {t && (
                  <div>
                    <Stat label="Frame" value={`${t.frameMs.toFixed(1)} ms · cpu ${t.cpuMs.toFixed(1)} ms`} />
                    {Object.entries(t.gpu).map(([k, v]) => <Stat key={k} label={`gpu · ${k}`} value={`${v.toFixed(2)} ms`} />)}
                    <Stat label="Interaction tiles" value={String(t.tiles)} />
                    <Stat label="Shore field" value={t.shoreActive ? 'active' : 'idle'} />
                    <Stat label="Splash particles" value={String(t.sprayLive)} />
                    <Stat label="Receipts" value={String(t.receipts)} />
                    <Stat label="Quality" value={engine.quality} />
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
