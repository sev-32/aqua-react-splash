// Upwind aero/hydro breakdown: per-row sail angle of attack and force (V16 strip formula), hull resistance parts.
const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(Number(window.__TWS ?? 12), 0); for (let i = 0; i < 8; i++) { window.__sim.stepN(30); f.kernel.frame(0); }
  const m = f.legacy.master; const inp = m.input.state; const T = window.LASER2_THREE_R160; const body = m.body;
  const yaw = () => { const v = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); return Math.atan2(v.x, v.z); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); let last = 0;
  window.__target = (deg) => { window.__tgt = Math.sign(yaw() || 1) * deg * Math.PI / 180; };
  window.__steer = () => { const e = wrap(window.__tgt - yaw()); const d = (e - last) * 60; last = e; inp.tiller = Math.max(-1, Math.min(1, -(1.4 * e + 0.45 * d))); };
  const v16 = window.LASER2_RIGGING_V16; const P = v16.params;
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  window.__rows = (rows, area, kind) => { const out = []; const inv = body.quat.clone().invert(); const fwd = new T.Vector3(0, 0, 1).applyQuaternion(body.quat); const right = new T.Vector3(1, 0, 0).applyQuaternion(body.quat);
    const n = rows.length; const aspect = kind === 'main' ? 4.2 : 3.35; const stall = P.sailStallDeg * Math.PI / 180; const w = new T.Vector3();
    for (let r = 0; r < n; r++) { const row = rows[r]; const luff = row[0], leech = row[row.length - 1], mid = row[Math.floor(row.length * 0.42)];
      const c = leech.x.clone().sub(luff.x); if (c.lengthSq() < 1e-7) continue; const chordLen = c.length(); c.normalize();
      const prev = rows[Math.max(0, r - 1)], next = rows[Math.min(n - 1, r + 1)];
      const span = next[0].x.clone().add(next[next.length - 1].x).sub(prev[0].x).sub(prev[prev.length - 1].x); if (span.lengthSq() < 1e-8) continue; span.normalize();
      const normal = new T.Vector3().crossVectors(span, c).normalize();
      const center = luff.x.clone().add(leech.x).multiplyScalar(0.5); const vel = luff.v.clone().add(leech.v).add(mid.v).multiplyScalar(1 / 3);
      m.wind.velocityAt(center, w); const rel = w.clone().sub(vel); rel.addScaledVector(span, -rel.dot(span)); const U = rel.length(); const fd = rel.clone().multiplyScalar(1 / U);
      const sa = Math.max(-0.999, Math.min(0.999, fd.dot(normal))); const al = Math.asin(sa); const ca = Math.sqrt(Math.max(1e-5, 1 - sa * sa));
      const clL = P.sailLiftSlope * al; const cnL = clL / Math.max(0.32, ca); const cnS = P.sailPostStallCn * sa * Math.abs(sa); const sep = smooth(stall * 0.82, stall * 1.9, Math.abs(al));
      const cn = cnL + (cnS - cnL) * sep; const clD = clL + (cnS * ca - clL) * sep; const cd = P.sailProfileCd + clD * clD / (Math.PI * aspect * Math.max(0.35, P.sailInducedEfficiency)) + sep * 0.78 * sa * sa;
      const areaRow = area / n; const qA = 0.5 * 1.225 * U * U * areaRow * P.sailAeroScale; const F = normal.clone().multiplyScalar(qA * cn).addScaledVector(fd, qA * cd);
      const lc = c.clone().applyQuaternion(inv); const chordDeg = Math.atan2(lc.x, lc.z) * 57.3; // angle of chord from centreline (luff->leech points aft: z<0)
      const hgt = center.clone().sub(body.pos).applyQuaternion(inv).y;
      out.push({ r, h: +hgt.toFixed(2), chord: +chordLen.toFixed(2), cAng: +(180 - Math.abs(chordDeg)).toFixed(1), aoa: +(al * 57.3).toFixed(1), U: +U.toFixed(2), cn: +cn.toFixed(2), drive: +F.dot(fwd).toFixed(1), side: +F.dot(right).toFixed(1) }); }
    return out; };
  return 'ok'; })()`;
const leg = (deg) => `(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160; window.__target(${deg}); for (let i = 0; i < 1500; i++) { window.__steer(); window.__sim.stepN(1); }
  const L = window.LASER2_RIGGING_V16.layout; const acc = { main: null, jib: null }; let k = 0; const sp = f.systems.sailingPhysics; const res = { hullN: 0, residuaryN: 0, boardDragN: 0, rudderDragN: 0, sog: 0, heel: 0, leeway: 0, board: 0 };
  for (let i = 0; i < 300; i++) { window.__steer(); window.__sim.stepN(1); if (i % 10) continue; k++;
    for (const [kind, rows, area] of [['main', L.main, 8.64], ['jib', L.jib, 2.88]]) { const rr = window.__rows(rows, area, kind); if (!acc[kind]) acc[kind] = rr.map((x) => ({ ...x })); else rr.forEach((x, j) => { for (const key of ['h', 'chord', 'cAng', 'aoa', 'U', 'cn', 'drive', 'side']) acc[kind][j][key] += x[key]; }); }
    const t = sp.telemetry(); res.hullN += t.surgeResistance.hullN; res.residuaryN += t.surgeResistance.residuaryN; res.boardDragN += t.surgeResistance.boardDragN; res.rudderDragN += t.surgeResistance.rudderDragN; res.sog += window.__sim.get().sog; res.heel += f.systems.crewRecovery.telemetry().heelDeg; res.leeway += t.kinematics.leewayDeg; res.board += t.board.liftN ?? 0; }
  const fmt = (a) => a.map((x) => { const o = {}; for (const key of Object.keys(x)) o[key] = key === 'r' ? x[key] : +(x[key] / k).toFixed(key === 'drive' || key === 'side' ? 1 : 2); return o; });
  const main = fmt(acc.main), jib = fmt(acc.jib); const sum = (a, key) => +a.reduce((s, x) => s + x[key], 0).toFixed(1);
  for (const key of Object.keys(res)) res[key] = +(res[key] / k).toFixed(2);
  return JSON.stringify({ res, mainDrive: sum(main, 'drive'), mainSide: sum(main, 'side'), jibDrive: sum(jib, 'drive'), jibSide: sum(jib, 'side'), trims: { main: +m.input.state.mainScope.toFixed(2), jib: +m.input.state.jibScope.toFixed(2), vang: +m.input.state.vang.toFixed(2) }, main: main.map((x) => [x.r, x.h, x.cAng, x.aoa, x.cn, x.drive, x.side].join(' ')), jib: jib.map((x) => [x.r, x.h, x.cAng, x.aoa, x.cn, x.drive, x.side].join(' ')) }); })()`;
export default [
  { name: 'setup', shot: false, code: setup },
  { name: 'upwind45', shot: false, code: leg(45) },
];
