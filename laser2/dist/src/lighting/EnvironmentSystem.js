export class EnvironmentSystem {
    settings;
    coupling;
    atmosphere;
    id = 'lighting.environment';
    phase = 'preRender';
    enabled = true;
    context = null;
    secondaryHemisphereLights = [];
    ambientLights = [];
    pbrMaterials = new Set();
    lastBudgetRevision = -1;
    updates = 0;
    environmentAssignments = 0;
    materialBindings = 0;
    lastCpuMs = 0;
    meanCpuMs = 0;
    textureVersion = -1;
    constructor(settings, coupling, atmosphere) {
        this.settings = settings;
        this.coupling = coupling;
        this.atmosphere = atmosphere;
    }
    init(context) {
        this.context = context;
        context.legacy.scene.traverse((object) => {
            if (object.isHemisphereLight)
                this.secondaryHemisphereLights.push(object);
            if (object.isAmbientLight)
                this.ambientLights.push(object);
            if (!object.isMesh || !object.material)
                return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (!material)
                    continue;
                if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)
                    this.pbrMaterials.add(material);
            }
        });
        for (const light of this.secondaryHemisphereLights)
            light.intensity = 0;
        for (const light of this.ambientLights)
            light.intensity = 0;
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
    update(_dtSeconds, context) {
        this.bindEnvironment(context, false);
        this.applyBudget(context, false);
    }
    bindEnvironment(context, force) {
        const texture = this.atmosphere.environmentTexture;
        if (!texture)
            return;
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
    applyBudget(context, force) {
        const budget = this.coupling.current;
        if (!force && budget.revision === this.lastBudgetRevision)
            return;
        const started = performance.now();
        this.lastBudgetRevision = budget.revision;
        // Global diffuse illumination is owned by SphericalHarmonicProbeSystem.
        // All constant hemisphere and ambient fills remain retired here.
        for (const light of this.secondaryHemisphereLights)
            light.intensity = 0;
        for (const light of this.ambientLights)
            light.intensity = 0;
        const scene = context.legacy.scene;
        const sceneIntensityAuthority = 'environmentIntensity' in scene;
        if (sceneIntensityAuthority)
            scene.environmentIntensity = budget.specularEnvironmentIntensity;
        for (const material of this.pbrMaterials) {
            if ('envMapIntensity' in material)
                material.envMapIntensity = sceneIntensityAuthority ? 1 : budget.specularEnvironmentIntensity;
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
    telemetry() {
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
            sceneEnvironmentIntensityAuthority: this.context ? ('environmentIntensity' in this.context.legacy.scene) : false,
            authority: 'atmosphere LUT drives prefiltered PBR reflections; order-2 SH diffuse illumination is owned by lighting.sh-diffuse-probe',
            truthBoundary: 'renderer PMREM/equirectangular reflection coupling is active; local specular probes and near-field interreflection remain future authorities',
        };
    }
}
//# sourceMappingURL=EnvironmentSystem.js.map