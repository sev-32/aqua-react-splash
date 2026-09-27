import stages from './aero_diag.mjs';
const probe = `(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; window.__target(45); for (let i = 0; i < 1500; i++) { window.__steer(); window.__sim.stepN(1); }
  const rs = window.LASER2_RIG_STRUCTURE; const rows = rs.solver.rows; const acc = {}; let k = 0;
  const grab = () => { for (const r of rows) { if (!/leech|vang|shroud|halyard|jib-luff|boom-stretch/.test(r.group) && !/shroud/.test(r.label)) continue; const key = r.group === 'main-leech' || r.group === 'jib-leech' ? r.label : r.group; acc[key] = (acc[key] ?? 0) + r.tensionN; } };
  let sheet = 0, vang = 0, sheetTail = 0; const jibSheets = m.sails.jib.sheetCs ?? [];
  let jibS = 0;
  for (let i = 0; i < 120; i++) { window.__steer(); window.__sim.stepN(1); grab(); k++; sheet += m.rig.sheetC.workingTensionN || 0; sheetTail += m.rig.sheetC.tailTensionN || 0; jibS += jibSheets.reduce((a, c) => a + Math.max(0, c.tension ?? (-(c.lambda ?? 0) * 3600 * 144)), 0); }
  const out = {}; for (const [key, v] of Object.entries(acc)) out[key] = Math.round(v / k);
  return JSON.stringify({ mainsheetN: Math.round(sheet / k), sheetTailN: Math.round(sheetTail / k), jibSheetsN: Math.round(jibS / k), tensions: out, tel: rs.telemetry() }); })()`;
export default [stages[0], { name: 'probe', shot: false, code: probe }];
