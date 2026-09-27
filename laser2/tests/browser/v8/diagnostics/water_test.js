(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  f.setMode('sailing');
  window.__sim.setWind(12, 0);
  window.__sim.stepN(240);
  f.systems.camera.enabled = false; const p = m.body.pos;
  m.camera.position.set(p.x + 7, p.y + 3.2, p.z + 8); m.camera.lookAt(p.x, p.y + 1.0, p.z); m.camera.updateMatrixWorld();
  f.kernel.frame(0);
  const gl = f.legacy.gl;
  const r = f.systems.renderer.telemetry();
  return { glError: gl.getError(), pipeline: r.pipeline, pipelineRenders: r.pipelineRenders, water: f.systems.waterSurface.telemetry(), logDepth: f.legacy.renderer.capabilities.logarithmicDepthBuffer, ctx: gl.getContextAttributes(), transparent: (() => { const out = []; f.legacy.scene.traverse(o => { if (o.isMesh && o.visible) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const mt of mats) if (mt && (mt.transparent || mt.transmission > 0)) out.push(`${o.name}|${mt.type}|t${mt.transparent}|tr${mt.transmission ?? ''}|o${mt.opacity}`); } }); return out; })() };
})()
