(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160;
  const crew = f.systems.crewRecovery; const V16 = window.LASER2_RIGGING_V16; const R17 = window.LASER2_SPREADER_RIG_V17_2;
  const input = m.input.state; const body = m.body;
  const d = (p) => { const w = crew.worldToDesign(p, { x: 0, y: 0, z: 0 }); return [w.x, w.z].map(v => +v.toFixed(3)); };
  const top = () => { const t = d(m.rig.mast[23].x), h = d(m.rig.mast[14].x), b = d(m.rig.mast[0].x); return `tipX ${t[0]} tipZ ${t[1]} | houndsX ${h[0]} | baseZ ${b[1]}`; };
  const shr = () => R17.metrics().sides.map(s => `${s.side[0]}${s.shroudTensionN.toFixed(0)}`).join('/');
  const hal = () => { const c = V16.standingRigConstraints.find(c => c.label.startsWith('jib-halyard')); return c ? (c.tension ?? 0).toFixed(0) : '?'; };
  const fwdOf = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); v.y = 0; return v.normalize(); };
  const yaw = () => { const v = fwdOf(); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const out = [];
  const settings = [[0.026, 450], [0.06, 450], [0.06, 1200], [0.1, 1200], [0.14, 1500]];
  for (const [take, pre] of settings) {
    V16.params.jibHalyardTakeupM = take; V16.params.standingRigPretensionN = pre;
    for (const s of R17.routedShrouds) s.configure?.();
    window.__sim.setWind(0.5, 0); window.__sim.stepN(300);
    const calm = `${top()} shrouds ${shr()} halyard ${hal()}`;
    window.__sim.setWind(12, 0);
    const side = Math.sign(yaw()) || 1; let target = side * 45 * Math.PI / 180, lastErr = 0;
    for (let i = 0; i < 900; i++) { const e = wrap(target - yaw()); const dd = (e - lastErr) * 60; lastErr = e; input.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * dd))); window.__sim.stepN(1); }
    out.push(`take ${take} pre ${pre}: CALM ${calm} || UPWIND ${top()} shrouds ${shr()} halyard ${hal()} kn ${(Math.hypot(body.vel.x, body.vel.z) * 1.944).toFixed(2)} αM ${crew['lastAlpha'].main.toFixed(0)} αJ ${crew['lastAlpha'].jib.toFixed(0)}`);
  }
  return out;
})()
