(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  window.__sim.setWind(12, 0); window.__sim.stepN(300);
  const r = (v) => v ? v.toArray().map((x) => +x.toFixed(3)) : null;
  const h = m.holds;
  const out = { holds: Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v?.toArray ? r(v) : v])) };
  for (const id of ['helm', 'crew']) {
    const a = m[id];
    out[id] = { hands: a.hands.map(r), handT: a.handT.map(r), shoulderL: r(a.human.cur.shoulderL), shoulderR: r(a.human.cur.shoulderR), wristL: r(a.human.cur.wristL), wristR: r(a.human.cur.wristR), pelvis: r(a.human.cur.pelvis), head: r(a.human.cur.head), trapB: a.trapB, side: a.side, reachAdj: a.handReachAdjustmentM, L: a.L };
  }
  return out;
})()
