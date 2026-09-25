# Atmosphere Worker Authority — V7

## Purpose

Atmosphere parameter edits must not synchronously perform tens of milliseconds of LUT integration on the application thread. V7 separates computation from GPU adoption.

## Pipeline

1. `AtmosphereSystem` creates a generation-tagged immutable job request.
2. A module worker executes `computeAtmosphereLutJob` under normal HTTP launch.
3. Isolated execution environments use the generated self-contained worker bundle.
4. The worker transfers the LUT `ArrayBuffer` back without cloning.
5. `AtmosphereSystem` rejects stale generations.
6. The application thread validates dimensions and finiteness, adopts the buffer, updates the floating-point texture, and invalidates dependent environment work.

## Cancellation model

A superseding request increments the generation. Results whose generation no longer equals the pending generation are discarded. Telemetry distinguishes jobs, restarts, bootstrap fallbacks, deterministic fallbacks, cancellations, and errors.

## Invalidation contract

Only atmosphere-domain settings invalidate the LUT. Exposure, local-probe strength, material roughness, and unrelated developer controls do not rebuild atmospheric transport.

## Quality contract

| Profile | Orders |
|---|---:|
| Reference | 5 |
| High | 4 |
| Balanced | 4 |
| Fast | 3 |
| CPU reference | 2 |

The first order uses Rayleigh/Mie/ozone single scattering. Higher orders are a bounded angular redistribution approximation. This is not a full Bruneton-style or spectral path-space precomputation.

## Verified receipts

The exact generated worker bundle computed a 48 × 24, four-order LUT in Chromium. First-order energy was 327.492 and final energy was 336.682, a 2.806% increase. The balanced 128 × 64 application LUT used four orders, and main-thread adoption averaged below 5 ms in the final verification.
