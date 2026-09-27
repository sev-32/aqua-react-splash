(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const input = m.input.state; const body = m.body;
  f.setMode('sailing'); window.__sim.setWind(12, 0);
  window.__sim.stepN(600);
  const heel = () => Math.acos(new T.Vector3(0, 1, 0).applyQuaternion(body.quat).y) * 57.3;
  const out = [`pre heel ${heel().toFixed(0)} v ${(Math.hypot(body.vel.x, body.vel.z) * 1.94).toFixed(1)} sailF ${window.LASER2_RIGGING_V16.state.sailForceN.toFixed(0)} wind ${m.wind.curSpeed.toFixed(1)}`];
  const dur = crew.forceCapsize();
  for (let i = 0; i < 16; i++) {
    window.__sim.stepN(30);
    const tel = crew.telemetry();
    out.push(`t${((i + 1) * 0.5).toFixed(1)} heel ${heel().toFixed(0)} wind ${m.wind.curSpeed.toFixed(1)} sailF ${window.LASER2_RIGGING_V16.state.sailForceN.toFixed(0)} ms ${input.mainScope.toFixed(2)} js ${input.jibScope.toFixed(2)} tiller ${input.tiller.toFixed(2)} awa ${crew.lastAwaDeg.toFixed(0)} tasks ${tel.agents.map(a => a.task + '/' + a.hike).join(',')}`);
  }
  return { dur, out };
})()
