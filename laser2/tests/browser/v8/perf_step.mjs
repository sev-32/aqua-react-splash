// Physics cost per 1/60 s step while sailing (14 kn), and per-frame render-side crew cost.
const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(14, 0); for (let i = 0; i < 10; i++) { window.__sim.stepN(30); f.kernel.frame(0); } return 'ok'; })()`;
const measure = `(() => { const f = window.LASER2_FOUNDRY; const rs = window.LASER2_RIG_STRUCTURE; const out = {};
  const t0 = performance.now(); window.__sim.stepN(300); const t1 = performance.now();
  out.stepMs = +((t1 - t0) / 300).toFixed(3);
  const st = rs.solver.stats; out.rig = { solveUs: st.lastSolveUs, factorUs: st.lastFactorUs, factorizations: st.factorizations, solves: st.solves };
  const f0 = st.factorizations, s0 = st.solves; window.__sim.stepN(60); out.rig.factorPerStep = +((st.factorizations - f0) / 60).toFixed(1); out.rig.solvesPerStep = +((st.solves - s0) / 60).toFixed(1);
  const sp = f.systems.sailingPhysics.telemetry(); out.hullHookMs = sp.hookCpuMs;
  // render-side: kernel frame without physics
  const r0 = performance.now(); for (let i = 0; i < 10; i++) f.kernel.frame(0); const r1 = performance.now(); out.frameMs = +((r1 - r0) / 10).toFixed(2);
  const lc = f.systems.lucidCrew?.telemetry?.(); out.lucid = lc ? { solveMs: lc.solveMs } : null;
  return JSON.stringify(out); })()`;
export default [{ name: 'setup', shot: false, code: setup }, { name: 'measure', shot: false, code: measure }];
