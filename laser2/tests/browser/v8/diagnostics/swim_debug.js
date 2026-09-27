(() => {
  const f = window.LASER2_FOUNDRY; const m = f.legacy.master;
  f.setMode('sailing'); window.__sim.setWind(12, 0); window.__sim.stepN(240);
  const crew = f.systems.crewRecovery; crew.forceCapsize();
  const rows = [];
  for (let i = 0; i < (window.__N ?? 70); i++) {
    window.__sim.stepN(30);
    const fr = crew['frame']; const L = { x: fr.fwd.x, z: fr.fwd.z }; const ln = Math.hypot(L.x, L.z); L.x /= ln; L.z /= ln;
    let B = { x: -fr.up.x, z: -fr.up.z }; const bn = Math.hypot(B.x, B.z) || 1; B.x /= bn; B.z /= bn;
    const sw = f.systems.sailWater.telemetry(); const row = [(i + 1) * 0.5, 'heel', fr.heelDeg.toFixed(0), 'hullV', Math.hypot(fr.vel.x, fr.vel.z).toFixed(2), 'hdg', (Math.atan2(L.x, L.z) * 57.3).toFixed(0), 'sailA', sw.immersedAreaM2.toFixed(1), 'Fn', sw.normalForceN.toFixed(0), 'film', sw.filmKg.toFixed(1)];
    for (const a of crew.agents) {
      const s = a.swimmer; const rx = s.x.x - fr.center.x, rz = s.x.z - fr.center.z;
      row.push(`${a.id}:${a.task}`);
      if (s.active) row.push(`wp${a.waypoint} a${(rx * L.x + rz * L.z).toFixed(2)} b${(rx * B.x + rz * B.z).toFixed(2)} vrel${Math.hypot(s.v.x - fr.vel.x, s.v.z - fr.vel.z).toFixed(2)} hold${s.hold.toFixed(2)} thr${s.swimThrottle.toFixed(2)}`);
    }
    rows.push(row.join(' '));
  }
  return rows;
})()
