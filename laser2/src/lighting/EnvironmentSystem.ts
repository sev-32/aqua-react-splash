import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';
import type { AtmosphereSystem } from './atmosphere/AtmosphereSystem.js';

export class EnvironmentSystem implements AppSystem {
  readonly id = 'lighting.environment';
  readonly phase = 'preRender' as const;
  enabled = true;
  private context: AppContext | null = null;
  private readonly secondaryHemisphereLights: any[] = [];
  private readonly ambientLights: any[] = [];
  private readonly pbrMaterials = new Set<any>();
  private lastBudgetRevision = -1;
  private updates = 0;
  private environmentAssignments = 0;
  private materialBindings = 0;
  private lastCpuMs = 0;
  private meanCpuMs = 0;
  private textureVersion = -1;

  constructor(
    readonly settings: LightingState,
    readonly coupling: RadiometricCouplingSystem,
    readonly atmosphere: AtmosphereSystem,
  ) {}

  init(context: AppContext): void {
    this.context = context;
    context.legacy.scene.traverse((object: any) => {
      if (object.isHemisphereLight) this.secondaryHemisphereLights.push(object);
      if (object.isAmbientLight) this.ambientLights.push(object);
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) this.pbrMaterials.add(material);
      }
    });
    for (const light of this.secondaryHemisphereLights) light.intensity = 0;
    for (const light of this.ambientLights) light.intensity = 0;
    this.bindEnvironment(context, true);
    this.applyBudget(context, true);
    this.settings.subscribe(() => {
      this.applyBudget(context, true);
      context.requestRender('environment energy changed');
    });
    context.quality.subscribe(() => {
      this.applyBudget(context, true);
      context.requestRender('environment quality changed');
    });
  }

  update(_dtSeconds: number, context: AppContext): void {
    this.bindEnvironment(context, false);
    this.applyBudget(context, false);
  }

  private bindEnvironment(context: AppContext, force: boolean): void {
    const texture = this.atmosphere.environmentTexture;
    if (!texture) return;
    if (force || context.legacy.scene.environment !== texture) {
      texture.mapping = 303; // THREE.EquirectangularReflectionMapping
      context.legacy.scene.environment = texture;
      this.environmentAssignments++;
    }
    if (texture.version !== this.textureVersion) {
      this.textureVersion = texture.version;
      // Three.js rebuilds the PMREM conversion when the source texture version
      // changes. The explicit flag records that this is an intended update.
      texture.needsUpdate = true;
    }
  }

  private applyBudget(context: AppContext, force: boolean): void {
    const budget = this.coupling.current;
    if (!force && budget.revision === this.lastBudgetRevision) return;
    const started = performance.now();
    this.lastBudgetRevision = budget.revision;

    // Global diffuse illumination is owned by SphericalHarmonicProbeSystem.
    // All constant hemisphere and ambient fills remain retired here.
    for (const light of this.secondaryHemisphereLights) light.intensity = 0;
    for (const light of this.ambientLights) light.intensity = 0;

    const scene: any = context.legacy.scene;
    const sceneIntensityAuthority = 'environmentIntensity' in scene;
    if (sceneIntensityAuthority) scene.environmentIntensity = budget.specularEnvironmentIntensity;
    for (const material of this.pbrMaterials) {
      if ('envMapIntensity' in material) material.envMapIntensity = sceneIntensityAuthority ? 1 : budget.specularEnvironmentIntensity;
      // Remove stale per-material maps so every PBR surface consumes the shared
      // atmosphere environment. The scene-level environment remains cached and
      // prefiltered by the renderer.
      if (material.envMap && material.envMap !== this.atmosphere.environmentTexture) {
        material.envMap = null;
        material.needsUpdate = true;
      }
      this.materialBindings++;
    }

    this.lastCpuMs = performance.now() - started;
    this.meanCpuMs += (this.lastCpuMs - this.meanCpuMs) / (this.updates + 1);
    this.updates++;
  }

  telemetry(): Record<string, unknown> {
    const budget = this.coupling.current;
    return {
      updates: this.updates,
      cpuMs: { last: this.lastCpuMs, mean: this.meanCpuMs },
      authoritativeHemisphereFound: false,
      disabledSecondaryHemisphereLights: this.secondaryHemisphereLights.length,
      disabledAmbientLights: this.ambientLights.length,
      pbrMaterials: this.pbrMaterials.size,
      materialBindings: this.materialBindings,
      environmentAssignments: this.environmentAssignments,
      environmentTextureBound: this.context?.legacy.scene.environment === this.atmosphere.environmentTexture,
      environmentTextureVersion: this.textureVersion,
      skyIrradianceRgbLux: budget.skyIrradianceRgbLux,
      skyIrradianceLux: budget.skyIrradianceLux,
      groundBounceRgbLux: budget.groundBounceRgbLux,
      groundBounceLux: budget.groundBounceLux,
      hemisphereIntensity: budget.hemisphereIntensity,
      specularEnvironmentIntensity: budget.specularEnvironmentIntensity,
      sceneEnvironmentIntensityAuthority: this.context ? ('environmentIntensity' in (this.context.legacy.scene as any)) : false,
      authority: 'atmosphere LUT drives prefiltered PBR reflections; order-2 SH diffuse illumination is owned by lighting.sh-diffuse-probe',
      truthBoundary: 'renderer PMREM/equirectangular reflection coupling is active; local specular probes and near-field interreflection remain future authorities',
    };
  }
}
