// Hull-relative camera: along = metres towards the bow, side = metres to starboard (design -x? use world right of heading), up = height.
const cam = (along, side, up, ly = 0.4) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const p = m.body.pos; const T = window.LASER2_THREE_R160;
    const q = m.body.quat; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize();
    const right = new T.Vector3(-fwd.z, 0, fwd.x);
    f.systems.camera.enabled = false;
    const h = f.systems.ocean.height(p.x, p.z);
    m.camera.position.set(p.x + fwd.x * ${along} + right.x * ${side}, h + ${up}, p.z + fwd.z * ${along} + right.z * ${side});
    m.camera.lookAt(p.x, h + ${ly}, p.z); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
const status = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery.telemetry(); return { heel: +c.heelDeg.toFixed(0), agents: c.agents.map(a => a.id + ':' + a.task) }; })()`;
const setup = (dry) => `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; f.setMode('sailing'); window.__sim.setWind(12, 0); window.__sim.stepN(240); f.systems.crewRecovery.dryCapsize = ${dry}; return 'ok'; })()`;
const steps = (n) => `window.__sim.stepN(${n});`;
export default [
  { name: 'setup', shot: false, code: setup(false) },
  { name: 't0_sailing', code: cam(-5, -6, 2.2, 1.2) + status },
  { name: 't1_knockdown', code: `window.LASER2_FOUNDRY.systems.crewRecovery.forceCapsize();` + steps(60) + cam(-5, -6, 2.2) + status },
  { name: 't2_in_water', code: steps(60) + cam(-4, -5, 2.0) + status },
  { name: 't5_swimming', code: steps(180) + cam(-5, 4, 2.2) + status },
  { name: 't9_round_stern', code: steps(240) + cam(-5, 3, 2.4) + status },
  { name: 't13_hang_board', code: steps(270) + cam(-2, 5, 2.2) + status },
  { name: 't15_climb_board', code: steps(120) + cam(-2, 5, 2.2) + status },
  { name: 't16_righting', code: steps(60) + cam(-3, 5, 2.4, 0.8) + status },
  { name: 't17_coming_up', code: steps(60) + cam(-4, 4.5, 2.6, 1.0) + status },
  { name: 't18_scooped', code: steps(60) + cam(-4, -4.5, 2.6, 1.0) + status },
  { name: 't21_climb_in', code: steps(180) + cam(-4, 4.5, 2.6, 1.0) + status },
  { name: 't25_sailing', code: steps(240) + cam(-6, -5, 2.6, 1.2) + status },
];
