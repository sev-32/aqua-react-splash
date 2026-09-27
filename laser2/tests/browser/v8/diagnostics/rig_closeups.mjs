// Close-up views of rig, sails, ropes and crew while sailing (camera relative to the hull frame).
const cam = (pos, look) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
    const d2w = (x, y, z) => { const ref = m.bodyReference ?? { y: 0.3, z: -0.15 }; return new T.Vector3(x, y - ref.y, z - ref.z).applyQuaternion(m.body.quat).add(m.body.pos); };
    f.systems.camera.enabled = false;
    const p = d2w(${pos.join(',')}), l = d2w(${look.join(',')});
    m.camera.position.copy(p); m.camera.lookAt(l); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; f.systems.waterInteraction.enabled = false; window.__sim.setWind(12, 0); for (let i = 0; i < 12; i++) { window.__sim.stepN(30); f.kernel.frame(0); } return window.__sim.get().sog; })()` },
  // design frame: +x port? (x sign), +y up, +z bow. Camera to leeward/aft looking at the main.
  { name: 'main_leeward', code: cam([3.2, 2.2, -3.5], [0, 2.6, -0.2]) },
  { name: 'main_windward', code: cam([-3.4, 2.0, -3.2], [0, 2.8, 0]) },
  { name: 'mast_top', code: cam([1.5, 4.8, 1.6], [0, 5.4, 0.6]) },
  { name: 'cockpit_crew', code: cam([0.2, 2.4, -3.6], [0, 0.8, -0.6]) },
  { name: 'bow_jib', code: cam([1.6, 1.4, 3.6], [0, 1.2, 1.2]) },
  { name: 'boom_sheet', code: cam([1.8, 1.3, -2.2], [0, 1.0, -1.2]) },
];
