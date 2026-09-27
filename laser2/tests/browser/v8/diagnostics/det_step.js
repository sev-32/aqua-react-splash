(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  delete m.water.height; delete m.water.velocity; delete m.water.update; delete m.water.setSea; delete m.hydro.hook;
  m.body.kinematic = false; window.__sim.setWind(16, 0);
  // deterministic: freeze wind time noise? wind uses internal time only -> deterministic
  const t0 = performance.now();
  window.__sim.stepN(120);
  const ms = performance.now() - t0;
  const parts = m.physics.particles.map(p => [p.x.x, p.x.y, p.x.z]);
  const sum = parts.reduce((a, p) => a + p[0] * 1.3 + p[1] * 2.7 + p[2] * 0.9, 0);
  const rig = window.LASER2_RIGGING_V16.metrics();
  return { ms, sum, body: m.body.pos.toArray(), n: parts.length, contacts: rig.sailSailContactEventsTotal ?? rig.contactEventsTotal, first: parts.slice(0, 3) };
})()
