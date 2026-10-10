# THALASSA — Water Semantics and Non-Regression Constitution

**Purpose:** preserve the entire physical, visual, and causal meaning of the project's water system across versions and agents. This is not a request for the visionary to explain Fresnel, caustics, or wetness one more time. Engineering agents own the research, integration, testing, visual judgment, and preservation of the strongest working mechanisms.

**Authority:** the project's underlying intent and the actual historical donor code and rendered evidence, not generic water-engine tutorials. See `REFERENCE_MAP.md`, `CORE_LAW.md`, and machine-readable `WATER_SEMANTIC_CONTRACTS.json`. The original pool source is present in the repo; some later BEST/JIT/Particles4All champions are *documented but not currently mounted*. Never claim those missing source files were recovered merely because a reference document names them.

**Master intent, in plain language:** One large body of water evolves under consistent physics. A heightfield handles the enormous majority of the surface. Moving objects *cause* displacement and wake formation. A breaking surface spawns local high-resolution 3D water when the heightfield cannot represent it. That water behaves as liquid, makes connected sheets, filaments and droplets, and returns its mass and momentum to the parent water. Real terrain governs shallow flow, overtopping, new basins and drying. Lighting and optics reveal the same water state rather than paint separate animations onto it. The result must be reusable in a game world with bounded computational cost.

## 1. The water is not the rendering technique

A shader, heightfield, MLS-MPM particle, PBF particle, triangle, mist parcel, white foam fleck and caustic receiver are **representations of distinct aspects of one phenomenon**. None defines what water is.

For the engine, the physical system comprises liquid volume, momentum, pressure, gravity, viscosity/surface tension as appropriate, air entrainment and boundaries. A 2.5D heightfield is valid only while one height describes the free surface at a horizontal coordinate. A folded crest, detached sheet, water overhang, filament or droplet cannot be fully represented by that single-height representation. Local 3D fluid is created only for those exceptions. Each numerical representation must agree on who owns each parcel of liquid and where transfers go. Rendering must not create fictitious volume.

What the camera sees is the dynamic **water–air interface** plus optical paths through/along it. Its silhouette and curvature come from actual fluid structure. Its transparency comes from transmission and absorption along a ray, not an arbitrary alpha level. Its brightness near grazing angles comes from angle-dependent interface reflection. Its color and caustics come from the incident scene and light, not a disconnected decorative texture.

## 2. 'Correct water visuals' means a *connected causal chain*

**Shape → surface normals → reflected and refracted rays → optical path → viewer.** The terms are dependent: an excellent Fresnel formula cannot rescue a broken geometric normal, and a great water surface still looks wrong when its reflection target excludes important scene objects.

| Phenomenon | Actual physical/optical cause | Wrong substitute that cannot become champion | Existing champion/donor direction |
|---|---|---|---|
| Bow waves/wakes | Body displaces and redirects water; propagated disturbance follows actual velocity/depth | Colored wake decal or traveling pattern attached to the boat | heightfieldBEST occupancy + THALASSA dispersive carpet |
| Splash curtain | Real water becomes locally multi-valued, its connected material stretches | Giant spheres representing simulation *volume parcels*, fake ribbons that reconnect at random | JIT M3 spatial+temporal membranes, pool fused liquid, PBF anisotropy |
| Tendril and droplet | Connected water necks and pinches into a thinner thread; surface tension influences breakup | White points of arbitrary size selected by speed | Particles4All surface tension, historical tendril champion |
| Foam | Breaking entrains air and bubbles survive/decay and advect | All high-speed liquid becoming solid white foam balls | Foam Foundry V4.3, AQUA subsurface |
| Fresnel | Real interface normal + view angle + two indices of refraction | Surface rim brightness independent of surface or view | POSEIDON / original pool ray shader |
| Refraction | Snell's-law rays passing through actual interface into an actual scene | UV wobble with unrelated noise, or weak alpha-blended silhouette | Original pool surface rays / POSEIDON shader |
| Reflection | Real reflected radiance from sky, terrain, bodies and nearby liquid | Painting sky color into splash or ignoring the splash in ocean reflection | POSEIDON optics plus missing reciprocal visibility path |
| Caustics | Refraction changes ray density on submerged receiver as the actual wave curvature/light/depth changes | Scrolling texture with no actual surface dependence | THALASSA terrain slope-Hessian focusing, POSEIDON/T4R |
| Sphere wetness | Local wave intersects each body point; attached film deposits, drains and drips | Single horizontal wetness stripe based on one center height | BEST film and JIT R21 metric film |
| Shore/terrain | Solved wet/dry flow over the actual seabed/ditch/barrier | Water mesh painted over land or arbitrary isolated puddle | THALASSA T2 conservative solver |
| Return from splash | Detached liquid hits surface and returns its volume and momentum | Fading particles, decorative re-entry circles with no mass handoff | JIT M3 return and AQUA canonical BFT |

**Critical separation:** A weak implementation of a valid physical technique can still regress visual quality. We choose by both (a) causal fidelity and (b) measured rendering/physical performance. When two valid methods differ, use controlled comparison, numerical consistency and multiple true renderer views. We do not ask the visionary to rank obviously mismatched mechanisms.

## 3. Specific known defects in the current branch (verified source-level, not hypothetical)

1. `src/ocean/render/bodiesRender.ts` computes `wet` and subsurface `depth` using `uWaterline`, assigned once from `waterAt(b.pos[0],b.pos[2])`. Even though physics has a local water query, rendering cannot produce an accurate wave-shaped wet boundary over the entire sphere, and it has no proper historical adhering-film field. The historical BEST/JIT wetness implementation is the reference; do not replace it with a sharper horizontal stripe.
2. `src/ocean/engine/OceanEngine.ts` renders the ocean surface before `drawTransparent` splash. This means splash has access to background sea but the standard water pass does not automatically receive current splash geometry as reflected scene content. A deliberate reciprocal visibility/reflection strategy must be integrated rather than cosmetically brightening splashes.
3. `src/ocean/render/terrainRender.ts` already computes terrain caustic focusing from **actual spectral-surface slope derivatives and a depth-scaled Jacobian determinant**. This is real water-driven focusing, albeit still an approximate model. It is a protected capability, not something to replace with a simple moving texture. The older pool also has a caustic render pass driven by the water simulation.
4. `src/components/SplashParticles.tsx` preserves the original pool's implicit fused surface with Marching Cubes and persistent connection contributions. The more recent splash rendering path `src/ocean/sim/SplashSystem.ts` is different. The original should be retained as a live comparison baseline; V2–V4 experiments are not automatically superior because they have higher version numbers.
5. `src/ocean/engine/OceanEngine.ts::sampleWater` currently composes height providers but returns offshore velocity and normal components. That can create physically inconsistent buoyancy/contact samples during strong shoreline or interaction-tile waves. Surface-query authority must include all local components, not only height.
6. `src/ocean/sim/causalLedger.ts` accounts for local particle transfers. This does not yet demonstrate a complete conservative energy/momentum and spectral-injection handoff across every ocean tier.

Do not call these defects 'solved' by a passing build or a physically attractive screenshot. Each has a specific integration test.

## 4. Champion selection is a per-capability process, never per-version

The strongest ocean *spectrum* need not be from the same project revision as the strongest *heightfield*, *contact film*, *tendril solver*, *caustics* or *shallow-water terrain*. The final consolidated engine is not a winner-take-all version import. It is a causally consistent combination of champions.

1. **Find:** consult registry and search the historical source archive, repo branches and references before proposing new code.
2. **Verify donor:** locate executable source, version/commit and original true renderer captures. If a donor is only named by an old report, mark **DONOR NOT RECOVERED**. No invented implementation substitutes for recovery.
3. **Lock reference:** record exact source hash, dependencies and scene/camera conditions; preserve original bytes and runnable route.
4. **Translate its causal contract:** specify what the donor truly computes and what dependent subsystems consume. Never transplant an output texture in place of the underlying mechanism.
5. **Compare:** run both systems using matched water state, camera, lighting, terrain and simulation times. Evaluate physical measurements and multiple real renderer frames/short GIFs.
6. **Integrate:** retain the donor's governing mechanism, convert only the minimal interfaces needed to fit the unified engine, and re-test on original donor and ocean scenes.
7. **Promote only after proof:** baseline is never overwritten or silently demoted; candidate becomes champion only when all relevant gates pass. Otherwise preserve it under experimental status with failures.

**Tie-breaker:** first preserve causal correctness and previously achieved capabilities; then numerical stability, visual quality, temporal continuity and cost. A cheaper lookalike cannot defeat a surface-driven caustic or physically derived wake unless a declared lower-quality LOD mode is *explicitly* selected under a runtime budget; that approximation must not become the sole authoritative mechanism.

## 5. What a proof receipt must contain

A receipt names the phenomenon and champion, source paths and hashes, complete simulation initial state, seed, geometry, light/view state, camera/exposure, physical simulated time, mode, timestep, tier ownership and boundary transfers. It records CPU/GPU profile and memory where available. It contains **real engine PNGs and an animated sequence of consecutive frames**, not generated illustrations. It records numerical metrics suitable for the phenomenon: mass/energy/impulse residuals, wetness contact agreement, Fresnel/angular curves, caustic ray mapping, sheet topology/strain history, wave amplitude/spectrum, foam/aeration lifetime, shoreline overtopping and fluid solver convergence.

Automatic failures include losing physics-derived mechanisms, disappearing donor source, inconsistent transfer ledger, invalid scene-interface or source query, catastrophic WebGL errors, newly opaque carrier spheres, missing real render proof, or large regressions under previously passing reference scenes. Visual acceptance is primarily an **engineering task**; ambiguous expert-judgment cases are documented with images and discriminating tests, not silently sent back to the user.

A metric passing for one property must not certify another. A closed particle volume ledger does NOT certify a visually coherent splash. One 30Hz frame does NOT certify timestep invariance. A flat-water wetness screenshot does NOT certify wetness on an asymmetric rolling wave. A caustic shader referencing surface derivatives does NOT prove physically exact ray tracing; the output must pass controlled light/depth tests.

## 6. Implementation and accountability

Machine contracts: `WATER_SEMANTIC_CONTRACTS.json` (20 phenomena, 30 dependencies, physical meaning, wrong substitutes, champion and acceptance tests).

Protected donor hashes and actual recoverability: `CHAMPION_REGISTRY.json`. Reproducibility audit: `scripts/champion-audit.mjs`. The source-integrity check is deliberately separate from physical and visual certification.

For every substantial stage: record the best-for-each list, add a tested candidate, show a true renderer GIF or scene still **in chat**, produce a small code/docs checkpoint, and update status as **preserved / improved / regressed / unresolved** with evidence. If context limits prevent completing a stage, preserve enough code, exact hashes, receipts and instructions that the next agent can continue *without asking for the same explanation*. The lead engineer—not the visionary—is responsible for resolving which existing implementation is superior.

## 7. Next work is recovery, not another V5 splash variant

The highest-value next integration lane is recovering the **actual** historical JIT R21 body film and JIT M3 event/skin renderer, the true heightfieldBEST implementation, and Particles4All's anisotropic/PBF solver where available. Mount each in the *same pool benchmark*, preserving the current reactive heightfield, then restore the best surface morphology and optical pipeline into the ocean render graph with reciprocal visibility. Do not begin by tuning foam brightness or inventing new fake droplets.

Do not call the end product 'perfect' until it demonstrably clears the champion scenarios with physically defensible results on target hardware. The objective is to reach that high bar without the user having to repeatedly restate it.
