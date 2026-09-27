import stages from './aero_diag.mjs';
const probe = `(() => { const f = window.LASER2_FOUNDRY; const m = f.legacy.master; const T = window.LASER2_THREE_R160; const body = m.body; window.__target(45); for (let i = 0; i < 1200; i++) { window.__steer(); window.__sim.stepN(1); }
  const inv = body.quat.clone().invert(); const loc = (v) => v.clone().sub(body.pos).applyQuaternion(inv);
  const r3 = (v) => [v.x, v.y, v.z].map((x) => +x.toFixed(3));
  const sc = m.rig.sheetC; const keys = Object.keys(sc).filter((k) => typeof sc[k] !== 'function').slice(0, 60);
  const desc = {}; for (const k of keys) { const v = sc[k]; desc[k] = typeof v === 'number' ? +v.toFixed(4) : (v && v.x !== undefined ? r3(v) : (Array.isArray(v) ? 'arr' + v.length : typeof v)); }
  const boom = m.rig.boom.map((p) => r3(loc(p.x)));
  const jib = m.sails.jib.cloth.parts; const clew = loc(jib[0][jib[0].length - 1].x); const tack = loc(jib[0][0].x); const head = loc(jib[jib.length - 1][0].x); const leech1 = loc(jib[2][jib[0].length - 1].x);
  const js = (m.sails.jib.sheetCs ?? []).map((c) => ({ local: c.local ? r3(c.local) : null, rest: +c.rest?.toFixed?.(3), uni: c.uni, alpha: c.alpha }));
  return JSON.stringify({ cfgRig: { min: m.config?.rig?.mainsheetMin, max: m.config?.rig?.mainsheetMax, vangMin: m.config?.rig?.vangMin, vangMax: m.config?.rig?.vangMax }, mainScope: m.input.state.mainScope, sheetDesc: desc, boom, jibClew: r3(clew), jibTack: r3(tack), jibHead: r3(head), jibLeechRow2: r3(leech1), jibSheets: js, sheetEnds: { a: sc.endpointA ? JSON.stringify(sc.endpointA).slice(0, 200) : null } }); })()`;
export default [stages[0], { name: 'probe', shot: false, code: probe }];
