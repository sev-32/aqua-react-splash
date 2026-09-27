import stages from './aero_diag.mjs';
const camW = (along, side, up, lookUp = 1.0) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const p = m.body.pos; const T = window.LASER2_THREE_R160;
    const q = m.body.quat; const fwd = new T.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize();
    const right = new T.Vector3(-fwd.z, 0, fwd.x);
    f.systems.camera.enabled = false; const h = f.systems.ocean.height(p.x, p.z);
    m.camera.position.set(p.x + fwd.x * ${along} + right.x * ${side}, h + ${up}, p.z + fwd.z * ${along} + right.z * ${side});
    m.camera.lookAt(p.x + fwd.x * 0.3, h + ${lookUp}, p.z + fwd.z * 0.3); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
const hideUi = `for (const el of document.body.querySelectorAll('*')) { if (el.tagName === 'CANVAS' || el.querySelector?.('canvas')) continue; const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.position === 'absolute') el.style.display = 'none'; }`;
const measure = `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery; window.__target(45); window.__sim.setWind(15, 0); for (let i = 0; i < 1500; i++) { window.__steer(); window.__sim.stepN(1); }
  let k = 0; const acc = {}; let heel = 0, sog = 0;
  for (let i = 0; i < 600; i++) { window.__steer(); window.__sim.stepN(1); if (i % 10) continue; k++; heel += c.telemetry().heelDeg; sog += window.__sim.get().sog;
    for (const a of c['agents']) { const e = acc[a.id] ??= { x: 0, hike: 0, maxX: 0 }; e.x += Math.abs(a.comDesign.x); e.hike += a.hikeCommand; if (a.hikeCommand > 0.95) e.maxX = Math.max(e.maxX, Math.abs(a.comDesign.x)); } }
  const out = { heel: +(heel / k).toFixed(1), sog: +(sog / k).toFixed(2) }; for (const [id, e] of Object.entries(acc)) out[id] = { meanAbsX: +(e.x / k).toFixed(3), meanHike: +(e.hike / k).toFixed(2), fullHikeX: +e.maxX.toFixed(3) };
  ${hideUi} return JSON.stringify(out); })()`;
export default [stages[0],
  { name: 'measure', shot: false, code: measure },
  { name: 'hike_aft', code: camW(-2.2, -3.2, 1.4, 0.9) },
  { name: 'hike_side', code: `for (let i = 0; i < 20; i++) { window.__steer(); window.__sim.stepN(1); }` + camW(0.2, -4.2, 1.2, 0.8) },
  { name: 'knockdown', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery; window.__sim.setWind(12, 0); for (let i = 0; i < 600; i++) { window.__steer(); window.__sim.stepN(1); } c.forceCapsize(); let t = 0; for (; t < 900; t++) { window.__sim.stepN(1); if (c.telemetry().heelDeg > 75) break; } return 'over after ' + (t / 60).toFixed(1) + ' s, heel ' + c.telemetry().heelDeg.toFixed(0); })()` },
];
