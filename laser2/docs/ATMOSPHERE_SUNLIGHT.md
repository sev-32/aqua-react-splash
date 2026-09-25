# Atmosphere and sunlight authority

## Design objective

Atmosphere and solar lighting are independent Foundry systems with explicit lifecycle, quality, invalidation, telemetry, benchmarks, and CPU-reference boundaries. They are not shader fragments embedded in the monolithic ocean reference.

The retained research reference supplied a useful Nishita-style structure and these baseline constants:

- planet radius: 6,371,000 m;
- atmosphere radius: 6,471,000 m;
- Rayleigh scale height: 8,500 m;
- aerosol/Mie scale height: 1,200 m;
- Rayleigh coefficients: `(5.802, 13.558, 33.1) × 10⁻⁶ m⁻¹`;
- Mie extinction: `21 × 10⁻⁶ m⁻¹`.

The reference remains under `references/` and does not execute.

## Systems

### `AtmosphereMath`

Deterministic CPU routines implement ray/sphere intersection, exponential density profiles, optical depth, Beer–Lambert transmittance, Rayleigh phase response, Mie phase response, and RGB single-scattered radiance. The same code runs in Node without WebGL.

### `AtmosphereSystem`

The system generates an equirectangular sky LUT only when relevant state is dirty or its dynamic quality cadence is due. The visible sky and PBR environment consume the same texture. The sky mesh recenters after camera updates, preventing finite-sphere exposure during static camera jumps.

### `RadiometricCouplingSystem`

This is V5’s central correction. It converts atmosphere and solar state into a shared energy budget: direct-normal and direct-horizontal RGB lux, cosine-integrated sky irradiance, ground bounce, renderer sun magnitude/chromaticity, diffuse hemisphere magnitude/chromaticity, PBR environment intensity, and exposure.

### `SunSkySystem`

The directional sun consumes the shared budget. It does not independently normalize or recolor the sun. The renderer consumes the same exposure authority.

### `EnvironmentSystem`

The diffuse environment consumes the measured sky/ground budget. The atmosphere LUT is bound to `scene.environment` for PBR reflections. The retained Three.js revision lacks a usable scene-level environment intensity, so V5 applies the shared specular scale to registered PBR materials.

## Quality contracts

| Profile | View samples | Solar samples | Sky LUT |
|---|---:|---:|---:|
| Reference | 24 | 8 | 256 × 128 |
| High | 16 | 6 | 192 × 96 |
| Balanced | 12 | 4 | 128 × 64 |
| Fast | 8 | 3 | 96 × 48 |
| CPU reference | 4 | 2 | 48 × 24 |

Quality changes integration count, angular resolution, filtering, and update cadence. It does not replace the physical model with unrelated fill lights.

## Invalidation

Changes to solar direction, illuminance, atmosphere density, anisotropy, turbidity, ground albedo, observer altitude, atmosphere enablement, exposure, environment scales, or quality dirty only the dependent systems.

- Sun transform or moving casters dirty shadows.
- Atmosphere changes dirty the LUT, radiometric budget, and environment.
- Exposure changes do not require shadow reconstruction.
- Static edits update immediately.
- Dynamic LUT work is quality-cadenced.

## Color-management boundary

Manual exposure is global and is fixed in the locked comparison evidence. Optional auto exposure is a camera response, not a source of physical illumination.

White balance is deliberately absent. It must be implemented as a global output transform affecting atmosphere, boat, sails, vinyl, metals, water, and diagnostics together.

## Remaining work

- ozone absorption;
- multiple scattering;
- spectral solar radiance;
- higher-order diffuse probes;
- prefiltered HDR specular environments;
- global camera color science;
- scene aerial perspective;
- cloud extinction and in-scattering;
- local object probes and near-field interreflection;
- water/atmosphere coupling.
