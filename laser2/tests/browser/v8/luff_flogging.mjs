// Head-to-wind flogging metric: leech motion normal to the sail, flutter on vs off.
const setup = `(() => { const f = window.LASER2_FOUNDRY; window.__sim.setWind(14, 0); for (let i = 0; i < 8; i++) { window.__sim.stepN(30); f.kernel.frame(0); }
  const c = f.systems.crewRecovery; c.trimAssist = false; const m = f.legacy.master; const inp = m.input.state; const T = window.LASER2_THREE_R160; const body = m.body;
  const yaw = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); let last = 0;
  window.__target = (deg) => { window.__tgt = Math.sign(yaw() || 1) * deg * Math.PI / 180; };
  window.__steer = () => { const e = wrap(window.__tgt - yaw()); const d = (e - last) * 60; last = e; inp.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * d))); };
  window.__yaw = yaw;
  window.__metric = (n, deg, main, jib) => {
    const L = window.LASER2_RIGGING_V16.layout; const rowsM = L.main, rowsJ = L.jib;
    const pick = (rows, rf) => { const r = rows[Math.floor(rows.length * rf)]; return [r[Math.floor(r.length * 0.5)], r[r.length - 1]]; };
    const pts = [...pick(rowsM, 0.35), ...pick(rowsM, 0.65), ...pick(rowsJ, 0.5)];
    const acc = pts.map(() => ({ e: null, r2: 0, k: 0 }));
    const inv = new T.Quaternion(); const v = new T.Vector3();
    for (let i = 0; i < n; i++) { window.__steer(); inp.mainScope = main; inp.jibScope = jib; window.__sim.stepN(1);
      inv.copy(body.quat).invert(); pts.forEach((p, j) => { v.set(p.x.x - body.pos.x, p.x.y - body.pos.y, p.x.z - body.pos.z).applyQuaternion(inv); const a = acc[j];
        if (!a.e) a.e = v.clone(); else a.e.lerp(v, 1 / 18);
        if (i > n / 4) { a.r2 += v.distanceToSquared(a.e); a.k++; } }); }
    const sd = acc.map((a) => Math.sqrt(a.r2 / a.k));
    const s = window.__sim.get();
    return { yawDeg: +(yaw() * 180 / Math.PI).toFixed(1), sog: +s.sog.toFixed(2), sdMm: sd.map((x) => +(x * 1000).toFixed(1)), flutter: f.systems.sailFlutter.telemetry() };
  };
  window.__target(0); return 'ok'; })()`;
const run = (on, deg, main, jib) => `(() => { const f = window.LASER2_FOUNDRY; f.systems.sailFlutter.enabled = ${on}; window.__target(${deg}); return JSON.stringify(window.__metric(240, ${deg}, ${main}, ${jib})); })()`;
export default [
  { name: 'setup', shot: false, code: setup },
  { name: 'settle', shot: false, code: run(false, 8, 0.6, 0.6) },
  { name: 'h2w_off', shot: false, code: run(false, 8, 0.6, 0.6) },
  { name: 'h2w_on', shot: false, code: run(true, 8, 0.6, 0.6) },
  { name: 'h2w_off2', shot: false, code: run(false, 8, 0.6, 0.6) },
  { name: 'h2w_on2', shot: false, code: run(true, 8, 0.6, 0.6) },
];
