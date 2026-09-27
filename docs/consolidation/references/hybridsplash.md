# HybridSplash Fable — WebGPU hybrid ocean (≈127 builds)

| | |
|---|---|
| Files received | `ocean.zip` → `ocean/` (69 builds: `hybridsplashFable_*` incl. `planet` v2–v43, `nswe_shoreline`, `moana_runup`, `breaking_fold`, `crest_lifecycle`, `foam_deposits`, `obstacles_params`, `fft_backend`, `terrain_*`, `wind_drawmap`, `waterpro_phase07`, `WaterPRO_HydroLab_v0_1/v0_3`), plus the June 11 project (`HybridSplashFable_Project_20260611_dynamic_beach_runup_PATCHED.zip`, with its WGSL extracted in `validation/static_wgsl/`) |
| Audits received | `HYBRIDSPLASH_RELATIONSHIP_AUDIT_BUNDLE.zip` (127 build records, 15 branch families, feature matrix, regression map). The technical paper is `deep_research/hybridsplash_water_engine_technical_paper.md`. |
| API | WebGPU/WGSL compute + render, single-file HTML |
| Role in the consolidation | **Champion for nearshore water:** nonlinear shallow water over bathymetry, breaking, swash, overtopping into new basins, wet memory. Also **champion for foam as a material state** (dissipation-born foam, swash apex deposits, residue). It supplies the architecture doctrine `η_total = η_base + δ_sim + δ_breach`. |

## Verdict

HybridSplash states the architecture most clearly, and its latest planet builds carry the richest nearshore physics in the corpus:
- a nonlinear SWE *correction* riding on an analytic spectral base, with the base's own `∂η_B/∂t` subtracted in the mass equation;
- depth-limited breaking with a bed-slope-dependent γ (spilling vs plunging) and roller eddy viscosity;
- a longshore current driven by oblique breaking;
- infiltration of settled swash only;
- dissipation-born foam, swash-apex foam rope and dewatered residue;
- film physics on hard terrain edges (overtop / recede / basin lip).

That last item is "water passing over into new bodies." In an SWE with wet/dry cells this happens by itself. The film logic makes it *render* right.

Its splash spawn is the weakest part:
- stochastic crest-energy thresholds;
- random launch speeds and random class assignment (riding/sheet/droplet/spray);
- a fixed per-particle energy drain rather than a volume ledger;
- time-based phase transitions rather than physics-based ones.

Its GPU MLS-MPM (65,536 particles, fixed-point atomics, riding-phase spring to the surface) is a valuable implementation asset.

## What is in the code (read from `planet_dev_pages_v43` and the 0611 static WGSL)

**`WG_OCEAN`: analytic spectral base.**
- `KCOMP` components (80 in the latest) with finite-depth dispersion.
- Shoaling amplification `tanh(kh)^-1/4` (clamped 1–1.8) and a wet fade.
- Output `(η_B, disp_x, disp_z, ∂η_B/∂t)`. η̇ is carried so breaking and impacts can use it.

**`WG_HF` (v43): nearshore NSWE correction** `hf = (η_C, |u|, foam, wetMem)`, `mom = q`:
- `D = max(η_C + η_B + h + L, 0)`: the waterline *emerges* from total depth, nothing is declared;
- well-balanced pressure `−gD∇η`, central flux-advection, quadratic bed friction `−C_f|u|u/max(D, 0.15)`;
- **breaking** index `max(1.4·steepness − 0.25, η/D − γ_br(bed slope), Fr − 0.95)`, with `γ_br = mix(γ_gentle, γ_steep, 7·bedSlope)`, plus **roller eddy viscosity** `ν ∝ breaking·(0.9 + 1.8·bedSlope)`;
- **longshore current** forcing along the local shore tangent from oblique swell × breaking;
- **mass for the correction**: `∂η_C/∂t = −∇·q − ∂η_B/∂t`, so the total surface conserves mass;
- wet/dry (q = 0 below 1.2 cm);
- **infiltration** only for *settled* ponded water (uprush and backwash return first);
- offshore relaxation of the correction to zero (deep water is owned by the base; this also suppresses central-scheme checkerboards);
- edge sponge and caps;
- foam from **dissipation** (breaking + shear): continuous recharge, not a mask. Active foam rides and decays faster in draining sheets. On dewatered cells the **apex rope** (high-water line where wet neighbours meet a just-dried cell), strand fade and thin break apply. Wet memory is kept separately.

**`WG_BREAK`: rendering-side shore state.**
- Breaking χ (steepness, curvature, vertical aggression, breaker index); dynamic run-up head sampled seaward along the beach normal.
- Swash sheet thickness; thin-water support with no z-fighting and no static waterline from wetness alone.
- **Hard-edge film:** overtop / recede / basin-lip classification, film that drains down faces, and a geometry clamp so the displaced sheet never passes through terrain.

**`WG_SPAWN`: crest → particles.**
- `crestEnergy = f(breaking age, foam, η̇⁺, slope, −curvature, depth breaker, overfall)`, with a threshold of 0.44.
- Stochastic probability ∝ energy × rate. Particle count 1–6.
- Velocity is `dir(−∇η)·(0.8 + 2.6r)·boost + wind` horizontally and `η̇⁺·1.25 + (0.62 + 2.4r)·boost` vertically, plus an overfall pour.
- Random class: RIDING 58 %, SHEET 24 %, DROPLET 13 %, SPRAY 5 %.
- Energy drain `η −= 0.0035·gain, η̇ −= 0.034·gain` per particle; cooldown 0.07–0.18 s.

**`WG_P2G1/P2G2/GRID/G2P`: GPU MLS-MPM.**
- Grid 128×20×128, `MAXP 65536`, fixed-point atomics, quadratic weights.
- Linear EOS `p = k(ρ/ρ₀ − 1) ≥ 0` plus viscosity.
- **Riding phase:** a spring toward the heightfield surface `−34·gap·α(age)` for 0.35 s (the ride window). Then SHEET → LIGAMENT (0.55 s) → DROPLET (0.82 s); droplet and spray are ballistic.

**`WG_IMPACT` + `WG_BREACH`: BFT return.**
- A landing or sinking particle writes fixed-point `breach` (downward momentum → ring source) and `foamImp`.
- Energetic hits spawn a 2-particle crown.
- `WG_BREACH` applies a band-limited source to η̇ with headroom and caps, then clears.

**Rendering (`RS_*`, `C_SHADE`):**
- ProPool-style receiver caustics (with the V-flip orientation lock);
- underwater receiver and lighting, exact Fresnel;
- foam material modes and foam shadow optics;
- wetness and residue on terrain.

## Relationship audit (what the version matrix says)

- 127 builds in 15 branch families. The UI/telemetry, foam and planet branches are the largest.
- **Best per subsystem** (from the audit):

  | Subsystem | Candidates | Have it? |
  |---|---|---|
  | Nearshore | `HSF_20260613_HYDRAULIC_BASIN_OVERTOPPING_FILM`, `…slope_aware_breach_mound_flux`, `…momentum_film_swash_wetbuf`, `…dynamic_borefront_thin_swash` | No |
  | Splash | the reference `splash-mls-mpm-WaveFloor-MINIMAL(1).html` and the world-space/density-raymarch candidates | No |
  | Optics | `ProPool.html` and the "caustic receiver V-flip lock" trusted base | No |
  | Foam | Foam Lab V1 and the dynamic retreat-edge residue | No |

  **Most of the audit's top-ranked HSF candidates are not in what was uploaded here.** The planet v33–v43 builds I have *do* contain the overtopping and film logic (patch `HYDRAULIC_BASIN_OVERTOPPING_FILM_PATCH_20260613` was carried forward).
- Open regressions, per the audit:
  - foam architecture;
  - ProPool side/underwater mismatch;
  - basin lateral redistribution;
  - dynamic residue;
  - MLS-MPM visual (sprites vs density raymarch).

## Strengths to carry forward

1. The **layer contract** `η_total = η_base + δ_sim + δ_breach`, with the correction's mass equation subtracting `∂η_B/∂t`. THALASSA's T2 shore tile should adopt this formulation.
2. **Breaking physics:** slope-dependent γ, a Froude term and roller eddy viscosity.
3. **Longshore current** from oblique breaking.
4. **Infiltration only of settled water**, so the backwash stays weaker than the uprush.
5. **Foam from dissipation, as continuous material:** apex rope at the maximum reach, strand fade, residue. Wet memory kept separate.
6. **Hard-edge film and overtopping classification** (overtop / recede / basin lip) with a terrain-clearance geometry clamp.
7. **GPU MLS-MPM at 64 k particles** with a riding phase.

## Weaknesses (do not carry)

1. Central-difference SWE (checkerboard-prone; needs offshore relaxation). THALASSA's T2 (hydrostatic reconstruction + HLL, well-balanced, positivity-preserving) is the better numerical core. Keep HybridSplash's *physics terms*, not its stencil.
2. Stochastic spawn with random velocities, random classes and a per-particle fixed drain: no ledger, and the class isn't derived from physics.
3. Time-based sheet → ligament → droplet transitions. Breakup should come from thickness, strain rate and Weber number.
4. Many "fixed/candidate" monoliths with UI churn. The audit rightly treats compile/UI passes as tooling, not visual truth.

## Still missing (to request if we go deeper on nearshore)

- The audit's top HSF candidates (`HYDRAULIC_BASIN_OVERTOPPING_FILM`, `slope_aware_breach_mound_flux`, `PROPOOL_WATER_OPTICS_RESTORE_2`, `CAUSTIC_RECEIVER_V_FLIP_LOCK_only`, `FOAM_LAB_V1_HYPERREAL_MATERIAL`, `DYNAMIC_RETREAT_EDGE_FOAM_RESIDUE`, `MOVING_HINGE_Cbreaker`, `CRESCENT_no_stretch_breaker`). Each is about 110–130 KB of HTML.
- The two audit references: `ProPool.html` and `splash-mls-mpm-WaveFloor-MINIMAL(1).html`.
- `HYBRIDSPLASH_CONSOLIDATED_BEST_V1_STANDALONE.html`.
- `pool.zip` (98 HTMLs + 6 nested React/TS projects, including `aqua_visual_phase7_sync`). See `aqua-line.md`.
