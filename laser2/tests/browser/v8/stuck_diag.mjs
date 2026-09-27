// Reproduce the showcase knockdown -> dry capsize -> recovery, log the state every 2 s.
const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(14, 0);
  window.__t = 0; window.__run = (n) => { for (let i = 0; i < n; i += 6) { window.__sim.stepN(6); window.__t += 6; if (i % 60 === 0) f.kernel.frame(0); } };
  window.__run(600); return 'ok'; })()`;
const probe = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery; const m = f.legacy.master; const T = window.LASER2_THREE_R160; const body = m.body;
  const out = []; c.forceCapsize();
  for (let s = 0; s < 45; s++) { window.__run(120);
    const tel = c.telemetry(); const inv = body.quat.clone().invert();
    const mastTop = m.rig.mast[m.rig.mast.length - 1].x.clone().sub(body.pos); const w = m.wind.velocityAtHeight(3, new T.Vector3());
    const mastH = new T.Vector3(mastTop.x, 0, mastTop.z); const mastDownwind = mastH.length() > 0.3 ? +(mastH.normalize().dot(w.clone().setY(0).normalize())).toFixed(2) : null;
    const up = new T.Vector3(0, 1, 0).applyQuaternion(body.quat); const right = new T.Vector3(1, 0, 0).applyQuaternion(body.quat);
    const agents = c['agents'].map((a) => a.id + ':' + a.task + ' side' + a.holdSide + ' com(' + a.comDesign.x.toFixed(2) + ',' + a.comDesign.y.toFixed(2) + ',' + a.comDesign.z.toFixed(2) + ') p' + a.progress.toFixed(2) + ' t' + a.taskTime.toFixed(1));
    out.push('t' + (window.__t / 60).toFixed(0) + ' heel ' + tel.heelDeg.toFixed(0) + ' rightY ' + right.y.toFixed(2) + ' low ' + c['lowerStrapSide']() + ' mastDownwind ' + mastDownwind + ' RM ' + (f.systems.sailingPhysics.telemetry().rightingMomentNm ?? 0).toFixed?.(0) + ' main ' + m.input.state.mainScope.toFixed(2) + ' | ' + agents.join(' | '));
    if (tel.agents.every((a) => a.task === 'sailing') && s > 3) break; }
  return out; })()`;
export default [
  { name: 'setup', shot: false, code: setup },
  { name: 'probe', shot: false, code: probe },
];
