# Measurement integrity V4

## Separate populations

The runtime keeps independent statistics for static render-on-demand frames, continuous dynamic frames, RAF cadence, render submission, completed WebGL batches, simulation batches, telemetry sampling, atmosphere LUT reconstruction, and environment projection.

Static inspection does not publish an estimated FPS. FPS is only meaningful for continuous cadence.

## Atmosphere measurement

`AtmosphereSystem` records LUT dimensions, pixel count, integration samples, update count, and last/mean CPU reconstruction time. The GPU sky shader remains constant-cost and is measured as part of the ordinary render pass.

`atmosphere-sweep` performs one excluded warmup followed by eight measured settings changes, LUT reconstructions, environment updates, and authorized renders.

The benchmark result must include quality, resolution, shadow state, iterations, and the normal render-authority boundary.

## Error retention

`gl.getError()` is sampled at defined initialization, phase, benchmark, and final boundaries. Events are retained in telemetry. UI snapshots do not drain the error state.

Shader and page errors are separately captured by the browser harness.

## Software-renderer interpretation

SwiftShader is valuable for deterministic feature and error verification. Its absolute rendering and GPU-timer numbers are not hardware-GPU predictions. Reports must name the backend and scenario.
