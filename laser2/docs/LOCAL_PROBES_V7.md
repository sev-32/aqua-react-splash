# Local Lighting Probes — V7

## Model

V7 adds six analytic near-field lighting lobes driven by the same atmosphere radiometric budget used by direct sun, sky irradiance, ground bounce, exposure, and sail transport.

Probe domains:

- deck;
- main sail;
- jib;
- hull port;
- hull starboard;
- water/ground.

Each probe has a world-space center, finite radius, RGB tint, and energy coefficient. The shader evaluates smooth radial attenuation, diffuse cosine response, and a roughness-dependent specular lobe.

## Receiver policy

To contain compilation cost, the system patches:

- seven generated static hull material batches;
- mast, boom, spreader, deck, and hull high-value PBR materials.

It does not yet patch the retained sail/crew shader authorities.

## Uniform transport

Positions/radii and colors/energies use contiguous `Float32Array` vec4 arrays. This avoids reliance on a globally exposed Three.js constructor and produces one compact upload per uniform array.

Local radiance is added before Three.js `opaque_fragment`. Injecting after that boundary would compile but could not affect the committed output color.

## Verification

The controlled enabled/disabled comparison changed:

- 13,713 pixels by at least two channel levels;
- 2,079 pixels by at least ten channel levels;
- maximum channel difference: 65;
- mean absolute channel difference: 0.0774.

No page, shader, retained-GL, or context errors occurred.

## Boundary

These are analytic local lobes, not geometric light transport. They do not provide occlusion, parallax-corrected reflection, visibility-aware irradiance, multi-bounce GI, or water-caustic transport. They are an explicit, inexpensive near-field authority that can later be replaced by measured local probes without changing material interfaces.
