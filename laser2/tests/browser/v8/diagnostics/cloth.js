(() => {
  const m = window.LASER2_FOUNDRY.legacy.master; const L = window.LASER2_RIGGING_V16.layout;
  const out = {};
  for (const k of ['main', 'jib', 'spin']) {
    const s = m.sails[k]; const c = s?.cloth;
    if (!c) { out[k] = null; continue; }
    let mass = 0, pinned = 0; for (const p of c.flat) { if (p.w > 0) mass += 1 / p.w; else pinned++; }
    let area = 0; const T = window.LASER2_THREE_R160; const a = new T.Vector3(), b = new T.Vector3();
    for (const t of c.tris) { a.copy(c.flat[t[1]].x).sub(c.flat[t[0]].x); b.copy(c.flat[t[2]].x).sub(c.flat[t[0]].x); area += a.cross(b).length() * 0.5; }
    out[k] = { keys: Object.keys(s), particles: c.flat.length, tris: c.tris.length, massKg: mass, pinned, areaM2: area, sameAsLayout: L[k + 'Flat'] === c.flat, pkeys: Object.keys(c.flat[0]), rows: c.rows, cols: c.cols };
  }
  return out;
})()
