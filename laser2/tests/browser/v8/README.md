# V8 browser scenarios

Run with `node tools/headless/film.mjs dist tests/browser/v8/<file> <outPrefix> [w] [h]`
from `laser2/` (see `tools/headless/README.md`). The numbers quoted in
`docs/SAILING_V8.md` and `RELEASE_NOTES_V8.md` come from these.

| Scenario | What it measures |
|---|---|
| `showcase.mjs` | 14 kn: sailing frames, O-key knockdown, dry capsize, righting, scoop, climb-in, sailing again (the renders in `evidence/browser/v8/showcase`) |
| `capsize_trials.mjs` | `TRIALS=10wet,14dry,...`: knockdown → recovery → sailing; time, max heel, stalls, event log (`RESULT_MAX=100000`) |
| `polar_run.mjs` (+ `polar_test.js`) | `TWS=12 TWAS=45,60,90,135`: autopilot legs; speed, heel, leeway, AWA, trims, angles of attack |
| `aero_diag.mjs` | upwind per-row sail angle of attack, chord angle (twist) and force; hull resistance parts |
| `trim_matrix.mjs` | upwind speed/heel/twist/leech/sheet/kicker loads for fixed trims vs the trim assist |
| `leech_probe.mjs`, `slack_probe.mjs`, `sheet_probe.mjs` | leech, sheet and kicker tensions; leech slack vs clew–head distance; sheet geometry |
| `post_recovery_trace.mjs` | 1/5 s trace of heel, boom side, wind side, crew COM and tasks around the re-boarding |
| `recovery_18kn_trace.mjs` | 1 s trace of an 18 kn knockdown, recovery and the sailing after it |
| `stuck_diag.mjs`, `upwind_trace.mjs`, `balance_num.mjs` | recovery stall, upwind leg and hiking-balance traces |
| `hike_check.mjs` | hiking reach (centre of mass off the centreline), hiking frames, knockdown still capsizes |
| `luff_flogging.mjs`, `luff_film.mjs` | leech motion head to wind with the flutter on/off; luffing frames |
| `perf_step.mjs`, `rig_refactor_churn.mjs`, `prof_phys_*.js` | physics cost per step, rig-block refactorisations and their triggers, CPU profile setup/step (`tools/headless/profile.mjs`) |
| `hero.mjs` | hero frames |

`diagnostics/` holds the one-off probes used while developing (rig rest
lengths, mast statics, jib sheeting, IK, wake, sail layout, …) as they were
run; some target intermediate builds.
