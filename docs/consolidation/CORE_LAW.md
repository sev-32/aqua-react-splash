# The core law: the heightfield carries the water until it can't, then hands the excess to particles and takes it back

> "The heightfield spawns the splash fluids. How well those are launched and coupled with the wave dynamics and shape is what needs to be perfected. The hardest aspects are solved by one another: get great waves and reactions, then solve splash and realistic effects only where needed, and the heightfield can spawn those." — the user

This document is the design for that loop. Each part names **where the best existing mechanism comes from** (champion). Each part marked **[new]** is a proposed improvement beyond the references. Every part has an acceptance test.

```text
 FFT ocean (POSEIDON)          Carpet (moves with the body)             Detached liquid (in the carpet)
 ────────────────────          ────────────────────────────             ───────────────────────────────
 η_ocean, u_orbital  ──►  η_total = η_ocean + δ_carpet
                          occupancy σ + the hull's hold (BEST) §2 detect ─►  §3 launch (ledger debit)
                          waves: exact dispersion (eWave)                     §4 ride → release
                          breaking: spill + mix (no hose)                     §5 particles 1–3 cm
                          §1                                   ◄── §6 return (footprints, zero-mean)
                                                               ──► air → bubbles → foam (§6b)
                          §7 one optical chain (POSEIDON) for surface, sheet, droplets
```

## 0. Invariants (non-negotiable)

1. **One water truth.** Every cubic metre is owned by exactly one representation at a time: a heightfield column, a carrier/particle set, or a body film. Foam and bubbles are *material*, not water. Every transfer goes through a ledger (debit here, credit there, one ID). *Champion: JIT lab `JitCoupling` + `SplashEventController` (residual ≈ 1e-12 m³); Lab R21 film ledger (1e-20 m³).*
2. **Water only leaves where the heightfield can't represent its motion.** Never from a slope, height or timer alone. *Champions: THALASSA representability limiter; AQUA two-threshold lifecycle; JIT detachment.*
3. **Launch inherits the water's own state.** Position on the actual surface. Velocity equal to the *material* surface velocity, plus impulses paid for by a body's work. No random velocities, no random classes. *Champions: JIT admission (u, w, work-bounded kick); THALASSA Froude/Wagner entry.*
4. **The detached solver is resolution-independent of the heightfield.** Splash particles are 1–3 cm, whatever the carpet cell size. *Champion: Particles4All (2 cm PBF + surface tension).*
5. **Return is physical.** Volume goes back to the columns under a normalised footprint. Momentum and energy split into a wave pulse (zero net impulse) and dissipation, and entrained air becomes bubbles. *Champions: JIT `returnParticle`; AQUA canonical BFT events.*
6. **Everything is observable.** Each stage publishes fields and counters to a live cockpit. *Champion: AQUA developer cockpit; Lab inspector.*

## 1. The carrier: a carpet that reacts like heightfieldBEST and propagates like the real sea

**As built in P1** (details, numbers and images: `P1_CARPET.md`). The plan below proposed an occupancy SWE bulk with Brinkman penalisation plus a dispersive split. Working the equations through gave a simpler route with the same reaction, built on THALASSA's eWave tiles:

**1a. Body → water by occupancy and the hull's hold** (*champion: heightfieldBEST*, see `references/heightfieldBEST.md`).
- Per column, solid occupancy σ = the wet solid below the open-ocean surface, from THALASSA's shared hull functions, band-limited, and swept by substeps with interpolated poses. BEST's source form is kept: `η += Δσ` (volume-exact; η is water + solid).
- **The hold replaces BEST's blocking and push ring.** Where the body pierces the surface (fraction χ), the free surface must follow the hull (linear flat-ship theory), i.e. η = 0 there. A stiff penalty pressure `g·κ·χ·η` on φ enforces it, κ ≈ 100 (converged), with a φ damper under the hull. The displaced water has to go around the body; waves reflect off it.
- **Why not Brinkman on face velocities:** in a potential-flow surface model, no-penetration *is* the surface following the hull. Penalising η directly is the same condition without a staggered velocity field. Front compression, shoulder flow and the stern hollow come out of it, not from 0.95 / 0.34 / 0.18.
- **Equivalence:** with η_s = η − σ, the source form is Havelock's moving hydrostatic pressure patch. The old T3 source was therefore already a classical wake model, but a transparent one. The hold is exactly what it lacked.
- **Void collapse** follows from continuity: the hole a withdrawing body leaves (Δσ < 0) is no longer held, so the sea falls into it.

**1b. Numerics.** The carpet is spectral (exact rotation per wavenumber), so the odd–even modes that forced BEST's anti-grid blur can't arise. The only grid-scale risk is the stiffened footprint, which the φ damper removes (energy above half-Nyquist 4–10× lower). Substeps are chosen so κ is stable (`κ < 1.44/(g·K_max·Δt²) − 1`) and no body moves more than half a cell per substep (`sim/carpetParams.ts`).

**1c. Dispersion.** Exact: `ω² = gk·tanh(kH)(1 + σk²/ρg)` for every wavelength, carried by the eWave rotation. The Jeschke & Wojtan bulk/surface split is **not needed for the reaction**: the hold supplies the near field, and the dispersion is exact at all scales. It stays the route for orbital advection and nonlinear bulk flow if captures ask for them (P1b).

**Acceptance (restated after measuring; results in `P1_CARPET.md`):**
- S1 tow parity with BEST's geometry: bow pile-up, hollow behind, volume-exact.
  - Supercritical: **99 % of the wake energy inside the Mach wedge `asin(√(gH)/U)` + 3°**. BEST's single sharp V at the Mach angle is the non-dispersive limit. In real water only the long waves travel at √(gH), so a body as wide as the water is deep also shows narrower dispersive arms *inside* the wedge.
- Deep-water subcritical tow: transverse wavelength `2πU²/g ± 5 %`. The Kelvin arm (envelope maximum) must approach 19.47° with distance: the Airy peak lies inside the caustic by ∝ s^−2/3. Target ±1.5° at 14–20 m.
- Compare against WaveLab's analytic Kelvin overlay (`references/ocean-visual-atmosphere.md`).
- Drop: a ring with the correct dispersive group speed.

**1d. Riding the ocean** (*champions: HybridSplash layer contract; Lab R21–R22 page*).
- `η_total = η_ocean + δ_carpet`. The FFT ocean keeps owning the swell. The carpet owns only the residual caused by bodies and releases.
- **[new] The carpet's mass equation subtracts the ocean's own `∂η_ocean/∂t` inside the carpet**, as HybridSplash's nearshore correction does. Body motion is taken *relative to the orbital velocity* (THALASSA already computes relative drag this way).
- The page follows the body in exact whole-cell shifts (Lab R21: strip exchange accounted), with absorbing rims (jit_infinite: graded absorber) and world hydro memory for cells revisited (Lab R22).

**Acceptance:**
- a body at rest on a swell gives zero residual drift;
- recentering causes no visible seam or pop (a temporal crop metric);
- volume residual stays below 1e-6 of carpet volume across ten traversals.

## 2. Where water leaves: detection

Combine the strongest signals. Each is a physical quantity, not a gain:

| Signal | Meaning | Champion |
|---|---|---|
| Representability excess `max(0, η − (min_nbr + s_max·Δx))` | The grid literally can't hold this crest. Since P1 the carpet *spills* this excess to the neighbour (volume exact) and mixes the flow across the edge: breaking as dissipation. Removing it as spray every step while its momentum stays drained the sea (43 m³ in 1.3 s at 4.5 m/s). The excess is the **budget signal** for a finite launch event, not a per-step release. | THALASSA limiter |
| **[new] Kinematic breaking ratio `B = u_s / c_crest`** | Surface particle speed vs crest speed. Onset near **B ≈ 0.85** (Barthelemy et al. 2018), valid in deep and intermediate depth. `u_s` = bulk velocity + ocean orbital velocity at the surface. `c_crest` = local phase speed from the dispersion relation at the local dominant wavenumber. | new (replaces slope × rise heuristics) |
| Material vertical velocity `w = η_t + u·∇η` and flow-map compression `J = det(I + τ∇u) < 1` | Rising, converging water | JIT lab `candidates()` |
| Depth-limited breaking `η/D > γ(bed slope)`, `Fr > 0.95` | Shoaling breakers (spilling vs plunging) | HybridSplash v43 `WG_HF` |
| Plunge phase clock travelling with the front, lip momentum | Mature plunging lip | WaveLab v50 |
| Waterline impact ring × approach/descent speed; Wagner spray-root speed | Body entry and slam | JIT lab; THALASSA Froude/Wagner |

**Lifecycle** (*champion: AQUA two thresholds + JIT events*):
- `prebreak` (B ≥ 0.85, or excess > 0): the carpet *holds and stretches* the crest. The lip momentum displaces the rendered crest forward (WaveLab), so the heightfield itself shows the pitch.
- `convert` (excess persists ≥ 22 ms, the JIT persistence, or B keeps rising): a finite **event** is born. Its budget is frozen at birth (the representability excess), with hysteresis, cooldown, connected patches and stable IDs.
- **Non-maximum suppression and crest leaders** (AQUA): one event per crest segment, oriented by the crest tangent and polarisation.

**Acceptance:**
- a calm or linear sea at steepness ≤ 0.08 never emits;
- a sustained breaker gives a bounded event rate (no hose);
- emission happens *at* the crest front, not behind it (frame-by-frame capture);
- breaking-onset B stays within [0.8, 0.9] across three seeded wave groups.

## 3. What leaves: volume, momentum, shape

- **Volume** = the event's budget. It is debited from the exact columns (JIT `admit`) as the representability excess, not a fixed layer. For body entry it's the Froude-limited jet flux `Q(1 − √(ga)/U)` plus the open-cavity feed (THALASSA).
- **Momentum** = the *material* surface velocity at the release point: horizontal from bulk + orbital, vertical `w`. For plunging lips use the lip momentum ("the top keeps its speed", WaveLab). For bodies add an impulse from the body's work budget: JIT's `0.35·½ρV_displaced|U|²`, solved exactly for the kick magnitude.
- **Shape** = a **crest ribbon** along the crest tangent, several parcels wide in the normal direction (AQUA crest leaders). Successive releases of the same event join into **temporal ribbons** (JIT `makeSkin`). The sheet is born connected.
- **Energy bridge.** The carrier loses the launched momentum (velocity first, then the volume stamp; AQUA drain + JIT debit). **[new] Record launched KE + PE against the carrier's energy drop** as a cockpit residual.

**Acceptance:**
- ledger residual below 1e-9 m³ per event;
- launched momentum equals carrier momentum loss within 1 %;
- a crown or bow sheet appears as a connected sheet in the first 50 ms, not as beads.

## 4. Ride → release (the sheet leaves the crest by physics, not by a timer)

AQUA's cohesive ride window and HybridSplash's riding phase (a spring to the surface for 0.35 s) are the right *behaviour* with the wrong *trigger* (a timer).
- **[new] Release when the surface can no longer bend the sheet:** a parcel moving at speed `v` along a surface of curvature `κ` needs a normal acceleration `v²κ`. Gravity plus capillary pressure supplies at most `g·n_y + σκ/(ρ t)`, where `t` is the sheet thickness. When `v²κ` exceeds that, the sheet separates. This is the teapot/Coandă criterion.
- Release also when the carrier surface drops away faster than the parcel (THALASSA's ballistic-separation limiter).
- While attached, the sheet is **rendered as part of the heightfield surface** (a displaced lip). The seam between surface and splash disappears. That was the M5 complaint: "like different shaders cropped together".

**Acceptance:**
- a spilling breaker keeps its sheet attached; a plunging lip releases at pitch;
- a slow drag keeps the water attached, a fast drag throws a sheet;
- no visible seam at release in a close-up temporal crop.

## 5. The detached liquid (1–3 cm, GPU, surface tension)

- **Solver:** PBF with Akinci surface tension (Particles4All) *or* MLS-MPM with a cohesive EOS (small negative pressure allowed; HybridSplash GPU MPM and "Splash" as implementation bases). **Decide by side-by-side test** in matched scenes (drop, tow, plunge). The method matters less than the result.
- **Carriers split into fine particles.** A ledger carrier of volume V (the carpet cell scale) becomes `N = V/v_p` fine particles laid out on the ribbon sheet, with thickness `t = V/A`. Their volumes sum back into the same ledger ID on return.
- **[new] Breakup by physics time scales**, not age:
  - thin-sheet rims retract at Taylor–Culick `v = √(2σ/(ρ t))`;
  - ligaments break at the Rayleigh–Plateau wavelength `≈ 9r` within `≈ 2.9 √(ρ r³/σ)`;
  - droplets form when the local Weber number exceeds ~10 relative to the air (THALASSA already atomises spray this way).

  Surface tension resolves the cm-scale ligaments (P4A). Sub-particle breakup uses these scales, rendered with AQUA's lifecycle vocabulary (sheet → ribbon → ligament → beads with tails → relaxed bead).
- **Wind** acts on spray at spray height (0.85·U10, log profile; THALASSA).

**Acceptance:**
- a sphere drop at 2 m/s shows a crown with a rim, ligaments and satellite drops in the right order over 0.2 s;
- tendrils visible at 1–3 cm;
- ≥ 30 k particles within budget on a mid-range GPU (to be measured on hardware);
- no particle overwrites (the JIT capacity rule: allocation failure leaves water attached).

## 6. Return, air and foam

- **Return** (*JIT*):
  - detect the moving-interface crossing with relative velocity;
  - put the volume into a normalised footprint;
  - mix horizontal momentum by liquid mass;
  - send a fraction of vertical KE into a **radial pulse with zero net impulse**; the rest is dissipation.
- **Footprint vocabulary** (*AQUA canonical BFT*):
  - droplet → compact ring;
  - blob → broad footprint;
  - sheet → anisotropic slap (cluster covariance);
  - pour → large compact footprint;
  - rain → micro-agitation.

  Rules: **zero-mean** footprints, temporal latch, frame budget, per-cell caps. Energy scales sub-linearly with count.
- **6b. Air** (*AQUA subsurface + Foam Foundry*):
  - impact events entrain air by regime;
  - explicit bubbles plus soft plume clouds;
  - buoyant rise;
  - **surfacing → foam** as a material (Foundry's extensive storage);
  - **fresh-aeration turquoise glow** only for recent events.

**Acceptance:**
- a single drop leaves a clean ring;
- a sheet slap leaves an elongated footprint;
- a dense spray field gives agitation, not a thousand rings;
- a basin never drifts in mean level;
- a plume surfaces into foam within 1–3 s.

## 7. One optical chain

The carpet surface, the attached lip, sheets and droplets all use **the same POSEIDON optics** (Fresnel, refraction, volumetric transparency, underwater branch) and the same sun and sky (Nimbus). The splash surface comes from **anisotropic screen-space fluid with the narrow-range filter** (P4A), carrying THALASSA's physical thickness, film Fresnel and sun opacity shadow map. Whitewater and clouds are classified by coherence (THALASSA two-stream spray).

## 8. Telemetry

Published every frame:
- representability excess, B field, detachment, events (born / active / exhausted);
- ledger (heightfield, carriers, film, escaped, residual);
- launch momentum and energy residual, release count by criterion;
- particle count and breakup stats (sheets / ligaments / drops);
- return footprints by class, bubbles and foam mass;
- a checkerboard/spike alarm;
- carpet recenter receipts;
- body Froude, submergence, planing/slam forces.

Rendered as AQUA-style alerts and a 2D field drawer (height, B, excess, detachment, azimuth, foam).
