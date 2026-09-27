(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const V16 = window.LASER2_RIGGING_V16; const R17 = window.LASER2_SPREADER_RIG_V17_2;
  f.setMode('anchored'); window.__sim.setWind(0.2, 0); m.input.state.mainScope = 0; m.input.state.jibScope = 0;
  window.__sim.stepN(300);
  const mast = m.rig.mast; const mastSet = new Set(mast);
  const isP = (o) => o && typeof o === 'object' && o.x && o.v && typeof o.w === 'number';
  const touches = (c) => {
    for (const key of Object.keys(c)) {
      const v = c[key];
      if (isP(v) && mastSet.has(v)) return true;
      if (Array.isArray(v)) for (const e of v) { if (isP(e) && mastSet.has(e)) return true; if (e && typeof e === 'object' && (mastSet.has(e.p) || mastSet.has(e.a) || mastSet.has(e.b))) return true; }
      if (v && typeof v === 'object' && !isP(v) && (mastSet.has(v.p) || mastSet.has(v.a) || mastSet.has(v.b))) return true;
    }
    return false;
  };
  const all = m.physics.constraints;
  const mastCons = all.filter((c) => c && typeof c.solve === 'function' && touches(c));
  const kinds = {}; for (const c of mastCons) { const k = c.constructor?.name || c.label || 'anon'; kinds[k] = (kinds[k] || 0) + 1; }
  let K = 0;
  const booster = { enabled: true, lambda: 0, solve(dt) { for (let k = 0; k < K; k++) for (const c of mastCons) if (c.enabled !== false) c.solve(dt); } };
  all.push(booster);
  const inv = m.body.quat.clone().invert();
  const loc = (p) => p.clone().sub(m.body.pos).applyQuaternion(inv);
  const side = new T.Vector3(1, 0, 0).applyQuaternion(m.body.quat);
  let force = 0; const hook = () => { if (force) mast[mast.length - 1].f.addScaledVector(side, force); };
  m.physics.forceHooks.push(hook);
  const results = [];
  for (const k of [0, 3, 8, 16]) {
    K = k; force = 0; window.__sim.stepN(300);
    const ref = mast.map((p) => loc(p.x));
    const t0 = performance.now(); window.__sim.stepN(60); const ms = (performance.now() - t0) / 60;
    force = 100; window.__sim.stepN(360);
    const prof = [4, 9, 15, 23].map((i) => `${i}:${(loc(mast[i].x).x - ref[i].x).toFixed(3)}`).join(' ');
    results.push(`boost ${k} (${ms.toFixed(1)} ms/step) F100: ${prof} shrouds ${R17.metrics().sides.map(s => s.side[0] + s.shroudTensionN.toFixed(0)).join('/')}`);
  }
  m.physics.forceHooks.splice(m.physics.forceHooks.indexOf(hook), 1);
  all.splice(all.indexOf(booster), 1);
  return { total: all.length, mastCons: mastCons.length, kinds, results };
})()
