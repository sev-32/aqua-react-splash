const camW = (along, side, up, lookUp = 1.0) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const p = m.body.pos; const T = window.LASER2_THREE_R160;
    const q = m.body.quat; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize();
    const right = new T.Vector3(-fwd.z, 0, fwd.x);
    f.systems.camera.enabled = false;
    const h = f.systems.ocean.height(p.x, p.z);
    m.camera.position.set(p.x + fwd.x * ${along} + right.x * ${side}, h + ${up}, p.z + fwd.z * ${along} + right.z * ${side});
    m.camera.lookAt(p.x + fwd.x * 0.3, h + ${lookUp}, p.z + fwd.z * 0.3); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
const tel = `(() => JSON.stringify(window.LASER2_FOUNDRY.systems.sailFlutter.telemetry()))()`;
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; f.systems.waterInteraction.enabled = false; window.__sim.setWind(14, 0); for (let i = 0; i < 8; i++) { window.__sim.stepN(30); f.kernel.frame(0); } const c = f.systems.crewRecovery; c.trimAssist = false; const m = f.legacy.master; const inp = m.input.state; const T = window.LASER2_THREE_R160; const body = m.body;
    const yaw = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); return Math.atan2(v.x, v.z); };
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); const side = Math.sign(yaw()) || 1; const target = side * 70 * Math.PI / 180; let last = 0;
    window.__steer = () => { const e = wrap(target - yaw()); const d = (e - last) * 60; last = e; inp.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * d))); };
    for (let i = 0; i < 420; i++) { window.__steer(); inp.mainScope = 0; inp.jibScope = 0; window.__sim.stepN(1); if (i % 60 === 0) f.kernel.frame(0); } return 'ok'; })()` },
  { name: 'luff_a', code: `window.__steer(); window.__sim.stepN(1);` + camW(-3.5, -6.0, 2.6, 2.4) + tel },
  { name: 'luff_b', code: `for (let i = 0; i < 6; i++) { window.__steer(); window.__sim.stepN(1); }` + camW(-3.5, -6.0, 2.6, 2.4) + tel },
  { name: 'luff_c', code: `for (let i = 0; i < 6; i++) { window.__steer(); window.__sim.stepN(1); }` + camW(-3.5, -6.0, 2.6, 2.4) + tel },
];
