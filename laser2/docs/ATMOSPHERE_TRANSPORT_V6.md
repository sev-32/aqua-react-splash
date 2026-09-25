# Atmosphere Transport V6

## Authority

`AtmosphereSystem` owns the visible sky and global environment texture. `RadiometricCouplingSystem` owns the shared energy budget. `SunSkySystem`, `SphericalHarmonicProbeSystem`, `EnvironmentSystem`, `CameraResponseSystem`, and `AerialPerspectiveSystem` consume that budget.

No secondary sky, ambient light, or time-of-day normalization is allowed to restore a fixed scene brightness.

## Transport model

Implemented:

- spherical Earth and atmosphere domains;
- exponential Rayleigh and aerosol density profiles;
- triangular ozone density profile centered at 25 km;
- RGB Rayleigh, Mie, and ozone extinction;
- direct single-scattering integration;
- bounded dual-scattering energy recovery;
- ground-intersection and lower-hemisphere contribution;
- configurable quality-dependent view and solar samples.

The higher-order term restores a low-frequency portion of escaped energy according to optical thickness. It is intentionally labeled an approximation and is not a full multi-order precomputed scattering solution.

## Spectral direct solar

`SpectralSolar.ts` integrates 15 wavelength samples from 360–780 nm. It includes:

- 5,778 K Planck source;
- Kasten–Young air mass;
- wavelength-dependent Rayleigh extinction;
- Angstrom aerosol extinction;
- compact ozone Chappuis absorption;
- analytic CIE 1931 matching functions;
- conversion to linear sRGB and photopic transmission.

The spectral calculation drives direct-normal energy and sun chromaticity. Sky transport remains RGB in V6.

## Floating-point environment

The atmosphere LUT is stored as an RGBA32F DataTexture-compatible payload when WebGL2 floating-point texture support is available. The same environment is used by the visible sky and the PBR reflection path. The renderer performs its normal equirectangular-to-prefiltered environment conversion.

## Invalidation

The atmosphere product is dirty when atmosphere, solar, chromatic-adaptation, or quality inputs change. Camera recentering moves the sky geometry but does not require a LUT reconstruction.

## Performance boundary

The current LUT is reconstructed synchronously on the main thread. This is acceptable for static developer inspection but not final for interactive atmosphere scrubbing. A worker/incremental LUT pipeline is the next runtime optimization for this authority.
