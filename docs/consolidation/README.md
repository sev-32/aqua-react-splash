# Water engine consolidation: start here

This folder is the single place that records **what the references are, what each one is the best at, where its code lives, how THALASSA compares, and what we build next.** Every session (human or AI) should read this first instead of digging through zips.

## The goal, in the user's words

> "This is no simple ocean engine. I have a very serious set of references that each individually show specific elements that are best, meant to consolidate into a whole that then gets further improved: the just-in-time splash system, the water visuals (refraction, Fresnel, reflection), the wave parameters, texture, detail and LOD, the foam system, the shallow water system."

> "The heightfield spawns the splash fluids. How well those are launched and coupled with the wave dynamics and shape is what needs to be perfected. heightfieldBEST shows an amazing realistic wake system: not faked wake parameters but a real reaction. We have good shallow water systems too, even with water able to pass over into new bodies. We have everything; it needs tweaks to perfect."

## Index

| Document | What it answers |
|---|---|
| [`REFERENCE_MAP.md`](REFERENCE_MAP.md) | The champion (best reference) for each of 22 capabilities, where its code is, what to carry, and THALASSA's status |
| [`CORE_LAW.md`](CORE_LAW.md) | The design of the heightfield ⇄ splash loop: where water leaves, how much, how fast, what shape, how it releases, breaks up and returns. Champion mechanisms plus proposed improvements, each with an acceptance test |
| [`PLAN.md`](PLAN.md) | Stages P0–P8 for the local detail layer ("magic carpet"), matched test scenes S1–S8, and the decisions needed from you |
| [`INVENTORY.md`](INVENTORY.md) + `inventory.csv` | Every file received (hashed), duplicates, what runs here, and what's still missing |
| [`references/heightfieldBEST.md`](references/heightfieldBEST.md) | Why BEST's wake is real (occupancy + flux blocking); measured tows; its dormant splash stage; limits (no dispersion, checkerboards) |
| [`references/jit-lineage.md`](references/jit-lineage.md) | jit_infinite → JIT-Splash M1 → M2 → M3 → M4 → Developer Lab R1–R22: the accounted splash chain, step by step |
| [`references/aqua-line.md`](references/aqua-line.md) | This repo's pool → MinimalWaves/gptwaves (sphere dynamics) → jit_infinite → AQUA passes 1–13 (SF genesis, ride window, canonical BFT, ligament lifecycle, subsurface air) |
| [`references/particles4all.md`](references/particles4all.md) | PBF with surface tension at 2 cm on the GPU: the detached-liquid realism champion |
| [`references/hybridsplash.md`](references/hybridsplash.md) | ≈127 WebGPU builds: nearshore NSWE, breaking, longshore, infiltration, overtopping film, foam as material; the relationship audit |
| [`references/ocean-visual-atmosphere.md`](references/ocean-visual-atmosphere.md) | POSEIDON, Nimbus, Archipelago, Foam Foundry, WaveLab, T4R, HydroLab, "Splash" |
| [`references/thalassa.md`](references/thalassa.md) | THALASSA's honest scorecard against every champion |

## Findings at a glance

1. **THALASSA owns the far field** at or above champion level: POSEIDON ocean and optics, Nimbus sky, globe to orbit. **Everything local is below the floor.** That's exactly the "high detail only where needed" layer, the magic carpet.
2. **The wake:** heightfieldBEST's body is a time-varying *occupancy* of the water columns that **blocks the flux**, so water has to go around, pile up and fall in. That's the real reaction.
   - Its solver is non-dispersive, so in deep water it can't make Kelvin wakes. Measured: a correct Mach V at supercritical speed, a swell dome at subcritical speed.
   - THALASSA's eWave tiles have exact dispersion but no blocking.
   - **Combine them.**
3. **The splash, in three complementary halves:**
   - the JIT lab has the *accounting* (finite events, exact volume debit/credit, work-bounded launch, temporal ribbons, zero-impulse return);
   - AQUA has the *launch and return semantics* (crest-leader ribbons, whitecap/spill/plunge/slam, two thresholds, ride window, canonical impact footprints, ligament lifecycle, subsurface air);
   - Particles4All has the *detached-liquid realism* (surface tension at 2 cm on the GPU).

   The splash carriers in both the lab and THALASSA are far too coarse (10.7 cm and 32 cm). That's why splashes look chunky or puffy.
4. **Nearshore:** HybridSplash v43 has the richest physics terms: breaking γ(bed slope) with roller viscosity, longshore current, settled-water infiltration, swash apex foam, and hard-edge film for overtopping. THALASSA's T2 has the better numerics (HLL, well-balanced, no checkerboards). **Combine them.**
5. **heightfieldBEST's own splash stage never fires at defaults.** Its candidate volume peaks at 0.0005 m³ against a 0.0009 threshold. jit_infinite's header independently found and fixed the same unit error.

## Working agreement

- Name the champion before building. Capture it unmodified in the matched scene. Build. Compare side by side. Never drop below it.
- Physics acceptance numbers and visual comparison are both required; one does not stand in for the other.
- Update these docs in the same commit as the code.
- Reference sources stay out of this public repo until you choose where they should live (`PLAN.md`, decision 1).
