# V6 Release Notes — Atmosphere Transport and Global Probes

## Added

- 15-band spectral direct-solar model with air mass, Rayleigh, aerosol, and ozone attenuation.
- Ozone density profile and compact Chappuis-band absorption.
- Bounded dual-scattering/higher-order atmospheric energy approximation.
- RGBA32F atmosphere environment texture under WebGL2.
- Order-2 spherical-harmonic global diffuse light probe.
- Global ACES-filmic tone mapping and one renderer exposure authority.
- Consistent chromatic adaptation across direct sun, atmosphere LUT, SH probe, and ground bounce.
- Distance-dependent aerial perspective for MeshStandardMaterial and MeshPhysicalMaterial surfaces.
- Developer controls and telemetry for the new authorities.
- CPU verification for spectral warming, ozone response, higher-order energy, SH coefficients, and white balance.
- Browser assertions proving the HDR texture, SH probe, camera response, aerial shader path, and PBR environment are active.

## Changed

- Constant ambient/hemisphere illumination is retired; global diffuse illumination comes from the atmosphere SH projection.
- PBR specular reflections consume the floating-point atmosphere environment without V5's compensating brightness multiplier.
- Environment, camera, and aerial updates are driven by the shared radiometric revision.

## Preserved

- Foundry-exclusive render authority.
- 60 Hz fixed-step runtime and bounded catch-up.
- Binary native static hull and exact topology parity.
- Quarantined compatibility backend for rig, cloth, rope, crew, collision, and remaining geometry.

## Known limits

- Higher-order atmosphere is an approximation, not a full multiple-scattering LUT.
- Direct solar is spectral; sky/material transport is still RGB.
- SH lighting is one global probe without local visibility or near-field bounce.
- Atmosphere LUT reconstruction is synchronous.
- Native sailcloth, vinyl, water, and dynamic rig authorities are not yet implemented.
- Scene draw-call count remains 648 in the integrated diagnostic view.
