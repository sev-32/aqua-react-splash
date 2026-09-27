(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  window.__sim.setWind(12, 0);
  for (let i = 0; i < 10; i++) { window.__sim.stepN(30); f.kernel.frame(0); }
  const r = (v) => v ? [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)] : null;
  const lc = f.systems.lucidCrew;
  const out = {};
  for (const inst of lc.instances) {
    const cur = inst.actor.human.cur;
    const rt = inst.retarget;
    const J = (n) => rt.asset.jointIndex.get(n);
    const P = (n) => { const j = J(n); return [+rt.P[j * 3].toFixed(3), +rt.P[j * 3 + 1].toFixed(3), +rt.P[j * 3 + 2].toFixed(3)]; };
    out[inst.id] = {
      legacy: { shL: r(cur.shoulderL), elL: r(cur.elbowL), wrL: r(cur.wristL), shR: r(cur.shoulderR), elR: r(cur.elbowR), wrR: r(cur.wristR), pelvis: r(cur.pelvis), hipL: r(cur.hipL), ankleL: r(cur.ankleL) },
      lucid: { shL: P('L_Upperarm'), elL: P('L_Forearm'), wrL: P('L_Hand'), shR: P('R_Upperarm'), elR: P('R_Forearm'), wrR: P('R_Hand'), hip: P('Hip'), thighL: P('L_Thigh'), footL: P('L_Foot') },
      clamps: rt.clampEvents.count,
      sem: Object.fromEntries(rt.asset.header.semantic51.map((d, i) => [d.id, +rt.sem[i].toFixed(1)]).filter(([k]) => /Shoulder|Elbow|Clavicle|Forearm|Wrist/.test(k))),
    };
  }
  return out;
})()
