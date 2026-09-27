(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const V16 = window.LASER2_RIGGING_V16; const R17 = window.LASER2_SPREADER_RIG_V17_2;
  f.setMode('anchored');
  window.__sim.setWind(0.2, 0);
  m.input.state.mainScope = 0; m.input.state.jibScope = 0;
  window.__sim.stepN(300);
  const inv = m.body.quat.clone().invert();
  const loc = (p) => { const v = p.clone().sub(m.body.pos).applyQuaternion(inv); return v; };
  const mast = m.rig.mast;
  const ref = mast.map((p) => loc(p.x));
  const prof = () => [0, 4, 8, 9, 12, 15, 18, 21, 23].map((i) => { const v = loc(mast[i].x); return `${i}:${(v.x - ref[i].x).toFixed(3)}`; }).join(' ');
  const side = new T.Vector3(1, 0, 0).applyQuaternion(m.body.quat);
  const results = [];
  let force = 0;
  const hook = () => { if (force) mast[mast.length - 1].f.addScaledVector(side, force); };
  m.physics.forceHooks.push(hook);
  for (const [subs, iters] of [[12, 6], [24, 3], [36, 2], [48, 2]]) {
    m.config.sim.substeps = subs; m.physics.iterations = iters; V16.params.solverIterations = iters;
    force = 0; window.__sim.stepN(300);
    for (let i = 0; i < mast.length; i++) ref[i] = loc(mast[i].x);
    const t0 = performance.now(); window.__sim.stepN(60); const msPerStep = (performance.now() - t0) / 60;
    for (const F of [0, 100, 200]) {
      force = F; window.__sim.stepN(360);
      const sh = R17.metrics().sides.map(s => `${s.side[0]}${s.shroudTensionN.toFixed(0)}`).join('/');
      results.push(`subs ${subs} iters ${iters} (${msPerStep.toFixed(2)} ms/step) F ${F}N: dx ${prof()} | shrouds ${sh}`);
    }
    force = 0; window.__sim.stepN(200);
  }
  m.physics.forceHooks.splice(m.physics.forceHooks.indexOf(hook), 1);
  m.config.sim.substeps = 12; m.physics.iterations = 6; V16.params.solverIterations = 6;
  const spreaderInfo = R17.bracketConstraints?.map?.((b) => ({ keys: Object.keys(b).slice(0, 16) }));
  return { nodes: mast.length, nodeY: [0, 4, 8, 9, 12, 15, 18, 21, 23].map(i => +ref[i].y.toFixed(2)), results, spreaderInfo, mastInvMass: mast.map(p => +p.w.toFixed(2)).join(',') };
})()
