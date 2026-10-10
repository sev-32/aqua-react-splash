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
