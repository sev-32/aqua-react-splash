# Telemetry reference

## Frame statistics

`TelemetryHub` retains bounded samples and publishes last, mean, minimum, maximum, p50, p95, and p99.

Separate populations are maintained for:

- frame-graph wall time;
- static render-on-demand frames;
- dynamic frames;
- RAF cadence;
- fixed simulation steps and dropped backlog;
- telemetry sampling overhead;
- render submission;
- explicit completed WebGL batches;
- compatibility-physics batches.

Static mode reports no estimated FPS. Dynamic FPS is derived from RAF intervals, not CPU submission duration.

## Radiometric telemetry

`RadiometricCouplingSystem` reports:

- solar direction and atmospheric RGB transmittance;
- direct-normal and direct-horizontal RGB lux;
- sky irradiance and ground-bounce RGB lux;
- total horizontal illuminance;
- manual/automatic exposure result;
- normalized renderer sun color and intensity;
- diffuse hemisphere colors and intensity;
- PBR environment intensity;
- sample count, CPU time, recomputes, and calibration constants;
- explicit model and truth boundary.

`AtmosphereSystem` reports physical constants, quality profile, LUT dimensions, integration samples, texture updates, reconstruction cost, camera recentering, and deferred dynamic updates.

`SunSkySystem` reports the actual directional-light values consumed from the shared budget.

`EnvironmentSystem` reports diffuse and ground energy, atmosphere texture binding/version, registered PBR material count, material bindings, environment intensity authority, and update timing.

## Material telemetry

Material controllers report current exposed parameters and the runtime backend they modify. V5 explicitly labels the retained V17 sail/vinyl backend rather than describing it as native Foundry shading.

## CPU scopes

`FrameGraph` times every phase and system invocation. Initialization and update scopes are separate. Compatibility physics additionally reports batch and per-step costs.

## WebGL state

WebGL identity is cached at attachment. Context-loss and GL-error events are retained without allowing UI snapshots to drain the error state.

## GPU timing

When `EXT_disjoint_timer_query_webgl2` is available, timer queries are collected with disjoint checks. Software-renderer results remain labeled as SwiftShader measurements and are not hardware-GPU predictions.

## Renderer counters

The exclusive render authority publishes calls, triangles, render count, benchmark/capture count, shader/program statistics, and unauthorized render-call count.

## Runtime budget alerts

Runtime budgets are diagnostic. V5 never silently changes quality or material semantics in response to a budget violation.
