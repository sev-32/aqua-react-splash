(async () => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  const wi = f.systems.waterInteraction;
  for (let i = 0; i < 20; i++) { window.__sim.stepN(2); f.kernel.frame(0); }
  const N = wi.telemetry().resolution; const r = f.legacy.renderer; const T = window.LASER2_THREE_R160;
  const ob = new Uint16Array(N * N * 4); r.readRenderTargetPixels(wi.obstacleRT, 0, 0, N, N, ob);
  const fo = new Float32Array(N * N * 4); r.readRenderTargetPixels(wi.foamRT[wi.foamIndex], 0, 0, N, N, fo);
  const half = (v) => { const sg = (v & 0x8000) ? -1 : 1, e = (v & 0x7C00) >> 10, fr = v & 0x03FF; if (e === 0) return sg * Math.pow(2, -14) * (fr / 1024); if (e === 0x1F) return fr ? NaN : sg * Infinity; return sg * Math.pow(2, e - 15) * (1 + fr / 1024); };
  const b = wi.binding; const cell = wi.cellM; const body = m.body.pos;
  const fwd = new T.Vector3(0, 0, 1).applyQuaternion(m.body.quat); fwd.y = 0; fwd.normalize();
  const rows = [];
  for (let d = -3; d <= 3; d += 0.5) {
    const x = body.x + fwd.x * d, z = body.z + fwd.z * d;
    const i = Math.floor((x - b.originX) / cell), j = Math.floor((z - b.originZ) / cell);
    const k = (j * N + i) * 4;
    const minY = half(ob[k]), maxY = -half(ob[k + 1]);
    const eta = f.systems.ocean.height(x, z);
    rows.push(`${d}: minY ${minY.toFixed(3)} maxY ${maxY.toFixed(3)} eta ${eta.toFixed(3)} Dgpu ${fo[k + 1].toFixed(3)} Dcpu ${Math.max(0, eta - minY).toFixed(3)}`);
  }
  const u = wi.realspaceMaterial.uniforms.uEtaGrid.value;
  return { rows, etaGrid: [u.x, u.y, u.z, u.w], field: [f.systems.ocean.field.gridOriginX, f.systems.ocean.field.gridOriginZ, f.systems.ocean.field.spacing, f.systems.ocean.field.nx, f.systems.ocean.field.nz] };
})()
