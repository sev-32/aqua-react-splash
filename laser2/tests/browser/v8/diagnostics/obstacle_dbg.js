(async () => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  const wi = f.systems.waterInteraction;
  for (let i = 0; i < 20; i++) { window.__sim.stepN(2); f.kernel.frame(0); }
  const N = wi.telemetry().resolution; const r = f.legacy.renderer;
  const buf = new Uint16Array(N * N * 4);
  r.readRenderTargetPixels(wi.obstacleRT, 0, 0, N, N, buf);
  const T = window.LASER2_THREE_R160;
  const half = (v) => { const DataUtils = T.DataUtils; if (DataUtils?.fromHalfFloat) return DataUtils.fromHalfFloat(v); const s = (v & 0x8000) >> 15, e = (v & 0x7C00) >> 10, fr = v & 0x03FF; if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (fr / 1024); if (e === 0x1F) return fr ? NaN : (s ? -Infinity : Infinity); return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + fr / 1024); };
  let i0 = N, i1 = -1, j0 = N, j1 = -1, minY = 1e9, maxY = -1e9, count = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = (j * N + i) * 4; const a = half(buf[k]); if (a < 1000) { count++; i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); minY = Math.min(minY, a); maxY = Math.max(maxY, -half(buf[k + 1])); } }
  const b = wi.binding; const cell = wi.cellM;
  // hull world bbox from physics mesh
  const mesh = f.systems.sailingPhysics.mesh; const ref = m.bodyReference ?? { y: 0.3, z: -0.15 };
  const q = m.body.quat, p = m.body.pos; const v = new T.Vector3();
  let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9, by0 = 1e9, by1 = -1e9;
  for (let k = 0; k < mesh.positions.length; k += 3) { v.set(mesh.positions[k], mesh.positions[k + 1] - ref.y, mesh.positions[k + 2] - ref.z).applyQuaternion(q).add(p); bx0 = Math.min(bx0, v.x); bx1 = Math.max(bx1, v.x); bz0 = Math.min(bz0, v.z); bz1 = Math.max(bz1, v.z); by0 = Math.min(by0, v.y); by1 = Math.max(by1, v.y); }
  return {
    count, texBox: [i0, i1, j0, j1], worldFromTex: [b.originX + i0 * cell, b.originX + (i1 + 1) * cell, b.originZ + j0 * cell, b.originZ + (j1 + 1) * cell],
    hullWorldBox: [bx0, bx1, bz0, bz1], yRangeTex: [minY, maxY], yRangeHull: [by0, by1], body: [p.x, p.y, p.z], eta: f.systems.ocean.height(p.x, p.z), ref,
  };
})()
