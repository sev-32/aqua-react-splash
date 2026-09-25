# Camera Response and Aerial Perspective V6

## Global camera response

`CameraResponseSystem` is the sole renderer-level response authority:

- ACES-filmic tone mapping;
- one atmosphere-coupled exposure multiplier;
- sRGB output color space;
- one chromatic-adaptation state shared by sun, sky, SH, and ground contribution.

White balance is not applied to the sky alone. A sky-only transform would create inconsistent color between background, materials, reflections, and direct illumination.

The current Kelvin transform is a compact RGB adaptation approximation. A measured camera spectral-sensitivity and display-response pipeline remains future work.

## Aerial perspective

`AerialPerspectiveSystem` patches standard and physical PBR materials. It applies distance-dependent exponential transmittance and atmosphere-derived in-scatter before final material output.

Implemented:

- one configurable extinction density;
- shared in-scatter color from the radiometric budget;
- enable, strength, and maximum-distance controls;
- material and shader-compile telemetry.

Not implemented:

- altitude-varying path integration per pixel;
- terrain/boat shadowing of atmospheric volume;
- clouds, fog volumes, or water-volume coupling;
- separate wavelength-resolved aerial transport.
