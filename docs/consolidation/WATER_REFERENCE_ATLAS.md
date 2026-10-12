# THALASSA — Water reference atlas and identity registry

**Purpose:** eliminate accidental substitution of one historical water system for another. An old source is a reference to a *specific mechanism and runnable scene*, not automatically a champion for every subsystem.

## Corrected source identities

| Reference identity | Exact source / entry | What it actually is | Do not confuse with |
|---|---|---|---|
| **R00 — legacy React/JIT-era pool** | `src/components/SplashParticles.tsx`, `src/lib/mlsmpm.ts`, `src/lib/mpmConnectivity.ts`, original `/` | Original React pool with 3D MLS-MPM and fused Marching Cubes liquid surface. Previously shown in the first four-frame screenshot. | The later reactive heightfield pool with integrated JIT splash |
| **R01 — HeightfieldBEST / Phase7 SWE** | `docs/champions/donors/library/heightfieldBEST.html` | Independent heightfield/SWE reference visual transplant. Has UI describing JIT sheet-MPM Phase5 but that label alone does not prove a live coupled 3D splash solver in this file. | R00's fused MPM pool and R03's complete integrated Aqua runtime |
| **R02 — obstacle SWE + JIT sheet-MPM** | `pool_obstacle_phase5_jit_mpm.html` | Phase5 JIT sheet-MPM *spawn* reference; source uses WebGL2, obstacle SWE, and explicit JIT release phase. | R01's earlier pure heightfield reference |
| **R03 — Aqua V53 integrated pool heightfield + splash** | `aqua_v53_html_pool_pass18_visual_phase8_hf_source_splash.html` | Full ~1.37MB compiled Aqua V37 Pass18 beauty / reference-solver authority runtime, explicitly named for Phase8 heightfield source and splash. A leading candidate for the heightfield-with-splash scene the user means; actual visual comparison required. | R00 original JIT pool or R01 heightfield-only |
| **R04 — Aqua Phase7 reference solver** | `aqua_phase7_reference_solver_current_visuals.html` | Full ~1.27MB compiled reference solver with original visualization, independent of later V53 changes. | A presumed new fluid solver just because its visuals changed |
| **R05 — Aqua Phase8 heightfield regression lab** | `aqua_phase8_heightfield_lab_regression.html` | Dedicated WebGL2 heightfield profiles and non-regression matrix, with JIT on/off controls. | The physically accepted reference itself; it is a *test laboratory* |
| **R06 — Aqua pool without MPM** | `AQUA_CONSOLIDATED_POOL_HF_CAUSTICS_NO_MPM_V1.html` | Explicit **NO SPLASH · NO MPM** heightfield and caustic system. Useful to isolate 2.5D and optics, never evidence of a functioning splash. | R03 integrated MPM pool |
| **R07 — Aqua pool obstacle/optics progression** | `pool_obstacle_phase6_runup_film.html`, `pool_obstacle_phase9_hyperreal_water_visual_lab.html`, `pool_obstacle_phase11_reference_exact_water_caustics.html` | Successive obstacle wet film, material and caustic receivers. | The JIT splash solver |
| **R08 — HybridSplash Fable GPU MPM** | `hybridsplashFable_heightfield_native_mpm.html` | Separate WebGPU heightfield δ-simulation + MLS-MPM splash integration. | The WebGL2 Aqua pool or React/JIT ancestor |
| **R09 — HybridSplash Fable optical consolidation V5** | `hybridsplashFable_POOL_REFERENCE_LOCK_V5.html`, `.patch`, `_AUDIT.json` | Original historical material-consolidation candidate: heightfield and MPM shade with shared pool material and caustic receiver. | A universally physically correct optical champion; it preserves an old hand-tuned Fresnel response |
| **R10 — HybridSplash Fable advanced experiments** | `hybridsplashFable_reference_metaball_water_locked.html`, `hybridsplashFable_heightfield_material_unified.html`, `hybridsplashFable_waterpro_phase10.html` | Independent surface, optics and integrated WebGPU evolution stages. | V5 or current THALASSA T4 by name alone |
| **R11 — JIT WaterPRO compiled splash** | `BEST_water_visuals_caustics_splash.html` | Bundled JIT energy-layer splash and visuals with a self-contained renderer; source is separately preserved. | HeightfieldBEST, despite the word BEST |
| **R12 — standalone MLS-MPM WebGPU** | `docs/champions/donors/wave-to-3d/splash-mls-mpm.html` and `public/mlsmpm-webgpu.html` | Independent 3D fluid-solver experiments, not integrated shoreline/wake implementations. | Heightfield coupled JIT water |
| **R13 — current THALASSA ocean** | `/ocean?capture=1`, current T0/T2/T3/T4 | Current game-scale ocean and splash engine with source accounting and active shoreline. | Any of the independent historical pool or WebGPU demos |

## The correct comparison hierarchy

1. **Heightfield/wake physics:** R01 versus R04/R05/R06 versus current T3, matched sphere and water depth. Compare height and velocity fields, not foam textures.
2. **JIT release and fluid coupling:** R02/R03/R08/R09 versus current T3→T4, matching release volumes, physical time, sphere trajectory and carrier debit/return.
3. **Liquid morphology:** R00/R10/R11 versus current T4, same 3D particles, field resolution, camera and lighting; determine which actually supports continuous sheets and thinning tendrils.
4. **Water optics:** R07/R09/R10 versus current physical Fresnel, actual scene reflection/refraction, thickness and caustic receiver. Do not replace true dielectric Fresnel with the 25% normal-incidence old pool shortcut.
5. **Terrain:** R02/R07 versus current T2 and T3, overtopping, ponding, wet/dry shoreline, real wave propagation.

## Render and provenance policy

The original donor HTMLs live at `docs/champions/donors/library/` with byte-exact original Git blob hashes. The `research/water-reference-atlas` branch contains an automated original-page renderer `scripts/ci-water-reference-atlas.mjs` and a GitHub Actions workflow that captures every archived donor HTML as-is in Chromium. **Each receipt must say whether the browser rendered WebGL/WebGPU, which source was used, whether errors occurred, and which button was activated.**

Screenshots of two *different* original scenes are **lineage visual references**, not equivalent controlled hydrodynamic experiments. Failed GPU initialization, blank canvases, and wrong cameras must remain explicit failure states. A previous image labelled simply “original pool” is now classified **R00**, not R03.

The full Library filename scan identified 2,211 HTML files and 528 broad water-keyword candidates; the complete filename inventory is in `WATER_REFERENCE_LIBRARY_INVENTORY.json`. This is a discovery inventory, **not 528 verified distinct runnable water engines**. Duplicates, unrelated projects and unrenderable versions need to be grouped by source identity and hashes before more captures.

## Status

**Verified:** historical source files have been found, preserved and separated into distinct mechanisms; the original React/JIT pool and modern ocean already have real Chromium frames. **In progress:** automated original-source render atlas across the heightfield/MPM families. **Not yet verified:** which later heightfield+splash implementation is the user's accepted champion, a controlled physics/optics ranking, or a complete source consolidation. Preserve all candidates until the matched gates are satisfied.
