(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const L = window.LASER2_RIGGING_V16.layout;
  const d = (p) => { const w = f.systems.crewRecovery.worldToDesign(p.x, {x:0,y:0,z:0}); return [w.x, w.y, w.z].map(v => +v.toFixed(2)); };
  window.__sim.stepN(120);
  const out = {};
  for (const k of ['main', 'jib']) {
    const rows = L[k];
    out[k] = { rows: rows.length, cols: rows[0].length, foot: [d(rows[0][0]), d(rows[0][rows[0].length - 1])], mid: [d(rows[Math.floor(rows.length / 2)][0]), d(rows[Math.floor(rows.length / 2)][rows[0].length - 1])], head: [d(rows[rows.length - 1][0]), d(rows[rows.length - 1][rows[0].length - 1])] };
  }
  out.crew = f.systems.crewRecovery.telemetry().sailAngleOfAttackDeg;
  return out;
})()
