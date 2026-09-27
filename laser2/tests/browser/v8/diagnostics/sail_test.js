(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  f.setMode('sailing');
  window.__sim.setWind(14, 0);
  const out = []; const t0 = performance.now();
  for (let i = 0; i < 48; i++) {
    window.__sim.stepN(15);
    const g = window.__sim.get(); const sp = f.systems.sailingPhysics.telemetry();
    out.push([ (i + 1) * 0.25, +g.sog.toFixed(2), +g.heel.toFixed(1), +g.hdg.toFixed(0), sp.capsizeState, +sp.kinematics.leewayDeg.toFixed(1), +m.body.pos.y.toFixed(3), +sp.hydro.submergedVolumeM3.toFixed(3), +sp.compositeMassKg.toFixed(0), +sp.hookCpuMs.mean.toFixed(3) ].join(' '));
  }
  const ms = performance.now() - t0;
  // camera for screenshot
  f.systems.camera.enabled = false; const p = m.body.pos;
  for (const o of [m.water.meshNear, m.water.meshFar]) if (o) o.visible = true;
  m.camera.position.set(p.x + 6, p.y + 3.5, p.z + 7); m.camera.lookAt(p.x, p.y + 1.2, p.z); f.kernel.frame(0);
  return { msPerStep: ms / (48 * 15), rows: out, ocean: f.systems.ocean.telemetry(), phys: f.systems.sailingPhysics.telemetry() };
})()
