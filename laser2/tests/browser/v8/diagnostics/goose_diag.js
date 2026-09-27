(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const RS = window.LASER2_RIG_STRUCTURE; const V16 = window.LASER2_RIGGING_V16;
  f.setMode('anchored'); window.__sim.setWind(0.2, 0);
  window.__sim.stepN(300);
  const b0 = m.rig.boom[0];
  const main = m.sails.main.cloth;
  const tack = main.parts[0][0];
  const cons = m.physics.constraints.filter(c => c && c !== RS.solver && (c.a === b0 || c.b === b0 || c.p === b0 || c.pA === b0 || c.pB === b0));
  const inv = m.body.quat.clone().invert();
  const loc = (v) => v.clone().sub(m.body.pos).applyQuaternion(inv);
  const tr = V16.trackConstraints[0];
  return {
    b0: loc(b0.x).toArray().map(v => +v.toFixed(4)),
    tack: loc(tack.x).toArray().map(v => +v.toFixed(4)),
    mast2: loc(m.rig.mast[2].x).toArray().map(v => +v.toFixed(4)),
    mast3: loc(m.rig.mast[3].x).toArray().map(v => +v.toFixed(4)),
    boom1: loc(m.rig.boom[1].x).toArray().map(v => +v.toFixed(4)),
    cons: cons.map(c => ({ ctor: c.constructor?.name, rest: c.rest, alpha: c.alpha, uni: c.uni, tension: c.tension, len: c.a && c.b ? +c.a.x.distanceTo(c.b.x).toFixed(4) : null, isTack: c.a === tack || c.b === tack, enabled: c.enabled })),
    track0: { lambdas: tr.lambdas, t: tr.t, row: tr.rowIndex },
    tackDist: +tack.x.distanceTo(b0.x).toFixed(4),
  };
})()
