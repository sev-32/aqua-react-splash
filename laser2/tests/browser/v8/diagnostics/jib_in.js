(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const input = m.input.state; const body = m.body;
  window.__sim.setWind(12, 0);
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let lastErr = 0; const side = Math.sign(yaw()) || 1; const target = side * 45 * Math.PI / 180;
  const steer = () => { const e = wrap(target - yaw()); const d = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, -1 * (1.4 * e + 0.45 * d))); };
  crew.trimAssist = false;
  const inv = () => body.quat.clone().invert();
  const loc = (v) => v.clone().sub(body.pos).applyQuaternion(inv());
  const jib = m.sails.jib; const layout = window.LASER2_RIGGING_V16.layout;
  const chordAngle = (rows, frac) => { const r = Math.round(frac * (rows.length - 1)); const row = rows[r]; const a = loc(row[0].x); const b = loc(row[row.length - 1].x); return Math.atan2(b.x - a.x, -(b.z - a.z)) * 57.3; };
  const out = [];
  for (const js of [0.8, 0.9, 1.0]) {
    input.jibScope = js; input.mainScope = 0.92;
    for (let i = 0; i < 300; i++) { steer(); input.jibScope = js; window.__sim.stepN(1); }
    const c = loc(jib.clew.x); const tack = loc(layout.jib[0][0].x);
    const sh = jib.sheetCs.map((s) => { const a = new (body.pos.constructor)(); body.localToWorld(s.local, a); return `${s.rest.toFixed(3)}/${a.distanceTo(jib.clew.x).toFixed(3)}/${(s.tension||0).toFixed(0)}N`; });
    out.push(`js ${js}: clewAngle ${(Math.atan2(c.x - tack.x, tack.z - c.z) * 57.3).toFixed(1)} clew ${c.toArray().map(v => v.toFixed(2))} tack ${tack.toArray().map(v => v.toFixed(2))} chords ${[0.2, 0.45, 0.8].map(fr => chordAngle(layout.jib, fr).toFixed(0)).join('/')} sheets ${sh.join(' ')} awa ${crew.lastAwaDeg.toFixed(0)}`);
  }
  crew.trimAssist = true;
  return out;
})()
