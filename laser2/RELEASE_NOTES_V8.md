# Release Notes — V8 Sailing Foundry: capsize and crew recovery

V8 makes the Laser 2 sail on a physical sea, capsize, turtle and be recovered
by its crew. Sailing is the new default mode; the V7 lighting foundry and the
anchored rig lab remain available (`?mode=inspect`, `?mode=anchored`).
Architecture and exact boundary: `docs/SAILING_V8.md`.

## Physics

- Native ocean authority: JONSWAP directional sea from wind and fetch,
  Gerstner components shared by every physics consumer and the renderer;
  exact Eulerian heights/velocities on a two-slice CPU grid (Lagrangian
  inverse), cross-faded sea-state changes. Legacy spars, ropes and sheets are
  redirected to it.
- Free-floating hull: closed-mesh pressure integration (exact buoyancy and
  centre of buoyancy at any attitude, including on its side and inverted),
  pressure/suction drag, ITTC-57 friction, windage, residuary resistance,
  strip-theory centreboard and rudder with stall, composite mass and inertia
  including carried crew and the exact gravity moment.
- Sailcloth in the water: per-triangle sheet hydrodynamics (implicit normal
  drag with peel-off suction, skin friction, Dacron buoyancy, retained-water
  mass, no wind load under the surface) replaces the V16 floating-cloth
  approximation while sailing. A capsized boat drifts at 0.1–0.3 m/s with its
  rig as a sea anchor.
- V16 cloth collision broad phase made bit-exact and 4.3× faster.

## Crew

- Active balance (hiking, inboard/leeward seating, trapeze) and a sheet trim
  assist that sets main and jib for the apparent wind and eases in gusts.
- Capsize behaviour: sheets released, bracing, dry capsize onto the
  centreboard for a skilled helm, or falling in; the crew drops into the
  flooded cockpit holding the toe strap.
- Swimmers are buoyant point masses in the XPBD sub-steps with hull and spar
  contact and tension-only grip lines; they close with the hull, work round
  the transom hand over hand, hang on the board tip, climb onto the board and
  lean back — the righting moment is their weight at its real lever.
- Turtle recovery from the upturned hull; scoop recovery of the second crew
  as the low gunwale sinks under them; re-boarding with counter-balance.
- Synthesised swimming, treading, hanging, board, climbing and scoop poses on
  the legacy skinned humans, blended into the seated biomechanics.

## Rendering

- HDR scene pipeline inside the exclusive render boundary: scene-linear 4×
  MSAA RGBA16F pass with depth texture, ACES composite, ocean pass.
- Ocean surface on a 54k-vertex camera-centred radial grid using the physics
  components: exact Fresnel, atmosphere-LUT reflection, GGX glitter with sun
  shadow, depth-aware refraction with Beer–Lambert absorption, IOP-based
  water colour, daylight attenuation on submerged geometry, whitecaps,
  aerial perspective.
- GPU water-interaction solver: FFT-propagated free surface with exact
  deep-water dispersion (Kelvin wakes at any speed), hull/swimmer/spar
  pressure forcing against the physics sea, stroke splashes, foam from
  entry, lift-out, breaking and splashes.
- Sun and shadow frustum follow the boat.

## Experience

- SAIL mode button, sailing HUD (speed, heel, heading, wind, AWA, sea state,
  recovery status, crew tasks, capsize/recovery counters) with CAPSIZE, AUTO,
  DRY, TRIM, CAMERA, WIND and RESET controls.
- Follow, chase and crew cameras (V), never below the sea surface.
- Keys: O capsize, I auto recovery, U heave on the board; legacy sailing keys
  unchanged.

## Verification

- CPU: all V7 lanes plus `ocean-field` (spectrum, field inversion, time
  slices) and `hull-hydrostatics` (equilibrium, GZ curve, inverted
  stability). Tests now resolve paths relative to the repository.
- Browser (Chromium, ANGLE SwiftShader): capsize → dry capsize recovery in
  ~11 s; capsize → swim → board → righting → scoop → re-board in ~21 s;
  forced turtle → climb on hull → pull board → board → upright in ~17 s; no
  GL errors; zero unauthorised render calls.
