(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; crew.trimAssist = false;
  const input = m.input.state; const body = m.body; const V16 = window.LASER2_RIGGING_V16;
  window.__sim.setWind(12, 0);
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const side = Math.sign(yaw()) || 1;
  const twa = window.__TWA ?? 90;
  let target = side * twa * Math.PI / 180, lastErr = 0;
  const steer = () => { const e = wrap(target - yaw()); const d = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * d))); };
  // angle of attack per main/jib row
  const alphaRows = (rows) => {
    const out = []; const tmpW = new T.Vector3();
    for (let r = 1; r < rows.length - 1; r += 3) {
      const row = rows[r]; const luff = row[0].x, leech = row[row.length - 1].x;
      const chord = leech.clone().sub(luff); if (chord.lengthSq() < 1e-6) continue; chord.normalize();
      const prev = rows[r - 1], next = rows[r + 1];
      const span = next[0].x.clone().add(next[next.length - 1].x).sub(prev[0].x).sub(prev[prev.length - 1].x).normalize();
      const normal = new T.Vector3().crossVectors(span, chord).normalize();
      const center = luff.clone().add(leech).multiplyScalar(0.5);
      m.wind.velocityAt(center, tmpW); const vel = row[0].v.clone().add(row[row.length - 1].v).multiplyScalar(0.5);
      const rel = tmpW.clone().sub(vel); rel.addScaledVector(span, -rel.dot(span));
      const a = Math.asin(Math.max(-1, Math.min(1, rel.clone().normalize().dot(normal)))) * 57.3;
      // chord angle relative to the hull centreline (horizontal)
      const f = fwdOf(); const ch = chord.clone(); ch.y = 0; ch.normalize();
      const boomAng = Math.acos(Math.max(-1, Math.min(1, -ch.dot(f)))) * 57.3;
      out.push(`${a.toFixed(0)}°/${boomAng.toFixed(0)}`);
    }
    return out.join(' ');
  };
  const rows = [];
  for (const [ms, js, vang] of [[0.6, 0.6, 0.45], [0.6, 0.6, 0.75], [0.6, 0.6, 1.0], [0.75, 0.7, 1.0], [0.5, 0.6, 1.0]]) {
    input.mainScope = ms; input.jibScope = js; input.vang = vang;
    let sum = 0, n = 0, heel = 0, aero = 0;
    for (let i = 0; i < 1500; i++) {
      input.mainScope = ms; input.jibScope = js; input.vang = vang; steer(); window.__sim.stepN(1);
      if (i >= 900) { sum += Math.hypot(body.vel.x, body.vel.z); n++; const up = new T.Vector3(0, 1, 0).applyQuaternion(body.quat); heel += Math.acos(Math.min(1, up.y)) * 57.3; aero += V16.state.sailForceN; }
    }
    rows.push(`main ${ms} jib ${js} vang ${vang}: ${((sum / n) * 1.9438).toFixed(2)} kn heel ${(heel / n).toFixed(1)} sailF ${(aero / n).toFixed(0)} | main α/chordAngle ${alphaRows(V16.layout.main)} | jib ${alphaRows(V16.layout.jib)}`);
  }
  const vc = m.rig.vangC; return { rows, vang: { rest: vc?.rest, tension: vc?.tension ?? vc?.lambda, keys: vc ? Object.keys(vc).slice(0, 20) : null }, cfgRig: m.config.rig, params: { sailAeroScale: V16.params.sailAeroScale, shearExp: m.wind.shearExp, gustiness: m.wind.gustiness, speed10: m.wind.speed10 } };
})()
