// Crew balance metric: heel statistics and how much the sailors move (hike command rate), upwind and reaching.
const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(Number(window.__TWS ?? 14), 0); for (let i = 0; i < 8; i++) { window.__sim.stepN(30); f.kernel.frame(0); }
  const m = f.legacy.master; const inp = m.input.state; const T = window.LASER2_THREE_R160; const body = m.body;
  const yaw = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); let last = 0;
  window.__target = (deg) => { window.__tgt = Math.sign(yaw() || 1) * deg * Math.PI / 180; };
  window.__steer = () => { const e = wrap(window.__tgt - yaw()); const d = (e - last) * 60; last = e; inp.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * d))); };
  window.__measure = (n) => { const c = f.systems.crewRecovery; const ags = c.agents ?? c['agents'];
    let h = 0, h2 = 0, k = 0, sog = 0; const prev = {}; const mv = {}; const rev = {}; const lastSign = {}; const hk = {};
    for (let i = 0; i < n; i++) { window.__steer(); window.__sim.stepN(1);
      const tel = c.telemetry(); const heel = tel.heelDeg; h += heel; h2 += heel * heel; k++; sog += window.__sim.get().sog;
      for (const a of tel.agents) { const p = prev[a.id]; if (p !== undefined) { const d = a.hike - p; mv[a.id] = (mv[a.id] ?? 0) + d * d * 3600; const s = Math.sign(d); if (Math.abs(d) > 0.002) { if (lastSign[a.id] && s !== lastSign[a.id]) rev[a.id] = (rev[a.id] ?? 0) + 1; lastSign[a.id] = s; } } prev[a.id] = a.hike; hk[a.id] = (hk[a.id] ?? 0) + a.hike; } }
    const mean = h / k; return { heelMean: +mean.toFixed(1), heelSd: +Math.sqrt(Math.max(0, h2 / k - mean * mean)).toFixed(2), sog: +(sog / k).toFixed(2),
      hikeMean: Object.fromEntries(Object.entries(hk).map(([id, v]) => [id, +(v / k).toFixed(2)])),
      hikeRateRms: Object.fromEntries(Object.entries(mv).map(([id, v]) => [id, +Math.sqrt(v / k).toFixed(3)])), reversalsPerS: Object.fromEntries(Object.entries(rev).map(([id, v]) => [id, +(v / (k / 60)).toFixed(2)])) }; };
  return 'ok'; })()`;
const leg = (deg, n) => `(() => { window.__target(${deg}); for (let i = 0; i < 360; i++) { window.__steer(); window.__sim.stepN(1); } return JSON.stringify(window.__measure(${n})); })()`;
export default [
  { name: 'setup', shot: false, code: setup },
  { name: 'upwind45', shot: false, code: leg(45, 1200) },
  { name: 'reach90', shot: false, code: leg(90, 1200) },
  { name: 'gust', shot: false, code: `(() => { window.__target(60); const c = window.LASER2_FOUNDRY.systems.crewRecovery; c.gustPeak = 1.35; const g = c.gust; g.active = true; g.t = 0; return JSON.stringify(window.__measure(600)); })()` },
];
