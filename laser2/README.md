# Laser 2 Lighting Foundry V7 — Worker Atmosphere, Local Probes, Batched Hull

A modular developer application for replacing the Laser 2 renderer, lighting, materials, scene, and simulation with independently measurable authorities.

V7 preserves the verified V6 atmosphere transport, spectral sunlight, HDR environment, spherical-harmonic diffuse lighting, ACES camera response, aerial perspective, fixed-step runtime, native hull assets, and exclusive render boundary. It advances three remaining runtime units:

- atmosphere LUT computation moved out of the application thread into a cancellable worker authority;
- six atmosphere-fed local lighting probes for near-field deck, sail, hull, and water/ground bounce;
- 27 native static hull/deck/fitting submissions merged into seven material batches while preserving semantic selection.

The uploaded `SplashWorkz V5 — Living Ocean` application is retained only as a non-executing research reference. Its Nishita-style atmosphere structure informed the Foundry transport model. Its renderer, animation loop, ocean, UI, and particles are not imported into the runtime.

## Architecture

The application is external TypeScript/ES modules. The HTML entrypoint contains no inline application implementation. Major authorities are independently initialized, timed, toggled, and reported:

- application kernel and six-phase frame graph;
- exclusive render service;
- bounded 60 Hz fixed-step scheduler;
- atmosphere worker and main-thread upload boundary;
- spectral sunlight and radiometric coupling;
- HDR environment and SH global probe;
- local analytic probe system;
- native semantic scene and static hull batches;
- material controllers, inspection tools, benchmarks, and telemetry.

The legacy bundle remains quarantined under `public/vendor/legacy` for unmigrated rig, sail, rope, crew, and physics data. It does not own RAF or renderer submission.

## Run

Windows:

```bat
run_windows.bat
```

Linux:

```bash
./run_linux.sh
```

Manual:

```bash
npm run build
python3 tools/serve.py
```

Open `http://127.0.0.1:4173`.

## Verify

```bash
npm run verify
```

The verification pipeline performs:

1. Binary hull asset generation and TypeScript compilation.
2. Self-contained atmosphere-worker bundle generation.
3. CPU thin-sheet, atmosphere, spectral-solar, radiometric, semantic, fixed-step, and binary-asset tests.
4. Exact worker-bundle execution in Chromium.
5. Chromium/Xvfb/ANGLE SwiftShader WebGL2 integration verification.
6. Controlled local-probe enabled/disabled image comparison.
7. Static-hull topology, batching, semantic selection, render authority, shader, GL, and context assertions.

Canonical V7 receipts:

- `evidence/browser/foundry_v7_verification.json`
- `evidence/browser/foundry_v7_whole_boat.png`
- `evidence/browser/foundry_v7_local_probes_on.png`
- `evidence/browser/foundry_v7_local_probes_off.png`
- `evidence/browser/foundry_v7_local_probes_difference_x4.png`
- `evidence/cpu/atmosphere-worker-v7.json`
- `evidence/cpu/atmosphere-transport-v7.json`
- `evidence/cpu/fixed-step-clock.json`
- `evidence/cpu/hull-binary-asset.json`

## Verified checkpoint

- 54 TypeScript modules and approximately 6,300 typed source lines.
- 27/27 browser assertions passed.
- All eight CPU test lanes passed.
- WebGL2 through ANGLE/Vulkan SwiftShader with no page, shader, retained-GL, or context-loss errors.
- Zero unauthorized render calls.
- Balanced atmosphere contract: 128 × 64 RGBA32F LUT, 12 view samples, four solar samples, four scattering orders.
- Six local probes, 13 patched high-value materials, and 26 compiled probe shader variants.
- 27 static hull meshes merged into seven material batches with exact 5,571-vertex / 9,256-triangle parity.
- Total diagnostic render calls reduced from V6's 648 to 608.

Software-renderer measurements are receipts, not predictions for a discrete GPU.

## Exact boundary

V7 is not a finished GI or photographic-lighting engine.

- Atmosphere orders 2–4 use bounded angular redistribution, not full spectral multi-order precomputation.
- Local probes are analytic irradiance/specular lobes, not parallax-corrected cubemaps or path-traced GI.
- Sailcloth and vinyl still use the retained V17 shader backend, now driven by the radiometric budget.
- Water optics, native dynamic rig/sail/rope/crew/collision, and dynamic-buffer batching remain outside this checkpoint.
- Semantic source hull meshes remain hidden for selection; an ID-buffer picker is required to remove that duplicate CPU geometry.
- 608 draw calls remain far above the sub-150 dry-scene target.
- Compatibility physics remains the dominant dynamic runtime cost.
