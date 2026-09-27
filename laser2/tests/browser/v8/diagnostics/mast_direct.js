(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const R17 = window.LASER2_SPREADER_RIG_V17_2; const RS = window.LASER2_RIG_STRUCTURE;
  f.setMode('anchored'); window.__sim.setWind(0.2, 0); m.input.state.mainScope = 0; m.input.state.jibScope = 0;
  const mast = m.rig.mast;
  const inv = () => m.body.quat.clone().invert();
  const loc = (p) => p.clone().sub(m.body.pos).applyQuaternion(inv());
  const side = () => new T.Vector3(1, 0, 0).applyQuaternion(m.body.quat);
  let force = 0; const hook = () => { if (force) mast[mast.length - 1].f.addScaledVector(side(), force); };
  m.physics.forceHooks.push(hook);
  const results = [];
  for (const on of [false, true]) {
    RS.enabled = on; RS.update();
    force = 0; window.__sim.stepN(400);
    const ref = mast.map((p) => loc(p.x));
    const t0 = performance.now(); window.__sim.stepN(60); const ms = (performance.now() - t0) / 60;
    const tel0 = on ? RS.telemetry() : null;
    const sh0 = R17.metrics().sides.map(s => s.side[0] + s.shroudTensionN.toFixed(0)).join('/');
    force = 100; window.__sim.stepN(400);
    const prof = [4, 9, 15, 23].map((i) => `${i}:${(loc(mast[i].x).x - ref[i].x).toFixed(3)}`).join(' ');
    const sh = R17.metrics().sides.map(s => s.side[0] + s.shroudTensionN.toFixed(0)).join('/');
    const tel = on ? RS.telemetry() : null;
    results.push({ on, msPerStep: +ms.toFixed(2), F100: prof, shroudsRest: sh0, shroudsLoaded: sh, telRest: tel0 && { shroudsN: tel0.shroudsN, diamondsN: tel0.diamondsN, halyardN: tel0.halyardN, jibLuffMeanN: tel0.jibLuffMeanN, foot: tel0.mastFootCompressionN, vang: tel0.vangN, masthead: tel0.masthead, stats: tel0.stats, matrix: tel0.matrix, groups: tel0.groups }, telLoaded: tel && { shroudsN: tel.shroudsN, masthead: tel.masthead } });
    force = 0; window.__sim.stepN(200);
  }
  m.physics.forceHooks.splice(m.physics.forceHooks.indexOf(hook), 1);
  RS.enabled = true; RS.update();
  return results;
})()
