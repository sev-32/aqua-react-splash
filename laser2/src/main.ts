import { AppKernel } from './core/AppKernel.js';
import { LegacyRuntimeAdapter } from './legacy/LegacyRuntimeAdapter.js';
import { RigRuntimeSystem } from './legacy/RigRuntimeSystem.js';
import { AnchoredPhysicsSystem } from './physics/AnchoredPhysicsSystem.js';
import { RenderSystem } from './render/RenderSystem.js';
import { NativeHullAssetSystem } from './scene/NativeHullAssetSystem.js';
import { NativeHullBatchSystem } from './scene/NativeHullBatchSystem.js';
import { BoatSceneSystem } from './scene/BoatSceneSystem.js';
import { TelemetryHub } from './telemetry/TelemetryHub.js';
import { QualityManager } from './quality/QualityManager.js';
import { LightingState } from './lighting/LightingState.js';
import { SunSkySystem } from './lighting/SunSkySystem.js';
import { RadiometricCouplingSystem } from './lighting/RadiometricCouplingSystem.js';
import { AtmosphereSystem } from './lighting/atmosphere/AtmosphereSystem.js';
import { ShadowSystem } from './lighting/ShadowSystem.js';
import { EnvironmentSystem } from './lighting/EnvironmentSystem.js';
import { SphericalHarmonicProbeSystem } from './lighting/SphericalHarmonicProbeSystem.js';
import { CameraResponseSystem } from './lighting/CameraResponseSystem.js';
import { AerialPerspectiveSystem } from './lighting/AerialPerspectiveSystem.js';
import { LocalLightingProbeSystem } from './lighting/LocalLightingProbeSystem.js';
import { MaterialRegistrySystem } from './lighting/MaterialRegistrySystem.js';
import { WaterLightingSystem } from './lighting/WaterLightingSystem.js';
import { SailClothController } from './lighting/materials/SailClothController.js';
import { VinylController } from './lighting/materials/VinylController.js';
import { MetalController } from './lighting/materials/MetalController.js';
import { HullController } from './lighting/materials/HullController.js';
import { ObjectCatalogSystem } from './inspection/ObjectCatalogSystem.js';
import { CameraControllerSystem } from './inspection/CameraControllerSystem.js';
import { SelectionSystem } from './inspection/SelectionSystem.js';
import { NotesSystem } from './inspection/NotesSystem.js';
import { MarkupSystem } from './inspection/MarkupSystem.js';
import { ScreenshotSystem } from './inspection/ScreenshotSystem.js';
import { BenchmarkRunnerSystem, type BenchmarkId } from './benchmark/BenchmarkRunnerSystem.js';
import { DeveloperShellSystem } from './ui/DeveloperShellSystem.js';
import { SailingHudSystem } from './ui/SailingHudSystem.js';
import { RuntimeBudgetSystem } from './runtime/RuntimeBudgetSystem.js';
import { OceanSystem } from './water/OceanSystem.js';
import { WaterSurfaceSystem } from './water/WaterSurfaceSystem.js';
import { ScenePipeline } from './render/ScenePipeline.js';
import { SailingPhysicsSystem } from './sailing/SailingPhysicsSystem.js';
import { SailingModeSystem } from './sailing/SailingModeSystem.js';
import { SailWaterSystem } from './sailing/SailWaterSystem.js';
import { PhysicsStepBus } from './sailing/PhysicsStepBus.js';
import { CrewRecoverySystem } from './crew/CrewRecoverySystem.js';
import type { FoundryMode } from './core/System.js';

async function start(): Promise<void> {
  const legacy = new LegacyRuntimeAdapter();
  const telemetry = new TelemetryHub();
  const queryQuality = new URLSearchParams(location.search).get('quality');
  const quality = new QualityManager((['reference', 'high', 'balanced', 'fast', 'cpu-reference'].includes(queryQuality ?? '') ? queryQuality : 'balanced') as any);
  const lighting = new LightingState();

  const physics = new AnchoredPhysicsSystem();
  const nativeHull = new NativeHullAssetSystem();
  const hullBatches = new NativeHullBatchSystem(nativeHull);
  const scene = new BoatSceneSystem(nativeHull);
  const catalog = new ObjectCatalogSystem(scene);
  const camera = new CameraControllerSystem();
  const selection = new SelectionSystem(catalog, camera);
  const notes = new NotesSystem();
  const markup = new MarkupSystem();
  const renderer = new RenderSystem();
  const screenshot = new ScreenshotSystem(markup, selection, notes, renderer);
  const materials = new MaterialRegistrySystem();
  const benchmarks = new BenchmarkRunnerSystem(lighting, renderer);
  const runtimeBudget = new RuntimeBudgetSystem(physics, renderer);
  const coupling = new RadiometricCouplingSystem(lighting);
  const atmosphere = new AtmosphereSystem(lighting, coupling);
  const sun = new SunSkySystem(lighting, coupling);
  const shadows = new ShadowSystem(lighting);
  const shProbe = new SphericalHarmonicProbeSystem(lighting, coupling);
  const environment = new EnvironmentSystem(lighting, coupling, atmosphere);
  const localProbes = new LocalLightingProbeSystem(lighting, coupling);
  const cameraResponse = new CameraResponseSystem(lighting, coupling);
  const aerialPerspective = new AerialPerspectiveSystem(lighting, coupling);
  const sailCloth = new SailClothController(lighting, coupling);
  const stepBus = new PhysicsStepBus(() => {
    const time = window.LASER2_CREW_RIGGING_MASTER_V2?.water?.time;
    return Number.isFinite(time) ? time : 0;
  });
  const ocean = new OceanSystem(stepBus);
  const sailingPhysics = new SailingPhysicsSystem(ocean);
  const crewRecovery = new CrewRecoverySystem(ocean, sailingPhysics, stepBus);
  const sailWater = new SailWaterSystem(ocean);
  const sailingMode = new SailingModeSystem().addAuthority(ocean).addAuthority(sailingPhysics).addAuthority(sailWater).addAuthority(crewRecovery);
  const waterSurface = new WaterSurfaceSystem(ocean, coupling, atmosphere, lighting);
  renderer.attachPipeline(new ScenePipeline(waterSurface, atmosphere));

  const kernel = new AppKernel(legacy, telemetry, quality)
    .add(sailingMode)
    .add(ocean)
    .add(sailingPhysics)
    .add(physics)
    .add(crewRecovery)
    .add(sailWater)
    .add(new RigRuntimeSystem())
    .add(nativeHull)
    .add(hullBatches)
    .add(scene)
    .add(catalog)
    .add(camera)
    .add(coupling)
    .add(sun)
    .add(shadows)
    // Camera owns the current view transform; sky recentering occurs after it.
    .add(atmosphere)
    .add(shProbe)
    .add(environment)
    .add(localProbes)
    .add(cameraResponse)
    .add(aerialPerspective)
    .add(new WaterLightingSystem())
    .add(waterSurface)
    .add(materials)
    .add(sailCloth)
    .add(new VinylController(lighting))
    .add(new MetalController(lighting))
    .add(new HullController(lighting))
    .add(selection)
    .add(notes)
    .add(markup)
    .add(screenshot)
    .add(benchmarks)
    .add(renderer)
    .add(runtimeBudget);

  const ui = new DeveloperShellSystem(catalog, selection, camera, notes, markup, screenshot, lighting, materials, benchmarks);
  kernel.add(ui);
  const sailingHud = new SailingHudSystem(crewRecovery, camera, ocean);
  kernel.add(sailingHud);
  camera.bindSailing({
    waterHeight: (x, z) => ocean.height(x, z),
    crewFocus: () => crewRecovery.cameraFocus(),
  });

  window.LASER2_FOUNDRY = {
    version: 'LASER2_SAILING_FOUNDRY_V8_CAPSIZE_RECOVERY',
    kernel,
    legacy,
    telemetry,
    quality,
    lighting,
    systems: { sailingHud, ocean, waterSurface, sailingPhysics, sailWater, sailingMode, crewRecovery, nativeHull, hullBatches, scene, coupling, atmosphere, sun, shadows, shProbe, environment, localProbes, cameraResponse, aerialPerspective, sailCloth, catalog, camera, selection, notes, markup, screenshot, materials, benchmarks, renderer, runtimeBudget, ui },
    snapshot: (deep = false) => kernel.snapshot({ deep }),
    runBenchmark: (id: BenchmarkId) => benchmarks.run(id),
    setDynamic: (enabled: boolean) => kernel.setDynamic(enabled),
    setMode: (mode: FoundryMode) => kernel.setMode(mode),
    stepSimulation: (steps: number) => kernel.stepSimulation(steps),
  };

  await kernel.init();
  document.documentElement.dataset.foundryReady = 'true';
  console.info('LASER2_SAILING_FOUNDRY_V8 initialized', kernel.snapshot());
  // Sailing is the default experience; ?mode=inspect / ?mode=anchored open the
  // static lighting foundry or the anchored rig lab instead.
  const requestedMode = new URLSearchParams(location.search).get('mode') ?? 'sailing';
  if (requestedMode === 'sailing' || requestedMode === 'anchored') kernel.setMode(requestedMode);
}

start().catch((error) => {
  document.documentElement.dataset.foundryError = String(error);
  console.error('LASER2 Lighting Foundry failed to initialize', error);
  const panel = document.createElement('pre');
  panel.className = 'fatal-error';
  panel.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  document.body.appendChild(panel);
});
