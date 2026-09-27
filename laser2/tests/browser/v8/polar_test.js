(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const phys = f.systems.sailingPhysics;
  const input = m.input.state; const body = m.body;
  const tws = window.__POLAR_TWS ?? 12;
  const twas = window.__POLAR_TWAS ?? [45, 60, 75, 90, 110, 135, 160];
  window.__sim.setWind(tws, 0);
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const tillerSign = -1;
  let target = 0, lastErr = 0;
  const steer = () => { const e = wrap(target - yaw()); const d = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, tillerSign * (1.4 * e + 0.45 * d))); };
  const rows = [];
  const side = Math.sign(yaw()) || 1; // stay on the current tack
  for (const twa of twas) {
    target = side * twa * Math.PI / 180;
    let sum = 0, n = 0, heel = 0, lee = 0, main = 0, jib = 0, awa = 0, aero = 0, tiller = 0;
    for (let i = 0; i < 2400; i++) {
      steer(); window.__sim.stepN(1);
      if (i >= 1200) {
        const v = Math.hypot(body.vel.x, body.vel.z); sum += v; n++;
        const up = new T.Vector3(0, 1, 0).applyQuaternion(body.quat); heel += Math.acos(Math.min(1, up.y)) * 57.3;
        const fw = fwdOf(); const side = new T.Vector3(-fw.z, 0, fw.x); lee += Math.atan2(body.vel.x * side.x + body.vel.z * side.z, body.vel.x * fw.x + body.vel.z * fw.z) * 57.3;
        main += input.mainScope; jib += input.jibScope; awa += crew['lastAwaDeg']; aero += window.LASER2_RIGGING_V16.state.sailForceN; tiller += input.tiller;
      }
    }
    const tel = crew.telemetry();
    rows.push(`TWA ${twa}: ${((sum / n) * 1.9438).toFixed(2)} kn heel ${(heel / n).toFixed(1)} leeway ${(lee / n).toFixed(1)} AWA ${(awa / n).toFixed(0)} main ${(main / n).toFixed(2)} jib ${(jib / n).toFixed(2)} sailF ${(aero / n).toFixed(0)}N tiller ${(tiller / n).toFixed(2)} αM ${crew['lastAlpha'].main.toFixed(0)} αJ ${crew['lastAlpha'].jib.toFixed(0)} vang ${input.vang.toFixed(2)} crew ${tel.agents.map(a => a.task + '/' + a.hike).join(',')}`);
  }
  return rows;
})()
