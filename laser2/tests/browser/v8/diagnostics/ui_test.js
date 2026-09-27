(() => {
  const f = window.LASER2_FOUNDRY;
  window.__sim.stepN(300);
  for (let i = 0; i < 3; i++) f.kernel.frame(1 / 60);
  return { mode: f.kernel.snapshot().state.mode, hud: f.systems.sailingHud.telemetry(), cam: f.systems.camera.telemetry() };
})()
