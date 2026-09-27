(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  f.setMode('sailing');
  window.__sim.stepN(30);
  f.systems.camera.enabled = false; const p = m.body.pos;
  m.camera.position.set(p.x + 7, p.y + 3.2, p.z + 8); m.camera.lookAt(p.x, p.y + 1.0, p.z); m.camera.updateMatrixWorld();
  const gl = f.legacy.gl; const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const pts = [[100, H - 20], [600, H - 60], [1100, H - 150], [300, H - 230], [900, H - 250]];
  const read = () => pts.map(([x, y]) => { const px = new Uint8Array(4); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0], px[1], px[2]]; });
  f.kernel.frame(0); const withPipeline = read();
  const ws = f.systems.waterSurface; ws.active = false; f.kernel.frame(0); const direct = read(); ws.active = true;
  const scale = [];
  for (const s of [1.1, 1.2, 1.3, 1.4]) {
    f.systems.atmosphere['material'].uniforms.uLinearScale.value = s; f.kernel.frame(0); scale.push([s, read()]);
  }
  f.systems.atmosphere['material'].uniforms.uLinearScale.value = 0.6;
  return { W, H, withPipeline, direct, scale };
})()
