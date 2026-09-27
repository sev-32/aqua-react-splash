import stages from './aero_diag.mjs';
// Upwind TWA 45 in 12 kn with fixed trims: speed, heel, twist, leech/sheet/vang loads.
const run = (label, main, jib, vang) => `(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const c = f.systems.crewRecovery; const inp = m.input.state;
  window.__target(45); const auto = ${main} < 0; c.trimAssist = auto;
  const set = () => { if (!auto) { inp.mainScope = ${main}; inp.jibScope = ${jib}; inp.vang = ${vang}; } };
  for (let i = 0; i < 1500; i++) { window.__steer(); set(); window.__sim.stepN(1); }
  const rs = window.LASER2_RIG_STRUCTURE; const L = window.LASER2_RIGGING_V16.layout; const T = window.LASER2_THREE_R160; const body = m.body;
  let sog = 0, heel = 0, k = 0, twistM = 0, twistJ = 0, leech = 0, sheet = 0, vangN = 0, jibLeech = 0, hike = 0, aoaM = [0, 0, 0], aoaJ = [0, 0, 0];
  for (let i = 0; i < 600; i++) { window.__steer(); set(); window.__sim.stepN(1); if (i % 10) continue; k++;
    sog += window.__sim.get().sog; heel += c.telemetry().heelDeg; hike += c.telemetry().agents.reduce((a, g) => a + g.hike, 0) / 2;
    const rm = window.__rows(L.main, 8.64, 'main'), rj = window.__rows(L.jib, 2.88, 'jib');
    twistM += rm[11].cAng - rm[1].cAng; twistJ += rj[8].cAng - rj[1].cAng;
    [2, 7, 11].forEach((r, j) => { aoaM[j] += rm[r].aoa; }); [1, 5, 8].forEach((r, j) => { aoaJ[j] += rj[r].aoa; });
    const rows = rs.solver.rows; leech += rows.find((r) => r.label === 'main-leech-0').tensionN; jibLeech += rows.find((r) => r.label === 'jib-leech-0').tensionN; vangN += rows.find((r) => r.group === 'vang').tensionN; sheet += m.rig.sheetC.workingTensionN || 0; }
  const r1 = (x) => +(x / k).toFixed(1);
  return JSON.stringify({ label: '${label}', trims: [inp.mainScope.toFixed(2), inp.jibScope.toFixed(2), inp.vang.toFixed(2)].join('/'), sog: r1(sog), heel: r1(heel), hike: r1(hike), twistMain: r1(twistM), twistJib: r1(twistJ), aoaMain: aoaM.map(r1), aoaJib: aoaJ.map(r1), leechN: r1(leech), jibLeechN: r1(jibLeech), sheetN: r1(sheet), vangN: r1(vangN) }); })()`;
export default [stages[0],
  { name: 'auto', shot: false, code: run('auto', -1, 0, 0) },
  { name: 'vang1', shot: false, code: run('sheet .9 vang 1', 0.9, 0.98, 1.0) },
  { name: 'hard', shot: false, code: run('sheet .98 vang .88', 0.98, 0.98, 0.88) },
  { name: 'hard_vang1', shot: false, code: run('sheet .98 vang 1', 0.98, 0.98, 1.0) },
];
