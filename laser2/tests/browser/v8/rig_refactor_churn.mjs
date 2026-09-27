const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(14, 0); for (let i = 0; i < 10; i++) { window.__sim.stepN(30); f.kernel.frame(0); } return 'ok'; })()`;
const probe = `(() => { const rs = window.LASER2_RIG_STRUCTURE; const S = rs.solver; const out = {};
  // wrap factor to attribute the trigger
  const counts = {}; const origFactor = S.factor.bind(S); let lastActive = S.rows.map((r) => r.active);
  S.factor = function () { const changed = []; S.rows.forEach((r, i) => { if (r.active !== lastActive[i]) changed.push(r.group); }); const key = changed.length ? [...new Set(changed)].join('+') : 'geometry(substep)'; counts[key] = (counts[key] ?? 0) + 1; lastActive = S.rows.map((r) => r.active); return origFactor(); };
  const f0 = S.stats.factorizations, s0 = S.stats.solves; window.__sim.stepN(120);
  out.factorPerStep = +((S.stats.factorizations - f0) / 120).toFixed(1); out.solvesPerStep = +((S.stats.solves - s0) / 120).toFixed(1); out.triggers = counts;
  for (const thr of [1e-3, 1e-2]) { S.params.lateActivationM = thr; const g0 = S.stats.factorizations; window.__sim.stepN(120); out['factorPerStep@' + thr] = +((S.stats.factorizations - g0) / 120).toFixed(1); }
  S.factor = origFactor; S.params.lateActivationM = 1e-4; return JSON.stringify(out); })()`;
export default [{ name: 'setup', shot: false, code: setup }, { name: 'probe', shot: false, code: probe }];
