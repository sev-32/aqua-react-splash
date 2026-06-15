# MLS-MPM: shader parity, connective tendrils, splash-back, full controls

The MPM fluid currently uses a generic `MeshPhysicalMaterial` on `MarchingCubes`. It looks nothing like the height-field water because it ignores the entire `waterShaders.ts` lighting model (sky cube reflection, refractive sphere/floor sampling, caustics, fresnel, IOR=1.333, abovewater/underwater color tints). This plan fixes that and adds the missing controls and feedback into the height field.

## 1. Render MPM fluid with the height-field water shader

Build a new `splashWaterShader` that reuses the same `helpers` + `surfaceRayBody` block from `src/shaders/waterShaders.ts` (sky cube, fresnel mix, refract through sphere/walls/floor, caustic sampling, `abovewaterColor`/`underwaterColor` tints, IOR 1.333) — but driven by the *mesh's own world-space normal and position* instead of a 2D height field.

- Apply this shader to the `MarchingCubes` mesh in `SplashParticles.tsx` (replaces `MeshPhysicalMaterial`).
- Vertex shader: forward `vWorldPos`, `vWorldNormal`.
- Fragment: compute incoming ray from `eye`, fresnel, reflected = `getSurfaceRayColor(pos, reflect(...), abovewaterColor)`, refracted = `getSurfaceRayColor(pos, refract(...), abovewaterColor)`, mix by fresnel. Add specular highlight against `light`.
- Wire the same uniforms (`sky`, `tiles`, `water`, `causticTex`, `eye`, `light`, `sphereCenter`, `sphereRadius`) from `WaterScene`. The droplet surface will then reflect the same sky, refract the same pool walls/floor, and tint identically to the main water surface.

## 2. Persistent metaball connectivity with tendril break

Replace per-frame stateless bridge sampling with a maintained connection graph:

- New `ConnectivityGraph` (in `src/lib/mpmConnectivity.ts`): a sparse map keyed by particle pair `(i,j)`. On each frame, form connections where `dist < formRadius`; existing connections survive until `dist > breakRadius` (hysteresis → trailing tendrils). Each connection stores `age`, `strength` that decays as it stretches.
- Connections render as N intermediate metaballs sampled along the segment (count proportional to stretch), with per-sample strength that thins toward the middle when about to snap. This produces visible drawn-out filaments that pinch off, not instant disconnects.
- All thresholds (`formRadius`, `breakRadius`, `tendrilSamples`, `tendrilThinPower`) live in `waterStore.mpmParams` and feed the loop.

## 3. Splash-back → height-field ripples

When an airborne particle crosses `y = waterSim.sampleHeight(x,z)` going downward, emit a ripple proportional to impact normal-velocity and particle density. Done inside the MPM step loop in `mlsmpm.ts` (extend `settleEvents` to fire on first surface-crossing, not just final settle) so even fast-moving particles produce visible impact rings before they're absorbed. `useMlsMpm.drainSettleEvents` already pipes these to `waterSim.addDrop`; we just need richer events (strength scaled by `|vy|^1.5 * density`, configurable gain).

## 4. Full parameter panel

Extend `waterStore` with an `mpmParams` group, and add a collapsible "MPM Fluid" section in `WaterUI.tsx`:

- Particle size (metaball `subtract`/strength scale)
- Metaball isolation (surface threshold)
- Form radius / Break radius (tendril hysteresis)
- Tendril samples (filament resolution)
- Splash-back gain (ripple strength multiplier)
- Spawn threshold (min impact speed to spawn particles)
- Spawn count multiplier
- Lifetime multiplier
- Reflection / refraction balance, color tint (abovewater RGB)

All read live every frame; no remount required.

## Technical

```text
src/shaders/waterShaders.ts            + splashVertexShader, splashFragmentShader
                                       (re-uses helpers + surfaceRayBody)
src/lib/mpmConnectivity.ts             NEW: persistent pair graph w/ hysteresis
src/lib/mlsmpm.ts                      surface-crossing event (not just settle)
src/components/SplashParticles.tsx     ShaderMaterial w/ shared uniforms,
                                       connectivity-driven addBall sampling,
                                       reads mpmParams from store
src/components/WaterScene.tsx          pass eye/sky/tiles/water/caustics
                                       uniforms into SplashParticles
src/lib/waterStore.ts                  + mpmParams state group
src/components/WaterUI.tsx             + collapsible MPM Fluid panel
```

Result: the MPM droplet surface will look identical in lighting/refraction/color to the main water; particles will form and break filaments rather than pop in/out; splashes will create real ripples when they fall back; every parameter is live-tunable.
