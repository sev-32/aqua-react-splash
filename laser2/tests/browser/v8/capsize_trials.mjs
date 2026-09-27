// Knockdown -> recovery -> sailing trials: recovery time, max heel, stalls, event log.
// TRIALS=14wet,18dry,... (default: the V8 set). Each trial sails 10 s, fires the
// O-key knockdown squall and steps until both sailors are sailing again (max 180 s).
// usage: TRIALS=14wet,14dry RESULT_MAX=100000 node tools/headless/film.mjs dist tests/browser/v8/capsize_trials.mjs out/cb
const setup = `(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(14, 0);
  window.__t = 0; window.__run = (n) => { for (let i = 0; i < n; i += 6) { window.__sim.stepN(6); window.__t += 6; if (i % 60 === 0) f.kernel.frame(0); } };
  window.__run(600); return 'ok'; })()`;
const trial = (tws, dry) => `(() => { const f = window.LASER2_FOUNDRY; const c = f.systems.crewRecovery; window.__sim.setWind(${tws}, 0); c.dryCapsize = ${dry}; window.__run(600);
  for (const a of c['agents']) a.events.length = 0;
  const t0 = window.__t; c.forceCapsize(); let over = false, maxHeel = 0, stall = 0, maxStall = 0, lastHeel = 0; const trace = [];
  for (let s = 0; s < 1800; s++) { window.__run(6); const tel = c.telemetry(); const h = tel.heelDeg; maxHeel = Math.max(maxHeel, h); if (h > 75) over = true;
    if (over && h > 30 && h < 80 && Math.abs(h - lastHeel) < 0.25) { stall += 0.1; maxStall = Math.max(maxStall, stall); } else stall = Math.max(0, stall - 0.1); lastHeel = h;
    if (s % 50 === 0) trace.push(Math.round(h));
    if (over && tel.agents.every((a) => a.task === 'sailing') && h < 25) break; }
  const tel = c.telemetry(); return JSON.stringify({ tws: ${tws}, dry: ${dry}, over, maxHeel: Math.round(maxHeel), recoveredS: +((window.__t - t0) / 60).toFixed(1), done: tel.agents.every((a) => a.task === 'sailing'), maxStallS: +maxStall.toFixed(1), trace: trace.join(','), events: c['agents'].map((a) => a.id + ': ' + a.events.join(' > ')) }); })()`;
const list = (process.env.TRIALS ?? '10wet,12dry,14dry,14wet,18dry,18wet').split(',').map((t) => t.trim()).filter(Boolean);
export default [
  { name: 'setup', shot: false, code: setup },
  ...list.map((t) => ({ name: 't' + t, shot: false, code: trial(Number.parseFloat(t), t.endsWith('dry')) })),
];
