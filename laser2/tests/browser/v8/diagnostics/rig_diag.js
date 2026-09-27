(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const input = m.input.state; const body = m.body;
  window.__sim.setWind(12, 0);
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const d = (p) => { const w = crew.worldToDesign(p, { x: 0, y: 0, z: 0 }); return [w.x, w.y, w.z].map(v => +v.toFixed(3)); };
  const mastProfile = () => m.rig.mast.filter((_, i) => i % 2 === 0 || i === m.rig.mast.length - 1).map((p) => d(p.x).join(','));
  const out = { still: mastProfile() };
  const side = Math.sign(yaw()) || 1; let target = side * 45 * Math.PI / 180, lastErr = 0;
  const steer = () => { const e = wrap(target - yaw()); const dd = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * dd))); };
  for (let i = 0; i < 1500; i++) { steer(); window.__sim.stepN(1); }
  out.upwind = mastProfile();
  const r17 = window.LASER2_SPREADER_RIG_V17_2.metrics();
  out.shrouds = r17.sides.map(s => ({ side: s.side, T: +s.shroudTensionN.toFixed(0), rest: +s.shroudRestLengthM.toFixed(3), len: +s.shroudTotalLengthM.toFixed(3), spreader: +s.spreaderLengthM.toFixed(3) }));
  const v16 = window.LASER2_RIGGING_V16;
  out.standing = v16.standingRigConstraints.map(c => ({ label: c.label, T: +(c.tension ?? 0).toFixed(0), rest: +c.rest.toFixed(3), enabled: c.enabled !== false }));
  out.jibHalyard = m.sails.jib.cloth.vertCons[0].slice(0, 3).map(c => +(c.tension ?? 0).toFixed(0));
  out.mastParticles = m.rig.mast.length;
  out.sailForce = v16.state.sailForceN;
  out.heel = f.systems.sailingPhysics.telemetry().kinematics;
  return out;
})()
