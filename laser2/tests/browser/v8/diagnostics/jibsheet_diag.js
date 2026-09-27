(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  window.__sim.setWind(12, 0); window.__sim.stepN(600);
  const jib = m.sails.jib;
  const sp = f.systems.sailingPhysics;
  const inv = m.body.quat.clone().invert();
  const loc = (v) => v.clone().sub(m.body.pos).applyQuaternion(inv);
  const clew = loc(jib.clew.x);
  const res = jib.sheetCs.map((c) => { const a = new (m.body.pos.constructor)(); m.body.localToWorld(c.local, a); return { rest: +c.rest.toFixed(3), len: +a.distanceTo(jib.clew.x).toFixed(3), tension: +(c.tension || 0).toFixed(0), alpha: c.alpha, uni: c.uni, fair: loc(a).toArray().map(v => +v.toFixed(2)) }; });
  return { wrapped: !!sp.jibTrimOriginal, setTrimSrc: String(jib.setTrim).slice(0, 120), js: m.input.state.jibScope, clew: clew.toArray().map(v => +v.toFixed(2)), sheets: res };
})()
