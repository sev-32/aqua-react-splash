# THALASSA — R1 Real Renderer Visual Audit (2026-10-09)

## Provenance
- Source commit at first shot capture: `f153eb3e1e3d1d3307e6995f33337ac5e5451c98`
- GitHub workflow: `37982745708`; artifact `11641737149`
- Execution: actual compiled `/ocean` Vite app in headless Chromium, requested ANGLE/SwiftShader mode.
- Deterministic seed 20260925; low-quality engine tier; 1280×720 PNG screenshots.
- All 16 images were produced by actual WebGL2 render passes, not image generation.
- Source ZIP supplied by the user matches the original development-branch MPM blob SHA
  `ecd856b08929dc1b55bd931c0b028104dcf72538`.
- Causal R1 branch has additional code relative to supplied baseline. The proofs use R1.

## Verified from receipts
- 16/16 PNGs captured, JavaScript console/page errors: 0, per-capture WebGL error: 0.
- Worst measured T4 stock/flow residual: 2.56×10^-15 m³.
- Worst routed-return residual: 1.23×10^-15 m³.
- Invalid transfer count: zero for every shot.
- Sphere return (shot SPHERE_04): emitted 0.8758 m³, settled 0.8513 m³,
  airborne 0.02446 m³, residual ~1.6×10^-15 m³.
- Fast tow (TOW_03): emitted ~0.2071 m³, still airborne ~0.1357 m³,
  settled ~0.07136 m³. Body wake and crest clearly visible.
- Slow tow (TOW_01): ~0.009897 m³ sent to the explicit *open-boundary
  ocean reservoir*. This is accounted for but NOT deposited into a
  dynamically evolving far-field ocean.
- Plunge (PLUNGE_01): open-boundary reservoir reached ~0.01423 m³.
- SHORE_01 was visually captured but had `shoreActive=false`,
  warm-up ~6 s and fade=0; it is NOT evidence of a coupled active T2
  shallow-water solve.

## Visual findings to investigate, not yet isolated as bugs
1. The storm/deck image contains sharp cyan/teal patches along the far
   horizon, contrasting sharply with the surrounding dark ocean. Possible
   LOD/shading boundary, terrain-water overlap, or optical compositing.
   Requires adjacent debug-lane and distance-controlled captures.
2. The sphere-entry curtain has disconnected bright white-looking regions;
   investigate particle-surface connectivity and fluid/point renderer
   differences before calling the breakup physically accurate.
3. The original interaction-tile debug shot did not follow the sphere with
   a close inspection camera, so it is not an adequate T3 locality proof.
4. Low-tier storm and lagoon scenes differ in surface clarity. Compare
   matching camera/weather settings at capture/high quality before
   attributing the difference to numerical resolution.
5. Fixed-dt screenshots display FPS=0 in the HUD. This is capture
   telemetry behavior, NOT evidence of zero rendering performance and
   NOT a valid runtime benchmark.

## Important claim boundaries
Near machine-zero T4 ledgers only prove T4 particle *accounting* and
route assignment. They do not establish total continuum mass, impulse,
energy, local pressure validity, or temporal convergence of the T0/T2/T3
GPU fields. No full energy/impulse conservation claim is warranted.

## Next evidence gate
A second workflow `ocean-closeups.yml` captures close-body, overhead
wake, explicit tile debug, MPM points vs fluid geometry and splash return
at 1600×900 using the `capture` quality tier. Inspect receiver impulse
and near-body surface geometry, then test a longer T2 run after the
45-second shore spin-up. Preserve original PNGs and per-shot receipts.
