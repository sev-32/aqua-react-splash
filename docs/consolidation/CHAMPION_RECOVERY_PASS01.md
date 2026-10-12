# CHAMPION RECOVERY PASS 01 — pool / GPU-fluid lineage

**Status:** recovered source bytes and source-level assessment; rendering baseline benchmark running. No new renderer has been promoted.

## Recoveries (October 10, 2026)
The connected `sev-32/wave-to-3d` repository contains actual, previously overlooked water research assets. Four source files were preserved byte-identically under `docs/champions/donors/wave-to-3d/`. Each file's Git blob hash was matched across the original and the archive:

| Original file | Blob SHA-1 | Meaning |
|---|---|---|
| `src/reference/splash-mls-mpm.html` | `7fc9911cd15565a1440625c409895621909bb57c` | Standalone GPU particle/MLS-MPM reference, 153,811 source characters |
| `src/reference/OpusMagnusWater.html` | `d4ddf80da2c36b7196645a7a1eaea079fc276efc` | Another standalone water simulation variant, 182,015 characters, includes heightfield interface in MPM compute code |
| `src/components/water/webgpu/WaterGPU.ts` | `d8b2b8cdc725f616ad2a744223761f6788eb6cf4` | WebGPU compute host, 27,898 characters; fields, particles, coupling, feedback, compaction |
| `src/components/water/webgpu/shaders.ts` | `79cd54c6bd6313b0dc336bb3361381c968688ce8` | WGSL compute programs, 27,380 characters |

These are **archived donor candidates**, not a claim that either is the champion at performance, true surface reconstruction or hydrodynamic accuracy. The `sev-32/THALASSA` repository itself was checked and was empty (GitHub reports empty git repository). More referenced donors (`heightfieldBEST.html`, `developer-lab/core/coupling.mjs`, `wetness-state.mjs`, `Particles4All`) are still not in the current checkout. Do not silently label them recovered.

## Actual pool renderer is a separable geometry donor

The historical pool is already present in the THALASSA checkout and protected by blob hashes:
`src/components/SplashParticles.tsx` builds a `MarchingCubes(44)` implicit water interface from at most **900** sampled live particles. Persistent bonds contribute tapered interpolated balls so tendrils have actual 3D continuous surface support. This is the **surface-formation idea to benchmark/recover**; 900 is a render sample cap, not a physical max-particle claim or demonstrated efficient 100,000-particle solution.

The old `src/shaders/waterShaders.ts` contains real scene-ray reflection and refraction sampling, **but its Fresnel term is a hand-tuned approximation**:
`mix(0.25, 1.0, pow(1.0 - cos(theta), 3.0))`.
It reflects approximately **25% at normal incidence**, far above the physically expected air-water normal-incidence ~**2.0%**, ( ((1 - 1.333)/(1 + 1.333))^2 \approx 0.02037\). Thus the older *geometry* may be preferable, but copying its Fresnel *optics* wholesale would be a demonstrable physical regression.

The current ocean shader `src/ocean/render/oceanShaders.ts` has `fresnelDielectric` with s/p-polarized amplitude coefficients and physical total internal reflection. **Retain this dielectric Fresnel mechanism** while evaluating whether the original fused surface can be adopted or surpassed geometrically. This is the model for per-capability champion selection.

## Current mismatches that remain

- Original pool geometry: implicit fused interface, tapered bond connectors. Modern ocean: depth/thickness SSFR splats and V2–V4 experimental reconstructions. Neither demonstrated a satisfactory combined sheet and filament lifecycle yet.
- The current ocean body wetness shader uses a single object-center `uWaterline`; the original pool sphere shader reads the water height texture **per surface fragment** using fragment world xz. This is a source-verified regression in geometric contact granularity, independent of historical JIT R21 film memory not yet recovered.
- Existing terrain caustics in `src/ocean/render/terrainRender.ts` do depend on water derivative Hessian, sun light and depth. Treat as protected physical mechanism rather than replace with decorative UV-scrolling texture.
- Ocean surface is drawn before spray composites; the reciprocal ocean-reflects-splash path must be tested and explicitly implemented, not masked by more opaque spray.
- The known best body-heightfield interaction and JIT ledger may not be the same implementation. Do not make either submodule contingent on promoting another subsystem.

## Immediate engineering sequence

1. Capture untouched **pool** renderer and **modern ocean** lab in real software-WebGL, preserving raw frames, shader errors and source receipt. These serve as lineage samples, **NOT matched-scale hydrodynamic tests**. Script `scripts/ci-champion-pool-ocean.mjs`.
2. Add isolated, physically matched bench setups for former fused surface vs ocean SSFR using **the same physical particle buffer and material scene**; enforce same camera/light/normal/IOR and sphere trajectory before ranking.
3. Recover original JIT R21 wetness and JIT M3 temporal fluid surface from the actual original archive where available. Until then use the mounted original pool's **per-fragment local-water-height sampler**, not the one-height stripe, as reference.
4. Test actual physical dielectric Fresnel and scene/sea reciprocity in the ocean render graph. Do not port old 25% pool Fresnel.
5. Restore the best sheet/tendril surface and JIT return as opt-in first, with ability to switch back. Then promote via original pool benchmark, ocean benchmark and 30/60/120Hz hydrodynamic receipts.
6. Keep source-only ZIP checkpoint under 30MB, include original byte-identical donors, mutable integrations, champion registry and tests; display actual renderer GIFs and screenshots in chat.

**Regression policy:** old working scene source untouched; all imports from actual donor files are tracked by source repository/path/SHA; no generation of a new general-purpose splash renderer as a substitute for source recovery. Explicit physical derivation and objective visual tests take precedence over new version numbers.
