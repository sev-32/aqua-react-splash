(() => {
  const f = window.LASER2_FOUNDRY;
  for (let i = 0; i < 40; i++) f.kernel.frame(1 / 60);
  f.telemetry.checkGlError('smoke:end');
  const snap = f.telemetry.snapshot();
  return { webgl: { errors: snap.webgl.errorEvents, policy: snap.webgl.errorPolicy, skipped: snap.webgl.errorChecksSkipped }, lucid: f.systems.lucidCrew.telemetry(), rig: (() => { const t = window.LASER2_RIG_STRUCTURE.telemetry(); return { installed: t.installed, shroudsN: t.shroudsN, halyardN: t.halyardN, luff: t.jibLuffMeanN, tune: t.tune, masthead: t.masthead }; })(), errors: snap.errors?.slice?.(-3) ?? null, mode: f.state?.get?.().mode ?? null };
})()
