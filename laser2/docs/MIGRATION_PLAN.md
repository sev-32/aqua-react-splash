# Migration plan

## Completed

- modular external entrypoint;
- native application lifecycle and frame graph;
- native RAF and exclusive renderer authority;
- fixed-step simulation scheduling;
- semantic scene identity;
- native binary static hull/deck/fittings;
- retirement of replaced static resources;
- measurement-integrity and budget diagnostics;
- dependency-driven shadow invalidation;
- modular single-scattering atmosphere LUT;
- atmosphere-attenuated directional sunlight;
- measured low-frequency sky/ground environment projection;
- atmosphere CPU reference and isolated benchmark.

## Next: native dynamic rig package

1. Extract typed mast, boom, and spreader particle/segment topology.
2. Extract standing-rig endpoint and routed-cable topology.
3. Extract main, jib, and spinnaker cloth-grid topology, UVs, seams, and windows.
4. Extract running-rope route and hardware identity.
5. Split mechanics into independently timed native systems.
6. Store simulation data in structure-of-arrays buffers.
7. Write each dynamic GPU buffer once per rendered frame rather than during every constraint substep.
8. Batch cable, rope, and repeated hardware rendering.
9. Redirect semantic bindings to native dynamic meshes.
10. Remove the compatibility geometry bootstrap when no module needs it.

## Atmosphere continuation

- ozone absorption;
- multiple scattering;
- SH diffuse and prefiltered specular environment maps;
- global output color transform;
- scene aerial perspective;
- atmosphere-aware water lighting.

## Following milestones

- native Three.js/context/renderer construction;
- pass graph for shadows, opaque boat, thin-sheet sails, vinyl, water, diagnostics, and output;
- physically coherent sailcloth, vinyl, aluminum, gelcoat, deck, and water materials;
- resolution/sample/cadence quality profiles that preserve semantics.
