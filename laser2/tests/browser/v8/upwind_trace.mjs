import stages from './aero_diag.mjs';
const trace = `(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const c = f.systems.crewRecovery; window.__target(45); const out = [];
  for (let i = 0; i < 1500; i++) { window.__steer(); window.__sim.stepN(1); if (i % 60 === 0) { const t = c.telemetry(); const s = window.__sim.get();
    out.push(i / 60 + 's heel ' + t.heelDeg.toFixed(0) + ' sog ' + s.sog.toFixed(1) + ' hdg ' + s.hdg.toFixed(0) + ' ms ' + m.input.state.mainScope.toFixed(2) + ' js ' + m.input.state.jibScope.toFixed(2) + ' til ' + m.input.state.tiller.toFixed(2) + ' ' + t.agents.map((a) => a.id + ':' + a.task + '/' + a.hike).join(' ')); } }
  return out; })()`;
export default [stages[0], { name: 'trace', shot: false, code: trace }];
