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
| Crew | `crew/CrewRecoverySystem.ts`, `SwimmerBody.ts`, `CrewPoseSynth.ts` | Balance, trim, capsize behaviour, swimming, righting, scoop, re-boarding, poses. |
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
- trim assist (HUD `TRIM`): main and jib set for the apparent wind angle and
  the main eased in gusts beyond what full hiking can hold; any W/S or Q/E
  key press overrides;
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

Poses outside the seated states are synthesised by `CrewPoseSynth` on the same
skinned ProceduralHuman (swimming stroke, treading, hanging, standing and
leaning on the board, climbing in, scoop float) and blended at transitions.

Typical timings at 12–14 kn: dry capsize recovery ~11 s; falling in and
swimming round to the board ~20–24 s from capsize to both sailing again.

## Rendering

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
- The rendered water surface is a height field: no overturning breakers,
  no spray particles; cockpit flooding is not simulated as a separate water
  volume (hydrostatics treats the cockpit as open to the sea).
- Wake amplitudes follow linear theory for a pressure patch equal to the hull
  immersion; there is no nonlinear bow-wave breaking or planing spray sheet.
- Refraction samples the scene without the ocean itself; sail windows seen
  against the sea show the sky behind instead of the water.
- Sail cloth added mass (the water accelerated with a sheet) is represented
  only through drag and the retained film.
