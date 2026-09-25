# Release Notes — V7 Worker Atmosphere, Local Probes, Batched Hull

## Atmosphere execution

- Moved LUT computation into a dedicated atmosphere job module.
- Added a direct module-worker production path.
- Added a generated self-contained worker bundle for isolated/opaque execution environments.
- Added generation IDs, stale-result rejection, cancellation telemetry, worker restart telemetry, and deterministic main-thread fallback.
- Main-thread work is limited to validated buffer adoption, texture update, and environment invalidation.
- Local-probe setting changes no longer invalidate or rebuild the atmosphere LUT.

## Higher-order transport

- Quality profiles now expose explicit atmosphere scattering orders.
- Reference/High/Balanced/Fast/CPU profiles use 5/4/4/3/2 orders respectively.
- First order uses the existing Rayleigh/Mie/ozone integral.
- Higher orders use bounded angular energy redistribution.
- The approximation is energy-positive and deterministic but is not a full spectral multi-order atmosphere precomputation.

## Local lighting probes

- Added six atmosphere-fed analytic probes for deck, main sail, jib, hull port/starboard, and water/ground bounce.
- Added separate diffuse and specular strengths.
- Restricted shader patching to generated hull batches and mast/boom/spreader surfaces.
- Probe uniform arrays use contiguous Float32Array storage.
- Probe radiance is injected before Three.js `opaque_fragment`, the correct pre-output boundary.
- Added direct enabled/disabled image-difference verification.

## Static hull batching

- Merged 27 native hull/deck/fitting meshes into seven material batches.
- Preserved exact topology and pooled materials.
- Retained hidden semantic source meshes so current selection/highlighting remains functional.
- Reduced the integrated diagnostic scene from 648 to 608 render calls; the direct hull batching authority removes 20 source submissions and their shadow-pass counterparts account for the larger total reduction.

## Verification

- All eight CPU lanes passed.
- 27/27 browser assertions passed.
- Worker bundle executed independently in Chromium.
- Sandbox app worker fallback remained active with no errors.
- WebGL2 active, context retained, GL error zero, no shader/page errors.
- Local probes changed 13,713 pixels by at least two channel levels and 2,079 pixels by at least ten levels in the controlled comparison.
