# V8 browser evidence

Produced headless (SwiftShader, 4-core sandbox) with `tools/headless/film.mjs`
and the scenarios in `tests/browser/v8/`.

- `showcase/` — `showcase.mjs` at 1280×800 on the final build: 14 kn, sailing,
  O-key knockdown, dry capsize onto the board, righting, scoop, climb-in,
  sailing again. `showcase.log` has heel/speed/crew tasks per frame.
- `trials/` — `capsize_trials.mjs` runs (one JSON line per trial: wind, dry or
  wet, max heel, time to both sailing again, event log). In order of builds:
  `cb_base.log` / `cb_new.log` (before/after the first recovery fixes),
  `cb_final*.log`, `cb_18.log`, `cbA`–`cbH.log` (post-recovery settle, stall
  detection and board-lean changes; `cbE`–`cbH` are the final build).
  `polar_*.log|txt` are `polar_run.mjs` outputs (12 kn and 18 kn).
- `profiles/` — Chrome CPU profiles of 240 sailing steps before and after the
  physics-step optimisations (open in Chrome DevTools › Performance).
