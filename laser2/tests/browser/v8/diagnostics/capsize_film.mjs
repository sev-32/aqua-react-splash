const cam = (dx, dy, dz, ly = 0.6) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const p = m.body.pos;
    f.systems.camera.enabled = false;
    m.camera.position.set(p.x + ${dx}, Math.max(0.6, p.y + ${dy}), p.z + ${dz}); m.camera.lookAt(p.x, p.y + ${ly}, p.z); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
const status = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery.telemetry(); const s = f.systems.sailingPhysics.telemetry(); return { t: window.__sim.get().t ?? null, heel: c.heelDeg, state: s.capsizeState, agents: c.agents.map(a => a.id + ':' + a.task) }; })()`;
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; f.setMode('sailing'); window.__sim.setWind(12, 0); window.__sim.stepN(240); return 'ok'; })()` },
  { name: 'sailing', code: cam(-6, 2.2, 7) + status },
  { name: 'capsize_1s', code: `window.LASER2_FOUNDRY.systems.crewRecovery.forceCapsize(); window.__sim.stepN(60);` + cam(-6, 2.2, 7) + status },
  { name: 'capsize_4s', code: `window.__sim.stepN(180);` + cam(-6, 2.5, 7) + status },
  { name: 'swim_10s', code: `window.__sim.stepN(360);` + cam(5, 2.5, 6) + status },
  { name: 'swim_16s', code: `window.__sim.stepN(360);` + cam(-5, 2.5, -6) + status },
  { name: 'board_22s', code: `window.__sim.stepN(360);` + cam(6, 2.5, 5) + status },
  { name: 'board_28s', code: `window.__sim.stepN(360);` + cam(-6, 2.5, 5) + status },
  { name: 'righting_34s', code: `window.__sim.stepN(360);` + cam(6, 3, 6) + status },
  { name: 'after_42s', code: `window.__sim.stepN(480);` + cam(-6, 3, 6) + status },
];
