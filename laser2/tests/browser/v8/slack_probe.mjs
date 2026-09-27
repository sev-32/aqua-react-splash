import stages from './aero_diag.mjs';
const probe = `(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; window.__target(45); for (let i = 0; i < 1200; i++) { window.__steer(); window.__sim.stepN(1); }
  const rs = window.LASER2_RIG_STRUCTURE; const out = {};
  for (const kind of ['main', 'jib']) { const rows = rs.solver.rows.filter((r) => r.group === kind + '-leech'); const restSum = rows.reduce((a, r) => a + r.rest, 0);
    const parts = m.sails[kind].cloth.parts; const cols = parts[0].length; const clew = parts[0][cols - 1].x, head = parts[parts.length - 1][cols - 1].x;
    const luffHead = parts[parts.length - 1][0].x; const cur = rows.reduce((a, r) => a + r.source.a.x.distanceTo(r.source.b.x), 0);
    // straightness: max perpendicular distance of leech points from the clew-head line
    const d = head.clone().sub(clew); const L = d.length(); d.normalize(); let bow = 0;
    for (let r = 0; r < parts.length; r++) { const p = parts[r][cols - 1].x.clone().sub(clew); const along = p.dot(d); const perp = p.addScaledVector(d, -along).length(); bow = Math.max(bow, perp); }
    out[kind] = { rows: parts.length, cols, leechRestSum: +restSum.toFixed(3), leechCurrent: +cur.toFixed(3), clewToHeadStraight: +L.toFixed(3), slackM: +(restSum - L).toFixed(3), maxBowM: +bow.toFixed(3), headGapToLuffHead: +head.distanceTo(luffHead).toFixed(3) }; }
  return JSON.stringify(out); })()`;
export default [stages[0], { name: 'probe', shot: false, code: probe }];
