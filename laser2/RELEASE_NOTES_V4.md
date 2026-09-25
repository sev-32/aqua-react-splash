# Release notes — V4 atmosphere and sunlight

## Added

- `AtmosphereSystem`: CPU-integrated equirectangular single-scattering LUT with constant-cost GPU sampling.
- `AtmosphereMath`: deterministic Rayleigh/Mie optical depth, scattering, solar transmittance, and SH projection reference functions.
- `SunSkySystem`: atmosphere-attenuated directional sun derived from elevation, azimuth, and illuminance controls.
- `EnvironmentSystem`: measured low-frequency sky and ground irradiance projection.
- Quality-profile atmosphere sampling and LUT dimensions.
- Sun, atmosphere, exposure, environment, and performance developer pages.
- `atmosphere-sweep` isolated benchmark.
- CPU atmosphere-reference test lane.
- Noon, golden-hour, sunset, and backlit visual receipts.
- Camera/sky ordering regression check preventing finite sky-sphere exposure after view jumps.

## Correctness changes

- Legacy ambient light is disabled rather than stacked with the new environment authority.
- Legacy sky is disabled and retained only as a compatibility input.
- Shadow invalidation now responds to the atmosphere-owned sun transform.
- The sky is recentered after camera updates in the pre-render phase.
- The sky sphere was reduced from 48 × 24 to 32 × 16 segments because angular radiance comes from the LUT, not geometric tessellation.
- A sky-only white-balance control was removed. White balance is a camera/output transform and must not affect only the background; it remains deferred until a global post-processing authority exists.

## Preserved

- V3 fixed-step scheduling.
- Exclusive `RenderSystem` authority.
- Retained GL-error telemetry.
- Semantic scene catalog.
- Binary native static hull and resource retirement.
- Quarantined compatibility boundary for unmigrated dynamic systems.
