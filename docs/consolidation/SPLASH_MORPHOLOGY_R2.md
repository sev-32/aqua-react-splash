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

## First independently executed A/B (source SHA 5ff2639faa29e66a3998559465cebb88557ff11f)
- CI workflow: `38010030130`, artifact `11651944437`, 8 unmodified
  1600x900 WebGL2 PNGs and `receipts.json`.
- Four physical stages: sphere contact (~0.58333s), crown (~1.01667s),
  breakup (~1.58333s), fast tow (~1.13333s). GL errors 0,
  no JS/page errors.
- Emitted volume and particle stock/flow accounting were effectively identical
  between modes at each matched stage (the capture adds ~10^-7s between them,
  so a handful of particles may settle in between). No conservation benefit is
  claimed from what is exclusively a rendering intervention.
- Visual assessment: R1 renders many conspicuous opaque spheres around the
  crown. V2 removes the majority of those false macro-droplets and exposes
  slender refractive filaments. **But V2 is too transparent and fragmented,
  resembling scratches rather than continuous flowing sheets. NOT accepted
  as final visual quality.** The nearby water background strongly reduces
  contrast and does not give the sheet a convincing clear-water silhouette.
- Follow-up optically corrected ray projection and sharper environment
  reflection were committed under `4fe9207317` and `1b311b670c`;
  newer WebGL2 A/B workflow `38010407951` evaluates those changes
  independently. Do not retroactively attribute these changes to the first A/B.
- The reference renderer is still the default; GUI toggle is explicitly
  experimental. Next steps must improve continuous surface reconstruction,
  physically correct geometric normals, and optical visibility without
  returning to volume-cubed opaque sphere impostors.

## Second A/B: camera-projected refraction is insufficient alone
- CI workflow `38010407951` completed successfully, 8 actual WebGL2
  screenshots, zero browser/GL errors.
- A V2-only before/after optical comparison with the first 8-frame A/B
  shows material changes above 10 RGB levels in ~0.702% of pixels at
  contact, 5.709% in the crown, 0.731% during breakup, and 3.6% in the
  fast-tow scene. This is measurable but **does not produce a sufficiently
  continuous, visible water curtain**.
- Optical projection correction is useful for camera-coordinate consistency,
  not a replacement for correct geometric surface normals and morphology.
- Next experiment incorporates the **actual surviving connectivity bond graph**
  into the rendering coherence estimate (instead of using only MPM grid
  density) and reduces self-shadowing of *bonded* water flagged as fast spray.
  Commits `cca1721d...` and `9fc8b3ec...`.
- Maintain source-commit separation between the two optical tests and the
  new graph-aware classification. The latter remains a candidate until real
  WebGL2 captures are reviewed. Do not enable by default based on build
  success or lower white-pixel counts alone.
