# The Aqua line: this repo's pool → MinimalWaves (gptwaves) → jit_infinite → AQUA passes 1–13

This repository is `aqua-react-splash`. Its `src/components` pool (Evan Wallace WebGL Water ported to React Three Fiber, plus CPU MLS-MPM splash) is **the oldest member** of a lineage that was developed much further *outside* this GitHub repo. The later members are summarised here, with what exists in hand and what doesn't.

## Members

| Member | Where | What it is | In hand? |
|---|---|---|---|
| **Repo pool** (`src/components`, `src/hooks`, `src/lib/mlsmpm.ts`, `src/shaders`) | GitHub `main` | Wallace wave equation, 256² grid in a 2 m pool with a draggable sphere. Volume-displacement coupling (`volumeInSphere(old) − volumeInSphere(new)`). CPU MLS-MPM splash with metaballs and connectivity. | Yes, and untouched. The parked carpet attempt in `stash@{0}` was built on this, which was wrong. |
| **MinimalWaves / GPTWaves** (`docs/reference/pool1_mlsmpm.txt`) | repo docs | React-Three-Fiber app with engines `gptwaves-v7`, `gptwaves-vpro` (hybrid ocean, phase-1 crest field) and `oceansimv1`. **Complete sphere physics** (below), bubbles, breach, cavitation, drips, wetness, boats (laser, motorboat, yacht, container ship), world/lake/coast terrain with shore SDF foam and wet sand, caustics v2, volumetric clouds, god rays. Its `oceansimv1` has a **telemetry** block and schema. | Yes (bundled build; it runs when served with its `webgl-water/*.jpg` textures next to it: copy `public/textures/*.jpg`, and use `zneg.jpg` for the missing `yneg.jpg`) |
| **jit-runtime / jit_infinite's embedded source** | `01_CURRENT/.../originals/jit_infinite.html` (JSON archive) | An Aqua snapshot with **`aquaHeightfield.ts`, "Aqua Phase 7 — Occupancy SWE, transplanted"** from heightfieldBEST. Changes: an absorbing rim instead of walls (the patch "is a window, free to follow the camera"), and **fixed exporter units** (BEST's emitter never fired). Also `mlsmpm.ts` with `spawnCrown` and `spawnSphereBreach`, and `mpmConnectivity`. | Yes (source extracted from the HTML) |
| **AQUA heightfield ⇄ MLS-MPM, passes 1–13** | the user's local `aqua-react-splash-heightfield-mlsmpm-pass*` builds | See below. **Pass notes only** (`ocean/AQUA_*_NOTES.md`). | **Notes only, no source** |
| **pool.zip → `aqua_visual_phase7_sync`** | described in the HybridSplash technical paper | `useWaterSimulation.ts` (≈75 KB: `emitHeightfieldEnergy`, `coupleMpmParticles`, `WaterImpactEvent`, `HeightfieldEmissionSample`), `mlsmpm.ts` (≈37 KB: `spawnHeightfieldFilm`, `applyCohesiveRide`, `spawnSphereBreach`), `phase7Runtime.ts`, `subsurface.ts`, `sphereDynamics.ts`, `waterStore.ts` | **Not uploaded** |

## MinimalWaves / gptwaves-v7: what it contributes (read from the bundle)

**Sphere physics** (the "advanced sphere" that AQUA pass 5 later copied):
- **Heightfield buoyancy from the GPU.** 32 samples across the sphere footprint, read back from a render target at 20 Hz. A plane fit gives surface height and slope. The submerged volume is integrated per sample column.
- Buoyancy `ρ·V·g`, added mass `C_a·ρ·V` (C_a = 0.5), linear and quadratic drag scaled by wetted fraction.
- **Planing:** lift `C_L·ρ·A_wet·U²·(entry fraction)`, capped, plus planing drag.
- **Skim-bounce:** a spring-damper along the local water normal, gated by entry angle (< 35°), penetration fraction, surface slope and entry speed.
- **Slam:** `C_s·ρ·A·v_n²` for shallow immersion.
- **Slope slide:** acceleration down the wave face.
- **Mouse servo:** a critically damped target spring with separate air and water stiffness and force caps (the pointer moves the *sphere*, never the water).
- **Telemetry record:** speed, entry speed and angle, submerged fraction, cap height, wetted fraction, planing lift/drag, skim, slam.

**Coupling and wake (`oceansimv1`):**
- **Displacement:** a Wallace-style volume displacement (`Ml(old, new, r, s)`) scaled by Bézier curves of speed and submergence (`curve-v1`).
- **Wake:** a *dipole* of drops ahead and behind (`fr-curve-dipole-v1`) whose strength, length, width and decay come from Bézier curves of the Froude number.

This is a **parameterised** wake. The curves are authored, not derived. heightfieldBEST's occupancy coupling is the "real reaction" you described. gptwaves' dipole is the "faked wake parameters" alternative.

**Heightfield core ("v7core"):** `velocity += 0.5·lap4·waveSpeed; height += velocity` on a velocity channel, with nearest filtering. AQUA pass 12 adopted it after its own guarded solvers "melted" broad waves.

## AQUA passes 1–13: the most complete *design* of the heightfield ⇄ splash loop

From the notes (source missing), the AQUA line built exactly your core law, step by step:

1. **SF0/SF1 genesis** (pass 2 and droplet/spawn fixes):
   - top-K candidate selection scored by η, η̇, curvature and slope;
   - **non-maximum suppression**, cooldowns, an edge no-spawn margin and fine-noise rejection;
   - **mode classification: whitecap / spill / plunge / slam**;
   - a candidate is a *crest leader* expanded into **ribbon parcels along the crest tangent** (`ribbonLength`, `ribbonSegments`);
   - **polarization/azimuth** per cell aligns the ribbon (pass 9).
2. **Two-threshold lifecycle** (BFT/WaveCanon pass). `prebreakThreshold` lets the heightfield *hold and stretch* a wave. `convertThreshold` sheds particles. `stretchLimit` sets the maximum coherent crest length.
3. **Carrier-wave energy drain.** Velocity is drained first, then a small negative displacement stamp around the emitter, so the heightfield can't keep all the energy *and* emit water.
4. **Cohesive ride window → yield.** Newborn sheet parcels ride the surface (position and horizontal inertia) for `rideTau`, then yield to full MLS-MPM when the timer expires or speed exceeds `yieldVelocity`.
5. **MLS-MPM state.** `J`, volume, a Tait EOS (`taitGamma`, `restDensity`), surface cohesion for low-density interface parcels, CFL substeps, pressure cap, edge sponge and corner damping.
6. **BFT canonicalizer.** Particles are *measurement samples*, and the heightfield receives *canonical events*:
   - *droplet* → a compact Mexican-hat ring;
   - *blob* → a broad parcel footprint;
   - *sheet* → an elongated slap from cluster covariance;
   - *pour* → a large compact footprint;
   - *rain* → cheap micro-agitation.

   Cluster energy scales sub-linearly with count. Rules: temporal latch (no repeated pumping), a **zero-mean footprint** (it can't drain the basin), a frame budget, per-cell caps and post-impact absorption.
7. **Ligament lifecycle rendering.** `sheet → ribbon → ligament → beaded ligament → satellite bead with tail → relaxed bead`:
   - MarchingCubes only for connected sheets;
   - velocity-stretched teardrop beads with tails for fragments;
   - Bézier/catenary tendrils with coherence gating;
   - rupture from stretch, relative speed and age (a Rayleigh/Weber proxy) with necking, bead insertion at pinch points and branching.
8. **Subsurface entrainment.** A canonical impact produces a bounded surface wave, an underwater velocity impulse, bubble parcels, soft plume clouds and surface foam patches on pop. Bubble coalescence and breakup proxies are included. The aftermath is visual; the energy stays bounded.
9. **Heightfield stability without killing waves:**
   - an anti-sandpaper spectral guard (8-neighbour checkerboard and centre-spike detection, projecting back to the resolved band);
   - a shape guard for folded crests;
   - a soft severity-aware amplitude limiter;
   - `v7core` with nearest filtering.
10. **Developer cockpit.** Live alerts (SANDPAPER MODE, FINE NOISE, EDGE INTERFERENCE, PARTICLE DUST, RUPTURE CLIFF, PARTICLE BUDGET), a 2D field drawer (height, energy, spawn, azimuth, stretch, noise), splash-off "HF Lab" mode, and Froude/submergence telemetry.

## Verdict

- **The launch semantics** (SF genesis with NMS, modes, crest ribbons, two thresholds, energy drain, ride window) and **the return semantics** (canonical BFT events, zero-mean footprints, budgets) are the most complete in the corpus. So is the **ligament lifecycle** vocabulary. They complement the JIT lab's *accounting* (ledger, events, admission and return by exact volume).
- **Sphere dynamics** (gptwaves-v7 via AQUA pass 5/8) is the champion rigid-body model for floating objects. THALASSA's bodies should adopt its planing, skim, slam and slope-slide terms on top of THALASSA's column buoyancy.
- **The wake** in this line (a curve-driven dipole) is weaker than heightfieldBEST's occupancy coupling. Use BEST.
- **The AQUA sources are missing.** If you want AQUA's exact implementation rather than its design, please send `pool.zip`, or the latest `aqua-react-splash-heightfield-mlsmpm` pass build (pass 13 and the subsurface pass 2).
