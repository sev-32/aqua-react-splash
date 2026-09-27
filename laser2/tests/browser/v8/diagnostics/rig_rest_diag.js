(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  const RS = window.LASER2_RIG_STRUCTURE; const V16 = window.LASER2_RIGGING_V16;
  f.setMode('anchored'); window.__sim.setWind(0.2, 0); m.input.state.mainScope = 0; m.input.state.jibScope = 0;
  const mast = m.rig.mast;
  const inv = () => m.body.quat.clone().invert();
  const loc = (p) => p.clone().sub(m.body.pos).applyQuaternion(inv());
  const init = mast.map((p) => loc(p.x));
  const out = {};
  const snap = (tag) => {
    const rows = RS.solver.rows;
    const pick = (g) => rows.filter((r) => r.group === g).map((r) => ({ l: r.label, C: +(r.C * 1000).toFixed(2), T: +r.tensionN.toFixed(0), act: r.active, rest: +r.rest.toFixed(4) }));
    out[tag] = {
      shroud: pick('shroud'), halyard: pick('halyard'), forestay: pick('forestay'), diamond: pick('diamond'), tack: pick('jib-luff').filter(r => r.l === 'jib-tack'),
      luffC_mm: rows.filter((r) => r.group === 'jib-luff' && r.l !== 'jib-tack').map((r) => +(r.C * 1000).toFixed(2)),
      luffT: rows.filter((r) => r.group === 'jib-luff').map((r) => +r.tensionN.toFixed(0)),
      hounds: (() => { const h = loc(mast[15].x); return [+h.x.toFixed(4), +h.y.toFixed(4), +h.z.toFixed(4)]; })(),
      top: (() => { const h = loc(mast[23].x); return [+h.x.toFixed(4), +h.y.toFixed(4), +h.z.toFixed(4)]; })(),
      topMoveFromInit_mm: (() => { const h = loc(mast[23].x); return [+(1000 * (h.x - init[23].x)).toFixed(1), +(1000 * (h.y - init[23].y)).toFixed(1), +(1000 * (h.z - init[23].z)).toFixed(1)]; })(),
      takeup: V16.params.jibHalyardTakeupM, pret: V16.params.standingRigPretensionN,
      jibHead: (() => { const p = m.sails.jib.cloth.parts; const h = loc(p[p.length - 1][0].x); const t = loc(p[0][0].x); return { head: [+h.x.toFixed(3), +h.y.toFixed(3), +h.z.toFixed(3)], tack: [+t.x.toFixed(3), +t.y.toFixed(3), +t.z.toFixed(3)], dist: +h.distanceTo(t).toFixed(4) }; })(),
    };
  };
  window.__sim.stepN(10); snap('t10');
  window.__sim.stepN(400); snap('t410');
  return out;
})()
