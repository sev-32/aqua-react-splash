# Verification — V7

## Required lanes

`npm run verify` executes the build, eight pure-CPU lanes, and the Chromium/Xvfb/ANGLE SwiftShader integration lane.

CPU lanes:

- thin-sheet lighting reference;
- atmosphere reference;
- spectral/ozone/higher-order atmosphere transport;
- worker-job LUT generation;
- radiometric coupling;
- semantic source assets;
- fixed-step clock;
- binary hull asset.

Browser assertions cover:

- V7 modular entrypoint;
- exact generated worker-bundle execution;
- active sandbox worker fallback with current generation applied;
- four balanced scattering orders and positive bounded higher-order energy;
- main-thread LUT adoption below 5 ms;
- six local probes and compiled high-value material patches;
- nonzero controlled local-probe image effect;
- no atmosphere rebuild from local-probe toggles;
- 27→7 hull batching and exact topology;
- semantic selection compatibility;
- radiometrically coupled retained sail transport;
- render-call reduction below V6;
- exclusive render authority;
- exact native hull topology;
- anchored finite rig;
- WebGL2, retained context, zero GL/page/shader errors.

## Final result

- CPU lanes: 8/8 passed.
- Browser assertions: 27/27 passed.
- Context: WebGL2 through ANGLE/Vulkan SwiftShader.
- Unauthorized render calls: 0.
- Retained GL errors: 0.
- Page errors: 0.
- Shader errors: 0.

## Measurements

Atmosphere:

- balanced LUT: 128 × 64 RGBA32F;
- view samples: 12;
- solar samples: 4;
- scattering orders: 4;
- final/first-order energy ratio: 1.02806;
- app worker CPU: 67.9 ms in the recorded SwiftShader lane;
- main-thread adoption: 1.5 ms.

Local probes:

- probes: 6;
- patched materials: 13;
- compiled variants: 26;
- update mean: 0.0875 ms;
- controlled difference: 13,713 pixels ≥2 levels, 2,079 pixels ≥10 levels.

Static batching:

- source meshes: 27;
- batches: 7;
- direct submission reduction: 20;
- exact topology: 5,571 vertices / 9,256 triangles;
- integrated scene calls: 608 versus V6's 648.

Rendering:

- cold SwiftShader shader path: 4,523.2 ms;
- steady submission mean: 13.92 ms;
- steady median: 11.6 ms;
- steady p95: 11.9 ms;
- triangles: 64,040.

These are software-renderer and CPU-submission receipts. They do not predict discrete-GPU performance.

## Visual evidence boundary

The whole-boat image verifies scene integrity. The local-probe on/off pair and amplified difference verify that the probe shader changes pixels in the intended hull/deck/mast region. They do not prove final GI accuracy or photographic calibration.
