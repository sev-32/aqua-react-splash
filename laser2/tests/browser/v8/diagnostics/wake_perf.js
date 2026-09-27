(async () => {
  const f = window.LASER2_FOUNDRY;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');

  const out = {};
  const time = (label, n, fn) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); f.legacy.gl.finish(); out[label] = (performance.now() - t0) / n; };
  window.__sim.stepN(60);
  f.kernel.frame(0); f.kernel.frame(0); time('step2', 5, () => window.__sim.stepN(2));
  time('frameWithInteraction', 5, () => { window.__sim.stepN(2); f.kernel.frame(0); });
  f.systems.waterInteraction.enabled = false;
  time('frameWithoutInteraction', 5, () => { window.__sim.stepN(2); f.kernel.frame(0); });
  f.systems.waterInteraction.enabled = true;
  out.inter = f.systems.waterInteraction.telemetry();
  out.glError = f.legacy.gl.getError();
  return out;
})()
