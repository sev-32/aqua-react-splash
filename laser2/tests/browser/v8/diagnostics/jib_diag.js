(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const input = m.input.state; const body = m.body; const L = window.LASER2_RIGGING_V16.layout;
  window.__sim.setWind(12, 0);
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const side = Math.sign(yaw()) || 1; let target = side * 45 * Math.PI / 180, lastErr = 0;
  const steer = () => { const e = wrap(target - yaw()); const d = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * d))); };
  for (let i = 0; i < 1500; i++) { steer(); window.__sim.stepN(1); }
  const d = (p) => { const w = crew.worldToDesign(p, { x: 0, y: 0, z: 0 }); return [w.x, w.y, w.z].map(v => +v.toFixed(2)); };
  const wind = m.wind.velocityAtHeight(3, new T.Vector3()); const vel = body.vel;
  const app = new T.Vector3(wind.x - vel.x, 0, wind.z - vel.z);
  // apparent wind flow direction in design frame (rotation only)
  const inv = body.quat.clone().invert(); const appD = app.clone().applyQuaternion(inv);
  const rows = {};
  for (const k of ['main', 'jib']) { const R = L[k]; rows[k] = [0, Math.floor(R.length * 0.45), R.length - 2].map(r => ({ r, luff: d(R[r][0].x), leech: d(R[r][R[r].length - 1].x) })); }
  return { yawDeg: yaw() * 57.3, ai: 'n/a', jibScope: input.jibScope, mainScope: input.mainScope, appFlowDesign: [appD.x, appD.y, appD.z].map(v => +v.toFixed(2)), rows, alpha: crew.telemetry().sailAngleOfAttackDeg, sheetCs: m.sails.jib.sheetCs.map(c => ({ rest: +c.rest.toFixed(2), tension: +(c.tension ?? 0).toFixed(0) })), helmSide: m.helm.side, crewSide: m.crew.side };
})()
