# Causal-field water simulation — R1 engineering checkpoint

Base: `claude/affectionate-edison-15ya9p` at `438cea4456a9b998db801b4c32f62b71d65f9144`.

This increment preserves the existing T0 spectral sea + T3 body-coupled carpet +
T2 shore + T4 MLS-MPM splash. It does **not** replace their numerical solvers.

## Implemented

1. `src/ocean/sim/causalLedger.ts` tracks volume transferred back to live
   carpet tiles, shallow-water shore, or an explicitly named **open-boundary
   ocean reservoir**. The ledger separately reports:
   - `solverVolumeResidual = emitted - settled - lost - live`
   - `unroutedVolume = settled - (tiles + shore + oceanBoundary)`
   Both are in cubic metres and are expected to be near floating-point error.
2. `src/ocean/sim/oceanMpm.ts` retains settlement receipts from *pre-step*
   particle overwrites. Previously `stats.settled` included overwritten water
   while `step()` reset `settleEvents`, silently deleting the actual deposit.
   It now records return velocity in 3D and clears residual events on reset.
3. `src/ocean/modules/splashModule.ts` routes accepted re-entries through
   the ledger. Both horizontal momentum and full velocity-squared are binned
   per parcel, so kinetic energy isn't reconstructed from a misleading
   average velocity. Ledger fields are also surfaced through telemetry.
4. `src/ocean/__tests__/causalLedger.test.ts` covers mass closure,
   destination closure, missing deposits, resets, invalid flows, overwrites
   and event replay.
5. `scripts/causal-ledger-capture.mjs` drives a real browser WebGL2 test
   of a reproducible sphere drop at 30/60/120 Hz. No screenshots are fabricated.

## Verification commands

From the repo root, with dependencies installed:

```sh
npm run typecheck
npx vitest run src/ocean/__tests__/causalLedger.test.ts src/ocean/__tests__/mpm.test.ts
npm run build
npm run dev -- --host 127.0.0.1 --port 8080
node scripts/causal-ledger-capture.mjs captures/causal/ledger.json
```

The last command requires Chromium and Playwright installed locally or
globally. `CAUSAL_SECONDS=2` and `THALASSA_URL` can override its defaults.
`?capture=1&quality=capture&seed=20260925` is the default capture URL.

## Acceptance / failure conditions

- For each recorded step, `abs(solverVolumeResidual)` should remain near
  floating-point accumulation error; a persistent deviation is a solver
  volume accounting defect, even if the scene looks correct.
- `abs(unroutedVolume)` should remain similarly small; a persistent
  deviation identifies a missing receiver or missing deposit receipt.
- `invalidTransfers` should remain zero. In particular, NaN impulses
  must not be booked as transferred physical water.
- Compare body trajectory, splash partition and re-entry volumes among
  30, 60 and 120 Hz. The experiment intentionally **does not** impose
  a timestep-independence tolerance until a baseline has been captured.
- `oceanBoundary` is a *bookkeeping reservoir*, not a T0 height/momentum
  injection. A positive volume is a real remaining coupling limitation,
  not proof that the spectral sea absorbed the return dynamically.

## Explicitly not yet implemented

1. **Momentum-conservative receiver operators.** T3 accepts a displacement,
   foam and phase; T2 accepts a volume deposit. Neither consumes this
   ledger's full 3D return impulse. `returnedImpulse` and
   `returnedKineticEnergy` are measurements, NOT proof of momentum or
   energy closure. The receivers will need matching conservative impulse
   operators to advance that claim.
2. **Global mass conservation** across GPU asynchronous T2/T3 readbacks,
   boundary sponges, recentering, T0 forcing and splash cannot be proved
   from the T4 ledger alone.
3. **Time-continuous convergence** is not yet established; T4 still clamps
   its solver step to at most 1/20 s. The capture compares schedules but
   does not replace the physics integration.
4. **History-aware or framed-vorticity closures**, 3D topology, and
   spherical organization diagnostics are separate, experimental branches.
   They must outperform appropriate nonhistory baselines on held-out cases.

## Next gate

Capture verified 30/60/120 Hz real GPU receipts, fix any residual or
timestep failures, then implement paired T3/T2 momentum-flux receivers with
measured action–reaction and energy budgets. Do not label the entire
ocean solver 'conservative' until those gates pass.
