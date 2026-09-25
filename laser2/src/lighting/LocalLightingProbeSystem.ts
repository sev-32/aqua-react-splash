import type { AppContext, AppSystem } from '../core/System.js';
import type { LightingState } from './LightingState.js';
import type { RadiometricCouplingSystem } from './RadiometricCouplingSystem.js';

interface ProbeRecord {
  name: string;
  local: [number, number, number];
  radius: number;
  tint: [number, number, number];
  energyScale: number;
}

const PROBES: readonly ProbeRecord[] = [
  { name: 'deck', local: [0, 0.62, 0.10], radius: 2.8, tint: [1.00, 0.98, 0.91], energyScale: 0.95 },
  { name: 'main-sail', local: [0.18, 2.85, -0.35], radius: 3.2, tint: [1.00, 0.91, 0.72], energyScale: 0.70 },
  { name: 'jib', local: [-0.10, 2.15, 1.35], radius: 2.4, tint: [0.98, 0.92, 0.78], energyScale: 0.58 },
  { name: 'hull-port', local: [-0.86, 0.05, 0.05], radius: 2.2, tint: [0.72, 0.90, 1.00], energyScale: 0.52 },
  { name: 'hull-starboard', local: [0.86, 0.05, 0.05], radius: 2.2, tint: [0.72, 0.90, 1.00], energyScale: 0.52 },
  { name: 'water-ground', local: [0, -0.48, 0.15], radius: 4.5, tint: [0.36, 0.69, 0.88], energyScale: 0.82 },
] as const;

export class LocalLightingProbeSystem implements AppSystem {
  readonly id = 'lighting.local-probes';
  readonly phase = 'preRender' as const;
  enabled = true;
  private context: AppContext | null = null;
  private uniforms: Array<{ positions: any; colors: any; enabled: any; diffuse: any; specular: any }> = [];
  private patchedMaterials = 0;
  private shaderCompiles = 0;
  private outputInjections = 0;
  private worldPositionInjections = 0;
  private frames = 0;
  private updates = 0;
  private lastCpuMs = 0;
  private meanCpuMs = 0;
  private frameStride = 4;
  private worldPositions: number[][] = [];

  constructor(
    readonly settings: LightingState,
    readonly coupling: RadiometricCouplingSystem,
  ) {}

  init(context: AppContext): void {
    this.context = context;
    this.patchMaterials(context);
    this.settings.subscribe((next, previous) => {
      if (
        next.localProbesEnabled !== previous.localProbesEnabled ||
        next.localDiffuseBounceStrength !== previous.localDiffuseBounceStrength ||
        next.localSpecularProbeStrength !== previous.localSpecularProbeStrength
      ) context.requestRender('local lighting probes changed');
    });
    this.updateProbes(context);
  }

  update(_dtSeconds: number, context: AppContext): void {
    this.frames++;
    if (!context.state.get().dynamic || this.frames % this.frameStride === 0) this.updateProbes(context);
  }

  private patchMaterials(context: AppContext): void {
    const seen = new Set<any>();
    context.legacy.scene.traverse((object: any) => {
      if (!object?.isMesh || !object.material || object.userData?.foundryDiagnostic) return;
      const identity = `${object.name ?? ''} ${object.userData?.foundrySemanticId ?? ''}`.toLowerCase();
      const highValueReceiver = object.userData?.foundryBatchGenerated === true || /mast|boom|spreader|deck|hull/.test(identity);
      if (!highValueReceiver) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || seen.has(material) || (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial)) continue;
        if (material.userData?.foundryLocalProbePatched) continue;
        seen.add(material);
        const originalCompile = material.onBeforeCompile;
        const originalCache = material.customProgramCacheKey?.bind(material);
        material.onBeforeCompile = (shader: any, renderer: any) => {
          originalCompile?.(shader, renderer);
          // Three.js accepts contiguous Float32Array storage for uniform vec4 arrays.
          // This avoids depending on a global THREE.Vector4 constructor, which the
          // quarantined legacy bundle intentionally does not expose.
          const positions = new Float32Array(PROBES.length * 4);
          const colors = new Float32Array(PROBES.length * 4);
          const uniformSet = {
            positions: { value: positions },
            colors: { value: colors },
            enabled: { value: 1 },
            diffuse: { value: 0.85 },
            specular: { value: 0.55 },
          };
          shader.uniforms.uFoundryLocalProbePositionRadius = uniformSet.positions;
          shader.uniforms.uFoundryLocalProbeColorEnergy = uniformSet.colors;
          shader.uniforms.uFoundryLocalProbeEnabled = uniformSet.enabled;
          shader.uniforms.uFoundryLocalDiffuse = uniformSet.diffuse;
          shader.uniforms.uFoundryLocalSpecular = uniformSet.specular;
          const hadWorldPositionToken = shader.vertexShader.includes('#include <worldpos_vertex>');
          const hadOpaqueToken = shader.fragmentShader.includes('#include <opaque_fragment>');
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vFoundryLocalWorldPosition;')
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvFoundryLocalWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>\nvarying vec3 vFoundryLocalWorldPosition;\nuniform vec4 uFoundryLocalProbePositionRadius[${PROBES.length}];\nuniform vec4 uFoundryLocalProbeColorEnergy[${PROBES.length}];\nuniform float uFoundryLocalProbeEnabled;\nuniform float uFoundryLocalDiffuse;\nuniform float uFoundryLocalSpecular;`,
          );
          const localInjection = `if (uFoundryLocalProbeEnabled > 0.5) {\n  vec3 foundryViewDir = normalize(-vViewPosition);\n  vec3 foundryLocalRadiance = vec3(0.0);\n  for (int foundryProbeIndex = 0; foundryProbeIndex < ${PROBES.length}; foundryProbeIndex++) {\n    vec3 foundryDeltaWorld = uFoundryLocalProbePositionRadius[foundryProbeIndex].xyz - vFoundryLocalWorldPosition;\n    float foundryRadius = max(0.01, uFoundryLocalProbePositionRadius[foundryProbeIndex].w);\n    float foundryDistance = length(foundryDeltaWorld);\n    float foundryAttenuation = pow(max(0.0, 1.0 - foundryDistance / foundryRadius), 2.0);\n    vec3 foundryDirectionView = normalize(mat3(viewMatrix) * foundryDeltaWorld);\n    float foundryNdotL = max(dot(normal, foundryDirectionView), 0.0);\n    vec3 foundryEnergy = uFoundryLocalProbeColorEnergy[foundryProbeIndex].rgb * uFoundryLocalProbeColorEnergy[foundryProbeIndex].a * foundryAttenuation;\n    vec3 foundryHalf = normalize(foundryDirectionView + foundryViewDir);\n    float foundrySpecularLobe = pow(max(dot(normal, foundryHalf), 0.0), mix(64.0, 4.0, roughnessFactor));\n    foundryLocalRadiance += foundryEnergy * (diffuseColor.rgb * foundryNdotL * uFoundryLocalDiffuse * RECIPROCAL_PI + foundrySpecularLobe * uFoundryLocalSpecular);\n  }\n  outgoingLight += foundryLocalRadiance;\n}`;
          // Three.js r128 writes gl_FragColor inside opaque_fragment. Add the
          // local contribution before that commit; adding it before tone mapping
          // is too late because outgoingLight has already been copied.
          if (hadOpaqueToken) {
            shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `${localInjection}
#include <opaque_fragment>`);
          } else {
            const outputAssignment = 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );';
            if (shader.fragmentShader.includes(outputAssignment)) {
              shader.fragmentShader = shader.fragmentShader.replace(outputAssignment, `${localInjection}
${outputAssignment}`);
            }
          }
          if (hadWorldPositionToken && shader.vertexShader.includes('vFoundryLocalWorldPosition =')) this.worldPositionInjections++;
          if (shader.fragmentShader.includes('outgoingLight += foundryLocalRadiance') && (hadOpaqueToken || shader.fragmentShader.includes('gl_FragColor = vec4( outgoingLight'))) this.outputInjections++;
          this.uniforms.push(uniformSet);
          this.shaderCompiles++;
        };
        material.customProgramCacheKey = () => `${originalCache?.() ?? material.type}:foundry-local-probes-v7`;
        material.userData = material.userData ?? {};
        material.userData.foundryLocalProbePatched = true;
        material.needsUpdate = true;
        this.patchedMaterials++;
      }
    });
  }

  private updateProbes(context: AppContext): void {
    const started = performance.now();
    const settings = this.settings.get();
    const body = context.legacy.body;
    const Vec3 = body.pos.constructor;
    const budget = this.coupling.current;
    const incidentScale = Math.max(0, Math.min(2.5,
      (budget.skyIrradianceLux + budget.groundBounceLux + budget.directHorizontalLux * 0.18) / 25_000,
    ));
    const positions = PROBES.map((probe) => {
      const point = new Vec3(...probe.local);
      if (body.localToWorld) body.localToWorld(point, point);
      else point.applyQuaternion(body.quat).add(body.pos);
      return point;
    });
    this.worldPositions = positions.map((point) => point.toArray());
    for (const set of this.uniforms) {
      set.enabled.value = settings.localProbesEnabled ? 1 : 0;
      set.diffuse.value = Math.max(0, settings.localDiffuseBounceStrength);
      set.specular.value = Math.max(0, settings.localSpecularProbeStrength);
      for (let i = 0; i < PROBES.length; i++) {
        const probe = PROBES[i]!;
        const position = positions[i]!;
        const offset = i * 4;
        const positionBuffer = set.positions.value as Float32Array;
        positionBuffer[offset] = position.x;
        positionBuffer[offset + 1] = position.y;
        positionBuffer[offset + 2] = position.z;
        positionBuffer[offset + 3] = probe.radius;
        const energy = incidentScale * probe.energyScale;
        const colorBuffer = set.colors.value as Float32Array;
        colorBuffer[offset] = probe.tint[0];
        colorBuffer[offset + 1] = probe.tint[1];
        colorBuffer[offset + 2] = probe.tint[2];
        colorBuffer[offset + 3] = energy;
      }
    }
    this.updates++;
    this.lastCpuMs = performance.now() - started;
    this.meanCpuMs += (this.lastCpuMs - this.meanCpuMs) / this.updates;
  }

  telemetry(): Record<string, unknown> {
    const settings = this.settings.get();
    return {
      enabled: settings.localProbesEnabled,
      probeCount: PROBES.length,
      patchedMaterials: this.patchedMaterials,
      shaderCompiles: this.shaderCompiles,
      outputInjections: this.outputInjections,
      worldPositionInjections: this.worldPositionInjections,
      updateStrideFrames: this.frameStride,
      updates: this.updates,
      cpuMs: { last: this.lastCpuMs, mean: this.meanCpuMs },
      strengths: {
        diffuse: settings.localDiffuseBounceStrength,
        specular: settings.localSpecularProbeStrength,
      },
      probes: PROBES.map((probe, index) => ({ ...probe, worldPosition: this.worldPositions[index] ?? null })),
      receiverPolicy: 'static hull material batches plus mast/boom/spreader surfaces; sail and crew shaders remain untouched to contain compile cost',
      model: 'six analytic near-field irradiance/specular lobes fed by the atmosphere radiometric budget; no hidden lights',
      truthBoundary: 'Analytic local lobes approximate sail/deck/hull/water bounce. Parallax-corrected cubemap probes and real local GI remain future authorities.',
    };
  }
}
