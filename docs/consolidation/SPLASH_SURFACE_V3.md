# THALASSA — V3 explicit splash-surface experiment

## Why V2 is insufficient
The R1 water particles are computational volume carriers, not literal spherical
droplets. Previous optical splats made every volume carrier a visible sphere,
which caused oversized white spray and a disconnected clear-water curtain.
V2 fixed the giant-foam classification, but its optical filaments were still
billboard-like ellipses rather than a surface. Correct camera-space refraction
cannot repair a missing air-water interface.

## V3 implementation — gated, OFF by default
`src/ocean/sim/splashMesh.ts` reconstructs geometry from the MLS-MPM
particle positions and the graph of temporally persistent splash bonds.

- Candidate 3-cycles of bonds yield *actual 3D triangle faces* where three
  valid, noncollinear connected water particles support a local surface.
- Remaining bonds yield thin, double-sided ribbon faces between particles.
  Width is constrained; surplus physical water contributes to film thickness,
  not gigantic visual spheres.
- Each graph-connected physical particle's volume is divided among all of
  its incident generated faces/ribbons. The sum of assigned carrier volume
  equals the sum carried by those connected physical particles.
- The graph-connected particles are excluded from the legacy giant-sphere
  splat render and are drawn as the triangle/ribbon interface instead.
- Isolated particles continue through the V2 detached-mist renderer. R1 and
  V2 are preserved, independent and selectable.
- The reconstruction mesh has two GPU passes (front-surface distance using
  GL_MIN and physical optical thickness using additive accumulation),
  feeding the existing Fresnel/Beer/refraction shader and real scene depth.
- The *simulation* is unchanged: MLS-MPM motion, forces, source volume,
  settling, mesh transport, and the stock/flow ledger retain their semantics.

**Important constraints.** This is a topological surface reconstruction
*experiment*, not an exact 3D level set / physically calibrated film.
The MLS-MPM bond graph is capped at 4,000 links. Several earlier measured
crowns already hit that cap, so this graph cannot be assumed complete.
A geometrical candidate triangle might lie inside a thick 3D cloud rather
than on its actual boundary; self-intersection and missing faces remain
possible. Double-sided ribbon faces do not prove the water has that
cross-section. Graph-derived strand thickness is a volume/area optical
proxy and is not calibrated from deformation-gradient tensors.

## Independently executable tests
`src/ocean/__tests__/splashMesh.test.ts` checks:
- a nondegenerate 3-cycle forms one triangle, and water is allocated once;
- chains become strips with no additional water;
- shared physical particles are partitioned across multiple primitive types;
- dead particles are excluded;
- collinear cycles never generate zero-area sheet triangles.

`scripts/ci-splash-mesh-v3.mjs` captures 12 REAL renderer PNGs at 1600×900:
R1/V2/V3 at each identical lab stage of contact, crown, breakup and towing.
The JSON receipt records GL errors, body trajectory, T4 accounting,
particle count, bond count, topology patch count and allocated/carrier volume.

## Acceptance gates, not assumed passed
1. Pixel and console/GL correctness: no black frame artifacts, zero errors.
2. Geometry mass accounting: mesh allocated-carrier minus connected-carrier
   approximately zero (float tolerances); full T4 stock/flow residual remains
   unchanged.
3. Geometric: the crown is connected above the contact waterline without
   fictitious volumetric spheres; filaments narrow before separation.
4. Optics: reflection/refraction originate from reconstructed shape, not
   foam albedo or a fake rim brightness.
5. Temporal: connected surfaces persist across successive timesteps and
   avoid triangle flipping, cloth-like sheets, artificial partitions.
6. Efficiency: bounded triangle/ribbon count; substantial CPU/VRAM or frame
   time regression is not acceptable for an open-world engine.

Any failed gate keeps V3 experimental and OFF. If the geometry is incomplete,
measure that directly and develop locally conservative surfacing using
particle density/covariance and bounded connectivity rather than tweaking
the scattering color.
