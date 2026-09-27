(async () => {
  const f = window.LASER2_FOUNDRY;
  const L = f.legacy;
  const m = L.master;
  document.getElementById('foundry-ui')?.style.setProperty('display', 'none');
  // restore legacy water + hydro authorities that the V7 adapter stubbed out
  delete m.water.height; delete m.water.velocity; delete m.water.update; delete m.water.setSea;
  delete m.hydro.hook;
  for (const o of [m.water.meshNear, m.water.meshFar]) if (o) o.visible = true;
  m.body.kinematic = false;
  window.__sim.setWind(14, 0);
  const out = [];
  const up = new m.body.pos.constructor();
  for (let i = 0; i < 40; i++) {
    window.__sim.stepN(15);
    const g = window.__sim.get();
    up.set(0, 1, 0).applyQuaternion(m.body.quat);
    out.push({ t: (i + 1) * 0.25, sog: +g.sog.toFixed(2), heel: +g.heel.toFixed(1), hdg: +g.hdg.toFixed(0), capsized: g.capsized, y: +m.body.pos.y.toFixed(3), upY: +up.y.toFixed(2), physMs: +g.physMs.toFixed(1) });
  }
  // camera
  const p = m.body.pos;
  f.systems.camera && (f.systems.camera.enabled = false);
  m.camera.position.set(p.x + 6, p.y + 3.5, p.z + 7);
  m.camera.lookAt(p.x, p.y + 1.2, p.z);
  f.kernel.frame(0);
  return out;
})()
