(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const RS = window.LASER2_RIG_STRUCTURE;
  f.setMode('anchored'); window.__sim.setWind(0.2, 0); m.input.state.mainScope = 0; m.input.state.jibScope = 0;
  const mast = m.rig.mast;
  const loc = (p) => p.clone().sub(m.body.pos).applyQuaternion(m.body.quat.clone().invert());
  const side = () => new T.Vector3(1, 0, 0).applyQuaternion(m.body.quat);
  let force = 0; const hook = () => { if (force) mast[mast.length - 1].f.addScaledVector(side(), force); };
  m.physics.forceHooks.push(hook);
  const out = [];
  for (const every of [1, 2, 3, 6]) {
    RS.solver.params.solveEvery = every;
    force = 0; window.__sim.stepN(300);
    const ref = mast.map((p) => loc(p.x));
    const t0 = performance.now(); window.__sim.stepN(90); const ms = (performance.now() - t0) / 90;
    const st = RS.solver.stats; const us = st.lastSolveUs;
    force = 100; window.__sim.stepN(300);
    const tip = (loc(mast[23].x).x - ref[23].x).toFixed(3), h = (loc(mast[15].x).x - ref[15].x).toFixed(3);
    const tel = RS.telemetry();
    out.push(`every ${every}: ${ms.toFixed(2)} ms/step solve ${us.toFixed(0)}us F100 tip ${tip} hounds ${h} shrouds ${tel.shroudsN} luff ${tel.jibLuffMeanN}`);
    force = 0; window.__sim.stepN(200);
  }
  RS.enabled = false; RS.update(); window.__sim.stepN(100);
  const t0 = performance.now(); window.__sim.stepN(90); out.push(`legacy GS: ${((performance.now() - t0) / 90).toFixed(2)} ms/step`);
  RS.enabled = true; RS.update(); RS.solver.params.solveEvery = 1;
  m.physics.forceHooks.splice(m.physics.forceHooks.indexOf(hook), 1);
  return out;
})()
