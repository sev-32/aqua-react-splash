(async () => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  window.__sim.setWind(14, 0);
  const wi = f.systems.waterInteraction;
  
  for (let i = 0; i < 20; i++) { window.__sim.stepN(30); f.kernel.frame(0); } for (let i = 0; i < 40; i++) { window.__sim.stepN(2); f.kernel.frame(0); }
  const N = wi.telemetry().resolution;
  const r = f.legacy.renderer;
  const readRT = (rt) => { const buf = new Float32Array(N * N * 4); r.readRenderTargetPixels(rt, 0, 0, N, N, buf); return buf; };
  const st = readRT(wi.stateRT[wi.stateIndex]);
  const fo = readRT(wi.foamRT[wi.foamIndex]);
  let hmin = 1e9, hmax = -1e9, dmax = 0, fmax = 0, nanCount = 0, inside = 0;
  let sumOutside = 0, nOutside = 0;
  for (let i = 0; i < N * N; i++) { const h = st[i * 4], D = fo[i * 4 + 1]; if (!Number.isFinite(h)) { nanCount++; continue; } if (D > 0.01) { inside++; continue; } hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); sumOutside += h * h; nOutside++; dmax = Math.max(dmax, D); fmax = Math.max(fmax, fo[i * 4]); }
  let Dmax = 0; for (let i = 0; i < N * N; i++) Dmax = Math.max(Dmax, fo[i * 4 + 1]);
  // Sample a profile along the boat's wake line (behind the boat)
  const b = wi.binding; const cell = wi.cellM; const body = m.body.pos;
  const T = window.LASER2_THREE_R160; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(m.body.quat); fwd.y = 0; fwd.normalize();
  const prof = [];
  for (let d = -6; d <= 20; d += 1) { const x = body.x - fwd.x * d, z = body.z - fwd.z * d; const i = Math.floor((x - b.originX) / cell), j = Math.floor((z - b.originZ) / cell); if (i < 0 || j < 0 || i >= N || j >= N) continue; const k = (j * N + i) * 4; prof.push(`${d}:${st[k].toFixed(3)}|D${fo[k + 1].toFixed(2)}`); }
  const side = [];
  for (let d = -6; d <= 6; d += 1) { const x = body.x - fwd.x * 4 + fwd.z * d, z = body.z - fwd.z * 4 - fwd.x * d; const i = Math.floor((x - b.originX) / cell), j = Math.floor((z - b.originZ) / cell); if (i < 0 || j < 0 || i >= N || j >= N) continue; const k = (j * N + i) * 4; side.push(`${d}:${st[k].toFixed(3)}`); }
  return { hmin, hmax, rmsOutside: Math.sqrt(sumOutside / Math.max(1, nOutside)), inside, Dmax, fmax, nanCount, prof: prof.join(' '), side: side.join(' '), sog: window.__sim.get().sog };
})()
