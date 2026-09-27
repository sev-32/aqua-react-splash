(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  const crew = f.systems.crewRecovery;
  const d = (p) => { const w = crew.worldToDesign(p, { x: 0, y: 0, z: 0 }); return [w.x, w.y, w.z].map(v => +v.toFixed(3)); };
  const prof = () => [0, 4, 8, 12, 16, 20, 23].map(i => d(m.rig.mast[i].x).join(','));
  const out = {};
  const r17 = () => window.LASER2_SPREADER_RIG_V17_2.metrics().sides.map(s => `${s.side} T${s.shroudTensionN.toFixed(0)} len${s.shroudTotalLengthM.toFixed(3)} rest${s.shroudRestLengthM.toFixed(3)}`).join(' | ');
  out.mode0 = f.kernel.snapshot().state.mode;
  out.sailing0 = { prof: prof(), shrouds: r17(), body: m.body.pos.toArray().map(v => +v.toFixed(3)), up: [0, 1, 0] };
  window.__sim.setWind(0.5, 0);
  window.__sim.stepN(600);
  out.sailingCalm = { prof: prof(), shrouds: r17(), body: m.body.pos.toArray().map(v => +v.toFixed(3)) };
  f.setMode('anchored');
  window.__sim.setWind(0.5, 0);
  window.__sim.stepN(600);
  out.anchoredCalm = { prof: prof(), shrouds: r17() };
  window.__sim.setWind(12, 0);
  window.__sim.stepN(600);
  out.anchored12 = { prof: prof(), shrouds: r17() };
  return out;
})()
