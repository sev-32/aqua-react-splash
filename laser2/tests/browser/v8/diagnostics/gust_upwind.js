(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const input = m.input.state; const body = m.body;
  f.setMode('sailing'); window.__sim.setWind(12, 0);
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let lastErr = 0; const side = Math.sign(yaw()) || 1; const target = side * 50 * Math.PI / 180;
  for (let i = 0; i < 900; i++) { const e = wrap(target - yaw()); const d = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, -1 * (1.4 * e + 0.45 * d))); window.__sim.stepN(1); }
  const heel = () => Math.acos(new T.Vector3(0, 1, 0).applyQuaternion(body.quat).y) * 57.3;
  const out = [`pre heel ${heel().toFixed(0)} awa ${crew.lastAwaDeg.toFixed(0)}`];
  crew.forceCapsize();
  for (let i = 0; i < 14; i++) { window.__sim.stepN(30); const tel = crew.telemetry(); out.push(`t${((i + 1) * 0.5).toFixed(1)} heel ${heel().toFixed(0)} tiller ${input.tiller.toFixed(2)} tasks ${tel.agents.map(a => a.task).join(',')}`); }
  return out;
})()
