# Architecture — Laser 2 Lighting Foundry V7

## Ownership boundaries

Foundry owns:

- application lifecycle and dependency ordering;
- requestAnimationFrame scheduling;
- bounded fixed-step simulation scheduling;
- every renderer submission;
- atmosphere computation and GPU adoption;
- spectral sun and radiometric coupling;
- HDR environment and global SH lighting;
- local analytic probes;
- native static hull assets and batches;
- semantic inspection, developer UI, telemetry, and benchmarks.

The compatibility adapter supplies unmigrated scene/physics data only. Its animation loop remains frozen and it may not invoke `renderer.render` outside `RenderSystem`.

## Runtime graph

```text
input/settings
    ↓
fixed-step clock ──→ compatibility physics bridge (temporary)
    ↓
pre-render preparation
    ├─ atmosphere generation invalidation
    ├─ spectral/radiometric budget
    ├─ HDR environment + SH probe
    ├─ local probe uniform update
    ├─ native/static batch visibility
    └─ dynamic geometry synchronization
    ↓
RenderSystem exclusive submission
    ↓
telemetry/error retention
```

## Atmosphere worker boundary

Atmosphere integration is a pure job that accepts settings and quality samples and returns a transferable RGBA float buffer plus energy/timing metadata. The browser authority uses a module worker when available. A generated self-contained bundle supports isolated execution contexts. The main thread only validates/adopts the buffer and invalidates dependent environment work.

Generation numbers reject stale results. Only atmospheric transport dependencies schedule new jobs.

## Lighting hierarchy

1. Spectral direct solar produces atmosphere-attenuated RGB/lux state.
2. Atmosphere LUT supplies visible sky and HDR PBR environment.
3. Order-2 SH supplies global diffuse environment.
4. Radiometric coupling derives direct, sky, ground, exposure, and material inputs.
5. Six local probes approximate near-field deck/sail/hull/water bounce.
6. Materials consume the shared lighting state; hidden fill lights are prohibited.

## Scene architecture

The native binary hull contains 27 semantic meshes. V7 groups these into seven material batches for normal rendering. Hidden semantic source objects preserve current catalog selection until an ID-buffer picker replaces them.

## Performance architecture

- Static inspection is render-on-demand.
- Simulation frequency is independent of display frequency.
- Atmosphere integration executes off the application thread.
- Atmosphere upload and worker CPU time are recorded separately.
- Local-probe updates use a four-frame dynamic stride and immediate static updates.
- Static hull batching reduces normal and shadow submissions.
- CPU submission timing is not reported as discrete-GPU frame time.

## Current compatibility boundary

Still sourced through the adapter:

- Three.js/context bootstrap;
- mast, boom, spreader, sail, rope, hardware, crew, and steering geometry;
- rig, cloth, rope, crew, collision, and rigid-body simulation;
- retained V17 sailcloth/vinyl shader backend.
