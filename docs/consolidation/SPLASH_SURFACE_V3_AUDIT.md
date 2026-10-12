# V3 geometry audit — first failed rendering, then geometry-gated V3.1

## First real V3 run (2026-10-10)
Workflow `38050039068` succeeded. Source `4926a6751e8131ada07286624048b342753179b0`.
Artifact `11669291931`: 12 real 1600×900 Chromium/WebGL2 screenshots, receipt JSON and exact model stage parameters.

| Stage | Live T4 particles | Bonds | V3 represented particles | Triangle faces | Strand ribbons | Meshed water (m³) | Max optical film thickness |
|---|---:|---:|---:|---:|---:|---:|---:|
| Contact | 355 | 3156 | 355 | 1770 | 265 | 0.209238 | 1.599 m |
| Crown | 2374 | **4000 cap** | 500 | 1698 | 1163 | 0.316539 | 0.759 m |
| Breakup | 2169 | **4000 cap** | 870 | 1680 | 1084 | 0.033006 | 0.022 m |
| Fast tow | 3192 | **4000 cap** | 397 | 2203 | 416 | 0.007311 | 0.008 m |

In all four stages, the mesh's allocated optical-carrier volume equals the source
physical volume assigned to the represented particles to floating point precision;
per-frame WebGL errors and browser/page errors are zero. The volume is still in T4;
V3 does not change particle dynamics or settle returns.

**Visual gate FAILED.** The crown contains large rigid triangular shards and
unrealistic clear panels that do not follow natural splash morphology; the fast
wake exhibits artificial planar polygons. Mesh self-consistency does not imply
a physical liquid interface. Crown graph coverage is ~21% of live particles.

## Why the first approach failed
- Any graph 3-cycle became a triangle even if the three points sampled the
  *interior* of a volumetric splash rather than its boundary.
- Some generated ribbons were up to 18 cm wide, reading as rigid panes rather
  than filaments.
- Some physical water volumes were squeezed into near-degenerate triangles,
  yielding >0.7–1.6 metres of artificial optical path (inappropriate for a
  thin surface).
- The graph's 4000-link saturation meant many live particles had no mesh
  representation and could not form a global continuous curtain.

## V3.1 correction candidate (not validated yet)
Source `splashMesh.ts` now:
1. Computes the lowest-variance axis of local neighbor covariance using a
   small symmetric Jacobi eigensolve.
2. Accepts crowded/triangulated patches only when local neighborhoods are
   substantially planar and normals agree with the proposed face.
3. Rejects overly large, skinny, far-neighbor, and high-volume-to-area
   triangle candidates.
4. Restricts strand width to 4.5cm and requires reasonably local bonds.
5. Tracks an exact per-particle `covered` mask. A physical particle with
   rejected geometry is kept in the V2 spray path — it is not hidden or
   silently removed because it happened to have a graph bond.
6. Divides water volume among accepted mesh primitives exactly once.

This is a **conservative rejection strategy**, not a solution to missing
surface support. If graph density/cap leaves no valid sheet, V3.1 may look like
V2. That would be safer than inventing polygons but still below the user
requested morphology standard.

### Required next steps
- Inspect the V3.1 12-shot real render artifact and per-frame mesh coverage.
- Build a bounded, temporally coherent *surface* neighborhood independent of
  graph bond count, using particle deformation/covariance and exterior
  occupancy (not arbitrary 3-cycles of volumetric neighbors).
- Explicitly represent 2D liquid curtains, then 1D thinning strands and
  detached 0D droplet populations; derive phase changes from measured
  deformation/Weber and connectivity, not only render flags.
- Validate refraction/reflection against the resulting 3D surface normals,
  with a contrast-controlled camera, no artificially opaque foam.

## V3.1 / V3.2 independent real WebGL2 results

V3.1: CI `38050879358`, 12 PNGs, 1600×900, no GL/JS errors.
The normal/covariance and width gates suppress most rigid triangular shards.
Crown: 141 triangle faces, 123 ribbons, 247 represented / 2374 live
particles (10.4%), max surface optical thickness 0.309m.
It remains insufficiently connected; do NOT infer rendered surface area
or visual quality from particle counts alone.

V3.2: CI `38051236254`, artifact `11669329052`, 12 PNGs and full
receipts, no GL or JS errors. The *same* global bond budget of 4000 was
distributed via an opt-in 5-neighbors-per-particle cap.
Legacy R1/V2 graph rules stay unchanged. Tests and production build passed.

| Metric | V3.1 contact | V3.2 contact | V3.1 crown | V3.2 crown | V3.1 breakup | V3.2 breakup | V3.1 fast tow | V3.2 fast tow |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Live particles | 355 | 355 | 2374 | 2374 | 2169 | 2169 | 3192 | 3192 |
| Reconstructed particles | 225 | 195 | 247 | 1080 | 824 | 1546 | 333 | 845 |
| Triangle faces | 303 | 95 | 141 | 431 | 1490 | 733 | 1045 | 111 |
| Strand ribbons | 21 | 56 | 123 | 380 | 347 | 397 | 27 | 586 |
| Assigned water volume (m³) | 0.161389 | 0.095369 | 0.131895 | 0.289041 | 0.031205 | 0.046550 | 0.005580 | 0.016975 |

V3.1 exact connected carrier volumes and V3.2 comparative metrics are stored
in each workflow's `receipts.json`. Do not infer visual area from them.

The V3.2 crown's supported particle count improved **4.37×**, from
247/2374 (10.4%) to 1080/2374 (45.5%). Rendered optical-carrier volume
still matches the volume of represented physics particles by construction
and independent unit tests check actual triangle area × film thickness.
There was no change to emitted/settled volumes or MPM forces.

**Visual gate still FAILED:** the huge polygon shards are mostly gone,
but the continuous liquid curtain and naturally thinning/tearing tendrils
are still missing. The surface is clear yet overly fragmented against
the bright ocean background. Do not make V3 the default or merge this
experimental branch as photorealistic water.

### Decisive next architectural change
The emitter currently samples the crown as randomized ring particles.
These are created without retaining a persistent 2D material sheet or
its angular and temporal adjacency. Reconstruction can only guess
connectivity afterward, regardless of how fairly a capped graph is
distributed.

Introduce opt-in `V4 material-sheet emission` at the crown source:
- Assign a material sheet ID, azimuthal coordinate and emission-time
  coordinate to each emitted parcel, retaining actual particle ancestry.
- At birth, form local 2D strips across adjacent angular sectors and
  consecutive emission epochs (not unrelated nearest particles).
- Carry those sheet vertices with MLS-MPM motion; physically thin the
  material via increasing area while preserving its allocated volume.
- Break material bonds and transfer them into 1D liquid ligaments
  when strain/instability exceeds measured criteria. Detach droplets
  from those ligaments; foam/aeration is an independent scattering
  field, not white albedo on all fast water.
- Use a bounded near-field budget and LOD; when graphics support is
  missing, preserve physics and report an explicit fallback.
- Verify several matched frames over time, not one still; establish
  real silhouette coverage and reflect/refract a high-contrast
  background with actual surface normals.

This is a design target, not an implemented V4. The failure of V3
prevents promoting a nice-looking screenshot as physical proof.
