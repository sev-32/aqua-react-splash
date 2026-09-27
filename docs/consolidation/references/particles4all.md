# Particles4All — "Position Based Fluids · WebGPU"

| | |
|---|---|
| Files | `01_CURRENT/JIT_M3_R22/public/originals/Particles4All/` (identical to the separately uploaded `Particles4All.zip`, which adds its `.git` and `docs/small.png`) |
| API | WebGPU compute + render. No build step (ES modules + WGSL). |
| Scale | Presets: small 30 k, medium 100 k, large 300 k and extreme 1 M particles. Default spacing `d = 2 cm`, kernel `h = 2d`. |
| Role in the consolidation | **Champion for detached-liquid realism:** tendrils, ligaments, coherent sheets, surface tension and the liquid surface look. It isn't a heightfield method. It's what the *spawned* water should behave and look like. |

## What it is

A GPU implementation of **Position Based Fluids** (Macklin & Müller 2013), in the unified-particle style of FleX (Macklin et al. 2014: fluid and rigid bodies in one constraint loop). It is not MLS-MPM. The user's point stands: the method matters less than the result, and for splash, tendrils and liquid coherence the result is the best in the corpus.

## The solver (`src/sim.js`, `src/wgsl.js`)

Each substep (default: 2 substeps × 4 iterations at 1/60 s per frame, with an optional time scale):

1. **Predict** positions under gravity.
2. **Spatial hash** on the GPU: `count → scanBlock/scanBlocks/scanAdd → scatter` (counting sort into cells of size h).
3. **Rigid bodies as particle sets.** Centre of mass, covariance and shape-matching rotation (`bodyCentre/Cov/Resolve/Project`). Buoyancy emerges from the density constraint: no buoyancy formula, no displacement bookkeeping.
4. **Density constraint iterations**:
   - `λᵢ = −Cᵢ / (Σ|∇C|² + ε)` with relaxation `cfm = 0.01` and SOR `ω = 1.03`;
   - `Δpᵢ = Σ(λᵢ + λⱼ + s_corr)∇W`;
   - the artificial pressure `s_corr = −k(W(r)/W(Δq))⁴` (k = 0.1, Δq = 0.3h) removes tensile clumping and lets particles form filaments instead of clusters;
   - boundaries are density-contributing boundary particles with volume ψ (Akinci 2012).
5. **Velocity from positions**, then **XSPH viscosity** (c = 0.066).
6. **Surface normals** `nᵢ = h·Σ (m/ρⱼ) ∇W_spiky`.
7. **Surface tension** (Akinci, Akinci & Teschner 2013): cohesion with the dedicated cohesion spline plus a curvature term `−γ(nᵢ − nⱼ)`, symmetrised by `2ρ₀/(ρᵢ+ρⱼ)`, with `γ = tension = 0.4`. **This is where the tendrils, rims and ligament pinch-off come from.**
8. Finalize.

Interaction: mouse "hover" force field, body grab/drag, pour-water hose.

## Rendering (`ssfr*.js`, `aniso_wgsl.js`, `mesh*.js`, `ray*.js`)

- **Anisotropic kernels** (Yu & Turk 2013): per-particle neighbour covariance with 25 neighbours, ratio 2.3 and λ 0.9, giving stretched ellipsoids along sheets and filaments.
- **Screen-space fluid rendering with the narrow-range filter** (Truong & Yuksel 2018): depth and thickness splats, then the filter (3 iterations), then normals.
- Composite with Beer–Lambert thickness absorption (`absorption 0.425`, transmit colour), IOR 1.333, an HDR environment (quarry), sun and floor.
- Alternatives: marching-tetrahedra mesh (`meshres 256`, iso 0.4) and a ray-marched surface.

## Evidence

- `docs/small.png` (the supplied reference image): a slab of water with a floating sphere, torus and box. It shows a continuous, smooth, refractive liquid surface with a reflected HDR environment and resolved floating-body interaction.
- **Live run in this session: not possible.** The software WebGPU adapter (SwiftShader) allows 10 storage buffers per shader stage, and P4A's `scatter` needs 12. I split it in a scratch copy only (`scatter` + `scatter2` through a recorded slot, physics unchanged). The simulation then starts, but the GPU device is lost ("A valid external Instance reference no longer exists") in every view mode, headless or headed under Xvfb. Treat P4A as **hardware-GPU only**, and judge it from source plus the reference image until it can run on a real GPU.

## Strengths

1. Real surface tension (Akinci) at 2 cm resolution. Ligaments, rims and droplet pinch-off come out of the physics.
2. Coherence without reconstruction tricks: sheets exist because particles are there, not because faces were drawn between them.
3. Two-way rigid bodies for free (buoyancy, splash from impacts) in one solver.
4. GPU throughput: hundreds of thousands of particles on real hardware.
5. The best liquid surface rendering in the corpus for thin detached water: anisotropic SSFR with the narrow-range filter.

## Limits for an ocean engine

1. **Bulk-only.** It has no heightfield, no ocean, no dispersion and no open boundary. It can't be the ocean. It has to be the **local detached-liquid solver** that the heightfield hands water to.
2. PBF is incompressible-ish but iteration-limited. At large dt, the energy loss (XSPH, SOR) damps fast splashes. Particle count sets the minimum sheet thickness (≈ d = 2 cm).
3. WebGPU only, and its storage-buffer use exceeds the minimum-limit profile (12 > 10). It needs a fallback path or a split.
4. No accounting ledger. Particles are the water. A heightfield hand-off needs the JIT ledger around it.

## How it should enter THALASSA

This is the recommended path; see `../CORE_LAW.md` and `../PLAN.md`:

- Use PBF with Akinci surface tension (or equivalently MLS-MPM with a cohesive EOS) as the **detached-liquid solver inside the carpet**, at 1–2 cm spacing and **independent of the heightfield grid**. The JIT ledger decides *how much* water leaves and *with what momentum*. The particle solver decides *how it moves and breaks up*.
- Use anisotropic SSFR with the narrow-range filter as the splash renderer, lit by THALASSA's POSEIDON optics.
- Test it side by side against the lab's MLS-MPM fused surface in the same launch scenarios (drop, tow, plunge). Carry forward whichever is better per regime. That is your rule: the method matters less than the result.
