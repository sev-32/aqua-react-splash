(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const RS = window.LASER2_RIG_STRUCTURE;
  f.setMode('anchored'); window.__sim.setWind(0.2, 0);
  window.__sim.stepN(300);
  const rows = RS.solver.rows.filter(r => r.type !== 3 && Math.abs(r.C) > 2e-4).map(r => ({ l: r.label, C_mm: +(r.C * 1000).toFixed(3), T: +r.tensionN.toFixed(0), act: r.active, alpha: r.alpha }));
  const bends = RS.solver.rows.filter(r => r.type === 3).map(r => Math.abs(r.C)).sort((a, b) => b - a).slice(0, 3);
  return { rows, bends, groups: RS.telemetry().groups };
})()
