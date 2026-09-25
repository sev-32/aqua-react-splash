# Radiometric coupling authority

## Problem corrected

V4 generated a physically structured sky and atmosphere-attenuated directional light, but the environmental lighting path renormalized sampled sky colors before applying them. The atmosphere LUT also served primarily as a visible backdrop rather than the reflection environment consumed by PBR materials. Consequently, the boat retained similar brightness at noon and sunset even while the background changed.

V5 removes that normalization. One `RadiometricCouplingSystem` computes the energy state consumed by all current lighting clients.

## Shared budget

The budget contains:

- solar direction;
- RGB atmospheric transmittance;
- direct-normal RGB lux;
- direct-horizontal RGB lux;
- cosine-integrated upper-hemisphere sky irradiance;
- lower-hemisphere ground bounce;
- normalized renderer sun color and magnitude;
- hemisphere sky/ground colors and magnitude;
- PBR environment intensity;
- manual or optional automatic exposure.

The current atmosphere is an RGB single-scattering model. Its radiance is converted to calibrated photometric units through explicit constants in `RadiometricCouplingSystem.ts`; no hidden per-state normalization is permitted.

## Consumers

`SunSkySystem`
: Applies the atmosphere-derived directional-light chromaticity and magnitude. It also applies the shared exposure to the renderer.

`AtmosphereSystem`
: Generates the visible equirectangular sky LUT. The same texture is exposed to the environment authority.

`EnvironmentSystem`
: Uses the shared sky/ground budget for diffuse hemispherical illumination and binds the atmosphere LUT to `scene.environment` for PBR reflections. Per-material `envMapIntensity` is used when the retained Three.js revision does not support scene-level environment intensity.

`SailClothController`
: Converts exposed absorption to Beer–Lambert retained transmission and maps the result into the quarantined V17 sail backend. This preserves the prior sail shader while making its incident-light scale participate in the shared settings authority.

## Exposure semantics

Manual exposure is fixed across the noon/golden/sunset verification. It is not used to hide physical energy differences.

Auto exposure is optional. When enabled, it computes an EV compensation from total horizontal illumination and a configured reference illuminance. Auto exposure changes camera response, not physical sun/sky energy.

## Verification contract

The CPU lane requires, at identical manual exposure and identical top-of-atmosphere solar source:

- noon direct-normal illuminance > sunset direct-normal illuminance;
- noon sky irradiance > sunset sky irradiance;
- noon ground bounce > sunset ground bounce;
- sunset direct light is chromatically warmer;
- manual exposure is numerically identical;
- optional auto exposure changes renderer exposure without changing physical light budgets.

The browser lane additionally verifies:

- the atmosphere LUT is bound as the PBR environment;
- PBR materials are coupled;
- the environment texture version changes when atmosphere state changes;
- a locked-camera boat-only image has a measurable luminance change;
- WebGL2, GL state, shaders, frame authority, and native hull parity remain valid.

## Truth boundary

This is calibrated RGB photometry, not a final spectral renderer. Multiple scattering, ozone, spectral absorption, camera color science, local probes, near-field GI, water coupling, and a fully native sailcloth BSDF remain future authorities.
