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
import { RuntimeBudgetSystem } from './runtime/RuntimeBudgetSystem.js';

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

  const kernel = new AppKernel(legacy, telemetry, quality)
    .add(physics)
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

  window.LASER2_FOUNDRY = {
    version: 'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL_20260716',
    kernel,
    legacy,
    telemetry,
    quality,
    lighting,
    systems: { nativeHull, hullBatches, scene, coupling, atmosphere, sun, shadows, shProbe, environment, localProbes, cameraResponse, aerialPerspective, sailCloth, catalog, camera, selection, notes, markup, screenshot, materials, benchmarks, renderer, runtimeBudget, ui },
    snapshot: (deep = false) => kernel.snapshot({ deep }),
    runBenchmark: (id: BenchmarkId) => benchmarks.run(id),
    setDynamic: (enabled: boolean) => kernel.setDynamic(enabled),
    stepSimulation: (steps: number) => kernel.stepSimulation(steps),
  };

  await kernel.init();
  document.documentElement.dataset.foundryReady = 'true';
  console.info('LASER2_LIGHTING_FOUNDRY_V7 initialized', kernel.snapshot());
}

start().catch((error) => {
  document.documentElement.dataset.foundryError = String(error);
  console.error('LASER2 Lighting Foundry failed to initialize', error);
  const panel = document.createElement('pre');
  panel.className = 'fatal-error';
  panel.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  document.body.appendChild(panel);
});
