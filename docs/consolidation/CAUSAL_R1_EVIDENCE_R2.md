# THALASSA — Causal Water R1 evidence checkpoint R2
Date: 2026-10-09. Development branch: `feature/causal-water-ledger-r1`.
Independent WebGL2 browser captures; renderer source, not image generation.

## Visual SSFR defect and verified containment

- Original 1600×900 close-ups: six real render frames contained broad, almost entirely black polygons/rectangular regions, despite `gl.getError() = 0`.
- A prior blend/depth-write state restoration in `SplashSystem.ts` had **zero pixel effect** and was rejected as the cause.
- The shading calculation in `splashShaders.ts` now evaluates non-finite RGB/alpha and **discards unsafe fragments**, preserving the underlying rendered scene.
- Real CI workflow `38002191230` generated 11 matched rerenders. Black pixel counts (R,G,B<3) changed:
  - sphere contact: 24,928 → 0
  - ejected sheet: 34,776 → 0
  - splash return: 155,996 → 0
  - overhead wake: 69,616 → 0
  - tile diagnostic: 32,832 → 0
  - fluid-spray shot: 69,616 → 0
- An independent same-state fragment probe `37986242582` changed black pixels 65,968 → 0 and changed 66,669 pixels in total, of which 65,968 were previously black. Elsewhere the material remained nearly identical.
- The non-finite probe itself did **not** show visible red invalid-pixel markers; the exact upstream arithmetic source of the invalid results is not proved. The correct claim is **visual regression contained across tested scenes**, not root numerical mechanism definitively isolated.
- A follow-up fixed the proof harness: prior `focus()` repositioned cameras AFTER rendering. Current camera script renders a 1e-7 s additional step after repositioning and performs saved-PNG pixel audits, failing long solid-black runs. Verification workflow `38002731940` initiated.

## Timestep convergence: actual measured deficiency

CI run `38002430697`, 1.2 simulated seconds, identical sphere seed/initial state, browser frame and time-series telemetry at 30, 60, 120 Hz.

| Hz | Emitted m³ | Settled m³ | Still in T4 m³ | Body y (m) |
|---:|---:|---:|---:|---:|
| 30 | 0.76129946 | 0.31215409 | 0.44914538 | -1.3165769 |
| 60 | 0.74284852 | 0.33207982 | 0.41076870 | -1.3019079 |
| 120 | 0.78171887 | 0.35063027 | 0.43108859 | -1.3056016 |

- Maximum particle accounting residual across runs was <4×10⁻¹⁵ m³. No unassigned return or invalid transfers were reported.
- Emitted liquid varied 5.10% of mean; settled liquid 11.60% of mean.
- Differences were present at first impact (around t=0.6–0.8 s); this is not exclusively a settlement problem.
- `entrySplash` aggregates volume until `minV=8 dx³/27`. For capture quality, dx=0.32m → threshold ≈0.009709m³ (9.709L). The spread in final emission is ≈4× threshold. This is a targeted *hypothesis*, not causal proof.
- To discriminate sources, added independent cumulative launch volume counters for entry, interaction-tile limiter and shoreline emissions (SHA `b4394abd...`); new 30/60/120 Hz capture is in workflow `38003229020`.
- Distinguish **closed bookkeeping** from **timestep-invariant physics**: neither implies the other.

## Active shoreline demonstration and failure

Real CI run `38002605965` captured five 1600×900 T2 scenes.
- Initial pre-warm shot: `shoreActive=false`, `fade=0`, `warm=3s`.
- Following approximately 46s simulated spin-up: `shoreActive=true`, `fade=1`, `lag=0`. Ready event at engine time ≈1.033s, lab warm-up 46s.
- All later shoreline photos maintained an active field; GL error and console errors were zero.
- The resulting visuals show excessive whitewater, sharp shore/T0/T2 boundaries, and terrain-water clipping. This is **proof the solver activates and can render**, not proof of good shoreline physics or acceptable visual quality.
- Whitewater may be amplified by sea-morph 5.3, so a calmer matched condition must distinguish forcing-dependent surf intensity from the underlying seam artifact.

## Explicit boundaries and next gates

The R1 `CausalTransferLedger` verifies T4 mass and return assignment only. Full T0/T2/T3 momentum/energy conservation, dynamic T0 return injection and multiscale end-to-end conservation are unproved.
Next: (1) complete camera-accurate screenshot pixel QA; (2) disaggregate 30/60/120 launch sources; (3) perturb entry packet threshold and compare held-out timestep convergence; (4) diagnose T2 shoreline seams with calm/storm paired real renders; (5) implement measured impulse receivers across T2/T3.
