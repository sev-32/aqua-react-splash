# THALASSA — Champion recovery pass 02: original HybridSplash pooled material

Date: 2026-10-10. **Not a promotion or a merge.** The aim is to preserve the actual prior working semantics, not paraphrase what the water should look like and reconstruct it again.

## Recovered from the user's Library: original material consolidation

The exact files below were materialized and copied into `docs/champions/donors/library/`.
Both the original SHA-256 (where recorded by the historical audit) and Git blob SHA-1 of the archived source were checked.

| File | Original SHA-256 | Archived Git blob SHA-1 | Role |
|---|---|---|---|
| `hybridsplashFable_POOL_REFERENCE_LOCK_V5.html` | `ac4a33012f5c5d209d896d6ac1546b778855b2e6e0dffc043a4a1986a69c581c` | `4235f83096af0f951dfdd6e878500616b7264673` | Unified GPU heightfield, MLS-MPM, pool reference water material and terrain receiver |
| `hybridsplashFable_POOL_REFERENCE_LOCK_V5.patch` | `f0d27e2419802b49b8baa0d847206b33010fdc6efaf4aeca3f9de9fb10a466c0` | `eed2c745057a23ded1385f1cec6fd1d660ee2b3a` | Traceable patch from prior heightfield/material variant |
| `hybridsplashFable_POOL_REFERENCE_LOCK_V5_AUDIT.json` | Not independently given in the historical audit | `50b0031a150434f9595152fc977e2937cccdcabb` | Original integrity, semantic anchors, rejected V4 errors |

This is a **recovered source artifact**, distinct from the historical reference map which previously only named the donor. Source is now present in the branch and protected by the champion source audit.

## What the V5 implementation actually consolidates

The V5 code contains `POOL_REF_MATERIAL` once and inserts it into the heightfield/water path and MPM resolved-liquid path. The relevant functions are `poolReferenceWaterAbove`, `poolReferenceFineNormal`, `poolReferenceSurfaceRayColor` and `poolReferenceReceiverColor`. The source also contains a caustic render target with a refracted footprint and an area-ratio focus; the terrain receiver uses `causticTex` along with the same material. The MPM fluid is shaded as water using the same material solution, not a separate opaque cyan sprite overlay. This architecture directly addresses color/material mismatches between heightfield and splash.

The original V5 audit marks as passed: shared shader source, water and MPM usage, terrain caustic receiver lookup, sign-preserving caustic denominator, preserved heightfield/MPM constants, JavaScript module syntax, and patch reconstruction. It also records **why an earlier V4 candidate was rejected**: duplicated water material functions, absolute-valued refracted-light Y in caustic projection, fixed 2 m caustic receiver depth, and unwanted tone mapping inside the claimed pool material.

These are **historical audit claims backed by recovered code and hashes**; they are not yet an independent 2026-10-10 software-GPU render quality certification or proof of complete fluid mechanics.

## Important differentiation: correct architecture is not sufficient optical physics

V5 deliberately copies the older pool's `propoolFresnelAbove` visual behavior. That historical pool uses a hand-tuned 25% normal-incidence reflection, compared with ~2% physical dielectric reflectance for n≈1.333. Reusing **one material shader across fluid and heightfield is excellent consolidation engineering**, but copying the older Fresnel coefficient as a universal physical truth would be a regression.

**Consolidation rule:** retain the unified material/receiver graph of V5, evaluate its physical splash/heightfield coupling, and use THALASSA's exact dielectric Fresnel and real scene visibility where those mechanisms are demonstrably stronger. Preserve the functioning source paths before changing implementation details.

## Relationship to other donor recoveries

`sev-32/wave-to-3d` contributed four verified-original GPU fluid and standalone reference source files, recorded in `CHAMPION_RECOVERY_PASS01.md`. The existing ocean branch also contains `public/mlsmpm-webgpu.html` (174,474 characters), now source-hash-pinned.

The original Three.js pool renderer `src/components/SplashParticles.tsx` and shaders remain untouched, protected, and independently rendered. The eight-frame pool/ocean lineage capture (GitHub workflow `38059553816`) completed with no browser/GL errors. These two scenes are different setups, so the images are **not an equivalent hydrodynamics benchmark**.

## Status and next gates

**Preserved now:**
- Original pool fused Marching Cubes and connection-graph sources.
- Three standalone GPU donor HTML implementations (one from the user's Library and two from wave-to-3d).
- Original shared water material + terrain caustics V5 code and its regression patch and audit.
- Ocean's independent physical dielectric Fresnel and surface-driven spectral caustic.
- Original numerical JIT/heightfield design references and the semantic constitution.

**Unproven:**
- That the recovered V5 can run on the target/browser GPU without new errors.
- Whether its heightfield wake, fluid morphology, or visual receiver integration outranks every other donor.
- Whether any prior JIT R21 wetness-state / JIT M3 coupling source is fully recovered; these remain explicit donor gaps.
- The global physics and optical correctness of the final combined ocean.

**Next automated work:** render recovered V5 in Chromium, compare with historical donor screenshots where physically meaningful, and isolate a truly matched sphere/wave/lighting setup for two candidates. Promote **per capability**, never by ZIP version. Keep R1/default ocean intact until objective evidence warrants a substitution.
