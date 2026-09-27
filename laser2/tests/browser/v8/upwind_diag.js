(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const input = m.input.state; const body = m.body;
  window.__sim.setWind(12, 0);
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let lastErr = 0;
  const side = Math.sign(yaw()) || 1;
  const target = side * 45 * Math.PI / 180;
  const steer = () => { const e = wrap(target - yaw()); const d = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, -1 * (1.4 * e + 0.45 * d))); };
  const layout = window.LASER2_RIGGING_V16.layout;
  const inv = () => body.quat.clone().invert();
  const chordAngle = (rows, frac) => { const r = Math.round(frac * (rows.length - 1)); const row = rows[r]; const a = row[0].x.clone().sub(body.pos).applyQuaternion(inv()); const b = row[row.length - 1].x.clone().sub(body.pos).applyQuaternion(inv()); return Math.atan2(b.x - a.x, -(b.z - a.z)) * 57.3; };
  const out = [];
  for (let i = 0; i < 1800; i++) {
    steer(); window.__sim.stepN(1);
    if (i % 120 === 119) {
      const boom = m.rig.boom; const g = boom[0].x.clone().sub(body.pos).applyQuaternion(inv()); const e = boom[4].x.clone().sub(body.pos).applyQuaternion(inv());
      const boomAng = Math.atan2(e.x - g.x, -(e.z - g.z)) * 57.3;
      const v = Math.hypot(body.vel.x, body.vel.z) * 1.9438;
      out.push(`t${((i + 1) / 60).toFixed(0)}s v ${v.toFixed(2)} awa ${crew.lastAwaDeg.toFixed(0)} ms ${input.mainScope.toFixed(2)} js ${input.jibScope.toFixed(2)} boom ${boomAng.toFixed(1)} mainChord ${[0.15, 0.4, 0.7, 0.9].map(fr => chordAngle(layout.main, fr).toFixed(0)).join('/')} jibChord ${[0.2, 0.45, 0.8].map(fr => chordAngle(layout.jib, fr).toFixed(0)).join('/')} aM ${crew.lastAlpha.main.toFixed(0)} aJ ${crew.lastAlpha.jib.toFixed(0)} heel ${(Math.acos(new T.Vector3(0,1,0).applyQuaternion(body.quat).y) * 57.3).toFixed(0)} sailF ${window.LASER2_RIGGING_V16.state.sailForceN.toFixed(0)} vang ${input.vang.toFixed(2)} sheetT ${(m.rig.sheetC.workingTensionN||0).toFixed(0)}`);
    }
  }
  return out;
})()
