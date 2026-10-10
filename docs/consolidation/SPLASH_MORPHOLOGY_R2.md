# THALASSA — Splash morphology and optics R2 (experimental)
2026-10-09; branch `feature/causal-water-ledger-r1`.

## Visual failure being addressed
The real 1600x900 reference close-ups show a plausible initial crown silhouette, but its
clear material is visually weak, and the later fluid pass degenerates into large opaque
gray/white spherical masses. The original water ledger says little about the fidelity of
the renderer's geometry: an MPM particle represents a *volume of water*, not necessarily
a resolved physical ball of that size.

### Source-level mechanisms
1. In `oceanMpm.ts`, particles exceeding the relative-speed threshold are permanently
   flagged `FLAG_FOAM`. This flag affects drag and gives the graphics uploader a nominal
   microdrop radius (600 or 900 micrometres), regardless of whether the parcel remains
   connected. The renderer used that flag as `aer = 1` for its full volume.
2. `SPLASH_POINT_VS` expands the rendered radius in proportion to the **cube root of
   the complete particle volume**, not to the subgrid drop radius. The same sample thus
   becomes a large sphere *and* optically opaque whitewater. Neither follows simply from
   a high-speed flag.
3. `SplashConnectivity` creates real spatial bonds, but the renderer's virtual samples
   were drawn as spheres. This yields beads where long, tapering tendrils should exist,
   and the samples add their volume to the *optical* thickness pass despite not adding
   water to the T4 physics ledger.
4. Fluid refraction used `N.xy` in world coordinates instead of projecting the refracted
   ray into the active camera basis. With the high scene transmission of a thin, clear
   water sheet, the surface can be too close to the scene behind it visually.

## V2 intervention (opt-in, default OFF)
- The actual MLS-MPM solver, flow state, transfer mass, impulse and timing are **unchanged**.
- Only isolated, speed-flagged parcels with low coherence (`coh<0.45`) leave the
  coherent screen-space surface, entering a smaller, low-opacity microdroplet scattering
  pass. The coarse particle is an ensemble, not one huge real drop.
- Connected high-speed water stays in the clear surface with a small aeration coefficient,
  not automatically white opaque foam.
- Render-only ligaments have a projected tangent, anisotropic ellipse/capsule coverage,
  a narrow transverse profile and a reduced optical-interpolant weight. This does not
  assert the bonds are physical cylinders; it is a lower-bias connector representation.
- V2 refracted rays are projected via the actual view-projection matrix and the measured
  path length. The smooth film uses a less blurred environment reflection and narrower
  physically motivated sun glint; legacy optics stay untouched in reference mode.
- `OceanPanel` exposes an **Experimental clear-sheet / mist morphology V2** switch.
  The default reference renderer remains available.

## Capture and acceptance
`scripts/ci-splash-morphology-ab.mjs` runs four fixed-seed states at 1600x900:
drop contact, crown, breakup, fast tow. It records paired source frames R1/V2 at nearly
identical simulation instants and cameras, plus T4 volume ledger, body state, GL errors,
particle counts and bond counts. CI compilation is a prerequisite.

**NOT YET CLAIMED:**
- True continuous surface geometry, exact volume correspondence of graphics-only
  ligaments, correct microscale bubble populations, exact two-interface refractive
  ray tracing, physically predictive foam genesis, or an objective improvement.
- A single attractive still image is insufficient: evaluate temporal coherence,
  silhouette, tendril width, reflection/refraction, detached spray scale, overlap,
  GL errors, optical duplicates and frame time over several states.
- If the V2 renderer collapses the splash or creates clipped needles, disable it
  and retain the old pass. No simulation changes should be used to mask render defects.

## Next algorithmic gate
For morphology beyond a render approximation: build a connected liquid surface via
conservative local particle-volume density and anisotropic support from the MPM
deformation gradient; preserve topology as sheets tear into strands and droplets.
Keep the real 3D water/air interface and its normal distinct from subgrid aerated
spray optics, and trace refracted view rays through that interface. Benchmark
a fixed physical field before coupling any morphological changes back into physics.
