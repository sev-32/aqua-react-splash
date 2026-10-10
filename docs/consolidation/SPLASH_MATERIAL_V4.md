# THALASSA V4 — Material-history water curtain, experimental

**Objective.** Replace the per-frame guessed connections of V1–V3 with retained material ancestry. Surface optical structure should be traceable to the actual water particles that were emitted at the impact waterline.

**Implemented.**
- `MaterialCrownHistory` records, **at the moment of each crown packet emission**, each MLS-MPM particle's source body, birth angle, emission time, seed (to detect recycled particle slots), and water volume.
- Subsequent reconstruction reads only the **current advected particle positions**, while angular ordering and emission-epoch pairing come from birth, not a new nearest-neighbor search each frame.
- Material triangles connect two neighboring emission epochs **from the same source only**. Faces with excessive edge length, poor aspect ratio, invalid data, or implausible volume-to-area film thickness are rejected.
- The physical carrier volume assigned to every accepted triangle is divided among all accepted incident triangles, with the final surface-mesh volume independently measured as triangle area × optical thickness.
- Unsupported physics particles remain in the existing V2 point/spray path. Recycling a particle index invalidates its stored ancestry by checking its unique birth seed.
- The existing WebGL2 surface shader receives actual 3D polygons and the camera-projected optical refraction; **R1 remains the default**, V4 is a separate experimental toggle.
- The tracked material history changes neither the MPM particle positions nor spawned particle number or source water volume.

**Scope and failure boundaries.** This is a surface-tracing prototype, not yet a true conservative surfacing of the entire water-air boundary. The emitter retains its original seeded random angular distribution, so some emission epochs have too few surviving angular neighbors. Gaps larger than 0.24 seconds cannot be bridged. It records the history of crown particle launches only, not T3 sheets or general shoreline breakers. It does not yet generate a dynamic 1D thread when a 2D panel tears. Some fluid mesh triangles can overlap in 3D and yield inaccurate total projected transmission even when their local volume budget is closed. Boundary continuity and physically measured ligament breakup remain an open objective.

**Tests.** `materialCrown.test.ts` covers a synthetic cylindrical material curtain, advection, removal on index-recycle, separate body sources, and long gaps between emission epochs. Existing splash-mesh and causality tests run alongside. A closed render mesh budget does not prove correct topology or particle conservation.

**Real renderer animation.** `scripts/ci-material-crown-animation.mjs` renders ten consecutive instants with 7/60 s separation, each at fixed 960×540 resolution, pairing the original R1 and V4 appearances at the same simulation state. The original 20 PNG screenshots, GL errors, per-frame mesh stats, material ring and T4 ledger receipts are exported by `.github/workflows/material-crown-v4.yml`. A GIF composed from those PNGs is a temporal visualization of the actual WebGL2 renderer, not a generated image or physics validation.

**Visual acceptance.** A continuous crown should remain identifiable through time, show proper thin-film Fresnel reflections and refraction, thin into strands before breakup, then distinguish unresolved spray from real foam. If material-ring support is inadequate, do not replace the reference renderer or hide its limitations behind a bright white foam texture.

**Next physics-surfacing research.** Preserve a complete source-native material 2D grid and advect it with the solver. Record surface strain, area and thinning, progressively transition torn films into persistent 1D filaments, then detach their droplets. Keep physical volume in MLS-MPM throughout and validate against matched initial states at 30/60/120 Hz.


## Captured evidence (2026-10-10)

First real time-sequence CI workflow `38052950770`, source `2095a6249b6d878a0d3bde573984eb1f0f2f4225`, artifact `11670511787`.
Ten consecutive *sampled* instants, 0.117s apart, at 960×540 for the R1 original and V4 experimental mode. All 20 PNGs saved, GL/browser errors zero. The physical T4 ledger stayed unchanged under render-mode toggles. No artificial frames were interpolated.

| Simulated t | Material epochs | V4 triangles | Supported physical particles | Allocated source water (m³) |
|---:|---:|---:|---:|---:|
| 0.567s | 2 | 65 | 80 | 0.09953 |
| 0.683s | 9 | 548 | 446 | 0.54940 |
| 0.800s | 14 | 622 | 469 | 0.58486 |
| 0.917s | 14 | 608 | 455 | 0.5678 |
| 1.033s | 14 | 575 | 433 | 0.5388 |
| 1.150s | 14 | 376 | 320 | 0.3932 |
| 1.267s | 14 | 110 | 141 | 0.1718 |
| 1.383s | 14 | 0 | 0 | 0.0 |

The first run demonstrated removal of misleading white foam spheres but a sparse
transparent curtain, and eventually no surviving V4 sheet. It failed the visual
quality objective despite a consistent allocated material volume ledger.

### Temporal ancestry correction and second real animation

The first prototype mistakenly re-selected angular neighbours from each epoch
after invalid particles had been removed. That could form new triangles between
unrelated surviving parcels. Commit `d265129d86d3c265ac8860068457ef18260de830`
changes V4 to **construct and store immutable triangle ancestry at the birth of
each succeeding material ring**. An inactive/overwritten particle removes its
original incident faces; those faces are never replaced with a different triangle.
The five core ancestry tests plus an explicit no-rewiring test, TypeScript and
production build passed.

Independent second WebGL2 workflow `38053297257` (source
`c40f83d89d119927df802d1c46ff7d898afc3998`, artifact `11669838160`)
again produced 20 original real screenshots with no GL/browser errors. Pixel
comparison with the first capture: R1 is unchanged; V4 is unchanged for early
impact instants 0–3 and differs only in later instants 4–6 where particles are
retired, as intended. Surface faces at 0.8s remain 622 / 469 connected physical
particles. At 1.383s no accepted connected material sheet remains despite live
particles elsewhere in the splash system.

An additional independent unit test integrates actual triangle area times
optical thickness to verify surface optical-carrier water against the physical
particle volume assigned to that interface.

**VERDICT: V4 material ancestry improves the generative representation but does
NOT yet create realistic splash tendrils and morphology. V4 remains opt-in and
the R1 renderer remains the default.**

### Next experimental phase, explicitly not yet implemented

Source-native 2D panels should progressively thin according to their advected
material area and volume; an overstretched edge should yield a persistent 1D
filament with its own conserved volume and curvature, rather than simply fall
back into disconnected spray. Break those filaments into physical droplets
under a measured capillary/strain criterion. Extend source-native surface
history to heightfield breaking-lips and wakes, not only body-entry crowns.
Validate with new close-up, high-contrast views and a full contiguous time
sequence; never substitute a texture for coherent water geometry.
