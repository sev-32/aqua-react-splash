(() => {
  "use strict";

  const VERSION = "LASER2_OPAQUE_SHEET_VINYL_OPTICS_V17_R2_20260715";
  const master = window.LASER2_CREW_RIGGING_MASTER_V2;
  const rigV16 = window.LASER2_RIGGING_V16;
  if (!master?.sails || !master?.scene || !rigV16) {
    console.error(`${VERSION}: V16 rigging runtime or sail exports are missing`);
    return;
  }

  const Vec3 = master.body.pos.constructor;
  const params = {
    enabled: true,

    // Cloth is deliberately NOT alpha blended. Apparent translucency comes
    // only from light transport through the sheet.
    clothOpacity: 1.0,
    clothDiffuseTransmission: 0.27,
    clothRoughness: 0.84,
    clothSheen: 0.07,
    clothSheenRoughness: 0.92,
    weaveContrast: 0.032,
    wetDarkening: 0.14,
    wetGloss: 0.20,
    transmittedRigShadow: 0.42,
    transmittedShadowBlurM: 0.095,
    sunlightScale: 0.36,

    // Clear sail-window vinyl. Reflection remains strong while the normal is
    // perturbed by broad sheet waviness and small crease fields.
    vinylOpacity: 1.0,
    vinylTransmission: 0.92,
    vinylThicknessM: 0.000508,
    vinylIor: 1.49,
    vinylRoughness: 0.09,
    vinylHaze: 0.06,
    vinylScratch: 0.06,
    vinylWaviness: 1.05,
    vinylCrease: 0.28,
  };

  const state = {
    initialized: false,
    finite: true,
    lastError: null,
    shaderCompiles: 0,
    clothMeshes: 0,
    vinylMeshes: 0,
    uniformsUpdated: 0,
    frame: 0,
    sourceModified: true,
    clothLightInjection: "pending",
    windowRegistration: "main texture seam + jib grid seam",
  };

  const sailEntries = [];
  const shaders = [];
  const vinylMeshes = [];
  const sunDirection = new Vec3(0.45, 0.52, 0.32).normalize();
  const sunColor = new Vec3(1, 1, 1);
  const tmp = new Vec3();
  let timeS = 0;

  function findSailMesh(system, expectedCount) {
    if (system?.cloth?.mesh?.isMesh) return system.cloth.mesh;
    let match = null;
    master.scene.traverse((object) => {
      if (
        !match &&
        object.isMesh &&
        object.geometry?.attributes?.position?.count === expectedCount &&
        object.material?.isMeshPhysicalMaterial
      ) match = object;
    });
    return match;
  }

  function windowGeometryGLSL(kind) {
    if (kind === "main") {
      // Registered to the 512 x 1024 source texture's sewn rectangle:
      // outer seam x 90..308, y 817..907; clear vinyl x 93..305, y 820..904.
      return `
        float rigWindowOuterSD(vec2 uv) {
          vec2 lo = vec2(0.17578125, 0.11425781);
          vec2 hi = vec2(0.60156250, 0.20214844);
          vec2 d = min(uv - lo, hi - uv);
          return min(d.x, d.y);
        }
        float rigWindowCoreSD(vec2 uv) {
          vec2 lo = vec2(0.18164063, 0.11621094);
          vec2 hi = vec2(0.59570313, 0.19921875);
          vec2 d = min(uv - lo, hi - uv);
          return min(d.x, d.y);
        }
      `;
    }
    if (kind === "jib") {
      // Exact sail-grid vertices: rows 1 and 3 of the 11-row cloth, with side
      // edges running from columns 1/4 to columns 2/3 of the 6-column cloth.
      return `
        float rigWindowOuterSD(vec2 uv) {
          float row = clamp((uv.y - 0.10) / 0.20, 0.0, 1.0);
          float left = mix(0.20, 0.40, row);
          float right = mix(0.80, 0.60, row);
          float vertical = min(uv.y - 0.10, 0.30 - uv.y);
          return min(vertical, min(uv.x - left, right - uv.x));
        }
        float rigWindowCoreSD(vec2 uv) {
          float row = clamp((uv.y - 0.10) / 0.20, 0.0, 1.0);
          float left = mix(0.20, 0.40, row) + 0.013;
          float right = mix(0.80, 0.60, row) - 0.013;
          float vertical = min(uv.y - 0.113, 0.287 - uv.y);
          return min(vertical, min(uv.x - left, right - uv.x));
        }
      `;
    }
    return `
      float rigWindowOuterSD(vec2 uv) { return -1.0; }
      float rigWindowCoreSD(vec2 uv) { return -1.0; }
    `;
  }

  function shaderHeader(kind, mastCount, boomCount) {
    return `
      uniform float uRigTime;
      uniform float uRigWetness;
      uniform float uClothTransmission;
      uniform float uWeaveContrast;
      uniform float uWetDarkening;
      uniform float uWetGloss;
      uniform float uRigShadowStrength;
      uniform float uRigShadowBlur;
      uniform float uSunlightScale;
      uniform vec3 uRigSunDir;
      uniform vec3 uRigSunColor;
      uniform vec3 uRigMast[${mastCount}];
      uniform vec3 uRigBoom[${boomCount}];
      varying vec3 vRigWorldPosition;
      varying vec3 vRigWorldNormal;

      ${windowGeometryGLSL(kind)}

      float rigSegmentShadow(vec3 ro, vec3 rd, vec3 a, vec3 b, float radius, float blur) {
        vec3 v = b - a;
        vec3 w = ro - a;
        float vv = max(dot(v, v), 1e-8);
        float rv = dot(rd, v);
        float rw = dot(rd, w);
        float vw = dot(v, w);
        float denom = max(vv - rv * rv, 1e-7);
        float s = clamp((vw - rv * rw) / denom, 0.0, 1.0);
        vec3 onSegment = a + v * s;
        float alongRay = max(0.0, dot(onSegment - ro, rd));
        vec3 onRay = ro + rd * alongRay;
        float distanceToRay = length(onRay - onSegment);
        float penumbra = 1.0 - smoothstep(radius, radius + blur, distanceToRay);
        return penumbra * step(0.004, alongRay);
      }

      float rigThroughShadow(vec3 worldPosition, vec3 toSun) {
        float occlusion = 0.0;
        for (int i = 0; i < ${mastCount - 1}; i++) {
          float f = float(i) / float(${Math.max(1, mastCount - 1)});
          float radius = mix(0.032, 0.022, f);
          occlusion = max(occlusion, rigSegmentShadow(
            worldPosition, toSun, uRigMast[i], uRigMast[i + 1], radius, uRigShadowBlur
          ));
        }
        for (int i = 0; i < ${boomCount - 1}; i++) {
          occlusion = max(occlusion, rigSegmentShadow(
            worldPosition, toSun, uRigBoom[i], uRigBoom[i + 1], 0.038, uRigShadowBlur
          ));
        }
        return 1.0 - uRigShadowStrength * occlusion;
      }
    `;
  }

  function vinylHeader(kind) {
    return `
      uniform float uRigTime;
      uniform float uRigWetness;
      uniform float uVinylHaze;
      uniform float uVinylScratch;
      uniform float uVinylWaviness;
      uniform float uVinylCrease;
      varying vec3 vRigWorldPosition;
      varying vec3 vRigWorldNormal;
      ${windowGeometryGLSL(kind)}

      float rigHash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float rigNoise21(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = rigHash21(i);
        float b = rigHash21(i + vec2(1.0, 0.0));
        float c = rigHash21(i + vec2(0.0, 1.0));
        float d = rigHash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float rigVinylHeight(vec2 uv) {
        float broad = (rigNoise21(uv * vec2(4.0, 3.0) + vec2(2.1, 7.7)) - 0.5) * 0.0032;
        broad += sin(uv.x * 17.0 + sin(uv.y * 11.0) * 1.15) * 0.00080;
        broad += sin(uv.y * 25.0 - uv.x * 6.5) * 0.00045;
        float creaseLine = abs(sin(uv.x * 15.0 + uv.y * 8.0 + rigNoise21(uv * 3.0) * 2.0));
        float crease = pow(max(0.0, 1.0 - creaseLine), 7.0) * 0.00075;
        return broad * uVinylWaviness + crease * uVinylCrease;
      }
    `;
  }

  function patchVertexShader(shader) {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vRigWorldPosition;
         varying vec3 vRigWorldNormal;`,
      )
      .replace(
        "#include <defaultnormal_vertex>",
        `#include <defaultnormal_vertex>
         vRigWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
         vRigWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
  }

  function installClothShader(material, kind) {
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
    material.alphaTest = 0.48;
    material.alphaToCoverage = true;
    material.roughness = params.clothRoughness;
    material.sheen = params.clothSheen;
    material.sheenRoughness = params.clothSheenRoughness;
    if (material.sheenColor?.setRGB) material.sheenColor.setRGB(0.58, 0.60, 0.62);
    material.metalness = 0;
    material.transmission = 0;
    material.thickness = 0;
    material.clearcoat = 0;
    if (material.emissive?.setRGB) material.emissive.setRGB(0, 0, 0);
    material.emissiveIntensity = 0;
    material.side = 2;
    material.forceSinglePass = false;
    material.premultipliedAlpha = false;
    material.needsUpdate = true;
    material.customProgramCacheKey = () => `${VERSION}:cloth:${kind}:2`;
    material.onBeforeCompile = (shader) => {
      const uniforms = {
        uRigTime: { value: timeS },
        uRigWetness: { value: 0 },
        uClothTransmission: { value: params.clothDiffuseTransmission },
        uWeaveContrast: { value: params.weaveContrast },
        uWetDarkening: { value: params.wetDarkening },
        uWetGloss: { value: params.wetGloss },
        uRigShadowStrength: { value: params.transmittedRigShadow },
        uRigShadowBlur: { value: params.transmittedShadowBlurM },
        uSunlightScale: { value: params.sunlightScale },
        uRigSunDir: { value: sunDirection.clone() },
        uRigSunColor: { value: sunColor.clone() },
        uRigMast: { value: master.rig.mast.map((p) => p.x.clone()) },
        uRigBoom: { value: master.rig.boom.map((p) => p.x.clone()) },
      };
      Object.assign(shader.uniforms, uniforms);
      patchVertexShader(shader);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
         ${shaderHeader(kind, master.rig.mast.length, master.rig.boom.length)}`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
         float rigOuterSd = rigWindowOuterSD(vMapUv);
         float rigCoreSd = rigWindowCoreSD(vMapUv);
         float rigOuterAa = max(fwidth(rigOuterSd) * 0.85, 0.00030);
         float rigCoreAa = max(fwidth(rigCoreSd) * 0.85, 0.00030);
         float rigOuterCoverage = smoothstep(-rigOuterAa, rigOuterAa, rigOuterSd);
         float rigCoreCoverage = smoothstep(-rigCoreAa, rigCoreAa, rigCoreSd);
         float rigTape = clamp(rigOuterCoverage - rigCoreCoverage, 0.0, 1.0);
         float rigBoundaryDistance = min(abs(rigOuterSd), abs(rigCoreSd));
         float rigStitch = 1.0 - smoothstep(0.00055, 0.0022 + rigOuterAa, rigBoundaryDistance);

         // Neutralize the source map inside the sewn window zone, then render
         // a matte reinforcing tape and a narrow seam. The clear core is cut
         // from the opaque sheet rather than alpha blended over the scene.
         vec3 rigTapeColor = vec3(0.76, 0.75, 0.68);
         diffuseColor.rgb = mix(diffuseColor.rgb, rigTapeColor, rigTape * 0.76);
         diffuseColor.rgb *= 1.0 - rigStitch * rigTape * 0.20;

         float weaveA = sin(vMapUv.x * 1040.0 + sin(vMapUv.y * 31.0) * 0.7);
         float weaveB = sin(vMapUv.y * 890.0 + sin(vMapUv.x * 27.0) * 0.6);
         float weave = weaveA * weaveB;
         float weaveFilter = clamp(
           0.7 / max(1.0, fwidth(vMapUv.x) * 1040.0 + fwidth(vMapUv.y) * 890.0),
           0.0, 1.0
         );
         diffuseColor.rgb *= 1.0 + uWeaveContrast * weave * weaveFilter * (1.0 - rigTape);
         diffuseColor.rgb *= 1.0 - uWetDarkening * uRigWetness;
         diffuseColor.a *= 1.0 - rigCoreCoverage;`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
         roughnessFactor = mix(
           roughnessFactor,
           max(0.58, roughnessFactor - uWetGloss),
           uRigWetness
         );
         roughnessFactor = clamp(roughnessFactor, 0.58, 0.98);`,
      );

      const lightInjection = `
         vec3 rigFaceNormal = normalize(vRigWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
         vec3 rigToSun = normalize(uRigSunDir);
         float rigBackHemisphere = max(dot(-rigFaceNormal, rigToSun), 0.0);
         float rigBacklit = smoothstep(0.015, 0.18, rigBackHemisphere) * pow(rigBackHemisphere, 0.58);
         vec3 rigToCamera = normalize(cameraPosition - vRigWorldPosition);
         float rigGrazing = pow(1.0 - abs(dot(rigFaceNormal, rigToCamera)), 1.5);
         float rigShadow = rigThroughShadow(vRigWorldPosition, rigToSun);
         float rigWeaveTransport = 0.97 + 0.03 * sin(vMapUv.x * 610.0) * sin(vMapUv.y * 570.0);
         float rigTransport = uClothTransmission * rigBacklit * rigShadow * uSunlightScale;
         vec3 rigTransmissionTint = diffuseColor.rgb * vec3(1.06, 0.99, 0.86);
         vec3 rigSheetIrradiance = uRigSunColor * rigTransmissionTint * rigTransport *
           rigWeaveTransport * mix(0.93, 1.08, rigGrazing);
      `;

      if (shader.fragmentShader.includes("#include <lights_fragment_end>")) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <lights_fragment_end>",
          `#include <lights_fragment_end>
           ${lightInjection}
           reflectedLight.indirectDiffuse += rigSheetIrradiance;`,
        );
        state.clothLightInjection = "indirect-diffuse sheet transport";
      } else {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           ${lightInjection}
           totalEmissiveRadiance += rigSheetIrradiance;`,
        );
        state.clothLightInjection = "fallback emissive transport";
      }

      shaders.push({ kind, type: "cloth", shader, uniforms });
      state.shaderCompiles++;
    };
  }

  function installVinylShader(material, kind) {
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
    material.alphaTest = 0.48;
    material.alphaToCoverage = true;
    material.roughness = params.vinylRoughness;
    material.metalness = 0;
    material.transmission = params.vinylTransmission;
    material.thickness = params.vinylThicknessM;
    material.ior = params.vinylIor;
    material.clearcoat = 0.46;
    material.clearcoatRoughness = 0.15;
    material.specularIntensity = 0.88;
    material.attenuationDistance = 2.4;
    if (material.attenuationColor?.setRGB) material.attenuationColor.setRGB(0.95, 0.985, 1.0);
    if (material.color?.setRGB) material.color.setRGB(0.96, 0.99, 1.0);
    if (material.emissive?.setRGB) material.emissive.setRGB(0, 0, 0);
    material.emissiveIntensity = 0;
    material.side = 2;
    material.forceSinglePass = false;
    material.premultipliedAlpha = false;
    material.needsUpdate = true;
    material.customProgramCacheKey = () => `${VERSION}:vinyl:${kind}:2`;
    material.onBeforeCompile = (shader) => {
      const uniforms = {
        uRigTime: { value: timeS },
        uRigWetness: { value: 0 },
        uVinylHaze: { value: params.vinylHaze },
        uVinylScratch: { value: params.vinylScratch },
        uVinylWaviness: { value: params.vinylWaviness },
        uVinylCrease: { value: params.vinylCrease },
      };
      Object.assign(shader.uniforms, uniforms);
      patchVertexShader(shader);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           ${vinylHeader(kind)}`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
           float rigCoreSd = rigWindowCoreSD(vMapUv);
           float rigCoreAa = max(fwidth(rigCoreSd) * 0.85, 0.00030);
           float rigCoreCoverage = smoothstep(-rigCoreAa, rigCoreAa, rigCoreSd);
           float rigEdgeScuff = 1.0 - smoothstep(0.0, 0.026, max(rigCoreSd, 0.0));
           float rigCloud = rigNoise21(vMapUv * vec2(8.0, 5.0) + vec2(4.3, 1.7));
           float rigScratchLine = pow(
             max(0.0, sin(vMapUv.x * 683.0 + vMapUv.y * 177.0 + rigCloud * 5.0)),
             38.0
           );
           diffuseColor.rgb = vec3(0.965, 0.989, 1.0);
           diffuseColor.rgb *= 1.0 - rigEdgeScuff * 0.025 - rigScratchLine * uVinylScratch * 0.045;
           diffuseColor.a *= rigCoreCoverage;`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
           float rigVinylH = rigVinylHeight(vMapUv);
           vec2 rigVinylDh = vec2(dFdx(rigVinylH), dFdy(rigVinylH));
           vec3 rigSigmaX = dFdx(vViewPosition);
           vec3 rigSigmaY = dFdy(vViewPosition);
           vec3 rigR1 = cross(rigSigmaY, normal);
           vec3 rigR2 = cross(normal, rigSigmaX);
           float rigDet = dot(rigSigmaX, rigR1);
           vec3 rigGradient = sign(rigDet) * (rigVinylDh.x * rigR1 + rigVinylDh.y * rigR2);
           normal = normalize(abs(rigDet) * normal - rigGradient);`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
           float rigRoughCloud = rigNoise21(vMapUv * vec2(13.0, 9.0));
           float rigScratchR = pow(
             max(0.0, sin(vMapUv.x * 683.0 + vMapUv.y * 177.0 + rigRoughCloud * 5.0)),
             34.0
           );
           float rigEdgeR = 1.0 - smoothstep(0.0, 0.024, max(rigWindowCoreSD(vMapUv), 0.0));
           roughnessFactor = clamp(
             roughnessFactor + uVinylHaze * 0.16 + rigRoughCloud * 0.018 +
             rigScratchR * uVinylScratch * 0.20 + rigEdgeR * 0.055,
             0.045,
             0.30
           );`,
        )
        .replace(
          "#include <lights_fragment_end>",
          `#include <lights_fragment_end>
           // Outdoor thin-vinyl reflection approximation. The horizon band is
           // evaluated with the perturbed normal, so low-amplitude wrinkles
           // bend reflection rather than merely tinting the transparent sheet.
           vec3 rigVinylWorldNormal = inverseTransformDirection(normal, viewMatrix);
           vec3 rigVinylToCamera = normalize(cameraPosition - vRigWorldPosition);
           vec3 rigVinylReflect = reflect(-rigVinylToCamera, rigVinylWorldNormal);
           float rigVinylHorizon = exp(-pow((rigVinylReflect.y - 0.03) / 0.115, 2.0));
           float rigVinylSky = smoothstep(-0.12, 0.44, rigVinylReflect.y);
           vec3 rigVinylEnvironment = mix(
             vec3(0.028, 0.150, 0.200),
             vec3(0.560, 0.680, 0.790),
             rigVinylSky
           );
           rigVinylEnvironment += vec3(0.320, 0.370, 0.390) * rigVinylHorizon;
           float rigVinylFacing = clamp(abs(dot(rigVinylWorldNormal, rigVinylToCamera)), 0.0, 1.0);
           float rigVinylFresnel = 0.040 + 0.960 * pow(1.0 - rigVinylFacing, 5.0);
           reflectedLight.indirectSpecular += rigVinylEnvironment *
             (0.055 + rigVinylFresnel * 0.220);`,
        );
      shaders.push({ kind, type: "vinyl", shader, uniforms });
      state.shaderCompiles++;
    };
  }

  function createVinylOverlay(mesh, kind) {
    const material = mesh.material.clone();
    installVinylShader(material, kind);
    const VinylMesh = mesh.constructor;
    const overlay = new VinylMesh(mesh.geometry, material);
    overlay.name = `laser2-${kind}-vinyl-window-v17`;
    overlay.frustumCulled = false;
    overlay.castShadow = false;
    overlay.receiveShadow = true;
    overlay.renderOrder = (mesh.renderOrder || 0) + 2;
    overlay.matrixAutoUpdate = mesh.matrixAutoUpdate;
    overlay.position.copy(mesh.position);
    overlay.quaternion.copy(mesh.quaternion);
    overlay.scale.copy(mesh.scale);
    mesh.parent.add(overlay);
    vinylMeshes.push(overlay);
    return overlay;
  }

  function installSail(kind, system, count, hasWindow) {
    const mesh = findSailMesh(system, count);
    if (!mesh) throw new Error(`${kind} sail render mesh was not found`);
    mesh.name = `laser2-${kind}-cloth-v17`;
    const originalMaterial = mesh.material;
    const originalVisible = mesh.visible;
    const originalCastShadow = mesh.castShadow;
    const originalReceiveShadow = mesh.receiveShadow;
    const cloth = originalMaterial.clone();
    installClothShader(cloth, kind);
    mesh.material = cloth;
    // Keep castShadow disabled until a custom alpha-clipped depth material is
    // installed; otherwise the clear windows cast an opaque rectangular shadow.
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    let vinyl = null;
    if (hasWindow) vinyl = createVinylOverlay(mesh, kind);
    sailEntries.push({
      kind,
      system,
      mesh,
      cloth,
      vinyl,
      originalMaterial,
      originalVisible,
      originalCastShadow,
      originalReceiveShadow,
    });
  }

  try {
    installSail("main", master.sails.main, master.config.main.rows * master.config.main.cols, true);
    installSail("jib", master.sails.jib, master.config.jib.rows * master.config.jib.cols, true);
    installSail("spin", master.sails.spin, master.config.spin.rows * master.config.spin.cols, false);
    state.clothMeshes = sailEntries.length;
    state.vinylMeshes = vinylMeshes.length;
  } catch (error) {
    state.finite = false;
    state.lastError = error instanceof Error ? error.message : String(error);
    console.error(VERSION, error);
    return;
  }

  function updateSun() {
    let directional = null;
    master.scene.traverse((object) => {
      if (!directional && object.isDirectionalLight) directional = object;
    });
    if (directional) {
      const target = directional.target?.position || tmp.set(0, 0, 0);
      sunDirection.copy(directional.position).sub(target).normalize();
      sunColor
        .set(directional.color.r, directional.color.g, directional.color.b)
        .multiplyScalar(directional.intensity || 1);
    }
  }

  function updateUniforms(dt) {
    timeS += Math.max(0, Math.min(0.1, dt || 0));
    updateSun();
    const wetness = rigV16.state.wetness01 || 0;
    for (const entry of shaders) {
      const u = entry.uniforms;
      if (u.uRigTime) u.uRigTime.value = timeS;
      if (u.uRigWetness) u.uRigWetness.value = wetness;
      if (u.uClothTransmission) u.uClothTransmission.value = params.clothDiffuseTransmission;
      if (u.uWeaveContrast) u.uWeaveContrast.value = params.weaveContrast;
      if (u.uWetDarkening) u.uWetDarkening.value = params.wetDarkening;
      if (u.uWetGloss) u.uWetGloss.value = params.wetGloss;
      if (u.uRigShadowStrength) u.uRigShadowStrength.value = params.transmittedRigShadow;
      if (u.uRigShadowBlur) u.uRigShadowBlur.value = params.transmittedShadowBlurM;
      if (u.uSunlightScale) u.uSunlightScale.value = params.sunlightScale;
      if (u.uRigSunDir) u.uRigSunDir.value.copy(sunDirection);
      if (u.uRigSunColor) u.uRigSunColor.value.copy(sunColor);
      if (u.uVinylHaze) u.uVinylHaze.value = params.vinylHaze;
      if (u.uVinylScratch) u.uVinylScratch.value = params.vinylScratch;
      if (u.uVinylWaviness) u.uVinylWaviness.value = params.vinylWaviness;
      if (u.uVinylCrease) u.uVinylCrease.value = params.vinylCrease;
      if (u.uRigMast) {
        for (let i = 0; i < master.rig.mast.length; i++) u.uRigMast.value[i].copy(master.rig.mast[i].x);
      }
      if (u.uRigBoom) {
        for (let i = 0; i < master.rig.boom.length; i++) u.uRigBoom.value[i].copy(master.rig.boom[i].x);
      }
      state.uniformsUpdated++;
    }

    for (const entry of sailEntries) {
      entry.cloth.roughness = params.clothRoughness;
      entry.cloth.sheen = params.clothSheen;
      entry.cloth.sheenRoughness = params.clothSheenRoughness;
      if (entry.vinyl) {
        entry.vinyl.material.roughness = params.vinylRoughness;
        entry.vinyl.material.transmission = params.vinylTransmission;
        entry.vinyl.material.thickness = params.vinylThicknessM;
        entry.vinyl.material.ior = params.vinylIor;
      }
      if (entry.kind === "spin") {
        entry.mesh.visible = params.enabled && !!rigV16.helpers?.isSpinnakerPhysical?.();
      } else {
        entry.mesh.visible = params.enabled;
      }
      if (entry.vinyl) entry.vinyl.visible = params.enabled && entry.mesh.visible;
    }
  }

  function metrics() {
    return {
      version: VERSION,
      enabled: params.enabled,
      finite: state.finite,
      lastError: state.lastError,
      clothMeshes: state.clothMeshes,
      vinylMeshes: state.vinylMeshes,
      shaderCompiles: state.shaderCompiles,
      uniformUpdates: state.uniformsUpdated,
      materials: {
        cloth: {
          model: "opaque alpha-clipped two-sided PBR sheet plus sun-driven diffuse transport",
          opacity: 1,
          backgroundObjectVisibility: 0,
          diffuseTransmission: params.clothDiffuseTransmission,
          roughness: params.clothRoughness,
          sheen: params.clothSheen,
          lightInjection: state.clothLightInjection,
          analyticRigShadow: true,
          castShadowModel: "disabled until a matching alpha-clipped custom depth pass is supplied",
        },
        windows: {
          main: "registered to source texture sewn rectangle",
          jib: "registered to rows 1/3 and columns 1..4 of the cloth grid",
          edgeAntialias: "derivative-width only; no broad UV smoothstep",
        },
        vinyl: {
          model: "separate alpha-clipped co-moving MeshPhysicalMaterial transmission pass",
          windows: ["main", "jib"],
          thicknessM: params.vinylThicknessM,
          ior: params.vinylIor,
          transmission: params.vinylTransmission,
          opacity: 1,
          roughness: params.vinylRoughness,
          haze: params.vinylHaze,
          waviness: params.vinylWaviness,
          crease: params.vinylCrease,
        },
      },
      wetness01: rigV16.state.wetness01 || 0,
      truthBoundary: {
        verified: "cloth blocks background geometry outside seam-registered windows; back-side brightness and soft mast/boom shadows transfer as diffuse sheet illumination",
        inferred: "cloth optical density, weave albedo, vinyl micro-normal amplitude and exact jib-window production pattern require target-sail photo/HDR calibration",
        reduced: "single-scattering approximation with analytic spar occlusion; no resolved subsurface random walk, spectral transport or full scene-space transmitted shadow map",
      },
      sourceModified: true,
    };
  }

  function addUI() {
    const panel = document.querySelector(".laser2-lab");
    if (!panel || document.getElementById("laser2-v17-optics-panel")) return;
    const section = document.createElement("section");
    section.id = "laser2-v17-optics-panel";
    section.innerHTML = `
      <h3>V17 · OPAQUE SHEET / FLEXIBLE VINYL</h3>
      <table><tbody>
        <tr><td>cloth visibility</td><td>0% scene detail · light only</td></tr>
        <tr><td>cloth transport</td><td id="v17-cloth-state">—</td></tr>
        <tr><td>vinyl windows</td><td id="v17-vinyl-state">—</td></tr>
        <tr><td>registration</td><td>main texture seam · jib grid seam</td></tr>
      </tbody></table>
      <label>cloth light transfer <input id="v17-cloth-trans" type="range" min="0" max="0.45" step="0.01" value="${params.clothDiffuseTransmission}"> <span id="v17-cloth-trans-v">${Math.round(params.clothDiffuseTransmission * 100)}%</span></label>
      <label>shadow transfer <input id="v17-shadow" type="range" min="0" max="0.7" step="0.01" value="${params.transmittedRigShadow}"> <span id="v17-shadow-v">${Math.round(params.transmittedRigShadow * 100)}%</span></label>
      <label>vinyl clarity <input id="v17-vinyl-clear" type="range" min="0.55" max="0.98" step="0.01" value="${params.vinylTransmission}"> <span id="v17-vinyl-clear-v">${Math.round(params.vinylTransmission * 100)}%</span></label>
      <label>vinyl waviness <input id="v17-vinyl-wave" type="range" min="0" max="1.5" step="0.01" value="${params.vinylWaviness}"> <span id="v17-vinyl-wave-v">${params.vinylWaviness.toFixed(2)}</span></label>
      <label>vinyl haze <input id="v17-vinyl-haze" type="range" min="0" max="0.35" step="0.01" value="${params.vinylHaze}"> <span id="v17-vinyl-haze-v">${Math.round(params.vinylHaze * 100)}%</span></label>
      <div class="truth">THE CLOTH NO LONGER REVEALS BACKGROUND OBJECT DETAIL. IT REMAINS A DEPTH-WRITING MATTE SHEET; ONLY SUNLIGHT ENERGY AND SOFT SPAR SHADOWS CROSS IT. CLEAR VINYL IS CUT TO THE REGISTERED SEAM GEOMETRY AND USES PHYSICAL TRANSMISSION, FRESNEL REFLECTION, BROAD FLEXIBLE-SHEET WAVINESS AND LOW-AMPLITUDE CREASE ROUGHNESS.</div>`;
    panel.appendChild(section);

    const bindPercent = (inputId, valueId, key, materialKey = null) => {
      const input = section.querySelector(`#${inputId}`);
      const value = section.querySelector(`#${valueId}`);
      input.oninput = () => {
        params[key] = +input.value;
        value.textContent = `${Math.round(params[key] * 100)}%`;
        if (materialKey) for (const mesh of vinylMeshes) mesh.material[materialKey] = params[key];
      };
    };
    bindPercent("v17-cloth-trans", "v17-cloth-trans-v", "clothDiffuseTransmission");
    bindPercent("v17-shadow", "v17-shadow-v", "transmittedRigShadow");
    bindPercent("v17-vinyl-clear", "v17-vinyl-clear-v", "vinylTransmission", "transmission");
    bindPercent("v17-vinyl-haze", "v17-vinyl-haze-v", "vinylHaze");
    const wave = section.querySelector("#v17-vinyl-wave");
    const waveValue = section.querySelector("#v17-vinyl-wave-v");
    wave.oninput = () => {
      params.vinylWaviness = +wave.value;
      waveValue.textContent = params.vinylWaviness.toFixed(2);
    };
  }

  function refreshUI() {
    addUI();
    const m = metrics();
    const cloth = document.getElementById("v17-cloth-state");
    const vinyl = document.getElementById("v17-vinyl-state");
    if (cloth) cloth.textContent = `${Math.round(m.materials.cloth.diffuseTransmission * 100)}% · ${m.materials.cloth.lightInjection}`;
    if (vinyl) vinyl.textContent = `${m.vinylMeshes} · IOR ${m.materials.vinyl.ior.toFixed(2)} · ${(m.materials.vinyl.thicknessM * 1000).toFixed(3)} mm`;
  }

  function restore() {
    const hooks = window.LASER2_FRAME_HOOKS || [];
    const index = hooks.indexOf(frame);
    if (index >= 0) hooks.splice(index, 1);
    for (const entry of sailEntries) {
      entry.mesh.material = entry.originalMaterial;
      entry.mesh.visible = entry.originalVisible;
      entry.mesh.castShadow = entry.originalCastShadow;
      entry.mesh.receiveShadow = entry.originalReceiveShadow;
      if (entry.vinyl?.parent) entry.vinyl.parent.remove(entry.vinyl);
    }
    if (window.__labMetrics === opticsLabMetricsWrapper) window.__labMetrics = previousMetrics;
    state.initialized = false;
    params.enabled = false;
  }

  const previousMetrics = window.__labMetrics;
  function opticsLabMetricsWrapper() {
    const base = typeof previousMetrics === "function" ? previousMetrics() : {};
    return { ...base, sailOpticsV17: metrics(), sailOpticsV16: metrics() };
  }
  window.__labMetrics = opticsLabMetricsWrapper;

  const receipt = Object.freeze({
    baselineSha256: "d0f400350797661775d478bf74f35b7ec9c94fe12d64ccdf8f60b38a3444f4e9",
    cloth: "alpha-blended semi-transparent sail replaced by opaque alpha-clipped matte sheet",
    transport: "back-side illumination is diffuse sheet energy transfer; no background color/detail sampling",
    shadows: "deformed mast and boom capsules softly attenuate transmitted illumination",
    mainWindow: "registered to the baked 512x1024 seam rectangle pixel bounds",
    jibWindow: "registered to exact rows/columns of the 6x11 cloth grid with a procedural sewn border",
    vinyl: "physical transmission and Fresnel response with broad low-amplitude normal waviness and crease roughness",
    calibration: "optical coefficients remain proposed until measured from the target sails",
  });

  const api = {
    VERSION,
    params,
    state,
    metrics,
    setParam(name, value) {
      if (!(name in params)) return false;
      if (typeof params[name] === "boolean") {
        params[name] = !!value;
        return true;
      }
      if (!Number.isFinite(Number(value))) return false;
      params[name] = Number(value);
      return true;
    },
    restore,
    sails: sailEntries,
    vinylMeshes,
    receipt,
  };

  window.LASER2_SAIL_OPTICS_V17 = api;
  window.LASER2_SAIL_OPTICS_V16 = api;

  document.head.appendChild(
    Object.assign(document.createElement("style"), {
      textContent: "#laser2-v17-optics-panel{border-top:1px solid rgba(138,202,255,.72)}",
    }),
  );

  let lastUi = 0;
  function frame(dt) {
    state.frame++;
    updateUniforms(dt);
    const now = performance.now();
    if (now - lastUi > 240) {
      lastUi = now;
      refreshUI();
    }
  }
  window.LASER2_FRAME_HOOKS.push(frame);
  state.initialized = true;
  console.info(`${VERSION} initialized`, metrics(), receipt);
})();
