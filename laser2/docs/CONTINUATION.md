# V8 Continuation Contract

V7 establishes asynchronous atmosphere execution, first explicit near-field lighting, and the first meaningful static draw-call consolidation. The next work must preserve these measured authorities.

## Priority 1 — Native thin-sheet sailcloth and vinyl

- Replace the retained V17 cloth shader with a typed Foundry thin-sheet BSDF.
- Use the shared radiometric budget, global SH environment, local probes, and ordinary shadow authority.
- Separate reflected and transmitted light energy.
- Support softened through-cloth mast/boom/sail shadows without alpha transparency.
- Implement flexible vinyl as a separate thin dielectric material with environment reflection, transmission, haze, waviness, and seam geometry.
- Add locked front/back and main↔jib comparison fixtures.

## Priority 2 — Water lighting authority

- Consume the same atmosphere HDR environment and spectral sun.
- Implement dielectric Fresnel, refraction, distance absorption, volume scattering, sun glitter, boat/sail shadows, and water-to-boat bounce.
- Keep wave mechanics separate from water optics.

## Priority 3 — Local probe evolution

- Add visibility-aware irradiance and parallax-corrected reflection probes.
- Add dirty-region scheduling and temporal probe updates.
- Preserve the analytic-probe lane as the Fast/CPU fallback.

## Priority 4 — Native dynamic topology and solver timing

- Migrate mast, boom, spreaders, standing rig, sail grids, ropes, crew, and collision out of compatibility globals.
- Publish independent solver and GPU-buffer-upload timings.
- Write dynamic geometry once per rendered frame, not once per fixed simulation substep.

## Priority 5 — Draw-call and selection architecture

- Replace hidden semantic source meshes with an ID-buffer/group-range picker.
- Batch repeated hardware through instancing.
- Consolidate ropes into shared dynamic buffers.
- Target under 150 dry-scene calls before water and diagnostics.

## Research boundary

Full spectral multi-order atmosphere precomputation remains separate from the current bounded higher-order approximation. It should be added only after worker cancellation, caching, and progressive upload are proven at Reference quality.
