(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  window.__sim.setWind(12, 0);
  const crew = f.systems.crewRecovery; crew.dryCapsize = false;
  window.__sim.stepN(240);
  crew.forceCapsize();
  window.__sim.stepN(240);
  // Turn the capsized boat turtle: roll it about its own fore-aft axis to ~170°.
  const b = m.body; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(b.quat); fwd.y = 0; fwd.normalize();
  const yaw = Math.atan2(fwd.x, fwd.z);
  const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 170 * Math.PI / 180));
  // Rotate the whole rig with the hull so the constraints stay satisfied.
  const delta = q.clone().multiply(b.quat.clone().invert());
  const pivot = b.pos.clone(); const tmp = new T.Vector3();
  for (const p of m.physics.particles) {
    tmp.copy(p.x).sub(pivot).applyQuaternion(delta).add(pivot); p.x.copy(tmp);
    if (p.p) { tmp.copy(p.p).sub(pivot).applyQuaternion(delta).add(pivot); p.p.copy(tmp); }
    p.v.set(0, 0, 0);
  }
  b.quat.copy(q); b.prevQuat?.copy?.(q); b.omega.set(0, 0, 0); b.vel.set(0, 0, 0);
  const mastTip = m.rig.mast[m.rig.mast.length - 1].x;
  const rows = [];
  for (let i = 0; i < 90; i++) {
    window.__sim.stepN(30);
    const c = crew.telemetry();
    rows.push(`${((i + 1) * 0.5).toFixed(1)} heel ${c.heelDeg.toFixed(0)} mastTipY ${mastTip.y.toFixed(2)} ${c.agents.map((a) => `${a.id}:${a.task}`).join(' ')}`);
  }
  return rows;
})()
