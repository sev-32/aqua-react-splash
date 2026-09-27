// Knockdown -> recovery, then a fine trace of the first seconds after re-boarding.
const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(14, 0);
  window.__t = 0; window.__run = (n) => { for (let i = 0; i < n; i += 6) { window.__sim.stepN(6); window.__t += 6; if (i % 60 === 0) f.kernel.frame(0); } };
  window.__run(600); return 'ok'; })()`;
const probe = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery; const m = f.legacy.master; const T = window.LASER2_THREE_R160; const body = m.body; const inp = m.input.state;
  const out = []; c.forceCapsize(); let climbT = -1;
  const sideOf = () => { const r = new T.Vector3(1, 0, 0).applyQuaternion(body.quat); return r.y > 0 ? 'stbdUp' : 'portUp'; };
  for (let s = 0; s < 1200; s++) { window.__run(6);
    const tel = c.telemetry(); const tasks = tel.agents.map((a) => a.task);
    if (climbT < 0 && tasks.includes('climbIn')) climbT = window.__t;
    const t = (window.__t / 60).toFixed(1);
    const boomEnd = m.rig.boom[m.rig.boom.length - 1].x; const boomWet = boomEnd.y < f.systems.ocean.height(boomEnd.x, boomEnd.z);
    const w = m.wind.velocityAtHeight(3, new T.Vector3()); const fwd = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); fwd.y = 0; fwd.normalize();
    const from = w.clone().multiplyScalar(-1).setY(0).normalize(); const twa = Math.acos(Math.max(-1, Math.min(1, from.dot(fwd)))) * 57.3;
    const line = 't' + t + ' heel ' + tel.heelDeg.toFixed(0) + ' ' + sideOf() + ' twa ' + twa.toFixed(0) + ' sog ' + window.__sim.get().sog.toFixed(1) + ' ms ' + inp.mainScope.toFixed(2) + ' js ' + inp.jibScope.toFixed(2) + ' vang ' + inp.vang.toFixed(2) + ' til ' + inp.tiller.toFixed(2) + ' boomWet ' + boomWet + ' sailF ' + (window.LASER2_RIGGING_V16.state.sailForceN ?? 0).toFixed(0) + ' | ' + tel.agents.map((a) => a.id + ':' + a.task + '/' + a.hike).join(' ');
    if (climbT >= 0 && s % 2 === 0) out.push(line); else if (s % 20 === 0) out.push(line);
    if (climbT >= 0 && window.__t - climbT > 60 * 10) break; }
  return out; })()`;
export default [{ name: 'setup', shot: false, code: setup }, { name: 'probe', shot: false, code: probe }];
