const camW = (along, side, up, lookUp = 1.0) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const p = m.body.pos; const T = window.LASER2_THREE_R160;
    const q = m.body.quat; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize();
    const right = new T.Vector3(-fwd.z, 0, fwd.x);
    f.systems.camera.enabled = false;
    const h = f.systems.ocean.height(p.x, p.z);
    m.camera.position.set(p.x + fwd.x * ${along} + right.x * ${side}, h + ${up}, p.z + fwd.z * ${along} + right.z * ${side});
    m.camera.lookAt(p.x + fwd.x * 0.3, h + ${lookUp}, p.z + fwd.z * 0.3); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; window.__sim.setWind(14, 0); for (let i = 0; i < 16; i++) { window.__sim.stepN(30); f.kernel.frame(0); } return JSON.stringify({ sog: window.__sim.get().sog, heel: window.__sim.get().heel }); })()` },
  { name: 'chase_quarter', code: camW(-6.5, -4.5, 2.4, 1.6) },
  { name: 'windward_beam', code: camW(-1.0, -5.5, 1.6, 1.4) },
  { name: 'bow_quarter', code: camW(5.5, -4.0, 1.8, 1.6) },
  { name: 'crew_close', code: camW(-1.6, -2.6, 1.5, 0.9) },
];
