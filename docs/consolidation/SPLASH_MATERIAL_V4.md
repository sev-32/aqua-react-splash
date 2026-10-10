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
