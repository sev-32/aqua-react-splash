# Inventory: everything received, what duplicates what, and what's still missing

Machine-readable list: `inventory.csv` (1,163 rows). It gives source, path, bytes, SHA-256, kind, API (webgl/webgl2/webgpu/three), HTML title, duplicate count, canonical copy and arrival. File *contents* are not committed here (this repo is public); only names and fingerprints are.

## Received (as of 2026-09-27)

| Source | Arrived as | Files | Size | Duplicates of files elsewhere |
|---|---|---:|---:|---:|
| `01_CURRENT` | 01_CURRENT.zip (Sep 26); matches OCEAN_LEAD_R1's hash lock 715/715 | 713 | 12.56 MB | 124 |
| `ocean` | ocean.zip (Sep 26) | 93 | 15.55 MB | 2 |
| `hs_audit` | HYBRIDSPLASH_RELATIONSHIP_AUDIT_BUNDLE.zip (Sep 26) | 14 | 2.40 MB | 0 |
| `deep_research` | deep_research.zip (Sep 26; includes two nested zips, unpacked) | 211 | 18.85 MB | 1 |
| `Particles4All` | Particles4All.zip (Sep 26); same source as the copy in 01_CURRENT, plus `.git` and `docs/small.png` | 29 | 2.35 MB | 28 |
| `OCEAN_LEAD_R9` | OCEAN_LEAD_R9.zip (Sep 25; uploaded twice, identical) | 10 | 7.65 MB | 0 |
| `OCEAN_LEAD_R1` | OCEAN_LEAD_R1.zip (Sep 26); a handoff pack of docs, tools and a hash lock for the 125 MB workspace | 31 | 2.99 MB | 0 |
| `HybridSplashFable_Project_20260611` | …dynamic_beach_runup_PATCHED.zip (Sep 25) | 40 | 2.14 MB | 1 |
| `uploads` | single files: SFXwaterIdeas, Multi-Regime-Water, Hybriddeepthink, Fable 5.1 report, wavelab_v50, Foam Foundry V4.3, Nimbus R9 V1.8.4, heightfieldBEST, jit_infinite | 9 | 2.77 MB | 6 |
| `repo:docs/reference` | in this repo from the start (MinimalWaves/gptwaves, WebGPU "Splash", Water Master Encyclopedia) | 3 | 1.82 MB | 0 |
| `repo:public` | in this repo from the start (`mlsmpm-webgpu.html` = `pool2_webgl_water.txt`, textures) | 10 | 0.43 MB | 1 |

**Unique:** 1,000 files, 63.3 MB. Notable duplicates:
- the separately uploaded heightfieldBEST and jit_infinite are byte-identical to `01_CURRENT/…/originals/`;
- the Fable 5.1 report, SFX treatises, Multi-Regime-Water and Hybriddeepthink also sit in `JIT-Splash-M1/references/uploads/`;
- `deep-research-report_LOD_hydrology.md` = `08-deep-research-report_LOD_waves-water.md`.

## Runnable builds (unique) and whether they run here

| Build | API | Runs in this environment? |
|---|---|---|
| heightfieldBEST | WebGL2 | yes (captured) |
| JIT Developer Lab R22, BEST-JIT-M2, BEST-JIT-M3, ARCHIPELAGO-M4, Poseidon-repaired | WebGL2 + workers | yes (lab captured; slow on SwiftShader) |
| Poseidon R6.4.5, Archipelago V3, POSEIDON R9 candidate, Nimbus R9 V1.8.4/V1.8.6, wavelab v50, Foam Foundry V4.3 | WebGL2 | yes (used in earlier milestones) |
| jit_infinite | WebGL + three | not run (source extracted from its embedded archive) |
| MinimalWaves / gptwaves (`docs/reference/pool1_mlsmpm.txt`) | WebGL2 (R3F) | yes |
| Particles4All | WebGPU | **no**: 12 storage buffers > the adapter's 10 (a split fixes that); the device is then lost on SwiftShader |
| HybridSplash (all ~70 builds incl. planet v2–v43), "Splash" MLS-MPM | WebGPU | **no**: device lost on SwiftShader (basic WebGPU compute does work) |
| WaterPRO HydroLab v0.1/v0.3 | WebGL2 / 2D | not run (authoring tool) |
| deep_research: HELIXION NIMBUS V59, canyon V42, WGSL terrain/water suites | WebGPU/WebGL2 | not run (outside the water scope for now) |

## Still missing

Referenced by the received documents, not uploaded. Grouped by value to the plan (`PLAN.md`):

| Item | Why it matters | Size (known) | Where it's referenced |
|---|---|---|---|
| **AQUA heightfield ⇄ MLS-MPM source** (latest pass build), or **`pool.zip`** (`aqua_visual_phase7_sync` …) | Exact code for SF genesis, ride window, canonical BFT, ligament lifecycle, subsurface entrainment, sphere dynamics (P3, P5) | unknown (pool.zip: 98 HTML + 6 React/TS projects) | `ocean/AQUA_*_NOTES.md`; HybridSplash technical paper §7–§14 |
| **`02_BASELINES/TERRAFORGE_T4R_CHECKPOINT/`** | Pool refraction and caustic receiver champion (P7) | 1.28 MB | OCEAN_LEAD_R1 AUDIT A07 |
| `07_VISUAL_EVIDENCE_CURATED/` | Champion frames (R22 lanes, T4R views) for visual floors | 4.26 MB | R1 `baseline_lock.json` |
| `03_REFERENCE_COMPILER_V2/code/` and `/docs/` | Curated code-provenance groups (NSWE, foam foundry, …) and capability docs | 6.41 + 0.92 MB | R1 work orders |
| `00_START_HERE/`, `04_DIRECT_DONORS/Poseidon/Poseidon_R6.4.4.html`, `hybridsplashFable_fixed(1).html` | Workspace navigation; one more POSEIDON revision | < 0.3 MB | R1 lock |
| HybridSplash HSF top candidates (`HYDRAULIC_BASIN_OVERTOPPING_FILM`, `slope_aware_breach_mound_flux`, `PROPOOL_WATER_OPTICS_RESTORE_2`, `CAUSTIC_RECEIVER_V_FLIP_LOCK_only`, `FOAM_LAB_V1_HYPERREAL_MATERIAL`, `DYNAMIC_RETREAT_EDGE_FOAM_RESIDUE`, `MOVING_HINGE_Cbreaker`, `CRESCENT_no_stretch_breaker`) | Best nearshore, foam and optics variants per the relationship audit (P6) | ≈ 110–130 KB each | relationship audit report |
| `ProPool.html`, `splash-mls-mpm-WaveFloor-MINIMAL(1).html`, `HYBRIDSPLASH_CONSOLIDATED_BEST_V1_STANDALONE.html` | The audit's optics and splash references; the WebGL2 standalone MVP | small | audit, technical paper |
| The other ~110 MB of `OCEAN_UNIFIED_AI_WORKSPACE_V2.zip` | Mostly search indexes, manifests and duplicate copies | — | R1 lock (not needed) |

**One small next upload (≈ 13 MB)** would cover the workspace gaps that matter. From `OCEAN_UNIFIED_AI_WORKSPACE_V2`, zip:
- `00_START_HERE/`;
- `02_BASELINES/`;
- `04_DIRECT_DONORS/`;
- `07_VISUAL_EVIDENCE_CURATED/`;
- from `03_REFERENCE_COMPILER_V2`, only `code/` and `docs/`.

**The AQUA source** is the most valuable missing piece for the splash work.
