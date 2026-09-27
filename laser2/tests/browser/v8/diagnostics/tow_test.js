(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; crew.trimAssist = false;
  const input = m.input.state;
  const body = m.body;
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const out = { tillerSign: null, runs: [] };
  window.__sim.setWind(0.3, 0);
  input.mainScope = 0; input.jibScope = 0;
  window.__sim.stepN(120);
  // Tiller sign probe: push tiller +0.6 while being towed slowly.
  let tow = 40;
  const towPoint = () => { const ref = m.bodyReference ?? { y: 0.3, z: -0.15 }; return new T.Vector3(0, 0.02 - ref.y, -0.3 - ref.z).applyQuaternion(body.quat).add(body.pos); };
  const hook = () => { const d = fwdOf().multiplyScalar(tow); body.addForceAt(d, towPoint()); };
  m.physics.forceHooks.push(hook);
  window.__sim.stepN(240);
  const y0 = yaw(); for (let i = 0; i < 90; i++) { input.tiller = 0.6; window.__sim.stepN(1); } out.tillerSign = Math.sign(wrap(yaw() - y0));
  // Autopilot helper
  const target = yaw();
  let lastErr = 0;
  const steer = () => { const e = wrap(target - yaw()); const d = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, out.tillerSign * (1.6 * e + 0.5 * d))); };
  for (const F of [15, 30, 60, 100, 150, 220, 300]) {
    tow = F;
    let sum = 0, n = 0, heel = 0, trim = 0;
    for (let i = 0; i < 1500; i++) {
      steer(); window.__sim.stepN(1);
      if (i >= 900) { const v = Math.hypot(body.vel.x, body.vel.z); sum += v; n++; const k = f.systems.sailingPhysics.telemetry().kinematics; heel += k.heelDeg; trim += k.trimDeg; }
    }
    const tel = f.systems.sailingPhysics.telemetry();
    out.runs.push({ F, speedMs: +(sum / n).toFixed(3), kn: +((sum / n) * 1.9438).toFixed(2), heel: +(heel / n).toFixed(1), trimDeg: +(trim / n).toFixed(2), pressureN: +tel.hydro.pressureDragN.toFixed(1), frictionN: +tel.hydro.frictionN.toFixed(1), windageN: +tel.hydro.windageN.toFixed(1), wettedArea: +tel.hydro.wettedAreaM2.toFixed(2), board: tel.board, rudder: tel.rudder, mass: tel.compositeMassKg });
  }
  const idx = m.physics.forceHooks.indexOf(hook); if (idx >= 0) m.physics.forceHooks.splice(idx, 1);
  out.hydroCfg = m.config.hydro;
  return out;
})()
