(() => {
  const m = window.LASER2_FOUNDRY.legacy.master;
  const pick = (o) => { const out = {}; for (const [k, v] of Object.entries(o)) if (typeof v !== 'object' || v === null) out[k] = v; else if (!v.isVector3) out[k] = JSON.stringify(v).slice(0, 160); else out[k] = v.toArray(); return out; };
  const cons = m.sails.main.cloth.cons; const sample = cons.slice(0, 3).map(c => ({ rest: c.rest, alpha: c.alpha, keys: Object.keys(c) }));
  return { main: pick(m.config.main), jib: pick(m.config.jib), world: { iterations: m.physics.iterations }, sim: pick(m.config.sim), mainCons: cons.length, sample, v16: { solverIterations: window.LASER2_RIGGING_V16.params.solverIterations } };
})()
