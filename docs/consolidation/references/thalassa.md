# THALASSA (this repo, `src/ocean`, route `/ocean`): honest assessment against the champions

THALASSA is the consolidation engine built on this branch (`claude/affectionate-edison-15ya9p`, milestones M1–M5d). It's WebGL2, and verified headless on SwiftShader with 57 unit tests across spectrum, interaction, bodies, SWE, atmosphere, families and MPM. This page states, per capability, whether THALASSA is **at**, **above** or **below** the reference champion. "Below" is the work list.

| Capability | THALASSA today | Champion | Status |
|---|---|---|---|
| Open-ocean spectrum and waves | GPU FFT cascades `[1400, 280, 18] m` (256²–512²), physical JONSWAP+TMA with Mitsuyasu spreading and swell elongation; 8 sea states; CPU spectral mirror for physics queries | POSEIDON | **At** (rebuilt on POSEIDON's renderer and spectrum in M5d). Keep comparing close-ups. |
| Water optics (Fresnel, refraction, reflection, glitter, upwelling, underwater) | POSEIDON volumetric transparency shared by sea and splash; slope-variance LUT plus Cox–Munk tail; anisotropic glitter; Gordon upwelling; screen-space refraction march (16 steps + 4 bisections) | POSEIDON (sea), T4R (pool receiver) | **At** POSEIDON. T4R's pool-receiver optics are not yet compared (not uploaded). |
| Distant LOD, horizon, globe | CDLOD with curvature culling, earth-curved horizon, globe to orbit | POSEIDON + Nimbus | **Above** both (neither does globe-to-orbit water). |
| Atmosphere, clouds, weather, lighting | Nimbus lighting authority: ozone atmosphere, volumetric weather clouds, cloud shadows, rain, wind→sea | Nimbus (and HELIXION NIMBUS V59, not yet compared) | **At** Nimbus R9 for the parts used. |
| Terrain and bathymetry | Procedural island, GPU-baked, CPU products (shoreline distance, slope, uncertainty), CDLOD terrain with wet sand | TerraForge line (deep_research) | Adequate for water work; not a champion target here. |
| Nearshore shallow water | T2 tile: **hydrostatic reconstruction + HLL** (well-balanced, positivity-preserving, desingularised, Manning), spectral wave-maker via ghost cells and relaxation, WaveLab breaking and lip overturn, extensive foam, wetness memory, splash release; T1 depth-limited shoaling outside the tile | HybridSplash v43 (physics terms), WaveLab (breaking) | **Numerics above** HybridSplash (no checkerboards). **Physics below**: missing slope-dependent γ with roller viscosity, longshore current, settled-water infiltration, swash apex foam rope, hard-edge film/overtop classification, and the `∂η_B/∂t` subtraction in the correction's mass equation. |
| Body → water reaction (wake) | T3 eWave JIT tiles: **exact dispersion**, a capacity-field source (Δ displaced volume), integer-cell recentering, sponge edges | heightfieldBEST | **Below** at the body. THALASSA has dispersion (Kelvin wakes possible) but **no flux blocking**, directional boundary momentum or void collapse. BEST has blocking but no dispersion. The fix combines them (`../CORE_LAW.md` §1). |
| Floating-body dynamics | Column buoyancy sharing the hull function with the GPU source and mesh; anisotropic drag relative to orbital velocity; autopilot | gptwaves-v7 / AQUA sphere dynamics, Lab contact receipts | **Below**: missing planing lift/drag, skim-bounce, slam and slope slide. |
| Heightfield → splash launch | Representability limiter (crest excess → extensive release maps), Froude-limited entry jet `Q(1 − √(ga)/U)`, Wagner curtain speed, open-cavity feed, exit mantle, sub-frame emission, ballistic-separation limiter | JIT lab (ledger/events/admission), AQUA (SF genesis, NMS, modes, crest ribbons, ride window, two thresholds, energy drain) | **Mixed**. THALASSA's *body-entry* launch is the most physics-derived in the corpus. Its *wave-crest* launch (limiter release) lacks AQUA's crest-leader ribbons, modes, NMS, ride window and two-threshold hold, and the JIT lab's persistent finite events. |
| Detached-liquid solver | CPU MLS-MPM (from the repo pool), **dx = 0.32 m**, 48×44×48 per volume, ≤ 3 volumes, 6,000 particles | Particles4All (PBF, 2 cm, 30 k–1 M on GPU), HybridSplash GPU MLS-MPM (64 k), Splash (WebGPU MLS-MPM) | **Far below** on resolution. This is the root cause of the puffy rock splash and faint ball crown noted in M5c. |
| Splash rendering | Screen-space fluid with physical thickness, silhouette normals, film Fresnel, two-stream spray clouds, opacity shadow map from the sun, neighbour-count coherence | Particles4All (anisotropic SSFR + narrow-range filter); AQUA (ligament lifecycle vocabulary) | **Below** P4A in surface smoothness and anisotropy. **Above** in lighting integration (sun self-shadowing, POSEIDON optics). |
| Splash → water return | Settle events hand volume back to the tier under the landing point (exact bookkeeping) | JIT lab (radial pulse, zero net impulse), AQUA (canonical BFT events, zero-mean footprints, budgets) | **Below** in the wave response vocabulary (droplet/blob/sheet/pour/rain footprints). |
| Foam | Cascade-space whitecap foam with extensive storage, Monahan controller, POSEIDON aging micro-structure | Foam Foundry V4.3 (plume/glow), HybridSplash (dissipation-born, apex rope, residue), AQUA (subsurface entrainment) | **Below** on the plume → surfacing → foam chain, fresh-aeration glow and swash residue. |
| Wetness on bodies | Shader wetness | Lab R21 metric film (ledger 1e-20 m³); BEST film (drain, drip) | **Below**. |
| Local high-detail zone ("magic carpet") | Not present (the wrong-pool attempt is parked in `stash@{0}`) | Lab R21/R22 moving causal page + spectral boundary; jit_infinite's camera-following window | **Missing**. This is the core of the next phase. |
| Scheduling (JIT tiers by risk) | Direct tile policy (bodies request tiles) | Lab R22 managed pages; Fable 5.1 report | **Below**. Planned as M6. |
| Developer cockpit and telemetry | `window.__THALASSA__` capture API, telemetry, debug views | AQUA cockpit (live alerts, 2D field drawer, HF Lab), Lab inspector | **Below** in live diagnostics. |

## Bottom line

THALASSA already owns the **far field** (ocean, optics, sky, globe, LOD) at or above its champions. It is **below the floor on everything local**:
- the body reaction (BEST);
- the splash launch semantics (AQUA and the JIT lab);
- detached-liquid resolution (Particles4All);
- nearshore physics terms (HybridSplash);
- the foam plume chain (Foundry);
- body dynamics (gptwaves);
- wetness (the Lab);
- live diagnostics (AQUA).

That is exactly the "high detail only where needed" layer you described. It should be built as the carpet, from those champions. See `../PLAN.md`.
