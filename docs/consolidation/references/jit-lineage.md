# The JIT lineage: jit_infinite → JIT-Splash M1 → M2 → M3 → M4/M4.1 → Developer Lab R1–R22

| | |
|---|---|
| Source | `01_CURRENT/JIT_M3_R22/` (all 715 files match OCEAN_LEAD_R1's hash lock) |
| Current head | `public/developer-lab/JIT-DEVELOPER-LAB.html` + `core/*.mjs` (R22) |
| Earlier heads kept runnable | `public/evolved/BEST-JIT-M2.html`, `public/evolved-v3/BEST-JIT-M3.html`, `public/ocean-m4/ARCHIPELAGO-M4.html`, `public/originals/*` |
| API | WebGL2. Physics runs in a module worker (heightfield + MLS-MPM on the CPU, Float64). Surface reconstruction runs in a second worker. |
| Role in the consolidation | **Champion for "the heightfield spawns the splash":** detection, finite events, conservative debit, carriers, sheet/neck reconstruction, return. Also the champion for body wetness (metric film ledger) and for the moving causal page, the carpet concept in embryo. |

## Verdict

This is the most carefully *accounted* splash system in the corpus. Water that becomes splash is debited from the heightfield column it left and credited back where it lands, with a ledger residual around 1e-12 m³. Events have finite volume budgets, and every launch impulse is paid for from a declared body-work budget.

What limits the look is resolution, not the design. Splash carriers live on the same 10.7 cm grid as the heightfield, and each is at most about 0.6 L. The MPM runs on that same coarse grid, on the CPU, capped at 2,400 carriers, with no cohesive pressure. Sheets and filaments are therefore *reconstructed* (necks, membranes, ribbons) rather than *simulated*. In captures the splash reads as chunky fragments and thin membrane shards. That fits your "already working somewhat well."

**Keep the chain and the accounting, replace the resolution-bound parts.** See `../CORE_LAW.md`.

## Lineage (what each step added)

| Step | Added | Kept from before |
|---|---|---|
| **jit_infinite** (`originals/jit_infinite.html`, "WaterPRO JIT Splash + Heightfield Models") | The React Aqua pool with **heightfieldBEST transplanted** (`aquaHeightfield.ts`, "Aqua Phase 7 — Occupancy SWE, transplanted"), MLS-MPM (`mlsmpm.ts`), MPM connectivity. It embeds its own TypeScript source (200 KB) and the Water Encyclopedia (470 KB). Its header independently confirms that BEST's emitter "released nothing at all, in any scenario" (a unit error: 0.0009 floor vs reservoir peak) and fixes it. It also replaces walls with a graded absorbing rim so the patch "is a window, free to follow the camera". | The whole BEST chain |
| **JIT-Splash M1** (`research/JIT-Splash-M1/`) | Source audits with reproducible probes. Findings include fixed particle mass regardless of volume, pool overwrite destroying water, a BEST teleport at reset, and full-frame sweep replay. Adds a numerical core: shared clock, finite events, transfer ledger and full-support APIC. 59 tests. | References untouched |
| **M2** (`evolved/BEST-JIT-M2.html`) | BEST as host, run once per swept 1/180 s tick; events proposed from the completed surface. Detection = slope/crest/rise + horizontal compression + BEST contact + a waterline impact ring. Admission debits a top layer; mass = ρV. Launch direction follows the contact meridian, bounded by body work. Skins: spatial charts plus **temporal ribbons**. Stretch damage and capillary neck traction. Covariance ellipsoids (Particles4All idea). Return through a normalized footprint plus a zero-net-impulse radial pulse. | BEST shader bodies byte-identical |
| **M3** (`evolved-v3/BEST-JIT-M3.html`) | **One fused implicit surface.** Parcel kernels, persistent necks and membrane faces feed one scalar field, polygonized with Particles4All's six-tetrahedron split (voxel ≥ 2.6 cm, adaptive). Physics and surface each run in a worker. 3.73× less physics CPU with identical results. | M2 equations unchanged |
| **M4 / M4.1** (`ocean-m4/`) | Archipelago and Poseidon integration with a residual-wave patch and ocean coupling. Thin-cell velocity regularization (a 39.75 m/s spike → 6.5 m/s) with removed momentum recorded. | M3 local chain |
| **Lab R1** | Developer UI: domain, hull (clipped ellipsoid with buoyant heave), up to 4 dispersive incident bands, lighting, solver/splash pages, inspector, export/import. `lab-optics` (receiver-mapped Jacobian caustics, dielectric Fresnel, TIR). | M3 physics |
| **Lab R2–R19** | Render and far field only:<br>• R3: projected-footprint LOD.<br>• R5: underwater Snell window.<br>• R7: 8-bin spectrum with slope-moment roughness.<br>• R8: moment glint and bounded volume.<br>• R9: continuous bathymetry.<br>• R10–R12: energy-consistent, redistributive, multiscale caustics.<br>• R13–R15: underwater interface and analytic volume integration.<br>• R16: Cox–Munk closure.<br>• R17–R19: temporal spectral atlas (64 modes, 320 m) and independent wind sea and swell. | Solver unchanged |
| **Lab R21** | **Metric wetness** (film debits the heightfield; drips debit the film; evaporation explicit; ledger residual 1e-20 m³). **Shared water–object contact** (immersion, buoyancy, added mass, drag, planing, slam from one reconstructed surface). **World-anchored moving causal page** (exact-cell recentering, strip exchange accounted). | Solver unchanged |
| **Lab R22** | **Managed water pages** (tiers by truth risk, not camera distance). Sparse world hydro memory (`eta/vx/vz`). An adaptive **spectral sea boundary** that escalates to resolved modes. A depth-limited breaking transform (`Hs ≤ 0.78 d`). 56/56 tests. | Solver unchanged |

The local splash physics was frozen at M3. Everything after it went into optics, the far field, contact and wetness, and paging. So the splash quality you see in the lab is the M2/M3 design.

## The splash chain in detail (`core/coupling.mjs`, `core/events.mjs`)

At each 1/180 s tick, after the heightfield step:

1. **Candidates** (`JitCoupling.candidates`). Per cell:
   - material vertical velocity `w = ∂η/∂t + u·∂η/∂x + v·∂η/∂z` (clamped to ±6 m/s);
   - horizontal compression as the Jacobian of the flow map over τ = 0.07 s: `J = (1+τ u_x)(1+τ v_z) − τ² u_z v_x`, where J < 1 means converging;
   - crest curvature `(4η − Σ neighbours)/DX`;
   - BEST's contact signals (|σ̇|, release, fold, pressure);
   - a **waterline impact ring**: proximity to the body's waterline × `max(smooth(1.5, 3.8, approach speed), smooth(0.55, 1.15, descent speed))`.

   `score = max(slope×rise×crest, compression×speed, contact×rise, impact)`, and `detachment = clamp(score·gain/threshold)`. Cells below 0.25 are dropped early, and quiet cells (`w ≤ 0.12` and `J ≥ 0.8`, away from a fast body) are skipped.
2. **Excess volume.** A top layer of `min(5.5 cm, 12 % of depth)` × cell area × detachment. It is never taken from inside the solid.
3. **Events** (`SplashEventController`). The rules are:
   - hysteresis latch at 0.62 / 0.32;
   - **persistence of 22 ms** before birth;
   - connected components with stable patch IDs;
   - a **finite budget frozen at birth** (≤ 18 L), released over 65 ms;
   - a 0.35 s cooldown;
   - commit only what was actually admitted.
4. **Admission** (`admit`):
   - debit η in the source cell by the exact column depth change;
   - create a carrier with `v = (u, w, v)` from the host;
   - at impacts, add a kick along the contact meridian `(−n_y n_x, √(1−n_y²), −n_y n_z)`. Its magnitude solves `½m|v+sd|² − ½m|v|² = W_available`, where `W_available = 0.35·½·ρ·V_displaced·|v_body|²` for the tick.
5. **Skin** (`makeSkin`). Faces between carriers born in adjacent cells in the same tick (spatial charts), and faces to the previous row's carriers of the same event within 0.12 s (**temporal ribbons**). That is how a one-cell-wide moving contact line becomes a sheet.
6. **Dynamics.** Carriers advance in `SparseMlsMpm` (`fast-mls-mpm.mjs`):
   - quadratic MLS-MPM with Tait EOS `p = ρc²/7·(J⁻⁷−1)`, clamped **p ≥ 0**, c = 8 m/s, viscosity 0.002;
   - grid `dx = 0.107 m` (the heightfield's), CFL substeps;
   - body contact on the grid and on the particles, with the impulse recorded.

   Plus `capillary()`: equal and opposite neck traction `σ·2π·r_min` along skin edges. Edges fail at strain > 1.7, and faces fail below 0.6 mm thickness.
7. **Reconstruction** (`connected-field.mjs`, surface worker at 30 Hz). Persistent proximity connections (form at 1.1·DX, break at 2.5·DX with memory) plus membrane faces from non-collinear neighbour pairs, **all fed into one scalar field**:
   - parcel kernels;
   - neck samples with a waist profile;
   - face quadrature.

   It is polygonized with six tetrahedra per voxel, voxel ≥ 2.6 cm, with adaptive coarsening instead of a cut-open mesh. Reconstruction never creates or removes water.
8. **Return** (`returnParticle`):
   - on a signed crossing of the surface (armed after 12 ms), volume goes into a 5×5 Gaussian footprint (exact per-column inversion) and horizontal momentum is mixed by liquid mass;
   - 35 % of the vertical KE becomes a **radial velocity pulse with zero net horizontal impulse**, which excites waves through the host's continuity equation;
   - the rest is logged as impact dissipation;
   - vertical momentum goes to an explicit "support reaction".

## Measured in this session (unmodified R22, SwiftShader, sphere r = 0.68 m, pool 12 m × 1 m deep)

| Scene | Sim time | Emitted | Alive | Returned | Fused-surface triangles |
|---|---|---|---|---|---|
| Side-fast | 1.0 s | 392 | 187 | 198 | 19,612 |
| Side-fast | 1.27 s | 392 | 29 | 306 | 11,076 (113 necks, 24 membrane charts) |
| Side-fast | 2.07 s | — | 222 | — | 19,504 |
| Drop | 0.8 s | 499 | 190 | — | 3,612 |
| Drop | 1.27 s | 606 | 0 | 606 | 0 |

Visually (scene `scenes/lab-splash.json`, re-runnable with `scripts/reference-capture.mjs`): the side-fast splash is a spray of small cyan fragments and a few membrane shards thrown to the side, plus drips under the sphere. The drop makes a small ring and little crown. The heightfield wake is BEST's (see `heightfieldBEST.md`).

## Strengths to carry forward

1. **Conservation by construction.** A debit on birth, the same volume on return, an explicit escaped/outflow term and a global residual check.
2. **Finite, persistent events.** Hysteresis, persistence, a budget frozen at birth, cooldown and connected patch identity. No hose, no flicker, no duplicate births.
3. **Launch from the surface's own kinematics.** Material vertical velocity plus flow compression, not slope or height thresholds.
4. **Work-bounded impact kick** with a recorded launch impulse and work. The splash can't be more energetic than the body made it.
5. **Temporal ribbons.** Coherent sheets from a moving contact line, the key idea for crowns and bow sheets.
6. **Return as a zero-net-impulse radial pulse.** Re-entry makes rings in the heightfield without injecting spurious net momentum.
7. **Metric film on bodies** (R21) and **shared contact** (R21).
8. **Moving causal page with a spectral boundary** (R21–R22). This is the carpet, already accounted.

## Limits (why it doesn't look like Particles4All)

1. **Resolution coupling.** Carriers are born one per heightfield cell (10.7 cm), so the largest parcel is 0.63 L (radius ≈ 5 cm). Real crowns, sheets and ligaments are 1–10 mm thick. Reconstruction has to invent everything below the grid.
2. **MPM on the same coarse grid**, weakly compressible, with **p ≥ 0** (no cohesion). Cohesion comes only from the neck traction on skin edges. There is no surface-tension physics in the fluid, so sheets can't thin, rim and break up physically.
3. **CPU only**, 2,400 carriers, about 1–1.7 s of CPU per simulated second at full resolution (M4.1 note).
4. **Heuristic detection gains** (`riskGain`, `convertThreshold`, the impact smoothsteps) and launch-kick constants (0.65, 0.35).
5. **Launch velocity is the depth-averaged SWE velocity plus `w`.** It carries no information about the crest front or the contact-line geometry beyond the meridian kick.
6. **Local page scope.** One causal window. The page cache stores only `eta/vx/vz`. Carriers and topology don't survive demotion (R1's audit, A05).
7. Optics (lab-optics) and the far field (the 64-mode atlas) are below POSEIDON and THALASSA's FFT cascades, by the lab's own R2–R19 notes.

## What THALASSA should take from it

- The event controller, transfer ledger, admission and return. Port them as-is in semantics, and run them on the GPU where the carriers live.
- Detection signals: material `w`, flow-map compression, contact and impact ring. Calibrate with physics (Froude/Weber/Wagner) instead of gains; see `../CORE_LAW.md`.
- Temporal ribbons plus membranes, as the *topology* layer over a finer particle solver.
- The metric film and shared contact receipts.
- The managed page semantics (tiers by risk, exact-cell recentering, strip accounting) for the carpet.
