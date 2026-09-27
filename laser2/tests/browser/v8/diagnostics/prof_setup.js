(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  delete m.water.height; delete m.water.velocity; delete m.water.update; delete m.water.setSea; delete m.hydro.hook;
  m.body.kinematic = false; window.__sim.setWind(14, 0); window.__sim.stepN(30); return true; })()
