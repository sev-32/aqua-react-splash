(async () => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  window.__sim.setWind(14, 0);
  const T = window.LASER2_THREE_R160;
  for (let i = 0; i < 20; i++) { window.__sim.stepN(30); f.kernel.frame(0); }
  for (let i = 0; i < 60; i++) { window.__sim.stepN(2); f.kernel.frame(0); }
  f.systems.camera.enabled = false; const p = m.body.pos;
  const fwd = new T.Vector3(0, 0, 1).applyQuaternion(m.body.quat); fwd.y = 0; fwd.normalize();
  const side = new T.Vector3(-fwd.z, 0, fwd.x);
  const h = f.systems.ocean.height(p.x, p.z);
  const place = (back, lateral, up, lookBack) => { m.camera.position.set(p.x - fwd.x * back + side.x * lateral, h + up, p.z - fwd.z * back + side.z * lateral); m.camera.lookAt(p.x - fwd.x * lookBack, h, p.z - fwd.z * lookBack); m.camera.updateMatrixWorld(); };
  place(-4, 7, 3.2, 5);
  f.kernel.frame(0);
  return { sog: window.__sim.get().sog, heel: f.systems.crewRecovery.telemetry().heelDeg, awa: f.systems.crewRecovery.telemetry().apparentWindAngleDeg };
})()
