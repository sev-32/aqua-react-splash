(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  f.setMode('sailing');
  window.__sim.setWind(12, 0);
  const crew = f.systems.crewRecovery, phys = f.systems.sailingPhysics;
  const rows = []; const t0 = performance.now();
  const log = (t) => { const c = crew.telemetry(); const p = phys.telemetry(); rows.push([t.toFixed(1), 'heel', c.heelDeg.toFixed(0), 'RM', p.rightingMomentNm.toFixed(0), 'mass', p.compositeMassKg.toFixed(0), ...c.agents.map(a => `${a.id}:${a.task}${a.swimmer ? (a.swimmer.grip !== null ? ' T' + a.swimmer.grip : '') : ' com' + a.comDesign.join(',')} lean${a.lean}`)].join(' ')); };
  window.__sim.stepN(240);
  crew.forceCapsize();
  for (let i = 0; i < 90; i++) { window.__sim.stepN(60); log(4 + (i + 1)); }
  return { msPerStep: (performance.now() - t0) / (240 + 90 * 60), rows, crew: crew.telemetry() };
})()
