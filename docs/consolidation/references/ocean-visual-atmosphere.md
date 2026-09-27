# Ocean, optics, foam, breaking and atmosphere references

These references were consolidated into THALASSA in earlier milestones (M1–M5d). This page records **what each is the best at**, what THALASSA took, and what is still open. Hashes are in `../INVENTORY.md`.

## POSEIDON: champion for open-ocean waves and water optics

| | |
|---|---|
| Files | `OCEAN_LEAD_R9/candidate/POSEIDON_OPEN_R9_NIMBUS_NATIVE.html` ("Open Ocean R7 — POSEIDON R6.4.5 …", 967 KB) and `originals/Poseidon.html` (R6.4.5 foam polarity correction, 195 KB). `ocean-m4/Poseidon-repaired.html` is the JIT line's repair. `04_DIRECT_DONORS/Poseidon/Poseidon_R6.4.4.html` was not uploaded. |
| Best at | FFT cascade spectrum; sea-state library and wind scenarios (R9 lists these as "protected authorities", byte-identical since R7); anisotropic Gaussian glitter NDF with Smith G; foam aging micro-structure with correct polarity (Voronoi, holes, tendrils); volumetric transparency; **below-water branch** (water-to-air Fresnel, TIR, caustics). |
| In THALASSA | M5d rebuilt THALASSA's sea on POSEIDON's renderer and spectrum: water shading, horizon/distant LOD, a globe ocean coupled to Nimbus at all elevations. Also Gordon multiple-scatter upwelling and POSEIDON light geometry by default. |
| Open | R9's own README: the Nimbus environment in the R9 candidate is "a matched directional projection for the R7 wideOcean proof camera", not a full bridge. THALASSA does the full bridge (a sky baked from the atmosphere model and sampled for reflections at any view). POSEIDON stays the visual floor for water close-ups: side-by-side captures should keep being compared against it. |

## Nimbus: champion for atmosphere, clouds, weather and lighting

| | |
|---|---|
| Files | `START_NIMBUS_R9_V1_8_4.html` (uploaded; title "NIMBUS V1.8.2 — R7 Multiscale Cloud Realism") and `OCEAN_LEAD_R9/source/START_NIMBUS_R9_V1_8_6_MORPHOLOGY_FAMILIES.html`. Also found in `deep_research/procedural_earth…/full_sources/HELIXION_NIMBUS_V59_VOLUMETRIC_PERFECTION.html` (308 KB, WebGPU + WebGL, "Detail-Preserving Anti-Banding"): **another Nimbus line not yet analysed**. |
| Best at | Planetary Rayleigh/Mie/ozone atmosphere (Rp 6360 km, +100 km, Hr 8.5 km, Hm 1.2 km, βR (5.8, 13.5, 33.1)e-6, βM 21e-6, ozone tent at 25 km); multiscale volumetric clouds with morphology families; weather model (thermodynamics, microphysics, planet weather, optical compiler); globe to orbit. |
| In THALASSA | M4b: Nimbus is THALASSA's lighting authority. Volumetric weather clouds, cloud shadows, rain and wind→sea coupling; the ocean is a globe under the same atmosphere. |
| Open | Compare against HELIXION NIMBUS V59 (anti-banding, volumetric detail) before calling the cloud renderer final. |

## Archipelago Pinnacle V3: donor, not champion

| | |
|---|---|
| Files | `originals/Archipelago.html` (= `04_DIRECT_DONORS/ARCHIPELAGO_PINNACLE_V3.html`) and `ocean-m4/ARCHIPELAGO-M4.html` |
| Notes | "Unified Hyperreal Island · Ocean · Atmosphere Engine V3": FFT cascades, local correction and occupancy wake fields, shore/swash, terrain/cloud/water optics. **Splash spawning and drawing are disabled** (M1 audit: `jitSpawn`/`spawnSpray` return immediately). The M1 audit found mismatched visible vs. optical wave compositions and camera clamped above water. You said POSEIDON is better for ocean visuals, and the JIT R2 audit agrees Archipelago shows horizon aliasing under the same renderer. Keep it as a donor for island composition ideas only. |

## Ocean Foam Foundry V4.3 "Rising Plume": champion for close-up foam and bubble plumes

| | |
|---|---|
| File | `OCEAN_FOAM_FOUNDRY_V4_3_RISING_PLUME.html` (uploaded; title "V4.0 Clean Core") |
| Best at | Physically gated foam birth (compression, steepness, crest height) plus a guided production breaker. **Extensive storage** (amount, depth × amount, mass-weighted age in seconds) so advection can't invent shallow bubbles. Only strong breaking entrains a **downward plume**. **Subsurface turquoise glow is a fresh-event phenomenon**: aged lace sits on dark water. Foam optics: porosity, bubble scale, packing contrast, internal shadow. Foam-shadowed caustics. Distant foam breaks up with its web octaves. |
| In THALASSA | The foam model uses extensive storage (mass, mass·age, air, coverage) and a Monahan closed-loop controller. Its shading is POSEIDON's aging micro-structure. |
| Open | THALASSA lacks the Foundry's **plume → surfacing → foam** chain and its subsurface fresh-aeration glow. These are the same physics as AQUA's subsurface entrainment. Merge them in the foam work (M2). |

## WaveLab v50: champion for breaking-wave overturn and the hull wake lab

| | |
|---|---|
| File | `wavelab_v50.html` (uploaded; "WaveLab — developer build") |
| Best at | Breaking state texture (R = breaking energy, G = **plunge phase**, BA = propagation direction). The plunge clock *travels with the advancing front* so a moving break's lip matures, and big lips take longer to pitch (`√(crest/0.6)`). A **lip momentum field** (the top keeps its speed while the base shoals). A 64×64 lip reduction feeds CPU impact-splash spawning. **Wake Lab**: the hull is held in a moving frame, with a simulated wake (real physics) plus an **analytic Kelvin overlay** (transverse and divergent terms toggleable, Bernoulli midship depression), hull shape, ride-up and JIT bow spray. Area-matched hull rim clipping with a two-shell gather (loop gain < 1). `__wavelab.onEvent` streams lip-land, object-impact and bow-spray events for a FLIP hook-up. |
| In THALASSA | M4 took WaveLab's breaking detection, lip ballistic overturn, bubble plume, extensive foam, wetness memory and splash release into the T2 shore tile. |
| Open | Use Wake Lab's **analytic Kelvin overlay** as the *reference* for validating the dispersive carpet wake (see `../CORE_LAW.md`). Use the lip momentum and plunge clock as the source of plunging-breaker splash launches. |

## T4R (TERRAFORGE_T4R_CHECKPOINT): champion for pool optics (not uploaded)

R1's audit (A07): "`T4R/surface.png` demonstrates a stronger pool receiver/refraction/caustic view." Its sources are `02_BASELINES/TERRAFORGE_T4R_CHECKPOINT/` (1.28 MB): ProPool caustic source snippets, receiver ray functions, POSEIDON `water_fs.frag.glsl`, gptwaves caustics shaders, T2 capacity/transfer adapters. **Requested** as part of the small follow-up zip.

## WaterPRO HydroLab v0.1 / v0.3: field-authoring workbench

A 2D/3D field workbench: paint water and terrain with brushes; energy gain, domain warp, foam/wet decay. It's a development tool, not a champion for any runtime capability. It may be useful later as the model for THALASSA's developer cockpit.

## "Splash" (`public/mlsmpm-webgpu.html` = `docs/reference/pool2_webgl_water.txt`): GPU MLS-MPM reference

A WebGPU MLS-MPM fluid (15 compute passes) with screen-space fluid rendering (depth, thickness, refraction with thickness-scaled exit offset, Beer–Lambert transmittance). It's the MLS-MPM counterpart to Particles4All's PBF, and a candidate for the carpet's GPU detached-liquid solver alongside P4A (see `particles4all.md`).
