# Release notes — V5 radiometric coupling

V5 corrects the V4 atmosphere-coupling defect where the visible sky changed but environmental illumination on the boat remained too similar between noon and sunset.

## Added

- `RadiometricCouplingSystem` with one shared sun/sky/ground/exposure/PBR budget.
- Calibrated direct-normal and direct-horizontal RGB illuminance.
- Cosine-integrated sky irradiance.
- Ground bounce derived from incident direct plus diffuse illumination.
- Atmosphere LUT bound as the PBR environment.
- Optional auto exposure, disabled by default in physical comparison tests.
- Diffuse- and specular-environment developer controls.
- Pure-CPU radiometric coupling tests.
- Locked-camera noon, golden, and sunset visual receipts.
- Boat-only image luminance comparison.

## Changed

- Direct sun now consumes atmosphere-derived chromaticity and magnitude.
- Diffuse environment no longer renormalizes every state to unit brightness.
- Renderer exposure is part of the shared state and remains fixed in validation comparisons.
- Sail transport settings are mapped through Beer–Lambert retention into the quarantined V17 backend.
- Atmosphere LUT updates are quality-cadenced during dynamics and immediate during static edits.

## Not claimed

V5 does not yet provide spectral/multiple-scattering atmosphere, ozone, SH probes, prefiltered local HDR probes, near-field GI, global camera color science, native sail/vinyl shaders, or water coupling. Dynamic rig/cloth/rope/crew physics and major draw-call costs also remain compatibility-owned.
