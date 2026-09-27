const cam = (along, side, up, ly = 0.4) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const p = m.body.pos; const T = window.LASER2_THREE_R160;
    const q = m.body.quat; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize();
    const right = new T.Vector3(-fwd.z, 0, fwd.x);
    f.systems.camera.enabled = false;
    const h = f.systems.ocean.height(p.x, p.z);
    m.camera.position.set(p.x + fwd.x * ${along} + right.x * ${side}, h + ${up}, p.z + fwd.z * ${along} + right.z * ${side});
    m.camera.lookAt(p.x, h + ${ly}, p.z); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
const status = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery.telemetry(); return { heel: +c.heelDeg.toFixed(0), agents: c.agents.map(a => a.id + ':' + a.task) }; })()`;
// Advance physics while rendering frames so the wake solver sees every step.
const run = (frames, per = 3) => `for (let i = 0; i < ${frames}; i++) { window.__sim.stepN(${per}); window.LASER2_FOUNDRY.kernel.frame(0); }`;
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; window.__sim.setWind(13, 0); f.systems.crewRecovery.dryCapsize = false; for (let i = 0; i < 12; i++) { window.__sim.stepN(30); f.kernel.frame(0); } return 'ok'; })()` },
  { name: 'a_sailing', code: run(30) + cam(-6, -6, 2.4, 0.8) + status },
  { name: 'b_slam', code: `window.LASER2_FOUNDRY.systems.crewRecovery.forceCapsize();` + run(28) + cam(-5, -6, 2.4) + status },
  { name: 'c_swim', code: run(80) + cam(-5, 5, 2.6) + status },
  { name: 'd_swim2', code: run(80) + cam(-5, 4, 2.8) + status },
  { name: 'e_board', code: run(80) + cam(-3, 5, 2.6) + status },
  { name: 'f_righting', code: run(40) + cam(-4, 5, 2.8, 0.8) + status },
  { name: 'g_up', code: run(30) + cam(-5, -5, 3.0, 1.0) + status },
];
