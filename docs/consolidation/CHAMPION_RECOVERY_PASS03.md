# THALASSA — Champion recovery pass 03: actual heightfieldBEST and sphere-film code

**Status:** Original executable HTML code and original patch recovered verbatim from user Library; canonical visual/physical test suite running independently. No new simulation or renderer promoted.

## Exact recovered source

| Historic reference | SHA-256 of recovered original | Git blob SHA-1 in archived branch | Mechanism actually in source |
|---|---|---|---|
| `heightfieldBEST.html` | `9f7cd487f07873d5314eb25b9b16f9fad8f854627d6c641a783d61d2a1be5180` | `e8349854772f6d422f04e7e9412c434711bfeba8` | Heightfield obstacle occupancy, swept transit, wakes, void collapse, sheet failure, object film, limited JIT export |
| `pool_obstacle_phase6_runup_film.html` | `1d52fc0cae47f9adfea19a64640ff529ea1f2d77aa9fe4c655e126f798f6047c` | `0f126b6476238aaae4b680762f09478fe09701b5` | Sphere-local water contact and film state, deposition, downslope film transport, drip generation, JIT return |
| `aqua_pool_track_a_phase6_object_runup_film.patch` | `a23268801e8681b3ed1993638dafd61d18313869eb3183e4f25dd629feb29e29` | `4c1864cf00ff792214deb88a4f28ac3e718b9365` | Auditable historical source change introducing sphere material film to prior pool implementation |

All are placed under `docs/champions/donors/library/` with the **original exact Git blob**, pinned by `CHAMPION_REGISTRY.json` and audited by `scripts/champion-audit.mjs`. A filename reference in an earlier specification is no longer the only evidence.

## Semantically important real code paths

- `heightfieldBEST.html::computeObstacle(dt)` computes swept object occupancy rather than a fake wake attached to a moving sphere. Its `step(dt)` couples occupancy, sheet fields, failure/release, MPM export, object-runup/film, and water return.
- `heightfieldBEST.html::updateObjectFilm(dt)` handles wetness and its evolution, not merely a shader threshold.
- `pool_obstacle_phase6_runup_film.html` allocates independent `sphereFilm`, `sphereFilmNext`, `sphereFilmDrain` and `sphereFilmDrip` arrays. `computeObjectRunupFilm` deposits from actual pool interaction, `updateObjectFilm` advects/drains/adheres, and `spawnFilmDrip` generates liquid parcels.
- Its laboratory has named scenarios: `testStill`, `testImpulse`, `testSideSlow`, `testSideFast`, `testDrop`, `testLift`. These are better acceptance scenes than our invented lighting snapshots because they exercise known physical transitions.
- The current ocean `src/ocean/render/bodiesRender.ts` still uses one scalar `uWaterline` height at object center. This is a **known simplification** compared with earlier material wetness systems.
- The newer ocean T3 carpet's body occupancy and flux interaction code may be numerically stronger than BEST in some regimes; restoring the BEST concept should not automatically replace modern dispersive numerics.

## Next integration decisions

1. **Do not copy old shader appearance alone**: restore per-contact geometry plus persistent physical wet-film state and its deposition/drain/drip transitions. Ray evaluation on the actual moving heightfield is a separate optical responsibility.
2. **Do not overwrite the T3 carpet**: test BEST's body/wake data under canonical input trajectories against the current eWave carpet, checking displacement, wake angles, water mass, obstacle blocking, shed wake and void collapse.
3. **Extract film as standalone module**: local material-surface coordinates, contact sampler with wave heights/normals, thickness history, drainage and drip sink; the film is a physical water owner, not a paint layer. Connect debit/credit to the existing causal ledger.
4. **Preserve source control**: original three archives remain unchanged; adapt only isolated duplicates in new integration files, with unit tests for mass, wave contact and timestep variance.
5. **Use original canonical visual tests**: `scripts/ci-original-physics-champions.mjs` captures fast tow, drop and lift frames from untouched donor HTML in WebGL2 Chromium, with actual telemetry and error receipts. A good screenshot is not enough to promote the source: verify physical conditions and volume.

### Dependency warning

The historical JIT Lab R21 metric wetness and JIT M3 full engine files remain separately named in prior design documents. AQUA Phase 6 and BEST recover real functioning *related film models*; they are not automatically the exact JIT Lab R21 implementation. Keep those identities distinct until the JIT source is genuinely recovered.

### Stage status

Source recovery — **VERIFIED EXACT**. Code-level mechanism existence — **VERIFIED**. Independent live render and physics parity — **PENDING/UNPROVEN until CI receipts**. Integrated source in ocean — **NOT IMPLEMENTED**. Reference promotion — **BLOCKED**.
