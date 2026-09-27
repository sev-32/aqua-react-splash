const cam = (pos, look, hide) => `
  { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
    const d2w = (x, y, z) => { const ref = m.bodyReference ?? { y: 0.3, z: -0.15 }; return new T.Vector3(x, y - ref.y, z - ref.z).applyQuaternion(m.body.quat).add(m.body.pos); };
    f.systems.camera.enabled = false;
    for (const id of ['helm', 'crew']) { const g = m[id].human.group; for (const c of g.children) if (c.userData.foundryLucidCrew) c.visible = (id !== '${hide}'); }
    const p = d2w(${pos.join(',')}), l = d2w(${look.join(',')});
    m.camera.position.copy(p); m.camera.lookAt(l); m.camera.updateMatrixWorld(); f.kernel.frame(0); }`;
export default [
  { name: 'setup', shot: false, code: `(() => { const f = window.LASER2_FOUNDRY; document.getElementById('foundry-ui')?.style.setProperty('display','none'); for (const el of document.querySelectorAll('body > div')) if (!el.id?.startsWith('foundry')) el.style.display='none'; f.systems.waterInteraction.enabled = false; window.__sim.setWind(12, 0); for (let i = 0; i < 10; i++) { window.__sim.stepN(30); f.kernel.frame(0); } const m = f.legacy.master; const r = (v) => v.toArray().map(x => +x.toFixed(2)); return JSON.stringify({ helm: { handT: m.helm.handT.map(r), pelvis: r(m.helm.human.cur.pelvis) }, crew: { handT: m.crew.handT.map(r), pelvis: r(m.crew.human.cur.pelvis), trapB: m.crew.trapB }, holds: { ms: r(m.holds.mainsheet), jib: r(m.holds.jib), trap: r(m.holds.trapHandle) } }); })()` },
  { name: 'helm_only', code: cam([-1.2, 1.5, -1.6], [-0.3, 1.1, -0.7], 'crew') },
  { name: 'crew_only', code: cam([-1.2, 1.5, -1.6], [-0.3, 1.1, -0.7], 'helm') },
  { name: 'top', code: cam([0.0, 4.0, -0.6], [0.0, 0.5, -0.55], 'none') },
];
