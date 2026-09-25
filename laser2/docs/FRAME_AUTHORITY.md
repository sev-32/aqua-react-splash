# Frame and render authority

Foundry owns scheduling through `AppKernel` and rendering through `RenderSystem`.

The legacy RAF gate remains frozen. It may execute one render-suppressed startup compatibility pulse until all legacy dynamic geometry initialization has been migrated.

Dynamic execution:

1. RAF delta enters `FixedStepClock`.
2. The clock returns zero to four fixed simulation steps.
3. `AnchoredPhysicsSystem` executes exactly that number of compatibility steps.
4. Post-physics systems synchronize state.
5. Render preparation and rendering execute once for the display frame.
6. The accumulator interpolation alpha is exposed for future native render interpolation.

Static execution runs only after an explicit dirty request.

All renderer calls are instrumented. Benchmarks and capture use the same authority, and unauthorized calls are reported as a verification failure.
