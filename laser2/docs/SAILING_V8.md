# Sailing Foundry V8 — free sailing, capsize and crew recovery

V8 turns the anchored rig lab into a boat that sails on a physical sea, can
capsize (and turtle), and is recovered by its crew: they fall in, swim to the
centreboard, right the boat by hanging on and standing on the board, scoop the
second crew aboard and climb back in. The Foundry's lighting authorities are
unchanged; water, hydrodynamics, crew behaviour and the scene pipeline are new
native authorities installed only in `sailing` mode.

Sailing is the default mode. `?mode=inspect` opens the static lighting
foundry, `?mode=anchored` the anchored rig lab (both unchanged from V7).

## Authorities

| Authority | Module | Role |
|---|---|---|
| Sailing mode | `sailing/SailingModeSystem.ts` | Installs/uninstalls the sailing authorities on mode change; releases the kinematic anchor. |
| Step bus | `sailing/PhysicsStepBus.ts` | Wraps the legacy XPBD `world.step` so native authorities run before/after every 1/60 s step. |
| Ocean | `water/OceanSystem.ts`, `OceanSpectrum.ts`, `OceanWaveField.ts` | JONSWAP directional sea (wind sea + swell) as Gerstner components; the one water model every physics consumer queries. |
| Hull physics | `sailing/SailingPhysicsSystem.ts`, `HullGeometry.ts`, `HullHydrostatics.ts`, `FoilModel.ts` | Closed-mesh pressure integration at any attitude, strip-theory foils, composite mass model. |
| Sail in water | `sailing/SailWaterSystem.ts` | Sheet hydrodynamics of sailcloth in the water. |
| Rig structure | `sailing/RigStructureSystem.ts`, `RigStructureSolver.ts`, `SparseLDL.ts` | Mast, spreaders, standing rig, jib luff and boom solved as one direct XPBD block; dock tune of the rig tension. |
| Crew | `crew/CrewRecoverySystem.ts`, `SwimmerBody.ts`, `CrewPoseSynth.ts` | Balance, trim, capsize behaviour, swimming, righting, scoop, re-boarding, poses. |
| Crew body | `crew/lucid/LucidCrewSystem.ts`, `LucidRetarget.ts`, `LucidKinematics.ts`, `LucidAsset.ts` | The LUCID female-skin-v4.2 body (canonical Skin78 skin) drawn for both crew members from the crew poses. |
| Ocean surface | `water/WaterSurfaceSystem.ts`, `WaterShaders.ts` | Rendered sea using the physics wave components. |
| Water interaction | `water/WaterInteractionSystem.ts`, `WaterInteractionShaders.ts` | GPU wake / ripple / foam solver around the boat. |
| Scene pipeline | `render/ScenePipeline.ts` | HDR scene pass, composite and water pass inside RenderSystem's render boundary. |
| Sailing UI | `ui/SailingHudSystem.ts`, `inspection/CameraControllerSystem.ts` | HUD, controls, follow/chase/crew cameras. |

## Sea

`OceanSpectrum` builds a JONSWAP spectrum from the 10 m wind and fetch
(default 6 km) with a cos^2s directional spread plus a low swell. The
physics set (energy-weighted bins) drives everything that floats; a detail
set of shorter components is added only to the rendered surface.
Significant height follows from the spectrum (Hs ≈ 0.28 m at 12 kn over 6 km).
Changing the wind cross-fades the old and new sea over 9 s.

`OceanWaveField` evaluates the Gerstner surface on an 80 × 80 Eulerian grid
(0.28 m) around the boat. Each step builds a Lagrangian grid with separable
phases and inverts the Gerstner map (three fixed-point iterations) so height
and orbital velocity at a fixed world point are exact; two time slices are
blended across the XPBD sub-steps. The legacy water object's `height`,
`velocity` and `setSea` are redirected here, so the V16 spars, ropes and
sheets float on the same sea.

## Hull

`HullGeometry` generates the Laser 2 hull as a closed triangle mesh (shell,
deck with an open cockpit recess, transom) and a signed-distance function used
for crew contact. `HullHydrostatics` integrates the water pressure over every
submerged triangle (clipped at the local wave surface) — buoyancy and centre of
buoyancy are therefore exact at any heel, including a hull on its side or
upside down. Dynamic terms: Kerner-style pressure/suction drag on the relative
normal velocity (longitudinally attenuated for the streamlined surge
direction), ITTC-57 skin friction, windage on the dry area, and an empirical
residuary (wave-making) term for a normally floating hull. Centreboard and
rudder are strip-theory foils with stall. The rigid body's mass and inertia
are the composite of laminate, foils and the crew carried by the hull; the
gravity moment is applied at the composite centre of gravity.

Verified (`tests/cpu/hull-hydrostatics.test.mjs`): the hull-only GZ curve is
positive to ~108° and the inverted hull is stable (a turtled Laser 2 needs a
crew to recover it).

## Rig structure

The V16/V17 rig models the mast as a 24-node Euler–Bernoulli beam (V16 EI
profile: 7800 N·m² lower, 3600 N·m² upper section, sleeve joint, fore-aft
factor 1.35) held by routed shrouds over swept spreaders, diamonds and the jib
halyard/luff wire. Solved with Gauss–Seidel XPBD (12 sub-steps × 6
iterations) that structure never converged: stiffness travels one node per
iteration, so a 100 N masthead load bent the mast 0.73 m instead of ~0.1 m,
the pretension never built (shrouds read 0–75 N instead of 450 N) and the
jib luff sagged. `RigStructureSolver` gathers the load-bearing members —
mast foot pin, mast stretch and two-plane bending, spreader sockets, routed
shrouds, diamonds, safety forestay, jib halyard over its sheave, jib luff wire
and tack, gooseneck, boom stretch and bending, vang (109 rows, 42 nodes) —
into one XPBD block and solves it exactly with a sparse LDLᵀ factorisation
of J·W·Jᵀ + α̃ (greedy minimum-degree ordering, precompiled update schedule,
938 non-zeros). Tension-only members use a lagged active set; the hull is an
external rigid body whose generalised inverse mass enters the diagonal and
which receives its share of every correction as an impulse. Sails, sheets,
contacts and crew stay in the Gauss–Seidel loop, which now sees a structure
that behaves like the real one. The block is solved on every second
Gauss–Seidel iteration (always including the last).

Measured (anchored, calm): 100 N at the masthead now bends the tip 0.09 m
with the hounds moving 3 mm (was 0.73 m / 0.39 m); both shrouds stay taut
under load (≈570/340 N).

**Dock tune.** The rest lengths the legacy scripts measured after the rig had
already moved left the as-built rig slack. At install the shroud, diamond and
halyard lengths are re-derived from the design geometry (straight mast on its
step): the shrouds carry the V16 standing pretension (450 N), the halyard is
taken up until the luff tension balances their fore-and-aft moment about the
step (453 N computed), the diamonds keep their 310 N. At rest in calm air the
rig now reads ≈500–540 N per shroud and ≈290 N on the luff.

**Gooseneck.** The boom hangs on a fitting 45 mm aft of the mast axis; the
main tack lashing is tension-only (the legacy 60 mm rigid bar fought the luff
track with ~3 kN once the gooseneck was solved exactly).

**Jib lead.** The jib sheets lead to the side-deck track fairleads where the
V16 rope hardware draws them (±0.42 m, 2.65 m from the transom), just forward
of the low clew, so the sheet holds the leech; full scope brings the clew onto
the fairlead line (~15° sheeting angle). The legacy lead (0.95 m aft of the
clew, working sheet ≥ 0.98 m) held the clew ~30° off the centreline and the
jib luffed at any apparent wind under ~40°.

Verified (`tests/cpu/rig-structure.test.mjs`): the sparse factorisation is
exact on a chain-with-loops system, and a clamped 20-segment beam matches the
Euler–Bernoulli cantilever deflection within 1%.

## Sail in the water

The V16 rig floated submerged cloth on a stiff depth spring with a capped
isotropic drag. `SailWaterSystem` replaces it while sailing (V16 param
`externalClothWater`): per cloth triangle, per sub-step, normal pressure drag
½ρ·Cn·A·|w_n|w_n (Cn 1.28, 2.4 while the sheet is peeled upwards out of the
water), two-sided skin friction, Dacron buoyancy (net sinking), and the wind
load removed from cloth under the surface. Quadratic drags are integrated
implicitly so the ~16 g cloth particles stay stable. Water retained by a sail
lifted out of the sea (0.4 kg/m², half-life 1.2 s) is added to the particle
masses. A capsized boat now lies with its rig as a sea anchor and drifts at
0.1–0.3 m/s; the righting crew has to peel the sail out of the water.

## Crew

Both sailors keep the legacy biomechanics while seated and hiking. The crew
authority adds:

- balance: hike command from heel and heel rate, inboard/leeward seating in
  light air, trapeze for the crew when fully hiked;
- trim assist (HUD `TRIM`): each sheet is worked to the telltales — the
  signed angle of attack of the apparent flow on the chord at ~40 % height
  (targets 14° main, 12° jib), easing faster than trimming in — the vang is
  firm on the wind and eased on a run, and the main is eased in gusts beyond
  what full hiking can hold; any W/S or Q/E key press overrides;
- capsize: sheets released, bracing, then either a **dry capsize** (the helm
  steps over the high gunwale onto the centreboard; HUD `DRY`) or falling in;
  in a leeward capsize the crew drops into the flooded cockpit holding the toe
  strap (scoop position);
- in the water each sailor is a buoyant `SwimmerBody` point mass integrated in
  the XPBD sub-steps: buoyancy from the immersed body volume, drag, stroke
  thrust, treading support, hull and spar contact, and tension-only grip
  lines to the board tip, toe strap or gunwale drawn in at a human pace;
- the helm closes with the hull, works along it hand over hand, round the
  transom to the centreboard, hangs on the tip, climbs onto the board and
  leans back (U key: heave harder). The weight on the board is a carried mass
  at its real lever, so the boat comes up by physics, not animation;
- turtle: the righter climbs onto the upturned hull and pulls the board until
  the boat is on its side, then continues from the board;
- scoop: as the boat rises the low gunwale sinks beneath the floating crew,
  who is carried in over it and kneels on the sole opposite the helm;
- re-boarding over the gunwale with the other sailor counter-balancing, then
  control returns to the legacy seated biomechanics.

Poses outside the seated states are synthesised by `CrewPoseSynth` (swimming
stroke, treading, hanging, standing and leaning on the board, climbing in,
scoop float) and blended at transitions.

**Knockdown (O key, HUD CAPSIZE).** A squall builds the wind to 1.9× over
0.7 s and holds until the boat is past 75° of heel (or 12 s). The crew is
caught sitting in with the sheets held; on the wind the helm bears away to a
beam reach, on a broad course the helm luffs into it. From close-hauled at
12 kn the boat is over in ~4 s.

Typical timings at 12–14 kn: dry capsize recovery ~11 s; falling in and
swimming round to the board ~20–30 s from capsize to both sailing again.

### Crew body: LUCID female-skin-v4.2

Both crew members are drawn as the canonical LUCID female body
(female-skin-v4.2, 14,164 vertices, 78 Skin78 clusters, Semantic51 skeleton,
from the LUCID Biomechanical Causal Rig R1.5 package). The legacy procedural
bodies are hidden; the crew behaviour above keeps producing the joint targets:

1. `LucidRetarget` turns them into lawful Semantic51 and hand-layer angles:
   pelvis and trunk as deltas from the legacy rest (neutral in → neutral
   out), two-bone IK for arms and legs from her own shoulders and hips to the
   legacy wrist/ankle targets, then a joint-limited Levenberg–Marquardt
   upper-body IK over trunk, clavicles, shoulders and elbows (projected on
   the causal body graph's hard ranges) so the hands reach the tiller
   extension, sheets and board with the trunk and shoulder girdle doing what
   a sailor's do. Fingers use the declared hand layer's grip synergy
   (curl/spread/opposition) by task.
2. `LucidKinematics` re-implements the Semantic51 forward kinematics and the
   canonical helper-cluster rules (drivers.py `_canonical`); the vertex
   shader applies linear blend skinning with the canonical weights (≤ 8
   influences, canonical weight-sum division). Nothing edits weights, helper
   rules or the mesh. `tests/cpu/lucid-crew.test.mjs` checks the TypeScript
   path against poses compiled by the LUCID package itself: joints within
   2·10⁻¹² m, skinned vertices within 10⁻⁷ m.
3. The legacy crew IK is given her segment lengths (her legs match the old
   sailors; her arms and torso are shorter), so contacts stay consistent.
4. Sailing kit is painted onto the unchanged skin by region (wetsuit with
   accent yoke and leg stripes, boots, short-finger gloves, a wet clearcoat
   after immersion); a buoyancy aid shell is built from her own torso surface
   (offset, Taubin-smoothed, flat front panel) and a hair shell and bun from
   her scalp, all skinned with the same canonical weights.

The body asset is **not in this repository** (the repository is public; the
character is the owner's). Build it locally from the LUCID package:

    python3 tools/build_lucid_crew_asset.py <LUCID_BIOMECH_CAUSAL_RIG_R1 dir>
    python3 tools/lucid_parity_reference.py <LUCID_BIOMECH_CAUSAL_RIG_R1 dir>

which writes `public/assets/lucid/` (git-ignored; the delivery zip includes
it). Without it the legacy procedural crew is drawn.

## Rendering

`gl.getError()` is a synchronous round trip to the GPU process; the telemetry
used to call it after every frame-graph phase. GL errors are sticky until
read, so they are now sampled at every 30th frame end (`?glcheck=frame` for
every frame, `?glcheck=phase` for the old per-phase attribution); runtime,
init and explicit verification checks always read.

`ScenePipeline` renders, inside RenderSystem's exclusive render boundary:

0. the water-interaction solver passes;
1. the legacy scene (sky, boat, rig, crew) scene-linear into a 4× MSAA
   RGBA16F target with a 32-bit depth texture;
2. a full-screen composite that tone-maps once (renderer ACES) and writes
   the resolved depth;
3. the ocean surface, depth-tested against the composite.

The ocean surface is a camera-centred radial grid (~54k vertices, 7.5 cm at
the centre growing geometrically to kilometres, then a horizon skirt) that
evaluates the same components as the physics, filtered per vertex spacing and
per pixel footprint. Shading: exact dielectric Fresnel, reflection of the
atmosphere LUT, GGX sun glitter whose roughness includes the unresolved slope
variance, sun shadow from the Foundry shadow map, depth-aware refraction of
the HDR scene with Beer–Lambert absorption, daylight attenuation on submerged
geometry, water-leaving radiance from the inherent optical properties
(remote-sensing reflectance, Lee et al. 1999), whitecaps from the Gerstner
Jacobian, and the Foundry's aerial-perspective law. The sky is rendered
scene-linear in this pipeline, scaled to reproduce the V7 sky within ~3/255.

## Water interaction (wakes, ripples, foam)

A 256² (Balanced) – 512² (High/Reference) grid over 48–64 m follows the boat.
Each simulated step:

1. the physics hull envelope, swimmers and mast/boom tubes are rasterised
   from below into a min/max height map;
2. the free surface (h, φ) is transformed with a GPU Stockham FFT, every
   mode is propagated exactly for deep water (ω² = g|k|) and transformed
   back — dispersion is exact, so Kelvin wake angles, transverse/divergent
   systems and ripple group speeds are right at any boat speed;
3. bodies piercing the surface press on it with the hydrostatic pressure of
   their immersion (moving-pressure ship-wave model), measured against the
   exact physics sea from the CPU grid; swimmers' strokes add impulses;
4. foam is generated where bodies drive into the surface (bow at speed,
   slamming), lift out of it (transom, a sail peeling out), where interaction
   waves steepen past breaking, and at strokes; it stays in place in the
   world and decays (half-life 3.2 s).

The ocean shader adds the interaction height, slope and foam on top of the
Gerstner sea.

## Controls

| Key | Action |
|---|---|
| A/D, ←/→ | tiller |
| W/S | mainsheet in / out |
| Q/E | jib sheet in / out |
| X or Shift / Z | hike out / in |
| C | trapeze |
| O | knockdown gust (capsize to leeward) |
| U (hold) | righter leans back harder on the board |
| I | toggle automatic crew recovery |
| V | camera: follow / chase / crew |
| N | reset |

HUD buttons: CAPSIZE, AUTO (recovery), DRY (dry capsize), TRIM, CAMERA,
WIND −/+, RESET.

## Exact boundary

- The crew's recovery is a behaviour state machine driving physical bodies;
  the swimmer is a point mass with a synthesised pose, not an articulated
  ragdoll, and hands/feet are not individually constrained to the hull.
- The LUCID body is posed kinematically from the crew targets through its
  lawful Semantic51 envelope; its muscle-driven physics body (MuJoCo) is not
  run in the browser. The Semantic51 shoulder adduction limit (−40° from the
  A-pose, an open LUCID owner decision) is respected, so reaches across the
  body are made with trunk rotation and the shoulder girdle; hand targets can
  miss by a few centimetres where the envelope does not reach.
- Sails, sheets and contacts are still Gauss–Seidel; only the rig structure
  is solved directly. Upwind speed is still below a real Laser 2 (≈3.8 kn at
  45° TWA in 12 kn): sail twist from the strip aerodynamics and leech
  tension remain the limiting factors.
- The rendered water surface is a height field: no overturning breakers,
  no spray particles; cockpit flooding is not simulated as a separate water
  volume (hydrostatics treats the cockpit as open to the sea).
- Wake amplitudes follow linear theory for a pressure patch equal to the hull
  immersion; there is no nonlinear bow-wave breaking or planing spray sheet.
- Refraction samples the scene without the ocean itself; sail windows seen
  against the sea show the sky behind instead of the water.
- Sail cloth added mass (the water accelerated with a sheet) is represented
  only through drag and the retained film.
