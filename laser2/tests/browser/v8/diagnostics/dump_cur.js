(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  window.__sim.setWind(12, 0);
  for (let i = 0; i < 10; i++) { window.__sim.stepN(30); f.kernel.frame(0); }
  const out = {};
  for (const id of ['helm', 'crew']) {
    const cur = m[id].human.cur; const o = {};
    for (const k of Object.keys(cur)) o[k] = [cur[k].x, cur[k].y, cur[k].z];
    out[id] = o;
  }
  return out;
})()
