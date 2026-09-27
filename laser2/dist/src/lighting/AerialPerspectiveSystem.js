export class AerialPerspectiveSystem {
    settings;
    coupling;
    id = 'lighting.aerial-perspective';
    phase = 'preRender';
    enabled = true;
    context = null;
    patched = [];
    lastRevision = -1;
    patches = 0;
    updates = 0;
    shaderCompiles = 0;
    lastDensity = 0;
    constructor(settings, coupling) {
        this.settings = settings;
        this.coupling = coupling;
    }
    init(context) {
        this.context = context;
        const seen = new Set();
        context.legacy.scene.traverse((object) => {
            if (!object?.isMesh || !object.material)
                return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (!material || seen.has(material.id))
                    continue;
                if (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial)
                    continue;
                seen.add(material.id);
                this.patch(material);
            }
        });
        this.apply(true);
        this.settings.subscribe(() => {
            this.apply(true);
            context.requestRender('aerial perspective changed');
        });
    }
    update(_dtSeconds) {
        this.apply(false);
    }
    patch(material) {
        const record = {
            material,
            uniforms: [],
            originalOnBeforeCompile: material.onBeforeCompile,
            originalCacheKey: material.customProgramCacheKey,
        };
        const prior = material.onBeforeCompile?.bind?.(material);
        material.onBeforeCompile = (shader, renderer) => {
            prior?.(shader, renderer);
            shader.uniforms.uFoundryAerialColor = { value: material.color?.clone?.() ?? { x: 0.5, y: 0.6, z: 0.8 } };
            shader.uniforms.uFoundryAerialDensity = { value: 0 };
            shader.uniforms.uFoundryAerialEnabled = { value: 0 };
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uFoundryAerialColor;\nuniform float uFoundryAerialDensity;\nuniform float uFoundryAerialEnabled;`);
            const injection = `
        float foundryDistance = length(vViewPosition);
        float foundryTransmittance = exp(-max(0.0, uFoundryAerialDensity) * foundryDistance);
        outgoingLight = mix(uFoundryAerialColor, outgoingLight, mix(1.0, foundryTransmittance, uFoundryAerialEnabled));
      `;
            if (shader.fragmentShader.includes('#include <output_fragment>')) {
                shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', `${injection}\n#include <output_fragment>`);
            }
            else if (shader.fragmentShader.includes('#include <tonemapping_fragment>')) {
                shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', `${injection}\n#include <tonemapping_fragment>`);
            }
            record.uniforms.push(shader.uniforms);
            this.shaderCompiles++;
            this.writeUniforms(shader.uniforms);
        };
        const originalKey = material.customProgramCacheKey?.bind?.(material);
        material.customProgramCacheKey = () => `${originalKey?.() ?? material.type}:foundry-aerial-v6`;
        material.needsUpdate = true;
        this.patched.push(record);
        this.patches++;
    }
    writeUniforms(uniforms) {
        const settings = this.settings.get();
        const budget = this.coupling.current;
        const maxDistance = Math.max(1, settings.aerialPerspectiveMaxDistanceM);
        const density = -Math.log(0.02) / maxDistance * Math.max(0, settings.aerialPerspectiveStrength);
        this.lastDensity = density;
        const densityUniform = uniforms.uFoundryAerialDensity;
        const enabledUniform = uniforms.uFoundryAerialEnabled;
        const colorUniform = uniforms.uFoundryAerialColor;
        densityUniform.value = density;
        enabledUniform.value = settings.aerialPerspectiveEnabled ? 1 : 0;
        const color = budget.hemisphereSkyColor;
        const target = colorUniform.value;
        if (target?.setRGB)
            target.setRGB(color.r, color.g, color.b);
        else if (target?.set)
            target.set(color.r, color.g, color.b);
        else
            colorUniform.value = { x: color.r, y: color.g, z: color.b };
    }
    apply(force) {
        const revision = this.coupling.current.revision;
        if (!force && revision === this.lastRevision)
            return;
        this.lastRevision = revision;
        for (const record of this.patched)
            for (const uniforms of record.uniforms)
                this.writeUniforms(uniforms);
        this.updates++;
    }
    telemetry() {
        const settings = this.settings.get();
        return {
            patchedMaterials: this.patches,
            shaderCompiles: this.shaderCompiles,
            uniformSets: this.patched.reduce((sum, record) => sum + record.uniforms.length, 0),
            updates: this.updates,
            enabled: settings.aerialPerspectiveEnabled,
            strength: settings.aerialPerspectiveStrength,
            maxDistanceM: settings.aerialPerspectiveMaxDistanceM,
            densityMInv: this.lastDensity,
            authority: 'distance-dependent atmospheric transmittance and in-scatter applied before material output',
            truthBoundary: 'global RGB aerial perspective with atmosphere-derived in-scatter color; per-pixel altitude paths and volumetric clouds remain future work',
        };
    }
    dispose() {
        for (const record of this.patched) {
            record.material.onBeforeCompile = record.originalOnBeforeCompile;
            record.material.customProgramCacheKey = record.originalCacheKey;
            record.material.needsUpdate = true;
        }
        this.patched.length = 0;
    }
}
//# sourceMappingURL=AerialPerspectiveSystem.js.map