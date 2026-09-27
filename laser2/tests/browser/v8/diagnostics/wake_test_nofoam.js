(async () => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  window.__sim.setWind(14, 0); { const fm = f.systems.waterInteraction["foamMaterial"]; fm.uniforms.uEntryGain.value = 0; fm.uniforms.uBreakGain.value = 0; }
  const T = window.LASER2_THREE_R160;
  const t0 = performance.now();
  // Step physics + render frames so the interaction solver advances with the boat.
  for (let i = 0; i < 120; i++) { window.__sim.stepN(2); f.kernel.frame(0); }
  const ms = performance.now() - t0;
  f.systems.camera.enabled = false; const p = m.body.pos;
  const fwd = new T.Vector3(0, 0, 1).applyQuaternion(m.body.quat); fwd.y = 0; fwd.normalize();
  m.camera.position.set(p.x - fwd.x * 9 + fwd.z * 4, p.y + 5.5, p.z - fwd.z * 9 - fwd.x * 4); m.camera.lookAt(p.x - fwd.x * 3, p.y, p.z - fwd.z * 3); m.camera.updateMatrixWorld();
  f.kernel.frame(0);
  const gl = f.legacy.gl;
  return { msPer2Steps: ms / 120, glError: gl.getError(), inter: f.systems.waterInteraction.telemetry(), sog: window.__sim.get().sog };
})()
