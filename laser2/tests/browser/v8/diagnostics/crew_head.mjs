const cam = (pos, look) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
    const d2w = (x, y, z) => { const ref = m.bodyReference ?? { y: 0.3, z: -0.15 }; return new T.Vector3(x, y - ref.y, z - ref.z).applyQuaternion(m.body.quat).add(m.body.pos); };
    f.systems.camera.enabled = false;
    const p = d2w(${pos.join(',')}), l = d2w(${look.join(',')});
    m.camera.position.copy(p); m.camera.lookAt(l); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; f.systems.waterInteraction.enabled = false; window.__sim.setWind(12, 0); for (let i = 0; i < 10; i++) { window.__sim.stepN(30); f.kernel.frame(0); } const h = f.legacy.master.helm.human.cur.head; return [h.x, h.y, h.z].map(v => +v.toFixed(2)); })()` },
  { name: 'heads', code: cam([-0.5, 1.25, -0.2], [0.85, 0.95, -0.6]) },
  { name: 'helm_face', code: cam([-0.2, 1.2, -0.5], [0.9, 0.9, -0.9]) },
  { name: 'crew_face', code: cam([-0.2, 1.2, 0.3], [0.9, 0.9, -0.2]) },
];
