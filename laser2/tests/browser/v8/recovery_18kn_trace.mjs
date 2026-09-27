// 18 kn knockdown -> recovery -> settle: 1 s trace.
const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(18, 0);
  window.__t = 0; window.__run = (n) => { for (let i = 0; i < n; i += 6) { window.__sim.stepN(6); window.__t += 6; if (i % 60 === 0) f.kernel.frame(0); } };
  window.__run(600); return 'ok'; })()`;
const probe = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery; const m = f.legacy.master; const T = window.LASER2_THREE_R160; const body = m.body; const inp = m.input.state;
  c.dryCapsize = true; c.forceCapsize(); const out = [];
  for (let s = 0; s < 150; s++) { window.__run(60); const tel = c.telemetry();
    const w = m.wind.velocityAtHeight(3, new T.Vector3()); const fwd = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); fwd.y = 0; fwd.normalize();
    const from = w.clone().multiplyScalar(-1).setY(0).normalize(); const twa = Math.acos(Math.max(-1, Math.min(1, from.dot(fwd)))) * 57.3;
    out.push('t' + (window.__t / 60).toFixed(0) + ' heel ' + tel.heelDeg.toFixed(0) + ' twa ' + twa.toFixed(0) + ' sog ' + window.__sim.get().sog.toFixed(1) + ' settle ' + tel.settleS + ' ms ' + inp.mainScope.toFixed(2) + ' js ' + inp.jibScope.toFixed(2) + ' til ' + inp.tiller.toFixed(2) + ' trap ' + (inp.trapeze ? 1 : 0) + ' | ' + tel.agents.map((a) => a.id + ':' + a.task + '/' + a.hike).join(' ')); }
  return out; })()`;
export default [{ name: 'setup', shot: false, code: setup }, { name: 'probe', shot: false, code: probe }];
