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
- Direct rig-structure solver: mast (Euler–Bernoulli beam), spreader
  sockets, routed shrouds, diamonds, jib halyard and luff wire, gooseneck,
  boom and vang solved as one XPBD block with a sparse LDLᵀ each iteration.
  A 100 N masthead load bends the mast 0.09 m (was 0.73 m); the rig holds
  its pretension (≈520 N shrouds, ≈290 N luff at rest; both shrouds were
  slack before). Dock tune from the design geometry; gooseneck on the mast's
  aft face; jib sheets led to the side-deck track fairleads (the jib can now
  be sheeted to ~15° instead of ~30°).
- Hull resistance: ITTC-57 form factor, Froude-based residuary, planing lift.
- Leech tapes: the main and jib leech links are solved exactly in the rig
  block (tension-only). With the trim assist free to use the full sheet
  range and the kicker hard on the wind, upwind twist fell from ~16° to
  ~12° (main) and speed at 45° TWA in 12 kn rose from 3.7 to 3.9 kn, with
  the crew now fully hiked as in a real 12 kn breeze.
- Luffing sails flog: rows near zero angle of attack carry a travelling
  chordwise pressure wave (Strouhal 0.5 shedding from the luff, 0.6 q),
  zero-mean so drive and heel are unchanged.
- Knockdown squall (O key): builds to 1.9× and holds until she goes over; the
  helm bears away (on the wind) or luffs (broad), the crew is caught sitting in.

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
- Recovery robustness: the righter stays on the board until the boat is
  within ~30° of upright (lean eased as it comes up); a stalled righting
  (boat hanging at 35–80°) has the sailor on the high gunwale climb in, or
  sends her back to the board when the boat is further over;
  the scooped crew shifts her weight against the heel, moves to windward once
  the helm is aboard and only then resumes seated sailing (previously a boat
  could hang at ~45° for 40 s, or go back over after re-boarding).
- Full hiking: backside over the gunwale edge; a fully hiked sailor's centre
  of mass is ~0.78 m off the centreline (legacy seat: 0.63 m).
- Strong wind: the trim assist plays the main against the heel (a
  heel-limited sheet ceiling instead of dump-and-retrim) and the crew settle
  the boat on a close reach after a recovery. In 18 kn the boat now sails at
  every angle at 13–14° heel (45/60/90/135° TWA: 3.3/4.7/6.6/6.0 kn;
  before: 30° heel upwind, capsized reaching, capsize loop after recovery).
- Synthesised swimming, treading, hanging, board, climbing and scoop poses,
  blended into the seated biomechanics.
- Trim assist sails to the telltales: each sheet is worked to a target angle
  of attack of the apparent flow at ~40 % height (14° main, 12° jib).
- The crew are drawn as the LUCID female-skin-v4.2 body (canonical Skin78
  skin, unchanged): lawful Semantic51 retarget with a joint-limited
  upper-body IK, grip synergy, GPU skinning with the canonical weights,
  wetsuit/boots/gloves, buoyancy aid and hair built on her own surface. The
  body asset is built locally from the LUCID package (not in the public repo).

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
- Sail render surfaces refined (Catmull–Rom, analytic normals) with
  window-aware sail shadows.
- GL error checks sampled at frame ends instead of after every frame phase
  (each `gl.getError()` is a GPU sync); `?glcheck=phase` restores the old
  attribution.

## Experience

- SAIL mode button, sailing HUD (speed, heel, heading, wind, AWA, sea state,
  recovery status, crew tasks, capsize/recovery counters) with CAPSIZE, AUTO,
  DRY, TRIM, CAMERA, WIND and RESET controls.
- Follow, chase and crew cameras (V), never below the sea surface.
- Keys: O capsize, I auto recovery, U heave on the board; legacy sailing keys
  unchanged.

## Verification

- CPU: all V7 lanes plus `ocean-field` (spectrum, field inversion, time
  slices), `hull-hydrostatics` (equilibrium, GZ curve, inverted
  stability), `rig-structure` (sparse LDLᵀ exactness, cantilever within 1%
  of Euler–Bernoulli) and `lucid-crew` (TypeScript Semantic51 + canonical
  drivers + LBS against the LUCID package: joints 2·10⁻¹² m, vertices
  10⁻⁷ m; skipped without the local asset). Tests resolve paths relative to
  the repository.
- Browser (Chromium, ANGLE SwiftShader): knockdown from close-hauled → over
  in ~4 s → dry capsize and scoop recovery; wet capsize → swim → board →
  righting with the LUCID crew; forced turtle → climb on hull → pull board →
  board → upright; no GL errors; zero unauthorised render calls.
