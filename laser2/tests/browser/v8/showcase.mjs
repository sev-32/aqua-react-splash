// V8 showcase: sailing hero frames + a physically caused knockdown, swim, righting and re-boarding.
const hideUi = `for (const el of document.body.querySelectorAll('*')) { if (el.tagName === 'CANVAS' || el.querySelector?.('canvas')) continue; const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.position === 'absolute') el.style.display = 'none'; }`;
const cam = (along, side, up, lookUp = 1.0, lookAlong = 0.3) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const p = m.body.pos; const T = window.LASER2_THREE_R160;
    const q = m.body.quat; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize();
    const right = new T.Vector3(-fwd.z, 0, fwd.x);
    f.systems.camera.enabled = false;
    const h = f.systems.ocean.height(p.x, p.z);
    m.camera.position.set(p.x + fwd.x * ${along} + right.x * ${side}, h + ${up}, p.z + fwd.z * ${along} + right.z * ${side});
    m.camera.lookAt(p.x + fwd.x * ${lookAlong}, h + ${lookUp}, p.z + fwd.z * ${lookAlong}); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
const status = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery.telemetry(); const s = window.__sim.get(); return { t: +(window.__t / 60).toFixed(1), heel: +c.heelDeg.toFixed(0), sog: +s.sog.toFixed(2), agents: c.agents.map(a => a.id + ':' + a.task) }; })()`;
const setup = `(() => { const f = window.LASER2_FOUNDRY; ${hideUi} f.setMode('sailing'); window.__sim.setWind(14, 0);
  window.__t = 0; window.__run = (n) => { for (let i = 0; i < n; i += 6) { window.__sim.stepN(6); window.__t += 6; if (i % 60 === 0) f.kernel.frame(0); } };
  window.__until = (pred, max) => { for (let i = 0; i < max; i += 6) { if (pred()) return i; window.__sim.stepN(6); window.__t += 6; if (i % 60 === 0) f.kernel.frame(0); } return -1; };
  window.__tasks = () => f.systems.crewRecovery.telemetry().agents.map(a => a.task);
  window.__heel = () => f.systems.crewRecovery.telemetry().heelDeg;
  window.__run(600); ${hideUi} return 'ok'; })()`;
export default [
  { name: 'setup', shot: false, code: setup },
  { name: 'chase_quarter', code: cam(-6.5, -4.5, 2.4, 1.6) + status },
  { name: 'windward_beam', code: `window.__run(30);` + cam(-1.0, -5.5, 1.6, 1.4) + status },
  { name: 'bow_quarter', code: `window.__run(30);` + cam(5.5, -4.0, 1.8, 1.6) + status },
  { name: 'crew_close', code: `window.__run(30);` + cam(-1.6, -2.6, 1.5, 0.9) + status },
  { name: 'leeward_sails', code: `window.__run(30);` + cam(-2.5, 5.5, 1.2, 2.6, 0.8) + status },
  { name: 'knockdown', code: `window.LASER2_FOUNDRY.systems.crewRecovery.forceCapsize(); window.__until(() => window.__heel() > 50, 900);` + cam(-5, -6, 2.2, 1.0) + status },
  { name: 'going_over', code: `window.__until(() => window.__heel() > 80, 600); window.__run(30);` + cam(-5, -6, 2.2, 0.6) + status },
  { name: 'in_water', code: `window.__run(90);` + cam(-4, -5, 2.0, 0.4) + status },
  { name: 'on_the_board', code: `window.__until(() => window.__tasks().some(t => t === 'standBoard'), 1800); window.__run(40);` + cam(-3, 5, 2.4, 0.6) + status },
  { name: 'righting', code: `window.__until(() => window.__heel() < 60, 1800);` + cam(-4, 4.5, 2.6, 0.8) + status },
  { name: 'coming_up', code: `window.__until(() => window.__heel() < 35, 1800);` + cam(-4, -4.5, 2.6, 1.0) + status },
  { name: 'climb_in', code: `window.__until(() => window.__tasks().some(t => t === 'climbIn'), 1800); window.__run(60);` + cam(-3.5, 4.5, 2.4, 0.9) + status },
  { name: 'back_aboard', code: `window.__until(() => window.__tasks().every(t => t === 'sailing'), 2400); window.__run(60);` + cam(-4, 4.5, 2.6, 1.0) + status },
  { name: 'sailing_again', code: `window.__run(360);` + cam(-6, -5, 2.6, 1.2) + status },
];
