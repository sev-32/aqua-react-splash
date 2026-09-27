(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  f.setMode('sailing');
  window.__sim.setWind(12, 0);
  const crew = f.systems.crewRecovery, phys = f.systems.sailingPhysics;
  const rows = []; const t0 = performance.now();
  const log = (t) => { const c = crew.telemetry(); rows.push([t.toFixed(1), 'heel', c.heelDeg.toFixed(0), 'sog', window.__sim.get().sog.toFixed(1), ...c.agents.map(a => `${a.id}:${a.task}${a.swimmer ? '@' + a.swimmer.pos.join(',') + ' d' + a.swimmer.depth + (a.swimmer.grip !== null ? ' T' + a.swimmer.grip : '') : ''} lean${a.lean}`)].join(' ')); };
  for (let i = 0; i < 16; i++) { window.__sim.stepN(15); if (i % 8 === 7) log((i + 1) * 0.25); }
  crew.forceCapsize();
  for (let i = 0; i < 200; i++) { window.__sim.stepN(15); if (i % 2 === 1) log(4 + (i + 1) * 0.25); }
  const ms = performance.now() - t0;
  return { msPerStep: ms / (220 * 15), rows, crew: crew.telemetry(), phys: { state: phys.telemetry().capsizeState, mass: phys.telemetry().compositeMassKg, righting: phys.telemetry().rightingMomentNm } };
})()
