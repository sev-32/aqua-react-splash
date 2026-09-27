(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  const RS = window.LASER2_RIG_STRUCTURE;
  f.setMode('anchored'); window.__sim.setWind(0.2, 0); m.input.state.mainScope = 0; m.input.state.jibScope = 0;
  const out = { tune: RS.tune };
  const snap = (tag) => { const t = RS.telemetry(); out[tag] = { shroudsN: t.shroudsN, diamondsN: t.diamondsN, halyardN: t.halyardN, luff: t.jibLuffMeanN, foot: t.mastFootCompressionN, vang: t.vangN, masthead: t.masthead, act: t.stats.activeSetChanges, clamped: t.stats.clampedPivots, maxRes: t.stats.maxResidualM }; };
  window.__sim.stepN(60); snap('t60');
  window.__sim.stepN(300); snap('t360');
  window.__sim.stepN(600); snap('t960');
  return out;
})()
