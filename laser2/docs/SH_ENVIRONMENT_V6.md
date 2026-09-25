# SH Diffuse and HDR Specular Environment V6

## Diffuse authority

`SphericalHarmonicProbeSystem` projects the atmosphere into nine RGB order-2 spherical-harmonic coefficients. The resulting LightProbe replaces constant ambient and hemisphere lights.

The projection is rebuilt from the current sun direction, atmosphere settings, quality sample count, and global chromatic-adaptation state.

This is a global probe. It does not encode local occlusion, sail blocking, interior/cockpit visibility, or object-to-object bounce.

## Specular authority

`EnvironmentSystem` binds the floating-point atmosphere texture as `scene.environment` and applies one explicit material intensity. The V5 environment brightness multiplier was removed because the HDR texture now retains atmosphere radiance.

The renderer's environment path provides roughness-dependent prefiltering. V6 does not yet create local cubemap probes for hull, mast, vinyl, or water interactions.

## Required future extension

- local irradiance/reflection probe volume around the boat;
- visibility-aware probe weighting;
- temporal and movement-driven probe invalidation;
- sail/deck/water near-field bounce;
- selective high-quality screen-space contribution;
- measured energy accounting between global and local terms.
